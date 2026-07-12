import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // department, medical, stationery, juice, food, grocery, other
    category: {
      type: String,
      required: true,
      enum: ["department", "medical", "stationery", "juice", "food", "grocery", "other"],
      default: "other",
    },
    description: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    image: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Optional shop location so customers can sort by "nearest" and we can show
    // a delivery ETA. Set by the shopkeeper from their dashboard.
    geo: {
      lat: Number,
      lng: Number,
    },
    isOpen: { type: Boolean, default: true },
    // Waive the delivery fee for this shop's orders when true, and let customers
    // filter for it on the home page.
    freeDelivery: { type: Boolean, default: false },
    // Shop-level "pure veg" marker, surfaced as a home-page filter.
    isPureVeg: { type: Boolean, default: false },
    // Admin approval so admin can "control all"
    isApproved: { type: Boolean, default: false },
    rating: { type: Number, default: 4.2 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Shop", shopSchema);
