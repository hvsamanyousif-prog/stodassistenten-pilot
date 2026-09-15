'use strict';

const assert = require('node:assert/strict');
const mod = require('./economic-assistance.js');

assert.equal(mod.detect('Pengarna räcker inte till mat och hyran den här månaden'), true);
assert.equal(mod.detect('Jag vill söka ekonomiskt bistånd hos socialtjänsten'), true);
assert.equal(mod.detect('النقود لا تكفي للإيجار والطعام هذا الشهر'), true);
assert.equal(mod.detect('پول برای اجاره و غذا کافی نیست'), true);
assert.equal(mod.detect('Jag har ont i tanden och är orolig för kostnaden'), false);
assert.equal(mod.detect('Jag driver företag och vill hitta finansiering'), false);

assert.equal(mod.coarseContext('Jag kan inte betala hyran'), 'housing');
assert.equal(mod.coarseContext('Jag har inte råd med mat'), 'basic_needs');
assert.equal(mod.coarseContext('Jag vill förstå ekonomiskt bistånd'), 'general');

// v62: accumulated debt is a distinct context inside the same economy product.
assert.equal(mod.detect('Jag har skulder och räkningarna är i kaos'), true);
assert.equal(mod.coarseContext('Jag har skulder och räkningarna är i kaos'), 'debt');
assert.equal(mod.detect('Jag har inkasso men klarar fortfarande mat och hyran'), true);
assert.equal(mod.coarseContext('Jag har inkasso men klarar fortfarande mat och hyran'), 'debt');
assert.equal(mod.detect('لدي ديون وفواتير غير مدفوعة ولا أعرف من أين أبدأ'), true);
assert.equal(mod.coarseContext('لدي ديون وفواتير غير مدفوعة ولا أعرف من أين أبدأ'), 'debt');
assert.equal(mod.detect('بدهی و قبض‌های پرداخت‌نشده دارم و نمی‌دانم از کجا شروع کنم'), true);
assert.equal(mod.coarseContext('بدهی و قبض‌های پرداخت‌نشده دارم و نمی‌دانم از کجا شروع کنم'), 'debt');

// Acute essential-cost risk must not be hidden behind general debt counselling.
assert.equal(mod.coarseContext('Jag har inkasso och kan inte betala hyran nu'), 'housing');
assert.equal(mod.coarseContext('Jag har skulder och har inte råd med mat'), 'basic_needs');

// Mentioning Kronofogden as an employer is not personal debt intent.
assert.equal(mod.detect('Jag jobbar på Kronofogden som handläggare'), false);
assert.equal(mod.detect('Jag har en skuld hos Kronofogden'), true);
assert.equal(mod.coarseContext('Jag har en skuld hos Kronofogden'), 'debt');

// v63: a real Kronofogden demand notice has its own time-sensitive next-action context.
assert.equal(mod.detect('Jag fick ett betalningsföreläggande från Kronofogden idag'), true);
assert.equal(mod.coarseContext('Jag fick ett betalningsföreläggande från Kronofogden idag'), 'kfm_notice');
assert.equal(mod.detect('Jag fick ett brev från Kronofogden med ett krav men vet inte om det stämmer'), true);
assert.equal(mod.coarseContext('Jag fick ett brev från Kronofogden med ett krav men vet inte om det stämmer'), 'kfm_notice');
assert.equal(mod.detect('وصلتني رسالة من Kronofogden فيها مطالبة بالدفع'), true);
assert.equal(mod.coarseContext('وصلتني رسالة من Kronofogden فيها مطالبة بالدفع'), 'kfm_notice');
assert.equal(mod.detect('از Kronofogden نامه مطالبه دریافت کرده‌ام'), true);
assert.equal(mod.coarseContext('از Kronofogden نامه مطالبه دریافت کرده‌ام'), 'kfm_notice');

// Do not over-trigger from generic letters or work context.
assert.equal(mod.detect('Jag fick ett vanligt brev från banken'), false);
assert.equal(mod.detect('Jag jobbar på Kronofogden och skriver brev hela dagen'), false);

const housingHref = mod.handoffHref('sv', 'housing');
assert.equal(housingHref, 'person-pilot.html?actor_type=private_person&focus=economic_assistance&context=housing&lang=sv');
assert.ok(!housingHref.includes('hyra='));
assert.ok(!housingHref.includes('inkomst='));
assert.ok(!housingHref.includes('sjuk='));

const debtHref = mod.handoffHref('sv', 'debt');
assert.equal(debtHref, 'person-pilot.html?actor_type=private_person&focus=economic_assistance&context=debt&lang=sv');
assert.ok(!debtHref.includes('creditor='));
assert.ok(!debtHref.includes('skuldbelopp='));
assert.ok(!debtHref.includes('story='));

const noticeHref = mod.handoffHref('sv', 'kfm_notice');
assert.equal(noticeHref, 'person-pilot.html?actor_type=private_person&focus=economic_assistance&context=kfm_notice&lang=sv');
assert.ok(!noticeHref.includes('case_number='));
assert.ok(!noticeHref.includes('claim_amount='));
assert.ok(!noticeHref.includes('deadline='));
assert.ok(!noticeHref.includes('story='));

const arabicHref = mod.handoffHref('ar', 'basic_needs');
assert.ok(arabicHref.includes('lang=ar'));
assert.ok(arabicHref.includes('context=basic_needs'));

const fallbackHref = mod.handoffHref('xx', 'unsafe-context');
assert.ok(fallbackHref.includes('lang=sv'));
assert.ok(fallbackHref.includes('context=general'));

console.log('economic assistance routing: OK');
