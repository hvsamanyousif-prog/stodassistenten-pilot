(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODStudyTransition = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const AF_UNEMPLOYED_URL = 'https://arbetsformedlingen.se/for-arbetssokande/arbetslos---vad-hander-nu';
  const AF_AKASSA_URL = 'https://arbetsformedlingen.se/for-arbetssokande/arbetslos---vad-hander-nu/ersattning-fran-a-kassa';

  const COMPLETED_STUDY_PATTERNS = [
    /\bnyexaminerad\b/i,
    /\bnyutexaminerad\b/i,
    /\b(?:har\s+)?tagit\s+examen\b/i,
    /\b(?:jag\s+)?tog\s+examen\b/i,
    /\b(?:precis\s+)?avslutat\s+(?:min\s+|mina\s+)?(?:utbildning|studier)\b/i,
    /\b(?:klar|färdig)\s+med\s+(?:min\s+|mina\s+)?(?:utbildning|studier)\b/i,
    /تخرجت|تخرّجت|خريج\s+جديد|أنهيت\s+دراستي|انتهيت\s+من\s+الدراسة/i,
    /فارغ[‌\s-]?التحصیل|تازه\s+فارغ|تحصیلم\s+تمام\s+شده|درسم\s+تمام\s+شده/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Studierna är klara – hitta nästa väg',
      shellSub: 'Övergång till första jobb eller arbetslöshet',
      eyebrow: 'Studier → jobb',
      title: 'Studierna verkar vara klara. Vad händer direkt efter?',
      intro: 'Vi använder bara följdfrågor som kan ändra nästa handling. Den här publika piloten avgör inte rätt till a-kassa eller annan ersättning.',
      qJob: 'Har du ett jobb som börjar direkt efter studierna?',
      qWhen: 'När börjar perioden utan jobb?',
      yes: 'Ja',
      no: 'Nej',
      unsure: 'Osäker',
      today: 'Jag är arbetslös idag',
      later: 'Den börjar senare',
      jobYesTitle: 'Då är arbetslöshetsinskrivning inte första vägen',
      jobYesBody: 'Du har uppgett att ett jobb börjar direkt efter studierna. Om det ändras och du blir arbetslös kan du återvända till arbetslöshetsvägen. Piloten gör ingen bedömning av anställningen eller andra ersättningar.',
      jobUnsureTitle: 'Bekräfta först om och när jobbet börjar',
      jobUnsureBody: 'Startdatumet kan avgöra om och när du har en första arbetslös dag. Fastställ det innan du använder arbetslöshetsvägen.',
      todayTitle: 'Skriv in dig på Arbetsförmedlingen din första arbetslösa dag',
      todayBody: 'Arbetsförmedlingen anger att du ska skriva in dig den första dagen du är arbetslös. Det kan vara viktigt bland annat för när en a-kassa kan bedöma ersättning och för att skydda SGI. A-kassan avgör separat om du har rätt till ersättning.',
      laterTitle: 'Förbered nu – skicka inskrivningen första arbetslösa dagen',
      laterBody: 'Arbetsförmedlingen anger att uppgifter kan fyllas i i förväg, men att inskrivningen ska skickas in den första arbetslösa dagen. Om du vill söka a-kassa görs själva ersättningsansökan därefter hos a-kassan.',
      whenUnsureTitle: 'Fastställ din första arbetslösa dag innan du skickar in',
      whenUnsureBody: 'Ta reda på när studierna faktiskt slutar och om något jobb börjar direkt efter. Använd sedan Arbetsförmedlingens aktuella vägledning för rätt inskrivningsdag.',
      next: 'Nästa säkra steg',
      sourceAf: 'Arbetsförmedlingen: Arbetslös – vad händer nu?',
      sourceAkassa: 'Arbetsförmedlingen: ersättning från a-kassa',
    },
    ar: {
      shellTitle: 'انتهت الدراسة – ابحث عن الخطوة التالية',
      shellSub: 'الانتقال إلى أول وظيفة أو البطالة',
      eyebrow: 'الدراسة ← العمل',
      title: 'يبدو أن الدراسة انتهت. ماذا يحدث مباشرة بعدها؟',
      intro: 'نسأل فقط ما يمكن أن يغيّر الخطوة التالية. هذه النسخة التجريبية لا تقرر حقك في تعويض البطالة أو أي تعويض آخر.',
      qJob: 'هل لديك وظيفة تبدأ مباشرة بعد الدراسة؟',
      qWhen: 'متى تبدأ الفترة من دون عمل؟',
      yes: 'نعم',
      no: 'لا',
      unsure: 'غير متأكد',
      today: 'أنا عاطل عن العمل اليوم',
      later: 'ستبدأ لاحقاً',
      jobYesTitle: 'التسجيل كباحث عن عمل ليس المسار الأول الآن',
      jobYesBody: 'ذكرت أن وظيفة تبدأ مباشرة بعد الدراسة. إذا تغير ذلك وأصبحت عاطلاً عن العمل يمكنك الرجوع إلى مسار البطالة. النسخة التجريبية لا تقيم عقد العمل أو التعويضات الأخرى.',
      jobUnsureTitle: 'تأكد أولاً هل ستبدأ الوظيفة ومتى',
      jobUnsureBody: 'تاريخ البدء قد يحدد إن كان لديك يوم أول للبطالة ومتى. تأكد منه قبل استخدام مسار البطالة.',
      todayTitle: 'سجّل لدى Arbetsförmedlingen في أول يوم بطالة',
      todayBody: 'تذكر Arbetsförmedlingen أن التسجيل يجب أن يتم في أول يوم تكون فيه عاطلاً عن العمل. قد يكون ذلك مهماً لبدء تقييم a-kassa ولحماية SGI. صندوق البطالة هو الذي يقرر بشكل منفصل حقك في التعويض.',
      laterTitle: 'حضّر الآن – وأرسل التسجيل في أول يوم بطالة',
      laterBody: 'توضح Arbetsförmedlingen أنه يمكن تعبئة البيانات مسبقاً، لكن يجب إرسال التسجيل في أول يوم بطالة. إذا أردت تعويض a-kassa فتقدم بطلب التعويض بعد ذلك لدى صندوق البطالة.',
      whenUnsureTitle: 'حدد أول يوم بطالة قبل الإرسال',
      whenUnsureBody: 'حدد متى تنتهي الدراسة فعلياً وما إذا كانت وظيفة تبدأ مباشرة بعدها، ثم استخدم الإرشادات الحالية من Arbetsförmedlingen لتحديد يوم التسجيل.',
      next: 'الخطوة الآمنة التالية',
      sourceAf: 'Arbetsförmedlingen: ماذا يحدث عند البطالة؟',
      sourceAkassa: 'Arbetsförmedlingen: تعويض a-kassa',
    },
    fa: {
      shellTitle: 'تحصیل تمام شده – مسیر بعدی را پیدا کن',
      shellSub: 'گذار به اولین کار یا بیکاری',
      eyebrow: 'تحصیل ← کار',
      title: 'به نظر می‌رسد تحصیل تمام شده. بلافاصله بعد از آن چه می‌شود؟',
      intro: 'فقط پرسش‌هایی را می‌پرسیم که می‌توانند قدم بعدی را تغییر دهند. این پایلوت درباره حق دریافت بیمه بیکاری یا مزایای دیگر تصمیم نمی‌گیرد.',
      qJob: 'آیا کاری داری که بلافاصله بعد از تحصیل شروع شود؟',
      qWhen: 'دوره بدون کار چه زمانی شروع می‌شود؟',
      yes: 'بله',
      no: 'خیر',
      unsure: 'مطمئن نیستم',
      today: 'امروز بیکار هستم',
      later: 'بعداً شروع می‌شود',
      jobYesTitle: 'فعلاً ثبت‌نام بیکاری اولین مسیر نیست',
      jobYesBody: 'گفته‌ای که کاری بلافاصله بعد از تحصیل شروع می‌شود. اگر این وضعیت عوض شد و بیکار شدی می‌توانی به مسیر بیکاری برگردی. پایلوت درباره قرارداد کار یا مزایای دیگر تصمیم نمی‌گیرد.',
      jobUnsureTitle: 'اول روشن کن آیا کار شروع می‌شود و چه زمانی',
      jobUnsureBody: 'تاریخ شروع کار می‌تواند تعیین کند آیا و چه زمانی اولین روز بیکاری داری. قبل از استفاده از مسیر بیکاری آن را مشخص کن.',
      todayTitle: 'در اولین روز بیکاری در Arbetsförmedlingen ثبت‌نام کن',
      todayBody: 'Arbetsförmedlingen می‌گوید باید در اولین روزی که بیکار هستی ثبت‌نام کنی. این زمان می‌تواند برای بررسی a-kassa و حفظ SGI مهم باشد. خود صندوق بیکاری جداگانه درباره حق دریافت مزایا تصمیم می‌گیرد.',
      laterTitle: 'از حالا آماده کن – در اولین روز بیکاری ارسال کن',
      laterBody: 'طبق راهنمای Arbetsförmedlingen می‌توان اطلاعات را از قبل وارد کرد، اما ثبت‌نام باید در اولین روز بیکاری ارسال شود. اگر می‌خواهی a-kassa بگیری، درخواست مزایا بعد از آن نزد صندوق بیکاری انجام می‌شود.',
      whenUnsureTitle: 'پیش از ارسال، اولین روز بیکاری را مشخص کن',
      whenUnsureBody: 'مشخص کن تحصیل دقیقاً چه زمانی تمام می‌شود و آیا کاری بلافاصله بعد از آن شروع می‌شود. سپس از راهنمای جاری Arbetsförmedlingen برای روز درست ثبت‌نام استفاده کن.',
      next: 'قدم امن بعدی',
      sourceAf: 'Arbetsförmedlingen: وقتی بیکار می‌شوی چه می‌شود؟',
      sourceAkassa: 'Arbetsförmedlingen: مزایای a-kassa',
    },
  };

  function normalize(text) {
    return String(text || '').normalize('NFKC').trim();
  }

  function detect(text) {
    const value = normalize(text);
    return Boolean(value) && COMPLETED_STUDY_PATTERNS.some((pattern) => pattern.test(value));
  }

  function safeLang(value) {
    return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv';
  }

  function handoffHref(language) {
    const lang = safeLang(language);
    return `person-pilot.html?actor_type=student&focus=study_to_work&lang=${encodeURIComponent(lang)}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;

    const enhance = () => {
      if (!detect(input.value) || box.hidden) return;
      if (box.querySelector('[data-study-transition-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.studyTransitionRoute = 'true';
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

  function appendLink(doc, parent, href, label) {
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
    if (String(params.get('focus') || '').toLowerCase() !== 'study_to_work') return;
    if (doc.getElementById('studyTransitionGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;

    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const section = doc.createElement('section');
    section.id = 'studyTransitionGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'studyTransitionTitle');
    main.parentNode.insertBefore(section, main);

    const state = { job: null, timing: null };

    function button(label, value, group, handler) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.dataset.value = value;
      el.setAttribute('aria-pressed', String(state[group] === value));
      el.addEventListener('click', () => {
        state[group] = value;
        if (group === 'job') state.timing = null;
        handler();
      });
      return el;
    }

    function result(titleText, bodyText, includeAkassa) {
      const resultBox = doc.createElement('div');
      resultBox.className = 'notice';
      resultBox.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = titleText;
      const body = doc.createElement('p');
      body.textContent = bodyText;
      body.style.marginBottom = '8px';
      resultBox.append(title, body);
      appendLink(doc, resultBox, AF_UNEMPLOYED_URL, copy.sourceAf);
      if (includeAkassa) {
        resultBox.appendChild(doc.createTextNode(' · '));
        appendLink(doc, resultBox, AF_AKASSA_URL, copy.sourceAkassa);
      }
      return resultBox;
    }

    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = copy.eyebrow;
      const title = doc.createElement('h2');
      title.id = 'studyTransitionTitle';
      title.textContent = copy.title;
      const intro = doc.createElement('p');
      intro.className = 'muted';
      intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);

      const q1 = doc.createElement('h3');
      q1.textContent = copy.qJob;
      const g1 = doc.createElement('div');
      g1.setAttribute('role', 'group');
      g1.setAttribute('aria-label', copy.qJob);
      g1.append(
        button(copy.yes, 'yes', 'job', render),
        button(copy.no, 'no', 'job', render),
        button(copy.unsure, 'unsure', 'job', render),
      );
      section.append(q1, g1);

      if (state.job === 'yes') {
        section.append(result(copy.jobYesTitle, copy.jobYesBody, false));
        return;
      }
      if (state.job === 'unsure') {
        section.append(result(copy.jobUnsureTitle, copy.jobUnsureBody, false));
        return;
      }
      if (state.job !== 'no') return;

      const q2 = doc.createElement('h3');
      q2.textContent = copy.qWhen;
      q2.style.marginTop = '14px';
      const g2 = doc.createElement('div');
      g2.setAttribute('role', 'group');
      g2.setAttribute('aria-label', copy.qWhen);
      g2.append(
        button(copy.today, 'today', 'timing', render),
        button(copy.later, 'later', 'timing', render),
        button(copy.unsure, 'unsure', 'timing', render),
      );
      section.append(q2, g2);

      if (state.timing === 'today') section.append(result(copy.todayTitle, copy.todayBody, true));
      if (state.timing === 'later') section.append(result(copy.laterTitle, copy.laterBody, true));
      if (state.timing === 'unsure') section.append(result(copy.whenUnsureTitle, copy.whenUnsureBody, false));
    }

    render();
  }

  function init(win) {
    addShellHandoff(win);
    addPersonGuidance(win);
  }

  return { detect, safeLang, handoffHref, init };
});
