// Böngészős réteg: menü, űrlapok, élő elszámolás, mentett autó (csak kérésre), megosztható link, grafikon.
// Szerverre csak az megy, amit a látogató a visszajelzés-dobozban maga elküld.
import * as S from './szamitas.mjs';
import * as M from './megjelenites.mjs';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const csendes = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tarolo = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};
const AUTOM = 'autokoltseg-autom-v2';

/* ---------- Névtelen mérés ---------- */
// Csak darabszámok: melyik oldalon hányan kezdtek bele és jutottak eredményig, mentettek, osztottak meg.
// Se süti, se azonosító, se a beírt adatok; a böngészőben sem tárolunk hozzá semmit. Oldalbetöltésenként egy esemény egyszer.
const elkuldve = new Set();
function meres(esemeny) {
  if (elkuldve.has(esemeny) || location.protocol !== 'https:') return;
  elkuldve.add(esemeny);
  try { fetch('/api/meres', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ut: location.pathname, esemeny }) }).catch(() => {}); } catch { /* */ }
}
document.addEventListener('click', (ev) => { if (ev.target.closest?.('nav.tovabb a')) meres('tovabb'); });

/* ---------- Menü ---------- */
// Balról beúszó panel. A <dialog> kezeli a fókuszt és az Esc-et; a háttérre kattintva is bezárul.
const fg = $('.fiok-gomb'), fiok = $('#fiok');
if (fg && fiok?.showModal) {
  const zar = () => { fiok.classList.add('zarul'); setTimeout(() => { fiok.close(); fiok.classList.remove('zarul'); }, csendes ? 0 : 180); };
  fg.addEventListener('click', () => { fiok.showModal(); fg.setAttribute('aria-expanded', 'true'); });
  fiok.addEventListener('close', () => { fg.setAttribute('aria-expanded', 'false'); fg.focus(); });
  $('.fiok-zar', fiok)?.addEventListener('click', zar);
  fiok.addEventListener('click', (ev) => { if (ev.target === fiok) zar(); });
  fiok.addEventListener('cancel', (ev) => { ev.preventDefault(); zar(); });
}

/* ---------- Űrlap-segédek ---------- */
function ertekek(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; else o[el.name] ??= ''; }
    else if (el.type === 'checkbox') o[el.name] = el.checked;
    else o[el.name] = el.value.trim();
  }
  return o;
}
function beallit(form, e) {
  for (const [k, v] of Object.entries(e)) {
    const els = form.elements[k];
    if (!els) continue;
    for (const el of els instanceof RadioNodeList ? [...els] : [els]) {
      if (el.type === 'radio') el.checked = el.value === String(v);
      else if (el.type === 'checkbox') el.checked = v === true || v === '1';
      else el.value = v;
    }
  }
}
function lathatosag(form) {
  const e = ertekek(form);
  $$('[data-mutat]', form).forEach((el) => {
    el.hidden = !el.dataset.mutat.split('|').some((f) => {
      const [k, v] = f.split('=');
      return v === undefined ? e[k] === true : String(e[k]) === v;
    });
  });
}
function urlbe(form) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(ertekek(form))) if (v !== '' && v !== false) p.set(k, v === true ? '1' : v);
  try { history.replaceState(null, '', `${location.pathname}${[...p.keys()].length ? `?${p}` : ''}`); } catch { /* beágyazott nézet */ }
}
function urlbol() {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].length) return null;
  const o = {};
  for (const [k, v] of p) o[k] = v === '1' ? true : v;
  return o;
}
const szam = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));
const kwErtek = (e) => (e.kwEgyseg === 'le' ? S.leKw(e.kw) : szam(e.kw));
const gjHajtas = (h) => (h === 'elektromos' ? 'elektromos' : h === 'plugin' ? 'plugin' : 'hagyomanyos');
const ilHajtas = (h) => (h === 'benzin' || h === 'dizel' ? 'hagyomanyos' : h || 'hagyomanyos');

function egysegValto(form) {
  const kw = form.elements.kw;
  if (!kw || !form.elements.kwEgyseg) return;
  const me = kw.closest('.beir')?.querySelector('.me');
  let elozo = ertekek(form).kwEgyseg;
  for (const r of form.elements.kwEgyseg) r.addEventListener('change', () => {
    const uj = ertekek(form).kwEgyseg;
    if (uj === elozo) return;
    const v = szam(kw.value);
    if (v > 0) kw.value = uj === 'le' ? Math.round(v * 1.36) : S.leKw(v);
    if (me) me.textContent = uj === 'le' ? 'LE' : 'kW';
    elozo = uj;
  });
}

/* ---------- Élő elszámolás ---------- */
let elozoOsszeg = null;
function frissit(panel, html, valtozott) {
  // Ha semmi nem változott (például a mező elhagyásakor jövő „change” az „input” után), nem rajzoljuk újra:
  // különben az épp kattintott link (Következő lépés, forrásjelölés) kicserélődne a kattintás alatt.
  if (panel._utolso === html) return;
  panel._utolso = html;
  panel.innerHTML = html;
  const kesz = !panel.querySelector('.ures');
  const pecset = $('.pecset');
  // SVG-n nincs .hidden tulajdonság, ezért az attribútumot kezeljük
  if (pecset && kesz && pecset.hasAttribute('hidden')) { pecset.removeAttribute('hidden'); if (!csendes) pecset.classList.add('ut'); }
  $$('.g-vonal', panel).forEach((v) => !csendes && v.classList.add('rajzol'));
  const m = $('[data-osszeg]', panel);
  const mini = $('.mini');
  if (!m) { elozoOsszeg = null; if (mini) mini.dataset.van = ''; return; }
  const cel = Number(m.dataset.osszeg);
  if (valtozott && !mintaMutat && elozoOsszeg !== null && elozoOsszeg !== cel) {
    m.closest('.vegosszeg')?.classList.add('villan');
    if (!csendes) {
      const span = $('.ertek', m), tol = elozoOsszeg, t0 = performance.now();
      const lep = (t) => { const x = Math.min(1, (t - t0) / 380); span.textContent = M.fmt(tol + (cel - tol) * (1 - (1 - x) ** 3)); if (x < 1) requestAnimationFrame(lep); };
      requestAnimationFrame(lep);
    }
  }
  elozoOsszeg = cel;
  if (mini && mintaMutat) mini.dataset.van = '';
  else if (mini) { mini.dataset.van = '1'; $('.mi', mini).textContent = $('.vegosszeg .mi', panel)?.textContent || ''; $('.mennyi', mini).textContent = `${M.fmt(cel)} Ft`; }
}

