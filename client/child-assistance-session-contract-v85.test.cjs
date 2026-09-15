const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const contract = require('./situation-session-contract.js');
const runtime = require('./child-assistance-context-extension.js');

const repoRoot = path.resolve(__dirname, '..');
const configured = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'situation_session_contract.json'), 'utf8'));
const expectedFacts = ['support_need','support_for'];

// v85: child/adult subject and the existing support-need token must belong to
// the SAME client-neutral disability/home-support contract used by web and
// future iOS/Android clients. They are routing facts, never eligibility truth.
assert.deepEqual(
  configured.public_handoff.capability_fact_allowlists.disability_home_support,
  expectedFacts,
  'config must own the disability_home_support fact allowlist'
);
assert.deepEqual(
  contract.allowedFactKeysForFocus('disability_home_support'),
  expectedFacts,
  'public adapter must mirror the canonical disability_home_support allowlist'
);

const live = new URL(runtime.rewriteHandoffHref(
  'person-pilot.html?focus=disability_home_support&lang=sv&support_need=personal_assistance',
  'Mitt barn behöver personlig assistans hemma.',
  'https://example.test/index.html'
), 'https://example.test/');
assert.equal(live.searchParams.get('focus'),'disability_home_support');
assert.equal(live.searchParams.get('lang'),'sv');
assert.equal(live.searchParams.get('support_need'),'personal_assistance');
assert.equal(live.searchParams.get('support_for'),'child');

const snapshots = {};
for (const surface of ['web','ios','android']) {
  for (const language of ['sv','ar','fa']) {
    const profile = contract.makeSessionProfile({
      surface,
      language,
      actorType:'private_person',
      focus:'disability_home_support',
      coarseFacts:{support_need:'personal_assistance',support_for:'child'},
      rawSituation:'Mitt barn Alma har autism och behöver personlig assistans hemma.'
    });
    const allowedFactKeys = contract.allowedFactKeysForFocus(profile.focus);
    const handoff = new URLSearchParams(contract.buildPublicHandoff(profile,{allowedFactKeys}));
    assert.equal(handoff.get('actor_type'),'private_person');
    assert.equal(handoff.get('focus'),'disability_home_support');
    assert.equal(handoff.get('lang'),language);
    assert.equal(handoff.get('support_need'),'personal_assistance');
    assert.equal(handoff.get('support_for'),'child');
    for (const forbidden of ['situation','raw_situation','diagnosis','address','personnummer','name','child_name']) {
      assert.equal(handoff.has(forbidden),false, `public assistance handoff leaked ${forbidden}`);
    }
    const snapshot = contract.toSafeSessionSnapshot(profile,{allowedFactKeys});
    assert.equal(Object.hasOwn(snapshot,'ephemeral'),false);
    assert.equal(JSON.stringify(snapshot).includes('Alma'),false);
    assert.equal(JSON.stringify(snapshot).includes('autism'),false);
    snapshots[`${surface}:${language}`] = snapshot.coarse_facts;
  }
}

assert.deepEqual(snapshots['web:sv'],snapshots['ios:sv']);
assert.deepEqual(snapshots['ios:sv'],snapshots['android:sv']);
assert.deepEqual(snapshots['web:sv'],snapshots['web:ar']);
assert.deepEqual(snapshots['web:ar'],snapshots['web:fa']);

// Fail closed if a client tries to turn sensitive or materially assessed facts
// into public portable state. Detailed eligibility stays behind verified truth.
for (const [key,value] of [
  ['diagnosis','autism'],
  ['address','examplegatan_1'],
  ['personnummer','synthetic_id'],
  ['child_name','alma']
]) {
  assert.throws(
    ()=>contract.makeSessionProfile({focus:'disability_home_support',coarseFacts:{[key]:value}}),
    /forbidden coarse fact key/
  );
}
for (const [key,value] of [
  ['child_age','8'],
  ['assessed_hours','21'],
  ['parental_deduction','yes'],
  ['eligibility','approved']
]) {
  assert.throws(
    ()=>contract.buildPublicHandoff(
      contract.makeSessionProfile({focus:'disability_home_support',coarseFacts:{[key]:value}}),
      {allowedFactKeys:expectedFacts}
    ),
    /not allowlisted/
  );
}

console.log('child assistance shared session contract v85: OK');
