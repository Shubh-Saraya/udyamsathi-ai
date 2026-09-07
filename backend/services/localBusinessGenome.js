import { datasetConfig } from '../integrations/dataGov.js';
import { dataGovCaches } from './dataGovService.js';
import { applyPresentationDemoFallback } from './presentationDemoGenome.js';
import { census2011Source,findCensus2011,censusLiteracyRate } from '../data/census2011.js';

const normal=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ');
const same=(left,right)=>normal(left)===normal(right);
const evidence=(value,{dataset,config,cache,geographyLevel,geographyName,dataYear=null,detail=null,status='VERIFIED'}={})=>({value,status,source:'data.gov.in',sourceDataset:config?.name||dataset,sourcePublisher:config?.publisher||'Government of India',sourceUrl:config?.catalogUrl||null,geographyLevel,geographyName,dataYear:dataYear??config?.dataYear??null,sourceUpdatedAt:cache?.sourceUpdatedAt||null,retrievedAt:cache?.retrievedAt||null,freshness:cache?.retrievedAt?'CACHED_OFFICIAL_DATA':'No cached official record',detail});
const unavailable=(dataset,config,level,name,reason='No verified official record is available in the local cache.')=>evidence(null,{dataset,config,geographyLevel:level,geographyName:name,status:'INSUFFICIENT_EVIDENCE',detail:reason});
const first=(records,predicate)=>records.find(predicate)||null;
const fromCache=(cache,config,dataset,record,value,level,name,year,detail)=>record&&value!==null&&value!==undefined&&value!==''?evidence(value,{dataset,config,cache,geographyLevel:level,geographyName:name,dataYear:year,detail}):unavailable(dataset,config,level,name);
const bundledCensusEvidence=(value,record,location,detail='Historical Census 2011 value. It is not current population or a current-demand estimate.')=>{
  const source=census2011Source();
  return value===null||value===undefined?unavailable('census_pca_maharashtra',{name:source.name,publisher:source.publisher,catalogUrl:source.catalogUrl},'VILLAGE',location.village,detail):{
    value,status:'VERIFIED',source:'Census of India 2011',sourceDataset:source.name,sourcePublisher:source.publisher,sourceUrl:source.catalogUrl,
    geographyLevel:'VILLAGE',geographyName:record.village,dataYear:2011,sourceUpdatedAt:null,retrievedAt:source.localImportDate,
    freshness:'VALIDATED_LOCAL_CENSUS_IMPORT',detail
  };
};

function locationEvidence(location){return {value:{state:location.state,stateCode:location.stateCode,district:location.district,districtCode:location.districtCode,subdistrict:location.subdistrict,subdistrictCode:location.subdistrictCode,village:location.village,villageCode:location.villageCode,pincode:location.pincode},status:location.dataType==='VERIFIED_LOCATION'?'VERIFIED':'INSUFFICIENT_EVIDENCE',source:location.dataSource||'Local Government Directory (LGD)',sourceDataset:location.sourceDataset||'Villages with PIN Codes',sourcePublisher:location.sourcePublisher||'Government of India',sourceUrl:null,geographyLevel:'VILLAGE',geographyName:location.village||null,dataYear:location.dataSource==='Census of India 2011'?2011:null,sourceUpdatedAt:null,retrievedAt:null,freshness:location.dataSource==='Census of India 2011'?'VALIDATED_LOCAL_CENSUS_IMPORT':'LOCAL_OFFICIAL_EXPORT',detail:location.sourceStatus};}
function cacheRecords(caches,name){return Array.isArray(caches?.[name]?.records)?caches[name].records:[]}

export function calculateMsmeDensity(totalMsmes,districtPopulation){
  if(!Number.isFinite(totalMsmes)||!Number.isFinite(districtPopulation)||districtPopulation<=0)return null;
  return Math.round(totalMsmes/districtPopulation*1000*100)/100;
}

