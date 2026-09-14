(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODStudentFinanceGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Public, coarse handoff only. This is not an eligibility matcher and never
  // receives or infers a personal CSN balance. Material rules remain governed
  // by the shared truth/verification layer and current CSN primary sources.
  const WEEKS_URL = 'https://www.csn.se/fragor-och-svar/hur-manga-veckor-kan-jag-fa-studiemedel.html';
  const PACE_URL = 'https://www.csn.se/bidrag-och-lan/studiemedel/studietakt---heltid-eller-deltid.html';
  const SUMMER_URL = 'https://www.csn.se/bidrag-och-lan/studiemedel/sommarstudier-i-sverige-med-studiemedel.html';
  const LOGIN_URL = 'https://www.csn.se/logga-in.html';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const SUMMER_PATTERNS = [
    /(?:sommarkurs|sommarstud|studera\s+(?:i\s+)?sommar|läsa\s+(?:i\s+)?sommar).*(?:csn|studiemedel|studie)/i,
    /(?:csn|studiemedel).*(?:sommarkurs|sommarstud|sommaren)/i,
    /(?:inget|utan)\s+sommarjobb.*(?:sommarkurs|studera|csn)/i,
    /(?:دورة|دراسة|أدرس).*(?:صيف|الصيف).*(?:CSN|دعم\s*الدراسة|تمويل\s*الدراسة)/i,
    /(?:CSN|دعم\s*الدراسة).*(?:دورة|دراسة).*(?:صيف|الصيف)/i,
    /(?:دوره|تحصیل|درس).*(?:تابستان).*(?:CSN|کمک|حمایت)/i,
    /(?:CSN|کمک.*تحصیل|حمایت.*تحصیل).*(?:دوره|تحصیل).*(?:تابستان)/i,
  ];

  const WEEK_PATTERNS = [
    /(?:csn|studiemedel).*(?:veck|kvar|använd|deltid)/i,
    /(?:veck|kvar|använd|deltid).*(?:csn|studiemedel)/i,
    /hur\s+många\s+(?:csn[- ]?)?veckor.*kvar/i,
    /(?:CSN|دعم\s*الدراسة|تمويل\s*الدراسة).*(?:أسبوع|أسابيع|بقي|متبق)/i,
    /(?:أسبوع|أسابيع|بقي|متبق).*(?:CSN|دعم\s*الدراسة)/i,
    /(?:CSN|کمک.*تحصیل|حمایت.*تحصیل).*(?:هفته|باقی|مانده)/i,
    /(?:هفته|باقی|مانده).*(?:CSN|کمک.*تحصیل|حمایت.*تحصیل)/i,
  ];

  const COPY = {
    sv: {
      shellWeeksTitle: 'CSN-veckor – kontrollera vad du har kvar',
      shellWeeksSub: 'Utbildningsnivå och studietakt först, personligt saldo på Mina sidor',
      shellSummerTitle: 'Sommarkurs och CSN – kontrollera rätt väg',
      shellSummerSub: 'Få frågor om upplägget, sedan aktuell CSN-källa och Mina sidor',
      eyebrow: 'Studier → studiemedel',
      weeksTitle: 'Planerar du fler studier och undrar hur CSN-veckorna räcker?',
      weeksIntro: 'Stödassistenten kan inte se eller räkna fram ditt personliga kvarvarande veckosaldo. Vi frågar bara efter grova fakta som ändrar hur vägen ska förklaras och skickar sedan saldokontrollen till CSN Mina sidor.',
      qLevel: 'Vilken utbildningsnivå gäller frågan?',
      higher: 'Eftergymnasial / högskola',
      upper: 'Gymnasienivå / komvux',
      basic: 'Grundskolenivå',
      unsure: 'Jag vet inte ännu',
      qPlan: 'Vilken studietakt planerar du för studieperioden?',
      full: '100 procent',
      p75: '75 procent',
      p50: '50 procent',
      weeksResultTitle: 'Kontrollera ditt faktiska saldo på Mina sidor innan du planerar perioden',
      weeksResultBody: 'Utbildningsnivå och studietakt påverkar hur studiemedelsveckor räknas. Ditt personliga antal använda och kvarvarande veckor finns hos CSN, inte i Stödassistenten. Använd aktuell CSN-vägledning för att förstå hur den planerade studietakten påverkar veckorna.',
      summerTitle: 'Vill du finansiera sommarstudier med studiemedel?',
      summerIntro: 'Antagning till en kurs är inte samma sak som ett beslut om studiemedel. Vi kontrollerar bara de få kurs- och registreringsfakta som kan ändra nästa steg och lämnar beslutet till CSN.',
      qSummerType: 'Vad gäller sommarstudierna?',
      university: 'Högskola / universitet',
      otherStudy: 'Komvux eller annan utbildning',
      notDecided: 'Inte bestämt ännu',
      qSummerPace: 'Är den planerade studietakten minst 50 procent i minst tre sammanhängande veckor?',
      yes: 'Ja',
      no: 'Nej',
      qRegistration: 'Är du registrerad på kursen och, för högskola, har skolan rapporterat den som sommarkurs till CSN?',
      summerNoTitle: 'Kontrollera upplägget mot CSN innan du planerar studiemedel',
      summerNoBody: 'Den aktuella CSN-vägen för sommarstudier behöver uppfyllas för den faktiska kursen och studieperioden. Ett nej eller en osäker uppgift här är därför en signal att verifiera upplägget – inte ett generellt beslut om att stöd saknas.',
      summerCheckTitle: 'Sommarstudierna är värda att kontrollera vidare hos CSN',
      summerCheckBody: 'Dina grova svar passar den aktuella kontrollvägen, men Stödassistenten lovar inte rätt, belopp eller längd. Kontrollera kursen, registreringen och ditt personliga veckosaldo hos CSN innan du planerar finansieringen. Sommarveckor med studiemedel påverkar ditt kvarvarande veckosaldo.',
      weeksSource: 'CSN: antal veckor med studiemedel',
      paceSource: 'CSN: studietakt',
      summerSource: 'CSN: sommarstudier i Sverige',
      loginSource: 'CSN: logga in till Mina sidor',
      privacy: 'Vi lägger inte personligt CSN-saldo, kursregistrering, studieresultat, exakt inkomst, identitet eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida',
      fbTitle: 'Hjälp oss förbättra den här vägen',
      fbNew: 'Fick du reda på något nytt?',
      fbUseful: 'Var hjälpen användbar?',
      fbClear: 'Var nästa steg tydligt?',
      send: 'Skicka anonym feedback',
      sent: 'Tack! Endast strukturerad produktfeedback skickades.',
      sendError: 'Feedbacken kunde inte skickas just nu.',
    },
    ar: {
      shellWeeksTitle: 'أسابيع CSN – تحقق مما تبقى لك',
      shellWeeksSub: 'مستوى الدراسة والوتيرة أولاً، والرصيد الشخصي في Mina sidor',
      shellSummerTitle: 'دورة صيفية وCSN – تحقق من المسار الصحيح',
      shellSummerSub: 'أسئلة قليلة عن الدراسة ثم مصدر CSN الحالي وMina sidor',
      eyebrow: 'الدراسة ← التمويل الدراسي',
      weeksTitle: 'هل تخطط لمزيد من الدراسة وتتساءل عن أسابيع CSN المتبقية؟',
      weeksIntro: 'لا يستطيع Stödassistenten رؤية أو استنتاج رصيدك الشخصي من الأسابيع. نسأل فقط عن معلومات عامة تغيّر التوجيه ثم نحيل فحص الرصيد إلى CSN Mina sidor.',
      qLevel: 'ما مستوى الدراسة الذي يتعلق به السؤال؟',
      higher: 'جامعة / تعليم بعد الثانوي', upper: 'ثانوي / komvux', basic: 'مستوى أساسي', unsure: 'لا أعرف بعد',
      qPlan: 'ما وتيرة الدراسة المخطط لها خلال الفترة؟', full: '100 بالمئة', p75: '75 بالمئة', p50: '50 بالمئة',
      weeksResultTitle: 'تحقق من رصيدك الفعلي في Mina sidor قبل التخطيط',
      weeksResultBody: 'مستوى الدراسة ووتيرتها يؤثران في كيفية احتساب أسابيع studiemedel. عدد الأسابيع المستخدمة والمتبقية شخصي وموجود لدى CSN، وليس لدى Stödassistenten. استخدم إرشادات CSN الحالية لفهم أثر وتيرة الدراسة.',
      summerTitle: 'هل تريد تمويل الدراسة الصيفية عبر studiemedel؟',
      summerIntro: 'القبول في دورة ليس قراراً بمنح studiemedel. نتحقق فقط من معلومات عامة عن الدورة والتسجيل يمكن أن تغيّر الخطوة التالية، والقرار يبقى لدى CSN.',
      qSummerType: 'ما نوع الدراسة الصيفية؟', university: 'جامعة / كلية', otherStudy: 'Komvux أو تعليم آخر', notDecided: 'لم أحدد بعد',
      qSummerPace: 'هل الدراسة المخطط لها 50 بالمئة على الأقل لمدة ثلاثة أسابيع متصلة على الأقل؟', yes: 'نعم', no: 'لا',
      qRegistration: 'هل أنت مسجل في الدورة، وللدراسة الجامعية: هل أبلغت المؤسسة CSN بأنها دورة صيفية؟',
      summerNoTitle: 'تحقق من ترتيب الدراسة لدى CSN قبل التخطيط للتمويل',
      summerNoBody: 'يجب التحقق من مسار CSN الحالي للدورة والفترة الفعلية. الإجابة بالنفي أو عدم التأكد هنا تعني أن الترتيب يحتاج إلى تحقق، وليست قراراً عاماً بعدم وجود دعم.',
      summerCheckTitle: 'يستحق مسار الدراسة الصيفية المتابعة لدى CSN',
      summerCheckBody: 'إجاباتك العامة تناسب مسار التحقق، لكن Stödassistenten لا يضمن الاستحقاق أو المبلغ أو المدة. تحقق من الدورة والتسجيل ورصيد الأسابيع الشخصي لدى CSN قبل التخطيط. أسابيع الصيف التي تحصل فيها على studiemedel تؤثر في رصيد الأسابيع.',
      weeksSource: 'CSN: عدد أسابيع studiemedel', paceSource: 'CSN: وتيرة الدراسة', summerSource: 'CSN: الدراسة الصيفية في السويد', loginSource: 'CSN: تسجيل الدخول إلى Mina sidor',
      privacy: 'لا نضع رصيد CSN الشخصي أو تسجيل الدورة أو النتائج أو الدخل الدقيق أو الهوية أو قصتك في الرابط أو الملاحظات.',
      home: 'إلى الصفحة الرئيسية لـ Stödassistenten',
      fbTitle: 'ساعدنا على تحسين هذا المسار', fbNew: 'هل عرفت شيئاً جديداً؟', fbUseful: 'هل كانت المساعدة مفيدة؟', fbClear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أُرسلت ملاحظات منتج منظمة فقط.', sendError: 'تعذر إرسال الملاحظات الآن.',
    },
    fa: {
      shellWeeksTitle: 'هفته‌های CSN – مانده واقعی را بررسی کن',
      shellWeeksSub: 'اول سطح و سرعت تحصیل، مانده شخصی در Mina sidor',
      shellSummerTitle: 'دوره تابستانی و CSN – مسیر درست را بررسی کن',
      shellSummerSub: 'چند سؤال کلی، سپس منبع جاری CSN و Mina sidor',
      eyebrow: 'تحصیل ← کمک‌هزینه تحصیلی',
      weeksTitle: 'برای ادامه تحصیل برنامه داری و می‌خواهی بدانی هفته‌های CSN چقدر باقی مانده؟',
      weeksIntro: 'Stödassistenten نمی‌تواند مانده شخصی هفته‌های تو را ببیند یا حدس بزند. فقط اطلاعات کلی مؤثر بر مسیر را می‌پرسیم و بررسی مانده را به CSN Mina sidor می‌سپاریم.',
      qLevel: 'سؤال مربوط به کدام سطح تحصیل است؟', higher: 'دانشگاه / پس از دبیرستان', upper: 'دبیرستان / komvux', basic: 'سطح پایه', unsure: 'هنوز نمی‌دانم',
      qPlan: 'برای دوره موردنظر با چه سرعتی درس می‌خوانی؟', full: '100 درصد', p75: '75 درصد', p50: '50 درصد',
      weeksResultTitle: 'پیش از برنامه‌ریزی، مانده واقعی را در Mina sidor بررسی کن',
      weeksResultBody: 'سطح و سرعت تحصیل بر نحوه محاسبه هفته‌های studiemedel اثر می‌گذارد. تعداد شخصی هفته‌های استفاده‌شده و باقی‌مانده نزد CSN است، نه Stödassistenten. برای اثر سرعت تحصیل از راهنمای جاری CSN استفاده کن.',
      summerTitle: 'می‌خواهی برای تحصیل تابستانی studiemedel بگیری؟',
      summerIntro: 'پذیرفته‌شدن در یک دوره به معنی تصمیم درباره studiemedel نیست. فقط چند واقعیت کلی درباره دوره و ثبت‌نام را بررسی می‌کنیم که می‌تواند قدم بعدی را عوض کند؛ تصمیم با CSN است.',
      qSummerType: 'تحصیل تابستانی از چه نوع است؟', university: 'دانشگاه', otherStudy: 'Komvux یا آموزش دیگر', notDecided: 'هنوز مشخص نیست',
      qSummerPace: 'آیا برنامه تحصیل حداقل 50 درصد برای دست‌کم سه هفته پیوسته است؟', yes: 'بله', no: 'خیر',
      qRegistration: 'آیا در دوره ثبت‌نام شده‌ای و، برای دانشگاه، آیا مرکز آموزشی آن را به عنوان دوره تابستانی به CSN گزارش کرده است؟',
      summerNoTitle: 'پیش از برنامه‌ریزی مالی، شیوه تحصیل را با CSN بررسی کن',
      summerNoBody: 'مسیر جاری CSN باید برای دوره و بازه واقعی بررسی شود. پاسخ منفی یا نامطمئن در اینجا فقط یعنی لازم است شرایط را بررسی کنی، نه اینکه به طور کلی حمایتی وجود ندارد.',
      summerCheckTitle: 'مسیر تحصیل تابستانی ارزش بررسی بیشتر نزد CSN را دارد',
      summerCheckBody: 'پاسخ‌های کلی تو با مسیر بررسی سازگار است، اما Stödassistenten حق، مبلغ یا مدت را تضمین نمی‌کند. پیش از برنامه‌ریزی، دوره، ثبت‌نام و مانده شخصی هفته‌ها را نزد CSN بررسی کن. هفته‌های تابستانی دارای studiemedel بر مانده هفته‌ها اثر می‌گذارد.',
      weeksSource: 'CSN: تعداد هفته‌های studiemedel', paceSource: 'CSN: سرعت تحصیل', summerSource: 'CSN: تحصیل تابستانی در سوئد', loginSource: 'CSN: ورود به Mina sidor',
      privacy: 'مانده شخصی CSN، ثبت‌نام دوره، نتایج، درآمد دقیق، هویت یا داستان تو را در نشانی یا بازخورد قرار نمی‌دهیم.',
      home: 'بازگشت به صفحه اصلی Stödassistenten',
      fbTitle: 'به بهتر شدن این مسیر کمک کن', fbNew: 'چیز جدیدی یاد گرفتی؟', fbUseful: 'کمک برایت مفید بود؟', fbClear: 'قدم بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'ممنون! فقط بازخورد ساختاری محصول ارسال شد.', sendError: 'فعلاً ارسال بازخورد ممکن نیست.',
    },
  };

  function safeLang(value) {
    return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv';
  }

  function normalize(value) {
    return String(value || '').normalize('NFKC').trim();
  }

  function detectTopic(text) {
    const value = normalize(text);
    if (!value) return null;
    if (SUMMER_PATTERNS.some((pattern) => pattern.test(value))) return 'summer';
    if (WEEK_PATTERNS.some((pattern) => pattern.test(value))) return 'weeks';
    return null;
  }

  function handoffHref(language, topic) {
    const lang = safeLang(language);
    const safeTopic = topic === 'summer' ? 'summer' : 'weeks';
    return `person-pilot.html?actor_type=student&focus=student_csn&topic=${safeTopic}&lang=${encodeURIComponent(lang)}`;
  }

  function pageLang(win) {
    const params = new URLSearchParams(win.location.search);
    return safeLang(params.get('lang') || win.document.documentElement.lang);
  }

  function rootHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden) return false;
    const topic = detectTopic(input.value);
    if (!topic) return false;
    if (box.querySelector('[data-student-csn-route="true"]')) return true;
    const lang = pageLang(win);
    const copy = COPY[lang];
    const route = doc.createElement('a');
    route.className = 'route';
    route.dataset.studentCsnRoute = 'true';
    route.href = handoffHref(lang, topic);
    const left = doc.createElement('span');
    const strong = doc.createElement('strong');
    const small = doc.createElement('small');
    strong.textContent = topic === 'summer' ? copy.shellSummerTitle : copy.shellWeeksTitle;
    small.textContent = topic === 'summer' ? copy.shellSummerSub : copy.shellWeeksSub;
    left.append(strong, small);
    const arrow = doc.createElement('span');
    arrow.className = 'arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    route.append(left, arrow);
    box.insertBefore(route, box.querySelector('a.route') || null);
    return true;
  }

  function hookRoot(win) {
    const button = win.document.getElementById('analyzeBtn');
    const input = win.document.getElementById('situation');
    if (!button || !input) return;
    button.addEventListener('click', () => win.setTimeout(() => rootHandoff(win), 0));
    input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') win.setTimeout(() => rootHandoff(win), 0);
    });
  }

  function nextWeeks(state) {
    if (!state.level) return 'ask_level';
    if (!state.pace) return 'ask_pace';
    return 'show_weeks_next_action';
  }

  function nextSummer(state) {
    if (!state.studyType) return 'ask_study_type';
    if (!state.minimum) return 'ask_minimum';
    if (state.minimum === 'no') return 'verify_summer_setup';
    if (!state.registration) return 'ask_registration';
    if (state.registration !== 'yes') return 'verify_summer_setup';
    return 'show_summer_next_action';
  }

  function focusedApp(win) {
    const doc = win.document;
    const main = doc.getElementById('main');
    if (!main) return;
    const params = new URLSearchParams(win.location.search);
    let lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const topic = params.get('topic') === 'summer' ? 'summer' : 'weeks';
    const state = { level: null, pace: null, studyType: null, minimum: null, registration: null };
    const feedback = {};

    function copy() { return COPY[lang]; }
    function setDir() {
      doc.documentElement.lang = lang;
      doc.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl';
      doc.body.classList.toggle('rtl', lang !== 'sv');
      const logo = doc.getElementById('logo');
      const pilot = doc.getElementById('pilot');
      if (logo) logo.textContent = lang === 'sv' ? '🧭 Stödassistenten' : lang === 'ar' ? '🧭 مساعد الدعم' : '🧭 دستیار حمایت';
      if (pilot) pilot.textContent = lang === 'sv' ? 'Studentpilot' : lang === 'ar' ? 'تجربة طالب' : 'پایلوت دانشجو';
    }
    function updateLang(next) {
      lang = safeLang(next);
      const url = new URL(win.location.href);
      url.searchParams.set('lang', lang);
      win.history.replaceState(null, '', url);
      setDir();
      render();
    }
    function button(label, value, key) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.setAttribute('aria-pressed', String(state[key] === value));
      el.addEventListener('click', () => { state[key] = value; render(); });
      return el;
    }
    function link(parent, href, label) {
      const a = doc.createElement('a');
      a.className = 'source';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.href = href;
      a.textContent = `↗ ${label}`;
      parent.appendChild(a);
    }
    function linksRow(items) {
      const box = doc.createElement('div');
      box.className = 'info';
      items.forEach((item, index) => {
        if (index) box.appendChild(doc.createTextNode(' · '));
        link(box, item[0], item[1]);
      });
      return box;
    }
    function question(titleText, options) {
      const h = doc.createElement('h3');
      h.textContent = titleText;
      h.style.marginTop = '16px';
      const group = doc.createElement('div');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', titleText);
      options.forEach((item) => group.appendChild(button(item[0], item[1], item[2])));
      return [h, group];
    }
    function result(titleText, bodyText, items) {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const h = doc.createElement('strong'); h.textContent = titleText;
      const p = doc.createElement('p'); p.textContent = bodyText; p.style.marginBottom = '8px';
      box.append(h, p, linksRow(items));
      return box;
    }
    function languageButtons(section) {
      const langs = doc.createElement('div');
      langs.className = 'langs';
      [['sv','Svenska'],['ar','العربية'],['fa','فارسی']].forEach(([value,label]) => {
        const b = doc.createElement('button');
        b.type = 'button'; b.className = `lang ${lang === value ? 'active' : ''}`; b.textContent = label;
        b.addEventListener('click', () => updateLang(value)); langs.appendChild(b);
      });
      section.appendChild(langs);
    }
    function feedbackBlock(section) {
      const c = copy();
      const wrap = doc.createElement('div'); wrap.className = 'finalq';
      const h = doc.createElement('b'); h.textContent = c.fbTitle; wrap.appendChild(h);
      [['learned_new',c.fbNew],['useful',c.fbUseful],['next_step_clear',c.fbClear]].forEach(([key,label]) => {
        const row = doc.createElement('div'); row.style.marginTop = '9px';
        const text = doc.createElement('small'); text.textContent = label; row.appendChild(text);
        const buttons = doc.createElement('div'); buttons.className = 'fbs';
        [[true,c.yes],[false,c.no]].forEach(([value,name]) => {
          const b = doc.createElement('button'); b.type = 'button'; b.className = `fb ${feedback[key] === value ? 'selected' : ''}`; b.textContent = name;
          b.addEventListener('click', () => { feedback[key] = value; render(); }); buttons.appendChild(b);
        });
        row.appendChild(buttons); wrap.appendChild(row);
      });
      const send = doc.createElement('button'); send.type = 'button'; send.className = 'btn primary share'; send.textContent = c.send;
      const status = doc.createElement('div'); status.id = 'studentCsnFeedbackStatus';
      send.addEventListener('click', async () => {
        if (!['learned_new','useful','next_step_clear'].every((key) => typeof feedback[key] === 'boolean')) { status.textContent = c.sendError; status.className = 'status err'; return; }
        send.disabled = true;
        try {
          const res = await win.fetch(FEEDBACK_URL, {
            method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_version:'0.5.0', language:lang, flow:'student_csn', learned_new:feedback.learned_new, useful:feedback.useful, next_step_clear:feedback.next_step_clear, ratings:{ route:'student_csn', topic } }),
          });
          if (!res.ok) throw new Error('feedback');
          status.textContent = c.sent; status.className = 'status ok';
        } catch (_) { status.textContent = c.sendError; status.className = 'status err'; send.disabled = false; }
      });
      wrap.append(send, status); section.appendChild(wrap);
    }

    function render() {
      const c = copy();
      main.replaceChildren();
      const section = doc.createElement('section'); section.className = 'card hero';
      const eyebrow = doc.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = c.eyebrow;
      const h = doc.createElement('h1'); h.textContent = topic === 'summer' ? c.summerTitle : c.weeksTitle;
      const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = topic === 'summer' ? c.summerIntro : c.weeksIntro;
      section.append(eyebrow, h, intro); languageButtons(section);
      const privacy = doc.createElement('div'); privacy.className = 'privacy'; privacy.textContent = `🔒 ${c.privacy}`; section.appendChild(privacy);

      if (topic === 'weeks') {
        const step = nextWeeks(state);
        if (step === 'ask_level') {
          const parts = question(c.qLevel, [[c.higher,'higher','level'],[c.upper,'upper','level'],[c.basic,'basic','level'],[c.unsure,'unsure','level']]); section.append(...parts);
        } else {
          const parts1 = question(c.qLevel, [[c.higher,'higher','level'],[c.upper,'upper','level'],[c.basic,'basic','level'],[c.unsure,'unsure','level']]); section.append(...parts1);
          const parts2 = question(c.qPlan, [[c.full,'100','pace'],[c.p75,'75','pace'],[c.p50,'50','pace'],[c.unsure,'unsure','pace']]); section.append(...parts2);
          if (step === 'show_weeks_next_action') {
            section.appendChild(result(c.weeksResultTitle, c.weeksResultBody, [[WEEKS_URL,c.weeksSource],[PACE_URL,c.paceSource],[LOGIN_URL,c.loginSource]]));
            feedbackBlock(section);
          }
        }
      } else {
        const step = nextSummer(state);
        const parts1 = question(c.qSummerType, [[c.university,'university','studyType'],[c.otherStudy,'other','studyType'],[c.notDecided,'unsure','studyType']]); section.append(...parts1);
        if (state.studyType) {
          const parts2 = question(c.qSummerPace, [[c.yes,'yes','minimum'],[c.no,'no','minimum'],[c.unsure,'unsure','minimum']]); section.append(...parts2);
        }
        if (state.minimum && state.minimum !== 'no') {
          const parts3 = question(c.qRegistration, [[c.yes,'yes','registration'],[c.no,'no','registration'],[c.unsure,'unsure','registration']]); section.append(...parts3);
        }
        if (step === 'verify_summer_setup') {
          section.appendChild(result(c.summerNoTitle, c.summerNoBody, [[SUMMER_URL,c.summerSource],[LOGIN_URL,c.loginSource]])); feedbackBlock(section);
        }
        if (step === 'show_summer_next_action') {
          section.appendChild(result(c.summerCheckTitle, c.summerCheckBody, [[SUMMER_URL,c.summerSource],[WEEKS_URL,c.weeksSource],[LOGIN_URL,c.loginSource]])); feedbackBlock(section);
        }
      }

      const home = doc.createElement('a'); home.className = 'source'; home.href = `index.html?lang=${encodeURIComponent(lang)}`; home.textContent = `← ${c.home}`; section.appendChild(home);
      main.appendChild(section);
    }

    setDir();
    render();
  }

  function hookPerson(win) {
    const params = new URLSearchParams(win.location.search);
    if (String(params.get('focus') || '').toLowerCase() !== 'student_csn') return;
    focusedApp(win);
  }

  function init(win) {
    const path = (win.location.pathname || '').split('/').pop();
    if (!path || path === 'index.html') hookRoot(win);
    if (path === 'person-pilot.html') hookPerson(win);
  }

  return { init, detectTopic, handoffHref, nextWeeks, nextSummer, safeLang };
});
