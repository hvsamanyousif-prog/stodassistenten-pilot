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
  const FK_POWER_URL = 'https://www.forsakringskassan.se/download/18.398e2a521762d534987475/1734594657037/5607-fullmakt-for-ombud.pdf';
  const ADMIN_LAW_URL = 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/forvaltningslag-2017900_sfs-2017-900/';
  const SOL_URL = 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/socialtjanstlag-2025400_sfs-2025-400/';
  const CARE_GUIDE_URL = 'https://www.1177.se/sa-fungerar-varden/anhorig---narstaende/anhorigstod---stod-for-dig-som-vardar-eller-stodjer-en-narstaende/';
  const CARE_RELATIVE_URL = 'https://www.1177.se/Vastra-Gotaland/sa-fungerar-varden/anhorig---narstaende/att-vara-narstaende-i-varden/';
  const CONTEXTS = new Set(['near_relative_benefit', 'municipal_support', 'representation']);

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
  const MUNICIPAL_DIRECT_PATTERNS = [
    /\b(?:anhörigstöd|anhörigkonsulent|stödkontakt)\b/i,
    /دعم\s+(?:الأقارب|مقدم\s+الرعاية)|جهة\s+دعم\s+للقريب/i,
    /حمایت\s+از\s+(?:نزدیکان|مراقب)|رابط\s+حمایتی/i,
  ];
  const CARE_ACTION_PATTERNS = [
    /(?:vårdar|vårda|stödjer|stötta|hjälper|hjälpa|tar\s+hand\s+om|omsorg)/i,
    /أرعى|أعتني|أساعد|أدعم/i,
    /مراقبت\s+می(?:‌|\s)*کنم|کمک\s+می(?:‌|\s)*کنم|حمایت\s+می(?:‌|\s)*کنم/i,
  ];
  const MUNICIPAL_SCOPE_PATTERNS = [
    /(?:äldre|åldrad|långvarigt\s+sjuk|kroniskt\s+sjuk|funktionsnedsättning|demens|alzheimer)/i,
    /مسن|كبير\s+في\s+السن|مرض\s+مزمن|مريض\s+منذ\s+فترة\s+طويلة|إعاقة|خرف|ألزهايمر/i,
    /سالمند|بیماری\s+مزمن|مدت\s+طولانی\s+بیمار|معلولیت|ناتوانی|زوال\s+عقل|آلزایمر/i,
  ];
  const REPRESENTATION_PATTERNS = [
    /\b(?:fullmakt(?:en|er)?|ombud|företräda|företräder|företräda\s+min|ansöka\s+åt|ansöker\s+åt|sköta\s+(?:hans|hennes|min\s+(?:mammas|pappas|partners))\s+(?:ärende|ärenden|myndighetsärenden)|prata\s+med\s+(?:myndigheten|försäkringskassan|kommunen|vården)\s+åt)\b/i,
    /وكال(?:ة|تي)|توكيل|وكيل|أمثّل|أمثل|نيابة\s+عن|أقدّم\s+الطلب\s+عن|أقدم\s+الطلب\s+عن/i,
    /وکالت(?:‌|\s)*نامه|وکالتنامه|نماینده|به\s+نمایندگی|برای\s+(?:مادرم|پدرم|همسرم)\s+درخواست/i,
  ];
  const PROFESSIONAL_REP_PATTERNS = [
    /\b(?:jag\s+jobbar\s+med|jag\s+arbetar\s+med|handläggare|utbildning\s+om|uppsats\s+om|research|statistik\s+om)\b/i,
    /أعمل\s+في|موظف|بحث\s+عن|دراسة\s+عن/i,
    /کار\s+می(?:‌|\s)*کنم|کارمند|پژوهش|تحقیق\s+درباره/i,
  ];

  const COPY = {
    sv: {
      shellBenefitTitle: 'Stödja någon som är svårt sjuk',
      shellBenefitSub: 'Kontrollera närståendepenning och nästa säkra steg',
      shellMunicipalTitle: 'Stöd när du hjälper en närstående',
      shellMunicipalSub: 'Kontrollera kommunalt anhörigstöd och stödkontakt',
      shellRepresentationTitle: 'Hjälpa eller företräda en närstående',
      shellRepresentationSub: 'Kontrollera behörighet, fullmakt och nästa säkra steg',
      eyebrow: 'Närstående',
      titleBenefit: 'Du verkar behöva vara nära någon som är svårt sjuk',
      titleMunicipal: 'Du verkar hjälpa eller vårda en närstående',
      titleRepresentation: 'Du verkar vilja hjälpa eller företräda någon i ett ärende',
      intro: 'Vi ställer bara frågor som kan ändra vägen. Piloten avgör inte rätt till ersättning och sparar inte dina svar i den anonyma feedbacken.',
      qLife: 'Har vården sagt att personens hälsotillstånd är livshotande?',
      qForego: 'Behöver du avstå från arbete, a-kassa eller föräldrapenning för att vara nära och stödja personen?',
      qScope: 'Är personen äldre, långvarigt sjuk eller har en funktionsnedsättning?',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      likelyTitle: 'Närståendepenning är en väg att kontrollera',
      likelyBody: 'Försäkringskassan beskriver närståendepenning för den som behöver avstå från arbete eller viss annan ersättning för att stödja en närstående med ett livshotande hälsotillstånd. Be vården om rätt läkarutlåtande och kontrollera den aktuella ansökningsvägen hos Försäkringskassan innan du antar att villkoren är uppfyllda.',
      lifeNoTitle: 'Närståendepenning är inte rätt första väg här',
      lifeNoBody: 'Ett vanligt omsorgsbehov eller åldersrelaterat hjälpbehov är inte i sig samma sak som ett livshotande hälsotillstånd. Det betyder inte att annat stöd saknas.',
      lifeUnsureTitle: 'Klargör hälsotillståndet innan du går vidare med ersättningsspåret',
      lifeUnsureBody: 'Be vården förklara om tillståndet motsvarar Försäkringskassans krav för närståendepenning och om läkarutlåtande kan utfärdas. Om personen är äldre, långvarigt sjuk eller har en funktionsnedsättning finns ett separat kommunalt anhörigstöds-spår.',
      foregoNoTitle: 'Kontant ersättning och anhörigstöd är två olika vägar',
      foregoNoBody: 'Närståendepenning är kopplad till att den som stödjer avstår från arbete eller viss annan ersättning. Om du inte gör det ska piloten inte lova kontant ersättning. Kommunalt stöd till anhöriga är en separat väg när personens situation omfattas av den.',
      foregoUnsureTitle: 'Fastställ vilken tid eller ersättning du faktiskt avstår',
      foregoUnsureBody: 'Det kan ändra om närståendepenning är relevant. Kontrollera din arbetstid eller den ersättning du annars skulle ha fått innan du ansöker.',
      municipalTitle: 'Kommunalt anhörigstöd är en separat väg att använda',
      municipalBody: 'Gällande socialtjänstlag anger att socialnämnden ska erbjuda information, vägledning eller annat stöd samt en stödkontakt till den som vårdar eller stödjer en närstående som är äldre eller långvarigt sjuk, eller som har en funktionsnedsättning. Kontakta din kommun och be om anhörigstöd eller stödkontakt. Exakt lokalt stöd kan variera och ska inte gissas av piloten.',
      municipalUnsureTitle: 'Klargör kommunens anhörigstöds-väg',
      municipalUnsureBody: 'Om du är osäker på om situationen faller inom den särskilda lagregeln, kontakta kommunens socialtjänst eller anhörigstöd. Piloten ska inte göra en lokal behovsprövning eller lova en viss insats.',
      municipalNoTitle: 'Den särskilda anhörigstöds-kategorin är inte etablerad ännu',
      municipalNoBody: 'Utifrån svaret ska piloten inte anta att just stödkontaktregeln gäller och inte heller lova kontant ersättning. Du kan fortfarande kontakta kommunen eller 1177 för att hitta rätt aktuell stödväg.',
      representationTitle: 'Släktskap är inte samma sak som behörighet att företräda',
      representationBody: 'Att du är anhörig eller närstående betyder inte i sig att du automatiskt kan skriva under, ansöka eller fatta beslut åt personen. I myndighetsärenden kan den ansvariga myndigheten behöva kontrollera ombudets behörighet och fullmaktens omfattning. Kontrollera därför den aktuella organisationens ombuds- eller fullmaktsväg och att fullmakten faktiskt omfattar just ärendet innan du agerar.',
      representationCareTitle: 'Hjälp i vården och rätt att fatta vårdbeslut är inte samma sak',
      representationCareBody: '1177 beskriver att en fullmakt kan användas för att hjälpa en närstående i vissa vårdkontakter, men att den inte i sig ger rätt att fatta beslut eller samtycka till vårdåtgärder. Kontrollera den aktuella vårdgivarens process och använd inte en generell fullmakt som bevis för beslutanderätt.',
      sourceFk: 'Försäkringskassan: stödja en svårt sjuk närstående',
      sourceFkPower: 'Försäkringskassan: fullmakt för ombud',
      sourceAdminLaw: 'Sveriges riksdag: förvaltningslagen 14–15 §§',
      sourceSol: 'Sveriges riksdag: socialtjänstlagen 13 kap. 9 §',
      sourceGuide: '1177: anhörigstöd och kontaktväg',
      sourceCareRelative: '1177: närstående i vården och fullmakt',
    },
    ar: {
      shellBenefitTitle: 'دعم شخص مريض جداً', shellBenefitSub: 'تحقق من مسار تعويض رعاية قريب والخطوة الآمنة التالية',
      shellMunicipalTitle: 'دعم لك عندما ترعى شخصاً قريباً', shellMunicipalSub: 'تحقق من دعم الأقارب وجهة الدعم في البلدية',
      shellRepresentationTitle: 'مساعدة قريب أو تمثيله', shellRepresentationSub: 'تحقق من الصلاحية والتوكيل والخطوة الآمنة التالية',
      eyebrow: 'دعم شخص قريب', titleBenefit: 'يبدو أنك تحتاج إلى البقاء بجانب شخص مريض جداً', titleMunicipal: 'يبدو أنك ترعى أو تدعم شخصاً قريباً', titleRepresentation: 'يبدو أنك تريد مساعدة شخص أو تمثيله في معاملة',
      intro: 'نسأل فقط ما يمكن أن يغيّر المسار. النسخة التجريبية لا تقرر الاستحقاق ولا تضع إجاباتك في الملاحظات المجهولة.',
      qLife: 'هل قالت الرعاية الصحية إن الحالة مهددة للحياة؟', qForego: 'هل تحتاج إلى ترك العمل أو تعويض البطالة أو إجازة الوالدين لتكون مع الشخص وتدعمه؟',
      qScope: 'هل الشخص مسن أو مريض منذ مدة طويلة أو لديه إعاقة؟',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      likelyTitle: 'من المفيد التحقق من närståendepenning', likelyBody: 'تصف Försäkringskassan هذا التعويض لمن يترك العمل أو بعض التعويضات الأخرى لدعم شخص قريب لديه حالة مهددة للحياة. اطلب الشهادة الطبية المناسبة وتحقق من طريقة التقديم الحالية قبل افتراض استيفاء الشروط.',
      lifeNoTitle: 'تعويض närståendepenning ليس المسار الأول هنا', lifeNoBody: 'الحاجة اليومية للمساعدة أو الحاجة المرتبطة بالتقدم في السن ليست بحد ذاتها حالة مهددة للحياة. هذا لا يعني عدم وجود دعم آخر.',
      lifeUnsureTitle: 'وضّح الحالة الصحية قبل متابعة مسار التعويض', lifeUnsureBody: 'اسأل الرعاية الصحية إن كانت الحالة توافق متطلبات Försäkringskassan. إذا كان الشخص مسناً أو مريضاً لمدة طويلة أو لديه إعاقة فهناك مسار منفصل لدعم الأقارب عبر البلدية.',
      foregoNoTitle: 'التعويض المالي ودعم الأقارب مساران مختلفان', foregoNoBody: 'يرتبط närståendepenning بترك العمل أو بعض التعويضات الأخرى. إذا لم يحدث ذلك فلا ينبغي للنسخة التجريبية أن تعد بتعويض مالي. دعم البلدية للأقارب مسار منفصل.',
      foregoUnsureTitle: 'حدّد الوقت أو التعويض الذي ستتركه', foregoUnsureBody: 'قد يغيّر ذلك مدى ملاءمة مسار närståendepenning. تحقق من وقت العمل أو التعويض قبل التقديم.',
      municipalTitle: 'دعم البلدية للأقارب مسار منفصل يمكن استخدامه', municipalBody: 'ينص قانون الخدمات الاجتماعية الحالي على أن اللجنة الاجتماعية في البلدية تعرض معلومات وإرشاداً أو دعماً آخر، وكذلك جهة دعم، لمن يرعى أو يدعم شخصاً مسناً أو مريضاً لمدة طويلة أو لديه إعاقة. تواصل مع بلديتك واطلب دعم الأقارب أو جهة الدعم. لا ينبغي للنسخة التجريبية أن تخمّن الخدمة المحلية الدقيقة.',
      municipalUnsureTitle: 'تحقق من مسار دعم الأقارب في البلدية', municipalUnsureBody: 'إذا لم تكن متأكداً من انطباق الفئة القانونية، فتواصل مع الخدمات الاجتماعية أو دعم الأقارب في بلديتك. النسخة التجريبية لا تجري تقييماً محلياً ولا تعد بتدخل محدد.',
      municipalNoTitle: 'لم يتضح بعد أن فئة دعم الأقارب المحددة تنطبق', municipalNoBody: 'لا ينبغي للنسخة التجريبية أن تفترض انطباق قاعدة جهة الدعم أو أن تعد بتعويض مالي. ما زال بإمكانك التواصل مع البلدية أو 1177 لتحديد المسار المناسب.',
      representationTitle: 'صلة القرابة لا تعني تلقائياً صلاحية التمثيل',
      representationBody: 'كونك قريباً لا يعني تلقائياً أنك تستطيع التوقيع أو التقديم أو اتخاذ قرارات نيابة عن الشخص. في معاملات الجهات العامة قد يلزم التحقق من صلاحية الوكيل ونطاق التوكيل. تحقق من مسار الوكالة أو التوكيل لدى الجهة المسؤولة ومن أن التوكيل يشمل هذه المعاملة بالذات.',
      representationCareTitle: 'المساعدة في التواصل مع الرعاية لا تعني حق اتخاذ قرارات العلاج',
      representationCareBody: 'توضح 1177 أن التوكيل قد يساعد القريب في بعض الاتصالات مع الرعاية، لكنه لا يمنح بحد ذاته حق اتخاذ قرارات العلاج أو الموافقة عليها. تحقق من الإجراء الحالي لدى مقدم الرعاية.',
      sourceFk: 'Försäkringskassan: دعم شخص مريض جداً', sourceFkPower: 'Försäkringskassan: توكيل للوكيل', sourceAdminLaw: 'البرلمان السويدي: قانون الإجراءات الإدارية §§14–15', sourceSol: 'البرلمان السويدي: قانون الخدمات الاجتماعية، الفصل 13 §9', sourceGuide: '1177: دعم الأقارب وطريقة التواصل', sourceCareRelative: '1177: القريب في الرعاية والتوكيل',
    },
    fa: {
      shellBenefitTitle: 'حمایت از فردی که بسیار بیمار است', shellBenefitSub: 'مسیر کمک‌هزینه نزدیکان و قدم امن بعدی را بررسی کن',
      shellMunicipalTitle: 'حمایت وقتی از یک نزدیک مراقبت می‌کنی', shellMunicipalSub: 'حمایت شهرداری و رابط حمایتی را بررسی کن',
      shellRepresentationTitle: 'کمک یا نمایندگی از یک نزدیک', shellRepresentationSub: 'اختیار، وکالت و قدم امن بعدی را بررسی کن',
      eyebrow: 'حمایت از نزدیکان', titleBenefit: 'به نظر می‌رسد لازم است کنار فردی که بسیار بیمار است باشی', titleMunicipal: 'به نظر می‌رسد از یک فرد نزدیک مراقبت یا حمایت می‌کنی', titleRepresentation: 'به نظر می‌رسد می‌خواهی در یک پرونده به جای شخص دیگری اقدام کنی',
      intro: 'فقط سؤال‌هایی را می‌پرسیم که می‌توانند مسیر را تغییر دهند. پایلوت درباره استحقاق تصمیم نمی‌گیرد و پاسخ‌هایت را در بازخورد ناشناس ذخیره نمی‌کند.',
      qLife: 'آیا خدمات درمانی گفته‌اند وضعیت فرد تهدیدکننده زندگی است؟', qForego: 'آیا برای کنار فرد بودن و حمایت از او باید از کار، بیمه بیکاری یا مزایای والدین صرف‌نظر کنی؟',
      qScope: 'آیا فرد سالمند، به‌طور طولانی‌مدت بیمار یا دارای معلولیت/ناتوانی است؟',
      yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      likelyTitle: 'ارزش دارد närståendepenning را بررسی کنی', likelyBody: 'Försäkringskassan این کمک را برای کسی توضیح می‌دهد که برای حمایت از فرد نزدیک با وضعیت تهدیدکننده زندگی از کار یا بعضی مزایای دیگر صرف‌نظر می‌کند. درباره گواهی پزشکی لازم بپرس و مسیر فعلی درخواست را در منبع رسمی بررسی کن.',
      lifeNoTitle: 'närståendepenning مسیر اول مناسب در این وضعیت نیست', lifeNoBody: 'نیاز روزمره به کمک یا نیاز ناشی از سالمندی به‌تنهایی همان وضعیت تهدیدکننده زندگی نیست. این به معنی نبودن حمایت‌های دیگر نیست.',
      lifeUnsureTitle: 'پیش از ادامه مسیر غرامت، وضعیت پزشکی را روشن کن', lifeUnsureBody: 'از خدمات درمانی بپرس آیا وضعیت با شرایط Försäkringskassan همخوانی دارد. اگر فرد سالمند، طولانی‌مدت بیمار یا دارای معلولیت است، مسیر جداگانه حمایت شهرداری از مراقبان وجود دارد.',
      foregoNoTitle: 'غرامت نقدی و حمایت از مراقب دو مسیر جدا هستند', foregoNoBody: 'närståendepenning به صرف‌نظر کردن از کار یا بعضی مزایا مرتبط است. اگر چنین نیست، پایلوت نباید وعده پرداخت نقدی بدهد. حمایت شهرداری از مراقبان یک مسیر جداست.',
      foregoUnsureTitle: 'مشخص کن از چه زمان یا مزایایی صرف‌نظر می‌کنی', foregoUnsureBody: 'این موضوع می‌تواند مسیر närståendepenning را تغییر دهد. پیش از درخواست، زمان کار یا مزایا را بررسی کن.',
      municipalTitle: 'حمایت شهرداری از مراقبان یک مسیر جداگانه و قابل پیگیری است', municipalBody: 'قانون فعلی خدمات اجتماعی می‌گوید کمیته خدمات اجتماعی باید اطلاعات، راهنمایی یا حمایت دیگر و نیز یک رابط حمایتی به کسی که از فرد سالمند یا طولانی‌مدت بیمار مراقبت می‌کند یا از فرد دارای معلولیت حمایت می‌کند ارائه دهد. با شهرداری خود تماس بگیر و درباره حمایت از نزدیکان یا رابط حمایتی بپرس. پایلوت نباید نوع دقیق خدمت محلی را حدس بزند.',
      municipalUnsureTitle: 'مسیر حمایت شهرداری را روشن کن', municipalUnsureBody: 'اگر مطمئن نیستی این دسته قانونی شامل وضعیت می‌شود، با خدمات اجتماعی یا واحد حمایت از نزدیکان شهرداری تماس بگیر. پایلوت ارزیابی محلی انجام نمی‌دهد و اقدام مشخصی را تضمین نمی‌کند.',
      municipalNoTitle: 'هنوز روشن نیست دسته خاص حمایت از نزدیکان شامل وضعیت می‌شود', municipalNoBody: 'پایلوت نباید فرض کند قاعده رابط حمایتی اعمال می‌شود و نباید وعده پرداخت نقدی بدهد. همچنان می‌توانی برای پیدا کردن مسیر درست با شهرداری یا 1177 تماس بگیری.',
      representationTitle: 'نسبت خانوادگی به‌خودی‌خود اختیار نمایندگی ایجاد نمی‌کند',
      representationBody: 'این‌که نزدیک یا عضو خانواده هستی به‌تنهایی به این معنی نیست که می‌توانی به جای شخص امضا کنی، درخواست بدهی یا تصمیم بگیری. در پرونده‌های اداری ممکن است مرجع مسئول اختیار نماینده و حدود وکالت را بررسی کند. مسیر فعلی همان سازمان و حدود وکالت برای همان پرونده را پیش از اقدام بررسی کن.',
      representationCareTitle: 'کمک در تماس با درمان با اختیار تصمیم‌گیری درمانی یکسان نیست',
      representationCareBody: '1177 توضیح می‌دهد که وکالت می‌تواند برای بعضی تماس‌های درمانی به نزدیکان کمک کند، اما به‌خودی‌خود حق تصمیم‌گیری یا رضایت به اقدامات درمانی را نمی‌دهد. روند فعلی ارائه‌دهنده درمان را بررسی کن.',
      sourceFk: 'Försäkringskassan: حمایت از فرد بسیار بیمار', sourceFkPower: 'Försäkringskassan: وکالت برای نماینده', sourceAdminLaw: 'پارلمان سوئد: قانون اداری §§۱۴–۱۵', sourceSol: 'پارلمان سوئد: قانون خدمات اجتماعی، فصل ۱۳ ماده ۹', sourceGuide: '1177: حمایت از نزدیکان و راه تماس', sourceCareRelative: '1177: نزدیکان در درمان و وکالت',
    },
  };

  function normalize(text) { return String(text || '').normalize('NFKC').trim(); }
  function safeLang(value) { return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function anyMatch(patterns, text) { return patterns.some((pattern) => pattern.test(text)); }
  function detectContext(text) {
    const value = normalize(text);
    if (!value) return null;
    if (anyMatch(REPRESENTATION_PATTERNS, value) && !anyMatch(PROFESSIONAL_REP_PATTERNS, value)) return 'representation';
    if (anyMatch(DIRECT_PATTERNS, value)) return 'near_relative_benefit';
    if (anyMatch(SERIOUS_PATTERNS, value) && anyMatch(RELATION_PATTERNS, value)) return 'near_relative_benefit';
    if (anyMatch(MUNICIPAL_DIRECT_PATTERNS, value)) return 'municipal_support';
    if (anyMatch(CARE_ACTION_PATTERNS, value) && anyMatch(RELATION_PATTERNS, value) && anyMatch(MUNICIPAL_SCOPE_PATTERNS, value)) return 'municipal_support';
    return null;
  }
  function detect(text) { return Boolean(detectContext(text)); }
  function handoffHref(language, context) {
    const lang = safeLang(language);
    const safeContext = CONTEXTS.has(context) ? context : null;
    const suffix = safeContext ? `&care_context=${encodeURIComponent(safeContext)}` : '';
    return `person-pilot.html?actor_type=relative&focus=relative_care&lang=${encodeURIComponent(lang)}${suffix}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;
    const enhance = () => {
      const context = detectContext(input.value);
      if (!context || box.hidden) return;
      if (box.querySelector('[data-relative-care-route="true"]')) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.relativeCareRoute = 'true';
      link.href = handoffHref(lang, context);
      const text = doc.createElement('span');
      const title = doc.createElement('strong');
      title.textContent = context === 'representation' ? copy.shellRepresentationTitle : context === 'municipal_support' ? copy.shellMunicipalTitle : copy.shellBenefitTitle;
      const sub = doc.createElement('small');
      sub.textContent = context === 'representation' ? copy.shellRepresentationSub : context === 'municipal_support' ? copy.shellMunicipalSub : copy.shellBenefitSub;
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
    if (String(params.get('focus') || '').toLowerCase() !== 'relative_care') return;
    if (doc.getElementById('relativeCareGuidance')) return;
    const main = doc.getElementById('main');
    if (!main || !main.parentNode) return;
    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const context = CONTEXTS.has(params.get('care_context')) ? params.get('care_context') : null;
    const section = doc.createElement('section');
    section.id = 'relativeCareGuidance';
    section.className = 'card';
    section.setAttribute('aria-labelledby', 'relativeCareTitle');
    main.parentNode.insertBefore(section, main);
    const state = { life: null, forego: null, scope: null };

    function choice(label, value, group) {
      const el = doc.createElement('button');
      el.type = 'button';
      el.className = 'choice';
      el.textContent = label;
      el.setAttribute('aria-pressed', String(state[group] === value));
      el.addEventListener('click', () => {
        state[group] = value;
        if (group === 'life') { state.forego = null; state.scope = null; }
        if (group === 'forego') state.scope = null;
        render();
      });
      return el;
    }
    function result(titleText, bodyText, sources) {
      const box = doc.createElement('div');
      box.className = 'notice';
      box.setAttribute('role', 'status');
      const title = doc.createElement('strong');
      title.textContent = titleText;
      const body = doc.createElement('p');
      body.textContent = bodyText;
      body.style.marginBottom = '8px';
      box.append(title, body);
      sources.forEach(([href, label]) => appendSource(doc, box, href, label));
      return box;
    }
    function group(label, key) {
      const wrap = doc.createElement('div');
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', label);
      wrap.append(choice(copy.yes, 'yes', key), choice(copy.no, 'no', key), choice(copy.unsure, 'unsure', key));
      return wrap;
    }
    function municipalResult() {
      return result(copy.municipalTitle, copy.municipalBody, [[SOL_URL, copy.sourceSol], [CARE_GUIDE_URL, copy.sourceGuide]]);
    }
    function representationResult() {
      const wrap = doc.createElement('div');
      wrap.append(
        result(copy.representationTitle, copy.representationBody, [[ADMIN_LAW_URL, copy.sourceAdminLaw], [FK_POWER_URL, copy.sourceFkPower]]),
        result(copy.representationCareTitle, copy.representationCareBody, [[CARE_RELATIVE_URL, copy.sourceCareRelative]])
      );
      return wrap;
    }
    function scopeStep(prefixTitle, prefixBody) {
      if (prefixTitle) section.append(result(prefixTitle, prefixBody, [[FK_URL, copy.sourceFk]]));
      const q = doc.createElement('h3'); q.textContent = copy.qScope; q.style.marginTop = '14px';
      section.append(q, group(copy.qScope, 'scope'));
      if (state.scope === 'yes') section.append(municipalResult());
      if (state.scope === 'unsure') section.append(result(copy.municipalUnsureTitle, copy.municipalUnsureBody, [[SOL_URL, copy.sourceSol], [CARE_GUIDE_URL, copy.sourceGuide]]));
      if (state.scope === 'no') section.append(result(copy.municipalNoTitle, copy.municipalNoBody, [[CARE_GUIDE_URL, copy.sourceGuide]]));
    }
    function render() {
      section.replaceChildren();
      const eyebrow = doc.createElement('div'); eyebrow.className = 'eyebrow'; eyebrow.textContent = copy.eyebrow;
      const title = doc.createElement('h2'); title.id = 'relativeCareTitle'; title.textContent = context === 'representation' ? copy.titleRepresentation : context === 'municipal_support' ? copy.titleMunicipal : copy.titleBenefit;
      const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = copy.intro;
      section.append(eyebrow, title, intro);

      if (context === 'representation') {
        section.append(representationResult());
        return;
      }

      if (context === 'municipal_support') {
        section.append(municipalResult());
        return;
      }

      const q1 = doc.createElement('h3'); q1.textContent = copy.qLife;
      section.append(q1, group(copy.qLife, 'life'));
      if (state.life === 'no') { scopeStep(copy.lifeNoTitle, copy.lifeNoBody); return; }
      if (state.life === 'unsure') {
        section.append(result(copy.lifeUnsureTitle, copy.lifeUnsureBody, [[FK_URL, copy.sourceFk], [SOL_URL, copy.sourceSol]]));
        return;
      }
      if (state.life !== 'yes') return;
      const q2 = doc.createElement('h3'); q2.textContent = copy.qForego; q2.style.marginTop = '14px';
      section.append(q2, group(copy.qForego, 'forego'));
      if (state.forego === 'yes') section.append(result(copy.likelyTitle, copy.likelyBody, [[FK_URL, copy.sourceFk]]));
      if (state.forego === 'no') scopeStep(copy.foregoNoTitle, copy.foregoNoBody);
      if (state.forego === 'unsure') section.append(result(copy.foregoUnsureTitle, copy.foregoUnsureBody, [[FK_URL, copy.sourceFk]]));
    }
    render();
  }

  function init(win) { addShellHandoff(win); addPersonGuidance(win); }
  return { detect, detectContext, safeLang, handoffHref, init };
});
