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

const housingHref = mod.handoffHref('sv', 'housing');
assert.equal(housingHref, 'person-pilot.html?actor_type=private_person&focus=economic_assistance&context=housing&lang=sv');
assert.ok(!housingHref.includes('hyra='));
assert.ok(!housingHref.includes('inkomst='));
assert.ok(!housingHref.includes('sjuk='));

const arabicHref = mod.handoffHref('ar', 'basic_needs');
assert.ok(arabicHref.includes('lang=ar'));
assert.ok(arabicHref.includes('context=basic_needs'));

const fallbackHref = mod.handoffHref('xx', 'unsafe-context');
assert.ok(fallbackHref.includes('lang=sv'));
assert.ok(fallbackHref.includes('context=general'));

console.log('economic assistance routing: OK');
