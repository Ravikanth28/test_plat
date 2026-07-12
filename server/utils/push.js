// Web Push (VAPID) helper. Sends background notifications to browsers/devices
// even when the PWA is closed. Everything here degrades gracefully: if the
// VAPID keys are not configured, push is simply skipped and the in-app
// notification (saved in Mongo) still works.
import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let enabled = false;

export function initPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      "[push] VAPID keys not set — background push disabled (in-app notifications still work)."
    );
    return;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:support@localmart.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  enabled = true;
  console.log("[push] Web Push enabled.");
}

export const isPushEnabled = () => enabled;
export const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";

// Fire a push message to every subscription belonging to a user. Dead
// subscriptions (410/404) are pruned automatically.
export async function sendPushToUser(userId, payload) {
  if (!enabled) return;
  let subs;
  try {
    subs = await PushSubscription.find({ user: userId });
  } catch {
    return;
  }
  if (!subs.length) return;

  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          data
        );
      } catch (err) {
        // 404/410 mean the subscription is gone — remove it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    })
  );
}
