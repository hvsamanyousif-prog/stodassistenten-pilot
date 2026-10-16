(function(root){
'use strict';

const NEED_PARAM='need_context';
const ALLOWED_NEEDS=new Set(['housing','essential_costs']);
const FUNDING_INTENTS=new Set(['funding','scholarship','loan']);
const SUPPORTED_ACTORS=new Set(['private_person','student','relative','employee']);
const params=new URLSearchParams(root.location.search);
const page=(root.location.pathname.split('/').pop()||'').toLowerCase();

function uniqueAllowed(values){
 const result=[];
 for(const value of values){
  if(ALLOWED_NEEDS.has(value)&&!result.includes(value))result.push(value);
 }
 return result.slice(0,2);
}

function parseNeedContext(value){
 return uniqueAllowed(String(value||'').split(','));
}

function withoutBoundedSwedishNegatedNeedMentions(text){
 return String(text||'').replace(/\bbehöver\s+(?:inte\s+hjälp|ingen\s+hjälp)\s+med\s+(?:hyran|maten)\b/gi,' ');
}

function detectNeeds(text){
 const value=withoutBoundedSwedishNegatedNeedMentions(text).toLocaleLowerCase();
 const needs=[];
 const housing=/(?:\bhyran\b|\b(?:hög|dyr)\s+hyra\b|\bhyra\b(?=\s*(?:och|,|\.|$))|\b(?:boende|bostads)kostnad(?:en|er|erna)?\b|\bbostad(?:en)?\b|\brent\b|(?:ال)?إيجار\s+(?:مرتفع|عال(?:ي|ية)?|غالي|غالية)|إيجار(?:ه|ها)\s+مرتفع|بعد\s+الإيجار|(?:تكلفة|تكاليف)\s+السكن|السكن|اجاره\s+(?:بالا(?:یی)?|زیاد|سنگین|گران)|اجاره(?:‌اش|\s+اش)\s+بالاست|(?:بعد|پس)\s+از\s+اجاره|مسکن)/.test(value);
 const essentialCosts=/(?:\bmat(?:en)?\b|livsmedel|läkemed|medicin|\b(?:elräkning(?:en|ar|arna)?|hushållsel|elkostnad(?:en|er|erna)?)\b|\bfood\b|medicine|دواء|طعام|(?:فاتورة|تكلفة|تكاليف)\s+الكهرباء|دارو|غذا|قبض\s+برق|هزینه(?:‌ی|ی)?\s*برق)/.test(value);
 if(housing)needs.push('housing');
 if(essentialCosts)needs.push('essential_costs');
 return uniqueAllowed(needs);
}

const RELATIVE_SUBJECTS=[
 {key:'child',explicit:/(?:\bbarnet\b|\bmitt barn\b|\bmin son\b|\bmin dotter\b|طفلي|ابني|ابنتي|فرزندم|پسرم|دخترم)/i,pronoun:/(?:\b(?:hen|hon|han)\b|(?:^|\s)(?:هي|هو|او)(?:\s|$))/i},
 {key:'mother',explicit:/(?:\bmin mamma\b|\bmin mor\b|أمي|والدتي|مادرم)/i,pronoun:/(?:\bhon\b|(?:^|\s)هي(?:\s|$)|(?:^|\s)او(?:\s|$))/i},
 {key:'father',explicit:/(?:\bmin pappa\b|\bmin far\b|أبي|والدي|پدرم)/i,pronoun:/(?:\bhan\b|(?:^|\s)هو(?:\s|$)|(?:^|\s)او(?:\s|$))/i},
 {key:'partner',explicit:/(?:\bmin partner\b|\bmin sambo\b|\bmin make\b|\bmin maka\b|زوجتي|زوجي|همسرم)/i,pronoun:/(?:\bhen\b|(?:^|\s)(?:هي|هو|او)(?:\s|$))/i},
 {key:'sibling',explicit:/(?:\bmin syster\b|\bmin bror\b|\bmitt syskon\b|أختي|أخي|خواهرم|برادرم)/i,pronoun:/(?:\b(?:hen|hon|han)\b|(?:^|\s)(?:هي|هو|او)(?:\s|$))/i},
 {key:'neighbor',explicit:/(?:\bjag hjälper (?:min|en) granne\b|أساعد\s+جار(?:ي|تي|ًا)|به\s+(?:همسایه(?:‌?ام)|یک\s+همسایه))/i,pronoun:/(?:\b(?:hen|hon|han)\b|(?:^|\s)(?:هي|هو|او)(?:\s|$))/i},
 {key:'friend',explicit:/(?:\bjag hjälper (?:min|en) vän\b|أساعد\s+صديق(?:ي|تي|ًا)|به\s+(?:دوستم|یک\s+دوست)(?:\s|[،,.!?؟]|$))/i,pronoun:/(?:\b(?:hen|hon|han)\b|(?:^|\s)(?:هي|هو|او)(?:\s|$))/i},
 {key:'relative_generic',explicit:/(?:\bjag hjälper en (?:anhörig|närstående)\b|\bför en (?:anhörig|närstående)\b|أساعد\s+(?:أحد\s+أقاربي|شخص(?:ًا|ا)?\s+قريب(?:ًا|ا)?\s+مني)|ل(?:أحد\s+أقاربي|شخص(?:ًا|ا)?\s+قريب(?:ًا|ا)?\s+مني)|به\s+یکی\s+از\s+(?:بستگانم|نزدیکانم)\s+کمک|برای\s+یکی\s+از\s+(?:بستگانم|نزدیکانم))/i,pronoun:/(?:\b(?:hen|hon|han)\b|(?:^|\s)(?:هي|هو|او|لدي(?:ه|ها)|إيجار(?:ه|ها)|اجاره(?:‌اش|\s+اش))(?=\s|$))/i},
 {key:'person',explicit:/(?:personen (?:som )?jag hjälper|jag hjälper (?:henne|honom)|(?:för|åt)\s+(?:henne|honom)|الشخص الذي (?:أنا )?أساعده|(?:بال)?نيابة عن(?: شخص|ها|ه)|فردی که (?:من )?کمک|برای او)/i,pronoun:/(?:\b(?:hen|hon|han)\b|(?:^|\s)(?:هي|هو|او)(?:\s|$))/i}
];

function relativeSubjectKeys(text){
 const keys=[];
 for(const subject of RELATIVE_SUBJECTS){
  if(subject.explicit.test(String(text||''))&&!keys.includes(subject.key))keys.push(subject.key);
 }
 if(keys.length>1&&keys.includes('person'))return keys.filter(key=>key!=='person');
 return keys;
}

function isHelperSelfNeed(text){
 const value=String(text||'');
 return /(?:\bjag har själv\b|\bjag själv har\b|\bmin egen\b|\bmitt eget\b|\bmina egna\b|\bför mig själv\b|\bjag\s+(?:behöver|har)\b|بنفسي|لي أنا|(?:^|[\s،,])و?أنا\s+(?:أحتاج|احتاج|لدي|عندي)|خودم|برای خودم|(?:^|[\s،,])من(?=[^.!?؟;\n]{0,60}(?:نیاز\s+دارم|(?:اجاره|مسکن|دارو|غذا|برق)[^.!?؟;\n]{0,24}دارم)))/i.test(value);
}

function genderedPartnerPronounMatches(text,contextText){
 const value=String(text||'');
 const context=String(contextText||'');
 const hasWife=/\bmin maka\b/i.test(context);
 const hasHusband=/\bmin make\b/i.test(context);
 const hasGeneric=/\bmin (?:partner|sambo)\b/i.test(context);
 if(hasGeneric||hasWife===hasHusband)return false;
 if(hasWife)return /\bhon\b/i.test(value);
 return /\bhan\b/i.test(value);
}

function introducesInterveningSwedishPersonReference(text){
 const value=String(text||'');
 return /\b(?:(?:hans|hennes|hens)|(?:min|mitt|mina))\s+(?:mamma|mor|pappa|far|förälder|syster|bror|son|dotter|barn|partner|sambo|make|maka|vän|väninna|kollega|chef|läkare|handläggare)\b/i.test(value);
}

function pronounMatchesTarget(text,target,contextText=''){
 const value=String(text||'');
 const subject=RELATIVE_SUBJECTS.find(item=>item.key===target);
 if(subject&&subject.pronoun&&subject.pronoun.test(value))return true;
 return target==='partner'&&genderedPartnerPronounMatches(value,contextText);
}

function beneficiaryNeedsBeforeHelperSelf(text,target,contextText=''){
 const value=String(text||'');
 const helperStart=/(?:\bjag\s+(?:behöver|har)\b|(?:^|[\s،,])و?أنا\s+(?:أحتاج|احتاج|لدي|عندي)|(?:^|[\s،,])(?:و\s*)?من(?=\s|$))/i.exec(value);
 if(!helperStart)return [];
 const prefix=value.slice(0,helperStart.index);
 const prefixKeys=relativeSubjectKeys(prefix);
 if(!prefixKeys.includes(target)&&!pronounMatchesTarget(prefix,target,contextText))return [];
 return detectNeeds(prefix);
}

function detectRelativeNeeds(text){
 const value=String(text||'');
 const explicitKeys=relativeSubjectKeys(value);
 // More than one explicitly named beneficiary is ambiguous for a single helper route.
 // Fail closed rather than silently assigning one person's need to another.
 if(explicitKeys.length!==1)return [];
 const target=explicitKeys[0];
 const genericSubject=RELATIVE_SUBJECTS.find(item=>item.key==='person');
 const targetSubject=RELATIVE_SUBJECTS.find(item=>item.key===target);
 const genericMatch=genericSubject?genericSubject.explicit.exec(value):null;
 const targetMatch=targetSubject?targetSubject.explicit.exec(value):null;
 if(target!=='person'&&genericMatch&&targetMatch&&genericMatch.index<targetMatch.index&&/[.!?؟;\n]/.test(value.slice(genericMatch.index+genericMatch[0].length,targetMatch.index)))return [];
 const parts=value.split(/(?:[.!?؟;\n]+|\bmen\b|لكن|اما|ولی)/i).filter(part=>part.trim());
 const needs=[];
 let established=false;
 let partnerPronounBlocked=false;
 for(const part of parts){
  const partKeys=relativeSubjectKeys(part);
  const helperSelfNeed=isHelperSelfNeed(part);
  if(partKeys.includes(target)){
   established=true;
   partnerPronounBlocked=false;
   if(helperSelfNeed)needs.push(...beneficiaryNeedsBeforeHelperSelf(part,target,value));
   else needs.push(...detectNeeds(part));
   continue;
  }
  if(!established)continue;
  if(target==='partner'&&introducesInterveningSwedishPersonReference(part)){
   partnerPronounBlocked=true;
   continue;
  }
  if(target==='partner'&&partnerPronounBlocked)continue;
  if(pronounMatchesTarget(part,target,value)){
   if(helperSelfNeed)needs.push(...beneficiaryNeedsBeforeHelperSelf(part,target,value));
   else needs.push(...detectNeeds(part));
  }
 }
 return uniqueAllowed(needs);
}

function installSharedShell(){
 if(page!=='index.html'&&page!=='')return false;
 const box=document.getElementById('engineResults');
 const composer=document.getElementById('situation');
 if(!box||!composer)return false;

 function decorateAnchor(anchor){
  const url=new URL(anchor.href,root.location.href);
  const actor=url.searchParams.get('actor_type')||'';
  const intent=url.searchParams.get('funding_intent')||'';
  const boundedRejectedHelper=actor==='relative'&&anchor.dataset.rejectedFundingHelper==='true';
  if(!SUPPORTED_ACTORS.has(actor)||(!FUNDING_INTENTS.has(intent)&&!boundedRejectedHelper))return;
  const needs=actor==='relative'?detectRelativeNeeds(composer.value):detectNeeds(composer.value);
  if(needs.length)url.searchParams.set(NEED_PARAM,needs.join(','));
  else url.searchParams.delete(NEED_PARAM);
  anchor.href=url.pathname.split('/').pop()+url.search;
 }

 function decorateRoutes(){
  for(const anchor of box.querySelectorAll('a.route'))decorateAnchor(anchor);
 }

 new MutationObserver(decorateRoutes).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 box.addEventListener('click',event=>{
  const anchor=event.target.closest('a.route');
  if(anchor)decorateAnchor(anchor);
 },true);
 decorateRoutes();
 return true;
}

const NEED_COPY={
 sv:{heading:'Bevarat behov',relativeHeading:'Personens bevarade behov',labels:{housing:'Boende / hyra',essential_costs:'Nödvändiga utgifter'},boundary:'Vi för bara över dessa grova kategorier mellan sidor, inte din fritext.'},
 ar:{heading:'الاحتياج المحفوظ',relativeHeading:'احتياج الشخص المحفوظ',labels:{housing:'السكن / الإيجار',essential_costs:'مصاريف ضرورية'},boundary:'ننقل فقط هذه الفئات العامة بين الصفحات، وليس النص الذي كتبته.'},
 fa:{heading:'نیاز حفظ‌شده',relativeHeading:'نیاز حفظ‌شدهٔ آن شخص',labels:{housing:'مسکن / اجاره',essential_costs:'هزینه‌های ضروری'},boundary:'فقط این دسته‌های کلی بین صفحه‌ها منتقل می‌شوند، نه متن آزاد تو.'}
};

const EMPLOYEE_NEED_BRIDGE_COPY={
 sv:'Fortsätt med behovet',
 ar:'تابع مع الاحتياج',
 fa:'ادامه با نیاز'
};

const ESSENTIAL_COSTS_QUESTION_COPY={
 sv:{self:'Du nämnde nödvändiga utgifter. Hur pressad är ekonomin efter boende och nödvändiga utgifter?',relative:'Du nämnde nödvändiga utgifter för personen. Hur pressad är personens ekonomi efter boende och nödvändiga utgifter?'},
 ar:{self:'ذكرت مصاريف ضرورية. ما مدى الضغط على الميزانية بعد السكن والمصاريف الضرورية؟',relative:'ذكرت مصاريف ضرورية للشخص. ما مدى الضغط على ميزانية الشخص بعد السكن والمصاريف الضرورية؟'},
 fa:{self:'شما هزینه‌های ضروری را ذکر کردید. بعد از مسکن و هزینه‌های ضروری، فشار مالی چقدر است؟',relative:'شما هزینه‌های ضروری فرد را ذکر کردید. بعد از مسکن و هزینه‌های ضروری، فشار مالی او چقدر است؟'}
};

function installPerson(){
 if(page!=='person-pilot.html')return false;
 const actor=params.get('actor_type')||'';
 if(!SUPPORTED_ACTORS.has(actor))return false;
 const intent=params.get('funding_intent')||'';
 const needs=parseNeedContext(params.get(NEED_PARAM));
 if(!needs.length)return false;
 if(typeof render!=='function'||typeof go!=='function')return false;
 const hasHousing=needs.includes('housing');
 const hasEssentialCosts=needs.includes('essential_costs');

 function locale(){
  try{return typeof lang==='string'&&(lang==='ar'||lang==='fa')?lang:'sv';}catch(_){return 'sv';}
 }

 function installEmployeeNeedBridge(card){
  if(actor!=='employee'||!FUNDING_INTENTS.has(intent))return;
  if(card.querySelector('[data-funding-continuity-action]'))return;
  const button=document.createElement('button');
  button.type='button';
  button.className='btn primary';
  button.dataset.fundingContinuityAction='employee';
  button.textContent=EMPLOYEE_NEED_BRIDGE_COPY[locale()]||EMPLOYEE_NEED_BRIDGE_COPY.sv;
  button.addEventListener('click',()=>{
   try{
    scenario='general';
    answers={fundingIntent:intent};
    try{matchRatings={};finalFeedback={};submitState='idle';}catch(_){/* base page owns feedback state */}
    go('general1');
   }catch(error){
    console.error('employee need continuity failed closed',error);
   }
  });
  card.append(button);
 }

 function decorateCard(){
  const card=document.getElementById('fundingIntentContext');
  if(!card)return;
  card.dataset.needContext=needs.join(',');
  let note=card.querySelector('[data-preserved-needs="true"]');
  if(!note){
   note=document.createElement('div');
   note.className='notice';
   note.dataset.preservedNeeds='true';
   const action=card.querySelector('[data-funding-continuity-action]');
   card.insertBefore(note,action||null);
  }
  const copy=NEED_COPY[locale()]||NEED_COPY.sv;
  const heading=actor==='relative'?copy.relativeHeading:copy.heading;
  note.textContent=`${heading}: ${needs.map(need=>copy.labels[need]).join(' + ')}. ${copy.boundary}`;
  installEmployeeNeedBridge(card);
 }

 function decorateEssentialCostsQuestion(){
  if(!hasEssentialCosts)return;
  let current='';
  try{current=screen;}catch(_){return;}
  if(current!=='general2')return;
  const question=document.querySelector('#main h2');
  if(!question)return;
  const copy=ESSENTIAL_COSTS_QUESTION_COPY[locale()]||ESSENTIAL_COSTS_QUESTION_COPY.sv;
  question.textContent=actor==='relative'?copy.relative:copy.self;
  question.dataset.essentialCostsConfirmation='true';
 }

 const baseGo=go;
 go=function(next){
  let current='';
  let currentScenario=null;
  try{current=screen;currentScenario=scenario;}catch(_){/* base page owns state */}
  if(hasHousing&&currentScenario==='general'){
   try{
    if(next==='general1'||next==='general2'||next==='generalR')answers.housing='yes';
    if(next==='general5'&&current==='general4'){
     answers.housing='yes';
     return baseGo('generalR');
    }
   }catch(_){/* fail closed into the base question flow */}
  }
  return baseGo(next);
 };

 const baseRender=render;
 render=function(){baseRender();decorateCard();decorateEssentialCostsQuestion();};
 decorateCard();
 decorateEssentialCostsQuestion();
 return true;
}

const installed=installSharedShell()||installPerson();
if(installed){
 root.StodConcreteNeedContinuity=Object.freeze({version:'1.3.29',page});
}
})(window);
