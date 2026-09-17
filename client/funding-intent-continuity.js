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
   },
   relative:{
    funding:'Du hjälper någon annan att söka finansiering. Vi behåller hjälparrollen och finansieringsinriktningen och går vidare utifrån det du vet om personens situation.',
    scholarship:'Du hjälper någon annan att söka stipendium eller bidrag. Vi behåller hjälparrollen och stipendieinriktningen utan att anta att ett visst stöd passar.',
    loan:'Du hjälper någon annan att söka lån. Vi behåller hjälparrollen och låneinriktningen utan att blanda ihop den med bidrag eller göra en kreditbedömning.'
   }
  },
  actions:{student:'Fortsätt utan att svara om studier igen',private_person:'Fortsätt till nästa relevanta fråga',association:'Fortsätt med föreningsfinansiering',relative:'Fortsätt med personens situation'},
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
   },
   relative:{
    funding:'أنت تساعد شخصًا آخر في البحث عن تمويل. نحتفظ بدور المساعدة ومسار التمويل ونتابع وفق ما تعرفه عن وضع الشخص.',
    scholarship:'أنت تساعد شخصًا آخر في البحث عن منحة أو دعم. نحتفظ بدور المساعدة ومسار المنحة من دون افتراض أن دعماً محدداً مناسب.',
    loan:'أنت تساعد شخصًا آخر في البحث عن قرض. نحتفظ بدور المساعدة ومسار القرض من دون خلطه بالدعم أو إجراء تقييم ائتماني.'
   }
  },
  actions:{student:'متابعة دون تكرار سؤال الدراسة',private_person:'متابعة إلى السؤال التالي ذي الصلة',association:'متابعة تمويل الجمعية',relative:'متابعة وضع الشخص الذي تساعده'},
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
   },
   relative:{
    funding:'به شخص دیگری برای جست‌وجوی تأمین مالی کمک می‌کنی. نقش کمک‌کننده و مسیر تأمین مالی را حفظ می‌کنیم و بر اساس آنچه از وضعیت شخص می‌دانی ادامه می‌دهیم.',
    scholarship:'به شخص دیگری برای جست‌وجوی بورسیه یا کمک‌هزینه کمک می‌کنی. نقش کمک‌کننده و مسیر بورسیه را حفظ می‌کنیم بدون اینکه مناسب بودن یک حمایت مشخص را فرض کنیم.',
    loan:'به شخص دیگری برای جست‌وجوی وام کمک می‌کنی. نقش کمک‌کننده و مسیر وام را حفظ می‌کنیم بدون اینکه آن را با کمک‌هزینه یکی کنیم یا اعتبارسنجی انجام دهیم.'
   }
  },
  actions:{student:'ادامه بدون تکرار سؤال دانشجو بودن',private_person:'ادامه به پرسش بعدی مرتبط',association:'ادامه با تأمین مالی انجمن',relative:'ادامه با وضعیت شخصی که به او کمک می‌کنی'},
  preserved:'این انتخاب فقط برای حفظ مسیر استفاده می‌شود. حمایت، شرایط، مبلغ و واجد شرایط بودن باید در منبع اصلی بررسی شود.'
 }
};

