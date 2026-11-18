// Az elszámolás (eredmény) HTML-je. Ugyanezt használja az építő (a HTML-ben már benne van a szám)
// és a böngésző (élő számolás), így a kettő nem térhet el.
import * as S from './szamitas.mjs';

const nf = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
export const fmt = (n) => nf.format(Math.round(n));
export const tized = (n, j = 1) => new Intl.NumberFormat('hu-HU', { maximumFractionDigits: j }).format(n);
export const ftx = (n) => `${fmt(n)}&nbsp;Ft`;

const ROMAI = ['I.', 'II.', 'III.', 'IV.', 'V.', 'VI.', 'VII.', 'VIII.', 'IX.', 'X.', 'XI.', 'XII.'];
export function datumHu(iso) {
  if (!iso) return '';
  const [e, h, n] = iso.slice(0, 10).split('-').map(Number);
  return `${e}. ${S.HONAPOK[h - 1]} ${n}.`;
}
/** „2026. október 19-én” */
export function datumNapon(iso) {
  const [e, h, n] = iso.slice(0, 10).split('-').map(Number);
  return `${e}. ${S.HONAPOK[h - 1]} ${n}-${S.napRag(n)}`;
}
/** „2026. november 30-ig” */
export const datumIg = (iso) => datumHu(iso).replace(/\.$/, '-ig');
export function datumRomai(iso) {
  const [, h, n] = iso.slice(0, 10).split('-').map(Number);
  return `${ROMAI[h - 1]} ${n}.`;
}
/** Évszám utáni rag hangrendje: 2026-tól, 2027-től, 2028-ban, 2029-ben. */
export function hatso(ev) {
  const d = ev % 10;
  if (d === 0) return [0, 2, 3, 6, 8].includes(Math.floor(ev / 10) % 10);
  return [3, 6, 8].includes(d);
}
export const rag = (ev, h, e) => `${ev}-${hatso(ev) ? h : e}`;
/** 2026-os, 2027-es, 2028-as, 2035-ös */
export function os(ev) {
  const d = ev % 10, t = Math.floor(ev / 10) % 10;
  const r = d === 0 ? ({ 1: 'es', 2: 'as', 3: 'as', 4: 'es', 5: 'es', 6: 'as', 7: 'es', 8: 'as', 9: 'es', 0: 'as' })[t] : ({ 1: 'es', 2: 'es', 3: 'as', 4: 'es', 5: 'ös', 6: 'os', 7: 'es', 8: 'as', 9: 'es' })[d];
  return `${ev}-${r}`;
}
/** januárban … novemberben */
export function honapBan(h) { const n = S.HONAPOK[h - 1]; return n + (/(szeptember|október|november|december)$/.test(n) ? 'ben' : 'ban'); }
export function honapHu(ev, honap) { return `${ev}. ${S.HONAPOK[honap - 1]}`; }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function vegosszeg(mi, ertek, megj) {
  return `<div class="vegosszeg"><span class="mi">${mi}</span><span class="mennyi" data-osszeg="${Math.round(ertek)}"><span class="ertek">${fmt(ertek)}</span><span class="ft">Ft</span></span>${megj ? `<p class="megj">${megj}</p>` : ''}</div>`;
}
/* Minden tétel mellett látszik, honnan jön: hivatalos (NAV, jogszabály), saját (te adtad meg) vagy becslés (a mi feltevésünk). */
const JEL = {
  hivatalos: ['hivatalos', 'A NAV közzétett tétele vagy jogszabályban rögzített díj'],
  sajat: ['saját', 'Ezt te adtad meg'],
  becsles: ['becslés', 'A mi feltevésünk. A Források oldalon látod, honnan számoljuk'],
};
// A források oldalának címe: élesben /forrasok/, előnézetben relatív. A böngésző a lábléc linkjéből állítja be.
let forrasokUrl = '/forrasok/';
export function forrasokHelye(u) { if (u) forrasokUrl = u; }
/** f: hivatalos | sajat | becsles. A hivatalos a konkrét NAV-forrásra, a becslés a magyarázatra visz. */
export function jel(f, href = '') {
  if (!f || !JEL[f]) return '';
  const cel = f === 'hivatalos' ? (href || forrasokUrl) : f === 'becsles' ? `${forrasokUrl}#becslesek` : '';
  if (!cel) return `<span class="jel jel-${f}" title="${JEL[f][1]}">${JEL[f][0]}</span>`;
  const kulso = /^https?:/.test(cel) && !cel.startsWith(globalThis.location?.origin || '#');
  return `<a class="jel jel-${f}" href="${esc(cel)}" title="${JEL[f][1]}"${kulso ? ' target="_blank" rel="noopener"' : ''}>${JEL[f][0]}</a>`;
}
/** Jelmagyarázat a panel aljára, csak a ténylegesen használt jelölésekkel. */
export function jelekkel(html) {
  const van = Object.keys(JEL).filter((f) => html.includes(`jel-${f}"`));
  if (!van.length) return html;
  const szo = { hivatalos: 'a NAV vagy jogszabály szerinti tétel, a jelölésre kattintva a forrást látod', sajat: 'te adtad meg', becsles: `a mi feltevésünk, a valóság ettől eltérhet. <a href="${forrasokUrl}#becslesek">Mi alapján becsüljük?</a>` };
  const minta = { hivatalos: '<span class="jel jel-hivatalos">hivatalos</span>', sajat: '<span class="jel jel-sajat">saját</span>', becsles: '<span class="jel jel-becsles">becslés</span>' };
  return `${html}<p class="jelmagyarazat">${van.map((f) => `${minta[f]} ${szo[f]}`).join('<br>')}</p>`;
}
function tetel(nev, ertek, { cls = '', al = '', href = '', forras = '', forrasUrl = '' } = {}) {
  const n = href ? `<a href="${href}">${nev}</a>` : nev;
  return `<li class="${cls}"><span>${n}${forras ? ` ${jel(forras, forrasUrl)}` : ''}${al ? `<span class="al">${al}</span>` : ''}</span><span class="ossz-ertek">${ertek}</span></li>`;
}
/** A táblázat tbody-sorainak első cellája sorfejléc (th scope=row), hogy a felolvasó minden számhoz kimondja, mi az. */
const sorfejek = (html) => html.replace(/(<tr[^>]*>)<td>(.*?)<\/td>/g, '$1<th scope="row">$2</th>');
const megjegyzes = (s, cls = '') => `<p class="megjegyzes ${cls}">${s}</p>`;
export const hibaPanel = (uz) => `<p class="hiba" role="alert">${esc(uz)}</p>`;

/* ---------- Gépjárműadó ---------- */
export function gjadoPanel(adat, r, b) {
  if (r.hiba) return hibaPanel(r.hiba);
  const kov = adat.tetelek.gepjarmuado[r.ev + 1] ? S.gepjarmuado(adat, { ...b, ev: r.ev + 1, valtozas: '', evkozbenHonap: 0, kivonasHonap: 0 }) : null;
  const kovSzoveg = kov && !kov.hiba ? `${rag(kov.ev, 'tól', 'től')} te fizeted, ${kov.mentes ? 'de az autó mentes' : `akkor ${ftx(kov.fizetendo)} évente`}.` : 'A következő évtől te fizeted.';
  if (r.valtozas === 'vett') {
    return vegosszeg(`A te gépjárműadód, ${r.ev}`, 0, `Az idei adót az eladó fizeti. ${kovSzoveg}`)
      + megjegyzes(`Az éves gépjárműadót az fizeti, aki január 1-jén üzembentartóként (ha nincs ilyen, tulajdonosként) szerepel a járműnyilvántartásban. Használt autó évközi vételekor ez az eladó, akkor is, ha az autót januárban adta el. Kivétel, ha az autót forgalomból kivonva vetted, és a te nevedre helyezték újra forgalomba: akkor a következő hónaptól időarányosan te fizetsz. Ezt a „Forgalomba helyezték a nevemen” válasszal számolhatod ki.`);
  }
  const al = r.mentes ? null
    : r.valtozas === 'uj' ? `${r.honapok} hónapra. A befizetés határidejét a NAV határozata tartalmazza.`
    : r.valtozas === 'kivonta' ? `${r.honapok} hónapra, a kivonás hónapjának végéig. Ha az egész évit már befizetted, a különbözet visszajár.`
    : `Egy összegben, ${r.ev}. április 15-ig. Havonta nagyjából ${ftx(r.havi)}.`;
  let h = vegosszeg(`Gépjárműadó, ${r.ev}`, r.fizetendo, al);
  if (r.mentes) return h + megjegyzes(r.mentes, 'mentes') + evSav(adat, r, b);
  h += '<ul class="tetelek">';
  h += tetel('Teljesítmény (P.2)', `${fmt(r.kw)} kW`, { forras: 'sajat' });
  h += tetel('Az autó kora', `${r.kor}. naptári év`, { al: `korsáv: ${S.GJADO_SAV_ROVID[r.sav]}`, forras: 'sajat' });
  h += tetel('Adótétel', `${r.ftKw} Ft/kW`, { forras: 'hivatalos', forrasUrl: adat.tetelek.gepjarmuado[r.ev]?.forras, al: adat.tetelek.gepjarmuado[r.ev]?.kozzeteve ? `NAV, közzétéve ${datumHu(adat.tetelek.gepjarmuado[r.ev].kozzeteve)}` : '' });
  if (r.honapok < 12) h += tetel('Időarány', `${r.honapok}/12`, { al: r.valtozas === 'uj' ? `${S.HONAPOK[r.honap - 1]} végéig nem kell fizetni` : `${S.HONAPOK[r.kivonas - 1]} végéig kell fizetni`, forras: 'sajat' });
  if (r.kedvezmeny) h += tetel('Mozgáskorlátozotti mentesség', `−${ftx(r.kedvezmeny)}`, { al: 'évi 13 000 Ft-ig', cls: 'levonas', forras: 'hivatalos' });
  h += tetel('Fizetendő', ftx(r.fizetendo), { cls: 'vegso' });
  h += '</ul>';
  h += `<p class="igy">Így jön ki: <strong>${fmt(r.kw)} kW × ${r.ftKw} Ft/kW = ${ftx(r.evesTeljes)}</strong>${r.honapok < 12 ? `, ebből ${r.honapok} hónapra <strong>${ftx(r.aranyos)}</strong>` : ''}${r.kedvezmeny ? `, a mentességgel <strong>${ftx(r.fizetendo)}</strong>` : ''}.</p>`;
  if (r.valtozas === 'eladta') h += megjegyzes(`Az idei adót akkor is te fizeted, ha év közben eladod az autót, mert január 1-jén a te nevedre szólt. A vevő a következő évtől fizet. Ha az autót kereskedésbe adod, és a kereskedő kivonja a forgalomból, a kivonás hónapja utáni rész visszajár: ezt a „Kivonták a forgalomból” válasszal számolhatod ki.`);
  if (r.kedvezmeny) h += megjegyzes('A mentességet egyszer kell bejelenteni a NAV-nak a GJADO-adatlapon, utána nem kell évente megismételni. Ha több autód van, csak a legkisebb teljesítményűre jár.');
  if (r.mkMegjegyzes) h += megjegyzes(r.mkMegjegyzes);
  return jelekkel(h) + evSav(adat, r, b);
}