const ures = (e, mezok) => mezok.every((k) => e[k] === '' || e[k] == null);

let osszevetR = null;
/** A grafikon a nyugta tényleges belső szélességéhez igazodik. */
function grafikonSzeles() {
  const el = document.querySelector('.elszamolas');
  if (!el) return 640;
  const st = getComputedStyle(el);
  return el.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
}
/* ---------- Minta: üres űrlapnál egy jelölt példaautó eredménye látszik ---------- */
const ALAP = { kw: '85', gyartasiEv: '2019', hajtas: 'benzin', cm3: '1498' };
const MINTAK = {
  gyors: { adat: ALAP, leiras: 'egy 2019-es, 85 kW-os, 1,5 literes benzines autó' },
  gepjarmuado: { adat: ALAP, leiras: 'egy 2019-es, 85 kW-os benzines autó' },
  atiras: { adat: ALAP, leiras: 'egy 2019-es, 85 kW-os benzines autó adásvétele' },
  km: { adat: { km: '120', odaVissza: true, uzemanyag: 'benzin', cm3: '1498' }, leiras: 'egy 120 km-es hivatali út oda-vissza, 1,5 literes benzines autóval' },
  munka: { adat: { tav: '18', napok: '20' }, leiras: 'napi 18 km-es út, havi 20 munkanap' },
  uti: { adat: { km: '120', odaVissza: true, uzemanyag: 'benzin', fogyasztas: '6,5' }, leiras: 'egy 120 km-es út oda-vissza, 6,5 literes benzines autóval', kerd: 'Írd be a saját utadat, és a minta helyett azzal számolunk.' },
  autom: { adat: { ...ALAP, fogyasztas: '6,5', km: '15000', biztositas: '150000', szerviz: '120000', gumi: '40000', ertek: '4500000' }, leiras: 'egy 2019-es, 85 kW-os benzines autó, 4,5 millió forintot ér, évi 15 000 km' },
  fenntartas: { adat: { ...ALAP, fogyasztas: '6,5', km: '15000', biztositas: '150000', szerviz: '120000', gumi: '40000', ertek: '4500000' }, leiras: 'egy 2019-es, 85 kW-os benzines autó, 4,5 millió forintot ér, évi 15 000 km' },
  phev: { adat: { kw: '135', gyartasiEv: '2022', regi: true, zold: true, parkolasHavi: '15000' }, leiras: 'egy 2022-es, 135 kW-os, zöld rendszámos plug-in hibrid, amellyel havonta 15 000 forint parkolást spórolsz Budapesten' },
  matrica: { adat: { napi: '3', tiznapos: '1', varmegyek: '1' }, leiras: 'évente három egynapos és egy tíznapos út, és rendszeres autópályázás egy vármegyében', kerd: 'Írd be a saját útjaidat, és a minta helyett azzal számolunk.' },
  kgfb: { adat: { evfordulo: `${new Date().getFullYear() + 1}-01-01`, osztaly: 'B10', karok: '0' }, leiras: 'január 1-jei évforduló, B10-es besorolás, kármentes év', kerd: 'Írd be a saját évfordulódat, és a minta helyett azzal számolunk.' },
  javitas: { adat: { a_gyartasiEv: '2003', a_hajtas: 'benzin', a_ertekMost: '1500000', a_javitas: '1000000', a_ertekJavitva: '2300000', a_fenntartas: '450000', c_ar: '3300000', c_gyartasiEv: '2016', c_hajtas: 'benzin', c_kw: '110', c_fenntartas: '300000', evek: '3' }, leiras: 'egy 2003-as autó egymilliós motorjavítás előtt, és egy 3,3 millió forintos, 2016-os másik autó, 3 évre', kerd: 'Írd be a saját számaidat, és a minta helyett azzal számolunk.' },
  cegautoado: { adat: { kw: '110', osztaly: 'euro56', gyartasiEv: '2021' }, leiras: 'egy 2021-es, 110 kW-os, Euro 6-os („15”) céges autó, egész évre', kerd: 'Írd be a saját autódat, és a minta helyett azzal számolunk.' },
  cegauto: { adat: { kw: '110', osztaly: 'euro56', gyartasiEv: '2021', uzemanyag: 'benzin', cm3: '1498', ertekvesztes: '900000', energia: '700000', fix: '400000', uzletiKm: '15000' }, leiras: 'egy 2021-es, 110 kW-os, 1,5 literes benzines autó évi 2 millió forint költséggel és 15 000 km üzleti úttal', kerd: 'Írd be a saját autódat és költségeidet, és a minta helyett azzal számolunk.' },
  hitel: { adat: { ar: '6000000', onero: '1500000', evek: '5', thm: '11,9', kw: '110', gyartasiEv: '2021', hajtas: 'benzin' }, leiras: 'egy 6 millió forintos, 2021-es benzines autó 1,5 millió önerővel, 5 évre, 11,9% THM-mel', kerd: 'Írd be a saját autódat és a bank ajánlatát, és a minta helyett azzal számolunk.' },
};
let mintaMutat = false;
function mintaval(tipus, adat, e, form) {
  const kulcs = tipus === 'km' && e.mod === 'munka' ? 'munka' : tipus;
  const m = tipus === 'osszevet' ? { adat: mintaOsszevet(adat), leiras: `${adat.pelda.a.nev} és ${adat.pelda.b.nev}, évi ${M.fmt(adat.pelda.km)} km, ${adat.pelda.evek} év` } : MINTAK[kulcs];
  if (!m) return M.uresPanel('Töltsd ki az űrlapot.');
  const be = { ...e };
  for (const [k, v] of Object.entries(m.adat)) if (be[k] === '' || be[k] == null || be[k] === false) be[k] = v;
  be.__minta = true;
  const html = KALK[tipus](adat, be, form);
  mintaMutat = true;
  return M.mintaJelzes(m.leiras, m.kerd) + html;
}
function mintaOsszevet(adat) {
  const p = adat.pelda, be = { km: String(p.km), evek: String(p.evek) };
  for (const [betu, a] of [['a', p.a], ['b', p.b]]) for (const [k, v] of Object.entries(a)) be[`${betu}_${k}`] = String(v);
  return be;
}

