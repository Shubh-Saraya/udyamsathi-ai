// Presentation-only fallback. This module intentionally generates stable
// illustrative values from the verified LGD village code. Every returned
// metric is marked DEMO and must never be treated as official evidence.
const hash=value=>[...String(value||'udyamsathi')].reduce((total,char)=>(total*31+char.charCodeAt(0))>>>0,7);
const demoEvidence=(value,label,level,name,detail)=>({value,status:'DEMO',source:'UdyamSathi presentation scenario',sourceDataset:'Prototype demo estimate',sourcePublisher:'UdyamSathi AI',sourceUrl:null,geographyLevel:level,geographyName:name,dataYear:'Presentation demo',sourceUpdatedAt:null,retrievedAt:new Date().toISOString(),freshness:'SYNTHETIC_DEMO',detail:detail||label+' is a simulated presentation value, not government data.'});
const isMissing=metric=>!metric||metric.status==='INSUFFICIENT_EVIDENCE';
const replaceMissing=(metric,value,label,level,name,detail)=>isMissing(metric)?demoEvidence(value,label,level,name,detail):metric;
const commodities=['Onion','Soybean','Cotton','Turmeric','Banana','Maize','Tomato','Pigeon pea'];
const products=['Food processing','Textiles','Dairy products','Agri equipment services','Handicrafts','Spices and value-added foods'];

export function applyPresentationDemoFallback(genome,location){
  const seed=hash(location.villageCode||location.village),population=1800+seed%14500,households=Math.round(population/(4.1+(seed%9)/10)),workers=Math.round(population*(.37+(seed%14)/100));
  const total=700+seed%6300,services=Math.round(total*(.43+(seed%15)/100)),manufacturing=Math.round(total*(.18+(seed%12)/100)),district=location.district,village=location.village;
  genome.metrics.population=replaceMissing(genome.metrics.population,population,'Population','VILLAGE',village,'Simulated Census-style population for presentation only; not current population.');
  genome.metrics.households=replaceMissing(genome.metrics.households,households,'Households','VILLAGE',village);
  genome.metrics.workers=replaceMissing(genome.metrics.workers,workers,'Workers','VILLAGE',village);
  genome.businessEcosystem.totalUdyamMsmes=replaceMissing(genome.businessEcosystem.totalUdyamMsmes,total,'Registered enterprises','DISTRICT',district,'Simulated district registered-enterprise indicator for the demo; not UDYAM data.');
  genome.businessEcosystem.services=replaceMissing(genome.businessEcosystem.services,services,'Service enterprises','DISTRICT',district);
  genome.businessEcosystem.manufacturing=replaceMissing(genome.businessEcosystem.manufacturing,manufacturing,'Manufacturing enterprises','DISTRICT',district);
  genome.businessEcosystem.msmesPerThousandPopulation=replaceMissing(genome.businessEcosystem.msmesPerThousandPopulation,Math.round(total/(population*12)*1000*10)/10,'MSMEs per 1,000 people','DISTRICT',district,'Demo calculation using simulated district values.');
  genome.agriculture.pmKisanBeneficiaries=replaceMissing(genome.agriculture.pmKisanBeneficiaries,150+seed%2100,'PM-KISAN beneficiaries','VILLAGE',village,'Simulated agricultural-ecosystem signal; not PM-KISAN data.');
  if(!genome.agriculture.majorCrops.length){genome.agriculture.majorCrops=[0,1,2].map((offset)=>{let crop=commodities[(seed+offset*3)%commodities.length];return demoEvidence({crop,season:['Kharif','Rabi','Annual'][offset],year:'Demo',area:120+((seed>>offset)%900),production:280+((seed>>offset)%2400),unit:'illustrative tonnes'},'Crop production','DISTRICT',district,'Illustrative district crop signal for SIH presentation only.')})}
  if(!genome.market.commodities.length){genome.market.commodities=[0,1,2].map(offset=>{let crop=commodities[(seed+offset*2)%commodities.length],modal=1100+((seed>>offset)%3900);return demoEvidence({commodity:crop,market:district+' demo mandi',variety:'Illustrative variety',grade:'FAQ',minPrice:modal-250,maxPrice:modal+300,modalPrice:modal,unit:'INR/quintal',arrivalDate:'Demo snapshot'},'Mandi price','DISTRICT',district,'Illustrative market signal. It is not an AGMARKNET record or a live price.')})}
  genome.market.status=genome.market.commodities.every(item=>item.status==='DEMO')?'DEMO':'VERIFIED';
  genome.odop=replaceMissing(genome.odop,{product:products[seed%products.length],details:'Illustrative district specialization'},'ODOP product','DISTRICT',district,'Presentation-only specialization. It is not an official ODOP designation.');
  const amenities={schools:'Primary school and anganwadi (demo)',banks:'Banking correspondent / branch access (demo)',medicalFacilities:'Primary health access (demo)',roads:'All-weather road access estimate (demo)',drinkingWater:'Drinking-water access estimate (demo)',electricity:'Electricity access estimate (demo)'};
  for(const [name,value] of Object.entries(amenities))genome.infrastructure[name]=replaceMissing(genome.infrastructure[name],value,name,'VILLAGE',village,'Presentation-only infrastructure estimate; not Census 2011 amenities data.');
  if(!genome.insights.length)genome.insights=[{recommendation:'Test a small '+products[(seed+2)%products.length].toLowerCase()+' offer before scaling.',reason:'This is a presentation-only advisory based on simulated local-economy signals; validate it with customers and local research.',evidence:[genome.agriculture.majorCrops[0],genome.market.commodities[0]],confidence:'DEMO',status:'DEMO_ADVISORY'}];
  genome.demoMode=true;genome.demoDisclosure='Presentation Demo Mode: values labelled DEMO are stable illustrative estimates for the selected verified LGD village. They are not official government statistics, live market data, or eligibility decisions.';
  return genome;
}