const STUDENT_RESULT_COPY={
 sv:{
  planTitle:'Din handlingsplan',
  loan:{
   tag:'Kontrollera hos CSN',
   title:'Studiemedel: bidrag och studielån',
   lead:'Studiemedel från CSN kan bestå av bidrag och lån. Den här vägen gäller lånedelen. Stödassistenten avgör inte om du har rätt till studiemedel, vilket belopp du kan få eller vilka villkor som gäller.',
   source:['https://www.csn.se/bidrag-och-lan/studiestod.html','↗ Originalkälla: CSN – studiestöd'],
   action:'1. Börja med att kontrollera lånedelen hos CSN och verifiera aktuella villkor, belopp, återbetalning och ansökningsväg i originalkällan innan du antar att lånet passar din situation.'
  },
  scholarship:{
   tag:'Discovery – verifiera',
   title:'Stipendier söks hos den aktuella stiftelsen',
   lead:'Länsstyrelsens Stiftelsesök är ett register för att hitta stiftelser. Att en stiftelse finns i registret bevisar inte att ansökan är öppen, att du är behörig, vilket belopp som finns eller vilken deadline som gäller.',
   source:['https://stiftelser.lansstyrelsen.se/','↗ Originalkälla: Länsstyrelsen – Stiftelsesök'],
   action:'1. Hitta en möjlig stiftelse i Stiftelsesök och kontakta stiftelsen eller öppna dess aktuella primärkälla för att verifiera ändamål, geografi, ansökningsperiod, underlag och ansökningsväg. Om det inte kan verifieras stannar det vid discovery.'
  }
 },
 ar:{
  planTitle:'خطة العمل التالية',
  loan:{
   tag:'تحقق لدى CSN',
   title:'دعم الدراسة: منحة وقرض دراسي',
   lead:'قد يتكون دعم الدراسة من CSN من منحة وقرض. هذا المسار يتعلق بجزء القرض. لا يقرر مساعد الدعم الأهلية أو المبلغ أو الشروط.',
   source:['https://www.csn.se/bidrag-och-lan/studiestod.html','↗ المصدر الأصلي: CSN – دعم الدراسة'],
   action:'1. ابدأ بالتحقق من جزء القرض لدى CSN وتحقق من الشروط الحالية والمبلغ والسداد وطريقة التقديم في المصدر الأصلي قبل افتراض أن القرض يناسب وضعك.'
  },
  scholarship:{
   tag:'اكتشاف – تحقق',
   title:'تُطلب المنح من المؤسسة المعنية',
   lead:'بحث المؤسسات لدى مجالس المحافظات هو سجل للعثور على المؤسسات. وجود مؤسسة في السجل لا يثبت أن التقديم مفتوح أو أنك مؤهل أو أن مبلغاً أو موعداً نهائياً حالياً موجود.',
   source:['https://stiftelser.lansstyrelsen.se/','↗ المصدر الأصلي: مجالس المحافظات – بحث المؤسسات'],
   action:'1. اعثر على مؤسسة محتملة في السجل ثم تواصل مع المؤسسة أو افتح مصدرها الأولي الحالي للتحقق من الغرض والمنطقة وفترة التقديم والمستندات وطريقة التقديم. إذا تعذر التحقق يبقى الأمر في مرحلة الاستكشاف.'
  }
 },
 fa:{
  planTitle:'برنامه اقدام بعدی',
  loan:{
   tag:'در CSN بررسی کن',
   title:'کمک‌هزینه تحصیلی: کمک و وام دانشجویی',
   lead:'حمایت تحصیلی CSN می‌تواند شامل کمک و وام باشد. این مسیر مربوط به بخش وام است. دستیار حمایت درباره واجد شرایط بودن، مبلغ یا شرایط تصمیم نمی‌گیرد.',
   source:['https://www.csn.se/bidrag-och-lan/studiestod.html','↗ منبع اصلی: CSN – حمایت تحصیلی'],
   action:'1. ابتدا بخش وام را در CSN بررسی کن و شرایط جاری، مبلغ، بازپرداخت و مسیر درخواست را در منبع اصلی تأیید کن؛ پیش از آن فرض نکن وام برای وضعیت تو مناسب است.'
  },
  scholarship:{
   tag:'کشف – بررسی لازم',
   title:'بورسیه از بنیاد مربوط درخواست می‌شود',
   lead:'جست‌وجوی بنیادهای استانداری یک فهرست برای پیدا کردن بنیادهاست. وجود بنیاد در فهرست ثابت نمی‌کند که درخواست باز است، تو واجد شرایطی، مبلغی موجود است یا مهلت جاری وجود دارد.',
   source:['https://stiftelser.lansstyrelsen.se/','↗ منبع اصلی: استانداری – جست‌وجوی بنیادها'],
   action:'1. یک بنیاد احتمالی در فهرست پیدا کن و سپس با بنیاد تماس بگیر یا منبع اصلی و جاری آن را باز کن تا هدف، محدوده جغرافیایی، دوره درخواست، مدارک و مسیر درخواست را تأیید کنی. اگر قابل تأیید نیست، نتیجه فقط در حد کشف می‌ماند.'
  }
 }
};

