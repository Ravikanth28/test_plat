import express from "express";
import Notification from "../models/Notification.js";
import PushSubscription from "../models/PushSubscription.js";
import { protect } from "../middleware/auth.js";
import { getVapidPublicKey } from "../utils/push.js";

const router = express.Router();

// GET /api/notifications/vapid-public-key  -> public key for the browser to
// build a push subscription. Public by design (safe to expose).
router.get("/vapid-public-key", (req, res) => {
  res.json({ key: getVapidPublicKey() });
});

// GET /api/notifications  -> current user's notifications (newest first)
router.get("/", protect, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ items, unread });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all  -> mark all as read
router.put("/read-all", protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read  -> mark one as read
router.put("/:id/read", protect, async (req, res, next) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/subscribe  -> save a Web Push subscription
router.post("/subscribe", protect, async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400);
      throw new Error("Invalid push subscription");
    }
    // Upsert by endpoint so re-subscribing on the same device reuses the row
    // and re-binds it to the current user.
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/unsubscribe  -> remove a Web Push subscription
router.post("/unsubscribe", protect, async (req, res, next) => {
  try {
    const { endpoint } = req.body || {};
    if (endpoint) await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
