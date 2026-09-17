/* DIE NEIGUNG DES GERAETS — als Eingabe fuer die Wasserflaeche.

   Sie geht nirgends sonst hin. Diese Datei liest den Lagesensor und
   schickt EINEN Wert weiter (rcp:liquid-tilt); nichts an der Seite wird
   dabei bewegt, gedreht oder verschoben. Wer die Neigung anderswo haben
   will, muesste dafuer eine zweite Stelle bauen — und genau das soll sie
   nicht koennen.

   DIE RUHELAGE FOLGT LANGSAM NACH.

   Ein Telefon wird nicht flach gehalten, sondern schraeg. Nimmt man die
   Schwerkraft absolut, stuende das Wasser dauerhaft am unteren Rand und
   saehe kaputt aus. Darum gilt: die Haltung, in der das Geraet gerade
   ist, ist die Ruhelage, und eine neue Haltung wird es nach einigen
   Sekunden auch. Wer kippt, sieht es sofort; wer anders sitzt, sieht
   nichts.

   DIE ERLAUBNIS.

   Ab iOS 13 gibt der Lagesensor nichts heraus, bevor der Mensch es
   erlaubt, und gefragt werden darf nur aus einer Geste heraus. Gefragt
   wird deshalb beim ersten Antippen, genau einmal; die Antwort wird
   behalten. Wer ablehnt, wird nicht wieder gefragt. Auf Android und am
   Rechner braucht es das nicht, dort laeuft es sofort. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var opaque = matchMedia('(prefers-reduced-transparency: reduce)');

  /* Ab wie viel Grad Neigung es nicht mehr staerker wird. Zwanzig Grad
     sind eine deutliche, aber bequeme Handbewegung. */
  var MAX_GRAD = 22;
  /* Wie lange eine neue Haltung braucht, um Ruhelage zu werden. Kurz
     genug, dass niemand schraeges Wasser behaelt; lang genug, dass ein
     absichtliches Kippen stehenbleibt, solange man hinsieht. */
  var RUHE_MS = 7000;
  /* Unter diesem Ausschlag gilt das Geraet als ruhig — Handzittern soll
     das Wasser nicht dauernd wachhalten. */
  var TOTGANG = 0.035;

  /* DIE BEIDEN VORZEICHEN, an EINER Stelle.

     gamma ist die Neigung nach links/rechts, beta die nach vorn/hinten.
     Welches Vorzeichen "die rechte Kante nach unten" bedeutet, haengt am
     Geraeterahmen — fuehlt es sich verkehrt an, wird hier eine Zahl
     negativ, und nur hier. */
  var RICHTUNG_X = 1;
  var RICHTUNG_Y = 1;

  var ruheB = null, ruheG = null, zuletzt = 0;
  var letztX = 0, letztY = 0;
  var haengt = false;

  function klemm(v) { return v < -1 ? -1 : (v > 1 ? 1 : v); }

  function senden(x, y) {
    /* Nichts schicken, was sich nicht geaendert hat: das Wasser wacht bei
       jedem Ruf auf, und der Sensor liefert sechzig Mal je Sekunde. */
    if (Math.abs(x - letztX) < 0.004 && Math.abs(y - letztY) < 0.004) return;
    letztX = x; letztY = y;
    window.dispatchEvent(new CustomEvent('rcp:liquid-tilt', { detail: { x: x, y: y } }));
  }

  function lesen(e) {
    if (document.hidden || reduced.matches || opaque.matches) return;
    var b = e.beta, g = e.gamma;
    if (typeof b !== 'number' || typeof g !== 'number') return;
    if (!isFinite(b) || !isFinite(g)) return;
    var jetzt = performance.now();
    if (ruheB === null) {
      /* Die erste Messung IST die Ruhelage. Ohne das haette der erste
         Anstoss die Groesse der Haltung und nicht die der Bewegung. */
      ruheB = b; ruheG = g; zuletzt = jetzt;
      senden(0, 0);
      return;
    }
    var dt = Math.min(500, Math.max(0, jetzt - zuletzt));
    zuletzt = jetzt;
    var folgen = dt / RUHE_MS;
    if (folgen > 1) folgen = 1;
    ruheB += (b - ruheB) * folgen;
    ruheG += (g - ruheG) * folgen;

    var x = klemm(RICHTUNG_X * (g - ruheG) / MAX_GRAD);
    var y = klemm(RICHTUNG_Y * (b - ruheB) / MAX_GRAD);
    if (Math.abs(x) < TOTGANG) x = 0;
    if (Math.abs(y) < TOTGANG) y = 0;
    senden(x, y);
  }

  function anhaengen() {
    if (haengt) return;
    haengt = true;
    window.addEventListener('deviceorientation', lesen, { passive: true });
  }

  function abhaengen() {
    if (!haengt) return;
    haengt = false;
    window.removeEventListener('deviceorientation', lesen);
    ruheB = null; ruheG = null;
    senden(0, 0);
  }

  var SCHLUESSEL = 'rcp_neigung';
  function merken(wert) {
    try { localStorage.setItem(SCHLUESSEL, wert); } catch (e) {}
  }
  function gemerkt() {
    try { return localStorage.getItem(SCHLUESSEL); } catch (e) { return null; }
  }

  function starten() {
    var D = window.DeviceOrientationEvent;
    if (!D) return;
    if (reduced.matches || opaque.matches) return;
    if (typeof D.requestPermission !== 'function') { anhaengen(); return; }
    /* Hier ist iOS. Abgelehnt bleibt abgelehnt — nicht bei jedem Start
       wieder fragen. */
    if (gemerkt() === '0') return;
    var einmal = function () {
      ['pointerdown', 'touchend', 'click'].forEach(function (n) {
        window.removeEventListener(n, einmal, true);
      });
      D.requestPermission().then(function (antwort) {
        if (antwort === 'granted') { merken('1'); anhaengen(); }
        else merken('0');
      }).catch(function () {});
    };
    ['pointerdown', 'touchend', 'click'].forEach(function (n) {
      window.addEventListener(n, einmal, true);
    });
  }

  /* Aus dem Blick heisst aus: ein Sensor, der im Hintergrund weiterliest,
     haelt das Wasser wach und kostet Strom fuer ein Bild, das niemand
     sieht. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) senden(0, 0);
    else { ruheB = null; ruheG = null; }
  });
  [reduced, opaque].forEach(function (p) {
    p.addEventListener('change', function () {
      if (p.matches) abhaengen();
      else starten();
    });
  });

  starten();

  /* KEIN GRIFF FUER DIE PRUEFUNG. Hier stand window.rcpNeigungProbe, um
     die Reihe ohne Sensor anstossen zu koennen — und das waere ein
     Testhaken im ausgelieferten Code gewesen. Es braucht ihn nicht: ein
     DeviceOrientationEvent laesst sich von aussen erzeugen und
     zuschicken, und dann laeuft genau der Weg, den auch das Geraet
     nimmt — samt dieser Anmeldung hier. */
})();
