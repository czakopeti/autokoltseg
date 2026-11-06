// Oldalkeret és űrlap-építőkockák: fejléc, lábléc, forgalmi-kártya mezői, elszámolás, pecsét, guilloche.
import { datumHu, datumRomai, fmt, honapHu } from './js/megjelenites.mjs';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const MENU = [
  { ut: 'gepjarmuado-kalkulator/', nev: 'Gépjárműadó' },
  { ut: 'atirasi-illetek-kalkulator/', nev: 'Átírás' },
  { ut: 'kilometerterites-kalkulator/', nev: 'Kilométertérítés' },
  { ut: 'forrasok/', nev: 'Források' },
];

/** Linkkészítő: élesben /ut/, előnézetben relatív útvonal index.html-lel. */
export function linkelo(oldalUt, elonezet) {
  const elo = '../'.repeat(oldalUt ? oldalUt.split('/').filter(Boolean).length : 0);
  return {
    l: (ut = '', q = '') => (elonezet ? `${elo}${ut}index.html${q}` : `/${ut}${q}`),
    a: (fajl) => (elonezet ? `${elo}assets/${fajl}` : `/assets/${fajl}`),
    gyoker: (fajl) => (elonezet ? `${elo}${fajl}` : `/${fajl}`),
  };
}

/* ---------- Grafikai elemek ---------- */

/** Biztonsági nyomatra emlékeztető rozetta (guilloche), determinisztikusan generálva. */
export function gilos() {
  const c = 210, utak = [];
  for (let k = 0; k < 22; k++) {
    const R = 70 + k * 6.2, a = 9 + (k % 4) * 2.2, n = 18 + (k % 3) * 6, f = k * 0.37;
    let d = '';
    for (let i = 0; i <= 360; i++) {
      const t = (i / 360) * Math.PI * 2;
      const r = R + a * Math.sin(n * t + f) + (a / 2.4) * Math.sin((n / 2) * t - f);
      d += `${i ? 'L' : 'M'}${(c + r * Math.cos(t)).toFixed(1)} ${(c + r * Math.sin(t)).toFixed(1)}`;
    }
    utak.push(`<path d="${d}Z"/>`);
  }
  return `<svg class="gilos" viewBox="0 0 420 420" aria-hidden="true" fill="none" stroke="currentColor" stroke-width=".6">${utak.join('')}</svg>`;
}

/** Körpecsét a dátummal: a NAV-tételekkel számolt eredmény jele. */
export function pecset(ma, ut = true) {
  const [ev] = ma.split('-');
  return `<svg class="pecset${ut ? ' ut' : ''}" viewBox="0 0 130 130" aria-hidden="true">
<defs><path id="pecset-ivek" d="M65 65 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0"/></defs>
<circle cx="65" cy="65" r="61" fill="none" stroke="currentColor" stroke-width="3"/>
<circle cx="65" cy="65" r="55" fill="none" stroke="currentColor" stroke-width="1.2"/>
<circle cx="65" cy="65" r="35" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text fill="currentColor" font-family="Public Sans, sans-serif" font-weight="700" font-size="10.5"><textPath href="#pecset-ivek" textLength="288" lengthAdjust="spacing">A NAV TÉTELEIVEL SZÁMOLVA ✶ ELLENŐRIZVE ✶</textPath></text>
<text x="65" y="64" text-anchor="middle" fill="currentColor" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="21">${ev}</text>
<text x="65" y="80" text-anchor="middle" fill="currentColor" font-family="Public Sans, sans-serif" font-weight="700" font-size="11">${datumRomai(ma)}</text>
</svg>`;
}

const JEGY = '<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="13.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="15" cy="15" r="9.5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M10 15.5l3.4 3.2L20.5 11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- Oldalkeret ---------- */

export function oldal(k, { cim, leiras, ut, tartalom, jsonld = [], adatJson = null }) {
  const { cfg, elonezet, verzio } = k;
  const L = linkelo(ut, elonezet);
  const kanonikus = `${cfg.domain}/${ut}`;
  const teljesCim = ut ? `${cim} | ${cfg.marka}` : cim;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(teljesCim)}</title>
