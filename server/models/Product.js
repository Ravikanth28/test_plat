import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "piece" }, // piece, kg, litre, pack
    image: { type: String, default: "" },
    category: { type: String, default: "general" },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    inStock: { type: Boolean, default: true },
    stock: { type: Number, default: 100 },
    // Food veg/non-veg marker for menu filtering (green/red dot). Defaults to
    // veg; non-food categories can ignore it.
    isVeg: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", category: "text" });

export default mongoose.model("Product", productSchema);