function evSav(adat, r, b) {
  // eladás vagy forgalomból kivonás után a következő évek nem a látogatóra vonatkoznak
  if (r.valtozas === 'eladta' || r.valtozas === 'kivonta') return '';
  // a kiválasztott évnél a ténylegesen fizetendő (időarányos) összeg látszik
  const evek = S.gjadoEvek(adat, b).filter((x) => !x.hiba).map((x) => (x.ev === r.ev ? { ...x, fizetendo: r.fizetendo } : x));
  if (evek.length < 2) return '';
  let h = `<div class="ev-sav" aria-label="Ugyanez az autó évenként">${evek.map((x) => `<div class="${x.ev === r.ev ? 'aktiv' : ''}"><span class="ev">${x.ev}</span><span class="ennyi">${ftx(x.fizetendo)}</span>${adat.tetelek.gepjarmuado[x.ev]?.kozzeteve ? `<span class="statusz">NAV-tétel, közzétéve ${datumHu(adat.tetelek.gepjarmuado[x.ev].kozzeteve)}</span>` : ''}</div>`).join('')}</div>`;
  const valt = evek.find((x, i) => i > 0 && x.sav !== evek[i - 1].sav && !x.mentes);
  if (valt) h += megjegyzes(`${rag(valt.ev, 'tól', 'től')} az autó a következő korsávba lép (${S.GJADO_SAV_ROVID[valt.sav]}), ott ${valt.ftKw} Ft/kW a tétel.`);
  return h;
}

/* ---------- Átírás ---------- */
export function atirasPanel(adat, r, b = {}) {
  if (r.hiba) return hibaPanel(r.hiba);
  const il = r.illetek;
  let h = vegosszeg('Az átírás költsége', r.osszesen, r.vetelar ? `A ${ftx(r.vetelar)} vételárral együtt ${ftx(r.mindossz)}.` : (r.regado ? 'Illeték, regisztrációs adó, vizsgálat és okmányok.' : 'Illeték, vizsgálat és okmányok.'));
  if (il.mentes) h += megjegyzes(il.mentes, 'mentes');
  if (r.regado?.mentes) h += megjegyzes(r.regado.mentes, 'mentes');
  h += '<ul class="tetelek">';
  // Az eredetiségvizsgálat egységes hatósági ár, a hengerűrtartalom szerint
  const ok = adat.szabalyok.okmanyok;
  const evSav = ok.eredetisegvizsgalat_savok?.find((x) => x.ft === Number(b.eredetisegDij ?? ok.eredetisegvizsgalat_alap));
  for (const t of r.tetelek) h += tetel(t.nev, ftx(t.ft), { forras: 'hivatalos', forrasUrl: t.kulcs === 'illetek' ? adat.tetelek.illetek?.[b.ev]?.forras : t.kulcs === 'regado' ? adat.tetelek.regado_alap?.[b.ev]?.forras : t.kulcs === 'eredetiseg' ? ok.eredetiseg_forras?.url : t.kulcs === 'rendszam' ? ok.behozott_forras?.url : ok.forras?.url || '', al: t.kulcs === 'eredetiseg' && evSav ? `hatósági ár, ${evSav.nev}` : '' });
  h += tetel('Összesen', ftx(r.osszesen), { cls: 'vegso' });
  h += '</ul>';
  h = jelekkel(h);
  const sorok = [];
  if (!il.mentes) sorok.push(`Illeték: <strong>${fmt(il.kw)} kW × ${il.ftKw} Ft/kW${il.szorzo > 1 ? ' × 2' : ''}${il.hanyad < 100 ? ` × ${il.hanyad}%` : ''} = ${ftx(il.osszeg)}</strong> (${S.ILLETEK_KW_SAVOK[il.sor]}, ${S.ILLETEK_KOR_SAVOK[il.oszlop]}${il.szorzo > 1 ? ', ajándéknál és öröklésnél kétszeres' : ''})`);
  if (r.regado && !r.regado.mentes) {
    const g = r.regado;
    sorok.push(`Regisztrációs adó: <strong>${ftx(g.alap)} × ${tized(g.szorzo, 2)} × ${100 - g.csokk}% = ${ftx(g.osszeg)}</strong> (${S.REGADO_SOR_NEV[g.sor]}, „${g.oszlop}” oszlop, ${g.honapok} hónapos autó, ${g.csokk}% csökkentés)`);
  }
  if (sorok.length) h += `<p class="igy">${sorok.join('<br>')}</p>`;
  h += megjegyzes(`Az átírást a szerződéskötéstől számított ${adat.szabalyok.hataridok.atiras_napok} napon belül kell kezdeményezni. Az illetéket a NAV határozatban közli.`);
  return h;
}

/* ---------- Kilométertérítés ---------- */
export function kmPanel(adat, r, b) {
  if (r.hiba) return hibaPanel(r.hiba);
  const nk = adat.szabalyok.km.normakoltseg_ft_km;
  let h = vegosszeg('Elszámolható költségtérítés', r.osszesen, `${fmt(r.tav)} km${b.odaVissza ? ' oda-vissza' : ''}, kilométerenként ${tized(r.ftKm, 1)} Ft. Számla nélkül, adómentesen.`);
  h += '<ul class="tetelek">';
  h += tetel('Üzemanyag', ftx(r.uzemanyagFt), { al: `${tized(r.mennyiseg, 2)} ${r.egyseg} × ${r.ar} Ft`, forras: b.sajatAr ? 'sajat' : 'hivatalos', forrasUrl: adat.uzemanyag?.forras });
  h += tetel('Normaköltség', ftx(r.normakoltseg), { al: `${fmt(r.tav)} km × ${nk} Ft`, forras: 'hivatalos', forrasUrl: adat.szabalyok.km?.forrasok?.find((x) => x.url)?.url });
  h += tetel('Összesen', ftx(r.osszesen), { cls: 'vegso' });
  h += '</ul>';
  h = jelekkel(h);
  h += `<p class="igy">Norma: <strong>${tized(r.norma, 3)} ${r.egyseg}/100 km</strong> (${r.normaLeiras}). Ár: ${r.arForras}.</p>`;
  return h;
}

export function utikoltsegPanel(adat, r, b = {}) {
  if (r.hiba) return hibaPanel(r.hiba);
  const ut = `${fmt(r.tav)} km${b.odaVissza ? ' oda-vissza' : ''}`;
  const hanyan = ['', '', 'ketten', 'hárman', 'négyen', 'öten', 'hatan', 'heten', 'nyolcan', 'kilencen'][r.utasok];
  const fo = r.utasok > 1 ? ` Fejenként ${ftx(r.fejenkent)}, ha ${hanyan} osztjátok.` : '';
  let h = vegosszeg('Az út költsége', r.osszesen, `${ut}, kilométerenként ${tized(r.ftKm, 1)} Ft ${r.egyseg === 'kWh' ? 'áramra' : 'üzemanyagra'}.${fo}`);
  h += '<ul class="tetelek">';
  const mennyi = `${tized(r.mennyiseg, r.mennyiseg < 10 ? 2 : 1)} ${r.egyseg} × ${tized(r.ar, 1)} Ft`;
  const forrasUrl = r.arTipus === 'hivatalos' ? adat.uzemanyag?.forras : '';
  h += tetel(r.egyseg === 'kWh' ? 'Áram' : `Üzemanyag (${r.uzemanyagNev})`, ftx(r.energiaFt), { al: `${mennyi}${r.veszteseg ? `, ${fmt(r.veszteseg)}% töltési veszteséggel` : ''}`, forras: r.arTipus, forrasUrl });
  if (r.egyeb) h += tetel('Útdíj, matrica, parkolás', ftx(r.egyeb), { forras: 'sajat' });
  h += tetel('Összesen', ftx(r.osszesen), { cls: 'vegso' });
  if (r.utasok > 1) h += tetel(`Fejenként (${r.utasok} fő)`, ftx(r.fejenkent));
  if (r.havi) { h += tetel(`Havonta (${fmt(r.alkalom)} alkalom)`, ftx(r.havi)); h += tetel('Évente', ftx(r.eves)); }
  h += '</ul>';
  h = jelekkel(h);
  h += `<p class="igy">Fogyasztás: <strong>${tized(r.fogyasztas, 1)} ${r.egyseg}/100 km</strong> (a te adatod). Ár: ${r.arForras}.${r.arTipus === 'hivatalos' ? ' A NAV havi ára a nagy forgalmazók átlagán alapul, a kúton ettől eltérhet: ha tudod a pontos árat, írd be.' : ''}</p>`;
  return h;
}

export function munkaPanel(adat, r) {
  if (r.hiba) return hibaPanel(r.hiba);
  let h = vegosszeg('Munkába járás, havonta', r.havi, `Évente ${ftx(r.eves)}. Ennyit adhat adómentesen a munkáltató.`);
  h += '<ul class="tetelek">';
  h += tetel('Havi távolság oda-vissza', `${fmt(r.haviKm)} km`);
  h += tetel('Térítés', `${r.dij} Ft/km`, { forras: 'hivatalos' });
  h += tetel('Havonta', ftx(r.havi), { cls: 'vegso' });
  h += '</ul>';
  h = jelekkel(h);
  h += megjegyzes('A munkáltató nem köteles fizetni. Hogy fizet-e és milyen feltétellel, azt a saját szabályzata dönti el.');
  return h;
}

