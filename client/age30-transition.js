(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODAge30Transition = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const ACTIVITY_URL = 'https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/aktivitetsersattning-for-unga-vuxna';
  const SICKNESS_COMP_URL = 'https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/sjukersattning-resten-av-arbetslivet-sjukpension';
  const SPECIAL_CASE_URL = 'https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/sjukpenning-i-sarskilda-fall';

  const BENEFIT_PATTERNS = [
    /\baktivitetsersättning(?:en)?\b/i,
    /بدل\s+النشاط|تعويض\s+النشاط|إعانة\s+النشاط/i,
    /کمک[‌\s-]*هزینه\s+فعالیت|غرامت\s+فعالیت|اکتیویتتس[‌\s-]*ارشَت/i,
  ];
  const AGE30_PATTERNS = [
    /\b(?:fyller|fyllt|fylla|blir|blev)\s+30\b/i,
    /\b30\s*(?:år|års|årsdagen)\b/i,
    /\btrettio\s*år\b/i,
    /(?:أبلغ|بلغت|سأبلغ|عمر[ي]?)\s*(?:30|٣٠)|(?:30|٣٠)\s*(?:عام|سنة)/i,
    /(?:۳۰|30)\s*(?:سال|ساله)|(?:سی|۳۰|30)\s*سالگی/i,
  ];
  const END_PATTERNS = [
    /tar\s+slut|slutar|upphör|vad\s+händer|efter\s+aktivitetsersättning/i,
    /تنتهي|ستنتهي|ماذا\s+يحدث|بعد\s+بدل/i,
    /تمام\s+می[‌\s]?شود|قطع\s+می[‌\s]?شود|چه\s+می[‌\s]?شود|بعد\s+از/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Aktivitetsersättning och 30 år – kontrollera nästa väg',
      shellSub: 'Ingen automatisk övergång: reda ut vilken väg som behöver verifieras',
      eyebrow: 'Aktivitetsersättning → 30 år',
      title: 'Du närmar dig 30-årsgränsen. Kontrollera nästa väg innan ersättningen tar slut.',
      intro: 'Aktivitetsersättning upphör vid 30-årsgränsen. Den här piloten väljer inte ersättning åt dig och lovar inte rätt, belopp eller beslut. Vi frågar bara sådant som kan ändra nästa säkra handling.',
      qPrior: 'Har du aktivitetsersättning till och med månaden innan du fyller 30 år?',
      qCapacity: 'Hur ser arbetsförmågan ut framåt enligt den situation som behöver bedömas?',
      qSgi: 'Om sjukpenning i särskilda fall ska kontrolleras: är din SGI låg eller saknas?',
      qProtected: 'Har du skyddat rätten efter aktivitetsersättningen, till exempel genom arbete, inskrivning hos Arbetsförmedlingen eller program när det varit relevant?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      permanent: 'Nedsättningen kan vara bestående även framåt',
      future: 'Jag kan kanske arbeta eller arbeta mer framöver',
      priorNoTitle: 'Använd inte specialfallsspåret som om det redan vore bekräftat',
      priorNoBody: 'Sjukpenning i särskilda fall har särskilda övergångsvillkor. Kontrollera din faktiska historik och aktuell Försäkringskasseväg i stället för att anta att 30-årsdagen i sig ger rätt.',
      priorUnsureTitle: 'Bekräfta först när aktivitetsersättningen faktiskt slutar',
      priorUnsureBody: 'Ta fram beslutet eller kontrollera Mina sidor och bekräfta om aktivitetsersättningen löper till och med månaden före 30-årsdagen. Den faktan kan ändra nästa väg.',
      permanentTitle: 'Sjukersättning kan vara en väg att kontrollera – men är inte automatisk',
      permanentBody: 'Försäkringskassan bedömer arbetsförmågan, inte bara diagnosen. Kontrollera sjukersättningsvillkoren och aktuella underlag innan aktivitetsersättningen upphör. Tidigare aktivitetsersättning blir inte automatiskt sjukersättning.',
      capacityUnsureTitle: 'Klargör arbetsförmågan framåt innan du väljer ersättningsspår',
      capacityUnsureBody: 'Skillnaden mellan bestående nedsättning och möjlighet att arbeta mer framöver kan ändra vilken väg som är relevant. Kontrollera detta med aktuellt medicinskt underlag och Försäkringskassan.',
      sgiNoTitle: 'Låg eller saknad SGI är en särskild del av specialfallsspåret',
      sgiNoBody: 'Om SGI inte är låg eller saknas ska piloten inte anta att sjukpenning i särskilda fall är rätt väg. Kontrollera i stället vilken aktuell sjukpenning- eller rehabiliteringsväg som gäller för din situation.',
      sgiUnsureTitle: 'Kontrollera SGI-läget innan specialfallsspåret används',
      sgiUnsureBody: 'SGI-frågan kan ändra vägen. Kontrollera aktuell SGI och låt Försäkringskassan bedöma om sjukpenning i särskilda fall kan vara relevant.',
      protectedYesTitle: 'Sjukpenning i särskilda fall är värd att verifiera nu',
      protectedYesBody: 'Du har angett de grova fakta som gör specialfallsspåret relevant att kontrollera. Försäkringskassan avgör rätten utifrån bland annat tidigare aktivitetsersättning, SGI, skydd av rätten, arbetsförmåga och försäkring i Sverige.',
      protectedNoTitle: 'Anta inte att specialfallsspåret är öppet',
      protectedNoBody: 'Skydd av rätten är en del av villkoren. Ett nej här betyder inte att allt stöd saknas, men piloten ska inte lova sjukpenning i särskilda fall. Kontrollera aktuell väg med Försäkringskassan.',
      protectedUnsureTitle: 'Verifiera om rätten har varit skyddad',
      protectedUnsureBody: 'Ta reda på om arbete, inskrivning hos Arbetsförmedlingen eller program har skyddat rätten när det varit relevant. Piloten avgör inte detta från en kort berättelse.',
      housingNote: 'Har du bostadstillägg eller oro för boendet? Verifiera boendestödet separat efter att primär ersättningsväg har klargjorts. Bostadstillägg och boendetillägg är inte samma förmån och ska inte antas fortsätta automatiskt.',
      sourceActivity: 'Försäkringskassan: aktivitetsersättning för unga vuxna',
      sourceSickness: 'Försäkringskassan: sjukersättning',
      sourceSpecial: 'Försäkringskassan: sjukpenning i särskilda fall',
    },
    ar: {
      shellTitle: 'بدل النشاط وعمر 30 – تحقق من المسار التالي',
      shellSub: 'لا يوجد انتقال تلقائي: حدّد المسار الذي يجب التحقق منه',
      eyebrow: 'بدل النشاط ← عمر 30',
      title: 'أنت تقترب من حد 30 عاماً. تحقق من المسار التالي قبل انتهاء البدل.',
      intro: 'لا تختار هذه النسخة التجريبية تعويضاً لك ولا تضمن الاستحقاق أو المبلغ أو القرار. نسأل فقط عن الحقائق التي قد تغيّر الخطوة الآمنة التالية.',
      qPrior: 'هل كان لديك بدل النشاط حتى الشهر السابق لبلوغك 30 عاماً؟',
      qCapacity: 'كيف تبدو قدرتك على العمل مستقبلاً بحسب الوضع الذي يحتاج إلى تقييم؟',
      qSgi: 'إذا كان مسار المرض للحالات الخاصة سيُفحص: هل SGI منخفض أو غير موجود؟',
      qProtected: 'هل حميت حقك بعد بدل النشاط، مثلاً بالعمل أو التسجيل لدى Arbetsförmedlingen أو المشاركة في برنامج عندما كان ذلك مناسباً؟',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      permanent: 'قد يكون انخفاض القدرة على العمل دائماً مستقبلاً',
      future: 'قد أستطيع العمل أو زيادة العمل مستقبلاً',
      priorNoTitle: 'لا تعامل مسار الحالات الخاصة كأنه مؤكد',
      priorNoBody: 'للمسار شروط انتقال خاصة. تحقق من تاريخ البدل الفعلي والمسار الحالي لدى Försäkringskassan بدلاً من افتراض أن بلوغ 30 عاماً وحده يمنح حقاً.',
      priorUnsureTitle: 'تأكد أولاً متى ينتهي بدل النشاط فعلياً',
      priorUnsureBody: 'راجع القرار أو Mina sidor وتأكد هل يمتد البدل حتى الشهر السابق لبلوغ 30 عاماً. هذه المعلومة قد تغيّر المسار التالي.',
      permanentTitle: 'قد يكون تعويض المرض طويل الأمد مساراً للفحص، لكنه ليس تلقائياً',
      permanentBody: 'تقيّم Försäkringskassan القدرة على العمل وليس التشخيص وحده. تحقق من الشروط والمستندات الحالية قبل انتهاء بدل النشاط؛ لا يتحول البدل تلقائياً إلى sjukersättning.',
      capacityUnsureTitle: 'وضّح القدرة على العمل مستقبلاً قبل اختيار مسار التعويض',
      capacityUnsureBody: 'الفرق بين انخفاض دائم وإمكانية زيادة العمل لاحقاً قد يغيّر المسار. تحقق من ذلك بمستند طبي حالي ومع Försäkringskassan.',
      sgiNoTitle: 'SGI المنخفض أو غير الموجود جزء محدد من مسار الحالات الخاصة',
      sgiNoBody: 'إذا لم يكن SGI منخفضاً أو مفقوداً فلا ينبغي للنسخة التجريبية أن تفترض أن sjukpenning i särskilda fall هو المسار الصحيح. تحقق من المسار الحالي المناسب.',
      sgiUnsureTitle: 'تحقق من وضع SGI قبل استخدام مسار الحالات الخاصة',
      sgiUnsureBody: 'يمكن لوضع SGI أن يغيّر المسار. تحقق من SGI الحالي ودع Försäkringskassan تقيّم المسار المناسب.',
      protectedYesTitle: 'مسار sjukpenning i särskilda fall يستحق التحقق الآن',
      protectedYesBody: 'ذكرت حقائق أولية تجعل المسار مناسباً للتحقق. القرار النهائي لدى Försäkringskassan وفق الشروط والوثائق الحالية.',
      protectedNoTitle: 'لا تفترض أن مسار الحالات الخاصة مفتوح',
      protectedNoBody: 'حماية الحق جزء من الشروط. الإجابة لا تعني عدم وجود أي دعم، لكنها تمنع النسخة التجريبية من ضمان هذا المسار.',
      protectedUnsureTitle: 'تحقق هل تم الحفاظ على الحق',
      protectedUnsureBody: 'تحقق مما إذا كان العمل أو التسجيل لدى Arbetsförmedlingen أو برنامج مناسب قد حافظ على الحق. لا تستنتج النسخة التجريبية ذلك من قصة قصيرة.',
      housingNote: 'إذا كان لديك bostadstillägg أو قلق بشأن السكن، فتحقق من دعم السكن بشكل منفصل بعد توضيح مسار التعويض الأساسي. bostadstillägg وboendetillägg ليسا المنفعة نفسها ولا يفترض استمرارهما تلقائياً.',
      sourceActivity: 'Försäkringskassan: بدل النشاط للشباب',
      sourceSickness: 'Försäkringskassan: sjukersättning',
      sourceSpecial: 'Försäkringskassan: sjukpenning i särskilda fall',
    },
    fa: {
      shellTitle: 'کمک‌هزینه فعالیت و ۳۰ سالگی – مسیر بعدی را بررسی کن',
      shellSub: 'تبدیل خودکار وجود ندارد؛ مسیر بعدی باید بررسی شود',
      eyebrow: 'کمک‌هزینه فعالیت ← ۳۰ سالگی',
      title: 'به مرز ۳۰ سالگی نزدیک می‌شوی. پیش از پایان کمک‌هزینه، مسیر بعدی را بررسی کن.',
      intro: 'این پایلوت مزایا را به جای تو انتخاب نمی‌کند و حق، مبلغ یا تصمیم را تضمین نمی‌کند. فقط پرسش‌هایی را می‌پرسیم که می‌توانند قدم امن بعدی را تغییر دهند.',
      qPrior: 'آیا کمک‌هزینه فعالیت تا پایان ماه قبل از ۳۰ سالگی ادامه داشته است؟',
      qCapacity: 'توانایی کار در آینده، در وضعیتی که باید ارزیابی شود، چگونه است؟',
      qSgi: 'اگر مسیر sjukpenning i särskilda fall بررسی شود: آیا SGI پایین است یا وجود ندارد؟',
      qProtected: 'آیا بعد از کمک‌هزینه، حق مربوط را مثلاً با کار، ثبت‌نام در Arbetsförmedlingen یا برنامه مرتبط حفظ کرده‌ای؟',
      yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      permanent: 'کاهش توانایی کار ممکن است در آینده هم پایدار باشد',
      future: 'شاید در آینده بتوانم کار کنم یا بیشتر کار کنم',
      priorNoTitle: 'مسیر موارد خاص را تأییدشده فرض نکن',
      priorNoBody: 'این مسیر شرایط انتقال مشخصی دارد. سابقه واقعی و مسیر جاری Försäkringskassan را بررسی کن و صرف ۳۰ سالگی را دلیل استحقاق ندان.',
      priorUnsureTitle: 'اول زمان واقعی پایان کمک‌هزینه را تأیید کن',
      priorUnsureBody: 'تصمیم یا Mina sidor را بررسی کن و ببین کمک‌هزینه تا ماه قبل از ۳۰ سالگی ادامه دارد یا نه. این واقعیت می‌تواند مسیر بعدی را عوض کند.',
      permanentTitle: 'ممکن است sjukersättning مسیری برای بررسی باشد، اما خودکار نیست',
      permanentBody: 'Försäkringskassan توانایی کار را ارزیابی می‌کند، نه فقط تشخیص را. شرایط و مدارک جاری را پیش از پایان کمک‌هزینه بررسی کن؛ aktivitetsersättning خودکار به sjukersättning تبدیل نمی‌شود.',
      capacityUnsureTitle: 'پیش از انتخاب مسیر، توانایی کار در آینده را روشن کن',
      capacityUnsureBody: 'تفاوت بین کاهش پایدار و امکان کار بیشتر در آینده می‌تواند مسیر را تغییر دهد. آن را با مدرک پزشکی جاری و Försäkringskassan بررسی کن.',
      sgiNoTitle: 'SGI پایین یا نبود SGI بخش مشخصی از مسیر موارد خاص است',
      sgiNoBody: 'اگر SGI پایین یا مفقود نباشد، پایلوت نباید مسیر sjukpenning i särskilda fall را به طور خودکار انتخاب کند. مسیر جاری مناسب را بررسی کن.',
      sgiUnsureTitle: 'پیش از استفاده از مسیر موارد خاص، وضعیت SGI را بررسی کن',
      sgiUnsureBody: 'وضعیت SGI می‌تواند مسیر را عوض کند. SGI جاری را بررسی کن و ارزیابی نهایی را به Försäkringskassan بسپار.',
      protectedYesTitle: 'مسیر sjukpenning i särskilda fall ارزش بررسی دارد',
      protectedYesBody: 'واقعیت‌های کلی گفته‌شده این مسیر را برای بررسی مطرح می‌کنند. Försäkringskassan بر اساس شرایط و مدارک جاری درباره حق تصمیم می‌گیرد.',
      protectedNoTitle: 'باز بودن مسیر موارد خاص را فرض نکن',
      protectedNoBody: 'حفظ حق بخشی از شرایط است. پاسخ منفی به معنای نبود همه حمایت‌ها نیست، اما پایلوت نباید این مسیر را تضمین کند.',
      protectedUnsureTitle: 'بررسی کن آیا حق حفظ شده است',
      protectedUnsureBody: 'بررسی کن آیا کار، ثبت‌نام در Arbetsförmedlingen یا برنامه مرتبط حق را حفظ کرده است. پایلوت این موضوع را از متن کوتاه حدس نمی‌زند.',
      housingNote: 'اگر bostadstillägg داری یا نگران مسکن هستی، پس از روشن شدن مسیر اصلی درآمد، حمایت مسکن را جداگانه بررسی کن. bostadstillägg وboendetillägg یک مزیت نیستند و نباید ادامه خودکارشان فرض شود.',
      sourceActivity: 'Försäkringskassan: کمک‌هزینه فعالیت جوانان',
      sourceSickness: 'Försäkringskassan: sjukersättning',
      sourceSpecial: 'Försäkringskassan: sjukpenning i särskilda fall',
    },
  };

  function normalize(text) {
    return String(text || '').normalize('NFKC').trim();
  }

  function detect(text) {
    const value = normalize(text);
    if (!value) return false;
    const benefit = BENEFIT_PATTERNS.some((pattern) => pattern.test(value));
    const age = AGE30_PATTERNS.some((pattern) => pattern.test(value));
    const ending = END_PATTERNS.some((pattern) => pattern.test(value));
    return benefit && age && (ending || /aktivitetsersättning|بدل\s+النشاط|کمک[‌\s-]*هزینه\s+فعالیت/i.test(value));
  }

  function safeLang(value) {
    return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv';
  }

  function handoffHref(language) {
    const lang = safeLang(language);
    return `person-pilot.html?actor_type=private_person&focus=activity_compensation_age30&lang=${encodeURIComponent(lang)}`;
  }

  function nextStep(state) {
    if (!state.prior) return 'q_prior';
    if (state.prior === 'no') return 'r_prior_no';
    if (state.prior === 'unsure') return 'r_prior_unsure';
    if (!state.capacity) return 'q_capacity';
    if (state.capacity === 'permanent') return 'r_permanent';
    if (state.capacity === 'unsure') return 'r_capacity_unsure';
    if (!state.sgi) return 'q_sgi';
    if (state.sgi === 'no') return 'r_sgi_no';
    if (state.sgi === 'unsure') return 'r_sgi_unsure';
    if (!state.protected) return 'q_protected';
    if (state.protected === 'yes') return 'r_protected_yes';
    if (state.protected === 'no') return 'r_protected_no';
    return 'r_protected_unsure';
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;

    const enhance = () => {
      if (!detect(input.value) || box.hidden) return;
      if (box.querySelector('[data-age30-transition-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.age30TransitionRoute = 'true';
      link.href = handoffHref(lang);
      const text = doc.createElement('span');
      const title = doc.createElement('strong');
      const sub = doc.createElement('small');
      title.textContent = copy.shellTitle;
      sub.textContent = copy.shellSub;
      text.append(title, sub);
      const arrow = doc.createElement('span');
      arrow.className = 'arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      link.append(text, arrow);
      const firstRoute = box.querySelector('a.route');
      box.insertBefore(link, firstRoute || null);
    };

    button.addEventListener('click', () => win.setTimeout(enhance, 0));
    input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') win.setTimeout(enhance, 0);
    });
  }

  function addLink(doc, parent, href, label) {
    const link = doc.createElement('a');
    link.className = 'source';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    parent.appendChild(link);
  }

  function addPersonGuidance(win) {
    const doc = win.document;
    const params = new URLSearchParams(win.location.search);
    if (String(params.get('focus') || '').toLowerCase() !== 'activity_compensation_age30') return;
    if (doc.getElementById('age30TransitionGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;

    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const section = doc.createElement('section');
    section.id = 'age30TransitionGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'age30TransitionTitle');
    main.parentNode.insertBefore(section, main);

    const state = { prior: null, capacity: null, sgi: null, protected: null };

    function choice(label, value, field) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.dataset.value = value;
      el.setAttribute('aria-pressed', String(state[field] === value));
      el.addEventListener('click', () => {
        state[field] = value;
        if (field === 'prior') { state.capacity = null; state.sgi = null; state.protected = null; }
        if (field === 'capacity') { state.sgi = null; state.protected = null; }
        if (field === 'sgi') state.protected = null;
        render();
      });
      return el;
    }

    function group(question, field, options) {
      const title = doc.createElement('h3');
      title.textContent = question;
      const wrap = doc.createElement('div');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', question);
      options.forEach(([label, value]) => wrap.appendChild(choice(label, value, field)));
      section.append(title, wrap);
    }

    function result(titleText, bodyText, sources) {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = titleText;
      const body = doc.createElement('p');
      body.textContent = bodyText;
      body.style.marginBottom = '8px';
      box.append(title, body);
      sources.forEach((source, index) => {
        if (index) box.appendChild(doc.createTextNode(' · '));
        addLink(doc, box, source[0], source[1]);
      });
      const housing = doc.createElement('p');
      housing.className = 'muted';
      housing.textContent = copy.housingNote;
      housing.style.marginBottom = '0';
      box.appendChild(housing);
      section.appendChild(box);
    }

    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = copy.eyebrow;
      const title = doc.createElement('h2');
      title.id = 'age30TransitionTitle';
      title.textContent = copy.title;
      const intro = doc.createElement('p');
      intro.className = 'muted';
      intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);

      const step = nextStep(state);
      if (step === 'q_prior') return group(copy.qPrior, 'prior', [[copy.yes, 'yes'], [copy.no, 'no'], [copy.unsure, 'unsure']]);
      if (step === 'r_prior_no') return result(copy.priorNoTitle, copy.priorNoBody, [[ACTIVITY_URL, copy.sourceActivity], [SPECIAL_CASE_URL, copy.sourceSpecial]]);
      if (step === 'r_prior_unsure') return result(copy.priorUnsureTitle, copy.priorUnsureBody, [[ACTIVITY_URL, copy.sourceActivity]]);
      if (step === 'q_capacity') return group(copy.qCapacity, 'capacity', [[copy.permanent, 'permanent'], [copy.future, 'future'], [copy.unsure, 'unsure']]);
      if (step === 'r_permanent') return result(copy.permanentTitle, copy.permanentBody, [[SICKNESS_COMP_URL, copy.sourceSickness], [ACTIVITY_URL, copy.sourceActivity]]);
      if (step === 'r_capacity_unsure') return result(copy.capacityUnsureTitle, copy.capacityUnsureBody, [[SICKNESS_COMP_URL, copy.sourceSickness], [SPECIAL_CASE_URL, copy.sourceSpecial]]);
      if (step === 'q_sgi') return group(copy.qSgi, 'sgi', [[copy.yes, 'yes'], [copy.no, 'no'], [copy.unsure, 'unsure']]);
      if (step === 'r_sgi_no') return result(copy.sgiNoTitle, copy.sgiNoBody, [[SPECIAL_CASE_URL, copy.sourceSpecial]]);
      if (step === 'r_sgi_unsure') return result(copy.sgiUnsureTitle, copy.sgiUnsureBody, [[SPECIAL_CASE_URL, copy.sourceSpecial]]);
      if (step === 'q_protected') return group(copy.qProtected, 'protected', [[copy.yes, 'yes'], [copy.no, 'no'], [copy.unsure, 'unsure']]);
      if (step === 'r_protected_yes') return result(copy.protectedYesTitle, copy.protectedYesBody, [[SPECIAL_CASE_URL, copy.sourceSpecial]]);
      if (step === 'r_protected_no') return result(copy.protectedNoTitle, copy.protectedNoBody, [[SPECIAL_CASE_URL, copy.sourceSpecial]]);
      return result(copy.protectedUnsureTitle, copy.protectedUnsureBody, [[SPECIAL_CASE_URL, copy.sourceSpecial]]);
    }

    render();
  }

  function init(win) {
    addShellHandoff(win);
    addPersonGuidance(win);
  }

  return { detect, safeLang, handoffHref, nextStep, init };
});