import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh} from '../dist/model.js';
import {validateSkills,validateRoster,putCharacter,classRoster,addCharacterSlot,learnAllSkills,skillRequirement} from '../dist/characters.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/skills.json',import.meta.url)));
const items=JSON.parse(fs.readFileSync(new URL('../dist/data/library.json',import.meta.url))).blueprints;
test('legacy builds start without learned skills; invalid class skills and ranks rejected',()=>{
 assert.deepEqual(validateSkills(fresh(),catalog).skills,{});
 const id=catalog.mage[0].id;
 assert.throws(()=>validateSkills({...fresh(),skills:{[id]:11}},catalog));
 assert.throws(()=>validateSkills({...fresh('warrior'),skills:{[id]:1}},catalog));
 assert.throws(()=>validateSkills({...fresh(),skills:{[id]:1.5}},catalog));
});
test('two characters round-trip independently with their learned skills and gear',()=>{
 const id=catalog.mage[0].id,first={...fresh(),name:'Маг',skills:{[id]:10}},second={...fresh('warrior'),name:'Воин',skills:{}};
 const roster={version:1,activeId:'mage',characters:[{id:'mage',build:first},{id:'warrior',build:second}]};
 const changed=structuredClone(first);changed.skills[id]=3;changed.name='Другой маг';
 const result=putCharacter(roster,'mage',changed);changed.skills[id]=8;
 const restored=validateRoster(JSON.parse(JSON.stringify(result)),items,catalog);
 assert.equal(restored.characters[0].build.skills[id],3);
 assert.deepEqual(restored.characters[1].build,second);
 assert.equal(roster.characters[0].build.skills[id],10);
 assert.throws(()=>validateRoster({...roster,characters:[roster.characters[0],roster.characters[0]]},items,catalog));
});
test('all six catalogs contain the 122 unique skills with bounded rank definitions',()=>{
 assert.equal(Object.keys(catalog).length,6);
 assert.equal(Object.values(catalog).flat().length,122);
 for(const skills of Object.values(catalog)){
  assert.equal(new Set(skills.map(s=>s.id)).size,skills.length);
  for(const s of skills)for(const rank of Object.keys(s.ranks))assert.ok(+rank>=1&&+rank<=s.maxLevel);
 }
});

test('class tabs preserve the active legacy build and isolate all class and world variants',()=>{
 const skill=catalog.mage[0].id;
 const old={version:1,activeId:'active',characters:[{id:'other',build:{...fresh(),name:'Other'}},{id:'active',build:{...fresh(),name:'Active',skills:{[skill]:3},stats:{strength:5,dexterity:5,vitality:5,magic:50},buffs:{...fresh().buffs,attack:30}}}]};
 const tabs=classRoster(old);
 assert.equal(tabs.characters.length,12);
 assert.equal(new Set(tabs.characters.map(c=>c.build.classId)).size,6);
 assert.equal(tabs.characters.find(c=>c.build.classId==='mage'&&c.build.world==='ostrog').build.name,'Active');
 assert.equal(tabs.activeId,'active');
 const warrior=tabs.characters.find(c=>c.build.classId==='warrior');
 const updated=structuredClone(warrior.build);updated.stats.strength=100;updated.skills={[catalog.warrior.find(s=>!s.autoAttack&&s.maxLevel>=2).id]:2};
 const saved=putCharacter(tabs,warrior.id,updated);
 const restored=classRoster(validateRoster(JSON.parse(JSON.stringify(saved)),items,catalog));
 assert.equal(restored.activeId,warrior.id);
 assert.equal(restored.characters.find(c=>c.id==='active').build.stats.magic,50);
 assert.equal(restored.characters.find(c=>c.id==='active').build.skills[skill],3);
 assert.equal(restored.characters.find(c=>c.id==='active').build.buffs.attack,30);
 assert.equal(restored.characters.find(c=>c.id===warrior.id).build.stats.strength,100);
 assert.equal(old.characters.length,2);
 assert.deepEqual(classRoster(restored),restored);
});

test('world variants keep equipment, skills, stats and buffs independently',()=>{
 let roster=classRoster({version:1,activeId:null,characters:[]});
 const zion=roster.characters.find(c=>c.build.classId==='mage'&&c.build.world==='zion');
 const ostrog=roster.characters.find(c=>c.build.classId==='mage'&&c.build.world==='ostrog');
 assert.equal(zion.build.level,35);
 const build=structuredClone(ostrog.build);build.stats.magic=80;build.buffs.defense=70;build.skills={[catalog.mage[0].id]:4};
 const item=items.find(i=>i.item_tier===6&&!i.blueprint_quality&&i.item_type==='head');
 build.equipment.head={id:item.template_id,quality:'epic',enchant:4,props:[]};
 roster=putCharacter(roster,ostrog.id,build);
 const other=structuredClone(zion.build);other.stats.vitality=35;
 roster=putCharacter(roster,zion.id,other);
 const restored=classRoster(validateRoster(JSON.parse(JSON.stringify(roster)),items,catalog));
 assert.equal(restored.activeId,zion.id);
 assert.deepEqual(restored.characters.find(c=>c.id===ostrog.id).build,build);
 assert.deepEqual(restored.characters.find(c=>c.id===zion.id).build,other);
 assert.equal(new Set(restored.characters.map(c=>c.build.classId+':'+c.build.world)).size,12);
});

test('learn all uses explicit requirements and estimates missing ranks within world cap',()=>{
 const skills=[{id:'early',unlockLevel:1,maxLevel:10,ranks:{10:{requiredLevel:45}}},{id:'late',unlockLevel:40,maxLevel:10,ranks:{1:{requiredLevel:40}}},{id:'known',unlockLevel:10,maxLevel:10,ranks:{2:{requiredLevel:15},3:{requiredLevel:20}}}];
 const build={...fresh(),level:52};
 const result=learnAllSkills(build,{mage:skills});
 assert.deepEqual(result.build.skills,{early:10,late:4,known:9});
 assert.equal(skillRequirement(skills[0],2).level,5);
 assert.equal(skillRequirement(skills[2],3).estimated,false);
 assert.equal(result.estimated,2);
 assert.deepEqual(learnAllSkills({...build,world:'zion'},{mage:skills}).build.skills,{early:8,late:0,known:6});
 assert.equal(build.skills,undefined);
});

test('up to five slots per class survive saves with separate world builds',()=>{
 let roster=classRoster({version:1,characters:[],activeId:null});
 const original=roster.characters.find(c=>c.build.classId==='mage'&&c.build.world==='ostrog');
 for(let n=1;n<5;n++)roster=addCharacterSlot(roster,'mage','ostrog');
 assert.equal(roster.characters.filter(c=>c.build.classId==='mage').length,10);
 assert.throws(()=>addCharacterSlot(roster,'mage','zion'));
 const active=roster.characters.find(c=>c.id===roster.activeId);
 const build=structuredClone(active.build);build.stats.magic=100;build.skills={[catalog.mage[0].id]:4};
 roster=putCharacter(roster,active.id,build);
 roster=classRoster(validateRoster(JSON.parse(JSON.stringify(roster)),items,catalog));
 assert.equal(roster.characters.find(c=>c.id===active.id).slot,4);
 assert.equal(roster.characters.find(c=>c.id===active.id).build.stats.magic,100);
 assert.equal(roster.characters.find(c=>c.build.classId==='mage'&&c.slot===4&&c.build.world==='zion').build.stats.magic,5);
 assert.deepEqual(roster.characters.find(c=>c.id===original.id).build,original.build);
 assert.equal(roster.characters.filter(c=>c.build.classId==='warrior').length,2);
});