const KALK = {
  gyors: (adat, e, form) => {
    if (ures(e, ['kw', 'gyartasiEv'])) return mintaval('gyors', adat, e, form);
    const b = { kw: kwErtek(e), gyartasiEv: e.gyartasiEv, hajtas: e.hajtas || 'benzin', cm3: e.cm3 };
    // a minta adatai nem mennek át a részletes kalkulátorba: ott is üres űrlap fogad
    const q = (o) => (e.__minta ? '' : `?${new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null))}`);
    const linkek = {
      gjado: (ev) => form.dataset.gjado + q({ ev, kw: b.kw, gyartasiEv: b.gyartasiEv, hajtas: e.hajtas }),
      atiras: form.dataset.atiras + q({ kw: b.kw, gyartasiEv: b.gyartasiEv, hajtas: e.hajtas }),
      km: form.dataset.km + q({ uzemanyag: b.hajtas === 'hibrid' ? 'benzin' : b.hajtas, cm3: b.cm3 }),
    };
    return M.gyorsPanel(adat, b, { ev: adat.ev, ma: adat.ma, linkek });
  },
  gepjarmuado: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv'])) return mintaval('gepjarmuado', adat, e);
    const b = { ev: Number(e.ev), kw: kwErtek(e), gyartasiEv: szam(e.gyartasiEv), hajtas: gjHajtas(e.hajtas), phevRegi: !!e.phevRegi, valtozas: e.valtozas || '', evkozbenHonap: e.valtozas === 'uj' ? Number(e.evkozbenHonap) : 0, kivonasHonap: Number(e.kivonasHonap) || 12, mozgaskorlatozott: !!e.mozgaskorlatozott };
    const r = S.gepjarmuado(adat, b);
    $$('[data-sav]').forEach((tr) => tr.classList.toggle('kiemelt', !r.hiba && !r.mentes && Number(tr.dataset.sav) === r.sav));
    return r.hiba ? M.hianyPanel(r.hiba) : M.gjadoPanel(adat, r, b);
  },
  atiras: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv'])) return mintaval('atiras', adat, e);
    const datum = e.datum || new Date().toISOString().slice(0, 10);
    const b = { ev: Number(datum.slice(0, 4)), datum, kw: kwErtek(e), gyartasiEv: szam(e.gyartasiEv), hajtas: ilHajtas(e.hajtas), szerzes: e.szerzes, hanyad: szam(e.hanyad) || 100, behozott: e.honnan === 'kulfold', elsoForgalom: e.elsoForgalom, osztaly: e.osztaly, eredetiseg: !!e.eredetiseg, eredetisegDij: szam(e.eredetisegDij) || undefined, postazas: !!e.postazas, vetelar: szam(e.vetelar) || 0 };
    const r = S.atiras(adat, b);
    const il = r.illetek;
    $$('[data-ill]').forEach((td) => td.classList.toggle('kiemelt', !!il && !il.mentes && td.dataset.ill === `${il.sor}-${il.oszlop}`));
    return r.hiba ? M.hianyPanel(r.hiba) : M.atirasPanel(adat, r, b);
  },
  km: (adat, e) => {
    const [ev, honap] = (e.honap || '').split('-').map(Number);
    const motor = e.uzemanyag === 'dizel' || (e.uzemanyag === 'plugin' && e.motor === 'dizel') ? 'dizel' : 'benzin';
    const vedettVan = ['benzin', 'dizel', 'plugin'].includes(e.uzemanyag) && !!S.navAr(adat, ev, honap, motor, true)?.vedett;
    const vd = $('[data-vedett]'); if (vd) vd.hidden = !vedettVan || e.mod === 'munka';
    if (e.mod === 'munka') {
      $$('[data-arhonap],[data-norma]').forEach((x) => x.classList.remove('kiemelt'));
      if (ures(e, ['tav', 'napok'])) return mintaval('km', adat, e);
      const r = S.munkabaJaras(adat, { km: e.tav, napok: e.napok });
      return r.hiba ? M.hianyPanel(r.hiba) : M.munkaPanel(adat, r);
    }
    $$('[data-arhonap]').forEach((tr) => tr.classList.toggle('kiemelt', tr.dataset.arhonap === `${ev}-${honap}`));
    if (ures(e, ['km', 'uzemanyag', 'cm3'])) return mintaval('km', adat, e);
    if (ures(e, ['km']) || !e.uzemanyag) { $$('[data-norma]').forEach((x) => x.classList.remove('kiemelt')); return M.hianyPanel('Add meg a távolságot és az üzemanyagot is.'); }
    const b = { km: e.km, odaVissza: !!e.odaVissza, uzemanyag: e.uzemanyag, motor: e.motor, cm3: e.cm3, ev, honap, vedett: vedettVan && !!e.vedett, sajatAr: e.sajatAr };
    const r = S.kikuldetes(adat, b);
    const hatar = motor === 'dizel' ? [1500, 2000, 3000] : [1000, 1500, 2000, 3000];
    const i = hatar.findIndex((h) => szam(e.cm3) <= h);
    $$('[data-norma]').forEach((td) => td.classList.toggle('kiemelt', !r.hiba && e.uzemanyag !== 'elektromos' && td.dataset.norma === `${motor}-${i === -1 ? hatar.length : i}`));
    return r.hiba ? M.hianyPanel(r.hiba) : M.kmPanel(adat, r, b);
  },
  uti: (adat, e) => {
    const { ev, honap } = adat.lf;
    const uz = e.uzemanyag;
    const vedettVan = (uz === 'benzin' || uz === 'dizel') && !!S.navAr(adat, ev, honap, uz, true)?.vedett;
    const vd = $('[data-vedett]'); if (vd) vd.hidden = !vedettVan;
    if (ures(e, ['km', 'uzemanyag', 'fogyasztas', 'kwh'])) return mintaval('uti', adat, e);
    if (ures(e, ['km'])) return M.hianyPanel('Add meg a távolságot.');
    if (!uz) return M.hianyPanel('Válaszd ki, mivel megy az autó.');
    const fogy = uz === 'elektromos' ? e.kwh : e.fogyasztas;
    if (fogy === '' || fogy == null) return M.hianyPanel(`Add meg az átlagfogyasztást (${uz === 'elektromos' ? 'kWh' : 'liter'}/100 km).`);
    const b = { km: szam(e.km), odaVissza: !!e.odaVissza, uzemanyag: uz, fogyasztas: szam(fogy), ev, honap, vedett: vedettVan && !!e.vedett, toltes: e.toltes, sajatAr: szam(e.sajatAr), utasok: e.utasok === '' ? '' : szam(e.utasok), egyeb: szam(e.egyeb) || 0, alkalom: e.alkalom === '' ? '' : szam(e.alkalom), f: adat.f };
    const r = S.utikoltseg(adat, b);
    return r.hiba ? M.hianyPanel(r.hiba) : M.utikoltsegPanel(adat, r, b);
  },
  osszevet: (adat, e) => {
    const auto = (p) => {
      const h = e[`${p}_hajtas`] || 'benzin';
      return {
        nev: e[`${p}_nev`] || (p === 'a' ? 'Egyik autó' : 'Másik autó'), hajtas: h, ar: szam(e[`${p}_ar`]), kw: szam(e[`${p}_kw`]),
        fogyasztas: h === 'elektromos' ? szam(e[`${p}_kwh`]) : szam(e[`${p}_fogyasztas`]), kwh: szam(e[`${p}_kwh`]), villanyArany: szam(e[`${p}_villanyArany`]) || 0,
        szerviz: szam(e[`${p}_szerviz`]) || 0, biztositas: szam(e[`${p}_biztositas`]) || 0, eladasiAr: szam(e[`${p}_eladasiAr`]) || 0,
      };
    };
    if (ures(e, ['km', 'a_ar', 'b_ar', 'a_kw', 'b_kw'])) return mintaval('osszevet', adat, e);
    const f = { ...adat.f, maradvany: adat.szabalyok.maradvany, benzin: szam(e.benzinAr) || adat.f.benzin, dizel: szam(e.dizelAr) || adat.f.dizel, aram_kedv: szam(e.aramKedv) || adat.f.aram_kedv, aram_piaci: szam(e.aramPiaci) || adat.f.aram_piaci, tolto: szam(e.tolto) || adat.f.tolto, veszteseg: Number.isFinite(szam(e.veszteseg)) ? szam(e.veszteseg) : adat.f.veszteseg, otthoni: Number.isFinite(szam(e.otthoni)) ? Math.min(100, szam(e.otthoni)) : adat.f.otthoni, haztartas: e.haztartas };
    const r = S.osszehasonlitas(adat, { km: szam(e.km), evek: Number(e.evek) || 8, ceges: !!e.ceges, ev: adat.ev, f, autok: [auto('a'), auto('b')] });
    osszevetR = r.hiba ? null : r;
    return r.hiba ? M.hianyPanel(r.hiba) : M.osszehasonlitasPanel(adat, r, { szeles: grafikonSzeles() });
  },
  fenntartas: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv', 'fogyasztas', 'kwh', 'km'])) return mintaval('fenntartas', adat, e);
    const h = e.hajtas || 'benzin';
    const r = S.fenntartas(adat, { ev: adat.ev, kw: kwErtek(e), gyartasiEv: szam(e.gyartasiEv), hajtas: h, fogyasztas: h === 'elektromos' ? szam(e.kwh) : szam(e.fogyasztas), km: szam(e.km), biztositas: szam(e.biztositas), szerviz: szam(e.szerviz), gumi: szam(e.gumi), egyeb: szam(e.egyeb), ertek: szam(e.ertek), ertekVeg: szam(e.ertekVeg), tartja: szam(e.tartja), f: { ...adat.f, haztartas: '', maradvany: adat.szabalyok?.maradvany } });
    return r.hiba ? M.hianyPanel(r.hiba) : M.fenntartasPanel(adat, r, e);
  },
  szerzodes: (adat, e) => M.szerzodes(adat, e),
  kgfb: (adat, e) => {
    if (document.getElementById('evfordulo')?.validity?.badInput) return M.hianyPanel('Add meg az évforduló teljes dátumát: évet, hónapot és napot is.');
    if (ures(e, ['evfordulo'])) return mintaval('kgfb', adat, e);
    const ma = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date());
    const r = S.kgfb(adat, { evfordulo: e.evfordulo, ma, osztaly: e.osztaly, karok: Math.min(4, Number(e.karok) || 0), nap270: e.rovid !== true });
    return r.hiba ? M.hianyPanel(r.hiba) : M.kgfbPanel(adat, r);
  },
  javitas: (adat, e) => {
    if (ures(e, ['a_javitas', 'c_ar'])) return mintaval('javitas', adat, e);
    const n = (k) => szam(e[k]);
    const r = S.javitasVagyCsere(adat, { ev: adat.ev, datum: adat.ma, evek: n('evek') || 3, a: { gyartasiEv: n('a_gyartasiEv'), hajtas: e.a_hajtas || 'benzin', ertekMost: n('a_ertekMost') || 0, javitas: n('a_javitas'), ertekJavitva: n('a_ertekJavitva'), fenntartas: n('a_fenntartas') || 0 }, c: { ar: n('c_ar'), gyartasiEv: n('c_gyartasiEv'), hajtas: e.c_hajtas || 'benzin', kw: n('c_kw'), fenntartas: n('c_fenntartas') || 0 } });
    return r.hiba ? M.hianyPanel(r.hiba) : M.javitasPanel(adat, r);
  },
  cegautoado: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv']) && !e.osztaly) return mintaval('cegautoado', adat, e);
    const r = S.cegautoado(adat, { ev: Number(e.ev) || adat.ev, kw: kwErtek(e), osztaly: e.osztaly, gyartasiEv: szam(e.gyartasiEv), phevRegi: !!e.phevRegi, valtozas: e.valtozas || '', honap: Number(e.honap) || 1 });
    return r.hiba ? M.hianyPanel(r.hiba) : M.cegautoadoPanel(adat, r);
  },
  cegauto: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv', 'cm3', 'ertekvesztes', 'energia', 'fix', 'uzletiKm']) && !e.osztaly) return mintaval('cegauto', adat, e);
    const r = S.cegautoVagySajat(adat, { ev: Number(e.ev) || adat.ev, kw: kwErtek(e), osztaly: e.osztaly, gyartasiEv: szam(e.gyartasiEv), phevRegi: !!e.phevRegi, uzemanyag: e.uzemanyag || 'benzin', motor: e.uzemanyag === 'dizel' ? 'dizel' : 'benzin', cm3: szam(e.cm3), uzletiKm: szam(e.uzletiKm), ertekvesztes: szam(e.ertekvesztes), energia: szam(e.energia), fix: szam(e.fix), szocho: e.szocho !== '0', arEv: adat.lf.ev, arHonap: adat.lf.honap });
    return r.hiba ? M.hianyPanel(r.hiba) : M.cegautoPanel(adat, r);
  },
  phev: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv'])) return mintaval('phev', adat, e);
    const r = S.phev(adat, { kw: kwErtek(e), gyartasiEv: szam(e.gyartasiEv), regi: !!e.regi, zold: !!e.zold, ceges: !!e.ceges, parkolasHavi: szam(e.parkolasHavi) });
    return r.hiba ? M.hianyPanel(r.hiba) : M.phevPanel(adat, r, adat.ma);
  },
  matrica: (adat, e) => {
    if (ures(e, ['napi', 'tiznapos', 'havi', 'varmegyek'])) return mintaval('matrica', adat, e);
    const r = S.matrica(adat, { ev: Number(e.ev) || adat.ev, napi: szam(e.napi), tiznapos: szam(e.tiznapos), havi: szam(e.havi), varmegyek: szam(e.varmegyek), m1: !!e.m1 });
    return r.hiba ? M.hianyPanel(r.hiba) : M.matricaPanel(adat, r);
  },
  hitel: (adat, e) => {
    if (ures(e, ['ar', 'onero', 'evek', 'thm'])) return mintaval('hitel', adat, e);
    const r = S.autohitel(adat, { ar: szam(e.ar), onero: szam(e.onero), evek: szam(e.evek), thm: e.thm === '' ? '' : szam(e.thm), kw: kwErtek(e), gyartasiEv: szam(e.gyartasiEv), hajtas: e.hajtas || 'benzin', ev: adat.ev, datum: adat.ma });
    return r.hiba ? M.hianyPanel(r.hiba) : M.hitelPanel(adat, r);
  },
  autom: (adat, e) => {
    if (ures(e, ['kw', 'gyartasiEv'])) return mintaval('autom', adat, e);
    const h = e.hajtas || 'benzin';
    return M.automPanel(adat, { nev: e.nev, kw: kwErtek(e), gyartasiEv: szam(e.gyartasiEv), hajtas: h, cm3: szam(e.cm3), fogyasztas: h === 'elektromos' ? szam(e.kwh) : szam(e.fogyasztas), km: szam(e.km), biztositas: szam(e.biztositas), szerviz: szam(e.szerviz), gumi: szam(e.gumi), egyeb: szam(e.egyeb), ertek: szam(e.ertek) }, { ev: adat.ev, ma: adat.ma, f: { ...adat.f, haztartas: '', maradvany: adat.szabalyok?.maradvany } });
  },
};

