// Referenciaesetek kézzel számolt eredménnyel: ha a számítási logika elcsúszik, ezek jeleznek.
// A tételek a NAV 2026-os (HÉ 2025/49.) és 2027-es (HÉ 2026/53.) közleményéből valók.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../forras/js/szamitas.mjs';
import * as M from '../forras/js/megjelenites.mjs';
import { betoltAdat } from '../forras/adat.mjs';

const adat = betoltAdat();

test('gépjárműadó: korsávváltás 2026-ról 2027-re', () => {
  // 2019-es, 85 kW: 2026-ban 7 éves (4–7. év, 325 Ft/kW), 2027-ben 8 éves (8–11. év, 255 Ft/kW)
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' }).fizetendo, 27625);
  assert.equal(S.gepjarmuado(adat, { ev: 2027, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' }).fizetendo, 21675);
  // 2023-as, 100 kW: 2026-ban 3 éves (0–3. év, 375 Ft/kW), 2027-ben 4 éves (330 Ft/kW)
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 100, gyartasiEv: 2023, hajtas: 'hagyomanyos' }).fizetendo, 37500);
  assert.equal(S.gepjarmuado(adat, { ev: 2027, kw: 100, gyartasiEv: 2023, hajtas: 'hagyomanyos' }).fizetendo, 33000);
  // a villanyautó mentes
  assert.equal(S.gepjarmuado(adat, { ev: 2026, kw: 150, gyartasiEv: 2024, hajtas: 'elektromos' }).fizetendo, 0);
});

test('cégautóadó: a 120 kW-os határ és az osztályok', () => {
  const ca = (kw, osztaly, ev = 2026) => S.cegautoado(adat, { ev, kw, osztaly }).havi;
  assert.equal(ca(120, 'euro34'), 51000); // 91–120 kW, „6”–„10”
  assert.equal(ca(121, 'euro34'), 76000); // 120 kW felett
  assert.equal(ca(50, 'euro56'), 17500); // 0–50 kW, „14”–„15”
  assert.equal(ca(51, 'euro56'), 20000);
  assert.equal(ca(90, 'regi', 2027), 51500);
  assert.equal(S.cegautoado(adat, { ev: 2026, kw: 150, osztaly: 'villany' }).fizetendo, 0);
});

test('átírási illeték: a sáv- és korhatárok', () => {
  const il = (kw, kor, ev = 2026) => adat.tetelek.illetek[ev].tabla[S.illetekSor(kw)][S.illetekOszlop(kor)] * kw;
  assert.equal(il(40, 3), 40 * 550);
  assert.equal(il(41, 4), 41 * 550);
  assert.equal(il(120, 8), 120 * 750);
  assert.equal(il(121, 9), 121 * 750);
  assert.equal(il(121, 0, 2027), 121 * 950);
});

test('kilométertérítés: több hónapra eső utak a saját hónapjuk árával', () => {
  const r = S.utnyilvantartas(adat, { uzemanyag: 'benzin', cm3: 1598, utak: [{ datum: '2026-10-03', honnan: 'Budapest', hova: 'Győr', km: 250 }, { datum: '2026-11-05', honnan: 'Budapest', hova: 'Szeged', km: 340 }] });
  // 1598 cm³ benzines: 9,5 l/100 km; október 605 Ft, november 639 Ft; 15 Ft/km
  assert.deepEqual(r.honapok.map((h) => [h.ar, h.uzemanyagFt, h.normakoltseg]), [[605, Math.round(250 * 0.095 * 605), 3750], [639, Math.round(340 * 0.095 * 639), 5100]]);
  assert.equal(r.osszesen, 14369 + 3750 + 20640 + 5100); // 250 × 0,095 × 605 = 14 368,75; 340 × 0,095 × 639 = 20 639,7
});

test('autóhitel: nulla kamat, rövid futamidő, önerő a vételárig', () => {
  const r = S.autohitel(adat, { ar: 3_000_000, onero: 0, evek: 5, thm: 0, ev: 2026 });
  assert.equal(r.havi, 50_000);
  assert.equal(Math.round(r.kamat), 0);
  const rovid = S.autohitel(adat, { ar: 1_200_000, onero: 0, evek: 1, thm: 12, ev: 2026 });
  // 12% THM éves tényleges ráta: havi ráta (1,12)^(1/12) − 1
  const i = Math.pow(1.12, 1 / 12) - 1;
  assert.ok(Math.abs(rovid.havi - 1_200_000 * i / (1 - Math.pow(1 + i, -12))) < 1e-6);
  assert.match(S.autohitel(adat, { ar: 1_000_000, onero: 1_000_000, evek: 3, thm: 10 }).hiba, /önerő/);
  assert.match(S.autohitel(adat, { ar: 1_000_000, evek: 3, thm: '' }).hiba, /THM/);
});

test('javítás vagy csere: drágább javítás, mint az autó értéke, és a fordulópont', () => {
  const b = { ev: 2026, datum: '2026-11-18', evek: 3, a: { gyartasiEv: 2008, hajtas: 'benzin', ertekMost: 500_000, javitas: 2_000_000, fenntartas: 400_000 }, c: { ar: 3_000_000, gyartasiEv: 2016, hajtas: 'benzin', kw: 90, fenntartas: 300_000 } };
  const r = S.javitasVagyCsere(adat, b);
  assert.ok(!r.hiba);
  assert.ok(r.ertekJavitvaBecsles);
  // a fordulóponton a két út ugyanannyi
  const f = S.javitasVagyCsere(adat, { ...b, a: { ...b.a, ertekJavitva: r.fordulo } });
  assert.ok(Math.abs(f.tart.osszes - f.csere.osszes) < 1);
  // a panel kiírja a fordulópontot
  assert.match(M.javitasPanel(adat, r), /A javítás akkor (olcsóbb|is olcsóbb)/);
});

test('kötelező biztosítás: évforduló januárban, decemberben, február 29-én', () => {
  assert.equal(S.kgfb(adat, { evfordulo: '2015-01-01', ma: '2026-11-18' }).felmondas, '2026-12-01');
  assert.equal(S.kgfb(adat, { evfordulo: '2019-12-20', ma: '2026-11-18' }).felmondas, '2026-11-19');
  const r = S.kgfb(adat, { evfordulo: '2019-12-10', ma: '2026-11-18' });
  assert.equal(r.felmondas, '2026-11-09');
  assert.ok(r.elkesett);
  assert.equal(r.kovetkezoFelmondas, '2027-11-09');
  assert.equal(S.kgfb(adat, { evfordulo: '2024-02-29', ma: '2026-11-18' }).kezdet, '2027-02-28');
  assert.equal(S.kgfb(adat, { evfordulo: '2024-02-29', ma: '2027-03-01' }).kezdet, '2028-02-29');
});

test('adásvételi szerződés: hosszú név, különleges karakterek, üres űrlap', () => {
  const hosszu = 'Nagy'.repeat(40);
  const h = M.szerzodes(adat, { eNev: hosszu, vNev: '<script>x</script> & Társa', vetelar: 1_234_567 });
  assert.ok(h.includes(hosszu));
  assert.ok(!h.includes('<script>x'));
  assert.ok(h.includes('egymillió-kétszázharmincnégyezer-ötszázhatvanhét') || /1\s?234\s?567/.test(h));
  assert.ok(!/undefined|NaN/.test(M.szerzodes(adat, {})));
});
