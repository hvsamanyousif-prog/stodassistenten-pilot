const assert = require('node:assert/strict');
const studentFinance = require('./student-finance-guidance.js');

const weekCases = [
  'Hur många CSN-veckor har jag kvar?',
  'Jag har studiemedel och undrar hur många veckor jag har använt.',
  'Räknas deltidsstudier som lika många CSN-veckor?',
  'كم أسبوعا من دعم الدراسة CSN بقي لي؟',
  'چند هفته CSN برایم باقی مانده؟',
];
for (const text of weekCases) assert.equal(studentFinance.detectTopic(text), 'weeks', `expected weeks route: ${text}`);

const summerCases = [
  'Jag fick inget sommarjobb. Kan jag läsa sommarkurs och få CSN?',
  'Får jag CSN hela sommaren om jag kommer in på en sommarkurs?',
  'إذا درست دورة صيفية هل أحصل على CSN طوال الصيف؟',
  'اگر دوره تابستانی بخوانم می‌توانم CSN بگیرم؟',
];
for (const text of summerCases) assert.equal(studentFinance.detectTopic(text), 'summer', `expected summer route: ${text}`);

const sicknessCases = [
  'Jag studerar och har blivit sjuk och kan inte plugga som planerat.',
  'Jag är sjukskriven och studerar med CSN.',
  'أنا طالبة ومرضت ولا أستطيع الدراسة الآن.',
  'من دانشجو هستم و بیمار شده‌ام و نمی‌توانم درس بخوانم.',
];
for (const text of sicknessCases) assert.equal(studentFinance.detectTopic(text), 'sickness', `expected sickness route: ${text}`);

const negatives = [
  'Jag tog examen och söker mitt första jobb.',
  'Jag vill veta vad hyran kostar nästa år.',
  'Jag jobbar deltid och är sjukskriven.',
  'Jag vill läsa en bok i sommar.',
  'Jag skriver uppsats om sjukskrivna studenter.',
  'Jag studerar och mitt barn är sjukt så jag behöver vabba.',
];
for (const text of negatives) assert.equal(studentFinance.detectTopic(text), null, `must not force CSN sickness route: ${text}`);

assert.equal(studentFinance.detectStudyContext('Jag studerar med studiemedel och är sjuk.'), 'study_support_sweden');
assert.equal(studentFinance.detectStudyContext('Jag går gymnasiet och är sjuk.'), 'gymnasium_sweden');
assert.equal(studentFinance.detectStudyContext('Jag studerar utomlands och har blivit sjuk.'), 'abroad');
assert.equal(studentFinance.detectWorkAlongside('Jag studerar och jag jobbar också deltid.'), 'yes');
assert.equal(studentFinance.detectWorkAlongside('Jag studerar men jag jobbar inte.'), 'no');
assert.equal(studentFinance.detectWorkAlongside('Jag studerar.'), null);

assert.equal(
  studentFinance.handoffHref('sv', 'weeks'),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=weeks&lang=sv',
);
assert.equal(
  studentFinance.handoffHref('ar', 'summer'),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=summer&lang=ar',
);
assert.equal(
  studentFinance.handoffHref('sv', 'sickness', { studyContext: 'study_support_sweden', workAlongside: 'yes' }),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=sickness&lang=sv&study_context=study_support_sweden&study_work=yes',
);
assert.equal(studentFinance.handoffHref('xx', 'summer').endsWith('lang=sv'), true);

for (const href of [
  studentFinance.handoffHref('sv', 'weeks'),
  studentFinance.handoffHref('ar', 'summer'),
  studentFinance.handoffHref('fa', 'weeks'),
  studentFinance.handoffHref('sv', 'sickness', { studyContext: 'study_support_sweden', workAlongside: 'yes' }),
]) {
  for (const forbidden of ['situation=', 'story=', 'income=', 'weeks_left=', 'course=', 'identity=', 'diagnosis=', 'sgi=', 'employer=', 'medical_certificate=']) {
    assert.equal(href.includes(forbidden), false, `handoff must not contain ${forbidden}`);
  }
}

assert.equal(studentFinance.nextWeeks({}), 'ask_level');
assert.equal(studentFinance.nextWeeks({ level: 'higher' }), 'ask_pace');
assert.equal(studentFinance.nextWeeks({ level: 'higher', pace: '50' }), 'show_weeks_next_action');

assert.equal(studentFinance.nextSummer({}), 'ask_study_type');
assert.equal(studentFinance.nextSummer({ studyType: 'unsure' }), 'verify_summer_setup');
assert.equal(studentFinance.nextSummer({ studyType: 'university' }), 'ask_minimum');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'no' }), 'verify_summer_setup');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'unsure' }), 'verify_summer_setup');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'yes' }), 'ask_registration');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'yes', registration: 'unsure' }), 'verify_summer_setup');
assert.equal(studentFinance.nextSummer({ studyType: 'university', minimum: 'yes', registration: 'yes' }), 'show_summer_next_action');

assert.equal(studentFinance.nextSickness({}), 'ask_study_context');
assert.equal(studentFinance.nextSickness({ studyContext: 'unsure' }), 'verify_sickness_context');
assert.equal(studentFinance.nextSickness({ studyContext: 'gymnasium_sweden' }), 'show_sickness_gymnasium');
assert.equal(studentFinance.nextSickness({ studyContext: 'abroad' }), 'show_sickness_abroad');
assert.equal(studentFinance.nextSickness({ studyContext: 'study_support_sweden' }), 'ask_work_alongside');
assert.equal(studentFinance.nextSickness({ studyContext: 'study_support_sweden', workAlongside: 'yes' }), 'show_sickness_work');
assert.equal(studentFinance.nextSickness({ studyContext: 'study_support_sweden', workAlongside: 'no' }), 'show_sickness_study_only');

console.log('student finance guidance: OK (same student_csn focus, sickness boundary, fail-closed VAB/research, privacy-safe handoff)');
