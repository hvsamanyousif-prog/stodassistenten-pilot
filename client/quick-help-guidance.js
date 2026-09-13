(() => {
  const params=new URLSearchParams(location.search);
  const mode=(params.get('mode')||'').toLowerCase();
  const need=(params.get('need')||'').toLowerCase();
  const valid={dental:new Set(['cost','care','support','unsure']),vision:new Set(['home','tech','work','unsure'])};
  const results=document.getElementById('results');
  const content=document.querySelector('.content');
  const question=document.getElementById('question');
  if(!results||!content||!question||!valid[mode]||!valid[mode].has(need)) return;

  const COPY={
    sv:{eyebrow:'Tolkat behov',lead:'Motorn har redan sorterat din beskrivning till den här vägen.',change:'Ändra väg',source:'Du kan byta om tolkningen inte stämmer.'},
    ar:{eyebrow:'الحاجة التي فُهمت',lead:'صنّف المحرك وصفك بالفعل إلى هذا المسار.',change:'تغيير المسار',source:'يمكنك التغيير إذا لم يكن التفسير صحيحاً.'},
    fa:{eyebrow:'نیاز تشخیص‌داده‌شده',lead:'موتور توضیح تو را مستقیماً به این مسیر هدایت کرده است.',change:'تغییر مسیر',source:'اگر این برداشت درست نیست، می‌توانی مسیر را عوض کنی.'}
  };
  function lang(){const l=document.documentElement.lang||'sv';return COPY[l]?l:'sv'}
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
