(function(root){
  'use strict';
  if(!root||!root.document||!root.STODFamilySupportContext)return;
  const ctx=root.STODFamilySupportContext;

  const COPY={
    sv:{question:'Vad gäller främst för barnet?',care:'Extra omvårdnad, hjälp eller tillsyn',cost:'Extra kostnader på grund av barnets funktionsnedsättning',both:'Både extra omvårdnad/tillsyn och extra kostnader',unsure:'Jag är osäker – visa båda vägarna'},
    ar:{question:'ما الذي يصف حاجة الطفل بشكل أفضل؟',care:'رعاية أو مساعدة أو مراقبة إضافية',cost:'تكاليف إضافية بسبب إعاقة الطفل',both:'رعاية/مراقبة إضافية وتكاليف إضافية معاً',unsure:'لست متأكداً – اعرض المسارين'},
    fa:{question:'کدام مورد نیاز کودک را بهتر توضیح می‌دهد؟',care:'مراقبت، کمک یا نظارت بیشتر',cost:'هزینه‌های اضافی به دلیل ناتوانی کودک',both:'هم مراقبت/نظارت بیشتر و هم هزینه‌های اضافی',unsure:'مطمئن نیستم – هر دو مسیر را نشان بده'}
  };

  function currentLang(){
    try{return ctx.safeLang(typeof lang!=='undefined'?lang:root.document.documentElement.lang);}catch(_){return 'sv';}
  }
  function params(){return new URLSearchParams(root.location.search);}
  function focusedFamilyNeed(){
    const p=params();
    if(String(p.get('focus')||'').toLowerCase()!=='family')return null;
    return ctx.normalizeNeed(p.get('support_need'));
  }
  function addDiscoveryKeywords(){
    try{
      if(typeof KEYWORDS==='undefined'||!KEYWORDS.family)return false;
      const words=[
        'extra kostnader för mitt barn','extra kostnader för barnet','merkostnader för mitt barn','merkostnadsersättning','omvårdnadsbidrag','vårdbidrag','mitt barn har autism','mitt barn har adhd',
        'تكاليف إضافية لطفلي','تكاليف إضافية للطفل','مصاريف إضافية لطفلي','طفلي لديه توحد',
        'هزینه اضافی برای فرزندم','هزینه‌های اضافی برای فرزندم','فرزندم اوتیسم دارد','فرزندم بیش فعالی دارد'
      ];
      for(const word of words)if(!KEYWORDS.family.includes(word))KEYWORDS.family.push(word);
      return true;
    }catch(_){return false;}
  }
  function patchFamilyAnchors(){
    const input=root.document.getElementById('situation');
    if(!input)return false;
    const need=ctx.detectNeed(input.value);
    if(!need)return false;
    let changed=false;
    for(const anchor of root.document.querySelectorAll('#engineResults a.route')){
      try{
        const url=new URL(anchor.getAttribute('href')||anchor.href,root.location.href);
        if(String(url.searchParams.get('focus')||'').toLowerCase()!=='family')continue;
        url.searchParams.set('support_need',ctx.normalizeNeed(need));
        url.searchParams.delete('q');
        url.searchParams.delete('story');
        url.searchParams.delete('situation');
        anchor.setAttribute('href',`${url.pathname.split('/').pop()}?${url.searchParams.toString()}`);
        changed=true;
      }catch(_){/* keep existing safe route */}
    }
    return changed;
  }
  function hookRoot(){
    addDiscoveryKeywords();
    const box=root.document.getElementById('engineResults');
    const button=root.document.getElementById('analyzeBtn');
    const input=root.document.getElementById('situation');
    const later=()=>root.setTimeout(patchFamilyAnchors,0);
    if(button)button.addEventListener('click',later);
    if(input)input.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter')later();});
    if(box&&typeof root.MutationObserver==='function')new root.MutationObserver(patchFamilyAnchors).observe(box,{childList:true,subtree:true});
    patchFamilyAnchors();
  }
  function familyNeedQuestion(){
    const c=COPY[currentLang()]||COPY.sv;
    const direction=currentLang()==='sv'?'←':'→';
    const choice=(label,value)=>`<button class="choice" onclick="chooseAnswer('family_support_need','${value}','familyR')">${label}</button>`;
    return `<button class="back" onclick="go('family1')">${direction} ${currentLang()==='sv'?'Tillbaka':currentLang()==='ar'?'رجوع':'برگشت'}</button><section class="card"><div class="progress">2 / 2</div><h2>${c.question}</h2>${choice(c.care,'care')}${choice(c.cost,'cost')}${choice(c.both,'both')}${choice(c.unsure,'unsure')}</section>`;
  }
  function selectedNeed(){
    const routed=focusedFamilyNeed();
    if(routed&&routed!=='unsure')return routed;
    try{
      const chosen=typeof answers!=='undefined'&&answers?family_support_value(answers.family_support_need):null;
      return chosen||routed||'unsure';
    }catch(_){return routed||'unsure';}
  }
  function family_support_value(value){
    const v=ctx.normalizeNeed(value);
    return ctx.NEEDS.includes(v)?v:null;
  }
  function hookPerson(){
    if(typeof chooseAnswer!=='function'||typeof flow!=='function'||typeof getRows!=='function')return false;
    const originalChoose=chooseAnswer;
    chooseAnswer=function familySupportChoose(key,val,next){
      const routed=focusedFamilyNeed();
      if(key==='child'&&val==='yes'&&routed&&routed!=='unsure'){
        if(typeof answers!=='undefined'){
          answers[key]=val;
          answers.family_support_need=routed;
        }
        if(typeof scenario!=='undefined')scenario='family';
        if(typeof matchRatings!=='undefined')matchRatings={};
        if(typeof finalFeedback!=='undefined')finalFeedback={};
        if(typeof submitState!=='undefined')submitState='idle';
        go('familyR');
        return;
      }
      return originalChoose(key,val,next);
    };

    const originalFlow=flow;
    flow=function familySupportFlow(){
      if(typeof scenario!=='undefined'&&scenario==='family'&&typeof screen!=='undefined'&&screen==='family2')return familyNeedQuestion();
      return originalFlow();
    };

    const originalRows=getRows;
    getRows=function familySupportRows(){
      if(typeof scenario!=='undefined'&&scenario==='family')return ctx.rowsForNeed(currentLang(),selectedNeed());
      return originalRows();
    };
    return true;
  }
  function init(){
    const path=(root.location.pathname||'').split('/').pop();
    if(!path||path==='index.html')hookRoot();
    if(path==='person-pilot.html')hookPerson();
    root.document.documentElement.setAttribute('data-family-support-runtime','v87');
  }
  init();
})(typeof window!=='undefined'?window:null);
