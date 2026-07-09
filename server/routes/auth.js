import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { signToken, sanitizeUser } from "../utils/token.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, role, address } = req.body;
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      res.status(400);
      throw new Error("Email already registered");
    }
    // Only allow customer or shopkeeper via public signup; admin is seeded.
    const safeRole = role === "shopkeeper" ? "shopkeeper" : "customer";
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      role: safeRole,
    });
    res.status(201).json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }
    res.json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// PUT /api/auth/me  -> update profile (address/phone/name)
router.put("/me", protect, async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;
    if (name !== undefined) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (address !== undefined) req.user.address = address;
    await req.user.save();
    res.json({ user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
});

export default router;
