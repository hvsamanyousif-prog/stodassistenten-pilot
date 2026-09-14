# Pilot coverage matrix

Syftet med denna matris är att göra Stödassistentens bredd mätbar utan att låtsas att allt redan är färdigt. Matrisen beskriver publika vägar och regressionsskydd; den är inte en eligibility- eller sanningskälla.

## Kvalitetsstatus

Varje kombination av aktör × situation × geografi × stödtyp ska kunna märkas som:

- UNDISCOVERED
- SIGNAL_ONLY
- SOURCE_IDENTIFIED
- NEEDS_REVIEW
- VERIFIED_DATA
- MATCHING_TESTED
- PILOT_TESTED
- PRODUCTION_READY

`PRODUCTION_READY` får aldrig sättas enbart av en AI-modell.

## Operativ publik täckning

| Aktör | Fungerande ingång | Situationsförståelse | Primärkällor när fakta visas | Konkret nästa handling | Anonym feedback | Regression | Aktuell lucka |
|---|---|---|---|---|---|---|---|
| Privatperson | root + person-pilot | bred personprofil + tand/syn/ekonomi | ja, per visad stödväg | ja | ja | ja | bred fallback ställer fortfarande fler frågor än vissa fokuserade flöden |
| Student/nyexaminerad | root `study` → samma personmodul | student/arbete/ekonomi/boende | ja för visade kandidater | ja | ja, aktörssegmenterad | ja | naturligt språk kan fortfarande behöva bättre övergångsdetektion mellan studier och första jobb |
| Anställd | root `work` → samma personmodul | arbete/sjukskrivning/ekonomi | ja | ja | ja, aktörssegmenterad | ja, inklusive deltidssjukskrivning + VAB på timnivå | publik väg saknar ännu fokuserad handoff för kombinationen arbete + familjeansvar + sjukdom |
| Anhörig som hjälper annan | root actor-ingång → samma personmodul | representation och den hjälptes situation hålls isär i regressioner | ja | ja | ja, aktörssegmenterad | ja | fullmakt/representation varierar mellan tjänster och ska fortsatt fail-closed |
| Barn via vårdnadshavare/familj | root naturligt extra-stödbehov → samma personmodul + person-pilot familjeingång | behovsledd family-handoff + åldersgrind + behov av omvårdnad/tillsyn/skola | ja för visade barnstöd | ja | ja | ja | VAB 12+ och deltidssjukskrivning + VAB finns som evals men ännu inte som egna publika fokuserade stödvägar |
| Företag | root + company-pilot | finansiering kontra upphandling med information-gain | ja | ja | ja | ja | fortsatt retrievalbredd för faktiska upphandlingar och lokala finansieringskällor |
| Förening/ideell | root `association` → samma personmodul | finansiering/lokal/offentliga möjligheter | ja | ja | ja | ja | lokal/geografisk stödvariation är fortfarande tunn |
| BRF/fastighetsaktör | ingen tydlig dedikerad publik ingång ännu | bostadsanpassning fångar ägare/rättighetshavare som processfakta, inte som full aktörsväg | delvis | delvis | inte egen aktörssegmentering | scenarioregression finns för bostadsanpassning | **svag täckning**: bör prioriteras först när verifierade behov visar att en egen ingång ger högre nytta utan parallell motor |

## Högprioriterade situationsfamiljer

- pension/låg ekonomi
- arbete/a-kassa
- sjukskrivning/deltid
- funktionsnedsättning/NPF
- allvarlig sjukdom
- anhörigstöd
- barn/familj
- boende/energi/renovering
- tandvård
- försäkrings-/ersättningsspår
- anställningsförmåner
- mobilitet/fordon/laddning när verifierat stöd finns
- landsbygd/geografiskt riktade stöd
- företag/finansiering
- offentlig upphandling
- förening/idrott/kultur
- stiftelser/fonder
- kommunala/regionala lokala stöd

## Aktuell självgranskningsregel

En fråga räknas inte som situationsförståelse om svaret inte kan ändra routing, ranking, säker nästa handling eller behovet av verifiering. När en fråga visar att ett specialiserat flöde inte längre passar ska produkten fail-closed inom samma Stödassistenten i stället för att fortsätta till fel målgruppsstöd.

Familjeflödet är ett permanent exempel: root-skalet får nu lämna över ett grovt `focus=family` för tydliga, behovsledda berättelser om extra omvårdnad/tillsyn/skolstöd, men rå situationsberättelse följer inte med. Om åldersgrinden sedan inte stödjer barnspåret får produkten inte fortsätta till barnspecifika resultat. Ett vanligt VAB-ärende ska inte triggas av den familjerouten bara för att ordet barn förekommer.

VAB 12+ behandlas separat i Scenario Lab eftersom ålder, särskilt vård-/tillsynsbehov, medicinskt underlag/förhandsbeslut och aktuell ansökningstid kan ändra vägen. Kombinationen deltidssjukskrivning + VAB behandlas också separat eftersom exakt förläggning av sjukskrivning, arbete och begärd VAB-tid kan ändra svaret; ett dagsprocenttal är inte tillräckligt som ensam beslutsfakta.

## Pilotprincip

Bredden ska användas för att hitta vita fläckar och rekrytera relevanta testare, men varje pilotperson ska få en tydligt avgränsad situation. Exempel:

- äldre person med begränsad svenska → pension/ekonomi/språk/tillgänglighet
- person med funktionsnedsättning → rättigheter/stöd/dokument/next step
- städföretagare → finansiering/offentlig upphandling
- kommunal upphandlare → buyer-side Red Team på offentlig/historisk/syntetisk data
- föreningsledare → projekt-/anläggnings-/aktivitetsstöd
- landsbygdsboende → geografiskt riktade stöd och transport/energi där verifierat

Feedback ska generaliseras till lärsignaler, inte kopieras som identifierande fall till publikt repo.
