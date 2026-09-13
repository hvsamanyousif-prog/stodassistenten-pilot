(() => {
  const FEEDBACK_URL='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const params=new URLSearchParams(window.location.search);
  const rawActor=params.get('actor_type')||'private_person';
  const actor=String(rawActor).toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'private_person';
  const copy={
    sv:{heading:'Din ingång',private_person:'Privatperson',relative:'Anhörig / hjälper någon',student:'Student / ung vuxen',employee:'Anställd',association:'Förening',other:'Bred ingång'},
    ar:{heading:'مدخلك',private_person:'فرد',relative:'قريب / أساعد شخصاً',student:'طالب / شاب بالغ',employee:'موظف',association:'جمعية',other:'مدخل عام'},
    fa:{heading:'ورودی شما',private_person:'فرد',relative:'خویشاوند / کمک به دیگری',student:'دانشجو / جوان',employee:'کارمند',association:'انجمن',other:'ورودی عمومی'}
  };
  function lang(){const value=document.documentElement.lang||'sv';return copy[value]?value:'sv'}
  function label(){const c=copy[lang()];return c[actor]||c.other}
  function patchContext(){
    const pilot=document.getElementById('pilot');
    if(pilot) pilot.textContent=label();
    const actorEyebrow=document.querySelector('#main > section.card:not(.hero) > .eyebrow');
    if(actorEyebrow) actorEyebrow.textContent=copy[lang()].heading;
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(url===FEEDBACK_URL&&init&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){
        const data=JSON.parse(init.body);
        if(data&&typeof data.flow==='string'){
          const flow=String(data.flow).toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,31)||'general';
          data.flow=`${actor}_${flow}`.slice(0,64);
          return nativeFetch(input,{...init,body:JSON.stringify(data)});
        }
      }
    }catch(_err){/* fail open to original request; backend validation remains authoritative */}
    return nativeFetch(input,init);
  };

  const root=document.querySelector('.app');
  if(root){
    const observer=new MutationObserver(patchContext);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }
  patchContext();
})();
