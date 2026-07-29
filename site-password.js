/* Passwortschutz auf Serverebene — gilt fuer jeden Pfad,
   also auch fuer /energie-these.pdf, /sw.js und die News-Function.
   Passwort liegt als Environment-Variable SITE_PASSWORD in Netlify,
   nicht im Repo. Benutzername ist frei waehlbar. */

export default async (request, context) => {
  const expected = Netlify.env.get("SITE_PASSWORD");

  // Ohne gesetzte Variable bleibt die Seite offen, statt sich auszusperren
  if (!expected) return context.next();

  const header = request.headers.get("authorization") || "";

  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch (e) {
      decoded = "";
    }
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (password === expected) return context.next();
  }

  return new Response("Zugang nur mit Passwort.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Aktien-Liste", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
};

export const config = { path: "/*" };
