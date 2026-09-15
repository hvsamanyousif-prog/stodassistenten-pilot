const assert = require('node:assert/strict');
const sickness = require('./student-finance-sickness-extension.js');

const positives = [
  ['Jag pluggar på universitet med CSN och blev sjuk idag. Vad gör jag först?', 'studiemedel_sweden'],
  ['Jag studerar med omställningsstudiestöd och är sjukskriven.', 'transition_sweden'],
  ['Jag går på gymnasiet och är sjuk idag.', 'gymnasium_sweden'],
  ['Jag studerar utomlands med CSN och har blivit sjuk.', 'abroad'],
  ['أنا طالب وأدرس مع CSN وقد مرضت اليوم.', null],
  ['من دانشجو هستم و هنگام تحصیل بیمار شده‌ام.', null],
];
for (const [text, context] of positives) {
  assert.equal(sickness.detectSickness(text), true, `expected student sickness route: ${text}`);
  if (context) assert.equal(sickness.inferStudyContext(text), context, `wrong study context: ${text}`);
}

assert.equal(sickness.inferWorkContext('Jag jobbar deltid och studerar med CSN men nu är jag sjuk.'), 'employed');
assert.equal(sickness.detectSickness('Jag jobbar deltid och studerar med CSN men nu är jag sjuk.'), true);

const negatives = [
  'Mitt barn är sjukt och jag studerar med CSN. Hur vabbar jag?',
  'Jag jobbar på CSN med frågor om sjuka studenter.',
  'Jag jobbar deltid och är sjukskriven men studerar inte.',
  'Jag studerar och undrar hur många CSN-veckor jag har kvar.',
];
for (const text of negatives) {
  assert.equal(sickness.detectSickness(text), false, `must not steal another route: ${text}`);
}

assert.equal(
  sickness.handoffHref('sv', 'studiemedel_sweden', null),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=sickness&lang=sv&study_context=studiemedel_sweden',
);
assert.equal(
  sickness.handoffHref('ar', 'gymnasium_sweden', 'employed'),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=sickness&lang=ar&study_context=gymnasium_sweden&work_context=employed',
);
assert.equal(
  sickness.handoffHref('fa', null, null),
  'person-pilot.html?actor_type=student&focus=student_csn&topic=sickness&lang=fa',
);

for (const href of [
  sickness.handoffHref('sv', 'studiemedel_sweden', 'employed'),
  sickness.handoffHref('ar', 'abroad', null),
  sickness.handoffHref('fa', null, null),
]) {
  for (const forbidden of ['situation=', 'story=', 'diagnosis=', 'medical_note=', 'income=', 'salary=', 'employer=', 'name=', 'personnummer=']) {
    assert.equal(href.includes(forbidden), false, `handoff must not contain ${forbidden}`);
  }
}

console.log('student sickness v67: OK (shared student_csn focus, sv/ar/fa, VAB/professional guards, privacy-safe handoff)');
