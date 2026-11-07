// Idősor-védelem: ami egyszer bekerült (egy év vagy egy hónap adata), az nem tűnhet el és nem változhat csendben.
// Az előző mentett változathoz (git HEAD) hasonlít. A napi frissítésnél a tesztek a mentés előtt futnak,
// így ha a NAV-ról érkező adat egy már tárolt hónapot átírna, a futás megáll és jelez.
// Szándékos javítás (pl. hibásan betöltött hónap): vedd fel a data/idosor_javitasok.json-ba az útvonalat és az okát.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const GYOKER = new URL('../', import.meta.url);
const olvas = (f) => JSON.parse(readFileSync(new URL(f, GYOKER), 'utf8'));
function elozo(f) {
  try { return JSON.parse(execFileSync('git', ['show', `HEAD:${f}`], { cwd: GYOKER, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return null; }
}
const javitasok = existsSync(new URL('data/idosor_javitasok.json', GYOKER)) ? olvas('data/idosor_javitasok.json').map((j) => j.utvonal) : [];
// Ezek a mezők leírások, nem adatok: változhatnak
const META = new Set(['kozzeteve', 'automatikus', 'forras', 'megjegyzes', 'sorok', 'oszlopok']);
const adat = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).filter(([k]) => !META.has(k))) : o);

/** Az évszámmal (és hónappal) kulcsolt bejegyzések: régi → új összevetése. */
function ellenoriz(nev, regi, uj, melyseg = 1) {
  const hibak = [];
  if (!regi) return hibak;
  for (const [k, v] of Object.entries(regi)) {
    const ut = `${nev}.${k}`;
    if (javitasok.some((j) => ut === j || ut.startsWith(`${j}.`))) continue;
    if (!(k in (uj || {}))) { hibak.push(`eltűnt: ${ut}`); continue; }
    if (melyseg > 1) hibak.push(...ellenoriz(ut, v, uj[k], melyseg - 1));
    else if (JSON.stringify(adat(v)) !== JSON.stringify(adat(uj[k]))) hibak.push(`megváltozott: ${ut}: ${JSON.stringify(adat(v))} → ${JSON.stringify(adat(uj[k]))}`);
  }
  return hibak;
}

test('idősor: a NAV havi üzemanyagárai nem tűnnek el és nem változnak', () => {
  const regi = elozo('data/uzemanyag.json');
  if (!regi) return; // nincs git-előzmény (pl. letöltött másolat)
  assert.deepEqual(ellenoriz('uzemanyag.evek', regi.evek, olvas('data/uzemanyag.json').evek, 2), []);
});

test('idősor: az évenkénti adótételek nem tűnnek el és nem változnak', () => {
  const regi = elozo('data/tetelek.json');
  if (!regi) return;
  const uj = olvas('data/tetelek.json');
  const hibak = [];
  for (const [tabla, ertek] of Object.entries(regi)) {
    if (!ertek || typeof ertek !== 'object') continue;
    const evek = Object.fromEntries(Object.entries(ertek).filter(([k]) => /^\d{4}$/.test(k)));
    hibak.push(...ellenoriz(`tetelek.${tabla}`, evek, uj[tabla]));
  }
  assert.deepEqual(hibak, []);
});

test('idősor: az évenkénti matricadíjak nem tűnnek el és nem változnak', () => {
  const regi = elozo('data/szabalyok.json');
  if (!regi?.matrica?.evek) return;
  assert.deepEqual(ellenoriz('matrica.evek', regi.matrica.evek, olvas('data/szabalyok.json').matrica.evek), []);
});

test('idősor: a védelem tényleg észreveszi a változást', () => {
  const r = { 2025: { 12: { benzin: 580 } } };
  assert.deepEqual(ellenoriz('x', r, { 2025: { 12: { benzin: 580 } } }, 2), []);
  assert.equal(ellenoriz('x', r, { 2025: { 12: { benzin: 608 } } }, 2).length, 1);
  assert.equal(ellenoriz('x', r, { 2025: {} }, 2).length, 1);
  assert.equal(ellenoriz('x', r, {}, 2).length, 1);
  // új hónap hozzáadása rendben van
  assert.deepEqual(ellenoriz('x', r, { 2025: { 11: { benzin: 591 }, 12: { benzin: 580 } } }, 2), []);
});
