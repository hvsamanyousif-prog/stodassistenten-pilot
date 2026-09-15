const assert = require('assert');
const api = require('./family-housing-guidance.js');

const baseRows = [
  ['Primär väg', 'behåll första vägen', 'https://example.invalid/first'],
  ['Andra vägen', 'behåll andra vägen', 'https://example.invalid/second'],
  ['Ekonomiskt stöd vid pressad ekonomi', 'behåll ekonomiskt bistånd synligt', 'https://example.invalid/economy'],
  ['Lokala stiftelser', 'normal svans', 'https://example.invalid/foundation']
];

for (const language of ['sv', 'ar', 'fa']) {
  const rows = api.rewriteRows(baseRows, {
    general: true,
    language,
    work: 'part',
    money: 'tight',
    children: 'yes',
    housing: 'yes'
  });
  assert.strictEqual(rows.length, 4, `${language}: result ceiling must stay at four`);
  assert.strictEqual(rows[0][2], api.FAMILY_HOUSING_URL, `${language}: family housing candidate should be first when no higher-priority action exists`);
  assert(rows[0][0].length > 5 && rows[0][1].length > 20, `${language}: candidate needs useful localized copy`);
  assert(!/garanter|guarantee/i.test(rows[0].join(' ')), `${language}: copy must not guarantee eligibility or amount`);
}

const unemployed = api.rewriteRows(baseRows, {
  general: true,
  language: 'sv',
  work: 'unemployed',
  money: 'tight',
  children: 'yes',
  housing: 'yes'
});
assert.strictEqual(unemployed[0][0], baseRows[0][0], 'newly unemployed first action must stay first');
assert.strictEqual(unemployed[1][2], api.FAMILY_HOUSING_URL, 'family housing should be inserted after the first-day unemployment action');

const receivingAkassa = api.rewriteRows(baseRows, {
  general: true,
  language: 'sv',
  work: 'akassa',
  money: 'some',
  children: 'yes',
  housing: 'yes'
});
assert.strictEqual(receivingAkassa[0][0], baseRows[0][0], 'existing a-kassa regime boundary must stay first');
assert.strictEqual(receivingAkassa[1][2], api.FAMILY_HOUSING_URL, 'family housing should follow the regime boundary');

for (const [name, overrides] of Object.entries({
  noChildren: { children: 'no' },
  housingNotLarge: { housing: 'no' },
  economyOkay: { money: 'ok' },
  notGeneralFlow: { general: false }
})) {
  const rows = api.rewriteRows(baseRows, Object.assign({
    general: true,
    language: 'sv',
    work: 'part',
    money: 'tight',
    children: 'yes',
    housing: 'yes'
  }, overrides));
  assert.deepStrictEqual(rows, baseRows, `${name}: family housing must fail closed when the public situation facts do not support surfacing it`);
  assert.notStrictEqual(rows, baseRows, `${name}: rewriter must not mutate or return the caller array`);
}

const alreadyPresent = [[
  'Bostadsbidrag för barnfamiljer – värt att kontrollera',
  'redan synlig',
  api.FAMILY_HOUSING_URL
]].concat(baseRows);
const deduped = api.rewriteRows(alreadyPresent, {
  general: true,
  language: 'sv',
  work: 'part',
  money: 'tight',
  children: 'yes',
  housing: 'yes'
});
assert.strictEqual(deduped.filter(row => row[2] === api.FAMILY_HOUSING_URL).length, 1, 'candidate must never be duplicated');

const allCopy = JSON.stringify(api.COPY);
for (const forbidden of ['6 800', '6800', '7 900', '7900', '8 600', '8600', '40 000', '40000', '21 000', '21000']) {
  assert(!allCopy.includes(forbidden), `public copy must not hardcode volatile eligibility or amount detail: ${forbidden}`);
}

console.log('family housing public guidance v81: OK');
