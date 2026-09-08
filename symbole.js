/* Ein Symbolfenster: seitlich blaettern, senkrecht bleibt die Seite frei. */
(function () {
  "use strict";
  var fenster = document.getElementById("symbolFenster");
  var karten = document.getElementById("karten");
  var steuerung = document.getElementById("symbolSteuerung");
  var zaehler = document.getElementById("symbolZaehler");
  if (!fenster || !karten || !steuerung) return;

  var aktiv = null;
  var geste = null;
  var sperreBis = 0;
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

  function liste() {
    return Array.from(karten.children).filter(function (el) {
      return el.classList.contains("card");
    }).sort(function (a, b) {
      return (Number(a.style.order) || 0) - (Number(b.style.order) || 0);
    });
  }

  function zuruecksetzen() {
    if (geste && geste.karte) geste.karte.style.transform = "";
    geste = null;
  }

  function zeigen(karte, scrollen) {
    var alle = liste();
    var index = alle.indexOf(karte);
    if (index < 0) return false;
    zuruecksetzen();
    var fokusWechsel = aktiv && aktiv !== karte && aktiv.contains(document.activeElement);
    aktiv = karte;
    karten.classList.add("seitlich");
    fenster.classList.add("bereit");
    document.documentElement.classList.add("symbole-einrasten");
    alle.forEach(function (el, i) {
      el.hidden = el !== aktiv;
      el.setAttribute("role", "group");
      el.setAttribute("aria-roledescription", "Folie");
      el.setAttribute("aria-label", (i + 1) + " von " + alle.length);
      el.tabIndex = -1;
    });
    steuerung.hidden = false;
    var kuerzel = karte.getAttribute("data-kuerzel") || karte.id;
    zaehler.textContent = kuerzel + " · " + (index + 1) + " von " + alle.length;
    document.querySelectorAll("nav a[href^='#']").forEach(function (a) {
      var an = a.hash === "#" + karte.id;
      a.classList.toggle("nav-hier", an);
      if (an) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (fokusWechsel) karte.focus({ preventScroll: true });
    if (scrollen) {
      var rand = Math.max(0, (window.innerHeight - fenster.offsetHeight) / 2);
      window.scrollTo({
        top: Math.max(0, fenster.getBoundingClientRect().top + window.scrollY - rand),
        behavior: ruhig.matches ? "auto" : "smooth"
      });
    }
    return true;
  }

  function blaettern(richtung) {
    var alle = liste();
    if (alle.length < 2) return;
    var index = alle.indexOf(aktiv);
    zeigen(alle[(index + richtung + alle.length) % alle.length], false);
    if (!ruhig.matches && aktiv.animate) {
      aktiv.animate([
        { transform: "translateX(" + (richtung * 24) + "px)", opacity: 0.4 },
        { transform: "translateX(0)", opacity: 1 }
      ], { duration: 220, easing: "ease-out" });
    }
  }

  window.rcpSymbolZeigen = function (ziel, scrollen) {
    var karte = typeof ziel === "string" ? document.getElementById(ziel.replace(/^#/, "")) : ziel;
    return zeigen(karte, scrollen !== false);
  };

  fenster.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey ||
        e.target.closest("input, textarea, select, [contenteditable='true'], [role='slider']")) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    blaettern(e.key === "ArrowLeft" ? -1 : 1);
  });

  // PointerEvents decken Finger, Stift und Maus ab. Vertikales Ziehen
  // uebernimmt der Browser; ein Abbruch darf keine Aktie weiterschalten.
  karten.addEventListener("pointerdown", function (e) {
    if (!e.isPrimary) { zuruecksetzen(); return; }
    if (e.button !== 0 || !aktiv || liste().length < 2 ||
        e.target.closest("button, input, select, textarea, [contenteditable='true']")) return;
    geste = { id: e.pointerId, x: e.clientX, y: e.clientY, quer: false, karte: aktiv };
  });
  window.addEventListener("pointermove", function (e) {
    if (!geste || geste.id !== e.pointerId) return;
    var dx = e.clientX - geste.x, dy = e.clientY - geste.y;
    if (!geste.quer) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) { zuruecksetzen(); return; }
      geste.quer = true;
      karten.setPointerCapture(e.pointerId);
    }
    if (!ruhig.matches) geste.karte.style.transform = "translateX(" + Math.max(-70, Math.min(70, dx * 0.35)) + "px)";
  }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (!geste || geste.id !== e.pointerId) return;
    var dx = e.clientX - geste.x, dy = e.clientY - geste.y;
    var quer = geste.quer || (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy));
    zuruecksetzen();
    if (quer) {
      sperreBis = Date.now() + 400;
      if (Math.abs(dx) > 45) blaettern(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
  window.addEventListener("pointercancel", zuruecksetzen, { passive: true });
  karten.addEventListener("lostpointercapture", zuruecksetzen);
  window.addEventListener("blur", zuruecksetzen);
  document.addEventListener("visibilitychange", function () { if (document.hidden) zuruecksetzen(); });
  // Ein Wisch ueber einer Schlagzeile oeffnet keinen Link beim Loslassen.
  karten.addEventListener("click", function (e) {
    if (Date.now() < sperreBis) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  function anker() {
    if (location.hash) window.rcpSymbolZeigen(location.hash);
  }
  window.addEventListener("hashchange", anker);
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a[href^='#']");
    if (a && window.rcpSymbolZeigen(a.hash)) e.preventDefault();
  });
  document.addEventListener("rcp:sortiert", function () {
    if (aktiv) zeigen(aktiv, false);
  });
  function starten() {
    var alle = liste();
    if (!alle.length) { aktiv = null; steuerung.hidden = true; return; }
    var ziel = location.hash && document.getElementById(location.hash.slice(1));
    zeigen(alle.indexOf(ziel) >= 0 ? ziel : alle[0], false);
  }
  document.addEventListener("rcp:karten", starten);
  if (window.rcpPositionen) starten();
})();
