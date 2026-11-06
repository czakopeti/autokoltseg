// Autóköltség – böngészős réteg: téma, menü, felfedés, számlálók, műszerfal, kalkulátorok.
// Semmi nem megy szerverre; a böngésző csak a témát és (ha kéred) az autód adatait jegyzi meg.
import * as S from './szamitas.js';
import * as M from './megjelenites.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const csendes = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tarol = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};

/* ---------- Téma és menü ---------- */
function tema() {
  const gomb = $('.tema-gomb');
  if (!gomb) return;
  const frissit = () => gomb.setAttribute('aria-label', document.documentElement.dataset.tema === 'vilagos' ? 'Sötét mód' : 'Világos mód');
  frissit();
  gomb.addEventListener('click', () => {
    const uj = document.documentElement.dataset.tema === 'vilagos' ? 'sotet' : 'vilagos';
    document.documentElement.dataset.tema = uj;
    tarol.set('ak-tema', uj);
    frissit();
  });
}
function menu() {
  const g = $('.menu-gomb'), m = $('.menu');
  if (!g || !m) return;
  g.addEventListener('click', () => {
    const ny = m.classList.toggle('nyitva');
    g.setAttribute('aria-expanded', ny);
  });
}

/* ---------- Felfedés és számlálók ---------- */
function felfed() {
  const elemek = $$('.felfed');
  if (csendes || !('IntersectionObserver' in window)) { elemek.forEach((e) => e.classList.add('lathato')); return; }
  const io = new IntersectionObserver((bej) => bej.forEach((b) => { if (b.isIntersecting) { b.target.classList.add('lathato'); io.unobserve(b.target); } }), { rootMargin: '0px 0px -8% 0px' });
  elemek.forEach((e) => io.observe(e));
}

const elozoErtek = new WeakMap();
export function szamlal(el, cel, { tol } = {}) {
  const span = el.querySelector('.ertek') || el;
  const kezd = tol ?? elozoErtek.get(el) ?? 0;
  elozoErtek.set(el, cel);
  if (csendes || kezd === cel) { span.textContent = M.fmt(cel); return; }
  const ido = 750, t0 = performance.now();
  const lep = (t) => {
    const x = Math.min(1, (t - t0) / ido);
    const e = 1 - Math.pow(1 - x, 3);
    span.textContent = M.fmt(kezd + (cel - kezd) * e);
    if (x < 1) requestAnimationFrame(lep);
  };
  requestAnimationFrame(lep);
}

/* ---------- Műszerfal (főoldal) ---------- */
function muszerfal() {
  const m = $('.muszerfal');
  if (!m) return;
  const peldak = JSON.parse($('#muszerfal-adat').textContent);
  const iv = $('.iv', m), tuCsop = $('.tu-csop', m), szam = $('.kijelzo-szam', m), cimke = $('.kijelzo-cimke', m), egys = $('.kijelzo-szam small', m);
  const fulek = $$('.muszerfal-fulek button', m);
  const hossz = iv.getTotalLength();
  iv.style.strokeDasharray = hossz;
  let i = 0, auto = true;
  elozoErtek.set(szam, 0);
  const mutat = (n) => {
    i = n;
    const p = peldak[n];
    iv.style.strokeDashoffset = hossz * (1 - p.arany);
    tuCsop.style.transform = `rotate(${-120 + 240 * p.arany}deg)`;
    szamlal(szam, p.ertek);
    egys.textContent = p.egyseg;
    cimke.textContent = p.cimke;
    fulek.forEach((f, j) => f.setAttribute('aria-pressed', j === n));
  };
  fulek.forEach((f, j) => f.addEventListener('click', () => { auto = false; mutat(j); }));
  setTimeout(() => mutat(0), 250);
  if (!csendes) setInterval(() => { if (auto && !document.hidden) mutat((i + 1) % peldak.length); }, 5200);
}

/* ---------- Kalkulátorok: közös keret ---------- */
const PROFIL_KULCS = 'ak-auto';
const PROFIL_MEZOK = ['kw', 'gyartasiEv', 'hajtas', 'cm3', 'uzemanyag'];

