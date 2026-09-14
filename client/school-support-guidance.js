(() => {
  'use strict';

  // SAME PRODUCT: this module augments the existing root situation engine and
  // person-pilot family journey. It does not create a separate school app or
  // matcher. Raw situation text is never copied into the handoff or feedback.
  const FOCUS = 'school_support';
  const SKOLVERKET_SUPPORT = 'https://www.skolverket.se/styrning-och-ansvar/regler-och-ansvar/ansvar-i-skolfragor/extra-anpassningar-sarskilt-stod-och-atgardsprogram';
  const SKOLVERKET_EASY = 'https://www.skolverket.se/lattlast/lattlast-information-fran-skolverket/hjalp-om-ditt-barn-behover-extra-stod-pa-lattlast-svenska';
  const APPEAL = 'https://www.overklagandenamnden.se/hur-du-overklagar/beslut-som-kan-overklagas/';

  const ROOT_COPY = {
    sv: ['Skolstöd för barn', 'Läsning, skrivning, koncentration eller annat stödbehov i skolan', `person-pilot.html?actor_type=relative&focus=${FOCUS}`],
    ar: ['دعم الطفل في المدرسة', 'القراءة أو الكتابة أو التركيز أو حاجة أخرى للدعم في المدرسة', `person-pilot.html?actor_type=relative&focus=${FOCUS}`],
    fa: ['حمایت کودک در مدرسه', 'خواندن، نوشتن، تمرکز یا نیاز دیگر به حمایت در مدرسه', `person-pilot.html?actor_type=relative&focus=${FOCUS}`],
  };

  function installRootRoute() {
    if (typeof KEYWORDS === 'undefined' || typeof I18N === 'undefined') return;

    KEYWORDS.school_support = [
      'skolan kräver diagnos', 'skolan väntar på diagnos', 'stöd utan diagnos',
      'läs- och skrivsvårigheter', 'läs och skrivsvårigheter', 'dyslexi skola',
      'adhd skola stöd', 'adhd stöd i skolan', 'svårt att koncentrera sig i skolan',
      'svårt med skolarbetet', 'skolan ger inget stöd', 'skolan gör inget',
      'المدرسة تطلب تشخيصا', 'دعم في المدرسة بدون تشخيص', 'صعوبة في القراءة والكتابة',
      'adhd دعم المدرسة', 'صعوبة التركيز في المدرسة',
      'مدرسه تشخیص می خواهد', 'حمایت مدرسه بدون تشخیص', 'مشکل خواندن و نوشتن',
      'adhd حمایت مدرسه', 'مشکل تمرکز در مدرسه'
    ];

    for (const code of ['sv', 'ar', 'fa']) {
      if (I18N[code] && I18N[code].routes) I18N[code].routes.school_support = ROOT_COPY[code];
    }

    const box = document.getElementById('engineResults');
    if (!box) return;
    const mark = () => {
      const first = box.querySelector('a.route');
      if (!first) return;
      try {
        const url = new URL(first.href, location.href);
        if (String(url.searchParams.get('focus') || '').toLowerCase() === FOCUS) {
          box.dataset.primaryRoute = FOCUS;
        }
      } catch (_err) { /* keep existing route classification */ }
    };
    new MutationObserver(mark).observe(box, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
    mark();
  }

  installRootRoute();

  // The remaining logic only exists on person-pilot.html.
  if (
    typeof T === 'undefined' || typeof q !== 'function' || typeof go !== 'function' ||
    typeof start !== 'function' || typeof chooseAnswer !== 'function' ||
    typeof flow !== 'function' || typeof getRows !== 'function' || typeof actionPlan !== 'function'
  ) return;

  const copy = {
    sv: {
      schoolStatus: 'Vad har skolan gjort hittills?',
      noClear: 'Inga tydliga anpassningar eller utredning ännu',
      tried: 'Extra anpassningar har provats men räcker inte',
      decision: 'Rektor har beslutat om åtgärdsprogram eller att inte göra ett',
      unsure: 'Jag är osäker',
      needTitle: 'Skolstöd utgår från behov – inte diagnos',
      needBody: 'Skolverket anger att en diagnos aldrig får vara ett villkor för extra anpassningar eller särskilt stöd. En diagnos betyder inte heller automatiskt att en viss stödåtgärd ska ges. Utgå från hur svårigheterna påverkar skolsituationen.',
      firstTitle: 'Be skolan konkretisera behov, stöd och uppföljning',
      firstBody: 'Om skolan ser risk att eleven inte når de kriterier som minst ska uppfyllas ska extra anpassningar ges skyndsamt. Om eleven har andra svårigheter i skolsituationen kan behov av särskilt stöd också behöva utredas. Be om en konkret beskrivning av vad som prövats och hur det följts upp.',
      investigateTitle: 'Be rektor skyndsamt utreda behovet av särskilt stöd',
      investigateBody: 'När extra anpassningar inte räcker, eller det finns särskilda skäl att anta att de inte skulle räcka, ska behovet av särskilt stöd utredas skyndsamt. Samråd ska ske med elevhälsan om det inte är uppenbart obehövligt.',
      appealTitle: 'Kontrollera det formella beslutet och överklagandevägen',
      appealBody: 'Beslut om åtgärdsprogram, eller beslut att inte utarbeta ett åtgärdsprogram, kan överklagas till Skolväsendets överklagandenämnd. Produkten kan inte lova ett visst utfall eller en viss stödåtgärd.',
      planTitle: 'Nästa säkra steg',
      planNo1: '1. Beskriv konkreta svårigheter i skolsituationen: vad barnet försöker göra, var det fastnar och vad som händer i undervisning, raster eller andra skolmiljöer.',
      planNo2: '2. Fråga läraren och rektorn vilka extra anpassningar som har prövats, vad de ska lösa och när de följs upp.',
      planNo3: '3. Om problemen kvarstår eller är mer omfattande: be rektor ta ställning till en skyndsam utredning av särskilt stöd. Vänta inte på en medicinsk diagnos som villkor för att frågan ska tas upp.',
      planTried1: '1. Samla konkreta exempel på vad de nuvarande anpassningarna inte löser.',
      planTried2: '2. Kontakta rektor och be om skyndsam utredning av särskilt stöd; fråga hur elevhälsan involveras och när utredningen följs upp.',
      planTried3: '3. Be om tydligt besked om vilka behov och åtgärder skolan bedömer, utan att göra diagnosen till hela behovsbeskrivningen.',
      planDecision1: '1. Be om det skriftliga beslutet om åtgärdsprogram eller att inget åtgärdsprogram ska utarbetas.',
      planDecision2: '2. Kontrollera att behov, åtgärder, ansvar och uppföljning framgår om ett åtgärdsprogram finns.',
      planDecision3: '3. Om ni inte är nöjda: använd den officiella överklagandeinformationen. Stödassistenten avgör inte överklagandets utfall.',
    },
    ar: {
      schoolStatus: 'ما الذي قامت به المدرسة حتى الآن؟',
      noClear: 'لا توجد تكييفات أو عملية تقييم واضحة حتى الآن',
      tried: 'تمت تجربة تكييفات إضافية لكنها غير كافية',
      decision: 'اتخذ المدير قراراً بشأن خطة دعم أو بعدم إعدادها',
      unsure: 'لست متأكداً',
      needTitle: 'الدعم المدرسي يعتمد على الحاجة – وليس على التشخيص',
      needBody: 'توضح Skolverket أن التشخيص لا يجوز أن يكون شرطاً للحصول على التكييفات الإضافية أو الدعم الخاص. كما أن التشخيص لا يعني تلقائياً إجراء دعم محدداً. المهم هو كيف تؤثر الصعوبات على وضع الطفل في المدرسة.',
      firstTitle: 'اطلب من المدرسة توضيح الحاجة والدعم والمتابعة',
      firstBody: 'إذا كان هناك خوف من ألا يحقق التلميذ الحد الأدنى من معايير المعرفة فيجب تقديم تكييفات إضافية بسرعة. كما قد تستلزم صعوبات أخرى في الوضع المدرسي تقييماً للحاجة إلى دعم خاص. اطلب وصفاً واضحاً لما جُرّب وكيف تمت متابعته.',
      investigateTitle: 'اطلب من المدير إجراء تقييم سريع للحاجة إلى دعم خاص',
      investigateBody: 'عندما لا تكفي التكييفات الإضافية، أو توجد أسباب خاصة للاعتقاد بأنها لن تكفي، يجب تقييم الحاجة إلى دعم خاص بسرعة. تتم المشاورة مع فريق صحة الطلاب ما لم يكن ذلك غير ضروري بشكل واضح.',
      appealTitle: 'تحقق من القرار الرسمي ومسار الطعن',
      appealBody: 'يمكن الطعن في قرار خطة الدعم أو قرار عدم إعداد خطة دعم لدى Skolväsendets överklagandenämnd. لا يمكن للمنتج ضمان نتيجة أو إجراء دعم بعينه.',
      planTitle: 'الخطوة الآمنة التالية',
      planNo1: '1. صف صعوبات ملموسة في الوضع المدرسي وما الذي لا ينجح في التعليم أو الاستراحة أو البيئات المدرسية الأخرى.',
      planNo2: '2. اسأل المعلم والمدير ما التكييفات الإضافية التي جُرّبت وما الهدف منها ومتى ستتم متابعتها.',
      planNo3: '3. إذا استمرت المشكلات أو كانت أوسع: اطلب من المدير النظر في تقييم سريع للدعم الخاص. لا تنتظر تشخيصاً طبياً كشرط لبدء السؤال.',
      planTried1: '1. اجمع أمثلة ملموسة على ما لا تحله التكييفات الحالية.',
      planTried2: '2. تواصل مع المدير واطلب تقييماً سريعاً للدعم الخاص واسأل كيف سيشارك فريق صحة الطلاب ومتى تتم المتابعة.',
      planTried3: '3. اطلب توضيحاً للاحتياجات والإجراءات التي تقيمها المدرسة دون اختزال الحاجة في التشخيص.',
      planDecision1: '1. اطلب نسخة مكتوبة من القرار بشأن خطة الدعم أو عدم إعدادها.',
      planDecision2: '2. إذا توجد خطة، تحقق من أن الاحتياجات والإجراءات والمسؤولية والمتابعة موضحة.',
      planDecision3: '3. إذا لم تكونوا راضين، استخدموا معلومات الطعن الرسمية. Stödassistenten لا يقرر نتيجة الطعن.',
    },
    fa: {
      schoolStatus: 'مدرسه تا الان چه کاری انجام داده است؟',
      noClear: 'هنوز سازگاری یا بررسی روشنی انجام نشده است',
      tried: 'سازگاری‌های اضافی امتحان شده اما کافی نبوده است',
      decision: 'مدیر مدرسه درباره برنامه حمایتی یا نداشتن آن تصمیم گرفته است',
      unsure: 'مطمئن نیستم',
      needTitle: 'حمایت مدرسه بر اساس نیاز است – نه تشخیص',
      needBody: 'Skolverket می‌گوید تشخیص پزشکی هرگز نباید شرط دریافت سازگاری‌های اضافی یا حمایت ویژه باشد. تشخیص نیز به‌طور خودکار یک اقدام خاص را تضمین نمی‌کند. باید دید مشکلات چگونه بر وضعیت کودک در مدرسه اثر می‌گذارد.',
      firstTitle: 'از مدرسه بخواهید نیاز، حمایت و پیگیری را مشخص کند',
      firstBody: 'اگر بیم آن باشد که دانش‌آموز حداقل معیارهای دانش را برآورده نکند، سازگاری‌های اضافی باید سریع ارائه شود. دشواری‌های دیگر در وضعیت مدرسه نیز می‌تواند بررسی حمایت ویژه را لازم کند. بخواهید روشن شود چه چیزی امتحان شده و چگونه پیگیری شده است.',
      investigateTitle: 'از مدیر بخواهید نیاز به حمایت ویژه را سریع بررسی کند',
      investigateBody: 'وقتی سازگاری‌های اضافی کافی نیست، یا دلیل خاصی وجود دارد که کافی نخواهد بود، نیاز به حمایت ویژه باید سریع بررسی شود. مگر اینکه آشکارا لازم نباشد، باید با تیم سلامت دانش‌آموز مشورت شود.',
      appealTitle: 'تصمیم رسمی و مسیر اعتراض را بررسی کنید',
      appealBody: 'تصمیم درباره برنامه حمایتی یا تصمیم به تهیه نکردن آن قابل اعتراض نزد Skolväsendets överklagandenämnd است. محصول نتیجه اعتراض یا اقدام خاصی را تضمین نمی‌کند.',
      planTitle: 'قدم امن بعدی',
      planNo1: '1. مشکل‌های مشخص در وضعیت مدرسه را توضیح دهید: کودک چه کاری می‌خواهد انجام دهد، کجا گیر می‌کند و در کلاس، زنگ تفریح یا محیط‌های دیگر چه رخ می‌دهد.',
      planNo2: '2. از معلم و مدیر بپرسید چه سازگاری‌هایی امتحان شده، قرار است چه مشکلی را حل کند و چه زمانی پیگیری می‌شود.',
      planNo3: '3. اگر مشکل ادامه دارد یا گسترده‌تر است، از مدیر بخواهید بررسی سریع حمایت ویژه را در نظر بگیرد. برای طرح موضوع منتظر تشخیص پزشکی نمانید.',
      planTried1: '1. نمونه‌های مشخصی جمع کنید که نشان دهد سازگاری‌های فعلی چه چیزی را حل نمی‌کند.',
      planTried2: '2. با مدیر تماس بگیرید و بررسی سریع حمایت ویژه را بخواهید؛ بپرسید تیم سلامت دانش‌آموز چگونه درگیر می‌شود و پیگیری چه زمانی است.',
      planTried3: '3. توضیح روشن درباره نیازها و اقدام‌های مورد ارزیابی مدرسه بخواهید، بدون اینکه تشخیص جای توضیح نیاز را بگیرد.',
      planDecision1: '1. نسخه کتبی تصمیم درباره برنامه حمایتی یا تصمیم به تهیه نکردن آن را بخواهید.',
      planDecision2: '2. اگر برنامه‌ای وجود دارد، بررسی کنید نیازها، اقدام‌ها، مسئول و زمان پیگیری روشن باشد.',
      planDecision3: '3. اگر راضی نیستید از اطلاعات رسمی اعتراض استفاده کنید. Stödassistenten نتیجه اعتراض را تعیین نمی‌کند.',
    },
  };

  for (const code of ['sv', 'ar', 'fa']) {
    if (!T[code]) continue;
    const c = copy[code];
    Object.assign(T[code], {
      schoolStatus: c.schoolStatus,
      schoolNoClear: c.noClear,
      schoolTried: c.tried,
      schoolDecision: c.decision,
      schoolUnsure: c.unsure,
    });
  }

  const params = new URLSearchParams(window.location.search);
  const focus = String(params.get('focus') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  const originalChooseAnswer = chooseAnswer;
  const originalFlow = flow;
  const originalGetRows = getRows;
  const originalActionPlan = actionPlan;
  let schoolMode = false;

  function resetLearningState() {
    if (typeof matchRatings !== 'undefined') matchRatings = {};
    if (typeof finalFeedback !== 'undefined') finalFeedback = {};
    if (typeof submitState !== 'undefined') submitState = 'idle';
  }

  chooseAnswer = function schoolAwareChooseAnswer(key, val, next) {
    if (key === 'child' && typeof scenario !== 'undefined' && scenario === 'family' && focus === FOCUS && val === 'yes') {
      if (typeof answers !== 'undefined') answers[key] = val;
      schoolMode = true;
      resetLearningState();
      go('school1');
      return;
    }
    if (key === 'extra' && typeof scenario !== 'undefined' && scenario === 'family' && val === 'school') {
      if (typeof answers !== 'undefined') answers[key] = val;
      schoolMode = true;
      resetLearningState();
      go('school1');
      return;
    }
    if (key === 'schoolState' && schoolMode) {
      if (typeof answers !== 'undefined') answers[key] = val;
      go('familyR');
      return;
    }
    return originalChooseAnswer(key, val, next);
  };

  flow = function schoolAwareFlow() {
    if (screen === 'school1' && schoolMode) {
      const prev = answers && answers.extra === 'school' ? 'family2' : 'family1';
      return q('schoolStatus', [
        ['schoolNoClear', 'familyR', 'schoolState', 'no_clear'],
        ['schoolTried', 'familyR', 'schoolState', 'tried_not_enough'],
        ['schoolDecision', 'familyR', 'schoolState', 'formal_decision'],
        ['schoolUnsure', 'familyR', 'schoolState', 'unsure'],
      ], prev, '2 / 2');
    }
    return originalFlow();
  };

  function language() {
    return copy[lang] ? lang : 'sv';
  }

  getRows = function schoolAwareRows() {
    if (!schoolMode) return originalGetRows();
    const c = copy[language()];
    const state = answers ? answers.schoolState : 'unsure';
    const rows = [[c.needTitle, c.needBody, SKOLVERKET_SUPPORT]];
    if (state === 'tried_not_enough') rows.push([c.investigateTitle, c.investigateBody, SKOLVERKET_SUPPORT]);
    else if (state === 'formal_decision') rows.push([c.appealTitle, c.appealBody, APPEAL]);
    else rows.push([c.firstTitle, c.firstBody, SKOLVERKET_EASY]);
    return rows;
  };

  actionPlan = function schoolAwareActionPlan() {
    if (!schoolMode) return originalActionPlan();
    const c = copy[language()];
    const state = answers ? answers.schoolState : 'unsure';
    let steps;
    if (state === 'tried_not_enough') steps = [c.planTried1, c.planTried2, c.planTried3];
    else if (state === 'formal_decision') steps = [c.planDecision1, c.planDecision2, c.planDecision3];
    else steps = [c.planNo1, c.planNo2, c.planNo3];
    return `<section class="card"><h2>${c.planTitle}</h2>${steps.map(x => `<div class="info">${x}</div>`).join('')}</section>`;
  };

  if (focus === FOCUS && typeof screen !== 'undefined' && screen === 'home') {
    start('family');
  }

  document.documentElement.setAttribute('data-school-support-guidance', 'active');
})();
