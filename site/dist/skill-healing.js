export function skillHealing(rank,stats){
 const base=(stats.attack[0]+stats.attack[1])/2,g=stats.gear;
 const gear=((g.magicAttackMin||0)+(g.magicAttackMax||0))/2+(g.magicAttack||0);
 const cycle=rank.castMs==null||rank.cooldownMs==null?null:(rank.castMs*stats.activation/100+rank.cooldownMs)/1000;
 const parts={base:[],gear:[],flat:[],maxHealth:[],damageDealt:[]};
 let castHealing=0,hps=0,conditional=false,unknown=false;
 for(const c of rank.healing||[]){
  let amount=0;
  for(const [key,source] of [['base',base],['gear',gear],['flat',1],['maxHealth',stats.hp],['damageDealt',null]])if(c[key]){
   const value=Number.isFinite(source)?c[key]*source:null;
   parts[key].push({coefficient:c[key],value,hot:c.duration>0,trigger:c.trigger||null});
   if(value===null)unknown=true;else amount+=value;
  }
  castHealing+=amount;
  conditional ||= Boolean(c.trigger);
  // Sustained estimate: same healing-over-time effect refreshes without stacking.
  if(cycle>0)hps+=amount/Math.max(cycle,c.duration||0);
 }
 return {parts,cycle,castHealing:unknown?null:castHealing,hps:unknown||conditional||!(cycle>0)||rank.unresolved?null:hps,conditional};
}
