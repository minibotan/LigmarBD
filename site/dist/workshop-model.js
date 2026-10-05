import {blueprintLevel,collectionLevel,blueprintTier} from './library-model.js';
export const masterFor=item=>item.item_type==='weapon'?'blacksmith':['neck','waist','finger'].includes(item.item_type)?'craftworks':'atelier';
export function discounts(items,library,item,tier,level,masters,rules){
 const master=masters.levels.find(r=>r.craft_level===level)?.material_reduction_percent??null;
 const collection=collectionLevel(items,library,tier,rules);
 const blueprint=item?blueprintLevel(item,library.tiers?.[blueprintTier(item)]?.items?.[item.template_id],rules):null;
 const book=rules.library_levels.find(r=>r.library_level===collection)?.material_reduction_percent??0;
 const recipe=blueprint===null?0:rules.blueprint_levels.find(r=>r.blueprint_level===blueprint)?.material_reduction_percent??0;
 return {master,collection,blueprint,book,recipe,total:master===null?null:master+book+recipe};
}
export function operationCosts(costs,master,tier,discount,{ancient=0,locked=0,revert=false}={}){
 const multiplier=costs.item_type_multipliers[{blacksmith:'weapon',atelier:'armor',craftworks:'jewelry'}[master]];
 if(!multiplier||![4,6].includes(tier))return [];
 const reduce=n=>n===0?0:discount===null?null:Math.ceil(n*(1-discount/100));
 const rows=costs.costs.filter(r=>r.workshop===master&&r.item_tier===tier).map(r=>({operation:r.operation,tokens:r.tokens,scrap:reduce(r.scrap),shards:reduce(r.shards),pine:reduce(r.pine),ancient:r.operation!=='creation'&&ancient>0?reduce(tier*multiplier):0,tears:r.operation==='forging'?(revert?costs.ancient_costs.forging.phoenix_tears_for_revert:0):r.operation==='melting'?locked**costs.ancient_costs.melting.phoenix_tears_locked_properties_exponent:0}));
 const coefficient=costs.ancient_costs.ancient_melting.ancient_shards_per_item_tier_and_type_multiplier.find(r=>ancient>=r.minimum_existing_ancient_properties&&(r.maximum_existing_ancient_properties===null||ancient<=r.maximum_existing_ancient_properties)).ancient_shards;
 return [...rows,{operation:'ancient_melting',tokens:0,scrap:0,shards:0,pine:0,ancient:coefficient*tier*multiplier,tears:0}];
}
