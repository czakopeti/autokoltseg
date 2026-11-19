// A fenntartási és a cégautós oldal példatáblái: a számok a kalkulátorok motorjából jönnek, és a linkjeik ugyanazt adják vissza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../forras/js/szamitas.mjs';
import { betoltAdat } from '../forras/adat.mjs';
import { feltevesek } from '../forras/oldalak.mjs';

const adat = betoltAdat();
const f = feltevesek(adat);
const lf = S.legfrissebbHonap(adat);
const ev = lf.ev;

test('fenntartási példák: a havi összeg a tételek összege, a hivatalos részek a hivatalos adatból', () => {
  const p = adat.szabalyok.fenntartas_peldak;
  assert.ok(p.kgfb_atlag.ft > 30000 && p.kgfb_atlag.ft < 150000, 'a kgfb-átlag nagyságrendje');
  assert.match(p.kgfb_atlag.forras, /^https:\/\/statisztika\.mnb\.hu\//);
  const sorok = S.fenntartasPeldak(adat, { ev, f });
  assert.equal(sorok.length, p.autok.length);
  for (const x of sorok) {
    const osszeg = x.energia + x.ertekvesztes + x.biztAdo + x.szervizGumi;
    assert.ok(Math.abs(osszeg / 12 - x.havi) < 1e-6, `${x.id}: a havi nem a tételek összege`);
    assert.ok(Math.abs(x.ftKm - osszeg / x.km) < 1e-6);
    assert.ok(x.havi > 30000 && x.havi < 300000, `${x.id}: valószínűtlen havi összeg: ${x.havi}`);
    const gj = x.r.gj.hiba ? 0 : x.r.gj.fizetendo;
    assert.equal(x.biztAdo, p.kgfb_atlag.ft + gj);
    if (x.hajtas === 'elektromos') assert.equal(gj, 0);
    else assert.ok(Math.abs(x.energia - x.km * x.fogyasztas / 100 * f[x.hajtas === 'dizel' ? 'dizel' : 'benzin']) < 1e-6, `${x.id}: nem a NAV-árral számolt`);
    assert.ok(Math.abs(x.ertekvesztes - x.ertek * adat.szabalyok.maradvany[x.hajtas].evi / 100) < 1e-6);
  }
});

test('cégautós példa: három futás, a fordulópont tényleg fordulópont, a link ugyanazt adja', () => {
  const pl = S.cegautoPeldak(adat, { ev, lf });
  assert.equal(pl.sorok.length, 3);
  assert.equal(pl.ar, adat.uzemanyag.evek[lf.ev][lf.honap].benzin);
  if (pl.fordulo !== null && pl.fordulo > 0) {
    const r = (km) => {
      const p = S.CEG_PELDA;
      const energia = Math.round((km + p.maganKm) * p.fogyasztas / 100 * pl.ar);
      return S.cegautoVagySajat(adat, { ev, kw: p.kw, osztaly: p.osztaly, gyartasiEv: p.gyartasiEv, uzemanyag: p.uzemanyag, cm3: p.cm3, ertekvesztes: p.ertekvesztes, energia, fix: p.fix, uzletiKm: km, szocho: true, arEv: lf.ev, arHonap: lf.honap }).kulonbseg;
    };
    assert.ok(r(pl.fordulo) > 0, 'a fordulóponton a saját autó olcsóbb');
    assert.ok(r(pl.fordulo - 500) <= 0, 'előtte még nem');
  }
  // a táblázat linkje a kalkulátorba ugyanazokat az adatokat viszi, amiből a sor készült
  const h = readFileSync(new URL('../web/cegauto-vagy-sajat-auto/index.html', import.meta.url), 'utf8');
  for (const s of pl.sorok) {
    const m = h.match(new RegExp(`cegauto-vagy-sajat-auto/\\?([^"]*uzletiKm=${s.uzletiKm})"`));
    assert.ok(m, `nincs link: ${s.uzletiKm} km`);
    const q = Object.fromEntries(new URLSearchParams(m[1].replace(/&amp;/g, '&')));
    const r = S.cegautoVagySajat(adat, { ...q, ev, szocho: true, arEv: lf.ev, arHonap: lf.honap });
    assert.equal(r.aZseb, s.r.aZseb);
    assert.equal(r.bZseb, s.r.bZseb);
  }
});

test('példatáblák az oldalakon: a GYIK és a táblázat ugyanazt mondja', () => {
  const fh = readFileSync(new URL('../web/autofenntartas-kalkulator/index.html', import.meta.url), 'utf8');
  assert.match(fh, /id="havi-koltseg"/);
  for (const x of S.fenntartasPeldak(adat, { ev, f })) {
    const ft = new Intl.NumberFormat('hu-HU').format(Math.round(x.havi / 100) * 100).replace(/\s/g, ' ');
    assert.ok(fh.replace(/ | /g, ' ').includes(ft), `hiányzik a havi összeg: ${x.id} ${ft}`);
  }
  const ch = readFileSync(new URL('../web/cegauto-vagy-sajat-auto/index.html', import.meta.url), 'utf8');
  assert.match(ch, /id="pelda"/);
  assert.match(ch, /Hány kilométer üzleti út felett éri meg a saját autó\?/);
});

test('ellenőrzés késése: három napnál régebbi utolsó ellenőrzésnél jelez, frissnél nem', async () => {
  const { ellenorzesKesik } = await import('../forras/sablon.mjs');
  assert.equal(ellenorzesKesik('2026-11-17T05:12:00Z', '2026-11-18'), false);
  assert.equal(ellenorzesKesik('2026-11-15T05:12:00Z', '2026-11-18'), false);
  assert.equal(ellenorzesKesik('2026-11-14T05:12:00Z', '2026-11-18'), true);
  assert.equal(ellenorzesKesik(null, '2026-11-18'), false);
});
