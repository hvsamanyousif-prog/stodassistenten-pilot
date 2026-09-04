# Stödassistenten – Senior expert review council

Detta är ett internt granskningsramverk. Det representerar expertperspektiv som varje större produktversion ska utsättas för. Det är inte ett påstående om att externa namngivna experter har godkänt produkten.

## 1. Svensk socialförsäkring och välfärdsrätt
Granska: om stöd presenteras korrekt, om villkor är källspårbara, om språk riskerar att lova rättighet, om lokala/nationella nivåer blandas ihop och om nästa steg är praktiskt korrekt.

## 2. Kommunal/offentlig verksamhet
Granska: om flödet passar verklig myndighetskontakt, minskar felriktade frågor, kan förbättra kompletta underlag och undviker att imitera myndighetsbeslut.

## 3. Dataskydd/GDPR
Granska: dataminimering, rättslig grund, känsliga personuppgifter, barnuppgifter, samtycke där relevant, lagringstid, åtkomst, DPIA-behov och tredjelandsöverföringar.

## 4. Cybersäkerhet
Granska: hemligheter, RLS/behörighet, server-side validering, rate limiting, loggning, incidenthantering, dependency-risk, public/private boundary och att klienten aldrig får administrativ åtkomst.

## 5. AI-arkitektur och modellrisk
Granska: hallucinationsrisk, separation mellan AI och verifierade regler, prompt/data leakage, modellval, kostnad, observability, evals och fallback när modellen är osäker.

## 6. Tillgänglighet och inkluderande design
Granska: äldre användare, kognitiva svårigheter, NPF, synnedsättning, motorik, lätt svenska, röst, uppläsning, kontrast, knappstorlek, RTL och språkbyte genom hela flödet.

## 7. Senior UX/product
Granska: om nyttan förstås inom 10–20 sekunder, om frågorna känns naturliga, om användaren vet vad som händer, om resultaten går att agera på och om appen kräver muntlig instruktion.

## 8. Klinisk/patientnära tjänstedesign
Granska endast produktnavigering och stödbehov – inte medicinsk rådgivning. Särskilt för cancer/allvarlig sjukdom: patient vs anhörig, behandling, arbete, ekonomi, resor, försäkring, rehabilitering, barn/familj och patientorganisationer.

## 9. Data/analytics
Granska: om vi mäter verklig nytta, inte vanity metrics. Kärnmått: ny information, relevant träff, irrelevant träff, begripligt nästa steg, completion rate, språk och förbättring mellan versioner.

## 10. Growth/distribution
Granska: problem-first positionering, partnerskap, rekommendationsbarhet, organisk spridning och att marknadsföring inte överdriver produktens säkerhet eller resultat.

## 11. Kommersiell strategi
Granska: vem som betalar, varför de betalar, CAC/LTV, B2C kontra B2B/B2G, prissättning, success-fee-risker och hur gratis B2C kan finansieras av professionella/organisationer/offentlig sektor.

## 12. Investerar-/styrelseperspektiv
Granska: tydlig wedge, marknad, defensibility, verifierad data, distribution, regulatorisk risk, unit economics, pilotbevis och varför detta kan bli infrastruktur snarare än en enkel bidragsapp.

# Release gates

En större version får inte betraktas som pilotredo förrän följande frågor är besvarade:

1. Sanning: Kan varje konkret stöd spåras till en aktuell originalkälla?
2. Säkerhet: Kan känslig data eller hemligheter läcka från klienten?
3. Integritet: Samlar vi mer data än vad pilotmålet kräver?
4. UX: Kan en ny användare förstå och slutföra utan muntlig guidning?
5. Tillgänglighet: Fungerar svenska, arabiska och persiska inklusive RTL?
6. Handling: Vet användaren vad nästa steg är efter resultatet?
7. Mätning: Kan vi se om versionen faktiskt gav mer nytta än föregående version?
8. AI: Om AI används, kan en felaktig modellutdata ensam orsaka ett felaktigt rättighetsbesked? Svaret ska vara nej.

# Arbetsregel

Vid större produktbeslut ska vi aktivt argumentera från minst tre relevanta expertperspektiv och dokumentera konflikter mellan användarvärde, precision, integritet, kostnad och skalbarhet.