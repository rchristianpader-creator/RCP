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

  /* Wie lange der Flug dauert — nicht wie schnell er ist. Die
     Geschwindigkeit folgt aus Strecke durch Zeit und bleibt dann fest.
     Der Nachlauf ist die Strecke NACH der Ankunft, in der der Blitz
     deckt, waehrend die Seite den Deckel abzieht. */
  var FLUGZEIT = 6200;
  /* ZWEI AUFLOESUNGEN JE MARKE.

     Die Scheiben wurden bei 96 Pixeln gebacken und im nahen Vorbeiflug
     auf ueber siebenhundert Geraetepunkte gezogen — achtfach. Kein
     Bild ueberlebt das; "zu geringe Aufloesung" war schlicht richtig.

     Alle bei 512 zu backen ginge auch nicht: sechzehn Marken waeren
     siebzehn Megabyte, und das auf einem Telefon, das daneben die App
     aufbaut. Also zwei Stufen — klein fuer die Ferne, gross fuer die
     Nahzone —, und die grosse wird erst gebaut, wenn eine Marke wirklich
     naeher kommt, und wieder freigegeben, wenn sie vorbei ist. Weil die
     Gasse eine Prozession ist, sind nie mehr als zwei gleichzeitig
     gross. */
  var GROSS = 512;      /* die Glasscheibe und die eigenen Marken */
  var ZEICHENGR = 256;  /* die gezeichneten Zeichen darauf          */
  var FERNGR = 128;     /* fertige kleine Scheibe fuer die Ferne     */
  var DAUER_BAHN = 4600;   /* nur noch fuer die Vertraege nach aussen    */
  var DAUER_ENDE = 2000;

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

  /* Hier standen bokeh() und himmel(). Beide sind fort: der Nebel ist
     jetzt die Liquid-Ebene aus CSS, und der Linsenstaub, der bokeh()
     brauchte, ist gestrichen (gemessen 15 bis 31 Prozent der
     Szenenkosten fuer eine Deckkraft von 0,022 — der teuerste
     unsichtbare Posten, den die Suche gefunden hat). Mit ihnen faellt
     auch ihr Backen im Konstruktor weg, das bei sechsfacher Bremse
     allein 370 ms schwarzen Schirm gekostet hat. */

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

  /* ---- DIE EBENEN, UND WARUM SIE NICHT AUF DER LEINWAND LIEGEN ----

     Gemessen (Malkosten je Abschnitt, Ladebildschirm, Pixeldichte 3):
     die zwei ganzflaechigen Lagen — der Nebel und die Nachbereitung aus
     Randabdunklung und Korn — kosteten zusammen 52 % der Szenenkosten.
     Beide sind UNBEWEGT und wurden trotzdem sechzigmal je Sekunde neu
     gerastert, weil sie auf der Leinwand lagen. Das ist reine
     Fuellarbeit auf dem Hauptfaden, und sie ist der Grund fuer das
     Ruckeln.

     Jetzt liegen sie als eigene Ebenen um die Leinwand herum: der
     Kompositor bewegt sie auf der Grafikkarte, der Hauptfaden zahlt
     nichts. Und weil sie ohnehin neu gebaut werden mussten, sprechen
     sie ab jetzt die Sprache der App:

       LIQUID — dieselben drei driftenden Lichtfelder wie unter dem
       gewoehnlichen Ladebildschirm (.liquidfeld eins/zwei/drei in
       stil.css), in derselben helleren Palette (74,138,186 Stahlblau /
       196,138,76 Bronze / 126,90,190 Flieder) und mit derselben
       Bewegung: gross herein, quer durchs Bild, zur Ruhe.
       Die kosmische Fassung hatte das ausgeblendet — der Auftakt sah
       darum nach einer fremden App aus.

       ZUG — der Lichtzug, der schraeg ueber den ganzen Schirm faehrt.
       Das ist die Signatur von fluessigem Glas: Licht, das darueber
       streicht. Zweimal, wie im Original.

       FLUT — der Puls aus der Mitte, der nach aussen laeuft und
       ausklingt: die Bewegung, die man von Fluessigkeit erwartet, wenn
       etwas hineinfaellt.

       GLAS — darueber Randabdunklung und Korn. Das Korn wandert per
       transform, nicht per Neuzeichnung.

     Der Anstrich wird EINMAL je Seite eingehaengt, damit kosmos.js
     ohne Zutun der Seiten funktioniert (die Verwaltung hat ihr eigenes
     Regelwerk, die Liste ihres — eine gemeinsame dritte Stelle waere
     wieder eine Kopplung, an der etwas auseinanderlaeuft). */
  var ANSTRICH_DA = false;
  function anstrichEinhaengen() {
    if (ANSTRICH_DA || document.getElementById("kosmosAnstrich")) return;
    ANSTRICH_DA = true;
    var s = document.createElement("style");
    s.id = "kosmosAnstrich";
    s.textContent = [
      ".kosmosliquid,.kosmosglas{position:absolute;inset:0;pointer-events:none;overflow:hidden}",
      ".kosmosliquid{z-index:0;background:#0a0d0c}",
      ".kosmosleinwand{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%}",
      ".kosmosglas{z-index:2}",
      ".kosmosfeld{position:absolute;top:50%;left:50%;width:150%;aspect-ratio:1;",
      "margin:-75% 0 0 -75%;border-radius:50%;will-change:transform}",
      ".kosmosfeld.eins{background:radial-gradient(closest-side,",
      "rgba(74,138,186,.27) 0%,rgba(74,138,186,.1) 44%,rgba(74,138,186,0) 72%);",
      "animation:kosmosFeldEins 7s cubic-bezier(.32,.08,.18,1) both}",
      ".kosmosfeld.zwei{background:radial-gradient(closest-side,",
      "rgba(196,138,76,.24) 0%,rgba(196,138,76,.09) 44%,rgba(196,138,76,0) 72%);",
      "animation:kosmosFeldZwei 7s cubic-bezier(.32,.08,.18,1) both}",
      ".kosmosfeld.drei{background:radial-gradient(closest-side,",
      "rgba(126,90,190,.25) 0%,rgba(126,90,190,.1) 44%,rgba(126,90,190,0) 72%);",
      "animation:kosmosFeldDrei 7s cubic-bezier(.32,.08,.18,1) both}",
      "@keyframes kosmosFeldEins{0%{transform:translate3d(-34%,-26%,0) scale(.62)}",
      "55%{transform:translate3d(30%,26%,0) scale(1.34)}100%{transform:none}}",
      "@keyframes kosmosFeldZwei{0%{transform:translate3d(38%,30%,0) scale(.58)}",
      "55%{transform:translate3d(-28%,-22%,0) scale(1.28)}100%{transform:none}}",
      "@keyframes kosmosFeldDrei{0%{transform:translate3d(-8%,40%,0) scale(1.42)}",
      "55%{transform:translate3d(22%,-30%,0) scale(.66)}100%{transform:none}}",
      ".kosmoszug{position:absolute;top:-40%;bottom:-40%;left:-70%;width:55%;",
      "background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.04) 26%,",
      "rgba(255,255,255,.09) 44%,rgba(255,255,255,.17) 50%,rgba(255,255,255,.09) 56%,",
      "rgba(255,255,255,.04) 74%,rgba(255,255,255,0) 100%);will-change:transform;",
      "animation:kosmosZug 2.6s cubic-bezier(.5,0,.3,1) .3s 2 both}",
      "@keyframes kosmosZug{from{transform:rotate(14deg) translate3d(0,0,0)}",
      "to{transform:rotate(14deg) translate3d(430%,0,0)}}",
      ".kosmosflut{position:absolute;top:50%;left:50%;width:150%;aspect-ratio:1;",
      "margin:-75% 0 0 -75%;border-radius:50%;will-change:transform,opacity;",
      "background:radial-gradient(closest-side,rgba(255,255,255,0) 52%,",
      "rgba(214,232,255,.13) 68%,rgba(214,232,255,.04) 82%,rgba(214,232,255,0) 100%);",
      "animation:kosmosFlut 3.2s cubic-bezier(.22,.7,.2,1) .2s 2 both}",
      "@keyframes kosmosFlut{0%{transform:scale(.12);opacity:0}18%{opacity:1}",
      "100%{transform:scale(1.5);opacity:0}}",
      ".kosmosrand{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 46%,",
      "rgba(0,0,0,0) 30%,rgba(0,0,0,.3) 62%,rgba(2,4,4,.82) 100%)}",
      ".kosmoskorn{position:absolute;inset:-8%;opacity:.09;will-change:transform;",
      "animation:kosmosKorn .5s steps(1) infinite}",
      "@keyframes kosmosKorn{0%{transform:translate3d(0,0,0)}33%{transform:translate3d(-11px,7px,0)}",
      "66%{transform:translate3d(6px,-9px,0)}100%{transform:translate3d(0,0,0)}}",
      "@media (prefers-reduced-motion: reduce){.kosmosfeld,.kosmoszug,.kosmosflut,",
      ".kosmoskorn{animation:none}.kosmoszug,.kosmosflut{opacity:0}}"
    ].join("");
    document.head.appendChild(s);
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

  /* Die Glasscheibe — und zwar DAS GLAS DER APP, nicht ein eigenes.

     Die Karten-Logos der Liste sind fluessiges Glas: durchscheinend,
     ein Schimmer von oben links (148 Grad, weiss 0,22 auslaufend), eine
     hauchduenne Fuellung (weiss 0,10 auf 0,075), eine harte Lichtkante
     oben und eine dunkle unten (--glas-kante), aussen der 1px-Rand in
     --line. Genau diese Schichten stehen in stil.css — hier werden sie
     gemalt statt gestylt, Wert fuer Wert. Der erste Wurf hatte
     stattdessen deckende dunkle Kugeln mit eigenem Verlauf erfunden,
     und die sahen nach einer anderen App aus: "Es muss zum App Design
     passen." Ein Hauch Frost unter der Fuellung, damit Schrift und
     Logo vor dem bewegten Himmel lesbar bleiben — die Rolle, die in
     der App der ruhige Grund uebernimmt. */
  /* DAS GLAS IST BEI ALLEN GLEICH — also wird es EINMAL gebaut.

     Der erste Anlauf an der Aufloesung buk jede Marke einzeln bei 512
     Pixeln neu, samt ihrem Glas: Verlaeufe, Boegen, Randlichter, je
     Marke. Gemessen kostete das bei vierfacher Bremse 10,6 statt 5,8 ms
     je Bild, und einzelne Bilder bis 65 ms — der Bau fiel jeweils in
     EIN Bild. Dabei unterscheiden sich die Scheiben gar nicht im Glas,
     sondern nur im Zeichen darauf.

     Jetzt: eine geteilte Glasscheibe in voller Groesse, und das Zeichen
     wird beim Malen darueber gesetzt. Zwei Bilder statt einem, aber
     kein Backen mehr im Flug — und scharf ist beides. */
  function scheibenGrund(x, gr) {
    var m = gr / 2, r = m - gr * 0.03;
    x.save();
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.clip();
    /* Der Grund: dunkel und ruhig. Weniger Frost als vorher — er sass
       wie Milch vor dem Logo, und ein Zeichen hinter Milch wirkt
       billig, egal wie scharf es ist. */
    x.fillStyle = "rgba(10,13,12,0.34)";
    x.fillRect(0, 0, gr, gr);
    var fv = x.createLinearGradient(0, 0, 0, gr);
    fv.addColorStop(0, "rgba(255,255,255,0.07)");
    fv.addColorStop(1, "rgba(255,255,255,0.04)");
    x.fillStyle = fv;
    x.fillRect(0, 0, gr, gr);
    var sv = x.createLinearGradient(m - r, m - r, m + r * 0.45, m + r * 0.45);
    sv.addColorStop(0, "rgba(255,255,255,0.14)");
    sv.addColorStop(0.24, "rgba(255,255,255,0.07)");
    sv.addColorStop(0.5, "rgba(255,255,255,0.025)");
    sv.addColorStop(0.72, "rgba(255,255,255,0)");
    x.fillStyle = sv;
    x.fillRect(0, 0, gr, gr);
    x.restore();

    /* DER RAND — hier entscheidet sich "edel". Vorher lagen zwei volle
       Kreise uebereinander, beide gleich stark rundherum: das liest
       sich als aufgemalter Ring. Echtes Glas faengt Licht NICHT
       gleichmaessig — es sammelt es dort, wo die Woelbung zur Quelle
       zeigt, und laesst den Rest fast dunkel.

       Also: ein sehr feiner Grundrand, ueber den ein kurzer heller
       BOGEN oben links laeuft und ein zweiter, kuehler und schwaecher,
       unten rechts als Gegenlicht. Die Staerke haengt an der Groesse
       (0,006 der Kante), damit die Linie in jeder Aufloesung gleich
       fein aussieht — eine feste Pixelbreite waere auf der grossen
       Fassung ein Faden und auf der kleinen ein Balken. */
    var fein = Math.max(0.75, gr * 0.006);
    x.lineWidth = fein;
    x.strokeStyle = "rgba(255,255,255,0.09)";
    x.beginPath(); x.arc(m, m, r - fein / 2, 0, 6.2832); x.stroke();

    x.lineCap = "round";
    x.lineWidth = fein * 1.7;
    var bo = x.createLinearGradient(m - r, m - r, m + r * 0.3, m + r * 0.3);
    bo.addColorStop(0, "rgba(255,255,255,0)");
    bo.addColorStop(0.35, "rgba(255,255,255,0.62)");
    bo.addColorStop(1, "rgba(255,255,255,0)");
    x.strokeStyle = bo;
    x.beginPath();
    x.arc(m, m, r - fein, 3.5343, 5.6549);   /* oben links */
    x.stroke();

    x.lineWidth = fein * 1.2;
    var ge = x.createLinearGradient(m + r, m + r, m - r * 0.3, m - r * 0.3);
    ge.addColorStop(0, "rgba(190,226,216,0)");
    ge.addColorStop(0.4, "rgba(190,226,216,0.3)");
    ge.addColorStop(1, "rgba(190,226,216,0)");
    x.strokeStyle = ge;
    x.beginPath();
    x.arc(m, m, r - fein, 0.3927, 2.3562);   /* unten rechts */
    x.stroke();
    x.lineCap = "butt";
    return r;
  }

  /* Die Zeichen liegen ab jetzt auf DURCHSICHTIGEM Grund: das Glas
     kommt beim Malen darunter. */
  function textScheibe(gr, text) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    /* Schrift wie auf den Karten: 700, in --muted (#9aa5a2) — nicht
       reinweiss, das kennt die App an dieser Stelle nicht. */
    x.fillStyle = "#9aa5a2";
    x.font = "700 " + Math.round(gr * (text.length > 2 ? 0.28 : 0.34)) + "px -apple-system, 'Segoe UI', sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, gr / 2, gr / 2 + gr * 0.02);
    return c;
  }

  /* ---- DIE SINNBILDER ----

     "Du sollst die echten Logos nutzen und nicht Text." Fuer Aktien
     liefert der Logo-Dienst die Originale — aber Gold, Oel oder Bitcoin
     GEHOEREN niemandem, und ihre Scheiben trugen Buchstaben. Jetzt
     tragen sie ihre echten, ueberall bekannten Zeichen, gezeichnet
     statt geschrieben: Bitcoin als seine orangene Muenze, Ethereum als
     seine Raute, die Metalle als Barrenstapel im eigenen Metall, Oel
     als Tropfen, Gas als blaue Flamme, Korn als Aehre. Alles auf
     demselben App-Glas wie die uebrigen Scheiben. Schrift bleibt nur
     der aeusserste Rueckfall (Indizes, Unbekanntes). */
  function barrenScheibe(gr, hell, mitte, dunkel) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    function barren(mx, my, b, h) {
      var s = b * 0.14;
      x.beginPath();
      x.moveTo(mx - b / 2, my + h / 2);
      x.lineTo(mx - b / 2 + s, my - h / 2);
      x.lineTo(mx + b / 2 - s, my - h / 2);
      x.lineTo(mx + b / 2, my + h / 2);
      x.closePath();
      var v = x.createLinearGradient(0, my - h / 2, 0, my + h / 2);
      v.addColorStop(0, hell);
      v.addColorStop(0.55, mitte);
      v.addColorStop(1, dunkel);
      x.fillStyle = v;
      x.fill();
      x.lineWidth = Math.max(1, gr * 0.012);
      x.strokeStyle = "rgba(0,0,0,0.35)";
      x.stroke();
      /* Die Glanzkante oben — Metall ohne Licht ist Pappe. */
      x.beginPath();
      x.moveTo(mx - b / 2 + s, my - h / 2 + 1);
      x.lineTo(mx + b / 2 - s, my - h / 2 + 1);
      x.strokeStyle = "rgba(255,255,255,0.55)";
      x.stroke();
    }
    var b = gr * 0.34, h = gr * 0.15;
    barren(gr * 0.335, gr * 0.60, b, h);
    barren(gr * 0.665, gr * 0.60, b, h);
    barren(gr * 0.5, gr * 0.43, b, h);
    return c;
  }
  function muenzeBtc(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = gr * 0.3;
    var v = x.createRadialGradient(m - r * 0.4, m - r * 0.5, r * 0.1, m, m, r);
    v.addColorStop(0, "#f9a83b");
    v.addColorStop(0.6, "#f7931a");
    v.addColorStop(1, "#d4770e");
    x.beginPath(); x.arc(m, m, r, 0, 6.2832);
    x.fillStyle = v; x.fill();
    x.lineWidth = Math.max(1, gr * 0.014);
    x.strokeStyle = "rgba(0,0,0,0.25)";
    x.stroke();
    x.fillStyle = "#fff";
    x.font = "700 " + Math.round(r * 1.3) + "px -apple-system, 'Segoe UI', sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.save();
    x.translate(m, m + r * 0.04);
    x.rotate(0.14);
    x.fillText("₿", 0, 0);
    x.restore();
    return c;
  }
  function rauteEth(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2;
    var o = gr * 0.20, u = gr * 0.80, mitte = gr * 0.52, b = gr * 0.20;
    /* Die Raute: oben zwei Flaechen, unten zwei — die rechte jeweils
       dunkler, so traegt das flache Zeichen sein Volumen. */
    function flaeche(punkte, ton) {
      x.beginPath();
      x.moveTo(punkte[0][0], punkte[0][1]);
      for (var i = 1; i < punkte.length; i++) x.lineTo(punkte[i][0], punkte[i][1]);
      x.closePath();
      x.fillStyle = ton;
      x.fill();
    }
    flaeche([[m, o], [m - b, mitte], [m, mitte + gr * 0.06]], "rgba(226,232,236,0.9)");
    flaeche([[m, o], [m + b, mitte], [m, mitte + gr * 0.06]], "rgba(168,178,188,0.9)");
    flaeche([[m, mitte + gr * 0.1], [m - b * 0.86, mitte + gr * 0.035], [m, u]], "rgba(206,214,220,0.85)");
    flaeche([[m, mitte + gr * 0.1], [m + b * 0.86, mitte + gr * 0.035], [m, u]], "rgba(140,150,160,0.85)");
    return c;
  }
  function tropfenScheibe(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2;
    x.beginPath();
    x.moveTo(m, gr * 0.22);
    x.bezierCurveTo(m + gr * 0.02, gr * 0.34, m + gr * 0.2, gr * 0.44, m + gr * 0.2, gr * 0.58);
    x.bezierCurveTo(m + gr * 0.2, gr * 0.71, m + gr * 0.11, gr * 0.78, m, gr * 0.78);
    x.bezierCurveTo(m - gr * 0.11, gr * 0.78, m - gr * 0.2, gr * 0.71, m - gr * 0.2, gr * 0.58);
    x.bezierCurveTo(m - gr * 0.2, gr * 0.44, m - gr * 0.02, gr * 0.34, m, gr * 0.22);
    x.closePath();
    var v = x.createLinearGradient(0, gr * 0.22, 0, gr * 0.78);
    v.addColorStop(0, "#3a3f45");
    v.addColorStop(1, "#101316");
    x.fillStyle = v;
    x.fill();
    x.lineWidth = Math.max(1, gr * 0.012);
    x.strokeStyle = "rgba(255,255,255,0.3)";
    x.stroke();
    x.beginPath();
    x.ellipse(m - gr * 0.07, gr * 0.5, gr * 0.035, gr * 0.07, -0.5, 0, 6.2832);
    x.fillStyle = "rgba(255,255,255,0.45)";
    x.fill();
    return c;
  }
  function flammeScheibe(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2;
    function flamme(f, farbe1, farbe2) {
      x.beginPath();
      x.moveTo(m, gr * (0.5 - 0.28 * f));
      x.bezierCurveTo(m + gr * 0.06 * f, gr * (0.5 - 0.16 * f), m + gr * 0.2 * f, gr * (0.5 - 0.08 * f), m + gr * 0.17 * f, gr * (0.5 + 0.12 * f));
      x.bezierCurveTo(m + gr * 0.14 * f, gr * (0.5 + 0.26 * f), m - gr * 0.14 * f, gr * (0.5 + 0.26 * f), m - gr * 0.17 * f, gr * (0.5 + 0.12 * f));
      x.bezierCurveTo(m - gr * 0.2 * f, gr * (0.5 - 0.06 * f), m - gr * 0.04 * f, gr * (0.5 - 0.12 * f), m, gr * (0.5 - 0.28 * f));
      x.closePath();
      var v = x.createLinearGradient(0, gr * (0.5 - 0.28 * f), 0, gr * (0.5 + 0.26 * f));
      v.addColorStop(0, farbe1);
      v.addColorStop(1, farbe2);
      x.fillStyle = v;
      x.fill();
    }
    flamme(1, "#79c4ff", "#2a6fd6");
    flamme(0.55, "#d8efff", "#79c4ff");
    return c;
  }
  function aehreScheibe(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2;
    x.strokeStyle = "#c9a94e";
    x.lineWidth = Math.max(1.5, gr * 0.024);
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(m, gr * 0.78);
    x.lineTo(m, gr * 0.3);
    x.stroke();
    x.fillStyle = "#d9b45a";
    x.strokeStyle = "rgba(0,0,0,0.25)";
    x.lineWidth = 1;
    for (var i = 0; i < 4; i++) {
      var y = gr * (0.36 + i * 0.105);
      var seite;
      for (seite = -1; seite <= 1; seite += 2) {
        x.save();
        x.translate(m + seite * gr * 0.07, y);
        x.rotate(seite * 0.65);
        x.beginPath();
        x.ellipse(0, 0, gr * 0.075, gr * 0.038, 0, 0, 6.2832);
        x.fill();
        x.stroke();
        x.restore();
      }
    }
    x.save();
    x.translate(m, gr * 0.26);
    x.beginPath();
    x.ellipse(0, 0, gr * 0.04, gr * 0.075, 0, 0, 6.2832);
    x.fill();
    x.stroke();
    x.restore();
    return c;
  }
  /* Welches Sinnbild ein Wert traegt — oder null, dann faellt die Wahl
     weiter (Logo-Dienst fuer Aktien, Schrift als letzter Rueckfall). */
  function sinnBild(sym, gr) {
    if (sym === "BTC-USD") return muenzeBtc(gr);
    if (sym === "ETH-USD") return rauteEth(gr);
    if (sym === "GC=F") return barrenScheibe(gr, "#f2d47c", "#d8a83c", "#9a7016");
    if (sym === "SI=F") return barrenScheibe(gr, "#eceef2", "#bfc4cd", "#83899a");
    if (sym === "HG=F") return barrenScheibe(gr, "#eda76e", "#c47a3e", "#8a4d20");
    if (sym === "CL=F") return tropfenScheibe(gr);
    if (sym === "NG=F") return flammeScheibe(gr);
    if (sym === "ZC=F") return aehreScheibe(gr);
    return null;
  }

  /* Ein geladenes Logo wird EINMAL auf eine Leinwand gebrannt, statt
     bei jedem Bild neu gezeichnet zu werden.

     Der Anlauf davor setzte das <img> direkt in die Szene — in voller
     eigener Aufloesung, was richtig gedacht war. Nur rastert der
     Browser ein Bild bei jedem drawImage neu, wenn es skaliert wird,
     und bei einem SVG ohnehin. Einmal brennen kostet einen Augenblick
     und spart ihn danach sechzigmal je Sekunde.

     Das Seitenverhaeltnis bleibt, wie es ist — dieselbe Regel, die in
     der Liste als object-fit: contain steht. Der Grund bleibt
     durchsichtig: das Glas liegt beim Malen darunter. */
  /* Die FERNE Fassung: Glas und Zeichen fertig zusammengesetzt, klein.

     In der Ferne ist eine Marke zwanzig Pixel gross — dort zweimal zu
     malen (Glas, dann Zeichen) kostet doppelt, und zu sehen ist der
     Unterschied ohnehin nicht. Nah dagegen entscheidet die Schaerfe,
     und dort werden beide Lagen einzeln in voller Groesse gesetzt.

     Es ist derselbe Gedanke wie bei den Glasstufen, eine Ebene tiefer:
     Aufwand dorthin, wo das Auge ihn einloest. */
  function fernScheibe(glas, zeichen, gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    x.drawImage(glas, 0, 0, gr, gr);
    if (zeichen) {
      var zs = gr * 0.62;
      var zb = zeichen.naturalWidth || zeichen.width || 1;
      var zh = zeichen.naturalHeight || zeichen.height || 1;
      var f = Math.min(zs / zb, zs / zh);
      try { x.drawImage(zeichen, (gr - zb * f) / 2, (gr - zh * f) / 2, zb * f, zh * f); } catch (e) {}
    }
    return c;
  }

  function zeichenAusBild(bild, gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var bw = bild.naturalWidth || bild.width || 1;
    var bh = bild.naturalHeight || bild.height || 1;
    var f = Math.min(gr / bw, gr / bh);
    try { x.drawImage(bild, (gr - bw * f) / 2, (gr - bh * f) / 2, bw * f, bh * f); } catch (e) {}
    return c;
  }


  /* Die Fetch.ai-Marke, gezeichnet: drei mal drei Felder, Quadrate oben
     links zu Kreisen unten rechts — dieselbe Geometrie wie MARKEN in
     index.html, und derselbe Verlauf wie .logo.logo-marke in stil.css:
     radial bei 32 % / 26 %, hell zu mitte zu tief, Rand weiss 0,22.
     Die Farben kommen von der Seite; die Werte hier sind nur der Boden,
     falls sie fehlen. */
  function fetScheibe(gr, farben) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m - gr * 0.03;
    var v = x.createRadialGradient(gr * 0.32, gr * 0.26, r * 0.05, m, m, r * 1.25);
    v.addColorStop(0, (farben && farben[0]) || "#3c2fa8");
    v.addColorStop(0.46, (farben && farben[1]) || "#241b78");
    v.addColorStop(1, (farben && farben[2]) || "#141051");
    x.beginPath(); x.arc(m, m, r, 0, 6.2832);
    x.fillStyle = v; x.fill();

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
    x.lineWidth = Math.max(1, gr * 0.011);
    x.strokeStyle = "rgba(255,255,255,0.22)";
    x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, 6.2832); x.stroke();
    return c;
  }
  function rund(x, px, py, gr, rx) {
    x.beginPath();
    if (x.roundRect) x.roundRect(px, py, gr, gr, rx);
    else x.rect(px, py, gr, gr);
    x.fill();
  }

  /* Der Kern: die eigene Marke der App — als GERUNDETES QUADRAT, denn
     genau das ist das App-Zeichen (icon-192, ueberall in der App mit
     einer Ecke von rund einem Viertel der Kante). Der erste Wurf schnitt
     es in einen Kreis, und ein rundes App-Icon gibt es nirgends. Das
     Bild liegt im Vorrat des Service Workers — es ist sofort da. */
  function kernScheibe(gr, bild) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var r = gr * 0.03, s = gr - r * 2, e = gr * 0.235;
    x.fillStyle = "#0d1412";
    rundPfad(x, r, r, s, e);
    x.fill();
    if (bild) {
      x.save();
      rundPfad(x, r, r, s, e);
      x.clip();
      try { x.drawImage(bild, r, r, s, s); } catch (er) {}
      x.restore();
    }
    x.lineWidth = Math.max(1, gr * 0.012);
    var k = x.createLinearGradient(0, 0, 0, gr);
    k.addColorStop(0, "rgba(255,255,255,0.28)");
    k.addColorStop(0.35, "rgba(255,255,255,0.1)");
    k.addColorStop(1, "rgba(0,0,0,0.3)");
    x.strokeStyle = k;
    rundPfad(x, r + x.lineWidth / 2, r + x.lineWidth / 2, s - x.lineWidth, e);
    x.stroke();
    return c;
  }
  function rundPfad(x, px, py, s, e) {
    x.beginPath();
    if (x.roundRect) x.roundRect(px, py, s, s, e);
    else x.rect(px, py, s, s);
  }

  window.rcpKosmos = function (huelle, wahl) {
    wahl = wahl || {};
    /* Die Zeiten gehoeren der Szene, nicht dem Modul: die Verwaltungsseite
       laesst die Reise von selbst enden, der Auftakt der Liste bestellt
       den Abriss von aussen (bahn: sehr gross, dann ende()) — sein
       Fahrplan gehoert dem Ladebildschirm, nicht der Szene. */
    /* bahn und ende sind Fassungen von frueher, als die Uhr den Flug
       bestimmte. Jetzt bestimmt ihn die Strecke: die Szene ist fertig,
       wenn sie angekommen ist, und meldet das der Seite. Wer eine
       laengere oder kuerzere Reise will, sagt es ueber "flug" in
       Millisekunden — die Geschwindigkeit folgt daraus und bleibt dann
       fest. Die alten Namen werden noch entgegengenommen, damit die
       Seiten nicht in derselben Fassung mitwechseln muessen. */
    var flugZeit = klemm(wahl.flug || FLUGZEIT, 3000, 9000);
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
    anstrichEinhaengen();
    /* Unten das Liquid, in der Mitte die Leinwand, oben das Glas. */
    var unten = document.createElement("div");
    unten.className = "kosmosliquid";
    unten.setAttribute("aria-hidden", "true");
    unten.innerHTML = '<i class="kosmosfeld eins"></i><i class="kosmosfeld zwei"></i>' +
      '<i class="kosmosfeld drei"></i><i class="kosmosflut"></i>';
    huelle.appendChild(unten);

    leinwand.className = "kosmosleinwand";
    leinwand.setAttribute("aria-hidden", "true");
    huelle.appendChild(leinwand);

    var oben = document.createElement("div");
    oben.className = "kosmosglas";
    oben.setAttribute("aria-hidden", "true");
    oben.innerHTML = '<i class="kosmoszug"></i><i class="kosmoskorn"></i><i class="kosmosrand"></i>';
    huelle.appendChild(oben);

    /* Zwei Deckel uebereinander: die Pixeldichte (hoechstens 2, die
       Sparschaltung darf sie auf 1 druecken) UND die Gesamtflaeche der
       Leinwand — auf einem 4K-Fenster darf die Dichte auch unter 1
       fallen, weich ist bei einem Auftakt kein Fehler. */
    /* 1,5 — und zwar aus zwei Gruenden zugleich. Erstens die Kosten:
       Fuellarbeit waechst mit dem QUADRAT der Dichte, und gemessen
       haengen 87 Prozent der Bildzeit an der Flaeche. Zweitens die
       Schaerfe: ein Telefon mit Pixeldichte 3 zieht 1,5 mit dem glatten
       Faktor 2 hoch, 1,7 dagegen mit dem krummen 1,765 — das ist teurer
       UND unschaerfer. Ein krummer Faktor war nie eine gute Wahl. */
    var dichteDeckel = 1.5;
    var DPR = 1;
    var B = 0, H = 0, MX = 0, MY = 0, F = 700;
    var gemessen = false;

    var wuerfel = wuerfelWerk(20260825);
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
    /* Die Glasscheibe fuer alle Marken — in ZWEI Stufen.

       Eine einzige grosse Vorlage war der naechste Fehler: eine ferne
       Marke ist zwanzig Pixel gross, und zwanzig Pixel aus einer
       512er Textur zu filtern kostet mehr, als die ganze Scheibe wert
       ist. Gemessen sprang die Malzeit dadurch von 1,2 auf 3,5 ms.

       Also dasselbe, was jede Grafikkarte von selbst taete: eine kleine
       Vorlage fuer die Ferne, eine grosse fuer die Naehe. Es sind zwei
       Leinwaende fuer ALLE Marken zusammen — der Speicher merkt es
       nicht, und die Schaerfe bleibt dort, wo man sie sieht. */
    function glasBauen(gr) {
      var c = tafel(gr, gr);
      scheibenGrund(c.getContext("2d"), gr);
      return c;
    }
    var GLAS_FERN = glasBauen(128);
    var GLAS_NAH = null;
    var BLITZ = glut(256, [
      [0, "rgba(255,255,255,0.95)"],
      [0.1, "rgba(228,244,238,0.6)"],
      [0.26, "rgba(178,220,206,0.28)"],
      [0.55, "rgba(110,180,160,0.07)"],
      [1, "rgba(0,0,0,0)"]
    ]);
    /* Der Schattenhof: ein weicher dunkler Halo HINTER jeder Scheibe.
       Er hebt das Glas vom Nebel ab, wie es eine Kompositoerin mit
       einer Kontaktabdunklung taete — die eine stille Zutat, an der
       man teures Compositing von uebereinandergelegten Bildern
       unterscheidet. */
    var SCHATTEN = glut(256, [
      [0, "rgba(4,6,6,0.6)"],
      [0.5, "rgba(4,6,6,0.32)"],
      [0.78, "rgba(4,6,6,0.1)"],
      [1, "rgba(0,0,0,0)"]
    ]);

    function messen(erzwungen) {
      var nb = huelle.clientWidth || window.innerWidth;
      var nh = huelle.clientHeight || window.innerHeight;
      /* Nur bei echter Aenderung — der Browser feuert resize in Serien.
         WICHTIG: der Horcher unten ruft messen() OHNE Argument auf. Stand
         messen direkt am Horcher, bekam es das Ereignisobjekt als
         "erzwungen" — immer wahr —, und die Abkuerzung war ausgehebelt:
         jedes einzelne resize baute alles neu, gemessen 12,5 ms je
         Ereignis bei vierfacher Bremse, in Serien von fuenf. */
      if (!erzwungen && nb === B && nh === H && gemessen) return;
      B = nb; H = nh;
      gemessen = true;
      DPR = Math.min(window.devicePixelRatio || 1, dichteDeckel);
      /* Der Flaechendeckel greift jetzt frueher (2,4 statt 4,2 Millionen):
         auf einem gewoehnlichen Fenster am Schreibtisch kostete dieselbe
         Szene sonst das Dreifache an Fuellarbeit. */
      var deckel = Math.sqrt(2400000 / (B * H));
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
    }
    messen();
    /* Das Korn als Bild fuer die Glasebene — einmal gebacken, danach vom
       Kompositor bewegt. Auf der Leinwand kostete es je Bild einen
       Vollbild-Blit. */
    try {
      var kornbild = oben.querySelector(".kosmoskorn");
      if (kornbild) kornbild.style.backgroundImage = "url(" + KORN.toDataURL() + ")";
    } catch (e) {}

    /* Der Kern in ZWEI Stufen, aus demselben Grund wie das Glas: die
       ganze Reise ueber ist er ein Punkt von zwanzig Pixeln, und ihn
       dort aus einer 512er Vorlage herunterzufiltern kostet mehr als
       die Ankunft selbst. Erst im Anflug wird die grosse gebraucht —
       dann aber wirklich, denn dort fuellt er den Schirm. */
    var KERN_FERN = kernScheibe(128, null);
    var KERN_NAH = null;
    var kernBild = null;
    if (wahl.kern) {
      var kb = new Image();
      kb.onload = function () {
        kernBild = kb;
        KERN_FERN = kernScheibe(128, kb);
        if (KERN_NAH) { try { KERN_NAH.width = 0; KERN_NAH.height = 0; } catch (e) {} }
        KERN_NAH = null;
      };
      kb.onerror = function () {};
      kb.src = wahl.kern;
    }

    /* SPAETERE ARBEITEN, eine je Bild.

       Die grossen Vorlagen (Glas, Kern, die eigene Marke) kosten je ein
       paar Millisekunden — im Konstruktor alle zusammen erzeugten sie
       genau die Ausreisser von sechzig Millisekunden, die als Ruckler
       am Anfang zu sehen waren. Gebraucht werden sie erst im Anflug.
       Also stehen sie in einer Schlange und werden einzeln abgearbeitet,
       in den ruhigen Bildern der Reise. */
    var arbeiten = [];
    var spaeterBereit = false;
    function spaeter(tun) { arbeiten.push(tun); }
    function eineArbeit() {
      if (!spaeterBereit) {
        spaeterBereit = true;
        spaeter(function () { GLAS_NAH = glasBauen(GROSS); });
        spaeter(function () { KERN_NAH = kernScheibe(GROSS, kernBild); });
      }
      if (!arbeiten.length || sparsam) return;
      var a = arbeiten.shift();
      try { a(); } catch (e) {}
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
    var ANZ = Math.round(klemm((B * H) / 2000, 110, 260));
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
      /* In die Ankunft hinein tritt niemand mehr an: eine Formation,
         die im letzten Drittel des Anflugs erscheint, waere Unfug.
         Gemessen wird die verbleibende STRECKE, nicht die Uhr — bei
         fester Geschwindigkeit ist das dasselbe, nur ehrlicher. */
      if (angekommen || zielZ - fahrt < 2200) return;

      var eintraege = [];
      for (var i = 0; i < liste.length && i < 16; i++) {
        var p = liste[i];
        var sym = String(p.yahoo || p.badge || "").toUpperCase();
        var e = {
          sym: sym,
          gr0: 168 + ((i * 37) % 5) * 18,
          zeichen: null, eigen: null
        };
        /* Dieselbe Vorfahrt wie in der Liste: eine EIGENE Adresse geht
           immer vor. Ohne p.logo fragt fuer Krypto und Rohstoffe niemand
           den Dienst (ohneLogo), Fetch.ai behaelt seine Zeichnung. Und
           es wird GEZAEHLT, denn dieses Laden scheitert still.

           KEIN WECHSEL VOR DEM AUGE: eine Marke mit Bildweg betritt die
           Szene erst, wenn ihr echtes Logo da ist — vorher bleibt sie
           im Nebel verborgen und blendet dann weich ein. Vorher stand
           jede sofort mit ihrem Kuerzel da und sprang mitten im Flug
           auf das Logo um ("das ist doof", zu Recht). Nur wenn der
           Dienst gar nicht antwortet, faellt nach einer Frist das
           Kuerzel als Rueckfall — und bleibt dann; getauscht wird nie
           mehr, was man schon gesehen hat. Die Zeichen-Scheiben (Gold,
           Bitcoin, ...) sind sofort bereit: das Zeichen IST dort die
           echte Darstellung, wie auf den Karten. */
        /* Das ZEICHEN, nicht die fertige Scheibe: das Glas kommt beim
           Malen darunter. Fetch.ai bringt ihre eigene volle Scheibe mit
           (Indigo statt Glas) — sie ist der eine Sonderfall. */
        /* Die kleine Fassung sofort — sie ist billig und wird als
           erstes gebraucht. Die grosse steht in der Schlange: sechzehn
           Zeichen bei 256 Pixeln in EINEM Bild waren die letzten
           Ausreisser von sechzig Millisekunden. */
        (function (k, sy) {
          if (sy === "FET-USD") {
            k.fern = fetScheibe(FERNGR, wahl.farben);
            spaeter(function () { k.eigen = fetScheibe(GROSS, wahl.farben); });
          } else {
            k.klein = sinnBild(sy, 96) || textScheibe(96, zeichenFuer(sy) || "?");
            k.fern = fernScheibe(GLAS_FERN, k.klein, FERNGR);
            spaeter(function () {
              if (!k.zeichen) {
                k.zeichen = sinnBild(sy, ZEICHENGR) ||
                  textScheibe(ZEICHENGR, zeichenFuer(sy) || "?");
              }
            });
          }
        })(e, sym);
        e.bereit = true;
        if (p.logo || (sym && !ohneLogo(sym))) {
          e.bereit = false;
          e.frist = jetzt + 1400;
          window.rcpKosmosLogos = window.rcpKosmosLogos || { angefragt: 0, geladen: 0 };
          window.rcpKosmosLogos.angefragt++;
          (function (k, quelle) {
            var b = new Image();
            b.onload = function () {
              k.zeichen = zeichenAusBild(b, ZEICHENGR);
              if (k.fern) { try { k.fern.width = 0; k.fern.height = 0; } catch (e) {} }
              k.fern = fernScheibe(GLAS_FERN, k.zeichen, FERNGR);
              k.eigen = null;
              k.bereit = true;
              window.rcpKosmosLogos.geladen++;
            };
            b.onerror = function () { k.bereit = true; };
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
      tempoSetzen();
    }

    var laeuft = true, kennung = 0, t0 = 0, vorher = 0;
    /* DIE FAHRT. Ein einziger Wert: wie weit die Kamera in der Tiefe
       ist. Er waechst — immer, nie zurueck. Dazu eine leichte seitliche
       Drift und eine traege Rolle: eine Kamera, die haargenau auf der
       Achse klebt, sieht nach Werkzeug aus, nicht nach Hand. */
    var fahrt = 0, driftX = 0, driftY = 0;
    var markeDa = 0;
    /* Die eine Geschwindigkeit. Sie steht fest, sobald die Gasse steht:
       die ganze Strecke geteilt durch die Zeit, die der Flug dauern
       soll. eile ist der Tipp des Ungeduldigen — die EINZIGE Stelle,
       an der sich das Tempo aendert, und dort will es der Mensch. */
    var V = 1.2, eile = 1;
    function tempoSetzen() {
      V = Math.max(0.2, (zielZ - 70) / flugZeit);
    }
    tempoSetzen();
    var sparsam = false, dtSumme = 0, dtZahl = 0, messAb = 0, hoefe = true;
    var bildnummer = 0, gemeldet = false, angekommen = 0;
    var fertig = typeof wahl.fertig === "function" ? wahl.fertig : function () {};

    /* Die Spur fuer die Nachschau — auf einer Leinwand gibt es sonst
       nichts zu befragen. Je Bild:
       [0] Zeit  [1] Koerperzahl  [2] Fahrt (Tiefe der Kamera)
       [3] wie viele Marken schon an der Kamera vorbeigezogen sind
       [4] Bilddauer  [5] groesste gemalte Marke in Pixeln
       [6] Seitenverhaeltnis der gemalten Scheiben (muss 1 sein)
       [7] groesste Abweichung der
       Tiefenschritte vom Sollschritt (Symmetrie der Gasse, tausendstel) */
    var spur = [];
    window.rcpKosmosSpur = spur;
    /* Die MALZEIT je Bild — getrennt von der Bilddauer. Die Bilddauer
       misst den Takt des Bildschirms (nie unter 16,7 ms bei 60 Hz) und
       sagt ueber "90 Bilder mindestens" gar nichts. Die Malzeit sagt,
       was moeglich WAERE: unter 11 ms sind 90 Bilder/s drin, unter 8,3
       auch 120. Und "kein Stoppen" ist eine Aussage ueber das
       SCHLIMMSTE Bild, nicht ueber den Durchschnitt — deshalb wird
       jedes einzelne notiert. */
    var malzeit = [];
    window.rcpKosmosMalzeit = malzeit;

    function bild(jetzt) {
      if (!laeuft) return;
      var malAb = performance.now();
      if (!t0) { t0 = jetzt; vorher = jetzt; }
      var t = jetzt - t0;
      var dtRoh = jetzt - vorher;
      var dt = klemm(dtRoh, 0, 64);
      vorher = jetzt;
      /* KEIN STILLSTAND MEHR. Frueher hoerte die Szene hier auf zu
         malen und meldete DANN erst "fertig" — und der Deckel braucht
         zum Ausblenden 610 ms. Die Leinwand hing also noch eine gute
         halbe Sekunde im Bild und zeigte ihr letztes, EINGEFRORENES
         Bild. Gemessen: 597 ms Stillstand, genau vor dem Erscheinen
         der Liste.

         Jetzt wird "fertig" gemeldet, aber WEITERGEMALT: die Fahrt
         zieht ueber das Ziel hinaus, der Blitz waechst zu Weiss, und
         waehrend der Deckel durchsichtig wird, bewegt sich das Bild
         bis zum letzten Augenblick. Schluss ist erst, wenn die Seite
         abbrechen() ruft — oder nach einer Notfrist. */
      /* FERTIG IST, WER ANGEKOMMEN IST — nicht, wessen Uhr abgelaufen
         ist. Bei fester Geschwindigkeit richtet sich die Dauer nach der
         Strecke; wer hier nach der Uhr abbraeche, schnitte genau das
         ab, was der Flug erreichen sollte. Danach wird WEITERGEMALT,
         bis die Seite abbrechen() ruft: sonst haenge die Leinwand mit
         einem eingefrorenen Bild im Schirm, waehrend der Deckel
         ausblendet (gemessen waren das einmal 597 ms Stillstand). */
      if (!angekommen && zielZ - fahrt <= 70) {
        angekommen = t;
        if (!gemeldet) { gemeldet = true; fertig(); }
      }
      if (angekommen && t > angekommen + 2600) {
        laeuft = false;
        aufraeumen();
        return;
      }

      /* DIE SPARSCHALTUNG URTEILT NACH ZEIT, NICHT NACH BILDERN.

         Das war der zweitgroesste Fund: sie sammelte 24 BILDER ab
         t > 400 ms — und auf einem langsamen Geraet dauern 24 Bilder
         eben 1,8 Sekunden. Gemessen griff sie erst nach 2,2 s, also
         nachdem 42 Prozent der Szene mit 16 Bildern je Sekunde
         durchgeruckelt waren. Ein Regler, der genau dort am laengsten
         wartet, wo er gebraucht wird, regelt nichts.

         Jetzt: ab 150 ms sammeln, und entscheiden, sobald ENTWEDER
         zehn Bilder ODER 260 ms beisammen sind — was zuerst eintritt.
         Auf einem schnellen Geraet urteilen die zehn Bilder (und finden
         nichts), auf einem langsamen die 260 ms (und greifen sofort).
         Gemessen brachte das allein 27 Prozent mehr Bilder bei
         vierfacher und 57 Prozent bei sechsfacher Bremse.

         Gerechnet wird mit der UNGEKLEMMTEN Bilddauer: die Fahrt
         braucht das Klemmen bei 64 ms (ein Sprung von 190 ms darf die
         Kamera nicht schleudern), die Regelung darf davon aber nicht
         geblendet werden — mit dem Deckel kann sie ein Geraet bei 64 ms
         nicht von einem bei 190 unterscheiden. */
      if (!sparsam && t > 150) {
        if (!messAb) messAb = t;
        dtSumme += dtRoh; dtZahl++;
        if (dtZahl >= 10 || t - messAb >= 260) {
          if (dtSumme / dtZahl > 12) {
            sparsam = true;
            sterne.length = Math.floor(sterne.length / 2);
            hoefe = false;
            if (DPR > 1) { dichteDeckel = 1; messen(true); }
          }
          dtSumme = 0; dtZahl = 0; messAb = t;
        }
      }

      /* "abriss" ist kein Zeitabschnitt mehr, sondern die NAEHE zum
         Ziel: er steuert nur noch, wie hell es blitzt und wie schnell
         sich die Scheiben drehen — nicht mehr die Fahrt. */
      eineArbeit();
      var abriss = klemm((1400 - (zielZ - fahrt)) / 1330, 0, 1) +
        (angekommen ? klemm((t - angekommen) / 700, 0, 0.45) : 0);
      var blenden = glatt(0, 500, t);

      /* DIE FAHRT — EINE EINZIGE, GLEICHBLEIBENDE GESCHWINDIGKEIT.

         Vorher hatte der Flug drei Tempi und einen Stillstand: sanftes
         Anfahren ueber eine Sekunde, Reisegeschwindigkeit, dann zum
         Ende hin anfliegen — HALTEN — stuerzen. Das war als Dramaturgie
         gedacht und ist als Gezappel angekommen. Jetzt gilt eine Zahl
         fuer den ganzen Weg: V Einheiten je Millisekunde, vom ersten
         Bild bis zur Ankunft, ohne Anfahren, ohne Pause, ohne Sturz.

         Das Auge sieht trotzdem keine Monotonie, und zwar aus einem
         ehrlichen Grund: bei GLEICHER Geschwindigkeit waechst alles
         schneller, je naeher es kommt (die Groesse geht mit eins durch
         Abstand). Die Beschleunigung, die man wahrnimmt, ist also die
         der Perspektive — die einzige, die nicht nach Regler aussieht.

         Und weil die Geschwindigkeit fest ist, richtet sich die DAUER
         nach der Strecke, nicht umgekehrt: die Szene ist fertig, wenn
         sie angekommen ist. Ein zu frueh bestellter Abriss verkuerzt
         darum nicht mehr die Fahrt, sondern nur noch den Weg, der noch
         vor ihr liegt — geschnitten wird nichts. */
      fahrt += V * eile * dt;

      /* Der Schriftzug haengt an der NAEHE zum Zeichen, nicht mehr an
         einem Abschnitt der Uhr: er tritt zu, wenn das Zeichen gross
         genug steht, und geht, wenn man hineinfaehrt. */
      var zielAb = zielZ - fahrt;
      /* Zu, solange das Zeichen weit ist (ueber 2100), auf, sobald es
         nah steht (unter 1500), und wieder zu, wenn man hineinfaehrt
         (unter 330). glatt() steigt IMMER von a nach b — fuer ein
         Zunehmen bei ABNEHMENDEM Abstand muss der Wert also abgezogen
         werden. Andersherum stand der Name die ganze Reise ueber im
         Bild, vom ersten Augenblick an. */
      markeDa = (1 - glatt(1500, 2100, zielAb)) * glatt(150, 330, zielAb);

      driftX += 0.010 * glatt(500, 2200, t) * (1 - abriss) * dt;
      driftY -= 0.006 * glatt(500, 2200, t) * (1 - abriss) * dt;
      var camX = klemm(driftX, -55, 55);
      var camY = klemm(driftY, -40, 40);
      var roll = -0.035 + 0.065 * Math.min(1, t / 5600);
      /* Das Rad der Helix: die ganze Gasse dreht traege um die Achse
         weiter — langsam genug, dass man es nicht benennen kann. */
      var rad = t * 0.00013;

      /* KEIN Nebel mehr auf der Leinwand. Er liegt als Liquid-Ebene
         darunter und wird vom Kompositor bewegt — gemessen war er samt
         Halbpuffer der teuerste Posten der Szene. Die Leinwand traegt
         ab hier nur noch, was je Bild wirklich neu gerechnet werden
         muss: Sterne, Scheiben, Kern, Schrift, Blitz. Sie beginnt
         DURCHSICHTIG; was darunter liegt, scheint hindurch. */
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, B, H);
      /* Die Filterqualitaet beim Skalieren. Der Browser rechnet
         standardmaessig aufwendig (mehrere Zwischenstufen) — bei einer
         Szene, die sich bewegt und Korn ueber sich hat, ist der
         Unterschied nicht zu sehen, die Rechnung aber schon. Seit die
         Vorlagen in passenden Stufen vorliegen, wird ohnehin kaum noch
         gestreckt; teuer war gerade das Herunterfiltern aus grossen
         Texturen. */
      g.imageSmoothingQuality = "low";

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
          if (hell > 0.55 && !sparsam) funken.push(sx2, sy2, hell);
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
          g.strokeStyle = "rgba(" + art.farbe + "," + (blenden * (0.12 + stq * 0.15)).toFixed(3) + ")";
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
          g.fillStyle = "rgba(" + art.farbe + "," + (blenden * (0.16 + stp * 0.16)).toFixed(3) + ")";
          g.fill();
        }
      }
      /* Das weiche Glimmen der hellen Punkte — der Unterschied zwischen
         Pixeln und Sternen. */
      for (var fu = 0; fu < funken.length; fu += 3) {
        var fh = funken[fu + 2];
        g.globalAlpha = blenden * (fh - 0.55) * 0.42;
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
        var kz = kp.z - fahrt;
        if (kz < 70) {
          if (!kp.vorbei) { kp.vorbei = true; vorbeiZahl++; }
          continue;
        }
        if (kz > 5600) continue;
        /* Wer auf sein Logo wartet, bleibt unsichtbar — bis es da ist
           oder die Frist faellt. kp.auf ist der Moment des Auftritts:
           ab ihm blendet die Scheibe weich ein, und ab ihm wird ihr
           Bild nie mehr getauscht. */
        if (!kp.bereit && t > kp.frist) kp.bereit = true;
        if (!kp.bereit) continue;
        if (kp.auf == null) kp.auf = t;
        kp.kz = kz;
        reihe.push(kp);
      }
      var kernZ = zielZ - fahrt;
      var kernDran = kernZ > 70;
      reihe.sort(function (a, b) { return b.kz - a.kz; });

      var maxGemalt = 0, formVerhaeltnis = 1;

      function kernMalen() {
        var kf = F / kernZ;
        var kx = MX + (0 - camX) * kf;
        var ky = MY + (0 - camY) * kf;
        var kg = klemm(300 * kf, 8, Math.max(B, H) * 1.15);
        var kd = blenden * klemm((6400 - kernZ) / 3800, 0, 1);
        var puls = 1 + 0.03 * Math.sin(t * 0.0021);
        /* Die Lichter des Kerns sind GEDECKELT, nicht mitwachsend: als
           das Zeichen schirmfuellend wurde, skalierten Glut, Streifen
           und Spinne mit — Blits von fuenftausend Pixeln Breite, jedes
           Bild, und die Drossel-Messung brach von 60 auf 20 ein. Was
           breiter ist als der Schirm, malt ohnehin nur Unsichtbares. */
        var GRENZE = Math.max(B, H);
        g.globalCompositeOperation = "lighter";
        if (kg < GRENZE * 0.75) {
          g.globalAlpha = kd * 0.42;
          var gg2 = Math.min(kg * 3.0 * puls, GRENZE * 0.95);
          g.drawImage(GLUT, kx - gg2 / 2, ky - gg2 / 2, gg2, gg2);
        }
        g.globalAlpha = kd * 0.18;
        var bb = Math.min(kg * 6 * (0.7 + 0.3 * puls), GRENZE * 1.15);
        var bh2 = Math.min(kg * 0.32, GRENZE * 0.09);
        g.drawImage(STREIF, kx - bb / 2, ky - bh2 / 2, bb, bh2);
        if (kg > 14) {
          g.globalAlpha = kd;
          g.globalCompositeOperation = "source-over";
          g.drawImage((kg > 150 && KERN_NAH && !sparsam) ? KERN_NAH : KERN_FERN,
            kx - kg / 2, ky - kg / 2, kg, kg);
          if (kg < GRENZE * 0.55) {
            g.globalCompositeOperation = "lighter";
            g.globalAlpha = kd * 0.32;
            var sg = Math.min(kg * 2.2, GRENZE * 0.85);
            g.drawImage(SPINNE, kx - sg / 2, ky - sg / 2, sg, sg);
          }
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
        if (gr > Math.min(B, H) * 1.35) gr = Math.min(B, H) * 1.35;
        /* Das Licht der Tiefe: fern im Nebel schwach, nah voll — und
           GANZ nah loest die Scheibe sich auf, statt hart am Bildrand
           zu zerreissen: die Kamera fliegt durch sie hindurch. */
        var fern = klemm((5200 - kp2.kz) / 3300, 0, 1);
        var nah = klemm((kp2.kz - 110) / 320, 0, 1);
        var deck = blenden * Math.pow(fern, 0.85) * nah * glatt(kp2.auf, kp2.auf + 320, t);
        if (deck <= 0.01) continue;
        if (gr > maxGemalt && deck > 0.2) maxGemalt = gr;
        /* GESEHEN heisst: ab jetzt saehe man einen Bildtausch. Ein Logo,
           das frueher eintrifft — die Scheibe noch klein und matt im
           Nebel —, darf lautlos einwechseln; danach nie mehr.

           Der Merker hiess einmal "gross" — und seit "gross" die grosse
           Scheibe ist, setzte er sie auf true und drawImage bekam einen
           Wahrheitswert statt eines Bildes. Zwei Dinge, ein Name. */
        if (!kp2.gesehen && (gr > 90 || deck > 0.55)) kp2.gesehen = true;

        /* NUR der Schattenhof — das Glimmen ist weg.

           Weich leuchtende Hoefe um jedes Ding sind der sicherste Weg
           zu "billig": sie verwaschen die Kante, und eine verwaschene
           Kante liest sich als schlecht freigestellt. Teuer wirkt das
           Gegenteil — harte Kante, klare Trennung, und die Tiefe kommt
           aus der KONTAKTABDUNKLUNG hinter dem Ding, nicht aus Licht
           davor. Das grosse Leuchten hat in dieser Szene genau eine
           Quelle: das App-Zeichen am Ende. */
        /* 1,15 statt 1,5: die Flaeche faellt auf 59 Prozent, und der
           Hof traegt ohnehin nur an der Kante Information — sein
           Aussenrand ist bei Deckkraft null. Und ab einer Scheibe, die
           mehr als sechs Zehntel des Schirms fuellt, faellt er ganz
           weg: dort liegt der ganze Hof hinter der Scheibe. */
        if (hoefe && gr < Math.min(B, H) * 0.6) {
          g.globalCompositeOperation = "source-over";
          g.globalAlpha = deck * 0.7;
          var sh = gr * 1.15;
          g.drawImage(SCHATTEN, px3 - sh / 2, py3 - sh / 2, sh, sh);
        }

        /* DIE MARKE BLEIBT RUND. Hier stand die Muenzdrehung: die
           Breite folgte dem Kosinus eines eigenen Drehwinkels, die
           Scheibe wurde also schmalgezogen und wieder breit. Als
           Bewegung war das gedacht, gesehen hat man etwas anderes —
           ein Logo, das die Form wechselt. Ein Zeichen darf sich
           bewegen, aber es darf nicht anders aussehen: es ist die eine
           Sache im Bild, die der Mensch wiedererkennen soll.

           Quadratisch gemalt, also im Seitenverhaeltnis eins zu eins,
           genau wie die Vorlage. Groesse und Helligkeit kommen allein
           aus der Tiefe. */
        /* Breite und Hoehe als eigene Werte — und GENAU DIESE beiden
           gehen sowohl in das Malen als auch in die Spur. Stuende in
           der Spur eine Rechnung fuer sich (gr durch gr), waere sie
           immer eins und koennte den Fehler nicht finden, den sie zu
           pruefen behauptet. So teilen Malen und Nachschau dieselbe
           Quelle: wer hier je wieder ein Schmalziehen einbaut, sieht
           es sofort in der Spur. */
        var malBreit = gr, malHoch = gr;
        g.globalAlpha = deck;
        g.globalCompositeOperation = "source-over";
        if ((gr <= 150 || sparsam || !GLAS_NAH || (!kp2.zeichen && !kp2.eigen)) && kp2.fern) {
          /* FERN: eine fertige Scheibe, ein Malbefehl. */
          g.drawImage(kp2.fern, px3 - malBreit / 2, py3 - malHoch / 2, malBreit, malHoch);
        } else if (kp2.eigen && !sparsam) {
          /* Eine eigene volle Scheibe (Fetch.ai). */
          g.drawImage(kp2.eigen, px3 - malBreit / 2, py3 - malHoch / 2, malBreit, malHoch);
        } else {
          /* Erst das geteilte Glas, dann das Zeichen darauf — mit
             demselben Seitenverhaeltnis wie in der Liste (dort steht
             dafuer object-fit: contain). Ein breites Wortlogo in ein
             Quadrat gepresst ist sofort als falsch zu erkennen. */
          g.drawImage(GLAS_NAH, px3 - malBreit / 2, py3 - malHoch / 2, malBreit, malHoch);
          var zn = kp2.zeichen;
          if (zn) {
            var zs = gr * 0.62;
            var zb = zn.naturalWidth || zn.width || 1;
            var zh = zn.naturalHeight || zn.height || 1;
            var zf = Math.min(zs / zb, zs / zh);
            try {
              g.drawImage(zn, px3 - zb * zf / 2, py3 - zh * zf / 2, zb * zf, zh * zf);
            } catch (e) {}
          }
        }
        g.globalAlpha = 1;
        if (malHoch > 0) {
          var vh = malBreit / malHoch;
          if (Math.abs(vh - 1) > Math.abs(formVerhaeltnis - 1)) {
            formVerhaeltnis = Math.round(vh * 1000) / 1000;
          }
        }
      }
      if (kernDran) kernMalen();

      /* ---- DER SCHRIFTZUG ----

         Die kosmische Fassung blendete .auftakt-mitte aus — und damit
         verschwand der Name der App spurlos. Ein Auftritt ohne Namen
         ist Dekoration; ein Markenauftritt endet mit dem Wort. Er
         steht unter dem Zeichen, in der Schrift des Ladebildschirms
         (700, -0,4 px Laufweite), tritt im Halt zu und faehrt beim
         Eintauchen mit dem Zeichen aus dem Bild. */
      if (markeDa > 0.004) {
        var kfM = F / Math.max(120, zielZ - fahrt);
        var kgM = klemm(300 * kfM, 8, Math.max(B, H) * 1.15);
        var schrift = klemm(Math.min(B, H) * 0.068, 15, 34);
        var linie = MY + kgM * 0.5 + schrift * 1.55;
        var mit = klemm(1 - markeDa, 0, 1);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = markeDa;
        g.textAlign = "center";
        g.textBaseline = "middle";
        try { g.letterSpacing = "-0.4px"; } catch (e) {}
        g.font = "700 " + Math.round(schrift) + "px -apple-system, 'Segoe UI', Roboto, sans-serif";
        g.fillStyle = "#ffffff";
        g.fillText("Aktien-Liste", MX, linie + mit * 10);
        try { g.letterSpacing = "0px"; } catch (e) {}
        g.globalAlpha = 1;
      }

      /* Der Blitz der Ankunft — er kommt aus der NAEHE, nicht aus der
         Uhr: je dichter die Kamera am Zeichen, desto heller, und im
         Moment des Eintauchens deckt er den Schnitt zur Seite. Vorher
         hing er am Abriss-Fortschritt und zuendete auch dann, wenn das
         Zeichen noch weit war — ein Blitz ohne Ursache. */
      if (abriss > 0) {
        var naehe = klemm((1150 - (zielZ - fahrt)) / 1050, 0, 1);
        /* Im Nachlauf (abriss > 1) zieht der Blitz weiter an, bis er
           deckt — so hat das Auge bis zum letzten Bild Bewegung, und
           der Uebergang zur Seite ist ein Aufloesen statt eines
           Standbilds. */
        var hell2 = Math.pow(naehe, 2.4) * 0.9 * (1 + 1.6 * Math.max(0, abriss - 1));
        if (hell2 > 0.004) {
          g.globalCompositeOperation = "lighter";
          g.globalAlpha = hell2 * blenden;
          var bg = Math.max(B, H) * 1.05;
          g.drawImage(BLITZ, MX - bg / 2, MY - bg / 2, bg, bg);
          g.globalAlpha = 1;
        }
      }

      /* Randabdunklung und Korn liegen als Glasebene DARUEBER, nicht
         mehr als Vollbild-Blit je Bild. */

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
          formVerhaeltnis,
          Math.round(symAbw * 1000)]);
      }

      /* SPUELEN, aber nur auf dem Prueftisch. Chromium zeichnet die
         Befehle der 2D-Leinwand nur auf und rastert sie erst spaeter —
         wer im Rueckruf misst, sieht rund ein Zehntel der Wahrheit. Ein
         Lesen eines einzigen Punktes erzwingt das Rastern und macht die
         Zahl ehrlich. Im Betrieb bleibt es aus: es waere selbst teuer,
         und dort wird nicht gemessen. */
      if (window.rcpKosmosSpuelen) { try { g.getImageData(0, 0, 1, 1); } catch (e) {} }
      if (malzeit.length < 900) malzeit.push(Math.round((performance.now() - malAb) * 100) / 100);
      kennung = window.requestAnimationFrame(bild);
    }

    if (wahl.positionen) planetenSetzen(wahl.positionen);

    /* Eigene Function, KEIN direktes messen: der Horcher wuerde sonst
       das Ereignisobjekt als "erzwungen" durchreichen (immer wahr) und
       damit genau die Abkuerzung aushebeln, die Serien abfangen soll. */
    function beiGroesse() { messen(); }

    function aufraeumen() {
      if (kennung) window.cancelAnimationFrame(kennung);
      kennung = 0;
      window.removeEventListener("resize", beiGroesse);
    }

    window.addEventListener("resize", beiGroesse);
    kennung = window.requestAnimationFrame(bild);

    return {
      planeten: planetenSetzen,
      /* Zum Abriss springen — der Tipp des Ungeduldigen, und der Abflug
         des Ladebildschirms. Fruehestens ab Sekunde eins, aber ein zu
         FRUEHER Wunsch wird VORGEMERKT, nicht verworfen: seit der
         Deckel der Liste auf das fertig der Szene wartet, waere ein
         verschluckter Wunsch eine Szene, die niemals endet — und die
         Notbremse schnitte sie dann doch wieder mitten im Flug ab. */
      /* Der Tipp des Ungeduldigen — und die EINZIGE Stelle, an der
         sich das Tempo aendert. Der Mensch hat es hier ausdruecklich
         verlangt, also darf es sich aendern; von selbst tut es das
         nirgends mehr. Fruehestens ab Sekunde eins, sonst nimmt ein
         versehentliches Tippen beim Oeffnen die ganze Szene mit. */
      ende: function () {
        if (!laeuft) return;
        var t = t0 ? (performance.now() - t0) : 0;
        if (t < 1000) return;
        eile = 3.2;
      },
      abbrechen: function () { laeuft = false; aufraeumen(); }
    };
  };
})();
