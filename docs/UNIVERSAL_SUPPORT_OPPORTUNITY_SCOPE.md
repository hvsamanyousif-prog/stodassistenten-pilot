# Universal support & opportunity scope

## Huvudprincip

Stödassistenten ska på sikt förstå en människas, ett företags, en förenings eller annan aktörs situation och hitta relevanta **pengar, stöd, rättigheter, ersättningar, tjänster, finansiering och offentliga möjligheter** utan att användaren behöver känna till rätt namn i förväg.

Backendvisionen är bred: hela Sveriges stöd- och möjlighetslandskap. Frontend ska fortfarande kännas smal, situationsstyrd och personlig.

## Vad som ingår i täckningsvisionen

Stödassistentens taxonomi ska kunna representera minst följande typer:

- bidrag och ekonomiska stöd
- socialförsäkringsförmåner och ersättningar
- kommunalt ekonomiskt bistånd och lokala stöd
- regionala stöd och patient-/rese-/hjälpmedelsrelaterade förmåner
- skatteavdrag och skattereduktioner
- försäkrings- och kollektivavtalsersättningar
- tjänstepension och anställningsrelaterade förmåner
- bostads-, energi-, renoverings- och klimatomställningsstöd
- mobilitets-, fordons-, laddnings- och transportrelaterade stöd när sådana finns
- landsbygds-, jordbruks-, lokal utvecklings- och geografiskt riktade stöd
- företagsstöd, finansiering, lån, garantier, export-/innovationsstöd
- offentlig upphandling och andra offentliga affärsmöjligheter
- förenings-, idrotts-, kultur- och projektstöd
- stiftelser, fonder och andra primärkällestyrda privata stöd
- rättigheter, praktiska tjänster och hjälpinsatser som inte nödvändigtvis är rena pengar
- relevanta EU-stöd när de kan verifieras och göras begripliga i svensk kontext

Listan är inte ett löfte om att varje kategori är komplett idag. Den definierar databasens långsiktiga täckningskrav.

## Situation-first, inte kategoriförst

Användaren ska kunna börja med exempel som:

- "Jag är äldre och pengarna räcker inte efter hyran."
- "Jag har en funktionsnedsättning och behöver hjälp i vardagen."
- "Jag driver ett litet städbolag och vill sälja till kommuner."
- "Vi är en förening och behöver pengar till en lokal."
- "Jag bor på landsbygden och vill veta vilka stöd som kan vara relevanta."
- "Jag ska byta bil/ladda hemma och undrar om det finns något stöd eller avdrag."
- "Jag jobbar i kommunen; vilka försäkringar och förmåner kan gälla genom jobbet?"

Systemet ska översätta situationen till en språkneutral profil och därefter söka i verifierade stöd-/möjlighetsobjekt.

## Coverage graph

Varje verifierat objekt ska när möjligt kopplas till:

- `actor_type`: individual / relative / household / employee / company / association / brf / other
- `life_or_business_event`
- `support_type`
- `geography`
- `authority_or_provider`
- `eligibility_dimensions`
- `missing_facts`
- `required_documents`
- `application_or_action_path`
- `source_evidence`
- `verification_status`
- `valid_from` / `valid_to` när känt
- `next_action`

Täckning ska kunna mätas som en matris över aktör × situation × stödtyp × geografi × källa, så att vita fläckar blir synliga och prioriteringsbara.

## Bredd utan hallucination

Bredd får inte uppnås genom att modellen improviserar fler stöd. Principen är:

**bred discovery, strikt verifiering.**

AI får hitta signaler, föreslå kandidater, formulera frågor och hjälpa användaren förstå. Verifierade primärkällor och granskningskedjan avgör vad som får presenteras som verkligt och aktuellt.

Politiska utspel och nyheter är signaler tills genomförandet är verifierat.

## Utbyggnadsprincip

- Databasvision: hela Sverige.
- Utbyggnad: område för område och källa för källa.
- Pilot: färre situationer extremt bra.
- Varje nytt domänområde ska få egna evalfall och Red Team-scenarier innan det betraktas som pålitligt.
- En stark totalsiffra får inte dölja svag täckning för en grupp eller stödtyp.

## Lärloop

När en riktig testare säger "ni missade X" eller "jag förstod inte Y" ska lärdomen, när den kan verifieras, kunna bli:

- ny källa eller stödpost,
- nytt missing-fact-fält,
- bättre följdfråga,
- nytt benchmarkfall,
- regressionstest,
- bättre förklaring,
- ny change-detection-regel,
- eller dokumenterad produktgräns.

Person- eller företagsidentifierande detaljer ska inte kopieras in i publika evaldata. Generalisera lärdomen till syntetiska fall.
