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
  // Mi történt az autóval az adóévben (NAV GYIK, Gjt. 2–3. §):
  //   uj      – az adóévben helyezték forgalomba a nevén: a következő hónaptól, időarányosan
  //   vett    – használtan vette: az egész évit az fizeti, aki január 1-jén a nyilvántartásban szerepelt
  //   eladta  – eladta: az egész évit ő fizeti, a vevő a következő évtől
  //   kivonta – kivonták a forgalomból: a kivonás hónapjának végéig, a többi túlfizetésként visszajár
  const valtozas = b.valtozas || (Number(b.evkozbenHonap) ? 'uj' : '');
  const honap = Math.min(12, Math.max(1, Number(b.evkozbenHonap) || 1));
  const kivonas = Math.min(12, Math.max(1, Number(b.kivonasHonap) || 12));
  const honapok = valtozas === 'uj' ? 12 - honap : valtozas === 'kivonta' ? kivonas : valtozas === 'vett' ? 0 : 12;

  let mentes = null;
  if (b.hajtas === 'elektromos') mentes = 'A tisztán elektromos („5E”) és a nulla emissziós („5Z”) autó mentes a gépjárműadó alól.';
  else if (b.hajtas === 'plugin' && b.phevRegi && b.ev <= 2026) mentes = 'A 2025. január 1. előtt forgalomba helyezett, „5P” vagy „5N” jelzésű plug-in hibrid 2026. december 31-ig mentes.';

  const aranyosOsszeg = ft(evesTeljes * honapok / 12);
  let kedvezmeny = 0;
  const mk = adat.tetelek.gepjarmuado_mozgaskorlatozott;
  let mkMegjegyzes = null;
  if (!mentes && b.mozgaskorlatozott) {
    if (kw <= mk.max_kw) kedvezmeny = Math.min(mk.max_ft, aranyosOsszeg);
    else mkMegjegyzes = `A kedvezmény csak ${mk.max_kw} kW-ig jár, ennél erősebb autóra nem.`;
  }
  const fizetendo = mentes ? 0 : aranyosOsszeg - kedvezmeny;
  const hatarido = valtozas === 'uj' ? 'a NAV határozatában megadott időpontig' : valtozas === 'vett' ? null : `${b.ev}. április 15-ig, egy összegben`;
  return {
    ev: b.ev, kw, kor, sav, ftKw, honapok, evesTeljes, valtozas, kivonas, honap,
    aranyos: mentes ? 0 : aranyosOsszeg, kedvezmeny, mkMegjegyzes, mentes,
    fizetendo, havi: ft(fizetendo / 12), hatarido,
  };
}

