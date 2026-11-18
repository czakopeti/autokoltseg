// Az oldal felépítése: node epit.mjs            → web/ (éles, Cloudflare Pages ezt szolgálja ki)
//                      node epit.mjs --elonezet → elonezet/ (relatív linkek, bármilyen tárhelyen vagy fájlként is megy)
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { betoltAdat, olvas, maBudapest, GYOKER } from './forras/adat.mjs';
import { gilos, lastmodDontes, CSOPORTOK } from './forras/sablon.mjs';
import * as S from './forras/js/szamitas.mjs';
import * as O from './forras/oldalak.mjs';
import * as M from './forras/js/megjelenites.mjs';

const elonezet = process.argv.includes('--elonezet');
const KI = join(GYOKER, elonezet ? 'elonezet' : 'web');
const cfg = olvas('config.json');
const adat = betoltAdat();
const ma = maBudapest();
const ev = Number(ma.slice(0, 4));

// Figyelmeztetés, ha élesítés előtt hiányzik valami
const hianyzik = [];
if (!cfg.uzemelteto.nev) hianyzik.push('üzemeltető neve');
if (cfg.uzemelteto.tipus !== 'magánszemély' && !cfg.uzemelteto.szekhely) hianyzik.push('székhely');
if (!cfg.kapcsolat_email) hianyzik.push('kapcsolati e-mail');
if (cfg.eles && hianyzik.length) {
  console.error(`HIBA: az eles: true mellett hiányzik: ${hianyzik.join(', ')}. Töltsd ki a config.json-t.`);
  process.exit(1);
}
if (hianyzik.length) console.warn(`Figyelem: előnézeti mód (noindex). Élesítés előtt kitöltendő: ${hianyzik.join(', ')}.`);

