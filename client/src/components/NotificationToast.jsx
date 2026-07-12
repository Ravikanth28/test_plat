import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext.jsx";

const ICON = {
  order_new: "🛍️",
  order_placed: "✅",
  order_status: "🚚",
  order_cancelled: "❌",
  payment: "💳",
  shop_new: "🏪",
  shop_approved: "🎉",
  signup: "👋",
  generic: "🔔",
};

// Foreground toast for notifications that arrive while the app is open. When
// the app is closed, the service worker's `push` handler shows a native one.
export default function NotificationToast() {
  const { toast, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!toast) return null;

  const go = () => {
    dismissToast();
    if (toast.link) navigate(toast.link);
  };

  return (
    <div className="notif-toast" role="status">
      <span className="notif-toast__icon" aria-hidden="true">
        {ICON[toast.type] || ICON.generic}
      </span>
      <button className="notif-toast__text" onClick={go}>
        <strong className="notif-toast__title">{toast.title}</strong>
        {toast.body && <span className="notif-toast__sub">{toast.body}</span>}
      </button>
      <button
        className="notif-toast__close"
        aria-label="Dismiss"
        onClick={dismissToast}
      >
        ✕
      </button>
    </div>
  );
}