/* ---------- A pecsét a források oldalára visz ---------- */
function pecsetLink() {
  const p = $('.pecset'), cel = $('.lablec a[href*="forrasok"]')?.href;
  if (!p || !cel) return;
  const menj = () => { location.href = cel; };
  p.addEventListener('click', menj);
  p.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); menj(); } });
}
pecsetLink();
// A jelölések linkjei a források oldalára mutatnak, a lábléc linkjéből vesszük a pontos címet.
M.forrasokHelye($('.lablec a[href*="forrasok"]')?.getAttribute('href'));

/* ---------- Hibajelzés: a levélbe a beírt adatok és az eredmény is bekerül ---------- */
/** Az eredménypanel fő sora szövegként (a hibajelzéshez), vagy üres, ha nincs eredmény. */
function eredmenySzoveg() {
  const panel = $('.elsz-tartalom');
  if (!panel) return '';
  const mi = $('.vegosszeg .mi', panel)?.textContent, ertek = $('[data-osszeg] .ertek', panel)?.textContent;
  return mi && ertek ? `${mi}: ${ertek} Ft` : '';
}
const vanMinta = () => Boolean($('.elsz-tartalom .minta-jelzes'));
$('[data-hibajelzes]')?.addEventListener('click', (ev) => {
  const a = ev.currentTarget, cim = a.dataset.cim;
  const e = eredmenySzoveg();
  const torzs = e
    ? `Szerintem ez az eredmény hibás:\n${e}${vanMinta() ? '\n(Ez a minta-autó eredménye volt.)' : ''}\n\nAz oldal a beírt adatokkal:\n${location.href}\n\nMit vártál volna, és miért?\n`
    : `Visszajelzés erről az oldalról:\n${location.href}\n\n`;
  a.href = `mailto:${cim}?subject=${encodeURIComponent(`${e ? 'Hibás összeg' : 'Visszajelzés'}: ${document.title}`)}&body=${encodeURIComponent(torzs)}`;
});

