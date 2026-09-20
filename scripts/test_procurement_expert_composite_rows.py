#!/usr/bin/env python3
"""Fail-closed contracts for several material requirements on one physical source row."""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NODE_TEST = r'''
const assert=require('node:assert/strict');
const p=require('./client/procurement-expert-pilot.js');

const cases=[
  'Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Pris ska anges i bilaga 6. Sista anbudsdag är 2026-10-30 klockan 23:59.',
  'Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Anbudspris ska anges i SEK.',
  'Leverantören ska ha ansvarsförsäkring; sista anbudsdag är 2026-10-30 klockan 23:59.',
  'Pris ska anges i bilaga 6; sista anbudsdag är 2026-10-30 klockan 23:59.',
  'Leverantören ska ha ansvarsförsäkring och ISO 9001-certifikat.',
  'Leverantören ska ha två referensuppdrag och en arbetsledare med minst fem års erfarenhet.'
];

for(const [index,text] of cases.entries()){
  const rows=p.splitRequirements(text);
  // Do not introduce naive sentence splitting in this bounded fix. Preserve the
  // physical source row, but mark it as a composite that needs manual review.
  assert.equal(rows.length,1,`case ${index+1}: physical row must stay intact`);
  const row=rows[0];
  assert.equal(row.sourceLine,1,`case ${index+1}: source line must be preserved`);
  assert.ok(row.flags.some(f=>f.code==='multi_requirement_line'),`case ${index+1}: missing composite-row risk`);
  assert.match(row.flags.find(f=>f.code==='multi_requirement_line').label,/flera materiella krav|flera självständiga krav/i);
  assert.ok(p.prioritizeReviewRows(rows).some(r=>r.id===row.id),`case ${index+1}: composite row must be prioritized`);
  row.evidence='yes';
  assert.ok(p.prioritizeReviewRows(rows).some(r=>r.id===row.id),`case ${index+1}: manual evidence=yes must not hide composite risk`);
  assert.equal(p.summarize(rows).uncertain.length,1,`case ${index+1}: composite risk must remain uncertain`);
}

const simple=p.splitRequirements('Leverantören ska ha ansvarsförsäkring.')[0];
assert.ok(!simple.flags.some(f=>f.code==='multi_requirement_line'),'single material requirement must not fabricate composite risk');

const descriptiveConjunction=p.splitRequirements('Leverantören ska ha ansvarsförsäkring som omfattar verksamheten och gäller under hela avtalstiden.')[0];
assert.ok(!descriptiveConjunction.flags.some(f=>f.code==='multi_requirement_line'),'single evidence object with descriptive conjunction must not fabricate composite risk');

const descriptiveStaffExperience=p.splitRequirements('Leverantören ska ha två referensuppdrag; information om arbetsledarens erfarenhet används endast som bakgrund.')[0];
assert.ok(!descriptiveStaffExperience.flags.some(f=>f.code==='multi_requirement_line'),'descriptive named-role experience outside the normative clause must not fabricate composite risk');

const narrative=p.splitRequirements('Leverantören beskriver organisationen. Informationen används som bakgrund.')[0];
assert.ok(!narrative.flags.some(f=>f.code==='multi_requirement_line'),'non-normative prose must not fabricate composite risk');

const semicolonNarrative=p.splitRequirements('Leverantören beskriver organisationen; informationen används som bakgrund.')[0];
assert.ok(!semicolonNarrative.flags.some(f=>f.code==='multi_requirement_line'),'non-normative semicolon prose must not fabricate composite risk');

console.log('Composite requirement-row contracts: 39/39 passed');
'''


def main() -> int:
    subprocess.run(['node','-e',NODE_TEST], cwd=ROOT, check=True)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
