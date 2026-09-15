(function(root){
'use strict';
const APP_VERSION='procurement-expert-0.2.1';
const FEEDBACK_ENDPOINT='https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback';
const CATEGORIES=['exclusion','qualification','mandatory','award','contract','commercial','deadline','uncertain'];
const LABELS={exclusion:'Uteslutningsgrund',qualification:'Kvalificeringskrav',mandatory:'Obligatoriskt/ska-krav',award:'Tilldelningskriterium',contract:'Avtals-/utförandevillkor',commercial:'Pris/kommersiellt',deadline:'Datum och process',uncertain:'Osäker – kontrollera källa'};
const SECTORS=[['construction','Bygg / entreprenad'],['cleaning','Städ / facility'],['consulting','Konsult / professionella tjänster'],['property','Fastighet / drift'],['other','Annan SME-kategori']];
const SCORE_DIMS=[
 ['category_match','Relevans för testfallet'],
 ['requirement_extraction','Hittade rätt krav'],
 ['requirement_classification','Kravklassificering'],
 ['evidence_checklist','Tydliga dokument och bevis'],
 ['followup_questions','Relevanta kontrollfrågor'],
 ['draft_fidelity','Svarsmallen följer underlaget'],
 ['deadline_process','Datum och process'],
 ['source_trace','Hänvisningar till rätt rad'],
 ['false_confidence','Tydlig osäkerhet']
];
const state={sector:null,requirements:[],scores:{},sending:false,feedbackEpoch:0,controller:null};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalized(line){return String(line||'').toLowerCase().replace(/\s+/g,' ').trim();}
function classifyRequirement(line){
 const t=normalized(line);
 if(!t)return 'uncertain';
 if(/sista anbudsdag|senast den|deadline|anbud ska vara.*tillhanda|frågor.*senast|giltighetstid för anbud/.test(t))return 'deadline';
 if(/tilldelningskriter|utvärder|\bmervärde\b|poäng|bästa förhållandet|lägsta pris/.test(t))return 'award';
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
function isStructuralHeading(line){
 const t=normalized(line).replace(/^\d+(?:\.\d+)*[.)]?\s+/,'').replace(/:$/,'').trim();
 return /^(obligatoriska krav|ska-krav|kvalificeringskrav|tilldelningskriterier|utvärderingskriterier|kommersiella villkor|kontraktsvillkor|administrativa föreskrifter|kravspecifikation|tekniska krav|tidplan|viktiga datum)$/.test(t);
}
function structureFlags(line){
 const raw=String(line||'');
 const t=normalized(raw);
 const flags=[];
 if(raw.length>600)flags.push({code:'long_paragraph',label:'Långt stycke – kan innehålla flera krav. Dela upp manuellt eller kontrollera raden extra.'});
 if(/\bbilaga\b|\bappendix\b|\bannex\b/.test(t))flags.push({code:'attachment_reference',label:'Bilagehänvisning – bilagans innehåll är inte analyserat här.'});
 if(/\b(men|dock|förutsatt att|om inte|undantag|alternativt|i förekommande fall|gäller inte om|endast om|såvida inte|under förutsättning att|med undantag för|utom när|förutom)\b/.test(t)||/\bantingen\b.*\beller\b/.test(t))flags.push({code:'conditional_or_exception',label:'Villkor eller undantag i samma rad – kontrollera manuellt vad som faktiskt gäller.'});
 if(/\b(?:se|enligt|jfr|jämför med)\s+(?:punkt|avsnitt|kapitel)\s+\d+(?:[.:]\d+)*\b/.test(t))flags.push({code:'cross_reference',label:'Korshänvisning – kontrollera den hänvisade punkten i originalunderlaget; den är inte hämtad eller verifierad här.'});
 return flags;
}
// This is a bounded, local first-pass sorter, not complete document analysis.
function splitRequirements(text){
 const source=String(text||'');
 if(source.length>100000)throw new RangeError('Underlaget är för långt. Klistra in högst 100 000 tecken åt gången. Ingen analys har gjorts.');
 const lines=source.split(/\r\n|\r|\n/).map((text,i)=>({text:text.trim(),sourceLine:i+1})).filter(r=>r.text.length>0);
 if(lines.length>400)throw new RangeError('Underlaget innehåller för många rader. Gränsen är 400 icke-tomma rader per analys. Ingen text har kapats och ingen analys har gjorts.');
 return lines.map((r,i)=>{
   const kind=isStructuralHeading(r.text)?'structural':'requirement';
   const category=kind==='structural'?'uncertain':classifyRequirement(r.text);
   return {id:i+1,text:r.text,sourceLine:r.sourceLine,kind,category,evidence:kind==='structural'?'context':'unknown',question:kind==='structural'?'Bevarad källrubrik – ingen evidensbedömning görs på rubriken.':evidenceQuestion(r.text,category),flags:kind==='structural'?[]:structureFlags(r.text)};
 });
}
function summarize(reqs){
 const actionable=reqs.filter(r=>r.kind!=='structural');
 const counts={};CATEGORIES.forEach(c=>counts[c]=0);actionable.forEach(r=>counts[r.category]=(counts[r.category]||0)+1);
 const blocking=actionable.filter(r=>r.evidence==='missing');
 const uncertain=actionable.filter(r=>r.category==='uncertain'||r.evidence!=='yes'||(r.flags||[]).length>0);
 let decision='Kontrollera raderna mot hela upphandlingsunderlaget';
 let tone='notice';
 if(blocking.length){decision='Underlag saknas för en eller flera rader – kontrollera luckorna';tone='warn';}
 else if(actionable.length && !uncertain.length){decision='Raderna är genomgångna av dig – hela anbudet är inte verifierat';}
 else if(!actionable.length&&reqs.length){decision='Endast struktur/rubriker identifierades – kontrollera originalunderlaget innan du bedömer krav';}
 return {counts,blocking,uncertain,decision,tone,actionableCount:actionable.length,structuralCount:reqs.length-actionable.length};
}
function buildFeedbackPayload(found,useful,clear,ratings){
 if([found,useful,clear].some(v=>typeof v!=='boolean'))throw new TypeError('Tre ja/nej-svar behövs.');
 const safe={};
 const allowed=new Set(SCORE_DIMS.map(([key])=>key));
 if(!ratings||typeof ratings!=='object'||Array.isArray(ratings))throw new TypeError('Betyg saknas.');
 for(const [key,value] of Object.entries(ratings)){
   if(!allowed.has(key)||!Number.isInteger(value)||value<1||value>5)throw new TypeError('Ogiltigt betyg.');
   safe[key]=value;
 }
 return {app_version:APP_VERSION,language:'sv',flow:'procurement_expert_review',learned_new:found,useful:useful,next_step_clear:clear,ratings:safe};
}
function draftSkeleton(reqs){
 if(!reqs.length)return 'Ingen kravtext analyserad ännu.';
 return reqs.map(r=>{
   const src=`Källa rad ${r.sourceLine??r.id}`;
   if(r.kind==='structural')return `${src} • Källrubrik / struktur\n${r.text}\nIngen evidensbedömning görs på rubriken.\n`;
   const risk=(r.flags||[]).length?`\nKontroll: ${(r.flags||[]).map(f=>f.label).join(' ')}`:'';
   if(r.evidence==='missing')return `${src} • ${LABELS[r.category]}\nKravtext: ${r.text}${risk}\nSTOPP: saknat styrkbart bevis. Kontrollera vilket svar eller underlag som faktiskt krävs. Ingen slutsats om godkänt anbud kan dras.\n`;
   const ev=r.evidence==='yes'?'[ange exakt dokument/bevis och avsnitt]':r.evidence==='na'?'[ej tillämpligt – motivera mot underlaget]':'[verifiera vilket bevis/svar som krävs]';
   return `${src} • ${LABELS[r.category]}\nKrav: ${r.text}${risk}\nSvar: [beskriv endast verifierbart hur kravet hanteras]\nBevis: ${ev}\n`;
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
function scoreOptions(){return '<option value="">Välj</option><option value="na">Ej bedömt</option><option value="5">5 – korrekt/starkt</option><option value="4">4 – mindre brist</option><option value="3">3 – blandat</option><option value="2">2 – tydlig brist</option><option value="1">1 – fel/riskabelt</option>';}
function browserInit(){
 const $=id=>document.getElementById(id);
 const show=id=>$(id).classList.remove('hidden');
 const sectorGrid=$('sectorGrid');
 const sourceError=document.createElement('p');sourceError.id='sourceError';sourceError.setAttribute('role','alert');
 $('sourceText').after(sourceError);$('sourceText').setAttribute('aria-describedby','sourceError');
 function resetFeedback(){
   state.feedbackEpoch++;if(state.controller)state.controller.abort();state.controller=null;state.sending=false;state.scores={};
   document.querySelectorAll('[data-score]').forEach(el=>el.value='');
   ['foundIssue','useful','clearNext'].forEach(id=>$(id).value='');
   $('feedbackStatus').textContent='';$('feedbackStatus').className='';$('sendFeedback').disabled=false;
   if($('advancedFeedback'))$('advancedFeedback').open=false;
 }
 function invalidateAnalysis(){
   state.requirements=[];resetFeedback();$('analysisCard').classList.add('hidden');$('feedbackCard').classList.add('hidden');
   $('summary').textContent='';$('priorityOverview').textContent='';$('requirements').textContent='';$('draft').textContent='';
   if($('reviewDetails'))$('reviewDetails').open=false;
 }
 $('sourceText').addEventListener('input',()=>{invalidateAnalysis();sourceError.textContent='';$('sourceText').removeAttribute('aria-invalid');});
 function renderSectors(){
   sectorGrid.innerHTML=SECTORS.map(([v,l])=>`<button class="choice ${state.sector===v?'active':''}" aria-pressed="${state.sector===v}" data-sector="${v}">${l}</button>`).join('');
   sectorGrid.querySelectorAll('[data-sector]').forEach(b=>b.onclick=()=>{state.sector=b.dataset.sector;sectorGrid.querySelectorAll('[data-sector]').forEach(el=>{el.classList.toggle('active',el.dataset.sector===state.sector);el.setAttribute('aria-pressed',String(el.dataset.sector===state.sector));});});
 }
 function renderPriorityOverview(s){
   const priority=state.requirements.filter(r=>r.kind!=='structural'&&(r.evidence==='missing'||r.category==='uncertain'||(r.flags||[]).length>0));
   const top=priority.slice(0,3);
   let intro='Börja med en kravrad där du kan kontrollera beviset mot originalunderlaget.';
   if(s.blocking.length)intro='Börja med de rader där underlag saknas innan du går vidare.';
   else if(priority.length)intro='Börja med de markerade riskerna och kontrollera dem mot originalunderlaget.';
   const items=top.map(r=>{
     const explicitRisk=(r.flags||[]).map(f=>f.label).join(' ');
     const reason=r.evidence==='missing'?'Saknat underlag':explicitRisk||(r.category==='uncertain'?'Oklar kravtyp':'Kontrollera raden');
     return `<li><strong>Källa rad ${r.sourceLine??r.id}:</strong> ${esc(reason)}</li>`;
   }).join('');
   const more=priority.length>top.length?`<p class="micro">Ytterligare ${priority.length-top.length} riskmarkeringar finns i full granskning.</p>`:'';
   $('priorityOverview').innerHTML=`<div class="priority-box"><h3>Nästa kontroll</h3><p>${esc(intro)}</p>${items?`<ul>${items}</ul>`:''}${more}</div>`;
   $('reviewSummary').textContent=`Full kravgranskning (${s.actionableCount} kravrader${s.structuralCount?` + ${s.structuralCount} källrubriker`:''})`;
   $('openReviewBtn').textContent=s.blocking.length?'Granska saknade underlag':priority.length?'Granska risker och krav':'Öppna full kravgranskning';
 }
 function renderRequirements(){
   const active=document.activeElement;
   const focusAttr=active?.hasAttribute('data-ev')?'data-ev':active?.hasAttribute('data-cat')?'data-cat':null;
   const focusId=focusAttr?active.getAttribute(focusAttr):null;
   const s=summarize(state.requirements);
   $('summary').innerHTML=`<div class="${s.tone}"><b>${esc(s.decision)}</b><br><span class="muted">${s.actionableCount} kravrader analyserade${s.structuralCount?` • ${s.structuralCount} källrubriker bevarade`:''} • ${s.blocking.length} rader med saknat underlag • ${s.uncertain.length} osäkra/ej bedömda</span></div>`;
   renderPriorityOverview(s);
   $('requirements').innerHTML=state.requirements.map(r=>{
     if(r.kind==='structural')return `<article class="req structural-context"><div class="reqhead"><span class="tag">Källrubrik / struktur</span><span class="source">Källa rad ${r.sourceLine??r.id}</span></div><p>${esc(r.text)}</p><p class="muted">Bevarad för källposition. Ingen krav- eller evidensbedömning görs på rubriken.</p></article>`;
     return `<article class="req"><div class="reqhead"><span class="tag">${esc(LABELS[r.category])}</span><span class="source">Källa rad ${r.sourceLine??r.id}</span></div><p>${esc(r.text)}</p>${(r.flags||[]).map(f=>`<p class="micro row-alert"><strong>Kontroll:</strong> ${esc(f.label)}</p>`).join('')}<p class="muted"><b>Kontrollfråga:</b> ${esc(r.question)}</p><div class="grid"><label>Kravtyp<select data-cat="${r.id}">${CATEGORIES.map(c=>`<option value="${c}" ${c===r.category?'selected':''}>${esc(LABELS[c])}</option>`).join('')}</select></label><label>Leverantörens evidens<select data-ev="${r.id}"><option value="unknown" ${r.evidence==='unknown'?'selected':''}>Ej bedömd</option><option value="yes" ${r.evidence==='yes'?'selected':''}>Markerad som styrkt – ej verifierad</option><option value="missing" ${r.evidence==='missing'?'selected':''}>Saknas</option><option value="na" ${r.evidence==='na'?'selected':''}>Ej tillämpligt</option></select></label></div></article>`;
   }).join('');
   $('requirements').querySelectorAll('[data-cat]').forEach(el=>el.onchange=()=>{const r=state.requirements.find(x=>x.id===Number(el.dataset.cat));r.category=el.value;r.question=evidenceQuestion(r.text,r.category);renderRequirements();});
   $('requirements').querySelectorAll('[data-ev]').forEach(el=>el.onchange=()=>{const r=state.requirements.find(x=>x.id===Number(el.dataset.ev));r.evidence=el.value;renderRequirements();});
   $('draft').textContent=draftSkeleton(state.requirements);
   if(focusAttr&&focusId){const target=$('requirements').querySelector('['+focusAttr+'="'+focusId+'"]');if(target)target.focus({preventScroll:true});}
 }
 function analyze(){
   const text=$('sourceText').value;invalidateAnalysis();sourceError.textContent='';$('sourceText').removeAttribute('aria-invalid');
   try{
     if(!text.trim())throw new Error('Klistra in ett underlag eller välj byggfallet.');
     state.requirements=splitRequirements(text);
     show('analysisCard');show('feedbackCard');renderRequirements();
     $('reviewDetails').open=false;$('advancedFeedback').open=false;
     const heading=$('analysisCard').querySelector('h2');heading.setAttribute('tabindex','-1');heading.focus();
   }catch(e){sourceError.textContent=e.message;$('sourceText').setAttribute('aria-invalid','true');$('sourceText').focus();}
 }
 function loadSample(){show('profileCard');show('sourceCard');state.sector='construction';renderSectors();$('sourceText').value=sampleConstruction();$('sourceUrl').value='synthetic://construction-red-team-v1';analyze();}
 function resetCase(){
   $('sourceText').value='';$('sourceUrl').value='';state.sector=null;invalidateAnalysis();renderSectors();
   sourceError.textContent='';$('sourceText').removeAttribute('aria-invalid');show('profileCard');show('sourceCard');$('sourceText').focus();
 }
 $('startBtn').onclick=resetCase;
 $('sampleBtn').onclick=loadSample;$('analyzeBtn').onclick=analyze;
 $('clearBtn').onclick=resetCase;
 $('editSourceBtn').onclick=()=>{$('sourceText').focus();};
 $('restartBtn').onclick=resetCase;
 $('openReviewBtn').onclick=()=>{$('reviewDetails').open=true;$('reviewSummary').focus();};
 $('scoreRows').innerHTML=SCORE_DIMS.map(([k,l])=>`<div class="score"><label for="score-${k}">${l}</label><select class="field" id="score-${k}" data-score="${k}">${scoreOptions()}</select></div>`).join('');
 $('scoreRows').querySelectorAll('[data-score]').forEach(el=>el.onchange=()=>{const v=Number(el.value);if(Number.isInteger(v)&&v>=1&&v<=5)state.scores[el.dataset.score]=v;else delete state.scores[el.dataset.score];});
 async function sendFeedback(){
   if(state.sending)return;
   const status=$('feedbackStatus');const found=$('foundIssue').value,useful=$('useful').value,clear=$('clearNext').value;
   let payload;
   try{
     if(![found,useful,clear].every(v=>v==='yes'||v==='no'))throw new Error('Svara på de tre ja/nej-frågorna.');
     payload=buildFeedbackPayload(found==='yes',useful==='yes',clear==='yes',state.scores);
   }catch(e){status.className='status err';status.textContent=e.message;return;}
   const epoch=state.feedbackEpoch;const controller=new AbortController();state.controller=controller;state.sending=true;$('sendFeedback').disabled=true;
   status.className='status';status.textContent='Skickar…';
   const timeout=setTimeout(()=>controller.abort(),10000);
   try{
     const res=await fetch(FEEDBACK_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
     if(!res.ok)throw new Error('HTTP '+res.status);
     if(epoch!==state.feedbackEpoch)return;
     status.className='status ok';status.textContent='Tack. Strukturerad expertfeedback skickad utan underlagstext eller företagsuppgifter.';
   }catch(e){
     if(epoch!==state.feedbackEpoch)return;
     status.className='status err';status.textContent='Feedback kunde inte skickas just nu. Dina svar ligger kvar på sidan så du kan försöka igen.';
   }finally{
     clearTimeout(timeout);
     if(epoch===state.feedbackEpoch){state.sending=false;state.controller=null;$('sendFeedback').disabled=false;}
   }
 }
 $('sendFeedback').onclick=sendFeedback;
 $('copyReport').onclick=async()=>{const s=summarize(state.requirements);const report=['Stödassistenten – expertpilot offentlig upphandling',`Sektor: ${state.sector||'ej vald'}`,`Kravrader: ${s.actionableCount}`,`Källrubriker bevarade: ${s.structuralCount}`,`Rader med saknat underlag: ${s.blocking.length}`,`Osäkra/ej bedömda: ${s.uncertain.length}`,'Expertbetyg:',...SCORE_DIMS.map(([k,l])=>`- ${l}: ${state.scores[k]||'ej satt'}`),`Produktfel hittat: ${$('foundIssue').value||'ej satt'}`,`Användbart stöd: ${$('useful').value||'ej satt'}`,`Nästa steg tydligt: ${$('clearNext').value||'ej satt'}`].join('\n');try{await navigator.clipboard.writeText(report);$('feedbackStatus').className='status ok';$('feedbackStatus').textContent='Lokalt testprotokoll kopierat. Det innehåller inte inklistrad underlagstext.';}catch(e){$('feedbackStatus').className='status err';$('feedbackStatus').textContent='Kunde inte kopiera automatiskt. Använd webbläsarens kopieringsfunktion.';}};
 renderSectors();
}
const api={classifyRequirement,evidenceQuestion,isStructuralHeading,structureFlags,splitRequirements,summarize,draftSkeleton,sampleConstruction,buildFeedbackPayload,LABELS,CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ProcurementExpert=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',browserInit);else browserInit();}
})(typeof window!=='undefined'?window:globalThis);