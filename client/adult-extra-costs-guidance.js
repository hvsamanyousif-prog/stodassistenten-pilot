(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.STODAdultExtraCostsGuidance = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // Same-product guidance only. This route helps a person discover whether
  // adult merkostnadsersättning is worth checking. It never decides eligibility,
  // amount, approval or which individual cost Försäkringskassan will accept.
  const FK_URL = 'https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/merkostnadsersattning-for-vuxna';
  const FK_EXPLAIN_URL = 'https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/sa-har-fungerar-merkostnadsersattning';
  const FEEDBACK_URL = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';

  const DIRECT_PATTERNS = [
    /(?:funktionsnedsättning|funktionshinder|nedsatt\s+funktion|sjukdom).*(?:extra\s+kostnad|merkostnad|dyrare|kostar\s+mer)/i,
    /(?:extra\s+kostnad|merkostnad|dyrare|kostar\s+mer).*(?:funktionsnedsättning|funktionshinder|nedsatt\s+funktion|sjukdom)/i,
    /merkostnadsersättning/i,
    /(?:إعاقة|عجز|مرض).*(?:تكاليف\s+إضافية|مصاريف\s+إضافية|أغلى)/i,
    /(?:تكاليف\s+إضافية|مصاريف\s+إضافية|أغلى).*(?:إعاقة|عجز|مرض)/i,
    /(?:معلولیت|ناتوانی|بیماری).*(?:هزینه(?:‌|\s)*اضافی|هزینه(?:‌|\s)*بیشتر|گران)/i,
    /(?:هزینه(?:‌|\s)*اضافی|هزینه(?:‌|\s)*بیشتر|گران).*(?:معلولیت|ناتوانی|بیماری)/i,
  ];

  const COPY = {
    sv: {
      shellTitle: 'Extra kostnader vid funktionsnedsättning',
      shellSub: 'Skilj merkostnad från vanlig kostnad och kontrollera vem som faktiskt betalar',
      eyebrow: 'Funktionsnedsättning · extra kostnader',
      title: 'Vilka extra kostnader är värda att kontrollera?',
      intro: 'Stödassistenten hjälper dig sortera vägen till merkostnadsersättning utan att avgöra rätt, belopp eller vilka kostnader Försäkringskassan kommer att godta.',
      qExtra: 'Gäller kostnaderna sådant du behöver betala extra på grund av funktionsnedsättningen – inte vanliga kostnader som alla har?',
      qPayer: 'Vem betalar kostnaderna du vill kontrollera?',
      qApplicant: 'Vilken ålders-/studiesituation gäller?',
      yes: 'Ja', no: 'Nej', unsure: 'Vet inte / behöver kontrollera',
      self: 'Jag betalar dem själv', other: 'Region, kommun, assistansersättning eller annat stöd betalar dem', mixed: 'Både jag och någon annan betalar / osäker',
      age21: '21 år eller äldre', age18Finished: '18–20 år och klar med grund-/gymnasieskola eller motsvarande', age18Studying: '18–20 år och studerar fortfarande på den nivån', ageUnsure: 'Osäker',
      candidateTitle: 'Det här är en relevant kandidat att verifiera',
      candidateBody: 'Förbered en enkel lista utanför Stödassistenten: vilken kostnad det gäller, varför den uppstår på grund av funktionsnedsättningen, ungefärlig kostnad per år och vem som betalar. Försäkringskassan bedömer varje kostnad för sig.',
      payerTitle: 'Separera kostnader som någon annan redan betalar',
      payerBody: 'Försäkringskassan anger att merkostnadsersättning bara kan avse kostnader du själv betalar. Kostnader som region, kommun eller assistansersättning redan står för får därför inte räknas en gång till som samma merkostnad.',
      parentTitle: 'Vem som ansöker ändras för vissa 18–20-åringar',
      parentBody: 'Försäkringskassan anger att föräldrar ansöker i stället när personen är 18–20 år och fortfarande studerar på grund-/gymnasienivå eller motsvarande. Kontrollera den aktuella ansökningsvägen innan ni skickar in.',
      verifyTitle: 'Kontrollera den avgörande uppgiften först',
      verifyBody: 'Vanlig hushållskostnad, diagnos eller ett ungefärligt totalbelopp räcker inte för att avgöra vägen. Kontrollera om kostnaden faktiskt är extra på grund av funktionsnedsättningen, vem som betalar och rätt sökande innan du går vidare.',
      source: 'Försäkringskassan: merkostnadsersättning för vuxna', sourceExplain: 'Försäkringskassan: vanliga frågor om merkostnader',
      privacy: 'Vi skickar inte diagnos, kostnadsbelopp, kvitton, kommun/region, identitet eller din berättelse i URL eller feedback.',
      home: 'Till Stödassistentens startsida', feedback: 'Hjälp oss förbättra den här vägen', learned: 'Fick du reda på något nytt?', useful: 'Var hjälpen användbar?', clear: 'Var nästa steg tydligt?', send: 'Skicka anonym feedback', sent: 'Tack! Endast strukturerad produktfeedback skickades.', error: 'Feedbacken kunde inte skickas just nu.'
    },
    ar: {
      shellTitle: 'تكاليف إضافية بسبب الإعاقة', shellSub: 'ميّز التكلفة الإضافية عن التكلفة العادية وتحقق ممن يدفع فعلياً', eyebrow: 'إعاقة · تكاليف إضافية', title: 'ما التكاليف الإضافية التي تستحق التحقق؟', intro: 'يساعدك Stödassistenten على ترتيب طريق merkostnadsersättning من دون تقرير الاستحقاق أو المبلغ أو قبول تكلفة معينة.',
      qExtra: 'هل هي تكاليف إضافية بسبب الإعاقة وليست مصاريف عادية لدى الجميع؟', qPayer: 'من يدفع التكاليف التي تريد التحقق منها؟', qApplicant: 'ما حالة العمر/الدراسة؟', yes:'نعم', no:'لا', unsure:'لا أعرف / أحتاج للتحقق', self:'أنا أدفعها بنفسي', other:'المنطقة أو البلدية أو assistansersättning أو دعم آخر يدفعها', mixed:'أنا وجهة أخرى ندفع / غير متأكد', age21:'21 سنة أو أكثر', age18Finished:'18–20 وأنهيت المدرسة الأساسية/الثانوية أو ما يعادلها', age18Studying:'18–20 وما زلت أدرس على هذا المستوى', ageUnsure:'غير متأكد',
      candidateTitle:'هذا مسار يستحق التحقق', candidateBody:'جهّز قائمة خارج Stödassistenten: نوع التكلفة، لماذا تنشأ بسبب الإعاقة، تقدير سنوي تقريبي ومن يدفعها. Försäkringskassan يقيّم كل تكلفة على حدة.', payerTitle:'افصل التكاليف التي تدفعها جهة أخرى', payerBody:'توضح Försäkringskassan أن التعويض يتعلق بالتكاليف التي تدفعها بنفسك. لا تعدّ التكلفة نفسها مرة أخرى إذا كانت المنطقة أو البلدية أو assistansersättning تدفعها.', parentTitle:'قد يتغير مقدم الطلب لبعض من أعمارهم 18–20', parentBody:'توضح Försäkringskassan أن الوالدين يتقدمان بدلاً من الشخص إذا كان عمره 18–20 وما زال يدرس على المستوى الأساسي/الثانوي أو ما يعادله. تحقق من المسار الحالي قبل التقديم.', verifyTitle:'تحقق من المعلومة الحاسمة أولاً', verifyBody:'المصروف العادي أو التشخيص أو مجموع تقريبي لا يكفي. تحقق هل التكلفة إضافية فعلاً بسبب الإعاقة، من يدفعها ومن يجب أن يقدم الطلب.', source:'Försäkringskassan: merkostnadsersättning للبالغين', sourceExplain:'Försäkringskassan: أسئلة شائعة عن التكاليف الإضافية', privacy:'لا نرسل التشخيص أو المبالغ أو الإيصالات أو البلدية/المنطقة أو الهوية أو قصتك في الرابط أو الملاحظات.', home:'إلى الصفحة الرئيسية', feedback:'ساعدنا على تحسين هذا المسار', learned:'هل عرفت شيئاً جديداً؟', useful:'هل كانت المساعدة مفيدة؟', clear:'هل كانت الخطوة التالية واضحة؟', send:'إرسال ملاحظات مجهولة', sent:'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', error:'تعذر إرسال الملاحظات الآن.'
    },
    fa: {
      shellTitle:'هزینه‌های اضافی به دلیل معلولیت', shellSub:'هزینه اضافی را از هزینه عادی جدا کن و مشخص کن چه کسی آن را می‌پردازد', eyebrow:'معلولیت · هزینه اضافی', title:'کدام هزینه‌های اضافی ارزش بررسی دارند؟', intro:'Stödassistenten مسیر بررسی merkostnadsersättning را مرتب می‌کند، اما درباره استحقاق، مبلغ یا پذیرفته‌شدن یک هزینه تصمیم نمی‌گیرد.',
      qExtra:'آیا هزینه واقعاً به علت معلولیت اضافه شده و جزو هزینه‌های عادی همه نیست؟', qPayer:'هزینه‌ای را که می‌خواهی بررسی کنی چه کسی می‌پردازد؟', qApplicant:'وضعیت سن/تحصیل کدام است؟', yes:'بله', no:'خیر', unsure:'نمی‌دانم / باید بررسی کنم', self:'خودم می‌پردازم', other:'منطقه، شهرداری، assistansersättning یا حمایت دیگری می‌پردازد', mixed:'هم من و هم نهاد دیگری / مطمئن نیستم', age21:'۲۱ سال یا بیشتر', age18Finished:'۱۸–۲۰ و دوره پایه/دبیرستان یا معادل را تمام کرده‌ام', age18Studying:'۱۸–۲۰ و هنوز در همان سطح درس می‌خوانم', ageUnsure:'مطمئن نیستم',
      candidateTitle:'این مسیر ارزش بررسی دارد', candidateBody:'بیرون از Stödassistenten یک فهرست ساده آماده کن: نوع هزینه، چرا به علت معلولیت ایجاد شده، برآورد تقریبی سالانه و چه کسی آن را می‌پردازد. Försäkringskassan هر هزینه را جداگانه ارزیابی می‌کند.', payerTitle:'هزینه‌هایی را که دیگران می‌پردازند جدا کن', payerBody:'Försäkringskassan می‌گوید فقط هزینه‌ای که خودت پرداخت می‌کنی می‌تواند مبنای این جبران باشد. هزینه‌ای را که منطقه، شهرداری یا assistansersättning پرداخته دوباره به عنوان همان هزینه حساب نکن.', parentTitle:'برای بعضی افراد ۱۸–۲۰ ساله، متقاضی تغییر می‌کند', parentBody:'طبق راهنمای فعلی Försäkringskassan، اگر فرد ۱۸–۲۰ ساله هنوز در سطح پایه/دبیرستان یا معادل تحصیل می‌کند، والدین درخواست می‌دهند. پیش از ارسال مسیر فعلی را بررسی کنید.', verifyTitle:'اول واقعیت تعیین‌کننده را روشن کن', verifyBody:'هزینه معمول خانوار، تشخیص یا یک جمع تقریبی کافی نیست. روشن کن هزینه واقعاً به علت معلولیت اضافه است، چه کسی آن را می‌پردازد و متقاضی درست چه کسی است.', source:'Försäkringskassan: merkostnadsersättning برای بزرگسالان', sourceExplain:'Försäkringskassan: پرسش‌های رایج درباره هزینه اضافی', privacy:'تشخیص، مبلغ، رسید، شهرداری/منطقه، هویت یا داستان شما در لینک یا بازخورد ارسال نمی‌شود.', home:'بازگشت به صفحه اصلی', feedback:'به بهبود این مسیر کمک کنید', learned:'چیز تازه‌ای فهمیدید؟', useful:'کمک مفید بود؟', clear:'گام بعدی روشن بود؟', send:'ارسال بازخورد ناشناس', sent:'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', error:'ارسال بازخورد اکنون ممکن نیست.'
    }
  };

  function safeLang(value) { const lang = String(value || '').toLowerCase(); return ['sv','ar','fa'].includes(lang) ? lang : 'sv'; }
  function detect(text) { return DIRECT_PATTERNS.some((pattern) => pattern.test(String(text || ''))); }
  function handoffHref(lang) { return `person-pilot.html?actor_type=private_person&focus=adult_extra_costs&lang=${encodeURIComponent(safeLang(lang))}`; }
  function nextStep(state) {
    if (!state.extra) return 'ask_extra';
    if (state.extra !== 'yes') return 'verify_extra_cost';
    if (!state.payer) return 'ask_payer';
    if (!state.applicant) return 'ask_applicant';
    if (state.applicant === 'age18Studying') return 'parent_application_boundary';
    if (state.payer === 'other') return 'separate_other_payer';
    if (state.payer === 'mixed' || state.applicant === 'ageUnsure') return 'verify_missing_fact';
    return 'verify_candidate';
  }
  function pageLang(win) { const p = new URLSearchParams(win.location.search); return safeLang(p.get('lang') || win.document.documentElement.lang); }
  function rootHandoff(win) {
    const doc = win.document; const input = doc.getElementById('situation'); const box = doc.getElementById('engineResults');
    if (!input || !box || box.hidden || !detect(input.value)) return false;
    if (box.querySelector('[data-adult-extra-costs-route="true"]')) return true;
    const lang = pageLang(win), c = COPY[lang]; const route = doc.createElement('a'); route.className = 'route'; route.dataset.adultExtraCostsRoute = 'true'; route.href = handoffHref(lang);
    const left = doc.createElement('span'); const title = doc.createElement('strong'); title.textContent = c.shellTitle; const sub = doc.createElement('small'); sub.textContent = c.shellSub; left.append(title, sub);
    const arrow = doc.createElement('span'); arrow.className = 'arrow'; arrow.setAttribute('aria-hidden','true'); arrow.textContent = '→'; route.append(left, arrow); box.insertBefore(route, box.querySelector('a.route') || null); return true;
  }
  function focusedApp(win) {
    const doc = win.document, main = doc.getElementById('main'); if (!main) return; const lang = pageLang(win), c = COPY[lang]; const state = {}, feedback = {};
    doc.documentElement.lang = lang; doc.documentElement.dir = (lang === 'ar' || lang === 'fa') ? 'rtl' : 'ltr'; doc.body.classList.toggle('rtl', lang === 'ar' || lang === 'fa');
    function choice(label, fn) { const b=doc.createElement('button'); b.type='button'; b.className='choice'; b.textContent=label; b.addEventListener('click',fn); return b; }
    function question(title, key, options) { const card=doc.createElement('section'); card.className='card'; const h=doc.createElement('h2'); h.textContent=title; card.append(h); options.forEach(([value,label])=>card.append(choice(label,()=>{state[key]=value;render();}))); return card; }
    function link(url,label){const a=doc.createElement('a');a.className='source';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;}
    function result(kind){const card=doc.createElement('section');card.className='card';const h=doc.createElement('h2'),p=doc.createElement('p');
      if(kind==='verify_candidate'){h.textContent=c.candidateTitle;p.textContent=c.candidateBody;} else if(kind==='separate_other_payer'){h.textContent=c.payerTitle;p.textContent=c.payerBody;} else if(kind==='parent_application_boundary'){h.textContent=c.parentTitle;p.textContent=c.parentBody;} else {h.textContent=c.verifyTitle;p.textContent=c.verifyBody;}
      const sources=doc.createElement('p');sources.append(link(FK_URL,c.source),doc.createTextNode(' · '),link(FK_EXPLAIN_URL,c.sourceExplain));const privacy=doc.createElement('div');privacy.className='privacy';privacy.textContent=c.privacy;const home=doc.createElement('p');const a=doc.createElement('a');a.className='source';a.href=`index.html?lang=${encodeURIComponent(lang)}`;a.textContent=c.home;home.append(a);card.append(h,p,sources,privacy,home);return card;}
    function feedbackCard(){const card=doc.createElement('section');card.className='card';const h=doc.createElement('h3');h.textContent=c.feedback;card.append(h);[['learned_new',c.learned],['useful',c.useful],['next_step_clear',c.clear]].forEach(([key,label])=>{const p=doc.createElement('p');p.textContent=label;card.append(p);const row=doc.createElement('div');row.className='fbs';[[true,c.yes],[false,c.no]].forEach(([value,label2])=>{const b=choice(label2,()=>{feedback[key]=value;Array.from(row.children).forEach(x=>x.classList.remove('selected'));b.classList.add('selected');});b.className='fb';row.append(b);});card.append(row);});const send=doc.createElement('button');send.type='button';send.className='btn primary';send.textContent=c.send;const status=doc.createElement('div');status.className='status';send.addEventListener('click',async()=>{if(!['learned_new','useful','next_step_clear'].every(k=>typeof feedback[k]==='boolean')){status.textContent=c.error;status.className='status err';return;}send.disabled=true;try{const res=await win.fetch(FEEDBACK_URL,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_version:'0.5.0',language:lang,flow:'adult_extra_costs',learned_new:feedback.learned_new,useful:feedback.useful,next_step_clear:feedback.next_step_clear,ratings:{route:'adult_extra_costs'}})});if(!res.ok)throw new Error('feedback');status.textContent=c.sent;status.className='status ok';}catch(_){status.textContent=c.error;status.className='status err';}finally{send.disabled=false;}});card.append(send,status);return card;}
    function render(){main.textContent='';const hero=doc.createElement('section');hero.className='card hero';const eye=doc.createElement('div');eye.className='eyebrow';eye.textContent=c.eyebrow;const h=doc.createElement('h1');h.textContent=c.title;const p=doc.createElement('p');p.className='muted';p.textContent=c.intro;hero.append(eye,h,p);main.append(hero);const step=nextStep(state);if(step==='ask_extra')main.append(question(c.qExtra,'extra',[['yes',c.yes],['no',c.no],['unsure',c.unsure]]));else if(step==='ask_payer')main.append(question(c.qPayer,'payer',[['self',c.self],['other',c.other],['mixed',c.mixed]]));else if(step==='ask_applicant')main.append(question(c.qApplicant,'applicant',[['age21',c.age21],['age18Finished',c.age18Finished],['age18Studying',c.age18Studying],['ageUnsure',c.ageUnsure]]));else main.append(result(step),feedbackCard());}
    render();
  }
  function hookRoot(win){const button=win.document.getElementById('analyzeBtn'),input=win.document.getElementById('situation');if(!button||!input)return;button.addEventListener('click',()=>win.setTimeout(()=>rootHandoff(win),0));input.addEventListener('keydown',(e)=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')win.setTimeout(()=>rootHandoff(win),0);});}
  function hookPerson(win){const p=new URLSearchParams(win.location.search);if(String(p.get('focus')||'').toLowerCase()==='adult_extra_costs')focusedApp(win);}
  function init(win){const path=(win.location.pathname||'').split('/').pop();if(!path||path==='index.html')hookRoot(win);if(path==='person-pilot.html')hookPerson(win);}
  return {detect,handoffHref,nextStep,rootHandoff,init,FK_URL,FK_EXPLAIN_URL};
});