/** Ugyanannak az autónak az adója minden olyan évre, amelyre van tétel (a megadott évtől). */
export function gjadoEvek(adat, b) {
  return Object.keys(adat.tetelek.gepjarmuado).map(Number).sort().map((ev) => gepjarmuado(adat, { ...b, ev, evkozbenHonap: 0, valtozas: '', kivonasHonap: 0 }));
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
  if (rg) {
    // A behozott autó első hazai forgalomba helyezésének hatósági díjai
    if (o.szarmazasellenorzes) tetelek.push({ nev: 'Származásellenőrzés', ft: o.szarmazasellenorzes, kulcs: 'szarmazas' });
    if (o.rendszamtabla_par) tetelek.push({ nev: 'Rendszámtábla (1 pár)', ft: o.rendszamtabla_par, kulcs: 'rendszam' });
  }
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

/* ---------------- Útiköltség: mennyibe kerül egy út üzemanyagban vagy áramban ---------------- */

/** Az útiköltség-kalkulátor üzemanyagai: a NAV-ár kulcsa és a fogyasztás mértékegysége. */
export const UTI_UZEMANYAG = {
  benzin: { nev: 'benzin', arKulcs: 'benzin', egyseg: 'l', min: 1, max: 40 },
  dizel: { nev: 'dízel', arKulcs: 'dizel', egyseg: 'l', min: 1, max: 40 },
  lpg: { nev: 'LPG', arKulcs: 'lpg', egyseg: 'l', min: 1, max: 40 },
  elektromos: { nev: 'áram', arKulcs: null, egyseg: 'kWh', min: 5, max: 60 },
};
/** Hol tölt a villanyautó: melyik árral számolunk (a szabalyok.energia értékei). */
export const UTI_TOLTES = { otthon: 'aram_kedv', otthonPiaci: 'aram_piaci', tolto: 'tolto' };

/**
 * b: { km, odaVissza, uzemanyag, fogyasztas, ev, honap, vedett, toltes, sajatAr, utasok, egyeb, alkalom, f: { aram_kedv, aram_piaci, tolto, veszteseg } }
 * A fogyasztás l/100 km (benzin, dízel, LPG) vagy kWh/100 km (villany, a kijelzőn látott érték; a töltési veszteséget mi tesszük hozzá).
 */
export function utikoltseg(adat, b) {
  const km = Number(b.km);
  if (!(km > 0)) return { hiba: 'Add meg a távolságot.' };
  if (km > 20000) return { hiba: 'Ellenőrizd a távolságot: egy útra legfeljebb 20 000 km-rel számolunk.' };
  const u = UTI_UZEMANYAG[b.uzemanyag];
  if (!u) return { hiba: 'Válaszd ki, mivel megy az autó.' };
  const fogy = Number(b.fogyasztas);
  if (!(fogy > 0)) return { hiba: `Add meg a fogyasztást (${u.egyseg}/100 km).` };
  if (fogy < u.min || fogy > u.max) return { hiba: `Ellenőrizd a fogyasztást: 100 km-re ${u.egyseg === 'l' ? 'literben' : 'kWh-ban'} kérjük, ${u.min} és ${u.max} között.` };
  const utasok = b.utasok === '' || b.utasok == null ? 1 : Number(b.utasok);
  if (!(Number.isInteger(utasok) && utasok >= 1 && utasok <= 9)) return { hiba: 'Az utasok száma 1 és 9 között lehet, a sofőrrel együtt.' };
  const egyeb = Number(b.egyeb) || 0;
  if (egyeb < 0) return { hiba: 'Az egyéb költség nem lehet negatív.' };
  const alkalom = b.alkalom === '' || b.alkalom == null ? 0 : Number(b.alkalom);
  if (!(alkalom >= 0 && alkalom <= 62)) return { hiba: 'Havonta legfeljebb 62 alkalommal számolunk.' };

  const tav = km * (b.odaVissza ? 2 : 1);
  let ar, arForras, arTipus, veszteseg = 0;
  if (Number(b.sajatAr) > 0) {
    ar = Number(b.sajatAr); arForras = 'saját ár'; arTipus = 'sajat';
  } else if (u.arKulcs) {
    const na = navAr(adat, b.ev, b.honap, u.arKulcs, b.vedett);
    if (!na) return { hiba: 'Ehhez a hónaphoz még nincs NAV-ár. Add meg a saját árat.' };
    ar = na.ar; arForras = `NAV, ${b.ev}. ${HONAPOK[b.honap - 1]}${na.vedett ? ', védett ár' : ''}`; arTipus = 'hivatalos';
  } else {
    const kulcs = UTI_TOLTES[b.toltes] || UTI_TOLTES.otthon;
    ar = Number(b.f?.[kulcs]);
    if (!(ar > 0)) return { hiba: 'Hiányzik az áramár. Add meg a saját árat.' };
    arForras = { aram_kedv: 'otthoni töltés, kedvezményes áram', aram_piaci: 'otthoni töltés, piaci áram', tolto: 'nyilvános töltő, átlagár' }[kulcs]; arTipus = 'becsles';
  }
  if (!u.arKulcs) veszteseg = Number(b.f?.veszteseg) || 0;
  const mennyiseg = (tav * fogy / 100) * (1 + veszteseg / 100);
  const energiaFt = Math.round(mennyiseg * ar);
  const osszesen = energiaFt + Math.round(egyeb);
  const res = { tav, fogyasztas: fogy, egyseg: u.egyseg, uzemanyagNev: u.nev, mennyiseg, veszteseg, ar, arForras, arTipus, energiaFt, egyeb: Math.round(egyeb), osszesen, utasok, fejenkent: Math.round(osszesen / utasok), ftKm: energiaFt / tav };
  if (alkalom > 0) { res.alkalom = alkalom; res.havi = osszesen * alkalom; res.eves = res.havi * 12; }
  return res;
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
/** Az ismert matricaévek (a megadott évtől), és egy év díjai: { ev, d1, potdij, kozzeteve }. */
export const matricaEvek = (adat, tol = 0) => Object.keys(adat.szabalyok.matrica.evek).map(Number).filter((e) => e >= tol).sort();
export function matricaEv(adat, ev) {
  const evek = matricaEvek(adat);
  const e = evek.includes(Number(ev)) ? Number(ev) : evek.filter((x) => x <= Number(ev)).pop() ?? evek[0];
  return { ev: e, ...adat.szabalyok.matrica.evek[e] };
}
/**
 * A legolcsóbb matrica-kombináció egy évre, személyautóval (D1).
 * b: { ev, napi, tiznapos, havi: alkalmi utak száma, varmegyek: rendszeresen használt vármegyék száma, m1: mind az M1 menti négy vármegyében van }
 */
export function matrica(adat, b) {
  const me = matricaEv(adat, b.ev ?? adat.ev);
  const d = me.d1;
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
    ev: me.ev, napi, tiz, havi, vm, alkalmi, lehetosegek, legjobb, megtakaritas: lehetosegek[1].ft - legjobb.ft,
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

/* ---------------- Kötelező biztosítás: évfordulós váltás ---------------- */
const napEltol = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const napKulonbseg = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 864e5);
const hetNapja = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 vasárnap, 6 szombat

/** A következő bekövetkező évforduló a megadott napból (ha a dátum már elmúlt, a következő évi). */
export function kovetkezoEvforduló(evforduloIso, ma) {
  const [, h, n] = evforduloIso.split('-').map(Number);
  let ev = Number(ma.slice(0, 4));
  // Február 29-i évforduló nem szökőévben február 28-án van (Ptk.: ha a hónapban nincs megfelelő nap, a hónap utolsó napja)
  const d = (e) => `${e}-${String(h).padStart(2, '0')}-${String(h === 2 && n === 29 && !szokoev(e) ? 28 : n).padStart(2, '0')}`;
  if (d(ev) <= ma) ev += 1;
  return d(ev);
}

/**
 * b: { evfordulo: 'YYYY-MM-DD' (az új biztosítási időszak kezdőnapja, csak a hónap és a nap számít), ma, osztaly: 'B10', karok: 0..4, nap270: bool }
 * Az MNB példája: január 1-jei évfordulónál a felmondásnak december 1-jéig kell beérkeznie, vagyis a kezdőnap előtt 31 nappal.
 */
export function kgfb(adat, b) {
  const k = adat.szabalyok.kgfb;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.evfordulo || '')) return { hiba: 'Add meg a biztosítási évfordulót (a kötvényen szerepel).' };
  const kezdet = kovetkezoEvforduló(b.evfordulo, b.ma);
  const felmondas = napEltol(kezdet, -k.felmondas_nap);
  const ertesites = napEltol(kezdet, -k.ertesites_nap);
  const ajanlat = napEltol(kezdet, -k.ajanlat_legkorabban_nap);
  const hatra = napKulonbseg(b.ma, felmondas);
  const elkesett = hatra < 0;
  const r = { kezdet, felmondas, ertesites, ajanlat, hatra, elkesett, hetvege: [0, 6].includes(hetNapja(felmondas)) };
  if (elkesett) {
    r.kovetkezo = `${Number(kezdet.slice(0, 4)) + 1}${kezdet.slice(4)}`;
    r.kovetkezoFelmondas = napEltol(r.kovetkezo, -k.felmondas_nap);
  }
  if (b.osztaly) r.bm = bonusMalus(adat, b.osztaly, Number(b.karok) || 0, b.nap270 !== false);
  return r;
}

/** A következő időszak bonus-malus osztálya: kármentes év +1, minden kár −2, négy vagy több kár: M4. */
export function bonusMalus(adat, osztaly, karok, nap270 = true) {
  const k = adat.szabalyok.kgfb, o = k.bm_osztalyok;
  const i = o.indexOf(osztaly);
  if (i < 0) return { hiba: 'Ismeretlen osztály.' };
  let j;
  if (karok >= 4) j = o.indexOf(k.bm_negy_kar);
  else if (karok > 0) j = Math.max(0, i - k.bm_kar_visszaeses * karok);
  else j = nap270 ? Math.min(o.length - 1, i + 1) : i;
  return { most: osztaly, uj: o[j], valtozas: j - i, karok, nap270 };
}

/* ---------------- Megjavítsam vagy cseréljem? ---------------- */
/**
 * Két út N év alatt, mindkettő teljes költséggel és a végén megmaradó autóértékkel.
 * b: { ev, datum, evek, a: { gyartasiEv, hajtas, ertekMost, javitas, ertekJavitva, fenntartas }, c: { ar, gyartasiEv, hajtas, kw, fenntartas } }
 */
