import express from "express";
import User from "../models/User.js";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// All admin routes require admin role
router.use(protect, authorize("admin"));

// GET /api/admin/stats  -> dashboard summary
router.get("/stats", async (req, res, next) => {
  try {
    const [users, shops, products, orders, pendingShops] = await Promise.all([
      User.countDocuments(),
      Shop.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Shop.countDocuments({ isApproved: false }),
    ]);
    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    res.json({
      users,
      shops,
      products,
      orders,
      pendingShops,
      revenue: revenueAgg[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["customer", "shopkeeper", "admin"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      res.status(400);
      throw new Error("You cannot delete yourself");
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/shops  -> all shops (including unapproved)
router.get("/shops", async (req, res, next) => {
  try {
    const shops = await Shop.find().populate("owner", "name email").sort({ createdAt: -1 });
    res.json(shops);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/shops/:id/approve
router.put("/shops/:id/approve", async (req, res, next) => {
  try {
    const { isApproved } = req.body;
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { isApproved: Boolean(isApproved) },
      { new: true }
    );
    res.json(shop);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/shops/:id
router.delete("/shops/:id", async (req, res, next) => {
  try {
    await Product.deleteMany({ shop: req.params.id });
    await Shop.findByIdAndDelete(req.params.id);
    res.json({ message: "Shop and its products deleted" });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders  -> all orders
router.get("/orders", async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("shop", "name")
      .populate("customer", "name")
      .sort({ createdAt: -1 })
      .limit(300);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

export default router;
