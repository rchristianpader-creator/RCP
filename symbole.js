/* Native seitliche Bewegung; senkrechtes Zentrieren erst nach dem Ausrollen. */
(function () {
  "use strict";
  var fenster = document.getElementById("symbolFenster");
  var karten = document.getElementById("karten");
  var steuerung = document.getElementById("symbolSteuerung");
  var zaehler = document.getElementById("symbolZaehler");
  if (!fenster || !karten || !steuerung) return;
  var aktiv = null, plaetze = [], auswahlFrame = 0, breite = 0;
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
  var zentrierUhr = 0, finger = 0, gehalten = false, eingerastet = false, mitteY = 0;

  function liste() {
    return Array.from(karten.children).filter(function (el) {
      return el.classList.contains("card");
    }).sort(function (a, b) { return (Number(a.style.order) || 0) - (Number(b.style.order) || 0); });
  }
  function messen() {
    breite = karten.clientWidth;
    plaetze = liste().map(function (el) {
      return { el: el, x: Math.max(0, el.offsetLeft - (karten.clientWidth - el.offsetWidth) / 2) };
    });
  }
  function markieren(karte) {
    if (!karte) return;
    var alle = liste(), index = alle.indexOf(karte);
    if (index < 0) return;
    var fokusWechsel = aktiv && aktiv !== karte && aktiv.contains(document.activeElement);
    aktiv = karte;
    alle.forEach(function (el, i) {
      el.hidden = false;
      el.inert = el !== aktiv;
      el.setAttribute("aria-hidden", el === aktiv ? "false" : "true");
      el.setAttribute("role", "group");
      el.setAttribute("aria-roledescription", "Folie");
      el.setAttribute("aria-label", (i + 1) + " von " + alle.length);
      el.tabIndex = -1;
    });
    steuerung.hidden = false;
    zaehler.textContent = (karte.getAttribute("data-kuerzel") || karte.id) + " · " + (index + 1) + " von " + alle.length;
    document.querySelectorAll("nav a[href^='#']").forEach(function (a) {
      var an = a.hash === "#" + karte.id;
      a.classList.toggle("nav-hier", an);
      if (an) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    if (fokusWechsel) karte.focus({ preventScroll: true });
  }
  function zentrieren() {
    var rand = Math.max(0, (window.innerHeight - fenster.offsetHeight) / 2);
    eingerastet = true;
    mitteY = Math.max(0, fenster.getBoundingClientRect().top + window.scrollY - rand);
    window.scrollTo({ top: mitteY,
      behavior: ruhig.matches ? "instant" : "smooth" });
  }
  function zeigen(ziel, scrollen, sofort) {
    var karte = typeof ziel === "string" ? document.getElementById(ziel.replace(/^#/, "")) : ziel;
    var platz = plaetze.find(function (p) { return p.el === karte; });
    if (!platz) return false;
    markieren(karte);
    karten.scrollTo({ left: platz.x, behavior: sofort || ruhig.matches ? "instant" : "smooth" });
    if (scrollen !== false) zentrieren();
    return true;
  }
  window.rcpSymbolZeigen = zeigen;
  function auswahl() {
    auswahlFrame = 0;
    var x = karten.scrollLeft, naechste = null, abstand = Infinity;
    plaetze.forEach(function (p) { var d = Math.abs(p.x - x); if (d < abstand) { abstand = d; naechste = p.el; } });
    if (naechste && naechste !== aktiv) markieren(naechste);
  }
  karten.addEventListener("scroll", function () {
    if (!auswahlFrame) auswahlFrame = window.requestAnimationFrame(auswahl);
  }, { passive: true });
  karten.addEventListener("scrollend", auswahl, { passive: true });
  fenster.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey ||
        e.target.closest("input, textarea, select, [contenteditable='true'], [role='slider']")) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    var alle = liste(), i = alle.indexOf(aktiv), n = i + (e.key === "ArrowLeft" ? -1 : 1);
    if (alle.length) zeigen(alle[(n + alle.length) % alle.length], false);
  });

  // Kein vertikales CSS-Snap und kein Abfangen von touchmove. Der Browser
  // darf frei scrollen und ausrollen. Erst im Stillstand nahe der Leseposition
  // folgt ein kurzer smooth-scroll zur Mitte. Danach kann man frei weiter.
  function ruhePruefen(e) {
    if (e && e.target !== window && e.target !== document) return;
    window.clearTimeout(zentrierUhr);
    if (!aktiv || finger || gehalten || document.hidden) return;
    var r = fenster.getBoundingClientRect(), h = window.innerHeight;
    var delta = (r.top + r.bottom - h) / 2;
    if (Math.abs(delta) > h * 0.5) eingerastet = false;
    if (Math.abs(delta) < 2) { eingerastet = true; mitteY = window.scrollY; return; }
    if (eingerastet || Math.abs(delta) > h * 0.28) return;
    if (r.top > h * 0.35 || r.bottom < h * 0.65) return;
    zentrieren();
  }
  function spaeter() {
    window.clearTimeout(zentrierUhr);
    // scrollend kennt auch das Ende des nativen Schwungs. Aeltere Browser
    // bekommen den Stillstands-Timer, der bei jedem Scrollereignis neu beginnt.
    if (!("onscrollend" in window)) zentrierUhr = window.setTimeout(ruhePruefen, 180);
  }
  window.addEventListener("scroll", function () {
    if (eingerastet && Math.abs(window.scrollY - mitteY) > window.innerHeight * 0.5) eingerastet = false;
    spaeter();
  }, { passive: true });
  window.addEventListener("scrollend", ruhePruefen, { passive: true });
  window.addEventListener("touchstart", function (e) { finger = e.touches.length; window.clearTimeout(zentrierUhr); }, { passive: true });
  function fingerLos(e) { finger = e.touches.length; if (!finger) spaeter(); }
  window.addEventListener("touchend", fingerLos, { passive: true });
  window.addEventListener("touchcancel", fingerLos, { passive: true });
  window.addEventListener("pointerdown", function () { gehalten = true; window.clearTimeout(zentrierUhr); }, { passive: true });
  function zeigerLos() { gehalten = false; spaeter(); }
  window.addEventListener("pointerup", zeigerLos, { passive: true });
  window.addEventListener("pointercancel", zeigerLos, { passive: true });
  window.addEventListener("blur", function () { finger = 0; gehalten = false; window.clearTimeout(zentrierUhr); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { finger = 0; gehalten = false; window.clearTimeout(zentrierUhr); }
  });
  window.addEventListener("hashchange", function () { if (location.hash) zeigen(location.hash); });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a[href^='#']");
    if (a && zeigen(a.hash)) e.preventDefault();
  });
  function neuMessen() {
    if (!aktiv) return;
    messen(); zeigen(aktiv, false, true);
  }
  document.addEventListener("rcp:sortiert", neuMessen);
  function breitePruefen() { if (karten.clientWidth !== breite) neuMessen(); }
  if (window.ResizeObserver) new window.ResizeObserver(breitePruefen).observe(karten);
  else window.addEventListener("resize", breitePruefen, { passive: true });
  function starten() {
    var alle = liste();
    if (!alle.length) { aktiv = null; steuerung.hidden = true; return; }
    karten.classList.add("seitlich"); fenster.classList.add("bereit");
    alle.forEach(function (el) { el.hidden = false; });
    messen();
    var ziel = location.hash && document.getElementById(location.hash.slice(1));
    zeigen(alle.indexOf(ziel) >= 0 ? ziel : alle[0], false, true);
  }
  document.addEventListener("rcp:karten", starten);
  if (window.rcpPositionen) starten();
})();
