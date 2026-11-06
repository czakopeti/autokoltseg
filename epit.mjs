// Az oldal felépítése: node epit.mjs            → web/ (éles, Cloudflare Pages ezt szolgálja ki)
//                      node epit.mjs --elonezet → elonezet/ (relatív linkek, bármilyen tárhelyen vagy fájlként is megy)
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { betoltAdat, olvas, maBudapest, GYOKER } from './forras/adat.mjs';
import { gilos, adatDatum as S_adatDatum } from './forras/sablon.mjs';
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

if (!elonezet) {
  // Munkaverzióban (eles: false) a robots.txt engedi a bejárást, hogy a keresők lássák a noindex jelzést,
  // de nem ad meg oldaltérképet. A noindex a HTML-ben és fejlécben is ott van, minden fájlra.
  // Élesben minden kereső- és AI-robot számára nyitott (a ceevio mintájára, név szerint is felsorolva).
  const ROBOTOK = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot'];
  writeFileSync(join(KI, 'robots.txt'), cfg.eles
    ? `# ${cfg.marka}: minden kereső- és AI-robot számára nyitott.\nUser-agent: *\nAllow: /\n\n${ROBOTOK.map((r) => `User-agent: ${r}\nAllow: /\n`).join('\n')}\nSitemap: ${cfg.domain}/sitemap.xml\n`
    : `# Munkaverzió: egyetlen oldal se kerüljön keresőbe.\nUser-agent: *\nAllow: /\n`);
  // A lastmod az adatok utolsó ellenőrzött dátuma, nem az építésé: így csak akkor változik, ha tényleg frissült valami
  const lastmod = S_adatDatum(adat).iso;
  const urlek = oldalak.filter(([ut]) => ut !== 'impresszum/').map(([ut]) => `<url><loc>${cfg.domain}/${ut}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
  if (cfg.eles) writeFileSync(join(KI, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlek}\n</urlset>\n`);
  writeFileSync(join(KI, '_headers'), `# Biztonsági fejlécek minden oldalra
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  X-Frame-Options: SAMEORIGIN
  Cross-Origin-Opener-Policy: same-origin
${cfg.eles ? '' : '  X-Robots-Tag: noindex, nofollow, noarchive\n'}
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
  writeFileSync(join(KI, 'llms.txt'), `# ${cfg.marka}

> Az autód. A költségeid. A döntéseid. ${M.nevelo(cfg.marka).replace(/^a/, "A")} ${cfg.marka} független, ingyenes magyar oldal: kiszámolja egy autó gépjárműadóját, átírási költségét, havi fenntartási költségét és a kilométertérítést a NAV közzétett tételeivel, és összehasonlítja a benzines és az elektromos autó teljes költségét. Minden eredménynél jelöli, mi hivatalos NAV-adat, mi a látogató saját adata és mi becslés. Nem a NAV oldala. Az adatokat minden reggel automatikusan összeveti a NAV-val.

## Kalkulátorok

- [Gépjárműadó](${cfg.domain}/gepjarmuado-kalkulator/): ${evekLista}. évi tételek kW és gyártási év alapján, elektromos és plug-in hibrid mentesség
- [Átírás](${cfg.domain}/atirasi-illetek-kalkulator/): vagyonszerzési illeték, eredetiségvizsgálat, okmányok, külföldről hozott autónál regisztrációs adó
- [Benzines vagy elektromos autó](${cfg.domain}/benzin-vagy-villany/): két autó teljes költsége havonta és évekre, megtérülési idő, km-határ
- [Fenntartás](${cfg.domain}/autofenntartas-kalkulator/): havi és kilométerenkénti költség, értékvesztéssel
- [Kilométertérítés](${cfg.domain}/kilometerterites-kalkulator/): NAV-üzemanyagár (legfrissebb: ${lfh.ev}. ${lfh.honap}. hónap), fogyasztási norma, munkába járás
- [Plug-in hibrid 2027](${cfg.domain}/plug-in-hibrid-2027/): gépjárműadó és cégautóadó a mentesség lejárta után, budapesti parkolás, a zöld rendszám cseréje (határidő: 2026. november 30.)
- [Autóhitel](${cfg.domain}/autohitel-kalkulator/): havi törlesztő THM-ből, kamat, átírás, értékvesztés, az autó valódi költsége a futamidő alatt
- [Autópálya-matrica](${cfg.domain}/autopalya-matrica-kalkulator/): éves, vármegyei, M1 regionális vagy alkalmi e-matrica, melyik a legolcsóbb (${adat.szabalyok.matrica.ev}. évi díjak)
- [Javítás vagy csere](${cfg.domain}/megjavitsam-vagy-csereljem/): megjavítsam a régi autót, vagy eladjam és vegyek másikat; két út teljes költsége évekre, értékvesztéssel és átírással
- [Kötelező biztosítás váltás](${cfg.domain}/kotelezo-biztositas-valtas/): felmondási határidő az évfordulóból (január 1-jénél december 1.), díjértesítő, bonus-malus osztály jövőre
- [Vétlen baleset](${cfg.domain}/vetlen-baleset/): mi jár a károkozó kötelező biztosításától (javítás, csereautó, értékcsökkenés), határidők, Pénzügyi Békéltető Testület
- [LE–kW átváltás](${cfg.domain}/le-kw-atvaltas/): 1 LE = 0,7355 kW, táblázattal
- [Az autóm](${cfg.domain}/autom/): egy autó minden költsége egy lapon
- [Adásvételi szerződés](${cfg.domain}/adasveteli-szerzodes-minta/): kitölthető, nyomtatható minta

## Források és frissítés

- [Honnan vannak a számok?](${cfg.domain}/forrasok/): minden tétel forrása és közzétételi dátuma, a becslések módszere
- [Mi változott?](${cfg.domain}/valtozasok/): az átvett NAV-adatok időrendben, közzététellel és hatálybalépéssel
- [Rólunk és szerkesztői elvek](${cfg.domain}/rolunk/): független, ingyenes, forrással; mi hivatalos, mi saját adat, mi becslés
`);
}

console.log(`Kész: ${oldalak.length + 1} oldal → ${KI.replace(GYOKER + '/', '')} (dátum: ${ma}, verzió: ${verzio})`);