<meta name="description" content="${esc(leiras)}">
<meta name="robots" content="${cfg.eles ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">
<link rel="canonical" href="${kanonikus}">
<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="${esc(cfg.marka)}">
<meta property="og:title" content="${esc(cim)}">
<meta property="og:description" content="${esc(leiras)}">
<meta property="og:url" content="${kanonikus}">
<meta property="og:image" content="${cfg.domain}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#E9EEE5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1C18" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${L.gyoker('favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${L.gyoker('apple-touch-icon.png')}">
<link rel="stylesheet" href="${L.a(`style.css?v=${verzio}`)}">
${ld}
</head>
<body>
<a class="ugras" href="#tartalom">Ugrás a tartalomra</a>
<header class="fejlec"><div class="keret">
<a class="jegy" href="${L.l('')}">${JEGY}<span>${esc(cfg.marka)}</span></a>
<button class="menu-gomb" type="button" aria-expanded="false" aria-controls="fomenu">Menü</button>
<nav class="menu" id="fomenu" aria-label="Fő menü">${MENU.map((m) => `<a href="${L.l(m.ut)}"${m.ut === ut ? ' aria-current="page"' : ''}>${m.nev}</a>`).join('')}</nav>
</div></header>
<main id="tartalom">
${tartalom(L)}
</main>
${lablec(k, L)}
${adatJson ? `<script type="application/json" id="adat">${JSON.stringify(adatJson)}</script>` : ''}
<script type="module" src="${L.a(`js/app.js?v=${verzio}`)}"></script>
</body>
</html>
`;
}

function lablec(k, L) {
  const { adat, ma, cfg } = k;
  const ell = adat.allapot.utolso_ellenorzes || ma;
  return `<footer class="lablec"><div class="keret">
<div>
<p>A számítások tájékoztató jellegűek, és nem helyettesítik az adótanácsadást. A ténylegesen fizetendő adót és illetéket a NAV határozata tartalmazza.</p>
<p>Az adatokat minden reggel összevetjük a NAV oldalával. Legutóbbi ellenőrzés: ${datumHu(ell)}</p>
</div>
<div><h2>Kalkulátorok</h2><ul>${MENU.slice(0, 3).map((m) => `<li><a href="${L.l(m.ut)}">${m.nev}</a></li>`).join('')}</ul></div>
<div><h2>${esc(cfg.marka)}</h2><ul>
<li><a href="${L.l('forrasok/')}">Források és frissítés</a></li>
<li><a href="${L.l('adatvedelem/')}">Adatvédelem</a></li>
<li><a href="${L.l('impresszum/')}">Impresszum</a></li>
</ul></div>
</div></footer>`;
}

export function oldalfej(L, { morzsa, cim, bevezeto, fo = false }) {
  const m = morzsa ? `<ol class="morzsa" aria-label="Hol vagy">${[`<li><a href="${L.l('')}">Főoldal</a></li>`, ...morzsa.map((x) => `<li aria-current="page">${x}</li>`)].join('')}</ol>` : '';
  return `<div class="keret oldalfej${fo ? ' fo' : ''}">${m}<h1>${cim}</h1>${bevezeto ? `<p class="bevezeto">${bevezeto}</p>` : ''}</div>`;
}

/* ---------- Űrlap-építőkockák ---------- */

export const kod = (k) => `<span class="kod${k ? '' : ' ures'}"${k ? ` title="A forgalmi engedély ${k} sora"` : ''} aria-hidden="true">${k || ''}</span>`;
export const sor = (k, belso, attr = '') => `<div class="sor"${attr}>${kod(k)}<div class="mezo">${belso}</div></div>`;

export function szamMezo({ id, cim, me = '', ertek = '', sugo = '', min = '', max = '', placeholder = '', szeles = false, extra = '' }) {
  return `<label for="${id}">${cim}</label><div class="beir${szeles ? ' szeles' : ''}"><input id="${id}" name="${id}" type="number" inputmode="numeric"${min !== '' ? ` min="${min}"` : ''}${max !== '' ? ` max="${max}"` : ''} value="${ertek}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}>${me ? `<span class="me">${me}</span>` : ''}</div>${extra}${sugo ? `<span class="sugo">${sugo}</span>` : ''}`;
}

export function negyzetek(name, cim, opciok, ertek) {
  const id = `${name}-c`;
  return `<span class="mezo-cim" id="${id}">${cim}</span><div class="negyzetek" role="radiogroup" aria-labelledby="${id}">${opciok.map(([v, t]) => `<label class="negyzet"><input type="radio" name="${name}" value="${v}"${String(v) === String(ertek) ? ' checked' : ''}><span class="n"></span>${t}</label>`).join('')}</div>`;
}

export function jelolo(name, cim, leiras = '', be = false, attr = '') {
  return `<label class="negyzet hosszu"${attr}><input type="checkbox" name="${name}"${be ? ' checked' : ''}><span class="n"></span><span class="tobb"><span>${cim}</span>${leiras ? `<small>${leiras}</small>` : ''}</span></label>`;
}

export function valaszto(id, cim, opciok, ertek, sugo = '') {
  return `<label for="${id}">${cim}</label><div class="valaszto"><select id="${id}" name="${id}">${opciok.map(([v, t]) => `<option value="${v}"${String(v) === String(ertek) ? ' selected' : ''}>${t}</option>`).join('')}</select></div>${sugo ? `<span class="sugo">${sugo}</span>` : ''}`;
}

export const egysegValto = `<div class="egyseg-valto" role="radiogroup" aria-label="Mértékegység"><label class="negyzet"><input type="radio" name="kwEgyseg" value="kw" checked><span class="n"></span>kW</label><label class="negyzet"><input type="radio" name="kwEgyseg" value="le"><span class="n"></span>lóerő</label></div>`;

export const HAJTASOK = [['benzin', 'Benzin'], ['dizel', 'Dízel'], ['hibrid', 'Hibrid'], ['plugin', 'Plug-in hibrid'], ['elektromos', 'Elektromos']];

/** A forgalmi-kártya kerete. */
export function forgalmi({ cim, al = '', tartalom, kalk, extra = '' }) {
  return `<form class="forgalmi" data-kalk="${kalk}" novalidate${extra}>${gilos()}<div class="forgalmi-fej"><h2>${cim}</h2>${al ? `<p>${al}</p>` : ''}</div>${tartalom}</form>`;
}

/** Az elszámolás kerete a pecséttel. */
export function elszamolas(k, belso, { cim = 'Elszámolás', gombok = true, labjegy = '' } = {}) {
  return `<section class="elszamolas" id="eredmeny" aria-labelledby="elsz-cim">
<div class="elsz-fej"><h2 id="elsz-cim">${cim}</h2><time datetime="${k.ma}">${datumHu(k.ma)}</time></div>
<div class="elsz-tartalom" aria-live="polite">${belso}</div>
${gombok ? '<div class="elsz-lab"><button class="szoveg-gomb" type="button" data-masol>Link másolása</button><button class="szoveg-gomb" type="button" data-nyomtat>Nyomtatás</button></div>' : labjegy ? `<div class="elsz-lab"><p class="kicsi">${labjegy}</p></div>` : ''}
${pecset(k.ma)}
</section>
<a class="mini" href="#eredmeny" hidden><span class="mi"></span><span class="mennyi"></span></a>`;
}

/* ---------- Tartalmi elemek ---------- */

export function gyik(kerdesek) {
  return `<div class="gyik">${kerdesek.map((q) => `<details><summary>${q.k}</summary><div class="valasz">${q.v.map((p) => `<p>${p}</p>`).join('')}</div></details>`).join('')}</div>`;
}
export function gyikLd(kerdesek) {
  const t = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: kerdesek.map((q) => ({ '@type': 'Question', name: t(q.k), acceptedAnswer: { '@type': 'Answer', text: t(q.v.join(' ')) } })) };
}
export function morzsaLd(cfg, elemek) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ nev: 'Főoldal', ut: '' }, ...elemek].map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.nev, item: `${cfg.domain}/${e.ut}` })) };
}
export function alkalmazasLd(cfg, nev, ut, leiras) {
  return { '@context': 'https://schema.org', '@type': 'WebApplication', name: nev, url: `${cfg.domain}/${ut}`, description: leiras, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', inLanguage: 'hu', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'HUF' } };
}
export function forrasLista(elemek) {
  return `<ul class="forrasok">${elemek.map((f) => `<li>${f.url ? `<a href="${f.url}" rel="noopener" target="_blank">${f.nev}</a>` : `<span>${f.nev}</span>`}${f.d ? `<small>${f.d}</small>` : ''}</li>`).join('')}</ul>`;
}
export function tovabb(L, aktiv) {
  const t = [['gepjarmuado-kalkulator/', 'Gépjárműadó-kalkulátor'], ['atirasi-illetek-kalkulator/', 'Átírási illeték kalkulátor'], ['kilometerterites-kalkulator/', 'Kilométertérítés-kalkulátor'], ['forrasok/', 'Honnan vannak a számok?']].filter(([u]) => u !== aktiv);
  return `<nav class="tovabb" aria-label="Kapcsolódó oldalak">${t.map(([u, n]) => `<a href="${L.l(u)}">${n}</a>`).join('')}</nav>`;
}

export { datumHu, fmt, honapHu };
