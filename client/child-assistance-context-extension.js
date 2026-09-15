(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.STODChildAssistanceContext=api;api.init(root);}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  // Extension of the SAME disability/home-support route. It preserves only the
  // coarse child/adult subject needed to select the correct primary source.
  const ADULT_URL='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna';
  const CHILD_URL='https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn';
  const FEEDBACK_URL='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const ASSISTANCE=/assistansersättning|personlig\s+assistans|مساعدة\s*شخصية|تعويض\s*المساعدة|کمک\s*شخصی|دستیار\s*شخصی/i;
  const CHILD_CONTEXT=/\b(?:mitt|vårt|vårat)\s+barn\b|\bmin\s+(?:son|dotter)\b|\bbarnet\b|طفلي|ابني|ابنتي|طفلنا|فرزندم|پسرم|دخترم|کودکم/i;
  const PROFESSIONAL=/\b(?:jobbar|arbetar)\s+(?:med|inom)\s+(?:(?:barn|unga)(?:\s+och)?\s+)?(?:personlig\s+assistans|assistansersättning)\b|\b(?:jobbar|arbetar)\s+som\s+personlig\s+assistent\b|\b(?:uppsats|rapport|statistik|forskning)\b.{0,60}\b(?:personlig\s+assistans|assistansersättning)\b/i;
  const LABEL={
    sv:{child:'Försäkringskassan: assistansersättning för barn',adult:'Försäkringskassan: assistansersättning för vuxna'},
    ar:{child:'Försäkringskassan: assistansersättning للأطفال',adult:'Försäkringskassan: assistansersättning للبالغين'},
    fa:{child:'Försäkringskassan: assistansersättning برای کودکان',adult:'Försäkringskassan: assistansersättning برای بزرگسالان'}
  };
  function safeLang(v){v=String(v||'').toLowerCase();return['sv','ar','fa'].includes(v)?v:'sv';}
  function isProfessional(text){return PROFESSIONAL.test(String(text||''));}
  function detectSupportFor(text){const v=String(text||'');if(!ASSISTANCE.test(v)||isProfessional(v))return null;return CHILD_CONTEXT.test(v)?'child':'adult';}
  function assistanceNeed(v){return v==='personal_assistance'||v==='assistance_healthcare';}
  function rewriteHandoffHref(href,text,base){
    const supportFor=detectSupportFor(text);if(!supportFor)return null;
    const u=new URL(href,base||'https://stodassistenten.invalid/');
    if(String(u.searchParams.get('focus')||'')!=='disability_home_support'||!assistanceNeed(String(u.searchParams.get('support_need')||'')))return null;
    u.searchParams.set('support_for',supportFor);
    return `${u.pathname.split('/').pop()}?${u.searchParams.toString()}`;
  }
  function patchRootRoute(win){
    const d=win.document,input=d.getElementById('situation'),route=d.querySelector('[data-disability-home-support-route="true"]');
    if(!input||!route)return false;
    if(isProfessional(input.value)){route.remove();return true;}
    const next=rewriteHandoffHref(route.getAttribute('href')||route.href,input.value,win.location.href);
    if(next){route.setAttribute('href',next);return true;}return false;
  }
  function focusContext(win){
    const p=new URLSearchParams(win.location.search);if(String(p.get('focus')||'').toLowerCase()!=='disability_home_support')return null;
    const supportFor=String(p.get('support_for')||'').toLowerCase();
    return{supportFor:['child','adult'].includes(supportFor)?supportFor:null,lang:safeLang(p.get('lang')||win.document.documentElement.lang)};
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
  function hookRoot(win){
    const b=win.document.getElementById('analyzeBtn'),i=win.document.getElementById('situation');if(!b||!i)return;
    const later=()=>win.setTimeout(()=>patchRootRoute(win),0);b.addEventListener('click',later);i.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')later();});
  }
  function hookPerson(win){
    if(!focusContext(win))return;wrapFeedback(win);ensureSource(win);const main=win.document.getElementById('main');if(main&&typeof win.MutationObserver==='function'){new win.MutationObserver(()=>ensureSource(win)).observe(main,{childList:true,subtree:true});}
  }
  function init(win){const path=(win.location.pathname||'').split('/').pop();if(!path||path==='index.html')hookRoot(win);if(path==='person-pilot.html')hookPerson(win);}
  return{init,detectSupportFor,isProfessional,rewriteHandoffHref,patchRootRoute,ensureSource,focusContext,routeContext,ADULT_URL,CHILD_URL};
});
