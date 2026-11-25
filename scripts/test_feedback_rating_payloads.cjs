// Source-expression tests only. No browser, gateway, HTTP or database evidence.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const files=["client/adult-extra-costs-guidance.js", "client/child-maintenance-guidance.js", "client/disability-home-support-guidance.js", "client/employee-sick-guidance.js", "client/employee-sick-work-context-extension.js", "client/job-premium-guidance.js", "client/mobility-transport-guidance.js", "client/older-home-support-guidance.js", "client/pension-housing.js", "client/student-finance-guidance.js", "client/unemployed-sick-guidance.js"];
const contract=JSON.parse(fs.readFileSync(path.join(root,'config/feedback_rating_contract.json'),'utf8'));
const allowed=new Set(contract.allowed_rating_keys);
function accepts(ratings){
 if(ratings===null||typeof ratings!=='object'||Array.isArray(ratings))return false;
 const rows=Object.entries(ratings);
 return rows.length<=contract.server_requirement.max_keys && rows.every(([k,v])=>allowed.has(k)&&Number.isInteger(v)&&v>=1&&v<=5);
}
const results=[];
for(const file of files){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const matches=[...source.matchAll(/ratings\s*:\s*(\{[^{}]*\})/g)];
 if(matches.length!==1)throw new Error(`Expected one bounded ratings literal: ${file}`);
 // Context is synthetic and deliberately does not emulate the full UI.
 const ratings=vm.runInNewContext('('+matches[0][1]+')',{
  nextStep:()=> 'synthetic_route',state:{agreementArea:'unknown',workContext:'self_employed',businessForm:'unknown'},
  collectiveMode:false,topic:'income',need:'unsure',purpose:'unsure'
 },{timeout:1000});
 results.push({case:file,pass:accepts(ratings),keys:Object.keys(ratings)});
}
for(const [name,ratings,expected] of [
 ['empty ratings remain valid',{},true],
 ['numeric minimum and maximum remain valid',{m1:1,m4:5},true],
 ['procurement numeric score remains valid',{source_trace:4},true],
 ['unknown key rejected',{unlisted_numeric:4},false],
 ['string score rejected',{m1:'4'},false],
 ['boolean score rejected',{m1:true},false],
 ['score zero rejected',{m1:0},false],
 ['score six rejected',{m1:6},false],
 ['fractional score rejected',{m1:2.5},false],
 ['array rejected',[],false]
])results.push({case:name,pass:accepts(ratings)===expected});
const report={level:'offline source-expression and local rating-contract test; NOT browser/HTTP/persistence',
 passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
console.log(JSON.stringify(report,null,2));
process.exitCode=report.failed?1:0;
