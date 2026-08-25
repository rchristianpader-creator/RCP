/* DER KOSMOS — der Auftakt der Verwaltung. Zweiter Wurf, von Grund auf.

   Der erste Wurf war ein Uhrwerk: Marken auf gekippten Ringen um einen
   Kern, davor ein Sternenfeld aus Strichen. Er ist an seiner eigenen
   Bauart gescheitert — eine flache Buehne, auf der Tiefe nur behauptet
   wird (kleiner gemalt = weiter weg), sieht nach Schaubild aus, und
   Striche quer uebers Bild nach Bildschirmschoner, egal wie viel man
   daran stellt. Das Urteil dazu war eindeutig.

   JETZT IST ES EIN FLUG. Die Szene hat eine dritte Achse: jede Marke
   haengt an einem ORT im Raum, und die Kamera fliegt mit stetiger Fahrt
   eine Gasse aus Marken entlang — sie kommen als schwache Lichter aus
   dem Nebel, wachsen im Naeherkommen, ziehen gross und nah an der
   Kamera vorbei und tauchen hinter ihr weg. Nichts davon ist gemalte
   Behauptung: Groesse, Lage und Licht folgen alle derselben Projektion
   (Schirmweite mal Brennweite durch Abstand), und genau diese
   Uebereinstimmung ist es, die ein Auge als "echt" liest.

   DIE GASSE: die Marken stehen als Doppel-Helix um die Flugbahn —
   zwei Straenge, exakt gleicher Abstand in der Tiefe, exakt gleicher
   Winkelschritt, das Ganze dreht traege um die Achse weiter. Symmetrie
   aus Bauart, nicht aus Regelung: die Staffel KANN nicht ungleich
   werden, weil nichts an ihr nachstellt. Und jede Scheibe dreht dabei
   um die eigene Achse, wie eine Muenze im Wind.

   DAS ZIEL: ganz hinten steht die eigene Marke der App und glimmt der
   Kamera entgegen. Der ganze Flug fuehrt auf sie zu; beim Abriss
   beschleunigt die Fahrt in sie hinein — die Sterne strecken sich zu
   Strichen (NUR dann: Verschmieren ist eine Verschlusszeit, kein
   Dauerzustand), ein Blitz, und die Seite liegt frei.

   Geblieben aus dem ersten Wurf ist alles, was sich bewaehrt hat: die
   Farben der App (#0a0d0c, Stahlblau/Tuerkis/Bronze/Flieder aus
   stil.css), die Glasscheiben der Marken mit dem Logo-Weg der Liste,
   Korn und Randabdunklung, die Sparschaltung, die Deckel auf
   Pixeldichte und Flaeche, der feste Zufall — und die Vertraege zu den
   Seiten: dieselben Griffe, dieselben Zeiten, derselbe Tipp zum
   Abkuerzen (die Flaeche selbst faengt nichts ab, pointer-events: none). */
