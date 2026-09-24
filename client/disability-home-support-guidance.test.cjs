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

// Problem-first harm-prevention must reach the same governed route only when
// paired with disability/psychological-function context. The user must not
// need to know the support name.
const harmPreventionSv = 'På grund av min psykiska funktionsnedsättning behöver jag hjälp för att inte skada mig själv eller andra. Jag vet inte vad stödet heter.';
const harmPreventionAr = 'بسبب إعاقتي النفسية أحتاج إلى مساعدة حتى لا أؤذي نفسي أو الآخرين. لا أعرف اسم الدعم.';
const harmPreventionFa = 'به دلیل معلولیت روانی‌ام به کمک نیاز دارم تا به خودم یا دیگران آسیب نزنم. اسم این حمایت را نمی‌دانم.';
for (const text of [harmPreventionSv, harmPreventionAr, harmPreventionFa]) {
  assert.equal(guidance.detect(text), true);
  assert.equal(guidance.detectNeed(text), 'personal_assistance');
}

// Explicit denial of the harm-risk fact must not become positive evidence for
// the harm-prevention basic-need family. A separately stated concrete need for
// daily structure must remain route-authoritative in the same product.
const deniedHarmWithStructure = [
  'Jag har psykisk funktionsnedsättning men det finns ingen risk för fysisk skada. Jag behöver bara hjälp att planera vardagen.',
  'لدي إعاقة نفسية لكن لا يوجد خطر ضرر جسدي. أحتاج فقط إلى مساعدة في تنظيم حياتي اليومية.',
  'معلولیت روانی دارم اما هیچ خطری برای آسیب به خودم وجود ندارد. فقط برای برنامه‌ریزی زندگی روزمره به کمک نیاز دارم.',
];
for (const text of deniedHarmWithStructure) {
  assert.equal(guidance.detect(text), true);
  assert.equal(guidance.detectNeed(text), 'structure');
}

// Denying the need for harm-prevention support must also stay negative even
// when the source-restricted phrase itself is present. A separate structure
// need remains the bounded positive route.
const deniedHarmSupportWithStructure = [
  'Jag har psykisk funktionsnedsättning. Jag behöver inte stöd för att förebygga fysisk skada; jag behöver bara hjälp att planera vardagen.',
  'لدي إعاقة نفسية. لا أحتاج إلى دعم لمنع ضرر جسدي؛ أحتاج فقط إلى مساعدة في تنظيم حياتي اليومية.',
  'معلولیت روانی دارم. برای پیشگیری از آسیب به خودم کمک نمی‌خواهم؛ فقط برای برنامه‌ریزی زندگی روزمره به کمک نیاز دارم.',
];
for (const text of deniedHarmSupportWithStructure) {
  assert.equal(guidance.detect(text), true);
  assert.equal(guidance.detectNeed(text), 'structure');
}

// Generic fear/safety wording without disability context must not be promoted
// into a statutory-assistance route.
assert.equal(guidance.detect('Jag är rädd att jag kan skada mig själv eller andra och behöver hjälp.'), false);
assert.equal(guidance.detect('أخاف أن أؤذي نفسي أو الآخرين وأحتاج إلى مساعدة.'), false);
assert.equal(guidance.detect('می‌ترسم به خودم یا دیگران آسیب بزنم و کمک می‌خواهم.'), false);

// Do not steal older-person, generic healthcare/home-help, professional or research stories.
assert.equal(guidance.detect('Jag är 82 och behöver hemtjänst för att bo kvar hemma'), false);
assert.equal(guidance.detect('Min äldre mamma behöver hemtjänst och trygghetslarm'), false);
assert.equal(guidance.detect('Jag behöver hemsjukvård hemma efter en operation'), false);
assert.equal(guidance.detect('Jag behöver hemtjänst hemma och vet inte vart jag ska vända mig'), false);
assert.equal(guidance.detect('Jag jobbar med personlig assistans och vill förstå yrket bättre'), false);
assert.equal(guidance.detect('Jag arbetar med assistansersättning på en myndighet'), false);
assert.equal(guidance.detect('Jag skriver uppsats om personlig assistans och vill ha statistik'), false);

assert.equal(guidance.detectNeed('Jag behöver personlig assistans med hygien, måltider och kläder'), 'personal_assistance');
assert.equal(guidance.detectNeed('Jag behöver assistansersättning och vet inte vilken myndighet jag ska fråga'), 'personal_assistance');
assert.equal(guidance.detectNeed('Jag behöver personlig assistans och sjuksköterska hemma för omläggning'), 'assistance_healthcare');
assert.equal(guidance.detectNeed('Jag behöver hjälp med rutiner, planering och struktur i vardagen'), 'structure');
assert.equal(guidance.detectNeed('Jag behöver hemtjänst med städning, mat och dusch'), 'personal_care');
assert.equal(guidance.detectNeed('Jag vill känna mig trygg hemma och behöver trygghetslarm'), 'safety');
assert.equal(guidance.detectNeed('Jag behöver sjuksköterska hemma för omläggning'), 'healthcare');
assert.equal(guidance.detectNeed('Jag behöver boendestöd men också sjuksköterska hemma'), 'multiple');

const href = guidance.handoffHref('sv', 'personal_assistance');
assert.match(href, /^person-pilot\.html\?/);
assert.match(href, /focus=disability_home_support/);
assert.match(href, /support_need=personal_assistance/);
const combinedHref = guidance.handoffHref('sv', 'assistance_healthcare');
assert.match(combinedHref, /support_need=assistance_healthcare/);
for (const candidate of [href, combinedHref]) {
  for (const forbidden of ['q=', 'story=', 'situation=', 'diagnosis=', 'address=', 'municipality=', 'personnummer=', 'hours=', 'assessed_hours=']) assert.equal(candidate.includes(forbidden), false);
}

assert.match(guidance.SOCIALSTYRELSEN_URL, /^https:\/\/www\.socialstyrelsen\.se\//);
assert.match(guidance.FUNCTION_URL, /^https:\/\/www\.socialstyrelsen\.se\//);
assert.match(guidance.CARE_1177_URL, /^https:\/\/www\.1177\.se\//);
assert.match(guidance.ASSISTANCE_URL, /^https:\/\/www\.forsakringskassan\.se\//);
console.log('disability home support + personal assistance guidance tests: OK');
