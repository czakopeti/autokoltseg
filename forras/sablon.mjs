// Oldalkeret és űrlap-építőkockák: fejléc, lábléc, forgalmi-kártya mezői, elszámolás, pecsét, guilloche.
import { datumHu, datumRomai, fmt, honapHu } from './js/megjelenites.mjs';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const MENU = [
  { ut: 'gepjarmuado-kalkulator/', nev: 'Gépjárműadó' },
  { ut: 'atirasi-illetek-kalkulator/', nev: 'Átírás' },
  { ut: 'benzin-vagy-villany/', nev: 'Benzin vagy villany' },
  { ut: 'autofenntartas-kalkulator/', nev: 'Fenntartás' },
  { ut: 'autom/', nev: 'Az autóm' },
];
/**
 * Az oldal szerkezete: minden tartalmi oldal pontosan egy csoportban. Ebből épül a főoldal, a balról beúszó menü,
 * a lábléc, az llms.txt és az oldalak alján a „Kapcsolódó oldalak” sáv, így mindenhol ugyanaz a rend.
 * Az elemek: [cím, név, rövid mondat a menübe, és ha kell, a hosszabb név a főoldalra és az llms.txt-be].
 */
export const CSOPORTOK = [
  { id: 'vasarlas', cim: 'Autót veszel vagy eladsz', bevezeto: 'Mennyibe kerül valójában az autó, amelyiket kinézted, és mi kell az adásvételhez.', elemek: [
    ['atirasi-illetek-kalkulator/', 'Átírás', 'Illeték, vizsgálat, okmányok', 'Átírási illeték és költségek'],
    ['benzin-vagy-villany/', 'Benzin vagy villany', 'Két autó teljes költsége, megtérülés'],
    ['autohitel-kalkulator/', 'Autóhitel', 'Törlesztő és az autó valódi költsége'],
    ['megjavitsam-vagy-csereljem/', 'Javítás vagy csere', 'Megjavítsam, vagy vegyek másikat?'],
    ['adasveteli-szerzodes-minta/', 'Adásvételi szerződés', 'Kitölthető, nyomtatható minta'],
  ] },
  { id: 'fenntartas', cim: 'Fenntartod az autód', bevezeto: 'Amit évente, havonta vagy egy-egy útnál fizetsz, és a határidők, amelyekre figyelned kell.', elemek: [
    ['gepjarmuado-kalkulator/', 'Gépjárműadó', 'Mennyit fizetsz idén és jövőre'],
    ['autofenntartas-kalkulator/', 'Fenntartás', 'Mennyibe kerül havonta az autód'],
    ['kotelezo-biztositas-valtas/', 'Kötelező biztosítás', 'Meddig mondhatod fel, és a bonus-malus'],
    ['fedezetlensegi-dij-kalkulator/', 'Fedezetlenségi díj', 'Ha egy ideig nem volt kötelező biztosításod'],
    ['muszaki-vizsga-kalkulator/', 'Műszaki vizsga', 'Mennyibe kerül, és meddig lesz érvényes'],
    ['autopalya-matrica-kalkulator/', 'Autópálya-matrica', 'Melyik matrica a legolcsóbb neked'],
    ['utikoltseg-kalkulator/', 'Útiköltség', 'Mennyibe kerül egy út autóval'],
    ['gyorshajtas-birsag-kalkulator/', 'Gyorshajtási bírság', 'Mennyi a bírság, és hány pont jár'],
    ['plug-in-hibrid-2027/', 'Plug-in hibrid 2027', 'Lejár a mentesség, cserélni kell a rendszámot'],
    ['vetlen-baleset/', 'Vétlen baleset', 'Mi jár a biztosítótól, és meddig'],
    ['autom/', 'Az autóm', 'A mentett autód minden költsége egy lapon'],
  ] },
  { id: 'vallalkozas', cim: 'Vállalkozás és üzleti út', bevezeto: 'Cégautóadó, kilométertérítés és a hozzájuk tartozó nyomtatványok, vállalkozóknak és könyvelőknek.', elemek: [
    ['vallalkozoknak/', 'Autó a vállalkozásban', 'Mi vonatkozik a kft.-re és az egyéni vállalkozóra'],
    ['kilometerterites-kalkulator/', 'Kilométertérítés', 'Hivatali út és munkába járás'],
    ['utnyilvantartas-kikuldetesi-rendelveny/', 'Útnyilvántartás', 'És kiküldetési rendelvény, nyomtatható', 'Útnyilvántartás és kiküldetési rendelvény'],
    ['nav-uzemanyagar/', 'NAV-üzemanyagár', 'Az e havi elszámolási ár, számla nélkül'],
    ['cegautoado-kalkulator/', 'Cégautóadó', 'Havonta és évente, a gépjárműadó levonásával'],
    ['cegauto-vagy-sajat-auto/', 'Cégautó vagy saját autó', 'Cégautóadó vagy adómentes km-térítés'],
  ] },
  { id: 'adatok', cim: 'Adatok és eszközök', bevezeto: 'A NAV-tételek és az üzemanyagárak táblázatban, letölthetően, Excelbe és programba is.', elemek: [
    ['adatok/', 'Adatok és idősorok', 'Táblázat, CSV, Excel, JSON'],
    ['le-kw-atvaltas/', 'LE–kW átváltás', 'Hány kW egy lóerő'],
    ['valtozasok/', 'Mi változott?', 'Új NAV-tételek és havi árak, dátummal'],
    ['forrasok/', 'Honnan vannak a számok?', 'Minden tétel forrása és dátuma'],
  ] },
];
/** Az oldalról szóló, nem tartalmi oldalak: csak a menüben és a láblécben. */
export const OLDALROL = [
  ['rolunk/', 'Rólunk és szerkesztői elvek', ''],
  ['adatvedelem/', 'Adatvédelem', ''],
  ['impresszum/', 'Impresszum', ''],
];
/** A balról beúszó menü: a csoportok, és a végén az oldalról szóló lapok. */
export const FIOK = [...CSOPORTOK, { id: 'oldalrol', cim: 'Az oldalról', elemek: OLDALROL.slice(0, 1) }];
/** Melyik csoportba tartozik egy oldal (a „Kapcsolódó oldalak” sávhoz). */
export const csoportja = (ut) => CSOPORTOK.find((cs) => cs.elemek.some(([u]) => u === ut)) || null;
const VALL_UTAK = ['vallalkozoknak/', 'cegautoado-kalkulator/', 'cegauto-vagy-sajat-auto/', 'utnyilvantartas-kikuldetesi-rendelveny/'];
const TASKA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 7.5h16a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1ZM3 12.5h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const HAMBURGER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/** A kalkulátorok címe a kalkulátor kulcsa szerint: a „Következő lépés” linkjeihez (app.mjs). */
export const KALK_UTAK = { gepjarmuado: 'gepjarmuado-kalkulator/', atiras: 'atirasi-illetek-kalkulator/', km: 'kilometerterites-kalkulator/', uti: 'utikoltseg-kalkulator/', osszevet: 'benzin-vagy-villany/', fenntartas: 'autofenntartas-kalkulator/', phev: 'plug-in-hibrid-2027/', hitel: 'autohitel-kalkulator/', matrica: 'autopalya-matrica-kalkulator/', javitas: 'megjavitsam-vagy-csereljem/', cegautoado: 'cegautoado-kalkulator/', cegauto: 'cegauto-vagy-sajat-auto/' };

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
export function pecset(ma, ut = true, marka = 'autózom', link = false) {
  const [ev] = ma.split('-');
  // A gyűrűben a saját nevünk áll: a pecsét a miénk, nem a NAV-é. Kattintásra a forrásokhoz visz.
  return `<svg class="pecset${ut ? ' ut' : ''}" viewBox="0 0 130 130" aria-hidden="true">${link ? '<title>Honnan jönnek a számok? Kattints a forrásokért.</title>' : ''}
<defs><path id="pecset-ivek" d="M65 65 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0"/></defs>
<circle cx="65" cy="65" r="61" fill="none" stroke="currentColor" stroke-width="3"/>
<circle cx="65" cy="65" r="55" fill="none" stroke="currentColor" stroke-width="1.2"/>
<circle cx="65" cy="65" r="35" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text aria-hidden="true" fill="currentColor" font-family="Overpass, sans-serif" font-weight="700" font-size="10.5"><textPath href="#pecset-ivek" textLength="288" lengthAdjust="spacing">${esc(marka.toLocaleUpperCase('hu'))} ✶ NAV-TÉTELEKKEL SZÁMOLVA ✶</textPath></text>
<text aria-hidden="true" x="65" y="64" text-anchor="middle" fill="currentColor" font-family="Overpass, sans-serif" font-weight="800" font-size="21">${ev}</text>
<text aria-hidden="true" x="65" y="80" text-anchor="middle" fill="currentColor" font-family="Overpass, sans-serif" font-weight="700" font-size="11">${datumRomai(ma)}</text>
</svg>`;
}

