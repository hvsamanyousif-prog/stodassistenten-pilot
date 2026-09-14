(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODEmployeeSickGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product public guidance only. This route separates employee sickness
  // with ordinary employer sick pay from employment without sick pay, and keeps
  // ordinary part-time employment separate from partial sickness absence.
  // It never decides eligibility, SGI, diagnosis, amount or a medical percentage.
  const FK_EMPLOYEE_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukskriven-nar-du-ar-anstalld';
  const FK_NO_SICK_PAY_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukskriven-nar-du-ar-anstalld-utan-sjuklon';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const EXCLUSION_PATTERNS = [
    /arbetslös|arbetssökande|arbetsförmedlingen|aktivitetsstöd|utvecklingsersättning|etableringsersättning/i,
    /عاطل\s+عن\s+العمل|باحث\s+عن\s+عمل|مكتب\s+العمل/i,
    /بیکار|جویای\s+کار|اداره\s+کار/i,
  ];
  const DIRECT_PATTERNS = [
    /(?:jobbar|arbetar|anställd|anställning|timanställd|behovsanställd|deltid).*(?:sjuk|sjukskriv|sjukanmäl|sjuklön)/i,
    /(?:sjuk|sjukskriv|sjukanmäl|sjuklön).*(?:jobbar|arbetar|anställd|anställning|timanställd|behovsanställd|deltid)/i,
    /(?:أعمل|موظف|دوام\s+جزئي|عمل\s+جزئي).*(?:مريض|مرض|إجازة\s+مرضية)/i,
    /(?:مريض|مرض|إجازة\s+مرضية).*(?:أعمل|موظف|دوام\s+جزئي|عمل\s+جزئي)/i,
    /(?:کار\s*می.?کنم|شاغل|استخدام|پاره.?وقت).*(?:بیمار|بیماری|مرخصی\s+استعلاجی)/i,
    /(?:بیمار|بیماری|مرخصی\s+استعلاجی).*(?:کار\s*می.?کنم|شاغل|استخدام|پاره.?وقت)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Anställd och sjuk – skilj på rätt första väg',
      shellSub: 'Två fakta ändrar vägen: om arbetsgivaren betalar sjuklön och om deltid betyder deltidssjukskrivning.',
      eyebrow: 'Anställd → sjukfrånvaro',
      title: 'Vilken sjukfrånvaroväg gäller först?',
      intro: 'Stödassistenten skiljer på anställda med vanlig sjuklön, anställda utan sjuklön och deltidssjukskrivning. Vi avgör inte om du har rätt till sjukpenning, vilken nivå som gäller eller hur Försäkringskassan bedömer arbetsförmågan.',
      qSickPay: 'Betalar din arbetsgivare normalt sjuklön i början av sjukperioden?',
      qPartial: 'När du säger deltid: arbetar du en del av din vanliga arbetstid därför att du är sjukskriven på deltid?',
      yes: 'Ja', no: 'Nej', unsure: 'Vet inte / behöver kontrollera',
      withPayTitle: 'Sjuklön från arbetsgivaren: börja i arbetsgivarspåret',
      withPayBody: 'Försäkringskassan beskriver att anställda som har sjuklön normalt börjar med sjukanmälan till arbetsgivaren. Om sjukperioden går vidare till sjukpenning blir Försäkringskassans aktuella ansökningsväg relevant. Kontrollera alltid den aktuella primärkällan.',
      noPayTitle: 'Anställd utan sjuklön: kontrollera Försäkringskassans första-dag-väg',
      noPayBody: 'Försäkringskassan har en separat väg för anställda som inte får sjuklön från arbetsgivaren i början av sjukperioden, till exempel i vissa behovs- eller timanställningar. Där kan sjukanmälan till Försäkringskassan behöva göras från första sjukdagen. Vi avgör inte om just din anställning tillhör den gruppen.',
      partialTitle: 'Deltidssjukskrivning: skilj på vanlig deltid och minskad arbetstid på grund av sjukdom',
      partialBody: 'Om du arbetar deltid samtidigt som du har sjukpenning anger Försäkringskassan att arbetstidens förläggning ska stämmas av med både Försäkringskassan och arbetsgivaren. Att du brukar arbeta deltid betyder inte i sig att du är deltidssjukskriven eller har rätt till en viss ersättningsnivå.',
      verifyTitle: 'Kontrollera sjuklönen innan du väljer första väg',
      verifyBody: 'Om du inte vet om arbetsgivaren betalar sjuklön ska Stödassistenten inte gissa mottagare eller tidslinje. Kontrollera med arbetsgivaren och den aktuella Försäkringskassan-vägledningen.',
      partialVerifyTitle: 'Kontrollera vad deltiden betyder i just sjukperioden',
      partialVerifyBody: 'Vanlig deltidsanställning och deltidssjukskrivning är olika fakta. Stödassistenten räknar inte ut sjukskrivningsgrad från arbetstid eller fritext.',
      sourceEmployee: 'Försäkringskassan: Sjukskriven när du är anställd',
      sourceNoPay: 'Försäkringskassan: Anställd utan sjuklön',
      privacy: 'Vi skickar inte diagnos, läkarintyg, SGI, lön, arbetsgivare, schema, personuppgifter eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida',
      feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'موظف ومريض – ميّز المسار الأول الصحيح', shellSub: 'معلومتان تغيّران المسار: هل يدفع صاحب العمل sjuklön وهل الدوام الجزئي يعني إجازة مرضية جزئية.',
      eyebrow: 'موظف ← مرض', title: 'ما المسار الأول للغياب المرضي؟',
      intro: 'يميز Stödassistenten بين الموظف الذي يحصل على sjuklön، والموظف من دون sjuklön، والإجازة المرضية الجزئية. لا نقرر استحقاق sjukpenning أو النسبة أو التقييم الطبي.',
      qSickPay: 'هل يدفع صاحب العمل عادة sjuklön في بداية فترة المرض؟', qPartial: 'عندما تقول إنك تعمل جزئياً: هل تعمل جزءاً من وقتك المعتاد لأنك في إجازة مرضية جزئية؟',
      yes: 'نعم', no: 'لا', unsure: 'لا أعرف / أحتاج إلى التحقق',
      withPayTitle: 'مع sjuklön من صاحب العمل: ابدأ بمسار صاحب العمل', withPayBody: 'توضح Försäkringskassan أن الموظف الذي لديه sjuklön يبدأ عادة بإبلاغ صاحب العمل. إذا استمرت فترة المرض إلى مرحلة sjukpenning يصبح مسار Försäkringskassan الحالي ذا صلة. تحقق دائماً من المصدر الرسمي.',
      noPayTitle: 'موظف من دون sjuklön: تحقق من مسار Försäkringskassan من اليوم الأول', noPayBody: 'لدى Försäkringskassan مسار منفصل للموظف الذي لا يحصل على sjuklön في بداية المرض، ويمكن أن يشمل بعض عقود العمل حسب الحاجة أو بالساعة. قد يلزم الإبلاغ إلى Försäkringskassan من أول يوم. نحن لا نقرر أن عقدك ينتمي إلى هذه الفئة.',
      partialTitle: 'إجازة مرضية جزئية: افصل الدوام الجزئي العادي عن خفض العمل بسبب المرض', partialBody: 'إذا كنت تعمل جزئياً أثناء حصولك على sjukpenning، توضح Försäkringskassan أن توزيع وقت العمل يجب تنسيقه مع Försäkringskassan وصاحب العمل. العمل الجزئي المعتاد لا يثبت بحد ذاته إجازة مرضية جزئية أو نسبة تعويض.',
      verifyTitle: 'تحقق من sjuklön قبل اختيار المسار الأول', verifyBody: 'إذا لم تعرف هل يدفع صاحب العمل sjuklön فلن يخمن Stödassistenten الجهة أو الجدول الزمني. تحقق مع صاحب العمل والمصدر الحالي لدى Försäkringskassan.',
      partialVerifyTitle: 'تحقق مما يعنيه الدوام الجزئي خلال فترة المرض', partialVerifyBody: 'العمل الجزئي المعتاد والإجازة المرضية الجزئية حقيقتان مختلفتان. لا يحسب Stödassistenten نسبة المرض من ساعات العمل أو من النص الحر.',
      sourceEmployee: 'Försäkringskassan: المرض عندما تكون موظفاً', sourceNoPay: 'Försäkringskassan: موظف من دون sjuklön', privacy: 'لا نرسل التشخيص أو التقرير الطبي أو SGI أو الراتب أو صاحب العمل أو الجدول أو الهوية أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية لـ Stödassistenten',
      feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'شاغل و بیمار – مسیر نخست درست را جدا کنید', shellSub: 'دو نکته مسیر را عوض می‌کند: آیا کارفرما sjuklön می‌پردازد و آیا پاره‌وقت یعنی مرخصی استعلاجی پاره‌وقت.',
      eyebrow: 'شاغل ← بیماری', title: 'کدام مسیر غیبت بیماری اول مطرح است؟',
      intro: 'Stödassistenten بین کارمند دارای sjuklön، کارمند بدون sjuklön و مرخصی استعلاجی پاره‌وقت تفاوت می‌گذارد. ما استحقاق sjukpenning، درصد یا ارزیابی پزشکی را تعیین نمی‌کنیم.',
      qSickPay: 'آیا کارفرمای شما معمولاً در ابتدای دوره بیماری sjuklön می‌پردازد؟', qPartial: 'وقتی می‌گویید پاره‌وقت: آیا به علت مرخصی استعلاجی پاره‌وقت، بخشی از ساعات معمول خود را کار می‌کنید؟',
      yes: 'بله', no: 'خیر', unsure: 'نمی‌دانم / باید بررسی کنم',
      withPayTitle: 'با sjuklön کارفرما: از مسیر کارفرما شروع کنید', withPayBody: 'Försäkringskassan توضیح می‌دهد که کارمندی که sjuklön دارد معمولاً ابتدا بیماری را به کارفرما اعلام می‌کند. اگر دوره بیماری به مرحله sjukpenning برسد، مسیر فعلی Försäkringskassan مطرح می‌شود. همیشه منبع رسمی فعلی را بررسی کنید.',
      noPayTitle: 'کارمند بدون sjuklön: مسیر روز اول Försäkringskassan را بررسی کنید', noPayBody: 'Försäkringskassan برای کارمندی که در ابتدای بیماری از کارفرما sjuklön نمی‌گیرد مسیر جداگانه دارد و این می‌تواند برخی استخدام‌های ساعتی یا نیازمحور را شامل شود. ممکن است اعلام بیماری به Försäkringskassan از روز اول لازم باشد. ما تعیین نمی‌کنیم قرارداد شما در این گروه است.',
      partialTitle: 'مرخصی استعلاجی پاره‌وقت: پاره‌وقت عادی را از کاهش کار به علت بیماری جدا کنید', partialBody: 'اگر همزمان با sjukpenning پاره‌وقت کار می‌کنید، Försäkringskassan می‌گوید نحوه تقسیم ساعات کار باید با Försäkringskassan و کارفرما هماهنگ شود. پاره‌وقت بودن معمول شما به تنهایی مرخصی استعلاجی پاره‌وقت یا درصد خاصی از مزایا را ثابت نمی‌کند.',
      verifyTitle: 'پیش از انتخاب مسیر نخست sjuklön را بررسی کنید', verifyBody: 'اگر نمی‌دانید کارفرما sjuklön می‌پردازد، Stödassistenten گیرنده یا زمان‌بندی را حدس نمی‌زند. با کارفرما و راهنمای فعلی Försäkringskassan بررسی کنید.',
      partialVerifyTitle: 'بررسی کنید پاره‌وقت در این دوره بیماری چه معنایی دارد', partialVerifyBody: 'استخدام پاره‌وقت عادی و مرخصی استعلاجی پاره‌وقت دو واقعیت متفاوت‌اند. Stödassistenten درصد بیماری را از ساعات یا متن آزاد محاسبه نمی‌کند.',
      sourceEmployee: 'Försäkringskassan: بیماری هنگام اشتغال', sourceNoPay: 'Försäkringskassan: کارمند بدون sjuklön', privacy: 'تشخیص، گواهی پزشکی، SGI، حقوق، کارفرما، برنامه کاری، هویت یا داستان شما را در نشانی یا بازخورد ارسال نمی‌کنیم.', home: 'به صفحه اصلی Stödassistenten',
      feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(lang) { return ['sv', 'ar', 'fa'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'sv'; }
  function excluded(text) { return EXCLUSION_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function detect(text) { return !excluded(text) && DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function handoffHref(lang) { return `person-pilot.html?actor_type=employee&focus=employee_sick&lang=${encodeURIComponent(safeLang(lang))}`; }
  function nextStep(state) {
    if (!state.sickPay) return 'ask_sick_pay';
    if (state.sickPay === 'unsure') return 'verify_sick_pay';
    if (!state.partial) return 'ask_partial';
    if (state.partial === 'unsure') return 'verify_partial';
    if (state.partial === 'yes') return state.sickPay === 'yes' ? 'partial_with_pay' : 'partial_without_pay';
    return state.sickPay === 'yes' ? 'with_pay' : 'without_pay';
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
      const existing = doc.querySelector('[data-stod-employee-sick-route]');
      if (existing) existing.remove();
      const route = doc.createElement('div');
      route.className = 'route';
      route.setAttribute('data-stod-employee-sick-route', 'true');
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
    const state = { sickPay: '', partial: '' };

    function option(name, value, label) { return `<label><input type="radio" name="${name}" value="${value}"> ${label}</label>`; }
    function question(name, text) { return `<fieldset data-question="${name}"><legend>${text}</legend>${option(name, 'yes', c.yes)} ${option(name, 'no', c.no)} ${option(name, 'unsure', c.unsure)}</fieldset>`; }
    function sources() { return `<p><a href="${FK_EMPLOYEE_URL}" target="_blank" rel="noopener">${c.sourceEmployee}</a><br><a href="${FK_NO_SICK_PAY_URL}" target="_blank" rel="noopener">${c.sourceNoPay}</a></p>`; }
    function result(title, body) { return `<section class="result-card"><h2>${title}</h2><p>${body}</p>${sources()}<p class="note">${c.privacy}</p></section>`; }

    function render() {
      const step = nextStep(state);
      let content = `<p class="eyebrow">${c.eyebrow}</p><h1>${c.title}</h1><p>${c.intro}</p>`;
      if (step === 'ask_sick_pay') content += question('sickPay', c.qSickPay);
      else if (step === 'ask_partial') content += question('partial', c.qPartial);
      else if (step === 'verify_sick_pay') content += result(c.verifyTitle, c.verifyBody);
      else if (step === 'verify_partial') content += result(c.partialVerifyTitle, c.partialVerifyBody);
      else if (step === 'with_pay') content += result(c.withPayTitle, c.withPayBody);
      else if (step === 'without_pay') content += result(c.noPayTitle, c.noPayBody);
      else if (step === 'partial_with_pay') content += result(c.partialTitle, `${c.withPayBody} ${c.partialBody}`);
      else content += result(c.partialTitle, `${c.noPayBody} ${c.partialBody}`);
      if (!step.startsWith('ask_')) content += feedbackMarkup(c);
      content += `<p><a href="index.html">${c.home}</a></p>`;
      main.innerHTML = `<div class="wrap" style="max-width:760px;margin:0 auto;padding:32px 20px">${content}</div>`;
      main.querySelectorAll('input[type="radio"]').forEach((el) => {
        if (['sickPay', 'partial'].includes(el.name)) {
          el.addEventListener('change', function () { state[el.name] = el.value; render(); });
        }
      });
      const send = main.querySelector('[data-send-feedback]');
      if (send) send.addEventListener('click', async function () {
        const get = (name) => { const picked = main.querySelector(`input[name="${name}"]:checked`); return picked ? picked.value === 'yes' : null; };
        const payload = {
          app_version: 'v48', language: lang, flow: 'employee_sick',
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
    if (params.get('focus') !== 'employee_sick') return;
    if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', function () { focusedApp(win); }, { once: true });
    else focusedApp(win);
  }

  function init(win) {
    if (!win || !win.document) return;
    rootHandoff(win);
    hookPerson(win);
  }

  return { init, detect, handoffHref, nextStep, FK_EMPLOYEE_URL, FK_NO_SICK_PAY_URL };
});
