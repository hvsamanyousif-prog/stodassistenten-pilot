# Matching evals

Detta katalogträd innehåller Stödassistentens publika, helt syntetiska benchmark för situationsförståelse och matchningskvalitet.

Syftet är att mäta om en framtida matchningsmotor hittar relevanta stödområden, undviker irrelevanta eller osäkra påståenden, ställer effektiva följdfrågor och leder vidare till rätt nästa handling. Benchmarken mäter struktur och beteende – inte hur övertygande AI-texten låter.

## Nuvarande v0.1

- `matching_eval.schema.json` beskriver det maskinläsbara fallkontraktet.
- `cases/*.json` innehåller 45 syntetiska fall, fem per segment.
- `benchmark_baseline.json` låser benchmarkens semantiska SHA-256-fingerprint och minimipolicy.
- `scripts/evaluate_matching.py` validerar datan och kan poängsätta fullständiga prediction-filer.
- `.github/workflows/matching-evals.yml` kör integritetskontroll och metriksjälvtest i CI.

Första segmenten är:

1. pension / låg ekonomi
2. arbetslöshet / a-kassa
3. deltid + sjukskrivning
4. NPF / funktionsnedsättning
5. cancer / allvarlig sjukdom
6. anhörig
7. villa / energi
8. förening
9. företag / finansiering och offentlig upphandling

Språkbarriär och fler språk ska läggas till som tvärgående benchmarkdimension när den privata matchningskärnan kan generera strukturerade prediction-resultat.

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

Evaluatorn räknar:

- support recall
- support precision
- antal missade stödområden
- osäkra/förbjudna claims
- question efficiency = question recall × question precision
- next-action recall

En full prediction-fil ska täcka samtliga benchmarkfall. `benchmark_baseline.json` anger minimigränser. Om själva benchmarkens förväntningar ändras bryts fingerprint-kontrollen tills baseline uppdateras med en synlig `change_reason`.

Exempel när en strukturerad prediction-fil finns:

```bash
python scripts/evaluate_matching.py --predictions path/to/predictions.json
```

För ren datavalidering:

```bash
python scripts/evaluate_matching.py --validate-only --self-test
```

## Säkerhetsgräns

Alla fall i detta publika repo ska vara helt syntetiska. Verkliga användarberättelser, diagnoser, ekonomiska uppgifter, pilotdata, prompts, produktionsregler och proprietär rankinglogik får inte läggas här.

Det publika benchmarklagret kan kontrollera kvalitet och regressionsdisciplin, men ska inte innehålla den privata motorn som producerar matchningarna.
