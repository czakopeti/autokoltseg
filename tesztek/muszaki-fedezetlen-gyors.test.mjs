// Műszaki vizsga, fedezetlenségi díj és gyorshajtás: kézzel számolt esetek a jogszabályi táblákból.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../forras/js/szamitas.mjs';
import * as M from '../forras/js/megjelenites.mjs';
import { betoltAdat } from '../forras/adat.mjs';

const adat = betoltAdat();

test('műszaki: személyautó díja 17 100 + 9 600, villanyautónál nincs környezetvédelmi, összkerék pótdíj', () => {
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'szemely' }).dij.osszesen, 26700);
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'szemely', elektromos: true }).dij.osszesen, 17100);
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'szemely', osszkerek: true }).dij.osszesen, 33400);
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'kisteher' }).dij.osszesen, 28100);
  // motornál nincs összkerék-pótdíj
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'motor', osszkerek: true }).dij.osszesen, 7200);
});

test('műszaki: 4, 3 és 2 éves szabály', () => {
  const uj = S.muszakiVizsga(adat, { kategoria: 'szemely', uj: true, vizsga: '2026-03-10' });
  assert.equal(uj.lejaratUj, '2030-03-10');
  // 2022-es autó 2025-ben: a 2022-t követő három naptári éven belül, 3 év
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2022', vizsga: '2025-06-01' }).ev, 3);
  // 2026-ban már 2 év
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2022', vizsga: '2026-06-01' }).ev, 2);
});

test('műszaki: a lejárat előtti 30 napban a régi lejárattól számít', () => {
  const r = S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2015', lejarat: '2026-12-10', vizsga: '2026-11-15' });
  assert.equal(r.korai, true);
  assert.equal(r.lejaratUj, '2028-12-10');
  const korai = S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2015', lejarat: '2026-12-10', vizsga: '2026-11-01' });
  assert.equal(korai.korai, false);
  assert.equal(korai.lejaratUj, '2028-11-01');
  // vizsganap nélkül: a 30 napos ablak
  const ablak = S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2015', lejarat: '2026-12-10', ma: '2026-11-18' });
  assert.equal(ablak.feltetelezett, 'ablak');
  assert.equal(ablak.lejaratUj, '2028-12-10');
  // február 29-ről nem szökőévbe
  assert.equal(S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2010', vizsga: '2028-02-29' }).lejaratUj, '2030-02-28');
});

test('műszaki: csak a műszakiról kér naptárfájlt, gépjárműadó nélkül', () => {
  const r = S.hataridoNaptar(adat, { muszaki: '2028-12-10', gjado: false, ma: '2026-11-18', naptarNev: 'Műszaki vizsga' });
  assert.equal(r.esemenyek.length, 1);
  assert.match(r.ics, /X-WR-CALNAME:Műszaki vizsga/);
  assert.match(r.ics, /TRIGGER:-P30D/);
});

test('fedezetlenségi díj: két évre bontva, 21 év alatti szerződő', () => {
  // 85 kW: 71–100 kW sáv; 2025: 1610 (21 alatt), 2026: 1980 (21 alatt)
  const r = S.fedezetlensegiDij(adat, { kategoria: 'szemely', kw: 85, termeszetes: true, szuletesiEv: 2006, szerzodesEv: 2026, tol: '2025-12-20', ig: '2026-01-10', ma: '2026-11-18' });
  assert.deepEqual(r.evek.map((x) => [x.ev, x.napok, x.napi]), [[2025, 12, 1610], [2026, 10, 1980]]);
  assert.equal(r.osszeg, 12 * 1610 + 10 * 1980);
  assert.equal(r.fiatal, true);
});

test('fedezetlenségi díj: sávhatárok, cég, hiányzó év', () => {
  const d = (kw, termeszetes = false) => S.fedezetlensegiDij(adat, { kategoria: 'szemely', kw, termeszetes, szuletesiEv: 1980, tol: '2026-05-01', ig: '2026-05-01' }).osszeg;
  assert.equal(d(37), 990);
  assert.equal(d(38), 1230);
  assert.equal(d(100), 1650);
  assert.equal(d(101), 2020);
  assert.equal(d(181), 2090);
  assert.equal(S.fedezetlensegiDij(adat, { kategoria: 'teher3500', tol: '2026-01-01', ig: '2026-01-31' }).osszeg, 31 * 1530);
  const hiany = S.fedezetlensegiDij(adat, { kategoria: 'szemely', kw: 85, tol: '2026-12-31', ig: '2099-01-01' });
  assert.ok(hiany.hianyzo.includes(2099));
  assert.equal(S.fedezetlensegiDij(adat, { kategoria: 'szemely', kw: 85, tol: '2026-01-01', ig: '2026-05-31' }).reszlet, true);
});

test('gyorshajtás: sávhatárok és pontok', () => {
  const g = (korlat, mert) => S.gyorshajtas(adat, { korlat, mert });
  assert.equal(g(50, 65).birsag, 0); // 15 km/h még nem
  assert.equal(g(50, 66).birsag, 50000);
  assert.equal(g(50, 75).birsag, 50000); // 25-ig
  assert.equal(g(50, 76).birsag, 70000);
  assert.equal(g(50, 126).birsag, 468000);
  assert.equal(g(90, 120).birsag, 50000); // 30-ig
  assert.equal(g(90, 121).birsag, 70000);
  assert.equal(g(130, 150).birsag, 0); // autópályán 20-ig nem
  assert.equal(g(130, 151).birsag, 50000);
  assert.equal(g(130, 230).birsag, 315000); // 95 felett 110-ig
  assert.deepEqual([g(50, 66).pont, g(50, 96).pont, g(50, 126).pont], [4, 6, 8]);
  assert.equal(g(50, 66).kovetkezo.tullepes, 26);
});

test('panelek: nincs hiba, és a hiányzó adatot jelzik', () => {
  assert.match(M.muszakiPanel(adat, S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2015', vizsga: '2026-11-18' })), /data-muszaki-ics="2028-11-18"/);
  assert.doesNotMatch(M.muszakiPanel(adat, S.muszakiVizsga(adat, { kategoria: 'szemely', elsoHasznalat: '2015', vizsga: '2026-11-18' }), { minta: true }), /data-muszaki-ics/);
  assert.match(M.fedezetlensegiPanel(adat, S.fedezetlensegiDij(adat, { kategoria: 'szemely', tol: '2026-01-01', ig: '2026-01-02' })), /Még egy adat hiányzik/);
  assert.match(M.gyorshajtasPanel(adat, S.gyorshajtas(adat, { korlat: 50, mert: 72 })), /data-osszeg="50000"/);
});
