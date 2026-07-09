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

export const rupee = (n) => "₹" + Number(n || 0).toFixed(2);

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
