import express from "express";
import Banner from "../models/Banner.js";

const router = express.Router();

// GET /api/banners  -> active banners for the home hero carousel (public)
router.get("/", async (req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({
      order: 1,
      createdAt: 1,
    });
    res.json(banners);
  } catch (err) {
    next(err);
  }
});

export default router;
