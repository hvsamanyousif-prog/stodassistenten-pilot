(() => {
  const assistant=document.querySelector('.assistant');
  const composer=document.querySelector('.composer');
  const box=document.getElementById('engineResults');
  const situation=document.getElementById('situation');
  if(!assistant||!composer||!box) return;

  const AF_UNEMPLOYED_URL='https://arbetsformedlingen.se/for-arbetssokande/arbetslos---vad-hander-nu';
  const FK_SGI_URL='https://www.forsakringskassan.se/privatperson/arbetssokande';

  const COPY={
    sv:{
      steps:['Beskriv situationen','Välj relevant väg','Ta nästa steg'],
      found:n=>`Stödassistenten ser ${n} möjliga vägar. Börja med den första om den stämmer bäst – annars välj en annan.`,
      first:'Börja här',also:'Också relevant',
      footer:'Du kan alltid ändra väg. Motorn prioriterar alternativ men fattar inte beslut åt dig.',
      next:{
        dental:'Välj mellan vård, kostnad och stöd – sedan kommer du direkt till konkreta nästa steg.',
        vision:'Utgå från vad synen hindrar: bostad, teknik, arbete eller studier.',
        work:'Fortsätt till arbete och sjukdom så att nästa frågor kan skilja mellan relevanta vägar.',
        unemployment:'Du är redan utan arbete. Börja med första-dagen-steget här ovan; fortsätt sedan till den gemensamma personvägen om du behöver fler alternativ.',
        economy:'Fortsätt med ekonomi och boende; nästa frågor ska bara ställas när de ändrar vägen.',
        study:'Fortsätt med studier, boende eller övergången till arbete.',
        company:'Fortsätt till företagsspåret för upphandling, finansiering och beredskap.',
        association:'Fortsätt med förening, projekt, lokal och finansiering.',
        general:'Börja brett. Nästa frågor ska minska osäkerheten utan en lång intervju.'
      },
      unemployment:{
        eyebrow:'Första arbetslösa dagen',
        title:'Nyss arbetslös? Börja med inskrivningen – inte med en lång intervju.',
        body:'Arbetsförmedlingen anger att du ska skriva in dig din första arbetslösa dag. Därefter ansöker du om ersättning hos din a-kassa. Inskrivningen kan också vara viktig för att skydda SGI. Stödassistenten avgör inte om du har rätt till ersättning eller vilket belopp du kan få.',
        already:'Om du redan är inskriven kan du hoppa över första steget och gå vidare till a-kassan.',
        af:'Arbetsförmedlingen: skriv in dig / nästa steg',
        fk:'Försäkringskassan: kontrollera SGI vid arbetslöshet'
      }
    },
    ar:{
      steps:['اشرح وضعك','اختر المسار الأنسب','انتقل للخطوة التالية'],
      found:n=>`وجد مساعد الدعم ${n} مسارات محتملة. ابدأ بالأول إذا كان الأقرب، أو اختر مساراً آخر.`,
      first:'ابدأ هنا',also:'قد يكون مناسباً أيضاً',
      footer:'يمكنك تغيير المسار دائماً. المحرك يرتب الخيارات لكنه لا يتخذ القرار عنك.',
      next:{dental:'اختر بين العلاج والتكلفة والدعم ثم انتقل مباشرة إلى الخطوة التالية.',vision:'ابدأ بما يمنعك ضعف البصر من فعله: المنزل أو التقنية أو العمل أو الدراسة.',work:'تابع إلى مسار العمل والمرض حتى تميز الأسئلة التالية بين الخيارات ذات الصلة.',unemployment:'أنت بلا عمل الآن. ابدأ بخطوة اليوم الأول أعلاه ثم تابع إلى مسار الشخص المشترك إذا احتجت خيارات إضافية.',economy:'تابع مع الاقتصاد والسكن، ولا تُطرح أسئلة إضافية إلا عندما تغير المسار.',study:'تابع مع الدراسة أو السكن أو الانتقال إلى العمل.',company:'تابع إلى مسار الشركات للمشتريات والتمويل والاستعداد.',association:'تابع مع الجمعية والمشروع والمقر والتمويل.',general:'ابدأ بشكل واسع، ثم استخدم أقل عدد ممكن من الأسئلة لتقليل عدم اليقين.'},
      unemployment:{
        eyebrow:'أول يوم بلا عمل',
        title:'أصبحت عاطلاً عن العمل للتو؟ ابدأ بالتسجيل، لا بمقابلة طويلة.',
        body:'يوضح Arbetsförmedlingen أنك تسجل نفسك كباحث عن عمل في أول يوم تكون فيه بلا عمل. بعد ذلك تقدم طلب التعويض إلى صندوق البطالة الخاص بك. قد يكون التسجيل مهماً أيضاً لحماية SGI. لا يقرر Stödassistenten استحقاقك أو مبلغ التعويض.',
        already:'إذا كنت مسجلاً بالفعل، تجاوز الخطوة الأولى وانتقل إلى صندوق البطالة.',
        af:'Arbetsförmedlingen: التسجيل والخطوة التالية',
        fk:'Försäkringskassan: تحقق من SGI عند البطالة'
      }
    },
    fa:{
      steps:['شرایط را توضیح بده','مسیر مرتبط را انتخاب کن','قدم بعدی را بردار'],
      found:n=>`دستیار حمایت ${n} مسیر ممکن پیدا کرده است. اگر مسیر اول مناسب‌تر است از آن شروع کن؛ وگرنه مسیر دیگری را انتخاب کن.`,
      first:'از اینجا شروع کن',also:'ممکن است مرتبط باشد',
      footer:'هر زمان می‌توانی مسیر را عوض کنی. موتور گزینه‌ها را اولویت‌بندی می‌کند اما به‌جای تو تصمیم نمی‌گیرد.',
      next:{dental:'بین درمان، هزینه و حمایت انتخاب کن و مستقیم به قدم بعدی برو.',vision:'از کاری شروع کن که بینایی مانع آن شده: خانه، فناوری، کار یا تحصیل.',work:'به مسیر کار و بیماری برو تا سؤال‌های بعدی بین گزینه‌های مرتبط تفکیک کنند.',unemployment:'اکنون بیکار هستی. از اقدام روز اول در بالا شروع کن و اگر مسیرهای بیشتری لازم داری در همان مسیر مشترک شخص ادامه بده.',economy:'با اقتصاد و مسکن ادامه بده؛ سؤال بعدی فقط وقتی مطرح شود که مسیر را تغییر دهد.',study:'با تحصیل، مسکن یا گذار به کار ادامه بده.',company:'به مسیر شرکت برای مناقصه، تأمین مالی و آمادگی برو.',association:'با انجمن، پروژه، محل و تأمین مالی ادامه بده.',general:'گسترده شروع کن و با کمترین سؤال لازم عدم‌قطعیت را کاهش بده.'},
      unemployment:{
        eyebrow:'روز اول بیکاری',
        title:'تازه بیکار شده‌ای؟ با ثبت‌نام شروع کن، نه یک مصاحبه طولانی.',
        body:'Arbetsförmedlingen می‌گوید در اولین روز بیکاری به‌عنوان جویای کار ثبت‌نام کن. بعد از آن برای غرامت به صندوق بیکاری خود درخواست بده. ثبت‌نام می‌تواند برای حفظ SGI نیز مهم باشد. Stödassistenten درباره حق دریافت یا مبلغ غرامت تصمیم نمی‌گیرد.',
        already:'اگر قبلاً ثبت‌نام کرده‌ای، مرحله اول را رد کن و به صندوق بیکاری برو.',
        af:'Arbetsförmedlingen: ثبت‌نام و قدم بعدی',
        fk:'Försäkringskassan: بررسی SGI هنگام بیکاری'
      }
    }
  };

  const style=document.createElement('style');
  style.dataset.professionalGuidance='true';
  style.textContent=`
    .journey-rail{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:0 0 16px;padding:0;list-style:none}
    .journey-rail li{display:flex;align-items:center;gap:8px;min-width:0;padding:9px 10px;border:1px solid #e2ebe6;border-radius:12px;background:#f9fbfa;color:#60716b;font-size:11px;font-weight:800;line-height:1.25}
    .journey-rail b{width:22px;height:22px;flex:0 0 22px;border-radius:50%;display:grid;place-items:center;background:#e5f3ed;color:#0b5b4d;font-size:11px}
    .engine-summary{margin:0 0 12px;padding:12px 13px;border-radius:13px;background:#f2f7f4;color:#30473f;font-size:13px;line-height:1.45}
    .first-day-panel{margin:0 0 12px;padding:15px;border:1px solid #b8d2c8;border-radius:15px;background:#fbfdfc;color:#203b33}
    .first-day-panel .first-day-eyebrow{display:block;margin-bottom:5px;color:#0b5b4d;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
    .first-day-panel strong{display:block;margin-bottom:6px;font-size:15px;line-height:1.3}
    .first-day-panel p{margin:0 0 8px;font-size:12px;line-height:1.5;color:#465d55}
    .first-day-panel .first-day-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .first-day-panel a{font-size:11px;font-weight:850;color:#0b5b4d;text-underline-offset:2px}
    .route.route-card{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;padding:16px 12px;border:1px solid #e3ebe7;border-radius:15px;margin:8px 0;background:#fff;transition:.16s ease}
    .route.route-card:hover{border-color:#a9c4ba;box-shadow:0 8px 22px rgba(12,50,42,.07);transform:translateY(-1px)}
    .route.route-card.primary-route{border-color:#8eb7a8;background:#fbfdfc;box-shadow:0 8px 24px rgba(12,50,42,.06)}
    .route-badge{display:inline-flex;width:max-content;margin:0 0 7px;padding:4px 8px;border-radius:999px;background:#e5f3ed;color:#0b5b4d;font-size:10px;font-weight:900;letter-spacing:.02em}
    .route-detail{display:block;margin-top:6px;color:#60716b;font-size:12px;line-height:1.4;max-width:560px}
    .engine-footer{margin:12px 2px 0;color:#66756f;font-size:11px;line-height:1.45}
    .rtl .route.route-card{text-align:right}
    .rtl .first-day-panel{text-align:right}
    @media(max-width:620px){.journey-rail{grid-template-columns:1fr}.journey-rail li{padding:8px 10px}.route.route-card{padding:14px 10px}.first-day-panel .first-day-links{display:grid}}
  `;
  document.head.appendChild(style);

  function lang(){const l=document.documentElement.lang||'sv';return COPY[l]?l:'sv'}
  function c(){return COPY[lang()]}
  function setText(el,text){if(el.textContent!==text)el.textContent=text}
  function currentSituation(){return situation&&typeof situation.value==='string'?situation.value.trim():''}
  function explicitCurrentUnemployment(text){
    const value=(text||'').toLowerCase();
    if(!value) return false;
    const sickness=/(sjuk|sjukskriv|sjukanmäl|مريض|مرض|بیمار|بیماری)/i.test(value);
    const stillEmployed=/(permitter|korttidsarbete|korttidspermitter|ساعات\s*عمل\s*مخفض|تعليق\s*العمل|تعلیق\s*کار)/i.test(value);
    if(sickness||stillEmployed) return false;
    const current=[
      /\b(?:är|blev|har blivit)\s+arbetslös\b/i,
      /\bblev\s+av\s+med\s+jobbet\b/i,
      /\bförlorade\s+(?:mitt\s+)?jobb(?:et)?\b/i,
      /\bsista\s+arbetsdag(?:en)?\s+var\s+(?:igår|i går)\b/i,
      /عاطل(?:ة)?\s+عن\s+العمل/i,
      /فقدت\s+(?:عملي|وظيفتي)/i,
      /أصبحت\s+عاطل/i,
      /بیکار\s+(?:هستم|شدم)/i,
      /کارم\s+را\s+از\s+دست\s+دادم/i,
      /شغلم\s+را\s+از\s+دست\s+دادم/i,
    ];
    const future=/(riskerar\s+att\s+bli\s+arbetslös|kommer\s+att\s+bli\s+arbetslös|blir\s+arbetslös\s+om\s+\d+|varslad|varsel|سأصبح\s+عاطل|سوف\s+أصبح\s+عاطل|بیکار\s+خواهم\s+شد)/i.test(value);
    const isCurrent=current.some(pattern=>pattern.test(value));
    return isCurrent&&!future;
  }
  function routeKey(anchor){
    const u=new URL(anchor.href,location.href);
    const mode=(u.searchParams.get('mode')||'').toLowerCase();
    if(mode==='dental'||mode==='vision') return mode;
    if((u.searchParams.get('focus')||'').toLowerCase()==='unemployment_start') return 'unemployment';
    if(u.pathname.endsWith('company-pilot.html')) return 'company';
    const actor=(u.searchParams.get('actor_type')||'').toLowerCase();
    return {employee:'work',student:'study',association:'association',private_person:'economy',relative:'general',other:'general'}[actor]||'general';
  }
  function rail(){
    let el=assistant.querySelector('[data-journey-rail]');
    if(!el){
      el=document.createElement('ol');
      el.className='journey-rail';
      el.dataset.journeyRail='true';
      composer.before(el);
    }
    const html=c().steps.map((x,i)=>`<li><b>${i+1}</b><span>${x}</span></li>`).join('');
    if(el.innerHTML!==html)el.innerHTML=html;
  }
  function prepareUnemploymentRoute(routes){
    const active=explicitCurrentUnemployment(currentSituation());
    let panel=box.querySelector('[data-unemployment-first-day]');
    if(!active){if(panel)panel.remove();return false}
    const workRoute=routes.find(a=>routeKey(a)==='work'||(new URL(a.href,location.href).searchParams.get('focus')||'')==='unemployment_start');
    if(workRoute){
      const u=new URL(workRoute.href,location.href);
      u.pathname=u.pathname.replace(/[^/]*$/,'person-pilot.html');
      u.search='';
      u.searchParams.set('actor_type','private_person');
      u.searchParams.set('focus','unemployment_start');
      if(lang()!=='sv')u.searchParams.set('lang',lang());
      const next=u.pathname.split('/').pop()+u.search;
      if(workRoute.getAttribute('href')!==next)workRoute.setAttribute('href',next);
      workRoute.dataset.unemploymentStart='true';
    }
    if(!panel){
      panel=document.createElement('section');
      panel.className='first-day-panel';
      panel.dataset.unemploymentFirstDay='true';
      panel.setAttribute('role','note');
      const summary=box.querySelector('[data-engine-summary]');
      if(summary)summary.after(panel);else box.prepend(panel);
    }
    const copy=c().unemployment;
    const html=`<span class="first-day-eyebrow"></span><strong></strong><p data-first-day-body></p><p data-first-day-already></p><div class="first-day-links"><a data-first-day-af href="${AF_UNEMPLOYED_URL}" target="_blank" rel="noopener noreferrer"></a><a data-first-day-fk href="${FK_SGI_URL}" target="_blank" rel="noopener noreferrer"></a></div>`;
    if(!panel.querySelector('[data-first-day-body]'))panel.innerHTML=html;
    setText(panel.querySelector('.first-day-eyebrow'),copy.eyebrow);
    setText(panel.querySelector('strong'),copy.title);
    setText(panel.querySelector('[data-first-day-body]'),copy.body);
    setText(panel.querySelector('[data-first-day-already]'),copy.already);
    setText(panel.querySelector('[data-first-day-af]'),copy.af);
    setText(panel.querySelector('[data-first-day-fk]'),copy.fk);
    return true;
  }
  let applying=false;
  function enhance(){
    if(applying) return;
    applying=true;
    try{
      rail();
      const routes=[...box.querySelectorAll('a.route')];
      if(!routes.length) return;
      let summary=box.querySelector('[data-engine-summary]');
      if(!summary){
        summary=document.createElement('div');
        summary.className='engine-summary';
        summary.dataset.engineSummary='true';
        const interpret=box.querySelector('.interpret');
        if(interpret) interpret.after(summary); else box.prepend(summary);
      }
      setText(summary,c().found(routes.length));
      prepareUnemploymentRoute(routes);
      routes.forEach((a,i)=>{
        a.classList.add('route-card');
        a.classList.toggle('primary-route',i===0);
        const text=a.querySelector('span:first-child');
        if(!text) return;
        let badge=text.querySelector('[data-route-badge]');
        if(!badge){badge=document.createElement('span');badge.className='route-badge';badge.dataset.routeBadge='true';text.prepend(badge)}
        setText(badge,i===0?c().first:c().also);
        let detail=text.querySelector('[data-route-detail]');
        if(!detail){detail=document.createElement('span');detail.className='route-detail';detail.dataset.routeDetail='true';text.appendChild(detail)}
        const key=routeKey(a);
        setText(detail,c().next[key]||c().next.general);
      });
      let footer=box.querySelector('[data-engine-footer]');
      if(!footer){footer=document.createElement('div');footer.className='engine-footer';footer.dataset.engineFooter='true';box.appendChild(footer)}
      setText(footer,c().footer);
    } finally { applying=false; }
  }
  new MutationObserver(()=>queueMicrotask(enhance)).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  new MutationObserver(()=>queueMicrotask(enhance)).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  if(situation)situation.addEventListener('input',()=>queueMicrotask(enhance));
  rail();
})();
