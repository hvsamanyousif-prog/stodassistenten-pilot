#!/usr/bin/env python3
"""Regression for calm-overview severity ordering; not legal or live E2E validation."""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    node_test = r'''
const assert=require('node:assert/strict');
const p=require('./client/procurement-expert-pilot.js');

const riskRows=p.splitRequirements([
  'Se bilaga 7.',
  'Leverantören ska lämna intyg, men kravet gäller inte om beställaren godkänner likvärdigt bevis.',
  'Oklar formulering om genomförande.',
  'CV ska bifogas.',
  'Försäkringsbevis ska bifogas.'
].join('\n'));
riskRows[3].evidence='missing';
riskRows[4].evidence='missing';
const riskPriority=p.prioritizeReviewRows(riskRows);
assert.deepEqual(riskPriority.map(r=>r.sourceLine),[4,5,1,2,3]);
assert.ok(riskPriority.slice(0,2).every(r=>r.evidence==='missing'));
assert.deepEqual(riskPriority.slice(2).map(r=>r.sourceLine),[1,2,3]);
console.log('PASS missing evidence is surfaced before lower-severity overview risks');

const ordinaryRows=p.splitRequirements([
  'Leverantören ska ha ansvarsförsäkring.',
  'Arbetsledaren ska ha minst fem års erfarenhet.',
  'Anbudspris ska anges i SEK.'
].join('\n'));
let ordinaryPriority=p.prioritizeReviewRows(ordinaryRows);
assert.equal(ordinaryPriority[0].sourceLine,1);
ordinaryRows[0].evidence='yes';
ordinaryPriority=p.prioritizeReviewRows(ordinaryRows);
assert.equal(ordinaryPriority[0].sourceLine,2);
ordinaryRows[2].evidence='missing';
ordinaryPriority=p.prioritizeReviewRows(ordinaryRows);
assert.equal(ordinaryPriority[0].sourceLine,3);
assert.deepEqual(ordinaryPriority.map(r=>r.sourceLine),[3,2]);
ordinaryRows[1].evidence='na';
ordinaryRows[2].evidence='yes';
ordinaryPriority=p.prioritizeReviewRows(ordinaryRows);
assert.equal(ordinaryPriority[0].sourceLine,2);
console.log('PASS calm overview always exposes the next unresolved row without outranking known missing evidence');

const versionRows=p.splitRequirements([
  'Version 1: Fast pris ska anges i bilaga 6.',
  'Version 2 ersätter version 1: Timpris ska anges i bilaga 9.'
].join('\n'));
assert.ok(versionRows.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
versionRows.forEach(r=>{r.evidence='yes';});
assert.equal(p.summarize(versionRows).uncertain.length,2);
const versionPriority=p.prioritizeReviewRows(versionRows);
assert.deepEqual(versionPriority.map(r=>r.sourceLine),[1,2]);
assert.ok(versionPriority.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
console.log('PASS unresolved version/source risk remains prioritized after manual evidence marking');

const attachmentRows=p.splitRequirements('Leverantören ska uppfylla samtliga tekniska krav enligt bilaga 7.');
attachmentRows[0].evidence='yes';
assert.equal(p.summarize(attachmentRows).uncertain.length,1);
const attachmentPriority=p.prioritizeReviewRows(attachmentRows);
assert.equal(attachmentPriority.length,1);
assert.ok(attachmentPriority[0].flags.some(f=>f.code==='attachment_reference'));
console.log('PASS unresolved attachment risk remains prioritized after manual evidence marking');
'''
    subprocess.run(['node', '-e', node_test], cwd=ROOT, check=True)
    print('procurement priority regression: OK')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
