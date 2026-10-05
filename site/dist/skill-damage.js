export function skillDamage(rank,stats){
 const base=(stats.attack[0]+stats.attack[1])/2,parts={base:[],gear:[],flat:[]};
 const cycle=rank.castMs==null||rank.cooldownMs==null?null:(rank.castMs*stats.activation/100+rank.cooldownMs)/1000;
 let damage=0,castDamage=0;
 for(const d of rank.damage||[]){
  const prefix=d.type==='magic'?'magic':'physical',g=stats.gear;
  const gear=((g[prefix+'AttackMin']||0)+(g[prefix+'AttackMax']||0))/2+(g[prefix+'Attack']||0);
  for(const [key,source] of [['base',base],['gear',gear],['flat',1]])if(d[key])parts[key].push({coefficient:d[key],value:d[key]*source,type:d.type,dot:d.duration>0});
  const raw=d.base*base+d.gear*gear+d.flat;
  const ticks=d.duration>0?Math.max(1,Math.ceil(d.duration)):1;
  const retained=d.duration>0&&cycle!==null?Math.min(ticks,Math.max(0,Math.ceil(cycle-1e-8)))/ticks:1;
  castDamage+=raw*(d.duration>0?1:1+stats.crit/100*(1+(rank.critDamageBonus||0)));
  damage+=raw*retained*(d.duration>0?1:1+stats.crit/100*(1+(rank.critDamageBonus||0)));
 }
 return {parts,cycle,damage,castDamage,dps:cycle>0&&!rank.unresolved?damage/cycle:null};
}
