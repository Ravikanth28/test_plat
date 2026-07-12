import express from "express";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import { protect, authorize } from "../middleware/auth.js";
import { notifyAdmins } from "../utils/notify.js";

const router = express.Router();

// Escape user input before using it in a $regex so metacharacters can't change
// the query semantics or cause catastrophic backtracking (ReDoS). Cap length too.
const safeRegex = (input) => {
  const s = String(input).slice(0, 80);
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Fields a shopkeeper may set when creating/updating a shop. Everything else
// (isApproved, rating, numReviews, owner) stays server-controlled.
const SHOP_WRITABLE = ["name", "category", "description", "address", "phone", "image", "isOpen"];

// Keep only whitelisted keys; normalise geo into {lat,lng} of finite numbers.
const pickShopFields = (body = {}) => {
  const out = {};
  for (const k of SHOP_WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  const g = body.geo;
  if (g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lng))) {
    out.geo = { lat: Number(g.lat), lng: Number(g.lng) };
  }
  return out;
};

// GET /api/shops  -> public list (approved & open by default)
router.get("/", async (req, res, next) => {
  try {
    const { category, q, all } = req.query;
    const filter = {};
    if (!all) filter.isApproved = true;
    if (category && category !== "all") filter.category = category;
    if (q) filter.name = { $regex: safeRegex(q), $options: "i" };
    const shops = await Shop.find(filter).sort({ createdAt: -1 });
    res.json(shops);
  } catch (err) {
    next(err);
  }
});

// GET /api/shops/mine -> shopkeeper's own shop
router.get("/mine", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    res.json(shop);
  } catch (err) {
    next(err);
  }
});

// GET /api/shops/:id  -> single shop with products
router.get("/:id", async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id).populate("owner", "name email phone");
    if (!shop) {
      res.status(404);
      throw new Error("Shop not found");
    }
    const products = await Product.find({ shop: shop._id });
    res.json({ shop, products });
  } catch (err) {
    next(err);
  }
});

// POST /api/shops -> shopkeeper creates their shop
router.post("/", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const existing = await Shop.findOne({ owner: req.user._id });
    if (existing) {
      res.status(400);
      throw new Error("You already have a shop");
    }
    const shop = await Shop.create({ ...pickShopFields(req.body), owner: req.user._id });
    await User.findByIdAndUpdate(req.user._id, { shop: shop._id });

    // Notify all admins that a new shop needs approval.
    notifyAdmins({
      type: "shop_new",
      title: "New shop awaiting approval",
      body: `${shop.name} (${shop.category}) was submitted by ${req.user.name}.`,
      link: "/admin",
    });

    res.status(201).json(shop);
  } catch (err) {
    next(err);
  }
});

// PUT /api/shops/:id -> owner or admin updates
router.put("/:id", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      res.status(404);
      throw new Error("Shop not found");
    }
    if (req.user.role !== "admin" && shop.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not your shop");
    }
    // Whitelist the writable fields. Only admin may change approval status.
    const updates = pickShopFields(req.body);
    if (req.user.role === "admin" && req.body.isApproved !== undefined) {
      updates.isApproved = !!req.body.isApproved;
    }
    Object.assign(shop, updates);
    await shop.save();
    res.json(shop);
  } catch (err) {
    next(err);
  }
});

// GET /api/shops/:id/reviews -> list reviews for a shop
router.get("/:id/reviews", async (req, res, next) => {
  try {
    const reviews = await Review.find({ shop: req.params.id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

// POST /api/shops/:id/reviews -> customer adds/updates their review (verified purchase)
router.post("/:id/reviews", protect, authorize("customer", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      res.status(404);
      throw new Error("Shop not found");
    }
    const rating = Number(req.body.rating);
    if (!rating || rating < 1 || rating > 5) {
      res.status(400);
      throw new Error("Rating must be between 1 and 5");
    }

    // Verified purchase: customer must have ordered from this shop
    if (req.user.role !== "admin") {
      const order = await Order.findOne({ customer: req.user._id, shop: shop._id });
      if (!order) {
        res.status(403);
        throw new Error("You can only review shops you've ordered from");
      }
    }

    // Upsert the customer's review
    await Review.findOneAndUpdate(
      { shop: shop._id, customer: req.user._id },
      {
        shop: shop._id,
        customer: req.user._id,
        name: req.user.name,
        rating,
        comment: (req.body.comment || "").trim(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Recompute shop rating + count
    const all = await Review.find({ shop: shop._id });
    const numReviews = all.length;
    const avg = numReviews
      ? all.reduce((s, r) => s + r.rating, 0) / numReviews
      : shop.rating;
    shop.rating = Math.round(avg * 10) / 10;
    shop.numReviews = numReviews;
    await shop.save();

    const reviews = await Review.find({ shop: shop._id }).sort({ createdAt: -1 });
    res.status(201).json({ rating: shop.rating, numReviews: shop.numReviews, reviews });
  } catch (err) {
    next(err);
  }
});

export default router;
