const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const contract = require('./situation-session-contract.js');
const workContext = require('./employee-sick-work-context-extension.js');

const repoRoot = path.resolve(__dirname, '..');
const configured = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'situation_session_contract.json'), 'utf8'));
const expectedFacts = ['work_context','business_form'];

// v83: v64 work-context intelligence must continue through the SAME shared
// session contract instead of becoming a web-only vocabulary.
assert.deepEqual(
  configured.public_handoff.capability_fact_allowlists.employee_sick,
  expectedFacts,
  'config must own the employee_sick work-context fact allowlist'
);
assert.deepEqual(
  contract.allowedFactKeysForFocus('employee_sick'),
  expectedFacts,
  'public adapter must mirror the canonical employee_sick allowlist'
);

// The live route is the source of the existing semantic vocabulary. Do not
// invent a new self-employed actor or a mobile-specific business-form schema.
const live = new URL(workContext.handoffHref('sv', {
  workContext:'self_employed',
  businessForm:'limited_company'
}), 'https://example.test/');
assert.equal(live.searchParams.get('actor_type'),'private_person');
assert.equal(live.searchParams.get('focus'),'employee_sick');
assert.equal(live.searchParams.get('work_context'),'self_employed');
assert.equal(live.searchParams.get('business_form'),'limited_company');

const snapshots = {};
for (const surface of ['web','ios','android']) {
  for (const language of ['sv','ar','fa']) {
    const profile = contract.makeSessionProfile({
      surface,
      language,
      actorType:'private_person',
      focus:'employee_sick',
      coarseFacts:{work_context:'self_employed',business_form:'limited_company'},
      rawSituation:'Jag driver eget aktiebolag och är sjuk.'
    });
    const allowedFactKeys = contract.allowedFactKeysForFocus(profile.focus);
    const handoff = new URLSearchParams(contract.buildPublicHandoff(profile,{allowedFactKeys}));
    assert.equal(handoff.get('actor_type'),'private_person');
    assert.equal(handoff.get('focus'),'employee_sick');
    assert.equal(handoff.get('lang'),language);
    assert.equal(handoff.get('work_context'),'self_employed');
    assert.equal(handoff.get('business_form'),'limited_company');
    for (const forbidden of ['situation','raw_situation','diagnosis','medical_note','income','salary','employer','company_name','personnummer']) {
      assert.equal(handoff.has(forbidden),false, `public employee sickness handoff leaked ${forbidden}`);
    }
    const snapshot = contract.toSafeSessionSnapshot(profile,{allowedFactKeys});
    assert.equal(Object.hasOwn(snapshot,'ephemeral'),false);
    assert.equal(JSON.stringify(snapshot).includes('aktiebolag och är sjuk'),false);
    snapshots[`${surface}:${language}`] = snapshot.coarse_facts;
  }
}

assert.deepEqual(snapshots['web:sv'],snapshots['ios:sv']);
assert.deepEqual(snapshots['ios:sv'],snapshots['android:sv']);
assert.deepEqual(snapshots['web:sv'],snapshots['web:ar']);
assert.deepEqual(snapshots['web:ar'],snapshots['web:fa']);

// Other v64 route-changing contexts use the same keys and can omit
// business_form when it is not required for the first safe route.
for (const context of ['combined_employment','invoiced_worker']) {
  const profile = contract.makeSessionProfile({
    actorType:'private_person',
    focus:'employee_sick',
    coarseFacts:{work_context:context}
  });
  const handoff = new URLSearchParams(contract.buildPublicHandoff(profile,{allowedFactKeys:expectedFacts}));
  assert.equal(handoff.get('work_context'),context);
  assert.equal(handoff.has('business_form'),false);
}

// Fail closed on detailed sickness, identity, income and company data. The
// route-changing state is coarse work context only.
for (const [key,value] of [
  ['diagnosis','flu'],
  ['medical_note','yes'],
  ['income','50000'],
  ['salary','50000'],
  ['employer','secret_ab'],
  ['company_name','secret_ab'],
  ['personnummer','synthetic_id']
]) {
  assert.throws(
    ()=>contract.makeSessionProfile({focus:'employee_sick',coarseFacts:{[key]:value}}),
    /forbidden coarse fact key/
  );
}
assert.throws(
  ()=>contract.buildPublicHandoff(
    contract.makeSessionProfile({focus:'employee_sick',coarseFacts:{orgnr:'synthetic'}}),
    {allowedFactKeys:expectedFacts}
  ),
  /not allowlisted/
);

console.log('employee sickness shared session contract v83: OK');
