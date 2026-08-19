/* Die Watchlist als Daten.

   Bis hierher standen die zehn Karten als HTML in index.html und mussten von
   Hand gepflegt werden; status.js und alerts.js lasen die Zonen wieder aus
   dieser Seite heraus. Jetzt liegt die Liste in Netlify Blobs, die Seite baut
   ihre Karten daraus, und die Alarme lesen dieselbe Quelle.

   Aufruf: /.netlify/functions/positionen

     GET                        -> { ok, positionen: [...] }   fuer jeden Angemeldeten
     POST { positionen: [...] } -> ganze Liste ersetzen         nur Verwaltung

   Gespeichert wird die vollstaendige Liste in einem Eintrag: sie ist klein,
   die Reihenfolge steckt darin, und ein Schreibvorgang ist immer vollstaendig.

   Beim allerersten Aufruf, solange nichts gespeichert ist, wird der Bestand
   aus positionen-start.js uebernommen.

   Drei Anlaesse melden sich von selbst: eine Position kommt dazu, ihre Zone
   oder ihr Ziel aendert sich, oder sie wird als ueberarbeitet markiert. Immer
   nur beim Uebergang — sonst ginge bei jedem Umsortieren dasselbe noch
   einmal raus. */

import { getStore } from "@netlify/blobs";
import { START, NACHTRAG } from "./positionen-start.js";
import { keys } from "./vapid.js";
import { kontoLesen, chefLesen, geheimnis, notieren } from "./sitzung.js";

export const LADEN = "aktien-positionen";
export const EINTRAG = "liste";

const GRENZEN = {
  id: 24, name: 80, badge: 12, chip: 10, branche: 60,
  zone: 40, ziel: 40, tv: 40, yahoo: 20, frage: 80, keys: 120
};

