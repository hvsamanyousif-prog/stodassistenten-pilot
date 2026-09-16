(function(root){
'use strict';

const params=new URLSearchParams(root.location.search);
const intent=params.get('funding_intent');
const allowed=new Set(['funding','scholarship','loan']);
if(!allowed.has(intent))return;

const page=(root.location.pathname.split('/').pop()||'').toLowerCase();
const actor=params.get('actor_type')||'';

const PERSON_COPY={
 sv:{
  eyebrow:'Din sökning följer med',
  labels:{funding:'Finansiering',scholarship:'Stipendium / bidrag',loan:'Lån'},
  descriptions:{
   funding:'Du kom hit efter att ha sökt finansiering. Vi behåller den inriktningen och frågar inte igen om du studerar.',
   scholarship:'Du kom hit efter att ha sökt stipendium. Vi behåller stipendieinriktningen och blandar inte ihop den med lån.',
   loan:'Du kom hit efter att ha sökt lån. Vi behåller låneinriktningen och blandar inte ihop den med bidrag.'
  },
  continue:'Fortsätt utan att svara om studier igen',
  preserved:'Inriktningen används bara som navigationskontext. Stöd, villkor, belopp och rätt till stöd måste fortfarande verifieras i originalkällan.'
 },
 ar:{
  eyebrow:'بحثك يستمر معك',
  labels:{funding:'تمويل',scholarship:'منحة / دعم',loan:'قرض'},
  descriptions:{
   funding:'وصلت إلى هنا بعد البحث عن تمويل. نحتفظ بهذا الاتجاه ولا نطلب منك تأكيد أنك تدرس مرة أخرى.',
   scholarship:'وصلت إلى هنا بعد البحث عن منحة. نحتفظ بمسار المنحة ولا نخلطه مع القرض.',
   loan:'وصلت إلى هنا بعد البحث عن قرض. نحتفظ بمسار القرض ولا نخلطه مع المنحة.'
  },
  continue:'متابعة دون تكرار سؤال الدراسة',
  preserved:'يُستخدم هذا الاختيار فقط كسياق للتنقل. يجب التحقق من الدعم والشروط والمبالغ والأهلية من المصدر الأصلي.'
 },
 fa:{
  eyebrow:'جست‌وجوی تو همراهت می‌ماند',
  labels:{funding:'تأمین مالی',scholarship:'بورسیه / کمک‌هزینه',loan:'وام'},
  descriptions:{
   funding:'بعد از جست‌وجوی تأمین مالی وارد شدی. این جهت را حفظ می‌کنیم و دوباره نمی‌پرسیم آیا دانشجو هستی.',
   scholarship:'بعد از جست‌وجوی بورسیه وارد شدی. مسیر بورسیه را حفظ می‌کنیم و آن را با وام یکی نمی‌کنیم.',
   loan:'بعد از جست‌وجوی وام وارد شدی. مسیر وام را حفظ می‌کنیم و آن را با کمک‌هزینه یکی نمی‌کنیم.'
  },
  continue:'ادامه بدون تکرار سؤال دانشجو بودن',
  preserved:'این انتخاب فقط برای حفظ مسیر استفاده می‌شود. حمایت، شرایط، مبلغ و واجد شرایط بودن باید در منبع اصلی بررسی شود.'
 }
};

function personLocale(){
 try{return typeof lang==='string'&&PERSON_COPY[lang]?lang:'sv';}catch(_){return 'sv';}
}

function makeContextCard(copy,label,includeAction){
 const card=document.createElement('section');
 card.id='fundingIntentContext';
 card.className='card';
 card.dataset.fundingIntent=intent;
 card.setAttribute('aria-live','polite');
 const eyebrow=document.createElement('div');
 eyebrow.className='eyebrow';
 eyebrow.textContent=copy.eyebrow;
 const title=document.createElement('h2');
 title.textContent=label;
 const description=document.createElement('p');
 description.className='muted';
 description.textContent=copy.descriptions[intent];
 const boundary=document.createElement('div');
 boundary.className='notice';
 boundary.textContent=copy.preserved;
 card.append(eyebrow,title,description,boundary);
 if(includeAction){
  const button=document.createElement('button');
  button.type='button';
  button.className='btn primary';
  button.dataset.fundingContinuityAction='continue';
  button.textContent=copy.continue;
  button.addEventListener('click',continuePerson);
  card.append(button);
 }
 return card;
}

function continuePerson(){
 try{
  scenario='general';
  answers={work:'student',fundingIntent:intent};
  matchRatings={};
  finalFeedback={};
  submitState='idle';
  go('general2');
 }catch(error){
  console.error('funding intent continuity failed closed',error);
 }
}

function decoratePerson(){
 if(actor!=='student')return;
 const host=document.getElementById('main');
 if(!host||document.getElementById('fundingIntentContext'))return;
 const copy=PERSON_COPY[personLocale()]||PERSON_COPY.sv;
 const label=copy.labels[intent];
 let currentScreen='';
 let currentScenario='';
 try{currentScreen=screen;currentScenario=scenario;}catch(_){return;}
 const card=makeContextCard(copy,label,currentScreen==='home');
 if(currentScreen==='home'){
  const hero=host.querySelector('.hero');
  if(hero)hero.insertAdjacentElement('afterend',card);else host.prepend(card);
  return;
 }
 if(currentScenario==='general'){
  const backButton=host.querySelector('.back');
  if(backButton)backButton.insertAdjacentElement('afterend',card);else host.prepend(card);
 }
}

function installPerson(){
 if(page!=='person-pilot.html'||actor!=='student')return false;
 if(typeof render!=='function'||typeof go!=='function')return false;
 const baseRender=render;
 render=function(){baseRender();decoratePerson();};
 decoratePerson();
 return true;
}

const COMPANY_COPY={
 eyebrow:'Din sökning följer med',
 title:'Finansiering / företagsstöd',
 description:'Du kom hit via en finansieringssökning. Därför frågar vi inte igen om målet är upphandling eller finansiering.',
 boundary:'Det här är bara navigationskontext. En specifik finansiering, villkor, belopp eller rätt till stöd måste verifieras mot ansvarig aktör och originalkälla.',
 continue:'Fortsätt med finansiering'
};

function continueCompany(){
 try{
  state.goal='funding';
  state.step=STEP.SECTOR;
  if(typeof resetFeedback==='function')resetFeedback();
  render();
  root.scrollTo({top:0,behavior:'smooth'});
 }catch(error){
  console.error('company funding continuity failed closed',error);
 }
}

function makeCompanyCard(){
 const card=document.createElement('section');
 card.id='fundingIntentContext';
 card.className='card';
 card.dataset.fundingIntent='funding';
 card.setAttribute('aria-live','polite');
 const eyebrow=document.createElement('div');
 eyebrow.className='eyebrow';
 eyebrow.textContent=COMPANY_COPY.eyebrow;
 const title=document.createElement('h2');
 title.textContent=COMPANY_COPY.title;
 const description=document.createElement('p');
 description.className='muted';
 description.textContent=COMPANY_COPY.description;
 const boundary=document.createElement('div');
 boundary.className='notice';
 boundary.textContent=COMPANY_COPY.boundary;
 card.append(eyebrow,title,description,boundary);
 return card;
}

function decorateCompany(){
 if(actor!=='company'||intent!=='funding')return;
 const host=document.getElementById('main');
 if(!host)return;
 let currentStep;
 try{currentStep=state.step;}catch(_){return;}
 if(!document.getElementById('fundingIntentContext')){
  const card=makeCompanyCard();
  const backButton=host.querySelector('.back');
  const hero=host.querySelector('.hero');
  if(backButton)backButton.insertAdjacentElement('afterend',card);
  else if(hero)hero.insertAdjacentElement('afterend',card);
  else host.prepend(card);
 }
 if(currentStep===STEP.START){
  const button=host.querySelector('.hero button.primary');
  if(button){
   button.removeAttribute('onclick');
   button.textContent=COMPANY_COPY.continue;
   button.dataset.fundingContinuityAction='company-funding';
   button.addEventListener('click',continueCompany,{once:true});
  }
 }
}

function installCompany(){
 if(page!=='company-pilot.html'||actor!=='company'||intent!=='funding')return false;
 if(typeof render!=='function')return false;
 const baseRender=render;
 render=function(){baseRender();decorateCompany();};
 decorateCompany();
 return true;
}

const installed=installPerson()||installCompany();
if(installed){
 root.StodFundingIntentContinuity=Object.freeze({version:'1.0.0',intent,page});
}
})(window);
