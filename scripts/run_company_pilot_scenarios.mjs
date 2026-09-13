#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('company-pilot.html', 'utf8');
const suite = JSON.parse(fs.readFileSync('data/evals/company_pilot_scenarios.json', 'utf8'));
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptMatch) throw new Error('No inline company pilot script found');

const mainEl = { innerHTML: '' };
const context = {
  console,
  document: { getElementById: () => mainEl },
  window: { scrollTo: () => {} },
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  `${scriptMatch[1]}\nglobalThis.__pilot={state,readiness,procurementBlock,fundingBlock,result,escapeHtml,render};`,
  context,
  { filename: 'company-pilot.html' },
);

const pilot = context.__pilot;
if (!pilot) throw new Error('Could not expose company pilot runtime');

const defaults = {
  step: 8,
  goal: null,
  sector: null,
  geography: null,
  capacity: null,
  references: null,
  docs: null,
  description: '',
};

function sameArray(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

let failed = 0;
for (const testCase of suite.cases) {
  Object.assign(pilot.state, defaults, testCase.input, { step: 8 });
  const gaps = Array.from(pilot.readiness());
  const output = String(pilot.result());
  const errors = [];

  if (!sameArray(gaps, testCase.expected_gaps || [])) {
    errors.push(`gaps mismatch: got ${JSON.stringify(gaps)}, expected ${JSON.stringify(testCase.expected_gaps || [])}`);
  }
  for (const marker of testCase.must_include || []) {
    if (!output.includes(marker)) errors.push(`missing output marker: ${marker}`);
  }
  for (const marker of testCase.must_exclude || []) {
    if (output.toLowerCase().includes(String(marker).toLowerCase())) errors.push(`forbidden output marker present: ${marker}`);
  }

  if (errors.length) {
    failed += 1;
    console.error(`FAIL ${testCase.id}`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log(`PASS ${testCase.id}`);
  }
}

if (failed) {
  console.error(`\n${failed}/${suite.cases.length} company pilot scenarios failed`);
  process.exit(1);
}

console.log(`\ncompany pilot scenario suite: ${suite.cases.length}/${suite.cases.length} PASS`);
