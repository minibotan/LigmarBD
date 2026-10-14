import {readSkillCatalog} from './skill-catalog-fixture.js';
import fs from 'node:fs';
import {calculate,fresh} from '../dist/model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {skillDamage} from '../dist/skill-damage.js';
const stats={attack:[100,200],gear:{magicAttackMin:20,magicAttackMax:40},crit:20,activation:50};
test('damage components, crit and cycle with activation',()=>{
 const r=skillDamage({castMs:2000,cooldownMs:3000,damage:[{type:'magic',base:1,gear:2,flat:10,duration:0}]},stats);
 assert.equal(r.parts.base[0].value,150);assert.equal(r.parts.gear[0].value,60);assert.equal(r.castSeconds,1);assert.equal(r.dps,264);assert.equal(r.castDamage,264);
});
test('DOT separates cast DPS with the first tick from DPS over the whole effect',()=>{
 const r=skillDamage({castMs:2000,cooldownMs:3000,damage:[{type:'magic',base:0,gear:0,flat:100,duration:10}]},stats);
 assert.equal(r.dps,10);assert.equal(r.tickDps,10);assert.equal(r.effectDps,20);assert.equal(r.castWindowDamage,10);assert.equal(r.castDamage,100);assert.deepEqual(r.parts.base,[]);assert.deepEqual(r.parts.gear,[]);
 assert.equal(skillDamage({castMs:0,cooldownMs:0,damage:[]},stats).dps,null);
 assert.equal(skillDamage({castMs:2000,cooldownMs:3000,unresolved:'unknown',damage:[]},stats).dps,null);
});

test('non-damage effect duration does not stretch direct damage',()=>{
 const r=skillDamage({castMs:1600,cooldownMs:7500,effects:[{seconds:5}],damage:[{type:'physical',base:0,gear:0,flat:1610,duration:0}]},{...stats,crit:0,activation:100});
 assert.equal(r.dps,1006.25);assert.equal(r.hasDot,false);
});

test('autoattack still uses the interval between attacks',()=>{
 const r=skillDamage({castMs:0,cooldownMs:500,damage:[{type:'physical',base:0,gear:0,flat:100,duration:0}]},{...stats,crit:0},{autoAttack:true});
 assert.equal(r.dps,200);
});

test('Supernova rank 4 has a calculable DPS even below its level requirement',()=>{
 const catalog=readSkillCatalog();
 const rank=catalog.mage.find(s=>s.name==='Сверхновая').ranks[4];
 const build={...fresh(),level:50};
 const result=skillDamage(rank,calculate(build,[]));
 assert.equal(rank.requiredLevel,52);
 assert.ok(Number.isFinite(result.dps)&&result.dps>0);
});
