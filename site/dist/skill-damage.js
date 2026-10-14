export function skillDamage(rank,stats,{autoAttack=false}={}){
 const base=(stats.attack[0]+stats.attack[1])/2,parts={base:[],gear:[],flat:[]};
 const castSeconds=rank.castMs==null?null:rank.castMs*stats.activation/100/1000;
 const actionSeconds=autoAttack?(rank.cooldownMs??0)/1000:castSeconds;
 let directDamage=0,dotDamage=0,firstTickDamage=0,tickDps=0;
 for(const d of rank.damage||[]){
  const prefix=d.type==='magic'?'magic':'physical',g=stats.gear;
  const gear=((g[prefix+'AttackMin']||0)+(g[prefix+'AttackMax']||0))/2+(g[prefix+'Attack']||0);
  for(const [key,source] of [['base',base],['gear',gear],['flat',1]])if(d[key])parts[key].push({coefficient:d[key],value:d[key]*source,type:d.type,dot:d.duration>0});
  const raw=d.base*base+d.gear*gear+d.flat;
  if(d.duration>0){
   const ticks=Math.max(1,Math.ceil(d.duration)),first=raw/ticks;
   dotDamage+=raw;firstTickDamage+=first;
   if(ticks>1)tickDps+=first;
  }else directDamage+=raw*(1+stats.crit/100*(1+(rank.critDamageBonus||0)));
 }
 const hasDot=dotDamage>0,castWindowDamage=directDamage+firstTickDamage,totalDamage=directDamage+dotDamage;
 const dps=actionSeconds>0&&!rank.unresolved?castWindowDamage/actionSeconds:null;
 return {parts,castSeconds,actionSeconds,hasDot,directDamage,dotDamage,firstTickDamage,tickDps,castWindowDamage,totalDamage,castDamage:totalDamage,damage:castWindowDamage,dps,effectDps:hasDot&&dps!==null?dps+tickDps:null};
}
