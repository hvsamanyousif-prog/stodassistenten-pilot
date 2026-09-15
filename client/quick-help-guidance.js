(() => {
  const params=new URLSearchParams(location.search);
  const mode=(params.get('mode')||'').toLowerCase();
  const need=(params.get('need')||'').toLowerCase();
  const results=document.getElementById('results');
  const content=document.querySelector('.content');
  const question=document.getElementById('question');
  if(!results||!content||!question) return;

  const HEALTHCARE_NEEDS=new Set(['care','medicine','boundary','dental','unsure']);
  const HEALTH_COPY={
    sv:{eyebrow:'Vårdkostnader · guidad väg',title:'Skilj på vårdbesök och läkemedel först.',sub:'De har olika högkostnadsskydd. Vi visar rätt originalkälla utan att gissa belopp.',step:'Välj det som kostnaden gäller',question:'Vad gäller kostnaden främst?',questionSub:'Vi frågar bara det som kan ändra nästa väg.',suggest:'Föreslaget',start:'Börja här',next:'Nästa steg',source:'Officiell källa',internal:'Fortsätt i Stödassistenten',change:'Ändra väg',notice:'Stödassistenten avgör inte din rätt till ersättning eller vilket belopp som gäller. Patientavgifter kan bero på region och läkemedelsregler kan ändras över tid.',options:{care:['Vårdbesök eller frikort','Patientavgift för vårdcentral, mottagning eller annan öppenvård.'],medicine:['Läkemedel på recept','Kostnad på apotek, läkemedelsfrikort eller högkostnadsskydd för läkemedel.'],boundary:['Jag undrar om samma frikort gäller för vård och läkemedel','Visa skillnaden mellan systemen utan att gissa belopp.'],dental:['Tandvård','Tandvård har en egen stöd- och kostnadsväg.'],unsure:['Jag är osäker vilket frikort som gäller','Visa skillnaden mellan vårdbesök och receptläkemedel först.']},results:{care:[['Frikort för öppenvård','1177 beskriver högkostnadsskyddet för öppenvårdsbesök. Patientavgifter och hantering kan skilja mellan regioner.','Öppna 1177 och kontrollera informationen för din region. Vi gissar inte aktuell patientavgift eller hur mycket du har kvar.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source']],medicine:[['Läkemedel har ett eget högkostnadsskydd','E-hälsomyndigheten ansvarar för högkostnadsdatabasen för läkemedel. Det här skyddet är separat från frikortet för vårdbesök.','Kontrollera din aktuella läkemedelsnivå via E-hälsomyndighetens information, Läkemedelskollen eller apotek. Exakta nivåer kan bero på när din högkostnadsperiod startade.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']],boundary:[['Två separata högkostnadsskydd','Frikort för öppenvårdsbesök och högkostnadsskydd för receptläkemedel är separata system. Ett vårdfrikort betyder därför inte automatiskt att receptläkemedel är kostnadsfria.','Kontrollera först ditt vårdfrikort på 1177 för din region och kontrollera sedan läkemedelsskyddet separat.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source'],['Kontrollera läkemedelsskyddet separat','E-hälsomyndigheten ansvarar för högkostnadsdatabasen för läkemedel och visar aktuell väg till Läkemedelskollen.','Kontrollera din aktuella läkemedelsperiod där eller via apotek utan att lämna läkemedels- eller identitetsuppgifter till Stödassistenten.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']],dental:[['Använd den befintliga tandvårdsvägen','Tandvård ska inte blandas ihop med öppenvårdens eller läkemedlens högkostnadsskydd.','Fortsätt till Stödassistentens befintliga tandvårdsväg för kostnad och stöd.','quick-help.html?mode=dental&need=cost','internal']],unsure:[['Vårdbesök och receptläkemedel är två olika vägar','Frikort för öppenvårdsbesök och högkostnadsskydd för läkemedel är separata system.','Välj vårdbesök om det gäller en patientavgift. Välj läkemedel om det gäller recept på apotek.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source'],['Kontrollera läkemedel separat','E-hälsomyndigheten visar den aktuella informationen för läkemedlens högkostnadsskydd.','Om frågan gäller receptläkemedel, kontrollera läkemedelsvägen separat från ditt vårdfrikort.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']]}},
    ar:{eyebrow:'تكاليف الرعاية · مسار موجه',title:'افصل أولاً بين زيارة الرعاية والدواء.',sub:'لهما نظامان مختلفان للحماية من التكاليف. نعرض المصدر الأصلي ولا نخمن المبالغ.',step:'اختر ما تتعلق به التكلفة',question:'بماذا تتعلق التكلفة أساساً؟',questionSub:'نسأل فقط ما قد يغيّر الخطوة التالية.',suggest:'مقترح',start:'ابدأ هنا',next:'الخطوة التالية',source:'المصدر الرسمي',internal:'تابع في مساعد الدعم',change:'تغيير المسار',notice:'لا يقرر مساعد الدعم استحقاقك أو المبلغ الذي ينطبق عليك. قد تختلف رسوم المرضى حسب المنطقة وقد تتغير قواعد الأدوية مع الوقت.',options:{care:['زيارة رعاية أو بطاقة إعفاء','رسوم مركز صحي أو عيادة أو رعاية خارجية أخرى.'],medicine:['دواء بوصفة','تكلفة الصيدلية أو حماية التكلفة العالية للأدوية.'],boundary:['هل بطاقة الإعفاء نفسها للرعاية والأدوية؟','أظهر الفرق بين النظامين من دون تخمين المبالغ.'],dental:['رعاية الأسنان','للأسنان مسار دعم وتكلفة منفصل.'],unsure:['لست متأكداً أي بطاقة إعفاء تنطبق','أظهر أولاً الفرق بين زيارة الرعاية والدواء الموصوف.']},results:{care:[['بطاقة إعفاء للرعاية الخارجية','يشرح 1177 حماية التكلفة العالية لزيارات الرعاية الخارجية. قد تختلف الرسوم وطريقة الإدارة بين المناطق.','افتح 1177 وتحقق من المعلومات الخاصة بمنطقتك. لا نخمن الرسوم الحالية أو المبلغ المتبقي.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source']],medicine:[['للأدوية حماية تكلفة منفصلة','تدير هيئة الصحة الإلكترونية قاعدة بيانات حماية التكلفة العالية للأدوية. وهي منفصلة عن بطاقة إعفاء زيارات الرعاية.','تحقق من وضعك الحالي عبر معلومات هيئة الصحة الإلكترونية أو Läkemedelskollen أو الصيدلية.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']],boundary:[['نظامان منفصلان للحماية من التكاليف','بطاقة إعفاء الرعاية الخارجية وحماية تكلفة الأدوية الموصوفة نظامان منفصلان؛ بطاقة الرعاية لا تجعل الدواء مجانياً تلقائياً.','تحقق من بطاقة الرعاية في 1177 لمنطقتك ثم تحقق من مسار الأدوية بشكل منفصل.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source'],['تحقق من حماية الأدوية منفصلة','تدير هيئة الصحة الإلكترونية قاعدة بيانات حماية تكلفة الأدوية وتعرض الطريق إلى Läkemedelskollen.','تحقق من فترة الأدوية الحالية هناك أو عبر الصيدلية من دون إرسال بيانات الدواء أو الهوية إلى مساعد الدعم.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']],dental:[['استخدم مسار الأسنان الموجود','لا ينبغي خلط دعم الأسنان مع حماية الرعاية الخارجية أو الأدوية.','تابع إلى مسار الأسنان الموجود في مساعد الدعم.','quick-help.html?mode=dental&need=cost','internal']],unsure:[['زيارات الرعاية والأدوية مساران مختلفان','بطاقة إعفاء الرعاية الخارجية وحماية تكلفة الأدوية نظامان منفصلان.','اختر زيارة الرعاية إذا كان السؤال عن رسوم المريض، واختر الدواء إذا كان عن وصفة في الصيدلية.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source'],['تحقق من الأدوية بشكل منفصل','تعرض هيئة الصحة الإلكترونية المعلومات الحالية عن حماية تكلفة الأدوية.','إذا كان السؤال عن دواء موصوف، فتحقق من مسار الدواء بشكل منفصل عن بطاقة إعفاء الرعاية.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']]}},
    fa:{eyebrow:'هزینه درمان · مسیر هدایت‌شده',title:'اول ویزیت درمان را از دارو جدا کن.',sub:'این دو پوشش هزینه جداگانه دارند. منبع اصلی را نشان می‌دهیم و مبلغ را حدس نمی‌زنیم.',step:'انتخاب کن هزینه مربوط به چیست',question:'هزینه بیشتر مربوط به چیست؟',questionSub:'فقط چیزی را می‌پرسیم که مسیر بعدی را عوض می‌کند.',suggest:'پیشنهاد',start:'از اینجا شروع کن',next:'قدم بعدی',source:'منبع رسمی',internal:'ادامه در دستیار حمایت',change:'تغییر مسیر',notice:'دستیار حمایت درباره استحقاق یا مبلغ قابل اعمال تصمیم نمی‌گیرد. هزینه بیمار می‌تواند با منطقه فرق کند و قوانین دارو ممکن است تغییر کند.',options:{care:['ویزیت درمان یا کارت معافیت','هزینه مرکز درمانی، مطب یا سایر مراقبت‌های سرپایی.'],medicine:['داروی نسخه‌ای','هزینه داروخانه یا پوشش هزینه بالای دارو.'],boundary:['آیا همان کارت معافیت برای درمان و داروست؟','تفاوت دو سیستم را بدون حدس مبلغ نشان بده.'],dental:['دندانپزشکی','دندانپزشکی مسیر حمایت و هزینه جداگانه دارد.'],unsure:['مطمئن نیستم کدام کارت معافیت مربوط است','اول تفاوت ویزیت درمان و داروی نسخه‌ای را نشان بده.']},results:{care:[['کارت معافیت مراقبت سرپایی','۱۱۷۷ پوشش هزینه بالای ویزیت‌های سرپایی را توضیح می‌دهد. هزینه و شیوه مدیریت می‌تواند بین مناطق فرق کند.','اطلاعات منطقه خودت را در ۱۱۷۷ بررسی کن. مبلغ فعلی یا مانده تو را حدس نمی‌زنیم.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source']],medicine:[['دارو پوشش هزینه جداگانه دارد','اداره سلامت الکترونیک سوئد پایگاه پوشش هزینه بالای دارو را مدیریت می‌کند. این پوشش از کارت معافیت ویزیت درمان جداست.','وضعیت فعلی را از اطلاعات اداره سلامت الکترونیک، Läkemedelskollen یا داروخانه بررسی کن.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']],boundary:[['دو پوشش هزینه جداگانه','کارت معافیت مراقبت سرپایی و پوشش هزینه داروی نسخه‌ای دو سیستم جدا هستند؛ کارت درمان به‌طور خودکار دارو را رایگان نمی‌کند.','اول کارت درمان را در ۱۱۷۷ برای منطقه خود بررسی کن و سپس پوشش دارو را جداگانه بررسی کن.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source'],['پوشش دارو را جداگانه بررسی کن','اداره سلامت الکترونیک پایگاه پوشش هزینه دارو را مدیریت می‌کند و مسیر Läkemedelskollen را نشان می‌دهد.','دوره فعلی دارو را آنجا یا از داروخانه بررسی کن بدون اینکه اطلاعات دارو یا هویت را به دستیار حمایت بدهی.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']],dental:[['از مسیر موجود دندانپزشکی استفاده کن','حمایت دندانپزشکی نباید با پوشش مراقبت سرپایی یا دارو یکی شود.','به مسیر موجود دندانپزشکی در دستیار حمایت ادامه بده.','quick-help.html?mode=dental&need=cost','internal']],unsure:[['ویزیت درمان و دارو دو مسیر جدا هستند','کارت معافیت مراقبت سرپایی و پوشش هزینه دارو دو سیستم جدا هستند.','اگر مسئله هزینه ویزیت است مسیر درمان را انتخاب کن؛ اگر نسخه دارویی است مسیر دارو را انتخاب کن.','https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/','source'],['دارو را جداگانه بررسی کن','اداره سلامت الکترونیک اطلاعات جاری پوشش هزینه دارو را ارائه می‌کند.','اگر مسئله داروی نسخه‌ای است، آن را جدا از کارت معافیت درمان بررسی کن.','https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/','source']]}}
  };

  function lang(){const l=document.documentElement.lang||params.get('lang')||'sv';return HEALTH_COPY[l]?l:'sv'}
  function hc(){return HEALTH_COPY[lang()]}
  function withLang(url){const u=new URL(url,location.href);u.searchParams.set('lang',lang());return u.pathname.split('/').pop()+u.search}
  function renderHealthcare(){
    const copy=hc();
    document.getElementById('eyebrow').textContent=copy.eyebrow;
    document.getElementById('title').textContent=copy.title;
    document.getElementById('subtitle').textContent=copy.sub;
    document.getElementById('stepText').textContent=copy.step;
    question.textContent=copy.question;
    document.getElementById('questionSub').textContent=copy.questionSub;
    const choices=document.getElementById('choices');
    const initial=HEALTHCARE_NEEDS.has(need)?need:'unsure';
    const order=[initial,...Object.keys(copy.options).filter(key=>key!==initial)];
    choices.innerHTML=order.map(key=>{const option=copy.options[key];return `<button class="choice ${key===initial?'suggested':''}" data-health-need="${key}" type="button" aria-pressed="false">${key===initial?`<span class="suggest">${copy.suggest}</span>`:''}<b>${option[0]}</b><small>${option[1]}</small></button>`}).join('');
    const firstStep=content.querySelector('.step');
    const questionSub=document.getElementById('questionSub');
    function setDirect(direct){
      if(firstStep) firstStep.hidden=direct;
      question.hidden=direct;
      if(questionSub) questionSub.hidden=direct;
      choices.hidden=direct;
    }
    function show(key,direct=false){
      if(key==='dental'){
        location.href=withLang('quick-help.html?mode=dental&need=cost');
        return;
      }
      const rows=copy.results[key]||copy.results.unsure;
      results.innerHTML=`<div class="resulthead"><div><div class="step"><span>2</span><span>${copy.start}</span></div><h2>${copy.options[key][0]}</h2></div><button class="change" data-health-change type="button">${copy.change}</button></div><div class="cards">${rows.map((row,i)=>`<article class="card ${i===0?'top':''}"><div class="label">${i===0?copy.start:copy.next}</div><h3>${row[0]}</h3><p>${row[1]}</p><div class="next"><b>${copy.next}:</b> ${row[2]}</div><a class="source" href="${row[4]==='internal'?withLang(row[3]):row[3]}" ${row[4]==='source'?'target="_blank" rel="noopener"':''}>${row[4]==='source'?copy.source:copy.internal} <span aria-hidden="true">↗</span></a></article>`).join('')}</div><div class="notice">${copy.notice}</div>`;
      results.hidden=false;
      choices.querySelectorAll('[data-health-need]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.healthNeed===key)));
      const url=new URL(location.href);url.searchParams.set('mode','healthcare');url.searchParams.set('need',key);url.searchParams.delete('q');history.replaceState(null,'',url);
      setDirect(direct);
      if(!direct){results.setAttribute('tabindex','-1');results.focus();}
    }
    choices.querySelectorAll('[data-health-need]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.healthNeed,false)));
    results.addEventListener('click',event=>{
      if(!event.target.closest('[data-health-change]')) return;
      results.hidden=true;setDirect(false);question.setAttribute('tabindex','-1');question.focus();
    });
    show(initial,HEALTHCARE_NEEDS.has(need));
  }

  if(mode==='healthcare'){
    renderHealthcare();
    return;
  }

  const valid={dental:new Set(['cost','care','support','unsure']),vision:new Set(['home','tech','work','unsure'])};
  if(!valid[mode]||!valid[mode].has(need)) return;
  const COPY={
    sv:{eyebrow:'Tolkat behov',lead:'Motorn har redan sorterat din beskrivning till den här vägen.',change:'Ändra väg',source:'Du kan byta om tolkningen inte stämmer.'},
    ar:{eyebrow:'الحاجة التي فُهمت',lead:'صنّف المحرك وصفك بالفعل إلى هذا المسار.',change:'تغيير المسار',source:'يمكنك التغيير إذا لم يكن التفسير صحيحاً.'},
    fa:{eyebrow:'نیاز تشخیص‌داده‌شده',lead:'موتور توضیح تو را مستقیماً به این مسیر هدایت کرده است.',change:'تغییر مسیر',source:'اگر این برداشت درست نیست، می‌توانی مسیر را عوض کنی.'}
  };
  function c(){return COPY[lang()]}

  const style=document.createElement('style');
  style.dataset.quickHelpGuidance='true';
  style.textContent=`
    .guided-direct .content>.step:first-child,.guided-direct #question,.guided-direct #questionSub,.guided-direct #choices{display:none}
    .direct-summary{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;margin:0 0 22px;padding:17px 18px;border:1px solid #cfe0d8;border-radius:18px;background:linear-gradient(135deg,#f7fbf9,#eef7f2)}
    .direct-summary small{display:block;color:#0b5b4d;font-size:11px;font-weight:900;letter-spacing:.055em;text-transform:uppercase;margin-bottom:5px}
    .direct-summary strong{display:block;font-size:18px;line-height:1.3;color:#10241f}
    .direct-summary p{margin:5px 0 0;color:#60716b;font-size:13px;line-height:1.4}
    .direct-change{border:1px solid #a9c4ba;background:#fff;color:#0b5b4d;padding:10px 12px;border-radius:12px;font-weight:850;cursor:pointer;white-space:nowrap}
    .guided-direct #results{margin-top:0;border-top:0;padding-top:0}
    @media(max-width:620px){.direct-summary{grid-template-columns:1fr}.direct-change{width:100%}}
  `;
  document.head.appendChild(style);

  let summary=null;
  function selectedLabel(){return (results.querySelector('.resulthead h2')?.textContent||'').trim()}
  function renderSummary(){
    if(!summary){
      summary=document.createElement('section');
      summary.className='direct-summary';
      summary.dataset.directSummary='true';
      summary.setAttribute('aria-live','polite');
      results.before(summary);
      summary.addEventListener('click',e=>{if(e.target.closest('[data-direct-change]'))revealChoices()});
    }
    const label=selectedLabel();
    summary.innerHTML=`<div><small>${c().eyebrow}</small><strong>${label}</strong><p>${c().lead} ${c().source}</p></div><button class="direct-change" data-direct-change type="button">${c().change}</button>`;
    summary.hidden=false;
  }
  function activateDirect(){
    if(results.hidden) return;
    document.body.classList.add('guided-direct');
    renderSummary();
  }
  function revealChoices(){
    document.body.classList.remove('guided-direct');
    if(summary)summary.hidden=true;
    requestAnimationFrame(()=>{question.focus();question.scrollIntoView({behavior:'smooth',block:'center'})});
  }

  document.addEventListener('click',e=>{if(e.target.closest('.change'))revealChoices()},true);
  new MutationObserver(()=>{
    if(document.body.classList.contains('guided-direct')&&!results.hidden)renderSummary();
  }).observe(results,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  new MutationObserver(()=>{
    if(summary&&!summary.hidden)renderSummary();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});

  activateDirect();
})();
