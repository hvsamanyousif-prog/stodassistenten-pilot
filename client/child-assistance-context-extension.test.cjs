const test=require('node:test');
const assert=require('node:assert/strict');
const mod=require('./child-assistance-context-extension.js');

test('Swedish child assistance story preserves child subject',()=>{
  assert.equal(mod.detectSupportFor('Mitt barn behöver personlig assistans hemma.'),'child');
  const href=mod.rewriteHandoffHref('person-pilot.html?focus=disability_home_support&lang=sv&support_need=personal_assistance','Mitt barn behöver personlig assistans hemma.','https://example.test/index.html');
  assert.match(href,/support_for=child/);
});

test('adult own assistance story stays adult',()=>{
  assert.equal(mod.detectSupportFor('Jag behöver personlig assistans hemma.'),'adult');
  const href=mod.rewriteHandoffHref('person-pilot.html?focus=disability_home_support&lang=sv&support_need=personal_assistance','Jag behöver personlig assistans hemma.','https://example.test/index.html');
  assert.match(href,/support_for=adult/);
});

test('child assistance plus healthcare keeps child subject on combined route',()=>{
  const href=mod.rewriteHandoffHref('person-pilot.html?focus=disability_home_support&lang=sv&support_need=assistance_healthcare','Mitt barn behöver personlig assistans och sjuksköterska hemma.','https://example.test/index.html');
  assert.match(href,/support_for=child/);
});

test('professional wording is not treated as a personal assistance need',()=>{
  const text='Jag jobbar med barn och personlig assistans i kommunen. Vilka regeländringar gäller?';
  assert.equal(mod.isProfessional(text),true);
  assert.equal(mod.detectSupportFor(text),null);
  assert.equal(mod.rewriteHandoffHref('person-pilot.html?focus=disability_home_support&lang=sv&support_need=personal_assistance',text,'https://example.test/index.html'),null);
});

test('legitimate worker story is not suppressed by professional guard',()=>{
  const text='Jag jobbar deltid och behöver personlig assistans hemma.';
  assert.equal(mod.isProfessional(text),false);
  assert.equal(mod.detectSupportFor(text),'adult');
});

test('Arabic and Persian child wording preserve child subject',()=>{
  assert.equal(mod.detectSupportFor('طفلي يحتاج إلى مساعدة شخصية في المنزل'),'child');
  assert.equal(mod.detectSupportFor('فرزندم در خانه به کمک شخصی نیاز دارد'),'child');
});

test('handoff serializes only coarse route state, never raw story',()=>{
  const story='Mitt barn Alma har autism och behöver personlig assistans hemma på Exempelgatan 1.';
  const href=mod.rewriteHandoffHref('person-pilot.html?focus=disability_home_support&lang=sv&support_need=personal_assistance',story,'https://example.test/index.html');
  assert.match(href,/support_for=child/);
  assert.doesNotMatch(href,/Alma|autism|Exempelgatan|story|situation/i);
});

test('adult and child primary sources remain distinct',()=>{
  assert.notEqual(mod.ADULT_URL,mod.CHILD_URL);
  assert.match(mod.ADULT_URL,/assistansersattning-for-vuxna$/);
  assert.match(mod.CHILD_URL,/assistansersattning-for-barn$/);
});
