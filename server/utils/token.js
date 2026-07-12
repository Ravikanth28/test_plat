import jwt from "jsonwebtoken";

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  address: user.address,
  addresses: (user.addresses || []).map((a) => ({
    _id: a._id,
    label: a.label || "",
    line: a.line,
    geo: a.geo && Number.isFinite(a.geo.lat) ? { lat: a.geo.lat, lng: a.geo.lng } : undefined,
  })),
  shop: user.shop,
  favorites: (user.favorites || []).map((f) => (f && f._id ? f._id.toString() : f.toString())),
});
