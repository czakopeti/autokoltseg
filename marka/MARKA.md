# autózom – márka

Utolsó módosítás: 2026-11-06. Ez a fájl a mérvadó változat.

## A név

**autózom** (domain: autozom.hu, ékezet nélkül).

- Egyes szám első személy: a látogató mondja, nem mi. Az oldal második személyben szól hozzá („Az autód. A költségeid.
  A döntéseid.”), a név pedig az ő válasza. Párbeszéd a szlogen és a név között.
- Nem szűkít az adóra: az autó teljes pénzügyi életére ráillik (adó, átírás, fenntartás, csere, eladás).
- Az „ó” betű adja a logót: a kör a számlap, az ékezet a mutató.

Kis betűvel írjuk: `autózom`. Mondat elején is.

**Még ellenőrizni (bejegyzés előtt):**
- [ ] Domain: autozom.hu (szabad volt 2026-11-06-án), mellé érdemes: autózom.hu (ékezetes), autozom.com
- [ ] Védjegy: SZTNH és TMview, 9., 35., 36. és 42. osztály
- [ ] Hasonló nevek: autós alkalmazás vagy szolgáltatás „autózom” néven nem került elő (2026-11-06-i keresés).
  Hasonló hangzású: Autóőrszem (közösségi riasztó app), nem összetéveszthető.
- [ ] Közösségi fiókok: Facebook, Instagram

## Szlogen

**Az autód. A költségeid. A döntéseid.**

Rövid változat a pecséthez és kis felületekhez: „NAV-tételekkel számolva”.

## Vizuális koncepció: forgalmi, elszámolás, pecsét

Az oldal tárgyi világa a forgalmi engedély és az elszámolási papír, a pecsét az egyetlen látványos mozzanat
(részletek: `DIZAJN.md`). A logó ehhez igazodik: egyenletes vonalvastagságú, kerek végű betűk, mint egy műszerfal
feliratai, egyetlen pecsétvörös elemmel.

**Kerüljük:** kormány, autóikon, sebességmérő-klisé (a műszer csak az „ó”-ban van jelen), színátmenetek,
pénzérmék és nyilak.

## Logó

Saját rajzolású vektor (Design-vásznon: „autózom logó”; forrás: `marka/rajz.py`).

- **Szókép:** kisbetűs, geometrikus, egyenletes 16 egységnyi vonal 96 egységes x-magasságon, kerek végekkel.
  Az „ó” köre a számlap, benne a pecsétvörös mutató, kívül ugyanazon az egyenesen az ékezet.
  120 px szélesség alatt a mutató nélküli változat (`autozom-logo-kicsi.svg`).
- **Jel:** az „ó” önmagában, mutatóval: alkalmazásikon, favicon, közösségi profilkép.
- Fájlok: `autozom-logo.svg`, `autozom-logo-sotet.svg`, `autozom-logo-kicsi.svg`, `autozom-jel.svg`, `autozom-ikon.svg`.
- Védőzóna: a szókép körül legalább az „o” betű magasságának fele.

## Színek

| Név | Hex | Szerep |
|---|---|---|
| Tinta | `#13312A` | a logó, címek, szöveg |
| Papír | `#E9EEE5` | háttér |
| Lap | `#F8FAF5` | kártyák, elszámolás |
| Pecsétvörös | `#B3261E` | csak a mutató, az ékezet, a pecsét és a hibaüzenet |
| Pecsétvörös sötét háttéren | `#E0574C` | ugyanez sötét alapon |

## Betűk

**Overpass** (változó vastagság, SIL OFL), a közúti táblák betűjéből. A logó szóképe nem betűtípus, hanem rajz.

## Logó – promptok (Grok Imagine, tartalék)

A képgenerátorok a pontos betűzést gyakran elrontják: a végleges szókép a vektoros rajz marad.

**Szókép**
```
Minimal logo wordmark that reads exactly "autózom" in lowercase letters, with the Hungarian acute accent on the "ó".
Monoline geometric sans-serif, uniform stroke weight, rounded stroke ends, circular "a", "o" and "ó".
Deep green-black ink color (#13312A) on pale sage paper background (#E9EEE5). The "ó" is drawn as a small gauge dial:
inside its circle a short vermilion-red needle (#B3261E) points up and to the right from a red center dot, and the
acute accent above it is the same red, on the same line as the needle. No other color. Flat vector, no gradients,
no shadows, no 3D, no car icon, centered, generous negative space.
```

**Jel (alkalmazásikon)**
```
Square app icon with rounded corners, deep green-black background (#13312A). A thick pale sage ring (#E9EEE5) like a
gauge dial; from a red center dot a short coral-red needle (#E0574C) points up-right, and outside the ring the same red
stroke continues as an acute accent mark, as in the Hungarian letter "ó". Flat vector, minimal, centered, no text,
no gradients.
```
