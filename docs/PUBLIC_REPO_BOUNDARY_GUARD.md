# Public repository boundary guard

Stödassistentens publika pilot ska vara möjlig att granska och testa utan att den framtida privata produktkärnan, hemligheter eller verkliga användardata råkar följa med i repot.

`python scripts/validate_public_repo_boundary.py .` är därför en fail-closed strukturell säkerhetsgrind. Den körs på varje push och pull request.

## Vad den stoppar

- kataloger som uttryckligen reserverats för privat/proprietär kärna (`private_core`, `proprietary`, `secrets`)
- vanliga secret-bearing filer som `.env`, privata SSH-identiteter och credential-filer
- PEM-liknande privata nycklar i textfiler
- högkonfidens-assignment av känsliga tjänstevariabler som `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` och `JWT_SECRET`

Exempel-/template-värden som `${OPENAI_API_KEY}`, `placeholder` och `.env.example` tillåts så att dokumentation kan vara reproducerbar utan verkliga hemligheter.

## Vad den inte försöker göra

Grinden klassificerar inte affärslogik, juridik eller data semantiskt. Den ersätter inte secret scanning hos GitHub, kodgranskning, DPIA eller privata repo-behörigheter. Den är ett extra deterministic guardrail mot de vanligaste och mest kostsamma misstagen när publik pilot och privat kärna börjar leva parallellt.

## Privat kärna

Privat matchning, ranking, regler, prompts, eval-resultat med proprietära signaler, känslig case-data och servicekonfiguration ska ligga utanför detta publika repo. Endast de minimala kontrakt som krävs för säker interoperabilitet får finnas här, exempelvis `config/api_boundary.json` och det syntetiska prediction-bridge-formatet.

När en verklig privat kärnmiljö etableras ska dess CI producera endast det minimala, syntetiska exportformat som det publika benchmarkharneset accepterar. Den publika sidan ska aldrig behöva känna till privata endpoints, tokens eller intern scoring.
