// Számítási tesztek a NAV-tájékoztatók és a jogszabályok példáival. Futtatás: node --test tesztek/
import test from 'node:test';
import assert from 'node:assert/strict';
import { betoltAdat } from '../forras/adat.mjs';
import * as S from '../forras/js/szamitas.mjs';

const adat = betoltAdat();

test('gépjárműadó: NAV-példák 2026', () => {
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 100, gyartasiEv: 2024, hajtas: 'hagyomanyos' }).fizetendo, 37500);
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 75, gyartasiEv: 2023, hajtas: 'hagyomanyos' }).fizetendo, 28125);
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 86, gyartasiEv: 2020, hajtas: 'hagyomanyos' }).fizetendo, 27950);
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' }).fizetendo, 27625);
});

test('gépjárműadó: 2027-ben sávot vált a 2019-es autó', () => {
  const r = S.gepjarmuado(adat, { ev: 2027, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' });
  assert.equal(r.ftKw, 255);
  assert.equal(r.fizetendo, 21675);
});

test('gépjárműadó: sávhatárok', () => {
  assert.equal(S.gjadoSav(3), 0); assert.equal(S.gjadoSav(4), 1); assert.equal(S.gjadoSav(7), 1);
  assert.equal(S.gjadoSav(8), 2); assert.equal(S.gjadoSav(11), 2); assert.equal(S.gjadoSav(12), 3);
  assert.equal(S.gjadoSav(15), 3); assert.equal(S.gjadoSav(16), 4);
});

test('gépjárműadó: mentességek', () => {
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 150, gyartasiEv: 2024, hajtas: 'elektromos' }).fizetendo, 0);
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 150, gyartasiEv: 2023, hajtas: 'plugin', phevRegi: true }).fizetendo, 0);
  assert.equal(S.gepjarmuado(adat, { ev: 2027, kw: 150, gyartasiEv: 2023, hajtas: 'plugin', phevRegi: true }).fizetendo, 150 * 330);
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 150, gyartasiEv: 2025, hajtas: 'plugin', phevRegi: false }).fizetendo, 150 * 375);
});

test('gépjárműadó: év közbeni forgalomba helyezés és mozgáskorlátozott kedvezmény', () => {
  // márciusban forgalomba helyezve → április–december, 9 hónap
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 90, gyartasiEv: 2016, hajtas: 'hagyomanyos', evkozbenHonap: 3 }).fizetendo, Math.round(90 * 250 * 9 / 12));
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', mozgaskorlatozott: true }).fizetendo, 27625 - 13000);
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 110, gyartasiEv: 2019, hajtas: 'hagyomanyos', mozgaskorlatozott: true }).kedvezmeny, 0);
});

test('illeték: NAV-tájékoztató példái', () => {
  assert.equal(S.illetek(adat, { ev: 2026, kw: 100, gyartasiEv: 2026, hajtas: 'hagyomanyos', szerzes: 'vetel' }).osszeg, 85000);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 50, gyartasiEv: 2021, hajtas: 'hagyomanyos', szerzes: 'vetel' }).osszeg, 27500);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 50, gyartasiEv: 2021, hajtas: 'hagyomanyos', szerzes: 'vetel', hanyad: 50 }).osszeg, 13750);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 50, gyartasiEv: 2021, hajtas: 'hagyomanyos', szerzes: 'ajandek' }).osszeg, 55000);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', szerzes: 'vetel' }).osszeg, 63750);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'elektromos', szerzes: 'vetel' }).osszeg, 0);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', szerzes: 'kozeli' }).osszeg, 0);
  // sávhatár: 8 éves még a középső oszlop, 9 éves már a harmadik
  assert.equal(S.illetek(adat, { ev: 2026, kw: 85, gyartasiEv: 2018, hajtas: 'hagyomanyos', szerzes: 'vetel' }).ftKw, 750);
  assert.equal(S.illetek(adat, { ev: 2026, kw: 85, gyartasiEv: 2017, hajtas: 'hagyomanyos', szerzes: 'vetel' }).ftKw, 550);
});

test('regisztrációs adó: korábbi oldal ellenőrzött példái', () => {
  // 85 kW, „15”, 2021 előtti, 90 hónapos → 47 000 × 2,25 × 30%
  const a = S.regado(adat, { datum: '2026-10-01', elsoForgalom: '2019-04-01', kw: 85, osztaly: '15', hajtas: 'hagyomanyos' });
  assert.equal(a.honapok, 90); assert.equal(a.osszeg, 31725);
  // 110 kW, 2023-as, 44 hónapos → 47 000 × 2 × 55%
  const b = S.regado(adat, { datum: '2026-10-01', elsoForgalom: '2023-02-01', kw: 110, osztaly: '15', hajtas: 'hagyomanyos' });
  assert.equal(b.honapok, 44); assert.equal(b.osszeg, 51700);
  // 2027-ben 48 000 Ft az alap
  assert.equal(S.regado(adat, { datum: '2027-01-10', elsoForgalom: '2023-02-01', kw: 110, osztaly: '15', hajtas: 'hagyomanyos' }).alap, 48000);
  assert.equal(S.regado(adat, { datum: '2026-10-01', elsoForgalom: '2023-02-01', kw: 110, hajtas: 'elektromos' }).osszeg, 0);
});

test('megkezdett hónapok', () => {
  assert.equal(S.megkezdettHonapok('2026-01-15', '2026-03-15'), 2);
  assert.equal(S.megkezdettHonapok('2026-01-15', '2026-03-16'), 3);
  assert.equal(S.megkezdettHonapok('2026-03-16', '2026-03-01'), null);
});

test('átírás összesen: alapértelmezett példa', () => {
  const r = S.atiras(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', szerzes: 'vetel', behozott: false });
  assert.equal(r.osszesen, 63750 + 24975 + 6000 + 6000 + 2000);
});

test('kilométertérítés: NAV 08. füzet példái és a korábbi oldal példája', () => {
  const p = S.kikuldetes(adat, { km: 200, uzemanyag: 'plugin', motor: 'benzin', cm3: 1500, ev: 2026, honap: 2 });
  assert.equal(p.osszesen, 9742);
  const e = S.kikuldetes(adat, { km: 200, uzemanyag: 'elektromos', cm3: 0, ev: 2026, honap: 2 });
  assert.equal(e.osszesen, 6360);
  const b = S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', cm3: 1598, ev: 2026, honap: 11 });
  assert.equal(b.uzemanyagFt, 6071); assert.equal(b.osszesen, 7571);
  const v = S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', cm3: 1598, ev: 2026, honap: 6, vedett: true });
  assert.equal(v.ar, 595);
  assert.ok(S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', cm3: 1598, ev: 2026, honap: 12 }).hiba);
});

test('munkába járás', () => {
  const r = S.munkabaJaras(adat, { km: 25, napok: 20 });
  assert.equal(r.havi, 30000); assert.equal(r.eves, 360000);
});
