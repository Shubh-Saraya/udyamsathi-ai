import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getVerifiedSchemes,matchVerified } from '../backend/integrations/schemes.js';

test('has exactly four primary structured support cards with official sources',async()=>{
  const schemes=await getVerifiedSchemes();
  assert.equal(schemes.length,4);
  assert.deepEqual(schemes.map(s=>s.id),['pmmy','pm-svanidhi','stand-up-india','maharashtra-msme-support']);
  for(const scheme of schemes){
    for(const field of ['id','name','description','amountLabel','bestFor','benefits','requirements','documents','applicationSteps','officialSource','sourceName','lastVerified','status'])assert.ok(scheme[field]!==undefined,field+' missing for '+scheme.id);
    assert.match(scheme.officialSource,/^https:\/\//);
  }
  assert.equal(schemes.at(-1).status,'OFFICIAL_RESOURCE');
});
test('scheme matching is profile-based, bounded, and explainable',async()=>{
  const schemes=await getVerifiedSchemes();
  const vendor=matchVerified({state:'Maharashtra',business:'Grocery/Retail',stage:'existing',streetVendor:'yes',loanRequirement:25000},schemes);
  const largerNewWoman=matchVerified({state:'Maharashtra',business:'Food Processing',stage:'new',gender:'woman',streetVendor:'no',loanRequirement:2000000},schemes);
  const vendorSvanidhi=vendor.find(s=>s.id==='pm-svanidhi'),standUp=largerNewWoman.find(s=>s.id==='stand-up-india');
  assert.ok(vendorSvanidhi.eligibilityScore>standUp?.eligibilityScore||vendorSvanidhi.eligibilityScore>60);
  assert.ok(standUp.eligibilityScore>70);
  for(const item of [...vendor,...largerNewWoman]){assert.ok(item.eligibilityScore>=0&&item.eligibilityScore<=100);assert.ok(item.matchReasons.length>0)}
});
test('translation resources contain English, Hindi and Marathi financing text',async()=>{
  for(const locale of ['en','hi','mr']){
    const copy=JSON.parse(await readFile(new URL('../frontend/locales/'+locale+'.json',import.meta.url),'utf8'));
    assert.ok(copy.calculator.emi);assert.ok(copy.finance.title);assert.ok(copy.schemeCopy.pmmy.description);
  }
});
