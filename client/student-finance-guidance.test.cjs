const assert = require('node:assert/strict');
const studentFinance = require('./student-finance-guidance.js');

const weekCases = [
  'Hur många CSN-veckor har jag kvar?',
  'Jag har studiemedel och undrar hur många veckor jag har använt.',
  'Räknas deltidsstudier som lika många CSN-veckor?',
  'كم أسبوعا من دعم الدراسة CSN بقي لي؟',
  'چند هفته CSN برایم باقی مانده؟',
];
for (const text of weekCases) {
  assert.equal(studentFinance.detectTopic(text), 'weeks', `expected weeks route: ${text}`);
}

const summerCases = [
  'Jag fick inget sommarjobb. Kan jag läsa sommarkurs och få CSN?',
  'Får jag CSN hela sommaren om jag kommer in på en sommarkurs?',
  'إذا درست دورة صيفية هل أحصل على CSN طوال الصيف؟',
  'اگر دوره تابستانی بخوانم می‌توانم CSN بگیرم؟',
];
for (const text of summerCases) {
  assert.equal(studentFinance.detectTopic(text), 'summer', `expected summer route: ${text}`);
}

const negatives = [
  'Jag tog examen och söker mitt första jobb.',
  'Jag vill veta vad hyran kostar nästa år.',
  'Jag jobbar deltid och är sjukskriven.',
  'Jag vill läsa en bok i sommar.',
];
for (const text of negatives) {
  assert.equal(studentFinance.detectTopic(text), null, `must not force CSN route: ${text}`);
}

assert.equal(
  studentFinance.handoffHref('sv', 'weeks'),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=weeks&lang=sv',
);
assert.equal(
  studentFinance.handoffHref('ar', 'summer'),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=summer&lang=ar',
);
assert.equal(studentFinance.handoffHref('xx', 'summer').endsWith('lang=sv'), true);

for (const href of [
  studentFinance.handoffHref('sv', 'weeks'),
  studentFinance.handoffHref('ar', 'summer'),
  studentFinance.handoffHref('fa', 'weeks'),
]) {
  for (const forbidden of ['situation=', 'story=', 'income=', 'weeks_left=', 'course=', 'identity=']) {
    assert.equal(href.includes(forbidden), false, `handoff must not contain ${forbidden}`);
  }
}

assert.equal(studentFinance.nextWeeks({}), 'ask_level');
assert.equal(studentFinance.nextWeeks({ level: 'higher' }), 'ask_pace');
assert.equal(studentFinance.nextWeeks({ level: 'higher', pace: '50' }), 'show_weeks_next_action');

assert.equal(studentFinance.nextSummer({}), 'ask_study_type');
assert.equal(studentFinance.nextSummer({ studyType: 'university' }), 'ask_minimum');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'no' }), 'verify_summer_setup');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'yes' }), 'ask_registration');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'yes', registration: 'unsure' }), 'verify_summer_setup');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'yes', registration: 'yes' }), 'show_summer_next_action');

console.log('student finance guidance: OK (same shell, coarse handoff, no personal CSN balance)');