/* ---------- Főoldal: egy autó, négy válasz ---------- */
/** b: { kw, gyartasiEv, hajtas: benzin|dizel|hibrid|plugin|elektromos, cm3 }, k: { ev, ma, linkek: {gjado, atiras, km} } */
export function gyorsPanel(adat, b, k) {
  const kw = Number(b.kw), gy = Number(b.gyartasiEv);
  if (!(kw > 0)) return hibaPanel('Add meg a teljesítményt (P.2).');
  if (!(gy > 1900)) return hibaPanel('Add meg a gyártási évet.');
  const gjHajtas = b.hajtas === 'elektromos' ? 'elektromos' : b.hajtas === 'plugin' ? 'plugin' : 'hagyomanyos';
  const evek = Object.keys(adat.tetelek.gepjarmuado).map(Number).filter((e) => e >= k.ev).sort();
  const gjk = evek.map((ev) => S.gepjarmuado(adat, { ev, kw, gyartasiEv: gy, hajtas: gjHajtas }));
  if (gjk[0]?.hiba) return hibaPanel(gjk[0].hiba);
  const at = S.atiras(adat, { ev: k.ev, datum: k.ma, kw, gyartasiEv: gy, hajtas: b.hajtas === 'benzin' || b.hajtas === 'dizel' ? 'hagyomanyos' : b.hajtas, szerzes: 'vetel' });
  const lf = S.legfrissebbHonap(adat);
  const uz = { benzin: 'benzin', dizel: 'dizel', hibrid: 'benzin', plugin: 'plugin', elektromos: 'elektromos' }[b.hajtas];
  const km = S.kikuldetes(adat, { km: 100, uzemanyag: uz, motor: 'benzin', cm3: Number(b.cm3) || 1598, ev: lf.ev, honap: lf.honap });

  const g0 = gjk[0];
  let h = vegosszeg(`Gépjárműadó, ${g0.ev}`, g0.fizetendo, g0.mentes ? g0.mentes : `${g0.ftKw} Ft/kW (korsáv: ${S.GJADO_SAV_ROVID[g0.sav]}). Befizetés ${g0.ev}. április 15-ig.`);
  h += '<ul class="tetelek">';
  for (const g of gjk.slice(1)) {
    const d = g.fizetendo - g0.fizetendo;
    const kz = adat.tetelek.gepjarmuado[g.ev]?.kozzeteve;
    h += tetel(`Gépjárműadó, ${g.ev}`, ftx(g.fizetendo), { forras: 'hivatalos', forrasUrl: adat.tetelek.gepjarmuado[g.ev]?.forras, al: `${d === 0 ? 'ugyanannyi, mint idén' : `${ftx(Math.abs(d))}-tal ${d < 0 ? 'kevesebb' : 'több'}, mint idén`}${kz ? `. A tételt a NAV ${datumNapon(kz)} tette közzé.` : ''}`, href: k.linkek.gjado(g.ev) });
  }
  if (!at.hiba) h += tetel('Átírás, ha most veszed meg', ftx(at.osszesen), { forras: 'hivatalos', forrasUrl: adat.tetelek.illetek?.[k.ev]?.forras, al: at.illetek.mentes ? 'illetékmentes, csak a vizsgálat és az okmányok' : `ebből illeték ${ftx(at.illetek.osszeg)}`, href: k.linkek.atiras });
  if (!km.hiba) h += tetel('100 km hivatali út', ftx(km.osszesen), { forras: 'hivatalos', forrasUrl: adat.uzemanyag?.forras, al: `${honapBan(lf.honap)}, NAV-áron, normaköltséggel`, href: k.linkek.km });
  h += '</ul>';
  return jelekkel(h);
}

/* ---------- Az autóm: minden egy lapon ---------- */
/** b: a mentett vagy beírt autó; k: { ev, ma, f } */
export function automPanel(adat, b, k) {
  const kw = Number(b.kw), gy = Number(b.gyartasiEv), hajtas = b.hajtas || 'benzin';
  if (!(kw > 0)) return hianyPanel('Add meg a teljesítményt (P.2).');
  if (!(gy > 1900)) return hianyPanel('Add meg a gyártási évet.');
  const gjH = hajtas === 'elektromos' ? 'elektromos' : hajtas === 'plugin' ? 'plugin' : 'hagyomanyos';
  const evek = Object.keys(adat.tetelek.gepjarmuado).map(Number).filter((e) => e >= k.ev).sort();
  const gjk = evek.map((ev) => S.gepjarmuado(adat, { ev, kw, gyartasiEv: gy, hajtas: gjH }));
  if (gjk[0]?.hiba) return hianyPanel(gjk[0].hiba);
  const fr = S.fenntartas(adat, { ev: k.ev, kw, gyartasiEv: gy, hajtas, fogyasztas: b.fogyasztas, km: b.km, biztositas: b.biztositas, szerviz: b.szerviz, gumi: b.gumi, egyeb: b.egyeb, ertek: b.ertek, f: k.f });
  const at = S.atiras(adat, { ev: k.ev, datum: k.ma, kw, gyartasiEv: gy, hajtas: hajtas === 'benzin' || hajtas === 'dizel' || hajtas === 'hibrid' ? 'hagyomanyos' : hajtas, szerzes: 'vetel' });
  const lf = S.legfrissebbHonap(adat);
  const uz = { benzin: 'benzin', dizel: 'dizel', hibrid: 'benzin', plugin: 'plugin', elektromos: 'elektromos' }[hajtas];
  const km = S.kikuldetes(adat, { km: 100, uzemanyag: uz, motor: 'benzin', cm3: Number(b.cm3) || 1598, ev: lf.ev, honap: lf.honap });
  const g0 = gjk[0];
  let h = fr.hiba
    ? vegosszeg(`Gépjárműadó, ${g0.ev}`, g0.fizetendo, 'Add meg a fogyasztást és az évi kilométert, és a havi költséget is kiszámoljuk.')
    : vegosszeg(b.nev ? `${esc(b.nev)}, havonta` : 'Az autód havonta', fr.havi, `Évente ${ftx(fr.ev)}, kilométerenként ${tized(fr.ftKm, 1)} Ft.`);
  h += '<ul class="tetelek">';
  // Egy sor: az idei adó, alatta a jövő évi (ha a NAV már közzétette), hogy ne tűnjön kétszer számoltnak
  const g1 = gjk[1] && !gjk[1].hiba ? gjk[1] : null;
  const kulonb = g1 && !g0.mentes && !g1.mentes ? g1.fizetendo - g0.fizetendo : null;
  const jovoSzoveg = g1 ? `${rag(g1.ev, 'ban', 'ben')} ${g1.mentes ? 'mentes' : ftx(g1.fizetendo)}${kulonb ? `, ${ftx(Math.abs(kulonb))}-tal ${kulonb < 0 ? 'kevesebb' : 'több'}` : kulonb === 0 ? ', ugyanannyi' : ''}` : '';
  h += tetel(`Gépjárműadó, ${g0.ev}`, g0.mentes ? 'mentes' : ftx(g0.fizetendo), { forras: 'hivatalos', forrasUrl: adat.tetelek.gepjarmuado[g0.ev]?.forras, al: g1 ? jovoSzoveg : 'határidő: április 15.' });
  if (!fr.hiba) {
    h += tetel('Tényleges kiadás havonta', ftx((fr.ev - fr.ertekvesztes) / 12), { forras: 'sajat', al: 'üzemanyag, biztosítás, szerviz, gumi, adó' });
    if (fr.ertekvesztes > 0) h += tetel('Értékvesztés havonta', ftx(fr.ertekvesztes / 12), { forras: fr.ertekBecsles ? 'becsles' : 'sajat', al: fr.ertekBecsles ? `évi ${tized(fr.ertekEvi, 1)}%, ${nevelo(HAJTAS_NEV[hajtas])} ${HAJTAS_NEV[hajtas]} autók átlaga (DAT, KSH), nem garantált` : 'ennyit veszít az autó az értékéből' });
    h += tetel('Minden további kilométer', `${tized(fr.plusKm, 1)}&nbsp;Ft`, { al: 'energia, szerviz, gumi' });
  }
  if (!at.hiba) h += tetel('Ha eladod: a vevő átírási költsége', ftx(at.osszesen), { forras: 'hivatalos', forrasUrl: adat.tetelek.illetek?.[k.ev]?.forras, al: 'a vevő ennyit fizet a vételár mellé' });
  if (!km.hiba) h += tetel('100 km hivatali út térítése', ftx(km.osszesen), { forras: 'hivatalos', forrasUrl: adat.uzemanyag?.forras, al: `${honapBan(lf.honap)}, NAV-áron` });
  h += '</ul>';
  return jelekkel(h);
}

/* ---------- Üres állapot ---------- */
export function uresPanel(mi) {
  return `<div class="ures"><p class="ures-cim">Itt lesz az elszámolás.</p><p>${mi}</p><ul class="tetelek ures-sorok" aria-hidden="true"><li><span></span><span></span></li><li><span></span><span></span></li><li><span></span><span></span></li></ul></div>`;
}
/** Felirat a minta-eredmény fölött: világos, hogy nem a látogató autója. */
export const mintaJelzes = (leiras, kerd = 'Írd be a saját autódat, és a minta helyett azzal számolunk.') => `<p class="minta-jelzes"><strong>Minta:</strong> ${esc(leiras)}. ${esc(kerd)}</p>`;
// „Add meg…”, „Válaszd ki…”: hiányzó adat. Minden más üzenet (tartomány, ellentmondás) a beírt adat ellenőrzését kéri.
export const hianyPanel = (uz) => `<div class="ures"><p class="ures-cim">${/^([^.]*: )?(add meg|válaszd|válassz|írd be|töltsd ki|hiányzik)/i.test(uz) ? 'Még egy adat hiányzik.' : 'Ellenőrizd a beírt adatot.'}</p><p>${esc(uz)}</p></div>`;

/* ---------- Benzines vagy villany ---------- */
const mFt = (x) => (Math.abs(x) >= 1e6 ? `${tized(x / 1e6, 1)} M Ft` : `${fmt(x / 1e3)} E Ft`);
const HAJTAS_NEV = { benzin: 'benzines', dizel: 'dízeles', hibrid: 'hibrid', plugin: 'plug-in hibrid', elektromos: 'elektromos' };

