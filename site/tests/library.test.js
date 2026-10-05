import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blueprintLevel,collectionLevel} from '../dist/library-model.js';
const rules=JSON.parse(fs.readFileSync(new URL('../dist/data/library-levels.json',import.meta.url)));
const common={template_id:'a',item_tier:6,property_value_ranges:{magic:{},health:{}}};
const legendary={...common,blueprint_quality:'legendary'};
test('blueprints distinguish missing, owned, ordinary and legendary research',()=>{
 assert.equal(blueprintLevel(common,undefined,rules),0);
 assert.equal(blueprintLevel(common,{owned:true,props:{}},rules),1);
 assert.equal(blueprintLevel(common,{owned:true,props:{magic:3}},rules),1);
 assert.equal(blueprintLevel(legendary,{owned:true,props:{magic:3}},rules),4);
 assert.equal(blueprintLevel(legendary,{owned:true,props:{}},rules),1);
 assert.equal(blueprintLevel(common,{props:{magic:2,health:3}},rules),3);
});
test('Ostrog combines T6 and T8 while Zion is independent',()=>{
 const zion={...common,item_tier:4};
 const data={tiers:{4:{items:{a:{owned:true,props:{magic:3,health:3}}}},6:{items:{a:{owned:true,props:{magic:3,health:3}}}},8:{items:{}}}};
 assert.equal(collectionLevel([zion,common,legendary],data,4,rules),5);
 assert.equal(collectionLevel([zion,common,legendary],data,6,rules),1);
 data.tiers[8].items.a={owned:true,props:{magic:2}};
 assert.equal(collectionLevel([zion,common,legendary],data,6,rules),4);
 assert.equal(collectionLevel([zion,common,legendary],data,8,rules),4);
});
