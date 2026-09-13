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
  `${scriptMatch[1]}\nglobalThis.__pilot={state,steps,STEP,readiness,procurementBlock,fundingBlock,companyActionPlan,result,nextStepAfter,backTarget,progressText,render};`,
  context,
  { filename: 'company-pilot.html' },
);

const pilot = context.__pilot;
if (!pilot) throw new Error('Could not expose company pilot runtime');

const defaults = {
  step: pilot.STEP.RESULT,
  goal: null,
  sector: null,
  geography: null,
  capacity: null,
  references: null,
  docs: null,
};

function sameArray(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

let failed = 0;
for (const testCase of suite.cases) {
  Object.assign(pilot.state, defaults, testCase.input, { step: pilot.STEP.RESULT });
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

const ui = suite.ui_contract || {};
const uiErrors = [];
if (pilot.steps.includes('description')) uiErrors.push('free-text description step still exists in interactive company flow');
if (ui.free_text_description_required === false && html.includes('Beskriv företaget med egna ord')) uiErrors.push('free-text description prompt still shipped');

Object.assign(pilot.state, defaults, { goal: 'funding', step: pilot.STEP.SECTOR });
if (pilot.nextStepAfter('sector') !== pilot.STEP.RESULT) uiErrors.push('funding flow does not go directly from sector to result');
if (pilot.backTarget() !== pilot.STEP.GOAL) uiErrors.push('sector back target should return to goal');
pilot.state.step = pilot.STEP.RESULT;
if (pilot.backTarget() !== pilot.STEP.SECTOR) uiErrors.push('funding result back target should return to sector');
const fundingOutput = String(pilot.result());
for (const marker of ui.funding_must_exclude || []) {
  if (fundingOutput.includes(marker)) uiErrors.push(`funding flow leaks procurement-readiness marker: ${marker}`);
}

Object.assign(pilot.state, defaults, { goal: 'procurement', step: pilot.STEP.DOCS });
if (pilot.nextStepAfter('docs') !== pilot.STEP.RESULT) uiErrors.push('procurement flow does not go directly from docs to result');
pilot.state.step = pilot.STEP.RESULT;
if (pilot.backTarget() !== pilot.STEP.DOCS) uiErrors.push('procurement result back target should return to docs');

if (ui.funding_question_steps !== 2) uiErrors.push('eval contract must pin funding path to two high-value questions');
if (ui.procurement_question_steps !== 6) uiErrors.push('eval contract must pin procurement path to six questions');

if (uiErrors.length) {
  failed += 1;
  console.error('FAIL company-information-gain-ui');
  for (const error of uiErrors) console.error(`  - ${error}`);
} else {
  console.log('PASS company-information-gain-ui');
}

if (failed) {
  console.error(`\n${failed} company pilot regression group(s) failed`);
  process.exit(1);
}

console.log(`\ncompany pilot scenario suite: ${suite.cases.length}/${suite.cases.length} cases PASS + information-gain UI PASS`);
