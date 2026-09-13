# Stödassistenten – arbetssystem

GitHub är projektets source of truth. Den publika piloten ska vara enkel att testa och får inte innehålla hemligheter, API-nycklar, personuppgifter eller framtida kärnlogik som bör ligga privat.

## Ett lag, ett mål

Stödassistenten ska drivas som ett lag på samma fotbollsplan. Olika funktioner får ha olika roller, metoder och specialistansvar — motsvarande målvakt, backlinje, mittfält och anfall — men de arbetar aldrig mot egna produktmål.

Gemensamt mål:

**Gör Stödassistenten till den mest hjälpsamma, tillförlitliga och handlingsinriktade vägen mellan en verklig situation och relevanta verifierade stöd, rättigheter, tjänster och möjligheter — i en och samma plattform.**

Organisationsregler:
- en produkt, inte parallella appar,
- en gemensam intelligensarkitektur,
- ett gemensamt sanningslager,
- ett gemensamt lärsystem,
- flera aktörstyper och domäner som moduler i samma plattform,
- specialister får välja olika vägar framåt, men arbetet ska konvergera mot samma användarnytta,
- lokala optimeringar får inte skapa duplicerad logik, konkurrerande produktvisioner eller egna sanningslager,
- varje team ska kunna förklara hur dess arbete förbättrar samma kedja: förstå situation → hitta och verifiera → matcha → förklara → nästa handling → lärande,
- när två initiativ konkurrerar ska det som mest stärker den gemensamma produkten, sanningen och användarens nästa steg prioriteras.

Fotbollsprincipen: **man får dribbla, passa, glidtackla eller skjuta — men alla spelar mot samma mål.**

## Arbetscykel

1. Formulera hypotes.
2. Bygg minsta testbara version.
3. Publicera på samma pilotlänk eller som tydlig modul/djuplänk i samma plattform.
4. Testa med riktiga användare utan lång instruktion och med syntetiska scenarier/regressioner.
5. Samla strukturerad feedback och verifierbara produktmissar.
6. Analysera relevans, nytta, begriplighet, säkerhet och missade behov.
7. Förbättra regler, frågor, språk, källor, matchning och UX.
8. Gör lärdomen permanent i GitHub genom data, test, regression, dokumenterat beslut eller kod.
9. Kör CI och kontrollera att förbättringen inte försämrar andra aktörstyper.
10. Börja om: bygg → verifiera → försök hitta felet → lär → bygg igen.

## Nuvarande mål: Pilotfas

Målet är att bevisa att en person eller organisation kan beskriva sin situation och få nya, relevanta och begripliga vägar till stöd, rättigheter, tjänster eller möjligheter samt förstå nästa handling.

Domäner inom samma plattform:
- privatperson / generell situation
- pensionär / pressad ekonomi
- familj / NPF / funktionsnedsättning
- arbetslöshet / a-kassa
- deltid + sjukskrivning
- allvarlig sjukdom/cancer och anhörigspår
- student / nyexaminerad / ung vuxen
- anställd / arbetsrelaterade rättigheter och förmåner
- förening
- företag / finansiering / offentlig upphandling
- BRF / fastighetsaktör
- offentlig/assisterad användning där det är relevant

Dessa är **inte parallella produkter**. De är olika ingångar och specialistmoduler ovanpå samma produkt-, källa-, matchnings-, säkerhets- och lärarkitektur.

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
- skulle personen rekommendera tjänsten därför att den faktiskt hjälpte?

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
- syntetiska testfall och regressioner

Inte tillåtet i publikt repo eller klientkod:
- API-nycklar
- databaslösenord
- personnummer
- journaler eller medicinska dokument
- detaljerad privatekonomi
- autentiseringshemligheter
- framtida proprietär regelmotor som bör ligga privat
- identifierande detaljer från riktiga användare eller community-signaler i publika evaldata

## Nuvarande feedbackarkitektur

V0.5 använder automatisk anonym pilotfeedback via serverfunktion och EU-baserad Supabase-databas i Stockholm-regionen.

Frontend skickar endast produktfeedback: version, språk, flöde, om något nytt lärdes, användbarhet, tydlighet och numeriska resultatomdömen. Situationssvar om arbete, sjukdom, ekonomi, barn och boende skickas inte till feedbackdatabasen.

