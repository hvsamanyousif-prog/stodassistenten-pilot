#!/usr/bin/env python3
"""Focused process-event source-truth contracts for the procurement pilot."""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NODE_TEST = r'''
const assert=require('node:assert/strict');
const p=require('./client/procurement-expert-pilot.js');

function hasFlag(row, code){return (row.flags||[]).some(f=>f.code===code);}

{
  const rows=p.splitRequirements([
    'Frågor ska lämnas senast den 15 oktober 2026 kl 12:00.',
    'Svar på frågor publiceras senast den 20 oktober 2026 kl 17:00.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.category),['deadline','deadline']);
  assert.deepEqual(rows.map(r=>r.processSubtype),['clarification','answer_publication']);
  assert.ok(rows.every(r=>!hasFlag(r,'deadline_version_conflict')),
    'different process events must not become one clarification version conflict');
  assert.match(rows[0].question,/frågor|förtydliganden/);
  assert.match(rows[1].question,/publicering av svar|svar.*publicer/i);
  assert.ok(hasFlag(rows[1],'answer_publication_timing'),
    'answer publication timing must stay visible as a fail-closed source check');
}

{
  const rows=p.splitRequirements([
    'Rättelse 1: Frågor ska lämnas senast den 15 oktober 2026 kl 12:00.',
    'Rättelse 2: Frågor ska lämnas senast den 16 oktober 2026 kl 12:00.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['clarification','clarification']);
  assert.ok(rows.every(r=>hasFlag(r,'deadline_version_conflict')),
    'genuine versions of the same supplier question deadline must still fail closed');
}

{
  const row=p.splitRequirements(
    'Svar på frågor som inkommit senast den 15 oktober 2026 publiceras den 20 oktober 2026.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'answer_publication');
  assert.ok(!hasFlag(row,'deadline_version_conflict'));
  assert.match(row.question,/publicering av svar|svar.*publicer/i);
}

{
  const row=p.splitRequirements(
    'Begäran om kompletterande upplysningar ska lämnas senast den 18 oktober 2026 kl 12:00.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'clarification');
  assert.match(row.question,/frågor|förtydliganden|upplysningar/i);
}

{
  const row=p.splitRequirements(
    'Kompletterande upplysningar ska lämnas senast den 24 oktober 2026 kl 23:59.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'answer_publication');
  assert.ok(hasFlag(row,'answer_publication_timing'));
  assert.match(row.question,/publicering av svar|svar.*publicer|upplysningar|originalkäll/i);
}

{
  const row=p.splitRequirements(
    'Kompletterande upplysningar tillhandahålls senast den 24 oktober 2026 kl 23:59.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'answer_publication');
  assert.ok(hasFlag(row,'answer_publication_timing'));
}

{
  const row=p.splitRequirements(
    'Leverantören ska lämna kompletterande upplysningar i bilaga 4 senast den 18 oktober 2026.'
  )[0];
  assert.notEqual(row.processSubtype,'answer_publication');
  assert.ok(!hasFlag(row,'answer_publication_timing'));
}

{
  const rows=p.splitRequirements([
    'Rättelse 1: Svar på frågor publiceras senast den 20 oktober 2026 kl 17:00.',
    'Rättelse 2: Svar på frågor publiceras senast den 21 oktober 2026 kl 17:00.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['answer_publication','answer_publication']);
  assert.ok(rows.every(r=>hasFlag(r,'deadline_version_conflict')),
    'conflicting answer-publication versions must fail closed instead of only showing per-row source checks');
}

{
  const rows=p.splitRequirements([
    'Meddelande 1: Svar på frågor publiceras senast den 20 oktober 2026 kl 17:00.',
    'Meddelande 2: Svar på frågor publiceras senast den 20 oktober 2026 kl 17:00.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['answer_publication','answer_publication']);
  assert.ok(rows.every(r=>!hasFlag(r,'deadline_version_conflict')),
    'identical answer-publication timings must not fabricate a version conflict');
}

{
  const rows=p.splitRequirements([
    'Meddelande 1: Svar på frågor som inkommit senast den 15 oktober 2026 publiceras den 20 oktober 2026 kl 17:00.',
    'Meddelande 2: Svar på frågor som inkommit senast den 15 oktober 2026 publiceras den 20 oktober 2026 kl 17:00.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['answer_publication','answer_publication']);
  assert.ok(rows.every(r=>!hasFlag(r,'deadline_version_conflict')),
    'embedded supplier-question dates must not be compared as answer-publication dates');
}

{
  const row=p.splitRequirements(
    'Anbudsansökan ska lämnas senast den 1 oktober 2026 kl 23:59.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'participation_application');
  assert.ok(hasFlag(row,'participation_application_timing'),
    'participation application deadline must remain an explicit source-control risk');
  assert.match(row.question,/anbudsansökan|få delta|deltag/i);
}

{
  const row=p.splitRequirements(
    'Ansökan om att få delta ska ha kommit in senast den 1 oktober 2026 kl 23:59.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'participation_application');
  assert.ok(hasFlag(row,'participation_application_timing'));
}

{
  const row=p.splitRequirements(
    'Anbud ska lämnas senast den 15 oktober 2026 kl 23:59.'
  )[0];
  assert.equal(row.category,'deadline');
  assert.equal(row.processSubtype,'bid');
}

{
  const rows=p.splitRequirements([
    'Anbudsansökan ska lämnas senast den 1 oktober 2026 kl 23:59.',
    'Anbud ska lämnas senast den 15 oktober 2026 kl 23:59.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['participation_application','bid']);
  assert.ok(rows.every(r=>!hasFlag(r,'deadline_version_conflict')),
    'participation deadline and bid deadline are different process events, not versions of one deadline');
  rows[0].evidence='yes';
  assert.equal(p.prioritizeReviewRows(rows)[0].sourceLine,1,
    'manual evidence must not hide unresolved participation-deadline source control');
}

{
  const rows=p.splitRequirements([
    'Rättelse 1: Anbudsansökan ska lämnas senast den 1 oktober 2026 kl 12:00.',
    'Rättelse 2: Anbudsansökan ska lämnas senast den 2 oktober 2026 kl 12:00.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['participation_application','participation_application']);
  assert.ok(rows.every(r=>hasFlag(r,'deadline_version_conflict')),
    'conflicting participation-application versions must fail closed');
}

{
  const row=p.splitRequirements(
    'Ansökan om kvalitetsbonus ska lämnas senast den 1 oktober 2026.'
  )[0];
  assert.notEqual(row.processSubtype,'participation_application');
  assert.ok(!hasFlag(row,'participation_application_timing'));
}

{
  const rows=p.splitRequirements([
    'Rättelse 1: Sista anbudsdag är 30/10 kl 23:59.',
    'Rättelse 2: Sista anbudsdag är 31/10 kl 23:59.'
  ].join('\n'));
  assert.deepEqual(rows.map(r=>r.processSubtype),['bid','bid']);
  assert.ok(rows.every(r=>hasFlag(r,'deadline_version_conflict')),
    'conflicting numeric day/month deadlines without year must fail closed');
}

{
  const rows=p.splitRequirements([
    'Rättelse 1: Sista anbudsdag är 30/10 kl 23:59.',
    'Rättelse 2: Sista anbudsdag är 30 oktober 2026 kl 23:59.'
  ].join('\n'));
  assert.ok(rows.every(r=>!hasFlag(r,'deadline_version_conflict')),
    'same month/day with one missing year must not fabricate a version conflict');
}

{
  const rows=p.splitRequirements([
    'Version 2.1: Sista anbudsdag är 30/10 kl 23:59.',
    'Version 3.1: Sista anbudsdag är 30/10 kl 23:59.'
  ].join('\n'));
  assert.ok(rows.every(r=>!hasFlag(r,'deadline_version_conflict')),
    'version numbers must not be parsed as partial deadline dates');
}

console.log(JSON.stringify({scope:'procurement deadline process-event contracts',passed:19,failed:0}));
'''


def main() -> int:
    subprocess.run(['node', '-e', NODE_TEST], cwd=ROOT, check=True)
    print('procurement process-event contracts: OK')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
