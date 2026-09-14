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
| Person med funktionsnedsättning | root + syn/assistans/familj + avgränsat naturligt `activity_compensation_age30`-handoff → samma personmodul | funktionsbehov, bostad, hjälpmedel och assistans hålls isär från diagnos; v31/v32 håller aktivitetsersättning, sjukersättning och sjukpenning i särskilda fall isär och ställer SGI-/skyddsfrågor endast när de kan ändra vägen | ja för visade vägar; posten för sjukpenning i särskilda fall ligger `NEEDS_REVIEW` | ja; fokuserad 30-årsväg ger fail-closed nästa steg utan automatisk konvertering | ja, utan rå hälsoberättelse i handoff eller feedback | ja, inklusive v31 aktivitetsersättning→30-årsövergång/boendestödsgräns och v32 publik handoff | lokal/regional variation för hjälpmedel och kommunala insatser kräver fortsatt source-aware routing; 30-årsövergången har nu sannings-, regressions- och fokuserad publik handoff men ingen eligibility-, belopps- eller beslutsmotor |
| Anställd | root `work` + naturlig akut-VAB-route + avgränsad `preventive_treatment`-handoff + avgränsad `work_injury_dental`-handoff → samma personmodul | arbete/sjukskrivning/ekonomi + VAB-timmar; behandling/rehab på arbetstid hålls isär från vanligt vårdbesök; tandskada i arbete/arbetsresa hålls isär från vanlig tandvård och trafikolycka på arbetsresan får en separat Afa-/trafikförsäkringsgräns | ja; Försäkringskassan per ersättningsväg och Afa endast för separat kollektivavtalsgräns när arbetsskadespåret visas | ja | ja, aktörssegmenterad utan rå situationsberättelse, arbetsgivare, exakt tandkostnad eller behandlingsschema | ja, inklusive deltidssjukskrivning + VAB, v25 behandling/rehab på arbetstid samt v26–v27 arbetsskada+tandvård/arbetsresa | sanningsposten för arbetsskade-tandvård och förebyggande sjukpenning ligger fortsatt `NEEDS_REVIEW`; ansvarigt trafikförsäkringsbolag får aldrig gissas och fler kombinationer mellan arbete, ersättningar och försäkringar behöver long-tail-testas |
| Egenföretagare | root naturligt tandskada+i arbete + uttrycklig egenföretagarkontext → samma `work_injury_dental`-modul | v37 bevarar endast grov `work_context=self_employed`; Försäkringskassans kostnadsväg hålls isär från Fora/TFA och först efter kärnfrågorna ställs frågan om aktuellt Fora-försäkrings-/grundavtal | ja; Försäkringskassan för arbetsskade-tandvård och Fora för avtals-/TFA-gränsen | ja; kontrollera först skade-/behandlings-/underlagsvägen, därefter endast avtalsfaktan som kan ändra TFA-spåret | ja, samma person-pilot-feedback utan rå skadeberättelse, företagsnamn, avtalsnummer eller kostnad | ja, v29–v30 sanningsgränser + v37 publik integration | täckningen är avgränsad till arbetsskada+tandvård; företagsform/F-skatt får inte användas som bevis på arbetsskada eller försäkringsskydd och andra egenföretagarersättningar kräver egna verifierade scenarier |
| Egenanställd via faktureringsföretag | root naturligt tandskada+i uppdrag + uttrycklig faktureringsföretagskontext → samma `work_injury_dental`-modul | v37 bevarar endast grov `work_context=invoiced_worker`; faktureringsföretaget behandlas som arbetsgivarkontext enligt aktuell FK-väg utan att användaren konverteras till enskild näringsidkare eller antas ha TFA/Afa | ja; Försäkringskassan för egenanställnings-/arbetsgivarkontext och arbetsskade-tandvård | ja; kontrollera samma FK-kärnväg och verifiera faktisk kollektiv-/privat försäkring separat | ja, samma person-pilot-feedback utan klient-, företags-, uppdrags- eller hälsodetaljer | ja, v29 sanningsgräns + v37 publik integration | den publika vägen avgör inte faktisk kollektivavtalad försäkring hos faktureringsföretaget; den får inte inferera TFA/Afa från egenanställningen |
| Anhörig/vän som hjälper annan | root actor-ingång + avgränsad naturlig `relative_care`-handoff → samma personmodul | livshotande tillstånd och avstående från arbete/angiven ersättning hålls isär från vanlig omsorg; representation är fortsatt en separat fråga | ja, Försäkringskassan för närståendepenning och läkarutlåtande när det spåret visas | ja: klargör vårdens bedömning, kontrollera läkarutlåtande och aktuell FK-väg utan att lova eligibility | ja, aktörssegmenterad utan rå situationsberättelse | ja, inklusive v21 svårt sjuk närstående + tidigare representationsfall | kommunalt/lokalt anhörigstöd och fullmakt/representation varierar fortsatt och ska inte generaliseras från närståendepenning |
| Barn via vårdnadshavare/familj | root naturligt extra-stödbehov + separat akut-VAB-route → samma personmodul | behovsledd family-handoff + åldersgrind; VAB-flödet frågar ålder och bara route-changing frånvarofakta | ja för visade barnstöd/VAB-vägar | ja | ja | ja, inklusive VAB 12+ och deltidssjukskrivning + VAB | andra familjeersättningar och skol/kommun-kombinationer behöver fortsatt breddas utan att blanda ihop dem med akut VAB |
| Företag | root + company-pilot; om företag väljs i breda personflödets org-ingång återför v36 till samma company-pilot | finansiering kontra upphandling med information-gain; föreningsstöd får inte läcka in i företagsresan | ja | ja | ja | ja, inklusive v36 företag→samma company-pilot utan LOK/RF-falskpositiv | fortsatt retrievalbredd för faktiska upphandlingar och lokala finansieringskällor |
| Förening/ideell | root `association` → samma personmodul; v36 återanvänder känd aktör och hoppar över redundant förening/företag-fråga | behovet finansiering/lokal/offentlig affär styr källfamilj; lokal kommun, MUCF, Arvsfonden, Stiftelsesök och offentlig affär hålls isär | ja; MUCF, ansvarig kommuns officiella webb via SKR:s kommunlista, Allmänna arvsfonden, Länsstyrelsernas Stiftelsesök samt Upphandlingsmyndigheten när offentlig affär visas | ja; Stiftelsesök märks discovery-only och RF-stöd visas bara som villkorat idrottsspår | ja, aktörssegmenterad; v36 skickar inga förenings-, medlems- eller ansökningsuppgifter | ja, inklusive v36 källfragmentering, company-contamination och AR/FA-språkparitet | ingen automatisk kommunspecifik retrieval ännu; kultur-/idrotts-/målgruppsspecifika stöd behöver fortsatt source-aware branching i stället för en universell bidragslista |
| BRF/fastighetsaktör | root `property_actor` / `focus=property_accessibility` → samma produkt | common area kontra inne i lägenhet, beslutsläge, medgivande kontra frivilligt övertagande | ja, Boverket + ansvarig kommun när sakfakta visas | ja | ja, grov aktörssegmentering utan scenariosvar | ja, v17 bostadsanpassning/övertagande | täckningen är fortfarande smal till bostadsanpassning; den ska inte generaliseras till annan fastighetsjuridik utan nya verifierade behov |

