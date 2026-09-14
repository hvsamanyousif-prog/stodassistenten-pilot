(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODChildMaintenanceGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product guidance only. This route separates direct maintenance between
  // parents from state maintenance support and keeps equal-residence and
  // cross-border cases fail-closed. It never decides eligibility, amount,
  // retroactivity, custody, insurance status or an individual legal obligation.
  const FK_OVERVIEW_URL = 'https://www.forsakringskassan.se/privatperson/familj-och-barn/foraldrar-som-inte-lever-ihop/underhall-sa-funkar-det';
  const FK_SUPPORT_URL = 'https://www.forsakringskassan.se/privatperson/familj-och-barn/foraldrar-som-inte-lever-ihop/om-den-som-ska-betala-underhall-inte-kan-eller-vill-betala';
  const FK_ABROAD_URL = 'https://www.forsakringskassan.se/privatperson/familj-och-barn/foraldrar-som-inte-lever-ihop/nagon-av-foraldrarna-bor-utomlands';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const CONTEXTS = new Set(['cross_border']);

  const DIRECT_PATTERNS = [
    /\bunderhållsstöd\b/i,
    /\bunderhållsbidrag\b/i,
    /(?:andra\s+föräldern|barnets\s+(?:pappa|mamma)|mitt\s+ex).*\bunderhåll(?:sstöd|sbidrag)?\b/i,
    /(?:betalar\s+(?:inte|inget|för\s+lite)).*(?:barn|underhåll)/i,
    /(?:نفقة|إعالة\s+الطفل|دعم\s+النفقة)/i,
    /(?:نفقه|هزینه\s+فرزند|کمک\s+هزینه\s+فرزند)/i,
  ];
  const CROSS_BORDER_PATTERNS = [
    /(?:utomlands|annat\s+land|olika\s+länder)/i,
    /(?:خارج\s+السويد|بلد\s+آخر|دولة\s+أخرى)/i,
    /(?:خارج\s+از\s+سوئد|کشور\s+دیگر)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Underhåll för barn – hitta rätt väg',
      shellSub: 'Skilj underhållsbidrag mellan föräldrar från underhållsstöd hos Försäkringskassan',
      eyebrow: 'Barn · separerade föräldrar · underhåll',
      title: 'Vilken underhållsväg är relevant att kontrollera?',
      intro: 'Stödassistenten hjälper dig skilja mellan underhållsbidrag och underhållsstöd. Vi avgör inte rätt, belopp, vårdnad eller vad någon ska betala i ett enskilt fall.',
      qResidence: 'Hur bor barnet mellan föräldrarna?',
      mostly: 'Barnet bor hela eller större delen av tiden hos mig',
      equal: 'Barnet bor ungefär lika mycket hos båda',
      residenceUnsure: 'Jag är osäker / boendet varierar',
      qPayment: 'Hur fungerar underhållet från den andra föräldern just nu?',
      full: 'Det betalas enligt vår överenskommelse eller beslut',
      partial: 'Det betalas bara en del',
      none: 'Det betalas inget',
      paymentUnsure: 'Jag vet inte vad som ska räknas som rätt betalning',
      supportTitle: 'Underhållsstöd är en kandidat att verifiera',
      supportBody: 'När barnet bor hela eller större delen av tiden hos dig och den andra föräldern inte betalar, eller bara betalar en del, har Försäkringskassan en separat väg för underhållsstöd. Fler villkor gäller och ska kontrolleras i den aktuella primärkällan innan du utgår från att du har rätt till stödet.',
      directTitle: 'Börja med den direkta underhållsvägen',
      directBody: 'Underhållsbidrag är pengar som föräldrarna ordnar sinsemellan utifrån barnets behov och föräldrarnas ekonomi. Om betalningen redan fungerar ska Stödassistenten inte automatiskt byta till underhållsstöd.',
      equalTitle: 'Växelvist boende kräver en annan bedömning',
      equalBody: 'När barnet bor ungefär lika mycket hos båda är underhållsstöd inte en automatisk väg. Försäkringskassan beskriver samtidigt att underhållsbidrag kan vara rimligt om det är stor skillnad i föräldrarnas ekonomi. Kontrollera den aktuella underhållsvägen utan att låta boendet ensamt avgöra betalningsskyldighet.',
      verifyResidenceTitle: 'Klargör boendet innan du väljer stödväg',
      verifyResidenceBody: 'Boendemönstret kan ändra om underhållsstöd eller en direkt överenskommelse är den relevanta vägen. Stödassistenten gissar inte utifrån ord som "separerad" eller "varannan vecka" när boendet är oklart.',
      verifyPaymentTitle: 'Klargör vad som faktiskt betalas',
      verifyPaymentBody: 'Delvis, utebliven och fungerande betalning leder inte till samma nästa steg. Kontrollera aktuell överenskommelse eller beslut och använd Försäkringskassans primärkälla innan du söker ett statligt stöd.',
      abroadTitle: 'När en förälder bor utomlands behövs den internationella vägen',
      abroadBody: 'Försäkringskassan anger att hjälpen kan bero på vilket land den andra föräldern bor i. Använd därför den aktuella internationella underhållsvägen i stället för att anta att alla administrativa steg är samma som när båda bor i Sverige.',
      sourceOverview: 'Försäkringskassan: Underhåll – så funkar det',
      sourceSupport: 'Försäkringskassan: Om underhåll inte betalas fullt',
      sourceAbroad: 'Försäkringskassan: När en förälder bor utomlands',
      privacy: 'Vi skickar inte barnets namn eller exakta ålder, den andra förälderns identitet, adress, land, vårdnadsuppgifter, belopp eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida', feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', yes: 'Ja', no: 'Nej', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'نفقة الطفل – اعثر على المسار الصحيح', shellSub: 'ميّز بين النفقة المباشرة بين الوالدين ودعم النفقة لدى Försäkringskassan', eyebrow: 'طفل · والدان منفصلان · نفقة', title: 'أي مسار للنفقة يستحق التحقق؟', intro: 'يساعدك Stödassistenten على التفريق بين underhållsbidrag وunderhållsstöd. لا نقرر الاستحقاق أو المبلغ أو الحضانة أو ما يجب على شخص دفعه في حالة فردية.',
      qResidence: 'كيف يقيم الطفل بين الوالدين؟', mostly: 'يعيش الطفل معي كل الوقت أو معظم الوقت', equal: 'يعيش الطفل تقريباً بالتساوي مع كلا الوالدين', residenceUnsure: 'غير متأكد / الإقامة تتغير', qPayment: 'كيف يتم دفع النفقة من الوالد الآخر الآن؟', full: 'يتم الدفع وفق الاتفاق أو القرار', partial: 'يتم دفع جزء فقط', none: 'لا يتم دفع شيء', paymentUnsure: 'لا أعرف ما الذي يعد دفعاً صحيحاً',
      supportTitle: 'underhållsstöd مسار يستحق التحقق', supportBody: 'عندما يعيش الطفل معك كل الوقت أو معظمه ولا يدفع الوالد الآخر أو يدفع جزءاً فقط، لدى Försäkringskassan مسار منفصل لـ underhållsstöd. توجد شروط أخرى ويجب التحقق منها في المصدر الرسمي الحالي قبل افتراض الاستحقاق.', directTitle: 'ابدأ بمسار النفقة المباشرة', directBody: 'underhållsbidrag هو ترتيب مالي بين الوالدين يعتمد على احتياجات الطفل واقتصاد الوالدين. إذا كان الدفع يعمل فلا ينبغي لـ Stödassistenten أن يحوله تلقائياً إلى underhållsstöd.', equalTitle: 'الإقامة المتساوية تحتاج تقييماً مختلفاً', equalBody: 'عندما يعيش الطفل تقريباً بالتساوي مع كلا الوالدين، underhållsstöd ليس مساراً تلقائياً. وتوضح Försäkringskassan أن underhållsbidrag قد يبقى منطقياً عند وجود فرق اقتصادي كبير بين الوالدين.', verifyResidenceTitle: 'وضّح نمط الإقامة أولاً', verifyResidenceBody: 'نمط إقامة الطفل قد يغير المسار. لا يخمّن Stödassistenten ذلك من كلمة منفصل أو من وصف غير واضح.', verifyPaymentTitle: 'وضّح ما يتم دفعه فعلياً', verifyPaymentBody: 'الدفع الجزئي أو المنقطع أو المنتظم لا يؤدي إلى الخطوة نفسها. تحقق من الاتفاق أو القرار الحالي ومن المصدر الرسمي.', abroadTitle: 'إذا كان أحد الوالدين في الخارج فاستخدم المسار الدولي', abroadBody: 'توضح Försäkringskassan أن نوع المساعدة يمكن أن يعتمد على البلد الذي يعيش فيه الوالد الآخر. لا تفترض أن الإجراءات مطابقة للحالات داخل السويد.',
      sourceOverview: 'Försäkringskassan: كيف تعمل النفقة', sourceSupport: 'Försäkringskassan: إذا لم تُدفع النفقة كاملة', sourceAbroad: 'Försäkringskassan: إذا كان أحد الوالدين في الخارج', privacy: 'لا نرسل اسم الطفل أو عمره الدقيق أو هوية الوالد الآخر أو العنوان أو البلد أو معلومات الحضانة أو المبلغ أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية', feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', yes: 'نعم', no: 'لا', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'هزینه فرزند – مسیر درست را پیدا کنید', shellSub: 'پرداخت مستقیم بین والدین را از حمایت دولتی Försäkringskassan جدا کنید', eyebrow: 'فرزند · والدین جدا · هزینه نگهداری', title: 'کدام مسیر هزینه فرزند را باید بررسی کرد؟', intro: 'Stödassistenten تفاوت underhållsbidrag و underhållsstöd را روشن می‌کند، اما درباره استحقاق، مبلغ، حضانت یا تعهد فردی تصمیم نمی‌گیرد.',
      qResidence: 'فرزند بین دو والد چگونه زندگی می‌کند؟', mostly: 'همه یا بیشتر زمان با من زندگی می‌کند', equal: 'تقریباً به یک اندازه با هر دو والد زندگی می‌کند', residenceUnsure: 'مطمئن نیستم / الگو تغییر می‌کند', qPayment: 'پرداخت از طرف والد دیگر اکنون چگونه است؟', full: 'طبق توافق یا تصمیم پرداخت می‌شود', partial: 'فقط بخشی پرداخت می‌شود', none: 'چیزی پرداخت نمی‌شود', paymentUnsure: 'نمی‌دانم پرداخت درست چه مقدار/نوعی است',
      supportTitle: 'underhållsstöd یک مسیر قابل بررسی است', supportBody: 'اگر فرزند همه یا بیشتر زمان با شما زندگی می‌کند و والد دیگر پرداخت نمی‌کند یا فقط بخشی را می‌پردازد، Försäkringskassan مسیر جداگانه‌ای برای underhållsstöd دارد. شرایط دیگری نیز وجود دارد و باید قبل از فرض استحقاق در منبع رسمی فعلی بررسی شود.', directTitle: 'از مسیر پرداخت مستقیم شروع کنید', directBody: 'underhållsbidrag پرداختی است که والدین بر اساس نیاز فرزند و اقتصاد خود بین هم تنظیم می‌کنند. اگر پرداخت انجام می‌شود، Stödassistenten نباید خودکار آن را به underhållsstöd تبدیل کند.', equalTitle: 'اقامت تقریباً مساوی نیاز به مسیر متفاوت دارد', equalBody: 'وقتی فرزند تقریباً به یک اندازه نزد هر دو والد است، underhållsstöd مسیر خودکار نیست. Försäkringskassan همچنین می‌گوید تفاوت زیاد اقتصادی می‌تواند underhållsbidrag را همچنان مرتبط کند.', verifyResidenceTitle: 'ابتدا وضعیت اقامت را روشن کنید', verifyResidenceBody: 'الگوی اقامت می‌تواند مسیر را عوض کند. Stödassistenten از واژه‌هایی مثل جدایی یا هفته‌درمیان نتیجه‌گیری قطعی نمی‌کند.', verifyPaymentTitle: 'روشن کنید واقعاً چه چیزی پرداخت می‌شود', verifyPaymentBody: 'پرداخت کامل، جزئی و عدم پرداخت یک مسیر ندارند. توافق یا تصمیم فعلی و منبع رسمی را بررسی کنید.', abroadTitle: 'اگر یک والد خارج از سوئد است، مسیر بین‌المللی را بررسی کنید', abroadBody: 'Försäkringskassan می‌گوید کمک ممکن است به کشوری که والد دیگر در آن زندگی می‌کند بستگی داشته باشد. مراحل داخلی را برای همه کشورها یکسان فرض نکنید.',
      sourceOverview: 'Försäkringskassan: underhåll چگونه کار می‌کند', sourceSupport: 'Försäkringskassan: وقتی underhåll کامل پرداخت نمی‌شود', sourceAbroad: 'Försäkringskassan: وقتی یک والد خارج از کشور است', privacy: 'نام یا سن دقیق فرزند، هویت والد دیگر، نشانی، کشور، اطلاعات حضانت، مبلغ یا داستان شما را در URL یا بازخورد نمی‌فرستیم.', home: 'بازگشت به صفحه اصلی', feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', yes: 'بله', no: 'خیر', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(value) { const lang = String(value || '').toLowerCase(); return ['sv', 'ar', 'fa'].includes(lang) ? lang : 'sv'; }
  function detect(text) { return DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function detectContext(text) { const value = String(text || ''); return detect(value) && CROSS_BORDER_PATTERNS.some((pattern) => pattern.test(value)) ? 'cross_border' : null; }
  function handoffHref(lang, context) {
    const suffix = CONTEXTS.has(context) ? `&maintenance_context=${encodeURIComponent(context)}` : '';
    return `person-pilot.html?actor_type=private_person&focus=child_maintenance&lang=${encodeURIComponent(safeLang(lang))}${suffix}`;
  }
  function nextStep(state) {
    state = state || {};
    if (!state.residence) return 'ask_residence';
    if (state.residence === 'unsure') return 'verify_residence';
    if (state.residence === 'equal') return 'equal_residence';
    if (!state.payment) return 'ask_payment';
    if (state.payment === 'unsure') return 'verify_payment';
    if (state.payment === 'full') return 'direct_maintenance';
    return state.context === 'cross_border' ? 'cross_border_support_candidate' : 'support_candidate';
  }
  function pageLang(win) { const params = new URLSearchParams(win.location.search); return safeLang(params.get('lang') || win.document.documentElement.lang); }

  function rootHandoff(win) {
    const doc = win.document, input = doc.getElementById('situation'), box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden || !detect(input.value)) return false;
    if (box.querySelector('[data-child-maintenance-route="true"]')) return true;
    const lang = pageLang(win), c = COPY[lang], context = detectContext(input.value);
    const route = doc.createElement('a'); route.className = 'route'; route.dataset.childMaintenanceRoute = 'true'; route.href = handoffHref(lang, context);
    const left = doc.createElement('span'), title = doc.createElement('strong'), sub = doc.createElement('small'); title.textContent = c.shellTitle; sub.textContent = c.shellSub; left.append(title, sub);
    const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→'; route.append(left, arrow); box.insertBefore(route, box.querySelector('a.route') || null); return true;
  }

  function focusedApp(win) {
    const doc = win.document, main = doc.getElementById('main'); if (!main) return;
    const params = new URLSearchParams(win.location.search), lang = pageLang(win), c = COPY[lang];
    const context = CONTEXTS.has(params.get('maintenance_context')) ? params.get('maintenance_context') : null;
    const state = { context }, feedback = {};
    doc.documentElement.lang = lang; doc.documentElement.dir = (lang === 'ar' || lang === 'fa') ? 'rtl' : 'ltr'; doc.body.classList.toggle('rtl', lang === 'ar' || lang === 'fa');

    function choice(label, value, fn) { const b = doc.createElement('button'); b.type = 'button'; b.className = 'choice'; b.textContent = label; b.dataset.value = value; b.addEventListener('click', fn); return b; }
    function question(title, key, options) { const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h2'); h.textContent = title; card.append(h); options.forEach(([value, label]) => card.append(choice(label, value, () => { state[key] = value; render(); }))); return card; }
    function link(url, label) { const a = doc.createElement('a'); a.className = 'source'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label; return a; }
    function result(kind) {
      const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h2'), p = doc.createElement('p');
      if (kind === 'support_candidate') { h.textContent = c.supportTitle; p.textContent = c.supportBody; }
      else if (kind === 'cross_border_support_candidate') { h.textContent = c.abroadTitle; p.textContent = `${c.supportBody} ${c.abroadBody}`; }
      else if (kind === 'direct_maintenance') { h.textContent = c.directTitle; p.textContent = c.directBody; }
      else if (kind === 'equal_residence') { h.textContent = c.equalTitle; p.textContent = c.equalBody; }
      else if (kind === 'verify_residence') { h.textContent = c.verifyResidenceTitle; p.textContent = c.verifyResidenceBody; }
      else { h.textContent = c.verifyPaymentTitle; p.textContent = c.verifyPaymentBody; }
      const sources = doc.createElement('p'); sources.append(link(FK_OVERVIEW_URL, c.sourceOverview), doc.createTextNode(' · '), link(FK_SUPPORT_URL, c.sourceSupport));
      if (context === 'cross_border') sources.append(doc.createTextNode(' · '), link(FK_ABROAD_URL, c.sourceAbroad));
      const privacy = doc.createElement('div'); privacy.className = 'privacy'; privacy.textContent = c.privacy;
      const home = doc.createElement('p'), a = doc.createElement('a'); a.className = 'source'; a.href = `index.html?lang=${encodeURIComponent(lang)}`; a.textContent = c.home; home.append(a);
      card.append(h, p, sources, privacy, home); return card;
    }
    function feedbackCard() {
      const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h3'); h.textContent = c.feedback; card.append(h);
      [['learned_new', c.learned], ['useful', c.useful], ['next_step_clear', c.clear]].forEach(([key, label]) => { const p = doc.createElement('p'); p.textContent = label; card.append(p); const row = doc.createElement('div'); row.className = 'fbs'; [[true,c.yes],[false,c.no]].forEach(([value,text]) => { const b = choice(text, String(value), () => { feedback[key] = value; Array.from(row.children).forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); }); b.className = 'fb'; row.append(b); }); card.append(row); });
      const send = doc.createElement('button'); send.type = 'button'; send.className = 'btn primary'; send.textContent = c.send; const status = doc.createElement('div'); status.className = 'status';
      send.addEventListener('click', async () => { if (!['learned_new','useful','next_step_clear'].every((key) => typeof feedback[key] === 'boolean')) { status.textContent = c.error; status.className = 'status err'; return; } send.disabled = true; try { const res = await win.fetch(FEEDBACK_URL, {method:'POST', mode:'cors', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app_version:'0.5.1', language:lang, flow:'child_maintenance', learned_new:feedback.learned_new, useful:feedback.useful, next_step_clear:feedback.next_step_clear, ratings:{route:'child_maintenance'}})}); if (!res.ok) throw new Error('feedback'); status.textContent = c.sent; status.className = 'status ok'; } catch (_) { status.textContent = c.error; status.className = 'status err'; } finally { send.disabled = false; } });
      card.append(send, status); return card;
    }
    function render() {
      main.textContent = ''; const hero = doc.createElement('section'); hero.className = 'card hero'; const eye = doc.createElement('div'); eye.className = 'eyebrow'; eye.textContent = c.eyebrow; const h = doc.createElement('h1'); h.textContent = c.title; const p = doc.createElement('p'); p.className = 'muted'; p.textContent = c.intro; hero.append(eye,h,p); main.append(hero);
      const step = nextStep(state);
      if (step === 'ask_residence') main.append(question(c.qResidence, 'residence', [['mostly',c.mostly],['equal',c.equal],['unsure',c.residenceUnsure]]));
      else if (step === 'ask_payment') main.append(question(c.qPayment, 'payment', [['full',c.full],['partial',c.partial],['none',c.none],['unsure',c.paymentUnsure]]));
      else main.append(result(step), feedbackCard());
    }
    render();
  }

  function hookRoot(win) { const button = win.document.getElementById('analyzeBtn'), input = win.document.getElementById('situation'); if (!button || !input) return; button.addEventListener('click', () => win.setTimeout(() => rootHandoff(win), 0)); input.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') win.setTimeout(() => rootHandoff(win), 0); }); }
  function hookPerson(win) { const params = new URLSearchParams(win.location.search); if (String(params.get('focus') || '').toLowerCase() === 'child_maintenance') focusedApp(win); }
  function init(win) { const path = (win.location.pathname || '').split('/').pop(); if (!path || path === 'index.html') hookRoot(win); if (path === 'person-pilot.html') hookPerson(win); }
  return { detect, detectContext, handoffHref, nextStep, rootHandoff, init, FK_OVERVIEW_URL, FK_SUPPORT_URL, FK_ABROAD_URL };
});