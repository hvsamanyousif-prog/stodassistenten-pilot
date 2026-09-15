# Stödassistenten – gemensamt situation/session-kontrakt v1

## Varför kontraktet finns

Stödassistenten ska vara samma produkt på webben och i framtida iPhone-/Android-klienter. En ny klient får inte skapa en egen matcher, egen sessionsmodell eller ett konkurrerande sanningslager. `config/situation_session_contract.json` definierar därför den minsta gemensamma, klientoberoende formen för situations- och sessionsstate.

Kontraktet beskriver **transport- och stategränser**, inte intelligensen. Proprietär matchning, ranking, prompts, hemligheter och känslig situationsbehandling ska fortsatt ligga bakom den privata kärnans gräns enligt `docs/API_BOUNDARY.md`.

## Samma semantik på alla ytor

Följande ytor använder samma v1-kontrakt:

- `web`
- `ios`
- `android`

Språk är presentations- och interaktionskontext, inte en alternativ matchningsmotor. `sv`, `ar` och `fa` använder samma `actor_type`, `focus` och tillåtna grova fakta. RTL eller översatt copy får alltså inte ändra vilken semantisk situation som skickas vidare.

## Sessionsprofil

En intern klientprofil kan innehålla:

- `surface` – web/ios/android,
- `language` – sv/ar/fa,
- `actorType` – grov aktörstyp,
- `focus` – vilken gemensam produktförmåga användaren befinner sig i,
- `coarseFacts` – korta strukturerade fakta som bara får transporteras om den aktuella förmågan uttryckligen tillåter nyckeln,
- `missingFacts` – vilka grova fakta som eventuellt behövs för nästa säkra beslut,
- `ephemeral.rawSituation` – rå situationsbeskrivning, endast som flyktig input.

Det sista fältet är medvetet separerat. Rå berättelse är inte ett publikt sessions-ID, inte ett URL-fält och inte feedbackdata.

## Publik handoff

Publik handoff får som top-level endast använda:

- `actor_type`
- `focus`
- `lang`

En förmåga kan dessutom uttryckligen allowlista ett litet antal grova fakta, exempelvis `support_need=personal_care`. Klienten får inte själv göra alla kända fakta transportabla. Okända eller icke-allowlistade fakta ska stoppas.

`client/situation-session-contract.js` innehåller en liten publik adapter som kan:

1. skapa en validerad sessionsprofil,
2. skapa en privacy-safe query-handoff,
3. skapa en minimerad safe session snapshot för gemensam klientsemantik.

Adaptern gör inga nätverksanrop, använder ingen browserlagring och innehåller inga endpoints, API-nycklar eller matcherregler.

## Fail-closed för känslig data

Rå situation får inte:

- läggas i URL,
- loggas från det publika kontraktet,
- persisteras som standard,
- skickas som feedback.

Publik handoff blockerar även uppenbart känsliga eller identifierande nycklar som diagnos, journal, adress, personnummer, namn, kontaktuppgifter, inkomst/lön, arbetsgivare och kontouppgifter. Grova transportvärden måste vara korta maskintokens, inte fri text.

Detta är defense-in-depth. En framtida privat backend måste fortfarande göra egen server-side validering, dataminimering, authorization och logging-policy. Klientvalidering är aldrig en säkerhetsgräns i sig.

## Följdfrågor och information gain

`missingFacts` finns för att web och mobil ska kunna representera samma princip: fråga bara efter en saknad uppgift om den kan ändra kandidat, ranking, säkerhetsgräns eller nästa handling. Fältet transporteras inte automatiskt publikt och är inte ett tillstånd att samla in känsliga detaljer.

## Feedback och lärsystem

Kontraktet behåller nuvarande säkra gräns: strukturerad feedback utan rå situation, identifierare eller fritext. Feedback är en lärsignal och aldrig en sanningskälla. En eventuell framtida förändring till fritextfeedback kräver fortsatt separat huvudmannabeslut för backend, retention och säkerhetsdesign.

## Vad v1 inte beslutar

Detta inför inte:

- en mobilapp eller ett Expo-/React Native-projekt,
- en produktions-API-endpoint,
- autentisering eller case-persistens,
- ny Supabase-tabell, schema eller Edge Function,
- lagring av känslig situation,
- en publik matcher eller rankingalgoritm,
- en ny sanningskälla eller separat roadmap.

Det gör bara kärnsemantiken portabel så att en framtida mobilklient kan spela mot samma produktmål som webben.

## Kvalitetsgrind

`client/situation-session-contract.test.cjs` och `scripts/validate_situation_session_contract.py` låser bland annat att:

- web/ios/android använder samma v1-kontrakt,
- sv/ar/fa inte ändrar `focus` eller grov faktasemantik,
- rå situation aldrig hamnar i public handoff/snapshot,
- känsliga nycklar och prose-liknande transportvärden stoppas,
- grova fakta kräver explicit capability-allowlist,
- matcher/ranking/prompts/secrets förblir privata,
- adaptern inte börjar göra nätverks- eller storagearbete.

GitHub Actions kör denna grind tillsammans med den befintliga API-boundary-validatorn.
