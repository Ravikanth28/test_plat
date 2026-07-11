import express from "express";
import User from "../models/User.js";
import Shop from "../models/Shop.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET /api/favorites -> customer's saved shops (populated)
router.get("/", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("favorites");
    res.json((user?.favorites || []).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites/:shopId -> toggle a shop in favorites
router.post("/:shopId", protect, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      res.status(404);
      throw new Error("Shop not found");
    }
    const user = await User.findById(req.user._id);
    const has = (user.favorites || []).some((f) => f.toString() === shopId);
    if (has) {
      user.favorites = user.favorites.filter((f) => f.toString() !== shopId);
    } else {
      user.favorites.push(shopId);
    }
    await user.save();
    res.json({
      favorited: !has,
      favorites: user.favorites.map((f) => f.toString()),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