## Högprioriterade situationsfamiljer

- pension/låg ekonomi
- arbete/a-kassa
- sjukskrivning/deltid
- planerad behandling/rehabilitering på arbetstid
- arbetsskada/tandvård/försäkringsgränser, inklusive egenföretagare/egenanställd worker-context
- funktionsnedsättning/NPF
- aktivitetsersättning → 30-årsövergång/SGI/boendestöd
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

Arbetsskada + tandvård v27/v29/v30/v37 är ett permanent exempel på samma eval → sanningslager → publik produkt-princip. v26 gav en review-gated sanningspost och regression, och v27 lät samma root-skal förstå en avgränsad naturlig berättelse om faktisk tandskada i arbete eller på arbetsresan. v29–v30 visade därefter att `employee` inte är en säker universell arbetarkontext: egenföretagare kan behöva hålla Försäkringskassans statliga väg isär från ett faktiskt Fora-avtal/TFA, medan egenanställda via faktureringsföretag inte ska behandlas som enskild näringsidkare. v37 gör den distinktionen publik i samma modul. Handoffen bär bara `actor_type`, `focus=work_injury_dental`, språk och när det är uttryckligen känt ett av två grova `work_context`-värden (`self_employed` eller `invoiced_worker`) — aldrig rå skadeberättelse, företags-/klientnamn, avtalsnummer, exakt kostnad eller hälsodata. Kärnfrågorna om skadeplats, behandlingssamband och kostnadsunderlag/tandläkaranslutning är gemensamma. För egenföretagare får frågan om aktuellt Fora-försäkrings-/grundavtal ställas först när den kan ändra TFA-spåret; ja eller nej får inte avgöra Försäkringskassans separata prövning. För egenanställd används faktureringsföretaget endast som arbetsgivarkontext enligt aktuell Försäkringskassekälla och faktisk Afa/TFA-/annan försäkring får inte infereras från upplägget. Vanlig tandvärk hos någon som arbetar får fortfarande inte trigga specialvägen. Vid trafikolycka på arbetsresan hålls Försäkringskassans separata arbetsskadeprövning isär från trafik-/kollektivavtalade försäkringslager. Supportposten ligger fortsatt på `NEEDS_REVIEW`.

