/* Das Tor. Laeuft vor allem anderen, auf jedem Pfad.

   Ohne gueltige Sitzung geht nichts durch: keine index.html, kein PDF,
   keine Kursdaten. Der Browser bekommt die Seite gar nicht erst zu sehen —
   anders als beim frueheren PIN, der im Quelltext stand und nur ein
   Vorhang war.

   Geprueft wird der Keks rcp_sitz, unterschrieben mit RCP_GEHEIMNIS.
   Dasselbe Format erzeugt netlify/functions/sitzung.js. */

const KEKS = "rcp_sitz";

/* Ohne Anmeldung erreichbar:
   - die Anmeldeseite selbst
   - die Konto-Function, sonst koennte man sich nie anmelden
   - Manifest, Symbole und die Ansichten fuers Installationsfenster: der
     Browser holt sie beim Installieren teils ohne Keks, und sie verraten
     nichts, was nicht ohnehin auf der Anmeldeseite steht
   - on-publish: das ist der Webhook, den Netlify nach jedem Deploy ruft */
const OFFEN = [
  "/anmelden.html",
  "/.netlify/functions/konto",
  "/.netlify/functions/on-publish",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/robots.txt"
];

/* Der laufende Hintergrund der Anmeldeseite gehoert dazu — ohne ihn stuende
   sie leer. Zwei Kacheln, die vordere und die blasse; der Anfang statt einer
   Liste, damit eine dritte nicht wieder nachgepflegt werden muss. */
const OFFEN_ANFANG = ["/icon-", "/og-preview", "/ansicht-", "/kerzen", "/grund"];

/* Das Tor faellt nie mit der ganzen Seite um.

   Diese Function laeuft vor jedem Pfad. Wirft sie, antwortet Netlify mit
   "This edge function has crashed" — und zwar auf alles: Seite, Symbole,
   Anmeldung. Ein Tuersteher, der stolpert, darf nicht das Haus schliessen.

   Deshalb liegt alles Riskante in einem Versuch, und wenn etwas
   Unerwartetes passiert, wird abgewiesen statt abgestuerzt: zur Anmeldung,
   nicht ins Leere. Das faellt zur sicheren Seite — wer nicht geprueft
   werden kann, kommt nicht durch —, und die Anmeldeseite selbst bleibt
   erreichbar, weil sie in OFFEN steht und beantwortet ist, bevor
   irgendetwas passieren kann, das werfen koennte. */
export default async (request, context) => {
  let url;
  try {
    url = new URL(request.url);
    const pfad = url.pathname;

    /* "return await", nicht "return".

       Ohne das await gibt diese Function das Versprechen zurueck, bevor es
       sich entschieden hat — und ein Wurf daraus fliegt am catch vorbei,
       weil der Versuch da laengst verlassen ist. Genau daran ist der
       Rueckweg beim ersten Anlauf gescheitert: alles abgesichert, und der
       eine Pfad, der am haeufigsten genommen wird, war es nicht. */
    if (OFFEN.indexOf(pfad) >= 0) return await context.next();
    for (const p of OFFEN_ANFANG) {
      if (pfad.startsWith(p)) return await context.next();
    }

    /* Ohne die Umgebung gibt es nichts zu pruefen. Der Zugriff steht hier
       in einem eigenen Versuch, weil schon das Fehlen des Netlify-Objekts
       werfen wuerde — und das waere der Absturz, den es zu verhindern
       gilt. */
    let geheim = "";
    try {
      geheim = Netlify.env.get("RCP_GEHEIMNIS") || "";
    } catch (e) {
      geheim = "";
    }
    if (!geheim) return einrichten();

    const token = keksLesen(request) || request.headers.get("x-rcp-sitzung") || "";
    const daten = await pruefen(token, geheim);
    if (daten) return await durchlassen(context, url, daten);

    return abweisen(request, url);
  } catch (e) {
    try {
      return abweisen(request, url || new URL("https://x/"));
    } catch (e2) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/anmelden.html", "Cache-Control": "no-store" }
      });
    }
  }
};

/* Im Browser bleibt die Liste zu — das soll dazu bringen, die App zu
   nehmen. Fuer die Verwaltung gilt das nicht: wer die Liste pflegt,
   braucht sie auch am Schreibtisch und unterwegs im Browser.

   Die Seite selbst kann das nicht wissen: der Sitzungs-Keks ist HttpOnly,
   kein Skript kommt daran. Hier ist die Unterschrift aber schon geprueft —
   also legt das Tor ein lesbares Zeichen daneben, und das Kopfskript in
   index.html sieht vor dem ersten Bild nach.

   Nur an Seiten, nicht an jedes Symbol: sonst haengte an jeder Anfrage ein
   Set-Cookie. */
