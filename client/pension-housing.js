(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODPensionHousing = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const FACTS_URL = 'https://www.pensionsmyndigheten.se/for-pensionarer/ekonomiskt-stod/sa-fungerar-bostadstillagg/fakta-om-bostadstillagg';
  const APPLY_URL = 'https://www.pensionsmyndigheten.se/for-pensionarer/ekonomiskt-stod/sa-fungerar-bostadstillagg/ansok-om-bostadstillagg';
  const CALC_URL = 'https://www.pensionsmyndigheten.se/service/beraknabt/prelbostadstillagg/uppgifter';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const PENSION_PATTERNS = [
    /\bpension(?:är|ären|ärer|en)?\b/i,
    /\b(?:67|68|69|70|71|72|73|74|75|76|77|78|79|8\d|9\d)\s*(?:år|årig|åring)\b/i,
    /متقاعد|تقاعد|معاش\s*(?:تقاعد|شيخوخة)?/i,
    /بازنشسته|بازنشستگی|مستمری\s*بازنشستگی/i,
  ];
  const HOUSING_ECONOMY_PATTERNS = [
    /bostadstillägg/i,
    /\bhyra(?:n)?\b|boendekost|dyrt?\s+boende|dyr\s+hyra|pengarna?\s+räcker\s+inte|har\s+inte\s+råd|låg\s+pension/i,
    /بدل\s+السكن|إيجار|تكلفة\s+السكن|المعاش.*لا\s+يكفي|لا\s+يكفي.*الإيجار/i,
    /کمک(?:‌|\s|-)*هزینه\s+مسکن|اجاره|هزینه\s+مسکن|مستمری.*کافی\s+نیست|پول.*اجاره.*نمی/i,
  ];
  const NON_PENSION_BENEFIT_PATTERNS = [
    /aktivitetsersättning|sjukersättning/i,
    /بدل\s+النشاط|تعويض\s+المرض/i,
    /کمک(?:‌|\s|-)*هزینه\s+فعالیت|غرامت\s+بیماری/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Pension och boendekostnad – kontrollera bostadstilläggsvägen',
      shellSub: 'Få frågor, aktuell primärkälla och ett konkret nästa steg',
      chooseTitle: 'Vad behöver du främst hjälp med?',
      housingChoice: 'Pension, boende och ekonomi',
      dentalChoice: 'Tandvård och kostnad',
      otherChoice: 'Något annat',
      eyebrow: 'Pension → boendeekonomi',
      title: 'Låg pension eller hög boendekostnad? Kontrollera rätt väg utan att gissa belopp.',
      intro: 'Stödassistenten avgör inte om du har rätt till bostadstillägg. Vi frågar bara efter tre fakta som kan ändra vägen. Bostadskostnad, inkomster, tillgångar och familjesituation hanteras sedan i Pensionsmyndighetens aktuella beräkning i stället för att du ska lämna detaljer här.',
      qAge: 'Är du 67 år eller äldre?',
      qFullPension: 'Tar du ut hela din allmänna pension, inklusive premiepension?',
      qResidence: 'Bor du i Sverige?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      candidateTitle: 'Bostadstillägg är värt att kontrollera i Pensionsmyndighetens beräkning',
      candidateBody: 'Dina grova svar passar huvudvägen för pensionärer, men det är inte ett beslut. Nästa säkra steg är den preliminära beräkningen. Där vägs bland annat bostadskostnad, familjesituation, inkomster och tillgångar in. Att äga sin bostad eller ha tillgångar ska inte i sig användas som ett automatiskt nej här.',
      verifyTitle: 'Bekräfta rätt grundväg innan du räknar på bostadstillägg',
      ageNoBody: 'Den aktuella huvudregeln för pensionärsspåret använder 67 år eller äldre. Äldre broschyrer eller sökträffar kan visa tidigare åldersgränser. Använd den aktuella webbsidan och kontrollera specialfall i stället för att backporta en gammal regel.',
      ageUnsureBody: 'Bekräfta ålder mot den aktuella Pensionsmyndigheten-sidan. Använd inte en äldre PDF eller gammal sökträff som ensam sanningskälla.',
      pensionNoBody: 'Helt uttag av allmän pension inklusive premiepension är en central del av den aktuella huvudvägen. Ett nej här betyder inte att allt stöd saknas; kontrollera den aktuella primärkällan och eventuella specialfall.',
      pensionUnsureBody: 'Kontrollera om hela den allmänna pensionen inklusive premiepension faktiskt tas ut innan huvudvägen används.',
      residenceNoBody: 'Pensionärsspårets aktuella huvudregel anger bosättning i Sverige. Ett nej ska därför inte översättas till ett generellt påstående om att inget stöd finns; verifiera rätt väg med Pensionsmyndigheten.',
      residenceUnsureBody: 'Bekräfta bosättningen innan huvudvägen används. Stödassistenten ska inte avgöra den frågan från en kort berättelse.',
      calc: 'Gör preliminär beräkning',
      facts: 'Se aktuella fakta hos Pensionsmyndigheten',
      apply: 'Se ansökningsvägen',
      privacy: 'Vi skickar inte din pension, hyra, tillgångar eller andra ekonomiska uppgifter i den här fokuserade vägen.',
      fbTitle: 'Hjälp oss förbättra vägen',
      fbNew: 'Fick du reda på något nytt?',
      fbUseful: 'Var hjälpen användbar?',
      fbClear: 'Var nästa steg tydligt?',
      send: 'Skicka anonym feedback',
      sent: 'Tack! Endast strukturerad produktfeedback skickades.',
      sendError: 'Feedbacken kunde inte skickas just nu.',
    },
    ar: {
      shellTitle: 'المعاش وتكلفة السكن – تحقق من مسار bostadstillägg',
      shellSub: 'أسئلة قليلة، مصدر رسمي حالي وخطوة تالية واضحة',
      chooseTitle: 'ما الذي تحتاج إلى مساعدة فيه أساساً؟',
      housingChoice: 'المعاش والسكن والاقتصاد', dentalChoice: 'علاج الأسنان والتكلفة', otherChoice: 'شيء آخر',
      eyebrow: 'المعاش ← اقتصاد السكن',
      title: 'معاش منخفض أو تكلفة سكن مرتفعة؟ تحقق من المسار الصحيح دون تخمين المبلغ.',
      intro: 'لا يقرر Stödassistenten الاستحقاق. نسأل فقط عن ثلاث معلومات قد تغيّر المسار. بعد ذلك تُراجع تكلفة السكن والدخل والأصول والوضع العائلي في أداة Pensionsmyndigheten الحالية بدلاً من إدخال التفاصيل هنا.',
      qAge: 'هل عمرك 67 عاماً أو أكثر؟', qFullPension: 'هل تسحب كامل معاشك العام بما فيه premiepension؟', qResidence: 'هل تعيش في السويد؟',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      candidateTitle: 'يستحق bostadstillägg التحقق عبر حاسبة Pensionsmyndigheten',
      candidateBody: 'إجاباتك العامة تناسب المسار الرئيسي للمتقاعدين، لكنها ليست قراراً. الخطوة الآمنة التالية هي الحساب الأولي حيث تُؤخذ تكلفة السكن والوضع العائلي والدخل والأصول بالحسبان. امتلاك المسكن أو وجود أصول لا ينبغي أن يتحول تلقائياً إلى رفض هنا.',
      verifyTitle: 'تحقق من المسار الأساسي الصحيح قبل حساب bostadstillägg',
      ageNoBody: 'القاعدة الرئيسية الحالية لمسار المتقاعدين تستخدم 67 عاماً أو أكثر. قد تعرض كتيبات أو نتائج بحث أقدم حدوداً سابقة؛ استخدم صفحة Pensionsmyndigheten الحالية وتحقق من الحالات الخاصة.',
      ageUnsureBody: 'تحقق من العمر على الصفحة الحالية ولا تستخدم PDF قديماً أو نتيجة بحث قديمة كمصدر حقيقة وحيد.',
      pensionNoBody: 'سحب كامل المعاش العام بما فيه premiepension جزء أساسي من المسار الرئيسي الحالي. الإجابة بلا لا تعني عدم وجود أي دعم؛ تحقق من المصدر الحالي والحالات الخاصة.',
      pensionUnsureBody: 'تحقق أولاً مما إذا كان كامل المعاش العام بما فيه premiepension يُسحب فعلاً.',
      residenceNoBody: 'المسار الرئيسي الحالي يذكر الإقامة في السويد. لا تحوّل الإجابة بلا إلى استنتاج عام بأن كل الدعم غير متاح؛ تحقق من المسار الصحيح مع Pensionsmyndigheten.',
      residenceUnsureBody: 'تحقق من الإقامة قبل استخدام المسار الرئيسي. لا تستنتج ذلك من قصة قصيرة.',
      calc: 'إجراء حساب أولي', facts: 'الحقائق الحالية لدى Pensionsmyndigheten', apply: 'مسار التقديم',
      privacy: 'لا نرسل معاشك أو إيجارك أو أصولك أو تفاصيلك المالية في هذا المسار.',
      fbTitle: 'ساعدنا على تحسين المسار', fbNew: 'هل عرفت شيئاً جديداً؟', fbUseful: 'هل كانت المساعدة مفيدة؟', fbClear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أُرسلت ملاحظات منتج منظمة فقط.', sendError: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'بازنشستگی و هزینه مسکن – مسیر bostadstillägg را بررسی کنید',
      shellSub: 'سؤال‌های کم، منبع رسمی فعلی و قدم بعدی روشن',
      chooseTitle: 'بیشتر برای چه چیزی کمک می‌خواهید؟',
      housingChoice: 'بازنشستگی، مسکن و اقتصاد', dentalChoice: 'دندانپزشکی و هزینه', otherChoice: 'موضوع دیگر',
      eyebrow: 'بازنشستگی ← اقتصاد مسکن',
      title: 'مستمری کم یا هزینه مسکن بالا؟ مسیر درست را بدون حدس مبلغ بررسی کنید.',
      intro: 'Stödassistenten واجد شرایط بودن را تعیین نمی‌کند. فقط سه واقعیت را می‌پرسیم که می‌تواند مسیر را عوض کند. هزینه مسکن، درآمد، دارایی و وضعیت خانوادگی بعداً در محاسبه فعلی Pensionsmyndigheten بررسی می‌شود و لازم نیست جزئیات را اینجا وارد کنید.',
      qAge: 'آیا ۶۷ سال یا بیشتر دارید؟', qFullPension: 'آیا کل مستمری عمومی خود از جمله premiepension را دریافت می‌کنید؟', qResidence: 'آیا در سوئد زندگی می‌کنید؟',
      yes: 'بله', no: 'نه', unsure: 'مطمئن نیستم',
      candidateTitle: 'ارزش دارد bostadstillägg را در محاسبه Pensionsmyndigheten بررسی کنید',
      candidateBody: 'پاسخ‌های کلی شما با مسیر اصلی بازنشستگان سازگار است، اما این تصمیم نیست. قدم امن بعدی محاسبه مقدماتی است که هزینه مسکن، وضعیت خانوادگی، درآمد و دارایی را در نظر می‌گیرد. مالک بودن یا داشتن دارایی نباید به‌تنهایی به رد خودکار تبدیل شود.',
      verifyTitle: 'پیش از محاسبه bostadstillägg مسیر پایه درست را تأیید کنید',
      ageNoBody: 'قاعده اصلی فعلی مسیر بازنشستگان ۶۷ سال یا بیشتر را به‌کار می‌برد. بروشور یا نتیجه جست‌وجوی قدیمی ممکن است سن قبلی را نشان دهد؛ از صفحه فعلی استفاده کنید و موارد خاص را جداگانه بررسی کنید.',
      ageUnsureBody: 'سن را در صفحه فعلی تأیید کنید و یک PDF یا نتیجه جست‌وجوی قدیمی را تنها منبع حقیقت ندانید.',
      pensionNoBody: 'دریافت کل مستمری عمومی از جمله premiepension بخش اصلی مسیر فعلی است. پاسخ نه به معنی نبود همه حمایت‌ها نیست؛ منبع فعلی و موارد خاص را بررسی کنید.',
      pensionUnsureBody: 'ابتدا تأیید کنید که کل مستمری عمومی از جمله premiepension واقعاً دریافت می‌شود.',
      residenceNoBody: 'مسیر اصلی فعلی اقامت در سوئد را ذکر می‌کند. پاسخ نه را به نتیجه کلی نبود همه حمایت‌ها تبدیل نکنید؛ مسیر درست را با Pensionsmyndigheten بررسی کنید.',
      residenceUnsureBody: 'پیش از استفاده از مسیر اصلی، اقامت را تأیید کنید. از یک روایت کوتاه نتیجه‌گیری نکنید.',
      calc: 'محاسبه مقدماتی', facts: 'اطلاعات فعلی Pensionsmyndigheten', apply: 'مسیر درخواست',
      privacy: 'در این مسیر مستمری، اجاره، دارایی یا جزئیات مالی شما ارسال نمی‌شود.',
      fbTitle: 'به بهبود مسیر کمک کنید', fbNew: 'چیز تازه‌ای فهمیدید؟', fbUseful: 'کمک مفید بود؟', fbClear: 'قدم بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'ممنون! فقط بازخورد ساختاری محصول ارسال شد.', sendError: 'فعلاً ارسال بازخورد ممکن نیست.'
    }
  };

  function normalizeLang(value) { return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function any(patterns, text) { return patterns.some((pattern) => pattern.test(text)); }
  function detect(text) {
    const value = String(text || '');
    const pension = any(PENSION_PATTERNS, value);
    const housing = any(HOUSING_ECONOMY_PATTERNS, value);
    const nonPension = any(NON_PENSION_BENEFIT_PATTERNS, value);
    if (nonPension && !pension) return false;
    return pension && housing;
  }
  function buildHandoffUrl(lang) {
    const q = new URLSearchParams({ actor_type: 'private_person', focus: 'pension_housing', lang: normalizeLang(lang) });
    return `person-pilot.html?${q.toString()}`;
  }
  function decision(answers) {
    for (const key of ['age', 'fullPension', 'residence']) {
      if (answers[key] === 'no') return `verify_${key}_no`;
      if (answers[key] === 'unsure') return `verify_${key}_unsure`;
      if (answers[key] !== 'yes') return `ask_${key}`;
    }
    return 'calculator';
  }
  function pageLang(win) {
    return normalizeLang(new URLSearchParams(win.location.search).get('lang') || win.document.documentElement.lang);
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function rootHandoff(win) {
    const input = win.document.getElementById('situation');
    const box = win.document.getElementById('engineResults');
    if (!input || !box || !detect(input.value)) return false;
    const lang = pageLang(win); const c = COPY[lang];
    box.innerHTML = `<div class="interpret">${esc(c.shellSub)}</div><a class="route" href="${esc(buildHandoffUrl(lang))}"><span><strong>${esc(c.shellTitle)}</strong><small>${esc(c.privacy)}</small></span><span class="arrow" aria-hidden="true">→</span></a>`;
    box.hidden = false;
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
  function focusedApp(win, direct) {
    const main = win.document.getElementById('main'); if (!main) return;
    let lang = pageLang(win); let answers = {}; let fb = {};
    const originalStart = typeof win.start === 'function' ? win.start.bind(win) : null;
    const c = () => COPY[lang];
    function setDir() { win.document.documentElement.lang = lang; win.document.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl'; }
    function actionButton(label, key, value) { return `<button class="choice" type="button" data-answer="${key}:${value}">${esc(label)}</button>`; }
    function sources() { return `<p><a class="source" target="_blank" rel="noopener" href="${FACTS_URL}">${esc(c().facts)}</a> · <a class="source" target="_blank" rel="noopener" href="${APPLY_URL}">${esc(c().apply)}</a></p>`; }
    function feedbackBlock() {
      return `<section class="card"><h3>${esc(c().fbTitle)}</h3><p>${esc(c().fbNew)}</p><div class="fbs">${['yes','no'].map(v=>`<button class="fb" data-fb="learned_new:${v}">${esc(c()[v])}</button>`).join('')}</div><p>${esc(c().fbUseful)}</p><div class="fbs">${['yes','no'].map(v=>`<button class="fb" data-fb="useful:${v}">${esc(c()[v])}</button>`).join('')}</div><p>${esc(c().fbClear)}</p><div class="fbs">${['yes','no'].map(v=>`<button class="fb" data-fb="next_step_clear:${v}">${esc(c()[v])}</button>`).join('')}</div><button class="btn primary" type="button" id="pensionFbSend">${esc(c().send)}</button><div id="pensionFbStatus" class="status" aria-live="polite"></div></section>`;
    }
    function resultBody(code) {
      if (code === 'calculator') return `<section class="card"><div class="eyebrow">${esc(c().eyebrow)}</div><h2 tabindex="-1" id="pensionResultTitle">${esc(c().candidateTitle)}</h2><p>${esc(c().candidateBody)}</p><a class="btn primary" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="${CALC_URL}">${esc(c().calc)}</a>${sources()}<div class="privacy">🔒 ${esc(c().privacy)}</div></section>${feedbackBlock()}`;
      const map = {
        verify_age_no: c().ageNoBody, verify_age_unsure: c().ageUnsureBody,
        verify_fullPension_no: c().pensionNoBody, verify_fullPension_unsure: c().pensionUnsureBody,
        verify_residence_no: c().residenceNoBody, verify_residence_unsure: c().residenceUnsureBody,
      };
      return `<section class="card"><div class="eyebrow">${esc(c().eyebrow)}</div><h2 tabindex="-1" id="pensionResultTitle">${esc(c().verifyTitle)}</h2><p>${esc(map[code] || c().verifyTitle)}</p>${sources()}<div class="privacy">🔒 ${esc(c().privacy)}</div></section>${feedbackBlock()}`;
    }
    function renderQuestion(key) {
      const spec = {
        age: ['1 / 3', c().qAge], fullPension: ['2 / 3', c().qFullPension], residence: ['3 / 3', c().qResidence]
      }[key];
      main.innerHTML = `<section class="card hero"><div class="eyebrow">${esc(c().eyebrow)}</div><h1>${esc(c().title)}</h1><p class="muted">${esc(c().intro)}</p><div class="privacy">🔒 ${esc(c().privacy)}</div></section><section class="card"><div class="progress">${spec[0]}</div><h2>${esc(spec[1])}</h2>${actionButton(c().yes,key,'yes')}${actionButton(c().no,key,'no')}${actionButton(c().unsure,key,'unsure')}</section>`;
      bind();
    }
    function renderChoice() {
      main.innerHTML = `<section class="card hero"><div class="eyebrow">${esc(c().eyebrow)}</div><h1>${esc(c().chooseTitle)}</h1><p class="muted">${esc(c().intro)}</p></section><section class="card"><button class="choice" id="pensionHousingChoice">${esc(c().housingChoice)}</button><a class="choice" style="display:block;text-decoration:none" href="quick-help.html?mode=dental&need=cost&lang=${lang}">${esc(c().dentalChoice)}</a><button class="choice" id="pensionOtherChoice">${esc(c().otherChoice)}</button></section>`;
      win.document.getElementById('pensionHousingChoice').onclick = () => renderQuestion('age');
      win.document.getElementById('pensionOtherChoice').onclick = () => originalStart ? originalStart('general') : win.location.assign(`person-pilot.html?lang=${lang}`);
    }
    function bind() {
      main.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
        const [key, value] = button.dataset.answer.split(':'); answers[key] = value;
        const state = decision(answers);
        if (state === 'ask_fullPension') renderQuestion('fullPension');
        else if (state === 'ask_residence') renderQuestion('residence');
        else if (state.startsWith('verify_') || state === 'calculator') { main.innerHTML = resultBody(state); bindFeedback(); win.document.getElementById('pensionResultTitle')?.focus(); }
      }));
    }
    function bindFeedback() {
      main.querySelectorAll('[data-fb]').forEach((button) => button.addEventListener('click', () => {
        const [key, value] = button.dataset.fb.split(':'); fb[key] = value === 'yes';
        main.querySelectorAll(`[data-fb^="${key}:"]`).forEach(b => b.classList.remove('selected')); button.classList.add('selected');
      }));
      const send = win.document.getElementById('pensionFbSend'); if (!send) return;
      send.addEventListener('click', async () => {
        const status = win.document.getElementById('pensionFbStatus');
        if (!['learned_new','useful','next_step_clear'].every(k => typeof fb[k] === 'boolean')) { status.textContent = c().sendError; return; }
        try {
          const res = await win.fetch(FEEDBACK_URL, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ app_version:'0.5.0', language:lang, flow:'pension_housing', learned_new:fb.learned_new, useful:fb.useful, next_step_clear:fb.next_step_clear, ratings:{ route:'pension_housing' } }) });
          if (!res.ok) throw new Error('feedback'); status.textContent = c().sent; status.className = 'status ok';
        } catch (_) { status.textContent = c().sendError; status.className = 'status err'; }
      });
    }
    setDir();
    if (direct) renderQuestion('age'); else renderChoice();
    if (typeof win.start === 'function' && !win.__stodPensionStartWrapped) {
      win.__stodPensionStartWrapped = true;
      const oldStart = win.start.bind(win);
      win.start = function (scenario) { if (scenario === 'pension') { focusedApp(win, false); return; } return oldStart(scenario); };
    }
  }
  function hookPerson(win) {
    const params = new URLSearchParams(win.location.search);
    if (params.get('focus') === 'pension_housing') { focusedApp(win, true); return; }
    if (typeof win.start === 'function' && !win.__stodPensionStartWrapped) {
      const oldStart = win.start.bind(win); win.__stodPensionStartWrapped = true;
      win.start = function (scenario) { if (scenario === 'pension') { focusedApp(win, false); return; } return oldStart(scenario); };
    }
  }
  function init(win) {
    const path = (win.location.pathname || '').split('/').pop();
    if (!path || path === 'index.html') hookRoot(win);
    if (path === 'person-pilot.html') hookPerson(win);
  }
  return { init, detect, decision, buildHandoffUrl, normalizeLang };
});
