/* Das Logo einer Position.

   Aufruf:  /.netlify/functions/logo?sym=UAA
   Antwort: das Bild selbst — oder 404, wenn es keins gibt.

   Warum eine Function und nicht einfach ein <img> auf eine fremde Adresse:

   1. Der Zwischenspeicher. Zehn Karten mal jeder Aufruf der Liste waeren
      sonst zehn Abrufe bei einem Fremden, jedes Mal. Hier liegt das Bild
      nach dem ersten Mal in Blobs und wird von dort ausgeliefert.
   2. Die Rueckfallkette. Keine dieser Quellen ist ein Versprechen; faellt
      eine aus, wird die naechste versucht, ohne dass an der Seite etwas
      geaendert werden muss.
   3. Kein Fremder erfaehrt, wer hier zusieht. Ein <img> auf eine fremde
      Adresse schickt bei jedem Blick auf die Liste die IP des Geraets
      dorthin. So sieht die fremde Quelle nur diesen Server, und auch den
      nur einmal je Symbol.

   Was NICHT hier steht: ein Schluessel. Alle Quellen sind ohne Anmeldung
   erreichbar. Braucht spaeter eine einen, gehoert er in die
   Netlify-Umgebung und nirgendwo sonst.

   Ehrlich zum Stand: welche dieser Quellen wirklich liefert, konnte beim
   Bauen nicht geprueft werden — die Entwicklungsumgebung laesst keine
   fremden Hosts durch. Deshalb eine Kette statt einer Quelle, deshalb ein
   sauberes 404 statt eines kaputten Bildes, und deshalb kann an jeder
   Position eine eigene Logo-Adresse hinterlegt werden, die immer vorgeht. */

import { getStore } from "@netlify/blobs";

const LADEN = "aktien-logos";
/* Ein Logo aendert sich selten. Vier Wochen sind trotzdem nicht "nie":
   Firmen benennen sich um. */
const FRISCH = 28 * 24 * 60 * 60 * 1000;
/* Was gar nicht erst gefunden wurde, wird kuerzer gemerkt — sonst haengt
   eine Position vier Wochen an einem Ausfall fest, der nach zwei Stunden
   vorbei war. */
const FRISCH_LEER = 6 * 60 * 60 * 1000;
const HOECHSTENS = 512 * 1024;
const TYPEN = ["image/png", "image/svg+xml", "image/webp", "image/jpeg"];

/* Rohstoffe und Indizes haben kein Firmenlogo, und danach zu suchen ist
   verschwendete Zeit bei jedem Aufruf. Sie tragen ein Zeichen statt eines
   Bildes — das macht die Seite selbst. */
const OHNE_LOGO = /^(\^|GC=F|SI=F|CL=F|HG=F|NG=F|ZC=F|.*-USD$)/i;

/* Von fein nach grob. Jede Quelle bekommt das Kuerzel, wie Yahoo es
   schreibt, und darf daraus machen, was sie braucht. */
const QUELLEN = [
  (s) => "https://assets.parqet.com/logos/symbol/" + encodeURIComponent(s) + "?format=png&size=128",
  (s) => "https://companiesmarketcap.com/img/company-logos/128/" + encodeURIComponent(s) + ".png",
  (s) => "https://eodhd.com/img/logos/US/" + encodeURIComponent(s.toLowerCase()) + ".png"
];

export default async (request) => {
  const url = new URL(request.url);
  const sym = (url.searchParams.get("sym") || "").trim();
  if (!sym || sym.length > 24) return leer(400);
  if (OHNE_LOGO.test(sym)) return leer(404, FRISCH);

  const speicher = laden();
  const alt = await gespeichert(speicher, sym);
  if (alt) {
    const frist = alt.leer ? FRISCH_LEER : FRISCH;
    if (Date.now() - alt.stand < frist) {
      return alt.leer ? leer(404, FRISCH_LEER) : bild(alt, FRISCH);
    }
  }

  const frisch = await holenMitRueckfall(sym);
  if (!frisch) {
    /* Lieber ein altes Logo als keins: nur wenn noch nie eins da war,
       wird das Fehlen gemerkt. */
    if (alt && !alt.leer) return bild(alt, FRISCH_LEER);
    await merken(speicher, sym, { leer: true, stand: Date.now() });
    return leer(404, FRISCH_LEER);
  }
  await merken(speicher, sym, frisch);
  return bild(frisch, FRISCH);
};

function laden() {
  try {
    return getStore(LADEN);
  } catch (e) {
    return null;
  }
}

async function gespeichert(speicher, sym) {
  if (!speicher) return null;
  try {
    return await speicher.get(sym, { type: "json", consistency: "strong" });
  } catch (e) {
    return null;
  }
}

async function merken(speicher, sym, wert) {
  if (!speicher) return;
  try {
    await speicher.setJSON(sym, wert);
  } catch (e) {
    /* Ohne Speicher geht es auch, nur oefter zur Quelle */
  }
}

async function holenMitRueckfall(sym) {
  for (const bauen of QUELLEN) {
    const d = await holen(bauen(sym));
    if (d) return d;
  }
  return null;
}

async function holen(adresse) {
  try {
    const res = await fetch(adresse, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)", Accept: "image/*" },
      redirect: "follow"
    });
    if (!res.ok) return null;

    const typ = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (TYPEN.indexOf(typ) < 0) return null;

    const roh = new Uint8Array(await res.arrayBuffer());
    /* Zu gross ist verdaechtig, zu klein ist meistens ein Platzhalter oder
       eine Fehlerseite, die sich als Bild ausgibt. */
    if (roh.length < 120 || roh.length > HOECHSTENS) return null;

    let s = "";
    for (let i = 0; i < roh.length; i++) s += String.fromCharCode(roh[i]);
    return { typ: typ, daten: btoa(s), stand: Date.now() };
  } catch (e) {
    return null;
  }
}

function bild(eintrag, frisch) {
  const s = atob(eintrag.daten);
  const roh = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) roh[i] = s.charCodeAt(i);
  return new Response(roh, {
    status: 200,
    headers: {
      "Content-Type": eintrag.typ,
      "Cache-Control": "public, max-age=" + Math.round(frisch / 1000)
    }
  });
}

function leer(status, frisch) {
  return new Response("", {
    status: status,
    headers: {
      "Cache-Control": frisch ? "public, max-age=" + Math.round(frisch / 1000) : "no-store"
    }
  });
}
