/* Sagt der Verwaltung, dass diese Seite gerade offen ist.

   Alle 45 Sekunden ein kleiner Ruf, solange das Fenster sichtbar ist. Geht
   es in den Hintergrund oder wird es geschlossen, kommt ein letzter Ruf mit
   weg: true — sonst haenge jemand noch zwei Minuten lang als "da" herum,
   nachdem er die App laengst zugemacht hat.

   Der erste Ruf wartet, bis die Seite fertig geladen ist. Er soll den
   Charts nicht die Leitung wegnehmen.

   Eingebunden in index.html, verwaltung.html und positionen.html — also
   ueberall, wo man angemeldet ist. */

(function () {
  var ZIEL = "/.netlify/functions/besuch";
  var TAKT = 45000;      // wie oft gemeldet wird
  var RUHE = 20000;      // schneller als das nicht, auch bei vielen Anlaessen

  // Eine Kennung je Geraet, damit zwei Geraete derselben Person getrennt
  // gezaehlt werden und das Schliessen des einen das andere nicht abmeldet.
  var geraet;
  try {
    geraet = localStorage.getItem("rcp:geraet") || "";
    if (!/^[a-z0-9]{4,32}$/.test(geraet)) {
      geraet = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
      geraet = geraet.replace(/[^a-z0-9]/g, "").slice(0, 16);
      localStorage.setItem("rcp:geraet", geraet);
    }
  } catch (e) {
    geraet = "";   // privates Fenster: dann eben ohne Wiedererkennung
  }

  var letzte = 0;
  var abgemeldet = false;

  function melden(weg) {
    var jetzt = Date.now();
    if (weg && abgemeldet) return;                              // nicht zweimal
    if (!weg && !abgemeldet && jetzt - letzte < RUHE) return;   // nicht zu dicht
    letzte = jetzt;
    abgemeldet = weg === true;

    var koerper = JSON.stringify({ geraet: geraet, weg: weg === true });

    // Beim Schliessen laeuft ein normales fetch nicht mehr zu Ende
    if (weg && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(ZIEL, new Blob([koerper], { type: "application/json" }));
        return;
      } catch (e) {
        // dann eben mit fetch
      }
    }

    fetch(ZIEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: koerper,
      keepalive: weg === true
    })
      // Was der Server antwortet, ist egal — abgeholt werden muss es
      // trotzdem. Sonst bleibt die Verbindung offen stehen, und die Seite
      // gilt fuer den Browser nie als fertig geladen.
      .then(function (r) {
        return r.text().then(function () {
          // Die Verwaltung soll sich selbst sofort in der Liste sehen und
          // nicht erst beim naechsten Nachsehen.
          if (!weg) document.dispatchEvent(new CustomEvent("rcp:besuch"));
        });
      })
      .catch(function () {});
  }

  function anfangen() {
    melden(false);
    setInterval(function () {
      if (document.visibilityState === "visible") melden(false);
    }, TAKT);

    document.addEventListener("visibilitychange", function () {
      melden(document.visibilityState !== "visible");
    });
    window.addEventListener("pagehide", function () { melden(true); });
  }

  function spaeter() { setTimeout(anfangen, 600); }
  if (document.readyState === "complete") spaeter();
  else window.addEventListener("load", spaeter);
})();
