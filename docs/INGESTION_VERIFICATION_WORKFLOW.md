# Stödassistenten – ingestion och verifieringsflöde v1

Detta dokument operationaliserar `SUPPORT_INGESTION_ENGINE.md` och `data/support_record.schema.json`.

## Mål

Varje stöd som når produkten ska kunna spåras till en primär eller auktoritativ källa och ha en tydlig verifieringsstatus. Bredd får aldrig gå före förtroende.

## Pipeline

1. **Discover** – hitta kandidat från `data/source_registry.json`.
2. **Fetch** – hämta endast enligt tillåten metod och efter robots-/villkorskontroll. API/öppna data prioriteras före HTML.
3. **Parse** – extrahera kandidatinformation utan att fylla luckor med antaganden.
4. **Normalize** – mappa till `data/support_record.schema.json`.
5. **Diff** – jämför materialfält och innehållshash mot föregående version.
6. **Review** – allt nytt eller materiellt ändrat går till granskning.
7. **Verify** – markera `VERIFIED` först när relevanta villkor kontrollerats mot primärkällan.
8. **Publish** – endast `VERIFIED` får ligga bakom starka produktpåståenden eller matchningsregler.
9. **Monitor** – kontrollera källa enligt prioritet och markera förändringar.

## Statusmaskin

`DISCOVERED -> PARSED -> NEEDS_REVIEW -> VERIFIED`

Vid ändring:

`VERIFIED -> CHANGED -> NEEDS_REVIEW -> VERIFIED`

Vid upphörande:

`VERIFIED|CHANGED -> EXPIRED -> ARCHIVED`

Ingen automatisk process får hoppa direkt från `DISCOVERED` eller `PARSED` till `VERIFIED`.

## Materialförändringar

Följande ändringar ska alltid trigga `CHANGED` och blockera automatisk publicering tills ny kontroll är klar:

- målgrupp eller geografisk täckning
- behörighetsvillkor eller exklusionsvillkor
- belopp, beräkningsmodell eller ersättningsnivå
- ansökningsperiod, sista ansökningsdag eller giltighetstid
- dokumentkrav
- ansökningssätt eller officiell ansökningslänk
- ansvarig utbetalare/finansiär
- stödets status: öppet, stängt, pausat eller avvecklat

Kosmetiska textändringar får registreras utan att automatiskt göra posten produktblockerande, men hash och versionshistorik ska sparas.

## Källhierarki

### P0 – primär nationell källa

Myndighet eller ansvarig nationell aktör som beslutar, betalar ut eller officiellt reglerar stödet. Dessa ska prioriteras för verifiering.

### P1 – auktoritativ stödägare eller offentlig aggregator

Exempel: bidragsgivande organisation eller offentlig tjänst som samlar flera stöd. Aggregatorer får användas för discovery, men kritiska villkor ska verifieras hos den faktiska stödägaren när sådan finns.

### P2 – sekundär källa

Nyhetsartiklar, bloggar, jämförelsesidor, forum och AI-genererad text. Får användas för att hitta kandidater men aldrig som ensam grund för `VERIFIED`.

## Första källregistret

Den första maskinläsbara registret innehåller nationella källor för socialförsäkring, pension, arbetsmarknad, studier, ekonomiskt bistånd, bostadsanpassning, stiftelser, civilsamhälle, företag, kultur och idrott.

Källornas URL:er kontrollerades mot officiella sidor den 5 september 2026. `SOURCE_VERIFIED` betyder endast att källan/ägaren är verifierad; det betyder inte att alla enskilda stöd på sidan redan är verifierade produktposter.

## Länsstyrelsernas Stiftelsesök

Stiftelseregistret behandlas separat eftersom ett registrerat ändamål inte automatiskt betyder att stiftelsen:

- tar emot ansökningar just nu,
- har utdelningsbara medel,
- använder en publik ansökningsprocess,
- är relevant för en viss användare.

Pipeline för stiftelser ska därför vara:

`registry discovery -> foundation record -> current application evidence -> NEEDS_REVIEW -> VERIFIED`

Stiftelser får inte visas som "sökbart stöd nu" enbart för att de finns i registret.

## Dataskyddsgräns

Ingestionsmotorn arbetar med offentliga stödmetadata, inte användarprofiler. Den ska inte lagra:

- namn, personnummer eller kontaktuppgifter för användare
- diagnoser eller journaluppgifter
- detaljerad privatekonomi
- dokument från användarärenden
- autentiseringshemligheter eller API-nycklar i publikt repo

Användarens framtida matchning sker genom separata, minimerade inputfält mot verifierade regler.

## Change detection v1

För varje stödpost sparas en normaliserad hash över materialfält. Vid ny hämtning:

1. normalisera whitespace och presentationsbrus,
2. jämför strukturerade materialfält,
3. spara ny rå-hash och material-hash,
4. skapa ny versionspost om något ändrats,
5. sätt `CHANGED` vid materialförändring,
6. skapa granskningsuppgift med diff av endast de fält som ändrats.

## Granskningskö

Varje köpost bör innehålla:

- support_id
- källa och URL
- gammal version / ny version
- ändrade materialfält
- maskinell sammanfattning av diff
- riskklass: LOW / MEDIUM / HIGH
- föreslagen granskningsprioritet
- vem/när som verifierade senast

HIGH används exempelvis vid ändrade behörighetsvillkor, belopp, deadline eller avveckling.

## Publiceringsregel

Frontend eller framtida AI får aldrig själv tolka en `CHANGED`, `PARSED` eller `NEEDS_REVIEW`-post som säker rättighet. Sådana poster kan användas internt för research, men användaren ska endast få verifierade fakta presenterade som verifierade.

## Nästa implementeringssteg

1. Validera source registry mot ett JSON-schema.
2. Bygg första privata adapterkontraktet (`discover`, `fetch`, `parse`, `normalize`).
3. Implementera 2–3 P0-källor först: Försäkringskassan, Arbetsförmedlingen och CSN.
4. Skapa change-detection-test med sparade fixtures utan persondata.
5. Lägg till review queue i privat backend innan någon automatisk masspublicering.
