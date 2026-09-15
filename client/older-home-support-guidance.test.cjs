'use strict';

const assert = require('node:assert/strict');
const guidance = require('./older-home-support-guidance.js');

assert.equal(guidance.detect('Min äldre mamma klarar inte att duscha och städa hemma längre, vem ringer jag?'), true);
assert.equal(guidance.detect('Jag är 82 och behöver hemtjänst för att kunna bo kvar hemma'), true);
assert.equal(guidance.detect('Jag behöver äldreomsorg hemma och vet inte vart jag ska vända mig'), true);
assert.equal(guidance.detect('والدتي كبيرة في السن وتحتاج مساعدة في المنزل للتنظيف والاستحمام'), true);
assert.equal(guidance.detect('مادرم سالمند است و برای نظافت و حمام در خانه کمک می‌خواهد'), true);
assert.equal(guidance.detect('Min mamma är svårt sjuk och jag behöver avstå från jobbet för att vara med henne'), false, 'caregiver cash-benefit stories must not be stolen by the older-home route');

// Parent relation is not evidence of older age. Hemtjänst, trygghetslarm and
// hemsjukvård are not older-only services.
assert.equal(guidance.detect('Min mamma är 48, har en funktionsnedsättning och behöver hemtjänst hemma'), false, 'parent relation must not be converted into old age');
assert.equal(guidance.detect('Jag är 34 och har en funktionsnedsättning och behöver hemtjänst hemma'), false, 'younger disability home-help story must not be stolen by eldercare');
assert.equal(guidance.detect('Jag behöver hemsjukvård hemma efter en operation'), false, 'generic home-healthcare story must not be assumed to concern an older person');
assert.equal(guidance.detect('Jag behöver trygghetslarm på grund av min funktionsnedsättning'), false, 'generic disability safety-alarm story must not be assumed to concern an older person');

assert.equal(guidance.detectNeed('Hon behöver hjälp med städning, mat och dusch'), 'social_care');
assert.equal(guidance.detectNeed('Han behöver sjuksköterska hemma för omläggning'), 'healthcare');
assert.equal(guidance.detectNeed('Hon behöver både hemtjänst för dusch och sjuksköterska hemma för omläggning'), 'both');
assert.equal(guidance.detectNeed('Jag vet inte vilken hjälp som behövs'), 'unsure');

const href = guidance.handoffHref('sv', 'social_care');
const url = new URL(href, 'https://example.test/');
assert.equal(url.pathname, '/person-pilot.html');
assert.equal(url.searchParams.get('focus'), 'older_home_support');
assert.equal(url.searchParams.get('lang'), 'sv');
assert.equal(url.searchParams.get('support_need'), 'social_care');
assert.deepEqual([...url.searchParams.keys()].sort(), ['focus', 'lang', 'support_need']);
assert.equal(href.includes('mamma'), false);
assert.equal(href.includes('diagnos'), false);
assert.equal(href.includes('kommun'), false);

const unknownHref = guidance.handoffHref('ar', 'unsure');
const unknownUrl = new URL(unknownHref, 'https://example.test/');
assert.equal(unknownUrl.searchParams.get('lang'), 'ar');
assert.equal(unknownUrl.searchParams.has('support_need'), false);

assert.match(guidance.SOCIALSTYRELSEN_URL, /^https:\/\/www\.socialstyrelsen\.se\//);
assert.match(guidance.CARE_1177_URL, /^https:\/\/www\.1177\.se\//);
assert.match(guidance.SOL_URL, /^https:\/\/www\.riksdagen\.se\//);

console.log('older home support guidance tests: OK');
