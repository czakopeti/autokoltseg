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

test('gépjárműadó: évközi adásvétel és forgalomból kivonás (NAV GYIK)', () => {
  const alap = { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' };
  // használtan vett autó: az idei adót az eladó fizeti
  assert.equal(S.gepjarmuado(adat, { ...alap, valtozas: 'vett' }).fizetendo, 0);
  assert.equal(S.gepjarmuado(adat, { ...alap, valtozas: 'vett', mozgaskorlatozott: true }).kedvezmeny, 0);
  // eladta: az egész évit ő fizeti
  assert.equal(S.gepjarmuado(adat, { ...alap, valtozas: 'eladta' }).fizetendo, 27625);
  // júniusban kivonták: január–június, 6 hónap
  assert.equal(S.gepjarmuado(adat, { ...alap, valtozas: 'kivonta', kivonasHonap: 6 }).fizetendo, Math.round(27625 * 6 / 12));
  // a mentesség az időarányos adóra is legfeljebb 13 000 Ft
  assert.equal(S.gepjarmuado(adat, { ...alap, valtozas: 'kivonta', kivonasHonap: 3, mozgaskorlatozott: true }).fizetendo, 0);
  // a régi „evkozbenHonap” paraméter továbbra is az új forgalomba helyezést jelenti
  assert.equal(S.gepjarmuado(adat, { ...alap, evkozbenHonap: 3 }).valtozas, 'uj');
  // a következő évek sávja nem örökli az idei változást
  assert.ok(S.gjadoEvek(adat, { ...alap, valtozas: 'vett' }).every((x) => x.fizetendo > 0));
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

test('plug-in hibrid: 2027-ben lejár a mentesség', () => {
  const r = S.phev(adat, { kw: 100, gyartasiEv: 2022, regi: true, zold: true, ceges: true, parkolasHavi: 20000 });
  const [a, c] = r.evek;
  assert.equal(a.gj.fizetendo, 0);
  assert.equal(a.cegMentes, true);
  assert.equal(a.egyszeri, 18060);
  assert.equal(a.parkolas, 20000); // 2026 decembere
  assert.equal(c.gj.fizetendo, 100 * adat.tetelek.gepjarmuado[2027].savok[1]);
  assert.equal(c.ceg, 25500 * 12 - c.gj.fizetendo);
  assert.equal(r.ev2027, c.gj.fizetendo + c.ceg + 240000);
  // 2025 után forgalomba helyezett: már 2026-ban is fizet
  assert.ok(S.phev(adat, { kw: 100, gyartasiEv: 2025, regi: false }).evek[0].gj.fizetendo > 0);
});

test('autópálya-matrica: a legolcsóbb kombináció', () => {
  const d = adat.szabalyok.matrica.evek[2026].d1;
  const r = S.matrica(adat, { ev: 2026, napi: 3, tiznapos: 1 });
  assert.equal(r.legjobb.ft, 3 * d.napi + d.tiznapos);
  assert.equal(S.matrica(adat, { napi: 12 }).legjobb.kulcs, 'eves');
  assert.equal(S.matrica(adat, { varmegyek: 4, m1: true }).legjobb.kulcs, 'm1');
  assert.equal(S.matrica(adat, { varmegyek: 2, m1: true }).legjobb.ft, 2 * d.varmegyei);
  // 2027: a Magyar Közút 2026. november 6-án közzétett díjai
  const d27 = adat.szabalyok.matrica.evek[2027].d1;
  assert.deepEqual([d27.napi, d27.tiznapos, d27.havi, d27.eves, d27.varmegyei, d27.m1_regionalis], [5630, 6990, 11320, 62560, 7280, 15000]);
  assert.equal(S.matrica(adat, { ev: 2027, napi: 3, tiznapos: 1 }).lehetosegek.find((l) => l.kulcs === 'alkalmi').ft, 3 * 5630 + 6990);
  assert.equal(S.matrica(adat, { ev: 2027, napi: 3 }).ev, 2027);
  // ismeretlen év: a legutóbbi ismert év díjai
  assert.equal(S.matricaEv(adat, 2030).ev, 2027);
  assert.equal(r.hatar.napi, Math.ceil(d.eves / d.napi));
});

test('autóhitel: annuitás THM-ből', () => {
  // 0% THM: egyenlő részletek
  assert.equal(Math.round(S.torleszto(1200000, 12, 0)), 100000);
  // 12,68% THM ≈ havi 1%: 1 000 000 Ft 12 hónapra 88 849 Ft
  assert.equal(Math.round(S.torleszto(1000000, 12, (Math.pow(1.01, 12) - 1) * 100)), 88849);
  const r = S.autohitel(adat, { ar: 6000000, onero: 1000000, evek: 5, thm: 10, ev: 2026, datum: '2026-11-06' });
  assert.equal(r.hitel, 5000000);
  assert.equal(r.hfmTul, true);
  assert.equal(r.ertekVeg, null);
  assert.ok(S.autohitel(adat, { ar: 5, onero: 5, evek: 1, thm: 5 }).hiba);
});

test('regisztrációs adó: a kor szerinti csökkentés hónapsávjai', () => {
  // 81–100 kW, „15”-ös, 2021 előtti: B oszlop, 47 000 × 2,25 = 105 750 Ft
  const r92 = S.regado(adat, { datum: '2026-11-01', elsoForgalom: '2019-03-01', kw: 85, osztaly: '15', hajtas: 'hagyomanyos' });
  assert.equal(r92.teljes, 105750);
  assert.equal(r92.csokk, 70); // 85–96 hónap
  assert.equal(r92.osszeg, 31725);
  const r102 = S.regado(adat, { datum: '2026-10-01', elsoForgalom: '2018-04-01', kw: 85, osztaly: '15', hajtas: 'hagyomanyos' });
  assert.equal(r102.honapok, 102);
  assert.equal(r102.csokk, 74); // 97–108 hónap
  assert.equal(r102.osszeg, 27495);
});

test('kötelező biztosítás: határidők az MNB példája szerint', () => {
  const r = S.kgfb(adat, { evfordulo: '2027-01-01', ma: '2026-11-06' });
  assert.equal(r.kezdet, '2027-01-01');
  assert.equal(r.ertesites, '2026-11-11');
  assert.equal(r.felmondas, '2026-12-01');
  assert.equal(r.elkesett, false);
  const k = S.kgfb(adat, { evfordulo: '2020-11-20', ma: '2026-11-06' });
  assert.equal(k.kezdet, '2026-11-20');
  assert.equal(k.elkesett, true);
  assert.equal(k.kovetkezo, '2027-11-20');
});

test('bonus-malus: kármentes +1, káronként −2, négy kár M4', () => {
  assert.equal(S.bonusMalus(adat, 'B10', 0).uj, 'B10');
  assert.equal(S.bonusMalus(adat, 'B9', 0).uj, 'B10');
  assert.equal(S.bonusMalus(adat, 'B10', 1).uj, 'B8');
  assert.equal(S.bonusMalus(adat, 'B10', 3).uj, 'B4');
  assert.equal(S.bonusMalus(adat, 'B10', 4).uj, 'M4');
  assert.equal(S.bonusMalus(adat, 'A00', 0).uj, 'B1');
  assert.equal(S.bonusMalus(adat, 'B1', 2).uj, 'M3'); // B1 → A00 → M1 → M2 → M3
  assert.equal(S.bonusMalus(adat, 'M1', 3).uj, 'M4');
  assert.equal(S.bonusMalus(adat, 'B5', 0, false).uj, 'B5');
});

test('javítás vagy csere: a két út összevetése', () => {
  const r = S.javitasVagyCsere(adat, { ev: 2026, datum: '2026-11-06', evek: 3, a: { gyartasiEv: 2003, hajtas: 'benzin', ertekMost: 1500000, javitas: 1000000, ertekJavitva: 2300000, fenntartas: 450000 }, c: { ar: 3300000, gyartasiEv: 2016, hajtas: 'benzin', kw: 110, fenntartas: 300000 } });
  assert.equal(r.tart.javitas + r.tart.fenntartas, 1000000 + 3 * 450000);
  assert.equal(r.csere.kulonbozet, 1800000);
  assert.ok(r.csere.atiras > 0);
  assert.ok(Math.abs(r.kulonbseg - Math.abs(r.tart.osszes - r.csere.osszes)) < 1);
  assert.ok(S.javitasVagyCsere(adat, { ev: 2026, a: {}, c: {} }).hiba);
});
