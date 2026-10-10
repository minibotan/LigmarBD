const key='ligmarbd.active-buffs.v1';
let current=null;
const normalize=value=>({version:1,selection:{heroes:['none','house','fountain'].includes(value?.selection?.heroes)?value.selection.heroes:'none',prosperity:[0,1,2,3].includes(value?.selection?.prosperity)?value.selection.prosperity:0,casino:[0,1,2,3].includes(value?.selection?.casino)?value.selection.casino:0},open:value?.open===true});
export function sharedBuffs(){
 if(current)return current;
 try{
  const saved=JSON.parse(localStorage.getItem(key));
  if(saved?.version===1){current=normalize(saved);return current}
  const roster=JSON.parse(localStorage.getItem('ligmarbd.characters.v1'));
  const build=roster?.characters?.find(c=>c.id===roster.activeId)?.build;
  const dps=JSON.parse(localStorage.getItem('ligmarbd.dps.v1'));
  const selection=build?.activeBuffSelection??dps?.buffSelections?.[dps.selectedId+':'+dps.world];
  current=normalize({selection,open:build?.activeBuffsOpen??dps?.activeBuffsOpen});
  localStorage.setItem(key,JSON.stringify(current));
 }catch{current??=normalize(null)}
 return current;
}
export function saveSharedBuffs(){try{localStorage.setItem(key,JSON.stringify(sharedBuffs()))}catch{}}
