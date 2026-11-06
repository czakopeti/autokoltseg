// Eredménypanelek HTML-je. Ugyanezt használja az építő (előre kiszámolt, keresőbarát eredmény)
// és a böngésző (élő számolás), így a kettő soha nem tér el.
import * as S from './szamitas.js';

const nf = new Intl.NumberFormat('hu-HU', { useGrouping: 'always' });
export const fmt = (n) => nf.format(Math.round(n));
export const tized = (n, j = 1) => new Intl.NumberFormat('hu-HU', { maximumFractionDigits: j }).format(n);
export const ftx = (n) => `${fmt(n)}&nbsp;Ft`;

export function datumHu(iso) {
  if (!iso) return '';
  const [e, h, n] = iso.slice(0, 10).split('-').map(Number);
  return `${e}. ${S.HONAPOK[h - 1]} ${n}.`;
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
  const d = ev % 10;
  const t = Math.floor(ev / 10) % 10;
  const r = d === 0 ? ({ 1: 'es', 2: 'as', 3: 'as', 4: 'es', 5: 'es', 6: 'as', 7: 'es', 8: 'as', 9: 'es', 0: 'as' })[t] : ({ 1: 'es', 2: 'es', 3: 'as', 4: 'es', 5: 'ös', 6: 'os', 7: 'es', 8: 'as', 9: 'es' })[d];
  return `${ev}-${r}`;
}
/** januárban … novemberben */
export function honapBan(h) { const n = S.HONAPOK[h - 1]; return n + (/(szeptember|október|november|december)$/.test(n) ? 'ben' : 'ban'); }
export function honapHu(ev, honap) { return `${ev}. ${S.HONAPOK[honap - 1]}`; }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function foSzam(ertek, { mentes = false } = {}) {
  return `<div class="fo-szam${mentes ? ' mentes' : ''}" data-szamlalo="${Math.round(ertek)}"><span class="ertek">${fmt(ertek)}</span><span class="ft">Ft</span></div>`;
}
function sor(nev, ertek, cls = '') {
  return `<li class="${cls}"><span class="n">${nev}</span><span class="p" aria-hidden="true"></span><span class="e">${ertek}</span></li>`;
}
function uzenet(tipus, szoveg) { return `<p class="uzenet uzenet-${tipus}"><span>${szoveg}</span></p>`; }
function savMero(min, max, ertek, bal, jobb, cimke) {
  const a = max > min ? Math.min(1, Math.max(0, (ertek - min) / (max - min))) : 0;
  const p = (a * 100).toFixed(1);
  return `<div class="sav-mero" role="img" aria-label="${esc(cimke)}"><div class="feliratok"><span>${bal}</span><span>${jobb}</span></div><div class="sav"><div class="tolto" style="width:${p}%"></div><div class="jel" style="left:${p}%"></div></div></div>`;
}
export function hibaPanel(uz) { return `${uzenet('hiba', esc(uz))}`; }

