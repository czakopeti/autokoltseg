// Napi frissítés: NAV-üzemanyagár, következő évi tételek, elavulás-őr. A GitHub Actions minden reggel futtatja.
// Elv: csak ellenőrzött adatot írunk át. Ha a NAV-oldal szerkezete megváltozik, semmit nem módosítunk,
// hanem jelzünk (a workflow piros lesz, a GitHub e-mailt küld). A kint lévő oldal közben a régi, jó adattal megy.
import { olvas, ir, maBudapest } from '../forras/adat.mjs';
import { HONAPOK } from '../forras/js/szamitas.mjs';
import * as N from './nav.mjs';

const ma = maBudapest();
const [ev, honap, nap] = ma.split('-').map(Number);
const most = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', dateStyle: 'short', timeStyle: 'short' }).format(new Date()).replace(' ', 'T');
const hibak = [];
const jelzesek = [];
const naplo = (s) => console.log(s);

/* ---------- 1. Üzemanyagár ---------- */
async function uzemanyag() {
  const u = olvas('data/uzemanyag.json');
  const evek = [ev];
  if (honap === 12) evek.push(ev + 1); // a januári ár december végén jelenik meg
  let uj = 0;
  for (const e of evek) {
    let html = null, url = null;
    for (const x of N.uzemanyagUrlek(e)) { html = await N.letolt(x); if (html) { url = x; break; } }
    if (!html) { if (e === ev) throw new Error(`Nem érhető el a NAV ${e}. évi üzemanyagár-oldala.`); continue; }
    const tabla = N.uzemanyagFeldolgoz(html);
    u.evek[e] ??= {};
    for (const [h, ertek] of Object.entries(tabla)) {
      const regi = u.evek[e][h];
      if (!regi) {
        u.evek[e][h] = ertek;
        u.atveve ??= {};
        u.atveve[`${e}-${h}`] = ma;
        uj++;
        naplo(`Új NAV-ár: ${e}. ${HONAPOK[h - 1]} – benzin ${ertek.benzin}, dízel ${ertek.dizel}`);
      } else if (JSON.stringify(regi) !== JSON.stringify(ertek)) {
        u.evek[e][h] = ertek;
        jelzesek.push(`A NAV módosította a(z) ${e}. ${HONAPOK[h - 1]}i árakat (${JSON.stringify(regi)} → ${JSON.stringify(ertek)}).`);
      }
    }
    if (e === ev) u.forras = url;
  }
  ir('data/uzemanyag.json', u);
  return uj;
}

/* ---------- 2. Adótételek (aktuális és következő év) ---------- */
async function tetelek() {
  const t = olvas('data/tetelek.json');
  const valt = [];
  for (const e of [ev, ev + 1]) {
    if (!t.gepjarmuado[e]) {
      for (const url of N.tetelUrlek.gepjarmuado(e)) {
        const html = await N.letolt(url);
        if (!html) continue;
        const savok = N.gjadoFeldolgoz(html, e, t.gepjarmuado[e - 1]?.savok);
        t.gepjarmuado[e] = { savok, kozzeteve: ma, forras: url, automatikus: true };
        valt.push(`gépjárműadó ${e}: ${savok.join('/')} Ft/kW`);
        break;
      }
    }
    if (!t.regado_alap[e]) {
      for (const url of N.tetelUrlek.regado(e)) {
        const html = await N.letolt(url);
        if (!html) continue;
        const ft = N.regadoFeldolgoz(html, e, t.regado_alap[e - 1]?.ft);
        t.regado_alap[e] = { ft, kozzeteve: ma, forras: url, automatikus: true };
        valt.push(`regisztrációs adó alapja ${e}: ${ft} Ft`);
        break;
      }
    }
  }
  try {
    const html = await N.letolt(N.tetelUrlek.cegautoado()[0]);
    if (html) {
      const c = N.cegautoadoFeldolgoz(html);
      if (!t.cegautoado[c.ev]) {
        const minta = t.cegautoado[c.ev - 1] || Object.values(t.cegautoado).pop();
        t.cegautoado[c.ev] = { oszlopok: minta.oszlopok, sorok: minta.sorok, tabla: c.tabla, kozzeteve: ma, forras: N.tetelUrlek.cegautoado()[0], automatikus: true };
        valt.push(`cégautóadó ${c.ev}`);
      } else if (JSON.stringify(t.cegautoado[c.ev].tabla) !== JSON.stringify(c.tabla)) {
        // Ha a NAV utólag más táblázatot közöl (pl. új teljesítménysávok), nem írjuk felül vakon: kézi ellenőrzés kell.
        jelzesek.push(`A NAV ${c.ev}. évi cégautóadó-táblázata eltér a tárolttól. Lehet, hogy új teljesítménysávok jöttek (lásd karbantartas.json: cegautoado-2027-javaslat). Kézzel kell frissíteni a data/tetelek.json-t és a sávokat.`);
      }
    }
  } catch (e) { jelzesek.push(`Cégautóadó: ${e.message}`); }
  // Az illetéktételeket a NAV nem külön oldalon közli: ha az új év hiányzik, kézi ellenőrzést kérünk.
  for (const e of [ev, ev + 1]) {
    if (t.gepjarmuado[e] && !t.illetek[e]) jelzesek.push(`A(z) ${e}. évi átírási illetéktételeket kézzel kell felvenni (data/tetelek.json → illetek). Addig a kalkulátor az előző évi tételekkel számol, és ezt jelzi.`);
  }
  if (valt.length) ir('data/tetelek.json', t);
  return valt;
}

