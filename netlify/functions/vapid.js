/* Liefert den oeffentlichen VAPID-Schluessel an die Seite.
   Beim ersten Aufruf wird ein Schluesselpaar erzeugt und in Netlify Blobs gelegt.
   Setzt du VAPID_PUBLIC und VAPID_PRIVATE als Environment-Variablen, gelten die. */

import { getStore } from "@netlify/blobs";

export async function keys() {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    return {
      publicKey: process.env.VAPID_PUBLIC,
      privateKey: process.env.VAPID_PRIVATE
    };
  }
  const store = getStore("aktien-push");
  const saved = await store.get("vapid", { type: "json" });
  if (saved && saved.publicKey && saved.privateKey) return saved;

  // Nur beim allerersten Mal wird ueberhaupt ein Paar erzeugt — dafuer muss
  // web-push nicht bei jedem Kaltstart im Kopf stehen.
  const webpush = (await import("web-push")).default;
  const fresh = webpush.generateVAPIDKeys();
  await store.setJSON("vapid", fresh);
  return fresh;
}

export default async () => {
  try {
    const k = await keys();
    return new Response(JSON.stringify({ publicKey: k.publicKey }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ fehler: String((err && err.message) || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
