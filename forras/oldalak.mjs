// Az oldalak. Minden szám az adatfájlokból jön, a szöveg a SZOVEG_STILUS.md szerint.
import * as S from './js/szamitas.mjs';
import * as M from './js/megjelenites.mjs';
import { oldal, oldalfej, forgalmi, elszamolas, sor, szamMezo, negyzetek, jelolo, valaszto, egysegValto, HAJTASOK, gyik, gyikLd, morzsaLd, alkalmazasLd, forrasLista, tovabb, datumHu, fmt, honapHu } from './sablon.mjs';

function evek(k) {
  const gj = k.adat.tetelek.gepjarmuado;
  const ismert = Object.keys(gj).map(Number).sort();
  const aktualis = gj[k.ev] ? k.ev : ismert.filter((e) => e <= k.ev).pop() ?? ismert[0];
  return { aktualis, jovo: gj[aktualis + 1] ? aktualis + 1 : null, ismert };
}
function arDatum(adat, ev, h) {
  const kz = adat.uzemanyag.kozzeteve?.[`${ev}-${h}`];
  if (kz) return `közzétéve: ${datumHu(kz)}`;
  const a = adat.uzemanyag.atveve?.[`${ev}-${h}`];
  return a ? `átvéve: ${datumHu(a)}` : '';
}
/** „Kilowattonként 5 forinttal emelkedik a 0–11 éves autók adója, a 12. évtől marad.” */
function valtozasMondat(a, b) {
  const d = b.map((x, i) => x - a[i]);
  const max = Math.max(...d);
  if (max <= 0) return 'A tételek nem emelkednek.';
  const elso = d.findIndex((x, i) => d.slice(i).every((y) => y === 0));
  const egyforma = d.filter((x) => x > 0).every((x) => x === max);
  let m = `Kilowattonként ${egyforma ? '' : 'legfeljebb '}${max} forinttal emelkedik`;
  m += elso > 0 ? ` a fiatalabb autók adója, a ${['', '4.', '8.', '12.', '16.'][elso]} naptári évtől viszont nem változik.` : ' minden korsávban.';
  return m;
}
export function phevSzoveg(ev) {
  return ev <= 2026
    ? 'A 2025. január 1. előtt forgalomba helyezett, „5P” vagy „5N” jelzésű plug-in hibrid 2026. december 31-ig mentes. A később forgalomba helyezettek már a teljesítményük szerint fizetnek, ahogy a nem tölthető hibridek is.'
    : 'A régebbi plug-in hibridek átmeneti mentessége 2026. december 31-én lejárt, így minden plug-in hibrid a teljesítménye szerint fizet, ahogy a nem tölthető hibridek is.';
}

