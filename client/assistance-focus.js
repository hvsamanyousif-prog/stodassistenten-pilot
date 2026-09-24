(() => {
  const params=new URLSearchParams(window.location.search);
  const focus=String(params.get('focus')||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
  if(focus!=='assistance') return;
  if(typeof flow!=='function'||typeof getRows!=='function'||typeof results!=='function'||typeof render!=='function') return;

  const assistanceCopy={
    sv:{
      fkTitle:'Försäkringskassan – kontrollera assistansersättning',fkWhy:'Om den ansvariga myndighetens bedömning av grundläggande behov blir mer än 20 timmar per vecka kan den statliga assistansersättningen vara en väg att pröva. En egen timuppskattning är inte samma sak som myndighetens bedömning.',
      fkWhyAdult:'Mer än 20 timmar enligt din egen uppskattning är inte ensamt ett besked om rätt till assistansersättning. Försäkringskassans aktuella källa anger också att funktionsnedsättningen ska ingå i LSS, att du ska bo i Sverige och att du ska vara 66 år eller yngre. De uppgifterna har piloten inte fastställt här. Kontrollera dem i originalkällan innan du går vidare.',
      fkWhyChild:'Mer än 20 timmar enligt din egen uppskattning är inte ensamt ett besked om rätt till assistansersättning. Försäkringskassans aktuella källa anger också att barnets funktionsnedsättning ska ingå i LSS och att barnet ska bo i Sverige. För barn 0–17 år gör Försäkringskassan dessutom ett föräldraavdrag. De uppgifterna har piloten inte fastställt här. Kontrollera dem i originalkällan innan du går vidare.',
      fkUnsureAdultTitle:'Försäkringskassan – kontrollera vuxenvägen',fkWhyUnsureAdult:'Du har valt att börja brett, så piloten har inte fastställt om hjälpbehovet gäller en vuxen eller ett barn. För vuxen anger Försäkringskassans aktuella källa bland annat att funktionsnedsättningen ska ingå i LSS, att personen ska bo i Sverige och vara 66 år eller yngre. Detta är inte fastställt här. Kontrollera vuxenkällan om den vägen gäller.',
      fkUnsureChildTitle:'Försäkringskassan – kontrollera barnvägen',fkWhyUnsureChild:'Du har valt att börja brett, så piloten har inte fastställt om hjälpbehovet gäller en vuxen eller ett barn. För barn anger Försäkringskassans aktuella källa bland annat att barnets funktionsnedsättning ska ingå i LSS och att barnet ska bo i Sverige; för 0–17 år görs dessutom ett föräldraavdrag. Detta är inte fastställt här. Kontrollera barnkällan om den vägen gäller.',
      municipalityTitle:'Kommunen – be om bedömning av personlig assistans/LSS-stöd',municipalityWhy:'Om de grundläggande hjälpbehoven bedöms till 20 timmar eller mindre per vecka, eller om omfattningen ännu är oklar, anger Försäkringskassan kommunen som viktig väg. Kontakta din hemkommun och beskriv de konkreta hjälpbehoven.',
      describeTitle:'Förbered en konkret behovsbeskrivning',describeWhy:'Beskriv vad personen behöver hjälp med, hur ofta och på vilket sätt. Diagnos eller en egen uppskattning av timmar ska inte behandlas som ett beslut om rätt till assistans.',
      broadTitle:'Börja med kommunen och reda ut vilken stödform som passar',broadWhy:'Du har sagt att hjälpen främst gäller andra vardagsbehov. Det räcker inte för att avgöra om LSS gäller. LSS anger att kommunen ansvarar för insatser enligt 9 § 2–10. Kontakta hemkommunen och be om vägledning till rätt ingång. Om LSS inte passar kan annat kommunalt stöd behöva bedömas enligt andra regler. Produkten avgör inte rätt till stöd.'
    },
    ar:{
      fkTitle:'Försäkringskassan – تحقق من مسار assistansersättning',fkWhy:'إذا قيّمت الجهة المسؤولة الاحتياجات الأساسية بأكثر من 20 ساعة أسبوعياً فقد يكون مسار التعويض الحكومي للمساعدة الشخصية مناسباً للفحص. تقديرك للساعات ليس قراراً رسمياً.',
      fkWhyAdult:'تقدير أكثر من 20 ساعة لا يعني وحده وجود حق في assistansersättning. يذكر مصدر Försäkringskassan الحالي أيضاً أن الإعاقة يجب أن تندرج ضمن LSS، وأن تقيم في السويد، وأن يكون عمرك 66 عاماً أو أقل. لم يتحقق هذا المسار من هذه الشروط هنا. افحصها في المصدر الأصلي قبل المتابعة.',
      fkWhyChild:'تقدير أكثر من 20 ساعة لا يعني وحده وجود حق في assistansersättning. يذكر مصدر Försäkringskassan الحالي أيضاً أن إعاقة الطفل يجب أن تندرج ضمن LSS وأن الطفل يقيم في السويد. وللأطفال من 0 إلى 17 عاماً تطبق Försäkringskassan أيضاً خصم مسؤولية الوالدين (foräldraavdrag). لم يتحقق هذا المسار من هذه الشروط هنا. افحصها في المصدر الأصلي قبل المتابعة.',
      fkUnsureAdultTitle:'Försäkringskassan – تحقق من مسار البالغ',fkWhyUnsureAdult:'اخترت البدء بشكل عام، لذلك لم يحدد هذا المسار بعد ما إذا كانت الحاجة تخص شخصاً بالغاً أو طفل. بالنسبة إلى بالغ، يذكر مصدر Försäkringskassan الحالي ضمن الشروط أن الإعاقة يجب أن تندرج ضمن LSS وأن يعيش الشخص في السويد وأن يكون عمره 66 عاماً أو أقل. لم يحدد تحقق هذه الشروط هنا. افحص مصدر البالغ إذا كان هذا هو المسار المناسب.',
      fkUnsureChildTitle:'Försäkringskassan – تحقق من مسار الطفل',fkWhyUnsureChild:'اخترت البدء بشكل عام، لذلك لم يحدد هذا المسار بعد ما إذا كانت الحاجة تخص شخصاً بالغاً أو طفل. بالنسبة إلى طفل، يذكر مصدر Försäkringskassan الحالي أن إعاقة الطفل يجب أن تندرج ضمن LSS وأن يعيش الطفل في السويد، كما يطبق خصم مسؤولية الوالدين للأعمار 0–17. لم يحدد تحقق هذه الشروط هنا. افحص مصدر الطفل إذا كان هذا هو المسار المناسب.',
      municipalityTitle:'البلدية – اطلب تقييماً للمساعدة الشخصية أو دعم LSS',municipalityWhy:'إذا قُيّمت الاحتياجات الأساسية بـ20 ساعة أو أقل أسبوعياً، أو إذا كان الحجم غير واضح بعد، تشير Försäkringskassan إلى البلدية كمسار مهم. تواصل مع بلديتك واشرح احتياجات المساعدة الملموسة.',
      describeTitle:'حضّر وصفاً ملموساً للاحتياجات',describeWhy:'صف ما يحتاج الشخص إلى مساعدة فيه، وكم مرة وكيف تُقدَّم المساعدة. التشخيص أو تقدير الساعات من الشخص نفسه لا يعني قراراً بالاستحقاق.',
      broadTitle:'ابدأ بالبلدية وحدد نوع الدعم المناسب',broadWhy:'لقد قلت إن المساعدة تتعلق أساساً باحتياجات يومية أخرى. هذا لا يكفي لتحديد ما إذا كان LSS ينطبق. ينص LSS على أن البلدية مسؤولة عن التدخلات الواردة في § 9 البنود 2–10. تواصل مع بلدية السكن واطلب الإرشاد إلى الجهة الصحيحة. إذا لم يكن LSS مناسباً فقد يلزم تقييم دعم بلدي آخر وفق قواعد أخرى. المنتج لا يقرر الاستحقاق.'
    },
    fa:{
      fkTitle:'Försäkringskassan – مسیر assistansersättning را بررسی کن',fkWhy:'اگر نهاد مسئول نیازهای اساسی را به طور متوسط بیش از ۲۰ ساعت در هفته ارزیابی کند، مسیر دولتی assistansersättning می‌تواند برای بررسی مرتبط باشد. برآورد شخصی ساعت‌ها معادل ارزیابی رسمی نیست.',
      fkWhyAdult:'برآورد بیش از ۲۰ ساعت به‌تنهایی به معنی حق دریافت assistansersättning نیست. منبع فعلی Försäkringskassan همچنین می‌گوید ناتوانی باید مشمول LSS باشد، فرد در سوئد زندگی کند و ۶۶ سال یا کمتر داشته باشد. این مسیر این شرایط را اینجا احراز نکرده است. پیش از ادامه آن‌ها را در منبع اصلی بررسی کن.',
      fkWhyChild:'برآورد بیش از ۲۰ ساعت به‌تنهایی به معنی حق دریافت assistansersättning نیست. منبع فعلی Försäkringskassan همچنین می‌گوید ناتوانی کودک باید مشمول LSS باشد و کودک در سوئد زندگی کند. برای کودکان ۰ تا ۱۷ سال Försäkringskassan همچنین کسر مسئولیت والدین (foräldraavdrag) را اعمال می‌کند. این مسیر این شرایط را اینجا احراز نکرده است. پیش از ادامه آن‌ها را در منبع اصلی بررسی کن.',
      fkUnsureAdultTitle:'Försäkringskassan – مسیر بزرگسال را بررسی کن',fkWhyUnsureAdult:'تو انتخاب کرده‌ای گسترده شروع کنی، بنابراین این مسیر هنوز مشخص نکرده که نیاز به کمک مربوط به یک بزرگسال است یا کودک. برای بزرگسال، منبع فعلی Försäkringskassan از جمله می‌گوید ناتوانی باید مشمول LSS باشد، فرد در سوئد زندگی کند و ۶۶ سال یا کمتر داشته باشد. این شرایط اینجا مشخص نشده‌اند. اگر مسیر بزرگسال مرتبط است، منبع بزرگسال را بررسی کن.',
      fkUnsureChildTitle:'Försäkringskassan – مسیر کودک را بررسی کن',fkWhyUnsureChild:'تو انتخاب کرده‌ای گسترده شروع کنی، بنابراین این مسیر هنوز مشخص نکرده که نیاز به کمک مربوط به یک بزرگسال است یا کودک. برای کودک، منبع فعلی Försäkringskassan می‌گوید ناتوانی کودک باید مشمول LSS باشد و کودک در سوئد زندگی کند؛ برای ۰ تا ۱۷ سال نیز کسر مسئولیت والدین اعمال می‌شود. این شرایط اینجا مشخص نشده‌اند. اگر مسیر کودک مرتبط است، منبع کودک را بررسی کن.',
      municipalityTitle:'شهرداری – درخواست ارزیابی کمک شخصی یا حمایت LSS',municipalityWhy:'اگر نیازهای اساسی ۲۰ ساعت یا کمتر در هفته ارزیابی شود، یا میزان نیاز هنوز روشن نباشد، Försäkringskassan شهرداری را مسیر مهم می‌داند. با شهرداری محل سکونت تماس بگیر و نیازهای مشخص را توضیح بده.',
      describeTitle:'شرح مشخصی از نیازها آماده کن',describeWhy:'توضیح بده فرد در چه کارهایی، چند بار و به چه شکلی کمک لازم دارد. تشخیص یا برآورد شخصی ساعت‌ها نباید به عنوان تصمیم درباره حق دریافت کمک در نظر گرفته شود.',
      broadTitle:'از شهرداری شروع کن و نوع حمایت مناسب را روشن کن',broadWhy:'گفته‌ای که کمک بیشتر مربوط به نیازهای دیگر روزمره است. این برای تعیین اینکه LSS شامل وضعیت می‌شود کافی نیست. طبق LSS، شهرداری مسئول خدمات بندهای ۲ تا ۱۰ ماده ۹ است. با شهرداری محل سکونت تماس بگیر و برای پیدا کردن مسیر درست راهنمایی بخواه. اگر LSS مناسب نباشد ممکن است حمایت‌های دیگر شهرداری طبق مقررات دیگری بررسی شوند. محصول درباره حق دریافت حمایت تصمیم نمی‌گیرد.'
    }
  };
  const currentLang=()=>assistanceCopy[lang]?lang:'sv';
  const baseFlow=flow;
  const baseGetRows=getRows;
  const baseResults=results;
  const adultSource='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna';
  const childSource='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn';
  const generalSource='https://www.forsakringskassan.se/press/vart-uppdrag-inom-assistansersattning';
  const municipalLssSource='https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1993387-om-stod-och-service-till-vissa_sfs-1993-387/';

  Object.assign(T.sv,{assistWho:'Vem gäller hjälpbehovet?',assistAdult:'En vuxen',assistChild:'Ett barn',assistWhoUnsure:'Vet inte / vill börja brett',assistNeed:'Gäller hjälpen grundläggande vardagsbehov?',assistBasic:'Ja – hygien, toalett, måltider, på- och avklädning, kommunikation, andning eller stöd som behövs löpande under större delen av dygnet på grund av ett medicinskt tillstånd som innebär fara för liv eller överhängande allvarlig risk för fysisk hälsa',assistOther:'Nej – främst annan hjälp i vardagen',assistNeedUnsure:'Osäker på vad som räknas',assistExtent:'Ungefär hur omfattande tror du hjälpen är under en vanlig vecka? Din uppskattning är bara en vägvisare – myndigheten gör bedömningen.',assistOver:'Kan vara mer än 20 timmar för grundläggande behov',assistUnder:'Kan vara 20 timmar eller mindre',assistExtentUnsure:'Vet inte'});
  Object.assign(T.ar,{assistWho:'لمن تخص الحاجة إلى المساعدة؟',assistAdult:'شخص بالغ',assistChild:'طفل',assistWhoUnsure:'لا أعرف / أريد البدء بشكل عام',assistNeed:'هل تتعلق المساعدة باحتياجات يومية أساسية؟',assistBasic:'نعم – النظافة أو المرحاض أو الوجبات أو اللباس أو التواصل أو التنفس، أو دعم يلزم بصورة متواصلة خلال معظم اليوم بسبب حالة طبية تنطوي على خطر على الحياة أو خطر وشيك وخطير على الصحة الجسدية',assistOther:'لا – أساساً مساعدة أخرى في الحياة اليومية',assistNeedUnsure:'لست متأكداً مما يُعد أساسياً',assistExtent:'تقريباً ما حجم المساعدة في أسبوع عادي؟ تقديرك مجرد إشارة؛ الجهة المسؤولة تقوم بالتقييم.',assistOver:'قد تتجاوز 20 ساعة للاحتياجات الأساسية',assistUnder:'قد تكون 20 ساعة أو أقل',assistExtentUnsure:'لا أعرف'});
  Object.assign(T.fa,{assistWho:'نیاز به کمک مربوط به چه کسی است؟',assistAdult:'یک بزرگسال',assistChild:'یک کودک',assistWhoUnsure:'نمی‌دانم / گسترده شروع می‌کنم',assistNeed:'آیا کمک مربوط به نیازهای اساسی روزمره است؟',assistBasic:'بله – بهداشت، توالت، غذا، لباس، ارتباط، تنفس، یا حمایتی که به‌طور پیوسته در بیشتر ساعات شبانه‌روز به دلیل یک وضعیت پزشکی لازم است که خطر جانی یا خطر قریب‌الوقوع و جدی برای سلامت جسمی ایجاد می‌کند',assistOther:'نه – بیشتر کمک دیگری در زندگی روزمره است',assistNeedUnsure:'مطمئن نیستم چه چیزی اساسی محسوب می‌شود',assistExtent:'تقریباً کمک در یک هفته معمولی چقدر است؟ برآورد تو فقط راهنماست؛ نهاد مسئول ارزیابی می‌کند.',assistOver:'ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد',assistUnder:'ممکن است ۲۰ ساعت یا کمتر باشد',assistExtentUnsure:'نمی‌دانم'});

  flow=function(){
    if(screen==='assist1') return q('assistWho',[['assistAdult','assist2','assistWho','adult'],['assistChild','assist2','assistWho','child'],['assistWhoUnsure','assist2','assistWho','unsure']],'home','1 / 3');
    if(screen==='assist2') return q('assistNeed',[['assistBasic','assist3','assistNeed','basic'],['assistOther','assistR','assistNeed','other'],['assistNeedUnsure','assist3','assistNeed','unsure']],'assist1','2 / 3');
    if(screen==='assist3') return q('assistExtent',[['assistOver','assistR','assistExtent','over'],['assistUnder','assistR','assistExtent','under'],['assistExtentUnsure','assistR','assistExtent','unsure']],'assist2','3 / 3');
    return baseFlow();
  };
  getRows=function(){
    if(scenario!=='assistance') return baseGetRows();
    const c=assistanceCopy[currentLang()]||assistanceCopy.sv;
    const source=answers.assistWho==='child'?childSource:(answers.assistWho==='adult'?adultSource:generalSource);
    const fkWhy=answers.assistWho==='child'?c.fkWhyChild:(answers.assistWho==='adult'?c.fkWhyAdult:c.fkWhy);
    if(answers.assistNeed==='other') return [[c.broadTitle,c.broadWhy,municipalLssSource],[c.describeTitle,c.describeWhy,municipalLssSource]];
    if(answers.assistWho==='unsure'){
      const unsureSources=[[c.fkUnsureAdultTitle,c.fkWhyUnsureAdult,adultSource],[c.fkUnsureChildTitle,c.fkWhyUnsureChild,childSource]];
      if(answers.assistExtent==='over') return [...unsureSources,[c.municipalityTitle,c.municipalityWhy,generalSource],[c.describeTitle,c.describeWhy,generalSource]];
      if(answers.assistExtent==='under') return [[c.municipalityTitle,c.municipalityWhy,generalSource],[c.describeTitle,c.describeWhy,generalSource],...unsureSources];
      return [[c.municipalityTitle,c.municipalityWhy,generalSource],...unsureSources,[c.describeTitle,c.describeWhy,generalSource]];
    }
    if(answers.assistExtent==='over') return [[c.fkTitle,fkWhy,source],[c.municipalityTitle,c.municipalityWhy,source],[c.describeTitle,c.describeWhy,source]];
    if(answers.assistExtent==='under') return [[c.municipalityTitle,c.municipalityWhy,source],[c.describeTitle,c.describeWhy,source],[c.fkTitle,fkWhy,source]];
    return [[c.municipalityTitle,c.municipalityWhy,source],[c.fkTitle,fkWhy,source],[c.describeTitle,c.describeWhy,source]];
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
})();