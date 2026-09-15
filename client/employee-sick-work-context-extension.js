(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODEmployeeSickWorkContextExtension = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // v64 extension of the SAME employee_sick capability. This is not a separate
  // entrepreneur app or matcher. It adds only coarse work-context facts when
  // company form changes the first sickness-reporting route. Material benefit
  // eligibility, SGI, income, diagnosis, benefit level and exact deadlines stay
  // outside this public routing layer and must be verified in current sources.
  const FK_SELECTOR_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukpenning-har-eget-foretag';
  const FK_LIMITED_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukpenning-har-eget-foretag/sjukpenning-nar-du-har-aktiebolag';
  const FK_SOLE_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukpenning-har-eget-foretag/sjukpenning-for-dig-med-enskild-firma';
  const FK_COMBINED_URL = 'https://www.forsakringskassan.se/privatperson/foretagare/foretagare-med-fa-skatt-kombinatorer';
  const FK_INVOICED_URL = 'https://www.forsakringskassan.se/privatperson/foretagare/egenanstalld';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const EMPLOYER_ASKING_PATTERNS = [
    /(?:min|vår|en)\s+(?:anställd|medarbetare|personal).*(?:sjuk|sjukskriv)/i,
    /(?:sjuk|sjukskriv).*(?:min|vår|en)\s+(?:anställd|medarbetare|personal)/i,
    /(?:موظف|عامل)\s+(?:عندي|لدينا|في شركتي).*(?:مريض|مرض)/i,
    /(?:مريض|مرض).*(?:موظف|عامل)\s+(?:عندي|لدينا|في شركتي)/i,
    /(?:کارمند|نیروی)\s+(?:من|شرکتم).*(?:بیمار|بیماری)/i,
    /(?:بیمار|بیماری).*(?:کارمند|نیروی)\s+(?:من|شرکتم)/i,
  ];
  const SICK_PATTERNS = [
    /sjuk|sjukskriv|sjukanmäl|sjukpenning|kan\s+inte\s+jobba/i,
    /مريض|مرض|إجازة\s+مرضية|لا\s+أستطيع\s+العمل/i,
    /بیمار|بیماری|مرخصی\s+استعلاجی|نمی.?توانم\s+کار/i,
  ];
  const LIMITED_PATTERNS = [
    /(?:eget|mitt|driver|har)\s+(?:ett\s+)?(?:aktiebolag|ab)\b|\baktiebolag\b/i,
    /شركة\s+مساهمة|شركة\s+محدودة|أملك\s+شركة/i,
    /شرکت\s+سهامی|شرکت\s+محدود|شرکت\s+خودم/i,
  ];
  const SOLE_PATTERNS = [
    /enskild\s+firma|enskild\s+närings|handelsbolag|kommanditbolag/i,
    /مؤسسة\s+فردية|شركة\s+تضامن|شركة\s+توصية/i,
    /کسب.?و.?کار\s+انفرادی|شرکت\s+تضامنی|شرکت\s+مختلط/i,
  ];
  const COMBINED_PATTERNS = [
    /\bkombinatör\b|fa-?skatt|(?:anställd|jobbar).*(?:enskild\s+firma|eget\s+företag)|(?:enskild\s+firma|eget\s+företag).*(?:anställd|jobbar)/i,
    /موظف.*(?:عمل\s+حر|مشروع\s+خاص)|(?:عمل\s+حر|مشروع\s+خاص).*موظف/i,
    /کارمند.*(?:کسب.?و.?کار\s+خودم|خوداشتغال)|(?:کسب.?و.?کار\s+خودم|خوداشتغال).*کارمند/i,
  ];
  const INVOICED_PATTERNS = [
    /egenanställd|faktureringsföretag|fakturerar\s+via\s+(?:ett\s+)?företag/i,
    /أعمل\s+عبر\s+شركة\s+فواتير|شركة\s+فواتير/i,
    /از\s+طریق\s+شرکت\s+صورتحساب|شرکت\s+فاکتور/i,
  ];
  const SELF_EMPLOYED_PATTERNS = [
    /egenföretag|driver\s+eget|eget\s+företag|driver\s+(?:en|ett)\s+firma|har\s+(?:en|ett)\s+firma/i,
    /صاحب\s+عمل|أعمل\s+لحسابي|عملي\s+الخاص|مشروع\s+خاص/i,
    /خوداشتغال|کسب.?و.?کار\s+خودم|برای\s+خودم\s+کار/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Eget företag och sjuk – företagsformen ändrar första vägen',
      shellSub: 'Samma sjukdomsspår, men aktiebolag, enskild firma, kombinatör och egenanställning har olika första kontaktvägar.',
      eyebrow: 'Arbete + sjukdom → företagskontext',
      title: 'Hur arbetar du i företaget?',
      intro: 'Stödassistenten använder bara företagsformen för att välja rätt första kontrollväg. Vi avgör inte sjukpenning, SGI, arbetsförmåga, belopp eller exakt tidsfrist.',
      qForm: 'Vilken företagsform gäller för ditt eget företag?',
      limited: 'Eget aktiebolag',
      sole: 'Enskild firma, handelsbolag eller kommanditbolag',
      unsure: 'Vet inte / behöver kontrollera',
      limitedTitle: 'Eget aktiebolag: börja i anställd + arbetsgivare-spåret',
      limitedBody: 'Försäkringskassan räknar den som arbetar i sitt eget aktiebolag som anställd i bolaget. Det betyder att första sjukfrånvarovägen inte ska blandas ihop med enskild firma. Följ den aktuella aktiebolagssidan för sjuklön, sjukanmälan och när Försäkringskassans ansökningssteg blir aktuellt.',
      soleTitle: 'Enskild firma/HB/KB: börja direkt i företagarsidan hos Försäkringskassan',
      soleBody: 'Försäkringskassan har en separat sjukpenningväg för enskild firma samt delägare i handels- och kommanditbolag. Sjukanmälan går direkt till Försäkringskassan och karenstiden kan skilja sig från anställdas regler. Kontrollera den aktuella sidan innan du antar en viss tidsfrist eller karenstid.',
      combinedTitle: 'Anställd + enskild firma: båda arbetsdelarna kan behöva hanteras',
      combinedBody: 'Försäkringskassan beskriver kombinatörer som både anställda och företagare. Vilken del du skulle ha arbetat i när sjukdomen börjar styr när du behöver sjukanmäla till arbetsgivaren, Försäkringskassan eller båda. Stödassistenten ska inte reducera detta till bara anställd eller bara företagare.',
      invoicedTitle: 'Egenanställd via faktureringsföretag: faktureringsföretaget är arbetsgivarkontexten',
      invoicedBody: 'Försäkringskassan beskriver faktureringsföretaget som arbetsgivare för egenanställda under uppdraget. Därför ska sjukfrånvaron inte automatiskt behandlas som enskild firma. Kontrollera den aktuella egenanställningssidan och villkoren för just din situation.',
      verifyTitle: 'Kontrollera företagsformen först',
      verifyBody: 'Företagsformen kan ändra vem du ska sjukanmäla dig till och vilken karensmodell som används. Stödassistenten frågar därför inte efter lön, diagnos eller SGI innan den grova företagsformen är klar.',
      sourceSelector: 'Försäkringskassan: sjukpenning när du har eget företag',
      sourceLimited: 'Försäkringskassan: sjukpenning när du har aktiebolag',
      sourceSole: 'Försäkringskassan: sjukpenning för dig med enskild firma',
      sourceCombined: 'Försäkringskassan: företagare med FA-skatt – kombinatörer',
      sourceInvoiced: 'Försäkringskassan: egenanställd',
      privacy: 'Ingen diagnos, lön, SGI, företagsnamn, organisationsnummer eller rå berättelse skickas vidare.',
      feedback: 'Hjälpte den här vägen?', learned: 'Fick du reda på något nytt?', useful: 'Var svaret användbart?', clear: 'Var nästa steg tydligt?', yes: 'Ja', no: 'Nej', send: 'Skicka anonym feedback', sent: 'Tack! Feedbacken är sparad.', error: 'Feedbacken kunde inte skickas just nu.', home: 'Till startsidan'
    },
    ar: {
      shellTitle: 'لديك عمل خاص وأنت مريض – شكل الشركة يغيّر المسار الأول',
      shellSub: 'نفس مسار المرض، لكن الشركة المساهمة والعمل الفردي والعمل المزدوج والعمل عبر شركة فواتير تبدأ بطرق مختلفة.',
      eyebrow: 'العمل + المرض ← سياق العمل', title: 'كيف تعمل في نشاطك؟', intro: 'نستخدم شكل العمل فقط لاختيار أول مسار للتحقق. لا نقرر الاستحقاق أو SGI أو القدرة على العمل أو المبلغ أو الموعد النهائي.',
      qForm: 'ما شكل نشاطك الخاص؟', limited: 'شركة أملكها وأعمل فيها', sole: 'مؤسسة فردية / شركة تضامن أو توصية', unsure: 'لا أعرف / أحتاج للتحقق',
      limitedTitle: 'شركة تملكها: ابدأ بمسار الموظف وصاحب العمل', limitedBody: 'تعتبر Försäkringskassan من يعمل في شركته المساهمة موظفاً في الشركة. لذلك لا ينبغي خلط هذا المسار مع المؤسسة الفردية. تحقق من الصفحة الحالية لمعرفة خطوات الإبلاغ والطلب.',
      soleTitle: 'عمل فردي/شراكة: ابدأ بمسار صاحب العمل الحر لدى Försäkringskassan', soleBody: 'هناك مسار منفصل للمؤسسة الفردية وشركاء شركات التضامن والتوصية. يكون الإبلاغ مباشرة إلى Försäkringskassan وقد تختلف قواعد الانتظار عن الموظفين. تحقق من المصدر الحالي قبل افتراض مدة محددة.',
      combinedTitle: 'موظف + عمل فردي: قد يلزم التعامل مع الجزأين', combinedBody: 'توضح Försäkringskassan أن من يجمع بين وظيفة وعمل فردي قد يحتاج إلى الإبلاغ لصاحب العمل ولـ Försäkringskassan حسب مكان العمل المخطط لذلك اليوم. لا نختزل الوضع إلى مسار واحد.',
      invoicedTitle: 'عمل عبر شركة فواتير: شركة الفواتير هي سياق صاحب العمل', invoicedBody: 'تصف Försäkringskassan شركة الفواتير بأنها صاحب العمل أثناء المهمة. لذلك لا يُعامل الوضع تلقائياً كمؤسسة فردية. تحقق من المسار الرسمي الحالي.',
      verifyTitle: 'تحقق من شكل العمل أولاً', verifyBody: 'شكل العمل قد يغيّر جهة الإبلاغ ونظام الانتظار. لذلك لا نسأل عن الراتب أو التشخيص أو SGI قبل معرفة الشكل العام.',
      sourceSelector: 'Försäkringskassan: المرض لمن لديه عمل خاص', sourceLimited: 'Försäkringskassan: المرض مع شركة مساهمة', sourceSole: 'Försäkringskassan: المرض مع مؤسسة فردية', sourceCombined: 'Försäkringskassan: الجمع بين وظيفة وعمل خاص', sourceInvoiced: 'Försäkringskassan: العمل عبر شركة فواتير', privacy: 'لا نرسل التشخيص أو الراتب أو SGI أو اسم الشركة أو رقمها أو القصة الخام.',
      feedback: 'هل ساعدك هذا المسار؟', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كان الجواب مفيداً؟', clear: 'هل كانت الخطوة التالية واضحة؟', yes: 'نعم', no: 'لا', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! تم حفظ الملاحظات.', error: 'تعذر إرسال الملاحظات الآن.', home: 'الصفحة الرئيسية'
    },
    fa: {
      shellTitle: 'کسب‌وکار خودت را داری و بیمار شده‌ای – نوع کار مسیر اول را عوض می‌کند',
      shellSub: 'همان مسیر بیماری است، اما شرکت خودت، کسب‌وکار انفرادی، کار ترکیبی و شرکت فاکتور مسیرهای شروع متفاوت دارند.',
      eyebrow: 'کار + بیماری ← زمینه کاری', title: 'در کسب‌وکارت چگونه کار می‌کنی؟', intro: 'فقط از نوع کار برای انتخاب اولین مسیر بررسی استفاده می‌کنیم. درباره استحقاق، SGI، توان کار، مبلغ یا مهلت دقیق تصمیم نمی‌گیریم.',
      qForm: 'نوع کسب‌وکار خودت چیست؟', limited: 'شرکت خودم که در آن کار می‌کنم', sole: 'کسب‌وکار انفرادی / شراکت', unsure: 'نمی‌دانم / باید بررسی کنم',
      limitedTitle: 'شرکت خودت: از مسیر کارمند + کارفرما شروع کن', limitedBody: 'Försäkringskassan فردی را که در شرکت سهامی خودش کار می‌کند کارمند شرکت می‌داند. این مسیر نباید با کسب‌وکار انفرادی یکی شود. برای گزارش بیماری و درخواست بعدی، صفحه فعلی رسمی را بررسی کن.',
      soleTitle: 'کسب‌وکار انفرادی/شراکت: مستقیماً از مسیر کارآفرین Försäkringskassan شروع کن', soleBody: 'Försäkringskassan برای کسب‌وکار انفرادی و شرکا مسیر جداگانه دارد. گزارش بیماری مستقیماً به Försäkringskassan انجام می‌شود و دوره انتظار می‌تواند با کارمند فرق داشته باشد. پیش از فرض مهلت یا دوره مشخص، منبع فعلی را بررسی کن.',
      combinedTitle: 'کارمند + کسب‌وکار انفرادی: ممکن است هر دو بخش نیاز به اقدام داشته باشند', combinedBody: 'Försäkringskassan برای افراد دارای هم‌زمان شغل و کسب‌وکار توضیح می‌دهد که بسته به کاری که آن روز قرار بوده انجام شود، ممکن است گزارش به کارفرما، Försäkringskassan یا هر دو لازم باشد. وضعیت را فقط به یکی از دو مسیر تقلیل نمی‌دهیم.',
      invoicedTitle: 'کار از طریق شرکت فاکتور: شرکت فاکتور زمینه کارفرمایی است', invoicedBody: 'Försäkringskassan شرکت فاکتور را در زمان مأموریت کارفرما توصیف می‌کند. بنابراین این وضعیت نباید خودکار کسب‌وکار انفرادی فرض شود. مسیر رسمی فعلی را بررسی کن.',
      verifyTitle: 'اول نوع کسب‌وکار را بررسی کن', verifyBody: 'نوع کار می‌تواند مرجع گزارش بیماری و مدل انتظار را تغییر دهد. پس قبل از مشخص شدن این زمینه، درباره حقوق، تشخیص یا SGI سؤال نمی‌کنیم.',
      sourceSelector: 'Försäkringskassan: بیماری برای صاحب کسب‌وکار', sourceLimited: 'Försäkringskassan: بیماری با شرکت سهامی', sourceSole: 'Försäkringskassan: بیماری با کسب‌وکار انفرادی', sourceCombined: 'Försäkringskassan: کارمند و صاحب کسب‌وکار', sourceInvoiced: 'Försäkringskassan: کار از طریق شرکت فاکتور', privacy: 'تشخیص، حقوق، SGI، نام یا شماره شرکت و متن خام داستان ارسال نمی‌شود.',
      feedback: 'این مسیر کمک کرد؟', learned: 'چیز تازه‌ای فهمیدی؟', useful: 'پاسخ مفید بود؟', clear: 'قدم بعدی روشن بود؟', yes: 'بله', no: 'خیر', send: 'ارسال بازخورد ناشناس', sent: 'ممنون! بازخورد ذخیره شد.', error: 'فعلاً ارسال بازخورد ممکن نیست.', home: 'صفحه اصلی'
    }
  };

  function safeLang(lang) { const v = String(lang || '').toLowerCase(); return ['sv', 'ar', 'fa'].includes(v) ? v : 'sv'; }
  function any(patterns, text) { return patterns.some((p) => p.test(String(text || ''))); }
  function sick(text) { return any(SICK_PATTERNS, text); }
  function employerAsking(text) { return any(EMPLOYER_ASKING_PATTERNS, text); }
  function detectBusinessForm(text) {
    if (any(LIMITED_PATTERNS, text)) return 'limited_company';
    if (any(SOLE_PATTERNS, text)) return 'sole_partnership';
    return null;
  }
  function detectWorkContext(text) {
    if (!sick(text) || employerAsking(text)) return null;
    if (any(INVOICED_PATTERNS, text)) return { workContext: 'invoiced_worker', businessForm: null };
    if (any(COMBINED_PATTERNS, text)) return { workContext: 'combined_employment', businessForm: 'sole_partnership' };
    const form = detectBusinessForm(text);
    if (form || any(SELF_EMPLOYED_PATTERNS, text)) return { workContext: 'self_employed', businessForm: form };
    return null;
  }
  function handoffHref(lang, context) {
    const c = context || {};
    const params = new URLSearchParams();
    params.set('actor_type', 'private_person');
    params.set('focus', 'employee_sick');
    params.set('lang', safeLang(lang));
    if (['self_employed', 'invoiced_worker', 'combined_employment'].includes(c.workContext)) params.set('work_context', c.workContext);
    if (['limited_company', 'sole_partnership'].includes(c.businessForm)) params.set('business_form', c.businessForm);
    return `person-pilot.html?${params.toString()}`;
  }
  function nextStep(state) {
    const s = state || {};
    if (s.workContext === 'invoiced_worker') return 'invoiced_worker';
    if (s.workContext === 'combined_employment') return 'combined_employment';
    if (s.workContext !== 'self_employed') return 'not_extension';
    if (!s.businessForm) return 'ask_business_form';
    if (s.businessForm === 'limited_company') return 'limited_company';
    if (s.businessForm === 'sole_partnership') return 'sole_partnership';
    return 'verify_business_form';
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
      const context = detectWorkContext(input.value);
      if (!context) return;
      const lang = pageLang(win);
      const c = COPY[lang];
      const oldEmployee = doc.querySelector('[data-stod-employee-sick-route]');
      if (oldEmployee) oldEmployee.remove();
      const old = doc.querySelector('[data-stod-work-context-sick-route]');
      if (old) old.remove();
      const route = doc.createElement('div');
      route.className = 'route';
      route.setAttribute('data-stod-work-context-sick-route', 'true');
      route.innerHTML = `<div><strong>${c.shellTitle}</strong><small>${c.shellSub}</small></div><a href="${handoffHref(lang, context)}">→</a>`;
      results.prepend(route);
    });
  }

  function feedbackMarkup(c) {
    const row = (name, label) => `<fieldset><legend>${label}</legend><label><input type="radio" name="${name}" value="yes"> ${c.yes}</label> <label><input type="radio" name="${name}" value="no"> ${c.no}</label></fieldset>`;
    return `<section class="feedback"><h3>${c.feedback}</h3>${row('learned_new', c.learned)}${row('useful', c.useful)}${row('next_step_clear', c.clear)}<button type="button" data-send-work-context-feedback>${c.send}</button><p data-work-context-feedback-status aria-live="polite"></p></section>`;
  }
  function sourceLink(url, label) { return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`; }

  function focusedApp(win) {
    const doc = win.document;
    const main = doc.querySelector('#main');
    if (!main) return;
    const params = new URLSearchParams(win.location.search);
    if (params.get('focus') !== 'employee_sick') return;
    const workContext = params.get('work_context');
    if (!['self_employed', 'invoiced_worker', 'combined_employment'].includes(workContext)) return;
    const lang = pageLang(win);
    const c = COPY[lang];
    doc.documentElement.lang = lang;
    doc.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl';
    const initialForm = ['limited_company', 'sole_partnership'].includes(params.get('business_form')) ? params.get('business_form') : '';
    const state = { workContext, businessForm: initialForm };

    function result(title, body, sources) {
      return `<section class="result-card"><h2>${title}</h2><p>${body}</p><p>${sources}</p><p class="note">${c.privacy}</p></section>`;
    }
    function render() {
      const step = nextStep(state);
      let content = `<p class="eyebrow">${c.eyebrow}</p><h1>${c.title}</h1><p>${c.intro}</p>`;
      if (step === 'ask_business_form') {
        content += `<fieldset data-question="businessForm"><legend>${c.qForm}</legend><label><input type="radio" name="businessForm" value="limited_company"> ${c.limited}</label> <label><input type="radio" name="businessForm" value="sole_partnership"> ${c.sole}</label> <label><input type="radio" name="businessForm" value="unknown"> ${c.unsure}</label></fieldset>`;
      } else if (step === 'limited_company') {
        content += result(c.limitedTitle, c.limitedBody, `${sourceLink(FK_LIMITED_URL, c.sourceLimited)}<br>${sourceLink(FK_SELECTOR_URL, c.sourceSelector)}`);
      } else if (step === 'sole_partnership') {
        content += result(c.soleTitle, c.soleBody, `${sourceLink(FK_SOLE_URL, c.sourceSole)}<br>${sourceLink(FK_SELECTOR_URL, c.sourceSelector)}`);
      } else if (step === 'combined_employment') {
        content += result(c.combinedTitle, c.combinedBody, sourceLink(FK_COMBINED_URL, c.sourceCombined));
      } else if (step === 'invoiced_worker') {
        content += result(c.invoicedTitle, c.invoicedBody, sourceLink(FK_INVOICED_URL, c.sourceInvoiced));
      } else {
        content += result(c.verifyTitle, c.verifyBody, sourceLink(FK_SELECTOR_URL, c.sourceSelector));
      }
      if (step !== 'ask_business_form') content += feedbackMarkup(c);
      content += `<p><a href="index.html">${c.home}</a></p>`;
      main.innerHTML = `<div class="wrap" style="max-width:760px;margin:0 auto;padding:32px 20px">${content}</div>`;
      main.querySelectorAll('input[name="businessForm"]').forEach((el) => el.addEventListener('change', function () { state.businessForm = el.value; render(); }));
      const send = main.querySelector('[data-send-work-context-feedback]');
      if (send) send.addEventListener('click', async function () {
        const get = (name) => { const picked = main.querySelector(`input[name="${name}"]:checked`); return picked ? picked.value === 'yes' : null; };
        const payload = {
          app_version: 'v64', language: lang, flow: 'employee_sick',
          learned_new: get('learned_new'), useful: get('useful'), next_step_clear: get('next_step_clear'),
          ratings: { route: nextStep(state), work_context: state.workContext, business_form: state.businessForm || 'unknown' }
        };
        const status = main.querySelector('[data-work-context-feedback-status]');
        try {
          const res = await win.fetch(FEEDBACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error('feedback');
          status.textContent = c.sent;
        } catch (_) { status.textContent = c.error; }
      });
    }
    render();
  }

  function init(win) {
    if (!win || !win.document) return;
    rootHandoff(win);
    const run = function () { focusedApp(win); };
    if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }

  return Object.freeze({
    init, detectWorkContext, detectBusinessForm, handoffHref, nextStep,
    FK_SELECTOR_URL, FK_LIMITED_URL, FK_SOLE_URL, FK_COMBINED_URL, FK_INVOICED_URL
  });
});
