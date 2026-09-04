# Stödassistenten – nationell stödingest / Support Ingestion Engine

## Syfte

Bygg en separat motor som systematiskt hittar, hämtar, normaliserar, klassificerar och versionshanterar stöd, bidrag, rättigheter, tjänster och finansieringsmöjligheter i Sverige.

Målet är inte att "skrapa internet och tro på allt". Målet är en verifierbar pipeline där varje post kan spåras tillbaka till en primär källa och där ändringar upptäcks.

## Källkategorier

Prioriterad täckning:

1. Nationella myndigheter och statliga verk
2. Kommuner
3. Regioner
4. Pensions-, socialförsäkrings- och arbetsmarknadsstöd
5. CSN/studier
6. LSS/funktionsnedsättning/anhörigstöd
7. Vårdrelaterade ekonomiska och praktiska stödvägar
8. Bostad, energi och bostadsanpassning
9. Stiftelser, fonder och utdelande organisationer
10. Barnfamiljer och ungdom
11. Pensionärer
12. Arbetslöshet/a-kassa/sjukskrivning
13. Föreningar/idrott/kultur
14. BRF/fastighet
15. Företagsstöd, finansiering och offentlig upphandling
16. EU-program där svenska användare/organisationer kan vara behöriga
17. Patient-, funktionsrätts- och anhörigorganisationer när de erbjuder konkret stöd eller vägledning

## Ingestionsstrategi

Använd flera metoder i följande ordning:

1. Officiellt API eller öppna data
2. RSS/Atom/sitemaps
3. Strukturerade JSON/CSV/XML-källor
4. Officiella webbplatser
5. PDF/dokument från primär källa
6. Manuell verifiering för svårtolkade eller särskilt viktiga poster

Crawlern ska respektera robots.txt, användarvillkor och rimliga anropsgränser. Vi ska inte försöka kringgå skydd eller kopiera material vi saknar rätt att återpublicera.

## Normaliserat stödobjekt

Varje stödpost bör minst innehålla:

- support_id
- namn
- kategori
- undertyp
- målgrupp
- geografi: nationell/region/kommun
- ålder/min/max där relevant
- hushåll/familjesituation
- arbete/studier/pension
- funktionsnedsättning/sjukdom som villkor där relevant
- inkomst-/förmögenhetsvillkor om tillämpligt
- syfte
- belopp eller beräkningsmodell om källan uttryckligen anger det
- period/deadline
- återkommande eller engångsstöd
- centrala behörighetsvillkor
- exklusionsvillkor
- dokument som brukar krävas
- ansökningssätt
- officiell ansökningslänk
- primär källa
- source_url
- source_type
- source_published_at om tillgängligt
- first_seen_at
- last_seen_at
- last_verified_at
- verification_status
- change_hash / version
- confidence/source_quality

## Verifieringsstatus

Poster ska ha tydlig status:

- DISCOVERED – hittad men ännu inte produktklar
- PARSED – strukturerad maskinellt
- NEEDS_REVIEW – kräver kontroll
- VERIFIED – kontrollerad mot primär källa
- CHANGED – källan har förändrats sedan senaste verifiering
- EXPIRED – stödet/perioden har upphört
- ARCHIVED – historik, inte längre aktiv träff

Endast VERIFIED ska få användas för starka produktpåståenden. Övriga kan användas internt för research och granskningskö.

## Ändringsdetektering

Varje körning ska:

1. kontrollera om källan fortfarande finns,
2. beräkna hash/diff av relevanta innehållsfält,
3. upptäcka ändrade datum, belopp, målgrupp, villkor och ansökningsväg,
4. markera posten CHANGED,
5. skapa granskningsuppgift innan ändringen påverkar användarens matchning om den är materiell.

Viktiga stöd bör ha tätare kontrollfrekvens än långsamt föränderliga stiftelseändamål.

## AI:s roll

AI får hjälpa till att:

- extrahera struktur ur text,
- föreslå kategori och målgrupp,
- hitta potentiella villkorsfält,
- sammanfatta vad som ändrats,
- föreslå frågor som behövs för matchning.

AI får inte själv märka en post VERIFIED eller hitta på saknade regler. Verifiering måste bygga på källan och senare kunna granskas av människa/regelmotor.

## Deduplicering

Samma stöd kan förekomma på flera sidor. Motorn ska kunna slå ihop poster genom:

- organisationsägare
- namn
- ansökningslänk
- geografi
- målgrupp
- semantisk likhet

Men originalkällor och versionshistorik ska behållas.

## Privat kärna

Den riktiga stöddatabasen, crawlerlogik, regler och verifieringskö ska ligga i privat backend/repo. Den publika GitHub Pages-piloten får bara innehålla ett begränsat testdataset.

## Första implementeringsordning

Fas 1: bygg source registry + datamodell + verifieringsstatus.

Fas 2: anslut 10–20 högvärdiga nationella primärkällor och Länsstyrelsens stiftelsedata.

Fas 3: kommun/region-ingest med prioriterade kommuner från pilotanvändarna.

Fas 4: change detection + granskningskö + automatisk versionshistorik.

Fas 5: bred nationell täckning och därefter EU-/B2B-stöd.

## Produktprincip

Bredd utan kvalitet är farligare än liten täckning med verifierade träffar.

Därför mäter vi två separata saker:

- Coverage: hur mycket av stödsystemet vi har upptäckt
- Trust: hur stor andel som är verifierad, aktuell och matchningsbar

Stödassistentens förtroende byggs på Trust först, Coverage därefter.
