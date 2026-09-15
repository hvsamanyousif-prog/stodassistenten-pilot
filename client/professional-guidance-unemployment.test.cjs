const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('client/professional-guidance.js','utf8');
const match=source.match(/function explicitCurrentUnemployment\(text\)\{([\s\S]*?)\n  \}\n  function routeKey/);
assert(match,'could not isolate explicitCurrentUnemployment from shared guidance runtime');
const explicitCurrentUnemployment=new Function('text',match[1]);

const cases=[
  ['Jag blev arbetslös idag och vet inte vad jag ska göra först.',true,'current Swedish unemployment'],
  ['Jag är arbetslös nu men redan inskriven hos Arbetsförmedlingen.',true,'already registered remains current unemployment'],
  ['Mitt visstidsjobb tar slut om två veckor och jag vill förbereda mig.',false,'future contract end'],
  ['Jag är permitterad och undrar om jag ska skriva in mig som arbetslös.',false,'permittering is still employment'],
  ['أصبحت عاطلاً عن العمل اليوم ولا أعرف من أين أبدأ.',true,'Arabic parity'],
  ['امروز بیکار شدم و نمی‌دانم اول چه کاری انجام بدهم.',true,'Persian parity'],
  ['Jag är arbetslös och sjuk och behöver veta vem jag ska sjukanmäla mig till.',false,'sickness route owns mixed sickness intent'],
  ['Jag blev varslad förra månaden men nu är jag arbetslös.',true,'historical warning must not suppress current status'],
];
for(const [story,expected,label] of cases){
  assert.strictEqual(Boolean(explicitCurrentUnemployment(story)),expected,label);
}

assert(source.includes("u.searchParams.set('actor_type','private_person')"),'unemployment handoff must use shared private_person actor');
assert(source.includes("u.searchParams.set('focus','unemployment_start')"),'unemployment handoff needs coarse focus only');
assert(!source.includes("u.searchParams.set('situation'"),'raw situation must not enter handoff URL');
assert(!source.includes("u.searchParams.set('income'"),'income must not enter first-day handoff URL');
assert(!source.includes("u.searchParams.set('employer'"),'employer must not enter first-day handoff URL');
assert(source.includes('arbetslos---vad-hander-nu'),'current Arbetsförmedlingen first-day source must be linked');
assert(source.includes('forsakringskassan.se/privatperson/arbetssokande'),'Försäkringskassan jobseeker source must be linked for SGI verification');

console.log(`professional guidance unemployment v61: OK (${cases.length} intent regressions)`);
