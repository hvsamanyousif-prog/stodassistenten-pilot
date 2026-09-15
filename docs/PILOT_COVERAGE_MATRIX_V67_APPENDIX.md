# Pilot coverage matrix — v67 append-only extension

Detta är en append-only utökning av samma kanoniska täckningssystem. Ingen separat student-sjuk-, gymnasie-, utlandsstudie-, VAB- eller arbetsmotor skapas.

| Publik aktör/situation | Ingång | Situationsförståelse | Sannings-/källgräns | Konkret nästa handling | Feedback | Regression |
| --- | --- | --- | --- | --- | --- | --- |
| Student: egen sjukdom under studier | Samma root-skal → `actor_type=student&focus=student_csn&topic=sickness` | Först studiesituation: studiestöd i Sverige, gymnasium i Sverige, utlandsstudier eller osäkert. Endast för studiestöd i Sverige kan arbete vid sidan av studierna bli en andra route-changing fråga. | Aktuell CSN + Försäkringskassan; ingen autonom eligibility, SGI, diagnos, sjukpenning, deadline eller intygstolkning | Välj aktuell primärkälla för studiesituationen; vid studier + arbete håll studiestödsfrågan och eventuell arbetsinkomstfråga isär | Samma anonyma `pilot-feedback`, endast `route=student_csn` + `topic=sickness`; inga medicinska/personliga fakta | v67-01–08 + befintlig student-CSN unit/CI |

Informationsvinst går före antal frågor. Om `study_context` eller `study_work` redan är explicit i den naturliga berättelsen får endast grov, icke-känslig kontext återanvändas i handoff; produkten ska inte fråga om samma sak igen. Om studiesituationen saknas frågas den först eftersom den kan ändra första myndighets-/processvägen. Arbete vid sidan av studierna frågas endast när det kan skapa ett separat arbetsrelaterat sjukspår.

VAB är en separat situation: formuleringar om att användarens barn är sjukt får inte omtolkas till att studenten själv är sjuk. Forsknings-, uppsats- och professionella formuleringar om sjuka studenter ska också fail-closed från den personliga sjukvägen.

Handoff får endast bära `actor_type=student`, `focus=student_csn`, språk, `topic=sickness` samt valfri grov `study_context=study_support_sweden|gymnasium_sweden|abroad` och `study_work=yes|no`. Diagnos, SGI, läkarintyg, arbetsgivare, exakt inkomst, identitet och rå berättelse är förbjudna i URL och strukturerad feedback.

Materiella regler om rätt, belopp, tidsfrister, sjukperiod, läkarintyg, SGI och arbetsgivaransvar ska verifieras mot aktuell primärkälla. Forum/sociala medier är discovery-signaler, aldrig sanningskällor. Feedback är lärsignal, aldrig sanningskälla.
