const assert=require('assert');
const g=require('./bereavement-guidance.js');

assert.equal(g.detect('Min man har dött och jag vet inte vad jag ska göra.'),true);
assert.equal(g.detectContext('Min man har dött och jag vet inte vad jag ska göra.'),'partner_support');
assert.equal(g.detect('Mitt barns pappa har avlidit. Finns barnpension?'),true);
assert.equal(g.detectContext('Mitt barns pappa har avlidit. Finns barnpension?'),'child_support');
assert.equal(g.detect('Min pappa har avlidit och jag behöver hjälp med bouppteckningen.'),true);
assert.equal(g.detectContext('Min pappa har avlidit och jag behöver hjälp med bouppteckningen.'),'practical');
assert.equal(g.detect('Min partner dog i en arbetsolycka. Vad ska jag kontrollera?'),true);
assert.equal(g.detectContext('Min partner dog i en arbetsolycka. Vad ska jag kontrollera?'),'work_related');
assert.equal(g.detect('Min pappa har dött.'),true);
assert.equal(g.detectContext('Min pappa har dött.'),'unsure');
assert.equal(g.detect('Jag jobbar på begravningsbyrå och skriver utbildningsmaterial om dödsfall.'),false);
assert.equal(g.detect('توفي زوجي ولا أعرف ما الدعم الذي يجب أن أتحقق منه.'),true);
assert.equal(g.detectContext('توفي زوجي ولا أعرف ما الدعم الذي يجب أن أتحقق منه.'),'partner_support');
assert.equal(g.detect('پدر فرزندم فوت کرده است. درباره حمایت کودک سؤال دارم.'),true);
assert.equal(g.detectContext('پدر فرزندم فوت کرده است. درباره حمایت کودک سؤال دارم.'),'child_support');

const href=g.handoffHref('sv','partner_support');
assert.match(href,/actor_type=relative/);
assert.match(href,/focus=bereavement/);
assert.match(href,/bereavement_context=partner_support/);
assert.match(g.handoffHref('sv','overview'),/bereavement_context=overview/);
for(const forbidden of ['name=','personnummer=','cause=','assets=','debts=','will=','certificate=','raw_story=','q='])assert.ok(!href.includes(forbidden));
for(const url of [g.AFTER_GUIDE_URL,g.PM_SURVIVOR_URL,g.PM_WORK_URL,g.SKV_DEATH_URL])assert.match(url,/^https:\/\//);
console.log('bereavement-guidance v74: OK');
