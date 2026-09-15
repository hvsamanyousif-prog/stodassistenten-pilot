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
  const FK_HOUSING_2027_URL = 'https://www.forsakringskassan.se/privatperson/bostadsbidrag-nya-regler-fran-1-januari-2027';

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
  const TRANSITION_2027_PATTERNS = [
    /\b2027\b|\b(?:nya|nya\s+reglerna)\s+regler\b|\bmånadsinkomst\b/i,
    /٢٠٢٧|قواعد\s+جديدة|القواعد\s+الجديدة|الدخل\s+الشهري/i,
    /۲۰۲۷|قوانین\s+جدید|درآمد\s+ماهانه/i,
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
      qDecision: 'Vilken regelperiod gäller din fråga?',
      qException: 'Har du inkomst från eget företag eller från utlandet?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      ownRent: 'Jag hyr eller äger bostaden',
      lodger: 'Jag är inneboende',
      housingUnsure: 'Jag är osäker på hur min boendeform räknas',
      currentDecision: 'Pågående beslut eller ansökan enligt 2026 års regler',
      newDecision2027: 'Nytt beslut från 1 januari 2027',
      decisionUnsure: 'Jag vet inte vilken regelperiod som gäller',
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
      existingTransitionTitle: 'Byt inte automatiskt till månadsinkomst den 1 januari',
      existingTransitionBody: 'Försäkringskassan anger att de nya reglerna bara gäller beslut från och med 1 januari 2027. Har du redan bostadsbidrag blir ändringen aktuell först när ditt pågående beslut löper ut under 2027 och du söker nytt. Följ därför ditt nuvarande beslut tills dess. Om inkomsten eller andra kända uppgifter ändras under ett beslut enligt 2026 års regler ska du uppdatera dem enligt den aktuella Försäkringskassevägen; vänta inte på 2027-reglerna.',
      newTransitionTitle: 'Ett nytt beslut från 2027 använder månadsinkomst för dem som omfattas av ändringen',
      newTransitionBody: 'Försäkringskassan anger att nya beslut från 1 januari 2027 beräknas utifrån månadsinkomst i stället för årsinkomst för dem som omfattas av lagändringen. Det här avgör inte om du har rätt till bostadsbidrag eller vilket belopp du kan få.',
      exceptionTitle: 'Utgå inte från månadsmodellen i just det här fallet',
      exceptionBody: 'Försäkringskassan anger att egenföretagare och personer med inkomst från utlandet inte berörs av just lagändringen till månadsinkomst. Kontrollera den aktuella regeln för ditt fall innan du räknar eller ansöker.',
      transitionUnsureTitle: 'Fastställ beslut och regelversion innan du räknar',
      transitionUnsureBody: 'Kontrollera om du har ett pågående beslut som fortsätter in i 2027 eller om du ska få ett nytt beslut från 1 januari 2027. Använd inte månadsinkomst bara för att kalendern har blivit 2027, och kontrollera särskilt undantaget för egenföretagande eller utlandsinkomst.',
      source: 'Försäkringskassan: bostadsbidrag till unga under 29 år',
      source2027: 'Försäkringskassan: nya regler för bostadsbidrag från 1 januari 2027',
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
      qDecision: 'أي فترة من القواعد تنطبق على سؤالك؟',
      qException: 'هل لديك دخل من عملك الخاص أو دخل من خارج السويد؟',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      ownRent: 'أستأجر أو أملك السكن',
      lodger: 'أسكن كـ inneboende عند شخص آخر',
      housingUnsure: 'لست متأكداً كيف تُحسب وضعيتي السكنية',
      currentDecision: 'قرار قائم أو طلب يخضع لقواعد 2026',
      newDecision2027: 'قرار جديد من 1 يناير 2027',
      decisionUnsure: 'لا أعرف أي فترة قواعد تنطبق',
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
      existingTransitionTitle: 'لا تنتقل تلقائياً إلى حساب الدخل الشهري في 1 يناير',
      existingTransitionBody: 'تذكر Försäkringskassan أن القواعد الجديدة تنطبق فقط على القرارات من 1 يناير 2027. إذا كان لديك بدل سكن قائم، تصبح القواعد الجديدة ذات صلة عندما ينتهي القرار الحالي خلال 2027 وتقدم طلباً جديداً. اتبع قرارك الحالي حتى ذلك الحين. إذا تغير الدخل أو معلومات أخرى معروفة خلال قرار يخضع لقواعد 2026، حدّثها عبر المسار الحالي لدى Försäkringskassan ولا تنتظر قواعد 2027.',
      newTransitionTitle: 'القرار الجديد من 2027 يستخدم الدخل الشهري لمن تشملهم التغييرات',
      newTransitionBody: 'تذكر Försäkringskassan أن القرارات الجديدة من 1 يناير 2027 تعتمد على الدخل الشهري بدلاً من الدخل السنوي لمن تشملهم التغييرات. هذا لا يقرر استحقاقك أو المبلغ الذي قد تحصل عليه.',
      exceptionTitle: 'لا تفترض أن نموذج الدخل الشهري ينطبق على هذه الحالة',
      exceptionBody: 'تذكر Försäkringskassan أن أصحاب العمل الخاص ومن لديهم دخل من الخارج لا تشملهم هذه التغييرات الخاصة بالانتقال إلى الدخل الشهري. تحقق من القاعدة الحالية لحالتك قبل الحساب أو التقديم.',
      transitionUnsureTitle: 'حدد القرار ونسخة القواعد قبل الحساب',
      transitionUnsureBody: 'تحقق مما إذا كان لديك قرار قائم يستمر في 2027 أو قرار جديد من 1 يناير 2027. لا تستخدم نموذج الدخل الشهري لمجرد أن السنة أصبحت 2027، وتحقق خصوصاً من الاستثناء المتعلق بالعمل الخاص أو الدخل من الخارج.',
      source: 'Försäkringskassan: بدل السكن للشباب دون 29 سنة',
      source2027: 'Försäkringskassan: القواعد الجديدة لبدل السكن من 1 يناير 2027',
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
      qDecision: 'سؤال تو مربوط به کدام دوره قواعد است؟',
      qException: 'آیا از کسب‌وکار خودت یا از خارج سوئد درآمد داری؟',
      yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      ownRent: 'خانه را اجاره کرده‌ام یا مالک آن هستم',
      lodger: 'به صورت inneboende نزد شخص دیگری زندگی می‌کنم',
      housingUnsure: 'مطمئن نیستم نوع سکونتم چگونه حساب می‌شود',
      currentDecision: 'تصمیم جاری یا درخواست بر اساس قواعد ۲۰۲۶',
      newDecision2027: 'تصمیم جدید از ۱ ژانویه ۲۰۲۷',
      decisionUnsure: 'نمی‌دانم کدام دوره قواعد اعمال می‌شود',
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
      existingTransitionTitle: 'در ۱ ژانویه به‌طور خودکار به درآمد ماهانه تغییر نکن',
      existingTransitionBody: 'Försäkringskassan می‌گوید قواعد جدید فقط برای تصمیم‌های از ۱ ژانویه ۲۰۲۷ اعمال می‌شود. اگر اکنون کمک‌هزینه مسکن داری، تغییر زمانی مرتبط می‌شود که تصمیم جاری تو در ۲۰۲۷ تمام شود و دوباره درخواست بدهی. تا آن زمان از تصمیم فعلی پیروی کن. اگر درآمد یا اطلاعات شناخته‌شده دیگری در یک تصمیم بر اساس قواعد ۲۰۲۶ تغییر کرد، آن را از مسیر جاری Försäkringskassan به‌روزرسانی کن و منتظر قواعد ۲۰۲۷ نمان.',
      newTransitionTitle: 'تصمیم جدید از ۲۰۲۷ برای افراد مشمول تغییر بر اساس درآمد ماهانه است',
      newTransitionBody: 'Försäkringskassan می‌گوید تصمیم‌های جدید از ۱ ژانویه ۲۰۲۷ برای افرادی که مشمول تغییر هستند بر اساس درآمد ماهانه به جای درآمد سالانه محاسبه می‌شوند. این متن درباره استحقاق یا مبلغ تو تصمیم نمی‌گیرد.',
      exceptionTitle: 'فرض نکن مدل درآمد ماهانه در این حالت اعمال می‌شود',
      exceptionBody: 'Försäkringskassan می‌گوید افراد خوداشتغال و افرادی که از خارج سوئد درآمد دارند مشمول همین تغییر به درآمد ماهانه نمی‌شوند. پیش از محاسبه یا درخواست، قاعده جاری مربوط به وضعیت خودت را بررسی کن.',
      transitionUnsureTitle: 'پیش از محاسبه، تصمیم و نسخه قواعد را مشخص کن',
      transitionUnsureBody: 'بررسی کن آیا تصمیم جاری تو وارد ۲۰۲۷ می‌شود یا قرار است تصمیم جدیدی از ۱ ژانویه ۲۰۲۷ بگیری. فقط به دلیل تغییر سال از مدل درآمد ماهانه استفاده نکن و استثنای خوداشتغالی یا درآمد خارجی را هم بررسی کن.',
      source: 'Försäkringskassan: کمک‌هزینه مسکن برای افراد زیر ۲۹ سال',
      source2027: 'Försäkringskassan: قواعد جدید کمک‌هزینه مسکن از ۱ ژانویه ۲۰۲۷',
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
    if (any(TRANSITION_2027_PATTERNS, value)) return 'transition_2027';
    return any(INCOME_CHANGE_PATTERNS, value) ? 'income_change' : 'general';
  }

  function safeLang(value) {
    return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv';
  }

  function safeContext(value) {
    return ['general', 'income_change', 'transition_2027'].includes(value) ? value : 'general';
  }

  function transitionBranch(decisionPeriod, reformException) {
    if (decisionPeriod === 'current') return 'existing_decision';
    if (decisionPeriod === 'unsure') return 'verify_decision';
    if (decisionPeriod !== 'new_2027') return null;
    if (reformException === 'yes') return 'exception';
    if (reformException === 'no') return 'monthly_income_candidate';
    if (reformException === 'unsure') return 'verify_exception';
    return null;
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

    const state = {
      age: null,
      housing: null,
      income: context === 'income_change' ? 'yes' : null,
      decisionPeriod: null,
      reformException: null,
    };

    function resetAfter(group) {
      if (group === 'age') {
        state.housing = null;
        state.income = context === 'income_change' ? 'yes' : null;
        state.decisionPeriod = null;
        state.reformException = null;
      }
      if (group === 'housing') {
        if (state.housing !== 'own_rent') state.income = context === 'income_change' ? 'yes' : null;
        state.decisionPeriod = null;
        state.reformException = null;
      }
      if (group === 'decisionPeriod') state.reformException = null;
    }

    function button(label, value, group) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.dataset.value = value;
      el.setAttribute('aria-pressed', String(state[group] === value));
      el.addEventListener('click', () => {
        state[group] = value;
        resetAfter(group);
        render();
      });
      return el;
    }

    function result(titleText, bodyText, sourceUrl, sourceLabel) {
      const resultBox = doc.createElement('div');
      resultBox.className = 'notice';
      resultBox.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = titleText;
      const body = doc.createElement('p');
      body.textContent = bodyText;
      body.style.marginBottom = '8px';
      resultBox.append(title, body);
      appendLink(doc, resultBox, sourceUrl || FK_YOUNG_HOUSING_URL, sourceLabel || copy.source);
      return resultBox;
    }

    function renderTransition() {
      const q3 = doc.createElement('h3');
      q3.textContent = copy.qDecision;
      q3.style.marginTop = '14px';
      const g3 = doc.createElement('div');
      g3.setAttribute('role', 'group');
      g3.setAttribute('aria-label', copy.qDecision);
      g3.append(
        button(copy.currentDecision, 'current', 'decisionPeriod'),
        button(copy.newDecision2027, 'new_2027', 'decisionPeriod'),
        button(copy.decisionUnsure, 'unsure', 'decisionPeriod'),
      );
      section.append(q3, g3);

      const branch = transitionBranch(state.decisionPeriod, state.reformException);
      if (branch === 'existing_decision') {
        section.append(result(copy.existingTransitionTitle, copy.existingTransitionBody, FK_HOUSING_2027_URL, copy.source2027));
        return;
      }
      if (branch === 'verify_decision') {
        section.append(result(copy.transitionUnsureTitle, copy.transitionUnsureBody, FK_HOUSING_2027_URL, copy.source2027));
        return;
      }
      if (state.decisionPeriod !== 'new_2027') return;

      const q4 = doc.createElement('h3');
      q4.textContent = copy.qException;
      q4.style.marginTop = '14px';
      const g4 = doc.createElement('div');
      g4.setAttribute('role', 'group');
      g4.setAttribute('aria-label', copy.qException);
      g4.append(
        button(copy.yes, 'yes', 'reformException'),
        button(copy.no, 'no', 'reformException'),
        button(copy.unsure, 'unsure', 'reformException'),
      );
      section.append(q4, g4);

      const resolved = transitionBranch(state.decisionPeriod, state.reformException);
      if (resolved === 'exception') {
        section.append(result(copy.exceptionTitle, copy.exceptionBody, FK_HOUSING_2027_URL, copy.source2027));
      }
      if (resolved === 'monthly_income_candidate') {
        section.append(result(copy.newTransitionTitle, copy.newTransitionBody, FK_HOUSING_2027_URL, copy.source2027));
      }
      if (resolved === 'verify_exception') {
        section.append(result(copy.transitionUnsureTitle, copy.transitionUnsureBody, FK_HOUSING_2027_URL, copy.source2027));
      }
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

      if (context === 'transition_2027') {
        renderTransition();
        return;
      }

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

  return {
    detect,
    coarseContext,
    safeLang,
    handoffHref,
    transitionBranch,
    transitionSourceUrl: FK_HOUSING_2027_URL,
    init,
  };
});