/* ======================= FŐOLDAL ======================= */
export function fooldal(k) {
  const { adat } = k;
  const { aktualis, jovo } = evek(k);
  const alap = { kw: 85, gyartasiEv: 2019, hajtas: 'benzin', cm3: 1598 };
  const lf = S.legfrissebbHonap(adat);

  const tartalom = (L) => {
    const linkek = {
      gjado: (ev) => L.l('gepjarmuado-kalkulator/', `?ev=${ev}&kw=${alap.kw}&gyartasiEv=${alap.gyartasiEv}&hajtas=${alap.hajtas}`),
      atiras: L.l('atirasi-illetek-kalkulator/', `?kw=${alap.kw}&gyartasiEv=${alap.gyartasiEv}&hajtas=${alap.hajtas}`),
      km: L.l('kilometerterites-kalkulator/', `?uzemanyag=${alap.hajtas}&cm3=${alap.cm3}`),
    };
    let jovoreBlokk = '';
    if (jovo) {
      const a = adat.tetelek.gepjarmuado[aktualis], b = adat.tetelek.gepjarmuado[jovo];
      const ra = adat.tetelek.regado_alap;
      const pa = S.gepjarmuado(adat, { ev: aktualis, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' });
      const pb = S.gepjarmuado(adat, { ev: jovo, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' });
      jovoreBlokk = `<section class="szakasz"><div class="keret jovore">
<div class="szoveg">
<h2>${M.rag(jovo, 'ban', 'ben')} ennyi lesz a gépjárműadó</h2>
<p>A NAV ${M.datumNapon(b.kozzeteve)} közzétette a jövő évi tételeket. ${valtozasMondat(a.savok, b.savok)}${ra[jovo] && ra[aktualis] && ra[jovo].ft !== ra[aktualis].ft ? ` A behozott autók regisztrációs adójának alapja ${fmt(ra[aktualis].ft)} forintról ${fmt(ra[jovo].ft)} forintra nő.` : ''}</p>
<p>Ha az autód közben idősebb korsávba lép, jövőre kevesebbet fizetsz. Egy 2019-es, 85 kW-os autó adója ${M.rag(aktualis, 'ban', 'ben')} ${M.ftx(pa.fizetendo)}, ${M.rag(jovo, 'ban', 'ben')} ${M.ftx(pb.fizetendo)}.</p>
<p><a href="${L.l('gepjarmuado-kalkulator/', `?ev=${jovo}`)}">Számold ki a sajátodat ${M.rag(jovo, 'ra', 're')}</a></p>
</div>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Az autó kora</th><th>${aktualis}</th><th>${jovo}</th></tr></thead><tbody>
${a.savok.map((x, i) => `<tr><td>${S.GJADO_SAV_ROVID[i]}</td><td>${x} Ft/kW</td><td>${b.savok[i]} Ft/kW</td></tr>`).join('')}
</tbody><caption>Gépjárműadó kilowattonként. A kort a gyártási évtől naptári években számoljuk.</caption></table></div>
</div></section>`;
    }

    return `
${oldalfej(L, { cim: 'Mit kér a NAV az autódért?', bevezeto: `Írd be, ami a forgalmi engedélyedben áll. Mellette rögtön látod az ${jovo ? `idei és a jövő évi` : 'idei'} gépjárműadót, az átírás díját és a kilométertérítést.`, fo: true })}
<div class="keret asztal">
${forgalmi({
  kalk: 'gyors', cim: 'A forgalmi engedélyből', al: 'a kártya hátoldalán',
  extra: ` data-gjado="${L.l('gepjarmuado-kalkulator/')}" data-atiras="${L.l('atirasi-illetek-kalkulator/')}" data-km="${L.l('kilometerterites-kalkulator/')}"`,
  tartalom: `
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', ertek: alap.kw, min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', ertek: alap.gyartasiEv, min: 1950, max: aktualis + 1, sugo: 'Ha a forgalmiban nem találod, a törzskönyvben biztosan szerepel.' }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, alap.hajtas))}
${sor('P.1', szamMezo({ id: 'cm3', cim: 'Hengerűrtartalom', me: 'cm³', ertek: alap.cm3, min: 50, sugo: 'Csak a kilométertérítéshez kell.' }), ' data-mutat="hajtas=benzin|hajtas=dizel|hajtas=hibrid|hajtas=plugin"')}`,
})}
${elszamolas(k, M.gyorsPanel(adat, alap, { ev: aktualis, ma: k.ma, linkek }), { gombok: false, labjegy: 'Bármelyik sorra kattintva a részletes kalkulátor nyílik meg, ugyanezekkel az adatokkal.' })}
</div>

<section class="szakasz"><div class="keret">
<h2>Részletesen</h2>
<ul class="lista">
<li><a href="${L.l('gepjarmuado-kalkulator/')}"><h3>Gépjárműadó</h3><p>Korsávok, mentességek, plug-in hibridek, év közben forgalomba helyezett autók${jovo ? `, ${aktualis} és ${jovo}` : ''}.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('atirasi-illetek-kalkulator/')}"><h3>Átírás</h3><p>Illeték, eredetiségvizsgálat, forgalmi és törzskönyv. Külföldről hozott autónál a regisztrációs adó is.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('kilometerterites-kalkulator/')}"><h3>Kilométertérítés</h3><p>Hivatali út a NAV ${M.honapBan(lf.honap).replace(/ban$|ben$/, 'i')} árával és a fogyasztási normával, munkába járás ${adat.szabalyok.km.munkaba_jaras_ft_km} Ft/km-rel.</p><span class="ugrik">Kiszámolom</span></a></li>
</ul>
<p class="kesz">Készül: fenntartási költség, benzines vagy villanyautó, maradványérték, autóhitel, és hogy megérje-e lecserélni az autót.</p>
</div></section>
${jovoreBlokk}`;
  };

  return oldal(k, {
    cim: `Autós kalkulátorok ${aktualis}: gépjárműadó, átírás, kilométertérítés`,
    leiras: `Írd be a forgalmi engedély adatait, és megmutatjuk a gépjárműadót ${jovo ? `${M.rag(aktualis, 'ra', 're')} és ${M.rag(jovo, 'ra', 're')}` : M.rag(aktualis, 'ra', 're')}, az átírás díját és a kilométertérítést a NAV tételeivel.`,
    ut: '', tartalom,
    adatJson: { tetelek: adat.tetelek, szabalyok: { okmanyok: adat.szabalyok.okmanyok, km: adat.szabalyok.km, hataridok: adat.szabalyok.hataridok }, uzemanyag: { evek: adat.uzemanyag.evek }, ev: aktualis, ma: k.ma },
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: k.cfg.marka, url: `${k.cfg.domain}/`, inLanguage: 'hu' }],
  });
}