export default async (request) => {
  if (!geheimnis()) {
    return json({ ok: false, fehler: "RCP_GEHEIMNIS ist nicht gesetzt" }, 503);
  }

  const store = getStore(LADEN);

  if (request.method !== "POST") {
    // Lesen darf jeder, der angemeldet ist — die Seite braucht es zum Aufbauen
    if (!(await kontoLesen(request))) {
      return json({ ok: false, fehler: "nicht angemeldet" }, 401);
    }
    /* Was nur der Verwaltung gehoert, geht auch nur an sie.

       Gefiltert wird hier und nicht in lesen(): lesen() ist die Wahrheit
       fuer alles Innere — Nachtrag, Statusabruf, Zonenwache — und die
       braucht die vollstaendige Liste. Wer sie beschneidet, verliert die
       Position auch fuer den Chef. */
    const alles = await lesen(store);
    const chef = await chefLesen(request);
    const liste = chef ? alles : alles.filter((p) => !p.nurchef);
    return json({ ok: true, anzahl: liste.length, positionen: liste });
  }

  const chef = await chefLesen(request);
  if (!chef) return json({ ok: false, fehler: "nur fuer die Verwaltung" }, 403);

  let body = {};
  try {
    body = (await request.json()) || {};
  } catch (e) {
    return json({ ok: false, fehler: "kein gueltiges JSON" }, 400);
  }

  const gepruft = pruefen(body.positionen);
  if (gepruft.fehler) return json({ ok: false, fehler: gepruft.fehler }, 400);

  const vorher = await lesen(store);
  const alt = new Map(vorher.map((p) => [p.id, p]));

  /* Seit wann diese Position mit dieser Zone auf der Liste steht.

     status.js sucht in den Tageskerzen des letzten Monats nach einer
     Beruehrung der Zone und schreibt dann AKTIV an die Karte. Ohne einen
     Zeitpunkt findet es auch Kerzen von vorher — und eine eben angelegte
     Position stand sofort als aktiv da, obwohl der Kurs seit dem Anlegen
     nie in ihrer Naehe war. Das war bei OXY zu sehen: der Kurs lag sieben
     Prozent ueber der Zone, unten im Chart lag die Beruehrung drei Wochen
     zurueck, aus einer Zeit, in der es die Position noch gar nicht gab.

     Eine geaenderte Zone ist ein neues Setup und faengt deshalb von vorne
     an. Alles andere — Name, Reihenfolge, Ziel — laesst den Zeitpunkt
     stehen.

     Rueckwirkend wird nichts gesetzt. Positionen aus der Zeit vor diesem
     Feld behalten den vollen Rueckblick, sonst faellt bei ihnen ein AKTIV
     weg, das zu Recht dasteht — der Kurs war vor Kurzem wirklich in ihrer
     Zone. Die einzige Ausnahme ist die NEU-Markierung: sie sagt selbst,
     dass die Position gerade erst dazugekommen ist. Damit sortiert sich der
     Altbestand beim naechsten Speichern von allein, ohne dass jemand
     entscheiden muesste, was alt ist und was nicht. */
  const jetzt = new Date().toISOString();
  for (const p of gepruft.liste) {
    const v = alt.get(p.id);
    if (!v || v.zone !== p.zone) p.seit = jetzt;   // dazugekommen oder neue Zone
    else if (v.seit) p.seit = v.seit;              // bleibt stehen
    else if (p.neu) p.seit = jetzt;                // Altbestand, aber als NEU markiert
    // sonst: ohne Zeitpunkt, also weiter mit vollem Rueckblick
  }

  /* Die Nachtrag-Vermerke muessen mit. Ohne sie waere ein Speichern in der
     Verwaltung genug, um sie zu verlieren — und beim naechsten Lesen kaeme
     eine geloeschte Position wieder.

     Sie stehen im gespeicherten Objekt, nicht in der Liste; lesen() gibt nur
     die Liste zurueck. Deshalb hier noch einmal direkt nachgesehen. Beim
     ersten Anlauf stand an dieser Stelle alt.nachgetragen — alt ist aber
     eine Map der Positionen, und der Ausdruck war still undefined: die
     Vermerke waeren beim ersten Speichern verschwunden. */
  await store.setJSON(EINTRAG, { zeit: jetzt, von: chef.mail, liste: gepruft.liste,
                                 nachgetragen: await vermerke(store) });

  /* Drei Anlaesse, und jede Position hoechstens in einem — sonst bekaeme man
     fuer denselben Handgriff zwei Meldungen:

       1. dazugekommen
       2. Zone oder Ziel geaendert — die Zahlen, um die es hier ueberhaupt
          geht; die Meldung nennt sie
       3. als UPDATE markiert, ohne dass sich an den Zahlen etwas geaendert
          haette

     Wer beim Aendern auch den Haken setzt — der Normalfall — bekommt (2):
     die Zahlen sagen mehr als das Wort.

     Gemeldet wird nur der Uebergang. Sonst ginge bei jedem Umsortieren
     dasselbe noch einmal raus. */
  const neu = gepruft.liste.filter((p) => !alt.has(p.id));

  const geaendert = [];
  const ueberarbeitet = [];
  for (const p of gepruft.liste) {
    const v = alt.get(p.id);
    if (!v) continue;                                   // steht schon unter "neu"
    if (p.zone !== v.zone || p.ziel !== v.ziel) geaendert.push({ p: p, v: v });
    else if (p.update && !v.update) ueberarbeitet.push(p);
  }

  let gemeldet = 0;
  if (body.melden !== false) {
    if (neu.length) {
      gemeldet += await melden("Neu in der Liste", kuerzel(neu), neu[0].id, "neu",
                               zeichen(neu));
    }
    if (geaendert.length) {
      gemeldet += await melden(titelAenderung(geaendert), textAenderung(geaendert),
                               geaendert[0].p.id, "aenderung",
                               zeichen(geaendert.map((x) => x.p)));
    }
    if (ueberarbeitet.length) {
      gemeldet += await melden("Überarbeitet", kuerzel(ueberarbeitet), ueberarbeitet[0].id, "update",
                               zeichen(ueberarbeitet));
    }
  }

  return json({
    ok: true,
    anzahl: gepruft.liste.length,
    neu: neu.map((p) => p.badge),
    geaendert: geaendert.map((x) => x.p.badge),
    ueberarbeitet: ueberarbeitet.map((p) => p.badge),
    gemeldet: gemeldet
  });
};

