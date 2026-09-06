# Stödassistenten – capability-arkitektur v0.1

## Syfte

Stödassistenten ska kunna lanseras smalt och samtidigt utvecklas mot Bas, Pro/Advanced och professionella erbjudanden utan att skapa separata appar eller duplicera kärnlogik. Den publika kodbasen får beskriva stabila capability-ID:n och säkra gränser, men ska inte innehålla prislogik, privata entitlements, hemligheter eller proprietär matchningslogik.

`config/capabilities.json` är ett publikt, prisneutralt kontrakt. Det beskriver **vad en capability är**, vilken modul den hör till och var den måste verkställas. Det beskriver inte vem som har köpt eller får använda den.

## Grundregler

1. **Capability är inte prisplan.** `match_extended` eller `documents` får återanvändas i flera framtida produkter. Kärnlogiken ska aldrig fråga om någon är “Pro” eller “Advanced”.
2. **Frontend-flaggor är inte behörighet.** En avstängd knapp kan förbättra UX men får aldrig skydda privat data eller privata åtgärder.
3. **Privat data kräver serverauktoritet.** Capabilities som använder case-data, dokument, samverkan eller aggregerad organisationsdata är `server_authoritative`.
4. **Publikt kontrakt innehåller inga endpoints eller hemligheter.** Privat resolver/API väljs senare och får bytas utan att capability-ID:n ändras.
5. **Deny by default i privat kärna.** En framtida privat resolver ska endast ge en capability när både entitlement, feature state, kontext och authorization tillåter den.
6. **Samma UI, olika capability-set.** Produktpaketering ska bestå av resolved capabilities, inte forks av appen.

## Capability resolution

Den framtida privata kärnan ska ta ansvar för att lösa vilka capabilities som är tillåtna. Den publika klienten ska endast få ett minimalt resultat, konceptuellt:

```json
{
  "schema_version": "0.1.0",
  "capabilities": [
    {"capability_id": "match_basic", "enabled": true},
    {"capability_id": "documents", "enabled": false}
  ]
}
```

En sådan payload får inte innehålla pris, abonnemangsnamn, interna regler, backend-URL:er, databasidentifierare, tokens eller orsaker som avslöjar privat implementation. När privat backend byggs ska kontraktet få ett separat strikt schema och server-side authorization-test.

## Modulgränser

### UI

Ansvarar för presentation, språk, tillgänglighet och att dölja/visa funktioner utifrån resolved capabilities. UI får aldrig själv bevilja en server-auktoritativ capability.

### Interview

Samlar minsta nödvändiga situationssignaler och ställer följdfrågor. Interview får använda publika capability-ID:n för att välja ett flöde, men får inte känna till prisplaner eller privata entitlementregler.

### Matching

`match_basic` kan fortsatt fungera mot begränsad publik pilotlogik. `match_extended` ska senare anropa privat matchningskärna med verifierade stödposter, regler och ranking. Publik kod ska inte innehålla den privata regelgrafen.

### Sources

Visar säkra primärkällor och verifieringsmetadata. Källvisning får aldrig likställas med att användaren har rätt till ett stöd.

### Watchlists

Persistens och bevakning kräver privat tjänst. Klienten ska inte kunna läsa andra användares bevakningar eller härleda interna bevakningsregler.

### Documents

Dokument, dokumentanalys och utkast är privata funktioner. Uppladdat innehåll, analyser och dokumentmetadata får inte exponeras genom en publik feature-konfiguration.

### Cases

Case state och historik kräver autentisering, authorization och case-isolering. `cases` och `case_history` är därför alltid server-auktoritativa.

### Collaboration

Professionell samverkan kräver explicit relation, roll och authorization per case. Capability-flaggor ersätter inte RBAC/ABAC eller framtida audit trail.

### Analytics

Individdata får inte läcka till aggregat. `analytics` är server-auktoritativ och ska senare ha separat minimiaggregat-/privacy-design.

### API

`api_access` är endast ett capability-ID. Autentisering, scopes, rate limits, kundisolering och endpoints hör hemma i privat kärna.

## Migrationsplan från dagens pilot

### Fas 0 – nuvarande publik pilot

- statisk/mobil webb
- `match_basic` och säkra källdetaljer i publik yta
- anonym produktfeedback enligt befintliga guardrails
- ingen central lagring av känslig situation i detta repo

### Fas 1 – capability adapter i klienten

- UI slutar hårdkoda framtida produktpaket
- en liten lokal resolver kan tillfälligt returnera endast publika pilot-capabilities
- samma komponenter kan senare konsumera ett privat resolved-capability-svar
- ingen privat data introduceras

### Fas 2 – privat matchnings-API

- `match_extended` flyttas bakom privat tjänst
- privat tjänst verifierar capability + authorization före körning
- publik klient får resultat och källspårning, inte intern regel-/rankinglogik
- eval-benchmark används som regressionsgrind

### Fas 3 – dokument och cases

- `documents`, `document_analysis`, `cases`, `case_history` aktiveras först när dataskydd, authorization, audit och lagring är designade
- capability resolution och authorization testas separat; UI-flaggor är endast presentation

### Fas 4 – professionell/B2B/B2G

- organisationsroller, samverkan, analytics och API aktiveras ovanpå samma kärna
- paketering och kommersiella entitlements konfigureras utanför capability-katalogen
- ingen separat produktfork krävs

## Testkrav

`python scripts/validate_capabilities.py --self-test` ska minst kontrollera:

- unika capability-ID:n
- att alla dependencies finns
- att dependency-grafen är acyklisk
- att privat service aldrig skyddas med enbart client visibility
- att privat/aggregate data alltid kräver server-auktoritet
- att förbjudna pris-/secret-/endpointfält inte smyger in i publikt kontrakt
- att säkerhetsinvarianterna inte kan stängas av

Nästa steg efter v0.1 är ett strikt schema för resolved-capability-payloaden och ett klientadapter-test som bevisar att en disabled capability varken renderar privat UI-data eller triggar privata anrop. Den testen ska byggas när klienten faktiskt har separerats från dagens statiska pilotlogik; innan dess skulle den ge falsk trygghet.

## Säkerhetsgräns

Detta dokument och capability-katalogen är avsiktligt publika arkitekturkontrakt. De ska inte innehålla:

- verkliga användar- eller case-data
- API-nycklar, tokens eller secrets
- privata endpoints eller tjänstekonfiguration
- pris- och entitlementlogik
- hela stöddatabasen
- privat regelmotor, ranking eller AI-orkestrering
- privata evalfall eller partnerintegrationer
