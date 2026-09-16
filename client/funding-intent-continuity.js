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
   student:{
    funding:'Du kom hit efter att ha sökt finansiering. Vi behåller den inriktningen och frågar inte igen om du studerar.',
    scholarship:'Du kom hit efter att ha sökt stipendium. Vi behåller stipendieinriktningen och blandar inte ihop den med lån.',
    loan:'Du kom hit efter att ha sökt lån. Vi behåller låneinriktningen och blandar inte ihop den med bidrag.'
   },
   private_person:{
    funding:'Du kom hit efter att ha sökt finansiering för ett privat behov. Vi behåller den inriktningen och går vidare till den första fråga som faktiskt kan ändra nästa väg.',
    scholarship:'Du kom hit efter att ha sökt stipendium eller bidrag för ett privat behov. Vi behåller den inriktningen och blandar inte ihop den med lån.',
    loan:'Du kom hit efter att ha sökt lån för ett privat behov. Vi behåller låneinriktningen och blandar inte ihop den med bidrag.'
   },
   association:{
    funding:'Du kom hit som förening med ett finansieringsbehov. Vi behåller både rollen och finansieringsinriktningen i samma resa.',
    scholarship:'Du kom hit som förening efter att ha sökt stipendium eller bidrag. Vi behåller den inriktningen utan att tolka den som ett beviljat stöd.',
    loan:'Du kom hit som förening efter att ha sökt lån. Låneinriktningen behålls, men den här piloten har ännu ingen verifierad lånespecifik resultatlista för föreningar.'
   }
  },
  actions:{student:'Fortsätt utan att svara om studier igen',private_person:'Fortsätt till nästa relevanta fråga',association:'Fortsätt med föreningsfinansiering'},
  preserved:'Inriktningen används bara som navigationskontext. Stöd, villkor, belopp och rätt till stöd måste fortfarande verifieras i originalkällan.'
 },
 ar:{
  eyebrow:'بحثك يستمر معك',
  labels:{funding:'تمويل',scholarship:'منحة / دعم',loan:'قرض'},
  descriptions:{
   student:{
    funding:'وصلت إلى هنا بعد البحث عن تمويل. نحتفظ بهذا الاتجاه ولا نطلب منك تأكيد أنك تدرس مرة أخرى.',
    scholarship:'وصلت إلى هنا بعد البحث عن منحة. نحتفظ بمسار المنحة ولا نخلطه مع القرض.',
    loan:'وصلت إلى هنا بعد البحث عن قرض. نحتفظ بمسار القرض ولا نخلطه مع المنحة.'
   },
   private_person:{
    funding:'وصلت إلى هنا بعد البحث عن تمويل لاحتياج شخصي. نحتفظ بهذا الاتجاه وننتقل إلى أول سؤال يمكنه فعلاً تغيير المسار التالي.',
    scholarship:'وصلت إلى هنا بعد البحث عن منحة أو دعم لاحتياج شخصي. نحتفظ بهذا المسار ولا نخلطه مع القرض.',
    loan:'وصلت إلى هنا بعد البحث عن قرض لاحتياج شخصي. نحتفظ بمسار القرض ولا نخلطه مع المنحة.'
   },
   association:{
    funding:'وصلت إلى هنا كجمعية ولديك حاجة إلى تمويل. نحتفظ بنوع الجهة وبمسار التمويل في الرحلة نفسها.',
    scholarship:'وصلت إلى هنا كجمعية بعد البحث عن منحة أو دعم. نحتفظ بهذا المسار من دون اعتباره دعماً مضموناً.',
    loan:'وصلت إلى هنا كجمعية بعد البحث عن قرض. نحتفظ بمسار القرض، لكن هذه النسخة لا تملك بعد قائمة نتائج موثقة خاصة بقروض الجمعيات.'
   }
  },
  actions:{student:'متابعة دون تكرار سؤال الدراسة',private_person:'متابعة إلى السؤال التالي ذي الصلة',association:'متابعة تمويل الجمعية'},
  preserved:'يُستخدم هذا الاختيار فقط كسياق للتنقل. يجب التحقق من الدعم والشروط والمبالغ والأهلية من المصدر الأصلي.'
 },
 fa:{
  eyebrow:'جست‌وجوی تو همراهت می‌ماند',
  labels:{funding:'تأمین مالی',scholarship:'بورسیه / کمک‌هزینه',loan:'وام'},
  descriptions:{
   student:{
    funding:'بعد از جست‌وجوی تأمین مالی وارد شدی. این جهت را حفظ می‌کنیم و دوباره نمی‌پرسیم آیا دانشجو هستی.',
    scholarship:'بعد از جست‌وجوی بورسیه وارد شدی. مسیر بورسیه را حفظ می‌کنیم و آن را با وام یکی نمی‌کنیم.',
    loan:'بعد از جست‌وجوی وام وارد شدی. مسیر وام را حفظ می‌کنیم و آن را با کمک‌هزینه یکی نمی‌کنیم.'
   },
   private_person:{
    funding:'بعد از جست‌وجوی تأمین مالی برای یک نیاز شخصی وارد شدی. این جهت را حفظ می‌کنیم و به اولین پرسشی می‌رویم که واقعاً می‌تواند مسیر بعدی را عوض کند.',
    scholarship:'بعد از جست‌وجوی بورسیه یا کمک‌هزینه برای یک نیاز شخصی وارد شدی. این مسیر را حفظ می‌کنیم و آن را با وام یکی نمی‌کنیم.',
    loan:'بعد از جست‌وجوی وام برای یک نیاز شخصی وارد شدی. مسیر وام را حفظ می‌کنیم و آن را با کمک‌هزینه یکی نمی‌کنیم.'
   },
   association:{
    funding:'به عنوان انجمن با نیاز تأمین مالی وارد شدی. هم نوع بازیگر و هم جهت تأمین مالی را در همان مسیر حفظ می‌کنیم.',
    scholarship:'به عنوان انجمن بعد از جست‌وجوی بورسیه یا کمک‌هزینه وارد شدی. این مسیر را حفظ می‌کنیم بدون اینکه آن را حمایت قطعی بدانیم.',
    loan:'به عنوان انجمن بعد از جست‌وجوی وام وارد شدی. مسیر وام حفظ می‌شود، اما این پایلوت هنوز فهرست نتیجه تأییدشده ویژه وام انجمن‌ها ندارد.'
   }
  },
  actions:{student:'ادامه بدون تکرار سؤال دانشجو بودن',private_person:'ادامه به پرسش بعدی مرتبط',association:'ادامه با تأمین مالی انجمن'},
  preserved:'این انتخاب فقط برای حفظ مسیر استفاده می‌شود. حمایت، شرایط، مبلغ و واجد شرایط بودن باید در منبع اصلی بررسی شود.'
 }
};