/* ---------- Gépjárműadó ---------- */
export function gjadoPanel(adat, r, b) {
  if (r.hiba) return hibaPanel(r.hiba);
  const savok = adat.tetelek.gepjarmuado[r.ev].savok;
  const min = Math.min(...savok), max = Math.max(...savok);
  let h = `<div class="eredmeny-cim"><p class="felirat">Gépjárműadó · ${r.ev}</p></div>`;
  h += foSzam(r.fizetendo, { mentes: !!r.mentes });
  if (r.mentes) h += uzenet('jo', r.mentes);
  else h += `<p class="fo-al">${r.honapok < 12 ? `${r.honapok} hónapra` : 'egy évre'} · havonta kb. ${ftx(r.havi)} · befizetés ${r.hatarido}</p>`;
  if (!r.mentes) h += savMero(min, max, r.ftKw, `${min} Ft/kW`, `${max} Ft/kW`, `Adótétel: ${r.ftKw} Ft/kW`);
  h += '<ul class="bontas">';
  h += sor('Teljesítmény', `${fmt(r.kw)} kW`);
  h += sor('Az autó kora', `${r.kor}. naptári év (${S.GJADO_SAV_ROVID[r.sav]})`);
  h += sor('Adótétel', `${r.ftKw} Ft/kW`);
  if (r.honapok < 12) h += sor('Időarány', `${r.honapok}/12 hónap`);
  if (r.kedvezmeny) h += sor('Mozgáskorlátozott kedvezmény', `−${ftx(r.kedvezmeny)}`);
  h += sor(`Fizetendő, ${r.ev}`, ftx(r.fizetendo), 'ossz');
  h += '</ul>';
  if (r.mkMegjegyzes) h += uzenet('info', r.mkMegjegyzes);
  if (!r.mentes) {
    h += `<p class="kepl"><b>${fmt(r.kw)} kW × ${r.ftKw} Ft/kW</b> = ${ftx(r.evesTeljes)}${r.honapok < 12 ? ` × ${r.honapok}/12 = ${ftx(r.aranyos)}` : ''}${r.kedvezmeny ? ` − ${ftx(r.kedvezmeny)}` : ''}</p>`;
  }
  // Ugyanez az autó a többi ismert évben
  const evek = S.gjadoEvek(adat, b).filter((x) => !x.hiba);
  if (evek.length > 1) {
    h += '<div class="evek-tabla" aria-label="Ugyanez az autó évenként">';
    evek.forEach((x, i) => {
      const elozo = evek[i - 1];
      let valt = '';
      if (elozo) {
        const d = x.fizetendo - elozo.fizetendo;
        valt = d === 0 ? '<span class="valt">változatlan</span>' : `<span class="valt ${d < 0 ? 'le' : 'fel'}">${d < 0 ? '−' : '+'}${fmt(Math.abs(d))} Ft</span>`;
      } else valt = `<span class="valt">${x.ftKw} Ft/kW</span>`;
      h += `<div class="ev-doboz${x.ev === r.ev ? ' aktiv' : ''}"><span class="ev">${x.ev}</span><span class="ossz">${fmt(x.fizetendo)} Ft</span>${valt}</div>`;
    });
    h += '</div>';
    const savValt = evek.find((x, i) => i > 0 && x.sav !== evek[i - 1].sav);
    if (savValt && !savValt.mentes) h += uzenet('info', `${rag(savValt.ev, 'tól', 'től')} kedvezőbb sávba lép az autó (${S.GJADO_SAV_ROVID[savValt.sav]}), ott ${savValt.ftKw} Ft/kW a tétel.`);
  }
  return h;
}

