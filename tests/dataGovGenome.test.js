import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCensus,normalizeUdyam,normalizeMandi,normalizeOdop,normalizePmkisan,normalizeCrop } from '../backend/services/dataGovNormalizers.js';
import { buildLocalBusinessGenome,calculateMsmeDensity } from '../backend/services/localBusinessGenome.js';
import { datasetConfig,writeDataGovCache } from '../backend/integrations/dataGov.js';
import { locationProfile } from '../backend/data/locationProfiles.js';

const location=locationProfile('Jalgaon','Javkhede Sim',[],'Erandol','527291');

test('normalizes Census 2011 village values without claiming they are current',()=>{
  const record=normalizeCensus({Village:'Javkhede Sim',District:'Jalgaon','Village Code':'527291',Population:'1,234',Households:'250','Total Workers':'600'});
  assert.equal(record.population,1234);assert.equal(record.households,250);assert.equal(record.year,2011);assert.equal(record.geographyLevel,'VILLAGE');
});
test('normalizes UDYAM as district registered enterprises',()=>{
  const record=normalizeUdyam({District:'Jalgaon','Total MSME Registered Enterprises':'4200'},'TOTAL');
  assert.deepEqual(record,{state:null,district:'Jalgaon',subdistrict:null,village:null,villageCode:null,count:4200,enterpriseType:'TOTAL',geographyLevel:'DISTRICT'});
});
test('normalizes an official mandi record',()=>{
  const record=normalizeMandi({State:'Maharashtra',District:'Jalgaon',Market:'Jalgaon',Commodity:'Banana','Arrival Date':'2026-09-01','Min Price':'800','Max Price':'1200','Modal Price':'1000'});
  assert.equal(record.commodity,'Banana');assert.equal(record.modalPrice,1000);assert.equal(record.market,'Jalgaon');assert.equal(record.unit,'INR/quintal');
});
test('normalizes ODOP, PM-KISAN, and crop records only with required evidence',()=>{
  assert.equal(normalizeOdop({District:'Jalgaon','Identified Product':'Banana'}).product,'Banana');
  assert.equal(normalizePmkisan({Village:'Javkhede Sim',District:'Jalgaon','Village Code':'527291',Beneficiaries:'87'}).beneficiaries,87);
  assert.equal(normalizeCrop({District:'Jalgaon',Crop:'Banana',Production:'900',Year:'2023-24'}).production,900);
  assert.equal(normalizeCrop({District:'Jalgaon',Crop:'Banana',Production:'-1'}),null);
});
test('calculates MSME intensity transparently',()=>{
  assert.equal(calculateMsmeDensity(2500,500000),5);
  assert.equal(calculateMsmeDensity(1,0),null);
});
test('genome uses the bundled, validated Census value rather than a demo value',async()=>{
  const genome=await buildLocalBusinessGenome(location,{caches:{},config:await datasetConfig()});
  assert.equal(genome.location.status,'VERIFIED');
  assert.equal(genome.metrics.population.status,'VERIFIED');
  assert.equal(genome.metrics.population.value,2007);
  assert.equal(genome.metrics.population.source,'Census of India 2011');
  assert.equal(genome.businessEcosystem.totalUdyamMsmes.value,null);
  assert.deepEqual(genome.insights,[]);
});
test('presentation mode generates stable, explicitly labelled demo values for a selected LGD village',async()=>{
  const config=await datasetConfig();
  const first=await buildLocalBusinessGenome(location,{caches:{},config,presentationDemo:true});
  const second=await buildLocalBusinessGenome(location,{caches:{},config,presentationDemo:true});
  assert.equal(first.demoMode,true);
  assert.equal(first.metrics.population.status,'VERIFIED');
  assert.equal(first.metrics.population.value,second.metrics.population.value);
  assert.equal(first.businessEcosystem.totalUdyamMsmes.status,'DEMO');
  assert.equal(first.market.commodities[0].status,'DEMO');
  assert.match(first.demoDisclosure,/not official government statistics/i);
});
test('genome preserves evidence metadata and geographic levels for cached records',async()=>{
  const config=await datasetConfig();
  const caches={
    census_pca_maharashtra:{retrievedAt:'2026-09-06T00:00:00.000Z',records:[{villageCode:'527291',village:'Javkhede Sim',district:'Jalgaon',population:1234,households:250,workers:600,geographyLevel:'VILLAGE'}]},
    udyam_total:{retrievedAt:'2026-09-06T00:00:00.000Z',records:[{district:'Jalgaon',count:4200}]},
    udyam_services:{retrievedAt:'2026-09-06T00:00:00.000Z',records:[{district:'Jalgaon',count:2000}]},
    udyam_manufacturing:{retrievedAt:'2026-09-06T00:00:00.000Z',records:[{district:'Jalgaon',count:1200}]}
  };
  const genome=await buildLocalBusinessGenome(location,{caches,config});
  assert.equal(genome.metrics.population.value,2007);assert.equal(genome.metrics.population.dataYear,2011);assert.equal(genome.metrics.population.geographyLevel,'VILLAGE');assert.equal(genome.metrics.population.source,'Census of India 2011');
  assert.equal(genome.businessEcosystem.totalUdyamMsmes.value,4200);assert.equal(genome.businessEcosystem.totalUdyamMsmes.geographyLevel,'DISTRICT');
  assert.equal(genome.businessEcosystem.msmesPerThousandPopulation.status,'INSUFFICIENT_EVIDENCE');
});
test('invalid empty official response cannot overwrite a cache',async()=>{
  await assert.rejects(()=>writeDataGovCache('test-empty',{records:[]}),{code:'EMPTY_RESPONSE'});
});