function personLocale(){
 try{return typeof lang==='string'&&PERSON_COPY[lang]?lang:'sv';}catch(_){return 'sv';}
}

function personText(actorType){
 const copy=PERSON_COPY[personLocale()]||PERSON_COPY.sv;
 const descriptions=copy.descriptions[actorType]||copy.descriptions.private_person;
 return {copy,label:copy.labels[intent],description:descriptions[intent],action:copy.actions[actorType]};
}

function makeContextCard(copy,label,description,actionText,actionName,handler){
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
 const descriptionEl=document.createElement('p');
 descriptionEl.className='muted';
 descriptionEl.textContent=description;
 const boundary=document.createElement('div');
 boundary.className='notice';
 boundary.textContent=copy.preserved;
 card.append(eyebrow,title,descriptionEl,boundary);
 if(handler&&actionText){
  const button=document.createElement('button');
  button.type='button';
  button.className='btn primary';
  button.dataset.fundingContinuityAction=actionName;
  button.textContent=actionText;
  button.addEventListener('click',handler);
  card.append(button);
 }
 return card;
}

function resetPersonFeedback(){
 try{matchRatings={};finalFeedback={};submitState='idle';}catch(_){/* base page owns state */}
}

function continueStudent(){
 try{
  scenario='general';
  answers={work:'student',fundingIntent:intent};
  resetPersonFeedback();
  go('general2');
 }catch(error){
  console.error('student funding continuity failed closed',error);
 }
}

function continuePrivate(){
 try{
  scenario='general';
  answers={fundingIntent:intent};
  resetPersonFeedback();
  go('general1');
 }catch(error){
  console.error('private funding continuity failed closed',error);
 }
}

function continueAssociation(){
 try{
  scenario='org';
  resetPersonFeedback();
  if(intent==='funding'||intent==='scholarship'){
   answers={orgType:'association',orgNeed:'funding',fundingIntent:intent};
   go('orgR');
  }else{
   answers={orgType:'association',fundingIntent:intent};
   go('org2');
  }
 }catch(error){
  console.error('association funding continuity failed closed',error);
 }
}

