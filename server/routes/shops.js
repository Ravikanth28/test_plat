import express from "express";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// GET /api/shops  -> public list (approved & open by default)
router.get("/", async (req, res, next) => {
  try {
    const { category, q, all } = req.query;
    const filter = {};
    if (!all) filter.isApproved = true;
    if (category && category !== "all") filter.category = category;
    if (q) filter.name = { $regex: q, $options: "i" };
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
    const shop = await Shop.create({ ...req.body, owner: req.user._id });
    await User.findByIdAndUpdate(req.user._id, { shop: shop._id });
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
    // Only admin may change approval status
    const updates = { ...req.body };
    if (req.user.role !== "admin") delete updates.isApproved;
    Object.assign(shop, updates);
    await shop.save();
    res.json(shop);
  } catch (err) {
    next(err);
  }
});

export default router;
