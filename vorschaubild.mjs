/* Das Link-Vorschaubild (1200 x 630).

   Was in WhatsApp, iMessage oder Slack unter dem Link steht. Es ist ein
   Versprechen darueber, was dahinter liegt — es muss also aussehen wie die
   App und nicht wie ein Plakat ueber sie.

   Warum gerendert und nicht gezeichnet
   ------------------------------------
   Die Marken kommen aus index.html selbst: der :root-Block wird
   herausgeschnitten und hier eingesetzt. Damit benutzt das Bild denselben
   Grund, dieselben Glasmarken, dieselben Radien und dieselben Farben wie
   die Seite — und nicht eine Nachbildung davon, die beim naechsten
   Nachbessern zurueckbleibt.

   Dieses Skript stand im README beschrieben, lag aber nirgends: es war ein
   Wegwerf-Skript, und das Bild daneben war der letzte Stand, den niemand
   mehr erzeugen konnte. Jetzt liegt es dabei.

   Aufruf:
       node vorschaubild.mjs
       -> og-preview.png und og-preview-black.png

   Der schwarze Anstrich entsteht aus derselben Vorlage. Er ist nicht im
   Einsatz; er liegt daneben, damit die Entscheidung eine Zeile bleibt und
   nicht eine zweite Gestaltung.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const pw = (await import("/opt/node22/lib/node_modules/playwright/index.js")).default;

const seite = fs.readFileSync(path.join(HIER, "index.html"), "utf8");

/* Den Markenblock aus der Seite schneiden. Bis zur ersten schliessenden
   Klammer — darin stehen keine verschachtelten Bloecke. */
function marken() {
  const css = [...seite.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const start = css.indexOf(":root");
  const auf = css.indexOf("{", start);
  const zu = css.indexOf("}", auf);
  if (start < 0 || zu < 0) throw new Error("kein :root-Block in index.html gefunden");
  return css.slice(auf + 1, zu);
}

/* Bilder als Daten einsetzen, damit kein Server laufen muss. */
function alsDaten(datei, typ) {
  const roh = fs.readFileSync(path.join(HIER, datei));
  return "data:" + typ + ";base64," + roh.toString("base64");
}
const KORN = alsDaten("grund.svg", "image/svg+xml");
const KERZEN = alsDaten("kerzen.svg", "image/svg+xml");
const ZEICHEN = alsDaten("icon-192.png", "image/png");

const KUERZEL = ["UAA", "DOW", "NVO", "TSLA", "BTC", "HUT", "GOLD", "INTC"];

/* Ein Anstrich ist eine Zeile, keine zweite Gestaltung. */
const ANSTRICH = {
  "og-preview.png": "",
  "og-preview-black.png": "html { --bg: #000000; --bg-rgb: 0,0,0; }"
};

function html(zusatz) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><style>
  :root {${marken().replace(/url\("\/grund\.svg[^"]*"\)/g, 'url("' + KORN + '")')}}
  ${zusatz}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    font-family: "Liberation Sans", Arial, Helvetica, sans-serif;
    color: var(--fg);
    background: var(--grund-flaeche);
    background-size: var(--grund-kacheln);
    display: flex;
    align-items: center;
    padding: 0 72px;
    overflow: hidden;
    position: relative;
  }
  /* Das Kerzenband unten, sehr blass — dieselbe Zeichnung wie hinter dem
     Anmeldekasten. Der Inhalt endet darueber, sonst wirkt es unruhig. */
  .band {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 118px;
    background: url("${KERZEN}") repeat-x bottom left;
    background-size: auto 118px;
    opacity: 0.42;
  }
  .karte {
    position: relative;
    z-index: 1;
    width: 100%;
    border-radius: 28px;
    border: 1px solid var(--line);
    padding: 44px 54px 46px;
    /* Der Inhalt endet ueber dem Band. Ragt die Karte hinein, schauen
       unten Bruchstuecke von Kerzen hervor, und die lesen sich als Rest,
       nicht als Zeichnung. */
    margin-bottom: 92px;
    background: var(--glas-glanz-karte);
    box-shadow: var(--glas-kante-glanz), var(--hebung);
  }
  .kopf { display: flex; align-items: center; gap: 18px; }
  .kopf img { width: 54px; height: 54px; border-radius: 14px; display: block; }
  .kopf b { font-size: 25px; font-weight: 700; letter-spacing: -0.2px; }
  .kopf .rechts {
    margin-left: auto;
    font-size: 15px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  .strich { height: 1px; background: var(--hair); margin: 30px 0 34px; }
  .label {
    font-size: 15px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }
  h1 { font-size: 92px; font-weight: 700; letter-spacing: -2.2px; margin: 14px 0 0; }
  .sub { font-size: 27px; color: var(--muted); margin-top: 14px; }
  .kuerzel { display: flex; gap: 10px; margin-top: 34px; }
  .kuerzel span {
    font-size: 15px;
    letter-spacing: 0.14em;
    font-weight: 700;
    padding: 9px 14px;
    border-radius: var(--r-chip);
    border: 1px solid var(--line);
    background: var(--glas-schimmer), var(--glas-fuellung-taste);
    box-shadow: var(--glas-kante);
  }
  </style></head><body>
  <div class="band"></div>
  <div class="karte">
    <div class="kopf">
      <img src="${ZEICHEN}" alt="">
      <b>Ralph Christian Pader</b>
      <span class="rechts">Zugang auf Anfrage</span>
    </div>
    <div class="strich"></div>
    <div class="label">Watchlist</div>
    <h1>Aktien-Liste</h1>
    <div class="sub">Live-Charts · Technische Analyse · Einkaufszonen</div>
    <div class="kuerzel">${KUERZEL.map((k) => "<span>" + k + "</span>").join("")}</div>
  </div>
  </body></html>`;
}

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } });
const p = await ctx.newPage();
/* Auf 256 Farben mit Streuung.

   Roh sind es 821 kB — ueber der Grenze von 600, die sw-test prueft. Der
   Grund ist die Koernung: feines Rauschen ist fuer einen PNG-Packer der
   schlimmste Fall, jeder Punkt anders als sein Nachbar.

   Eine Palette mit Streuung loest das, ohne die Koernung aufzugeben: 350
   statt 821 kB. Ohne Streuung waeren die dunklen Verlaeufe wieder
   gestreift — genau das, wogegen die Koernung ueberhaupt da ist. */
import { execFileSync } from "node:child_process";

for (const [datei, zusatz] of Object.entries(ANSTRICH)) {
  const ziel = path.join(HIER, datei);
  await p.setContent(html(zusatz), { waitUntil: "load" });
  await p.waitForTimeout(300);
  await p.screenshot({ path: ziel });
  execFileSync("python3", ["-c",
    "from PIL import Image;import sys;" +
    "p=sys.argv[1];" +
    "Image.open(p).quantize(colors=256, dither=Image.Dither.FLOYDSTEINBERG)" +
    ".save(p, optimize=True)", ziel]);
  const kb = Math.round(fs.statSync(ziel).size / 1024);
  console.log(datei + "  " + kb + " kB" + (kb < 600 ? "" : "   ZU GROSS"));
}
await browser.close();
