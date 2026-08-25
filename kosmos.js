/* DER KOSMOS — der Auftakt der Verwaltung.

   Alle Marken der Liste als Koerper im Universum: sie ziehen auf gekippten
   Bahnen um einen Kern, kommen einzeln aus der Tiefe herein, laufen
   voreinander vorbei und hintereinander her, und am Ende reisst die ganze
   Formation nach aussen ab, waehrend die Kamera durch das Sternenfeld
   stoesst.

   WARUM EINE EIGENE DATEI, UND WARUM SIE stern.js AEHNELT

   Das Handwerkszeug — Himmel in halber Aufloesung, Sterne als Striche,
   Blende, Korn, Randabdunklung — ist dasselbe wie in stern.js, und es ist
   BEWUSST KOPIERT statt geteilt. Zwei Szenen auf zwei Seiten, jede mit
   eigener Fassungsnummer: eine gemeinsame dritte Datei muessten beide
   kennen und beide zugleich wechseln, und genau an so einer Kopplung ist
   hier schon einmal etwas auseinandergelaufen. Was in stern.js an Lehren
   steht (kein Anstrich je Bild, Ebenen hoechstens anderthalb Schirme,
   Pixeldichte gedeckelt), gilt hier unveraendert.

   Geladen wird die Datei nur von der Verwaltung — fuer alle anderen
   kostet sie kein Byte.

   DIE DRAMATURGIE, in vier Saetzen:

     0,0 - 0,9   Der Raum blendet auf, der Kern kommt aus der Tiefe.
     0,5 - 2,4   Die Marken fliegen einzeln herein, jede auf ihre Bahn.
     2,4 - 4,6   Das Uhrwerk: innen schnell, aussen langsam, die Koerper
                 laufen voreinander und hintereinander vorbei.
     4,6 - 5,8   Der Abriss: die Bahnen weiten sich, alles streckt sich
                 zu Strichen, ein Blitz — und die Seite liegt frei.

   Ein Tipp irgendwohin springt zum Abriss: ein Auftakt, den man nicht
   abkuerzen kann, ist beim zwanzigsten Besuch eine Strafe. Die Flaeche
   selbst faengt dafuer nichts ab (pointer-events: none) — der Tipp
   erreicht die Seite darunter trotzdem, gehorcht also beiden. */
