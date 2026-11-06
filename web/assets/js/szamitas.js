// Autóköltség – számítási mag. Tiszta függvények: a böngésző, az építő és a tesztek is ezt használják.
// Minden függvény az adatot (data/*.json összefésülve) és a bemenetet kapja, és egy eredményobjektumot ad vissza.

export const HONAPOK = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

const ft = (x) => Math.round(x);

/** Lóerőből kW (a forgalmi P.2 sora kW-ban van; LE esetén 1,36-tal osztunk és kerekítünk). */
export function leKw(le) { return Math.round(Number(le) / 1.36); }

/** A legmagasabb rendelkezésre álló év, amely nem nagyobb a kértnél (pl. regisztrációs adó alapja). */
export function evAdat(tabla, ev) {
  const evek = Object.keys(tabla).map(Number).sort((a, b) => a - b);
  let talalt = null;
  for (const e of evek) if (e <= ev) talalt = e;
  return talalt === null ? null : { ev: talalt, ...tabla[talalt] };
}

/* ---------------- Gépjárműadó ---------------- */

export const GJADO_SAVOK = ['a gyártási évben és az azt követő 3 naptári évben', 'a gyártási évet követő 4–7. naptári évben', 'a gyártási évet követő 8–11. naptári évben', 'a gyártási évet követő 12–15. naptári évben', 'a gyártási évet követő 16. naptári évtől'];
export const GJADO_SAV_ROVID = ['0–3. év', '4–7. év', '8–11. év', '12–15. év', '16. évtől'];

export function gjadoSav(kor) {
  if (kor <= 3) return 0;
  if (kor <= 7) return 1;
  if (kor <= 11) return 2;
  if (kor <= 15) return 3;
  return 4;
}

/**
 * @param {object} adat összefésült adat (tetelek)
 * @param {object} b { ev, kw, gyartasiEv, hajtas: 'hagyomanyos'|'plugin'|'elektromos', phevRegi: bool (első forgalomba helyezés 2025.01.01. előtt),
 *                     evkozbenHonap: 0 (egész év) | 1–12 (a forgalomba helyezés hónapja), mozgaskorlatozott: bool }
 */
export function gepjarmuado(adat, b) {
  const tetel = adat.tetelek.gepjarmuado[b.ev];
  if (!tetel) return { hiba: `A ${b.ev}. évi tételeket a NAV még nem tette közzé.` };
  const kw = Math.round(Number(b.kw));
  const gy = Number(b.gyartasiEv);
  if (!(kw > 0)) return { hiba: 'Add meg a teljesítményt.' };
  if (!(gy > 1900)) return { hiba: 'Add meg a gyártási évet.' };
  const kor = b.ev - gy;
  if (kor < 0) return { hiba: 'A gyártási év nem lehet későbbi az adóévnél.' };
  const sav = gjadoSav(kor);
  const ftKw = tetel.savok[sav];
  const evesTeljes = kw * ftKw;
  const honap = Number(b.evkozbenHonap) || 0;
  const honapok = honap ? 12 - honap : 12;

  let mentes = null;
  if (b.hajtas === 'elektromos') mentes = 'A tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó mentes a gépjárműadó alól.';
  else if (b.hajtas === 'plugin' && b.phevRegi && b.ev <= 2026) mentes = 'A 2025. január 1. előtt forgalomba helyezett, „5P” vagy „5N” jelzésű plug-in hibrid 2026. december 31-ig mentes.';

  const aranyosOsszeg = ft(evesTeljes * honapok / 12);
  let kedvezmeny = 0;
  const mk = adat.tetelek.gepjarmuado_mozgaskorlatozott;
  let mkMegjegyzes = null;
  if (!mentes && b.mozgaskorlatozott) {
    if (kw <= mk.max_kw) kedvezmeny = Math.min(mk.max_ft, aranyosOsszeg);
    else mkMegjegyzes = `A kedvezmény csak ${mk.max_kw} kW-ig jár.`;
  }
  const fizetendo = mentes ? 0 : aranyosOsszeg - kedvezmeny;
  return {
    ev: b.ev, kw, kor, sav, ftKw, honapok, evesTeljes,
    aranyos: mentes ? 0 : aranyosOsszeg, kedvezmeny, mkMegjegyzes, mentes,
    fizetendo, havi: ft(fizetendo / 12),
    hatarido: honap ? 'a NAV határozatában megadott időpontig' : `${b.ev}. április 15-ig, egy összegben`,
  };
}

