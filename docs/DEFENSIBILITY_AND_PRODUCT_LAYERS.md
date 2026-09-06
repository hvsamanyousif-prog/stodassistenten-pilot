# Stödassistenten – produktlager och försvarsstrategi

## Grundidé

Stödassistenten ska inte skyddas genom hemlighetsmakeri kring själva idén. En konkurrent kan alltid kopiera en startsida, ett formulär eller en AI-chat. Försprånget ska istället byggas som ett system av tillgångar som blir svårare att återskapa ju längre vi arbetar.

Målet är att någon ska kunna kopiera ytan snabbt men ändå ligga långt efter på datakvalitet, verifiering, användarlärande, regelmodell, arbetsflöden, integrationer och distribution.

## Produktlager – samma motor, olika versioner

Vi ska undvika separata appar med duplicerad logik. En gemensam kärna ska driva flera produktlager via feature flags och behörigheter.

### Bas / gratis
- situationsbaserad intervju
- begränsad men verifierad supportmatchning
- officiella källor
- tydligt nästa steg
- svenska + prioriterade språk
- enkel anonym feedback

### Plus / Pro
- bredare matchning över fler stödtyper
- fler följdfrågor
- sparade stödlistor och bevakning
- dokumentchecklistor
- utkast till ansökningar och brev
- bättre förklaring av beslut
- påminnelser och Stödkalender

### Pro 2 / Advanced
- multi-case och avancerade arbetsflöden
- dokumentanalys
- ärendehistorik
- professionell samverkan
- export/paket för handläggning
- avancerade bevakningar och förändringsnotiser
- prioriterad support och högre användningsgränser

### Professionell / B2B / B2G
- multi-user
- organisationsroller och RBAC
- audit trail
- API
- dashboard och aggregerad statistik
- integrationslager
- upphandlings-/förenings-/företagsspår
- kommunal digital första linje där juridiken tillåter

Produktlager ska kunna ändras utan att kärnarkitekturen skrivs om.

## Försvarbarheten – det som ska bli svårt att kopiera

### 1. Verifierad svensk stöddatabas
Inte bara länkar. Varje stöd ska ha normaliserade villkor, målgrupp, geografi, ansökningsväg, dokumentkrav, källor, verifieringsdatum och versionshistorik.

### 2. Source ingestion + change detection
Ett källregister, importadaptrar, ändringsdetektion och granskningskö. Konkurrenter måste annars manuellt hålla tusentals stöd uppdaterade.

### 3. Regelgraf
Hårda kriterier, mjuka relevanssignaler, saknade uppgifter och förklaringar ska modelleras separat från AI-text. Regeln ska vara källspårbar och testbar.

### 4. Livshändelseintervjuer
Egen kunskap om vilka frågor som faktiskt ger rätt signal för pension, arbetslöshet, sjukskrivning, cancer, barn/NPF, boende, energi, föreningar, företag osv.

### 5. Egen kvalitetsdata
Feedback som visar vilka träffar som var relevanta, kända, irrelevanta, vad användare inte förstod och vilka frågor som saknades. Detta förbättrar produkten utan att lagra onödig känslig data.

### 6. Eval- och testsvit
Varje ny regel, källa och AI-funktion ska testas mot realistiska syntetiska fall. Försprånget ligger i att veta exakt när systemet börjar ge sämre svar.

### 7. Dokument- och ärendeflöde
Från situation till matchning till dokument till utkast till inskickningsklar checklista till beslut och nästa steg. Detta är betydligt svårare att kopiera än en sökruta.

### 8. Språk + tillgänglighet
Svenska regler och formell svenska i backend, men samtal på flera språk, RTL, uppläsning, förenklat språk och dokumentförklaring.

### 9. Integrations- och distributionslager
Partnerskap med kommuner, föreningar, patientorganisationer, bibliotek, SFI, professionella, försäkringsaktörer m.fl. Distribution skapar data och förtroende som inte går att klona från kod.

### 10. Förtroende
Källspårbarhet, tydliga osäkerheter, korrekt språk och dokumenterad verifiering. Förtroende byggs över tid och är svårt att köpa snabbt.

## Vad som ska vara publikt respektive privat

Publikt kan vara:
- UI
- språkfiler
- ofarlig pilotlogik
- generella datakontrakt
- exempeldata
- dokumentation som inte avslöjar proprietär metod

Privat kärna ska innehålla:
- hela stöddatabasen
- råa ingest-adaptrar
- change detection-logik
- regelmotor
- scoring/ranking-logik för relevans
- prompts och AI-orkestrering
- eval-fall
- användnings-/kvalitetsdata
- partnerintegrationer
- API-hemligheter och tjänstekonfiguration

## IP och juridiskt skydd

Tekniskt och kommersiellt skydd ska kombineras med:
- varumärkesskydd när namn är bestämt
- upphovsrätt i kod, texter, datamodeller och dokumentation där tillämpligt
- databasskydd när kriterierna är uppfyllda
- sekretess och IP-klausuler i avtal med utvecklare, partners och konsulter
- tydliga licenser för publik kod
- trade secret-hantering av privat regel-, ingest- och eval-logik

Patent ska endast övervägas om vi faktiskt utvecklar en ny, tekniskt patenterbar metod och nyttan motiverar kostnaden.

## Försprångsloop

Källa → verifiering → stödpost → regel → verkligt test → feedback → förbättrad intervju → bättre matchning → fler användare/partners → mer kvalitetsdata → snabbare verifiering.

Varje varv ska göra nästa varv bättre och billigare. Det är den huvudsakliga moat:en.

## Operativ princip

Vi ska kunna lansera smala versioner snabbt och kontinuerligt slå på nya områden. Målet är inte att ha allt från dag ett. Målet är att samma motor ska kunna växa utan att varje ny kategori kräver en ny app.

Om en konkurrent kopierar en synlig funktion ska vi inte reagera genom att bygga samma yta snabbare. Vi ska förstärka datan, verifieringen, arbetsflödet, distributionen och användarlärandet där de har svårare att följa efter.