/* ======================= GÉPJÁRMŰADÓ ======================= */
export function gepjarmuadoOldal(k) {
  const { adat } = k;
  const { aktualis, jovo, ismert } = evek(k);
  const ut = 'gepjarmuado-kalkulator/';
  const lathato = ismert.filter((e) => e >= aktualis);
  const alap = { ev: aktualis, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', evkozbenHonap: 0 };
  const r = S.gepjarmuado(adat, alap);
  const t = adat.tetelek.gepjarmuado;
  const ra = t[aktualis], rb = jovo ? t[jovo] : null;
  const jr = jovo ? S.gepjarmuado(adat, { ...alap, ev: jovo }) : null;

  const kerdesek = [
    { k: `Mennyi a gépjárműadó ${M.rag(aktualis, 'ban', 'ben')}?`, v: [`A teljesítményt (kW) szorozzák az autó korához tartozó tétellel. ${M.rag(aktualis, 'ban', 'ben')} ez ${ra.savok[0]} Ft/kW a gyártási évben és az azt követő három évben, a 16. naptári évtől ${ra.savok[4]} Ft/kW. Egy 2019-es, 85 kW-os autó adója ${M.ftx(r.fizetendo)}.`] },
    ...(jovo ? [{ k: `Mennyi lesz a gépjárműadó ${M.rag(jovo, 'ban', 'ben')}?`, v: [`A NAV ${M.datumNapon(rb.kozzeteve)} közzétette a tételeket: korsávonként ${rb.savok.join(', ')} Ft/kW. Ugyanez a 2019-es autó ${M.rag(jovo, 'ban', 'ben')} a következő korsávba lép (${S.GJADO_SAV_ROVID[jr.sav]}), ezért ${M.ftx(jr.fizetendo)}-ot fizet.`] }] : []),
    { k: 'Hogyan lesz a lóerőből kW?', v: ['Osszuk el 1,36-tal, és kerekítsünk: 115 lóerő nagyjából 85 kW. A forgalmi engedély P.2 sorában eleve kW szerepel.'] },
    { k: 'Kell fizetni elektromos autó után?', v: ['Nem. A tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó mentes, és ezért nem kell semmit intézni: a NAV a nyilvántartásból tudja, és nem vet ki adót.'] },
    { k: 'Mi a helyzet a plug-in hibridekkel?', v: [phevSzoveg(aktualis)] },
    { k: 'Mikor és hogyan kell befizetni?', v: ['A NAV márciusban küldi a határozatot. Az adót egy összegben április 15-ig kell befizetni, a határozatban lévő linken, a NAV-Mobilban vagy átutalással. Magánszemélyek és egyéni vállalkozók legfeljebb öthavi, pótlékmentes részletfizetést kérhetnek.', 'Ha az adókötelezettség év közben kezdődik, például új autó forgalomba helyezésekor, a határozat véglegessé válásától számított 15 napon belül kell fizetni.'] },
    { k: 'Ki fizet, ha év közben eladom az autót?', v: ['A NAV az év eleji nyilvántartás szerint vet ki adót, ezért az adott évet általában még az eladó fizeti, a vevő a következő évtől. Ha másképp osztanátok el, írjátok bele az adásvételi szerződésbe.'] },
  ];
  const honapok = S.HONAPOK.map((h, i) => [i + 1, h]);
  const leiras = `Gépjárműadó ${aktualis}${jovo ? ` és ${jovo}` : ''}: a kW és a gyártási év alapján kiszámoljuk az éves adót a NAV tételeivel. Elektromos és plug-in hibrid mentesség, év közbeni forgalomba helyezés.`;

  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Gépjárműadó'], cim: `Gépjárműadó ${aktualis}${jovo ? ` és ${jovo}` : ''}`, bevezeto: 'A teljesítmény és a gyártási év kell hozzá. Az adót a NAV határozatban közli, és április 15-ig kell befizetni.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'gepjarmuado', cim: 'Az autó adatai', tartalom: `
${lathato.length > 1 ? sor('', negyzetek('ev', 'Melyik évre?', lathato.map((e) => [e, String(e)]), aktualis)) : `<input type="hidden" name="ev" value="${aktualis}">`}
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', ertek: 85, min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', ertek: 2019, min: 1950, max: aktualis + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, 'benzin'))}
${lathato.some((e) => e <= 2026) ? sor('B', jelolo('phevRegi', '2025. január 1. előtt helyezték forgalomba', 'Az „5P” és „5N” jelzésű plug-in hibrid ekkor 2026 végéig mentes.'), ' data-mutat="hajtas=plugin"') : ''}
<fieldset><legend>Ha rád is vonatkozik</legend>
${sor('', jelolo('evkozben', 'Az idén került forgalomba', 'Új vagy behozott autó. A forgalomba helyezést követő hónaptól kell fizetni.'))}
<div class="sor" data-mutat="evkozben"><span class="kod ures"></span><div class="mezo">${valaszto('evkozbenHonap', 'Melyik hónapban?', honapok, 3)}</div></div>
${sor('', jelolo('mozgaskorlatozott', 'Súlyos mozgáskorlátozott vagyok', 'Egy legfeljebb 100 kW-os autóra évi 13 000 forintig nem kell adót fizetni.'))}
</fieldset>` })}
${elszamolas(k, M.gjadoPanel(adat, r, alap))}
</div>