/* Die Nachtrag-Vermerke aus dem Speicher, ohne die Liste. */
async function vermerke(store) {
  try {
    const da = await store.get(EINTRAG, { type: "json", consistency: "strong" });
    return Array.isArray(da && da.nachgetragen) ? da.nachgetragen : [];
  } catch (e) {
    return [];
  }
}

/* Nachtragen, was im Code steht und im Speicher fehlt.

   Geschrieben wird beim Lesen — dieselbe Ausnahme wie beim allerersten
   Aufruf weiter unten, und aus demselben Grund: ein Handgriff, den niemand
   kennt, ist keine Loesung. Die Position soll dastehen, sobald der Code
   ausgeliefert ist, nicht erst wenn jemand zufaellig etwas speichert.

   Gemeldet wird wie bei jeder neuen Position auch. Der Vermerk wird VOR der
   Meldung gesetzt: lieber eine Meldung, die einmal ausfaellt, als eine, die
   bei jedem Aufruf noch einmal rausgeht. */
async function nachtragen(store, da) {
  if (!Array.isArray(NACHTRAG) || !NACHTRAG.length) return da;

  const getan = new Set(Array.isArray(da.nachgetragen) ? da.nachgetragen : []);
  const daIds = new Set(da.liste.map((p) => p && p.id));
  const offen = NACHTRAG.filter((n) =>
    n && n.position && n.schluessel &&
    !getan.has(n.schluessel) && !daIds.has(n.position.id));
  if (!offen.length) return da;

  /* Durch dieselbe Pruefung wie alles andere. Ein Nachtrag ist kein
     Freifahrtschein — was hier nicht besteht, gehoert nicht in die Liste. */
  const gepruft = pruefen(offen.map((n) => n.position));
  if (!gepruft.liste.length) return da;

  const zeit = new Date().toISOString();
  const neue = gepruft.liste.map((p) => Object.assign({}, p, { seit: zeit }));
  const liste = da.liste.concat(neue);
  const vermerke = Array.from(getan).concat(offen.map((n) => n.schluessel));

  try {
    await store.setJSON(EINTRAG, { zeit: zeit, von: "nachtrag", liste: liste,
                                   nachgetragen: vermerke });
  } catch (e) {
    /* Nicht schreiben zu koennen heisst: beim naechsten Mal noch einmal
       versuchen. Geliefert wird trotzdem schon die ergaenzte Liste. */
    return { zeit: zeit, liste: liste, nachgetragen: vermerke };
  }

  /* Gemeldet wird nur, was auch alle sehen duerfen. Eine Meldung geht an
     jedes Geraet und nennt das Kuerzel — eine Position "nur fuer die
     Verwaltung" waere damit angekuendigt, bevor sie jemand sehen kann.
     Bleibt nichts uebrig, bleibt es still. */
  const laut = neue.filter((p) => !p.nurchef);
  if (laut.length) {
    try {
      await melden("Neu in der Liste", kuerzel(laut), laut[0].id, "neu", zeichen(laut));
    } catch (e) {
      /* Die Position steht — dass die Meldung nicht rausging, macht sie nicht
         ungeschehen. */
    }
  }
  return { zeit: zeit, liste: liste, nachgetragen: vermerke };
}

