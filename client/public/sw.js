// LocalMart service worker — enables installability (PWA) and basic offline.
// Strategy: network-first for navigation & API, cache-first for static assets.
const CACHE = "localmart-v7";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const stale = keys.filter((k) => k !== CACHE);
      await Promise.all(stale.map((k) => caches.delete(k)));
      await self.clients.claim();
      // Self-heal: if we just replaced an OLD cache, this is an update after a
      // deploy. Any open tab may be running a stale shell that points at a build
      // chunk this deploy no longer serves (blank page). Force those tabs to
      // reload so they pick up the fresh index.html + current assets — no manual
      // cache-clearing needed. First-ever install has no old cache, so we skip.
      if (stale.length > 0) {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          if ("navigate" in client) client.navigate(client.url).catch(() => {});
        }
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API calls — always go to network, fall back to nothing.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ message: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    return;
  }

  // App navigation: network-first. On success, refresh the cached shell so the
  // offline fallback is always the LATEST index.html (which references the
  // current build hashes) — never an ancient shell pointing at chunks the
  // server has since replaced. Only fall back to cache when the network fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put("/index.html", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets: cache-first, then network. Only cache SUCCESSFUL responses
  // (res.ok) so a transient 5xx/404 during a deploy is never stored and then
  // replayed cache-first forever — the bug that caused the blank page.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
    )
  );
});

// --- Web Push -------------------------------------------------------------
// Background notifications: shown even when the app/tab is closed. The server
// sends a JSON payload { title, body, link, type }.

// Per-type quick actions shown as buttons on the OS notification.
function actionsFor(type) {
  if (type && type.startsWith("order")) {
    return [{ action: "view", title: "View order" }];
  }
  if (type === "shop_new") {
    return [{ action: "view", title: "Review" }];
  }
  return [];
}

// Time-sensitive types get a stickier alert: the banner stays on screen until
// the user acts on it and the device vibrates with a stronger pattern. (The OS
// still plays its own notification sound — a service worker cannot speak a
// custom voice while the app is closed.)
function isImportant(type) {
  return (
    type === "order_new" ||
    type === "order_placed" ||
    type === "order_status" ||
    type === "order_cancelled" ||
    type === "payment"
  );
}

// Is any app window currently focused/visible? If so we skip the OS
// notification and let the in-app toast (SSE) handle it — no duplicate alert.
async function anyClientVisible() {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  return clients.some((c) => c.visibilityState === "visible" || c.focused);
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "LocalMart", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "LocalMart";
  const type = data.type || "generic";
  const important = isImportant(type);
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { link: data.link || "/", type },
    tag: type, // collapse same-type notifications into one
    renotify: true,
    requireInteraction: important, // stay until dismissed for key alerts
    vibrate: important ? [200, 100, 200, 100, 200] : [100],
    actions: actionsFor(type),
  };
  event.waitUntil(
    anyClientVisible().then((visible) => {
      // Foreground tab open: suppress the OS toast to avoid a double alert.
      if (visible) return;
      return self.registration.showNotification(title, options);
    })
  );
});

// Focus an existing tab (or open a new one) at the notification's link.
// Both a body-tap and the "view" action button deep-link to the same place.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(link).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
