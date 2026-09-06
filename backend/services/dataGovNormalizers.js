const key=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fields=record=>Object.fromEntries(Object.entries(record||{}).map(([name,value])=>[key(name),value]));
const read=(record,names)=>{const row=fields(record);for(const name of names){const value=row[key(name)];if(value!==undefined&&value!==null&&String(value).trim()!=='')return String(value).trim()}return null};
const numeric=(record,names)=>{const value=read(record,names);if(value===null)return null;const parsed=Number(String(value).replace(/,/g,''));return Number.isFinite(parsed)&&parsed>=0?parsed:null};
const date=(record,names)=>{const value=read(record,names);if(!value)return null;return Number.isNaN(Date.parse(value))?null:value};
const location=record=>({state:read(record,['state','state name']),district:read(record,['district','district name']),subdistrict:read(record,['subdistrict','taluka','tehsil']),village:read(record,['village','village town','village name']),villageCode:read(record,['village code','lgd village code'])});

export function normalizeUdyam(record,type){
  const count=numeric(record,['total msme registered enterprises','total registered enterprises','number of enterprises','msme count','total']);
  if(count===null)return null;
  return {...location(record),count,enterpriseType:type,geographyLevel:'DISTRICT'};
}
export function normalizeCensus(record){
  const population=numeric(record,['population','total population','tot p']);
  const village=location(record);
  if(population===null||(!village.village&&!village.villageCode))return null;
  return {...village,population,households:numeric(record,['households','number of households','no of households']),malePopulation:numeric(record,['male population','male']),femalePopulation:numeric(record,['female population','female']),literates:numeric(record,['literate population','literates']),workers:numeric(record,['total workers','workers']),mainWorkers:numeric(record,['main workers']),marginalWorkers:numeric(record,['marginal workers']),agriculturalWorkers:numeric(record,['agricultural labourers','agricultural workers']),scPopulation:numeric(record,['sc population']),stPopulation:numeric(record,['st population']),year:2011,geographyLevel:'VILLAGE'};
}
export function normalizeAmenities(record){
  const value=location(record);if(!value.village&&!value.villageCode)return null;
  return {...value,schools:read(record,['schools','primary school']),drinkingWater:read(record,['drinking water']),electricity:read(record,['electricity']),medicalFacilities:read(record,['medical facility','medical facilities']),banks:read(record,['banking facility','banks']),postOffice:read(record,['post office']),roads:read(record,['road']),transport:read(record,['transport']),markets:read(record,['market']),year:2011,geographyLevel:'VILLAGE'};
}
export function normalizeMandi(record){
  const commodity=read(record,['commodity']),market=read(record,['market','market name']),modal=numeric(record,['modal price','modal_price']);
  if(!commodity||!market||modal===null)return null;
  return {...location(record),commodity,market,variety:read(record,['variety']),grade:read(record,['grade']),arrivalDate:date(record,['arrival date','arrival_date']),minPrice:numeric(record,['min price','min_price']),maxPrice:numeric(record,['max price','max_price']),modalPrice:modal,unit:'INR/quintal',geographyLevel:'DISTRICT'};
}
export function normalizePmkisan(record){
  const value=location(record),beneficiaries=numeric(record,['beneficiaries','total beneficiaries','beneficiary count']);
  if((!value.village&&!value.villageCode)||beneficiaries===null)return null;
  return {...value,beneficiaries,maleBeneficiaries:numeric(record,['male beneficiaries']),femaleBeneficiaries:numeric(record,['female beneficiaries']),reportingPeriod:read(record,['reporting period','instalment','installment']),geographyLevel:'VILLAGE'};
}
export function normalizeOdop(record){
  const district=read(record,['district','district name']),product=read(record,['product','identified product','odop product']);
  if(!district||!product)return null;
  return {district,state:read(record,['state','state name']),product,details:read(record,['details','category','specialization']),geographyLevel:'DISTRICT'};
}
export function normalizeCrop(record){
  const district=read(record,['district','district name']),crop=read(record,['crop','crop name']),production=numeric(record,['production']);
  if(!district||!crop||production===null)return null;
  return {district,state:read(record,['state','state name']),crop,season:read(record,['season']),year:read(record,['year']),area:numeric(record,['area']),production,unit:read(record,['unit']),geographyLevel:'DISTRICT'};
}
export function normalizeKcc(record){
  const district=read(record,['district','district name']),queries=numeric(record,['queries','query count','total queries']);
  if(!district||queries===null)return null;
  return {district,state:read(record,['state','state name']),month:read(record,['month']),topic:read(record,['topic','query category','category']),queries,geographyLevel:'DISTRICT'};
}
export function normalizeRecords(dataset,records=[]){
  const normalizer={udyam_total:r=>normalizeUdyam(r,'TOTAL'),udyam_services:r=>normalizeUdyam(r,'SERVICES'),udyam_manufacturing:r=>normalizeUdyam(r,'MANUFACTURING'),census_pca_maharashtra:normalizeCensus,village_amenities:normalizeAmenities,mandi_prices:normalizeMandi,pm_kisan:normalizePmkisan,odop:normalizeOdop,crop_production:normalizeCrop,kisan_call_centre:normalizeKcc}[dataset];
  if(!normalizer)return [];
  return records.map(normalizer).filter(Boolean);
}
