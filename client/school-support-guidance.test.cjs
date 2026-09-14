const assert = require('node:assert/strict');
const path = require('node:path');

function setup() {
  global.window = {location: {search: '?actor_type=relative&focus=school_support&lang=sv'}};
  global.location = {href: 'https://example.test/person-pilot.html?actor_type=relative&focus=school_support&lang=sv'};
  global.document = {
    documentElement: {setAttribute() {}},
    getElementById() { return null; },
  };
  global.MutationObserver = class { observe() {} };
  global.T = {sv: {}, ar: {}, fa: {}};
  global.lang = 'sv';
  global.screen = 'home';
  global.scenario = null;
  global.answers = {};
  global.matchRatings = {};
  global.finalFeedback = {};
  global.submitState = 'idle';
  global.go = s => { global.screen = s; };
  global.start = s => { global.scenario = s; global.answers = {}; global.screen = `${s}1`; };
  global.chooseAnswer = (key, val, next) => { global.answers[key] = val; global.go(next); };
  global.q = (title, opts, prev, step) => ({title, opts, prev, step});
  global.flow = () => 'BASE_FLOW';
  global.getRows = () => [['BASE', 'BASE', 'https://example.test']];
  global.actionPlan = () => 'BASE_PLAN';
}

setup();
require(path.join(__dirname, 'family-age-routing.js'));
require(path.join(__dirname, 'school-support-guidance.js'));

// Focused public handoff reuses the existing child age guard first.
assert.equal(global.scenario, 'family');
assert.equal(global.screen, 'family1');
global.chooseAnswer('child', 'no', 'family2');
assert.equal(global.scenario, 'general');
assert.equal(global.screen, 'general1');

// A child answer of yes enters the same person module's focused school state.
global.scenario = 'family';
global.screen = 'family1';
global.answers = {};
global.chooseAnswer('child', 'yes', 'family2');
assert.equal(global.scenario, 'family');
assert.equal(global.screen, 'school1');
const schoolQuestion = global.flow();
assert.equal(schoolQuestion.title, 'schoolStatus');
assert.equal(schoolQuestion.opts.length, 4);
assert.ok(!JSON.stringify(schoolQuestion).toLowerCase().includes('diagnos'), 'diagnosis must not become a route-gating question');

// Information gain: school state changes the safe next action.
global.chooseAnswer('schoolState', 'tried_not_enough', 'familyR');
assert.equal(global.screen, 'familyR');
let rows = global.getRows();
assert.equal(rows.length, 2);
assert.ok(rows[0][1].includes('diagnos aldrig får vara ett villkor'));
assert.ok(rows[1][0].includes('skyndsamt utreda'));
assert.ok(rows.every(row => row[2].includes('skolverket.se')));
assert.ok(global.actionPlan().includes('Kontakta rektor'));

// A formal action-programme state exposes the official appeal path but no promised outcome.
global.answers.schoolState = 'formal_decision';
rows = global.getRows();
assert.ok(rows[1][2].includes('overklagandenamnden.se'));
assert.ok(rows[1][1].includes('kan inte lova'));

// Manual family → school choice reaches the same focused state, not a parallel engine.
global.scenario = 'family';
global.screen = 'family2';
global.answers = {child: 'yes'};
global.chooseAnswer('extra', 'school', 'familyR');
assert.equal(global.screen, 'school1');

// Language parity: the same truth/source contract is rendered with localized explanations.
global.lang = 'ar';
global.answers.schoolState = 'no_clear';
rows = global.getRows();
assert.ok(rows[0][0].includes('الدعم'));
assert.ok(rows[0][2].includes('skolverket.se'));
global.lang = 'fa';
rows = global.getRows();
assert.ok(rows[0][0].includes('حمایت'));
assert.ok(rows[0][2].includes('skolverket.se'));

console.log('school support guidance runtime: OK');
