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

   DIE ERLAUBNIS — UND WER DANACH FRAGT.

   Ab iOS 13 gibt der Lagesensor nichts heraus, bevor der Mensch es
   erlaubt, und gefragt werden darf nur aus einer Geste heraus.

   Der erste Anlauf fragte beim ERSTEN ANTIPPEN IRGENDWO und merkte sich
   ein Nein fuer immer. Beides war falsch. Ein Systemdialog, der
   aufspringt, weil man auf eine Karte getippt hat, ist ein Ueberfall; und
   "nie wieder fragen" ohne jeden Schalter heisst, dass eine einmal
   verneinte Frage nicht mehr zu beantworten ist. Gefragt wurde damit die
   Frage "wie aktiviere ich das" — zu Recht, denn es ging gar nicht.

   Jetzt fragt niemand von selbst. Wo eine Erlaubnis noetig ist und noch
   nicht vorliegt, meldet dieses Stueck "moeglich, laeuft aber nicht"; die
   Seite zeigt daraufhin einen Knopf, und erst dessen Druck fragt. Ein
   Nein sperrt nichts: der Knopf steht wieder da.

   Auf Android und am Rechner braucht es keine Erlaubnis, dort laeuft es
   sofort und ohne Knopf. */
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

  function standMelden() {
    window.dispatchEvent(new CustomEvent('rcp:neigung-stand',
      { detail: { laeuft: haengt, moeglich: moeglich() } }));
  }

  function anhaengen() {
    if (haengt) return;
    haengt = true;
    window.addEventListener('deviceorientation', lesen, { passive: true });
    standMelden();
  }

  function abhaengen() {
    if (!haengt) return;
    haengt = false;
    window.removeEventListener('deviceorientation', lesen);
    ruheB = null; ruheG = null;
    senden(0, 0);
    standMelden();
  }

  var SCHLUESSEL = 'rcp_neigung';
  function merken(wert) {
    try { localStorage.setItem(SCHLUESSEL, wert); } catch (e) {}
  }
  function gemerkt() {
    try { return localStorage.getItem(SCHLUESSEL); } catch (e) { return null; }
  }

  function moeglich() {
    return !!window.DeviceOrientationEvent && !reduced.matches && !opaque.matches;
  }
  function brauchtErlaubnis() {
    var D = window.DeviceOrientationEvent;
    return !!D && typeof D.requestPermission === 'function';
  }

  /* Fragen — und zwar NUR, wenn jemand danach gefragt hat. Der Ruf muss
     synchron in der Geste stehen, sonst weist iOS ihn ab; deshalb keine
     Umwege und kein setTimeout davor. */
  function fragen() {
    var D = window.DeviceOrientationEvent;
    if (!D || !moeglich()) return Promise.resolve(false);
    if (!brauchtErlaubnis()) { anhaengen(); return Promise.resolve(true); }
    return D.requestPermission().then(function (antwort) {
      if (antwort === 'granted') { merken('1'); anhaengen(); return true; }
      /* Ein Nein wird NICHT gemerkt: der Knopf steht wieder da, und wer
         es sich anders ueberlegt, kann es sich anders ueberlegen. */
      standMelden();
      return false;
    }).catch(function () { standMelden(); return false; });
  }

  function starten() {
    if (!moeglich()) return;
    if (!brauchtErlaubnis()) { anhaengen(); return; }
    /* Schon einmal erlaubt: dann darf ohne Dialog wieder gefragt werden.
       iOS verlangt den Ruf trotzdem aus einer Geste heraus, aber er geht
       diesmal lautlos durch — es blinkt nichts auf. */
    if (gemerkt() !== '1') { standMelden(); return; }
    var einmal = function () {
      ['pointerdown', 'touchend', 'click'].forEach(function (n) {
        window.removeEventListener(n, einmal, true);
      });
      fragen();
    };
    ['pointerdown', 'touchend', 'click'].forEach(function (n) {
      window.addEventListener(n, einmal, true);
    });
  }

  /* Der Griff fuer die Seite: ob es geht, ob es laeuft, und das Einschalten
     von Hand. Mehr gibt es hier nicht zu holen — die Neigung selbst
     verlaesst dieses Stueck nur als rcp:liquid-tilt. */
  window.rcpNeigung = {
    moeglich: moeglich,
    brauchtErlaubnis: brauchtErlaubnis,
    laeuft: function () { return haengt; },
    einschalten: fragen,
    ausschalten: function () { merken('0'); abhaengen(); }
  };

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
