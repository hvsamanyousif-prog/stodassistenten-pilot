#!/usr/bin/env python3
"""Bounded procurement regression for Swedish formal `i det fall` relations.

This is a deterministic source-row/oracle contract. It does not claim arbitrary
Swedish language understanding, legal correctness, live browser behavior,
physical-device coverage, or human usability evidence.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "procurement-i-det-fall-evidence.json"

NODE_TEST = r'''
const p=require('./client/procurement-expert-pilot.js');
const results=[];
function record(id,ok,detail){results.push({id,ok,detail});}

function hasFlag(row,code){return !!row && Array.isArray(row.flags) && row.flags.some(f=>f.code===code);}

{
  const text='Leverantören ska ha ansvarsförsäkring och i det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.';
  const rows=p.splitRequirements(text);
  record('same-line-i-det-fall-att-stays-relation-bound',
    rows.length===1 && hasFlag(rows[0],'conditional_or_exception') && hasFlag(rows[0],'multi_requirement_line'),
    {rows:rows.length,flags:rows.map(r=>(r.flags||[]).map(f=>f.code))});
}

{
  const text='Leverantören ska ha ansvarsförsäkring; i det fall underleverantör används ska underleverantören ha ansvarsförsäkring.';
  const rows=p.splitRequirements(text);
  record('semicolon-i-det-fall-stays-relation-bound',
    rows.length===1 && hasFlag(rows[0],'conditional_or_exception') && hasFlag(rows[0],'multi_requirement_line'),
    {rows:rows.length,flags:rows.map(r=>(r.flags||[]).map(f=>f.code))});
}

{
  const text='Leverantören ska ha ansvarsförsäkring;\nI det fall underleverantör används ska underleverantören ha ansvarsförsäkring.';
  const rows=p.splitRequirements(text);
  record('cross-line-shared-i-det-fall-remains-linked',
    rows.length===2 && rows.every(r=>hasFlag(r,'cross_line_relation')) && hasFlag(rows[1],'conditional_or_exception'),
    {rows:rows.length,sourceLines:rows.map(r=>r.sourceLine),flags:rows.map(r=>(r.flags||[]).map(f=>f.code))});
}

{
  const text='Leverantören ska ha ansvarsförsäkring;\nI det fall e-faktura används ska fakturan följa Peppol BIS.';
  const rows=p.splitRequirements(text);
  record('independent-i-det-fall-keeps-right-source-risk-without-false-link',
    rows.length===2 && !rows.some(r=>hasFlag(r,'cross_line_relation')) && hasFlag(rows[1],'conditional_or_exception'),
    {rows:rows.length,sourceLines:rows.map(r=>r.sourceLine),flags:rows.map(r=>(r.flags||[]).map(f=>f.code))});
}

{
  const text='Leverantören ska ha ansvarsförsäkring;\nFörutom i det fall ett likvärdigt försäkringsbevis godtas gäller kravet på ansvarsförsäkring.';
  const rows=p.splitRequirements(text);
  record('forutom-i-det-fall-remains-exceptive-not-additive',
    rows.length===2 && rows.every(r=>hasFlag(r,'cross_line_relation')) && hasFlag(rows[1],'conditional_or_exception'),
    {rows:rows.length,sourceLines:rows.map(r=>r.sourceLine),flags:rows.map(r=>(r.flags||[]).map(f=>f.code))});
}

process.stdout.write(JSON.stringify({suite:'procurement-i-det-fall',results},null,2));
process.exit(results.every(r=>r.ok)?0:1);
'''

proc = subprocess.run(
    ["node", "-e", NODE_TEST],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
OUT.write_text(proc.stdout or json.dumps({"suite": "procurement-i-det-fall", "error": proc.stderr}), encoding="utf-8")
print(proc.stdout)
if proc.stderr:
    print(proc.stderr)
raise SystemExit(proc.returncode)
