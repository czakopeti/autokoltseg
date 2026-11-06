// Böngészős réteg: menü, űrlapok, élő elszámolás, megosztható link, mobilsáv.
// Semmi nem megy szerverre és semmit nem tárolunk.
import * as S from './szamitas.mjs';
import * as M from './megjelenites.mjs';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const csendes = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Menü ---------- */
const mg = $('.menu-gomb'), menu = $('.menu');
mg?.addEventListener('click', () => mg.setAttribute('aria-expanded', menu.classList.toggle('nyitva')));

/* ---------- Űrlap-segédek ---------- */
function ertekek(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else if (el.type === 'checkbox') o[el.name] = el.checked;
    else o[el.name] = el.value;
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
  try { history.replaceState(null, '', `${location.pathname}?${p}`); } catch { /* beágyazott nézet */ }
}
function urlbol() {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].length) return null;
  const o = {};
  for (const [k, v] of p) o[k] = v === '1' ? true : v;
  return o;
}
const kwErtek = (e) => (e.kwEgyseg === 'le' ? S.leKw(e.kw) : Number(e.kw));
const gjHajtas = (h) => (h === 'elektromos' ? 'elektromos' : h === 'plugin' ? 'plugin' : 'hagyomanyos');
const ilHajtas = (h) => (h === 'benzin' || h === 'dizel' ? 'hagyomanyos' : h);

/** kW ↔ lóerő váltáskor átszámoljuk a beírt értéket és a mértékegységet. */
function egysegValto(form) {
  const kw = form.elements.kw;
  if (!kw || !form.elements.kwEgyseg) return;
  const me = kw.closest('.beir')?.querySelector('.me');
  let elozo = ertekek(form).kwEgyseg;
  for (const r of form.elements.kwEgyseg) r.addEventListener('change', () => {
    const uj = ertekek(form).kwEgyseg;
    if (uj === elozo) return;
    const v = Number(kw.value);
    if (v > 0) kw.value = uj === 'le' ? Math.round(v * 1.36) : S.leKw(v);
    if (me) me.textContent = uj === 'le' ? 'LE' : 'kW';
    elozo = uj;
  });
}

/* ---------- Élő elszámolás ---------- */
let elozoOsszeg = null;
function frissit(panel, html, valtozott) {
  panel.innerHTML = html;
  const m = $('[data-osszeg]', panel);
  if (!m) return;
  const cel = Number(m.dataset.osszeg);
  if (valtozott && elozoOsszeg !== null && elozoOsszeg !== cel) {
    m.closest('.vegosszeg')?.classList.add('villan');
    if (!csendes) {
      const span = $('.ertek', m), tol = elozoOsszeg, t0 = performance.now();
      const lep = (t) => { const x = Math.min(1, (t - t0) / 380); span.textContent = M.fmt(tol + (cel - tol) * (1 - (1 - x) ** 3)); if (x < 1) requestAnimationFrame(lep); };
      requestAnimationFrame(lep);
    }
  }
  elozoOsszeg = cel;
  const mini = $('.mini');
  if (mini) { $('.mi', mini).textContent = $('.vegosszeg .mi', panel)?.textContent || ''; $('.mennyi', mini).textContent = `${M.fmt(cel)} Ft`; }
}

