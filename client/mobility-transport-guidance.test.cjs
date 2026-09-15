const assert=require('assert');
const g=require('./mobility-transport-guidance.js');

assert.equal(g.detect('Jag ser dåligt och kan inte åka buss till vårdcentralen.'),true);
assert.equal(g.detectTripPurpose('Jag ser dåligt och kan inte åka buss till vårdcentralen.'),'healthcare');
assert.equal(g.detect('Jag har en funktionsnedsättning och kan inte åka kollektivtrafik till jobbet.'),true);
assert.equal(g.detectTripPurpose('Jag har en funktionsnedsättning och kan inte åka kollektivtrafik till jobbet.'),'daily');
assert.equal(g.detect('Jag behöver riksfärdtjänst för att besöka familj i en annan stad.'),true);
assert.equal(g.detectTripPurpose('Jag behöver riksfärdtjänst för att besöka familj i en annan stad.'),'long_private');
assert.equal(g.detectTripPurpose('Jag behöver färdtjänst men vet inte för vilken resa ännu.'),'unsure');
assert.equal(g.detect('Jag jobbar med färdtjänstbokning och behöver hjälp i arbetet.'),false);
assert.equal(g.detect('أعاني من إعاقة ولا أستطيع استخدام الحافلة إلى المستشفى.'),true);
assert.equal(g.detectTripPurpose('أعاني من إعاقة ولا أستطيع استخدام الحافلة إلى المستشفى.'),'healthcare');
assert.equal(g.detect('معلولیت دارم و نمی‌توانم با اتوبوس برای خرید بروم.'),true);
assert.equal(g.detectTripPurpose('معلولیت دارم و نمی‌توانم با اتوبوس برای خرید بروم.'),'daily');

const h=g.handoffHref('sv','healthcare');
assert.match(h,/focus=mobility_transport/);
assert.match(h,/trip_purpose=healthcare/);
for(const forbidden of ['diagnosis=','address=','destination=','appointment=','travel_date=','raw_story=','personnummer='])assert.ok(!h.includes(forbidden));
for(const url of [g.GUIDE_1177_URL,g.FARDTJanst_LAW_URL,g.RIKSFARDTJanst_LAW_URL,g.SICK_TRAVEL_LAW_URL])assert.match(url,/^https:\/\//);
console.log('mobility-transport-guidance v65: OK');
