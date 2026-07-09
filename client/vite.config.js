import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy /api to the Express server on :5000
export default defineConfig({
  plugins: [react()],
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
