# Private-core prediction bridge

## Syfte

Det publika benchmarkharneset ska kunna mäta en framtida privat matchningskärna utan att den privata implementationen flyttas till det publika repot.

Privata kärnan producerar därför endast en minimal, strukturerad resultatfil enligt `private_prediction_export.schema.json`. Filen matas sedan offline till `scripts/evaluate_private_predictions.py`.

## Tillåtna fält per syntetiskt benchmarkfall

- `case_id`
- `predicted_support_areas`
- `asked_questions`
- `next_actions`
- `claims`
- `source_requirements`
- `risk_acknowledgements`
- `verification_required`

Exporten innehåller dessutom `schema_version` och den låsta benchmarkens `benchmark_dataset_sha256`.

## Förbjudet i exporten

Exporten får inte innehålla verkliga användaruppgifter, berättelser, dokument, personnummer, user/case identifiers från produktion, råa prompts, chain-of-thought/resonemangsspår, interna scores, rankingdetaljer, rule IDs, endpoints, tokens, secrets eller annan privat implementation.

`additionalProperties=false` i kontraktet och evaluatorn failar stängt vid extra fält, dubbletter, okända case-ID:n, saknade benchmarkfall eller fel benchmark-fingerprint.

## Isolerad körning senare

1. Privat kärna laddar endast de publika, helt syntetiska benchmarkfallen.
2. Kärnan kör sin normala matchningspipeline i en isolerad eval-miljö utan verkliga användardata.
3. Ett exportsteg mappar resultatet till det minimala bridge-kontraktet. Interna mellanresultat stannar privat.
4. Endast exportfilen förs till benchmarkharneset.
5. Kör `python scripts/evaluate_private_predictions.py --predictions <export.json>`.
6. Resultatet omfattar total matchningskvalitet, kvalitet per segment samt grounding-/riskgrindar.

En export som inte täcker exakt den låsta benchmarkversionen ska inte poängsättas.

## CI-fixture

`generate_private_prediction_fixture.py` skapar en helt syntetisk, deterministisk fixture från de publika förväntningarna och används endast för att verifiera bridge-kontraktet och evaluatorns wiring i CI.

Eftersom fixture:n medvetet speglar facit är dess poäng **inte** ett mått på verklig AI- eller private-core-prestanda. Riktig prestanda får påstås först när en faktisk privat kärna har genererat exporten under kontrollerad eval-körning.

## Säkerhetsgräns

Detta bridge-lager ändrar inte Supabase, frontendens persondatahantering, produktionsdata, auth, API-nycklar eller privat matchningslogik. Det definierar endast ett testbart resultatkontrakt mellan privat kärna och publikt syntetiskt QA-lager.
