# Autóköltség (munkanév)

Magyar autós kalkulátorok hivatalos NAV-tételekkel: gépjárműadó, átírási illeték és regisztrációs adó, kilométertérítés, benzin vagy villany összehasonlítás, fenntartási költség, adásvételi szerződés, „Az autóm” lap és egy magától bővülő változásnapló (`/valtozasok/`).
Az űrlapok mindig üresen nyílnak. Aki akarja, elmentheti a saját autóját a böngészőjében (`localStorage`, `autokoltseg-autom-v2`), és gombnyomásra betöltheti.
Statikus oldal, amely magától frissül. Nincs adatbázis, nincs szerver, nincs süti.

## Felépítés

| Mappa / fájl | Mi van benne |
|---|---|
| `data/` | Minden szám: `uzemanyag.json` (NAV havi árak), `tetelek.json` (évente valorizált tételek), `szabalyok.json` (normák, okmánydíjak, áramárak, maradványértékek, határidők), `allapot.json` (utolsó ellenőrzés) |
| `forras/js/szamitas.mjs` | A számítási mag. A böngésző, az építő és a tesztek is ezt használják. |
| `forras/js/megjelenites.mjs` | Az eredménypanelek. Az építő ezzel írja bele az alaperedményt a HTML-be (a Google is látja), a böngésző ezzel számol élőben. |
| `forras/oldalak.mjs`, `forras/sablon.mjs` | Az oldalak szövege és kerete. |
| `forras/css/style.css` | Dizájn: forgalmi engedély + NAV-elszámolás + pecsét, Overpass betű, világos és sötét mód, mozgás (`prefers-reduced-motion` tiszteletben tartva). |
| `frissito/` | NAV-letöltő és -feldolgozó (`nav.mjs`), napi futtatás (`futtat.mjs`). |
| `tesztek/` | Számítási tesztek a NAV-tájékoztatók példáival, feldolgozótesztek mintaoldalakon. |
| `web/` | A kész oldal. A Cloudflare Pages ezt szolgálja ki. Kézzel ne szerkeszd, az `epit.mjs` írja. |
| `.github/workflows/frissites.yml` | Napi automatikus frissítés. |

## Parancsok (Node 22, nincs függőség)

```
node epit.mjs                 # web/ felépítése
node epit.mjs --elonezet      # elonezet/ – relatív linkekkel, fájlként is megnyitható
node --test tesztek/*.test.mjs
node frissito/futtat.mjs      # NAV-ellenőrzés (internet kell)
FRISSITO_MINTA=1 node frissito/futtat.mjs   # ugyanez a tesztek mintaoldalaival
```

## Hogyan frissül magától?

Minden reggel 05:17-kor (UTC 04:17) a GitHub Actions:

1. letölti a NAV üzemanyagár-oldalát, és ha új hónap jelent meg, átveszi;
2. megnézi, közzétették-e az idei vagy a jövő évi gépjárműadó-, regisztrációsadó- és cégautóadó-tételeket;
3. lefuttatja a teszteket, újraépíti az oldalt (a dátumfüggő részek, például az alapértelmezett adóév, így január 1-jén magától átállnak);
4. ha változott valami, menti a repóba, és a Cloudflare Pages kiteszi.

Biztonsági elvek: csak akkor ír át adatot, ha a NAV-oldal felépítése a várt, és minden szám ésszerű tartományban van. Ha nem, nem módosít semmit, a futás piros lesz, és a GitHub e-mailt küld. Az elavulás-őr akkor is jelez, ha a hónap 2. napján nincs meg a havi ár, vagy november 1-jétől hiányoznak a jövő évi tételek.

## Évente kézzel

- **Október vége:** az átírási illeték új tételeit a NAV nem külön oldalon közli. Ha a futás erről jelez, vedd fel a `data/tetelek.json` → `illetek` alá. Addig a kalkulátor az előző évivel számol.
- **Január:** nézd át a `szabalyok.json` díjait (okmánydíjak, normaköltség, munkába járás), mert ezek jogszabályváltozással módosulnak.
- **Félévente:** `szabalyok.json` → `energia` (lakossági áram, villámtöltő) és `maradvany` (DAT/KSH maradványértékek). Ezeket nem frissíti gép, mert nincs hivatalos, gépileg olvasható forrásuk.

## Élesítés

1. GitHub-repó, ide feltöltve.
2. Cloudflare Pages → Create → Connect to Git → ez a repó. Build command: üres, output directory: `web`.
3. `config.json`: márkanév, domain, üzemeltető adatai, kapcsolati e-mail, majd `"eles": true`. Amíg nincs kitöltve, minden oldal `noindex`, és az építő nem engedi élesíteni.
4. Saját domain beállítása a Cloudflare-ben.
