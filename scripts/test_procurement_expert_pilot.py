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
                'sourceUrl','analyzeBtn','clearBtn','analysisCard','summary','priorityOverview',
                'openReviewBtn','reviewDetails','reviewSummary','requirements','editSourceBtn',
                'restartBtn','draft','feedbackCard','advancedFeedback','scoreRows','foundIssue',
                'useful','clearNext','sendFeedback','copyReport','feedbackStatus'}
    assert required <= set(markup.ids), 'Missing interactive DOM contract'
    assert markup.scripts == ['client/procurement-expert-pilot.js'], 'Unexpected script boundary'
    for text in ('sekretessbelagd','lokalt i webbläsaren','inte ett färdigt anbud',
                 'bilagor, rättelser och publicerade frågor/svar','inte ett verifierat bevis',
                 'Inga underlagstexter eller företagsuppgifter skickas',
                 'öppnas eller verifieras inte i denna version','Detaljbetyg är frivilliga'):
        assert text in html, f'Missing public limitation: {text}'
    assert 'aria-live="polite"' in html, 'Feedback status must be announced'
    assert '<details id="reviewDetails">' in html, 'Full requirement review must start collapsed'
    assert '<details id="advancedFeedback">' in html, 'Advanced feedback must start collapsed'
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
test('short-real-requirement-not-heading',()=>{
 const row=p.splitRequirements('CV krävs')[0];
 assert.equal(row.kind,'requirement'); assert.equal(row.category,'mandatory');
});
test('81st-requirement-retained',()=>assert.equal(p.splitRequirements(Array.from({length:81},(_,i)=>`${i+1}. Intyg ska bifogas.`).join('\n')).length,81));
test('line-limit-explicit',()=>assert.throws(()=>p.splitRequirements(Array(401).fill('Intyg ska bifogas.').join('\n')),RangeError));
test('text-limit-explicit',()=>assert.throws(()=>p.splitRequirements('x'.repeat(100001)),RangeError));
test('empty-is-not-complete',()=>assert.equal(p.summarize(p.splitRequirements('  \n')).tone,'notice'));
test('long-paragraph-risk-visible-contract',()=>{
 const text='Leverantören ska redovisa metod. '+('Fortsatt kravtext och sammanhang. '.repeat(25));
 const row=p.splitRequirements(text)[0];
 assert.ok(row.flags.some(f=>f.code==='long_paragraph'));
 assert.match(row.flags.find(f=>f.code==='long_paragraph').label,/Långt stycke/);
});
test('attachment-reference-risk-visible-contract',()=>{
 const row=p.splitRequirements('Bilaga 7 innehåller obligatoriska tekniska krav.')[0];
 assert.ok(row.flags.some(f=>f.code==='attachment_reference'));
 assert.match(row.flags.find(f=>f.code==='attachment_reference').label,/Bilagehänvisning/);
});
test('conditional-risk-visible-contract',()=>{
 const row=p.splitRequirements('Leverantören ska lämna intyg, men kravet gäller inte om beställaren godkänner likvärdigt bevis.')[0];
 assert.ok(row.flags.some(f=>f.code==='conditional_or_exception'));
 assert.match(row.flags.find(f=>f.code==='conditional_or_exception').label,/Villkor eller undantag/);
});
test('conditional-negative-exception-visible-contract',()=>{
 const row=p.splitRequirements('Leverantören ska bifoga kvalitetsintyg. Kravet gäller inte om leverantören redan finns i myndighetens register.')[0];
 assert.ok(row.flags.some(f=>f.code==='conditional_or_exception'));
 assert.equal(p.summarize([row]).uncertain.length,1);
});
test('conditional-either-or-visible-contract',()=>{
 const row=p.splitRequirements('Leverantören ska antingen bifoga ISO-certifikat eller beskriva ett likvärdigt kvalitetsledningssystem.')[0];
 assert.ok(row.flags.some(f=>f.code==='conditional_or_exception'));
 assert.equal(p.summarize([row]).uncertain.length,1);
});
test('cross-reference-visible-contract',()=>{
 const row=p.splitRequirements('Leverantören ska uppfylla samtliga tekniska krav enligt punkt 7.4.')[0];
 assert.ok(row.flags.some(f=>f.code==='cross_reference'));
 assert.match(row.flags.find(f=>f.code==='cross_reference').label,/Korshänvisning/);
 assert.equal(p.summarize([row]).uncertain.length,1);
});
test('mixed-minimum-award-fails-closed',()=>{
 const row=p.splitRequirements('Arbetsledaren ska ha minst fem års erfarenhet och erfarenheten utvärderas med upp till 10 poäng.')[0];
 assert.equal(row.category,'award');
 assert.ok(row.flags.some(f=>f.code==='mixed_requirement'));
 assert.equal(p.summarize([row]).uncertain.length,1);
 assert.match(p.draftSkeleton([row]),/Blandat minimi-\/utvärderingskrav/);
});
test('plain-award-does-not-look-mixed',()=>{
 const row=p.splitRequirements('Kvalitetsplanen utvärderas och kan ge maximalt 15 poäng.')[0];
 assert.ok(!row.flags.some(f=>f.code==='mixed_requirement'));
});
test('conflicting-bid-deadlines-fail-closed',()=>{
 const rows=p.splitRequirements('Rättelse 1: Sista anbudsdag är 2026-10-30 klockan 23:59.\nRättelse 2: Sista anbudsdag är 2026-11-06 klockan 23:59.');
 assert.deepEqual(rows.map(r=>r.processSubtype),['bid','bid']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='deadline_version_conflict')));
 assert.equal(p.summarize(rows).uncertain.length,2);
 assert.match(rows[0].flags.find(f=>f.code==='deadline_version_conflict').label,/Motstridiga anbudsdatum/);
});
test('same-bid-date-is-not-conflict',()=>{
 const rows=p.splitRequirements('Sista anbudsdag är 2026-10-30.\nRättelse: Sista anbudsdag är 2026-10-30.');
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='deadline_version_conflict')));
});
test('publication-date-does-not-create-false-bid-conflict',()=>{
 const rows=p.splitRequirements('Rättelse 1 publicerad 2026-10-01: Sista anbudsdag är 2026-10-30 kl 23:59.\nRättelse 2 publicerad 2026-10-05: Sista anbudsdag är 2026-10-30 kl 23:59.');
 assert.deepEqual(rows.map(r=>r.processSubtype),['bid','bid']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='deadline_version_conflict')));
});
test('publication-date-does-not-hide-real-bid-conflict',()=>{
 const rows=p.splitRequirements('Rättelse 1 publicerad 2026-10-01: Sista anbudsdag är 2026-10-30 kl 23:59.\nRättelse 2 publicerad 2026-10-05: Sista anbudsdag är 2026-10-31 kl 23:59.');
 assert.deepEqual(rows.map(r=>r.processSubtype),['bid','bid']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='deadline_version_conflict')));
});
test('clarification-and-bid-deadlines-keep-separate-purpose',()=>{
 const rows=p.splitRequirements('Frågor om underlaget ska lämnas senast den 20 oktober.\nAnbud ska vara beställaren tillhanda senast den 31 oktober klockan 23:59.');
 assert.deepEqual(rows.map(r=>r.processSubtype),['clarification','bid']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='deadline_version_conflict')));
 assert.match(rows[0].question,/frågor\/förtydliganden/);
 assert.match(rows[1].question,/anbudsdag/);
});
test('dated-qualification-condition-is-not-process-deadline',()=>{
 const row=p.splitRequirements('Leverantören ska ha två referensuppdrag som ska vara slutförda senast den 1 september 2026.')[0];
 assert.equal(row.category,'qualification');
 assert.equal(row.processSubtype,null);
 assert.match(row.question,/referensuppdrag|bevis/);
});
test('conflicting-price-versions-fail-closed',()=>{
 const rows=p.splitRequirements('Version 1: Fast pris ska anges i bilaga 6.\nVersion 2 ersätter version 1: Timpris ska anges i bilaga 9.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
 assert.equal(p.summarize(rows).uncertain.length,2);
});
test('changed-commercial-amount-same-scope-fails-closed',()=>{
 const rows=p.splitRequirements('Version 1: Ersättning 1 000 000 kr ska anges i bilaga 6.\nVersion 2 ersätter version 1: Ersättning 1 200 000 kr ska anges i bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
 assert.ok(p.prioritizeReviewRows(rows).every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('changed-commercial-amount-currency-prefix-same-scope-fails-closed',()=>{
 const rows=p.splitRequirements('Version 1: Ersättning SEK 1 000 000 ska anges i bilaga 6.\nVersion 2 ersätter version 1: Ersättning SEK 1 200 000 ska anges i bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('unchanged-commercial-amount-currency-prefix-is-not-conflict',()=>{
 const rows=p.splitRequirements('Version 1: Ersättning SEK 1 000 000 ska anges i bilaga 6.\nVersion 2 ersätter version 1: Ersättning SEK 1 000 000 ska anges i bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('changed-commercial-index-percent-same-scope-fails-closed',()=>{
 const rows=p.splitRequirements('Version 1: Indexreglering 2 % ska tillämpas enligt bilaga 6.\nVersion 2 ersätter version 1: Indexreglering 3 % ska tillämpas enligt bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
 assert.ok(p.prioritizeReviewRows(rows).every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('unchanged-commercial-index-percent-is-not-conflict',()=>{
 const rows=p.splitRequirements('Version 1: Indexreglering 2 % ska tillämpas enligt bilaga 6.\nVersion 2 ersätter version 1: Indexreglering 2 % ska tillämpas enligt bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('changed-commercial-price-adjustment-percent-same-scope-fails-closed',()=>{
 const rows=p.splitRequirements('Version 1: Prisjustering 2 % ska tillämpas enligt bilaga 6.\nVersion 2 ersätter version 1: Prisjustering 3 % ska tillämpas enligt bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
 assert.ok(p.prioritizeReviewRows(rows).every(r=>r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('unchanged-commercial-price-adjustment-percent-is-not-conflict',()=>{
 const rows=p.splitRequirements('Version 1: Prisjustering 2 % ska tillämpas enligt bilaga 6.\nVersion 2 ersätter version 1: Prisjustering 2 % ska tillämpas enligt bilaga 6.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('unrelated-award-percentages-do-not-become-commercial-version-conflict',()=>{
 const rows=p.splitRequirements('Version 1: Kvalitetsdelen utvärderas med vikt 30 %.\nVersion 2: Kvalitetsdelen utvärderas med vikt 40 %.');
 assert.deepEqual(rows.map(r=>r.category),['award','award']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('different-commercial-subareas-do-not-fabricate-version-conflict',()=>{
 const rows=p.splitRequirements('Rättelse: Delområde A – Fast pris ska anges i bilaga 6.\nRättelse: Delområde B – Timpris ska anges i bilaga 9.');
 assert.deepEqual(rows.map(r=>r.category),['commercial','commercial']);
 assert.ok(rows.every(r=>!r.flags.some(f=>f.code==='commercial_version_conflict')));
});
test('structural-heading-preserved-not-evidence',()=>{
 const rows=p.splitRequirements('Obligatoriska krav\n\nSe bilaga 3.\nMåltiderna ska uppfylla de allergenkrav som anges i underlaget.');
 assert.equal(rows.length,3); assert.equal(rows[0].sourceLine,1); assert.equal(rows[1].sourceLine,3); assert.equal(rows[2].sourceLine,4);
 assert.equal(rows[0].kind,'structural'); assert.equal(rows[0].evidence,'context');
 const summary=p.summarize(rows); assert.equal(summary.actionableCount,2); assert.equal(summary.structuralCount,1);
 assert.ok(!summary.uncertain.some(r=>r.id===rows[0].id));
 assert.match(p.draftSkeleton([rows[0]]),/Ingen evidensbedömning görs på rubriken/);
});
test('structure-risk-remains-unresolved-after-manual-yes',()=>{
 const rows=p.splitRequirements('Bilaga 7 innehåller obligatoriska tekniska krav.'); rows[0].evidence='yes';
 assert.equal(p.summarize(rows).uncertain.length,1);
 assert.equal(p.summarize(rows).tone,'notice');
});
for(const category of p.CATEGORIES) test(`missing-${category}-never-positive`,()=>{
 const r={id:1,sourceLine:3,text:'Exakt syntetiskt krav',category,evidence:'missing',flags:[]};
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
test('feedback-short-path-allows-empty-ratings',()=>{
 const body=p.buildFeedbackPayload(false,true,true,{});
 assert.deepEqual(body.ratings,{});
 assert.equal(body.learned_new,false);assert.equal(body.useful,true);assert.equal(body.next_step_clear,true);
});
test('feedback-no-free-text',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{sourceText:'secret'}),TypeError));
test('feedback-no-source-url',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{sourceUrl:'https://example.invalid'}),TypeError));
test('feedback-no-profile',()=>assert.throws(()=>p.buildFeedbackPayload(true,true,true,{sector:4}),TypeError));
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