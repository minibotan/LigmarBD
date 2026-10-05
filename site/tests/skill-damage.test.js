import fs from 'node:fs';
import {calculate,fresh} from '../dist/model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {skillDamage} from '../dist/skill-damage.js';
const stats={attack:[100,200],gear:{magicAttackMin:20,magicAttackMax:40},crit:20,activation:50};
test('damage components, crit and cycle with activation',()=>{
 const r=skillDamage({castMs:2000,cooldownMs:3000,damage:[{type:'magic',base:1,gear:2,flat:10,duration:0}]},stats);
 assert.equal(r.parts.base[0].value,150);assert.equal(r.parts.gear[0].value,60);assert.equal(r.cycle,4);assert.equal(r.dps,66);assert.equal(r.castDamage,264);
});
test('dots do not crit and are replaced when recast; absent components stay hidden',()=>{
 const r=skillDamage({castMs:2000,cooldownMs:3000,damage:[{type:'magic',base:0,gear:0,flat:100,duration:10}]},stats);
 assert.equal(r.dps,10);assert.equal(r.castDamage,100);assert.deepEqual(r.parts.base,[]);assert.deepEqual(r.parts.gear,[]);
 assert.equal(skillDamage({castMs:0,cooldownMs:0,damage:[]},stats).dps,null);
 assert.equal(skillDamage({castMs:2000,cooldownMs:3000,unresolved:'unknown',damage:[]},stats).dps,null);
});

test('Supernova rank 4 has a calculable DPS even below its level requirement',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/skills.json',import.meta.url)));
 const rank=catalog.mage.find(s=>s.name==='Сверхновая').ranks[4];
 const build={...fresh(),level:50};
 const result=skillDamage(rank,calculate(build,[]));
 assert.equal(rank.requiredLevel,52);
 assert.ok(Number.isFinite(result.dps)&&result.dps>0);
});
