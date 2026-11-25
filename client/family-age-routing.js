(() => {
  'use strict';

  // Same product, same person module: this guard prevents the existing
  // child/family flow from returning child-specific support when the age gate
  // says the person is not a child or the age is unknown. It also consumes the
  // coarse root-shell focus=family handoff without transferring raw story text.
  if (typeof chooseAnswer !== 'function' || typeof go !== 'function') return;

  const originalChooseAnswer = chooseAnswer;

  function resetResultState() {
    if (typeof matchRatings !== 'undefined') matchRatings = {};
    if (typeof finalFeedback !== 'undefined') finalFeedback = {};
    if (typeof submitState !== 'undefined') submitState = 'idle';
  }

  function unknownCopy() {
    const current = typeof lang !== 'undefined' ? lang : 'sv';
    const copy = {
      sv: {
        title: 'Vi behöver veta barnets ålder',
        body: 'Åldern kan ändra vilka stöd och regler som är relevanta. Vi gissar därför inte och behandlar inte ”vet inte” som ett nej.',
        change: 'Ändra svar',
        continue: 'Fortsätt utan barnspecifik matchning'
      },
      ar: {
        title: 'نحتاج إلى معرفة عمر الطفل',
        body: 'قد يغيّر العمر أنواع الدعم والقواعد ذات الصلة. لذلك لا نخمن ولا نتعامل مع «لا أعرف» كأنها «لا».',
        change: 'غيّر الإجابة',
        continue: 'تابع من دون مطابقة خاصة بالطفل'
      },
      fa: {
        title: 'باید سن کودک را بدانیم',
        body: 'سن می‌تواند حمایت‌ها و قواعد مرتبط را تغییر دهد. بنابراین حدس نمی‌زنیم و «نمی‌دانم» را به معنی «نه» در نظر نمی‌گیریم.',
        change: 'پاسخ را تغییر بده',
        continue: 'بدون تطبیق ویژه کودک ادامه بده'
      }
    };
    return copy[current] || copy.sv;
  }

  function renderFamilyAgeUnknown() {
    const host = document.getElementById('main');
    if (!host) return;
    const c = unknownCopy();
    const arrow = (typeof lang !== 'undefined' && (lang === 'ar' || lang === 'fa')) ? '→' : '←';
    host.innerHTML = `
      <button class="back" data-family-age-action="change" onclick="go('family1')">${arrow} ${c.change}</button>
      <section class="card" data-family-age-unknown="true">
        <div class="progress">1 / 2</div>
        <h2>${c.title}</h2>
        <p class="muted">${c.body}</p>
        <button class="choice" data-family-age-action="continue-general" onclick="continueWithoutFamilyAge()">${c.continue}</button>
      </section>
    `;
  }

  window.continueWithoutFamilyAge = function continueWithoutFamilyAge() {
    if (typeof scenario !== 'undefined') scenario = 'general';
    resetResultState();
    go('general1');
  };

  chooseAnswer = function guardedChooseAnswer(key, val, next) {
    if (
      key === 'child' &&
      typeof scenario !== 'undefined' &&
      scenario === 'family'
    ) {
      if (val === 'no') {
        if (typeof answers !== 'undefined') answers[key] = val;
        scenario = 'general';
        resetResultState();
        go('general1');
        return;
      }

      if (val === 'unsure') {
        if (typeof answers !== 'undefined') answers[key] = val;
        resetResultState();
        go('familyAgeUnknown');
        renderFamilyAgeUnknown();
        return;
      }
    }

    return originalChooseAnswer(key, val, next);
  };

  const params = new URLSearchParams(window.location.search);
  const focus = String(params.get('focus') || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);

  if (
    focus === 'family' &&
    typeof start === 'function' &&
    typeof screen !== 'undefined' &&
    screen === 'home'
  ) {
    start('family');
  }

  document.documentElement.setAttribute('data-family-age-gate', 'active');
})();
