(() => {
  function selfStudyIdentity(text){
    const x=String(text||'').toLocaleLowerCase();
    const sv=/\bjag\s+(?:är\s+student|studerar|studerande)\b/u.test(x)||/\bjag\s+är\s+anställd\s+och\s+studerar\b/u.test(x);
    const ar=/(?:^|[^\p{L}\p{N}])أدرس(?=$|[^\p{L}\p{N}])/u.test(x)||/(?:^|[^\p{L}\p{N}])أنا\s+(?:(?:موظف|موظفة)\s+و)?طالب(?:ة)?(?!\s+اللجوء)(?=$|[^\p{L}\p{N}])/u.test(x);
    const fa=/(?:^|[^\p{L}\p{N}])(?:من\s+[^.!؟\n]{0,32})?دانشجو(?:\s+و\s+(?:کارمند|شاغل))?\s+هستم(?=$|[^\p{L}\p{N}])/u.test(x)||/(?:^|[^\p{L}\p{N}])(?:من\s+)?تحصیل\s+می(?:‌|\s)?کنم(?=$|[^\p{L}\p{N}])/u.test(x);
    return sv||ar||fa;
  }
  function associationSelfMembership(text){
    const x=String(text||'').toLocaleLowerCase();
    const sv=/\b(?:jag\s+(?:är\s+)?(?:medlem\s+i|med\s+i)\s+(?:en\s+)?(?:ideell\s+)?förening(?:en)?|vår\s+förening)\b/u.test(x);
    const ar=/(?:^|[^\p{L}\p{N}])(?:و)?أنا\s+(?:أيضًا\s+)?عضو(?:ة|ًا|ا)?\s+في\s+(?:ال)?جمعية(?=$|[^\p{L}\p{N}])/u.test(x);
    const fa=/(?:^|[^\p{L}\p{N}])من\s+(?:هم\s+)?عضو\s+انجمن(?=$|[^\p{L}\p{N}])/u.test(x);
    return sv||ar||fa;
  }
  function thirdPartyAssociationMembership(text){
    const x=String(text||'').toLocaleLowerCase();
    if(associationSelfMembership(x)) return false;
    const sv=/\b(?:min|mitt|mina|hans|hennes|deras)\s+[\p{L}-]+(?:\s+[\p{L}-]+){0,2}\s+(?:är\s+)?(?:medlem\s+i|med\s+i)\s+(?:en\s+)?(?:ideell\s+)?förening(?:en)?\b/u.test(x);
    const ar=/(?:^|[^\p{L}\p{N}])(?!أنا(?=$|[^\p{L}\p{N}]))[\p{L}]{2,}\s+عضو(?:ة|ًا|ا)?\s+في\s+(?:ال)?جمعية(?=$|[^\p{L}\p{N}])/u.test(x);
    const fa=/(?:^|[^\p{L}\p{N}])(?!من(?=$|[^\p{L}\p{N}]))[\p{L}]{2,}\s+عضو\s+انجمن(?=$|[^\p{L}\p{N}])/u.test(x);
    return sv||ar||fa;
  }
  function installGovernedRoutes(){
    let rerender=false;
    try{
      if(typeof KEYWORDS!=='undefined'){
        if(typeof score==='function'){
          score=function(text,key){
            const hay=String(text||'').toLocaleLowerCase();
            if(key==='association'&&thirdPartyAssociationMembership(hay)) return 0;
            const terms=Array.isArray(KEYWORDS[key])?KEYWORDS[key]:[];
            return terms.reduce((count,term)=>{
              const needle=String(term||'').toLocaleLowerCase();
              let hit=false;
              if(needle==='tand') hit=/(?:^|[^\p{L}\p{N}])tand(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='råd') hit=/(?:^|[^\p{L}\p{N}])(?:har\s+)?inte\s+råd(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='arbete') hit=/(?:^|[^\p{L}\p{N}])arbete(?:t|ts|n|ns)?(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='jobb') hit=/(?:^|[^\p{L}\p{N}])jobb(?:et|ets|en|ens|a|ar|ade|at)?(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='عمل') hit=/(?:^|[^\p{L}\p{N}])(?:ال)?عمل(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='کار') hit=/(?:^|[^\p{L}\p{N}])کار(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='بصر') hit=/(?:^|[^\p{L}\p{N}])(?:ال)?بصر(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(key==='study'&&['student','studera','طالب','دانشجو','تحصیل'].includes(needle)) hit=selfStudyIdentity(hay);
              else if(needle==='جمعية') hit=!hay.includes('جمعية سكنية')&&hay.includes(needle);
              else if(needle==='موظف') hit=/(?:^|[^\p{L}\p{N}])أنا\s+موظف(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='کارمند') hit=/(?:^|[^\p{L}\p{N}])(?:من\s+)?کارمند(?:\s+هستم|\s+می(?:‌|\s)?باشم)(?=$|[^\p{L}\p{N}])/u.test(hay);
              else if(needle==='شاغل') hit=/(?:^|[^\p{L}\p{N}])(?:من\s+)?شاغل(?:\s+هستم|\s+می(?:‌|\s)?باشم)(?=$|[^\p{L}\p{N}])/u.test(hay);
              else hit=Boolean(needle&&hay.includes(needle));
              return count+(hit?1:0);
            },0);
          };
        }
        if(Array.isArray(KEYWORDS.company)) KEYWORDS.company=KEYWORDS.company.filter(term=>term!=='شرکت'&&term!=='شركة').concat(['شرکت من','شرکت ما','لدي شركة','لدينا شركة','شركتي','شركتنا','نحن شركة','أنا صاحب شركة','أنا صاحبة شركة']);
        if(Array.isArray(KEYWORDS.work)) KEYWORDS.work=KEYWORDS.work.concat(['کارمند','کارگر','شغل','أعمل','وظيفة']);
        if(Array.isArray(KEYWORDS.vision)) KEYWORDS.vision=KEYWORDS.vision.filter(term=>term!=='syn'&&term!=='نظر').concat(['dålig syn','sämre syn','synproblem']);
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
          'جمعية سكنية','جمعية سكنية تكييف السكن','مالك العقار تكييف السكن','منحدر مدخل المبنى','المساحات المشتركة تكييف السكن',
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
  const FUNDING_INTENT_CLARIFICATION={
    sv:'Du nämner flera sätt att få pengar. Vilken vill du börja med? Skriv ett av alternativen i rutan ovan och analysera igen.',
    ar:'ذكرت أكثر من نوع تمويل. أي نوع تريد أن نبدأ به؟ اكتب نوعًا واحدًا في المربع أعلاه ثم حلّل مرة أخرى.',
    fa:'چند نوع تأمین مالی را نام بردید. از کدام می‌خواهید شروع کنیم؟ یک مورد را در کادر بالا بنویسید و دوباره بررسی کنید.'
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
  const FUNDING_INTENT_PATTERNS=[
    ['scholarship',/(?:^|[^\p{L}\p{N}])(?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)(?=$|[^\p{L}\p{N}])|منحة|منح\s+دراسية|بورسیه/u],
    ['loan',/\blån(?:et|en)?\b|\bstudielån(?:et|en)?\b|\blåna\s+pengar\b|قرض|(?:^|[^\p{L}\p{N}])وام(?=$|[^\p{L}\p{N}])/u],
    ['funding',/pengar\s+att\s+sök|pengar\s+(?:kan\s+jag|jag\s+kan)\s+sök(?:a|er)?|sök(?:a|er)?\s+pengar|(?:\bfond(?:er)?\b\s+att\s+sök|\bfonder\b\s+(?:kan\s+jag|jag\s+kan)\s+sök(?:a|er)?|sök(?:a|er)?\s+(?:en\s+)?fond(?:er)?\b)|bidrag\s+att\s+sök|bidrag\s+(?:kan\s+jag|jag\s+kan)\s+sök(?:a|er)?|sök(?:a|er)?\s+bidrag|finansiering\s+att\s+sök|دعم(?:اً|ًا|ا)?\s+مالي(?:اً|ًا|ا)?|(?:ال)?مساعد(?:ة|ات)\s+(?:ال)?مالية|تمويل|کمک مالی|حمایت مالی|بودجه/u]
  ];

  function currentLang(){
    const value=new URLSearchParams(location.search).get('lang');
    return value==='ar'||value==='fa'?value:'sv';
  }
  function lower(value){return String(value||'').toLocaleLowerCase()}
  function fundingClauses(text){
    return lower(text).split(/[,.!?;،؛؟\n]+|\s+(?:utan|men|بل|لكن|بلکه|اما|فقط)\s+/u).map(part=>part.trim()).filter(Boolean);
  }
  function fundingClauseNegated(clause){
    const x=lower(clause);
    const sv=/\b(?:(?:sök(?:a|er)?|letar(?:\s+efter)?)\s+inte(?!\s+bara)|(?:vill|önskar)\s+inte(?!\s+bara)(?:\s+ha)?)\b/u.test(x);
    const ar=/(?:^|[\s])(?:و)?لا\s+(?:أبحث|ابحث|أريد|اريد)(?:\s+عن)?(?=$|[\s])/u.test(x);
    const fa=/(?:وام|بورسیه|کمک\s+مالی|حمایت\s+مالی|بودجه)[^.!؟،؛;\n]{0,24}نمی(?:‌|\s)?خواهم/u.test(x);
    const svBare=/^(?:inte|ej)\s+(?!bara\b)(?:(?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)|lån(?:et|en)?|studielån(?:et|en)?|bidrag|fond(?:er)?|finansiering|pengar)\b/u.test(x);
    const arBare=/^ليس\s+(?:قرض|منحة|منح\s+دراسية|دعم(?:اً|ًا|ا)?\s+مالي(?:اً|ًا|ا)?|(?:ال)?مساعد(?:ة|ات)\s+(?:ال)?مالية|تمويل)/u.test(x);
    const faBare=/^نه\s+(?:وام|بورسیه|کمک\s+مالی|حمایت\s+مالی|بودجه)(?=$|[\s.!؟،؛;])/u.test(x);
    return sv||ar||fa||svBare||arBare||faBare;
  }
  function fundingPatternDeterminerNegated(clause,pattern){
    if(currentLang()!=='sv') return false;
    const x=lower(clause);
    const matches=x.matchAll(/\b(?:inget|ingen|inga)\s+((?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)|studielån(?:et|en)?|lån(?:et|en)?|bidrag|fond(?:er)?|finansiering|pengar)\b/gu);
    return [...matches].some(match=>pattern.test(match[1]));
  }
  function fundingPatternModalNegated(clause,pattern){
    const lang=currentLang();
    const x=lower(clause);
    if(lang==='sv'){
      const matches=x.matchAll(/\bbehöver\s+inte(?!\s+bara)(?:\s+ha)?\s+((?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)|studielån(?:et|en)?|lån(?:et|en)?|bidrag|fond(?:er)?|finansiering|pengar)\b/gu);
      return [...matches].some(match=>pattern.test(match[1]));
    }
    if(lang==='ar'){
      const matches=x.matchAll(/(?:^|[\s،])(?:(?:أنا\s+)?لا\s+أحتاج|(?:هو\s+لا\s+يحتاج|هي\s+لا\s+تحتاج))(?:\s+إلى)?\s+((?:قرض(?:اً|ًا|ا)?|منحة|منح\s+دراسية|دعم(?:اً|ًا|ا)?\s+مالي(?:اً|ًا|ا)?|(?:ال)?مساعد(?:ة|ات)\s+(?:ال)?مالية|تمويل))(?=$|[\s،.!؟؛;])/gu);
      return [...matches].some(match=>pattern.test(match[1]));
    }
    if(lang==='fa'){
      const selfMatches=x.matchAll(/(?:^|[\s،])(?:من\s+)?(?:به\s+)?((?:وام|بورسیه|کمک\s+مالی|حمایت\s+مالی|بودجه))\s+نیاز\s+ندارم(?=$|[\s،.!؟؛;])/gu);
      const targetMatches=x.matchAll(/(?:^|[\s،])او\s+(?:به\s+)?((?:وام|بورسیه|کمک\s+مالی|حمایت\s+مالی|بودجه))\s+نیاز\s+ندارد(?=$|[\s،.!؟؛;])/gu);
      return [...selfMatches,...targetMatches].some(match=>pattern.test(match[1]));
    }
    return false;
  }
  function fundingPatternHistoricalReceipt(clause,pattern){
    const lang=currentLang();
    const x=lower(clause);
    if(pattern===FUNDING_INTENT_PATTERNS[0][1]){
      if(lang==='ar') return /(?:^|[^\p{L}\p{N}])(?:لقد\s+حصلت\s+بالفعل\s+على\s+(?:منحة|منح\s+دراسية)|حصلت\s+على\s+(?:منحة|منح\s+دراسية)[^.!؟،؛;\n]{0,40}العام\s+الماضي)(?=$|[^\p{L}\p{N}])/u.test(x);
      if(lang==='fa') return /(?:^|[^\p{L}\p{N}])(?:من\s+قبلاً\s+بورسیه\s+گرفته(?:‌|\s)?ام|سال\s+گذشته[^.!؟،؛;\n]{0,40}بورسیه\s+گرفتم)(?=$|[^\p{L}\p{N}])/u.test(x);
      if(lang!=='sv') return false;
      const pastMarker=/\b(?:förra året|tidigare|förut)\b/u.test(x);
      const receipt=/(?:\bjag\s+)?(?:fick|hade\s+fått|beviljades)\s+(?:jag\s+)?(?:ett\s+)?(?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)\b/u.test(x);
      const historicalApplication=/(?:\bjag\s+)?sökte\s+(?:jag\s+)?(?:ett\s+)?(?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)\b/u.test(x);
      const completedReceipt=/(?:\bjag\s+)?har\s+(?:jag\s+)?redan\s+fått\s+(?:ett\s+)?(?:stipendium|stipendiet|stipendier(?:na)?|stipenium|stipedium|stpendium)\b/u.test(x);
      return completedReceipt||(pastMarker&&(receipt||historicalApplication));
    }
    if(pattern!==FUNDING_INTENT_PATTERNS[1][1]) return false;
    if(lang==='ar'){
      const explicitApplication=/(?:^|[^\p{L}\p{N}])(?:أبحث|ابحث)\s+عن\s+قرض(?=$|[^\p{L}\p{N}])/u.test(x);
      if(explicitApplication) return false;
      const existingLoan=/(?:^|[^\p{L}\p{N}])لدي\s+قرض(?=$|[^\p{L}\p{N}])/u.test(x);
      const repayment=/(?:^|[^\p{L}\p{N}])(?:و)?(?:أسدد|اسدد)\s+(?:القرض|قرض)(?=$|[^\p{L}\p{N}])/u.test(x);
      const historicalLoan=/(?:^|[^\p{L}\p{N}])كان\s+لدي\s+قرض(?:\s+دراسي)?[^.!؟،؛;\n]{0,24}العام\s+الماضي(?=$|[^\p{L}\p{N}])/u.test(x);
      return historicalLoan||(existingLoan&&repayment);
    }
    if(lang==='fa'){
      const explicitApplication=/(?:^|[^\p{L}\p{N}])دنبال\s+وام\s+هستم(?=$|[^\p{L}\p{N}])/u.test(x);
      if(explicitApplication) return false;
      const existingLoan=/(?:^|[^\p{L}\p{N}])وام\s+دارم(?=$|[^\p{L}\p{N}])/u.test(x);
      const repayment=/(?:^|[^\p{L}\p{N}])(?:در\s+حال\s+)?بازپرداخت(?:\s+آن)?\s+هستم(?=$|[^\p{L}\p{N}])/u.test(x);
      const historicalLoan=/(?:^|[^\p{L}\p{N}])سال\s+گذشته\s+وام(?:\s+دانشجویی)?\s+داشتم(?=$|[^\p{L}\p{N}])/u.test(x);
      return historicalLoan||(existingLoan&&repayment);
    }
    if(lang!=='sv') return false;
    const pastMarker=/\b(?:förra året|tidigare|förut)\b/u.test(x);
    const explicitApplication=/\b(?:sök(?:a|er)|ansök(?:a|er)(?:\s+om)?)\s+(?:ett\s+)?(?:studielån(?:et|en)?|lån(?:et|en)?)\b|\blåna\s+pengar\b/u.test(x);
    if(explicitApplication) return false;
    const historicalLoan=pastMarker&&/(?:\bjag\s+)?(?:hade|tog|fick|beviljades)\s+(?:jag\s+)?(?:ett\s+)?(?:studielån(?:et|en)?|lån(?:et|en)?)\b/u.test(x);
    const repayment=/(?:\bjag\s+)?(?:har|hade)\s+(?:jag\s+)?(?:ett\s+)?(?:studielån(?:et|en)?|lån(?:et|en)?)\b/u.test(x)&&/(?:^|[^\p{L}\p{N}])(?:återbetal(?:a|ning(?:en)?)?|betala\s+tillbaka|amorter(?:a|ing(?:en)?)?|skuld(?:en)?)(?=$|[^\p{L}\p{N}])/u.test(x);
    return historicalLoan||repayment;
  }
  function fundingPatternNegated(clause,pattern){
    return fundingClauseNegated(clause)||fundingPatternDeterminerNegated(clause,pattern)||fundingPatternModalNegated(clause,pattern)||fundingPatternHistoricalReceipt(clause,pattern);
  }
  function hasAffirmedFundingMention(text,pattern){
    return fundingClauses(text).some(clause=>pattern.test(clause)&&!fundingPatternNegated(clause,pattern));
  }
  function hasRejectedFundingMention(text){
    return FUNDING_INTENT_PATTERNS.some(([_intent,pattern])=>fundingClauses(text).some(clause=>pattern.test(clause)&&fundingPatternNegated(clause,pattern)));
  }
  function affirmedFundingIntents(text){
    const x=lower(text);
    if(/upphandling|anbud|offentlig(?:a|) affär|مناقصة|مناقصه/.test(x)) return [];
    return FUNDING_INTENT_PATTERNS.filter(([_intent,pattern])=>hasAffirmedFundingMention(x,pattern)).map(([intent])=>intent);
  }
  function hasFundingAlternativeConnector(text){
    const x=lower(text);
    return /\beller\b/u.test(x)||/(?:^|[\s،])أو(?=$|[\s،])/u.test(x)||/(?:^|[\s،])یا(?=$|[\s،])/u.test(x);
  }
  function hasFundingAdditiveConnector(text){
    const x=lower(text);
    return /\boch\b/u.test(x)||/(?:^|[\s،])و(?=$|[\s،])/u.test(x)||/و(?=(?:منحة|منح|قرض|دعم|تمويل|بورسیه|وام|کمک|حمایت|بودجه))/u.test(x);
  }
  function fundingIntentNeedsClarification(text,intents=affirmedFundingIntents(text)){
    return intents.length>1;
  }
  function fundingIntent(text){
    const intents=affirmedFundingIntents(text);
    if(fundingIntentNeedsClarification(text,intents)) return null;
    return intents[0]||null;
  }
  function boundedHousingNeed(text){
    const x=lower(text);
    return /(?:\bhyran\b|\b(?:hög|dyr)\s+hyra\b|\bhyra\b(?=\s*(?:och|,|\.|$))|\b(?:boende|bostads)kostnad(?:en|er|erna)?\b|\bbostad(?:en)?\b|\brent\b|(?:ال)?إيجار\s+(?:مرتفع|عال(?:ي|ية)?|غالي|غالية)|بعد\s+الإيجار|(?:تكلفة|تكاليف)\s+السكن|السكن|اجاره\s+(?:بالا(?:یی)?|زیاد|سنگین|گران)|(?:بعد|پس)\s+از\s+اجاره|مسکن)/.test(x);
  }
  function hasConcreteNeed(text){
    const x=lower(text);
    const boundedRent=boundedHousingNeed(x);
    const governedNeed=typeof score==='function'&&['vision','family'].some(key=>score(x,key)>0);
    const dentalNeed=/(?:^|[^\p{L}\p{N}])tand/u.test(x);
    const otherNeed=/(?:^|[^\p{L}\p{N}])mat(?:en|varor)?(?=$|[^\p{L}\p{N}])|livsmedel|läkemed|medicin|elräkning|skuld|sjuk|vård|assistans|funktions|arbetslös|hemma|food|medicine|دواء|دواء|طعام|مرض|أسنان|دارو|غذا|بیمار|دندان|بینایی/u.test(x);
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
  function helperRoleNegated(text){
    const x=lower(text);
    return /\bjag\s+hjälper\s+inte(?:\s+längre)?\b/u.test(x)||/لم\s+أعد\s+أساعد|لا\s+أساعد/u.test(x)||/کمک\s+نمی(?:‌|\s)?کنم/u.test(x);
  }
  function targetAwareSwedishHelpOut(text){
    const x=lower(text);
    return /\bjag\s+hjälper\s+till\s+(?:(?:hemma\s+)?hos|med|för)\s+(?:mitt\s+barn|min\s+(?:barn|son|dotter|mamma|pappa|mor|far|partner|sambo|make|maka|fru|man|syster|bror|syskon|vän)|henne|honom)\b/u.test(x)&&!helperRoleNegated(x);
  }
  function currentHelperRole(text){
    const x=lower(text);
    const sv=/\bjag\s+hjälper(?!\s+(?:inte|till)\b)/u.test(x)||targetAwareSwedishHelpOut(x);
    const ar=/(?:^|[^\p{L}\p{N}])أساعد(?=$|[^\p{L}\p{N}])/u.test(x.replace(/لم\s+أعد\s+أساعد|لا\s+أساعد/gu,' '));
    const fa=/کمک\s+می(?:‌|\s)?کنم/u.test(x);
    return sv||ar||fa;
  }
  function positiveSupportTargetActors(text){
    const x=lower(text);
    const patterns={
      sv:{study:/\bför mina studier\b/u,employee:/\bför mitt (?:jobb|arbete)\b/u},
      ar:{study:/لدراستي/u,employee:/لعملي/u},
      fa:{study:/برای\s+تحصیلم/u,employee:/برای\s+کارم/u}
    };
    const current=patterns[currentLang()]||{};
    return ['study','employee'].filter(actor=>current[actor]&&current[actor].test(x)&&!explicitlyCorrectsActor(text,actor));
  }
  function actorCandidatesFromText(text){
    const x=lower(text);
    const actors=[];
    const add=(actor,pattern)=>{if(pattern.test(x)&&!actors.includes(actor)) actors.push(actor)};
    const propertyPattern=/\bbrf\b|bostadsrättsförening|fastighetsägare|hyresvärd|جمعية سكنية|مالك العقار|هیئت مدیره ساختمان|مالک ساختمان/;
    const propertyHit=propertyPattern.test(x);
    const thirdPartyProperty=/(?:^|[^\p{L}\p{N}])(?:min|vår)\s+(?:hyresvärd|fastighetsägare)(?=$|[^\p{L}\p{N}])/u.test(x)||/\b(?:min|mitt|mina|vår|vårt|våra)\s+(?:barn|son|dotter|mamma|pappa|mor|far|partner|sambo|make|maka|syster|bror|syskon|vän)\b[^.!?\n]{0,48}\b(?:är\s+)?(?:fastighetsägare|hyresvärd)\b/u.test(x)||/(?:^|[^\p{L}\p{N}])(?:طفلي|ابني|ابنتي|أمي|أبي|أخي|أختي|صديقي|صديقتي|زوجي|زوجتي)[^.!؟\n]{0,48}مالك\s+العقار(?=$|[^\p{L}\p{N}])/u.test(x)||/(?:(?:مالك العقار|جمعية سكنية)[^.!؟\n]{0,80}طلبي|طلبي[^.!؟\n]{0,80}(?:مالك العقار|جمعية سكنية))/u.test(x)||/(?:(?:مالک ساختمان|هیئت مدیره ساختمان)[^.!؟\n]{0,80}درخواست\s+من|درخواست\s+من[^.!؟\n]{0,80}(?:مالک ساختمان|هیئت مدیره ساختمان))/u.test(x);
    if(currentHelperRole(x)) actors.push('relative');
    if(!thirdPartyProperty) add('property_actor',propertyPattern);
    add('company',/\b(?:jag\s+är\s+företagare|jag\s+driver\s+(?:ett\s+|en\s+)?företag|mitt\s+företag|vårt\s+företag)\b|(?:^|[.!?]\s*)driver\s+(?:ett\s+|en\s+)?företag\b|(?:^|[^\p{L}\p{N}])(?:لدي\s+شركة|لدينا\s+شركة|شركتي|شركتنا|لشركتي|لشركتنا|نحن\s+شركة|أنا\s+صاحب(?:ة)?\s+شركة)(?=$|[^\p{L}\p{N}])|(?:^|[^\p{L}\p{N}])(?:شرکت\s+(?:من|ما)|کسب.?وکار\s+من|من\s+(?:یک\s+)?کسب.?وکار\s+دارم)(?=$|[^\p{L}\p{N}])/u);
    if(!thirdPartyAssociationMembership(x)&&!(propertyHit&&/جمعية سكنية/.test(x))) add('association',/vår förening|föreningen|ideell förening|جمعية|انجمن/);
    if(selfStudyIdentity(x)) actors.push('study');
    add('employee',/jag är anställd|som anställd|anställd söker|jag jobbar|أنا\s+موظف|(?:^|[^\p{L}\p{N}])(?:من\s+)?کارمند(?:\s+و\s+دانشجو)?(?:\s+هستم|\s+می(?:‌|\s)?باشم)(?=$|[^\p{L}\p{N}])|(?:^|[^\p{L}\p{N}])(?:من\s+)?شاغل(?:\s+و\s+دانشجو)?(?:\s+هستم|\s+می(?:‌|\s)?باشم)(?=$|[^\p{L}\p{N}])/u);
    add('private',/jag är privatperson|privatperson|فرد|شخصی/);
    for(const actor of positiveSupportTargetActors(text)){if(!actors.includes(actor)) actors.push(actor)}
    return actors.filter(actor=>!explicitlyCorrectsActor(text,actor));
  }
  function actorFromText(text){
    const actors=actorCandidatesFromText(text);
    return actors.length===1?actors[0]:null;
  }
  function explicitlyCorrectsActor(text,actor){
    const x=lower(text);
    if(actor==='relative'&&helperRoleNegated(x)) return true;
    const patterns={
      sv:{
        employee:/inte längre anställd|inte anställd längre|är inte anställd|har slutat (?:mitt |på )?jobb|inte för mitt jobb|inte för mitt arbete/,
        study:/studerar inte längre|inte längre student|inte student längre|inte för mina studier/,
        company:/driver inte längre (?:ett |en )?företag|inte längre företagare|inte för mitt företag/,
        association:/inte längre (?:med i |del av )?(?:en |vår )?förening|inte för (?:min|vår) förening/,
        relative:/hjälper inte längre/,
        property_actor:/inte längre (?:brf|bostadsrättsförening|fastighetsägare|hyresvärd)|inte för (?:min|vår) (?:brf|bostadsrättsförening)/,
        private:/inte längre privatperson/
      },
      ar:{
        employee:/لم أعد موظف|لست موظف|ليس لعملي/,
        study:/لم أعد طالب|لست طالب|ليس لدراستي/,
        company:/لم أعد صاحب(?:ة)? شركة|لست صاحب(?:ة)? شركة|ليس لشركتي|ليس لشركتنا/,
        association:/لم أعد (?:في |عضو(?:ًا|ا)? في )?جمعية|لست (?:في |عضو(?:ًا|ا)? في )?جمعية|ليس لجمعية/,
        property_actor:/لم أعد مالك العقار|لست مالك العقار|ليس لمالك العقار/,
        private:/ليس\s+لفرد/
      },
      fa:{
        employee:/دیگر کارمند نیستم|کارمند نیستم|دیگر شاغل نیستم|نه برای کارم/,
        study:/دیگر دانشجو نیستم|دانشجو نیستم|نه برای تحصیلم/,
        company:/دیگر صاحب شرکت نیستم|صاحب شرکت نیستم|نه برای شرکت (?:من|ما)/,
        association:/دیگر (?:عضو )?انجمن نیستم|(?:عضو )?انجمن نیستم|نه برای انجمن من/,
        property_actor:/دیگر مالک ساختمان نیستم|مالک ساختمان نیستم|نه برای مالک ساختمان/,
        private:/درخواست\s+شخصی\s+نیست/
      }
    };
    const langPatterns=patterns[currentLang()]||{};
    return Boolean(langPatterns[actor]&&langPatterns[actor].test(x));
  }
  function affirmedFundingTargetActors(text){
    const actors=[];
    for(const clause of fundingClauses(text)){
      const hasAffirmedIntent=FUNDING_INTENT_PATTERNS.some(([_intent,pattern])=>pattern.test(clause)&&!fundingPatternNegated(clause,pattern));
      if(!hasAffirmedIntent) continue;
      const supportTargets=positiveSupportTargetActors(clause).filter(actor=>!explicitlyCorrectsActor(text,actor));
      for(const actor of supportTargets){
        if(!actors.includes(actor)) actors.push(actor);
      }
      if(supportTargets.length===0&&helperFundingScope(clause)&&!explicitlyCorrectsActor(text,'relative')&&!actors.includes('relative')) actors.push('relative');
    }
    return actors;
  }
  function resolvedFundingActor(text){
    const previous=actorFromUrl();
    const currentActors=actorCandidatesFromText(text);
    const explicitTargets=affirmedFundingTargetActors(text);
    if(explicitTargets.length===1) return explicitTargets[0];
    if(explicitTargets.length>1) return null;
    if(!previous) return currentActors.length===1?currentActors[0]:null;
    if(explicitlyCorrectsActor(text,previous)){
      const replacements=currentActors.filter(actor=>actor!==previous);
      return replacements.length===1?replacements[0]:null;
    }
    if(currentActors.length===0) return previous;
    if(currentActors.length===1&&currentActors[0]===previous) return previous;
    return null;
  }
  function affirmedFundingClauseActor(text){
    const explicitTargets=affirmedFundingTargetActors(text);
    if(explicitTargets.length===1) return explicitTargets[0];
    if(explicitTargets.length>1) return null;
    const actors=[];
    let ambiguous=false;
    for(const clause of fundingClauses(text)){
      const hasAffirmedIntent=FUNDING_INTENT_PATTERNS.some(([_intent,pattern])=>pattern.test(clause)&&!fundingPatternNegated(clause,pattern));
      if(!hasAffirmedIntent) continue;
      const candidates=actorCandidatesFromText(clause).filter(actor=>!explicitlyCorrectsActor(text,actor));
      if(candidates.length>1){
        ambiguous=true;
        continue;
      }
      if(candidates.length===1&&!actors.includes(candidates[0])) actors.push(candidates[0]);
    }
    if(ambiguous||actors.length>1) return null;
    return actors[0]||null;
  }
  function renderableFundingActor(text){
    const clauseActor=affirmedFundingClauseActor(text);
    if(clauseActor) return clauseActor;
    return resolvedFundingActor(text);
  }
  function helperFundingScope(text){
    const x=lower(text);
    if(helperRoleNegated(x)&&!currentHelperRole(x)) return false;
    return targetAwareSwedishHelpOut(x)||/(?:åt|för)\s+(?:barnet|mitt\s+barn|min\s+(?:barn|son|dotter|mamma|pappa|mor|far|partner|sambo|make|maka|fru|man|syster|bror|syskon|vän)|henne|honom)|jag\s+hjälper\s+(?:mitt\s+barn|min\s+(?:barn|son|dotter|mamma|pappa|mor|far|partner|sambo|make|maka|fru|man|syster|bror|syskon|vän)|henne|honom)|أساعد\s+(?:طفلي|ابني|ابنتي|أمي|أبي|أخي|أختي|صديقي|صديقتي|زوجي|زوجتي)|ل(?:طفلي|ابني|ابنتي|أمي|أبي|أخي|أختي|صديقي|صديقتي|زوجي|زوجتي)|نيابة\s+عن|برای\s+(?:فرزندم|پسرم|دخترم|مادرم|پدرم|همسرم|خواهرم|برادرم|دوستم|او)|به\s+(?:فرزندم|پسرم|دخترم|مادرم|پدرم|همسرم|خواهرم|برادرم|دوستم)[^.!؟\n]{0,80}کمک\s+می(?:‌|\s)?کنم/u.test(x);
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
  function rejectedFundingHelperRouteHtml(copy,lang){
    const data=copy.actors.relative;
    return `<a class="route" data-funding-actor="relative" data-rejected-funding-helper="true" href="${actorHref('relative',lang,null)}"><span><strong>${data[0]}</strong><small>${data[1]}</small></span><span class="arrow" aria-hidden="true">→</span></a>`;
  }
  function renderFundingIntent(text){
    const intents=affirmedFundingIntents(text);
    const lang=currentLang();
    if(fundingIntentNeedsClarification(text,intents)){
      box.innerHTML=`<div class="interpret" data-funding-intent-question="true">${FUNDING_INTENT_CLARIFICATION[lang]}</div>`;
      box.hidden=false;
      box.scrollIntoView({behavior:'smooth',block:'nearest'});
      return true;
    }
    const intent=intents[0]||null;
    if(!intent) return false;
    const copy=FUNDING_COPY[lang];
    const actor=renderableFundingActor(text);
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
  function renderRejectedFundingHelperNeed(text){
    const lang=currentLang();
    if(affirmedFundingIntents(text).length||!helperFundingScope(text)||!hasRejectedFundingMention(text)||!hasConcreteNeed(text)) return false;
    const copy=FUNDING_COPY[lang];
    box.innerHTML=`<div class="interpret">${copy.known}</div>${rejectedFundingHelperRouteHtml(copy,lang)}`;
    box.hidden=false;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
    return true;
  }
  function interceptFunding(event){
    const text=composer?composer.value.trim():'';
    if(!text||!(renderFundingIntent(text)||renderRejectedFundingHelperNeed(text))) return;
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
  function preserveBoundedPrivateHousingContext(url){
    const text=composer?composer.value.trim():'';
    if(!boundedHousingNeed(text)) return false;
    if(!url.pathname.endsWith('person-pilot.html')) return false;
    if(safeToken(url.searchParams.get('actor_type'))!=='private_person') return false;
    if(url.searchParams.has('need_context')) return false;
    url.searchParams.set('need_context','housing');
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
    if(preserveBoundedPrivateHousingContext(url)) changed=true;
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