async function durchlassen(context, url, daten) {
  const seite = url.pathname === "/" || url.pathname.endsWith(".html");
  if (!seite) return context.next();

  const antwort = await context.next();
  /* Das Zeichen ist Beiwerk. Kommt von dort etwas zurueck, an das sich keine
     Kopfzeile haengen laesst, geht die Antwort trotzdem durch — eine Sperre,
     die an einer Nebensache scheitert, waere schlimmer als keine. */
  if (!antwort || !antwort.headers || typeof antwort.headers.append !== "function") {
    return antwort;
  }

  const chef = daten && daten.r === "chef";
  antwort.headers.append(
    "set-cookie",
    chef
      ? "rcp_frei=1; Path=/; Secure; SameSite=Lax; Max-Age=" + 90 * 24 * 60 * 60
      : "rcp_frei=; Path=/; Secure; SameSite=Lax; Max-Age=0"
  );
  return antwort;
}

function abweisen(request, url) {
  const akzeptiert = request.headers.get("accept") || "";
  const modus = request.headers.get("sec-fetch-mode") || "";
  const seite =
    modus === "navigate" ||
    (akzeptiert.includes("text/html") && !url.pathname.startsWith("/.netlify/"));

  if (seite) {
    const ziel = url.pathname + url.search;
    const hin = "/anmelden.html" + (ziel && ziel !== "/" ? "?ziel=" + encodeURIComponent(ziel) : "");
    return new Response(null, {
      status: 302,
      headers: { Location: hin, "Cache-Control": "no-store" }
    });
  }

  return new Response(JSON.stringify({ ok: false, fehler: "nicht angemeldet" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      // Der Service Worker erkennt daran, dass er das nicht als Seite ablegen darf
      "X-RCP-Anmeldung": "1"
    }
  });
}

/* Solange RCP_GEHEIMNIS fehlt, kann nichts unterschrieben und nichts
   geprueft werden. Dann bleibt die Seite zu — mit einer Ansage, was fehlt,
   statt still offen zu stehen. */
function einrichten() {
  const vorschlag = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Einrichtung</title><style>
:root{color-scheme:light}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Helvetica,Arial,sans-serif;
background:#fafafa;color:#111;line-height:1.5;padding:48px 24px;display:flex;justify-content:center}
.k{max-width:520px;width:100%;background:#fff;border:1px solid #e5e5e5;border-radius:2px;padding:28px 24px}
.l{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#737373;font-weight:600;margin-bottom:12px}
h1{font-size:20px;letter-spacing:-.3px;margin-bottom:12px}
p{font-size:14px;color:#444;margin-bottom:14px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:#f5f5f5;
border:1px solid #ebebeb;border-radius:2px;padding:2px 5px}
.wert{display:block;padding:10px;margin:10px 0 18px;word-break:break-all;line-height:1.6}
ol{font-size:14px;color:#444;padding-left:20px}li{margin-bottom:6px}
</style></head><body><div class="k">
<div class="l">Einrichtung</div>
<h1>Es fehlt ein Geheimnis</h1>
<p>Die Seite bleibt zu, bis in Netlify die Environment-Variable
<code>RCP_GEHEIMNIS</code> gesetzt ist. Damit werden die Anmeldungen unterschrieben.</p>
<ol>
<li>Netlify &rarr; Site configuration &rarr; Environment variables</li>
<li>Key: <code>RCP_GEHEIMNIS</code></li>
<li>Value: ein langer Zufallstext, zum Beispiel dieser hier</li>
<li>Danach einmal neu deployen</li>
</ol>
<code class="wert">${vorschlag}</code>
<p>Anschliessend <code>/anmelden.html</code> aufrufen und das erste Konto anlegen —
das erste Konto wird automatisch die Verwaltung.</p>
</div></body></html>`;

  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

/* ---------- Keks und Unterschrift ---------- */

function keksLesen(request) {
  const roh = request.headers.get("cookie") || "";
  for (const stueck of roh.split(";")) {
    const i = stueck.indexOf("=");
    if (i < 0) continue;
    if (stueck.slice(0, i).trim() === KEKS) return decodeURIComponent(stueck.slice(i + 1).trim());
  }
  return "";
}

function ausB64u(text) {
  const s = text.replace(/-/g, "+").replace(/_/g, "/");
  const roh = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

function nachB64u(bytes) {
  let roh = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) roh += String.fromCharCode(arr[i]);
  return btoa(roh).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pruefen(token, geheim) {
  if (!token) return null;
  const punkt = token.indexOf(".");
  if (punkt < 1) return null;

  const teil = token.slice(0, punkt);
  const sig = token.slice(punkt + 1);

  let soll = "";
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(geheim),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    soll = nachB64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(teil)));
  } catch (e) {
    return null;
  }

  if (sig.length !== soll.length) return null;
  let gleich = 0;
  for (let i = 0; i < sig.length; i++) gleich |= sig.charCodeAt(i) ^ soll.charCodeAt(i);
  if (gleich !== 0) return null;

  let daten = null;
  try {
    daten = JSON.parse(new TextDecoder().decode(ausB64u(teil)));
  } catch (e) {
    return null;
  }
  if (!daten || !daten.a || daten.a < Math.floor(Date.now() / 1000)) return null;
  return daten;
}

export const config = { path: "/*" };
