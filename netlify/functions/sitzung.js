/* Gemeinsame Bausteine fuer Anmeldung und Sitzung.

   Ein einziges Geheimnis, Environment-Variable RCP_GEHEIMNIS, unterschreibt
   die Sitzungs-Kekse. Dieselbe Variable prueft die Edge Function am Tor
   (netlify/edge-functions/tor.js) — deshalb muss das Format beidseitig
   identisch bleiben:

     <base64url(JSON)>.<base64url(HMAC-SHA256 ueber den ersten Teil)>

   Passwoerter liegen nie im Klartext: scrypt mit eigenem Salz je Konto.

   Diese Datei ist ein Baustein, kein Endpunkt. Netlify behandelt aber jede
   Datei im Functions-Verzeichnis als Function und verlangt einen Default-
   Export — deshalb steht unten einer, der nur 404 sagt. */

import crypto from "node:crypto";

export const KEKS = "rcp_sitz";
export const LADEN = "aktien-konten";
export const BESUCH = "aktien-besuch";
export const MELDUNGEN = "aktien-meldungen";
export const ARTIKEL = "aktien-artikel";

/* ---------- Ein Verzeichnis neben den Eintraegen ----------

   Der Speicher ist beim Auflisten nicht sofort auf dem Stand. Ein eben
   geschriebener Eintrag steht unter seinem Schluessel sofort da — in der
   Liste des Speichers taucht er aber erst nach einer Weile auf. Fuer eine
   Zugangsanfrage heisst das: die Meldung ist beim Empfaenger, die Anfrage
   selbst aber noch nicht in der Verwaltung zu sehen.

   Deshalb fuehrt jeder betroffene Speicher ein eigenes Verzeichnis: ein
   einziger Eintrag, in dem die Schluessel stehen. Er wird beim Schreiben
   mitgepflegt und beim Lesen ausdruecklich frisch geholt.

   Gelesen wird beides und vereinigt. Das Verzeichnis ist der schnelle Weg,
   die Liste des Speichers der verlaessliche: geht eine Pflege daneben — zwei
   Anmeldungen in derselben Sekunde koennen sich ueberschreiben —, holt die
   Liste den Eintrag nach. Geloeschtes faellt hinten heraus, weil der Eintrag
   dazu ohnehin nicht mehr da ist. */
const VERZEICHNIS = "verzeichnis";

async function verzeichnis(store) {
  try {
    // Ausdruecklich frisch: sonst waere auch dieser Eintrag von gestern
    const v = await store.get(VERZEICHNIS, { type: "json", consistency: "strong" });
    return v && Array.isArray(v.keys) ? v.keys : [];
  } catch (e) {
    return [];
  }
}

export async function merken(store, key) {
  try {
    const keys = await verzeichnis(store);
    if (keys.indexOf(key) >= 0) return;
    keys.push(key);
    // Ein Deckel, damit das Verzeichnis nicht unbegrenzt waechst
    await store.setJSON(VERZEICHNIS, { keys: keys.slice(-3000) });
  } catch (e) { /* das Verzeichnis ist Beiwerk, die Liste bleibt */ }
}

export async function vergessen(store, keys) {
  try {
    const weg = new Set([].concat(keys));
    const bleibt = (await verzeichnis(store)).filter((k) => !weg.has(k));
    await store.setJSON(VERZEICHNIS, { keys: bleibt });
  } catch (e) {}
}

/* Alle Schluessel unter einem Praefix — aus beiden Quellen. */
export async function schluesselListe(store, praefix) {
  const [ausListe, ausVerzeichnis] = await Promise.all([
    store.list({ prefix: praefix })
      .then((l) => (l.blobs || []).map((b) => b.key))
      .catch(() => []),
    verzeichnis(store).then((k) => k.filter((x) => x.indexOf(praefix) === 0))
  ]);
  return [...new Set(ausListe.concat(ausVerzeichnis))];
}

/* Eine Meldung ins Buch schreiben, damit sie in der Glocke auftaucht.

   Der Schluessel traegt die Zeit rueckwaerts (1e15 minus Zeitstempel) — dann
   steht in der Liste des Speichers das Neueste vorn, ohne dass irgendwer
   sortieren muss.

   Schlaegt das Schreiben fehl, ist das kein Grund, den Push zu verhindern:
   die Meldung selbst ist wichtiger als ihr Eintrag im Buch. Deshalb wirft
   diese Funktion nie. */
