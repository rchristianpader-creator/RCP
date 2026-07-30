/* Aktien-Liste · Service Worker
   Strategy:
   - document/navigation: network first, cached copy only as offline fallback
   - own static assets (icons, manifest, pdf): cache first
   - everything else (TradingView, /.netlify/functions/*): straight to network, never cached
   Bump CACHE on every deploy so old shells are dropped. */

const CACHE = "aktien-liste-v30";

/* Ohne Sitzung liefert das Tor statt der Seite eine Weiterleitung zur
   Anmeldung — deshalb wird das Dokument hier nicht vorgeladen, sondern
   erst abgelegt, wenn eine echte Antwort durchkommt. */
const PRECACHE = [
  "/manifest.webmanifest",
  "/icon-180.png",
  "/icon-192.png",
  "/icon-512.png"
];

const STATIC = /\.(?:png|jpg|jpeg|svg|webp|ico|pdf|webmanifest)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function istApp(res) {
  if (!res || !res.ok || res.redirected) return false;
  if (res.headers.get("x-rcp-anmeldung")) return false;
  try {
    return new URL(res.url).pathname !== "/anmelden.html";
  } catch (e) {
    return true;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/.netlify/")) return;
  if (url.pathname === "/anmelden.html" || url.pathname === "/verwaltung.html") return;

  // Document: always try the network so prices and news are current.
  // Never store the login page as the app shell — without a session the gate
  // answers every navigation with a redirect to /anmelden.html.
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (istApp(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
  }
});

/* Push — inert until a subscription exists.
   Expected payload: { "title": "...", "body": "...", "url": "/#uuuu" } */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Aktien-Liste", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "aktien-liste",
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if ("navigate" in client) client.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
