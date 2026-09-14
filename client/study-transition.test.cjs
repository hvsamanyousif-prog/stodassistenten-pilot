const assert = require('node:assert/strict');
const routing = require('./study-transition.js');

const positives = [
  'Jag har precis tagit examen och hittar inget jobb.',
  'Jag är nyexaminerad och mina sparpengar minskar.',
  'Jag är färdig med min utbildning men har inget arbete.',
  'تخرجت للتو ولا أجد عملاً',
  'أنهيت دراستي وليس لدي وظيفة',
  'تازه فارغ التحصیل شده‌ام و کار ندارم',
  'تحصیلم تمام شده ولی هنوز کار پیدا نکرده‌ام',
];

for (const text of positives) {
  assert.equal(routing.detect(text), true, `expected completed-study transition: ${text}`);
}

const negatives = [
  'Jag studerar fortfarande och söker extrajobb.',
  'Jag funderar på att börja universitetet nästa år.',
  'أنا ما زلت أدرس وأبحث عن عمل إضافي',
  'هنوز دانشجو هستم و دنبال کار پاره وقت می‌گردم',
];

for (const text of negatives) {
  assert.equal(routing.detect(text), false, `must not infer completed studies: ${text}`);
}

assert.equal(
  routing.handoffHref('sv'),
  'person-pilot.html?actor_type=student&focus=study_to_work&lang=sv',
);
assert.equal(
  routing.handoffHref('ar'),
  'person-pilot.html?actor_type=student&focus=study_to_work&lang=ar',
);
assert.equal(
  routing.handoffHref('fa'),
  'person-pilot.html?actor_type=student&focus=study_to_work&lang=fa',
);
assert.equal(routing.handoffHref('xx').endsWith('lang=sv'), true);

for (const href of ['sv', 'ar', 'fa'].map(routing.handoffHref)) {
  assert.equal(href.includes('situation='), false);
  assert.equal(href.includes('q='), false);
  assert.equal(href.includes('text='), false);
}

console.log('study transition routing: OK');
