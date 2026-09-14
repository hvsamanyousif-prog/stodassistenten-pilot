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
| Student/nyexaminerad | root `study` + naturligt completed-study `study_to_work`-handoff + avgränsat `young_housing`-handoff → samma personmodul | student/arbete/ekonomi/boende; första arbetslösa dag hålls isär från a-kassa; ungdomsbostadsspåret frågar ålder/boendeform och återanvänder grov känd inkomstförändring i stället för att fråga om den igen | ja; Arbetsförmedlingen för arbetslöshetsövergången och Försäkringskassan för bostadsbidrag till unga | ja | ja, aktörssegmenterad utan rå situationsberättelse | ja, inklusive v20 studier→första jobb/arbetslöshet och v22 studier+bostad+ändrad första inkomst | a-kassa avgör fortfarande eligibility separat; kombinationer med studier, bostad och första anställning som också ändrar hushåll/sambo, flera inkomstslag eller 2027-regler behöver fortsatt source-aware kontroll utan att framtidsregler backportas till 2026 |
| Äldre person | root + samma personmodul + dental quick-help med åldersmedveten 67+-handoff | pension/ekonomi/boende + tandkostnad; kalenderårsålder används bara när den kan ändra kostnadsvägen | ja för visade kandidater, inklusive Försäkringskassan/TLV för 67+-spåret | ja | ja | ja, inklusive tandkostnad och 2026 års 67+-regel | 67+-handoffen avgör inte exakt åtgärd eller slutkostnad; klinikens åtgärds-/prisunderlag och aktuell primärkälla krävs fortsatt |
| Person med funktionsnedsättning | root + syn/assistans/familj → samma personmodul | funktionsbehov, bostad, hjälpmedel och assistans hålls isär från diagnos | ja | ja | ja | ja | lokal/regional variation för hjälpmedel och kommunala insatser kräver fortsatt source-aware routing |
| Anställd | root `work` + naturlig akut-VAB-route + avgränsad `preventive_treatment`-handoff → samma personmodul | arbete/sjukskrivning/ekonomi + ålder/egen sjukfrånvaro/exakta timmar vid VAB; återkommande medicinsk behandling/rehab på arbetstid hålls isär från vanligt vårdbesök, vanlig sjukpenning och arbetsgivarrehab genom frågor om läkarordination/syfte, faktisk frånvaro per tillfälle och behandlingsplansgodkännande | ja; Försäkringskassan när respektive ersättningsväg visas | ja | ja, aktörssegmenterad utan rå situationsberättelse eller behandlingsschema | ja, inklusive deltidssjukskrivning + VAB på timnivå och v25 behandling/rehab på arbetstid | förebyggande-sjukpenning-posten ligger fortsatt `NEEDS_REVIEW`; fler kombinationer mellan arbete, ersättningar, arbetsgivarrehab och familjeansvar behöver long-tail-testas utan att dessa stöd blandas ihop |
| Anhörig/vän som hjälper annan | root actor-ingång + avgränsad naturlig `relative_care`-handoff → samma personmodul | livshotande tillstånd och avstående från arbete/angiven ersättning hålls isär från vanlig omsorg; representation är fortsatt en separat fråga | ja, Försäkringskassan för närståendepenning och läkarutlåtande när det spåret visas | ja: klargör vårdens bedömning, kontrollera läkarutlåtande och aktuell FK-väg utan att lova eligibility | ja, aktörssegmenterad utan rå situationsberättelse | ja, inklusive v21 svårt sjuk närstående + tidigare representationsfall | kommunalt/lokalt anhörigstöd och fullmakt/representation varierar fortsatt och ska inte generaliseras från närståendepenning |
| Barn via vårdnadshavare/familj | root naturligt extra-stödbehov + separat akut-VAB-route → samma personmodul | behovsledd family-handoff + åldersgrind; VAB-flödet frågar ålder och bara route-changing frånvarofakta | ja för visade barnstöd/VAB-vägar | ja | ja | ja, inklusive VAB 12+ och deltidssjukskrivning + VAB | andra familjeersättningar och skol/kommun-kombinationer behöver fortsatt breddas utan att blanda ihop dem med akut VAB |
| Företag | root + company-pilot | finansiering kontra upphandling med information-gain | ja | ja | ja | ja | fortsatt retrievalbredd för faktiska upphandlingar och lokala finansieringskällor |
| Förening/ideell | root `association` → samma personmodul | finansiering/lokal/offentliga möjligheter | ja | ja | ja | ja | lokal/geografisk stödvariation är fortfarande tunn |
| BRF/fastighetsaktör | root `property_actor` / `focus=property_accessibility` → samma produkt | common area kontra inne i lägenhet, beslutsläge, medgivande kontra frivilligt övertagande | ja, Boverket + ansvarig kommun när sakfakta visas | ja | ja, grov aktörssegmentering utan scenariosvar | ja, v17 bostadsanpassning/övertagande | täckningen är fortfarande smal till bostadsanpassning; den ska inte generaliseras till annan fastighetsjuridik utan nya verifierade behov |

## Högprioriterade situationsfamiljer

- pension/låg ekonomi
- arbete/a-kassa
- sjukskrivning/deltid
- planerad behandling/rehabilitering på arbetstid
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