/* ---------- 3. Elavulás-őr ---------- */
function elavulas() {
  const u = olvas('data/uzemanyag.json');
  const t = olvas('data/tetelek.json');
  if (!u.evek[ev]?.[honap]) {
    const s = `Hiányzik a(z) ${ev}. ${HONAPOK[honap - 1]}i NAV-üzemanyagár.`;
    if (nap >= 2) hibak.push(s); else jelzesek.push(s);
  }
  if (!t.gepjarmuado[ev]) hibak.push(`Hiányzik a(z) ${ev}. évi gépjárműadó-tétel.`);
  if (honap >= 11 && !t.gepjarmuado[ev + 1]) hibak.push(`A NAV október 31-ig közzéteszi a(z) ${ev + 1}. évi tételeket, de az oldalon még nincsenek meg.`);
  if (!t.regado_alap[ev]) jelzesek.push(`Hiányzik a(z) ${ev}. évi regisztrációsadó-alap; a kalkulátor az előző évivel számol.`);
}

/* ---------- Futtatás ---------- */
const allapot = olvas('data/allapot.json');
allapot.utolso_futas = most;
try {
  const uj = await uzemanyag();
  const u = olvas('data/uzemanyag.json');
  const utolso = Object.keys(u.evek[ev] || {}).map(Number).sort((a, b) => b - a)[0];
  allapot.uzemanyag = { ok: true, uzenet: `${uj ? `${uj} új hónap átvéve; ` : ''}legfrissebb: ${ev}. ${HONAPOK[(utolso || 1) - 1]}` };
} catch (e) {
  hibak.push(`Üzemanyagár: ${e.message}`);
  allapot.uzemanyag = { ok: false, uzenet: 'az ellenőrzés hibát jelzett, a korábbi adat érvényes' };
}
try {
  const valt = await tetelek();
  const t = olvas('data/tetelek.json');
  allapot.tetelek = { ok: true, uzenet: `${valt.length ? `új: ${valt.join('; ')}; ` : ''}ismert évek: ${Object.keys(t.gepjarmuado).join(', ')}` };
} catch (e) {
  hibak.push(`Adótételek: ${e.message}`);
  allapot.tetelek = { ok: false, uzenet: 'az ellenőrzés hibát jelzett, a korábbi adat érvényes' };
}
elavulas();
// Az oldalon „Ellenőrizve” dátumként jelenik meg, ezért csak akkor frissül, ha a NAV-ellenőrzés hiba nélkül lefutott.
// A sikertelen futás csak az utolso_futas mezőt írja.
const navOk = allapot.uzemanyag?.ok && allapot.tetelek?.ok;
if (navOk) allapot.utolso_ellenorzes = most;
allapot.figyelmeztetesek = [...hibak, ...jelzesek];
ir('data/allapot.json', allapot);

for (const j of jelzesek) console.log(`::warning::${j}`);
for (const h of hibak) console.log(`::error::${h}`);
if (hibak.length) process.exit(1);
console.log('Minden adat naprakész.');
