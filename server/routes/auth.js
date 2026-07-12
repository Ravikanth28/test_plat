import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { signToken, sanitizeUser } from "../utils/token.js";
import { notify, notifyAdmins } from "../utils/notify.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, role, address } = req.body;
    // Require strings. Object values (e.g. { $gt: "" }) would otherwise slip past
    // the truthy check and throw a 500 at email.toLowerCase() / query time.
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
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
    // Welcome the new user, and alert admins when a shopkeeper joins.
    notify(user._id, {
      type: "signup",
      title: "Welcome to LocalMart",
      body:
        safeRole === "shopkeeper"
          ? "Your account is ready. Create your shop to start selling."
          : "Your account is ready. Start shopping from local stores!",
      link: safeRole === "shopkeeper" ? "/shop" : "/",
    });
    if (safeRole === "shopkeeper") {
      notifyAdmins({
        type: "signup",
        title: "New shopkeeper signed up",
        body: `${name} registered as a shopkeeper.`,
        link: "/admin",
      });
    }

    res.status(201).json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Reject non-string credentials (e.g. NoSQL-injection payloads like
    // { $gt: "" }) with a clean 400 instead of throwing a 500 at toLowerCase().
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400);
      throw new Error("Invalid email or password");
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
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