/** Ugyanannak az autónak az adója minden olyan évre, amelyre van tétel (a megadott évtől). */
export function gjadoEvek(adat, b) {
  return Object.keys(adat.tetelek.gepjarmuado).map(Number).sort().map((ev) => gepjarmuado(adat, { ...b, ev, evkozbenHonap: 0 }));
}

/* ---------------- Átírási (vagyonszerzési) illeték ---------------- */

export const ILLETEK_KW_SAVOK = ['0–40 kW', '41–80 kW', '81–120 kW', '120 kW felett'];
export const ILLETEK_KOR_SAVOK = ['0–3 év', '4–8 év', '8 év felett'];

export function illetekSor(kw) { return kw <= 40 ? 0 : kw <= 80 ? 1 : kw <= 120 ? 2 : 3; }
export function illetekOszlop(kor) { return kor <= 3 ? 0 : kor <= 8 ? 1 : 2; }

/**
 * @param b { ev, kw, gyartasiEv, hajtas: 'hagyomanyos'|'hibrid'|'plugin'|'elektromos', szerzes: 'vetel'|'ajandek'|'kozeli', hanyad: 0–100 }
 */
export function illetek(adat, b) {
  const t = evAdat(adat.tetelek.illetek, b.ev);
  const kw = Math.round(Number(b.kw));
  const gy = Number(b.gyartasiEv);
  if (!(kw > 0)) return { hiba: 'Add meg a teljesítményt.' };
  if (!(gy > 1900)) return { hiba: 'Add meg a gyártási évet.' };
  const kor = Math.max(0, b.ev - gy);
  const sor = illetekSor(kw), oszlop = illetekOszlop(kor);
  const ftKw = t.tabla[sor][oszlop];
  const alap = kw * ftKw;
  const szorzo = b.szerzes === 'ajandek' ? 2 : 1;
  const hanyad = b.hanyad == null ? 100 : Number(b.hanyad);
  let mentes = null;
  if (b.hajtas === 'elektromos') mentes = 'A környezetkímélő („5E”, „5Z”) autó megszerzése illetékmentes.';
  else if (b.szerzes === 'kozeli') mentes = 'Egyenes ági rokontól (szülő, nagyszülő, gyermek, unoka) és házastárstól szerzett autó után nem kell illetéket fizetni.';
  const osszeg = mentes ? 0 : ft(alap * szorzo * hanyad / 100);
  return { ev: t.ev, kw, kor, sor, oszlop, ftKw, alap, szorzo, hanyad, mentes, osszeg };
}

/* ---------------- Regisztrációs adó (külföldről behozott autó) ---------------- */

export const REGADO_OSZLOP_NEV = {
  A: '„15” vagy jobb, 2020 után forgalomba helyezve, illetve hibrid',
  B: '„15” vagy jobb, 2021 előtt forgalomba helyezve',
  C: '„12”–„14”',
  D: '„9”–„11”',
  E: '„8” vagy rosszabb',
};
export const REGADO_SOR_NEV = ['0–80 kW', '81–100 kW', '101–120 kW', '121–140 kW', '141–180 kW', '181–250 kW', '250 kW felett'];

/** Megkezdett hónapok száma két dátum között (minden megkezdett hónap egésznek számít). */
export function megkezdettHonapok(tol, ig) {
  const a = new Date(tol), b = new Date(ig);
  if (isNaN(a) || isNaN(b) || b < a) return null;
  let h = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() > a.getDate()) h += 1;
  return Math.max(h, 0);
}

export function korcsokkentes(adat, honapok) {
  for (const [ig, sz] of adat.tetelek.regado_korcsokkentes) if (ig === null || honapok <= ig) return sz;
  return 90;
}

/**
 * @param b { datum: 'YYYY-MM-DD' (hazai eljárás), elsoForgalom: 'YYYY-MM-DD', kw, osztaly: '15'|'12'|'9'|'8', hajtas }
 */
