// A NAV-feldolgozók tesztje mintaoldalakon (a NAV valódi felépítését követik).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as N from '../frissito/nav.mjs';

const minta = (f) => readFileSync(new URL(`./minta/${f}`, import.meta.url), 'utf8');

test('üzemanyagár: védett oszlopokkal, kötőjeles hiányzó értékekkel', () => {
  const t = N.uzemanyagFeldolgoz(minta('nav-uzemanyag-2026.html'));
  assert.deepEqual(t[11], { benzin: 639, dizel: 712, keverek: 695, lpg: 365, cng: 890 });
  assert.deepEqual(t[7], { benzin_vedett: 595, benzin: 662, dizel_vedett: 615, dizel: 677, keverek: 716, lpg: 376, cng: 860 });
  assert.equal(Object.keys(t).length, 11);
});

test('üzemanyagár: „védett” felirat nélküli dupla oszlop is jól képződik le', () => {
  const t = N.uzemanyagFeldolgoz(minta('nav-uzemanyag-jeloletlen.html'));
  assert.deepEqual(t[6], { benzin_vedett: 595, benzin: 698, dizel_vedett: 615, dizel: 731, keverek: 752, lpg: 376, cng: 860 });
  assert.deepEqual(t[8], { benzin: 580, dizel: 592, keverek: 636, lpg: 366, cng: 800 });
});

test('üzemanyagár: átalakított oldalnál hibát dob, nem ír át semmit', () => {
  assert.throws(() => N.uzemanyagFeldolgoz('<html><body><p>Az oldal megújult.</p></body></html>'));
  assert.throws(() => N.uzemanyagFeldolgoz(minta('nav-uzemanyag-2026.html').replace('639', '6390')));
});

test('gépjárműadó-tételek a NAV valorizált oldaláról', () => {
  const s = N.gjadoFeldolgoz(minta('nav-gjado-2027.html'), 2027, [375, 325, 250, 205, 150]);
  assert.deepEqual(s, [380, 330, 255, 205, 150]);
  assert.throws(() => N.gjadoFeldolgoz(minta('nav-gjado-2027.html'), 2027, [100, 90, 80, 70, 60]));
});

test('regisztrációs adó alapösszege', () => {
  const html = '<h1>Regisztrációs adó 2027. évre valorizált mértéke</h1><p>A regisztrációs adóról szóló 2003. évi CX. törvény Melléklet I. részének nyitó szövegrészében szereplő forintérték 2027. évre 48&nbsp;000 forintban kerül megállapításra.</p>';
  assert.equal(N.regadoFeldolgoz(html, 2027, 47000), 48000);
});

test('cégautóadó-tábla', () => {
  const html = '<h1>Cégautóadó 2027. évre valorizált mértéke</h1><table><tr><td>0–50</td><td>39 000 Ft</td><td>20 000 Ft</td><td>17 500 Ft</td></tr><tr><td>51–90</td><td>51 500 Ft</td><td>25 500 Ft</td><td>20 000 Ft</td></tr><tr><td>91–120</td><td>77 000 Ft</td><td>51 500 Ft</td><td>25 500 Ft</td></tr><tr><td>120 felett</td><td>102 000 Ft</td><td>77 000 Ft</td><td>51 500 Ft</td></tr></table>';
  const c = N.cegautoadoFeldolgoz(html);
  assert.equal(c.ev, 2027);
  assert.deepEqual(c.tabla[3], [102000, 77000, 51500]);
});

import { esedekesek, utolsoEsedekesseg } from '../frissito/karbantartas.mjs';
test('karbantartás: éves és egyszeri esedékesség', () => {
  assert.equal(utolsoEsedekesseg('--12-01', '2026-11-06'), '2025-12-01');
  assert.equal(utolsoEsedekesseg('--12-01', '2026-12-01'), '2026-12-01');
  assert.equal(utolsoEsedekesseg('2027-01-05', '2026-11-06'), null);
  const k = { teendok: [{ id: 'a', mikor: '--12-01', utoljara: '2026-11-06' }, { id: 'b', mikor: '2026-11-01', utoljara: null }, { id: 'c', mikor: '2026-11-01', utoljara: '2026-11-02' }] };
  assert.deepEqual(esedekesek(k, '2026-11-06').map((t) => t.id), ['b']);
  assert.deepEqual(esedekesek(k, '2026-12-02').map((t) => t.id), ['a', 'b']);
});
