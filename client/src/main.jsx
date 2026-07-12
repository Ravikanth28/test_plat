import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register the service worker so the app is installable (PWA) and works offline.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Auto-refresh caches every 30s so users always get the latest build.
        // Clearing the runtime caches is transient — the SW re-populates them
        // on the next fetch, so this just guarantees freshness, not a full purge.
        const AUTO_CLEAR_MS = 30 * 1000;
        setInterval(() => {
          if ("caches" in window) {
            caches
              .keys()
              .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
              .catch(() => {
                /* ignore cache errors */
              });
          }
          // Also ask the browser to check for a newer service worker version.
          reg.update().catch(() => {
            /* ignore update errors */
          });
        }, AUTO_CLEAR_MS);
      })
      .catch(() => {
        /* SW registration is best-effort; ignore failures. */
      });
  });
}
