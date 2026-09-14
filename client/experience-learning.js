(() => {
  const ENDPOINT='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
  const APP_VERSION='0.8.2';
  const box=document.getElementById('engineResults');
  if(!box) return;

  const copy={
    sv:{title:'Hjälp oss göra förslagen bättre',useful:'Var förslagen användbara?',clear:'Var nästa steg tydligt?',newq:'Fick du reda på något nytt?',yes:'Ja',no:'Nej',send:'Skicka anonym feedback',note:'Din situationsbeskrivning skickas inte med.',needAnswers:'Svara på de tre frågorna ovan innan du skickar.',sent:'Tack — feedbacken är sparad.',error:'Feedbacken kunde inte skickas just nu.',homeTitle:'Villa / energi – kontrollera Villaeffekten',homeSub:'Värmepump, isolering eller annan energieffektivisering'},
    ar:{title:'ساعدنا في تحسين الاقتراحات',useful:'هل كانت الاقتراحات مفيدة؟',clear:'هل كانت الخطوة التالية واضحة؟',newq:'هل عرفت شيئاً جديداً؟',yes:'نعم',no:'لا',send:'إرسال ملاحظات مجهولة',note:'لا يتم إرسال وصف حالتك.',needAnswers:'أجب عن الأسئلة الثلاثة أعلاه قبل الإرسال.',sent:'شكراً — تم حفظ الملاحظات.',error:'تعذر إرسال الملاحظات الآن.',homeTitle:'منزل / طاقة – تحقق من مسار دعم كفاءة الطاقة',homeSub:'مضخة حرارية أو عزل أو تحسين آخر للطاقة'},
    fa:{title:'به ما کمک کنید پیشنهادها را بهتر کنیم',useful:'آیا پیشنهادها مفید بودند؟',clear:'آیا قدم بعدی روشن بود؟',newq:'آیا چیز جدیدی یاد گرفتید؟',yes:'بله',no:'نه',send:'ارسال بازخورد ناشناس',note:'شرح شرایط شما ارسال نمی‌شود.',needAnswers:'پیش از ارسال به هر سه پرسش بالا پاسخ دهید.',sent:'ممنون — بازخورد ذخیره شد.',error:'فعلاً ارسال بازخورد ممکن نیست.',homeTitle:'خانه / انرژی – مسیر حمایت انرژی را بررسی کنید',homeSub:'پمپ حرارتی، عایق‌کاری یا بهبود دیگر انرژی'}
  };

  const HOME_ENERGY_PATTERNS=[
    /\bvillaeffekten\b|energibidrag(?:et)?(?:\s+(?:för|till))?\s+(?:villa|småhus)|energieffektivis(?:era|ering)\s+(?:villa|småhus)|sänka\s+elkostnad(?:en)?\s+(?:i|för)\s+(?:villa|huset)|(?:värmepump|tilläggsisolering|isolera\s+huset|byta\s+fönster).{0,40}(?:bidrag|stöd)|(?:bidrag|stöd).{0,40}(?:värmepump|isolera|fönster)/i,
    /(?:دعم|منحة).{0,45}(?:كفاءة\s+الطاقة|مضخة\s+حرارية|عزل)|(?:كفاءة\s+الطاقة|مضخة\s+حرارية|عزل).{0,45}(?:دعم|منحة)|فيلا.{0,35}(?:طاقة|تدفئة)/i,
    /(?:حمایت|کمک[‌\s-]*هزینه).{0,45}(?:بهره[‌\s-]*وری\s+انرژی|پمپ\s+حرارتی|عایق)|(?:بهره[‌\s-]*وری\s+انرژی|پمپ\s+حرارتی|عایق).{0,45}(?:حمایت|کمک[‌\s-]*هزینه)|ویلا.{0,35}(?:انرژی|گرمایش)/i
  ];

  function lang(){const l=document.documentElement.lang||'sv';return copy[l]?l:'sv'}
  function c(k){return copy[lang()][k]}
  function homeEnergyDetected(text){return HOME_ENERGY_PATTERNS.some(pattern=>pattern.test(String(text||'')))}
  function homeEnergyHref(){return `person-pilot.html?actor_type=private_person&focus=home_energy&lang=${encodeURIComponent(lang())}`}
  function route(){
    const first=box.querySelector('a.route');
    if(first){
      try{
        const url=new URL(first.href,location.href);
        if(String(url.searchParams.get('focus')||'').toLowerCase()==='home_energy') return 'home_energy';
      }catch(_err){/* fall back to governed coarse route */}
    }
    return String(box.dataset.primaryRoute||'general').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32)||'general';
  }
  function addHomeEnergyRoute(){
    const input=document.getElementById('situation');
    if(!input||box.hidden||!homeEnergyDetected(input.value)) return;
    if(box.querySelector('[data-home-energy-route="true"]')) return;
    const link=document.createElement('a');
    link.className='route';
    link.dataset.homeEnergyRoute='true';
    link.href=homeEnergyHref();
    const text=document.createElement('span');
    const title=document.createElement('strong');
    const sub=document.createElement('small');
    title.textContent=c('homeTitle');
    sub.textContent=c('homeSub');
    text.append(title,sub);
    const arrow=document.createElement('span');
    arrow.className='arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent='→';
    link.append(text,arrow);
    box.insertBefore(link,box.querySelector('a.route')||null);
  }
  function panel(){
    if(box.querySelector('[data-experience-feedback]')) return;
    const wrap=document.createElement('section');
    wrap.dataset.experienceFeedback='true';
    wrap.style.cssText='margin-top:16px;padding:16px;border:1px solid #dce6e1;border-radius:16px;background:#f8fbf9';
    wrap.innerHTML=`<strong>${c('title')}</strong><div data-q="useful" style="margin-top:10px"><span>${c('useful')}</span> <button type="button" data-v="true" aria-pressed="false">${c('yes')}</button> <button type="button" data-v="false" aria-pressed="false">${c('no')}</button></div><div data-q="clear" style="margin-top:8px"><span>${c('clear')}</span> <button type="button" data-v="true" aria-pressed="false">${c('yes')}</button> <button type="button" data-v="false" aria-pressed="false">${c('no')}</button></div><div data-q="learned_new" style="margin-top:8px"><span>${c('newq')}</span> <button type="button" data-v="true" aria-pressed="false">${c('yes')}</button> <button type="button" data-v="false" aria-pressed="false">${c('no')}</button></div><div style="margin-top:10px;font-size:12px;color:#5f706a">🔒 ${c('note')}</div><button type="button" data-send style="margin-top:10px">${c('send')}</button><div data-status role="status" aria-live="polite" style="margin-top:8px"></div>`;
    const state={};
    const status=wrap.querySelector('[data-status]');
    wrap.querySelectorAll('[data-q] button').forEach(btn=>btn.addEventListener('click',()=>{
      const q=btn.closest('[data-q]').dataset.q;
      state[q]=btn.dataset.v==='true';
      btn.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
      status.textContent='';
    }));
    wrap.querySelector('[data-send]').addEventListener('click',async()=>{
      if(typeof state.useful!=='boolean'||typeof state.clear!=='boolean'||typeof state.learned_new!=='boolean'){
        status.textContent=c('needAnswers');
        const firstMissing=['useful','clear','learned_new'].find(q=>typeof state[q]!=='boolean');
        const firstButton=firstMissing&&wrap.querySelector(`[data-q="${firstMissing}"] button`);
        if(firstButton) firstButton.focus();
        return;
      }
      const payload={app_version:APP_VERSION,language:lang(),flow:`situation_engine_${route()}`.slice(0,64),learned_new:state.learned_new,useful:state.useful,next_step_clear:state.clear,ratings:{}};
      try{
        const res=await fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!res.ok) throw new Error('HTTP '+res.status);
        status.textContent=c('sent');
      }catch(e){status.textContent=c('error')}
    });
    box.appendChild(wrap);
  }

  new MutationObserver(()=>{if(!box.hidden){addHomeEnergyRoute();panel()}}).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();