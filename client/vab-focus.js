(() => {
  const params = new URLSearchParams(window.location.search);
  const focus = String(params.get('focus') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  if (focus !== 'vab') return;
  if (typeof flow !== 'function' || typeof getRows !== 'function' || typeof results !== 'function' || typeof render !== 'function') return;

  const sourceUnder12 = 'https://www.forsakringskassan.se/privatperson/familj-och-barn/vab-for-barn-under-12-ar';
  const source12Plus = 'https://www.forsakringskassan.se/privatperson/familj-och-barn/vab-for-barn-som-ar-12-ar-eller-aldre';
  const sourceHours = 'https://www.forsakringskassan.se/nyhetsarkiv/nyheter-press/2026-03-02-extra-kontroller-av-vab-under-varen';

  const copy = {
    sv: {
      under12Title: 'Barn under 12 – kontrollera VAB-vägen',
      under12Why: 'Försäkringskassan har en särskild VAB-väg för barn under 12. Kontrollera de aktuella villkoren där innan du ansöker; piloten avgör inte om du har rätt till ersättning.',
      age1215Title: 'Barn 12–15 – kontrollera förhandsbeslut och underlag',
      age1215Why: 'Efter 12 års ålder skiljer sig villkor och underlag från standardflödet. Kontrollera om ett förhandsbeslut finns och vilket medicinskt underlag Försäkringskassan kräver för just situationen.',
      olderTitle: 'Barn 16+ – åldern ändrar vägen',
      olderWhy: 'För äldre barn finns särskilda situationer och åldersgränser. Börja i Försäkringskassans väg för barn som är 12 år eller äldre och kontrollera vad som gäller i just ditt fall.',
      ageUnknownTitle: 'Börja med barnets ålder',
      ageUnknownWhy: 'Barnets ålder kan ändra både villkor och underlag. Kontrollera åldersgruppen i Försäkringskassans aktuella VAB-information innan du går vidare.',
      hoursTitle: 'Red ut exakta timmar innan du ansöker',
      hoursWhy: 'Vid deltidssjukskrivning eller annan ersättning samma dag betonar Försäkringskassan att rätt timmar ska anges på rätt dag. En dagsprocent ensam ska inte användas som säkert besked om vilka timmar VAB kan gälla.',
      hoursReadyTitle: 'Stäm av timfördelningen en sista gång',
      hoursReadyWhy: 'Du har uppgett att du har koll på timmarna. Jämför ändå arbetstid, sjukfrånvaro eller annan ersättning och den tid du vill vabba så att samma timmar inte behandlas som två olika ersättningsperioder.',
      selfSickTitle: 'Egen sjukfrånvaro behöver redas ut först',
      selfSickWhy: 'Egen sjukfrånvaro kan ändra VAB-vägen. Kontrollera med Försäkringskassan vilka timmar du faktiskt skulle ha arbetat och om VAB är aktuell för den tid du frågar om.',
      normalTitle: 'Nästa steg: kontrollera och ansök via Försäkringskassan',
      normalWhy: 'När ålder, frånvaroorsak och arbetstid är tydliga kan du kontrollera den aktuella VAB-vägen hos Försäkringskassan och gå vidare därifrån. Piloten lovar inte rätt till ersättning.',
      priorYesTitle: 'Ha förhandsbeslutet till hands',
      priorYesWhy: 'För barn 12–15 kan ett aktuellt förhandsbeslut påverka vilket underlag som behövs. Kontrollera beslutets giltighet och följ Försäkringskassans aktuella instruktioner.',
      priorNoTitle: 'Kontrollera vilket medicinskt underlag som behövs',
      priorNoWhy: 'När det saknas förhandsbeslut behöver du kontrollera vilket läkarunderlag som gäller för den aktuella situationen innan ansökan.',
      priorUnsureTitle: 'Ta reda på om ett förhandsbeslut finns',
      priorUnsureWhy: 'Kontrollera Mina sidor eller kontakta Försäkringskassan om du är osäker. Det kan ändra vilket underlag som behöver ordnas.'
    },
    ar: {
      under12Title: 'طفل دون 12 سنة – تحقق من مسار VAB',
      under12Why: 'لدى Försäkringskassan مسار خاص بـ VAB للأطفال دون 12 سنة. تحقق من الشروط الحالية هناك قبل التقديم؛ النسخة التجريبية لا تقرر الاستحقاق.',
      age1215Title: 'طفل 12–15 سنة – تحقق من القرار المسبق والمستندات',
      age1215Why: 'بعد سن 12 تختلف الشروط والمستندات عن المسار المعتاد. تحقق مما إذا كان هناك قرار مسبق وما المستند الطبي الذي تطلبه Försäkringskassan للحالة المحددة.',
      olderTitle: 'طفل 16 سنة أو أكثر – العمر يغيّر المسار',
      olderWhy: 'للأطفال الأكبر سناً حالات وحدود عمرية خاصة. ابدأ بمعلومات Försäkringskassan للأطفال من 12 سنة فأكثر وتحقق مما ينطبق على حالتك.',
      ageUnknownTitle: 'ابدأ بعمر الطفل',
      ageUnknownWhy: 'يمكن لعمر الطفل أن يغيّر الشروط والمستندات. تحقق من الفئة العمرية في معلومات VAB الحالية لدى Försäkringskassan.',
      hoursTitle: 'حدّد الساعات الدقيقة قبل التقديم',
      hoursWhy: 'عند الإجازة المرضية الجزئية أو وجود تعويض آخر في اليوم نفسه تشدد Försäkringskassan على تسجيل الساعات الصحيحة في اليوم الصحيح. النسبة اليومية وحدها ليست جواباً آمناً عن ساعات VAB.',
      hoursReadyTitle: 'راجع توزيع الساعات مرة أخيرة',
      hoursReadyWhy: 'ذكرت أنك تعرف الساعات. قارن وقت العمل والإجازة المرضية أو التعويض الآخر مع الوقت الذي تريد VAB له حتى لا تُعامل الساعات نفسها كفترتي تعويض.',
      selfSickTitle: 'يجب توضيح غيابك المرضي أولاً',
      selfSickWhy: 'قد يغيّر غيابك المرضي مسار VAB. تحقق مع Försäkringskassan من الساعات التي كان من المفترض أن تعملها وما إذا كان VAB مناسباً للفترة المقصودة.',
      normalTitle: 'الخطوة التالية: تحقق وقدّم عبر Försäkringskassan',
      normalWhy: 'عندما يكون العمر وسبب الغياب ووقت العمل واضحاً، تحقق من مسار VAB الحالي لدى Försäkringskassan ثم تابع من هناك. النسخة التجريبية لا تضمن الاستحقاق.',
      priorYesTitle: 'احتفظ بالقرار المسبق جاهزاً',
      priorYesWhy: 'للأطفال 12–15 سنة قد يؤثر القرار المسبق الحالي في المستند المطلوب. تحقق من صلاحيته واتبع تعليمات Försäkringskassan الحالية.',
      priorNoTitle: 'تحقق من المستند الطبي المطلوب',
      priorNoWhy: 'إذا لم يوجد قرار مسبق، تحقق من نوع المستند الطبي المطلوب للحالة الحالية قبل التقديم.',
      priorUnsureTitle: 'تحقق مما إذا كان هناك قرار مسبق',
      priorUnsureWhy: 'راجع Mina sidor أو تواصل مع Försäkringskassan إذا لم تكن متأكداً. قد يغيّر ذلك المستندات التي يجب تجهيزها.'
    },
    fa: {
      under12Title: 'کودک زیر ۱۲ سال – مسیر VAB را بررسی کن',
      under12Why: 'Försäkringskassan برای کودکان زیر ۱۲ سال مسیر مشخص VAB دارد. پیش از درخواست، شرایط فعلی را در همان منبع بررسی کن؛ پایلوت درباره استحقاق تصمیم نمی‌گیرد.',
      age1215Title: 'کودک ۱۲ تا ۱۵ سال – تصمیم قبلی و مدارک را بررسی کن',
      age1215Why: 'بعد از ۱۲ سالگی شرایط و مدارک با مسیر معمول فرق می‌کند. بررسی کن آیا تصمیم قبلی وجود دارد و Försäkringskassan برای وضعیت مشخص چه مدرک پزشکی می‌خواهد.',
      olderTitle: 'کودک ۱۶ سال یا بیشتر – سن مسیر را تغییر می‌دهد',
      olderWhy: 'برای کودکان بزرگ‌تر موقعیت‌ها و مرزهای سنی ویژه وجود دارد. از صفحه Försäkringskassan برای کودکان ۱۲ سال به بالا شروع کن و مورد خودت را بررسی کن.',
      ageUnknownTitle: 'از سن کودک شروع کن',
      ageUnknownWhy: 'سن کودک می‌تواند شرایط و مدارک را تغییر دهد. گروه سنی را در اطلاعات فعلی VAB در Försäkringskassan بررسی کن.',
      hoursTitle: 'پیش از درخواست، ساعت‌های دقیق را روشن کن',
      hoursWhy: 'در بیماری پاره‌وقت یا دریافت مزایای دیگر در همان روز، Försäkringskassan بر ثبت ساعت درست در روز درست تأکید می‌کند. درصد روز به‌تنهایی پاسخ مطمئنی درباره ساعت‌های VAB نیست.',
      hoursReadyTitle: 'تقسیم ساعت‌ها را یک بار دیگر بررسی کن',
      hoursReadyWhy: 'گفته‌ای ساعت‌ها را می‌دانی. زمان کار، بیماری یا مزایای دیگر را با ساعاتی که می‌خواهی VAB بگیری مقایسه کن تا یک ساعت برای دو دوره مزایا در نظر گرفته نشود.',
      selfSickTitle: 'ابتدا غیبت بیماری خودت را روشن کن',
      selfSickWhy: 'غیبت بیماری خودت می‌تواند مسیر VAB را تغییر دهد. با Försäkringskassan بررسی کن چه ساعاتی قرار بوده کار کنی و آیا VAB برای زمان مورد نظر مطرح است.',
      normalTitle: 'قدم بعدی: در Försäkringskassan بررسی و اقدام کن',
      normalWhy: 'وقتی سن، علت غیبت و زمان کار روشن است، مسیر فعلی VAB را در Försäkringskassan بررسی کن و از همان‌جا ادامه بده. پایلوت استحقاق را تضمین نمی‌کند.',
      priorYesTitle: 'تصمیم قبلی را آماده داشته باش',
      priorYesWhy: 'برای کودکان ۱۲ تا ۱۵ سال تصمیم قبلی معتبر می‌تواند بر مدارک مورد نیاز اثر بگذارد. اعتبار آن را بررسی کن و دستورالعمل فعلی Försäkringskassan را دنبال کن.',
      priorNoTitle: 'مدرک پزشکی لازم را بررسی کن',
      priorNoWhy: 'اگر تصمیم قبلی وجود ندارد، پیش از درخواست بررسی کن برای وضعیت فعلی چه مدرک پزشکی لازم است.',
      priorUnsureTitle: 'بررسی کن آیا تصمیم قبلی وجود دارد',
      priorUnsureWhy: 'اگر مطمئن نیستی Mina sidor را بررسی کن یا با Försäkringskassan تماس بگیر. این موضوع می‌تواند مدارک لازم را تغییر دهد.'
    }
  };

  Object.assign(T.sv, {
    vabAge: 'Hur gammalt är barnet?',
    vabUnder12: 'Under 12 år',
    vab1215: '12–15 år',
    vab16plus: '16 år eller äldre',
    vabAgeUnsure: 'Vet inte / osäker',
    vabSelfSick: 'Är du själv sjuk eller sjukskriven någon del av dagen du vill vabba?',
    vabSelfNo: 'Nej',
    vabSelfPart: 'Ja, en del av dagen',
    vabSelfFull: 'Ja, hela dagen',
    vabSelfUnsure: 'Osäker',
    vabExactHours: 'Har du koll på de exakta timmarna du annars skulle ha arbetat och de timmar du är sjukskriven eller får annan ersättning?',
    vabHoursYes: 'Ja, timmarna är tydliga',
    vabHoursNo: 'Nej, jag behöver reda ut dem',
    vabHoursUnsure: 'Osäker',
    vabPrior: 'Finns ett aktuellt förhandsbeslut från Försäkringskassan om VAB för barnet?',
    vabPriorYes: 'Ja',
    vabPriorNo: 'Nej',
    vabPriorUnsure: 'Vet inte'
  });
  Object.assign(T.ar, {
    vabAge: 'كم عمر الطفل؟', vabUnder12: 'أقل من 12 سنة', vab1215: '12–15 سنة', vab16plus: '16 سنة أو أكثر', vabAgeUnsure: 'لا أعرف / غير متأكد',
    vabSelfSick: 'هل أنت مريض أو في إجازة مرضية خلال جزء من اليوم الذي تريد VAB له؟', vabSelfNo: 'لا', vabSelfPart: 'نعم، جزء من اليوم', vabSelfFull: 'نعم، طوال اليوم', vabSelfUnsure: 'غير متأكد',
    vabExactHours: 'هل تعرف الساعات الدقيقة التي كان من المفترض أن تعملها والساعات التي تكون فيها في إجازة مرضية أو تحصل على تعويض آخر؟', vabHoursYes: 'نعم، الساعات واضحة', vabHoursNo: 'لا، أحتاج إلى توضيحها', vabHoursUnsure: 'غير متأكد',
    vabPrior: 'هل يوجد قرار مسبق حالي من Försäkringskassan بخصوص VAB للطفل؟', vabPriorYes: 'نعم', vabPriorNo: 'لا', vabPriorUnsure: 'لا أعرف'
  });
  Object.assign(T.fa, {
    vabAge: 'کودک چند سال دارد؟', vabUnder12: 'زیر ۱۲ سال', vab1215: '۱۲ تا ۱۵ سال', vab16plus: '۱۶ سال یا بیشتر', vabAgeUnsure: 'نمی‌دانم / مطمئن نیستم',
    vabSelfSick: 'آیا در بخشی از روزی که می‌خواهی VAB بگیری خودت بیمار یا در مرخصی بیماری هستی؟', vabSelfNo: 'نه', vabSelfPart: 'بله، بخشی از روز', vabSelfFull: 'بله، تمام روز', vabSelfUnsure: 'مطمئن نیستم',
    vabExactHours: 'آیا ساعت‌های دقیقی را که قرار بود کار کنی و ساعت‌های بیماری یا مزایای دیگر را می‌دانی؟', vabHoursYes: 'بله، ساعت‌ها روشن است', vabHoursNo: 'نه، باید روشنش کنم', vabHoursUnsure: 'مطمئن نیستم',
    vabPrior: 'آیا برای VAB کودک یک تصمیم قبلی معتبر از Försäkringskassan وجود دارد؟', vabPriorYes: 'بله', vabPriorNo: 'نه', vabPriorUnsure: 'نمی‌دانم'
  });

  const currentLang = () => copy[document.documentElement.lang] ? document.documentElement.lang : 'sv';
  const baseFlow = flow;
  const baseGetRows = getRows;
  const baseResults = results;

  function afterSelfStatus(status) {
    if (status === 'part') return 'vab3';
    return answers.vabAge === 'age12_15' ? 'vab4' : 'vabR';
  }
  function afterHours() {
    return answers.vabAge === 'age12_15' ? 'vab4' : 'vabR';
  }

  flow = function() {
    if (screen === 'vab1') return q('vabAge', [['vabUnder12','vab2','vabAge','under12'],['vab1215','vab2','vabAge','age12_15'],['vab16plus','vab2','vabAge','age16plus'],['vabAgeUnsure','vab2','vabAge','unsure']], 'home', '1');
    if (screen === 'vab2') return q('vabSelfSick', [['vabSelfNo',afterSelfStatus('no'),'vabSelfSick','no'],['vabSelfPart',afterSelfStatus('part'),'vabSelfSick','part'],['vabSelfFull',afterSelfStatus('full'),'vabSelfSick','full'],['vabSelfUnsure',afterSelfStatus('unsure'),'vabSelfSick','unsure']], 'vab1', '2');
    if (screen === 'vab3') return q('vabExactHours', [['vabHoursYes',afterHours(),'vabExactHours','yes'],['vabHoursNo',afterHours(),'vabExactHours','no'],['vabHoursUnsure',afterHours(),'vabExactHours','unsure']], 'vab2', '3');
    if (screen === 'vab4') return q('vabPrior', [['vabPriorYes','vabR','vabPrior','yes'],['vabPriorNo','vabR','vabPrior','no'],['vabPriorUnsure','vabR','vabPrior','unsure']], answers.vabSelfSick === 'part' ? 'vab3' : 'vab2', answers.vabSelfSick === 'part' ? '4' : '3');
    return baseFlow();
  };

  getRows = function() {
    if (scenario !== 'vab') return baseGetRows();
    const c = copy[currentLang()] || copy.sv;
    const rows = [];

    if (answers.vabSelfSick === 'part') {
      rows.push([answers.vabExactHours === 'yes' ? c.hoursReadyTitle : c.hoursTitle, answers.vabExactHours === 'yes' ? c.hoursReadyWhy : c.hoursWhy, sourceHours]);
    } else if (answers.vabSelfSick === 'full' || answers.vabSelfSick === 'unsure') {
      rows.push([c.selfSickTitle, c.selfSickWhy, sourceHours]);
    }

    if (answers.vabAge === 'under12') rows.push([c.under12Title, c.under12Why, sourceUnder12]);
    else if (answers.vabAge === 'age12_15') rows.push([c.age1215Title, c.age1215Why, source12Plus]);
    else if (answers.vabAge === 'age16plus') rows.push([c.olderTitle, c.olderWhy, source12Plus]);
    else rows.push([c.ageUnknownTitle, c.ageUnknownWhy, source12Plus]);

    if (answers.vabAge === 'age12_15') {
      if (answers.vabPrior === 'yes') rows.push([c.priorYesTitle, c.priorYesWhy, source12Plus]);
      else if (answers.vabPrior === 'no') rows.push([c.priorNoTitle, c.priorNoWhy, source12Plus]);
      else rows.push([c.priorUnsureTitle, c.priorUnsureWhy, source12Plus]);
    }

    if (answers.vabSelfSick === 'no') rows.push([c.normalTitle, c.normalWhy, answers.vabAge === 'under12' ? sourceUnder12 : source12Plus]);
    return rows.slice(0, 4);
  };

  results = function() {
    if (scenario !== 'vab') return baseResults();
    const rows = getRows();
    return `${back()}<section class="card"><h1>${tr('results')}</h1><div class="notice">${tr('disclaimer')}</div></section>${rows.map((r,i)=>resultCard(r,i+2)).join('')}${actionPlan()}<section class="card"><h2>${tr('finish')}</h2>${finalQuestion('new','newQ')}${finalQuestion('useful','usefulQ')}${finalQuestion('clear','clearQ')}<div class="summary">🔒 ${tr('sendNote')}</div><button class="btn primary share" ${submitState==='sending'||submitState==='sent'?'disabled':''} onclick="submitFeedback()">${tr('send')}</button>${statusHtml()}</section>`;
  };

  if (screen === 'home') {
    scenario = 'vab';
    answers = {};
    matchRatings = {};
    finalFeedback = {};
    submitState = 'idle';
    screen = 'vab1';
    render();
  }
})();