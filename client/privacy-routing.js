(() => {
  function installGovernedRoutes(){
    let rerender=false;
    try{
      if(typeof KEYWORDS!=='undefined'){
        if(typeof score==='function'){
          score=function(text,key){
            const hay=String(text||'').toLocaleLowerCase();
            const terms=Array.isArray(KEYWORDS[key])?KEYWORDS[key]:[];
            return terms.reduce((count,term)=>{
              const needle=String(term||'').toLocaleLowerCase();
              let hit=false;
              if(needle==='tand') hit=/(?:^|[^\p{L}\p{N}])tand(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='råd') hit=/(?:^|[^\p{L}\p{N}])(?:har\s+)?inte\s+råd(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='عمل') hit=/(?:^|[^\p{L}\p{N}])(?:ال)?عمل(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='کار') hit=/(?:^|[^\p{L}\p{N}])کار(?=$|[^\p{L}\p{N}])/u.test(hay);
              else hit=Boolean(needle&&hay.includes(needle));
              return count+(hit?1:0);
            },0);
          };
        }
        if(Array.isArray(KEYWORDS.work)) KEYWORDS.work=KEYWORDS.work.concat(['کارمند','کارگر','شغل','أعمل','وظيفة']);
        if(Array.isArray(KEYWORDS.vision)) KEYWORDS.vision=KEYWORDS.vision.filter(term=>term!=='syn').concat(['dålig syn','sämre syn','synproblem']);
        if(Array.isArray(KEYWORDS.economy)) KEYWORDS.economy=KEYWORDS.economy.filter(term=>term!=='إيجار'&&term!=='اجاره').concat([
          'إيجار مرتفع','إيجار عالي','إيجار عالية','إيجار غالي','إيجار غالية','تكلفة السكن','تكاليف السكن','السكن',
          'اجاره بالا','اجاره بالایی','اجاره زیاد','اجاره سنگین','اجاره گران','مسکن'
        ]);
        KEYWORDS.assistance=[
          'personlig assistans','assistans','hjälp med hygien','personlig hygien','hjälp med påklädning','påklädning','hjälp med toalett','toalett','hjälp att äta','hjälp med måltider','hjälp med kommunikation','andning',
          'مساعدة شخصية','النظافة الشخصية','المساعدة في اللباس','ارتداء الملابس','المساعدة في الأكل','المساعدة في التواصل','التنفس',
          'کمک شخصی','بهداشت شخصی','کمک برای لباس پوشیدن','لباس پوشیدن','کمک برای غذا خوردن','کمک در ارتباط','تنفس'
        ];
        KEYWORDS.family=[
          'barn behöver extra stöd','barnet behöver extra stöd','extra tillsyn','extra omvårdnad','mycket hjälp i vardagen','stöd i skolan','hjälp i skolan','barn med stödbehov',
          'طفلي يحتاج دعماً إضافياً','يحتاج مراقبة إضافية','رعاية إضافية','مساعدة إضافية في المدرسة',
          'کودکم به حمایت بیشتری نیاز دارد','نظارت بیشتر','مراقبت بیشتر','کمک بیشتر در مدرسه'
        ];
        KEYWORDS.vab=[
          'jag behöver vabba','behöver vabba','mitt barn är sjukt','barnet är sjukt och jag måste vara hemma','stanna hemma med sjukt barn','sjukt barn och sjukskriven','vabba resten av dagen','vabba del av dagen',
          'طفلي مريض ويجب أن أبقى في المنزل','أحتاج إلى رعاية طفلي المريض','أحتاج إلى VAB','طفل مريض وإجازة مرضية جزئية',
          'کودکم بیمار است و باید خانه بمانم','برای کودک بیمار باید خانه بمانم','به VAB نیاز دارم','کودک بیمار و مرخصی بیماری پاره‌وقت'
        ];
        KEYWORDS.property=[
          'brf styrelse bostadsanpassning','bostadsrättsförening bostadsanpassning','hyresvärd bostadsanpassning','fastighetsägare bostadsanpassning','brf ramp entré','brf dörröppnare entré','ta över bostadsanpassningsbidrag','gemensamma utrymmen bostadsanpassning',
          'جمعية سكنية تكييف السكن','مالك العقار تكييف السكن','منحدر مدخل المبنى','المساحات المشتركة تكييف السكن',
          'هیئت مدیره ساختمان مناسب سازی مسکن','مالک ساختمان مناسب سازی','رمپ ورودی ساختمان','فضای مشترک مناسب سازی'
        ];
      }
      if(typeof I18N!=='undefined'){
        const routes={
          sv:['BRF / fastighetsaktör','Bostadsanpassning i entré eller gemensamma utrymmen','person-pilot.html?actor_type=property_actor&focus=property_accessibility'],
          ar:['جمعية سكنية / مالك عقار','تكييف المدخل أو المساحات المشتركة','person-pilot.html?actor_type=property_actor&focus=property_accessibility'],
          fa:['انجمن ساختمان / مالک ملک','مناسب‌سازی ورودی یا فضاهای مشترک','person-pilot.html?actor_type=property_actor&focus=property_accessibility']
        };
        for(const code of ['sv','ar','fa']){
          if(I18N[code]&&I18N[code].routes){
            if(code==='sv'){
              I18N[code].routes.assistance=['Personlig hjälp i vardagen','Hygien, påklädning, måltider, kommunikation eller annat omfattande hjälpbehov','person-pilot.html?actor_type=private_person&focus=assistance'];
              I18N[code].routes.family=['Barn/familj – extra stödbehov','Extra omvårdnad, tillsyn, vardagsstöd eller stöd kring skolan','person-pilot.html?actor_type=relative&focus=family'];
              I18N[code].routes.vab=['Sjukt barn / VAB','Barnets ålder, egen sjukfrånvaro och rätt timmar kan ändra nästa steg','person-pilot.html?actor_type=relative&focus=vab'];
            }else if(code==='ar'){
              I18N[code].routes.assistance=['مساعدة شخصية في الحياة اليومية','النظافة الشخصية، اللباس، الوجبات، التواصل أو احتياجات مساعدة واسعة','person-pilot.html?actor_type=private_person&focus=assistance'];
              I18N[code].routes.family=['الطفل/الأسرة – حاجة إلى دعم إضافي','رعاية أو مراقبة أو مساعدة يومية إضافية أو دعم متعلق بالمدرسة','person-pilot.html?actor_type=relative&focus=family'];
              I18N[code].routes.vab=['طفل مريض / VAB','عمر الطفل وغيابك المرضي والساعات الفعلية قد تغيّر الخطوة التالية','person-pilot.html?actor_type=relative&focus=vab'];
            }else{
              I18N[code].routes.assistance=['کمک شخصی در زندگی روزمره','بهداشت شخصی، لباس پوشیدن، غذا، ارتباط یا نیاز گسترده به کمک','person-pilot.html?actor_type=private_person&focus=assistance'];
              I18N[code].routes.family=['کودک/خانواده – نیاز به حمایت بیشتر','مراقبت، نظارت، کمک روزمره یا حمایت مرتبط با مدرسه','person-pilot.html?actor_type=relative&focus=family'];
              I18N[code].routes.vab=['کودک بیمار / VAB','سن کودک، مرخصی بیماری خودت و ساعت‌های واقعی می‌تواند قدم بعدی را تغییر دهد','person-pilot.html?actor_type=relative&focus=vab'];
            }
            I18N[code].routes.property=routes[code];
          }
          if(I18N[code]&&Array.isArray(I18N[code].actorsData)&&!I18N[code].actorsData.some(a=>String(a[2]||'').includes('actor_type=property_actor'))){
            I18N[code].actorsData.push(routes[code]);
            rerender=true;
          }
        }
      }
      if(rerender&&typeof render==='function') render();
    }catch(_err){/* source shell remains usable if governed route augmentation cannot load */}
  }
  installGovernedRoutes();

  const box=document.getElementById('engineResults');
  if(!box) return;

  const composer=document.getElementById('situation');
  const analyzeButton=document.getElementById('analyzeBtn');

  const FUNDING_COPY={
    sv:{
      questions:{funding:'För att inte gissa stöd: vem gäller det?',scholarship:'Du söker stipendium. Vem gäller det?',loan:'Du söker lån. Vem gäller det?'},
      known:'Jag använder rollen som redan framgår och gissar inte ett enskilt stöd här.',
      actors:{
        private:['Privat behov','Bidrag, ersättningar och andra vägar för privatperson'],
        study:['Studier','Stipendier, studiestöd och ekonomi kring studier'],
        employee:['Anställd','Behåll anställningsrollen och kontrollera finansieringsvägen utan att anta ett visst stöd'],
        company:['Företag','Finansiering och offentliga affärer för företag'],
        association:['Förening','Projekt-, aktivitets- och föreningsstöd'],
        relative:['Jag hjälper någon','Behåll hjälparrollen och sök vidare utifrån personens situation'],
        property_actor:['BRF / fastighetsaktör','Behåll fastighetsrollen och kontrollera finansieringsvägen utan att anta ett visst stöd']
      }
    },
    ar:{
      questions:{funding:'حتى لا نخمن نوع الدعم: من يخص الأمر؟',scholarship:'أنت تبحث عن منحة. من يخص الأمر؟',loan:'أنت تبحث عن قرض. من يخص الأمر?'},
      known:'أستخدم الفئة التي ظهرت بالفعل ولا أفترض دعماً محدداً.',
      actors:{
        private:['احتياج شخصي','دعم وتعويضات ومسارات أخرى للأفراد'],
        study:['الدراسة','منح ودعم دراسي واقتصاد مرتبط بالدراسة'],
        employee:['موظف','نحتفظ بدور الموظف ونتحقق من مسار التمويل من دون افتراض دعم محدد'],
        company:['شركة','تمويل وفرص أعمال عامة للشركات'],
        association:['جمعية','دعم المشاريع والأنشطة والجمعيات'],
        relative:['أنا أساعد شخصًا','نحتفظ بدور المساعدة ونواصل وفق وضع الشخص الذي تساعده'],
        property_actor:['جمعية سكنية / مالك عقار','نحتفظ بدور الجهة العقارية ونتحقق من مسار التمويل من دون افتراض دعم محدد']
      }
    },
    fa:{
      questions:{funding:'برای اینکه نوع حمایت را حدس نزنیم: این درخواست برای چه کسی است؟',scholarship:'شما دنبال بورسیه هستید. این درخواست برای چه کسی است؟',loan:'شما دنبال وام هستید. این درخواست برای چه کسی است؟'},
      known:'از نقشی که از قبل مشخص است استفاده می‌کنم و یک حمایت مشخص را حدس نمی‌زنم.',
      actors:{
        private:['نیاز شخصی','حمایت، جبران هزینه و مسیرهای دیگر برای افراد'],
        study:['تحصیل','بورسیه، حمایت تحصیلی و اقتصاد مرتبط با تحصیل'],
        employee:['کارمند','نقش کارمند را حفظ می‌کنیم و مسیر تأمین مالی را بدون فرض یک حمایت مشخص بررسی می‌کنیم'],
        company:['کسب‌وکار','تأمین مالی و فرصت‌های عمومی برای کسب‌وکار'],
        association:['انجمن','حمایت پروژه، فعالیت و انجمن'],
        relative:['به کسی کمک می‌کنم','نقش کمک‌کننده را حفظ می‌کنیم و بر اساس وضعیت آن شخص ادامه می‌دهیم'],
        property_actor:['انجمن ساختمان / مالک ملک','نقش بخش ملکی را حفظ می‌کنیم و مسیر تأمین مالی را بدون فرض یک حمایت مشخص بررسی می‌کنیم']
      }
    }
  };
  const ACTOR_ROUTES={
    private:'person-pilot.html?actor_type=private_person',
    study:'person-pilot.html?actor_type=student',
    employee:'person-pilot.html?actor_type=employee',
    company:'company-pilot.html?actor_type=company',
    association:'person-pilot.html?actor_type=association',
    relative:'person-pilot.html?actor_type=relative',
    property_actor:'person-pilot.html?actor_type=property_actor'
  };
  const URL_ACTORS={private_person:'private',student:'study',employee:'employee',company:'company',association:'association',relative:'relative',property_actor:'property_actor'};
  const FUNDING_INTENTS=new Set(['funding','scholarship','loan']);
  const FUNDING_DESTINATION_ACTORS=new Set(['private_person','student','employee','company','association','relative','property_actor']);

  function currentLang(){
    const value=new URLSearchParams(location.search).get('lang');
    return value==='ar'||value==='fa'?value:'sv';
  }
  function lower(value){return String(value||'').toLocaleLowerCase()}
  function fundingIntent(text){
    const x=lower(text);
    if(/upphandling|anbud|offentlig(?:a|) affär|مناقصة|مناقصه/.test(x)) return null;
    if(/stipen|منح(?:ة|)|بورسیه/.test(x)) return 'scholarship';
    if(/\blån(?:et|en)?\b|\bstudielån(?:et|en)?\b|\blåna\s+pengar\b|قرض|وام/.test(x)) return 'loan';
    if(/pengar\s+att\s+sök|sök(?:a|er)?\s+pengar|fond(?:er)?(?:\s+att\s+sök)?|bidrag\s+att\s+sök|sök(?:a|er)?\s+bidrag|finansiering\s+att\s+sök|دعم مالي|تمويل|کمک مالی|حمایت مالی|بودجه/.test(x)) return 'funding';
    return null;
  }
  function boundedHousingNeed(text){
    const x=lower(text);
    return /(?:\bhyran\b|\b(?:hög|dyr)\s+hyra\b|\bhyra\b(?=\s*(?:och|,|\.|$))|\b(?:boende|bostads)kostnad(?:en|er|erna)?\b|\bbostad(?:en)?\b|\brent\b|(?:ال)?إيجار\s+(?:مرتفع|عال(?:ي|ية)?|غالي|غالية)|بعد\s+الإيجار|(?:تكلفة|تكاليف)\s+السكن|السكن|اجاره\s+(?:بالا(?:یی)?|زیاد|سنگین|گران)|(?:بعد|پس)\s+از\s+اجاره|مسکن)/.test(x);
  }
  function hasConcreteNeed(text){
    const x=lower(text);
    const boundedRent=boundedHousingNeed(x);
    const governedNeed=typeof KEYWORDS!=='undefined'&&['vision','family'].some(key=>Array.isArray(KEYWORDS[key])&&KEYWORDS[key].some(term=>String(term||'')&&x.includes(lower(term))));
    const dentalNeed=/(?:^|[^\p{L}\p{N}])tand/u.test(x);
    const otherNeed=/mat(?:en|)|livsmedel|läkemed|medicin|elräkning|skuld|sjuk|vård|assistans|funktions|arbetslös|hemma|food|medicine|دواء|دواء|طعام|مرض|أسنان|بصر|دارو|غذا|بیمار|دندان|بینایی/.test(x);
    return boundedRent||governedNeed||dentalNeed||otherNeed;
  }
  function boundedSelfFundingFallback(text){
    const x=lower(text);
    const self=/(?:^|\s)jag(?:\s|$)/.test(x)||/(?:^|[\s،,.])أنا(?:$|[\s،,.])/.test(x)||/(?:^|[\s،,.])من(?:$|[\s،,.])/.test(x);
    if(!self) return false;
    const housing=boundedHousingNeed(x);
    const essential=/(?:\bmat(?:en)?\b|livsmedel|läkemed|medicin|\b(?:elräkning(?:en|ar|arna)?|hushållsel|elkostnad(?:en|er|erna)?)\b|\bfood\b|medicine|دواء|طعام|(?:فاتورة|تكلفة|تكاليف)\s+الكهرباء|دارو|غذا|قبض\s+برق|هزینه(?:‌ی|ی)?\s*برق)/.test(x);
    if(!housing&&!essential) return false;
    if(typeof classify!=='function') return false;
    try{
      const keys=classify(text);
      return Array.isArray(keys)&&keys.length===1&&keys[0]==='general';
    }catch(_err){
      return false;
    }
  }
  function actorFromUrl(){
    return URL_ACTORS[new URLSearchParams(location.search).get('actor_type')]||null;
  }
  function actorCandidatesFromText(text){
    const x=lower(text);
    const actors=[];
    const add=(actor,pattern)=>{if(pattern.test(x)&&!actors.includes(actor)) actors.push(actor)};
    add('relative',/jag hjälper|أساعد|کمک می‌کنم|کمک میکنم/);
    add('property_actor',/\bbrf\b|bostadsrättsförening|fastighetsägare|hyresvärd|جمعية سكنية|مالك العقار|هیئت مدیره ساختمان|مالک ساختمان/);
    add('company',/driver (?:ett |en |)företag|mitt företag|vårt företag|företagare|شركة|شركتي|کسب.?وکار|شرکت من/);
    add('association',/vår förening|föreningen|ideell förening|جمعية|انجمن/);
    add('study',/jag studerar|student|studerar|studerande|طالب|أدرس|دانشجو|تحصیل/);
    add('employee',/jag är anställd|som anställd|anställd söker|jag jobbar|موظف|کارمند|شاغل/);
    add('private',/jag är privatperson|privatperson|فرد|شخصی/);
    return actors;
  }
  function actorFromText(text){
    const actors=actorCandidatesFromText(text);
    return actors.length===1?actors[0]:null;
  }
  function explicitlyCorrectsActor(text,actor){
    const x=lower(text);
    const patterns={
      sv:{
        employee:/inte längre anställd|inte anställd längre|är inte anställd|har slutat (?:mitt |på )?jobb/,
        study:/studerar inte längre|inte längre student|inte student längre/,
        company:/driver inte längre (?:ett |en )?företag|inte längre företagare/,
        association:/inte längre (?:med i |del av )?(?:en |vår )?förening/,
        relative:/hjälper inte längre/,
        property_actor:/inte längre (?:brf|bostadsrättsförening|fastighetsägare|hyresvärd)/,
        private:/inte längre privatperson/
      },
      ar:{
        employee:/لم أعد موظف|لست موظف/,
        study:/لم أعد طالب|لست طالب/
      },
      fa:{
        employee:/دیگر کارمند نیستم|کارمند نیستم|دیگر شاغل نیستم/,
        study:/دیگر دانشجو نیستم|دانشجو نیستم/
      }
    };
    const langPatterns=patterns[currentLang()]||{};
    return Boolean(langPatterns[actor]&&langPatterns[actor].test(x));
  }
  function resolvedFundingActor(text){
    const previous=actorFromUrl();
    const currentActors=actorCandidatesFromText(text);
    if(!previous) return currentActors.length===1?currentActors[0]:null;
    if(explicitlyCorrectsActor(text,previous)){
      const replacements=currentActors.filter(actor=>actor!==previous);
      return replacements.length===1?replacements[0]:null;
    }
    if(currentActors.length===0) return previous;
    if(currentActors.length===1&&currentActors[0]===previous) return previous;
    return null;
  }
  function helperFundingScope(text){
    const x=lower(text);
    return /(?:åt|för)\s+(?:barnet|min(?:t|)\s+barn|min\s+mamma|min\s+pappa|min\s+mor|min\s+far|min\s+partner|henne|honom)|ل(?:طفلي|ابني|ابنتي|أمي|أبي)|نيابة\s+عن|برای\s+(?:فرزندم|پسرم|دخترم|مادرم|پدرم|همسرم|او)/.test(x);
  }
  function actorHref(actor,lang,intent){
    const url=new URL(ACTOR_ROUTES[actor],location.href);
    if(lang!=='sv') url.searchParams.set('lang',lang);
    if(FUNDING_INTENTS.has(intent)) url.searchParams.set('funding_intent',intent);
    return url.pathname.split('/').pop()+url.search;
  }
  function routeHtmlForActor(actor,copy,lang,intent){
    const data=copy.actors[actor];
    const safeIntent=FUNDING_INTENTS.has(intent)?intent:'funding';
    return `<a class="route" data-funding-actor="${actor}" data-funding-intent="${safeIntent}" href="${actorHref(actor,lang,safeIntent)}"><span><strong>${data[0]}</strong><small>${data[1]}</small></span><span class="arrow" aria-hidden="true">→</span></a>`;
  }
  function renderFundingIntent(text){
    const intent=fundingIntent(text);
    if(!intent) return false;
    const lang=currentLang();
    const copy=FUNDING_COPY[lang];
    const actor=resolvedFundingActor(text)||(helperFundingScope(text)?'relative':null);
    if(hasConcreteNeed(text)&&actor!=='relative') return false;
    if(actor){
      box.innerHTML=`<div class="interpret">${copy.known}</div>${routeHtmlForActor(actor,copy,lang,intent)}`;
    }else{
      box.innerHTML=`<div class="interpret" data-funding-question="true">${copy.questions[intent]}</div>${['private','study','employee','company','association','relative','property_actor'].map(a=>routeHtmlForActor(a,copy,lang,intent)).join('')}`;
    }
    box.hidden=false;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
    return true;
  }
  function interceptFunding(event){
    const text=composer?composer.value.trim():'';
    if(!text||!renderFundingIntent(text)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  if(composer&&analyzeButton){
    analyzeButton.addEventListener('click',interceptFunding,true);
    composer.addEventListener('keydown',event=>{
      if((event.metaKey||event.ctrlKey)&&event.key==='Enter') interceptFunding(event);
    },true);
  }

  function safeToken(value){return String(value||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)}
  function coarseNeed(mode,text){
    const x=String(text||'').toLowerCase();
    if(mode==='dental'){
      if(/kost|råd|peng|dyr|ekonomi|stöd|bidrag|högkost|اقتص|مال|هزینه|پول/.test(x)) return 'cost';
      if(/ont|värk|smärt|akut|svull|besvär|درد|وجع/.test(x)) return 'care';
      if(/stöd|bidrag|högkost|حمایت|دعم/.test(x)) return 'support';
      return 'unsure';
    }
    if(mode==='vision'){
      if(/hem|bostad|lägen|trösk|kök|belys|خانه|منزل/.test(x)) return 'home';
      if(/mobil|dator|läsa|skärm|voiceover|hjälpmedel|تلفن|رایانه|خواندن/.test(x)) return 'tech';
      if(/jobb|arbete|skola|stud|کار|تحصیل|عمل|دراسة/.test(x)) return 'work';
      return 'unsure';
    }
    return 'unsure';
  }
  function routeKey(url){
    const mode=safeToken(url.searchParams.get('mode'));
    if(mode==='dental'||mode==='vision') return mode;
    const focus=safeToken(url.searchParams.get('focus'));
    if(focus==='assistance') return 'assistance';
    if(focus==='family') return 'family';
    if(focus==='vab') return 'vab';
    if(focus==='property_accessibility') return 'property';
    if(url.pathname.endsWith('company-pilot.html')) return 'company';
    const actor=safeToken(url.searchParams.get('actor_type'));
    return {employee:'work',student:'study',association:'association',property_actor:'property',private_person:'economy',relative:'general',other:'general'}[actor]||'general';
  }
  function preserveConcreteFundingIntent(url){
    const text=composer?composer.value.trim():'';
    const intent=fundingIntent(text);
    if(!intent||!hasConcreteNeed(text)) return false;
    const actor=safeToken(url.searchParams.get('actor_type'));
    const supportedPath=url.pathname.endsWith('person-pilot.html')||url.pathname.endsWith('company-pilot.html');
    if(!supportedPath||!FUNDING_DESTINATION_ACTORS.has(actor)) return false;
    url.searchParams.set('funding_intent',intent);
    return true;
  }
  function sanitizeAnchor(anchor){
    const url=new URL(anchor.href,location.href);
    const mode=safeToken(url.searchParams.get('mode'));
    const raw=url.searchParams.get('q');
    let changed=false;
    if((mode==='dental'||mode==='vision')&&raw){
      url.searchParams.set('need',coarseNeed(mode,raw));
      url.searchParams.delete('q');
      changed=true;
    }
    if(preserveConcreteFundingIntent(url)) changed=true;
    if(changed) anchor.href=url.pathname.split('/').pop()+url.search;
    return routeKey(url);
  }
  function ensureBoundedSelfFundingAlternative(){
    const text=composer?composer.value.trim():'';
    const intent=fundingIntent(text);
    if(!intent||!hasConcreteNeed(text)||!boundedSelfFundingFallback(text)) return;
    if(box.querySelector('a.route[data-bounded-self-funding="true"]')) return;
    const routes=[...box.querySelectorAll('a.route')];
    const broad=routes.find(anchor=>safeToken(new URL(anchor.href,location.href).searchParams.get('actor_type'))==='other');
    if(!broad) return;
    const hasTypedRoute=routes.some(anchor=>FUNDING_DESTINATION_ACTORS.has(safeToken(new URL(anchor.href,location.href).searchParams.get('actor_type'))));
    if(hasTypedRoute) return;
    const wrapper=document.createElement('div');
    wrapper.innerHTML=routeHtmlForActor('private',FUNDING_COPY[currentLang()],currentLang(),intent);
    const fallback=wrapper.firstElementChild;
    if(!fallback) return;
    fallback.dataset.boundedSelfFunding='true';
    broad.before(fallback);
  }
  function sanitize(){
    ensureBoundedSelfFundingAlternative();
    const routes=[...box.querySelectorAll('a.route')];
    routes.forEach(sanitizeAnchor);
    if(routes[0]) box.dataset.primaryRoute=sanitizeAnchor(routes[0]);
  }

  new MutationObserver(sanitize).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  box.addEventListener('click',event=>{
    const anchor=event.target.closest('a.route');
    if(anchor) sanitizeAnchor(anchor);
  },true);
  sanitize();
})();