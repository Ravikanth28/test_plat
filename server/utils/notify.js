// High-level notification helper. Saves an in-app Notification (for the bell +
// history) and, in parallel, fires a Web Push so the message also arrives when
// the app is closed. All of this is best-effort: a failure here must never
// break the request that triggered it (placing an order, etc.).
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendPushToUser } from "./push.js";

// Notify a single user.
//   notify(userId, { type, title, body, link })
export async function notify(userId, { type = "generic", title, body = "", link = "" }) {
  if (!userId || !title) return null;
  try {
    const doc = await Notification.create({ user: userId, type, title, body, link });
    // Push in the background; don't await failures into the caller.
    sendPushToUser(userId, { title, body, link, type }).catch(() => {});
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
