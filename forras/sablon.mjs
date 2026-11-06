// Közös oldalkeret: fej, fejléc, lábléc, ikonok, linkkezelés (éles és előnézeti mód).
import { datumHu, fmt, honapHu } from './js/megjelenites.mjs';

export const IKON = {
  ado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  atiras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  km: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
  hold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};

export const LOGO_SVG = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#FFC83D"/><path d="M6.5 21.5a9.5 9.5 0 0 1 19 0" fill="none" stroke="#111316" stroke-width="2.6" stroke-linecap="round"/><g class="tu"><path d="M16 19 L16 9.5" stroke="#111316" stroke-width="2.6" stroke-linecap="round"/></g><circle cx="16" cy="19" r="2.6" fill="#111316"/></svg>`;

export const MENU = [
  { ut: 'gepjarmuado-kalkulator/', nev: 'Gépjárműadó' },
  { ut: 'atirasi-illetek-kalkulator/', nev: 'Átírás' },
  { ut: 'kilometerterites-kalkulator/', nev: 'Kilométertérítés' },
  { ut: 'forrasok/', nev: 'Források' },
];

/** Linkkészítő: élesben /ut/, előnézetben relatív útvonal index.html-lel (bármilyen statikus tárhelyen működik). */
export function linkelo(oldalUt, elonezet) {
  const melyseg = oldalUt ? oldalUt.split('/').filter(Boolean).length : 0;
  const elo = '../'.repeat(melyseg);
  return {
    l: (ut = '') => (elonezet ? `${elo}${ut}index.html` : `/${ut}`),
    a: (fajl) => (elonezet ? `${elo}assets/${fajl}` : `/assets/${fajl}`),
    gyoker: (fajl) => (elonezet ? `${elo}${fajl}` : `/${fajl}`),
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function oldal(k, { cim, leiras, ut, tartalom, jsonld = [], adatJson = null, kalkulator = false, extraFej = '' }) {
  const { cfg, elonezet, verzio } = k;
  const L = linkelo(ut, elonezet);
  const kanonikus = `${cfg.domain}/${ut}`;
  const teljesCim = ut ? `${cim} | ${cfg.marka}` : cim;
  const robots = cfg.eles ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="hu" data-tema="sotet">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(teljesCim)}</title>
<meta name="description" content="${esc(leiras)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${kanonikus}">
<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="${esc(cfg.marka)}">
<meta property="og:title" content="${esc(cim)}">
<meta property="og:description" content="${esc(leiras)}">
<meta property="og:url" content="${kanonikus}">
<meta property="og:image" content="${cfg.domain}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#111316">
<link rel="icon" href="${L.gyoker('favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${L.gyoker('apple-touch-icon.png')}">
<script>try{var t=JSON.parse(localStorage.getItem('ak-tema'));if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'vilagos':'sotet';document.documentElement.dataset.tema=t}catch(e){}</script>
<link rel="stylesheet" href="${L.a(`style.css?v=${verzio}`)}">
${extraFej}${ld}
</head>
<body>
<a class="ugras" href="#tartalom">Ugrás a tartalomra</a>
${fejlec(k, ut, L)}
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

function fejlec(k, ut, L) {
  const linkek = MENU.map((m) => `<a href="${L.l(m.ut)}"${m.ut === ut ? ' aria-current="page"' : ''}>${m.nev}</a>`).join('');
  return `<header class="fejlec">
<div class="wrap">
<a class="logo" href="${L.l('')}" aria-label="${esc(k.cfg.marka)} – főoldal">${LOGO_SVG}<span>${esc(k.cfg.marka)}</span></a>
<button class="menu-gomb" type="button" aria-expanded="false" aria-controls="fomenu" aria-label="Menü">${IKON.menu}</button>
<nav class="menu" id="fomenu" aria-label="Fő menü">${linkek}<button class="tema-gomb" type="button" aria-label="Világos mód">${IKON.hold}</button></nav>
</div>
</header>`;
}

function lablec(k, L) {
  const { adat, ma, cfg } = k;
  const al = adat.allapot;
  const ell = al.utolso_ellenorzes ? datumHu(al.utolso_ellenorzes) : datumHu(ma);
  return `<footer class="lablec">
<div class="wrap">
<div class="lablec-racs">
<div>
<a class="logo" href="${L.l('')}">${LOGO_SVG}<span>${esc(cfg.marka)}</span></a>
<p style="margin-top:16px">Ingyenes autós kalkulátorok hivatalos tételekkel. A számítás a böngésződben fut, a beírt adatokat nem küldjük el sehova.</p>
</div>
<div><h2>Kalkulátorok</h2><ul>
<li><a href="${L.l('gepjarmuado-kalkulator/')}">Gépjárműadó</a></li>
<li><a href="${L.l('atirasi-illetek-kalkulator/')}">Átírási illeték</a></li>
<li><a href="${L.l('kilometerterites-kalkulator/')}">Kilométertérítés</a></li>
</ul></div>
<div><h2>Tudnivalók</h2><ul>
<li><a href="${L.l('forrasok/')}">Források és frissítés</a></li>
<li><a href="${L.l('adatvedelem/')}">Adatvédelem</a></li>
<li><a href="${L.l('impresszum/')}">Impresszum</a></li>
</ul></div>
<div><h2>Adatok</h2><ul>
<li><a href="${L.l('kilometerterites-kalkulator/')}#nav-arak">NAV-üzemanyagárak</a></li>
<li><a href="${L.l('gepjarmuado-kalkulator/')}#tetelek">Gépjárműadó-tételek</a></li>
<li><a href="${L.l('atirasi-illetek-kalkulator/')}#tetelek">Illetéktételek</a></li>
</ul></div>
</div>
<div class="lablec-also">
<span>A számítások tájékoztató jellegűek, nem adótanácsadás. A fizetendő összeget a NAV határozata tartalmazza.</span>
<span>Adatok ellenőrizve: ${ell}</span>
</div>
</div>
</footer>`;
}

/** Az oldalak tetején lévő fej (morzsamenü, cím, bevezető, címkék). */
export function oldalfej(L, { morzsa, cim, bevezeto, cimkek = [] }) {
  const m = [`<li><a href="${L.l('')}">Főoldal</a></li>`, ...morzsa.map((x) => `<li${x.ut ? '' : ' aria-current="page"'}>${x.ut ? `<a href="${L.l(x.ut)}">${x.nev}</a>` : x.nev}</li>`)].join('');
  return `<section class="wrap"><div class="oldalfej">
<ol class="morzsa" aria-label="Morzsamenü">${m}</ol>
<h1 class="cim cim-1 sor-be">${cim}</h1>
<p class="bevezeto">${bevezeto}</p>
${cimkek.length ? `<div class="cimkek">${cimkek.map((c) => `<span class="cimke${c.sarga ? ' cimke-sarga' : ''}">${c.t}</span>`).join('')}</div>` : ''}
</div></section>`;
}

export function eredmenyPanel(elore) {
  return `<aside class="panel eredmeny" id="eredmeny" aria-label="Eredmény">
<div class="eredmeny-tartalom" aria-live="polite">${elore}</div>
<div class="eredmeny-lab">
<button class="gomb gomb-keret gomb-kicsi" type="button" data-masol>Link másolása</button>
<button class="gomb gomb-keret gomb-kicsi" type="button" data-ment>Megjegyzem ezt az autót</button>
<button class="szoveg-gomb" type="button" data-nyomtat>Nyomtatás</button>
</div>
</aside>
<a class="mini-eredmeny" href="#eredmeny" hidden><span class="mini-cimke">Eredmény</span><span class="mini-szam"></span><span class="mini-nyil" aria-hidden="true">↓</span></a>`;
}

export const profilChip = `<div class="profil-chip" hidden><span class="profil-leiras"></span><button type="button" data-profil-torol>Elfelejtés</button></div>`;

export function gyik(kerdesek) {
  return `<div class="gyik">${kerdesek.map((q) => `<details><summary>${q.k}</summary><div class="valasz">${q.v.map((p) => `<p>${p}</p>`).join('')}</div></details>`).join('')}</div>`;
}
export function gyikLd(kerdesek) {
  const tiszta = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: kerdesek.map((q) => ({ '@type': 'Question', name: tiszta(q.k), acceptedAnswer: { '@type': 'Answer', text: tiszta(q.v.join(' ')) } })) };
}
export function morzsaLd(cfg, elemek) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ nev: 'Főoldal', ut: '' }, ...elemek].map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.nev, item: `${cfg.domain}/${e.ut}` })) };
}
export function alkalmazasLd(cfg, nev, ut, leiras) {
  return { '@context': 'https://schema.org', '@type': 'WebApplication', name: nev, url: `${cfg.domain}/${ut}`, description: leiras, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', inLanguage: 'hu', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'HUF' } };
}

export function forrasLista(elemek) {
  return `<ul class="forrasok">${elemek.map((f) => `<li>${f.url ? `<a href="${f.url}" rel="noopener" target="_blank">${f.nev}</a>` : f.nev}${f.d ? `<small>${f.d}</small>` : ''}</li>`).join('')}</ul>`;
}

export function oldalsav(L, aktiv, adatSor) {
  const kapcs = [
    { ut: 'gepjarmuado-kalkulator/', nev: 'Gépjárműadó-kalkulátor' },
    { ut: 'atirasi-illetek-kalkulator/', nev: 'Átírási illeték kalkulátor' },
    { ut: 'kilometerterites-kalkulator/', nev: 'Kilométertérítés-kalkulátor' },
  ].filter((x) => x.ut !== aktiv);
  return `<aside class="oldalsav">
<div class="panel"><h3>Kapcsolódó</h3><ul>${kapcs.map((x) => `<li><a href="${L.l(x.ut)}">${x.nev}</a></li>`).join('')}</ul></div>
<div class="panel"><h3>Az adatok</h3>${adatSor}<a class="szoveg-gomb" style="justify-self:start;padding:0" href="${L.l('forrasok/')}">Hogyan frissülnek?</a></div>
</aside>`;
}

export { datumHu, fmt, honapHu, esc };