/* ---------- Visszajelzés: Igen / Nem, és Nem után pár szó ---------- */
// A szavazatot ebben a böngészőben megjegyezzük, hogy kétszer ne számoljuk. Név, IP-cím nem megy.
const NEM_KULDHETO = ['szerzodes', 'autom', 'gyors'];
function visszajelzes() {
  const d = $('[data-visszajelzes]');
  if (!d) return;
  const ut = d.dataset.ut, kulcs = `vj:${ut}`;
  const urlap = $('.vj-urlap', d), allapot = $('.vj-allapot', d), gombok = $$('[data-vj]', d);
  const kuld = async (b) => {
    const r = await fetch('/api/visszajelzes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ut, ...b }) });
    if (!r.ok) throw new Error(String(r.status));
  };
  const jelol = (ertek) => gombok.forEach((g) => g.setAttribute('aria-pressed', String(g.dataset.vj === ertek)));
  const levelLink = d.dataset.email ? ` vagy írj nekünk: <a href="mailto:${d.dataset.email}">${d.dataset.email}</a>` : '';
  const volt = tarolo.get(kulcs);
  if (volt) jelol(volt);
  gombok.forEach((g) => g.addEventListener('click', () => {
    const ertek = g.dataset.vj;
    if (tarolo.get(kulcs) !== ertek) { kuld({ ertek }).catch(() => {}); tarolo.set(kulcs, ertek); }
    jelol(ertek);
    if (ertek === 'fel') { urlap.hidden = true; allapot.textContent = 'Köszönjük, hogy jelezted!'; }
    else { urlap.hidden = false; allapot.textContent = ''; urlap.elements.szoveg.focus(); }
  }));
  urlap.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const szoveg = urlap.elements.szoveg.value.trim();
    if (szoveg.length < 3) { allapot.textContent = 'Írj pár szót arról, mi nem stimmel.'; urlap.elements.szoveg.focus(); return; }
    const b = { ertek: 'szoveg', szoveg, cim: document.title, web: urlap.elements.web.value };
    const f = $('form[data-kalk]');
    if (urlap.elements.adatok?.checked && f && !NEM_KULDHETO.includes(f.dataset.kalk)) {
      b.adatok = Object.fromEntries(Object.entries(ertekek(f)).filter(([, v]) => v !== '' && v !== false));
      b.eredmeny = eredmenySzoveg();
      b.minta = vanMinta();
    }
    const gomb = $('button[type="submit"]', urlap);
    gomb.disabled = true; gomb.textContent = 'Küldöm…';
    try {
      await kuld(b);
      urlap.reset(); urlap.hidden = true;
      allapot.textContent = 'Megkaptuk, köszönjük! Átnézzük, és ha hibát találunk, kijavítjuk.';
    } catch {
      allapot.innerHTML = `Most nem sikerült elküldeni. Próbáld újra kicsit később,${levelLink || ' köszönjük a türelmet'}.`;
    } finally { gomb.disabled = false; gomb.textContent = 'Elküldöm'; }
  });
}
visszajelzes();