<div class="keret"><article class="cikk">
<h2 id="tetelek">Így számol a NAV</h2>
<p>Az adó alapja a forgalmi engedély P.2 sorában szereplő teljesítmény. A tétel attól függ, hány naptári év telt el a gyártás éve óta, és az idősebb autó után kevesebbet kell fizetni.</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Az autó kora</th><th>${aktualis}</th>${rb ? `<th>${jovo}</th>` : ''}<th>100 kW-os autó, ${aktualis}</th></tr></thead><tbody>
${ra.savok.map((x, i) => `<tr data-sav="${i}"${i === r.sav ? ' class="kiemelt"' : ''}><td>${S.GJADO_SAVOK[i][0].toUpperCase()}${S.GJADO_SAVOK[i].slice(1)}</td><td>${x} Ft/kW</td>${rb ? `<td>${rb.savok[i]} Ft/kW</td>` : ''}<td>${M.ftx(100 * x)}</td></tr>`).join('')}
</tbody><caption>A NAV közzétette: a ${aktualis}. évi tételeket ${datumHu(ra.kozzeteve)}${rb ? `, a ${jovo}. évieket ${datumHu(rb.kozzeteve)}` : ''}</caption></table></div>
<h2>Kinek nem kell fizetnie?</h2>
<ul>
<li><strong>Elektromos autó.</strong> Az „5E” és „5Z” környezetvédelmi osztályú autó mentes.</li>
<li><strong>Plug-in hibrid.</strong> ${phevSzoveg(aktualis)}</li>
<li><strong>Súlyos mozgáskorlátozott személy.</strong> Egy legfeljebb 100 kW-os autója után évi 13 000 forintig mentes. A kedvezményt a NAV-nál kell kérni.</li>
</ul>
<p>A nem tölthető hibrid nem mentes, ugyanúgy a teljesítménye szerint fizet, mint a benzines vagy a dízeles autó.</p>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: 'NAV: a gépjárműadó számítása', url: 'https://nav.gov.hu/gepjarmuado/az-ado-szamitasa', d: `${aktualis}. évi tételek` },
  ...(rb ? [{ nev: `NAV: belföldi gépjárműadó ${jovo}. évre valorizált mértéke`, url: rb.forras, d: `közzétéve: ${datumHu(rb.kozzeteve)}` }] : []),
  { nev: 'NAV 95. információs füzet: a belföldi gépjárművek adója', url: 'https://nav.gov.hu/pfile/file?path=%2Fugyfeliranytu%2Fnezzen-utana%2Finf_fuz%2Frejtett%2FInformacios-fuzetek---Aktualis%2F95.-informacios-fuzet--a-belfoldi-gepjarmuvek-adoja', d: 'mentességek, kedvezmények, befizetés' },
])}
${tovabb(L, ut)}
</article></div>`;

  return oldal(k, {
    cim: `Gépjárműadó ${aktualis}${jovo ? ` és ${jovo}` : ''}: kalkulátor a NAV tételeivel`,
    leiras, ut, tartalom,
    adatJson: { tetelek: { gepjarmuado: t, gepjarmuado_mozgaskorlatozott: adat.tetelek.gepjarmuado_mozgaskorlatozott } },
    jsonld: [alkalmazasLd(k.cfg, 'Gépjárműadó-kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Gépjárműadó', ut }])],
  });
}

/* ======================= ÁTÍRÁS ======================= */
export function atirasOldal(k) {
  const { adat } = k;
  const { aktualis, jovo } = evek(k);
  const ut = 'atirasi-illetek-kalkulator/';
  const alap = { ev: aktualis, datum: k.ma, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', szerzes: 'vetel', hanyad: 100, behozott: false, eredetiseg: true, postazas: true };
  const r = S.atiras(adat, alap);
  const il = S.evAdat(adat.tetelek.illetek, aktualis);
  const ilJovo = jovo ? adat.tetelek.illetek[jovo] : null;
  const ok = adat.szabalyok.okmanyok;
  const ra = adat.tetelek.regado_alap;
  const regAlap = S.evAdat(ra, aktualis);
  const sz = adat.tetelek.regado_szorzok;
  const kcs = adat.tetelek.regado_korcsokkentes;
  const kcsSorok = [];
  let tol = 0;
  for (const [ig, p] of kcs) { kcsSorok.push([ig === null ? `${tol + 1}. hónaptól` : tol === 0 ? `legfeljebb ${ig} hónap` : `${tol + 1}–${ig} hónap`, `${p}%`]); tol = ig; }
  const fel = Math.ceil(kcsSorok.length / 2);
  const pelda = S.illetek(adat, { ev: aktualis, kw: 100, gyartasiEv: aktualis, hajtas: 'hagyomanyos', szerzes: 'vetel' });
  const regPelda = S.regado(adat, { datum: `${aktualis}-10-01`, elsoForgalom: `${aktualis - 8}-04-01`, kw: 85, osztaly: '15', hajtas: 'hagyomanyos' });

  const kerdesek = [
    { k: `Mennyi az átírási illeték ${M.rag(aktualis, 'ban', 'ben')}?`, v: [`A teljesítmény (kW) szorozva egy ${Math.min(...il.tabla.flat())} és ${Math.max(...il.tabla.flat())} Ft/kW közötti tétellel, amely a teljesítménytől és az autó korától függ. Egy új, 100 kW-os autó illetéke ${M.ftx(pelda.osszeg)}, egy 2019-es, 85 kW-osé ${M.ftx(r.illetek.osszeg)}.`] },
    { k: 'Ki fizeti az illetéket?', v: ['A vevő. Ha többen veszitek meg az autót, mindenki a saját tulajdoni hányada után fizet.'] },
    { k: 'Kell illetéket fizetni elektromos vagy hibrid autó után?', v: ['Az „5E” és „5Z” osztályú, vagyis tisztán elektromos és nulla emissziós autó után nem. A hibrid és a plug-in hibrid után igen.'] },
    { k: 'Mennyi az illeték, ha ajándékba kapom vagy öröklöm az autót?', v: ['A vásárlási illeték kétszerese. Ha szülőtől, nagyszülőtől, gyermektől, unokától vagy a házastársadtól kapod vagy veszed, nem kell illetéket fizetni.'] },
    { k: 'Mennyi a regisztrációs adó egy külföldről hozott autónál?', v: [`Az alapösszeg (${M.rag(aktualis, 'ban', 'ben')} ${M.ftx(regAlap.ft)}) szorozva a teljesítményhez és a környezetvédelmi osztályhoz tartozó szorzóval, majd csökkentve az autó kora szerint. Egy 2021 előtt forgalomba helyezett, „15”-ös osztályú, 85 kW-os, 90 hónapos autónál ${M.ftx(regPelda.osszeg)}.`] },
    { k: 'Meddig kell átíratni az autót?', v: [`A szerződéskötéstől számított ${adat.szabalyok.hataridok.atiras_napok} napon belül. Az eredetiségvizsgálat a vizsgálat napjától 60 napig használható fel.`] },
  ];
  const leiras = `Átírási illeték ${aktualis}: illeték, eredetiségvizsgálat, forgalmi és törzskönyv egy összegben, külföldről hozott autónál regisztrációs adóval. A NAV tételeivel.`;

  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Átírás'], cim: 'Mennyibe kerül az átírás?', bevezeto: 'Illeték, eredetiségvizsgálat, forgalmi és törzskönyv egy összegben. Ha külföldről hozod az autót, a regisztrációs adóval együtt.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'atiras', cim: 'Az átírás adatai', extra: ' data-mai-datum="datum"', tartalom: `
