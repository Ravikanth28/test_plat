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
    isOpen: { type: Boolean, default: true },
    // Admin approval so admin can "control all"
    isApproved: { type: Boolean, default: false },
    rating: { type: Number, default: 4.2 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Shop", shopSchema);
