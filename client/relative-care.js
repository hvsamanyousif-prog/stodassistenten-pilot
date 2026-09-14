(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODRelativeCare = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const FK_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/stodja-en-svart-sjuk-narstaende';

  const DIRECT_PATTERNS = [
    /\bnärståendepenning\b/i,
    /إعانة\s+رعاية\s+قريب|تعويض\s+رعاية\s+قريب/i,
    /کمک(?:‌|\s)*هزینه\s+مراقبت\s+از\s+نزدیکان/i,
  ];
  const SERIOUS_PATTERNS = [
    /\b(?:livshotande|svårt\s+sjuk|allvarligt\s+sjuk)\b/i,
    /مهدد(?:ة)?\s+للحياة|مريض(?:ة)?\s+بشدة|مرض\s+خطير/i,
    /تهدیدکننده\s+زندگی|بیمار(?:ی)?\s+بسیار\s+شدید|بیماری\s+خطرناک/i,
  ];
  const RELATION_PATTERNS = [
    /\b(?:närstående|mamma|pappa|mor|far|partner|make|maka|sambo|vän|granne|anhörig)\b/i,
    /قريب|والد|والدة|أمي|أبي|شريك|زوج|زوجة|صديق|جار/i,
    /نزدیک|مادر|پدر|همسر|شریک|دوست|همسایه/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Stödja någon som är svårt sjuk',
      shellSub: 'Kontrollera närståendepenning och nästa säkra steg',
      eyebrow: 'Närstående',
      title: 'Du verkar behöva vara nära någon som är svårt sjuk',
      intro: 'Vi ställer bara frågor som kan ändra vägen. Piloten avgör inte rätt till ersättning och sparar inte dina svar i den anonyma feedbacken.',
      qLife: 'Har vården sagt att personens hälsotillstånd är livshotande?',
      qForego: 'Behöver du avstå från arbete, a-kassa eller föräldrapenning för att vara nära och stödja personen?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      likelyTitle: 'Närståendepenning är en väg att kontrollera',
      likelyBody: 'Försäkringskassan beskriver närståendepenning för den som behöver avstå från arbete eller viss annan ersättning för att stödja en närstående med ett livshotande hälsotillstånd. Be vården om rätt läkarutlåtande och kontrollera den aktuella ansökningsvägen hos Försäkringskassan innan du antar att villkoren är uppfyllda.',
      lifeNoTitle: 'Den här ersättningen verkar inte vara rätt första väg',
      lifeNoBody: 'Försäkringskassan skiljer närståendepenning från mer långvarigt eller vardagligt stödbehov. Ett vanligt omsorgsbehov eller åldersrelaterat hjälpbehov är inte i sig samma sak som ett livshotande hälsotillstånd. Andra stöd för närstående kan fortfarande vara relevanta.',
      lifeUnsureTitle: 'Klargör hälsotillståndet innan du går vidare',
      lifeUnsureBody: 'Be vården förklara om tillståndet motsvarar Försäkringskassans krav för närståendepenning och om läkarutlåtande kan utfärdas. Piloten ska inte gissa utifrån diagnos eller allvarlighetsord.',
      foregoNoTitle: 'Kontrollera andra närståendestöd',
      foregoNoBody: 'Närståendepenning är kopplad till att den som stödjer avstår från arbete eller viss annan ersättning. Om du inte gör det ska piloten inte lova kontant ersättning; använd den officiella sidan för att kontrollera andra vägar.',
      foregoUnsureTitle: 'Fastställ vilken tid eller ersättning du faktiskt avstår',
      foregoUnsureBody: 'Det kan ändra om närståendepenning är relevant. Kontrollera din arbetstid eller den ersättning du annars skulle ha fått innan du ansöker.',
      source: 'Försäkringskassan: stödja en svårt sjuk närstående',
    },
    ar: {
      shellTitle: 'دعم شخص مريض جداً', shellSub: 'تحقق من مسار تعويض رعاية قريب والخطوة الآمنة التالية', eyebrow: 'دعم شخص قريب',
      title: 'يبدو أنك تحتاج إلى البقاء بجانب شخص مريض جداً', intro: 'نسأل فقط ما يمكن أن يغيّر المسار. النسخة التجريبية لا تقرر الاستحقاق ولا تضع إجاباتك في الملاحظات المجهولة.',
      qLife: 'هل قالت الرعاية الصحية إن الحالة مهددة للحياة؟', qForego: 'هل تحتاج إلى ترك العمل أو تعويض البطالة أو إجازة الوالدين لتكون مع الشخص وتدعمه؟',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      likelyTitle: 'من المفيد التحقق من närståendepenning', likelyBody: 'تصف Försäkringskassan هذا التعويض لمن يترك العمل أو بعض التعويضات الأخرى لدعم شخص قريب لديه حالة مهددة للحياة. اطلب من الرعاية الصحية الشهادة الطبية المناسبة وتحقق من طريقة التقديم الحالية قبل افتراض استيفاء الشروط.',
      lifeNoTitle: 'هذا التعويض ليس المسار الأول على الأرجح', lifeNoBody: 'تفرّق Försäkringskassan بين الحالة المهددة للحياة وبين الحاجة اليومية أو طويلة الأمد للمساعدة. قد توجد أشكال دعم أخرى للشخص القريب.',
      lifeUnsureTitle: 'وضّح الحالة الصحية أولاً', lifeUnsureBody: 'اسأل الرعاية الصحية إن كانت الحالة توافق متطلبات Försäkringskassan لهذا التعويض وما إذا كان يمكن إصدار شهادة طبية. لا ينبغي للنسخة التجريبية أن تستنتج ذلك من التشخيص وحده.',
      foregoNoTitle: 'تحقق من أشكال دعم أخرى', foregoNoBody: 'يرتبط هذا التعويض بترك العمل أو بعض التعويضات الأخرى. إذا لم يحدث ذلك فلا ينبغي للنسخة التجريبية أن تعد بتعويض مالي.',
      foregoUnsureTitle: 'حدّد الوقت أو التعويض الذي ستتركه', foregoUnsureBody: 'قد يغيّر ذلك مدى ملاءمة المسار. تحقق من وقت العمل أو التعويض الذي كنت ستحصل عليه قبل التقديم.',
      source: 'Försäkringskassan: دعم شخص مريض جداً',
    },
    fa: {
      shellTitle: 'حمایت از فردی که بسیار بیمار است', shellSub: 'مسیر کمک‌هزینه نزدیکان و قدم امن بعدی را بررسی کن', eyebrow: 'حمایت از نزدیکان',
      title: 'به نظر می‌رسد لازم است کنار فردی که بسیار بیمار است باشی', intro: 'فقط سؤال‌هایی را می‌پرسیم که می‌توانند مسیر را تغییر دهند. پایلوت درباره استحقاق تصمیم نمی‌گیرد و پاسخ‌هایت را در بازخورد ناشناس ذخیره نمی‌کند.',
      qLife: 'آیا خدمات درمانی گفته‌اند وضعیت فرد تهدیدکننده زندگی است؟', qForego: 'آیا برای کنار فرد بودن و حمایت از او باید از کار، بیمه بیکاری یا مزایای والدین صرف‌نظر کنی؟',
      yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      likelyTitle: 'ارزش دارد närståendepenning را بررسی کنی', likelyBody: 'Försäkringskassan این کمک را برای کسی توضیح می‌دهد که برای حمایت از فرد نزدیک با وضعیت تهدیدکننده زندگی از کار یا بعضی مزایای دیگر صرف‌نظر می‌کند. از درمانگر درباره گواهی پزشکی لازم بپرس و مسیر فعلی درخواست را در منبع رسمی بررسی کن.',
      lifeNoTitle: 'این کمک احتمالاً اولین مسیر مناسب نیست', lifeNoBody: 'Försäkringskassan نیاز روزمره یا طولانی‌مدت به کمک را از وضعیت تهدیدکننده زندگی جدا می‌کند. حمایت‌های دیگری برای نزدیکان ممکن است مرتبط باشند.',
      lifeUnsureTitle: 'اول وضعیت پزشکی را روشن کن', lifeUnsureBody: 'از خدمات درمانی بپرس آیا وضعیت با شرایط Försäkringskassan برای این کمک همخوانی دارد و آیا گواهی پزشکی قابل صدور است. پایلوت نباید فقط از روی تشخیص حدس بزند.',
      foregoNoTitle: 'حمایت‌های دیگر برای نزدیکان را بررسی کن', foregoNoBody: 'این کمک به صرف‌نظر کردن از کار یا بعضی مزایای دیگر مرتبط است. اگر چنین نیست، پایلوت نباید وعده پرداخت نقدی بدهد.',
      foregoUnsureTitle: 'مشخص کن از چه زمان یا مزایایی صرف‌نظر می‌کنی', foregoUnsureBody: 'این موضوع می‌تواند مسیر را تغییر دهد. پیش از درخواست، زمان کار یا مزایایی را که در غیر این صورت می‌گرفتی بررسی کن.',
      source: 'Försäkringskassan: حمایت از فرد بسیار بیمار',
    },
  };

  function normalize(text) { return String(text || '').normalize('NFKC').trim(); }
  function safeLang(value) { return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function detect(text) {
    const value = normalize(text);
    if (!value) return false;
    if (DIRECT_PATTERNS.some((pattern) => pattern.test(value))) return true;
    return SERIOUS_PATTERNS.some((pattern) => pattern.test(value)) && RELATION_PATTERNS.some((pattern) => pattern.test(value));
  }
  function handoffHref(language) {
    const lang = safeLang(language);
    return `person-pilot.html?actor_type=relative&focus=relative_care&lang=${encodeURIComponent(lang)}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;
    const enhance = () => {
      if (!detect(input.value) || box.hidden) return;
      if (box.querySelector('[data-relative-care-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.relativeCareRoute = 'true';
      link.href = handoffHref(lang);
      const text = doc.createElement('span');
      const title = doc.createElement('strong');
      title.textContent = copy.shellTitle;
      const sub = doc.createElement('small');
      sub.textContent = copy.shellSub;
      text.append(title, sub);
      const arrow = doc.createElement('span');
      arrow.className = 'arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      link.append(text, arrow);
      box.insertBefore(link, box.querySelector('a.route') || null);
    };
    button.addEventListener('click', () => win.setTimeout(enhance, 0));
    input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') win.setTimeout(enhance, 0);
    });
  }

  function appendSource(doc, parent, label) {
    const link = doc.createElement('a');
    link.className = 'source';
    link.href = FK_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    parent.appendChild(link);
  }

  function addPersonGuidance(win) {
    const doc = win.document;
    const params = new URLSearchParams(win.location.search);
    if (String(params.get('focus') || '').toLowerCase() !== 'relative_care') return;
    if (doc.getElementById('relativeCareGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;
    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const section = doc.createElement('section');
    section.id = 'relativeCareGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'relativeCareTitle');
    main.parentNode.insertBefore(section, main);
    const state = { life: null, forego: null };

    function choice(label, value, group) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.setAttribute('aria-pressed', String(state[group] === value));
      el.addEventListener('click', () => {
        state[group] = value;
        if (group === 'life') state.forego = null;
        render();
      });
      return el;
    }
    function result(titleText, bodyText) {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = titleText;
      const body = doc.createElement('p');
      body.textContent = bodyText;
      body.style.marginBottom = '8px';
      box.append(title, body);
      appendSource(doc, box, copy.source);
      return box;
    }
    function group(label, key) {
      const wrap = doc.createElement('div');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', label);
      wrap.append(choice(copy.yes, 'yes', key), choice(copy.no, 'no', key), choice(copy.unsure, 'unsure', key));
      return wrap;
    }
    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = copy.eyebrow;
      const title = doc.createElement('h2'); title.id = 'relativeCareTitle'; title.textContent = copy.title;
      const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);
      const q1 = doc.createElement('h3'); q1.textContent = copy.qLife;
      section.append(q1, group(copy.qLife, 'life'));
      if (state.life === 'no') { section.append(result(copy.lifeNoTitle, copy.lifeNoBody)); return; }
      if (state.life === 'unsure') { section.append(result(copy.lifeUnsureTitle, copy.lifeUnsureBody)); return; }
      if (state.life !== 'yes') return;
      const q2 = doc.createElement('h3'); q2.textContent = copy.qForego; q2.style.marginTop = '14px';
      section.append(q2, group(copy.qForego, 'forego'));
      if (state.forego === 'yes') section.append(result(copy.likelyTitle, copy.likelyBody));
      if (state.forego === 'no') section.append(result(copy.foregoNoTitle, copy.foregoNoBody));
      if (state.forego === 'unsure') section.append(result(copy.foregoUnsureTitle, copy.foregoUnsureBody));
    }
    render();
  }

  function init(win) { addShellHandoff(win); addPersonGuidance(win); }
  return { detect, safeLang, handoffHref, init };
});
