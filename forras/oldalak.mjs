// Az oldalak tartalma. Minden szám az adatfájlokból jön; a szöveg a SZOVEG_STILUS.md szerint készül.
import * as S from './js/szamitas.mjs';
import * as M from './js/megjelenites.mjs';
import { oldal, oldalfej, eredmenyPanel, profilChip, gyik, gyikLd, morzsaLd, alkalmazasLd, forrasLista, oldalsav, IKON, datumHu, fmt, honapHu } from './sablon.mjs';

const kozzeteveHu = (iso) => datumHu(iso);
/** „közzétéve 2026. október 25.” vagy az automatikus átvétel napja. */
function arDatum(adat, ev, h) {
  const k = `${ev}-${h}`;
  const kz = adat.uzemanyag.kozzeteve?.[k];
  if (kz) return `közzétéve ${datumHu(kz)}`;
  const a = adat.uzemanyag.atveve?.[k];
  return a ? `átvéve ${datumHu(a)}` : '';
}

/** Az építéskori „mai” év és a következő évi tételek állapota. */
function evek(k) {
  const gj = k.adat.tetelek.gepjarmuado;
  const ev = k.ev;
  const ismert = Object.keys(gj).map(Number).sort();
  const aktualis = gj[ev] ? ev : ismert.filter((e) => e <= ev).pop() ?? ismert[0];
  const jovo = gj[aktualis + 1] ? aktualis + 1 : null;
  return { aktualis, jovo, ismert };
}

/** „A fiatal autóknál 5 Ft/kW-tal nő a tétel, a 12. évtől nem változik.” – az adatokból. */
function valtozasMondat(a, b) {
  const d = b.map((x, i) => x - a[i]);
  const elsoValtozatlan = d.findIndex((x, i) => d.slice(i).every((y) => y === 0));
  const max = Math.max(...d);
  if (max <= 0) return 'A tételek nem emelkednek.';
  let m = `A fiatal autóknál ${max} Ft/kW-tal nő a tétel`;
  if (elsoValtozatlan > 0) m += `, ${['', 'a 4.', 'a 8.', 'a 12.', 'a 16.'][elsoValtozatlan]} naptári évtől nem változik.`;
  else m += '.';
  return m;
}

/** A plug-in hibridek átmeneti mentességének szövege az aktuális évhez igazítva. */
export function phevSzoveg(ev) {
  return ev <= 2026
    ? 'A 2025. január 1. előtt forgalomba helyezett, „5P” vagy „5N” jelzésű plug-in hibrid 2026. december 31-ig mentes. A később forgalomba helyezett plug-in hibrid már a teljesítménye szerint fizet, ahogy a nem tölthető hibrid is.'
    : 'A 2025 előtt forgalomba helyezett plug-in hibridek átmeneti mentessége 2026. december 31-én lejárt, így ma már minden plug-in hibrid a teljesítménye szerint fizet, ahogy a nem tölthető hibrid is.';
}