export function javitasVagyCsere(adat, b) {
  const N = Number(b.evek) || 3;
  const a = b.a, c = b.c;
  const szam = (x) => Number(x) || 0;
  if (!(szam(a.ertekMost) >= 0) || !(szam(a.javitas) > 0)) return { hiba: 'Add meg, mennyibe kerül a javítás.' };
  if (!(szam(c.ar) > 0)) return { hiba: 'Add meg, mennyiért vennéd a másik autót.' };
  const f = { maradvany: adat.szabalyok.maradvany };
  const arany = (gy, h) => {
    const kor = Math.max(0, b.ev - (Number(gy) || b.ev));
    const v = (t) => ertekNEvMulva(1, h || 'benzin', t, f);
    return v(kor + N) / v(kor);
  };
  const ertekJavitva = szam(a.ertekJavitva) > 0 ? szam(a.ertekJavitva) : szam(a.ertekMost) + szam(a.javitas);
  const ertekJavitvaBecsles = !(szam(a.ertekJavitva) > 0);
  const regiArany = arany(a.gyartasiEv, a.hajtas);
  const regiVeg = ertekJavitva * regiArany;
  const ujVeg = szam(c.ar) * arany(c.gyartasiEv, c.hajtas);
  let atirasFt = 0;
  if (szam(c.kw) > 0 && szam(c.gyartasiEv) > 1900) {
    const at = atiras(adat, { ev: b.ev, datum: b.datum, kw: szam(c.kw), gyartasiEv: szam(c.gyartasiEv), hajtas: c.hajtas === 'benzin' || c.hajtas === 'dizel' || !c.hajtas ? 'hagyomanyos' : c.hajtas, szerzes: 'vetel' });
    if (!at.hiba) atirasFt = at.osszesen;
  }
  const tart = { javitas: szam(a.javitas), fenntartas: N * szam(a.fenntartas), vegErtek: regiVeg };
  tart.osszes = tart.javitas + tart.fenntartas - tart.vegErtek;
  const csere = { kulonbozet: szam(c.ar) - szam(a.ertekMost), atiras: atirasFt, fenntartas: N * szam(c.fenntartas), vegErtek: ujVeg };
  csere.osszes = csere.kulonbozet + csere.atiras + csere.fenntartas - csere.vegErtek;
  const olcsobb = tart.osszes <= csere.osszes ? 'tart' : 'csere';
  // Fordulópont: mennyit kell érnie a megjavított autónak, hogy a két út ugyanannyiba kerüljön.
  // A javítás utáni érték a legbizonytalanabb adat, ezért kiírjuk, honnan fordul át az eredmény.
  const fordulo = regiArany > 0 ? (tart.javitas + tart.fenntartas - csere.osszes) / regiArany : null;
  return { evek: N, tart, csere, olcsobb, kulonbseg: Math.abs(tart.osszes - csere.osszes), ertekJavitva, ertekJavitvaBecsles, ertekMost: szam(a.ertekMost), ar: szam(c.ar), fordulo };
}

/* ---------------- Vállalkozóknak: cégautóadó ---------------- */

// A környezetvédelmi osztályjelzés (forgalmi engedély V.9 sor) → a NAV-táblázat oszlopa.
// „0”–„4”: 0. oszlop, „6”–„10”: 1. oszlop, „5”, „14”, „15”: 2. oszlop. Az „5E”, „5Z” nem tartozik
// a cégautóadó alá; az „5P”, „5N” 2025-től igen, de a 2025 előtt forgalomba helyezettek 2026 végéig mentesek.
export const CEG_OSZTALYOK = {
  euro56: { oszlop: 2, nev: '„14” vagy „15” (Euro 5, Euro 6)' },
  hibrid: { oszlop: 2, nev: '„5” (hibrid, gáz)' },
  phev: { oszlop: 2, phev: true, nev: '„5P” vagy „5N” (plug-in vagy növelt hatótávú hibrid)' },
  villany: { mentes: true, nev: '„5E” vagy „5Z” (elektromos)' },
  euro34: { oszlop: 1, nev: '„6”–„10” (Euro 3, Euro 4)' },
  regi: { oszlop: 0, nev: '„0”–„4” (Euro 2 vagy régebbi)' },
};
export const CEG_SAVOK = ['0–50 kW', '51–90 kW', '91–120 kW', '120 kW felett'];

/** A gépjárműadó-kalkulátor hajtás-értéke az osztályjelzésből. */
const osztalyHajtas = (o) => (o.mentes ? 'elektromos' : o.phev ? 'plugin' : 'hagyomanyos');

/**
 * Cégautóadó egy évre (Gjt. IV. fejezet, NAV 31. füzet).
 * @param b { ev, kw, osztaly, gyartasiEv?, phevRegi?, valtozas?, honap? }
 *   valtozas: '' egész évben a cégé | 'uj' a cég nevére helyezték forgalomba | 'hasznalt' használtan vette | 'eladta' eladta
 *   honap: a változás hónapja (1–12). Vételnél a következő hónaptól, eladásnál az eladás hónapjáig jár az adó.
 * A gépjárműadó levonható (Gjt. 17/F §), ha ugyanarra az autóra, ugyanazokra a hónapokra ugyanaz az adóalany fizeti:
 * használtan vett autónál az idei gépjárműadót az eladó fizeti, ezért ott nincs levonás.
 */
export function cegautoado(adat, b) {
  const kw = Math.round(Number(b.kw));
  if (!(kw > 0)) return { hiba: 'Add meg a teljesítményt.' };
  const o = CEG_OSZTALYOK[b.osztaly];
  if (!o) return { hiba: 'Válaszd ki a környezetvédelmi osztályt.' };
  const ev = Number(b.ev);
  const valtozas = ['uj', 'hasznalt', 'eladta'].includes(b.valtozas) ? b.valtozas : '';
  const honap = Math.min(12, Math.max(1, Math.round(Number(b.honap) || 1)));
  const honapok = valtozas === 'eladta' ? honap : valtozas ? 12 - honap : 12;
  const alap = { ev, kw, osztaly: b.osztaly, osztalyNev: o.nev, honapok, valtozas, honap };
  if (o.mentes) return { ...alap, mentes: 'villany', havi: 0, teljes: 0, levonas: 0, fizetendo: 0 };
  if (o.phev && b.phevRegi && ev <= 2026) return { ...alap, mentes: 'phev', havi: 0, teljes: 0, levonas: 0, fizetendo: 0 };
  const t = evAdat(adat.tetelek.cegautoado, ev);
  if (!t) return { hiba: 'Erre az évre még nincs cégautóadó-tétel.' };
  const sav = CEG_SOR(kw);
  const havi = t.tabla[sav][o.oszlop];
  const teljes = havi * honapok;
  let gj = null, levonas = 0;
  const gy = Number(b.gyartasiEv);
  if (gy && valtozas !== 'hasznalt') {
    const g = gepjarmuado(adat, { ev, kw, gyartasiEv: gy, hajtas: osztalyHajtas(o), phevRegi: !!b.phevRegi, valtozas: valtozas === 'uj' ? 'uj' : '', evkozbenHonap: valtozas === 'uj' ? honap : 0 });
    if (g.hiba) return { hiba: g.hiba };
    gj = g;
    // új autónál a gépjárműadó is a következő hónaptól jár (g.fizetendo már arányos); eladásnál az egész évit a cég fizette, ebből az eladásig tartó hónapoké vonható le
    levonas = Math.min(teljes, valtozas === 'eladta' ? ft(g.fizetendo * honapok / 12) : g.fizetendo);
  }
  const fizetendo = teljes - levonas;
  const negyedev = honapok === 12 ? ft(fizetendo / 4) : null;
  return { ...alap, tetelEv: t.ev, kozzeteve: t.kozzeteve, forras: t.forras, sav, oszlop: o.oszlop, havi, teljes, gj, levonas, fizetendo, negyedev };
}

