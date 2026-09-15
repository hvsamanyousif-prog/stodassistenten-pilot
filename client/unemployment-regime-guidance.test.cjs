const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const api = require('./unemployment-regime-guidance.js');

const baseRows = [
  ['A-kassa – villkor och ersättning', 'legacy generic arbetsvillkor wording', 'https://example.invalid/legacy'],
  ['Arbetsförmedlingens stöd', 'legacy support copy', 'https://example.invalid/support'],
  ['Ekonomiskt stöd vid pressad ekonomi', 'keep this overlap visible', 'https://example.invalid/economy'],
  ['Lokala stiftelser', 'keep normal tail ordering', 'https://example.invalid/foundation']
];

for (const language of ['sv', 'ar', 'fa']) {
  const unemployed = api.rewriteRows(baseRows, { language, work: 'unemployed' });
  assert.strictEqual(unemployed.length, 4, `${language}: should preserve four-result ceiling`);
  assert.strictEqual(unemployed[0][2], api.AF_FIRST_DAY_URL, `${language}: first-day action must be first for newly unemployed`);
  assert.strictEqual(unemployed[1][2], api.IAF_REGIME_URL, `${language}: dual-regime truth boundary must be second`);
  assert.strictEqual(unemployed[2][0], baseRows[2][0], `${language}: economic overlap must remain visible`);
  assert(!unemployed.flat().join(' ').includes('legacy generic arbetsvillkor wording'), `${language}: legacy generic work-condition copy must be removed`);

  const receiving = api.rewriteRows(baseRows, { language, work: 'akassa' });
  assert.strictEqual(receiving[0][2], api.IAF_REGIME_URL, `${language}: existing a-kassa user must see regime boundary first`);
  assert.strictEqual(receiving[1][2], api.AF_FIRST_DAY_URL, `${language}: employment-service support remains available`);
  assert.strictEqual(receiving[2][0], baseRows[2][0], `${language}: economic overlap remains available for existing recipients`);
}

const untouched = api.rewriteRows(baseRows, { language: 'sv', work: 'student' });
assert.deepStrictEqual(untouched, baseRows, 'non-unemployment actors must not be changed');
assert.notStrictEqual(untouched, baseRows, 'rewriter must not mutate the caller array');

const allCopy = JSON.stringify(api.COPY);
for (const forbidden of ['34 000', '34000', '120 000', '120000']) {
  assert(!allCopy.includes(forbidden), `volatile threshold leaked into public copy: ${forbidden}`);
}
for (const required of ['1 oktober 2025', '1 أكتوبر 2025', '۱ اکتبر ۲۰۲۵']) {
  assert(allCopy.includes(required), `rule-regime boundary missing: ${required}`);
}
assert(!allCopy.includes('garanter'), 'copy must not guarantee eligibility');

// Browser-level regression: a later classic script must be able to wrap the
// person pilot's global lexical getRows without exposing answers on window.
const moduleSource = fs.readFileSync('client/unemployment-regime-guidance.js', 'utf8');
function browserRows(language, work) {
  const context = { console };
  context.document = { documentElement: { lang: language } };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`
    let lang=${JSON.stringify(language)}, screen='generalR', scenario='general', answers={work:${JSON.stringify(work)}};
    function getRows(){ return ${JSON.stringify(baseRows)}; }
    function render(){}
  `, context);
  vm.runInContext(moduleSource, context);
  return vm.runInContext('getRows()', context);
}

for (const language of ['sv', 'ar', 'fa']) {
  const rows = browserRows(language, 'unemployed');
  assert.strictEqual(rows[0][2], api.AF_FIRST_DAY_URL, `${language}: browser wiring must prioritize first-day action`);
  assert.strictEqual(rows[1][2], api.IAF_REGIME_URL, `${language}: browser wiring must expose dual-regime boundary`);
}
assert.strictEqual(browserRows('sv', 'akassa')[0][2], api.IAF_REGIME_URL, 'browser wiring must not tell an existing recipient to re-register first');

console.log('unemployment regime public copy v79: OK (sv/ar/fa + browser wiring + fail-closed boundaries)');
