import {resolveItem,worlds,propertyValue} from './model.js?v=class-power-1';
export function combatRank(skill,level,build,items){
 const rank=skill.ranks[level];
 if(!rank||!skill.autoAttack)return rank;
 const e=build.equipment.weapon,w=e?resolveItem(items,e.id,e.quality):null;
 const valid=w&&w.item_tier===worlds[build.world||'ostrog'].tier;
 const base=valid?w.base_stats.physicalAttackInterval??1000:1000;
 let reduction=0;
 for(const equipped of Object.values(build.equipment)){
  const item=resolveItem(items,equipped.id,equipped.quality);
  if(!item||item.item_tier!==worlds[build.world||'ostrog'].tier)continue;
  for(const p of equipped.props||[])if(p.key==='physicalAttackInterval')reduction+=p.value??propertyValue(item.property_value_ranges[p.key],p.percent);
 }
 const interval=(base-reduction)*(build.dpsExternal?.speedMultiplier??1);
 return {...rank,cooldownMs:interval>0?interval:null,unresolved:base-reduction>0?null:'Неизвестен минимальный интервал автоатаки.'};
}
