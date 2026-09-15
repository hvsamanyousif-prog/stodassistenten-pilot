const assert = require('node:assert/strict');
const routing = require('./young-housing-transition.js');

const positives = [
  'Jag är nyexaminerad, hyr en lägenhet och jobbar extra olika mycket varje månad.',
  'Jag är student och undrar om bostadsbidrag.',
  'Jag är 24 år och hyr bostad, börjar jobba i oktober efter examen.',
  'Jag är student och undrar hur bostadsbidragets nya regler 2027 fungerar.',
  'أنا طالب وأريد معرفة بدل السكن في ٢٠٢٧',
  'تخرجت وأستأجر شقة وسأبدأ العمل قريباً براتب جديد',
  'دانشجو هستم و درباره کمک هزینه مسکن در ۲۰۲۷ سؤال دارم',
  'تازه فارغ التحصیل شده‌ام، خانه اجاره می‌کنم و درآمدم متغیر است',
];
for (const text of positives) {
  assert.equal(routing.detect(text), true, `expected young housing transition: ${text}`);
}

const negatives = [
  'Jag är nyexaminerad och söker jobb.',
  'Jag hyr lägenhet och jobbar heltid sedan flera år.',
  'Jag är student och söker extrajobb.',
  'أنا طالب وأبحث عن عمل إضافي',
  'دانشجو هستم و دنبال کار پاره وقت می‌گردم',
];
for (const text of negatives) {
  assert.equal(routing.detect(text), false, `must not overroute to young housing: ${text}`);
}

assert.equal(routing.coarseContext('Jag har bostadsbidrag och börjar jobba med ny lön'), 'income_change');
assert.equal(routing.coarseContext('Jag är student och undrar om bostadsbidrag'), 'general');
assert.equal(routing.coarseContext('Jag är student, vad händer med bostadsbidraget 2027?'), 'transition_2027');
assert.equal(routing.coarseContext('أنا طالب، ماذا يحدث لبدل السكن في ٢٠٢٧؟'), 'transition_2027');
assert.equal(routing.coarseContext('دانشجو هستم، کمک هزینه مسکن در ۲۰۲۷ چه می‌شود؟'), 'transition_2027');

assert.equal(
  routing.handoffHref('sv', 'income_change'),
  'person-pilot.html?actor_type=student&focus=young_housing&context=income_change&lang=sv',
);
assert.equal(
  routing.handoffHref('ar', 'general'),
  'person-pilot.html?actor_type=student&focus=young_housing&context=general&lang=ar',
);
assert.equal(
  routing.handoffHref('fa', 'transition_2027'),
  'person-pilot.html?actor_type=student&focus=young_housing&context=transition_2027&lang=fa',
);
assert.equal(routing.handoffHref('xx', 'anything').endsWith('context=general&lang=sv'), true);
for (const href of [
  routing.handoffHref('sv', 'income_change'),
  routing.handoffHref('ar', 'general'),
  routing.handoffHref('fa', 'transition_2027'),
]) {
  assert.equal(href.includes('situation='), false);
  assert.equal(href.includes('q='), false);
  assert.equal(/[?&]text=/.test(href), false);
  assert.equal(/\b(?:18|19|2[0-8])\b/.test(href), false, 'exact age must not be put in handoff URL');
}

// v60: the rule version and two material exceptions are route-changing facts.
assert.equal(routing.transitionBranch('current', null), 'existing_decision');
assert.equal(routing.transitionBranch('unsure', null), 'verify_decision');
assert.equal(routing.transitionBranch('new_2027', 'no'), 'monthly_income_candidate');
assert.equal(routing.transitionBranch('new_2027', 'yes'), 'exception');
assert.equal(routing.transitionBranch('new_2027', 'unsure'), 'verify_exception');
assert.equal(routing.transitionBranch('new_2027', null), null);
assert.equal(routing.transitionBranch(null, null), null);
assert.equal(
  routing.transitionSourceUrl,
  'https://www.forsakringskassan.se/privatperson/bostadsbidrag-nya-regler-fran-1-januari-2027',
);

console.log('young housing transition routing: OK');