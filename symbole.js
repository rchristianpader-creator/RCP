/* Native seitliche Bewegung; senkrecht scrollt der Browser ganz allein. */
(function () {
  "use strict";
  var fenster = document.getElementById("symbolFenster");
  var karten = document.getElementById("karten");
  var steuerung = document.getElementById("symbolSteuerung");
  var zaehler = document.getElementById("symbolZaehler");
  if (!fenster || !karten || !steuerung) return;
  var aktiv = null, plaetze = [], auswahlFrame = 0, breite = 0;
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

  function liste() {
    return Array.from(karten.children).filter(function (el) {
      return el.classList.contains("card");
    }).sort(function (a, b) { return (Number(a.style.order) || 0) - (Number(b.style.order) || 0); });
  }
  function messen() {
    breite = karten.clientWidth;
    var alle = liste();
    plaetze = alle.map(function (el, i) {
      el.setAttribute("role", "group");
      el.setAttribute("aria-roledescription", "Folie");
      el.setAttribute("aria-label", (i + 1) + " von " + alle.length);
      el.tabIndex = -1;
      return { el: el, x: Math.max(0, el.offsetLeft - (karten.clientWidth - el.offsetWidth) / 2) };
    });
  }
  function markieren(karte) {
    if (!karte) return;
    var alle = plaetze.map(function (p) { return p.el; }), index = alle.indexOf(karte);
    if (index < 0) return;
    var fokusWechsel = aktiv && aktiv !== karte && aktiv.contains(document.activeElement);
    if (aktiv && aktiv !== karte) {
      aktiv.inert = true;
      aktiv.setAttribute("aria-hidden", "true");
    }
    aktiv = karte;
    aktiv.inert = false;
    aktiv.setAttribute("aria-hidden", "false");
    alle.forEach(function (el, i) {
      // Nachbarn sind bereits gerendert, bevor der naechste Wisch beginnt.
      el.classList.toggle("symbol-vorlauf", Math.abs(i - index) <= 1);
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
    window.scrollTo({ top: Math.max(0, fenster.getBoundingClientRect().top + window.scrollY - rand),
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

  // Kein Einrasten und kein Nachziehen: senkrecht bleibt das Scrollen beim
  // Browser. Zur Mitte geht es nur, wenn ein Symbol direkt gewaehlt wird.
  window.addEventListener("hashchange", function () { if (location.hash) zeigen(location.hash); });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest("a[href^='#']");
    if (a && zeigen(a.hash)) e.preventDefault();
  });
  function neuMessen() {
    if (!aktiv) return;
    var alle = liste();
    if (karten.clientWidth === breite && alle.length === plaetze.length &&
        alle.every(function (el, i) { return el === plaetze[i].el; })) return;
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
    alle.forEach(function (el) {
      el.hidden = false; el.inert = true; el.setAttribute("aria-hidden", "true");
    });
    messen();
    var ziel = location.hash && document.getElementById(location.hash.slice(1));
    zeigen(alle.indexOf(ziel) >= 0 ? ziel : alle[0], false, true);
  }
  document.addEventListener("rcp:karten", starten);
  if (window.rcpPositionen) starten();
})();
