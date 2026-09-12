# Matching evals

Detta katalogträd innehåller Stödassistentens publika, helt syntetiska benchmark för situationsförståelse och matchningskvalitet.

Syftet är att mäta om en framtida matchningsmotor hittar relevanta stödområden, undviker irrelevanta eller osäkra påståenden, ställer effektiva följdfrågor och leder vidare till rätt nästa handling. Benchmarken mäter struktur och beteende – inte hur övertygande AI-texten låter.

## Låst v0.1 + expansion v0.2

- `matching_eval.schema.json` beskriver fallkontraktet.
- `cases/*.json` är den låsta v0.1-baslinjen med 45 syntetiska fall, fem per segment. Den lämnas oförändrad för kompatibilitet med befintlig private-prediction bridge.
- `benchmark_baseline.json` låser v0.1-baslinjens semantiska SHA-256-fingerprint och minimipolicy.
- `expansion/*.json` lägger till 63 helt syntetiska v0.2-fall. Tillsammans innehåller benchmarken 108 fall, 12 per segment.
- `benchmark_expansion_policy.json` låser expansionens fingerprint, populationsbalans och språk-/paritetskrav.
- `scripts/evaluate_matching.py` validerar den låsta v0.1-baslinjen.
- `scripts/evaluate_benchmark_expansion.py` validerar samtliga 108 fall och kan poängsätta kombinerade prediction-filer.
- `.github/workflows/matching-expansion.yml` kör strukturkontroll och ett deterministiskt Red Team-test som måste avvisa språkdrift.

Segmenten är:

1. pension / låg ekonomi
2. arbetslöshet / a-kassa
3. deltid + sjukskrivning
4. NPF / funktionsnedsättning
5. cancer / allvarlig sjukdom
6. anhörig
7. villa / energi
8. förening
9. företag / finansiering och offentlig upphandling

## Population-first och språkparitet

Varje segment i v0.2-expansionen har sju nya fall: en semantiskt likvärdig kvartett på svenska, arabiska, persiska och engelska samt tre ytterligare edge cases. Kvartetten har samma strukturerade ground truth för kända/saknade fakta, stödområden, förbjudna claims, följdfrågor, nästa handling, riskflaggor och källkrav. Endast `case_id`, `language` och den översatta berättelsen skiljer sig.

När en prediction-fil finns kräver evaluatorn samma strukturerade prediction över språk för varje paritetskvartett. En stark totalpoäng kan därför inte dölja att exempelvis arabiska eller persiska ger en annan kandidatlogik än svenska.

## Fallformat

Varje fall innehåller:

- `case_id`
- `segment`
- `language`
- `story`
- `known_facts`
- `unknown_facts`
- `expected_support_areas`
- `must_not_claim`
- `expected_questions`
- `expected_next_actions`
- `risk_flags`
- `source_requirements`

`expected_support_areas` är avsiktligt stödområden, inte löften om rätt till en viss ersättning. Verifierade regler och faktisk eligibility ska komma från den privata regel- och källkärnan.

## Metriker

Evaluatorerna räknar bland annat:

- support recall
- support precision
- missade stödområden
- osäkra/förbjudna claims
- question efficiency = question recall × question precision
- next-action recall
- segmentnivå
- språkmetrik på paritetsfallen
- exakt cross-language prediction parity

En kombinerad prediction-fil för v0.2 ska täcka samtliga 108 benchmarkfall. Expansionen är fingerprint-låst; semantiska ändringar kräver en synlig `change_reason` och nytt fingerprint i samma review.

Validera v0.1:

```bash
python scripts/evaluate_matching.py --validate-only --self-test
```

Validera hela 108-fallsbenchmarken och Red Team-paritetsgrinden:

```bash
python scripts/evaluate_benchmark_expansion.py --validate-only --self-test
```

Poängsätt en framtida kombinerad prediction-fil:

```bash
python scripts/evaluate_benchmark_expansion.py --predictions path/to/predictions.json
```

Det inbyggda oracle-testet bevisar endast att eval-ledningen och gränserna fungerar. Det är inte ett påstående om att den verkliga privata matchningsmotorn uppnår perfekta resultat.

## Säkerhetsgräns

Alla fall i detta publika repo ska vara helt syntetiska. Verkliga användarberättelser, diagnoser, ekonomiska uppgifter, pilotdata, prompts, produktionsregler och proprietär rankinglogik får inte läggas här.

Det publika benchmarklagret kan kontrollera kvalitet, språkparitet och regressionsdisciplin, men ska inte innehålla den privata motorn som producerar matchningarna.
