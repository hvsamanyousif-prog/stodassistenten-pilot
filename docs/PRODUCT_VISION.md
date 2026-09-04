# Stödassistenten – Produktvision och permanent projektminne

Detta dokument är projektets gemensamma minne och ska uppdateras när viktiga produktbeslut tas. GitHub är source of truth.

## Kärnidé

Stödassistenten ska vara gränssnittet mellan människans verkliga situation och Sveriges fragmenterade stödsystem.

Användaren ska inte behöva känna till namnet på ett bidrag, en rättighet, en myndighet eller en fond. Personen ska kunna beskriva vad som händer i livet med egna ord och få hjälp att förstå:

- vilka stöd, rättigheter, tjänster och organisationer som kan vara relevanta,
- vad som behöver kontrolleras,
- vilka dokument eller uppgifter som saknas,
- vad nästa steg är,
- hur ett ärende kan följas vidare.

Positionering: inte en bidragsdatabas, utan en handlingsmotor mellan ett livsproblem och det svenska stöd- och servicesystemet.

## Grundprinciper

1. Appen får aldrig lova rätt till stöd om detta inte är verifierat. Använd språk som "relevant att kontrollera", "möjlig match" och "värt att kolla".
2. Officiella regler och verifierade källor styr kandidater och villkor. AI får hjälpa med samtal, språk, struktur, förklaring och utkast – inte hitta på fakta.
3. Marknadsföringen kan vara offensiv; sanningshalten får aldrig vara det.
4. Användaren ska förstå vad appen gör utan muntlig säljpitch.
5. Resultat ska alltid leda till ett begripligt nästa steg, inte bara en lista med stöd.
6. Språk och tillgänglighet är kärnfunktioner, inte tillägg.
7. Samla minsta möjliga mängd persondata, särskilt i pilotfasen.

## Språk och tillgänglighet

Pilot: svenska, arabiska och persiska.

- Full RTL för arabiska och persiska.
- Röst ska vara en central ingång.
- Senare: foto av brev/dokument, uppläsning, enklare språk och fler språk.
- Formella ansökningar ska kunna produceras på svenska även om användaren talar ett annat språk.

## Viktiga användarspår

### 1. Pensionär / låg ekonomi

Exempel: låg pension, hög hyra, tandvård, praktiska behov, lokala stiftelser, bostadsrelaterade stöd.

### 2. Barnfamilj / NPF / funktionsnedsättning

Exempel: autism/ADHD, extra omvårdnad, tillsyn, merkostnader, skola, LSS-relaterade stödvägar, lokala stöd.

### 3. Arbetslöshet / a-kassa

Personer på a-kassa eller mellan arbete och annan ersättning ska kunna beskriva sin situation och få hjälp att förstå vilka ekonomiska och praktiska stödvägar som kan vara relevanta.

### 4. Deltidsarbete + sjukskrivning

Viktigt pilotfall: en person arbetar deltid och är sjukskriven resterande del. Appen ska kunna resonera kring situationen utan att anta diagnos eller rättighet och visa relevanta områden att kontrollera.

### 5. Allvarlig sjukdom / cancer

Cancer ska byggas som ett livshändelsespår, inte som en separat app.

Två tydliga ingångar:

- "Jag är drabbad"
- "Jag hjälper någon som är drabbad"

Möjliga områden att navigera i:

- sjukskrivning och arbete,
- inkomstbortfall,
- försäkringar,
- resor och behandling,
- rehabilitering,
- kommunala stödvägar,
- familj och barn,
- praktiskt stöd,
- stiftelser/fonder,
- patient- och anhörigorganisationer,
- myndighetskontakter,
- hjälp att förstå brev och beslut.

Cancerflödet ska kunna återanvändas som grund för andra stora livshändelser, exempelvis stroke, hjärtsjukdom, MS, olycka, långvarig sjukdom, demens och allvarligt sjukt barn.

Hälsodata är känsliga personuppgifter. I tidiga piloter ska vi undvika central lagring av diagnoser, journaler och liknande tills integritets- och backendarkitekturen är färdig.

### 6. Anhöriga

Anhöriga är en egen viktig målgrupp. Många fungerar i praktiken som samordnare för en närstående och behöver förstå stöd, rättigheter, dokument, myndighetskontakter och nästa steg.

### 7. Ny i Sverige / språkbarriär

