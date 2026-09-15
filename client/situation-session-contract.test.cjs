const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

// Regression v58: public production routes may not invent a second actor
// vocabulary outside the shared cross-surface contract. Scan literal actor_type
// handoffs in the web source so future web work cannot silently diverge from
// iOS/Android session semantics. Dynamic values remain governed by the contract.
const repoRoot = path.resolve(__dirname, '..');
const productionFiles = [];
function collectProductionFiles(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectProductionFiles(full);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name.includes('.test.')) continue;
    productionFiles.push(full);
  }
}
collectProductionFiles(path.join(repoRoot, 'client'));
for (const entry of fs.readdirSync(repoRoot, {withFileTypes:true})) {
  if (entry.isFile() && entry.name.endsWith('.html')) productionFiles.push(path.join(repoRoot, entry.name));
}

const actorLiterals = [];
const queryLiteral = /actor_type=([a-z0-9_-]+)/gi;
const setterLiteral = /\.set\(\s*['"]actor_type['"]\s*,\s*['"]([a-z0-9_-]+)['"]\s*\)/gi;
for (const file of productionFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of [queryLiteral, setterLiteral]) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
      actorLiterals.push({token:match[1].toLowerCase(), file:path.relative(repoRoot, file)});
    }
  }
}
assert.ok(actorLiterals.length > 0, 'actor vocabulary guard found no live actor_type literals; scanner may have drifted');
const invalidActorLiterals = actorLiterals.filter(({token})=>!contract.ACTOR_TYPES.includes(token));
assert.deepEqual(
  invalidActorLiterals,
  [],
  `live actor_type token is outside shared session contract: ${JSON.stringify(invalidActorLiterals)}`,
);

// Regression v68: the v67 student-sickness route may carry only the coarse facts
// declared by the single cross-surface contract. Web/iOS/Android must therefore
// serialize the same semantic state instead of inventing client-specific keys.
assert.deepEqual(contract.allowedFactKeysForFocus('student_csn'), ['topic','study_context','study_work']);
const studentSnapshots={};
for (const surface of ['web','ios','android']) {
  const p=contract.makeSessionProfile({
    surface,
    language:'sv',
    actorType:'student',
    focus:'student_csn',
    coarseFacts:{topic:'sickness',study_context:'study_support_sweden',study_work:'yes'},
    rawSituation:'Jag studerar med CSN och har blivit sjuk men jobbar också.'
  });
  const allowedFactKeys=contract.allowedFactKeysForFocus(p.focus);
  const u=new URLSearchParams(contract.buildPublicHandoff(p,{allowedFactKeys}));
  assert.equal(u.get('actor_type'),'student');
  assert.equal(u.get('focus'),'student_csn');
  assert.equal(u.get('topic'),'sickness');
  assert.equal(u.get('study_context'),'study_support_sweden');
  assert.equal(u.get('study_work'),'yes');
  assert.equal(u.get('lang'),'sv');
  assert.equal(u.has('situation'),false);
  assert.equal(u.has('raw_situation'),false);
  studentSnapshots[surface]=contract.toSafeSessionSnapshot(p,{allowedFactKeys});
}
assert.deepEqual(studentSnapshots.web.coarse_facts,studentSnapshots.ios.coarse_facts);
assert.deepEqual(studentSnapshots.ios.coarse_facts,studentSnapshots.android.coarse_facts);
assert.equal(studentSnapshots.web.focus,'student_csn');
assert.equal(studentSnapshots.ios.focus,'student_csn');
assert.equal(studentSnapshots.android.focus,'student_csn');
assert.throws(
  ()=>contract.buildPublicHandoff(
    contract.makeSessionProfile({actorType:'student',focus:'student_csn',coarseFacts:{study_level:'masters'}}),
    {allowedFactKeys:contract.allowedFactKeysForFocus('student_csn')}
  ),
  /not allowlisted/
);

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