/** A jel kicsiben, a menü „Az autóm” gombjához: 18 px-en az ékezet nélkül, a kör középre igazítva. */
const JEL_KICSI = '<svg viewBox="30 46 140 140" aria-hidden="true"><g fill="none" stroke-linecap="round"><circle cx="100" cy="116" r="58" stroke="currentColor" stroke-width="24"/><path d="M100 116L122 76" style="stroke:var(--pecset)" stroke-width="18"/><circle cx="100" cy="116" r="15" style="fill:var(--pecset)" stroke="none"/></g></svg>';
/** A szókép: az „ó” a számlap, benne a mutató (marka/rajz.py). */
const LOGO = '<svg class="logo" viewBox="-8 56 820 144" role="img" aria-label="autózom"><g fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="152" r="40"/><path d="M88 112V192"/><path d="M126 112V152A40 40 0 0 0 206 152M206 112V192"/><path d="M264 76V160A32 32 0 0 0 296 192M240 112H296"/><circle cx="368" cy="152" r="40"/><path d="M444 112H516L444 192H516"/><circle cx="590" cy="152" r="40"/><path d="M668 192V112M668 144A32 32 0 0 1 732 144V192M732 144A32 32 0 0 1 796 144V192"/><path d="M394.3 98.1L406.6 72.9" style="stroke:var(--pecset)"/><path d="M368 152L376.8 134.0" style="stroke:var(--pecset)" stroke-width="9"/><circle cx="368" cy="152" r="8" style="fill:var(--pecset)" stroke="none"/></g></svg>';

