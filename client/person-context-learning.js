(() => {
  const FEEDBACK_URL='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const params=new URLSearchParams(window.location.search);
  const ALLOWED_PERSON_ACTORS=new Set(['private_person','relative','student','employee','association','other']);
  const ALLOWED_PERSON_FOCUS=new Set(['assistance']);
  const rawActor=params.get('actor_type')||'private_person';
  const sanitizedActor=String(rawActor).toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'private_person';
  const actor=ALLOWED_PERSON_ACTORS.has(sanitizedActor)?sanitizedActor:'other';
  const rawFocus=String(params.get('focus')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
  const focus=ALLOWED_PERSON_FOCUS.has(rawFocus)?rawFocus:'';
  const copy={
    sv:{heading:'Din ingång',private_person:'Privatperson',relative:'Anhörig / hjälper någon',student:'Student / ung vuxen',employee:'Anställd',association:'Förening',other:'Bred ingång'},
    ar:{heading:'مدخلك',private_person:'فرد',relative:'قريب / أساعد شخصاً',student:'طالب / شاب بالغ',employee:'موظف',association:'جمعية',other:'مدخل عام'},
    fa:{heading:'ورودی شما',private_person:'فرد',relative:'خویشاوند / کمک به دیگری',student:'دانشجو / جوان',employee:'کارمند',association:'انجمن',other:'ورودی عمومی'}
  };
  const assistanceCopy={
    sv:{
      who:'Vem gäller hjälpbehovet?',adult:'En vuxen',child:'Ett barn',unsure:'Vet inte / vill börja brett',
      need:'Gäller hjälpen grundläggande vardagsbehov?',basic:'Ja – till exempel hygien, toalett, måltider, på- och avklädning, kommunikation, andning eller löpande medicinskt stöd',other:'Nej – främst annan hjälp i vardagen',needUnsure:'Osäker på vad som räknas',
      extent:'Ungefär hur omfattande tror du hjälpen är under en vanlig vecka? Din egen uppskattning är bara en vägvisare – kommunen eller Försäkringskassan gör den formella bedömningen.',over:'Kan vara mer än 20 timmar för grundläggande behov',under:'Kan vara 20 timmar eller mindre',extentUnsure:'Vet inte',
      fkTitle:'Försäkringskassan – kontrollera assistansersättning',fkWhy:'Om den ansvariga myndighetens bedömning av grundläggande behov blir mer än 20 timmar per vecka kan den statliga assistansersättningen vara en väg att pröva. En egen timuppskattning är inte samma sak som myndighetens bedömning.',
      municipalityTitle:'Kommunen – be om bedömning av personlig assistans/LSS-stöd',municipalityWhy:'Om de grundläggande hjälpbehoven bedöms till 20 timmar eller mindre per vecka, eller om omfattningen ännu är oklar, anger Försäkringskassan kommunen som viktig väg. Kontakta din hemkommun och beskriv de konkreta hjälpbehoven.',
      describeTitle:'Förbered en konkret behovsbeskrivning',describeWhy:'Beskriv vad personen behöver hjälp med, hur ofta och på vilket sätt. Diagnos eller en egen uppskattning av timmar ska inte behandlas som ett beslut om rätt till assistans.',
      broadTitle:'Börja med kommunen och reda ut vilken stödform som passar',broadWhy:'Om hjälpen främst gäller andra vardagsbehov eller du är osäker på om de räknas som grundläggande behov, börja med hemkommunens LSS-/biståndshandläggning och be om vägledning. Produkten avgör inte rätt till stöd.'
    },
    ar:{
      who:'لمن تخص الحاجة إلى المساعدة؟',adult:'شخص بالغ',child:'طفل',unsure:'لا أعرف / أريد أن أبدأ بشكل عام',
      need:'هل تتعلق المساعدة باحتياجات يومية أساسية؟',basic:'نعم – مثل النظافة أو المرحاض أو الوجبات أو اللباس أو التواصل أو التنفس أو دعم طبي مستمر',other:'لا – هي أساساً مساعدة أخرى في الحياة اليومية',needUnsure:'لست متأكداً مما يُعد حاجة أساسية',
      extent:'تقريباً، ما حجم المساعدة خلال أسبوع عادي؟ تقديرك مجرد إشارة أولية؛ البلدية أو Försäkringskassan تقوم بالتقييم الرسمي.',over:'قد تتجاوز 20 ساعة للاحتياجات الأساسية',under:'قد تكون 20 ساعة أو أقل',extentUnsure:'لا أعرف',
      fkTitle:'Försäkringskassan – تحقق من مسار assistansersättning',fkWhy:'إذا قيّمت الجهة المسؤولة الاحتياجات الأساسية بأكثر من 20 ساعة أسبوعياً فقد يكون مسار التعويض الحكومي للمساعدة الشخصية مناسباً للفحص. تقديرك للساعات ليس قراراً رسمياً.',
      municipalityTitle:'البلدية – اطلب تقييماً للمساعدة الشخصية أو دعم LSS',municipalityWhy:'إذا قُيّمت الاحتياجات الأساسية بـ20 ساعة أو أقل أسبوعياً، أو إذا كان الحجم غير واضح بعد، تشير Försäkringskassan إلى البلدية كمسار مهم. تواصل مع بلديتك واشرح احتياجات المساعدة الملموسة.',
      describeTitle:'حضّر وصفاً ملموساً للاحتياجات',describeWhy:'صف ما يحتاج الشخص إلى مساعدة فيه، وكم مرة وكيف تُقدَّم المساعدة. التشخيص أو تقدير الساعات من الشخص نفسه لا يعني قراراً بالاستحقاق.',
      broadTitle:'ابدأ بالبلدية وحدد نوع الدعم المناسب',broadWhy:'إذا كانت المساعدة تخص احتياجات يومية أخرى أو لم يتضح إن كانت من الاحتياجات الأساسية، ابدأ بقسم LSS/المساعدات في بلديتك واطلب التوجيه. المنتج لا يقرر الاستحقاق.'
    },
    fa:{
      who:'نیاز به کمک مربوط به چه کسی است؟',adult:'یک بزرگسال',child:'یک کودک',unsure:'نمی‌دانم / می‌خواهم گسترده شروع کنم',
      need:'آیا کمک مربوط به نیازهای اساسی روزمره است؟',basic:'بله – مانند بهداشت، توالت، غذا، پوشیدن و درآوردن لباس، ارتباط، تنفس یا حمایت پزشکی مستمر',other:'نه – بیشتر کمک دیگری در زندگی روزمره است',needUnsure:'مطمئن نیستم چه چیزی نیاز اساسی محسوب می‌شود',
      extent:'تقریباً کمک در یک هفته معمولی چقدر است؟ برآورد خودت فقط راهنماست؛ شهرداری یا Försäkringskassan ارزیابی رسمی را انجام می‌دهد.',over:'ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد',under:'ممکن است ۲۰ ساعت یا کمتر باشد',extentUnsure:'نمی‌دانم',
      fkTitle:'Försäkringskassan – مسیر assistansersättning را بررسی کن',fkWhy:'اگر نهاد مسئول نیازهای اساسی را به طور متوسط بیش از ۲۰ ساعت در هفته ارزیابی کند، مسیر دولتی assistansersättning می‌تواند برای بررسی مرتبط باشد. برآورد شخصی ساعت‌ها معادل ارزیابی رسمی نیست.',
      municipalityTitle:'شهرداری – درخواست ارزیابی کمک شخصی یا حمایت LSS',municipalityWhy:'اگر نیازهای اساسی ۲۰ ساعت یا کمتر در هفته ارزیابی شود، یا میزان نیاز هنوز روشن نباشد، Försäkringskassan شهرداری را مسیر مهم می‌داند. با شهرداری محل سکونت تماس بگیر و نیازهای مشخص را توضیح بده.',
      describeTitle:'شرح مشخصی از نیازها آماده کن',describeWhy:'توضیح بده فرد در چه کارهایی، چند بار و به چه شکلی کمک لازم دارد. تشخیص یا برآورد شخصی ساعت‌ها نباید به عنوان تصمیم درباره حق دریافت کمک در نظر گرفته شود.',
      broadTitle:'از شهرداری شروع کن و نوع حمایت مناسب را روشن کن',broadWhy:'اگر کمک بیشتر مربوط به نیازهای دیگر روزمره است یا معلوم نیست نیاز اساسی محسوب می‌شود، با بخش LSS/حمایت شهرداری محل سکونت شروع کن. محصول درباره حق دریافت حمایت تصمیم نمی‌گیرد.'
    }
  };
  function lang(){const value=document.documentElement.lang||'sv';return copy[value]?value:'sv'}
  function label(){const c=copy[lang()];return c[actor]||c.other}
  function patchContext(){
    const pilot=document.getElementById('pilot');
    const actorLabel=label();
    if(pilot&&pilot.textContent!==actorLabel) pilot.textContent=actorLabel;
    const actorEyebrow=document.querySelector('#main > section.card:not(.hero) > .eyebrow');
    const heading=copy[lang()].heading;
    if(actorEyebrow&&actorEyebrow.textContent!==heading) actorEyebrow.textContent=heading;
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(url===FEEDBACK_URL&&init&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){
        const data=JSON.parse(init.body);
        if(data&&typeof data.flow==='string'){
          const flow=String(data.flow).toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,31)||'general';
          data.flow=`${actor}_${flow}`.slice(0,64);
          return nativeFetch(input,{...init,body:JSON.stringify(data)});
        }
      }
    }catch(_err){/* fail open to original request; backend validation remains authoritative */}
    return nativeFetch(input,init);
  };

  if(focus==='assistance'&&typeof flow==='function'&&typeof getRows==='function'&&typeof results==='function'&&typeof render==='function'){
    const baseFlow=flow;
    const baseGetRows=getRows;
    const baseResults=results;
    const adultSource='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna';
    const childSource='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn';
    const generalSource='https://www.forsakringskassan.se/press/vart-uppdrag-inom-assistansersattning';

    Object.assign(T.sv,{assistWho:'Vem gäller hjälpbehovet?',assistAdult:'En vuxen',assistChild:'Ett barn',assistWhoUnsure:'Vet inte / vill börja brett',assistNeed:'Gäller hjälpen grundläggande vardagsbehov?',assistBasic:'Ja – hygien, toalett, måltider, på- och avklädning, kommunikation, andning eller löpande medicinskt stöd',assistOther:'Nej – främst annan hjälp i vardagen',assistNeedUnsure:'Osäker på vad som räknas',assistExtent:'Ungefär hur omfattande tror du hjälpen är under en vanlig vecka? Din uppskattning är bara en vägvisare – myndigheten gör bedömningen.',assistOver:'Kan vara mer än 20 timmar för grundläggande behov',assistUnder:'Kan vara 20 timmar eller mindre',assistExtentUnsure:'Vet inte'});
    Object.assign(T.ar,{assistWho:'لمن تخص الحاجة إلى المساعدة؟',assistAdult:'شخص بالغ',assistChild:'طفل',assistWhoUnsure:'لا أعرف / أريد البدء بشكل عام',assistNeed:'هل تتعلق المساعدة باحتياجات يومية أساسية؟',assistBasic:'نعم – النظافة أو المرحاض أو الوجبات أو اللباس أو التواصل أو التنفس أو دعم طبي مستمر',assistOther:'لا – أساساً مساعدة أخرى في الحياة اليومية',assistNeedUnsure:'لست متأكداً مما يُعد أساسياً',assistExtent:'تقريباً ما حجم المساعدة في أسبوع عادي؟ تقديرك مجرد إشارة؛ الجهة المسؤولة تقوم بالتقييم.',assistOver:'قد تتجاوز 20 ساعة للاحتياجات الأساسية',assistUnder:'قد تكون 20 ساعة أو أقل',assistExtentUnsure:'لا أعرف'});
    Object.assign(T.fa,{assistWho:'نیاز به کمک مربوط به چه کسی است؟',assistAdult:'یک بزرگسال',assistChild:'یک کودک',assistWhoUnsure:'نمی‌دانم / گسترده شروع می‌کنم',assistNeed:'آیا کمک مربوط به نیازهای اساسی روزمره است؟',assistBasic:'بله – بهداشت، توالت، غذا، لباس، ارتباط، تنفس یا حمایت پزشکی مستمر',assistOther:'نه – بیشتر کمک دیگری در زندگی روزمره است',assistNeedUnsure:'مطمئن نیستم چه چیزی اساسی محسوب می‌شود',assistExtent:'تقریباً کمک در یک هفته معمولی چقدر است؟ برآورد تو فقط راهنماست؛ نهاد مسئول ارزیابی می‌کند.',assistOver:'ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد',assistUnder:'ممکن است ۲۰ ساعت یا کمتر باشد',assistExtentUnsure:'نمی‌دانم'});

    flow=function(){
      if(screen==='assist1') return q('assistWho',[[ 'assistAdult','assist2','assistWho','adult'],['assistChild','assist2','assistWho','child'],['assistWhoUnsure','assist2','assistWho','unsure']],'home','1 / 3');
      if(screen==='assist2') return q('assistNeed',[[ 'assistBasic','assist3','assistNeed','basic'],['assistOther','assist3','assistNeed','other'],['assistNeedUnsure','assist3','assistNeed','unsure']],'assist1','2 / 3');
      if(screen==='assist3') return q('assistExtent',[[ 'assistOver','assistR','assistExtent','over'],['assistUnder','assistR','assistExtent','under'],['assistExtentUnsure','assistR','assistExtent','unsure']],'assist2','3 / 3');
      return baseFlow();
    };
    getRows=function(){
      if(scenario!=='assistance') return baseGetRows();
      const c=assistanceCopy[lang()]||assistanceCopy.sv;
      const source=answers.assistWho==='child'?childSource:(answers.assistWho==='adult'?adultSource:generalSource);
      if(answers.assistNeed==='other') return [[c.broadTitle,c.broadWhy,source],[c.describeTitle,c.describeWhy,source]];
      if(answers.assistExtent==='over') return [[c.fkTitle,c.fkWhy,source],[c.municipalityTitle,c.municipalityWhy,source],[c.describeTitle,c.describeWhy,source]];
      if(answers.assistExtent==='under') return [[c.municipalityTitle,c.municipalityWhy,source],[c.describeTitle,c.describeWhy,source],[c.fkTitle,c.fkWhy,source]];
      return [[c.municipalityTitle,c.municipalityWhy,source],[c.fkTitle,c.fkWhy,source],[c.describeTitle,c.describeWhy,source]];
    };
    results=function(){
      if(scenario!=='assistance') return baseResults();
      const rows=getRows();
      return `${back()}<section class="card"><h1>${tr('results')}</h1><div class="notice">${tr('disclaimer')}</div></section>${rows.map((r,i)=>resultCard(r,i+2)).join('')}${actionPlan()}<section class="card"><h2>${tr('finish')}</h2>${finalQuestion('new','newQ')}${finalQuestion('useful','usefulQ')}${finalQuestion('clear','clearQ')}<div class="summary">🔒 ${tr('sendNote')}</div><button class="btn primary share" ${submitState==='sending'||submitState==='sent'?'disabled':''} onclick="submitFeedback()">${tr('send')}</button>${statusHtml()}</section>`;
    };
    if(screen==='home'){
      scenario='assistance';
      answers={};
      matchRatings={};
      finalFeedback={};
      submitState='idle';
      screen='assist1';
      render();
    }
  }

  const root=document.querySelector('.app');
  if(root){
    const observer=new MutationObserver(patchContext);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }
  patchContext();
})();