/* ---------- Idősor-grafikon súgója (adatok/ oldal) ---------- */
function idosorSugo() {
  const fig = $('.grafikon.idosor');
  if (!fig) return;
  const svg = $('svg', fig), tipp = $('.g-tipp', fig), mutato = $('.g-mutato', svg);
  const n = Number(svg.dataset.n), bal = Number(svg.dataset.bal), jobb = Number(svg.dataset.jobb), W = Number(svg.dataset.w);
  const adatok = JSON.parse(svg.dataset.ertekek);
  const hu = (k) => { const [e, h] = k.split('-').map(Number); return `${e}. ${S.HONAPOK[h - 1]}`; };
  const mozog = (ev) => {
    const r = svg.getBoundingClientRect();
    const xv = ((ev.clientX - r.left) / r.width) * W;
    const i = Math.round(Math.min(1, Math.max(0, (xv - bal) / (W - bal - jobb))) * (n - 1));
    const x = bal + (i / (n - 1)) * (W - bal - jobb);
    mutato.setAttribute('x1', x); mutato.setAttribute('x2', x); mutato.setAttribute('visibility', 'visible');
    const [k, b, d, bv, dv] = adatok[i];
    tipp.innerHTML = `<div>${hu(k)}</div><div><i class="g-a-hatter"></i>Benzin: <b>${b} Ft</b>${bv ? ` (védett: ${bv} Ft)` : ''}</div><div><i class="g-b-hatter"></i>Dízel: <b>${d} Ft</b>${dv ? ` (védett: ${dv} Ft)` : ''}</div>`;
    tipp.hidden = false;
    tipp.style.left = `${Math.min(82, Math.max(18, (x / W) * 100))}%`;
  };
  svg.addEventListener('pointermove', mozog);
  svg.addEventListener('pointerleave', () => { tipp.hidden = true; mutato.setAttribute('visibility', 'hidden'); });
}
idosorSugo();

