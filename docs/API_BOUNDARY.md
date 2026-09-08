# Stödassistenten – publik/privat API-gräns v0.1

## Syfte

Detta dokument definierar den säkra gränsen mellan den publika piloten och framtida privata tjänster. Målet är att kunna bygga privat matchning, intervju och case-funktioner utan att den publika klienten behöver känna till intern regelmotor, ranking, prompts, endpoints, tokens eller databasstruktur.

`config/api_boundary.json` är ett **implementationsneutralt säkerhetskontrakt**. Det är inte en OpenAPI-specifikation och anger inga riktiga nätverksadresser. Det ger därför ingen tillåtelse att börja lagra känsliga uppgifter eller migrera pilotdata.

## Grundprinciper

1. **Deny by default.** Privat funktion finns inte bara för att UI visar en knapp eller en capability är enabled.
2. **Klientflaggor är aldrig authorization.** Varje privat resursoperation måste auktoriseras på servern.
3. **Känslig situationsinput är ephemeral by default.** Matchning och intervju får i v0.1 beskrivas som privata operationer, men rå input ska inte sparas eller loggas som standard.
4. **Case-data kräver autentisering, resursauktorisering och isolering.** Persistens får endast ske i framtida privat lagring med separat dataskyddsdesign.
5. **Publika svar minimeras.** Publika ytor får endast returnera säker källmetadata eller ett anonymt kvitto.
6. **Feedback är produktmätning, inte situationsinsamling.** Ingen fritext, inga situationssvar och inga direkta identifierare i det publika feedbackkontraktet.
7. **Privata implementationer ska kunna bytas.** Publika kontrakt ska inte låsa projektet till leverantör, endpoint, databas eller prismodell.

## Operationer

### `match`

Framtida privat matchning bakom `match_extended`.

- kan ta emot känsliga situationssignaler endast som ephemeral input,
- ska använda verifierade källor och fail-closed-beteende vid overifierade regler,
- får inte garantera rätt till stöd,
- returnerar härledda stödkandidater och förklaringar, inte privat regel-/rankinglogik,
- ska kunna exportera syntetiska prediktioner till det befintliga benchmarkharneset.

### `sources`

Säker publik källvisning bakom `source_details`.

- endast minimerad publik käll- och verifieringsmetadata,
- inga interna granskningsanteckningar, crawlerdetaljer eller privata registry-fält,
- en källa får aldrig i sig tolkas som att användaren har rätt till ett stöd.

### `feedback`

Anonym produktfeedback från piloten.

- ingen fritext,
- inga situationssvar om hälsa, ekonomi, familj eller boende,
- inga direkta identifierare,
- privat lagring får endast innehålla de definierade produktmåtten,
- rate limiting och övrigt missbruksskydd ska verkställas i faktisk tjänst.

### `interview`

Framtida privat följdfrågemotor.

- frågar bara efter det som behövs för nästa säkra beslut,
- rå känslig input sparas inte som standard,
- ingen diagnostisk eller annan otillåten inferens,
- kan användas anonymt/ephemeralt innan case-funktioner aktiveras.

### `cases`

Framtida persistent ärendefunktion bakom `cases`.

- autentisering krävs,
- authorization krävs per resurs/case,
- case-isolering är obligatorisk,
- audit ska registrera händelsemetadata utan att kopiera känsliga payloads till loggar,
- v0.1 ger inte klartecken för faktisk känslig datalagring.

## Koppling till capability-arkitekturen

Kontraktet korsvalideras mot `config/capabilities.json`.

- privata operationer måste referera till capabilities som är `private_service` och `server_authoritative`,
- `sources` kan referera till den nuvarande publika `source_details`,
- `feedback` är i v0.1 ett separat anonymt pilotflöde och har därför ingen produkt-capability,
- capability-resolution i klienten får aldrig ersätta server-side authorization.

## Automatisk kvalitetsgrind

`scripts/validate_api_boundary.py` använder endast Python standard library och kontrollerar bland annat:

- exakt de fem beslutade operationstyperna,
- att endpoints, tokens, hemligheter, prislogik, interna regler och verkliga ID-fält inte kan smyga in i det publika kontraktet,
- att privata capabilities verkligen är server-authoritative,
- att ephemeral sensitive input inte får persistens eller råloggning,
- att case-data kräver autentisering + resource authorization + privat lagring,
- att feedback behåller `no_free_text`, `no_situation_answers` och `no_identifiers`,
- negativa self-tests som bevisar att felaktiga konfigurationer stoppas.

GitHub Actions kör validatorn när API-gränsen eller capability-katalogen ändras.

## Vad detta inte gör

Detta är medvetet **inte**:

- en produktions-API-specifikation,
- ett beslut om leverantör eller hosting,
- ett beslut om autentiseringslösning,
- en DPIA eller laglig grund,
- tillstånd att lagra diagnoser, ekonomi eller annan känslig data,
- en beskrivning av privat matchningsalgoritm, ranking, prompts eller regelgraf.

När privat kärna etableras kan implementationen följa denna gräns utan att publika klientkontrakt behöver avslöja försprånget.
