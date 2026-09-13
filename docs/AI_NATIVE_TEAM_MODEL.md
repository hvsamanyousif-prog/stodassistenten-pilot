# AI-native teammodell för Stödassistenten

## Grundbeslut

Stödassistenten byggs i första hand som ett founder-led, AI-native projekt.

Huvudmannen är den mänskliga produktägaren och högsta beslutsnivån. Projektets övriga roller är funktioner i samma organisation och ska inte tolkas som att verkliga anställda eller externa experter finns om de inte uttryckligen har engagerats.

Målet är att kunna gå från idé till lanserbar webb- och mobilprodukt med en mycket liten mänsklig kärna, genom AI-assisterad produktutveckling, kodning, testning, research, dokumentation, kvalitetssäkring och kontinuerlig scenario-/regressionsträning.

Princip: **liten mänsklig kärna, bred AI-kapacitet, hårda kvalitetsgrindar.**

## Kärnorganisation: 10 funktioner, ett mål

Alla funktioner arbetar mot samma produktmål och samma backlog.

1. **Huvudman / Product Owner** – vision, prioritering, slutliga beslut om kostnad, risk, känslig data, juridisk risk och irreversibla vägval.
2. **Operativ programledning / AI-orchestration** – bryter ned mål, koordinerar specialistfunktioner, driver GitHub/CI och ser till att arbetet konvergerar.
3. **Produkt & UX** – onboarding, gemensamt shell, mobilupplevelse, tillgänglighet, youth-first utan trendjakt och help-first-design.
4. **Engineering & Architecture** – frontend, backendkontrakt, API, mobilarkitektur, CI/CD, observability och release engineering.
5. **Knowledge & Verification** – primärkällor, source registry, verifieringsstatus, change detection och promotion-grindar för sanningsbärande fakta.
6. **Discovery & Coverage** – bred webbsökning, myndigheter, kommuner, regioner, stiftelser, företag, EU, upphandling och coverage matrix.
7. **Matching & AI Intelligence** – situationsförståelse, retrieval, regler, missing facts, ranking, följdfrågor, språk och nästa handling.
8. **Evaluation & Red Team** – benchmark, scenario lab, negativa tester, hallucinationsjakt, språkparitet, edge cases och regressionsskydd.
9. **Security, Privacy & Accessibility** – dataminimering, säkerhetsgränser, GDPR-design, kiosk/assisted-läge, WCAG och fail-closed-beteende.
10. **Pilot, Learning & Distribution** – riktiga testare, strukturerad feedback, generalisering till syntetiska regressioner, rekommendationsbarhet och framtida distribution/partners.

Detta är funktioner och ansvar, inte krav på tio mänskliga individer.

## Mänskliga vänner och externa personer

Vänner eller kontakter med relevant kompetens behöver inte tas in som delägare, anställda eller kärnteam bara för att de kan bidra.

De kan användas som punktinsatser i roller som:
- pilot/testare,
- domänreviewer,
- Red Team,
- intervju-/UX-observatör,
- distributionskontakt,
- introduktion till kommun, skola, företag, förening eller annan miljö.

De ska tas in när deras verklighetskunskap kan falsifiera eller förbättra produkten, inte för att skapa organisationell tyngd.

## När oberoende mänsklig kontroll ändå krävs

AI-native betyder inte att varje risk kan självgranskas bort. Inför skarp lansering eller särskilt känsliga funktioner ska oberoende specialistgranskning köpas eller engageras när det är motiverat, exempelvis:
- juridik/GDPR/DPIA,
- penetrationstest och säkerhetsgranskning,
- formell tillgänglighetsgranskning,
- domänspecifik kontroll där fel kan få betydande konsekvenser,
- myndighets-/integrationsavtal och ansvarsfördelning.

Detta är kvalitetsgrindar och punktinsatser, inte ett krav på permanent stort team.

## Beslutsregel för att ta in en människa

Ta bara in ytterligare mänsklig person i kärnorganisationen om minst ett av följande är sant:
1. en kritisk förmåga kan inte uppnås med nuvarande AI-native arbetssätt,
2. produktens kvalitet eller hastighet förbättras tydligt och varaktigt,
3. rollen kräver verklig behörighet, ansvar, relation eller fysisk närvaro som AI inte kan ersätta,
4. regulatorisk, säkerhetsmässig eller kommersiell trovärdighet kräver en namngiven ansvarig människa.

Annars förblir personen rådgivare, testare eller punktresurs.

## Gemensam leveranskedja

Alla tio funktioner mäts mot samma kedja:

**förstå situation → upptäck verkliga kandidater → verifiera → matcha → ställ rätt följdfrågor → förklara → nästa handling → lär → regression → ny release**

Ingen funktion får skapa separat produkt, sanningslager, matcher eller roadmap.

## Mobilmål

Slutmålet är en lanserbar Stödassistenten för webb, iOS och Android ovanpå samma privata kärna och samma verifierade data. Mobilen är en ny yta, inte en ny produkt.
