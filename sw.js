/* Aktien-Liste · Service Worker
   Strategy:
   - document/navigation: network first, cached copy only as offline fallback
   - own static assets (icons, manifest, pdf): cache first
   - everything else (TradingView, /.netlify/functions/*): straight to network, never cached
   Bump CACHE on every deploy so old shells are dropped. */

const CACHE = "aktien-liste-v166";

/* Ohne Sitzung liefert das Tor statt der Seite eine Weiterleitung zur
   Anmeldung — deshalb wird das Dokument hier nicht vorgeladen, sondern
   erst abgelegt, wenn eine echte Antwort durchkommt. */
/* kerzen.svg ist der laufende Hintergrund. Er steht schon auf dem
   Ladebildschirm, also soll er nicht erst geholt werden muessen, wenn es
   losgeht.

   Kein Kommentar zwischen den Zeilen: die Pruefreihe liest diese Liste als
   JSON aus der Datei, und daran waere sie eben zerbrochen. */
const PRECACHE = [
  "/stil.css?v=166",
  "/manifest.webmanifest",
  "/icon-180.png?v=166",
  "/icon-192.png?v=166",
  "/icon-512.png?v=166",
  "/kerzen.svg?v=166",
  "/kerzen-blass.svg?v=166"
];

/* css dazu: seit v137 liegt das Aussehen in stil.css. Sie traegt ?v=NN,
   ist also je Stand unveraenderlich — genau der Fall, fuer den
   "Zwischenspeicher zuerst" gedacht ist.

   js seit v143 fuer stern.js. Vorgeladen wird die Datei NICHT: sie wird nur
   gebraucht, wenn es ueberhaupt etwas vorzustellen gibt, und bei jedem
   neuen Stand vierzehn Kilobyte in den Speicher zu legen, die meistens
   niemand abruft, waere verkehrt herum. Beim ersten Mal kommt sie aus dem
   Netz und liegt danach da — und geholt wird sie neben dem Ladebildschirm
   her, also lange bevor sie gebraucht wird. Der eigene Service Worker geht
   hier nicht durch — sein Skript holt der Browser an ihm vorbei. */
const STATIC = /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|pdf|webmanifest)$/i;

self.addEventListener("install", (event) => {
  /* Jede Datei einzeln, und ein Fehlschlag zaehlt nicht.

     addAll() ist alles oder nichts: schlaegt eine einzige Anfrage fehl —
     ein Symbol, das gerade nicht ausgeliefert wird, eine Datei, die der
     Tuersteher abweist —, wird der Zwischenspeicher gar nicht erst
     angelegt, der neue Service Worker wird nie aktiv, und das Geraet
     bleibt beim alten Stand. Das ist genau die Art Fehler, die man nicht
     sieht: die App laeuft, nur eben von gestern.

     Vorhalten ist eine Bequemlichkeit, keine Bedingung. Was fehlt, wird
     spaeter aus dem Netz geholt. */
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
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
  /* Die EINE Ausnahme vom Functions-Verbot: die Logos. Sie aendern sich
     praktisch nie, die Liste holt sie bei jedem Besuch fuer ihre Karten,
     und der Kosmos-Auftakt braucht sie SOFORT — eine Marke soll dort
     nie auf ihr Bild warten. Zwischenspeicher zuerst, einmal je Stand
     (der Vorrat wird mit jedem CACHE-Wechsel geleert). */
  if (url.pathname === "/.netlify/functions/logo") {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }
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
      // Android zeigt das gross im Banner. iOS kennt es nicht und laesst es
      // weg — dort steht das Bild in der App, unter Meldungen.
      image: data.image || undefined,
      tag: data.tag || "aktien-liste",
      data: { url: data.url || "/" }
    }).then(() => {
      // Ist die App gerade offen, soll sie nicht erst beim naechsten Start
      // merken, dass etwas hereingekommen ist. Der Zaehler am
      // Verwaltungsknopf zieht damit sofort nach.
      return self.clients.matchAll({ type: "window", includeUncontrolled: true })
        .then((list) => {
          for (const client of list) {
            client.postMessage({ art: "push", tag: data.tag || "" });
          }
        })
        .catch(() => {});
    })
  );
});

/* Antippen fuehrt dorthin, wovon die Meldung handelt.

   Laeuft die App schon, wird sie nach vorn geholt — und dann bekommt sie den
   Weg als Nachricht. Frueher stand hier nur client.navigate(), und wo das
   fehlt oder nichts tut (Safari), kam man zwar in die App, aber nirgendwo
   an. Die Seite selbst weiss besser, was zu tun ist: eine Sprungmarke
   anfahren, ein Blatt oeffnen, die Meldungen zeigen.

   navigate() bleibt als zweiter Weg stehen, aber nur, wenn die Seite sich
   nicht meldet — sonst wuerde sie sich mitten im Aufmachen neu laden. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const offen = list.filter((c) => c.url.includes(self.location.origin));
      if (!offen.length) return self.clients.openWindow(target);

      const client = offen[0];
      if (client.focus) client.focus();

      // Ein anderes Blatt (die Verwaltung) kann den Weg nicht gehen
      const eigenes = new URL(client.url).pathname === "/" ||
        new URL(client.url).pathname === "/index.html";
      if (!eigenes) {
        if ("navigate" in client) return client.navigate(target);
        return self.clients.openWindow(target);
      }

      let angekommen = false;
      const kanal = new MessageChannel();
      kanal.port1.onmessage = () => { angekommen = true; };
      client.postMessage({ art: "hin", url: target }, [kanal.port2]);

      return new Promise((fertig) => {
        setTimeout(() => {
          if (!angekommen && "navigate" in client) client.navigate(target);
          fertig();
        }, 400);
      });
    })
  );
});
