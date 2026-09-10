# Stödassistenten – no-weak-link komponentstandard

## Syfte

Stödassistenten ska inte vara "bra totalt" med svaga kritiska delar. Varje komponent som påverkar användarens förståelse, matchning, säkerhet, ansökningsförmåga eller förtroende ska själv hålla hög nivå.

**Grundprincip:** den svagaste kritiska komponenten sätter i praktiken kvaliteten på hela produkten.

## Komponenter som ska vara sylvassa

1. **Situationsförståelse** – förstå vad användaren menar, även när informationen är ofullständig, vardaglig, emotionell eller osorterad.
2. **Matchning** – hitta relevanta stöd/rättigheter/tjänster utan att överdriva eller missa uppenbara kandidater.
3. **Verifierad kunskap** – primärkällor, versionsstyrning, ändringsdetektion och tydlig skillnad mellan verifierat, sannolikt och okänt.
4. **Följdfrågor** – fråga så lite som möjligt men så mycket som behövs; prioritera frågor med hög information gain.
5. **Nästa steg** – varje resultat ska mynna ut i konkret handling: kontrollera, samla dokument, fyll i, kontakta, boka, lämna in eller följ upp.
6. **Ansökningsstöd** – hjälpa användaren skapa komplett och begripligt underlag utan att hitta på fakta eller ersätta användarens godkännande.
7. **Språk** – betydelsebevarande över språk, korrekt LTR/RTL, begripligt vardagsspråk och formell svensk sluttext när det behövs.
8. **Tillgänglighet** – användbar för personer med låg digital vana, läs-/skrivsvårigheter, funktionsnedsättning och behov av röst/uppläsning.
9. **Kiosk / assisted mode** – säker session, automatisk rensning, minimal exponering och tydlig skillnad mellan självservice och personalstöd.
10. **Säkerhet och integritet** – dataminimering, fail-closed, inga hemligheter i klienten, inga känsliga data utan rätt arkitektur och ansvar.
11. **Förklarbarhet** – användare och professionell personal ska kunna förstå varför ett resultat visas och vilka källor/osäkerheter som ligger bakom.
12. **Feedback och lärloop** – verkliga missar, friktion och fel ska så långt möjligt bli permanenta regressionstest, datakorrigeringar eller produktregler.
13. **Offentlig införbarhet** – arkitekturen ska tåla seriös granskning från kommun/stat utan att påstå att någon myndighet har godkänt produkten.

## Releasegrind per kritisk komponent

En komponent får inte betraktas som mogen enbart för att den fungerar i normalfallet. Den ska när relevant ha:

- funktionstest,
- edge-case-test,
- negativa/fail-closed test,
- källverifiering,
- säkerhetskontroll,
- språk-/RTL-kontroll,
- tillgänglighetskontroll,
- syntetisk benchmark eller regressionstest,
- tydlig rollback/reversibilitet för större ändringar.

## Två nivåer av kvalitet

### 1. Teknisk kvalitet

Komponenten är korrekt implementerad, testad, säker och stabil.

### 2. Mänsklig kvalitet

Komponenten hjälper en verklig person att förstå sin situation och ta nästa steg utan onödig friktion eller falsk trygghet.

Båda krävs. Teknisk perfektion utan användarnytta är inte tillräckligt. Bra UX utan verifierad saklighet är inte acceptabelt.

## No-weak-link-regel

Om en kritisk komponent faller under definierad kvalitetsnivå ska den behandlas som ett produktfel även om totalupplevelsen ser bra ut.

Exempel:

- hög matchningsprecision men dålig språkparitet = inte godkänt,
- bra svar men otydliga källor = inte godkänt,
- korrekt stöd men oklart nästa steg = inte godkänt,
- stark citizen mode men osäker kiosk-session = inte godkänt,
- bra svensk upplevelse men klart sämre resultat för en annan befolkningsgrupp = inte godkänt.

## Stående prioriteringsregel

När projektet måste välja mellan fler funktioner och att höja en svag kritisk komponent ska den svaga kritiska komponenten normalt prioriteras först.

**Målet är inte flest funktioner. Målet är att varje viktig del känns genomtänkt, korrekt, trygg och effektiv.**
