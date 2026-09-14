(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODWorkInjuryDental = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const FK_URL = 'https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/arbetsskada/ersattning-for-sjukvard-tandvard-eller-hjalpmedel-vid-arbetsskada';
  const FK_EGEN_URL = 'https://www.forsakringskassan.se/privatperson/foretagare/egenanstalld';
  const AFA_URL = 'https://www.afaforsakring.se/forsakring/arbetsskadeforsakring';
  const FORA_URL = 'https://www.fora.se/ms-foretag-inlogg';
  const ORDINARY_DENTAL_URL = 'quick-help.html?mode=dental';

  const DENTAL = [
    /\btand(?:en|er|skada|olycka|läkare|vård)?\b/i,
    /أسنان|سن(?:ي|اً)?|طبيب\s*الأسنان/i,
    /دندان|دندانپزشک|آسیب\s*دندان/i,
  ];
  const INJURY = [
    /\b(?:skad|slog|slag|olyck|raml|föll|krock|krasch|bröt|sprack|slant)\w*/i,
    /إصاب|حادث|سقط|اصطدم|انكسر/i,
    /آسیب|حادثه|افتاد|تصادف|شکست/i,
  ];
  const WORK = [
    /\b(?:på\s+jobbet|i\s+jobbet|på\s+arbetsplatsen|i\s+arbetet|under\s+arbetet|när\s+jag\s+jobbade|i\s+verksamheten|under\s+ett\s+uppdrag|på\s+väg\s+till\s+jobbet|på\s+väg\s+från\s+jobbet|till\s+eller\s+från\s+arbetet)\b/i,
    /في\s+العمل|أثناء\s+العمل|في\s+مكان\s+العمل|أثناء\s+مهمة|في\s+الطريق\s+إلى\s+العمل|في\s+الطريق\s+من\s+العمل/i,
    /سر\s+کار|در\s+محل\s+کار|هنگام\s+کار|حین\s+ماموریت|در\s+راه\s+کار|در\s+مسیر\s+کار/i,
  ];
  const DIRECT = [
    /\b(?:tandskada|tandolycka).{0,35}(?:jobb|arbete|arbetsplats)/i,
    /\b(?:jobb|arbete|arbetsplats).{0,35}(?:tandskada|tandolycka)/i,
    /\b(?:slog|skadade|bröt|spräckte).{0,24}tand.{0,28}(?:jobb|arbete|arbetsplats)/i,
    /إصابة\s+أسنان.{0,30}(?:العمل|الوظيفة)|(?:العمل|الوظيفة).{0,30}إصابة\s+أسنان/i,
    /آسیب\s+دندان.{0,30}(?:کار|محل\s+کار)|(?:کار|محل\s+کار).{0,30}آسیب\s+دندان/i,
  ];
  const INVOICED_WORKER = [
    /\begenanställd\b/i,
    /\bfakturerings(?:företag|bolag)\w*\b/i,
    /\bfakturerar\b.{0,35}\b(?:via|genom)\b.{0,35}\bfakturerings(?:företag|bolag)\w*\b/i,
    /شركة\s+(?:فواتير|فوترة)|أعمل\s+عبر\s+شركة\s+(?:فواتير|فوترة)/i,
    /شرکت\s+(?:صدور\s+فاکتور|فاکتورینگ)|از\s+طریق\s+شرکت.{0,20}فاکتور/i,
  ];
  const SELF_EMPLOYED = [
    /\bdriver\s+eget\b/i,
    /\b(?:mitt\s+)?eget\s+(?:företag|aktiebolag|bolag)\b/i,
    /\begenföretag(?:are)?\b/i,
    /\benskild\s+firma\b/i,
    /أعمل\s+لحسابي|أدير\s+شركتي|صاحب\s+(?:شركة|عمل)/i,
    /خوداشتغال|کسب\s*و\s*کار\s+خودم|شرکت\s+خودم|صاحب\s+کسب\s*و\s*کار/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Tandskada på jobbet eller arbetsresan',
      shellSub: 'Skilj arbetsskadeersättning från vanlig tandvård och andra försäkringar',
      eyebrow: 'Arbetsskada & tandvård',
      title: 'En tandskada kan ha flera ersättningsvägar – håll dem isär',
      intro: 'Vi frågar bara sådant som kan ändra vägen. Dina svar stannar i den här sidan och skickas inte med i anonym feedback.',
      qWhere: 'Var uppstod skadan?',
      atWork: 'På jobbet / i arbetet',
      commute: 'På väg till eller från jobbet',
      other: 'Någon annanstans',
      unsure: 'Osäker',
      qTraffic: 'Var händelsen på arbetsresan en trafikolycka?',
      yes: 'Ja', no: 'Nej',
      qTreatment: 'Är tandbehandlingen nödvändig på grund av just den här skadan?',
      qDocs: 'Har du kostnadsförslag, kvitto eller faktura och kan du bekräfta att tandläkaren är ansluten till Försäkringskassan?',
      both: 'Ja, båda delarna',
      missing: 'Nej, något saknas',
      whereOtherTitle: 'Tvinga inte in skadan i arbetsskadespåret',
      whereOtherBody: 'Försäkringskassans särskilda kostnadsväg gäller skador eller sjukdomar som uppstått på grund av arbetet eller på väg till eller från arbetet. Kontrollera vanlig tandvård eller annan olycksfallsförsäkring i stället om sambandet med arbetet saknas.',
      whereUnsureTitle: 'Klargör sambandet med arbetet först',
      whereUnsureBody: 'Ta reda på om händelsen inträffade i arbetet eller på den normala resan till eller från arbetet. Piloten ska inte avgöra arbetsskada enbart från att du arbetar.',
      treatmentNoTitle: 'Tandvården behöver ha samband med arbetsskadan',
      treatmentNoBody: 'Försäkringskassan anger att behandlingen ska vara nödvändig på grund av arbetsskadan. Om behandlingen gäller något annat ska denna specialväg inte prioriteras; vanlig tandvård kan fortfarande vara relevant.',
      treatmentUnsureTitle: 'Be tandläkaren klargöra behandlingssambandet',
      treatmentUnsureBody: 'Kontrollera om behandlingen dokumenteras som nödvändig på grund av skadan innan du drar slutsats om just arbetsskadeersättning för tandvård.',
      docsMissingTitle: 'Samla underlaget innan du förväntar dig en prövning',
      docsMissingBody: 'Försäkringskassan anger kostnadsunderlag och ansluten tandläkare som villkor. Be om kostnadsförslag, kvitto eller faktura och fråga tandläkaren om anslutningen.',
      docsUnsureTitle: 'Verifiera underlag och tandläkarens anslutning',
      docsUnsureBody: 'Kontrollera båda delarna innan ansökan. Exakt kostnad ska inte behöva lämnas till denna pilot.',
      candidateTitle: 'Försäkringskassans arbetsskadeväg är relevant att kontrollera',
      candidateBody: 'När skadan har samband med arbetet eller arbetsresan, behandlingen behövs på grund av skadan och underlagen finns kan du kontrollera den aktuella Försäkringskassevägen. Ersättningen är inte automatiskt hela klinikpriset; referenspriser kan begränsa beloppet och Försäkringskassan gör den individuella bedömningen.',
      trafficTitle: 'Trafikolycka på arbetsresan har en separat försäkringsgräns',
      trafficBody: 'Afa anger att deras kollektivavtalade arbetsskadeförsäkring inte gäller vid trafikolycksfall på väg till eller från arbetet; då hänvisar Afa till trafikförsäkringen. Det ändrar inte automatiskt Försäkringskassans separata prövning av tandvårdskostnaden.',
      afaTitle: 'Kollektivavtalad försäkring är en separat möjlig väg',
      afaBody: 'Afa kan vara relevant vid arbetsskada beroende på anställning och kollektivavtal. Det är inte samma beslut som Försäkringskassans ersättning för tandvårdskostnad och kräver inte i sig fackmedlemskap.',
      fkSource: 'Försäkringskassan: tandvårdskostnad vid arbetsskada',
      afaSource: 'Afa Försäkring: arbetsskadeförsäkring',
      dentalLink: 'Vanlig tandvård – separat väg',
    },
    ar: {
      shellTitle: 'إصابة في الأسنان في العمل أو في طريق العمل', shellSub: 'افصل تعويض إصابة العمل عن دعم الأسنان والتأمينات الأخرى',
      eyebrow: 'إصابة العمل والأسنان', title: 'قد تكون لإصابة الأسنان عدة مسارات للتعويض – لا تخلط بينها',
      intro: 'نسأل فقط ما يمكن أن يغيّر المسار. إجاباتك تبقى في هذه الصفحة ولا تُرسل ضمن الملاحظات المجهولة.',
      qWhere: 'أين حدثت الإصابة؟', atWork: 'في العمل', commute: 'في الطريق إلى العمل أو منه', other: 'في مكان آخر', unsure: 'غير متأكد',
      qTraffic: 'هل كان الحادث أثناء طريق العمل حادثاً مرورياً؟', yes: 'نعم', no: 'لا',
      qTreatment: 'هل علاج الأسنان ضروري بسبب هذه الإصابة تحديداً؟',
      qDocs: 'هل لديك عرض تكلفة أو إيصال أو فاتورة ويمكنك التأكد من أن طبيب الأسنان متصل بـ Försäkringskassan؟',
      both: 'نعم، كلا الأمرين', missing: 'لا، ينقص شيء',
      whereOtherTitle: 'لا تُجبر الحالة على مسار إصابة العمل', whereOtherBody: 'مسار Försäkringskassan الخاص بالتكاليف يتعلق بإصابة أو مرض نشأ بسبب العمل أو في الطريق إلى العمل أو منه. إذا لم توجد صلة بالعمل فتحقق من دعم الأسنان العادي أو تأمين حادث آخر.',
      whereUnsureTitle: 'وضّح صلة الحادث بالعمل أولاً', whereUnsureBody: 'تحقق هل وقع الحادث أثناء العمل أو في الطريق المعتاد إلى العمل أو منه. العمل بحد ذاته لا يثبت أن الحالة إصابة عمل.',
      treatmentNoTitle: 'يجب أن يكون علاج الأسنان مرتبطاً بإصابة العمل', treatmentNoBody: 'تذكر Försäkringskassan أن العلاج يجب أن يكون ضرورياً بسبب إصابة العمل. إذا كان العلاج لسبب آخر فلا تعطِ هذا المسار أولوية تلقائياً.',
      treatmentUnsureTitle: 'اطلب من طبيب الأسنان توضيح صلة العلاج بالإصابة', treatmentUnsureBody: 'تحقق من توثيق أن العلاج ضروري بسبب الإصابة قبل استنتاج أن مسار تعويض إصابة العمل ينطبق.',
      docsMissingTitle: 'اجمع المستندات قبل توقع قرار', docsMissingBody: 'تطلب Försäkringskassan مستنداً يوضح التكلفة وأن يكون طبيب الأسنان متصلاً بها. اطلب عرض تكلفة أو إيصالاً أو فاتورة وتحقق من الاتصال.',
      docsUnsureTitle: 'تحقق من المستندات واتصال طبيب الأسنان', docsUnsureBody: 'تحقق من الأمرين قبل التقديم. لا تحتاج إلى إدخال التكلفة الدقيقة في هذه التجربة.',
      candidateTitle: 'من المناسب التحقق من مسار Försäkringskassan لإصابة العمل', candidateBody: 'إذا ارتبطت الإصابة بالعمل أو طريق العمل وكان العلاج ضرورياً بسببها وتوفرت المستندات، فتحقق من المسار الحالي لدى Försäkringskassan. التعويض ليس بالضرورة كامل سعر العيادة، وتقوم الجهة بالتقييم الفردي.',
      trafficTitle: 'الحادث المروري في طريق العمل له حد تأميني منفصل', trafficBody: 'توضح Afa أن تأمين إصابة العمل التعاقدي لديها لا ينطبق على حادث مروري في الطريق إلى العمل أو منه؛ وتشير عندها إلى تأمين المرور. هذا لا يحسم تلقائياً تقييم Försäkringskassan المنفصل لتكلفة الأسنان.',
      afaTitle: 'التأمين التعاقدي مسار منفصل محتمل', afaBody: 'قد تكون Afa ذات صلة بحسب الوظيفة والاتفاقية الجماعية. هذا ليس نفس قرار Försäkringskassan بشأن تكلفة الأسنان، وعضوية النقابة ليست الشرط بحد ذاتها.',
      fkSource: 'Försäkringskassan: تكلفة الأسنان عند إصابة العمل', afaSource: 'Afa Försäkring: تأمين إصابة العمل', dentalLink: 'علاج الأسنان العادي – مسار منفصل',
    },
    fa: {
      shellTitle: 'آسیب دندان در کار یا مسیر کار', shellSub: 'جبران خسارت ناشی از کار را از حمایت عادی دندان و بیمه‌های دیگر جدا نگه دار',
      eyebrow: 'آسیب کاری و دندان', title: 'آسیب دندان می‌تواند چند مسیر جبران داشته باشد – آن‌ها را یکی نکن',
      intro: 'فقط چیزهایی را می‌پرسیم که می‌توانند مسیر را عوض کنند. پاسخ‌ها در همین صفحه می‌مانند و در بازخورد ناشناس ارسال نمی‌شوند.',
      qWhere: 'آسیب کجا رخ داد؟', atWork: 'در محل کار / هنگام کار', commute: 'در راه رفتن به کار یا برگشت از کار', other: 'جای دیگر', unsure: 'مطمئن نیستم',
      qTraffic: 'آیا حادثه در مسیر کار یک تصادف ترافیکی بود؟', yes: 'بله', no: 'خیر',
      qTreatment: 'آیا درمان دندان به‌طور مشخص به خاطر همین آسیب لازم است؟',
      qDocs: 'آیا برآورد هزینه، رسید یا فاکتور داری و می‌توانی تأیید کنی دندانپزشک به Försäkringskassan متصل است؟',
      both: 'بله، هر دو', missing: 'خیر، چیزی کم است',
      whereOtherTitle: 'این وضعیت را به زور در مسیر آسیب کاری قرار نده', whereOtherBody: 'مسیر هزینه Försäkringskassan برای آسیب یا بیماری ناشی از کار یا مسیر رفت‌وبرگشت کار است. اگر ارتباطی با کار نیست، حمایت عادی دندان یا بیمه حادثه دیگری را بررسی کن.',
      whereUnsureTitle: 'ابتدا ارتباط حادثه با کار را روشن کن', whereUnsureBody: 'روشن کن حادثه هنگام کار یا در مسیر معمول رفت‌وبرگشت رخ داده است. صرف شاغل بودن اثبات آسیب کاری نیست.',
      treatmentNoTitle: 'درمان دندان باید با آسیب کاری مرتبط باشد', treatmentNoBody: 'Försäkringskassan می‌گوید درمان باید به علت آسیب کاری لازم باشد. اگر درمان علت دیگری دارد این مسیر تخصصی را خودکار در اولویت نگذار.',
      treatmentUnsureTitle: 'از دندانپزشک بخواه ارتباط درمان با آسیب را روشن کند', treatmentUnsureBody: 'پیش از نتیجه‌گیری درباره جبران هزینه آسیب کاری، بررسی کن درمان به‌عنوان درمان لازم ناشی از آسیب مستند شده است.',
      docsMissingTitle: 'پیش از انتظار بررسی، مدارک را جمع کن', docsMissingBody: 'Försäkringskassan مدرک هزینه و دندانپزشک متصل را شرط می‌داند. برآورد هزینه، رسید یا فاکتور بگیر و درباره اتصال دندانپزشک سؤال کن.',
      docsUnsureTitle: 'مدارک و اتصال دندانپزشک را تأیید کن', docsUnsureBody: 'هر دو را پیش از درخواست بررسی کن. لازم نیست مبلغ دقیق را در این پایلوت وارد کنی.',
      candidateTitle: 'مسیر آسیب کاری Försäkringskassan ارزش بررسی دارد', candidateBody: 'اگر آسیب با کار یا مسیر کار مرتبط است، درمان به علت همان آسیب لازم است و مدارک آماده است، مسیر جاری Försäkringskassan را بررسی کن. جبران الزاماً کل قیمت کلینیک نیست و ارزیابی فردی انجام می‌شود.',
      trafficTitle: 'تصادف ترافیکی در مسیر کار مرز بیمه‌ای جداگانه دارد', trafficBody: 'Afa می‌گوید بیمه جمعی آسیب کاری آن برای تصادف ترافیکی در مسیر رفت‌وبرگشت کار اعمال نمی‌شود و در این حالت به بیمه ترافیک ارجاع می‌دهد. این موضوع ارزیابی جداگانه Försäkringskassan درباره هزینه دندان را خودکار تعیین نمی‌کند.',
      afaTitle: 'بیمه جمعی یک مسیر احتمالی جداست', afaBody: 'Afa بسته به نوع استخدام و قرارداد جمعی می‌تواند مرتبط باشد. این همان تصمیم Försäkringskassan درباره هزینه دندان نیست و عضویت در اتحادیه به‌تنهایی شرط آن نیست.',
      fkSource: 'Försäkringskassan: هزینه دندان در آسیب کاری', afaSource: 'Afa Försäkring: بیمه آسیب کاری', dentalLink: 'دندانپزشکی عادی – مسیر جدا',
    },
  };

  const CONTEXT_COPY = {
    sv: {
      selfContext: 'Du beskrev dig som egenföretagare. Försäkringskassans kostnadsväg och företagets försäkringar är separata lager.',
      invoicedContext: 'Du beskrev arbete via ett faktureringsföretag. Försäkringskassan beskriver faktureringsföretaget som arbetsgivare under tiden du använder det.',
      qFora: 'Har företaget ett aktuellt försäkringsavtal eller grundavtal hos Fora?',
      foraYesTitle: 'TFA kan vara en separat väg att kontrollera',
      foraYesBody: 'Fora anger att en företagare kan omfattas av TFA genom företagets försäkringsavtal. Kontrollera att avtalet är aktuellt och vilken personkategori du tillhör. Det avgör inte Försäkringskassans separata prövning.',
      foraNoTitle: 'Utgå inte från TFA utan avtalsgrund',
      foraNoBody: 'Företagande i sig bevisar inte TFA. Håll Försäkringskassans arbetsskadeväg öppen för separat kontroll och se över andra företags- eller olycksfallsförsäkringar för sig.',
      foraUnsureTitle: 'Verifiera Fora-avtalet innan du räknar med eller avfärdar TFA',
      foraUnsureBody: 'Kontrollera om företaget har ett aktuellt försäkringsavtal eller grundavtal hos Fora. Du behöver inte lämna företagsnamn eller avtalsnummer i piloten.',
      invoicedTitle: 'Egenanställd via faktureringsföretag är inte samma sak som egenföretagare',
      invoicedBody: 'Försäkringskassan anger att faktureringsföretaget har arbetsgivaransvaret under tiden du använder det. Det gör inte TFA, Afa eller annan försäkring automatisk; faktisk försäkrings- eller kollektivavtalstäckning måste kontrolleras separat.',
      fkEgenSource: 'Försäkringskassan: egenanställd och faktureringsföretag',
      foraSource: 'Fora: företag utan anställda och TFA',
    },
    ar: {
      selfContext: 'وصفت نفسك كصاحب عمل. مسار تكاليف Försäkringskassan وتأمينات الشركة طبقتان منفصلتان.',
      invoicedContext: 'وصفت عملاً عبر شركة فوترة. توضح Försäkringskassan أن شركة الفوترة تتحمل مسؤولية صاحب العمل أثناء استخدامك لها.',
      qFora: 'هل لدى الشركة حالياً اتفاق تأمين أو اتفاق أساسي مع Fora؟',
      foraYesTitle: 'قد يكون TFA مساراً منفصلاً يستحق التحقق',
      foraYesBody: 'توضح Fora أن صاحب العمل قد يشمله TFA عبر اتفاق تأمين الشركة. تحقق من أن الاتفاق ساري ومن فئتك. هذا لا يحسم تقييم Försäkringskassan المنفصل.',
      foraNoTitle: 'لا تفترض وجود TFA من مجرد امتلاك شركة',
      foraNoBody: 'امتلاك شركة وحده لا يثبت TFA. أبقِ مسار Försäkringskassan متاحاً للتحقق المنفصل وافحص أي تأمين شركة أو حوادث آخر بشكل مستقل.',
      foraUnsureTitle: 'تحقق من اتفاق Fora قبل الاعتماد على TFA أو استبعاده',
      foraUnsureBody: 'تحقق هل لدى الشركة اتفاق تأمين أو اتفاق أساسي ساري مع Fora. لا حاجة لإدخال اسم الشركة أو رقم الاتفاق في التجربة.',
      invoicedTitle: 'العمل عبر شركة فوترة ليس هو نفسه العمل كصاحب شركة',
      invoicedBody: 'توضح Försäkringskassan أن شركة الفوترة تتحمل مسؤولية صاحب العمل أثناء استخدامها. هذا لا يجعل TFA أو Afa أو أي تأمين آخر تلقائياً؛ يجب التحقق من التغطية الفعلية بشكل منفصل.',
      fkEgenSource: 'Försäkringskassan: العمل عبر شركة فوترة',
      foraSource: 'Fora: شركة بلا موظفين وTFA',
    },
    fa: {
      selfContext: 'خودت را صاحب کسب‌وکار توصیف کردی. مسیر هزینه Försäkringskassan و بیمه‌های شرکت دو لایه جدا هستند.',
      invoicedContext: 'گفتی از طریق شرکت صدور فاکتور کار می‌کنی. Försäkringskassan آن شرکت را هنگام استفاده از آن در جایگاه کارفرما توضیح می‌دهد.',
      qFora: 'آیا شرکت اکنون قرارداد بیمه یا قرارداد پایه با Fora دارد؟',
      foraYesTitle: 'TFA می‌تواند مسیر جداگانه‌ای برای بررسی باشد',
      foraYesBody: 'Fora می‌گوید صاحب کسب‌وکار می‌تواند از طریق قرارداد بیمه شرکت تحت TFA باشد. جاری بودن قرارداد و دسته فرد را بررسی کن. این موضوع ارزیابی جداگانه Försäkringskassan را تعیین نمی‌کند.',
      foraNoTitle: 'صرف صاحب کسب‌وکار بودن را دلیل TFA ندان',
      foraNoBody: 'داشتن کسب‌وکار به‌تنهایی TFA را ثابت نمی‌کند. مسیر Försäkringskassan را برای بررسی جداگانه باز نگه دار و بیمه‌های دیگر شرکت یا حوادث را جدا بررسی کن.',
      foraUnsureTitle: 'پیش از حساب کردن روی TFA یا رد آن، قرارداد Fora را بررسی کن',
      foraUnsureBody: 'بررسی کن آیا شرکت قرارداد بیمه یا قرارداد پایه جاری با Fora دارد. نیازی نیست نام شرکت یا شماره قرارداد را در این پایلوت وارد کنی.',
      invoicedTitle: 'کار از طریق شرکت صدور فاکتور همان خوداشتغالیِ صاحب کسب‌وکار نیست',
      invoicedBody: 'Försäkringskassan می‌گوید شرکت صدور فاکتور هنگام استفاده از آن مسئولیت کارفرما را دارد. این موضوع TFA، Afa یا بیمه دیگر را خودکار نمی‌کند؛ پوشش واقعی باید جداگانه بررسی شود.',
      fkEgenSource: 'Försäkringskassan: کار از طریق شرکت صدور فاکتور',
      foraSource: 'Fora: شرکت بدون کارمند و TFA',
    },
  };

  function safeLang(value) { return ['sv', 'ar', 'fa'].includes(value) ? value : 'sv'; }
  function any(patterns, text) { return patterns.some((re) => re.test(text)); }
  function detect(text) {
    const value = String(text || '');
    return any(DIRECT, value) || (any(DENTAL, value) && any(INJURY, value) && any(WORK, value));
  }
  function detectWorkContext(text) {
    const value = String(text || '');
    if (any(INVOICED_WORKER, value)) return 'invoiced_worker';
    if (any(SELF_EMPLOYED, value)) return 'self_employed';
    return 'employee';
  }
  function handoffHref(language, context) {
    const lang = safeLang(language);
    if (context === 'self_employed') return `person-pilot.html?actor_type=self_employed&focus=work_injury_dental&work_context=self_employed&lang=${encodeURIComponent(lang)}`;
    if (context === 'invoiced_worker') return `person-pilot.html?actor_type=employee&focus=work_injury_dental&work_context=invoiced_worker&lang=${encodeURIComponent(lang)}`;
    return `person-pilot.html?actor_type=employee&focus=work_injury_dental&lang=${encodeURIComponent(lang)}`;
  }

  function addShellHandoff(win) {
    const doc = win.document;
    const input = doc.getElementById('situation');
    const button = doc.getElementById('analyzeBtn');
    const box = doc.getElementById('engineResults');
    if (!input || !button || !box) return;

    function enhance() {
      const existing = box.querySelector('[data-stod-work-injury-dental]');
      if (existing) existing.remove();
      if (!detect(input.value)) return;
      const lang = safeLang(doc.documentElement.lang);
      const copy = COPY[lang];
      const context = detectWorkContext(input.value);
      const link = doc.createElement('a');
      link.className = 'route';
      link.dataset.stodWorkInjuryDental = 'true';
      link.href = handoffHref(lang, context);
      const text = doc.createElement('span');
      const title = doc.createElement('strong'); title.textContent = copy.shellTitle;
      const sub = doc.createElement('small'); sub.textContent = copy.shellSub;
      text.append(title, sub);
      const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
      link.append(text, arrow);
      box.insertBefore(link, box.querySelector('a.route') || null);
      box.dataset.primaryRoute = 'work_injury_dental';
    }

    button.addEventListener('click', () => win.setTimeout(enhance, 0));
    input.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') win.setTimeout(enhance, 0);
    });
  }

  function button(doc, label, pressed, onClick) {
    const el = doc.createElement('button');
    el.type = 'button';
    el.className = 'choice';
    el.textContent = label;
    el.setAttribute('aria-pressed', String(pressed));
    el.addEventListener('click', onClick);
    return el;
  }
  function source(doc, parent, label, href) {
    const a = doc.createElement('a');
    a.className = 'source';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    parent.appendChild(a);
  }
  function result(doc, title, body) {
    const card = doc.createElement('div'); card.className = 'result';
    const h = doc.createElement('h3'); h.textContent = title;
    const p = doc.createElement('p'); p.textContent = body;
    card.append(h, p);
    return card;
  }

  function addPersonGuidance(win) {
    const doc = win.document;
    const params = new URLSearchParams(win.location.search);
    if (String(params.get('focus') || '').toLowerCase() !== 'work_injury_dental') return;
    if (doc.getElementById('workInjuryDentalGuidance')) return;
    const main = doc.getElementById('main');
    if (!main) return;
    const lang = safeLang(params.get('lang') || doc.documentElement.lang);
    const copy = COPY[lang];
    const contextCopy = CONTEXT_COPY[lang];
    const boundedContext = String(params.get('work_context') || '').toLowerCase();
    const actorType = String(params.get('actor_type') || '').toLowerCase();
    const workContext = boundedContext === 'self_employed' || boundedContext === 'invoiced_worker'
      ? boundedContext
      : (actorType === 'self_employed' ? 'self_employed' : 'employee');
    doc.documentElement.lang = lang;
    if (lang === 'ar' || lang === 'fa') {
      doc.documentElement.dir = 'rtl';
      doc.body && doc.body.classList.add('rtl');
    }

    const section = doc.createElement('section');
    section.id = 'workInjuryDentalGuidance';
    section.className = 'card';
    section.setAttribute('data-local-only', 'true');
    section.dataset.workContext = workContext;
    const state = { where: null, traffic: null, treatment: null, docs: null, foraAgreement: null };

    function q(title, group, options) {
      const wrap = doc.createElement('div'); wrap.className = 'finalq';
      const b = doc.createElement('b'); b.textContent = title; wrap.appendChild(b);
      options.forEach(([value, label]) => wrap.appendChild(button(doc, label, state[group] === value, () => {
        state[group] = value;
        if (group === 'where') {
          state.traffic = null; state.treatment = null; state.docs = null; state.foraAgreement = null;
        } else if (group === 'traffic') {
          state.treatment = null; state.docs = null; state.foraAgreement = null;
        } else if (group === 'treatment') {
          state.docs = null; state.foraAgreement = null;
        } else if (group === 'docs') {
          state.foraAgreement = null;
        }
        render();
      })));
      return wrap;
    }

    function render() {
      section.replaceChildren();
      const eye = doc.createElement('div'); eye.className = 'eyebrow'; eye.textContent = copy.eyebrow;
      const title = doc.createElement('h2'); title.textContent = copy.title;
      const intro = doc.createElement('p'); intro.className = 'muted'; intro.textContent = copy.intro;
      section.append(eye, title, intro);
      if (workContext === 'self_employed') section.appendChild(result(doc, copy.eyebrow, contextCopy.selfContext));
      if (workContext === 'invoiced_worker') section.appendChild(result(doc, copy.eyebrow, contextCopy.invoicedContext));
      section.appendChild(q(copy.qWhere, 'where', [["work", copy.atWork], ["commute", copy.commute], ["other", copy.other], ["unsure", copy.unsure]]));

      if (state.where === 'other') {
        section.appendChild(result(doc, copy.whereOtherTitle, copy.whereOtherBody));
        const a = doc.createElement('a'); a.className = 'source'; a.href = `${ORDINARY_DENTAL_URL}&lang=${encodeURIComponent(lang)}`; a.textContent = copy.dentalLink; section.appendChild(a);
        source(doc, section, copy.fkSource, FK_URL);
        return;
      }
      if (state.where === 'unsure') {
        section.appendChild(result(doc, copy.whereUnsureTitle, copy.whereUnsureBody));
        source(doc, section, copy.fkSource, FK_URL);
        return;
      }
      if (!state.where) return;

      if (state.where === 'commute') {
        section.appendChild(q(copy.qTraffic, 'traffic', [["yes", copy.yes], ["no", copy.no], ["unsure", copy.unsure]]));
        if (state.traffic === 'yes') section.appendChild(result(doc, copy.trafficTitle, copy.trafficBody));
      }
      section.appendChild(q(copy.qTreatment, 'treatment', [["yes", copy.yes], ["no", copy.no], ["unsure", copy.unsure]]));
      if (state.treatment === 'no') {
        section.appendChild(result(doc, copy.treatmentNoTitle, copy.treatmentNoBody));
        const a = doc.createElement('a'); a.className = 'source'; a.href = `${ORDINARY_DENTAL_URL}&lang=${encodeURIComponent(lang)}`; a.textContent = copy.dentalLink; section.appendChild(a);
        source(doc, section, copy.fkSource, FK_URL);
        return;
      }
      if (state.treatment === 'unsure') {
        section.appendChild(result(doc, copy.treatmentUnsureTitle, copy.treatmentUnsureBody));
        source(doc, section, copy.fkSource, FK_URL);
        return;
      }
      if (state.treatment !== 'yes') return;

      section.appendChild(q(copy.qDocs, 'docs', [["both", copy.both], ["missing", copy.missing], ["unsure", copy.unsure]]));
      if (state.docs === 'missing') section.appendChild(result(doc, copy.docsMissingTitle, copy.docsMissingBody));
      if (state.docs === 'unsure') section.appendChild(result(doc, copy.docsUnsureTitle, copy.docsUnsureBody));
      if (state.docs === 'both') section.appendChild(result(doc, copy.candidateTitle, copy.candidateBody));
      if (state.docs) {
        if (workContext === 'invoiced_worker') {
          section.appendChild(result(doc, contextCopy.invoicedTitle, contextCopy.invoicedBody));
        } else if (workContext === 'self_employed' && !(state.where === 'commute' && state.traffic === 'yes')) {
          section.appendChild(q(contextCopy.qFora, 'foraAgreement', [["yes", copy.yes], ["no", copy.no], ["unsure", copy.unsure]]));
          if (state.foraAgreement === 'yes') section.appendChild(result(doc, contextCopy.foraYesTitle, contextCopy.foraYesBody));
          if (state.foraAgreement === 'no') section.appendChild(result(doc, contextCopy.foraNoTitle, contextCopy.foraNoBody));
          if (state.foraAgreement === 'unsure') section.appendChild(result(doc, contextCopy.foraUnsureTitle, contextCopy.foraUnsureBody));
        } else if (workContext === 'employee' && !(state.where === 'commute' && state.traffic === 'yes')) {
          section.appendChild(result(doc, copy.afaTitle, copy.afaBody));
        }
        source(doc, section, copy.fkSource, FK_URL);
        if (workContext === 'invoiced_worker') source(doc, section, contextCopy.fkEgenSource, FK_EGEN_URL);
        if (workContext === 'self_employed' && state.foraAgreement) source(doc, section, contextCopy.foraSource, FORA_URL);
        if (workContext === 'employee' || (state.where === 'commute' && state.traffic === 'yes')) source(doc, section, copy.afaSource, AFA_URL);
      }
    }

    main.prepend(section);
    render();
  }

  function init(win) { addShellHandoff(win); addPersonGuidance(win); }
  return { detect, detectWorkContext, safeLang, handoffHref, init };
});
