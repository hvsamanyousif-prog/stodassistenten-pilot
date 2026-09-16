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
'''
    subprocess.run(['node', '-e', node_test], cwd=ROOT, check=True)
    print('procurement priority regression: OK')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