/* ======================= FŐOLDAL ======================= */
export function fooldal(k) {
  const { adat } = k;
  const { aktualis, jovo } = evek(k);
  const lf = S.legfrissebbHonap(adat);
  const ar = adat.uzemanyag.evek[lf.ev][lf.honap];
  const elozo = adat.uzemanyag.evek[lf.ev]?.[lf.honap - 1] || adat.uzemanyag.evek[lf.ev - 1]?.[12];
  const savok = adat.tetelek.gepjarmuado[aktualis].savok;

  // A műszerfal példái valódi számítással
  const gj = S.gepjarmuado(adat, { ev: aktualis, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' });
  const at = S.atiras(adat, { ev: aktualis, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', szerzes: 'vetel' });
  const km = S.kikuldetes(adat, { km: 100, uzemanyag: 'benzin', cm3: 1598, ev: lf.ev, honap: lf.honap });
  const peldak = [
    { ertek: gj.fizetendo, egyseg: 'Ft/év', cimke: `85 kW, 2019-es benzines · gépjárműadó ${aktualis}`, arany: (gj.ftKw - Math.min(...savok)) / (Math.max(...savok) - Math.min(...savok)) },
    { ertek: at.osszesen, egyseg: 'Ft', cimke: '85 kW, 2019-es autó átírása · illeték és okmányok', arany: (at.illetek.ftKw - 300) / (950 - 300) },
    { ertek: km.osszesen, egyseg: 'Ft', cimke: `100 km kiküldetés, 1,6-os benzines · NAV-ár, ${S.HONAPOK[lf.honap - 1]}`, arany: Math.min(1, km.ftKm / 120) },
  ];

  const tick = ['benzin', 'dizel', 'keverek', 'lpg', 'cng'].map((f) => {
    const nev = { benzin: 'Benzin', dizel: 'Dízel', keverek: 'Keverék', lpg: 'LPG', cng: 'CNG' }[f];
    const d = elozo?.[f] != null ? ar[f] - elozo[f] : null;
    return `<span>${nev} <b>${ar[f]} Ft/${f === 'cng' ? 'kg' : 'l'}</b>${d ? ` ${d > 0 ? '▲' : '▼'} ${Math.abs(d)}` : ''}</span>`;
  });
  const tickSor = `<span>NAV-ár · <b>${honapHu(lf.ev, lf.honap)}</b></span>${tick.join('')}`;

  // Következő évi változás blokk
  let valtozas = '';
  if (jovo) {
    const a = adat.tetelek.gepjarmuado[aktualis], b = adat.tetelek.gepjarmuado[jovo];
    const ra = adat.tetelek.regado_alap;
    const illValt = JSON.stringify(adat.tetelek.illetek[aktualis]?.tabla) !== JSON.stringify(adat.tetelek.illetek[jovo]?.tabla);
    const sorok = a.savok.map((x, i) => {
      const d = b.savok[i] - x;
      return `<tr><td>${S.GJADO_SAV_ROVID[i]}</td><td>${x}</td><td class="uj">${b.savok[i]}</td><td>${d === 0 ? '–' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`}</td></tr>`;
    }).join('');
    const jgj = S.gepjarmuado(adat, { ev: jovo, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos' });
    valtozas = `<section class="szek" style="padding-top:0"><div class="wrap">
<div class="panel valtozas felfed">
<div style="display:grid;gap:18px;position:relative;z-index:1">
<p class="felirat">Megjelent · ${kozzeteveHu(b.kozzeteve)}</p>
<h2 class="cim cim-2">${M.rag(jovo, 'ban', 'ben')} <em>${Math.max(...b.savok)} <span class="nt">Ft/kW</span></em> a legmagasabb gépjárműadó-tétel</h2>
<p class="bevezeto">A NAV közzétette a jövő évi tételeket. ${valtozasMondat(a.savok, b.savok)} ${ra[jovo] && ra[aktualis] && ra[jovo].ft !== ra[aktualis].ft ? `A regisztrációs adó alapja ${fmt(ra[aktualis].ft)} Ft-ról ${fmt(ra[jovo].ft)} Ft-ra emelkedik, az átírási illeték ${illValt ? 'is változik' : 'marad'}.` : `Az átírási illeték ${illValt ? 'változik' : 'marad'}.`}</p>
<p class="kis">Példa: egy 2019-es, 85 kW-os autó ${M.rag(aktualis, 'ban', 'ben')} ${fmt(gj.fizetendo)} Ft-ot fizet, ${M.rag(jovo, 'ban', 'ben')} ${fmt(jgj.fizetendo)} Ft-ot, mert kedvezőbb korsávba lép.</p>
<div><a class="gomb gomb-sarga" href="${'{{L:gepjarmuado-kalkulator/}}'}?ev=${jovo}">Kiszámolom ${M.rag(jovo, 'ra', 're')} <span class="nyil">→</span></a></div>
</div>
<div class="tabla-tarto" style="position:relative;z-index:1;background:var(--panel)"><table class="tabla"><caption>Gépjárműadó, Ft/kW</caption><thead><tr><th>Az autó kora</th><th>${aktualis}</th><th>${jovo}</th><th>Változás</th></tr></thead><tbody>${sorok}</tbody></table></div>
</div></div></section>`;
  }

  const al = adat.allapot;
  const pk = arDatum(adat, lf.ev, lf.honap);

  const tartalom = (L) => `
<section class="hos">
<div class="wrap hos-racs">
<div class="hos-szoveg">
<p class="felirat">Autós kalkulátorok · ${aktualis} · hivatalos tételekkel</p>
<h1 class="cim cim-1 sor-be"><span>Mennyibe kerül</span> <span><em>valójában</em></span> <span>az autód?</span></h1>
<p class="bevezeto">Gépjárműadó, átírás, kilométertérítés. A NAV közzétett tételeivel számolunk, minden lépést megmutatunk, és nem kérünk tőled semmit: se regisztrációt, se e-mail-címet.</p>
<div class="hos-gombok">
<a class="gomb gomb-sarga" href="${L.l('gepjarmuado-kalkulator/')}">Kiszámolom a gépjárműadót <span class="nyil">→</span></a>
<a class="gomb gomb-keret" href="${L.l('atirasi-illetek-kalkulator/')}">Mennyibe kerül az átírás?</a>
</div>
<ul class="hos-pontok"><li>Naponta ellenőrzött NAV-adatok</li><li>Képlet minden eredménynél</li><li>Süti és követés nélkül</li></ul>
</div>
<div class="panel muszerfal" aria-label="Példaszámítások">
<div class="muszerfal-fej"><span class="led"><i></i>Élő példa</span><span class="led">${honapHu(lf.ev, lf.honap)}</span></div>
${muszerfalSvg()}
<div class="kijelzo"><div class="kijelzo-szam"><span class="ertek">${fmt(peldak[0].ertek)}</span><small>${peldak[0].egyseg}</small></div><div class="kijelzo-cimke">${peldak[0].cimke}</div></div>
<div class="muszerfal-fulek" role="group" aria-label="Példa választása"><button type="button" aria-pressed="true">Adó</button><button type="button" aria-pressed="false">Átírás</button><button type="button" aria-pressed="false">Km-térítés</button></div>
<script type="application/json" id="muszerfal-adat">${JSON.stringify(peldak)}</script>
</div>
</div>
<div class="ut" aria-label="A hónap NAV-üzemanyagárai"><div class="ut-arak"><div class="ut-sav">${tickSor}${tickSor.replace(/<span>/g, '<span aria-hidden="true">')}${tickSor.replace(/<span>/g, '<span aria-hidden="true">')}${tickSor.replace(/<span>/g, '<span aria-hidden="true">')}</div></div></div>
</section>

<section class="szek" id="kalkulatorok">
<div class="wrap">
<div class="szek-fej felfed"><p class="felirat">Kalkulátorok</p><h2 class="cim cim-2">Három kérdés, amit <em>minden autós</em> feltesz</h2><p class="bevezeto">Írd be a forgalmi engedély adatait, és pár másodperc alatt látod az eredményt a számítás menetével együtt.</p></div>
<div class="kartyak">
${kartya(L, 'gepjarmuado-kalkulator/', IKON.ado, 'Gépjárműadó', `Az éves adó kW és kor szerint${jovo ? `, ${M.rag(aktualis, 'ra', 're')} és ${M.rag(jovo, 'ra', 're')}` : ''}. Mentességek, év közbeni forgalomba helyezés.`, `${Math.min(...savok)}–${Math.max(...savok)}`, `Ft/kW · ${aktualis}`, 'k1')}
${kartya(L, 'atirasi-illetek-kalkulator/', IKON.atiras, 'Átírási illeték', 'Illeték, eredetiségvizsgálat, okmányok. Behozott autónál a regisztrációs adó is.', '300–950', `Ft/kW · ${aktualis}`, 'k2')}
${kartya(L, 'kilometerterites-kalkulator/', IKON.km, 'Kilométertérítés', 'Kiküldetés a NAV havi árával és a fogyasztási normával. Munkába járás 30 Ft/km-rel.', `${ar.benzin} Ft/l`, `benzin · ${S.HONAPOK[lf.honap - 1]}`, 'k3')}
</div>
<p class="hamarosan felfed">Készül: teljes fenntartási költség, benzines vagy villany, maradványérték, autóhitel és a „megtartsam vagy cseréljem” döntés.</p>
</div>
</section>

${valtozas.replaceAll('{{L:gepjarmuado-kalkulator/}}', L.l('gepjarmuado-kalkulator/'))}

<section class="szek" style="padding-top:${jovo ? '0' : '0'}">
<div class="wrap">
<div class="szek-fej felfed"><p class="felirat">Hogyan dolgozunk</p><h2 class="cim cim-2">Számok, amelyeknek <em>utána lehet nézni</em></h2></div>
<div class="elvek felfed">
<div class="elv"><span class="szamjel">01</span><h3 class="cim cim-3">Hivatalos tételek</h3><p>Minden szám mellé odaírjuk, honnan van és mikor jelent meg. A NAV-árakat és az adótételeket naponta ellenőrizzük.</p></div>
<div class="elv"><span class="szamjel">02</span><h3 class="cim cim-3">Látod a képletet</h3><p>Minden eredmény alatt ott a számítás a te számaiddal, így bárki ellenőrizheti, és könnyű elmagyarázni a könyvelőnek is.</p></div>
<div class="elv"><span class="szamjel">03</span><h3 class="cim cim-3">Nálad marad minden</h3><p>A számolás a böngésződben fut. Nincs regisztráció, nincs süti, nincs követőkód és nincs felugró ablak.</p></div>
</div>
<div class="panel frisses felfed" style="margin-top:22px">
<span><i class="pont${al.figyelmeztetesek?.length ? ' var' : ''}"></i>Utolsó ellenőrzés: <b>${al.utolso_ellenorzes ? datumHu(al.utolso_ellenorzes) : datumHu(k.ma)}</b></span>
<span>NAV-üzemanyagár: <b>${honapHu(lf.ev, lf.honap)}</b>${pk ? ` (${pk})` : ''}</span>
<span>Adótételek: <b>${Object.keys(adat.tetelek.gepjarmuado).join(', ')}</b></span>
<a href="${L.l('forrasok/')}">Források és frissítés →</a>
</div>
</div>
</section>`;

  return oldal(k, {
    cim: `Autós kalkulátorok ${aktualis}: gépjárműadó, átírás, kilométertérítés`,
    leiras: `Ingyenes autós kalkulátorok a NAV ${M.os(aktualis)} tételeivel: gépjárműadó${jovo ? ` ${aktualis}–${jovo}` : ''}, átírási illeték és regisztrációs adó, kilométertérítés a havi NAV-árral. Képlettel, regisztráció nélkül.`,
    ut: '',
    tartalom,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: k.cfg.marka, url: `${k.cfg.domain}/`, inLanguage: 'hu' }],
  });
}

function kartya(L, ut, ikon, cim, szoveg, szam, al, kesl) {
  return `<a class="panel kartya felfed ${kesl}" href="${L.l(ut)}"><span class="ikon">${ikon}</span><h3 class="cim cim-3">${cim}</h3><p>${szoveg}</p><span class="kartya-lab"><span class="kartya-szam">${szam}<small>${al}</small></span><span class="kartya-nyil" aria-hidden="true">→</span></span></a>`;
}

function muszerfalSvg() {
  // 240°-os ív, 0–100% skála, 41 osztás
  const cx = 160, cy = 160, r = 120;
  const pont = (deg, rr) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  let skala = '';
  for (let i = 0; i <= 40; i++) {
    const d = -120 + i * 6;
    const fo = i % 5 === 0;
    const [x1, y1] = pont(d, r + 14), [x2, y2] = pont(d, r + (fo ? 2 : 7));
    skala += `<line class="${fo ? 'skala-fo' : 'skala'}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="${fo ? 2 : 1}"/>`;
  }
  const [ax, ay] = pont(-120, r), [bx, by] = pont(120, r);
  const ivD = `M ${ax.toFixed(1)} ${ay.toFixed(1)} A ${r} ${r} 0 1 1 ${bx.toFixed(1)} ${by.toFixed(1)}`;
  return `<svg class="ora" viewBox="0 0 320 250" aria-hidden="true">
${skala}
<path class="ivhatter" d="${ivD}" fill="none" stroke-width="10"/>
<path class="iv" d="${ivD}" fill="none" stroke-width="10" style="stroke-dashoffset:1000;stroke-dasharray:1000"/>
<g class="tu-csop" style="transform:rotate(-120deg)"><path class="tu" d="M157 160 L160 52 L163 160 Z"/></g>
<circle class="agy" cx="160" cy="160" r="9"/>
</svg>`;
}

/* ======================= GÉPJÁRMŰADÓ ======================= */
export function gepjarmuadoOldal(k) {
  const { adat } = k;
  const { aktualis, jovo, ismert } = evek(k);
  const ut = 'gepjarmuado-kalkulator/';
  const evekLathato = ismert.filter((e) => e >= aktualis);
  const alap = { ev: aktualis, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', evkozbenHonap: 0 };
  const r = S.gepjarmuado(adat, alap);
  const t = adat.tetelek.gepjarmuado;
  const ra = t[aktualis], rb = jovo ? t[jovo] : null;
  const pelda100 = (ev, i) => fmt(100 * t[ev].savok[i]);
  const jr = jovo ? S.gepjarmuado(adat, { ...alap, ev: jovo }) : null;

  const kerdesek = [
    { k: `Mennyi a gépjárműadó ${M.rag(aktualis, 'ban', 'ben')}?`, v: [`A teljesítmény (kW) szorozva az autó korához tartozó tétellel. ${M.rag(aktualis, 'ban', 'ben')} ${ra.savok[0]} Ft/kW a gyártási évben és az azt követő 3 naptári évben, és ${ra.savok[4]} Ft/kW a 16. naptári évtől. Egy 2019-es, 85 kW-os autó adója ${fmt(r.fizetendo)} Ft.`] },
    ...(jovo ? [{ k: `Mennyi lesz a gépjárműadó ${M.rag(jovo, 'ban', 'ben')}?`, v: [`A NAV már közzétette (${datumHu(rb.kozzeteve)}): a korsávok szerint ${rb.savok.join(', ')} Ft/kW. Ugyanaz a 2019-es, 85 kW-os autó ${M.rag(jovo, 'ban', 'ben')} a ${S.GJADO_SAV_ROVID[jr.sav]} sávba lép, így ${fmt(jr.fizetendo)} Ft-ot fizet.`] }] : []),
    { k: 'Hogyan számoljam át a lóerőt kW-ra?', v: ['Oszd el 1,36-tal, és kerekíts egészre: 115 LE nagyjából 85 kW. A forgalmi engedély P.2 sorában eleve kW-ban szerepel a teljesítmény, a kalkulátorban viszont lóerőben is megadhatod.'] },
    { k: 'Kell fizetni elektromos autó után?', v: ['Nem. A tisztán elektromos („5E”) és a nulla emissziós („5Z”) környezetvédelmi osztályú autó mentes, és ehhez semmit nem kell intézned: a NAV a járműnyilvántartás adatai alapján nem vet ki adót.'] },
    { k: 'Mi a helyzet a plug-in hibridekkel?', v: [phevSzoveg(aktualis)] },
    { k: 'Mikor és hogyan kell befizetni?', v: ['A NAV márciusban küldi ki a határozatot, és az adót egy összegben április 15-ig kell befizetni, például a határozatban szereplő linken vagy a NAV-Mobilban. Magánszemélyek és egyéni vállalkozók legfeljebb öthavi, pótlékmentes részletfizetést is kérhetnek.', 'Ha az adókötelezettség év közben keletkezik, például új autó forgalomba helyezésekor, az adót a határozat véglegessé válásától számított 15 napon belül kell megfizetni.'] },
    { k: 'Ki fizeti az adót, ha év közben eladom az autót?', v: ['A NAV az év elején érvényes nyilvántartás alapján vet ki adót, így az adott év adóját jellemzően az eladó fizeti, a vevő a következő évtől. Ha másként szeretnétek elosztani, azt az adásvételi szerződésben rögzíthetitek.'] },
  ];

  const evValto = evekLathato.map((e) => `<label><input type="radio" name="ev" value="${e}"${e === aktualis ? ' checked' : ''}><span>${e}</span></label>`).join('');
  const honapOpc = S.HONAPOK.map((h, i) => `<option value="${i + 1}"${i === 2 ? ' selected' : ''}>${h}</option>`).join('');

  const tablaSorok = ra.savok.map((x, i) => `<tr data-sav="${i}"${i === r.sav ? ' class="kiemelt"' : ''}><td>${S.GJADO_SAVOK[i][0].toUpperCase() + S.GJADO_SAVOK[i].slice(1)}</td><td>${x}</td>${rb ? `<td class="uj">${rb.savok[i]}</td>` : ''}<td>${pelda100(aktualis, i)} Ft</td></tr>`).join('');

  const leiras = `Gépjárműadó-kalkulátor ${aktualis}${jovo ? ` és ${jovo}` : ''}: add meg a kW-ot és a gyártási évet, és megkapod az éves adót a NAV valorizált tételeivel. Mentességek, plug-in hibrid, év közbeni forgalomba helyezés.`;
  const tartalom = (L) => `
${oldalfej(L, {
  morzsa: [{ nev: 'Gépjárműadó' }],
  cim: `Gépjárműadó-kalkulátor <em>${aktualis}${jovo ? `–${jovo}` : ''}</em>`,
  bevezeto: `Add meg a teljesítményt és a gyártási évet. Megmutatjuk az éves adót, a korsávot${jovo ? ', és azt is, mennyi lesz jövőre' : ''}.`,
  cimkek: [{ t: `NAV-tételek: ${ismert.join(', ')}`, sarga: true }, { t: 'Befizetés: április 15.' }, { t: `Ellenőrizve: ${datumHu(k.ma)}` }],
})}
<section class="wrap kalk">
<form class="panel kalk-urlap" data-kalk="gepjarmuado" novalidate>
${profilChip}
<fieldset>
<legend><span class="lepes">1</span>Az autó</legend>
${evekLathato.length > 1 ? `<div class="mezo"><span class="mezo-cim" id="ev-c">Adóév</span><div class="valto" role="radiogroup" aria-labelledby="ev-c">${evValto}</div></div>` : `<input type="hidden" name="ev" value="${aktualis}">`}
<div class="sor2">
<div class="mezo"><label for="kw">Teljesítmény</label><div class="bemenet-sor"><div class="bemenet"><input id="kw" name="kw" type="number" inputmode="numeric" min="1" max="2000" value="85"></div>
<div class="valto valto-egyseg" role="radiogroup" aria-label="Mértékegység"><label><input type="radio" name="kwEgyseg" value="kw" checked><span>kW</span></label><label><input type="radio" name="kwEgyseg" value="le"><span>LE</span></label></div></div>
<span class="sugo">A forgalmi engedély P.2 sora (kW).</span></div>
<div class="mezo"><label for="gyartasiEv">Gyártási év</label><div class="bemenet"><input id="gyartasiEv" name="gyartasiEv" type="number" inputmode="numeric" min="1950" max="${aktualis + 1}" value="2019"></div><span class="sugo">A forgalmi engedély B pontja mellett, vagy a törzskönyvben.</span></div>
</div>
<div class="mezo"><span class="mezo-cim" id="hajtas-c">Hajtás</span>
<div class="valto valto-teljes" role="radiogroup" aria-labelledby="hajtas-c">
<label><input type="radio" name="hajtas" value="hagyomanyos" checked><span>Benzines, dízeles, hibrid</span></label>
<label><input type="radio" name="hajtas" value="plugin"><span>Plug-in hibrid</span></label>
<label><input type="radio" name="hajtas" value="elektromos"><span>Elektromos</span></label>
</div></div>
${evekLathato.some((e) => e <= 2026) ? `<label class="kapcsolo" data-mutat="hajtas=plugin"><input type="checkbox" name="phevRegi"><span class="k"></span><span class="szoveg">2025. január 1. előtt helyezték forgalomba<small>Ha a forgalmi engedély V.9 sorában „5P” vagy „5N” szerepel, 2026 végéig mentes.</small></span></label>` : ''}
</fieldset>
<fieldset class="reszlet-blokk">
<legend><span class="lepes">2</span>Különleges esetek</legend>
<label class="kapcsolo"><input type="checkbox" name="evkozben"><span class="k"></span><span class="szoveg">Az adóévben került forgalomba<small>Új vagy külföldről behozott autó: a forgalomba helyezést követő hónaptól fizetsz.</small></span></label>
<div class="mezo" data-mutat="evkozben"><label for="evkozbenHonap">A forgalomba helyezés hónapja</label><select id="evkozbenHonap" name="evkozbenHonap">${honapOpc}</select></div>
<label class="kapcsolo"><input type="checkbox" name="mozgaskorlatozott"><span class="k"></span><span class="szoveg">Súlyos mozgáskorlátozott kedvezmény<small>Egy legfeljebb 100 kW-os személyautóra, évi 13 000 Ft-ig.</small></span></label>
</fieldset>
</form>
${eredmenyPanel(M.gjadoPanel(adat, r, alap))}
</section>

<section class="szek" style="padding-top:88px">
<div class="wrap tartalom">
<article class="cikk">
<h2 id="tetelek">Így számol a NAV</h2>
<p>Az adó alapja a forgalmi engedély P.2 sorában szereplő teljesítmény kW-ban. A tétel attól függ, hány naptári év telt el a gyártási év óta: minél idősebb az autó, annál kevesebbet fizetsz utána.</p>
<div class="tabla-tarto"><table class="tabla"><caption>Gépjárműadó-tételek, Ft/kW</caption><thead><tr><th>Az autó kora</th><th>${aktualis}</th>${rb ? `<th>${jovo}</th>` : ''}<th>100 kW, ${aktualis}</th></tr></thead><tbody>${tablaSorok}</tbody></table></div>
<p class="forras-sor">A ${aktualis}. évi tételek közzétéve: ${datumHu(ra.kozzeteve)}${rb ? ` · a ${jovo}. éviek: ${datumHu(rb.kozzeteve)}` : ''} · NAV, valorizált adómértékek</p>
<h2>Mentességek és kedvezmények</h2>
<ul>
<li><strong>Elektromos autó:</strong> a tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó mentes.</li>
<li><strong>Plug-in hibrid:</strong> ${phevSzoveg(aktualis)}</li>
<li><strong>Hibrid (nem tölthető):</strong> nem mentes, ugyanúgy kW szerint fizet, mint a benzines vagy a dízeles autó.</li>
<li><strong>Súlyos mozgáskorlátozott személy:</strong> egy legfeljebb 100 kW-os személyautója után évi 13 000 Ft-ig mentes. A kedvezményt a NAV-nál kell kérni.</li>
</ul>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: 'NAV: a gépjárműadó számítása (2025 és 2026)', url: 'https://nav.gov.hu/gepjarmuado/az-ado-szamitasa', d: `${aktualis}. évi tételek, közzétéve ${datumHu(ra.kozzeteve)}` },
  ...(rb ? [{ nev: `NAV: belföldi gépjárműadó ${jovo}. évre valorizált mértéke`, url: rb.forras, d: `közzétéve ${datumHu(rb.kozzeteve)}` }] : []),
  { nev: 'NAV 95. információs füzet: a belföldi gépjárművek adója', url: 'https://nav.gov.hu/pfile/file?path=%2Fugyfeliranytu%2Fnezzen-utana%2Finf_fuz%2Frejtett%2FInformacios-fuzetek---Aktualis%2F95.-informacios-fuzet--a-belfoldi-gepjarmuvek-adoja', d: 'mentességek, kedvezmények, befizetés' },
])}
</article>
${oldalsav(L, ut, `<p class="kis" style="margin:0">Gépjárműadó-tételek: ${ismert.map((e) => `${e} (közzétéve ${datumHu(t[e].kozzeteve)})`).join(', ')}. A következő évi tételeket a NAV október 31-ig teszi közzé; az oldal ezeket magától átveszi.</p>`)}
</div>
</section>`;

  return oldal(k, {
    cim: `Gépjárműadó-kalkulátor ${aktualis}${jovo ? `–${jovo}` : ''}: mennyi az autód adója?`,
    leiras, ut, tartalom,
    adatJson: { tetelek: { gepjarmuado: adat.tetelek.gepjarmuado, gepjarmuado_mozgaskorlatozott: adat.tetelek.gepjarmuado_mozgaskorlatozott } },
    jsonld: [alkalmazasLd(k.cfg, 'Gépjárműadó-kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Gépjárműadó-kalkulátor', ut }])],
  });
}

/* ======================= ÁTÍRÁS ======================= */
export function atirasOldal(k) {
  const { adat } = k;
  const { aktualis, jovo } = evek(k);
  const ut = 'atirasi-illetek-kalkulator/';
  const alap = { ev: aktualis, datum: k.ma, kw: 85, gyartasiEv: 2019, hajtas: 'hagyomanyos', szerzes: 'vetel', hanyad: 100, behozott: false, eredetiseg: true, postazas: true };
  const r = S.atiras(adat, alap);
  const il = adat.tetelek.illetek[aktualis] || S.evAdat(adat.tetelek.illetek, aktualis);
  const ilJovo = jovo ? adat.tetelek.illetek[jovo] : null;
  const ok = adat.szabalyok.okmanyok;
  const ra = adat.tetelek.regado_alap;
  const regAlap = S.evAdat(ra, aktualis);
  const sz = adat.tetelek.regado_szorzok;

  const illSorok = il.tabla.map((s, i) => `<tr><td>${S.ILLETEK_KW_SAVOK[i]}</td>${s.map((x, j) => `<td data-ill="${i}-${j}"${r.illetek.sor === i && r.illetek.oszlop === j ? ' class="kiemelt"' : ''}>${x}</td>`).join('')}</tr>`).join('');
  const regSorok = sz.tabla.map((s, i) => `<tr><td>${S.REGADO_SOR_NEV[i]}</td>${s.map((x) => `<td>${fmt(x * regAlap.ft)}</td>`).join('')}</tr>`).join('');
  const kcs = adat.tetelek.regado_korcsokkentes;
  const kcsSorok = [];
  let tol = 0;
  for (const [ig, p] of kcs) { kcsSorok.push([ig === null ? `${tol + 1}. hónaptól` : tol === 0 ? `legfeljebb ${ig} hónap` : `${tol + 1}–${ig} hónap`, `${p}%`]); tol = ig; }
  const felezve = Math.ceil(kcsSorok.length / 2);
  const kcsHtml = kcsSorok.slice(0, felezve).map((a, i) => { const b = kcsSorok[felezve + i]; return `<tr><td>${a[0]}</td><td>${a[1]}</td><td style="text-align:left">${b ? b[0] : ''}</td><td>${b ? b[1] : ''}</td></tr>`; }).join('');

  const pelda = S.illetek(adat, { ev: aktualis, kw: 100, gyartasiEv: aktualis, hajtas: 'hagyomanyos', szerzes: 'vetel' });
  const kerdesek = [
    { k: `Mennyi az átírási illeték ${M.rag(aktualis, 'ban', 'ben')}?`, v: [`Az autó teljesítménye (kW) szorozva a teljesítmény- és korsávhoz tartozó tétellel, amely ${Math.min(...il.tabla.flat())} és ${Math.max(...il.tabla.flat())} Ft/kW között van. Egy új, 100 kW-os autó illetéke ${fmt(pelda.osszeg)} Ft, egy 2019-es, 85 kW-osé ${fmt(r.illetek.osszeg)} Ft.`] },
    { k: 'Ki fizeti az átírási illetéket?', v: ['A vevő, vagyis aki megszerzi az autót. Ha többen veszitek meg, mindenki a saját tulajdoni hányada után fizet.'] },
    { k: 'Kell illetéket fizetni elektromos vagy hibrid autó után?', v: ['Az „5E” és „5Z” környezetvédelmi osztályú, vagyis tisztán elektromos és nulla emissziós autó megszerzése illetékmentes. A hibrid és a plug-in hibrid nem mentes.'] },
    { k: 'Mennyi az illeték ajándékozásnál vagy öröklésnél?', v: ['A vásárlási illeték kétszerese. Egyenes ági rokontól (szülő, nagyszülő, gyermek, unoka) és házastárstól szerzett autó után viszont nem kell illetéket fizetni, akár vásárlás, akár ajándék.'] },
    { k: 'Mennyi a regisztrációs adó használt, külföldi autónál?', v: [`Az alapösszeg (${M.rag(aktualis, 'ban', 'ben')} ${fmt(regAlap.ft)} Ft) szorozva a teljesítményhez és a környezetvédelmi osztályhoz tartozó szorzóval, majd csökkentve az autó kora szerint. Egy 2021 előtt forgalomba helyezett, „15”-ös osztályú, 85 kW-os, 90 hónapos autónál ${fmt(S.regado(adat, { datum: `${aktualis}-10-01`, elsoForgalom: `${aktualis - 8}-04-01`, kw: 85, osztaly: '15', hajtas: 'hagyomanyos' }).osszeg)} Ft.`] },
    { k: 'Meddig kell átíratni az autót?', v: [`A vevőnek a szerződéskötéstől számított ${adat.szabalyok.hataridok.atiras_napok} napon belül kell kezdeményeznie a tulajdonjog bejegyzését. Az eredetiségvizsgálat a vizsgálattól számított 60 napig érvényes.`] },
  ];

  const leiras = `Átírási illeték kalkulátor ${aktualis}: illeték, eredetiségvizsgálat, forgalmi és törzskönyv díja egy összegben, behozott autónál regisztrációs adóval. NAV-tételekkel, képlettel.`;
  const tartalom = (L) => `
${oldalfej(L, {
  morzsa: [{ nev: 'Átírási illeték' }],
  cim: `Átírási illeték kalkulátor <em>${aktualis}</em>`,
  bevezeto: 'Mennyibe kerül átíratni a használt autót? Az illeték, a vizsgálat és az okmányok díja egy összegben, behozott autónál a regisztrációs adóval együtt.',
  cimkek: [{ t: `NAV-tételek: ${aktualis}${ilJovo ? `, ${jovo}` : ''}`, sarga: true }, { t: `Határidő: ${adat.szabalyok.hataridok.atiras_napok} nap` }, { t: `Ellenőrizve: ${datumHu(k.ma)}` }],
})}
<section class="wrap kalk">
<form class="panel kalk-urlap" data-kalk="atiras" data-mai-datum="datum" novalidate>
${profilChip}
<fieldset>
<legend><span class="lepes">1</span>A vásárlás</legend>
<div class="mezo"><span class="mezo-cim" id="honnan-c">Honnan jön az autó?</span>
<div class="valto valto-teljes" role="radiogroup" aria-labelledby="honnan-c">
<label><input type="radio" name="honnan" value="hazai" checked><span>Magyar rendszámos</span></label>
<label><input type="radio" name="honnan" value="kulfold"><span>Külföldről hozom be</span></label>
</div></div>
<div class="sor2">
<div class="mezo"><label for="szerzes">Hogyan szerzed meg?</label><select id="szerzes" name="szerzes">
<option value="vetel" selected>Megveszem</option>
<option value="ajandek">Ajándékba kapom vagy öröklöm</option>
<option value="kozeli">Szülőtől, gyermektől, házastárstól</option>
</select></div>
<div class="mezo"><label for="datum">Az átírás napja</label><input id="datum" name="datum" type="date" value="${k.ma}"></div>
</div>
</fieldset>
<fieldset class="reszlet-blokk">
<legend><span class="lepes">2</span>Az autó</legend>
<div class="sor2">
<div class="mezo"><label for="kw">Teljesítmény</label><div class="bemenet-sor"><div class="bemenet"><input id="kw" name="kw" type="number" inputmode="numeric" min="1" max="2000" value="85"></div>
<div class="valto valto-egyseg" role="radiogroup" aria-label="Mértékegység"><label><input type="radio" name="kwEgyseg" value="kw" checked><span>kW</span></label><label><input type="radio" name="kwEgyseg" value="le"><span>LE</span></label></div></div></div>
<div class="mezo"><label for="gyartasiEv">Gyártási év</label><div class="bemenet"><input id="gyartasiEv" name="gyartasiEv" type="number" inputmode="numeric" min="1950" max="${aktualis + 1}" value="2019"></div></div>
</div>
<div class="mezo"><span class="mezo-cim" id="hajtas-c">Hajtás</span>
<div class="valto valto-teljes" role="radiogroup" aria-labelledby="hajtas-c">
<label><input type="radio" name="hajtas" value="hagyomanyos" checked><span>Benzines, dízeles</span></label>
<label><input type="radio" name="hajtas" value="hibrid"><span>Hibrid</span></label>
<label><input type="radio" name="hajtas" value="plugin"><span>Plug-in hibrid</span></label>
<label><input type="radio" name="hajtas" value="elektromos"><span>Elektromos</span></label>
</div></div>
<div class="sor2" data-mutat="honnan=kulfold">
<div class="mezo"><label for="osztaly">Környezetvédelmi osztály</label><select id="osztaly" name="osztaly">
<option value="15" selected>„15” vagy jobb (Euro 6)</option>
<option value="12">„12”–„14” (Euro 4–5)</option>
<option value="9">„9”–„11” (Euro 3)</option>
<option value="8">„8” vagy rosszabb</option>
</select><span class="sugo">A külföldi forgalmi alapján, a vizsgálóállomás állapítja meg.</span></div>
<div class="mezo"><label for="elsoForgalom">Első forgalomba helyezés</label><input id="elsoForgalom" name="elsoForgalom" type="date" value="${aktualis - 7}-03-01"><span class="sugo">Külföldön, a külföldi forgalmi szerint.</span></div>
</div>
</fieldset>
<fieldset class="reszlet-blokk">
<legend><span class="lepes">3</span>Okmányok és vizsgálat</legend>
<label class="kapcsolo"><input type="checkbox" name="eredetiseg" checked><span class="k"></span><span class="szoveg">Eredetiségvizsgálat<small>Átíráshoz kötelező. Ha már van 60 napnál frissebb vizsgálat, kapcsold ki.</small></span></label>
<div class="mezo" data-mutat="eredetiseg"><label for="eredetisegDij">A vizsgálat díja</label><div class="bemenet van-egyseg"><input id="eredetisegDij" name="eredetisegDij" type="number" inputmode="numeric" value="${ok.eredetisegvizsgalat_alap}"><span class="egyseg">Ft</span></div><span class="sugo">Hengerűrtartalomtól függően ${fmt(ok.eredetisegvizsgalat_min)}–${fmt(ok.eredetisegvizsgalat_max)} Ft.</span></div>
<label class="kapcsolo"><input type="checkbox" name="postazas" checked><span class="k"></span><span class="szoveg">Törzskönyv postázása<small>${fmt(ok.torzskonyv_postazas)} Ft, ha nem személyesen veszed át.</small></span></label>
<div class="sor2">
<div class="mezo"><label for="hanyad">Tulajdoni hányad</label><div class="bemenet van-egyseg"><input id="hanyad" name="hanyad" type="number" inputmode="numeric" min="1" max="100" value="100"><span class="egyseg">%</span></div></div>
<div class="mezo"><label for="vetelar">Vételár <span class="kis">(nem kötelező)</span></label><div class="bemenet van-egyseg"><input id="vetelar" name="vetelar" type="number" inputmode="numeric" min="0" placeholder="pl. 6 500 000"><span class="egyseg">Ft</span></div></div>
</div>
</fieldset>
</form>
${eredmenyPanel(M.atirasPanel(adat, r, alap))}
</section>

<section class="szek" style="padding-top:88px">
<div class="wrap tartalom">
<article class="cikk">
<h2 id="tetelek">Az illeték tételei</h2>
<p>Az illeték a teljesítménytől és az autó korától függ. A kort a gyártási évtől számítjuk.${ilJovo && JSON.stringify(ilJovo.tabla) === JSON.stringify(il.tabla) ? ` ${M.rag(jovo, 'ban', 'ben')} a tételek nem változnak.` : ''}</p>
<div class="tabla-tarto"><table class="tabla"><caption>Vagyonszerzési illeték, Ft/kW, ${aktualis}</caption><thead><tr><th>Teljesítmény</th>${S.ILLETEK_KOR_SAVOK.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${illSorok}</tbody></table></div>
<h2>Okmányok és díjak</h2>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Tétel</th><th>Díj</th></tr></thead><tbody>
<tr><td>Eredetiségvizsgálat (hengerűrtartalom szerint)</td><td>${fmt(ok.eredetisegvizsgalat_min)}–${fmt(ok.eredetisegvizsgalat_max)} Ft</td></tr>
<tr><td>Forgalmi engedély</td><td>${fmt(ok.forgalmi_engedely)} Ft</td></tr>
<tr><td>Törzskönyv</td><td>${fmt(ok.torzskonyv)} Ft</td></tr>
<tr><td>Törzskönyv postázása</td><td>${fmt(ok.torzskonyv_postazas)} Ft</td></tr>
</tbody></table></div>
<p class="forras-sor">${ok.forras.nev}</p>
<h2>Regisztrációs adó behozott autónál</h2>
<p>Külföldről behozott autónál az első hazai forgalomba helyezés előtt regisztrációs adót is fizetni kell. Az összeg a teljesítménytől és a környezetvédelmi osztálytól függ, és az autó korával csökken. A hibrid és a plug-in hibrid a legkedvezőbb oszlopba kerül, az elektromos autó mentes.</p>
<div class="tabla-tarto"><table class="tabla"><caption>Regisztrációs adó a korcsökkentés előtt, Ft, ${regAlap.ev}</caption><thead><tr><th>Teljesítmény</th>${sz.oszlopok.map((o) => `<th title="${M.datumHu ? '' : ''}">${o}</th>`).join('')}</tr></thead><tbody>${regSorok}</tbody></table></div>
<p class="kis">Oszlopok: ${Object.entries(S.REGADO_OSZLOP_NEV).map(([a, b]) => `<strong>${a}</strong> = ${b}`).join(' · ')}.</p>
<div class="tabla-tarto"><table class="tabla"><caption>Korcsökkentés az első forgalomba helyezéstől (minden megkezdett hónap egésznek számít)</caption><thead><tr><th>Kor</th><th>Csökkentés</th><th style="text-align:left">Kor</th><th>Csökkentés</th></tr></thead><tbody>${kcsHtml}</tbody></table></div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: `NAV-közlemény a ${aktualis}. évi valorizált adómértékekről`, url: il.forras, d: `közzétéve ${datumHu(il.kozzeteve)}` },
  ...(ilJovo ? [{ nev: `A ${jovo}. évi tételek összefoglalója (ABT, a NAV közleménye alapján)`, url: ilJovo.forras, d: `közzétéve ${datumHu(ilJovo.kozzeteve)}` }] : []),
  ...(ra[jovo] ? [{ nev: `NAV: regisztrációs adó ${jovo}. évre valorizált mértéke`, url: ra[jovo].forras, d: `${fmt(ra[jovo].ft)} Ft` }] : []),
  { nev: ok.forras.nev, url: ok.forras.url },
])}
</article>
${oldalsav(L, ut, `<p class="kis" style="margin:0">Illetéktételek: ${aktualis} (közzétéve ${datumHu(il.kozzeteve)})${ilJovo ? `, ${jovo} (${datumHu(ilJovo.kozzeteve)})` : ''}. Regisztrációs adó alapja: ${Object.entries(ra).map(([e, v]) => `${e}: ${fmt(v.ft)} Ft`).join(', ')}.</p>`)}
</div>
</section>`;

  return oldal(k, {
    cim: `Átírási illeték kalkulátor ${aktualis}: mennyibe kerül az autó átírása?`,
    leiras, ut, tartalom,
    adatJson: { tetelek: { illetek: adat.tetelek.illetek, regado_alap: ra, regado_szorzok: sz, regado_korcsokkentes: kcs }, szabalyok: { okmanyok: ok, hataridok: adat.szabalyok.hataridok } },
    jsonld: [alkalmazasLd(k.cfg, 'Átírási illeték kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Átírási illeték kalkulátor', ut }])],
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

  const honapOpc = [];
  for (const ev of Object.keys(adat.uzemanyag.evek).map(Number).sort((a, b) => b - a)) {
    for (const h of Object.keys(adat.uzemanyag.evek[ev]).map(Number).sort((a, b) => b - a)) {
      honapOpc.push(`<option value="${ev}-${h}"${ev === lf.ev && h === lf.honap ? ' selected' : ''}>${honapHu(ev, h)}</option>`);
    }
  }
  const arSorok = [];
  for (const ev of Object.keys(adat.uzemanyag.evek).map(Number).sort((a, b) => b - a)) {
    for (const h of Object.keys(adat.uzemanyag.evek[ev]).map(Number).sort((a, b) => b - a)) {
      const x = adat.uzemanyag.evek[ev][h];
      const v = (kulcs) => `${x[kulcs] ?? '–'}${x[kulcs + '_vedett'] ? ` <span class="kis">(védett: ${x[kulcs + '_vedett']})</span>` : ''}`;
      arSorok.push(`<tr data-arhonap="${ev}-${h}"${ev === lf.ev && h === lf.honap ? ' class="kiemelt"' : ''}><td>${honapHu(ev, h)}</td><td>${v('benzin')}</td><td>${v('dizel')}</td><td>${x.keverek ?? '–'}</td><td>${x.lpg ?? '–'}</td><td>${x.cng ?? '–'}</td></tr>`);
    }
  }
  const nb = km.norma_benzin, nd = km.norma_dizel;
  const hat = (t, i) => (t[i][0] === null ? `${t[i - 1][0]} cm³ felett` : i === 0 ? `${t[i][0]} cm³-ig` : `${t[i - 1][0] + 1}–${t[i][0]} cm³`);
  const normaSorok = [...nb.map((x, i) => `<tr><td>${hat(nb, i)}</td><td data-norma="benzin-${i}"${i === 2 ? ' class="kiemelt"' : ''}>${M.tized(x[1])}</td></tr>`)].join('');
  const normaSorokD = nd.map((x, i) => `<tr><td>${hat(nd, i)}</td><td data-norma="dizel-${i}">${M.tized(x[1])}</td></tr>`).join('');

  const kerdesek = [
    { k: `Mennyi a kilométertérítés ${M.rag(lf.ev, 'ban', 'ben')}?`, v: [`Hivatali útra két részből áll: az üzemanyag (a fogyasztási norma szorozva a NAV havi árával) és a ${km.normakoltseg_ft_km} Ft/km-es általános normaköltség. Egy 100 km-es út 1,6-os benzines autóval ${M.honapBan(lf.honap)} ${fmt(r.osszesen)} Ft, ami ${M.tized(r.ftKm)} Ft/km.`] },
    { k: 'Melyik havi NAV-árat kell használni?', v: ['Az utazás hónapjára érvényes árat. A NAV minden hónap végén közzéteszi a következő hónapra alkalmazható árat. A NAV-ár helyett a számla szerinti árral is elszámolhatsz.'] },
    { k: 'Hogyan számolunk hibrid és elektromos autónál?', v: [`Plug-in hibridnél a belső égésű motor alapnormájának ${Math.round(km.plugin_szorzo * 100)}%-ával, elektromos autónál 100 km-enként ${km.elektromos_benzin_l_100km} liter benzinnel egyenértékű mennyiséggel, a benzin NAV-árán. A nem tölthető hibrid a benzines vagy dízeles alapnormával számol.`, `LPG-nél a benzines alapnorma ${M.tized(km.lpg_szorzo)}-szerese, CNG-nél literenként ${M.tized(km.cng_kg_per_l, 2)} kg a norma.`] },
    { k: 'Mennyi a munkába járás térítése saját autóval?', v: [`Kilométerenként ${km.munkaba_jaras_ft_km} Ft adható adómentesen, a lakóhely és a munkahely közötti távolság oda-vissza útjára. A munkáltató nem köteles fizetni, a feltételeket a saját szabályzata adja meg.`] },
    { k: 'Kell számla vagy igazolás a kilométertérítéshez?', v: ['A kiküldetési rendelvény elég: ha a norma és a NAV-ár szerint számolsz, nem kell üzemanyagszámla, és a térítés adómentes. A rendelvényen szerepeljen az út célja, a távolság és az autó adatai.'] },
  ];

  const leiras = `Kilométertérítés-kalkulátor ${lf.ev}: kiküldetési rendelvény a fogyasztási normával és a NAV ${S.HONAPOK[lf.honap - 1]}i árával (benzin ${ar.benzin} Ft/l), plusz 15 Ft/km normaköltség. Munkába járás 30 Ft/km.`;
  const tartalom = (L) => `
${oldalfej(L, {
  morzsa: [{ nev: 'Kilométertérítés' }],
  cim: `Kilométertérítés-kalkulátor <em>${lf.ev}</em>`,
  bevezeto: 'Saját autóval mész hivatali útra? Kiszámoljuk, mennyit fizethet ki igazolás nélkül a munkáltató vagy a céged a NAV havi üzemanyagárával. A munkába járás térítését is.',
  cimkek: [{ t: `NAV-ár: ${honapHu(lf.ev, lf.honap)}`, sarga: true }, { t: `Normaköltség: ${km.normakoltseg_ft_km} Ft/km` }, { t: `Munkába járás: ${km.munkaba_jaras_ft_km} Ft/km` }],
})}
<section class="wrap kalk">
<form class="panel kalk-urlap" data-kalk="km" novalidate>
${profilChip}
<div class="valto valto-teljes" role="radiogroup" aria-label="Mit számolsz?">
<label><input type="radio" name="mod" value="kikuldetes" checked><span>Hivatali út (kiküldetés)</span></label>
<label><input type="radio" name="mod" value="munka"><span>Munkába járás</span></label>
</div>
<fieldset data-mutat="mod=kikuldetes">
<legend><span class="lepes">1</span>Az út</legend>
<div class="sor2">
<div class="mezo"><label for="km">Távolság</label><div class="bemenet van-egyseg"><input id="km" name="km" type="number" inputmode="numeric" min="1" value="100"><span class="egyseg">km</span></div></div>
<div class="mezo"><label for="honap">Az utazás hónapja</label><select id="honap" name="honap">${honapOpc.join('')}</select><span class="sugo">A legutóbbi elérhető NAV-ár: ${honapHu(lf.ev, lf.honap)}.</span></div>
</div>
<label class="kapcsolo"><input type="checkbox" name="odaVissza"><span class="k"></span><span class="szoveg">Oda-vissza<small>A megadott távolság duplájával számolunk.</small></span></label>
</fieldset>
<fieldset class="reszlet-blokk" data-mutat="mod=kikuldetes">
<legend><span class="lepes">2</span>Az autó</legend>
<div class="sor2">
<div class="mezo"><label for="uzemanyag">Üzemanyag</label><select id="uzemanyag" name="uzemanyag">
<option value="benzin" selected>Benzin</option><option value="dizel">Dízel</option><option value="lpg">LPG (autógáz)</option><option value="cng">CNG (földgáz)</option><option value="plugin">Plug-in hibrid</option><option value="elektromos">Elektromos</option>
</select></div>
<div class="mezo" data-mutat="uzemanyag=benzin|uzemanyag=dizel|uzemanyag=lpg|uzemanyag=cng|uzemanyag=plugin"><label for="cm3">Hengerűrtartalom</label><div class="bemenet van-egyseg"><input id="cm3" name="cm3" type="number" inputmode="numeric" min="50" value="1598"><span class="egyseg">cm³</span></div><span class="sugo">Forgalmi engedély, P.1 sor.</span></div>
</div>
<div class="mezo" data-mutat="uzemanyag=plugin"><span class="mezo-cim" id="motor-c">A belső égésű motor</span><div class="valto" role="radiogroup" aria-labelledby="motor-c"><label><input type="radio" name="motor" value="benzin" checked><span>Benzines</span></label><label><input type="radio" name="motor" value="dizel"><span>Dízeles</span></label></div></div>
<label class="kapcsolo" data-vedett hidden><input type="checkbox" name="vedett"><span class="k"></span><span class="szoveg">Védett árral számolok<small>Ebben a hónapban a NAV védett árat is közölt a magyar rendszámú autókra.</small></span></label>
<div class="mezo"><label for="sajatAr">Saját ár <span class="kis">(ha számla szerint számolsz)</span></label><div class="bemenet van-egyseg"><input id="sajatAr" name="sajatAr" type="number" inputmode="numeric" min="0" placeholder="üresen a NAV-árral"><span class="egyseg">Ft</span></div></div>
</fieldset>
<fieldset data-mutat="mod=munka">
<legend><span class="lepes">1</span>A munkába járás</legend>
<div class="sor2">
<div class="mezo"><label for="tav">Lakóhely és munkahely távolsága</label><div class="bemenet van-egyseg"><input id="tav" name="tav" type="number" inputmode="numeric" min="1" value="25"><span class="egyseg">km</span></div><span class="sugo">Egy irányban; a visszautat mi számoljuk hozzá.</span></div>
<div class="mezo"><label for="napok">Munkába járós napok havonta</label><div class="bemenet van-egyseg"><input id="napok" name="napok" type="number" inputmode="numeric" min="1" max="31" value="20"><span class="egyseg">nap</span></div></div>
</div>
</fieldset>
</form>
${eredmenyPanel(M.kmPanel(adat, r, alap))}
</section>

<section class="szek" style="padding-top:88px">
<div class="wrap tartalom">
<article class="cikk">
<h2 id="nav-arak">NAV-üzemanyagárak</h2>
<p>A NAV havonta közzéteszi, milyen árral lehet elszámolni az üzemanyagot a fogyasztási norma szerint. Ez nem a kúton fizetett ár, hanem három nagy forgalmazó előző havi árának átlaga. A táblázat magától frissül, amint a NAV közzéteszi a következő hónapot.</p>
<div class="tabla-tarto"><table class="tabla"><caption>Ft/l, a CNG Ft/kg</caption><thead><tr><th>Hónap</th><th>Benzin</th><th>Dízel</th><th>Keverék</th><th>LPG</th><th>CNG</th></tr></thead><tbody>${arSorok.join('')}</tbody></table></div>
<p class="forras-sor">Forrás: <a href="${adat.uzemanyag.forras}" rel="noopener" target="_blank">NAV, alkalmazható üzemanyagárak</a></p>
<h2>Fogyasztási normák</h2>
<p>Az alapnorma a hengerűrtartalomtól függ, és 100 km-re vonatkozik. LPG-nél a benzines norma ${M.tized(km.lpg_szorzo)}-szerese, plug-in hibridnél a belső égésű motor normájának ${Math.round(km.plugin_szorzo * 100)}%-a, elektromos autónál 100 km-enként ${km.elektromos_benzin_l_100km} liter benzin.</p>
<div class="sor2" style="gap:18px">
<div class="tabla-tarto"><table class="tabla" style="min-width:0"><caption>Benzin, l/100 km</caption><thead><tr><th>Hengerűrtartalom</th><th>Norma</th></tr></thead><tbody>${normaSorok}</tbody></table></div>
<div class="tabla-tarto"><table class="tabla" style="min-width:0"><caption>Dízel, l/100 km</caption><thead><tr><th>Hengerűrtartalom</th><th>Norma</th></tr></thead><tbody>${normaSorokD}</tbody></table></div>
</div>
<h2>Gyakori kérdések</h2>
${gyik(kerdesek)}
<h2>Források</h2>
${forrasLista([
  { nev: 'NAV: alkalmazható üzemanyagárak', url: adat.uzemanyag.forras, d: 'havonta frissül' },
  ...km.forrasok.map((f) => ({ nev: f.nev, url: f.url })),
])}
</article>
${oldalsav(L, ut, `<p class="kis" style="margin:0">A legfrissebb NAV-ár: ${honapHu(lf.ev, lf.honap)}${arDatum(adat, lf.ev, lf.honap) ? `, ${arDatum(adat, lf.ev, lf.honap)}` : ''}. Az új hónap árát a NAV a hónap vége felé teszi közzé; az oldal naponta ellenőrzi.</p>`)}
</div>
</section>`;

  return oldal(k, {
    cim: `Kilométertérítés-kalkulátor ${lf.ev}: NAV-üzemanyagárak és normák`,
    leiras, ut, tartalom,
    adatJson: { uzemanyag: { evek: adat.uzemanyag.evek }, szabalyok: { km } },
    jsonld: [alkalmazasLd(k.cfg, 'Kilométertérítés-kalkulátor', ut, leiras), gyikLd(kerdesek), morzsaLd(k.cfg, [{ nev: 'Kilométertérítés-kalkulátor', ut }])],
  });
}

/* ======================= FORRÁSOK ======================= */
export function forrasokOldal(k) {
  const { adat } = k;
  const ut = 'forrasok/';
  const al = adat.allapot;
  const lf = S.legfrissebbHonap(adat);
  const t = adat.tetelek;
  const sor = (nev, ertek, d) => `<tr><td>${nev}</td><td style="text-align:left;white-space:normal">${ertek}</td><td>${d || ''}</td></tr>`;
  const tartalom = (L) => `
${oldalfej(L, {
  morzsa: [{ nev: 'Források és frissítés' }],
  cim: 'Források és <em>frissítés</em>',
  bevezeto: 'Minden szám hivatalos forrásból jön, és mindegyik mellé odaírjuk, mikor jelent meg. Itt látod, honnan, és hogyan tartjuk naprakészen.',
})}
<section class="wrap" style="padding-bottom:40px">
<div class="panel frisses">
<span><i class="pont${al.figyelmeztetesek?.length ? ' var' : ''}"></i>Utolsó automatikus ellenőrzés: <b>${al.utolso_ellenorzes ? `${datumHu(al.utolso_ellenorzes)} ${al.utolso_ellenorzes.slice(11, 16)}` : 'még nem futott'}</b></span>
<span>Üzemanyagár: <b>${al.uzemanyag?.uzenet ?? '–'}</b></span>
<span>Adótételek: <b>${al.tetelek?.uzenet ?? '–'}</b></span>
</div>
</section>
<section class="wrap tartalom" style="padding-bottom:80px">
<article class="cikk">
<h2>Hogyan frissül az oldal?</h2>
<p>Minden reggel lefut egy ellenőrzés. Megnézi a NAV üzemanyagár-oldalát, és ha megjelent egy új hónap, átveszi az árakat. Október végétől azt is figyeli, megjelentek-e a következő évi adótételek. Új adatot csak akkor vesz át, ha a NAV-oldal felépítése a megszokott, és minden szám ésszerű tartományban van; utána lefutnak a számítási tesztek, és csak ha mind rendben van, frissül az oldal.</p>
<p>Ha valami nem stimmel, például a NAV átalakítja az oldalát, az ellenőrzés nem ír át semmit, hanem jelez, és a régi, ellenőrzött adat marad kint. A dátumtól függő részek, például az alapértelmezett adóév, minden nap újraszámolódnak, így január 1-jén magától átáll a következő évre.</p>
<h2>Az adatok</h2>
<div class="tabla-tarto"><table class="tabla"><thead><tr><th>Adat</th><th style="text-align:left">Érték</th><th>Közzétéve</th></tr></thead><tbody>
${sor('NAV-üzemanyagár, legfrissebb hónap', honapHu(lf.ev, lf.honap), arDatum(adat, lf.ev, lf.honap).replace(/^közzétéve /, ''))}
${Object.entries(t.gepjarmuado).map(([e, v]) => sor(`Gépjárműadó, ${e}`, `${v.savok.join(' / ')} Ft/kW`, datumHu(v.kozzeteve))).join('')}
${Object.entries(t.illetek).map(([e, v]) => sor(`Átírási illeték, ${e}`, `${Math.min(...v.tabla.flat())}–${Math.max(...v.tabla.flat())} Ft/kW`, datumHu(v.kozzeteve))).join('')}
${Object.entries(t.regado_alap).map(([e, v]) => sor(`Regisztrációs adó alapja, ${e}`, `${fmt(v.ft)} Ft`, datumHu(v.kozzeteve))).join('')}
${sor('Okmánydíjak', `forgalmi ${fmt(adat.szabalyok.okmanyok.forgalmi_engedely)} Ft, törzskönyv ${fmt(adat.szabalyok.okmanyok.torzskonyv)} Ft`, '2025. február 1-jétől')}
${sor('Normaköltség / munkába járás', `${adat.szabalyok.km.normakoltseg_ft_km} Ft/km / ${adat.szabalyok.km.munkaba_jaras_ft_km} Ft/km`, '')}
</tbody></table></div>
${al.figyelmeztetesek?.length ? `<h2>Nyitott jelzések</h2><ul>${al.figyelmeztetesek.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
<h2>Hibát találtál?</h2>
<p>${k.cfg.kapcsolat_email ? `Írj nekünk: <a href="mailto:${k.cfg.kapcsolat_email}">${k.cfg.kapcsolat_email}</a>. Minden jelzést megnézünk, és ha igazad van, az oldalon is jelezzük a javítást.` : 'A kapcsolati e-mail-cím hamarosan itt lesz.'}</p>
</article>
${oldalsav(L, ut, '<p class="kis" style="margin:0">A számítások tájékoztató jellegűek. A fizetendő adót és illetéket a NAV határozata tartalmazza.</p>')}
</section>`;
  return oldal(k, { cim: 'Források és frissítés', leiras: 'Honnan származnak az Autóköltség kalkulátorainak adatai, mikor jelentek meg, és hogyan frissülnek automatikusan.', ut, tartalom, jsonld: [morzsaLd(k.cfg, [{ nev: 'Források és frissítés', ut }])] });
}

/* ======================= JOGI OLDALAK ======================= */
function kitoltendo(x) { return x ? x : '<span class="cimke cimke-sarga">kitöltés alatt</span>'; }

export function impresszumOldal(k) {
  const { cfg } = k;
  const u = cfg.uzemelteto;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: [{ nev: 'Impresszum' }], cim: 'Impresszum', bevezeto: 'Az oldal üzemeltetőjének és tárhelyszolgáltatójának adatai.' })}
<section class="wrap" style="padding-bottom:80px"><article class="cikk" style="max-width:760px">
<div class="tabla-tarto"><table class="tabla"><tbody>
<tr><td>Weboldal</td><td style="text-align:left">${cfg.domain.replace('https://', '')}</td></tr>
<tr><td>Üzemeltető</td><td style="text-align:left">${kitoltendo(u.nev)}</td></tr>
<tr><td>Székhely</td><td style="text-align:left">${kitoltendo(u.szekhely)}</td></tr>
<tr><td>Adószám</td><td style="text-align:left">${kitoltendo(u.adoszam)}</td></tr>
<tr><td>Nyilvántartási szám</td><td style="text-align:left">${kitoltendo(u.nyilvantartasi_szam)}</td></tr>
<tr><td>E-mail</td><td style="text-align:left">${cfg.kapcsolat_email ? `<a href="mailto:${cfg.kapcsolat_email}">${cfg.kapcsolat_email}</a>` : kitoltendo('')}</td></tr>
<tr><td>Tárhelyszolgáltató</td><td style="text-align:left">${cfg.tarhely.nev}, ${cfg.tarhely.cim}, <a href="${cfg.tarhely.web}" rel="noopener">${cfg.tarhely.web.replace('https://', '')}</a></td></tr>
</tbody></table></div>
<h2>Felelősség</h2>
<p>A kalkulátorok a NAV és a jogszabályok közzétett adataival számolnak, és tájékoztató jellegűek. Nem minősülnek adó- vagy pénzügyi tanácsadásnak. A ténylegesen fizetendő adót és illetéket a NAV határozata tartalmazza. Az adatok helyességére a lehető legnagyobb gondossággal figyelünk, de a számítások alapján hozott döntésekért felelősséget nem vállalunk.</p>
</article></section>`;
  return oldal(k, { cim: 'Impresszum', leiras: `A(z) ${cfg.marka} üzemeltetőjének és tárhelyszolgáltatójának adatai.`, ut: 'impresszum/', tartalom });
}

export function adatvedelemOldal(k) {
  const { cfg } = k;
  const tartalom = (L) => `
${oldalfej(L, { morzsa: [{ nev: 'Adatvédelem' }], cim: 'Adatvédelem', bevezeto: 'Röviden: nem gyűjtünk rólad semmit. A kalkulátorok a böngésződben számolnak, és a beírt adatokat nem küldjük el.' })}
<section class="wrap" style="padding-bottom:80px"><article class="cikk" style="max-width:760px">
<h2>Mit tárol a böngésződ?</h2>
<p>Két dolgot, és csak a saját gépeden, a böngésző helyi tárolójában (localStorage):</p>
<ul><li>a választott megjelenést (világos vagy sötét);</li><li>az autód adatait (teljesítmény, gyártási év, hajtás, hengerűrtartalom), de csak ha a „Megjegyzem ezt az autót” gombra kattintasz.</li></ul>
<p>Ezek nem sütik, és nem jutnak el hozzánk. Bármikor törölheted őket az „Elfelejtés” gombbal vagy a böngésző beállításaiban.</p>
<h2>Sütik, statisztika, hirdetés</h2>
<p>Sütit nem használunk, követő- és statisztikai kódot nem futtatunk, hirdetés jelenleg nincs az oldalon. A betűtípusokat is saját tárhelyről töltjük, így harmadik fél nem kap adatot a látogatásodról. Ha ez változik, előre itt jelezzük, és csak a hozzájárulásoddal kapcsolunk be bármit.</p>
<h2>Szervernapló</h2>
<p>Az oldalt a ${cfg.tarhely.nev} (${cfg.tarhely.cim}) szolgálja ki. Mint minden tárhelyszolgáltató, technikai naplót vezet a kérésekről (például IP-cím, időpont, böngésző típusa) a szolgáltatás biztonsága és működése érdekében. Ezeket mi nem használjuk fel, és nem kapcsoljuk személyhez.</p>
<h2>Adatkezelő és jogaid</h2>
<p>Adatkezelő: ${kitoltendo(cfg.uzemelteto.nev)}${cfg.kapcsolat_email ? `, <a href="mailto:${cfg.kapcsolat_email}">${cfg.kapcsolat_email}</a>` : ''}. Jogod van tájékoztatást, helyesbítést, törlést és korlátozást kérni, és tiltakozhatsz az adatkezelés ellen. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, 1055 Budapest, Falk Miksa utca 9–11., <a href="https://naih.hu" rel="noopener">naih.hu</a>) fordulhatsz.</p>
</article></section>`;
  return oldal(k, { cim: 'Adatvédelem', leiras: `Adatvédelmi tájékoztató: a(z) ${cfg.marka} nem használ sütit és követőkódot, a számítás a böngészőben fut.`, ut: 'adatvedelem/', tartalom });
}

export function nemTalalhatoOldal(k) {
  const tartalom = (L) => `
<section class="wrap"><div class="oldalfej" style="padding:120px 0 140px">
<p class="felirat">404 · Zsákutca</p>
<h1 class="cim cim-1">Erre <em>nincs út</em></h1>
<p class="bevezeto">Ezt az oldalt nem találjuk. Lehet, hogy elírás van a címben, vagy az oldal új helyre került.</p>
<div class="hos-gombok"><a class="gomb gomb-sarga" href="${L.l('')}">Vissza a főoldalra <span class="nyil">→</span></a><a class="gomb gomb-keret" href="${L.l('gepjarmuado-kalkulator/')}">Gépjárműadó-kalkulátor</a></div>
</div></section>`;
  return oldal({ ...k, cfg: { ...k.cfg, eles: false } }, { cim: 'Az oldal nem található', leiras: 'Az oldal nem található.', ut: '', tartalom });
}
