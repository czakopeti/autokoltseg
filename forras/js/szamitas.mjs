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

/* ---------------- Benzines vagy villany: teljes költség időben ---------------- */

/** Maradványérték: az első 3 évben a 3 éves értékhez vezető egyenletes ütem, utána évi fix csökkenés. */
export function ertekNEvMulva(ar, hajtas, evek, f) {
  const m = f.maradvany[hajtas] || f.maradvany.benzin;
  const r3 = m.harom / 100, d = m.evi / 100;
  return evek <= 3 ? ar * Math.pow(r3, evek / 3) : ar * r3 * Math.pow(1 - d, evek - 3);
}

/** Otthoni töltés átlagára a 2523 kWh-s kedvezményes sáv figyelembevételével (határköltség). */
export function otthoniAr(f, otthoniKwhEv) {
  // Ha a háztartás fogyasztását nem adják meg, úgy vesszük, hogy a kedvezményes sáv már elfogyott
  const haztartas = f.haztartas === '' || f.haztartas == null ? f.sav_kwh : Number(f.haztartas);
  const szabad = Math.max(0, f.sav_kwh - haztartas);
  if (otthoniKwhEv <= 0) return f.aram_kedv;
  const kedv = Math.min(otthoniKwhEv, szabad);
  return (kedv * f.aram_kedv + (otthoniKwhEv - kedv) * f.aram_piaci) / otthoniKwhEv;
}

/** Egy autó éves energiaköltsége és részletei. */
export function energiaEv(auto, km, f) {
  const h = auto.hajtas;
  const fogy = Number(auto.fogyasztas) || 0;
  const vesz = 1 + f.veszteseg / 100;
  if (h === 'elektromos' || h === 'plugin') {
    const villanyArany = h === 'plugin' ? (Number(auto.villanyArany) || 0) / 100 : 1;
    const kwh = km * villanyArany * (Number(h === 'plugin' ? auto.kwh : fogy) || 0) / 100 * vesz;
    const otthon = kwh * f.otthoni / 100, kozt = kwh - otthon;
    const oAr = otthoniAr(f, otthon);
    let ft = otthon * oAr + kozt * f.tolto;
    let liter = 0;
    if (h === 'plugin') { liter = km * (1 - villanyArany) * fogy / 100; ft += liter * f.benzin; }
    return { ft, kwh, liter, otthoniAr: oAr };
  }
  const ar = h === 'dizel' ? f.dizel : f.benzin;
  const liter = km * fogy / 100;
  return { ft: liter * ar, liter, kwh: 0 };
}

const CEG_SOR = (kw) => (kw <= 50 ? 0 : kw <= 90 ? 1 : kw <= 120 ? 2 : 3);

/**
 * Két (vagy több) autó teljes költsége az évek során.
 * b: { km, evek, ceges, autok: [{ nev, hajtas, ar, fogyasztas, kwh, villanyArany, kw, szerviz, biztositas, eladasiAr }], f: feltevések, ev }
 */
