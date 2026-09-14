(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODOlderHomeSupportGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product guidance only. This module separates social home support from
  // healthcare at home and sends the user to current official sources. It does
  // not decide eligibility, hours, fees, medical need or local responsibility.
  const SOCIALSTYRELSEN_URL = 'https://www.socialstyrelsen.se/stod-i-livet/aldre/';
  const CARE_1177_URL = 'https://www.1177.se/sa-fungerar-varden/olika-vardformer/aldreomsorg/';
  const SOL_URL = 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/socialtjanstlag-2025400_sfs-2025-400/';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const DIRECT_PATTERNS = [
    /hemtjänst|äldreomsorg|trygghetslarm|hjälp\s+hemma|stöd\s+hemma|bo\s+kvar\s+hemma|hemsjukvård/i,
    /(?:mamma|pappa|mor|far|äldre|gammal|pensionär).*(?:städa|tvätta|handla|duscha|klä\s+på|äta|laga\s+mat|klarar\s+inte.*hemma|hjälp.*hemma)/i,
    /(?:städa|tvätta|handla|duscha|klä\s+på|äta|laga\s+mat|hjälp.*hemma).*(?:mamma|pappa|mor|far|äldre|gammal|pensionär)/i,
    /(?:والدتي|والدي|أمي|أبي|مسن|كبير\s*السن).*(?:مساعدة\s*في\s*المنزل|تنظيف|طبخ|استحمام|تسوق|رعاية\s*منزلية)/i,
    /(?:مساعدة\s*في\s*المنزل|تنظيف|طبخ|استحمام|تسوق|رعاية\s*منزلية).*(?:والدتي|والدي|أمي|أبي|مسن|كبير\s*السن)/i,
    /(?:مادرم|پدرم|مادر|پدر|سالمند).*(?:کمک\s*در\s*خانه|نظافت|آشپزی|حمام|خرید|مراقبت\s*در\s*منزل)/i,
    /(?:کمک\s*در\s*خانه|نظافت|آشپزی|حمام|خرید|مراقبت\s*در\s*منزل).*(?:مادرم|پدرم|مادر|پدر|سالمند)/i
  ];
  const SOCIAL_PATTERNS = [
    /hemtjänst|äldreomsorg|trygghetslarm|städa|tvätta|handla|duscha|klä\s+på|måltid|laga\s+mat|personlig\s+hygien|hjälp\s+hemma/i,
    /تنظيف|طبخ|استحمام|تسوق|مساعدة\s*في\s*المنزل|رعاية\s*منزلية/i,
    /نظافت|آشپزی|حمام|خرید|کمک\s*در\s*خانه|مراقبت\s*روزمره/i
  ];
  const HEALTH_PATTERNS = [
    /hemsjukvård|sjukskötersk.*hemma|vård\s+hemma|omläggning|sårvård|injektion|medicinsk.*hemma/i,
    /رعاية\s*صحية\s*في\s*المنزل|تمريض\s*منزلي|ممرضة.*المنزل|حقن|تضميد/i,
    /مراقبت\s*پزشکی\s*در\s*منزل|پرستار.*خانه|تزریق|پانسمان|درمان.*خانه/i
  ];

  const COPY = {
    sv: {
      shellTitle: 'Hjälp hemma för äldre – skilj vardagsstöd från vård',
      shellSub: 'En fråga som avgör om nästa väg är äldreomsorg, hemsjukvård eller båda',
      eyebrow: 'Äldre · stöd hemma', title: 'Vilken sorts hjälp behövs hemma?',
      intro: 'Stödassistenten hjälper dig sortera rätt väg utan att gissa rätt till en insats, timmar, avgift eller vem som ansvarar lokalt.',
      question: 'Vad behöver personen främst hjälp med?',
      social: 'Vardag och personlig omsorg – till exempel städning, mat, inköp eller dusch',
      health: 'Hälso- och sjukvård hemma – till exempel sjuksköterska, omläggning eller behandling',
      both: 'Både vardagsstöd och vård hemma', unsure: 'Jag är osäker',
      socialTitle: 'Börja med kommunens äldreomsorg/socialtjänst',
      socialBody: 'Hemtjänst kan ge stöd för att bo kvar hemma, till exempel med måltider, städning, inköp och personlig omvårdnad. Kontrollera den aktuella vägen på din kommuns officiella webbplats. Socialtjänstlagen gör det möjligt för kommunen att erbjuda vissa personliga insatser utan individuell behovsprövning, medan andra insatser prövas individuellt. Därför ska Stödassistenten inte lova en viss lokal ansöknings- eller bedömningsprocess.',
      healthTitle: 'Hemsjukvård är en vårdväg – inte samma sak som hemtjänst',
      healthBody: 'Hälso- och sjukvård i hemmet kan vara kommunens eller regionens ansvar beroende på var personen bor. Kontrollera 1177 och aktuell lokal information innan du väljer kontaktväg. Stödassistenten bedömer inte medicinskt behov.',
      bothTitle: 'Håll isär två spår och kontrollera båda lokalt',
      bothBody: 'Vardagshjälp och medicinsk vård hemma kan behöva samordnas, men de är inte samma tjänst. Kontrollera kommunens äldreomsorg för vardagsstödet och 1177/lokal vårdinformation för hemsjukvården. Anta inte att samma organisation ansvarar för båda.',
      unsureTitle: 'Sortera först: vardagsstöd eller vård',
      unsureBody: 'Om du inte vet vilket spår behovet hör till kan du börja med kommunens äldreomsorg/socialtjänst för vardagsstöd och 1177 för vårdfrågor. Beskriv behovet kort utan känsliga detaljer och be om rätt aktuell kontaktväg.',
      sourceSocial: 'Socialstyrelsen: Äldre', source1177: '1177: Äldreomsorg', sourceLaw: 'Riksdagen: Socialtjänstlag (2025:400)',
      privacy: 'Skicka inte namn, personnummer, exakt adress, diagnos, läkemedel, journaluppgifter eller en rå berättelse i länken eller feedbacken.',
      feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', yes: 'Ja', no: 'Nej', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.', home: 'Till Stödassistentens startsida'
    },
    ar: {
      shellTitle: 'مساعدة كبار السن في المنزل – فرّق بين دعم الحياة اليومية والرعاية الصحية', shellSub: 'سؤال واحد يحدد مسار الرعاية الاجتماعية أو الصحية أو كليهما',
      eyebrow: 'كبار السن · دعم في المنزل', title: 'ما نوع المساعدة المطلوبة في المنزل؟', intro: 'يساعدك Stödassistenten على تحديد المسار دون أن يقرر الاستحقاق أو الساعات أو الرسوم أو المسؤول المحلي.',
      question: 'ما نوع المساعدة الأهم الآن؟', social: 'الحياة اليومية والعناية الشخصية – مثل التنظيف والطعام والتسوق والاستحمام', health: 'رعاية صحية في المنزل – مثل التمريض أو التضميد أو العلاج', both: 'كلاهما: دعم يومي ورعاية صحية', unsure: 'لست متأكداً',
      socialTitle: 'ابدأ بخدمات كبار السن/الخدمات الاجتماعية في البلدية', socialBody: 'قد تساعد hemtjänst في الوجبات والتنظيف والتسوق والعناية الشخصية. تحقق من المسار الحالي في الموقع الرسمي لبلديتك. يسمح قانون الخدمات الاجتماعية للبلدية بتقديم بعض خدمات الاحتياجات الشخصية من دون تقييم فردي، بينما تُقيّم خدمات أخرى فردياً؛ لذلك لا يفترض Stödassistenten إجراءً محلياً واحداً للجميع.',
      healthTitle: 'الرعاية الصحية المنزلية مسار صحي وليست هي hemtjänst', healthBody: 'قد تكون مسؤولية الرعاية الصحية في المنزل لدى البلدية أو المنطقة بحسب مكان السكن. تحقق من 1177 والمعلومات المحلية الحالية. Stödassistenten لا يقيّم الحاجة الطبية.',
      bothTitle: 'افصل بين المسارين وتحقق من كليهما محلياً', bothBody: 'المساعدة اليومية والرعاية الطبية في المنزل قد تحتاجان إلى تنسيق لكنهما ليستا الخدمة نفسها. تحقق من خدمات كبار السن في البلدية للدعم اليومي ومن 1177/المعلومات المحلية للرعاية الصحية.',
      unsureTitle: 'ابدأ بتمييز الدعم اليومي عن الرعاية الصحية', unsureBody: 'إذا لم تعرف المسار، ابدأ بالبلدية في مسائل الدعم اليومي وبـ1177 في مسائل الرعاية الصحية واطلب جهة الاتصال الحالية الصحيحة.',
      sourceSocial: 'Socialstyrelsen: معلومات لكبار السن', source1177: '1177: رعاية كبار السن', sourceLaw: 'Riksdagen: قانون الخدمات الاجتماعية', privacy: 'لا ترسل الاسم أو الرقم الشخصي أو العنوان الدقيق أو التشخيص أو الأدوية أو معلومات السجل الطبي أو القصة الخام في الرابط أو الملاحظات.',
      feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', yes: 'نعم', no: 'لا', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.', home: 'إلى الصفحة الرئيسية لـ Stödassistenten'
    },
    fa: {
      shellTitle: 'کمک در خانه برای سالمندان – پشتیبانی روزمره را از مراقبت پزشکی جدا کنید', shellSub: 'یک پرسش برای انتخاب مسیر خدمات اجتماعی، درمان در خانه یا هر دو',
      eyebrow: 'سالمند · کمک در خانه', title: 'چه نوع کمکی در خانه لازم است؟', intro: 'Stödassistenten مسیر را مرتب می‌کند اما استحقاق، ساعت، هزینه یا مسئول محلی را تعیین نمی‌کند.',
      question: 'مهم‌ترین نوع کمک چیست؟', social: 'زندگی روزمره و مراقبت شخصی – مثل نظافت، غذا، خرید یا حمام', health: 'مراقبت پزشکی در خانه – مثل پرستار، پانسمان یا درمان', both: 'هر دو: کمک روزمره و مراقبت پزشکی', unsure: 'مطمئن نیستم',
      socialTitle: 'از خدمات سالمندان/خدمات اجتماعی شهرداری شروع کنید', socialBody: 'hemtjänst می‌تواند برای غذا، نظافت، خرید و مراقبت شخصی کمک کند. مسیر فعلی را در وب‌سایت رسمی شهرداری خود بررسی کنید. قانون خدمات اجتماعی اجازه می‌دهد بعضی خدمات نیازهای شخصی بدون ارزیابی فردی ارائه شوند و بعضی خدمات به ارزیابی فردی نیاز دارند؛ بنابراین Stödassistenten یک فرایند محلی ثابت را فرض نمی‌کند.',
      healthTitle: 'مراقبت پزشکی در خانه با hemtjänst یکسان نیست', healthBody: 'مسئول مراقبت پزشکی در خانه بسته به محل زندگی می‌تواند شهرداری یا منطقه باشد. اطلاعات فعلی 1177 و محلی را بررسی کنید. Stödassistenten نیاز پزشکی را ارزیابی نمی‌کند.',
      bothTitle: 'دو مسیر را جدا نگه دارید و هر دو را محلی بررسی کنید', bothBody: 'کمک روزمره و مراقبت پزشکی در خانه ممکن است نیاز به هماهنگی داشته باشند، اما یک خدمت نیستند. برای پشتیبانی روزمره خدمات سالمندان شهرداری و برای مراقبت پزشکی 1177/اطلاعات محلی را بررسی کنید.',
      unsureTitle: 'ابتدا کمک روزمره را از مراقبت پزشکی جدا کنید', unsureBody: 'اگر مطمئن نیستید، برای پشتیبانی روزمره از شهرداری و برای پرسش‌های درمانی از 1177 شروع کنید و مسیر تماس فعلی را بخواهید.',
      sourceSocial: 'Socialstyrelsen: سالمندان', source1177: '1177: مراقبت از سالمندان', sourceLaw: 'Riksdagen: قانون خدمات اجتماعی', privacy: 'نام، شماره شخصی، نشانی دقیق، تشخیص، دارو، پرونده پزشکی یا روایت خام را در لینک یا بازخورد نفرستید.',
      feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', yes: 'بله', no: 'خیر', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.', home: 'بازگشت به Stödassistenten'
    }
  };

  function safeLang(lang) { const value = String(lang || '').toLowerCase(); return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function detect(text) { return DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function detectNeed(text) {
    const value = String(text || '');
    const social = SOCIAL_PATTERNS.some((pattern) => pattern.test(value));
    const health = HEALTH_PATTERNS.some((pattern) => pattern.test(value));
    if (social && health) return 'both';
    if (health) return 'healthcare';
    if (social) return 'social_care';
    return 'unsure';
  }
  function safeNeed(value) { return ['social_care', 'healthcare', 'both', 'unsure'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : null; }
  function handoffHref(lang, need) {
    const params = new URLSearchParams({ focus: 'older_home_support', lang: safeLang(lang) });
    const safe = safeNeed(need); if (safe && safe !== 'unsure') params.set('support_need', safe);
    return `person-pilot.html?${params.toString()}`;
  }
  function pageLang(win) { const params = new URLSearchParams(win.location.search); return safeLang(params.get('lang') || win.document.documentElement.lang); }

  function rootHandoff(win) {
    const doc = win.document; const input = doc.getElementById('situation'); const box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden || !detect(input.value)) return false;
    if (box.querySelector('[data-older-home-support-route="true"]')) return true;
    const lang = pageLang(win); const c = COPY[lang]; const need = detectNeed(input.value);
    const route = doc.createElement('a'); route.className = 'route'; route.dataset.olderHomeSupportRoute = 'true'; route.href = handoffHref(lang, need);
    const left = doc.createElement('span'); const title = doc.createElement('strong'); title.textContent = c.shellTitle; const sub = doc.createElement('small'); sub.textContent = c.shellSub; left.append(title, sub);
    const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→'; route.append(left, arrow);
    box.insertBefore(route, box.querySelector('a.route') || null); return true;
  }

  function focusedApp(win) {
    const doc = win.document; const main = doc.getElementById('main'); if (!main) return;
    const params = new URLSearchParams(win.location.search); const lang = pageLang(win); let need = safeNeed(params.get('support_need')); const feedback = {};
    const c = COPY[lang]; const rtl = lang === 'ar' || lang === 'fa'; doc.documentElement.lang = lang; doc.documentElement.dir = rtl ? 'rtl' : 'ltr'; doc.body.classList.toggle('rtl', rtl);
    function sourceLink(url, label) { const a = doc.createElement('a'); a.className = 'source'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label; return a; }
    function choice(label, value) { const b = doc.createElement('button'); b.type = 'button'; b.className = 'choice'; b.textContent = label; b.addEventListener('click', () => { need = value; render(); }); return b; }
    function resultCard() {
      const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h2'); const p = doc.createElement('p');
      if (need === 'social_care') { h.textContent = c.socialTitle; p.textContent = c.socialBody; }
      else if (need === 'healthcare') { h.textContent = c.healthTitle; p.textContent = c.healthBody; }
      else if (need === 'both') { h.textContent = c.bothTitle; p.textContent = c.bothBody; }
      else { h.textContent = c.unsureTitle; p.textContent = c.unsureBody; }
      const sources = doc.createElement('p'); sources.append(sourceLink(SOCIALSTYRELSEN_URL, c.sourceSocial), doc.createTextNode(' · '), sourceLink(CARE_1177_URL, c.source1177), doc.createTextNode(' · '), sourceLink(SOL_URL, c.sourceLaw));
      const privacy = doc.createElement('div'); privacy.className = 'privacy'; privacy.textContent = c.privacy;
      const home = doc.createElement('p'); const a = doc.createElement('a'); a.className = 'source'; a.href = `index.html?lang=${encodeURIComponent(lang)}`; a.textContent = c.home; home.append(a);
      card.append(h, p, sources, privacy, home); return card;
    }
    function feedbackCard() {
      const card = doc.createElement('section'); card.className = 'card'; const h = doc.createElement('h3'); h.textContent = c.feedback; card.append(h);
      [['learned_new', c.learned], ['useful', c.useful], ['next_step_clear', c.clear]].forEach(([key, label]) => { const p = doc.createElement('p'); p.textContent = label; card.append(p); const row = doc.createElement('div'); row.className = 'fbs'; [['true', c.yes], ['false', c.no]].forEach(([value, text]) => { const b = doc.createElement('button'); b.type = 'button'; b.className = 'fb'; b.textContent = text; b.addEventListener('click', () => { feedback[key] = value === 'true'; Array.from(row.children).forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); }); row.append(b); }); card.append(row); });
      const send = doc.createElement('button'); send.type = 'button'; send.className = 'btn primary'; send.textContent = c.send; const status = doc.createElement('div'); status.className = 'status';
      send.addEventListener('click', async () => { if (!['learned_new','useful','next_step_clear'].every((key) => typeof feedback[key] === 'boolean')) { status.textContent = c.error; status.className = 'status err'; return; } send.disabled = true; try { const res = await win.fetch(FEEDBACK_URL, { method:'POST', mode:'cors', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', headers:{'Content-Type':'application/json'}, body:JSON.stringify({app_version:'0.5.3',language:lang,flow:'older_home_support',learned_new:feedback.learned_new,useful:feedback.useful,next_step_clear:feedback.next_step_clear,ratings:{route:'older_home_support',support_need:need || 'unsure'}}) }); if (!res.ok) throw new Error('feedback'); status.textContent = c.sent; status.className = 'status ok'; } catch (_) { status.textContent = c.error; status.className = 'status err'; } finally { send.disabled = false; } });
      card.append(send, status); return card;
    }
    function render() {
      main.textContent = ''; const hero = doc.createElement('section'); hero.className = 'card hero'; const eye = doc.createElement('div'); eye.className = 'eyebrow'; eye.textContent = c.eyebrow; const h1 = doc.createElement('h1'); h1.textContent = c.title; const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = c.intro; hero.append(eye, h1, intro); main.append(hero);
      if (!need) { const q = doc.createElement('section'); q.className = 'card'; const h = doc.createElement('h2'); h.textContent = c.question; q.append(h, choice(c.social, 'social_care'), choice(c.health, 'healthcare'), choice(c.both, 'both'), choice(c.unsure, 'unsure')); main.append(q); }
      else main.append(resultCard(), feedbackCard());
    }
    render();
  }

  function hookRoot(win) { const button = win.document.getElementById('analyzeBtn'); const input = win.document.getElementById('situation'); if (!button || !input) return; button.addEventListener('click', () => win.setTimeout(() => rootHandoff(win), 0)); input.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') win.setTimeout(() => rootHandoff(win), 0); }); }
  function hookPerson(win) { const params = new URLSearchParams(win.location.search); if (String(params.get('focus') || '').toLowerCase() === 'older_home_support') focusedApp(win); }
  function init(win) { const path = (win.location.pathname || '').split('/').pop(); if (!path || path === 'index.html') hookRoot(win); if (path === 'person-pilot.html') hookPerson(win); }

  return { detect, detectNeed, handoffHref, rootHandoff, init, SOCIALSTYRELSEN_URL, CARE_1177_URL, SOL_URL };
});
