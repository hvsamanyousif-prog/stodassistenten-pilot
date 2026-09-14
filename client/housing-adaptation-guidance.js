(() => {
  const params = new URLSearchParams(location.search);
  const mode = String(params.get('mode') || '').toLowerCase();
  const box = document.getElementById('results');
  if (mode !== 'vision' || !box) return;

  const SOURCES = {
    applicant: 'https://www.boverket.se/sv/babhandboken/bostadsanpassningsbidrag/villkor-for-bostadsanpassningsbidrag/vem-ska-ansoka/',
    permanent: 'https://www.boverket.se/sv/babhandboken/bostadsanpassningsbidrag/villkor-for-bostadsanpassningsbidrag/dar-sokanden-bor-permanent/',
    consent: 'https://www.boverket.se/sv/babhandboken/bostadsanpassningsbidrag/handlaggning/guide-for-handlaggning/Fastighetsagarens-medgivande/',
    application: 'https://www.boverket.se/sv/babhandboken/bostadsanpassningsbidrag/handlaggning/guide-for-handlaggning/ansokan/'
  };

  const COPY = {
    sv: {
      eyebrow: 'Bostadsanpassning · nästa steg',
      title: 'Tre uppgifter kan ändra vägen',
      intro: 'Hyresrätt eller delat kontrakt utesluter inte vägen. Personen med funktionsnedsättning är sökande, men bostadens användning och skriftliga medgivanden kan ändra vad som behöver göras före ett positivt beslut.',
      permanentLabel: '1. Är detta bostaden där personen bor permanent?',
      permanentOptions: [['', 'Välj'], ['yes', 'Ja'], ['no', 'Nej'], ['unsure', 'Osäker / periodiskt boende']],
      tenureLabel: '2. Hur ser ägande- eller nyttjanderätten ut?',
      tenureOptions: [['', 'Välj'], ['sole', 'Sökanden är ensam ägare/ensam relevant rättighetshavare'], ['shared', 'Hyresrätt, bostadsrätt eller annan ägare/rättighetshavare finns'], ['secondhand', 'Bostaden hyrs i andra hand'], ['unsure', 'Osäker']],
      consentLabel: '3. Finns de skriftliga medgivanden som behövs?',
      consentHint: 'Relevant när någon annan helt eller delvis äger bostaden eller har relevant nyttjanderätt.',
      consentOptions: [['', 'Välj'], ['yes', 'Ja, de skriftliga medgivandena finns'], ['no', 'Nej'], ['unsure', 'Osäker']],
      nextLabel: 'Nästa steg',
      nextStart: 'Välj uppgifterna ovan. Stödassistenten visar sedan vilket processsteg som är mest värt att kontrollera – inte om bidraget kommer att beviljas.',
      nextPermanent: 'Kontakta kommunen där bostaden finns och kontrollera först hur boendesituationen ska bedömas. Bidraget gäller i grunden permanentbostad och vissa periodiska boendesituationer. Dra ingen slutsats om rätt till bidrag ännu.',
      nextConsent: 'Be kommunen om rätt underlag för skriftligt medgivande. Identifiera alla relevanta ägare och nyttjanderättshavare. Ett positivt beslut kan inte fattas innan nödvändiga skriftliga medgivanden finns; ägare ska också lämna den utfästelse om återställningsersättning som reglerna kräver. Medgivande är inte samma sak som rätt till bidrag.',
      nextSecondhand: 'Andrahandsboende kan kräva en särskild bedömning av hur långvarig upplåtelsen är. Kontakta kommunen där bostaden finns, beskriv den konkreta barriären och kontrollera både boendevillkoret och vilka skriftliga medgivanden som behövs.',
      nextApply: 'Kontakta kommunen där bostaden finns. Personen med funktionsnedsättning är sökande. Beskriv den konkreta barriären i bostaden och vilken fast anpassning som behöver prövas, och kontrollera vilka intyg eller andra underlag kommunen behöver.',
      sourceApplicant: 'Vem ansöker?',
      sourcePermanent: 'Permanentbostad',
      sourceConsent: 'Medgivanden',
      sourceApplication: 'Ansökan hos kommunen',
      guard: 'Stödassistenten avgör inte rätt till bidrag. Diagnos, boendeform eller ett medgivande räcker inte ensamt för att fastställa rätt.'
    },
    ar: {
      eyebrow: 'تكييف السكن · الخطوة التالية',
      title: 'ثلاث معلومات قد تغيّر المسار',
      intro: 'الإيجار أو العقد المشترك لا يستبعدان المسار تلقائياً. الشخص ذو الإعاقة هو مقدم الطلب، لكن نوع السكن والموافقات الخطية قد يغيّران ما يجب استكماله قبل قرار إيجابي.',
      permanentLabel: '1. هل هذا هو السكن الدائم للشخص؟',
      permanentOptions: [['', 'اختر'], ['yes', 'نعم'], ['no', 'لا'], ['unsure', 'غير متأكد / سكن دوري']],
      tenureLabel: '2. ما وضع الملكية أو حق الانتفاع بالسكن؟',
      tenureOptions: [['', 'اختر'], ['sole', 'مقدم الطلب هو المالك الوحيد/صاحب الحق الوحيد ذي الصلة'], ['shared', 'يوجد إيجار أو ملكية تعاونية أو مالك/صاحب حق آخر'], ['secondhand', 'السكن مستأجر من الباطن'], ['unsure', 'غير متأكد']],
      consentLabel: '3. هل توجد الموافقات الخطية المطلوبة؟',
      consentHint: 'يصبح هذا مهماً عندما يملك شخص آخر السكن كلياً أو جزئياً أو لديه حق انتفاع ذي صلة.',
      consentOptions: [['', 'اختر'], ['yes', 'نعم، الموافقات الخطية موجودة'], ['no', 'لا'], ['unsure', 'غير متأكد']],
      nextLabel: 'الخطوة التالية',
      nextStart: 'اختر المعلومات أعلاه. سيعرض مساعد الدعم خطوة العملية التي تستحق التحقق أولاً، وليس قراراً حول استحقاق المنحة.',
      nextPermanent: 'تواصل مع البلدية التي يقع فيها السكن وتحقق أولاً من كيفية تقييم وضع السكن. المنحة تتعلق أساساً بالسكن الدائم وبعض حالات السكن الدوري. لا تستنتج الاستحقاق بعد.',
      nextConsent: 'اطلب من البلدية النموذج أو الإجراء الصحيح للموافقات الخطية. حدّد جميع المالكين وأصحاب حقوق الانتفاع ذوي الصلة. لا يمكن إصدار قرار إيجابي قبل وجود الموافقات الخطية المطلوبة، وعلى المالك أيضاً تقديم التعهد المتعلق بعدم المطالبة بتكاليف إعادة الحال عندما تتطلب القواعد ذلك. الموافقة لا تعني الاستحقاق.',
      nextSecondhand: 'الإيجار من الباطن قد يتطلب تقييماً خاصاً لمدة الإيجار. تواصل مع البلدية، واشرح العائق الملموس في السكن، وتحقق من شرط السكن ومن الموافقات الخطية المطلوبة.',
      nextApply: 'تواصل مع البلدية التي يقع فيها السكن. الشخص ذو الإعاقة هو مقدم الطلب. اشرح العائق الملموس وما هو التعديل الثابت المطلوب فحصه، وتحقق من الشهادات أو المستندات التي تحتاجها البلدية.',
      sourceApplicant: 'من يقدم الطلب؟',
      sourcePermanent: 'السكن الدائم',
      sourceConsent: 'الموافقات',
      sourceApplication: 'الطلب لدى البلدية',
      guard: 'مساعد الدعم لا يقرر الحق في المنحة. التشخيص أو نوع السكن أو الموافقة وحدها لا تكفي لإثبات الاستحقاق.'
    },
    fa: {
      eyebrow: 'مناسب‌سازی مسکن · گام بعدی',
      title: 'سه اطلاعات می‌تواند مسیر را تغییر دهد',
      intro: 'اجاره‌ای بودن یا قرارداد مشترک به‌خودی‌خود این مسیر را رد نمی‌کند. فرد دارای معلولیت متقاضی است، اما وضعیت سکونت و رضایت‌های کتبی می‌تواند تعیین کند پیش از تصمیم مثبت چه چیزی باید تکمیل شود.',
      permanentLabel: '۱. آیا این محل، اقامتگاه دائمی فرد است؟',
      permanentOptions: [['', 'انتخاب کنید'], ['yes', 'بله'], ['no', 'خیر'], ['unsure', 'مطمئن نیستم / سکونت دوره‌ای']],
      tenureLabel: '۲. وضعیت مالکیت یا حق استفاده از مسکن چگونه است؟',
      tenureOptions: [['', 'انتخاب کنید'], ['sole', 'متقاضی تنها مالک/تنها دارنده حق مرتبط است'], ['shared', 'اجاره، مالکیت تعاونی یا مالک/دارنده حق دیگری وجود دارد'], ['secondhand', 'مسکن به صورت دست‌دوم اجاره شده است'], ['unsure', 'مطمئن نیستم']],
      consentLabel: '۳. آیا رضایت‌های کتبی لازم وجود دارد؟',
      consentHint: 'وقتی شخص دیگری تمام یا بخشی از مسکن را مالک است یا حق استفاده مرتبط دارد، این موضوع مهم می‌شود.',
      consentOptions: [['', 'انتخاب کنید'], ['yes', 'بله، رضایت‌های کتبی وجود دارد'], ['no', 'خیر'], ['unsure', 'مطمئن نیستم']],
      nextLabel: 'گام بعدی',
      nextStart: 'اطلاعات بالا را انتخاب کنید. سپس Stödassistenten نشان می‌دهد کدام گام فرایندی ارزش بررسی بیشتری دارد؛ نه اینکه کمک‌هزینه حتماً تعلق می‌گیرد.',
      nextPermanent: 'با شهرداری محل مسکن تماس بگیرید و ابتدا روشن کنید وضعیت سکونت چگونه ارزیابی می‌شود. این کمک‌هزینه در اصل برای اقامتگاه دائمی و برخی وضعیت‌های سکونت دوره‌ای است. هنوز درباره استحقاق نتیجه‌گیری نکنید.',
      nextConsent: 'از شهرداری درباره فرم یا روش درست رضایت کتبی بپرسید. همه مالکان و دارندگان حق استفاده مرتبط را مشخص کنید. پیش از وجود رضایت‌های کتبی لازم، تصمیم مثبت صادر نمی‌شود؛ مالک نیز در موارد مقرر باید تعهد مربوط به عدم مطالبه هزینه بازگرداندن وضعیت را بدهد. رضایت به معنای استحقاق نیست.',
      nextSecondhand: 'اجاره دست‌دوم می‌تواند به ارزیابی جداگانه درباره مدت اجاره نیاز داشته باشد. با شهرداری تماس بگیرید، مانع مشخص در خانه را توضیح دهید و هم شرط سکونت و هم رضایت‌های کتبی لازم را بررسی کنید.',
      nextApply: 'با شهرداری محل مسکن تماس بگیرید. فرد دارای معلولیت متقاضی است. مانع مشخص در خانه و تغییر ثابت مورد نیاز را توضیح دهید و بررسی کنید شهرداری چه گواهی یا مدارکی لازم دارد.',
      sourceApplicant: 'چه کسی درخواست می‌دهد؟',
      sourcePermanent: 'اقامتگاه دائمی',
      sourceConsent: 'رضایت‌ها',
      sourceApplication: 'درخواست نزد شهرداری',
      guard: 'Stödassistenten درباره حق دریافت کمک‌هزینه تصمیم نمی‌گیرد. تشخیص، نوع مسکن یا رضایت به‌تنهایی برای اثبات استحقاق کافی نیست.'
    }
  };

  const style = document.createElement('style');
  style.textContent = '.housing-guide{border-color:#a8c7bc;background:#fbfdfc}.housing-guide .hg-grid{display:grid;grid-template-columns:1fr;gap:13px;margin:16px 0}.housing-guide label{display:block;font-weight:850;font-size:14px;margin-bottom:6px}.housing-guide select{width:100%;min-height:46px;border:1px solid #cad8d2;border-radius:12px;background:#fff;color:inherit;padding:9px 11px;font:inherit}.housing-guide select:focus-visible{outline:3px solid #111;outline-offset:2px}.housing-guide .hg-hint{display:block;color:var(--muted);font-size:12px;margin-top:5px}.housing-guide .hg-sources{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.housing-guide .hg-guard{font-size:12px;color:var(--muted);margin-top:12px}.housing-guide [hidden]{display:none!important}';
  document.head.appendChild(style);

  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const locale = () => COPY[document.documentElement.lang] ? document.documentElement.lang : 'sv';
  const options = items => items.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');

  function nextAction(permanent, tenure, consent, c) {
    if (!permanent || !tenure) return c.nextStart;
    if (permanent === 'no' || permanent === 'unsure') return c.nextPermanent;
    if (tenure === 'secondhand') return c.nextSecondhand;
    if (tenure === 'shared' || tenure === 'unsure') {
      if (consent !== 'yes') return c.nextConsent;
    }
    return c.nextApply;
  }

  function updateGuide(section) {
    const c = COPY[locale()];
    const permanent = section.querySelector('[data-hg="permanent"]').value;
    const tenure = section.querySelector('[data-hg="tenure"]').value;
    const consentWrap = section.querySelector('[data-hg-wrap="consent"]');
    const consentSelect = section.querySelector('[data-hg="consent"]');
    const needsConsent = tenure === 'shared' || tenure === 'unsure';
    consentWrap.hidden = !needsConsent;
    if (!needsConsent) consentSelect.value = '';
    section.querySelector('[data-hg-output]').textContent = nextAction(permanent, tenure, consentSelect.value, c);
  }

  function buildGuide() {
    const c = COPY[locale()];
    const section = document.createElement('article');
    section.className = 'card housing-guide';
    section.id = 'housingAdaptationGuide';
    section.setAttribute('data-local-only', 'true');
    section.innerHTML = `
      <div class="label">${esc(c.eyebrow)}</div>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.intro)}</p>
      <div class="hg-grid">
        <div>
          <label for="hgPermanent">${esc(c.permanentLabel)}</label>
          <select id="hgPermanent" data-hg="permanent">${options(c.permanentOptions)}</select>
        </div>
        <div>
          <label for="hgTenure">${esc(c.tenureLabel)}</label>
          <select id="hgTenure" data-hg="tenure">${options(c.tenureOptions)}</select>
        </div>
        <div data-hg-wrap="consent" hidden>
          <label for="hgConsent">${esc(c.consentLabel)}</label>
          <select id="hgConsent" data-hg="consent">${options(c.consentOptions)}</select>
          <small class="hg-hint">${esc(c.consentHint)}</small>
        </div>
      </div>
      <div class="next"><b>${esc(c.nextLabel)}:</b> <span data-hg-output aria-live="polite">${esc(c.nextStart)}</span></div>
      <div class="hg-sources">
        <a class="source" href="${SOURCES.applicant}" target="_blank" rel="noopener">${esc(c.sourceApplicant)} <span aria-hidden="true">↗</span></a>
        <a class="source" href="${SOURCES.permanent}" target="_blank" rel="noopener">${esc(c.sourcePermanent)} <span aria-hidden="true">↗</span></a>
        <a class="source" href="${SOURCES.consent}" target="_blank" rel="noopener">${esc(c.sourceConsent)} <span aria-hidden="true">↗</span></a>
        <a class="source" href="${SOURCES.application}" target="_blank" rel="noopener">${esc(c.sourceApplication)} <span aria-hidden="true">↗</span></a>
      </div>
      <p class="hg-guard">${esc(c.guard)}</p>
    `;
    section.querySelectorAll('select').forEach(select => select.addEventListener('change', () => updateGuide(section)));
    updateGuide(section);
    return section;
  }

  function sync() {
    const need = new URLSearchParams(location.search).get('need');
    const existing = document.getElementById('housingAdaptationGuide');
    if (need !== 'home') {
      if (existing) existing.remove();
      return;
    }
    const cards = box.querySelector('.cards');
    if (!cards) return;
    if (existing) {
      existing.remove();
    }
    cards.appendChild(buildGuide());
  }

  let queued = false;
  const scheduleSync = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      sync();
    });
  };

  new MutationObserver(scheduleSync).observe(box, {childList: true, subtree: true});
  window.addEventListener('popstate', scheduleSync);
  scheduleSync();
})();
