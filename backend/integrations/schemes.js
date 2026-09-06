import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../data/schemes');
const file=path.join(dir,'verified.json');
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const isYes=value=>value===true||String(value||'').toLowerCase()==='yes';
const isStandUpCategory=profile=>String(profile.gender||'').toLowerCase()==='woman'||['sc','st'].includes(String(profile.socialCategory||'').toLowerCase());

export async function getVerifiedSchemes(){
  try{
    const list=JSON.parse(await readFile(file,'utf8'));
    const now=Date.now();
    return list.map(s=>({...s,status:s.status==='ACTIVE'&&new Date(s.last_verified||s.lastVerified||0).getTime()<now-180*86400000?'STALE':s.status||'UNVERIFIED'}));
  }catch{return[]}
}

export async function importSchemes(records){
  if(!Array.isArray(records))throw Error('Import must be a JSON array');
  await mkdir(dir,{recursive:true});
  const clean=records.filter(x=>x&&x.name&&(x.officialSource||x.official_url)&&(x.sourceName||x.source_name)).map((x,i)=>({
    id:x.id||'import-'+Date.now()+'-'+i,name:x.name,description:x.description||'',maxAmount:x.maxAmount??x.maximum_amount??null,amountLabel:x.amountLabel||'',bestFor:x.bestFor||'',benefits:x.benefits||[],requirements:x.requirements||[],eligibility:x.eligibility||'Check official source',documents:x.documents||x.required_documents||[],applicationSteps:x.applicationSteps||[],officialSource:x.officialSource||x.official_url,official_url:x.officialSource||x.official_url,source_url:x.source_url||x.officialSource||x.official_url,sourceName:x.sourceName||x.source_name,source_name:x.sourceName||x.source_name,ministry:x.ministry||'',department:x.department||'',state:x.state||'India',business_types:x.business_types||[],minimum_amount:x.minimum_amount??null,maximum_amount:x.maximum_amount??x.maxAmount??null,lastVerified:x.lastVerified||x.last_verified||new Date().toISOString().slice(0,10),last_verified:x.lastVerified||x.last_verified||new Date().toISOString().slice(0,10),retrieved_at:new Date().toISOString(),status:['ACTIVE','OFFICIAL_RESOURCE'].includes(x.status)?x.status:'UNVERIFIED'
  }));
  const old=await getVerifiedSchemes(),merged=[...old.filter(x=>!clean.some(y=>y.id===x.id)),...clean];
  await writeFile(file,JSON.stringify(merged,null,2));
  return clean;
}

function scoreFor(scheme,profile){
  const loan=number(profile.loanRequirement||profile.loanAmount),state=String(profile.state||'Maharashtra'),business=String(profile.business||''),reasons=[],warnings=[];
  const add=(points,reason)=>{reasons.push(reason);return points};
  let score=0;
  if(scheme.id==='pmmy'){
    score+=add(30,'Your business is a small income-generating activity.');
    score+=loan>0&&loan<=2000000?add(30,'Your requested amount is within the published PMMY maximum.'):add(5,'Your requested amount needs a lender check.');
    score+=profile.stage==='new'?add(15,'You are planning a new business.'):add(15,'You already run a business.');
    score+=add(15,'PMMY is available through participating lenders across India.');
    if(loan>2000000)warnings.push('The amount is above the published PMMY maximum.');
  }else if(scheme.id==='pm-svanidhi'){
    score+=isYes(profile.streetVendor)?add(55,'You said you are a street vendor.'):add(8,'Street-vendor status still needs checking.');
    score+=loan>0&&loan<=50000?add(25,'Your requested amount is within the published progressive-loan maximum.'):add(3,'Your requested amount may be above the applicable loan step.');
    score+=(scheme.business_types||[]).includes(business)?add(10,'Your selected business can fit a vendor activity.'):add(4,'Your business activity needs a local eligibility check.');
    score+=add(10,'The programme is available through the official scheme process.');
    if(!isYes(profile.streetVendor))warnings.push('PM SVANidhi is for eligible street vendors; vendor proof is required.');
  }else if(scheme.id==='stand-up-india'){
    score+=isStandUpCategory(profile)?add(45,'Your voluntary profile detail may fit the women or SC/ST condition.'):add(5,'Women or SC/ST entrepreneur condition still needs checking.');
    score+=profile.stage==='new'?add(25,'You selected a new business.'):add(5,'Stand-Up India is intended for a new (greenfield) business.');
    score+=loan>=1000000&&loan<=10000000?add(20,'Your requested amount is within the published range.'):add(3,'Your requested amount is outside or not yet within the published range.');
    score+=add(10,'Your activity needs to be checked with the participating bank.');
    if(!isStandUpCategory(profile))warnings.push('This scheme has a women or SC/ST entrepreneur condition.');
    if(profile.stage!=='new')warnings.push('This scheme is for a new (greenfield) enterprise.');
  }else if(scheme.id==='maharashtra-msme-support'){
    score+=state==='Maharashtra'?add(55,'Your selected location is Maharashtra.'):add(0,'This official resource is for Maharashtra programmes.');
    score+=business?add(25,'You have selected a business activity.'):0;
    score+=add(10,'Use this card to explore current official support information.');
    warnings.push('This is an official-resource discovery card, not one loan scheme or an eligibility decision.');
  }
  return {eligibilityScore:Math.max(0,Math.min(100,Math.round(score))),matchReasons:reasons,warnings,recommendation:score>=75?'POSSIBLE_MATCH':'CHECK_DETAILS'};
}

export function matchVerified(profile={},schemes=[]){
  return schemes.filter(s=>['ACTIVE','OFFICIAL_RESOURCE'].includes(s.status)).map(s=>({...s,...scoreFor(s,profile)})).sort((a,b)=>b.eligibilityScore-a.eligibilityScore);
}
