// Útnyilvántartás és kiküldetési rendelvény: beolvasás, havi elszámolás, a lap tartalma.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../forras/js/szamitas.mjs';
import * as M from '../forras/js/megjelenites.mjs';
import { betoltAdat } from '../forras/adat.mjs';

const adat = betoltAdat();
const lf = S.legfrissebbHonap(adat);
const ho = (h) => `${lf.ev}-${String(h).padStart(2, '0')}`;

test('dátum beolvasása a szokásos magyar alakokból', () => {
  assert.equal(S.datumBe('2026.11.03.'), '2026-11-03');
  assert.equal(S.datumBe('2026. 11. 3.'), '2026-11-03');
  assert.equal(S.datumBe('2026-11-03'), '2026-11-03');
  assert.equal(S.datumBe('2026.02.31.'), null);
  assert.equal(S.datumBe('11/03/2026'), null);
});

test('Excelből bemásolt sorok: fejléc kihagyva, tizedesvessző, 3–5 oszlop, hibás sor jelezve', () => {
  const r = S.utSorokBeolvas('Dátum\tHonnan\tHová\tPartner\tKm\n2026.10.03.\tBudapest\tGyőr\tABC Kft.\t125\n2026.10.15.;Győr – Budapest;ABC Kft.;125,5\n2026.10.20.\tÜgyfél, Vác\t1 200\nrossz\tsor\n\n');
  assert.deepEqual(r.sorok.map((x) => x.km), [125, 125.5, 1200]);
  assert.equal(r.sorok[0].hova, 'Győr');
  assert.equal(r.sorok[1].honnan, 'Győr – Budapest');
  assert.equal(r.sorok[1].partner, 'ABC Kft.');
  assert.deepEqual(r.hibasak, [5]);
});

test('havi elszámolás: annak a hónapnak a NAV-ára, amikor az út volt, és a kilométertérítéssel egyezik', () => {
  const elozo = lf.honap > 1 ? lf.honap - 1 : null;
  const utak = [{ datum: `${ho(lf.honap)}-12`, honnan: 'Budapest', hova: 'Vác', partner: 'Q', km: '72,5' }, { datum: `${ho(lf.honap)}-05`, honnan: 'Budapest', hova: 'Szeged', partner: 'XY', km: 340 }];
  if (elozo) utak.push({ datum: `${ho(elozo)}-03`, honnan: 'Budapest', hova: 'Győr', partner: 'ABC', km: 250 });
  const r = S.utnyilvantartas(adat, { uzemanyag: 'benzin', cm3: 1598, utak });
  assert.ok(!r.hiba, r.hiba);
  assert.deepEqual(r.utak.map((u) => u.datum), [...utak].map((u) => u.datum).sort());
  for (const h of r.honapok) {
    const ki = S.kikuldetes(adat, { km: h.km, uzemanyag: 'benzin', cm3: 1598, ev: h.ev, honap: h.ho });
    assert.equal(h.ar, adat.uzemanyag.evek[h.ev][h.ho].benzin);
    assert.ok(Math.abs(h.osszesen - ki.osszesen) <= 1, `${h.honap}: ${h.osszesen} vs ${ki.osszesen}`);
  }
  assert.equal(r.osszesen, r.honapok.reduce((s, h) => s + h.osszesen, 0));
});

test('hibák: hiányzó adat és még meg nem jelent NAV-hónap', () => {
  assert.match(S.utnyilvantartas(adat, { uzemanyag: 'benzin', cm3: 1598, utak: [] }).hiba, /legalább egy utat/);
  assert.match(S.utnyilvantartas(adat, { uzemanyag: 'benzin', cm3: 1598, utak: [{ datum: '2026-10-03', honnan: 'A', km: '' }] }).hiba, /kilométert/);
  assert.match(S.utnyilvantartas(adat, { uzemanyag: 'benzin', cm3: '', utak: [{ datum: '2026-10-03', honnan: 'A', km: 5 }] }).hiba, /hengerűrtartalmat/);
  assert.match(S.utnyilvantartas(adat, { uzemanyag: 'benzin', cm3: 1598, utak: [{ datum: `${lf.ev + 1}-12-01`, honnan: 'A', km: 5 }] }).hiba, /még nem jelent meg/);
  assert.ok(!S.utnyilvantartas(adat, { uzemanyag: 'elektromos', cm3: '', utak: [{ datum: `${ho(lf.honap)}-01`, honnan: 'A', km: 10 }] }).hiba);
});

test('a kiküldetési rendelvényen rajta van minden kötelező adat', () => {
  const r = S.utnyilvantartas(adat, { uzemanyag: 'dizel', cm3: 1968, utak: [{ datum: `${ho(lf.honap)}-05`, honnan: 'Budapest', hova: 'Szeged', partner: 'XY Bt.', km: 340 }] });
  const lap = M.utnyLap(adat, { tipus: 'rendelveny', nev: 'Minta Péter', adoazonosito: '8123456789', kifizeto: 'Minta Kft.', auto: 'Skoda Octavia', rendszam: 'abc123', uzemanyag: 'dizel', cm3: 1968 }, r);
  for (const kell of ['Kiküldetési rendelvény', 'Minta Péter', '8123456789', 'Minta Kft.', 'Skoda Octavia', 'ABC123', 'Budapest – Szeged', 'XY Bt.', '340', 'l/100 km', `${adat.uzemanyag.evek[lf.ev][lf.honap].dizel} Ft/l`, 'két példányban', 'kifizető', 'magánszemély']) assert.ok(lap.includes(kell), kell);
  assert.ok(lap.includes(`data-osszeg>${M.fmt(r.osszesen)}`));
  // az útnyilvántartáson nincs adóazonosító, de van km-óra
  const u = M.utnyLap(adat, { tipus: 'utnyilvantartas', adoazonosito: '8123456789' }, r);
  assert.ok(!u.includes('8123456789'));
  assert.ok(u.includes('Kilométeróra-állás'));
  assert.ok(!/undefined|NaN/.test(lap + u + M.utnyLap(adat, {}, null)));
  // a beírt szöveg nem kerülhet HTML-ként a lapra
  assert.ok(!M.utnyLap(adat, { nev: '<b>x</b>' }, null).includes('<b>x</b>'));
});
