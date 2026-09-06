# Stödassistenten – AI Matching North Star

## Målet

Stödassistentens AI ska utvecklas mot att bli Sveriges starkaste situationsförståelse- och matchningsmotor för stöd, rättigheter, finansiering och nästa handling.

Det betyder inte att modellen ska kunna prata mest eller låta mest övertygande. Den ska vara bäst på att förstå vad som faktiskt händer i en användares situation och koppla detta till verifierade stödvägar med rätt följdfrågor, rätt osäkerhet och ett begripligt nästa steg.

## Samma intelligens, flera användartyper

Kärnan ska generalisera mellan:

- privatpersoner och hushåll,
- pensionärer,
- personer som är arbetslösa eller sjukskrivna,
- barnfamiljer och personer med funktionsnedsättning,
- personer med allvarlig sjukdom,
- anhöriga som hjälper någon annan,
- personer med språk- eller digitala barriärer,
- föreningar och idrottsorganisationer,
- BRF:er och fastighetsägare,
- företagare och småföretag,
- professionella som hjälper flera klienter,
- kommunala/offentliga användningsfall där juridiken tillåter.

Användargränssnitt och följdfrågor kan skilja sig, men samma underliggande princip gäller:

**Situation → struktur → kandidater → saknade fakta → verifierade regler → relevans → nästa handling.**

## Vad AI:n ska vara exceptionellt bra på

### 1. Situationsförståelse
AI:n ska kunna tolka vardagligt språk, ofullständiga berättelser, språkblandning och indirekta signaler utan att hitta på fakta.

Exempel:
- "Jag jobbar halvtid nu för jag orkar inte mer."
- "Mamma har fått cancer och jag sköter alla papper."
- "Vi har en förening och behöver göra lokalen tillgänglig."
- "Elräkningen i villan är helt galen."
- "Jag har ett litet bolag och kommunen köper det vi säljer."

AI:n ska förstå vilken typ av situation detta beskriver och vilka informationsluckor som är viktiga.

### 2. Minsta nödvändiga följdfrågor
Systemet ska ställa få men högvärdiga frågor. Varje fråga ska ha ett tydligt syfte i matchningen.

Vi ska mäta hur mycket varje fråga förbättrar precisionen och ta bort frågor som inte gör skillnad.

### 3. Separera fakta, antaganden och osäkerhet
AI:n får aldrig fylla okända uppgifter med antaganden. Den ska uttryckligen kunna representera:

- känt,
- okänt,
- behöver verifieras,
- sannolikt relevant,
- inte relevant enligt verifierad regel.

### 4. Kandidatgenerering över hela stödkartan
AI/semantic search kan hjälpa till att hitta kandidater ur en bred databas, inklusive stöd användaren inte själv hade tänkt söka efter.

Men kandidaten får inte presenteras som träff förrän den passerat verifierad regel- och källkontroll där sådan krävs.

### 5. Förklaring
Systemet ska kunna förklara:

- varför ett stöd visas,
- vilka uppgifter som saknas,
- vilka villkor som är viktiga,
- vilken källa som gäller,
- exakt vad användaren kan göra härnäst.

### 6. Multi-domain reasoning
En situation kan beröra flera områden samtidigt.

Exempel: cancer kan påverka arbete, sjukpenning, försäkring, resor, barn, kommunalt stöd, praktiskt stöd och stiftelser.

Motorn ska kunna skapa en sammanhängande stödplan utan att blanda ihop olika rättsgrunder eller lova utfall.

## Arkitekturprincip

AI:n är orkestrator och samtalslager, inte ensam beslutsmotor.

Rekommenderad uppdelning:

1. **Conversation layer** – språk, intervju, röst, dokumentförklaring.
2. **Structured situation model** – normaliserad profil med kända/okända fält.
3. **Candidate finder** – semantisk sökning/RAG/taxonomi för bred recall.
4. **Rule engine** – hårda kriterier, geografi, datum, inkomster, målgrupper och andra verifierade villkor.
5. **Ranking layer** – relevans och prioritering med tydliga orsaker.
6. **Explanation layer** – varför, vad saknas och nästa steg.
7. **Case/workflow layer** – dokument, ansökan, status, komplettering och bevakning.

## Benchmark – vår verkliga tävling

Vi ska bygga en egen eval-svit med syntetiska och senare avidentifierade användarfall.

Varje fall ska innehålla:

- användarberättelse,
- målgrupp,
- fakta som är kända,
- fakta som saknas,
- förväntade relevanta stödområden,
- stöd som inte ska visas,
- optimala följdfrågor,
- risk för hallucination,
- önskat nästa steg.

Segment i benchmark:

- pension/boende/ekonomi,
- arbetslöshet/a-kassa,
- deltid + sjukskrivning,
- NPF/funktionsnedsättning,
- allvarlig sjukdom/cancer,
- anhörig,
- språkbarriär,
- villa/energi,
- förening,
- företag/finansiering,
- offentlig upphandling.

## Kärnmått

Vi ska optimera för:

- **Recall:** hittade vi viktiga stödvägar?
- **Precision:** hur många visade träffar var faktiskt relevanta?
- **Missed-support rate:** missade vi något viktigt?
- **Unsafe-claim rate:** påstod vi rättighet utan tillräcklig grund?
- **Question efficiency:** hur få frågor behövdes för en bra matchning?
- **Next-step clarity:** förstod användaren vad den ska göra?
- **Novelty:** fick användaren reda på något den inte redan visste?
- **Source freshness:** bygger träffen på aktuell verifierad källa?

## Försprång

Varje riktig pilot ska förbättra benchmarken och intervju-logiken.

När en användare markerar en träff som relevant, känd eller irrelevant ska vi kunna använda den aggregerade signalen för att förbättra framtida prioritering utan att lagra onödiga känsliga detaljer.

När en missad stödväg upptäcks ska vi skapa ett nytt eval-fall så att samma typ av miss inte återkommer.

När en regel eller källa ändras ska regressionstester visa vilka användarfall som påverkas.

Detta skapar en kumulativ kvalitetsfördel som är svårare att kopiera än en enskild AI-modell.

## Produktprincip

Vi kan lansera med få domäner och ändå bygga mot ett mycket större system.

Användaren ska aldrig behöva se hur bred motorn är. Produkten visar bara det som är relevant för den aktuella situationen.

**Bredd i motorn. Fokus i upplevelsen. Precision i sanningen.**