export async function lesen(store) {
  let da = null;
  try {
    /* Ausdruecklich frisch. Der Speicher antwortet sonst nachtraeglich
       konsistent: eine eben gespeicherte Liste kommt eine Weile lang noch
       in ihrem alten Stand zurueck. Wer eine Position anlegt, sieht sie
       dann weder als Knopf im Menue noch als Karte — und wundert sich, weil
       das Speichern doch geklappt hat. */
    da = await store.get(EINTRAG, { type: "json", consistency: "strong" });
  } catch (e) {
    da = null;
  }
  if (da && Array.isArray(da.liste)) {
    const ergaenzt = await nachtragen(store, da);
    return mitSeit(ergaenzt.liste, ergaenzt.zeit);
  }

  /* Erster Aufruf: Bestand uebernehmen — Startliste UND Nachtraege.

     Die Nachtraege muessen hier mit hinein, sonst haengt der Bestand davon
     ab, wie alt eine Installation ist: ein Speicher, der schon steht,
     bekommt sie ueber nachtragen(), ein frischer bekaeme nur die Startliste.
     Zwei Wege, zwei Ergebnisse — genau das faengt der Test, der die Zahl der
     Karten aus Startliste plus Nachtraegen ableitet.

     Die Vermerke werden gleich mitgeschrieben. Sonst wuerde nachtragen()
     beim naechsten Lesen dieselben Eintraege noch einmal anfuegen. */
  const zeit = new Date().toISOString();
  const roh = START.concat(NACHTRAG.map((n) => n && n.position).filter(Boolean));
  const start = (pruefen(roh).liste || []).map((p) => Object.assign({}, p, { seit: zeit }));
  const vermerkt = NACHTRAG.map((n) => n && n.schluessel).filter(Boolean);
  try {
    await store.setJSON(EINTRAG, { zeit: zeit, von: "start", liste: start,
                                   nachgetragen: vermerkt });
  } catch (e) {
    // nicht schreiben zu koennen ist kein Grund, nichts zu liefern
  }
  return start;
}

/* Dieselbe Ausnahme wie beim Speichern, nur schon beim Lesen.

   Positionen aus der Zeit vor dem Feld "seit" haben keinen Zeitpunkt und
   behalten damit den vollen Rueckblick — richtig fuer alles, was laenger
   dasteht. Wer aber NEU traegt, sagt selbst, dass er gerade erst
   dazugekommen ist; dann faengt auch seine Zone nicht frueher an als der
   Stand der Liste.

   Dass das hier steht und nicht erst im POST, ist der Unterschied zwischen
   "wirkt nach dem naechsten Speichern" und "wirkt sofort". Ein Handgriff,
   den niemand kennt, ist keine Loesung: OXY stand nach dem ersten Anlauf
   weiter als aktiv da, weil das Nachziehen ein Speichern gebraucht haette.

   Geschrieben wird beim Lesen nichts — der POST setzt denselben Wert beim
   naechsten Speichern fest ein, bis dahin gilt er eben so. */
function mitSeit(liste, stand) {
  if (!stand) return liste;
  return liste.map((p) =>
    p.seit || !p.neu ? p : Object.assign({}, p, { seit: stand }));
}

/* ---------- Pruefen ---------- */

