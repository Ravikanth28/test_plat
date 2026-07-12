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

// SSE is the primary real-time channel; polling stays on as a slow backstop
// that reconciles counts and catches anything missed while disconnected.
const POLL_MS = 60 * 1000;
const TOKEN_KEY = "lm_token"; // JWT in localStorage (matches api.js)

// Per-device sound settings (localStorage). Cross-device prefs (mute/quiet
// hours/per-type) live on the server in User.notifPrefs and are fetched below.
const SOUND_KEY = "lm_notif_sound"; // "off" disables the in-app chime
const TONE_KEY = "lm_notif_tone"; // which tone preset to play
const VOL_KEY = "lm_notif_volume"; // "0".."1"
const VOICE_KEY = "lm_notif_voice"; // "on" reads new alerts aloud (opt-in)

// Tone presets: each is a list of { f: frequency Hz, t: start offset seconds }.
export const TONES = {
  chime: { label: "Chime", notes: [{ f: 880, t: 0 }, { f: 1174.7, t: 0.12 }] },
  ding: { label: "Ding", notes: [{ f: 1046.5, t: 0 }] },
  triad: {
    label: "Triad",
    notes: [{ f: 659.3, t: 0 }, { f: 830.6, t: 0.08 }, { f: 987.8, t: 0.16 }],
  },
  low: { label: "Soft", notes: [{ f: 523.3, t: 0 }, { f: 659.3, t: 0.12 }] },
};
const DEFAULT_TONE = "chime";
const DEFAULT_VOLUME = 0.6;

// Play a tone preset via the Web Audio API (no asset, works offline). Browsers
// block audio until the user has interacted with the page, so the shared
// context is unlocked on the first gesture (see the provider effect).
let audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}
function playSound(toneKey = DEFAULT_TONE, volume = DEFAULT_VOLUME) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const preset = TONES[toneKey] || TONES[DEFAULT_TONE];
    const peak = Math.max(0.0001, Math.min(1, volume)) * 0.4;
    const now = ctx.currentTime;
    for (const { f, t } of preset.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const start = now + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    }
  } catch {
    /* audio not available — ignore */
  }
}

