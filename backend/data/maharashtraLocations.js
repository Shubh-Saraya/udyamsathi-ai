import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { census2011Source,census2011Villages } from './census2011.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data','locations','maharashtra_villages_real.json'),'utf8'));
const rawVillages=Array.isArray(data.villages)?data.villages:[];
// Some LGD exports repeat an unchanged row. A repeated LGD village code is not
// a second location, so retain one canonical record for every code.
const lgdVillages=[...new Map(rawVillages.map(v=>[String(v.villageCode),{...v,identitySource:'LGD'}])).values()];
const lgdCodes=new Set(lgdVillages.map(v=>String(v.villageCode)));
// Census-only records are deliberately retained. This lets the app return the
// validated Census values for every village present in the imported workbook,
// including historic villages whose LGD code is no longer in the local export.
const censusOnlyVillages=census2011Villages().filter(v=>!lgdCodes.has(String(v.villageCode))).map(v=>({
  stateCode:v.stateCode,state:'Maharashtra',districtCode:v.districtCode,district:v.district,
  subdistrictCode:String(v.subdistrictCode).replace(/^0+/,'')||'0',subdistrict:v.subdistrict,
  villageCode:v.villageCode,censusVillageCode:v.villageCode,village:v.village,pincode:null,identitySource:'CENSUS_2011'
}));
const villages=[...lgdVillages,...censusOnlyVillages];
const normalize=value=>String(value??'').toLowerCase().trim().replace(/[.,/\\-]+/g,' ').replace(/\s+/g,' ');
const byDistrict=new Map(),byDistrictSubdistrict=new Map(),byCode=new Map(),byPin=new Map(),searchIndex=new Map();
const add=(map,key,value)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(value)};
const indexTerm=(term,village)=>{for(const word of normalize(term).split(' ')){for(let i=2;i<=word.length;i++)add(searchIndex,word.slice(0,i),village)}};
for(const village of villages){
  const district=normalize(village.district),subdistrict=normalize(village.subdistrict);
  add(byDistrict,district,village);add(byDistrictSubdistrict,district+'|'+subdistrict,village);add(byCode,String(village.villageCode),village);add(byPin,String(village.pincode),village);
  for(const field of [village.village,village.subdistrict,village.district,village.pincode,village.villageCode])indexTerm(field,village);
}
const order=(a,b)=>a.village.localeCompare(b.village)||a.subdistrict.localeCompare(b.subdistrict)||a.district.localeCompare(b.district);
export const source=()=>({name:data.source?.name||'Local Government Directory (LGD)',publisher:data.source?.publisher||'Government of India',dataset:data.source?.dataset||'Villages with PIN Codes',sourceType:'official_government_dataset',generatedAt:data.generatedAt,totalVillages:villages.length,lgdVillages:lgdVillages.length,censusOnlyVillages:censusOnlyVillages.length,censusSource:census2011Source().name,state:data.state||'Maharashtra'});
export const formatLocation=v=>({id:String(v.villageCode),text:`${v.village}, ${v.subdistrict}, ${v.district}, ${v.state} - ${v.pincode||'PIN unavailable'}`,name:v.village,address:`${v.subdistrict}, ${v.district}, ${v.state}${v.pincode?` - ${v.pincode}`:''}`,state:v.state,stateCode:v.stateCode,district:v.district,districtCode:v.districtCode,subdistrict:v.subdistrict,subdistrictCode:v.subdistrictCode,village:v.village,villageCode:v.villageCode,censusVillageCode:v.censusVillageCode||null,pincode:v.pincode||null,identitySource:v.identitySource||'LGD'});
export function districts(){return [...byDistrict.values()].map(rows=>rows[0]).map(v=>({name:v.district,code:v.districtCode})).sort((a,b)=>a.name.localeCompare(b.name))}
export function subdistricts(district){return [...new Map((byDistrict.get(normalize(district))||[]).map(v=>[v.subdistrictCode,{name:v.subdistrict,code:v.subdistrictCode}])).values()].sort((a,b)=>a.name.localeCompare(b.name))}
export function villagesFor({district,subdistrict,limit=200}={}){let rows=byDistrict.get(normalize(district))||[];if(subdistrict)rows=byDistrictSubdistrict.get(normalize(district)+'|'+normalize(subdistrict))||[];return rows.slice().sort(order).slice(0,Math.min(Math.max(Number(limit)||200,1),300)).map(formatLocation)}
export function searchLocations(input,{district,subdistrict,limit=10}={}){let query=normalize(input);if(!query)return[];let tokens=query.split(' ').filter(Boolean),candidateSets=tokens.map(t=>new Set(searchIndex.get(t)||[]));if(candidateSets.some(s=>!s.size))return[];let rows=[...candidateSets.sort((a,b)=>a.size-b.size)[0]].filter(v=>candidateSets.every(set=>set.has(v)));if(district)rows=rows.filter(v=>normalize(v.district)===normalize(district));if(subdistrict)rows=rows.filter(v=>normalize(v.subdistrict)===normalize(subdistrict));return rows.sort(order).slice(0,Math.min(Math.max(Number(limit)||10,1),25)).map(formatLocation)}
export function findLocations({district,subdistrict,village,pincode,villageCode}={}){let rows=villageCode?byCode.get(String(villageCode))||[]:pincode?byPin.get(String(pincode))||[]:district?byDistrict.get(normalize(district))||[]:villages;return rows.filter(v=>(!district||normalize(v.district)===normalize(district))&&(!subdistrict||normalize(v.subdistrict)===normalize(subdistrict))&&(!village||normalize(v.village)===normalize(village))).map(formatLocation)}