/* ---------------- Vállalkozóknak: cégautó vagy saját autó ---------------- */

/** 100 forint céges (adózás előtti) nyereségből ennyi jut osztalékként a tulajdonoshoz. */
export function osztalekArany(adat, szocho) {
  const v = adat.szabalyok.vallalkozo;
  return (1 - v.tao_kulcs) * (1 - v.osztalek_szja - (szocho ? v.szocho : 0));
}

/**
 * Kft. vagy bt. tulajdonosának két útja ugyanarra az autóra:
 *  A) cégautó: minden költséget a cég fizet, és cégautóadót fizet; a magánhasználat adómentes.
 *  B) saját autó: a költségeket te fizeted, a cég az üzleti utakra kiküldetési rendelvénnyel
 *     adómentes km-térítést fizet (60/1992. Korm. r. alapnorma × NAV-ár + 15 Ft/km), cégautóadó nélkül.
 * Közös mérce: mennyivel kevesebb pénz marad nálad. A céges forintot az osztalékként kivehető részével
 * (osztalekArany) váltjuk át, mert amit a cég az autóra költ, azt nem tudod osztalékként kivenni.
 * @param b { ev, kw, osztaly, gyartasiEv, phevRegi, uzemanyag, cm3, uzletiKm, ertekvesztes, energia, fix, szocho, arEv, arHonap }
 */
export function cegautoVagySajat(adat, b) {
  const o = CEG_OSZTALYOK[b.osztaly];
  if (!o) return { hiba: 'Válaszd ki a környezetvédelmi osztályt.' };
  const kw = Math.round(Number(b.kw)), gy = Number(b.gyartasiEv);
  if (!(kw > 0) || !gy) return { hiba: 'Add meg a teljesítményt és a gyártási évet.' };
  const uzletiKm = Math.max(0, Number(b.uzletiKm) || 0);
  const ertekvesztes = Math.max(0, Number(b.ertekvesztes) || 0);
  const energia = Math.max(0, Number(b.energia) || 0);
  const fix = Math.max(0, Number(b.fix) || 0);
  const C = ertekvesztes + energia + fix;
  if (!(C > 0)) return { hiba: 'Add meg az autó éves költségeit.' };

  const hajtas = osztalyHajtas(o);
  const gjr = gepjarmuado(adat, { ev: b.ev, kw, gyartasiEv: gy, hajtas, phevRegi: !!b.phevRegi });
  if (gjr.hiba) return { hiba: gjr.hiba };
  const gj = gjr.fizetendo;
  const ca = cegautoado(adat, { ev: b.ev, kw, osztaly: b.osztaly, gyartasiEv: gy, phevRegi: !!b.phevRegi });
  if (ca.hiba) return { hiba: ca.hiba };

  // km-térítés forint/km-ben (100 km-re számolva); a hengerűrtartalom csak akkor kötelező, ha van üzleti út
  const uzemanyag = o.mentes ? 'elektromos' : o.phev ? 'plugin' : b.uzemanyag;
  const vanCm3 = uzemanyag === 'elektromos' || Number(b.cm3) > 0;
  if (uzletiKm > 0 && !vanCm3) return { hiba: 'Add meg a hengerűrtartalmat: ebből jön a km-térítés.' };
  let kmDij = null;
  if (vanCm3) {
    kmDij = kikuldetes(adat, { km: 100, uzemanyag, motor: b.motor || 'benzin', cm3: b.cm3, ev: b.arEv, honap: b.arHonap });
    if (kmDij.hiba) return { hiba: kmDij.hiba };
  }
  const ftKm = kmDij ? kmDij.ftKm : 0;
  const terites = ft(uzletiKm * ftKm);

  const r = osztalekArany(adat, !!b.szocho);
  // A) cégautó: a cég fizeti a költséget, a gépjárműadót és a (gépjárműadóval csökkentett) cégautóadót
  const aCeg = C + gj + ca.fizetendo;
  const aZseb = ft(aCeg * r);
  // B) saját autó: te fizetsz mindent, a cég adómentes km-térítést ad
  const bSajat = C + gj;
  const bZseb = ft(bSajat - terites + terites * r);
  // Fordulópont: a saját autó akkor nem drágább, ha a térítés K ≥ (bSajat − aCeg·r) / (1 − r)
  const kKell = (bSajat - aCeg * r) / (1 - r);
  const kmFordulo = ftKm > 0 ? Math.max(0, Math.ceil(kKell / ftKm)) : null;
  return {
    ev: b.ev, kw, osztalyNev: o.nev, C, ertekvesztes, energia, fix, gj, gjr, ca, uzletiKm, ftKm, kmDij, terites, r,
    aCeg, aZseb, bSajat, bZseb, kulonbseg: aZseb - bZseb, kKell, kmFordulo, szocho: !!b.szocho,
  };
}

/* ---------------- Mentett autó: melyik kalkulátorba mi kerül belőle, és mi kerül bele ---------------- */
export const AUTOM_MEZOK = ['nev', 'kw', 'gyartasiEv', 'hajtas', 'cm3', 'fogyasztas', 'kwh', 'km', 'biztositas', 'szerviz', 'gumi', 'egyeb', 'ertek', 'muszaki', 'evfordulo'];
/** Az Az autóm lap dátummezői: ha kitörli, a mentett érték is törlődjön. */
const AUTOM_DATUMOK = ['muszaki', 'evfordulo'];
const AUTOM_HAJTASOK = ['benzin', 'dizel', 'hibrid', 'plugin', 'elektromos'];
/** Csak a kitöltött értékek: a hiányzó mezőt nem írjuk felül üressel. */
const kitoltott = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
const valaszt = (o, mezok) => Object.fromEntries(mezok.map((k) => [k, o[k]]));
// A környezetvédelmi osztály csak villanyautónál és plug-in hibridnél következik biztosan a hajtásból; benzinesnél és dízelesnél
// az Euro-besorolás a forgalmiban van (V.9), azt nem találgatjuk.
const OSZTALY_HAJTASBOL = { elektromos: 'villany', plugin: 'phev' };
const HAJTAS_OSZTALYBOL = { villany: 'elektromos', phev: 'plugin' };
/** Üzemanyag-listából mentett hajtás: csak érvényes hajtás lehet, és a mentett hibrid vagy plug-in hibrid megmarad, ha itt benzint választott. */
const hajtasUzemanyagbol = (uz, regi) => (['dizel', 'elektromos', 'plugin'].includes(uz) ? uz : ['hibrid', 'plugin'].includes(regi.hajtas) ? regi.hajtas : uz ? 'benzin' : undefined);
/**
 * Kalkulátoronként: hogyan kerül a mentett autó az űrlapba (be), és az űrlapból mi kerül a mentett autóba (ki).
 * Ahol nincs külön szabály, a mezők neve egyezik. A km- és az útiköltség-kalkulátorban a „km” egy út hossza, nem az évi futás.
 */
