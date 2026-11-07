// Az oldalak. Minden szám az adatfájlokból jön, a szöveg a SZOVEG_STILUS.md szerint.
import * as S from './js/szamitas.mjs';
import * as M from './js/megjelenites.mjs';
import { oldal, oldalfej, forgalmi, elszamolas, sor, szamMezo, negyzetek, jelolo, valaszto, egysegValto, HAJTASOK, gyik, gyikLd, morzsaLd, alkalmazasLd, forrasLista, tovabb, datumHu, fmt, honapHu, esc } from './sablon.mjs';

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
  const lf = S.legfrissebbHonap(adat);

  const tartalom = (L) => {
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
<p><a href="${L.l('gepjarmuado-kalkulator/', `?ev=${jovo}`)}">Számold ki a ${M.os(jovo)} adódat</a></p>
</div>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Az autó kora</th><th>${aktualis}</th><th>${jovo}</th></tr></thead><tbody>
${a.savok.map((x, i) => `<tr><td>${S.GJADO_SAV_ROVID[i]}</td><td>${x} Ft/kW</td><td>${b.savok[i]} Ft/kW</td></tr>`).join('')}
</tbody><caption>Gépjárműadó kilowattonként. A kort a gyártási évtől naptári években számoljuk.</caption></table></div>
</div></section>`;
    }

    return `
${(() => {
  const gs = adat.tetelek.gepjarmuado[aktualis].savok, it = S.evAdat(adat.tetelek.illetek, aktualis).tabla.flat();
  const valasz = `A gépjárműadó kilowattonként ${Math.min(...gs)}–${Math.max(...gs)} Ft, az átírási illeték ${Math.min(...it)}–${Math.max(...it)} Ft, az autó korától függően. Írd be a forgalmi engedélyed adatait, és megmutatjuk, mennyit fizetsz te.`;
  return oldalfej(L, { cim: 'Mennyibe kerül az autód?', valasz, fo: true });
})()}
<div class="keret asztal">
${forgalmi({
  kalk: 'gyors', cim: 'A forgalmi engedélyből', al: '',
  extra: ` data-gjado="${L.l('gepjarmuado-kalkulator/')}" data-atiras="${L.l('atirasi-illetek-kalkulator/')}" data-km="${L.l('kilometerterites-kalkulator/')}"`,
  tartalom: `
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 85', min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2019', min: 1950, max: aktualis + 1, sugo: 'Ha a forgalmiban nem találod, a törzskönyvben biztosan szerepel.' }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, ''))}
${sor('P.1', szamMezo({ id: 'cm3', cim: 'Hengerűrtartalom', me: 'cm³', placeholder: 'pl. 1598', min: 50, sugo: 'A kilométertérítéshez kell.' }), ' data-mutat="hajtas=benzin|hajtas=dizel|hajtas=hibrid|hajtas=plugin"')}`,
  autom: true,
})}
${elszamolas(k, M.uresPanel('Írd be a teljesítményt és a gyártási évet.'), { gombok: false, labjegy: 'Bármelyik sorra kattintva a részletes kalkulátor nyílik meg, ugyanezekkel az adatokkal.' })}
</div>

${k.ma <= adat.szabalyok.phev.rendszam_hatarido ? `<section class="szakasz"><div class="keret"><div class="hatarido-sav"><p><strong>${(() => { const d = M.datumNapon(adat.szabalyok.phev.rendszam_hatarido).replace(/^\d+\. /, ''); return d[0].toUpperCase() + d.slice(1); })()} lejár a határidő: eddig kell fehérre cserélni a plug-in hibridek zöld rendszámát.</strong> Utána zöld rendszámmal nem lehet közlekedni, 2027-től pedig adót is fizetsz az autó után.</p><a href="${L.l('plug-in-hibrid-2027/')}">Mennyibe kerül?</a></div></div></section>` : ''}
<section class="szakasz"><div class="keret">
<h2>Részletesen</h2>
<ul class="lista">
<li><a href="${L.l('gepjarmuado-kalkulator/')}"><h3>Gépjárműadó</h3><p>Mennyit fizetsz ${jovo ? `${M.rag(aktualis, 'ban', 'ben')} és ${M.rag(jovo, 'ban', 'ben')}` : M.rag(aktualis, 'ban', 'ben')}, és mikor vagy mentes.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('atirasi-illetek-kalkulator/')}"><h3>Átírás</h3><p>Mennyibe kerül az autó a vételáron felül: illeték, vizsgálat, okmányok, behozott autónál regisztrációs adó.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('benzin-vagy-villany/')}"><h3>Benzin vagy villany</h3><p>Két autó teljes költsége havonta és évekre előre: értékvesztés, energia, adók. Mikor térül meg a drágább villanyautó?</p><span class="ugrik">Összehasonlítom</span></a></li>
<li><a href="${L.l('autofenntartas-kalkulator/')}"><h3>Fenntartás</h3><p>Mennyibe kerül havonta a saját autód, ha mindent beleszámolsz: üzemanyag, értékvesztés, biztosítás, szerviz, adó.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('kilometerterites-kalkulator/')}"><h3>Kilométertérítés</h3><p>Mennyit fizethet a munkáltató, ha a saját autóddal utazol: hivatali út a NAV ${M.honapBan(lf.honap).replace(/ban$|ben$/, 'i')} árával és a fogyasztási normával, munkába járás ${adat.szabalyok.km.munkaba_jaras_ft_km} Ft/km-rel.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('autom/')}"><h3>Az autóm</h3><p>Mentsd el az autódat, és egy lapon látod az adót idén és jövőre, a havi költséget és az értékvesztést.</p><span class="ugrik">Megnyitom</span></a></li>
<li><a href="${L.l('plug-in-hibrid-2027/')}"><h3>Plug-in hibrid 2027</h3><p>Mennyivel többet fizetsz jövőre: gépjárműadó, cégautóadó, budapesti parkolás és a rendszámcsere.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('autohitel-kalkulator/')}"><h3>Autóhitel</h3><p>Havi törlesztő a THM-mel, és mennyibe kerül valójában az autó, ha a kamatot és az értékvesztést is beleszámolod.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('autopalya-matrica-kalkulator/')}"><h3>Autópálya-matrica</h3><p>Éves, vármegyei vagy alkalmi: melyik a legolcsóbb annak, ahogy te autózol.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('megjavitsam-vagy-csereljem/')}"><h3>Javítás vagy csere</h3><p>Megjavítsam a régi autót, vagy eladjam és vegyek másikat? A két út teljes költsége évekre előre.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('kotelezo-biztositas-valtas/')}"><h3>Kötelező biztosítás</h3><p>Meddig mondhatod fel a kötelezőt, mikor jön a díjértesítő, és melyik bonus-malus osztályba kerülsz jövőre.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('vetlen-baleset/')}"><h3>Vétlen baleset</h3><p>Mi jár a károkozó biztosítójától: javítás, csereautó, határidők, és mit tehetsz, ha nem fizet.</p><span class="ugrik">Elolvasom</span></a></li>
<li><a href="${L.l('vallalkozoknak/')}"><h3>Vállalkozóknak</h3><p>Cégautóadó, kilométertérítés kiküldetési rendelvénnyel, és hogy a cég vegye-e meg az autót, vagy a sajátodat számold el.</p><span class="ugrik">Megnézem</span></a></li>
<li><a href="${L.l('adasveteli-szerzodes-minta/')}"><h3>Adásvételi szerződés</h3><p>Kitölthető, nyomtatható minta használt autó eladásához.</p><span class="ugrik">Kitöltöm</span></a></li>
<li><a href="${L.l('le-kw-atvaltas/')}"><h3>LE–kW átváltás</h3><p>Hány kW egy lóerő, és melyik szerepel a forgalmiban.</p><span class="ugrik">Átváltom</span></a></li>
</ul>
</div></section>
${jovoreBlokk}`;
  };

  return oldal(k, {
    cim: `Autós kalkulátorok ${aktualis}: gépjárműadó, átírás, kilométertérítés`,
    leiras: `Írd be a forgalmi engedély adatait, és megmutatjuk a gépjárműadót ${jovo ? `${M.rag(aktualis, 'ra', 're')} és ${M.rag(jovo, 'ra', 're')}` : M.rag(aktualis, 'ra', 're')}, az átírás díját és a kilométertérítést a NAV tételeivel.`,
    ut: '', tartalom,
    adatJson: { tetelek: adat.tetelek, szabalyok: { okmanyok: adat.szabalyok.okmanyok, km: adat.szabalyok.km, hataridok: adat.szabalyok.hataridok }, uzemanyag: { evek: adat.uzemanyag.evek, forras: adat.uzemanyag.forras }, ev: aktualis, ma: k.ma },
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
    { k: 'Hogyan lesz a lóerőből kW?', v: ['Oszd el 1,36-tal, és kerekíts: 115 lóerő nagyjából 85 kW. A forgalmi engedély P.2 sorában eleve kW szerepel.'] },
    { k: 'Kell fizetni elektromos autó után?', v: ['Nem. A tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó mentes, és ehhez semmit nem kell intézned: a NAV a nyilvántartásból tudja, és nem vet ki adót.'] },
    { k: 'Mi a helyzet a plug-in hibridekkel?', v: [phevSzoveg(aktualis)] },
    { k: 'Mikor és hogyan kell befizetni?', v: ['A NAV márciusban küldi a határozatot. Az adót egy összegben április 15-ig kell befizetni, a határozatban lévő linken, a NAV-Mobilban vagy átutalással. Magánszemélyek és egyéni vállalkozók legfeljebb öthavi, pótlékmentes részletfizetést kérhetnek.', 'Ha az adókötelezettség év közben kezdődik, például új autó forgalomba helyezésekor, a határozat véglegessé válásától számított 15 napon belül kell fizetni.'] },
    { k: 'Ki fizet, ha év közben eladom az autót?', v: ['Az egész évit az eladó, mert az éves adót az fizeti, aki január 1-jén a nyilvántartásban szerepel. A vevő a következő évtől fizet. Ha egymás közt másképp osztanátok el, írjátok bele az adásvételi szerződésbe, a NAV ettől még az eladótól kéri. Kivétel, ha az autót kivonják a forgalomból, például kereskedésbe adod: akkor csak a kivonás hónapjának végéig kell fizetni, és a többi visszajár. A kalkulátorban a „Mi történt az autóval abban az évben?” kérdésnél mindegyik esetet kiszámolhatod.'] },
  ];
  const honapok = S.HONAPOK.map((h, i) => [i + 1, h]);
  const leiras = `Gépjárműadó ${aktualis}${jovo ? ` és ${jovo}` : ''}: a kW és a gyártási év alapján kiszámoljuk az éves adót a NAV tételeivel. Elektromos és plug-in hibrid mentesség.`;

  const tartalom = (L) => `
${(() => {
  const sav = adat.tetelek.gepjarmuado[aktualis].savok;
  const sav1 = jovo ? adat.tetelek.gepjarmuado[jovo]?.savok : null;
  const valasz = `Kilowattonként ${Math.min(...sav)}–${Math.max(...sav)} Ft${sav1 ? ` (${M.rag(jovo, 'ban', 'ben')} ${Math.min(...sav1)}–${Math.max(...sav1)} Ft)` : ''}: minél idősebb az autó, annál kevesebb. Az elektromos autó mentes, a befizetés határideje április 15.`;
  return oldalfej(L, { morzsa: ['Gépjárműadó'], cim: `Mennyi a gépjárműadó ${M.rag(aktualis, 'ban', 'ben')}${jovo ? ` és ${M.rag(jovo, 'ban', 'ben')}` : ''}?`, valasz });
})()}
<div class="keret asztal">
${forgalmi({ kalk: 'gepjarmuado', cim: 'Az autó adatai', tartalom: `
${lathato.length > 1 ? sor('', negyzetek('ev', 'Melyik évre?', lathato.map((e) => [e, String(e)]), aktualis)) : `<input type="hidden" name="ev" value="${aktualis}">`}
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 85', min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2019', min: 1950, max: aktualis + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, ''))}
${lathato.some((e) => e <= 2026) ? sor('B', jelolo('phevRegi', '2025. január 1. előtt helyezték forgalomba', 'Ilyenkor az „5P” és „5N” jelzésű plug-in hibrid 2026 végéig mentes.'), ' data-mutat="hajtas=plugin"') : ''}
<fieldset><legend>Ha rád is vonatkozik</legend>
${sor('', negyzetek('valtozas', 'Mi történt az autóval abban az évben?', [['', 'Semmi, egész évben az enyém'], ['vett', 'Használtan vettem meg'], ['eladta', 'Eladtam'], ['uj', 'Forgalomba helyezték a nevemen'], ['kivonta', 'Kivonták a forgalomból']], ''))}
<div class="sor" data-mutat="valtozas=uj"><span class="kod ures"></span><div class="mezo">${valaszto('evkozbenHonap', 'Melyik hónapban helyezték forgalomba?', honapok, 3, 'Új, külföldről behozott, vagy forgalomból kivonva vett autó. A következő hónaptól kell fizetni.')}</div></div>
<div class="sor" data-mutat="valtozas=kivonta"><span class="kod ures"></span><div class="mezo">${valaszto('kivonasHonap', 'Melyik hónapban vonták ki?', honapok, 6, 'Például kereskedésbe adtad, bontóba vitted, vagy kérésre kivonták. Annak a hónapnak a végéig kell fizetni.')}</div></div>
${sor('', jelolo('mozgaskorlatozott', 'Súlyosan mozgáskorlátozott vagy fogyatékossággal élő vagyok, vagy ilyen hozzátartozómat szállítom', 'Egy legfeljebb 100 kW-os személyautóra évi 13 000 forintig nem kell adót fizetni. A hozzátartozónak veled közös háztartásban kell élnie. Egyszer kell bejelenteni a NAV-nak.'))}
</fieldset>`, autom: true })}
${elszamolas(k, M.uresPanel('Add meg a teljesítményt és a gyártási évet.'))}
</div>

<div class="keret"><article class="cikk">
<h2 id="tetelek">Így számol a NAV</h2>
<p>Az adó alapja a forgalmi engedély P.2 sorában szereplő teljesítmény. A tétel attól függ, hány naptári év telt el a gyártás éve óta, és az idősebb autó után kevesebbet kell fizetni.</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Az autó kora</th><th>${aktualis}</th>${rb ? `<th>${jovo}</th>` : ''}<th>100 kW-os autó, ${aktualis}</th></tr></thead><tbody>
${ra.savok.map((x, i) => `<tr data-sav="${i}"${i === r.sav ? ' class="kiemelt"' : ''}><td>${S.GJADO_SAVOK[i][0].toUpperCase()}${S.GJADO_SAVOK[i].slice(1)}</td><td>${x} Ft/kW</td>${rb ? `<td>${rb.savok[i]} Ft/kW</td>` : ''}<td>${M.ftx(100 * x)}</td></tr>`).join('')}
</tbody><caption>A ${M.os(aktualis)} tételeket a NAV ${M.datumNapon(ra.kozzeteve)}${rb ? `, a ${M.os(jovo)} tételeket ${M.datumNapon(rb.kozzeteve)}` : ''} tette közzé.</caption></table></div>
<h2>Milyen esetekben jár adómentesség?</h2>
<ul>
<li><strong>Elektromos autó.</strong> Az „5E” és „5Z” környezetvédelmi osztályú autó mentes.</li>
<li><strong>Plug-in hibrid.</strong> ${phevSzoveg(aktualis)}</li>
<li><strong>Súlyosan mozgáskorlátozott vagy fogyatékossággal élő személy.</strong> Egy legfeljebb 100 kW-os személyautója után évi 13 000 forintig mentes. Ugyanez jár a vele közös háztartásban élő közeli hozzátartozónak, aki rendszeresen szállítja. Több autó esetén a legkisebb teljesítményűre. A mentességet egyszer kell bejelenteni a NAV-nak a GJADO-adatlapon.</li>
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
    { k: `Mennyi az átírási illeték ${M.rag(aktualis, 'ban', 'ben')}?`, v: [`A teljesítményt (kW) egy ${Math.min(...il.tabla.flat())} és ${Math.max(...il.tabla.flat())} Ft/kW közötti tétellel szorozzák, ami a teljesítménytől és az autó korától függ. Egy új, 100 kW-os autó illetéke ${M.ftx(pelda.osszeg)}, egy 2019-es, 85 kW-osé ${M.ftx(r.illetek.osszeg)}.`] },
    { k: 'Ki fizeti az illetéket?', v: ['A vevő. Ha többen veszitek meg az autót, mindenki a saját tulajdoni hányada után fizet.'] },
    { k: 'Kell illetéket fizetni elektromos vagy hibrid autó után?', v: ['Az „5E” és „5Z” osztályú, vagyis tisztán elektromos és nulla emissziós autó után nem. A hibrid és a plug-in hibrid után igen.'] },
    { k: 'Mennyi az illeték, ha ajándékba kapom vagy öröklöm az autót?', v: ['A vásárlási illeték kétszerese. Ha szülőtől, nagyszülőtől, gyermektől, unokától vagy a házastársadtól kapod vagy veszed, nem kell illetéket fizetni.'] },
    { k: 'Mennyi a regisztrációs adó egy külföldről hozott autónál?', v: [`Az alapösszeget (${M.rag(aktualis, 'ban', 'ben')} ${M.ftx(regAlap.ft)}) megszorozzák a teljesítményhez és a környezetvédelmi osztályhoz tartozó szorzóval, majd az autó kora szerint csökkentik. Egy 2021 előtt forgalomba helyezett, „15”-ös osztályú, 85 kW-os, ${regPelda.honapok} hónapos autónál ${M.ftx(regPelda.teljes)} a teljes összeg, ebből ${regPelda.csokk}% a kor miatti csökkentés, így ${M.ftx(regPelda.osszeg)} marad.`] },
    { k: 'Meddig kell átíratni az autót?', v: [`A szerződéskötéstől számított ${adat.szabalyok.hataridok.atiras_napok} napon belül. Az eredetiségvizsgálat a vizsgálat napjától 60 napig használható fel.`] },
  ];
  const leiras = `Átírási illeték ${aktualis}: illeték, eredetiségvizsgálat, forgalmi és törzskönyv egy összegben, külföldről hozott autónál regisztrációs adóval. A NAV tételeivel.`;

  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Átírás'], cim: `Mennyibe kerül az autó átírása ${M.rag(aktualis, 'ban', 'ben')}?`, valasz: `Az illeték kilowattonként ${Math.min(...il.tabla.flat())}–${Math.max(...il.tabla.flat())} Ft a teljesítménytől és az autó korától függően, erre jön kb. ${M.ftx(Math.round((ok.eredetisegvizsgalat_alap + ok.forgalmi_engedely + ok.torzskonyv + ok.torzskonyv_postazas) / 1000) * 1000)} vizsgálat és okmány. Elektromos autó után nincs illeték.` })}