function pruneAssociationProcurement(){
 if(actor!=='association'||(intent!=='funding'&&intent!=='scholarship'))return;
 let currentScreen='';
 try{currentScreen=screen;}catch(_){return;}
 if(currentScreen!=='orgR')return;
 const links=document.querySelectorAll('#main .result a.source');
 for(const link of links){
  if(String(link.getAttribute('href')||'').includes('upphandlingsmyndigheten.se/foretagare')){
   const card=link.closest('.result');
   if(card)card.remove();
  }
 }
}

function decoratePerson(){
 if(actor!=='student'&&actor!=='private_person'&&actor!=='association')return;
 const host=document.getElementById('main');
 if(!host)return;
 let currentScreen='';
 let currentScenario='';
 try{currentScreen=screen;currentScenario=scenario;}catch(_){return;}
 pruneAssociationProcurement();
 if(document.getElementById('fundingIntentContext'))return;
 const text=personText(actor);
 let handler=null;
 let actionName='';
 if(currentScreen==='home'){
  if(actor==='student'){handler=continueStudent;actionName='continue';}
  if(actor==='private_person'){handler=continuePrivate;actionName='private';}
  if(actor==='association'){handler=continueAssociation;actionName='association-funding';}
 }
 const card=makeContextCard(text.copy,text.label,text.description,text.action,actionName,handler);
 if(currentScreen==='home'){
  const hero=host.querySelector('.hero');
  if(hero)hero.insertAdjacentElement('afterend',card);else host.prepend(card);
  return;
 }
 if((actor==='student'||actor==='private_person')&&currentScenario==='general'){
  const backButton=host.querySelector('.back');
  if(backButton)backButton.insertAdjacentElement('afterend',card);else host.prepend(card);
  return;
 }
 if(actor==='association'&&currentScenario==='org'){
  const backButton=host.querySelector('.back');
  if(backButton)backButton.insertAdjacentElement('afterend',card);else host.prepend(card);
 }
}

function installPerson(){
 if(page!=='person-pilot.html')return false;
 if(actor!=='student'&&actor!=='private_person'&&actor!=='association')return false;
 if(typeof render!=='function'||typeof go!=='function')return false;
 const baseRender=render;
 render=function(){baseRender();decoratePerson();};
 decoratePerson();
 return true;
}

const COMPANY_COPY={
 eyebrow:'Din sökning följer med',
 labels:{funding:'Finansiering / företagsstöd',scholarship:'Bidrag / företagsstöd',loan:'Lån / företagsfinansiering'},
 descriptions:{
  funding:'Du kom hit via en finansieringssökning. Därför frågar vi inte igen om målet är upphandling eller finansiering.',
  scholarship:'Du kom hit efter att ha sökt stipendium eller bidrag. För företag behandlas det bara som en bidrags-/stödinriktning, inte som bevis på att ett visst stöd finns eller kan beviljas.',
  loan:'Du kom hit efter att ha sökt lån. Vi behåller låneinriktningen och blandar inte ihop den med bidrag, men fortsätter i samma generella företagsfinansieringsflöde.'
 },
 boundary:'Det här är bara navigationskontext. En specifik finansiering, villkor, belopp eller rätt till stöd måste verifieras mot ansvarig aktör och originalkälla.',
 continues:{funding:'Fortsätt med finansiering',scholarship:'Fortsätt med bidrag / företagsstöd',loan:'Fortsätt med lån / finansiering'}
};

function continueCompany(){
 try{
  state.goal='funding';
  state.fundingIntent=intent;
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
 card.dataset.fundingIntent=intent;
 card.setAttribute('aria-live','polite');
 const eyebrow=document.createElement('div');
 eyebrow.className='eyebrow';
 eyebrow.textContent=COMPANY_COPY.eyebrow;
 const title=document.createElement('h2');
 title.textContent=COMPANY_COPY.labels[intent];
 const description=document.createElement('p');
 description.className='muted';
 description.textContent=COMPANY_COPY.descriptions[intent];
 const boundary=document.createElement('div');
 boundary.className='notice';
 boundary.textContent=COMPANY_COPY.boundary;
 card.append(eyebrow,title,description,boundary);
 return card;
}

function decorateCompany(){
 if(actor!=='company')return;
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
   button.textContent=COMPANY_COPY.continues[intent];
   button.dataset.fundingContinuityAction='company-funding';
   button.addEventListener('click',continueCompany,{once:true});
  }
 }
}

function installCompany(){
 if(page!=='company-pilot.html'||actor!=='company')return false;
 if(typeof render!=='function')return false;
 const baseRender=render;
 render=function(){baseRender();decorateCompany();};
 decorateCompany();
 return true;
}

const installed=installPerson()||installCompany();
if(installed){
 root.StodFundingIntentContinuity=Object.freeze({version:'1.1.0',intent,page,actor});
}
})(window);
