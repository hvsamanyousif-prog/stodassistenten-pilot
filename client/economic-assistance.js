(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODEconomicAssistance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const SOCIALSTYRELSEN_URL = 'https://www.socialstyrelsen.se/kunskapsstod-och-regler/omraden/ekonomiskt-bistand/ekonomiskt-bistand-for-privatpersoner/';
  const CALC_URL = 'https://www.socialstyrelsen.se/kunskapsstod-och-regler/omraden/ekonomiskt-bistand/provberakning-ekonomiskt-bistand/';

  const DIRECT_PATTERNS = [
    /\b(?:försörjningsstöd|ekonomiskt\s+bistånd|socialbidrag|socialtjänst(?:en)?)\b/i,
    /(?:مساعدة|إعانة)\s+(?:اجتماعية|مالية)|الخدمات\s+الاجتماعية/i,
    /کمک(?:‌|\s)+(?:اجتماعی|مالی)|خدمات(?:‌|\s)+اجتماعی/i,
  ];
  const MONEY_PRESSURE_PATTERNS = [
    /\b(?:pengarna\s+räcker\s+inte|har\s+inte\s+råd|saknar\s+pengar|ingen\s+inkomst|utan\s+inkomst|ekonomisk\s+kris)\b/i,
    /(?:المال|النقود).*(?:لا\s+تكفي|نفدت)|لا\s+أستطيع\s+الدفع|بدون\s+دخل/i,
    /پول.*(?:کافی\s+نیست|ندارم)|نمی(?:‌|\s)*توانم.*پرداخت|بدون\s+درآمد/i,
  ];
  const HOUSING_NEED_PATTERNS = [
    /\b(?:hyra|hyran|boendekostnad|vräk|uppsagd\s+från\s+bostad|elräkning|hushållsel)\b/i,
    /إيجار|الإيجار|سكن|كهرباء|طرد\s+من\s+السكن/i,
    /اجاره|مسکن|قبض\s+برق|اخراج\s+از\s+خانه/i,
  ];
  const BASIC_NEED_PATTERNS = [
    /\b(?:mat|livsmedel|medicin|hygien|kläder)\b/i,
    /طعام|غذاء|دواء|نظافة|ملابس/i,
    /غذا|دارو|بهداشت|لباس/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'När pengarna inte räcker till det nödvändiga',
      shellSub: 'Kontrollera kommunalt ekonomiskt bistånd utan att lova rätt eller belopp',
      eyebrow: 'Ekonomi + grundbehov',
      title: 'Du kan få din situation prövad av socialtjänsten i din kommun',
      intro: 'Stödassistenten avgör inte om du har rätt till bistånd. Vi hjälper dig skilja mellan möjliga vägar och nästa säkra handling utan att samla in exakta ekonomiska eller medicinska uppgifter.',
      qNeed: 'Vad behöver du främst hjälp med just nu?',
      recurring: 'Löpande kostnader som mat, hyra eller hushållsel',
      occasional: 'En särskild nödvändig kostnad som uppstår mer sällan',
      unsure: 'Jag är osäker',
      recurringTitle: 'Kontakta socialtjänsten i din kommun och lämna in en ansökan',
      recurringBody: 'Socialstyrelsen beskriver försörjningsstöd som stöd för mer regelbundna hushållskostnader. Kommunen gör en individuell bedömning av hushållets situation, inkomster, tillgångar och skäliga kostnader. Ett lågt saldo eller en förenklad provberäkning är inte ett beslut om rätt eller belopp.',
      occasionalTitle: 'Även vissa nödvändiga kostnader som uppstår då och då kan prövas',
      occasionalBody: 'Socialstyrelsen beskriver att annat ekonomiskt bistånd kan omfatta vissa behov som uppstår mer sällan, till exempel tandvård, glasögon, sjukvård, medicin eller flytt. Kommunen gör en individuell bedömning av vad som är skäligt i den enskilda situationen.',
      unsureTitle: 'Du behöver inte veta exakt vilken kategori som gäller innan du kontaktar kommunen',
      unsureBody: 'Du har rätt att ansöka om bistånd och få ett beslut. Kontakta socialtjänsten i din kommun och be om den aktuella ansökningsvägen och vilka underlag som behövs. Piloten ska inte stoppa en ansökan bara för att situationen är oklar.',
      documents: 'Nästa steg: fråga kommunen vilka underlag som behövs för hushåll, boende, inkomster, tillgångar och nödvändiga utgifter. Lägg inte in kontoutdrag, personnummer eller detaljerad hälsodata i den här publika piloten.',
      calc: 'Socialstyrelsens provberäkning är bara orienterande och kan ge ett annat resultat än kommunens individuella beslut.',
      source: 'Socialstyrelsen: ekonomiskt bistånd för privatpersoner',
      calcSource: 'Socialstyrelsen: provberäkning ekonomiskt bistånd',
    },
    ar: {
      shellTitle: 'عندما لا يكفي المال للاحتياجات الأساسية',
      shellSub: 'تحقق من المساعدة المالية البلدية من دون وعد بالاستحقاق أو المبلغ',
      eyebrow: 'الاقتصاد + الاحتياجات الأساسية',
      title: 'يمكن للخدمات الاجتماعية في بلديتك فحص وضعك',
      intro: 'لا يقرر مساعد الدعم الاستحقاق. نساعدك على فهم المسار والخطوة الآمنة التالية من دون جمع تفاصيل مالية أو طبية دقيقة.',
      qNeed: 'ما نوع المساعدة التي تحتاجها الآن بشكل أساسي؟',
      recurring: 'تكاليف مستمرة مثل الطعام أو الإيجار أو كهرباء المنزل',
      occasional: 'تكلفة ضرورية محددة تظهر من وقت لآخر',
      unsure: 'لست متأكداً',
      recurringTitle: 'تواصل مع الخدمات الاجتماعية في بلديتك وقدّم طلباً',
      recurringBody: 'توضح Socialstyrelsen أن försörjningsstöd مخصص لتكاليف أسرية أكثر انتظاماً. تقوم البلدية بتقييم فردي لوضع الأسرة والدخل والأصول والتكاليف المعقولة. انخفاض الرصيد أو نتيجة الحساب التجريبي ليس قراراً بالاستحقاق أو المبلغ.',
      occasionalTitle: 'يمكن أيضاً فحص بعض التكاليف الضرورية التي تظهر من وقت لآخر',
      occasionalBody: 'توضح Socialstyrelsen أن المساعدة المالية الأخرى قد تشمل احتياجات تظهر أحياناً، مثل علاج الأسنان أو النظارات أو الرعاية الصحية أو الدواء أو الانتقال. تقوم البلدية بتقييم فردي لما هو معقول في الحالة المحددة.',
      unsureTitle: 'لا تحتاج إلى معرفة الفئة الدقيقة قبل التواصل مع البلدية',
      unsureBody: 'لديك الحق في تقديم طلب والحصول على قرار. تواصل مع الخدمات الاجتماعية في بلديتك واسأل عن طريقة التقديم الحالية والمستندات المطلوبة. لا ينبغي للنسخة التجريبية أن تمنع الطلب لأن الوضع غير واضح.',
      documents: 'الخطوة التالية: اسأل البلدية عن المستندات المطلوبة بخصوص الأسرة والسكن والدخل والأصول والنفقات الضرورية. لا تضع كشوف الحساب أو الرقم الشخصي أو تفاصيل صحية حساسة في هذه النسخة العامة.',
      calc: 'الحساب التجريبي لدى Socialstyrelsen إرشادي فقط وقد يختلف عن قرار البلدية الفردي.',
      source: 'Socialstyrelsen: المساعدة المالية للأفراد',
      calcSource: 'Socialstyrelsen: الحساب التجريبي للمساعدة المالية',
    },
    fa: {
      shellTitle: 'وقتی پول برای نیازهای ضروری کافی نیست',
      shellSub: 'کمک مالی شهرداری را بدون وعده استحقاق یا مبلغ بررسی کن',
      eyebrow: 'اقتصاد + نیازهای پایه',
      title: 'خدمات اجتماعی شهرداری می‌تواند وضعیتت را بررسی کند',
      intro: 'دستیار حمایت درباره استحقاق تصمیم نمی‌گیرد. فقط مسیر و قدم امن بعدی را روشن می‌کند، بدون جمع‌آوری جزئیات دقیق مالی یا پزشکی.',
      qNeed: 'الان بیشتر برای چه چیزی کمک لازم داری؟',
      recurring: 'هزینه‌های جاری مثل غذا، اجاره یا برق خانه',
      occasional: 'یک هزینه ضروری خاص که هر از گاهی پیش می‌آید',
      unsure: 'مطمئن نیستم',
      recurringTitle: 'با خدمات اجتماعی شهرداری تماس بگیر و درخواست بده',
      recurringBody: 'Socialstyrelsen توضیح می‌دهد که försörjningsstöd برای هزینه‌های منظم‌تر خانوار است. شهرداری وضعیت خانوار، درآمد، دارایی و هزینه‌های معقول را به‌صورت فردی بررسی می‌کند. کمبود پول یا نتیجه محاسبه آزمایشی به‌تنهایی تصمیم درباره استحقاق یا مبلغ نیست.',
      occasionalTitle: 'برخی هزینه‌های ضروری که گاهی پیش می‌آیند نیز می‌توانند بررسی شوند',
      occasionalBody: 'Socialstyrelsen توضیح می‌دهد که کمک مالی دیگر می‌تواند بعضی نیازهای گاه‌به‌گاه مانند دندانپزشکی، عینک، درمان، دارو یا اسباب‌کشی را پوشش دهد. شهرداری در هر مورد جداگانه بررسی می‌کند چه چیزی معقول است.',
      unsureTitle: 'لازم نیست قبل از تماس با شهرداری دقیقاً بدانی کدام دسته درست است',
      unsureBody: 'حق داری درخواست بدهی و تصمیم دریافت کنی. با خدمات اجتماعی شهرداری تماس بگیر و مسیر فعلی درخواست و مدارک لازم را بپرس. پایلوت نباید فقط به‌خاطر نامشخص بودن وضعیت جلوی درخواست را بگیرد.',
      documents: 'قدم بعدی: از شهرداری بپرس برای خانوار، مسکن، درآمد، دارایی و هزینه‌های ضروری چه مدارکی لازم است. صورت‌حساب بانکی، شماره شناسایی یا جزئیات حساس پزشکی را در این پایلوت عمومی وارد نکن.',
      calc: 'محاسبه آزمایشی Socialstyrelsen فقط برای راهنمایی است و ممکن است با تصمیم فردی شهرداری فرق داشته باشد.',
      source: 'Socialstyrelsen: کمک مالی برای افراد',
      calcSource: 'Socialstyrelsen: محاسبه آزمایشی کمک مالی',
    },
  };

  function matches(patterns, text) {
    const value = String(text || '');
    return patterns.some((pattern) => pattern.test(value));
  }

  function detect(text) {
    const value = String(text || '');
    if (!value.trim()) return false;
    if (matches(DIRECT_PATTERNS, value)) return true;
    return matches(MONEY_PRESSURE_PATTERNS, value) &&
      (matches(HOUSING_NEED_PATTERNS, value) || matches(BASIC_NEED_PATTERNS, value));
  }

  function coarseContext(text) {
    const value = String(text || '');
    if (matches(HOUSING_NEED_PATTERNS, value)) return 'housing';
    if (matches(BASIC_NEED_PATTERNS, value)) return 'basic_needs';
    return 'general';
  }

  function safeLang(value) {
    return value === 'ar' || value === 'fa' ? value : 'sv';
  }

  function safeContext(value) {
    return value === 'housing' || value === 'basic_needs' ? value : 'general';
  }

  function handoffHref(language, context) {
    const lang = safeLang(language);
    const safe = safeContext(context);
    return `person-pilot.html?actor_type=private_person&focus=economic_assistance&context=${safe}&lang=${encodeURIComponent(lang)}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const analyzeButton = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !analyzeButton || !box) return;

    const enhance = () => {
      if (!detect(input.value) || box.hidden) return;
      if (box.querySelector('[data-economic-assistance-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.economicAssistanceRoute = 'true';
      link.href = handoffHref(lang, coarseContext(input.value));
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

    analyzeButton.addEventListener('click', () => win.setTimeout(enhance, 0));
    input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') win.setTimeout(enhance, 0);
    });
  }

  function appendSource(doc, parent, href, label) {
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
    if (String(params.get('focus') || '').toLowerCase() !== 'economic_assistance') return;
    if (doc.getElementById('economicAssistanceGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;

    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const context = safeContext(params.get('context'));
    const section = doc.createElement('section');
    section.id = 'economicAssistanceGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'economicAssistanceTitle');
    main.parentNode.insertBefore(section, main);

    const state = {
      need: context === 'housing' || context === 'basic_needs' ? 'recurring' : null,
    };

    function choice(label, value) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.dataset.value = value;
      el.setAttribute('aria-pressed', String(state.need === value));
      el.addEventListener('click', () => {
        state.need = value;
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
      const documents = doc.createElement('p');
      documents.textContent = copy.documents;
      const calc = doc.createElement('p');
      calc.textContent = copy.calc;
      box.append(title, body, documents, calc);
      appendSource(doc, box, SOCIALSTYRELSEN_URL, copy.source);
      box.appendChild(doc.createTextNode(' · '));
      appendSource(doc, box, CALC_URL, copy.calcSource);
      return box;
    }

    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = copy.eyebrow;
      const title = doc.createElement('h2');
      title.id = 'economicAssistanceTitle';
      title.textContent = copy.title;
      const intro = doc.createElement('p');
      intro.className = 'muted';
      intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);

      if (context === 'general') {
        const q = doc.createElement('h3');
        q.textContent = copy.qNeed;
        const group = doc.createElement('div');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', copy.qNeed);
        group.append(
          choice(copy.recurring, 'recurring'),
          choice(copy.occasional, 'occasional'),
          choice(copy.unsure, 'unsure'),
        );
        section.append(q, group);
      }

      if (state.need === 'recurring') section.append(result(copy.recurringTitle, copy.recurringBody));
      if (state.need === 'occasional') section.append(result(copy.occasionalTitle, copy.occasionalBody));
      if (state.need === 'unsure') section.append(result(copy.unsureTitle, copy.unsureBody));
    }

    render();
  }

  function init(win) {
    addShellHandoff(win);
    addPersonGuidance(win);
  }

  return { detect, coarseContext, safeLang, handoffHref, init };
});
