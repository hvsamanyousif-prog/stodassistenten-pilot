(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODEmployeeSickGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product public guidance only. The employee_sick route keeps ordinary
  // sickness reporting, part-time boundaries and collective-agreement follow-up
  // in one shared surface. It never decides eligibility, SGI, diagnosis, salary,
  // benefit amount, medical percentage or which agreement applies from free text.
  const FK_EMPLOYEE_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukskriven-nar-du-ar-anstalld';
  const FK_NO_SICK_PAY_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/sjukskriven-nar-du-ar-anstalld-utan-sjuklon';
  const FK_COLLECTIVE_SIGNAL_URL = 'https://www.forsakringskassan.se/nyhetsarkiv/nyheter-press/2026-02-10-manga---missar--extra-ersattning-vid-langtidssjukskrivning';
  const AVTALAT_AGS_URL = 'https://www.avtalat.se/arbetare/sjukdom/avtalsgruppsjukforsakring/';
  const COLLECTUM_ITP_URL = 'https://collectum.se/tjanstepensionen-itp/itp-itpk-och-tgl/det-har-galler-for-itp-sjukpension';
  const AFA_SICK_URL = 'https://www.afaforsakring.se/forsakring/sjukforsakring';
  const SPV_STATE_URL = 'https://www.spv.se/privatperson/statlig-tjanstepension/handelser-i-livet/sjuk/';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const EXCLUSION_PATTERNS = [
    /arbetslös|arbetssökande|arbetsförmedlingen|aktivitetsstöd|utvecklingsersättning|etableringsersättning/i,
    /ingen\s+anställning|utan\s+anställning|saknar\s+anställning/i,
    /عاطل\s+عن\s+العمل|باحث\s+عن\s+عمل|مكتب\s+العمل|بدون\s+عمل|ليس\s+لدي\s+عمل|لا\s+أعمل/i,
    /بیکار|جویای\s+کار|اداره\s+کار|بدون\s+کار|کار\s+ندارم|شاغل\s+نیستم/i,
  ];
  const DIRECT_PATTERNS = [
    /(?:jobbar|arbetar|anställd|anställning|timanställd|behovsanställd|deltid).*(?:sjuk|sjukskriv|sjukanmäl|sjuklön)/i,
    /(?:sjuk|sjukskriv|sjukanmäl|sjuklön).*(?:jobbar|arbetar|anställd|anställning|timanställd|behovsanställd|deltid)/i,
    /(?:أعمل|موظف|دوام\s+جزئي|عمل\s+جزئي).*(?:مريض|مرض|إجازة\s+مرضية)/i,
    /(?:مريض|مرض|إجازة\s+مرضية).*(?:أعمل|موظف|دوام\s+جزئي|عمل\s+جزئي)/i,
    /(?:کار\s*می.?کنم|شاغل|استخدام|پاره.?وقت).*(?:بیمار|بیماری|مرخصی\s+استعلاجی)/i,
    /(?:بیمار|بیماری|مرخصی\s+استعلاجی).*(?:کار\s*می.?کنم|شاغل|استخدام|پاره.?وقت)/i,
  ];
  const COLLECTIVE_PATTERNS = [
    /(?:långtidssjuk|sjukskriv\w*.{0,45}(?:90\s*dag|tre\s*månad|3\s*månad|flera\s+månad|månader|länge)).{0,90}(?:extra\s+ersättning|kollektivavtal|avtalsförsäkring|försäkring\s+via\s+jobbet|ersättning\s+via\s+jobbet|mer\s+pengar)/i,
    /(?:extra\s+ersättning|kollektivavtal|avtalsförsäkring|försäkring\s+via\s+jobbet|ersättning\s+via\s+jobbet|mer\s+pengar).{0,90}(?:långtidssjuk|sjukskriv\w*.{0,45}(?:90\s*dag|tre\s*månad|3\s*månad|flera\s+månad|månader|länge))/i,
    /(?:إجازة\s+مرضية\s+طويلة|مريض.{0,35}(?:ثلاثة\s+أشهر|3\s+أشهر|90\s+يوما|أشهر)).{0,90}(?:تعويض\s+إضافي|اتفاقية\s+جماعية|تأمين\s+عن\s+طريق\s+العمل)/i,
    /(?:تعويض\s+إضافي|اتفاقية\s+جماعية|تأمين\s+عن\s+طريق\s+العمل).{0,90}(?:إجازة\s+مرضية\s+طويلة|ثلاثة\s+أشهر|3\s+أشهر|90\s+يوما)/i,
    /(?:مرخصی\s+استعلاجی\s+طولانی|بیمار.{0,35}(?:سه\s+ماه|3\s+ماه|90\s+روز|چند\s+ماه)).{0,90}(?:غرامت\s+اضافی|مزایای\s+اضافی|قرارداد\s+جمعی|بیمه\s+از\s+طریق\s+کار)/i,
    /(?:غرامت\s+اضافی|مزایای\s+اضافی|قرارداد\s+جمعی|بیمه\s+از\s+طریق\s+کار).{0,90}(?:مرخصی\s+استعلاجی\s+طولانی|سه\s+ماه|3\s+ماه|90\s+روز)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Anställd och sjuk – skilj på rätt första väg',
      shellSub: 'Två fakta ändrar vägen: om arbetsgivaren betalar sjuklön och om deltid betyder deltidssjukskrivning.',
      collectiveShellTitle: 'Lång sjukskrivning – kontrollera ersättning via jobbet',
      collectiveShellSub: 'Kollektivavtal kan ge kompletterande ersättning. Avtalsområdet avgör vilken källa och handling som är relevant.',
      eyebrow: 'Anställd → sjukfrånvaro',
      title: 'Vilken sjukfrånvaroväg gäller först?',
      intro: 'Stödassistenten skiljer på anställda med vanlig sjuklön, anställda utan sjuklön och deltidssjukskrivning. Vi avgör inte om du har rätt till sjukpenning, vilken nivå som gäller eller hur Försäkringskassan bedömer arbetsförmågan.',
      collectiveEyebrow: 'Anställd → längre sjukfrånvaro → avtalsersättning',
      collectiveTitle: 'Kan jobbet eller kollektivavtalet ge extra ersättning?',
      collectiveIntro: 'Försäkringskassan visar att många långtidssjukskrivna missar kompletterande ersättning via kollektivavtal. Stödassistenten räknar inte ut belopp eller antar att ett visst avtal gäller. Vi behöver bara veta vilket avtalsområde du känner igen för att visa rätt kontrollväg.',
      qSickPay: 'Betalar din arbetsgivare normalt sjuklön i början av sjukperioden?',
      qPartial: 'När du säger deltid: arbetar du en del av din vanliga arbetstid därför att du är sjukskriven på deltid?',
      qAgreement: 'Vilket avtalsområde verkar din anställning tillhöra?',
      yes: 'Ja', no: 'Nej', unsure: 'Vet inte / behöver kontrollera',
      privateWorker: 'Privatanställd arbetare', privateSalaried: 'Privatanställd tjänsteman med ITP', municipal: 'Kommun, region, Svenska kyrkan eller vissa kommunala bolag', state: 'Statlig anställning', agreementUnknown: 'Vet inte vilket avtal som gäller',
      withPayTitle: 'Sjuklön från arbetsgivaren: börja i arbetsgivarspåret',
      withPayBody: 'Försäkringskassan beskriver att anställda som har sjuklön normalt börjar med sjukanmälan till arbetsgivaren. Om sjukperioden går vidare till sjukpenning blir Försäkringskassans aktuella ansökningsväg relevant. Kontrollera alltid den aktuella primärkällan.',
      noPayTitle: 'Anställd utan sjuklön: kontrollera Försäkringskassans första-dag-väg',
      noPayBody: 'Försäkringskassan har en separat väg för anställda som inte får sjuklön från arbetsgivaren i början av sjukperioden, till exempel i vissa behovs- eller timanställningar. Där kan sjukanmälan till Försäkringskassan behöva göras från första sjukdagen. Vi avgör inte om just din anställning tillhör den gruppen.',
      partialTitle: 'Deltidssjukskrivning: skilj på vanlig deltid och minskad arbetstid på grund av sjukdom',
      partialBody: 'Om du arbetar deltid samtidigt som du har sjukpenning anger Försäkringskassan att arbetstidens förläggning ska stämmas av med både Försäkringskassan och arbetsgivaren. Att du brukar arbeta deltid betyder inte i sig att du är deltidssjukskriven eller har rätt till en viss ersättningsnivå.',
      verifyTitle: 'Kontrollera sjuklönen innan du väljer första väg',
      verifyBody: 'Om du inte vet om arbetsgivaren betalar sjuklön ska Stödassistenten inte gissa mottagare eller tidslinje. Kontrollera med arbetsgivaren och den aktuella Försäkringskassan-vägledningen.',
      partialVerifyTitle: 'Kontrollera vad deltiden betyder i just sjukperioden',
      partialVerifyBody: 'Vanlig deltidsanställning och deltidssjukskrivning är olika fakta. Stödassistenten räknar inte ut sjukskrivningsgrad från arbetstid eller fritext.',
      agsTitle: 'Privatanställd arbetare: kontrollera AGS hos Afa Försäkring',
      agsBody: 'Om din arbetsplats omfattas av rätt kollektivavtal kan AGS komplettera ersättning vid sjukdom. Avtalat anger att den anställde själv anmäler till Afa Försäkring och att AGS kan bli relevant från dag 15. Kontrollera att avtalet och villkoren gäller dig innan du räknar med ersättning.',
      itpTitle: 'Privatanställd tjänsteman: kontrollera om ITP sjukpension gäller',
      itpBody: 'Om du faktiskt omfattas av ITP kan ITP sjukpension bli relevant vid längre sjukskrivning. Collectum anger bland annat sjukanmälan från dag 91 vid minst 25 procents arbetsoförmåga och en 105-dagarsregel för återkommande perioder. Arbetsgivaren gör anmälan. Stödassistenten antar inte att ITP gäller just dig.',
      municipalTitle: 'Kommun/region/Svenska kyrkan: kontrollera AGS-KL hos Afa Försäkring',
      municipalBody: 'AGS-KL kan ge kompletterande ersättning för anställda inom kommuner, regioner, Svenska kyrkan och vissa kommunala företag när villkoren är uppfyllda. Kontrollera aktuell anmälningsväg och villkor hos Afa Försäkring; anställningssektorn ensam bevisar inte rätt till ersättning.',
      stateTitle: 'Statlig anställning: skilj på sjukpenning och SPV:s sjukpension',
      stateBody: 'SPV anger att statlig sjukpension kräver sjukersättning eller aktivitetsersättning från Försäkringskassan. Så länge du bara har sjukpenning kan du inte få just SPV:s sjukpension. Kontrollera samtidigt med arbetsgivare eller fack om andra kollektivavtalade tillägg gäller i din situation.',
      unknownTitle: 'Okänt avtalsområde: identifiera avtalet innan du väljer försäkring',
      unknownBody: 'Stödassistenten ska inte gissa AGS, AGS-KL, ITP eller statlig sjukpension från yrkestitel, arbetsgivarnamn eller fritext. Kontrollera vilket kollektivavtal eller tjänstepensionsavtal som gäller med arbetsgivare eller fack och använd sedan rätt officiell källa.',
      sourceEmployee: 'Försäkringskassan: Sjukskriven när du är anställd', sourceNoPay: 'Försäkringskassan: Anställd utan sjuklön', sourceSignal: 'Försäkringskassan: många missar avtalsersättning vid längre sjukskrivning', sourceAgs: 'Avtalat: AGS för privatanställda arbetare', sourceItp: 'Collectum: ITP sjukpension', sourceAfa: 'Afa Försäkring: sjukförsäkring AGS/AGS-KL', sourceSpv: 'SPV: sjuk vid statlig anställning',
      privacy: 'Vi skickar inte diagnos, läkarintyg, SGI, lön, arbetsgivare, schema, personuppgifter eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida', feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'موظف ومريض – ميّز المسار الأول الصحيح', shellSub: 'معلومتان تغيّران المسار: هل يدفع صاحب العمل sjuklön وهل الدوام الجزئي يعني إجازة مرضية جزئية.', collectiveShellTitle: 'مرض طويل – تحقق من تعويض إضافي عبر العمل', collectiveShellSub: 'قد يضيف الاتفاق الجماعي تعويضاً. نوع الاتفاق يحدد المصدر والخطوة التالية.',
      eyebrow: 'موظف ← مرض', title: 'ما المسار الأول للغياب المرضي؟', intro: 'يميز Stödassistenten بين الموظف الذي يحصل على sjuklön، والموظف من دون sjuklön، والإجازة المرضية الجزئية. لا نقرر استحقاق sjukpenning أو النسبة أو التقييم الطبي.',
      collectiveEyebrow: 'موظف ← غياب مرضي طويل ← تعويض تعاقدي', collectiveTitle: 'هل يمكن أن يعطي العمل أو الاتفاق الجماعي تعويضاً إضافياً؟', collectiveIntro: 'توضح Försäkringskassan أن كثيراً من الموظفين قد يفوتهم تعويض تكميلي عبر الاتفاق الجماعي. لا نحسب المبلغ ولا نفترض أن اتفاقاً معيناً يسري عليك. نحتاج فقط إلى معرفة مجال الاتفاق الذي تعرفه لعرض طريق التحقق الصحيح.',
      qSickPay: 'هل يدفع صاحب العمل عادة sjuklön في بداية فترة المرض؟', qPartial: 'عندما تقول إنك تعمل جزئياً: هل تعمل جزءاً من وقتك المعتاد لأنك في إجازة مرضية جزئية؟', qAgreement: 'إلى أي مجال تعاقدي يبدو أن وظيفتك تنتمي؟',
      yes: 'نعم', no: 'لا', unsure: 'لا أعرف / أحتاج إلى التحقق', privateWorker: 'عامل في القطاع الخاص', privateSalaried: 'موظف خاص لديه ITP', municipal: 'بلدية أو إقليم أو كنيسة السويد أو بعض الشركات البلدية', state: 'وظيفة حكومية', agreementUnknown: 'لا أعرف الاتفاق المطبق',
      withPayTitle: 'مع sjuklön من صاحب العمل: ابدأ بمسار صاحب العمل', withPayBody: 'توضح Försäkringskassan أن الموظف الذي لديه sjuklön يبدأ عادة بإبلاغ صاحب العمل. إذا استمرت فترة المرض إلى مرحلة sjukpenning يصبح مسار Försäkringskassan الحالي ذا صلة. تحقق دائماً من المصدر الرسمي.',
      noPayTitle: 'موظف من دون sjuklön: تحقق من مسار Försäkringskassan من اليوم الأول', noPayBody: 'لدى Försäkringskassan مسار منفصل للموظف الذي لا يحصل على sjuklön في بداية المرض. نحن لا نقرر أن عقدك ينتمي إلى هذه الفئة.',
      partialTitle: 'إجازة مرضية جزئية: افصل الدوام الجزئي العادي عن خفض العمل بسبب المرض', partialBody: 'إذا كنت تعمل جزئياً أثناء حصولك على sjukpenning فيجب تنسيق وقت العمل مع Försäkringskassan وصاحب العمل. الدوام الجزئي المعتاد لا يثبت نسبة تعويض.',
      verifyTitle: 'تحقق من sjuklön قبل اختيار المسار الأول', verifyBody: 'إذا لم تعرف هل يدفع صاحب العمل sjuklön فلن يخمن Stödassistenten الجهة أو الجدول الزمني.', partialVerifyTitle: 'تحقق مما يعنيه الدوام الجزئي خلال فترة المرض', partialVerifyBody: 'العمل الجزئي المعتاد والإجازة المرضية الجزئية حقيقتان مختلفتان.',
      agsTitle: 'عامل في القطاع الخاص: تحقق من AGS لدى Afa Försäkring', agsBody: 'إذا كانت جهة عملك مشمولة بالاتفاق المناسب فقد تكمل AGS تعويض المرض. يوضح Avtalat أن العامل نفسه يبلغ Afa وأن AGS قد تصبح ذات صلة من اليوم 15. تحقق من الاتفاق والشروط قبل الاعتماد على أي تعويض.',
      itpTitle: 'موظف خاص: تحقق هل ITP sjukpension تنطبق', itpBody: 'إذا كنت مشمولاً فعلاً بـ ITP فقد تصبح ITP sjukpension مهمة عند المرض الطويل. توضح Collectum مساراً من اليوم 91 أو قاعدة 105 أيام في حالات متكررة، وصاحب العمل هو الذي يقدم البلاغ. لا نفترض أن ITP تسري عليك.',
      municipalTitle: 'بلدية/إقليم/كنيسة السويد: تحقق من AGS-KL لدى Afa', municipalBody: 'قد تقدم AGS-KL تعويضاً تكميلياً إذا تحققت الشروط. تحقق من الطريق والشروط الحالية لدى Afa؛ القطاع وحده لا يثبت الاستحقاق.',
      stateTitle: 'وظيفة حكومية: افصل sjukpenning عن sjukpension لدى SPV', stateBody: 'توضح SPV أن sjukpension الحكومية تتطلب sjukersättning أو aktivitetsersättning من Försäkringskassan. طالما لديك فقط sjukpenning فلا تحصل على هذه sjukpension تحديداً. تحقق أيضاً مع صاحب العمل أو النقابة من أي إضافات جماعية أخرى.',
      unknownTitle: 'الاتفاق غير معروف: حدده قبل اختيار التأمين', unknownBody: 'لن يخمن Stödassistenten AGS أو AGS-KL أو ITP أو sjukpension الحكومية من المسمى الوظيفي أو اسم صاحب العمل أو النص الحر. تحقق من الاتفاق مع صاحب العمل أو النقابة ثم استخدم المصدر الرسمي الصحيح.',
      sourceEmployee: 'Försäkringskassan: المرض عندما تكون موظفاً', sourceNoPay: 'Försäkringskassan: موظف من دون sjuklön', sourceSignal: 'Försäkringskassan: تعويضات جماعية يفوتها بعض المرضى طويلاً', sourceAgs: 'Avtalat: AGS للعاملين في القطاع الخاص', sourceItp: 'Collectum: ITP sjukpension', sourceAfa: 'Afa Försäkring: AGS/AGS-KL', sourceSpv: 'SPV: المرض في الوظيفة الحكومية', privacy: 'لا نرسل التشخيص أو التقرير الطبي أو SGI أو الراتب أو صاحب العمل أو الجدول أو الهوية أو قصتك في الرابط أو الملاحظات.', home: 'إلى الصفحة الرئيسية لـ Stödassistenten', feedback: 'ساعدنا على تحسين هذا المسار', learned: 'هل عرفت شيئاً جديداً؟', useful: 'هل كانت المساعدة مفيدة؟', clear: 'هل كانت الخطوة التالية واضحة؟', send: 'إرسال ملاحظات مجهولة', sent: 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error: 'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle: 'شاغل و بیمار – مسیر نخست درست را جدا کنید', shellSub: 'دو نکته مسیر را عوض می‌کند: آیا کارفرما sjuklön می‌پردازد و آیا پاره‌وقت یعنی مرخصی استعلاجی پاره‌وقت.', collectiveShellTitle: 'بیماری طولانی – غرامت تکمیلی از طریق کار را بررسی کنید', collectiveShellSub: 'قرارداد جمعی می‌تواند غرامت تکمیلی داشته باشد. نوع قرارداد مسیر منبع و اقدام را تعیین می‌کند.',
      eyebrow: 'شاغل ← بیماری', title: 'کدام مسیر غیبت بیماری اول مطرح است؟', intro: 'Stödassistenten بین کارمند دارای sjuklön، کارمند بدون sjuklön و مرخصی استعلاجی پاره‌وقت تفاوت می‌گذارد. ما استحقاق sjukpenning، درصد یا ارزیابی پزشکی را تعیین نمی‌کنیم.',
      collectiveEyebrow: 'شاغل ← بیماری طولانی ← مزایای قراردادی', collectiveTitle: 'آیا کار یا قرارداد جمعی می‌تواند غرامت اضافی بدهد؟', collectiveIntro: 'Försäkringskassan نشان می‌دهد که برخی افراد در بیماری طولانی غرامت تکمیلی قرارداد جمعی را از دست می‌دهند. ما مبلغ را حساب نمی‌کنیم و حدس نمی‌زنیم کدام قرارداد شامل شماست. فقط نوع حوزه قراردادی را می‌پرسیم تا مسیر بررسی درست را نشان دهیم.',
      qSickPay: 'آیا کارفرمای شما معمولاً در ابتدای دوره بیماری sjuklön می‌پردازد؟', qPartial: 'وقتی می‌گویید پاره‌وقت: آیا به علت مرخصی استعلاجی پاره‌وقت، بخشی از ساعات معمول خود را کار می‌کنید؟', qAgreement: 'شغل شما ظاهراً به کدام حوزه قراردادی تعلق دارد؟',
      yes: 'بله', no: 'خیر', unsure: 'نمی‌دانم / باید بررسی کنم', privateWorker: 'کارگر بخش خصوصی', privateSalaried: 'کارمند بخش خصوصی با ITP', municipal: 'شهرداری، منطقه، کلیسای سوئد یا برخی شرکت‌های شهری', state: 'استخدام دولتی', agreementUnknown: 'نمی‌دانم کدام قرارداد اعمال می‌شود',
      withPayTitle: 'با sjuklön کارفرما: از مسیر کارفرما شروع کنید', withPayBody: 'Försäkringskassan توضیح می‌دهد کارمندی که sjuklön دارد معمولاً ابتدا بیماری را به کارفرما اعلام می‌کند و در ادامه ممکن است مسیر sjukpenning مطرح شود.', noPayTitle: 'کارمند بدون sjuklön: مسیر روز اول Försäkringskassan را بررسی کنید', noPayBody: 'Försäkringskassan برای کارمندی که در ابتدای بیماری از کارفرما sjuklön نمی‌گیرد مسیر جداگانه دارد. ما تعیین نمی‌کنیم قرارداد شما در این گروه است.', partialTitle: 'مرخصی استعلاجی پاره‌وقت: پاره‌وقت عادی را از کاهش کار به علت بیماری جدا کنید', partialBody: 'پاره‌وقت بودن معمول شما به تنهایی مرخصی استعلاجی پاره‌وقت یا درصد خاصی از مزایا را ثابت نمی‌کند.', verifyTitle: 'پیش از انتخاب مسیر نخست sjuklön را بررسی کنید', verifyBody: 'اگر نمی‌دانید کارفرما sjuklön می‌پردازد، Stödassistenten گیرنده یا زمان‌بندی را حدس نمی‌زند.', partialVerifyTitle: 'بررسی کنید پاره‌وقت در این دوره بیماری چه معنایی دارد', partialVerifyBody: 'استخدام پاره‌وقت عادی و مرخصی استعلاجی پاره‌وقت دو واقعیت متفاوت‌اند.',
      agsTitle: 'کارگر بخش خصوصی: AGS را نزد Afa Försäkring بررسی کنید', agsBody: 'اگر محل کار شما مشمول قرارداد مناسب باشد AGS می‌تواند غرامت بیماری را تکمیل کند. Avtalat می‌گوید خود فرد به Afa اعلام می‌کند و AGS می‌تواند از روز 15 مطرح باشد. پیش از تکیه بر غرامت، قرارداد و شرایط را بررسی کنید.',
      itpTitle: 'کارمند بخش خصوصی: بررسی کنید ITP sjukpension شامل شماست', itpBody: 'اگر واقعاً تحت ITP باشید، ITP sjukpension می‌تواند در بیماری طولانی مطرح شود. Collectum از روز 91 یا قاعده 105 روز برای دوره‌های تکراری یاد می‌کند و کارفرما گزارش می‌دهد. ما فرض نمی‌کنیم ITP شامل شماست.',
      municipalTitle: 'شهرداری/منطقه/کلیسای سوئد: AGS-KL را نزد Afa بررسی کنید', municipalBody: 'AGS-KL در صورت تحقق شرایط می‌تواند غرامت تکمیلی بدهد. مسیر و شرایط فعلی را نزد Afa بررسی کنید؛ بخش استخدامی به تنهایی استحقاق را ثابت نمی‌کند.',
      stateTitle: 'استخدام دولتی: sjukpenning را از sjukpension نزد SPV جدا کنید', stateBody: 'SPV می‌گوید sjukpension دولتی به sjukersättning یا aktivitetsersättning از Försäkringskassan نیاز دارد. تا وقتی فقط sjukpenning دارید، همین sjukpension از SPV پرداخت نمی‌شود. برای سایر مکمل‌های قراردادی با کارفرما یا اتحادیه بررسی کنید.',
      unknownTitle: 'قرارداد نامعلوم: پیش از انتخاب بیمه قرارداد را مشخص کنید', unknownBody: 'Stödassistenten از عنوان شغل، نام کارفرما یا متن آزاد حدس نمی‌زند که AGS، AGS-KL، ITP یا sjukpension دولتی اعمال می‌شود. قرارداد را با کارفرما یا اتحادیه بررسی و سپس منبع رسمی درست را استفاده کنید.',
      sourceEmployee: 'Försäkringskassan: بیماری هنگام اشتغال', sourceNoPay: 'Försäkringskassan: کارمند بدون sjuklön', sourceSignal: 'Försäkringskassan: برخی غرامت‌های قراردادی از دست می‌روند', sourceAgs: 'Avtalat: AGS برای کارگران بخش خصوصی', sourceItp: 'Collectum: ITP sjukpension', sourceAfa: 'Afa Försäkring: AGS/AGS-KL', sourceSpv: 'SPV: بیماری در استخدام دولتی', privacy: 'تشخیص، گواهی پزشکی، SGI، حقوق، کارفرما، برنامه کاری، هویت یا داستان شما را در نشانی یا بازخورد ارسال نمی‌کنیم.', home: 'به صفحه اصلی Stödassistenten', feedback: 'به بهبود این مسیر کمک کنید', learned: 'چیز تازه‌ای فهمیدید؟', useful: 'کمک مفید بود؟', clear: 'گام بعدی روشن بود؟', send: 'ارسال بازخورد ناشناس', sent: 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error: 'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(lang) { return ['sv', 'ar', 'fa'].includes(String(lang || '').toLowerCase()) ? String(lang).toLowerCase() : 'sv'; }
  function excluded(text) { return EXCLUSION_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function detect(text) { return !excluded(text) && DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function detectCollective(text) { return detect(text) && COLLECTIVE_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function handoffHref(lang, options) {
    const href = `person-pilot.html?actor_type=employee&focus=employee_sick&lang=${encodeURIComponent(safeLang(lang))}`;
    return options && options.collective ? `${href}&sickness_context=collective_compensation` : href;
  }
  function nextStep(state) {
    if (state && state.mode === 'collective') {
      if (!state.agreementArea) return 'ask_agreement_area';
      return `collective_${state.agreementArea}`;
    }
    if (!state.sickPay) return 'ask_sick_pay';
    if (state.sickPay === 'unsure') return 'verify_sick_pay';
    if (!state.partial) return 'ask_partial';
    if (state.partial === 'unsure') return 'verify_partial';
    if (state.partial === 'yes') return state.sickPay === 'yes' ? 'partial_with_pay' : 'partial_without_pay';
    return state.sickPay === 'yes' ? 'with_pay' : 'without_pay';
  }

  function pageLang(win) {
    const params = new URLSearchParams(win.location.search);
    return safeLang(params.get('lang') || win.document.documentElement.lang);
  }

  function rootHandoff(win) {
    const doc = win.document;
    const button = doc.querySelector('#analyzeBtn');
    const input = doc.querySelector('#situation');
    const results = doc.querySelector('#engineResults');
    if (!button || !input || !results) return;
    button.addEventListener('click', function () {
      if (!detect(input.value)) return;
      const lang = pageLang(win);
      const c = COPY[lang];
      const collective = detectCollective(input.value);
      const existing = doc.querySelector('[data-stod-employee-sick-route]');
      if (existing) existing.remove();
      const route = doc.createElement('div');
      route.className = 'route';
      route.setAttribute('data-stod-employee-sick-route', 'true');
      route.innerHTML = `<div><strong>${collective ? c.collectiveShellTitle : c.shellTitle}</strong><small>${collective ? c.collectiveShellSub : c.shellSub}</small></div><a href="${handoffHref(lang, { collective })}">→</a>`;
      results.prepend(route);
    });
  }

  function feedbackMarkup(c) {
    const row = (name, label) => `<fieldset><legend>${label}</legend><label><input type="radio" name="${name}" value="yes"> ${c.yes}</label> <label><input type="radio" name="${name}" value="no"> ${c.no}</label></fieldset>`;
    return `<section class="feedback"><h3>${c.feedback}</h3>${row('learned_new', c.learned)}${row('useful', c.useful)}${row('next_step_clear', c.clear)}<button type="button" data-send-feedback>${c.send}</button><p data-feedback-status aria-live="polite"></p></section>`;
  }

  function focusedApp(win) {
    const doc = win.document;
    const main = doc.querySelector('#main');
    if (!main) return;
    const params = new URLSearchParams(win.location.search);
    const lang = pageLang(win);
    const c = COPY[lang];
    doc.documentElement.lang = lang;
    doc.documentElement.dir = lang === 'sv' ? 'ltr' : 'rtl';
    const collectiveMode = params.get('sickness_context') === 'collective_compensation';
    const state = { mode: collectiveMode ? 'collective' : 'core', sickPay: '', partial: '', agreementArea: '' };

    function option(name, value, label) { return `<label><input type="radio" name="${name}" value="${value}"> ${label}</label>`; }
    function question(name, text) { return `<fieldset data-question="${name}"><legend>${text}</legend>${option(name, 'yes', c.yes)} ${option(name, 'no', c.no)} ${option(name, 'unsure', c.unsure)}</fieldset>`; }
    function agreementQuestion() {
      return `<fieldset data-question="agreementArea"><legend>${c.qAgreement}</legend>${option('agreementArea', 'private_worker', c.privateWorker)} ${option('agreementArea', 'private_salaried', c.privateSalaried)} ${option('agreementArea', 'municipal_region_church', c.municipal)} ${option('agreementArea', 'state', c.state)} ${option('agreementArea', 'unknown', c.agreementUnknown)}</fieldset>`;
    }
    function standardSources() { return `<p><a href="${FK_EMPLOYEE_URL}" target="_blank" rel="noopener">${c.sourceEmployee}</a><br><a href="${FK_NO_SICK_PAY_URL}" target="_blank" rel="noopener">${c.sourceNoPay}</a></p>`; }
    function collectiveSources(area) {
      const links = [`<a href="${FK_COLLECTIVE_SIGNAL_URL}" target="_blank" rel="noopener">${c.sourceSignal}</a>`];
      if (area === 'private_worker') links.push(`<a href="${AVTALAT_AGS_URL}" target="_blank" rel="noopener">${c.sourceAgs}</a>`);
      else if (area === 'private_salaried') links.push(`<a href="${COLLECTUM_ITP_URL}" target="_blank" rel="noopener">${c.sourceItp}</a>`);
      else if (area === 'municipal_region_church') links.push(`<a href="${AFA_SICK_URL}" target="_blank" rel="noopener">${c.sourceAfa}</a>`);
      else if (area === 'state') links.push(`<a href="${SPV_STATE_URL}" target="_blank" rel="noopener">${c.sourceSpv}</a>`);
      return `<p>${links.join('<br>')}</p>`;
    }
    function result(title, body, sourceHtml) { return `<section class="result-card"><h2>${title}</h2><p>${body}</p>${sourceHtml || standardSources()}<p class="note">${c.privacy}</p></section>`; }

    function render() {
      const step = nextStep(state);
      let content = collectiveMode
        ? `<p class="eyebrow">${c.collectiveEyebrow}</p><h1>${c.collectiveTitle}</h1><p>${c.collectiveIntro}</p>`
        : `<p class="eyebrow">${c.eyebrow}</p><h1>${c.title}</h1><p>${c.intro}</p>`;
      if (step === 'ask_agreement_area') content += agreementQuestion();
      else if (step === 'collective_private_worker') content += result(c.agsTitle, c.agsBody, collectiveSources('private_worker'));
      else if (step === 'collective_private_salaried') content += result(c.itpTitle, c.itpBody, collectiveSources('private_salaried'));
      else if (step === 'collective_municipal_region_church') content += result(c.municipalTitle, c.municipalBody, collectiveSources('municipal_region_church'));
      else if (step === 'collective_state') content += result(c.stateTitle, c.stateBody, collectiveSources('state'));
      else if (step === 'collective_unknown') content += result(c.unknownTitle, c.unknownBody, collectiveSources('unknown'));
      else if (step === 'ask_sick_pay') content += question('sickPay', c.qSickPay);
      else if (step === 'ask_partial') content += question('partial', c.qPartial);
      else if (step === 'verify_sick_pay') content += result(c.verifyTitle, c.verifyBody);
      else if (step === 'verify_partial') content += result(c.partialVerifyTitle, c.partialVerifyBody);
      else if (step === 'with_pay') content += result(c.withPayTitle, c.withPayBody);
      else if (step === 'without_pay') content += result(c.noPayTitle, c.noPayBody);
      else if (step === 'partial_with_pay') content += result(c.partialTitle, `${c.withPayBody} ${c.partialBody}`);
      else content += result(c.partialTitle, `${c.noPayBody} ${c.partialBody}`);
      if (!step.startsWith('ask_')) content += feedbackMarkup(c);
      content += `<p><a href="index.html">${c.home}</a></p>`;
      main.innerHTML = `<div class="wrap" style="max-width:760px;margin:0 auto;padding:32px 20px">${content}</div>`;
      main.querySelectorAll('input[type="radio"]').forEach((el) => {
        if (['sickPay', 'partial', 'agreementArea'].includes(el.name)) {
          el.addEventListener('change', function () { state[el.name] = el.value; render(); });
        }
      });
      const send = main.querySelector('[data-send-feedback]');
      if (send) send.addEventListener('click', async function () {
        const get = (name) => { const picked = main.querySelector(`input[name="${name}"]:checked`); return picked ? picked.value === 'yes' : null; };
        const payload = {
          app_version: 'v52', language: lang, flow: 'employee_sick',
          learned_new: get('learned_new'), useful: get('useful'), next_step_clear: get('next_step_clear'),
          ratings: { route: nextStep(state), agreement_area: collectiveMode ? state.agreementArea || 'unknown' : 'not_asked' }
        };
        const status = main.querySelector('[data-feedback-status]');
        try {
          const res = await win.fetch(FEEDBACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error('feedback');
          status.textContent = c.sent;
        } catch (_) { status.textContent = c.error; }
      });
    }
    render();
  }

  function hookPerson(win) {
    const params = new URLSearchParams(win.location.search);
    if (params.get('focus') !== 'employee_sick') return;
    if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', function () { focusedApp(win); }, { once: true });
    else focusedApp(win);
  }

  function init(win) {
    if (!win || !win.document) return;
    rootHandoff(win);
    hookPerson(win);
  }

  return {
    init, detect, detectCollective, handoffHref, nextStep,
    FK_EMPLOYEE_URL, FK_NO_SICK_PAY_URL, FK_COLLECTIVE_SIGNAL_URL,
    AVTALAT_AGS_URL, COLLECTUM_ITP_URL, AFA_SICK_URL, SPV_STATE_URL
  };
});
