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
