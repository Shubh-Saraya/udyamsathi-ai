import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from './engines/financial.js';
import { businesses,places,schemes,notice } from './data/demo.js';
import { locationProfile } from './data/locationProfiles.js';
import { source as lgdSource,districts,subdistricts,villagesFor,searchLocations } from './data/maharashtraLocations.js';
import { buildLocalBusinessGenome } from './services/localBusinessGenome.js';
import { mapConfig,autocomplete,searchLocation,nearby } from './integrations/googlePlaces.js';
import { getVerifiedSchemes,importSchemes,matchVerified } from './integrations/schemes.js';
import { getFinancing,importFinancing,matchFinancing } from './integrations/financing.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const body=request=>new Promise((resolve,reject)=>{let raw='';request.on('data',chunk=>raw+=chunk);request.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch(error){reject(error)}})});
const send=(response,value,status=200)=>{response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value))};
try{let env=await readFile(path.join(root,'.env'),'utf8');for(const line of env.split(/\r?\n/)){let found=line.match(/^([A-Z0-9_]+)=(.*)$/);if(found&&!process.env[found[1]])process.env[found[1]]=found[2].trim()}}catch{}
const presentationDemo=process.env.PRESENTATION_DEMO_MODE!=='false';

const personas=[{id:'dairy',name:'Asha - Dairy processor',district:'Pune',village:'Mulshi',business:'Dairy Processing',capital:100000,experience:'2 years'},{id:'tailor',name:'Meera - Tailoring studio',district:'Nashik',village:'Sinnar',business:'Tailoring',capital:60000,experience:'3 years'},{id:'rental',name:'Ramesh - Farm equipment rental',district:'Satara',village:'Karad',business:'Agri-input Store',capital:150000,experience:'1 year'}];
const clamp=(number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(number)));
const money=number=>'INR '+Math.round(number).toLocaleString('en-IN');
const assessmentNotice='LGD village identity is official Government of India data. Financial scores and stress cases are prototype advisory calculations, not official statistics, lender decisions, or guarantees.';