/**
 * Az adatok dátuma. Ha a reggeli NAV-ellenőrzés már lefutott, annak a napja („Ellenőrizve”).
 * Ha még nem, a legutóbb közzétett NAV-adat napja („NAV-adatok”), hogy ne az építés napját mutassuk.
 */
export function adatDatum(adat) {
  if (adat.allapot.utolso_ellenorzes) return { cimke: 'Ellenőrizve', iso: adat.allapot.utolso_ellenorzes.slice(0, 10) };
  const d = [...Object.values(adat.uzemanyag.kozzeteve || {}), ...['gepjarmuado', 'illetek', 'regado_alap', 'cegautoado'].flatMap((t) => Object.values(adat.tetelek[t] || {}).map((x) => x?.kozzeteve))].filter(Boolean).sort();
  return { cimke: 'NAV-adatok', iso: d[d.length - 1] };
}

// A sitemap lastmod-jához: két építés tartalma ugyanaz-e. A dátumokat (ellenőrzés napja, mai nap) és a
// CSS/JS verziószámot kitakarjuk, mert ezek nem a látogatónak szóló tartalom változásai.
const HONAPNEV = 'január|február|március|április|május|június|július|augusztus|szeptember|október|november|december';
export function tartalomLenyomat(html) {
  return html
    .replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?/g, '#')
    .replace(new RegExp(`\\d{4}\\. (${HONAPNEV}) \\d{1,2}\\.(, \\d{2}:\\d{2})?`, 'g'), '#')
    .replace(/\?v=\w+/g, '');
}
export function lastmodDontes(regiHtml, ujHtml, regiDatum, ma) {
  if (!regiHtml || !regiDatum) return ma;
  return tartalomLenyomat(regiHtml) === tartalomLenyomat(ujHtml) ? regiDatum : ma;
}

