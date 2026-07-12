import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext.jsx";

// Small relative-time formatter ("2m", "3h", "5d").
function timeAgo(date) {
  const d = new Date(date);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

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

export default function NotificationBell() {
  const { items, unread, soundOn, toggleSound, markRead, markAllRead, enablePush } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n) => {
    if (!n.read) markRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="notif" ref={ref}>
      <button
        className="notif-btn"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          // Opening the panel is a good moment to (silently) offer push.
          if (next) enablePush();
        }}
      >
        🔔
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-head">
            <strong>Notifications</strong>
            <div className="notif-head-actions">
              <button
                className="notif-sound"
                onClick={toggleSound}
                aria-pressed={soundOn}
                title={soundOn ? "Sound on — tap to mute" : "Sound off — tap to unmute"}
                aria-label={soundOn ? "Mute notification sound" : "Unmute notification sound"}
              >
                {soundOn ? "🔔" : "🔕"}
              </button>
              {unread > 0 && (
                <button className="notif-mark" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">You're all caught up 🎉</div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  className={`notif-item ${n.read ? "" : "unread"}`}
                  onClick={() => openItem(n)}
                >
                  <span className="notif-ic">{ICON[n.type] || ICON.generic}</span>
                  <span className="notif-body">
                    <span className="notif-title">{n.title}</span>
                    {n.body && <span className="notif-text">{n.body}</span>}
                  </span>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>

          <button
            className="notif-foot"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            See all & settings
          </button>
        </div>
      )}
    </div>
  );
}