const AUTOM_KAPCS = {
  km: {
    be: (a) => ({ uzemanyag: a.hajtas === 'hibrid' ? 'benzin' : a.hajtas, cm3: a.cm3 }),
    ki: (e, regi) => ({ ...valaszt(e, AUTOM_MEZOK), km: undefined, hajtas: hajtasUzemanyagbol(e.uzemanyag, regi) }),
  },
  uti: {
    be: (a) => ({ uzemanyag: ['dizel', 'elektromos'].includes(a.hajtas) ? a.hajtas : 'benzin', fogyasztas: a.fogyasztas, kwh: a.kwh }),
    // az LPG-fogyasztás nem a benzines fogyasztás, ezért azt nem mentjük a mentett autóba
    ki: (e, regi) => ({ fogyasztas: e.uzemanyag === 'lpg' ? undefined : e.fogyasztas, kwh: e.kwh, hajtas: hajtasUzemanyagbol(e.uzemanyag, regi) }),
  },
  cegautoado: {
    be: (a) => ({ kw: a.kw, gyartasiEv: a.gyartasiEv, osztaly: OSZTALY_HAJTASBOL[a.hajtas] }),
    ki: (e) => ({ kw: e.kw, gyartasiEv: e.gyartasiEv, hajtas: HAJTAS_OSZTALYBOL[e.osztaly] }),
  },
  cegauto: {
    be: (a) => ({ kw: a.kw, gyartasiEv: a.gyartasiEv, cm3: a.cm3, osztaly: OSZTALY_HAJTASBOL[a.hajtas], uzemanyag: a.hajtas === 'dizel' ? 'dizel' : ['benzin', 'hibrid', 'plugin'].includes(a.hajtas) ? 'benzin' : undefined }),
    ki: (e, regi) => ({ kw: e.kw, gyartasiEv: e.gyartasiEv, cm3: e.cm3, hajtas: HAJTAS_OSZTALYBOL[e.osztaly] || hajtasUzemanyagbol(e.uzemanyag, regi) }),
  },
  phev: {
    be: (a) => ({ kw: a.kw, gyartasiEv: a.gyartasiEv }),
    ki: (e) => ({ kw: e.kw, gyartasiEv: e.gyartasiEv, hajtas: 'plugin' }),
  },
  javitas: {
    be: (a) => ({ a_gyartasiEv: a.gyartasiEv, a_hajtas: a.hajtas, a_ertekMost: a.ertek }),
    ki: (e) => ({ gyartasiEv: e.a_gyartasiEv, hajtas: e.a_hajtas, ertek: e.a_ertekMost }),
  },
  osszevet: {
    be: (a) => ({ km: a.km, a_nev: a.nev, a_hajtas: a.hajtas, a_kw: a.kw, a_fogyasztas: a.fogyasztas, a_kwh: a.kwh, a_szerviz: a.szerviz, a_biztositas: a.biztositas }),
    ki: (e) => ({ km: e.km, nev: e.a_nev, hajtas: e.a_hajtas, kw: e.a_kw, fogyasztas: e.a_fogyasztas, kwh: e.a_kwh, szerviz: e.a_szerviz, biztositas: e.a_biztositas }),
  },
};
const ALAP_KAPCS = { be: (a) => a, ki: (e) => valaszt(e, AUTOM_MEZOK) };
/** A mentett autóból az űrlap értékei (a teszt is ezt hívja). */
export function automBe(kalk, a) { return { ...kitoltott((AUTOM_KAPCS[kalk] || ALAP_KAPCS).be(a)), kwEgyseg: 'kw' }; }
/** Az űrlapból a mentett autó új mezői; a régiek közül, ami itt nem szerepel, megmarad. */
export function automKi(kalk, e, regi = {}) {
  const a = kitoltott((AUTOM_KAPCS[kalk] || ALAP_KAPCS).ki(e, regi));
  const kwMezo = kalk === 'osszevet' ? 'a_kw' : 'kw';
  if (e.kwEgyseg === 'le' && e[kwMezo]) a.kw = String(leKw(String(e[kwMezo]).replace(',', '.')));
  // a hajtás csak érvényes értéket kaphat
  if (a.hajtas && !AUTOM_HAJTASOK.includes(a.hajtas)) delete a.hajtas;
  if (kalk === 'autom') for (const d of AUTOM_DATUMOK) if (e[d] === '') a[d] = '';
  return a;
}

/* ---------------- Következő lépés: az eredmény után a kapcsolódó kalkulátor, a már beírt adatokkal ---------------- */
const KOV_UTI_UZ = ['benzin', 'dizel', 'lpg', 'elektromos'];
/** kW számként, ha lóerőben írta be; a mező neve lehet más is (például c_kw). */
const kwKi = (e, mezo = 'kw') => { const v = e[mezo]; if (v === '' || v == null) return undefined; return e.kwEgyseg === 'le' && mezo === 'kw' ? String(leKw(String(v).replace(',', '.'))) : v; };
const igen = (v) => (v === true ? '1' : undefined);
/**
 * Kalkulátoronként legfeljebb két ajánlás: { cel, cim, szoveg, q }. A q a cél űrlap mezőit tölti ki (link paraméterei).
 * Csak olyan adat megy át, amit a látogató maga írt be, és ami a célban ugyanazt jelenti.
 */