Riktig feedback får förbättra produkten genom generaliserade, syntetiska regressioner och verifierade produktförändringar. Rå användardata får inte automatiskt bli modellträning eller sanningskälla.

## Kommande arkitektur

Publik frontend → eget API-lager → utbytbara tjänster/databaser.

Det gör att Supabase kan användas i pilot och senare bytas mot annan EU/svensk drift utan att frontend byggs om.

AI ska ligga bakom servern och användas för språk, intervju, struktur, discovery, dokumentförklaring, rankingstöd och utkast. Verifierade regler, primärkällor och review-status ska avgöra sanningsbärande stödmatchning.

Alla aktörstyper ska använda samma kärnkontrakt och samma privata kärna. Domänspecifika adapters och frågor får finnas, men duplicerade matchningsmotorer eller separata sanningslager får inte växa fram.

## Expert review

Större versioner ska granskas enligt `docs/EXPERT_REVIEW_COUNCIL.md`, med relevanta perspektiv från socialförsäkring/offentlig sektor, GDPR, säkerhet, AI, tillgänglighet, UX, analytics och kommersiell strategi.

Specialistgranskning är en position i laget, inte en egen produktvision. Granskningens uppgift är att hjälpa samma produkt att nå det gemensamma målet säkrare och bättre.

## Resurspolicy – Astra som delad spetsresurs

Huvudmannabeslut: Astra är en delad spetsresurs mellan flera projekt och får inte bli en exklusiv eller nödvändig beroendepunkt för Stödassistenten.

Astra ska prioriteras när högre kapacitet förväntas ge tydlig mätbar hävstång, särskilt för:
- större sammanhängande BUILD-pass
- komplex arkitektur
- avancerad felsökning
- repository-wide analys
- säkerhetskritisk granskning
- Red Team
- teststrategi och svåra edge cases
- längre Work/Codex-uppdrag där högre kapacitet kan påverka kvalitet, risk eller leveranstid tydligt

Astra ska inte användas för lågkomplexa rutinuppgifter, enkel textproduktion, små kodändringar, standardgranskningar eller arbete som kan göras lika bra med Sol, vanlig Chat, automationer eller andra snabbare/billigare resurser.

Projektet får inte bli beroende av Astra-tillgänglighet eller Astra-kvot. Om Astra inte är tillgänglig ska arbetet fortsätta via ordinarie Chat/Work/Codex/automation/GitHub-kedja utan avbrott.

Stående princip: **maximal effekt per Astra-körning, inte maximal Astra-användning.**

Om flera möjliga Astra-uppgifter konkurrerar om kapaciteten ska den användas där den förväntade effekten på kvalitet, riskreduktion, teknisk svårighetsgrad eller leveranstid är störst.

Alla Astra-resultat är preliminära tills de verifierats genom projektets ordinarie sanningskedja: GitHub, tester, CI och aktuell pilot/publiceringsmiljö där relevant.

Denna policy ändrar inte projektets organisation, säkerhetsgränser eller huvudmannens tidigare beslut. Det är en resursprioritering, inte en omstart.

## Definition of done för varje pilotversion

En version är klar när:
- mobilflödet fungerar
- svenska, arabiska och persiska inte bryts där de stöds
- resultat uttrycks som möjliga/relevanta att kontrollera, inte garanterad rätt
- officiella källor finns där vi visar konkreta stöd
- ingen känslig data läcker till GitHub eller feedback
- användaren kan lämna feedback där kanalen är aktiverad
- relevanta syntetiska scenarier och regressioner är gröna
- nya moduler försämrar inte andra målgrupper
- versionen är publicerad och testbar i samma Stödassistenten-plattform

## Versionsplan

V0.4: generell situation + rikare pilotfeedback — klar.
V0.5: automatisk anonym feedback-backend + förbättrad generell pilot — live.
V0.6: verifierade stödspår för a-kassa, sjukskrivning och allvarlig sjukdom + första analysdashboard.
V0.7: separerad stöddata/regler/UI för enklare underhåll.
V0.8+: gemensam privat backend, verifierad stöddatabas, bred discovery och AI-intervju för flera aktörstyper i samma plattform.

Versionsordningen kan ändras efter verkliga pilotresultat. Verklig användarnytta och det gemensamma produktmålet styr prioriteringen.