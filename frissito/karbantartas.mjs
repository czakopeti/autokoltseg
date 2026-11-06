// Karbantartási jelentés: mi esedékes a kézi teendők közül, és mit jelzett a napi NAV-ellenőrzés.
// A napi futás ebből nyit vagy frissít egy GitHub-jelzést (issue), amiről a GitHub e-mailt küld.
// Futtatás: node frissito/karbantartas.mjs [kimenet.md]   → ha nincs teendő, a kimenet üres.
import { writeFileSync } from 'node:fs';
import { olvas, maBudapest } from '../forras/adat.mjs';

/** Az utolsó esedékesség napja (ma vagy korábban), vagy null, ha még nem jött el. */
export function utolsoEsedekesseg(mikor, ma) {
  if (!mikor.startsWith('--')) return mikor <= ma ? mikor : null;
  const ev = Number(ma.slice(0, 4));
  const idei = `${ev}${mikor.slice(1)}`;
  return idei <= ma ? idei : `${ev - 1}${mikor.slice(1)}`;
}

export function esedekesek(k, ma) {
  return k.teendok.filter((t) => {
    const d = utolsoEsedekesseg(t.mikor, ma);
    return d && (!t.utoljara || t.utoljara < d);
  });
}

export function jelentes(k, allapot, ma) {
  const tennivalo = esedekesek(k, ma);
  const nav = [allapot.uzemanyag, allapot.tetelek].filter((x) => x && x.ok === false).map((x) => x.uzenet);
  const figy = allapot.figyelmeztetesek || [];
  if (!tennivalo.length && !nav.length && !figy.length) return '';
  let s = `Az autózom karbantartási listája, ${ma}. Ez a jelzés magától frissül minden reggel, és bezárul, ha minden rendben.\n`;
  if (nav.length || figy.length) {
    s += '\n## A napi NAV-ellenőrzés jelzései\n\n';
    for (const x of [...nav, ...figy]) s += `- ${x}\n`;
  }
  if (tennivalo.length) {
    s += '\n## Esedékes kézi teendők\n\n';
    for (const t of tennivalo) {
      s += `### ${t.mit}\n- **Hol:** ${t.hol}\n- **Mit kell tenni:** ${t.hogyan}\n${t.forras ? `- **Forrás:** ${t.forras}\n` : ''}- Ha kész, írd be a mai napot a \`data/karbantartas.json\` fájlban a \`${t.id}\` tétel \`utoljara\` mezőjébe.\n\n`;
    }
  }
  return s;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ma = maBudapest();
  const s = jelentes(olvas('data/karbantartas.json'), olvas('data/allapot.json'), ma);
  if (process.argv[2]) writeFileSync(process.argv[2], s);
  console.log(s || 'Nincs esedékes teendő.');
}