<div class="keret asztal">
${forgalmi({ kalk: 'atiras', cim: 'Az átírás adatai', extra: ' data-mai-datum="datum"', tartalom: `
<fieldset><legend>A vásárlás</legend>
${sor('', negyzetek('honnan', 'Honnan jön az autó?', [['hazai', 'Magyar rendszámos'], ['kulfold', 'Külföldről hozom be']], 'hazai'))}
${sor('', negyzetek('szerzes', 'Kitől és hogyan lesz a tiéd?', [['vetel', 'Megveszem'], ['ajandek', 'Ajándékba kapom vagy öröklöm'], ['kozeli', 'Szülőtől, nagyszülőtől, gyermektől, unokától vagy a házastársamtól kapom vagy veszem']], 'vetel') + '<span class="sugo">Közeli hozzátartozótól nem kell illetéket fizetni, se vételnél, se ajándéknál, se öröklésnél. Ajándéknál és öröklésnél egyébként kétszeres az illeték.</span>')}
${sor('', `<label for="datum">Az átírás napja</label><input id="datum" name="datum" type="date" value="${k.ma}">`)}
</fieldset>
<fieldset><legend>Az autó</legend>
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 85', min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2019', min: 1950, max: aktualis + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, ''))}
${sor('V.9', valaszto('osztaly', 'Környezetvédelmi osztály', [['15', '„15” vagy jobb (Euro 6)'], ['12', '„12”–„14” (Euro 4–5)'], ['9', '„9”–„11” (Euro 3)'], ['8', '„8” vagy rosszabb']], '15', 'A külföldi papírok alapján a vizsgálóállomás állapítja meg.'), ' data-mutat="honnan=kulfold"')}
${sor('B', `<label for="elsoForgalom">Első forgalomba helyezés</label><input id="elsoForgalom" name="elsoForgalom" type="date"><span class="sugo">Külföldön, a külföldi forgalmi szerint.</span>`, ' data-mutat="honnan=kulfold"')}
</fieldset>
<fieldset><legend>Vizsgálat és okmányok</legend>
${sor('', jelolo('eredetiseg', 'Eredetiségvizsgálat kell', 'Ha 60 napon belül már volt, vedd ki a pipát.', true))}
<div class="sor" data-mutat="eredetiseg"><span class="kod">P.1</span><div class="mezo">${valaszto('eredetisegDij', 'Hengerűrtartalom', ok.eredetisegvizsgalat_savok.map((x) => [x.ft, `${x.nev}: ${fmt(x.ft)} Ft`]), ok.eredetisegvizsgalat_alap, 'Az eredetiségvizsgálat hatósági ára ettől függ, minden vizsgálóhelyen ugyanannyi.')}</div></div>
${sor('', jelolo('postazas', 'Postán kérem a törzskönyvet', `${M.ftx(ok.torzskonyv_postazas)}.`, true))}
${sor('', szamMezo({ id: 'hanyad', cim: 'Tulajdoni hányad', me: '%', ertek: 100, min: 1, max: 100, sugo: 'Ha többen veszitek meg, a saját részed.' }))}
${sor('', szamMezo({ id: 'vetelar', cim: 'Vételár, ha a teljes összeget is látni szeretnéd', me: 'Ft', placeholder: 'pl. 3 500 000' }))}
</fieldset>`, autom: true })}
${elszamolas(k, M.uresPanel('Add meg a teljesítményt és a gyártási évet.'))}
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
${ok.szarmazasellenorzes ? `<tr><td>Behozott autónál: származásellenőrzés</td><td>${M.ftx(ok.szarmazasellenorzes)}</td></tr>` : ''}
${ok.rendszamtabla_par ? `<tr><td>Behozott autónál: rendszámtábla, 1 pár</td><td>${M.ftx(ok.rendszamtabla_par)}</td></tr>` : ''}
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
  ...(ok.eredetiseg_forras ? [{ nev: ok.eredetiseg_forras.nev, url: ok.eredetiseg_forras.url, d: ok.eredetiseg_forras.idoszak }] : []),
  ...(ok.behozott_forras ? [{ nev: ok.behozott_forras.nev, url: ok.behozott_forras.url, d: ok.behozott_forras.idoszak }] : []),
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
    { k: `Mennyi a kilométertérítés ${M.rag(lf.ev, 'ban', 'ben')}?`, v: [`Hivatali útnál két részből áll: az üzemanyagból (a fogyasztási norma szorozva a NAV havi árával) és a ${km.normakoltseg_ft_km} Ft/km-es normaköltségből. Egy 100 km-es út egy 1,6 literes benzines autóval ${M.honapBan(lf.honap)} ${M.ftx(r.osszesen)}, vagyis ${M.tized(r.ftKm)} Ft/km.`] },
    { k: 'Melyik hónap NAV-árával kell számolni?', v: ['Azzal, amelyikben az út volt. A NAV minden hónap vége felé közzéteszi a következő hónap árát. A számla szerinti árral is el lehet számolni.'] },
    { k: 'Hogyan számol a hibrid és az elektromos autó?', v: [`A plug-in hibrid a belső égésű motor alapnormájának ${Math.round(km.plugin_szorzo * 100)}%-ával, az elektromos autó 100 km-enként ${km.elektromos_benzin_l_100km} liter benzinnel számol, a benzin NAV-árán. A nem tölthető hibridre a benzines vagy dízeles alapnorma vonatkozik.`, `Az LPG-s autó normája a benzines ${M.tized(km.lpg_szorzo)}-szerese, a CNG-sé literenként ${M.tized(km.cng_kg_per_l, 2)} kg.`] },
    { k: 'Mennyi jár a munkába járásért saját autóval?', v: [`Kilométerenként ${km.munkaba_jaras_ft_km} forint adható adómentesen a lakóhely és a munkahely közötti út oda-vissza távolságára. A munkáltatónak ez nem kötelező.`] },
    { k: 'Kell számla az elszámoláshoz?', v: ['Nem, ha a norma és a NAV-ár szerint számolsz: elég a kiküldetési rendelvény. Legyen rajta az út célja, a távolság és az autó adatai.'] },
  ];
  const leiras = `Kilométertérítés ${lf.ev}: kiküldetési rendelvény a fogyasztási normával és a NAV ${honapi} árával (benzin ${ar.benzin} Ft/l), plusz ${km.normakoltseg_ft_km} Ft/km normaköltség. Munkába járás ${km.munkaba_jaras_ft_km} Ft/km.`;

  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Kilométertérítés'], cim: `Mennyi a kilométertérítés ${lf.ev} ${['januárjában', 'februárjában', 'márciusában', 'áprilisában', 'májusában', 'júniusában', 'júliusában', 'augusztusában', 'szeptemberében', 'októberében', 'novemberében', 'decemberében'][lf.honap - 1]}?`, valasz: `A NAV ${S.HONAPOK[lf.honap - 1]}i ára benzinre ${ar.benzin}, dízelre ${ar.dizel} Ft/l: ezt szorozzuk az autó fogyasztási normájával, és hozzáadunk ${km.normakoltseg_ft_km} Ft/km normaköltséget. Munkába járásnál ${km.munkaba_jaras_ft_km} Ft/km adható.` })}
<div class="keret asztal">
${forgalmi({ kalk: 'km', cim: 'Az út és az autó', tartalom: `
<div class="mod-valto" role="radiogroup" aria-label="Mit számolsz?"><label><input type="radio" name="mod" value="kikuldetes" checked><span>Hivatali út</span></label><label><input type="radio" name="mod" value="munka"><span>Munkába járás</span></label></div>
<p class="mod-magyarazat" data-mutat="mod=kikuldetes">Ha a munkád miatt utazol a saját autóddal, például ügyfélhez vagy másik telephelyre. A NAV üzemanyagárával és a normaköltséggel számolunk, és ez számla nélkül adómentes.</p>
<p class="mod-magyarazat" data-mutat="mod=munka" hidden>Az otthonod és a munkahelyed közötti út. A munkáltató kilométerenként fix összeget adhat adómentesen, de nem köteles.</p>
<div data-mutat="mod=kikuldetes">
${sor('', szamMezo({ id: 'km', cim: 'Távolság', me: 'km', placeholder: 'pl. 120', min: 1 }) + jelolo('odaVissza', 'Oda-vissza', 'A megadott távolság duplájával számolunk.'))}
${sor('', valaszto('honap', 'Melyik hónapban volt az út?', honapLista.map(([e, h]) => [`${e}-${h}`, honapHu(e, h)]), `${lf.ev}-${lf.honap}`, `A legfrissebb NAV-ár: ${honapHu(lf.ev, lf.honap)}.`))}
${sor('P.3', valaszto('uzemanyag', 'Üzemanyag', [['', 'Válaszd ki'], ['benzin', 'Benzin'], ['dizel', 'Dízel'], ['lpg', 'LPG'], ['cng', 'CNG'], ['plugin', 'Plug-in hibrid'], ['elektromos', 'Elektromos']], ''))}
${sor('', negyzetek('motor', 'A belső égésű motor', [['benzin', 'Benzines'], ['dizel', 'Dízeles']], 'benzin'), ' data-mutat="uzemanyag=plugin"')}
${sor('P.1', szamMezo({ id: 'cm3', cim: 'Hengerűrtartalom', me: 'cm³', placeholder: 'pl. 1598', min: 50 }), ' data-mutat="uzemanyag=benzin|uzemanyag=dizel|uzemanyag=lpg|uzemanyag=cng|uzemanyag=plugin"')}
<div data-vedett hidden>${sor('', jelolo('vedett', 'Védett árral számolok', 'Ebben a hónapban a NAV a magyar rendszámú autókra védett árat is közölt.'))}</div>
${sor('', szamMezo({ id: 'sajatAr', cim: 'Saját ár, ha számla szerint számolsz', me: 'Ft', placeholder: 'NAV-ár' }))}
</div>
<div data-mutat="mod=munka">
${sor('', szamMezo({ id: 'tav', cim: 'Lakóhely és munkahely távolsága', me: 'km', placeholder: 'pl. 25', min: 1, sugo: 'Egy irányban. A visszautat hozzászámoljuk.' }))}
${sor('', szamMezo({ id: 'napok', cim: 'Hány napot jársz be havonta?', me: 'nap', placeholder: 'pl. 20', min: 1, max: 31 }))}
</div>`, autom: true })}
${elszamolas(k, M.uresPanel('Add meg a távolságot, az üzemanyagot és a hengerűrtartalmat.'))}
</div>

<div class="keret"><article class="cikk">
<h2 id="nav-arak">A NAV üzemanyagárai</h2>
<p>A NAV minden hónapra közzéteszi, milyen áron lehet elszámolni az üzemanyagot. Ez nem a kúti ár, hanem három nagy forgalmazó előző hónap eleji árának átlaga. A táblázat magától frissül, amint megjelenik a következő hónap.</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Hónap</th><th>Benzin</th><th>Dízel</th><th>Keverék</th><th>LPG</th><th>CNG</th></tr></thead><tbody>
${honapLista.map(([e, h]) => { const x = adat.uzemanyag.evek[e][h]; const v = (kk) => `${x[kk] ?? '–'}${x[kk + '_vedett'] ? ` <span class="vedett">(védett: ${x[kk + '_vedett']})</span>` : ''}`; return `<tr data-arhonap="${e}-${h}"${e === lf.ev && h === lf.honap ? ' class="kiemelt"' : ''}><td>${honapHu(e, h)}</td><td>${v('benzin')}</td><td>${v('dizel')}</td><td>${x.keverek ?? '–'}</td><td>${x.lpg ?? '–'}</td><td>${x.cng ?? '–'}</td></tr>`; }).join('')}
</tbody><caption>Forint literenként, a CNG forint kilogrammonként. Forrás: <a href="${adat.uzemanyag.forras}" rel="noopener" target="_blank">NAV</a>${arDatum(adat, lf.ev, lf.honap) ? `, a legfrissebb hónap ${arDatum(adat, lf.ev, lf.honap).replace(/\.$/, '')}` : ''}.</caption></table></div>
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
    adatJson: { uzemanyag: { evek: adat.uzemanyag.evek, forras: adat.uzemanyag.forras }, szabalyok: { km } },
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
<h2 id="becslesek">Amit becsülünk, és mi alapján</h2>
<p>A „becslés” jelölésű tételek nem hivatalos adatok, hanem a mi feltevéseink. A saját számaid ezeknél mindig pontosabbak, ezért mindegyiket átírhatod a kalkulátorban.</p>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Hajtás</th><th>Érték 3 év után</th><th>Utána évente</th></tr></thead><tbody>
${['benzin', 'dizel', 'hibrid', 'plugin', 'elektromos'].map((h) => { const m = adat.szabalyok.maradvany[h]; return `<tr><td>${{ benzin: 'Benzines', dizel: 'Dízeles', hibrid: 'Hibrid', plugin: 'Plug-in hibrid', elektromos: 'Elektromos' }[h]}${m.becsult ? ' <span class="halk">(becsült)</span>' : ''}</td><td>a listaár ${M.tized(m.harom, 1)}%-a</td><td>−${M.tized(m.evi, 1)}%</td></tr>`; }).join('')}
</tbody><caption>Értékvesztés. ${adat.szabalyok.maradvany.leiras}</caption></table></div>
<div class="tabla-tarto"><table class="tabla becsles-tabla"><thead><tr><th>Mit becsülünk</th><th>Érték</th><th>Forrás</th><th>Az adat időszaka</th></tr></thead><tbody>
${adat.szabalyok.maradvany.forrasok.map((x, i) => `<tr><td>${i ? 'Értékvesztés 3 év után, évente' : 'Értékvesztés az első 3 évben'}</td><td>${(() => { const v = ['benzin', 'dizel', 'hibrid', 'plugin', 'elektromos'].map((h) => adat.szabalyok.maradvany[h][i ? 'evi' : 'harom']); return i ? `évi ${M.tized(Math.min(...v), 1)}–${M.tized(Math.max(...v), 1)}%` : `a listaár ${M.tized(Math.min(...v), 1)}–${M.tized(Math.max(...v), 1)}%-a marad`; })()}</td><td><a href="${x.url}" rel="noopener">${x.nev.replace(/:.*$/, '')}</a></td><td>${x.idoszak || ''}</td></tr>`).join('')}
${adat.szabalyok.energia.forrasok.map((x) => `<tr><td>${ENERGIA_SOR(adat, x)[0]}</td><td>${ENERGIA_SOR(adat, x)[1]}</td><td>${x.url ? `<a href="${x.url}" rel="noopener">${x.nev.replace(/:.*$/, '')}</a>` : x.nev.replace(/:.*$/, '')}</td><td>${x.idoszak || ''}</td></tr>`).join('')}
</tbody><caption>A töltési veszteséget ${adat.szabalyok.energia.veszteseg}%-kal számoljuk. ${adat.szabalyok.energia.tolto_leiras}</caption></table></div>
<p>Az értékvesztés egy hajtástípus átlagos aránya, nem a te autód garantált értékvesztése. A márka, a felszereltség, az állapot és a futott kilométer sokat számít, ezért ha tudod, mennyiért adhatnád el az autódat, írd be: azzal pontosabb.</p>
<h2>Hogyan frissül?</h2>
<p>Minden reggel lefut egy ellenőrzés. Megnézi a NAV üzemanyagár-oldalát, és ha megjelent a következő hónap, átveszi az árakat. Októbertől azt is figyeli, közzétette-e a NAV a jövő évi adótételeket.</p>
<p>Új számot csak akkor veszünk át, ha a NAV oldala a megszokott felépítésű, és minden érték ésszerű határok között van. Utána lefutnak a számítási tesztek, és csak ha mind rendben van, frissül az oldal. Ha valami nem stimmel, a korábbi, ellenőrzött adat marad kint, és mi értesítést kapunk.</p>
<p>A dátumtól függő részek, például hogy melyik év az alapértelmezett, minden nap újraszámolódnak, így január 1-jén az oldal magától átáll az új évre.</p>
<p class="halk">Legutóbbi ellenőrzés: ${al.utolso_ellenorzes ? `${datumHu(al.utolso_ellenorzes)}, ${al.utolso_ellenorzes.slice(11, 16)}` : datumHu(k.ma)}.${al.figyelmeztetesek?.length ? ` Nyitott jelzés: ${al.figyelmeztetesek.join(' ')}` : ''}</p>
<h2>Hibát találtál?</h2>
<p>${k.cfg.kapcsolat_email ? `Írj a ${k.cfg.kapcsolat_email} címre. Minden jelzést megnézünk, és ha javítunk, itt is jelezzük.` : 'A kapcsolati e-mail-cím hamarosan itt lesz.'}</p>
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, { cim: 'Honnan vannak a számok?', leiras: 'Az autózom kalkulátorainak forrásai, a tételek megjelenési dátuma, és hogyan frissülnek automatikusan.', ut, tartalom, jsonld: [morzsaLd(k.cfg, [{ nev: 'Források', ut }])] });
}

/* ======================= AZ AUTÓM ======================= */
export function automOldal(k) {
  const { adat } = k;
  const ut = 'autom/';
  const aktualis = k.ev;
  const f = feltevesek(adat);
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Az autóm'], cim: 'Az autóm', bevezeto: 'Egy lapon minden, amibe az autód kerül: az idei és a jövő évi adó, a havi és a kilométerenkénti költség, és hogy mennyit veszít az értékéből. Ha elmented, legközelebb is itt találod, ebben a böngészőben.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'autom', cim: 'Az autód', autom: true, tartalom: `
<fieldset><legend>Az autó</legend>
${sor('', `<label for="nev">Hogy hívod?</label><div class="beir szeles"><input id="nev" name="nev" type="text" placeholder="pl. a Corolla" autocomplete="off" maxlength="40"></div><span class="sugo">Nem kötelező. Ha több autód van, így tudod, melyikről van szó.</span>`)}
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 85', min: 1, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2019', min: 1950, max: aktualis + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, ''))}
${sor('P.1', szamMezo({ id: 'cm3', cim: 'Hengerűrtartalom', me: 'cm³', placeholder: 'pl. 1598', min: 50 }), ' data-mutat="hajtas=benzin|hajtas=dizel|hajtas=hibrid|hajtas=plugin"')}
${sor('', szamMezo({ id: 'fogyasztas', cim: 'Fogyasztás', me: 'l/100 km', placeholder: 'pl. 6,5', tized: true }), ' data-mutat="hajtas=benzin|hajtas=dizel|hajtas=hibrid|hajtas=plugin"')}
${sor('', szamMezo({ id: 'kwh', cim: 'Fogyasztás', me: 'kWh/100 km', placeholder: 'pl. 17', tized: true }), ' data-mutat="hajtas=elektromos"')}
${sor('', szamMezo({ id: 'km', cim: 'Évente megtett út', me: 'km', placeholder: 'pl. 15 000', min: 0 }))}
</fieldset>
<fieldset><legend>Évente</legend>
<p class="fieldset-megj">Ami üresen marad, azzal nem számolunk.</p>
${sor('', szamMezo({ id: 'biztositas', cim: 'Biztosítás (kötelező és casco)', me: 'Ft', placeholder: 'pl. 150 000', min: 0 }))}
${sor('', szamMezo({ id: 'szerviz', cim: 'Szerviz és javítás', me: 'Ft', placeholder: 'pl. 120 000', min: 0 }))}
${sor('', szamMezo({ id: 'gumi', cim: 'Gumi és gumiszerelés', me: 'Ft', placeholder: 'pl. 40 000', min: 0 }))}
${sor('', szamMezo({ id: 'egyeb', cim: 'Matrica, parkolás, egyéb', me: 'Ft', placeholder: 'pl. 60 000', min: 0 }))}
${sor('', szamMezo({ id: 'ertek', cim: 'Mennyit ér most az autó?', me: 'Ft', placeholder: 'pl. 4 000 000', min: 0, sugo: 'Ebből becsüljük az értékvesztést.' }))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg az autód adatait.'), { cim: 'Az autóm' })}
</div>
<div class="keret"><article class="cikk">
<h2>Mit nézz meg még?</h2>
<ul class="lista">
<li><a href="${L.l('benzin-vagy-villany/')}"><h3>Megérné villanyautóra váltani?</h3><p>Tegyél a mostani autód mellé egy villanyautót, és nézd meg, mennyi idő alatt térülne meg.</p><span class="ugrik">Összehasonlítom</span></a></li>
<li><a href="${L.l('adasveteli-szerzodes-minta/')}"><h3>Eladnád?</h3><p>Kitölthető adásvételi szerződés, nyomtatható formában.</p><span class="ugrik">Kitöltöm</span></a></li>
<li><a href="${L.l('valtozasok/')}"><h3>Mi változott?</h3><p>Új NAV-tételek és havi üzemanyagárak, dátummal.</p><span class="ugrik">Megnézem</span></a></li>
</ul>
</article></div>`;
  return oldal(k, {
    cim: 'Az autóm: adó, havi költség és értékvesztés egy helyen',
    leiras: 'Egy lapon az autód gépjárműadója idén és jövőre, a havi és a kilométerenkénti költség, az értékvesztés és az átírás díja.',
    ut, tartalom,
    adatJson: { tetelek: adat.tetelek, szabalyok: { okmanyok: adat.szabalyok.okmanyok, km: adat.szabalyok.km, hataridok: adat.szabalyok.hataridok, maradvany: adat.szabalyok.maradvany }, uzemanyag: { evek: adat.uzemanyag.evek, forras: adat.uzemanyag.forras }, f: { ...f, lf: undefined }, ev: aktualis, ma: k.ma },
    jsonld: [morzsaLd(k.cfg, [{ nev: 'Az autóm', ut }])],
  });
}