/** Halmozott költség két autóra, havi lépésben; a vonalak megrajzolódnak, a metszéspontot jelöljük. */
export function koltsegGrafikon(r, szeles = 640) {
  const W = Math.max(320, Math.min(720, Math.round(szeles))), H = W < 480 ? 250 : 280, bal = W < 480 ? 44 : 58, jobb = 16, fent = 30, lent = 34;
  const N = r.evek * 12;
  const max = Math.max(...r.autok.flatMap((a) => a.havi)) * 1.08;
  const x = (m) => bal + (m / N) * (W - bal - jobb);
  const y = (v) => fent + (1 - v / max) * (H - fent - lent);
  const lepes = max > 12e6 ? 4e6 : max > 6e6 ? 2e6 : max > 3e6 ? 1e6 : 5e5;
  let racs = '';
  for (let v = 0; v <= max; v += lepes) racs += `<line x1="${bal}" x2="${W - jobb}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="g-racs"/><text x="${bal - 8}" y="${(y(v) + 4).toFixed(1)}" class="g-cimke" text-anchor="end">${v === 0 ? '0' : mFt(v)}</text>`;
  const evLepes = r.evek > (W < 480 ? 5 : 8) ? 2 : 1;
  for (let e = 0; e <= r.evek; e += evLepes) racs += `<text x="${x(e * 12).toFixed(1)}" y="${H - 12}" class="g-cimke" text-anchor="middle">${e === 0 ? 'ma' : `${e}. év`}</text>`;
  const ut = (a) => a.havi.map((v, m) => `${m ? 'L' : 'M'}${x(m).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const vonalak = r.autok.map((a, i) => `<path d="${ut(a)}" class="g-vonal g-${i ? 'b' : 'a'}" pathLength="1"/>`).join('');
  // Közvetlen címkék a vonalak végén. A felső a vonala fölé, az alsó alá kerül,
  // legalább 18 egységnyi távolsággal, hogy ne takarják egymást.
  const vegek = r.autok.map((a, i) => ({ i, y: y(a.havi[N]), nev: a.nev })).sort((p, q) => p.y - q.y);
  const fy = Math.max(fent - 8, vegek[0].y - 10);
  const ay = Math.min(H - lent - 6, Math.max(vegek[1].y + 20, fy + 18));
  // Keskeny grafikonon a jelmagyarázat elég, a végcímkék csak zsúfolnának.
  const cimkek = W < 480 ? '' : vegek.map((v, j) => `<text x="${W - jobb}" y="${(j === 0 ? fy : ay).toFixed(1)}" text-anchor="end" class="g-nev g-${v.i ? 'b' : 'a'}-szoveg">${esc(v.nev)}</text>`).join('');
  let jel = '';
  if (r.megterul) {
    const m = r.megterul.honap, v = r.autok[r.megterul.auto].havi[m];
    const px = x(m), py = y(v);
    // A metszéspont előtt a vonalak lejjebb futnak, utána feljebb: a felirat balra fölé, vagy (ha a pont a bal szélen van) jobbra alá kerül.
    const balra = px > bal + (W - bal - jobb) * 0.35;
    const tx = balra ? px - 12 : px + 12, ty = balra ? Math.max(fent + 12, py - 14) : py + 24;
    jel = `<g class="g-jel"><line x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${fent}" y2="${H - lent}" class="g-jel-vonal"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6" class="g-jel-pont"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${balra ? 'end' : 'start'}" class="g-jel-szoveg">${tized(m / 12, 1)} év után megtérül</text></g>`;
  }
  const leiras = r.autok.map((a) => `${a.nev}: ${r.evek} év alatt ${fmt(a.osszesen)} Ft`).join('; ');
  return `<figure class="grafikon"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Halmozott költség évek szerint. ${esc(leiras)}" data-honapok="${N}" data-bal="${bal}" data-jobb="${jobb}" data-w="${W}">${racs}${vonalak}${jel}${cimkek}<line class="g-mutato" x1="0" x2="0" y1="${fent}" y2="${H - lent}" visibility="hidden"/></svg><div class="g-tipp" hidden></div>
<figcaption><span class="g-jelmagyarazat"><i class="g-a"></i>${esc(r.autok[0].nev)}</span><span class="g-jelmagyarazat"><i class="g-b"></i>${esc(r.autok[1].nev)}</span><span class="halk">Halmozott költség: értékvesztés, energia, adók, szerviz és biztosítás.</span></figcaption></figure>`;
}

/** Határozott névelő egy szabadon beírt név elé: az Opel, a Skoda, az 5008. */
export function nevelo(nev) {
  const t = String(nev).trim().toLowerCase();
  return /^([aáeéiíoóöőuúüű]|5|1(?!\d)|1\d{3}(?!\d)|1\d{6}(?!\d))/.test(t) ? 'az' : 'a';
}
const nevvel = (nev, nagy = false) => { const n = nevelo(nev); return `${nagy ? n[0].toUpperCase() + n.slice(1) : n} ${esc(nev)}`; };

export function osszehasonlitasPanel(adat, r, { szeles = 640 } = {}) {
  if (r.hiba) return hianyPanel(r.hiba);
  const [A, B] = r.autok;
  const o = r.autok[r.olcsobb], d = r.autok[1 - r.olcsobb];
  const mt = r.megterul ? r.autok[r.megterul.auto] : null;
  let h = `<div class="itelet"><div class="vegosszeg"><span class="mi">${r.evek} év és ${fmt(r.km * r.evek)} km alatt</span><span class="mennyi" data-osszeg="${Math.round(r.kulonbseg)}"><span class="ertek">${fmt(r.kulonbseg)}</span><span class="ft">Ft</span></span><p class="megj">ennyivel olcsóbb ${nevvel(o.nev)} (${HAJTAS_NEV[o.hajtas]}), mint ${nevvel(d.nev)}. Összesen: ${esc(A.nev)} ${ftx(A.osszesen)}, ${esc(B.nev)} ${ftx(B.osszesen)}.</p></div>${mt ? `<div class="megterules"><span class="mi">Megtérülés</span><span class="mennyi-kozep">${tized(r.megterul.honap / 12, 1)} év</span><p class="megj">ennyi idő alatt hozza vissza ${nevvel(mt.nev)} a drágább vételárat, a megadott árakkal és használattal.</p></div>` : ''}</div>`;
  h += koltsegGrafikon(r, szeles);
  if (r.f) {
    const f = r.f, vanVillany = r.autok.some((x) => x.hajtas === 'elektromos' || x.hajtas === 'plugin'), vanUz = r.autok.some((x) => x.hajtas !== 'elektromos');
    const reszek = [];
    if (vanUz) reszek.push(`benzin ${fmt(f.benzin)} Ft/l, dízel ${fmt(f.dizel)} Ft/l ${jel('hivatalos')}`);
    if (vanVillany) reszek.push(`otthoni áram átlagosan ${tized(r.autok.find((x) => x.otthoniAr)?.otthoniAr || f.aram_piaci, 1)} Ft/kWh, nyilvános töltő ${fmt(f.tolto)} Ft/kWh ${jel('becsles')}`);
    reszek.push(`értékvesztés ${r.sajatEladas?.every(Boolean) ? 'a megadott eladási árakból ' + jel('sajat') : 'a DAT és a KSH átlagaiból ' + jel('becsles')}`);
    h += `<p class="felteves-sor"><strong>Ezekkel számoltunk:</strong> ${reszek.join('; ')}. Az „Árak és feltevések” résznél átírhatod őket.</p>`;
  }
  // Rövid táv: havonta és 100 km-en
  const maxSzaz = Math.max(A.szaz, B.szaz) || 1;
  h += sorfejek(`<div class="ket-oszlop"><section><h3>Havonta, ha ma veszed</h3><table class="tabla kompakt"><thead><tr><th><span class="sr-csak">Tétel</span></th><th>${esc(A.nev)}</th><th>${esc(B.nev)}</th></tr></thead><tbody>
<tr><td>${A.hajtas === 'elektromos' && B.hajtas === 'elektromos' ? 'Töltés' : 'Üzemanyag, töltés'} ${jel('sajat')}</td><td>${ftx(A.energiaHavi)}</td><td>${ftx(B.energiaHavi)}</td></tr>
<tr><td>Gépjárműadó ${jel('hivatalos')}</td><td>${ftx(A.gjElso / 12)}</td><td>${ftx(B.gjElso / 12)}</td></tr>
${A.cegElso || B.cegElso ? `<tr><td>Cégautóadó ${jel('hivatalos')}</td><td>${ftx(A.cegElso / 12)}</td><td>${ftx(B.cegElso / 12)}</td></tr>` : ''}
<tr><td>Szerviz, biztosítás ${jel('sajat')}</td><td>${ftx(A.fixHavi)}</td><td>${ftx(B.fixHavi)}</td></tr>
<tr class="osszeg"><td>Havi kiadás</td><td>${ftx(A.futoHavi)}</td><td>${ftx(B.futoHavi)}</td></tr>
</tbody><caption>Az értékvesztés nélkül: ezt fizeted ki havonta.</caption></table></section>
<section><h3>100 kilométer energiája</h3><div class="savok">${r.autok.map((a, i) => `<div class="sav-sor"><span class="sav-nev">${esc(a.nev)}</span><span class="sav-sin"><span class="sav-toltes g-${i ? 'b' : 'a'}-hatter" style="--arany:${(a.szaz / maxSzaz).toFixed(3)}"></span></span><span class="sav-ertek">${ftx(a.szaz)}</span></div>`).join('')}</div>
${r.autok.some((a) => a.hajtas === 'elektromos' || a.hajtas === 'plugin') ? `<p class="kicsi halk">Otthoni áram átlagosan ${tized((r.autok.find((a) => a.otthoniAr)?.otthoniAr) || 0, 1)} Ft/kWh a 2523 kWh-s sávhatárral, ${fmt(r.autok.find((a) => a.kwhEv)?.kwhEv || 0)} kWh töltés évente, a töltési veszteséggel együtt.</p>` : ''}</section></div>`);
  // Hosszú táv tételesen
  const sor = (nev, kulcs, cls = '', f = '') => `<tr class="${cls}"><td>${nev}${f ? ` ${jel(f)}` : ''}</td>${r.autok.map((a) => `<td>${ftx(a[kulcs])}</td>`).join('')}</tr>`;
  const eladasJel = r.sajatEladas?.every(Boolean) ? 'sajat' : 'becsles';
  h += sorfejek(`<section class="hosszu"><h3>${r.evek} év alatt tételesen</h3><table class="tabla kompakt"><thead><tr><th><span class="sr-csak">Tétel</span></th>${r.autok.map((a) => `<th>${esc(a.nev)}</th>`).join('')}</tr></thead><tbody>
${sor('Vételár', 'ar', '', 'sajat')}${sor(`Eladási ár ${r.evek} év múlva`, 'eladas', '', eladasJel)}${sor('Értékvesztés', 'ertekvesztes', 'kiemelt-sor', eladasJel)}${sor('Üzemanyag, töltés', 'energia', '', 'sajat')}${sor('Illeték, gépjárműadó' + (r.autok.some((a) => a.cegOssz) ? ', cégautóadó' : ''), 'adok', '', 'hivatalos')}${sor('Szerviz, biztosítás', 'fixOssz', '', 'sajat')}
<tr class="osszeg"><td>Összesen</td>${r.autok.map((a) => `<td>${ftx(a.osszesen)}</td>`).join('')}</tr>
<tr><td>Kilométerenként</td>${r.autok.map((a) => `<td>${tized(a.ftKm, 1)} Ft</td>`).join('')}</tr>
</tbody></table></section>`);
  if (r.hatarKm) {
    const olcsobbKm = B.energia < A.energia ? B : A, masik = olcsobbKm === A ? B : A;
    h += `<p class="megjegyzes">Ha évente ${fmt(Math.ceil(r.hatarKm / 500) * 500)} km-nél többet jársz, ${r.evek} év alatt ${nevvel(olcsobbKm.nev)} jön ki olcsóbban. Ha kevesebbet, ${nevvel(masik.nev)}.</p>`;
  }
  return jelekkel(h);
}