/* ---------- Oldalkeret ---------- */

export function oldal(k, { cim, leiras, ut, tartalom, jsonld = [], adatJson = null, indexelheto = true }) {
  const { cfg, elonezet, verzio } = k;
  const L = linkelo(ut, elonezet);
  const kanonikus = `${cfg.domain}/${ut}`;
  const teljesCim = ut ? `${cim} | ${cfg.marka}` : cim;
  // Minden oldalhoz: WebPage a frissítés dátumával és a kiadóval (szervezet, logóval). A frissességi jelzés a
  // ceevio-laborban irányjelző hatású volt az AI-említésre.
  const kiado = { '@type': 'Organization', name: cfg.marka, url: `${cfg.domain}/`, logo: `${cfg.domain}/apple-touch-icon.png`, slogan: 'Az autód. A költségeid. A döntéseid.' };
  const lap = { '@context': 'https://schema.org', '@type': 'WebPage', name: cim, description: leiras, url: kanonikus, inLanguage: 'hu', dateModified: adatDatum(k.adat).iso, isPartOf: { '@type': 'WebSite', name: cfg.marka, url: `${cfg.domain}/` }, publisher: kiado };
  const ld = [lap, ...jsonld].map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cfg.eles && !elonezet ? `<script>/* A régi Cloudflare-címről (pages.dev) a saját domainre visz, ugyanarra az aloldalra */if(/\\.pages\\.dev$/.test(location.hostname))location.replace(${JSON.stringify(cfg.domain)}+location.pathname+location.search+location.hash)</script>` : ''}