BRF/fastighetsaktör är ett permanent exempel på att täckningsmatrisen måste följa faktisk produkt. Den publika bostadsanpassningsvägen finns nu, men aktörsetiketten får inte göra BRF/hyresvärd till ursprunglig sökande eller blanda ihop medgivande med ett frivilligt övertagande efter beviljat kontantbidrag.

Tandvård 67+ är ett permanent exempel på hur eval → sanningslager → publik produkt måste hållas ihop. Scenario Lab stoppar påståenden om att “tiotandvård” betyder 10 procent av hela besöket, sanningsposten ligger kvar som `NEEDS_REVIEW`, och samma dental quick-help har nu en källgrundad åldersmedveten handoff för kostnad/stöd. Handoffen får inte avgöra exakt eligibility, åtgärdsomfattning eller slutkostnad; den ska fråga kalenderårsålder endast när svaret kan ändra vägen och sedan skicka användaren vidare till specificerat behandlings-/prisunderlag samt aktuell Försäkringskasse- och TLV-kontroll.

Studier→jobb v20 är ett permanent exempel på demand/friction → språkdetektion → minsta nödvändiga fråga → nästa handling. Den gemensamma root-skalet får känna igen avgränsade formuleringar som `tagit examen`, `nyexaminerad` och motsvarande arabiska/persiska uttryck och lämna över endast `focus=study_to_work`, aldrig den råa berättelsen. I personmodulen frågas först om ett jobb börjar direkt efter studierna; endast om svaret är nej frågas när perioden utan jobb börjar. Arbetsförmedlingens aktuella primärkälla styr rådet om första arbetslösa dagen. Inskrivning får aldrig likställas med automatisk rätt till a-kassa; a-kassan gör den separata bedömningen.

Ung bostadsövergång v22 är ett permanent exempel på att samma naturliga situation kan innehålla studier, boende och ändrad inkomst samtidigt. Root-skalet får bara skapa `focus=young_housing` vid avgränsad ung/student-signal tillsammans med uttrycklig bostadsbidragsfråga eller kombinationen boende + känd inkomstförändring. Handoffen får bara bära grov `context=income_change|general`, aktör och språk — aldrig rå berättelse eller exakt ålder. I personmodulen frågas först om användaren är under 29 och därefter om boendeform. Om root redan har etablerat den grova faktan att inkomsten ändras ska produkten inte fråga samma sak igen. För ett 2026-beslut ska aktuell Försäkringskassekälla styra årsinkomst januari–december och ändringsrapportering; den bekräftade månadsmodellen från 1 januari 2027 får inte backportas till ett 2026-beslut. Sanningsposten för ungdomsbostadsbidrag ligger fortsatt på `NEEDS_REVIEW`, och UI:t får inte lova eligibility eller belopp.