(function () {
  "use strict";

  var DAUER_BAHN = 4600;   /* bis hierhin dauert die Reise               */
  var DAUER_ENDE = 1200;   /* der Abriss: hinein in den Kern             */

  function klemm(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function glatt(a, b, x) {
    if (x <= a) return 0;
    if (x >= b) return 1;
    var u = (x - a) / (b - a);
    return u * u * (3 - 2 * u);
  }
  function aus(p) { var q = 1 - p; return 1 - q * q * q; }

  function tafel(b, h) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(b));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function glut(gr, stufen) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var v = x.createRadialGradient(gr / 2, gr / 2, 0, gr / 2, gr / 2, gr / 2);
    for (var i = 0; i < stufen.length; i++) v.addColorStop(stufen[i][0], stufen[i][1]);
    x.fillStyle = v;
    x.fillRect(0, 0, gr, gr);
    return c;
  }

  /* Der anamorphotische Streifen — die eine Zutat, an der das Auge eine
     Kameralinse erkennt. */
  function streifen(b, h, farbe) {
    var c = tafel(b, h), x = c.getContext("2d");
    var q = x.createLinearGradient(0, 0, b, 0);
    q.addColorStop(0, "rgba(0,0,0,0)");
    q.addColorStop(0.35, farbe);
    q.addColorStop(0.5, "rgba(255,255,255,0.95)");
    q.addColorStop(0.65, farbe);
    q.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, b, h);
    x.globalCompositeOperation = "destination-in";
    var s = x.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, "rgba(0,0,0,0)");
    s.addColorStop(0.5, "rgba(0,0,0,1)");
    s.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = s;
    x.fillRect(0, 0, b, h);
    return c;
  }

  /* Die Beugungsspinne fuer den Kern: zwei lange Arme, zwei kurze
     schraeg. Eine gleichmaessige Spinne sieht gezeichnet aus, eine
     ungleiche wie Optik. */
  function spinne(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2;
    x.globalCompositeOperation = "lighter";
    var arme = [[0, 1, 0.026], [1.5708, 0.8, 0.022], [0.7854, 0.4, 0.015], [-0.7854, 0.4, 0.015]];
    for (var i = 0; i < arme.length; i++) {
      x.save();
      x.translate(m, m);
      x.rotate(arme[i][0]);
      var l = m * arme[i][1], b = gr * arme[i][2];
      var v = x.createLinearGradient(-l, 0, l, 0);
      v.addColorStop(0, "rgba(192,220,212,0)");
      v.addColorStop(0.34, "rgba(216,236,229,0.34)");
      v.addColorStop(0.5, "rgba(255,255,255,0.85)");
      v.addColorStop(0.66, "rgba(216,236,229,0.34)");
      v.addColorStop(1, "rgba(192,220,212,0)");
      x.fillStyle = v;
      x.fillRect(-l, -b / 2, l * 2, b);
      x.restore();
    }
    var kv = x.createRadialGradient(m, m, 0, m, m, gr * 0.13);
    kv.addColorStop(0, "rgba(255,255,255,0.9)");
    kv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = kv;
    x.fillRect(0, 0, gr, gr);
    return c;
  }

  /* Ein unscharfer Lichtpunkt nahe der Linse: eine Scheibe mit hellerem
     Rand — die Form der Blende, nicht eine weiche Wolke. */
  function bokeh(gr, farbe) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m * 0.82;
    var v = x.createRadialGradient(m, m, 0, m, m, r);
    v.addColorStop(0, "rgba(" + farbe + ",0.32)");
    v.addColorStop(0.72, "rgba(" + farbe + ",0.38)");
    v.addColorStop(0.9, "rgba(" + farbe + ",0.8)");
    v.addColorStop(1, "rgba(" + farbe + ",0)");
    x.fillStyle = v;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.fill();
    return c;
  }

  /* Der Himmel: Gas in gezogenen Faeden statt runder Watte, dunkle
     Staubbahnen hineingeschnitten, feiner Staub darueber. Wird in halber
     Aufloesung benutzt — Nebel IST unscharf.

     DIE FARBEN DER APP, woertlich: der Grund jeder Seite ist --bg
     #0a0d0c, und darauf liegen VIER Lichtfelder — Stahlblau (38,74,96),
     Tuerkis (28,88,78), Bronze (112,82,52) und Flieder (64,44,78), so
     stehen sie in stil.css. Je Ton die Originalstufe und eine
     aufgehellte MIT GLEICHEM VERHAELTNIS der Kanaele — heller duerfen
     sie werden, anders nicht. */
  function himmel(gr, wuerfel) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    x.fillStyle = "#0a0d0c";
    x.fillRect(0, 0, gr, gr);
    var toene = [
      [38, 74, 96], [52, 100, 130],
      [28, 88, 78], [38, 118, 105],
      [112, 82, 52], [148, 110, 70],
      [64, 44, 78], [86, 60, 105]
    ];
    var richtung = 0.5;
    x.globalCompositeOperation = "lighter";
    for (var i = 0; i < 96; i++) {
      var t = toene[(wuerfel() * toene.length) | 0];
      var r = gr * (0.03 + wuerfel() * wuerfel() * 0.26);
      var px = wuerfel() * gr, py = wuerfel() * gr;
      var a = 0.07 + wuerfel() * 0.17;
      var lang = 1.6 + wuerfel() * wuerfel() * 3.4;
      x.save();
      x.translate(px, py);
      x.rotate(richtung + (wuerfel() - 0.5) * 1.5);
      x.scale(lang, 1 / Math.sqrt(lang));
      var v = x.createRadialGradient(0, 0, 0, 0, 0, r);
      v.addColorStop(0, "rgba(" + t[0] + "," + t[1] + "," + t[2] + "," + a.toFixed(3) + ")");
      v.addColorStop(0.55, "rgba(" + t[0] + "," + t[1] + "," + t[2] + "," + (a * 0.35).toFixed(3) + ")");
      v.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = v;
      x.fillRect(-r, -r, r * 2, r * 2);
      x.restore();
    }
    x.globalCompositeOperation = "source-over";
    for (var d = 0; d < 40; d++) {
      var rr = gr * (0.04 + wuerfel() * wuerfel() * 0.22);
      var dx = wuerfel() * gr, dy = wuerfel() * gr;
      var da = 0.16 + wuerfel() * 0.3;
      var dv = x.createRadialGradient(dx, dy, 0, dx, dy, rr);
      dv.addColorStop(0, "rgba(6,9,8," + da.toFixed(3) + ")");
      dv.addColorStop(1, "rgba(6,9,8,0)");
      x.fillStyle = dv;
      x.fillRect(dx - rr, dy - rr, rr * 2, rr * 2);
    }
    x.globalCompositeOperation = "lighter";
    for (var s = 0; s < 150; s++) {
      var sr = 0.8 + wuerfel() * wuerfel() * 2.2;
      var sa = 0.08 + wuerfel() * 0.2;
      x.fillStyle = "rgba(" + (196 + ((wuerfel() * 50) | 0)) + ",224,214," + sa.toFixed(3) + ")";
      x.beginPath();
      x.arc(wuerfel() * gr, wuerfel() * gr, sr, 0, 6.2832);
      x.fill();
    }
    return c;
  }

  function korn(gr, wuerfel) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var bild = x.createImageData(gr, gr), d = bild.data;
    for (var i = 0; i < d.length; i += 4) {
      var w = (wuerfel() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = w;
      d[i + 3] = 26 + ((wuerfel() * 40) | 0);
    }
    x.putImageData(bild, 0, 0);
    return c;
  }

  /* Ein eigener Zufall mit festem Anfang: derselbe Himmel bei jedem
     Start, dieselbe Gasse — sonst waere keine Pruefaufnahme mit der
     naechsten vergleichbar. */
  function wuerfelWerk(saat) {
    var z = saat >>> 0;
    return function () {
      z = (z * 1664525 + 1013904223) >>> 0;
      return z / 4294967296;
    };
  }

  /* ---- DIE SCHEIBEN DER MARKEN ----

     Dieselbe Aufloesung wie in der Liste (logoNeben in index.html ist das
     Vorbild): ein eigenes Bild geht vor, sonst der Logo-Dienst, sonst das
     Kuerzel — und Fetch.ai bekommt seine gezeichnete Marke. ZEICHEN und
     die Regel, wer gar kein Bild hat, stehen dort wortgleich; logo-test
     haelt die Fassungen zusammen. */
  var ZEICHEN = {
    "GC=F": "Au", "SI=F": "Ag", "HG=F": "Cu",
    "CL=F": "Öl", "NG=F": "Gas", "ZC=F": "Korn",
    "BTC-USD": "₿", "ETH-USD": "Ξ"
  };
  function ohneLogo(sym) {
    return /^(\^|GC=F|SI=F|CL=F|HG=F|NG=F|ZC=F|.*-USD$)/i.test(sym);
  }
  function zeichenFuer(sym) {
    if (ZEICHEN[sym]) return ZEICHEN[sym];
    if (sym.charAt(0) === "^") return sym.slice(1, 4);
    var basis = sym.split("-")[0].split(".")[0].split("=")[0];
    return basis.slice(0, 2) || "?";
  }

  /* Die Glasscheibe, auf der alles sitzt — mit Glanzpunkt oben links und
     kaltem Gegenlichtsaum unten rechts: der Griff, der aus einer Flaeche
     eine Kugel macht. */
  function scheibenGrund(x, gr, fuellung) {
    var m = gr / 2, r = m - gr * 0.03;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832);
    if (fuellung) {
      x.fillStyle = fuellung;
    } else {
      /* Das Glas traegt denselben Stich wie die App: gruengrau statt
         blaugrau. Bei den nahen Vorbeifluegen fuellt eine Scheibe das
         halbe Bild — mit blauem Glas kippte das Bildmittel ins Blau,
         und die Farbmessung der Pruefreihe schlug zu Recht an. */
      var v = x.createRadialGradient(m - r * 0.36, m - r * 0.48, r * 0.05, m, m, r);
      v.addColorStop(0, "rgba(94,114,118,0.98)");
      v.addColorStop(0.5, "rgba(50,64,66,0.98)");
      v.addColorStop(1, "rgba(22,32,33,0.98)");
      x.fillStyle = v;
    }
    x.fill();

    x.lineWidth = Math.max(1, gr * 0.012);
    var k = x.createLinearGradient(0, 0, 0, gr);
    k.addColorStop(0, "rgba(255,255,255,0.6)");
    k.addColorStop(0.45, "rgba(255,255,255,0.16)");
    k.addColorStop(1, "rgba(0,0,0,0.42)");
    x.strokeStyle = k;
    x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, 6.2832); x.stroke();

    var gx = m - r * 0.34, gy = m - r * 0.46;
    var gv = x.createRadialGradient(gx, gy, 0, gx, gy, r * 0.55);
    gv.addColorStop(0, "rgba(255,255,255,0.3)");
    gv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gv;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.fill();

    x.save();
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.clip();
    x.globalCompositeOperation = "lighter";
    var sv = x.createRadialGradient(m + r * 0.52, m + r * 0.6, r * 0.1,
                                    m + r * 0.52, m + r * 0.6, r * 1.15);
    sv.addColorStop(0, "rgba(150,206,192,0.42)");
    sv.addColorStop(0.4, "rgba(118,186,168,0.1)");
    sv.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = sv;
    x.fillRect(0, 0, gr, gr);
    x.restore();
    return r;
  }

  function textScheibe(gr, text) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    scheibenGrund(x, gr, null);
    x.fillStyle = "#ffffff";
    x.font = "800 " + Math.round(gr * (text.length > 2 ? 0.3 : 0.36)) + "px -apple-system, 'Segoe UI', sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, gr / 2, gr / 2 + gr * 0.02);
    return c;
  }

  function bildScheibe(gr, bild) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var r = scheibenGrund(x, gr, null);
    x.save();
    x.beginPath(); x.arc(gr / 2, gr / 2, r * 0.99, 0, 6.2832); x.clip();
    /* Das Seitenverhaeltnis bleibt, wie es ist — dieselbe Regel, die in
       der Liste als object-fit: contain steht. Ein breites Wortlogo in
       ein Quadrat gepresst ist sofort als falsch zu erkennen. */
    var s = gr * 0.62;
    var bw = bild.naturalWidth || bild.width || 1;
    var bh = bild.naturalHeight || bild.height || 1;
    var f = Math.min(s / bw, s / bh);
    try { x.drawImage(bild, (gr - bw * f) / 2, (gr - bh * f) / 2, bw * f, bh * f); } catch (e) {}
    x.restore();
    /* Der Glanz noch einmal OBEN AUF dem Bild — sonst liegt das Logo wie
       ein Aufkleber auf der Kugel statt unter ihrem Glas. */
    var gv = x.createRadialGradient(gr / 2 - r * 0.34, gr / 2 - r * 0.46, 0,
                                    gr / 2 - r * 0.34, gr / 2 - r * 0.46, r * 0.6);
    gv.addColorStop(0, "rgba(255,255,255,0.18)");
    gv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gv;
    x.beginPath(); x.arc(gr / 2, gr / 2, r, 0, 6.2832); x.fill();
    return c;
  }

  /* Die Fetch.ai-Marke, gezeichnet: drei mal drei Felder, Quadrate oben
     links zu Kreisen unten rechts — dieselbe Geometrie wie MARKEN in
     index.html. Die Farben kommen von der Seite; die Werte hier sind nur
     der Boden, falls sie fehlen. */
  function fetScheibe(gr, farben) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m - gr * 0.03;
    var v = x.createRadialGradient(m - r * 0.36, m - r * 0.48, r * 0.05, m, m, r);
    v.addColorStop(0, (farben && farben[0]) || "#3c2fa8");
    v.addColorStop(0.46, (farben && farben[1]) || "#241b78");
    v.addColorStop(1, (farben && farben[2]) || "#141051");
    x.beginPath(); x.arc(m, m, r, 0, 6.2832);
    x.fillStyle = v; x.fill();
    scheibenRand(x, gr, r);

    var s = gr * 0.56, ab = (gr - s) / 2, z = s / 24;
    x.fillStyle = "#fff";
    var q = [[2, 2], [9.5, 2], [17, 2], [2, 9.5], [9.5, 9.5], [2, 17]];
    for (var i = 0; i < q.length; i++) {
      rund(x, ab + q[i][0] * z, ab + q[i][1] * z, 5 * z, z);
    }
    var k = [[19.5, 12], [12, 19.5], [19.5, 19.5]];
    for (var j = 0; j < k.length; j++) {
      x.beginPath();
      x.arc(ab + k[j][0] * z, ab + k[j][1] * z, 2.5 * z, 0, 6.2832);
      x.fill();
    }
    return c;
  }
  function scheibenRand(x, gr, r) {
    var m = gr / 2;
    x.lineWidth = Math.max(1, gr * 0.012);
    var k = x.createLinearGradient(0, 0, 0, gr);
    k.addColorStop(0, "rgba(255,255,255,0.6)");
    k.addColorStop(0.45, "rgba(255,255,255,0.16)");
    k.addColorStop(1, "rgba(0,0,0,0.42)");
    x.strokeStyle = k;
    x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, 6.2832); x.stroke();
    var gv = x.createRadialGradient(m - r * 0.34, m - r * 0.46, 0,
                                    m - r * 0.34, m - r * 0.46, r * 0.55);
    gv.addColorStop(0, "rgba(255,255,255,0.26)");
    gv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gv;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.fill();
  }
  function rund(x, px, py, gr, rx) {
    x.beginPath();
    if (x.roundRect) x.roundRect(px, py, gr, gr, rx);
    else x.rect(px, py, gr, gr);
    x.fill();
  }

  /* Der Kern: die eigene Marke der App, in einer Glutscheibe. Das Bild
     liegt im Vorrat des Service Workers — es ist sofort da. */
  function kernScheibe(gr, bild) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m - gr * 0.03;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832);
    x.fillStyle = "#0d1412"; x.fill();
    if (bild) {
      x.save();
      x.beginPath(); x.arc(m, m, r * 0.99, 0, 6.2832); x.clip();
      try { x.drawImage(bild, m - r, m - r, r * 2, r * 2); } catch (e) {}
      x.restore();
    }
    scheibenRand(x, gr, r);
    return c;
  }

  window.rcpKosmos = function (huelle, wahl) {
    wahl = wahl || {};
    /* Die Zeiten gehoeren der Szene, nicht dem Modul: die Verwaltungsseite
       laesst die Reise von selbst enden, der Auftakt der Liste bestellt
       den Abriss von aussen (bahn: sehr gross, dann ende()) — sein
       Fahrplan gehoert dem Ladebildschirm, nicht der Szene. */
    var bahnDauer = wahl.bahn || DAUER_BAHN;
    var endeDauer = wahl.ende || DAUER_ENDE;
    var leinwand = document.createElement("canvas");
    var g = leinwand.getContext && leinwand.getContext("2d");
    if (!g) {
      /* Ohne Zeichenflaeche gibt es nichts zu zeigen — dann faellt der
         Vorhang SOFORT. Und das Ersatzobjekt traegt ALLE Griffe des
         echten: ein Ersatz, dem abbrechen() fehlt, macht die Notbremse
         der Seite selbst zum TypeError, und der Vorhang bliebe fuer
         immer. */
      if (wahl && typeof wahl.fertig === "function") setTimeout(wahl.fertig, 0);
      return { ende: function () {}, planeten: function () {}, abbrechen: function () {} };
    }
    leinwand.className = "kosmosleinwand";
    leinwand.setAttribute("aria-hidden", "true");
    huelle.appendChild(leinwand);

    /* Zwei Deckel uebereinander: die Pixeldichte (hoechstens 2, die
       Sparschaltung darf sie auf 1 druecken) UND die Gesamtflaeche der
       Leinwand — auf einem 4K-Fenster darf die Dichte auch unter 1
       fallen, weich ist bei einem Auftakt kein Fehler. */
    var dichteDeckel = 2;
    var DPR = 1;
    var B = 0, H = 0, MX = 0, MY = 0, F = 700;
    var grund = null, gg = null, nachher = [];

    var wuerfel = wuerfelWerk(20260825);
    var HIMMEL = himmel(512, wuerfel);
    var KORN = korn(128, wuerfel);
    var GLUT = glut(256, [
      [0, "rgba(228,242,238,0.7)"],
      [0.16, "rgba(166,214,202,0.4)"],
      [0.36, "rgba(100,186,166,0.16)"],
      [0.66, "rgba(56,140,122,0.05)"],
      [1, "rgba(0,0,0,0)"]
    ]);
    var SPINNE = spinne(160);
    var STREIF = streifen(512, 48, "rgba(150,214,196,0.5)");
    var BOKEH = bokeh(96, "150,206,190");
    var BOKEHWARM = bokeh(96, "255,208,158");
    var BLITZ = glut(256, [
      [0, "rgba(255,255,255,0.95)"],
      [0.1, "rgba(228,244,238,0.6)"],
      [0.26, "rgba(178,220,206,0.28)"],
      [0.55, "rgba(110,180,160,0.07)"],
      [1, "rgba(0,0,0,0)"]
    ]);

    function messen(erzwungen) {
      var nb = huelle.clientWidth || window.innerWidth;
      var nh = huelle.clientHeight || window.innerHeight;
      /* Nur bei echter Aenderung — der Browser feuert resize in Serien,
         und jeder Durchlauf hier baut die Grosspuffer neu. Erzwungen wird
         nur von der Sparschaltung, die dieselbe Groesse mit neuer Dichte
         will. */
      if (!erzwungen && nb === B && nh === H && grund) return;
      B = nb; H = nh;
      DPR = Math.min(window.devicePixelRatio || 1, dichteDeckel);
      var deckel = Math.sqrt(4200000 / (B * H));
      if (DPR > deckel) DPR = Math.max(0.5, deckel);
      leinwand.width = Math.round(B * DPR);
      leinwand.height = Math.round(H * DPR);
      leinwand.style.width = B + "px";
      leinwand.style.height = H + "px";
      MX = B / 2; MY = H * 0.46;
      /* Die Brennweite: aus der Schirmhoehe, damit die Gasse auf jedem
         Geraet denselben Bildwinkel hat. Die Orte im Raum sind von der
         Schirmgroesse unabhaengig — ein Drehen des Geraets aendert den
         Blick, nicht die Welt. */
      F = Math.max(B, H) * 0.78;
      grund = tafel(Math.round(B * DPR / 2), Math.round(H * DPR / 2));
      gg = grund.getContext("2d");
      nachher = [];
      var teiler = Math.max(2, Math.sqrt((B * H) / 700000));
      for (var n = 0; n < 3; n++) {
        var t = tafel(Math.round(B / teiler), Math.round(H / teiler));
        var sx = t.getContext("2d");
        var tw = t.width, th = t.height;
        var sv = sx.createRadialGradient(tw / 2, th / 2, Math.min(tw, th) * 0.16,
                                         tw / 2, th / 2, Math.sqrt(tw * tw + th * th) * 0.62);
        sv.addColorStop(0, "rgba(0,0,0,0)");
        sv.addColorStop(0.62, "rgba(0,0,0,0.22)");
        sv.addColorStop(1, "rgba(2,4,4,0.74)");
        sx.fillStyle = sv;
        sx.fillRect(0, 0, tw, th);
        try {
          sx.globalAlpha = 0.09;
          sx.translate(n * 41, n * 27);
          sx.fillStyle = sx.createPattern(KORN, "repeat");
          sx.fillRect(-n * 41, -n * 27, tw, th);
        } catch (e) {}
        nachher.push(t);
      }
    }
    messen();

    var KERN = kernScheibe(220, null);
    if (wahl.kern) {
      var kb = new Image();
      kb.onload = function () { KERN = kernScheibe(220, kb); };
      kb.onerror = function () {};
      kb.src = wahl.kern;
    }

    /* ---- DER RAUM ----

       Masse der Welt (einheitenlos, die Projektion macht Pixel daraus):
       die Gasse beginnt bei TOR und schreitet mit SCHRITT in die Tiefe,
       der Kern wartet ZIEL_ABSTAND hinter der letzten Marke. HELIX ist
       der Radius der Gasse um die Flugachse. */
    var TOR = 1500, SCHRITT = 430, HELIX = 250, ZIEL_ABSTAND = 950;

    /* Die Sterne: echte Orte im Raum, keine Striche auf einer Scheibe.
       Jeder hat Ort, Topf (Farbtemperatur), Grundhelligkeit und sein
       Flimmern; gemalt wird er als Punkt — zum Strich wird er nur, wenn
       seine BILDbewegung schneller ist als die Verschlusszeit. */
    var ANZ = Math.round(klemm((B * H) / 2400, 90, 220));
    var WELTBREIT = Math.max(B, H) * 2.6;
    var sterne = [];
    for (var i = 0; i < ANZ; i++) {
      sterne.push({
        x: (wuerfel() - 0.5) * WELTBREIT,
        y: (wuerfel() - 0.5) * WELTBREIT,
        z: 200 + wuerfel() * 6800,
        h: 0.2 + 0.8 * Math.pow(wuerfel(), 2.3),
        topf: (wuerfel() * 4) | 0,
        fs: 1.6 + wuerfel() * 4.2,
        fp: wuerfel() * 6.2832,
        px: 0, py: 0, war: false
      });
    }
    var TOPF = [
      { farbe: "196,222,213", breit: 1.0 },
      { farbe: "255,255,255", breit: 1.15 },
      { farbe: "255,241,206", breit: 1.05 },
      { farbe: "255,206,158", breit: 0.95 }
    ];

    /* Staub nahe der Linse: wenige grosse, fast unsichtbare Blenden-
       scheiben, die schnell vorbeiziehen — die naechste Tiefenebene vor
       allen anderen. */
    var staub = [];
    for (var st0 = 0; st0 < 8; st0++) {
      staub.push({
        x: (wuerfel() - 0.5) * WELTBREIT * 0.5,
        y: (wuerfel() - 0.5) * WELTBREIT * 0.5,
        z: 120 + wuerfel() * 1400,
        warm: st0 % 3 === 0
      });
    }

    var planeten = [];
    var koerperZahl = 0;
    var vorbeiZahl = 0;
    var zielZ = TOR + 12 * SCHRITT + ZIEL_ABSTAND;

    function planetenSetzen(liste) {
      if (!laeuft || !Array.isArray(liste) || planeten.length) return;
      /* Wie spaet ist es? Eine kalt startende Function kann laenger
         brauchen als die halbe Reise. Wer dann kommt, wird VOR die
         Kamera gestellt — mit den Anfangsorten stuende er schlagartig
         hinter ihr. Und in den Abriss hinein kommt niemand mehr. */
      var jetzt = t0 ? (performance.now() - t0) : 0;
      if (jetzt > abrissAb - 900) return;

      var eintraege = [];
      for (var i = 0; i < liste.length && i < 16; i++) {
        var p = liste[i];
        var sym = String(p.yahoo || p.badge || "").toUpperCase();
        var e = {
          sym: sym,
          gr0: 150 + ((i * 37) % 5) * 16,
          /* UM SICH SELBST: jede Scheibe dreht wie eine Muenze um die
             eigene senkrechte Achse — eigener Anfang, eigenes Tempo,
             abwechselnde Richtung. */
          dreh: (i * 1.7) % 6.2832,
          drehW: (0.3 + ((i * 29) % 10) * 0.04) * (i % 2 ? 1 : -1),
          bild: sym === "FET-USD" ? fetScheibe(96, wahl.farben)
                                  : textScheibe(96, zeichenFuer(sym) || "?")
        };
        /* Dieselbe Vorfahrt wie in der Liste: eine EIGENE Adresse geht
           immer vor. Ohne p.logo fragt fuer Krypto und Rohstoffe niemand
           den Dienst (ohneLogo), Fetch.ai behaelt seine Zeichnung. Und
           es wird GEZAEHLT, denn dieses Laden scheitert still. */
        if (p.logo || (sym && !ohneLogo(sym))) {
          window.rcpKosmosLogos = window.rcpKosmosLogos || { angefragt: 0, geladen: 0 };
          window.rcpKosmosLogos.angefragt++;
          (function (k, quelle) {
            var b = new Image();
            b.onload = function () {
              k.bild = bildScheibe(96, b);
              window.rcpKosmosLogos.geladen++;
            };
            b.onerror = function () {};
            b.src = quelle;
          })(e, p.logo || "/.netlify/functions/logo?sym=" + encodeURIComponent(sym));
        }
        eintraege.push(e);
      }
      koerperZahl = eintraege.length;

      /* DIE GASSE: Doppel-Helix, exakt gleicher Schritt in der Tiefe,
         exakt gleicher Winkelschritt je Strang. KEIN Wuerfeln an den
         Abstaenden — die Staffel ist symmetrisch, weil nichts an ihr
         ungleich sein KANN; Abwechslung kommt aus Groesse, Drehung und
         dem Rad der Helix, nicht aus Unordnung. Kommt die Liste spaet,
         beginnt die Gasse eben vor der jetzigen Kamera. */
      var start = Math.max(TOR, fahrt + 1100);
      for (var bi = 0; bi < eintraege.length; bi++) {
        var e2 = eintraege[bi];
        e2.z = start + bi * SCHRITT;
        e2.strang = bi % 2;
        e2.phi0 = (bi >> 1) * 0.85 + e2.strang * 3.1416;
        e2.vorbei = false;
        planeten.push(e2);
      }
      zielZ = start + 12 * SCHRITT + ZIEL_ABSTAND;
    }

    var laeuft = true, kennung = 0, t0 = 0, vorher = 0;
    /* DIE FAHRT. Ein einziger Wert: wie weit die Kamera in der Tiefe
       ist. Er waechst — immer, nie zurueck. Dazu eine leichte seitliche
       Drift und eine traege Rolle: eine Kamera, die haargenau auf der
       Achse klebt, sieht nach Werkzeug aus, nicht nach Hand. */
    var fahrt = 0, driftX = 0, driftY = 0;
    var sparsam = false, dtSumme = 0, dtZahl = 0;
    var abrissAb = bahnDauer;
    var bildnummer = 0;
    var fertig = typeof wahl.fertig === "function" ? wahl.fertig : function () {};

    /* Die Spur fuer die Nachschau — auf einer Leinwand gibt es sonst
       nichts zu befragen. Je Bild:
       [0] Zeit  [1] Koerperzahl  [2] Fahrt (Tiefe der Kamera)
       [3] wie viele Marken schon an der Kamera vorbeigezogen sind
       [4] Bilddauer  [5] groesste gemalte Marke in Pixeln
       [6] Eigendrehung der ersten Marke  [7] groesste Abweichung der
       Tiefenschritte vom Sollschritt (Symmetrie der Gasse, tausendstel) */
    var spur = [];
    window.rcpKosmosSpur = spur;

    function bild(jetzt) {
      if (!laeuft) return;
      if (!t0) { t0 = jetzt; vorher = jetzt; }
      var t = jetzt - t0;
      var dt = klemm(jetzt - vorher, 0, 64);
      vorher = jetzt;
      if (t >= abrissAb + endeDauer) {
        laeuft = false;
        aufraeumen();
        fertig();
        return;
      }

      if (!sparsam && t > 400 && t < 2600) {
        dtSumme += dt; dtZahl++;
        if (dtZahl >= 24) {
          if (dtSumme / dtZahl > 34) {
            sparsam = true;
            sterne.length = Math.floor(sterne.length / 2);
            staub.length = 0;
            if (DPR > 1) { dichteDeckel = 1; messen(true); }
          }
          dtSumme = 0; dtZahl = 0;
        }
      }

      var abriss = klemm((t - abrissAb) / endeDauer, 0, 1);
      var blenden = glatt(0, 500, t);

      /* Die Fahrt: sanfter Anlauf, dann Reisegeschwindigkeit — bemessen
         so, dass die Gasse bis zum geplanten Abriss durchflogen ist.
         Beim Abriss zieht sie hinein in den Kern. Die Liste bestellt
         ihren Abriss frueher, als die Reise geplant war: dann reisst
         die Fahrt eben mitten aus der Gasse — auch das ist ein Ende. */
      var reiseZeit = klemm(bahnDauer, 3600, 5600);
      var V = (zielZ - 550) / (reiseZeit - 600);
      var v = V * glatt(120, 950, t) * (1 + 7 * abriss * abriss);
      fahrt += v * dt;
      driftX += 0.010 * glatt(500, 2200, t) * (1 - abriss) * dt;
      driftY -= 0.006 * glatt(500, 2200, t) * (1 - abriss) * dt;
      var camX = klemm(driftX, -55, 55);
      var camY = klemm(driftY, -40, 40);
      var roll = -0.035 + 0.065 * Math.min(1, t / 5600);
      /* Das Rad der Helix: die ganze Gasse dreht traege um die Achse
         weiter — langsam genug, dass man es nicht benennen kann. */
      var rad = t * 0.00013;

      /* Der Himmel in halber Aufloesung, zwei Lagen. Er ist das Ferne:
         er rollt mit der Kamera und atmet mit der Fahrt nur wenig —
         Parallaxe entsteht dadurch, dass ALLES ANDERE staerker zieht. */
      var hzoom = 1 + 0.10 * Math.min(1, fahrt / (zielZ || 1));
      gg.setTransform(DPR / 2, 0, 0, DPR / 2, 0, 0);
      gg.globalCompositeOperation = "source-over";
      gg.globalAlpha = 1;
      gg.fillStyle = "#0a0d0c";
      gg.fillRect(0, 0, B, H);
      gg.translate(MX, MY);
      gg.rotate(roll);
      gg.globalCompositeOperation = "lighter";
      var s1 = Math.max(B, H) * 1.5 * hzoom;
      var s2 = Math.max(B, H) * 2.1 * hzoom;
      gg.globalAlpha = 0.85;
      gg.drawImage(HIMMEL, -s1 / 2 - camX * 0.6, -s1 / 2 - camY * 0.6, s1, s1);
      gg.globalAlpha = 0.45;
      gg.drawImage(HIMMEL, -s2 / 2 - camX * 0.25, -s2 / 2 - camY * 0.25, s2, s2);

      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, B, H);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = blenden;
      g.drawImage(grund, 0, 0, B, H);

      /* ---- Die Sterne ---- */
      g.globalCompositeOperation = "lighter";
      var punkte = [[], [], [], []];
      var striche = [[], [], [], []];
      var funken = [];
      for (var si = 0; si < sterne.length; si++) {
        var s = sterne[si];
        var z2 = s.z - fahrt;
        if (z2 < 130) {
          s.z += 6800 + wuerfel() * 1600;
          s.x = (wuerfel() - 0.5) * WELTBREIT;
          s.y = (wuerfel() - 0.5) * WELTBREIT;
          s.war = false;
          continue;
        }
        var f2 = F / z2;
        var sx2 = MX + (s.x - camX) * f2;
        var sy2 = MY + (s.y - camY) * f2;
        if (sx2 < -30 || sx2 > B + 30 || sy2 < -30 || sy2 > H + 30) { s.war = false; continue; }
        var tiefe = klemm((6200 - z2) / 4600, 0, 1);
        var hell = s.h * tiefe *
          (0.78 + 0.22 * Math.sin(t * 0.001 * s.fs + s.fp));
        if (hell <= 0.02) { s.war = false; continue; }
        /* Verschlusszeit: der Strich ist die eigene Bildbewegung seit
           dem letzten Bild — im Reisegang sind das wenige Pixel (ein
           Punkt), erst der Sog des Abrisses streckt die nahen Sterne
           zu Linien. */
        var zog = s.war ? Math.sqrt((sx2 - s.px) * (sx2 - s.px) + (sy2 - s.py) * (sy2 - s.py)) : 0;
        if (s.war && zog > 3.2 && zog < 400) {
          striche[s.topf].push(s.px, s.py, sx2, sy2, hell);
        } else {
          punkte[s.topf].push(sx2, sy2, hell, klemm(f2 * 260, 0.5, 1.9));
          if (hell > 0.66 && !sparsam) funken.push(sx2, sy2, hell);
        }
        s.px = sx2; s.py = sy2; s.war = true;
      }
      g.lineCap = "round";
      for (var k = 0; k < TOPF.length; k++) {
        var art = TOPF[k];
        var sl = striche[k];
        for (var stq = 0; stq < 3; stq++) {
          var leer = true;
          for (var j = 0; j < sl.length; j += 5) {
            if (Math.min(2, (sl[j + 4] * 3) | 0) !== stq) continue;
            if (leer) { g.beginPath(); leer = false; }
            g.moveTo(sl[j], sl[j + 1]);
            g.lineTo(sl[j + 2], sl[j + 3]);
          }
          if (leer) continue;
          g.lineWidth = art.breit;
          g.strokeStyle = "rgba(" + art.farbe + "," + (blenden * (0.2 + stq * 0.26)).toFixed(3) + ")";
          g.stroke();
        }
        var pl = punkte[k];
        for (var stp = 0; stp < 3; stp++) {
          var leer2 = true;
          for (var j2 = 0; j2 < pl.length; j2 += 4) {
            if (Math.min(2, (pl[j2 + 2] * 3) | 0) !== stp) continue;
            if (leer2) { g.beginPath(); leer2 = false; }
            var pr = art.breit * pl[j2 + 3] * (0.5 + 0.6 * pl[j2 + 2]);
            g.moveTo(pl[j2] + pr, pl[j2 + 1]);
            g.arc(pl[j2], pl[j2 + 1], pr, 0, 6.2832);
          }
          if (leer2) continue;
          g.fillStyle = "rgba(" + art.farbe + "," + (blenden * (0.3 + stp * 0.28)).toFixed(3) + ")";
          g.fill();
        }
      }
      /* Das weiche Glimmen der hellen Punkte — der Unterschied zwischen
         Pixeln und Sternen. */
      for (var fu = 0; fu < funken.length; fu += 3) {
        var fh = funken[fu + 2];
        g.globalAlpha = blenden * (fh - 0.55) * 0.8;
        var fgr = 5 + 8 * fh;
        g.drawImage(GLUT, funken[fu] - fgr / 2, funken[fu + 1] - fgr / 2, fgr, fgr);
      }
      g.globalAlpha = 1;

      /* ---- Die Gasse und der Kern, nach Tiefe sortiert ---- */
      var reihe = [];
      for (var pi = 0; pi < planeten.length; pi++) {
        var kp = planeten[pi];
        /* Die Drehung gehoert zur Physik, nicht zum Malen: sie laeuft
           fuer JEDEN Koerper weiter, auch fern im Nebel und hinter der
           Kamera — sonst friert die erste Marke ein, sobald sie
           vorbeigezogen ist, und die Nachschau misst einen toten Wert. */
        kp.dreh += kp.drehW * (1 + 2 * abriss) * dt * 0.001;
        var kz = kp.z - fahrt;
        if (kz < 70) {
          if (!kp.vorbei) { kp.vorbei = true; vorbeiZahl++; }
          continue;
        }
        if (kz > 5600) continue;
        kp.kz = kz;
        reihe.push(kp);
      }
      var kernZ = zielZ - fahrt;
      var kernDran = kernZ > 70;
      reihe.sort(function (a, b) { return b.kz - a.kz; });

      var maxGemalt = 0;

      function kernMalen() {
        var kf = F / kernZ;
        var kx = MX + (0 - camX) * kf;
        var ky = MY + (0 - camY) * kf;
        var kg = klemm(300 * kf, 8, Math.min(B, H) * 1.4);
        var kd = blenden * klemm((6400 - kernZ) / 3800, 0, 1);
        var puls = 1 + 0.03 * Math.sin(t * 0.0021);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = kd * 0.8;
        var gg2 = kg * 3.2 * puls;
        g.drawImage(GLUT, kx - gg2 / 2, ky - gg2 / 2, gg2, gg2);
        g.globalAlpha = kd * 0.3;
        var bb = kg * 6 * (0.7 + 0.3 * puls);
        g.drawImage(STREIF, kx - bb / 2, ky - kg * 0.16, bb, kg * 0.32);
        if (kg > 14) {
          g.globalAlpha = kd;
          g.globalCompositeOperation = "source-over";
          g.drawImage(KERN, kx - kg / 2, ky - kg / 2, kg, kg);
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = kd * 0.4;
          var sg = kg * 2.2;
          g.drawImage(SPINNE, kx - sg / 2, ky - sg / 2, sg, sg);
        }
        g.globalAlpha = 1;
      }

      for (var ri = 0; ri < reihe.length; ri++) {
        var kp2 = reihe[ri];
        /* Der Kern steht hinter der Gasse; sobald die Reihe an ihm
           vorbei ist, wird er gemalt — einmal, an seinem Platz in der
           Tiefe. */
        if (kernDran && kernZ >= kp2.kz) { kernMalen(); kernDran = false; }
        var phi = kp2.phi0 + rad;
        var wx = Math.cos(phi) * HELIX * 0.9;
        var wy = Math.sin(phi) * HELIX;
        var f3 = F / kp2.kz;
        var px3 = MX + (wx - camX) * f3;
        var py3 = MY + (wy - camY) * f3;
        var gr = kp2.gr0 * f3;
        if (gr > Math.min(B, H) * 1.2) gr = Math.min(B, H) * 1.2;
        /* Das Licht der Tiefe: fern im Nebel schwach, nah voll — und
           GANZ nah loest die Scheibe sich auf, statt hart am Bildrand
           zu zerreissen: die Kamera fliegt durch sie hindurch. */
        var fern = klemm((5200 - kp2.kz) / 3300, 0, 1);
        var nah = klemm((kp2.kz - 90) / 200, 0, 1);
        var deck = blenden * Math.pow(fern, 0.85) * nah;
        if (deck <= 0.01) continue;
        if (gr > maxGemalt && deck > 0.2) maxGemalt = gr;

                /* Ein Hauch Glimmen — das grosse Licht gehoert dem Kern. */
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = deck * 0.3;
        var lg = gr * 1.7;
        g.drawImage(GLUT, px3 - lg / 2, py3 - lg / 2, lg, lg);

        /* Die Muenzdrehung: die Breite ist der Kosinus des eigenen
           Drehwinkels, nie ganz null, und an der Kante wird sie dunkler.
           Der Betrag statt des Vorzeichens: gezeigt wird immer das
           Gesicht, wie bei einem Schild im Wind. */
        var quer = Math.abs(Math.cos(kp2.dreh));
        var schmal = gr * Math.max(0.16, quer);
        g.globalAlpha = deck * (0.55 + 0.45 * quer);
        g.globalCompositeOperation = "source-over";
        g.drawImage(kp2.bild, px3 - schmal / 2, py3 - gr / 2, schmal, gr);
        g.globalAlpha = 1;
      }
      if (kernDran) kernMalen();

      /* ---- Der Staub nahe der Linse ---- */
      for (var di = 0; di < staub.length; di++) {
        var db = staub[di];
        var dz = db.z - fahrt;
        if (dz < 60) {
          db.z += 1500 + wuerfel() * 700;
          db.x = (wuerfel() - 0.5) * WELTBREIT * 0.5;
          db.y = (wuerfel() - 0.5) * WELTBREIT * 0.5;
          dz = db.z - fahrt;
        }
        var df = F / dz;
        var dgr = klemm(600 * df, 20, 260);
        g.globalAlpha = blenden * 0.05 * klemm((1600 - dz) / 1300, 0, 1);
        g.globalCompositeOperation = "lighter";
        g.drawImage(db.warm ? BOKEHWARM : BOKEH,
          MX + (db.x - camX) * df - dgr / 2, MY + (db.y - camY) * df - dgr / 2, dgr, dgr);
      }
      g.globalAlpha = 1;

      /* Der Blitz der Ankunft. */
      if (abriss > 0) {
        var hell2 = Math.pow(Math.sin(Math.min(1, abriss * 1.6) * 3.1416), 2);
        if (hell2 > 0.004) {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = hell2 * blenden;
          var bg = Math.max(B, H) * 2.4;
          g.drawImage(BLITZ, MX - bg / 2, MY - bg / 2, bg, bg);
          g.globalAlpha = 1;
        }
      }

      /* Nachbereitung: Randabdunklung und Korn in einem Zug. */
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = blenden;
      if (nachher.length) {
        g.drawImage(nachher[(bildnummer++) % nachher.length], 0, 0, B, H);
      }
      g.globalAlpha = 1;

      if (spur.length < 600) {
        /* [7]: die Symmetrie der Gasse, gemessen statt behauptet — die
           groesste Abweichung der Tiefenschritte vom Sollschritt. Sie
           ist aus Bauart null; stuende hier je etwas anderes, hat
           jemand an den Orten gewuerfelt. */
        var symAbw = 0;
        for (var sp = 1; sp < planeten.length; sp++) {
          var luecke = Math.abs((planeten[sp].z - planeten[sp - 1].z) - SCHRITT);
          if (luecke > symAbw) symAbw = luecke;
        }
        var ersterK = planeten[0];
        spur.push([Math.round(t), koerperZahl,
          Math.round(fahrt),
          vorbeiZahl,
          Math.round(dt * 10) / 10,
          Math.round(maxGemalt),
          ersterK ? Math.round(ersterK.dreh * 100) / 100 : 0,
          Math.round(symAbw * 1000)]);
      }

      kennung = window.requestAnimationFrame(bild);
    }

    if (wahl.positionen) planetenSetzen(wahl.positionen);

    function aufraeumen() {
      if (kennung) window.cancelAnimationFrame(kennung);
      kennung = 0;
      window.removeEventListener("resize", messen);
    }

    window.addEventListener("resize", messen);
    kennung = window.requestAnimationFrame(bild);

    return {
      planeten: planetenSetzen,
      /* Zum Abriss springen — der Tipp des Ungeduldigen. Fruehestens ab
         Sekunde eins, sonst nimmt ein versehentliches Tippen beim
         Oeffnen die ganze Szene mit. */
      ende: function () {
        if (!laeuft || !t0) return;
        var t = performance.now() - t0;
        if (t < 1000) return;
        if (t < abrissAb) abrissAb = t;
      },
      abbrechen: function () { laeuft = false; aufraeumen(); }
    };
  };
})();
