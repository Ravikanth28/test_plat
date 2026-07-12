import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["customer", "shopkeeper", "admin"],
      default: "customer",
    },
    address: { type: String, default: "" },
    // For shopkeepers: the shop they own (set after shop creation)
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null },
    // Customer's saved/favourite shops
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
    // Cross-device notification preferences. These gate Web Push (server-side)
    // and the in-app toast (client mirrors them). Per-device sound settings live
    // in the browser (localStorage), not here.
    notifPrefs: {
      // Master switch: when true, no push/toast for anything.
      muteAll: { type: Boolean, default: false },
      // Notification `type` values the user has switched off.
      mutedTypes: { type: [String], default: [] },
      // "Do not disturb" window. start/end are minutes-from-midnight local time
      // (e.g. 22:00 = 1320). When start > end the window wraps past midnight.
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: Number, default: 1320 }, // 22:00
        end: { type: Number, default: 420 }, //  07:00
      },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);
