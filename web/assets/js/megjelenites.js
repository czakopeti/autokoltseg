// Az elszámolás (eredmény) HTML-je. Ugyanezt használja az építő (a HTML-ben már benne van a szám)
// és a böngésző (élő számolás), így a kettő nem térhet el.
import * as S from './szamitas.js';

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
  const d = n % 10;
  const rg = n === 1 || n === 21 || n === 31 ? 'jén' : [20, 30].includes(n) ? 'án' : [3, 6, 8].includes(d) ? 'án' : 'én';
  return `${e}. ${S.HONAPOK[h - 1]} ${n}-${rg}`;
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
  let h = vegosszeg(`Gépjárműadó, ${r.ev}`, r.fizetendo, r.mentes ? null : (r.honapok < 12 ? `${r.honapok} hónapra. A befizetés határidejét a NAV határozata tartalmazza.` : `Egy összegben, ${r.ev}. április 15-ig. Havonta nagyjából ${ftx(r.havi)}.`));
  if (r.mentes) return h + megjegyzes(r.mentes, 'mentes') + evSav(adat, r, b);
  h += '<ul class="tetelek">';
  h += tetel('Teljesítmény (P.2)', `${fmt(r.kw)} kW`, { forras: 'sajat' });
  h += tetel('Az autó kora', `${r.kor}. naptári év`, { al: `korsáv: ${S.GJADO_SAV_ROVID[r.sav]}`, forras: 'sajat' });
  h += tetel('Adótétel', `${r.ftKw} Ft/kW`, { forras: 'hivatalos', forrasUrl: adat.tetelek.gepjarmuado[r.ev]?.forras, al: adat.tetelek.gepjarmuado[r.ev]?.kozzeteve ? `NAV, közzétéve ${datumHu(adat.tetelek.gepjarmuado[r.ev].kozzeteve)}` : '' });
  if (r.honapok < 12) h += tetel('Időarány', `${r.honapok}/12`, { forras: 'hivatalos' });
  if (r.kedvezmeny) h += tetel('Mozgáskorlátozott kedvezmény', `−${ftx(r.kedvezmeny)}`, { cls: 'levonas', forras: 'hivatalos' });
  h += tetel('Fizetendő', ftx(r.fizetendo), { cls: 'vegso' });
  h += '</ul>';
  h += `<p class="igy">Így jön ki: <strong>${fmt(r.kw)} kW × ${r.ftKw} Ft/kW = ${ftx(r.evesTeljes)}</strong>${r.honapok < 12 ? `, ebből ${r.honapok} hónapra <strong>${ftx(r.aranyos)}</strong>` : ''}${r.kedvezmeny ? `, a kedvezménnyel <strong>${ftx(r.fizetendo)}</strong>` : ''}.</p>`;
  if (r.mkMegjegyzes) h += megjegyzes(r.mkMegjegyzes);
  return jelekkel(h) + evSav(adat, r, b);
}

function evSav(adat, r, b) {
  const evek = S.gjadoEvek(adat, b).filter((x) => !x.hiba);
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
  for (const t of r.tetelek) h += tetel(t.nev, ftx(t.ft), { forras: 'hivatalos', forrasUrl: t.kulcs === 'illetek' ? adat.tetelek.illetek?.[b.ev]?.forras : t.kulcs === 'regado' ? adat.tetelek.regado_alap?.[b.ev]?.forras : t.kulcs === 'eredetiseg' ? ok.eredetiseg_forras?.url : '', al: t.kulcs === 'eredetiseg' && evSav ? `hatósági ár, ${evSav.nev}` : '' });
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
export const hianyPanel = (uz) => `<div class="ures"><p class="ures-cim">Még egy adat hiányzik.</p><p>${esc(uz)}</p></div>`;

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
  let h = vegosszeg('2027-től évente', r.ev2027, r.ev2027 === r.kulonbseg && r.kulonbseg > 0 ? 'Ez mind új kiadás: 2026-ban ezekért nem fizettél.' : r.kulonbseg > 0 ? `Ez ${ftx(r.kulonbseg)}-tal több, mint amennyit 2026-ban rendszeresen fizettél.` : 'Ugyanannyi, mint 2026-ban.');
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
  const m = adat.szabalyok.matrica, d = m.d1;
  let h = vegosszeg('Neked ez a legolcsóbb', r.legjobb.ft, `${esc(r.legjobb.nev)}. ${r.megtakaritas > 0 ? `${ftx(r.megtakaritas)}-tal olcsóbb, mint a másik lehetőség.` : 'A két lehetőség ugyanannyiba kerül.'}`);
  h += '<ul class="tetelek">';
  for (const l of r.lehetosegek) h += tetel(esc(l.nev), ftx(l.ft), { forras: 'hivatalos', forrasUrl: m.forrasok[0]?.url, al: esc(l.al), cls: l === r.legjobb ? 'kiemelt-sor' : '' });
  h += '</ul>';
  h = jelekkel(h);
  h += `<p class="igy">Az éves országos matrica (${ftx(d.eves)}) akkor éri meg, ha egy évben legalább <strong>${r.hatar.napi} napi</strong>, <strong>${r.hatar.tiznapos} tíznapos</strong> vagy <strong>${r.hatar.havi} havi</strong> matricát vennél helyette, vagy ha <strong>${r.hatar.varmegyei} vármegyében</strong> autópályázol rendszeresen.</p>`;
  h += megjegyzes(`${m.ev}-es díjakkal számolunk. A következő évi díjakat még nem tették közzé, de a ${m.ev}-es éves matrica ${m.eves_ervenyes} érvényes.`);
  return h;
}

/* ---------- Autóvásárlás hitelből ---------- */
export function hitelPanel(adat, r) {
  if (r.hiba) return hianyPanel(r.hiba);
  const h0 = adat.szabalyok.hitel;
  let h = vegosszeg('Havi törlesztőrészlet', r.havi, `${tized(r.evek, 1)} évig, ${tized(r.thm, 2)}% THM-mel. Összesen ${ftx(r.visszafizet)}-ot fizetsz vissza.`);
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
