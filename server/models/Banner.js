import mongoose from "mongoose";

// Promotional/advertisement banners shown in the home hero carousel.
// Managed by admin. `image` may be an emoji (rendered on a gradient tile) or
// an http(s) URL (rendered as an <img>), matching the shop/product convention.
const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    image: { type: String, default: "" },
    // Where the banner links to when clicked (relative app path or URL).
    link: { type: String, default: "/" },
    // Optional CTA label shown on the banner.
    cta: { type: String, default: "Shop now" },
    // Lower `order` shows first; ties fall back to creation time.
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Banner", bannerSchema);
