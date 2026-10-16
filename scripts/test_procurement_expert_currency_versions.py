#!/usr/bin/env python3
"""Focused commercial-currency version contracts.

Rule/parser evidence only. This does not prove legal interpretation, live source truth,
physical-device behavior, endpoint acceptance or storage.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NODE_TEST = r'''
const assert = require('node:assert/strict');
const p = require('./client/procurement-expert-pilot.js');

function hasConflict(row){
  return (row.flags || []).some(flag => flag.code === 'commercial_version_conflict');
}

const changedEur = p.splitRequirements([
  'Version 1: Fast pris 100 000 EUR ska gälla.',
  'Version 2 ersätter version 1: Fast pris 120 000 EUR ska gälla.'
].join('\n'));
assert.deepEqual(changedEur.map(r => r.category), ['commercial','commercial']);
assert.ok(changedEur.every(hasConflict), 'Changed EUR amount in same commercial scope must fail closed');
assert.ok(p.prioritizeReviewRows(changedEur).every(hasConflict), 'Changed EUR version risk must remain prioritized');

const unchangedEur = p.splitRequirements([
  'Version 1: Fast pris 100 000 EUR ska gälla.',
  'Version 2 ersätter version 1: Fast pris 100 000 EUR ska gälla.'
].join('\n'));
assert.ok(unchangedEur.every(r => !hasConflict(r)), 'Unchanged EUR value must not fabricate a version conflict');

const changedUsdPrefix = p.splitRequirements([
  'Version 1: Fast pris USD 100 000 ska gälla.',
  'Version 2 ersätter version 1: Fast pris USD 120 000 ska gälla.'
].join('\n'));
assert.ok(changedUsdPrefix.every(hasConflict), 'Changed explicitly currency-marked USD amount must fail closed');

const equivalentEurMarker = p.splitRequirements([
  'Version 1: Fast pris 100 000 EUR ska gälla.',
  'Version 2 ersätter version 1: Fast pris 100 000 euro ska gälla.'
].join('\n'));
assert.ok(equivalentEurMarker.every(r => !hasConflict(r)), 'Equivalent explicit EUR/euro markers must canonicalize without false conflict');

const nakedNumbers = p.splitRequirements([
  'Version 1: Fast pris ska beskrivas i 100 delar.',
  'Version 2 ersätter version 1: Fast pris ska beskrivas i 120 delar.'
].join('\n'));
assert.ok(nakedNumbers.every(r => !hasConflict(r)), 'Naked numbers must not be promoted to monetary values');

const separateLots = p.splitRequirements([
  'Version 1: Delområde A – Fast pris 100 000 EUR ska gälla.',
  'Version 2: Delområde B – Fast pris 120 000 EUR ska gälla.'
].join('\n'));
assert.ok(separateLots.every(r => !hasConflict(r)), 'Different named lots must not fabricate a commercial version conflict');

console.log('Commercial currency version contracts: 6/6 PASS');
'''


def main() -> int:
    subprocess.run(['node', '-e', NODE_TEST], cwd=ROOT, check=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
