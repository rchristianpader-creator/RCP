/* Schickt eine Testmeldung an alle angemeldeten Geraete.
   Aufruf: /.netlify/functions/push-test */

import webpush from "web-push";
import { getStore } from "@netlify/blobs";
import { keys } from "./vapid.js";

export default async () => {
  try {
    const store = getStore("aktien-push");
    const list = await store.list({ prefix: "sub-" });
    const entries = [];
    for (const blob of list.blobs || []) {
      const sub = await store.get(blob.key, { type: "json" });
      if (sub && sub.endpoint) entries.push({ key: blob.key, sub: sub });
    }

    if (!entries.length) {
      return json({ ok: false, hinweis: "noch kein Geraet angemeldet" }, 404);
    }

    const k = await keys();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
      k.publicKey,
      k.privateKey
    );

    const results = [];
    for (const entry of entries) {
      try {
        await webpush.sendNotification(
          entry.sub,
          JSON.stringify({
            title: "Aktien-Liste",
            body: "Test — die Benachrichtigungen funktionieren.",
            url: "/",
            tag: "test"
          })
        );
        results.push({ geraet: entry.key, status: "gesendet" });
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) await store.delete(entry.key).catch(() => {});
        results.push({ geraet: entry.key, status: "Fehler " + code });
      }
    }

    return json({ ok: true, ergebnis: results });
  } catch (err) {
    return json({ ok: false, fehler: String((err && err.message) || err) }, 500);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
