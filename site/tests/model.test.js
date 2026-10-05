import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {fresh,calculate,itemStats,validate,worlds,itemTier,resolveItem,autoAllocate,propertyValue,propertyPercent} from '../dist/model.js';
const items=JSON.parse(fs.readFileSync(new URL('../dist/data/library.json',import.meta.url))).blueprints;
const find=(type,sub)=>items.find(i=>i.item_tier===6&&i.item_type===type&&i.item_subtype===sub&&!i.blueprint_quality);
test('naked mage: fixed stat baselines and automatic HP',()=>{const s=fresh(),r=calculate(s,items);assert.equal(r.defense,3);assert.equal(r.resistance,2);assert.equal(r.evasion,11);assert.equal(r.accuracy,26);assert.equal(r.hp,1070)});
test('verified T6 epic axe enhancement +4/+5/+7',()=>{const a=find('weapon','axe');for(const [n,bonus] of [[4,51],[5,68],[7,119]]){const r=itemStats(a,{quality:'epic',enchant:n,props:[]});assert.equal(r.physicalAttackMin,268+bonus);assert.equal(r.physicalAttackMax,502+bonus)}});
test('gear contributions, defense formula and removing item',()=>{const i=find('chest','light'),s=fresh();s.stats.strength=31;s.equipment.chest={id:i.template_id,quality:'epic',enchant:4,props:[{key:'defense',percent:100}]};const r=calculate(s,items),g=itemStats(i,s.equipment.chest);assert.equal(r.defense,Math.round((5+31-2)/4)+Math.round(g.defense*1.04)+1);assert.ok(r.hpBonus>0);delete s.equipment.chest;assert.equal(calculate(s,items).gear.defense,undefined)});
test('priest attack buff is additive, no second scaling of gear',()=>{const s=fresh();s.stats.magic=205;s.buffs.passive=18;s.buffs.attack=70;const i=find('weapon','staff');s.equipment.weapon={id:i.template_id,quality:'epic',enchant:0,props:[]};assert.ok(Math.abs(calculate(s,items).attack[0]-(271+52)*(1+2.05+.18+.7))<1e-8)});
test('valid export roundtrip and malformed imports',()=>{const s=fresh();assert.deepEqual(validate(JSON.parse(JSON.stringify(s)),items),s);s.stats.magic=999;assert.throws(()=>validate(s,items));const a=fresh();a.equipment.weapon={id:find('weapon','axe').template_id,quality:'epic',enchant:4,props:[]};assert.throws(()=>validate(a,items))});

test('world limits and legacy migration',()=>{const s=fresh();delete s.world;assert.equal(validate(s,items).world,'ostrog');const z={...fresh(),world:'zion',level:35};assert.equal(validate(z,items).level,35);z.level=36;assert.throws(()=>validate(z,items));const o=fresh();o.level=56;assert.throws(()=>validate(o,items));assert.equal(worlds.ostrog.maxLevel,55)});
test('legendary records share IDs but retain own properties',()=>{const i=find('chest','light');const l=resolveItem(items,i.template_id,'legendary');assert.equal(l.blueprint_quality,'legendary');assert.equal(itemTier(l,'legendary'),8);assert.equal(itemTier(i,'epic'),6)});
test('foreign world equipment does not contribute stats',()=>{const s={...fresh(),world:'zion',level:35};s.equipment.chest={id:find('chest','light').template_id,quality:'epic',enchant:4,props:[]};assert.equal(calculate(s,items).gear.defense,undefined);assert.ok(calculate(s,items).warnings.length)});

