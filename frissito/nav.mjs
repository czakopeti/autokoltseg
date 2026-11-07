// NAV-oldalak letöltése és feldolgozása. Csak olvas; az írásról a futtat.mjs dönt.
import { HONAPOK } from '../forras/js/szamitas.mjs';

const UA = 'Mozilla/5.0 (compatible; autokoltseg-frissito/1.0; +https://github.com)';
const NAV = 'https://nav.gov.hu';

export async function letolt(url) {
  if (process.env.FRISSITO_MINTA) return mintaLetolt(url);
  const v = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'hu' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (v.status === 404) return null;
  if (!v.ok) throw new Error(`${url}: HTTP ${v.status}`);
  return v.text();
}

/** HTML-részletből tiszta szöveg. */
export function szoveg(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;| | /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

const ragok = (ev) => ['ban', 'ben'].map((r) => `${ev}-${r}`);

/* ---------- Üzemanyagárak ---------- */

export function uzemanyagUrlek(ev) {
  return ragok(ev).map((x) => `${NAV}/ugyfeliranytu/uzemanyag/${x}-alkalmazhato-uzemanyagarak`);
}

const OSZLOP = [
  [/(ólmozatlan|benzin)/i, 'benzin'],
  [/gázolaj|dízel/i, 'dizel'],
  [/keverék/i, 'keverek'],
  [/lpg/i, 'lpg'],
  [/cng/i, 'cng'],
];

/**
 * Az évi üzemanyagár-táblázat feldolgozása. Visszaad: { 11: { benzin, dizel, ... }, 10: {...} }.
 * Hibát dob, ha nem talál értelmes táblázatot – ilyenkor semmit nem írunk át.
 */
export function uzemanyagFeldolgoz(html, { kotelezo = ['benzin', 'dizel', 'lpg', 'cng'] } = {}) {
  const tablak = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  const tabla = tablak.find((t) => (!kotelezo.includes('cng') || /cng/i.test(t)) && /(ólmozatlan|benzin)/i.test(szoveg(t)) && /gázolaj|dízel/i.test(szoveg(t)));
  if (!tabla) throw new Error('Nem található az üzemanyagár-táblázat (benzin és gázolaj oszloppal).');
  const sorok = [...tabla.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => [...m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => szoveg(c[1])));

  // Fejléc: az első sor(ok), amelyekben nincs hónapnév az első cellában
  const honapIndex = (c) => HONAPOK.indexOf((c || '').toLowerCase().replace(/[^a-záéíóöőúüű]/g, ''));
  const fejSorok = [];
  for (const s of sorok) { if (honapIndex(s[0]) >= 0) break; fejSorok.push(s); }
  const fej = fejSorok.find((s) => s.filter((c) => OSZLOP.some(([re]) => re.test(c))).length >= Math.min(4, kotelezo.length));
  if (!fej) throw new Error('A táblázat fejléce nem a várt felépítésű.');
  const vedettSor = fejSorok.find((s) => s !== fej && s.some((c) => /védett/i.test(c)));

  const kulcsok = [];
  const lattuk = {};
  fej.slice(1).forEach((c, i) => {
    const t = OSZLOP.find(([re]) => re.test(c));
    if (!t) { kulcsok.push(null); return; }
    let k = t[1];
    const vedett = /védett|hatósági/i.test(c) || (vedettSor && /védett|hatósági/i.test(vedettSor[i + 1] || ''));
    if (vedett) k += '_vedett';
    else if (lattuk[k] && ['benzin', 'dizel'].includes(k)) {
      // Két azonos nevű oszlop jelölés nélkül: a NAV sorrendje szerint az első a védett ár
      kulcsok[kulcsok.indexOf(k)] = `${k}_vedett`;
    }
    lattuk[k] = true;
    kulcsok.push(k);
  });
  for (const k of kotelezo) if (!kulcsok.includes(k)) throw new Error(`Hiányzik a(z) ${k} oszlop a fejlécből.`);

  const eredmeny = {};
  for (const s of sorok) {
    const h = honapIndex(s[0]);
    if (h < 0) continue;
    const ertekek = {};
    s.slice(1).forEach((c, i) => {
      const k = kulcsok[i];
      if (!k) return;
      const m = c.replace(/\s/g, '').match(/^(\d{3,4})$/);
      if (m) ertekek[k] = Number(m[1]);
      else if (!/^[-–—]?$/.test(c.trim())) throw new Error(`Értelmezhetetlen érték: „${c}” (${HONAPOK[h]}, ${k})`);
    });
    if (!Object.keys(ertekek).length) continue;
    eredmeny[h + 1] = ertekek;
  }
  if (!Object.keys(eredmeny).length) throw new Error('A táblázatban nincs egyetlen hónap sem.');
  for (const [h, x] of Object.entries(eredmeny)) {
    for (const k of kotelezo) if (x[k] == null) throw new Error(`${HONAPOK[h - 1]}: hiányzik a(z) ${k} ár.`);
    for (const [k, v] of Object.entries(x)) {
      const [min, max] = k === 'cng' ? [300, 2500] : k === 'lpg' ? [150, 1200] : [250, 1500];
      if (v < min || v > max) throw new Error(`${HONAPOK[h - 1]}: a(z) ${k} ára (${v}) kívül esik az ésszerű tartományon.`);
    }
  }
  return eredmeny;
}

/* ---------- Valorizált adótételek ---------- */

const VAL = `${NAV}/ugyfeliranytu/adokulcsok_jarulekmertekek/valorizalt-adomertekek`;
export const tetelUrlek = {
  gepjarmuado: (ev) => [`${VAL}/belfoldi-gepjarmuado/belfoldi-gepjarmuado-${ev}`, `${NAV}/print/ugyfeliranytu/adokulcsok_jarulekmertekek/valorizalt-adomertekek/belfoldi-gepjarmuado/belfoldi-gepjarmuado-${ev}`],
  regado: (ev) => [`${VAL}/regisztracios-ado/regisztracios-ado-${ev}`, `${NAV}/print/ugyfeliranytu/adokulcsok_jarulekmertekek/valorizalt-adomertekek/regisztracios-ado/regisztracios-ado-${ev}`],
  cegautoado: () => [`${VAL}/cegautoado`],
};

/** Az öt korsáv Ft/kW tétele a NAV-oldal szövegéből. */
export function gjadoFeldolgoz(html, ev, elozo) {
  const t = szoveg(html);
  if (!new RegExp(`${ev}`).test(t)) throw new Error(`Az oldalon nem szerepel a(z) ${ev}. év.`);
  const m = [...t.matchAll(/(\d{3})\s*Ft\s*\/\s*k(?:W|ilowatt)/gi)].map((x) => Number(x[1]));
  if (m.length < 5) throw new Error(`Csak ${m.length} Ft/kW tételt találtam, 5 kellene.`);
  const savok = m.slice(0, 5);
  for (let i = 1; i < 5; i++) if (savok[i] > savok[i - 1]) throw new Error(`A tételek nem csökkennek a korral: ${savok.join(', ')}`);
  if (elozo) savok.forEach((x, i) => { if (x < elozo[i] * 0.9 || x > elozo[i] * 1.3) throw new Error(`Gyanús ugrás az előző évhez képest: ${elozo[i]} → ${x}`); });
  return savok;
}

/** A regisztrációs adó alapösszege (pl. „48 000 forintban kerül megállapításra”). */
export function regadoFeldolgoz(html, ev, elozo) {
  const t = szoveg(html);
  const m = t.match(new RegExp(`${ev}\\.?\\s*évre\\s*(\\d{2}[\\s.]?\\d{3})\\s*forint`, 'i')) || t.match(/(\d{2}[\s.]?\d{3})\s*forint/i);
  if (!m) throw new Error('Nem találom a regisztrációs adó alapösszegét.');
  const ft = Number(m[1].replace(/\D/g, ''));
  if (ft < 30000 || ft > 90000 || (elozo && (ft < elozo * 0.95 || ft > elozo * 1.3))) throw new Error(`Gyanús alapösszeg: ${ft}`);
  return ft;
}

/** Cégautóadó: az oldal címéből az év, a táblázatból 4×3 havi tétel. */
export function cegautoadoFeldolgoz(html) {
  const t = szoveg(html);
  const evM = t.match(/Cégautóadó\s*(\d{4})\.\s*évre/i);
  if (!evM) throw new Error('A cégautóadó-oldalon nem találom az évet.');
  const szamok = [...t.matchAll(/(\d{2,3}\s\d{3})\s*Ft/g)].map((x) => Number(x[1].replace(/\s/g, '')));
  if (szamok.length < 12) throw new Error(`Csak ${szamok.length} cégautóadó-tételt találtam, 12 kellene.`);
  const s = szamok.slice(0, 12);
  return { ev: Number(evM[1]), tabla: [s.slice(0, 3), s.slice(3, 6), s.slice(6, 9), s.slice(9, 12)] };
}

/** Teszthez: a NAV helyett a tesztek/minta fájljait adja vissza (FRISSITO_MINTA=1). */
async function mintaLetolt(url) {
  const { readFileSync } = await import('node:fs');
  const f = (n) => readFileSync(new URL(`../tesztek/minta/${n}`, import.meta.url), 'utf8');
  if (/2026-ban-alkalmazhato/.test(url)) return f('nav-uzemanyag-2026.html').replace('</table>', '<tr><td>december</td><td>-</td><td>650</td><td>-</td><td>720</td><td>700</td><td>370</td><td>900</td></tr></table>');
  if (/belfoldi-gepjarmuado-2027$/.test(url)) return f('nav-gjado-2027.html');
  return null;
}
