import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: String,
    price: Number,
    qty: Number,
    unit: String,
  },
  { _id: false }
);

// Order lifecycle used for tracking
export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    items: [orderItemSchema],
    itemsTotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 20 },
    total: { type: Number, required: true },
    deliveryAddress: { type: String, required: true },
    phone: { type: String, default: "" },
    paymentMethod: { type: String, enum: ["cod", "online"], default: "cod" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    razorpay: {
      orderId: String,
      paymentId: String,
      signature: String,
    },
    status: { type: String, enum: ORDER_STATUSES, default: "placed" },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.pre("save", function (next) {
  if (!this.orderNo) {
    this.orderNo =
      "LM" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10);
  }
  if (this.isNew) {
    this.statusHistory = [{ status: this.status, at: new Date() }];
  }
  next();
});

export default mongoose.model("Order", orderSchema);
