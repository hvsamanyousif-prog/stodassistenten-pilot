# Matching evals

Detta katalogträd ska innehålla syntetiska benchmarkfall för Stödassistentens framtida matchningsmotor.

Syftet är att mäta om systemet förstår situationen, ställer rätt följdfrågor, hittar relevanta stödvägar, undviker irrelevanta träffar och ger ett begripligt nästa steg utan att hallucinerar rättigheter.

## Fallformat

Varje eval-fall ska senare följa ett maskinläsbart schema med minst:

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

## Första segment

1. pension / låg ekonomi / boende
2. arbetslöshet / a-kassa
3. deltid + sjukskrivning
4. barn / NPF / funktionsnedsättning
5. cancer / allvarlig sjukdom
6. anhörig
7. språkbarriär
8. villa / energi
9. förening
10. företag / finansiering
11. offentlig upphandling

Alla fall i detta publika repo ska vara helt syntetiska och får inte innehålla verkliga personuppgifter eller känsliga användarberättelser från piloten.
