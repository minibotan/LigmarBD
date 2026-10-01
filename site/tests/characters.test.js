import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh} from '../dist/model.js';
import {validateSkills,validateRoster,putCharacter} from '../dist/characters.js';
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
test('all six catalogs contain the 118 unique skills with bounded rank definitions',()=>{
 assert.equal(Object.keys(catalog).length,6);
 assert.equal(Object.values(catalog).flat().length,118);
 for(const skills of Object.values(catalog)){
  assert.equal(new Set(skills.map(s=>s.id)).size,skills.length);
  for(const s of skills)for(const rank of Object.keys(s.ranks))assert.ok(+rank>=1&&+rank<=s.maxLevel);
 }
});
