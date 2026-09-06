import { dataGovCaches } from '../services/dataGovService.js';
const caches=await dataGovCaches();
const summary=Object.fromEntries(Object.entries(caches).map(([name,cache])=>[name,{records:cache?.records?.length||0,retrievedAt:cache?.retrievedAt||null,status:cache?'AVAILABLE':'NOT_SYNCED'}]));
console.log(JSON.stringify(summary,null,2));