/* ======================= VÁLTOZÁSOK ======================= */
// Az adatfájlokból áll össze: ha a frissítő új NAV-árat vagy új évi tételt vesz át, itt magától megjelenik.
export function valtozasokOldal(k) {
  const { adat } = k;
  const ut = 'valtozasok/';
  const t = adat.tetelek, u = adat.uzemanyag;
  const bejegyzesek = [];
  // Évi tételek: a NAV egyszerre teszi közzé őket
  for (const ev of Object.keys(t.gepjarmuado).map(Number).sort()) {
    const g = t.gepjarmuado[ev], ge = t.gepjarmuado[ev - 1];
    if (!g?.kozzeteve) continue;
    const pontok = [];
    pontok.push(`Gépjárműadó: korsávonként ${g.savok.join(', ')} Ft/kW.${ge ? ` ${valtozasMondat(ge.savok, g.savok)}` : ''}`);
    const il = t.illetek?.[ev];
    if (il) pontok.push(`Átírási illeték: ${Math.min(...il.tabla.flat())} és ${Math.max(...il.tabla.flat())} Ft/kW között, a teljesítménytől és a kortól függően.`);
    const ra = t.regado_alap?.[ev], rae = t.regado_alap?.[ev - 1];
    if (ra) pontok.push(`A regisztrációs adó alapja ${M.ftx(ra.ft)}${rae && rae.ft !== ra.ft ? ` (előtte ${M.ftx(rae.ft)})` : ''}.`);
    if (t.cegautoado?.[ev]) pontok.push('A cégautóadó tételei is megjelentek.');
    // Mit jelent ez neked: ugyanaz a mintaautó az előző és az új évben
    const pr = S.gepjarmuado(adat, { ev, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' });
    const pe = ge ? S.gepjarmuado(adat, { ev: ev - 1, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' }) : null;
    const neked = !pr.hiba ? `Egy 2019-es, 85 kW-os autó adója ${M.rag(ev, 'ban', 'ben')} ${M.ftx(pr.fizetendo)}${pe && !pe.hiba ? `, ${M.rag(ev - 1, 'ban', 'ben')} ${M.ftx(pe.fizetendo)} volt` : ''}.${pe && !pe.hiba && pr.sav !== pe.sav ? ` ${pr.fizetendo < pe.fizetendo ? 'Azért kevesebb' : 'Azért más'}, mert az autó közben idősebb korsávba lép.` : ''}` : '';
    bejegyzesek.push({ kit: ['autótulajdonosok', 'autóvásárlók', 'cégautósok', 'behozott autók'], kulcs: g.kozzeteve, datum: datumHu(g.kozzeteve), meta: [`Közzétéve: ${datumHu(g.kozzeteve)}`, `Alkalmazandó: ${ev}. január 1-jétől`], neked, cim: `A NAV közzétette a ${M.os(ev)} adótételeket`, pontok, link: [['Gépjárműadó-kalkulátor', 'gepjarmuado-kalkulator/'], ['Átírás', 'atirasi-illetek-kalkulator/'], ['Az autóm', 'autom/']], forras: g.forras });
  }
  // Havi üzemanyagárak
  const honapok = Object.entries(u.evek).flatMap(([e, h]) => Object.keys(h).map((x) => [Number(e), Number(x)])).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const NEV = { benzin: 'benzin', dizel: 'dízel', keverek: 'keverék', lpg: 'LPG', cng: 'CNG' };
  honapok.forEach(([e, h], i) => {
    const ar = u.evek[e][h], elozo = i > 0 ? u.evek[honapok[i - 1][0]][honapok[i - 1][1]] : null;
    const kz = u.kozzeteve?.[`${e}-${String(h).padStart(2, '0')}`] || u.kozzeteve?.[`${e}-${h}`];
    const valt = (x) => { if (!elozo?.[x]) return ''; const d = ar[x] - elozo[x]; return d === 0 ? ', változatlan' : `, ${d > 0 ? '+' : '−'}${Math.abs(d)} Ft`; };
    const sorok = ['benzin', 'dizel'].filter((x) => ar[x]).map((x) => `${NEV[x]} ${ar[x]} Ft/l${valt(x)}`);
    sorok[0] = sorok[0].charAt(0).toUpperCase() + sorok[0].slice(1);
    if (ar.benzin_vedett) sorok.push(`védett ár a jogosultaknak: benzin ${ar.benzin_vedett}, dízel ${ar.dizel_vedett} Ft/l`);
    const utolso = new Date(e, h, 0).getDate();
    const k100 = S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', motor: 'benzin', cm3: 1498, ev: e, honap: h });
    const k100e = i > 0 ? S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', motor: 'benzin', cm3: 1498, ev: honapok[i - 1][0], honap: honapok[i - 1][1] }) : null;
    const dk = k100e && !k100e.hiba && !k100.hiba ? Math.round(k100.osszesen - k100e.osszesen) : null;
    const neked = k100.hiba ? '' : `Egy 100 km-es hivatali út egy 1,5 literes benzines autóval ${M.ftx(k100.osszesen)} térítést ér${dk ? `, ${M.ftx(Math.abs(dk))}-tal ${dk > 0 ? 'többet' : 'kevesebbet'}, mint az előző hónapban` : dk === 0 ? ', ugyanannyit, mint az előző hónapban' : ''}.`;
    bejegyzesek.push({ kit: ['saját autóval utazó munkavállalók', 'munkáltatók', 'vállalkozók'], kulcs: kz || `${e}-${String(h).padStart(2, '0')}-00`, datum: kz ? datumHu(kz) : M.honapHu(e, h), meta: [kz ? `Közzétéve: ${datumHu(kz)}` : '', `Érvényes: ${e}. ${S.HONAPOK[h - 1]} 1–${utolso}.`].filter(Boolean), neked, cim: `NAV-üzemanyagárak, ${M.honapHu(e, h)}`, pontok: [`${sorok.join('; ')}.`], link: [['Ez a kilométertérítést érinti', 'kilometerterites-kalkulator/']], forras: u.forras });
  });
  bejegyzesek.sort((a, b) => (a.kulcs < b.kulcs ? 1 : -1));
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Változások'], cim: 'Mi változott?', bevezeto: 'Minden új NAV-tétel és havi üzemanyagár, amit átvettünk, dátummal. Ez a lista magától bővül, amikor a reggeli ellenőrzés új adatot talál.' })}
<div class="keret"><article class="cikk" style="padding-top:12px">
<ol class="naplo">
${bejegyzesek.map((b) => `<li><time>${b.datum}</time><div><h2>${b.cim}</h2>${b.meta?.length ? `<p class="naplo-meta">${b.meta.map((x) => `<span>${x}</span>`).join('')}</p>` : ''}${b.kit ? `<p class="naplo-kit"><span class="halk">Kit érint?</span> ${b.kit.map((x) => `<span class="kit">${x}</span>`).join('')}</p>` : ''}${b.pontok.map((x) => `<p>${x}</p>`).join('')}${b.neked ? `<p class="naplo-neked"><strong>Mit jelent ez neked?</strong> ${b.neked}</p>` : ''}<p class="naplo-link">${b.link.map(([n, u2]) => `<a href="${L.l(u2)}">${n}</a>`).join('')}${b.forras ? `<a href="${b.forras}" rel="noopener">A NAV közleménye</a>` : ''}</p></div></li>`).join('\n')}
</ol>
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, { cim: 'Mi változott? NAV-tételek és üzemanyagárak', leiras: 'Az autózom által átvett NAV-adatok időrendben: évi adótételek és havi üzemanyagárak, a változással együtt.', ut, tartalom, jsonld: [morzsaLd(k.cfg, [{ nev: 'Változások', ut }])] });
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
<tr><td>Üzemeltető</td><td>${kitoltendo(u.nev ? esc(u.nev) : '')}</td></tr>
${u.tipus === 'magánszemély' && !u.szekhely ? '' : `<tr><td>Székhely</td><td>${kitoltendo(u.szekhely)}</td></tr>`}
${u.tipus === 'magánszemély' && !u.adoszam ? '' : `<tr><td>Adószám</td><td>${kitoltendo(u.adoszam)}</td></tr>`}
${u.tipus === 'magánszemély' && !u.nyilvantartasi_szam ? '' : `<tr><td>Nyilvántartási szám</td><td>${kitoltendo(u.nyilvantartasi_szam)}</td></tr>`}
<tr><td>E-mail</td><td>${cfg.kapcsolat_email ? `<a href="mailto:${esc(cfg.kapcsolat_email)}">${esc(cfg.kapcsolat_email)}</a>` : kitoltendo('')}</td></tr>
${u.telefon ? `<tr><td>Telefon</td><td><a href="tel:${esc(u.telefon.replace(/\s/g, ''))}">${esc(u.telefon)}</a></td></tr>` : ''}
<tr><td>Tárhelyszolgáltató</td><td>${cfg.tarhely.nev}, ${cfg.tarhely.cim}</td></tr>
</tbody></table></div>
<h2>Felelősség</h2>
<p>A kalkulátorok a NAV és a jogszabályok közzétett adataival számolnak, és tájékoztató jellegűek. Nem minősülnek adó- vagy pénzügyi tanácsadásnak. A ténylegesen fizetendő adót és illetéket a NAV határozata tartalmazza. Az adatok pontosságára gondosan figyelünk, de a számítások alapján hozott döntésekért nem vállalunk felelősséget.</p>
</article></div>`;
  return oldal(k, { cim: 'Impresszum', leiras: `Az ${cfg.marka} üzemeltetőjének és tárhelyszolgáltatójának adatai.`, ut: 'impresszum/', tartalom });
}

export function adatvedelemOldal(k) {
  const { cfg } = k;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Adatvédelem'], cim: 'Adatvédelem', bevezeto: 'Nem gyűjtünk rólad adatot. A kalkulátorok a böngésződben számolnak, amit beírsz, az csak akkor jut el hozzánk, ha a visszajelzés-dobozban magad elküldöd.' })}
<div class="keret"><article class="cikk" style="padding-top:12px">
<h2>Sütik és követés</h2>
<p>Nem használunk sütit és követőkódot, és hirdetés sincs az oldalon. A látogatottságot a Cloudflare Web Analytics méri: ez nem tesz semmit a gépedre, nem azonosít, és mi csak összesített számokat látunk (hány oldalt néztek meg, melyik oldalról érkeztek, milyen eszközről). A betűtípusokat magunk szolgáljuk ki. Ha ezen valaha változtatunk, előbb itt jelezzük, és csak a hozzájárulásoddal kapcsolunk be bármit.</p>
<h2>A mentett autód</h2>
<p>Ha az „Elmentem az autómat” gombra kattintasz, az autó adatai a böngésződ saját tárolójába kerülnek ezen az eszközön. Hozzánk nem jutnak el, fiók nincs. Bármikor átírhatod és újra mentheted, vagy a „Törlöm” gombbal törölheted. A böngésző adatainak törlésekor is eltűnik. Másik böngészőben vagy másik eszközön nem látszik, mert nem szinkronizáljuk sehová.</p>
<h2>Visszajelzés</h2>
<p>Az oldalak alján megkérdezzük, hasznos volt-e az oldal. Az Igen vagy Nem gombnyomásból csak egy számláló nő az adott oldalnál. Nem tároljuk, ki nyomta meg, és az IP-címét sem. A böngésződ megjegyzi a választásodat, hogy ugyanazt a szavazatot ne számoljuk kétszer.</p>
<p>Ha a Nem után pár szót is írsz és elküldöd, a szöveget és az oldal címét kapjuk meg. Kalkulátornál, ha a négyzetet bejelölve hagyod, a beírt számokat (például teljesítmény, gyártási év, árak) és a kapott eredményt is. Név és e-mail-cím nem kell hozzá. Ha mégis beleírsz e-mail-címet, telefonszámot vagy bankszámlaszámot, azt eltárolás előtt kitakarjuk. A visszajelzéseket a fejlesztéshez használt GitHub (GitHub, Inc., USA, a Microsoft-csoport tagja, csatlakozott az EU–USA adatvédelmi keretrendszerhez) feladatkezelőjében tároljuk. Arra használjuk, hogy kijavítsuk a hibát, és a lezárása után legfeljebb egy évig őrizzük meg. A jogalap a szolgáltatás javításához fűződő jogos érdekünk.</p>
<p>Ha választ is szeretnél, az „írj levelet” link megnyitja a levelezőprogramodat egy előkészített levéllel, amit te küldesz el. A leveledet és az e-mail-címedet csak a válaszhoz és a hiba kijavításához használjuk, és legfeljebb egy évig őrizzük meg.</p>
<h2>Megosztott számítás</h2>
<p>A „Számítás megosztása” gomb egy linket készít, amelyben a kalkulátorba beírt számok benne vannak, így aki megkapja, ugyanazt a számítást látja. A linket te küldöd el annak, akinek akarod, hozzánk nem jut el. A szerződés-űrlap és a mentett autód adatai nem kerülnek a linkbe.</p>
<h2>Szervernapló</h2>
<p>Az oldalt a ${cfg.tarhely.nev} (${cfg.tarhely.cim}) szolgálja ki. Mint minden tárhelyszolgáltató, technikai naplót vezet a kérésekről (például IP-cím, időpont, böngésző), a szolgáltatás biztonsága és működése érdekében. Ezeket mi nem használjuk, és nem kötjük személyhez. A Cloudflare amerikai cég, és tagja az EU–USA adatvédelmi keretrendszernek (Data Privacy Framework), ezért az Európai Unióból továbbított adatokra az uniós szintű védelem vonatkozik.</p>
<h2>Adatkezelő és jogaid</h2>
<p>Adatkezelő: ${kitoltendo(cfg.uzemelteto.nev)}${cfg.kapcsolat_email ? `, ${cfg.kapcsolat_email}` : ''}. Kérhetsz tájékoztatást, helyesbítést, törlést és korlátozást, és tiltakozhatsz az adatkezelés ellen. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz fordulhatsz (NAIH, 1055 Budapest, Falk Miksa utca 9–11., naih.hu).</p>
</article></div>`;
  return oldal(k, { cim: 'Adatvédelem', leiras: `Az ${cfg.marka} nem használ sütit és követőkódot, a számítás a böngészőben fut.`, ut: 'adatvedelem/', tartalom });
}

export function nemTalalhatoOldal(k) {
  const tartalom = (L) => `
${oldalfej(L, { cim: 'Ez az oldal nincs meg', bevezeto: `Lehet, hogy elírás van a címben, vagy az oldal máshová került. <a href="${L.l('')}">Vissza a főoldalra</a>` })}`;
  return oldal({ ...k, cfg: { ...k.cfg, eles: false } }, { cim: 'Az oldal nem található', leiras: 'Az oldal nem található.', ut: '', tartalom });
}

/* ======================= BENZINES VAGY VILLANY ======================= */
/** A feltevések (árak, maradványérték) alapértékei a build napján. */
export function feltevesek(adat) {
  const lf = S.legfrissebbHonap(adat);
  const ar = adat.uzemanyag.evek[lf.ev][lf.honap];
  const e = adat.szabalyok.energia;
  return { benzin: ar.benzin, dizel: ar.dizel, aram_kedv: e.aram_kedv, aram_piaci: e.aram_piaci, tolto: e.tolto, veszteseg: e.veszteseg, otthoni: e.otthoni, sav_kwh: e.sav_kwh, haztartas: '', maradvany: adat.szabalyok.maradvany, lf };
}
export const PELDA = {
  km: 15000, evek: 8,
  a: { nev: 'Kompakt benzines', hajtas: 'benzin', ar: 12000000, kw: 110, fogyasztas: 6.2, szerviz: 150000, biztositas: 180000 },
  b: { nev: 'Kompakt villany', hajtas: 'elektromos', ar: 14500000, kw: 150, kwh: 16.5, szerviz: 90000, biztositas: 220000 },
};

function autoKartya(betu, cim, hajtas) {
  const p = `${betu}_`;
  const vM = (h) => h.map((x) => `${p}hajtas=${x}`).join('|');
  return `<div class="forgalmi ${betu}">${''}<div class="forgalmi-fej"><h2>${cim}</h2></div>
${sor('', `<label for="${p}nev">Megnevezés</label><div class="beir szeles"><input id="${p}nev" name="${p}nev" type="text" placeholder="${betu === 'a' ? 'pl. a mostani autóm' : 'pl. villanyautó'}" maxlength="40" style="font-size:22px"></div>`)}
${sor('P.3', negyzetek(`${p}hajtas`, 'Hajtás', HAJTASOK, hajtas, p))}
${sor('', szamMezo({ id: `${p}ar`, cim: 'Vételár', me: 'Ft', placeholder: 'pl. 12 000 000', min: 0 }))}
${sor('P.2', szamMezo({ id: `${p}kw`, cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 110', min: 1, sugo: 'Az adóhoz és az illetékhez kell.' }))}
${sor('', szamMezo({ id: `${p}fogyasztas`, cim: 'Fogyasztás', me: 'l/100 km', placeholder: 'pl. 6,2', tized: true, sugo: 'A valós, nem a gyári érték.' }), ` data-mutat="${vM(['benzin', 'dizel', 'hibrid', 'plugin'])}"`)}
${sor('', szamMezo({ id: `${p}kwh`, cim: 'Fogyasztás árammal', me: 'kWh/100 km', placeholder: 'pl. 16,5', tized: true, sugo: 'A töltési veszteséget mi tesszük hozzá.' }), ` data-mutat="${vM(['elektromos', 'plugin'])}"`)}
${sor('', szamMezo({ id: `${p}villanyArany`, cim: 'A kilométerek hány százalékát teszi meg árammal?', me: '%', placeholder: 'pl. 60', min: 0, max: 100 }), ` data-mutat="${vM(['plugin'])}"`)}
<details class="feltevesek"><summary>Szerviz, biztosítás, eladási ár</summary><div>
${sor('', szamMezo({ id: `${p}szerviz`, cim: 'Szerviz és javítás évente', me: 'Ft', placeholder: 'pl. 120 000', min: 0 }))}
${sor('', szamMezo({ id: `${p}biztositas`, cim: 'Biztosítás évente (kötelező és casco)', me: 'Ft', placeholder: 'pl. 150 000', min: 0 }))}
${sor('', szamMezo({ id: `${p}eladasiAr`, cim: 'Mennyiért adnád el a végén?', me: 'Ft', placeholder: 'üresen mi becsüljük', min: 0, sugo: 'Ha üresen hagyod, a piaci maradványérték-adatokkal számolunk.' }))}
</div></details>
</div>`;
}

export function osszehasonlitoOldal(k) {
  const { adat } = k;
  const { aktualis } = evek(k);
  const ut = 'benzin-vagy-villany/';
  const f = feltevesek(adat);
  const m = adat.szabalyok.maradvany;
  const pr = S.osszehasonlitas(adat, { km: PELDA.km, evek: PELDA.evek, ev: aktualis, ceges: false, f, autok: [PELDA.a, { ...PELDA.b, fogyasztas: PELDA.b.kwh }] });
  const [pa, pb] = pr.autok;
  const szazEv = S.energiaEv({ hajtas: 'elektromos', fogyasztas: 16.5 }, 15000, f);

  const kerdesek = [
    { k: `Megéri villanyautót venni ${M.rag(aktualis, 'ban', 'ben')}?`, v: [`Attól függ, mennyit autózol, és hol tudsz tölteni. A példánkban egy 12 milliós benzines és egy 14,5 milliós villanyautó évi 15 000 km mellett ${PELDA.evek} év alatt ${M.ftx(pr.kulonbseg)}-tal tér el, és ${pr.autok[pr.olcsobb].hajtas === 'elektromos' ? 'a villanyautó' : 'a benzines'} az olcsóbb${pr.megterul ? `: a drágább vételára ${M.tized(pr.megterul.honap / 12, 1)} év alatt jön vissza` : ''}. Ha többet jársz, vagy otthon tölthetsz, a villanyautó javára billen a mérleg; ha gyakran villámtöltőn töltesz, a benzines felé.`] },
    { k: 'Kapok állami támogatást, ha villanyautót veszek?', v: [`${adat.szabalyok.ev_tamogatas.allapot} Ellenőrizve: ${datumHu(adat.szabalyok.ev_tamogatas.ellenorizve)}. Ha új program indul, itt jelezzük, és a kalkulátorban a vételárból levonhatod.`] },
    { k: 'Mennyibe kerül 100 km villanyautóval?', v: [`Egy 16,5 kWh/100 km-es autó a 10%-os töltési veszteséggel nagyjából 18,2 kWh-t vesz fel 100 km-en. Otthoni áramon, a kedvezményes sáv felett ez ${M.ftx(18.15 * f.aram_piaci)}, a kedvezményes sávon belül ${M.ftx(18.15 * f.aram_kedv)}, nyilvános töltőn ${f.tolto} Ft/kWh mellett ${M.ftx(18.15 * f.tolto)}. Ugyanennyi út egy 6,2 literes benzinessel ${M.ftx(6.2 * f.benzin)}.`] },
    { k: 'Mi az a 2523 kWh-s szabály, és miért számít a töltésnél?', v: [`A háztartások évi ${fmt(f.sav_kwh)} kWh-ig kapják a rezsicsökkentett árat (A1 tarifán ${M.tized(f.aram_kedv)} Ft/kWh), afölött a lakossági piaci árat (${M.tized(f.aram_piaci, 3)} Ft/kWh). Egy átlagos háztartás ezt a keretet a töltés nélkül is nagyrészt elhasználja, így az otthoni töltés jellemzően már a drágább áron megy. A kalkulátor ezért megkérdezi a háztartás fogyasztását, és ha nem adod meg, a drágább árral számol.`] },
    { k: 'Kell gépjárműadót és illetéket fizetni villanyautó után?', v: ['Nem. A tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó mentes a gépjárműadó, az átírási illeték és a cégautóadó alól is. A plug-in hibrid és a hagyományos hibrid nem mentes.'] },
    { k: 'Mennyit ér egy villanyautó 3 év múlva?', v: [`A német DAT adatai szerint 2026 nyarán a 3 éves villanyautók átlagosan az újkori listaáruk ${M.tized(m.elektromos.harom)}%-át érték, a benzinesek ${M.tized(m.benzin.harom)}%-át, a dízelek ${M.tized(m.dizel.harom)}%-át. A különbség az utóbbi egy évben szűkült. A magyar használtautó-piacon a KSH modellje szerint utána a benzinesek évente ${M.tized(m.benzin.evi)}%-ot, a villanyautók és a dízelek ${M.tized(m.elektromos.evi)}%-ot veszítenek az értékükből.`] },
  ];
  const leiras = `Benzines vagy elektromos autó? Két autó teljes költsége havonta és ${PELDA.evek} évre előre: értékvesztés, energia, adók. Mikor térül meg a drágább autó, és hány km-től éri meg.`;

  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Benzin vagy villany'], cim: 'Benzines vagy elektromos autó: melyik éri meg?', valasz: `Otthon töltve 100 km áramból nagyjából harmadannyiba kerül, mint benzinből, de az elektromos autó drágább, és az első években gyorsabban veszít az értékéből. Hogy megéri-e, főleg azon múlik, mennyit autózol és hol töltesz.` })}
<form class="keret osszevet-urlap" data-kalk="osszevet" novalidate>
<div class="forgalmi kozos">${''}<div class="forgalmi-fej"><h2>Hogyan használod?</h2><button class="szoveg-gomb pelda-gomb" type="button" data-pelda>Példával kipróbálom</button></div>
<div class="sorok">
${sor('', szamMezo({ id: 'km', cim: 'Évente megtett út', me: 'km', placeholder: 'pl. 15 000', min: 0 }))}
${sor('', negyzetek('evek', 'Hány évig tartanád meg?', [[3, '3'], [5, '5'], [8, '8'], [10, '10']], 8))}
${sor('', szamMezo({ id: 'otthoni', cim: 'Mennyit töltesz otthon?', me: '%', ertek: f.otthoni, min: 0, max: 100, sugo: 'A maradékot nyilvános töltőn számoljuk.' }))}
</div>
${sor('', jelolo('ceges', 'Céges autó', 'A cégautóadóval is számolunk (az elektromos autó mentes).'))}
<details class="feltevesek"><summary>Árak és feltevések</summary>
<div class="sorok">
${sor('', szamMezo({ id: 'haztartas', cim: 'A háztartás áramfogyasztása töltés nélkül', me: 'kWh/év', placeholder: 'üresen: elfogy a sáv', min: 0, sugo: `A villanyszámládon látod. Évi ${fmt(f.sav_kwh)} kWh-ig jár a kedvezményes ár.` }))}
${sor('', szamMezo({ id: 'benzinAr', cim: 'Benzin', me: 'Ft/l', ertek: f.benzin, min: 0, sugo: `A NAV ${M.honapBan(f.lf.honap).replace(/ban$|ben$/, 'i')} ára.` }))}
${sor('', szamMezo({ id: 'dizelAr', cim: 'Dízel', me: 'Ft/l', ertek: f.dizel, min: 0 }))}
${sor('', szamMezo({ id: 'aramKedv', cim: 'Áram a kedvezményes sávban', me: 'Ft/kWh', ertek: f.aram_kedv, min: 0, tized: true }))}
${sor('', szamMezo({ id: 'aramPiaci', cim: 'Áram a sáv felett', me: 'Ft/kWh', ertek: f.aram_piaci, min: 0, tized: true }))}
${sor('', szamMezo({ id: 'tolto', cim: 'Nyilvános töltő', me: 'Ft/kWh', ertek: f.tolto, min: 0, sugo: 'MOL Plugee AC-listaár. Villámtöltőn (DC) drágább, nagyjából 270–290 Ft/kWh.' }))}
${sor('', szamMezo({ id: 'veszteseg', cim: 'Töltési veszteség', me: '%', ertek: f.veszteseg, min: 0, max: 40 }))}
</div></details>
</div>
<div class="ket-auto">
${autoKartya('a', 'Egyik autó', 'benzin')}
${autoKartya('b', 'Másik autó', 'elektromos')}
</div>
</form>
<div class="keret">${elszamolas(k, M.uresPanel('Add meg az évi kilométert, és mindkét autónál a vételárat, a teljesítményt és a fogyasztást. Vagy próbáld ki a példával.'), { cim: 'Összehasonlítás', szeles: true })}</div>

<div class="keret"><article class="cikk">
<h2>Mit számolunk bele?</h2>
<ul>
<li><strong>Értékvesztés.</strong> A vételár és a becsült eladási ár különbsége. Az első három évre a 3 éves autók piaci értékével számolunk (DAT: villanyautó ${M.tized(m.elektromos.harom)}%, benzines ${M.tized(m.benzin.harom)}%, dízel ${M.tized(m.dizel.harom)}%), utána a hazai használtautó-piac évi átlagos értékvesztésével. Ha tudod, mennyiért adnád el, írd be, és azzal számolunk.</li>
<li><strong>Üzemanyag vagy töltés.</strong> Benzin és dízel a NAV havi árán, áram otthon a 2523 kWh-s sávhatárral, nyilvános töltőn a megadott áron, ${f.veszteseg}% töltési veszteséggel.</li>
<li><strong>Adók.</strong> Az átírási illeték a vásárláskor, a gépjárműadó évente a NAV tételeivel (a még nem ismert évekre a legutóbbi tételekkel), céges autónál a cégautóadó, amelyből levonjuk a gépjárműadót.</li>
<li><strong>Szerviz és biztosítás,</strong> ha megadod.</li>
</ul>
<p>Nem számolunk a hitel kamatával, az esetleges állami támogatással és az otthoni töltő beszerelésével. Ezeket, ha rád vonatkoznak, add hozzá a vételárhoz.</p>
<h2>Amit a számok nem mutatnak</h2>
<ul>
<li><strong>Hol tudsz tölteni?</strong> Otthoni töltés nélkül a villanyautó költségét a nyilvános töltők ára határozza meg, és ez könnyen elviheti az előnyét. Próbáld ki a kalkulátort 0%-os otthoni töltéssel is.</li>
<li><strong>Tél és hosszú utak.</strong> Hidegben a villanyautó többet fogyaszt, és a hatótávja csökken. Ha gyakran jársz hosszú utakra, számolj a töltési megállókkal is.</li>
<li><strong>Akkumulátor.</strong> A gyártók többsége 8 év garanciát ad az akkumulátorra, jellemzően 160 000 km-ig. Használt villanyautónál kérd el az akkumulátor állapotfelmérését.</li>
<li><strong>Adómentesség.</strong> Az elektromos autó után nem kell gépjárműadót, átírási illetéket és cégautóadót fizetni. Ez a szabály változhat, a kalkulátor a mai állapottal számol.</li>
</ul>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: 'NAV: alkalmazható üzemanyagárak', url: adat.uzemanyag.forras, d: `${honapHu(f.lf.ev, f.lf.honap)}` },
  ...adat.szabalyok.energia.forrasok.map((x) => ({ nev: x.nev, url: x.url })),
  ...m.forrasok.map((x) => ({ nev: x.nev, url: x.url })),
])}
${tovabb(L, ut)}
</article></div>`;

  return oldal(k, {
    cim: `Benzines vagy elektromos autó ${aktualis}: melyik éri meg?`,
    leiras, ut, tartalom,
    adatJson: { tetelek: adat.tetelek, szabalyok: { maradvany: m, energia: adat.szabalyok.energia }, f: { ...f, lf: undefined }, ev: aktualis, pelda: PELDA },
    jsonld: [alkalmazasLd(k.cfg, 'Benzines vagy elektromos autó kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Benzin vagy villany', ut }])],
  });
}

/* ======================= FENNTARTÁS ======================= */
export function fenntartasOldal(k) {
  const { adat } = k;
  const { aktualis } = evek(k);
  const ut = 'autofenntartas-kalkulator/';
  const f = feltevesek(adat);
  const kerdesek = [
    { k: 'Mennyibe kerül egy autó fenntartása havonta?', v: ['Ez leginkább a futott kilométeren, az autó értékén és a biztosításon múlik. Egy átlagos, évi 15 000 km-t futó benzines autónál gyakran az üzemanyag és az értékvesztés a két legnagyobb tétel, a gépjárműadó jóval kisebb. Írd be a saját számaidat, és tételesen látod.'] },
    { k: 'Miért számít bele az értékvesztés?', v: ['Mert az is a te pénzed: ha 4 millióért veszel egy autót, és 5 év múlva 2,5 millióért adod el, az évi 300 000 forint, akkor is, ha közben nem fizetsz érte semmit. Ha nem akarod beleszámolni, hagyd üresen.'] },
    { k: 'Honnan tudom a saját számaimat?', v: ['A fogyasztást a tankolásokból (kilométer és liter), a biztosítást a díjértesítőből, a szervizt az elmúlt egy-két év számláiból. A gépjárműadót mi számoljuk ki a NAV tételeivel.'] },
  ];
  const leiras = 'Mennyibe kerül havonta az autód? Üzemanyag, értékvesztés, biztosítás, szerviz, gumi és gépjárműadó egy helyen, kilométerenkénti költséggel.';
  const tartalom = (L) => `