<title>${esc(teljesCim)}</title>
<meta name="description" content="${esc(leiras)}">
<meta name="robots" content="${!cfg.eles ? 'noindex, nofollow' : indexelheto ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
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
${elonezet ? '' : `<link rel="preload" href="${L.a('fonts/overpass-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>`}
<link rel="stylesheet" href="${L.a(`style.css?v=${verzio}`)}">
${ld}
</head>
<body>
<a class="ugras" href="#tartalom">Ugrás a tartalomra</a>
<header class="fejlec"><div class="keret">
<button class="fiok-gomb" type="button" aria-label="Menü" aria-haspopup="dialog" aria-controls="fiok" aria-expanded="false">${HAMBURGER}<span>Menü</span></button>
<div class="marka-blokk"><a class="jegy" href="${L.l('')}" aria-label="${esc(cfg.marka)}, főoldal">${LOGO}</a><p class="szlogen">Az autód. A költségeid. A döntéseid.</p></div>
<nav class="menu" id="fomenu" aria-label="Fő menü">${MENU.map((m) => `<a href="${L.l(m.ut)}"${m.ut === ut ? ' aria-current="page"' : ''}${m.ut === 'autom/' ? ' class="menu-autom"' : ''}>${m.ut === 'autom/' ? `${JEL_KICSI}<span class="menu-autom-szoveg">${m.nev}</span>` : m.nev}</a>`).join('')}</nav>
<a class="vall-gomb" href="${L.l('vallalkozoknak/')}"${VALL_UTAK.includes(ut) ? ' aria-current="page"' : ''}>${TASKA}<span>Vállalkozóknak</span></a>
</div></header>
<dialog class="fiok" id="fiok" aria-label="Minden oldal">
<div class="fiok-fej"><a class="jegy" href="${L.l('')}" aria-label="${esc(cfg.marka)}, főoldal">${LOGO}</a><button class="fiok-zar" type="button" aria-label="Menü bezárása">✕</button></div>
<nav aria-label="Minden oldal">${FIOK.map((cs) => `<h2>${cs.cim}</h2><ul>${cs.elemek.map(([u, n, d]) => `<li><a href="${L.l(u)}"${u === ut ? ' aria-current="page"' : ''}${u === 'autom/' ? ' class="fiok-autom"' : ''}>${u === 'autom/' ? JEL_KICSI : ''}<span><b>${n}</b>${d ? `<small>${d}</small>` : ''}</span></a></li>`).join('')}</ul>`).join('')}</nav>
</dialog>
<main id="tartalom">
${(() => {
  const t = tartalom(L);
  if (VJ_NELKUL.includes(ut)) return t.replace(VJ_HELY, '');
  if (t.includes(VJ_HELY)) return t.replace(VJ_HELY, visszajelzesDoboz(cfg, ut, true));
  return `${t}\n<div class="keret">${visszajelzesDoboz(cfg, ut, false)}</div>`;
})()}
</main>
${lablec(k, L)}
${adatJson ? `<script type="application/json" id="adat">${JSON.stringify(adatJson)}</script>\n<script type="application/json" id="utak">${JSON.stringify(Object.fromEntries(Object.entries(KALK_UTAK).map(([kk, u]) => [kk, L.l(u)])))}</script>` : ''}
<script type="module" src="${L.a(`js/app.js?v=${verzio}`)}"></script>
</body>
</html>
`;
}

/** Igaz, ha az ellenőrzés nyolc napnál régebben futott le utoljára (hetente legalább egyszer fut; ha nem, a GitHub-futások leálltak). */
export function ellenorzesKesik(utolso, ma) {
  if (!utolso || !ma) return false;
  return (Date.parse(String(ma).slice(0, 10)) - Date.parse(String(utolso).slice(0, 10))) / 86400000 > 8;
}
function lablec(k, L) {
  const { adat, ma, cfg } = k;
  const ell = adat.allapot.utolso_ellenorzes || ma;
  return `<footer class="lablec"><div class="keret">
