export function applyDpsBuffs(build,selection,builds,data){
 const result=structuredClone(build),totals={},details=[],warnings=[],groupAttack={};let speedMultiplier=1;
 const add=bonuses=>{for(const [key,value] of Object.entries(bonuses))totals[key]=(totals[key]||0)+value;};
 if(selection.heroes!=='none')for(const group of data.heroGroups){
  const level=selection.heroes==='fountain'?10:Math.max(0,...builds.filter(b=>b.learnedOnly&&b.build.world===build.world&&b.build.classId===group.classId).map(b=>b.build.skills?.[group.skillId]||0));
  if(!level)continue;
  const rank=group.levels[level];if(!rank){warnings.push(`${group.name}: нет данных для ${level} ур.`);continue;}
  add(rank.bonuses);details.push({name:group.name,level,bonuses:rank.bonuses,estimated:rank.estimated});
  if(rank.estimated)warnings.push(`${group.name}, ${level} ур.: предварительная экстраполяция.`);
  groupAttack[group.skillId]=((['mage','priest'].includes(build.classId)?rank.bonuses.magicAttack:rank.bonuses.physicalAttack)||0)/100;
 }
 for(const [key,name] of [['prosperity','Процветание'],['casino','Казик']]){
  const rank=data.fortune[selection[key]];if(rank){add(rank);speedMultiplier*=1-rank.haste/100;details.push({name,level:selection[key],bonuses:rank});}
 }
 for(const key of ['defense','resistance','hp','evasion'])result.buffs[key]+=(totals[key]||0);
 result.buffs.attack+=(totals.attack||0)+(totals[['mage','priest'].includes(build.classId)?'magicAttack':'physicalAttack']||0);
 result.dpsExternal={speedMultiplier,groupAttack};
 if(totals.magicExtra)warnings.push(`Дополнительный магический урон +${totals.magicExtra}%: не включён в DPS, пока не уточнены запускающие его удары.`);
 return {build:result,totals,details,warnings};
}
