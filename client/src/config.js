// Public URL of the built Android APK (a GitHub release asset). Override per
// environment with VITE_APK_URL; otherwise it falls back to the standard
// "apk-latest" release asset so the "Download App" button is always available.
const DEFAULT_APK_URL =
  "https://github.com/Ravikanth28/test_plat/releases/download/apk-latest/localmart.apk";
export const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_URL || DEFAULT_APK_URL;
