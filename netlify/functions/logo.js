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
/* DER STAND DER QUELLENKETTE.

   Ein Logo liegt vier Wochen im Vorrat. Aendert sich die REIHENFOLGE der
   Quellen, aendert das am Vorrat gar nichts — er liefert weiter das alte
   Bild, und die Aenderung wirkt erst, wenn die vier Wochen um sind.

   Genau das ist passiert: die Quelle mit Groessenangabe stand ab v187
   vorn, und die Bilanz des Geraets meldete unveraendert "Logos 100 …
   128 Punkte". Nicht weil die Umstellung falsch war, sondern weil sie
   niemanden erreichte.

   Diese Zahl wird bei jedem Eintrag mitgeschrieben. Passt sie nicht mehr,
   gilt der Eintrag als alt und wird neu geholt — einmal je Symbol. Wer
   die Kette aendert, zaehlt hier hoch. */
const QUELLENSTAND = 2;
const TYPEN = ["image/png", "image/svg+xml", "image/webp", "image/jpeg"];

/* Rohstoffe und Indizes haben kein Firmenlogo, und danach zu suchen ist
   verschwendete Zeit bei jedem Aufruf. Sie tragen ein Zeichen statt eines
   Bildes — das macht die Seite selbst. */
const OHNE_LOGO = /^(\^|GC=F|SI=F|CL=F|HG=F|NG=F|ZC=F|.*-USD$)/i;

/* Von fein nach grob. Jede Quelle bekommt das Kuerzel, wie Yahoo es
   schreibt, und darf daraus machen, was sie braucht.

   Financial Modeling Prep stand einmal vorn — die Adresse ist nach dem
   Kuerzel benannt, so wie Yahoo es schreibt, und es ist dieselbe Stelle,
   von der die Seite ihre Kurse holt. Das Argument stimmt fuer die
   Trefferquote und uebersieht die Groesse: die Quelle kennt keine
   Groessenangabe. Siehe unten.

   companiesmarketcap ist rausgeflogen. Die Seite benennt ihre Bilder nach
   dem Firmennamen, nicht nach dem Kuerzel — .../128/AAPL.png hat also nie
   etwas treffen koennen. Eine Quelle, die von der Bauart her nicht
   antworten kann, ist keine Rueckfallebene, sondern nur Wartezeit vor der
   naechsten.

   Und ein Kuerzel wie BRK-B oder SAP.DE schreibt jede Quelle anders. Statt
   zu raten, wird beides versucht: wie es ankommt und auf den Teil vor dem
   Trennzeichen gekuerzt. */
/* DIE GROSSE QUELLE ZUERST.

   Hier stand financialmodelingprep an erster Stelle. Die Quelle kennt
   keine Groessenangabe und liefert rund hundert bis hundertachtundzwanzig
   Punkte — und weil sie ZUERST gefragt wird, gewinnt sie fast immer.
   Parqet, das size=512 versteht, kam nur zum Zug, wenn die erste nichts
   hatte.

   Aufgefallen ist das erst, als die Szene aufschrieb, wie gross die
   Logos wirklich ankommen: "Logos 100 … 128 Punkte" auf dem Telefon,
   waehrend mein Prueftisch 512 lieferte. Ein Prueftisch, dessen Bilder
   groesser sind als die echten, kann diese Unschaerfe nicht zeigen —
   und genau deshalb habe ich sie viermal woanders gesucht.

   Im Flug wird eine Marke bis zu achthundert Geraetepunkte gross. Aus
   128 Punkten ist das sechsfach hochgerechnet; aus 512 anderthalbfach.
   Also erst die Quelle mit Groessenangabe, dann die anderen als
   Rueckfall. Die Liste bekommt dieselben Bilder — dort sind sie dreissig
   Punkte gross, da schadet mehr Aufloesung nicht. */
const QUELLEN = [
  (s) => "https://assets.parqet.com/logos/symbol/" + encodeURIComponent(s) + "?format=png&size=512",
  (s) => "https://financialmodelingprep.com/image-stock/" + encodeURIComponent(s) + ".png",
  (s) => "https://eodhd.com/img/logos/US/" + encodeURIComponent(s) + ".png"
];

/* Aus einem Kuerzel werden die Schreibweisen, die es zu versuchen lohnt —
   ohne Dubletten und in dieser Reihenfolge. */
function schreibweisen(sym) {
  const kurz = sym.split(".")[0].split("-")[0];
  return kurz && kurz !== sym ? [sym, kurz] : [sym];
}

