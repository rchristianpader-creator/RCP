/* Nimmt die Push-Anmeldung eines Geraets an und legt sie in Netlify Blobs ab.
   Mehrere Geraete sind moeglich, jedes bekommt einen eigenen Schluessel. */

import { getStore } from "@netlify/blobs";

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

  try {
    const store = getStore("aktien-push");
    await store.setJSON("sub-" + hash(sub.endpoint), sub);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, fehler: String((err && err.message) || err) }, 500);
  }
};

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
