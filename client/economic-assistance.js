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
  const DEBT_COUNSELLING_URL = 'https://www.konsumentverket.se/ekonomi/kommunal-budget-och-skuldradgivning/';
  const KRONOFOGDEN_BILLS_URL = 'https://kronofogden.se/kontakta-oss/fragor-och-svar/rad-och-stod/2025-04-08-mina-rakningar-ar-helt-i-kaos.-vad-ska-jag-gora';
  const KRONOFOGDEN_DEMAND_URL = 'https://www.kronofogden.se/nagon-har-krav-mot-dig/du-har-fatt-ett-krav-forelaggande/du-har-fatt-ett-krav-om-att-betala';

  const DIRECT_PATTERNS = [
    /\b(?:försörjningsstöd|ekonomiskt\s+bistånd|socialbidrag|socialtjänst(?:en)?)\b/i,
    /(?:مساعدة|إعانة)\s+(?:اجتماعية|مالية)|الخدمات\s+الاجتماعية/i,
    /کمک(?:‌|\s)+(?:اجتماعی|مالی)|خدمات(?:‌|\s)+اجتماعی/i,
  ];
  const MONEY_PRESSURE_PATTERNS = [
    /\b(?:pengarna\s+räcker\s+inte|har\s+inte\s+råd|saknar\s+pengar|ingen\s+inkomst|utan\s+inkomst|ekonomisk\s+kris|kan\s+inte\s+betala)\b/i,
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
  const DEBT_PATTERNS = [
    /\b(?:skuld|skulden|skulder|skulderna|skuldsatt|skuldsatta|inkasso|kronofogden|skuldsanering|betalningspåminnelse|betalningskrav|obetalda?\s+räkningar|räkningarna\s+är\s+(?:helt\s+)?i\s+kaos)\b/i,
    /ديون|دين|مديون|تحصيل\s+الديون|إنكاسو|كرونوفوغدن|تسوية\s+الديون|فواتير\s+غير\s+مدفوعة/i,
    /بدهی|بدهکار|وصول\s+مطالبات|اینکاسو|کرونوفوگدن|تسویه\s+بدهی|قبض(?:‌|\s)*های\s+پرداخت(?:‌|\s)*نشده/i,
  ];
  const DEMAND_NOTICE_PATTERNS = [
    /\bbetalningsföreläggande\b|\bföreläggande\s+från\s+kronofogden\b|\b(?:brev|krav|kravbrev)\s+från\s+kronofogden\b|\bkronofogden.{0,30}(?:brev|föreläggande|kravbrev|krav)\b/i,
    /(?:خطاب|رسالة|إشعار|أمر).{0,40}(?:كرونوفوغدن|Kronofogden)|(?:كرونوفوغدن|Kronofogden).{0,40}(?:خطاب|رسالة|إشعار|مطالبة)/i,
    /(?:نامه|اخطار|ابلاغ|دستور).{0,40}(?:کرونوفوگدن|Kronofogden)|(?:کرونوفوگدن|Kronofogden).{0,40}(?:نامه|اخطار|ابلاغ|مطالبه)/i,
  ];
  const NON_DEBT_WORK_PATTERNS = [
    /\b(?:jobbar|arbetar)\s+(?:på|hos)\s+kronofogden\b/i,
  ];
  const DEBT_WITHOUT_KFM_PATTERNS = [
    /\b(?:skuld|skulden|skulder|skulderna|skuldsatt|skuldsatta|inkasso|skuldsanering|betalningspåminnelse|betalningskrav|obetalda?\s+räkningar|räkningarna\s+är\s+(?:helt\s+)?i\s+kaos)\b/i,
    /ديون|دين|مديون|تحصيل\s+الديون|إنكاسو|تسوية\s+الديون|فواتير\s+غير\s+مدفوعة/i,
    /بدهی|بدهکار|وصول\s+مطالبات|اینکاسو|تسویه\s+بدهی|قبض(?:‌|\s)*های\s+پرداخت(?:‌|\s)*نشده/i,
  ];
  const ACUTE_HOUSING_PATTERNS = [
    /(?:kan\s+inte|klarar\s+inte).{0,30}(?:betala|täcka).{0,30}(?:hyr|el)|(?:hyr|el).{0,30}(?:förfaller|stängs\s+av|vräk)/i,
    /لا\s+أستطيع.{0,30}(?:دفع).{0,30}(?:الإيجار|الكهرباء)|طرد\s+من\s+السكن/i,
    /نمی(?:‌|\s)*توانم.{0,30}(?:اجاره|برق).{0,30}(?:پرداخت)|اخراج\s+از\s+خانه/i,
  ];
  const ACUTE_BASIC_PATTERNS = [
    /(?:har\s+inte\s+råd|saknar\s+pengar|pengarna\s+räcker\s+inte|kan\s+inte\s+betala).{0,30}(?:mat|livsmedel|medicin)/i,
    /(?:لا\s+أستطيع\s+الدفع|المال.*لا\s+يكفي).{0,30}(?:طعام|غذاء|دواء)/i,
    /(?:پول.*کافی\s+نیست|نمی(?:‌|\s)*توانم.*پرداخت).{0,30}(?:غذا|دارو)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'När pengarna inte räcker till det nödvändiga',
      shellSub: 'Kontrollera kommunalt ekonomiskt bistånd utan att lova rätt eller belopp',
      debtShellTitle: 'När räkningar och skulder har byggts upp',
      debtShellSub: 'Hitta kommunal budget- och skuldrådgivning utan att lova skuldsanering eller avskrivning',
      noticeShellTitle: 'Har du fått ett kravbrev från Kronofogden?',
      noticeShellSub: 'Bekräfta mottagandet, ta ställning till kravet och följ tiden som står i brevet',
      eyebrow: 'Ekonomi + grundbehov',
      debtEyebrow: 'Ekonomi + skulder',
      noticeEyebrow: 'Ekonomi + krav från Kronofogden',
      title: 'Du kan få din situation prövad av socialtjänsten i din kommun',
      debtPageTitle: 'Skulder och akut brist på pengar är två olika vägar',
      noticePageTitle: 'Ett föreläggande behöver ett konkret svar – det är inte samma sak som att godkänna kravet',
      intro: 'Stödassistenten avgör inte om du har rätt till bistånd. Vi hjälper dig skilja mellan möjliga vägar och nästa säkra handling utan att samla in exakta ekonomiska eller medicinska uppgifter.',
      debtIntro: 'Om problemet främst är skulder eller obetalda räkningar kan kommunens budget- och skuldrådgivning hjälpa dig att få överblick och planera nästa steg. Om du samtidigt saknar pengar till hyra, el, mat eller medicin just nu behöver den akuta biståndsvägen fortfarande vara synlig.',
      noticeIntro: 'Om du har fått ett föreläggande från Kronofogden är första uppgiften att hantera just brevet. Bekräftelsen av mottagandet betyder inte att du godkänner kravet, och nästa steg beror på om kravet är rätt eller fel.',
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
      debtTitle: 'Börja med kommunens budget- och skuldrådgivning när skulderna är huvudproblemet',
      debtBody: 'Konsumentverket beskriver att kommunal budget- och skuldrådgivning kan hjälpa dig att planera ekonomin, hantera och prioritera skulder, kontakta dem du är skyldig pengar och ge stöd inför och under en eventuell skuldsanering. Det betyder inte att kommunen betalar skulderna eller att skuldsanering kommer att beviljas.',
      debtNext: 'Nästa steg: hitta budget- och skuldrådgivningen i din kommun. Om du riskerar att inte klara hyra, el, mat eller medicin nu, använd också vägen för ekonomiskt bistånd; skuldrådgivning ersätter inte en individuell prövning av akut stöd.',
      noticeTitle: 'Gör två saker i rätt ordning',
      noticeBody: 'Bekräfta först att du har tagit emot brevet. Det betyder inte att du godkänner kravet. Ta sedan ställning: om kravet är rätt följer du kravet och betalar om du kan eller kontaktar den som kräver betalt; om kravet är fel invänder du mot det.',
      noticeNext: 'Nästa steg: använd Kronofogdens aktuella vägledning eller Mina sidor och följ förklaringstiden som står i ditt eget brev. Stödassistenten gissar inte hur många dagar du har. Om du samtidigt inte klarar hyra, el, mat eller medicin, använd också den akuta biståndsvägen.',
      documents: 'Nästa steg: fråga kommunen vilka underlag som behövs för hushåll, boende, inkomster, tillgångar och nödvändiga utgifter. Lägg inte in kontoutdrag, personnummer eller detaljerad hälsodata i den här publika piloten.',
      calc: 'Socialstyrelsens provberäkning är bara orienterande och kan ge ett annat resultat än kommunens individuella beslut.',
      source: 'Socialstyrelsen: ekonomiskt bistånd för privatpersoner',
      calcSource: 'Socialstyrelsen: provberäkning ekonomiskt bistånd',
      debtSource: 'Konsumentverket: kommunal budget- och skuldrådgivning',
      billsSource: 'Kronofogden: när räkningarna är i kaos',
      noticeSource: 'Kronofogden: du har fått ett krav om att betala',
    },
    ar: {
      shellTitle: 'عندما لا يكفي المال للاحتياجات الأساسية',
      shellSub: 'تحقق من المساعدة المالية البلدية من دون وعد بالاستحقاق أو المبلغ',
      debtShellTitle: 'عندما تتراكم الفواتير والديون',
      debtShellSub: 'اعثر على استشارة البلدية للميزانية والديون من دون وعد بتسوية الديون',
      noticeShellTitle: 'هل وصلك خطاب مطالبة من Kronofogden؟',
      noticeShellSub: 'أكّد استلام الخطاب ثم حدّد موقفك من المطالبة واتبع المهلة المكتوبة فيه',
      eyebrow: 'الاقتصاد + الاحتياجات الأساسية',
      debtEyebrow: 'الاقتصاد + الديون',
      noticeEyebrow: 'الاقتصاد + مطالبة من Kronofogden',
      title: 'يمكن للخدمات الاجتماعية في بلديتك فحص وضعك',
      debtPageTitle: 'الديون ونقص المال للحاجات الأساسية مساران مختلفان',
      noticePageTitle: 'خطاب Kronofogden يحتاج إلى رد عملي، وتأكيد الاستلام لا يعني قبول المطالبة',
      intro: 'لا يقرر مساعد الدعم الاستحقاق. نساعدك على فهم المسار والخطوة الآمنة التالية من دون جمع تفاصيل مالية أو طبية دقيقة.',
      debtIntro: 'إذا كانت المشكلة الأساسية ديوناً أو فواتير غير مدفوعة، يمكن لاستشارة البلدية للميزانية والديون أن تساعدك على ترتيب الوضع والخطوة التالية. وإذا كنت لا تستطيع الآن دفع الإيجار أو الكهرباء أو الطعام أو الدواء، فيجب أن يبقى مسار المساعدة المالية العاجلة واضحاً أيضاً.',
      noticeIntro: 'إذا وصلك föreläggande من Kronofogden فابدأ بالتعامل مع الخطاب نفسه. تأكيد الاستلام لا يعني أنك توافق على المطالبة، والخطوة التالية تعتمد على كون المطالبة صحيحة أو خاطئة.',
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
      debtTitle: 'ابدأ باستشارة البلدية للميزانية والديون عندما تكون الديون هي المشكلة الأساسية',
      debtBody: 'توضح هيئة حماية المستهلك أن مستشاري الميزانية والديون في البلدية يمكنهم المساعدة في التخطيط للاقتصاد وترتيب الديون والتواصل مع الدائنين وتقديم الدعم إذا أصبحت تسوية الديون ذات صلة. هذا لا يعني أن البلدية تدفع ديونك أو أن تسوية الديون ستُقبل.',
      debtNext: 'الخطوة التالية: اعثر على مستشار الميزانية والديون في بلديتك. إذا كنت لا تستطيع حالياً تغطية الإيجار أو الكهرباء أو الطعام أو الدواء، استخدم أيضاً مسار المساعدة المالية؛ الاستشارة لا تستبدل التقييم الفردي للمساعدة العاجلة.',
      noticeTitle: 'نفّذ خطوتين بالترتيب الصحيح',
      noticeBody: 'أكّد أولاً أنك استلمت الخطاب؛ هذا لا يعني قبول المطالبة. ثم حدّد موقفك: إذا كانت المطالبة صحيحة فاتبع التعليمات وادفع إن استطعت أو تواصل مع صاحب المطالبة، وإذا كانت خاطئة فاعترض عليها.',
      noticeNext: 'الخطوة التالية: استخدم إرشادات Kronofogden الحالية أو Mina sidor واتبع المهلة المكتوبة في خطابك نفسه. لا يخمّن مساعد الدعم عدد الأيام. وإذا كنت لا تستطيع أيضاً تغطية الإيجار أو الكهرباء أو الطعام أو الدواء، فاستخدم مسار المساعدة المالية العاجلة كذلك.',
      documents: 'الخطوة التالية: اسأل البلدية عن المستندات المطلوبة بخصوص الأسرة والسكن والدخل والأصول والنفقات الضرورية. لا تضع كشوف الحساب أو الرقم الشخصي أو تفاصيل صحية حساسة في هذه النسخة العامة.',
      calc: 'الحساب التجريبي لدى Socialstyrelsen إرشادي فقط وقد يختلف عن قرار البلدية الفردي.',
      source: 'Socialstyrelsen: المساعدة المالية للأفراد',
      calcSource: 'Socialstyrelsen: الحساب التجريبي للمساعدة المالية',
      debtSource: 'Konsumentverket: استشارة البلدية للميزانية والديون',
      billsSource: 'Kronofogden: عندما تصبح الفواتير في فوضى',
      noticeSource: 'Kronofogden: لقد وصلك طلب للدفع',
    },
    fa: {
      shellTitle: 'وقتی پول برای نیازهای ضروری کافی نیست',
      shellSub: 'کمک مالی شهرداری را بدون وعده استحقاق یا مبلغ بررسی کن',
      debtShellTitle: 'وقتی قبض‌ها و بدهی‌ها روی هم جمع شده‌اند',
      debtShellSub: 'مشاوره بودجه و بدهی شهرداری را بدون وعده بخشودگی یا تسویه بدهی پیدا کن',
      noticeShellTitle: 'از Kronofogden نامه مطالبه دریافت کرده‌ای؟',
      noticeShellSub: 'دریافت نامه را تأیید کن، درباره مطالبه تصمیم بگیر و مهلت نوشته‌شده در نامه را دنبال کن',
      eyebrow: 'اقتصاد + نیازهای پایه',
      debtEyebrow: 'اقتصاد + بدهی',
      noticeEyebrow: 'اقتصاد + مطالبه Kronofogden',
      title: 'خدمات اجتماعی شهرداری می‌تواند وضعیتت را بررسی کند',
      debtPageTitle: 'بدهی و کمبود فوری پول دو مسیر متفاوت‌اند',
      noticePageTitle: 'ابلاغ Kronofogden نیاز به اقدام مشخص دارد و تأیید دریافت به معنی پذیرفتن مطالبه نیست',
      intro: 'دستیار حمایت درباره استحقاق تصمیم نمی‌گیرد. فقط مسیر و قدم امن بعدی را روشن می‌کند، بدون جمع‌آوری جزئیات دقیق مالی یا پزشکی.',
      debtIntro: 'اگر مشکل اصلی بدهی یا قبض‌های پرداخت‌نشده است، مشاوره بودجه و بدهی شهرداری می‌تواند برای نظم‌دادن به وضعیت و قدم بعدی کمک کند. اگر هم‌زمان پول اجاره، برق، غذا یا دارو را نداری، مسیر کمک مالی فوری هم باید روشن بماند.',
      noticeIntro: 'اگر از Kronofogden ابلاغ یا مطالبه گرفته‌ای، اول همان نامه را مدیریت کن. تأیید دریافت به معنی قبول مطالبه نیست و قدم بعدی بستگی دارد به اینکه مطالبه درست است یا نادرست.',
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
      debtTitle: 'وقتی مشکل اصلی بدهی است، با مشاوره بودجه و بدهی شهرداری شروع کن',
      debtBody: 'Konsumentverket توضیح می‌دهد که مشاور بودجه و بدهی شهرداری می‌تواند برای برنامه‌ریزی اقتصاد، اولویت‌بندی بدهی‌ها، تماس با طلبکاران و حمایت در صورت مطرح شدن تسویه بدهی کمک کند. این به معنی پرداخت بدهی‌ها توسط شهرداری یا تضمین تسویه بدهی نیست.',
      debtNext: 'قدم بعدی: مشاوره بودجه و بدهی شهرداری خودت را پیدا کن. اگر الان پول اجاره، برق، غذا یا دارو را نداری، مسیر کمک مالی را هم بررسی کن؛ مشاوره جای ارزیابی فردی کمک فوری را نمی‌گیرد.',
      noticeTitle: 'دو کار را به ترتیب درست انجام بده',
      noticeBody: 'اول تأیید کن که نامه را دریافت کرده‌ای؛ این به معنی پذیرفتن مطالبه نیست. بعد تصمیم بگیر: اگر مطالبه درست است طبق آن عمل کن و اگر می‌توانی پرداخت کن یا با طلبکار تماس بگیر؛ اگر مطالبه نادرست است به آن اعتراض کن.',
      noticeNext: 'قدم بعدی: از راهنمای فعلی Kronofogden یا Mina sidor استفاده کن و مهلت نوشته‌شده در نامه خودت را رعایت کن. دستیار حمایت تعداد روزها را حدس نمی‌زند. اگر هم‌زمان پول اجاره، برق، غذا یا دارو را نداری، مسیر کمک مالی فوری را هم استفاده کن.',
      documents: 'قدم بعدی: از شهرداری بپرس برای خانوار، مسکن، درآمد، دارایی و هزینه‌های ضروری چه مدارکی لازم است. صورت‌حساب بانکی، شماره شناسایی یا جزئیات حساس پزشکی را در این پایلوت عمومی وارد نکن.',
      calc: 'محاسبه آزمایشی Socialstyrelsen فقط برای راهنمایی است و ممکن است با تصمیم فردی شهرداری فرق داشته باشد.',
      source: 'Socialstyrelsen: کمک مالی برای افراد',
      calcSource: 'Socialstyrelsen: محاسبه آزمایشی کمک مالی',
      debtSource: 'Konsumentverket: مشاوره بودجه و بدهی شهرداری',
      billsSource: 'Kronofogden: وقتی قبض‌ها به‌هم‌ریخته‌اند',
      noticeSource: 'Kronofogden: مطالبه پرداخت دریافت کرده‌ای',
    },
  };

  function matches(patterns, text) {
    const value = String(text || '');
    return patterns.some((pattern) => pattern.test(value));
  }

  function demandNoticeIntent(text) {
    return matches(DEMAND_NOTICE_PATTERNS, String(text || ''));
  }

  function debtIntent(text) {
    const value = String(text || '');
    if (!matches(DEBT_PATTERNS, value)) return false;
    if (matches(NON_DEBT_WORK_PATTERNS, value) && !matches(DEBT_WITHOUT_KFM_PATTERNS, value)) return false;
    return true;
  }

  function detect(text) {
    const value = String(text || '');
    if (!value.trim()) return false;
    if (demandNoticeIntent(value)) return true;
    if (debtIntent(value)) return true;
    if (matches(DIRECT_PATTERNS, value)) return true;
    return matches(MONEY_PRESSURE_PATTERNS, value) &&
      (matches(HOUSING_NEED_PATTERNS, value) || matches(BASIC_NEED_PATTERNS, value));
  }

  function coarseContext(text) {
    const value = String(text || '');
    if (demandNoticeIntent(value)) return 'kfm_notice';
    const hasDebt = debtIntent(value);
    if (hasDebt && matches(ACUTE_HOUSING_PATTERNS, value)) return 'housing';
    if (hasDebt && matches(ACUTE_BASIC_PATTERNS, value)) return 'basic_needs';
    if (hasDebt) return 'debt';
    if (matches(HOUSING_NEED_PATTERNS, value)) return 'housing';
    if (matches(BASIC_NEED_PATTERNS, value)) return 'basic_needs';
    return 'general';
  }

  function safeLang(value) {
    return value === 'ar' || value === 'fa' ? value : 'sv';
  }

  function safeContext(value) {
    return value === 'housing' || value === 'basic_needs' || value === 'debt' || value === 'kfm_notice' ? value : 'general';
  }

  function handoffHref(language, context) {
    const lang = safeLang(language);
    const safe = safeContext(context);
    return `person-pilot.html?actor_type=private_person&focus=economic_assistance&context=${safe}&lang=${encodeURIComponent(lang)}`;
  }

  function shellTitle(copy, context) {
    if (context === 'kfm_notice') return copy.noticeShellTitle;
    if (context === 'debt') return copy.debtShellTitle;
    return copy.shellTitle;
  }

  function shellSub(copy, context) {
    if (context === 'kfm_notice') return copy.noticeShellSub;
    if (context === 'debt') return copy.debtShellSub;
    return copy.shellSub;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const analyzeButton = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !analyzeButton || !box) return;

    const enhance = () => {
      const existing = box.querySelector('[data-economic-assistance-route="true"]');
      if (!detect(input.value) || box.hidden) {
        if (existing) existing.remove();
        return;
      }
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const context = coarseContext(input.value);
      const link = existing || doc.createElement('a');
      link.className = 'route';
      link.dataset.economicAssistanceRoute = 'true';
      link.href = handoffHref(lang, context);
      const text = doc.createElement('span');
      const title = doc.createElement('strong');
      const sub = doc.createElement('small');
      title.textContent = shellTitle(copy, context);
      sub.textContent = shellSub(copy, context);
      text.append(title, sub);
      const arrow = doc.createElement('span');
      arrow.className = 'arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      link.replaceChildren(text, arrow);
      if (!existing) {
        const firstRoute = box.querySelector('a.route');
        box.insertBefore(link, firstRoute || null);
      }
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
      need: context === 'housing' || context === 'basic_needs' ? 'recurring' : (context === 'debt' ? 'debt' : (context === 'kfm_notice' ? 'kfm_notice' : null)),
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

    function debtResult() {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = copy.debtTitle;
      const body = doc.createElement('p');
      body.textContent = copy.debtBody;
      const next = doc.createElement('p');
      next.textContent = copy.debtNext;
      box.append(title, body, next);
      appendSource(doc, box, DEBT_COUNSELLING_URL, copy.debtSource);
      box.appendChild(doc.createTextNode(' · '));
      appendSource(doc, box, KRONOFOGDEN_BILLS_URL, copy.billsSource);
      return box;
    }

    function noticeResult() {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = copy.noticeTitle;
      const body = doc.createElement('p');
      body.textContent = copy.noticeBody;
      const next = doc.createElement('p');
      next.textContent = copy.noticeNext;
      box.append(title, body, next);
      appendSource(doc, box, KRONOFOGDEN_DEMAND_URL, copy.noticeSource);
      return box;
    }

    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = context === 'kfm_notice' ? copy.noticeEyebrow : (context === 'debt' ? copy.debtEyebrow : copy.eyebrow);
      const title = doc.createElement('h2');
      title.id = 'economicAssistanceTitle';
      title.textContent = context === 'kfm_notice' ? copy.noticePageTitle : (context === 'debt' ? copy.debtPageTitle : copy.title);
      const intro = doc.createElement('p');
      intro.className = 'muted';
      intro.textContent = context === 'kfm_notice' ? copy.noticeIntro : (context === 'debt' ? copy.debtIntro : copy.intro);
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
      if (state.need === 'debt') section.append(debtResult());
      if (state.need === 'kfm_notice') section.append(noticeResult());
    }

    render();
  }

  function init(win) {
    addShellHandoff(win);
    addPersonGuidance(win);
  }

  return { detect, coarseContext, safeLang, handoffHref, init };
});
