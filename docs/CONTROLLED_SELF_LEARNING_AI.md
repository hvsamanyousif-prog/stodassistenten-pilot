# Kontrollerat självlärande AI-system

## Grundprincip

Stödassistenten ska bli bättre för varje verifierbar lärsignal den får, men den får aldrig lära sig genom att göra osäkra fakta till sanning.

**Självlärande betyder här en styrd förbättringsloop, inte en AI som fritt skriver om regler, källor eller rättighetsbedömningar i produktion.**

North star:

`användning/signal → strukturerad observation → utvärdering → förslag → verifiering → regressionstest → säker release → mätning → ny lärdom`

Systemet ska använda AI långt framme i kedjan för förståelse, följdfrågor, prioritering, språk, dokumenttolkning, utkast, påminnelser och handlingsplanering. Sanningslagret ska fortsatt förankras i verifierade svenska regler och primärkällor.

## Två sorters lärande

### 1. Adaptivt lärande – kan förbättras snabbt

Exempel:
- vilken följdfråga som ger högst informationsvärde,
- hur en fråga formuleras tydligt på olika språk,
- vilka steg som skapar friktion,
- vilken ordning resultat presenteras i när samma faktiska kandidatset gäller,
- vilka påminnelser som hjälper användaren att slutföra en uppgift,
- vilka dokumentchecklistor som oftast är ofullständiga,
- vilka situationer användare beskriver med nya ord eller uttryck,
- var människor avbryter eller behöver mer förklaring.

Sådana förbättringar får föreslås automatiskt och testas offline/shadow, men ska fortfarande gå genom relevanta kvalitetsgrindar innan de påverkar användare.

### 2. Sanningsbärande lärande – måste verifieras

Exempel:
- vem som har rätt till ett stöd,
- belopp, åldersgränser och inkomstgränser,
- deadlines,
- geografiska regler,
- kollektivavtalsvillkor,
- myndighetsansvar,
- ansökningskanaler,
- lag- eller förordningsändringar,
- politiska satsningar som faktiskt blivit beslutade och genomförbara.

Här får AI **upptäcka, sammanställa och föreslå**, men inte själv markera en uppgift som produktionssanning. Primärkälla, versionsstatus och granskningsspår krävs.

## Förbjuden form av självlärande

Stödassistenten får inte:
- uppdatera eligibility-regler direkt från enskilda användares svar,
- anta att något är sant för att många användare klickar på det,
- skapa nya stöd, belopp eller rättigheter från modellens eget resonemang,
- låta modellutdata bli `VERIFIED` utan verifieringskedja,
- träna på känslig pilotdata utan uttryckligt ändamål, rättslig grund och säkerhetsdesign,
- skapa feedbackloopar där tidigare AI-svar används som faktakälla för framtida AI-svar,
- använda kommersiellt beteende för att påverka stödmatchningen.

## Organisationens lärloop

Hela projektorganisationen ska förstärka samma motor:

1. **BUILD** bygger ny förmåga.
2. **Knowledge & Verification** avgör vad som faktiskt är sant.
3. **Evaluation & Red Team** försöker falsifiera förbättringen.
4. **Pilot & Learning** samlar endast nödvändiga signaler om verklig användbarhet.
5. **Programledning** avgör prioritet och ser till att lärdomen blir permanent.

Ett allvarligt fel eller återkommande miss ska när möjligt bli minst en av:
- nytt regressionstest,
- förbättrad stödpost,
- ny källregel,
- bättre följdfråga,
- förbättrad språkresurs,
- säkrare guardrail,
- ändrad UX,
- dokumenterat beslut.

Därmed blir systemet kumulativt bättre i stället för att lösa samma problem igen.

## Personlig fickassistent

Den långsiktiga produkten ska kunna vara något användaren har "i fickan" och kommer ihåg när en livssituation förändras.

