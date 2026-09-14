const assert = require('node:assert/strict');
const jobPremium = require('./job-premium-guidance.js');

const positives = [
  'Jag hade försörjningsstöd och jobbar nu deltid med lön.',
  'Jag har fått jobb efter ekonomiskt bistånd, finns något stöd?',
  'Kan jag få jobbpremie när jag arbetar deltid?',
  'كنت أحصل على مساعدة اجتماعية والآن لدي وظيفة وراتب.',
  'قبلاً کمک معیشتی می‌گرفتم و حالا کار و حقوق دارم.',
];
for (const text of positives) assert.equal(jobPremium.detect(text), true, `expected job-premium discovery: ${text}`);

const negatives = [
  'Jag har försörjningsstöd och behöver tandvård.',
  'Jag har fått nytt jobb och vill veta min lön.',
  'Jag driver företag och söker finansiering.',
  'Jag är sjukskriven från jobbet.',
];
for (const text of negatives) assert.equal(jobPremium.detect(text), false, `must not force job-premium route: ${text}`);

assert.equal(jobPremium.handoffHref('sv'), 'person-pilot.html?actor_type=private_person&focus=job_premium&lang=sv');
assert.equal(jobPremium.handoffHref('ar').endsWith('lang=ar'), true);
assert.equal(jobPremium.handoffHref('xx').endsWith('lang=sv'), true);
for (const href of [jobPremium.handoffHref('sv'), jobPremium.handoffHref('ar'), jobPremium.handoffHref('fa')]) {
  for (const forbidden of ['situation=', 'story=', 'salary=', 'employer=', 'municipality=', 'household=', 'amount=']) {
    assert.equal(href.includes(forbidden), false, `handoff must not contain ${forbidden}`);
  }
}

assert.equal(jobPremium.nextStep({}), 'ask_history');
assert.equal(jobPremium.nextStep({ history: 'yes' }), 'ask_salary');
assert.equal(jobPremium.nextStep({ history: 'yes', salary: 'yes' }), 'ask_household');
assert.equal(jobPremium.nextStep({ history: 'yes', salary: 'yes', household: 'no' }), 'verify_candidate');
assert.equal(jobPremium.nextStep({ history: 'no', salary: 'yes', household: 'no' }), 'verify_missing_or_conflicting_fact');
assert.equal(jobPremium.nextStep({ history: 'unsure', salary: 'yes', household: 'no' }), 'verify_missing_or_conflicting_fact');
assert.equal(jobPremium.nextStep({ history: 'yes', salary: 'yes', household: 'yes' }), 'separate_job_stimulation');

assert.equal(jobPremium.FK_URL.includes('forsakringskassan.se/privatperson/jobbpremie'), true);
assert.equal(jobPremium.SOCIALSTYRELSEN_URL.includes('socialstyrelsen.se'), true);
console.log('job premium guidance: OK (same product, fail-closed, jobbstimulans split, privacy-safe handoff)');
