(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.STODBereavementGuidance=api;api.init(root);}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  // v74 extends the SAME relative/person intelligence with a life-event boundary.
  // It never decides survivor-benefit entitlement, inheritance, work-injury status,
  // amount, deadline or who may act for an estate from free text.
  const AFTER_GUIDE_URL='https://www.efterlevandeguiden.se/';
  const PM_SURVIVOR_URL='https://www.pensionsmyndigheten.se/for-pensionarer/Ekonomiskt_stod/ekonomiskt-stod-nar-anhorig-dor';
  const PM_WORK_URL='https://www.pensionsmyndigheten.se/for-pensionarer/Ekonomiskt_stod/ersattning-vid-arbetsrelaterat-dodsfall';
  const SKV_DEATH_URL='https://www.skatteverket.se/privat/folkbokforing/dodsfall.4.18e1b10334ebe8bc80002760.html';
  const FEEDBACK_URL='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const CONTEXTS=new Set(['partner_support','child_support','practical','work_related','unsure']);

  const DEATH=/(?:dött|död|avlid(?:it|en|na)?|dödsfall|efterlevande|dog\b|توف(?:ي|ى)|وفاة|متوف|فقدت|درگذشت|فوت\s+کرد|فوت\s+شده|بازمانده)/i;
  const PERSONAL=/(?:min\s+(?:man|fru|make|maka|sambo|partner|mamma|pappa|mor|far|förälder|son|dotter)|mitt\s+barns\s+(?:mamma|pappa|förälder)|en\s+(?:anhörig|närstående)|زوجي|زوجتي|شريكي|والدي|والدتي|أمي|أبي|قريب|همسرم|شریکم|پدرم|مادرم|نزدیکم)/i;
  const DIRECT=/(?:efterlevandepension|omställningspension|barnpension|efterlevandestöd|efterlevandeguiden|دعم\s+الناجين|معاش\s+الناجين|معاش\s+الطفل|حقوق\s+بازماندگان|مستمری\s+بازماندگان)/i;
  const PROFESSIONAL=/(?:jobbar\s+med|arbetar\s+med|handläggare|begravningsbyrå|utbildning\s+om|uppsats\s+om|research|statistik\s+om|أعمل\s+في|بحث\s+عن|دراسة\s+عن|کار\s+می(?:‌|\s)*کنم|پژوهش|تحقیق\s+درباره)/i;
  const CHILD=/(?:mitt\s+barns\s+(?:mamma|pappa|förälder)|barnets\s+(?:mamma|pappa|förälder)|barnpension|efterlevandestöd\s+till\s+barn|والد\s+طفلي|والدة\s+طفلي|معاش\s+الطفل|پدر\s+فرزندم|مادر\s+فرزندم|مستمری\s+کودک)/i;
  const PARTNER=/(?:min\s+(?:man|fru|make|maka|sambo|partner)|omställningspension|زوجي|زوجتي|شريكي|همسرم|شریکم)/i;
  const PRACTICAL=/(?:dödsbo|bouppteckning|begravning|dödsfallsintyg|arvskifte|checklista\s+efter|تركة|حصر\s+الإرث|الجنازة|شهادة\s+الوفاة|مراسم\s+تدفین|گواهی\s+فوت|انحصار\s+وراثت|امور\s+متوفی)/i;
  const WORK_RELATED=/(?:arbetsskada|arbetsolycka|arbetsrelaterat\s+dödsfall|dog\s+(?:på|i)\s+jobbet|توفي.*(?:العمل|حادث\s+عمل)|وفاة.*(?:العمل|حادث\s+عمل)|فوت.*(?:کار|حادثه\s+کاری)|درگذشت.*(?:کار|حادثه\s+کاری))/i;

  const COPY={
    sv:{
      shellTitle:'När någon nära har dött',shellSub:'Skilj praktiska steg, stöd till partner/barn och arbetsrelaterat dödsfall',
      eyebrow:'Efter ett dödsfall',title:'Vad behöver du hjälp med först?',intro:'Stödassistenten hjälper dig välja första kontrollväg. Den avgör inte rätt till ersättning, arv, dödsbodelägarskap eller om ett dödsfall är arbetsrelaterat.',
      partner:'Ekonomiskt stöd efter att partner, make/maka eller sambo har dött',child:'Stöd till barn efter att en förälder har dött',practical:'Praktiska steg – dödsfallsintyg, begravning eller dödsbo',work:'Dödsfallet kan vara arbetsrelaterat',unsure:'Jag är osäker / behöver en överblick',
      partnerTitle:'Börja med efterlevandepension – men anta inte att relationen räcker',partnerBody:'Pensionsmyndigheten samlar de aktuella efterlevandeförmånerna och beskriver när en ansökan kan behövas. Kontrollera den aktuella sidan för just relationen och situationen. Stödassistenten ska inte avgöra omställningspension, änkepension, belopp eller ansökningskrav från din berättelse.',
      childTitle:'Barnpension och efterlevandestöd är en egen väg att kontrollera',childBody:'Pensionsmyndigheten beskriver stöd till barn efter en förälders död. Ålder, studier, bosättning och andra omständigheter kan påverka vägen. Kontrollera aktuella villkor i primärkällan i stället för att anta rätt utifrån släktskap.',
      practicalTitle:'Börja med den gemensamma Efterlevandeguiden',practicalBody:'Efterlevandeguiden är ett samarbete mellan Försäkringskassan, Pensionsmyndigheten och Skatteverket och samlar vad som behöver göras först, månaderna efter och följande år. Använd checklistan och Skatteverkets aktuella dödsboinformation; Stödassistenten ska inte ge ett individuellt arvs- eller bouppteckningsbeslut.',
      workTitle:'Arbetsrelaterat dödsfall har ett separat ersättningsspår',workBody:'Pensionsmyndigheten har särskild information om ersättning vid arbetsrelaterat dödsfall. Kontrollera den aktuella primärkällan och ansvarig myndighets bedömning. Att dödsfallet skedde på eller nära arbetet är inte i sig ett automatiskt beslut om arbetsskada eller ersättning.',
      unsureTitle:'Ta en sak i taget – börja med den officiella checklistan',unsureBody:'Om du inte vet vilket spår som är viktigast, börja i Efterlevandeguiden. Därifrån kan du skilja praktiska dödsbosteg från ekonomiskt stöd till efterlevande och andra särskilda vägar.',
      sourceGuide:'Efterlevandeguiden: officiell checklista',sourcePension:'Pensionsmyndigheten: ekonomiskt stöd när anhörig dör',sourceWork:'Pensionsmyndigheten: arbetsrelaterat dödsfall',sourceSkv:'Skatteverket: när en anhörig dör',
      privacy:'Skriv inte namn, personnummer, dödsorsak, exakta tillgångar/skulder, testamentsinnehåll, dödsfallsintyg eller rå berättelse i länken eller feedbacken.',
      feedback:'Hjälp oss förbättra den här vägen',learned:'Fick du reda på något nytt?',useful:'Var hjälpen användbar?',clear:'Var nästa steg tydligt?',yes:'Ja',no:'Nej',send:'Skicka anonym feedback',needAnswers:'Svara på de tre frågorna ovan innan du skickar.',sent:'Tack! Endast strukturerad produktfeedback skickades.',error:'Feedbacken kunde inte skickas just nu.',home:'Till Stödassistentens startsida'
    },
    ar:{
      shellTitle:'عندما يتوفى شخص قريب',shellSub:'افصل الخطوات العملية عن دعم الشريك/الطفل والوفاة المرتبطة بالعمل',eyebrow:'بعد وفاة شخص قريب',title:'ما الذي تحتاج مساعدة فيه أولاً؟',intro:'يساعدك Stödassistenten على اختيار أول مسار للتحقق. لا يقرر الاستحقاق أو الميراث أو من يملك صلاحية إدارة التركة.',
      partner:'دعم اقتصادي بعد وفاة الزوج/الزوجة أو الشريك',child:'دعم طفل بعد وفاة أحد الوالدين',practical:'خطوات عملية: شهادة وفاة أو جنازة أو تركة',work:'قد تكون الوفاة مرتبطة بالعمل',unsure:'لست متأكداً / أحتاج نظرة عامة',
      partnerTitle:'ابدأ بمسار معاشات الناجين ولا تفترض أن العلاقة وحدها تكفي',partnerBody:'تجمع Pensionsmyndigheten مسارات دعم الناجين وتوضح متى قد يلزم طلب. تحقق من الصفحة الحالية للحالة الفعلية؛ لا يقرر المنتج الاستحقاق أو المبلغ من القصة.',
      childTitle:'دعم الطفل بعد وفاة الوالد مسار مستقل للتحقق',childBody:'توضح Pensionsmyndigheten دعم الأطفال بعد وفاة أحد الوالدين. قد تؤثر السن والدراسة والإقامة وظروف أخرى؛ تحقق من المصدر الحالي ولا تستنتج الاستحقاق من صلة القرابة.',
      practicalTitle:'ابدأ بـ Efterlevandeguiden الرسمية',practicalBody:'Efterlevandeguiden تعاون بين Försäkringskassan وPensionsmyndigheten وSkatteverket وتجمع الخطوات الأولى وما يأتي لاحقاً. استخدم القائمة والمعلومات الرسمية ولا تعتبر المنتج قراراً في الإرث أو التركة.',
      workTitle:'للوفاة المرتبطة بالعمل مسار منفصل',workBody:'لدى Pensionsmyndigheten معلومات خاصة بهذا المسار. تحقق من المصدر الحالي ومن تقييم الجهة المسؤولة؛ وقوع الوفاة في مكان العمل لا يعني تلقائياً قراراً بالاستحقاق.',
      unsureTitle:'خذ خطوة واحدة في كل مرة',unsureBody:'إذا لم تعرف المسار الأهم، ابدأ بالقائمة الرسمية في Efterlevandeguiden ثم افصل الخطوات العملية عن الدعم الاقتصادي والمسارات الخاصة.',
      sourceGuide:'Efterlevandeguiden: القائمة الرسمية',sourcePension:'Pensionsmyndigheten: دعم اقتصادي بعد الوفاة',sourceWork:'Pensionsmyndigheten: وفاة مرتبطة بالعمل',sourceSkv:'Skatteverket: عند وفاة قريب',privacy:'لا ترسل الاسم أو الرقم الشخصي أو سبب الوفاة أو تفاصيل الأصول/الديون أو الوصية أو شهادة الوفاة أو القصة الخام.',feedback:'ساعدنا على تحسين هذا المسار',learned:'هل عرفت شيئاً جديداً؟',useful:'هل كانت المساعدة مفيدة؟',clear:'هل كانت الخطوة التالية واضحة؟',yes:'نعم',no:'لا',send:'إرسال ملاحظات مجهولة',needAnswers:'أجب عن الأسئلة الثلاثة قبل الإرسال.',sent:'شكراً! أُرسلت فقط ملاحظات منظمة.',error:'تعذر إرسال الملاحظات الآن.',home:'العودة إلى الصفحة الرئيسية'
    },
    fa:{
      shellTitle:'وقتی یکی از نزدیکان فوت می‌کند',shellSub:'کارهای عملی، حمایت همسر/کودک و فوت مرتبط با کار را جدا کنید',eyebrow:'پس از فوت یک نزدیک',title:'اول برای چه چیزی کمک می‌خواهید؟',intro:'Stödassistenten فقط مسیر بررسی اول را جدا می‌کند. این محصول درباره استحقاق، ارث یا اختیار اداره ترکه تصمیم نمی‌گیرد.',
      partner:'حمایت مالی پس از فوت همسر یا شریک',child:'حمایت کودک پس از فوت یکی از والدین',practical:'کارهای عملی: گواهی فوت، مراسم یا امور متوفی',work:'ممکن است فوت مرتبط با کار باشد',unsure:'مطمئن نیستم / یک نمای کلی می‌خواهم',
      partnerTitle:'از حمایت بازماندگان شروع کنید، اما رابطه را به‌تنهایی کافی ندانید',partnerBody:'Pensionsmyndigheten مسیرهای حمایت بازماندگان و موارد نیاز به درخواست را توضیح می‌دهد. وضعیت واقعی را در منبع فعلی بررسی کنید؛ محصول از روایت شما استحقاق یا مبلغ را تعیین نمی‌کند.',
      childTitle:'حمایت کودک پس از فوت والد یک مسیر جداست',childBody:'Pensionsmyndigheten حمایت کودکان پس از فوت والد را توضیح می‌دهد. سن، تحصیل، محل اقامت و عوامل دیگر می‌تواند مهم باشد؛ منبع فعلی را بررسی کنید.',
      practicalTitle:'از Efterlevandeguiden رسمی شروع کنید',practicalBody:'Efterlevandeguiden همکاری Försäkringskassan، Pensionsmyndigheten و Skatteverket است و کارهای ابتدا و ماه‌ها/سال بعد را جمع می‌کند. از چک‌لیست استفاده کنید؛ محصول تصمیم ارث یا ترکه نمی‌دهد.',
      workTitle:'فوت مرتبط با کار مسیر جداگانه‌ای دارد',workBody:'Pensionsmyndigheten اطلاعات ویژه این مسیر را دارد. منبع فعلی و ارزیابی نهاد مسئول را بررسی کنید؛ فوت در محل کار به‌تنهایی به معنی تأیید استحقاق نیست.',
      unsureTitle:'یک کار در هر مرحله',unsureBody:'اگر نمی‌دانید کدام مسیر مهم‌تر است، با چک‌لیست رسمی Efterlevandeguiden شروع کنید و بعد کارهای عملی را از حمایت مالی و مسیرهای خاص جدا کنید.',
      sourceGuide:'Efterlevandeguiden: چک‌لیست رسمی',sourcePension:'Pensionsmyndigheten: حمایت اقتصادی پس از فوت',sourceWork:'Pensionsmyndigheten: فوت مرتبط با کار',sourceSkv:'Skatteverket: وقتی یکی از نزدیکان فوت می‌کند',privacy:'نام، شماره شناسایی، علت فوت، جزئیات دارایی/بدهی، متن وصیت، گواهی فوت یا روایت خام را در لینک یا بازخورد نفرستید.',feedback:'به بهبود این مسیر کمک کنید',learned:'چیز جدیدی یاد گرفتید؟',useful:'کمک برای شما مفید بود؟',clear:'قدم بعدی روشن بود؟',yes:'بله',no:'خیر',send:'ارسال بازخورد ناشناس',needAnswers:'پیش از ارسال به هر سه پرسش پاسخ دهید.',sent:'سپاس! فقط بازخورد ساختاری ارسال شد.',error:'فعلاً ارسال بازخورد ممکن نیست.',home:'بازگشت به صفحه اصلی'
    }
  };

  function cleanLang(value){return value==='ar'||value==='fa'?value:'sv';}
  function cleanContext(value){return CONTEXTS.has(value)?value:'unsure';}
  function detect(text){
    const value=String(text||'');
    if(PROFESSIONAL.test(value))return false;
    if(DIRECT.test(value))return true;
    return DEATH.test(value)&&PERSONAL.test(value);
  }
  function detectContext(text){
    const value=String(text||'');
    if(WORK_RELATED.test(value))return 'work_related';
    if(CHILD.test(value))return 'child_support';
    if(PRACTICAL.test(value))return 'practical';
    if(PARTNER.test(value))return 'partner_support';
    return 'unsure';
  }
  function handoffHref(lang,context){
    const p=new URLSearchParams({actor_type:'relative',focus:'bereavement',bereavement_context:cleanContext(context),lang:cleanLang(lang)});
    return `person-pilot.html?${p.toString()}`;
  }

  function patchShell(root){
    try{
      if(typeof KEYWORDS==='undefined'||typeof I18N==='undefined')return;
      KEYWORDS.bereavement=['dött','avlidit','dödsfall','efterlevandepension','omställningspension','barnpension','dödsbo','bouppteckning','وفاة','توفي','معاش الناجين','تركة','فوت','درگذشت','بازماندگان','ترکه'];
      const routeCopy={
        sv:['När någon nära har dött','Praktiska steg, efterlevandestöd och särskilda ersättningsspår','person-pilot.html?actor_type=relative&focus=bereavement'],
        ar:['عندما يتوفى شخص قريب','الخطوات العملية ودعم الناجين والمسارات الخاصة','person-pilot.html?actor_type=relative&focus=bereavement'],
        fa:['وقتی یکی از نزدیکان فوت می‌کند','کارهای عملی، حمایت بازماندگان و مسیرهای خاص','person-pilot.html?actor_type=relative&focus=bereavement']
      };
      for(const code of ['sv','ar','fa'])if(I18N[code]&&I18N[code].routes)I18N[code].routes.bereavement=routeCopy[code];
      if(typeof render==='function')render();
      const box=root.document.getElementById('engineResults');
      const input=root.document.getElementById('situation');
      if(!box||!input)return;
      const sanitize=()=>{
        const anchors=[...box.querySelectorAll('a.route')];
        for(const anchor of anchors){
          const u=new URL(anchor.href,root.location.href);
          if(u.searchParams.get('focus')!=='bereavement')continue;
          const story=String(input.value||'');
          if(!detect(story)){anchor.remove();continue;}
          const next=handoffHref(typeof lang!=='undefined'?lang:'sv',detectContext(story));
          if(anchor.getAttribute('href')!==next)anchor.setAttribute('href',next);
        }
      };
      new MutationObserver(sanitize).observe(box,{childList:true,subtree:true});
      box.addEventListener('click',sanitize,true);
    }catch(_err){/* shared shell stays usable */}
  }

  function initPerson(root){
    const params=new URLSearchParams(root.location.search);
    if(params.get('focus')!=='bereavement')return;
    const main=root.document.getElementById('main');
    if(!main)return;
    let currentLang=cleanLang(params.get('lang'));
    let context=cleanContext(params.get('bereavement_context'));
    const feedback={learned_new:null,useful:null,next_step_clear:null};

    function c(){return COPY[currentLang]||COPY.sv;}
    function setLanguage(next){currentLang=cleanLang(next);params.set('lang',currentLang);root.history.replaceState(null,'',`${root.location.pathname}?${params.toString()}`);renderPerson();}
    function choose(next){context=cleanContext(next);params.set('bereavement_context',context);root.history.replaceState(null,'',`${root.location.pathname}?${params.toString()}`);renderPerson();}
    function result(){
      const x=c();
      const map={
        partner_support:[x.partnerTitle,x.partnerBody,[[x.sourcePension,PM_SURVIVOR_URL],[x.sourceGuide,AFTER_GUIDE_URL]]],
        child_support:[x.childTitle,x.childBody,[[x.sourcePension,PM_SURVIVOR_URL],[x.sourceGuide,AFTER_GUIDE_URL]]],
        practical:[x.practicalTitle,x.practicalBody,[[x.sourceGuide,AFTER_GUIDE_URL],[x.sourceSkv,SKV_DEATH_URL]]],
        work_related:[x.workTitle,x.workBody,[[x.sourceWork,PM_WORK_URL],[x.sourceGuide,AFTER_GUIDE_URL]]],
        unsure:[x.unsureTitle,x.unsureBody,[[x.sourceGuide,AFTER_GUIDE_URL],[x.sourcePension,PM_SURVIVOR_URL],[x.sourceSkv,SKV_DEATH_URL]]]
      };
      return map[context]||map.unsure;
    }
    function feedbackHtml(){
      const x=c();
      const q=(key,label)=>`<div class="finalq"><b>${label}</b><div class="fbs"><button class="fb" type="button" data-fb="${key}" data-val="true" aria-pressed="${feedback[key]===true}">${x.yes}</button><button class="fb" type="button" data-fb="${key}" data-val="false" aria-pressed="${feedback[key]===false}">${x.no}</button></div></div>`;
      return `<section class="card"><h2>${x.feedback}</h2>${q('learned_new',x.learned)}${q('useful',x.useful)}${q('next_step_clear',x.clear)}<button class="btn primary" id="bereavementFeedbackSend" type="button">${x.send}</button><div class="status" id="bereavementFeedbackStatus" aria-live="polite"></div></section>`;
    }
    function bindFeedback(){
      main.querySelectorAll('[data-fb]').forEach(btn=>btn.addEventListener('click',()=>{
        const key=btn.dataset.fb;feedback[key]=btn.dataset.val==='true';
        main.querySelectorAll(`[data-fb="${key}"]`).forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
      }));
      const send=main.querySelector('#bereavementFeedbackSend');
      if(!send)return;
      send.addEventListener('click',async()=>{
        const status=main.querySelector('#bereavementFeedbackStatus');
        if(Object.values(feedback).some(v=>v===null)){
          status.textContent=c().needAnswers;status.className='status err';
          const first=main.querySelector('[data-fb]');if(first)first.focus();return;
        }
        const payload={app_version:'0.5.0',language:currentLang,flow:`relative_bereavement_${context}`,learned_new:feedback.learned_new,useful:feedback.useful,next_step_clear:feedback.next_step_clear,ratings:{}};
        try{
          const response=await root.fetch(FEEDBACK_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
          if(!response.ok)throw new Error('feedback');
          status.textContent=c().sent;status.className='status ok';send.disabled=true;
        }catch(_err){status.textContent=c().error;status.className='status err';}
      });
    }
    function renderPerson(){
      const x=c();const rtl=currentLang==='ar'||currentLang==='fa';
      root.document.documentElement.lang=currentLang;root.document.documentElement.dir=rtl?'rtl':'ltr';root.document.body.classList.toggle('rtl',rtl);
      const languages=`<div class="langs">${[['sv','Svenska'],['ar','العربية'],['fa','فارسی']].map(([code,label])=>`<button class="lang ${currentLang===code?'active':''}" type="button" data-lang="${code}" aria-pressed="${currentLang===code}">${label}</button>`).join('')}</div>`;
      let body='';
      if(context==='unsure'){
        body=`<section class="card"><h2>${x.title}</h2>${[['partner_support',x.partner],['child_support',x.child],['practical',x.practical],['work_related',x.work],['unsure',x.unsure]].map(([v,l])=>`<button class="choice" type="button" data-context="${v}">${l}</button>`).join('')}</section>`;
      }else{
        const [title,desc,sources]=result();
        body=`<section class="card"><h2>${title}</h2><p>${desc}</p><div class="privacy">${x.privacy}</div>${sources.map(([label,url])=>`<p><a class="source" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></p>`).join('')}<button class="back" type="button" data-context="unsure">${x.title}</button></section>${feedbackHtml()}`;
      }
      if(context==='unsure'){
        const [title,desc,sources]=result();
        body+=`<section class="card"><h3>${title}</h3><p>${desc}</p>${sources.map(([label,url])=>`<p><a class="source" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></p>`).join('')}</section>`;
      }
      main.innerHTML=`<section class="card hero"><div class="eyebrow">${x.eyebrow}</div><h1>${x.title}</h1><p class="muted">${x.intro}</p>${languages}<div class="privacy">🔒 ${x.privacy}</div></section>${body}<section class="card"><a class="source" href="index.html?lang=${currentLang}">${x.home}</a></section>`;
      main.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.lang)));
      main.querySelectorAll('[data-context]').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.context)));
      bindFeedback();
    }
    renderPerson();
  }

  function init(root){
    if(!root||!root.document)return;
    const path=(root.location&&root.location.pathname)||'';
    if(path.endsWith('person-pilot.html'))initPerson(root);else patchShell(root);
  }

  return Object.freeze({detect,detectContext,handoffHref,init,AFTER_GUIDE_URL,PM_SURVIVOR_URL,PM_WORK_URL,SKV_DEATH_URL});
});
