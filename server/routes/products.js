import express from "express";
import Product from "../models/Product.js";
import Shop from "../models/Shop.js";
import { protect, authorize } from "../middleware/auth.js";
import { queueTranslations } from "../utils/translate.js";

const router = express.Router();

// Escape user input before using it in a $regex (prevents ReDoS / query injection).
const safeRegex = (input) => {
  const s = String(input).slice(0, 80);
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Fields a shopkeeper may set on a product. `shop` is server-controlled.
const PRODUCT_WRITABLE = ["name", "description", "price", "unit", "image", "category", "inStock", "stock", "isVeg"];
const pickProductFields = (body = {}) => {
  const out = {};
  for (const k of PRODUCT_WRITABLE) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
};

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
      const rx = safeRegex(search);
      filter.$or = [
        { name: { $regex: rx, $options: "i" } },
        { description: { $regex: rx, $options: "i" } },
        { category: { $regex: rx, $options: "i" } },
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
    const product = await Product.create({ ...pickProductFields(req.body), shop: shop._id });
    queueTranslations([product.name, product.description]);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products/bulk  -> create many products at once (CSV import)
// Accepts { products: [{ name, price, ... }] }. Rows missing a name or a valid
// price are skipped and reported back so the shopkeeper can fix them.
router.post("/bulk", protect, authorize("shopkeeper", "admin"), async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      res.status(400);
      throw new Error("Create your shop first");
    }
    const rows = Array.isArray(req.body?.products) ? req.body.products : [];
    if (rows.length === 0) {
      res.status(400);
      throw new Error("No product rows provided");
    }
    if (rows.length > 500) {
      res.status(400);
      throw new Error("Too many rows — import up to 500 at a time");
    }

    const docs = [];
    const errors = [];
    rows.forEach((row, i) => {
      const fields = pickProductFields(row);
      const name = String(fields.name || "").trim();
      const price = Number(fields.price);
      if (!name) {
        errors.push({ row: i + 1, reason: "Missing name" });
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        errors.push({ row: i + 1, reason: "Invalid price" });
        return;
      }
      docs.push({ ...fields, name, price, shop: shop._id });
    });

    let created = [];
    if (docs.length) created = await Product.insertMany(docs);
    queueTranslations(created.flatMap((p) => [p.name, p.description]));
    res.status(201).json({ created: created.length, skipped: errors.length, errors, products: created });
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
    Object.assign(product, pickProductFields(req.body));
    await product.save();
    queueTranslations([product.name, product.description]);
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