/* ---------- Mentett autó: csak ha kéred, és csak gombnyomásra töltjük be ---------- */
const HAJTAS_SZO = { benzin: 'benzines', dizel: 'dízeles', hibrid: 'hibrid', plugin: 'plug-in hibrid', elektromos: 'elektromos' };
function automLeiras(a) { return [a.nev, a.kw && `${a.kw} kW`, a.gyartasiEv, HAJTAS_SZO[a.hajtas]].filter(Boolean).join(', '); }
function automBekotes(form, szamol) {
  const sav = $('[data-autom]', form), ment = $('[data-autom-ment]', form);
  if (!sav && !ment) return;
  const kk = form.dataset.kalk;
  const mentFelirat = ment?.textContent;
  const mutat = () => { const a = tarolo.get(AUTOM); if (sav) { sav.hidden = !a; if (a) $('[data-autom-nev]', sav).textContent = automLeiras(a); } };
  mutat();
  $('[data-autom-betolt]', form)?.addEventListener('click', (ev) => {
    const a = tarolo.get(AUTOM); if (!a) return;
    beallit(form, S.automBe(kk, a));
    const me = form.elements.kw?.closest('.beir')?.querySelector('.me'); if (me) me.textContent = 'kW';
    if (ev.isTrusted) meres('indit');
    szamol(true);
  });
  $('[data-autom-torol]', form)?.addEventListener('click', () => { tarolo.del(AUTOM); mutat(); if (kk === 'autom') { form.reset(); szamol(true); } });
  // Az „Az autóm” lapon a mentett autó magától betöltődik: ezért mentetted el. Máshol csak gombnyomásra.
  if (kk === 'autom' && tarolo.get(AUTOM)) $('[data-autom-betolt]', form)?.click();
  ment?.addEventListener('click', () => {
    const regi = tarolo.get(AUTOM) || {};
    const a = S.automKi(kk, ertekek(form), regi);
    const visszaall = () => setTimeout(() => (ment.textContent = mentFelirat), 2200);
    if (!a.kw && !a.gyartasiEv && !a.fogyasztas && !a.kwh) { ment.textContent = 'Előbb add meg az autó adatait'; visszaall(); return; }
    if (tarolo.set(AUTOM, { ...regi, ...a })) { meres('mentes'); ment.textContent = 'Elmentve'; mutat(); visszaall(); }
  });
}

/* ---------- Grafikon: célkereszt és súgó ---------- */
function grafikonSugo(panel, adat) {
  const svg = $('.grafikon svg', panel), tipp = $('.g-tipp', panel);
  if (!svg || !tipp || svg._kotve) return;
  svg._kotve = true;
  const N = Number(svg.dataset.honapok), bal = Number(svg.dataset.bal), jobb = Number(svg.dataset.jobb), W = Number(svg.dataset.w);
  const mutato = $('.g-mutato', svg);
  const nevek = $$('.g-jelmagyarazat', panel).map((x) => x.textContent);
  const ertekek2 = panel._r;
  const mozog = (ev) => {
    const r = svg.getBoundingClientRect();
    const xv = ((ev.clientX - r.left) / r.width) * W;
    const m = Math.round(Math.min(1, Math.max(0, (xv - bal) / (W - bal - jobb))) * N);
    const x = bal + (m / N) * (W - bal - jobb);
    mutato.setAttribute('x1', x); mutato.setAttribute('x2', x); mutato.setAttribute('visibility', 'visible');
    const sorok = ertekek2.autok.map((a, i) => `<div><i style="background:var(--sor-${i ? 'b' : 'a'})"></i>${nevek[i] ?? a.nev}: <b>${M.fmt(a.havi[m])} Ft</b></div>`).join('');
    tipp.innerHTML = `<div>${m === 0 ? 'Vásárláskor' : `${M.tized(m / 12, 1)} év után`}</div>${sorok}`;
    tipp.hidden = false;
    tipp.style.left = `${(x / W) * 100}%`;
  };
  const el = () => { tipp.hidden = true; mutato.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', mozog);
  svg.addEventListener('pointerleave', el);
}

/* ---------- LE–kW átváltó: a két mező egymást frissíti ---------- */
function lekw(form) {
  const le = form.elements.le, kw = form.elements.kwAt, ki = $('[data-lekw-ki]');
  const tiz = (x) => new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 }).format(x);
  const ir = (forras) => {
    const v = szam(forras.value);
    if (!(v > 0)) { (forras === le ? kw : le).value = ''; if (ki) ki.textContent = ''; return; }
    if (forras === le) { kw.value = String(Math.round(v * 0.73549875 * 10) / 10).replace('.', ','); if (ki) ki.innerHTML = `${tiz(v)} lóerő = <b>${tiz(v * 0.73549875)} kW</b>. Kerekítve ${Math.round(v / 1.35962)} kW.`; }
    else { le.value = String(Math.round(v * 1.35962 * 10) / 10).replace('.', ','); if (ki) ki.innerHTML = `${tiz(v)} kW = <b>${tiz(v * 1.35962)} lóerő</b>.`; }
  };
  le.addEventListener('input', () => ir(le));
  kw.addEventListener('input', () => ir(kw));
  form.addEventListener('submit', (ev) => ev.preventDefault());
}

/* ---------- Megosztott link ---------- */
// Aki megosztott linket nyit, a küldő adataival látja a számítást. Ezt kiírjuk, és egy gombbal üresre állítható.
function megosztottJelzes(form) {
  const j = document.createElement('div');
  j.className = 'megosztva';
  j.setAttribute('role', 'note');
  j.innerHTML = '<p><strong>Ezt a számítást megosztották veled.</strong> A küldő adataival látod. Írd át a saját adataidra, vagy <button class="szoveg-gomb" type="button">kezdd üres űrlappal</button>.</p>';
  form.querySelector('.forgalmi-fej')?.after(j);
  const el = () => j.remove();
  $('button', j).addEventListener('click', () => {
    el();
    form.reset();
    try { history.replaceState(null, '', location.pathname); } catch { /* */ }
    form.dispatchEvent(new Event('input'));
    form.querySelector('input:not([type=hidden]), select')?.focus();
  });
  form.addEventListener('input', (ev) => { if (ev.isTrusted) el(); }, { once: false });
}