async function genome(profile){
  const coords=profile.lat&&profile.lng?[Number(profile.lat),Number(profile.lng)]:(places[profile.district]?.[profile.village]||[]);
  const location=locationProfile(profile.district,profile.village,coords,profile.subdistrict,profile.villageCode);
  // LGD verifies village identity only. Local commercial/economic fields remain
  // explicitly unavailable until a suitable authoritative source is integrated.
  const businessGenome=await buildLocalBusinessGenome(location,{presentationDemo});
  return {...location,occupations:null,income:null,scores:{market:null,competition:null,access:null,demand:null,environment:null},source:{status:location.dataType,source:location.dataSource,lastVerified:lgdSource().generatedAt,evidence:'VERIFIED administrative location; no LGD business statistics.'},businessGenome};
}
function opportunities(genome){
  if(genome.dataType==='VERIFIED_LOCATION'||genome.dataType==='INSUFFICIENT_EVIDENCE'||genome.dataType==='AMBIGUOUS_LOCATION')return [];
  return [];
}
const asNumber=value=>{const number=Number(value);return Number.isFinite(number)?number:null};
const experienceYears=value=>Math.max(0,Math.min(20,Number.parseFloat(String(value??''))||0));
const metricValue=metric=>asNumber(metric?.value);
function localOpportunityScore(business,businessGenome){
  if(!businessGenome?.demoMode)return null;
  const population=metricValue(businessGenome.metrics?.population)||0;
  const enterprises=metricValue(businessGenome.businessEcosystem?.totalUdyamMsmes)||0;
  const farmHouseholds=metricValue(businessGenome.agriculture?.pmKisanBeneficiaries)||0;
  // These offsets deliberately use the selected LGD village's stable demo
  // scenario. They are not a claim about actual local demand.
  const villageSignal=((population%31)-15)*.45+((enterprises%23)-11)*.3+((farmHouseholds%17)-8)*.25;
  const categoryFit=/Dairy|Poultry|Goat|Mushroom|Food|Agri/.test(business.name||'')?(farmHouseholds%9)-4:((population+enterprises)%9)-4;
  return clamp(business.market+villageSignal+categoryFit,40,94);
}
async function assess(profile){
  const business=businesses[profile.business]||businesses['Dairy Processing'];
  const requestedCapital=asNumber(profile.capital);
  const capital=requestedCapital!==null&&requestedCapital>=0?requestedCapital:100000;
  const localGenome=await genome(profile),reserve=Math.max(15000,Math.round(capital*.2)),working=Math.max(business.working,Math.round(capital*.25));
  const maxCost=F.projectCost(Math.max(10000,capital-reserve),.15),maxLoan=F.loanAmount(maxCost,.15);
  const minimumPilot=Math.max(50000,Math.round(business.startup*.25)),projectMoney=Math.max(0,capital-reserve),recommendedCost=Math.min(business.startup,Math.max(minimumPilot,Math.round(projectMoney*1.7))),recommendedLoan=Math.max(0,Math.round(recommendedCost-projectMoney));
  const rows=F.schedule(recommendedLoan,10.5,60,3),repayment=rows.find(row=>!row.moratorium)?.payment||0,surplus=F.cashSurplus(business.revenue,business.variable,business.fixed),ratio=F.dscr(surplus,repayment*12)||0,capitalAdequacy=clamp(capital/Math.max(minimumPilot,recommendedCost*.7)*100);
  const localScore=localOpportunityScore(business,localGenome.businessGenome),marketScore=localScore??business.market,years=experienceYears(profile.experience),experienceBonus=Math.min(12,Math.round(years*2));
  // This remains a prototype business-finance advisory model, not LGD data.
  const viability=clamp(F.viability({market:marketScore,dscr:ratio,risk:business.risk,capital:capitalAdequacy})+experienceBonus);
  const financialSafety=clamp(ratio*34+capitalAdequacy*.35+(100-business.risk)*.2),debtStress=ratio>=1.5&&capital>=reserve+working*.35?'LOW':ratio>=1.15?'MEDIUM':'HIGH';
  const decision=debtStress==='LOW'&&viability>=70?'BORROW':debtStress==='MEDIUM'&&viability>=55?'BORROW CAREFULLY':'DO NOT BORROW YET';
  const why=decision==='BORROW'?'Cash flow and reserve appear adequate for this prototype scenario.':decision==='BORROW CAREFULLY'?'The business can work, but start smaller and validate sales before drawing the full loan.':'Your reserve, expected cash flow, or market validation is not strong enough yet.';
  const localRisk=localScore===null?{name:'Local competition evidence',score:null,why:'LGD does not provide local business or competitor counts.',action:'Use optional live Places enrichment or local field research before committing.'}:{name:'Presentation local opportunity',score:clamp(100-localScore),why:'This is a stable illustrative signal for the selected LGD village, not measured demand.',action:'Validate it by speaking to 20 customers before spending or borrowing.'};
  const risks=[{name:'Working capital shortage',score:clamp(80-capitalAdequacy*.55),why:'Early months need cash for stock, transport and regular bills.',action:'Keep '+money(reserve)+' aside as an emergency reserve.'},localRisk,{name:'Sales seasonality',score:clamp(business.risk+18),why:'Demand can change with harvest, weather and festivals.',action:'Build a cash buffer and track weekly sales.'},{name:'Loan payment pressure',score:clamp(100-ratio*45),why:'A payment can become difficult in a slow sales month.',action:'Borrow only after the 30-day pilot confirms demand.'}].sort((a,b)=>(b.score??-1)-(a.score??-1));
  const stress=[['Best case',1.15,.95],['Expected case',1,1],['Sales down 20%',.8,1],['Costs up 20%',1,1.2],['Hard month',.7,1.2]].map(([name,sales,cost])=>{let revenue=business.revenue*sales,expense=revenue*business.variable*cost+business.fixed,profit=Math.round(revenue-expense-repayment),risk=profit<0?'CRITICAL':profit<surplus*.35?'HIGH':profit<surplus*.7?'MEDIUM':'LOW';return{name,salesChange:Math.round((sales-1)*100),costChange:Math.round((cost-1)*100),revenue:Math.round(revenue),expenses:Math.round(expense),profit,risk}});
  return {profile:{...profile,capital,experience:years},b:business,genome:localGenome,opportunities:opportunities(localGenome),financial:{reserve,working,safeOwn:Math.max(reserve+working,Math.round(business.startup*.18)),recommendedCost,recommendedLoan,maxLoan,repayment,surplus,breakEven:F.breakEven(business.fixed,business.price,business.cost),dscr:ratio,payback:Math.max(6,Math.ceil(recommendedCost/Math.max(1,surplus))),financialSafety},viability,viabilityStatus:'ADVISORY',localScore,localScoreStatus:localScore===null?'INSUFFICIENT_EVIDENCE':'DEMO',borrow:{decision,why,debtStress},risks,stress,sustainable:stress.filter(item=>item.profit>0).length,schemes:schemes.map(s=>({...s,score:0,match:'Not shown in verified funding'})),roadmap:[{phase:'TEST - 30 days',investment:Math.min(capital*.3,50000),target:'Speak with 20 customers and make first sales.'},{phase:'VALIDATE - 60 days',investment:Math.min(capital*.55,90000),target:'Reach '+money(Math.round(business.revenue*.5))+' monthly sales.'},{phase:'STABILISE - 90 days',investment:Math.min(capital*.7,120000),target:'Achieve 3 profitable months and maintain reserve.'},{phase:'SCALE',investment:recommendedLoan,target:'Then consider the recommended financing.'}],recommendation:'Start with a '+money(Math.round(recommendedCost*.55))+' pilot, keep '+money(reserve)+' as reserve, and scale only after 3 profitable months. Your score reflects your '+money(capital)+' available money, '+years+' years of experience, and '+(localScore===null?'the business model.':'a clearly labelled presentation-demo village signal.') ,notice:assessmentNotice};
}

