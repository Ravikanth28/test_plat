import express from "express";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import PushSubscription from "../models/PushSubscription.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { getVapidPublicKey } from "../utils/push.js";
import { addClient, removeClient, pingAll } from "../utils/events.js";

const router = express.Router();

// GET /api/notifications/vapid-public-key  -> public key for the browser to
// build a push subscription. Public by design (safe to expose).
router.get("/vapid-public-key", (req, res) => {
  res.json({ key: getVapidPublicKey() });
});

// GET /api/notifications/stream  -> Server-Sent Events channel for real-time
// delivery. EventSource cannot set Authorization headers, so the JWT is passed
// as a query param (?token=...) and verified here directly.
router.get("/stream", async (req, res) => {
  const token = req.query.token;
  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return res.status(401).end();
  }

  // SSE handshake. Disable proxy buffering so frames flush immediately.
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 10000\n\n"); // tell the browser to reconnect after 10s
  res.write(": connected\n\n");

  addClient(userId, res);

  req.on("close", () => {
    removeClient(userId, res);
  });
});

// GET /api/notifications  -> current user's notifications (newest first).
// Supports cursor pagination via ?before=<ISO date> and ?limit=. Returns
// { items, unread, hasMore } so the client can drive infinite scroll.
router.get("/", protect, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const filter = { user: req.user._id };
    if (req.query.before) {
      const d = new Date(req.query.before);
      if (!isNaN(d.getTime())) filter.createdAt = { $lt: d };
    }
    const [rows, unread] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit + 1), // fetch one extra to detect more pages
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    res.json({ items, unread, hasMore });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/prefs  -> the current user's notification preferences.
router.get("/prefs", protect, async (req, res) => {
  res.json({ prefs: req.user.notifPrefs || {} });
});

// PUT /api/notifications/prefs  -> update preferences (partial update).
router.put("/prefs", protect, async (req, res, next) => {
  try {
    const { muteAll, mutedTypes, quietHours } = req.body || {};
    const prefs = req.user.notifPrefs || {};
    if (typeof muteAll === "boolean") prefs.muteAll = muteAll;
    if (Array.isArray(mutedTypes)) {
      prefs.mutedTypes = mutedTypes.filter((t) => typeof t === "string");
    }
    if (quietHours && typeof quietHours === "object") {
      prefs.quietHours = {
        enabled: !!quietHours.enabled,
        start: clampMinutes(quietHours.start, 1320),
        end: clampMinutes(quietHours.end, 420),
      };
    }
    req.user.notifPrefs = prefs;
    await req.user.save();
    res.json({ prefs: req.user.notifPrefs });
  } catch (err) {
    next(err);
  }
});

// Coerce a "minutes from midnight" value into 0..1439, falling back to a default.
function clampMinutes(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1439, Math.round(n)));
}

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

// Keep SSE connections alive through idle-timeout proxies (Render, etc.).
setInterval(pingAll, 25000).unref?.();

export default router;
