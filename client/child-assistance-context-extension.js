(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.STODChildAssistanceContext=api;api.init(root);}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  // Extension of the SAME person/family and disability/home-support routes.
  // It preserves only coarse route-changing context and never decides
  // entitlement, amount, diagnosis sufficiency or whether a cost qualifies.
  const ADULT_URL='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna';
  const CHILD_URL='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn';
  const OMV_URL='https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/omvardnadsbidrag';
  const MERK_URL='https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/merkostnadsersattning-for-barn';
  const FEEDBACK_URL='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const ASSISTANCE=/assistansersättning|personlig\s+assistans|مساعدة\s*شخصية|تعويض\s*المساعدة|کمک\s*شخصی|دستیار\s*شخصی/i;
  const CHILD_CONTEXT=/\b(?:mitt|vårt|vårat)\s+barn\b|\bmin\s+(?:son|dotter)\b|\bbarnet\b|طفلي|ابني|ابنتي|طفلنا|فرزندم|پسرم|دخترم|کودکم/i;
  const PROFESSIONAL=/\b(?:jobbar|arbetar)\s+(?:med|inom)\s+(?:(?:barn|unga)(?:\s+och)?\s+)?(?:personlig\s+assistans|assistansersättning)\b|\b(?:jobbar|arbetar)\s+som\s+personlig\s+assistent\b|\b(?:uppsats|rapport|statistik|forskning)\b.{0,60}\b(?:personlig\s+assistans|assistansersättning)\b/i;
  const FAMILY_PROFESSIONAL=/\b(?:jobbar|arbetar)\s+(?:med|inom)\s+(?:barn|unga|familj|funktionsnedsättning)|\b(?:uppsats|rapport|statistik|forskning|utredning)\b.{0,80}\b(?:omvårdnadsbidrag|merkostnadsersättning|vårdbidrag|barn)\b/i;
  const FAMILY_CARE=/extra\s+(?:omvårdnad|tillsyn|hjälp|stöd)|mycket\s+mer\s+(?:hjälp|tillsyn|övervakning|omvårdnad)|behöver\s+mer\s+(?:hjälp|tillsyn|övervakning|omvårdnad)|uppsikt|رعاية\s+إضافية|مراقبة\s+إضافية|مساعدة\s+أكثر|نیاز\s+به\s+مراقبت\s+بیشتر|نظارت\s+بیشتر|کمک\s+بیشتر/i;
  const FAMILY_COST=/extra\s+(?:kostnad|kostnader|utgift|utgifter)|merkostnad|merkostnader|kostar\s+mycket\s+mer|تكاليف\s+إضافية|مصاريف\s+إضافية|هزینه(?:‌|\s)*های?\s+اضافی|هزینه\s+بیشتر/i;
  const FAMILY_LEGACY=/\bvårdbidrag\b/i;
  const FAMILY_DIAGNOSIS=/autism|adhd|npf|funktionsnedsättning|funktionshinder|توحد|اضطراب\s*فرط\s*الحركة|إعاقة|اوتیسم|بیش.?فعالی|معلولیت|ناتوانی/i;
  const FAMILY_NEEDS=['care','cost','both','unsure'];
  const LABEL={
    sv:{child:'Försäkringskassan: assistansersättning för barn',adult:'Försäkringskassan: assistansersättning för vuxna'},
    ar:{child:'Försäkringskassan: assistansersättning للأطفال',adult:'Försäkringskassan: assistansersättning للبالغين'},
    fa:{child:'Försäkringskassan: assistansersättning برای کودکان',adult:'Försäkringskassan: assistansersättning برای بزرگسالان'}
  };
  const FAMILY_COPY={
    sv:{question:'Vad gäller främst för barnet?',care:'Extra omvårdnad, hjälp eller tillsyn',cost:'Extra kostnader på grund av barnets funktionsnedsättning',both:'Både extra omvårdnad/tillsyn och extra kostnader',unsure:'Jag är osäker – visa båda vägarna',back:'Tillbaka'},
    ar:{question:'ما الذي يصف حاجة الطفل بشكل أفضل؟',care:'رعاية أو مساعدة أو مراقبة إضافية',cost:'تكاليف إضافية بسبب إعاقة الطفل',both:'رعاية/مراقبة إضافية وتكاليف إضافية معاً',unsure:'لست متأكداً – اعرض المسارين',back:'رجوع'},
    fa:{question:'کدام مورد نیاز کودک را بهتر توضیح می‌دهد؟',care:'مراقبت، کمک یا نظارت بیشتر',cost:'هزینه‌های اضافی به دلیل ناتوانی کودک',both:'هم مراقبت/نظارت بیشتر و هم هزینه‌های اضافی',unsure:'مطمئن نیستم – هر دو مسیر را نشان بده',back:'برگشت'}
  };
  const FAMILY_ROWS={
    sv:{care:['Omvårdnadsbidrag – kontrollera om behovet passar','Försäkringskassan beskriver omvårdnadsbidrag för barn som behöver mer omvårdnad och tillsyn än barn i samma ålder. Diagnosen i sig avgör inte. Kontrollera barnets konkreta extra behov mot den aktuella primärkällan.',OMV_URL],cost:['Merkostnadsersättning för barn – kontrollera vilka extra kostnader som kan räknas','Försäkringskassan bedömer vilka kostnader som kan räknas som merkostnader. Alla utgifter eller alla kostnader kopplade till en diagnos räknas inte automatiskt. Kontrollera de konkreta extra kostnaderna mot den aktuella primärkällan.',MERK_URL]},
    ar:{care:['Omvårdnadsbidrag – تحقّق من ملاءمة الحاجة','توضح Försäkringskassan أن المسار يتعلق بالطفل الذي يحتاج إلى رعاية ومراقبة أكثر من طفل في العمر نفسه. التشخيص وحده لا يحسم الاستحقاق. تحقّق من الاحتياجات الإضافية الفعلية في المصدر الرسمي الحالي.',OMV_URL],cost:['Merkostnadsersättning للطفل – تحقّق من التكاليف الإضافية التي يمكن احتسابها','تقيّم Försäkringskassan أي تكاليف يمكن اعتبارها merkostnader. ليست كل مصروفات أو تكاليف مرتبطة بتشخيص مؤهلة تلقائياً. تحقّق من التكاليف الإضافية الفعلية في المصدر الرسمي الحالي.',MERK_URL]},
    fa:{care:['Omvårdnadsbidrag – بررسی کن آیا نیاز با این مسیر هم‌خوان است','Försäkringskassan این مسیر را برای کودکی توضیح می‌دهد که نسبت به کودک هم‌سن به مراقبت و نظارت بیشتری نیاز دارد. صرف تشخیص، استحقاق را تعیین نمی‌کند. نیازهای اضافی واقعی را در منبع رسمی فعلی بررسی کن.',OMV_URL],cost:['Merkostnadsersättning برای کودک – بررسی کن کدام هزینه‌های اضافی قابل محاسبه‌اند','Försäkringskassan بررسی می‌کند کدام هزینه‌ها می‌توانند merkostnader محسوب شوند. هر خرج یا هر هزینه مرتبط با تشخیص به‌طور خودکار واجد شرایط نیست. هزینه‌های اضافی واقعی را در منبع رسمی فعلی بررسی کن.',MERK_URL]}
  };
  function safeLang(v){v=String(v||'').toLowerCase();return['sv','ar','fa'].includes(v)?v:'sv';}
  function isProfessional(text){return PROFESSIONAL.test(String(text||''));}
  function detectSupportFor(text){const v=String(text||'');if(!ASSISTANCE.test(v)||isProfessional(v))return null;return CHILD_CONTEXT.test(v)?'child':'adult';}
  function assistanceNeed(v){return v==='personal_assistance'||v==='assistance_healthcare';}
  function normalizeFamilyNeed(v){v=String(v||'').toLowerCase();return FAMILY_NEEDS.includes(v)?v:'unsure';}
  function isFamilyProfessional(text){return FAMILY_PROFESSIONAL.test(String(text||''));}
  function detectFamilyNeed(text){
    const v=String(text||'');if(!CHILD_CONTEXT.test(v)||isFamilyProfessional(v))return null;
    const care=FAMILY_CARE.test(v),cost=FAMILY_COST.test(v);
    if(care&&cost)return'both';if(care)return'care';if(cost)return'cost';if(FAMILY_LEGACY.test(v)||FAMILY_DIAGNOSIS.test(v))return'unsure';return null;
  }
  function familyRows(lang,need){
    const rows=FAMILY_ROWS[safeLang(lang)],n=normalizeFamilyNeed(need);
    if(n==='care')return[rows.care.slice()];if(n==='cost')return[rows.cost.slice()];return[rows.care.slice(),rows.cost.slice()];
  }
  function rewriteHandoffHref(href,text,base){
    const supportFor=detectSupportFor(text);if(!supportFor)return null;
    const u=new URL(href,base||'https://stodassistenten.invalid/');
    if(String(u.searchParams.get('focus')||'')!=='disability_home_support'||!assistanceNeed(String(u.searchParams.get('support_need')||'')))return null;
    u.searchParams.set('support_for',supportFor);
    return `${u.pathname.split('/').pop()}?${u.searchParams.toString()}`;
  }
  function rewriteFamilyHandoffHref(href,text,base){
    const need=detectFamilyNeed(text);if(!need)return null;
    const u=new URL(href,base||'https://stodassistenten.invalid/');
    if(String(u.searchParams.get('focus')||'').toLowerCase()!=='family')return null;
    u.searchParams.set('support_need',normalizeFamilyNeed(need));
    for(const key of['q','query','story','situation','raw_situation'])u.searchParams.delete(key);
    return`${u.pathname.split('/').pop()}?${u.searchParams.toString()}`;
  }
  function addFamilyDiscoveryKeywords(){
    try{
      if(typeof KEYWORDS==='undefined'||!Array.isArray(KEYWORDS.family))return false;
      const words=['extra kostnader för mitt barn','extra kostnader för barnet','merkostnader för mitt barn','merkostnadsersättning','omvårdnadsbidrag','vårdbidrag','mitt barn har autism','mitt barn har adhd','تكاليف إضافية لطفلي','تكاليف إضافية للطفل','مصاريف إضافية لطفلي','طفلي لديه توحد','هزینه اضافی برای فرزندم','هزینه‌های اضافی برای فرزندم','فرزندم اوتیسم دارد','فرزندم بیش فعالی دارد'];
      for(const word of words)if(!KEYWORDS.family.includes(word))KEYWORDS.family.push(word);return true;
    }catch(_){return false;}
  }
  function patchRootRoute(win){
    const d=win.document,input=d.getElementById('situation'),route=d.querySelector('[data-disability-home-support-route="true"]');
    let changed=false;if(!input)return false;
    if(route){if(isProfessional(input.value)){route.remove();changed=true;}else{const next=rewriteHandoffHref(route.getAttribute('href')||route.href,input.value,win.location.href);if(next){route.setAttribute('href',next);changed=true;}}}
    for(const familyRoute of d.querySelectorAll('#engineResults a.route')){
      const next=rewriteFamilyHandoffHref(familyRoute.getAttribute('href')||familyRoute.href,input.value,win.location.href);if(next){familyRoute.setAttribute('href',next);changed=true;}
    }
    return changed;
  }
  function focusContext(win){
    const p=new URLSearchParams(win.location.search);if(String(p.get('focus')||'').toLowerCase()!=='disability_home_support')return null;
    const supportFor=String(p.get('support_for')||'').toLowerCase();
    return{supportFor:['child','adult'].includes(supportFor)?supportFor:null,lang:safeLang(p.get('lang')||win.document.documentElement.lang)};
  }
  function familyFocusContext(win){
    const p=new URLSearchParams(win.location.search);if(String(p.get('focus')||'').toLowerCase()!=='family')return null;
    return{need:normalizeFamilyNeed(p.get('support_need')),lang:safeLang(p.get('lang')||win.document.documentElement.lang)};
  }
  function routeContext(win){
    const ctx=focusContext(win);if(!ctx)return null;const p=new URLSearchParams(win.location.search),need=String(p.get('support_need')||'').toLowerCase();
    if(!assistanceNeed(need))return null;return{need,supportFor:ctx.supportFor,lang:ctx.lang};
  }
  function sourceAnchor(d){return Array.from(d.querySelectorAll('a.source')).find(a=>(a.getAttribute('href')||'')===ADULT_URL||(a.getAttribute('href')||'')===CHILD_URL)||null;}
  function setSource(a,url,label,subject){if((a.getAttribute('href')||'')!==url)a.setAttribute('href',url);if(a.textContent!==label)a.textContent=label;a.dataset.assistanceSubject=subject;}
  function ensureSource(win){
    const ctx=focusContext(win);if(!ctx)return false;const d=win.document,a=sourceAnchor(d);if(!a)return false;
    if(ctx.supportFor==='child'){setSource(a,CHILD_URL,LABEL[ctx.lang].child,'child');return true;}
    if(ctx.supportFor==='adult'){setSource(a,ADULT_URL,LABEL[ctx.lang].adult,'adult');return true;}
    setSource(a,ADULT_URL,LABEL[ctx.lang].adult,'unsure');
    const parent=a.parentElement;if(!parent||parent.querySelector('[data-child-assistance-source="true"]'))return true;
    const sep=d.createTextNode(' · '),child=d.createElement('a');child.className='source';child.href=CHILD_URL;child.target='_blank';child.rel='noopener noreferrer';child.textContent=LABEL[ctx.lang].child;child.dataset.childAssistanceSource='true';parent.insertBefore(sep,a.nextSibling);parent.insertBefore(child,sep.nextSibling);return true;
  }
  function wrapFeedback(win){
    const ctx=focusContext(win);if(!ctx||win.__stodChildAssistanceFetchWrapped)return false;const original=win.fetch.bind(win);win.__stodChildAssistanceFetchWrapped=true;
    win.fetch=async function(input,init){
      try{
        const url=typeof input==='string'?input:(input&&input.url)||'';
        if(url===FEEDBACK_URL&&init&&typeof init.body==='string'){
          const body=JSON.parse(init.body),need=body&&body.ratings&&String(body.ratings.support_need||'');
          if(body&&body.flow==='disability_home_support'&&body.ratings&&typeof body.ratings==='object'&&assistanceNeed(need)){
            body.ratings.support_for=ctx.supportFor||'unsure';
            init=Object.assign({},init,{body:JSON.stringify(body)});
          }
        }
      }catch(_){/* fail closed: preserve original request */}
      return original(input,init);
    };return true;
  }
  function familyNeedQuestion(){
    const l=safeLang(typeof lang!=='undefined'?lang:'sv'),c=FAMILY_COPY[l],direction=l==='sv'?'←':'→';
    const choice=(label,value)=>`<button class="choice" onclick="chooseAnswer('family_support_need','${value}','familyR')">${label}</button>`;
    return`<button class="back" onclick="go('family1')">${direction} ${c.back}</button><section class="card"><div class="progress">2 / 2</div><h2>${c.question}</h2>${choice(c.care,'care')}${choice(c.cost,'cost')}${choice(c.both,'both')}${choice(c.unsure,'unsure')}</section>`;
  }
  function selectedFamilyNeed(win){
    try{if(typeof answers!=='undefined'&&answers&&answers.family_support_need)return normalizeFamilyNeed(answers.family_support_need);}catch(_){/* continue */}
    const ctx=familyFocusContext(win);return ctx?ctx.need:'unsure';
  }
  function hookFamilyPerson(win){
    if(typeof chooseAnswer!=='function'||typeof flow!=='function'||typeof getRows!=='function')return false;
    const originalChoose=chooseAnswer;
    chooseAnswer=function familySupportChoose(key,val,next){
      const routed=familyFocusContext(win);
      if(key==='child'&&val==='yes'&&routed&&routed.need!=='unsure'){
        if(typeof answers!=='undefined'){answers[key]=val;answers.family_support_need=routed.need;}
        if(typeof scenario!=='undefined')scenario='family';if(typeof matchRatings!=='undefined')matchRatings={};if(typeof finalFeedback!=='undefined')finalFeedback={};if(typeof submitState!=='undefined')submitState='idle';go('familyR');return;
      }
      return originalChoose(key,val,next);
    };
    const originalFlow=flow;
    flow=function familySupportFlow(){if(typeof scenario!=='undefined'&&scenario==='family'&&typeof screen!=='undefined'&&screen==='family2')return familyNeedQuestion();return originalFlow();};
    const originalRows=getRows;
    getRows=function familySupportRows(){if(typeof scenario!=='undefined'&&scenario==='family')return familyRows(typeof lang!=='undefined'?lang:'sv',selectedFamilyNeed(win));return originalRows();};
    return true;
  }
  function hookRoot(win){
    addFamilyDiscoveryKeywords();
    const b=win.document.getElementById('analyzeBtn'),i=win.document.getElementById('situation'),box=win.document.getElementById('engineResults');if(!b||!i)return;
    const later=()=>win.setTimeout(()=>patchRootRoute(win),0);b.addEventListener('click',later);i.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')later();});
    if(box&&typeof win.MutationObserver==='function')new win.MutationObserver(()=>patchRootRoute(win)).observe(box,{childList:true,subtree:true});
  }
  function hookPerson(win){
    hookFamilyPerson(win);
    if(!focusContext(win))return;wrapFeedback(win);ensureSource(win);const main=win.document.getElementById('main');if(main&&typeof win.MutationObserver==='function'){new win.MutationObserver(()=>ensureSource(win)).observe(main,{childList:true,subtree:true});}
  }
  function init(win){const path=(win.location.pathname||'').split('/').pop();if(!path||path==='index.html')hookRoot(win);if(path==='person-pilot.html')hookPerson(win);}
  return{init,detectSupportFor,isProfessional,rewriteHandoffHref,patchRootRoute,ensureSource,focusContext,routeContext,detectFamilyNeed,isFamilyProfessional,normalizeFamilyNeed,familyRows,rewriteFamilyHandoffHref,familyFocusContext,ADULT_URL,CHILD_URL,OMV_URL,MERK_URL};
});
