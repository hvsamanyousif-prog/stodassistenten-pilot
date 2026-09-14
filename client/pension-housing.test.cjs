const assert = require('node:assert/strict');
const pension = require('./pension-housing.js');

const positives = [
  'Jag är pensionär och hyran är så hög att pengarna inte räcker.',
  'Jag har låg pension och dyr hyra. Kan jag få bostadstillägg?',
  'Jag är 74 år och min pension räcker inte till boendekostnaden.',
  'أنا متقاعد والمعاش لا يكفي للإيجار، هل يوجد بدل للسكن؟',
  'من بازنشسته‌ام و مستمری برای اجاره کافی نیست.'
];
for (const text of positives) assert.equal(pension.detect(text), true, `should detect: ${text}`);

const negatives = [
  'Jag har låg lön och dyr hyra.',
  'Jag har sjukersättning och undrar om bostadstillägg.',
  'Jag har aktivitetsersättning och behöver hjälp med hyran.',
  'Jag är pensionär och undrar över tandvårdskostnader.',
  'Jag driver företag och vill lämna anbud.'
];
for (const text of negatives) assert.equal(pension.detect(text), false, `should not detect: ${text}`);

assert.equal(
  pension.buildHandoffUrl('sv'),
  'person-pilot.html?actor_type=private_person&focus=pension_housing&lang=sv'
);
assert.equal(pension.buildHandoffUrl('ar').includes('focus=pension_housing'), true);
assert.equal(pension.buildHandoffUrl('fa').includes('focus=pension_housing'), true);
assert.equal(pension.buildHandoffUrl('sv').includes('hyra'), false);
assert.equal(pension.buildHandoffUrl('sv').includes('pension='), false);

assert.equal(pension.decision({}), 'ask_age');
assert.equal(pension.decision({ age: 'yes' }), 'ask_fullPension');
assert.equal(pension.decision({ age: 'yes', fullPension: 'yes' }), 'ask_residence');
assert.equal(pension.decision({ age: 'yes', fullPension: 'yes', residence: 'yes' }), 'calculator');
assert.equal(pension.decision({ age: 'no' }), 'verify_age_no');
assert.equal(pension.decision({ age: 'unsure' }), 'verify_age_unsure');
assert.equal(pension.decision({ age: 'yes', fullPension: 'no' }), 'verify_fullPension_no');
assert.equal(pension.decision({ age: 'yes', fullPension: 'yes', residence: 'no' }), 'verify_residence_no');

console.log('pension housing runtime: OK');
