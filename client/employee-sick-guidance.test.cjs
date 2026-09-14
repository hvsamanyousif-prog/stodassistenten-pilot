const assert = require('assert');
const g = require('./employee-sick-guidance.js');

assert.equal(g.detect('Jag jobbar deltid och är sjukskriven resten.'), true);
assert.equal(g.detect('Jag är timanställd och sjuk. Vem ska jag sjukanmäla mig till?'), true);
assert.equal(g.detect('Jag är arbetslös på deltid, har en anställning och är sjuk.'), false, 'mixed jobseeker/employment must stay in the v47 authority-disambiguation route');
assert.equal(g.detect('Jag jobbar deltid och vill söka semester.'), false);
assert.equal(g.detect('Jag är sjuk men skriver inget om arbete eller anställning.'), false);
assert.equal(g.detect('أعمل بدوام جزئي وأنا في إجازة مرضية.'), true);
assert.equal(g.detect('پاره‌وقت کار می‌کنم و مرخصی استعلاجی هستم.'), true);

assert.equal(g.handoffHref('sv'), 'person-pilot.html?actor_type=employee&focus=employee_sick&lang=sv');
assert.equal(g.handoffHref('ar'), 'person-pilot.html?actor_type=employee&focus=employee_sick&lang=ar');
assert.equal(g.handoffHref('bad'), 'person-pilot.html?actor_type=employee&focus=employee_sick&lang=sv');

assert.equal(g.nextStep({}), 'ask_sick_pay');
assert.equal(g.nextStep({ sickPay: 'unsure' }), 'verify_sick_pay');
assert.equal(g.nextStep({ sickPay: 'yes' }), 'ask_partial');
assert.equal(g.nextStep({ sickPay: 'no' }), 'ask_partial');
assert.equal(g.nextStep({ sickPay: 'yes', partial: 'unsure' }), 'verify_partial');
assert.equal(g.nextStep({ sickPay: 'yes', partial: 'no' }), 'with_pay');
assert.equal(g.nextStep({ sickPay: 'no', partial: 'no' }), 'without_pay');
assert.equal(g.nextStep({ sickPay: 'yes', partial: 'yes' }), 'partial_with_pay');
assert.equal(g.nextStep({ sickPay: 'no', partial: 'yes' }), 'partial_without_pay');

assert.match(g.FK_EMPLOYEE_URL, /forsakringskassan\.se/);
assert.match(g.FK_NO_SICK_PAY_URL, /forsakringskassan\.se/);

console.log('employee-sick-guidance v48: OK');
