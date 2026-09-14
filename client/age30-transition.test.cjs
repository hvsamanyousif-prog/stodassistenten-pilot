const assert = require('node:assert/strict');
const routing = require('./age30-transition.js');

const positives = [
  'Jag fyller 30 och min aktivitetsersättning tar slut, vad händer nu?',
  'Jag har aktivitetsersättning och blir 30 år snart.',
  'Aktivitetsersättningen slutar när jag fyller 30, vad ska jag göra?',
  'لدي بدل النشاط وسأبلغ 30 عاماً، ماذا يحدث بعد ذلك؟',
  'ستنتهي إعانة النشاط عندما أبلغ ٣٠ سنة',
  'کمک هزینه فعالیت دارم و ۳۰ ساله می‌شوم، بعدش چه می‌شود؟',
  'کمک‌هزینه فعالیت در ۳۰ سالگی تمام می‌شود',
];
for (const text of positives) {
  assert.equal(routing.detect(text), true, `expected age-30 transition: ${text}`);
}

const negatives = [
  'Jag fyller 30 och söker bostad.',
  'Jag har aktivitetsersättning och är 24 år.',
  'Jag är sjukskriven och fyller 30.',
  'عمري 30 سنة وأبحث عن عمل',
  'کمک هزینه فعالیت دارم و ۲۴ ساله هستم',
];
for (const text of negatives) {
  assert.equal(routing.detect(text), false, `must not infer age-30 activity transition: ${text}`);
}

for (const lang of ['sv', 'ar', 'fa']) {
  const href = routing.handoffHref(lang);
  assert.equal(href, `person-pilot.html?actor_type=private_person&focus=activity_compensation_age30&lang=${lang}`);
  for (const forbidden of ['situation=', 'text=', 'q=', 'diagnosis=', 'sgi=', 'health=']) {
    assert.equal(href.includes(forbidden), false, `handoff must not carry raw/sensitive data: ${forbidden}`);
  }
}
assert.equal(routing.handoffHref('xx').endsWith('lang=sv'), true);

assert.equal(routing.nextStep({ prior: null, capacity: null, sgi: null, protected: null }), 'q_prior');
assert.equal(routing.nextStep({ prior: 'no', capacity: null, sgi: null, protected: null }), 'r_prior_no');
assert.equal(routing.nextStep({ prior: 'unsure', capacity: null, sgi: null, protected: null }), 'r_prior_unsure');
assert.equal(routing.nextStep({ prior: 'yes', capacity: null, sgi: null, protected: null }), 'q_capacity');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'permanent', sgi: null, protected: null }), 'r_permanent');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'unsure', sgi: null, protected: null }), 'r_capacity_unsure');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: null, protected: null }), 'q_sgi');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: 'no', protected: null }), 'r_sgi_no');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: 'unsure', protected: null }), 'r_sgi_unsure');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: 'yes', protected: null }), 'q_protected');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: 'yes', protected: 'yes' }), 'r_protected_yes');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: 'yes', protected: 'no' }), 'r_protected_no');
assert.equal(routing.nextStep({ prior: 'yes', capacity: 'future', sgi: 'yes', protected: 'unsure' }), 'r_protected_unsure');

console.log('age-30 activity-compensation public handoff: OK');
