/* DER STERN — eine gezeichnete Szene statt eines Stapels von Verlaeufen.

   WARUM ES EINE EIGENE DATEI IST

   Fuenf Anlaeufe lang stand die Vorstellung in stil.css: Ebenen aus
   radial-gradient, die Weltraum nachgeahmt haben. Vier duenne Striche als
   Strahlen, weiche Ellipsen als Nebel, ein flacher Aufkleber als Marke.
   Das Urteil war "billig, nicht episch", und es war richtig. Verlaeufe
   koennen keine Bewegungsunschaerfe, keine Blende, kein Korn — und genau
   das sind die Dinge, an denen man teuer gemachtes Bild erkennt.

   Auf einer Leinwand geht all das, und zwar BILLIGER als vorher: die alte
   Fassung hielt fuenf schirmgrosse Ebenen im Speicher (64 MB Textur bei
   dreifacher Pixeldichte, nach einem Absturz von vorher 1,3 GB). Hier ist
   es eine Leinwand von rund 5 MB plus eine Handvoll kleiner Vorlagen.

   Und sie wird nur geholt, wenn es etwas vorzustellen gibt — also nur fuer
   die Verwaltung. Fuer alle anderen kostet diese Datei kein Byte.

   WIE ES SCHNELL BLEIBT

   Die eine Regel: pro Bild wird nichts NEU GEZEICHNET, sondern nur kopiert.
   Jeder Verlauf, jedes Leuchten, das Korn und die Marke selbst werden
   einmal in eine kleine Vorlage gemalt; im Bild danach steht nur noch
   drawImage mit einer Verschiebung und einem Massstab. Ein
   createRadialGradient je Stern und Bild waere der sichere Weg in die
   Ruckelei.

   Die Sterne sind die Ausnahme — sie sind Striche, und Striche sind
   billig. Vierhundert Stueck werden in vier Farbtoepfe zu je drei
   Helligkeitsstufen sortiert und als ein Dutzend Pfade gezogen, nicht als
   vierhundert.

   WAS EINEN HIMMEL ECHT MACHT

   Die erste Fassung hatte Sterne, aber alle gleich: gleiche Breite, gleiche
   Farbe, harte Enden. Drei Dinge unterscheiden ein Feld von gestreutem
   Konfetti, und alle drei stehen weiter unten im Einzelnen:

     Helligkeit  wenige helle, viele schwache — aber keiner unsichtbar
     Farbe       vier Sterntemperaturen von blauweiss bis orange
     Tiefe       ein Fernfeld, das fast steht, und ein rasendes Nahfeld

   Dazu, was eine Kamera hinzufuegt und ein Gegenstand nicht hat: eine
   Beugungsspinne am hellsten Stern, unscharfe Scheiben mit hellerem Rand
   im Vordergrund, und ein Gegenlichtsaum an der Marke, der aus der Scheibe
   eine Kugel macht.

   DIE DRAMATURGIE

   Episch ist nicht "gross", sondern "es passiert etwas". Sieben Sekunden
   in fuenf Saetzen:

     0,0 - 0,6   Stille. Ein ferner Punkt im Dunkeln.
     0,6 - 2,3   Beschleunigung. Die Sterne ziehen sich zu Strichen.
     2,3 - 2,6   DER TREFFER. Blitz, Druckwelle, und die Striche fallen
                 schlagartig zu Punkten zusammen. Das ist der Moment,
                 der alles traegt: schnell hinein, hart anhalten.
     2,6 - 5,0   Der Stand. Langsame Fahrt, Blende atmet, Korn laeuft.
     5,0 - 7,0   Aufladen und Absprung, mit echter Bewegungsunschaerfe.

   Der Fluchtpunkt der Sterne IST die Marke. Dadurch gehoert das Bild
   zusammen: das Feld strahlt hinter ihr hervor, und wenn sie wandert,
   wandert die Kamera mit. Vorher hatte jede Ebene ihre eigene Mitte. */
