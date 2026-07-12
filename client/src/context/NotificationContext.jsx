import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { api } from "../api.js";
import { useAuth } from "./AuthContext.jsx";

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

const POLL_MS = 20 * 1000;
const SOUND_KEY = "lm_notif_sound"; // "off" disables the in-app chime

// Play a short two-note chime via the Web Audio API (no asset, works offline).
// Browsers block audio until the user has interacted with the page, so the
// shared context is unlocked on the first gesture (see the provider effect).
let audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}
function playChime() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const notes = [
      { f: 880, t: 0 }, // A5
      { f: 1174.7, t: 0.12 }, // D6
    ];
    for (const { f, t } of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = now + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    }
  } catch {
    /* audio not available — ignore */
  }
}

// Convert a base64 VAPID key into the Uint8Array the Push API expects.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null); // latest new notification, shown briefly
  const [soundOn, setSoundOn] = useState(
    () => typeof localStorage === "undefined" || localStorage.getItem(SOUND_KEY) !== "off"
  );
  const lastSeenId = useRef(null); // newest id we've already surfaced
  const toastTimer = useRef(null);
  const soundOnRef = useRef(soundOn); // read latest value inside the poll closure
  soundOnRef.current = soundOn;

  // Fetch the notification list; surface a foreground toast for anything new.
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get("/notifications?limit=30");
      const list = data.items || [];
      setItems(list);
      setUnread(data.unread || 0);

      const newest = list[0];
      if (newest) {
        // On the very first load just remember the newest id (no toast spam).
        if (lastSeenId.current === null) {
          lastSeenId.current = newest._id;
        } else if (newest._id !== lastSeenId.current && !newest.read) {
          lastSeenId.current = newest._id;
          setToast(newest);
          if (soundOnRef.current) playChime();
          clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 6000);
        }
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, [user]);

  // Poll while logged in; reset when logged out.
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      lastSeenId.current = null;
      return;
    }
    refresh();
    const id = setInterval(refresh, POLL_MS);
    // Also refresh when the tab regains focus for snappier updates.
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refresh]);

  const markRead = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      /* best effort */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.put("/notifications/read-all");
    } catch {
      /* best effort */
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  // Toggle the in-app chime; persist the choice and play a sample when turning on.
  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (next) playChime();
      return next;
    });
  }, []);

  // Unlock/resume the AudioContext on the first user gesture so the chime can
  // play later (browsers suspend audio until the user interacts with the page).
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Ask for OS permission and register a Web Push subscription. Best-effort:
  // returns false if unsupported / denied / not configured.
  const enablePush = useCallback(async () => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;

      const { key } = await api.get("/notifications/vapid-public-key");
      if (!key) return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }
      const json = sub.toJSON();
      await api.post("/notifications/subscribe", {
        endpoint: json.endpoint,
        keys: json.keys,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Auto-subscribe to push once logged in if permission was already granted
  // (silent — never prompts on its own).
  useEffect(() => {
    if (!user) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") enablePush();
  }, [user, enablePush]);

  return (
    <NotificationContext.Provider
      value={{
        items,
        unread,
        toast,
        soundOn,
        toggleSound,
        refresh,
        markRead,
        markAllRead,
        dismissToast,
        enablePush,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
