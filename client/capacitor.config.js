/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.localmart.app",
  appName: "LocalMart",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // Load the LIVE deployed site inside the app. Every future UI and backend
    // update reflects automatically in installed apps — no rebuild/reinstall
    // needed for content changes. Override at build time with CAP_SERVER_URL.
    url: process.env.CAP_SERVER_URL || "https://localmart-7foy.onrender.com",
    cleartext: false,
  },
};

export default config;
