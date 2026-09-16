const CACHE_NAME = "nomarc-v5";
// Only cache truly static assets — NOT SSR HTML pages.
// Caching SSR pages causes ChunkLoadErrors after redeployment
// when stale HTML references old JS chunk hashes that no longer exist.
const STATIC_ASSETS = ["/offline.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip Next.js internals, API routes, server actions — always go to network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("_next/data") ||
    url.pathname.includes("_next/image") ||
    url.searchParams.has("_rsc")
  ) return;

  // Static immutable assets (_next/static/): cache-first, safe because hash changes on redeploy
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation: only show offline fallback when TRULY offline.
  // Previously this caught ALL fetch failures (including Vercel cold-start
  // timeouts, 502s, DNS hiccups) and showed the offline page — even when the
  // user had connectivity. Now we check navigator.onLine before intercepting.
  if (e.request.headers.get("accept")?.includes("text/html")) {
    if (!self.navigator.onLine) {
      e.respondWith(
        fetch(e.request).catch(() => caches.match("/offline.html").then((r) => r ?? new Response("Offline", { status: 503 })))
      );
    }
    // When online: don't call respondWith — browser handles navigation
    // natively, including retries and proper error pages.
    return;
  }

  // Other assets (images, fonts, icons): network-first, 503 on total failure
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) =>
          cached ?? new Response("", { status: 503, statusText: "Service Unavailable" })
        )
      )
  );
});

// Offline message queue
const DB_NAME = "nomarc-offline";
const STORE = "pending-messages";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function flushQueue() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const all = await new Promise((resolve) => {
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
  });
  if (!all.length) return;

  for (const msg of all) {
    try {
      await fetch("/api/messages/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(msg) });
      const delTx = db.transaction(STORE, "readwrite");
      delTx.objectStore(STORE).delete(msg.id);
    } catch { break; }
  }
}

self.addEventListener("sync", (e) => {
  if (e.tag === "send-messages") e.waitUntil(flushQueue());
});

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(data.title || "Nomarc Projects", {
    body: data.body || "You have a new notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "nomarc-notification",
    data: { url: data.url || "/dashboard/notifications" },
    vibrate: [100, 50, 100],
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/dashboard";
  e.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) { if (c.url.includes(url) && "focus" in c) return c.focus(); }
    return clients.openWindow(url);
  }));
});
