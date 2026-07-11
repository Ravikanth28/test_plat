import { APK_DOWNLOAD_URL } from "../config.js";
import { isNativeApp } from "../lib/platform.js";
import InstallApp from "./InstallApp.jsx";

// Promotional "Get the LocalMart App" banner for the Home page. Renders nothing
// when already inside the installed native app, or when no APK URL is set.
export default function GetAppBanner() {
  if (isNativeApp() || !APK_DOWNLOAD_URL) return null;
  return (
    <section className="app-banner">
      <div className="app-banner-copy">
        <span className="app-banner-eyebrow">📱 LocalMart App</span>
        <h2>Get faster shopping on the go</h2>
        <p className="muted">
          Install the Android app for a full-screen experience — quicker reorders,
          saved shops and one-tap checkout, right from your home screen.
        </p>
        <div className="app-banner-actions">
          <a className="btn" href={APK_DOWNLOAD_URL} download>
            🤖 Download for Android
          </a>
          <InstallApp className="btn btn-outline" />
        </div>
      </div>
      <div className="app-banner-art" aria-hidden="true">
        🛍️
      </div>
    </section>
  );
}
