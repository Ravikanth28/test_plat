import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, TONES } from "../context/NotificationContext.jsx";

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

// Human labels for the per-type mute toggles.
const TYPE_LABELS = {
  order_new: "New orders",
  order_placed: "Order placed",
  order_status: "Order status",
  order_cancelled: "Order cancelled",
  payment: "Payments",
  shop_new: "New shops",
  shop_approved: "Shop approved",
  signup: "Welcome",
  generic: "General",
};

const minutesToHHMM = (m) => {
  const h = Math.floor((m || 0) / 60);
  const mm = (m || 0) % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const hhmmToMinutes = (s) => {
  const [h, m] = String(s).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export default function NotificationsPage() {
  const {
    items,
    unread,
    hasMore,
    loadMore,
    markRead,
    markAllRead,
    soundOn,
    toggleSound,
    tone,
    setTone,
    volume,
    setVolume,
    previewSound,
    voiceOn,
    toggleVoice,
    prefs,
    updatePrefs,
    enablePush,
  } = useNotifications();
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

  const p = prefs || {};
  const mutedTypes = p.mutedTypes || [];
  const quiet = p.quietHours || { enabled: false, start: 1320, end: 420 };

  const toggleType = (type) => {
    const next = mutedTypes.includes(type)
      ? mutedTypes.filter((t) => t !== type)
      : [...mutedTypes, type];
    updatePrefs({ mutedTypes: next });
  };

  return (
    <div className="container mt notif-page">
      <div className="notif-page-head">
        <h1>Notifications</h1>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {/* Preferences */}
      <section className="card notif-settings">
        <h2>Alerts</h2>
        <label className="notif-row">
          <span>
            <strong>Mute everything</strong>
            <span className="muted small">Pause all push and pop-up alerts</span>
          </span>
          <input
            type="checkbox"
            checked={!!p.muteAll}
            onChange={(e) => updatePrefs({ muteAll: e.target.checked })}
          />
        </label>

        <div className="notif-row notif-col">
          <strong>Alert me about</strong>
          <div className="notif-types">
            {Object.keys(TYPE_LABELS).map((type) => (
              <label
                key={type}
                className={`notif-chip ${mutedTypes.includes(type) ? "off" : "on"}`}
              >
                <input
                  type="checkbox"
                  checked={!mutedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  disabled={!!p.muteAll}
                />
                <span>
                  {ICON[type]} {TYPE_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="notif-row">
          <span>
            <strong>Quiet hours</strong>
            <span className="muted small">Silence alerts during a nightly window</span>
          </span>
          <input
            type="checkbox"
            checked={!!quiet.enabled}
            onChange={(e) =>
              updatePrefs({ quietHours: { ...quiet, enabled: e.target.checked } })
            }
          />
        </label>
        {quiet.enabled && (
          <div className="notif-row notif-quiet">
            <label>
              From
              <input
                type="time"
                value={minutesToHHMM(quiet.start)}
                onChange={(e) =>
                  updatePrefs({
                    quietHours: { ...quiet, start: hhmmToMinutes(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              To
              <input
                type="time"
                value={minutesToHHMM(quiet.end)}
                onChange={(e) =>
                  updatePrefs({
                    quietHours: { ...quiet, end: hhmmToMinutes(e.target.value) },
                  })
                }
              />
            </label>
          </div>
        )}
      </section>

      {/* Sound (per device) */}
      <section className="card notif-settings">
        <h2>Sound (this device)</h2>
        <label className="notif-row">
          <span>
            <strong>Chime on new notification</strong>
          </span>
          <input type="checkbox" checked={soundOn} onChange={toggleSound} />
        </label>
        <div className="notif-row">
          <span><strong>Tone</strong></span>
          <div className="notif-tone-opts">
            {Object.keys(TONES).map((key) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${tone === key ? "" : "btn-ghost"}`}
                onClick={() => setTone(key)}
                disabled={!soundOn}
              >
                {TONES[key].label}
              </button>
            ))}
          </div>
        </div>
        <div className="notif-row">
          <span><strong>Volume</strong></span>
          <div className="notif-vol">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              disabled={!soundOn}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={previewSound}
              disabled={!soundOn}
            >
              ▶ Test
            </button>
          </div>
        </div>
        <label className="notif-row">
          <span>
            <strong>Speak alerts aloud</strong>
            <span className="muted small">
              Reads new alerts out loud (works while the app is open)
            </span>
          </span>
          <input type="checkbox" checked={voiceOn} onChange={toggleVoice} />
        </label>
        <div className="notif-row">
          <span>
            <strong>Background push</strong>
            <span className="muted small">Get alerts when the app is closed</span>
          </span>
          <button className="btn btn-sm" onClick={enablePush}>
            Enable push
          </button>
        </div>
      </section>

      {/* History */}
      <section className="notif-history">
        <h2>Recent</h2>
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
