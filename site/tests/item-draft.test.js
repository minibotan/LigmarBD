import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeLegendary,itemDraft,resolveItem,propertyValue,itemStats} from '../dist/model.js';
const items=JSON.parse(readFileSync(new URL('../dist/data/library.json',import.meta.url))).blueprints;
test('T6 staff can become T8 without carrying unsupported properties or mutating the equipped staff',()=>{
 const staff=items.find(i=>i.item_subtype==='staff'&&i.item_tier===6&&!i.blueprint_quality);
 const previous={id:staff.template_id,quality:'epic',enchant:8,props:[{key:'magic',percent:90},{key:'activationTime',percent:100},{key:'magicAttack',percent:90}],gems:[{type:'sapphire',level:6}]};
 const before=structuredClone(previous),legendary=resolveItem(items,previous.id,'legendary');
 assert.throws(()=>propertyValue(legendary.property_value_ranges.magic,90));
 const draft=itemDraft(legendary,previous,'legendary');
 assert.equal(draft.quality,'legendary');assert.equal(draft.enchant,8);
 assert.deepEqual(draft.props.map(p=>p.key),['activationTime','magicAttack','health']);
 for(const p of draft.props)assert.ok(Number.isFinite(propertyValue(legendary.property_value_ranges[p.key],p.percent)));
 assert.doesNotThrow(()=>itemStats(legendary,draft));assert.deepEqual(previous,before);assert.deepEqual(draft.gems,previous.gems);
 assert.deepEqual(itemDraft(staff,previous,'epic'),previous);
});

test('legendary properties always contain three distinct keys at discrete percentages',()=>{
 for(const item of items.filter(i=>i.blueprint_quality==='legendary')){
  for(const percent of [0,25,50,80,90,100,125,150,200]){
   const e=normalizeLegendary(item,{quality:'legendary',props:[{key:Object.keys(item.property_value_ranges)[0],percent,value:9999}]});
   assert.equal(e.props.length,3);assert.equal(new Set(e.props.map(p=>p.key)).size,3);
   for(const p of e.props){assert.ok([0,50,100,150].includes(p.percent));assert.equal(p.value,propertyValue(item.property_value_ranges[p.key],p.percent))}
  }
 }
});
