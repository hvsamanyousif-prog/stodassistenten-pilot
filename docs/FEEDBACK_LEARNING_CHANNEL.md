# Feedback & learning channel

## Mål

En pilotanvändare ska kunna ge feedback direkt i Stödassistenten utan att lämna flödet. Feedbacken ska kunna användas för att göra produkten bättre utan att skapa en bakdörr för onödig känslig persondata.

## Nuläge

Den publika piloten har redan strukturerad anonym produktfeedback: bedömning per träff och avslutande frågor om nytta, ny information och tydlighet i nästa steg.

Nästa nivå är en frivillig textkanal för produktfeedback.

## Föreslaget användarflöde

Efter eller under ett resultat kan användaren välja `Skriv vad vi borde förbättra` och lämna en kort kommentar.

Exempel på önskad feedback:
- "Jag förstod inte varför ni frågade om boendet."
- "Ni missade ett stöd jag känner till."
- "Nästa steg var otydligt."
- "Det här ordet på arabiska blev fel."
- "Som företagare vet jag inte vilket dokument ni menar."

## Privacy-by-design

Fritext innebär högre integritetsrisk än strukturerade knappar eftersom användare kan skriva namn, personnummer, diagnoser, ekonomiska detaljer eller företagshemligheter.

Därför ska en fritextkanal ha:
- tydlig instruktion att inte skriva namn, personnummer, diagnosdetaljer, kontonummer, lösenord eller andra känsliga uppgifter,
- kort maxlängd,
- separat produktfeedback-syfte,
- backendvalidering och storleksgräns,
- retentionbeslut före bred pilot,
- ingen automatisk publicering till GitHub eller publika evals,
- ingen automatisk modellträning på rå fritext,
- manuell/privat triage eller säker klassificering innan en lärdom generaliseras.

## Lärpipeline

`feedback → triage → classify → verify → generalize → regression/eval/data/UX proposal → Red Team → release → measure`

Rå feedback är **inte** sanningskälla. Om någon skriver att ett stöd finns skapas en discovery-signal; stödet måste verifieras mot primärkälla innan produktdata ändras.

## Kategorier

Feedback bör när möjligt klassificeras i:
- missed_support
- irrelevant_match
- wrong_or_unclear_fact
- question_friction
- next_step_unclear
- language_or_translation
- accessibility
- application_or_document_friction
- procurement_or_business_requirement
- other_product_feedback

## Återkoppling till organisationen

Produktorganisationen ska kunna se aggregerade mönster och prioriterade lärsignaler. Kritiska eller återkommande problem ska kunna bli GitHub-issue eller privat learning proposal utan att rå användartext eller identifierande information följer med.

## Tekniskt införande

För verklig fritext i livepiloten krävs en samordnad förändring i frontend, Edge Function/API-validering, datalager/retention och intern feedbackvy/analys. Detta ska inte aktiveras halvvägs genom att bara lägga ett textfält i frontend.
