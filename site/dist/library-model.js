export const blueprintTier=i=>i.blueprint_quality==='legendary'?8:i.item_tier;
export const propertyRank=(entry,key)=>Math.max(0,Math.min(3,Math.trunc(Number(entry?.props?.[key])||0)));
export const blueprintOwned=entry=>entry?.owned??Object.values(entry?.props||{}).some(v=>v>0);
const threshold=(rows,key,value)=>rows.filter(r=>r[key]<=value).at(-1);
export function blueprintLevel(item,entry,rules){
 if(!blueprintOwned(entry))return 0;
 let levels=Object.keys(item.property_value_ranges).map(k=>propertyRank(entry,k));
 if(item.blueprint_quality==='legendary')levels=levels.filter(n=>n>0);
 return threshold(rules.blueprint_levels,'minimum_level_of_every_counted_property',levels.length?Math.min(...levels):0).blueprint_level;
}
export function collectionLevel(items,data,tier,rules){
 const required=items.filter(i=>tier===4?blueprintTier(i)===4:[6,8].includes(blueprintTier(i)));
 const levels=required.map(i=>blueprintLevel(i,data.tiers[blueprintTier(i)]?.items?.[i.template_id],rules));
 return threshold(rules.library_levels,'minimum_level_of_every_required_blueprint',levels.length?Math.min(...levels):0).library_level;
}
