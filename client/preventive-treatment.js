(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODPreventiveTreatment = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const FK_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/forebyggande-sjukpenning-rehabilitering-eller-planerad-vard';

  const DIRECT_PATTERNS = [
    /\bförebyggande\s+sjukpenning\b/i,
    /تعويض\s+مرض(?:ي)?\s+وقائي|إعانة\s+مرض(?:ية)?\s+وقائية/i,
    /کمک(?:‌|\s)*هزینه\s+بیماری\s+پیشگیرانه|غرامت\s+بیماری\s+پیشگیرانه/i,
  ];
  const TREATMENT_PATTERNS = [
    /\b(?:behandling|rehabilitering|rehab|psykologbehandling|smärtbehandling|fysioterapi|arbetsterapi|planerad\s+vård)\b/i,
    /علاج|إعادة\s+تأهيل|علاج\s+نفسي|علاج\s+طبيعي/i,
    /درمان|توانبخشی|روان(?:‌|\s)*درمانی|فیزیوتراپی|کاردرمانی/i,
  ];
  const WORK_TIME_PATTERNS = [
    /\b(?:arbetstid|under\s+arbetstid|från\s+jobbet|gå\s+ifrån\s+jobbet|borta\s+från\s+jobbet|måste\s+avstå\s+från\s+arbete|kan\s+jobba\s+men)\b/i,
    /أثناء\s+العمل|وقت\s+العمل|أترك\s+العمل|أتغيب\s+عن\s+العمل/i,
    /ساعت\s+کار|زمان\s+کار|از\s+کار\s+مرخص|کار\s+را\s+ترک/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Behandling eller rehab på arbetstid',
      shellSub: 'Kontrollera förebyggande sjukpenning utan att blanda ihop den med vanlig sjukskrivning',
      eyebrow: 'Behandling & arbete',
      title: 'Du verkar kunna arbeta men behöver vara borta för behandling eller rehabilitering',
      intro: 'Vi ställer bara frågor som kan ändra vägen. Piloten avgör inte rätt till ersättning och sparar inte dina svar i anonym feedback.',
      qOrdered: 'Är detta en planerad medicinsk behandling eller rehabilitering som är ordinerad av läkare för att förebygga eller förkorta sjukdom?',
      qTime: 'Behöver du vara borta minst ungefär en fjärdedel av din dagliga arbetstid per tillfälle för behandlingen och relevant restid?',
      qApproved: 'Har Försäkringskassan redan godkänt behandlingsplanen?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      noPlanTitle: 'Tvinga inte in detta i förebyggande sjukpenning',
      noPlanBody: 'Försäkringskassan beskriver förebyggande sjukpenning för ordinerad medicinsk behandling eller rehabilitering i en behandlingsplan. Ett enstaka vårdbesök eller friskvård är inte samma sak. Kontrollera i stället vanlig sjukpenning, arbetsgivarens rehabiliteringsansvar eller annan relevant väg beroende på situationen.',
      unsurePlanTitle: 'Klargör behandlingens syfte och ordination först',
      unsurePlanBody: 'Fråga läkaren om behandlingen är medicinsk, ordinerad för att förebygga eller förkorta sjukdom och om ett läkarutlåtande med behandlingsplan ska tas fram. Piloten ska inte avgöra detta utifrån diagnos eller behandlingsnamn.',
      timeNoTitle: 'Tidsvillkoret behöver kontrolleras innan den här vägen används',
      timeNoBody: 'Försäkringskassan anger att frånvaron per behandlingstillfälle behöver motsvara minst en fjärdedel av den dagliga arbetstiden. Om det inte stämmer ska piloten inte lova förebyggande sjukpenning; kontrollera andra frånvaro- eller rehabiliteringsvägar.',
      timeUnsureTitle: 'Räkna på faktisk frånvaro per tillfälle',
      timeUnsureBody: 'Behandlingstid och relevant restid kan vara betydelsefulla. Fastställ hur mycket av den dagliga arbetstiden du faktiskt behöver avstå innan du drar slutsats om den här vägen.',
      approvalNoTitle: 'Nästa steg är behandlingsplanen – inte ersättningslöftet',
      approvalNoBody: 'Be läkaren om läkarutlåtande med behandlingsplan och ansök hos Försäkringskassan om att få planen godkänd. Först därefter kan du ansöka om förebyggande sjukpenning för behandlingstillfällena. Ett godkännande av planen är inte ett löfte om ersättning för varje tillfälle.',
      approvalUnsureTitle: 'Kontrollera om behandlingsplanen är godkänd',
      approvalUnsureBody: 'Försäkringskassan skiljer mellan att få behandlingsplanen godkänd och att sedan ansöka om ersättning för de faktiska behandlingstillfällena. Kontrollera statusen innan du går vidare.',
      likelyTitle: 'Förebyggande sjukpenning är en väg att kontrollera',
      likelyBody: 'När behandlingen är läkarordinerad, tidskravet verkar uppfyllt och behandlingsplanen är godkänd kan du kontrollera och ansöka om förebyggande sjukpenning för den tid du behöver avstå från arbete. Försäkringskassan gör den individuella bedömningen; piloten lovar inte rätt eller belopp.',
      source: 'Försäkringskassan: förebyggande sjukpenning',
    },
    ar: {
      shellTitle: 'علاج أو إعادة تأهيل أثناء وقت العمل', shellSub: 'تحقق من المرض الوقائي دون الخلط مع الإجازة المرضية العادية', eyebrow: 'العلاج والعمل',
      title: 'يبدو أنك تستطيع العمل لكن تحتاج إلى الغياب للعلاج أو إعادة التأهيل', intro: 'نسأل فقط ما يمكن أن يغيّر المسار. النسخة التجريبية لا تقرر الاستحقاق ولا تحفظ إجاباتك في الملاحظات المجهولة.',
      qOrdered: 'هل هذا علاج طبي أو إعادة تأهيل مخطط له وصفه طبيب بهدف الوقاية من المرض أو تقصير مدته؟',
      qTime: 'هل تحتاج إلى الغياب قرابة ربع وقت عملك اليومي على الأقل في كل مرة بسبب العلاج ووقت السفر ذي الصلة؟',
      qApproved: 'هل وافقت Försäkringskassan بالفعل على خطة العلاج؟', yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      noPlanTitle: 'لا تُجبر الحالة على مسار المرض الوقائي', noPlanBody: 'تصف Försäkringskassan هذا المسار للعلاج الطبي أو إعادة التأهيل الموصوف ضمن خطة علاج. الزيارة الطبية المنفردة أو العناية الصحية العامة ليست الشيء نفسه. تحقق من مسارات المرض أو مسؤولية إعادة التأهيل الأخرى حسب حالتك.',
      unsurePlanTitle: 'وضّح غرض العلاج ووصف الطبيب أولاً', unsurePlanBody: 'اسأل الطبيب إن كان العلاج طبياً ومقصوداً للوقاية من المرض أو تقصيره وإن كانت هناك حاجة إلى بيان طبي وخطة علاج. لا ينبغي للنسخة التجريبية أن تستنتج ذلك من التشخيص وحده.',
      timeNoTitle: 'تحقق من شرط الوقت قبل استخدام هذا المسار', timeNoBody: 'تذكر Försäkringskassan أن الغياب لكل جلسة يحتاج إلى بلوغ ربع وقت العمل اليومي على الأقل. إذا لم ينطبق ذلك فلا ينبغي للنسخة التجريبية أن تعد بالتعويض.',
      timeUnsureTitle: 'احسب الغياب الفعلي لكل جلسة', timeUnsureBody: 'قد يكون وقت العلاج ووقت السفر ذي الصلة مهماً. حدّد مقدار وقت العمل اليومي الذي تحتاج فعلاً إلى تركه.',
      approvalNoTitle: 'الخطوة التالية هي خطة العلاج وليست وعداً بالتعويض', approvalNoBody: 'اطلب من الطبيب البيان الطبي وخطة العلاج واطلب من Försäkringskassan الموافقة على الخطة. بعد ذلك يمكن تقديم طلب عن جلسات العلاج الفعلية. موافقة الخطة ليست ضماناً لكل دفعة.',
      approvalUnsureTitle: 'تحقق من حالة الموافقة على الخطة', approvalUnsureBody: 'تفرّق Försäkringskassan بين الموافقة على خطة العلاج وبين طلب التعويض لاحقاً عن الجلسات الفعلية.',
      likelyTitle: 'من المفيد التحقق من المرض الوقائي', likelyBody: 'إذا كان العلاج موصوفاً من طبيب ويبدو أن شرط الوقت متحققاً والخطة معتمدة، فتحقق من طلب التعويض عن الوقت الذي تحتاج إلى ترك العمل فيه. Försäkringskassan تقوم بالتقييم الفردي؛ النسخة التجريبية لا تعد بالاستحقاق أو المبلغ.',
      source: 'Försäkringskassan: sjukpenning في غرض وقائي',
    },
    fa: {
      shellTitle: 'درمان یا توانبخشی در ساعت کار', shellSub: 'مسیر غرامت بیماری پیشگیرانه را بدون اشتباه با مرخصی بیماری عادی بررسی کن', eyebrow: 'درمان و کار',
      title: 'به نظر می‌رسد می‌توانی کار کنی اما برای درمان یا توانبخشی باید از کار غایب شوی', intro: 'فقط سؤال‌هایی را می‌پرسیم که می‌توانند مسیر را تغییر دهند. پایلوت درباره استحقاق تصمیم نمی‌گیرد و پاسخ‌هایت را در بازخورد ناشناس ذخیره نمی‌کند.',
      qOrdered: 'آیا این درمان پزشکی یا توانبخشی برنامه‌ریزی‌شده توسط پزشک برای پیشگیری یا کوتاه‌کردن بیماری تجویز شده است؟',
      qTime: 'آیا برای هر نوبت درمان و زمان رفت‌وآمد مرتبط باید دست‌کم حدود یک‌چهارم ساعت کاری روزانه‌ات را ترک کنی؟',
      qApproved: 'آیا Försäkringskassan طرح درمان را قبلاً تأیید کرده است؟', yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      noPlanTitle: 'این وضعیت را به زور در مسیر غرامت پیشگیرانه قرار نده', noPlanBody: 'Försäkringskassan این مسیر را برای درمان پزشکی یا توانبخشی تجویزشده در یک طرح درمان توضیح می‌دهد. یک ویزیت منفرد یا فعالیت سلامتی عمومی همان چیز نیست. بسته به شرایط، مسیرهای دیگر مرخصی بیماری یا توانبخشی را بررسی کن.',
      unsurePlanTitle: 'اول هدف درمان و تجویز پزشک را روشن کن', unsurePlanBody: 'از پزشک بپرس آیا درمان پزشکی و برای پیشگیری یا کوتاه‌کردن بیماری است و آیا باید گواهی پزشکی و طرح درمان تهیه شود. پایلوت نباید فقط از روی تشخیص نتیجه بگیرد.',
      timeNoTitle: 'پیش از استفاده از این مسیر شرط زمان را بررسی کن', timeNoBody: 'Försäkringskassan می‌گوید غیبت هر نوبت باید دست‌کم یک‌چهارم ساعت کاری روزانه باشد. اگر چنین نیست، پایلوت نباید وعده غرامت بدهد.',
      timeUnsureTitle: 'غیبت واقعی هر نوبت را محاسبه کن', timeUnsureBody: 'زمان درمان و رفت‌وآمد مرتبط می‌تواند مهم باشد. مشخص کن واقعاً چه مقدار از ساعت کاری روزانه را باید ترک کنی.',
      approvalNoTitle: 'قدم بعدی طرح درمان است، نه وعده پرداخت', approvalNoBody: 'از پزشک گواهی و طرح درمان بگیر و برای تأیید طرح به Försäkringskassan درخواست بده. سپس می‌توان برای نوبت‌های واقعی درمان درخواست غرامت کرد. تأیید طرح تضمین پرداخت هر نوبت نیست.',
      approvalUnsureTitle: 'وضعیت تأیید طرح درمان را بررسی کن', approvalUnsureBody: 'Försäkringskassan میان تأیید طرح و درخواست بعدی برای نوبت‌های واقعی درمان تفاوت می‌گذارد.',
      likelyTitle: 'ارزش دارد غرامت بیماری پیشگیرانه را بررسی کنی', likelyBody: 'اگر درمان توسط پزشک تجویز شده، شرط زمان ظاهراً برقرار است و طرح تأیید شده، می‌توانی درخواست برای زمانی را که از کار دور هستی بررسی کنی. Försäkringskassan ارزیابی فردی را انجام می‌دهد؛ پایلوت استحقاق یا مبلغ را تضمین نمی‌کند.',
      source: 'Försäkringskassan: غرامت بیماری پیشگیرانه',
    },
  };

  function normalize(text) { return String(text || '').normalize('NFKC').trim(); }
  function safeLang(value) { return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function detect(text) {
    const value = normalize(text);
    if (!value) return false;
    if (DIRECT_PATTERNS.some((pattern) => pattern.test(value))) return true;
    return TREATMENT_PATTERNS.some((pattern) => pattern.test(value)) && WORK_TIME_PATTERNS.some((pattern) => pattern.test(value));
  }
  function handoffHref(language) {
    const lang = safeLang(language);
    return `person-pilot.html?actor_type=employee&focus=preventive_treatment&lang=${encodeURIComponent(lang)}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;
    const enhance = () => {
      if (!detect(input.value) || box.hidden) return;
      if (box.querySelector('[data-preventive-treatment-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.preventiveTreatmentRoute = 'true';
      link.href = handoffHref(lang);
      const text = doc.createElement('span');
      const title = doc.createElement('strong'); title.textContent = copy.shellTitle;
      const sub = doc.createElement('small'); sub.textContent = copy.shellSub;
      text.append(title, sub);
      const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
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
    if (String(params.get('focus') || '').toLowerCase() !== 'preventive_treatment') return;
    if (doc.getElementById('preventiveTreatmentGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;
    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const section = doc.createElement('section');
    section.id = 'preventiveTreatmentGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'preventiveTreatmentTitle');
    main.parentNode.insertBefore(section, main);
    const state = { ordered: null, time: null, approved: null };

    function choice(label, value, group) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.setAttribute('aria-pressed', String(state[group] === value));
      el.addEventListener('click', () => {
        state[group] = value;
        if (group === 'ordered') { state.time = null; state.approved = null; }
        if (group === 'time') state.approved = null;
        render();
      });
      return el;
    }
    function result(titleText, bodyText) {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const title = doc.createElement('strong'); title.textContent = titleText;
      const body = doc.createElement('p'); body.textContent = bodyText; body.style.marginBottom = '8px';
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
      const title = doc.createElement('h2'); title.id = 'preventiveTreatmentTitle'; title.textContent = copy.title;
      const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);
      const q1 = doc.createElement('h3'); q1.textContent = copy.qOrdered;
      section.append(q1, group(copy.qOrdered, 'ordered'));
      if (state.ordered === 'no') { section.append(result(copy.noPlanTitle, copy.noPlanBody)); return; }
      if (state.ordered === 'unsure') { section.append(result(copy.unsurePlanTitle, copy.unsurePlanBody)); return; }
      if (state.ordered !== 'yes') return;
      const q2 = doc.createElement('h3'); q2.textContent = copy.qTime; q2.style.marginTop = '14px';
      section.append(q2, group(copy.qTime, 'time'));
      if (state.time === 'no') { section.append(result(copy.timeNoTitle, copy.timeNoBody)); return; }
      if (state.time === 'unsure') { section.append(result(copy.timeUnsureTitle, copy.timeUnsureBody)); return; }
      if (state.time !== 'yes') return;
      const q3 = doc.createElement('h3'); q3.textContent = copy.qApproved; q3.style.marginTop = '14px';
      section.append(q3, group(copy.qApproved, 'approved'));
      if (state.approved === 'yes') section.append(result(copy.likelyTitle, copy.likelyBody));
      if (state.approved === 'no') section.append(result(copy.approvalNoTitle, copy.approvalNoBody));
      if (state.approved === 'unsure') section.append(result(copy.approvalUnsureTitle, copy.approvalUnsureBody));
    }
    render();
  }

  function init(win) { addShellHandoff(win); addPersonGuidance(win); }
  return { detect, safeLang, handoffHref, init };
});
