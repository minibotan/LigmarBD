import data from './data/gems.json' with {type:'json'};
export const gemCatalog=data.gems;
export const socketLimit=item=>data.socketLimits[item.item_type]??data.socketLimits.default;
export const gemLevelLimit=(item,e,world)=>Math.min(item.item_tier===6&&e.quality==='legendary'?8:item.item_tier,data.worldMaxLevel[world]??Infinity);
export function gemBonus(item,gem){
 const definition=gemCatalog[gem?.type],side=item.item_type==='weapon'?'weapon':'armor';
 if(!definition||!Number.isInteger(gem.level))return null;
 const value=definition.levels[gem.level]?.[side];
 return Number.isFinite(value)?{key:definition[side+'Stat'],value,name:definition.name,level:gem.level}:null;
}
export function installedGems(item,e,world){return (e.gems||[]).slice(0,socketLimit(item)).filter(g=>g.level>=1&&g.level<=gemLevelLimit(item,e,world)).map(g=>gemBonus(item,g)).filter(Boolean)}
export function migrateGems(item,e,world){
 if(!Array.isArray(e.gems)||!e.gems.some(g=>g&&!g.type&&g.key))return;
 e.gems=e.gems.flatMap(g=>{
  if(g.type)return [g];
  const type=Object.keys(gemCatalog).find(t=>[gemCatalog[t].weaponStat,gemCatalog[t].armorStat].includes(g.key));
  return type?[{type,level:Math.min(gemLevelLimit(item,e,world),Math.max(1,Math.floor(g.level)||1))}]:[];
 }).slice(0,socketLimit(item));
}
export function validateGems(item,e,world){
 if(e.gems===undefined)return;
 if(!Array.isArray(e.gems)||e.gems.length>socketLimit(item)||e.gems.some(g=>!g||g.level<1||g.level>gemLevelLimit(item,e,world)||!gemBonus(item,g)))throw Error('Некорректные камни: проверьте уровень и число ячеек');
}

export const gemTypeForBonus=g=>Object.keys(gemCatalog).find(type=>gemCatalog[type].name===g.name)||'';
export function gemMarkers(item,e){
 const gems=installedGems(item,e);
 if(!gems.length)return '';
 const summary=gems.map(g=>`${g.name} ${g.level} ур.`).join(', ');
 return `<span class="gear-gems" role="img" aria-label="Камни: ${summary}" title="${summary}">${gems.map(g=>`<i class="gem-chip gem-${gemTypeForBonus(g)}" aria-hidden="true"></i>`).join('')}</span>`;
}
