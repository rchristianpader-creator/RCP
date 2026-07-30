/* Nimmt die Push-Anmeldung eines Geraets an und legt sie in Netlify Blobs ab.
   Mehrere Geraete sind moeglich, jedes bekommt einen eigenen Schluessel.

   Zu jedem Geraet wird vermerkt, wer daran angemeldet ist. Nur so koennen
   Meldungen, die nur die Verwaltung angehen — etwa eine neue Zugangsanfrage —
   auch nur dorthin gehen. Kursalarme gehen weiter an alle. */

import { getStore } from "@netlify/blobs";
import { LADEN, KEKS, pruefen, keksLesen, schluessel } from "./sitzung.js";

export default async (request) => {
  if (request.method !== "POST") {
    return json({ ok: false, fehler: "POST erwartet" }, 405);
  }

  let sub;
  try {
    sub = await request.json();
  } catch (e) {
    return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
  }

  if (!sub || !sub.endpoint || !sub.keys) {
    return json({ ok: false, fehler: "Subscription unvollstaendig" }, 400);
  }

  const wer = await besitzer(request);

  try {
    const store = getStore("aktien-push");
    await store.setJSON("sub-" + hash(sub.endpoint), {
      endpoint: sub.endpoint,
      keys: sub.keys,
      expirationTime: sub.expirationTime || null,
      mail: wer ? wer.mail : null,
      rolle: wer ? wer.rolle : null,
      zeit: new Date().toISOString()
    });
    return json({ ok: true, konto: wer ? wer.mail : null });
  } catch (err) {
    return json({ ok: false, fehler: String((err && err.message) || err) }, 500);
  }
};

async function besitzer(request) {
  const token = keksLesen(request, KEKS) || request.headers.get("x-rcp-sitzung") || "";
  const s = pruefen(token);
  if (!s || !s.m) return null;
  try {
    const k = await getStore(LADEN).get(schluessel(s.m), { type: "json" });
    if (!k || k.status !== "frei") return null;
    return { mail: k.mail, rolle: k.rolle || "gast" };
  } catch (e) {
    return null;
  }
}

// kurzer, stabiler Schluessel aus dem Endpoint
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