export function osszehasonlitas(adat, b) {
  const km = Number(b.km), N = Number(b.evek);
  if (!(km > 0)) return { hiba: 'Add meg, évente hány kilométert autózol.' };
  const eredm = [];
  for (const [i, a] of b.autok.entries()) {
    const nev = a.nev || (i === 0 ? 'A autó' : 'B autó');
    const ar = Number(a.ar), kw = Number(a.kw);
    if (!(ar > 0)) return { hiba: `${nev}: add meg a vételárat.` };
    if (!(kw > 0)) return { hiba: `${nev}: add meg a teljesítményt (P.2).` };
    if (!(Number(a.fogyasztas) > 0) && !(a.hajtas === 'plugin' && Number(a.kwh) > 0)) return { hiba: `${nev}: add meg a fogyasztást.` };
    const gjH = a.hajtas === 'elektromos' ? 'elektromos' : a.hajtas === 'plugin' ? 'plugin' : 'hagyomanyos';
    const ilH = a.hajtas === 'benzin' || a.hajtas === 'dizel' ? 'hagyomanyos' : a.hajtas;
    const ill = illetek(adat, { ev: b.ev, kw, gyartasiEv: b.ev, hajtas: ilH, szerzes: 'vetel' }).osszeg;
    const en = energiaEv(a, km, b.f);
    const fix = (Number(a.szerviz) || 0) + (Number(a.biztositas) || 0);
    const evek = [];
    const ismertEvek = Object.keys(adat.tetelek.gepjarmuado).map(Number);
    const utolso = Math.max(...ismertEvek);
    let gjOssz = 0, cegOssz = 0;
    for (let t = 0; t < N; t++) {
      const ev = b.ev + t;
      const tetelEv = Math.min(ev, utolso);
      const gjr = gepjarmuado(adat, { ev: tetelEv, kw, gyartasiEv: b.ev - (ev - tetelEv), hajtas: gjH });
      const gj = gjr.hiba ? 0 : gjr.fizetendo;
      let ceg = 0;
      if (b.ceges && a.hajtas !== 'elektromos') {
        const ct = evAdat(adat.tetelek.cegautoado, tetelEv);
        ceg = Math.max(0, ct.tabla[CEG_SOR(kw)][2] * 12 - gj);
      }
      gjOssz += gj; cegOssz += ceg;
      evek.push({ ev, gj, ceg, energia: en.ft, fix });
    }
    const eladas = Number(a.eladasiAr) > 0 ? Number(a.eladasiAr) : ertekNEvMulva(ar, a.hajtas, N, b.f);
    // Havi lépésű halmozott költség a grafikonhoz és a megtérüléshez
    const havi = [];
    let halmozott = ill;
    for (let m = 0; m <= N * 12; m++) {
      if (m > 0) { const y = evek[Math.min(N - 1, Math.floor((m - 1) / 12))]; halmozott += (y.energia + y.fix + y.gj + y.ceg) / 12; }
      const ertek = Number(a.eladasiAr) > 0 && N > 0 ? ar - (ar - eladas) * (m / (N * 12)) : ertekNEvMulva(ar, a.hajtas, m / 12, b.f);
      havi.push(halmozott + ar - ertek);
    }
    const ertekvesztes = ar - eladas;
    const energia = en.ft * N;
    const fixOssz = fix * N;
    const adok = ill + gjOssz + cegOssz;
    const osszesen = ertekvesztes + energia + fixOssz + adok;
    eredm.push({
      nev, hajtas: a.hajtas, ar, eladas, ertekvesztes, energia, fixOssz, adok, ill, gjOssz, cegOssz, osszesen,
      ftKm: osszesen / (km * N), havi, energiaHavi: en.ft / 12, kwhEv: en.kwh, literEv: en.liter, otthoniAr: en.otthoniAr,
      szaz: en.ft / km * 100,
      futoHavi: (en.ft + fix + (evek[0]?.gj || 0) + (evek[0]?.ceg || 0)) / 12,
      gjElso: evek[0]?.gj || 0, cegElso: evek[0]?.ceg || 0, fixHavi: fix / 12,
    });
  }
  // Megtérülés: az a hónap, amelytől a végén olcsóbb autó halmozott költsége végig a másik alatt marad
  const [A, B] = eredm;
  let megterul = null;
  if (A && B) {
    const diff = A.havi.map((v, m) => v - B.havi[m]);
    const vegso = Math.sign(diff[diff.length - 1]);
    if (vegso !== 0) {
      let m = diff.length - 1;
      while (m > 0 && Math.sign(diff[m - 1]) === vegso) m--;
      if (m > 0) megterul = { auto: vegso > 0 ? 1 : 0, honap: m };
    }
    // Évi km, amely fölött B (vagy A) olcsóbb ugyanennyi év alatt: a költség km-ben lineáris
    const vA = A.energia / (km * N), vB = B.energia / (km * N);
    const fA = A.osszesen - A.energia, fB = B.osszesen - B.energia;
    const hatarKm = vA !== vB ? (fB - fA) / ((vA - vB) * N) : null;
    return { km, evek: N, autok: eredm, megterul, hatarKm: hatarKm > 0 ? hatarKm : null, olcsobb: A.osszesen <= B.osszesen ? 0 : 1, kulonbseg: Math.abs(A.osszesen - B.osszesen), f: b.f, sajatEladas: eredm.map((x, i) => Number(b.autok[i].eladasiAr) > 0) };
  }
  return { km, evek: N, autok: eredm };
}

