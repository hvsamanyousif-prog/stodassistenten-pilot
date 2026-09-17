(function(root){
'use strict';

const NEED_PARAM='need_context';
const ALLOWED_NEEDS=new Set(['housing','essential_costs']);
const FUNDING_INTENTS=new Set(['funding','scholarship','loan']);
const SUPPORTED_ACTORS=new Set(['private_person','student','relative']);
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

function detectNeeds(text){
 const value=String(text||'').toLocaleLowerCase();
 const needs=[];
 if(/hyra|bostad|\brent\b|إيجار|سكن|اجاره|مسکن/.test(value))needs.push('housing');
 if(/\bmat(?:en)?\b|livsmedel|läkemed|medicin|\bfood\b|medicine|دواء|طعام|دارو|غذا/.test(value))needs.push('essential_costs');
 return uniqueAllowed(needs);
}

function detectRelativeNeeds(text){
 const relativeSubject=/(?:\bbarnet\b|\bmitt barn\b|\bmin mamma\b|\bmin pappa\b|\bmin mor\b|\bmin far\b|\bmin partner\b|\bmin sambo\b|\bmin make\b|\bmin maka\b|personen jag hjälper|طفلي|ابني|ابنتي|أمي|أبي|والدتي|والدي|الشخص الذي أساعده|فرزندم|پسرم|دخترم|مادرم|پدرم|همسرم|فردی که کمک)/i;
 const parts=String(text||'').split(/(?:[.!?;\n]+|\bmen\b|لكن|اما|ولی)/i);
 const needs=[];
 for(const part of parts){
  if(!relativeSubject.test(part))continue;
  needs.push(...detectNeeds(part));
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
  if(!SUPPORTED_ACTORS.has(actor)||!FUNDING_INTENTS.has(intent))return;
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

function installPerson(){
 if(page!=='person-pilot.html')return false;
 const actor=params.get('actor_type')||'';
 if(!SUPPORTED_ACTORS.has(actor))return false;
 const needs=parseNeedContext(params.get(NEED_PARAM));
 if(!needs.length)return false;
 if(typeof render!=='function'||typeof go!=='function')return false;
 const hasHousing=needs.includes('housing');

 function locale(){
  try{return typeof lang==='string'&&(lang==='ar'||lang==='fa')?lang:'sv';}catch(_){return 'sv';}
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
 render=function(){baseRender();decorateCard();};
 decorateCard();
 return true;
}

const installed=installSharedShell()||installPerson();
if(installed){
 root.StodConcreteNeedContinuity=Object.freeze({version:'1.1.0',page});
}
})(window);