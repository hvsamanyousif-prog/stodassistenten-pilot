const assert = require('node:assert/strict');
const care = require('./relative-care.js');

assert.equal(care.detect('Min mamma är svårt sjuk och jag behöver vara hos henne'), true);
assert.equal(care.detect('Min partner har ett livshotande tillstånd'), true);
assert.equal(care.detect('Jag undrar om närståendepenning'), true);
assert.equal(care.detect('Min äldre mamma behöver hjälp med handling och städning'), false);
assert.equal(care.detect('Jag är själv allvarligt sjuk och behöver sjukpenning'), false);
assert.equal(care.detect('Min vän behöver lite hjälp hemma'), false);
assert.equal(care.detect('أمي مريضة بشدة وأحتاج أن أبقى معها'), true);
assert.equal(care.detect('مادرم بیماری بسیار شدید دارد و باید کنارش باشم'), true);

const href = care.handoffHref('sv');
assert.equal(href, 'person-pilot.html?actor_type=relative&focus=relative_care&lang=sv');
assert.equal(href.includes('q='), false);
assert.equal(href.includes('mamma'), false);
assert.equal(care.handoffHref('xx'), 'person-pilot.html?actor_type=relative&focus=relative_care&lang=sv');

console.log('relative-care runtime: OK');
