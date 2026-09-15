# Pilot coverage matrix — v65 append-only extension

Detta är en append-only utökning av samma kanoniska täckningssystem. Ingen separat transport-, äldre-, anhörig- eller funktionsnedsättningsapp skapas.

| Publik aktör/situation | Ingång | Situationsförståelse | Sannings-/källgräns | Konkret nästa handling | Feedback | Regression |
| --- | --- | --- | --- | --- | --- | --- |
| Person/anhörig: kan inte använda vanlig kollektivtrafik | Samma root-skal → `focus=mobility_transport` | Resans syfte: vård, vardag, längre privat resa eller flera/osäkert | 1177 + gällande SFS + aktuell lokal ansvarig aktör; ingen autonom eligibility | Vård → kontrollera regional sjukresa. Vardag → kontrollera lokal färdtjänstansökan. Längre privat → kontrollera riksfärdtjänst separat. | Samma anonyma `pilot-feedback`, endast route + grovt `trip_purpose` | v65-01–07 + dedikerad validator |

Trip purpose är informationsvinst, inte eligibility. Om syftet redan är explicit ska det återanvändas. Om flera syften finns frågar produkten vilken aktuell resa frågan gäller. `sjukresa`, `färdtjänst` och `riksfärdtjänst` får aldrig göras till synonymer.

Handoff får endast bära `focus=mobility_transport`, språk och valfri grov `trip_purpose=healthcare|daily|long_private|multiple`. Namn, personnummer, diagnos, exakt adress, exakt destination, vårdtid, resdatum, tillståndsnummer och rå berättelse är förbjudna i URL och strukturerad feedback.

Lokala avgifter, bokningsregler, intygskrav, deadlines, fordon, resekvoter och exakt ansvarig organisatorisk enhet varierar och ska verifieras mot aktuell primär/lokal källa. Forum/sociala medier är endast discovery-signaler.