function urlapErtekek(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else if (el.type === 'checkbox') o[el.name] = el.checked;
    else o[el.name] = el.value;
  }
  return o;
}
function urlapBeallit(form, ertekek) {
  for (const [k, v] of Object.entries(ertekek)) {
    const els = form.elements[k];
    if (!els) continue;
    const lista = els instanceof RadioNodeList ? [...els] : [els];
    for (const el of lista) {
      if (el.type === 'radio') el.checked = el.value === String(v);
      else if (el.type === 'checkbox') el.checked = v === true || v === '1' || v === 'true';
      else el.value = v;
    }
  }
}
function feltetelek(form) {
  const e = urlapErtekek(form);
  $$('[data-mutat]', form.closest('.kalk') || document).forEach((el) => {
    const felt = el.dataset.mutat.split('|');
    const lathato = felt.some((f) => {
      const [k, v] = f.split('=');
      return v === undefined ? !!e[k] && e[k] !== 'false' : String(e[k]) === v;
    });
    el.hidden = !lathato;
  });
}
function urlbe(form) {
  const e = urlapErtekek(form);
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(e)) {
    if (v === '' || v === false) continue;
    p.set(k, v === true ? '1' : v);
  }
  history.replaceState(null, '', `${location.pathname}?${p}`);
}
function urlbol() {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].length) return null;
  const o = {};
  for (const [k, v] of p) o[k] = v === '1' ? true : v;
  return o;
}

function kalkulator({ form, panel, szamol, megjelenit }) {
  const adat = JSON.parse($('#adat').textContent);
  const chip = $('.profil-chip');
  const tolt = () => {
    feltetelek(form);
    const b = szamol.bemenet(urlapErtekek(form), adat);
    const r = szamol.fut(adat, b);
    panel.innerHTML = megjelenit(adat, r, b);
    const fo = $('[data-szamlalo]', panel);
    if (fo) {
      const ertek = Number(fo.dataset.szamlalo);
      szamlal(fo, ertek, { tol: tolt.elozo ?? ertek });
      tolt.elozo = ertek;
    }
  };
  // Kezdőértékek: URL > elmentett autó > alapértelmezés
  const u = urlbol();
  const profil = tarol.get(PROFIL_KULCS);
  if (u) urlapBeallit(form, u);
  else if (profil) {
    urlapBeallit(form, profil);
    if (chip) { chip.hidden = false; $('.profil-leiras', chip).textContent = profilLeiras(profil); }
  }
  if (form.dataset.maiDatum) {
    const d = form.elements[form.dataset.maiDatum];
    if (d && !u?.[form.dataset.maiDatum]) d.value = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(new Date());
  }
  // Mobil: kis sáv a lap alján az aktuális eredménnyel
  const mini = $('.mini-eredmeny');
  const eredmenyPanel = panel.closest('.eredmeny');
  let panelLathato = true;
  const miniFrissit = () => {
    if (!mini) return;
    const fo = $('[data-szamlalo]', panel);
    mini.hidden = !fo;
    if (fo) $('.mini-szam', mini).textContent = `${M.fmt(Number(fo.dataset.szamlalo))} Ft`;
    mini.classList.toggle('lathato', !!fo && !panelLathato);
  };
  if (mini && 'IntersectionObserver' in window) {
    new IntersectionObserver(([b]) => { panelLathato = b.isIntersecting; miniFrissit(); }, { threshold: 0.15 }).observe(eredmenyPanel);
  }
  form.addEventListener('input', () => { tolt(); urlbe(form); miniFrissit(); });
  form.addEventListener('change', () => { tolt(); urlbe(form); miniFrissit(); });
  form.addEventListener('submit', (ev) => ev.preventDefault());
  tolt();
  setTimeout(miniFrissit, 0);

  // Eredmény alatti gombok
  const masol = $('[data-masol]');
  masol?.addEventListener('click', async () => {
    urlbe(form);
    try { await navigator.clipboard.writeText(location.href); masol.textContent = 'Link másolva'; }
    catch { masol.textContent = 'A címsorból másolhatod'; }
    setTimeout(() => (masol.textContent = 'Link másolása'), 2200);
  });
  $('[data-nyomtat]')?.addEventListener('click', () => print());
  const ment = $('[data-ment]');
  ment?.addEventListener('click', () => {
    const e = urlapErtekek(form);
    const regi = tarol.get(PROFIL_KULCS) || {};
    const uj = { ...regi };
    for (const k of PROFIL_MEZOK) if (e[k] !== undefined && e[k] !== '') uj[k] = e[k];
    if (e.kwEgyseg === 'le' && e.kw) uj.kw = String(S.leKw(e.kw));
    if (tarol.set(PROFIL_KULCS, uj)) {
      ment.textContent = 'Megjegyeztük ebben a böngészőben';
      if (chip) { chip.hidden = false; $('.profil-leiras', chip).textContent = profilLeiras(uj); }
    }
  });
  $('[data-profil-torol]')?.addEventListener('click', () => {
    tarol.del(PROFIL_KULCS);
    if (chip) chip.hidden = true;
    if (ment) ment.textContent = 'Megjegyzem ezt az autót';
  });
}

function profilLeiras(p) {
  const hajtas = { hagyomanyos: 'benzines/dízeles', hibrid: 'hibrid', plugin: 'plug-in hibrid', elektromos: 'elektromos' }[p.hajtas] || '';
  return ['Az autód adataival számolunk:', p.kw && `${p.kw} kW`, p.gyartasiEv && `${p.gyartasiEv}`, hajtas, p.cm3 && `${p.cm3} cm³`].filter(Boolean).join(' ');
}

