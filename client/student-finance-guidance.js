(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODStudentFinanceGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Public, coarse handoff only. This is not an eligibility matcher and never
  // receives or infers a personal CSN balance, diagnosis, SGI or medical facts.
  // Material rules remain governed by the shared truth/verification layer and
  // current CSN/Försäkringskassan primary sources.
  const WEEKS_URL = 'https://www.csn.se/fragor-och-svar/hur-manga-veckor-kan-jag-fa-studiemedel.html';
  const PACE_URL = 'https://www.csn.se/bidrag-och-lan/studiemedel/studietakt---heltid-eller-deltid.html';
  const SUMMER_URL = 'https://www.csn.se/bidrag-och-lan/studiemedel/sommarstudier-i-sverige-med-studiemedel.html';
  const SICK_CSN_URL = 'https://www.csn.se/om-nagot-hander-eller-andras/sjuk';
  const SICK_FK_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/om-du-blir-sjuk-nar-du-studerar';
  const LOGIN_URL = 'https://www.csn.se/logga-in.html';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const SUMMER_PATTERNS = [
    /(?:sommarkurs|sommarstud|studera\s+(?:i\s+)?sommar|läsa\s+(?:i\s+)?sommar).*(?:csn|studiemedel|studie)/i,
    /(?:csn|studiemedel).*(?:sommarkurs|sommarstud|sommaren)/i,
    /(?:inget|utan)\s+sommarjobb.*(?:sommarkurs|studera|csn)/i,
    /(?:دورة|دراسة|أدرس).*(?:صيف|الصيف).*(?:CSN|دعم\s*الدراسة|تمويل\s*الدراسة)/i,
    /(?:CSN|دعم\s*الدراسة).*(?:دورة|دراسة).*(?:صيف|الصيف)/i,
    /(?:دوره|تحصیل|درس).*(?:تابستان).*(?:CSN|کمک|حمایت)/i,
    /(?:CSN|کمک.*تحصیل|حمایت.*تحصیل).*(?:دوره|تحصیل).*(?:تابستان)/i,
  ];

  const WEEK_PATTERNS = [
    /(?:csn|studiemedel).*(?:veck|kvar|använd|deltid)/i,
    /(?:veck|kvar|använd|deltid).*(?:csn|studiemedel)/i,
    /hur\s+många\s+(?:csn[- ]?)?veckor.*kvar/i,
    /(?:CSN|دعم\s*الدراسة|تمويل\s*الدراسة).*(?:أسبوع|أسابيع|بقي|متبق)/i,
    /(?:أسبوع|أسابيع|بقي|متبق).*(?:CSN|دعم\s*الدراسة)/i,
    /(?:CSN|کمک.*تحصیل|حمایت.*تحصیل).*(?:هفته|باقی|مانده)/i,
    /(?:هفته|باقی|مانده).*(?:CSN|کمک.*تحصیل|حمایت.*تحصیل)/i,
  ];

  // Own sickness during studies. Explicit child/VAB and professional/research
  // contexts fail closed so this route does not steal adjacent journeys.
  const SICKNESS_PATTERNS = [
    /(?:jag\s+(?:studerar|pluggar|läser)|mina\s+studier|jag\s+är\s+student).*(?:jag\s+är\s+sjuk|blivit\s+sjuk|sjukskriv|kan\s+inte\s+studera|orkar\s+inte\s+(?:studera|plugga))/i,
    /(?:jag\s+är\s+sjuk|jag\s+har\s+blivit\s+sjuk|jag\s+är\s+sjukskriv).*(?:studerar|pluggar|student|studier)/i,
    /(?:أنا\s+(?:طالب|طالبة)|أدرس|دراستي).*(?:مريض|مريضة|مرضت|لا\s+أستطيع\s+الدراسة)/i,
    /(?:مريض|مريضة|مرضت|لا\s+أستطيع\s+الدراسة).*(?:أدرس|طالب|طالبة|دراستي)/i,
    /(?:من\s+دانشجو|درس\s+می[‌ ]?خوانم|تحصیل\s+می[‌ ]?کنم|تحصیلم).*(?:بیمار|مریض|نمی[‌ ]?توانم\s+(?:درس|تحصیل)|مرخصی\s+بیماری)/i,
    /(?:بیمار|مریض|مرخصی\s+بیماری).*(?:دانشجو|درس\s+می[‌ ]?خوانم|تحصیل\s+می[‌ ]?کنم)/i,
  ];
  const SICKNESS_META_PATTERNS = [
    /(?:uppsats|forskar|forskning|undersökning|artikel|föreläs|jobbar\s+med|handlägg).*(?:sjuk|sjukfrånvaro|sjukskriv).*(?:student|studer)/i,
    /(?:student|studer).*(?:sjuk|sjukfrånvaro|sjukskriv).*(?:uppsats|forskar|forskning|undersökning|artikel|föreläs|jobbar\s+med|handlägg)/i,
  ];
  const CHILD_SICK_PATTERNS = [
    /\bvab\b/i,
    /(?:mitt|mina|barnet|barnen)\s+.*(?:sjuk|sjuka|sjukt)/i,
    /(?:sjuk|sjuka|sjukt)\s+.*(?:mitt|mina|barnet|barnen)/i,
    /(?:طفلي|ابني|ابنتي|الطفل).*(?:مريض|مريضة|مرض)/i,
    /(?:فرزندم|بچه(?:‌| )?ام|کودکم).*(?:بیمار|مریض)/i,
  ];
  const WORK_YES_PATTERNS = [
    /(?:jag\s+(?:jobbar|arbetar)|anställd|extrajobb|deltidsjobb|jobbar\s+(?:också|vid\s+sidan))/i,
    /(?:أعمل|لدي\s+عمل|موظف|موظفة).*(?:أدرس|الدراسة)?/i,
    /(?:کار\s+می[‌ ]?کنم|شاغل|کارمند|همزمان\s+کار)/i,
  ];
  const WORK_NO_PATTERNS = [
    /(?:jag\s+jobbar\s+inte|jag\s+arbetar\s+inte|har\s+inget\s+jobb)/i,
    /(?:لا\s+أعمل|ليس\s+لدي\s+عمل)/i,
    /(?:کار\s+نمی[‌ ]?کنم|شغلی\s+ندارم)/i,
  ];

  const COPY = {
    sv: {
      shellWeeksTitle: 'CSN-veckor – kontrollera vad du har kvar',
      shellWeeksSub: 'Utbildningsnivå och studietakt först, personligt saldo på Mina sidor',
      shellSummerTitle: 'Sommarkurs och CSN – kontrollera rätt väg',
      shellSummerSub: 'Få frågor om upplägget, sedan aktuell CSN-källa och Mina sidor',
      shellSickTitle: 'Sjuk under studier – hitta rätt första väg',
      shellSickSub: 'Skilj studiestöd, gymnasium, utlandsstudier och arbete utan att gissa rätt till ersättning',
      eyebrow: 'Studier → studiemedel',
      weeksTitle: 'Planerar du fler studier och undrar hur CSN-veckorna räcker?',
      weeksIntro: 'Stödassistenten kan inte se eller räkna fram ditt personliga kvarvarande veckosaldo. Vi frågar bara efter grova fakta som ändrar hur vägen ska förklaras och skickar sedan saldokontrollen till CSN Mina sidor.',
      qLevel: 'Vilken utbildningsnivå gäller frågan?', higher: 'Eftergymnasial / högskola', upper: 'Gymnasienivå / komvux', basic: 'Grundskolenivå', unsure: 'Jag vet inte ännu',
      qPlan: 'Vilken studietakt planerar du för studieperioden?', full: '100 procent', p75: '75 procent', p50: '50 procent',
      weeksResultTitle: 'Kontrollera ditt faktiska saldo på Mina sidor innan du planerar perioden',
      weeksResultBody: 'Utbildningsnivå och studietakt påverkar hur studiemedelsveckor räknas. Ditt personliga antal använda och kvarvarande veckor finns hos CSN, inte i Stödassistenten. Använd aktuell CSN-vägledning för att förstå hur den planerade studietakten påverkar veckorna.',
      summerTitle: 'Vill du finansiera sommarstudier med studiemedel?',
      summerIntro: 'Antagning till en kurs är inte samma sak som ett beslut om studiemedel. Vi kontrollerar bara de få kurs- och registreringsfakta som kan ändra nästa steg och lämnar beslutet till CSN.',
      qSummerType: 'Har du kontrollerat att kursen eller utbildningen ger rätt till studiemedel, och vilken typ är det?', university: 'Högskola / universitet – kontrollerad CSN-berättigad kurs', otherStudy: 'Komvux / annan utbildning – kontrollerad CSN-berättigad utbildning', notDecided: 'Jag vet inte om utbildningen ger rätt till studiemedel',
      qSummerPace: 'Är den planerade studietakten minst 50 procent i minst tre sammanhängande veckor?', yes: 'Ja', no: 'Nej',
      qRegistration: 'Är du registrerad på kursen och, för högskola, har skolan rapporterat den som sommarkurs till CSN?',
      summerNoTitle: 'Kontrollera upplägget mot CSN innan du planerar studiemedel',
      summerNoBody: 'Den aktuella CSN-vägen för sommarstudier behöver uppfyllas för den faktiska kursen och studieperioden. Ett nej eller en osäker uppgift här är därför en signal att verifiera upplägget – inte ett generellt beslut om att stöd saknas.',
      summerCheckTitle: 'Sommarstudierna är värda att kontrollera vidare hos CSN',
      summerCheckBody: 'Dina grova svar passar den aktuella kontrollvägen, men Stödassistenten lovar inte rätt, belopp eller längd. Kontrollera kursen, registreringen och ditt personliga veckosaldo hos CSN innan du planerar finansieringen. Sommarveckor med studiemedel påverkar ditt kvarvarande veckosaldo.',
      sickTitle: 'Är du sjuk och kan inte studera som planerat?',
      sickIntro: 'Sjukdom under studier har olika första vägar beroende på studiesituation och om du också arbetar. Vi avgör inte rätt till studiestöd eller sjukpenning och frågar bara efter sådant som kan ändra nästa steg.',
      qSickStudyContext: 'Vilken studiesituation gäller just nu?',
      sickStudySupportSweden: 'Studier i Sverige med studiemedel / omställningsstudiestöd',
      sickGymnasiumSweden: 'Gymnasium i Sverige med studiehjälp',
      sickAbroad: 'Studier utomlands',
      qWorkAlongside: 'Arbetar du också vid sidan av studierna?',
      sickStudyOnlyTitle: 'Kontrollera sjukvägen för studiestödet nu',
      sickStudyOnlyBody: 'CSN:s aktuella vägledning för studier i Sverige med studiemedel hänvisar sjukfrånvaron till Försäkringskassan och därefter tillbaka till CSN:s studiestödsprocess. Kontrollera källorna för din faktiska period. Stödassistenten avgör inte om sjukperioden eller studiestödet godkänns.',
      sickWorkTitle: 'Du kan behöva hålla isär studiestöd och förlorad arbetsinkomst',
      sickWorkBody: 'När du både studerar och arbetar kan studiestödsfrågan och eventuell ersättning för förlorad arbetsinkomst följa olika delar av Försäkringskassans väg. Kontrollera den aktuella student-sjukvägen och arbetsdelen hos Försäkringskassan; Stödassistenten avgör inte SGI, sjukpenning eller arbetsgivarens ansvar.',
      sickGymTitle: 'Börja med skolans sjukfrånvaroväg',
      sickGymBody: 'CSN:s aktuella information skiljer gymnasiestudier i Sverige från studiemedelsspåret och hänvisar sjukfrånvaron till skolan. Kontrollera skolans och CSN:s aktuella instruktioner; Stödassistenten avgör inte hur en enskild frånvaro bedöms.',
      sickAbroadTitle: 'Utlandsstudier har en egen sjukväg',
      sickAbroadBody: 'CSN:s aktuella information har en särskild process för sjukdom under utlandsstudier. Kontrollera den aktuella CSN-sidan för din studieperiod och plats i stället för att använda Sverige-spåret automatiskt.',
      sickVerifyTitle: 'Kontrollera studiesituationen innan du följer en sjukväg',
      sickVerifyBody: 'Vem du ska kontakta först skiljer sig mellan studiemedel i Sverige, gymnasium i Sverige och utlandsstudier. Använd den aktuella CSN-sidan för att välja rätt gren; inga villkor eller tidsfrister avgörs här.',
      weeksSource: 'CSN: antal veckor med studiemedel', paceSource: 'CSN: studietakt', summerSource: 'CSN: sommarstudier i Sverige', loginSource: 'CSN: logga in till Mina sidor',
      sickCsnSource: 'CSN: sjuk under studier', sickFkSource: 'Försäkringskassan: sjuk när du studerar',
      privacy: 'Vi lägger inte personligt CSN-saldo, diagnos, SGI, läkarintyg, arbetsgivare, exakt inkomst, identitet eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida',
      fbTitle: 'Hjälp oss förbättra den här vägen', fbNew: 'Fick du reda på något nytt?', fbUseful: 'Var hjälpen användbar?', fbClear: 'Var nästa steg tydligt?', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', sendError: 'Feedbacken kunde inte skickas just nu.',
    },
    ar: {
      shellWeeksTitle: 'أسابيع CSN – تحقق مما تبقى لك', shellWeeksSub: 'مستوى الدراسة والوتيرة أولاً، والرصيد الشخصي في Mina sidor',
      shellSummerTitle: 'دورة صيفية وCSN – تحقق من المسار الصحيح', shellSummerSub: 'أسئلة قليلة عن الدراسة ثم مصدر CSN الحالي وMina sidor',
      shellSickTitle: 'مرض أثناء الدراسة – اعثر على المسار الأول الصحيح', shellSickSub: 'نميّز بين دعم الدراسة والثانوي والدراسة خارج السويد والعمل دون افتراض الاستحقاق',
      eyebrow: 'الدراسة ← التمويل الدراسي',
      weeksTitle: 'هل تخطط لمزيد من الدراسة وتتساءل عن أسابيع CSN المتبقية؟', weeksIntro: 'لا يستطيع Stödassistenten رؤية أو استنتاج رصيدك الشخصي من الأسابيع. نسأل فقط عن معلومات عامة تغيّر التوجيه ثم نحيل فحص الرصيد إلى CSN Mina sidor.',
      qLevel: 'ما مستوى الدراسة الذي يتعلق به السؤال؟', higher: 'جامعة / تعليم بعد الثانوي', upper: 'ثانوي / komvux', basic: 'مستوى أساسي', unsure: 'لا أعرف بعد',
      qPlan: 'ما وتيرة الدراسة المخطط لها خلال الفترة؟', full: '100 بالمئة', p75: '75 بالمئة', p50: '50 بالمئة',
      weeksResultTitle: 'تحقق من رصيدك الفعلي في Mina sidor قبل التخطيط', weeksResultBody: 'مستوى الدراسة ووتيرتها يؤثران في كيفية احتساب أسابيع studiemedel. عدد الأسابيع المستخدمة والمتبقية شخصي وموجود لدى CSN، وليس لدى Stödassistenten. استخدم إرشادات CSN الحالية لفهم أثر وتيرة الدراسة.',
      summerTitle: 'هل تريد تمويل الدراسة الصيفية عبر studiemedel؟', summerIntro: 'القبول في دورة ليس قراراً بمنح studiemedel. نتحقق فقط من معلومات عامة عن الدورة والتسجيل يمكن أن تغيّر الخطوة التالية، والقرار يبقى لدى CSN.',
      qSummerType: 'هل تحققت من أن الدورة أو التعليم يعطي حقاً في studiemedel، وما نوعه؟', university: 'جامعة – دورة تم التحقق من أنها مؤهلة لدى CSN', otherStudy: 'Komvux / تعليم آخر – تم التحقق من أهليته لدى CSN', notDecided: 'لا أعرف إن كان التعليم يعطي حقاً في studiemedel',
      qSummerPace: 'هل الدراسة المخطط لها 50 بالمئة على الأقل لمدة ثلاثة أسابيع متصلة على الأقل؟', yes: 'نعم', no: 'لا',
      qRegistration: 'هل أنت مسجل في الدورة، وللدراسة الجامعية: هل أبلغت المؤسسة CSN بأنها دورة صيفية؟',
      summerNoTitle: 'تحقق من ترتيب الدراسة لدى CSN قبل التخطيط للتمويل', summerNoBody: 'يجب التحقق من مسار CSN الحالي للدورة والفترة الفعلية. الإجابة بالنفي أو عدم التأكد هنا تعني أن الترتيب يحتاج إلى تحقق، وليست قراراً عاماً بعدم وجود دعم.',
      summerCheckTitle: 'يستحق مسار الدراسة الصيفية المتابعة لدى CSN', summerCheckBody: 'إجاباتك العامة تناسب مسار التحقق، لكن Stödassistenten لا يضمن الاستحقاق أو المبلغ أو المدة. تحقق من الدورة والتسجيل ورصيد الأسابيع الشخصي لدى CSN قبل التخطيط.',
      sickTitle: 'هل أنت مريض ولا تستطيع الدراسة كما خططت؟', sickIntro: 'المسار الأول يختلف حسب نوع الدراسة وما إذا كنت تعمل أيضاً. لا نقرر حقك في الدعم أو التعويض؛ نسأل فقط عما يمكن أن يغيّر الخطوة التالية.',
      qSickStudyContext: 'ما وضع الدراسة الحالي؟', sickStudySupportSweden: 'دراسة في السويد مع studiemedel / omställningsstudiestöd', sickGymnasiumSweden: 'ثانوي في السويد مع studiehjälp', sickAbroad: 'دراسة خارج السويد',
      qWorkAlongside: 'هل تعمل أيضاً إلى جانب الدراسة؟',
      sickStudyOnlyTitle: 'تحقق الآن من مسار المرض الخاص بدعم الدراسة', sickStudyOnlyBody: 'تفصل معلومات CSN الحالية مسار المرض للدراسة في السويد مع studiemedel عبر Försäkringskassan ثم إجراءات CSN. تحقق من المصادر لفترتك الفعلية؛ Stödassistenten لا يقرر قبول فترة المرض أو دعم الدراسة.',
      sickWorkTitle: 'قد تحتاج إلى فصل دعم الدراسة عن دخل العمل المفقود', sickWorkBody: 'إذا كنت تعمل وتدرس، فقد يكون لمسألة دعم الدراسة وتعويض دخل العمل مساران مختلفان. تحقق من مسار الطالب المريض ومسار العمل لدى Försäkringskassan. لا نقرر SGI أو sjukpenning أو مسؤولية صاحب العمل.',
      sickGymTitle: 'ابدأ بمسار الغياب المرضي في المدرسة', sickGymBody: 'تميز معلومات CSN الحالية الدراسة الثانوية في السويد عن مسار studiemedel وتوجّه الغياب المرضي إلى المدرسة. تحقق من تعليمات المدرسة وCSN الحالية.',
      sickAbroadTitle: 'للدراسة خارج السويد مسار مرض منفصل', sickAbroadBody: 'لدى CSN إجراء خاص للمرض أثناء الدراسة خارج السويد. تحقق من صفحة CSN الحالية لفترتك ومكان دراستك بدلاً من تطبيق مسار السويد تلقائياً.',
      sickVerifyTitle: 'تحقق من نوع الدراسة قبل اتباع مسار المرض', sickVerifyBody: 'الجهة الأولى تختلف بين studiemedel في السويد والثانوي في السويد والدراسة خارجها. استخدم صفحة CSN الحالية لاختيار الفرع الصحيح؛ لا نقرر هنا الشروط أو المواعيد.',
      weeksSource: 'CSN: عدد أسابيع studiemedel', paceSource: 'CSN: وتيرة الدراسة', summerSource: 'CSN: الدراسة الصيفية في السويد', loginSource: 'CSN: تسجيل الدخول إلى Mina sidor', sickCsnSource: 'CSN: المرض أثناء الدراسة', sickFkSource: 'Försäkringskassan: المرض أثناء الدراسة',
      privacy: 'لا نضع رصيد CSN الشخصي أو التشخيص أو SGI أو الشهادة الطبية أو صاحب العمل أو الدخل الدقيق أو الهوية أو قصتك في الرابط أو الملاحظات.',
      home: 'إلى الصفحة الرئيسية لـ Stödassistenten', fbTitle: 'ساعدنا على تحسين هذا المسار', fbNew: 'هل عرفت شيئاً جديداً؟', fbUseful: 'هل كانت المساعدة مفيدة؟', fbClear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أُرسلت ملاحظات منتج منظمة فقط.', sendError: 'تعذر إرسال الملاحظات الآن.',
    },
    fa: {
      shellWeeksTitle: 'هفته‌های CSN – مانده واقعی را بررسی کن', shellWeeksSub: 'اول سطح و سرعت تحصیل، مانده شخصی در Mina sidor',
      shellSummerTitle: 'دوره تابستانی و CSN – مسیر درست را بررسی کن', shellSummerSub: 'چند سؤال کلی، سپس منبع جاری CSN و Mina sidor',
      shellSickTitle: 'بیماری هنگام تحصیل – مسیر اول درست را پیدا کن', shellSickSub: 'کمک‌هزینه تحصیلی، دبیرستان، تحصیل خارج و کار را بدون حدس زدن استحقاق جدا می‌کنیم',
      eyebrow: 'تحصیل ← کمک‌هزینه تحصیلی',
      weeksTitle: 'برای ادامه تحصیل برنامه داری و می‌خواهی بدانی هفته‌های CSN چقدر باقی مانده؟', weeksIntro: 'Stödassistenten نمی‌تواند مانده شخصی هفته‌های تو را ببیند یا حدس بزند. فقط اطلاعات کلی مؤثر بر مسیر را می‌پرسیم و بررسی مانده را به CSN Mina sidor می‌سپاریم.',
      qLevel: 'سؤال مربوط به کدام سطح تحصیل است؟', higher: 'دانشگاه / پس از دبیرستان', upper: 'دبیرستان / komvux', basic: 'سطح پایه', unsure: 'هنوز نمی‌دانم',
      qPlan: 'برای دوره موردنظر با چه سرعتی درس می‌خوانی؟', full: '100 درصد', p75: '75 درصد', p50: '50 درصد',
      weeksResultTitle: 'پیش از برنامه‌ریزی، مانده واقعی را در Mina sidor بررسی کن', weeksResultBody: 'سطح و سرعت تحصیل بر نحوه محاسبه هفته‌های studiemedel اثر می‌گذارد. تعداد شخصی هفته‌های استفاده‌شده و باقی‌مانده نزد CSN است، نه Stödassistenten.',
      summerTitle: 'می‌خواهی برای تحصیل تابستانی studiemedel بگیری؟', summerIntro: 'پذیرفته‌شدن در یک دوره به معنی تصمیم درباره studiemedel نیست. فقط چند واقعیت کلی درباره دوره و ثبت‌نام را بررسی می‌کنیم که می‌تواند قدم بعدی را عوض کند؛ تصمیم با CSN است.',
      qSummerType: 'آیا بررسی کرده‌ای که دوره یا آموزش حق studiemedel دارد و از چه نوعی است؟', university: 'دانشگاه – دوره‌ای که حق CSN آن بررسی شده است', otherStudy: 'Komvux / آموزش دیگر – حق CSN آن بررسی شده است', notDecided: 'نمی‌دانم این آموزش حق studiemedel دارد یا نه',
      qSummerPace: 'آیا برنامه تحصیل حداقل 50 درصد برای دست‌کم سه هفته پیوسته است؟', yes: 'بله', no: 'خیر',
      qRegistration: 'آیا در دوره ثبت‌نام شده‌ای و، برای دانشگاه، آیا مرکز آموزشی آن را به عنوان دوره تابستانی به CSN گزارش کرده است؟',
      summerNoTitle: 'پیش از برنامه‌ریزی مالی، شیوه تحصیل را با CSN بررسی کن', summerNoBody: 'مسیر جاری CSN باید برای دوره و بازه واقعی بررسی شود. پاسخ منفی یا نامطمئن در اینجا فقط یعنی لازم است شرایط را بررسی کنی، نه اینکه به طور کلی حمایتی وجود ندارد.',
      summerCheckTitle: 'مسیر تحصیل تابستانی ارزش بررسی بیشتر نزد CSN را دارد', summerCheckBody: 'پاسخ‌های کلی تو با مسیر بررسی سازگار است، اما Stödassistenten حق، مبلغ یا مدت را تضمین نمی‌کند. پیش از برنامه‌ریزی، دوره، ثبت‌نام و مانده شخصی هفته‌ها را نزد CSN بررسی کن.',
      sickTitle: 'بیمار شده‌ای و نمی‌توانی طبق برنامه درس بخوانی؟', sickIntro: 'مسیر اول به وضعیت تحصیل و این‌که همزمان کار می‌کنی یا نه بستگی دارد. ما حق دریافت حمایت یا غرامت را تعیین نمی‌کنیم و فقط چیزهایی را می‌پرسیم که مسیر را عوض می‌کنند.',
      qSickStudyContext: 'وضعیت تحصیل فعلی کدام است؟', sickStudySupportSweden: 'تحصیل در سوئد با studiemedel / omställningsstudiestöd', sickGymnasiumSweden: 'دبیرستان در سوئد با studiehjälp', sickAbroad: 'تحصیل خارج از سوئد',
      qWorkAlongside: 'همزمان با تحصیل کار هم می‌کنی؟',
      sickStudyOnlyTitle: 'اکنون مسیر بیماری مربوط به کمک‌هزینه تحصیلی را بررسی کن', sickStudyOnlyBody: 'راهنمای جاری CSN برای تحصیل در سوئد با studiemedel مسیر بیماری را از Försäkringskassan و سپس فرایند CSN جدا می‌کند. برای دوره واقعی خود منابع را بررسی کن؛ Stödassistenten تأیید دوره بیماری یا حمایت را تعیین نمی‌کند.',
      sickWorkTitle: 'ممکن است لازم باشد حمایت تحصیلی را از درآمد کاری از دست‌رفته جدا کنی', sickWorkBody: 'اگر هم کار می‌کنی و هم درس می‌خوانی، حمایت تحصیلی و جبران درآمد کاری ممکن است مسیرهای جداگانه‌ای داشته باشند. مسیر دانشجوی بیمار و بخش کار را در Försäkringskassan بررسی کن. ما SGI، sjukpenning یا مسئولیت کارفرما را تعیین نمی‌کنیم.',
      sickGymTitle: 'از مسیر غیبت بیماری مدرسه شروع کن', sickGymBody: 'اطلاعات جاری CSN دبیرستان در سوئد را از مسیر studiemedel جدا می‌کند و غیبت بیماری را به مدرسه ارجاع می‌دهد. دستورالعمل فعلی مدرسه و CSN را بررسی کن.',
      sickAbroadTitle: 'تحصیل خارج از سوئد مسیر بیماری جداگانه دارد', sickAbroadBody: 'CSN برای بیماری هنگام تحصیل خارج از سوئد فرایند جداگانه‌ای دارد. صفحه جاری CSN را برای دوره و محل تحصیل خود بررسی کن و مسیر سوئد را خودکار تعمیم نده.',
      sickVerifyTitle: 'پیش از دنبال کردن مسیر بیماری، نوع تحصیل را مشخص کن', sickVerifyBody: 'اولین مرجع بین studiemedel در سوئد، دبیرستان در سوئد و تحصیل خارج متفاوت است. از صفحه جاری CSN برای انتخاب شاخه استفاده کن؛ شرایط یا مهلت‌ها اینجا تعیین نمی‌شوند.',
      weeksSource: 'CSN: تعداد هفته‌های studiemedel', paceSource: 'CSN: سرعت تحصیل', summerSource: 'CSN: تحصیل تابستانی در سوئد', loginSource: 'CSN: ورود به Mina sidor', sickCsnSource: 'CSN: بیماری هنگام تحصیل', sickFkSource: 'Försäkringskassan: بیماری هنگام تحصیل',
      privacy: 'مانده شخصی CSN، تشخیص، SGI، گواهی پزشکی، کارفرما، درآمد دقیق، هویت یا داستان تو را در نشانی یا بازخورد قرار نمی‌دهیم.',
      home: 'بازگشت به صفحه اصلی Stödassistenten', fbTitle: 'به بهتر شدن این مسیر کمک کن', fbNew: 'چیز جدیدی یاد گرفتی؟', fbUseful: 'کمک برایت مفید بود؟', fbClear: 'قدم بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'ممنون! فقط بازخورد ساختاری محصول ارسال شد.', sendError: 'فعلاً ارسال بازخورد ممکن نیست.',
    },
  };

  function safeLang(value) { return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function normalize(value) { return String(value || '').normalize('NFKC').trim(); }

  function detectTopic(text) {
    const value = normalize(text);
    if (!value) return null;
    if (SUMMER_PATTERNS.some((pattern) => pattern.test(value))) return 'summer';
    if (CHILD_SICK_PATTERNS.some((pattern) => pattern.test(value))) return null;
    if (!SICKNESS_META_PATTERNS.some((pattern) => pattern.test(value)) && SICKNESS_PATTERNS.some((pattern) => pattern.test(value))) return 'sickness';
    if (WEEK_PATTERNS.some((pattern) => pattern.test(value))) return 'weeks';
    return null;
  }

  function detectStudyContext(text) {
    const value = normalize(text);
    if (!value) return null;
    if (/(?:utlandsstud|studerar\s+utomlands|studier\s+utomlands|دراسة\s+خارج|أدرس\s+خارج|تحصیل\s+خارج|خارج\s+از\s+سوئد)/i.test(value)) return 'abroad';
    if (/(?:gymnasiet|gymnasium|studiehjälp|المدرسة\s+الثانوية|ثانوي|دبیرستان)/i.test(value)) return 'gymnasium_sweden';
    if (/(?:studiemedel|omställningsstudiestöd|CSN|دعم\s*الدراسة|تمويل\s*الدراسة|کمک.*تحصیل|حمایت.*تحصیل)/i.test(value)) return 'study_support_sweden';
    return null;
  }

  function detectWorkAlongside(text) {
    const value = normalize(text);
    if (!value) return null;
    if (WORK_NO_PATTERNS.some((pattern) => pattern.test(value))) return 'no';
    if (WORK_YES_PATTERNS.some((pattern) => pattern.test(value))) return 'yes';
    return null;
  }

  function handoffHref(language, topic, context) {
    const lang = safeLang(language);
    const safeTopic = topic === 'summer' || topic === 'sickness' ? topic : 'weeks';
    let href = `person-pilot.html?actor_type=student&focus=student_csn&topic=${safeTopic}&lang=${encodeURIComponent(lang)}`;
    const safeContext = context || {};
    if (safeTopic === 'sickness' && ['study_support_sweden', 'gymnasium_sweden', 'abroad'].includes(safeContext.studyContext)) {
      href += `&study_context=${encodeURIComponent(safeContext.studyContext)}`;
    }
    if (safeTopic === 'sickness' && ['yes', 'no'].includes(safeContext.workAlongside)) {
      href += `&study_work=${encodeURIComponent(safeContext.workAlongside)}`;
    }
    return href;
  }

  function pageLang(win) {
    const params = new URLSearchParams(win.location.search);
    return safeLang(params.get('lang') || win.document.documentElement.lang);
  }

  function rootHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden) return false;
    const topic = detectTopic(input.value);
    if (!topic) return false;
    if (box.querySelector('[data-student-csn-route="true"]')) return true;
    const lang = pageLang(win);
    const copy = COPY[lang];
    const context = topic === 'sickness' ? { studyContext: detectStudyContext(input.value), workAlongside: detectWorkAlongside(input.value) } : {};
    const route = doc.createElement('a');
    route.className = 'route';
    route.dataset.studentCsnRoute = 'true';
    route.href = handoffHref(lang, topic, context);
    const left = doc.createElement('span');
    const strong = doc.createElement('strong');
    const small = doc.createElement('small');
    strong.textContent = topic === 'summer' ? copy.shellSummerTitle : topic === 'sickness' ? copy.shellSickTitle : copy.shellWeeksTitle;
    small.textContent = topic === 'summer' ? copy.shellSummerSub : topic === 'sickness' ? copy.shellSickSub : copy.shellWeeksSub;
    left.append(strong, small);
    const arrow = doc.createElement('span');
    arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
    route.append(left, arrow);
    box.insertBefore(route, box.querySelector('a.route') || null);
    return true;
  }

  function hookRoot(win) {
    const button = win.document.getElementById('analyzeBtn');
    const input = win.document.getElementById('situation');
    if (!button || !input) return;
    button.addEventListener('click', () => win.setTimeout(() => rootHandoff(win), 0));
    input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') win.setTimeout(() => rootHandoff(win), 0);
    });
  }

  function nextWeeks(state) {
    if (!state.level) return 'ask_level';
    if (!state.pace) return 'ask_pace';
    return 'show_weeks_next_action';
  }

  function nextSummer(state) {
    if (!state.studyType) return 'ask_study_type';
    if (state.studyType === 'unsure') return 'verify_summer_setup';
    if (!state.minimum) return 'ask_minimum';
    if (state.minimum !== 'yes') return 'verify_summer_setup';
    if (!state.registration) return 'ask_registration';
    if (state.registration !== 'yes') return 'verify_summer_setup';
    return 'show_summer_next_action';
  }

  function nextSickness(state) {
    if (!state.studyContext) return 'ask_study_context';
    if (state.studyContext === 'unsure') return 'verify_sickness_context';
    if (state.studyContext === 'gymnasium_sweden') return 'show_sickness_gymnasium';
    if (state.studyContext === 'abroad') return 'show_sickness_abroad';
    if (!state.workAlongside) return 'ask_work_alongside';
    if (state.workAlongside === 'yes') return 'show_sickness_work';
    if (state.workAlongside === 'no') return 'show_sickness_study_only';
    return 'verify_sickness_context';
  }

  function focusedApp(win) {
    const doc = win.document;
    const main = doc.getElementById('main');
    if (!main) return;
    const params = new URLSearchParams(win.location.search);
    let lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const requestedTopic = String(params.get('topic') || '').toLowerCase();
    const topic = requestedTopic === 'summer' || requestedTopic === 'sickness' ? requestedTopic : 'weeks';
    const queryStudyContext = String(params.get('study_context') || '').toLowerCase();
    const queryWork = String(params.get('study_work') || '').toLowerCase();
    const state = {
      level: null, pace: null, studyType: null, minimum: null, registration: null,
      studyContext: ['study_support_sweden', 'gymnasium_sweden', 'abroad'].includes(queryStudyContext) ? queryStudyContext : null,
      workAlongside: ['yes', 'no'].includes(queryWork) ? queryWork : null,
    };
    const feedback = {};

    function copy() { return COPY[lang]; }
    function setDir() {
      doc.documentElement.lang = lang;
      doc.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl';
      doc.body.classList.toggle('rtl', lang !== 'sv');
      const logo = doc.getElementById('logo');
      const pilot = doc.getElementById('pilot');
      if (logo) logo.textContent = lang === 'sv' ? '🧭 Stödassistenten' : lang === 'ar' ? '🧭 مساعد الدعم' : '🧭 دستیار حمایت';
      if (pilot) pilot.textContent = lang === 'sv' ? 'Studentpilot' : lang === 'ar' ? 'تجربة طالب' : 'پایلوت دانشجو';
    }
    function updateLang(next) {
      lang = safeLang(next);
      const url = new URL(win.location.href); url.searchParams.set('lang', lang); win.history.replaceState(null, '', url);
      setDir(); render();
    }
    function button(label, value, key) {
      const el = doc.createElement('button'); el.type = 'button'; el.className = 'choice'; el.textContent = label;
      el.setAttribute('aria-pressed', String(state[key] === value));
      el.addEventListener('click', () => { state[key] = value; render(); });
      return el;
    }
    function link(parent, href, label) {
      const a = doc.createElement('a'); a.className = 'source'; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.href = href; a.textContent = `↗ ${label}`; parent.appendChild(a);
    }
    function linksRow(items) {
      const box = doc.createElement('div'); box.className = 'info';
      items.forEach((item, index) => { if (index) box.appendChild(doc.createTextNode(' · ')); link(box, item[0], item[1]); });
      return box;
    }
    function question(titleText, options) {
      const h = doc.createElement('h3'); h.textContent = titleText; h.style.marginTop = '16px';
      const group = doc.createElement('div'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', titleText);
      options.forEach((item) => group.appendChild(button(item[0], item[1], item[2])));
      return [h, group];
    }
    function result(titleText, bodyText, items) {
      const box = doc.createElement('div'); box.className = 'notice'; box.setAttribute('role', 'status');
      const h = doc.createElement('strong'); h.textContent = titleText;
      const p = doc.createElement('p'); p.textContent = bodyText; p.style.marginBottom = '8px';
      box.append(h, p, linksRow(items)); return box;
    }
    function languageButtons(section) {
      const langs = doc.createElement('div'); langs.className = 'langs';
      [['sv','Svenska'],['ar','العربية'],['fa','فارسی']].forEach(([value,label]) => {
        const b = doc.createElement('button'); b.type = 'button'; b.className = `lang ${lang === value ? 'active' : ''}`; b.textContent = label;
        b.addEventListener('click', () => updateLang(value)); langs.appendChild(b);
      });
      section.appendChild(langs);
    }
    function feedbackBlock(section) {
      const c = copy();
      const wrap = doc.createElement('div'); wrap.className = 'finalq';
      const h = doc.createElement('b'); h.textContent = c.fbTitle; wrap.appendChild(h);
      [['learned_new',c.fbNew],['useful',c.fbUseful],['next_step_clear',c.fbClear]].forEach(([key,label]) => {
        const row = doc.createElement('div'); row.style.marginTop = '9px';
        const text = doc.createElement('small'); text.textContent = label; row.appendChild(text);
        const buttons = doc.createElement('div'); buttons.className = 'fbs';
        [[true,c.yes],[false,c.no]].forEach(([value,name]) => {
          const b = doc.createElement('button'); b.type = 'button'; b.className = `fb ${feedback[key] === value ? 'selected' : ''}`; b.textContent = name;
          b.addEventListener('click', () => { feedback[key] = value; render(); }); buttons.appendChild(b);
        });
        row.appendChild(buttons); wrap.appendChild(row);
      });
      const send = doc.createElement('button'); send.type = 'button'; send.className = 'btn primary share'; send.textContent = c.send;
      const status = doc.createElement('div'); status.id = 'studentCsnFeedbackStatus';
      send.addEventListener('click', async () => {
        if (!['learned_new','useful','next_step_clear'].every((key) => typeof feedback[key] === 'boolean')) { status.textContent = c.sendError; status.className = 'status err'; return; }
        send.disabled = true;
        try {
          const res = await win.fetch(FEEDBACK_URL, {
            method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_version:'0.5.0', language:lang, flow:'student_csn', learned_new:feedback.learned_new, useful:feedback.useful, next_step_clear:feedback.next_step_clear, ratings:{ route:'student_csn', topic } }),
          });
          if (!res.ok) throw new Error('feedback');
          status.textContent = c.sent; status.className = 'status ok';
        } catch (_) { status.textContent = c.sendError; status.className = 'status err'; send.disabled = false; }
      });
      wrap.append(send, status); section.appendChild(wrap);
    }

    function render() {
      const c = copy();
      main.replaceChildren();
      const section = doc.createElement('section'); section.className = 'card hero';
      const eyebrow = doc.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = c.eyebrow;
      const h = doc.createElement('h1'); h.textContent = topic === 'summer' ? c.summerTitle : topic === 'sickness' ? c.sickTitle : c.weeksTitle;
      const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = topic === 'summer' ? c.summerIntro : topic === 'sickness' ? c.sickIntro : c.weeksIntro;
      section.append(eyebrow, h, intro); languageButtons(section);
      const privacy = doc.createElement('div'); privacy.className = 'privacy'; privacy.textContent = `🔒 ${c.privacy}`; section.appendChild(privacy);

      if (topic === 'weeks') {
        const step = nextWeeks(state);
        if (step === 'ask_level') {
          section.append(...question(c.qLevel, [[c.higher,'higher','level'],[c.upper,'upper','level'],[c.basic,'basic','level'],[c.unsure,'unsure','level']]));
        } else {
          section.append(...question(c.qLevel, [[c.higher,'higher','level'],[c.upper,'upper','level'],[c.basic,'basic','level'],[c.unsure,'unsure','level']]));
          section.append(...question(c.qPlan, [[c.full,'100','pace'],[c.p75,'75','pace'],[c.p50,'50','pace'],[c.unsure,'unsure','pace']]));
          if (step === 'show_weeks_next_action') {
            section.appendChild(result(c.weeksResultTitle, c.weeksResultBody, [[WEEKS_URL,c.weeksSource],[PACE_URL,c.paceSource],[LOGIN_URL,c.loginSource]])); feedbackBlock(section);
          }
        }
      } else if (topic === 'summer') {
        const step = nextSummer(state);
        section.append(...question(c.qSummerType, [[c.university,'university','studyType'],[c.otherStudy,'other','studyType'],[c.notDecided,'unsure','studyType']]));
        if (state.studyType && state.studyType !== 'unsure') section.append(...question(c.qSummerPace, [[c.yes,'yes','minimum'],[c.no,'no','minimum'],[c.unsure,'unsure','minimum']]));
        if (state.minimum === 'yes') section.append(...question(c.qRegistration, [[c.yes,'yes','registration'],[c.no,'no','registration'],[c.unsure,'unsure','registration']]));
        if (step === 'verify_summer_setup') { section.appendChild(result(c.summerNoTitle, c.summerNoBody, [[SUMMER_URL,c.summerSource],[LOGIN_URL,c.loginSource]])); feedbackBlock(section); }
        if (step === 'show_summer_next_action') { section.appendChild(result(c.summerCheckTitle, c.summerCheckBody, [[SUMMER_URL,c.summerSource],[WEEKS_URL,c.weeksSource],[LOGIN_URL,c.loginSource]])); feedbackBlock(section); }
      } else {
        const step = nextSickness(state);
        section.append(...question(c.qSickStudyContext, [[c.sickStudySupportSweden,'study_support_sweden','studyContext'],[c.sickGymnasiumSweden,'gymnasium_sweden','studyContext'],[c.sickAbroad,'abroad','studyContext'],[c.unsure,'unsure','studyContext']]));
        if (state.studyContext === 'study_support_sweden') section.append(...question(c.qWorkAlongside, [[c.yes,'yes','workAlongside'],[c.no,'no','workAlongside'],[c.unsure,'unsure','workAlongside']]));
        if (step === 'show_sickness_study_only') { section.appendChild(result(c.sickStudyOnlyTitle, c.sickStudyOnlyBody, [[SICK_CSN_URL,c.sickCsnSource],[SICK_FK_URL,c.sickFkSource]])); feedbackBlock(section); }
        if (step === 'show_sickness_work') { section.appendChild(result(c.sickWorkTitle, c.sickWorkBody, [[SICK_FK_URL,c.sickFkSource],[SICK_CSN_URL,c.sickCsnSource]])); feedbackBlock(section); }
        if (step === 'show_sickness_gymnasium') { section.appendChild(result(c.sickGymTitle, c.sickGymBody, [[SICK_CSN_URL,c.sickCsnSource]])); feedbackBlock(section); }
        if (step === 'show_sickness_abroad') { section.appendChild(result(c.sickAbroadTitle, c.sickAbroadBody, [[SICK_CSN_URL,c.sickCsnSource]])); feedbackBlock(section); }
        if (step === 'verify_sickness_context' || (state.studyContext === 'study_support_sweden' && state.workAlongside === 'unsure')) { section.appendChild(result(c.sickVerifyTitle, c.sickVerifyBody, [[SICK_CSN_URL,c.sickCsnSource],[SICK_FK_URL,c.sickFkSource]])); feedbackBlock(section); }
      }

      const home = doc.createElement('a'); home.className = 'source'; home.href = `index.html?lang=${encodeURIComponent(lang)}`; home.textContent = `← ${c.home}`; section.appendChild(home);
      main.appendChild(section);
    }

    setDir(); render();
  }

  function hookPerson(win) {
    const params = new URLSearchParams(win.location.search);
    if (String(params.get('focus') || '').toLowerCase() !== 'student_csn') return;
    focusedApp(win);
  }

  function init(win) {
    const path = (win.location.pathname || '').split('/').pop();
    if (!path || path === 'index.html') hookRoot(win);
    if (path === 'person-pilot.html') hookPerson(win);
  }

  return { init, detectTopic, detectStudyContext, detectWorkAlongside, handoffHref, nextWeeks, nextSummer, nextSickness, safeLang };
});