${(() => {
  const ev = ['benzin', 'dizel', 'hibrid', 'plugin', 'elektromos'].map((h) => adat.szabalyok.maradvany[h].evi);
  const valasz = `A két legnagyobb tétel általában az üzemanyag és az értékvesztés (egy használt autó évente az értékének nagyjából ${M.tized(Math.min(...ev), 0)}–${M.tized(Math.max(...ev), 0)}%-át veszíti el), utána a biztosítás és a szerviz jön. A gépjárműadó jellemzően a legkisebb.`;
  return oldalfej(L, { morzsa: ['Fenntartás'], cim: 'Mennyibe kerül egy autó fenntartása havonta?', valasz });
})()}
<div class="keret asztal">
${forgalmi({ kalk: 'fenntartas', cim: 'Az autó és a kiadások', autom: true, tartalom: `
<fieldset><legend>Az autó</legend>
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 85', min: 1, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2019', min: 1950, max: aktualis + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, ''))}
${sor('', szamMezo({ id: 'fogyasztas', cim: 'Fogyasztás', me: 'l/100 km', placeholder: 'pl. 6,5', tized: true }), ' data-mutat="hajtas=benzin|hajtas=dizel|hajtas=hibrid|hajtas=plugin"')}
${sor('', szamMezo({ id: 'kwh', cim: 'Fogyasztás', me: 'kWh/100 km', placeholder: 'pl. 17', tized: true }), ' data-mutat="hajtas=elektromos"')}
${sor('', szamMezo({ id: 'km', cim: 'Évente megtett út', me: 'km', placeholder: 'pl. 15 000', min: 0 }))}
</fieldset>
<fieldset><legend>Évente</legend>
<p class="fieldset-megj">Ami üresen marad, azzal nem számolunk.</p>
${sor('', szamMezo({ id: 'biztositas', cim: 'Biztosítás évente (kötelező és casco)', me: 'Ft', placeholder: 'pl. 150 000', min: 0 }))}
${sor('', szamMezo({ id: 'szerviz', cim: 'Szerviz és javítás évente', me: 'Ft', placeholder: 'pl. 120 000', min: 0 }))}
${sor('', szamMezo({ id: 'gumi', cim: 'Gumi és gumiszerelés évente', me: 'Ft', placeholder: 'pl. 40 000', min: 0 }))}
${sor('', szamMezo({ id: 'egyeb', cim: 'Matrica, parkolás, mosás, egyéb évente', me: 'Ft', placeholder: 'pl. 60 000', min: 0 }))}
</fieldset>
<fieldset><legend>Értékvesztés</legend>
${sor('', szamMezo({ id: 'ertek', cim: 'Mennyit ér most az autó?', me: 'Ft', placeholder: 'pl. 4 000 000', min: 0, sugo: 'Ha csak ezt adod meg, az értékvesztést az átlagos éves csökkenéssel becsüljük.' }))}
${sor('', szamMezo({ id: 'tartja', cim: 'Hány év múlva adnád el?', me: 'év', placeholder: 'pl. 5', min: 1, max: 30 }))}
${sor('', szamMezo({ id: 'ertekVeg', cim: 'Mennyiért adnád el akkor?', me: 'Ft', placeholder: 'pl. 2 500 000', min: 0 }))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg a teljesítményt, a gyártási évet, a fogyasztást és az évi kilométert.'))}
</div>
<div class="keret"><article class="cikk">
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([{ nev: 'NAV: alkalmazható üzemanyagárak', url: adat.uzemanyag.forras, d: honapHu(f.lf.ev, f.lf.honap) }, { nev: 'NAV: a gépjárműadó számítása', url: 'https://nav.gov.hu/gepjarmuado/az-ado-szamitasa' }, ...adat.szabalyok.energia.forrasok.slice(0, 3).map((x) => ({ nev: x.nev, url: x.url }))])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: `Autófenntartási költség ${aktualis}: mennyibe kerül havonta?`,
    leiras, ut, tartalom,
    adatJson: { tetelek: { gepjarmuado: adat.tetelek.gepjarmuado, gepjarmuado_mozgaskorlatozott: adat.tetelek.gepjarmuado_mozgaskorlatozott }, szabalyok: { maradvany: adat.szabalyok.maradvany }, f: { ...f, lf: undefined }, ev: aktualis },
    jsonld: [alkalmazasLd(k.cfg, 'Autófenntartási költség kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Fenntartás', ut }])],
  });
}

/* ======================= ADÁSVÉTELI SZERZŐDÉS ======================= */
export function adasveteliOldal(k) {
  const { adat } = k;
  const ut = 'adasveteli-szerzodes-minta/';
  const n = adat.szabalyok.adasvetel;
  const fel = (p, cim) => `<fieldset><legend>${cim}</legend>
${sor('', `<label for="${p}Nev">Név</label><div class="beir szeles"><input id="${p}Nev" name="${p}Nev" type="text" autocomplete="off"></div>`)}
<div class="ket">${sor('', `<label for="${p}SzulHely">Születési hely</label><div class="beir szeles"><input id="${p}SzulHely" name="${p}SzulHely" type="text"></div>`)}${sor('', `<label for="${p}SzulIdo">Születési idő</label><input id="${p}SzulIdo" name="${p}SzulIdo" type="date">`)}</div>
${sor('', `<label for="${p}Anyja">Anyja születési neve</label><div class="beir szeles"><input id="${p}Anyja" name="${p}Anyja" type="text"></div>`)}
${sor('', `<label for="${p}Cim">Lakcím</label><div class="beir szeles"><input id="${p}Cim" name="${p}Cim" type="text"></div>`)}
${sor('', `<label for="${p}Okmany">Személyi igazolvány vagy útlevél száma</label><div class="beir szeles"><input id="${p}Okmany" name="${p}Okmany" type="text"></div>`)}
</fieldset>`;
  const sz = (id, cim, kod = '', extra = '') => sor(kod, `<label for="${id}">${cim}</label><div class="beir szeles"><input id="${id}" name="${id}" type="text"${extra}></div>`);
  const kerdesek = [
    { k: 'Kell tanú az adásvételi szerződéshez?', v: ['Ahhoz, hogy a szerződés teljes bizonyító erejű magánokirat legyen, és az átírásnál elfogadják, két tanú aláírása kell, a nevükkel és a lakcímükkel. Ügyvédi ellenjegyzés esetén nem kell tanú.'] },
    { k: 'Hány példányban kell elkészíteni?', v: ['Négy eredeti példányban szokás: kettő az eladónak, kettő a vevőnek. Mindegyiket külön, eredetiben írja alá mindenki.'] },
    { k: 'Mit kell tennie az eladónak és a vevőnek az aláírás után?', v: [`Az eladónak ${n.elado_bejelentes_nap} napon belül be kell jelentenie az eladást, a vevőnek ${n.vevo_atiras_nap} napon belül kezdeményeznie kell az átírást. A vevőnek legkésőbb az átvételkor kötelező biztosítást kell kötnie, és az átíráshoz eredetiségvizsgálat is kell.`] },
    { k: 'Mi van, ha nincs meg a törzskönyv?', v: ['Az autó így is eladható, de a szerződésben rögzíteni kell, hogy a törzskönyv nincs meg. Az űrlapon ezt egy pipával jelezheted.'] },
  ];
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Adásvételi szerződés'], cim: 'Adásvételi szerződés autóhoz: mi kell bele?', valasz: 'A felek és az autó adatai, a vételár számmal és betűvel, és két tanú aláírása. Töltsd ki, és közben látod a kész, nyomtatható szerződést.' })}
<div class="keret szerzodes-tarto">
<form class="forgalmi csak-kepernyo" data-kalk="szerzodes" data-mai-datum="keltDatum" novalidate>${''}
<div class="forgalmi-fej"><h2>A szerződés adatai</h2></div>
${fel('e', 'Eladó')}
${fel('v', 'Vevő')}
<fieldset><legend>Az autó</legend>
${sz('tipus', 'Gyártmány és típus', 'D.1')}
<div class="ket">${sz('rendszam', 'Rendszám', 'A', ' style="text-transform:uppercase"')}${sor('B', '<label for="elsoForgalom">Első forgalomba helyezés</label><input id="elsoForgalom" name="elsoForgalom" type="date">')}</div>
${sz('alvaz', 'Alvázszám', 'E', ' maxlength="17" style="text-transform:uppercase"')}
${sz('motor', 'Motorszám')}
<div class="ket">${sz('forgalmi', 'Forgalmi engedély száma')}${sz('torzskonyv', 'Törzskönyv száma')}</div>
${sor('', jelolo('torzskonyvNincs', 'A törzskönyv nincs meg'))}
${sor('', szamMezo({ id: 'km', cim: 'Kilométeróra állása', me: 'km', min: 0 }))}
</fieldset>
<fieldset><legend>Vételár és átadás</legend>
${sor('', szamMezo({ id: 'vetelar', cim: 'Vételár', me: 'Ft', min: 0, sugo: 'Betűvel is kiírjuk.' }))}
${sor('', negyzetek('fizetes', 'Fizetés módja', [['keszpenz', 'Készpénz'], ['atutalas', 'Átutalás']], 'keszpenz'))}
<div class="ket">${sor('', '<label for="atadas">Az átadás napja</label><input id="atadas" name="atadas" type="date">')}${sor('', '<label for="tulajdon">A tulajdonjog átszállása</label><input id="tulajdon" name="tulajdon" type="date"><span class="sugo">Üresen: az átadás napja.</span>')}</div>
${sor('', jelolo('probaut', 'A vevő kipróbálta az autót', '', true))}
${sor('', jelolo('eredetiseg', 'Az eredetiségvizsgálat megtörtént'))}
</fieldset>
<fieldset><legend>Kelt</legend>
<div class="ket">${sz('keltHely', 'Hely')}${sor('', '<label for="keltDatum">Dátum</label><input id="keltDatum" name="keltDatum" type="date">')}</div>
</fieldset>
<div class="urlap-gombok"><button class="gomb" type="button" data-nyomtat>Nyomtatás vagy mentés PDF-be</button><button class="gomb masodlagos" type="button" data-urit>Űrlap törlése</button></div>
</form>
<div class="szerzodes-elonezet" aria-live="polite">${M.szerzodes(adat, {})}</div>
</div>
<div class="keret"><article class="cikk">
<h2>Mire figyelj az aláírás előtt?</h2>
<ul>
<li>Vesd össze az alvázszámot és a motorszámot a forgalmi engedéllyel és magával az autóval.</li>
<li>Az eredetiségvizsgálatot érdemes még a fizetés előtt elvégeztetni, mert az átíráshoz úgyis kell.</li>
<li>Készpénzes fizetésnél az eladó a szerződés aláírásával igazolja, hogy megkapta a pénzt. Nagyobb összegnél biztonságosabb az átutalás.</li>
<li>Ez egy általános minta. Hitelből vett vagy nagy értékű autónál, illetve cégek között kérj ügyvédi ellenjegyzést.</li>
</ul>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista(n.forrasok)}
${tovabb(L, ut)}
</article></div>`;
  const leiras = 'Kitölthető adásvételi szerződés minta használt autóhoz: a kötelező elemekkel, a vételár betűvel kiírva, tanúkkal, nyomtatható és PDF-be menthető formában.';
  return oldal(k, {
    cim: 'Adásvételi szerződés autóhoz: kitölthető minta',
    leiras, ut, tartalom,
    adatJson: { szabalyok: { adasvetel: n } },
    jsonld: [gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Adásvételi szerződés', ut }])],
  });
}

/** A Források oldal energiatáblájának egy sora: mit becsülünk és mennyi, a forrás 'mi' kulcsa szerint. */
function ENERGIA_SOR(adat, x) {
  const e = adat.szabalyok.energia;
  return ({ tolto: ['Nyilvános töltés', `${e.tolto} Ft/kWh`], piaci: ['Otthoni áram a sávhatár felett', `${M.tized(e.aram_piaci, 1)} Ft/kWh`], kedv: ['Otthoni áram a sávhatárig', `${M.tized(e.aram_kedv, 1)} Ft/kWh`], sav: ['A kedvezményes sáv', `${fmt(e.sav_kwh)} kWh/év`] })[x.mi] || [x.nev, ''];
}
const forrasbol = (lista) => lista.map((f) => ({ nev: f.nev, url: f.url, d: f.idoszak || f.d || '' }));

/* ======================= PLUG-IN HIBRID 2027 ======================= */
export function phevOldal(k) {
  const { adat } = k;
  const ut = 'plug-in-hibrid-2027/';
  const p = adat.szabalyok.phev;
  const gj27 = adat.tetelek.gepjarmuado[2027];
  const ct27 = adat.tetelek.cegautoado[2027];
  const hataridoElott = k.ma <= p.rendszam_hatarido;
  const kerdesek = [
    { k: 'Mennyi gépjárműadót fizet egy plug-in hibrid 2027-ben?', v: [`Ugyanannyit, mint egy benzines autó: a teljesítményt (kW) szorozzák az autó korához tartozó tétellel. 2027-ben ez kilowattonként ${Math.min(...gj27.savok)}–${Math.max(...gj27.savok)} Ft, minél idősebb az autó, annál kevesebb.`] },
    { k: 'Mi történik, ha nem cserélem le a zöld rendszámot november 30-ig?', v: ['December 1-jétől zöld rendszámmal nem lehet közlekedni. Ha ellenőrzik az autót, a hatóság a helyszínen bevonhatja a forgalmi engedélyt és a rendszámot.'] },
    { k: 'Új rendszámot kérjek, vagy tartsam meg a régit?', v: [`Új karakterekkel ${M.ftx(p.rendszam_uj_karakter_ft)}, és egy alkalommal elintézhető. Ha a régi karaktereket tartod meg, ${M.ftx(p.rendszam_azonos_karakter_ft)}, de kétszer kell menni. Előnye, hogy a biztosítás, a parkolási bérlet és a matrica a régi rendszámhoz kötve marad.`, 'Ha új rendszámot kérsz, az e-matricát díjmentesen átvezetik az új rendszámra, de a biztosítónak és a parkolási szolgáltatónak neked kell szólnod.'] },
    { k: 'Mennyi cégautóadót fizet egy céges plug-in hibrid?', v: [`A cégautóadó havi tétele a teljesítménytől függ, a plug-in hibrid a legalacsonyabb oszlopban van: 2027-ben havonta ${ct27.tabla.map((x) => fmt(x[2])).join(', ')} Ft a négy teljesítménysávban. Az éves összegből levonható a befizetett gépjárműadó.`] },
    { k: 'A villanyautók is fizetnek a budapesti parkolásért 2027-től?', v: ['Igen. 2027. január 1-jétől Budapesten a zöld rendszámos, tisztán elektromos autók is fizetnek a közterületi parkolásért. Más városokban a helyi rendelet dönt.'] },
    { k: 'Az illeték és a regisztrációs adó is változik?', v: ['Nem, ezek már 2025. január 1. óta vonatkoznak a plug-in hibridekre. Az átírási illetéket az Átírás kalkulátorban számolhatod ki.'] },
  ];
  const leiras = 'Mennyivel drágul a plug-in hibrid 2027-ben? Gépjárműadó, cégautóadó, budapesti parkolás és a zöld rendszám cseréje, a NAV 2027-es tételeivel.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Plug-in hibrid 2027'], cim: 'Mennyivel drágul a plug-in hibrid 2027-ben?', valasz: `2027-től minden plug-in hibrid fizet gépjárműadót, a céges autók cégautóadót is, és Budapesten megszűnik az ingyenes parkolás. A zöld rendszámot ${M.datumIg(p.rendszam_hatarido)} fehérre kell cserélni.` })}
