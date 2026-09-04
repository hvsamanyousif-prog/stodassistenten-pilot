# Stödassistenten – Pilot

Mobil pilot för att testa hypotesen: kan en person beskriva sin situation och få begripliga, källspårbara vägar till stöd utan att först känna till myndighetsspråk eller stödsystem?

## Pilot V0.5

- Svenska, arabiska och persiska
- Pensionär, familj/NPF, förening/litet företag och generell livssituation
- Generella flödet täcker bland annat a-kassa, arbetslöshet och deltid + sjukskrivning
- Officiella källänkar per konkret stödväg
- Automatisk anonym pilotfeedback via serverfunktion
- Feedback lagras i EU-baserad Supabase-databas i Stockholm-regionen
- Situationssvar om hälsa, ekonomi, barn och boende skickas inte till feedbackdatabasen
- Ingen API-nyckel eller service-role-nyckel ligger i webbläsaren eller publika repot

## Pilotprinciper

1. Appen säger inte att användaren har rätt till ett stöd – bara att det är relevant att kontrollera.
2. Villkor verifieras mot originalkällor.
3. Samla minsta möjliga mängd data under tidig pilot.
4. AI ska senare hjälpa med språk, intervju, dokumentförklaring och utkast, men inte ensam avgöra rätt till stöd.
5. GitHub är source of truth för produktbeslut och versionsarbete.

## Projektstyrning

- `docs/PRODUCT_VISION.md` – permanent produktminne
- `docs/PROJECT_OPERATING_SYSTEM.md` – arbetscykel och releaseprinciper
- `docs/EXPERT_REVIEW_COUNCIL.md` – seniora granskningsperspektiv
- `docs/90_DAY_EXECUTION_PLAN.md` – exekveringsplan

## Nästa steg

- Riktiga piloter med 10+ testomgångar
- Verifierat stöddataset för a-kassa, sjukskrivning och allvarlig sjukdom/cancer
- Enkel intern feedbackdashboard
- Separera språk, stöddata, matchningsregler och UI
- Privat backend och regelmotor efter validerad användarnytta