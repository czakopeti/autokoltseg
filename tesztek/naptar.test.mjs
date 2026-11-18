// Az autóm naptárfájlja, a NAV-üzemanyagár oldal és a sitemap dátuma.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../forras/js/szamitas.mjs';
import * as M from '../forras/js/megjelenites.mjs';
import { betoltAdat } from '../forras/adat.mjs';
import { navArAdatok, navArOldal } from '../forras/oldalak.mjs';
import { lastmodDontes, tartalomLenyomat } from '../forras/sablon.mjs';

const adat = betoltAdat();
const alap = { nev: 'a Corolla', hajtas: 'benzin', ma: '2026-11-18', most: '2026-11-18T10:00:00Z' };
const esemenyek = (ics) => ics.split('BEGIN:VEVENT').slice(1);
const kibont = (ics) => ics.replace(/\r\n /g, '');

test('naptár: érvényes iCalendar, CRLF, legfeljebb 75 bájtos sorok', () => {
  const r = S.hataridoNaptar(adat, { ...alap, muszaki: '2027-05-20', evfordulo: '2015-01-01' });
  assert.ok(!r.hiba);
  assert.match(r.ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(r.ics, /END:VCALENDAR\r\n$/);
  assert.ok(!/[^\r]\n/.test(r.ics), 'csak CRLF sorvég');
  for (const sor of r.ics.split('\r\n')) assert.ok(new TextEncoder().encode(sor).length <= 75, `túl hosszú sor: ${sor}`);
  assert.equal((r.ics.match(/BEGIN:VEVENT/g) || []).length, (r.ics.match(/END:VEVENT/g) || []).length);
  // az ékezetes szöveg a sortörés után is egyben van
  assert.match(kibont(r.ics), /SUMMARY:Lejár a műszaki vizsga \(a Corolla\)/);
});

test('naptár: a biztosítási váltás határideje 31 nappal az évforduló előtt, öt évre, évente külön', () => {
  const r = S.hataridoNaptar(adat, { ...alap, evfordulo: '2015-01-01' });
  const k = r.esemenyek.filter((x) => x.tipus === 'kgfb').map((x) => x.nap);
  assert.deepEqual(k, ['2026-12-01', '2027-12-01', '2028-12-01', '2029-12-01', '2030-12-01']);
  // ha az idei határidő már elmúlt, a következő évvel kezd
  const r2 = S.hataridoNaptar(adat, { ...alap, evfordulo: '2020-12-10' });
  assert.equal(r2.esemenyek.find((x) => x.tipus === 'kgfb').nap, '2027-11-09');
  // február 29-i évforduló: nem szökőévben február 28. (a felmondás január 28.), szökőévben február 29. (január 29.)
  const r3 = S.hataridoNaptar(adat, { ...alap, evfordulo: '2024-02-29' });
  assert.deepEqual(r3.esemenyek.filter((x) => x.tipus === 'kgfb').map((x) => x.nap), ['2027-01-28', '2028-01-29', '2029-01-28', '2030-01-28', '2031-01-28']);
  assert.match(kibont(r.ics), /Az új biztosítási időszak 2027\. január 1-jén kezdődik/);
});

test('naptár: a gépjárműadó évente április 15-én; villanyautónál nincs', () => {
  const r = S.hataridoNaptar(adat, { ...alap });
  const g = r.esemenyek.find((x) => x.tipus === 'gjado');
  assert.equal(g.nap, '2027-04-15');
  assert.match(r.ics, /RRULE:FREQ=YEARLY/);
  assert.equal(S.hataridoNaptar(adat, { ...alap, ma: '2026-03-01' }).esemenyek.find((x) => x.tipus === 'gjado').nap, '2026-04-15');
  // a plug-in hibrid mentessége a forgalomba helyezéstől függ, amit nem kérdezünk: az emlékeztető bekerül
  assert.equal(S.hataridoNaptar(adat, { ...alap, hajtas: 'plugin', ma: '2026-03-01' }).esemenyek.find((x) => x.tipus === 'gjado').nap, '2026-04-15');
  const ev = S.hataridoNaptar(adat, { ...alap, hajtas: 'elektromos' });
  assert.ok(ev.hiba, 'villanyautó dátumok nélkül: nincs mit betenni');
  assert.ok(!S.hataridoNaptar(adat, { ...alap, hajtas: 'elektromos', muszaki: '2027-01-10' }).esemenyek.some((x) => x.tipus === 'gjado'));
});

test('naptár: hibás vagy lejárt dátum, emlékeztetők, állandó azonosító', () => {
  assert.match(S.hataridoNaptar(adat, { ...alap, muszaki: '2026-01-10' }).hiba, /elmúlt/);
  assert.match(S.hataridoNaptar(adat, { ...alap, muszaki: '2027-02-31' }).hiba, /dátum/);
  const r = S.hataridoNaptar(adat, { ...alap, muszaki: '2027-05-20' });
  const m = esemenyek(r.ics).find((x) => x.includes('UID:muszaki'));
  assert.match(m, /TRIGGER:-P30D/);
  assert.match(m, /TRIGGER:-P7D/);
  assert.match(m, /UID:muszaki-20270520-a-corolla@autozom\.hu/);
  assert.match(m, /DTSTART;VALUE=DATE:20270520\r\nDTEND;VALUE=DATE:20270521/);
  // a vessző és a pontosvessző szövegben escape-elve
  assert.ok(!/DESCRIPTION:[^\r]*[^\\],/.test(r.ics.replace(/\r\n /g, '')));
});

test('Az autóm: a dátumok mentődnek, és törléskor a mentett érték is törlődik', () => {
  const a = S.automKi('autom', { kw: '85', muszaki: '2027-05-20', evfordulo: '' }, { evfordulo: '2015-01-01' });
  assert.equal(a.muszaki, '2027-05-20');
  assert.equal(a.evfordulo, '');
  // más kalkulátor nem nyúl a dátumokhoz
  assert.ok(!('muszaki' in S.automKi('gepjarmuado', { kw: '85', gyartasiEv: '2019' })));
});

test('napRag: 1-jén, 2-án, 3-án, 5-én, 10-én, 21-én, 30-án', () => {
  assert.deepEqual([1, 2, 3, 5, 6, 8, 10, 13, 20, 21, 22, 30, 31].map(S.napRag), ['jén', 'án', 'án', 'én', 'án', 'án', 'én', 'án', 'án', 'én', 'én', 'án', 'én']);
  assert.equal(M.datumNapon('2026-12-02'), '2026. december 2-án');
});

test('NAV-üzemanyagár oldal: a cím a legfrissebb hónap ára, és új hónapnál magától vált', () => {
  const k = { cfg: { domain: 'https://autozom.hu', marka: 'autózom', eles: true }, adat, ma: '2026-11-18', ev: 2026, elonezet: false, verzio: 'x' };
  const { most, sorok } = navArAdatok(adat);
  const lf = S.legfrissebbHonap(adat);
  assert.equal(`${most.ev}-${most.h}`, `${lf.ev}-${lf.honap}`);
  const html = navArOldal(k);
  const b = sorok.find((x) => x.kulcs === 'benzin');
  assert.ok(html.includes(`<title>NAV üzemanyagár ${M.honapHu(most.ev, most.h)}: benzin ${b.ar} Ft`), 'a címben a legfrissebb ár');
  assert.ok(sorok.every((x) => x.valtozas === null || x.valtozas === x.ar - x.elozo));
  // egy új hónap a NAV-tól: a cím és a változás is követi
  const uj = structuredClone(adat);
  const [ev, h] = most.h === 12 ? [most.ev + 1, 1] : [most.ev, most.h + 1];
  uj.uzemanyag.evek[ev] ??= {};
  uj.uzemanyag.evek[ev][h] = { benzin: b.ar - 7, dizel: 700, keverek: 690, lpg: 360, cng: 880 };
  const html2 = navArOldal({ ...k, adat: uj });
  assert.ok(html2.includes(`<title>NAV üzemanyagár ${M.honapHu(ev, h)}: benzin ${b.ar - 7} Ft`));
  assert.ok(html2.includes('−7 Ft'));
  assert.match(html2, new RegExp(`<title>NAV üzemanyagár ${M.honapHu(ev, h)}`));
  assert.ok(!/undefined|NaN|\[object/.test(html2));
});

test('sitemap: a dátum csak valódi tartalomváltozáskor lesz mai', () => {
  const regi = '<p>Legutóbbi ellenőrzés: 2026. november 8.</p><time datetime="2026-11-08">x</time><link href="a.css?v=1a2b3c4d"><b>639 Ft</b>';
  const ujDatum = '<p>Legutóbbi ellenőrzés: 2026. november 18.</p><time datetime="2026-11-18">x</time><link href="a.css?v=9f9f9f9f"><b>639 Ft</b>';
  assert.equal(tartalomLenyomat(regi), tartalomLenyomat(ujDatum));
  assert.equal(lastmodDontes(regi, ujDatum, '2026-11-08', '2026-11-18'), '2026-11-08');
  assert.equal(lastmodDontes(regi, ujDatum.replace('639', '645'), '2026-11-08', '2026-11-18'), '2026-11-18');
  assert.equal(lastmodDontes(undefined, ujDatum, undefined, '2026-11-18'), '2026-11-18');
});