// Speak a short phrase aloud via the Web Speech API. FOREGROUND ONLY: browsers
// block speech synthesis when no page is focused, so this never fires for a
// closed app (background push shows an OS notification instead). Best-effort —
// silently no-ops where speechSynthesis is unavailable.
function speak(text, volume = DEFAULT_VOLUME) {
  try {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth || !text) return;
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = "en-IN";
    u.rate = 1;
    u.pitch = 1;
    u.volume = Math.max(0, Math.min(1, volume));
    synth.cancel(); // clear any stuck/queued utterance first
    synth.speak(u);
  } catch {
    /* speech not available — ignore */
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

// Client mirror of the server's interrupt gate: should this type surface a
// toast + chime right now, given the user's saved preferences?
function allowInterrupt(prefs, type) {
  if (!prefs) return true;
  if (prefs.muteAll) return false;
  if (Array.isArray(prefs.mutedTypes) && prefs.mutedTypes.includes(type)) return false;
  const q = prefs.quietHours;
  if (q?.enabled) {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const { start, end } = q;
    const inQuiet = start > end ? mins >= start || mins < end : mins >= start && mins < end;
    if (inQuiet) return false;
  }
  return true;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState(null); // latest new notification, shown briefly

  // Sound settings (per-device).
  const [soundOn, setSoundOn] = useState(
    () => typeof localStorage === "undefined" || localStorage.getItem(SOUND_KEY) !== "off"
  );
  const [tone, setToneState] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem(TONE_KEY)) || DEFAULT_TONE
  );
  const [volume, setVolumeState] = useState(() => {
    if (typeof localStorage === "undefined") return DEFAULT_VOLUME;
    const v = Number(localStorage.getItem(VOL_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : DEFAULT_VOLUME;
  });
  const [voiceOn, setVoiceOn] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(VOICE_KEY) === "on"
  );

  // Server-synced preferences (mute / per-type / quiet hours).
  const [prefs, setPrefs] = useState(null);

  const lastSeenId = useRef(null); // newest id we've already surfaced
  const toastTimer = useRef(null);
  const esRef = useRef(null); // active EventSource

  // Latest values read inside long-lived closures (SSE / poll).
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const toneRef = useRef(tone);
  toneRef.current = tone;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Surface a single incoming notification (from SSE or poll): dedupe into the
  // list, bump unread, and toast + chime if the user's prefs allow it.
  const surface = useCallback((n) => {
    if (!n || !n._id) return;
    setItems((prev) => {
      if (prev.some((x) => x._id === n._id)) return prev;
      return [n, ...prev];
    });
    if (!n.read) setUnread((u) => u + 1);

    if (lastSeenId.current === null) {
      lastSeenId.current = n._id;
      return;
    }
    if (n._id === lastSeenId.current) return;
    lastSeenId.current = n._id;

    if (!n.read && allowInterrupt(prefsRef.current, n.type)) {
      setToast(n);
      if (soundOnRef.current) playSound(toneRef.current, volumeRef.current);
      if (voiceOnRef.current) speak(n.title, volumeRef.current);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 6000);
    }
  }, []);

  // Fetch the notification list (also used as the SSE backstop).
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get("/notifications?limit=30");
      const list = data.items || [];
      setItems(list);
      setUnread(data.unread || 0);
      setHasMore(!!data.hasMore);
      const newest = list[0];
      if (newest && lastSeenId.current === null) lastSeenId.current = newest._id;
    } catch {
      /* ignore transient poll errors */
    }
  }, [user]);

  // Load an older page for the history view's infinite scroll.
  const loadMore = useCallback(async () => {
    if (!user || items.length === 0) return;
    const oldest = items[items.length - 1];
    try {
      const data = await api.get(
        `/notifications?limit=30&before=${encodeURIComponent(oldest.createdAt)}`
      );
      const more = data.items || [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x._id));
        return [...prev, ...more.filter((x) => !seen.has(x._id))];
      });
      setHasMore(!!data.hasMore);
    } catch {
      /* ignore */
    }
  }, [user, items]);

  // Open a Server-Sent Events stream for real-time delivery; keep a slow poll
  // as a backstop. Reset everything on logout.
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      setHasMore(false);
      setPrefs(null);
      lastSeenId.current = null;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    refresh();

    // SSE (EventSource can't send headers, so the JWT rides in the query).
    let es = null;
    try {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
      es.addEventListener("notification", (e) => {
        try {
          surface(JSON.parse(e.data));
        } catch {
          /* ignore malformed frame */
        }
      });
      esRef.current = es;
    } catch {
      /* EventSource unsupported — poll still covers us */
    }

    const id = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      if (es) es.close();
      esRef.current = null;
    };
  }, [user, refresh, surface]);

  // Fetch server-synced preferences on login.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .get("/notifications/prefs")
      .then((d) => !cancelled && setPrefs(d.prefs || {}))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Reflect the unread count in the tab title and the PWA app-icon badge.
  useEffect(() => {
    if (typeof document !== "undefined") {
      const base = document.title.replace(/^\(\d+\)\s*/, "");
      document.title = unread > 0 ? `(${unread}) ${base}` : base;
    }
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      if (unread > 0) navigator.setAppBadge(unread).catch(() => {});
      else navigator.clearAppBadge?.().catch(() => {});
    }
  }, [unread]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
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

  // --- Sound controls (per-device) -----------------------------------------
  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (next) playSound(toneRef.current, volumeRef.current);
      return next;
    });
  }, []);

  const setTone = useCallback((key) => {
    if (!TONES[key]) return;
    setToneState(key);
    try {
      localStorage.setItem(TONE_KEY, key);
    } catch {
      /* ignore */
    }
    playSound(key, volumeRef.current); // preview
  }, []);

  const setVolume = useCallback((v) => {
    const vol = Math.max(0, Math.min(1, Number(v)));
    setVolumeState(vol);
    try {
      localStorage.setItem(VOL_KEY, String(vol));
    } catch {
      /* ignore */
    }
  }, []);

  const previewSound = useCallback(() => {
    playSound(toneRef.current, volumeRef.current);
  }, []);

  // Spoken alerts (per-device, foreground only). Toggling on speaks a short
  // confirmation — which also satisfies the browser's user-gesture requirement
  // so later automatic utterances are allowed.
  const toggleVoice = useCallback(() => {
    setVoiceOn((on) => {
      const next = !on;
      try {
        localStorage.setItem(VOICE_KEY, next ? "on" : "off");
      } catch {
        /* ignore */
      }
      if (next) speak("Voice alerts on", volumeRef.current);
      else if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  // --- Server-synced preferences --------------------------------------------
  const updatePrefs = useCallback(async (patch) => {
    setPrefs((prev) => ({ ...(prev || {}), ...patch })); // optimistic
    try {
      const d = await api.put("/notifications/prefs", patch);
      setPrefs(d.prefs || {});
    } catch {
      /* best effort — keep optimistic value */
    }
  }, []);

  // Unlock/resume the AudioContext on the first user gesture.
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

  // Auto-subscribe to push once logged in if permission was already granted.
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
        hasMore,
        toast,
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
        refresh,
        loadMore,
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
