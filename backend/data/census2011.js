import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const payload=JSON.parse(fs.readFileSync(path.join(root,'data','census','maharashtra_census_2011_villages.json'),'utf8'));
const normalize=value=>String(value??'').toLowerCase().trim().replace(/[.,/\\-]+/g,' ').replace(/\s+/g,' ');
const padded=(value,width)=>String(value??'').padStart(width,'0');
const byCensusCode=new Map(),byLocation=new Map(),byDistrictVillage=new Map();
const locationKey=({district,subdistrict,village})=>[district,subdistrict,village].map(normalize).join('|');
const districtVillageKey=({district,village})=>[district,village].map(normalize).join('|');

for(const record of payload.villages){
  byCensusCode.set(String(record.villageCode),record);
  const key=locationKey(record);
  if(!byLocation.has(key))byLocation.set(key,[]);
  byLocation.get(key).push(record);
  const districtKey=districtVillageKey(record);
  if(!byDistrictVillage.has(districtKey))byDistrictVillage.set(districtKey,[]);
  byDistrictVillage.get(districtKey).push(record);
}

export const census2011Source=()=>({...payload.source,totalVillages:payload.totalVillages});
export const census2011Villages=()=>payload.villages.slice();
export function findCensus2011({censusVillageCode,villageCode,district,subdistrict,village}={}){
  const code=censusVillageCode??villageCode;
  if(code){
    const match=byCensusCode.get(padded(code,6));
    if(match)return match;
  }
  const matches=byLocation.get(locationKey({district,subdistrict,village}))||[];
  if(matches.length===1)return matches[0];
  const districtMatches=byDistrictVillage.get(districtVillageKey({district,village}))||[];
  return districtMatches.length===1?districtMatches[0]:null;
}
export function censusLiteracyRate(record){
  if(!record||record.population<=record.children0to6)return null;
  return Math.round(record.literates/(record.population-record.children0to6)*1000)/10;
}
