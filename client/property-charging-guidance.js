(() => {
  'use strict';

  // SAME PRODUCT: bounded route inside the existing shell/person pilot.
  // No address, organisation number, parking identifier, exact cost, vehicle
  // details or raw situation text is transferred in the handoff or feedback.
  const FOCUS = 'property_charging';
  const NV_ASSOC = 'https://www.naturvardsverket.se/amnesomraden/klimatomstallningen/ladda-bilen/ladda-bilen-for-foreningar-och-boendeorganisationer/';
  const NV_COMPANY = 'https://www.naturvardsverket.se/amnesomraden/klimatomstallningen/ladda-bilen/ladda-bilen-for-fastighetsbolag-och-foretag/';
  const RIKSDAGEN = 'https://data.riksdagen.se/dokument/sfs-1991-614.html';

  const CONTEXTS = new Set(['association_project', 'company_project', 'resident_request']);
  const cleanContext = (value) => CONTEXTS.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : '';

  function inferContext(text) {
    const s = String(text || '').toLowerCase();
    if (/(bostadsrättshavare|hyresgäst|min egen parkeringsplats|min p-plats|egen parkering|طلب شاحن.*موقف|موقف سيارتي|پارکینگ خودم|جای پارک خودم)/i.test(s)) return 'resident_request';
    if (/(fastighetsbolag|arbetsgivare|anställda|tjänstebil|verksamhetsbil|hyresgäster.*företag|شركة عقارية|موظفين|شرکت.*ملک|کارکنان)/i.test(s)) return 'company_project';
    if (/(brf|bostadsrättsförening|samfällighet|föreningen.*ladd|ladd.*boende|جمعية.*سكن|اتحاد.*سكن|انجمن.*ساختمان|تعاونی.*مسکن)/i.test(s)) return 'association_project';
    return '';
  }

  const ROOT_COPY = {
    sv: ['Laddning vid bostad eller fastighet', 'BRF, fastighetsbolag eller boende som vill ordna laddpunkt', `person-pilot.html?actor_type=property_actor&focus=${FOCUS}`],
    ar: ['شحن السيارة في السكن أو العقار', 'جمعية سكنية أو شركة عقارية أو ساكن يريد نقطة شحن', `person-pilot.html?actor_type=property_actor&focus=${FOCUS}`],
    fa: ['شارژ خودرو در خانه یا ملک', 'انجمن ساختمان، شرکت ملکی یا ساکنی که نقطه شارژ می‌خواهد', `person-pilot.html?actor_type=property_actor&focus=${FOCUS}`]
  };

  function installRootRoute() {
    if (typeof KEYWORDS === 'undefined' || typeof I18N === 'undefined') return;
    KEYWORDS.property_charging = [
      'brf laddstolpe', 'brf laddbox', 'ladda bilen brf', 'laddplatser bostadsrättsförening',
      'samfällighet laddstolpar', 'fastighetsbolag laddstolpar', 'laddning hyresgäster',
      'jag vill ha laddbox på min parkeringsplats', 'bostadsrätt laddbox parkering', 'hyresgäst laddbox parkering',
      'جمعية سكنية شاحن سيارة', 'نقطة شحن في موقف السكن', 'شركة عقارية شحن سيارات',
      'انجمن ساختمان شارژ خودرو', 'شارژر در پارکینگ خانه', 'شرکت ملکی شارژ خودرو'
    ];
    for (const code of ['sv', 'ar', 'fa']) {
      if (I18N[code] && I18N[code].routes) I18N[code].routes.property_charging = ROOT_COPY[code];
    }

    const box = document.getElementById('engineResults');
    const input = document.querySelector('textarea, input[type="text"]');
    if (!box) return;
    const enrich = () => {
      const first = box.querySelector('a.route');
      if (!first) return;
      try {
        const url = new URL(first.href, location.href);
        if (String(url.searchParams.get('focus') || '').toLowerCase() !== FOCUS) return;
        const context = inferContext(input && input.value);
        if (context) url.searchParams.set('charging_context', context);
        first.href = url.pathname.split('/').pop() + url.search;
        box.dataset.primaryRoute = FOCUS;
      } catch (_err) { /* keep existing route */ }
    };
    new MutationObserver(enrich).observe(box, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
    if (input) input.addEventListener('input', enrich);
    enrich();
  }

  installRootRoute();

  if (
    typeof T === 'undefined' || typeof q !== 'function' || typeof flow !== 'function' ||
    typeof getRows !== 'function' || typeof results !== 'function' || typeof render !== 'function'
  ) return;

  const params = new URLSearchParams(window.location.search);
  const focus = String(params.get('focus') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  if (focus !== FOCUS) return;
  const initialContext = cleanContext(params.get('charging_context'));

  const copy = {
    sv: {
      contextQ: 'Vilken situation gäller?',
      assoc: 'BRF, samfällighet eller förening ordnar laddning',
      company: 'Fastighetsbolag eller företag ordnar laddning',
      resident: 'Jag är boende och vill ha laddpunkt vid min egen parkeringsplats',
      unsure: 'Jag är osäker',
      useQ: 'Vem ska främst använda föreningens laddpunkter?',
      members: 'Boende eller medlemmar',
      guests: 'Gäster eller besökare',
      external: 'Extern hyresgäst eller annan extern verksamhet',
      mixed: 'Flera grupper eller osäker',
      startedQ: 'Har installationen redan påbörjats?',
      notStarted: 'Nej',
      started: 'Ja',
      startedUnsure: 'Osäker',
      assocTitle: 'Ladda bilen har en särskild väg för föreningar och boendeorganisationer',
      assocBody: 'Naturvårdsverket anger att bland annat bostadsrättsföreningar och samfälligheter kan söka för laddstationer som ägs av föreningen. För boende eller medlemmar kan stödet vara 50 procent av bidragsberättigade kostnader, högst 15 000 kronor per laddpunkt. Det är ett tak och inte ett löfte om beviljat belopp.',
      externalTitle: 'Extern användning ändrar stödreglerna och tidpunkten',
      externalBody: 'När laddpunkterna gäller en extern hyresgäst eller annan extern part behandlas föreningen som marknadsaktör i den delen. Naturvårdsverket anger att ansökan då ska vara inskickad innan installationen påbörjas. Blandad användning kan behöva delas upp och beräknas enligt olika regler.',
      guestTitle: 'Gästladdning har en egen statsstödsgräns',
      guestBody: 'För gäster eller besökare anger Naturvårdsverket 50 procent av bidragsberättigade kostnader, högst 15 000 kronor per laddpunkt, men stödet klassas som stöd av mindre betydelse och andra sådana stöd kan därför behöva kontrolleras.',
      companyTitle: 'Företag och fastighetsbolag måste söka före start',
      companyBody: 'Naturvårdsverket anger att företag och organisationer som bedriver ekonomisk verksamhet ska ansöka innan installationsarbetet påbörjas. Om arbetet redan har startat kan stöd inte beviljas via den vägen.',
      companyStartedTitle: 'Påbörjat arbete är en stoppunkt för företagsvägen',
      companyStartedBody: 'Om arbetet redan är påbörjat ska Stödassistenten inte lova stöd. Kontrollera Naturvårdsverkets aktuella definition av påbörjad installation och annan möjlig väg innan fler kostnader tas.',
      residentTitle: 'Boendes rätt att begära laddpunkt är en annan fråga än föreningens bidrag',
      residentBody: 'Sedan 29 maj 2026 finns regler som i vissa fall ger hyresgäster och bostadsrättshavare rätt att på egen bekostnad begära installation av laddpunkt vid den egna parkeringsplatsen. Det är inte samma sak som att den boende automatiskt får Ladda bilen-bidrag eller att installation alltid måste godkännas.',
      residentNextTitle: 'Kontrollera parkeringsrätten och den aktuella lagens villkor',
      residentNextBody: 'Utgå från den aktuella upplåtelsen och parkeringsplatsen och vänd dig till hyresvärd eller bostadsrättsförening. En vägran får enligt de nya reglerna bara ske när det finns befogad anledning i de fall lagen är tillämplig; Stödassistenten avgör inte om ett enskilt fall uppfyller alla villkor.',
      unsureTitle: 'Börja med att skilja projektägare från boendes egen begäran',
      unsureBody: 'Det avgör om nästa steg är föreningens Ladda bilen-väg, företags-/fastighetsbolagsvägen eller den separata bostadsrätts-/hyresrättsregeln. Kontrollera detta innan belopp eller tidsregler används.'
    },
    ar: {
      contextQ: 'ما هي الحالة التي تنطبق؟', assoc: 'جمعية سكنية أو جمعية مرافق تريد إنشاء الشحن', company: 'شركة عقارية أو شركة تريد إنشاء الشحن', resident: 'أنا ساكن وأريد نقطة شحن في موقف سيارتي', unsure: 'لست متأكداً',
      useQ: 'من سيستخدم نقاط الشحن التابعة للجمعية أساساً؟', members: 'السكان أو الأعضاء', guests: 'الضيوف أو الزوار', external: 'مستأجر خارجي أو نشاط خارجي', mixed: 'عدة مجموعات أو غير واضح',
      startedQ: 'هل بدأ تنفيذ التركيب بالفعل؟', notStarted: 'لا', started: 'نعم', startedUnsure: 'غير متأكد',
      assocTitle: 'لدى Ladda bilen مسار خاص للجمعيات السكنية', assocBody: 'تذكر Naturvårdsverket أن جمعيات السكن والجمعيات المشتركة يمكنها التقدم لمحطات تملكها الجمعية. للاستخدام من السكان أو الأعضاء قد يصل الدعم إلى 50% من التكاليف المؤهلة وبحد أقصى 15,000 كرونة لكل نقطة. هذا حد أقصى وليس وعداً بالموافقة.',
      externalTitle: 'الاستخدام الخارجي يغير قواعد الدعم والتوقيت', externalBody: 'إذا كانت النقاط لمستأجر أو نشاط خارجي تعامل الجمعية كفاعل في السوق في هذا الجزء، وتذكر Naturvårdsverket أن الطلب يجب أن يرسل قبل بدء التركيب. الاستخدام المختلط قد يخضع لقواعد مختلفة.',
      guestTitle: 'شحن الضيوف له حدود منفصلة للمساعدات الحكومية', guestBody: 'للضيوف والزوار تذكر Naturvårdsverket نسبة 50% من التكاليف المؤهلة وبحد أقصى 15,000 كرونة لكل نقطة، مع ضرورة مراعاة قواعد الدعم محدود القيمة.',
      companyTitle: 'الشركات وشركات العقار يجب أن تتقدم قبل بدء العمل', companyBody: 'تذكر Naturvårdsverket أن الشركة أو المنظمة التي تمارس نشاطاً اقتصادياً يجب أن تتقدم قبل بدء أعمال التركيب. إذا بدأ العمل بالفعل فلا يمكن منح الدعم عبر هذا المسار.',
      companyStartedTitle: 'بدء العمل نقطة توقف لمسار الشركات', companyStartedBody: 'إذا بدأ العمل فلا تعد بالحصول على الدعم. تحقق من التعريف الحالي لبدء التركيب لدى Naturvårdsverket ومن أي مسار آخر قبل تحمل تكاليف إضافية.',
      residentTitle: 'حق الساكن في طلب نقطة شحن يختلف عن منحة الجمعية', residentBody: 'منذ 29 مايو 2026 توجد قواعد تمنح المستأجر أو صاحب حق السكن في بعض الحالات حق طلب نقطة شحن على نفقته في موقفه. هذا لا يعني تلقائياً أن الساكن يحصل على منحة Ladda bilen أو أن كل طلب يجب أن يقبل.',
      residentNextTitle: 'تحقق من حق استخدام الموقف وشروط القانون الحالي', residentNextBody: 'ابدأ بعقد السكن وحق الموقف وتواصل مع المالك أو الجمعية. في الحالات التي ينطبق فيها القانون لا يجوز الرفض إلا لسبب مبرر، لكن Stödassistenten لا يقرر أن الحالة الفردية تستوفي كل الشروط.',
      unsureTitle: 'افصل أولاً بين مشروع المنظمة وطلب الساكن الشخصي', unsureBody: 'هذا يحدد إن كان المسار هو Ladda bilen للجمعية أو للشركة أو قاعدة السكن المنفصلة. لا تستخدم مبالغ أو مواعيد قبل تحديد المسار.'
    },
    fa: {
      contextQ: 'کدام وضعیت مطرح است؟', assoc: 'انجمن ساختمان یا انجمن مشترک می‌خواهد شارژ نصب کند', company: 'شرکت ملکی یا شرکت می‌خواهد شارژ نصب کند', resident: 'من ساکن هستم و برای جای پارک خودم شارژر می‌خواهم', unsure: 'مطمئن نیستم',
      useQ: 'نقاط شارژ انجمن بیشتر برای چه کسانی است؟', members: 'ساکنان یا اعضا', guests: 'مهمانان یا بازدیدکنندگان', external: 'مستأجر یا فعالیت خارجی', mixed: 'چند گروه یا نامشخص',
      startedQ: 'آیا کار نصب شروع شده است؟', notStarted: 'خیر', started: 'بله', startedUnsure: 'مطمئن نیستم',
      assocTitle: 'Ladda bilen مسیر جداگانه‌ای برای انجمن‌های مسکونی دارد', assocBody: 'Naturvårdsverket می‌گوید انجمن‌های مسکونی و samfällighet می‌توانند برای ایستگاه‌هایی که متعلق به انجمن است درخواست دهند. برای ساکنان یا اعضا، کمک می‌تواند 50 درصد هزینه‌های واجد شرایط تا سقف 15,000 کرون برای هر نقطه باشد. این سقف است و تضمین پرداخت نیست.',
      externalTitle: 'استفاده خارجی قواعد و زمان‌بندی را تغییر می‌دهد', externalBody: 'وقتی نقطه شارژ برای مستأجر یا فعالیت خارجی است، انجمن در آن بخش فعال بازار محسوب می‌شود و Naturvårdsverket می‌گوید درخواست باید قبل از شروع نصب ارسال شود. استفاده ترکیبی ممکن است تحت قواعد متفاوت محاسبه شود.',
      guestTitle: 'شارژ مهمانان مرز جداگانه کمک دولتی دارد', guestBody: 'برای مهمانان Naturvårdsverket 50 درصد هزینه‌های واجد شرایط تا سقف 15,000 کرون برای هر نقطه را ذکر می‌کند، اما قواعد کمک کم‌اهمیت نیز باید بررسی شود.',
      companyTitle: 'شرکت‌ها و شرکت‌های ملکی باید پیش از شروع کار درخواست دهند', companyBody: 'Naturvårdsverket می‌گوید شرکت یا سازمان دارای فعالیت اقتصادی باید پیش از شروع کار نصب درخواست دهد. اگر کار آغاز شده باشد این مسیر کمک قابل اعطا نیست.',
      companyStartedTitle: 'شروع کار برای مسیر شرکت یک نقطه توقف است', companyStartedBody: 'اگر کار شروع شده است، محصول نباید وعده کمک بدهد. تعریف فعلی شروع نصب و مسیرهای دیگر را قبل از هزینه بیشتر بررسی کنید.',
      residentTitle: 'حق ساکن برای درخواست شارژر با کمک انجمن فرق دارد', residentBody: 'از 29 مه 2026 قواعدی وجود دارد که در برخی موارد به مستأجر یا دارنده bostadsrätt اجازه می‌دهد با هزینه خود درخواست نصب نقطه شارژ در پارکینگ خود را بدهد. این به معنی دریافت خودکار Ladda bilen یا پذیرش قطعی درخواست نیست.',
      residentNextTitle: 'حق پارکینگ و شرایط قانون فعلی را بررسی کنید', residentNextBody: 'از قرارداد و حق استفاده از پارکینگ شروع کنید و با مالک یا انجمن تماس بگیرید. در موارد مشمول قانون، رد درخواست فقط با دلیل موجه ممکن است؛ Stödassistenten تشخیص نهایی پرونده را نمی‌دهد.',
      unsureTitle: 'ابتدا پروژه سازمان را از درخواست شخصی ساکن جدا کنید', unsureBody: 'این مشخص می‌کند مسیر مناسب Ladda bilen انجمن، مسیر شرکت یا قانون جداگانه مسکن است. پیش از تعیین این موضوع از مبلغ یا مهلت استفاده نکنید.'
    }
  };

  for (const code of ['sv', 'ar', 'fa']) {
    Object.assign(T[code], {
      chargingContext: copy[code].contextQ,
      chargingAssoc: copy[code].assoc,
      chargingCompany: copy[code].company,
      chargingResident: copy[code].resident,
      chargingUnsure: copy[code].unsure,
      chargingUse: copy[code].useQ,
      chargingMembers: copy[code].members,
      chargingGuests: copy[code].guests,
      chargingExternal: copy[code].external,
      chargingMixed: copy[code].mixed,
      chargingStarted: copy[code].startedQ,
      chargingNotStarted: copy[code].notStarted,
      chargingStartedYes: copy[code].started,
      chargingStartedUnsure: copy[code].startedUnsure
    });
  }

  const baseFlow = flow;
  const baseGetRows = getRows;
  const baseResults = results;
  const currentLang = () => copy[document.documentElement.lang] ? document.documentElement.lang : 'sv';
  const context = () => cleanContext(answers.chargingContext || initialContext);

  function nextAfterContext(value) {
    if (value === 'association_project') return 'chargingUse';
    if (value === 'company_project') return 'chargingStarted';
    return 'chargingR';
  }

  flow = function () {
    if (screen === 'chargingContext') return q('chargingContext', [
      ['chargingAssoc', 'chargingUse', 'chargingContext', 'association_project'],
      ['chargingCompany', 'chargingStarted', 'chargingContext', 'company_project'],
      ['chargingResident', 'chargingR', 'chargingContext', 'resident_request'],
      ['chargingUnsure', 'chargingR', 'chargingContext', 'unsure']
    ], 'home', '1');
    if (screen === 'chargingUse') return q('chargingUse', [
      ['chargingMembers', 'chargingR', 'chargingUse', 'members'],
      ['chargingGuests', 'chargingR', 'chargingUse', 'guests'],
      ['chargingExternal', 'chargingStarted', 'chargingUse', 'external'],
      ['chargingMixed', 'chargingStarted', 'chargingUse', 'mixed']
    ], initialContext ? 'home' : 'chargingContext', '2');
    if (screen === 'chargingStarted') return q('chargingStarted', [
      ['chargingNotStarted', 'chargingR', 'chargingStarted', 'no'],
      ['chargingStartedYes', 'chargingR', 'chargingStarted', 'yes'],
      ['chargingStartedUnsure', 'chargingR', 'chargingStarted', 'unsure']
    ], context() === 'company_project' ? (initialContext ? 'home' : 'chargingContext') : 'chargingUse', '3');
    return baseFlow();
  };

  getRows = function () {
    if (scenario !== 'property_charging') return baseGetRows();
    const c = copy[currentLang()] || copy.sv;
    const rows = [];
    const ctx = context();
    if (ctx === 'association_project') {
      rows.push([c.assocTitle, c.assocBody, NV_ASSOC]);
      if (answers.chargingUse === 'external' || answers.chargingUse === 'mixed') rows.push([c.externalTitle, c.externalBody, NV_ASSOC]);
      else if (answers.chargingUse === 'guests') rows.push([c.guestTitle, c.guestBody, NV_ASSOC]);
      if ((answers.chargingUse === 'external' || answers.chargingUse === 'mixed') && answers.chargingStarted === 'yes') rows.push([c.companyStartedTitle, c.companyStartedBody, NV_COMPANY]);
    } else if (ctx === 'company_project') {
      rows.push([c.companyTitle, c.companyBody, NV_COMPANY]);
      if (answers.chargingStarted === 'yes') rows.push([c.companyStartedTitle, c.companyStartedBody, NV_COMPANY]);
    } else if (ctx === 'resident_request') {
      rows.push([c.residentTitle, c.residentBody, RIKSDAGEN]);
      rows.push([c.residentNextTitle, c.residentNextBody, RIKSDAGEN]);
    } else {
      rows.push([c.unsureTitle, c.unsureBody, NV_ASSOC]);
    }
    return rows.slice(0, 4);
  };

  results = function () {
    if (scenario !== 'property_charging') return baseResults();
    const rows = getRows();
    return `${back()}<section class="card"><h1>${tr('results')}</h1><div class="notice">${tr('disclaimer')}</div></section>${rows.map((r, i) => resultCard(r, i + 2)).join('')}${actionPlan()}<section class="card"><h2>${tr('finish')}</h2>${finalQuestion('new','newQ')}${finalQuestion('useful','usefulQ')}${finalQuestion('clear','clearQ')}<div class="summary">🔒 ${tr('sendNote')}</div><button class="btn primary share" ${submitState==='sending'||submitState==='sent'?'disabled':''} onclick="submitFeedback()">${tr('send')}</button>${statusHtml()}</section>`;
  };

  if (screen === 'home') {
    scenario = 'property_charging';
    answers = {};
    if (initialContext) answers.chargingContext = initialContext;
    matchRatings = {};
    finalFeedback = {};
    submitState = 'idle';
    screen = initialContext ? nextAfterContext(initialContext) : 'chargingContext';
    render();
  }
})();