const PRIVATE_RESULT_COPY={
 sv:{
  planTitle:'Din handlingsplan',
  loan:{
   tag:'Kontrollera kostnad och villkor',
   title:'Lån kostar pengar',
   lead:'Den här vägen gäller privat lån, inte bidrag eller stöd. Konsumentverket rekommenderar att du bara lånar om du behöver och har råd, samt att du jämför villkor och kostnader. Stödassistenten väljer inte långivare, gör ingen kreditprövning och lovar inte att ett lån kan beviljas.',
   source:['https://www.konsumentverket.se/ekonomi/lana-pengar/','↗ Originalkälla: Konsumentverket – låna pengar'],
   action:'1. Öppna Konsumentverkets vägledning om lån. Kontrollera om lån verkligen är nödvändigt, jämför effektiv ränta, avgifter och villkor och läs avtalet innan du ansöker. Stödassistenten avgör inte kreditvärdighet eller beviljande.'
  },
  scholarship:{
   tag:'Discovery – verifiera',
   title:'Stiftelser och stipendier',
   lead:'Länsstyrelsens Stiftelsesök är ett register som kan hjälpa dig hitta stiftelser. En registerträff bevisar inte att ansökan är öppen, att du är behörig, vilket belopp som finns eller vilken deadline som gäller.',
   source:['https://stiftelser.lansstyrelsen.se/','↗ Originalkälla: Länsstyrelsen – Stiftelsesök'],
   action:'1. Hitta en möjlig stiftelse i Stiftelsesök och öppna den aktuella stiftelsen eller dess primärkälla för att verifiera ändamål, geografi, ansökningsperiod, underlag och ansökningsväg. Om det inte kan verifieras stannar resultatet vid discovery.'
  }
 },
 ar:{
  planTitle:'خطة العمل التالية',
  loan:{
   tag:'تحقق من التكلفة والشروط',
   title:'القرض له تكلفة',
   lead:'هذا المسار يتعلق بقرض شخصي وليس بمنحة أو دعم. توصي هيئة حماية المستهلك بالاقتراض فقط عند الحاجة والقدرة على السداد وبمقارنة الشروط والتكاليف. لا يختار مساعد الدعم المقرض ولا يجري تقييماً ائتمانياً ولا يضمن الموافقة.',
   source:['https://www.konsumentverket.se/ekonomi/lana-pengar/','↗ المصدر الأصلي: هيئة حماية المستهلك – اقتراض المال'],
   action:'1. افتح إرشادات هيئة حماية المستهلك حول القروض. تحقق أولاً من أن القرض ضروري ويمكنك تحمله، وقارن الفائدة الفعلية والرسوم والشروط واقرأ العقد قبل التقديم. مساعد الدعم لا يقرر الجدارة الائتمانية أو الموافقة.'
  },
  scholarship:{
   tag:'اكتشاف – تحقق',
   title:'المؤسسات والمنح',
   lead:'بحث المؤسسات لدى مجالس المحافظات هو سجل يمكن أن يساعدك في العثور على مؤسسات. وجود نتيجة في السجل لا يثبت أن التقديم مفتوح أو أنك مؤهل أو أن مبلغاً أو موعداً نهائياً حالياً موجود.',
   source:['https://stiftelser.lansstyrelsen.se/','↗ المصدر الأصلي: مجالس المحافظات – بحث المؤسسات'],
   action:'1. اعثر على مؤسسة محتملة في السجل ثم افتح المؤسسة المعنية أو مصدرها الأولي الحالي للتحقق من الغرض والمنطقة وفترة التقديم والمستندات وطريقة التقديم. إذا تعذر التحقق يبقى الأمر في مرحلة الاستكشاف.'
  }
 },
 fa:{
  planTitle:'برنامه اقدام بعدی',
  loan:{
   tag:'هزینه و شرایط را بررسی کن',
   title:'وام هزینه دارد',
   lead:'این مسیر درباره وام شخصی است، نه کمک‌هزینه یا حمایت. اداره حمایت از مصرف‌کننده توصیه می‌کند فقط در صورت نیاز و توان بازپرداخت وام بگیری و شرایط و هزینه‌ها را مقایسه کنی. دستیار حمایت وام‌دهنده انتخاب نمی‌کند، اعتبارسنجی انجام نمی‌دهد و تأیید وام را تضمین نمی‌کند.',
   source:['https://www.konsumentverket.se/ekonomi/lana-pengar/','↗ منبع اصلی: اداره حمایت از مصرف‌کننده – وام گرفتن'],
   action:'1. راهنمای اداره حمایت از مصرف‌کننده درباره وام را باز کن. بررسی کن که وام واقعاً لازم و قابل پرداخت است، نرخ مؤثر، کارمزدها و شرایط را مقایسه کن و پیش از درخواست قرارداد را بخوان. دستیار حمایت درباره اعتبار یا تأیید وام تصمیم نمی‌گیرد.'
  },
  scholarship:{
   tag:'کشف – بررسی لازم',
   title:'بنیادها و بورسیه‌ها',
   lead:'جست‌وجوی بنیادهای استانداری یک فهرست برای پیدا کردن بنیادهاست. وجود یک نتیجه در فهرست ثابت نمی‌کند که درخواست باز است، تو واجد شرایطی، مبلغی موجود است یا مهلت جاری وجود دارد.',
   source:['https://stiftelser.lansstyrelsen.se/','↗ منبع اصلی: استانداری – جست‌وجوی بنیادها'],
   action:'1. یک بنیاد احتمالی پیدا کن و سپس بنیاد مربوط یا منبع اصلی و جاری آن را باز کن تا هدف، محدوده جغرافیایی، دوره درخواست، مدارک و مسیر درخواست را تأیید کنی. اگر قابل تأیید نیست، نتیجه فقط در حد کشف می‌ماند.'
  }
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
  if(intent==='loan'||intent==='scholarship')go('generalR');
  else go('general1');
 }catch(error){
  console.error('private funding continuity failed closed',error);
 }
}