function pruefen(roh) {
  if (!Array.isArray(roh)) return { fehler: "Liste fehlt" };
  if (!roh.length) return { fehler: "Die Liste darf nicht leer sein." };
  if (roh.length > 60) return { fehler: "Mehr als 60 Positionen sind nicht vorgesehen." };

  const liste = [];
  const gesehen = {};

  for (let i = 0; i < roh.length; i++) {
    const p = roh[i] || {};
    const wo = "Position " + (i + 1) + (p.badge ? " (" + text(p.badge, 12) + ")" : "");

    const id = String(p.id || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,23}$/.test(id)) {
      return { fehler: wo + ": Kürzel darf nur Kleinbuchstaben, Ziffern und Bindestrich enthalten." };
    }
    if (gesehen[id]) return { fehler: "Das Kürzel „" + id + "“ kommt zweimal vor." };
    gesehen[id] = true;

    /* Pflicht ist, was die Karte wirklich braucht.

       tv und yahoo standen hier mit drin, und beides ist ueberholt:

       - tv wird seit dem Umbau auf eigene Charts von nichts mehr benutzt.
         Es steht noch im Formular und wird auf seine Form geprueft, aber
         gezeichnet wird daraus nichts.
       - yahoo gibt es nicht fuer jede Notierung. FIT Group steht im direct
         market plus der Wiener Boerse, und Yahoo fuehrt unter FTG eine
         kanadische Firma. Ein erfundenes Symbol waere schlimmer als keins:
         die Karte zeigte dann still den Kurs eines fremden Papiers und
         koennte damit sogar eine Zonen-Meldung ausloesen.

       Ohne yahoo hat die Position keinen Live-Kurs und keinen Chart — sie
       zeigt Einkaufszone und Ziel, und das ist der Kern dieser Liste. */
    for (const feld of ["name", "badge", "chip", "zone"]) {
      if (!String(p[feld] || "").trim()) return { fehler: wo + ": „" + feld + "“ fehlt." };
    }

    const zone = String(p.zone).trim();
    if (!zonenZahlen(zone)) {
      return {
        fehler: wo + ": Die Einkaufszone muss zwei Zahlen enthalten, z. B. „29,52 – 27,05 USD“."
      };
    }

    /* Wenn eins dasteht, muss es stimmen — leer darf es bleiben. */
    if (String(p.tv || "").trim() &&
        !/^[A-Za-z0-9_.]+:[A-Za-z0-9_.!-]+$/.test(String(p.tv).trim())) {
      return { fehler: wo + ": TradingView-Symbol muss so aussehen: NASDAQ:INTC." };
    }

    /* "logo" steht mit in der Reihe: eine eigene Adresse geht der
       automatischen Suche vor, und https ist Bedingung — ein Bild ueber
       http wuerde die ganze Seite als unsicher markieren. */
    for (const feld of ["fn", "fibo", "logo"]) {
      const url = String(p[feld] || "").trim();
      if (url && !/^https:\/\/[^\s"'<>]+$/.test(url)) {
        return { fehler: wo + ": „" + feld + "“ muss eine https-Adresse sein." };
      }
    }

    liste.push({
      id: id,
      name: text(p.name, GRENZEN.name),
      badge: text(p.badge, GRENZEN.badge),
      chip: text(p.chip, GRENZEN.chip),
      neu: p.neu === true || p.neu === "1",
      // Ueberarbeitet: dieselbe Machart wie "neu", nur leiser. Beides
      // gleichzeitig ist erlaubt — angezeigt wird dann NEU, denn was gerade
      // erst dazugekommen ist, ist nicht auch schon ueberarbeitet.
      update: p.update === true || p.update === "1",
      /* Nur fuer die Verwaltung.

         Eine Position, die noch nicht fuer alle gedacht ist: sie steht in
         der Verwaltung und in der Liste des Chefs, sonst nirgends. Ohne
         diese Zeile faellt die Marke beim ersten Speichern aus dem
         Formular heraus — pruefen() nimmt nur, was hier steht — und die
         Position waere ploetzlich fuer alle sichtbar. Genau die Art
         stiller Fehler, die man erst bemerkt, wenn es zu spaet ist. */
      nurchef: p.nurchef === true || p.nurchef === "1",
      branche: text(p.branche, GRENZEN.branche),
      zone: text(zone, GRENZEN.zone),
      ziel: text(p.ziel, GRENZEN.ziel),
      tv: text(p.tv, GRENZEN.tv),
      yahoo: text(p.yahoo, GRENZEN.yahoo),
      frage: text(p.frage, GRENZEN.frage),
      fn: text(p.fn, 200),
      keys: text(p.keys, GRENZEN.keys),
      fibo: text(p.fibo, 200),
      logo: text(p.logo, 300)
    });
  }

  return { liste: liste };
}

function text(wert, max) {
  // Steuerzeichen raus, damit nichts Unsichtbares in den Daten landet
  return String(wert === undefined || wert === null ? "" : wert)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/* "29,52 – 27,05 USD" -> { high: 29.52, low: 27.05 }
   Dieselbe Lesart wie in status.js und alerts.js. */
export function zonenZahlen(zone) {
  const teile = String(zone || "").split(/[–—-]/);
  if (teile.length < 2) return null;
  const a = zahl(teile[0]);
  const b = zahl(teile[1]);
  if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) return null;
  return { high: Math.max(a, b), low: Math.min(a, b) };
}

