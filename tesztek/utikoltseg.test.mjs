// Útiköltség-kalkulátor: normál, határértékes és hibás bemenetek. Az árakat rögzített adattal adjuk meg,
// hogy a teszt ne függjön attól, melyik hónap a legfrissebb.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../forras/js/szamitas.mjs';

const adat = { uzemanyag: { evek: { 2026: {
  10: { benzin: 605, dizel: 681, lpg: 356 },
  11: { benzin: 639, dizel: 712, lpg: 365, benzin_vedett: 595, dizel_vedett: 615 },
} } } };
const f = { aram_kedv: 36.9, aram_piaci: 70.104, tolto: 219, veszteseg: 10 };
const alap = { ev: 2026, honap: 11, f };
const ut = (b) => S.utikoltseg(adat, { ...alap, ...b });

test('útiköltség: 100 km benzinnel, NAV-árral', () => {
  const r = ut({ km: 100, uzemanyag: 'benzin', fogyasztas: 6.5 });
  assert.equal(r.tav, 100);
  assert.equal(r.mennyiseg, 6.5);
  assert.equal(r.ar, 639);
  assert.equal(r.energiaFt, 4154); // 6,5 × 639 = 4153,5 → 4154
  assert.equal(r.osszesen, 4154);
  assert.equal(r.arTipus, 'hivatalos');
  assert.equal(r.utasok, 1);
  assert.equal(r.fejenkent, 4154);
  assert.equal(r.havi, undefined);
});

test('útiköltség: oda-vissza, utasok, útdíj, rendszeres út', () => {
  const r = ut({ km: 120, odaVissza: true, uzemanyag: 'dizel', fogyasztas: 5.5, utasok: 3, egyeb: 5550, alkalom: 4 });
  assert.equal(r.tav, 240);
  assert.equal(r.energiaFt, Math.round(240 * 5.5 / 100 * 712)); // 9398,4 → 9398
  assert.equal(r.osszesen, 9398 + 5550);
  assert.equal(r.fejenkent, Math.round((9398 + 5550) / 3));
  assert.equal(r.havi, (9398 + 5550) * 4);
  assert.equal(r.eves, (9398 + 5550) * 48);
  // a km-enkénti költség csak az üzemanyagé, az útdíj nélkül
  assert.equal(r.ftKm, 9398 / 240);
});

test('útiköltség: LPG a NAV LPG-árával', () => {
  assert.equal(ut({ km: 100, uzemanyag: 'lpg', fogyasztas: 8 }).energiaFt, Math.round(8 * 365));
});

test('útiköltség: védett ár csak kérésre', () => {
  assert.equal(ut({ km: 100, uzemanyag: 'benzin', fogyasztas: 6 }).ar, 639);
  const v = ut({ km: 100, uzemanyag: 'benzin', fogyasztas: 6, vedett: true });
  assert.equal(v.ar, 595);
  assert.match(v.arForras, /védett/);
  // ahol nincs védett ár, a rendes árral számol
  assert.equal(ut({ km: 100, uzemanyag: 'lpg', fogyasztas: 8, vedett: true }).ar, 365);
});

test('útiköltség: a saját ár felülírja a NAV-árat', () => {
  const r = ut({ km: 100, uzemanyag: 'benzin', fogyasztas: 6, sajatAr: 650 });
  assert.equal(r.ar, 650);
  assert.equal(r.arTipus, 'sajat');
  assert.equal(r.energiaFt, 3900);
});