<div class="keret asztal">
${forgalmi({ kalk: 'phev', cim: 'Az autó adatai', tartalom: `
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 135', min: 1, max: 2000, extra: egysegValto, sugo: 'A rendszerteljesítmény, ahogy a forgalmiban szerepel.' }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2022', min: 1990, max: k.ev + 1 }))}
${sor('B', jelolo('regi', '2025. január 1. előtt helyezték forgalomba', 'Ilyenkor 2026 végéig mentes a gépjárműadó és a cégautóadó alól.'))}
${sor('', jelolo('zold', 'Zöld rendszáma van', 'A 2024. szeptember 1. előtt forgalomba helyezett plug-in hibridek kaptak zöld rendszámot.'))}
${sor('', szamMezo({ id: 'parkolasHavi', cim: 'Mennyit fizetnél havonta parkolásért Budapesten?', me: 'Ft', placeholder: 'pl. 15 000', min: 0, sugo: 'Amennyit most a zöld rendszámmal megspórolsz. Ha nem parkolsz fizetős helyen, hagyd üresen.' }), ' data-mutat="zold"')}
${sor('', jelolo('ceges', 'Céges autó', 'A cég nevén van, vagy a cég költségként számolja el. Ilyenkor cégautóadót is fizetni kell.'))}` })}
${elszamolas(k, M.uresPanel('Add meg a teljesítményt és a gyártási évet.'))}
</div>
<div class="keret"><article class="cikk">
<h2>Mi változik, és mikor?</h2>
<ol class="idovonal">
<li${hataridoElott ? ' class="kozel"' : ''}><time datetime="${p.rendszam_hatarido}">${datumHu(p.rendszam_hatarido)}</time><div><p><strong>Lejár a zöld rendszám cseréjének határideje.</strong> Utána zöld rendszámmal nem lehet közlekedni.</p><p class="kit">Az „5P” és „5N” jelzésű, zöld rendszámos plug-in hibrideket érinti.</p></div></li>
<li><time datetime="${p.mentesseg_vege}">${datumHu(p.mentesseg_vege)}</time><div><p><strong>Lejár a gépjárműadó- és a cégautóadó-mentesség.</strong></p><p class="kit">A 2025. január 1. előtt forgalomba helyezett plug-in hibrideket érinti. A később forgalomba helyezettek már most is fizetnek.</p></div></li>
<li><time datetime="${p.budapest_ingyenes_parkolas_vege}">${datumHu(p.budapest_ingyenes_parkolas_vege)}</time><div><p><strong>Megszűnik az ingyenes közterületi parkolás Budapesten.</strong></p><p class="kit">Minden zöld rendszámos autót érint, a tisztán elektromosakat is.</p></div></li>
</ol>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: 'NAV: belföldi gépjárműadó 2027. évre valorizált mértéke', url: gj27.forras, d: `közzétéve: ${datumHu(gj27.kozzeteve)}` },
  { nev: 'NAV: a cégautóadó 2027. évre valorizált mértéke', url: ct27.forras, d: `közzétéve: ${datumHu(ct27.kozzeteve)}` },
  ...forrasbol(p.forrasok),
])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Plug-in hibrid 2027: adó, parkolás és rendszámcsere',
    leiras, ut, tartalom,
    adatJson: { tetelek: { gepjarmuado: adat.tetelek.gepjarmuado, gepjarmuado_mozgaskorlatozott: adat.tetelek.gepjarmuado_mozgaskorlatozott, cegautoado: adat.tetelek.cegautoado }, szabalyok: { phev: p }, ma: k.ma },
    jsonld: [alkalmazasLd(k.cfg, 'Plug-in hibrid 2027 kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Plug-in hibrid 2027', ut }])],
  });
}

/* ======================= AUTÓPÁLYA-MATRICA ======================= */
export function matricaOldal(k) {
  const { adat } = k;
  const ut = 'autopalya-matrica-kalkulator/';
  const m = adat.szabalyok.matrica, d = m.d1;
  const r = S.matrica(adat, { napi: 1 });
  const kerdesek = [
    { k: 'Mennyibe kerül az éves autópálya-matrica?', v: [`Személyautóra (D1) az éves országos matrica ${M.ftx(d.eves)}, a vármegyei ${M.ftx(d.varmegyei)} vármegyénként. Az éves matrica ${m.eves_ervenyes} érvényes, vagyis 13 hónapig.`] },
    { k: 'Mikor éri meg az éves matrica?', v: [`Ha egy évben legalább ${r.hatar.napi} napi, ${r.hatar.tiznapos} tíznapos vagy ${r.hatar.havi} havi matricát vennél helyette, vagy ha legalább ${r.hatar.varmegyei} vármegyében autópályázol rendszeresen. Ha a kettő keveredik, a kalkulátor kiszámolja.`] },
    { k: 'Mi az M1 regionális matrica?', v: [`${M.ftx(d.m1_regionalis)}-ért egy évig használhatod a díjköteles utakat ${m.m1_varmegyek.slice(0, -1).join(', ')} és ${m.m1_varmegyek.at(-1)} vármegyében. Négy vármegyei matrica ${M.ftx(4 * d.varmegyei)} lenne, három ${M.ftx(3 * d.varmegyei)}.`] },
    { k: 'Mennyi a pótdíj, ha nincs matricám?', v: [`Személyautóval ${M.ftx(m.potdij.alap)}. Ha 60 napon belül nem fizeted be, ${M.ftx(m.potdij.hatvan_nap_utan)}.`] },
    { k: 'Kapható már a 2027-es matrica?', v: [`A 2027-es díjakat még nem tették közzé. Ha most veszel éves matricát, az ${m.eves_ervenyes} érvényes, így 2027 januárját is lefedi.`] },
    { k: 'Hol vehetek matricát?', v: ['A Nemzeti Útdíjfizetési Szolgáltató oldalán, a mobilos alkalmazásokban és a benzinkutakon. Az e-matrica a rendszámhoz kötődik, az autóra nem kell semmit ragasztani.'] },
  ];
  const leiras = 'Melyik autópálya-matricát érdemes megvenni? Éves, havi, tíznapos, napi és vármegyei e-matrica személyautóra: kiszámoljuk, neked melyik a legolcsóbb.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Autópálya-matrica'], cim: 'Melyik autópálya-matricát érdemes megvenni?', valasz: `Személyautóra az éves országos matrica ${M.ftx(d.eves)}, a vármegyei ${M.ftx(d.varmegyei)}, a napi ${M.ftx(d.napi)}. Az éves akkor éri meg, ha egy évben legalább ${r.hatar.napi} napot vagy ${r.hatar.tiznapos} tíznapos utat autópályázol.` })}
