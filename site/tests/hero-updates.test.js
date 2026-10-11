import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,calculate,classes} from '../dist/model.js';
import {applyDpsBuffs} from '../dist/dps-buffs.js';
import {skillTags} from '../dist/skill-catalog.js';
test('gear and external activation bonuses add before the 10 percent cap',()=>{
 const gear=[{template_id:'test',name:{ru:'Test'},item_tier:6,item_type:'head',base_stats:{activationTime:50},enhancement_bases:{},property_value_ranges:{},item_requirements:{}}];
 const hero=fresh();hero.equipment.head={id:'test',quality:'common',enchant:0,props:[]};
 const data={heroGroups:[],fortune:{1:{haste:10}}};
 const once=applyDpsBuffs(hero,{heroes:'none',casino:1,prosperity:0},[],data).build;
 assert.equal(calculate(once,gear).activation,40);
 const twice=applyDpsBuffs(hero,{heroes:'none',casino:1,prosperity:1},[],data).build;
 assert.equal(calculate(twice,gear).activation,30);
 assert.equal(twice.dpsExternal.speedMultiplier,.81);
 twice.dpsExternal.activationReduction=80;assert.equal(calculate(twice,gear).activation,10);
});
test('skill feature tags follow explicit mechanics and status flags',()=>{
 const tags=skillTags({Owner:'warrior',Type:'attack',TrueHit:true,Unstoppable:true,Effects:[{Chance:30,EffectStatuses:[{Type:'taunt',AffectsBosses:false}],EffectMechanics:[{Type:'cancelActivation'}]}]});
 for(const label of ['Не промахивается','Нельзя сбить','Агр','Сбивает каст'])assert.ok(tags.some(t=>t.label===label));
 assert.ok(tags.find(t=>t.label==='Агр').tip.includes('30%'));
 assert.equal(skillTags({Owner:'warrior',Type:'attack',Effects:[]}).length,0);
});
test('every class has a character portrait',()=>{for(const c of Object.values(classes))assert.ok(c.portrait)});
