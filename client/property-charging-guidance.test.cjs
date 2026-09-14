const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const modulePath = path.join(__dirname, 'property-charging-guidance.js');

function setup(search) {
  global.window = {location: {search}};
  global.document = {
    documentElement: {lang: 'sv'},
    getElementById() { return null; },
    querySelector() { return null; },
  };
  global.MutationObserver = class { observe() {} };
  global.T = {sv: {}, ar: {}, fa: {}};
  global.screen = 'home';
  global.scenario = null;
  global.answers = {};
  global.matchRatings = {};
  global.finalFeedback = {};
  global.submitState = 'idle';
  global.q = (title, opts, prev, step) => ({title, opts, prev, step});
  global.flow = () => 'BASE_FLOW';
  global.getRows = () => [['BASE', 'BASE', 'https://example.test']];
  global.results = () => 'BASE_RESULTS';
  global.render = () => {};
}

function load(search) {
  delete require.cache[require.resolve(modulePath)];
  setup(search);
  require(modulePath);
}

// Known association context avoids re-asking the actor but still asks a route-changing use fact.
load('?actor_type=property_actor&focus=property_charging&charging_context=association_project&lang=sv');
assert.equal(global.scenario, 'property_charging');
assert.equal(global.screen, 'chargingAssocUse');
let question = global.flow();
assert.equal(question.title, 'chargingAssocUse');
assert.equal(question.opts.length, 4);

// When resident/member use is already known, do not ask it again and do not invent a company pre-start gate.
load('?actor_type=property_actor&focus=property_charging&charging_context=association_project&charging_use=members&lang=sv');
assert.equal(global.screen, 'chargingR');
let rows = global.getRows();
assert.equal(rows.length, 1);
assert.ok(rows[0][2].includes('foreningar-och-boendeorganisationer'));
assert.ok(rows[0][1].includes('50 procent'));
assert.ok(rows[0][1].includes('15 000'));
assert.ok(rows[0][1].includes('inte ett löfte'));
assert.ok(rows[0][1].includes('sex månader'));

// Association external use asks work-start state; started work is fail-closed.
load('?actor_type=property_actor&focus=property_charging&charging_context=association_project&charging_use=external&lang=sv');
assert.equal(global.screen, 'chargingStarted');
question = global.flow();
assert.equal(question.title, 'chargingStarted');
global.answers.chargingStarted = 'yes';
global.screen = 'chargingR';
rows = global.getRows();
assert.ok(rows.some(row => row[0].includes('Extern användning')));
assert.ok(rows.some(row => row[0].includes('stoppar')));

// Company context without a known user category asks use before work-start.
load('?actor_type=property_actor&focus=property_charging&charging_context=company_project&lang=sv');
assert.equal(global.screen, 'chargingCompanyUse');
question = global.flow();
assert.equal(question.title, 'chargingCompanyUse');
assert.equal(question.opts.length, 3);

// Employees/own tenants are pre-start; started work must not receive a positive promise.
load('?actor_type=property_actor&focus=property_charging&charging_context=company_project&charging_use=company_internal&lang=sv');
assert.equal(global.screen, 'chargingStarted');
global.answers.chargingStarted = 'yes';
global.screen = 'chargingR';
rows = global.getRows();
assert.ok(rows[0][1].includes('innan installationsarbetet påbörjas'));
assert.ok(rows[1][1].includes('inte lova stöd'));

// Red-team exception: company guest charging can be applied for before OR after installation starts.
load('?actor_type=property_actor&focus=property_charging&charging_context=company_project&charging_use=company_guests&lang=sv');
assert.equal(global.screen, 'chargingR', 'guest path must not inherit the employee/tenant pre-start question');
rows = global.getRows();
assert.equal(rows.length, 1);
assert.ok(rows[0][0].toLowerCase().includes('gästladdning'));
assert.ok(rows[0][1].includes('både före och efter'));
assert.ok(!rows[0][1].includes('kan stöd inte beviljas'));

// Resident scope is asked only when it was not safely inferred.
load('?actor_type=property_actor&focus=property_charging&charging_context=resident_request&lang=sv');
assert.equal(global.screen, 'chargingResidentScope');
question = global.flow();
assert.equal(question.title, 'chargingResidentScope');

// Explicit own-home-parking scope skips the duplicate question and stays on the separate statutory route.
load('?actor_type=property_actor&focus=property_charging&charging_context=resident_request&charging_resident_scope=own_home_parking&lang=sv');
assert.equal(global.screen, 'chargingR');
rows = global.getRows();
assert.equal(rows.length, 2);
assert.ok(rows.every(row => row[2].includes('riksdagen.se')));
assert.ok(rows[0][1].includes('egen bekostnad'));
assert.ok(rows[0][1].includes('inte ett personligt Ladda bilen-bidrag'));
assert.ok(rows[0][1].includes('inte en garanti'));

// Unknown/non-home parking scope fails closed rather than asserting the statutory right.
load('?actor_type=property_actor&focus=property_charging&charging_context=resident_request&charging_resident_scope=other_or_unclear&lang=sv');
rows = global.getRows();
assert.equal(rows.length, 1);
assert.ok(rows[0][1].includes('inte lova rätt till installation'));

// RTL language parity retains the same statutory-source split.
global.document.documentElement.lang = 'ar';
rows = global.getRows();
assert.ok(rows[0][0].includes('موقف'));
assert.ok(rows.every(row => row[2].includes('riksdagen.se')));
global.document.documentElement.lang = 'fa';
rows = global.getRows();
assert.ok(rows[0][0].includes('پارک'));

// Public handoff remains bounded; no sensitive identifiers or raw story fields are supported.
const source = fs.readFileSync(modulePath, 'utf8');
for (const forbidden of ['organisation_number=', 'org_number=', 'address=', 'parking_id=', 'exact_cost=', 'vehicle_registration=', 'raw_story=']) {
  assert.ok(!source.includes(forbidden), `forbidden handoff field: ${forbidden}`);
}
for (const allowedCoarse of ['charging_context', 'charging_use', 'charging_resident_scope']) assert.ok(source.includes(allowedCoarse));
assert.ok(source.includes("const FOCUS = 'property_charging'"));
assert.ok(!source.includes('property-charging-pilot.html'));
assert.ok(!source.includes('fetch('));

console.log('property charging guidance runtime: OK');
