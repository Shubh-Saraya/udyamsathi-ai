import test from 'node:test';
import assert from 'node:assert/strict';
import { findLocations,searchLocations,villagesFor } from '../backend/data/maharashtraLocations.js';
import { locationProfile } from '../backend/data/locationProfiles.js';

test('finds the exact official LGD village record',()=>{
  const matches=findLocations({district:'Jalgaon',subdistrict:'Erandol',village:'Javkhede Sim'});
  assert.equal(matches.length,1);
  assert.equal(matches[0].villageCode,'527291');
  assert.equal(matches[0].pincode,'425110');
  assert.equal(matches[0].subdistrict,'Erandol');
});

test('district filtering returns only records from that district',()=>{
  const records=villagesFor({district:'Jalgaon',limit:5000});
  assert.ok(records.length>0);
  assert.ok(records.every(record=>record.district==='Jalgaon'));
});

test('indexed search finds Javkhede-related villages',()=>{
  const results=searchLocations('  JAVKHEDE  ');
  assert.ok(results.some(record=>record.village==='Javkhede Sim'));
  assert.ok(results.every(record=>record.village.toLowerCase().includes('javkhede')));
});

test('unknown village produces no result and insufficient evidence',()=>{
  assert.deepEqual(searchLocations('not a real Maharashtra village'),[]);
  assert.equal(locationProfile('Jalgaon','Not a real Maharashtra village').dataType,'INSUFFICIENT_EVIDENCE');
});

test('duplicate village names are not silently selected',()=>{
  const profile=locationProfile('Jalgaon','Khedi Bk.');
  assert.equal(profile.dataType,'AMBIGUOUS_LOCATION');
  assert.ok(profile.matchingRecords>1);
  const exact=locationProfile('Jalgaon','Khedi Bk.',[],'Bhusawal');
  assert.equal(exact.dataType,'VERIFIED_LOCATION');
  assert.equal(exact.villageCode,'527103');
});

test('local LGD lookup works with Google credentials absent',()=>{
  const previous=process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  const results=searchLocations('Javkhede');
  if(previous!==undefined)process.env.GOOGLE_MAPS_API_KEY=previous;
  assert.equal(results[2].villageCode,'527291');
});
