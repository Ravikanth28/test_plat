export const CATEGORIES = [
  { key: "all", label: "All", icon: "🏬" },
  { key: "department", label: "Department", icon: "🛒" },
  { key: "medical", label: "Medical", icon: "💊" },
  { key: "stationery", label: "Stationery", icon: "✏️" },
  { key: "juice", label: "Juice", icon: "🧃" },
  { key: "food", label: "Food", icon: "🍽️" },
  { key: "grocery", label: "Grocery", icon: "🥦" },
  { key: "other", label: "Other", icon: "🏪" },
];

export const catIcon = (key) =>
  CATEGORIES.find((c) => c.key === key)?.icon || "🏪";

export const catLabel = (key) =>
  CATEGORIES.find((c) => c.key === key)?.label || key;

export const rupee = (n) => "₹" + Number(n || 0).toFixed(2);

// Is the stored image a real URL (vs an emoji thumbnail)?
export const isImageUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);

// Pick a gradient for a shop/category tile so tiles look varied & premium.
const GRADIENTS = [
  "linear-gradient(135deg,#ffe0e3,#ffd0a6)",
  "linear-gradient(135deg,#e0f2fe,#c7f0d8)",
  "linear-gradient(135deg,#f3e8ff,#fde2f3)",
  "linear-gradient(135deg,#fff4d6,#ffe0b3)",
  "linear-gradient(135deg,#d1fae5,#bfeaff)",
  "linear-gradient(135deg,#fde2e4,#e2ece9)",
];
export const tileGradient = (key = "") => {
  let h = 0;
  for (let i = 0; i < String(key).length; i++) h = (h * 31 + String(key).charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
};

// Deterministic delivery time per shop id (feels real, stays stable).
export const deliveryTime = (id = "") => {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 17 + String(id).charCodeAt(i)) >>> 0;
  return 12 + (h % 24); // 12–35 mins
};

// Great-circle distance (km) between two {lat,lng} points using the Haversine
// formula. Returns null if either point is missing coordinates.
export const distanceKm = (a, b) => {
  if (
    !a || !b ||
    !Number.isFinite(Number(a.lat)) || !Number.isFinite(Number(a.lng)) ||
    !Number.isFinite(Number(b.lat)) || !Number.isFinite(Number(b.lng))
  ) {
    return null;
  }
  const R = 6371; // Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLng = toRad(Number(b.lng) - Number(a.lng));
  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Human-friendly distance label, e.g. "450 m" or "3.2 km".
export const formatDistance = (km) => {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

// Rough delivery ETA (minutes) from a distance in km: assumes a ~20 km/h
// average for local two-wheeler delivery plus a fixed prep/handoff buffer.
export const etaMinutes = (km) => {
  if (km == null || !Number.isFinite(km)) return null;
  const AVG_KMH = 20;
  const PREP_BUFFER = 8;
  return Math.max(5, Math.round((km / AVG_KMH) * 60) + PREP_BUFFER);
};

export const STATUS_STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

export const statusLabel = (s) =>
  ({
    placed: "Order Placed",
    accepted: "Accepted",
    preparing: "Preparing",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  }[s] || s);

export const statusBadgeClass = (s) =>
  ({
    placed: "badge-blue",
    accepted: "badge-blue",
    preparing: "badge-amber",
    out_for_delivery: "badge-amber",
    delivered: "badge-green",
    cancelled: "badge-red",
  }[s] || "badge-gray");