/* ---------------- Fenntartás: mennyibe kerül havonta a saját autó ---------------- */
export function fenntartas(adat, b) {
  const km = Number(b.km);
  if (!(km > 0)) return { hiba: 'Add meg, évente hány kilométert autózol.' };
  const kw = Number(b.kw), gy = Number(b.gyartasiEv);
  if (!(kw > 0)) return { hiba: 'Add meg a teljesítményt (P.2).' };
  if (!(gy > 1900)) return { hiba: 'Add meg a gyártási évet.' };
  if (!(Number(b.fogyasztas) > 0)) return { hiba: 'Add meg a fogyasztást.' };
  const gjH = b.hajtas === 'elektromos' ? 'elektromos' : b.hajtas === 'plugin' ? 'plugin' : 'hagyomanyos';
  const gj = gepjarmuado(adat, { ev: b.ev, kw, gyartasiEv: gy, hajtas: gjH, phevRegi: false });
  const en = energiaEv({ hajtas: b.hajtas, fogyasztas: b.fogyasztas, kwh: b.fogyasztas, villanyArany: 0 }, km, b.f);
  const ertek = Number(b.ertek) || 0, ertekVeg = Number(b.ertekVeg) || 0, evekTartja = Number(b.tartja) || 0;
  // Ha megadod, mennyiért adnád el és mikor, abból számolunk. Ha csak a mostani értéket, akkor a hajtás
  // szerinti átlagos éves értékvesztéssel (DAT/KSH, szabalyok.json → maradvany) becsülünk.
  let ertekvesztes = 0, ertekBecsles = false, ertekEvi = 0;
  if (ertek > 0 && evekTartja > 0 && ertekVeg > 0) ertekvesztes = Math.max(0, (ertek - ertekVeg) / evekTartja);
  else if (ertek > 0 && b.f?.maradvany) {
    const m = b.f.maradvany[b.hajtas] || b.f.maradvany.benzin;
    ertekvesztes = ertek * (m.evi / 100);
    ertekBecsles = true;
    ertekEvi = m.evi;
  }
  const tetelek = [
    { kulcs: 'energia', nev: b.hajtas === 'elektromos' ? 'Töltés' : 'Üzemanyag', ev: en.ft },
    { kulcs: 'ertekvesztes', nev: 'Értékvesztés', ev: ertekvesztes },
    { kulcs: 'biztositas', nev: 'Biztosítás', ev: Number(b.biztositas) || 0 },
    { kulcs: 'szerviz', nev: 'Szerviz és javítás', ev: Number(b.szerviz) || 0 },
    { kulcs: 'gumi', nev: 'Gumi', ev: Number(b.gumi) || 0 },
    { kulcs: 'gjado', nev: 'Gépjárműadó', ev: gj.hiba ? 0 : gj.fizetendo },
    { kulcs: 'egyeb', nev: 'Matrica, parkolás, egyéb', ev: Number(b.egyeb) || 0 },
  ];
  const ev = tetelek.reduce((s, t) => s + t.ev, 0);
  const csoport = (k) => tetelek.filter((t) => k.includes(t.kulcs)).reduce((x, t) => x + t.ev, 0);
  const hasznalat = csoport(['energia', 'szerviz', 'gumi']), allo = csoport(['biztositas', 'gjado', 'egyeb']);
  return { tetelek, ev, havi: ev / 12, ftKm: ev / km, km, gj, ertekvesztes, ertekBecsles, ertekEvi, hasznalat, allo, plusKm: (en.ft + (Number(b.szerviz) || 0) + (Number(b.gumi) || 0)) / km };
}

