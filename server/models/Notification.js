import mongoose from "mongoose";

// A single in-app notification addressed to one user. The same real-world
// event (e.g. "order accepted") may produce several Notification docs — one
// per recipient — so each row belongs to exactly one user.
export const NOTIFICATION_TYPES = [
  "order_placed", // customer: their order was created
  "order_new", // shopkeeper: a new order arrived at their shop
  "order_status", // customer: order moved to accepted/preparing/out/delivered
  "order_cancelled", // customer + shopkeeper: order was cancelled
  "payment", // customer + shopkeeper: online payment succeeded/failed
  "shop_new", // admin: a shop registered and needs approval
  "shop_approved", // shopkeeper: their shop was approved (or unapproved)
  "signup", // admin: a new shopkeeper signed up
  "generic",
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "generic" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    // In-app deep link (client route), e.g. "/orders/123" or "/admin".
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Common query: this user's notifications, newest first.
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
