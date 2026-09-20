(function(root){
'use strict';
const APP_VERSION='procurement-expert-0.2.12';
const FEEDBACK_ENDPOINT='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
const CATEGORIES=['exclusion','qualification','mandatory','award','contract','commercial','deadline','uncertain'];
const LABELS={exclusion:'Uteslutningsgrund',qualification:'Kvalificeringskrav',mandatory:'Obligatoriskt/ska-krav',award:'Tilldelningskriterium',contract:'Avtals-/utförandevillkor',commercial:'Pris/kommersiellt',deadline:'Datum och process',uncertain:'Osäker – kontrollera källa'};
const SECTORS=[['construction','Bygg / entreprenad'],['cleaning','Städ / facility'],['consulting','Konsult / professionella tjänster'],['property','Fastighet / drift'],['other','Annan SME-kategori']];
const SCORE_DIMS=[
 ['category_match','Relevans för testfallet'],
 ['requirement_extraction','Hittade rätt krav'],
 ['requirement_classification','Kravklassificering'],
 ['evidence_checklist','Tydliga dokument och bevis'],
 ['followup_questions','Relevanta kontrollfrågor'],
 ['draft_fidelity','Svarsmallen följer underlaget'],
 ['deadline_process','Datum och process'],
 ['source_trace','Hänvisningar till rätt rad'],
 ['false_confidence','Tydlig osäkerhet']
];
const state={sector:null,requirements:[],scores:{},sending:false,feedbackSubmitted:false,feedbackEpoch:0,controller:null};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalized(line){return String(line||'').toLowerCase().replace(/\s+/g,' ').trim();}
function answerPublicationTiming(line){
 const t=normalized(line);
 const formalClarificationRequest=/\bbegäran om (?:kompletterande information|kompletterande upplysningar)\b/.test(t);
 const supplierActiveClarification=/\b(?:leverantören|leverantör|anbudsgivaren|anbudsgivare)\b.*\b(?:ska\s+)?lämna\b.*\b(?:kompletterande information|kompletterande upplysningar)\b/.test(t);
 return /\b(?:svar(?:en)?\s+p[åa]\s+frågor|svar\s+p[åa]\s+inkomna\s+frågor)\b.*\b(?:publiceras?|publicering|tillhandahålls?)\b/.test(t)
   || /\b(?:kompletterande information|kompletterande upplysningar)\b.*\b(?:publiceras?|tillhandahålls?)\b/.test(t)
   || (!formalClarificationRequest&&!supplierActiveClarification&&/\b(?:kompletterande information|kompletterande upplysningar)\b.*\b(?:ska\s+)?lämnas\b.*\b(?:senast|sista dag)\b/.test(t));
}
function clarificationSubmissionTiming(line){
 const t=normalized(line);
 return /^(?:frågor?|förtydliganden?)\b.*\b(?:senast|sista dag)\b/.test(t)
   || /\b(?:frågor?|förtydliganden?)\b.*\b(?:ska\s+)?(?:lämnas|ställas|inkomma|begäras)\b.*\b(?:senast|sista dag)\b/.test(t)
   || /\bbegäran om (?:kompletterande information|kompletterande upplysningar)\b.*\b(?:ska\s+)?(?:lämnas|ställas|inkomma)\b.*\b(?:senast|sista dag)\b/.test(t)
   || /\b(?:sista dag|senast)\b.*\b(?:frågor?|förtydliganden?)\b/.test(t);
}
function participationApplicationTiming(line){
 const t=normalized(line);
 const subject=/\b(?:anbudsansökan|ansökan om att få delta)\b/.test(t);
 const timing=/\b(?:senast|sista dag)\b/.test(t);
 const action=/\b(?:ska\s+)?(?:lämnas|inkomma)\b/.test(t)
   || /\bska\s+ha\s+kommit\s+in\b/.test(t)
   || /\b(?:ska\s+)?vara\b[^.]{0,40}\btillhanda\b/.test(t);
 return subject&&timing&&action;
}
function deadlinePurpose(line){
 const t=normalized(line);
 if(answerPublicationTiming(t))return 'answer_publication';
 if(clarificationSubmissionTiming(t))return 'clarification';
 if(participationApplicationTiming(t))return 'participation_application';
 if(/sista anbudsdag|anbud.*tillhanda|lämna.*anbud.*senast|anbud.*senast/.test(t))return 'bid';
 if(/giltighetstid för anbud|anbud.*giltig/.test(t))return 'validity';
 return 'other';
}
function semanticDeadlineSlice(line,purpose){
 const value=String(line||'');
 const lower=value.toLowerCase();
 const triggers=purpose==='answer_publication'
   ?['svar på frågor','svaren på frågor','svar på inkomna frågor','kompletterande information','kompletterande upplysningar']
   :purpose==='clarification'
     ?['sista dag för frågor','frågor om','förtydliganden','frågor']
     :purpose==='participation_application'
       ?['anbudsansökan','ansökan om att få delta']
       :purpose==='validity'
         ?['giltighetstid för anbud','anbudets giltighetstid','giltighetstid']
         :['sista anbudsdag','anbud ska vara','anbud ska','anbudet ska','lämna anbud','anbud'];
 for(const trigger of triggers){
   const index=lower.indexOf(trigger);
   if(index>=0)return value.slice(index);
 }
 return value;
}
function deadlineValueSlice(line,purpose){
 let scoped=semanticDeadlineSlice(line,purpose);
 if(purpose==='answer_publication'){
   const eventStart=scoped.toLowerCase().search(/\b(?:publiceras?|tillhandahålls?|ska\s+lämnas|lämnas)\b/);
   if(eventStart>=0)scoped=scoped.slice(eventStart);
 }
 // Cross-row comparison uses only the sentence that carries the identified
 // process deadline. Keep the full source row elsewhere for traceability.
 // The boundary deliberately requires a following letter so abbreviations such
 // as "kl. 23:59" stay inside the deadline expression.
 const boundary=scoped.search(/\.\s+(?=[A-Za-zÅÄÖåäö])/);
 return boundary>=0?scoped.slice(0,boundary+1):scoped;
}
const MONTH_NUMBERS={januari:1,februari:2,mars:3,april:4,maj:5,juni:6,juli:7,augusti:8,september:9,oktober:10,november:11,december:12};
function canonicalDateToken(year,month,day){
 const y=Number(year),m=Number(month),d=Number(day);
 if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||y<2000||y>2099||m<1||m>12||d<1||d>31)return null;
 const probe=new Date(Date.UTC(y,m-1,d));
 if(probe.getUTCFullYear()!==y||probe.getUTCMonth()!==m-1||probe.getUTCDate()!==d)return null;
 return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function partialDateToken(month,day){
 const m=Number(month),d=Number(day);
 if(!Number.isInteger(m)||!Number.isInteger(d)||m<1||m>12||d<1||d>31)return null;
 const probe=new Date(Date.UTC(2000,m-1,d));
 if(probe.getUTCMonth()!==m-1||probe.getUTCDate()!==d)return null;
 return `*-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function dateTokens(line){
 const t=normalized(line);
 const out=[];
 const add=token=>{if(token)out.push(token);};
 for(const m of t.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g))add(canonicalDateToken(m[1],m[2],m[3]));
 for(const m of t.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/g))add(canonicalDateToken(m[3],m[2],m[1]));
 for(const m of t.matchAll(/\b(\d{1,2})[/.](\d{1,2})(?![/.]\d)\b/g)){
   const prefix=t.slice(Math.max(0,m.index-16),m.index);
   if(/\b(?:version|punkt|bilaga|avsnitt|kapitel)\s*$/.test(prefix))continue;
   add(partialDateToken(m[2],m[1]));
 }
 for(const m of t.matchAll(/\b(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)(?:\s+(20\d{2}))?\b/g)){
   const month=MONTH_NUMBERS[m[2]];
   add(m[3]?canonicalDateToken(m[3],month,m[1]):partialDateToken(month,m[1]));
 }
 return [...new Set(out)];
}
function dateTokensConflict(tokens){
 const parsed=tokens.map(token=>{const parts=token.split('-');return {year:parts[0],month:parts[1],day:parts[2]};});
 const full=[...new Set(parsed.filter(p=>p.year!=='*').map(p=>`${p.year}-${p.month}-${p.day}`))];
 if(full.length>1)return true;
 return new Set(parsed.map(p=>`${p.month}-${p.day}`)).size>1;
}
function timeTokens(line){
 const t=normalized(line);
 const out=[];
 const add=(hourText,minuteText)=>{
   const hour=Number(hourText),minute=Number(minuteText);
   if(Number.isInteger(hour)&&Number.isInteger(minute)&&hour>=0&&hour<=23&&minute>=0&&minute<=59)out.push(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
 };
 for(const m of t.matchAll(/(?:\bklockan\b|\bkl\.?)\s*(\d{1,2})[:.](\d{2})\b/g))add(m[1],m[2]);
 for(const m of t.matchAll(/(?:^|[^\d])(\d{1,2}):(\d{2})(?!\d)/g))add(m[1],m[2]);
 return [...new Set(out)];
}
function classifyRequirement(line){
 const t=normalized(line);
 if(!t)return 'uncertain';
 if(answerPublicationTiming(t)||clarificationSubmissionTiming(t)||participationApplicationTiming(t)||/sista anbudsdag|deadline|anbud ska vara.*tillhanda|\banbud(?:et)?\b\s+ska\s+lämnas\s+senast|giltighetstid för anbud/.test(t))return 'deadline';
 if(/tilldelningskriter|utvärder|\bmervärde\b|poäng|bästa förhållandet|lägsta pris/.test(t))return 'award';
 if(/prisbilaga|anbudspris|timpris|fast pris|mängdförteckning|ersättning|indexreglering(?:sprincip)?|prisjustering(?:sprincip)?/.test(t))return 'commercial';
 if(/avtalstid|kontraktsvillkor|särskilda kontraktsvillkor|under avtalstiden|vite|utförandevillkor|leveransvillkor/.test(t))return 'contract';
 if(/uteslutningsgrund|uteslutas|brott enligt|obetalda skatter|socialförsäkringsavgifter/.test(t))return 'exclusion';
 if(/ekonomisk (och )?finansiell ställning|omsättning|referensuppdrag|teknisk och yrkesmässig kapacitet|kvalificeringskrav|anbudsgivaren ska ha|leverantören ska ha|åberopa.*kapacitet/.test(t))return 'qualification';
 if(/\bska\b|\bmåste\b|obligatorisk|skall|krävs|krav på/.test(t))return 'mandatory';
 return 'uncertain';
}
function evidenceQuestion(line,category){
 const t=normalized(line);
 if(/referens/.test(t))return 'Kan leverantören visa exakt det referensuppdrag/bevis som den publicerade formuleringen kräver?';
 if(/försäkring/.test(t))return 'Finns ett försäkringsbevis som matchar exakt omfattning och tidpunkt i underlaget?';
 if(/certifikat|certifier|behörig|behörighet|bas-p|bas-u/.test(t))return 'Kan den efterfrågade behörigheten/certifieringen styrkas på det sätt som underlaget anger?';
 if(/omsättning|ekonomisk|finansiell/.test(t))return 'Finns styrkbar ekonomisk evidens som uppfyller den publicerade nivån och perioden?';
 if(/underleverant|åberopa.*kapacitet/.test(t))return 'Om annan kapacitet används: vilka bevis/åtaganden kräver just detta underlag?';
 if(category==='deadline'){
   const purpose=deadlinePurpose(line);
   if(purpose==='clarification')return 'Är sista dag för frågor/förtydliganden kontrollerad mot senaste publicerade underlag och rättelser?';
   if(purpose==='answer_publication')return 'Är tidpunkten för publicering av svar kontrollerad mot originalkällan? Detta är inte samma sak som sista dag för frågor.';
   if(purpose==='participation_application')return 'Är tidsfristen för anbudsansökan/ansökan om att få delta, inklusive exakt klockslag när det anges, kontrollerad mot senaste publicerade originalkälla och rättelser? Detta är inte samma sak som sista anbudsdag.';
   if(purpose==='bid')return 'Är sista anbudsdag och exakt klockslag kontrollerade mot senaste publicerade underlag och rättelser?';
   if(purpose==='validity')return 'Är anbudets giltighetstid kontrollerad mot senaste publicerade underlag och rättelser?';
   return 'Är datum/tid/version kontrollerad mot senaste publicerade underlag och eventuella rättelser?';
 }
 if(category==='award')return 'Är detta något som poängsätts/utvärderas – och inte ett minimikrav? Kontrollera den publicerade modellen.';
 if(category==='contract')return 'Är detta ett villkor som ska accepteras/uppfyllas under kontraktet snarare än ett kvalificeringsbevis vid anbud?';
 if(category==='commercial')return 'Är prisformat, bilaga, valuta/enhet och eventuella reservationer hanterade exakt enligt instruktionen?';
 if(category==='exclusion')return 'Vilken deklaration eller vilket bevis efterfrågas och när ska det lämnas?';
 return 'Vilket konkret dokument, svar eller avsnitt visar att leverantören uppfyller just detta publicerade krav?';
}
function isStructuralHeading(line){
 const t=normalized(line).replace(/^\d+(?:\.\d+)*[.)]?\s+/,'').replace(/:$/,'').trim();
 return /^(obligatoriska krav|ska-krav|kvalificeringskrav|tilldelningskriterier|utvärderingskriterier|kommersiella villkor|kontraktsvillkor|administrativa föreskrifter|kravspecifikation|tekniska krav|tidplan|viktiga datum)$/.test(t);
}
function materialEvidenceObjectCount(line){
 const t=normalized(line);
 const certificatePair=t.match(/\b(?:ska|skall|måste)\s+(?:ha|inneha)\b[^.;]{0,160}\b(iso\s+\d{3,5}(?:-\d{4})?-certifikat)\b\s+(?:och|samt)\s+\b(iso\s+\d{3,5}(?:-\d{4})?-certifikat)\b/);
 const distinctCertificatePair=Boolean(certificatePair&&certificatePair[1]!==certificatePair[2]);
 const referencePair=t.match(/\b(?:ska|skall|måste)\s+(?:ha|inneha)\b[^.;]{0,120}\b(?:minst\s+)?(?:\d+|ett|en|två|tre|fyra)\s+referens(?:uppdrag|er)?\s+(?:inom|avseende|för)\s+([a-zåäö0-9][a-zåäö0-9 /-]{0,60}?)\s+(?:och|samt)\s+(?:minst\s+)?(?:\d+|ett|en|två|tre|fyra)\s+referens(?:uppdrag|er)?\s+(?:inom|avseende|för)\s+([a-zåäö0-9][a-zåäö0-9 /-]{0,60}?)(?=[.;]|$)/);
 const distinctReferencePair=Boolean(referencePair&&referencePair[1]!==referencePair[2]);
 const rolePattern='(?:arbetsledar(?:e|en|ens)|projektledar(?:e|en|ens)|uppdragsledar(?:e|en|ens)|nyckelperson(?:en|er|erna|ens)?|specialist(?:en|er|erna|ens)?)';
 const competencePattern='(?:erfarenhet|kompetens|utbildning|cv|meriter?)';
 const rolePairPattern=new RegExp(`\\b(?:ska|skall|måste|krävs)\\b[^.;]{0,180}\\b(${rolePattern})\\b[^.;]{0,80}?\\b${competencePattern}\\b[^.;]{0,80}\\b(?:och|samt)\\b[^.;]{0,80}\\b(${rolePattern})\\b[^.;]{0,80}?\\b${competencePattern}\\b`);
 const rolePair=t.match(rolePairPattern);
 const distinctNamedRoleCompetencePair=Boolean(rolePair&&rolePair[1]!==rolePair[2]);
 const families=[
   /\b(?:ansvarsförsäkring|försäkring)\b/,
   /\b(?:certifikat|certifier|behörig|behörighet|bas-p|bas-u)\b/,
   /\breferens(?:uppdrag|er)?\b/,
   /\b(?:omsättning|ekonomisk|finansiell)\b/,
   /\bunderleverant|\båberopa\b.*\bkapacitet\b/,
   /\b(?:ska|skall|måste|krävs)\b[^.;]{0,180}\b(?:arbetsledare|projektledare|uppdragsledare|nyckelperson(?:en|er|erna)?|specialist(?:en|er|erna)?)\b[^.;]{0,120}\b(?:erfarenhet|kompetens|utbildning|cv|meriter?)\b/,
   /\b(?:ska|skall|måste)\s+(?:ha|inneha|upprätthålla|tillämpa)\b[^.;]{0,180}\b(?:kvalitetsledningssystem|miljöledningssystem|ledningssystem)\b|\b(?:kvalitetsledningssystem|miljöledningssystem|ledningssystem)\b[^.;]{0,80}\bkrävs\b/,
   /\b(?:ska|skall|måste|krävs)\b[^.;]{0,180}\b(?:registrerad|registrering|inskriven|auktoriserad|godkänd)\b[^.;]{0,140}\b(?:aktiebolags|handels|förenings|yrkes|företags|bolags|närings)?register\b/,
   /\b(?:ska|skall|måste)\b[^.;]{0,220}\b(?:förfoga över|ha tillgång till)\b[^.;]{0,140}\b(?:verktyg(?:en)?|maskin(?:er|erna)?|teknisk(?:a)?\s+(?:resurser|utrustning(?:en)?))\b/,
   /\bunder avtalstiden\b[^.;]{0,160}\b(?:ska|skall|måste|kunna)\b[^.;]{0,120}\b(?:inställa sig|inställelsetid|svarstid|responstid|påbörja|åtgärda)\b/,
   /\b(?:ska|skall|måste)\b[^.;]{0,220}\bunder avtalstiden\b[^.;]{0,120}\b(?:följa|upprätta|tillämpa|efterleva)\b[^.;]{0,100}\b(?:arbetsmiljöplan(?:en)?|arbetsmiljökrav(?:en)?|arbetsmiljöregler(?:na)?|säkerhetsföreskrifter(?:na)?)\b/,
   /\b(?:ska|skall|måste)\b[^.;]{0,220}\b(?:ange|anges|lämna|redovisa)\b[^.;]{0,120}\b(?:fast pris|timpris|anbudspris|prisbilaga)\b/
 ];
 return families.filter(pattern=>pattern.test(t)).length+(distinctCertificatePair?1:0)+(distinctReferencePair?1:0)+(distinctNamedRoleCompetencePair?1:0);
}
function materialClauseCount(line){
 const raw=String(line||'').trim();
 if(!raw)return 0;
 // Keep the physical source row intact, but treat semicolons as bounded clause
 // separators when deciding whether one evidence control would cover multiple
 // materially different objects. This is detection only, not document splitting.
 const clauses=raw.split(/(?:(?<=[.!?])\s+(?=[A-ZÅÄÖ0-9])|;\s*)/).map(part=>normalized(part)).filter(Boolean);
 const material=/\b(?:ska|skall|måste|krävs)\b|\bobligatorisk\b|sista anbudsdag|anbud.*tillhanda|frågor?.*(?:senast|sista dag)|giltighetstid för anbud|tilldelningskriter|utvärder|\bmervärde\b|\bpoäng\b|anbudspris|prisbilaga|timpris|fast pris|referensuppdrag|ansvarsförsäkring|certifikat|behörighet/;
 let count=clauses.filter(clause=>material.test(clause)).length;
 if(count<2){
   const normativeHits=[...normalized(raw).matchAll(/\b(?:ska|skall|måste|krävs)\b/g)].length;
   if(normativeHits>=2)count=normativeHits;
 }
 if(count<2){
   const evidenceObjects=materialEvidenceObjectCount(raw);
   if(evidenceObjects>=2)count=evidenceObjects;
 }
 return count;
}
function structureFlags(line){
 const raw=String(line||'');
 const t=normalized(raw);
 const flags=[];
 if(raw.length>600)flags.push({code:'long_paragraph',label:'Långt stycke – kan innehålla flera krav. Dela upp manuellt eller kontrollera raden extra.'});
 if(materialClauseCount(raw)>=2)flags.push({code:'multi_requirement_line',label:'Flera materiella krav kan ligga på samma källrad – ett enda evidensval verifierar inte alla. Dela upp eller kontrollera varje självständigt krav mot originalunderlaget.'});
 if(/\bbilaga\b|\bappendix\b|\bannex\b/.test(t))flags.push({code:'attachment_reference',label:'Bilagehänvisning – bilagans innehåll är inte analyserat här.'});
 if(/\b(men|dock|förutsatt att|om inte|undantag|alternativt|i förekommande fall|gäller inte om|endast om|såvida inte|under förutsättning att|med undantag för|utom när|förutom)\b/.test(t)||/\bantingen\b.*\beller\b/.test(t))flags.push({code:'conditional_or_exception',label:'Villkor eller undantag i samma rad – kontrollera manuellt vad som faktiskt gäller.'});
 if(/\b(?:se|enligt|jfr|jämför med)\s+(?:punkt|avsnitt|kapitel)\s+\d+(?:[.:]\d+)*\b/.test(t))flags.push({code:'cross_reference',label:'Korshänvisning – kontrollera den hänvisade punkten i originalunderlaget; den är inte hämtad eller verifierad här.'});
 const purpose=deadlinePurpose(raw);
 if(purpose==='answer_publication')flags.push({code:'answer_publication_timing',label:'Tid för publicering av svar – en annan processhändelse än sista dag för frågor. Kontrollera originalkällan och senaste publicerade rättelser.'});
 if(purpose==='participation_application')flags.push({code:'participation_application_timing',label:'Tidsfrist för anbudsansökan/ansökan om att få delta – en separat processhändelse från sista anbudsdag. Kontrollera originalkällan och senaste publicerade rättelser.'});
 if(purpose!=='other'){
   const deadlineSlice=semanticDeadlineSlice(raw,purpose);
   const changeText=normalized(deadlineSlice);
   const explicitChange=/(?:ändras?|ändrad|flyttas?|flyttad|förlängs?|förlängd).*?\bfrån\b.*?\btill\b/.test(changeText);
   const changedValue=dateTokensConflict(dateTokens(deadlineSlice))||timeTokens(deadlineSlice).length>1;
   if(explicitChange&&changedValue){
     const label=purpose==='bid'
       ?'Ändrad anbudsdeadline på samma källrad – verifiera senaste publicerade rättelse/version innan uppgiften används.'
       :purpose==='clarification'
         ?'Ändrad tidsgräns för frågor/förtydliganden på samma källrad – verifiera senaste publicerade rättelse/version.'
         :purpose==='participation_application'
           ?'Ändrad tidsfrist för anbudsansökan/ansökan om att få delta på samma källrad – verifiera senaste publicerade rättelse/version.'
           :'Ändrad deadline på samma källrad – verifiera senaste publicerade underlag/version.';
     flags.push({code:'deadline_change_same_row',label});
   }
 }
 const awardSignal=/tilldelningskriter|utvärder|\bmervärde\b|poäng|bästa förhållandet|lägsta pris/.test(t);
 const minimumSignal=/\bska\b|\bmåste\b|\bskall\b|obligatorisk|krävs|krav på|anbudsgivaren ska ha|leverantören ska ha/.test(t);
 if(awardSignal&&minimumSignal)flags.push({code:'mixed_requirement',label:'Blandat minimi-/utvärderingskrav i samma rad – kontrollera båda betydelserna i originalunderlaget.'});
 return flags;
}
function addFlag(row,code,label){
 if(!row.flags)row.flags=[];
 if(!row.flags.some(f=>f.code===code))row.flags.push({code,label});
}
function lotScope(line){
 const match=normalized(line).match(/\b(?:delområde|anbudsområde)\s+([a-zåäö0-9]+)\b/);
 return match?`named:${match[1]}`:'unscoped';
}
function commercialScope(line){return lotScope(line);}
function commercialValueSignature(line){
 const t=normalized(line);
 const mode=[/fast pris/.test(t)?'fixed':'',/timpris/.test(t)?'hourly':''].filter(Boolean).join('+');
 const appendix=(t.match(/\bbilaga\s*\d+\b/)||[''])[0];
 const amounts=[];
 const currencyAliases={kr:'sek',sek:'sek',kronor:'sek',eur:'eur',euro:'eur',usd:'usd',gbp:'gbp',nok:'nok',dkk:'dkk',chf:'chf'};
 const addAmount=(whole,fraction,currency)=>{
   const normalizedWhole=whole.replace(/[ .]/g,'');
   const canonicalCurrency=currencyAliases[currency]||currency;
   amounts.push(`${normalizedWhole}${fraction?','+fraction:''}:${canonicalCurrency}`);
 };
 // Currency is deliberately bounded to explicit supported markers. Naked numbers
 // and arbitrary three-letter words are never promoted to monetary values.
 for(const m of t.matchAll(/\b(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.](\d{1,2}))?\s*(kr|sek|kronor|eur|euro|usd|gbp|nok|dkk|chf)\b/g))addAmount(m[1],m[2],m[3]);
 for(const m of t.matchAll(/\b(kr|sek|kronor|eur|euro|usd|gbp|nok|dkk|chf)\s*(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.](\d{1,2}))?\b/g))addAmount(m[2],m[3],m[1]);
 const indexPercentages=[];
 for(const m of t.matchAll(/\b(?:indexreglering(?:sprincip)?|prisjustering(?:sprincip)?)\b[^.;:]{0,80}?(\d+(?:[,.]\d+)?)\s*%/g)){
   indexPercentages.push(m[1].replace('.',','));
 }
 return [mode,appendix,[...new Set(amounts)].join(','),[...new Set(indexPercentages)].join(',')].join('|');
}
function applyCrossRowFlags(rows){
 const actionable=rows.filter(r=>r.kind!=='structural');
 const deadlineGroups={};
 actionable.filter(r=>r.category==='deadline').forEach(r=>{
   const purpose=r.processSubtype||deadlinePurpose(r.text);
   if(!deadlineGroups[purpose])deadlineGroups[purpose]=[];
   deadlineGroups[purpose].push(r);
 });
 for(const [purpose,group] of Object.entries(deadlineGroups)){
   if(purpose==='other'||group.length<2)continue;
   const withScope=group.map(row=>({row,scope:lotScope(row.text)}));
   const namedScopes=new Set(withScope.filter(item=>item.scope!=='unscoped').map(item=>item.scope));
   const hasUnscoped=withScope.some(item=>item.scope==='unscoped');
   if(namedScopes.size&&hasUnscoped){
     withScope.filter(item=>item.scope==='unscoped').forEach(({row})=>addFlag(row,'deadline_scope_uncertain','Oklart delområdesscope för deadline – raden saknar delområde medan andra deadline-rader anger delområde. Jämför inte raderna som samma version; kontrollera originalkällan/rättelsen.'));
   }
   const scopeGroups={};
   withScope.forEach(item=>{
     if(item.scope==='unscoped'&&namedScopes.size)return;
     if(!scopeGroups[item.scope])scopeGroups[item.scope]=[];
     scopeGroups[item.scope].push(item.row);
   });
   for(const scopedGroup of Object.values(scopeGroups)){
     if(scopedGroup.length<2)continue;
     const scoped=scopedGroup.map(r=>deadlineValueSlice(r.text,purpose));
     const dates=[...new Set(scoped.flatMap(value=>dateTokens(value)))];
     const timedRows=scoped.map(value=>timeTokens(value)).filter(tokens=>tokens.length>0);
     const times=[...new Set(timedRows.flat())];
     const dateConflict=dateTokensConflict(dates);
     const timeConflict=timedRows.length>1&&times.length>1;
     if(dateConflict||timeConflict){
       const label=purpose==='bid'
         ?'Motstridiga anbudsdatum eller klockslag i underlaget – verifiera senaste publicerade rättelse/version innan uppgiften används.'
         :purpose==='clarification'
           ?'Motstridiga datum eller klockslag för frågor/förtydliganden – verifiera senaste publicerade rättelse/version.'
           :purpose==='answer_publication'
             ?'Motstridiga datum eller klockslag för publicering av svar – verifiera senaste publicerade rättelse/version.'
             :purpose==='participation_application'
               ?'Motstridiga datum eller klockslag för anbudsansökan/ansökan om att få delta – verifiera senaste publicerade rättelse/version.'
               :'Motstridiga datum, klockslag eller versioner – kontrollera senaste publicerade underlag.';
       scopedGroup.forEach(r=>addFlag(r,'deadline_version_conflict',label));
     }
   }
 }
 const pricedVersions=actionable.filter(r=>r.category==='commercial'&&/\b(version|rättelse|ersätter)\b/.test(normalized(r.text)));
 const commercialGroups={};
 pricedVersions.forEach(row=>{
   const scope=commercialScope(row.text);
   if(!commercialGroups[scope])commercialGroups[scope]=[];
   commercialGroups[scope].push(row);
 });
 for(const group of Object.values(commercialGroups)){
   if(group.length<2)continue;
   const signatures=[...new Set(group.map(r=>commercialValueSignature(r.text)))];
   if(signatures.length>1)group.forEach(r=>addFlag(r,'commercial_version_conflict','Motstridiga prisversioner, belopp eller bilagehänvisningar inom samma delområde – välj inte version automatiskt; kontrollera senaste publicerade rättelse/originalkälla.'));
 }
 return rows;
}
function recomputeDerivedFlags(rows){
 rows.forEach(r=>{
   if(r.kind==='structural'){
     r.flags=[];
     r.processSubtype=null;
     return;
   }
   r.flags=structureFlags(r.text);
   r.processSubtype=r.category==='deadline'?deadlinePurpose(r.text):null;
 });
 return applyCrossRowFlags(rows);
}
// This is a bounded, local first-pass sorter, not complete document analysis.
function splitRequirements(text){
 const source=String(text||'');
 if(source.length>100000)throw new RangeError('Underlaget är för långt. Klistra in högst 100 000 tecken åt gången. Ingen analys har gjorts.');
 const lines=source.split(/\r\n|\r|\n/).map((text,i)=>({text:text.trim(),sourceLine:i+1})).filter(r=>r.text.length>0);
 if(lines.length>400)throw new RangeError('Underlaget innehåller för många rader. Gränsen är 400 icke-tomma rader per analys. Ingen text har kapats och ingen analys har gjorts.');
 const rows=lines.map((r,i)=>{
   const kind=isStructuralHeading(r.text)?'structural':'requirement';
   const category=kind==='structural'?'uncertain':classifyRequirement(r.text);
   const processSubtype=category==='deadline'?deadlinePurpose(r.text):null;
   return {id:i+1,text:r.text,sourceLine:r.sourceLine,kind,category,processSubtype,evidence:kind==='structural'?'context':'unknown',question:kind==='structural'?'Bevarad källrubrik – ingen evidensbedömning görs på rubriken.':evidenceQuestion(r.text,category),flags:kind==='structural'?[]:structureFlags(r.text)};
 });
 return applyCrossRowFlags(rows);
}
function summarize(reqs){
 const actionable=reqs.filter(r=>r.kind!=='structural');
 const counts={};CATEGORIES.forEach(c=>counts[c]=0);actionable.forEach(r=>counts[r.category]=(counts[r.category]||0)+1);
 const blocking=actionable.filter(r=>r.evidence==='missing');
 const uncertain=actionable.filter(r=>r.category==='uncertain'||r.evidence!=='yes'||(r.flags||[]).length>0);
 let decision='Kontrollera raderna mot hela upphandlingsunderlaget';
 let tone='notice';
 if(blocking.length){decision='Underlag saknas för en eller flera rader – kontrollera luckorna';tone='warn';}
 else if(actionable.length && !uncertain.length){decision='Raderna är genomgångna av dig – hela anbudet är inte verifierat';}
 else if(!actionable.length&&reqs.length){decision='Endast struktur/rubriker identifierades – kontrollera originalunderlaget innan du bedömer krav';}
 return {counts,blocking,uncertain,decision,tone,actionableCount:actionable.length,structuralCount:reqs.length-actionable.length};
}
function prioritizeReviewRows(reqs){
 const priority=reqs.filter(r=>r.kind!=='structural'&&(r.evidence!=='yes'||r.category==='uncertain'||(r.flags||[]).length>0));
 return priority.map((row,index)=>{
   let rank=2;
   if(row.evidence==='missing')rank=0;
   else if(row.category==='uncertain'||(row.flags||[]).length>0)rank=1;
   return {row,index,rank};
 }).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(item=>item.row);
}
function buildFeedbackPayload(found,useful,clear,ratings){
 if([found,useful,clear].some(v=>typeof v!=='boolean'))throw new TypeError('Tre ja/nej-svar behövs.');
 const safe={};
 const allowed=new Set(SCORE_DIMS.map(([key])=>key));
 if(!ratings||typeof ratings!=='object'||Array.isArray(ratings))throw new TypeError('Betyg saknas.');
 for(const [key,value] of Object.entries(ratings)){
   if(!allowed.has(key)||!Number.isInteger(value)||value<1||value>5)throw new TypeError('Ogiltigt betyg.');
   safe[key]=value;
 }
 return {app_version:APP_VERSION,language:'sv',flow:'procurement_expert_review',learned_new:found,useful:useful,next_step_clear:clear,ratings:safe};
}
function draftSkeleton(reqs){
 if(!reqs.length)return 'Ingen kravtext analyserad ännu.';
 return reqs.map(r=>{
   const src=`Källa rad ${r.sourceLine??r.id}`;
   if(r.kind==='structural')return `${src} • Källrubrik / struktur\n${r.text}\nIngen evidensbedömning görs på rubriken.\n`;
   const risk=(r.flags||[]).length?`\nKontroll: ${(r.flags||[]).map(f=>f.label).join(' ')}`:'';
   if(r.evidence==='missing')return `${src} • ${LABELS[r.category]}\nKravtext: ${r.text}${risk}\nSTOPP: saknat styrkbart bevis. Kontrollera vilket svar eller underlag som faktiskt krävs. Ingen slutsats om godkänt anbud kan dras.\n`;
   const ev=r.evidence==='yes'?'[ange exakt dokument/bevis och avsnitt]':r.evidence==='na'?'[ej tillämpligt – motivera mot underlaget]':'[verifiera vilket bevis/svar som krävs]';
   return `${src} • ${LABELS[r.category]}\nKrav: ${r.text}${risk}\nSvar: [beskriv endast verifierbart hur kravet hanteras]\nBevis: ${ev}\n`;
 }).join('\n');
}
function sampleConstruction(){return [
'3.1 Kvalificering: Leverantören ska ha genomfört minst två referensuppdrag av liknande art under de senaste fem åren.',
'3.2 Leverantören ska ha en årlig omsättning om minst 8 000 000 SEK enligt senast fastställda årsredovisning.',
'4.1 Anbudsgivaren ska inneha ansvarsförsäkring med den omfattning som anges i bilaga 2.',
'4.2 Arbetsledare som anges i anbudet ska kunna styrka den kompetens som anges i kravspecifikationen.',
'5.3 Om underentreprenör åberopas ska efterfrågade åtaganden och bevis lämnas enligt bilaga 4.',
'6.1 Tilldelning sker enligt bästa förhållandet mellan pris och kvalitet. Kvalitet utvärderas enligt poängmodellen i bilaga 5.',
'7.2 Under avtalstiden gäller de arbetsmiljö- och rapporteringsvillkor som anges i kontraktsbilagan.',
'8.1 Samtliga priser ska anges i prisbilaga 6 utan egna alternativa prisformat.',
'9.1 Sista anbudsdag är 2026-10-30 klockan 23:59.'
].join('\n');}
function scoreOptions(){return '<option value="">Välj</option><option value="na">Ej bedömt</option><option value="5">5 – korrekt/starkt</option><option value="4">4 – mindre brist</option><option value="3">3 – blandat</option><option value="2">2 – tydlig brist</option><option value="1">1 – fel/riskabelt</option>';}
function browserInit(){
 const $=id=>document.getElementById(id);
 const show=id=>$(id).classList.remove('hidden');
 const sectorGrid=$('sectorGrid');
 const sourceError=document.createElement('p');sourceError.id='sourceError';sourceError.setAttribute('role','alert');
 $('sourceText').after(sourceError);$('sourceText').setAttribute('aria-describedby','sourceError');
 function resetFeedback(){
   state.feedbackEpoch++;if(state.controller)state.controller.abort();state.controller=null;state.sending=false;state.feedbackSubmitted=false;state.scores={};
   document.querySelectorAll('[data-score]').forEach(el=>el.value='');
   ['foundIssue','useful','clearNext'].forEach(id=>$(id).value='');
   $('feedbackStatus').textContent='';$('feedbackStatus').className='';$('sendFeedback').disabled=false;
   if($('advancedFeedback'))$('advancedFeedback').open=false;
 }
 function invalidateAnalysis(){
   state.requirements=[];resetFeedback();$('analysisCard').classList.add('hidden');$('feedbackCard').classList.add('hidden');
   $('summary').textContent='';$('priorityOverview').textContent='';$('requirements').textContent='';$('draft').textContent='';
   if($('reviewDetails'))$('reviewDetails').open=false;
 }
 $('sourceText').addEventListener('input',()=>{invalidateAnalysis();sourceError.textContent='';$('sourceText').removeAttribute('aria-invalid');});
 function renderSectors(){
   sectorGrid.innerHTML=SECTORS.map(([v,l])=>`<button class="choice ${state.sector===v?'active':''}" aria-pressed="${state.sector===v}" data-sector="${v}">${l}</button>`).join('');
   sectorGrid.querySelectorAll('[data-sector]').forEach(b=>b.onclick=()=>{state.sector=b.dataset.sector;sectorGrid.querySelectorAll('[data-sector]').forEach(el=>{el.classList.toggle('active',el.dataset.sector===state.sector);el.setAttribute('aria-pressed',String(el.dataset.sector===state.sector));});});
 }
 function renderPriorityOverview(s){
   const priority=prioritizeReviewRows(state.requirements);
   const top=priority.slice(0,3);
   const explicitRisk=priority.some(r=>r.evidence==='missing'||r.category==='uncertain'||(r.flags||[]).length>0);
   let intro='Alla kravrader är genomgångna av dig. Kontrollera ändå helheten mot originalunderlaget.';
   if(s.blocking.length)intro='Börja med de rader där underlag saknas innan du går vidare.';
   else if(explicitRisk)intro='Börja med de markerade riskerna och kontrollera dem mot originalunderlaget.';
   else if(priority.length)intro='Börja med nästa ej bedömda kravrad och kontrollera den mot originalunderlaget.';
   const items=top.map(r=>{
     const rowRisk=(r.flags||[]).map(f=>f.label).join(' ');
     const reason=r.evidence==='missing'?'Saknat underlag':rowRisk||(r.category==='uncertain'?'Oklar kravtyp':'Ej bedömd – kontrollera raden');
     return `<li><strong>Källa rad ${r.sourceLine??r.id}:</strong> ${esc(reason)}</li>`;
   }).join('');
   const more=priority.length>top.length?`<p class="micro">Ytterligare ${priority.length-top.length} rader finns i full granskning.</p>`:'';
   $('priorityOverview').innerHTML=`<div class="priority-box"><h3>Nästa kontroll</h3><p>${esc(intro)}</p>${items?`<ul>${items}</ul>`:''}${more}</div>`;
   $('reviewSummary').textContent=`Full kravgranskning (${s.actionableCount} kravrader${s.structuralCount?` + ${s.structuralCount} källrubriker`:''})`;
   $('openReviewBtn').textContent=s.blocking.length?'Granska saknade underlag':explicitRisk?'Granska risker och krav':priority.length?'Granska nästa krav':'Öppna full kravgranskning';
 }
 function renderRequirements(){
   const active=document.activeElement;
   const focusAttr=active?.hasAttribute('data-ev')?'data-ev':active?.hasAttribute('data-cat')?'data-cat':null;
   const focusId=focusAttr?active.getAttribute(focusAttr):null;
   const s=summarize(state.requirements);
   $('summary').innerHTML=`<div class="${s.tone}"><b>${esc(s.decision)}</b><br><span class="muted">${s.actionableCount} kravrader analyserade${s.structuralCount?` • ${s.structuralCount} källrubriker bevarade`:''} • ${s.blocking.length} rader med saknat underlag • ${s.uncertain.length} osäkra/ej bedömda</span></div>`;
   renderPriorityOverview(s);
   $('requirements').innerHTML=state.requirements.map(r=>{
     if(r.kind==='structural')return `<article class="req structural-context"><div class="reqhead"><span class="tag">Källrubrik / struktur</span><span class="source">Källa rad ${r.sourceLine??r.id}</span></div><p>${esc(r.text)}</p><p class="muted">Bevarad för källposition. Ingen krav- eller evidensbedömning görs på rubriken.</p></article>`;
     return `<article class="req"><div class="reqhead"><span class="tag">${esc(LABELS[r.category])}</span><span class="source">Källa rad ${r.sourceLine??r.id}</span></div><p>${esc(r.text)}</p>${(r.flags||[]).map(f=>`<p class="micro row-alert"><strong>Kontroll:</strong> ${esc(f.label)}</p>`).join('')}<p class="muted"><b>Kontrollfråga:</b> ${esc(r.question)}</p><div class="grid"><label>Kravtyp<select data-cat="${r.id}">${CATEGORIES.map(c=>`<option value="${c}" ${c===r.category?'selected':''}>${esc(LABELS[c])}</option>`).join('')}</select></label><label>Leverantörens evidens<select data-ev="${r.id}"><option value="unknown" ${r.evidence==='unknown'?'selected':''}>Ej bedömd</option><option value="yes" ${r.evidence==='yes'?'selected':''}>Markerad som styrkt – ej verifierad</option><option value="missing" ${r.evidence==='missing'?'selected':''}>Saknas</option><option value="na" ${r.evidence==='na'?'selected':''}>Ej tillämpligt</option></select></label></div></article>`;
   }).join('');
   $('requirements').querySelectorAll('[data-cat]').forEach(el=>el.onchange=()=>{const r=state.requirements.find(x=>x.id===Number(el.dataset.cat));r.category=el.value;r.question=evidenceQuestion(r.text,r.category);recomputeDerivedFlags(state.requirements);renderRequirements();});
   $('requirements').querySelectorAll('[data-ev]').forEach(el=>el.onchange=()=>{const r=state.requirements.find(x=>x.id===Number(el.dataset.ev));r.evidence=el.value;renderRequirements();});
   $('draft').textContent=draftSkeleton(state.requirements);
   if(focusAttr&&focusId){const target=$('requirements').querySelector('['+focusAttr+'="'+focusId+'"]');if(target)target.focus({preventScroll:true});}
 }
 function analyze(){
   const text=$('sourceText').value;invalidateAnalysis();sourceError.textContent='';$('sourceText').removeAttribute('aria-invalid');
   try{
     if(!text.trim())throw new Error('Klistra in ett underlag eller välj byggfallet.');
     state.requirements=splitRequirements(text);
     show('analysisCard');show('feedbackCard');renderRequirements();
     $('reviewDetails').open=false;$('advancedFeedback').open=false;
     const heading=$('analysisCard').querySelector('h2');heading.setAttribute('tabindex','-1');heading.focus();
   }catch(e){sourceError.textContent=e.message;$('sourceText').setAttribute('aria-invalid','true');$('sourceText').focus();}
 }
 function loadSample(){show('profileCard');show('sourceCard');state.sector='construction';renderSectors();$('sourceText').value=sampleConstruction();$('sourceUrl').value='synthetic://construction-red-team-v1';analyze();}
 function resetCase(){
   $('sourceText').value='';$('sourceUrl').value='';state.sector=null;invalidateAnalysis();renderSectors();
   sourceError.textContent='';$('sourceText').removeAttribute('aria-invalid');show('profileCard');show('sourceCard');$('sourceText').focus();
 }
 $('startBtn').onclick=resetCase;
 $('sampleBtn').onclick=loadSample;$('analyzeBtn').onclick=analyze;
 $('clearBtn').onclick=resetCase;
 $('editSourceBtn').onclick=()=>{$('sourceText').focus();};
 $('restartBtn').onclick=resetCase;
 $('openReviewBtn').onclick=()=>{$('reviewDetails').open=true;$('reviewSummary').focus();};
 $('scoreRows').innerHTML=SCORE_DIMS.map(([k,l])=>`<div class="score"><label for="score-${k}">${l}</label><select class="field" id="score-${k}" data-score="${k}">${scoreOptions()}</select></div>`).join('');
 $('scoreRows').querySelectorAll('[data-score]').forEach(el=>el.onchange=()=>{const v=Number(el.value);if(Number.isInteger(v)&&v>=1&&v<=5)state.scores[el.dataset.score]=v;else delete state.scores[el.dataset.score];});
 async function sendFeedback(){
   if(state.sending||state.feedbackSubmitted)return;
   const status=$('feedbackStatus');const found=$('foundIssue').value,useful=$('useful').value,clear=$('clearNext').value;
   let payload;
   try{
     if(![found,useful,clear].every(v=>v==='yes'||v==='no'))throw new Error('Svara på de tre ja/nej-frågorna.');
     payload=buildFeedbackPayload(found==='yes',useful==='yes',clear==='yes',state.scores);
   }catch(e){status.className='status err';status.textContent=e.message;return;}
   const epoch=state.feedbackEpoch;const controller=new AbortController();state.controller=controller;state.sending=true;$('sendFeedback').disabled=true;
   status.className='status';status.textContent='Skickar…';
   const timeout=setTimeout(()=>controller.abort(),10000);
   try{
     const res=await fetch(FEEDBACK_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
     if(!res.ok)throw new Error('HTTP '+res.status);
     if(epoch!==state.feedbackEpoch)return;
     state.feedbackSubmitted=true;status.className='status ok';status.textContent='Tack. Strukturerad expertfeedback skickad utan underlagstext eller företagsuppgifter.';
   }catch(e){
     if(epoch!==state.feedbackEpoch)return;
     status.className='status err';status.textContent='Feedback kunde inte skickas just nu. Dina svar ligger kvar på sidan så du kan försöka igen.';
   }finally{
     clearTimeout(timeout);
     if(epoch===state.feedbackEpoch){state.sending=false;state.controller=null;$('sendFeedback').disabled=state.feedbackSubmitted;}
   }
 }
 $('sendFeedback').onclick=sendFeedback;
 $('copyReport').onclick=async()=>{const s=summarize(state.requirements);const report=['Stödassistenten – expertpilot offentlig upphandling',`Sektor: ${state.sector||'ej vald'}`,`Kravrader: ${s.actionableCount}`,`Källrubriker bevarade: ${s.structuralCount}`,`Rader med saknat underlag: ${s.blocking.length}`,`Osäkra/ej bedömda: ${s.uncertain.length}`,'Expertbetyg:',...SCORE_DIMS.map(([k,l])=>`- ${l}: ${state.scores[k]||'ej satt'}`),`Lärde dig något nytt: ${$('foundIssue').value||'ej satt'}`,`Användbart stöd: ${$('useful').value||'ej satt'}`,`Nästa steg tydligt: ${$('clearNext').value||'ej satt'}`].join('\n');try{await navigator.clipboard.writeText(report);$('feedbackStatus').className='status ok';$('feedbackStatus').textContent='Lokalt testprotokoll kopierat. Det innehåller inte inklistrad underlagstext.';}catch(e){$('feedbackStatus').className='status err';$('feedbackStatus').textContent='Kunde inte kopiera automatiskt. Använd webbläsarens kopieringsfunktion.';}};
 renderSectors();
}
const api={classifyRequirement,evidenceQuestion,deadlinePurpose,isStructuralHeading,structureFlags,splitRequirements,summarize,prioritizeReviewRows,draftSkeleton,sampleConstruction,buildFeedbackPayload,LABELS,CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ProcurementExpert=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',browserInit);else browserInit();}
})(typeof window!=='undefined'?window:globalThis);