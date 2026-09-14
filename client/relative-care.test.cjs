const assert = require('node:assert/strict');
const care = require('./relative-care.js');

assert.equal(care.detect('Min mamma är svårt sjuk och jag behöver vara hos henne'), true);
assert.equal(care.detectContext('Min mamma är svårt sjuk och jag behöver vara hos henne'), 'near_relative_benefit');
assert.equal(care.detect('Min partner har ett livshotande tillstånd'), true);
assert.equal(care.detect('Jag undrar om närståendepenning'), true);
assert.equal(care.detectContext('Jag undrar om närståendepenning'), 'near_relative_benefit');
assert.equal(care.detect('Min äldre mamma behöver hjälp med handling och städning'), false);
assert.equal(care.detect('Jag vårdar min äldre mamma och behöver stöd'), true);
assert.equal(care.detectContext('Jag vårdar min äldre mamma och behöver stöd'), 'municipal_support');
assert.equal(care.detect('Jag hjälper min pappa som har demens varje dag'), true);
assert.equal(care.detectContext('Jag hjälper min pappa som har demens varje dag'), 'municipal_support');
assert.equal(care.detect('Vem kontaktar jag om anhörigstöd?'), true);
assert.equal(care.detectContext('Vem kontaktar jag om anhörigstöd?'), 'municipal_support');
assert.equal(care.detect('Jag är själv allvarligt sjuk och behöver sjukpenning'), false);
assert.equal(care.detect('Min vän behöver lite hjälp hemma'), false);
assert.equal(care.detect('أمي مريضة بشدة وأحتاج أن أبقى معها'), true);
assert.equal(care.detectContext('أمي مريضة بشدة وأحتاج أن أبقى معها'), 'near_relative_benefit');
assert.equal(care.detect('أعتني بوالد مسن وأحتاج إلى دعم'), true);
assert.equal(care.detectContext('أعتني بوالد مسن وأحتاج إلى دعم'), 'municipal_support');
assert.equal(care.detect('مادرم بیماری بسیار شدید دارد و باید کنارش باشم'), true);
assert.equal(care.detect('از مادر سالمندم مراقبت می کنم و حمایت می خواهم'), true);
assert.equal(care.detectContext('از مادر سالمندم مراقبت می کنم و حمایت می خواهم'), 'municipal_support');

const href = care.handoffHref('sv');
assert.equal(href, 'person-pilot.html?actor_type=relative&focus=relative_care&lang=sv');
assert.equal(care.handoffHref('sv', 'municipal_support'), 'person-pilot.html?actor_type=relative&focus=relative_care&lang=sv&care_context=municipal_support');
assert.equal(care.handoffHref('sv', 'near_relative_benefit'), 'person-pilot.html?actor_type=relative&focus=relative_care&lang=sv&care_context=near_relative_benefit');
assert.equal(care.handoffHref('sv', 'raw_story'), href);
assert.equal(href.includes('q='), false);
assert.equal(href.includes('mamma'), false);
assert.equal(care.handoffHref('xx'), 'person-pilot.html?actor_type=relative&focus=relative_care&lang=sv');

console.log('relative-care runtime: OK');
