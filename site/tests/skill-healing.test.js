import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skillHealing} from '../dist/skill-healing.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/skills.json',import.meta.url)));
const rank=(cls,name,n)=>catalog[cls].find(s=>s.name===name).ranks[n];
const stats={attack:[1000,2000],gear:{},hp:5000,activation:50,crit:100};
test('direct heal uses base attack, flat amount, cast with VA and cooldown without crit',()=>{
 const result=skillHealing(rank('mage','Аркана лечения',6),stats);
 assert.equal(result.castHealing,1065);assert.equal(result.cycle,3.85);assert.equal(result.hps,1065/3.85);assert.deepEqual(result.parts.gear,[]);
});
test('combined direct and periodic heal counts full cast and refreshes periodic effect',()=>{
 const result=skillHealing(rank('priest','Обновляющий луч',1),stats);
 assert.equal(result.castHealing,1725);assert.equal(result.hps,1035/3+690/15);
 const warrior=skillHealing(rank('warrior','Жажда жизни',6),stats);
 assert.equal(warrior.castHealing,1990);assert.equal(warrior.hps,1990/45);
});
test('conditional heals do not fabricate permanent HPS',()=>{
 const fatal=skillHealing(rank('assassin','На волоске',3),stats);
 assert.equal(fatal.castHealing,1000);assert.equal(fatal.hps,null);
 const steal=skillHealing(rank('assassin','Жажда крови',4),stats);
 assert.equal(steal.castHealing,null);assert.equal(steal.hps,null);assert.equal(steal.parts.damageDealt[0].coefficient,.02);
});
