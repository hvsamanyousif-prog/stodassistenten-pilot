(() => {
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