export function kovetkezoLepesek(kalk, e) {
  const autoAdat = { kw: kwKi(e), gyartasiEv: e.gyartasiEv, hajtas: e.hajtas };
  switch (kalk) {
    case 'gepjarmuado': return [{ cel: 'fenntartas', cim: 'Mennyibe kerül havonta az autód, ha mindent beleszámolsz?', szoveg: 'Az adó mellé az üzemanyag, a biztosítás, a szerviz és az értékvesztés.', q: autoAdat }];
    case 'atiras': return [
      { cel: 'fenntartas', cim: 'Mennyibe kerülne évente fenntartani?', szoveg: 'Üzemanyag, biztosítás, adó és értékvesztés havonta.', q: { ...autoAdat, ertek: e.vetelar } },
      ...(e.vetelar ? [{ cel: 'hitel', cim: 'Ha hitelből vennéd: mennyi lenne a törlesztő?', szoveg: 'Havi részlet a THM-mel, és mennyibe kerül valójában az autó.', q: { ar: e.vetelar, ...autoAdat } }] : []),
    ];
    case 'fenntartas': {
      const l = [];
      if (e.hajtas !== 'elektromos') l.push({ cel: 'osszevet', cim: 'Megérné villanyautóra váltani?', szoveg: 'A mostani autód és egy villanyautó teljes költsége évekre előre.', q: { km: e.km, a_hajtas: e.hajtas, a_kw: kwKi(e), a_fogyasztas: e.fogyasztas, a_szerviz: e.szerviz, a_biztositas: e.biztositas, a_ar: e.ertek } });
      l.push({ cel: 'uti', cim: 'Mennyibe kerül egy konkrét út?', szoveg: 'Üzemanyagban vagy áramban, fejenként is.', q: e.hajtas === 'elektromos' ? { uzemanyag: 'elektromos', kwh: e.kwh } : { uzemanyag: e.hajtas === 'dizel' ? 'dizel' : 'benzin', fogyasztas: e.fogyasztas } });
      return l;
    }
    case 'uti': {
      const uz = e.uzemanyag;
      const tav = (Number(String(e.km).replace(',', '.')) || 0) * (e.odaVissza === true ? 2 : 1);
      const alkalom = Number(e.alkalom) || 0;
      return [
        { cel: 'fenntartas', cim: 'Mennyibe kerül az autó egész évben?', szoveg: 'Az üzemanyag mellé a biztosítás, a szerviz, az adó és az értékvesztés.', q: { hajtas: uz === 'lpg' ? 'benzin' : uz, fogyasztas: uz === 'elektromos' || uz === 'lpg' ? undefined : e.fogyasztas, kwh: uz === 'elektromos' ? e.kwh : undefined, km: alkalom && tav ? String(Math.round(tav * alkalom * 12)) : undefined } },
        { cel: 'km', cim: 'Ha munkaügyben utazol: mennyi a kilométertérítés?', szoveg: 'Ennyit fizethet a munkáltató adómentesen, a NAV normájával.', q: { km: e.km, odaVissza: igen(e.odaVissza), uzemanyag: uz } },
      ];
    }
    case 'km': {
      if (e.mod === 'munka') return [];
      const uz = e.uzemanyag === 'plugin' ? undefined : KOV_UTI_UZ.includes(e.uzemanyag) ? e.uzemanyag : undefined;
      return [{ cel: 'uti', cim: 'Mennyibe kerül valójában az út?', szoveg: 'A te autód valós fogyasztásával, nem a hivatalos normával.', q: { km: e.km, odaVissza: igen(e.odaVissza), uzemanyag: uz } }];
    }
    case 'hitel': return [{ cel: 'fenntartas', cim: 'Mekkora lesz a teljes havi autós kiadásod?', szoveg: 'A törlesztő mellé üzemanyag, biztosítás, adó és értékvesztés.', q: { ...autoAdat, ertek: e.ar } }];
    case 'javitas': return [{ cel: 'fenntartas', cim: 'Mennyibe kerülne havonta a másik autó?', szoveg: 'Üzemanyag, biztosítás, adó és értékvesztés, tételesen.', q: { kw: e.c_kw, gyartasiEv: e.c_gyartasiEv, hajtas: e.c_hajtas, ertek: e.c_ar } }];
    case 'osszevet': return e.b_ar ? [{ cel: 'hitel', cim: 'Ha hitelből vennéd a másik autót: mennyi lenne a törlesztő?', szoveg: 'Havi részlet a THM-mel, és a futamidő alatti teljes költség.', q: { ar: e.b_ar, kw: e.b_kw, hajtas: e.b_hajtas } }] : [];
    case 'cegautoado': return [{ cel: 'cegauto', cim: 'Megéri a cégautó, vagy jobb a saját autó kilométertérítéssel?', szoveg: 'A két út a tulajdonos zsebéből nézve, osztalékadóval.', q: { kw: kwKi(e), osztaly: e.osztaly, gyartasiEv: e.gyartasiEv, phevRegi: igen(e.phevRegi) } }];
    case 'cegauto': return [{ cel: 'cegautoado', cim: 'A cégautóadó negyedévenként, határidőkkel', szoveg: 'Havi és éves összeg, a gépjárműadó levonásával.', q: { kw: kwKi(e), osztaly: e.osztaly, gyartasiEv: e.gyartasiEv, phevRegi: igen(e.phevRegi) } }];
    case 'phev': return [{ cel: 'gepjarmuado', cim: 'A gépjárműadó részletesen, év közbeni változással', szoveg: 'Ha év közben veszed, eladod vagy kivonod a forgalomból.', q: { ev: '2027', kw: kwKi(e), gyartasiEv: e.gyartasiEv, hajtas: 'plugin', phevRegi: igen(e.regi) } }];
    case 'matrica': return [{ cel: 'uti', cim: 'Mennyibe kerül az út autóval?', szoveg: 'A matrica mellé a benzin vagy az áram, fejenként is.', q: {} }];
    default: return [];
  }
}
/** A link paraméterei: csak a kitöltött értékek. */
export function kovetkezoQuery(q) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q || {})) if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

/* ---------------- Példatáblák: a fenntartási és a cégautós oldal idézhető számai ---------------- */
/**
 * A fenntartási oldal példaautói (szabalyok.fenntartas_peldak) a fenntartas() motorral: a kötelező biztosítás az MNB-átlag,
 * a szerviz és a gumi feltevés, a többi hivatalos adatból jön. f: a fenntartási oldal feltevései (NAV-ár, áramár, maradványérték).
 */
export function fenntartasPeldak(adat, { ev, f }) {
  const p = adat.szabalyok.fenntartas_peldak;
  return p.autok.map((a) => {
    const r = fenntartas(adat, { ev, km: a.km, kw: a.kw, gyartasiEv: a.gyartasiEv, hajtas: a.hajtas, fogyasztas: a.fogyasztas, ertek: a.ertek, biztositas: p.kgfb_atlag.ft, szerviz: a.szerviz, gumi: a.gumi, egyeb: 0, f });
    if (r.hiba) throw new Error(`fenntartás-példa (${a.id}): ${r.hiba}`);
    const t = Object.fromEntries(r.tetelek.map((x) => [x.kulcs, x.ev]));
    return { ...a, r, energia: t.energia, ertekvesztes: t.ertekvesztes, biztAdo: t.biztositas + t.gjado, szervizGumi: t.szerviz + t.gumi, havi: r.havi, ftKm: r.ftKm };
  });
}

