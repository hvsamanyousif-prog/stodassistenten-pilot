const assert = require('node:assert/strict');
const guidance = require('./disability-home-support-guidance.js');

assert.equal(guidance.detect('Jag är 34 och har en funktionsnedsättning och behöver hemtjänst hemma'), true);
assert.equal(guidance.detect('Jag har autism och behöver stöd hemma för att få struktur i vardagen'), true);
assert.equal(guidance.detect('Jag har en funktionsnedsättning och undrar om trygghetslarm hemma'), true);
assert.equal(guidance.detect('Jag behöver boendestöd och vet inte vart jag ska vända mig'), true);
assert.equal(guidance.detect('Jag behöver personlig assistans och vet inte om jag ska fråga kommunen eller Försäkringskassan'), true);
assert.equal(guidance.detect('لدي إعاقة وأحتاج مساعدة في المنزل'), true);
assert.equal(guidance.detect('معلولیت دارم و در خانه به کمک نیاز دارم'), true);
assert.equal(guidance.detect('أحتاج مساعدة شخصية بسبب إعاقتي'), true);
assert.equal(guidance.detect('به کمک شخصی به دلیل معلولیت نیاز دارم'), true);

// Do not steal older-person, generic healthcare/home-help, professional or research stories.
assert.equal(guidance.detect('Jag är 82 och behöver hemtjänst för att bo kvar hemma'), false);
assert.equal(guidance.detect('Min äldre mamma behöver hemtjänst och trygghetslarm'), false);
assert.equal(guidance.detect('Jag behöver hemsjukvård hemma efter en operation'), false);
assert.equal(guidance.detect('Jag behöver hemtjänst hemma och vet inte vart jag ska vända mig'), false);
assert.equal(guidance.detect('Jag jobbar med personlig assistans och vill förstå yrket bättre'), false);
assert.equal(guidance.detect('Jag skriver uppsats om personlig assistans och vill ha statistik'), false);

assert.equal(guidance.detectNeed('Jag behöver personlig assistans med hygien, måltider och kläder'), 'personal_assistance');
assert.equal(guidance.detectNeed('Jag behöver assistansersättning och vet inte vilken myndighet jag ska fråga'), 'personal_assistance');
assert.equal(guidance.detectNeed('Jag behöver hjälp med rutiner, planering och struktur i vardagen'), 'structure');
assert.equal(guidance.detectNeed('Jag behöver hemtjänst med städning, mat och dusch'), 'personal_care');
assert.equal(guidance.detectNeed('Jag vill känna mig trygg hemma och behöver trygghetslarm'), 'safety');
assert.equal(guidance.detectNeed('Jag behöver sjuksköterska hemma för omläggning'), 'healthcare');
assert.equal(guidance.detectNeed('Jag behöver boendestöd men också sjuksköterska hemma'), 'multiple');

const href = guidance.handoffHref('sv', 'personal_assistance');
assert.match(href, /^person-pilot\.html\?/);
assert.match(href, /focus=disability_home_support/);
assert.match(href, /support_need=personal_assistance/);
for (const forbidden of ['q=', 'story=', 'diagnosis=', 'address=', 'municipality=', 'personnummer=', 'hours=', 'assessed_hours=']) assert.equal(href.includes(forbidden), false);

assert.match(guidance.SOCIALSTYRELSEN_URL, /^https:\/\/www\.socialstyrelsen\.se\//);
assert.match(guidance.FUNCTION_URL, /^https:\/\/www\.socialstyrelsen\.se\//);
assert.match(guidance.CARE_1177_URL, /^https:\/\/www\.1177\.se\//);
assert.match(guidance.ASSISTANCE_URL, /^https:\/\/www\.forsakringskassan\.se\//);
console.log('disability home support + personal assistance guidance tests: OK');
