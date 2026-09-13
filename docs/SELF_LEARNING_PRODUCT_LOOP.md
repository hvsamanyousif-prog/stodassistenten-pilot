# Self-learning product loop

Stödassistenten ska själv hitta produktluckor utan att själv uppfinna sanning.

## Permanent loop

SELF-AUDIT → FEEDBACK SIGNAL → SYNTHETIC SCENARIO → RUN → RED TEAM → FIX → REGRESSION → CI → LEARN.

### Vad systemet får lära snabbt
- onödiga steg och frågaordning
- språk, begriplighet och RTL
- tillgänglighetsfriktion
- ranking/routing och nästa-handling-UX
- saknad feedbackyta
- döda länkar, dubblerad text och tunn produktinformation
- återkommande användarmissar som kan generaliseras till syntetiska testfall

### Vad systemet inte får självpromovera till sanning
- eligibility
- belopp
- deadlines
- lagregler
- myndighetsansvar
- ansökningskanaler

Dessa kräver verifierade primärkällor och ordinarie sanningskedja.

## Feedback coverage gate

Varje publik huvudyta måste ha en strukturerad, anonym feedbackväg eller leda direkt till en yta som har det. Feedback är en lärsignal, inte en faktakälla. Rå situationsbeskrivning ska inte skickas i feedbackpayloaden.

## Scenario factory

Nya scenarier ska komma från tre håll: produkt-självrevision, generaliserad verklig feedback och web discovery. Varje faktisk miss som är säker att publicera ska göras permanent som syntetiskt regressionstest innan den betraktas som löst.