Planerad behandling/rehabilitering v25 är ett permanent exempel på att ett stöd i sanningslagret inte är en produktförmåga förrän naturligt språk kan nå det säkert. Root-skalet får skapa `focus=preventive_treatment` endast vid uttrycklig förebyggande sjukpenning eller en avgränsad kombination av medicinsk behandling/rehabilitering och friktion mot arbetstid. Rå berättelse, diagnos och exakt behandlingsschema följer inte med. Personmodulen frågar i ordning om läkarordination/syfte, faktisk frånvaro per tillfälle inklusive relevant restid och om behandlingsplanen är godkänd. Ett nej eller osäkert svar ska stoppa just denna specialväg utan att påstå att vanlig sjukpenning, arbetsgivarrehabilitering eller annat stöd saknas. Supportposten ligger fortsatt på `NEEDS_REVIEW`; behandlingsplansgodkännande får aldrig beskrivas som garanti för ersättning vid varje behandlingstillfälle.

BRF/fastighetsaktör är ett permanent exempel på att täckningsmatrisen måste följa faktisk produkt. Den publika bostadsanpassningsvägen finns nu, men aktörsetiketten får inte göra BRF/hyresvärd till ursprunglig sökande eller blanda ihop medgivande med ett frivilligt övertagande efter beviljat kontantbidrag.

Tandvård 67+ är ett permanent exempel på hur eval → sanningslager → publik produkt måste hållas ihop. Scenario Lab stoppar påståenden om att “tiotandvård” betyder 10 procent av hela besöket, sanningsposten ligger kvar som `NEEDS_REVIEW`, och samma dental quick-help har nu en källgrundad åldersmedveten handoff för kostnad/stöd. Handoffen får inte avgöra exakt eligibility, åtgärdsomfattning eller slutkostnad; den ska fråga kalenderårsålder endast när svaret kan ändra vägen och sedan skicka användaren vidare till specificerat behandlings-/prisunderlag samt aktuell Försäkringskasse- och TLV-kontroll.

Studier→jobb v20 är ett permanent exempel på demand/friction → språkdetektion → minsta nödvändiga fråga → nästa handling. Den gemensamma root-skalet får känna igen avgränsade formuleringar som `tagit examen`, `nyexaminerad` och motsvarande arabiska/persiska uttryck och lämna över endast `focus=study_to_work`, aldrig den råa berättelsen. I personmodulen frågas först om ett jobb börjar direkt efter studierna; endast om svaret är nej frågas när perioden utan jobb börjar. Arbetsförmedlingens aktuella primärkälla styr rådet om första arbetslösa dagen. Inskrivning får aldrig likställas med automatisk rätt till a-kassa; a-kassan gör den separata bedömningen.

Ung bostadsövergång v22 är ett permanent exempel på att samma naturliga situation kan innehålla studier, boende och ändrad inkomst samtidigt. Root-skalet får bara skapa `focus=young_housing` vid avgränsad ung/student-signal tillsammans med uttrycklig bostadsbidragsfråga eller kombinationen boende + känd inkomstförändring. Handoffen får bara bära grov `context=income_change|general`, aktör och språk — aldrig rå berättelse eller exakt ålder. I personmodulen frågas först om användaren är under 29 och därefter om boendeform. Om root redan har etablerat den grova faktan att inkomsten ändras ska produkten inte fråga samma sak igen. För ett 2026-beslut ska aktuell Försäkringskassekälla styra årsinkomst januari–december och ändringsrapportering; den bekräftade månadsmodellen från 1 januari 2027 får inte backportas till ett 2026-beslut. Sanningsposten för ungdomsbostadsbidrag ligger fortsatt på `NEEDS_REVIEW`, och UI:t får inte lova eligibility eller belopp.

Svårt sjuk närstående v21 är ett permanent exempel på att en bred aktörsingång inte räcker när ett dolt stöd har hög friktion. Root-skalet får bara skapa `focus=relative_care` vid uttrycklig närståendepenning eller avgränsad kombination av svårt/livshotande sjukdom och en nära person. Rå krisberättelse följer inte med. Personmodulen frågar om vården har beskrivit tillståndet som livshotande och, först därefter, om hjälparen behöver avstå från arbete, a-kassa eller föräldrapenning. Ett nej eller osäkert svar får inte bli ett avslag på allt stöd; det ska bara hindra produkten från att lova just närståendepenning. Den befintliga supportposten ligger kvar på `NEEDS_REVIEW` och AI får inte själv göra den `VERIFIED`.

## Pilotprincip

Bredden ska användas för att hitta vita fläckar och rekrytera relevanta testare, men varje pilotperson ska få en tydligt avgränsad situation. Exempel:

- äldre person med begränsad svenska → pension/ekonomi/språk/tillgänglighet
- person med funktionsnedsättning → rättigheter/stöd/dokument/next step
- städföretagare → finansiering/offentlig upphandling
- kommunal upphandlare → buyer-side Red Team på offentlig/historisk/syntetisk data
- föreningsledare → projekt-/anläggnings-/aktivitetsstöd
- landsbygdsboende → geografiskt riktade stöd och transport/energi där verifierat

Feedback ska generaliseras till lärsignaler, inte kopieras som identifierande fall till publikt repo.
