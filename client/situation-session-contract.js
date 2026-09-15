(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.STODSituationSessionContract=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  // Public-safe state shape only. Matching/ranking rules, prompts, secrets and
  // sensitive situation handling belong behind the private product boundary.
  const CONTRACT_VERSION='1.0.0';
  const SURFACES=Object.freeze(['web','ios','android']);
  const LANGUAGES=Object.freeze(['sv','ar','fa']);
  const ACTOR_TYPES=Object.freeze([
    'private_person','relative','student','employee',
    'company','association','property_actor','other'
  ]);
  const CAPABILITY_FACT_ALLOWLISTS=Object.freeze({
    student_csn:Object.freeze(['topic','study_context','study_work']),
    employee_sick:Object.freeze(['work_context','business_form']),
    family_housing:Object.freeze(['work','money','children','housing'])
  });
  const FORBIDDEN_KEYS=Object.freeze([
    'q','query','story','situation','raw_situation','rawSituation','diagnosis',
    'medical_note','journal','address','personnummer','name','email','phone',
    'income','salary','employer','child_name','company_name','bank_account',
    'password','token'
  ]);
  const FORBIDDEN_NORMALIZED=new Set(FORBIDDEN_KEYS.map(v=>v.toLowerCase()));
  const TOKEN_RE=/^[a-z0-9_-]+$/i;
  const MAX_VALUE_LENGTH=64;

  function member(value,allowed,fallback,name){
    const v=String(value==null?'':value).toLowerCase();
    if(!v&&fallback!=null)return fallback;
    if(!allowed.includes(v))throw new TypeError(`${name} is not allowed`);
    return v;
  }
  function token(value,name,{nullable=false}={}){
    if(value==null||value===''){
      if(nullable)return null;
      throw new TypeError(`${name} is required`);
    }
    const v=String(value);
    if(v.length>MAX_VALUE_LENGTH||!TOKEN_RE.test(v))throw new TypeError(`${name} must be a short coarse token`);
    return v.toLowerCase();
  }
  function factKey(value){
    const key=token(value,'coarse fact key');
    if(FORBIDDEN_NORMALIZED.has(key.toLowerCase()))throw new TypeError(`forbidden coarse fact key: ${key}`);
    return key;
  }
  function factValue(value,key){
    if(typeof value==='boolean')return value?'true':'false';
    if(typeof value==='number'&&Number.isFinite(value))return String(value);
    return token(value,`coarse fact ${key}`);
  }
  function normalizeFacts(input){
    if(input==null)return {};
    if(typeof input!=='object'||Array.isArray(input))throw new TypeError('coarseFacts must be an object');
    const out={};
    for(const [rawKey,rawValue] of Object.entries(input)){
      const key=factKey(rawKey);
      out[key]=factValue(rawValue,key);
    }
    return out;
  }
  function normalizeMissingFacts(input){
    if(input==null)return [];
    if(!Array.isArray(input))throw new TypeError('missingFacts must be an array');
    return Array.from(new Set(input.map(v=>factKey(v))));
  }
  function makeSessionProfile(input={}){
    if(typeof input!=='object'||Array.isArray(input))throw new TypeError('session profile input must be an object');
    const surface=member(input.surface,SURFACES,'web','surface');
    const language=member(input.language,LANGUAGES,'sv','language');
    const actorType=member(input.actorType,ACTOR_TYPES,'private_person','actorType');
    const focus=token(input.focus,'focus',{nullable:true});
    const coarseFacts=normalizeFacts(input.coarseFacts);
    const missingFacts=normalizeMissingFacts(input.missingFacts);
    const rawSituation=input.rawSituation==null?null:String(input.rawSituation);
    return Object.freeze({
      contractVersion:CONTRACT_VERSION,
      surface,
      language,
      actorType,
      focus,
      coarseFacts:Object.freeze(coarseFacts),
      missingFacts:Object.freeze(missingFacts),
      ephemeral:Object.freeze({rawSituation})
    });
  }
  function allowlistSet(values){
    if(values==null)return new Set();
    if(!Array.isArray(values))throw new TypeError('allowedFactKeys must be an array');
    return new Set(values.map(v=>factKey(v)));
  }
  function allowedFactKeysForFocus(focus){
    const key=token(focus,'focus',{nullable:true});
    if(!key)return [];
    const configured=CAPABILITY_FACT_ALLOWLISTS[key];
    return configured?Array.from(configured):[];
  }
  function safeFacts(profile,allowedFactKeys){
    const allowed=allowlistSet(allowedFactKeys);
    const out={};
    for(const [key,value] of Object.entries(profile.coarseFacts||{})){
      if(!allowed.has(key))throw new TypeError(`coarse fact is not allowlisted for this capability: ${key}`);
      out[key]=factValue(value,key);
    }
    return out;
  }
  function buildPublicHandoff(profile,{allowedFactKeys=[]}={}){
    if(!profile||profile.contractVersion!==CONTRACT_VERSION)throw new TypeError('profile does not match the situation/session contract');
    const params=new URLSearchParams();
    params.set('actor_type',member(profile.actorType,ACTOR_TYPES,null,'actorType'));
    if(profile.focus)params.set('focus',token(profile.focus,'focus'));
    params.set('lang',member(profile.language,LANGUAGES,null,'language'));
    for(const [key,value] of Object.entries(safeFacts(profile,allowedFactKeys)))params.set(key,value);
    return params.toString();
  }
  function toSafeSessionSnapshot(profile,{allowedFactKeys=[]}={}){
    if(!profile||profile.contractVersion!==CONTRACT_VERSION)throw new TypeError('profile does not match the situation/session contract');
    return Object.freeze({
      contract_version:CONTRACT_VERSION,
      surface:member(profile.surface,SURFACES,null,'surface'),
      language:member(profile.language,LANGUAGES,null,'language'),
      actor_type:member(profile.actorType,ACTOR_TYPES,null,'actorType'),
      focus:profile.focus?token(profile.focus,'focus'):null,
      coarse_facts:Object.freeze(safeFacts(profile,allowedFactKeys))
    });
  }

  return Object.freeze({
    CONTRACT_VERSION,SURFACES,LANGUAGES,ACTOR_TYPES,CAPABILITY_FACT_ALLOWLISTS,FORBIDDEN_KEYS,MAX_VALUE_LENGTH,
    makeSessionProfile,allowedFactKeysForFocus,buildPublicHandoff,toSafeSessionSnapshot
  });
});
