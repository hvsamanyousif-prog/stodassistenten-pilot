const assert = require('assert');
const g = require('./employee-sick-guidance.js');

// Existing v48 employee-sickness boundaries remain intact.
assert.equal(g.detect('Jag jobbar deltid och är sjukskriven resten.'), true);
assert.equal(g.detect('Jag är timanställd och sjuk. Vem ska jag sjukanmäla mig till?'), true);
assert.equal(g.detect('Jag är arbetslös på deltid, har en anställning och är sjuk.'), false, 'mixed jobseeker/employment must stay in the v47 authority-disambiguation route');
assert.equal(g.detect('Jag är sjuk och har ingen anställning.'), false, 'negated employment must not trigger the employee route');
assert.equal(g.detect('Jag jobbar deltid och vill söka semester.'), false);
assert.equal(g.detect('Jag är sjuk och behöver hjälp.'), false);
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

// v52: long-sickness + explicit compensation friction stays in the same employee_sick route.
const svCollective = 'Jag är anställd och har varit sjukskriven i fyra månader. Finns extra ersättning via kollektivavtal?';
const arCollective = 'أنا موظف وفي إجازة مرضية طويلة. هل يوجد تعويض إضافي عبر اتفاقية جماعية؟';
const faCollective = 'من شاغل هستم و مرخصی استعلاجی طولانی دارم. آیا غرامت اضافی از قرارداد جمعی هست؟';
assert.equal(g.detectCollective(svCollective), true);
assert.equal(g.detectCollective(arCollective), true);
assert.equal(g.detectCollective(faCollective), true);
assert.equal(g.detectCollective('Jag är anställd och sjuk idag. Vem ska jag sjukanmäla mig till?'), false, 'ordinary short sickness must not add a collective-agreement question');
assert.equal(g.detectCollective('Jag är arbetslös och långtidssjukskriven. Finns extra ersättning?'), false, 'jobseeker route must not be stolen by employee collective guidance');

const collectiveHref = g.handoffHref('sv', { collective: true, story: svCollective, salary: '42000' });
assert.equal(collectiveHref, 'person-pilot.html?actor_type=employee&focus=employee_sick&lang=sv&sickness_context=collective_compensation');
assert.equal(collectiveHref.includes('sjukskriven'), false, 'raw story must not enter URL');
assert.equal(collectiveHref.includes('42000'), false, 'salary must not enter URL');

assert.equal(g.nextStep({ mode: 'collective' }), 'ask_agreement_area');
assert.equal(g.nextStep({ mode: 'collective', agreementArea: 'private_worker' }), 'collective_private_worker');
assert.equal(g.nextStep({ mode: 'collective', agreementArea: 'private_salaried' }), 'collective_private_salaried');
assert.equal(g.nextStep({ mode: 'collective', agreementArea: 'municipal_region_church' }), 'collective_municipal_region_church');
assert.equal(g.nextStep({ mode: 'collective', agreementArea: 'state' }), 'collective_state');
assert.equal(g.nextStep({ mode: 'collective', agreementArea: 'unknown' }), 'collective_unknown');

assert.match(g.FK_EMPLOYEE_URL, /forsakringskassan\.se/);
assert.match(g.FK_NO_SICK_PAY_URL, /forsakringskassan\.se/);
assert.match(g.FK_COLLECTIVE_SIGNAL_URL, /forsakringskassan\.se/);
assert.match(g.AVTALAT_AGS_URL, /avtalat\.se/);
assert.match(g.COLLECTUM_ITP_URL, /collectum\.se/);
assert.match(g.AFA_SICK_URL, /afaforsakring\.se/);
assert.match(g.SPV_STATE_URL, /spv\.se/);

console.log('employee-sick-guidance v52: OK');