<fieldset><legend>A vásárlás</legend>
${sor('', negyzetek('honnan', 'Honnan jön az autó?', [['hazai', 'Magyar rendszámos'], ['kulfold', 'Külföldről hozom be']], 'hazai'))}
${sor('', valaszto('szerzes', 'Hogyan lesz a tiéd?', [['vetel', 'Megveszem'], ['ajandek', 'Ajándékba kapom vagy öröklöm'], ['kozeli', 'Szülőtől, gyermektől, házastárstól']], 'vetel'))}
${sor('', `<label for="datum">Az átírás napja</label><input id="datum" name="datum" type="date" value="${k.ma}">`)}
</fieldset>
<fieldset><legend>Az autó</legend>
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', ertek: 85, min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', ertek: 2019, min: 1950, max: aktualis + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, 'benzin'))}
${sor('V.9', valaszto('osztaly', 'Környezetvédelmi osztály', [['15', '„15” vagy jobb (Euro 6)'], ['12', '„12”–„14” (Euro 4–5)'], ['9', '„9”–„11” (Euro 3)'], ['8', '„8” vagy rosszabb']], '15', 'A külföldi papírok alapján a vizsgálóállomás állapítja meg.'), ' data-mutat="honnan=kulfold"')}
${sor('B', `<label for="elsoForgalom">Első forgalomba helyezés</label><input id="elsoForgalom" name="elsoForgalom" type="date" value="${aktualis - 7}-03-01"><span class="sugo">Külföldön, a külföldi forgalmi szerint.</span>`, ' data-mutat="honnan=kulfold"')}
</fieldset>
<fieldset><legend>Vizsgálat és okmányok</legend>
${sor('', jelolo('eredetiseg', 'Eredetiségvizsgálat kell', 'Ha 60 napon belül már volt, vedd ki a pipát.', true))}
<div class="sor" data-mutat="eredetiseg"><span class="kod ures"></span><div class="mezo">${szamMezo({ id: 'eredetisegDij', cim: 'A vizsgálat díja', me: 'Ft', ertek: ok.eredetisegvizsgalat_alap, sugo: `A hengerűrtartalomtól függ: ${M.ftx(ok.eredetisegvizsgalat_min)} és ${M.ftx(ok.eredetisegvizsgalat_max)} között.` })}</div></div>
${sor('', jelolo('postazas', 'Postán kérem a törzskönyvet', `${M.ftx(ok.torzskonyv_postazas)}.`, true))}
${sor('', szamMezo({ id: 'hanyad', cim: 'Tulajdoni hányad', me: '%', ertek: 100, min: 1, max: 100, sugo: 'Ha többen veszitek meg, a saját részed.' }))}
${sor('', szamMezo({ id: 'vetelar', cim: 'Vételár, ha összesíteni szeretnéd', me: 'Ft', placeholder: '0' }))}
</fieldset>` })}
${elszamolas(k, M.atirasPanel(adat, r, alap))}
</div>

<div class="keret"><article class="cikk">
<h2 id="tetelek">Az illeték tételei</h2>
<p>Az illeték a teljesítménytől és az autó korától függ, a kort a gyártási évtől számítjuk.${ilJovo && JSON.stringify(ilJovo.tabla) === JSON.stringify(il.tabla) ? ` ${M.rag(jovo, 'ban', 'ben')} a tételek nem változnak.` : ''}</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Teljesítmény</th>${S.ILLETEK_KOR_SAVOK.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>
${il.tabla.map((s, i) => `<tr><td>${S.ILLETEK_KW_SAVOK[i]}</td>${s.map((x, j) => `<td data-ill="${i}-${j}"${r.illetek.sor === i && r.illetek.oszlop === j ? ' class="kiemelt"' : ''}>${x} Ft/kW</td>`).join('')}</tr>`).join('')}
</tbody><caption>Vagyonszerzési illeték, ${il.ev}. A NAV közzétette: ${datumHu(il.kozzeteve)}</caption></table></div>
<h2>Vizsgálat és okmányok</h2>
<div class="tabla-tarto"><table class="tabla"><tbody>
<tr><td>Eredetiségvizsgálat, a hengerűrtartalomtól függően</td><td>${M.ftx(ok.eredetisegvizsgalat_min)}–${M.ftx(ok.eredetisegvizsgalat_max)}</td></tr>
<tr><td>Forgalmi engedély</td><td>${M.ftx(ok.forgalmi_engedely)}</td></tr>
<tr><td>Törzskönyv</td><td>${M.ftx(ok.torzskonyv)}</td></tr>
<tr><td>A törzskönyv postázása</td><td>${M.ftx(ok.torzskonyv_postazas)}</td></tr>
</tbody><caption>${ok.forras.nev}</caption></table></div>
<h2>Regisztrációs adó, ha külföldről hozod</h2>
<p>A behozott autó első hazai forgalomba helyezése előtt regisztrációs adót is kell fizetni. Az összeg a teljesítménytől és a környezetvédelmi osztálytól függ, és az autó korával csökken. A hibrid és a plug-in hibrid mindig a legkedvezőbb oszlopba kerül, az elektromos autó mentes.</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Teljesítmény</th>${sz.oszlopok.map((o) => `<th>${o}</th>`).join('')}</tr></thead><tbody>
${sz.tabla.map((s, i) => `<tr><td>${S.REGADO_SOR_NEV[i]}</td>${s.map((x) => `<td>${fmt(x * regAlap.ft)}</td>`).join('')}</tr>`).join('')}
</tbody><caption>Forintban, a korcsökkentés előtt, ${regAlap.ev}. Oszlopok: ${Object.entries(S.REGADO_OSZLOP_NEV).map(([a, b]) => `${a}: ${b}`).join('; ')}.</caption></table></div>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Az autó kora</th><th>Csökkentés</th><th style="text-align:left;padding-left:28px">Az autó kora</th><th>Csökkentés</th></tr></thead><tbody>
${kcsSorok.slice(0, fel).map((a, i) => { const b = kcsSorok[fel + i]; return `<tr><td>${a[0]}</td><td>${a[1]}</td><td style="text-align:left;padding-left:28px">${b ? b[0] : ''}</td><td>${b ? b[1] : ''}</td></tr>`; }).join('')}
</tbody><caption>Az első forgalomba helyezéstől számítva; minden megkezdett hónap egésznek számít.</caption></table></div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: `NAV-közlemény a ${il.ev}. évi valorizált adómértékekről`, url: il.forras, d: `közzétéve: ${datumHu(il.kozzeteve)}` },
  ...(ilJovo ? [{ nev: `A ${jovo}. évi tételek (ABT-összefoglaló a NAV közleménye alapján)`, url: ilJovo.forras, d: `közzétéve: ${datumHu(ilJovo.kozzeteve)}` }] : []),
  ...(ra[jovo] ? [{ nev: `NAV: regisztrációs adó ${jovo}. évre valorizált mértéke`, url: ra[jovo].forras, d: M.ftx(ra[jovo].ft) }] : []),
  { nev: ok.forras.nev, url: ok.forras.url },
])}
${tovabb(L, ut)}
</article></div>`;

  return oldal(k, {
    cim: `Átírási illeték ${aktualis}: mennyibe kerül az autó átírása?`,
    leiras, ut, tartalom,
    adatJson: { tetelek: { illetek: adat.tetelek.illetek, regado_alap: ra, regado_szorzok: sz, regado_korcsokkentes: kcs }, szabalyok: { okmanyok: ok, hataridok: adat.szabalyok.hataridok } },
    jsonld: [alkalmazasLd(k.cfg, 'Átírási illeték kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Átírás', ut }])],
  });
}

