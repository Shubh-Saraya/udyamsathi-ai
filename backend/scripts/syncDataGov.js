import { syncDataGov } from '../services/dataGovService.js';
const report=await syncDataGov();
console.log(JSON.stringify(report,null,2));
if(report.some(item=>item.status==='FAILED'))process.exitCode=1;
