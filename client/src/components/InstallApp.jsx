import { useEffect, useState } from "react";

// Shows an "Install App" button when the browser fires beforeinstallprompt.
// Falls back to instructions on iOS (which has no programmatic prompt).
export default function InstallApp({ className = "btn btn-sm", variant = "button" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !window.MSStream;

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already running as an installed app — nothing to show.
  if (isStandalone || installed) return null;

  // No native prompt available (e.g. iOS Safari) — offer manual instructions.
  if (!deferred) {
    if (!isIOS) return null; // most desktop/other browsers: hide until eligible
    return (
      <>
        <button className={className} onClick={() => setShowHelp(true)}>
          📲 Install App
        </button>
        {showHelp && (
          <div className="modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Install LocalMart</h3>
              <p className="muted small">
                Tap the <strong>Share</strong> icon in Safari, then choose{" "}
                <strong>“Add to Home Screen”</strong>.
              </p>
              <button className="btn btn-sm" onClick={() => setShowHelp(false)}>
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  const install = async () => {
    deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  };

  return (
    <button className={className} onClick={install}>
      📲 Install App
    </button>
  );
}
