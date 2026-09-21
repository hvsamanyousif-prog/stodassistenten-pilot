#!/usr/bin/env python3
"""Bounded regression for relation-leading semantic groups in procurement source rows."""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NODE_TEST = r'''
const assert=require('node:assert/strict');
const p=require('./client/procurement-expert-pilot.js');

const relationBoundCases=[
  'Leverantören ska ha ansvarsförsäkring och för det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring och för det fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring; för det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring. För det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
  '1) Leverantören ska ha ansvarsförsäkring 2) för det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
  '(1) Leverantören ska ha ansvarsförsäkring (2) för det fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring och i de fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring; i de fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
  '1) Leverantören ska ha ansvarsförsäkring 2) i de fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring och när underleverantör åberopas ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring; när underleverantör åberopas ska underleverantören ha ansvarsförsäkring.',
  '1) Leverantören ska ha ansvarsförsäkring 2) när underleverantör åberopas ska underleverantören ha ansvarsförsäkring.',
  'Leverantören ska ha ansvarsförsäkring och annars ska leverantören ha ISO 9001-certifikat.',
  'Leverantören ska ha ansvarsförsäkring; annars ska leverantören ha ISO 9001-certifikat.',
  '1) Leverantören ska ha ansvarsförsäkring 2) annars ska leverantören ha ISO 9001-certifikat.'
];

for(const [index,text] of relationBoundCases.entries()){
  const rows=p.splitRequirements(text);
  assert.equal(rows.length,1,`relation-group case ${index+1}: formal condition must stay relation-bound`);
  const row=rows[0];
  assert.equal(row.sourceLine,1,`relation-group case ${index+1}: original source line must remain traceable`);
  assert.ok(row.flags.some(f=>f.code==='conditional_or_exception'),`relation-group case ${index+1}: relation warning must remain visible`);
  assert.ok(row.flags.some(f=>f.code==='multi_requirement_line'),`relation-group case ${index+1}: one evidence control must not silently cover both material clauses`);
  row.evidence='yes';
  assert.ok(p.prioritizeReviewRows(rows).some(r=>r.id===row.id),`relation-group case ${index+1}: evidence=yes must not hide relation uncertainty`);
  assert.equal(p.summarize(rows).uncertain.length,1,`relation-group case ${index+1}: relation-bound row must remain uncertain`);
}

const benignTemporal=p.splitRequirements('Leverantören ska ha ansvarsförsäkring när avtalet börjar och leverantören ska ha ISO 9001-certifikat.');
assert.equal(benignTemporal.length,2,'ordinary temporal modifier must not disable safe repeated-modal segmentation');

const descriptiveWhenUsed=p.splitRequirements('Leverantören ska i säkerhetsbeskrivningen redovisa när systemet används i drift.');
assert.equal(descriptiveWhenUsed.length,1,'descriptive when-clause should remain one ordinary requirement row');
assert.ok(!descriptiveWhenUsed[0].flags.some(f=>f.code==='conditional_or_exception'),'descriptive when-clause must not be misclassified as a condition or exception');
descriptiveWhenUsed[0].evidence='yes';
assert.equal(p.summarize(descriptiveWhenUsed).uncertain.length,0,'reviewed ordinary descriptive when-clause must not remain permanently uncertain');

const crossLineRelation=p.splitRequirements('Leverantören ska ha ansvarsförsäkring och\nnär underleverantör åberopas ska underleverantören ha ansvarsförsäkring.');
assert.equal(crossLineRelation.length,2,'physical line boundary may remain two review rows when source tracing is preserved');
assert.deepEqual(crossLineRelation.map(r=>r.sourceLine),[1,2],'cross-line relation must preserve both physical source lines');
assert.ok(crossLineRelation.every(r=>r.flags.some(f=>f.code==='cross_line_relation')),'both source rows must visibly disclose that the physical line boundary is not semantic independence');
crossLineRelation.forEach(r=>{r.evidence='yes';});
assert.equal(p.summarize(crossLineRelation).uncertain.length,2,'manual evidence marks must not hide cross-line relation uncertainty');

const independentPunctuation=p.splitRequirements('Leverantören ska ha ansvarsförsäkring; leverantören ska ha ISO 9001-certifikat.');
assert.equal(independentPunctuation.length,2,'independent explicit punctuation boundary must remain safely segmented');

console.log(`Relation-group contracts: ${relationBoundCases.length} relation-bound fixtures + 4 negative/cross-line controls passed`);
'''


def main() -> int:
    subprocess.run(['node','-e',NODE_TEST], cwd=ROOT, check=True)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