// A sitemap oldalankénti dátumához megjegyezzük a mostani (előző építésű) oldalakat, mielőtt a mappa törlődik
const regiOldalak = new Map();
if (!elonezet && existsSync(join(KI, 'sitemap.xml'))) {
  for (const [, loc, datum] of readFileSync(join(KI, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) {
    const ut = loc.replace(cfg.domain + '/', '');
    const f = join(KI, ut, 'index.html');
    if (existsSync(f)) regiOldalak.set(ut, { html: readFileSync(f, 'utf8'), datum });
  }
}

rmSync(KI, { recursive: true, force: true });
mkdirSync(join(KI, 'assets/js'), { recursive: true });

// Statikus fájlok: CSS, betűk, JS (a .mjs modulok .js-ként, hogy minden tárhely jó MIME-típussal adja)
cpSync(join(GYOKER, 'forras/fonts'), join(KI, 'assets/fonts'), { recursive: true });
let css = readFileSync(join(GYOKER, 'forras/css/style.css'), 'utf8');
// Előnézetben a betűk a CSS-be ágyazva, hogy szigorú tartalombiztonsági szabályú tárhelyen is megjelenjenek
if (elonezet) css = css.replace(/url\(fonts\/([\w.-]+\.woff2)\)/g, (m, f) => `url(data:font/woff2;base64,${readFileSync(join(GYOKER, 'forras/fonts', f)).toString('base64')})`);
writeFileSync(join(KI, 'assets/style.css'), css);
// A JavaScript-modulok egymást is verziószámmal töltik be: a Cloudflare a böngészőben órákig gyorsítótárazza a fájlokat,
// és enélkül egy új app.js a régi szamitas.js-t kaphatná (2026. november 6-án így állt le két új kalkulátor).
const JS = ['szamitas', 'megjelenites', 'app'];
const jsNyers = Object.fromEntries(JS.map((f) => [f, readFileSync(join(GYOKER, `forras/js/${f}.mjs`), 'utf8')]));
const jsOssz = JS.map((f) => jsNyers[f]).join('');
const jsVerzio = createHash('sha1').update(jsOssz).digest('hex').slice(0, 8);
for (const f of JS) writeFileSync(join(KI, `assets/js/${f}.js`), jsNyers[f].replace(/from '\.\/(\w+)\.mjs'/g, `from './$1.js?v=${jsVerzio}'`));
// A forgalmi-kártya rozettája külön fájlban: egyszer töltődik le, és minden oldal a gyorsítótárból veszi.
writeFileSync(join(KI, 'assets/gilos.svg'), gilos().replace('<svg class="gilos"', '<svg xmlns="http://www.w3.org/2000/svg"').replace('aria-hidden="true" ', '').replace('stroke="currentColor"', 'stroke="#000"'));
const verzio = createHash('sha1').update(css + jsOssz).digest('hex').slice(0, 8);
for (const f of readdirSync(join(GYOKER, 'forras/kepek'))) cpSync(join(GYOKER, 'forras/kepek', f), join(KI, f === 'og.png' ? 'assets/og.png' : f));

const k = { cfg, adat, ma, ev, elonezet, verzio };
const oldalak = [
  ['', O.fooldal(k)],
  ['gepjarmuado-kalkulator/', O.gepjarmuadoOldal(k)],
  ['atirasi-illetek-kalkulator/', O.atirasOldal(k)],
  ['kilometerterites-kalkulator/', O.kmOldal(k)],
  [O.UTI_UT, O.utikoltsegOldal(k)],
  ['benzin-vagy-villany/', O.osszehasonlitoOldal(k)],
  ['autofenntartas-kalkulator/', O.fenntartasOldal(k)],
  ['plug-in-hibrid-2027/', O.phevOldal(k)],
  ['autohitel-kalkulator/', O.hitelOldal(k)],
  ['autopalya-matrica-kalkulator/', O.matricaOldal(k)],
  ['megjavitsam-vagy-csereljem/', O.javitasOldal(k)],
  ['kotelezo-biztositas-valtas/', O.kgfbOldal(k)],
  ['vetlen-baleset/', O.vetlenOldal(k)],
  ['le-kw-atvaltas/', O.lekwOldal(k)],
  ['adasveteli-szerzodes-minta/', O.adasveteliOldal(k)],
  ['vallalkozoknak/', O.vallalkozoknakOldal(k)],
  [O.NAVAR_UT, O.navArOldal(k)],
  [O.UTNY_UT, O.utnyOldal(k)],
  ['adatok/', O.adatokOldal(k)],
  ['cegautoado-kalkulator/', O.cegautoadoOldal(k)],
  ['cegauto-vagy-sajat-auto/', O.cegautoOldal(k)],
  ['autom/', O.automOldal(k)],
  ['forrasok/', O.forrasokOldal(k)],
  ['valtozasok/', O.valtozasokOldal(k)],
  ['rolunk/', O.rolunkOldal(k)],
  ['impresszum/', O.impresszumOldal(k)],
  ['adatvedelem/', O.adatvedelemOldal(k)],
];
for (const [ut, html] of oldalak) {
  mkdirSync(join(KI, ut), { recursive: true });
  writeFileSync(join(KI, ut, 'index.html'), html);
}
writeFileSync(join(KI, '404.html'), O.nemTalalhatoOldal(k));
// A mérő végpont (functions/api/meres.js) csak ezekre az oldalakra számol
if (!elonezet) {
  mkdirSync(join(GYOKER, 'kozos'), { recursive: true });
  writeFileSync(join(GYOKER, 'kozos/utak.js'), `// Az oldalak listája a mérő végpontnak. Az epit.mjs írja, kézzel ne szerkeszd.\nexport const UTAK = ${JSON.stringify(oldalak.map(([ut]) => ut))};\n`);
}

if (!elonezet) {
  // Munkaverzióban (eles: false) a robots.txt engedi a bejárást, hogy a keresők lássák a noindex jelzést,
  // de nem ad meg oldaltérképet. A noindex a HTML-ben és fejlécben is ott van, minden fájlra.
  // Élesben minden kereső- és AI-robot számára nyitott (a ceevio mintájára, név szerint is felsorolva).
  const ROBOTOK = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot'];
  // IndexNow: a kulcsfájllal igazoljuk a Bingnek, hogy a domain a miénk (lásd .github/workflows/indexnow.yml)
  if (cfg.eles && cfg.indexnow_kulcs) writeFileSync(join(KI, `${cfg.indexnow_kulcs}.txt`), cfg.indexnow_kulcs);
  writeFileSync(join(KI, 'robots.txt'), cfg.eles
    ? `# ${cfg.marka}: minden kereső- és AI-robot számára nyitott.\nUser-agent: *\nAllow: /\n\n${ROBOTOK.map((r) => `User-agent: ${r}\nAllow: /\n`).join('\n')}\nSitemap: ${cfg.domain}/sitemap.xml\n`
    : `# Munkaverzió: egyetlen oldal se kerüljön keresőbe.\nUser-agent: *\nAllow: /\n`);
  // A lastmod oldalanként csak akkor lesz mai, ha az oldal tartalma tényleg változott (a minden oldalon
  // szereplő ellenőrzési dátumot nem számítjuk változásnak, különben a Google figyelmen kívül hagyná a dátumot).
  // A noindex oldalak (Az autóm) és az impresszum nem kerülnek bele.
  const urlek = oldalak
    .filter(([ut, html]) => ut !== 'impresszum/' && !/<meta name="robots" content="noindex/.test(html))
    .map(([ut, html]) => `<url><loc>${cfg.domain}/${ut}</loc><lastmod>${lastmodDontes(regiOldalak.get(ut)?.html, html, regiOldalak.get(ut)?.datum, ma)}</lastmod></url>`).join('\n');
  // Letölthető idősorok (adatok/ oldal)
  for (const [f, tart] of Object.entries(O.adatCsvk(adat))) writeFileSync(join(KI, 'adatok', f), tart);
  // Gépi adatcsatorna (JSON), lásd az Adatok oldal „Fejlesztőknek” részét
  mkdirSync(join(KI, O.JSON_UT), { recursive: true });
  for (const [f, o] of Object.entries(O.adatJsonok(adat, cfg))) writeFileSync(join(KI, O.JSON_UT, f), `${JSON.stringify(o, null, 2)}\n`);
  if (cfg.eles) writeFileSync(join(KI, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlek}\n</urlset>\n`);
  writeFileSync(join(KI, '_headers'), `# Biztonsági fejlécek minden oldalra
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  X-Frame-Options: SAMEORIGIN
  Cross-Origin-Opener-Policy: same-origin
${cfg.eles ? '' : '  X-Robots-Tag: noindex, nofollow, noarchive\n'}
# Az adatcsatorna (JSON, CSV) bármely oldalról lekérhető; egy óráig gyorsítótárazható, az adat havonta változik
/adatok/v1/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600
  Content-Type: application/json; charset=utf-8
/adatok/*.csv
  Access-Control-Allow-Origin: *

# A betűk és a verziózott fájlok sokáig gyorsítótárazhatók
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/js/*
  Cache-Control: public, max-age=31536000, immutable
/assets/style.css
  Cache-Control: public, max-age=31536000, immutable

# A Cloudflare-címek (autokoltseg-7t6.pages.dev és az előnézetek) ne kerüljenek a keresőkbe: csak a saját domain
https://:project.pages.dev/*
  X-Robots-Tag: noindex
https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
`);
  const lf = Object.entries(adat.uzemanyag.evek).flatMap(([e, h]) => Object.keys(h).map((x) => `${e}-${x}`)).pop();
  const lfh = S.legfrissebbHonap(adat);
  const evekLista = Object.keys(adat.tetelek.gepjarmuado).join(' és ');
  // A szöveges térkép az AI-asszisztenseknek: ugyanazok a csoportok és ugyanaz a sorrend, mint a főoldalon.
  const LLMS = {
    'gepjarmuado-kalkulator/': `a ${evekLista.replace(/(\d{4})/g, '$1.')} évi NAV-tételekkel, a teljesítmény (kW) és a gyártási év alapján; az elektromos és a plug-in hibrid mentessége`,
    'atirasi-illetek-kalkulator/': `vagyonszerzési illeték, eredetiségvizsgálat, okmányok, külföldről hozott autónál regisztrációs adó`,
    'benzin-vagy-villany/': `két autó teljes költsége havonta és évekre, megtérülési idő, km-határ`,
    'autofenntartas-kalkulator/': `havi és kilométerenkénti költség üzemanyaggal, értékvesztéssel, biztosítással, szervizzel és adóval`,
    'utikoltseg-kalkulator/': `mennyibe kerül egy út benzinnel, dízellel, LPG-vel vagy árammal, a NAV havi árával (legfrissebb: ${M.honapHu(lfh.ev, lfh.honap)}); fejenkénti, havi és éves költség`,
    'kilometerterites-kalkulator/': `a NAV havi üzemanyagárával (legfrissebb: ${M.honapHu(lfh.ev, lfh.honap)}) és a fogyasztási normával, plusz 15 Ft/km; munkába járás kilométerenként`,
    'plug-in-hibrid-2027/': `gépjárműadó és cégautóadó a mentesség lejárta után, budapesti parkolás, a zöld rendszám cseréje${ma <= adat.szabalyok.phev.rendszam_hatarido ? ` (határidő: ${M.datumHu(adat.szabalyok.phev.rendszam_hatarido)})` : ''}`,
    'autohitel-kalkulator/': `havi törlesztő THM-ből, kamat, átírás, értékvesztés, az autó valódi költsége a futamidő alatt`,
    'autopalya-matrica-kalkulator/': `éves, vármegyei, M1 regionális vagy alkalmi e-matrica, melyik a legolcsóbb, a ${Object.keys(adat.szabalyok.matrica.evek).map((e) => `${e}.`).join(' és ')} évi díjakkal`,
    'megjavitsam-vagy-csereljem/': `megjavítsam a régi autót, vagy eladjam és vegyek másikat; két út teljes költsége évekre, értékvesztéssel és átírással`,
    'kotelezo-biztositas-valtas/': `felmondási határidő az évfordulóból (január 1-jénél december 1.), díjértesítő, bonus-malus osztály jövőre`,
    'vetlen-baleset/': `mi jár a károkozó kötelező biztosításától (javítás, csereautó, értékcsökkenés), határidők, Pénzügyi Békéltető Testület`,
    'le-kw-atvaltas/': `1 LE = 0,7355 kW, táblázattal`,
    'autom/': `egy autó minden költsége egy lapon, és a határidők (műszaki, kötelező biztosítás, gépjárműadó) naptárfájlban`,
    'utnyilvantartas-kikuldetesi-rendelveny/': `kitölthető, nyomtatható, a törvény szerinti kötelező adatokkal; havi elszámolás annak a hónapnak a NAV-árával, amikor az út volt, és 15 Ft/km normaköltséggel; az utak Excelből is bemásolhatók`,
    'nav-uzemanyagar/': `az e havi NAV elszámolási ár (benzin, dízel, keverék, LPG, CNG), az előző hónappal és az egy évvel korábbival`,
    'adatok/': `a NAV havi üzemanyagárai 2023 óta, a gépjárműadó, a cégautóadó, az átírási illeték és az e-matrica díjai évenként; CSV-letöltés és JSON-adatcsatorna regisztráció nélkül (${cfg.domain}/adatok/v1/index.json), CC BY 4.0`,
    'vallalkozoknak/': `cégautóadó, kilométertérítés kiküldetési rendelvénnyel; mi vonatkozik a kft.-re, az egyéni vállalkozóra, az átalányadózóra és a katásra; könyvelőknek a havi NAV-ár Excelbe és JSON-ban`,
    'cegautoado-kalkulator/': `havi és éves cégautóadó kW és környezetvédelmi osztály alapján, a gépjárműadó levonásával, negyedéves határidők, a ${Object.keys(adat.tetelek.cegautoado).filter((e) => /^\d{4}$/.test(e)).map((e) => `${e}.`).join(' és ')} évi NAV-tételekkel`,
    'cegauto-vagy-sajat-auto/': `kft. és bt. tulajdonosainak: cégautó cégautóadóval, vagy saját autó adómentes km-térítéssel; a két út a tulajdonos zsebéből nézve, osztalékadóval, és a fordulópont km-ben`,
    'adasveteli-szerzodes-minta/': `kitölthető, nyomtatható adásvételi szerződés használt autóhoz, tanúkkal, a vételár betűvel kiírva`,
    'forrasok/': `minden tétel forrása és közzétételi dátuma, a becslések módszere`,
    'valtozasok/': `az átvett NAV-adatok időrendben, közzététellel és hatálybalépéssel`,
    'rolunk/': `független, ingyenes, forrással; mi hivatalos, mi saját adat, mi becslés`,
  };
  const sor = ([u, n, , teljes]) => `- [${teljes || n}](${cfg.domain}/${u}): ${LLMS[u]}`;
  writeFileSync(join(KI, 'llms.txt'), `# ${cfg.marka}

> Az autód. A költségeid. A döntéseid. ${M.nevelo(cfg.marka).replace(/^a/, 'A')} ${cfg.marka} független, ingyenes magyar oldal az autó költségeiről. Kiszámolja a gépjárműadót, az átírás díját, a havi fenntartási költséget és a kilométertérítést a NAV közzétett tételeivel, összehasonlítja a benzines és az elektromos autó teljes költségét, és kitölthető útnyilvántartást, kiküldetési rendelvényt és adásvételi szerződést ad. Minden eredménynél jelöli, mi hivatalos NAV-adat, mi a látogató saját adata és mi becslés. Nem a NAV oldala. Az adatokat rendszeresen, a NAV havi közzétételei körül naponta automatikusan összeveti a NAV oldalával. Fent vannak a gépjárműadó ${evekLista.replace(/(\d{4})/g, '$1.')} évi tételei, a legfrissebb NAV-üzemanyagár pedig a ${M.honapHu(lfh.ev, lfh.honap)}i.

${CSOPORTOK.map((cs) => `## ${cs.cim}\n\n${cs.bevezeto}\n\n${cs.elemek.map(sor).join('\n')}`).join('\n\n')}

## Gépi adatok

- [JSON-adatcsatorna](${cfg.domain}/adatok/v1/index.json): NAV havi üzemanyagár, gépjárműadó, cégautóadó, átírási illeték, e-matrica; regisztráció és kulcs nélkül, CC BY 4.0
- [A legfrissebb NAV-üzemanyagár CSV-ben](${cfg.domain}/adatok/nav-uzemanyagar-legfrissebb.csv): egy sor, Excelbe és Google Táblázatba húzható

## Az oldalról

- [Rólunk és szerkesztői elvek](${cfg.domain}/rolunk/): ${LLMS['rolunk/'] || 'független, ingyenes, forrással'}
`);
}

console.log(`Kész: ${oldalak.length + 1} oldal → ${KI.replace(GYOKER + '/', '')} (dátum: ${ma}, verzió: ${verzio})`);
