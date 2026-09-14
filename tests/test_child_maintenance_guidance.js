const assert = require('assert');
const mod = require('../client/child-maintenance-guidance.js');

assert.equal(mod.detect('Barnets andra förälder betalar inget underhåll'), true);
assert.equal(mod.detect('Kan jag få underhållsstöd när den andra föräldern inte betalar?'), true);
assert.equal(mod.detect('Jag behöver hjälp med underhållsbidrag'), true);
assert.equal(mod.detect('الوالد الآخر لا يدفع نفقة الطفل'), true);
assert.equal(mod.detect('والد دیگر نفقه فرزند را نمی‌پردازد'), true);
assert.equal(mod.detect('Mitt ex betalar inte hyran'), false);
assert.equal(mod.detect('Jag är separerad och behöver bostadsbidrag'), false);

assert.equal(mod.detectContext('Den andra föräldern bor utomlands och betalar inget underhåll'), 'cross_border');
assert.equal(mod.detectContext('Barnets andra förälder betalar inget underhåll'), null);
assert.equal(mod.handoffHref('sv', 'cross_border'), 'person-pilot.html?actor_type=private_person&focus=child_maintenance&lang=sv&maintenance_context=cross_border');
assert.equal(mod.handoffHref('ar', 'anything-else'), 'person-pilot.html?actor_type=private_person&focus=child_maintenance&lang=ar');

assert.equal(mod.nextStep({}), 'ask_residence');
assert.equal(mod.nextStep({residence:'unsure'}), 'verify_residence');
assert.equal(mod.nextStep({residence:'equal'}), 'equal_residence');
assert.equal(mod.nextStep({residence:'mostly'}), 'ask_payment');
assert.equal(mod.nextStep({residence:'mostly', payment:'unsure'}), 'verify_payment');
assert.equal(mod.nextStep({residence:'mostly', payment:'full'}), 'direct_maintenance');
assert.equal(mod.nextStep({residence:'mostly', payment:'partial'}), 'support_candidate');
assert.equal(mod.nextStep({residence:'mostly', payment:'none'}), 'support_candidate');
assert.equal(mod.nextStep({residence:'mostly', payment:'none', context:'cross_border'}), 'cross_border_support_candidate');

const href = mod.handoffHref('sv', 'cross_border');
['child_name','child_age','other_parent','address','country','custody','amount','story','description'].forEach((key) => {
  assert.equal(new URL(href, 'https://example.test/').searchParams.has(key), false, `handoff must not contain ${key}`);
});

assert.match(mod.FK_OVERVIEW_URL, /^https:\/\/www\.forsakringskassan\.se\//);
assert.match(mod.FK_SUPPORT_URL, /^https:\/\/www\.forsakringskassan\.se\//);
assert.match(mod.FK_ABROAD_URL, /^https:\/\/www\.forsakringskassan\.se\//);
console.log('child maintenance guidance: OK');