test('auto allocation: all class priorities and full point budget',()=>{
 for(const [cls,expected] of Object.entries({mage:{magic:265},archer:{dexterity:265},assassin:{dexterity:265},warrior:{strength:265},guardian:{vitality:265},priest:{vitality:213,magic:57}})){
  const s=fresh(cls);s.stats.strength=100;const r=autoAllocate(s,items);
  assert.deepEqual(r,{strength:5,dexterity:5,vitality:5,magic:5,...expected});
  assert.equal(s.stats.strength,100);
 }
});
test('auto allocation: gear bonuses, reduced requirements and maximum across items',()=>{
 const a={template_id:'a',name:{ru:'A'},item_tier:6,item_type:'head',base_stats:{strength:10},enhancement_bases:{},property_value_ranges:{requirements:{min:10,max:20}},item_requirements:{strength:50,magic:30}};
 const b={...a,template_id:'b',base_stats:{},item_requirements:{strength:45}};
 const s=fresh();s.equipment={head:{id:'a',quality:'common',enchant:0,props:[{key:'requirements',percent:100}]},chest:{id:'b',quality:'common',enchant:0,props:[]}};
 const r=autoAllocate(s,[a,b]);assert.equal(r.strength,35);assert.equal(r.magic,235);
});
test('auto allocation: impossible requirements leave input untouched',()=>{
 const s=fresh(),before=structuredClone(s),i={template_id:'x',name:{ru:'X'},item_tier:6,item_type:'head',base_stats:{},enhancement_bases:{},property_value_ranges:{},item_requirements:{strength:500}};
 s.equipment.head={id:'x',quality:'common',enchant:0,props:[]};assert.throws(()=>autoAllocate(s,[i]),/не хватает/);assert.deepEqual(s.stats,before.stats);
 i.item_requirements={level:55};assert.throws(()=>autoAllocate(s,[i]),/уровень 55/);
});
test('priest odd remainder consumes all points with nearest 80/20 split',()=>{const s={...fresh('priest'),level:1};assert.deepEqual(autoAllocate(s,items),{strength:5,dexterity:5,vitality:9,magic:6})});

test('property percentage interpolates from minimum and extrapolates above maximum',()=>{
 const r={min:40,max:100};assert.equal(propertyValue(r,0),40);assert.equal(propertyValue(r,90),94);assert.equal(propertyValue(r,100),100);assert.equal(propertyValue(r,150),150);assert.equal(propertyValue({min:7,max:7},150),10);
 const i=find('weapon','staff'),e={quality:'epic',enchant:0,props:[{key:'defense',percent:90}]};
 assert.equal(itemStats(i,e).defense,68);
});

test('manual ancient property above interpolated 150 percent survives save and calculation',()=>{
 const item=find('hands','magic'),s=fresh(),range=item.property_value_ranges.magic;
 assert.deepEqual([range.min,range.max],[1,4]);
 s.equipment.hands={id:item.template_id,quality:'epic',enchant:0,props:[{key:'magic',value:6,percent:(6-range.min)/(range.max-range.min)*100}]};
 const restored=validate(JSON.parse(JSON.stringify(s)),items);
 assert.equal(itemStats(item,restored.equipment.hands).magic,6);
 assert.equal(Math.floor(restored.equipment.hands.props[0].percent),150);
 restored.equipment.hands.props[0].value=NaN;
 assert.throws(()=>validate(restored,items));
});

test('property scaling switches at 100 percent and supports inverse calculation',()=>{
 const r={min:1,max:4};
 assert.equal(propertyValue(r,100),4);assert.equal(propertyValue(r,125),5);assert.equal(propertyValue(r,150),6);
 assert.equal(propertyPercent(r,1),0);assert.equal(propertyPercent(r,4),100);assert.equal(propertyPercent(r,5),125);assert.equal(propertyPercent(r,6),150);
 assert.equal(propertyPercent({min:7,max:7},7),100);
});

test('automatic HP and mana include class level gain, stats, buffs and manual overrides',()=>{
 for(const [id,hp,mana] of [['mage',10,14],['priest',10,14],['warrior',15,9],['guardian',17,7],['archer',13,11],['assassin',13,11]]){
  const s=fresh(id);s.level=30;
  assert.equal(calculate(s,items).hp,63*hp);assert.equal(calculate(s,items).mana,63*mana);
  s.level=31;assert.equal(calculate(s,items).hp,65*hp);assert.equal(calculate(s,items).mana,65*mana);
  s.stats.vitality=8;s.stats.magic=9;s.buffs.hp=30;
  assert.equal(calculate(s,items).hp,Math.round(68*hp*1.3));assert.equal(calculate(s,items).mana,69*mana);
  s.baseHP=1000;s.baseMana=2000;
  assert.equal(calculate(s,items).hp,Math.round((1000+3*hp)*1.3));assert.equal(calculate(s,items).mana,2000+4*mana);
 }
});