<div>
<p><strong>Független oldal, nem a NAV hivatalos oldala.</strong> A NAV közzétett adatai alapján számolunk. A számítások tájékoztató jellegűek, és nem helyettesítik az adótanácsadást. A ténylegesen fizetendő adót és illetéket a NAV határozata tartalmazza.</p>
<p>${ellenorzesKesik(adat.allapot.utolso_ellenorzes, ma) ? `Az adatok rendszeres összevetése a NAV oldalával ${datumHu(ell)} óta technikai okból szünetel. Az azóta közzétett változások még nem szerepelhetnek.` : `Az adatokat rendszeresen összevetjük a NAV oldalával. ${adat.allapot.utolso_ellenorzes ? `Legutóbbi ellenőrzés: ${datumHu(ell)}` : `A legfrissebb NAV-adat: ${datumHu(adatDatum(adat).iso)}`}`}</p>
</div>
<nav class="lablec-csoportok" aria-label="Az oldal tartalma">${[...CSOPORTOK, { cim: esc(cfg.marka), elemek: OLDALROL }].map((cs) => `<div><h2>${cs.cim}</h2><ul>${cs.elemek.map(([u, n]) => `<li><a href="${L.l(u)}">${n}</a></li>`).join('')}</ul></div>`).join('')}</nav>
</div></footer>`;
}

/**
 * Az oldal teteje. A ceevio-labor (L3b, L4) szerint az AI-említést a „válasz elöl” növeli bizonyítottan:
 * a cím maga a kérdés, és az első bekezdés (valasz) rögtön megválaszolja, konkrét számmal. A bevezető csak utána jön.
 * A frissességi dátum (friss) irányjelző hatású volt, ezért minden számoló oldalon kiírjuk.
 */
export function oldalfej(L, { morzsa, cim, valasz = '', bevezeto, fo = false, friss = '' }) {
  const m = morzsa ? `<ol class="morzsa" aria-label="Hol vagy">${[`<li><a href="${L.l('')}">Főoldal</a></li>`, ...morzsa.map((x) => (Array.isArray(x) ? `<li><a href="${L.l(x[1])}">${x[0]}</a></li>` : `<li aria-current="page">${x}</li>`))].join('')}</ol>` : '';
  return `<div class="keret oldalfej${fo ? ' fo' : ''}">${m}<h1>${cim}</h1>${valasz ? `<p class="valasz">${valasz}</p>` : ''}${bevezeto ? `<p class="bevezeto">${bevezeto}</p>` : ''}${friss ? `<p class="friss">Az adatokat ${friss} ellenőriztük. <a href="${L.l('forrasok/')}">Honnan vannak a számok?</a></p>` : ''}</div>`;
}

/* ---------- Űrlap-építőkockák ---------- */

export const kod = (k) => `<span class="kod${k ? '' : ' ures'}"${k ? ` title="A forgalmi engedély ${k} sora"` : ''} aria-hidden="true">${k || ''}</span>`;
export const sor = (k, belso, attr = '') => `<div class="sor"${attr}>${kod(k)}<div class="mezo">${belso}</div></div>`;

export function szamMezo({ id, cim, me = '', ertek = '', sugo = '', min = '', max = '', placeholder = '', szeles = false, extra = '', nev = '', tized = false }) {
  return `<label for="${id}">${cim}</label><div class="beir${szeles ? ' szeles' : ''}"><input id="${id}" name="${nev || id}" type="${tized ? 'text' : 'number'}" inputmode="${tized ? 'decimal' : 'numeric'}"${tized ? ' pattern="[0-9]+([,.][0-9]+)?" autocomplete="off"' : ''}${min !== '' ? ` min="${min}"` : ''}${max !== '' ? ` max="${max}"` : ''} value="${ertek}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}>${me ? `<span class="me">${me}</span>` : ''}</div>${extra}${sugo ? `<span class="sugo">${sugo}</span>` : ''}`;
}