function continueRelative(){
 try{
  scenario='general';
  answers={fundingIntent:intent};
  resetPersonFeedback();
  go('general1');
 }catch(error){
  console.error('relative funding continuity failed closed',error);
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

function findPersonActionPlan(host,planTitle){
 for(const section of host.querySelectorAll('section.card')){
  const title=section.querySelector('h2');
  if(title&&String(title.textContent||'').trim()===planTitle)return section;
 }
 return null;
}

function specializePersonFundingResult(host,currentScreen,currentScenario,actorType,copyByLocale,errorPrefix){
 if(actor!==actorType||currentScenario!=='general'||currentScreen!=='generalR')return;
 if(intent!=='loan'&&intent!=='scholarship')return;
 const locale=personLocale();
 const localeCopy=copyByLocale[locale]||copyByLocale.sv;
 const copy=localeCopy[intent];
 if(!copy)return;
 const article=host.querySelector('article.result');
 const actionPlan=findPersonActionPlan(host,localeCopy.planTitle);
 if(!article||!actionPlan){
  console.error(`${errorPrefix} result failed closed: expected result structure missing`);
  return;
 }
 const title=article.querySelector('.rhead b');
 const tag=article.querySelector('.tag');
 const info=article.querySelector('.info');
 const source=article.querySelector('a.source');
 if(!title||!tag||!info||!source){
  console.error(`${errorPrefix} result failed closed: expected result fields missing`);
  return;
 }
 article.dataset.fundingIntentResult=intent;
 title.textContent=copy.title;
 tag.textContent=copy.tag;
 info.textContent=copy.lead;
 source.href=copy.source[0];
 source.textContent=copy.source[1];
 actionPlan.dataset.fundingIntentActionPlan=intent;
 const firstStep=actionPlan.querySelector('.info');
 if(firstStep)firstStep.textContent=copy.action;
 else console.error(`${errorPrefix} action failed closed: expected action step missing`);
}

function specializeStudentFundingResult(host,currentScreen,currentScenario){
 specializePersonFundingResult(host,currentScreen,currentScenario,'student',STUDENT_RESULT_COPY,'student funding intent');
}

function specializePrivateFundingResult(host,currentScreen,currentScenario){
 specializePersonFundingResult(host,currentScreen,currentScenario,'private_person',PRIVATE_RESULT_COPY,'private funding intent');
}

function decoratePerson(){
 if(actor!=='student'&&actor!=='private_person'&&actor!=='association'&&actor!=='relative')return;
 const host=document.getElementById('main');
 if(!host)return;
 let currentScreen='';
 let currentScenario='';
 try{currentScreen=screen;currentScenario=scenario;}catch(_){return;}
 pruneAssociationProcurement();
 specializeStudentFundingResult(host,currentScreen,currentScenario);
 specializePrivateFundingResult(host,currentScreen,currentScenario);
 if(document.getElementById('fundingIntentContext'))return;
 const text=personText(actor);
 let handler=null;
 let actionName='';
 if(currentScreen==='home'){
  if(actor==='student'){handler=continueStudent;actionName='continue';}
  if(actor==='private_person'){handler=continuePrivate;actionName='private';}
  if(actor==='association'){handler=continueAssociation;actionName='association-funding';}
  if(actor==='relative'){handler=continueRelative;actionName='relative';}
 }
 const card=makeContextCard(text.copy,text.label,text.description,text.action,actionName,handler);
 if(currentScreen==='home'){
  const hero=host.querySelector('.hero');
  if(hero)hero.insertAdjacentElement('afterend',card);else host.prepend(card);
  return;
 }
 if((actor==='student'||actor==='private_person'||actor==='relative')&&currentScenario==='general'){
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
 if(actor!=='student'&&actor!=='private_person'&&actor!=='association'&&actor!=='relative')return false;
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

const COMPANY_RESULT_COPY={
 loan:{
  tag:'Lån / företagsfinansiering',
  title:'Lån är inte bidrag',
  lead:'Den här resan gäller lånefinansiering. Stödassistenten har ännu ingen verifierad automatisk lånematchning för företag och påstår därför inte att ett visst lån passar eller kan beviljas.',
  bullets:[
   'Börja med den officiella vägledningen om företagslån och kontrollera sedan ränta, avgifter, amortering, säkerheter och övriga villkor direkt hos den aktuella långivaren.',
   'Jämför flera finansieringsvägar och kontrollera aktuell produktinformation i originalkällan innan företaget ansöker eller accepterar ett erbjudande.',
   'Behandla inte ett lån som bidrag: lånefinansiering innebär återbetalning och en långivare gör sin egen bedömning.'
  ],
  sources:[
   ['https://verksamt.se/node/229','↗ verksamt.se – Banklån för företag'],
   ['https://verksamt.se/finansiering-radgivning','↗ verksamt.se – Finansiering och rådgivning']
  ],
  action:'Nästa handling: öppna den officiella lånevägledningen, välj vilken lånetyp eller långivare som är relevant för företagets behov och verifiera aktuella villkor direkt hos den aktören. Stödassistenten avgör inte kreditvärdighet eller beviljande.'
 },
 scholarship:{
  tag:'Bidrag / offentligt företagsstöd',
  title:'Bidrag och stöd kräver en aktuell primär utlysning',
  lead:'Den här resan gäller bidrag eller företagsstöd, inte lån. Stödassistenten har ännu bara generell finansieringsdiscovery här och påstår inte att ett visst stöd finns öppet eller att företaget uppfyller villkoren.',
  bullets:[
   'Börja i officiella finansieringskällor och leta efter en aktuell stödform eller utlysning som passar företagets syfte, plats och verksamhet.',
   'Öppna sedan den beslutande aktörens primärkälla och kontrollera målgrupp, villkor, medfinansiering, period, deadline/status och ansökningsväg.',
   'Håll bidrag/stöd åtskilt från lån och verifiera alltid den faktiska möjligheten innan företaget lägger tid på en ansökan.'
  ],
  sources:[
   ['https://verksamt.se/finansiering-radgivning','↗ verksamt.se – Finansiering och rådgivning'],
   ['https://verksamt.se/finansiering-radgivning/offentlig-finansiering','↗ verksamt.se – Att söka offentlig finansiering']
  ],
  action:'Nästa handling: hitta en aktuell bidrags-/stödutlysning i en officiell källa och kontrollera den mot den beslutande aktörens originalkälla. Om ingen aktuell utlysning kan verifieras ska resan stanna vid discovery, inte bli en matchnings- eller behörighetsclaim.'
 }
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

function findCompanyFundingResult(host){
 for(const article of host.querySelectorAll('article.result')){
  const tag=article.querySelector('.tag');
  if(tag&&String(tag.textContent||'').includes('Finansiering'))return article;
 }
 return null;
}

function findCompanyActionPlan(host){
 for(const section of host.querySelectorAll('section.card')){
  const title=section.querySelector('h2');
  if(title&&String(title.textContent||'').trim()==='Gör så här nu')return section;
 }
 return null;
}

function specializeCompanyFundingResult(host){
 if(intent==='funding')return;
 let currentStep;
 try{currentStep=state.step;}catch(_){return;}
 if(currentStep!==STEP.RESULT)return;
 const copy=COMPANY_RESULT_COPY[intent];
 if(!copy)return;
 const article=findCompanyFundingResult(host);
 const actionPlan=findCompanyActionPlan(host);
 if(!article||!actionPlan){
  console.error('company funding intent result failed closed: expected result structure missing');
  return;
 }
 article.dataset.fundingIntentResult=intent;
 article.replaceChildren();
 const tag=document.createElement('span');
 tag.className='tag';
 tag.textContent=copy.tag;
 const title=document.createElement('h3');
 title.textContent=copy.title;
 const lead=document.createElement('p');
 lead.textContent=copy.lead;
 const list=document.createElement('ul');
 list.className='checklist';
 for(const item of copy.bullets){
  const li=document.createElement('li');
  li.textContent=item;
  list.append(li);
 }
 article.append(tag,title,lead,list);
 for(const source of copy.sources){
  const link=document.createElement('a');
  link.className='source';
  link.target='_blank';
  link.rel='noopener';
  link.href=source[0];
  link.textContent=source[1];
  article.append(link);
 }
 actionPlan.dataset.fundingIntentActionPlan=intent;
 const actionBox=actionPlan.querySelector('.actionbox');
 if(actionBox)actionBox.textContent=copy.action;
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
 specializeCompanyFundingResult(host);
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
 root.StodFundingIntentContinuity=Object.freeze({version:'1.5.0',intent,page,actor});
}
})(window);