export function regado(adat, b) {
  const kw = Math.round(Number(b.kw));
  if (!(kw > 0)) return { hiba: 'Add meg a teljesítményt.' };
  if (b.hajtas === 'elektromos') return { mentes: 'Elektromos autó után nem kell regisztrációs adót fizetni.', osszeg: 0 };
  if (!b.elsoForgalom) return { hiba: 'Add meg az első (külföldi) forgalomba helyezés dátumát.' };
  const honapok = megkezdettHonapok(b.elsoForgalom, b.datum);
  if (honapok === null) return { hiba: 'Az első forgalomba helyezés nem lehet későbbi a hazai eljárásnál.' };
  const ev = new Date(b.datum).getFullYear();
  const alapT = evAdat(adat.tetelek.regado_alap, ev);
  const sz = adat.tetelek.regado_szorzok;
  let sor = sz.sorok_kw.findIndex((h) => h === null || kw <= h);
  let oszlop;
  if (b.hajtas === 'hibrid' || b.hajtas === 'plugin') oszlop = 'A';
  else if (b.osztaly === '15') oszlop = new Date(b.elsoForgalom) > new Date('2020-12-31') ? 'A' : 'B';
  else oszlop = { 12: 'C', 9: 'D', 8: 'E' }[b.osztaly] || 'E';
  const szorzo = sz.tabla[sor][sz.oszlopok.indexOf(oszlop)];
  const teljes = alapT.ft * szorzo;
  const csokk = korcsokkentes(adat, honapok);
  const osszeg = ft(teljes * (100 - csokk) / 100);
  return { alap: alapT.ft, alapEv: alapT.ev, sor, oszlop, szorzo, teljes, honapok, csokk, osszeg };
}

/** Az átírás teljes költsége: illeték + (behozott autónál) regisztrációs adó + okmányok. */
export function atiras(adat, b) {
  const il = illetek(adat, b);
  if (il.hiba) return il;
  let rg = null;
  if (b.behozott) {
    rg = regado(adat, b);
    if (rg.hiba) return rg;
  }
  const o = adat.szabalyok.okmanyok;
  const tetelek = [];
  tetelek.push({ nev: 'Vagyonszerzési illeték', ft: il.osszeg, kulcs: 'illetek' });
  if (rg) tetelek.push({ nev: 'Regisztrációs adó', ft: rg.osszeg, kulcs: 'regado' });
  if (b.eredetiseg !== false) tetelek.push({ nev: 'Eredetiségvizsgálat', ft: Number(b.eredetisegDij ?? o.eredetisegvizsgalat_alap), kulcs: 'eredetiseg' });
  tetelek.push({ nev: 'Forgalmi engedély', ft: o.forgalmi_engedely, kulcs: 'forgalmi' });
  tetelek.push({ nev: 'Törzskönyv', ft: o.torzskonyv, kulcs: 'torzskonyv' });
  if (b.postazas !== false) tetelek.push({ nev: 'Törzskönyv postázása', ft: o.torzskonyv_postazas, kulcs: 'postazas' });
  const osszesen = tetelek.reduce((s, t) => s + t.ft, 0);
  const vetelar = Number(b.vetelar) || 0;
  return { illetek: il, regado: rg, tetelek, osszesen, vetelar, mindossz: osszesen + vetelar };
}

/* ---------------- Kilométertérítés ---------------- */

export const UZEMANYAG_NEV = { benzin: 'Benzin', dizel: 'Dízel', lpg: 'LPG', cng: 'CNG', plugin: 'Plug-in hibrid', elektromos: 'Elektromos' };

function normaTabla(tabla, cm3) {
  for (const [ig, n] of tabla) if (ig === null || cm3 <= ig) return n;
  return tabla[tabla.length - 1][1];
}

