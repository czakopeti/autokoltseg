// A mentett autó: melyik kalkulátorba mi kerül belőle, és onnan mi kerül vissza. Ellenőrzi, hogy a mezőnevek
// tényleg léteznek a megépített űrlapokon, hogy a betöltés ne írjon olyan mezőbe, amelyik nincs ott.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../forras/js/szamitas.mjs';

const AUTO = { nev: 'Corolla', kw: '90', gyartasiEv: '2019', hajtas: 'benzin', cm3: '1598', fogyasztas: '6,5', kwh: '', km: '15000', biztositas: '150000', szerviz: '120000', gumi: '40000', ertek: '4500000' };
const OLDAL = { gyors: '', gepjarmuado: 'gepjarmuado-kalkulator/', atiras: 'atirasi-illetek-kalkulator/', km: 'kilometerterites-kalkulator/', uti: 'utikoltseg-kalkulator/', fenntartas: 'autofenntartas-kalkulator/', autom: 'autom/', phev: 'plug-in-hibrid-2027/', javitas: 'megjavitsam-vagy-csereljem/', cegautoado: 'cegautoado-kalkulator/', cegauto: 'cegauto-vagy-sajat-auto/', osszevet: 'benzin-vagy-villany/' };
const urlapMezok = (ut) => {
  const h = readFileSync(new URL(`../web/${ut}index.html`, import.meta.url), 'utf8');
  const form = h.slice(h.indexOf('<form'), h.indexOf('</form>'));
  return new Set([...form.matchAll(/name="([A-Za-z0-9_]+)"/g)].map((m) => m[1]));
};

test('mentett autó: minden kalkulátor, ahol a sáv látszik, csak létező mezőbe tölt', () => {
  for (const [kalk, ut] of Object.entries(OLDAL)) {
    const h = readFileSync(new URL(`../web/${ut}index.html`, import.meta.url), 'utf8');
    assert.ok(h.includes('data-autom-betolt'), `${kalk}: nincs „Betöltöm” gomb`);
    // az alapeset (azonos mezőnevek) a nem létező mezőket egyszerűen kihagyja; a külön szabályosoknál szigorúan nézzük
    if (!['km', 'uti', 'cegautoado', 'cegauto', 'phev', 'javitas', 'osszevet'].includes(kalk)) continue;
    const mezok = urlapMezok(ut);
    for (const hajtas of ['benzin', 'dizel', 'hibrid', 'plugin', 'elektromos']) {
      const be = S.automBe(kalk, { ...AUTO, hajtas, kwh: hajtas === 'elektromos' ? '17' : '' });
      for (const k of Object.keys(be)) if (k !== 'kwEgyseg') assert.ok(mezok.has(k), `${kalk}: a(z) „${k}” mező nincs az űrlapon`);
      for (const v of Object.values(be)) assert.notEqual(v, undefined);
    }
  }
});

test('mentett autó: az út hossza nem keveredik az évi futással', () => {
  assert.equal(S.automBe('km', AUTO).km, undefined);
  assert.equal(S.automBe('uti', AUTO).km, undefined);
  assert.equal(S.automKi('km', { km: '120', uzemanyag: 'benzin', cm3: '1598' }).km, undefined);
  assert.equal(S.automKi('uti', { km: '120', uzemanyag: 'benzin', fogyasztas: '6,5' }).km, undefined);
  // a fenntartásban és az összevetésben viszont az évi futás
  assert.equal(S.automBe('fenntartas', AUTO).km, '15000');
  assert.equal(S.automBe('osszevet', AUTO).km, '15000');
});

test('mentett autó: üzemanyagból csak érvényes hajtás lesz, a hibrid megmarad', () => {
  assert.equal(S.automKi('uti', { uzemanyag: 'lpg', fogyasztas: '8' }, {}).hajtas, 'benzin');
  assert.equal(S.automKi('uti', { uzemanyag: 'lpg', fogyasztas: '8' }, {}).fogyasztas, undefined);
  assert.equal(S.automKi('uti', { uzemanyag: 'benzin', fogyasztas: '5' }, { hajtas: 'hibrid' }).hajtas, 'hibrid');
  assert.equal(S.automKi('km', { uzemanyag: 'cng', cm3: '1400' }, {}).hajtas, 'benzin');
  assert.equal(S.automKi('km', { uzemanyag: 'plugin', cm3: '1400' }, {}).hajtas, 'plugin');
  assert.equal(S.automKi('uti', { uzemanyag: 'elektromos', kwh: '17' }, { hajtas: 'hibrid' }).hajtas, 'elektromos');
  assert.equal(S.automKi('uti', { uzemanyag: '', fogyasztas: '6' }, {}).hajtas, undefined);
  for (const kalk of Object.keys(OLDAL)) {
    const h = S.automKi(kalk, { hajtas: 'lpg', a_hajtas: 'cng', uzemanyag: 'lpg', kw: '80' }, {}).hajtas;
    assert.ok(h === undefined || ['benzin', 'dizel', 'hibrid', 'plugin', 'elektromos'].includes(h), `${kalk}: érvénytelen hajtás: ${h}`);
  }
});

test('mentett autó: környezetvédelmi osztály csak ott, ahol biztos', () => {
  assert.equal(S.automBe('cegautoado', { ...AUTO, hajtas: 'elektromos' }).osztaly, 'villany');
  assert.equal(S.automBe('cegautoado', { ...AUTO, hajtas: 'plugin' }).osztaly, 'phev');
  assert.equal(S.automBe('cegautoado', { ...AUTO, hajtas: 'benzin' }).osztaly, undefined);
  assert.equal(S.automBe('cegautoado', { ...AUTO, hajtas: 'hibrid' }).osztaly, undefined);
  assert.equal(S.automKi('cegautoado', { kw: '100', osztaly: 'villany' }).hajtas, 'elektromos');
  assert.equal(S.automKi('cegautoado', { kw: '100', osztaly: 'euro56' }).hajtas, undefined);
});

test('mentett autó: lóerőből kW, az összevetés és a javítás az A autót menti', () => {
  assert.equal(S.automKi('fenntartas', { kw: '136', kwEgyseg: 'le' }).kw, '100');
  assert.deepEqual(S.automKi('osszevet', { a_nev: 'Corolla', a_hajtas: 'hibrid', a_kw: '90', a_fogyasztas: '4,8', km: '20000', b_kw: '150' }), { nev: 'Corolla', hajtas: 'hibrid', kw: '90', fogyasztas: '4,8', km: '20000' });
  assert.deepEqual(S.automKi('javitas', { a_gyartasiEv: '2007', a_hajtas: 'benzin', a_ertekMost: '900000', c_ar: '3000000' }), { gyartasiEv: '2007', hajtas: 'benzin', ertek: '900000' });
  assert.deepEqual(S.automBe('javitas', AUTO), { a_gyartasiEv: '2019', a_hajtas: 'benzin', a_ertekMost: '4500000', kwEgyseg: 'kw' });
});
