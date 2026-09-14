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
| Privatperson | root + person-pilot | bred personprofil + tand/syn/ekonomi/assistans | ja, per visad stödväg | ja | ja | ja | bred fallback ställer fortfarande fler frågor än vissa fokuserade flöden |
| Student/nyexaminerad | root `study` + naturligt completed-study `study_to_work`-handoff → samma personmodul | student/arbete/ekonomi/boende + om jobb börjar direkt och när första arbetslösa dagen inträffar | ja för visade kandidater; Arbetsförmedlingen för den publika övergångsvägen | ja | ja, aktörssegmenterad | ja, inklusive v20 studier→första jobb/arbetslöshet | a-kassa avgör fortfarande eligibility separat; längre kombinationer med CSN, bostad och första anställning behöver breddas utan att göra övergångsmodulen till egen matcher |
| Äldre person | root + samma personmodul + dental quick-help med åldersmedveten 67+-handoff | pension/ekonomi/boende + tandkostnad; kalenderårsålder används bara när den kan ändra kostnadsvägen | ja för visade kandidater, inklusive Försäkringskassan/TLV för 67+-spåret | ja | ja | ja, inklusive tandkostnad och 2026 års 67+-regel | 67+-handoffen avgör inte exakt åtgärd eller slutkostnad; klinikens åtgärds-/prisunderlag och aktuell primärkälla krävs fortsatt |
| Person med funktionsnedsättning | root + syn/assistans/familj → samma personmodul | funktionsbehov, bostad, hjälpmedel och assistans hålls isär från diagnos | ja | ja | ja | ja | lokal/regional variation för hjälpmedel och kommunala insatser kräver fortsatt source-aware routing |
| Anställd | root `work` + naturlig akut-VAB-route → samma personmodul | arbete/sjukskrivning/ekonomi + ålder/egen sjukfrånvaro/exakta timmar vid VAB | ja | ja | ja, aktörssegmenterad | ja, inklusive deltidssjukskrivning + VAB på timnivå | fler kombinationer mellan arbete, ersättningar och familjeansvar behöver long-tail-testas |
| Anhörig som hjälper annan | root actor-ingång → samma personmodul | representation och den hjälptes situation hålls isär i regressioner | ja | ja | ja, aktörssegmenterad | ja | fullmakt/representation varierar mellan tjänster och ska fortsatt fail-closed |
| Barn via vårdnadshavare/familj | root naturligt extra-stödbehov + separat akut-VAB-route → samma personmodul | behovsledd family-handoff + åldersgrind; VAB-flödet frågar ålder och bara route-changing frånvarofakta | ja för visade barnstöd/VAB-vägar | ja | ja | ja, inklusive VAB 12+ och deltidssjukskrivning + VAB | andra familjeersättningar och skol/kommun-kombinationer behöver fortsatt breddas utan att blanda ihop dem med akut VAB |
| Företag | root + company-pilot | finansiering kontra upphandling med information-gain | ja | ja | ja | ja | fortsatt retrievalbredd för faktiska upphandlingar och lokala finansieringskällor |
| Förening/ideell | root `association` → samma personmodul | finansiering/lokal/offentliga möjligheter | ja | ja | ja | ja | lokal/geografisk stödvariation är fortfarande tunn |
| BRF/fastighetsaktör | root `property_actor` / `focus=property_accessibility` → samma produkt | common area kontra inne i lägenhet, beslutsläge, medgivande kontra frivilligt övertagande | ja, Boverket + ansvarig kommun när sakfakta visas | ja | ja, grov aktörssegmentering utan scenariosvar | ja, v17 bostadsanpassning/övertagande | täckningen är fortfarande smal till bostadsanpassning; den ska inte generaliseras till annan fastighetsjuridik utan nya verifierade behov |

## Högprioriterade situationsfamiljer

- pension/låg ekonomi
- arbete/a-kassa
- sjukskrivning/deltid
- funktionsnedsättning/NPF
- allvarlig sjukdom
- anhörigstöd
- barn/familj
- boende/energi/renovering
- tandvård, inklusive 2026 års förstärkta högkostnadsskydd 67+
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

Familjeflödet och VAB-flödet är avsiktligt separata men delar samma produkt och lärsystem. Root-skalet får lämna över ett grovt `focus=family` för tydliga, behovsledda berättelser om extra omvårdnad/tillsyn/skolstöd och ett separat grovt `focus=vab` för akut sjukt-barn/VAB. Rå situationsberättelse följer inte med. Om åldersgrinden inte stödjer barnspåret får produkten inte fortsätta till barnspecifika resultat.

VAB 12+ behandlas separat i Scenario Lab eftersom ålder, särskilt vård-/tillsynsbehov, medicinskt underlag/förhandsbeslut och aktuell ansökningstid kan ändra vägen. Kombinationen deltidssjukskrivning + VAB behandlas också separat eftersom exakt förläggning av sjukskrivning, arbete och begärd VAB-tid kan ändra svaret; ett dagsprocenttal är inte tillräckligt som ensam beslutsfakta.

BRF/fastighetsaktör är ett permanent exempel på att täckningsmatrisen måste följa faktisk produkt. Den publika bostadsanpassningsvägen finns nu, men aktörsetiketten får inte göra BRF/hyresvärd till ursprunglig sökande eller blanda ihop medgivande med ett frivilligt övertagande efter beviljat kontantbidrag.

Tandvård 67+ är ett permanent exempel på hur eval → sanningslager → publik produkt måste hållas ihop. Scenario Lab stoppar påståenden om att “tiotandvård” betyder 10 procent av hela besöket, sanningsposten ligger kvar som `NEEDS_REVIEW`, och samma dental quick-help har nu en källgrundad åldersmedveten handoff för kostnad/stöd. Handoffen får inte avgöra exakt eligibility, åtgärdsomfattning eller slutkostnad; den ska fråga kalenderårsålder endast när svaret kan ändra vägen och sedan skicka användaren vidare till specificerat behandlings-/prisunderlag samt aktuell Försäkringskasse- och TLV-kontroll.

Studier→jobb v20 är ett permanent exempel på demand/friction → språkdetektion → minsta nödvändiga fråga → nästa handling. Den gemensamma root-skalet får känna igen avgränsade formuleringar som `tagit examen`, `nyexaminerad` och motsvarande arabiska/persiska uttryck och lämna över endast `focus=study_to_work`, aldrig den råa berättelsen. I personmodulen frågas först om ett jobb börjar direkt efter studierna; endast om svaret är nej frågas när perioden utan jobb börjar. Arbetsförmedlingens aktuella primärkälla styr rådet om första arbetslösa dagen. Inskrivning får aldrig likställas med automatisk rätt till a-kassa; a-kassan gör den separata bedömningen.

## Pilotprincip

Bredden ska användas för att hitta vita fläckar och rekrytera relevanta testare, men varje pilotperson ska få en tydligt avgränsad situation. Exempel:

- äldre person med begränsad svenska → pension/ekonomi/språk/tillgänglighet
- person med funktionsnedsättning → rättigheter/stöd/dokument/next step
- städföretagare → finansiering/offentlig upphandling
- kommunal upphandlare → buyer-side Red Team på offentlig/historisk/syntetisk data
- föreningsledare → projekt-/anläggnings-/aktivitetsstöd
- landsbygdsboende → geografiskt riktade stöd och transport/energi där verifierat

Feedback ska generaliseras till lärsignaler, inte kopieras som identifierande fall till publikt repo.
