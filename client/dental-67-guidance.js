(() => {
  const params = new URLSearchParams(location.search);
  if ((params.get('mode') || '').toLowerCase() !== 'dental') return;

  const results = document.getElementById('results');
  if (!results) return;

  const ELIGIBLE_NEEDS = new Set(['cost', 'support', 'unsure']);
  const FK_URL = 'https://www.forsakringskassan.se/privatperson/tandvard/tandvardsstod/ett-battre-skydd-mot-hoga-tandvardskostnader';
  const TLV_URL = 'https://www.tlv.se/tandvard/regelverk-om-tandvardsstodet.html';

  const COPY = {
    sv: {
      eyebrow: 'Åldersregel som kan ändra kostnadsvägen',
      question: 'Fyller du 67 år eller mer under kalenderåret då behandlingen görs?',
      hint: 'Den här frågan ställs bara för att den kan ändra vilken tandvårdsväg som är relevant. Den avgör inte om en viss behandling omfattas.',
      yes: 'Ja', no: 'Nej', unsure: 'Osäker',
      yesTitle: 'Kontrollera det förstärkta 67+-spåret innan du räknar på kostnaden',
      yesBody: 'Försäkringskassan beskriver ett förstärkt högkostnadsskydd från kalenderåret man fyller 67, men bara för vissa behandlingar. Det betyder inte att hela tandläkarbesöket automatiskt omfattas eller får en viss slutkostnad.',
      yesNext: 'Be kliniken visa behandlingsförslaget åtgärd för åtgärd, med vårdgivarpris och referenspris, och ange vilka åtgärder de bedömer hör till det förstärkta respektive ordinarie högkostnadsskyddet. Kontrollera sedan mot aktuell Försäkringskasse- och TLV-information.',
      noTitle: 'Fortsätt med den vanliga tandvårdsstödsvägen',
      noBody: '67+-spåret är inte rätt åldersväg utifrån ditt svar. De generella tandvårdsstöden och högkostnadsskyddet i resultatet ovan kan fortfarande vara relevanta beroende på situation och behandling.',
      noNext: 'Be kliniken om prisuppgift och kontroll av vilka vanliga statliga tandvårdsstöd som kan användas för de planerade åtgärderna.',
      unsureTitle: 'Behåll den generella vägen tills kalenderårsfrågan är klar',
      unsureBody: 'Exakt ålder på behandlingsdagen är inte den enda uppgiften som behövs här. Kontrollera om du fyller 67 någon gång under samma kalenderår innan 67+-spåret används.',
      unsureNext: 'Ta reda på kalenderåret för behandlingen och om du fyller 67 eller mer under det året. Låt sedan kliniken kontrollera den konkreta åtgärden innan någon kostnad slutsats dras.',
      guard: 'Viktigt: “tiotandvård” får inte tolkas som att hela fakturan automatiskt kostar 10 %. Undersökning, förebyggande vård och röntgen ligger enligt Försäkringskassans aktuella vägledning utanför just det förstärkta skyddet; andra statliga tandvårdsstöd kan fortfarande vara aktuella.',
      sourceFk: 'Försäkringskassan', sourceTlv: 'TLV:s regelverk', next: 'Nästa säkra steg'
    },
    ar: {
      eyebrow: 'قاعدة عمر قد تغيّر مسار التكلفة',
      question: 'هل تبلغ 67 عاماً أو أكثر خلال السنة التقويمية التي يتم فيها العلاج؟',
      hint: 'نسأل هذا فقط لأنه قد يغيّر المسار المناسب. الإجابة لا تقرر ما إذا كان علاج محدد مشمولاً.',
      yes: 'نعم', no: 'لا', unsure: 'غير متأكد',
      yesTitle: 'تحقق من مسار الحماية المعززة لعمر 67+ قبل حساب التكلفة',
      yesBody: 'تصف Försäkringskassan حماية معززة من التكاليف المرتفعة ابتداءً من السنة التقويمية التي يبلغ فيها الشخص 67 عاماً، ولكن لبعض العلاجات فقط. هذا لا يعني أن الزيارة أو الفاتورة كلها مشمولة تلقائياً أو أن لها تكلفة نهائية مضمونة.',
      yesNext: 'اطلب من العيادة عرض خطة العلاج إجراءً بإجراء، مع سعر مقدم الرعاية والسعر المرجعي، وبيان ما يعتبرونه ضمن الحماية المعززة وما يبقى ضمن الحماية العادية. ثم تحقق من معلومات Försäkringskassan وTLV الحالية.',
      noTitle: 'تابع مسار دعم الأسنان العام',
      noBody: 'مسار 67+ ليس مسار العمر المناسب بناءً على إجابتك. قد تظل أشكال دعم الأسنان العامة وحماية التكاليف المرتفعة ذات صلة حسب حالتك والعلاج.',
      noNext: 'اطلب تقدير سعر من العيادة وتحقق من الدعم الحكومي العادي الذي يمكن استخدامه للإجراءات المقترحة.',
      unsureTitle: 'ابقَ على المسار العام حتى تتضح سنة العمر',
      unsureBody: 'العمر الدقيق في يوم العلاج ليس المعلومة الوحيدة هنا. تحقق مما إذا كنت ستبلغ 67 عاماً في أي وقت خلال السنة التقويمية نفسها قبل استخدام مسار 67+.',
      unsureNext: 'حدد سنة العلاج وما إذا كنت ستبلغ 67 أو أكثر خلال تلك السنة، ثم دع العيادة تتحقق من الإجراء المحدد قبل استنتاج التكلفة.',
      guard: 'مهم: لا يجوز فهم “tiotandvård” على أنه يعني أن الفاتورة كلها تصبح تلقائياً 10٪. وفق الإرشادات الحالية لـ Försäkringskassan، الفحص والرعاية الوقائية والأشعة خارج الحماية المعززة نفسها؛ وقد تظل أشكال دعم أخرى متاحة.',
      sourceFk: 'Försäkringskassan', sourceTlv: 'قواعد TLV', next: 'الخطوة الآمنة التالية'
    },
    fa: {
      eyebrow: 'قاعده سنی که می‌تواند مسیر هزینه را تغییر دهد',
      question: 'آیا در سال تقویمی انجام درمان، ۶۷ ساله یا بیشتر می‌شوی؟',
      hint: 'این پرسش فقط چون می‌تواند مسیر مناسب را تغییر دهد مطرح می‌شود. پاسخ، پوشش یک درمان مشخص را تعیین نمی‌کند.',
      yes: 'بله', no: 'خیر', unsure: 'مطمئن نیستم',
      yesTitle: 'پیش از برآورد هزینه، مسیر تقویت‌شده ۶۷+ را بررسی کن',
      yesBody: 'Försäkringskassan از حمایت تقویت‌شده هزینه‌های بالا از سال تقویمی که فرد ۶۷ ساله می‌شود توضیح می‌دهد، اما فقط برای برخی درمان‌ها. این به معنی پوشش خودکار کل مراجعه یا تضمین هزینه نهایی مشخص نیست.',
      yesNext: 'از کلینیک بخواه طرح درمان را اقدام‌به‌اقدام با قیمت ارائه‌دهنده و قیمت مرجع نشان دهد و مشخص کند کدام اقدامات را در حمایت تقویت‌شده و کدام را در حمایت عادی می‌داند. سپس اطلاعات جاری Försäkringskassan و TLV را کنترل کن.',
      noTitle: 'مسیر عمومی حمایت دندانپزشکی را ادامه بده',
      noBody: 'بر اساس پاسخ تو، مسیر سنی ۶۷+ مناسب نیست. حمایت‌های عمومی دندانپزشکی و حمایت هزینه‌های بالا، بسته به شرایط و درمان، همچنان ممکن است مرتبط باشند.',
      noNext: 'از کلینیک برآورد قیمت بخواه و بررسی کن کدام حمایت‌های دولتی عمومی برای اقدامات پیشنهادی قابل استفاده‌اند.',
      unsureTitle: 'تا روشن شدن سال سنی، مسیر عمومی را حفظ کن',
      unsureBody: 'سن دقیق در روز درمان تنها اطلاعات لازم نیست. پیش از استفاده از مسیر ۶۷+ بررسی کن آیا در همان سال تقویمی ۶۷ ساله می‌شوی یا نه.',
      unsureNext: 'سال درمان و اینکه در آن سال ۶۷ ساله یا بیشتر می‌شوی را مشخص کن؛ سپس پیش از هر نتیجه‌گیری درباره هزینه، کلینیک باید اقدام مشخص را بررسی کند.',
      guard: 'مهم: «tiotandvård» نباید به این معنا تعبیر شود که کل صورتحساب خودکار ۱۰٪ می‌شود. طبق راهنمای جاری Försäkringskassan، معاینه، مراقبت پیشگیرانه و رادیوگرافی در خود حمایت تقویت‌شده نیستند؛ حمایت‌های دیگر همچنان ممکن است مطرح باشند.',
      sourceFk: 'Försäkringskassan', sourceTlv: 'مقررات TLV', next: 'قدم امن بعدی'
    }
  };

  const style = document.createElement('style');
  style.dataset.dental67Guidance = 'true';
  style.textContent = `
    .dental67-guidance{margin:18px 0 0;padding:18px;border:1px solid #cfe0d8;border-radius:18px;background:#f8fcfa}
    .dental67-guidance small{display:block;color:#0b5b4d;font-size:11px;font-weight:900;letter-spacing:.055em;text-transform:uppercase;margin-bottom:5px}
    .dental67-guidance h3{font-size:19px;line-height:1.3;margin:0 0 6px}
    .dental67-hint,.dental67-answer p{color:#5f706a;margin:0 0 12px}
    .dental67-choices{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
    .dental67-choice{border:1px solid #a9c4ba;background:#fff;color:#0b332b;padding:10px 14px;border-radius:12px;font-weight:850;cursor:pointer}
    .dental67-choice[aria-pressed="true"]{background:#d8f3e8;border-color:#0b5b4d}
    .dental67-answer{margin-top:15px;padding-top:15px;border-top:1px solid #dce6e1}
    .dental67-answer h4{font-size:17px;margin:0 0 7px}
    .dental67-next{background:#eef6f2;border-radius:12px;padding:11px 12px;margin:10px 0;font-size:14px}
    .dental67-guard{font-size:13px;color:#5a5141;background:#f7f1e6;border-radius:12px;padding:11px 12px;margin:10px 0}
    .dental67-sources{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}
    .dental67-sources a{color:#0b5b4d;font-weight:850;text-decoration:none}
  `;
  document.head.appendChild(style);

  let section = null;
  let answer = null;
  function lang() {
    const value = document.documentElement.lang || 'sv';
    return COPY[value] ? value : 'sv';
  }
  function c() { return COPY[lang()]; }
  function currentNeed() { return (new URLSearchParams(location.search).get('need') || '').toLowerCase(); }

  function removeSection() {
    if (section) section.remove();
    section = null;
    answer = null;
  }

  function answerCopy(value) {
    const copy = c();
    if (value === 'yes') return [copy.yesTitle, copy.yesBody, copy.yesNext];
    if (value === 'no') return [copy.noTitle, copy.noBody, copy.noNext];
    return [copy.unsureTitle, copy.unsureBody, copy.unsureNext];
  }

  function renderAnswer(value) {
    if (!section) return;
    section.querySelectorAll('.dental67-choice').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.value === value));
    });
    const copy = c();
    const [title, body, next] = answerCopy(value);
    answer.hidden = false;
    answer.innerHTML = `<h4>${title}</h4><p>${body}</p><div class="dental67-next"><b>${copy.next}:</b> ${next}</div>${value === 'yes' ? `<div class="dental67-guard">${copy.guard}</div>` : ''}<div class="dental67-sources"><a href="${FK_URL}" target="_blank" rel="noopener">${copy.sourceFk} ↗</a><a href="${TLV_URL}" target="_blank" rel="noopener">${copy.sourceTlv} ↗</a></div>`;
  }

  function render() {
    const need = currentNeed();
    if (results.hidden || !ELIGIBLE_NEEDS.has(need)) {
      removeSection();
      return;
    }
    const copy = c();
    if (!section) {
      section = document.createElement('section');
      section.className = 'dental67-guidance';
      section.dataset.dental67Guidance = 'true';
      section.innerHTML = `<small>${copy.eyebrow}</small><h3>${copy.question}</h3><p class="dental67-hint">${copy.hint}</p><div class="dental67-choices" role="group" aria-label="${copy.question}"><button type="button" class="dental67-choice" data-value="yes" aria-pressed="false">${copy.yes}</button><button type="button" class="dental67-choice" data-value="no" aria-pressed="false">${copy.no}</button><button type="button" class="dental67-choice" data-value="unsure" aria-pressed="false">${copy.unsure}</button></div><div class="dental67-answer" role="status" aria-live="polite" hidden></div>`;
      results.appendChild(section);
      answer = section.querySelector('.dental67-answer');
      section.addEventListener('click', event => {
        const button = event.target.closest('.dental67-choice');
        if (!button) return;
        renderAnswer(button.dataset.value);
      });
    } else {
      const selected = section.querySelector('.dental67-choice[aria-pressed="true"]')?.dataset.value;
      const replacement = selected;
      removeSection();
      render();
      if (replacement) renderAnswer(replacement);
    }
  }

  let lastKey = '';
  function sync() {
    const key = `${currentNeed()}|${results.hidden}|${document.documentElement.lang || 'sv'}`;
    if (key === lastKey && section) return;
    lastKey = key;
    render();
  }

  new MutationObserver(sync).observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
  document.addEventListener('click', event => {
    if (event.target.closest('.choice,.change,[data-direct-change]')) setTimeout(sync, 0);
  }, true);
  sync();
})();