/* ---------- Fenntartás ---------- */
export function fenntartasPanel(adat, r, b = {}) {
  if (r.hiba) return hianyPanel(r.hiba);
  const max = Math.max(...r.tetelek.map((t) => t.ev)) || 1;
  const kiadas = r.ev - r.ertekvesztes;
  let h = vegosszeg('Az autód havonta', r.havi, r.ertekvesztes > 0
    ? `Ebből ${ftx(kiadas / 12)} a tényleges kiadás, ${ftx(r.ertekvesztes / 12)} az értékvesztés. Évente ${ftx(r.ev)}, kilométerenként ${tized(r.ftKm, 1)} Ft.`
    : `Évente ${ftx(r.ev)}, kilométerenként ${tized(r.ftKm, 1)} Ft.`);
  h += '<ul class="tetelek">';
  h += tetel('Használattól függ', ftx(r.hasznalat / 12), { al: 'üzemanyag vagy töltés, szerviz, gumi' });
  h += tetel('Akkor is fizeted, ha az autó áll', ftx(r.allo / 12), { al: 'biztosítás, gépjárműadó, egyéb' });
  if (r.ertekvesztes > 0) h += tetel('Értékvesztés', ftx(r.ertekvesztes / 12), { al: r.ertekBecsles ? `a mostani értékből, évi ${tized(r.ertekEvi, 1)}%-kal: ${nevelo(HAJTAS_NEV[b.hajtas || 'benzin'])} ${HAJTAS_NEV[b.hajtas || 'benzin']} autók átlaga (DAT, KSH), nem a te autód garantált értékvesztése` : 'a megadott eladási árból' });
  h += '</ul>';
  const forras = { energia: 'sajat', biztositas: 'sajat', szerviz: 'sajat', gumi: 'sajat', egyeb: 'sajat', gjado: 'hivatalos', ertekvesztes: r.ertekBecsles ? 'becsles' : 'sajat' };
  h += `<div class="savok">${r.tetelek.filter((t) => t.ev > 0).sort((a, c) => c.ev - a.ev).map((t) => `<div class="sav-sor"><span class="sav-nev">${t.nev} ${jel(forras[t.kulcs], t.kulcs === 'gjado' ? adat.tetelek.gepjarmuado?.[r.gj?.ev]?.forras : '')}</span><span class="sav-sin"><span class="sav-toltes" style="--arany:${(t.ev / max).toFixed(3)}"></span></span><span class="sav-ertek">${ftx(t.ev / 12)}</span></div>`).join('')}</div>`;
  h += `<p class="igy">Minden további kilométer nagyjából <strong>${tized(r.plusKm, 1)} Ft-tal</strong> növeli a költséget (energia, szerviz, gumi). A többi tételt akkor is fizeted, ha az autó áll.</p>`;
  if (r.gj?.mentes) h += megjegyzes(r.gj.mentes);
  return jelekkel(h);
}

/* ---------- Adásvételi szerződés ---------- */
const pont = (v, hossz = 24) => (v ? esc(v) : `<span class="kitoltendo" style="--h:${hossz}ch"></span>`);
export function szerzodes(adat, d) {
  const ar = Number(d.vetelar) || 0;
  const n = adat.szabalyok.adasvetel;
  const dt = (iso) => (iso ? datumHu(iso) : pont('', 18));
  const fel = (p) => `<p><b>${esc(p === 'e' ? 'Eladó' : 'Vevő')}:</b> ${pont(d[p + 'Nev'])}, született ${pont(d[p + 'SzulHely'], 14)}, ${dt(d[p + 'SzulIdo'])}, anyja neve: ${pont(d[p + 'Anyja'])}, lakcím: ${pont(d[p + 'Cim'], 34)}, személyazonosító okmány száma: ${pont(d[p + 'Okmany'], 12)}.</p>`;
  return `<article class="szerzodes-lap" tabindex="0" aria-label="A kész szerződés előnézete">
<h2>Gépjármű-adásvételi szerződés</h2>
<p class="kozep">amely létrejött az alábbi felek között:</p>
${fel('e')}${fel('v')}
<h3>1. A szerződés tárgya</h3>
<p>Az eladó eladja, a vevő megvásárolja az alábbi személygépkocsit: gyártmány és típus: ${pont(d.tipus)}, rendszám: ${pont(d.rendszam, 9)}, alvázszám: ${pont(d.alvaz, 17)}, motorszám: ${pont(d.motor, 14)}, első forgalomba helyezés: ${dt(d.elsoForgalom)}, forgalmi engedély száma: ${pont(d.forgalmi, 10)}, törzskönyv száma: ${d.torzskonyvNincs ? 'a törzskönyv nincs meg, a vevő ezt tudomásul veszi' : pont(d.torzskonyv, 12)}. A kilométer-számláló állása az átadáskor: ${d.km ? `${fmt(d.km)} km` : pont('', 10)}.</p>
<h3>2. A vételár</h3>
<p>A vételár ${ar ? `<b>${fmt(ar)} Ft</b>, azaz ${betuvelElso(ar)} forint` : `${pont('', 12)} Ft, azaz ${pont('', 30)} forint`}, amelyet a vevő ${d.fizetes === 'atutalas' ? 'banki átutalással' : 'készpénzben'} fizet meg ${d.fizetes === 'atutalas' ? 'az eladó által megadott bankszámlára' : 'az eladónak, aki annak átvételét aláírásával elismeri'}.</p>
<h3>3. Birtokba adás és tulajdonjog</h3>
<p>Az eladó az autót ${dt(d.atadas)} napján adja a vevő birtokába, a forgalmi engedéllyel${d.torzskonyvNincs ? '' : ', a törzskönyvvel'} és az összes kulccsal együtt. A tulajdonjog-változás hatálybalépésének napja: ${dt(d.tulajdon || d.atadas)}. A birtokba adástól a kárveszély a vevőt terheli.</p>
<h3>4. Az autó állapota</h3>
<p>A vevő az autót ${d.probaut ? 'megtekintette és kipróbálta' : 'megtekintette'}, állapotát ismeri, és ebben az állapotban veszi meg. Az eladó kijelenti, hogy az autó rejtett hibájáról nem tud${d.eredetiseg ? ', és az eredetiségvizsgálat megtörtént' : ''}.</p>
<h3>5. Az eladó nyilatkozatai</h3>
<p>Az eladó kijelenti, hogy az autó a kizárólagos tulajdona, per-, igény- és tehermentes. A felek kijelentik, hogy az autó nem tartozik bizalmi vagyonkezelés alapján fennálló kezelt vagyonba.</p>
<h3>6. Bejelentés, átírás, költségek</h3>
<p>Az eladó vállalja, hogy a tulajdonjog változását ${n.elado_bejelentes_nap} napon belül bejelenti a közlekedési igazgatási hatóságnál. A vevő vállalja, hogy ${n.vevo_atiras_nap} napon belül kezdeményezi a tulajdonjog bejegyzését, és viseli az átírás költségeit, az illetéket is. A vevő legkésőbb a birtokba vétel napján megköti a kötelező gépjármű-felelősségbiztosítást.</p>
<h3>7. Egyéb</h3>
<p>A szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyvről szóló 2013. évi V. törvény rendelkezései az irányadók. A szerződés négy eredeti példányban készült, amelyekből kettő az eladót, kettő a vevőt illeti.</p>
<p class="kelt">Kelt: ${pont(d.keltHely, 14)}, ${dt(d.keltDatum)}</p>
<div class="alairasok"><div><span></span>eladó</div><div><span></span>vevő</div></div>
<p class="kozep">Előttünk mint tanúk előtt:</p>
<div class="tanuk">${[1, 2].map((i) => `<div><p>${i}. tanú neve: <span class="kitoltendo" style="--h:22ch"></span></p><p>lakcíme: <span class="kitoltendo" style="--h:26ch"></span></p><p>személyazonosító okmány: <span class="kitoltendo" style="--h:16ch"></span></p><p>aláírása: <span class="kitoltendo" style="--h:22ch"></span></p></div>`).join('')}</div>
</article>`;
}
function betuvelElso(n) { return S.betuvel(n); }

/* ---------- Plug-in hibrid 2027 ---------- */
export function phevPanel(adat, r, ma = '') {
  if (r.hiba) return hianyPanel(r.hiba);
  const p = adat.szabalyok.phev, [a, c] = r.evek;
  const gjUrl = (ev) => adat.tetelek.gepjarmuado[ev]?.forras;
  const cegUrl = adat.tetelek.cegautoado?.[2027]?.forras;
  let h = vegosszeg('2027-től évente', r.ev2027, r.ev2027 === r.kulonbseg && r.kulonbseg > 0 ? 'Ez mind új kiadás: 2026-ban ezekért nem fizettél.' : r.kulonbseg > 0 ? `Ez ${ftx(r.kulonbseg)}-tal több, mint amennyit 2026-ban rendszeresen fizettél.` : r.kulonbseg < 0 ? `Ez ${ftx(-r.kulonbseg)}-tal kevesebb, mint amennyit 2026-ban rendszeresen fizettél.` : 'Ugyanannyi, mint 2026-ban.');
  h += '<ul class="tetelek">';
  h += tetel('Gépjárműadó, 2027', ftx(c.gj.fizetendo), { forras: 'hivatalos', forrasUrl: gjUrl(2027), al: `${fmt(r.kw)} kW × ${c.gj.ftKw} Ft/kW. 2026-ban ${a.gj.mentes ? 'mentes' : ftx(a.gj.fizetendo)}` });
  if (r.ceges) h += tetel('Cégautóadó, 2027', ftx(c.ceg), { forras: 'hivatalos', forrasUrl: cegUrl, al: `havi ${ftx(c.cegHavi)} × 12, a gépjárműadóval csökkentve. 2026-ban ${a.cegMentes ? 'mentes' : ftx(a.ceg)}` });
  if (r.zold && r.park) h += tetel('Parkolás Budapesten, 2027', ftx(c.parkolas), { forras: 'sajat', al: `havi ${ftx(r.park)}. A rendszámcsere után, 2026 decemberétől már fizetős` });
  h += tetel('Évente összesen', ftx(r.ev2027), { cls: 'vegso' });
  h += '</ul>';
  if (r.zold) {
    h += '<ul class="tetelek masodik">';
    h += tetel('Rendszámcsere, egyszer', ftx(p.rendszam_uj_karakter_ft), { forras: 'hivatalos', forrasUrl: p.forrasok[1]?.url, al: `új karakterekkel. Ha a régi rendszámot tartod meg, ${ftx(p.rendszam_azonos_karakter_ft)}` });
    h += '</ul>';
  }
  h = jelekkel(h);
  if (r.zold && (!ma || ma <= p.rendszam_hatarido)) h += megjegyzes(`A zöld rendszámot ${datumIg(p.rendszam_hatarido)} le kell cserélni fehérre. Utána az autóval zöld rendszámmal nem lehet közlekedni.`, 'figyelem');
  if (r.regi) h += megjegyzes('A 2025 előtt forgalomba helyezett plug-in hibridek adómentessége 2026. december 31-én lejár. 2027-ben a NAV márciusban küldi az első határozatot, a befizetés határideje április 15.');
  return h;
}

