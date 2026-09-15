(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODStudentFinanceSickness = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // v67 extends the SAME student_csn capability. It adds one route-changing
  // sickness topic; it does not create a second matcher, truth store or app.
  // Raw situation text stays local and never enters the handoff or feedback.
  const CSN_SICK_URL = 'https://www.csn.se/om-nagot-hander-eller-andras/sjuk';
  const FK_STUDENT_SICK_URL = 'https://www.forsakringskassan.se/privatperson/studerande/om-du-blir-sjuk-nar-du-studerar';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const STUDY = /studer|student|pluggar|universitet|högskol|komvux|gymnasi|csn|studiemedel|omställningsstudiestöd|دراس|طالب|جامعة|الثانوي|CSN|تحصیل|دانشجو|دانشگاه|دبیرستان/i;
  const SELF_SICK = /(?:أنا|عندي|لدي).{0,45}(?:مريض|مرض|لا أستطيع الدراسة)|(?:مريض|مرض).{0,45}(?:أنا|عندي|لدي)|(?:من|خودم).{0,45}(?:بیمار|مریض|نمی.?توانم درس)|(?:بیمار|مریض).{0,45}(?:من|خودم)/i;
  // Do not use JS \b immediately before Swedish "är": JS word boundaries are ASCII-oriented.
  const SELF_SICK_SV = /\bjag\b(?:(?!\b(?:mitt barn|min dotter|min son|barnet)\b)[^.!?]){0,120}(?:har\s+blivit|har\s+varit|är|blev|blivit|varit)\s+(?:sjuk|sjukskriven)\b|\b(?:sjuk|sjukskriven)\b.{0,40}\b(?:mig|själv)\b/i;
  const SICK_GENERIC = /sjuk|sjukskriv|sjukanmäl|kan inte studera|مرض|مريض|بیمار|مریض/i;
  const CHILD_SICK = /(?:barn|mitt barn|min dotter|min son|vab|vabba|طفل|ابني|ابنتي|کودک|فرزند|دخترم|پسرم).{0,35}(?:sjuk|مرض|مريض|بیمار|مریض)|(?:vab|vabba)/i;
  const PROFESSIONAL = /(?:jobbar|arbetar|anställd).{0,35}(?:csn|försäkringskassan|studenthälsa|studievägled)|(?:csn|försäkringskassan).{0,35}(?:handläggare|kundtjänst|mitt jobb)|أعمل.{0,35}(?:CSN|التأمين)|کار.{0,35}(?:CSN|بیمه)/i;
  const SICK_DURING_STUDY = /sjuk(?:dom|skriv|anmäld)?\s+(?:under|när).{0,30}(?:stud|plugg)|مرض.{0,30}دراس|بیمار.{0,30}(?:تحصیل|درس)/i;

  function safeLang(value) {
    return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv';
  }

  function normalize(value) {
    return String(value || '').normalize('NFKC').trim();
  }

  function detectSickness(text) {
    const value = normalize(text);
    if (!value || PROFESSIONAL.test(value) || !STUDY.test(value) || !SICK_GENERIC.test(value)) return false;
    const personalSickness = SELF_SICK_SV.test(value) || SELF_SICK.test(value) || SICK_DURING_STUDY.test(value);
    if (CHILD_SICK.test(value) && !personalSickness) return false;
    return personalSickness;
  }

  function inferStudyContext(text) {
    const value = normalize(text);
    if (/gymnasi|studiehjälp|الثانوي|دبیرستان/i.test(value)) return 'gymnasium_sweden';
    if (/utlandsstud|studerar\s+utomlands|studera\s+utomlands|دراسة\s+في\s+الخارج|تحصیل\s+در\s+خارج/i.test(value)) return 'abroad';
    if (/omställningsstudiestöd/i.test(value)) return 'transition_sweden';
    if (/(?:csn|studiemedel).*(?:studer|student|pluggar|universitet|högskol|komvux)|(?:studer|student|pluggar|universitet|högskol|komvux).*(?:csn|studiemedel)/i.test(value)) return 'studiemedel_sweden';
    return null;
  }

  function inferWorkContext(text) {
    const value = normalize(text);
    return /(?:jobbar|arbetar|anställd|har\s+ett\s+jobb).*(?:studer|student|pluggar)|(?:studer|student|pluggar).*(?:jobbar|arbetar|anställd)|أعمل.*أدرس|أدرس.*أعمل|کار.*(?:تحصیل|درس)|(?:تحصیل|درس).*کار/i.test(value) ? 'employed' : null;
  }

  function handoffHref(language, context, workContext) {
    const lang = safeLang(language);
    const params = new URLSearchParams({ actor_type: 'student', focus: 'student_csn', topic: 'sickness', lang });
    if (['studiemedel_sweden', 'transition_sweden', 'gymnasium_sweden', 'abroad'].includes(context)) params.set('study_context', context);
    if (workContext === 'employed') params.set('work_context', 'employed');
    return `person-pilot.html?${params.toString()}`;
  }

  const COPY = {
    sv: {
      shellTitle: 'Sjuk under studier – gör rätt första anmälan',
      shellSub: 'Studieform ändrar vem du ska kontakta först',
      eyebrow: 'Studier → sjukdom', title: 'Blev du sjuk under studierna?',
      intro: 'Stödassistenten avgör inte om du får ersättning. Den skiljer bara de studieformer som ändrar första handlingen och länkar vidare till aktuella primärkällor.',
      qContext: 'Vilket beskriver studierna bäst?',
      studiemedel: 'Studier i Sverige med studiemedel från CSN', transition: 'Studier i Sverige med omställningsstudiestöd', gymnasium: 'Gymnasium i Sverige / studiehjälp', abroad: 'Studier utomlands', unsure: 'Jag är osäker',
      swedenTitle: 'Sjukanmäl dig till Försäkringskassan så tidigt som möjligt',
      swedenBody: 'För studiemedel eller omställningsstudiestöd i Sverige anger CSN att du ska sjukanmäla dig till Försäkringskassan, ansöka om att behålla studiestödet under sjukdom och meddela CSN att sjukanmälan är gjord. Försäkringskassan anger första sjukdagen för heltidsstudier när du är helt sjuk. Kontrollera alltid den aktuella sidan för din situation.',
      gymTitle: 'Gymnasium: sjukanmäl till skolan', gymBody: 'CSN anger att gymnasiestudier i Sverige har en annan väg: sjukanmäl sjukfrånvaron till skolan. Stödassistenten använder därför inte Försäkringskassans studiemedelsväg som standardsvar här.',
      abroadTitle: 'Utlandsstudier: kontakta CSN direkt och kontrollera tidsfristen', abroadBody: 'CSN har en separat process för sjukdom under utlandsstudier. Anmäl till CSN så snabbt som möjligt och kontrollera den tidsfrist och de intygskrav som gäller för just din studieperiod; Stödassistenten gissar inte en generell deadline.',
      unknownTitle: 'Kontrollera studieformen innan du väljer anmälningsväg', unknownBody: 'Gymnasium, studiemedel i Sverige och utlandsstudier har olika första steg. Välj studieformen ovan eller kontrollera den aktuella CSN-sidan innan du agerar.',
      workNote: 'Du har också angett arbete vid sidan av studierna. Försäkringskassan beskriver en särskild väg när man både arbetar och studerar; arbetsgivaren kan också behöva sjukanmälan. Stödassistenten bedömer inte SGI eller rätt till sjukpenning.',
      csn: 'CSN: viktigt att sjukanmäla', fk: 'Försäkringskassan: sjuk när du studerar', privacy: 'Vi skickar inte diagnos, läkarintyg, exakta sjukdatum, kurs, studieresultat, inkomst, arbetsgivare, identitet eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida', fbTitle: 'Hjälp oss förbättra den här vägen', fbNew: 'Fick du reda på något nytt?', fbUseful: 'Var hjälpen användbar?', fbClear: 'Var nästa steg tydligt?', yes: 'Ja', no: 'Nej', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'مرضت أثناء الدراسة – ابدأ بالإبلاغ الصحيح', shellSub: 'نوع الدراسة يغيّر الجهة التي تتواصل معها أولاً', eyebrow: 'الدراسة ← المرض', title: 'هل مرضت أثناء الدراسة؟', intro: 'لا يقرر Stödassistenten الاستحقاق. يميّز فقط نوع الدراسة الذي يغيّر الخطوة الأولى ويربط بالمصادر الرسمية الحالية.', qContext: 'ما نوع الدراسة الأقرب لوضعك؟', studiemedel: 'دراسة في السويد مع studiemedel من CSN', transition: 'دراسة في السويد مع omställningsstudiestöd', gymnasium: 'ثانوية في السويد / studiehjälp', abroad: 'دراسة خارج السويد', unsure: 'لست متأكداً', swedenTitle: 'أبلغ Försäkringskassan بالمرض بأسرع وقت', swedenBody: 'لدعم studiemedel أو omställningsstudiestöd في السويد، توضح CSN أن الإبلاغ يكون لدى Försäkringskassan ثم طلب الاحتفاظ بدعم الدراسة أثناء المرض وإبلاغ CSN بأن البلاغ تم. تحقق من المصدر الحالي لوضعك.', gymTitle: 'الثانوية: أبلغ المدرسة بالمرض', gymBody: 'توضح CSN أن الدراسة الثانوية في السويد تسلك مساراً مختلفاً: أبلغ المدرسة بالغياب المرضي.', abroadTitle: 'الدراسة في الخارج: تواصل مباشرة مع CSN وتحقق من الموعد', abroadBody: 'لدى CSN إجراء منفصل للمرض أثناء الدراسة في الخارج. أبلغ بسرعة وتحقق من الموعد والمستندات التي تخص فترة دراستك؛ لا يخمّن Stödassistenten موعداً عاماً.', unknownTitle: 'حدد نوع الدراسة قبل اختيار مسار الإبلاغ', unknownBody: 'الثانوية والدراسة بتمويل CSN داخل السويد والدراسة في الخارج لها خطوات أولى مختلفة.', workNote: 'ذكرت أيضاً أنك تعمل أثناء الدراسة. لدى Försäkringskassan مسار خاص لمن يعمل ويدرس، وقد يلزم أيضاً إبلاغ صاحب العمل. لا يقرر Stödassistenten SGI أو حق sjukpenning.', csn: 'CSN: الإبلاغ عن المرض', fk: 'Försäkringskassan: المرض أثناء الدراسة', privacy: 'لا نرسل التشخيص أو الشهادة الطبية أو تواريخ المرض الدقيقة أو الدورة أو النتائج أو الدخل أو صاحب العمل أو الهوية أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية', fbTitle: 'ساعدنا على تحسين هذا المسار', fbNew: 'هل عرفت شيئاً جديداً؟', fbUseful: 'هل كانت المساعدة مفيدة؟', fbClear: 'هل كانت الخطوة التالية واضحة؟', yes: 'نعم', no: 'لا', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أُرسلت ملاحظات منظمة فقط.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'در زمان تحصیل بیمار شدی – گزارش درست را اول انجام بده', shellSub: 'نوع تحصیل مسیر اولین تماس را عوض می‌کند', eyebrow: 'تحصیل ← بیماری', title: 'در زمان تحصیل بیمار شدی؟', intro: 'Stödassistenten درباره حق دریافت کمک تصمیم نمی‌گیرد. فقط نوع تحصیل مؤثر بر قدم اول را جدا می‌کند و به منابع رسمی جاری پیوند می‌دهد.', qContext: 'کدام نوع تحصیل به وضعیت تو نزدیک‌تر است؟', studiemedel: 'تحصیل در سوئد با studiemedel از CSN', transition: 'تحصیل در سوئد با omställningsstudiestöd', gymnasium: 'دبیرستان در سوئد / studiehjälp', abroad: 'تحصیل خارج از سوئد', unsure: 'مطمئن نیستم', swedenTitle: 'بیماری را هرچه زودتر به Försäkringskassan گزارش کن', swedenBody: 'برای studiemedel یا omställningsstudiestöd در سوئد، CSN می‌گوید بیماری را به Försäkringskassan گزارش کن، برای حفظ حمایت تحصیلی در دوره بیماری درخواست بده و به CSN اطلاع بده که گزارش انجام شده است. منبع جاری را برای وضعیت خودت بررسی کن.', gymTitle: 'دبیرستان: بیماری را به مدرسه گزارش کن', gymBody: 'CSN برای دبیرستان در سوئد مسیر دیگری دارد: غیبت بیماری را به مدرسه گزارش کن.', abroadTitle: 'تحصیل خارج: مستقیم با CSN تماس بگیر و مهلت را بررسی کن', abroadBody: 'CSN برای بیماری هنگام تحصیل خارج از سوئد فرایند جداگانه دارد. سریع گزارش کن و مهلت و مدارک مربوط به دوره خودت را بررسی کن؛ Stödassistenten یک مهلت عمومی را حدس نمی‌زند.', unknownTitle: 'پیش از انتخاب مسیر گزارش، نوع تحصیل را روشن کن', unknownBody: 'دبیرستان، studiemedel در سوئد و تحصیل خارج از سوئد قدم‌های اول متفاوتی دارند.', workNote: 'همچنین گفته‌ای در کنار تحصیل کار می‌کنی. Försäkringskassan برای کار و تحصیل همزمان مسیر جداگانه‌ای توضیح می‌دهد و ممکن است لازم باشد کارفرما هم در جریان بیماری باشد. Stödassistenten درباره SGI یا حق sjukpenning تصمیم نمی‌گیرد.', csn: 'CSN: گزارش بیماری', fk: 'Försäkringskassan: بیماری هنگام تحصیل', privacy: 'تشخیص، گواهی پزشکی، تاریخ دقیق بیماری، درس، نتایج، درآمد، کارفرما، هویت یا داستان تو را در URL یا بازخورد نمی‌فرستیم.', home: 'بازگشت به صفحه اصلی', fbTitle: 'به بهتر شدن این مسیر کمک کن', fbNew: 'چیز جدیدی یاد گرفتی؟', fbUseful: 'کمک مفید بود؟', fbClear: 'قدم بعدی روشن بود؟', yes: 'بله', no: 'خیر', send: 'ارسال بازخورد ناشناس', sent: 'ممنون! فقط بازخورد ساختاری ارسال شد.', error: 'فعلاً ارسال بازخورد ممکن نیست.'
    }
  };

  function pageLang(win) {
    const params = new URLSearchParams(win.location.search);
    return safeLang(params.get('lang') || win.document.documentElement.lang);
  }

  function rootHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden || !detectSickness(input.value)) return false;
    if (box.querySelector('[data-student-sickness-route="true"]')) return true;
    const lang = pageLang(win);
    const context = inferStudyContext(input.value);
    const workContext = inferWorkContext(input.value);
    const c = COPY[lang];
    const route = doc.createElement('a'); route.className = 'route'; route.dataset.studentSicknessRoute = 'true'; route.href = handoffHref(lang, context, workContext);
    const left = doc.createElement('span'); const strong = doc.createElement('strong'); const small = doc.createElement('small');
    strong.textContent = c.shellTitle; small.textContent = c.shellSub; left.append(strong, small);
    const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
    route.append(left, arrow); box.insertBefore(route, box.querySelector('a.route') || null); return true;
  }

  function focusedApp(win) {
    const doc = win.document; const main = doc.getElementById('main'); if (!main) return false;
    const params = new URLSearchParams(win.location.search);
    if (String(params.get('focus') || '').toLowerCase() !== 'student_csn' || String(params.get('topic') || '').toLowerCase() !== 'sickness') return false;
    let lang = safeLang(params.get('lang') || doc.documentElement.lang);
    let context = ['studiemedel_sweden','transition_sweden','gymnasium_sweden','abroad'].includes(params.get('study_context')) ? params.get('study_context') : null;
    const workContext = params.get('work_context') === 'employed' ? 'employed' : null;
    const feedback = {};

    function c() { return COPY[lang]; }
    function setDir() { doc.documentElement.lang = lang; doc.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl'; doc.body.classList.toggle('rtl', lang !== 'sv'); }
    function source(parent, href, label) { const a = doc.createElement('a'); a.className='source'; a.target='_blank'; a.rel='noopener noreferrer'; a.href=href; a.textContent=`↗ ${label}`; parent.appendChild(a); }
    function render() {
      setDir(); main.replaceChildren(); const x=c(); const section=doc.createElement('section'); section.className='card hero';
      const eyebrow=doc.createElement('div'); eyebrow.className='eyebrow'; eyebrow.textContent=x.eyebrow; const h=doc.createElement('h1'); h.textContent=x.title; const intro=doc.createElement('p'); intro.className='muted'; intro.textContent=x.intro; section.append(eyebrow,h,intro);
      const langs=doc.createElement('div'); langs.className='langs'; [['sv','Svenska'],['ar','العربية'],['fa','فارسی']].forEach(([v,label])=>{const b=doc.createElement('button');b.type='button';b.className=`lang ${lang===v?'active':''}`;b.textContent=label;b.onclick=()=>{lang=v;const u=new URL(win.location.href);u.searchParams.set('lang',v);win.history.replaceState(null,'',u);render();};langs.appendChild(b);}); section.appendChild(langs);
      const privacy=doc.createElement('div'); privacy.className='privacy'; privacy.textContent=`🔒 ${x.privacy}`; section.appendChild(privacy);
      const q=doc.createElement('h3'); q.textContent=x.qContext; q.style.marginTop='16px'; section.appendChild(q);
      const options=[['studiemedel_sweden',x.studiemedel],['transition_sweden',x.transition],['gymnasium_sweden',x.gymnasium],['abroad',x.abroad],['unsure',x.unsure]];
      options.forEach(([v,label])=>{const b=doc.createElement('button');b.type='button';b.className='choice';b.textContent=label;b.setAttribute('aria-pressed',String(context===v));b.onclick=()=>{context=v;render();};section.appendChild(b);});
      if (context) {
        const result=doc.createElement('div'); result.className='notice'; result.setAttribute('role','status'); const strong=doc.createElement('strong'); const p=doc.createElement('p');
        if (context==='studiemedel_sweden'||context==='transition_sweden'){strong.textContent=x.swedenTitle;p.textContent=x.swedenBody;}
        else if(context==='gymnasium_sweden'){strong.textContent=x.gymTitle;p.textContent=x.gymBody;}
        else if(context==='abroad'){strong.textContent=x.abroadTitle;p.textContent=x.abroadBody;}
        else {strong.textContent=x.unknownTitle;p.textContent=x.unknownBody;}
        result.append(strong,p); const links=doc.createElement('div'); links.className='info'; source(links,CSN_SICK_URL,x.csn); if(context==='studiemedel_sweden'||context==='transition_sweden') {links.appendChild(doc.createTextNode(' · '));source(links,FK_STUDENT_SICK_URL,x.fk);} result.appendChild(links); section.appendChild(result);
        if(workContext==='employed'){const note=doc.createElement('div');note.className='info';note.textContent=x.workNote;section.appendChild(note);}
        const fb=doc.createElement('div');fb.className='finalq';const fbt=doc.createElement('b');fbt.textContent=x.fbTitle;fb.appendChild(fbt);
        [['learned_new',x.fbNew],['useful',x.fbUseful],['next_step_clear',x.fbClear]].forEach(([key,label])=>{const row=doc.createElement('div');row.style.marginTop='9px';const s=doc.createElement('small');s.textContent=label;row.appendChild(s);const bs=doc.createElement('div');bs.className='fbs';[[true,x.yes],[false,x.no]].forEach(([value,name])=>{const b=doc.createElement('button');b.type='button';b.className=`fb ${feedback[key]===value?'selected':''}`;b.textContent=name;b.onclick=()=>{feedback[key]=value;render();};bs.appendChild(b);});row.appendChild(bs);fb.appendChild(row);});
        const send=doc.createElement('button');send.type='button';send.className='btn primary share';send.textContent=x.send;const status=doc.createElement('div');send.onclick=async()=>{if(!['learned_new','useful','next_step_clear'].every(k=>typeof feedback[k]==='boolean')){status.textContent=x.error;status.className='status err';return;}send.disabled=true;try{const res=await win.fetch(FEEDBACK_URL,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_version:'0.5.0',language:lang,flow:'student_csn',learned_new:feedback.learned_new,useful:feedback.useful,next_step_clear:feedback.next_step_clear,ratings:{route:'student_csn',topic:'sickness',study_context:context,work_context:workContext||'unknown'}})});if(!res.ok)throw new Error('feedback');status.textContent=x.sent;status.className='status ok';}catch(_){status.textContent=x.error;status.className='status err';send.disabled=false;}};fb.append(send,status);section.appendChild(fb);
      }
      const home=doc.createElement('a');home.className='source';home.href=`index.html?lang=${encodeURIComponent(lang)}`;home.textContent=`← ${x.home}`;section.appendChild(home);main.appendChild(section);
    }
    render(); return true;
  }

  function init(win) {
    const path=(win.location.pathname||'').split('/').pop();
    if(!path||path==='index.html'){
      const button=win.document.getElementById('analyzeBtn'); const input=win.document.getElementById('situation');
      if(button&&input){button.addEventListener('click',()=>win.setTimeout(()=>rootHandoff(win),0));input.addEventListener('keydown',(event)=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter')win.setTimeout(()=>rootHandoff(win),0);});}
    }
    if(path==='person-pilot.html') focusedApp(win);
  }

  return { init, detectSickness, inferStudyContext, inferWorkContext, handoffHref, safeLang };
});
