import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const configFile=path.join(root,'data','datagov','datasets.json');
const cacheRoot=path.join(root,'data','datagov','cache');
const endpoint='https://api.data.gov.in/resource/';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export class DataGovError extends Error { constructor(message,code='DATA_GOV_ERROR'){super(message);this.code=code} }
export async function datasetConfig(){return JSON.parse(await readFile(configFile,'utf8'))}
export async function cachePath(dataset){return path.join(cacheRoot,dataset+'.json')}
export async function readDataGovCache(dataset){try{return JSON.parse(await readFile(await cachePath(dataset),'utf8'))}catch{return null}}
export async function writeDataGovCache(dataset,payload){
  if(!Array.isArray(payload.records)||payload.records.length===0)throw new DataGovError('Refusing to replace a cache with an empty response.','EMPTY_RESPONSE');
  await mkdir(cacheRoot,{recursive:true});
  await writeFile(await cachePath(dataset),JSON.stringify(payload,null,2));
}
function apiUrl(resourceId,params={}){
  const url=new URL(endpoint+encodeURIComponent(resourceId));
  url.searchParams.set('format','json');
  for(const [key,value] of Object.entries(params)){if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value))}
  return url;
}
export async function getDataGovResource(resourceId,{limit=100,offset=0,filters={},timeoutMs=12000,retries=2}={}){
  if(!resourceId)throw new DataGovError('No verified data.gov.in resource ID is configured.','RESOURCE_UNCONFIGURED');
  const apiKey=process.env.DATA_GOV_API_KEY;
  if(!apiKey)throw new DataGovError('DATA_GOV_API_KEY is not configured.','API_KEY_MISSING');
  const params={limit:Math.min(Math.max(Number(limit)||100,1),1000),offset:Math.max(Number(offset)||0,0),'api-key':apiKey};
  for(const [field,value] of Object.entries(filters))params['filters['+field+']']=value;
  let lastError;
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(apiUrl(resourceId,params),{signal:controller.signal,headers:{accept:'application/json'}});
      if(response.status===429||response.status>=500)throw new DataGovError('data.gov.in temporary response: '+response.status,'RETRYABLE');
      if(!response.ok)throw new DataGovError('data.gov.in request failed: '+response.status,'HTTP_'+response.status);
      const payload=await response.json();
      if(!payload||!Array.isArray(payload.records))throw new DataGovError('data.gov.in response has no records array.','INVALID_RESPONSE');
      return payload;
    }catch(error){lastError=error;if(attempt<retries&&(error.code==='RETRYABLE'||error.name==='AbortError'))await delay(300*(attempt+1));else break}finally{clearTimeout(timer)}
  }
  throw lastError instanceof DataGovError?lastError:new DataGovError(lastError?.message||'data.gov.in request failed.');
}
export async function getAllDataGovRecords(resourceId,{pageSize=1000,filters={},maxPages=100}={}){
  let offset=0,records=[],last;
  for(let page=0;page<maxPages;page++){
    last=await getDataGovResource(resourceId,{limit:pageSize,offset,filters});
    records.push(...last.records);
    if(last.records.length<pageSize)break;
    offset+=last.records.length;
  }
  return {records,sourceUpdatedAt:last?.updated_date||last?.updatedAt||null};
}
