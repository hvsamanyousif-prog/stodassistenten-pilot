(() => {
  const ENDPOINT='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const APP_VERSION='0.8.1';
  const results=document.getElementById('results');
  if(!results) return;

  const copy={
    sv:{title:'Hjälp oss förbättra den här vägen',useful:'Var hjälpen användbar?',clear:'Var nästa steg tydligt?',newq:'Fick du reda på något nytt?',yes:'Ja',no:'Nej',send:'Skicka anonym feedback',note:'Vi skickar inte din situationsbeskrivning. Bara väg, språk och dina tre svar.',missing:'Svara på de tre frågorna först.',sent:'Tack — feedbacken är sparad.',error:'Feedbacken kunde inte skickas just nu.'},
    ar:{title:'ساعدنا في تحسين هذا المسار',useful:'هل كانت المساعدة مفيدة؟',clear:'هل كانت الخطوة التالية واضحة؟',newq:'هل عرفت شيئاً جديداً؟',yes:'نعم',no:'لا',send:'إرسال ملاحظات مجهولة',note:'لا نرسل وصف حالتك، فقط المسار واللغة وإجاباتك الثلاث.',missing:'أجب عن الأسئلة الثلاثة أولاً.',sent:'شكراً — تم حفظ الملاحظات.',error:'تعذر إرسال الملاحظات الآن.'},
    fa:{title:'به ما کمک کنید این مسیر را بهتر کنیم',useful:'آیا کمک مفید بود؟',clear:'آیا قدم بعدی روشن بود؟',newq:'آیا چیز جدیدی یاد گرفتید؟',yes:'بله',no:'نه',send:'ارسال بازخورد ناشناس',note:'شرح شرایط شما ارسال نمی‌شود؛ فقط مسیر، زبان و سه پاسخ شما.',missing:'ابتدا به هر سه سؤال پاسخ دهید.',sent:'ممنون — بازخورد ذخیره شد.',error:'فعلاً ارسال بازخورد ممکن نیست.'}
  };
  function lang(){const l=document.documentElement.lang||'sv';return copy[l]?l:'sv'}
  function c(k){return copy[lang()][k]}
  function token(value,fallback){const t=String(value||'').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,24);return t||fallback}
  function flow(){const p=new URLSearchParams(location.search);return `quick_${token(p.get('mode'),'general')}_${token(p.get('need'),'unsure')}`.slice(0,64)}

  function render(){
    if(results.hidden) return;
    results.querySelectorAll('.footeractions').forEach(node=>node.hidden=true);
    const old=results.querySelector('[data-quick-learning]');
    if(old) old.remove();
    const wrap=document.createElement('section');
    wrap.dataset.quickLearning='true';
    wrap.style.cssText='margin-top:18px;padding:18px;border:1px solid #dce6e1;border-radius:16px;background:#f8fbf9';
    wrap.innerHTML=`<strong>${c('title')}</strong><div data-q="useful" style="margin-top:12px"><span>${c('useful')}</span> <button class="feedback" type="button" data-v="true">${c('yes')}</button> <button class="feedback" type="button" data-v="false">${c('no')}</button></div><div data-q="clear" style="margin-top:10px"><span>${c('clear')}</span> <button class="feedback" type="button" data-v="true">${c('yes')}</button> <button class="feedback" type="button" data-v="false">${c('no')}</button></div><div data-q="learned_new" style="margin-top:10px"><span>${c('newq')}</span> <button class="feedback" type="button" data-v="true">${c('yes')}</button> <button class="feedback" type="button" data-v="false">${c('no')}</button></div><p style="font-size:12px;color:#5f706a">🔒 ${c('note')}</p><button class="feedback" type="button" data-send>${c('send')}</button><div data-status role="status" aria-live="polite" style="margin-top:8px"></div>`;
    const state={};
    wrap.querySelectorAll('[data-q] button').forEach(btn=>btn.addEventListener('click',()=>{
      const key=btn.closest('[data-q]').dataset.q;
      state[key]=btn.dataset.v==='true';
      btn.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    }));
    wrap.querySelector('[data-send]').addEventListener('click',async()=>{
      const status=wrap.querySelector('[data-status]');
      if(typeof state.useful!=='boolean'||typeof state.clear!=='boolean'||typeof state.learned_new!=='boolean'){
        status.textContent=c('missing');return;
      }
      const payload={app_version:APP_VERSION,language:lang(),flow:flow(),learned_new:state.learned_new,useful:state.useful,next_step_clear:state.clear,ratings:{}};
      try{
        const res=await fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!res.ok) throw new Error('HTTP '+res.status);
        status.textContent=c('sent');
        wrap.querySelector('[data-send]').disabled=true;
      }catch(e){status.textContent=c('error')}
    });
    results.appendChild(wrap);
  }

  new MutationObserver(()=>queueMicrotask(render)).observe(results,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden']});
  render();
})();