/* ---------- Átírás ---------- */
export function atirasPanel(adat, r, b) {
  if (r.hiba) return hibaPanel(r.hiba);
  const il = r.illetek;
  let h = `<div class="eredmeny-cim"><p class="felirat">Az átírás költsége · ${il.ev}</p></div>`;
  h += foSzam(r.osszesen);
  h += `<p class="fo-al">${r.regado ? 'illeték, regisztrációs adó és okmányok' : 'illeték és okmányok'}${r.vetelar ? ` · a vételárral együtt ${ftx(r.mindossz)}` : ''}</p>`;
  if (il.mentes) h += uzenet('jo', il.mentes);
  if (r.regado?.mentes) h += uzenet('jo', r.regado.mentes);
  h += '<ul class="bontas">';
  for (const t of r.tetelek) h += sor(t.nev, ftx(t.ft));
  h += sor('Összesen', ftx(r.osszesen), 'ossz');
  if (r.vetelar) h += sor('Vételárral együtt', ftx(r.mindossz), 'ossz');
  h += '</ul>';
  let k = '';
  if (!il.mentes) {
    k += `<b>Illeték:</b> ${fmt(il.kw)} kW × ${il.ftKw} Ft/kW (${S.ILLETEK_KW_SAVOK[il.sor]}, ${S.ILLETEK_KOR_SAVOK[il.oszlop]})`;
    if (il.szorzo > 1) k += ' × 2 (ajándék, öröklés)';
    if (il.hanyad < 100) k += ` × ${il.hanyad}%`;
    k += ` = ${ftx(il.osszeg)}`;
  }
  if (r.regado && !r.regado.mentes) {
    const g = r.regado;
    k += `${k ? '<br>' : ''}<b>Regisztrációs adó:</b> ${ftx(g.alap)} × ${tized(g.szorzo, 2)} (${S.REGADO_SOR_NEV[g.sor]}, „${g.oszlop}” oszlop) × (100% − ${g.csokk}%) = ${ftx(g.osszeg)}`;
    k += `<br><span>Kor: ${g.honapok} megkezdett hónap → ${g.csokk}% csökkentés</span>`;
  }
  if (k) h += `<p class="kepl">${k}</p>`;
  h += uzenet('info', `Az átírást a vevőnek a szerződéskötéstől számított ${adat.szabalyok.hataridok.atiras_napok} napon belül kell kezdeményeznie. Az illetéket a NAV határozatban szabja ki.`);
  return h;
}

/* ---------- Kilométertérítés ---------- */
export function kmPanel(adat, r, b) {
  if (r.hiba) return hibaPanel(r.hiba);
  let h = `<div class="eredmeny-cim"><p class="felirat">Elszámolható költségtérítés</p></div>`;
  h += foSzam(r.osszesen);
  h += `<p class="fo-al">${fmt(r.tav)} km · ${tized(r.ftKm, 1)} Ft/km · igazolás nélkül, adómentesen</p>`;
  h += '<ul class="bontas">';
  h += sor('Távolság', `${fmt(r.tav)} km${b.odaVissza ? ' (oda-vissza)' : ''}`);
  h += sor('Fogyasztási norma', `${tized(r.norma, 3)} ${r.egyseg}/100 km`);
  h += sor(`Üzemanyag (${tized(r.mennyiseg, 2)} ${r.egyseg} × ${r.ar} Ft)`, ftx(r.uzemanyagFt));
  h += sor(`Normaköltség (${fmt(r.tav)} km × ${adat.szabalyok.km.normakoltseg_ft_km} Ft)`, ftx(r.normakoltseg));
  h += sor('Összesen', ftx(r.osszesen), 'ossz');
  h += '</ul>';
  h += `<p class="kepl"><b>${fmt(r.tav)} km × ${tized(r.norma, 3)} ${r.egyseg}/100 km × ${r.ar} Ft</b> + ${fmt(r.tav)} km × ${adat.szabalyok.km.normakoltseg_ft_km} Ft = ${ftx(r.osszesen)}<br><span>Norma: ${r.normaLeiras}. Ár: ${r.arForras}.</span></p>`;
  return h;
}

export function munkaPanel(adat, r) {
  if (r.hiba) return hibaPanel(r.hiba);
  let h = `<div class="eredmeny-cim"><p class="felirat">Munkába járás saját autóval</p></div>`;
  h += foSzam(r.havi);
  h += `<p class="fo-al">havonta · évente ${ftx(r.eves)} · adómentesen adható</p>`;
  h += '<ul class="bontas">';
  h += sor('Havi távolság (oda-vissza)', `${fmt(r.haviKm)} km`);
  h += sor('Térítés', `${r.dij} Ft/km`);
  h += sor('Havonta', ftx(r.havi), 'ossz');
  h += sor('Évente (12 hónap)', ftx(r.eves));
  h += '</ul>';
  h += uzenet('info', 'A munkáltató nem köteles fizetni, de ha fizet, ennyit adhat adómentesen. A pontos feltételeket a munkáltatód szabályzata adja meg.');
  return h;
}
