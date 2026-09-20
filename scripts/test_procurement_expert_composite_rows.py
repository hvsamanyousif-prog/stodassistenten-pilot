#!/usr/bin/env python3
"""Fail-closed contracts for several material requirements on one physical source row."""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NODE_TEST = r'''
const assert=require('node:assert/strict');
const p=require('./client/procurement-expert-pilot.js');

// Conjunction-bound requirements stay on one physical review row for now, but
// must remain fail-closed because one evidence control cannot verify siblings.
const cases=[
  'Leverantören ska ha ansvarsförsäkring och ISO 9001-certifikat.',
  'Leverantören ska ha ISO 9001-certifikat och ISO 14001-certifikat.',
  'Leverantören ska ha två referensuppdrag inom markentreprenad och två referensuppdrag inom elinstallationer.',
  'Leverantören ska ha två referensuppdrag och en arbetsledare med minst fem års erfarenhet.',
  'Leverantören ska ha en arbetsledare med minst fem års erfarenhet och en projektledare med minst tre års erfarenhet.',
  'Leverantören ska ha två referensuppdrag och ett dokumenterat kvalitetsledningssystem.',
  'Leverantören ska ha två referensuppdrag och vara registrerad i ett aktiebolags-, handels- eller föreningsregister.',
  'Leverantören ska ha två referensuppdrag och förfoga över den tekniska utrustningen för uppdraget.',
  'Leverantören ska ha två referensuppdrag och under avtalstiden kunna inställa sig inom två timmar.',
  'Leverantören ska ha två referensuppdrag och under avtalstiden följa arbetsmiljöplanen.',
  'Leverantören ska ha två referensuppdrag och ange ett fast pris i prisbilaga 6.',
  'Anbudet ska innehålla en kvalitetsplan och en bemanningsplan.',
  'Anbudet ska innehålla en metodbeskrivning och en genomförandeplan.',
  'Anbudet ska innehålla en riskanalys och en tidplan.',
  'Anbudet ska innehålla CV för arbetsledaren och en lista med två referensuppdrag.',
  'Frågor ska lämnas senast den 20 oktober och anbud senast den 31 oktober.'
];

for(const [index,text] of cases.entries()){
  const rows=p.splitRequirements(text);
  assert.equal(rows.length,1,`case ${index+1}: conjunction-bound physical row must stay intact`);
  const row=rows[0];
  assert.equal(row.sourceLine,1,`case ${index+1}: source line must be preserved`);
  assert.ok(row.flags.some(f=>f.code==='multi_requirement_line'),`case ${index+1}: missing composite-row risk`);
  assert.match(row.flags.find(f=>f.code==='multi_requirement_line').label,/flera materiella krav|flera självständiga krav/i);
  assert.ok(p.prioritizeReviewRows(rows).some(r=>r.id===row.id),`case ${index+1}: composite row must be prioritized`);
  row.evidence='yes';
  assert.ok(p.prioritizeReviewRows(rows).some(r=>r.id===row.id),`case ${index+1}: manual evidence=yes must not hide composite risk`);
  assert.equal(p.summarize(rows).uncertain.length,1,`case ${index+1}: composite risk must remain uncertain`);
}

// First bounded semantic-segmentation contract: explicit sentence/semicolon
// boundaries on one physical source line become independently reviewable rows
// while keeping the original physical source line for traceability. This is
// intentionally narrower than full document segmentation and does not split
// conjunction-bound clauses above.
const explicitBoundaryCases=[
  ['Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Pris ska anges i bilaga 6. Sista anbudsdag är 2026-10-30 klockan 23:59.',4],
  ['Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Anbudspris ska anges i SEK.',3],
  ['Leverantören ska ha ansvarsförsäkring; sista anbudsdag är 2026-10-30 klockan 23:59.',2],
  ['Pris ska anges i bilaga 6; sista anbudsdag är 2026-10-30 klockan 23:59.',2]
];
for(const [caseIndex,[text,expectedCount]] of explicitBoundaryCases.entries()){
  const rows=p.splitRequirements(text);
  assert.equal(rows.length,expectedCount,`segmentation case ${caseIndex+1}: explicit material clauses must become independent review rows`);
  rows.forEach((row,index)=>{
    assert.equal(row.sourceLine,1,`segmentation case ${caseIndex+1}: physical source line must stay traceable`);
    assert.equal(row.sourceSegment,index+1,`segmentation case ${caseIndex+1}: source segment index must be stable`);
    assert.equal(row.sourceSegmentCount,expectedCount,`segmentation case ${caseIndex+1}: source segment count must be explicit`);
    assert.ok(!row.flags.some(f=>f.code==='multi_requirement_line'),`segmentation case ${caseIndex+1}: already-separated clause must not retain composite-row warning`);
  });
  const first=rows[0];
  first.evidence='yes';
  assert.equal(p.summarize(rows).uncertain.length,expectedCount-1,`segmentation case ${caseIndex+1}: evidence on one segment must not verify sibling segments`);
  assert.ok(p.prioritizeReviewRows(rows).every(r=>r.id!==first.id),`segmentation case ${caseIndex+1}: reviewed segment should leave priority independently`);
  assert.equal(p.prioritizeReviewRows(rows).length,expectedCount-1,`segmentation case ${caseIndex+1}: sibling segments must remain independently prioritized`);
}

const simple=p.splitRequirements('Leverantören ska ha ansvarsförsäkring.')[0];
assert.ok(!simple.flags.some(f=>f.code==='multi_requirement_line'),'single material requirement must not fabricate composite risk');

const descriptiveConjunction=p.splitRequirements('Leverantören ska ha ansvarsförsäkring som omfattar verksamheten och gäller under hela avtalstiden.')[0];
assert.ok(!descriptiveConjunction.flags.some(f=>f.code==='multi_requirement_line'),'single evidence object with descriptive conjunction must not fabricate composite risk');

const descriptiveSameFamilyCertificate=p.splitRequirements('Leverantören ska ha ISO 9001-certifikat och information om ISO 14001-certifikat används endast som bakgrund.')[0];
assert.ok(!descriptiveSameFamilyCertificate.flags.some(f=>f.code==='multi_requirement_line'),'descriptive mention of a second certificate must not fabricate same-family object multiplicity');

const descriptiveSameFamilyReference=p.splitRequirements('Leverantören ska ha två referensuppdrag inom markentreprenad och information om referensuppdrag inom elinstallationer används endast som bakgrund.')[0];
assert.ok(!descriptiveSameFamilyReference.flags.some(f=>f.code==='multi_requirement_line'),'descriptive mention of a second reference scope must not fabricate same-family object multiplicity');

const descriptiveSameFamilyNamedRole=p.splitRequirements('Leverantören ska ha en arbetsledare med minst fem års erfarenhet och projektledaren nämns endast i bakgrundsbeskrivningen.')[0];
assert.ok(!descriptiveSameFamilyNamedRole.flags.some(f=>f.code==='multi_requirement_line'),'descriptive mention of a second named role must not fabricate same-family object multiplicity');

const descriptiveStaffExperience=p.splitRequirements('Leverantören ska ha två referensuppdrag; information om arbetsledarens erfarenhet används endast som bakgrund.')[0];
assert.ok(!descriptiveStaffExperience.flags.some(f=>f.code==='multi_requirement_line'),'descriptive named-role experience outside the normative clause must not fabricate composite risk');

const descriptiveManagementSystem=p.splitRequirements('Leverantören ska ha två referensuppdrag; kvalitetsledningssystemet beskrivs endast som bakgrund.')[0];
assert.ok(!descriptiveManagementSystem.flags.some(f=>f.code==='multi_requirement_line'),'descriptive management-system prose outside the normative clause must not fabricate composite risk');

const descriptiveRegister=p.splitRequirements('Leverantören ska ha två referensuppdrag; registrering i aktiebolags-, handels- eller föreningsregister beskrivs endast som bakgrund.')[0];
assert.ok(!descriptiveRegister.flags.some(f=>f.code==='multi_requirement_line'),'descriptive register prose outside the normative clause must not fabricate composite risk');

const descriptiveTechnicalEquipment=p.splitRequirements('Leverantören ska ha två referensuppdrag; den tekniska utrustningen beskrivs endast som bakgrund.')[0];
assert.ok(!descriptiveTechnicalEquipment.flags.some(f=>f.code==='multi_requirement_line'),'descriptive technical-equipment prose outside the normative clause must not fabricate composite risk');

const descriptivePerformance=p.splitRequirements('Leverantören ska ha två referensuppdrag; inställelsetiden under avtalstiden beskrivs endast som bakgrund.')[0];
assert.ok(!descriptivePerformance.flags.some(f=>f.code==='multi_requirement_line'),'descriptive contract-performance prose outside the normative clause must not fabricate composite risk');

const descriptiveWorkEnvironment=p.splitRequirements('Leverantören ska ha två referensuppdrag; arbetsmiljöplanen under avtalstiden beskrivs endast som bakgrund.')[0];
assert.ok(!descriptiveWorkEnvironment.flags.some(f=>f.code==='multi_requirement_line'),'descriptive work-environment prose outside the normative clause must not fabricate composite risk');

const descriptiveCommercial=p.splitRequirements('Leverantören ska ha två referensuppdrag och information om fast pris i prisbilaga 6 används endast som bakgrund.')[0];
assert.ok(!descriptiveCommercial.flags.some(f=>f.code==='multi_requirement_line'),'descriptive commercial prose must not fabricate composite risk');

const descriptiveRequestedDeliverable=p.splitRequirements('Anbudet ska innehålla en kvalitetsplan och bemanningsplanen nämns endast som bakgrund.')[0];
assert.ok(!descriptiveRequestedDeliverable.flags.some(f=>f.code==='multi_requirement_line'),'descriptive requested-document mention must not fabricate composite risk');

const descriptiveRequestedDescription=p.splitRequirements('Anbudet ska innehålla en metodbeskrivning och genomförandeplanen nämns endast som bakgrund.')[0];
assert.ok(!descriptiveRequestedDescription.flags.some(f=>f.code==='multi_requirement_line'),'descriptive requested-description mention must not fabricate composite risk');

const descriptiveRequestedRiskAnalysis=p.splitRequirements('Anbudet ska innehålla en riskanalys och information om tidplan används endast som bakgrund.')[0];
assert.ok(!descriptiveRequestedRiskAnalysis.flags.some(f=>f.code==='multi_requirement_line'),'background-only plan mention must not turn a requested risk analysis into fabricated multiplicity');

const descriptiveRequestedStaffEvidence=p.splitRequirements('Anbudet ska innehålla CV för arbetsledaren och information om referensuppdrag används endast som bakgrund.')[0];
assert.ok(!descriptiveRequestedStaffEvidence.flags.some(f=>f.code==='multi_requirement_line'),'background-only reference mention must not turn requested staff evidence into a fabricated composite risk');

const descriptiveSecondProcessDate=p.splitRequirements('Frågor ska lämnas senast den 20 oktober och anbudsdatumet den 31 oktober nämns endast som bakgrund.')[0];
assert.ok(!descriptiveSecondProcessDate.flags.some(f=>f.code==='multi_requirement_line'),'background-only bid date must not fabricate a second actionable process event');

const narrative=p.splitRequirements('Leverantören beskriver organisationen. Informationen används som bakgrund.')[0];
assert.ok(!narrative.flags.some(f=>f.code==='multi_requirement_line'),'non-normative prose must not fabricate composite risk');

const semicolonNarrative=p.splitRequirements('Leverantören beskriver organisationen; informationen används som bakgrund.')[0];
assert.ok(!semicolonNarrative.flags.some(f=>f.code==='multi_requirement_line'),'non-normative semicolon prose must not fabricate composite risk');

console.log(`Composite requirement-row contracts: ${cases.length} conjunction-bound composite fixtures + ${explicitBoundaryCases.length} explicit-boundary segmentation fixtures + 19 negative controls passed`);
'''


def main() -> int:
    subprocess.run(['node','-e',NODE_TEST], cwd=ROOT, check=True)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
