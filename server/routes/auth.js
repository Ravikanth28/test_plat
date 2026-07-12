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

// Build a clean address sub-document from the request body, ignoring any
// client-supplied fields we don't own (e.g. _id spoofing). Coordinates are
// only kept when both lat/lng are finite numbers.
function cleanAddress(body = {}) {
  const line = typeof body.line === "string" ? body.line.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 30) : "";
  const addr = { label, line };
  const lat = Number(body?.geo?.lat);
  const lng = Number(body?.geo?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) addr.geo = { lat, lng };
  return addr;
}

// POST /api/auth/me/addresses  -> add a saved delivery address
router.post("/me/addresses", protect, async (req, res, next) => {
  try {
    const addr = cleanAddress(req.body);
    if (!addr.line) {
      res.status(400);
      throw new Error("Address line is required");
    }
    // Cap the book so a user can't balloon their document indefinitely.
    if ((req.user.addresses || []).length >= 15) {
      res.status(400);
      throw new Error("You can save up to 15 addresses");
    }
    req.user.addresses.push(addr);
    await req.user.save();
    res.status(201).json({ user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/me/addresses/:addrId  -> edit a saved address
router.put("/me/addresses/:addrId", protect, async (req, res, next) => {
  try {
    const entry = req.user.addresses.id(req.params.addrId);
    if (!entry) {
      res.status(404);
      throw new Error("Address not found");
    }
    const addr = cleanAddress(req.body);
    if (!addr.line) {
      res.status(400);
      throw new Error("Address line is required");
    }
    entry.label = addr.label;
    entry.line = addr.line;
    entry.geo = addr.geo; // undefined clears the pin
    await req.user.save();
    res.json({ user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/me/addresses/:addrId  -> remove a saved address
router.delete("/me/addresses/:addrId", protect, async (req, res, next) => {
  try {
    const entry = req.user.addresses.id(req.params.addrId);
    if (!entry) {
      res.status(404);
      throw new Error("Address not found");
    }
    entry.deleteOne();
    await req.user.save();
    res.json({ user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
});

export default router;