/* ---------- Autópálya-matrica ---------- */
export function matricaPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  const m = adat.szabalyok.matrica, d = S.matricaEv(adat, r.ev).d1;
  let h = vegosszeg(`Neked ez a legolcsóbb ${rag(r.ev, 'ban', 'ben')}`, r.legjobb.ft, `${esc(r.legjobb.nev)}. ${r.megtakaritas > 0 ? `${ftx(r.megtakaritas)}-tal olcsóbb, mint a másik lehetőség.` : 'A két lehetőség ugyanannyiba kerül.'}`);
  h += '<ul class="tetelek">';
  for (const l of r.lehetosegek) h += tetel(esc(l.nev), ftx(l.ft), { forras: 'hivatalos', forrasUrl: m.forrasok[0]?.url, al: esc(l.al), cls: l === r.legjobb ? 'kiemelt-sor' : '' });
  h += '</ul>';
  h = jelekkel(h);
  h += `<p class="igy">Az éves országos matrica (${ftx(d.eves)}) akkor éri meg, ha egy évben legalább <strong>${r.hatar.napi} napi</strong>, <strong>${r.hatar.tiznapos} tíznapos</strong> vagy <strong>${r.hatar.havi} havi</strong> matricát vennél helyette, vagy ha <strong>${r.hatar.varmegyei} vármegyében</strong> autópályázol rendszeresen.</p>`;
  const kov = m.evek[r.ev + 1];
  h += megjegyzes(`${r.ev}. évi díjakkal számolunk. A ${r.ev}. évi éves matrica ${r.ev + 1}. január 31-ig érvényes.${kov ? ` A ${r.ev + 1}. évi díjak már ismertek: az éves országos ${ftx(kov.d1.eves)} lesz, fent átválthatsz rá.` : ''}`);
  return h;
}

/* ---------- Autóvásárlás hitelből ---------- */
export function hitelPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  const h0 = adat.szabalyok.hitel;
  let h = vegosszeg('Becsült havi törlesztő', r.havi, `${tized(r.evek, 1)} évig, ${tized(r.thm, 2)}% THM-mel számolva. Összesen nagyjából ${ftx(r.visszafizet)}-ot fizetsz vissza. A bank a törlesztőt az ügyleti kamatból számolja. A THM a díjakat is tartalmazza, ezért ez a becslés általában kicsit magasabb a szerződésben szereplő részletnél.`);
  h += '<ul class="tetelek">';
  h += tetel('Vételár', ftx(r.ar), { forras: 'sajat' });
  h += tetel('Önerő', `−${ftx(r.onero)}`, { cls: 'levonas', forras: 'sajat', al: `a vételár ${tized(100 - r.hfm, 0)}%-a` });
  h += tetel('Hitelösszeg', ftx(r.hitel), { al: `a vételár ${tized(r.hfm, 0)}%-a` });
  h += tetel('Kamat és díjak a futamidő alatt', ftx(r.kamat), { forras: 'sajat', al: `${r.honapok} × ${ftx(r.havi)} − a hitelösszeg` });
  h += '</ul>';
  h += '<ul class="tetelek masodik">';
  h += tetel('Önerő és törlesztők', ftx(r.onero + r.visszafizet));
  if (r.atirasFt) h += tetel('Átírás', ftx(r.atirasFt), { forras: 'hivatalos', forrasUrl: adat.tetelek.illetek?.[r.at?.illetek?.ev]?.forras, al: 'illeték, vizsgálat, okmányok' });
  if (r.ertekVeg != null) h += tetel(`Amennyit az autó ${tized(r.evek, 1)} év múlva ér`, `−${ftx(r.ertekVeg)}`, { cls: 'levonas', forras: 'becsles', al: 'átlagos értékvesztéssel' });
  h += tetel(r.ertekVeg != null ? 'Az autó valódi költsége a futamidő alatt' : 'Összesen', ftx(r.valodi), { cls: 'vegso', al: r.ertekVeg != null ? `havonta nagyjából ${ftx(r.valodiHavi)}, üzemanyag és biztosítás nélkül` : '' });
  h += '</ul>';
  h = jelekkel(h);
  if (r.hfmTul) h += megjegyzes(`A hitel a vételár ${tized(r.hfm, 0)}%-a. Az MNB szabálya szerint forintban felvett autóhitelnél ez legfeljebb ${h0.hfm_hitel}%, ${r.hfmLizingTul ? `pénzügyi lízingnél ${h0.hfm_lizing}% lehet. Ehhez több önerő kell.` : `pénzügyi lízingnél ${h0.hfm_lizing}%. Hitelhez több önerő kell, lízinggel ennyi is elég lehet.`}`, 'figyelem');
  if (r.ertekVeg == null) h += megjegyzes('Add meg a gyártási évet is, és megmutatjuk, mennyit ér az autó a futamidő végén, és mennyibe kerül valójában.');
  return h;
}

/* ---------- Kötelező biztosítás ---------- */
const HET = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const datumI = (iso) => datumHu(iso).replace(/\.$/, '-i');
const napNev = (iso) => HET[new Date(`${iso}T12:00:00Z`).getUTCDay()];
export function kgfbPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  const k = adat.szabalyok.kgfb, mnb = k.forrasok[0]?.url;
  let h = '';
  if (r.elkesett) {
    h += `<div class="vegosszeg"><span class="mi">Erre az évfordulóra már nem válthatsz</span><span class="mennyi datum-nagy">${datumHu(r.kovetkezoFelmondas)}</span><p class="megj">A ${datumI(r.kezdet)} évfordulóhoz ${datumHu(r.felmondas)} volt a felmondás határideje. Legközelebb eddig mondhatod fel, ha a ${datumI(r.kovetkezo)} évfordulótól váltanál.</p></div>`;
  } else {
    h += `<div class="vegosszeg"><span class="mi">A felmondásnak eddig kell beérkeznie</span><span class="mennyi datum-nagy">${datumHu(r.felmondas)}</span><p class="megj">${r.hatra === 0 ? `Ez ma van (${napNev(r.felmondas)}).` : `Még ${r.hatra} napod van, a határidő ${napNev(r.felmondas)}i nap.`} Az új biztosítási időszak ${datumNapon(r.kezdet)} kezdődik.</p></div>`;
  }
  h += '<ul class="tetelek">';
  h += tetel('A biztosító díjértesítője', `legkésőbb ${datumHu(r.ertesites)}`, { forras: 'hivatalos', forrasUrl: mnb, al: 'ebben látod a jövő évi díjat' });
  h += tetel('Új ajánlatot leghamarabb', datumHu(r.ajanlat), { forras: 'hivatalos', forrasUrl: k.forrasok[1]?.url, al: 'az új időszak kezdete előtt 60 nappal' });
  h += tetel('A régi szerződés felmondása', `beérkezik ${datumHu(r.felmondas)}`, { forras: 'hivatalos', forrasUrl: mnb, al: 'írásban, a biztosítóhoz' });
  h += tetel('Az új szerződés kezdete', datumHu(r.kezdet), { cls: 'vegso' });
  h += '</ul>';
  if (r.bm && !r.bm.hiba) {
    const b = r.bm;
    h += '<ul class="tetelek masodik">';
    h += tetel('Bonus-malus osztály most', b.most, { forras: 'sajat' });
    h += tetel(`Jövőre${b.karok ? `, ${b.karok} károkozással` : ', kármentesen'}`, b.uj, { forras: 'hivatalos', forrasUrl: k.forrasok[2]?.url, al: b.valtozas > 0 ? 'eggyel jobb osztály' : b.valtozas < 0 ? `${-b.valtozas} osztállyal rosszabb` : b.karok ? 'a legrosszabb osztály marad' : (b.nap270 ? 'a legjobb osztály marad' : 'nem javul, mert a szerződés 270 napnál rövidebb ideig élt'), cls: 'vegso' });
    h += '</ul>';
  }
  h = jelekkel(h);
  if (!r.elkesett && r.hetvege) h += megjegyzes(`A határidő hétvégére esik. A felmondásnak addig be kell érkeznie, ezért küldd el néhány nappal korábban: postán ajánlottan, tértivevénnyel, vagy a biztosító online felületén.`, 'figyelem');
  h += megjegyzes('A régi szerződést ne hagyd díjnemfizetéssel megszűnni: ha az évforduló előtt így szűnik meg, az új biztosítónál kötött szerződés sem lesz érvényes.');
  return h;
}

