(() => {
  const ENDPOINT='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const APP_VERSION='0.8.1';
  const box=document.getElementById('engineResults');
  if(!box) return;

  const copy={
    sv:{title:'Hjälp oss göra förslagen bättre',useful:'Var förslagen användbara?',clear:'Var nästa steg tydligt?',newq:'Fick du reda på något nytt?',yes:'Ja',no:'Nej',send:'Skicka anonym feedback',note:'Din situationsbeskrivning skickas inte med.',sent:'Tack — feedbacken är sparad.',error:'Feedbacken kunde inte skickas just nu.'},
    ar:{title:'ساعدنا في تحسين الاقتراحات',useful:'هل كانت الاقتراحات مفيدة؟',clear:'هل كانت الخطوة التالية واضحة؟',newq:'هل عرفت شيئاً جديداً؟',yes:'نعم',no:'لا',send:'إرسال ملاحظات مجهولة',note:'لا يتم إرسال وصف حالتك.',sent:'شكراً — تم حفظ الملاحظات.',error:'تعذر إرسال الملاحظات الآن.'},
    fa:{title:'به ما کمک کنید پیشنهادها را بهتر کنیم',useful:'آیا پیشنهادها مفید بودند؟',clear:'آیا قدم بعدی روشن بود؟',newq:'آیا چیز جدیدی یاد گرفتید؟',yes:'بله',no:'نه',send:'ارسال بازخورد ناشناس',note:'شرح شرایط شما ارسال نمی‌شود.',sent:'ممنون — بازخورد ذخیره شد.',error:'فعلاً ارسال بازخورد ممکن نیست.'}
  };

  function lang(){const l=document.documentElement.lang||'sv';return copy[l]?l:'sv'}
  function c(k){return copy[lang()][k]}
  function route(){return String(box.dataset.primaryRoute||'general').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'general'}
  function panel(){
    if(box.querySelector('[data-experience-feedback]')) return;
    const wrap=document.createElement('section');
    wrap.dataset.experienceFeedback='true';
    wrap.style.cssText='margin-top:16px;padding:16px;border:1px solid #dce6e1;border-radius:16px;background:#f8fbf9';
    wrap.innerHTML=`<strong>${c('title')}</strong><div data-q="useful" style="margin-top:10px"><span>${c('useful')}</span> <button type="button" data-v="true">${c('yes')}</button> <button type="button" data-v="false">${c('no')}</button></div><div data-q="clear" style="margin-top:8px"><span>${c('clear')}</span> <button type="button" data-v="true">${c('yes')}</button> <button type="button" data-v="false">${c('no')}</button></div><div data-q="learned_new" style="margin-top:8px"><span>${c('newq')}</span> <button type="button" data-v="true">${c('yes')}</button> <button type="button" data-v="false">${c('no')}</button></div><div style="margin-top:10px;font-size:12px;color:#5f706a">🔒 ${c('note')}</div><button type="button" data-send style="margin-top:10px">${c('send')}</button><div data-status role="status" aria-live="polite" style="margin-top:8px"></div>`;
    const state={};
    wrap.querySelectorAll('[data-q] button').forEach(btn=>btn.addEventListener('click',()=>{
      const q=btn.closest('[data-q]').dataset.q;
      state[q]=btn.dataset.v==='true';
      btn.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    }));
    wrap.querySelector('[data-send]').addEventListener('click',async()=>{
      const status=wrap.querySelector('[data-status]');
      if(typeof state.useful!=='boolean'||typeof state.clear!=='boolean'||typeof state.learned_new!=='boolean') return;
      const payload={app_version:APP_VERSION,language:lang(),flow:`situation_engine_${route()}`.slice(0,64),learned_new:state.learned_new,useful:state.useful,next_step_clear:state.clear,ratings:{}};
      try{
        const res=await fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!res.ok) throw new Error('HTTP '+res.status);
        status.textContent=c('sent');
      }catch(e){status.textContent=c('error')}
    });
    box.appendChild(wrap);
  }

  new MutationObserver(()=>{if(!box.hidden) panel()}).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