/** A cégautós oldal példája: ugyanaz az autó évi 5, 15 és 30 ezer üzleti km-rel; a magánutak évi 10 000 km. */
export const CEG_PELDA = { kw: 110, osztaly: 'euro56', gyartasiEv: 2021, uzemanyag: 'benzin', cm3: 1498, ertekvesztes: 900000, fix: 400000, fogyasztas: 6.5, maganKm: 10000, uzletiKm: [5000, 15000, 30000] };
export function cegautoPeldak(adat, { ev, lf, szocho = true }) {
  const p = CEG_PELDA;
  const ar = adat.uzemanyag.evek[lf.ev][lf.honap][p.uzemanyag];
  const szamol = (uzletiKm) => {
    // az üzemanyag az összes útra jár (üzleti és magán), a valós fogyasztással
    const energia = Math.round((uzletiKm + p.maganKm) * p.fogyasztas / 100 * ar);
    const r = cegautoVagySajat(adat, { ev, kw: p.kw, osztaly: p.osztaly, gyartasiEv: p.gyartasiEv, uzemanyag: p.uzemanyag, cm3: p.cm3, ertekvesztes: p.ertekvesztes, energia, fix: p.fix, uzletiKm, szocho, arEv: lf.ev, arHonap: lf.honap });
    if (r.hiba) throw new Error(`cégautó-példa: ${r.hiba}`);
    return { uzletiKm, energia, r };
  };
  const sorok = p.uzletiKm.map(szamol);
  // fordulópont 500 km-es lépésben: honnan olcsóbb a saját autó (ha a nulla km-nél már az, akkor 0)
  let fordulo = null;
  for (let km = 0; km <= 100000; km += 500) if (szamol(km).r.kulonbseg > 0) { fordulo = km; break; }
  return { pelda: p, ar, sorok, fordulo };
}

/* ---------------- Az autóm: határidők naptárfájlban (.ics) ---------------- */
const NAPTAR_EVEK = 5; // a biztosítási váltás határidejét ennyi évre előre tesszük be, évenként külön (a szökőév miatt)
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** RFC 5545: egy sor legfeljebb 75 bájt, a folytatás szóközzel kezdődik. Karakterhatáron törünk, hogy az ékezet ne sérüljön. */
function icsHajt(sor) {
  const enc = new TextEncoder();
  const ki = [];
  let akt = '', hossz = 0;
  for (const ch of sor) {
    const b = enc.encode(ch).length;
    if (hossz + b > (ki.length ? 74 : 75)) { ki.push(akt); akt = ''; hossz = 0; }
    akt += ch; hossz += b;
  }
  ki.push(akt);
  return ki.join('\r\n ');
}
const icsNap = (iso) => iso.replace(/-/g, '');
/** A hónap napjának ragja: 1-jén, 2-án, 3-án, 5-én, 21-én, 30-án. */
export function napRag(n) { const d = n % 10; return n === 1 ? 'jén' : n === 2 || [20, 30].includes(n) || [3, 6, 8].includes(d) ? 'án' : 'én'; }
const huNapon = (iso) => { const [e, h, n] = iso.split('-').map(Number); return `${e}. ${HONAPOK[h - 1]} ${n}-${napRag(n)}`; };
const uidNev = (nev) => (nev ? `-${String(nev).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)}` : '');
const szokoev = (e) => (e % 4 === 0 && e % 100 !== 0) || e % 400 === 0;

/**
 * Az autó határidői naptárba: műszaki vizsga lejárata, a kötelező biztosítás felmondási határideje és a gépjárműadó befizetése.
 * b: { nev, hajtas, muszaki: 'YYYY-MM-DD', evfordulo: 'YYYY-MM-DD', ma: 'YYYY-MM-DD', most: ISO időbélyeg, url }
 * Visszaad: { ics, esemenyek: [{ tipus, nap, cim }] } vagy { hiba }.
 */
