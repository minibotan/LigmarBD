import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,calculate,itemStats,validate} from '../dist/model.js';
import {gemBonus,socketLimit,gemLevelLimit,validateGems} from '../dist/gems.js';
const item={template_id:'gem-test',name:{ru:'Вещь'},item_tier:4,item_type:'head',base_stats:{health:100},enhancement_bases:{},property_value_ranges:{},item_requirements:{}};
const equip={id:item.template_id,quality:'epic',enchant:0,props:[],gems:[{type:'emerald',level:4},{type:'sapphire',level:4},{type:'ruby',level:4}]};
test('catalog gems add flat bonuses and survive saving',()=>{
 const stats=itemStats(item,equip);assert.equal(stats.health,140);assert.equal(stats.resistance,16);assert.equal(stats.defense,20);
 const hero={...fresh(),world:'zion',level:35,equipment:{head:equip}};assert.deepEqual(validate(JSON.parse(JSON.stringify(hero)),[item]).equipment.head.gems,equip.gems);
 const invalid=structuredClone(hero);invalid.equipment.head.gems[0].level=5;assert.throws(()=>validate(invalid,[item]));
});
test('socket capacity is independent of quality and jewelry has no sockets',()=>{
 for(const quality of ['common','rare','epic','legendary']){
  for(const [type,count] of [['weapon',2],['head',4],['shoulders',4],['neck',0],['waist',0],['finger',0]]){
   const i={...item,item_type:type};assert.equal(socketLimit(i),count);
   assert.throws(()=>validateGems(i,{...equip,quality,gems:Array(count+1).fill({type:'emerald',level:1})},'ostrog'));
  }
 }
});
test('tier six accepts lower gems, legendary tier six accepts tier eight, Zion caps at four',()=>{
 const i={...item,item_tier:6};assert.equal(gemLevelLimit(i,equip,'ostrog'),6);assert.equal(gemLevelLimit(i,{quality:'legendary'},'ostrog'),8);assert.equal(gemLevelLimit(i,{quality:'legendary'},'zion'),4);
 validateGems(i,{...equip,gems:[{type:'topaz',level:1},{type:'topaz',level:6}]},'ostrog');
 assert.throws(()=>validateGems(i,{...equip,gems:[{type:'ruby',level:7}]},'ostrog'));
 validateGems(i,{...equip,quality:'legendary',gems:[{type:'ruby',level:8}]},'ostrog');
});
test('weapon and armor use different gem columns',()=>{
 assert.deepEqual(gemBonus({...item,item_type:'weapon'},{type:'sapphire',level:6}),{key:'magicAttack',value:20,name:'Сапфир',level:6});
 assert.equal(gemBonus(item,{type:'sapphire',level:6}).value,26);
 assert.equal(gemBonus(item,{type:'emerald',level:9}),null);
 const weapon={...item,item_type:'weapon',item_subtype:'staff',base_stats:{magicAttackMin:10,magicAttackMax:20}};
 const s=itemStats(weapon,{...equip,quality:'common',gems:[{type:'sapphire',level:4}]});assert.equal(s.magicAttackMin,22);assert.equal(s.magicAttackMax,32);
});
test('legacy manual gems migrate to catalog and slot limits',()=>{
 const hero={...fresh(),world:'zion',level:35,equipment:{head:{...equip,gems:[{key:'health',value:999,level:9}]}}};
 const result=validate(hero,[item]);assert.deepEqual(result.equipment.head.gems,[{type:'emerald',level:4}]);
});
test('legendary gear in Zion is excluded from character calculations',()=>{
 const hero={...fresh(),world:'zion',level:35,equipment:{head:{...equip,quality:'legendary'}}};
 assert.equal(calculate(hero,[item]).gear.health,undefined);
});
