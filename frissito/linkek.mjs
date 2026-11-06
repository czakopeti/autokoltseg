// A forráslinkek ellenőrzése: minden külső link az elkészült oldalakon. Hetente fut, az eredmény a karbantartási jelzésbe kerül.
// Futtatás (építés után): node frissito/linkek.mjs [kimenet.md]
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GYOKER } from '../forras/adat.mjs';

const W = join(GYOKER, 'web');
// Ezek az oldalak a robotokat (vagy a GitHub gépeit) tiltják, böngészőből viszont működnek: 2026. november 6-án kézzel ellenőrizve.
const ROBOTTILTO = ['abt.hu', 'njt.hu'];
const linkek = new Map();
(function jar(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) jar(p);
    else if (f.endsWith('.html')) for (const m of readFileSync(p, 'utf8').matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const u = m[1].replace(/&amp;/g, '&');
      if (/autozom\.hu|pages\.dev/.test(u) || ROBOTTILTO.some((h) => new URL(u).hostname.endsWith(h))) continue;
      if (!linkek.has(u)) linkek.set(u, new Set());
      linkek.get(u).add(p.replace(W, '').replace('index.html', ''));
    }
  }
})(W);

async function probal(u) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(u, { method, redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; autozom-linkellenor/1.0)' } });
      if (r.ok) return { ok: true };
      if (method === 'GET') return { ok: false, mi: `HTTP ${r.status}` };
    } catch (e) { if (method === 'GET') return { ok: false, mi: e.name === 'TimeoutError' ? 'időtúllépés' : e.message }; }
  }
}

const hibak = [];
for (const [u, lapok] of linkek) {
  const r = await probal(u);
  if (!r.ok) hibak.push(`- ${u} — ${r.mi} (oldalak: ${[...lapok].join(', ')})`);
}
const s = hibak.length ? `\n## Nem elérhető forráslinkek (${hibak.length} / ${linkek.size})\n\nA 403-as válasz gyakran csak azt jelenti, hogy az oldal a robotokat tiltja: ezeket böngészőben nézd meg.\n\n${hibak.join('\n')}\n` : '';
if (process.argv[2]) writeFileSync(process.argv[2], s);
console.log(s || `Mind a(z) ${linkek.size} külső link elérhető.`);
