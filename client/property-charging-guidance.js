(() => {
  'use strict';

  // SAME PRODUCT: one bounded route inside the existing shell/person pilot.
  // Only coarse route-changing facts may cross surfaces. Never transfer an
  // address, organisation number, parking identifier, exact cost, vehicle data
  // or raw situation text in the URL, feedback or public learning event.
  const FOCUS = 'property_charging';
  const NV_ASSOC = 'https://www.naturvardsverket.se/amnesomraden/klimatomstallningen/ladda-bilen/ladda-bilen-for-foreningar-och-boendeorganisationer/';
  const NV_COMPANY = 'https://www.naturvardsverket.se/amnesomraden/klimatomstallningen/ladda-bilen/ladda-bilen-for-fastighetsbolag-och-foretag/';
  const RIKSDAGEN = 'https://data.riksdagen.se/dokument/sfs-1991-614.html';

  const CONTEXTS = new Set(['association_project', 'company_project', 'resident_request']);
  const USES = new Set(['members', 'guests', 'external', 'company_internal', 'company_guests', 'mixed']);
  const RESIDENT_SCOPES = new Set(['own_home_parking', 'other_or_unclear']);
  const clean = (value, allowed) => allowed.has(String(value || '').toLowerCase()) ? String(value).toLowerCase() : '';
  const cleanContext = (value) => clean(value, CONTEXTS);
  const cleanUse = (value) => clean(value, USES);
  const cleanResidentScope = (value) => clean(value, RESIDENT_SCOPES);

  function inferRoute(text) {
    const s = String(text || '').toLowerCase();
    const company = /(fastighetsbolag|företag|arbetsgivare|anställda|tjänstebil|verksamhetsbil|شركة عقارية|شركة|موظفين|شرکت.*ملک|شرکت|کارکنان)/i.test(s);
    const association = /(brf|bostadsrättsförening|samfällighet|föreningen.*ladd|ladd.*boende|جمعية.*سكن|اتحاد.*سكن|انجمن.*ساختمان|تعاونی.*مسکن)/i.test(s);
    const resident = /(jag.*(bostadsrätt|hyresgäst|parkering|laddbox)|min egen parkeringsplats|min p-plats|egen parkering|أنا.*(ساكن|موقف)|موقف سيارتي|من.*(ساکن|پارکینگ)|پارکینگ خودم|جای پارک خودم)/i.test(s);

    if (company) {
      const guest = /(gäst|besökare|زائر|ضيف|مهمان|بازدیدکننده)/i.test(s);
      const internal = /(anställd|tjänstebil|verksamhetsbil|hyresgäst|موظف|مستأجر|کارمند|مستأجر)/i.test(s);
      return {context: 'company_project', use: guest && internal ? 'mixed' : guest ? 'company_guests' : internal ? 'company_internal' : ''};
    }
    if (association) {
      const external = /(extern|lokalhyresgäst|verksamhet.*inte.*boende|خارجي|خارجی)/i.test(s);
      const guest = /(gäst|besökare|زائر|ضيف|مهمان|بازدیدکننده)/i.test(s);
      const member = /(boende|medlem|سكان|أعضاء|ساکن|عضو)/i.test(s);
      const count = [external, guest, member].filter(Boolean).length;
      return {context: 'association_project', use: count > 1 ? 'mixed' : external ? 'external' : guest ? 'guests' : member ? 'members' : ''};
    }
    if (resident) {
      const own = /(min egen parkeringsplats|min p-plats|egen parkering|egna parkeringsplats|موقف سيارتي|موقفي|پارکینگ خودم|جای پارک خودم)/i.test(s);
      return {context: 'resident_request', residentScope: own ? 'own_home_parking' : ''};
    }
    return {context: '', use: '', residentScope: ''};
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
      'laddning anställda', 'laddning gäster', 'jag vill ha laddbox på min parkeringsplats',
      'bostadsrätt laddbox parkering', 'hyresgäst laddbox parkering',
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
        const route = inferRoute(input && input.value);
        if (route.context) url.searchParams.set('charging_context', route.context);
        else url.searchParams.delete('charging_context');
        if (route.use) url.searchParams.set('charging_use', route.use);
        else url.searchParams.delete('charging_use');
        if (route.residentScope) url.searchParams.set('charging_resident_scope', route.residentScope);
        else url.searchParams.delete('charging_resident_scope');
        first.href = url.pathname.split('/').pop() + url.search;
        box.dataset.primaryRoute = FOCUS;
      } catch (_err) { /* retain the already-safe base route */ }
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
  const initialUse = cleanUse(params.get('charging_use'));
  const initialResidentScope = cleanResidentScope(params.get('charging_resident_scope'));

  const copy = {
    sv: {
      contextQ: 'Vilken situation gäller?', assoc: 'BRF, samfällighet eller förening ordnar laddning', company: 'Fastighetsbolag eller företag ordnar laddning', resident: 'Jag är boende och vill ha laddpunkt vid min parkeringsplats', unsure: 'Jag är osäker',
      assocUseQ: 'Vem ska främst använda föreningens laddpunkter?', members: 'Boende eller medlemmar', guests: 'Gäster eller besökare', external: 'Extern hyresgäst eller annan extern verksamhet', mixed: 'Flera grupper eller osäker',
      companyUseQ: 'Vem ska främst använda företagets eller fastighetsbolagets laddpunkter?', companyInternal: 'Anställda, verksamhetsbilar eller egna hyresgäster', companyGuests: 'Gäster eller besökare',
      startedQ: 'Har installationsarbetet redan påbörjats?', no: 'Nej', yes: 'Ja', unsure2: 'Osäker',
      residentScopeQ: 'Gäller önskemålet din egen parkeringsplats i eller nära huset där du bor?', ownHome: 'Ja', otherParking: 'Nej eller osäker',
      assocTitle: 'Ladda bilen har en särskild väg för föreningar och boendeorganisationer',
      assocBody: 'För laddpunkter som föreningen äger och som används av boende eller medlemmar anger Naturvårdsverket 50 procent av bidragsberättigade kostnader, högst 15 000 kronor per laddpunkt. Det är ett tak och inte ett löfte om beviljat belopp. Om installationen redan är slutförd anger den aktuella vägledningen att ansökan ska lämnas inom sex månader efter slutförd installation.',
      assocGuestTitle: 'Gästladdning har en separat statsstödsregel',
      assocGuestBody: 'För gäster eller besökare anger Naturvårdsverket 50 procent av bidragsberättigade kostnader, högst 15 000 kronor per laddpunkt. Stödet är de minimis och den aktuella vägledningen tillåter ansökan både före och efter att installationen har påbörjats.',
      assocExternalTitle: 'Extern användning ändrar både stödregel och tidpunkt',
      assocExternalBody: 'När laddpunkterna gäller en extern hyresgäst eller annan extern part behandlas föreningen som marknadsaktör i den delen. Ansökan ska då vara inskickad innan installationen påbörjas. Beslut behöver inte ha kommit innan arbetet startar.',
      mixedTitle: 'Blandad användning ska inte pressas in i en enda regel',
      mixedBody: 'Naturvårdsverket räknar olika nyttjandekategorier enligt olika statsstödsregler. Separera boende/medlemmar, gäster och externa användare och kontrollera den aktuella vägen innan tidpunkt eller stödnivå används.',
      companyInternalTitle: 'Företagets anställda, bilar eller hyresgäster har en pre-start-gräns',
      companyInternalBody: 'För den här företagsvägen anger Naturvårdsverket att ansökan ska lämnas innan installationsarbetet påbörjas. Stödnivån kan bero på företagsstorlek och ska inte gissas från organisationsform eller fri text.',
      companyGuestTitle: 'Företags gästladdning har en annan tidsregel',
      companyGuestBody: 'För gäster eller besökare anger Naturvårdsverket 50 procent av bidragsberättigade kostnader, högst 15 000 kronor per laddpunkt, som de minimis-stöd. Den aktuella vägledningen anger att denna gästväg kan sökas både före och efter att installationen påbörjats.',
      startedStopTitle: 'Påbörjat arbete stoppar den här företagsvägen',
      startedStopBody: 'Om arbetet redan har startat ska Stödassistenten inte lova stöd för anställda, verksamhets-/tjänstebilar eller egna hyresgäster via denna väg. Kontrollera Naturvårdsverkets aktuella definition och andra verifierade vägar innan fler kostnader tas.',
      residentTitle: 'Boendes rätt att begära laddpunkt är en annan fråga än organisationens bidrag',
      residentBody: 'Sedan 29 maj 2026 kan hyresgäster och bostadsrättshavare i vissa fall på egen bekostnad begära en laddpunkt på den egna parkeringsplatsen om platsen ligger i samma hus som bostaden eller i närheten. Det är inte ett personligt Ladda bilen-bidrag och inte en garanti om godkännande.',
      residentNextTitle: 'Begäran går till hyresvärd eller bostadsrättsförening',
      residentNextBody: 'När lagens villkor är uppfyllda får installation bara vägras om det finns befogad anledning. Stödassistenten avgör inte om ett enskilt fall uppfyller alla villkor; använd aktuell lagkälla om begäran avslås.',
      residentUnclearTitle: 'Parkeringsplatsens koppling till bostaden måste först klaras ut',
      residentUnclearBody: 'Den nya regeln gäller en boendes bilparkeringsplats i samma hus som bostadslägenheten eller i närheten. Om det inte är klart ska Stödassistenten inte lova rätt till installation; kontrollera upplåtelsen och aktuell lagkälla.',
      unsureTitle: 'Börja med att skilja projektägare från boendes egen begäran',
      unsureBody: 'Det avgör om nästa steg är föreningens Ladda bilen-väg, företags-/fastighetsbolagsvägen eller den separata bostadsrätts-/hyresrättsregeln. Kontrollera detta innan belopp eller tidsregler används.'
    },
    ar: {
      contextQ: 'ما هي الحالة التي تنطبق؟', assoc: 'جمعية سكنية أو جمعية مرافق تريد إنشاء الشحن', company: 'شركة عقارية أو شركة تريد إنشاء الشحن', resident: 'أنا ساكن وأريد نقطة شحن عند موقف سيارتي', unsure: 'لست متأكداً',
      assocUseQ: 'من سيستخدم نقاط الشحن التابعة للجمعية أساساً؟', members: 'السكان أو الأعضاء', guests: 'الضيوف أو الزوار', external: 'مستأجر خارجي أو نشاط خارجي', mixed: 'عدة مجموعات أو غير واضح',
      companyUseQ: 'من سيستخدم نقاط شحن الشركة أو شركة العقار أساساً؟', companyInternal: 'الموظفون أو سيارات العمل أو المستأجرون لدى الشركة', companyGuests: 'الضيوف أو الزوار',
      startedQ: 'هل بدأ عمل التركيب بالفعل؟', no: 'لا', yes: 'نعم', unsure2: 'غير متأكد', residentScopeQ: 'هل الطلب لموقفك الخاص في المبنى الذي تسكن فيه أو بالقرب منه؟', ownHome: 'نعم', otherParking: 'لا أو غير متأكد',
      assocTitle: 'لدى Ladda bilen مسار خاص للجمعيات السكنية', assocBody: 'للنقاط المملوكة للجمعية والمستخدمة من السكان أو الأعضاء تذكر Naturvårdsverket نسبة 50% من التكاليف المؤهلة وبحد أقصى 15,000 كرونة لكل نقطة. هذا سقف وليس وعداً بالدفع. وإذا اكتمل التركيب بالفعل تذكر الإرشادات الحالية أن الطلب يقدم خلال ستة أشهر من اكتماله.',
      assocGuestTitle: 'شحن الضيوف له قاعدة دعم منفصلة', assocGuestBody: 'للضيوف والزوار تذكر Naturvårdsverket نسبة 50% من التكاليف المؤهلة وبحد أقصى 15,000 كرونة لكل نقطة ضمن دعم de minimis، وتسمح الإرشادات الحالية بالتقديم قبل أو بعد بدء التركيب.',
      assocExternalTitle: 'الاستخدام الخارجي يغير قاعدة الدعم والتوقيت', assocExternalBody: 'عند الاستخدام من مستأجر خارجي أو طرف خارجي تعامل الجمعية كفاعل في السوق في هذا الجزء ويجب إرسال الطلب قبل بدء التركيب. لا يلزم صدور القرار قبل بدء العمل.',
      mixedTitle: 'لا تجمع الاستخدامات المختلفة في قاعدة واحدة', mixedBody: 'تطبق Naturvårdsverket قواعد مختلفة حسب فئة الاستخدام. افصل السكان أو الأعضاء عن الضيوف والمستخدمين الخارجيين قبل استخدام أي نسبة أو قاعدة زمنية.',
      companyInternalTitle: 'مسار الموظفين أو سيارات العمل أو المستأجرين يتطلب التقديم قبل البدء', companyInternalBody: 'في هذا المسار تذكر Naturvårdsverket أن الطلب يجب أن يقدم قبل بدء أعمال التركيب. قد تعتمد نسبة الدعم على حجم الشركة ولا ينبغي تخمينها من الشكل القانوني أو النص الحر.',
      companyGuestTitle: 'شحن ضيوف الشركة له قاعدة زمنية مختلفة', companyGuestBody: 'للضيوف والزوار تذكر Naturvårdsverket 50% من التكاليف المؤهلة وبحد أقصى 15,000 كرونة لكل نقطة كدعم de minimis، وتسمح الإرشادات الحالية بالتقديم قبل أو بعد بدء التركيب.',
      startedStopTitle: 'بدء العمل يوقف مسار الشركة هذا', startedStopBody: 'إذا بدأ العمل فلا تعد بالدعم لمسار الموظفين أو سيارات العمل أو المستأجرين. تحقق من التعريف الحالي لدى Naturvårdsverket ومن مسارات أخرى موثقة قبل تكاليف إضافية.',
      residentTitle: 'حق الساكن في طلب الشاحن يختلف عن منحة المنظمة', residentBody: 'منذ 29 مايو 2026 يمكن للمستأجر أو صاحب bostadsrätt في بعض الحالات وعلى نفقته طلب نقطة شحن في موقفه إذا كان في نفس مبنى السكن أو بالقرب منه. هذا ليس منحة Ladda bilen شخصية ولا ضماناً بالموافقة.',
      residentNextTitle: 'يقدم الطلب إلى المالك أو جمعية السكن', residentNextBody: 'عندما تنطبق شروط القانون لا يجوز الرفض إلا لسبب مبرر. Stödassistenten لا يقرر أن الحالة الفردية تستوفي كل الشروط؛ استخدم المصدر القانوني الحالي إذا رفض الطلب.',
      residentUnclearTitle: 'يجب أولاً توضيح ارتباط موقف السيارة بالسكن', residentUnclearBody: 'تتعلق القاعدة الجديدة بموقف الساكن في نفس مبنى السكن أو بالقرب منه. إذا لم يكن ذلك واضحاً فلا تعد بحق في التركيب؛ تحقق من حق استخدام الموقف ومن القانون الحالي.',
      unsureTitle: 'افصل أولاً بين مشروع المنظمة وطلب الساكن الشخصي', unsureBody: 'هذا يحدد إن كان المسار هو Ladda bilen للجمعية أو للشركة أو قاعدة السكن المنفصلة. لا تستخدم مبالغ أو مواعيد قبل تحديد المسار.'
    },
    fa: {
      contextQ: 'کدام وضعیت مطرح است؟', assoc: 'انجمن ساختمان یا انجمن مشترک می‌خواهد شارژ نصب کند', company: 'شرکت ملکی یا شرکت می‌خواهد شارژ نصب کند', resident: 'من ساکن هستم و برای جای پارک خودم شارژر می‌خواهم', unsure: 'مطمئن نیستم',
      assocUseQ: 'نقاط شارژ انجمن بیشتر برای چه کسانی است؟', members: 'ساکنان یا اعضا', guests: 'مهمانان یا بازدیدکنندگان', external: 'مستأجر یا فعالیت خارجی', mixed: 'چند گروه یا نامشخص',
      companyUseQ: 'نقاط شارژ شرکت یا شرکت ملکی بیشتر برای چه کسانی است؟', companyInternal: 'کارکنان، خودروهای کاری یا مستأجران شرکت', companyGuests: 'مهمانان یا بازدیدکنندگان',
      startedQ: 'آیا کار نصب شروع شده است؟', no: 'خیر', yes: 'بله', unsure2: 'مطمئن نیستم', residentScopeQ: 'آیا درخواست برای جای پارک خودتان در همان ساختمان محل سکونت یا نزدیک آن است؟', ownHome: 'بله', otherParking: 'خیر یا نامشخص',
      assocTitle: 'Ladda bilen مسیر ویژه‌ای برای انجمن‌های مسکونی دارد', assocBody: 'برای نقاطی که متعلق به انجمن است و ساکنان یا اعضا استفاده می‌کنند Naturvårdsverket 50 درصد هزینه‌های واجد شرایط تا سقف 15,000 کرون برای هر نقطه را ذکر می‌کند. این سقف است نه تضمین پرداخت. اگر نصب کامل شده باشد راهنمای فعلی می‌گوید درخواست باید ظرف شش ماه پس از تکمیل ارسال شود.',
      assocGuestTitle: 'شارژ مهمانان قاعده جداگانه کمک دارد', assocGuestBody: 'برای مهمانان Naturvårdsverket 50 درصد هزینه‌های واجد شرایط تا سقف 15,000 کرون برای هر نقطه را به عنوان de minimis ذکر می‌کند و راهنمای فعلی درخواست قبل یا بعد از شروع نصب را مجاز می‌داند.',
      assocExternalTitle: 'استفاده خارجی قاعده و زمان‌بندی را تغییر می‌دهد', assocExternalBody: 'برای مستأجر یا طرف خارجی، انجمن در آن بخش فعال بازار محسوب می‌شود و درخواست باید قبل از شروع نصب ارسال شود. لازم نیست تصمیم پیش از شروع کار صادر شده باشد.',
      mixedTitle: 'استفاده‌های متفاوت را در یک قاعده ادغام نکنید', mixedBody: 'Naturvårdsverket بسته به نوع استفاده قواعد متفاوتی دارد. ساکنان یا اعضا، مهمانان و کاربران خارجی را قبل از استفاده از درصد یا زمان‌بندی از هم جدا کنید.',
      companyInternalTitle: 'مسیر کارکنان، خودروهای کاری یا مستأجران شرط قبل از شروع دارد', companyInternalBody: 'در این مسیر Naturvårdsverket می‌گوید درخواست باید قبل از شروع کار نصب ثبت شود. میزان کمک می‌تواند به اندازه شرکت وابسته باشد و نباید از شکل حقوقی یا متن آزاد حدس زده شود.',
      companyGuestTitle: 'شارژ مهمانان شرکت زمان‌بندی متفاوتی دارد', companyGuestBody: 'برای مهمانان Naturvårdsverket 50 درصد هزینه‌های واجد شرایط تا سقف 15,000 کرون برای هر نقطه را به عنوان de minimis ذکر می‌کند و راهنمای فعلی درخواست قبل یا بعد از شروع نصب را مجاز می‌داند.',
      startedStopTitle: 'شروع کار این مسیر شرکت را متوقف می‌کند', startedStopBody: 'اگر کار شروع شده است، برای مسیر کارکنان، خودروهای کاری یا مستأجران وعده کمک ندهید. تعریف فعلی Naturvårdsverket و مسیرهای معتبر دیگر را پیش از هزینه بیشتر بررسی کنید.',
      residentTitle: 'حق ساکن برای درخواست شارژر با کمک سازمان فرق دارد', residentBody: 'از 29 مه 2026 مستأجر یا دارنده bostadsrätt در برخی موارد می‌تواند با هزینه خود برای جای پارک خود در همان ساختمان محل سکونت یا نزدیک آن درخواست نقطه شارژ کند. این کمک شخصی Ladda bilen یا تضمین پذیرش نیست.',
      residentNextTitle: 'درخواست به مالک یا انجمن ساختمان ارائه می‌شود', residentNextBody: 'اگر شرایط قانون برقرار باشد رد نصب فقط با دلیل موجه ممکن است. Stödassistenten تشخیص نهایی پرونده را نمی‌دهد؛ در صورت رد درخواست از منبع قانونی فعلی استفاده کنید.',
      residentUnclearTitle: 'ابتدا ارتباط جای پارک با محل سکونت را روشن کنید', residentUnclearBody: 'قاعده جدید درباره جای پارک ساکن در همان ساختمان مسکونی یا نزدیک آن است. اگر این موضوع روشن نیست حق نصب را قطعی ندانید؛ حق استفاده از پارکینگ و قانون فعلی را بررسی کنید.',
      unsureTitle: 'ابتدا پروژه سازمان را از درخواست شخصی ساکن جدا کنید', unsureBody: 'این مشخص می‌کند مسیر مناسب Ladda bilen انجمن، مسیر شرکت یا قانون جداگانه مسکن است. پیش از تعیین این موضوع از مبلغ یا مهلت استفاده نکنید.'
    }
  };

  for (const code of ['sv', 'ar', 'fa']) {
    Object.assign(T[code], {
      chargingContext: copy[code].contextQ, chargingAssoc: copy[code].assoc, chargingCompany: copy[code].company, chargingResident: copy[code].resident, chargingUnsure: copy[code].unsure,
      chargingAssocUse: copy[code].assocUseQ, chargingMembers: copy[code].members, chargingGuests: copy[code].guests, chargingExternal: copy[code].external, chargingMixed: copy[code].mixed,
      chargingCompanyUse: copy[code].companyUseQ, chargingCompanyInternal: copy[code].companyInternal, chargingCompanyGuests: copy[code].companyGuests,
      chargingStarted: copy[code].startedQ, chargingNo: copy[code].no, chargingYes: copy[code].yes, chargingUnsure2: copy[code].unsure2,
      chargingResidentScope: copy[code].residentScopeQ, chargingOwnHome: copy[code].ownHome, chargingOtherParking: copy[code].otherParking
    });
  }

  const baseFlow = flow;
  const baseGetRows = getRows;
  const baseResults = results;
  const currentLang = () => copy[document.documentElement.lang] ? document.documentElement.lang : 'sv';
  const context = () => cleanContext(answers.chargingContext || initialContext);
  const usage = () => cleanUse(answers.chargingUse || initialUse);
  const residentScope = () => cleanResidentScope(answers.chargingResidentScope || initialResidentScope);

  function nextForContext(value) {
    if (value === 'association_project') {
      if (initialUse === 'external') return 'chargingStarted';
      if (initialUse) return 'chargingR';
      return 'chargingAssocUse';
    }
    if (value === 'company_project') {
      if (initialUse === 'company_internal') return 'chargingStarted';
      if (initialUse) return 'chargingR';
      return 'chargingCompanyUse';
    }
    if (value === 'resident_request') return initialResidentScope ? 'chargingR' : 'chargingResidentScope';
    return 'chargingR';
  }

  flow = function () {
    if (screen === 'chargingContext') return q('chargingContext', [
      ['chargingAssoc', 'chargingAssocUse', 'chargingContext', 'association_project'],
      ['chargingCompany', 'chargingCompanyUse', 'chargingContext', 'company_project'],
      ['chargingResident', 'chargingResidentScope', 'chargingContext', 'resident_request'],
      ['chargingUnsure', 'chargingR', 'chargingContext', 'unsure']
    ], 'home', '1');
    if (screen === 'chargingAssocUse') return q('chargingAssocUse', [
      ['chargingMembers', 'chargingR', 'chargingUse', 'members'],
      ['chargingGuests', 'chargingR', 'chargingUse', 'guests'],
      ['chargingExternal', 'chargingStarted', 'chargingUse', 'external'],
      ['chargingMixed', 'chargingR', 'chargingUse', 'mixed']
    ], initialContext ? 'home' : 'chargingContext', '2');
    if (screen === 'chargingCompanyUse') return q('chargingCompanyUse', [
      ['chargingCompanyInternal', 'chargingStarted', 'chargingUse', 'company_internal'],
      ['chargingCompanyGuests', 'chargingR', 'chargingUse', 'company_guests'],
      ['chargingMixed', 'chargingR', 'chargingUse', 'mixed']
    ], initialContext ? 'home' : 'chargingContext', '2');
    if (screen === 'chargingStarted') return q('chargingStarted', [
      ['chargingNo', 'chargingR', 'chargingStarted', 'no'],
      ['chargingYes', 'chargingR', 'chargingStarted', 'yes'],
      ['chargingUnsure2', 'chargingR', 'chargingStarted', 'unsure']
    ], context() === 'company_project' ? 'chargingCompanyUse' : 'chargingAssocUse', '3');
    if (screen === 'chargingResidentScope') return q('chargingResidentScope', [
      ['chargingOwnHome', 'chargingR', 'chargingResidentScope', 'own_home_parking'],
      ['chargingOtherParking', 'chargingR', 'chargingResidentScope', 'other_or_unclear']
    ], initialContext ? 'home' : 'chargingContext', '2');
    return baseFlow();
  };

  getRows = function () {
    if (scenario !== 'property_charging') return baseGetRows();
    const c = copy[currentLang()] || copy.sv;
    const rows = [];
    const ctx = context();
    const use = usage();
    if (ctx === 'association_project') {
      if (use === 'members') rows.push([c.assocTitle, c.assocBody, NV_ASSOC]);
      else if (use === 'guests') rows.push([c.assocGuestTitle, c.assocGuestBody, NV_ASSOC]);
      else if (use === 'external') {
        rows.push([c.assocExternalTitle, c.assocExternalBody, NV_ASSOC]);
        if (answers.chargingStarted === 'yes') rows.push([c.startedStopTitle, c.startedStopBody, NV_COMPANY]);
      } else rows.push([c.mixedTitle, c.mixedBody, NV_ASSOC]);
    } else if (ctx === 'company_project') {
      if (use === 'company_internal') {
        rows.push([c.companyInternalTitle, c.companyInternalBody, NV_COMPANY]);
        if (answers.chargingStarted === 'yes') rows.push([c.startedStopTitle, c.startedStopBody, NV_COMPANY]);
      } else if (use === 'company_guests') rows.push([c.companyGuestTitle, c.companyGuestBody, NV_COMPANY]);
      else rows.push([c.mixedTitle, c.mixedBody, NV_COMPANY]);
    } else if (ctx === 'resident_request') {
      if (residentScope() === 'own_home_parking') {
        rows.push([c.residentTitle, c.residentBody, RIKSDAGEN]);
        rows.push([c.residentNextTitle, c.residentNextBody, RIKSDAGEN]);
      } else rows.push([c.residentUnclearTitle, c.residentUnclearBody, RIKSDAGEN]);
    } else rows.push([c.unsureTitle, c.unsureBody, NV_ASSOC]);
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
    if (initialUse) answers.chargingUse = initialUse;
    if (initialResidentScope) answers.chargingResidentScope = initialResidentScope;
    matchRatings = {};
    finalFeedback = {};
    submitState = 'idle';
    screen = initialContext ? nextForContext(initialContext) : 'chargingContext';
    render();
  }
})();
