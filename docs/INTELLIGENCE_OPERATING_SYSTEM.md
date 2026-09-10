# Stödassistenten – Intelligence Operating System

## Syfte

Stödassistenten ska inte bara utvecklas snabbt. Organisationen ska lära snabbare än konkurrenter och göra varje ny källa, pilotobservation, felträff och regeländring till bestående produktintelligens.

Kärnprincip: **bygga, verifiera, lära och ifrågasätta ska vara separata men sammankopplade funktioner.**

## Organisationsmodell

### Huvudman / Product Owner
Ansvarar för irreversibla beslut, affärsriktning, riskacceptans, större kostnader och externa åtaganden.

### VD / Programledning
Prioriterar backlog, samordnar spår, löser målkonflikter, stoppar lokala optimeringar och ser till att alla leveranser konvergerar till samma produkt.

### BUILD-cell
Produkt, engineering, data och AI-arkitektur. Bygger användarflöden, contracts, evaluatorer, adapters och säkra produktfunktioner.

### Knowledge & Verification-cell
Ansvarar för källregister, primärkällor, normalisering, versionshistorik, stödposter, ändringsdetektion och verifieringsstatus. AI får hjälpa till att klassificera och sammanfatta men får inte själv höja en sakuppgift till VERIFIED.

### Evaluation & Red Team-cell
Arbetar oberoende från den som bygger. Försöker hitta missade stöd, falska positiva träffar, felaktiga claims, språkdrift, edge cases, populationsgap, osäkra nästa steg och säkerhetsproblem. Allvarliga fel ska när möjligt kodifieras som regressionstest.

### Pilot & Learning-cell
Samlar endast minimerad och lämplig feedback. Fokuserar på om användaren förstod, hittade något relevant, visste nästa steg och vilka träffar som var relevanta/irrelevanta/redan kända. Känsliga situationssvar ska inte samlas in bara för att förbättra modellen.

### Specialistresurser
Astra, Work/Codex och andra högkapacitetsresurser används när komplexitet, riskreduktion eller leveranstid motiverar det. Projektet får aldrig bli beroende av en enskild resurs.

## Intelligence flywheel

1. **SIGNAL** – ny källa, regeländring, användarproblem eller missad möjlighet upptäcks.
2. **VERIFY** – ansvarig primärkälla och relevanta regler kontrolleras.
3. **NORMALIZE** – kunskapen omvandlas till strukturerad stöd-/regeldata.
4. **MATCH** – motorn använder den strukturerade kunskapen för kandidater och följdfrågor.
5. **EVALUATE** – syntetiska benchmarkfall och Red Team testar resultatet.
6. **PILOT** – verkliga användare ger minimerade relevans- och begriplighetssignaler.
7. **LEARN** – missar omvandlas till regeländring, bättre fråga, datakorrigering eller nytt benchmarkfall.
8. **LOCK IN LEARNING** – lärdomen sparas i GitHub/data/test så samma fel inte behöver upptäckas på nytt.

## Hur vi blir smartare

### 1. Egen kunskap före egen modell
Konkurrensfördelen ska inte bygga på att träna en generell språkmodell från grunden. Den ska byggas i vårt verifierade svenska stödlager, regelmodell, följdfrågor, evals, förändringshistorik och kvalitetsdata.

### 2. Information gain i intervjun
Motorn ska prioritera nästa fråga efter vilken uppgift som mest kan ändra matchningsresultatet. Färre men bättre frågor är ett kvalitetsmål.

### 3. Hård skillnad mellan hard rules och fuzzy evidence
Ålder, geografi, inkomstgränser, tidsfrister och andra verifierbara villkor ska behandlas deterministiskt där reglerna tillåter. Semantisk AI/RAG används för otydliga beskrivningar, fritext och discovery – inte som ersättning för verifierade hårda villkor.

### 4. Population-first evals
Totalpoäng får inte dölja svaga segment. Kvalitet ska mätas separat över relevanta populationer, roller, språk, digital vana och tillgänglighetsbehov.

### 5. Multilingual parity
Samma underliggande situation ska ge samma kandidatlogik oavsett samtalsspråk. Språkdrift ska testas för betydelse, negation, belopp, datum, undantag och nästa steg.

### 6. Shadow comparison
När flera matchningsstrategier finns ska de kunna köras offline på samma benchmark och jämföras innan en ny strategi påverkar användare.

### 7. Change intelligence
Ändrade källor och regler ska flaggas. Högpåverkande ändringar får inte automatiskt bli produktionssanning utan verifiering.

### 8. Failure memory
Varje allvarlig miss blir en permanent del av systemets minne i form av test, regel, datakorrigering eller dokumenterat beslut.

## Gemensam scorecard

Organisationen ska optimera minst följande förmågor:

- verified-support coverage
- support-area recall
- false-positive rate
- unsafe/unverified claim rate
- source grounding
- question efficiency
- next-step clarity
- language parity
- segment parity
- change-detection latency
- pilot usefulness

Ingen enskild siffra räcker för att kalla systemet smart.

## Arbetsdisciplin

- En gemensam backlog och GitHub som sanningskälla.
- Substantiella ändringar via branch/PR när lämpligt.
- BUILD och Red Team ska inte betraktas som samma roll.
- Ingen expertroll får skapa en egen produktvision vid sidan av huvudvisionen.
- Framsteg mäts i verifierbar produktförmåga, inte aktivitet eller antal dokument.
- Stora nya tekniska eller juridiska risker eskaleras; övrigt arbete fortsätter.

## Nordstjärna

**Stödassistenten ska lära snabbare än andra aktörer om sambandet mellan en verklig situation, Sveriges verifierade stödlandskap och den bästa nästa handlingen – utan att tumma på sanningen, integriteten eller tillgängligheten.**
