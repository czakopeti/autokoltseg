// Következő lépés: minden ajánlás létező kalkulátorra mutat, és csak olyan mezőt tölt ki, amelyik ott tényleg van.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../forras/js/szamitas.mjs';
import { KALK_UTAK } from '../forras/sablon.mjs';

const mezok = (kalk) => {
  const h = readFileSync(new URL(`../web/${KALK_UTAK[kalk]}index.html`, import.meta.url), 'utf8');
  const form = h.slice(h.indexOf('<form'), h.indexOf('</form>'));
  return { nevek: new Set([...form.matchAll(/name="([A-Za-z0-9_]+)"/g)].map((m) => m[1])), form };
};
const ertekVan = (form, nev, v) => !/type="radio"/.test(form.match(new RegExp(`<input[^>]*name="${nev}"[^>]*>`))?.[0] || '') || form.includes(`name="${nev}" value="${v}"`) || new RegExp(`value="${v}"[^>]*name="${nev}"`).test(form);

const MINTAK = {
  gepjarmuado: { kw: '150', kwEgyseg: 'le', gyartasiEv: '2019', hajtas: 'benzin' },
  atiras: { kw: '85', gyartasiEv: '2019', hajtas: 'dizel', vetelar: '4500000' },
  fenntartas: { kw: '85', gyartasiEv: '2019', hajtas: 'benzin', fogyasztas: '6,5', km: '15000', biztositas: '150000', szerviz: '120000', ertek: '4500000' },
  uti: { km: '120', odaVissza: true, uzemanyag: 'lpg', fogyasztas: '8', alkalom: '4' },
  km: { mod: 'kikuldetes', km: '120', odaVissza: true, uzemanyag: 'cng', cm3: '1400' },
  hitel: { ar: '6000000', kw: '110', gyartasiEv: '2021', hajtas: 'hibrid' },
  javitas: { c_kw: '110', c_gyartasiEv: '2016', c_hajtas: 'benzin', c_ar: '3300000' },
  osszevet: { b_ar: '14500000', b_kw: '150', b_hajtas: 'elektromos' },
  cegautoado: { kw: '110', osztaly: 'euro56', gyartasiEv: '2021', phevRegi: false },
  cegauto: { kw: '110', osztaly: 'phev', gyartasiEv: '2021', phevRegi: true },
  phev: { kw: '135', gyartasiEv: '2022', regi: true },
  matrica: { napi: '3' },
};

test('következő lépés: a cél létezik, a mezők és a választható értékek is', () => {
  for (const [kalk, e] of Object.entries(MINTAK)) {
    const l = S.kovetkezoLepesek(kalk, e);
    assert.ok(l.length >= 1 && l.length <= 2, `${kalk}: ${l.length} ajánlás`);
    for (const x of l) {
      assert.ok(KALK_UTAK[x.cel], `${kalk} → ismeretlen cél: ${x.cel}`);
      assert.notEqual(x.cel, kalk);
      const { nevek, form } = mezok(x.cel);
      for (const [k, v] of Object.entries(x.q)) {
        if (v === undefined) continue;
        assert.ok(nevek.has(k), `${kalk} → ${x.cel}: nincs „${k}” mező`);
        assert.ok(ertekVan(form, k, v), `${kalk} → ${x.cel}: a „${k}” mezőnek nincs „${v}” értéke`);
      }
    }
  }
});

test('következő lépés: lóerőből kW, az LPG-fogyasztás nem megy át benzinesként, az éves km a rendszeres útból', () => {
  assert.equal(S.kovetkezoLepesek('gepjarmuado', MINTAK.gepjarmuado)[0].q.kw, '110');
  const uti = S.kovetkezoLepesek('uti', MINTAK.uti);
  assert.equal(uti[0].q.hajtas, 'benzin');
  assert.equal(uti[0].q.fogyasztas, undefined);
  assert.equal(uti[0].q.km, String(240 * 4 * 12));
  assert.equal(uti[1].q.odaVissza, '1');
  // CNG-ből nincs útiköltség-üzemanyag: üresen marad, ott választja ki
  assert.equal(S.kovetkezoLepesek('km', MINTAK.km)[0].q.uzemanyag, undefined);
  assert.deepEqual(S.kovetkezoLepesek('km', { mod: 'munka', tav: '18' }), []);
  assert.deepEqual(S.kovetkezoLepesek('osszevet', {}), []);
  // villanyautónál nem ajánljuk a villanyra váltást
  assert.equal(S.kovetkezoLepesek('fenntartas', { ...MINTAK.fenntartas, hajtas: 'elektromos', kwh: '17' }).some((x) => x.cel === 'osszevet'), false);
  assert.equal(S.kovetkezoQuery({ a: '1', b: undefined, c: '', d: false }), '?a=1');
  assert.equal(S.kovetkezoQuery({}), '');
});

test('következő lépés: a link kódolva, a szöveg HTML-biztos', async () => {
  const M = await import('../forras/js/megjelenites.mjs');
  const h = M.kovetkezoBlokk([{ cel: 'uti', cim: 'A <b>', szoveg: 'x & y', q: { km: '1 2' } }], { uti: '/utikoltseg-kalkulator/' });
  assert.match(h, /href="\/utikoltseg-kalkulator\/\?km=1\+2"/);
  assert.match(h, /A &lt;b&gt;/);
  assert.equal(M.kovetkezoBlokk([{ cel: 'nincs', cim: 'x', szoveg: 'y', q: {} }], {}), '');
});
