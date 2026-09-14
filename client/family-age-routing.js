(() => {
  'use strict';

  // Same product, same person module: this guard only prevents the existing
  // child/family flow from returning child-specific support when the age gate
  // says the person is not a child or the age is unknown.
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

  document.documentElement.setAttribute('data-family-age-gate', 'active');
})();