<div class="keret asztal">
${forgalmi({ kalk: 'matrica', cim: 'Merre és mennyit autózol?', tartalom: `
<fieldset><legend>Alkalmi utak egy évben</legend>
${sor('', szamMezo({ id: 'napi', cim: 'Egynapos utak', me: 'db', placeholder: 'pl. 3', min: 0, max: 365 }))}
${sor('', szamMezo({ id: 'tiznapos', cim: 'Legfeljebb tíznapos utak', me: 'db', placeholder: 'pl. 1', min: 0, max: 36, sugo: 'Például a nyaralás. A tíznapos matrica egymást követő tíz napra szól.' }))}
${sor('', szamMezo({ id: 'havi', cim: 'Hónapok, amikor sokat autópályázol', me: 'db', placeholder: 'pl. 0', min: 0, max: 12 }))}
</fieldset>
<fieldset><legend>Rendszeres utak</legend>
${sor('', szamMezo({ id: 'varmegyek', cim: 'Hány vármegyében autópályázol rendszeresen?', me: 'db', placeholder: 'pl. 1', min: 0, max: 19, sugo: 'Például munkába járáskor. Minden vármegyéhez külön vármegyei matrica kell.' }))}
${sor('', jelolo('m1', 'Ezek mind M1 menti vármegyék', `${m.m1_varmegyek.join(', ')}. Ide ${M.ftx(d.m1_regionalis)}-ért regionális matrica is kapható.`))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg, évente hányszor és hol autópályázol.'))}
</div>
<div class="keret"><article class="cikk">
<h2 id="dijak">Az e-matrica díjai személyautóra</h2>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Matrica</th><th>Díj, ${m.ev}</th><th>Meddig érvényes?</th></tr></thead><tbody>
<tr><td>Napi</td><td>${M.ftx(d.napi)}</td><td>a megadott napon</td></tr>
<tr><td>Tíznapos</td><td>${M.ftx(d.tiznapos)}</td><td>tíz egymást követő napon</td></tr>
<tr><td>Havi</td><td>${M.ftx(d.havi)}</td><td>a kezdőnaptól a következő hónap azonos napjáig</td></tr>
<tr><td>Éves országos</td><td>${M.ftx(d.eves)}</td><td>${m.eves_ervenyes}</td></tr>
<tr><td>Éves vármegyei</td><td>${M.ftx(d.varmegyei)}</td><td>egy vármegyére, ${m.eves_ervenyes}</td></tr>
<tr><td>M1 regionális</td><td>${M.ftx(d.m1_regionalis)}</td><td>a négy M1 menti vármegyére, egy évre</td></tr>
</tbody><caption>D1 kategória: személyautó. A ${m.ev + 1}. évi díjakat még nem tették közzé.</caption></table></div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista(forrasbol(m.forrasok))}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: `Autópálya-matrica ${m.ev}: melyik éri meg? Kalkulátor`,
    leiras, ut, tartalom,
    adatJson: { szabalyok: { matrica: m } },
    jsonld: [alkalmazasLd(k.cfg, 'Autópálya-matrica kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Autópálya-matrica', ut }])],
  });
}

/* ======================= AUTÓVÁSÁRLÁS HITELBŐL ======================= */
export function hitelOldal(k) {
  const { adat } = k;
  const ut = 'autohitel-kalkulator/';
  const h = adat.szabalyok.hitel;
  const kerdesek = [
    { k: 'Mekkora önerő kell az autóhitelhez?', v: [`Az MNB szabálya szerint forintban felvett autóhitelnél a hitel legfeljebb az autó értékének ${h.hfm_hitel}%-a lehet, vagyis legalább ${100 - h.hfm_hitel}% önerő kell. Pénzügyi lízingnél a határ ${h.hfm_lizing}%. A bank ennél többet is kérhet.`] },
    { k: 'Mi a THM, és miért azzal számolunk?', v: ['A teljes hiteldíj mutató a kamaton felül a kötelező díjakat is tartalmazza, ezért ezzel lehet összevetni a bankok ajánlatait. A törlesztőt is ebből számoljuk. A pontos összeget a bank ajánlata tartalmazza, mert a díjak egy része nem havonta jelentkezik.'] },
    { k: 'Mit jelent az autó valódi költsége?', v: ['Amennyit a futamidő alatt összesen kifizetsz (önerő, törlesztők, átírás), mínusz amennyit az autó a végén még ér. Ez mutatja meg, mennyibe került ténylegesen az, hogy évekig autód volt. Az üzemanyag, a biztosítás és a szerviz nincs benne, azokat a Fenntartás kalkulátor számolja.'] },
    { k: 'Kell casco az autóhitelhez?', v: ['Általában igen: a bankok a hitel vagy a lízing teljes idejére casco-t kérnek. Ez évente több tízezer, drágább autónál több százezer forint is lehet, ezért kérj rá ajánlatot még a szerződés előtt.'] },
    { k: 'Hitel vagy lízing?', v: ['Hitelnél az autó a te neveden van, a bank zálogjogot jegyeztet be. Pénzügyi lízingnél a futamidő alatt a lízingcég a tulajdonos, te vagy az üzembentartó. A lízinghez kevesebb önerő is elég lehet, cégnél pedig másképp számolják el az áfát és a költségeket.'] },
  ];
  const leiras = 'Havi törlesztő THM-mel, a kamat és a díjak összege, az átírás és az értékvesztés: mennyibe kerül valójában az autó hitelből.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Autóhitel'], cim: 'Mennyibe kerül valójában az autó hitelből?', valasz: `A havi törlesztő a hitelösszegből, a futamidőből és a THM-ből jön ki. Forintban felvett autóhitelnél a bank legfeljebb az autó értékének ${h.hfm_hitel}%-át hitelezheti, vagyis legalább ${100 - h.hfm_hitel}% önerő kell.` })}
<div class="keret asztal">
${forgalmi({ kalk: 'hitel', cim: 'Az autó és a hitel', tartalom: `
<fieldset><legend>A hitel</legend>
${sor('', szamMezo({ id: 'ar', cim: 'Vételár', me: 'Ft', placeholder: 'pl. 6 000 000', min: 0 }))}
${sor('', szamMezo({ id: 'onero', cim: 'Önerő', me: 'Ft', placeholder: 'pl. 1 500 000', min: 0 }))}
${sor('', szamMezo({ id: 'evek', cim: 'Futamidő', me: 'év', placeholder: 'pl. 5', min: 1, max: 10 }))}
${sor('', szamMezo({ id: 'thm', cim: 'THM', me: '%', placeholder: 'pl. 11,9', tized: true, sugo: 'A bank ajánlatában szerepel.' }))}
</fieldset>
<fieldset><legend>Az autó</legend>
<p class="fieldset-megj">Ebből számoljuk az átírás költségét és az értékvesztést.</p>
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 110', min: 1, max: 2000, extra: egysegValto }))}
${sor('', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2021', min: 1950, max: k.ev + 1 }))}
${sor('P.3', negyzetek('hajtas', 'Hajtás', HAJTASOK, ''))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg a vételárat, az önerőt, a futamidőt és a THM-et.'))}
</div>
<div class="keret"><article class="cikk">
<h2>Mire figyelj a szerződés előtt?</h2>
<ul>
<li><strong>A THM-et hasonlítsd össze, ne a kamatot.</strong> Két ajánlat közül az olcsóbb az, amelyiknek alacsonyabb a THM-je azonos futamidőre.</li>
<li><strong>Kérdezd meg az előtörlesztés díját.</strong> Ha a futamidő előtt eladnád az autót, a hitelt egy összegben vissza kell fizetni.</li>
<li><strong>Számolj a casco-val.</strong> A bankok általában kötelezővé teszik, és ez a törlesztőn felüli kiadás.</li>
<li><strong>A futamidő végén az autó kevesebbet ér.</strong> Hosszú futamidőnél előfordulhat, hogy egy ideig többel tartozol, mint amennyit az autó ér.</li>
</ul>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([...forrasbol(h.forrasok), { nev: 'NAV: a gépjárműadó és az illeték tételei', url: 'https://nav.gov.hu/gepjarmuado/az-ado-szamitasa' }, ...adat.szabalyok.maradvany.forrasok?.slice?.(0, 2).map((x) => ({ nev: x.nev, url: x.url, d: x.idoszak || '' })) || []])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Autóhitel-kalkulátor: törlesztő és valódi költség',
    leiras, ut, tartalom,
    adatJson: { tetelek: adat.tetelek, szabalyok: { okmanyok: adat.szabalyok.okmanyok, hataridok: adat.szabalyok.hataridok, maradvany: adat.szabalyok.maradvany, hitel: h }, ev: k.ev, ma: k.ma },
    jsonld: [alkalmazasLd(k.cfg, 'Autóhitel-kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Autóhitel', ut }])],
  });
}

/* ======================= LE–kW ÁTVÁLTÁS ======================= */
export function lekwOldal(k) {
  const ut = 'le-kw-atvaltas/';
  const tiz = (x) => M.tized(x, 1);
  const sorok = [60, 75, 90, 100, 110, 120, 130, 150, 170, 190, 200, 250, 300];
  const kerdesek = [
    { k: 'Hány kW egy lóerő?', v: ['1 lóerő 0,7355 kW, 1 kW pedig 1,36 lóerő. Fejben: a lóerőt oszd el 1,36-tal, és megkapod a kW-ot.'] },
    { k: 'Melyik szerepel a forgalmi engedélyben?', v: ['A kW. A forgalmi engedély P.2 sorában a teljesítmény kilowattban szerepel, és a gépjárműadót, az átírási illetéket és a cégautóadót is ebből számolják.'] },
    { k: 'Miért más a lóerő az autó hirdetésében?', v: ['A gyártók gyakran kerekítve adják meg a lóerőt, és a hirdetések egy része a brit lóerőt (hp) használja, ami 0,7457 kW. Az adóhoz mindig a forgalmiban szereplő kW-ot használd.'] },
  ];
  const leiras = 'Lóerő–kW átváltás: 1 LE = 0,7355 kW, 1 kW = 1,36 LE. Átváltó és táblázat, és hogy a forgalmi engedélyben melyik szerepel.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['LE–kW átváltás'], cim: 'Hány kW egy lóerő?', valasz: '1 lóerő 0,7355 kW, 1 kW 1,36 lóerő. A forgalmi engedély P.2 sorában kW szerepel, az adót és az illetéket is ebből számolják.' })}
<div class="keret">
<form class="forgalmi atvalto" data-kalk="lekw" novalidate>${''}<div class="forgalmi-fej"><h2>Átváltó</h2><p>Bármelyik mezőbe írhatsz.</p></div>
<div class="ket">${sor('', szamMezo({ id: 'le', cim: 'Lóerő', me: 'LE', placeholder: 'pl. 115', tized: true }))}${sor('P.2', szamMezo({ id: 'kwAt', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 85', tized: true }))}</div>
<p class="atvalto-ki" data-lekw-ki aria-live="polite"></p>
<p class="kicsi">Ha megvan a kW, <a href="${L.l('gepjarmuado-kalkulator/')}">számold ki a gépjárműadót</a> vagy <a href="${L.l('atirasi-illetek-kalkulator/')}">az átírás költségét</a>.</p>
</form>
</div>
<div class="keret"><article class="cikk">
<h2>Átváltási táblázat</h2>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Lóerő (LE)</th><th>Kilowatt (kW)</th><th>Kerekítve</th></tr></thead><tbody>
${sorok.map((le) => `<tr><td>${le} LE</td><td>${tiz(le * 0.73549875)} kW</td><td>${Math.round(le / 1.35962)} kW</td></tr>`).join('')}
</tbody><caption>A forgalmi engedélyben egész kW szerepel.</caption></table></div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'LE–kW átváltás: hány kW egy lóerő?',
    leiras, ut, tartalom,
    jsonld: [gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'LE–kW átváltás', ut }])],
    adatJson: {},
  });
}

/* ======================= RÓLUNK ======================= */
export function rolunkOldal(k) {
  const { cfg } = k;
  const ut = 'rolunk/';
  const marka = cfg.marka;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Rólunk'], cim: 'Kik vagyunk, és hogyan dolgozunk?', valasz: `${M.nevelo(marka).replace(/^a/, 'A')} ${marka} független, ingyenes oldal. A számokat a NAV és a jogszabályok közzétett adataiból vesszük, és minden eredménynél jelöljük, mi hivatalos, mi a te adatod és mi becslés.` })}
<div class="keret"><article class="cikk">
<h2>Ki készíti?</h2>
<p>${cfg.uzemelteto.nev ? `Az oldalt ${esc(cfg.uzemelteto.nev)} üzemelteti.` : 'Az üzemeltető adatai az oldal indulásakor kerülnek ide és az Impresszumba.'} Nem vagyunk a NAV, bank, biztosító vagy autókereskedés, és egyiktől sem kapunk pénzt azért, hogy mit írunk.</p>
<h2>Szerkesztői elvek</h2>
<ul>
<li><strong>Forrás nélkül nincs szám.</strong> Minden tételnél ott a forrás és a közzététel napja. A <a href="${L.l('forrasok/')}">Források</a> oldalon egy helyen is megtalálod őket.</li>
<li><strong>Megmondjuk, mi biztos és mi nem.</strong> Az eredményekben minden sor jelölést kap: <em>hivatalos</em>, ha a NAV vagy jogszabály szerinti tétel, <em>saját</em>, ha te adtad meg, <em>becslés</em>, ha a mi feltevésünk. A becslések módszerét leírjuk.</li>
<li><strong>Minden reggel ellenőrzünk.</strong> Egy program minden nap összeveti az adatainkat a NAV oldalával. Ha a NAV új tételt tesz közzé, átvesszük, és a <a href="${L.l('valtozasok/')}">Változások</a> oldalon jelezzük, mikor és mi változott.</li>
<li><strong>A hibát kijavítjuk, és leírjuk.</strong> ${cfg.kapcsolat_email ? `Ha hibát találsz, írj a <a href="mailto:${esc(cfg.kapcsolat_email)}">${esc(cfg.kapcsolat_email)}</a> címre, vagy használd az eredmény alatti „Szerinted hibás?” gombot.` : 'A hibabejelentés címe hamarosan itt lesz.'} A javítást a Változások oldalon is feltüntetjük.</li>
<li><strong>Nincs fizetett sorrend.</strong> Nem ajánlunk bankot, biztosítót vagy autót pénzért. Ha egyszer hirdetés vagy támogatás jelenik meg az oldalon, azt egyértelműen jelöljük, és nem befolyásolja a számokat.</li>
<li><strong>Nem gyűjtünk rólad adatot.</strong> Nincs regisztráció és nincs követő süti. Amit beírsz, a böngésződben marad, a mentett autód is. Hozzánk csak az jut el, amit a visszajelzés-dobozban magad elküldesz. Részletek az <a href="${L.l('adatvedelem/')}">Adatvédelem</a> oldalon.</li>
</ul>
<h2>Amit nem vállalunk</h2>
<p>A kalkulátorok tájékoztató jellegűek, és nem helyettesítik az adótanácsadást vagy a bank ajánlatát. A ténylegesen fizetendő adót és illetéket a NAV határozata tartalmazza.</p>
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, { cim: `Rólunk és szerkesztői elveink`, leiras: `Ki készíti ${M.nevelo(marka)} ${marka} oldalt, honnan vannak a számok, hogyan ellenőrizzük és javítjuk őket.`, ut, tartalom });
}

/* ======================= KÖTELEZŐ BIZTOSÍTÁS: VÁLTÁS ======================= */
export function kgfbOldal(k) {
  const { adat } = k;
  const ut = 'kotelezo-biztositas-valtas/';
  const kg = adat.szabalyok.kgfb;
  const jan = S.kgfb(adat, { evfordulo: `${k.ev}-01-01`, ma: k.ma });
  const kerdesek = [
    { k: 'Meddig mondhatom fel a kötelező biztosításomat?', v: [`A felmondásnak írásban kell beérkeznie a biztosítóhoz, legkésőbb 30 nappal az évforduló előtt. Ha az évfordulód január 1., a határidő december 1.${jan.elkesett ? '' : ` (most: ${datumHu(jan.felmondas)})`} Ha év közben kötötted, az évforduló a szerződés kezdőnapja, és a határidő ehhez igazodik.`] },
    { k: 'Köthetek új szerződést ugyanannál a biztosítónál?', v: ['Igen. Ha a régit határidőben felmondod, ugyanannál a biztosítónál is köthetsz újat, akár olcsóbbat. A biztosító az új ajánlatot jellemzően csak akkor utasíthatja el, ha a régi szerződést ő mondta fel, vagy díjnemfizetés miatt szűnt meg. Az ajánlatot legfeljebb 60 nappal az új időszak kezdete előtt teheted meg.'] },
    { k: 'Mikor jön a díjértesítő?', v: ['A biztosítónak legalább 50 nappal az évforduló előtt írásban értesítenie kell a jövő évi díjról. Január 1-jei évfordulónál ez november 11. Ebből látod, mennyit fizetnél, ha maradsz: ezt érdemes összevetni a többi biztosító ajánlatával.'] },
    { k: 'Mi történik, ha nem fizetem be a díjat, hogy megszűnjön?', v: ['Ne így válts. Ha a régi szerződés az évforduló előtt díjnemfizetés miatt szűnik meg, az új biztosítónál kötött szerződés sem lesz érvényes, és fedezetlenségi díjat is fizethetsz.'] },
    { k: 'Hogyan működik a bonus-malus?', v: [`Tizenöt osztály van: M4–M1 (pótdíjas), A00 (alap) és B1–B10 (kedvezményes). Ha egy évig nem okozol kárt, eggyel jobb osztályba kerülsz, ha a szerződés legalább ${kg.bm_megfigyeles_nap} napig élt. Minden okozott kár két osztállyal visszavet, négy vagy több kár után M4 jár. Az osztály minden biztosítónál ugyanaz, de hogy mekkora kedvezményt vagy pótdíjat ad érte, azt a biztosító dönti el.`] },
    { k: 'Elviszem a bonusomat, ha új autót veszek?', v: ['Igen, ha a régi szerződés megszűnése után két éven belül, ugyanolyan kategóriájú járműre (például személyautóra) kötsz újat: a biztosítónak figyelembe kell vennie a megszerzett besorolást. Az MNB állásfoglalása szerint az éves egy osztályos javulás ilyenkor nem jár, mert az csak ugyanarra az autóra vonatkozik. A kártörténeti igazolást a régi biztosítótól kérheted.'] },
  ];
  const leiras = 'Meddig mondhatod fel a kötelező biztosításodat? Kiszámoljuk a felmondási határidőt az évfordulódból, és hogy melyik bonus-malus osztályba kerülsz jövőre.';
  const osztalyok = [...kg.bm_osztalyok].reverse().map((o) => [o, o === 'A00' ? 'A00 (alap)' : o]);
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Kötelező biztosítás'], cim: 'Meddig mondhatom fel a kötelező biztosításomat?', valasz: 'A felmondásnak 30 nappal az évforduló előtt be kell érkeznie a biztosítóhoz: január 1-jei évfordulónál december 1-jéig. Az új szerződést az évfordulóig kell megkötni, akár ugyanannál a biztosítónál.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'kgfb', cim: 'A szerződésed', tartalom: `
${sor('', `<label for="evfordulo">Biztosítási évforduló</label><input id="evfordulo" name="evfordulo" type="date"><span class="sugo">A kötvényen szerepel. Ha 2010 előtt kötötted, és azóta nem váltottál, január 1. Egyébként a szerződés kezdőnapja. Az év mindegy.</span>`)}
<fieldset><legend>Bonus-malus</legend>
${sor('', valaszto('osztaly', 'Mostani osztályod', osztalyok, 'B10', 'A díjértesítőn és a kötvényen látod.'))}
${sor('', negyzetek('karok', 'Hány kárt okoztál ebben a biztosítási évben?', [['0', 'Egyet sem'], ['1', 'Egyet'], ['2', 'Kettőt'], ['3', 'Hármat'], ['4', 'Négyet vagy többet']], '0'))}
${sor('', jelolo('rovid', 'A szerződés 270 napnál rövidebb ideje él', 'Ilyenkor kármentes évnél sem javul az osztály.'))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg a biztosítási évfordulót.'))}
</div>
<div class="keret"><article class="cikk">
<h2>Így válts biztosítót</h2>
<ol class="lepesek">
<li><strong>Várd meg a díjértesítőt.</strong> Legalább 50 nappal az évforduló előtt megérkezik, ebből látod, mennyit fizetnél, ha maradsz.</li>
<li><strong>Kérj ajánlatokat.</strong> Összehasonlító oldalon vagy közvetlenül a biztosítóknál. Ugyanannál a biztosítónál is kérhetsz újat.</li>
<li><strong>Mondd fel a régit írásban.</strong> A felmondásnak 30 nappal az évforduló előtt be kell érkeznie. Postán ajánlottan, tértivevénnyel, vagy a biztosító online felületén, hogy igazolni tudd.</li>
<li><strong>Kösd meg az újat az évfordulóig.</strong> Így a fedezet megszakítás nélkül folytatódik. Az első díjat a szerződés szerinti határidőre fizesd be.</li>
</ol>
<h2>A bonus-malus osztályok</h2>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Mostani osztály</th><th>Kármentes év</th><th>1 kár</th><th>2 kár</th><th>3 kár</th><th>4 vagy több</th></tr></thead><tbody>
${[...kg.bm_osztalyok].reverse().map((o) => `<tr><td>${o}</td>${[0, 1, 2, 3, 4].map((n) => `<td>${S.bonusMalus(adat, o, n).uj}</td>`).join('')}</tr>`).join('')}
</tbody><caption>A 21/2011. (VI. 10.) NGM rendelet szerint. A kedvezmény vagy a pótdíj mértékét a biztosító állapítja meg.</caption></table></div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista(forrasbol(kg.forrasok))}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Kötelező biztosítás váltás: határidő és bonus-malus',
    leiras, ut, tartalom,
    adatJson: { szabalyok: { kgfb: kg } },
    jsonld: [alkalmazasLd(k.cfg, 'Kötelező biztosítás felmondási határidő kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Kötelező biztosítás', ut }])],
  });
}

/* ======================= MEGJAVÍTSAM VAGY CSERÉLJEM? ======================= */
export function javitasOldal(k) {
  const { adat } = k;
  const ut = 'megjavitsam-vagy-csereljem/';
  const kerdesek = [
    { k: 'Mikor éri meg megjavítani a régi autót?', v: ['Ha a javítás után az autó még évekig megbízható, és az éves fenntartása nem sokkal drágább, mint egy másik autóé. A javítás pénzét nem kapod vissza eladáskor, de a másik autónál a vételár különbözete és az átírás is pénz, és egy drágább autó gyorsabban veszít az értékéből.'] },
    { k: 'Mennyit ér a megjavított autó?', v: ['Ritkán annyit, amennyit beleraksz. Nézd meg a hirdetésekben, mennyiért kínálnak hasonló, rendben lévő autót, és annak a 85–90%-ával számolj, mert a hirdetési árból általában alkudnak. Ha üresen hagyod, a mostani értéket és a javítás árát adjuk össze, ami inkább felső becslés.'] },
    { k: 'Miért számol az értékvesztéssel a végén?', v: ['Mert az is a te pénzed: amennyit az autó a végén még ér, azt eladáskor visszakapod. Két autó összevetésénél ezért nem a vételár számít, hanem amennyibe a kettő a teljes idő alatt kerül.'] },
  ];
  const leiras = 'Megjavítsam a régi autót, vagy eladjam és vegyek másikat? Két út teljes költsége évekre előre: javítás, vételár, átírás, fenntartás és értékvesztés.';
  const autoMezok = (p, cim, szoveg) => `<fieldset><legend>${cim}</legend>${szoveg ? `<p class="fieldset-megj">${szoveg}</p>` : ''}`;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Javítás vagy csere'], cim: 'Megjavítsam az autót, vagy cseréljem le?', valasz: 'Az a jobb, amelyik a következő években kevesebbe kerül, ha a végén mindkét autót eladnád. Ebbe a javítás, a vételár különbözete, az átírás, a fenntartás és az értékvesztés is beletartozik.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'javitas', cim: 'A két lehetőség', tartalom: `
${autoMezok('a', 'A mostani autó')}
${sor('', szamMezo({ id: 'a_javitas', cim: 'Mennyibe kerül a javítás?', me: 'Ft', placeholder: 'pl. 1 000 000', min: 0 }))}
${sor('', szamMezo({ id: 'a_ertekMost', cim: 'Mennyiért adnád el most, javítás nélkül?', me: 'Ft', placeholder: 'pl. 1 500 000', min: 0 }))}
${sor('', szamMezo({ id: 'a_ertekJavitva', cim: 'Mennyit érne megjavítva?', me: 'Ft', placeholder: 'pl. 2 300 000', min: 0, sugo: 'A hirdetési árak 85–90%-a. Ha üresen hagyod, a mostani érték és a javítás összegével számolunk.' }))}
${sor('', szamMezo({ id: 'a_fenntartas', cim: 'Évente mennyit költesz rá?', me: 'Ft', placeholder: 'pl. 450 000', min: 0, sugo: 'Üzemanyag, szerviz, javítások, biztosítás, adó.' }))}
<div class="ket">${sor('', szamMezo({ id: 'a_gyartasiEv', nev: 'a_gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2003', min: 1950, max: k.ev + 1 }))}${sor('', valaszto('a_hajtas', 'Hajtás', HAJTASOK, 'benzin'))}</div>
</fieldset>
${autoMezok('c', 'A másik autó')}
${sor('', szamMezo({ id: 'c_ar', cim: 'Mennyiért vennéd?', me: 'Ft', placeholder: 'pl. 3 300 000', min: 0 }))}
${sor('', szamMezo({ id: 'c_fenntartas', cim: 'Évente mennyibe kerülne?', me: 'Ft', placeholder: 'pl. 300 000', min: 0 }))}
<div class="ket">${sor('', szamMezo({ id: 'c_gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2016', min: 1950, max: k.ev + 1 }))}${sor('P.2', szamMezo({ id: 'c_kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 110', min: 1, sugo: 'Az átírás miatt.' }))}</div>
${sor('', valaszto('c_hajtas', 'Hajtás', HAJTASOK, 'benzin'))}
</fieldset>
<fieldset><legend>Időtáv</legend>
${sor('', negyzetek('evek', 'Hány évre nézzük?', [['2', '2 év'], ['3', '3 év'], ['5', '5 év'], ['8', '8 év']], '3'))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg a javítás árát és a másik autó vételárát.'))}
</div>
<div class="keret"><article class="cikk">
<h2>Mire figyelj a döntésnél?</h2>
<ul>
<li><strong>Kérj írásos árajánlatot a javításra.</strong> Motor- és váltóhibánál a szétszedés után gyakran derül ki, hogy több alkatrész is kell.</li>
<li><strong>Nézd meg, mi jön még.</strong> Ha a futómű, a kuplung vagy a vezérlés is esedékes, add hozzá az éves fenntartáshoz.</li>
<li><strong>A másik autót is vizsgáltasd át.</strong> Egy használt autó vételára mellett számolj egy kisebb javítási kerettel is.</li>
<li><strong>A biztosítás és az adó is változik.</strong> Egy erősebb vagy fiatalabb autónál drágább lehet a kötelező biztosítás, a gépjárműadót pedig a <a href="${L.l('gepjarmuado-kalkulator/')}">gépjárműadó-kalkulátorban</a> számolhatod ki.</li>
</ul>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([...adat.szabalyok.maradvany.forrasok.map((x) => ({ nev: x.nev, url: x.url, d: x.idoszak || '' })), { nev: 'NAV: a gépjárműadó és az illeték tételei', url: 'https://nav.gov.hu/gepjarmuado/az-ado-szamitasa' }])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Megjavítsam vagy cseréljem az autót? Kalkulátor',
    leiras, ut, tartalom,
    adatJson: { tetelek: adat.tetelek, szabalyok: { okmanyok: adat.szabalyok.okmanyok, hataridok: adat.szabalyok.hataridok, maradvany: adat.szabalyok.maradvany }, ev: k.ev, ma: k.ma },
    jsonld: [alkalmazasLd(k.cfg, 'Javítás vagy csere kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Javítás vagy csere', ut }])],
  });
}