function zahl(s) {
  return parseFloat(
    String(s || "")
      .replace(/[^\d.,]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

/* ---------- Die Meldungen ----------

   Dieselbe Machart fuer alle drei, nur mit anderer Ueberschrift. Der
   Anhaenger trennt sie, damit eine die andere nicht ueberschreibt, wenn
   mehreres in einem Zug passiert. */

function kuerzel(welche) {
  return welche.map((p) => p.badge).join(" · ");
}

/* Dieselben Kuerzel, nur einzeln: in der Glocke werden daraus Tasten. Der
   Deckel liegt bei sechs, weiter unten schneidet notieren() ohnehin ab. */
function zeichen(welche) {
  return welche.map((p) => p.badge).filter(Boolean).slice(0, 6);
}

/* Die Ueberschrift sagt, was sich geaendert hat — auf dem Sperrbildschirm
   ist das der Unterschied zwischen "irgendwas" und "die Zone". */
function titelAenderung(paare) {
  const zone = paare.some((x) => x.p.zone !== x.v.zone);
  const ziel = paare.some((x) => x.p.ziel !== x.v.ziel);
  if (zone && ziel) return "Zone und Ziel geändert";
  if (zone) return "Neue Einkaufszone";
  return "Neues Kursziel";
}

/* Bei einer einzelnen Position stehen die Zahlen darunter — darum geht es
   ja. Bei mehreren wuerde das zu lang, dann nur die Kuerzel. */
function textAenderung(paare) {
  if (paare.length === 1) {
    const { p, v } = paare[0];
    const teile = [p.badge];
    if (p.zone !== v.zone) teile.push("Zone " + p.zone);
    if (p.ziel !== v.ziel) teile.push(p.ziel ? "Ziel " + p.ziel : "Ziel entfernt");
    return teile.join(" · ");
  }
  return paare.map((x) => x.p.badge).join(" · ");
}

async function melden(titel, namen, id, anhaenger, zeichen) {
  /* Erst ins Buch. Ob gerade ein Geraet angemeldet ist, aendert nichts
     daran, dass es passiert ist.

     Die Kuerzel gehen als Zeichen mit, nicht nur im Text: in der Glocke
     werden daraus Tasten, die zur Karte fuehren. Bisher stand dort nur
     "OXY" als Wort — dasselbe Kuerzel, das oben im Menue tippbar ist, war
     in der Meldung tote Schrift. */
  await notieren({ titel: titel, text: namen, zeichen: zeichen || [],
                   url: "/#" + id, art: "position" });

  try {
    const push = getStore("aktien-push");
    const l = await push.list({ prefix: "sub-" });
    const alle = await Promise.all(
      (l.blobs || []).map((b) =>
        push.get(b.key, { type: "json" }).catch(() => null).then((s) => ({ key: b.key, sub: s }))
      )
    );
    const ziele = alle.filter((z) => z.sub && z.sub.endpoint && z.sub.keys);
    if (!ziele.length) return 0;

    // Erst hier laden: das Lesen der Liste braucht web-push nie
    const webpush = (await import("web-push")).default;
    const k = await keys();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:push@rcp-aktien.netlify.app",
      k.publicKey,
      k.privateKey
    );

    const nutzlast = JSON.stringify({
      title: titel,
      body: namen,
      tag: anhaenger + "-" + Date.now().toString(36),
      url: "/#" + id
    });

    let raus = 0;
    await Promise.all(ziele.map(async (z) => {
      try {
        await webpush.sendNotification(z.sub, nutzlast);
        raus++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await push.delete(z.key).catch(() => {});
        }
      }
    }));
    return raus;
  } catch (e) {
    return 0;
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
