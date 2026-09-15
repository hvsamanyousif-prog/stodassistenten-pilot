#!/usr/bin/env python3
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'procurement-expert-pilot.html'
JS=ROOT/'client/procurement-expert-pilot.js'

def require(ok: bool,msg: str)->None:
    if not ok: raise AssertionError(msg)

def main()->int:
    html=HTML.read_text(encoding='utf-8')
    js=JS.read_text(encoding='utf-8')
    for token in (
        'Expertpilot • offentlig upphandling',
        'Supplier simulation + buyer-side Red Team',
        'Bygg / entreprenad',
        'Städ / facility',
        'Konsult / professionella tjänster',
        'Fastighet / drift',
        'Skicka anonym feedback',
        'Använd endast',
        'offentlig, historisk eller fullt syntetisk upphandling',
        'client/procurement-expert-pilot.js',
    ): require(token in html,f'missing expert-pilot invariant: {token}')
    for token in (
        "flow:'procurement_expert_review'",
        "app_version:APP_VERSION",
        "language:'sv'",
        "learned_new:found==='yes'",
        "useful:useful==='yes'",
        "next_step_clear:clear==='yes'",
        "ratings:{...state.scores}",
    ): require(token in js,f'missing structured feedback contract: {token}')
    require("body:JSON.stringify(payload)" in js,'feedback must submit only structured payload object')
    require('sourceText:' not in js and 'sourceUrl:' not in js,'raw source fields must never be serialized as feedback fields')
    require("module.exports=api" in js,'runtime must expose pure functions for regression tests')
    syntax=subprocess.run(['node','--check',str(JS)],capture_output=True,text=True)
    require(syntax.returncode==0,'expert runtime JavaScript syntax failed: '+syntax.stderr)
    node_test=r'''
const p=require('./client/procurement-expert-pilot.js');
function a(ok,msg){if(!ok)throw new Error(msg)}
a(p.classifyRequirement('Leverantören ska ha två referensuppdrag.')==='qualification','reference classification');
a(p.classifyRequirement('Tilldelning sker enligt bästa förhållandet mellan pris och kvalitet.')==='award','award classification');
a(p.classifyRequirement('Under avtalstiden gäller vite enligt bilaga 7.')==='contract','contract classification');
a(p.classifyRequirement('Sista anbudsdag är 2026-10-30 klockan 23:59.')==='deadline','deadline classification');
a(p.classifyRequirement('Produkten ska uppfylla kravspecifikationens punkt 4.')==='mandatory','mandatory classification');
const req=p.splitRequirements(p.sampleConstruction());
a(req.length>=8,'sample should exercise several requirements');
req[0].evidence='missing';
const s=p.summarize(req);
a(s.blocking.length>=1 && s.decision.includes('No-bid'),'missing mandatory/qualification evidence must fail closed');
a(p.draftSkeleton(req).includes('STOPP: saknat styrkbart bevis'),'draft must not write around missing evidence');
console.log('procurement expert runtime: OK');
'''
    logic=subprocess.run(['node','-e',node_test],cwd=ROOT,capture_output=True,text=True)
    require(logic.returncode==0,'expert runtime logic failed: '+logic.stderr)
    print('procurement expert pilot tests: OK')
    return 0

if __name__=='__main__': raise SystemExit(main())