export function hataridoNaptar(adat, b) {
  // a JavaScript a február 31-et csendben március 3-ra fordítja, ezért visszaalakítva is egyeznie kell
  const datum = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !Number.isNaN(Date.parse(`${x}T12:00:00Z`)) && new Date(`${x}T12:00:00Z`).toISOString().slice(0, 10) === x;
  const nevben = b.nev ? ` (${String(b.nev).trim().slice(0, 40)})` : '';
  const url = b.url || 'https://autozom.hu/autom/';
  const es = [];
  if (b.muszaki) {
    if (!datum(b.muszaki)) return { hiba: 'A műszaki vizsga lejáratát dátumként add meg.' };
    if (b.muszaki < b.ma) return { hiba: 'A megadott műszaki lejárat már elmúlt. Ha közben megújítottad, írd be az újat.' };
    es.push({ tipus: 'muszaki', nap: b.muszaki, cim: `Lejár a műszaki vizsga${nevben}`, leiras: 'Eddig a napig érvényes a műszaki vizsga. Érdemes időben időpontot kérni egy vizsgaállomáson.', riasztas: [30, 7] });
  }
  if (b.evfordulo) {
    if (!datum(b.evfordulo)) return { hiba: 'A biztosítási évfordulót dátumként add meg.' };
    const k = adat.szabalyok.kgfb;
    const elso = kovetkezoEvforduló(b.evfordulo, b.ma);
    const md = b.evfordulo.slice(5);
    for (let i = 0; i < NAPTAR_EVEK + 1 && es.filter((x) => x.tipus === 'kgfb').length < NAPTAR_EVEK; i++) {
      const ev = Number(elso.slice(0, 4)) + i;
      const kezdet = md === '02-29' && !szokoev(ev) ? `${ev}-02-28` : `${ev}-${md}`;
      const felmondas = napEltol(kezdet, -k.felmondas_nap);
      if (felmondas < b.ma) continue; // az idei határidő már lejárt: a következő évtől
      es.push({ tipus: 'kgfb', nap: felmondas, cim: `Kötelező biztosítás: eddig válthatsz${nevben}`, leiras: `Ha másik biztosítóhoz mennél, a felmondásnak eddig a napig meg kell érkeznie a mostani biztosítódhoz. Az új biztosítási időszak ${huNapon(kezdet)} kezdődik.`, riasztas: [14, 3] });
    }
  }
  if (b.hajtas !== 'elektromos') {
    const [hNev, nNap] = String(adat.szabalyok.hataridok.gepjarmuado_befizetes).replace(/\.$/, '').split(' ');
    const ho = String(HONAPOK.indexOf(hNev) + 1).padStart(2, '0'), nap = String(Number(nNap)).padStart(2, '0');
    let ev = Number(b.ma.slice(0, 4));
    if (`${ev}-${ho}-${nap}` < b.ma) ev += 1;
    // A villanyautó mentes. A plug-in hibrid 2026-os mentessége a forgalomba helyezés napjától függ, amit itt nem kérdezünk,
    // ezért annál is betesszük: egy fölösleges emlékeztető kisebb baj, mint egy elmaradt befizetés.
    es.push({ tipus: 'gjado', nap: `${ev}-${ho}-${nap}`, cim: `Gépjárműadó befizetése${nevben}`, leiras: `A gépjárműadót minden évben ${HONAPOK[Number(ho) - 1]} ${Number(nap)}-ig kell befizetni. Az összeget a NAV határozata tartalmazza, előre a ${url.replace(/autom\/$/, 'gepjarmuado-kalkulator/')} oldalon is kiszámolhatod.`, riasztas: [7], evente: true });
  }
  if (!es.length) return { hiba: 'Add meg a műszaki vizsga lejáratát vagy a biztosítási évfordulót.' };
  es.sort((x, y) => x.nap.localeCompare(y.nap));
  const dtstamp = new Date(b.most || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const sorok = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//autozom.hu//Az autóm//HU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Az autóm határidői'];
  for (const x of es) {
    sorok.push('BEGIN:VEVENT',
      // Állandó azonosító: ha újra letölti és importálja, a naptár frissíti az eseményt, nem duplázza
      `UID:${x.tipus}-${icsNap(x.nap)}${uidNev(b.nev)}@autozom.hu`, `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${icsNap(x.nap)}`, `DTEND;VALUE=DATE:${icsNap(napEltol(x.nap, 1))}`,
      ...(x.evente ? ['RRULE:FREQ=YEARLY'] : []),
      `SUMMARY:${icsEsc(x.cim)}`, `DESCRIPTION:${icsEsc(x.leiras)}`, `URL:${url}`, 'TRANSP:TRANSPARENT');
    for (const n of x.riasztas) sorok.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(x.cim)}`, `TRIGGER:-P${n}D`, 'END:VALARM');
    sorok.push('END:VEVENT');
  }
  sorok.push('END:VCALENDAR');
  return { ics: `${sorok.map(icsHajt).join('\r\n')}\r\n`, esemenyek: es.map(({ tipus, nap, cim }) => ({ tipus, nap, cim })) };
}

/* ---------------- Útnyilvántartás és kiküldetési rendelvény ---------------- */
/** „2026.11.03.”, „2026. 11. 3.”, „2026-11-03” → '2026-11-03'; ha nem dátum: null. */
export function datumBe(x) {
  const m = String(x ?? '').trim().match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
const kmBe = (x) => { const v = Number(String(x ?? '').replace(/\s| /g, '').replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

/**
 * Excelből vagy táblázatból bemásolt sorok: tabulátorral vagy pontosvesszővel elválasztva.
 * Oszlopok: dátum; honnan; hová; partner vagy cél; km. Négy oszlopnál: dátum; útvonal; partner; km. Háromnál: dátum; útvonal; km.
 * A fejlécsort és az üres sorokat kihagyja. Visszaad: { sorok, hibasak: [sorszám] }.
 */
export function utSorokBeolvas(szoveg) {
  const sorok = [], hibasak = [];
  String(szoveg || '').split(/\r?\n/).forEach((nyers, i) => {
    if (!nyers.trim()) return;
    const c = nyers.split(nyers.includes('\t') ? '\t' : ';').map((x) => x.trim());
    const datum = datumBe(c[0]);
    const km = kmBe(c.at(-1));
    if (!datum || !(km > 0)) { if (i > 0 || datumBe(c[0])) hibasak.push(i + 1); return; }
    if (c.length >= 5) sorok.push({ datum, honnan: c[1], hova: c[2], partner: c[3], km });
    else if (c.length === 4) sorok.push({ datum, honnan: c[1], hova: '', partner: c[2], km });
    else sorok.push({ datum, honnan: c[1] || '', hova: '', partner: '', km });
  });
  return { sorok, hibasak };
}

/**
 * Havi elszámolás az utakból: hónaponként a km, a NAV-ár, az üzemanyag (norma × ár) és a normaköltség.
 * b: { uzemanyag, motor, cm3, utak: [{ datum, honnan, hova, partner, km }] }
 */
export function utnyilvantartas(adat, b) {
  const utak = (b.utak || []).filter((u) => u && (u.datum || u.km || u.honnan || u.hova || u.partner));
  if (!utak.length) return { hiba: 'Add meg legalább egy utat: a dátumát és a megtett kilométert.' };
  for (const [i, u] of utak.entries()) {
    if (!datumBe(u.datum)) return { hiba: `A(z) ${i + 1}. útnál add meg a dátumot.` };
    if (!(kmBe(u.km) > 0)) return { hiba: `A(z) ${i + 1}. útnál add meg a megtett kilométert.` };
    if (!String(u.honnan || '').trim() && !String(u.hova || '').trim()) return { hiba: `A(z) ${i + 1}. útnál írd be, honnan hová utaztál.` };
  }
  if (!b.uzemanyag) return { hiba: 'Válaszd ki az autó üzemanyagát.' };
  if (!(Number(b.cm3) > 0) && b.uzemanyag !== 'elektromos') return { hiba: 'Add meg a hengerűrtartalmat (forgalmi engedély P.1).' };
  const n = kmNorma(adat, b);
  const ft15 = adat.szabalyok.km.normakoltseg_ft_km;
  const rendezett = utak.map((u) => ({ datum: datumBe(u.datum), honnan: String(u.honnan || '').trim(), hova: String(u.hova || '').trim(), partner: String(u.partner || '').trim(), km: kmBe(u.km) }))
    .sort((x, y) => x.datum.localeCompare(y.datum));
  const honapok = [];
  for (const u of rendezett) {
    const kulcs = u.datum.slice(0, 7);
    let h = honapok.find((x) => x.honap === kulcs);
    if (!h) {
      const [ev, ho] = kulcs.split('-').map(Number);
      const na = navAr(adat, ev, ho, n.arKulcs);
      if (!na) return { hiba: `A ${ev}. ${HONAPOK[ho - 1]}i NAV-ár még nem jelent meg, ezért erre a hónapra még nem lehet elszámolni.` };
      h = { honap: kulcs, ev, ho, km: 0, ar: na.ar, utak: 0 };
      honapok.push(h);
    }
    h.km += u.km; h.utak += 1;
  }
  for (const h of honapok) {
    h.km = kerek(h.km, 1);
    h.mennyiseg = kerek(h.km * n.norma / 100, 2);
    h.uzemanyagFt = ft(h.km * n.norma / 100 * h.ar);
    h.normakoltseg = ft(h.km * ft15);
    h.osszesen = h.uzemanyagFt + h.normakoltseg;
  }
  const ossz = (k) => honapok.reduce((s, h) => s + h[k], 0);
  return { utak: rendezett, honapok, norma: n.norma, egyseg: n.egyseg, normaLeiras: n.leiras, arKulcs: n.arKulcs, ft15, km: kerek(ossz('km'), 1), uzemanyagFt: ossz('uzemanyagFt'), normakoltseg: ossz('normakoltseg'), osszesen: ossz('osszesen') };
}
