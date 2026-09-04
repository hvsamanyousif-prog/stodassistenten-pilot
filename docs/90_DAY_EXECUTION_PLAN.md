# Stödassistenten – 90 dagars exekveringsplan

Mål: gå från tidig mobilpilot till validerad produktgrund med verkliga användardata, verifierade stödspår och arkitektur redo för privat backend/AI.

## Fas 1 – Bevisa användarnytta (dag 1–21)

- Testa V0.5 med riktiga användare: pensionär, a-kassa, deltid + sjukskrivning, NPF/familj, svenska/arabiska/persiska.
- Få automatisk anonym feedback att fungera end-to-end.
- Mäta: ny information, relevans, irrelevans, begripligt nästa steg, completion.
- Korrigera startsida och frågeflöden efter observerade problem.
- Bygg första verifierade stöddatasetet för arbete/sjukskrivning/a-kassa och allvarlig sjukdom.
- Ingen central lagring av känsliga situationssvar i denna fas.

Exit-kriterium: minst 10 riktiga testomgångar och tydliga exempel där användare hittat relevant information de inte redan kände till.

## Fas 2 – Strukturera motorn (dag 22–45)

- Separera UI, språk, stöddata och matchningslogik.
- Inför strukturerat schema per stöd: källa, målgrupp, villkor, frågor som saknas, dokument, nästa steg, senast verifierad.
- Bygg livshändelsespår för cancer/allvarlig sjukdom + anhörig.
- Skapa enkel intern feedbackdashboard/statistik.
- Inför versions- och källstatus för stöd.
- Planera privat repo/backend för proprietär regelmotor.

Exit-kriterium: nya stöd/livshändelser kan läggas till utan att skriva om hela frontend.

## Fas 3 – Privat backend och kvalitetskontroll (dag 46–70)

- Flytta känslig/proprietär logik till privat backend.
- Definiera API-kontrakt: interview, match, feedback, sources, cases.
- Implementera regelmotor för hårda kriterier och missing-information-state.
- Inför audit trail för källor/regler.
- Gör säkerhets- och GDPR-design för framtida hälsa/ekonomi/barn-data.
- Utvärdera EU/EES/Sverige-hosting och DPIA-behov.

Exit-kriterium: frontend är tunn klient och kan inte ensam avgöra eller exponera kärnlogik.

## Fas 4 – AI där den ger verkligt värde (dag 71–90)

- Koppla OpenAI API först efter att serverarkitektur och datagränser är definierade.
- AI används för naturligt språk, intervju, översättning, sammanfattning och utkast.
- Verifierad regelmotor/källdata fortsätter styra stödmatchning.
- Bygg evals för hallucinationer, felaktiga rättighetslöften och språkfel.
- Testa röst + dokumentförklaring på 1–2 tydliga use cases.

Exit-kriterium: AI kan förbättra upplevelsen utan att ensam kunna skapa ett felaktigt myndighets-/rättighetsbesked.

# Parallella affärsspår

Under hela perioden:

- Intervjua 3–5 föreningar om bidragsbehov.
- Intervjua 3–5 småföretag om stöd/upphandling.
- Intervjua 2–3 professionella (t.ex. god man, kurator, arbetsterapeut/social rådgivare) om multi-case-behov.
- Dokumentera betalningsvilja och vilka arbetsmoment som faktiskt sparar tid.

# Beslut som inte ska tas för tidigt

- Ingen tung AI-infrastruktur innan pilotvärdet är bevisat.
- Ingen lagring av detaljerad hälsodata innan dataskyddsarkitekturen är klar.
- Ingen omfattande marketplace innan kärnmatchningen fungerar.
- Ingen stor kommunpitch innan vi kan visa pilotmått och användarresultat.

# Veckorytm

Varje vecka:
1. Samla pilotdata.
2. Identifiera största friktionen.
3. Verifiera relevanta regler/källor.
4. Släpp en liten förbättring.
5. Mät om den blev bättre.
6. Uppdatera GitHub roadmap och produktminne.