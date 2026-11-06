# Dizájn

Az oldal tárgyi világa a **forgalmi engedély** és a **NAV-határozat**. Minden új oldal ebből a kettőből építkezik.

## Elemek

| Elem | Mire való | Szabály |
|---|---|---|
| Forgalmi-kártya (`.forgalmi`) | Az űrlap | Lekerekített „plasztikkártya”, guilloche-rozetta a sarokban. A mezők előtt a forgalmi valódi kódja (P.1, P.2, P.3, V.9, B), csak ha tényleg onnan jön az adat. |
| Beírósor (`.beir`) | Számmező | Aláhúzott mező, mint egy nyomtatványon. Nincs dobozos input. |
| Négyzet (`.negyzet`) | Rádió és jelölő | Nyomtatványos négyzet pipával. |
| Elszámolás (`.elszamolas`) | Az eredmény | Perforált felső élű papírlap, tételsorok, a végösszeg alatt könyvelői dupla aláhúzás. |
| Pecsét (`.pecset`) | Az egyetlen látványos mozzanat | Betöltéskor egyszer rácsapódik. Máshol nincs önmagától induló mozgás. |

## Színek

Papír `#E9EEE5`, lap `#F8FAF5`, tinta `#13312A`, halvány tinta `#4A655D`, guilloche `#A9C3B6`, pecsétvörös `#B3261E`.
A pecsétvörös csak a pecséten, a logón és a hibaüzenetben szerepel. Sötét módban ugyanezek a szerepek mélyzöld alapon.

## Betűk

Bricolage Grotesque (címek, összegek, beírt számok), Public Sans (szöveg, űrlap). Mondatkezdő írásmód mindenhol, nincs csupa nagybetűs felirat.

## Amit kerülünk

Csupa nagybetűs feliratok a címek fölött, monospace címkék, középső pontos felsorolás, nyíl a gombok végén, 01/02/03 számozás, ha nincs valódi sorrend, egyforma kártyák rácsban, görgetésre beúszó szekciók, egyetlen kiemelt szó a címben.
