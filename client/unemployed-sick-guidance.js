(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODUnemployedSickGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product public guidance only. This module disambiguates the first-day
  // sickness route for jobseekers versus Arbetsförmedlingen programme participants.
  // It never decides sickness-benefit eligibility, SGI, amount or medical status.
  const FK_JOBSEEKER_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukskriven-nar-du-ar-arbetssokande';
  const AF_PROGRAM_URL = 'https://arbetsformedlingen.se/for-arbetssokande/extra-stod/nar-du-deltar-i-ett-program/anmal-franvaro-nar-du-blir-sjuk-och-deltar-i-ett-program';
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
      shellTitle: 'Arbetssökande och sjuk – hitta rätt första steg',
      shellSub: 'En avgörande fråga först: deltar du i ett program hos Arbetsförmedlingen?',
      eyebrow: 'Arbetssökande → sjukfrånvaro',
      title: 'Vem ska du sjukanmäla dig till?',
      intro: 'Stödassistenten skiljer på vanlig arbetssökande och deltagare i Arbetsförmedlingens program. Vi avgör inte om du har rätt till sjukpenning eller annan ersättning.',
      qProgram: 'Deltar du just nu i ett program hos Arbetsförmedlingen med aktivitetsstöd, utvecklingsersättning eller etableringsersättning?',
      qFully: 'Är du helt arbetssökande utan en pågående anställning?',
      qActive: 'Var du inskriven hos Arbetsförmedlingen och aktivt arbetssökande fram till att du blev sjuk?',
      yes: 'Ja', no: 'Nej', unsure: 'Vet inte / behöver kontrollera',
      programTitle: 'Programdeltagare: anmäl sjukfrånvaro till Arbetsförmedlingen första dagen',
      programBody: 'För program med aktivitetsstöd, utvecklingsersättning eller etableringsersättning ska sjukfrånvaro anmälas till Arbetsförmedlingen första sjukdagen. Vid sjukdom längre än sju dagar krävs läkarintyg till Arbetsförmedlingen. Kontrollera alltid den aktuella primärkällan.',
      jobseekerTitle: 'Helt arbetssökande: börja hos Försäkringskassan',
      jobseekerBody: 'Försäkringskassan anger att den som är helt arbetssökande ska sjukanmäla sig dit första sjukdagen och därefter ansöka om sjukpenning. Läkarintyg behövs senast dag 8. Rätten prövas separat.',
      mixedTitle: 'Du verkar ha en blandad situation – kontrollera båda spåren',
      mixedBody: 'Om du är arbetssökande på deltid och samtidigt har en anställning anger Försäkringskassan att du också ska sjukanmäla dig till arbetsgivaren. Vi gissar inte hur ersättningarna samordnas.',
      verifyTitle: 'Kontrollera programstatus innan du väljer väg',
      verifyBody: 'Programstatus ändrar vem som ska få första anmälan. Stödassistenten väljer därför inte myndighet åt dig när den uppgiften är oklar.',
      activeVerifyTitle: 'Kontrollera inskrivning och aktivt arbetssökande',
      activeVerifyBody: 'Försäkringskassan anger särskilda villkor för sjukpenning i början av sjukperioden, bland annat kopplat till att vara inskriven och aktivt arbetssökande fram till sjukdomen. Vi avgör inte villkoret här.',
      sourceFk: 'Försäkringskassan: Sjukskriven när du är arbetssökande',
      sourceAf: 'Arbetsförmedlingen: sjuk i program',
      privacy: 'Vi skickar inte diagnos, läkarintyg, SGI, lön, arbetsgivare, personuppgifter eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida',
      feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'باحث عن عمل ومريض – اعثر على الخطوة الأولى الصحيحة', shellSub: 'سؤال حاسم أولاً: هل تشارك في برنامج لدى Arbetsförmedlingen؟',
      eyebrow: 'باحث عن عمل ← مرض', title: 'إلى من يجب أن تبلغ عن المرض؟',
      intro: 'يميز Stödassistenten بين الباحث العادي عن عمل والمشارك في برنامج لدى Arbetsförmedlingen. نحن لا نقرر استحقاق sjukpenning أو أي تعويض آخر.',
      qProgram: 'هل تشارك الآن في برنامج لدى Arbetsförmedlingen مع aktivitetsstöd أو utvecklingsersättning أو etableringsersättning؟', qFully: 'هل أنت باحث عن عمل بالكامل من دون وظيفة مستمرة؟', qActive: 'هل كنت مسجلاً لدى Arbetsförmedlingen وتبحث بنشاط عن عمل حتى بدأت فترة المرض؟',
      yes: 'نعم', no: 'لا', unsure: 'لا أعرف / أحتاج إلى التحقق',
      programTitle: 'مشارك في برنامج: أبلغ Arbetsförmedlingen في أول يوم مرض', programBody: 'عند المشاركة في برنامج مع التعويضات المذكورة يجب إبلاغ Arbetsförmedlingen في أول يوم مرض. إذا استمر المرض أكثر من سبعة أيام يلزم تقديم شهادة طبية إلى Arbetsförmedlingen. تحقق دائماً من المصدر الرسمي الحالي.',
      jobseekerTitle: 'باحث عن عمل بالكامل: ابدأ مع Försäkringskassan', jobseekerBody: 'توضح Försäkringskassan أن الباحث عن عمل بالكامل يبلغها في أول يوم مرض ثم يتقدم بطلب sjukpenning. يلزم تقرير طبي في موعد أقصاه اليوم الثامن. الاستحقاق يقيّم بشكل منفصل.',
      mixedTitle: 'لديك وضع مختلط – تحقق من المسارين', mixedBody: 'إذا كنت تبحث عن عمل بدوام جزئي ولديك وظيفة أيضاً، توضح Försäkringskassan أنك تبلغ صاحب العمل كذلك. لا نخمن طريقة تنسيق التعويضات.',
      verifyTitle: 'تحقق من وضع البرنامج قبل اختيار المسار', verifyBody: 'وضع البرنامج يغير الجهة التي تتلقى البلاغ الأول، لذلك لا يختار Stödassistenten جهة عندما تكون المعلومة غير واضحة.',
      activeVerifyTitle: 'تحقق من التسجيل والبحث النشط عن عمل', activeVerifyBody: 'لدى Försäkringskassan شروط منفصلة لـ sjukpenning في بداية فترة المرض مرتبطة بالتسجيل والبحث النشط عن عمل. نحن لا نقرر هذا الشرط هنا.',
      sourceFk: 'Försäkringskassan: المرض أثناء البحث عن عمل', sourceAf: 'Arbetsförmedlingen: المرض أثناء البرنامج', privacy: 'لا نرسل التشخيص أو الشهادة الطبية أو SGI أو الراتب أو صاحب العمل أو الهوية أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية لـ Stödassistenten',
      feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'جویای کار و بیمار – گام نخست درست را پیدا کنید', shellSub: 'اول یک سؤال تعیین‌کننده: آیا در برنامه Arbetsförmedlingen شرکت می‌کنید؟',
      eyebrow: 'جویای کار ← بیماری', title: 'بیماری را به کجا باید اعلام کنید؟',
      intro: 'Stödassistenten بین جویای کار عادی و شرکت‌کننده در برنامه Arbetsförmedlingen تفاوت می‌گذارد. ما استحقاق sjukpenning یا مزایای دیگر را تعیین نمی‌کنیم.',
      qProgram: 'آیا اکنون در برنامه Arbetsförmedlingen با aktivitetsstöd، utvecklingsersättning یا etableringsersättning شرکت می‌کنید؟', qFully: 'آیا کاملاً جویای کار هستید و استخدام فعالی ندارید؟', qActive: 'آیا تا زمان شروع بیماری در Arbetsförmedlingen ثبت‌نام و فعالانه جویای کار بودید؟',
      yes: 'بله', no: 'خیر', unsure: 'نمی‌دانم / باید بررسی کنم',
      programTitle: 'شرکت‌کننده در برنامه: روز اول بیماری به Arbetsförmedlingen اطلاع دهید', programBody: 'برای برنامه‌های دارای مزایای نام‌برده، غیبت ناشی از بیماری باید روز اول به Arbetsförmedlingen اعلام شود. اگر بیماری بیش از هفت روز ادامه دارد، گواهی پزشکی لازم است. منبع رسمی فعلی را بررسی کنید.',
      jobseekerTitle: 'جویای کار کامل: از Försäkringskassan شروع کنید', jobseekerBody: 'Försäkringskassan می‌گوید جویای کار کامل باید روز اول بیماری را به آنجا اعلام کند و سپس برای sjukpenning درخواست دهد. گواهی پزشکی حداکثر تا روز هشتم لازم است. استحقاق جداگانه بررسی می‌شود.',
      mixedTitle: 'وضعیت شما ترکیبی است – هر دو مسیر را بررسی کنید', mixedBody: 'اگر بخشی از وقت جویای کار و هم‌زمان شاغل هستید، Försäkringskassan می‌گوید باید به کارفرما نیز اعلام بیماری کنید. ما هماهنگی مزایا را حدس نمی‌زنیم.',
      verifyTitle: 'پیش از انتخاب مسیر وضعیت برنامه را بررسی کنید', verifyBody: 'وضعیت برنامه تعیین می‌کند نخستین اعلام بیماری به کدام نهاد برود. وقتی این موضوع روشن نیست Stödassistenten حدس نمی‌زند.',
      activeVerifyTitle: 'ثبت‌نام و جست‌وجوی فعال کار را بررسی کنید', activeVerifyBody: 'Försäkringskassan برای sjukpenning در آغاز بیماری شرایط جداگانه‌ای درباره ثبت‌نام و جست‌وجوی فعال کار دارد. ما این شرط را تعیین نمی‌کنیم.',
      sourceFk: 'Försäkringskassan: بیماری هنگام جست‌وجوی کار', sourceAf: 'Arbetsförmedlingen: بیماری در برنامه', privacy: 'تشخیص، گواهی پزشکی، SGI، حقوق، کارفرما، هویت یا داستان شما را در لینک یا بازخورد نمی‌فرستیم.', home: 'بازگشت به Stödassistenten',
      feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(lang) { return ['sv', 'ar', 'fa'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'sv'; }
  function detect(text) { return DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function handoffHref(lang) { return `person-pilot.html?actor_type=private_person&focus=unemployed_sick&lang=${encodeURIComponent(safeLang(lang))}`; }
  function nextStep(state) {
    if (!state.program) return 'ask_program';
    if (state.program === 'yes') return 'program_route';
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
    const state = { program: '', fullyUnemployed: '', activeUntilSick: '' };

    function option(name, value, label) { return `<label><input type="radio" name="${name}" value="${value}"> ${label}</label>`; }
    function question(name, text) { return `<fieldset data-question="${name}"><legend>${text}</legend>${option(name, 'yes', c.yes)} ${option(name, 'no', c.no)} ${option(name, 'unsure', c.unsure)}</fieldset>`; }
    function sources() { return `<p><a href="${FK_JOBSEEKER_URL}" target="_blank" rel="noopener">${c.sourceFk}</a><br><a href="${AF_PROGRAM_URL}" target="_blank" rel="noopener">${c.sourceAf}</a></p>`; }
    function result(title, body) { return `<section class="result-card"><h2>${title}</h2><p>${body}</p>${sources()}<p class="note">${c.privacy}</p></section>`; }

    function render() {
      const step = nextStep(state);
      let content = `<p class="eyebrow">${c.eyebrow}</p><h1>${c.title}</h1><p>${c.intro}</p>`;
      if (step === 'ask_program') content += question('program', c.qProgram);
      else if (step === 'ask_employment_context') content += question('fullyUnemployed', c.qFully);
      else if (step === 'ask_active_until_sick') content += question('activeUntilSick', c.qActive);
      else if (step === 'program_route') content += result(c.programTitle, c.programBody);
      else if (step === 'jobseeker_route') content += result(c.jobseekerTitle, c.jobseekerBody);
      else if (step === 'mixed_employment_route') content += result(c.mixedTitle, c.mixedBody);
      else if (step === 'verify_program_status' || step === 'verify_employment_context') content += result(c.verifyTitle, c.verifyBody);
      else content += result(c.activeVerifyTitle, c.activeVerifyBody);
      if (!step.startsWith('ask_')) content += feedbackMarkup(c);
      content += `<p><a href="index.html">${c.home}</a></p>`;
      main.innerHTML = `<div class="wrap" style="max-width:760px;margin:0 auto;padding:32px 20px">${content}</div>`;
      main.querySelectorAll('input[type="radio"]').forEach((el) => {
        if (['program', 'fullyUnemployed', 'activeUntilSick'].includes(el.name)) {
          el.addEventListener('change', function () { state[el.name] = el.value; render(); });
        }
      });
      const send = main.querySelector('[data-send-feedback]');
      if (send) send.addEventListener('click', async function () {
        const get = (name) => { const picked = main.querySelector(`input[name="${name}"]:checked`); return picked ? picked.value === 'yes' : null; };
        const payload = {
          app_version: 'v47', language: lang, flow: 'unemployed_sick',
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

  return { init, detect, handoffHref, nextStep, FK_JOBSEEKER_URL, AF_PROGRAM_URL };
});