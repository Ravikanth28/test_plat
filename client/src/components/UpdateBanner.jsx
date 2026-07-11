import { useEffect, useState } from "react";

// Build stamp baked in at compile time (see vite.config.js). Compared against
// the deployed /version.json to detect that a newer version has gone live.
const CURRENT = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "";

// Floating "new update available" toast. Polls /version.json every minute (and
// whenever the app regains focus); when the deployed build differs from the one
// currently loaded, it offers a one-tap refresh to pull the latest version.
export default function UpdateBanner() {
  const [stale, setStale] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!CURRENT) return;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.builtAt && data.builtAt !== CURRENT) setStale(true);
      } catch {
        /* offline or not deployed yet — ignore */
      }
    };

    check();
    const timer = setInterval(check, 60000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!stale || dismissed) return null;

  return (
    <div className="update-toast" role="status">
      <span className="update-toast__icon" aria-hidden="true">
        🎉
      </span>
      <div className="update-toast__text">
        <strong className="update-toast__title">Update available</strong>
        <span className="update-toast__sub">
          A new version of LocalMart is ready.
        </span>
      </div>
      <button
        className="btn btn-sm update-toast__refresh"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
      <button
        className="update-toast__close"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
}
