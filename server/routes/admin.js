import express from "express";
import User from "../models/User.js";
import Shop from "../models/Shop.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Banner from "../models/Banner.js";
import { protect, authorize } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";

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
    const approved = Boolean(isApproved);
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { isApproved: approved },
      { new: true }
    );

    // Let the shop owner know the approval decision.
    if (shop?.owner) {
      notify(shop.owner, {
        type: "shop_approved",
        title: approved ? "Shop approved" : "Shop unapproved",
        body: approved
          ? `${shop.name} is now live and visible to customers.`
          : `${shop.name} has been set to unapproved.`,
        link: "/shop",
      });
    }

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

// ---------------- BANNERS (home hero carousel ads) ----------------

// GET /api/admin/banners  -> all banners (active + inactive)
router.get("/banners", async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
    res.json(banners);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/banners  -> create a banner
router.post("/banners", async (req, res, next) => {
  try {
    const { title, subtitle, image, link, cta, order, isActive } = req.body;
    if (!title || !title.trim()) {
      res.status(400);
      throw new Error("Banner title is required");
    }
    const banner = await Banner.create({
      title: title.trim(),
      subtitle: subtitle || "",
      image: image || "",
      link: link || "/",
      cta: cta || "Shop now",
      order: Number(order) || 0,
      isActive: isActive === undefined ? true : Boolean(isActive),
    });
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/banners/:id  -> update a banner
router.put("/banners/:id", async (req, res, next) => {
  try {
    const { title, subtitle, image, link, cta, order, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (subtitle !== undefined) update.subtitle = subtitle;
    if (image !== undefined) update.image = image;
    if (link !== undefined) update.link = link;
    if (cta !== undefined) update.cta = cta;
    if (order !== undefined) update.order = Number(order) || 0;
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const banner = await Banner.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!banner) {
      res.status(404);
      throw new Error("Banner not found");
    }
    res.json(banner);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/banners/:id
router.delete("/banners/:id", async (req, res, next) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: "Banner deleted" });
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