Användaren ska kunna fotografera eller beskriva myndighetsbrev och få begriplig förklaring på sitt språk samt hjälp att formulera svar på svenska.

### 8. Föreningar

Bidrag, projektstöd, lokaler, utrustning, tillgänglighet, RF, Arvsfonden och andra relevanta stödvägar.

### 9. Små företag

Bidrag, finansiering, tillstånd och senare offentlig upphandling/LOU med kravmatris, evidens och utkast.

### 10. Professionella och kommuner

Senare spår för gode män, kuratorer, arbetsterapeuter, socialrådgivare och kommunal digital första linje. Plattformen ska stödja professionen, inte ersätta juridiskt ansvar eller myndighetsbeslut.

## Pilot-UX

Startsidan ska sälja in nyttan själv inom cirka 10–20 sekunder.

Kärnbudskap:

"Berätta din situation. Vi hjälper dig hitta stöd, rättigheter och nästa steg."

"Du behöver inte veta vilket stöd du ska söka."

Det ska finnas både exempel och ett generellt alternativ:

"Min situation passar inte exemplen"

Det generella flödet ska fråga kort om exempelvis arbete, ekonomi, barn/familj, sjukdom/funktionsnedsättning och boende.

## Pilotfeedback

Vi ska mäta verklig nytta, inte bara om användaren "gillade appen".

Per träff:

- Relevant
- Kände redan till
- Inte relevant

Efter hela flödet:

- Fick du reda på något nytt?
- Var resultatet användbart för din situation?
- Var det tydligt vad du skulle göra härnäst?

I tidig pilot ska delad feedback inte innehålla detaljerade svar om hälsa, ekonomi, familj eller andra känsliga uppgifter.

## Framtida ärendeflöde

Behov/situation → profil → verifierade regler → kandidater → följdfrågor → dokument → ansökningsutkast → användarens godkännande → inskick → status → komplettering → beslut → förklaring → överklagande/nytt nästa steg.

"Mina ärenden" / "Stödkalendern" bör senare hantera status som:

- påbörjad,
- redo,
- inskickad,
- väntar,
- komplettering saknas,
- beslut mottaget,
- överklagandetid,
- återkommande förnyelse.

## Teknikprincip

Kort sikt:

- mobil webbpilot,
- GitHub som source of truth,
- enkel klientbaserad matchning,
- officiella källor,
- ingen känslig central datalagring.

Senare:

- privat backend,
- verifierad stöddatabas,
- regelmotor,
- OpenAI/API eller annan AI bakom servern,
- dokumentanalys,
- semantisk sökning/RAG där det passar,
- rollbaserad åtkomst,
- audit trail,
- EU/EES-orienterad dataarkitektur och svensk/EU-hosting där det är motiverat.

API-nycklar får aldrig ligga i publik frontend eller publikt GitHub-repo.

## AI:s roll

AI ska:

- förstå naturligt språk,
- översätta,
- ställa följdfrågor,
- strukturera en situation,
- förklara brev och beslut,
- hjälpa till med ansökningsutkast,
- sammanfatta dokument.

AI ska inte ensam avgöra rätt till stöd. Verifierade regler och källor ska ligga separat.

Produktens förbättring ska komma från egen kvalitetsdata och feedback, exempelvis relevans, missade träffar, vanliga dokumentluckor och begriplighet – inte från okontrollerad lagring eller generell modellträning av känsliga personuppgifter.

## Kommersiell riktning

Möjlig långsiktig modell:

- B2C: gratis/låg kostnad för sök/matchning, eventuellt betald hjälp med avancerade dokument senare.
- Förening/BRF: paket/prenumeration.
- Företag: SaaS för stöd och offentlig upphandling.
- Professionella: multi-case dashboard.
- Kommuner/offentlig sektor: licens för digital första linje.

B2B/B2G/professionella intäkter kan på sikt subventionera en tillgänglig B2C-tjänst.

## Produktens försvarbarhet

Moat ska byggas genom:

- verifierad svensk stöddatabas,
- regelmodell,
- livshändelsebaserade intervjuer,
- dokument- och ärendeflöden,
- språk/tillgänglighet,
- integrationsarbete,
- verklig pilotdata,
- distribution och partnerskap.

Inte genom att bara säga "AI".

## Arbetsregel framåt

När en viktig ny målgrupp, livshändelse, produktprincip eller arkitekturidé beslutas ska detta dokument uppdateras innan idén riskerar att försvinna.