/** Az alapnorma (l/100 km, CNG-nél kg/100 km) és a hozzá tartozó NAV-ár kulcsa. */
export function kmNorma(adat, { uzemanyag, motor = 'benzin', cm3 }) {
  const k = adat.szabalyok.km;
  const c = Number(cm3);
  const benzin = normaTabla(k.norma_benzin, c);
  const dizel = normaTabla(k.norma_dizel, c);
  switch (uzemanyag) {
    case 'benzin': return { norma: benzin, arKulcs: 'benzin', egyseg: 'l', leiras: `${c} cm³ benzines alapnorma` };
    case 'dizel': return { norma: dizel, arKulcs: 'dizel', egyseg: 'l', leiras: `${c} cm³ dízel alapnorma` };
    case 'lpg': return { norma: kerek(benzin * k.lpg_szorzo, 2), arKulcs: 'lpg', egyseg: 'l', leiras: `a benzines alapnorma ${String(k.lpg_szorzo).replace('.', ',')}-szerese` };
    case 'cng': return { norma: kerek(benzin * k.cng_kg_per_l, 3), arKulcs: 'cng', egyseg: 'kg', leiras: `literenként ${String(k.cng_kg_per_l).replace('.', ',')} kg a benzines alapnormából` };
    case 'plugin': {
      const alap = motor === 'dizel' ? dizel : benzin;
      return { norma: kerek(alap * k.plugin_szorzo, 3), arKulcs: motor === 'dizel' ? 'dizel' : 'benzin', egyseg: 'l', leiras: `a belső égésű motor alapnormájának ${Math.round(k.plugin_szorzo * 100)}%-a` };
    }
    case 'elektromos': return { norma: k.elektromos_benzin_l_100km, arKulcs: 'benzin', egyseg: 'l', leiras: '100 km-enként 3 liter benzinnel egyenértékű' };
    default: return null;
  }
}

function kerek(x, j) { const m = 10 ** j; return Math.round(x * m) / m; }

/** A választott hónap NAV-ára; ha az adott hónap még nincs közzétéve, null. */
export function navAr(adat, ev, honap, kulcs, vedett = false) {
  const h = adat.uzemanyag.evek?.[ev]?.[honap];
  if (!h) return null;
  if (vedett && h[kulcs + '_vedett']) return { ar: h[kulcs + '_vedett'], vedett: true };
  return h[kulcs] != null ? { ar: h[kulcs], vedett: false } : null;
}

/** A legutóbbi hónap, amelyre van NAV-ár. */
export function legfrissebbHonap(adat) {
  const evek = Object.keys(adat.uzemanyag.evek).map(Number).sort((a, b) => b - a);
  for (const ev of evek) {
    const h = Object.keys(adat.uzemanyag.evek[ev]).map(Number).sort((a, b) => b - a);
    if (h.length) return { ev, honap: h[0] };
  }
  return null;
}

/**
 * @param b { km, odaVissza, uzemanyag, motor, cm3, ev, honap, vedett, sajatAr }
 */
export function kikuldetes(adat, b) {
  const km = Number(b.km);
  if (!(km > 0)) return { hiba: 'Add meg a távolságot.' };
  if (!(Number(b.cm3) > 0) && b.uzemanyag !== 'elektromos') return { hiba: 'Add meg a hengerűrtartalmat.' };
  const n = kmNorma(adat, b);
  let ar, arForras;
  if (Number(b.sajatAr) > 0) { ar = Number(b.sajatAr); arForras = 'saját (számla szerinti) ár'; }
  else {
    const na = navAr(adat, b.ev, b.honap, n.arKulcs, b.vedett);
    if (!na) return { hiba: `A ${b.ev}. ${HONAPOK[b.honap - 1]}i NAV-ár még nem jelent meg. Válassz korábbi hónapot, vagy add meg a saját árat.` };
    ar = na.ar; arForras = `NAV, ${b.ev}. ${HONAPOK[b.honap - 1]}${na.vedett ? ', védett ár' : ''}`;
  }
  const tav = km * (b.odaVissza ? 2 : 1);
  const mennyiseg = tav * n.norma / 100;
  const uzemanyagFt = ft(mennyiseg * ar);
  const normakoltseg = ft(tav * adat.szabalyok.km.normakoltseg_ft_km);
  const osszesen = uzemanyagFt + normakoltseg;
  return { tav, norma: n.norma, egyseg: n.egyseg, normaLeiras: n.leiras, ar, arForras, arKulcs: n.arKulcs, mennyiseg, uzemanyagFt, normakoltseg, osszesen, ftKm: osszesen / tav };
}

/** Munkába járás saját autóval: oda-vissza távolság × munkanapok × km-díj. */
export function munkabaJaras(adat, b) {
  const km = Number(b.km), napok = Number(b.napok);
  if (!(km > 0)) return { hiba: 'Add meg a lakóhely és a munkahely távolságát.' };
  if (!(napok > 0)) return { hiba: 'Add meg a munkába járós napok számát.' };
  const dij = adat.szabalyok.km.munkaba_jaras_ft_km;
  const haviKm = km * 2 * napok;
  const havi = ft(haviKm * dij);
  return { dij, haviKm, havi, eves: havi * 12 };
}