const szamKw = (e) => (e.kwEgyseg === 'le' ? S.leKw(e.kw) : Number(e.kw));

/* ---------- Kalkulátor-definíciók ---------- */
const KALK = {
  gepjarmuado: {
    bemenet: (e) => ({
      ev: Number(e.ev), kw: szamKw(e), gyartasiEv: Number(e.gyartasiEv), hajtas: e.hajtas,
      phevRegi: !!e.phevRegi, evkozbenHonap: e.evkozben ? Number(e.evkozbenHonap) : 0, mozgaskorlatozott: !!e.mozgaskorlatozott,
    }),
    fut: S.gepjarmuado,
    panel: M.gjadoPanel,
    kiemel(r) {
      $$('[data-sav]').forEach((tr) => tr.classList.toggle('kiemelt', !r.hiba && !r.mentes && Number(tr.dataset.sav) === r.sav));
    },
  },
  atiras: {
    bemenet: (e) => {
      const datum = e.datum || new Date().toISOString().slice(0, 10);
      return {
        ev: Number(datum.slice(0, 4)), datum, kw: szamKw(e), gyartasiEv: Number(e.gyartasiEv), hajtas: e.hajtas, szerzes: e.szerzes,
        hanyad: Number(e.hanyad) || 100, behozott: e.honnan === 'kulfold', elsoForgalom: e.elsoForgalom, osztaly: e.osztaly,
        eredetiseg: !!e.eredetiseg, eredetisegDij: Number(e.eredetisegDij) || undefined, postazas: !!e.postazas, vetelar: Number(e.vetelar) || 0,
      };
    },
    fut: S.atiras,
    panel: M.atirasPanel,
    kiemel(r) {
      const il = r.illetek;
      $$('[data-ill]').forEach((td) => td.classList.toggle('kiemelt', !!il && !il.mentes && td.dataset.ill === `${il.sor}-${il.oszlop}`));
    },
  },
  km: {
    bemenet: (e, adat) => {
      const [ev, honap] = (e.honap || '').split('-').map(Number);
      const vedettVan = !!S.navAr(adat, ev, honap, e.uzemanyag === 'dizel' || (e.uzemanyag === 'plugin' && e.motor === 'dizel') ? 'dizel' : 'benzin', true)?.vedett;
      $$('[data-vedett]').forEach((el) => (el.hidden = !vedettVan || !['benzin', 'dizel', 'plugin'].includes(e.uzemanyag)));
      return { mod: e.mod, km: e.km, odaVissza: !!e.odaVissza, uzemanyag: e.uzemanyag, motor: e.motor, cm3: e.cm3, ev, honap, vedett: vedettVan && ['benzin', 'dizel', 'plugin'].includes(e.uzemanyag) && !!e.vedett, sajatAr: e.sajatAr, tav: e.tav, napok: e.napok };
    },
    fut: (adat, b) => (b.mod === 'munka' ? S.munkabaJaras(adat, { km: b.tav, napok: b.napok }) : S.kikuldetes(adat, b)),
    panel: (adat, r, b) => (b.mod === 'munka' ? M.munkaPanel(adat, r) : M.kmPanel(adat, r, b)),
    kiemel(r, b) {
      const ures = b.mod === 'munka' || r.hiba || b.uzemanyag === 'elektromos';
      $$('[data-norma]').forEach((td) => td.classList.toggle('kiemelt', !ures && td.dataset.norma === `${motorTipus(b)}-${normaSor(b)}`));
      $$('[data-arhonap]').forEach((tr) => tr.classList.toggle('kiemelt', b.mod !== 'munka' && tr.dataset.arhonap === `${b.ev}-${b.honap}`));
    },
  },
};
const motorTipus = (b) => (b.uzemanyag === 'dizel' || (b.uzemanyag === 'plugin' && b.motor === 'dizel') ? 'dizel' : 'benzin');
function normaSor(b) {
  const c = Number(b.cm3);
  const hatar = motorTipus(b) === 'dizel' ? [1500, 2000, 3000] : [1000, 1500, 2000, 3000];
  const i = hatar.findIndex((h) => c <= h);
  return i === -1 ? hatar.length : i;
}

function kalkInditas() {
  const form = $('form.kalk-urlap');
  if (!form) return;
  const def = KALK[form.dataset.kalk];
  const panel = $('.eredmeny-tartalom');
  kalkulator({
    form, panel,
    szamol: { bemenet: def.bemenet, fut: (adat, b) => { const r = def.fut(adat, b); def.kiemel?.(r, b); return r; } },
    megjelenit: def.panel,
  });
}

tema(); menu(); felfed(); muszerfal(); kalkInditas();
