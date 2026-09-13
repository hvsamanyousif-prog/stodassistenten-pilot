# Pilot coverage matrix

Syftet med denna matris är att göra Stödassistentens bredd mätbar utan att låtsas att allt redan är färdigt.

## Aktörstyper

- privatperson
- hushåll/familj
- anhörig som hjälper annan
- anställd
- företagare/småföretag
- förening/ideell organisation
- BRF/fastighetsaktör

## Högprioriterade situationsfamiljer

- pension/låg ekonomi
- arbete/a-kassa
- sjukskrivning/deltid
- funktionsnedsättning/NPF
- allvarlig sjukdom
- anhörigstöd
- barn/familj
- boende/energi/renovering
- tandvård
- försäkrings-/ersättningsspår
- anställningsförmåner
- mobilitet/fordon/laddning när verifierat stöd finns
- landsbygd/geografiskt riktade stöd
- företag/finansiering
- offentlig upphandling
- förening/idrott/kultur
- stiftelser/fonder
- kommunala/regionala lokala stöd

## Kvalitetsstatus per cell

Varje kombination av aktör × situation × geografi × stödtyp ska kunna märkas som:

- UNDISCOVERED
- SIGNAL_ONLY
- SOURCE_IDENTIFIED
- NEEDS_REVIEW
- VERIFIED_DATA
- MATCHING_TESTED
- PILOT_TESTED
- PRODUCTION_READY

`PRODUCTION_READY` får aldrig sättas enbart av en AI-modell.

## Pilotprincip

Bredden ska användas för att hitta vita fläckar och rekrytera relevanta testare, men varje pilotperson ska få en tydligt avgränsad situation. Exempel:

- äldre person med begränsad svenska → pension/ekonomi/språk/tillgänglighet
- person med funktionsnedsättning → rättigheter/stöd/dokument/next step
- städföretagare → finansiering/offentlig upphandling
- kommunal upphandlare → buyer-side Red Team på offentlig/historisk/syntetisk data
- föreningsledare → projekt-/anläggnings-/aktivitetsstöd
- landsbygdsboende → geografiskt riktade stöd och transport/energi där verifierat

Feedback ska generaliseras till lärsignaler, inte kopieras som identifierande fall till publikt repo.
