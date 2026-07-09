import express from "express";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

const ensureOwnerOfShop = async (user, shopId) => {
  const shop = await Shop.findById(shopId);
  if (!shop) return { ok: false, code: 404, msg: "Shop not found" };
  if (user.role !== "admin" && shop.owner.toString() !== user._id.toString()) {
    return { ok: false, code: 403, msg: "Not your shop" };
  }
  return { ok: true, shop };
};

// GET /api/products?search=&shop=&category=  -> global search across all shops
router.get("/", async (req, res, next) => {
  try {
    const { search, shop, category } = req.query;
    const filter = {};
    if (shop) filter.shop = shop;
    if (category && category !== "all") filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    const products = await Product.find(filter)
      .populate("shop", "name category isApproved")
      .limit(200);
    // Only show products from approved shops in public search
    const visible = products.filter((p) => p.shop && p.shop.isApproved);
    res.json(visible);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/mine -> shopkeeper's products
router.get("/mine", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.json([]);
    const products = await Product.find({ shop: shop._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post("/", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      res.status(400);
      throw new Error("Create your shop first");
    }
    const product = await Product.create({ ...req.body, shop: shop._id });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put("/:id", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    const check = await ensureOwnerOfShop(req.user, product.shop);
    if (!check.ok) {
      res.status(check.code);
      throw new Error(check.msg);
    }
    Object.assign(product, req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete("/:id", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    const check = await ensureOwnerOfShop(req.user, product.shop);
    if (!check.ok) {
      res.status(check.code);
      throw new Error(check.msg);
    }
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } catch (err) {
    next(err);
  }
});

export default router;
