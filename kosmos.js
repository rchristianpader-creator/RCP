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
  /* WIE VIEL DER SCHEIBE DAS ZEICHEN EINNIMMT.

     Stand auf 0,62 — und auf dem Bild sass das Logo als kleiner Fleck
     mitten in einem grossen Glaskreis, statt darin zu SITZEN. Gemeldet
     als "die Logos sollen in einem Liquid-Glass-Kreis drin sein". Mit
     0,7 fuellt es den Kreis, wie es die App auf ihren Karten tut, und
     ganz nebenbei bekommt es dreizehn Prozent mehr Kantenlaenge — also
     mehr Punkte fuer dieselbe Marke, was der Schaerfe zugutekommt.
     Weiter darf es nicht: der Glasrand braucht Luft, sonst klebt das
     Zeichen an ihm. */
  var ZEICHENANTEIL = 0.7;
  var MITTELGR = 288;   /* die Stufe zwischen fern und nah — ohne sie */
                        /* wird aus 512 auf ein Fuenftel verkleinert  */
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
      /* KEIN LICHTBALKEN MEHR.

         Hier zog ein diagonaler weisser Streifen zweimal ueber den
         ganzen Schirm — von oben nach unten, quer durch alles. Er war
         das Lauteste im Bild und hatte mit der Szene nichts zu tun: er
         kam nicht aus dem Kern, er ging nicht auf ihn zu, er lief
         einfach durch. Bestellt ist statt seiner das RUNDE Licht, das
         die Szene ohnehin schon hat.

         Also traegt die Flut den Auftritt allein — ein Ring, der aus
         der Mitte waechst, also von dort, wo das App-Zeichen liegt und
         wohin die Reise geht. Sie ist dafuer etwas kraeftiger und
         langsamer als vorher, weil sie jetzt nicht mehr die zweite
         Stimme ist, sondern die einzige. */
      ".kosmosflut{position:absolute;top:50%;left:50%;width:150%;aspect-ratio:1;",
      "margin:-75% 0 0 -75%;border-radius:50%;will-change:transform,opacity;",
      "background:radial-gradient(closest-side,rgba(255,255,255,0) 48%,",
      "rgba(214,232,255,.17) 66%,rgba(214,232,255,.06) 82%,rgba(214,232,255,0) 100%);",
      "animation:kosmosFlut 4.2s cubic-bezier(.22,.7,.2,1) .2s 2 both}",
      "@keyframes kosmosFlut{0%{transform:scale(.1);opacity:0}16%{opacity:1}",
      "100%{transform:scale(1.6);opacity:0}}",
      /* DER BLITZ ALS EBENE, nicht als Vollbild-Blit.

         Er lag als drawImage auf der Leinwand: eine schirmfuellende
         additive Fuellung, JEDES Bild, ueber den ganzen Anflug und den
         Nachlauf — gemessen 1,7 der 8,2 Millisekunden bei der Ankunft.
         Dieselbe Erkenntnis wie beim Nebel, nur eine Ebene weiter oben:
         was sich nur in der Helligkeit aendert, gehoert dem Kompositor.
         Die Deckkraft je Bild zu setzen kostet den Hauptfaden nichts;
         sie zu MALEN kostet ihn ein volles Bild.

         Der Verlauf ist derselbe wie die alte Vorlage — nur wird jetzt
         normal darueber geblendet statt additiv addiert. Auf beinahe
         schwarzem Grund ist das dasselbe Licht. */
      /* GLUT UND SPINNE ALS EBENEN — derselbe Grund wie beim Blitz.

         Beides sind weiche Lichtscheiben um das App-Zeichen, die sich
         allein in Groesse und Helligkeit aendern. Als Vollbild-Blit auf
         der Leinwand waren sie zusammen 4,6 der 10,8 Millisekunden bei
         der Ankunft — der groesste Posten, den die Szene hatte. Als
         Ebene kosten sie den Hauptfaden nichts: Verschiebung, Groesse
         und Deckkraft sind genau die drei Dinge, die der Kompositor
         allein kann.

         Sie sitzen mit fester Kantenlaenge von 200 Punkten da und
         werden ueber transform an ihren Ort und auf ihre Groesse
         gebracht — so bleibt der Verlauf immer derselbe, und es wird
         nie eine Vorlage hochgerechnet.

         Die GLUT liegt UNTER der Leinwand: sie ist der Hof HINTER dem
         Zeichen, und dort gehoert sie hin — die Marken ziehen vor ihr
         vorbei. Die SPINNE liegt darueber, denn ihr Stern liegt auf dem
         Zeichen. */
      ".kosmosglut,.kosmosspinne{position:absolute;left:0;top:0;width:200px;height:200px;",
      "margin:-100px 0 0 -100px;opacity:0;will-change:transform,opacity;",
      "transform-origin:50% 50%;pointer-events:none}",
      ".kosmosglut{background:radial-gradient(circle at 50% 50%,",
      "rgba(228,242,238,.7) 0%,rgba(166,214,202,.4) 16%,rgba(100,186,166,.16) 36%,",
      "rgba(56,140,122,.05) 66%,rgba(0,0,0,0) 100%)}",
      ".kosmosblitz{position:absolute;inset:-5%;opacity:0;border-radius:50%;",
      "will-change:transform,opacity;transform-origin:50% 50%;transform:scale(.42);",
      "background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.95) 0%,",
      "rgba(228,244,238,.6) 10%,rgba(178,220,206,.28) 26%,",
      "rgba(110,180,160,.07) 55%,rgba(0,0,0,0) 100%)}",
      ".kosmosrand{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 46%,",
      "rgba(0,0,0,0) 30%,rgba(0,0,0,.3) 62%,rgba(2,4,4,.82) 100%)}",
      /* DAS KORN STEHT STILL.

         Es sprang sechsmal je Sekunde um elf Punkt — "animation:
         kosmosKorn .5s steps(1) infinite". Als Filmkorn gedacht, und
         als Filmkorn ist Springen richtig: echtes Korn ist in jedem
         Einzelbild neu. Nur ist echtes Korn auch in jedem Einzelbild
         ANDERS, waehrend hier dasselbe Bild ruckweise verschoben wird —
         und eine verschobene Struktur liest sich nicht als Korn,
         sondern als Wackeln. Gemeldet als "es zappelt", und das war
         woertlich so gebaut.

         Seit die Szene in voller Geraetedichte malt, faellt es umso
         mehr auf: das Korn ist jetzt scharf. Also steht es still. */
      ".kosmoskorn{position:absolute;inset:-8%;opacity:.075}",
      "@media (prefers-reduced-motion: reduce){.kosmosfeld,.kosmosflut",
      "{animation:none}.kosmosflut{opacity:0}}"
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
  /* DAS GLAS DER MARKEN — weich gebacken, Rand gezeichnet.

     Zwei Dinge waren falsch, und beide standen hier.

     ERSTENS DIE WERTE. Das Glas lief mit der HALBEN Staerke dessen, was
     stil.css fuer jede Karte der App vorschreibt: Fuellung 0,07 statt
     0,1, Schimmer 0,14 statt 0,22, Rand 0,05 statt 0,28. So gedaempft
     ist es kein Glas mehr, sondern ein Hauch — auf dem Bild schwamm das
     Logo in einem Kreis, den man kaum sah. "Die Logos sollen in einem
     Liquid-Glass-Kreis drin sein": das sind sie, sie waren nur
     unsichtbar. Jetzt stehen hier die Zahlen aus stil.css, keine
     eigenen. (Zu hell wird es davon nicht: gemeldet war einmal ein
     Lichtbogen mit 0,62 — mehr als das Doppelte des Apprands.)

     ZWEITENS DIE SCHAERFE. Alles lag in einer Vorlage von 512 Punkten,
     die beim nahen Vorbeiflug auf ueber 900 Geraetepunkte gezogen wurde
     — gemessen brauchte die Randkante DREI Geraetepunkte, wo das
     gezeichnete App-Zeichen einen braucht. Der Rand ist eine harte
     Kante; harte Kanten gehoeren nicht in eine Vorlage. Also dieselbe
     Teilung wie beim Kern: die weiche Fuellung bleibt gebacken (ein
     Verlauf hat keine Kante, den sieht man hochgezogen nicht), der Rand
     wird bei der wirklichen Groesse gezeichnet. */
  function glasFuellung(x, gr) {
    var m = gr / 2, r = m - gr * 0.03;
    x.save();
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.clip();
    /* Der Grund: dunkel und ruhig. Weniger Frost als vorher — er sass
       wie Milch vor dem Logo, und ein Zeichen hinter Milch wirkt
       billig, egal wie scharf es ist. */
    x.fillStyle = "rgba(10,13,12,0.34)";
    x.fillRect(0, 0, gr, gr);
    /* --glas-fuellung-karte */
    var fv = x.createLinearGradient(0, 0, 0, gr);
    fv.addColorStop(0, "rgba(255,255,255,0.1)");
    fv.addColorStop(1, "rgba(255,255,255,0.075)");
    x.fillStyle = fv;
    x.fillRect(0, 0, gr, gr);
    /* --glas-schimmer, 148 Grad */
    var sv = x.createLinearGradient(m - r, m - r, m + r * 0.45, m + r * 0.45);
    sv.addColorStop(0, "rgba(255,255,255,0.22)");
    sv.addColorStop(0.24, "rgba(255,255,255,0.12)");
    sv.addColorStop(0.5, "rgba(255,255,255,0.04)");
    sv.addColorStop(0.72, "rgba(255,255,255,0)");
    x.fillStyle = sv;
    x.fillRect(0, 0, gr, gr);
    x.restore();
    return r;
  }

  /* DER RAND — hier entscheidet sich "edel". Echtes Glas faengt Licht
     NICHT gleichmaessig: es sammelt es dort, wo die Woelbung zur Quelle
     zeigt, und laesst den Rest fast dunkel. Also ein feiner Grundrand,
     darueber ein kurzer heller BOGEN oben links und ein zweiter,
     kuehler und schwaecher, unten rechts als Gegenlicht.

     Die Staerke haengt an der Groesse (0,004 der Kante), damit die
     Linie in jeder Aufloesung gleich fein aussieht — eine feste
     Pixelbreite waere auf der grossen Fassung ein Faden und auf der
     kleinen ein Balken. Und duenn bleibt sie: eine Linie, die mit der
     Scheibe mitwaechst, wird beim nahen Vorbeiflug zum Reifen.

     Die Zahlen sind die von --glas-kante: oben 0,28 Weiss, unten 0,3
     Schwarz, dazwischen ein schwaches 0,1. */
  function glasRand(x, gr) {
    var m = gr / 2, r = m - gr * 0.03;
    var fein = Math.max(0.75, gr * 0.004);
    x.save();
    x.lineWidth = fein;
    x.strokeStyle = "rgba(255,255,255,0.1)";
    x.beginPath(); x.arc(m, m, r - fein / 2, 0, 6.2832); x.stroke();

    x.lineCap = "round";
    x.lineWidth = fein * 1.4;
    var bo = x.createLinearGradient(m - r, m - r, m + r * 0.3, m + r * 0.3);
    bo.addColorStop(0, "rgba(255,255,255,0)");
    bo.addColorStop(0.35, "rgba(255,255,255,0.28)");
    bo.addColorStop(1, "rgba(255,255,255,0)");
    x.strokeStyle = bo;
    x.beginPath();
    x.arc(m, m, r - fein, 3.5343, 5.6549);   /* oben links */
    x.stroke();

    x.lineWidth = fein;
    var ge = x.createLinearGradient(m + r, m + r, m - r * 0.3, m - r * 0.3);
    ge.addColorStop(0, "rgba(6,10,10,0)");
    ge.addColorStop(0.4, "rgba(6,10,10,0.3)");
    ge.addColorStop(1, "rgba(6,10,10,0)");
    x.strokeStyle = ge;
    x.beginPath();
    x.arc(m, m, r - fein, 0.3927, 2.3562);   /* unten rechts */
    x.stroke();
    x.restore();
  }

  /* Beides zusammen — fuer die gebackenen Fassungen der Ferne. */
  function scheibenGrund(x, gr) {
    var r = glasFuellung(x, gr);
    glasRand(x, gr);
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
  /* EIN ZEICHEN AUF EINE RUNDE SCHEIBE LEGEN.

     "Warum sind die Logos rechteckig in runden Formen?" — weil sie es
     waren. Zwei Fehler zugleich:

     ERSTENS ragten sie heraus. Ein Zeichen nahm 0,7 der KANTE ein; ist
     es quadratisch, liegen seine Ecken bei 0,7 mal Wurzel zwei halbe =
     0,495 der Kante, der Kreis endet aber bei 0,47. Die Ecken standen
     also ueber dem Glas. Auf dem Prueftisch fiel das nie auf, weil
     meine Probebilder allesamt KREISE waren — ein Prueftisch, der nur
     den gutartigen Fall liefert, verbirgt genau die anderen.

     ZWEITENS bringen viele Logos ihren eigenen, deckenden Grund mit:
     eine farbige Kachel mit einem Zeichen darin. So etwas MITTIG UND
     KLEIN in einen Glaskreis zu legen ergibt genau das gemeldete Bild:
     ein Rechteck in einem Kreis.

     Also zwei Arten, wie es sich gehoert:

       freigestellt (durchsichtiger Grund)  -> mittig, mit Luft zum Rand
       flaechig (eigener Grund)             -> FUELLT die Scheibe

     Ein Logo mit eigenem Grund wird damit zum Gesicht der Scheibe,
     nicht zum Aufkleber darauf — dieselbe Regel, nach der ueberall
     Profilbilder gesetzt werden. Und geschnitten wird IMMER am Kreis:
     ueber den Rand steht nichts mehr. */
  /* DAS GESICHT EINER SCHEIBE — EINMAL GEBACKEN, NICHT JE BILD.

     Der erste Wurf schnitt bei jeder Marke in jedem Bild einen Kreis
     (arc + clip) und legte das Zeichen hinein. Richtig gedacht und
     teuer gemessen: die Malzeit stieg von 5,2 auf 9,5 ms — Schneiden
     ist in einer Leinwand eine der teuersten Anweisungen, und hier
     stand sie dreizehnmal je Bild.

     Dabei aendert sich nichts daran, WIE das Zeichen auf der Scheibe
     liegt; nur die Groesse aendert sich, und die macht drawImage. Also
     wird das Gesicht einmal gebacken — Zeichen, fertig auf einer
     durchsichtigen Scheibe liegend — und danach nur noch gestempelt. */
  function scheibenGesicht(quelle, gr, flaechig) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    var m = gr / 2, r = m - gr * 0.03;
    var zb = quelle.naturalWidth || quelle.width || 1;
    var zh = quelle.naturalHeight || quelle.height || 1;
    var f;
    x.beginPath();
    if (flaechig) {
      /* FUELLEN, ABER NICHT BIS AN DEN RAND.

         Ein Logo, das seinen eigenen deckenden Grund mitbringt (eine
         farbige Kachel), wurde bisher mittig und klein auf das Glas
         gelegt — genau das gemeldete "Rechteck in einer runden Form".
         Es fuellt jetzt einen Kreis INNERHALB der Scheibe, mit einem
         Rand Glas ringsum: das Zeichen als runde Flaeche, die Scheibe
         als Fassung, in der es liegt. Bis an den Rand darf es nicht,
         sonst waere das Glas weg — und "in einem Liquid-Glass-Kreis
         drin" war die Bestellung. */
      var ri = r * 0.82;
      x.arc(m, m, ri, 0, 6.2832);
      x.clip();
      f = Math.max((ri * 2) / zb, (ri * 2) / zh);
    } else {
      /* Ein freigestelltes Zeichen liegt mittig auf dem Glas — und wird
         am Kreis geschnitten, damit nie eine Ecke ueber den Rand steht.
         Genau das geschah: ein quadratisches Zeichen mit 0,7 der Kante
         hat seine Ecken bei 0,495 der Kante, der Kreis endet bei 0,47. */
      x.arc(m, m, r, 0, 6.2832);
      x.clip();
      var zs = gr * ZEICHENANTEIL;
      f = Math.min(zs / zb, zs / zh);
    }
    try { x.drawImage(quelle, m - zb * f / 2, m - zh * f / 2, zb * f, zh * f); } catch (e) {}
    return c;
  }

  function fernScheibe(glas, gesicht, gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    x.drawImage(glas, 0, 0, gr, gr);
    if (gesicht) { try { x.drawImage(gesicht, 0, 0, gr, gr); } catch (e) {} }
    return c;
  }

  function zeichenAusBild(bild, gr) {
    var bw = bild.naturalWidth || bild.width || 1;
    var bh = bild.naturalHeight || bild.height || 1;
    /* ERST FREISTELLEN, DANN SKALIEREN. Andersherum wird die weiche
       Kante des Bildes beim Vergroessern mitgezogen und ist danach
       doppelt so breit — der Saum, den man wegnehmen will, waechst
       also, bevor man ihn anfasst. Auf den Originalpunkten ist er ein
       Punkt breit und sauber zu treffen. */
    var roh = tafel(bw, bh);
    var rx = roh.getContext("2d");
    try { rx.drawImage(bild, 0, 0, bw, bh); } catch (e) {}
    weissWeg(rx, bw, bh);

    /* BRINGT DIESES LOGO SEINEN EIGENEN GRUND MIT?

       Nach dem Freistellen ist ein wirklich freigestelltes Zeichen zu
       grossen Teilen durchsichtig — ein Schriftzug deckt kaum ein
       Fuenftel seiner Flaeche. Eine farbige Kachel dagegen deckt fast
       alles: der Grund war nicht weiss, also blieb er stehen. An der
       Deckung ist beides sicher zu unterscheiden, ohne den Dienst zu
       fragen.

       Gemessen wird grob (jeder achte Punkt) — es geht um "fast ganz"
       gegen "zum grossen Teil durchsichtig", nicht um Feinheiten. */
    var flaechig = false;
    /* UND WO STEHT UEBERHAUPT ETWAS? Der zweite Grund, warum die Marken
       ungleich schwer wirkten: viele Logos bringen breite leere Raender
       mit. Wer das ganze Bild einpasst, passt die Leere mit ein — ein
       Zeichen mit viel Luft wird klein, eines ohne gross, obwohl beide
       gleich viel Scheibe bekommen sollten.

       Also wird auf die wirkliche Zeichenflaeche beschnitten. Damit
       haben alle Marken dasselbe optische Gewicht, und das ist der
       Unterschied zwischen "zusammengesucht" und "gesetzt". */
    var lx = 0, ly = 0, lb = bw, lh = bh;
    try {
      var pr = rx.getImageData(0, 0, bw, bh).data;
      var voll = 0, alle = 0;
      var x0 = bw, y0 = bh, x1 = -1, y1 = -1;
      for (var py = 0; py < bh; py++) {
        for (var px = 0; px < bw; px++) {
          var a = pr[(py * bw + px) * 4 + 3];
          if ((py * bw + px) % 8 === 0) { alle++; if (a > 200) voll++; }
          if (a > 24) {
            if (px < x0) x0 = px; if (px > x1) x1 = px;
            if (py < y0) y0 = py; if (py > y1) y1 = py;
          }
        }
      }
      flaechig = alle > 0 && voll / alle > 0.86;
      if (x1 >= x0 && y1 >= y0 && (x1 - x0) > 3 && (y1 - y0) > 3) {
        lx = x0; ly = y0; lb = x1 - x0 + 1; lh = y1 - y0 + 1;
      }
    } catch (e) {}

    /* Erst auf die Zeichenflaeche beschneiden, dann als Gesicht auf die
       Scheibe legen. */
    var eng = tafel(lb, lh);
    try { eng.getContext("2d").drawImage(roh, lx, ly, lb, lh, 0, 0, lb, lh); } catch (e) {}
    try { roh.width = 0; roh.height = 0; } catch (e) {}
    var c = scheibenGesicht(eng, gr, flaechig);
    try { eng.width = 0; eng.height = 0; } catch (e) {}
    return c;
  }

  /* DER WEISSE GRUND MUSS WEG.

     Viele Logo-Dienste liefern die Marken nicht freigestellt, sondern
     auf weissem Grund. In der Liste faellt das bei dreissig Pixeln kaum
     auf; im Kosmos zieht dieselbe Marke ueber den halben Schirm, und
     dann steht ein weisses Feld auf dunklem Glas — gemeldet als
     "weisse Raender".

     Weggenommen wird VON DEN ECKEN HER, nicht ueberall: ein einfaches
     "alles Helle durchsichtig" wuerde weisse Buchstaben INNERHALB des
     Logos mit ausradieren. Die Flut laeuft nur ueber zusammenhaengende
     Flaechen, die vom Rand aus erreichbar sind — ein "O" behaelt seinen
     Punkt, ein Schriftzug seine Farbe.

     Und nur, wenn der Rand ueberhaupt hell und einheitlich ist: ein
     Logo mit dunklem oder buntem Grund bleibt unangetastet. */
  function weissWeg(x, gr, ho) {
    ho = ho || gr;
    var d;
    try { d = x.getImageData(0, 0, gr, ho); } catch (e) { return; }
    var p = d.data, n = gr * ho;
    /* Taugt der Rand als Grund? Vier Ecken ansehen: alle hell, alle
       deckend, alle einander aehnlich. */
    var ecken = [0, (gr - 1) * 4, (ho - 1) * gr * 4, (n - 1) * 4];
    var r0 = 0, g0 = 0, b0 = 0;
    for (var e = 0; e < 4; e++) {
      var i = ecken[e];
      if (p[i + 3] < 240) return;
      var w = (p[i] + p[i + 1] + p[i + 2]) / 3;
      if (w < 205) return;
      r0 += p[i] / 4; g0 += p[i + 1] / 4; b0 += p[i + 2] / 4;
    }

    /* HART UND WEICH.

       Ein reiner Schnitt an einer Schwelle hinterlaesst genau das, was
       er verhindern soll: den weichgezeichneten Saum, mit dem jedes
       Bild seine Kanten glaettet. Diese Punkte sind halb Grund, halb
       Marke — nimmt man sie ganz weg, franst die Marke aus; laesst man
       sie stehen, liegt ein heller Kranz um sie herum. Beides ist als
       "weisse Raender" zu sehen.

       Also zwei Schwellen. Was dem Grund sehr nahe ist, faellt ganz
       weg, und die Flut laeuft weiter. Was ihm NUR NAHE ist, bekommt
       eine Teildeckung — und seine Farbe wird zurueckgerechnet: der
       Punkt ist eine Mischung aus Grund und Marke, und wer die Mischung
       kennt und den Grund, kennt auch die Marke. Genau das macht ein
       Bildbearbeiter, wenn er einen weissen Hintergrund freistellt. */
    var HART = 24, WEICH = 96;
    var gesehen = new Uint8Array(n);
    var stapel = [0, gr - 1, (ho - 1) * gr, n - 1];
    while (stapel.length) {
      var k = stapel.pop();
      if (k < 0 || k >= n || gesehen[k]) continue;
      gesehen[k] = 1;
      var j = k * 4;
      if (p[j + 3] < 200) continue;
      var ab = Math.max(Math.abs(p[j] - r0),
                        Math.abs(p[j + 1] - g0),
                        Math.abs(p[j + 2] - b0));
      if (ab <= HART) {
        p[j + 3] = 0;
      } else if (ab < WEICH) {
        var al = (ab - HART) / (WEICH - HART);
        /* Bei sehr kleiner Teildeckung NICHT zurueckrechnen: die
           Formel teilt durch die Deckung, und bei einem Zehntel
           vervielfacht sie jeden Rauschpunkt zu einem hellen Fleck —
           genau die gestrichelten Kraenze, die als Saum zu sehen waren.
           Was so duenn ist, gehoert ohnehin zum Grund. */
        if (al < 0.42) {
          p[j + 3] = 0;
        } else {
          /* Farbe zurueckrechnen: c = a*Marke + (1-a)*Grund. */
          p[j] = klemm((p[j] - (1 - al) * r0) / al, 0, 255);
          p[j + 1] = klemm((p[j + 1] - (1 - al) * g0) / al, 0, 255);
          p[j + 2] = klemm((p[j + 2] - (1 - al) * b0) / al, 0, 255);
          p[j + 3] = Math.round(al * p[j + 3]);
          continue;   /* die Kante ist erreicht — nicht weiterfluten */
        }
      } else {
        continue;   /* die Marke selbst */
      }
      var sp = k % gr;
      if (sp > 0) stapel.push(k - 1);
      if (sp < gr - 1) stapel.push(k + 1);
      stapel.push(k - gr);
      stapel.push(k + gr);
    }
    try { x.putImageData(d, 0, 0); } catch (e) {}
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

  /* DIE VIER KERZEN — die Marke der App, in ihren eigenen Massen.

     Es sind DIESELBEN Zahlen, die in index.html als SVG stehen und aus
     denen icon-512.png gebacken wurde: ein Feld von 512 Einheiten, vier
     Kerzen aus Docht und Koerper, die hinteren beiden nur umrissen
     (Strichstaerke 18). Nachgemessen an der Bilddatei, Kante fuer Kante
     — nicht abgeschrieben, sondern geprueft.

     Docht und voller Koerper werden gefuellt, der hohle Koerper
     gestrichen. */
  var KERZEN = [
    { d: [109, 128, 24, 154], k: [88, 172, 66, 80], hohl: false },
    { d: [199, 228, 24, 160], k: [178, 252, 66, 90], hohl: false },
    { d: [289, 310, 24, 74], k: [277, 259, 48, 74], hohl: true },
    { d: [379, 98, 24, 186], k: [367, 133, 48, 108], hohl: true }
  ];
  function kasten(x, px, py, br, ho, e) {
    x.beginPath();
    if (x.roundRect) x.roundRect(px, py, br, ho, e);
    else x.rect(px, py, br, ho);
  }

  /* DER KERN WIRD GEZEICHNET, NICHT KOPIERT.

     Hier stand eine Textur: icon-512.png, in eine Leinwand gelegt und
     bei der Ankunft auf Schirmgroesse gezogen. Auf einem Telefon mit
     Pixeldichte 3 sind das rund 2900 Geraetepunkte aus einer Vorlage von
     512 — knapp sechsfach hochgerechnet. Und wenn die Sparschaltung
     zugriff, wurde die grosse Vorlage gar nicht erst gebaut: dann kam
     das Zeichen aus 128 Punkten. Gemessen brauchte eine Kante am Ende
     ACHT Geraetepunkte, um von dunkel nach hell zu kommen; scharf sind
     ein bis zwei.

     Eine Textur ist das falsche Werkzeug fuer etwas, das am Ende den
     ganzen Schirm fuellt — jede Vorlage, die man dafuer gross genug
     macht, ist fuer die ganze Reise davor zu gross. Vier gerundete
     Rechtecke dagegen sind bei JEDER Groesse genau scharf und kosten
     einen Bruchteil eines Vollbildes. Also wird gezeichnet.

     Die Bilddatei bleibt, wo sie hingehoert: auf dem Home-Bildschirm. */
  /* WAS WEICH IST, KOMMT AUS EINER VORLAGE — WAS HART IST, WIRD
     GEZEICHNET.

     Der erste Wurf zeichnete das ganze Zeichen je Bild, samt Grund und
     Schein. Das war sauber gedacht und teuer gemessen: zwei Fuellungen
     ueber den ganzen Schirm und zwei frisch gebaute Verlaeufe, JEDES
     Bild. Die Malzeit stieg von 1,0 auf 3,3 ms im Mittel, und sieben
     Prozent der Bilder rissen die Elf-Millisekunden-Grenze.

     Dabei braucht nur die HAELFTE davon Schaerfe. Ein Verlauf, aus 512
     Punkten auf Schirmgroesse gezogen, ist von einem frisch gerechneten
     nicht zu unterscheiden — er hat ja keine Kanten. Die Kerzen dagegen
     haben nichts als Kanten.

     Also: der Grund samt Schein und Rand einmal gebacken, die vier
     Kerzen je Bild gezeichnet. Sie bedecken ein Siebtel der Flaeche. */
  function kernGrund(x, gr) {
    var r = gr * 0.03, s = gr - r * 2, e = gr * 0.235;
    x.save();
    kasten(x, r, r, s, s, e);
    x.clip();
    /* An der Bilddatei abgelesen: oben rgb(38,50,55), unten
       rgb(9,12,11) — dieselbe Glasscheibe wie ueberall in der App. */
    var gd = x.createLinearGradient(0, r, 0, r + s);
    gd.addColorStop(0, "#263237");
    gd.addColorStop(0.45, "#161d1c");
    gd.addColorStop(1, "#090c0b");
    x.fillStyle = gd;
    x.fillRect(r, r, s, s);
    /* Der Schein von oben links, wie ihn das Zeichen traegt. */
    var sch = x.createLinearGradient(r, r, r + s * 0.72, r + s * 0.52);
    sch.addColorStop(0, "rgba(214,236,232,0.16)");
    sch.addColorStop(0.35, "rgba(160,200,196,0.05)");
    sch.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = sch;
    x.fillRect(r, r, s, s);
    x.restore();
    x.lineWidth = Math.max(1, gr * 0.012);
    var kk = x.createLinearGradient(0, 0, 0, gr);
    kk.addColorStop(0, "rgba(255,255,255,0.28)");
    kk.addColorStop(0.35, "rgba(255,255,255,0.1)");
    kk.addColorStop(1, "rgba(0,0,0,0.3)");
    x.strokeStyle = kk;
    kasten(x, r + x.lineWidth / 2, r + x.lineWidth / 2, s - x.lineWidth, s - x.lineWidth, e);
    x.stroke();
  }
  /* Die vier Kerzen, in den Massen des 512er Feldes. Der Aufrufer hat
     schon an den Ort geschoben; hier wird nur noch skaliert. */
  function kernKerzen(x, gr) {
    var r = gr * 0.03, s = gr - r * 2, f = s / 512;
    x.save();
    x.fillStyle = "#f2f5f4";
    x.strokeStyle = "#f2f5f4";
    x.lineWidth = 18 * f;
    for (var i = 0; i < KERZEN.length; i++) {
      var kz = KERZEN[i], d = kz.d, k = kz.k;
      kasten(x, r + d[0] * f, r + d[1] * f, d[2] * f, d[3] * f, 12 * f);
      x.fill();
      kasten(x, r + k[0] * f, r + k[1] * f, k[2] * f, k[3] * f, (kz.hohl ? 7 : 9) * f);
      if (kz.hohl) x.stroke(); else x.fill();
    }
    x.restore();
  }
  /* Fuer die Ferne alles zusammen gebacken: solange das Zeichen ein
     Punkt von zwanzig Pixeln ist, waeren acht Pfade je Bild
     verschwendet. */
  function kernScheibe(gr) {
    var c = tafel(gr, gr), x = c.getContext("2d");
    kernGrund(x, gr);
    kernKerzen(x, gr);
    return c;
  }
  /* Nur der weiche Teil — die Kerzen kommen im Anflug als Pfade dazu. */
  function kernGrundScheibe(gr) {
    var c = tafel(gr, gr);
    kernGrund(c.getContext("2d"), gr);
    return c;
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
      '<i class="kosmosfeld drei"></i><i class="kosmosflut"></i><i class="kosmosglut"></i>';
    huelle.appendChild(unten);

    leinwand.className = "kosmosleinwand";
    leinwand.setAttribute("aria-hidden", "true");
    huelle.appendChild(leinwand);

    var oben = document.createElement("div");
    oben.className = "kosmosglas";
    oben.setAttribute("aria-hidden", "true");
    oben.innerHTML = '<i class="kosmosspinne"></i>' +
      '<i class="kosmosblitz"></i><i class="kosmoskorn"></i><i class="kosmosrand"></i>';
    huelle.appendChild(oben);

    /* Zwei Deckel uebereinander: die Pixeldichte (hoechstens 2, die
       Sparschaltung darf sie auf 1 druecken) UND die Gesamtflaeche der
       Leinwand — auf einem 4K-Fenster darf die Dichte auch unter 1
       fallen, weich ist bei einem Auftakt kein Fehler. */
    /* DIE HALBE DICHTE DES GERAETS — und zwar gemessen, nicht geraten.

       Hier stand einmal die feste 1,5, mit den Kosten begruendet. Dann
       stand hier die volle Geraetedichte, mit der Schaerfe begruendet.
       Beide Male war die Begruendung eine Behauptung. Die Messung sagt
       etwas Drittes:

         Dichte 3    Flanke einer Kerzenkante  1,23 Geraetepunkte
         Dichte 1,5  Flanke einer Kerzenkante  1,52 Geraetepunkte

       Drei Zehntel eines Punktes. Dafuer die vierfache Fuellarbeit:
       gemessen 10 ms je Bild statt 4,7 waehrend der Reise und 40 statt
       11 bei der Ankunft, wo die Bildrate von 60 auf 16 einbrach.

       Der Grund, dass die halbe Dichte reicht: das App-Zeichen wird
       nicht mehr aus einer Vorlage gezogen, sondern GEZEICHNET. Eine
       gezeichnete Kante ist auf der Leinwand einen Punkt breit, egal
       wie gross das Zeichen ist — verdoppelt der Kompositor sie
       anschliessend sauber, bleibt sie eine Kante. Die Unschaerfe kam
       nie von der Dichte, sondern von einer 128-Punkte-Vorlage auf dem
       ganzen Schirm.

       GETEILT, nicht gedeckelt: die halbe Geraetedichte laesst den
       Kompositor immer glatt verdoppeln. Ein fester Wert von 1,5 traefe
       auf einem Geraet mit Dichte 2 den krummen Faktor 1,333 — teurer
       UND unschaerfer als das glatte 1. Unter 1 geht es nie. */
    var geraeteDichte = window.devicePixelRatio || 1;
    var dichteDeckel = Math.min(geraeteDichte, 3);
    /* Die naechstkleinere Dichte, die den Kompositor GANZZAHLIG
       hochziehen laesst: bei Geraetedichte 3 sind das 3, 1,5 und 1. */
    function glatteStufe(hoechstens) {
      for (var teil = 1; teil <= 4; teil++) {
        var d = geraeteDichte / teil;
        if (d <= hoechstens + 0.001) return d;
      }
      return geraeteDichte / 4;
    }
    var DPR = 1;
    var B = 0, H = 0, MX = 0, MY = 0, F = 700;
    var gemessen = false;

    var wuerfel = wuerfelWerk(20260825);
    var KORN = korn(128, wuerfel);
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
    /* Die nahe Fassung OHNE Rand: der wird beim Malen gezogen, in der
       wirklichen Groesse. Nur so ist er scharf. */
    function glasWeich(gr) {
      var c = tafel(gr, gr);
      glasFuellung(c.getContext("2d"), gr);
      return c;
    }
    /* OHNE RAND GEBACKEN — beide Stufen.

       Der Glasrand ist das FEINSTE, was die Szene hat: eine Linie von
       unter einem Punkt Breite. In einer Vorlage, die anschliessend
       verkleinert wird, ist so eine Linie der klassische Flimmerfall —
       welche Punkte der schnelle Filter trifft, aendert sich mit jeder
       kleinsten Groessenaenderung, und der ganze Ring wird von Bild zu
       Bild heller und dunkler. Genau das war als "die Kreise zittern"
       zu sehen, und das Differenzbild zweier aufeinanderfolgender
       Bilder zeigte es unmissverstaendlich: die Raender leuchteten als
       vollstaendige Ringe auf. Ein Rand, der nur wandert, zeigte sich
       als Sichel.

       Also raus aus der Vorlage. Gebacken wird nur noch, was weich ist;
       der Rand wird bei jeder Marke in ihrer wirklichen Groesse
       gestrichen — dort ist er eine Kurve, kein abgetasteter Rest. */
    var GLAS_FERN = glasWeich(128);
    var GLAS_MITTEL = glasWeich(MITTELGR);
    var GLAS_NAH = null;

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
      DPR = Math.min(geraeteDichte, dichteDeckel);
      /* Der Flaechendeckel — er gilt dem grossen Fenster am
         Schreibtisch, nicht dem Telefon. Ein Telefon von 390 mal 844
         braucht bei voller Dichte 2,96 Millionen Punkte; der Deckel
         stand auf 2,4 und haette gerade DIE Geraete beschnitten, um
         derentwillen es die Szene gibt. Jetzt 3,3 Millionen: das
         Telefon geht voll durch, ein 4K-Fenster wird weiterhin
         heruntergerechnet — weich ist bei einem Auftakt kein Fehler,
         aber eben nur dort, wo niemand nah davorsitzt.

         GANZE SCHRITTE: greift der Deckel, wird auf den naechsten
         glatten Teiler der Geraetedichte gerundet, nicht auf einen
         krummen Zwischenwert. */
      var deckel = Math.sqrt(3300000 / (B * H));
      if (DPR > deckel) DPR = Math.max(0.5, glatteStufe(deckel));
      leinwand.width = Math.round(B * DPR);
      leinwand.height = Math.round(H * DPR);
      leinwand.style.width = B + "px";
      leinwand.style.height = H + "px";
      /* Die Mitte ist die MITTE. Hier stand 0,46 — vier Prozent ueber
         der Bildmitte, als optischer Ausgleich gedacht. Auf dem
         Ladebildschirm steht aber nichts anderes mehr im Bild, wogegen
         auszugleichen waere, und am Ende landet das App-Zeichen genau
         hier. Gemeldet als "nicht mittig", und die Messung gab recht:
         46,8 Prozent Hoehe. */
      MX = B / 2; MY = H / 2;
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

    /* Nur noch EINE Stufe, und die ist die kleine: in der Ferne ist der
       Kern ein Punkt von zwanzig Pixeln, dort waeren acht Pfade je Bild
       Verschwendung. Sobald er gross wird, wird er gezeichnet statt
       kopiert — siehe kernMalerei(). Eine grosse Vorlage gibt es nicht
       mehr, und damit auch nichts, das die Sparschaltung wegsparen
       koennte: die Ankunft ist IMMER scharf. */
    var KERN_FERN = kernScheibe(128);
    var KERN_GRUND = null;

    /* SPAETERE ARBEITEN, eine je Bild.

       Die grossen Vorlagen (Glas, Kern, die eigene Marke) kosten je ein
       paar Millisekunden — im Konstruktor alle zusammen erzeugten sie
       genau die Ausreisser von sechzig Millisekunden, die als Ruckler
       am Anfang zu sehen waren. Gebraucht werden sie erst im Anflug.
       Also stehen sie in einer Schlange und werden einzeln abgearbeitet,
       in den ruhigen Bildern der Reise. */
    var arbeiten = [];
    var pflichten = [];
    var spaeterBereit = false;
    function spaeter(tun) { arbeiten.push(tun); }
    function eineArbeit() {
      if (!spaeterBereit) {
        spaeterBereit = true;
        /* PFLICHT: der Grund des App-Zeichens. Er wird gebaut, auch
           wenn die Sparschaltung gegriffen hat — GENAU DAS war der
           Fehler hinter "immer noch unscharf". Vorher hing die grosse
           Kern-Vorlage in derselben Schlange wie alles andere, die
           Sparschaltung legte die Schlange still, und die Ankunft kam
           aus einer 128er Vorlage. Was am Ende den ganzen Schirm
           fuellt, darf nie wegoptimiert werden. */
        pflichten.push(function () { KERN_GRUND = kernGrundScheibe(GROSS); });
        spaeter(function () { GLAS_NAH = glasWeich(GROSS); });
      }
      if (pflichten.length) {
        var pf = pflichten.shift();
        try { pf(); } catch (e) {}
        return;
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
    /* DIE HALBE ZAHL — weil es immer die halbe Zahl war.

       Hier stand die doppelte, und die Sparschaltung halbierte sie.
       Da diese aber auf JEDEM Geraet griff (sie verglich die Bilddauer
       mit einer festen Zahl, und die Bilddauer ist auf einem 60-Hz-
       Schirm immer 16,7 ms), sind nie mehr Sterne gemalt worden als
       diese Haelfte. Jetzt, wo der Regler misst statt zu schalten, kaeme
       auf einmal die doppelte Zahl heraus — eine Aenderung, die niemand
       bestellt hat und die zu bezahlen waere. Also steht hier, was
       ohnehin zu sehen war. */
    var ANZ = Math.round(klemm((B * H) / 4000, 55, 130));
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
            k.mittel = null;
            spaeter(function () {
              if (!k.zeichen) {
                /* Auch die gezeichneten Zeichen kommen als Gesicht —
                   sonst laegen sie nach anderen Regeln auf dem Glas als
                   die echten Logos, und man saehe den Unterschied. */
                var roh2 = sinnBild(sy, ZEICHENGR) ||
                  textScheibe(ZEICHENGR, zeichenFuer(sy) || "?");
                k.zeichen = roh2 && scheibenGesicht(roh2, ZEICHENGR, false);
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
              /* SO GROSS WIE DIE QUELLE ES HERGIBT, nicht groesser.
                 Ein Logo von 128 Pixeln auf 512 zu backen gewinnt kein
                 Korn Schaerfe und kostet nur Speicher; eines von 512
                 auf 256 zu stauchen wirft welche weg. Hoechstens das
                 Doppelte der Vorlage, gedeckelt bei der Nahgroesse. */
              var eig = Math.max(b.naturalWidth || 0, b.naturalHeight || 0) || 128;
              k.zeichen = zeichenAusBild(b, klemm(eig * 2, 128, GROSS));
              if (k.fern) { try { k.fern.width = 0; k.fern.height = 0; } catch (e) {} }
              k.fern = fernScheibe(GLAS_FERN, k.zeichen, FERNGR);
              /* UND EINE MITTLERE STUFE.

                 Das ist die eigentliche Antwort auf "die Logos sind
                 unscharf". Zwischen der fernen Scheibe (128) und der
                 nahen Fassung (512) klaffte eine Luecke: eine Marke von
                 118 CSS-Punkten wird bei Dichte 1,5 mit 177 Punkten
                 gemalt, ihr Logo also mit 110 — aus einer Vorlage von
                 512. Das ist eine Verkleinerung auf ein Fuenftel, und
                 der schnelle Filter des Browsers taugt dafuer nicht: er
                 tastet ab, statt zu mitteln, und genau davon wird eine
                 Kante weich und flimmerig.

                 Der teure Weg waere "high" als Filterqualitaet —
                 gemessen 2,7-fache Kosten und die halbe Bildrate im
                 Anflug. Der billige Weg ist der, den jede Grafikkarte
                 geht: eine Zwischenstufe vorhalten und die nehmen, die
                 am naechsten liegt. Sie kostet EINMAL Bauzeit und beim
                 Malen keinen Deut mehr — es bleibt ein Blit. */
              spaeter(function () { k.mittel = fernScheibe(GLAS_MITTEL, k.zeichen, MITTELGR); });
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
    /* Die eine Geschwindigkeit. Sie steht fest, sobald die Gasse steht:
       die ganze Strecke geteilt durch die Zeit, die der Flug dauern
       soll. eile ist der Tipp des Ungeduldigen — die EINZIGE Stelle,
       an der sich das Tempo aendert, und dort will es der Mensch. */
    var V = 1.2, eile = 1;
    function tempoSetzen() {
      V = Math.max(0.2, (zielZ - 70) / flugZeit);
    }
    tempoSetzen();
    var sparsam = false, messAb = 0, fenster = [];
    var dichteFenster = [], dichteAb = 0, dichteStufen = 0;
    /* STOCKT ES? — die eine Frage, die beide Regler stellen.

       Nicht "sind die Bilder langsamer als X", sondern "verpasst dieses
       Geraet seinen eigenen Takt". Der Takt steht nirgends geschrieben;
       das schnellste Bild im Fenster ist die beste Auskunft darueber,
       wie schnell dieser Schirm ueberhaupt kann. Jedes Bild, das
       deutlich laenger braucht als dieses, hat einen Takt verpasst.

       Der zweite Fall: liegt schon das SCHNELLSTE Bild ueber zwanzig
       Millisekunden, ist gar kein Takt mehr zu halten — dann stockt es,
       auch wenn es gleichmaessig stockt. */
    function stockt(werte, anteil) {
      if (werte.length < 6) return false;
      var boden = Infinity;
      for (var i = 0; i < werte.length; i++) if (werte[i] < boden) boden = werte[i];
      if (!(boden > 0)) return false;
      if (boden > 20) return true;
      var lahm = 0;
      for (var j = 0; j < werte.length; j++) if (werte[j] > boden * 1.6) lahm++;
      return lahm / werte.length > anteil;
    }
    var bildnummer = 0, gemeldet = false, angekommen = 0;
    var fertig = typeof wahl.fertig === "function" ? wahl.fertig : function () {};

    /* Die Spur fuer die Nachschau — auf einer Leinwand gibt es sonst
       nichts zu befragen. Je Bild:
       [0] Zeit  [1] Koerperzahl  [2] Fahrt (Tiefe der Kamera)
       [3] wie viele Marken schon an der Kamera vorbeigezogen sind
       [4] Bilddauer  [5] groesste gemalte Marke in Pixeln
       [6] Seitenverhaeltnis der gemalten Scheiben (muss 1 sein)
       [7] groesste Abweichung der Tiefenschritte vom Sollschritt
       [8] [9] Lage des App-Zeichens auf dem Schirm, als Anteil
       [10] wie breit das App-Zeichen gemalt wird, als Anteil des
            Schirms — daran ist abzulesen, WANN es den Schirm fuellt */
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
    /* DIE LEITER DER DICHTE, mitgeschrieben.

       Sie entscheidet, ob in voller Aufloesung gemalt wird — und sie
       ist die einzige Sicherung dagegen, dass ein schwaches Geraet an
       dieser Aufloesung erstickt. Eine Sicherung, die man nicht
       nachsehen kann, ist keine: ohne diese Zeilen liess sich nicht
       belegen, ob sie greift, und der erste Entwurf griff auf JEDEM
       Geraet, der zweite auf keinem. Je Eintrag: Zeit, Dichte,
       Bilder im Fenster, kuerzeste und mittlere Bilddauer, Urteil. */
    var leiter = [];
    window.rcpKosmosLeiter = leiter;
    var blitzEbene = oben.querySelector(".kosmosblitz");
    var blitzStand = -1, blitzGross = -1;
    var glutEbene = unten.querySelector(".kosmosglut");
    var spinneEbene = oben.querySelector(".kosmosspinne");
    var glutStand = "", spinneStand = "";
    /* Die Spinne traegt ein Sternmuster, keinen glatten Verlauf — das
       geht nur als Bild. Einmal gebacken, dann vom Kompositor bewegt. */
    try {
      if (spinneEbene) spinneEbene.style.backgroundImage = "url(" + SPINNE.toDataURL() + ")";
      if (spinneEbene) spinneEbene.style.backgroundSize = "100% 100%";
    } catch (e) {}
    /* Ein Setzer, der nur schreibt, wenn sich etwas geaendert hat: eine
       Zuweisung an style loest auch dann Arbeit aus, wenn derselbe Wert
       daraufsteht. */
    function lichtSetzen(el, alt2, x, y, gr, deck) {
      if (!el) return alt2;
      var neu2 = deck <= 0.004 ? "0"
        : Math.round(x) + "," + Math.round(y) + "," + Math.round(gr) + "," +
          (Math.round(deck * 100) / 100);
      if (neu2 === alt2) return alt2;
      if (neu2 === "0") { el.style.opacity = "0"; return neu2; }
      el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) +
        "px) scale(" + (gr / 200).toFixed(4) + ")";
      el.style.opacity = Math.min(1, deck).toFixed(3);
      return neu2;
    }

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
         nicht von einem bei 190 unterscheiden.

         UND SIE VERGLEICHT MIT DEM EIGENEN TAKT, nicht mit einer festen
         Zahl. Hier stand "Mittel ueber 12 ms". Das war kein Regler,
         sondern ein Schalter, der immer an ist: die Bilddauer ist der
         Abstand zweier Bilder, und auf einem Schirm mit 60 Hz betraegt
         der 16,7 ms — auch dann, wenn die Szene in einer halben
         Millisekunde fertig ist. Gemessen griff die Sparschaltung
         darum auf JEDEM Geraet, ausnahmslos, und die halbierten Sterne
         waren nie eine Entscheidung, sondern ein Dauerzustand.

         Der Takt des Schirms ist nicht bekannt — aber er ist ablesbar:
         es ist das SCHNELLSTE Bild im Fenster. Alles, was deutlich
         laenger braucht, hat einen Takt verpasst. Gezaehlt werden die
         verpassten. */
      if (!sparsam && t > 150) {
        if (!messAb) messAb = t;
        fenster.push(dtRoh);
        if (fenster.length >= 10 || t - messAb >= 260) {
          if (stockt(fenster, 0.3)) {
            sparsam = true;
            sterne.length = Math.floor(sterne.length / 2);
          }
          fenster.length = 0; messAb = t;
        }
      }

      /* DIE DICHTE WIRD GETRENNT BEURTEILT — UND SPAETER.

         Das war der eigentliche Fund hinter "immer noch unscharf": die
         Sparschaltung urteilt ab 150 Millisekunden, und in diesem
         Fenster baut die Liste ihre Karten. Gemessen wurde also der
         SEITENAUFBAU, nicht das Geraet — und das Urteil galt danach
         fuer den ganzen Flug. Auf dem Prueftisch griff sie jedes Mal:
         Dichte 1 auf einem Schirm mit Dichte 3, alles dreifach
         hochgezogen.

         Die billigen Abstriche (halb so viele Sterne, keine Hoefe,
         keine grossen Nebenvorlagen) duerfen ruhig frueh und
         vorsichtig fallen — sie kosten nichts und sind nicht zu sehen.
         Die Dichte dagegen ist das, was man sieht. Sie wird darum erst
         beurteilt, wenn die Seite steht (ab 900 ms), ueber ein volles
         Fenster von 500 ms, und dann in EINEM ganzen Schritt.

         Nur abwaerts, und hoechstens zweimal: jede Aenderung legt die
         Leinwand neu an, und "kein Stoppen" ist eine Zusage.

         Geurteilt wird nach VERPASSTEN TAKTEN, nicht nach einer festen
         Millisekundenzahl — aus demselben Grund wie oben. Der erste
         Anlauf verlangte "Mittel unter 14 ms" und ging darum selbst
         ohne Bremse bis auf Dichte 1 herunter: auf einem 60-Hz-Schirm
         gibt es kein Bild unter 16,7 ms zu gewinnen. Gemessen fiel die
         Leiter bei 1x, 4x und 6x Bremse gleichermassen bis ganz unten
         — ein Regler, der auf jedem Geraet dasselbe tut, misst nichts.

         Ein Viertel verpasster Takte im Fenster ist die Grenze.

         UND ES GIBT EINEN LETZTEN TERMIN: 5200 ms.

         Er stand erst auf 3600 — mit dem Gedanken, im Anflug nichts
         mehr anzufassen, weil ein Wechsel die Leinwand neu anlegt und
         weil dort die Aufloesung am meisten zaehlt. Die Messung hat den
         Gedanken widerlegt: die Arbeit je Bild ist waehrend der Reise
         etwa ein Viertel dessen, was sie bei der Ankunft ist (gemessen
         10 ms gegen 40, und die Bildrate fiel von 60 auf 16). Ein
         Regler, der nur die billige Haelfte pruefen darf und die teure
         ausnimmt, urteilt ueber den falschen Abschnitt — er sah 60
         Bilder je Sekunde und gab die volle Dichte frei, kurz bevor sie
         zusammenbrach.

         Ein Neuanlegen kostet EIN Bild. Zwei Sekunden mit 16 Bildern je
         Sekunde kosten ungleich mehr. Also wird bis in den Anflug
         hinein geurteilt, und nur die letzte Sekunde bleibt
         unangetastet.

         Das Fenster wird NICHT geleert, wenn zu wenige Bilder darin
         stehen. Erst hiess es "500 ms sind um, urteile" — und auf einem
         wirklich langsamen Geraet passen in 500 ms nur fuenf Bilder,
         also zu wenige zum Urteilen, also wurde verworfen und von vorn
         gesammelt, immer wieder. Bei sechsfacher Bremse ging die Leiter
         darum kein einziges Mal herunter: der Regler war ausgerechnet
         dort blind, wo er gebraucht wurde. */
      if (t > 900 && t < 5200 && dichteStufen < 2 && DPR > geraeteDichte / 4) {
        if (!dichteAb) dichteAb = t;
        dichteFenster.push(dtRoh);
        if (t - dichteAb >= 500 && dichteFenster.length >= 6) {
          /* EINMAL fragen, dann handeln UND aufschreiben. Erst stand die
             Frage zweimal da — einmal im Zweig, einmal im Mitschrieb.
             Eine Gegenprobe, die den Zweig aenderte, lief damit ins
             Leere: der Mitschrieb sagte weiter das Richtige, waehrend
             gehandelt wurde wie im Fehlerfall, und die Pruefreihe blieb
             gruen. Ein Protokoll, das nicht von der Entscheidung selbst
             stammt, bezeugt nichts. */
          var eng = stockt(dichteFenster, 0.25);
          if (leiter.length < 40) leiter.push([Math.round(t), DPR,
            dichteFenster.length, Math.round(Math.min.apply(null, dichteFenster)),
            Math.round(dichteFenster.reduce(function (a, b) { return a + b; }, 0) / dichteFenster.length),
            eng ? 1 : 0]);
          if (eng) {
            dichteStufen++;
            dichteDeckel = glatteStufe(DPR * 0.99);
            messen(true);
          }
          dichteFenster.length = 0; dichteAb = t;
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

      driftX += 0.010 * glatt(500, 2200, t) * (1 - abriss) * dt;
      driftY -= 0.006 * glatt(500, 2200, t) * (1 - abriss) * dt;
      /* DIE DRIFT LAEUFT AUF DIE ACHSE ZURUECK, je naeher das Ziel.

         Sie ist eine seitliche Kamerabewegung in WELTmassen, und die
         Perspektive vervielfacht sie mit der Naehe: fuenfzig Einheiten
         sind in der Ferne ein paar Pixel, kurz vor dem Zeichen aber
         ueber fuenfhundert. Physikalisch richtig — man fliegt dann eben
         AN dem Zeichen VORBEI statt hinein. Gewollt ist das Gegenteil.

         Also nimmt die Drift ab, sobald das Ziel in Sicht kommt, und
         ist bei der Ankunft null. Die Kamera atmet unterwegs und liegt
         am Ende genau auf der Achse — das Zeichen landet mittig.

         QUADRATISCH, nicht linear: der Versatz auf dem Schirm ist Drift
         mal Perspektive, und die Perspektive waechst mit eins durch
         Abstand. Eine Drift, die LINEAR mit dem Abstand abnimmt, hebt
         sich mit ihr exakt auf — gemessen blieb der Versatz konstant
         bei knapp vierzehn Pixeln, egal wie nah. Erst das Quadrat
         gewinnt gegen die Perspektive. */
      var einlauf = Math.pow(klemm((zielZ - fahrt) / 2600, 0, 1), 2);
      var camX = klemm(driftX, -55, 55) * einlauf;
      var camY = klemm(driftY, -40, 40) * einlauf;
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
      /* NIEDRIGE FILTERQUALITAET — und der Verzicht ist gemessen.

         "high" laesst den Browser mit Zwischenstufen verkleinern, und
         genau das rettet beim VERKLEINERN die Kanten. Es bringt an den
         Marken auch wirklich etwas: eine Kantenbreite, sieben statt
         sechs Geraetepunkte. Es kostet aber das 2,7-fache — die
         Malzeit der Reise stieg von 3,1 auf 8,2 ms, die des Anflugs von
         9,7 auf 24,7, und die Bildrate im Anflug fiel von 59 auf 33.
         Ein Pixel Kante fuer die halbe Bildrate ist kein Handel. */
      g.imageSmoothingQuality = "low";

      /* ---- Die Sterne ---- */
      g.globalCompositeOperation = "lighter";
      var punkte = [[], [], [], []];
      var striche = [[], [], [], []];
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
      var kernAktiv = kernDran;
      reihe.sort(function (a, b) { return b.kz - a.kz; });

      var maxGemalt = 0, formVerhaeltnis = 1, maxOrtX = -1, maxOrtY = -1;
      var kernOrtX = -1, kernOrtY = -1, kernGross = 0;

      function kernMalen() {
        var kf = F / kernZ;
        var kx = MX + (0 - camX) * kf;
        var ky = MY + (0 - camY) * kf;
        /* Fuer die Nachschau: wo steht das Zeichen, als Anteil des
           Schirms? Ueber die Helligkeit geraten waere es nicht — dort
           reden die anderen Marken mit, und der Schwerpunkt wandert mit
           ihnen. Hier steht die Zahl, mit der wirklich gemalt wird. */
        kernOrtX = kx / B;
        kernOrtY = ky / H;
        var kg = klemm(300 * kf, 8, Math.max(B, H) * 1.15);
        /* [10]: wie gross das Zeichen gemalt wird, als Vielfaches der
           Schirmbreite. Damit weiss die Nachschau, WANN es den Schirm
           fuellt — und kann ihre Schaerfemessung genau dorthin legen,
           statt sie an vorbeiziehenden Marken zu verrechnen. */
        kernGross = kg / B;
        var kd = blenden * klemm((6400 - kernZ) / 3800, 0, 1);
        var puls = 1 + 0.03 * Math.sin(t * 0.0021);
        /* Die Lichter des Kerns sind GEDECKELT, nicht mitwachsend: als
           das Zeichen schirmfuellend wurde, skalierten Glut, Streifen
           und Spinne mit — Blits von fuenftausend Pixeln Breite, jedes
           Bild, und die Drossel-Messung brach von 60 auf 20 ein. Was
           breiter ist als der Schirm, malt ohnehin nur Unsichtbares. */
        var GRENZE = Math.max(B, H);
        /* Der Hof: keine Fuellung mehr auf der Leinwand, sondern eine
           Ebene darunter. */
        var gg2 = Math.min(kg * 3.0 * puls, GRENZE * 0.95);
        glutStand = lichtSetzen(glutEbene, glutStand, kx, ky, gg2,
          kg < GRENZE * 0.75 ? kd * 0.42 : 0);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = kd * 0.18;
        var bb = Math.min(kg * 6 * (0.7 + 0.3 * puls), GRENZE * 1.15);
        var bh2 = Math.min(kg * 0.32, GRENZE * 0.09);
        g.drawImage(STREIF, kx - bb / 2, ky - bh2 / 2, bb, bh2);
        if (kg > 14) {
          g.globalAlpha = kd;
          g.globalCompositeOperation = "source-over";
          /* GROSS: der weiche Grund aus der Vorlage, die harten Kerzen
             gezeichnet. KLEIN: alles aus der kleinen Vorlage — dort ist
             eine Kerze zwei Pixel breit und kein Pfad wert.

             DIE GRENZE IN LEINWANDPUNKTEN, nicht in CSS-Punkten. Hier
             stand schlicht "kg > 128" — und kg zaehlt CSS-Punkte. Bei
             Pixeldichte 1,5 wurde die 128er Vorlage damit bis auf 192
             Leinwandpunkte gezogen, auf einem Telefon mit Dichte 3 also
             bis auf 384 Geraetepunkte. Dreifach hochgerechnet, ueber
             eine ganze Sekunde des Anflugs — und das ist die Sekunde,
             in der man nichts anderes ansieht.

             Gefunden habe ich es nicht durch Messen, sondern durch
             HINSEHEN: meine Zahlen galten dem Hoehepunkt, wo das
             Zeichen den Schirm fuellt und laengst gezeichnet wird. Im
             Bild davor sass ein kleines, matschiges Kaestchen. Dieselbe
             Grenze hatte ich bei den Marken schon richtiggestellt und
             hier stehen lassen. */
          if (kg * DPR > FERNGR && KERN_GRUND) {
            g.drawImage(KERN_GRUND, kx - kg / 2, ky - kg / 2, kg, kg);
            g.save();
            g.translate(kx - kg / 2, ky - kg / 2);
            kernKerzen(g, kg);
            g.restore();
          } else {
            g.drawImage(KERN_FERN, kx - kg / 2, ky - kg / 2, kg, kg);
          }
          var sg = Math.min(kg * 2.2, GRENZE * 0.85);
          spinneStand = lichtSetzen(spinneEbene, spinneStand, kx, ky, sg,
            kg < GRENZE * 0.55 ? kd * 0.32 : 0);
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
        if (gr > maxGemalt && deck > 0.2) {
          maxGemalt = gr;
          /* [11] [12]: WO die groesste Marke steht. Ohne das laesst sich
             ihre Schaerfe nicht messen — man wuesste nicht, welchen Teil
             des Bildes man ansehen muss, und maesse am Ende wieder das
             App-Zeichen statt der Marke. */
          maxOrtX = px3 / B; maxOrtY = py3 / H;
        }
        /* GESEHEN heisst: ab jetzt saehe man einen Bildtausch. Ein Logo,
           das frueher eintrifft — die Scheibe noch klein und matt im
           Nebel —, darf lautlos einwechseln; danach nie mehr.

           Der Merker hiess einmal "gross" — und seit "gross" die grosse
           Scheibe ist, setzte er sie auf true und drawImage bekam einen
           Wahrheitswert statt eines Bildes. Zwei Dinge, ein Name. */
        if (!kp2.gesehen && (gr > 90 || deck > 0.55)) kp2.gesehen = true;

        /* KEIN SCHATTENHOF MEHR.

           Hier lag ein weicher dunkler Hof hinter jeder Scheibe — als
           Kontaktabdunklung gedacht, die das Glas vom Nebel abhebt. Er
           ist nie zu sehen gewesen: die Sparschaltung schaltete ihn ab,
           und sie griff auf jedem Geraet. Gemessen kostet er 0,9 der
           4,0 Millisekunden je Bild der Reise — dreizehn weiche Blits,
           einer je Marke. Ein Viertel der Rechenzeit fuer eine Zutat,
           die noch nie jemand gesehen hat, ist kein Handel.

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
        /* WANN DIE KLEINE VORLAGE NOCH REICHT — gerechnet, nicht
           geraten. Hier stand die feste Grenze 150: bis dahin kam die
           Marke aus der fernen Fassung von 128 Punkten. Bei Pixeldichte
           1,5 sind 150 CSS-Punkte aber 225 Leinwandpunkte, also fast
           das Doppelte der Vorlage — gemessen brauchte die Kante eines
           Logos so vier bis fuenf Geraetepunkte. Genau das ist das
           "unscharf": nicht das App-Zeichen am Ende, sondern die
           Marken, die man die ganze Reise ueber ansieht.

           Die richtige Grenze steht schon da: eine Vorlage reicht,
           solange sie nicht hochgerechnet wird. Also vergleicht man
           ihre Punkte mit den Punkten, die gemalt werden — und weil
           darin die Dichte steckt, verschiebt sich die Grenze von
           selbst mit, wenn die Leiter die Dichte aendert. */
        var gemalt = gr * DPR;
        /* DIE STUFE WIRD NACH DEM VERHAELTNIS GEWAEHLT, NICHT NACH DER
           OBERGRENZE.

           Hier stand: bis 128 die ferne Vorlage, von 128 bis 288 die
           mittlere. Das klingt richtig und ist der Fehler, an dem die
           Kreise zitterten. Eine Marke, die mit 141 Punkten gemalt
           wird, bekam damit die 288er Vorlage — ZWEIFACH verkleinert.
           Die 128er waere um den Faktor 1,1 VERGROESSERT worden, und
           das ist beinahe verlustfrei. Verkleinern kostet Kanten,
           Vergroessern kostet nur Schaerfe; wer die Stufe nach der
           Obergrenze waehlt, greift systematisch zur teureren Seite.

           Gewechselt wird darum beim GEOMETRISCHEN MITTEL zweier
           Stufen — so ist der Fehler nach oben und nach unten gleich
           gross. Zwischen 128 und 288 liegt es bei 192, zwischen 288
           und 512 bei 384. Damit wird nie staerker als um den Faktor
           1,33 verkleinert; vorher waren es 2,25.

           Gesehen habe ich es an einer vierfach vergroesserten Marke:
           die Kante des Logos war stufig statt glatt. In einer Zahl
           stand es nicht — das Differenzbild zweier Bilder zeigt bei
           einer WACHSENDEN Scheibe zwangslaeufig den ganzen Ring, und
           ich hatte das erst fuer das Flackern gehalten. */
        var GRENZ_FM = Math.sqrt(FERNGR * MITTELGR);      /* 192 */
        var GRENZ_MN = Math.sqrt(MITTELGR * GROSS);       /* 384 */
        if (gemalt > GRENZ_FM && gemalt <= GRENZ_MN && kp2.mittel && !sparsam) {
          /* Die Zwischenstufe: dieselbe eine Zeichnung, nur aus einer
             Vorlage, die der gemalten Groesse nahekommt. */
          g.drawImage(kp2.mittel, px3 - malBreit / 2, py3 - malHoch / 2, malBreit, malHoch);
        } else if ((gemalt <= GRENZ_FM || sparsam || !GLAS_NAH || (!kp2.zeichen && !kp2.eigen)) && kp2.fern) {
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
          /* Dieselbe Regel wie auf den gebackenen Stufen — geschnitten
             am Kreis, gefuellt wenn das Logo seinen eigenen Grund
             mitbringt. Vorher stand hier eine zweite, eigene Rechnung,
             und sie kannte weder den Schnitt noch das Fuellen: die
             nahen Marken sahen darum anders aus als die fernen. */
          if (kp2.zeichen) {
            try {
              g.drawImage(kp2.zeichen, px3 - malBreit / 2, py3 - malHoch / 2, malBreit, malHoch);
            } catch (e) {}
          }
        }
        /* DER RAND — FUER JEDE MARKE, IN IHRER WIRKLICHEN GROESSE.

           Er stand frueher in den gebackenen Scheiben und wurde mit
           ihnen verkleinert. Eine Linie von unter einem Punkt Breite
           ueberlebt das nicht: welche Punkte der Filter trifft, wechselt
           mit jeder kleinsten Groessenaenderung, und der ganze Ring
           flackert. Als Kurve gezogen kann er das nicht — er hat bei
           jeder Groesse dieselbe Form und dieselbe Staerke.

           Erst ab einer Scheibe, auf der ein Rand ueberhaupt etwas
           bedeutet: darunter waeren es Pfade fuer nichts. */
        if (gemalt > 26) {
          g.globalAlpha = deck;
          g.save();
          g.translate(px3 - malBreit / 2, py3 - malHoch / 2);
          glasRand(g, malBreit);
          g.restore();
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
      /* Ist der Kern durch — die Kamera ist in ihm —, muessen seine
         Lichter AUSGEHEN. Auf der Leinwand geschah das von selbst
         (nicht gemalt ist nicht da); eine Ebene dagegen behaelt ihren
         letzten Stand und stuende sonst den ganzen Nachlauf ueber hell
         im Bild. */
      if (!kernAktiv) {
        glutStand = lichtSetzen(glutEbene, glutStand, 0, 0, 1, 0);
        spinneStand = lichtSetzen(spinneEbene, spinneStand, 0, 0, 1, 0);
      }

      /* HIER STAND DER SCHRIFTZUG. "Aktien-Liste" trat am Ende unter
         das Zeichen — meine Zutat, nicht die Bestellung, und
         ausdruecklich nicht gewollt. Er ist ersatzlos fort: die Szene
         endet im Zeichen, und das Zeichen spricht fuer sich. Der Name
         steht ohnehin ueberall in der App, gleich darunter. */

      /* Der Blitz der Ankunft — er kommt aus der NAEHE, nicht aus der
         Uhr: je dichter die Kamera am Zeichen, desto heller, und im
         Moment des Eintauchens deckt er den Schnitt zur Seite. Vorher
         hing er am Abriss-Fortschritt und zuendete auch dann, wenn das
         Zeichen noch weit war — ein Blitz ohne Ursache. */
      {
        var naehe = klemm((1150 - (zielZ - fahrt)) / 1050, 0, 1);
        /* Im Nachlauf (abriss > 1) zieht der Blitz weiter an, bis er
           deckt — so hat das Auge bis zum letzten Bild Bewegung, und
           der Uebergang zur Seite ist ein Aufloesen statt eines
           Standbilds. */
        var hell2 = abriss > 0
          ? Math.pow(naehe, 2.4) * 0.9 * (1 + 1.6 * Math.max(0, abriss - 1))
          : 0;
        var neuBlitz = Math.round(Math.min(1, hell2 * blenden) * 100) / 100;
        /* DER UEBERGANG ZUR APP IST DIESES LICHT.

           Vorher wurde der Deckel schlicht ausgeblendet, waehrend das
           Licht nur heller wurde — zwei Vorgaenge nebeneinander, von
           denen keiner den anderen erklaerte. Jetzt WAECHST das Licht
           aus der Mitte, also von dort, wo das App-Zeichen liegt und
           wohin die ganze Reise ging: es geht auf, deckt zu, und
           darunter steht die Liste. Ein Uebergang, der aus der Szene
           kommt statt neben ihr herzulaufen.

           Groesse und Deckkraft, sonst nichts — beides fuehrt der
           Kompositor, der Hauptfaden zahlt nichts dafuer. */
        var blitzGr = Math.round((0.42 + 1.05 * Math.min(1, hell2)) * 100) / 100;
        if ((neuBlitz !== blitzStand || blitzGr !== blitzGross) && blitzEbene) {
          blitzStand = neuBlitz; blitzGross = blitzGr;
          blitzEbene.style.opacity = neuBlitz;
          blitzEbene.style.transform = "scale(" + blitzGr + ")";
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
          Math.round(symAbw * 1000),
          Math.round(kernOrtX * 1000) / 1000,
          Math.round(kernOrtY * 1000) / 1000,
          Math.round(kernGross * 1000) / 1000,
          Math.round(maxOrtX * 1000) / 1000,
          Math.round(maxOrtY * 1000) / 1000]);
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