(function () {
  "use strict";

  var DAUER = 7000;

  /* Die Wegmarken der Dramaturgie an einer Stelle, damit Tempo, Ort und
     Groesse nicht auseinanderlaufen. */
  var T_LOS = 600,      /* die Beschleunigung setzt ein            */
      T_TREFFER = 2300, /* Ankunft: Blitz und Druckwelle           */
      T_ABRISS = 2540,  /* die Striche sind wieder Punkte          */
      T_HALT = 4900,    /* Ende des ruhigen Stands                 */
      T_LADEN = 6050,   /* voll aufgeladen, das Zusammenziehen     */
      T_START = 6100;   /* Absprung                                */

  function klemm(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function mische(a, b, u) { return a + (b - a) * u; }
  /* Sanft von 0 auf 1 zwischen zwei Zeitpunkten — ohne Knick an den
     Enden, sonst sieht jeder Uebergang wie ein Ruck aus. */
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

  /* Ein rundes Leuchten als Vorlage. stufen ist [[stelle, farbe], ...]. */
  function glut(gr, stufen) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var v = x.createRadialGradient(gr / 2, gr / 2, 0, gr / 2, gr / 2, gr / 2);
    for (var i = 0; i < stufen.length; i++) v.addColorStop(stufen[i][0], stufen[i][1]);
    x.fillStyle = v;
    x.fillRect(0, 0, gr, gr);
    return c;
  }

  /* Der anamorphotische Streifen — der eine Effekt, an dem das Auge eine
     Kameralinse erkennt und nicht eine Zeichnung. Waagerecht lang, senkrecht
     schnell aus. */
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
    /* Senkrechte Abnahme ueber die Deckkraft der schon gemalten Flaeche. */
    x.globalCompositeOperation = "destination-in";
    var s = x.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, "rgba(0,0,0,0)");
    s.addColorStop(0.5, "rgba(0,0,0,1)");
    s.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = s;
    x.fillRect(0, 0, b, h);
    return c;
  }

  /* DIE BEUGUNGSSPINNE — das Kreuz, das ein heller Stern im Objektiv wirft.

     Nicht vier gezeichnete Balken, sondern vier Verlaeufe, die zur Spitze
     hin ausgehen, plus ein Kern. Zwei lange Arme waagerecht und senkrecht,
     zwei kurze schraeg: eine gleichmaessige Spinne sieht gezeichnet aus,
     eine ungleiche wie Optik. */
  function spinne(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2;
    x.globalCompositeOperation = "lighter";
    var arme = [[0, 1, 0.028], [1.5708, 0.86, 0.024], [0.7854, 0.42, 0.016], [-0.7854, 0.42, 0.016]];
    for (var i = 0; i < arme.length; i++) {
      x.save();
      x.translate(m, m);
      x.rotate(arme[i][0]);
      var l = m * arme[i][1], b = gr * arme[i][2];
      var v = x.createLinearGradient(-l, 0, l, 0);
      v.addColorStop(0, "rgba(190,214,255,0)");
      v.addColorStop(0.34, "rgba(214,232,255,0.36)");
      v.addColorStop(0.5, "rgba(255,255,255,0.9)");
      v.addColorStop(0.66, "rgba(214,232,255,0.36)");
      v.addColorStop(1, "rgba(190,214,255,0)");
      x.fillStyle = v;
      x.fillRect(-l, -b / 2, l * 2, b);
      x.restore();
    }
    var kv = x.createRadialGradient(m, m, 0, m, m, gr * 0.14);
    kv.addColorStop(0, "rgba(255,255,255,0.95)");
    kv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = kv;
    x.fillRect(0, 0, gr, gr);
    return c;
  }

  /* EIN UNSCHARFER LICHTPUNKT.

     Ein Objektiv macht aus einem Punkt ausserhalb der Schaerfeebene keine
     weiche Wolke, sondern eine SCHEIBE mit hellerem Rand — die Form der
     Blende. Das ist der Unterschied zwischen "verwaschen" und "unscharf",
     und das Auge kennt ihn, ohne ihn benennen zu koennen. */
  function bokeh(gr, farbe) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m * 0.82;
    var v = x.createRadialGradient(m, m, 0, m, m, r);
    v.addColorStop(0, "rgba(" + farbe + ",0.34)");
    v.addColorStop(0.72, "rgba(" + farbe + ",0.4)");
    v.addColorStop(0.9, "rgba(" + farbe + ",0.82)");
    v.addColorStop(1, "rgba(" + farbe + ",0)");
    x.fillStyle = v;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.fill();
    return c;
  }

  /* DER HIMMEL als eine einzige Vorlage.

     Achtzig weiche Flecken in den Farben des Grundes unter der Liste —
     kuehles Blau, Tuerkis, ein Hauch Flieder —, uebereinandergelegt mit
     "lighter", dann dunkle Flecken darueber, die Staubbahnen hineinschneiden.
     Ohne diese dunklen Bahnen bleibt jeder Nebel eine Wolke aus Watte; sie
     sind das, was ihn nach Gas aussehen laesst.

     Dazu vierhundert feine Sterne, die MIT dem Nebel wandern. Sie liegen
     hinter dem Strichfeld und geben ihm eine Tiefe, die ein zweites
     bewegtes Feld gekostet haette. */
  function himmel(gr, wuerfel) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    x.fillStyle = "#04060b";
    x.fillRect(0, 0, gr, gr);

    var toene = [
      [70, 132, 196], [46, 150, 150], [96, 84, 168],
      [54, 104, 178], [38, 138, 122], [120, 108, 190]
    ];
    /* GEZOGENE FLECKEN, NICHT RUNDE.

       Achtzig Kreise ergeben Watte. Gas steht in Faeden: es wird von
       Strahlung weggeblasen und von Schwerkraft gezogen, und deshalb ist
       fast alles daran laenglich und in eine Richtung gekaemmt. Jeder
       Fleck bekommt deshalb ein Seitenverhaeltnis und einen Winkel, der um
       eine gemeinsame Vorzugsrichtung streut — das ist der ganze
       Unterschied zwischen "Nebel" und "Weichzeichner". */
    var richtung = 0.5;
    x.globalCompositeOperation = "lighter";
    for (var i = 0; i < 96; i++) {
      var t = toene[(wuerfel() * toene.length) | 0];
      var r = gr * (0.03 + wuerfel() * wuerfel() * 0.26);
      var px = wuerfel() * gr, py = wuerfel() * gr;
      var a = 0.05 + wuerfel() * 0.13;
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
    /* Die Staubbahnen. */
    x.globalCompositeOperation = "source-over";
    for (var d = 0; d < 40; d++) {
      var rr = gr * (0.04 + wuerfel() * wuerfel() * 0.22);
      var dx = wuerfel() * gr, dy = wuerfel() * gr;
      var da = 0.16 + wuerfel() * 0.3;
      var dv = x.createRadialGradient(dx, dy, 0, dx, dy, rr);
      dv.addColorStop(0, "rgba(4,6,11," + da.toFixed(3) + ")");
      dv.addColorStop(1, "rgba(4,6,11,0)");
      x.fillStyle = dv;
      x.fillRect(dx - rr, dy - rr, rr * 2, rr * 2);
    }
    /* Nur noch ein feiner Staub, kein Sternenfeld mehr.

       Hier standen vierhundert Punkte. Sie waren an dieser Stelle falsch
       aufgehoben: die Vorlage wird seit dem Umbau auf halber Aufloesung
       gemalt und aufgezogen, und ein Punkt von unter zwei Bildpunkten wird
       dabei zu Matsch. Die Sterne stehen jetzt im Strichfeld, wo sie scharf
       bleiben und sich mitbewegen. Was hier bleibt, ist Gasstaub, der dem
       Nebel Koernung gibt — bewusst schwach. */
    x.globalCompositeOperation = "lighter";
    for (var s = 0; s < 150; s++) {
      var sr = 0.8 + wuerfel() * wuerfel() * 2.2;
      var sa = 0.06 + wuerfel() * 0.16;
      x.fillStyle = "rgba(" + (196 + ((wuerfel() * 50) | 0)) + ",220,255," + sa.toFixed(3) + ")";
      x.beginPath();
      x.arc(wuerfel() * gr, wuerfel() * gr, sr, 0, 6.2832);
      x.fill();
    }
    return c;
  }

  /* Filmkorn. Eine kleine Kachel, die als Muster ueber alles laeuft und
     jedes Bild um einen zufaelligen Betrag verschoben wird. Zwei Prozent
     Rauschen sind der Unterschied zwischen "gerendert" und "gefilmt". */
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

  /* DIE MARKE. Die neun Formen kommen als Bild aus derselben Zeichnung, die
     auch in der Liste steht — sie werden hier NICHT nachgebaut. Waeren es
     zwei Quellen, haette die eine sich irgendwann von der anderen entfernt,
     und niemand haette es gemerkt.

     Dazu, was eine Zeichnung von einem Koerper unterscheidet: ein Verlauf
     mit einer Lichtquelle oben links, ein Glanzpunkt darauf, ein heller
     Saum an der Oberkante und ein dunkler an der Unterkante. */
  function markeTafel(gr, bild) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m - gr * 0.02;

    var v = x.createRadialGradient(m - r * 0.36, m - r * 0.48, r * 0.05, m, m, r);
    v.addColorStop(0, "#5a49da");
    v.addColorStop(0.42, "#2c2189");
    v.addColorStop(1, "#0f0c40");
    x.beginPath(); x.arc(m, m, r, 0, 6.2832);
    x.fillStyle = v; x.fill();

    /* Der Lichtsaum oben, der dunkle Saum unten. */
    x.lineWidth = Math.max(1, gr * 0.008);
    var k = x.createLinearGradient(0, 0, 0, gr);
    k.addColorStop(0, "rgba(255,255,255,0.62)");
    k.addColorStop(0.45, "rgba(255,255,255,0.14)");
    k.addColorStop(1, "rgba(0,0,0,0.4)");
    x.strokeStyle = k;
    x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, 6.2832); x.stroke();

    /* Glanzpunkt: eine weiche Ellipse oben links. */
    var gx = m - r * 0.34, gy = m - r * 0.46, gr2 = r * 0.52;
    var gv = x.createRadialGradient(gx, gy, 0, gx, gy, gr2);
    gv.addColorStop(0, "rgba(255,255,255,0.34)");
    gv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gv;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.fill();

    /* GEGENLICHT — ein schmaler kalter Saum auf der Schattenseite.

       Das ist der Griff, mit dem aus einer Scheibe eine Kugel wird. Eine
       Flaeche hat eine Lichtseite und eine dunkle; ein KOERPER faengt auf
       der dunklen Seite noch Licht von hinten und zeigt dort eine helle
       Kante. Ohne sie klebt die Marke im Bild, mit ihr steht sie darin. */
    x.save();
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.clip();
    x.globalCompositeOperation = "lighter";
    var sv = x.createRadialGradient(m + r * 0.52, m + r * 0.6, r * 0.1,
                                    m + r * 0.52, m + r * 0.6, r * 1.15);
    sv.addColorStop(0, "rgba(150,196,255,0.5)");
    sv.addColorStop(0.4, "rgba(120,170,255,0.12)");
    sv.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = sv;
    x.fillRect(0, 0, gr, gr);
    x.restore();

    if (bild) {
      var s = gr * 0.6;
      try { x.drawImage(bild, (gr - s) / 2, (gr - s) / 2, s, s); } catch (e) {}
    }
    return c;
  }

  /* NUR die neun Formen, ohne Scheibe, auf durchsichtigem Grund.

     Das Ueberstrahlen braucht eine eigene Vorlage. Beim ersten Anlauf wurde
     dafuer die ganze Marke ein zweites Mal additiv darueber gelegt — also
     auch die Scheibe. Ergebnis: ein weisser Klumpen, in dem die Zeichnung
     nicht mehr zu erkennen war. Leuchten soll, was leuchtet; die Scheibe
     ist ein Koerper und bleibt dunkel. */
  function glyphTafel(gr, bild) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    if (bild) {
      var s = gr * 0.6;
      try { x.drawImage(bild, (gr - s) / 2, (gr - s) / 2, s, s); } catch (e) {}
    }
    return c;
  }

  /* Ein eigener Zufall mit festem Anfang: derselbe Himmel bei jedem Start.
     Mit Math.random waere jede Pruefaufnahme ein anderes Bild, und
     "sieht es aus wie beim letzten Mal" waere nicht zu beantworten. */
  function wuerfelWerk(saat) {
    var z = saat >>> 0;
    return function () {
      z = (z * 1664525 + 1013904223) >>> 0;
      return z / 4294967296;
    };
  }

  window.rcpStern = function (huelle, wahl) {
    wahl = wahl || {};
    var leinwand = document.createElement("canvas");
    var g = leinwand.getContext && leinwand.getContext("2d");
    if (!g) return function () {};
    leinwand.className = "sternleinwand";
    leinwand.setAttribute("aria-hidden", "true");
    huelle.appendChild(leinwand);

    /* Bei drei Punkten je Bildpunkt waere die Leinwand doppelt so teuer und
       kein Stueck schoener — was hier gezeichnet wird, ist weich. */
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var B = 0, H = 0, MX = 0, MY = 0, RAD = 0, WEIT = 0;
    var grund = null, gg = null, nachher = [];

    function messen() {
      B = huelle.clientWidth || window.innerWidth;
      H = huelle.clientHeight || window.innerHeight;
      leinwand.width = Math.round(B * DPR);
      leinwand.height = Math.round(H * DPR);
      leinwand.style.width = B + "px";
      leinwand.style.height = H + "px";
      MX = B / 2; MY = H / 2;
      RAD = Math.min(B, H) * 0.2;
      WEIT = Math.sqrt(B * B + H * H) * 0.62;

      /* DER HIMMEL IN HALBER AUFLOESUNG.

         Grund und die beiden Nebelebenen kosteten drei schirmgrosse
         Anstriche JE BILD, zwei davon additiv. Bei vierfach gedrosselter
         Rechenleistung — was ein aelteres Telefon unter Last ungefaehr ist
         — waren es dadurch noch dreissig Bilder je Sekunde, bei sechsfach
         sechzehn.

         Jetzt werden die drei in eine halb so grosse Flaeche gemalt und
         diese einmal aufgezogen: ein Viertel der Punkte fuer die teure
         Arbeit, dazu ein glattes Kopieren. Zu sehen ist davon nichts —
         Nebel IST unscharf, das ist der ganze Witz an ihm. Was scharf sein
         muss (die Sterne, die Marke), wird weiterhin voll gezeichnet. */
      grund = tafel(Math.round(B * DPR / 2), Math.round(H * DPR / 2));
      gg = grund.getContext("2d");

      /* NACHBEREITUNG: Randabdunklung UND Korn in einer Vorlage.

         Beides waren zwei weitere schirmgrosse Anstriche. Zusammengebacken
         ist es einer. Damit das Korn trotzdem flimmert — ein stehendes
         Korn sieht aus wie Schmutz auf der Linse, nicht wie Film —, gibt
         es drei Fassungen, die im Wechsel laufen. */
      nachher = [];
      for (var n = 0; n < 3; n++) {
        var t = tafel(Math.round(B / 2), Math.round(H / 2));
        var sx = t.getContext("2d");
        var sv = sx.createRadialGradient(B / 4, H / 4, Math.min(B, H) * 0.08,
                                         B / 4, H / 4, WEIT / 2);
        sv.addColorStop(0, "rgba(0,0,0,0)");
        sv.addColorStop(0.62, "rgba(0,0,0,0.24)");
        sv.addColorStop(1, "rgba(2,3,7,0.78)");
        sx.fillStyle = sv;
        sx.fillRect(0, 0, t.width, t.height);
        try {
          sx.globalAlpha = 0.09;
          sx.translate(n * 41, n * 27);
          sx.fillStyle = sx.createPattern(KORN, "repeat");
          sx.fillRect(-n * 41, -n * 27, t.width, t.height);
        } catch (e) {}
        nachher.push(t);
      }
    }

    var wuerfel = wuerfelWerk(20260819);
    var HIMMEL = himmel(512, wuerfel);
    var KORN = korn(128, wuerfel);
    /* Der Lichthof. Bewusst nicht mit weissem Kern: er liegt HINTER der
       Marke, und ein weisser Kern dort schiebt sich als Saum an ihr vorbei
       — die Scheibe sieht dann aus, als schwebe sie vor einer Lampe. */
    var GLUT = glut(256, [
      [0, "rgba(226,236,255,0.72)"],
      [0.16, "rgba(168,190,255,0.42)"],
      [0.36, "rgba(112,132,250,0.17)"],
      [0.66, "rgba(72,96,220,0.05)"],
      [1, "rgba(0,0,0,0)"]
    ]);
    var STREIF = streifen(512, 48, "rgba(150,200,255,0.55)");
    var SPINNE = spinne(128);
    var BOKEH = bokeh(96, "150,186,255");
    var BOKEHWARM = bokeh(96, "255,208,158");
    /* Ein Lichtpunkt je Sternfarbe — der Kopf des Strichs. */
    var FUNKE = [];
    for (var tf = 0; tf < 4; tf++) {
      var farbe = ["199,216,255", "255,255,255", "255,241,206", "255,206,158"][tf];
      FUNKE.push(glut(64, [
        [0, "rgba(255,255,255,1)"],
        [0.16, "rgba(" + farbe + ",0.8)"],
        [0.44, "rgba(" + farbe + ",0.2)"],
        [1, "rgba(0,0,0,0)"]
      ]));
    }
    var BLITZ = glut(256, [
      [0, "rgba(255,255,255,0.95)"],
      [0.1, "rgba(226,238,255,0.62)"],
      [0.26, "rgba(180,204,255,0.3)"],
      [0.55, "rgba(120,150,255,0.07)"],
      [1, "rgba(0,0,0,0)"]
    ]);

    /* Erst jetzt ausmessen: messen() backt das Korn in die Nachbereitung
       ein und braucht dafuer die Vorlage, die eine Zeile weiter oben
       entsteht. Andersherum stand dort nichts drin, und das Bild war
       makellos glatt — was man nicht sieht, weil ein fehlendes Korn
       aussieht wie ein Bild ohne Korn. */
    messen();

    /* Die Marke: erst die Scheibe ohne Zeichnung, damit sofort etwas da ist;
       sobald das Bild geladen ist, wird die Vorlage einmal neu gemalt. */
    var MARKE = markeTafel(256, null);
    var GLYPH = glyphTafel(256, null);
    if (wahl.zeichen) {
      /* NICHT "bild" nennen. So hiess es zuerst, und weil var fuer die ganze
         Funktion gilt und nicht fuer den Block, hat diese Zeile die Funktion
         bild() ueberschrieben, die die Bilderschleife ist — vor deren
         erstem Aufruf. Die Meldung lautete dann "requestAnimationFrame:
         parameter 1 is not of type Function", und sie zeigte auf eine
         Zeile, an der nichts falsch war. */
      /* Und weil dieses Laden still fehlschlaegt, sagt es an, ob es geklappt
         hat. Ohne diese Zeile ist "die Scheibe ist leer" nicht von "die
         Zeichnung ist eben so" zu unterscheiden — genau daran habe ich
         einen Durchgang verloren. */
      window.rcpSternMarke = "wartet";
      var vorlage = new Image();
      vorlage.onload = function () {
        MARKE = markeTafel(256, vorlage);
        GLYPH = glyphTafel(256, vorlage);
        window.rcpSternMarke = "da";
      };
      vorlage.onerror = function () { window.rcpSternMarke = "fehlt"; };
      /* Drei Dinge muessen an der Zeichnung geaendert werden, bevor sie als
         Bild taugt. Alle drei sind still: schlaegt eines fehl, laedt das
         Bild einfach nicht, und auf der Scheibe steht dann nichts.

         xmlns. Eine SVG, die im HTML-Baum steht, braucht keinen — der
         Baum weiss schon, in welcher Sprache sie geschrieben ist.
         outerHTML gibt sie deshalb OHNE aus. Als eigene Datei ist sie
         damit unlesbar, und genau das ist beim ersten Anlauf passiert:
         eine makellos runde Scheibe, auf der der Raster fehlte.

         currentColor hat in einem Bild keinen Bezug und faellt auf Schwarz
         zurueck — die Formen waeren unsichtbar auf dunklem Grund.

         width/height, weil eine SVG mit blossem viewBox als Bild keine
         Eigengroesse hat. Chrome behilft sich, Safari zeichnet nichts. */
      var quelle = String(wahl.zeichen).replace(/currentColor/g, "#ffffff");
      if (!/\sxmlns=/.test(quelle)) quelle = quelle.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
      if (!/\swidth=/.test(quelle)) quelle = quelle.replace(/<svg\b/, '<svg width="256" height="256"');
      vorlage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(quelle);
    }

    /* DAS STRICHFELD.

       Jeder Stern hat einen Winkel und einen Abstand vom Fluchtpunkt. Der
       Abstand waechst mit der Fahrt, und weil er UM SICH SELBST waechst
       (d += d * ...), zieht ein Stern am Rand schneller vorbei als einer in
       der Mitte — das ist die Perspektive, ohne eine dritte Achse.

       Gezeichnet wird von der vorigen zur jetzigen Stelle. Der Strich IST
       die Bewegungsunschaerfe: kein Nachtraeglicher Effekt, sondern
       schlicht die Strecke, die der Stern in diesem Bild zurueckgelegt hat.

       DREI DINGE, DIE EIN FELD ECHT MACHEN — und die vorher alle fehlten.

       ERSTENS: Sterne sind NICHT gleich hell. Am Himmel steht auf einen
       hellen ein Dutzend schwacher. Gleichverteilt wirkt das wie
       gestreutes Konfetti; die Verteilung hier ist deshalb eine Potenz,
       und das Ergebnis ist ein Feld mit wenigen Kerlen und viel Staub.

       ZWEITENS: Sterne haben FARBEN, und zwar nach ihrer Temperatur —
       blauweiss, weiss, gelblich, orange. Vorher waren es drei Toepfe, von
       denen zwei fast dasselbe Weiss waren.

       DRITTENS: sie stehen in verschiedener TIEFE. Ein ferner Stern zieht
       kaum vorbei und bleibt ein scharfer Punkt, ein naher wird zum langen
       Strich. Vorher lag das Tempo zwischen 0,45 und 1,45 — alle etwa
       gleich weit weg, also alle etwa gleich lang. Jetzt reicht es von
       0,06 bis 1,7: ein ruhiges Fernfeld und ein rasendes Nahfeld im
       selben Bild.

       Die feinen Sterne waren bis eben in die Nebelvorlage gemalt, und die
       wird seit dem Umbau auf halbe Aufloesung mitverkleinert — pinselige
       Punkte werden dabei zu Matsch. Sie sind jetzt hier, wo sie scharf
       bleiben, und das Fernfeld ersetzt sie eins zu eins. */
    var ANZ = Math.round(klemm((B * H) / 1050, 220, 400));
    var sterne = [];
    for (var i = 0; i < ANZ; i++) {
      /* Tiefe: ein Drittel Fernfeld, das fast steht. */
      var fern = wuerfel();
      var tief = fern < 0.34 ? 0.06 + wuerfel() * 0.16
        : (fern < 0.82 ? 0.3 + wuerfel() * 0.55 : 0.95 + wuerfel() * 0.75);
      /* Helligkeit als Potenz: viele schwache, wenige starke — aber mit
         einem Boden. Ohne ihn ("h = pow(zufall, 2,3)") lag die Haelfte des
         Feldes unter der Sichtbarkeit, und in der ruhigen Phase, wo die
         Striche kurz sind, stand der Himmel fast leer da. Eine Verteilung
         darf steil sein; sie darf nicht unter die Wahrnehmungsschwelle
         reichen, sonst hat man die Sterne nur gerechnet. */
      var h = 0.2 + 0.8 * Math.pow(wuerfel(), 2.3);
      sterne.push({
        w: wuerfel() * 6.2832,
        /* Die Wurzel ist keine Zierde. Ein gleichverteilter Abstand heisst
           in der FLAECHE dicht in der Mitte: die Ringe um den Fluchtpunkt
           werden nach aussen immer groesser, bekommen aber gleich viele
           Sterne ab. Zu sehen war das als Klumpen genau dort, wo der Stern
           steht — wie ein Spritzer, nicht wie ein Himmel. Mit der Wurzel
           ist die Dichte ueberall gleich. */
        d: 8 + WEIT * Math.sqrt(wuerfel()),
        v: tief,
        h: h,
        topf: (wuerfel() * 4) | 0,
        /* Funkeln: eigene Geschwindigkeit und eigener Anfang, sonst blinkt
           das ganze Feld im Gleichschritt wie eine Lichterkette. */
        fs: 1.6 + wuerfel() * 4.2,
        fp: wuerfel() * 6.2832
      });
    }
    /* Nach Helligkeit sortiert: die hellsten stehen hinten und bekommen
       weiter unten ihren Lichtpunkt, ohne dass dafuer gesucht werden muss. */
    sterne.sort(function (a, b) { return a.h - b.h; });

    /* Vier Farbtoepfe nach Sterntemperatur. Die Zahlen sind keine Erfindung,
       sondern ungefaehr das, was ein Auge bei O-, F-, G- und K-Sternen
       sieht. */
    var TOPF = [
      { farbe: "199,216,255", breit: 1.0 },   /* blauweiss */
      { farbe: "255,255,255", breit: 1.15 },  /* weiss     */
      { farbe: "255,241,206", breit: 1.05 },  /* gelblich  */
      { farbe: "255,206,158", breit: 0.95 }   /* orange    */
    ];
    /* Drei Helligkeitsstufen je Topf, und jede Stufe zweimal gezogen: erst
       breit und schwach, dann schmal und hell. Das ist ein weicher Rand fuer
       den Preis eines zweiten Zuges — ein einzelner Strich hat harte
       Kanten und sieht aus wie ein Stoeckchen. */
    var STUFEN = 3;

    function tempo(t) {
      return 0.35
        + 9.2 * glatt(T_LOS, T_TREFFER, t)
        - 9.0 * glatt(T_TREFFER, T_ABRISS, t)
        + 1.1 * glatt(T_HALT, T_LADEN, t)
        + 14 * glatt(T_START, 6950, t);
    }

    /* Der Weg der Marke — quer und hoch durchgehend in eine Richtung. Das
       war die Lehre aus dem Anlauf davor: eine Bahn mit Wendepunkten sieht
       aus wie Zappeln, egal wie weit sie fuehrt. */
    function ort(t) {
      var fx, fy, u;
      if (t < T_TREFFER) {
        u = aus(t / T_TREFFER);
        fx = mische(0.42, 0.17, u); fy = mische(0.36, 0.15, u);
      } else if (t < T_START) {
        u = (t - T_TREFFER) / (T_START - T_TREFFER);
        fx = mische(0.17, -0.17, u); fy = mische(0.15, -0.14, u);
      } else {
        u = klemm((t - T_START) / 900, 0, 1);
        u = u * u * u;
        fx = mische(-0.17, -0.4, u); fy = mische(-0.14, -2.1, u);
      }
      return [MX + fx * B, MY + fy * H];
    }

    function groesse(t) {
      if (t < T_TREFFER) return 0.015 + 1.075 * Math.pow(t / T_TREFFER, 2.7);
      if (t < T_ABRISS) return mische(1.09, 1.0, glatt(T_TREFFER, T_ABRISS, t));
      if (t < T_HALT) return mische(1.0, 1.12, (t - T_ABRISS) / (T_HALT - T_ABRISS));
      if (t < T_LADEN) return mische(1.12, 1.36, glatt(T_HALT, T_LADEN, t));
      return mische(1.36, 0.74, glatt(T_LADEN, T_LADEN + 260, t));
    }

    /* Die Blende: ein waagerechter Streifen durch die Marke und eine Reihe
       von Ringen auf der Linie zur Bildmitte. Beides ist das, was eine
       Kamera dem Bild hinzufuegt und ein Gegenstand nicht hat — und genau
       deshalb liest es sich als "gefilmt". */
    function blende(px, py, kraft, gr, a) {
      var dx = MX - px, dy = MY - py;
      g.globalCompositeOperation = "lighter";

      /* DUENN UND SCHWACH, nicht breit und hell.

         Beim ersten Anlauf war der Streifen neunmal so breit wie die Marke
         und ein Drittel so hoch — das ist kein Lichtreflex mehr, sondern
         ein grauer Balken quer durchs Bild. Dasselbe senkrecht. Was eine
         Linse hinzufuegt, ist schmal und fast durchsichtig; sichtbar wird
         es nur dadurch, dass es ueber Dunkles laeuft. */
      var bb = gr * 6 * (0.55 + kraft * 0.5);
      g.globalAlpha = a * (0.16 + kraft * 0.26);
      g.drawImage(STREIF, px - bb / 2, py - gr * 0.16, bb, gr * 0.32);

      g.save();
      g.translate(px, py);
      g.rotate(1.5708);
      g.globalAlpha = a * (0.06 + kraft * 0.12);
      g.drawImage(STREIF, -bb * 0.26, -gr * 0.065, bb * 0.52, gr * 0.13);
      g.restore();

      /* Die Geisterbilder auf der Linie zur Bildmitte. Klein — bei einem
         Drittel des Markendurchmessers sahen sie aus wie graue Reifen, die
         jemand vergessen hat, nicht wie Reflexe im Objektiv. */
      var stellen = [-0.34, 0.28, 0.52, 0.79, 1.14, 1.52];
      var groessen = [0.1, 0.05, 0.14, 0.07, 0.19, 0.09];
      var farben = ["rgba(120,220,210,", "rgba(150,170,255,", "rgba(255,190,140,",
                    "rgba(120,220,210,", "rgba(150,170,255,", "rgba(255,220,180,"];
      g.globalAlpha = 1;
      for (var k = 0; k < stellen.length; k++) {
        var gx = px + dx * stellen[k], gy = py + dy * stellen[k];
        var rr = gr * groessen[k];
        var ga = a * (0.04 + kraft * 0.07) * (k % 2 ? 1 : 0.7);
        g.strokeStyle = farben[k] + ga.toFixed(3) + ")";
        g.lineWidth = Math.max(0.8, rr * 0.22);
        g.beginPath(); g.arc(gx, gy, rr, 0, 6.2832); g.stroke();
        g.fillStyle = farben[k] + (ga * 0.45).toFixed(3) + ")";
        g.beginPath(); g.arc(gx, gy, rr * 0.7, 0, 6.2832); g.fill();
      }
    }

    function koerper(t, px, py, mass, a) {
      var gr = RAD * 2 * mass;
      var lang = 1, schmal = 1;
      if (t > T_START) {
        var e = klemm((t - T_START) / 900, 0, 1);
        lang = 1 + 3.4 * e * e;
        schmal = 1 - 0.42 * e;
      }
      /* Das Leuchten zuerst, damit die Marke darin steht und nicht davor. */
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = a * 0.8;
      var lg = gr * 2.6;
      g.drawImage(GLUT, px - lg / 2, py - lg / 2, lg, lg);
      g.globalAlpha = a;
      g.globalCompositeOperation = "source-over";
      g.drawImage(MARKE, px - gr * schmal / 2, py - gr * lang / 2, gr * schmal, gr * lang);
      /* Und nur die Zeichnung noch einmal additiv, eine Spur groesser: so
         strahlt sie ueber ihre Kante hinaus, statt bloss hell zu sein. Nur
         die Zeichnung — mit der ganzen Marke wurde daraus ein weisser
         Klumpen, in dem nichts mehr zu erkennen war. */
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = a * 0.45;
      g.drawImage(GLYPH, px - gr * schmal * 0.53, py - gr * lang * 0.53,
                  gr * schmal * 1.06, gr * lang * 1.06);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }

    var laeuft = true, kennung = 0, t0 = 0, gefahren = 0, vorher = 0, bildnummer = 0;
    var fertig = typeof wahl.fertig === "function" ? wahl.fertig : function () {};

    /* EINE SPUR FUER DIE NACHSCHAU.

       Auf einer Leinwand gibt es nichts mehr zu befragen: kein Element, an
       dem getBoundingClientRect haengt, keine Bewegung in
       getAnimations(). Wo der Stern war, wie schnell die Fahrt ging und wie
       lange ein Bild gebraucht hat, waere sonst nur zu erraten — und "sieht
       gut aus" ist das einzige Urteil, das man dann noch faellen kann.

       Je Bild fuenf Zahlen, hoechstens sechshundert Eintraege. Das kostet
       nichts und ist der Unterschied zwischen Messen und Meinen. */
    var spur = [];
    window.rcpSternSpur = spur;

    function bild(jetzt) {
      if (!laeuft) return;
      if (!t0) { t0 = jetzt; vorher = jetzt; }
      var t = jetzt - t0;
      /* Wenn die App im Hintergrund war, kommt ein Sprung von Sekunden.
         Ungeklemmt wuerde das Feld in einem Bild ueber den Rand schiessen. */
      var dt = klemm(jetzt - vorher, 0, 64);
      vorher = jetzt;
      if (t >= DAUER) { laeuft = false; aufraeumen(); fertig(); return; }

      var v = tempo(t);
      gefahren += v * dt * 0.001;
      var blenden = glatt(0, 340, t) * (1 - glatt(6420, DAUER, t));
      var stelle = ort(t), px = stelle[0], py = stelle[1];
      var mass = groesse(t);
      if (spur.length < 600) {
        spur.push([Math.round(t), Math.round(px), Math.round(py),
                   Math.round(mass * 100) / 100, Math.round(v * 100) / 100,
                   Math.round(dt * 10) / 10]);
      }

      /* Erst der Himmel in die halb so grosse Flaeche: Grund und zwei
         Nebelebenen, einmal gross und langsam, einmal naeher und schneller.
         Zwei Geschwindigkeiten sind Tiefe. Dazu eine leichte Kameraneigung
         ueber die ganze Zeit. */
      var roll = mische(-0.05, 0.035, t / DAUER);
      gg.setTransform(DPR / 2, 0, 0, DPR / 2, 0, 0);
      gg.globalCompositeOperation = "source-over";
      gg.globalAlpha = 1;
      gg.fillStyle = "#04060b";
      gg.fillRect(0, 0, B, H);
      gg.translate(MX, MY);
      gg.rotate(roll);
      gg.globalCompositeOperation = "lighter";
      var z1 = 1.15 + gefahren * 0.055;
      var z2 = 1.7 + gefahren * 0.14;
      var s1 = Math.max(B, H) * z1, s2 = Math.max(B, H) * z2;
      gg.globalAlpha = 0.85;
      gg.drawImage(HIMMEL, -s1 / 2 + (px - MX) * 0.06, -s1 / 2 + (py - MY) * 0.06, s1, s1);
      gg.globalAlpha = 0.45;
      gg.drawImage(HIMMEL, -s2 / 2 - (px - MX) * 0.16, -s2 / 2 - (py - MY) * 0.16, s2, s2);

      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, B, H);
      g.globalCompositeOperation = "source-over";
      /* Und einmal aufziehen. Das Aufblenden sitzt hier, an einer einzigen
         Stelle, statt an jeder Ebene. */
      g.globalAlpha = blenden;
      g.drawImage(grund, 0, 0, B, H);

      /* Das Strichfeld. Erst rechnen und in Toepfe sortieren, dann je Topf
         und Stufe EIN Zug — nicht vierhundert. */
      g.globalCompositeOperation = "lighter";
      var pfade = [[], [], [], []];
      var funken = null;
      for (var i = 0; i < sterne.length; i++) {
        var s = sterne[i];
        var alt = s.d;
        s.d += (s.d * 0.055 + 1.1) * s.v * v * (dt / 16.667);
        if (s.d > WEIT) {
          s.w = wuerfel() * 6.2832;
          s.d = 3 + wuerfel() * 22;
          alt = s.d;
        }
        var co = Math.cos(s.w), si = Math.sin(s.w);
        /* Helligkeit: die eigene, mal dem Abstand (nah am Fluchtpunkt ist
           ein Stern noch weit weg und darf nicht hell sein), mal dem
           Funkeln. */
        /* Frisch gesetzte Sterne muessen bei NULL anfangen, nicht bei
           einem Rest. Wer aus dem Bild faellt, wird am Fluchtpunkt neu
           gesetzt — und mit einem Boden in der Helligkeit sammelte sich
           dort ein sichtbarer Haufen an, wie ein Spritzer genau hinter der
           Marke. Jetzt blenden sie auf, waehrend sie herauskommen. */
        var hell = s.h * klemm((s.d - 14) / (WEIT * 0.3), 0, 1) *
          (0.78 + 0.22 * Math.sin(t * 0.001 * s.fs + s.fp));
        pfade[s.topf].push(px + co * alt, py + si * alt, px + co * s.d, py + si * s.d, hell);
        /* Die hellsten bekommen einen Lichtpunkt am Kopf: ein Stern ist
           kein Strich, sondern eine Lichtquelle MIT einem Strich dahinter.
           Nur die letzten Prozent der sortierten Liste, also ein gutes
           Dutzend, nicht vierhundert. */
        if (i > sterne.length - 26 && hell > 0.45) {
          (funken || (funken = [])).push(px + co * s.d, py + si * s.d, hell, s.topf);
        }
      }
      g.lineCap = "round";
      for (var k = 0; k < TOPF.length; k++) {
        var liste = pfade[k];
        if (!liste.length) continue;
        var art = TOPF[k];
        for (var st = 0; st < STUFEN; st++) {
          g.beginPath();
          var leer = true;
          for (var j = 0; j < liste.length; j += 5) {
            var h = liste[j + 4];
            if (Math.min(STUFEN - 1, (h * STUFEN) | 0) !== st) continue;
            g.moveTo(liste[j], liste[j + 1]);
            g.lineTo(liste[j + 2], liste[j + 3]);
            leer = false;
          }
          if (leer) continue;
          var kraftS = blenden * (0.26 + st * 0.3);
          /* Zweimal: breit und schwach als Saum, schmal und hell als Kern.

             Den Saum bekommt nur, wer hell genug ist, um einen zu haben.
             Ein schwacher Stern ist ohnehin nur ein Hauch; ein zweiter Zug
             darunter ist an ihm nicht zu sehen — und die schwachen sind die
             grosse Mehrheit. Mit Saum fuer alle waren es bei vierfach
             gedrosselter Rechenleistung zwanzig Bilder je Sekunde, ohne
             wieder dreissig, und im Bild ist der Unterschied nicht zu
             finden. */
          if (st > 0) {
            g.lineWidth = art.breit * 2.6;
            g.strokeStyle = "rgba(" + art.farbe + "," + (kraftS * 0.24).toFixed(3) + ")";
            g.stroke();
          }
          g.lineWidth = art.breit;
          g.strokeStyle = "rgba(" + art.farbe + "," + kraftS.toFixed(3) + ")";
          g.stroke();
        }
      }
      if (funken) {
        for (var f2 = 0; f2 < funken.length; f2 += 4) {
          var fg = 7 + funken[f2 + 2] * 16;
          g.globalAlpha = blenden * funken[f2 + 2] * 0.5;
          g.drawImage(FUNKE[funken[f2 + 3]], funken[f2] - fg / 2, funken[f2 + 1] - fg / 2, fg, fg);
        }
        /* Und den allerhellsten eine Beugungsspinne. Ein einziger Stern mit
           Kreuz sagt "durch ein Objektiv gesehen"; vier Dutzend davon sagen
           "Weihnachten". */
        if (funken.length >= 4) {
          var sg = 26 + funken[2] * 46;
          g.globalAlpha = blenden * 0.34;
          g.drawImage(SPINNE, funken[0] - sg / 2, funken[1] - sg / 2, sg, sg);
        }
        g.globalAlpha = 1;
      }

      /* UNSCHARFE VORDERGRUNDPUNKTE.

         Staub so dicht vor der Linse, dass er nicht mehr scharf wird: eine
         weiche Scheibe mit hellerem Rand — genau das, was ein Objektiv aus
         einem Lichtpunkt ausserhalb der Schaerfeebene macht. Es ist der
         billigste Weg, einem Bild Tiefe zu geben, und einer der wenigen
         Effekte, die man nicht bewusst wahrnimmt und trotzdem vermisst. */
      for (var m = 0; m < 6; m++) {
        var mw = (m / 6) * 6.2832 + gefahren * 0.09 + m;
        var md = WEIT * (0.34 + 0.52 * ((m * 0.41) % 1));
        var mg = 38 + m * 13;
        g.globalAlpha = blenden * (0.1 - m * 0.008);
        g.drawImage(m % 2 ? BOKEH : BOKEHWARM,
          px + Math.cos(mw) * md - mg / 2, py + Math.sin(mw) * md - mg / 2, mg, mg);
      }
      g.globalAlpha = 1;

      /* DIE DRUCKWELLE beim Treffer — zwei Ringe, versetzt. */
      var w1 = glatt(T_TREFFER - 10, T_TREFFER + 780, t);
      if (w1 > 0 && w1 < 1) ring(px, py, w1, blenden, 1);
      var w2 = glatt(T_TREFFER + 90, T_TREFFER + 1080, t);
      if (w2 > 0 && w2 < 1) ring(px, py, w2, blenden * 0.55, 0.7);

      /* Der Koerper — beim Absprung mit echter Spur: dieselbe Marke an den
         Stellen, an denen sie in den letzten Bildern stand. */
      if (t > T_START) {
        for (var q = 7; q >= 1; q--) {
          var tq = t - q * 46;
          if (tq < T_START - 60) continue;
          var oq = ort(tq);
          koerper(tq, oq[0], oq[1], groesse(tq), blenden * 0.4 * (1 - q / 8));
        }
      }
      koerper(t, px, py, mass, blenden);

      /* Die Blende zuletzt: sie liegt vor allem, wie in einer Kamera. */
      var kraft = 0.25 + 0.75 * glatt(T_TREFFER - 200, T_TREFFER + 260, t)
        + 0.5 * glatt(T_HALT, T_LADEN, t);
      blende(px, py, klemm(kraft, 0, 1.6), RAD * 2 * mass, blenden * 0.9);

      /* DER BLITZ. Vom Treffer aus, mit hartem Abfall. */
      var f = Math.pow(1 - klemm((t - (T_TREFFER - 30)) / 340, 0, 1), 2.4)
        * (t > T_TREFFER - 60 ? 1 : 0);
      var f2 = Math.pow(1 - klemm((t - T_START) / 520, 0, 1), 2) * (t > T_START ? 0.5 : 0);
      var hell = Math.max(f, f2);
      if (hell > 0.002) {
        /* Ueber die Vorlage, nicht ueber einen frisch gebauten Verlauf: ein
           createRadialGradient je Bild baut den Farbverlauf jedes Mal neu
           auf, und das waehrend des lautesten Augenblicks der Szene. */
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = hell * blenden;
        var bg = WEIT * 3.2;
        g.drawImage(BLITZ, px - bg / 2, py - bg / 2, bg, bg);
        g.globalAlpha = 1;
      }

      /* Nachbereitung: Rand abdunkeln, dann Korn. In dieser Reihenfolge —
         Korn unter dem Schleier waere am Rand mit weggedunkelt, und genau
         dort soll es sitzen. */
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = blenden;
      if (nachher.length) {
        /* Reihum, damit das Korn flimmert. Ein stehendes Korn sieht aus wie
           Schmutz auf der Linse. */
        g.drawImage(nachher[(bildnummer++) % nachher.length], 0, 0, B, H);
      }
      g.globalAlpha = 1;

      kennung = window.requestAnimationFrame(bild);
    }

    function ring(px, py, u, a, dick) {
      var r = RAD * (0.5 + 7.5 * u);
      var st = Math.pow(1 - u, 2.6);
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = "rgba(206,226,255," + (0.4 * st * a).toFixed(3) + ")";
      g.lineWidth = Math.max(0.5, 4 * st * dick);
      g.beginPath(); g.arc(px, py, r, 0, 6.2832); g.stroke();
      g.strokeStyle = "rgba(120,170,255," + (0.16 * st * a).toFixed(3) + ")";
      g.lineWidth = Math.max(0.5, 14 * st * dick);
      g.beginPath(); g.arc(px, py, r * 0.93, 0, 6.2832); g.stroke();
    }

    function aufraeumen() {
      if (kennung) window.cancelAnimationFrame(kennung);
      kennung = 0;
      if (leinwand.parentNode) leinwand.parentNode.removeChild(leinwand);
      window.removeEventListener("resize", messen);
    }

    window.addEventListener("resize", messen);
    kennung = window.requestAnimationFrame(bild);

    return function abbrechen() { laeuft = false; aufraeumen(); };
  };
})();
