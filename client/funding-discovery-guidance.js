(() => {
  // Shared product correction: refine the existing org flow instead of creating a new association engine.
  // This runtime only changes ranking/next-action rows from already-selected coarse answers.
  if (typeof getRows !== 'function' || typeof start !== 'function' || typeof render !== 'function') return;

  const MUCF_URL='https://www.mucf.se/bidrag';
  const MUNICIPALITY_URL='https://skr.se/kommunerochregioner/kommunerlista.8288.html';
  const ARVSFONDEN_URL='https://www.arvsfonden.se/ansokan/vara-stodformer';
  const FOUNDATION_URL='https://stiftelser.lansstyrelsen.se/';
  const RF_LOKAL_URL='https://www.rf.se/bidrag-och-stod/stod-till-anlaggningar-och-idrottsmiljoer';
  const PROCUREMENT_URL='https://www.upphandlingsmyndigheten.se/foretagare/';
  const COMPANY_URL='company-pilot.html?actor_type=company';

  const ROWS={
    sv:{
      association:{
        funding:[
          ['MUCF – aktuella bidrag','Stats- och EU-bidrag är ändamålsstyrda. Börja med aktuella utlysningar och kontrollera syfte, vem som får söka och ansökningstid i originalkällan.',MUCF_URL],
          ['Kommunala föreningsbidrag','Om verksamheten är lokal: gå till den egna kommunens officiella webbplats och kontrollera förenings-, verksamhets- eller projektbidrag. Stödformer och villkor varierar mellan kommuner.',MUNICIPALITY_URL],
          ['Allmänna arvsfonden','Kan vara värd att kontrollera för ideell verksamhet när projekt eller lokal matchar fondens målgrupper och stödform. Föreningsstatus ensam bevisar inte att stödet passar.',ARVSFONDEN_URL],
          ['Stiftelsesök – discovery, inte beslut','Registret kan hjälpa er hitta stiftelser, men en registerträff betyder inte att det finns en öppen ansökan. Kontakta stiftelsen om ändamål, ansökningstid och handlingar.',FOUNDATION_URL]
        ],
        facility:[
          ['Kommunala lokal- och föreningsstöd','Börja med den egna kommunens officiella webbplats. Lokala regler, målgrupper, kostnader och ansökningstider kan skilja sig och ska inte antas vara nationellt enhetliga.',MUNICIPALITY_URL],
          ['Allmänna arvsfonden – kontrollera lokalstöd','Lokalstöd är en separat stödform med egna krav. Kontrollera den aktuella stödformen och organisationens förutsättningar innan ni planerar finansieringen.',ARVSFONDEN_URL],
          ['RF:s anläggningsstöd – bara om idrottsspåret faktiskt passar','Detta är relevant att kontrollera för rätt idrottsorganisation och projekt, inte som generellt lokalstöd för alla ideella föreningar.',RF_LOKAL_URL],
          ['Stiftelsesök – kompletterande discovery','Använd registerträffar som ledtrådar och verifiera sedan direkt hos respektive stiftelse om ansökan, ändamål och tider.',FOUNDATION_URL]
        ],
        procurement:[
          ['Offentliga affärer – leverantörsvägen','En ideell organisation som vill leverera till offentlig sektor behöver kontrollera den konkreta affären, krav och upphandlingsform. Organisationsformen i sig garanterar inte att ett anbud kan eller bör lämnas.',PROCUREMENT_URL],
          ['Den offentliga köparen','Om behovet gäller en viss kommun eller annan offentlig aktör: gå till den aktörens officiella upphandlingsinformation och verifiera aktuell väg. Använd kommunlistan bara för att hitta rätt officiella webbplats.',MUNICIPALITY_URL]
        ]
      },
      company:{
        funding:[['Fortsätt i företagsspåret i samma Stödassistenten','Företag har ett eget fokuserat flöde i samma produkt för finansiering kontra offentlig affär. Där ställs bara frågor som kan ändra nästa steg.',COMPANY_URL]],
        facility:[['Fortsätt i företagsspåret i samma Stödassistenten','Lokal, investering och finansiering ska inte blandas ihop med föreningsstöd. Fortsätt i företagsspåret och verifiera aktuell stödform där.',COMPANY_URL]],
        procurement:[['Fortsätt i företagsspåret i samma Stödassistenten','Upphandling hanteras i företagsspåret med den befintliga source-aware upphandlingslogiken.',COMPANY_URL],['Upphandlingsmyndigheten','Kontrollera den konkreta affären och dess krav i primärkällan; en generell leverantörsprofil är inte ett anbudsbeslut.',PROCUREMENT_URL]]
      }
    },
    ar:{
      association:{
        funding:[
          ['MUCF – المنح الحالية','المنح الحكومية والأوروبية مرتبطة بغرض محدد. ابدأ بالفرص الحالية وتحقق من الهدف والجهة التي يحق لها التقديم والموعد في المصدر الأصلي.',MUCF_URL],
          ['منح الجمعيات في البلدية','إذا كان النشاط محلياً، ابدأ بالموقع الرسمي لبلديتكم. أنواع الدعم والشروط تختلف بين البلديات ولا توجد قاعدة محلية واحدة لكل السويد.',MUNICIPALITY_URL],
          ['Allmänna arvsfonden','قد يكون مناسباً لبعض المشاريع أو الأماكن ذات الطابع غير الربحي عندما تتطابق الفئة المستهدفة ونوع الدعم. كونكم جمعية لا يثبت الأهلية وحده.',ARVSFONDEN_URL],
          ['Stiftelsesök – للاكتشاف فقط','العثور على مؤسسة في السجل لا يعني أن باب التقديم مفتوح. تحقق مباشرة من المؤسسة من الغرض والمواعيد والوثائق.',FOUNDATION_URL]
        ],
        facility:[
          ['دعم المقر والجمعيات في البلدية','ابدأ بالموقع الرسمي لبلديتكم وتحقق من القواعد الحالية. الشروط والتكاليف المقبولة والمواعيد تختلف محلياً.',MUNICIPALITY_URL],
          ['Allmänna arvsfonden – تحقق من lokalstöd','دعم الأماكن هو مسار منفصل له شروطه. تحقق من نوع الدعم الحالي قبل الاعتماد عليه في التمويل.',ARVSFONDEN_URL],
          ['دعم منشآت RF – فقط إذا كان مسار الرياضة مناسباً فعلاً','ليس هذا دعماً عاماً لكل جمعية؛ تحقق من صلة الجمعية الرياضية والمشروع بالشروط الحالية.',RF_LOKAL_URL],
          ['Stiftelsesök – اكتشاف تكميلي','استخدم السجل كإشارة ثم تحقق مباشرة من كل مؤسسة من شروط التقديم.',FOUNDATION_URL]
        ],
        procurement:[
          ['الأعمال العامة – مسار المورد','إذا أرادت الجمعية التوريد للقطاع العام فيجب التحقق من الصفقة المحددة وشروطها وطريقة الشراء. شكل المنظمة وحده لا يضمن أن تقديم عرض مناسب.',PROCUREMENT_URL],
          ['الجهة العامة المعنية','إذا كان الأمر يتعلق ببلدية أو جهة محددة، افتح معلومات المشتريات الرسمية لتلك الجهة. استخدم قائمة البلديات فقط للوصول إلى الموقع الرسمي الصحيح.',MUNICIPALITY_URL]
        ]
      },
      company:{
        funding:[['تابع في مسار الشركات داخل نفس Stödassistenten','للشركات مسار مركز داخل نفس المنتج يفصل بين التمويل والصفقات العامة.',COMPANY_URL]],
        facility:[['تابع في مسار الشركات داخل نفس Stödassistenten','لا تخلط بين استثمار الشركة ودعم الجمعيات. تابع في مسار الشركات وتحقق من الدعم الحالي هناك.',COMPANY_URL]],
        procurement:[['تابع في مسار الشركات داخل نفس Stödassistenten','المشتريات تُعالج في مسار الشركات باستخدام منطق التحقق الحالي.',COMPANY_URL],['Upphandlingsmyndigheten','تحقق من الصفقة الفعلية ومتطلباتها في المصدر الأصلي.',PROCUREMENT_URL]]
      }
    },
    fa:{
      association:{
        funding:[
          ['MUCF – حمایت‌های فعلی','کمک‌های دولتی و اتحادیه اروپا هدف‌محورند. از فراخوان‌های فعلی شروع کنید و هدف، متقاضی مجاز و زمان درخواست را در منبع اصلی بررسی کنید.',MUCF_URL],
          ['حمایت انجمن در شهرداری','اگر فعالیت محلی است، از وب‌سایت رسمی شهرداری خود شروع کنید. نوع حمایت و شرایط بین شهرداری‌ها فرق دارد و یک قاعده محلی واحد برای کل سوئد وجود ندارد.',MUNICIPALITY_URL],
          ['Allmänna arvsfonden','برای برخی پروژه‌ها یا فضاهای غیرانتفاعی، وقتی گروه هدف و نوع حمایت واقعاً تطبیق دارد، ارزش بررسی دارد. انجمن بودن به‌تنهایی استحقاق را ثابت نمی‌کند.',ARVSFONDEN_URL],
          ['Stiftelsesök – فقط برای کشف','پیدا شدن یک بنیاد در ثبت به معنی باز بودن درخواست نیست. هدف، مهلت و مدارک را مستقیم از خود بنیاد بررسی کنید.',FOUNDATION_URL]
        ],
        facility:[
          ['حمایت محلی و انجمنی شهرداری','از وب‌سایت رسمی شهرداری خود شروع کنید. قواعد، هزینه‌های قابل قبول و مهلت‌ها محلی‌اند و نباید یکسان فرض شوند.',MUNICIPALITY_URL],
          ['Allmänna arvsfonden – lokalstöd را بررسی کنید','حمایت محل یک نوع حمایت جداگانه با شرایط خاص خود است. پیش از حساب کردن روی آن، شرایط فعلی را بررسی کنید.',ARVSFONDEN_URL],
          ['حمایت تأسیسات RF – فقط اگر مسیر ورزشی واقعاً مناسب است','این حمایت عمومی برای همه انجمن‌های غیرانتفاعی نیست؛ ارتباط با سازمان ورزشی و پروژه را با شرایط فعلی تطبیق دهید.',RF_LOKAL_URL],
          ['Stiftelsesök – کشف تکمیلی','ثبت را به‌عنوان سرنخ استفاده کنید و سپس شرایط درخواست هر بنیاد را مستقیم بررسی کنید.',FOUNDATION_URL]
        ],
        procurement:[
          ['کسب‌وکار عمومی – مسیر تأمین‌کننده','اگر انجمن می‌خواهد به بخش عمومی خدمات یا کالا بدهد، معامله مشخص، الزامات و روش خرید را بررسی کنید. نوع سازمان به‌تنهایی تضمین نمی‌کند که ارائه پیشنهاد مناسب است.',PROCUREMENT_URL],
          ['خریدار عمومی مربوط','اگر نیاز به یک شهرداری یا نهاد مشخص مربوط است، اطلاعات رسمی خرید همان نهاد را بررسی کنید. فهرست شهرداری‌ها فقط برای رسیدن به وب‌سایت رسمی درست است.',MUNICIPALITY_URL]
        ]
      },
      company:{
        funding:[['در همان Stödassistenten به مسیر شرکت ادامه دهید','برای شرکت‌ها در همین محصول مسیر متمرکزی وجود دارد که تأمین مالی را از فرصت عمومی جدا می‌کند.',COMPANY_URL]],
        facility:[['در همان Stödassistenten به مسیر شرکت ادامه دهید','سرمایه‌گذاری شرکت را با حمایت انجمن یکی نگیرید. در مسیر شرکت ادامه دهید و حمایت فعلی را همان‌جا بررسی کنید.',COMPANY_URL]],
        procurement:[['در همان Stödassistenten به مسیر شرکت ادامه دهید','تدارکات عمومی در مسیر شرکت با منطق منبع‌محور موجود بررسی می‌شود.',COMPANY_URL],['Upphandlingsmyndigheten','معامله واقعی و الزاماتش را در منبع اصلی بررسی کنید.',PROCUREMENT_URL]]
      }
    }
  };

  const ASSOCIATION_SCHOLARSHIP_COPY={
    sv:{
      row:['Föreningsbidrag kräver en aktuell utlysning','MUCF listar stats- och EU-bidrag för civilsamhälle och organisationer, men en listning är inte bevis på att just er förening får söka eller att en viss ansökningsomgång är öppen. Öppna den konkreta utlysningen och kontrollera målgrupp, organisationsform, villkor, status, sista ansökningsdag och ansökningsväg i originalkällan.',MUCF_URL],
      planTitle:'Din handlingsplan',
      action:'1. Öppna MUCF:s aktuella bidrag, välj en relevant utlysning och kontrollera målgrupp, organisationsform, villkor, status, sista ansökningsdag och ansökningsväg hos MUCF innan ni går vidare.'
    },
    ar:{
      row:['منح الجمعيات تتطلب دعوة حالية للتقديم','تعرض MUCF منحاً حكومية وأوروبية للمجتمع المدني والمنظمات، لكن ظهور منحة في القائمة لا يثبت أن جمعيتكم يحق لها التقديم أو أن جولة تقديم معينة مفتوحة. افتحوا الدعوة المحددة وتحققوا من الفئة المستهدفة وشكل المنظمة والشروط والحالة والموعد النهائي وطريقة التقديم في المصدر الأصلي.',MUCF_URL],
      planTitle:'خطة العمل التالية',
      action:'1. افتحوا منح MUCF الحالية، اختاروا دعوة ذات صلة وتحققوا لدى MUCF من الفئة المستهدفة وشكل المنظمة والشروط والحالة والموعد النهائي وطريقة التقديم قبل المتابعة.'
    },
    fa:{
      row:['کمک انجمن به فراخوان جاری نیاز دارد','MUCF کمک‌های دولتی و اتحادیه اروپا برای جامعه مدنی و سازمان‌ها را فهرست می‌کند، اما بودن یک مورد در فهرست ثابت نمی‌کند انجمن شما مجاز به درخواست است یا یک دوره مشخص اکنون باز است. فراخوان مشخص را باز کنید و گروه هدف، نوع سازمان، شرایط، وضعیت، مهلت و مسیر درخواست را در منبع اصلی بررسی کنید.',MUCF_URL],
      planTitle:'برنامه اقدام بعدی',
      action:'1. کمک‌های فعلی MUCF را باز کنید، یک فراخوان مرتبط را انتخاب کنید و گروه هدف، نوع سازمان، شرایط، وضعیت، مهلت نهایی و مسیر درخواست را در MUCF بررسی کنید؛ سپس ادامه دهید.'
    }
  };

  const originalGetRows=getRows;
  const originalStart=start;
  const originalRender=render;

  // If the user explicitly entered as an association, do not ask again whether they are an association or company.
  start=function(kind){
    if(kind==='org' && typeof actorType!=='undefined' && actorType==='association'){
      scenario='org';
      answers={orgType:'association'};
      matchRatings={};
      finalFeedback={};
      submitState='idle';
      go('org2');
      return;
    }
    return originalStart(kind);
  };

  getRows=function(){
    if(typeof scenario!=='undefined' && scenario==='org' && typeof answers!=='undefined'){
      const locale=(typeof lang!=='undefined' && ROWS[lang])?lang:'sv';
      const kind=answers.orgType;
      const need=answers.orgNeed;
      if(kind==='association' && need==='funding' && answers.fundingIntent==='scholarship'){
        const rows=ROWS[locale].association.funding.map(row=>row.slice());
        rows[0]=ASSOCIATION_SCHOLARSHIP_COPY[locale].row.slice();
        return rows;
      }
      if((kind==='association'||kind==='company') && ROWS[locale][kind] && ROWS[locale][kind][need]){
        return ROWS[locale][kind][need];
      }
    }
    return originalGetRows();
  };

  function decorateAssociationScholarship(){
    if(typeof scenario==='undefined'||scenario!=='org'||typeof answers==='undefined')return;
    if(answers.orgType!=='association'||answers.orgNeed!=='funding'||answers.fundingIntent!=='scholarship')return;
    let currentScreen='';
    try{currentScreen=screen;}catch(_){return;}
    if(currentScreen!=='orgR')return;
    const host=document.getElementById('main');
    if(!host)return;
    const locale=(typeof lang!=='undefined'&&ASSOCIATION_SCHOLARSHIP_COPY[lang])?lang:'sv';
    const copy=ASSOCIATION_SCHOLARSHIP_COPY[locale];
    const article=host.querySelector('article.result');
    if(!article){console.error('association scholarship result failed closed: result missing');return;}
    const source=article.querySelector('a.source');
    if(!source||!String(source.href||'').includes('mucf.se/bidrag')){
      console.error('association scholarship result failed closed: MUCF primary route missing');
      return;
    }
    article.dataset.fundingIntentResult='scholarship';
    let actionPlan=null;
    for(const section of host.querySelectorAll('section.card')){
      const title=section.querySelector('h2');
      if(title&&String(title.textContent||'').trim()===copy.planTitle){actionPlan=section;break;}
    }
    if(!actionPlan){console.error('association scholarship action failed closed: action plan missing');return;}
    actionPlan.dataset.fundingIntentActionPlan='scholarship';
    const firstStep=actionPlan.querySelector('.info');
    if(firstStep)firstStep.textContent=copy.action;
    else console.error('association scholarship action failed closed: first step missing');
  }

  render=function(){
    originalRender();
    decorateAssociationScholarship();
  };
  decorateAssociationScholarship();
})();