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

const crossLinePunctuationRelation=p.splitRequirements('Leverantören ska ha ansvarsförsäkring;\nför det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.');
assert.equal(crossLinePunctuationRelation.length,2,'physical source lines separated after relation punctuation must remain traceable as two rows');
assert.deepEqual(crossLinePunctuationRelation.map(r=>r.sourceLine),[1,2],'punctuation cross-line relation must preserve both physical source lines');
assert.ok(crossLinePunctuationRelation.every(r=>r.flags.some(f=>f.code==='cross_line_relation')),'same semantic relation must stay visible when extraction moves the relation-leading clause to the next physical line after punctuation');
crossLinePunctuationRelation.forEach(r=>{r.evidence='yes';});
assert.equal(p.summarize(crossLinePunctuationRelation).uncertain.length,2,'manual evidence marks must not hide punctuation cross-line relation uncertainty');

const pairedFormalCrossLine=[
  ['I de fall','I de fall underleverantör används ska underleverantören ha ansvarsförsäkring.'],
  ['Förutsatt att','Förutsatt att underleverantör används ska underleverantören ha ansvarsförsäkring.'],
  ['För det fall att','För det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.'],
  ['För det fall','För det fall underleverantör används ska underleverantören ha ansvarsförsäkring.'],
  ['Under förutsättning att','Under förutsättning att underleverantör används ska underleverantören ha ansvarsförsäkring.']
];
for(const [label,rightText] of pairedFormalCrossLine){
  const rows=p.splitRequirements(`Leverantören ska ha ansvarsförsäkring;\n${rightText}`);
  assert.equal(rows.length,2,`${label}: paired formal cross-line relation must preserve two source rows`);
  assert.deepEqual(rows.map(r=>r.sourceLine),[1,2],`${label}: paired formal relation must preserve source positions`);
  assert.ok(rows.every(r=>r.flags.some(f=>f.code==='cross_line_relation')),`${label}: materially linked formal condition must retain two-sided relation warning`);
  rows.forEach(r=>{r.evidence='yes';});
  assert.equal(p.summarize(rows).uncertain.length,2,`${label}: evidence=yes must not hide a materially linked formal relation`);
}

const independentPunctuation=p.splitRequirements('Leverantören ska ha ansvarsförsäkring; leverantören ska ha ISO 9001-certifikat.');
assert.equal(independentPunctuation.length,2,'independent explicit punctuation boundary must remain safely segmented');

const independentConditionalCrossLine=p.splitRequirements('Leverantören ska ha ansvarsförsäkring;\nOm anbudet lämnas elektroniskt ska filformatet vara PDF.');
assert.equal(independentConditionalCrossLine.length,2,'independent semicolon/newline requirements must remain two source-traceable rows');
assert.deepEqual(independentConditionalCrossLine.map(r=>r.sourceLine),[1,2],'independent conditional cross-line case must preserve physical source positions');
assert.ok(independentConditionalCrossLine.every(r=>!r.flags.some(f=>f.code==='cross_line_relation')),'semicolon plus a separately applicable conditional next row must not create false two-sided dependency');
independentConditionalCrossLine[0].evidence='yes';
assert.ok(!p.prioritizeReviewRows(independentConditionalCrossLine).some(r=>r.id===independentConditionalCrossLine[0].id),'reviewed independent left row must be able to leave priority review');
assert.ok(independentConditionalCrossLine[1].flags.some(f=>f.code==='conditional_or_exception'),'right conditional row must retain its own source-risk warning');

const independentExclusiveConditionalCrossLine=p.splitRequirements('Leverantören ska ha ansvarsförsäkring;\nEndast om anbudet lämnas elektroniskt ska filformatet vara PDF.');
assert.equal(independentExclusiveConditionalCrossLine.length,2,'independent exclusive conditional cross-line requirements must remain two source-traceable rows');
assert.deepEqual(independentExclusiveConditionalCrossLine.map(r=>r.sourceLine),[1,2],'independent exclusive conditional cross-line case must preserve physical source positions');
assert.ok(independentExclusiveConditionalCrossLine.every(r=>!r.flags.some(f=>f.code==='cross_line_relation')),'semicolon plus standalone Endast om next row must not create false two-sided dependency');
independentExclusiveConditionalCrossLine[0].evidence='yes';
assert.ok(!p.prioritizeReviewRows(independentExclusiveConditionalCrossLine).some(r=>r.id===independentExclusiveConditionalCrossLine[0].id),'reviewed independent left row must leave priority review when only the right row has an Endast om condition');
assert.ok(independentExclusiveConditionalCrossLine[1].flags.some(f=>f.code==='conditional_or_exception'),'right Endast om row must retain its own source-risk warning');

const independentUsageConditionalCrossLine=p.splitRequirements('Leverantören ska ha ansvarsförsäkring;\nNär e-faktura används ska fakturan följa Peppol BIS.');
assert.equal(independentUsageConditionalCrossLine.length,2,'standalone usage-conditional cross-line requirements must remain two source-traceable rows');
assert.deepEqual(independentUsageConditionalCrossLine.map(r=>r.sourceLine),[1,2],'standalone usage-conditional cross-line case must preserve physical source positions');
assert.ok(independentUsageConditionalCrossLine.every(r=>!r.flags.some(f=>f.code==='cross_line_relation')),'semicolon plus standalone När ... används next row must not create false two-sided dependency');
independentUsageConditionalCrossLine[0].evidence='yes';
assert.ok(!p.prioritizeReviewRows(independentUsageConditionalCrossLine).some(r=>r.id===independentUsageConditionalCrossLine[0].id),'reviewed independent left row must leave priority review when only the right row has its own usage condition');
assert.ok(independentUsageConditionalCrossLine[1].flags.some(f=>f.code==='conditional_or_exception'),'right standalone usage-conditional row must retain its own source-risk warning');

const standaloneFormalCrossLine=[
  ['I de fall','I de fall e-faktura används ska fakturan följa Peppol BIS.'],
  ['Förutsatt att','Förutsatt att anbudet lämnas elektroniskt ska filformatet vara PDF.'],
  ['För det fall att','För det fall att e-faktura används ska fakturan följa Peppol BIS.'],
  ['För det fall','För det fall e-faktura används ska fakturan följa Peppol BIS.'],
  ['Under förutsättning att','Under förutsättning att anbudet lämnas elektroniskt ska filformatet vara PDF.']
];
for(const [label,rightText] of standaloneFormalCrossLine){
  const rows=p.splitRequirements(`Leverantören ska ha ansvarsförsäkring;\n${rightText}`);
  assert.equal(rows.length,2,`${label}: standalone formal condition must remain two source-traceable rows`);
  assert.deepEqual(rows.map(r=>r.sourceLine),[1,2],`${label}: standalone formal condition must preserve physical source positions`);
  assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='cross_line_relation')),`${label}: unrelated standalone formal condition must not create false two-sided dependency`);
  rows[0].evidence='yes';
  assert.ok(!p.prioritizeReviewRows(rows).some(r=>r.id===rows[0].id),`${label}: reviewed independent left row must leave priority review`);
  assert.ok(rows[1].flags.some(f=>f.code==='conditional_or_exception'),`${label}: right formal conditional row must retain its own source-risk warning`);
}

console.log(`Relation-group contracts: ${relationBoundCases.length} same-line relation fixtures + ${pairedFormalCrossLine.length+2} cross-line relation fixtures + ${standaloneFormalCrossLine.length+4} negative controls passed`);
'''


def main() -> int:
    subprocess.run(['node','-e',NODE_TEST], cwd=ROOT, check=True)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
