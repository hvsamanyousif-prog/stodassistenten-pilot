const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const contract = require('./situation-session-contract.js');

const repoRoot = path.resolve(__dirname, '..');
const configured = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'situation_session_contract.json'), 'utf8'));
const guidanceSource = fs.readFileSync(path.join(__dirname, 'family-housing-guidance.js'), 'utf8');
const expectedFacts = ['work','money','children','housing'];

// v82: the v81 family-housing route must use one client-neutral fact vocabulary.
assert.deepEqual(
  configured.public_handoff.capability_fact_allowlists.family_housing,
  expectedFacts,
  'config must own the family_housing fact allowlist'
);
assert.deepEqual(
  contract.allowedFactKeysForFocus('family_housing'),
  expectedFacts,
  'public adapter must mirror the canonical family_housing allowlist'
);

// Lock the live web route's route-changing inputs to the same coarse fact names.
for (const marker of [
  'work: answers.work',
  'money: answers.money',
  'children: answers.children',
  'housing: answers.housing'
]) {
  assert.equal(guidanceSource.includes(marker), true, `v81 runtime fact drifted: ${marker}`);
}
assert.equal(expectedFacts.includes('general'), false, 'UI scenario token must not become a transported route fact');

const snapshots = {};
for (const surface of ['web','ios','android']) {
  for (const language of ['sv','ar','fa']) {
    const profile = contract.makeSessionProfile({
      surface,
      language,
      actorType:'private_person',
      focus:'family_housing',
      coarseFacts:{work:'unemployed',money:'tight',children:'yes',housing:'yes'},
      rawSituation:'Jag har barn hemma, hög boendekostnad och ont om pengar.'
    });
    const allowedFactKeys = contract.allowedFactKeysForFocus(profile.focus);
    const handoff = new URLSearchParams(contract.buildPublicHandoff(profile,{allowedFactKeys}));
    assert.equal(handoff.get('actor_type'),'private_person');
    assert.equal(handoff.get('focus'),'family_housing');
    assert.equal(handoff.get('lang'),language);
    assert.equal(handoff.get('work'),'unemployed');
    assert.equal(handoff.get('money'),'tight');
    assert.equal(handoff.get('children'),'yes');
    assert.equal(handoff.get('housing'),'yes');
    for (const forbidden of ['situation','raw_situation','income','salary','child_name','rent_amount']) {
      assert.equal(handoff.has(forbidden),false, `public family housing handoff leaked ${forbidden}`);
    }
    const snapshot = contract.toSafeSessionSnapshot(profile,{allowedFactKeys});
    assert.equal(Object.hasOwn(snapshot,'ephemeral'),false);
    assert.equal(JSON.stringify(snapshot).includes('ont om pengar'),false);
    snapshots[`${surface}:${language}`] = snapshot.coarse_facts;
  }
}

assert.deepEqual(snapshots['web:sv'], snapshots['ios:sv']);
assert.deepEqual(snapshots['ios:sv'], snapshots['android:sv']);
assert.deepEqual(snapshots['web:sv'], snapshots['web:ar']);
assert.deepEqual(snapshots['web:ar'], snapshots['web:fa']);

// Fail closed if a client tries to promote detailed household/economic data into public state.
assert.throws(
  ()=>contract.makeSessionProfile({focus:'family_housing',coarseFacts:{income:'30000'}}),
  /forbidden coarse fact key/
);
assert.throws(
  ()=>contract.makeSessionProfile({focus:'family_housing',coarseFacts:{child_name:'alma'}}),
  /forbidden coarse fact key/
);
assert.throws(
  ()=>contract.buildPublicHandoff(
    contract.makeSessionProfile({focus:'family_housing',coarseFacts:{rent_amount:'12000'}}),
    {allowedFactKeys:contract.allowedFactKeysForFocus('family_housing')}
  ),
  /not allowlisted/
);
assert.throws(
  ()=>contract.buildPublicHandoff(
    contract.makeSessionProfile({focus:'family_housing',coarseFacts:{child_age:'8'}}),
    {allowedFactKeys:contract.allowedFactKeysForFocus('family_housing')}
  ),
  /not allowlisted/
);

console.log('family housing shared session contract v82: OK');
