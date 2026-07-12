// High-level notification helper. Saves an in-app Notification (for the bell +
// history), pushes it to any open browser tabs in real time over SSE, and, in
// parallel, fires a Web Push so the message also arrives when the app is
// closed. All of this is best-effort: a failure here must never break the
// request that triggered it (placing an order, etc.).
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushToUser } from "./push.js";
import { emitToUser } from "./events.js";

// Decide whether a given notification type is allowed to interrupt the user
// (Web Push / toast) based on their saved preferences. In-app notifications are
// ALWAYS saved regardless — prefs only silence the interruptive channels.
function isInterruptAllowed(prefs, type) {
  if (!prefs) return true;
  if (prefs.muteAll) return false;
  if (Array.isArray(prefs.mutedTypes) && prefs.mutedTypes.includes(type)) return false;
  const q = prefs.quietHours;
  if (q?.enabled) {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const { start, end } = q;
    // Window wraps past midnight when start > end (e.g. 22:00 -> 07:00).
    const inQuiet = start > end ? mins >= start || mins < end : mins >= start && mins < end;
    if (inQuiet) return false;
  }
  return true;
}

// Notify a single user.
//   notify(userId, { type, title, body, link })
export async function notify(userId, { type = "generic", title, body = "", link = "" }) {
  if (!userId || !title) return null;
  try {
    const doc = await Notification.create({ user: userId, type, title, body, link });

    // Real-time in-app delivery to any open tabs (instant; no polling wait).
    emitToUser(userId, "notification", doc);

    // Push (background) is gated by the user's saved preferences. Load them
    // lazily; a missing user or lookup failure defaults to "allowed".
    let prefs = null;
    try {
      const u = await User.findById(userId).select("notifPrefs");
      prefs = u?.notifPrefs || null;
    } catch {
      /* ignore — default to allowed */
    }
    if (isInterruptAllowed(prefs, type)) {
      sendPushToUser(userId, { title, body, link, type }).catch(() => {});
    }
    return doc;
  } catch (err) {
    console.error("[notify] failed:", err.message);
    return null;
  }
}

// Notify every user with a given role (used for admin broadcasts).
export async function notifyRole(role, payload) {
  try {
    const users = await User.find({ role }).select("_id");
    await Promise.all(users.map((u) => notify(u._id, payload)));
  } catch (err) {
    console.error("[notify] role broadcast failed:", err.message);
  }
}

export const notifyAdmins = (payload) => notifyRole("admin", payload);
