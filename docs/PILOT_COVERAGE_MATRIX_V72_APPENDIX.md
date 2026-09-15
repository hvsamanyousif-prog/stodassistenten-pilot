# Pilot coverage matrix v72 – append-only appendix

Detta är ett append-only-tillägg till den kanoniska `docs/PILOT_COVERAGE_MATRIX.md`. Det ersätter eller skriver inte om den befintliga matrisen.

## Anhörig / närstående – representation, fullmakt och ombud

- **Publik ingång:** samma situationsruta och samma `actor_type=relative`.
- **Samma intelligens:** samma `client/relative-care.js` och samma `focus=relative_care`; endast grovt `care_context=representation` tillkommer när representation faktiskt uttrycks.
- **Situationsförståelse:** skiljer egen anhörig-/omsorgssituation från frågan om att företräda en annan vuxen och fail-closed för tydligt professionella eller utbildningsmässiga formuleringar.
- **Informationsvinst:** ingen extra personfråga behövs för att ge den säkra första gränsen. Produkten ska först skilja relation från behörighet och be användaren verifiera faktisk organisation och fullmaktens/ombudsuppdragets omfattning.
- **Verifierade sanningskällor:** Förvaltningslagen 14–15 §§ för generell myndighetsombudsgräns; aktuell ansvarig myndighets egen ombuds-/fullmaktsprocess för den konkreta vägen; Försäkringskassans blankett 5607 för Försäkringskassans fullmaktsomfattning; 1177/Västra Götaland endast för den uttryckliga regionala vårdfullmaktsgränsen.
- **Konkret nästa handling:** identifiera vilken organisation och vilket ärende det gäller, kontrollera aktuell ombuds-/fullmaktsväg och att behörigheten omfattar just det ärendet innan användaren agerar för den andra personen.
- **Sanningsgräns:** släktskap är aldrig i sig bevis på behörighet; en generell fullmakt får inte beskrivas som universell; hjälp i vårdkontakter får inte likställas med rätt att fatta beslut eller samtycka till vårdåtgärder; regional vårdprocess får inte göras till nationell universell regel.
- **Integritet:** publik handoff bär endast språk, `actor_type`, `focus` och grovt `care_context`. Namn, personnummer, diagnos, fullmaktstext, exakt ärende och rå berättelse förs inte vidare.
- **Strukturerad anonym feedback:** befintligt gemensamt feedbackflöde används. Feedback är lärsignal, aldrig sanningskälla; rå känslig fritext förs inte in i publika evaldata.
- **Regressionsskydd:** sex v72-fall täcker relation ≠ automatisk behörighet, befintlig fullmakts omfattning, vårdkontakt ≠ samtycke/beslut, professionell falsk positiv samt arabisk och persisk språkparitet.

Den här utökningen skapar ingen separat anhörigapp, fullmaktsmotor eller juridisk beslutsmotor. Materiella regler och konkret behörighet ska fortsatt verifieras mot aktuell primärkälla för den faktiska organisationen.
