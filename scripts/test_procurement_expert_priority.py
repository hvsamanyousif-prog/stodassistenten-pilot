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
const rows=p.splitRequirements([
  'Se bilaga 7.',
  'Leverantören ska lämna intyg, men kravet gäller inte om beställaren godkänner likvärdigt bevis.',
  'Oklar formulering om genomförande.',
  'CV ska bifogas.',
  'Försäkringsbevis ska bifogas.'
].join('\n'));
rows[3].evidence='missing';
rows[4].evidence='missing';
const priority=p.prioritizeReviewRows(rows);
assert.deepEqual(priority.map(r=>r.sourceLine),[4,5,1,2,3]);
assert.ok(priority.slice(0,2).every(r=>r.evidence==='missing'));
assert.deepEqual(priority.slice(2).map(r=>r.sourceLine),[1,2,3]);
console.log('PASS missing evidence is surfaced before lower-severity overview risks');
'''
    subprocess.run(['node', '-e', node_test], cwd=ROOT, check=True)
    print('procurement priority regression: OK')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
