(() => {
  'use strict';

  // Same product, same person module: this guard prevents the existing
  // child/family flow from returning child-specific support when the age gate
  // says the person is not a child or the age is unknown. It also consumes the
  // coarse root-shell focus=family handoff without transferring raw story text.
  if (typeof chooseAnswer !== 'function' || typeof go !== 'function') return;

  const originalChooseAnswer = chooseAnswer;

  chooseAnswer = function guardedChooseAnswer(key, val, next) {
    if (
      key === 'child' &&
      typeof scenario !== 'undefined' &&
      scenario === 'family' &&
      val !== 'yes'
    ) {
      if (typeof answers !== 'undefined') answers[key] = val;
      scenario = 'general';
      if (typeof matchRatings !== 'undefined') matchRatings = {};
      if (typeof finalFeedback !== 'undefined') finalFeedback = {};
      if (typeof submitState !== 'undefined') submitState = 'idle';
      go('general1');
      return;
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
