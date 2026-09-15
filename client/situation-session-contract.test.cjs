const assert = require('node:assert/strict');
const contract = require('./situation-session-contract.js');

assert.deepEqual([...contract.SURFACES], ['web','ios','android']);
assert.deepEqual([...contract.LANGUAGES], ['sv','ar','fa']);
assert.deepEqual([...contract.ACTOR_TYPES], ['private_person','relative','student','employee','company','association','property_actor','other']);

const syntheticStory = 'Jag behöver stöd hemma och vill hitta rätt väg.';
const web = contract.makeSessionProfile({
  surface:'web',
  language:'sv',
  actorType:'private_person',
  focus:'disability_home_support',
  coarseFacts:{support_need:'personal_care'},
  missingFacts:['municipality_route'],
  rawSituation:syntheticStory
});
assert.equal(web.ephemeral.rawSituation, syntheticStory);

const query = contract.buildPublicHandoff(web,{allowedFactKeys:['support_need']});
assert.equal(query.includes('actor_type=private_person'), true);
assert.equal(query.includes('focus=disability_home_support'), true);
assert.equal(query.includes('lang=sv'), true);
assert.equal(query.includes('support_need=personal_care'), true);
for (const forbidden of ['story=', 'situation=', 'raw_situation=', 'diagnosis=', 'address=', 'personnummer=', 'municipality_route=', syntheticStory]) {
  assert.equal(query.includes(forbidden), false, `public handoff leaked ${forbidden}`);
}

const snapshot = contract.toSafeSessionSnapshot(web,{allowedFactKeys:['support_need']});
assert.deepEqual(snapshot.coarse_facts,{support_need:'personal_care'});
assert.equal(Object.hasOwn(snapshot,'ephemeral'),false);
assert.equal(Object.hasOwn(snapshot,'missing_facts'),false);
assert.equal(JSON.stringify(snapshot).includes(syntheticStory),false);

// Language changes presentation, not the capability/fact meaning.
for (const language of ['sv','ar','fa']) {
  const p=contract.makeSessionProfile({surface:'web',language,actorType:'private_person',focus:'disability_home_support',coarseFacts:{support_need:'personal_care'}});
  const u=new URLSearchParams(contract.buildPublicHandoff(p,{allowedFactKeys:['support_need']}));
  assert.equal(u.get('focus'),'disability_home_support');
  assert.equal(u.get('support_need'),'personal_care');
  assert.equal(u.get('lang'),language);
}

// Web and future mobile clients share the same semantic state contract.
const safeBySurface={};
for (const surface of ['web','ios','android']) {
  const p=contract.makeSessionProfile({surface,language:'sv',actorType:'relative',focus:'disability_home_support',coarseFacts:{support_need:'safety'}});
  safeBySurface[surface]=contract.toSafeSessionSnapshot(p,{allowedFactKeys:['support_need']});
  assert.equal(safeBySurface[surface].focus,'disability_home_support');
  assert.equal(safeBySurface[surface].coarse_facts.support_need,'safety');
}
assert.equal(safeBySurface.web.actor_type,safeBySurface.ios.actor_type);
assert.equal(safeBySurface.ios.actor_type,safeBySurface.android.actor_type);

// Regression v57: the shared contract must use the exact actor token already
// emitted and consumed by the live student/CSN web route. A second student
// vocabulary would split semantic state between web and future mobile clients.
for (const surface of ['web','ios','android']) {
  const p=contract.makeSessionProfile({surface,language:'sv',actorType:'student',focus:'student_csn'});
  const u=new URLSearchParams(contract.buildPublicHandoff(p));
  assert.equal(u.get('actor_type'),'student');
  assert.equal(u.get('focus'),'student_csn');
}
assert.throws(()=>contract.makeSessionProfile({actorType:'student_young_adult',focus:'student_csn'}),/actorType is not allowed/);

// Fail closed: sensitive/arbitrary keys or prose-like values never become coarse transport facts.
assert.throws(()=>contract.makeSessionProfile({coarseFacts:{diagnosis:'adhd'}}),/forbidden coarse fact key/);
assert.throws(()=>contract.makeSessionProfile({coarseFacts:{rawSituation:'secret'}}),/forbidden coarse fact key/);
assert.throws(()=>contract.makeSessionProfile({coarseFacts:{address:'street_1'}}),/forbidden coarse fact key/);
assert.throws(()=>contract.makeSessionProfile({coarseFacts:{support_need:'this is raw prose'}}),/short coarse token/);
assert.throws(()=>contract.buildPublicHandoff(web,{allowedFactKeys:[]}),/not allowlisted/);
assert.throws(()=>contract.buildPublicHandoff(web,{allowedFactKeys:['another_fact']}),/not allowlisted/);
assert.throws(()=>contract.makeSessionProfile({language:'en'}),/language is not allowed/);
assert.throws(()=>contract.makeSessionProfile({surface:'desktop'}),/surface is not allowed/);
assert.throws(()=>contract.makeSessionProfile({focus:'contains spaces'}),/short coarse token/);

console.log('situation/session contract tests: OK');