export async function buildLocalBusinessGenome(location,{caches:providedCaches,config:providedConfig,presentationDemo=false}={}){
  const config=providedConfig||await datasetConfig(),caches=providedCaches||await dataGovCaches();
  const valid=location?.dataType==='VERIFIED_LOCATION';
  const villageName=location?.village||null,districtName=location?.district||null;
  const noLocation=reason=>({location:locationEvidence(location||{}),status:'INSUFFICIENT_EVIDENCE',reason,metrics:{},businessEcosystem:{},agriculture:{},market:{},infrastructure:{},odop:{},insights:[]});
  if(!valid)return noLocation('A verified LGD village is required before government-data matching can run.');

  const censusCache=caches.census_pca_maharashtra,census=first(cacheRecords(caches,'census_pca_maharashtra'),r=>(r.villageCode&&r.villageCode===location.villageCode)||(!r.villageCode&&same(r.village,villageName)&&same(r.district,districtName)));
  const bundledCensus=findCensus2011({censusVillageCode:location.censusVillageCode,villageCode:location.villageCode,district:districtName,subdistrict:location.subdistrict,village:villageName});
  const amenitiesCache=caches.village_amenities,amenities=first(cacheRecords(caches,'village_amenities'),r=>(r.villageCode&&r.villageCode===location.villageCode)||(!r.villageCode&&same(r.village,villageName)&&same(r.district,districtName)));
  const udyamTotalCache=caches.udyam_total,udyamServicesCache=caches.udyam_services,udyamManufacturingCache=caches.udyam_manufacturing;
  const udyamTotal=first(cacheRecords(caches,'udyam_total'),r=>same(r.district,districtName));
  const udyamServices=first(cacheRecords(caches,'udyam_services'),r=>same(r.district,districtName));
  const udyamManufacturing=first(cacheRecords(caches,'udyam_manufacturing'),r=>same(r.district,districtName));
  const pmCache=caches.pm_kisan,pmKisan=first(cacheRecords(caches,'pm_kisan'),r=>(r.villageCode&&r.villageCode===location.villageCode)||(!r.villageCode&&same(r.village,villageName)&&same(r.district,districtName)));
  const amenitiesData={schools:fromCache(amenitiesCache,config.village_amenities,'village_amenities',amenities,amenities?.schools,'VILLAGE',villageName,2011,'Census 2011 Village Amenities'),drinkingWater:fromCache(amenitiesCache,config.village_amenities,'village_amenities',amenities,amenities?.drinkingWater,'VILLAGE',villageName,2011,'Census 2011 Village Amenities'),electricity:fromCache(amenitiesCache,config.village_amenities,'village_amenities',amenities,amenities?.electricity,'VILLAGE',villageName,2011,'Census 2011 Village Amenities'),medicalFacilities:fromCache(amenitiesCache,config.village_amenities,'village_amenities',amenities,amenities?.medicalFacilities,'VILLAGE',villageName,2011,'Census 2011 Village Amenities'),banks:fromCache(amenitiesCache,config.village_amenities,'village_amenities',amenities,amenities?.banks,'VILLAGE',villageName,2011,'Census 2011 Village Amenities'),roads:fromCache(amenitiesCache,config.village_amenities,'village_amenities',amenities,amenities?.roads,'VILLAGE',villageName,2011,'Census 2011 Village Amenities')};
  const population=bundledCensus?bundledCensusEvidence(bundledCensus.population,bundledCensus,location):fromCache(censusCache,config.census_pca_maharashtra,'census_pca_maharashtra',census,census?.population,'VILLAGE',villageName,2011,'Census 2011; not current population');
  const households=bundledCensus?bundledCensusEvidence(bundledCensus.households,bundledCensus,location):fromCache(censusCache,config.census_pca_maharashtra,'census_pca_maharashtra',census,census?.households,'VILLAGE',villageName,2011,'Census 2011');
  const workers=bundledCensus?bundledCensusEvidence(bundledCensus.workers,bundledCensus,location):fromCache(censusCache,config.census_pca_maharashtra,'census_pca_maharashtra',census,census?.workers,'VILLAGE',villageName,2011,'Census 2011');
  const literates=bundledCensus?bundledCensusEvidence(bundledCensus.literates,bundledCensus,location):unavailable('census_pca_maharashtra',config.census_pca_maharashtra,'VILLAGE',villageName);
  const literacyRate=bundledCensus?bundledCensusEvidence(censusLiteracyRate(bundledCensus),bundledCensus,location,'Literacy rate is calculated as literates divided by population aged seven and above. Census 2011 only.'):unavailable('census_pca_maharashtra',config.census_pca_maharashtra,'VILLAGE',villageName);
  const mainWorkers=bundledCensus?bundledCensusEvidence(bundledCensus.mainWorkers,bundledCensus,location):unavailable('census_pca_maharashtra',config.census_pca_maharashtra,'VILLAGE',villageName);
  const districtPopulation=first(cacheRecords(caches,'census_pca_maharashtra'),r=>r.geographyLevel==='DISTRICT'&&same(r.district,districtName));
  const totalMsmes=fromCache(udyamTotalCache,config.udyam_total,'udyam_total',udyamTotal,udyamTotal?.count,'DISTRICT',districtName,null,'Registered UDYAM/MSME enterprises; not all businesses.');
  const services=fromCache(udyamServicesCache,config.udyam_services,'udyam_services',udyamServices,udyamServices?.count,'DISTRICT',districtName,null,'Registered UDYAM/MSME enterprises.');
  const manufacturing=fromCache(udyamManufacturingCache,config.udyam_manufacturing,'udyam_manufacturing',udyamManufacturing,udyamManufacturing?.count,'DISTRICT',districtName,null,'Registered UDYAM/MSME enterprises.');
  const densityValue=calculateMsmeDensity(totalMsmes.value,districtPopulation?.population);
  const density=densityValue===null?unavailable('msme_density',{name:'MSME density derived from UDYAM and district Census data',publisher:'UdyamSathi calculation'},'DISTRICT',districtName,'Requires verified district-level UDYAM total and district-level Census population; no geographic levels are mixed.'):evidence(densityValue,{dataset:'msme_density',config:{name:'MSMEs per 1,000 district population',publisher:'UdyamSathi calculation'},cache:udyamTotalCache,geographyLevel:'DISTRICT',geographyName:districtName,status:'DERIVED',detail:'Formula: (district UDYAM registered enterprises / district Census population) × 1,000.'});
  const pmBeneficiaries=fromCache(pmCache,config.pm_kisan,'pm_kisan',pmKisan,pmKisan?.beneficiaries,'VILLAGE',villageName,pmKisan?.reportingPeriod||null,'PM-KISAN registered beneficiaries; not total farmers or households.');
  const mandiCache=caches.mandi_prices,mandis=cacheRecords(caches,'mandi_prices').filter(r=>same(r.district,districtName)).sort((a,b)=>String(b.arrivalDate||'').localeCompare(String(a.arrivalDate||''))).slice(0,12).map(r=>evidence({commodity:r.commodity,market:r.market,variety:r.variety,grade:r.grade,minPrice:r.minPrice,maxPrice:r.maxPrice,modalPrice:r.modalPrice,unit:r.unit,arrivalDate:r.arrivalDate},{dataset:'mandi_prices',config:config.mandi_prices,cache:mandiCache,geographyLevel:'DISTRICT',geographyName:districtName,dataYear:r.arrivalDate,detail:'Relevant district market signal; market distance from village is not asserted.'}));
  const odopCache=caches.odop,odop=first(cacheRecords(caches,'odop'),r=>same(r.district,districtName));
  const odopMetric=fromCache(odopCache,config.odop,'odop',odop,odop?{product:odop.product,details:odop.details}:null,'DISTRICT',districtName,null,'District-level ODOP specialization; not village-specific.');
  const cropCache=caches.crop_production,crops=cacheRecords(caches,'crop_production').filter(r=>same(r.district,districtName)).slice(0,12).map(r=>evidence({crop:r.crop,season:r.season,year:r.year,area:r.area,production:r.production,unit:r.unit},{dataset:'crop_production',config:config.crop_production,cache:cropCache,geographyLevel:'DISTRICT',geographyName:districtName,dataYear:r.year,detail:'District-level official crop statistic.'}));
  const insights=[];
  if(odopMetric.status==='VERIFIED')insights.push({recommendation:'Explore value-chain services related to '+odopMetric.value.product+'.',reason:'ODOP identifies this as a district-level specialization.',evidence:[odopMetric],confidence:'LOW',status:'ADVISORY'});
  if(crops.length&&mandis.length)insights.push({recommendation:'Validate crop-linked grading, packaging, storage, repair or transport services.',reason:'Official district crop statistics and district mandi records are both available; village demand still needs field validation.',evidence:[crops[0],mandis[0]],confidence:'MEDIUM',status:'ADVISORY'});
  const genome={location:locationEvidence(location),status:'VERIFIED',metrics:{population,households,workers,literates,literacyRate,mainWorkers},businessEcosystem:{totalUdyamMsmes:totalMsmes,services,manufacturing,msmesPerThousandPopulation:density},agriculture:{pmKisanBeneficiaries:pmBeneficiaries,majorCrops:crops},market:{commodities:mandis,status:mandis.length?'VERIFIED':'INSUFFICIENT_EVIDENCE'},odop:odopMetric,infrastructure:amenitiesData,insights};
  return presentationDemo?applyPresentationDemoFallback(genome,location):genome;
}
