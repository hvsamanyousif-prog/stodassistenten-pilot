const assert = require('node:assert/strict');
const path = require('node:path');

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

setup('?actor_type=property_actor&focus=property_charging&charging_context=association_project&lang=sv');
require(path.join(__dirname, 'property-charging-guidance.js'));

assert.equal(global.scenario, 'property_charging');
assert.equal(global.answers.chargingContext, 'association_project');
assert.equal(global.screen, 'chargingUse', 'known coarse context must skip redundant context question');
let question = global.flow();
assert.equal(question.title, 'chargingUse');
assert.equal(question.opts.length, 4);

// Resident/member use must keep the association path and must not invent a company pre-start gate.
global.answers.chargingUse = 'members';
global.screen = 'chargingR';
let rows = global.getRows();
assert.equal(rows.length, 1);
assert.ok(rows[0][2].includes('foreningar-och-boendeorganisationer'));
assert.ok(rows[0][1].includes('50 procent'));
assert.ok(rows[0][1].includes('15 000'));
assert.ok(rows[0][1].includes('inte ett löfte'));

// External use changes the route and asks start state before giving a safe next action.
global.answers.chargingUse = 'external';
global.screen = 'chargingStarted';
question = global.flow();
assert.equal(question.title, 'chargingStarted');
global.answers.chargingStarted = 'yes';
global.screen = 'chargingR';
rows = global.getRows();
assert.ok(rows.some(row => row[0].includes('Extern användning')));
assert.ok(rows.some(row => row[0].includes('stoppunkt')));
assert.ok(rows.some(row => row[2].includes('fastighetsbolag-och-foretag')));

// New load with an explicit company context skips the actor question but never skips the work-start fact.
delete require.cache[require.resolve(path.join(__dirname, 'property-charging-guidance.js'))];
setup('?actor_type=property_actor&focus=property_charging&charging_context=company_project&lang=sv');
require(path.join(__dirname, 'property-charging-guidance.js'));
assert.equal(global.screen, 'chargingStarted');
global.answers.chargingStarted = 'yes';
global.screen = 'chargingR';
rows = global.getRows();
assert.ok(rows[0][1].includes('innan installationsarbetet påbörjas'));
assert.ok(rows[1][1].includes('inte lova stöd'));

// Resident request is a separate legal-right path and must not be rendered as a personal Ladda bilen grant.
delete require.cache[require.resolve(path.join(__dirname, 'property-charging-guidance.js'))];
setup('?actor_type=property_actor&focus=property_charging&charging_context=resident_request&lang=sv');
require(path.join(__dirname, 'property-charging-guidance.js'));
assert.equal(global.screen, 'chargingR');
rows = global.getRows();
assert.equal(rows.length, 2);
assert.ok(rows.every(row => row[2].includes('riksdagen.se')));
assert.ok(rows[0][1].includes('inte samma sak'));
assert.ok(rows[0][1].includes('inte') && rows[0][1].includes('automatiskt'));

// RTL language parity retains the same primary-source split.
global.document.documentElement.lang = 'ar';
rows = global.getRows();
assert.ok(rows[0][0].includes('حق'));
assert.ok(rows.every(row => row[2].includes('riksdagen.se')));
global.document.documentElement.lang = 'fa';
rows = global.getRows();
assert.ok(rows[0][0].includes('حق'));

// Public handoff contract remains bounded; no sensitive fields are supported by the module.
const source = require('node:fs').readFileSync(path.join(__dirname, 'property-charging-guidance.js'), 'utf8');
for (const forbidden of ['organisation_number=', 'org_number=', 'address=', 'parking_id=', 'exact_cost=', 'vehicle_registration=', 'raw_story=']) {
  assert.ok(!source.includes(forbidden), `forbidden handoff field: ${forbidden}`);
}
assert.ok(source.includes("const FOCUS = 'property_charging'"));
assert.ok(!source.includes('property-charging-pilot.html'));

console.log('property charging guidance runtime: OK');