/* ---------------- Összeg betűvel (szerződéshez) ---------------- */
const EGY = ['', 'egy', 'két', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc'];
const TIZ = ['', 'tizen', 'huszon', 'harminc', 'negyven', 'ötven', 'hatvan', 'hetven', 'nyolcvan', 'kilencven'];
function harom(n, vegso) {
  const s = Math.floor(n / 100), r = n % 100, t = Math.floor(r / 10), e = r % 10;
  let x = s ? (s === 1 ? 'száz' : `${EGY[s]}száz`) : '';
  if (e === 0) x += t === 1 ? 'tíz' : t === 2 ? 'húsz' : TIZ[t];
  else x += TIZ[t] + (e === 2 && vegso ? 'kettő' : EGY[e]);
  return x;
}
/** 1 500 000 → „egymillió-ötszázezer”; 1 999 → „ezerkilencszázkilencvenkilenc”. */
export function betuvel(n) {
  n = Math.floor(Math.abs(Number(n)));
  if (!n) return 'nulla';
  const mrd = Math.floor(n / 1e9), mil = Math.floor((n % 1e9) / 1e6), ezr = Math.floor((n % 1e6) / 1e3), egys = n % 1e3;
  const reszek = [];
  if (mrd) reszek.push(`${harom(mrd, false)}milliárd`);
  if (mil) reszek.push(`${harom(mil, false)}millió`);
  if (ezr) reszek.push(n < 2000 ? 'ezer' : `${harom(ezr, false)}ezer`);
  if (egys) reszek.push(harom(egys, true));
  return n > 2000 ? reszek.join('-') : reszek.join('');
}

/* ---------------- Plug-in hibrid: 2026 és 2027 ---------------- */
/**
 * Mit fizet egy plug-in hibrid 2026-ban és 2027-ben.
 * b: { kw, gyartasiEv, regi: 2025.01.01. előtt forgalomba helyezve, zold: zöld rendszáma van, ceges, parkolasHavi }
 * A zöld rendszámot 2026. november 30-ig le kell cserélni, ezért 2026 decemberében már nincs ingyenes parkolás.
 */
export function phev(adat, b) {
  const kw = Math.round(Number(b.kw)), gy = Number(b.gyartasiEv);
  if (!(kw > 0)) return { hiba: 'Add meg a teljesítményt (P.2).' };
  if (!(gy > 1900)) return { hiba: 'Add meg a gyártási évet.' };
  const p = adat.szabalyok.phev;
  const park = b.zold ? Math.max(0, Number(b.parkolasHavi) || 0) : 0;
  const evek = [2026, 2027].map((ev) => {
    const gj = gepjarmuado(adat, { ev, kw, gyartasiEv: gy, hajtas: 'plugin', phevRegi: !!b.regi });
    if (gj.hiba) return { ev, hiba: gj.hiba };
    let ceg = 0, cegMentes = false, cegHavi = 0;
    if (b.ceges) {
      if (b.regi && ev <= 2026) cegMentes = true;
      else {
        const ct = evAdat(adat.tetelek.cegautoado, ev);
        cegHavi = ct.tabla[CEG_SOR(kw)][2];
        ceg = Math.max(0, cegHavi * 12 - gj.fizetendo);
      }
    }
    const parkolas = ev === 2026 ? park : park * 12;
    const egyszeri = ev === 2026 && b.zold ? p.rendszam_uj_karakter_ft : 0;
    return { ev, gj, ceg, cegMentes, cegHavi, parkolas, egyszeri, osszes: gj.fizetendo + ceg + parkolas + egyszeri, rendszeres: gj.fizetendo + ceg + (ev === 2026 ? 0 : park * 12) };
  });
  const hiba = evek.find((x) => x.hiba);
  if (hiba) return { hiba: hiba.hiba };
  const [a, c] = evek;
  return { kw, gy, regi: !!b.regi, zold: !!b.zold, ceges: !!b.ceges, park, evek, kulonbseg: c.rendszeres - a.rendszeres, ev2027: c.rendszeres };
}

/* ---------------- Autópálya-matrica ---------------- */
const ezres = (x) => new Intl.NumberFormat('hu-HU', { useGrouping: 'always' }).format(Math.round(x));
/**
 * A legolcsóbb matrica-kombináció egy évre, személyautóval (D1).
 * b: { napi, tiznapos, havi: alkalmi utak száma, varmegyek: rendszeresen használt vármegyék száma, m1: mind az M1 menti négy vármegyében van }
 */
export function matrica(adat, b) {
  const d = adat.szabalyok.matrica.d1;
  const n = (x) => Math.max(0, Math.round(Number(x) || 0));
  const napi = n(b.napi), tiz = n(b.tiznapos), havi = n(b.havi), vm = n(b.varmegyek);
  if (!napi && !tiz && !havi && !vm) return { hiba: 'Add meg, évente hányszor és hol autópályázol.' };
  const alkalmi = napi * d.napi + tiz * d.tiznapos + havi * d.havi;
  const alkalmiAl = [napi && `${napi} napi`, tiz && `${tiz} tíznapos`, havi && `${havi} havi`].filter(Boolean).join(', ');
  const lehetosegek = [{ kulcs: 'eves', nev: 'Éves országos matrica', ft: d.eves, al: `minden díjköteles útra, ${adat.szabalyok.matrica.eves_ervenyes}` }];
  if (vm) {
    const varm = vm * d.varmegyei;
    const m1 = b.m1 && d.m1_regionalis < varm;
    const rendszeres = m1 ? d.m1_regionalis : varm;
    lehetosegek.push({ kulcs: m1 ? 'm1' : 'varmegyei', nev: `${m1 ? 'M1 regionális matrica' : `${vm} vármegyei matrica`}${alkalmi ? ' és alkalmi matricák' : ''}`, ft: rendszeres + alkalmi, al: [m1 ? 'a négy M1 menti vármegyére' : `vármegyénként ${ezres(d.varmegyei)} Ft`, alkalmiAl].filter(Boolean).join(', ') });
  } else {
    lehetosegek.push({ kulcs: 'alkalmi', nev: 'Alkalmi matricák', ft: alkalmi, al: alkalmiAl });
  }
  lehetosegek.sort((x, y) => x.ft - y.ft);
  const legjobb = lehetosegek[0];
  return {
    napi, tiz, havi, vm, alkalmi, lehetosegek, legjobb, megtakaritas: lehetosegek[1].ft - legjobb.ft,
    hatar: { napi: Math.ceil(d.eves / d.napi), tiznapos: Math.ceil(d.eves / d.tiznapos), havi: Math.ceil(d.eves / d.havi), varmegyei: Math.ceil(d.eves / d.varmegyei) },
  };
}

/* ---------------- Autóvásárlás hitelből ---------------- */
/** Havi törlesztő THM-ből (a THM éves, tényleges kamatláb: a havi ráta (1+THM)^(1/12)−1). */
export function torleszto(hitel, honapok, thm) {
  const r = Math.pow(1 + thm / 100, 1 / 12) - 1;
  return r > 0 ? hitel * r / (1 - Math.pow(1 + r, -honapok)) : hitel / honapok;
}
/**
 * b: { ar, onero, evek, thm, kw, gyartasiEv, hajtas, ev, datum }
 * A valódi költség: önerő + összes törlesztő + átírás − amennyit az autó a futamidő végén ér.
 */
export function autohitel(adat, b) {
  const ar = Number(b.ar), onero = Math.max(0, Number(b.onero) || 0), evek = Number(b.evek), thm = Number(b.thm);
  if (!(ar > 0)) return { hiba: 'Add meg a vételárat.' };
  if (onero >= ar) return { hiba: 'Az önerő eléri a vételárat, így nincs szükség hitelre.' };
  if (!(evek > 0)) return { hiba: 'Add meg a futamidőt.' };
  if (!(thm >= 0) || b.thm === '' || b.thm == null) return { hiba: 'Add meg a THM-et a bank ajánlatából.' };
  const hitel = ar - onero, honapok = Math.round(evek * 12);
  const havi = torleszto(hitel, honapok, thm);
  const visszafizet = havi * honapok, kamat = visszafizet - hitel;
  const hfm = hitel / ar * 100, h = adat.szabalyok.hitel;
  const kw = Number(b.kw), gy = Number(b.gyartasiEv), hajtas = b.hajtas || 'benzin';
  let atirasFt = 0, at = null;
  if (kw > 0 && gy > 1900) {
    at = atiras(adat, { ev: b.ev, datum: b.datum, kw, gyartasiEv: gy, hajtas: hajtas === 'benzin' || hajtas === 'dizel' ? 'hagyomanyos' : hajtas, szerzes: 'vetel' });
    if (!at.hiba) atirasFt = at.osszesen; else at = null;
  }
  // Értékvesztés: a hajtás szerinti átlagos görbéből, az autó mostani korától a futamidő végéig (becslés)
  let ertekVeg = null;
  if (gy > 1900) {
    const f = { maradvany: adat.szabalyok.maradvany };
    const kor = Math.max(0, b.ev - gy);
    const v = (t) => ertekNEvMulva(1, hajtas, t, f);
    ertekVeg = ar * v(kor + evek) / v(kor);
  }
  const valodi = onero + visszafizet + atirasFt - (ertekVeg ?? 0);
  return { ar, onero, hitel, evek, honapok, thm, havi, visszafizet, kamat, hfm, hfmTul: hfm > h.hfm_hitel, hfmLizingTul: hfm > h.hfm_lizing, atirasFt, at, ertekVeg, ertekvesztes: ertekVeg == null ? null : ar - ertekVeg, valodi, valodiHavi: valodi / honapok };
}
