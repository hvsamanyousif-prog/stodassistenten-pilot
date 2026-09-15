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

test('manual disability-home-support entry stays guarded even before a need is chosen',()=>{
  const win={location:{search:'?focus=disability_home_support&lang=sv'},document:{documentElement:{lang:'sv'}}};
  assert.deepEqual(mod.focusContext(win),{supportFor:null,lang:'sv'});
  assert.equal(mod.routeContext(win),null);
});

test('adult and child primary sources remain distinct',()=>{
  assert.notEqual(mod.ADULT_URL,mod.CHILD_URL);
  assert.match(mod.ADULT_URL,/assistansersattning-for-vuxna$/);
  assert.match(mod.CHILD_URL,/assistansersattning-for-barn$/);
});

test('v87 care wording routes to omvardnadsbidrag without deciding eligibility',()=>{
  assert.equal(mod.detectFamilyNeed('Mitt barn behöver mycket mer hjälp och tillsyn hemma än andra barn.'),'care');
  const rows=mod.familyRows('sv','care');
  assert.equal(rows.length,1);
  assert.match(rows[0][0],/Omvårdnadsbidrag/);
  assert.equal(rows[0][2],mod.OMV_URL);
  assert.match(rows[0][1],/Diagnosen i sig avgör inte/);
});

test('v87 extra costs wording routes to child merkostnadsersattning only',()=>{
  assert.equal(mod.detectFamilyNeed('Mitt barn har en funktionsnedsättning och vi har många extra kostnader.'),'cost');
  const rows=mod.familyRows('sv','cost');
  assert.equal(rows.length,1);
  assert.match(rows[0][0],/Merkostnadsersättning/);
  assert.equal(rows[0][2],mod.MERK_URL);
  assert.match(rows[0][1],/Alla utgifter.*inte automatiskt/);
});

test('v87 combined care and costs keeps both primary source paths',()=>{
  assert.equal(mod.detectFamilyNeed('Mitt barn behöver extra tillsyn och vi har extra kostnader.'),'both');
  assert.deepEqual(mod.familyRows('sv','both').map(r=>r[2]),[mod.OMV_URL,mod.MERK_URL]);
});

test('v87 legacy vardbidrag and diagnosis-only wording remain unsure until the route-changing fact is known',()=>{
  assert.equal(mod.detectFamilyNeed('Kan jag få vårdbidrag för mitt barn?'),'unsure');
  assert.equal(mod.detectFamilyNeed('Mitt barn har autism. Vilket bidrag kan vi söka?'),'unsure');
});

test('v87 professional/research wording does not become a personal family route',()=>{
  const text='Jag jobbar med barn med funktionsnedsättning och skriver rapport om omvårdnadsbidrag.';
  assert.equal(mod.isFamilyProfessional(text),true);
  assert.equal(mod.detectFamilyNeed(text),null);
});

test('v87 Arabic and Persian preserve the care/cost distinction',()=>{
  assert.equal(mod.detectFamilyNeed('طفلي يحتاج رعاية إضافية ولدينا تكاليف إضافية'),'both');
  assert.equal(mod.detectFamilyNeed('فرزندم به نظارت بیشتر نیاز دارد'),'care');
  assert.equal(mod.detectFamilyNeed('برای فرزندم هزینه‌های اضافی داریم'),'cost');
  assert.equal(mod.familyRows('ar','both').length,2);
  assert.equal(mod.familyRows('fa','both').length,2);
});

test('v87 family handoff carries only a coarse need and never raw child data',()=>{
  const story='Mitt barn Alma har autism, bor på Exempelgatan 1 och vi har extra kostnader.';
  const href=mod.rewriteFamilyHandoffHref('person-pilot.html?actor_type=relative&focus=family&lang=sv',story,'https://example.test/index.html');
  assert.match(href,/support_need=cost/);
  assert.doesNotMatch(href,/Alma|autism|Exempelgatan|story|situation/i);
});
