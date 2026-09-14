(() => {
  const params = new URLSearchParams(window.location.search);
  const focus = String(params.get('focus') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  if (focus !== 'property_accessibility') return;
  if (typeof flow !== 'function' || typeof getRows !== 'function' || typeof results !== 'function' || typeof render !== 'function') return;

  const sourceTakeover = 'https://www.boverket.se/sv/babhandboken/bostadsanpassningsbidrag/hyresvardbostadsrattforening-kan-overta-ratten-till-bidrag/';
  const sourceConsent = 'https://www.boverket.se/sv/babhandboken/bostadsanpassningsbidrag/handlaggning/guide-for-handlaggning/Fastighetsagarens-medgivande/';
  const sourceRestoration = 'https://www.boverket.se/sv/babhandboken/aterstallningsbidrag/villkor-for-aterstallningsbidrag/vem-kan-beviljas-aterstallningsbidrag/';

  const copy = {
    sv: {
      initialTitle:'Börja med rätt sökande',
      initialWhy:'Personen med funktionsnedsättningen är den ursprungliga sökanden. BRF eller hyresvärd kan behöva lämna medgivande, men det är inte samma sak som att fastighetsägaren söker bidraget från början.',
      insideTitle:'Åtgärd inne i lägenheten – använd inte övertagandevägen',
      insideWhy:'Boverkets övertagandeväg för ägare av flerbostadshus gäller åtgärder i anslutning till lägenheten, till exempel entré eller trapphus, inte åtgärder inne i lägenheten.',
      commonBeforeTitle:'Gemensamt utrymme men inget beviljat kontantbidrag ännu',
      commonBeforeWhy:'Skilj fastighetsägarens medgivande från ett senare övertagande. Övertagande blir aktuellt först efter att personen har beviljats bostadsanpassningsbidrag som kontantbidrag och övriga villkor är uppfyllda.',
      commonTakeoverTitle:'Övertagande kräver frivillig överenskommelse och skriftligt underlag',
      commonTakeoverWhy:'Om ett beviljat kontantbidrag gäller en åtgärd i gemensamt utrymme kan sökanden och ägaren frivilligt komma överens om övertagande. Före utbetalning behöver kommunen skriftligt underlag om överenskommelsen och ägarens åtagande att utföra åtgärden.',
      commonNoTakeoverTitle:'Medgivande är inte samma sak som övertagande',
      commonNoTakeoverWhy:'Om parterna inte vill använda övertagandevägen ska ni inte behandla den som automatisk. Kontrollera med kommunen hur det redan beviljade ärendet ska genomföras och vilka medgivanden som gäller.',
      laterTitle:'Reparation och återställning är separata frågor',
      laterWhy:'Om fastighetsägaren har övertagit rätten till bidraget påverkar det senare möjligheter till reparations- och återställningsbidrag. Kontrollera den aktuella Boverket-regeln innan ni planerar en senare kostnad.',
      unsureTitle:'Red ut plats och beslutsläge först',
      unsureWhy:'Om det är oklart om åtgärden ligger inne i lägenheten eller i gemensamt utrymme, eller om ett kontantbidrag redan är beviljat, behöver de uppgifterna klarläggas innan övertagande kan bedömas.'
    },
    ar: {
      initialTitle:'ابدأ بمقدم الطلب الصحيح',
      initialWhy:'الشخص ذو الإعاقة هو مقدم الطلب الأصلي. قد تحتاج الجمعية السكنية أو المالك إلى إعطاء موافقة، لكن ذلك لا يعني أن مالك العقار هو من يطلب المنحة منذ البداية.',
      insideTitle:'تعديل داخل الشقة – لا تستخدم مسار نقل الحق',
      insideWhy:'مسار نقل الحق إلى مالك المبنى المتعدد الشقق يتعلق بالتعديلات قرب الشقة وفي المساحات المشتركة، وليس داخل الشقة.',
      commonBeforeTitle:'مساحة مشتركة لكن لا توجد منحة نقدية ممنوحة بعد',
      commonBeforeWhy:'افصل بين موافقة المالك وبين نقل الحق لاحقاً. يصبح نقل الحق ممكناً فقط بعد منح الشخص دعماً نقدياً لتكييف السكن واستيفاء الشروط الأخرى.',
      commonTakeoverTitle:'نقل الحق يحتاج اتفاقاً طوعياً ومستنداً خطياً',
      commonTakeoverWhy:'إذا كانت المنحة النقدية الممنوحة تخص مساحة مشتركة يمكن لمقدم الطلب والمالك الاتفاق طوعياً على نقل الحق. قبل الدفع تحتاج البلدية إلى مستند خطي يثبت الاتفاق والتزام المالك بتنفيذ الإجراء.',
      commonNoTakeoverTitle:'الموافقة ليست هي نقل الحق',
      commonNoTakeoverWhy:'إذا لم يرغب الطرفان في نقل الحق فلا تتعامل معه كإجراء تلقائي. تحقق مع البلدية من طريقة تنفيذ القرار ومن الموافقات المطلوبة.',
      laterTitle:'الإصلاح وإعادة الحال مساران منفصلان',
      laterWhy:'إذا تولى مالك العقار الحق في المنحة فإن ذلك يؤثر في إمكانات الدعم اللاحق للإصلاح أو إعادة الحال. تحقق من قاعدة Boverket الحالية قبل التخطيط لتكاليف لاحقة.',
      unsureTitle:'وضّح مكان التعديل ومرحلة القرار أولاً',
      unsureWhy:'إذا لم يكن واضحاً هل التعديل داخل الشقة أم في مساحة مشتركة، أو هل مُنحت منحة نقدية بالفعل، فيجب توضيح ذلك قبل تقييم مسار نقل الحق.'
    },
    fa: {
      initialTitle:'از متقاضی درست شروع کنید',
      initialWhy:'فرد دارای معلولیت متقاضی اولیه است. انجمن ساختمان یا مالک ممکن است لازم باشد رضایت بدهد، اما این با درخواست اولیه توسط مالک یکی نیست.',
      insideTitle:'تغییر داخل واحد – مسیر انتقال حق را استفاده نکنید',
      insideWhy:'مسیر انتقال حق به مالک ساختمان چندواحدی برای تغییرات در مجاورت واحد و فضاهای مشترک است، نه داخل خود واحد.',
      commonBeforeTitle:'فضای مشترک است اما هنوز کمک نقدی تصویب نشده',
      commonBeforeWhy:'رضایت مالک را از انتقال بعدی حق جدا کنید. انتقال حق زمانی مطرح می‌شود که کمک نقدی مناسب‌سازی به فرد اعطا شده باشد و سایر شرایط نیز برقرار باشد.',
      commonTakeoverTitle:'انتقال حق به توافق داوطلبانه و مدرک کتبی نیاز دارد',
      commonTakeoverWhy:'اگر کمک نقدی مصوب مربوط به فضای مشترک باشد، متقاضی و مالک می‌توانند داوطلبانه درباره انتقال حق توافق کنند. پیش از پرداخت، شهرداری به مدرک کتبی توافق و تعهد مالک به اجرای کار نیاز دارد.',
      commonNoTakeoverTitle:'رضایت با انتقال حق یکی نیست',
      commonNoTakeoverWhy:'اگر طرفین انتقال حق را نمی‌خواهند، آن را خودکار فرض نکنید. با شهرداری بررسی کنید پرونده مصوب چگونه اجرا شود و چه رضایت‌هایی لازم است.',
      laterTitle:'تعمیر و بازگرداندن وضعیت پرسش‌های جداگانه‌اند',
      laterWhy:'اگر مالک حق کمک را تحویل گرفته باشد، این موضوع بر مسیرهای بعدی کمک تعمیر یا بازگرداندن وضعیت اثر می‌گذارد. پیش از برنامه‌ریزی هزینه بعدی، قانون فعلی Boverket را بررسی کنید.',
      unsureTitle:'ابتدا محل تغییر و مرحله تصمیم را روشن کنید',
      unsureWhy:'اگر معلوم نیست تغییر داخل واحد است یا فضای مشترک، یا اینکه کمک نقدی قبلاً تصویب شده، این اطلاعات باید قبل از بررسی انتقال حق روشن شود.'
    }
  };

  Object.assign(T.sv, {
    propWhere:'Åtgärden gäller främst…', propCommon:'Entré, trapphus eller annat gemensamt utrymme', propInside:'Inne i lägenheten', propWhereUnsure:'Osäker',
    propStage:'Var är ärendet nu?', propBefore:'Personen har inte fått ett positivt kontantbidragsbeslut ännu', propGranted:'Personen har fått ett positivt kontantbidragsbeslut', propExisting:'Anpassningen finns redan – frågan gäller reparation/återställning', propStageUnsure:'Osäker',
    propAgreement:'Överväger både personen och fastighetsägaren ett frivilligt övertagande?', propAgreeYes:'Ja', propAgreeNo:'Nej', propAgreeUnsure:'Osäker'
  });
  Object.assign(T.ar, {
    propWhere:'أين يقع التعديل أساساً؟', propCommon:'المدخل أو الدرج أو مساحة مشتركة أخرى', propInside:'داخل الشقة', propWhereUnsure:'غير متأكد',
    propStage:'في أي مرحلة القضية؟', propBefore:'لم يحصل الشخص بعد على قرار إيجابي بمنحة نقدية', propGranted:'حصل الشخص على قرار إيجابي بمنحة نقدية', propExisting:'التعديل موجود بالفعل والسؤال عن الإصلاح/إعادة الحال', propStageUnsure:'غير متأكد',
    propAgreement:'هل يفكر الشخص ومالك العقار معاً في نقل الحق طوعياً؟', propAgreeYes:'نعم', propAgreeNo:'لا', propAgreeUnsure:'غير متأكد'
  });
  Object.assign(T.fa, {
    propWhere:'تغییر عمدتاً کجاست؟', propCommon:'ورودی، راه‌پله یا فضای مشترک دیگر', propInside:'داخل واحد', propWhereUnsure:'مطمئن نیستم',
    propStage:'پرونده در چه مرحله‌ای است؟', propBefore:'هنوز تصمیم مثبت کمک نقدی صادر نشده', propGranted:'تصمیم مثبت کمک نقدی صادر شده', propExisting:'تغییر از قبل وجود دارد و پرسش درباره تعمیر/بازگرداندن است', propStageUnsure:'مطمئن نیستم',
    propAgreement:'آیا فرد و مالک هر دو انتقال داوطلبانه حق را در نظر دارند؟', propAgreeYes:'بله', propAgreeNo:'نه', propAgreeUnsure:'مطمئن نیستم'
  });

  const currentLang=()=>copy[document.documentElement.lang]?document.documentElement.lang:'sv';
  const baseFlow=flow;
  const baseGetRows=getRows;
  const baseResults=results;
  const needsAgreement=()=>answers.propWhere==='common'&&answers.propStage==='granted';

  flow=function(){
    if(screen==='property1')return q('propWhere',[['propCommon','property2','propWhere','common'],['propInside','property2','propWhere','inside'],['propWhereUnsure','property2','propWhere','unsure']],'home','1');
    if(screen==='property2')return q('propStage',[['propBefore','propertyR','propStage','before'],['propGranted',answers.propWhere==='common'?'property3':'propertyR','propStage','granted'],['propExisting','propertyR','propStage','existing'],['propStageUnsure','propertyR','propStage','unsure']],'property1','2');
    if(screen==='property3')return q('propAgreement',[['propAgreeYes','propertyR','propAgreement','yes'],['propAgreeNo','propertyR','propAgreement','no'],['propAgreeUnsure','propertyR','propAgreement','unsure']],'property2','3');
    return baseFlow();
  };

  getRows=function(){
    if(scenario!=='property')return baseGetRows();
    const c=copy[currentLang()]||copy.sv;
    const rows=[];
    rows.push([c.initialTitle,c.initialWhy,sourceConsent]);
    if(answers.propWhere==='inside')rows.push([c.insideTitle,c.insideWhy,sourceTakeover]);
    else if(answers.propWhere==='common'&&answers.propStage==='before')rows.push([c.commonBeforeTitle,c.commonBeforeWhy,sourceTakeover]);
    else if(needsAgreement()&&answers.propAgreement==='yes')rows.push([c.commonTakeoverTitle,c.commonTakeoverWhy,sourceTakeover]);
    else if(needsAgreement()&&(answers.propAgreement==='no'||answers.propAgreement==='unsure'))rows.push([c.commonNoTakeoverTitle,c.commonNoTakeoverWhy,sourceTakeover]);
    else if(answers.propWhere==='unsure'||answers.propStage==='unsure')rows.push([c.unsureTitle,c.unsureWhy,sourceTakeover]);
    if(answers.propStage==='existing'||answers.propAgreement==='yes')rows.push([c.laterTitle,c.laterWhy,sourceRestoration]);
    return rows.slice(0,4);
  };

  results=function(){
    if(scenario!=='property')return baseResults();
    const rows=getRows();
    return `${back()}<section class="card"><h1>${tr('results')}</h1><div class="notice">${tr('disclaimer')}</div></section>${rows.map((r,i)=>resultCard(r,i+2)).join('')}${actionPlan()}<section class="card"><h2>${tr('finish')}</h2>${finalQuestion('new','newQ')}${finalQuestion('useful','usefulQ')}${finalQuestion('clear','clearQ')}<div class="summary">🔒 ${tr('sendNote')}</div><button class="btn primary share" ${submitState==='sending'||submitState==='sent'?'disabled':''} onclick="submitFeedback()">${tr('send')}</button>${statusHtml()}</section>`;
  };

  if(screen==='home'){
    scenario='property';answers={};matchRatings={};finalFeedback={};submitState='idle';screen='property1';render();
  }
})();