/* ---------- Megjavítsam vagy cseréljem? ---------- */
export function javitasPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  const tart = r.olcsobb === 'tart';
  let h = vegosszeg(tart ? 'A javítás olcsóbb ennyivel' : 'A csere olcsóbb ennyivel', r.kulonbseg, `${r.evek} év alatt, ha mindkét autó végén számolunk az eladási árral. Havonta nagyjából ${ftx(r.kulonbseg / (r.evek * 12))}.`);
  h += `<h3 class="panel-cim">Megjavítom és megtartom</h3><ul class="tetelek">`;
  h += tetel('Javítás', ftx(r.tart.javitas), { forras: 'sajat' });
  h += tetel(`Fenntartás ${r.evek} évig`, ftx(r.tart.fenntartas), { forras: 'sajat' });
  h += tetel(`Amennyit ${r.evek} év múlva ér`, `−${ftx(r.tart.vegErtek)}`, { cls: 'levonas', forras: 'becsles', al: r.ertekJavitvaBecsles ? 'megjavítva a mostani érték plusz a javítás, utána átlagos értékvesztés' : 'a megjavított értékből, átlagos értékvesztéssel' });
  h += tetel('Összesen', ftx(r.tart.osszes), { cls: 'vegso' });
  h += `</ul><h3 class="panel-cim">Eladom, és másikat veszek</h3><ul class="tetelek">`;
  h += tetel('Vételár mínusz a mostani autó ára', ftx(r.csere.kulonbozet), { forras: 'sajat', al: `${ftx(r.ar)} − ${ftx(r.ertekMost)}` });
  if (r.csere.atiras) h += tetel('Átírás', ftx(r.csere.atiras), { forras: 'hivatalos', al: 'illeték, vizsgálat, okmányok' });
  h += tetel(`Fenntartás ${r.evek} évig`, ftx(r.csere.fenntartas), { forras: 'sajat' });
  h += tetel(`Amennyit ${r.evek} év múlva ér`, `−${ftx(r.csere.vegErtek)}`, { cls: 'levonas', forras: 'becsles', al: 'átlagos értékvesztéssel' });
  h += tetel('Összesen', ftx(r.csere.osszes), { cls: 'vegso' });
  h += '</ul>';
  h = jelekkel(h);
  if (r.fordulo != null) {
    const f = Math.round(r.fordulo / 10000) * 10000;
    const mondat = f <= 0
      ? 'A javítás akkor is olcsóbb, ha a megjavított autó szinte semmit sem ér.'
      : `A javítás akkor olcsóbb, ha megjavítva legalább ${ftx(f)}-ot ér. Most ${ftx(r.ertekJavitva)}-tal számoltunk${r.ertekJavitvaBecsles ? ', ami a mostani érték és a javítás összege: ez inkább felső becslés, mert a javítás ritkán növeli teljes összegével az eladási árat. Írd be a hasonló hirdetések alapján, mennyit érne megjavítva' : ''}.`;
    h += `<p class="igy"><strong>A döntő szám a megjavított autó értéke.</strong> ${mondat}</p>`;
  }
  h += megjegyzes('Nem számol a kockázattal: egy régi autónál a következő nagy javítás bármikor jöhet, egy másik használt autónál pedig rejtett hiba lehet. Ha bizonytalan vagy, a régi autó éves fenntartását számold bőkezűbben.');
  return h;
}

/* ---------- Vállalkozóknak: cégautóadó ---------- */
/** Benyújtott, még el nem fogadott törvényjavaslat a cégautóadóról: figyelmeztetés a 2027-es számokhoz. */
export function javaslatMegj(adat, ev, kw, levonas) {
  const j = adat.szabalyok.vallalkozo?.cegauto_javaslat;
  if (!j || j.allapot === 'elfogadva' || ev < j.ev) return '';
  const r = [];
  if (kw > j.kw_hatar) r.push(`a ${j.kw_hatar} kW feletti sávot négy sávra bontaná, és az erősebb autók tétele jelentősen nőne (a 250 kW feletti, régebbi besorolású autóké például havi ${ftx(j.pelda_250kw_felett_regi_ft)} lenne)`);
  if (levonas) r.push(r.length ? 'a gépjárműadót pedig adózónként csak egy választott autónál engedné levonni' : 'a gépjárműadót adózónként csak egy választott autónál engedné levonni');
  if (!r.length) return '';
  return megjegyzes(`<strong>Változhat:</strong> a ${datumNapon(j.benyujtva)} benyújtott törvényjavaslat ${rag(j.ev, 'tól', 'től')} ${r.join(', ')}. Itt a NAV által közzétett ${j.ev}. évi tételekkel számolunk. Ha a javaslatot elfogadják, frissítjük.`, 'figyelem');
}
const szazalek = (x) => `${String(Math.round(x * 1000) / 10).replace('.', ',')}%`;

export function cegautoadoPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  if (r.mentes === 'villany') {
    return vegosszeg(`Cégautóadó, ${r.ev}`, 0, 'Az elektromos („5E”) és a nulla emissziós („5Z”) autó nem tartozik a cégautóadó alá, és gépjárműadót sem fizet.')
      + megjegyzes('A céges villanyautó magáncélú használata is adómentes. A cég a költségeit (értékcsökkenés, töltés, szerviz) elszámolhatja.');
  }
  if (r.mentes === 'phev') {
    const k = S.cegautoado(adat, { ev: r.ev + 1, kw: r.kw, osztaly: r.osztaly });
    return vegosszeg(`Cégautóadó, ${r.ev}`, 0, `A 2025. január 1. előtt forgalomba helyezett plug-in hibrid ${r.ev}. december 31-ig mentes.`)
      + (k.hiba ? '' : megjegyzes(`${rag(k.ev, 'tól', 'től')} fizetni kell: ${CEG_SAVOK_HU(k.sav)} havonta ${ftx(k.havi)}, évente ${ftx(k.teljes)}, amiből a gépjárműadó levonható.`) + javaslatMegj(adat, k.ev, k.kw, 1));
  }
  const al = r.honapok === 12
    ? `Negyedévente nagyjából ${ftx(r.negyedev)}, mindig a negyedévet követő hónap 20-áig.`
    : r.valtozas === 'eladta' ? `${r.honapok} hónapra, januártól az eladás hónapjáig (${S.HONAPOK[r.honap - 1]}).`
    : `${r.honapok} hónapra, a vételt követő hónaptól.`;
  let h = vegosszeg(`Cégautóadó, ${r.ev}`, r.fizetendo, al);
  h += '<ul class="tetelek">';
  h += tetel('Havi tétel', ftx(r.havi), { forras: 'hivatalos', forrasUrl: r.forras, al: `${CEG_SAVOK_HU(r.sav)}, ${r.osztalyNev}${r.kozzeteve ? `. NAV, közzétéve ${datumHu(r.kozzeteve)}` : ''}` });
  h += tetel(r.honapok === 12 ? 'Egész évre' : `${r.honapok} hónapra`, ftx(r.teljes), { forras: 'sajat', al: `${ftx(r.havi)} × ${r.honapok}` });
  if (r.gj) h += tetel('Levonható gépjárműadó', `−${ftx(r.levonas)}`, { cls: 'levonas', forras: 'hivatalos', al: r.gj.mentes ? 'az autó mentes a gépjárműadó alól' : r.valtozas === 'uj' ? `a forgalomba helyezést követő ${r.honapok} hónapra` : r.valtozas === 'eladta' ? `az éves ${ftx(r.gj.fizetendo)}-ból ${r.honapok} hónapra` : `éves gépjárműadó: ${ftx(r.gj.fizetendo)}` });
  h += tetel('Fizetendő', ftx(r.fizetendo), { cls: 'vegso' });
  h += '</ul>';
  h += `<p class="igy">Így jön ki: <strong>${ftx(r.havi)} × ${r.honapok} hónap = ${ftx(r.teljes)}</strong>${r.levonas ? `, ebből levonva a gépjárműadót <strong>${ftx(r.fizetendo)}</strong>` : ''}.</p>`;
  if (r.valtozas === 'hasznalt') h += megjegyzes('Használtan vett autónál az idei gépjárműadót az eladó fizeti, mert január 1-jén ő szerepelt a nyilvántartásban. Ezért ebben az évben nincs mit levonni, jövőre már igen.');
  else if (!r.gj) h += megjegyzes('Add meg a gyártási évet is, és levonjuk a gépjárműadót. Ugyanarra az autóra, ugyanazokra a hónapokra befizetett gépjárműadó levonható a cégautóadóból.');
  h += megjegyzes(`Bevallás és befizetés negyedévente, a negyedévet követő hónap 20-áig: ${r.ev}. április 20., július 20., október 20. és ${r.ev + 1}. január 20.${r.levonas ? ' A gépjárműadó csak akkor vonható le, ha határidőben befizették.' : ''}`);
  h += javaslatMegj(adat, r.ev, r.kw, r.levonas);
  const kov = adat.tetelek.cegautoado[r.ev + 1];
  if (kov) {
    h += megjegyzes(`${rag(r.ev + 1, 'ban', 'ben')} a NAV közzétett tétele erre az autóra havonta ${ftx(kov.tabla[r.sav][r.oszlop])} (közzétéve ${datumHu(kov.kozzeteve)}).`);
    h += javaslatMegj(adat, r.ev + 1, r.kw, 0);
  }
  return jelekkel(h);
}
const CEG_SAVOK_HU = (sav) => ['legfeljebb 50 kW', '51–90 kW', '91–120 kW', '120 kW felett'][sav];

