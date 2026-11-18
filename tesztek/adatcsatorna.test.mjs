// A JSON-adatcsatorna: állandó mezők (v1), és ugyanazok a sávok, mint a kalkulátorban.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../forras/js/szamitas.mjs';
import { betoltAdat } from '../forras/adat.mjs';
import { adatJsonok, uzemanyagSorok } from '../forras/oldalak.mjs';

const adat = betoltAdat();
const j = adatJsonok(adat, { domain: 'https://autozom.hu' });

test('a v1 fájlok és mezők megvannak (ezeket nem szabad átnevezni)', () => {
  assert.deepEqual(Object.keys(j).sort(), ['atirasi-illetek.json', 'cegautoado.json', 'e-matrica.json', 'gepjarmuado.json', 'index.json', 'nav-uzemanyagar.json']);
  for (const o of Object.values(j)) {
    assert.equal(o.verzio, 1);
    assert.equal(o.licenc.nev, 'CC BY 4.0');
    assert.match(o.dokumentacio, /#fejlesztoknek$/);
  }
  const n = j['nav-uzemanyagar.json'];
  for (const m of ['honap', 'benzin_ft_l', 'dizel_ft_l', 'keverek_ft_l', 'lpg_ft_l', 'cng_ft_kg', 'benzin_vedett_ft_l', 'dizel_vedett_ft_l', 'kozzeteve']) assert.ok(m in n.legfrissebb, m);
  assert.equal(n.honapok.length, uzemanyagSorok(adat).length);
  assert.deepEqual(n.legfrissebb, n.honapok.at(-1));
  const lf = S.legfrissebbHonap(adat);
  assert.equal(n.legfrissebb.honap, `${lf.ev}-${String(lf.honap).padStart(2, '0')}`);
  assert.equal(j['index.json'].adatok.length, 5);
  assert.ok(j['index.json'].adatok.every((a) => a.url.startsWith('https://autozom.hu/adatok/v1/')));
});

test('a JSON-ból számolt gépjárműadó és illeték egyezik a kalkulátorral', () => {
  for (const [ev, e] of Object.entries(j['gepjarmuado.json'].evek)) {
    for (const kor of [0, 3, 4, 7, 8, 11, 12, 15, 16, 30]) {
      const sav = e.savok.find((x) => kor >= x.kor_tol && (x.kor_ig === null || kor <= x.kor_ig));
      const r = S.gepjarmuado(adat, { ev: Number(ev), kw: 100, gyartasiEv: Number(ev) - kor, hajtas: 'hagyomanyos' });
      assert.equal(sav.ft_per_kw * 100, r.evesTeljes, `${ev}, ${kor} éves`);
    }
  }
  for (const [ev, e] of Object.entries(j['atirasi-illetek.json'].evek)) {
    for (const kw of [1, 40, 41, 80, 81, 120, 121, 300]) for (const kor of [0, 3, 4, 8, 9, 20]) {
      const t = e.tetelek.find((x) => kw >= x.kw_tol && (x.kw_ig === null || kw <= x.kw_ig) && kor >= x.kor_tol && (x.kor_ig === null || kor <= x.kor_ig));
      assert.equal(t.ft_per_kw, adat.tetelek.illetek[ev].tabla[S.illetekSor(kw)][S.illetekOszlop(kor)], `${ev}, ${kw} kW, ${kor} év`);
    }
  }
  for (const e of Object.values(j['cegautoado.json'].evek)) assert.equal(e.tetelek.length, 12);
});