export function negyzetek(name, cim, opciok, ertek, idElotag = '') {
  const id = `${idElotag}${name}-c`;
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

/** Stilizált forgalmi-hátoldal: hol vannak a mezők. Saját rajz, nem a valódi okmány képe. */
export const HOL_TALALOM = `<details class="hol-talalom"><summary>Hol találom ezeket az adatokat?</summary>
<div class="hol-belso"><svg viewBox="0 0 320 178" role="img" aria-label="A forgalmi engedély hátoldala, kiemelve a P.2 teljesítmény és a P.3 hajtóanyag mező">
<rect x="1" y="1" width="318" height="176" rx="12" class="hk-lap"/>
<text x="16" y="24" class="hk-cim">Forgalmi engedély, hátoldal</text>
<g class="hk-sor"><text x="16" y="52">D.1</text><text x="58" y="52">Gyártmány</text><rect x="150" y="42" width="150" height="12" rx="2"/></g>
<g class="hk-sor"><text x="16" y="76">B</text><text x="58" y="76">Első forgalomba helyezés</text><rect x="230" y="66" width="70" height="12" rx="2"/></g>
<g class="hk-sor"><text x="16" y="100">P.1</text><text x="58" y="100">Hengerűrtartalom (cm³)</text><rect x="230" y="90" width="70" height="12" rx="2"/></g>
<g class="hk-sor hk-kiemel"><rect x="8" y="110" width="304" height="22" rx="4" class="hk-hatter"/><text x="16" y="125">P.2</text><text x="58" y="125">Teljesítmény (kW)</text><text x="300" y="125" text-anchor="end" class="hk-ertek">85</text></g>
<g class="hk-sor hk-kiemel"><rect x="8" y="136" width="304" height="22" rx="4" class="hk-hatter"/><text x="16" y="151">P.3</text><text x="58" y="151">Hajtóanyag</text><text x="300" y="151" text-anchor="end" class="hk-ertek">BENZIN</text></g>
</svg>
<ul>
<li><b>P.2:</b> a teljesítmény kilowattban. Ha csak a lóerőt tudod, válts lóerőre a mező alatt, és átszámoljuk.</li>
<li><b>P.3:</b> a hajtóanyag. A hibridet és a plug-in hibridet az adó miatt kérdezzük külön.</li>
<li><b>Gyártási év:</b> az adót és az illetéket ebből számolják, nem az első forgalomba helyezés (B) dátumából. Ha a forgalmin nem találod, a törzskönyvben szerepel.</li>
</ul></div></details>`;

/** A forgalmi-kártya kerete. */
/** A mentett autó sávja (betöltés, törlés) és a mentés gombja. A felirat jelzi, ha nem az egész űrlap az autód. */
export const automFent = (mibe = '') => `<div class="autom" data-autom hidden><span>Mentett autód: <b data-autom-nev></b></span><button class="szoveg-gomb" type="button" data-autom-betolt>${mibe ? `Betöltöm ${mibe}` : 'Betöltöm'}</button><button class="szoveg-gomb" type="button" data-autom-torol>Törlöm</button></div>`;
export const automLent = (felirat = 'Elmentem az autómat') => `<div class="autom-ment"><button class="szoveg-gomb" type="button" data-autom-ment>${felirat}</button><span class="kicsi">Csak ebben a böngészőben marad, és bármikor törölheted.</span></div>`;
export function forgalmi({ cim, al = '', tartalom, kalk, extra = '', autom = false, osztaly = '' }) {
  // autom: true, vagy { mibe, felirat }, ha az autód az űrlapnak csak az egyik része (például a régi autó)
  const ao = typeof autom === 'object' ? autom : {};
  const fent = autom ? automFent(ao.mibe) : '';
  const lent = autom ? automLent(ao.felirat) : '';
  return `<form class="forgalmi${osztaly ? ` ${osztaly}` : ''}"${kalk ? ` data-kalk="${kalk}"` : ''} novalidate${extra}><span class="gilos" aria-hidden="true"></span><div class="forgalmi-fej"><h2>${cim}</h2>${al ? `<p>${al}</p>` : ''}</div>${['gyors', 'gepjarmuado', 'atiras', 'fenntartas'].includes(kalk) ? HOL_TALALOM : ''}${fent}${tartalom}${lent}</form>`;
}

/** Az elszámolás kerete a pecséttel. */
export function elszamolas(k, belso, { cim = 'Elszámolás', gombok = true, labjegy = '', szeles = false, kesz = false } = {}) {
  return `<section class="elszamolas${szeles ? ' szeles' : ''}" id="eredmeny" aria-labelledby="elsz-cim">
<div class="elsz-fej"><h2 id="elsz-cim">${cim}</h2>${(() => { const d = adatDatum(k.adat); return `<time datetime="${d.iso}" title="${d.cimke === 'Ellenőrizve' ? 'Ekkor vetettük össze az adatokat a NAV oldalával' : 'Ekkor tette közzé a NAV a legfrissebb adatot, amivel számolunk'}">${d.cimke}: ${datumHu(d.iso)}</time>`; })()}</div>
<div class="elsz-tartalom" aria-live="polite">${belso}</div>
${gombok ? `<div class="elsz-lab"><button class="szoveg-gomb" type="button" data-masol>Számítás megosztása</button><button class="szoveg-gomb" type="button" data-nyomtat>Nyomtatás</button></div>${VJ_HELY}` : labjegy ? `<div class="elsz-lab"><p class="kicsi">${labjegy}</p></div>` : ''}
${pecset(k.ma, true, k.cfg.marka, true).replace('<svg class="pecset ut"', `<svg class="pecset${kesz ? ' ut' : ''}"${kesz ? '' : ' hidden'}`)}
</section>
<a class="mini" href="#eredmeny" hidden><span class="mi"></span><span class="mennyi"></span></a>`;
}


/* ---------- Visszajelzés ---------- */
const VJ_HELY = '<!--visszajelzes-->';
// Ezeken az oldalakon nincs visszajelzés-doboz (jogi szöveg, főoldal)
const VJ_NELKUL = ['', 'impresszum/', 'adatvedelem/'];
const HUVELYK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path d="M7 10.5v9.5H4v-9.5h3Zm0 0 3.6-6.8c1.6 0 2.7 1.1 2.3 2.8L12.4 10h5.4a2 2 0 0 1 2 2.4l-1.2 5.9a2.1 2.1 0 0 1-2.1 1.7H7"/></svg>';

/** A „Hasznos volt?” doboz. Kalkulátornál a beírt számokat is elküldheti a látogató, ha akarja. */
export function visszajelzesDoboz(cfg, ut, kalk) {
  const email = cfg.kapcsolat_email;
  return `<div class="vj${kalk ? '' : ' vj-oldal'}" data-visszajelzes data-ut="/${esc(ut)}"${email ? ` data-email="${esc(email)}"` : ''}>
<p class="vj-kerdes" id="vj-kerdes">${kalk ? 'Hasznos volt ez a számítás?' : 'Hasznos volt ez az oldal?'}</p>
<div class="vj-gombok" role="group" aria-labelledby="vj-kerdes"><button class="vj-gomb" type="button" data-vj="fel" aria-pressed="false">${HUVELYK}<span>Igen</span></button><button class="vj-gomb vj-le" type="button" data-vj="le" aria-pressed="false">${HUVELYK}<span>Nem</span></button></div>
<form class="vj-urlap" hidden novalidate>
<label for="vj-szoveg">${kalk ? 'Mi nem stimmel, vagy mit vártál volna?' : 'Mi hiányzott, vagy mi nem stimmel?'}</label>
<textarea id="vj-szoveg" name="szoveg" rows="3" maxlength="1000"></textarea>
${kalk ? '<label class="vj-jelolo"><input type="checkbox" name="adatok" checked><span>A beírt számokat és az eredményt is elküldöm, hogy lássátok, hol csúszott el</span></label>' : ''}
<input class="vj-csapda" name="web" tabindex="-1" autocomplete="off" aria-hidden="true">
<div class="vj-sor"><button class="gomb" type="submit">Elküldöm</button><p class="kicsi halk">Nevet, e-mail-címet és rendszámot ne írj bele.${email ? ` Ha választ is szeretnél, <a data-hibajelzes data-cim="${esc(email)}" href="mailto:${esc(email)}">írj levelet</a>.` : ''}</p></div>
</form>
<p class="vj-allapot" role="status"></p>
</div>`;
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
  // Előbb a saját csoport oldalai, utána a többi csoporté: így minden oldal minden tartalmi oldalra linkel.
  const sajat = csoportja(aktiv);
  const sorrend = sajat ? [sajat, ...CSOPORTOK.filter((cs) => cs !== sajat)] : CSOPORTOK;
  const t = sorrend.flatMap((cs) => cs.elemek).filter(([u]) => u !== aktiv && u !== 'autom/');
  return `<nav class="tovabb" aria-label="Kapcsolódó oldalak">${t.map(([u, n]) => `<a href="${L.l(u)}">${n}</a>`).join('')}</nav>`;
}

export { datumHu, fmt, honapHu };