function lgdResponse(request){
  const base={mode:'LGD',source:'Local Government Directory (LGD)',publisher:'Government of India',sourceType:'official_government_dataset',generatedAt:lgdSource().generatedAt};
  if(request.action==='subdistricts')return {...base,subdistricts:subdistricts(request.district)};
  if(request.action==='villages')return {...base,villages:villagesFor({district:request.district,subdistrict:request.subdistrict,limit:5000})};
  return {...base,predictions:searchLocations(request.input||request.query||'',{district:request.district,subdistrict:request.subdistrict,limit:10})};
}
http.createServer(async(request,response)=>{try{
  const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/api/meta')return send(response,{places,businesses:Object.keys(businesses),personas,notice,integrations:mapConfig(),locations:{...lgdSource(),districts:districts()}});
  if(url.pathname==='/api/integration-status')return send(response,{maps:mapConfig(),locations:lgdSource(),schemes:{verified:(await getVerifiedSchemes()).length}});
  if(url.pathname==='/api/location/autocomplete'&&request.method==='POST'){let input=await body(request);return send(response,lgdResponse(input))}
  if(url.pathname==='/api/location/search'&&request.method==='POST'){let input=await body(request),local=lgdResponse(input);if(local.predictions?.length||!input.allowGoogle)return send(response,local);return send(response,await searchLocation(input.query||input.input||''))}
  if(url.pathname==='/api/local-intelligence'&&request.method==='POST'){let input=await body(request),maps=mapConfig();if(!maps.enabled)return send(response,{mode:'UNAVAILABLE',source:'Google Places API (New)',warning:'Google Places is optional and is not configured. No business or competitor data is shown.',retrievedAt:new Date().toISOString(),places:[],anchor:null,radius:Number(input.radius||5000)});let coords=input.lat&&input.lng?[Number(input.lat),Number(input.lng)]:(places[input.district]?.[input.village]||[]);if(coords.length<2)return send(response,{mode:'UNAVAILABLE',source:'Google Places API (New)',warning:'Selected LGD village has no coordinates. Add optional Google location enrichment to search nearby places.',retrievedAt:new Date().toISOString(),places:[],anchor:null,radius:Number(input.radius||5000)});let result=await nearby({lat:coords[0],lng:coords[1],business:input.business,radius:input.radius||5000});return send(response,{...result,anchor:{lat:coords[0],lng:coords[1]},radius:Number(input.radius||5000)})}
  if(url.pathname==='/api/schemes/verified')return send(response,await getVerifiedSchemes());
  if(url.pathname==='/api/schemes/match'&&request.method==='POST'){let input=await body(request);return send(response,matchVerified(input,await getVerifiedSchemes()))}
  if(url.pathname==='/api/admin/schemes'&&request.method==='POST'){let input=await body(request);return send(response,{imported:await importSchemes(input.records)})}
  if(url.pathname==='/api/financing/verified')return send(response,await getFinancing());
  if(url.pathname==='/api/financing/match'&&request.method==='POST'){let input=await body(request);return send(response,matchFinancing(input,await getFinancing()))}
  if(url.pathname==='/api/admin/financing'&&request.method==='POST'){let input=await body(request);return send(response,{imported:await importFinancing(input.records)})}
  if(url.pathname==='/api/loan-calculator'&&request.method==='POST'){let input=await body(request);return send(response,F.calculateLoan(input))}
  if(url.pathname==='/api/local-business-genome'&&request.method==='POST'){let input=await body(request),location=locationProfile(input.district,input.village,[],input.subdistrict,input.villageCode);return send(response,await buildLocalBusinessGenome(location,{presentationDemo:input.presentationDemo??presentationDemo}))}
  if(url.pathname==='/api/advisory/live-context'&&request.method==='POST'){let input=await body(request),assessment=await assess(input),profile={...input,loanRequirement:assessment.financial.recommendedLoan};return send(response,{assessment,verifiedSchemes:matchVerified(profile,await getVerifiedSchemes()),financing:matchFinancing(profile,await getFinancing())})}
  if(url.pathname==='/api/analyze'&&request.method==='POST'){let input=await body(request);return send(response,await assess(input))}
  try{let file=url.pathname==='/'?'frontend/index.html':url.pathname.slice(1),content=await readFile(path.join(root,file));response.writeHead(200,{'content-type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html'});response.end(content)}catch(error){if(url.pathname.startsWith('/api/'))return send(response,{error:error.message},400);response.writeHead(404);response.end('Not found')}
}catch(error){send(response,{error:error.message},400)}}).listen(process.env.PORT||3000,()=>console.log('VyaparGuide AI running at http://localhost:3000'));
