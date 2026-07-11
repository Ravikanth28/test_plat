// Public URL of the built Android APK (a GitHub release asset). When set, a
// "Download App" button appears in the UI. Leave blank to hide the button.
// Set VITE_APK_URL in the deploy environment (e.g. Render) to something like:
//   https://github.com/Ravikanth28/test_plat/releases/download/apk-latest/localmart.apk
export const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_URL ?? "";
