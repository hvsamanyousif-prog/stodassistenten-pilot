const test=require('node:test');
const assert=require('node:assert/strict');
const ctx=require('./family-support-context.js');

test('care wording routes to omvardnadsbidrag without claiming eligibility',()=>{
  assert.equal(ctx.detectNeed('Mitt barn behöver mycket mer hjälp och tillsyn hemma än andra barn.'),'care');
  const rows=ctx.rowsForNeed('sv','care');
  assert.equal(rows.length,1);
  assert.match(rows[0][0],/Omvårdnadsbidrag/);
  assert.equal(rows[0][2],ctx.OMV_URL);
  assert.match(rows[0][1],/Diagnosen i sig avgör inte/);
});

test('extra costs wording routes to child merkostnadsersattning only',()=>{
  assert.equal(ctx.detectNeed('Mitt barn har en funktionsnedsättning och vi har många extra kostnader.'),'cost');
  const rows=ctx.rowsForNeed('sv','cost');
  assert.equal(rows.length,1);
  assert.match(rows[0][0],/Merkostnadsersättning/);
  assert.equal(rows[0][2],ctx.MERK_URL);
  assert.match(rows[0][1],/Alla utgifter.*inte automatiskt/);
});

test('combined care and costs keeps both verified source paths',()=>{
  assert.equal(ctx.detectNeed('Mitt barn behöver extra tillsyn och vi har extra kostnader.'),'both');
  const rows=ctx.rowsForNeed('sv','both');
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(r=>r[2]),[ctx.OMV_URL,ctx.MERK_URL]);
});

test('legacy vardbidrag and diagnosis-only wording ask for the missing route-changing fact',()=>{
  assert.equal(ctx.detectNeed('Kan jag få vårdbidrag för mitt barn?'),'unsure');
  assert.equal(ctx.detectNeed('Mitt barn har autism. Vilket bidrag kan vi söka?'),'unsure');
});

test('professional text does not become a personal family route',()=>{
  const text='Jag jobbar med barn med funktionsnedsättning och skriver rapport om omvårdnadsbidrag.';
  assert.equal(ctx.isProfessional(text),true);
  assert.equal(ctx.detectNeed(text),null);
});

test('Arabic and Persian preserve care/cost distinction',()=>{
  assert.equal(ctx.detectNeed('طفلي يحتاج رعاية إضافية ولدينا تكاليف إضافية'),'both');
  assert.equal(ctx.detectNeed('فرزندم به نظارت بیشتر نیاز دارد'),'care');
  assert.equal(ctx.detectNeed('برای فرزندم هزینه‌های اضافی داریم'),'cost');
  assert.equal(ctx.rowsForNeed('ar','both').length,2);
  assert.equal(ctx.rowsForNeed('fa','both').length,2);
});

test('coarse context contains no raw child identity or diagnosis',()=>{
  const story='Mitt barn Alma har autism, bor på Exempelgatan 1 och vi har extra kostnader.';
  const need=ctx.detectNeed(story);
  assert.equal(need,'cost');
  assert.doesNotMatch(need,/Alma|autism|Exempelgatan/i);
  assert.ok(ctx.NEEDS.includes(need));
});