Med uttryckligt samtycke och dataminimering ska en framtida privat produkt kunna:
- komma ihåg relevanta, användarkontrollerade ärenden och deadlines,
- bevaka om ett tidigare relevant stöd ändras,
- uppmärksamma användaren på nya möjliga stöd som matchar en sparad situation,
- påminna om kompletteringar, förnyelser och överklagandefrister,
- hålla en dokumentchecklista,
- hjälpa till att färdigställa ansökningsunderlag,
- förklara beslut och nästa steg,
- göra säker handoff till officiell kanal,
- senare, där behörig integration och juridik tillåter, stödja inlämning efter uttryckligt användargodkännande.

Känsliga uppgifter ska inte sparas bara för att de "kan vara användbara". Minnes-/case-funktioner ska vara ändamålsstyrda, transparenta och användarkontrollerade.

## Politisk och samhällelig signalradar

Valdebatt, budgetförslag, regeringsbesked, reformer, nya statsbidrag, myndighetsuppdrag och andra politiska signaler kan ge tidiga tecken på framtida stöd eller ändrade rättigheter.

Detta ska användas som **signalintelligens**, inte som produktionssanning.

Föreslagen statuskedja:

`SIGNAL → PROPOSAL → BUDGETED/LEGISLATED → IMPLEMENTATION_CONFIRMED → OPEN/ACTIVE → CHANGED/CLOSED`

Regler:
- nyheter och politiska utspel får skapa bevakningsobjekt,
- officiell proposition, budget, förordning, myndighetsuppdrag eller annan primärkälla krävs för högre tillitsnivå,
- ett vallöfte får aldrig visas som en aktuell rättighet,
- användare ska kunna få relevanta notifieringar först när produkten tydligt kan förklara status och osäkerhet,
- change detection ska koppla nya beslut till redan berörda stödposter och evalfall.

Målet är att Stödassistenten ska upptäcka förändringar tidigt men vara senare och striktare med att kalla dem sanna.

## Självlärande matchning

Den privata matchningskärnan bör på sikt använda en kombination av:
- språkmodell för situationsförståelse,
- språkneutral strukturerad profil,
- verifierad retrieval över stöd och rättigheter,
- deterministiska/versionsstyrda regler där sådana finns,
- risk- och osäkerhetsmodell,
- information-gain för nästa fråga,
- ranking som kan förbättras offline från kvalitetssignaler,
- benchmark- och shadow-evals före release.

En förbättring av ranking eller frågeordning får inte ändra underliggande fakta. Om olika språk eller befolkningssegment får olika kandidatlogik för samma faktiska situation ska det behandlas som kvalitetsfel.

## Ansökningsintelligens

Stödassistenten ska inte stanna vid "du kanske kan söka detta". Den ska lära sig vilka steg som krävs för att hjälpa användaren hela vägen:

`situation → kandidat → saknade fakta → dokument → fullständighetskontroll → utkast → användargodkännande → officiell handoff/inlämning → status → påminnelse → beslut → nästa steg/överklagande`

Lärsignaler ska särskilt användas för att minska:
- missade stöd,
- onödiga frågor,
- felaktiga dokument,
- ofullständiga ansökningar,
- missade deadlines,
- otydliga nästa steg.

## Mätning

Självlärande får bara kallas förbättring när det syns i verifierade mått. Minst följande ska följas:
- support recall och precision,
- missed-support rate,
- unsafe/unverified claim rate,
- source grounding,
- question efficiency,
- next-step clarity/recall,
- ansökningsfullständighet i syntetiska/pilotfall,
- language parity,
- segment/population parity,
- source/change-detection latency,
- verklig pilotnytta och återkommande friktion.

Totalpoäng får inte dölja svaghet i ett kritiskt segment.

## Produktprincip

**Stödassistenten ska vara självlärande i förbättringen, men konservativ i sanningen.**

AI ska göra systemet snabbare på att förstå, upptäcka, prioritera, fråga, förklara och hjälpa. Verifieringskedjan ska hindra samma AI från att göra ett välformulerat påstående till ett falskt faktum.

Den långsiktiga konkurrensfördelen är därför inte bara modellen. Den är den ackumulerade kombinationen av verifierade källor, regler, ändringshistorik, evals, språkparitet, lärda frågemönster, pilotinsikter och dokument-/ärendeflöden.