/* ---------- Vállalkozóknak: cégautó vagy saját autó ---------- */
export function cegautoPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  const d = r.kulonbseg;
  const kozel = Math.abs(d) < 25000;
  const fej = kozel ? 'Nagyjából mindegy, évente legfeljebb ennyi a különbség'
    : d > 0 ? 'A saját autó évente ennyivel olcsóbb' : 'A cégautó évente ennyivel olcsóbb';
  const sub = `Annyi üzleti úttal, amennyit megadtál (${fmt(r.uzletiKm)} km), abban mérve, mennyi pénz marad nálad.`;
  let h = vegosszeg(fej, Math.abs(d), sub);
  const k = r.kmDij;
  h += '<p class="panel-cim">Cégautó</p><ul class="tetelek">';
  h += tetel('Az autó éves költsége', ftx(r.C), { forras: 'sajat', al: `értékvesztés ${ftx(r.ertekvesztes)}, üzemanyag vagy áram ${ftx(r.energia)}, biztosítás, szerviz és egyéb ${ftx(r.fix)}` });
  h += tetel('Gépjárműadó', ftx(r.gj), { forras: 'hivatalos', forrasUrl: adat.tetelek.gepjarmuado[r.ev]?.forras });
  h += tetel('Cégautóadó', ftx(r.ca.fizetendo), { forras: 'hivatalos', forrasUrl: r.ca.forras, al: r.ca.mentes ? 'az autó mentes' : `havi ${ftx(r.ca.havi)} × 12, a gépjárműadóval csökkentve` });
  h += tetel('A cég kiadása', ftx(r.aCeg), { al: 'a magáncélú használat után nem kell adót fizetni' });
  h += tetel('Neked ennyibe kerül', ftx(r.aZseb), { cls: 'vegso', al: `ennyivel kevesebb osztalékot veszel ki (a céges forint ${szazalek(r.r)}-a)` });
  h += '</ul>';
  h += '<p class="panel-cim">Saját autó, kilométertérítéssel</p><ul class="tetelek">';
  h += tetel('Az autó éves költsége', ftx(r.C), { forras: 'sajat', al: 'te fizeted' });
  h += tetel('Gépjárműadó', ftx(r.gj), { forras: 'hivatalos', forrasUrl: adat.tetelek.gepjarmuado[r.ev]?.forras, al: 'te fizeted, cégautóadó nincs' });
  if (r.terites) {
    h += tetel('Adómentes km-térítés a cégtől', `−${ftx(r.terites)}`, { cls: 'levonas', forras: 'hivatalos', al: `${fmt(r.uzletiKm)} km × ${String(Math.round(r.ftKm * 100) / 100).replace('.', ',')} Ft/km: ${k.normaLeiras}, ${k.arForras}, plusz ${adat.szabalyok.km.normakoltseg_ft_km} Ft/km` });
    h += tetel('A térítés miatt kevesebb osztalék', `+${ftx(r.terites * r.r)}`, { al: 'a cég ezt rád költi, nem osztalékként adja' });
  }
  h += tetel('Neked ennyibe kerül', ftx(r.bZseb), { cls: 'vegso' });
  h += '</ul>';
  if (r.kmFordulo != null) {
    h += megjegyzes(r.kmFordulo === 0
      ? 'Ennél az autónál a saját autó üzleti út nélkül is olcsóbb: a cégautóadó többe kerül, mint amennyit azzal nyersz, hogy a cég fizeti a költségeket.'
      : `Ugyanekkora éves futással és költséggel: ha a futásodból évente legalább <strong>${fmt(r.kmFordulo)} km</strong> üzleti út, a saját autó, ha kevesebb, a cégautó jön ki olcsóbban. Ha az üzleti utak miatt összesen is többet mész, a nagyobb üzemanyag- és szervizköltséget is írd be.`);
  } else h += megjegyzes('Add meg a hengerűrtartalmat is, és kiszámoljuk, hány km üzleti út felett éri meg a saját autó.');
  h += `<p class="igy">A mérce: 100 Ft céges nyereségből osztalékként <strong>${String(Math.round(r.r * 1000) / 10).replace('.', ',')} Ft</strong> jut hozzád (${adat.szabalyok.vallalkozo.tao_kulcs * 100}% társasági adó, utána ${adat.szabalyok.vallalkozo.osztalek_szja * 100}% szja${r.szocho ? ` és ${adat.szabalyok.vallalkozo.szocho * 100}% szocho` : ''}). Amit a cég az autóra költ, azt ezen az arányon számoljuk át a te pénzedre.</p>`;
  h += javaslatMegj(adat, r.ev, r.kw, r.ca.levonas);
  h += megjegyzes('Nem számoljuk: az áfát (cégautónál egyes tételek áfájának egy része visszaigényelhető lehet), a kisvállalati adót (kiva), a veszteséges céget és a vételárba kötött pénz kamatát. A munkába járás nem üzleti út. Mielőtt döntesz, beszéld meg a könyvelőddel.');
  return jelekkel(h);
}

/* ---------- Következő lépés ---------- */
/** lepesek: S.kovetkezoLepesek eredménye; utak: kalkulátorkulcs → cím (a lap #utak adatából). */
export function kovetkezoBlokk(lepesek, utak) {
  const l = (lepesek || []).filter((x) => utak?.[x.cel]);
  if (!l.length) return '';
  return `<div class="kovetkezo"><p class="kovetkezo-cim">Következő lépés</p><ul>${l.map((x) => `<li><a href="${esc(utak[x.cel] + S.kovetkezoQuery(x.q))}" data-kovetkezo>${esc(x.cim)}</a><span>${esc(x.szoveg)}</span></li>`).join('')}</ul></div>`;
}

/* ---------- Útnyilvántartás és kiküldetési rendelvény: a nyomtatható lap ---------- */
const UZ_SZO = { benzin: 'benzin', dizel: 'dízel', lpg: 'LPG', cng: 'CNG', plugin: 'plug-in hibrid', elektromos: 'elektromos' };
/** d: az űrlap fejléce, r: S.utnyilvantartas eredménye vagy null (még nincs út), hiba: a számolás hibaüzenete */
export function utnyLap(adat, d, r, hiba = '') {
  const rendelveny = d.tipus === 'rendelveny';
  const p = (v, h = 24) => pont(v, h);
  const nap = (iso) => { const [e, h, n] = iso.split('-'); return `${e}. ${h}. ${n}.`; };
  const honapNev = (h) => `${h.ev}. ${S.HONAPOK[h.ho - 1]}`;
  const uz = UZ_SZO[d.uzemanyag] ? `${UZ_SZO[d.uzemanyag]}${d.uzemanyag === 'plugin' ? ` (${d.motor === 'dizel' ? 'dízeles' : 'benzines'} motor)` : ''}` : '';
  const idoszak = r?.honapok.length ? (r.honapok.length === 1 ? honapNev(r.honapok[0]) : `${honapNev(r.honapok[0])} – ${honapNev(r.honapok.at(-1))}`) : '';
  const fejSor = (cim, ertek) => `<tr><th scope="row">${cim}</th><td>${ertek}</td></tr>`;
  const fej = [
    fejSor(rendelveny ? 'A magánszemély neve' : 'Név', p(d.nev)),
    rendelveny ? fejSor('Adóazonosító jele', p(d.adoazonosito, 14)) : '',
    fejSor(rendelveny ? 'Kifizető (aki elrendeli és megtéríti)' : 'Vállalkozás', p(d.kifizeto)),
    fejSor('A gépjármű gyártmánya, típusa', p(d.auto)),
    fejSor('Forgalmi rendszám', p(d.rendszam ? String(d.rendszam).toUpperCase() : '', 10)),
    fejSor('Hengerűrtartalom, üzemanyag', `${d.cm3 && d.uzemanyag !== 'elektromos' ? `${fmt(d.cm3)} cm³, ` : ''}${uz || p('', 14)}`),
    fejSor('Fogyasztási norma', r ? `${tized(r.norma, 2)} ${r.egyseg}/100 km (${esc(r.normaLeiras)}, 60/1992. Korm. rendelet)` : p('', 14)),
    rendelveny ? '' : fejSor('Kilométeróra-állás az időszak elején és végén', `${d.kmEleje ? `${fmt(d.kmEleje)} km` : p('', 10)} – ${d.kmVege ? `${fmt(d.kmVege)} km` : p('', 10)}`),
  ].join('');
  let utSorok = '';
  if (r) {
    for (const h of r.honapok) {
      for (const u of r.utak.filter((x) => x.datum.startsWith(h.honap))) utSorok += `<tr><td class="nap">${nap(u.datum)}</td><td>${esc([u.honnan, u.hova].filter(Boolean).join(' – '))}</td><td>${esc(u.partner)}</td><td class="sz">${tized(u.km)}</td></tr>`;
      if (r.honapok.length > 1) utSorok += `<tr class="reszossz"><td colspan="3">${honapNev(h)} összesen</td><td class="sz">${tized(h.km)}</td></tr>`;
    }
  } else utSorok = Array.from({ length: 6 }, () => '<tr class="ures"><td></td><td></td><td></td><td></td></tr>').join('');
  const elsz = r ? `<table class="utny-tabla"><thead><tr><th>Hónap</th><th class="sz">Km</th><th class="sz">NAV-ár</th><th class="sz">Üzemanyag</th><th class="sz">Normaköltség</th><th class="sz">Összesen</th></tr></thead><tbody>
${r.honapok.map((h) => `<tr><td>${honapNev(h)}</td><td class="sz">${tized(h.km)}</td><td class="sz">${h.ar} Ft/${r.egyseg}</td><td class="sz">${fmt(h.uzemanyagFt)} Ft</td><td class="sz">${fmt(h.normakoltseg)} Ft</td><td class="sz">${fmt(h.osszesen)} Ft</td></tr>`).join('')}
${r.honapok.length > 1 ? `<tr class="reszossz"><td>Összesen</td><td class="sz">${tized(r.km)}</td><td></td><td class="sz">${fmt(r.uzemanyagFt)} Ft</td><td class="sz">${fmt(r.normakoltseg)} Ft</td><td class="sz">${fmt(r.osszesen)} Ft</td></tr>` : ''}
</tbody></table>
<p class="utny-megj">Üzemanyag: a megtett kilométer × a norma ÷ 100 × a NAV adott havi ára (Szja tv. 82. § (2)). Normaköltség: ${r.ft15} Ft/km általános személygépkocsi-normaköltség.${rendelveny ? ' A költségtérítés összege' : ' Elszámolható költség összesen'}: <b data-osszeg>${fmt(r.osszesen)}&nbsp;Ft</b>.</p>` : `<p class="utny-megj">Az utak beírása után itt jelenik meg a havi elszámolás a NAV-árral és a normaköltséggel.</p>`;
  return `${hiba ? `<p class="utny-hiba csak-kepernyo" role="status">${esc(hiba)}</p>` : ''}<article class="szerzodes-lap utny-lap" tabindex="0" aria-label="A kész nyomtatvány előnézete">
<h2>${rendelveny ? 'Kiküldetési rendelvény' : 'Útnyilvántartás'}</h2>
<p class="kozep">${rendelveny ? 'saját személygépkocsi hivatali, üzleti célú használatáról' : 'a gépjármű üzleti célú használatáról'}${idoszak ? `<br>${idoszak}` : ''}</p>
<table class="utny-fej"><tbody>${fej}</tbody></table>
<h3>${rendelveny ? 'A hivatali, üzleti utak' : 'Az utak'}</h3>
<table class="utny-tabla"><thead><tr><th>Dátum</th><th>Útvonal (honnan – hová)</th><th>${rendelveny ? 'Az út célja' : 'Felkeresett partner, az út célja'}</th><th class="sz">Km</th></tr></thead><tbody>${utSorok}</tbody></table>
<h3>Elszámolás</h3>
${elsz}
${rendelveny ? '<p>A rendelvény két példányban készült: az eredeti a kifizetőnél, a másolat a magánszemélynél marad, mindkettő az elévülésig megőrzendő.</p>' : ''}
<p class="kelt">Kelt: ${p(d.keltHely, 14)}, ${d.keltDatum ? datumHu(d.keltDatum) : p('', 18)}</p>
<div class="alairasok">${rendelveny ? '<div><span></span>kifizető</div><div><span></span>magánszemély</div>' : '<div><span></span>aláírás</div>'}</div>
</article>`;
}
