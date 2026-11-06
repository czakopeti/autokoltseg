# autózom (autozom.hu)

Az autód. A költségeid. A döntéseid. Magyar autós kalkulátorok hivatalos NAV-tételekkel: gépjárműadó, átírási illeték és regisztrációs adó, kilométertérítés, benzin vagy villany összehasonlítás, fenntartási költség, adásvételi szerződés, „Az autóm” lap és egy magától bővülő változásnapló (`/valtozasok/`).
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

## Kézi teendők: naptár és jelzés

A kézi teendők a `data/karbantartas.json` fájlban vannak, dátummal. A napi futás egy `karbantartas` címkéjű GitHub-issue-t nyit vagy frissít, ha valami esedékes (a GitHub erről e-mailt küld), és bezárja, ha minden kész. Hétfőnként a forráslinkeket is ellenőrzi. Havonta (minden hónap 2-án) egy ütemezett Claude-futás elvégzi az esedékes teendőket.

## Visszajelzések

Minden oldal alján (a főoldal, az impresszum és az adatvédelem kivételével) ott a „Hasznos volt?” doboz. A kalkulátoroknál az eredmény alatt van. A Nem gomb után a látogató pár szót írhat, és ha akarja, a beírt számokat is elküldheti.

- **Az Igen/Nem számláló** a Cloudflare KV-ban van. Oldalanként megnézheted: https://autozom.hu/api/visszajelzes
- **A szöveges visszajelzés** egy `visszajelzes` címkéjű GitHub-jegy lesz, és a GitHub erről e-mailt küld. Ha megoldottad, zárd le. A havi Claude-futás ezeket is átnézi.
- A fogadó kód a `functions/api/visszajelzes.js`, a Cloudflare ezt magától futtatja. Az e-mail-címeket, telefonszámokat és bankszámlaszámokat kitakarja. Naponta legfeljebb 30 jegyet nyit, így egy támadás sem tudja elárasztani a postafiókot.

Egyszeri beállítás (kb. 5 perc):

1. **GitHub-kulcs.** GitHub → jobb felső kép → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
   - Név: `autozom-visszajelzes`.
   - Lejárat: 1 év.
   - Repository access: Only select repositories → `autokoltseg`.
   - Permissions → Repository permissions → Issues: Read and write.
   - Generate token, majd másold ki.
2. **A kulcs a Cloudflare-be.** Workers & Pages → `autokoltseg` → Settings → Variables and Secrets → Add.
   - Type: Secret.
   - Name: `GITHUB_TOKEN`.
   - Value: a kimásolt kulcs.
   - Save.
3. **Számláló-tároló.** Storage & Databases → KV → Create namespace, név: `autozom-szavazat`. Utána: Workers & Pages → `autokoltseg` → Settings → Bindings → Add → KV namespace.
   - Variable name: `SZAVAZAT`.
   - Namespace: `autozom-szavazat`.
   - Save.
4. **Újratelepítés.** Workers & Pages → `autokoltseg` → Deployments → a legfelső sor → ⋯ → Retry deployment. A beállítások csak új telepítéssel élnek.

Amíg ez nincs kész, a gombok működnek, de a szöveg elküldésekor a látogató azt látja, hogy most nem sikerült, és megkapja az e-mail-címet. A kulcs egy év múlva lejár. A `karbantartas.json` szól, mikor kell újat csinálni (ugyanez az 1. és 2. lépés).

## Claude nélkül is

Az oldal futásához nem kell Claude: a GitHub (napi frissítés) és a Cloudflare (tárhely) ingyenes csomagja viszi. Ha egy adatot kézzel kell átírni:

1. A GitHubon nyisd meg a fájlt (például `data/szabalyok.json`), és kattints a ceruza ikonra.
2. Írd át a számot, és ha van, a forrás nevét, URL-jét és időszakát is.
3. Commit changes. A GitHub lefuttatja a teszteket és újraépíti az oldalt, a Cloudflare pár perc múlva kiteszi. Ha a futás piros, a módosítás hibás volt: az oldal a korábbi állapotban marad.
4. A `data/karbantartas.json` fájlban a tétel `utoljara` mezőjébe írd be a mai napot, így a jelzés bezárul.

Nagyobb módosításhoz (új kalkulátor, szöveg) bármelyik kódoló AI-asszisztens vagy fejlesztő elég: a felépítést ez a fájl írja le, a szöveg szabályait a `SZOVEG_STILUS.md`.

## Élesítés

1. GitHub-repó, ide feltöltve.
2. Cloudflare Pages → Create → Connect to Git → ez a repó. Build command: üres, output directory: `web`.
3. `config.json`: márkanév, domain, üzemeltető adatai, kapcsolati e-mail, majd `"eles": true`. Amíg nincs kitöltve, minden oldal `noindex`, és az építő nem engedi élesíteni.
4. Saját domain beállítása a Cloudflare-ben. (Kész: 2026. november 6., autozom.hu; a www és a régi pages.dev cím az autozom.hu-ra visz. A domain a Forpsinál van, évente meg kell újítani.)