export default async (request) => {
  const url = new URL(request.url);
  const sym = (url.searchParams.get("sym") || "").trim();
  if (!sym || sym.length > 24) return leer(400);

  if (url.searchParams.get("pruef")) {
    const bericht = OHNE_LOGO.test(sym)
      ? { sym, ohneLogo: true, zeilen: [], hinweis: "Rohstoff, Index oder Krypto — hier wird nicht gesucht, die Karte traegt ein Zeichen." }
      : await pruefen(sym);
    return new Response(JSON.stringify(bericht, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  if (OHNE_LOGO.test(sym)) return leer(404, FRISCH);

  const speicher = laden();
  const alt = await gespeichert(speicher, sym);
  if (alt && alt.quellen === QUELLENSTAND) {
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
    await merken(speicher, sym, { leer: true, stand: Date.now(), quellen: QUELLENSTAND });
    return leer(404, FRISCH_LEER);
  }
  frisch.quellen = QUELLENSTAND;
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
  for (const schreibweise of schreibweisen(sym)) {
    for (const bauen of QUELLEN) {
      const d = await holen(bauen(schreibweise));
      if (d) return d;
    }
  }
  return null;
}

/* Warum hat dieses Symbol kein Logo?

   Aufruf: /.netlify/functions/logo?sym=NVO&pruef=1

   Diese Frage liess sich bisher nicht beantworten. Die Entwicklungsumgebung
   kommt an keinen fremden Host heran, also war beim Bauen nicht zu sehen,
   welche Quelle liefert und welche nicht — und auf der fertigen Seite sieht
   man nur das Ergebnis: Bild oder kein Bild. Ein 404 sagt nicht, ob die
   Quelle das Kuerzel nicht kennt, ob sie eine Fehlerseite als Bild
   ausliefert oder ob sie gar nicht erreichbar war.

   Hier steht es Zeile fuer Zeile: jede Adresse mit Status, Typ und Groesse,
   und was daran ausgeschlagen hat. Antwortet nichts, ist es kein Raetsel
   mehr, sondern eine Liste.

   Nichts Geheimes darin — es sind oeffentliche Adressen ohne Schluessel. */
/* WIE VIELE PUNKTE HAT DIESES BILD?

   Die Bytezahl sagt es nicht: ein gut gepacktes Bild mit 512 Punkten
   kann kleiner sein als ein schlecht gepacktes mit 128. Und genau die
   Punktzahl ist die Frage, seit die Bilanz des Geraets "Logos 100 …
   128 Punkte" meldete — im Flug wird eine Marke bis zu achthundert
   Geraetepunkte gross.

   Gelesen wird aus dem Kopf der Datei, ohne sie zu entpacken: PNG hat
   Breite und Hoehe an fester Stelle, JPEG in einem seiner Abschnitte,
   WEBP im Kopf, und SVG traegt sie als Text. */
function masse(roh, typ) {
  try {
    if (roh.length > 24 && roh[0] === 0x89 && roh[1] === 0x50) {
      const w = (roh[16] << 24) | (roh[17] << 16) | (roh[18] << 8) | roh[19];
      const h = (roh[20] << 24) | (roh[21] << 16) | (roh[22] << 8) | roh[23];
      return w + "x" + h;
    }
    if (roh.length > 30 && roh[0] === 0x52 && roh[1] === 0x49 && roh[8] === 0x57) {
      /* WEBP, einfache Form (VP8X oder VP8 ) */
      if (roh[12] === 0x56 && roh[13] === 0x50 && roh[14] === 0x38 && roh[15] === 0x58) {
        const w = 1 + (roh[24] | (roh[25] << 8) | (roh[26] << 16));
        const h = 1 + (roh[27] | (roh[28] << 8) | (roh[29] << 16));
        return w + "x" + h;
      }
      return "webp";
    }
    if (roh.length > 4 && roh[0] === 0xff && roh[1] === 0xd8) {
      let i = 2;
      while (i + 9 < roh.length) {
        if (roh[i] !== 0xff) { i++; continue; }
        const m = roh[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return ((roh[i + 7] << 8) | roh[i + 8]) + "x" + ((roh[i + 5] << 8) | roh[i + 6]);
        }
        i += 2 + ((roh[i + 2] << 8) | roh[i + 3]);
      }
      return "jpeg";
    }
    if (typ === "image/svg+xml") {
      const txt = new TextDecoder().decode(roh.slice(0, 900));
      const w = /width="(\d+)/.exec(txt), h = /height="(\d+)/.exec(txt);
      if (w && h) return w[1] + "x" + h[1];
      const vb = /viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/.exec(txt);
      return vb ? Math.round(+vb[1]) + "x" + Math.round(+vb[2]) + " (viewBox)" : "svg";
    }
  } catch (e) {}
  return "unbekannt";
}

async function pruefen(sym) {
  const zeilen = [];
  for (const schreibweise of schreibweisen(sym)) {
    for (const bauen of QUELLEN) {
      const adresse = bauen(schreibweise);
      const z = { schreibweise, adresse };
      try {
        const res = await fetch(adresse, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AktienListe/1.0)", Accept: "image/*" },
          redirect: "follow"
        });
        z.status = res.status;
        z.typ = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        const roh = new Uint8Array(await res.arrayBuffer());
        z.groesse = roh.length;
        z.punkte = masse(roh, z.typ);
        if (!res.ok) z.urteil = "Status nicht ok";
        else if (TYPEN.indexOf(z.typ) < 0) z.urteil = "kein Bildtyp, den wir nehmen";
        else if (roh.length < 120) z.urteil = "zu klein, vermutlich Platzhalter";
        else if (roh.length > HOECHSTENS) z.urteil = "zu gross";
        else z.urteil = "brauchbar";
      } catch (e) {
        z.urteil = "nicht erreichbar: " + (e && e.message ? e.message : "unbekannt");
      }
      zeilen.push(z);
      if (z.urteil === "brauchbar") return { sym, ohneLogo: false, zeilen };
    }
  }
  return { sym, ohneLogo: false, zeilen };
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
