# Stödassistenten – skalbar flerspråkighetsarkitektur

## Mål

Stödassistenten ska kunna stödja många språk utan att varje nytt språk kräver duplicerad matchningslogik, duplicerat stöddataset eller specialkod i kärnan.

Pilotens svenska, arabiska och persiska är endast första verifieringsgruppen.

## Grundmodell

Svenska primärkällor + verifierade regler är sanningslagret.

Samtalsspråk är ett separat presentations- och förståelselager:

användarens språk → situationsförståelse → språkneutral strukturerad profil → verifierad svensk regel-/stödmotor → strukturerat resultat → förklaring på användarens språk → formell svensk text vid behov.

Språkbyte får inte ändra den underliggande matchningslogiken.

## Arkitekturprinciper

- Locale-ID enligt etablerad standard, exempelvis `sv-SE`, `ar`, `fa`, `en`, `so`, `uk`.
- UI-strängar separeras helt från affärslogik och stöddata.
- Stödposter lagrar fakta/kriterier separat från presentationstext.
- Översättning av stödresultat ska utgå från strukturerade fakta, inte fri omskrivning av regler.
- Belopp, datum, villkor, negationer, undantag och myndighetsnamn ska ha extra kvalitetskontroller.
- RTL/LTR ska styras av locale metadata, inte hårdkodas per språk.
- Röst/STT/TTS ska vara utbytbara språkfunktioner bakom gemensamma kontrakt.
- Formell svensk sluttext ska kunna genereras från samma strukturerade ärende även när samtalet sker på annat språk.
- Fallback ska vara säker: om en översättning saknas eller kvalitet inte kan garanteras ska systemet visa tydligt språkstöd/fallback i stället för att gissa.

## Kvalitet och evals

Varje prioriterat språk ska testas mot samma situationsfall som svenska.

Mät bland annat:
- semantic equivalence: samma situation ger samma relevanta kandidatlogik,
- entity preservation: belopp, datum, personer/organisationstyper, myndigheter,
- negation/exception preservation,
- question equivalence,
- next-action equivalence,
- unsafe-claim rate,
- RTL/layout där relevant,
- begriplighet i användartest.

Vi ska särskilt ha cross-language parity-evals: ett syntetiskt fall översätts till flera språk och strukturerad profil/resultat jämförs mot svensk referens.

## Prioritering av nya språk

Språk ska läggas till efter faktisk nytta och distribution, exempelvis:
- användarvolym och behov,
- digital-/myndighetsspråkbarriär,
- partnerskap och pilotgrupper,
- teknisk STT/TTS-kvalitet,
- möjlighet till mänsklig kvalitetsgranskning.

Målet är många språk över tid, inte att lansera många halvtestade språk samtidigt.

## Säkerhetsprincip

Språkmodellen får aldrig vara sanningskälla för rätt till stöd. Verifierade regler och källor avgör kandidater och villkor; språklagret förstår, översätter, förklarar och formulerar.