/* ======================= KILOMÉTERTÉRÍTÉS ======================= */
export function kmOldal(k) {
  const { adat } = k;
  const ut = 'kilometerterites-kalkulator/';
  const lf = S.legfrissebbHonap(adat);
  const km = adat.szabalyok.km;
  const alap = { mod: 'kikuldetes', km: 100, odaVissza: false, uzemanyag: 'benzin', motor: 'benzin', cm3: 1598, ev: lf.ev, honap: lf.honap };
  const r = S.kikuldetes(adat, alap);
  const ar = adat.uzemanyag.evek[lf.ev][lf.honap];
  const honapLista = [];
  for (const ev of Object.keys(adat.uzemanyag.evek).map(Number).sort((a, b) => b - a)) for (const h of Object.keys(adat.uzemanyag.evek[ev]).map(Number).sort((a, b) => b - a)) honapLista.push([ev, h]);
  const nb = km.norma_benzin, nd = km.norma_dizel;
  const hat = (t, i) => (t[i][0] === null ? `${t[i - 1][0]} cm³ felett` : i === 0 ? `${t[i][0]} cm³-ig` : `${t[i - 1][0] + 1}–${t[i][0]} cm³`);
  const honapi = M.honapBan(lf.honap).replace(/ban$|ben$/, 'i');

  const kerdesek = [
    { k: `Mennyi a kilométertérítés ${M.rag(lf.ev, 'ban', 'ben')}?`, v: [`Hivatali útnál két részből áll: az üzemanyagból (a fogyasztási norma szorozva a NAV havi árával) és a ${km.normakoltseg_ft_km} Ft/km-es normaköltségből. 100 km egy 1,6-os benzines autóval ${M.honapBan(lf.honap)} ${M.ftx(r.osszesen)}, vagyis ${M.tized(r.ftKm)} Ft/km.`] },
    { k: 'Melyik hónap NAV-árával kell számolni?', v: ['Azzal, amelyikben az út volt. A NAV minden hónap vége felé közzéteszi a következő hónap árát. A számla szerinti árral is el lehet számolni.'] },
    { k: 'Hogyan számol a hibrid és az elektromos autó?', v: [`A plug-in hibrid a belső égésű motor alapnormájának ${Math.round(km.plugin_szorzo * 100)}%-ával, az elektromos autó 100 km-enként ${km.elektromos_benzin_l_100km} liter benzinnel számol, a benzin NAV-árán. A nem tölthető hibridre a benzines vagy dízeles alapnorma vonatkozik.`, `Az LPG-s autó normája a benzines ${M.tized(km.lpg_szorzo)}-szerese, a CNG-sé literenként ${M.tized(km.cng_kg_per_l, 2)} kg.`] },
    { k: 'Mennyi jár a munkába járásért saját autóval?', v: [`Kilométerenként ${km.munkaba_jaras_ft_km} forint adható adómentesen a lakóhely és a munkahely közötti út oda-vissza távolságára. A munkáltatónak ez nem kötelező.`] },
    { k: 'Kell számla az elszámoláshoz?', v: ['Nem, ha a norma és a NAV-ár szerint számolsz: elég a kiküldetési rendelvény. Legyen rajta az út célja, a távolság és az autó adatai.'] },
  ];
  const leiras = `Kilométertérítés ${lf.ev}: kiküldetési rendelvény a fogyasztási normával és a NAV ${honapi} árával (benzin ${ar.benzin} Ft/l), plusz ${km.normakoltseg_ft_km} Ft/km normaköltség. Munkába járás ${km.munkaba_jaras_ft_km} Ft/km.`;

  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Kilométertérítés'], cim: `Kilométertérítés ${lf.ev}`, bevezeto: 'Ennyit fizethet ki adómentesen a munkáltató vagy a céged, ha saját autóval mész hivatali útra. A NAV havi üzemanyagárával és a fogyasztási normával számolunk.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'km', cim: 'Az út és az autó', tartalom: `
<div class="mod-valto" role="radiogroup" aria-label="Mit számolsz?"><label><input type="radio" name="mod" value="kikuldetes" checked><span>Hivatali út</span></label><label><input type="radio" name="mod" value="munka"><span>Munkába járás</span></label></div>
<div data-mutat="mod=kikuldetes">
${sor('', szamMezo({ id: 'km', cim: 'Távolság', me: 'km', ertek: 100, min: 1 }) + jelolo('odaVissza', 'Oda-vissza', 'A megadott távolság duplájával számolunk.'))}
${sor('', valaszto('honap', 'Melyik hónapban volt az út?', honapLista.map(([e, h]) => [`${e}-${h}`, honapHu(e, h)]), `${lf.ev}-${lf.honap}`, `A legfrissebb NAV-ár: ${honapHu(lf.ev, lf.honap)}.`))}
${sor('P.3', valaszto('uzemanyag', 'Üzemanyag', [['benzin', 'Benzin'], ['dizel', 'Dízel'], ['lpg', 'LPG'], ['cng', 'CNG'], ['plugin', 'Plug-in hibrid'], ['elektromos', 'Elektromos']], 'benzin'))}
${sor('', negyzetek('motor', 'A belső égésű motor', [['benzin', 'Benzines'], ['dizel', 'Dízeles']], 'benzin'), ' data-mutat="uzemanyag=plugin"')}
${sor('P.1', szamMezo({ id: 'cm3', cim: 'Hengerűrtartalom', me: 'cm³', ertek: 1598, min: 50 }), ' data-mutat="uzemanyag=benzin|uzemanyag=dizel|uzemanyag=lpg|uzemanyag=cng|uzemanyag=plugin"')}
<div data-vedett hidden>${sor('', jelolo('vedett', 'Védett árral számolok', 'Ebben a hónapban a NAV a magyar rendszámú autókra védett árat is közölt.'))}</div>
${sor('', szamMezo({ id: 'sajatAr', cim: 'Saját ár, ha számla szerint számolsz', me: 'Ft', placeholder: 'NAV-ár' }))}
</div>
<div data-mutat="mod=munka">
${sor('', szamMezo({ id: 'tav', cim: 'Lakóhely és munkahely távolsága', me: 'km', ertek: 25, min: 1, sugo: 'Egy irányban. A visszautat hozzászámoljuk.' }))}
${sor('', szamMezo({ id: 'napok', cim: 'Hány napot jársz be havonta?', me: 'nap', ertek: 20, min: 1, max: 31 }))}
</div>` })}
${elszamolas(k, M.kmPanel(adat, r, alap))}
</div>

