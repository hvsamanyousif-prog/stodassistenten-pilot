(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODUnemployedSickGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product public guidance only. This module disambiguates the sickness
  // route for ordinary jobseekers versus Arbetsförmedlingen programme participants.
  // It also handles the >30-day full-time programme transition without treating
  // duration alone as proof that the programme has ended. It never decides
  // sickness-benefit eligibility, SGI, amount, diagnosis or medical work capacity.
  const FK_JOBSEEKER_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukskriven-nar-du-ar-arbetssokande';
  const AF_PROGRAM_URL = 'https://arbetsformedlingen.se/for-arbetssokande/extra-stod/nar-du-deltar-i-ett-program/anmal-franvaro-nar-du-blir-sjuk-och-deltar-i-ett-program';
  const FK_PROGRAM_SICK_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/om-du-deltar-i-program-hos-arbetsformedlingen-och-blir-sjuk';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const DIRECT_PATTERNS = [
    /(?:arbetslös|arbetssökande|inskriven\s+(?:på|hos)\s+arbetsförmedlingen).*(?:sjuk|sjukanmäl|sjukskriv)/i,
    /(?:sjuk|sjukanmäl|sjukskriv).*(?:arbetslös|arbetssökande|arbetsförmedlingen)/i,
    /(?:باحث\s+عن\s+عمل|عاطل\s+عن\s+العمل|مسجل\s+في\s+مكتب\s+العمل).*(?:مريض|مرض|إجازة\s+مرضية)/i,
    /(?:مريض|مرض|إجازة\s+مرضية).*(?:باحث\s+عن\s+عمل|عاطل\s+عن\s+العمل|مكتب\s+العمل)/i,
    /(?:بیکار|جویای\s+کار|ثبت.?نام\s+در\s+اداره\s+کار).*(?:بیمار|بیماری|مرخصی\s+استعلاجی)/i,
    /(?:بیمار|بیماری|مرخصی\s+استعلاجی).*(?:بیکار|جویای\s+کار|اداره\s+کار)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Arbetssökande och sjuk – hitta rätt väg',
      shellSub: 'Programstatus kan ändra vem som ska få din första sjukanmälan.',
      eyebrow: 'Arbetssökande → sjukfrånvaro',
      title: 'Vem ska du sjukanmäla dig till?',
      intro: 'Stödassistenten skiljer på vanlig arbetssökande och deltagare i Arbetsförmedlingens program. Vi avgör inte om du har rätt till sjukpenning eller annan ersättning.',
      qProgram: 'Deltar du just nu i ett program hos Arbetsförmedlingen med aktivitetsstöd, utvecklingsersättning eller etableringsersättning?',
      qFully: 'Är du helt arbetssökande utan en pågående anställning?',
      qActive: 'Var du inskriven hos Arbetsförmedlingen och aktivt arbetssökande fram till att du blev sjuk?',
      qLongProgram: 'Har du varit sjuk på heltid i mer än 30 dagar under programmet?',
      qProgramEnded: 'Har Arbetsförmedlingen redan skrivit ut dig ur programmet på grund av den längre sjukfrånvaron?',
      yes: 'Ja', no: 'Nej', unsure: 'Vet inte / behöver kontrollera',
      programTitle: 'Programdeltagare: anmäl sjukfrånvaro till Arbetsförmedlingen',
      programBody: 'I program med aktivitetsstöd, utvecklingsersättning eller etableringsersättning ska sjukfrånvaro anmälas till Arbetsförmedlingen första sjukdagen. Vid sjukdom längre än sju dagar behöver du lämna Arbetsförmedlingens läkarintyg. Rätten till ersättning prövas separat.',
      longCta: 'Jag är sjuk på heltid i mer än 30 dagar',
      longVerifyTitle: '30 dagar räcker inte ensamt för att byta väg',
      longVerifyBody: '30-dagarsregeln gäller längre sjukdom på heltid. Arbetsförmedlingen försöker först anpassa programmet. Om du är osäker på omfattningen eller din programstatus ska du kontrollera den innan du går över till en annan ersättningsväg.',
      stillProgramTitle: 'Fortfarande i programmet: byt inte ersättningsväg på egen hand',
      stillProgramBody: 'Arbetsförmedlingen anger att de försöker anpassa programmet så att du kan delta. Om du är sjuk på heltid längre än 30 dagar och inte kan delta alls trots anpassning kan du skrivas ut. Så länge du inte har skrivits ut ska du inte utgå från att sjukpenning efter programmet redan är rätt väg.',
      endedTitle: 'Utskriven ur programmet: kontrollera sjukpenning från dagen efter',
      endedBody: 'Om Arbetsförmedlingen faktiskt har skrivit ut dig efter den längre heltidsfrånvaron kan du ansöka om sjukpenning hos Försäkringskassan från första dagen efter utskrivningen. Försäkringskassan prövar rätten separat och använder då sitt läkarintyg för sjukpenning.',
      endedVerifyTitle: 'Kontrollera om programmet faktiskt har avslutats',
      endedVerifyBody: 'Var inte säker på att mer än 30 dagars sjukdom automatiskt betyder att programmet är avslutat. Kontrollera beslutet eller statusen hos Arbetsförmedlingen innan du går vidare till sjukpenningvägen efter programmet.',
      jobseekerTitle: 'Helt arbetssökande: börja hos Försäkringskassan',
      jobseekerBody: 'Försäkringskassan anger att den som är helt arbetssökande ska sjukanmäla sig dit första sjukdagen och därefter ansöka om sjukpenning. Läkarintyg behövs senast dag 8. Rätten prövas separat.',
      mixedTitle: 'Du verkar ha en blandad situation – kontrollera båda spåren',
      mixedBody: 'Om du är arbetssökande på deltid och samtidigt har en anställning anger Försäkringskassan att du också ska sjukanmäla dig till arbetsgivaren. Vi gissar inte hur ersättningarna samordnas.',
      verifyTitle: 'Kontrollera programstatus innan du väljer väg',
      verifyBody: 'Programstatus ändrar vem som ska få första anmälan. Stödassistenten väljer därför inte myndighet åt dig när den uppgiften är oklar.',
      activeVerifyTitle: 'Kontrollera inskrivning och aktivt arbetssökande',
      activeVerifyBody: 'Försäkringskassan anger särskilda villkor för sjukpenning i början av sjukperioden, bland annat kopplat till att vara inskriven och aktivt arbetssökande fram till sjukdomen. Vi avgör inte villkoret här.',
      sourceFk: 'Försäkringskassan: sjukskriven när du är arbetssökande',
      sourceAf: 'Arbetsförmedlingen: sjuk i program',
      sourceFkProgram: 'Försäkringskassan: sjuk när du deltar i program',
      privacy: 'Vi skickar inte diagnos, läkarintyg, SGI, lön, arbetsgivare, personuppgifter, exakt sjukperiod eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida',
      feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'باحث عن عمل ومريض – اعثر على المسار الصحيح', shellSub: 'حالة البرنامج قد تغيّر الجهة التي تستقبل بلاغ المرض الأول.',
      eyebrow: 'باحث عن عمل ← مرض', title: 'إلى من يجب أن تبلغ عن المرض؟',
      intro: 'يميز Stödassistenten بين الباحث العادي عن عمل والمشارك في برنامج لدى Arbetsförmedlingen. نحن لا نقرر استحقاق sjukpenning أو أي تعويض آخر.',
      qProgram: 'هل تشارك الآن في برنامج لدى Arbetsförmedlingen مع aktivitetsstöd أو utvecklingsersättning أو etableringsersättning؟', qFully: 'هل أنت باحث عن عمل بالكامل من دون وظيفة مستمرة؟', qActive: 'هل كنت مسجلاً لدى Arbetsförmedlingen وتبحث بنشاط عن عمل حتى بدأت فترة المرض؟',
      qLongProgram: 'هل كنت مريضاً بدوام كامل لأكثر من 30 يوماً أثناء البرنامج؟', qProgramEnded: 'هل أخرجك Arbetsförmedlingen بالفعل من البرنامج بسبب فترة المرض الطويلة؟',
      yes: 'نعم', no: 'لا', unsure: 'لا أعرف / أحتاج إلى التحقق',
      programTitle: 'مشارك في برنامج: أبلغ Arbetsförmedlingen عن المرض', programBody: 'في البرامج ذات التعويضات المذكورة يجب إبلاغ Arbetsförmedlingen في أول يوم مرض. إذا استمر المرض أكثر من سبعة أيام تحتاج إلى شهادة Arbetsförmedlingen الطبية. الاستحقاق للتعويض يقيّم بشكل منفصل.',
      longCta: 'أنا مريض بدوام كامل منذ أكثر من 30 يوماً',
      longVerifyTitle: 'مرور 30 يوماً وحده لا يكفي لتغيير المسار', longVerifyBody: 'قاعدة الثلاثين يوماً تخص المرض بدوام كامل. يحاول Arbetsförmedlingen أولاً تكييف البرنامج. إذا لم تكن متأكداً من النطاق أو حالة البرنامج فتحقق قبل الانتقال إلى مسار تعويض آخر.',
      stillProgramTitle: 'ما زلت في البرنامج: لا تغيّر مسار التعويض بنفسك', stillProgramBody: 'يوضح Arbetsförmedlingen أنه يحاول تكييف البرنامج كي تتمكن من المشاركة. إذا كنت مريضاً بدوام كامل لأكثر من 30 يوماً ولا تستطيع المشاركة إطلاقاً رغم التكييف فقد يتم إخراجك. قبل حدوث ذلك لا تفترض أن مسار sjukpenning بعد البرنامج قد بدأ.',
      endedTitle: 'تم إخراجك من البرنامج: تحقق من sjukpenning من اليوم التالي', endedBody: 'إذا أخرجك Arbetsförmedlingen فعلياً بعد الغياب الطويل بدوام كامل، يمكنك التقدم بطلب sjukpenning لدى Försäkringskassan من أول يوم بعد الخروج. يقيّم Försäkringskassan الاستحقاق بشكل منفصل ويستخدم شهادة sjukpenning الخاصة به.',
      endedVerifyTitle: 'تحقق مما إذا كان البرنامج قد انتهى فعلاً', endedVerifyBody: 'لا تفترض أن المرض لأكثر من 30 يوماً يعني تلقائياً انتهاء البرنامج. تحقق من القرار أو الحالة لدى Arbetsförmedlingen قبل الانتقال إلى مسار sjukpenning بعد البرنامج.',
      jobseekerTitle: 'باحث عن عمل بالكامل: ابدأ مع Försäkringskassan', jobseekerBody: 'توضح Försäkringskassan أن الباحث عن عمل بالكامل يبلغها في أول يوم مرض ثم يتقدم بطلب sjukpenning. يلزم تقرير طبي في موعد أقصاه اليوم الثامن. الاستحقاق يقيّم بشكل منفصل.',
      mixedTitle: 'لديك وضع مختلط – تحقق من المسارين', mixedBody: 'إذا كنت تبحث عن عمل بدوام جزئي ولديك وظيفة أيضاً، توضح Försäkringskassan أنك تبلغ صاحب العمل كذلك. لا نخمن طريقة تنسيق التعويضات.',
      verifyTitle: 'تحقق من وضع البرنامج قبل اختيار المسار', verifyBody: 'وضع البرنامج يغير الجهة التي تتلقى البلاغ الأول، لذلك لا يختار Stödassistenten جهة عندما تكون المعلومة غير واضحة.',
      activeVerifyTitle: 'تحقق من التسجيل والبحث النشط عن عمل', activeVerifyBody: 'لدى Försäkringskassan شروط منفصلة لـ sjukpenning في بداية فترة المرض مرتبطة بالتسجيل والبحث النشط عن عمل. نحن لا نقرر هذا الشرط هنا.',
      sourceFk: 'Försäkringskassan: المرض أثناء البحث عن عمل', sourceAf: 'Arbetsförmedlingen: المرض أثناء البرنامج', sourceFkProgram: 'Försäkringskassan: المرض أثناء برنامج Arbetsförmedlingen',
      privacy: 'لا نرسل التشخيص أو الشهادة الطبية أو SGI أو الراتب أو صاحب العمل أو الهوية أو مدة المرض الدقيقة أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية لـ Stödassistenten',
      feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'جویای کار و بیمار – مسیر درست را پیدا کنید', shellSub: 'وضعیت برنامه می‌تواند مرجع اعلام روز اول بیماری را تغییر دهد.',
      eyebrow: 'جویای کار ← بیماری', title: 'بیماری را به کجا باید اعلام کنید؟',
      intro: 'Stödassistenten بین جویای کار عادی و شرکت‌کننده در برنامه Arbetsförmedlingen تفاوت می‌گذارد. ما استحقاق sjukpenning یا مزایای دیگر را تعیین نمی‌کنیم.',
      qProgram: 'آیا اکنون در برنامه Arbetsförmedlingen با aktivitetsstöd، utvecklingsersättning یا etableringsersättning شرکت می‌کنید؟', qFully: 'آیا کاملاً جویای کار هستید و استخدام فعالی ندارید؟', qActive: 'آیا تا زمان شروع بیماری در Arbetsförmedlingen ثبت‌نام و فعالانه جویای کار بودید؟',
      qLongProgram: 'آیا در طول برنامه بیش از ۳۰ روز به طور کامل بیمار بوده‌اید؟', qProgramEnded: 'آیا Arbetsförmedlingen به دلیل این بیماری طولانی شما را واقعاً از برنامه خارج کرده است؟',
      yes: 'بله', no: 'خیر', unsure: 'نمی‌دانم / باید بررسی کنم',
      programTitle: 'شرکت‌کننده در برنامه: بیماری را به Arbetsförmedlingen اعلام کنید', programBody: 'در برنامه‌های دارای مزایای نام‌برده، غیبت ناشی از بیماری باید روز اول به Arbetsförmedlingen اعلام شود. اگر بیماری بیش از هفت روز ادامه دارد، گواهی پزشکی مخصوص Arbetsförmedlingen لازم است. استحقاق مزایا جداگانه بررسی می‌شود.',
      longCta: 'بیش از ۳۰ روز است که کاملاً بیمارم',
      longVerifyTitle: 'صرف گذشت ۳۰ روز برای تغییر مسیر کافی نیست', longVerifyBody: 'قاعده ۳۰ روز مربوط به بیماری تمام‌وقت است. Arbetsförmedlingen ابتدا تلاش می‌کند برنامه را سازگار کند. اگر درباره میزان بیماری یا وضعیت برنامه مطمئن نیستید، پیش از رفتن به مسیر مزایای دیگر آن را بررسی کنید.',
      stillProgramTitle: 'هنوز در برنامه هستید: خودسرانه مسیر مزایا را عوض نکنید', stillProgramBody: 'Arbetsförmedlingen می‌گوید ابتدا تلاش می‌کند برنامه را طوری سازگار کند که بتوانید شرکت کنید. اگر بیش از ۳۰ روز تمام‌وقت بیمار باشید و با وجود سازگارسازی اصلاً نتوانید شرکت کنید، ممکن است از برنامه خارج شوید. تا پیش از خروج، فرض نکنید مسیر sjukpenning پس از برنامه آغاز شده است.',
      endedTitle: 'از برنامه خارج شده‌اید: sjukpenning را از روز بعد بررسی کنید', endedBody: 'اگر Arbetsförmedlingen واقعاً پس از غیبت طولانی تمام‌وقت شما را از برنامه خارج کرده باشد، می‌توانید از اولین روز پس از خروج برای sjukpenning نزد Försäkringskassan درخواست دهید. استحقاق جداگانه بررسی می‌شود و گواهی پزشکی sjukpenning لازم است.',
      endedVerifyTitle: 'بررسی کنید برنامه واقعاً پایان یافته است', endedVerifyBody: 'بیش از ۳۰ روز بیماری را به معنی پایان خودکار برنامه ندانید. پیش از رفتن به مسیر sjukpenning پس از برنامه، تصمیم یا وضعیت را نزد Arbetsförmedlingen بررسی کنید.',
      jobseekerTitle: 'جویای کار کامل: از Försäkringskassan شروع کنید', jobseekerBody: 'Försäkringskassan می‌گوید جویای کار کامل باید روز اول بیماری را به آنجا اعلام کند و سپس برای sjukpenning درخواست دهد. گواهی پزشکی حداکثر تا روز هشتم لازم است. استحقاق جداگانه بررسی می‌شود.',
      mixedTitle: 'وضعیت شما ترکیبی است – هر دو مسیر را بررسی کنید', mixedBody: 'اگر بخشی از وقت جویای کار و هم‌زمان شاغل هستید، Försäkringskassan می‌گوید باید بیماری را به کارفرما نیز اعلام کنید. ما هماهنگی مزایا را حدس نمی‌زنیم.',
      verifyTitle: 'پیش از انتخاب مسیر، وضعیت برنامه را بررسی کنید', verifyBody: 'وضعیت برنامه مرجع اعلام نخست را تغییر می‌دهد. وقتی این موضوع روشن نیست Stödassistenten مرجع را حدس نمی‌زند.',
      activeVerifyTitle: 'ثبت‌نام و جست‌وجوی فعال کار را بررسی کنید', activeVerifyBody: 'Försäkringskassan برای آغاز دوره بیماری شرایط جداگانه‌ای درباره ثبت‌نام و جست‌وجوی فعال کار دارد. ما این شرط را تعیین نمی‌کنیم.',
      sourceFk: 'Försäkringskassan: بیماری هنگام جست‌وجوی کار', sourceAf: 'Arbetsförmedlingen: بیماری در برنامه', sourceFkProgram: 'Försäkringskassan: بیماری هنگام شرکت در برنامه',
      privacy: 'ما تشخیص، گواهی پزشکی، SGI، حقوق، کارفرما، هویت، مدت دقیق بیماری یا داستان شما را در URL یا بازخورد نمی‌فرستیم.', home: 'بازگشت به صفحه اصلی Stödassistenten',
      feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(lang) { return ['sv', 'ar', 'fa'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'sv'; }
  function detect(text) { return DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function handoffHref(lang) { return `person-pilot.html?actor_type=private_person&focus=unemployed_sick&lang=${encodeURIComponent(safeLang(lang))}`; }

  function nextStep(state) {
    state = state || {};
    if (!state.program) return 'ask_program';
    if (state.program === 'yes') {
      if (state.longCheckRequested !== 'yes') return 'program_route';
      if (!state.longProgramSick) return 'ask_long_program_sick';
      if (state.longProgramSick === 'no') return 'program_route';
      if (state.longProgramSick === 'unsure') return 'verify_long_program_transition';
      if (!state.programEnded) return 'ask_program_ended';
      if (state.programEnded === 'yes') return 'post_program_fk_route';
      if (state.programEnded === 'no') return 'long_program_still_enrolled';
      return 'verify_program_end_status';
    }
    if (state.program === 'unsure') return 'verify_program_status';
    if (!state.fullyUnemployed) return 'ask_employment_context';
    if (state.fullyUnemployed === 'no') return 'mixed_employment_route';
    if (state.fullyUnemployed === 'unsure') return 'verify_employment_context';
    if (!state.activeUntilSick) return 'ask_active_until_sick';
    if (state.activeUntilSick === 'yes') return 'jobseeker_route';
    return 'verify_jobseeker_requirement';
  }

  function pageLang(win) {
    const params = new URLSearchParams(win.location.search);
    return safeLang(params.get('lang') || win.document.documentElement.lang);
  }

  function rootHandoff(win) {
    const doc = win.document;
    const button = doc.querySelector('#analyzeBtn');
    const input = doc.querySelector('#situation');
    const results = doc.querySelector('#engineResults');
    if (!button || !input || !results) return;
    button.addEventListener('click', function () {
      if (!detect(input.value)) return;
      const lang = pageLang(win);
      const c = COPY[lang];
      const existing = doc.querySelector('[data-stod-unemployed-sick-route]');
      if (existing) existing.remove();
      const route = doc.createElement('div');
      route.className = 'route';
      route.setAttribute('data-stod-unemployed-sick-route', 'true');
      route.innerHTML = `<div><strong>${c.shellTitle}</strong><small>${c.shellSub}</small></div><a href="${handoffHref(lang)}">→</a>`;
      results.prepend(route);
    });
  }

  function feedbackMarkup(c) {
    const row = (name, label) => `<fieldset><legend>${label}</legend><label><input type="radio" name="${name}" value="yes"> ${c.yes}</label> <label><input type="radio" name="${name}" value="no"> ${c.no}</label></fieldset>`;
    return `<section class="feedback"><h3>${c.feedback}</h3>${row('learned_new', c.learned)}${row('useful', c.useful)}${row('next_step_clear', c.clear)}<button type="button" data-send-feedback>${c.send}</button><p data-feedback-status aria-live="polite"></p></section>`;
  }

  function focusedApp(win) {
    const doc = win.document;
    const main = doc.querySelector('#main');
    if (!main) return;
    const lang = pageLang(win);
    const c = COPY[lang];
    doc.documentElement.lang = lang;
    doc.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl';
    const state = { program: '', fullyUnemployed: '', activeUntilSick: '', longCheckRequested: '', longProgramSick: '', programEnded: '' };

    function option(name, value, label) { return `<label><input type="radio" name="${name}" value="${value}"> ${label}</label>`; }
    function question(name, text) { return `<fieldset data-question="${name}"><legend>${text}</legend>${option(name, 'yes', c.yes)} ${option(name, 'no', c.no)} ${option(name, 'unsure', c.unsure)}</fieldset>`; }
    function sources() { return `<p><a href="${FK_JOBSEEKER_URL}" target="_blank" rel="noopener">${c.sourceFk}</a><br><a href="${AF_PROGRAM_URL}" target="_blank" rel="noopener">${c.sourceAf}</a><br><a href="${FK_PROGRAM_SICK_URL}" target="_blank" rel="noopener">${c.sourceFkProgram}</a></p>`; }
    function result(title, body) { return `<section class="result-card"><h2>${title}</h2><p>${body}</p>${sources()}<p class="note">${c.privacy}</p></section>`; }

    function render() {
      const step = nextStep(state);
      let content = `<p class="eyebrow">${c.eyebrow}</p><h1>${c.title}</h1><p>${c.intro}</p>`;
      if (step === 'ask_program') content += question('program', c.qProgram);
      else if (step === 'ask_employment_context') content += question('fullyUnemployed', c.qFully);
      else if (step === 'ask_active_until_sick') content += question('activeUntilSick', c.qActive);
      else if (step === 'ask_long_program_sick') content += question('longProgramSick', c.qLongProgram);
      else if (step === 'ask_program_ended') content += question('programEnded', c.qProgramEnded);
      else if (step === 'program_route') {
        content += result(c.programTitle, c.programBody);
        content += `<p><button type="button" data-long-program-check>${c.longCta}</button></p>`;
      }
      else if (step === 'post_program_fk_route') content += result(c.endedTitle, c.endedBody);
      else if (step === 'long_program_still_enrolled') content += result(c.stillProgramTitle, c.stillProgramBody);
      else if (step === 'verify_long_program_transition') content += result(c.longVerifyTitle, c.longVerifyBody);
      else if (step === 'verify_program_end_status') content += result(c.endedVerifyTitle, c.endedVerifyBody);
      else if (step === 'jobseeker_route') content += result(c.jobseekerTitle, c.jobseekerBody);
      else if (step === 'mixed_employment_route') content += result(c.mixedTitle, c.mixedBody);
      else if (step === 'verify_program_status' || step === 'verify_employment_context') content += result(c.verifyTitle, c.verifyBody);
      else content += result(c.activeVerifyTitle, c.activeVerifyBody);
      if (!step.startsWith('ask_')) content += feedbackMarkup(c);
      content += `<p><a href="index.html">${c.home}</a></p>`;
      main.innerHTML = `<div class="wrap" style="max-width:760px;margin:0 auto;padding:32px 20px">${content}</div>`;
      main.querySelectorAll('input[type="radio"]').forEach((el) => {
        if (['program', 'fullyUnemployed', 'activeUntilSick', 'longProgramSick', 'programEnded'].includes(el.name)) {
          el.addEventListener('change', function () { state[el.name] = el.value; render(); });
        }
      });
      const longCheck = main.querySelector('[data-long-program-check]');
      if (longCheck) longCheck.addEventListener('click', function () { state.longCheckRequested = 'yes'; render(); });
      const send = main.querySelector('[data-send-feedback]');
      if (send) send.addEventListener('click', async function () {
        const get = (name) => { const picked = main.querySelector(`input[name="${name}"]:checked`); return picked ? picked.value === 'yes' : null; };
        const payload = {
          app_version: 'v49', language: lang, flow: 'unemployed_sick',
          learned_new: get('learned_new'), useful: get('useful'), next_step_clear: get('next_step_clear'),
          ratings: { route: nextStep(state) }
        };
        const status = main.querySelector('[data-feedback-status]');
        try {
          const res = await win.fetch(FEEDBACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error('feedback');
          status.textContent = c.sent;
        } catch (_) { status.textContent = c.error; }
      });
    }
    render();
  }

  function hookPerson(win) {
    const params = new URLSearchParams(win.location.search);
    if (params.get('focus') !== 'unemployed_sick') return;
    if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', function () { focusedApp(win); }, { once: true });
    else focusedApp(win);
  }

  function init(win) {
    if (!win || !win.document) return;
    rootHandoff(win);
    hookPerson(win);
  }

  return { init, detect, handoffHref, nextStep, FK_JOBSEEKER_URL, AF_PROGRAM_URL, FK_PROGRAM_SICK_URL };
});