Svårt sjuk närstående v21 är ett permanent exempel på att en bred aktörsingång inte räcker när ett dolt stöd har hög friktion. Root-skalet får bara skapa `focus=relative_care` vid uttrycklig närståendepenning eller avgränsad kombination av svårt/livshotande sjukdom och en nära person. Rå krisberättelse följer inte med. Personmodulen frågar om vården har beskrivit tillståndet som livshotande och, först därefter, om hjälparen behöver avstå från arbete, a-kassa eller föräldrapenning. Ett nej eller osäkert svar får inte bli ett avslag på allt stöd; det ska bara hindra produkten från att lova just närståendepenning. Den befintliga supportposten ligger kvar på `NEEDS_REVIEW` och AI får inte själv göra den `VERIFIED`.

Aktivitetsersättning → 30-årsövergång v31/v32 är ett permanent exempel på att en förutsägbar åldersgräns kan kräva flera separata vägar utan att produkten får välja åt användaren. Scenario Lab håller aktivitetsersättning, sjukersättning och sjukpenning i särskilda fall isär och förbjuder automatisk konvertering. v32 gör samma lärdom publik i samma shell: en avgränsad naturlig kombination av aktivitetsersättning + 30-årsgräns lämnar över endast `actor_type=private_person`, `focus=activity_compensation_age30` och språk, aldrig rå berättelse, diagnos, SGI eller andra hälsodata. Personmodulen frågar först om aktivitetsersättningen löper till och med månaden före 30-årsdagen, därefter om arbetsförmågan framåt; SGI frågas endast om specialfallsspåret faktiskt kan bli relevant och skydd av rätten först efter låg/saknad SGI. Bostadstillägg och boendetillägg hålls isär och kontrolleras först efter att primär ersättningsväg klargjorts. Sanningsposten för sjukpenning i särskilda fall ligger fortsatt `NEEDS_REVIEW`; handoffen får inte lova eligibility, belopp, deadline eller beslut.

Föreningsfinansiering v36 är ett permanent exempel på att en aktörsetikett inte räcker för relevant ranking. Den tidigare org-vägen frågade förening/företag även när `actor_type=association` redan var känt och visade därefter samma sporttunga resultatlista oavsett organisation och behov. v36 återanvänder känd föreningskontext, låter behovet finansiering/lokal/offentlig affär styra källfamilj och håller kommunala föreningsstöd, MUCF:s ändamålsstyrda bidrag, Allmänna arvsfondens stödformer och Stiftelsesök som separata discoveryvägar. Stiftelsesök får aldrig tolkas som bevis på öppen ansökan; RF:s anläggningsstöd får inte visas som generellt stöd för alla ideella föreningar. Företag som når den breda org-vägen återförs till det befintliga company-pilot-flödet i samma produkt i stället för att få föreningsstöd. Resultatförklaringarna ska vara språkparitets-säkrade på svenska, arabiska och persiska utan att primärkällans villkor översätts till ett eligibilitybeslut.

## Pilotprincip

Bredden ska användas för att hitta vita fläckar och rekrytera relevanta testare, men varje pilotperson ska få en tydligt avgränsad situation. Exempel:

- äldre person med begränsad svenska → pension/ekonomi/språk/tillgänglighet
- person med funktionsnedsättning → rättigheter/stöd/dokument/next step
- städföretagare → finansiering/offentlig upphandling
- egenföretagare/egenanställd → samma arbetsskade-/tandvårdsflöde med verifierad worker-context och separata försäkringslager
- kommunal upphandlare → buyer-side Red Team på offentlig/historisk/syntetisk data
- föreningsledare → projekt-/anläggnings-/aktivitetsstöd
- landsbygdsboende → geografiskt riktade stöd och transport/energi där verifierat

Feedback ska generaliseras till lärsignaler, inte kopieras som identifierande fall till publikt repo.