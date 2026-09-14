const assert = require('assert');
const g = require('./adult-extra-costs-guidance.js');

assert.equal(g.detect('Jag har en funktionsnedsättning och återkommande extra kostnader.'), true);
assert.equal(g.detect('Mina merkostnader på grund av sjukdom har ökat.'), true);
assert.equal(g.detect('Jag har inte råd med hyran.'), false);
assert.equal(g.detect('Jag har en diagnos.'), false);
assert.equal(g.handoffHref('sv'), 'person-pilot.html?actor_type=private_person&focus=adult_extra_costs&lang=sv');
assert.equal(g.handoffHref('bad'), 'person-pilot.html?actor_type=private_person&focus=adult_extra_costs&lang=sv');
assert.equal(g.nextStep({}), 'ask_extra');
assert.equal(g.nextStep({extra:'no'}), 'verify_extra_cost');
assert.equal(g.nextStep({extra:'yes'}), 'ask_payer');
assert.equal(g.nextStep({extra:'yes', payer:'self'}), 'ask_applicant');
assert.equal(g.nextStep({extra:'yes', payer:'other', applicant:'age21'}), 'separate_other_payer');
assert.equal(g.nextStep({extra:'yes', payer:'self', applicant:'age18Studying'}), 'parent_application_boundary');
assert.equal(g.nextStep({extra:'yes', payer:'mixed', applicant:'age21'}), 'verify_missing_fact');
assert.equal(g.nextStep({extra:'yes', payer:'self', applicant:'age21'}), 'verify_candidate');
assert.match(g.FK_URL, /forsakringskassan\.se/);
console.log('adult-extra-costs-guidance v50: OK');
