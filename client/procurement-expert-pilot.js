(function(root){
'use strict';
const APP_VERSION='procurement-expert-0.1.0';
const FEEDBACK_ENDPOINT='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
const CATEGORIES=['exclusion','qualification','mandatory','award','contract','commercial','deadline','uncertain'];
const LABELS={exclusion:'Uteslutningsgrund',qualification:'Kvalificeringskrav',mandatory:'Obligatoriskt/ska-krav',award:'Tilldelningskriterium',contract:'Avtals-/utförandevillkor',commercial:'Pris/kommersiellt',deadline:'Deadline/process',uncertain:'Osäker – kontrollera källa'};
const SECTORS=[['construction','Bygg / entreprenad'],['cleaning','Städ / facility'],['consulting','Konsult / professionella tjänster'],['property','Fastighet / drift'],['other','Annan SME-kategori']];
const SCORE_DIMS=[
 ['category_match','Opportunity/category match'],
 ['requirement_extraction','Kravextraktion'],
 ['requirement_classification','Kravklassificering'],
 ['evidence_checklist','Evidens-/dokumentlista'],
 ['followup_questions','Följdfrågor'],
 ['draft_fidelity','Anbudsutkastets trohet'],
 ['deadline_process','Deadline/process'],
 ['source_trace','Källspårning'],
 ['false_confidence','Ingen falsk trygghet']
];
const state={sector:'construction',requirements:[],scores:{}};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalized(line){return line.toLowerCase().replace(/\s+/g,' ').trim();}
function classifyRequirement(line){
 const t=normalized(line);
 if(!t)return 'uncertain';
 if(/sista anbudsdag|senast den|deadline|anbud ska vara.*tillhanda|frågor.*senast|giltighetstid för anbud/.test(t))return 'deadline';
 if(/tilldelningskriter|utvärder|mervärde|poäng|bästa förhållandet|lägsta pris/.test(t))return 'award';
 if(/prisbilaga|anbudspris|timpris|fast pris|mängdförteckning|ersättning|indexregler/.test(t))return 'commercial';
 if(/avtalstid|kontraktsvillkor|särskilda kontraktsvillkor|under avtalstiden|vite|utförandevillkor|leveransvillkor/.test(t))return 'contract';
 if(/uteslutningsgrund|uteslutas|brott enligt|obetalda skatter|socialförsäkringsavgifter/.test(t))return 'exclusion';
 if(/ekonomisk (och )?finansiell ställning|omsättning|referensuppdrag|teknisk och yrkesmässig kapacitet|kvalificeringskrav|anbudsgivaren ska ha|leverantören ska ha|åberopa.*kapacitet/.test(t))return 'qualification';
 if(/\bska\b|\bmåste\b|obligatorisk|skall|krävs|krav på/.test(t))return 'mandatory';
 return 'uncertain';
}
function evidenceQuestion(line,category){
 const t=normalized(line);
 if(/referens/.test(t))return 'Kan leverantören visa exakt det referensuppdrag/bevis som den publicerade formuleringen kräver?';
 if(/försäkring/.test(t))return 'Finns ett försäkringsbevis som matchar exakt omfattning och tidpunkt i underlaget?';
 if(/certifikat|certifier|behörig|behörighet|bas-p|bas-u/.test(t))return 'Kan den efterfrågade behörigheten/certifieringen styrkas på det sätt som underlaget anger?';
 if(/omsättning|ekonomisk|finansiell/.test(t))return 'Finns styrkbar ekonomisk evidens som uppfyller den publicerade nivån och perioden?';
 if(/underleverant|åberopa.*kapacitet/.test(t))return 'Om annan kapacitet används: vilka bevis/åtaganden kräver just detta underlag?';
 if(category==='deadline')return 'Är datum/tid/version kontrollerad mot senaste publicerade underlag och eventuella rättelser?';
 if(category==='award')return 'Är detta något som poängsätts/utvärderas – och inte ett minimikrav? Kontrollera den publicerade modellen.';
 if(category==='contract')return 'Är detta ett villkor som ska accepteras/uppfyllas under kontraktet snarare än ett kvalificeringsbevis vid anbud?';
 if(category==='commercial')return 'Är prisformat, bilaga, valuta/enhet och eventuella reservationer hanterade exakt enligt instruktionen?';
 if(category==='exclusion')return 'Vilken deklaration eller vilket bevis efterfrågas och när ska det lämnas?';
 return 'Vilket konkret dokument, svar eller avsnitt visar att leverantören uppfyller just detta publicerade krav?';
}
function splitRequirements(text){
 let lines=String(text||'').split(/\n+/).map(s=>s.trim()).filter(s=>s.length>=8);
 if(lines.length<2 && String(text||'').length>220){lines=String(text).replace(/\.\s+/g,'.\n').split(/\n+/).map(s=>s.trim()).filter(s=>s.length>=8);}
 return lines.slice(0,80).map((text,i)=>({id:i+1,text,category:classifyRequirement(text),evidence:'unknown',question:evidenceQuestion(text,classifyRequirement(text))}));
}
function summarize(reqs){
 const counts={};CATEGORIES.forEach(c=>counts[c]=0);reqs.forEach(r=>counts[r.category]=(counts[r.category]||0)+1);
 const blocking=reqs.filter(r=>(r.category==='mandatory'||r.category==='qualification')&&r.evidence==='missing');
 const uncertain=reqs.filter(r=>r.category==='uncertain'||r.evidence==='unknown');
 let decision='Fortsätt kontroll mot hela underlaget';
 let tone='notice';
 if(blocking.length){decision='No-bid/lucka: ett eller flera uttryckliga krav saknar styrkbar evidens';tone='warn';}
 else if(reqs.length && !uncertain.length){decision='Ready enough to fortsätta kontrollen – inte ett compliance-besked';tone='okbox';}
 return {counts,blocking,uncertain,decision,tone};
}
function draftSkeleton(reqs){
 if(!reqs.length)return 'Ingen kravtext analyserad ännu.';
 return reqs.map(r=>{
   const src=`Källa rad ${r.id}`;
   if((r.category==='mandatory'||r.category==='qualification')&&r.evidence==='missing')return `${src} • ${LABELS[r.category]}\nSTOPP: saknat styrkbart bevis. Lös luckan eller överväg no-bid.\n`;
   const ev=r.evidence==='yes'?'[ange exakt dokument/bevis och avsnitt]':r.evidence==='na'?'[ej tillämpligt – motivera mot underlaget]':'[verifiera vilket bevis/svar som krävs]';
   return `${src} • ${LABELS[r.category]}\nKrav: ${r.text}\nSvar: [beskriv endast verifierbart hur kravet hanteras]\nBevis: ${ev}\n`;
 }).join('\n');
}
function sampleConstruction(){return [
'3.1 Kvalificering: Leverantören ska ha genomfört minst två referensuppdrag av liknande art under de senaste fem åren.',
'3.2 Leverantören ska ha en årlig omsättning om minst 8 000 000 SEK enligt senast fastställda årsredovisning.',
'4.1 Anbudsgivaren ska inneha ansvarsförsäkring med den omfattning som anges i bilaga 2.',
'4.2 Arbetsledare som anges i anbudet ska kunna styrka den kompetens som anges i kravspecifikationen.',
'5.3 Om underentreprenör åberopas ska efterfrågade åtaganden och bevis lämnas enligt bilaga 4.',
'6.1 Tilldelning sker enligt bästa förhållandet mellan pris och kvalitet. Kvalitet utvärderas enligt poängmodellen i bilaga 5.',
'7.2 Under avtalstiden gäller de arbetsmiljö- och rapporteringsvillkor som anges i kontraktsbilagan.',
'8.1 Samtliga priser ska anges i prisbilaga 6 utan egna alternativa prisformat.',
'9.1 Sista anbudsdag är 2026-10-30 klockan 23:59.'
].join('\n');}
function scoreOptions(){return '<option value="">Välj</option><option value="5">5 – korrekt/starkt</option><option value="4">4 – mindre brist</option><option value="3">3 – blandat</option><option value="2">2 – tydlig brist</option><option value="1">1 – fel/riskabelt</option>';}
function browserInit(){
 const $=id=>document.getElementById(id);
 const show=id=>$(id).classList.remove('hidden');
 const sectorGrid=$('sectorGrid');
 function renderSectors(){sectorGrid.innerHTML=SECTORS.map(([v,l])=>`<button class="choice ${state.sector===v?'active':''}" data-sector="${v}">${l}</button>`).join('');sectorGrid.querySelectorAll('[data-sector]').forEach(b=>b.onclick=()=>{state.sector=b.dataset.sector;renderSectors();});}
 function renderRequirements(){
   const s=summarize(state.requirements);
   $('summary').innerHTML=`<div class="${s.tone}"><b>${esc(s.decision)}</b><br><span class="muted">${state.requirements.length} rader analyserade • ${s.blocking.length} blockerande evidensluckor • ${s.uncertain.length} osäkra/ej bedömda</span></div>`;
   $('requirements').innerHTML=state.requirements.map(r=>`<article class="req"><div class="reqhead"><span class="tag">${esc(LABELS[r.category])}</span><span class="source">Källa rad ${r.id}</span></div><p>${esc(r.text)}</p><p class="muted"><b>Kontrollfråga:</b> ${esc(r.question)}</p><div class="grid"><label>Kravtyp<select data-cat="${r.id}">${CATEGORIES.map(c=>`<option value="${c}" ${c===r.category?'selected':''}>${esc(LABELS[c])}</option>`).join('')}</select></label><label>Leverantörens evidens<select data-ev="${r.id}"><option value="unknown" ${r.evidence==='unknown'?'selected':''}>Ej bedömd</option><option value="yes" ${r.evidence==='yes'?'selected':''}>Styrkt</option><option value="missing" ${r.evidence==='missing'?'selected':''}>Saknas</option><option value="na" ${r.evidence==='na'?'selected':''}>Ej tillämpligt</option></select></label></div></article>`).join('');
   $('requirements').querySelectorAll('[data-cat]').forEach(el=>el.onchange=()=>{const r=state.requirements.find(x=>x.id===Number(el.dataset.cat));r.category=el.value;r.question=evidenceQuestion(r.text,r.category);renderRequirements();});
   $('requirements').querySelectorAll('[data-ev]').forEach(el=>el.onchange=()=>{const r=state.requirements.find(x=>x.id===Number(el.dataset.ev));r.evidence=el.value;renderRequirements();});
   $('draft').textContent=draftSkeleton(state.requirements);
 }
 function analyze(){const text=$('sourceText').value.trim();if(!text){$('sourceText').focus();return;}state.requirements=splitRequirements(text);show('analysisCard');show('feedbackCard');renderRequirements();$('analysisCard').scrollIntoView({behavior:'smooth'});}
 function loadSample(){show('profileCard');show('sourceCard');state.sector='construction';renderSectors();$('sourceText').value=sampleConstruction();$('sourceUrl').value='synthetic://construction-red-team-v1';analyze();}
 $('startBtn').onclick=()=>{show('profileCard');show('sourceCard');renderSectors();$('profileCard').scrollIntoView({behavior:'smooth'});};
 $('sampleBtn').onclick=loadSample;$('analyzeBtn').onclick=analyze;
 $('clearBtn').onclick=()=>{$('sourceText').value='';$('sourceUrl').value='';state.requirements=[];$('analysisCard').classList.add('hidden');$('feedbackCard').classList.add('hidden');};
 $('scoreRows').innerHTML=SCORE_DIMS.map(([k,l])=>`<div class="score"><label for="score-${k}">${l}</label><select class="field" id="score-${k}" data-score="${k}">${scoreOptions()}</select></div>`).join('');
 $('scoreRows').querySelectorAll('[data-score]').forEach(el=>el.onchange=()=>{state.scores[el.dataset.score]=Number(el.value)||null;});
 async function sendFeedback(){
   const status=$('feedbackStatus');const found=$('foundIssue').value,useful=$('useful').value,clear=$('clearNext').value;
   const complete=SCORE_DIMS.every(([k])=>Number.isInteger(state.scores[k]))&&found&&useful&&clear;
   if(!complete){status.className='status err';status.textContent='Fyll i alla expertbetyg och de tre ja/nej-frågorna först.';return;}
   const payload={app_version:APP_VERSION,language:'sv',flow:'procurement_expert_review',learned_new:found==='yes',useful:useful==='yes',next_step_clear:clear==='yes',ratings:{...state.scores}};
   status.className='status';status.textContent='Skickar…';
   try{const res=await fetch(FEEDBACK_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw new Error('HTTP '+res.status);status.className='status ok';status.textContent='Tack. Strukturerad expertfeedback skickad utan underlagstext eller företagsuppgifter.';}catch(e){status.className='status err';status.textContent='Feedback kunde inte skickas just nu. Betygen ligger kvar på sidan så du kan försöka igen.';}
 }
 $('sendFeedback').onclick=sendFeedback;
 $('copyReport').onclick=async()=>{const s=summarize(state.requirements);const report=['Stödassistenten – expertpilot offentlig upphandling',`Sektor: ${state.sector}`,`Analyserade rader: ${state.requirements.length}`,`Blockerande evidensluckor: ${s.blocking.length}`,`Osäkra/ej bedömda: ${s.uncertain.length}`,'Expertbetyg:',...SCORE_DIMS.map(([k,l])=>`- ${l}: ${state.scores[k]||'ej satt'}`),`Produktfel hittat: ${$('foundIssue').value||'ej satt'}`,`Användbart stöd: ${$('useful').value||'ej satt'}`,`Nästa steg tydligt: ${$('clearNext').value||'ej satt'}`].join('\n');try{await navigator.clipboard.writeText(report);$('feedbackStatus').className='status ok';$('feedbackStatus').textContent='Lokalt testprotokoll kopierat. Det innehåller inte inklistrad underlagstext.';}catch(e){$('feedbackStatus').className='status err';$('feedbackStatus').textContent='Kunde inte kopiera automatiskt. Använd webbläsarens kopieringsfunktion.';}};
 renderSectors();
}
const api={classifyRequirement,evidenceQuestion,splitRequirements,summarize,draftSkeleton,sampleConstruction,LABELS,CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ProcurementExpert=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',browserInit);else browserInit();}
})(typeof window!=='undefined'?window:globalThis);