test('útiköltség: villanyautó töltési veszteséggel, a töltés helye szerint', () => {
  const o = ut({ km: 100, uzemanyag: 'elektromos', fogyasztas: 17, toltes: 'otthon' });
  assert.equal(o.egyseg, 'kWh');
  assert.ok(Math.abs(o.mennyiseg - 18.7) < 1e-9); // 17 × 1,10
  assert.equal(o.energiaFt, Math.round(18.7 * 36.9));
  assert.equal(o.arTipus, 'becsles');
  assert.equal(ut({ km: 100, uzemanyag: 'elektromos', fogyasztas: 17, toltes: 'otthonPiaci' }).energiaFt, Math.round(18.7 * 70.104));
  assert.equal(ut({ km: 100, uzemanyag: 'elektromos', fogyasztas: 17, toltes: 'tolto' }).energiaFt, Math.round(18.7 * 219));
  // ismeretlen töltési mód: otthoni kedvezményes ár
  assert.equal(ut({ km: 100, uzemanyag: 'elektromos', fogyasztas: 17, toltes: 'x' }).ar, 36.9);
  // saját áramár: a veszteséget akkor is hozzáadjuk
  assert.equal(ut({ km: 100, uzemanyag: 'elektromos', fogyasztas: 17, sajatAr: 100 }).energiaFt, 1870);
});

test('útiköltség: határértékek', () => {
  assert.ok(!ut({ km: 1, uzemanyag: 'benzin', fogyasztas: 1 }).hiba);
  assert.ok(!ut({ km: 20000, uzemanyag: 'benzin', fogyasztas: 40 }).hiba);
  assert.ok(!ut({ km: 10, uzemanyag: 'elektromos', fogyasztas: 5 }).hiba);
  assert.ok(!ut({ km: 10, uzemanyag: 'elektromos', fogyasztas: 60 }).hiba);
  assert.ok(!ut({ km: 10, uzemanyag: 'benzin', fogyasztas: 6, utasok: 9 }).hiba);
  assert.ok(!ut({ km: 10, uzemanyag: 'benzin', fogyasztas: 6, alkalom: 62 }).hiba);
  assert.equal(ut({ km: 10, uzemanyag: 'benzin', fogyasztas: 6, alkalom: 0 }).havi, undefined);
});

test('útiköltség: hibás bemenetek magyar hibaüzenettel', () => {
  const hiba = (b) => ut({ km: 100, uzemanyag: 'benzin', fogyasztas: 6, ...b }).hiba;
  assert.match(hiba({ km: '' }), /távolság/);
  assert.match(hiba({ km: 0 }), /távolság/);
  assert.match(hiba({ km: -5 }), /távolság/);
  assert.match(hiba({ km: 20001 }), /távolság/);
  assert.match(hiba({ uzemanyag: '' }), /mivel megy/);
  assert.match(hiba({ uzemanyag: 'cng' }), /mivel megy/);
  assert.match(hiba({ fogyasztas: '' }), /fogyasztást/);
  assert.match(hiba({ fogyasztas: 0.5 }), /Ellenőrizd a fogyasztást/);
  assert.match(hiba({ fogyasztas: 41 }), /Ellenőrizd a fogyasztást/);
  assert.match(hiba({ uzemanyag: 'elektromos', fogyasztas: 4 }), /kWh/);
  assert.match(hiba({ utasok: 0 }), /utasok/);
  assert.match(hiba({ utasok: 10 }), /utasok/);
  assert.match(hiba({ utasok: 2.5 }), /utasok/);
  assert.match(hiba({ egyeb: -1 }), /negatív/);
  assert.match(hiba({ alkalom: 63 }), /62/);
  assert.match(hiba({ alkalom: -1 }), /62/);
  assert.match(hiba({ honap: 12 }), /NAV-ár/);
  assert.match(ut({ km: 10, uzemanyag: 'elektromos', fogyasztas: 17, f: {} }).hiba, /áramár/);
});

test('útiköltség: a valódi adatokkal a legfrissebb hónapra is számol', async () => {
  const { betoltAdat } = await import('../forras/adat.mjs');
  const a = betoltAdat();
  const lf = S.legfrissebbHonap(a);
  const r = S.utikoltseg(a, { km: 100, uzemanyag: 'benzin', fogyasztas: 6.5, ev: lf.ev, honap: lf.honap, f: a.szabalyok.energia });
  assert.ok(!r.hiba);
  assert.equal(r.ar, a.uzemanyag.evek[lf.ev][lf.honap].benzin);
  for (const t of Object.values(S.UTI_TOLTES)) assert.ok(a.szabalyok.energia[t] > 0, `hiányzik az energia.${t}`);
});
