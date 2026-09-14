(() => {
  function installGovernedRoutes(){
    let rerender=false;
    try{
      if(typeof KEYWORDS!=='undefined'){
        KEYWORDS.assistance=[
          'personlig assistans','assistans','hjälp med hygien','personlig hygien','hjälp med påklädning','påklädning','hjälp med toalett','toalett','hjälp att äta','hjälp med måltider','hjälp med kommunikation','andning',
          'مساعدة شخصية','النظافة الشخصية','المساعدة في اللباس','ارتداء الملابس','المساعدة في الأكل','المساعدة في التواصل','التنفس',
          'کمک شخصی','بهداشت شخصی','کمک برای لباس پوشیدن','لباس پوشیدن','کمک برای غذا خوردن','کمک در ارتباط','تنفس'
        ];
        KEYWORDS.family=[
          'barn behöver extra stöd','barnet behöver extra stöd','extra tillsyn','extra omvårdnad','mycket hjälp i vardagen','stöd i skolan','hjälp i skolan','barn med stödbehov',
          'طفلي يحتاج دعماً إضافياً','يحتاج مراقبة إضافية','رعاية إضافية','مساعدة إضافية في المدرسة',
          'کودکم به حمایت بیشتری نیاز دارد','نظارت بیشتر','مراقبت بیشتر','کمک بیشتر در مدرسه'
        ];
        KEYWORDS.vab=[
          'jag behöver vabba','behöver vabba','mitt barn är sjukt','barnet är sjukt och jag måste vara hemma','stanna hemma med sjukt barn','sjukt barn och sjukskriven','vabba resten av dagen','vabba del av dagen',
          'طفلي مريض ويجب أن أبقى في المنزل','أحتاج إلى رعاية طفلي المريض','أحتاج إلى VAB','طفل مريض وإجازة مرضية جزئية',
          'کودکم بیمار است و باید خانه بمانم','برای کودک بیمار باید خانه بمانم','به VAB نیاز دارم','کودک بیمار و مرخصی بیماری پاره‌وقت'
        ];
        // Owner-side housing-adaptation discovery. Keep this bounded to explicit
        // BRF/landlord/property + adaptation/common-area language so a resident
        // asking about their own home is not reclassified as a property actor.
        KEYWORDS.property=[
          'brf styrelse bostadsanpassning','bostadsrättsförening bostadsanpassning','hyresvärd bostadsanpassning','fastighetsägare bostadsanpassning','brf ramp entré','brf dörröppnare entré','ta över bostadsanpassningsbidrag','gemensamma utrymmen bostadsanpassning',
          'جمعية سكنية تكييف السكن','مالك العقار تكييف السكن','منحدر مدخل المبنى','المساحات المشتركة تكييف السكن',
          'هیئت مدیره ساختمان مناسب سازی مسکن','مالک ساختمان مناسب سازی','رمپ ورودی ساختمان','فضای مشترک مناسب سازی'
        ];
      }
      if(typeof I18N!=='undefined'){
        const routes={
          sv:['BRF / fastighetsaktör','Bostadsanpassning i entré eller gemensamma utrymmen','person-pilot.html?actor_type=property_actor&focus=property_accessibility'],
          ar:['جمعية سكنية / مالك عقار','تكييف المدخل أو المساحات المشتركة','person-pilot.html?actor_type=property_actor&focus=property_accessibility'],
          fa:['انجمن ساختمان / مالک ملک','مناسب‌سازی ورودی یا فضاهای مشترک','person-pilot.html?actor_type=property_actor&focus=property_accessibility']
        };
        for(const code of ['sv','ar','fa']){
          if(I18N[code]&&I18N[code].routes){
            if(code==='sv'){
              I18N[code].routes.assistance=['Personlig hjälp i vardagen','Hygien, påklädning, måltider, kommunikation eller annat omfattande hjälpbehov','person-pilot.html?actor_type=private_person&focus=assistance'];
              I18N[code].routes.family=['Barn/familj – extra stödbehov','Extra omvårdnad, tillsyn, vardagsstöd eller stöd kring skolan','person-pilot.html?actor_type=relative&focus=family'];
              I18N[code].routes.vab=['Sjukt barn / VAB','Barnets ålder, egen sjukfrånvaro och rätt timmar kan ändra nästa steg','person-pilot.html?actor_type=relative&focus=vab'];
            }else if(code==='ar'){
              I18N[code].routes.assistance=['مساعدة شخصية في الحياة اليومية','النظافة الشخصية، اللباس، الوجبات، التواصل أو احتياجات مساعدة واسعة','person-pilot.html?actor_type=private_person&focus=assistance'];
              I18N[code].routes.family=['الطفل/الأسرة – حاجة إلى دعم إضافي','رعاية أو مراقبة أو مساعدة يومية إضافية أو دعم متعلق بالمدرسة','person-pilot.html?actor_type=relative&focus=family'];
              I18N[code].routes.vab=['طفل مريض / VAB','عمر الطفل وغيابك المرضي والساعات الفعلية قد تغيّر الخطوة التالية','person-pilot.html?actor_type=relative&focus=vab'];
            }else{
              I18N[code].routes.assistance=['کمک شخصی در زندگی روزمره','بهداشت شخصی، لباس پوشیدن، غذا، ارتباط یا نیاز گسترده به کمک','person-pilot.html?actor_type=private_person&focus=assistance'];
              I18N[code].routes.family=['کودک/خانواده – نیاز به حمایت بیشتر','مراقبت، نظارت، کمک روزمره یا حمایت مرتبط با مدرسه','person-pilot.html?actor_type=relative&focus=family'];
              I18N[code].routes.vab=['کودک بیمار / VAB','سن کودک، مرخصی بیماری خودت و ساعت‌های واقعی می‌تواند قدم بعدی را تغییر دهد','person-pilot.html?actor_type=relative&focus=vab'];
            }
            I18N[code].routes.property=routes[code];
          }
          if(I18N[code]&&Array.isArray(I18N[code].actorsData)&&!I18N[code].actorsData.some(a=>String(a[2]||'').includes('actor_type=property_actor'))){
            I18N[code].actorsData.push(routes[code]);
            rerender=true;
          }
        }
      }
      if(rerender&&typeof render==='function') render();
    }catch(_err){/* source shell remains usable if governed route augmentation cannot load */}
  }
  installGovernedRoutes();

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
    if(focus==='family') return 'family';
    if(focus==='vab') return 'vab';
    if(focus==='property_accessibility') return 'property';
    if(url.pathname.endsWith('company-pilot.html')) return 'company';
    const actor=safeToken(url.searchParams.get('actor_type'));
    return {employee:'work',student:'study',association:'association',property_actor:'property',private_person:'economy',relative:'general',other:'general'}[actor]||'general';
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