(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODJobPremiumGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product public guidance only. This module discovers a candidate route,
  // asks coarse route-changing facts and hands the decision back to current
  // primary sources. It is not an eligibility, amount or deadline engine.
  const FK_URL = 'https://www.forsakringskassan.se/privatperson/jobbpremie';
  const SOCIALSTYRELSEN_URL = 'https://www.socialstyrelsen.se/kunskapsstod-och-regler/omraden/ekonomiskt-bistand/ekonomiskt-bistand-for-privatpersoner/jobbpremien--for-privatpersoner/';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const DIRECT_PATTERNS = [
    /jobbpremie/i,
    /(?:försörjningsstöd|socialbidrag|ekonomiskt\s+bistånd).*(?:jobb|arbet|lön)/i,
    /(?:jobb|arbet|lön).*(?:försörjningsstöd|socialbidrag|ekonomiskt\s+bistånd)/i,
    /(?:مساعدة\s*اجتماعية|إعانة\s*معيشة|دعم\s*المعيشة).*(?:عمل|وظيفة|راتب)/i,
    /(?:عمل|وظيفة|راتب).*(?:مساعدة\s*اجتماعية|إعانة\s*معيشة|دعم\s*المعيشة)/i,
    /(?:کمک\s*معیشتی|کمک\s*اجتماعی|حمایت\s*معیشتی).*(?:کار|شغل|حقوق)/i,
    /(?:کار|شغل|حقوق).*(?:کمک\s*معیشتی|کمک\s*اجتماعی|حمایت\s*معیشتی)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Från försörjningsstöd till lön – kontrollera jobbpremie',
      shellSub: 'Tre avgörande fakta först, sedan Försäkringskassans aktuella väg',
      eyebrow: 'Ekonomiskt bistånd → arbete',
      title: 'Har du lämnat försörjningsstöd och får lön nu?',
      intro: 'Stödassistenten kan hjälpa dig upptäcka om jobbpremien är värd att kontrollera. Vi avgör inte rätten och räknar inte ut belopp eller sista ansökningsdag.',
      qHistory: 'Fick du försörjningsstöd varje månad från juli till december 2025?',
      qSalary: 'Fick du lön från en anställning den månad du vill kontrollera?',
      qHousehold: 'Fick du eller någon annan i ditt hushåll försörjningsstöd samma månad?',
      yes: 'Ja', no: 'Nej', unsure: 'Vet inte / behöver kontrollera',
      likelyTitle: 'Det här är en relevant kandidat att verifiera hos Försäkringskassan',
      likelyBody: 'Dina grova svar passar kontrollvägen. Försäkringskassan avgör rätten månad för månad. Kontrollera också vilken kalendermånad ansökan gäller och den aktuella tidsfristen innan du skickar in.',
      verifyTitle: 'Kontrollera en avgörande uppgift innan du går vidare',
      verifyBody: 'Ett nej eller en osäker uppgift kan ändra vägen. Stödassistenten gissar därför inte. Använd den aktuella primärkällan och kontrollera den historiska perioden, lönemånaden och hushållets försörjningsstöd.',
      stimulationTitle: 'Jobbpremie och jobbstimulans är inte samma sak',
      stimulationBody: 'Om hushållet fortfarande har försörjningsstöd ska du inte blanda ihop den statliga jobbpremien med kommunens jobbstimulans. Kontrollera den aktuella vägen hos kommunen/Socialstyrelsen och Försäkringskassan.',
      sourceFk: 'Försäkringskassan: Jobbpremie',
      sourceSoc: 'Socialstyrelsen: Jobbpremien för privatpersoner',
      privacy: 'Vi skickar inte lön, arbetsgivare, kommun, hushållsidentiteter, exakta biståndsbelopp eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida',
      feedback: 'Hjälp oss förbättra den här vägen',
      learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?',
      send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'من دعم المعيشة إلى الراتب – تحقق من Jobbpremie', shellSub: 'ثلاث معلومات حاسمة ثم المسار الحالي لدى Försäkringskassan',
      eyebrow: 'الدعم البلدي ← العمل', title: 'هل توقفت عن دعم المعيشة وأصبحت تتلقى راتباً؟',
      intro: 'يمكن لـ Stödassistenten أن يوضح إن كان من المفيد التحقق من Jobbpremie. لا نقرر الاستحقاق ولا نحسب المبلغ أو الموعد النهائي.',
      qHistory: 'هل حصلت على försörjningsstöd في كل شهر من يوليو إلى ديسمبر 2025؟', qSalary: 'هل حصلت على راتب من عمل في الشهر الذي تريد التحقق منه؟', qHousehold: 'هل حصلت أنت أو أي شخص في أسرتك على försörjningsstöd في الشهر نفسه؟',
      yes: 'نعم', no: 'لا', unsure: 'لا أعرف / أحتاج إلى التحقق',
      likelyTitle: 'هذا مسار يستحق التحقق لدى Försäkringskassan', likelyBody: 'إجاباتك العامة تناسب مسار التحقق. Försäkringskassan يقرر الاستحقاق شهراً بشهر. تحقق أيضاً من شهر الطلب والمهلة الحالية قبل الإرسال.',
      verifyTitle: 'تحقق من معلومة حاسمة قبل المتابعة', verifyBody: 'الإجابة بالنفي أو عدم التأكد قد تغير المسار. لذلك لا يخمّن Stödassistenten. تحقق من الفترة السابقة وشهر الراتب ووضع دعم الأسرة من المصدر الحالي.',
      stimulationTitle: 'Jobbpremie و jobbstimulans ليسا الشيء نفسه', stimulationBody: 'إذا كانت الأسرة ما زالت تحصل على försörjningsstöd فلا تخلط بين Jobbpremie الحكومية و jobbstimulans البلدية. تحقق من المسار الحالي لدى البلدية/Socialstyrelsen وFörsäkringskassan.',
      sourceFk: 'Försäkringskassan: Jobbpremie', sourceSoc: 'Socialstyrelsen: معلومات Jobbpremie للأفراد', privacy: 'لا نرسل الراتب أو صاحب العمل أو البلدية أو هوية أفراد الأسرة أو مبالغ الدعم أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية لـ Stödassistenten',
      feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'از کمک معیشتی به حقوق – Jobbpremie را بررسی کنید', shellSub: 'سه واقعیت تعیین‌کننده، سپس مسیر فعلی Försäkringskassan',
      eyebrow: 'کمک شهرداری ← کار', title: 'آیا کمک معیشتی را ترک کرده‌اید و اکنون حقوق می‌گیرید؟',
      intro: 'Stödassistenten می‌تواند نشان دهد آیا Jobbpremie ارزش بررسی دارد. ما استحقاق، مبلغ یا مهلت نهایی را تعیین نمی‌کنیم.',
      qHistory: 'آیا در همه ماه‌های ژوئیه تا دسامبر ۲۰۲۵ försörjningsstöd دریافت کردید؟', qSalary: 'آیا در ماه مورد نظر از استخدام حقوق دریافت کردید؟', qHousehold: 'آیا شما یا فرد دیگری در خانوار همان ماه försörjningsstöd دریافت کردید؟',
      yes: 'بله', no: 'خیر', unsure: 'نمی‌دانم / باید بررسی کنم',
      likelyTitle: 'این مسیر ارزش بررسی با Försäkringskassan را دارد', likelyBody: 'پاسخ‌های کلی شما با مسیر بررسی سازگار است. Försäkringskassan ماه‌به‌ماه تصمیم می‌گیرد. ماه درخواست و مهلت فعلی را نیز پیش از ارسال بررسی کنید.',
      verifyTitle: 'پیش از ادامه یک واقعیت تعیین‌کننده را بررسی کنید', verifyBody: 'پاسخ منفی یا نامطمئن می‌تواند مسیر را تغییر دهد؛ بنابراین Stödassistenten حدس نمی‌زند. دوره تاریخی، ماه حقوق و وضعیت کمک خانوار را در منبع فعلی بررسی کنید.',
      stimulationTitle: 'Jobbpremie و jobbstimulans یک چیز نیستند', stimulationBody: 'اگر خانوار هنوز försörjningsstöd می‌گیرد، Jobbpremie دولتی را با jobbstimulans شهرداری یکی ندانید. مسیر فعلی را نزد شهرداری/Socialstyrelsen و Försäkringskassan بررسی کنید.',
      sourceFk: 'Försäkringskassan: Jobbpremie', sourceSoc: 'Socialstyrelsen: Jobbpremie برای افراد', privacy: 'حقوق، کارفرما، شهرداری، هویت اعضای خانوار، مبلغ دقیق کمک یا داستان شما را در لینک یا بازخورد ارسال نمی‌کنیم.', home: 'بازگشت به Stödassistenten',
      feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(lang) { return ['sv', 'ar', 'fa'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'sv'; }
  function detect(text) { return DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function handoffHref(lang) { return `person-pilot.html?actor_type=private_person&focus=job_premium&lang=${encodeURIComponent(safeLang(lang))}`; }
  function nextStep(state) {
    if (!state.history) return 'ask_history';
    if (!state.salary) return 'ask_salary';
    if (!state.household) return 'ask_household';
    if (state.history === 'yes' && state.salary === 'yes' && state.household === 'no') return 'verify_candidate';
    if (state.household === 'yes') return 'separate_job_stimulation';
    return 'verify_missing_or_conflicting_fact';
  }

  function pageLang(win) {
    const params = new URLSearchParams(win.location.search);
    return safeLang(params.get('lang') || win.document.documentElement.lang);
  }

  function rootHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden || !detect(input.value)) return false;
    if (box.querySelector('[data-job-premium-route="true"]')) return true;
    const lang = pageLang(win); const c = COPY[lang];
    const route = doc.createElement('a'); route.className = 'route'; route.dataset.jobPremiumRoute = 'true'; route.href = handoffHref(lang);
    const left = doc.createElement('span'); const title = doc.createElement('strong'); title.textContent = c.shellTitle; const sub = doc.createElement('small'); sub.textContent = c.shellSub; left.append(title, sub);
    const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→'; route.append(left, arrow);
    box.insertBefore(route, box.querySelector('a.route') || null); return true;
  }

  function button(doc, label, value, onClick) {
    const el = doc.createElement('button'); el.type = 'button'; el.className = 'choice'; el.textContent = label; el.dataset.value = value; el.addEventListener('click', onClick); return el;
  }

  function focusedApp(win) {
    const doc = win.document; const main = doc.getElementById('main'); if (!main) return;
    let lang = pageLang(win); const state = {}; const feedback = {};
    function c() { return COPY[lang]; }
    function setDir() { doc.documentElement.lang = lang; const rtl = lang === 'ar' || lang === 'fa'; doc.documentElement.dir = rtl ? 'rtl' : 'ltr'; doc.body.classList.toggle('rtl', rtl); }
    function sourceLink(url, label) { const a = doc.createElement('a'); a.className = 'source'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label; return a; }
    function question(title, key) { const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h2'); h.textContent = title; card.append(h); [['yes', c().yes], ['no', c().no], ['unsure', c().unsure]].forEach(([value, label]) => card.append(button(doc, label, value, () => { state[key] = value; render(); }))); return card; }
    function feedbackCard() {
      const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h3'); h.textContent = c().feedback; card.append(h);
      [['learned_new', c().learned], ['useful', c().useful], ['next_step_clear', c().clear]].forEach(([key, label]) => { const p = doc.createElement('p'); p.textContent = label; card.append(p); const row = doc.createElement('div'); row.className = 'fbs'; [['true', c().yes], ['false', c().no]].forEach(([value, text]) => { const b = doc.createElement('button'); b.type = 'button'; b.className = 'fb'; b.textContent = text; b.addEventListener('click', () => { feedback[key] = value === 'true'; Array.from(row.children).forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); }); row.append(b); }); card.append(row); });
      const send = doc.createElement('button'); send.type = 'button'; send.className = 'btn primary'; send.textContent = c().send; const status = doc.createElement('div'); status.className = 'status';
      send.addEventListener('click', async () => { if (!['learned_new','useful','next_step_clear'].every((key) => typeof feedback[key] === 'boolean')) { status.textContent = c().error; status.className = 'status err'; return; } send.disabled = true; try { const res = await win.fetch(FEEDBACK_URL, { method:'POST', mode:'cors', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app_version:'0.5.0',language:lang,flow:'job_premium',learned_new:feedback.learned_new,useful:feedback.useful,next_step_clear:feedback.next_step_clear,ratings:{route:'job_premium'}}) }); if (!res.ok) throw new Error('feedback'); status.textContent = c().sent; status.className = 'status ok'; } catch (_) { status.textContent = c().error; status.className = 'status err'; } finally { send.disabled = false; } });
      card.append(send, status); return card;
    }
    function resultCard(kind) {
      const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h2'); const p = doc.createElement('p');
      if (kind === 'verify_candidate') { h.textContent = c().likelyTitle; p.textContent = c().likelyBody; }
      else if (kind === 'separate_job_stimulation') { h.textContent = c().stimulationTitle; p.textContent = c().stimulationBody; }
      else { h.textContent = c().verifyTitle; p.textContent = c().verifyBody; }
      const privacy = doc.createElement('div'); privacy.className = 'privacy'; privacy.textContent = c().privacy;
      const sources = doc.createElement('p'); sources.append(sourceLink(FK_URL, c().sourceFk), doc.createTextNode(' · '), sourceLink(SOCIALSTYRELSEN_URL, c().sourceSoc));
      const home = doc.createElement('p'); const a = doc.createElement('a'); a.className = 'source'; a.href = `index.html?lang=${encodeURIComponent(lang)}`; a.textContent = c().home; home.append(a);
      card.append(h, p, sources, privacy, home); return card;
    }
    function render() {
      main.textContent = ''; const hero = doc.createElement('section'); hero.className = 'card hero'; const eye = doc.createElement('div'); eye.className = 'eyebrow'; eye.textContent = c().eyebrow; const h1 = doc.createElement('h1'); h1.textContent = c().title; const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = c().intro; hero.append(eye, h1, intro); main.append(hero);
      const step = nextStep(state);
      if (step === 'ask_history') main.append(question(c().qHistory, 'history'));
      else if (step === 'ask_salary') main.append(question(c().qSalary, 'salary'));
      else if (step === 'ask_household') main.append(question(c().qHousehold, 'household'));
      else { main.append(resultCard(step), feedbackCard()); }
    }
    setDir(); render();
  }

  function hookRoot(win) { const buttonEl = win.document.getElementById('analyzeBtn'); const input = win.document.getElementById('situation'); if (!buttonEl || !input) return; buttonEl.addEventListener('click', () => win.setTimeout(() => rootHandoff(win), 0)); input.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') win.setTimeout(() => rootHandoff(win), 0); }); }
  function hookPerson(win) { const params = new URLSearchParams(win.location.search); if (String(params.get('focus') || '').toLowerCase() !== 'job_premium') return; focusedApp(win); }
  function init(win) { const path = (win.location.pathname || '').split('/').pop(); if (!path || path === 'index.html') hookRoot(win); if (path === 'person-pilot.html') hookPerson(win); }

  return { detect, handoffHref, nextStep, rootHandoff, init, FK_URL, SOCIALSTYRELSEN_URL };
});
