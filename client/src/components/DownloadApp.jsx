import { APK_DOWNLOAD_URL } from "../config.js";
import { isNativeApp } from "../lib/platform.js";

// "Download App" link — points at the Android APK release asset. Shows only on
// the web (not inside the already-installed native app) and only when an APK
// URL is configured via VITE_APK_URL.
export default function DownloadApp({ className = "btn btn-sm" }) {
  if (isNativeApp() || !APK_DOWNLOAD_URL) return null;
  return (
    <a className={className} href={APK_DOWNLOAD_URL} download>
      🤖 Download App
    </a>
  );
}
