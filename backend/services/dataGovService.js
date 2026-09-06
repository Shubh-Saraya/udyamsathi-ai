import { datasetConfig,getAllDataGovRecords,readDataGovCache,writeDataGovCache } from '../integrations/dataGov.js';
import { normalizeRecords } from './dataGovNormalizers.js';

export async function syncDataGov({log=console.log}={}){
  const config=await datasetConfig(),report=[];
  for(const [id,dataset] of Object.entries(config)){
    if(!dataset.enabled||!dataset.resourceId){report.push({dataset:id,status:'SKIPPED',reason:dataset.reasonDisabled||'Dataset is disabled.'});continue}
    try{
      const response=await getAllDataGovRecords(dataset.resourceId);
      const records=normalizeRecords(id,response.records);
      if(!records.length)throw new Error('No valid records after official-data validation; cache preserved.');
      const cache={dataset:id,resourceId:dataset.resourceId,source:{name:dataset.name,publisher:dataset.publisher,catalogUrl:dataset.catalogUrl},retrievedAt:new Date().toISOString(),sourceUpdatedAt:response.sourceUpdatedAt||null,records};
      await writeDataGovCache(id,cache);report.push({dataset:id,status:'SYNCED',records:records.length});log('Synced '+id+': '+records.length+' records');
    }catch(error){const lastValid=await readDataGovCache(id);report.push({dataset:id,status:lastValid?'CACHE_PRESERVED':'FAILED',reason:error.message,cacheRetrievedAt:lastValid?.retrievedAt||null});log('Could not sync '+id+': '+error.message)}
  }
  return report;
}
export async function dataGovCaches(){const config=await datasetConfig(),result={};for(const id of Object.keys(config))result[id]=await readDataGovCache(id);return result}
