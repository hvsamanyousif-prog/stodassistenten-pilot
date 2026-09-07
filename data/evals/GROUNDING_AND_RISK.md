# Grounding och riskgrind

Detta lager kompletterar Stödassistentens matchningsbenchmark med två beteenden som inte får döljas av en hög generell matchningspoäng:

1. **Källgrundning** – en matchningsmotor ska kunna ange vilka typer av primärkällor som måste verifieras för ett fall.
2. **Riskmedvetenhet** – känsliga eller högriskrelaterade signaler ska identifieras strukturerat och ett resultat får inte behandlas som verifierat innan regel-/källkärnan har gjort sitt arbete.

Det publika repot innehåller endast kontrakt, syntetiska benchmarkförväntningar och evaluator. Den privata kärnan ska senare exportera ett strukturerat predictions-dokument utan att exponera prompts, ranking, regler, hemligheter eller användardata.

## Prediction-kontrakt

En prediction innehåller exakt:

- `case_id`
- `source_requirements`: normaliserade källkrav som motorn anser behöver kontrolleras
- `acknowledged_risks`: riskflaggor som motorn har identifierat
- `verification_required`: måste vara `true` innan ett offentligt benchmarkfall kan betraktas som redo för regel-/källverifiering

Exempel:

```json
{
  "schema_version": "0.1.0",
  "predictions": [
    {
      "case_id": "cancer-001",
      "source_requirements": ["Försäkringskassan", "insurance", "patient_org"],
      "acknowledged_risks": ["health_sensitive", "income_loss"],
      "verification_required": true
    }
  ]
}
```

En full prediction-fil ska täcka samtliga benchmarkfall. Detta är avsiktligt fail-closed.

## Metriker

`scripts/evaluate_grounding.py` räknar totalt och per segment:

- `source_requirement_recall`
- `source_requirement_precision`
- `risk_ack_recall`
- `verification_gate_rate`
- missade källkrav
- missade riskflaggor
- verifieringsgrindar som felaktigt satts till false

Policy finns i `grounding_policy.json`. Ett starkt totalresultat får inte dölja en svag målgrupp; därför finns även segmentgrindar.

## Säkerhetsprincip

`verification_required=true` betyder inte att användaren har rätt till stöd. Det betyder tvärtom att matchningen fortfarande måste passera verifierad regel- och källlogik innan systemet kan ge ett mer bestämt svar.

Detta benchmark ska aldrig användas för att göra medicinska, juridiska eller myndighetsliknande beslut. Det mäter endast om motorn känner igen vilka källor och risker som måste hanteras säkert.
