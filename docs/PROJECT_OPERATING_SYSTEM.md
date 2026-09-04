# Stödassistenten – arbetssystem

GitHub är projektets source of truth. Den publika piloten ska vara enkel att testa och får inte innehålla hemligheter, API-nycklar, personuppgifter eller framtida kärnlogik som bör ligga privat.

## Arbetscykel

1. Formulera hypotes.
2. Bygg minsta testbara version.
3. Publicera på samma pilotlänk.
4. Testa med riktiga användare utan lång instruktion.
5. Samla strukturerad feedback.
6. Analysera relevans, nytta, begriplighet och missade behov.
7. Förbättra regler, frågor, språk och UX.
8. Dokumentera beslut och nästa hypotes i GitHub.

## Nuvarande mål: Pilotfas

Målet är att bevisa att en person kan beskriva sin situation och få nya, relevanta och begripliga vägar till stöd.

Primära pilotspår:
- pensionär / pressad ekonomi
- familj / NPF / funktionsnedsättning
- arbetslöshet / a-kassa
- deltid + sjukskrivning
- generell situation
- allvarlig sjukdom/cancer och anhörigspår

Parallella senare spår:
- föreningar
- småföretag / offentlig upphandling
- professionella
- kommuner

## Pilotmått

Vi mäter inte bara om användaren tycker om appen.

Per test:
- kunde personen börja utan hjälp?
- förstod personen vad Stödassistenten gör?
- hittade personen minst en relevant väg?
- fick personen reda på något nytt?
- var något tydligt irrelevant?
- förstod personen nästa steg?
- skulle personen använda tjänsten igen?

Per resultat:
- Relevant
- Kände redan till
- Inte relevant

## Säkerhetsgräns i publik pilot

Tillåtet:
- statisk frontend
- offentliga källor
- generella frågor
- anonym produktfeedback

Inte tillåtet i publikt repo eller klientkod:
- API-nycklar
- databaslösenord
- personnummer
- journaler eller medicinska dokument
- detaljerad privatekonomi
- autentiseringshemligheter
- framtida proprietär regelmotor som bör ligga privat

## Nuvarande feedbackarkitektur

V0.5 använder automatisk anonym pilotfeedback via serverfunktion och EU-baserad Supabase-databas i Stockholm-regionen.

Frontend skickar endast produktfeedback: version, språk, flöde, om något nytt lärdes, användbarhet, tydlighet och numeriska resultatomdömen. Situationssvar om arbete, sjukdom, ekonomi, barn och boende skickas inte till feedbackdatabasen.

## Kommande arkitektur

Publik frontend → eget API-lager → utbytbara tjänster/databaser.

Det gör att Supabase kan användas i pilot och senare bytas mot annan EU/svensk drift utan att frontend byggs om.

AI ska senare ligga bakom servern och användas för språk, intervju, struktur, dokumentförklaring och utkast. Verifierade regler och källor ska avgöra stödmatchning.

## Expert review

Större versioner ska granskas enligt `docs/EXPERT_REVIEW_COUNCIL.md`, med relevanta perspektiv från socialförsäkring/offentlig sektor, GDPR, säkerhet, AI, tillgänglighet, UX, analytics och kommersiell strategi.

## Definition of done för varje pilotversion

En version är klar när:
- mobilflödet fungerar
- svenska, arabiska och persiska inte bryts
- resultat uttrycks som möjliga/relevanta att kontrollera, inte garanterad rätt
- officiella källor finns där vi visar konkreta stöd
- ingen känslig data läcker till GitHub eller feedback
- användaren kan lämna feedback
- versionen är publicerad och testbar på samma URL

## Versionsplan

V0.4: generell situation + rikare pilotfeedback — klar.
V0.5: automatisk anonym feedback-backend + förbättrad generell pilot — live.
V0.6: verifierade stödspår för a-kassa, sjukskrivning och allvarlig sjukdom + första analysdashboard.
V0.7: separerad stöddata/regler/UI för enklare underhåll.
V0.8+: privat backend, verifierad stöddatabas och senare AI-intervju.

Versionsordningen kan ändras efter verkliga pilotresultat. Verklig användarnytta styr prioriteringen.