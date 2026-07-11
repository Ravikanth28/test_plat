import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A unique stamp for each build. The app remembers the value it loaded with
// (__BUILD_TIME__) and polls /version.json; when the deployed stamp differs, it
// knows a new version is live and prompts the user to refresh.
const BUILD_TIME = new Date().toISOString();

// Emits dist/version.json at build time so the running app can detect deploys.
function emitVersion() {
  return {
    name: "emit-version",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ builtAt: BUILD_TIME }),
      });
    },
  };
}

// In dev, proxy /api to the Express server on :5000
export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [react(), emitVersion()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
