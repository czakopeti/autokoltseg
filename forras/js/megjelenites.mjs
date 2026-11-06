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
  const d = n % 10;
  const rg = n === 1 || n === 21 || n === 31 ? 'jén' : [20, 30].includes(n) ? 'án' : [3, 6, 8].includes(d) ? 'án' : 'én';
  return `${e}. ${S.HONAPOK[h - 1]} ${n}-${rg}`;
}
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
function tetel(nev, ertek, { cls = '', al = '', href = '' } = {}) {
  const n = href ? `<a href="${href}">${nev}</a>` : nev;
  return `<li class="${cls}"><span>${n}${al ? `<span class="al">${al}</span>` : ''}</span><span class="ossz-ertek">${ertek}</span></li>`;
}
const megjegyzes = (s, cls = '') => `<p class="megjegyzes ${cls}">${s}</p>`;
export const hibaPanel = (uz) => `<p class="hiba" role="alert">${esc(uz)}</p>`;

/* ---------- Gépjárműadó ---------- */
export function gjadoPanel(adat, r, b) {
  if (r.hiba) return hibaPanel(r.hiba);
  let h = vegosszeg(`Gépjárműadó, ${r.ev}`, r.fizetendo, r.mentes ? null : (r.honapok < 12 ? `${r.honapok} hónapra. A befizetés határidejét a NAV határozata tartalmazza.` : `Egy összegben, ${r.ev}. április 15-ig. Havonta nagyjából ${ftx(r.havi)}.`));
  if (r.mentes) return h + megjegyzes(r.mentes, 'mentes') + evSav(adat, r, b);
  h += '<ul class="tetelek">';
  h += tetel('Teljesítmény (P.2)', `${fmt(r.kw)} kW`);
  h += tetel('Az autó kora', `${r.kor}. naptári év`, { al: `korsáv: ${S.GJADO_SAV_ROVID[r.sav]}` });
  h += tetel('Adótétel', `${r.ftKw} Ft/kW`);
  if (r.honapok < 12) h += tetel('Időarány', `${r.honapok}/12`);
  if (r.kedvezmeny) h += tetel('Mozgáskorlátozott kedvezmény', `−${ftx(r.kedvezmeny)}`, { cls: 'levonas' });
  h += tetel('Fizetendő', ftx(r.fizetendo), { cls: 'vegso' });
  h += '</ul>';
  h += `<p class="igy">Így jön ki: <strong>${fmt(r.kw)} kW × ${r.ftKw} Ft/kW = ${ftx(r.evesTeljes)}</strong>${r.honapok < 12 ? `, ebből ${r.honapok} hónapra <strong>${ftx(r.aranyos)}</strong>` : ''}${r.kedvezmeny ? `, a kedvezménnyel <strong>${ftx(r.fizetendo)}</strong>` : ''}.</p>`;
  if (r.mkMegjegyzes) h += megjegyzes(r.mkMegjegyzes);
  return h + evSav(adat, r, b);
}

function evSav(adat, r, b) {
  const evek = S.gjadoEvek(adat, b).filter((x) => !x.hiba);
  if (evek.length < 2) return '';
  let h = `<div class="ev-sav" aria-label="Ugyanez az autó évenként">${evek.map((x) => `<div class="${x.ev === r.ev ? 'aktiv' : ''}"><span class="ev">${x.ev}</span><span class="ennyi">${ftx(x.fizetendo)}</span></div>`).join('')}</div>`;
  const valt = evek.find((x, i) => i > 0 && x.sav !== evek[i - 1].sav && !x.mentes);
  if (valt) h += megjegyzes(`${rag(valt.ev, 'tól', 'től')} az autó a következő korsávba lép (${S.GJADO_SAV_ROVID[valt.sav]}), ott ${valt.ftKw} Ft/kW a tétel.`);
  return h;
}

/* ---------- Átírás ---------- */
export function atirasPanel(adat, r) {
  if (r.hiba) return hibaPanel(r.hiba);
  const il = r.illetek;
  let h = vegosszeg('Az átírás költsége', r.osszesen, r.vetelar ? `A ${ftx(r.vetelar)} vételárral együtt ${ftx(r.mindossz)}.` : (r.regado ? 'Illeték, regisztrációs adó, vizsgálat és okmányok.' : 'Illeték, vizsgálat és okmányok.'));
  if (il.mentes) h += megjegyzes(il.mentes, 'mentes');
  if (r.regado?.mentes) h += megjegyzes(r.regado.mentes, 'mentes');
  h += '<ul class="tetelek">';
  for (const t of r.tetelek) h += tetel(t.nev, ftx(t.ft));
  h += tetel('Összesen', ftx(r.osszesen), { cls: 'vegso' });
  h += '</ul>';
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
  h += tetel('Üzemanyag', ftx(r.uzemanyagFt), { al: `${tized(r.mennyiseg, 2)} ${r.egyseg} × ${r.ar} Ft` });
  h += tetel('Normaköltség', ftx(r.normakoltseg), { al: `${fmt(r.tav)} km × ${nk} Ft` });
  h += tetel('Összesen', ftx(r.osszesen), { cls: 'vegso' });
  h += '</ul>';
  h += `<p class="igy">Norma: <strong>${tized(r.norma, 3)} ${r.egyseg}/100 km</strong> (${r.normaLeiras}). Ár: ${r.arForras}.</p>`;
  return h;
}

export function munkaPanel(adat, r) {
  if (r.hiba) return hibaPanel(r.hiba);
  let h = vegosszeg('Munkába járás, havonta', r.havi, `Évente ${ftx(r.eves)}. Ennyit adhat adómentesen a munkáltató.`);
  h += '<ul class="tetelek">';
  h += tetel('Havi távolság oda-vissza', `${fmt(r.haviKm)} km`);
  h += tetel('Térítés', `${r.dij} Ft/km`);
  h += tetel('Havonta', ftx(r.havi), { cls: 'vegso' });
  h += '</ul>';
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
    h += tetel(`Gépjárműadó, ${g.ev}`, ftx(g.fizetendo), { al: d === 0 ? 'ugyanannyi, mint idén' : `${ftx(Math.abs(d))}-tal ${d < 0 ? 'kevesebb' : 'több'}, mint idén`, href: k.linkek.gjado(g.ev) });
  }
  if (!at.hiba) h += tetel('Átírás, ha most veszed meg', ftx(at.osszesen), { al: at.illetek.mentes ? 'illetékmentes, csak a vizsgálat és az okmányok' : `ebből illeték ${ftx(at.illetek.osszeg)}`, href: k.linkek.atiras });
  if (!km.hiba) h += tetel('100 km hivatali út', ftx(km.osszesen), { al: `${honapBan(lf.honap)}, NAV-áron, normaköltséggel`, href: k.linkek.km });
  h += '</ul>';
  return h;
}