(function () {
  "use strict";

  var DAUER_BAHN = 4600;   /* bis hierhin laeuft das Uhrwerk             */
  var DAUER_ENDE = 1200;   /* der Abriss                                 */

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

  /* Die Beugungsspinne fuer den Kern: zwei lange Arme, zwei kurze schraeg.
     Eine gleichmaessige Spinne sieht gezeichnet aus, eine ungleiche wie
     Optik. */
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
      v.addColorStop(0, "rgba(190,214,255,0)");
      v.addColorStop(0.34, "rgba(214,232,255,0.34)");
      v.addColorStop(0.5, "rgba(255,255,255,0.85)");
      v.addColorStop(0.66, "rgba(214,232,255,0.34)");
      v.addColorStop(1, "rgba(190,214,255,0)");
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

  /* Ein unscharfer Lichtpunkt im Vordergrund: eine Scheibe mit hellerem
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
     Aufloesung benutzt — Nebel IST unscharf. */
  function himmel(gr, wuerfel) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    x.fillStyle = "#050808";
    x.fillRect(0, 0, gr, gr);

    /* DIE FARBEN DER APP, nicht irgendein Weltraum: die drei Lichtfelder
       unter jeder Seite sind Stahlblau (64,108,138), Bronze (126,96,62)
       und Flieder (78,62,104). Der Nebel nimmt genau diese drei Toene,
       nur kraeftiger — je zwei Stufen pro Ton. Vorher stand hier die
       Palette aus stern.js, und die war blauer und kuehler als die App;
       "Universum passend zur App" heisst: dieselben Felder, nur am
       Himmel. */
    var toene = [
      [76, 130, 168], [58, 100, 130],
      [158, 120, 76], [126, 96, 62],
      [112, 90, 152], [84, 68, 116]
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
      dv.addColorStop(0, "rgba(4,7,7," + da.toFixed(3) + ")");
      dv.addColorStop(1, "rgba(4,7,7,0)");
      x.fillStyle = dv;
      x.fillRect(dx - rr, dy - rr, rr * 2, rr * 2);
    }
    x.globalCompositeOperation = "lighter";
    for (var s = 0; s < 150; s++) {
      var sr = 0.8 + wuerfel() * wuerfel() * 2.2;
      var sa = 0.08 + wuerfel() * 0.2;
      x.fillStyle = "rgba(" + (196 + ((wuerfel() * 50) | 0)) + ",220,255," + sa.toFixed(3) + ")";
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
     Start, dieselben Bahnen — sonst waere keine Pruefaufnahme mit der
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
      var v = x.createRadialGradient(m - r * 0.36, m - r * 0.48, r * 0.05, m, m, r);
      v.addColorStop(0, "rgba(96,110,126,0.98)");
      v.addColorStop(0.5, "rgba(52,62,74,0.98)");
      v.addColorStop(1, "rgba(24,31,40,0.98)");
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
    sv.addColorStop(0, "rgba(150,196,255,0.42)");
    sv.addColorStop(0.4, "rgba(120,170,255,0.1)");
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
    /* Mit dem vollen Glasgrund, nicht mit einer flachen dunklen Scheibe:
       die war auf dem dunklen Himmel unsichtbar, und die Logos schwebten
       als nackte Vierecke im Raum. Der Ring macht aus dem Bild einen
       Koerper — dieselbe Fassung, in der jedes Logo auch in der Liste
       sitzt. */
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
     index.html, hier als Pfade statt als SVG, weil auf einer Leinwand
     ohnehin gezeichnet wird. Die Farben kommen von der Seite (die liest
     sie aus den Marken in ihrem Regelwerk); die Werte hier sind nur der
     Boden, falls sie fehlen. */
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
    x.fillStyle = "#0d1116"; x.fill();
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
    var leinwand = document.createElement("canvas");
    var g = leinwand.getContext && leinwand.getContext("2d");
    if (!g) {
      /* Ohne Zeichenflaeche gibt es nichts zu zeigen — dann faellt der
         Vorhang SOFORT, statt zehn Sekunden schwarz zu stehen. Und das
         Ersatzobjekt traegt ALLE Griffe des echten: die Notbremse der
         Seite ruft abbrechen() ungesehen auf, und ein Ersatz, dem ein
         Griff fehlt, verwandelt genau den Rettungsweg in einen TypeError
         — der Vorhang bliebe fuer immer. Der Gegenpruefung ins Netz
         gegangen, bevor es jemand erlebt hat. */
      if (wahl && typeof wahl.fertig === "function") setTimeout(wahl.fertig, 0);
      return { ende: function () {}, planeten: function () {}, abbrechen: function () {} };
    }
    leinwand.className = "kosmosleinwand";
    leinwand.setAttribute("aria-hidden", "true");
    huelle.appendChild(leinwand);

    /* Pixeldichte gedeckelt — und auf einem grossen Fenster (die
       Verwaltung laeuft auch am Schreibtisch) faellt sie auf eins, bevor
       die Leinwand in zweistellige Megabyte waechst. */
    /* Zwei Deckel uebereinander: die Pixeldichte (hoechstens 2, die
       Sparschaltung darf sie auf 1 druecken) UND die Gesamtflaeche der
       Leinwand. Der zweite fehlte zuerst — auf einem 4K-Fenster war die
       Dichte laengst bei 1 und die Leinwand trotzdem 33 Megabyte. Die
       Dichte darf dafuer unter 1 fallen; die Flaeche wird dann vom
       Anstrich hochgezogen, und weich ist bei einem Auftakt kein Fehler. */
    var dichteDeckel = 2;
    var DPR = 1;
    var B = 0, H = 0, MX = 0, MY = 0, WEIT = 0;
    var grund = null, gg = null, nachher = [];

    var wuerfel = wuerfelWerk(20260820);
    var HIMMEL = himmel(512, wuerfel);
    var KORN = korn(128, wuerfel);
    var GLUT = glut(256, [
      [0, "rgba(226,236,255,0.7)"],
      [0.16, "rgba(168,190,255,0.4)"],
      [0.36, "rgba(112,132,250,0.16)"],
      [0.66, "rgba(72,96,220,0.05)"],
      [1, "rgba(0,0,0,0)"]
    ]);
    var SPINNE = spinne(160);
    var STREIF = streifen(512, 48, "rgba(150,200,255,0.5)");
    var BOKEH = bokeh(96, "150,186,255");
    var BOKEHWARM = bokeh(96, "255,208,158");
    var BLITZ = glut(256, [
      [0, "rgba(255,255,255,0.95)"],
      [0.1, "rgba(226,238,255,0.6)"],
      [0.26, "rgba(180,204,255,0.28)"],
      [0.55, "rgba(120,150,255,0.07)"],
      [1, "rgba(0,0,0,0)"]
    ]);

    function bahnenMasse() {
      return { innen: Math.min(B, H) * 0.22, aussen: Math.min(B * 0.47, H * 0.32) };
    }

    function messen(erzwungen) {
      var nb = huelle.clientWidth || window.innerWidth;
      var nh = huelle.clientHeight || window.innerHeight;
      /* Nur bei echter Aenderung — der Browser feuert resize in Serien
         (iOS-Leisten, Fenster ziehen), und jeder Durchlauf hier baut die
         Grosspuffer neu. Erzwungen wird nur von der Sparschaltung, die
         dieselbe Groesse mit neuer Dichte will. */
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
      WEIT = Math.sqrt(B * B + H * H) * 0.62;
      grund = tafel(Math.round(B * DPR / 2), Math.round(H * DPR / 2));
      gg = grund.getContext("2d");
      nachher = [];
      /* Auch die Nachbereitung ist gedeckelt: auf einem grossen Fenster
         waeren drei Kacheln in halber Groesse zusammen teurer als die
         Leinwand selbst. Grober aufgezogenes Korn ist dort nicht zu
         unterscheiden. */
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
      /* Die Bahnen ziehen mit: sie sind als Anteil gemerkt, nicht als
         Pixel — sonst laege nach einem Drehen des Geraets die aeusserste
         Bahn ausserhalb des Bildes, waehrend Kern und Mitte laengst auf
         die neue Mitte gewechselt haben. */
      /* planeten ist zur ERSTEN Messung noch nicht zugewiesen — messen()
         laeuft beim Aufbau, die Zuweisung steht weiter unten, und var
         hoisted nur den Namen, nicht den Wert. Ohne diese Pruefung stand
         hier "undefined.length", und die ganze Szene starb im Aufbau —
         dieselbe Falle wie einst var bild in stern.js, nur andersherum. */
      if (planeten) {
        var bm = bahnenMasse();
        for (var pi = 0; pi < planeten.length; pi++) {
          planeten[pi].r = bm.innen + (bm.aussen - bm.innen) * planeten[pi].fak;
        }
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

    /* Das Strichfeld: waehrend des Uhrwerks eine langsame Fahrt, beim
       Abriss der Sog. Bewusst duenner als in stern.js — die Koerper sollen
       das Bild tragen, nicht das Feld. */
    var ANZ = Math.round(klemm((B * H) / 1800, 120, 280));
    var sterne = [];
    for (var i = 0; i < ANZ; i++) {
      var fern = wuerfel();
      sterne.push({
        w: wuerfel() * 6.2832,
        d: 8 + WEIT * Math.sqrt(wuerfel()),
        v: fern < 0.34 ? 0.06 + wuerfel() * 0.16
          : (fern < 0.82 ? 0.3 + wuerfel() * 0.55 : 0.95 + wuerfel() * 0.75),
        h: 0.2 + 0.8 * Math.pow(wuerfel(), 2.3),
        topf: (wuerfel() * 4) | 0,
        fs: 1.6 + wuerfel() * 4.2,
        fp: wuerfel() * 6.2832
      });
    }
    var TOPF = [
      { farbe: "199,216,255", breit: 1.0 },
      { farbe: "255,255,255", breit: 1.15 },
      { farbe: "255,241,206", breit: 1.05 },
      { farbe: "255,206,158", breit: 0.95 }
    ];

    /* ---- DAS UHRWERK ----

       Jeder Koerper auf einer gekippten Ellipse um den Kern. Die Bahnen
       liegen wie eine Galaxie im Bild: senkrecht auf ein Drittel
       gestaucht, als Ganzes gedreht. Die Tiefe kommt aus dem Winkel —
       wer auf der oberen Haelfte der Bahn laeuft, ist hinten: kleiner,
       dunkler, und er wird VOR dem Kern gemalt, damit der ihn verdeckt.

       Innen schnell, aussen langsam, wie es sich gehoert (Kepler: die
       Umlaufzeit waechst mit r hoch anderthalb). Ohne diese Staffelung
       dreht sich das Ganze wie ein Teller — starr, und starr ist billig. */
    var KIPPE = -0.4;
    var QUETSCH = 0.34;
    /* Die Kippung ist nicht fest: das ganze Uhrwerk praezediert, langsam
       genug, dass man es nicht benennen kann, und schnell genug, dass die
       Formation nie zweimal gleich steht. Ein starr ausgerichtetes System
       sieht aus wie ein Schaubild; eines, das sich unmerklich weiterdreht,
       wie ein Ding im Raum. */
    var kippeAkt = KIPPE;
    var KO = Math.cos(KIPPE), SI = Math.sin(KIPPE);
    var planeten = [];

    var koerperZahl = 0;

    function planetenSetzen(liste) {
      if (!laeuft || !Array.isArray(liste) || planeten.length) return;
      /* Wie spaet ist es? Eine kalt startende Function kann laenger
         brauchen als das halbe Uhrwerk. Wer dann kommt, fliegt AB JETZT
         gestaffelt ein — mit festen Zeiten aus der Anfangsplanung stuende
         er schlagartig im Bild. Und in den Abriss hinein kommt niemand
         mehr: eine Formation, die waehrend der Explosion antritt, ist
         Unfug. */
      var jetzt = t0 ? (performance.now() - t0) : 0;
      if (jetzt > abrissAb - 900) return;

      /* Erst die Scheiben, dann die Bahnen: wer wo laeuft, entscheidet
         sich erst, wenn feststeht, wie viele HAUPTkoerper es gibt. */
      var eintraege = [];
      for (var i = 0; i < liste.length && i < 16; i++) {
        var p = liste[i];
        var sym = String(p.yahoo || p.badge || "").toUpperCase();
        var e = {
          sym: sym,
          gr: 19 + ((i * 37) % 7),
          /* Fetch.ai bringt seine gezeichnete Marke mit, alle anderen ihr
             Kuerzel — bis das Bild da ist. */
          bild: sym === "FET-USD" ? fetScheibe(96, wahl.farben)
                                  : textScheibe(96, zeichenFuer(sym) || "?")
        };
        /* Dieselbe Vorfahrt wie in der Liste: eine EIGENE Adresse geht
           immer vor, auch bei einer gezeichneten Marke — die Regel steht
           woertlich an logoNeben. Ohne p.logo fragt fuer Krypto und
           Rohstoffe niemand den Dienst (ohneLogo), Fetch.ai behaelt dann
           seine Zeichnung. */
        if (p.logo || (sym && !ohneLogo(sym))) {
          /* Das Original zuerst: die eigene Adresse der Position, sonst der
             Logo-Dienst — dieselbe Kette wie an den Karten der Liste. Bis
             das Bild da ist, traegt die Scheibe das Kuerzel; danach wird
             die Vorlage getauscht, das naechste Bild malt das Logo.

             Und es wird GEZAEHLT, denn dieses Laden scheitert still: auf
             einem Prueftisch ohne fremde Hosts saehe eine Szene voller
             Kuerzel genauso aus wie eine mit kaputtem Bildweg. */
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

      /* DREHEN UM DIE ANDEREN, woertlich: jede vierte Marke wird zum MOND
         der Marke davor — kleiner, schnell, auf einer eigenen kleinen
         Bahn um ihren Traeger, mit eigener Tiefe: sie verschwindet hinter
         ihm und kommt auf der anderen Seite wieder hervor.

         Nur Fetch.ai nicht. Ihre gezeichnete Marke ist das eine Zeichen,
         das die App selbst gebaut hat — als Trabant einer anderen waere
         sie Beiwerk. */
      var monde = [];
      var haupt = [];
      for (var j = 0; j < eintraege.length; j++) {
        var ej = eintraege[j];
        if (j % 4 === 3 && ej.sym !== "FET-USD" && haupt.length) {
          ej.gr = Math.round(ej.gr * 0.55);
          monde.push({ e: ej, traeger: haupt[haupt.length - 1] });
        } else {
          haupt.push(ej);
        }
      }

      var bm = bahnenMasse();
      var n = Math.max(2, haupt.length);
      for (var k2 = 0; k2 < haupt.length; k2++) {
        var h2 = haupt[k2];
        h2.fak = k2 / (n - 1);
        h2.r = bm.innen + (bm.aussen - bm.innen) * h2.fak;
        /* Der goldene Winkel verteilt die Anfaenge so, dass nie zwei
           Nachbarn beieinander starten. */
        h2.a = k2 * 2.39996 + 0.7;
        /* Kepler, auf eine Sichtbarkeit skaliert: innen rund eine
           Umdrehung waehrend des Uhrwerks, aussen eine halbe. */
        h2.w = 1.45 * Math.pow(bm.innen / h2.r, 1.5);
        h2.ab = Math.max(500, jetzt + 80) + k2 * 140;
        planeten.push(h2);
      }
      for (var k3 = 0; k3 < monde.length; k3++) {
        var m3 = monde[k3];
        m3.traeger.mond = {
          e: m3.e,
          a: k3 * 2.1 + 0.4,
          /* Deutlich schneller als jede Hauptbahn — ein Mond, der so
             langsam laeuft wie sein Traeger, sieht angeklebt aus. */
          w: 3.4 + k3 * 0.55,
          r: m3.traeger.gr * 2.5
        };
      }
    }
    if (wahl.positionen) planetenSetzen(wahl.positionen);

    function ort(k) {
      var c = Math.cos(k.a), s = Math.sin(k.a);
      var ex = k.rAkt * c, ey = k.rAkt * s * QUETSCH;
      return {
        x: MX + ex * KO - ey * SI,
        y: MY + ex * SI + ey * KO,
        z: s
      };
    }

    var laeuft = true, kennung = 0, t0 = 0, vorher = 0, gefahren = 0, himmelFahrt = 0;
    /* DIE SPARSCHALTUNG. Die Szene misst ihre eigenen Bilder, und wenn das
       Geraet nicht hinterherkommt (Mittel der letzten Bilder ueber 34 ms),
       opfert sie zuerst, was am wenigsten fehlt: das halbe Strichfeld, die
       Bahnringe, die unscharfen Punkte. Ein Auftakt, der ruckelt, ist
       schlechter als einer, der etwas weniger zeigt — und niemand zaehlt
       waehrend einer Kamerafahrt die Sterne. */
    var sparsam = false, dtSumme = 0, dtZahl = 0;
    var abrissAb = DAUER_BAHN;
    var bildnummer = 0;
    var fertig = typeof wahl.fertig === "function" ? wahl.fertig : function () {};

    /* Die Spur fuer die Nachschau — auf einer Leinwand gibt es sonst
       nichts zu befragen. Je Bild: Zeit, Koerperzahl, Winkel und Tiefe
       des innersten Koerpers, Bilddauer. */
    var spur = [];
    window.rcpKosmosSpur = spur;

    function bild(jetzt) {
      if (!laeuft) return;
      if (!t0) { t0 = jetzt; vorher = jetzt; }
      var t = jetzt - t0;
      var dt = klemm(jetzt - vorher, 0, 64);
      vorher = jetzt;
      if (t >= abrissAb + DAUER_ENDE) {
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
            /* Der grosse Hebel: die Pixeldichte. Von 2 auf 1 ist ein
               Viertel der Punkte — auf einem Telefon, das hier angekommen
               ist, faellt das dem Auge weniger auf als jeder Ruckler. */
            if (DPR > 1) { dichteDeckel = 1; messen(true); }
          }
          dtSumme = 0; dtZahl = 0;
        }
      }

      var abriss = klemm((t - abrissAb) / DAUER_ENDE, 0, 1);
      kippeAkt = KIPPE + t * 0.000016;
      KO = Math.cos(kippeAkt);
      SI = Math.sin(kippeAkt);
      var blenden = glatt(0, 500, t);
      var tempo = 0.5 + 15 * abriss * abriss;
      gefahren += tempo * dt * 0.001;
      /* Der Himmel faehrt mit eigener, GEDECKELTER Geschwindigkeit. Beim
         ersten Anlauf schob der Abriss auch ihn an — und die eine grosse
         Kachel rutschte so weit, dass ihre Kante ins Bild kam: oben links
         stand ein heller Keil, der kein Nebel war, sondern der Rand des
         Bildes. Das Feld darf rasen, der Nebel dahinter nicht. */
      himmelFahrt += klemm(tempo, 0, 1.6) * dt * 0.001;

      if (spur.length < 600) {
        var erster = planeten[0];
        spur.push([Math.round(t), koerperZahl,
          erster ? Math.round(erster.a * 573) / 10 : 0,
          erster ? Math.round(Math.sin(erster.a) * 100) / 100 : 0,
          Math.round(dt * 10) / 10]);
      }

      /* Der Himmel in halber Aufloesung, zwei Lagen, leichte Rolle. */
      var roll = -0.04 + 0.05 * (t / (DAUER_BAHN + DAUER_ENDE));
      gg.setTransform(DPR / 2, 0, 0, DPR / 2, 0, 0);
      gg.globalCompositeOperation = "source-over";
      gg.globalAlpha = 1;
      gg.fillStyle = "#050808";
      gg.fillRect(0, 0, B, H);
      gg.translate(MX, MY);
      gg.rotate(roll);
      gg.globalCompositeOperation = "lighter";
      var s1 = Math.max(B, H) * 1.5;
      var s2 = Math.max(B, H) * 2.1;
      gg.globalAlpha = 0.85;
      gg.drawImage(HIMMEL, -s1 / 2, -s1 / 2 + himmelFahrt * 6, s1, s1);
      gg.globalAlpha = 0.45;
      gg.drawImage(HIMMEL, -s2 / 2, -s2 / 2 - himmelFahrt * 11, s2, s2);

      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, B, H);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = blenden;
      g.drawImage(grund, 0, 0, B, H);

      /* Das Strichfeld. */
      g.globalCompositeOperation = "lighter";
      var pfade = [[], [], [], []];
      for (var i = 0; i < sterne.length; i++) {
        var s = sterne[i];
        var alt = s.d;
        s.d += (s.d * 0.055 + 1.1) * s.v * tempo * (dt / 16.667);
        if (s.d > WEIT) {
          s.w = wuerfel() * 6.2832;
          s.d = 3 + wuerfel() * 22;
          alt = s.d;
        }
        var co = Math.cos(s.w), si = Math.sin(s.w);
        var hell = s.h * klemm((s.d - 14) / (WEIT * 0.3), 0, 1) *
          (0.78 + 0.22 * Math.sin(t * 0.001 * s.fs + s.fp));
        pfade[s.topf].push(MX + co * alt, MY + si * alt, MX + co * s.d, MY + si * s.d, hell);
      }
      g.lineCap = "round";
      for (var k = 0; k < TOPF.length; k++) {
        var liste = pfade[k];
        if (!liste.length) continue;
        var art = TOPF[k];
        for (var st = 0; st < 3; st++) {
          g.beginPath();
          var leer = true;
          for (var j = 0; j < liste.length; j += 5) {
            var h = liste[j + 4];
            if (Math.min(2, (h * 3) | 0) !== st) continue;
            g.moveTo(liste[j], liste[j + 1]);
            g.lineTo(liste[j + 2], liste[j + 3]);
            leer = false;
          }
          if (leer) continue;
          var kraftS = blenden * (0.2 + st * 0.26);
          g.lineWidth = art.breit;
          g.strokeStyle = "rgba(" + art.farbe + "," + kraftS.toFixed(3) + ")";
          g.stroke();
        }
      }

      /* Unscharfe Punkte im Vordergrund. */
      for (var m = 0; m < (sparsam ? 0 : 5); m++) {
        var mw = (m / 5) * 6.2832 + gefahren * 0.07 + m;
        var md = WEIT * (0.36 + 0.5 * ((m * 0.41) % 1));
        var mg = 40 + m * 14;
        g.globalAlpha = blenden * (0.09 - m * 0.008);
        g.drawImage(m % 2 ? BOKEH : BOKEHWARM,
          MX + Math.cos(mw) * md - mg / 2, MY + Math.sin(mw) * md - mg / 2, mg, mg);
      }
      g.globalAlpha = 1;

      /* ---- Das Uhrwerk selbst ---- */
      var hinten = [], vorn = [];
      for (var pi = 0; pi < planeten.length; pi++) {
        var kp = planeten[pi];
        var da = glatt(kp.ab, kp.ab + 750, t);
        if (da <= 0) continue;
        /* Hereinspiralen: von aussen (dem 1,9-fachen der eigenen Bahn)
           auf die Bahn, waehrend der Winkel schon laeuft. Beim Abriss
           weitet sich die Bahn wieder — dieselbe Bewegung, rueckwaerts
           und schneller. */
        kp.rAkt = kp.r * (1.9 - 0.9 * aus(da)) * (1 + 2.4 * abriss * abriss);
        kp.a += kp.w * (1 + 7 * abriss * abriss) * dt * 0.001;
        if (kp.mond) kp.mond.a += kp.mond.w * (1 + 5 * abriss * abriss) * dt * 0.001;
        kp.da = da;
        var o = ort(kp);
        kp.ox = o.x; kp.oy = o.y; kp.oz = o.z;
        (o.z < 0 ? hinten : vorn).push(kp);
      }
      var nachTiefe = function (a, b) { return a.oz - b.oz; };
      hinten.sort(nachTiefe);
      vorn.sort(nachTiefe);

      /* Die Bahnen als hauchduenne Ringe — das Uhrwerk zeigt sein
         Zifferblatt. Nur ein Hauch: bei mehr saehe es nach Schaubild aus. */
      if (planeten.length && !sparsam) {
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = "rgba(170,196,255," + (0.05 * blenden * (1 - abriss)).toFixed(3) + ")";
        g.lineWidth = 1;
        for (var ri = 0; ri < planeten.length; ri++) {
          var rp = planeten[ri];
          if (!rp.da) continue;
          g.beginPath();
          g.ellipse(MX, MY, rp.rAkt, rp.rAkt * QUETSCH, kippeAkt, 0, 6.2832);
          g.stroke();
        }
      }

      function koerperMalen(kp) {
        /* Tiefe: hinten kleiner und mit Dunst davor, vorn groesser. */
        var nah = 1 + 0.3 * kp.oz;
        var gr = kp.gr * 2 * nah * (0.3 + 0.7 * aus(kp.da));
        var deck = blenden * kp.da * (0.62 + 0.38 * (kp.oz * 0.5 + 0.5));

        /* Die Schleppe: ein Stueck der eigenen Bahn, das hinter dem
           Koerper verglueht. Beim Abriss wird sie lang — das ist die
           Bewegungsunschaerfe des Aufbruchs. */
        var lang = 0.22 + kp.w * 0.1 + abriss * 1.6;
        g.globalCompositeOperation = "lighter";
        g.strokeStyle = "rgba(178,202,255," + (0.16 * deck).toFixed(3) + ")";
        g.lineWidth = Math.max(1, gr * 0.1);
        g.lineCap = "round";
        g.beginPath();
        var schritte = 7;
        for (var si2 = 0; si2 <= schritte; si2++) {
          var wa = kp.a - lang * (1 - si2 / schritte);
          var c2 = Math.cos(wa), s2 = Math.sin(wa);
          var ex = kp.rAkt * c2, ey = kp.rAkt * s2 * QUETSCH;
          var px2 = MX + ex * KO - ey * SI, py2 = MY + ex * SI + ey * KO;
          if (si2 === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2);
        }
        g.stroke();

        /* Der Mond: dieselbe Stauchung und Kippung wie das grosse Uhrwerk,
           nur um den Traeger statt um den Kern — so liegen beide Ebenen
           parallel, und das Auge liest EIN System statt zwei Effekte.
           Seine Tiefe entscheidet, ob er vor oder hinter dem Traeger
           gemalt wird: das ist der Moment, in dem "drehen um die anderen"
           sichtbar wird. */
        var mond = kp.mond, mx = 0, my = 0, mgr = 0, mdeck = 0, mz = 0;
        if (mond) {
          var mc = Math.cos(mond.a), ms = Math.sin(mond.a);
          var mex = mond.r * nah * mc, mey = mond.r * nah * ms * QUETSCH;
          mx = kp.ox + mex * KO - mey * SI;
          my = kp.oy + mex * SI + mey * KO;
          mz = ms;
          mgr = mond.e.gr * 2 * nah * (1 + 0.12 * ms) * (0.3 + 0.7 * aus(kp.da));
          mdeck = deck * 0.95;
          if (!sparsam) {
            g.strokeStyle = "rgba(170,196,255," + (0.06 * deck * (1 - abriss)).toFixed(3) + ")";
            g.lineWidth = 1;
            g.beginPath();
            g.ellipse(kp.ox, kp.oy, mond.r * nah, mond.r * nah * QUETSCH, kippeAkt, 0, 6.2832);
            g.stroke();
          }
        }
        function mondMalen() {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = mdeck * 0.6;
          var mlg = mgr * 2.2;
          g.drawImage(GLUT, mx - mlg / 2, my - mlg / 2, mlg, mlg);
          g.globalAlpha = mdeck;
          g.globalCompositeOperation = "source-over";
          g.drawImage(mond.e.bild, mx - mgr / 2, my - mgr / 2, mgr, mgr);
        }
        if (mond && mz < 0) mondMalen();

        g.globalCompositeOperation = "lighter";
        g.globalAlpha = deck * 0.75;
        var lg = gr * 2.4;
        g.drawImage(GLUT, kp.ox - lg / 2, kp.oy - lg / 2, lg, lg);
        g.globalAlpha = deck;
        g.globalCompositeOperation = "source-over";
        g.drawImage(kp.bild, kp.ox - gr / 2, kp.oy - gr / 2, gr, gr);
        if (mond && mz >= 0) mondMalen();
        g.globalAlpha = 1;
      }

      for (var hi = 0; hi < hinten.length; hi++) koerperMalen(hinten[hi]);

      /* Der Kern, mit Atem und Spinne. */
      var kernDa = glatt(150, 900, t);
      if (kernDa > 0) {
        var puls = 1 + 0.03 * Math.sin(t * 0.0021);
        var kg = Math.min(B, H) * 0.21 * puls * aus(kernDa) * (1 - 0.25 * abriss);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = blenden * kernDa * 0.85;
        var gg2 = kg * 3.4;
        g.drawImage(GLUT, MX - gg2 / 2, MY - gg2 / 2, gg2, gg2);
        g.globalAlpha = blenden * kernDa * 0.3;
        var bb = kg * 7 * (0.7 + 0.3 * puls);
        g.drawImage(STREIF, MX - bb / 2, MY - kg * 0.17, bb, kg * 0.34);
        g.globalAlpha = blenden * kernDa;
        g.globalCompositeOperation = "source-over";
        g.drawImage(KERN, MX - kg / 2, MY - kg / 2, kg, kg);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = blenden * kernDa * 0.4;
        var sg = kg * 2.3;
        g.drawImage(SPINNE, MX - sg / 2, MY - sg / 2, sg, sg);
        g.globalAlpha = 1;
      }

      for (var vi = 0; vi < vorn.length; vi++) koerperMalen(vorn[vi]);

      /* Der Blitz des Abrisses. */
      if (abriss > 0) {
        var hell2 = Math.pow(Math.sin(Math.min(1, abriss * 1.6) * 3.1416), 2) * 0.8;
        if (hell2 > 0.004) {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = hell2 * blenden;
          var bg = WEIT * 2.6;
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

      kennung = window.requestAnimationFrame(bild);
    }

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
         Sekunde eins, sonst nimmt ein versehentliches Tippen beim Oeffnen
         die ganze Szene mit. */
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
