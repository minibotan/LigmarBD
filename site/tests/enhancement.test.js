import test from 'node:test';
import assert from 'node:assert/strict';
import {enhancementCosts,essenceCosts,chance,rules} from '../dist/guides/enhancement-model.js';
test('attempt costs include ordinary crystals plus exactly one additive',()=>{
 for(const weapon of [false,true])for(const method of ['ordinary','risk','harmony','fortitude','essence']){
  const r=enhancementCosts(rules.prices,weapon,method);
  assert.equal(r.steps[0].attempt,rules.prices.ordinary*(weapon?2:1)+(method==='ordinary'?0:rules.prices[method]));
 }
});
test('ordinary failures recover from zero; harmony loses one; fortitude preserves level',()=>{
 const prices={ordinary:10,risk:20,harmony:30,fortitude:40,essence:50};
 for(const method of ['ordinary','harmony','fortitude']){
  const r=enhancementCosts(prices,false,method);
  for(let i=0;i<12;i++){
   const p=chance(i,method),failure=method==='ordinary'?0:method==='harmony'?Math.max(0,i-1):i;
   const expected=(r.steps[i].attempt+(1-p)*(r.totals[i]-r.totals[failure]))/p;
   assert.ok(Math.abs(expected-r.steps[i].cost)<1e-6);
  }
 }
 assert.equal(enhancementCosts(prices,false,'ordinary').steps[0].cost,20);
});
test('craft recipes and guaranteed essence steps',()=>{
 const e=essenceCosts(1);assert.deepEqual(e.slice(1,7),[1,4,10,25,60,130]);
 const r=enhancementCosts(rules.prices,true,'essence');
 for(const s of r.steps){assert.equal(s.chance,1);assert.equal(s.cost,20000+r.essence[s.level]);assert.equal(s.estimated,false)}
});
test('extraction routes include the destroyed epic T4 item price',()=>{
 const prices={ordinary:10,risk:1e6,harmony:1e6,fortitude:1e6,essence:1e6};
 const craft=enhancementCosts(prices,false,'essence');
 const freeItem=enhancementCosts(prices,false,'essence',{essenceRoutes:true,extractionItemCost:0});
 const pricedItem=enhancementCosts(prices,false,'essence',{essenceRoutes:true,extractionItemCost:2400});
 assert.ok(freeItem.essence[2]<craft.essence[2]);
 assert.equal(pricedItem.essence[2]-freeItem.essence[2],2400);
});
test('optimal policy satisfies every Bellman inequality and reflects editable prices',()=>{
 const r=enhancementCosts(rules.prices);
 for(const [i,s] of r.steps.entries())for(const c of s.candidates)assert.ok(s.cost<=c.cost+1e-6);
 assert.ok(enhancementCosts({...rules.prices,ordinary:20000}).totals[8]>r.totals[8]);
 assert.ok(enhancementCosts(rules.prices,false,'fortitude').steps[10].estimated);
 assert.ok(!enhancementCosts(rules.prices,false,'fortitude').steps[9].estimated);
 assert.throws(()=>enhancementCosts({...rules.prices,ordinary:-1}));
 assert.equal(enhancementCosts(Object.fromEntries(Object.keys(rules.prices).map(k=>[k,0]))).totals[12],0);
});
