# Stödassistenten – kvalitetskrav för Sverige

## Huvudmannabeslut

Stödassistenten ska byggas med ambitionen att vara den mest seriösa och bästa hjälpassistenten i Sverige för att förstå en verklig situation och vägleda till relevanta stöd, rättigheter, tjänster och nästa handling.

Detta är inte en marknadsföringsfras och inte ett påstående vi får använda externt utan evidens. Det är ett internt kvalitetskrav och en releasebar.

## Vad "mest seriös" betyder

Seriositet betyder att produkten prioriterar sanning, trygghet och verklig nytta framför imponerande formuleringar.

Produkten ska därför:

- skilja verifierade fakta från antaganden och AI-genererad text,
- föredra primärkällor och versionsstyrda regler,
- visa osäkerhet när underlag saknas,
- aldrig lova rätt till stöd utan verifiering,
- minimera känsliga personuppgifter,
- vara begriplig även för personer med låg digital vana,
- fungera över språk och tillgänglighetsbehov,
- alltid ge ett tydligt nästa steg när det är möjligt,
- ha mätbar kvalitet per målgrupp och språk,
- stoppa eller degradera osäkra funktioner hellre än att ge självsäkra fel.

## Vad "bäst" måste bevisas med

"Bäst" får inte bedömas på design eller modellnamn. Det ska mätas i faktisk förmåga.

Minimikategorier för scorecard:

- verified-support coverage,
- support-area recall,
- false-positive rate,
- unsafe/unverified claim rate,
- source grounding,
- question efficiency,
- next-step clarity,
- language parity,
- segment/population parity,
- change-detection latency,
- pilot usefulness,
- regression rate efter nya releaser.

## Releaseprincip

En ny funktion är inte bättre bara för att den är ny. Den ska ge mätbar nytta utan att sänka sanning, säkerhet, begriplighet eller populationsparitet.

När snabbhet och kvalitet står i konflikt gäller:

1. ingen fabricerad säkerhet,
2. ingen dold försämring för en målgrupp,
3. ingen otestad risk i känsliga flöden,
4. därefter maximal utvecklingshastighet.

## Konkurrensprincip

Vi ska inte försöka vinna genom att säga att vi är bäst. Vi ska bygga ett system som över tid kan visa bättre verifierad täckning, bättre situationsförståelse, färre farliga fel, bättre språkparitet och tydligare nästa steg än alternativen.

Om en konkurrent kopierar ytan ska vår fördel ligga i den ackumulerade stöddatan, verifieringshistoriken, regelmodellen, benchmarkbiblioteket, population-first-testningen, användarlärandet och förmågan att upptäcka förändringar snabbare.

## Organisationskrav

BUILD får inte ensam godkänna sin egen kvalitet. Knowledge & Verification, Evaluation & Red Team samt Pilot & Learning ska tillsammans avgöra om en förbättring verkligen är en förbättring.

Varje allvarligt fel eller missad träff ska när det är möjligt omvandlas till ett permanent test, en verifierad datakorrigering, en regeländring eller ett versionsstyrt beslut.

## Kärnformulering

**Att bli bäst är inte en slogan. Att förtjäna förtroendet är kravet.**
