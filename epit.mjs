// Az oldal felépítése: node epit.mjs            → web/ (éles, Cloudflare Pages ezt szolgálja ki)
//                      node epit.mjs --elonezet → elonezet/ (relatív linkek, bármilyen tárhelyen vagy fájlként is megy)
import { mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { betoltAdat, olvas, maBudapest, GYOKER } from './forras/adat.mjs';
import * as O from './forras/oldalak.mjs';

const elonezet = process.argv.includes('--elonezet');
const KI = join(GYOKER, elonezet ? 'elonezet' : 'web');
const cfg = olvas('config.json');
const adat = betoltAdat();
const ma = maBudapest();
const ev = Number(ma.slice(0, 4));

// Figyelmeztetés, ha élesítés előtt hiányzik valami
const hianyzik = [];
if (!cfg.uzemelteto.nev) hianyzik.push('üzemeltető neve');
if (!cfg.uzemelteto.szekhely) hianyzik.push('székhely');
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
let jsOssz = '';
for (const f of ['szamitas', 'megjelenites', 'app']) {
  const forras = readFileSync(join(GYOKER, `forras/js/${f}.mjs`), 'utf8').replace(/from '\.\/(\w+)\.mjs'/g, "from './$1.js'");
  writeFileSync(join(KI, `assets/js/${f}.js`), forras);
  jsOssz += forras;
}
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
  ['adasveteli-szerzodes-minta/', O.adasveteliOldal(k)],
  ['autom/', O.automOldal(k)],
  ['forrasok/', O.forrasokOldal(k)],
  ['valtozasok/', O.valtozasokOldal(k)],
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
  writeFileSync(join(KI, 'robots.txt'), cfg.eles ? `User-agent: *\nAllow: /\n\nSitemap: ${cfg.domain}/sitemap.xml\n` : `# Munkaverzió: egyetlen oldal se kerüljön keresőbe.\nUser-agent: *\nAllow: /\n`);
  const urlek = oldalak.map(([ut]) => `<url><loc>${cfg.domain}/${ut}</loc><lastmod>${ma}</lastmod></url>`).join('\n');
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

# A Cloudflare próbacímei ne kerüljenek a keresőkbe, ha már saját domain van
https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
`);
  const lf = Object.entries(adat.uzemanyag.evek).flatMap(([e, h]) => Object.keys(h).map((x) => `${e}-${x}`)).pop();
  writeFileSync(join(KI, 'llms.txt'), `# ${cfg.marka}\n\n> Ingyenes magyar autós kalkulátorok a NAV közzétett tételeivel. A számítás képlete minden eredménynél látszik.\n\n## Kalkulátorok\n- [Gépjárműadó-kalkulátor](${cfg.domain}/gepjarmuado-kalkulator/): ${Object.keys(adat.tetelek.gepjarmuado).join(', ')}. évi tételek\n- [Átírási illeték kalkulátor](${cfg.domain}/atirasi-illetek-kalkulator/): illeték, okmányok, regisztrációs adó\n- [Kilométertérítés-kalkulátor](${cfg.domain}/kilometerterites-kalkulator/): NAV-üzemanyagár (legfrissebb: ${lf}), fogyasztási normák\n\n## Források\n- [Források és frissítés](${cfg.domain}/forrasok/)\n`);
}

console.log(`Kész: ${oldalak.length + 1} oldal → ${KI.replace(GYOKER + '/', '')} (dátum: ${ma}, verzió: ${verzio})`);
