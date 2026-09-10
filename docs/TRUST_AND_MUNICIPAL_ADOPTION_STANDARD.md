# Stödassistenten – Trust & Municipal Adoption Standard

## Huvudmannakrav

Stödassistenten ska byggas med sådan faktisk kvalitet, intelligens och seriositet att människor naturligt vill rekommendera tjänsten till anhöriga, vänner och grannar, och så att kommuner kan vilja införa den eller kommunanställda tryggt kan hänvisa invånare till den där det är lämpligt.

Detta är ett kvalitetskrav, inte ett marknadsföringspåstående.

## Två bevis på produktkvalitet

### 1. Människor rekommenderar den vidare

En stark produkt ska skapa ögonblicket:

> “Det här hjälpte mig faktiskt. Du borde testa den också.”

Det kräver:

- hög träffsäkerhet,
- relevanta följdfrågor,
- tydligt nästa steg,
- begripligt språk,
- respektfullt bemötande,
- hög språk- och tillgänglighetsparitet,
- inga självsäkra hallucinationer,
- tydliga verifierade källor,
- låg friktion även för personer med låg digital vana,
- verklig nytta även när användaren inte känner till namnet på stödet.

Rekommendation ska förtjänas genom produktupplevelsen, inte genom incitament som riskerar att underminera förtroendet.

### 2. Kommunal införbarhet och trygg hänvisning

Stödassistenten ska på sikt kunna tåla granskning från kommuner, kommunanställda och andra professionella aktörer.

Det kräver bland annat:

- tydlig gräns mellan vägledning och myndighetsbeslut,
- spårbara och aktuella källor,
- versionsstyrda regler och verifieringsdatum,
- dokumenterad osäkerhet och fail-closed-beteende,
- GDPR/privacy-by-design,
- dataminimering,
- tillgänglighet,
- informationssäkerhet,
- språkparitet,
- audit trail där ärendefunktioner senare införs,
- tydlig ansvarsfördelning mellan AI, verifierad regelmotor och människa,
- mätbar kvalitet och regressionstester,
- möjlighet till professionell granskning och pilotvalidering.

Kommunal införbarhet får aldrig beskrivas som bevisad innan verklig kommunal validering, juridisk bedömning, säkerhetsgranskning och relevanta upphandlings-/införandekrav faktiskt har klarats.

## Produktmått att bygga mot

Utöver tekniska kvalitetsmått ska projektet successivt mäta:

- andel användare som skulle rekommendera tjänsten vidare,
- faktisk återanvändning,
- upplevd nytta,
- om användaren fick reda på något relevant som den inte kände till,
- om nästa steg blev tydligt,
- andel professionella testare som skulle känna sig trygga med att hänvisa någon till tjänsten,
- tydlighet i källa och verifieringsstatus,
- andel fall där användaren eller professionell granskare upptäcker missad relevant stödväg,
- språk- och populationsparitet,
- antal allvarliga fel som omvandlas till permanenta regressionstester.

Inga målnivåer ska kommuniceras externt som uppnådda förrän de faktiskt har mätts.

## Distributionsprincip

Den starkaste långsiktiga distributionen ska vara förtroendedriven:

människa → faktisk hjälp → förtroende → rekommendation → fler användare → mer kvalitetsdata → bättre produkt.

För professionella och kommuner:

pilot → verifierad nytta → granskningsbarhet → förtroende → hänvisning/införande → större kvalitetssignal.

## Kärnformulering

**Kvaliteten ska göra Stödassistenten rekommenderad. Seriositeten ska göra den införbar. Intelligensen ska göra den värd att återvända till.**

## Förbud mot genvägar

Projektet får inte försöka köpa eller simulera förtroende genom att:

- överdriva träffsäkerhet,
- kalla syntetiska tester verklig användarvalidering,
- antyda kommunalt stöd eller rekommendation som inte finns,
- dölja osäkerhet,
- visa overifierade regler som säkra,
- använda kommersiella rekommendationer för att påverka stödmatchningen,
- prioritera tillväxt framför korrekthet i känsliga situationer.

## Operativ konsekvens

Varje större release ska bedömas ur två perspektiv:

1. Skulle en människa som fått verklig hjälp vilja rekommendera detta till någon den bryr sig om?
2. Skulle en seriös kommunanställd kunna förstå hur svaret uppstod, vilka källor som användes och vilka begränsningar som finns?

Om svaret på någon av frågorna är nej är produkten inte färdig på den nivån.
