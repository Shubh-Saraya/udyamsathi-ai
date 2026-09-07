import test from 'node:test';
import assert from 'node:assert/strict';
import { census2011Source,census2011Villages,findCensus2011,censusLiteracyRate } from '../backend/data/census2011.js';
import { findLocations } from '../backend/data/maharashtraLocations.js';

test('bundled Census import contains every validated source village and preserves its values',()=>{
  const source=census2011Source(),villages=census2011Villages();
  assert.equal(source.dataYear,2011);
  assert.equal(villages.length,43665);
  for(const record of villages){
    const found=findCensus2011({censusVillageCode:record.villageCode});
    assert.equal(found?.population,record.population,record.villageCode+' population');
    assert.equal(found?.households,record.households,record.villageCode+' households');
    assert.equal(found?.workers,record.workers,record.villageCode+' workers');
    assert.equal(findLocations({villageCode:record.villageCode}).length,1,record.villageCode+' is selectable');
  }
});

test('Census values and derived literacy rate are correct for a known village',()=>{
  const village=findCensus2011({villageCode:'527291'});
  assert.deepEqual({population:village.population,households:village.households,workers:village.workers,literates:village.literates},{population:2007,households:471,workers:1170,literates:1374});
  assert.equal(censusLiteracyRate(village),78.9);
});
