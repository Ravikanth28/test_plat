import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext.jsx";

// Relative-time formatter ("2m", "3h", "5d").
function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
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

export default function NotificationsPage() {
  const { items, unread, hasMore, loadMore, markRead, markAllRead } =
    useNotifications();
  const navigate = useNavigate();
  const sentinel = useRef(null);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const openItem = (n) => {
    if (!n.read) markRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="container mt notif-page">
      <div className="notif-page-head">
        <h1>Notifications</h1>
        <div className="notif-page-actions">
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <Link to="/settings" className="btn btn-ghost btn-sm">
            ⚙️ Settings
          </Link>
        </div>
      </div>

      {/* History */}
      <section className="notif-history">
        {items.length === 0 ? (
          <div className="notif-empty">You're all caught up 🎉</div>
        ) : (
          <div className="notif-hist-list">
            {items.map((n) => (
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
            ))}
          </div>
        )}
        {hasMore && (
          <div ref={sentinel} className="notif-more">
            <button className="btn btn-ghost btn-sm" onClick={loadMore}>
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
