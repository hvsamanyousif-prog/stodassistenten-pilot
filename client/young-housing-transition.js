(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODYoungHousingTransition = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const FK_YOUNG_HOUSING_URL = 'https://www.forsakringskassan.se/privatperson/studerande/bostadsbidrag-till-unga-under-29-ar';

  const DIRECT_PATTERNS = [
    /\bbostadsbidrag\b/i,
    /بدل\s+السكن|إعانة\s+السكن/i,
    /کمک(?:‌|\s)*هزینه\s+مسکن|یارانه\s+مسکن/i,
  ];
  const YOUNG_STUDY_PATTERNS = [
    /\b(?:student|studerar|pluggar|nyexaminerad|nyutexaminerad|tagit\s+examen|tog\s+examen)\b/i,
    /\b(?:1[89]|2[0-8])\s*(?:år|årig)?\b/i,
    /طالب|أدرس|تخرجت|خريج\s+جديد/i,
    /دانشجو|درس\s+می(?:‌|\s)*خوانم|فارغ.*التحصیل/i,
  ];
  const HOUSING_PATTERNS = [
    /\b(?:hyra|hyr|lägenhet|studentbostad|bostad|boendekostnad)\b/i,
    /إيجار|أستأجر|شقة|سكن/i,
    /اجاره|آپارتمان|مسکن|خانه|هزینه\s+مسکن/i,
  ];
  const INCOME_CHANGE_PATTERNS = [
    /\b(?:extrajobb|sommarjobb|timjobb|oregelbunden\s+inkomst|olika\s+mycket|börjar\s+jobba|nytt\s+jobb|ny\s+lön|inkomsten\s+ändras|inkomst\s+ändras)\b/i,
    /عمل\s+إضافي|عمل\s+صيفي|دخل\s+متغير|راتب\s+جديد|سأبدأ\s+العمل/i,
    /کار\s+پاره(?:‌|\s|-)*وقت|کار\s+تابستانی|درآمد.*متغیر|حقوق\s+جدید|شروع\s+به\s+کار/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Boende + ändrad inkomst efter studier',
      shellSub: 'Kontrollera bostadsbidrag utan att gissa årsinkomsten',
      eyebrow: 'Ung + boende',
      title: 'Boende och inkomst kan ändras samtidigt efter studier',
      intro: 'Vi ställer bara frågor som kan ändra nästa säkra steg. Piloten avgör inte rätt till bostadsbidrag eller belopp.',
      qAge: 'Är du under 29 år?',
      qHousing: 'Hur bor du?',
      qIncome: 'Har inkomsten ändrats eller väntas den ändras under 2026?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      ownRent: 'Jag hyr eller äger bostaden',
      lodger: 'Jag är inneboende',
      housingUnsure: 'Jag är osäker på hur min boendeform räknas',
      ageNoTitle: 'Det här ungdomsspåret är inte rätt första väg',
      ageNoBody: 'Försäkringskassans ungdomsspår gäller personer under 29 år. Om du har barn eller en annan boendesituation kan en annan bostadsbidragsväg vara relevant; kontrollera den aktuella Försäkringskasseinformationen.',
      ageUnsureTitle: 'Fastställ åldersgränsen först',
      ageUnsureBody: 'Den här vägen är avgränsad till under 29 år. Bekräfta din ålder innan du använder just ungdomsspåret.',
      lodgerTitle: 'Inneboende behöver en annan kontroll',
      lodgerBody: 'Försäkringskassans aktuella sida anger att den som söker bostadsbidrag för att den är under 29 år inte kan få just det ungdomsspåret som inneboende. Det betyder inte att alla andra stöd är uteslutna.',
      housingUnsureTitle: 'Klargör boendeformen innan du räknar',
      housingUnsureBody: 'Förstahand, andrahand, ägd bostad och inneboende kan ge olika dokument- och bedömningsvägar. Kontrollera boendeformen mot Försäkringskassans aktuella sida.',
      changeTitle: 'Använd hela årets uppskattning och ändra när inkomsten ändras',
      changeBody: 'För ett beslut enligt 2026 års regler anger Försäkringskassan att du ska uppskatta inkomsten för hela kalenderåret. Om du får ett nytt jobb, fler timmar eller annan känd förändring ska du uppdatera uppgifterna direkt. En enskild månadsinkomst räcker inte som säker årsbedömning.',
      stableTitle: 'Kontrollera årsinkomst, boendekostnad och hushåll innan du ansöker',
      stableBody: 'Försäkringskassan beräknar bostadsbidraget utifrån bland annat inkomst och boende. Använd den aktuella beräknings- och ansökningsvägen och ändra uppgifterna senare om något faktiskt förändras.',
      incomeUnsureTitle: 'Gör en försiktig årsprognos – och uppdatera när du vet mer',
      incomeUnsureBody: 'Om extrajobb, examen eller ett första jobb gör inkomsten svår att förutse ska du enligt Försäkringskassans aktuella vägledning ange vad du tror att du totalt kommer tjäna januari–december och ändra uppgiften när utfallet blir tydligare.',
      source: 'Försäkringskassan: bostadsbidrag till unga under 29 år',
    },
    ar: {
      shellTitle: 'السكن + دخل متغير بعد الدراسة',
      shellSub: 'تحقق من بدل السكن من دون تخمين الدخل السنوي',
      eyebrow: 'شاب + سكن',
      title: 'قد يتغير السكن والدخل في الوقت نفسه بعد الدراسة',
      intro: 'نسأل فقط ما يمكن أن يغيّر الخطوة الآمنة التالية. النسخة التجريبية لا تقرر الاستحقاق أو المبلغ.',
      qAge: 'هل عمرك أقل من 29 سنة؟',
      qHousing: 'كيف تسكن؟',
      qIncome: 'هل تغير دخلك أو تتوقع أن يتغير خلال 2026؟',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      ownRent: 'أستأجر أو أملك السكن',
      lodger: 'أسكن كـ inneboende عند شخص آخر',
      housingUnsure: 'لست متأكداً كيف تُحسب وضعيتي السكنية',
      ageNoTitle: 'هذا المسار المخصص للشباب ليس المسار الأول',
      ageNoBody: 'مسار Försäkringskassan هذا مخصص لمن هم دون 29 سنة. قد توجد طريقة أخرى إذا كان لديك أطفال أو وضع سكني مختلف؛ تحقق من المعلومات الحالية لدى Försäkringskassan.',
      ageUnsureTitle: 'أكد شرط العمر أولاً',
      ageUnsureBody: 'هذا المسار محدد لمن هم دون 29 سنة. أكد عمرك قبل استخدام مسار الشباب.',
      lodgerTitle: 'السكن كـ inneboende يحتاج مسار تحقق آخر',
      lodgerBody: 'تذكر الصفحة الحالية لدى Försäkringskassan أن مسار الشباب دون 29 سنة لا يمنح هذا بدل السكن لمن يسكن كـ inneboende. هذا لا يعني أن كل أشكال الدعم الأخرى مستبعدة.',
      housingUnsureTitle: 'وضّح شكل السكن قبل الحساب',
      housingUnsureBody: 'الإيجار المباشر أو من الباطن أو الملكية أو السكن عند شخص آخر قد يغيّر المستندات وطريقة التقييم. تحقق من وضع السكن في المصدر الرسمي.',
      changeTitle: 'استخدم تقدير السنة كاملة وحدّث الدخل عند تغيره',
      changeBody: 'لقرار يخضع لقواعد 2026، تطلب Försäkringskassan تقدير الدخل للسنة التقويمية كاملة. إذا بدأت وظيفة جديدة أو زادت ساعاتك أو عرفت بتغير آخر، حدّث البيانات مباشرة. راتب شهر واحد لا يكفي كتقدير سنوي آمن.',
      stableTitle: 'تحقق من الدخل السنوي وتكلفة السكن والأسرة قبل التقديم',
      stableBody: 'تحسب Försäkringskassan بدل السكن بناءً على الدخل والسكن وعوامل أخرى. استخدم أداة الحساب وطريق التقديم الحاليين وحدّث البيانات إذا تغير شيء لاحقاً.',
      incomeUnsureTitle: 'استخدم تقديراً سنوياً حذراً وحدّثه عندما تعرف أكثر',
      incomeUnsureBody: 'إذا كان العمل الإضافي أو التخرج أو أول وظيفة يجعل الدخل غير واضح، فالإرشاد الحالي هو تقدير مجموع الدخل من يناير إلى ديسمبر ثم تعديل البيانات عندما يصبح الوضع أوضح.',
      source: 'Försäkringskassan: بدل السكن للشباب دون 29 سنة',
    },
    fa: {
      shellTitle: 'مسکن + تغییر درآمد بعد از تحصیل',
      shellSub: 'کمک‌هزینه مسکن را بدون حدس زدن درآمد سالانه بررسی کن',
      eyebrow: 'جوان + مسکن',
      title: 'بعد از تحصیل ممکن است مسکن و درآمد هم‌زمان تغییر کنند',
      intro: 'فقط سؤال‌هایی را می‌پرسیم که می‌توانند قدم امن بعدی را تغییر دهند. پایلوت درباره استحقاق یا مبلغ تصمیم نمی‌گیرد.',
      qAge: 'آیا کمتر از ۲۹ سال داری؟',
      qHousing: 'چطور زندگی می‌کنی؟',
      qIncome: 'آیا درآمدت در سال ۲۰۲۶ تغییر کرده یا انتظار داری تغییر کند؟',
      yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      ownRent: 'خانه را اجاره کرده‌ام یا مالک آن هستم',
      lodger: 'به صورت inneboende نزد شخص دیگری زندگی می‌کنم',
      housingUnsure: 'مطمئن نیستم نوع سکونتم چگونه حساب می‌شود',
      ageNoTitle: 'این مسیر جوانان احتمالاً مسیر اول نیست',
      ageNoBody: 'این مسیر Försäkringskassan برای افراد زیر ۲۹ سال است. اگر فرزند داری یا وضعیت مسکن متفاوتی داری ممکن است مسیر دیگری مرتبط باشد؛ منبع رسمی فعلی را بررسی کن.',
      ageUnsureTitle: 'اول شرط سنی را روشن کن',
      ageUnsureBody: 'این مسیر به افراد زیر ۲۹ سال محدود است. قبل از استفاده از مسیر جوانان سن را تأیید کن.',
      lodgerTitle: 'سکونت به شکل inneboende نیاز به بررسی دیگری دارد',
      lodgerBody: 'صفحه فعلی Försäkringskassan می‌گوید مسیر کمک‌هزینه مسکن برای افراد زیر ۲۹ سال به شخصی که inneboende است تعلق نمی‌گیرد. این به معنی رد همه حمایت‌های دیگر نیست.',
      housingUnsureTitle: 'قبل از محاسبه، نوع سکونت را مشخص کن',
      housingUnsureBody: 'اجاره مستقیم، دست دوم، مالکیت یا inneboende می‌تواند مدارک و مسیر بررسی را تغییر دهد. نوع سکونت را در منبع رسمی بررسی کن.',
      changeTitle: 'برآورد کل سال را استفاده کن و با تغییر درآمد آن را به‌روز کن',
      changeBody: 'برای تصمیمی بر اساس قواعد ۲۰۲۶، Försäkringskassan می‌گوید درآمد کل سال تقویمی را برآورد کن. اگر کار جدید، ساعت بیشتر یا تغییر شناخته‌شده دیگری داری، اطلاعات را مستقیم به‌روز کن. حقوق یک ماه به تنهایی برآورد سالانه مطمئنی نیست.',
      stableTitle: 'قبل از درخواست، درآمد سالانه، هزینه مسکن و وضعیت خانوار را بررسی کن',
      stableBody: 'Försäkringskassan کمک‌هزینه را بر اساس درآمد، مسکن و عوامل دیگر محاسبه می‌کند. از مسیر محاسبه و درخواست فعلی استفاده کن و اگر بعداً چیزی واقعاً تغییر کرد، اطلاعات را به‌روز کن.',
      incomeUnsureTitle: 'یک برآورد محتاطانه سالانه بساز و وقتی اطلاعات روشن‌تر شد به‌روزش کن',
      incomeUnsureBody: 'اگر کار پاره‌وقت، پایان تحصیل یا اولین شغل درآمد را نامطمئن کرده، راهنمای فعلی می‌گوید مجموع درآمد ژانویه تا دسامبر را برآورد کن و وقتی وضعیت روشن‌تر شد آن را تغییر بده.',
      source: 'Försäkringskassan: کمک‌هزینه مسکن برای افراد زیر ۲۹ سال',
    },
  };

  function normalize(text) {
    return String(text || '').normalize('NFKC').trim();
  }

  function any(patterns, value) {
    return patterns.some((pattern) => pattern.test(value));
  }

  function detect(text) {
    const value = normalize(text);
    if (!value) return false;
    const young = any(YOUNG_STUDY_PATTERNS, value);
    const direct = any(DIRECT_PATTERNS, value);
    const housing = any(HOUSING_PATTERNS, value);
    const incomeChange = any(INCOME_CHANGE_PATTERNS, value);
    return young && (direct || (housing && incomeChange));
  }

  function coarseContext(text) {
    const value = normalize(text);
    return any(INCOME_CHANGE_PATTERNS, value) ? 'income_change' : 'general';
  }

  function safeLang(value) {
    return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv';
  }

  function safeContext(value) {
    return value === 'income_change' ? 'income_change' : 'general';
  }

  function handoffHref(language, context) {
    const lang = safeLang(language);
    const safe = safeContext(context);
    return `person-pilot.html?actor_type=student&focus=young_housing&context=${safe}&lang=${encodeURIComponent(lang)}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;

    const enhance = () => {
      if (!detect(input.value) || box.hidden) return;
      if (box.querySelector('[data-young-housing-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.youngHousingRoute = 'true';
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
    if (String(params.get('focus') || '').toLowerCase() !== 'young_housing') return;
    if (doc.getElementById('youngHousingGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;

    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const context = safeContext(params.get('context'));
    const section = doc.createElement('section');
    section.id = 'youngHousingGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'youngHousingTitle');
    main.parentNode.insertBefore(section, main);

    const state = { age: null, housing: null, income: context === 'income_change' ? 'yes' : null };

    function button(label, value, group) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.dataset.value = value;
      el.setAttribute('aria-pressed', String(state[group] === value));
      el.addEventListener('click', () => {
        state[group] = value;
        if (group === 'age') {
          state.housing = null;
          state.income = context === 'income_change' ? 'yes' : null;
        }
        if (group === 'housing' && value !== 'own_rent') state.income = context === 'income_change' ? 'yes' : null;
        render();
      });
      return el;
    }

    function result(titleText, bodyText) {
      const resultBox = doc.createElement('div');
      resultBox.className = 'notice';
      resultBox.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = titleText;
      const body = doc.createElement('p');
      body.textContent = bodyText;
      body.style.marginBottom = '8px';
      resultBox.append(title, body);
      appendLink(doc, resultBox, FK_YOUNG_HOUSING_URL, copy.source);
      return resultBox;
    }

    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = copy.eyebrow;
      const title = doc.createElement('h2');
      title.id = 'youngHousingTitle';
      title.textContent = copy.title;
      const intro = doc.createElement('p');
      intro.className = 'muted';
      intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);

      const q1 = doc.createElement('h3');
      q1.textContent = copy.qAge;
      const g1 = doc.createElement('div');
      g1.setAttribute('role', 'group');
      g1.setAttribute('aria-label', copy.qAge);
      g1.append(button(copy.yes, 'yes', 'age'), button(copy.no, 'no', 'age'), button(copy.unsure, 'unsure', 'age'));
      section.append(q1, g1);

      if (state.age === 'no') {
        section.append(result(copy.ageNoTitle, copy.ageNoBody));
        return;
      }
      if (state.age === 'unsure') {
        section.append(result(copy.ageUnsureTitle, copy.ageUnsureBody));
        return;
      }
      if (state.age !== 'yes') return;

      const q2 = doc.createElement('h3');
      q2.textContent = copy.qHousing;
      q2.style.marginTop = '14px';
      const g2 = doc.createElement('div');
      g2.setAttribute('role', 'group');
      g2.setAttribute('aria-label', copy.qHousing);
      g2.append(
        button(copy.ownRent, 'own_rent', 'housing'),
        button(copy.lodger, 'lodger', 'housing'),
        button(copy.housingUnsure, 'unsure', 'housing'),
      );
      section.append(q2, g2);

      if (state.housing === 'lodger') {
        section.append(result(copy.lodgerTitle, copy.lodgerBody));
        return;
      }
      if (state.housing === 'unsure') {
        section.append(result(copy.housingUnsureTitle, copy.housingUnsureBody));
        return;
      }
      if (state.housing !== 'own_rent') return;

      if (context !== 'income_change') {
        const q3 = doc.createElement('h3');
        q3.textContent = copy.qIncome;
        q3.style.marginTop = '14px';
        const g3 = doc.createElement('div');
        g3.setAttribute('role', 'group');
        g3.setAttribute('aria-label', copy.qIncome);
        g3.append(button(copy.yes, 'yes', 'income'), button(copy.no, 'no', 'income'), button(copy.unsure, 'unsure', 'income'));
        section.append(q3, g3);
      }

      if (state.income === 'yes') section.append(result(copy.changeTitle, copy.changeBody));
      if (state.income === 'no') section.append(result(copy.stableTitle, copy.stableBody));
      if (state.income === 'unsure') section.append(result(copy.incomeUnsureTitle, copy.incomeUnsureBody));
    }

    render();
  }

  function init(win) {
    addShellHandoff(win);
    addPersonGuidance(win);
  }

  return { detect, coarseContext, safeLang, handoffHref, init };
});
