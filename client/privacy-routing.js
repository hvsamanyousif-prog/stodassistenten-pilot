(() => {
  function installAssistanceRoute(){
    try{
      if(typeof KEYWORDS!=='undefined'){
        KEYWORDS.assistance=[
          'personlig assistans','assistans','hjälp med hygien','personlig hygien','hjälp med påklädning','påklädning','hjälp med toalett','toalett','hjälp att äta','hjälp med måltider','hjälp med kommunikation','andning',
          'مساعدة شخصية','النظافة الشخصية','المساعدة في اللباس','ارتداء الملابس','المساعدة في الأكل','المساعدة في التواصل','التنفس',
          'کمک شخصی','بهداشت شخصی','کمک برای لباس پوشیدن','لباس پوشیدن','کمک برای غذا خوردن','کمک در ارتباط','تنفس'
        ];
      }
      if(typeof I18N!=='undefined'){
        if(I18N.sv&&I18N.sv.routes) I18N.sv.routes.assistance=['Personlig hjälp i vardagen','Hygien, påklädning, måltider, kommunikation eller annat omfattande hjälpbehov','person-pilot.html?actor_type=private_person&focus=assistance'];
        if(I18N.ar&&I18N.ar.routes) I18N.ar.routes.assistance=['مساعدة شخصية في الحياة اليومية','النظافة الشخصية، اللباس، الوجبات، التواصل أو احتياجات مساعدة واسعة','person-pilot.html?actor_type=private_person&focus=assistance'];
        if(I18N.fa&&I18N.fa.routes) I18N.fa.routes.assistance=['کمک شخصی در زندگی روزمره','بهداشت شخصی، لباس پوشیدن، غذا، ارتباط یا نیاز گسترده به کمک','person-pilot.html?actor_type=private_person&focus=assistance'];
      }
    }catch(_err){/* the source shell remains usable if governed route augmentation cannot load */}
  }
  installAssistanceRoute();

  const box=document.getElementById('engineResults');
  if(!box) return;

  function safeToken(value){return String(value||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)}
  function coarseNeed(mode,text){
    const x=String(text||'').toLowerCase();
    if(mode==='dental'){
      if(/kost|råd|peng|dyr|ekonomi|stöd|bidrag|högkost|اقتص|مال|هزینه|پول/.test(x)) return 'cost';
      if(/ont|värk|smärt|akut|svull|besvär|درد|وجع/.test(x)) return 'care';
      if(/stöd|bidrag|högkost|حمایت|دعم/.test(x)) return 'support';
      return 'unsure';
    }
    if(mode==='vision'){
      if(/hem|bostad|lägen|trösk|kök|belys|خانه|منزل/.test(x)) return 'home';
      if(/mobil|dator|läsa|skärm|voiceover|hjälpmedel|تلفن|رایانه|خواندن/.test(x)) return 'tech';
      if(/jobb|arbete|skola|stud|کار|تحصیل|عمل|دراسة/.test(x)) return 'work';
      return 'unsure';
    }
    return 'unsure';
  }
  function routeKey(url){
    const mode=safeToken(url.searchParams.get('mode'));
    if(mode==='dental'||mode==='vision') return mode;
    const focus=safeToken(url.searchParams.get('focus'));
    if(focus==='assistance') return 'assistance';
    if(url.pathname.endsWith('company-pilot.html')) return 'company';
    const actor=safeToken(url.searchParams.get('actor_type'));
    return {employee:'work',student:'study',association:'association',private_person:'economy',relative:'general',other:'general'}[actor]||'general';
  }
  function sanitizeAnchor(anchor){
    const url=new URL(anchor.href,location.href);
    const mode=safeToken(url.searchParams.get('mode'));
    const raw=url.searchParams.get('q');
    if((mode==='dental'||mode==='vision')&&raw){
      url.searchParams.set('need',coarseNeed(mode,raw));
      url.searchParams.delete('q');
      anchor.href=url.pathname.split('/').pop()+url.search;
    }
    return routeKey(url);
  }
  function sanitize(){
    const routes=[...box.querySelectorAll('a.route')];
    routes.forEach(sanitizeAnchor);
    if(routes[0]) box.dataset.primaryRoute=sanitizeAnchor(routes[0]);
  }

  new MutationObserver(sanitize).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  box.addEventListener('click',event=>{
    const anchor=event.target.closest('a.route');
    if(anchor) sanitizeAnchor(anchor);
  },true);
  sanitize();
})();