<div class="keret"><article class="cikk">
<h2 id="nav-arak">A NAV üzemanyagárai</h2>
<p>A NAV minden hónapra közzéteszi, milyen áron lehet elszámolni az üzemanyagot. Ez nem a kúti ár, hanem három nagy forgalmazó előző hónap eleji árának átlaga. A táblázat magától frissül, amint megjelenik a következő hónap.</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Hónap</th><th>Benzin</th><th>Dízel</th><th>Keverék</th><th>LPG</th><th>CNG</th></tr></thead><tbody>
${honapLista.map(([e, h]) => { const x = adat.uzemanyag.evek[e][h]; const v = (kk) => `${x[kk] ?? '–'}${x[kk + '_vedett'] ? ` <span class="vedett">(védett: ${x[kk + '_vedett']})</span>` : ''}`; return `<tr data-arhonap="${e}-${h}"${e === lf.ev && h === lf.honap ? ' class="kiemelt"' : ''}><td>${honapHu(e, h)}</td><td>${v('benzin')}</td><td>${v('dizel')}</td><td>${x.keverek ?? '–'}</td><td>${x.lpg ?? '–'}</td><td>${x.cng ?? '–'}</td></tr>`; }).join('')}
</tbody><caption>Forint literenként, a CNG forint kilogrammonként. Forrás: <a href="${adat.uzemanyag.forras}" rel="noopener" target="_blank">NAV</a>${arDatum(adat, lf.ev, lf.honap) ? `, a legfrissebb hónap ${arDatum(adat, lf.ev, lf.honap)}` : ''}.</caption></table></div>
<h2>Fogyasztási normák</h2>
<p>Az alapnorma a hengerűrtartalomtól függ, 100 kilométerre. Az LPG-s autó normája a benzines ${M.tized(km.lpg_szorzo)}-szerese, a plug-in hibridé a belső égésű motor normájának ${Math.round(km.plugin_szorzo * 100)}%-a, az elektromos autóé 100 km-enként ${km.elektromos_benzin_l_100km} liter benzin.</p>
<div class="ket-tabla">
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Benzines</th><th>l/100 km</th></tr></thead><tbody>${nb.map((x, i) => `<tr><td>${hat(nb, i)}</td><td data-norma="benzin-${i}"${i === 2 ? ' class="kiemelt"' : ''}>${M.tized(x[1])}</td></tr>`).join('')}</tbody></table></div>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Dízeles</th><th>l/100 km</th></tr></thead><tbody>${nd.map((x, i) => `<tr><td>${hat(nd, i)}</td><td data-norma="dizel-${i}">${M.tized(x[1])}</td></tr>`).join('')}</tbody></table></div>
</div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([{ nev: 'NAV: alkalmazható üzemanyagárak', url: adat.uzemanyag.forras, d: 'havonta frissül' }, ...km.forrasok.map((f) => ({ nev: f.nev, url: f.url }))])}
${tovabb(L, ut)}
</article></div>`;

  return oldal(k, {
    cim: `Kilométertérítés ${lf.ev}: kalkulátor a NAV havi árával`,
    leiras, ut, tartalom,
    adatJson: { uzemanyag: { evek: adat.uzemanyag.evek }, szabalyok: { km } },
    jsonld: [alkalmazasLd(k.cfg, 'Kilométertérítés-kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Kilométertérítés', ut }])],
  });
}

/* ======================= FORRÁSOK ======================= */
export function forrasokOldal(k) {
  const { adat } = k;
  const ut = 'forrasok/';
  const al = adat.allapot;
  const lf = S.legfrissebbHonap(adat);
  const t = adat.tetelek;
  const sor2 = (nev, ertek, d) => `<tr><td>${nev}</td><td>${ertek}</td><td>${d || ''}</td></tr>`;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Források és frissítés'], cim: 'Honnan vannak a számok?', bevezeto: 'A NAV közleményeiből és a jogszabályokból. Minden tétel mellett ott a dátum, amikor megjelent, és az oldal minden reggel megnézi, jött-e új.' })}
<div class="keret"><article class="cikk" style="padding-top:20px">
<h2>Az adatok</h2>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Mi</th><th>Érték</th><th>Megjelent</th></tr></thead><tbody>
${sor2('NAV-üzemanyagár, legfrissebb hónap', honapHu(lf.ev, lf.honap), arDatum(adat, lf.ev, lf.honap).replace(/^.*: /, ''))}
${Object.entries(t.gepjarmuado).map(([e, v]) => sor2(`Gépjárműadó, ${e}`, `${v.savok.join(' / ')} Ft/kW`, datumHu(v.kozzeteve))).join('')}
${Object.entries(t.illetek).map(([e, v]) => sor2(`Átírási illeték, ${e}`, `${Math.min(...v.tabla.flat())}–${Math.max(...v.tabla.flat())} Ft/kW`, datumHu(v.kozzeteve))).join('')}
${Object.entries(t.regado_alap).map(([e, v]) => sor2(`Regisztrációs adó alapja, ${e}`, M.ftx(v.ft), datumHu(v.kozzeteve))).join('')}
${sor2('Forgalmi engedély, törzskönyv', `${M.ftx(adat.szabalyok.okmanyok.forgalmi_engedely)}, ${M.ftx(adat.szabalyok.okmanyok.torzskonyv)}`, '2025. február 1-jétől')}
${sor2('Normaköltség, munkába járás', `${adat.szabalyok.km.normakoltseg_ft_km} Ft/km, ${adat.szabalyok.km.munkaba_jaras_ft_km} Ft/km`, '')}
</tbody></table></div>
<h2>Hogyan frissül?</h2>
<p>Minden reggel lefut egy ellenőrzés. Megnézi a NAV üzemanyagár-oldalát, és ha megjelent a következő hónap, átveszi az árakat. Októbertől azt is figyeli, közzétette-e a NAV a jövő évi adótételeket.</p>
<p>Új számot csak akkor veszünk át, ha a NAV oldala a megszokott felépítésű, és minden érték ésszerű határok között van. Utána lefutnak a számítási tesztek, és csak ha mind rendben van, frissül az oldal. Ha valami nem stimmel, a korábbi, ellenőrzött adat marad kint, és mi értesítést kapunk.</p>
<p>A dátumtól függő részek, például hogy melyik év az alapértelmezett, minden nap újraszámolódnak, így január 1-jén az oldal magától átáll az új évre.</p>
<p class="halk">Legutóbbi ellenőrzés: ${al.utolso_ellenorzes ? `${datumHu(al.utolso_ellenorzes)}, ${al.utolso_ellenorzes.slice(11, 16)}` : datumHu(k.ma)}.${al.figyelmeztetesek?.length ? ` Nyitott jelzés: ${al.figyelmeztetesek.join(' ')}` : ''}</p>
<h2>Hibát találtál?</h2>
<p>${k.cfg.kapcsolat_email ? `Írj a ${k.cfg.kapcsolat_email} címre. Minden jelzést megnézünk, és ha javítunk, itt is jelezzük.` : 'A kapcsolati e-mail-cím hamarosan itt lesz.'}</p>
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, { cim: 'Honnan vannak a számok?', leiras: 'Az Autóköltség kalkulátorainak forrásai, a tételek megjelenési dátuma, és hogyan frissülnek automatikusan.', ut, tartalom, jsonld: [morzsaLd(k.cfg, [{ nev: 'Források', ut }])] });
}

/* ======================= JOGI OLDALAK ======================= */
const kitoltendo = (x) => x || '<em class="halk">kitöltés alatt</em>';

export function impresszumOldal(k) {
  const { cfg } = k;
  const u = cfg.uzemelteto;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Impresszum'], cim: 'Impresszum' })}
<div class="keret"><article class="cikk" style="padding-top:12px">
<div class="tabla-tarto"><table class="tabla"><tbody>
<tr><td>Weboldal</td><td>${cfg.domain.replace('https://', '')}</td></tr>
<tr><td>Üzemeltető</td><td>${kitoltendo(u.nev)}</td></tr>
<tr><td>Székhely</td><td>${kitoltendo(u.szekhely)}</td></tr>
<tr><td>Adószám</td><td>${kitoltendo(u.adoszam)}</td></tr>
<tr><td>Nyilvántartási szám</td><td>${kitoltendo(u.nyilvantartasi_szam)}</td></tr>
<tr><td>E-mail</td><td>${kitoltendo(cfg.kapcsolat_email)}</td></tr>
<tr><td>Tárhelyszolgáltató</td><td>${cfg.tarhely.nev}, ${cfg.tarhely.cim}</td></tr>
</tbody></table></div>
<h2>Felelősség</h2>
<p>A kalkulátorok a NAV és a jogszabályok közzétett adataival számolnak, és tájékoztató jellegűek. Nem minősülnek adó- vagy pénzügyi tanácsadásnak. A ténylegesen fizetendő adót és illetéket a NAV határozata tartalmazza. Az adatok pontosságára gondosan figyelünk, de a számítások alapján hozott döntésekért nem vállalunk felelősséget.</p>
</article></div>`;
  return oldal(k, { cim: 'Impresszum', leiras: `A(z) ${cfg.marka} üzemeltetőjének és tárhelyszolgáltatójának adatai.`, ut: 'impresszum/', tartalom });
}