export async function notieren(eintrag) {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore(MELDUNGEN);
    const zeit = Date.now();
    const id = String(1e15 - zeit) + "-" + Math.random().toString(36).slice(2, 8);
    const key = "m/" + id;
    await store.setJSON(key, {
      // Die Kennung, damit eine Meldung einzeln aufgeschlagen werden kann
      id: id,
      zeit: new Date(zeit).toISOString(),
      titel: String(eintrag.titel || "").slice(0, 80),
      text: String(eintrag.text || "").slice(0, 300),
      url: String(eintrag.url || "/").slice(0, 200),
      art: String(eintrag.art || "meldung").slice(0, 20),
      /* Kuerzel der Positionen, um die es geht. In der Glocke stehen sie als
         Zeichen an der Meldung; im Push geht das nicht, dort muessen sie im
         Text stehen. */
      zeichen: Array.isArray(eintrag.zeichen)
        ? eintrag.zeichen.slice(0, 6).map((z) => String(z).slice(0, 12))
        : [],
      /* Adresse eines Bildes zur Meldung — in der Glocke steht es darunter.
         Mit seinen Massen: damit die App den Platz im richtigen
         Seitenverhaeltnis freihalten kann und nichts beschneiden muss. */
      bild: String(eintrag.bild || "").slice(0, 200),
      bildB: Math.max(0, Math.min(20000, Math.round(Number(eintrag.bildB) || 0))),
      bildH: Math.max(0, Math.min(20000, Math.round(Number(eintrag.bildH) || 0))),
      // "chef" heisst: nur die Verwaltung bekommt das zu sehen
      nur: eintrag.nur === "chef" ? "chef" : ""
    });
    // Damit die Glocke sie sofort sieht und nicht erst, wenn der Speicher
    // sie auch auflistet
    await merken(store, key);
    return id;
  } catch (e) {
    // Das Buch ist Beiwerk
    return "";
  }
}

// Wie lange eine Sitzung gilt
export const DAUER_KURZ = 12 * 60 * 60;        // ohne "merken": ein halber Tag
export const DAUER_LANG = 90 * 24 * 60 * 60;   // mit "merken": drei Monate

export function geheimnis() {
  return process.env.RCP_GEHEIMNIS || "";
}

export function signieren(daten, sekunden) {
  const g = geheimnis();
  if (!g) return null;
  const nutz = Object.assign({}, daten, { a: Math.floor(Date.now() / 1000) + sekunden });
  const teil = Buffer.from(JSON.stringify(nutz), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", g).update(teil).digest("base64url");
  return teil + "." + sig;
}

export function pruefen(token) {
  const g = geheimnis();
  if (!g || !token) return null;
  const punkt = token.indexOf(".");
  if (punkt < 1) return null;

  const teil = token.slice(0, punkt);
  const sig = token.slice(punkt + 1);
  const soll = crypto.createHmac("sha256", g).update(teil).digest("base64url");
  if (sig.length !== soll.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(soll))) return null;

  let daten = null;
  try {
    daten = JSON.parse(Buffer.from(teil, "base64url").toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!daten || !daten.a || daten.a < Math.floor(Date.now() / 1000)) return null;
  return daten;
}

/* Kopfzeile fuer Anfragen, die eine Function an die eigene Seite stellt
   (status.js, alerts.js, on-publish.js lesen die veroeffentlichte
   index.html). Ohne sie wuerde das Tor die eigene Seite aussperren. */
export function dienstKopf() {
  const t = signieren({ m: "dienst", r: "dienst" }, 120);
  return t ? { "x-rcp-sitzung": t } : {};
}

export function keksLesen(request, name) {
  const roh = request.headers.get("cookie") || "";
  for (const stueck of roh.split(";")) {
    const i = stueck.indexOf("=");
    if (i < 0) continue;
    if (stueck.slice(0, i).trim() === name) return decodeURIComponent(stueck.slice(i + 1).trim());
  }
  return "";
}

export function keksSetzen(wert, sekunden) {
  const teile = [
    KEKS + "=" + encodeURIComponent(wert),
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ];
  if (sekunden > 0) teile.push("Max-Age=" + sekunden);
  return teile.join("; ");
}

export function keksLoeschen() {
  return KEKS + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

/* Passwort */

export function hashen(passwort, salz) {
  const s = salz || crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(passwort), s, 64).toString("hex");
  return { salz: s, hash: h };
}

export function passtPasswort(passwort, salz, hash) {
  if (!salz || !hash) return false;
  const eigen = hashen(passwort, salz).hash;
  if (eigen.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(eigen, "hex"), Buffer.from(hash, "hex"));
}

/* Konten */

export function mailNormal(mail) {
  return String(mail || "").trim().toLowerCase();
}

export function mailGueltig(mail) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail);
}

export function schluessel(mail) {
  return "nutzer/" + crypto.createHash("sha256").update(mailNormal(mail)).digest("hex");
}

/* Wer stellt diese Anfrage? Liest den Keks, schlaegt das Konto frisch nach
   und gibt nur zurueck, was auch wirklich freigegeben ist. Die Rolle steht
   damit nie im Keks zur Debatte, sondern immer im gespeicherten Konto. */
export async function kontoLesen(request) {
  const token = keksLesen(request, KEKS) || request.headers.get("x-rcp-sitzung") || "";
  const s = pruefen(token);
  if (!s || !s.m) return null;
  try {
    const { getStore } = await import("@netlify/blobs");
    /* Frisch: die Rolle und der Status entscheiden ueber den Zugang, und ein
       Konto, das gerade freigegeben wurde, darf nicht noch eine Weile als
       wartend gelten. */
    const k = await getStore(LADEN).get(schluessel(s.m), { type: "json", consistency: "strong" });
    if (!k || k.status !== "frei") return null;
    return k;
  } catch (e) {
    return null;
  }
}

export async function chefLesen(request) {
  const k = await kontoLesen(request);
  return k && k.rolle === "chef" ? k : null;
}

/* Kein Endpunkt — siehe Kopf der Datei. */
export default async () => {
  return new Response(JSON.stringify({ ok: false, fehler: "kein Endpunkt" }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
};
