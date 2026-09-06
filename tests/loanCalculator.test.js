import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoan } from '../backend/engines/financial.js';

test('calculates a mathematically correct EMI for ₹1,00,000 at 12% for 3 years',()=>{
  const result=calculateLoan({amount:100000,annualRate:12,years:3});
  assert.equal(result.monthlyEmi,3321.43);
  assert.equal(result.totalRepayment,119571.48);
  assert.equal(result.totalInterest,19571.48);
});
test('changing calculator inputs changes the payment and zero interest works',()=>{
  const small=calculateLoan({amount:50000,annualRate:12,years:3});
  const larger=calculateLoan({amount:100000,annualRate:12,years:3});
  const longer=calculateLoan({amount:100000,annualRate:12,years:5});
  const free=calculateLoan({amount:120000,annualRate:0,years:1});
  assert.ok(larger.monthlyEmi>small.monthlyEmi);
  assert.ok(longer.monthlyEmi<larger.monthlyEmi);
  assert.equal(free.monthlyEmi,10000);
  assert.equal(free.totalInterest,0);
});
test('affordability indicator follows transparent 20% and 35% surplus thresholds',()=>{
  assert.equal(calculateLoan({amount:100000,annualRate:12,years:3,monthlySales:60000,monthlyExpenses:40000}).affordability,'COMFORTABLE');
  assert.equal(calculateLoan({amount:100000,annualRate:12,years:3,monthlySales:50000,monthlyExpenses:40000}).affordability,'CAUTION');
  assert.equal(calculateLoan({amount:100000,annualRate:12,years:3,monthlySales:42000,monthlyExpenses:40000}).affordability,'TOO_HIGH');
});
test('invalid calculator inputs are rejected',()=>{
  assert.throws(()=>calculateLoan({amount:0,annualRate:12,years:3}),/INVALID_LOAN_AMOUNT/);
  assert.throws(()=>calculateLoan({amount:1000,annualRate:-1,years:3}),/INVALID_INTEREST_RATE/);
  assert.throws(()=>calculateLoan({amount:1000,annualRate:12,years:0}),/INVALID_LOAN_DURATION/);
});