export function adatvedelemOldal(k) {
  const { cfg } = k;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Adatvédelem'], cim: 'Adatvédelem', bevezeto: 'Nem gyűjtünk rólad adatot. A kalkulátorok a böngésződben számolnak, amit beírsz, az nem jut el hozzánk.' })}
<div class="keret"><article class="cikk" style="padding-top:12px">
<h2>Sütik és követés</h2>
<p>Nem használunk sütit, statisztikai vagy követőkódot, és jelenleg hirdetés sincs az oldalon. A betűtípusokat is magunk szolgáljuk ki, így más cég sem értesül a látogatásodról. Ha ezen valaha változtatunk, előbb itt jelezzük, és csak a hozzájárulásoddal kapcsolunk be bármit.</p>
<h2>Szervernapló</h2>
<p>Az oldalt a ${cfg.tarhely.nev} (${cfg.tarhely.cim}) szolgálja ki. Mint minden tárhelyszolgáltató, technikai naplót vezet a kérésekről (például IP-cím, időpont, böngésző), a szolgáltatás biztonsága és működése érdekében. Ezeket mi nem használjuk, és nem kötjük személyhez.</p>
<h2>Adatkezelő és jogaid</h2>
<p>Adatkezelő: ${kitoltendo(cfg.uzemelteto.nev)}${cfg.kapcsolat_email ? `, ${cfg.kapcsolat_email}` : ''}. Kérhetsz tájékoztatást, helyesbítést, törlést és korlátozást, és tiltakozhatsz az adatkezelés ellen. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz fordulhatsz (NAIH, 1055 Budapest, Falk Miksa utca 9–11., naih.hu).</p>
</article></div>`;
  return oldal(k, { cim: 'Adatvédelem', leiras: `A(z) ${cfg.marka} nem használ sütit és követőkódot, a számítás a böngészőben fut.`, ut: 'adatvedelem/', tartalom });
}

export function nemTalalhatoOldal(k) {
  const tartalom = (L) => `
${oldalfej(L, { cim: 'Ez az oldal nincs meg', bevezeto: `Lehet, hogy elírás van a címben, vagy az oldal máshová került. <a href="${L.l('')}">Vissza a főoldalra</a>` })}`;
  return oldal({ ...k, cfg: { ...k.cfg, eles: false } }, { cim: 'Az oldal nem található', leiras: 'Az oldal nem található.', ut: '', tartalom });
}