const KALK = {
  gyors: (adat, e, form) => {
    const b = { kw: kwErtek(e), gyartasiEv: e.gyartasiEv, hajtas: e.hajtas, cm3: e.cm3 };
    const q = (o) => `?${new URLSearchParams(o)}`;
    const linkek = {
      gjado: (ev) => form.dataset.gjado + q({ ev, kw: b.kw, gyartasiEv: b.gyartasiEv, hajtas: b.hajtas }),
      atiras: form.dataset.atiras + q({ kw: b.kw, gyartasiEv: b.gyartasiEv, hajtas: b.hajtas }),
      km: form.dataset.km + q({ uzemanyag: b.hajtas === 'hibrid' ? 'benzin' : b.hajtas, cm3: b.cm3 }),
    };
    return M.gyorsPanel(adat, b, { ev: adat.ev, ma: adat.ma, linkek });
  },
  gepjarmuado: (adat, e) => {
    const b = { ev: Number(e.ev), kw: kwErtek(e), gyartasiEv: Number(e.gyartasiEv), hajtas: gjHajtas(e.hajtas), phevRegi: !!e.phevRegi, evkozbenHonap: e.evkozben ? Number(e.evkozbenHonap) : 0, mozgaskorlatozott: !!e.mozgaskorlatozott };
    const r = S.gepjarmuado(adat, b);
    $$('[data-sav]').forEach((tr) => tr.classList.toggle('kiemelt', !r.hiba && !r.mentes && Number(tr.dataset.sav) === r.sav));
    return M.gjadoPanel(adat, r, b);
  },
  atiras: (adat, e) => {
    const datum = e.datum || new Date().toISOString().slice(0, 10);
    const b = { ev: Number(datum.slice(0, 4)), datum, kw: kwErtek(e), gyartasiEv: Number(e.gyartasiEv), hajtas: ilHajtas(e.hajtas), szerzes: e.szerzes, hanyad: Number(e.hanyad) || 100, behozott: e.honnan === 'kulfold', elsoForgalom: e.elsoForgalom, osztaly: e.osztaly, eredetiseg: !!e.eredetiseg, eredetisegDij: Number(e.eredetisegDij) || undefined, postazas: !!e.postazas, vetelar: Number(e.vetelar) || 0 };
    const r = S.atiras(adat, b);
    const il = r.illetek;
    $$('[data-ill]').forEach((td) => td.classList.toggle('kiemelt', !!il && !il.mentes && td.dataset.ill === `${il.sor}-${il.oszlop}`));
    return M.atirasPanel(adat, r, b);
  },
  km: (adat, e) => {
    const [ev, honap] = (e.honap || '').split('-').map(Number);
    const motor = e.uzemanyag === 'dizel' || (e.uzemanyag === 'plugin' && e.motor === 'dizel') ? 'dizel' : 'benzin';
    const vedettHat = ['benzin', 'dizel', 'plugin'].includes(e.uzemanyag);
    const vedettVan = vedettHat && !!S.navAr(adat, ev, honap, motor, true)?.vedett;
    const vd = $('[data-vedett]'); if (vd) vd.hidden = !vedettVan || e.mod === 'munka';
    if (e.mod === 'munka') { $$('[data-arhonap],[data-norma]').forEach((x) => x.classList.remove('kiemelt')); return M.munkaPanel(adat, S.munkabaJaras(adat, { km: e.tav, napok: e.napok })); }
    const b = { km: e.km, odaVissza: !!e.odaVissza, uzemanyag: e.uzemanyag, motor: e.motor, cm3: e.cm3, ev, honap, vedett: vedettVan && !!e.vedett, sajatAr: e.sajatAr };
    const r = S.kikuldetes(adat, b);
    const hatar = motor === 'dizel' ? [1500, 2000, 3000] : [1000, 1500, 2000, 3000];
    const i = hatar.findIndex((h) => Number(e.cm3) <= h);
    const kulcs = `${motor}-${i === -1 ? hatar.length : i}`;
    $$('[data-norma]').forEach((td) => td.classList.toggle('kiemelt', !r.hiba && e.uzemanyag !== 'elektromos' && td.dataset.norma === kulcs));
    $$('[data-arhonap]').forEach((tr) => tr.classList.toggle('kiemelt', tr.dataset.arhonap === `${ev}-${honap}`));
    return M.kmPanel(adat, r, b);
  },
};

function indit() {
  const form = $('form.forgalmi');
  if (!form) return;
  const tipus = form.dataset.kalk;
  const adat = JSON.parse($('#adat').textContent);
  const panel = $('.elsz-tartalom');
  const u = tipus === 'gyors' ? null : urlbol();
  if (u) {
    beallit(form, u);
    if (u.kwEgyseg === 'le') { const me = form.elements.kw?.closest('.beir')?.querySelector('.me'); if (me) me.textContent = 'LE'; }
  }
  if (form.dataset.maiDatum && !u?.[form.dataset.maiDatum]) {
    const d = form.elements[form.dataset.maiDatum];
    if (d) d.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date());
  }
  egysegValto(form);
  const szamol = (valtozott) => {
    lathatosag(form);
    frissit(panel, KALK[tipus](adat, ertekek(form), form), valtozott);
    if (valtozott && tipus !== 'gyors') urlbe(form);
  };
  form.addEventListener('input', () => szamol(true));
  form.addEventListener('change', () => szamol(true));
  form.addEventListener('submit', (ev) => ev.preventDefault());
  szamol(false);

  // Mobilon a lap alján is látszik az összeg, amíg az elszámolás nincs a képernyőn
  const mini = $('.mini'), elsz = $('.elszamolas');
  if (mini && elsz && 'IntersectionObserver' in window) {
    mini.hidden = false;
    new IntersectionObserver(([b]) => mini.classList.toggle('lathato', !b.isIntersecting && b.boundingClientRect.top > 0), { threshold: 0.1 }).observe(elsz);
  }

  const masol = $('[data-masol]');
  masol?.addEventListener('click', async () => {
    urlbe(form);
    try { await navigator.clipboard.writeText(location.href); masol.textContent = 'Link a vágólapon'; }
    catch { masol.textContent = 'Másold ki a címsorból'; }
    setTimeout(() => (masol.textContent = 'Link másolása'), 2200);
  });
  $('[data-nyomtat]')?.addEventListener('click', () => { try { print(); } catch { /* */ } });
}

indit();
