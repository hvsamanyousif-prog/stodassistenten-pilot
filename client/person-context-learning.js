(() => {
  const FEEDBACK_URL='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const BOVERKET_URL='https://www.boverket.se/sv/bidrag--garantier/bidrag-for-energieffektivisering-i-smahus/';
  const ENERGY_ADVICE_URL='https://www.energimyndigheten.se/effektiv-energianvandning/effektiv-energianvandning/program-och-uppdrag/kommunal-energi-och-klimatradgivning/';
  const params=new URLSearchParams(window.location.search);
  const ALLOWED_PERSON_ACTORS=new Set(['private_person','relative','student','employee','association','property_actor','other']);
  const rawActor=params.get('actor_type')||'private_person';
  const sanitizedActor=String(rawActor).toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'private_person';
  const actor=ALLOWED_PERSON_ACTORS.has(sanitizedActor)?sanitizedActor:'other';
  const copy={
    sv:{heading:'Din ingång',private_person:'Privatperson',relative:'Anhörig / hjälper någon',student:'Student / ung vuxen',employee:'Anställd',association:'Förening',property_actor:'BRF / fastighetsaktör',other:'Bred ingång'},
    ar:{heading:'مدخلك',private_person:'فرد',relative:'قريب / أساعد شخصاً',student:'طالب / شاب بالغ',employee:'موظف',association:'جمعية',property_actor:'جمعية سكنية / مالك عقار',other:'مدخل عام'},
    fa:{heading:'ورودی شما',private_person:'فرد',relative:'خویشاوند / کمک به دیگری',student:'دانشجو / جوان',employee:'کارمند',association:'انجمن',property_actor:'انجمن ساختمان / مالک ملک',other:'ورودی عمومی'}
  };
  const energyCopy={
    sv:{
      eyebrow:'Villa / energi → Villaeffekten',
      title:'Kontrollera rätt Villaeffekten-väg innan du beställer eller räknar med bidrag.',
      intro:'Det här är samma Stödassistenten och samma sanningslager. Vi avgör inte rätt eller belopp, utan frågar bara efter fakta som kan ändra nästa säkra handling.',
      qOwner:'Äger du småhuset, och bor du där permanent eller kommer du att göra det senast när du begär utbetalning?',
      qValue:'Har småhuset ett värdeår före 1990? Värdeår är uppgiften vid fastighetstaxeringen och är inte alltid samma som byggåret.',
      qDistrict:'Är huset redan anslutet till fjärrvärmenät?',
      qMeasure:'Vad planerar du främst?',
      qTiming:'Vilka tidsuppgifter gäller för materialet du vill räkna med och själva åtgärden?',
      yes:'Ja',no:'Nej',unsure:'Osäker',
      heating:'Värmesystem / värmepump',ventilation:'Ventilation',envelope:'Klimatskärm, till exempel isolering/fönster',otherMeasure:'Annat / osäker',
      notStarted:'Åtgärden är inte påbörjad; materialet är inte beställt eller beställdes 17 okt 2025 eller senare',transition:'Material beställt 17 okt 2025 eller senare; åtgärden påbörjad 17 okt 2025–31 aug 2026',recent:'Material beställt 17 okt 2025 eller senare; åtgärden påbörjad 1 sep 2026 eller senare',earlyOrder:'Materialet jag vill räkna med beställdes före 17 okt 2025',unknownTiming:'Osäker på beställnings- eller startdatum',
      ownerNoTitle:'Använd inte Villaeffekten som bekräftad väg här',
      ownerNoBody:'Ett nej betyder att den här vägen inte ska presenteras som bekräftad kandidat utifrån nuvarande uppgifter. Boverkets aktuella villkor kräver ägande och att du stadigvarande bor i småhuset senast när du begär utbetalning. Det betyder inte att andra energiråd eller stöd saknas.',
      ownerUnsureTitle:'Bekräfta ägande och boende vid utbetalning först',
      ownerUnsureBody:'Den uppgiften kan ändra vägen. Kontrollera om du uppfyller ägandekravet och kommer att bo stadigvarande i småhuset senast när utbetalning begärs innan du planerar vidare.',
      valueNoTitle:'Värdeåret gör att just Villaeffekten inte ska presenteras som bekräftad kandidat',
      valueNoBody:'Aktuella Boverket-villkor avgränsar stödet till äldre värdeår. Kontrollera taxeringsuppgiften och välj inte stöd utifrån byggår eller husets ålder i vardagligt språk.',
      valueUnsureTitle:'Kontrollera värdeåret – gissa inte från byggåret',
      valueUnsureBody:'Värdeåret kan skilja sig från nybyggnadsåret efter större ombyggnad. Ta fram fastighetstaxeringen eller använd Boverkets aktuella ansökningsväg för att kontrollera uppgiften.',
      districtYesTitle:'Blanda inte ihop befintlig fjärrvärmeanslutning med en planerad ny anslutning',
      districtYesBody:'Ett hus som redan är anslutet till fjärrvärmenät träffar en annan gräns än ett hus som överväger en ny anslutning som åtgärd. Kontrollera aktuell Boverket-regel innan du går vidare.',
      districtUnsureTitle:'Bekräfta om huset redan är anslutet till fjärrvärme',
      districtUnsureBody:'Den faktan kan ändra Villaeffekten-vägen och ska inte antas från uppvärmningskostnad eller hustyp.',
      measureUnsureTitle:'Välj inte stöd innan den konkreta åtgärden är känd',
      measureUnsureBody:'Olika åtgärder och produkter har olika krav. Den kostnadsfria kommunala energi- och klimatrådgivningen kan hjälpa dig att ringa in en lämplig åtgärd innan bidragsvillkoren kontrolleras.',
      earlyOrderTitle:'Skilj materialets beställningsdatum från när arbetet började',
      earlyOrderBody:'Nuvarande regel anger att bidrag endast får lämnas för kostnader för material som beställts tidigast den 17 oktober 2025. Ett senare startdatum gör inte material som beställdes tidigare stödberättigat. Om du har flera beställningar, skilj dem åt och kontrollera varje relevant materialkostnad mot aktuell primärkälla.',
      candidateTitle:'Villaeffekten är värd att verifiera – men det här är inte ett beslut',
      candidateBody:'Kontrollera den exakta åtgärden och produkten mot Boverkets aktuella krav. Ta fram tekniskt produktunderlag samt offert, order eller faktura där material och arbete går att skilja åt. Kontrollera också tidsreglerna separat för när materialet beställdes och när själva åtgärden påbörjades. Länsstyrelsens prövning och tillgängliga medel får inte ersättas av ett beräknat belopp i Stödassistenten.',
      transitionNote:'Du har angett att åtgärden började före 1 september 2026. Boverket har en särskild övergångsregel för den perioden; kontrollera den aktuella tidsfristen direkt på primärkällan innan du väntar med ansökan.',
      timingUnsureNote:'Materialets beställningsdatum och åtgärdens exakta startdatum kan påverka olika delar av vägen. Bekräfta båda innan du drar slutsats om kostnad eller tidsfrist.',
      source:'Boverket: Villaeffekten',advice:'Energimyndigheten: kommunal energi- och klimatrådgivning'
    },
    ar:{
      eyebrow:'المنزل / الطاقة ← Villaeffekten',
      title:'تحقق من المسار الصحيح قبل الطلب أو احتساب المنحة ضمن ميزانيتك.',
      intro:'هذه هي نفس Stödassistenten ونفس طبقة الحقيقة. لا نقرر الاستحقاق أو المبلغ؛ نسأل فقط عن معلومات قد تغيّر الخطوة الآمنة التالية.',
      qOwner:'هل تملك المنزل، وهل تسكن فيه بشكل دائم أو ستسكن فيه بشكل دائم على أبعد تقدير عند طلب صرف الدعم؟',
      qValue:'هل قيمة سنة العقار (värdeår) قبل 1990؟ هذه قيمة ضريبية وليست دائماً سنة البناء نفسها.',
      qDistrict:'هل المنزل متصل بالفعل بشبكة التدفئة المركزية (fjärrvärme)؟',
      qMeasure:'ما الإجراء الرئيسي الذي تخطط له؟',
      qTiming:'ما تواريخ طلب المواد التي تريد احتسابها وبدء الإجراء نفسه؟',
      yes:'نعم',no:'لا',unsure:'غير متأكد',
      heating:'نظام تدفئة / مضخة حرارية',ventilation:'تهوية',envelope:'غلاف المبنى مثل العزل أو النوافذ',otherMeasure:'شيء آخر / غير متأكد',
      notStarted:'لم يبدأ الإجراء؛ المواد لم تُطلب أو طُلبت في 17 أكتوبر 2025 أو بعده',transition:'المواد طُلبت في 17 أكتوبر 2025 أو بعده؛ بدأ الإجراء بين 17 أكتوبر 2025 و31 أغسطس 2026',recent:'المواد طُلبت في 17 أكتوبر 2025 أو بعده؛ بدأ الإجراء في 1 سبتمبر 2026 أو بعده',earlyOrder:'المواد التي أريد احتسابها طُلبت قبل 17 أكتوبر 2025',unknownTiming:'غير متأكد من تاريخ الطلب أو البدء',
      ownerNoTitle:'لا تعرض Villaeffekten هنا كمسار مؤكد',
      ownerNoBody:'تعني الإجابة بلا أن هذا المسار لا ينبغي عرضه كخيار مؤكد بالاعتماد على المعلومات الحالية. تشترط قواعد Boverket الحالية الملكية والسكن الدائم في المنزل على أبعد تقدير عند طلب صرف الدعم. هذا لا يعني عدم وجود نصائح أو مسارات طاقة أخرى.',
      ownerUnsureTitle:'تحقق أولاً من الملكية والسكن عند طلب الصرف',ownerUnsureBody:'قد تغيّر هذه المعلومة المسار. تحقق من شرط الملكية ومن أنك ستسكن بشكل دائم في المنزل على أبعد تقدير عند طلب الصرف قبل متابعة التخطيط.',
      valueNoTitle:'لا تعرض Villaeffekten كمرشح مؤكد بناءً على هذا värdeår',valueNoBody:'القواعد الحالية تحدد نطاقاً لقيمة سنة العقار. تحقق من بيانات الضريبة ولا تستنتج من سنة البناء أو عمر المنزل فقط.',
      valueUnsureTitle:'تحقق من värdeår ولا تخمنه من سنة البناء',valueUnsureBody:'قد تختلف قيمة سنة العقار بعد إعادة بناء كبيرة. تحقق من بيانات الضريبة أو المسار الحالي لدى Boverket.',
      districtYesTitle:'لا تخلط بين اتصال حالي بالتدفئة المركزية واتصال جديد مخطط له',districtYesBody:'المنزل المتصل بالفعل بالشبكة له حد مختلف عن منزل يفكر في اتصال جديد كإجراء. تحقق من القاعدة الحالية لدى Boverket.',
      districtUnsureTitle:'تأكد هل المنزل متصل بالفعل بالتدفئة المركزية',districtUnsureBody:'هذه المعلومة قد تغيّر المسار ولا ينبغي استنتاجها من تكلفة التدفئة أو نوع المنزل.',
      measureUnsureTitle:'لا تختَر المنحة قبل معرفة الإجراء المحدد',measureUnsureBody:'للإجراءات والمنتجات شروط مختلفة. يمكن للاستشارة البلدية المجانية والمستقلة مساعدتك في تحديد الإجراء قبل فحص شروط المنحة.',
      earlyOrderTitle:'افصل تاريخ طلب المواد عن تاريخ بدء العمل',
      earlyOrderBody:'تنص القاعدة الحالية على أن الدعم لا يُمنح إلا لتكاليف المواد المطلوبة في 17 أكتوبر 2025 أو بعده. بدء العمل لاحقاً لا يجعل المواد المطلوبة قبل ذلك مؤهلة. إذا كانت لديك طلبات متعددة فافصل بينها وتحقق من كل تكلفة مواد ذات صلة من المصدر الأساسي الحالي.',
      candidateTitle:'يستحق مسار Villaeffekten التحقق – لكنه ليس قراراً',candidateBody:'طابق الإجراء والمنتج المحددين مع شروط Boverket الحالية. جهّز مواصفات المنتج وعرض السعر أو الطلب أو الفاتورة بحيث يمكن فصل المواد عن العمل. تحقق من قواعد الوقت بشكل منفصل لتاريخ طلب المواد وتاريخ بدء الإجراء نفسه. لا تعتبر مبلغاً محسوباً ضماناً لقرار أو دفع.',
      transitionNote:'ذكرت أن الإجراء بدأ قبل 1 سبتمبر 2026. توجد قاعدة انتقالية لهذه الفترة؛ تحقق من الموعد الحالي مباشرة من المصدر قبل تأخير الطلب.',
      timingUnsureNote:'قد يؤثر تاريخ طلب المواد وتاريخ بدء الإجراء في أجزاء مختلفة من المسار. أكد التاريخين قبل الاستنتاج بشأن التكلفة أو الموعد النهائي.',
      source:'Boverket: Villaeffekten',advice:'Energimyndigheten: استشارة الطاقة والمناخ البلدية'
    },
    fa:{
      eyebrow:'خانه / انرژی ← Villaeffekten',
      title:'پیش از سفارش یا حساب کردن روی کمک، مسیر درست را بررسی کنید.',
      intro:'این همان Stödassistenten و همان لایه حقیقت است. ما استحقاق یا مبلغ را تعیین نمی‌کنیم؛ فقط واقعیت‌هایی را می‌پرسیم که می‌توانند قدم امن بعدی را عوض کنند.',
      qOwner:'آیا مالک خانه هستید و اکنون به‌طور دائم در آن زندگی می‌کنید، یا حداکثر تا زمان درخواست پرداخت در آن سکونت دائم خواهید داشت؟',
      qValue:'آیا värdeår ملک قبل از 1990 است؟ این یک داده مالیاتی است و همیشه با سال ساخت یکسان نیست.',
      qDistrict:'آیا خانه همین حالا به شبکه گرمایش شهری (fjärrvärme) وصل است؟',
      qMeasure:'بیشتر چه اقدامی را برنامه‌ریزی کرده‌اید؟',
      qTiming:'برای موادی که می‌خواهید محاسبه شوند و برای شروع خود اقدام چه تاریخ‌هایی صدق می‌کند؟',
      yes:'بله',no:'نه',unsure:'مطمئن نیستم',
      heating:'سیستم گرمایش / پمپ حرارتی',ventilation:'تهویه',envelope:'پوسته ساختمان، مانند عایق یا پنجره',otherMeasure:'مورد دیگر / نامشخص',
      notStarted:'اقدام هنوز شروع نشده؛ مواد سفارش داده نشده یا در 17 اکتبر 2025 یا بعد سفارش داده شده',transition:'مواد در 17 اکتبر 2025 یا بعد سفارش داده شده؛ اقدام بین 17 اکتبر 2025 تا 31 اوت 2026 شروع شده',recent:'مواد در 17 اکتبر 2025 یا بعد سفارش داده شده؛ اقدام از 1 سپتامبر 2026 یا بعد شروع شده',earlyOrder:'موادی که می‌خواهم محاسبه شوند پیش از 17 اکتبر 2025 سفارش داده شده‌اند',unknownTiming:'از تاریخ سفارش یا شروع مطمئن نیستم',
      ownerNoTitle:'Villaeffekten را در این وضعیت مسیر تأییدشده نشان ندهید',ownerNoBody:'پاسخ منفی یعنی با اطلاعات فعلی نباید این مسیر به‌عنوان گزینه تأییدشده نمایش داده شود. طبق شرایط فعلی Boverket باید مالک خانه باشید و حداکثر هنگام درخواست پرداخت، سکونت دائم در آن داشته باشید. این به معنی نبودن راهنمایی یا مسیر انرژی دیگر نیست.',
      ownerUnsureTitle:'ابتدا مالکیت و سکونت هنگام پرداخت را روشن کنید',ownerUnsureBody:'این اطلاعات می‌تواند مسیر را تغییر دهد. پیش از ادامه برنامه‌ریزی بررسی کنید که شرط مالکیت را دارید و حداکثر تا زمان درخواست پرداخت در خانه سکونت دائم خواهید داشت.',
      valueNoTitle:'با این värdeår نباید Villaeffekten به عنوان گزینه تأییدشده نمایش داده شود',valueNoBody:'قواعد فعلی محدوده‌ای برای värdeår دارد. داده مالیاتی را بررسی کنید و فقط از سال ساخت یا سن خانه نتیجه نگیرید.',
      valueUnsureTitle:'värdeår را بررسی کنید؛ از سال ساخت حدس نزنید',valueUnsureBody:'پس از بازسازی بزرگ ممکن است värdeår با سال ساخت فرق کند. اطلاعات مالیاتی یا مسیر فعلی Boverket را بررسی کنید.',
      districtYesTitle:'اتصال فعلی به fjärrvärme را با اتصال جدید برنامه‌ریزی‌شده یکی نگیرید',districtYesBody:'خانه‌ای که هم‌اکنون به شبکه وصل است با خانه‌ای که اتصال جدید را به عنوان اقدام در نظر دارد، مرز متفاوتی دارد. قاعده فعلی Boverket را بررسی کنید.',
      districtUnsureTitle:'تأیید کنید خانه اکنون به fjärrvärme وصل است یا نه',districtUnsureBody:'این واقعیت می‌تواند مسیر را تغییر دهد و نباید از هزینه گرمایش یا نوع خانه حدس زده شود.',
      measureUnsureTitle:'پیش از مشخص شدن اقدام دقیق، کمک را انتخاب نکنید',measureUnsureBody:'اقدام‌ها و محصولات شرایط متفاوت دارند. مشاوره رایگان و مستقل انرژی و اقلیم شهرداری می‌تواند قبل از بررسی شرایط کمک، اقدام مناسب را روشن کند.',
      earlyOrderTitle:'تاریخ سفارش مواد را از تاریخ شروع کار جدا نگه دارید',
      earlyOrderBody:'قاعده فعلی می‌گوید کمک فقط برای هزینه موادی قابل پرداخت است که زودتر از 17 اکتبر 2025 سفارش داده نشده باشند. شروع دیرتر کار، موادی را که پیش از آن سفارش شده‌اند واجد شرایط نمی‌کند. اگر چند سفارش دارید، آن‌ها را جدا کنید و هر هزینه مرتبط را با منبع اصلی فعلی بررسی کنید.',
      candidateTitle:'Villaeffekten ارزش بررسی دارد – اما این تصمیم نیست',candidateBody:'اقدام و محصول دقیق را با شرایط فعلی Boverket تطبیق دهید. مشخصات فنی و پیشنهاد قیمت، سفارش یا فاکتوری آماده کنید که مواد و کار را جدا نشان دهد. قواعد زمانی را برای تاریخ سفارش مواد و تاریخ شروع خود اقدام جداگانه بررسی کنید. مبلغ محاسبه‌شده را تضمین تصمیم یا پرداخت ندانید.',
      transitionNote:'گفته‌اید اقدام پیش از 1 سپتامبر 2026 شروع شده است. برای این دوره قاعده انتقالی وجود دارد؛ پیش از تأخیر در درخواست، مهلت فعلی را مستقیم از منبع اصلی بررسی کنید.',
      timingUnsureNote:'تاریخ سفارش مواد و تاریخ دقیق شروع اقدام می‌تواند بخش‌های متفاوت مسیر را تغییر دهد. پیش از نتیجه‌گیری درباره هزینه یا مهلت، هر دو را تأیید کنید.',
      source:'Boverket: Villaeffekten',advice:'Energimyndigheten: مشاوره انرژی و اقلیم شهرداری'
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
  function addSource(doc,parent,href,text){
    const link=doc.createElement('a');
    link.className='source';
    link.href=href;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.textContent=text;
    parent.appendChild(link);
  }
  function homeEnergyGuidance(){
    if(String(params.get('focus')||'').toLowerCase()!=='home_energy') return;
    const doc=document;
    if(doc.getElementById('homeEnergyGuidance')) return;
    const main=doc.getElementById('main');
    if(!main||!main.parentNode) return;
    const c=energyCopy[lang()]||energyCopy.sv;
    const section=doc.createElement('section');
    section.id='homeEnergyGuidance';
    section.className='card';
    section.setAttribute('aria-labelledby','homeEnergyTitle');
    main.parentNode.insertBefore(section,main);
    const state={owner:null,valueYear:null,district:null,measure:null,timing:null};
    function nextStep(){
      if(!state.owner) return 'q_owner';
      if(state.owner==='no') return 'r_owner_no';
      if(state.owner==='unsure') return 'r_owner_unsure';
      if(!state.valueYear) return 'q_value';
      if(state.valueYear==='no') return 'r_value_no';
      if(state.valueYear==='unsure') return 'r_value_unsure';
      if(!state.district) return 'q_district';
      if(state.district==='yes') return 'r_district_yes';
      if(state.district==='unsure') return 'r_district_unsure';
      if(!state.measure) return 'q_measure';
      if(state.measure==='unsure') return 'r_measure_unsure';
      if(!state.timing) return 'q_timing';
      if(state.timing==='early_order') return 'r_order_early';
      return 'r_candidate';
    }
    function choice(label,value,field){
      const button=doc.createElement('button');
      button.type='button';
      button.className='choice';
      button.textContent=label;
      button.dataset.value=value;
      button.setAttribute('aria-pressed',String(state[field]===value));
      button.addEventListener('click',()=>{
        state[field]=value;
        if(field==='owner'){state.valueYear=null;state.district=null;state.measure=null;state.timing=null;}
        if(field==='valueYear'){state.district=null;state.measure=null;state.timing=null;}
        if(field==='district'){state.measure=null;state.timing=null;}
        if(field==='measure') state.timing=null;
        render();
      });
      return button;
    }
    function group(question,field,options){
      const title=doc.createElement('h3');
      title.textContent=question;
      const wrap=doc.createElement('div');
      wrap.setAttribute('role','group');
      wrap.setAttribute('aria-label',question);
      options.forEach(([text,value])=>wrap.appendChild(choice(text,value,field)));
      section.append(title,wrap);
    }
    function result(titleText,bodyText,note){
      const box=doc.createElement('div');
      box.className='notice';
      box.setAttribute('role','status');
      const title=doc.createElement('strong');
      title.textContent=titleText;
      const body=doc.createElement('p');
      body.textContent=bodyText;
      body.style.marginBottom='8px';
      box.append(title,body);
      if(note){const extra=doc.createElement('p');extra.className='muted';extra.textContent=note;box.appendChild(extra);}
      addSource(doc,box,BOVERKET_URL,c.source);
      box.appendChild(doc.createTextNode(' · '));
      addSource(doc,box,ENERGY_ADVICE_URL,c.advice);
      section.appendChild(box);
    }
    function render(){
      section.replaceChildren();
      const eyebrow=doc.createElement('div');eyebrow.className='eyebrow';eyebrow.textContent=c.eyebrow;
      const title=doc.createElement('h2');title.id='homeEnergyTitle';title.textContent=c.title;
      const intro=doc.createElement('p');intro.className='muted';intro.textContent=c.intro;
      section.append(eyebrow,title,intro);
      const step=nextStep();
      if(step==='q_owner') return group(c.qOwner,'owner',[[c.yes,'yes'],[c.no,'no'],[c.unsure,'unsure']]);
      if(step==='r_owner_no') return result(c.ownerNoTitle,c.ownerNoBody);
      if(step==='r_owner_unsure') return result(c.ownerUnsureTitle,c.ownerUnsureBody);
      if(step==='q_value') return group(c.qValue,'valueYear',[[c.yes,'yes'],[c.no,'no'],[c.unsure,'unsure']]);
      if(step==='r_value_no') return result(c.valueNoTitle,c.valueNoBody);
      if(step==='r_value_unsure') return result(c.valueUnsureTitle,c.valueUnsureBody);
      if(step==='q_district') return group(c.qDistrict,'district',[[c.yes,'yes'],[c.no,'no'],[c.unsure,'unsure']]);
      if(step==='r_district_yes') return result(c.districtYesTitle,c.districtYesBody);
      if(step==='r_district_unsure') return result(c.districtUnsureTitle,c.districtUnsureBody);
      if(step==='q_measure') return group(c.qMeasure,'measure',[[c.heating,'heating'],[c.ventilation,'ventilation'],[c.envelope,'envelope'],[c.otherMeasure,'unsure']]);
      if(step==='r_measure_unsure') return result(c.measureUnsureTitle,c.measureUnsureBody);
      if(step==='q_timing') return group(c.qTiming,'timing',[[c.notStarted,'not_started'],[c.transition,'transition'],[c.recent,'recent'],[c.earlyOrder,'early_order'],[c.unknownTiming,'unsure']]);
      if(step==='r_order_early') return result(c.earlyOrderTitle,c.earlyOrderBody);
      return result(c.candidateTitle,c.candidateBody,state.timing==='transition'?c.transitionNote:(state.timing==='unsure'?c.timingUnsureNote:null));
    }
    render();
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

  const root=document.querySelector('.app');
  if(root){
    const observer=new MutationObserver(patchContext);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }
  patchContext();
  homeEnergyGuidance();
})();