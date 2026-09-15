#!/usr/bin/env python3
"""Behavior and public-boundary regression gate; not legal or live E2E validation."""
from __future__ import annotations
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class Markup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'script' and 'src' in attrs:
            self.scripts.append(attrs['src'])

def main() -> int:
    html = (ROOT / 'procurement-expert-pilot.html').read_text(encoding='utf-8')
    markup = Markup()
    markup.feed(html)
    assert len(markup.ids) == len(set(markup.ids)), 'Duplicate DOM IDs'
    required = {'startBtn','sampleBtn','profileCard','sectorGrid','sourceCard','sourceText',
                'sourceUrl','analyzeBtn','clearBtn','analysisCard','summary','requirements',
                'draft','feedbackCard','scoreRows','foundIssue','useful','clearNext',
                'sendFeedback','copyReport','feedbackStatus'}
    assert required <= set(markup.ids), 'Missing interactive DOM contract'
    assert markup.scripts == ['client/procurement-expert-pilot.js'], 'Unexpected script boundary'
    # Preserve safety meaning, not obsolete English marketing copy.
    for text in ('sekretessbelagd','lokalt i webbläsaren','inte ett färdigt anbud',
                 'bilagor, rättelser och publicerade frågor/svar','inte ett verifierat bevis',
                 'Inga underlagstexter eller företagsuppgifter skickas'):
        assert text in html, f'Missing public limitation: {text}'
    assert 'aria-live="polite"' in html, 'Feedback status must be announced'
    subprocess.run(['node','--check','client/procurement-expert-pilot.js'], cwd=ROOT, check=True)
    node_test = r'''
const assert=require('node:assert/strict');
const p=require('./client/procurement-expert-pilot.js');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const classification=[
 ['construction-reference','Leverantören ska ha två referensuppdrag.','qualification'],
 ['construction-award','Tilldelning sker enligt bästa förhållandet mellan pris och kvalitet.','award'],
 ['property-contract','Under avtalstiden gäller vite enligt bilaga 7.','contract'],
 ['deadline','Sista anbudsdag är 2026-10-30 klockan 23:59.','deadline'],
 ['cleaning-mandatory','Städningen ska utföras enligt kravspecifikationen.','mandatory'],
 ['consulting-capacity','Krav på teknisk och yrkesmässig kapacitet.','qualification'],
 ['exclusion','Uteslutningsgrund: obetalda skatter.','exclusion'],
 ['commercial','Anbudet ska innehålla ifylld prisbilaga.','commercial'],
 ['uncertain','Kontrollera bilaga två.','uncertain']
];
for(const [name,text,expected] of classification) test(name,()=>assert.equal(p.classifyRequirement(text),expected));
test('source-line-preserved',()=>{
 const req=p.splitRequirements('Rubrik\n\nLeverantören ska ha två referensuppdrag.');
 assert.equal(req.length,2); assert.equal(req[1].sourceLine,3);
 assert.match(p.draftSkeleton([req[1]]),/Källa rad 3/);
});
test('windows-line-endings',()=>assert.deepEqual(p.splitRequirements('A\r\n\r\nB').map(r=>r.sourceLine),[1,3]));
test('short-text-not-discarded',()=>assert.equal(p.splitRequirements('Krav\nCV krävs')[0].text,'Krav'));
test('81st-requirement-retained',()=>assert.equal(p.splitRequirements(Array.from({length:81},(_,i)=>`${i+1}. Intyg ska bifogas.`).join('\n')).length,81));
test('line-limit-explicit',()=>assert.throws(()=>p.splitRequirements(Array(401).fill('Intyg ska bifogas.').join('\n')),RangeError));
test('text-limit-explicit',()=>assert.throws(()=>p.splitRequirements('x'.repeat(100001)),RangeError));
test('empty-is-not-complete',()=>assert.equal(p.summarize(p.splitRequirements('  \n')).tone,'notice'));
for(const category of p.CATEGORIES) test(`missing-${category}-never-positive`,()=>{
 const r={id:1,sourceLine:3,text:'Exakt syntetiskt krav',category,evidence:'missing'};
 const s=p.summarize([r]); assert.equal(s.blocking.length,1);assert.equal(s.tone,'warn');
 assert.match(p.draftSkeleton([r]),/STOPP: saknat styrkbart bevis/);
 assert.match(p.draftSkeleton([r]),/Exakt syntetiskt krav/);
});
test('not-applicable-not-evidence',()=>{
 const rows=p.splitRequirements('Ett undertecknat intyg ska bifogas.'); rows[0].evidence='na';
 assert.equal(p.summarize(rows).uncertain.length,1);assert.equal(p.summarize(rows).tone,'notice');
});
test('manual-check-not-verification',()=>{
 const rows=p.splitRequirements('Ett undertecknat intyg ska bifogas.'); rows[0].evidence='yes';
 assert.equal(p.summarize(rows).tone,'notice');assert.match(p.summarize(rows).decision,/inte verifierat/);
});
test('sample-first-pass-boundary',()=>{
 const rows=p.splitRequirements(p.sampleConstruction());assert.equal(rows.length,9);
 assert.equal(p.summarize(rows).uncertain.length,9);
});
test('feedback-allowlist',()=>{
 const body=p.buildFeedbackPayload(true,false,true,{requirement_extraction:4});
 assert.deepEqual(Object.keys(body).sort(),['app_version','language','flow','learned_new','useful','next_step_clear','ratings'].sort());
 assert.equal(body.flow,'procurement_expert_review'); assert.equal(body.language,'sv');
 assert.equal(body.learned_new,true);assert.equal(body.useful,false);assert.equal(body.next_step_clear,true);
 assert.deepEqual(body.ratings,{requirement_extraction:4});
});
test('feedback-no-free-text',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{sourceText:'secret'}),TypeError));
test('feedback-no-source-url',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{sourceUrl:'https://example.invalid'}),TypeError));
test('feedback-no-profile',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{sector:4}),TypeError));
test('feedback-no-empty-scores',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{}),TypeError));
for(const value of [0,6,1.5,'4',null])test('invalid-score-'+String(value),()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{requirement_extraction:value}),TypeError));
test('feedback-boolean-contract',()=>assert.throws(()=>p.buildFeedbackPayload('yes',true,true,{requirement_extraction:4}),TypeError));
let failed=0;
for(const [name,fn] of tests){try{fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}}
console.log(JSON.stringify({scope:'pure-function contracts, not end-to-end procurement scenarios',passed:tests.length-failed,failed}));
if(failed)process.exit(1);
'''
    subprocess.run(['node','-e',node_test], cwd=ROOT, check=True)
    print('procurement expert pilot tests: OK')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
