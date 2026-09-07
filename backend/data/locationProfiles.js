import { findLocations } from './maharashtraLocations.js';

const emptyGenomeFields=()=>({population:null,businesses:null,nearby:null,marketDay:null,town:null,townKm:null,road:null,economy:null,access:null});
const coordinates=coords=>Array.isArray(coords)&&coords.length>=2?{lat:Number(coords[0]),lng:Number(coords[1])}:{lat:null,lng:null};

// The optional subdistrict and LGD code disambiguate village names. The first
// two parameters are kept for compatibility with the existing application.
export function locationProfile(district,village,coords=[],subdistrict=null,villageCode=null){
  const matches=findLocations({district,subdistrict,village,villageCode});
  const point=coordinates(coords);
  if(!matches.length)return{state:'Maharashtra',district:district??null,subdistrict:subdistrict??null,village:village??null,...point,...emptyGenomeFields(),dataType:'INSUFFICIENT_EVIDENCE',dataSource:'Local Government Directory (LGD)',sourcePublisher:'Government of India',sourceDataset:'Villages with PIN Codes',sourceStatus:'No exact village match found in the local LGD dataset.'};
  if(matches.length>1)return{state:'Maharashtra',district:matches[0].district,village:village??null,...point,...emptyGenomeFields(),dataType:'AMBIGUOUS_LOCATION',dataSource:'Local Government Directory (LGD)',sourcePublisher:'Government of India',sourceDataset:'Villages with PIN Codes',matchingRecords:matches.length,possibleMatches:matches.map(({subdistrict,subdistrictCode,villageCode,pincode})=>({subdistrict,subdistrictCode,villageCode,pincode})),sourceStatus:'Multiple LGD records match this village name. Select a subdistrict or LGD village code.'};
  const v=matches[0];
  const censusOnly=v.identitySource==='CENSUS_2011';
  return{state:v.state,stateCode:v.stateCode,district:v.district,districtCode:v.districtCode,subdistrict:v.subdistrict,subdistrictCode:v.subdistrictCode,village:v.village,villageCode:v.villageCode,censusVillageCode:v.censusVillageCode||null,pincode:v.pincode,...point,...emptyGenomeFields(),dataType:'VERIFIED_LOCATION',dataSource:censusOnly?'Census of India 2011':'Local Government Directory (LGD)',sourcePublisher:censusOnly?'Office of the Registrar General & Census Commissioner, India':'Government of India',sourceDataset:censusOnly?'Maharashtra Census 2011 village-level Primary Census Abstract':'Villages with PIN Codes',sourceStatus:censusOnly?'Village identity is available from the bundled Census 2011 record. PIN data is unavailable.':'Village identity and administrative information verified against LGD.'};
}