/* ---------- Indítás ---------- */
function indit() {
  const form = $('form[data-kalk]');
  if (!form) return;
  const tipus = form.dataset.kalk;
  if (tipus === 'lekw') return lekw(form);
  const adat = JSON.parse($('#adat').textContent);
  const panel = $('.elsz-tartalom') || $('.szerzodes-elonezet');
  const u = tipus === 'gyors' || tipus === 'autom' ? null : urlbol();
  if (u) {
    if (u.evkozben === true && !u.valtozas) u.valtozas = 'uj'; // régi megosztott linkek
    beallit(form, u);
    if (u.megosztva) megosztottJelzes(form);
    if (u.kwEgyseg === 'le') { const me = form.elements.kw?.closest('.beir')?.querySelector('.me'); if (me) me.textContent = 'LE'; }
  }
  if (form.dataset.maiDatum && !u?.[form.dataset.maiDatum]) {
    const d = form.elements[form.dataset.maiDatum];
    if (d && !d.value) d.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date());
  }
  egysegValto(form);
  const utak = (() => { try { return JSON.parse($('#utak')?.textContent || '{}'); } catch { return {}; } })();
  // Csak valódi eredmény után (nem minta, nem hiányzó adat), a már beírt adatokkal. A KALK hívása előbb fut, ezért a mintaMutat már friss.
  const kovetkezo = (html) => (mintaMutat || !html.includes('data-osszeg') ? '' : M.kovetkezoBlokk(S.kovetkezoLepesek(tipus, ertekek(form)), utak));
  panel?.addEventListener('click', (ev) => { if (ev.target.closest?.('[data-kovetkezo]')) meres('kovetkezo'); });
  const szamol = (valtozott) => {
    lathatosag(form);
    mintaMutat = false;
    if (tipus === 'osszevet') {
      // a grafikon súgójához a nyers eredmény is kell
      const html = KALK.osszevet(adat, ertekek(form));
      frissit(panel, html + kovetkezo(html), valtozott);
      if (osszevetR && panel.querySelector('.grafikon')) { panel._r = osszevetR; grafikonSugo(panel, adat); }
    } else if (tipus === 'szerzodes') {
      panel.innerHTML = KALK.szerzodes(adat, ertekek(form));
    } else {
      const html = KALK[tipus](adat, ertekek(form), form);
      frissit(panel, html + kovetkezo(html), valtozott);
    }
    // Eredményig jutott: valódi (nem minta) összeg látszik, és előtte maga írt be valamit
    if (valtozott && elkuldve.has('indit') && !mintaMutat && panel.querySelector('[data-osszeg]')) meres('kesz');
    // Az „Az autóm” lap adatai (név, biztosítás) nem kerülnek a linkbe és a böngészési előzményekbe
    if (valtozott && !['gyors', 'szerzodes', 'autom'].includes(tipus)) urlbe(form);
  };
  form.addEventListener('input', (ev) => { if (ev.isTrusted) meres('indit'); szamol(true); });
  form.addEventListener('change', (ev) => { if (ev.isTrusted) meres('indit'); szamol(true); });
  form.addEventListener('submit', (ev) => ev.preventDefault());
  if (tipus === 'osszevet') {
    // keskeny képernyőn más arányú grafikon kell, hogy a feliratok olvashatók maradjanak
    let utolso = grafikonSzeles();
    addEventListener('resize', () => { const most = grafikonSzeles(); if (Math.abs(most - utolso) > 40) { utolso = most; szamol(false); } });
  }
  automBekotes(form, szamol);
  szamol(false);

  // Példa (csak gombnyomásra)
  $('[data-pelda]')?.addEventListener('click', () => {
    const p = adat.pelda;
    const be = { km: p.km, evek: p.evek };
    for (const [betu, a] of [['a', p.a], ['b', p.b]]) for (const [k, v] of Object.entries(a)) be[`${betu}_${k}`] = v;
    beallit(form, be);
    szamol(true);
    $('#eredmeny')?.scrollIntoView({ behavior: csendes ? 'auto' : 'smooth', block: 'start' });
  });
  $('[data-urit]')?.addEventListener('click', () => { form.reset(); szamol(true); });

  // Mobilon a lap alján is látszik az összeg, amíg az elszámolás nincs a képernyőn
  const mini = $('.mini'), elsz = $('.elszamolas');
  if (mini && elsz && 'IntersectionObserver' in window) {
    mini.hidden = false;
    new IntersectionObserver(([b]) => mini.classList.toggle('lathato', mini.dataset.van === '1' && !b.isIntersecting && b.boundingClientRect.top > 0), { threshold: 0.1 }).observe(elsz);
  }

  // Megosztás: a link a beírt adatokat viszi, és jelzi, hogy megosztott számítás. Telefonon a rendszer megosztó menüje.
  const masol = $('[data-masol]');
  const masolFelirat = masol?.textContent;
  masol?.addEventListener('click', async () => {
    meres('megosztas');
    let link = `${location.origin}${location.pathname}`;
    if (!NEM_KULDHETO.includes(tipus)) {
      urlbe(form);
      const u = new URL(location.href);
      if (u.search) u.searchParams.set('megosztva', '1');
      link = u.toString();
    }
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: document.title, url: link }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(link); masol.textContent = 'Link a vágólapon, beillesztheted'; }
    catch { masol.textContent = 'Másold ki a címsorból'; }
    setTimeout(() => (masol.textContent = masolFelirat), 2600);
  });
  $$('[data-nyomtat]').forEach((g) => g.addEventListener('click', () => { meres('nyomtat'); try { print(); } catch { /* */ } }));
}

indit();
