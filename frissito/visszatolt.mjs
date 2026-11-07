// A NAV régebbi évi üzemanyagár-táblázatainak egyszeri visszatöltése (GitHub Actionsből: visszatoltes.yml).
// Csak hiányzó éveket ír be, meglévőt soha nem ír felül. Ami nem értelmezhető, azt kihagyja és jelzi.
// Használat: node frissito/visszatolt.mjs 2012 2025 [--proba]
import { readFileSync, writeFileSync } from 'node:fs';
import * as N from './nav.mjs';

if (process.argv[2] === '--lista') {
  // A NAV üzemanyagár-főoldalának évi aloldalai (a régebbi évek címe eltérhet a mintától)
  for (const url of ['https://nav.gov.hu/ugyfeliranytu/uzemanyag', 'https://nav.gov.hu/ugyfeliranytu/uzemanyag/korabbi-evek-uzemanyagarai']) {
    const html = await N.letolt(url).catch((e) => `HIBA ${e.message}`);
    console.log(`== ${url}`);
    console.log([...(html || '').matchAll(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => `${m[1]} | ${N.szoveg(m[2]).slice(0, 80)}`).filter((x) => /uzemanyag|üzemanyag|20\d\d/i.test(x)).join('\n'));
  }
  process.exit(0);
}
const [tol, ig] = process.argv.slice(2, 4).map(Number);
const proba = process.argv.includes('--proba');
if (!tol || !ig || tol > ig) { console.error('Használat: node frissito/visszatolt.mjs <tól> <ig> [--proba]'); process.exit(2); }

const UTVONAL = new URL('../data/uzemanyag.json', import.meta.url);
const u = JSON.parse(readFileSync(UTVONAL, 'utf8'));
u.forrasok_evente ??= {};
const jelentes = [];
for (let ev = tol; ev <= ig; ev++) {
  if (u.evek[ev]) { jelentes.push(`${ev}: már megvan, kihagyva`); continue; }
  let ok = false;
  for (const url of N.uzemanyagUrlek(ev)) {
    let html;
    try { html = await N.letolt(url); } catch (e) { jelentes.push(`${ev}: ${url} → ${e.message}`); continue; }
    if (!html) { jelentes.push(`${ev}: ${url} → 404`); continue; }
    try {
      const adat = N.uzemanyagFeldolgoz(html, { kotelezo: ['benzin', 'dizel'] });
      const honapok = Object.keys(adat).length;
      if (honapok < 12 && ev < new Date().getFullYear()) throw new Error(`csak ${honapok} hónap`);
      u.evek[ev] = adat;
      u.forrasok_evente[ev] = url;
      jelentes.push(`${ev}: OK, ${honapok} hónap, oszlopok: ${[...new Set(Object.values(adat).flatMap(Object.keys))].join(', ')} (${url})`);
      ok = true;
      break;
    } catch (e) {
      const fej = N.szoveg((html.match(/<table[\s\S]*?<\/tr>/i) || [''])[0]).slice(0, 200);
      const cim = N.szoveg((html.match(/<h1[\s\S]*?<\/h1>/i) || [''])[0]).slice(0, 120);
      const linkek = [...html.matchAll(/href="([^"]*(?:uzemanyag|\.pdf|\.xlsx?)[^"]*)"/gi)].map((m) => m[1]).filter((x, i, a) => a.indexOf(x) === i).slice(0, 12);
      const tablak = (html.match(/<table/gi) || []).length;
      jelentes.push(`${ev}: ${url} → nem értelmezhető: ${e.message} | cím: ${cim} | táblák: ${tablak} | táblázat eleje: ${fej} | linkek: ${linkek.join(' ')}`);
    }
  }
  if (!ok) jelentes.push(`${ev}: KIHAGYVA`);
}
u.evek = Object.fromEntries(Object.entries(u.evek).sort(([a], [b]) => a - b));
console.log(jelentes.join('\n'));
if (!proba) writeFileSync(UTVONAL, `${JSON.stringify(u, null, 2)}\n`);