/* ======================= VÉTLEN BALESET ======================= */
export function vetlenOldal(k) {
  const { adat } = k;
  const ut = 'vetlen-baleset/';
  const v = adat.szabalyok.vetlen;
  const kerdesek = [
    { k: 'Jár csereautó, ha vétlenként összetörték az autómat?', v: ['A károkozó kötelező biztosítása a teljes károdat megtéríti, ebbe a közlekedés többletköltsége is beletartozik, amíg az autód javításon van. A bérautó költségét viszont számlával és bérleti szerződéssel kell igazolnod, és csak az indokolt időre és az autódhoz hasonló kategóriára. Igazolás nélkül a biztosító jellemzően csak átalányt fizet.', 'Hogy a bérautót előre kifizeti-e, az nem kötelező: kérdezd meg a biztosítót, van-e szerződött partnere, akivel közvetlenül elszámol. Ha a mindennapi életedhez (munka, gyermek iskolába vitele, ápolás) nélkülözhetetlen az autó, ezt írásban, igazolással együtt jelezd a kárbejelentésben.'] },
    { k: 'Meg kell várnom a rendőrségi határozatot?', v: ['Nem. A kárigényt nem kell a szabálysértési vagy büntetőeljárás jogerős lezárásáig halogatni, és a biztosító sem kötheti ehhez a kárrendezést, ha a felelősség egyébként egyértelmű.'] },
    { k: 'Mennyi idő alatt kell fizetnie a biztosítónak?', v: [`Ha a felelősség nem vitás, és minden szükséges irat megvan, a biztosító ${v.ajanlat_nap} napon belül, de legkésőbb a kárigény benyújtásától számított ${v.ajanlat_max_honap} hónapon belül köteles kártérítési javaslatot tenni, vagy indokolt választ adni.`] },
    { k: 'Elfogadjam a gyors, számla nélküli kifizetést?', v: ['Csak ha biztos vagy benne, hogy elég. Ha elfogadod, lemondasz minden további igényről, akkor is, ha a javítás végül többe kerül. A számla nélküli összegből a biztosítók jellemzően az áfát sem fizetik ki.'] },
    { k: 'Mit tehetek, ha a biztosító elutasít vagy keveset fizet?', v: ['Először írásban panaszt kell tenned a biztosítónál. Ha a válasz nem megfelelő, a Magyar Nemzeti Bank mellett működő Pénzügyi Békéltető Testülethez fordulhatsz, ez ingyenes. Végül bírósághoz is fordulhatsz.'] },
    { k: 'Mi van, ha a károkozónak nincs biztosítása, vagy elhajtott?', v: ['Ilyenkor a MABISZ Kártalanítási Számlája térít. Ismeretlen károkozónál a járműben keletkezett kárt csak akkor, ha a baleset halállal vagy súlyos személyi sérüléssel járt.'] },
  ];
  const leiras = 'Vétlen baleset után mi jár a károkozó kötelező biztosításától? Javítás, csereautó, értékcsökkenés, határidők, és mit tehetsz, ha a biztosító nem fizet.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Vétlen baleset'], cim: 'Mi jár, ha vétlenként összetörték az autódat?', valasz: `A károkozó kötelező biztosítása a teljes, igazolt károdat megtéríti: a javítást, a szállítást, a közlekedés többletköltségét és az értékcsökkenést is. A kárt ${v.karosult_bejelentes_nap} napon belül jelentsd be a károkozó biztosítójánál.` })}
<div class="keret"><article class="cikk">
<h2>Az első napokban</h2>
<ol class="lepesek">
<li><strong>Rögzíts mindent a helyszínen.</strong> Tölts ki közös kárbejelentőt a másik sofőrrel, vagy hívj rendőrt. Fotózd le az autókat, a helyszínt és a másik autó rendszámát, kérd el a károkozó biztosítójának nevét.</li>
<li><strong>Jelentsd be a kárt a károkozó biztosítójánál ${v.karosult_bejelentes_nap} napon belül.</strong> Ha nem tudod, ki az, a rendszám alapján a biztosítók és a MABISZ is megmondja. A bejelentés után kárszámot kapsz.</li>
<li><strong>Írd meg, mire van szükséged.</strong> Ha az autó nélkülözhetetlen (munka, gyermek iskolába vitele, ápolás), írd bele a kárbejelentésbe, és kérdezd meg, van-e szerződött bérautó-partnerük közvetlen elszámolással.</li>
<li><strong>Várd meg a szemlét a javítás előtt.</strong> A biztosító szakértője megnézi az autót. Ha a javítást a szemle előtt kezdik el, nehezebb lesz igazolni a kárt.</li>
<li><strong>Gyűjts minden számlát.</strong> Trélert, bérautót, taxit, parkolást: amit nem tudsz igazolni, azt nehezen fizetik ki.</li>
</ol>
<h2>Mit kérhetsz?</h2>
<div class="tabla-tarto"><table class="tabla szoveges"><thead><tr><th>Tétel</th><th>Mivel igazolod?</th></tr></thead><tbody>
<tr><td>Az autó javítása</td><td>Javítási számla, vagy a biztosító kalkulációja (számla nélkül jellemzően áfa nélkül fizetnek)</td></tr>
<tr><td>Szállítás, tréler, tárolás</td><td>Számla</td></tr>
<tr><td>Bérautó a javítás idejére</td><td>Bérleti szerződés és számla; az indokolt időre, hasonló kategóriában</td></tr>
<tr><td>Közlekedés, ha nem bérelsz autót</td><td>Menetjegyek, taxiszámlák; igazolás nélkül átalány</td></tr>
<tr><td>Értékcsökkenés javítás után</td><td>Szakértői vélemény, főleg fiatal autónál</td></tr>
<tr><td>Totálkárnál az autó értéke</td><td>A kárkori érték a roncs értékével csökkentve</td></tr>
<tr><td>Személyi sérülés, elmaradt jövedelem</td><td>Orvosi iratok, munkáltatói igazolás</td></tr>
</tbody><caption>A Ptk. szerint a károsultat teljes kártérítés illeti meg, de minden tételt neki kell igazolnia, és kötelessége a kárt enyhíteni.</caption></table></div>
<h2>Határidők</h2>
<div class="tabla-tarto"><table class="tabla szoveges"><thead><tr><th>Ki</th><th>Mit</th><th>Mennyi idő alatt?</th></tr></thead><tbody>
<tr><td>Te, károsultként</td><td>Kárbejelentés a károkozó biztosítójánál</td><td>${v.karosult_bejelentes_nap} nap</td></tr>
<tr><td>A biztosító</td><td>Kártérítési javaslat vagy indokolt válasz</td><td>${v.ajanlat_nap} nap az iratok beérkezésétől, legfeljebb ${v.ajanlat_max_honap} hónap</td></tr>
</tbody></table></div>
<p class="kicsi">Ez általános tájékoztatás, nem jogi tanácsadás. Vitás esetben a Pénzügyi Békéltető Testülethez vagy ügyvédhez fordulhatsz.</p>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista(forrasbol(v.forrasok))}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Vétlen baleset: mi jár a biztosítótól?',
    leiras, ut, tartalom,
    jsonld: [gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Vétlen baleset', ut }])],
  });
}

/* ======================= VÁLLALKOZÓKNAK ======================= */
// Kft., bt. és egyéni vállalkozók autós adói: gyűjtőoldal, cégautóadó-kalkulátor, cégautó vagy saját autó.
const VALL_UT = 'vallalkozoknak/';
const vallForrasok = (adat, mik) => forrasbol(adat.szabalyok.vallalkozo.forrasok.filter((f) => !mik || mik.includes(f.mi)));
/** A benyújtott 2027-es javaslat egy mondatban (GYIK-hez), amíg nincs elfogadva. */
function javaslatMondat(adat, savok = false) {
  const j = adat.szabalyok.vallalkozo.cegauto_javaslat;
  if (!j || j.allapot === 'elfogadva') return '';
  return `A ${M.datumNapon(j.benyujtva)} benyújtott törvényjavaslat ${M.rag(j.ev, 'tól', 'től')} ${savok ? `a ${j.kw_hatar} kW feletti autók tételét négy sávra bontva jelentősen emelné, és ` : ''}a gépjárműadót adózónként csak egy választott autónál engedné levonni. Ha elfogadják, frissítjük.`;
}
function javaslatBekezdes(adat) {
  const j = adat.szabalyok.vallalkozo.cegauto_javaslat;
  if (!j || j.allapot === 'elfogadva') return '';
  return `<p class="megjegyzes figyelem"><strong>${j.ev}-től változhat.</strong> ${javaslatMondat(adat, true).replace(/^A /, 'A ')} A 250 kW feletti, régebbi besorolású autók havi tétele például ${M.ftx(j.pelda_250kw_felett_regi_ft)} lenne. A számításban a NAV által közzétett ${j.ev}. évi tételek vannak.</p>`;
}
const cegEvek = (k) => Object.keys(k.adat.tetelek.cegautoado).map(Number).filter((e) => e >= k.ev).sort();
const OSZTALY_OPCIOK = [['', 'Válaszd ki'], ...Object.entries(S.CEG_OSZTALYOK).map(([k, o]) => [k, o.nev])];

/** A NAV cégautóadó-táblázata egy évre, a kiemelt sávval. */
function cegTabla(adat, ev) {
  const t = adat.tetelek.cegautoado[ev];
  return `<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Teljesítmény</th>${t.oszlopok.map((o) => `<th>${o}</th>`).join('')}</tr></thead><tbody>
${t.tabla.map((s, i) => `<tr><td>${S.CEG_SAVOK[i]}</td>${s.map((x) => `<td>${M.ftx(x)}</td>`).join('')}</tr>`).join('')}
</tbody><caption>Havi tétel autónként, ${ev}. A környezetvédelmi osztályjelzés a forgalmi engedély V.9 sorában van. A NAV ${M.datumNapon(t.kozzeteve)} tette közzé.</caption></table></div>`;
}

export function vallalkozoknakOldal(k) {
  const { adat } = k;
  const ut = VALL_UT;
  const evek = cegEvek(k);
  const ev = evek[0], t = adat.tetelek.cegautoado[ev];
  const min = Math.min(...t.tabla.flat()), max = Math.max(...t.tabla.flat());
  const kerdesek = [
    { k: 'Kell cégautóadót fizetni, ha a céges autót nem használom magáncélra?', v: ['Igen. A cég nevén lévő vagy általa pénzügyi lízingbe vett személyautó után a cégautóadót a használattól függetlenül meg kell fizetni. A céges személyautó magáncélú használata viszont adómentes, ezért nem kell külön kimutatni.'] },
    { k: 'Levonható a gépjárműadó a cégautóadóból?', v: ['Igen, ha ugyanarra az autóra, ugyanazokra a hónapokra ugyanaz fizeti mindkettőt, és a gépjárműadót határidőben befizették. Későn befizetett gépjárműadó utólag sem vonható le.', javaslatMondat(adat)].filter(Boolean) },
    { k: 'Kell cégautóadót fizetni a céges villanyautó után?', v: ['Nem. A tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó nem tartozik a cégautóadó alá. A plug-in hibrid („5P”, „5N”) 2025 óta igen, de a 2025 előtt forgalomba helyezettek 2026. december 31-ig mentesek.'] },
    { k: 'Mikor kell bevallani és befizetni a cégautóadót?', v: ['Negyedévente, a negyedévet követő hónap 20-áig: április 20., július 20., október 20. és január 20. A cég nevén lévő autónál az adó a szerzést követő hónap első napjától az eladás hónapjának utolsó napjáig jár. Egyéni vállalkozónál azokra a hónapokra, amelyekben az autó költségét elszámolja.'] },
    { k: 'Érdemes a saját autómat kiküldetési rendelvénnyel elszámolni a cégautó helyett?', v: ['Attól függ, mennyi üzleti utad van, és mennyibe kerül az autó. Sok üzleti kilométernél és olcsóbb autónál általában a saját autó, drágább autónál és kevés üzleti útnál a cégautó jön ki jobban. A „Cégautó vagy saját autó?” kalkulátor a te számaiddal kiszámolja.'] },
  ];
  const leiras = 'Autó a vállalkozásban: cégautóadó, kilométertérítés kiküldetési rendelvénnyel, és mi vonatkozik a kft.-re, az egyéni vállalkozóra és az átalányadózóra.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: ['Vállalkozóknak'], cim: 'Autó a vállalkozásban: mennyi adó, mi éri meg?', valasz: `Kft.-nél és bt.-nél a cég nevén lévő személyautó után havonta ${M.ftx(min)}–${M.ftx(max)} cégautóadó jár ${M.rag(ev, 'ban', 'ben')}, a saját autódat viszont kiküldetési rendelvénnyel adómentesen elszámolhatod. Átalányadózó és katás egyéni vállalkozó nem fizet cégautóadót.` })}
<section class="szakasz"><div class="keret">
<h2>Kalkulátorok</h2>
<ul class="lista">
<li><a href="${L.l('cegautoado-kalkulator/')}"><h3>Cégautóadó</h3><p>Mennyi a havi és az éves cégautóadó ${evek.map((e) => M.rag(e, 'ban', 'ben')).join(' és ')}, a gépjárműadó levonásával, negyedéves határidőkkel.</p><span class="ugrik">Kiszámolom</span></a></li>
<li><a href="${L.l('cegauto-vagy-sajat-auto/')}"><h3>Cégautó vagy saját autó?</h3><p>A cég vegye meg az autót, vagy a sajátodat számold el km-térítéssel? A két út a te zsebedből nézve, és hány km üzleti út felett fordul.</p><span class="ugrik">Összehasonlítom</span></a></li>
<li><a href="${L.l('kilometerterites-kalkulator/')}"><h3>Kilométertérítés</h3><p>Mennyit fizethet adómentesen a cég egy üzleti útra a saját autódért: a NAV havi üzemanyagára, az alapnorma és a 15 Ft/km.</p><span class="ugrik">Kiszámolom</span></a></li>
</ul>
</div></section>
<div class="keret"><article class="cikk">
<h2>Melyik szabály vonatkozik rád?</h2>
<div class="tabla-tarto"><table class="tabla szoveges"><thead><tr><th>Ha</th><th>Cégautóadó</th><th>A saját autód elszámolása</th></tr></thead><tbody>
<tr><td>Kft. vagy bt. tulajdonosa vagy</td><td>A cég nevén lévő vagy általa pénzügyi lízingbe vett személyautó után havonta jár, negyedévente kell bevallani és befizetni. A céges autó magáncélú használata adómentes.</td><td>Ha ügyvezetőként vagy munkavállalóként utazol, a cég kiküldetési rendelvénnyel adómentes km-térítést fizethet az üzleti utakra. Ha csak ezt a normás térítést fizeti, és más költséget nem számol el az autóra, nincs cégautóadó.</td></tr>
<tr><td>Egyéni vállalkozó vagy, és a vállalkozói jövedelmed után adózol</td><td>Csak akkor kell fizetni, ha az autó költségeit tételesen elszámolod.</td><td>Útnyilvántartás nélkül havonta 500 km-t számolhatsz el átalányban. Ez nem tételes elszámolás, ezért nem jár vele cégautóadó.</td></tr>
<tr><td>Átalányadózó egyéni vállalkozó vagy</td><td>Nem kell fizetni.</td><td>Az autót nem számolod el külön: a bevételedből levont költséghányad mindent magában foglal.</td></tr>
<tr><td>Katás vagy</td><td>Nem kell fizetni.</td><td>Költséget nem számolsz el.</td></tr>
</tbody><caption>A NAV 31. számú információs füzete (2026. január 22.) alapján.</caption></table></div>
<h2>Mennyi a cégautóadó ${M.rag(ev, 'ban', 'ben')}?</h2>
<p>A havi tétel az autó teljesítményétől és környezetvédelmi osztályától függ, a kortól nem. A legtöbb mai autó („14”, „15”, és a hibridek „5” jelzéssel) a jobb oldali oszlopban van.</p>
${cegTabla(adat, ev)}
${javaslatBekezdes(adat)}
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([{ nev: `NAV: a cégautóadó ${M.os(ev)} valorizált mértéke`, url: t.forras || adat.tetelek.cegautoado[evek[evek.length - 1]].forras, d: `közzétéve: ${datumHu(t.kozzeteve)}` }, ...vallForrasok(adat, ['cegauto', 'szja', 'tao'])])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Vállalkozóknak: cégautóadó, cégautó vagy saját autó',
    leiras, ut, tartalom,
    adatJson: {},
    jsonld: [gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Vállalkozóknak', ut }])],
  });
}

