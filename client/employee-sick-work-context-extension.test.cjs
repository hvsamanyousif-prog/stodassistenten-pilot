const assert = require('assert');
const g = require('./employee-sick-work-context-extension.js');

// v64: company form changes the first route but stays inside the same employee_sick capability.
assert.deepEqual(g.detectWorkContext('Jag driver enskild firma och är sjuk. Vem ska jag sjukanmäla mig till?'), { workContext: 'self_employed', businessForm: 'sole_partnership' });
assert.deepEqual(g.detectWorkContext('Jag har eget aktiebolag och är sjukskriven.'), { workContext: 'self_employed', businessForm: 'limited_company' });
assert.deepEqual(g.detectWorkContext('Jag driver eget och är sjuk och kan inte jobba.'), { workContext: 'self_employed', businessForm: null });
assert.deepEqual(g.detectWorkContext('Jag är anställd och driver enskild firma vid sidan av och är sjuk.'), { workContext: 'combined_employment', businessForm: 'sole_partnership' });
assert.deepEqual(g.detectWorkContext('Jag är egenanställd via ett faktureringsföretag och är sjuk.'), { workContext: 'invoiced_worker', businessForm: null });

// Language parity: the work context must not disappear just because the user writes Arabic or Persian.
assert.deepEqual(g.detectWorkContext('أعمل لحسابي وأنا مريض ولا أستطيع العمل.'), { workContext: 'self_employed', businessForm: null });
assert.deepEqual(g.detectWorkContext('برای خودم کار می‌کنم و بیمار هستم و نمی‌توانم کار کنم.'), { workContext: 'self_employed', businessForm: null });

// Red Team: an employer asking about a sick employee must not be turned into the owner's personal sickness route.
assert.equal(g.detectWorkContext('En anställd i mitt företag är sjuk. Vad ska jag göra som arbetsgivare?'), null);
assert.equal(g.detectWorkContext('Mitt företag har dålig ekonomi men jag är inte sjuk.'), null);
assert.equal(g.detectWorkContext('Jag jobbar på ett företag och är sjuk.'), null, 'ordinary employee stays in existing employee_sick detection');

assert.equal(g.handoffHref('sv', { workContext: 'self_employed', businessForm: 'sole_partnership', diagnosis: 'x', income: '50000', story: 'raw' }), 'person-pilot.html?actor_type=private_person&focus=employee_sick&lang=sv&work_context=self_employed&business_form=sole_partnership');
const safe = g.handoffHref('ar', { workContext: 'self_employed', businessForm: 'limited_company', companyName: 'Secret AB', orgnr: '123' });
assert.equal(safe, 'person-pilot.html?actor_type=private_person&focus=employee_sick&lang=ar&work_context=self_employed&business_form=limited_company');
for (const forbidden of ['diagnosis=', 'income=', 'salary=', 'company_name=', 'orgnr=', 'story=', 'situation=']) assert.equal(safe.includes(forbidden), false);

assert.equal(g.nextStep({ workContext: 'self_employed' }), 'ask_business_form');
assert.equal(g.nextStep({ workContext: 'self_employed', businessForm: 'limited_company' }), 'limited_company');
assert.equal(g.nextStep({ workContext: 'self_employed', businessForm: 'sole_partnership' }), 'sole_partnership');
assert.equal(g.nextStep({ workContext: 'self_employed', businessForm: 'unknown' }), 'verify_business_form');
assert.equal(g.nextStep({ workContext: 'combined_employment' }), 'combined_employment');
assert.equal(g.nextStep({ workContext: 'invoiced_worker' }), 'invoiced_worker');
assert.equal(g.nextStep({ workContext: 'employee' }), 'not_extension');

for (const url of [g.FK_SELECTOR_URL, g.FK_LIMITED_URL, g.FK_SOLE_URL, g.FK_COMBINED_URL, g.FK_INVOICED_URL]) assert.match(url, /^https:\/\/www\.forsakringskassan\.se\//);

console.log('employee-sick-work-context-extension v64: OK');
