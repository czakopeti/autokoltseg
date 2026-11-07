// Vállalkozói oldalak: cégautóadó a NAV 2026-os és 2027-es tételeivel, cégautó vagy saját autó.
import test from 'node:test';
import assert from 'node:assert/strict';
import { betoltAdat } from '../forras/adat.mjs';
import * as S from '../forras/js/szamitas.mjs';

const adat = betoltAdat();

test('cégautóadó: a NAV táblázata szerinti havi tétel, sávhatárokkal', () => {
  const h = (kw, osztaly, ev = 2026) => S.cegautoado(adat, { ev, kw, osztaly }).havi;
  assert.equal(h(50, 'euro56'), 17500);
  assert.equal(h(51, 'euro56'), 20000);
  assert.equal(h(90, 'hibrid'), 20000);
  assert.equal(h(91, 'euro56'), 25000);
  assert.equal(h(120, 'euro34'), 51000);
  assert.equal(h(121, 'regi'), 101000);
  assert.equal(h(85, 'euro56', 2027), 20000);
  assert.equal(h(110, 'euro56', 2027), 25500);
  assert.equal(h(150, 'regi', 2027), 102000);
});

test('cégautóadó: a gépjárműadó levonása és a negyedévek', () => {
  // 85 kW, 2019: gépjárműadó 2026-ban 85 × 325 = 27 625 Ft
  const r = S.cegautoado(adat, { ev: 2026, kw: 85, osztaly: 'euro56', gyartasiEv: 2019 });
  assert.equal(r.teljes, 240000);
  assert.equal(r.levonas, 27625);
  assert.equal(r.fizetendo, 212375);
  // júniusban eladta: január–június, 6 hónap, a cég által befizetett éves gépjárműadó fele vonható le
  const f = S.cegautoado(adat, { ev: 2026, kw: 85, osztaly: 'euro56', gyartasiEv: 2019, valtozas: 'eladta', honap: 6 });
  assert.equal(f.honapok, 6);
  assert.equal(f.teljes, 120000);
  assert.equal(f.levonas, Math.round(27625 / 2));
  // júniusban használtan vette: július–december, és nincs levonás (a gépjárműadót az eladó fizeti)
  const h = S.cegautoado(adat, { ev: 2026, kw: 110, osztaly: 'euro56', gyartasiEv: 2020, valtozas: 'hasznalt', honap: 6 });
  assert.equal(h.honapok, 6);
  assert.equal(h.levonas, 0);
  assert.equal(h.fizetendo, 150000);
  // márciusban új autó a cég nevére: április–december, a gépjárműadó is 9 hónapra (Gjt.)
  const u = S.cegautoado(adat, { ev: 2026, kw: 110, osztaly: 'euro56', gyartasiEv: 2026, valtozas: 'uj', honap: 3 });
  assert.equal(u.honapok, 9);
  assert.equal(u.teljes, 225000);
  assert.equal(u.levonas, Math.round(110 * 375 * 9 / 12));
  // tört kW (lóerőből átváltva) kerekítve kerül sávba, mint a gépjárműadónál
  assert.equal(S.cegautoado(adat, { ev: 2026, kw: 50.4, osztaly: 'euro56' }).havi, 17500);
});

test('cégautóadó: villanyautó és régi plug-in hibrid', () => {
  assert.equal(S.cegautoado(adat, { ev: 2026, kw: 150, osztaly: 'villany' }).fizetendo, 0);
  assert.equal(S.cegautoado(adat, { ev: 2026, kw: 135, osztaly: 'phev', phevRegi: true }).mentes, 'phev');
  assert.equal(S.cegautoado(adat, { ev: 2027, kw: 135, osztaly: 'phev', phevRegi: true }).havi, 51500);
  assert.equal(S.cegautoado(adat, { ev: 2026, kw: 135, osztaly: 'phev' }).havi, 51000);
});

test('osztalékarány: 9% tao, utána 15% szja és 13% szocho a bruttó osztalékra', () => {
  assert.equal(Math.round(S.osztalekArany(adat, true) * 10000), 6552);
  assert.equal(Math.round(S.osztalekArany(adat, false) * 10000), 7735);
});

test('cégautó vagy saját autó: kézzel ellenőrzött példa', () => {
  const r = S.cegautoVagySajat(adat, { ev: 2026, kw: 75, osztaly: 'euro56', gyartasiEv: 2015, uzemanyag: 'benzin', cm3: 1398, uzletiKm: 20000, ertekvesztes: 300000, energia: 600000, fix: 300000, szocho: true, arEv: 2026, arHonap: 11 });
  assert.equal(r.gj, 18750);
  assert.equal(r.ca.fizetendo, 221250);
  assert.equal(r.aCeg, 1440000);
  assert.equal(r.aZseb, Math.round(1440000 * 0.6552));
  const kmDij = S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', cm3: 1398, ev: 2026, honap: 11 }).ftKm;
  assert.equal(r.terites, Math.round(20000 * kmDij));
  assert.equal(r.bZseb, Math.round(1218750 - r.terites * (1 - 0.6552)));
  // a fordulóponton a két út egyforma
  const f = S.cegautoVagySajat(adat, { ev: 2026, kw: 75, osztaly: 'euro56', gyartasiEv: 2015, uzemanyag: 'benzin', cm3: 1398, uzletiKm: r.kmFordulo, ertekvesztes: 300000, energia: 600000, fix: 300000, szocho: true, arEv: 2026, arHonap: 11 });
  assert.ok(f.bZseb <= f.aZseb && f.aZseb - f.bZseb < kmDij);
});

test('cégautó vagy saját autó: hiányzó adatok', () => {
  assert.ok(S.cegautoVagySajat(adat, { ev: 2026, kw: 75, osztaly: '', gyartasiEv: 2015 }).hiba);
  assert.ok(S.cegautoVagySajat(adat, { ev: 2026, kw: 75, osztaly: 'euro56', gyartasiEv: 2015, uzletiKm: 1000, ertekvesztes: 1 }).hiba, 'üzleti útnál kell a hengerűrtartalom');
  assert.ok(!S.cegautoVagySajat(adat, { ev: 2026, kw: 150, osztaly: 'villany', gyartasiEv: 2023, uzletiKm: 10000, ertekvesztes: 2000000, energia: 300000, fix: 400000, szocho: true, arEv: 2026, arHonap: 11 }).hiba, 'villanyautónál nem kell hengerűrtartalom');
});