export function cegautoadoOldal(k) {
  const { adat } = k;
  const ut = 'cegautoado-kalkulator/';
  const evek = cegEvek(k);
  const ev = evek[0], jovo = evek[1];
  const t = adat.tetelek.cegautoado[ev];
  const kerdesek = [
    { k: `Mennyi a cégautóadó egy átlagos autó után ${M.rag(ev, 'ban', 'ben')}?`, v: [`Egy 51–90 kW-os, Euro 6-os („15”) autó után havonta ${M.ftx(t.tabla[1][2])}, egy 91–120 kW-os után ${M.ftx(t.tabla[2][2])}. Ebből évente levonható az autó gépjárműadója.`] },
    { k: 'Hol találom a környezetvédelmi osztályt?', v: ['A forgalmi engedély V.9 sorában. A 2011 után gyártott autók többsége „14” (Euro 5) vagy „15” (Euro 6), a hibridek „5”, a plug-in hibridek „5P” vagy „5N”, a villanyautók „5E”.'] },
    { k: 'Levonható a gépjárműadó?', v: ['Igen, ugyanarra az autóra, ugyanazokra a hónapokra, ha ugyanaz fizeti mindkettőt, és a gépjárműadót határidőben befizették. Ha a cég az autót év közben használtan vette, az adott évi gépjárműadót az eladó fizeti, így abban az évben nincs mit levonni.', javaslatMondat(adat)].filter(Boolean) },
    { k: 'Melyik hónaptól kell fizetni?', v: ['A szerzést követő hónap első napjától az eladás, a lízingbe adónak való visszaadás, az ellopás vagy a megsemmisülés hónapjának utolsó napjáig. A forgalomból kivonás önmagában nem szünteti meg.'] },
    { k: 'Hogyan kell bevallani?', v: [`Negyedévente, önadózással: a negyedévet követő hónap 20-áig kell bevallani és befizetni a NAV Cégautóadó bevételi számlájára (10032000-01076167). ${M.rag(2026, 'ban', 'ben')} a 2601-es nyomtatványon.`] },
    { k: `Mennyivel drágul ${M.rag(jovo || ev, 'ban', 'ben')}?`, v: [jovo ? `A tételek a júliusi infláció szerint emelkednek, 500 vagy 1000 forintra kerekítve. A NAV által közzétett ${M.os(jovo)} tétel egy 91–120 kW-os, „15”-ös autóra havonta ${M.ftx(adat.tetelek.cegautoado[jovo].tabla[2][2])} (${M.rag(ev, 'ban', 'ben')} ${M.ftx(t.tabla[2][2])}).` : 'A tételeket a NAV minden év október 31-ig teszi közzé a következő évre.', javaslatMondat(adat, true)].filter(Boolean) },
  ];
  const leiras = `Cégautóadó ${evek.join(' és ')}: havi és éves összeg a kW és a környezetvédelmi osztály alapján, a gépjárműadó levonásával, a NAV tételeivel és a negyedéves határidőkkel.`;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: [['Vállalkozóknak', VALL_UT], 'Cégautóadó'], cim: `Mennyi a cégautóadó ${evek.map((e) => M.rag(e, 'ban', 'ben')).join(' és ')}?`, valasz: `Havonta ${M.ftx(Math.min(...t.tabla.flat()))}–${M.ftx(Math.max(...t.tabla.flat()))} autónként, a teljesítménytől és a környezetvédelmi osztálytól függően. A gépjárműadó levonható belőle, a bevallás és a befizetés negyedéves.` })}
<div class="keret asztal">
${forgalmi({ kalk: 'cegautoado', cim: 'A céges autó adatai', tartalom: `
${evek.length > 1 ? sor('', negyzetek('ev', 'Melyik évre?', evek.map((e) => [e, String(e)]), ev)) : `<input type="hidden" name="ev" value="${ev}">`}
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 110', min: 1, max: 2000, extra: egysegValto }))}
${sor('V.9', valaszto('osztaly', 'Környezetvédelmi osztály', OSZTALY_OPCIOK, '', 'A forgalmi engedély V.9 sorában. A legtöbb mai autó „14” vagy „15”.'))}
${sor('B', jelolo('phevRegi', '2025. január 1. előtt helyezték forgalomba', 'Ilyenkor 2026. december 31-ig mentes.'), ' data-mutat="osztaly=phev"')}
${sor('B', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2021', min: 1950, max: k.ev + 1, sugo: 'Ebből számoljuk ki a gépjárműadót, amit levonunk.' }))}
${sor('', negyzetek('valtozas', 'Változott valami az évben?', [['', 'Nem, egész évben a cégé'], ['uj', 'Új autó, a cég nevére helyezték forgalomba'], ['hasznalt', 'A cég használtan vette'], ['eladta', 'A cég eladta']], ''))}
${sor('', valaszto('honap', 'Melyik hónapban?', S.HONAPOK.map((n, i) => [i + 1, n]), 6, 'Vételnél a következő hónaptól, eladásnál az eladás hónapjáig jár az adó.'), ' data-mutat="valtozas=uj|valtozas=hasznalt|valtozas=eladta"')}` })}
${elszamolas(k, M.uresPanel('Add meg a teljesítményt és a környezetvédelmi osztályt.'))}
</div>
<div class="keret"><article class="cikk">
<h2>A NAV tételei</h2>
${evek.map((e) => cegTabla(adat, e)).join('\n')}
${javaslatBekezdes(adat)}
<p>Az elektromos („5E”) és a nulla emissziós („5Z”) autó nem tartozik a cégautóadó alá. A tételeket a NAV minden év október 31-ig teszi közzé a következő évre, a júliusi infláció alapján.</p>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([...evek.map((e) => ({ nev: `NAV: a cégautóadó ${M.os(e)} valorizált mértéke`, url: adat.tetelek.cegautoado[e].forras || adat.tetelek.cegautoado[evek[evek.length - 1]].forras, d: `közzétéve: ${datumHu(adat.tetelek.cegautoado[e].kozzeteve)}` })), ...vallForrasok(adat, ['cegauto']), ...forrasbol(adat.szabalyok.vallalkozo.cegauto_javaslat?.forrasok || [])])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: `Cégautóadó ${evek.join(', ')}: kalkulátor és táblázat`,
    leiras, ut, tartalom,
    adatJson: { tetelek: { gepjarmuado: adat.tetelek.gepjarmuado, gepjarmuado_mozgaskorlatozott: adat.tetelek.gepjarmuado_mozgaskorlatozott, cegautoado: adat.tetelek.cegautoado }, szabalyok: { vallalkozo: adat.szabalyok.vallalkozo }, ev },
    jsonld: [alkalmazasLd(k.cfg, 'Cégautóadó-kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Vállalkozóknak', ut: VALL_UT }, { nev: 'Cégautóadó', ut }])],
  });
}

export function cegautoOldal(k) {
  const { adat } = k;
  const ut = 'cegauto-vagy-sajat-auto/';
  const v = adat.szabalyok.vallalkozo;
  const evek = cegEvek(k);
  const ev = evek[0];
  const lf = S.legfrissebbHonap(adat);
  const r65 = S.osztalekArany(adat, true), r77 = S.osztalekArany(adat, false);
  const pct = (x) => String(Math.round(x * 1000) / 10).replace('.', ',');
  const mb = v.minimalber[String(ev)];
  const plafon = mb ? mb * v.szocho_plafon_minimalber_szorzo : null; // a havi minimálbér 24-szerese
  const kerdesek = [
    { k: 'Mikor éri meg a saját autó km-térítéssel?', v: ['Ha sok az üzleti út, és az autó nem túl drága. A km-térítés adómentesen jut el hozzád, a cégautóadó viszont az autó használatától függetlenül jár. Drága autónál és kevés üzleti útnál a cégautó jön ki jobban, mert a cég adózás előtti pénzből fizeti a költségeket.'] },
    { k: 'Milyen feltétellel fizethet a cég km-térítést a saját autómra?', v: [`Kiküldetési rendelvénnyel, valódi üzleti utakra, ha ügyvezetőként vagy munkavállalóként utazol, és az autó magánszemély tulajdonában van, például a tiéd. A térítés az autó alapnormája szerinti üzemanyag a NAV havi árán, plusz ${adat.szabalyok.km.normakoltseg_ft_km} Ft/km. Ha a cég csak ennyit fizet, és más költséget nem számol el az autóra, a térítés adómentes, és cégautóadó sem jár utána. A munkába járás nem üzleti út.`] },
    { k: 'Kell adót fizetni, ha a cégautót magáncélra is használom?', v: ['Nem. A céges személyautó magáncélú használata adómentes (Szja tv. 1. számú melléklet 8.37. pont). A cég a cégautóadót a használattól függetlenül fizeti, és a költségeket elszámolhatja.'] },
    { k: 'Miért számoltok osztalékkal?', v: [`Mert ez a két út valódi különbsége: amit a cég az autóra költ, azt nem tudod osztalékként kivenni. 100 Ft céges nyereségből ${v.tao_kulcs * 100}% társasági adó után ${v.osztalek_szja * 100}% szja és ${v.szocho * 100}% szocho levonásával ${pct(r65)} Ft jut hozzád. Ha az összevont adóalapba tartozó jövedelmed (például a béred) és az osztalékod együtt már eléri a szocho felső határát (a minimálbér 24-szeresét${plafon ? `, ${M.rag(ev, 'ban', 'ben')} ${M.ftx(plafon)}` : ''}), a határ feletti osztalék után ${pct(r77)} Ft.`] },
    { k: 'Mi nincs benne a számításban?', v: ['Az áfa (cégautónál egyes tételek áfájának egy része visszaigényelhető lehet), a kisvállalati adó (kiva), a veszteséges cég és a vételárba kötött pénz kamata. Ezekben a könyvelőd tud pontos választ adni.'] },
  ];
  const leiras = 'Cégautó vagy saját autó kilométertérítéssel? Kft. és bt. tulajdonosainak: a két út éves költsége a cégautóadóval, az adómentes km-térítéssel és az osztalék adójával, és hány km felett fordul.';
  const tartalom = (L) => `
${oldalfej(L, { morzsa: [['Vállalkozóknak', VALL_UT], 'Cégautó vagy saját autó'], cim: 'Cégautó vagy saját autó km-térítéssel?', valasz: 'Sok üzleti úttal és olcsóbb autóval általában a saját autó, drágább autóval és kevés üzleti úttal a cégautó jön ki jobban. Kft. és bt. tulajdonosainak számolunk, abban mérve, mennyi pénz marad nálad.' })}
<div class="keret asztal">
${forgalmi({ kalk: 'cegauto', cim: 'Az autó és a használat', tartalom: `
<fieldset><legend>Az autó</legend>
${evek.length > 1 ? sor('', negyzetek('ev', 'Melyik évre?', evek.map((e) => [e, String(e)]), ev)) : `<input type="hidden" name="ev" value="${ev}">`}
${sor('P.2', szamMezo({ id: 'kw', cim: 'Teljesítmény', me: 'kW', placeholder: 'pl. 110', min: 1, max: 2000, extra: egysegValto }))}
${sor('V.9', valaszto('osztaly', 'Környezetvédelmi osztály', OSZTALY_OPCIOK, '', 'A forgalmi engedély V.9 sorában. A legtöbb mai autó „14” vagy „15”.'))}
${sor('B', jelolo('phevRegi', '2025. január 1. előtt helyezték forgalomba', 'Ilyenkor 2026 végéig mentes a gépjárműadó és a cégautóadó alól.'), ' data-mutat="osztaly=phev"')}
${sor('B', szamMezo({ id: 'gyartasiEv', cim: 'Gyártási év', placeholder: 'pl. 2021', min: 1950, max: k.ev + 1 }))}
${sor('P.3', negyzetek('uzemanyag', 'Üzemanyag', [['benzin', 'Benzin'], ['dizel', 'Dízel']], 'benzin'))}
${sor('P.1', szamMezo({ id: 'cm3', cim: 'Hengerűrtartalom', me: 'cm³', placeholder: 'pl. 1498', min: 50, max: 10000, sugo: 'Ebből jön a km-térítés alapnormája. Villanyautónál hagyd üresen.' }))}
</fieldset>
<fieldset><legend>Egy év költségei</legend>
${sor('', szamMezo({ id: 'ertekvesztes', cim: 'Értékvesztés', me: 'Ft', placeholder: 'pl. 900 000', min: 0, sugo: 'Mennyit veszít évente az értékéből. Pénzügyi lízingnél nagyjából az éves lízingdíj.' }))}
${sor('', szamMezo({ id: 'energia', cim: 'Üzemanyag vagy áram', me: 'Ft', placeholder: 'pl. 700 000', min: 0, sugo: 'Az összes útra, a magánutakkal együtt.' }))}
${sor('', szamMezo({ id: 'fix', cim: 'Biztosítás, szerviz, gumi, matrica', me: 'Ft', placeholder: 'pl. 400 000', min: 0 }))}
</fieldset>
<fieldset><legend>Használat és adózás</legend>
${sor('', szamMezo({ id: 'uzletiKm', cim: 'Üzleti út évente', me: 'km', placeholder: 'pl. 15 000', min: 0, sugo: 'Amit kiküldetési rendelvénnyel el lehet számolni. A munkába járás nem számít.' }))}
${sor('', negyzetek('szocho', 'Fizetsz szochót az osztalék után?', [['1', `Igen, ${v.szocho * 100}%`], ['0', 'Nem, elértem a felső határt']], '1'))}
</fieldset>` })}
${elszamolas(k, M.uresPanel('Add meg az autó adatait és éves költségeit.'))}
</div>
<div class="keret"><article class="cikk">
<h2>A két út</h2>
<p><strong>Cégautó.</strong> A cég veszi meg vagy lízingeli az autót, és mindent ő fizet: az értékvesztést, az üzemanyagot, a biztosítást, a szervizt és a gépjárműadót. Cserébe havonta cégautóadót fizet, amiből a gépjárműadó levonható. A magáncélú használat adómentes, a költségeket a cég elszámolja.</p>
<p><strong>Saját autó.</strong> Az autó a tiéd, mindent te fizetsz. A cég az üzleti utakra kiküldetési rendelvénnyel km-térítést ad: az alapnorma szerinti üzemanyagot a NAV havi árán, plusz ${adat.szabalyok.km.normakoltseg_ft_km} Ft/km-t. Ez adómentes, és cégautóadó sem jár utána.</p>
<p>A kettőt abban mérjük, mennyi pénz marad nálad. Amit a cég költ, azt átszámoljuk arra, amennyit osztalékként kivehetnél belőle. ${M.rag(ev, 'ban', 'ben')} 100 Ft céges nyereségből ${pct(r65)} Ft, ha az osztalék után szochót is fizetsz, és ${pct(r77)} Ft, ha már nem.</p>
<p>A km-térítést a NAV ${M.honapBan(lf.honap).replace(/ban$|ben$/, 'i')} árával számoljuk. Feltétel, hogy ügyvezetőként vagy munkavállalóként utazz, kiküldetési rendelvénnyel, és a cég ezen felül ne számoljon el költséget az autóra.</p>
${javaslatBekezdes(adat)}
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([{ nev: `NAV: a cégautóadó ${M.os(ev)} valorizált mértéke`, url: adat.tetelek.cegautoado[ev].forras || adat.tetelek.cegautoado[evek[evek.length - 1]].forras, d: `közzétéve: ${datumHu(adat.tetelek.cegautoado[ev].kozzeteve)}` }, ...vallForrasok(adat), ...forrasbol(adat.szabalyok.km.forrasok)])}
${tovabb(L, ut)}
</article></div>`;
  return oldal(k, {
    cim: 'Cégautó vagy saját autó km-térítéssel? Kalkulátor',
    leiras, ut, tartalom,
    adatJson: { tetelek: { gepjarmuado: adat.tetelek.gepjarmuado, gepjarmuado_mozgaskorlatozott: adat.tetelek.gepjarmuado_mozgaskorlatozott, cegautoado: adat.tetelek.cegautoado }, szabalyok: { km: adat.szabalyok.km, vallalkozo: v }, uzemanyag: { evek: adat.uzemanyag.evek, forras: adat.uzemanyag.forras }, lf, ev },
    jsonld: [alkalmazasLd(k.cfg, 'Cégautó vagy saját autó kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Vállalkozóknak', ut: VALL_UT }, { nev: 'Cégautó vagy saját autó', ut }])],
  });
}
