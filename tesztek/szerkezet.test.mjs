// Az oldal szerkezete: minden tartalmi oldal pontosan egy csoportban, és mindenhol (főoldal, menü, lábléc, llms.txt) szerepel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CSOPORTOK, OLDALROL, FIOK, csoportja } from '../forras/sablon.mjs';
import * as O from '../forras/oldalak.mjs';

const epit = readFileSync(new URL('../epit.mjs', import.meta.url), 'utf8');
// az epit.mjs oldallistája: ['ut/', O.fv(k)] vagy [O.ALLANDO, O.fv(k)]
const oldalak = [...epit.matchAll(/^\s*\[(?:'([^']*)'|O\.(\w+)), O\.\w+\(k\)\],/gm)].map((m) => (m[1] ?? O[m[2]]));
const csoportban = CSOPORTOK.flatMap((cs) => cs.elemek.map(([u]) => u));

test('minden oldal pontosan egyszer szerepel a szerkezetben, és nincs árva oldal', () => {
  assert.ok(oldalak.length > 20, 'az oldallista beolvasása');
  assert.equal(new Set(csoportban).size, csoportban.length, 'egy oldal két csoportban');
  const szerkezet = new Set([...csoportban, ...OLDALROL.map(([u]) => u)]);
  // a statisztika szándékosan rejtett: nem indexelt, nincs a menüben
  for (const u of oldalak.filter((x) => x !== '' && x !== 'statisztika/')) assert.ok(szerkezet.has(u), `nincs csoportban: ${u}`);
  for (const u of szerkezet) assert.ok(oldalak.includes(u), `nem létező oldal a szerkezetben: ${u}`);
});

test('a főoldalon és az llms.txt-ben minden csoportelemnek van leírása', () => {
  assert.deepEqual(Object.keys(O.FOOLDAL_KARTYAK).sort(), [...csoportban].sort());
  const llms = epit.slice(epit.indexOf('const LLMS = {'), epit.indexOf('};', epit.indexOf('const LLMS = {')));
  for (const u of csoportban) assert.ok(llms.includes(`'${u}':`), `nincs llms-leírás: ${u}`);
  for (const [, szoveg] of Object.entries(O.FOOLDAL_KARTYAK)) assert.ok(szoveg.length === 2);
});

test('a menü a csoportokat követi, a „Kapcsolódó oldalak” a saját csoporttal kezd', () => {
  assert.deepEqual(FIOK.slice(0, CSOPORTOK.length), CSOPORTOK);
  assert.equal(csoportja('nav-uzemanyagar/').id, 'vallalkozas');
  assert.equal(csoportja('impresszum/'), null);
});

test('sitemap lastmod: a pecsét napi dátuma („XI. 28.”) nem számít tartalmi változásnak', async () => {
  const { lastmodDontes } = await import('../forras/sablon.mjs');
  const regi = '<text font-size="11">XI. 27.</text><p>benzin 644 Ft</p>';
  assert.equal(lastmodDontes(regi, regi.replace('XI. 27.', 'XI. 28.'), '2026-11-25', '2026-11-28'), '2026-11-25');
  assert.equal(lastmodDontes(regi, regi.replace('644', '650'), '2026-11-25', '2026-11-28'), '2026-11-28');
});
