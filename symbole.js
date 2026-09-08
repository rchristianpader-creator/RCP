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
    if (geste && geste.karte) {
      geste.karte.style.transition = "";
      geste.karte.style.transform = "";
    }
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

  // Derselbe Touch-Weg wie beim Wirtschaftskalender: ab acht Pixeln die
  // Richtung festlegen, dem Finger ungebremst folgen, ab 45 Pixeln wechseln.
  // Native TouchEvents bleiben von begleitenden Pointer-Abbruechen getrennt.
  function anfangen(p, ziel, native) {
    zuruecksetzen();
    if (!aktiv || liste().length < 2 ||
        ziel.closest("button, input, select, textarea, [contenteditable='true']")) return;
    if (aktiv.getAnimations) aktiv.getAnimations().forEach(function (a) { a.cancel(); });
    geste = { id: native ? p.identifier : p.pointerId, native: native,
      x: p.clientX, y: p.clientY, quer: false, karte: aktiv };
  }
  function bewegen(p, e) {
    var dx = p.clientX - geste.x, dy = p.clientY - geste.y;
    if (!geste.quer) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) { zuruecksetzen(); return; }
      geste.quer = true;
    }
    if (e && e.cancelable) e.preventDefault();
    if (!ruhig.matches) {
      geste.karte.style.transition = "none";
      geste.karte.style.transform = "translateX(" + dx + "px)";
    }
  }
  function loslassen(p) {
    var dx = p.clientX - geste.x, dy = p.clientY - geste.y;
    var quer = geste.quer || (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy));
    zuruecksetzen();
    if (quer) {
      sperreBis = Date.now() + 400;
      if (Math.abs(dx) > 45) blaettern(dx < 0 ? 1 : -1);
    }
  }
  fenster.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { zuruecksetzen(); return; }
    anfangen(e.touches[0], e.target, true);
  }, { passive: true });
  fenster.addEventListener("touchmove", function (e) {
    if (!geste || !geste.native) return;
    if (e.touches.length !== 1 || e.touches[0].identifier !== geste.id) {
      zuruecksetzen(); return;
    }
    bewegen(e.touches[0], e);
  }, { passive: false });
  fenster.addEventListener("touchend", function (e) {
    if (!geste || !geste.native) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === geste.id) {
        loslassen(e.changedTouches[i]); return;
      }
    }
  }, { passive: true });
  fenster.addEventListener("touchcancel", zuruecksetzen, { passive: true });

  // Maus und Stift behalten denselben Weg; Touch laeuft oben wie im Kalender.
  karten.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch" || (geste && geste.native)) return;
    if (!e.isPrimary) { zuruecksetzen(); return; }
    if (e.button !== 0) return;
    anfangen(e, e.target, false);
  });
  window.addEventListener("pointermove", function (e) {
    if (!geste || geste.native || geste.id !== e.pointerId) return;
    var warQuer = geste.quer;
    bewegen(e);
    if (geste && geste.quer && !warQuer) karten.setPointerCapture(e.pointerId);
  }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (!geste || geste.native || geste.id !== e.pointerId) return;
    loslassen(e);
  }, { passive: true });
  function pointerAbbruch() { if (geste && !geste.native) zuruecksetzen(); }
  window.addEventListener("pointercancel", pointerAbbruch, { passive: true });
  karten.addEventListener("lostpointercapture", pointerAbbruch);
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
