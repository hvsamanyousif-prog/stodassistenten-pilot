(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.STODFamilySupportContext=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  // Shared context helper for the SAME person/family flow. It classifies only
  // a coarse route-changing need; it does not decide entitlement, amount,
  // duration, diagnosis sufficiency or whether a cost is legally qualifying.
  const OMV_URL='https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/omvardnadsbidrag';
  const MERK_URL='https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/merkostnadsersattning-for-barn';
  const NEEDS=Object.freeze(['care','cost','both','unsure']);
  const CHILD=/\b(?:mitt|vårt|vårat)\s+barn\b|\bmin\s+(?:son|dotter)\b|\bbarnet\b|طفلي|ابني|ابنتي|طفلنا|فرزندم|پسرم|دخترم|کودکم/i;
  const CARE=/extra\s+(?:omvårdnad|tillsyn|hjälp|stöd)|mycket\s+mer\s+(?:hjälp|tillsyn|övervakning|omvårdnad)|behöver\s+mer\s+(?:hjälp|tillsyn|övervakning|omvårdnad)|uppsikt|رعاية\s+إضافية|مراقبة\s+إضافية|مساعدة\s+أكثر|نیاز\s+به\s+مراقبت\s+بیشتر|نظارت\s+بیشتر|کمک\s+بیشتر/i;
  const COST=/extra\s+(?:kostnad|kostnader|utgift|utgifter)|merkostnad|merkostnader|kostar\s+mycket\s+mer|تكاليف\s+إضافية|مصاريف\s+إضافية|هزینه(?:‌|\s)*های?\s+اضافی|هزینه\s+بیشتر/i;
  const LEGACY=/\bvårdbidrag\b/i;
  const DIAGNOSIS=/autism|adhd|npf|funktionsnedsättning|funktionshinder|توحد|اضطراب\s*فرط\s*الحركة|إعاقة|اوتیسم|بیش.?فعالی|معلولیت|ناتوانی/i;
  const PROFESSIONAL=/\b(?:jobbar|arbetar)\s+(?:med|inom)\s+(?:barn|unga|familj|funktionsnedsättning)|\b(?:uppsats|rapport|statistik|forskning|utredning)\b.{0,80}\b(?:omvårdnadsbidrag|merkostnadsersättning|vårdbidrag|barn)\b/i;

  const ROWS={
    sv:{
      care:['Omvårdnadsbidrag – kontrollera om behovet passar','Försäkringskassan beskriver omvårdnadsbidrag för barn som behöver mer omvårdnad och tillsyn än barn i samma ålder. Diagnosen i sig avgör inte. Kontrollera barnets konkreta extra behov mot den aktuella primärkällan.',OMV_URL],
      cost:['Merkostnadsersättning för barn – kontrollera vilka extra kostnader som kan räknas','Försäkringskassan bedömer vilka kostnader som kan räknas som merkostnader. Alla utgifter eller alla kostnader kopplade till en diagnos räknas inte automatiskt. Kontrollera de konkreta extra kostnaderna mot den aktuella primärkällan.',MERK_URL]
    },
    ar:{
      care:['Omvårdnadsbidrag – تحقّق من ملاءمة الحاجة','توضح Försäkringskassan أن المسار يتعلق بالطفل الذي يحتاج إلى رعاية ومراقبة أكثر من طفل في العمر نفسه. التشخيص وحده لا يحسم الاستحقاق. تحقّق من الاحتياجات الإضافية الفعلية في المصدر الرسمي الحالي.',OMV_URL],
      cost:['Merkostnadsersättning للطفل – تحقّق من التكاليف الإضافية التي يمكن احتسابها','تقيّم Försäkringskassan أي تكاليف يمكن اعتبارها merkostnader. ليست كل مصروفات أو تكاليف مرتبطة بتشخيص مؤهلة تلقائياً. تحقّق من التكاليف الإضافية الفعلية في المصدر الرسمي الحالي.',MERK_URL]
    },
    fa:{
      care:['Omvårdnadsbidrag – بررسی کن آیا نیاز با این مسیر هم‌خوان است','Försäkringskassan این مسیر را برای کودکی توضیح می‌دهد که نسبت به کودک هم‌سن به مراقبت و نظارت بیشتری نیاز دارد. صرف تشخیص، استحقاق را تعیین نمی‌کند. نیازهای اضافی واقعی را در منبع رسمی فعلی بررسی کن.',OMV_URL],
      cost:['Merkostnadsersättning برای کودک – بررسی کن کدام هزینه‌های اضافی قابل محاسبه‌اند','Försäkringskassan بررسی می‌کند کدام هزینه‌ها می‌توانند merkostnader محسوب شوند. هر خرج یا هر هزینه مرتبط با تشخیص به‌طور خودکار واجد شرایط نیست. هزینه‌های اضافی واقعی را در منبع رسمی فعلی بررسی کن.',MERK_URL]
    }
  };

  function safeLang(value){const v=String(value||'').toLowerCase();return ['sv','ar','fa'].includes(v)?v:'sv';}
  function normalizeNeed(value){const v=String(value||'').toLowerCase();return NEEDS.includes(v)?v:'unsure';}
  function isProfessional(text){return PROFESSIONAL.test(String(text||''));}
  function detectNeed(text){
    const value=String(text||'');
    if(!CHILD.test(value)||isProfessional(value))return null;
    const care=CARE.test(value),cost=COST.test(value);
    if(care&&cost)return 'both';
    if(care)return 'care';
    if(cost)return 'cost';
    if(LEGACY.test(value)||DIAGNOSIS.test(value))return 'unsure';
    return null;
  }
  function rowsForNeed(language,need){
    const lang=safeLang(language),n=normalizeNeed(need),rows=ROWS[lang];
    if(n==='care')return [rows.care.slice()];
    if(n==='cost')return [rows.cost.slice()];
    return [rows.care.slice(),rows.cost.slice()];
  }

  return Object.freeze({OMV_URL,MERK_URL,NEEDS,safeLang,normalizeNeed,isProfessional,detectNeed,rowsForNeed});
});
