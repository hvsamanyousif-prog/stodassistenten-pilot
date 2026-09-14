const assert = require('assert');
const api = require('./unemployed-sick-guidance.js');

assert(api.detect('Jag är arbetslös och blev sjuk idag, vem ska jag sjukanmäla mig till?'));
assert(api.detect('Jag är inskriven hos Arbetsförmedlingen och är sjukskriven nu'));
assert(api.detect('أنا عاطل عن العمل ومرضت اليوم'));
assert(api.detect('من بیمار شده‌ام و جویای کار هستم'));

assert(!api.detect('Jag är anställd och sjukskriven på halvtid'));
assert(!api.detect('Hur mycket a-kassa kan jag få?'));
assert(!api.detect('Kan jag få jobbpremie efter försörjningsstöd?'));
assert(!api.detect('Jag behöver tandvård och har ont'));
assert(!api.detect('Mitt företag vill lämna anbud'));

const href = api.handoffHref('sv');
assert.strictEqual(href, 'person-pilot.html?actor_type=private_person&focus=unemployed_sick&lang=sv');
for (const forbidden of ['story=', 'situation=', 'diagnosis=', 'sgi=', 'salary=', 'employer=', 'medical=', 'personnummer=']) {
  assert(!href.toLowerCase().includes(forbidden));
}

assert.strictEqual(api.nextStep({program:'', fullyUnemployed:'', activeUntilSick:''}), 'ask_program');
assert.strictEqual(api.nextStep({program:'yes', fullyUnemployed:'', activeUntilSick:''}), 'program_route');
assert.strictEqual(api.nextStep({program:'unsure', fullyUnemployed:'', activeUntilSick:''}), 'verify_program_status');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'', activeUntilSick:''}), 'ask_employment_context');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'no', activeUntilSick:''}), 'mixed_employment_route');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'unsure', activeUntilSick:''}), 'verify_employment_context');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'yes', activeUntilSick:''}), 'ask_active_until_sick');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'yes', activeUntilSick:'yes'}), 'jobseeker_route');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'yes', activeUntilSick:'no'}), 'verify_jobseeker_requirement');
assert.strictEqual(api.nextStep({program:'no', fullyUnemployed:'yes', activeUntilSick:'unsure'}), 'verify_jobseeker_requirement');

assert(new URL(api.FK_JOBSEEKER_URL).hostname.endsWith('forsakringskassan.se'));
assert(new URL(api.AF_PROGRAM_URL).hostname.endsWith('arbetsformedlingen.se'));
console.log('unemployed sick guidance: OK');
