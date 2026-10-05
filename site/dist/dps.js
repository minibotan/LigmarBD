import {combatRank} from './autoattack.js?v=class-power-1';
import {calculate,resolveItem} from './model.js?v=class-power-1';
import {reduction,hitChance} from './combat-tips.js';
const epsilon=1e-8;
export function targeting(skill,rank){
 const types=rank?.targets||skill.targets||[];
 if(!['attack','curse'].includes(skill.type))return types.includes('party')?'allies':types.includes('self')?'self':'support';
 return types.includes('close')?'area':types.includes('party')?'group':'single';
}
function simulateSequence(build,items,catalog,steps,targets,{mode='expected',learnedOnly=false,allies=1,allVisible=true}={}){
 const baseBuild=structuredClone(build),skills=catalog[build.classId]||[];
 const passive=skills.find(s=>s.type==='passive'&&s.ranks[build.skills?.[s.id]]?.attackBonus);
 if(passive)baseBuild.buffs.passive=passive.ranks[build.skills[passive.id]].attackBonus*100;
 const base=calculate(baseBuild,items),rows=[],events=[],active=[],controls=[],ready=new Map();let clock=0,knownTime=true;
 let incomplete=false,currentTargetId=null;
 const slows=[];
 const baseSearch=t=>t.range==='ranged'?0.8:1.5;
 const enemyStates=new Map(targets.map(t=>{const target=t.enemyTarget??(t.visible===false?'none':'hero');return [t.id,{target,searchStart:target==='none'?0:null,searchAt:null}]}));
 const advanceEnemies=time=>{
  for(const target of targets){
   const state=enemyStates.get(target.id);
   if(state.target!=='none'||state.searchStart===null)continue;
   if(state.searchAt===null&&state.searchStart<=time+epsilon){
    const slow=slows.filter(e=>e.targetId===target.id&&e.start<=state.searchStart&&e.until>state.searchStart+epsilon).at(-1);
    const speed=1-(slow?.percent??0)/100;
    state.searchAt=speed>0?state.searchStart+baseSearch(target)/speed:Infinity;
   }
   if(state.searchAt!==null&&state.searchAt<=time+epsilon){state.target='hero';state.searchAt=null;state.searchStart=null;}
  }
 };
 const snapshot=()=>targets.map(t=>({id:t.id,...enemyStates.get(t.id)}));
 const enemyVisible=t=>allVisible||t.id===currentTargetId||enemyStates.get(t.id).target!=='none';
 const weapon=build.equipment.weapon?resolveItem(items,build.equipment.weapon.id,build.equipment.weapon.quality)?.item_subtype:'unarmed';
 const diagnostics=base.warnings.map(w=>'Экипировка: '+w);
 if(base.warnings.length)incomplete=true;
 for(const skill of skills)if(skill.type==='passive'&&(build.skills?.[skill.id]||0)>0&&!skill.ranks[build.skills[skill.id]]){diagnostics.push(`Нет параметров пассивного умения «${skill.name}» уровня ${build.skills[skill.id]}.`);incomplete=true}
 for(let index=0;index<steps.length;index++){
  if(knownTime)advanceEnemies(clock);
  const step=steps[index],row={index,start:knownTime?clock:null,end:null,errors:[],warnings:[],effects:[],targets:[],total:null,cast:null,originalCast:null,cooldown:null};rows.push(row);
  if(step.kind==='wait'||step.kind==='run'){
   row.name=step.kind==='run'?'Бег':'Пауза';const duration=Number(step.seconds??(step.kind==='run'?0.3:1));
   if(!Number.isFinite(duration)||duration<0||duration>3600){row.errors.push('Пауза должна быть от 0 до 3600 с.');incomplete=true;knownTime=false;continue}
   row.cast=row.originalCast=duration;row.end=knownTime?clock+duration:null;
   if(step.kind==='run'){
    row.cooldown=3;
    if(!knownTime){row.errors.push('Время бега не определено из-за предыдущего шага.');incomplete=true;}
    else if((ready.get('run')||0)>clock+epsilon){row.errors.push(`Бег ещё в откате: ${((ready.get('run')||0)-clock).toFixed(2)} с.`);incomplete=true;}
    else{
     ready.set('run',row.end+3);
     for(const target of targets){
      const state=enemyStates.get(target.id);
      const immobilized=controls.filter(e=>e.targetId===target.id&&['root','stun','sleep'].includes(e.family)&&e.until>clock+epsilon);
      if(state.target!=='hero'||!immobilized.length)continue;
      if(!immobilized.some(e=>e.chance===1)){row.warnings.push(`${target.name}: потеря цели зависит от случайного контроля.`);incomplete=true;continue;}
      state.target='none';state.searchStart=Math.max(...immobilized.filter(e=>e.chance===1).map(e=>e.until));state.searchAt=null;
      row.warnings.push(`${target.name}: потерял героя из цели.`);
     }
    }
   }
   clock+=duration;if(knownTime)advanceEnemies(clock);row.enemyStates=snapshot();row.total=row.errors.length?null:0;continue;
  }
  const skill=skills.find(s=>s.id===step.skillId),level=skill?.autoAttack?1:learnedOnly?(build.skills?.[step.skillId]||0):Number(step.level),sourceRank=skill?combatRank(skill,level,build,items):null;
  const rank=sourceRank&&skill?.channelIntervalMs?{...sourceRank,unresolved:null}:sourceRank;
  row.skill=skill;row.level=level;row.name=skill?.name||'Выберите умение';
  if(!skill||!Number.isInteger(level)||level<1||level>skill.maxLevel){row.errors.push('Умение не выбрано или не изучено.');incomplete=true;knownTime=false;continue}
  if(skill.type==='passive'){row.errors.push('Пассивное умение нельзя добавить как каст.');incomplete=true;continue}
  if(!rank||rank.castMs==null||rank.cooldownMs==null){row.errors.push('Нет точных параметров этого уровня. Время следующих шагов не определено.');incomplete=true;knownTime=false;continue}
  row.rank=rank;row.originalCast=rank.castMs/1000;row.cast=row.originalCast*base.activation/100;row.cooldown=rank.cooldownMs/1000;
  if(skill.autoAttack){row.cast=row.originalCast=rank.cooldownMs/1000;row.cooldown=0;}
  if(step._volley){row.cast=row.originalCast=skill.channelIntervalMs/1000;}
  if(step._moreVolleys)row.cooldown=0;
  row.end=knownTime?clock+row.cast:null;
  row.kind=targeting(skill,rank);row.effects=rank.effects||[];
  const selected=step.targetId===''?null:targets.find(t=>t.id===step.targetId)||targets[0];
  if(knownTime)advanceEnemies(row.end);
  const hostile=['attack','curse'].includes(skill.type);
  if(hostile)currentTargetId=selected?.id??null;
  const closeProbability=t=>{
   if(t.id===currentTargetId)return 1;
   if(!enemyVisible(t))return 0;
   if(t.range!=='ranged')return 1;
   const effects=controls.filter(e=>e.targetId===t.id&&['root','stun','taunt'].includes(e.family)&&e.until>row.end+epsilon);
   if(effects.some(e=>e.chance===1))return 1;
   if(effects.length){row.warnings.push(`${t.name}: попадание по дальнику зависит от случайного контроля; точный DPS не определён.`);incomplete=true;}
   return 0;
  };
  row.targets=hostile?(row.kind==='group'?[...targets]:row.kind==='area'?targets.filter(t=>closeProbability(t)>0):[selected].filter(Boolean)):[];
  row.targetLabel=row.kind==='single'?(selected?.name||'Нет цели'):row.kind==='area'?`Ближайшие (${row.targets.length})`:row.kind==='group'?`Группа цели (${row.targets.length})`:row.kind==='allies'?`Союзники (${allies})`:row.kind==='self'?'На себя':'Поддержка';
  if((rank.requiredLevel??skill.unlockLevel??0)>build.level)row.errors.push(`Нужен уровень персонажа ${rank.requiredLevel??skill.unlockLevel}.`);
  const weapons=rank.weapons||skill.weapons||[];
  const ironWill=active.some(a=>a.name==='Железная воля'&&a.until>(row.start??clock));
  const weaponOK=!weapons.length||(weapons.includes('any')&&weapon!=='unarmed')||weapons.includes(weapon)||(weapons.includes('melee')&&['sword','axe','hammer','fist','daggers','stiletto'].includes(weapon))||(weapons.includes('defenseStand')&&ironWill);
  if(!weaponOK)row.errors.push('Не подходит оружие или требуется защитная стойка.');
  if(knownTime&&(ready.get(skill.id)||0)>clock+epsilon)row.errors.push(`Откат не прошёл: ещё ${((ready.get(skill.id)||0)-clock).toFixed(2)} с.`);
  if(!knownTime){row.errors.push('Время не определено из-за предыдущего шага.');incomplete=true;continue}
  if(!row.targets.length&&hostile)row.warnings.push('В области действия нет подходящих целей.');
  if(row.errors.length){incomplete=true;clock=row.end;continue}
  ready.set(skill.id,row.end+row.cooldown);
  const ongoing=active.filter(a=>a.until>row.end+epsilon);
  for(const a of ongoing){
   if(a.skillId===skill.id&&(!row.targets.length||row.targets.some(t=>a.targetIds.includes(t.id))))row.warnings.push(`«${a.name}» ещё действует ${(a.until-row.end).toFixed(2)} с: повторное наложение может обновить эффект.`);
   else if((rank.exclusive||[]).includes(a.name)||(a.exclusive||[]).includes(skill.name))row.warnings.push(`Несовместимо с «${a.name}», действует до ${a.until.toFixed(2)} с.`);
   else if(row.effects.some(e=>e.family==='slow')&&a.families.includes('slow')&&row.targets.some(t=>a.targetIds.includes(t.id)))row.warnings.push(`Замедление перекрывает «${a.name}».`);
  }
  if(rank.unresolved){row.warnings.push(rank.unresolved);incomplete=true;row.unknown=true}
  if(row.warnings.some(w=>w.startsWith('Несовместимо'))){row.unknown=true;incomplete=true}
  if(!row.unknown){
   const attackBonus=ongoing.reduce((n,a)=>n+a.attackBonus,0),critBonus=ongoing.reduce((n,a)=>n+a.critBonus,0);
   const updated=structuredClone(baseBuild);updated.buffs.attack+=attackBonus*100;
   const calculated=calculate(updated,items),gear=calculated.gear;
   const currentBase=(calculated.attack[0]+calculated.attack[1])/2;
   for(const target of row.targets){
    const hit=mode==='expected'&&!['mage','priest'].includes(build.classId)&&!rank.cannotMiss?(hitChance(calculated.accuracy,target.evasion)??0):1;
    if(mode==='expected'&&hitChance(calculated.accuracy,target.evasion)===null&&!['mage','priest'].includes(build.classId)&&!rank.cannotMiss){incomplete=true;row.unknown=true;row.warnings.push('Шанс попадания при нулевых меткости и уклонении не определён.');continue}
    const crit=mode==='expected'?1+calculated.crit/100*(1+critBonus):1;
    const dotComponents=(rank.damage||[]).filter(d=>d.duration>0);
    if(dotComponents.length){
     const old=events.filter(e=>e.dot&&e.skillId===skill.id&&e.targetId===target.id&&e.time>=row.end-epsilon);
     if(old.some(e=>e.weight>epsilon))row.warnings.push(`${target.name}: новый DOT заменяет оставшиеся тики прежнего при попадании.`);
     for(const event of old)event.weight*=1-hit;
    }
    for(const component of rank.damage||[]){
     const type=component.type,prefix=type==='magic'?'magic':'physical';
     const gearAttack=((gear[prefix+'AttackMin']||0)+(gear[prefix+'AttackMax']||0))/2+(gear[prefix+'Attack']||0);
     const damage=component.base*currentBase+component.gear*gearAttack+component.flat;
     const dr=reduction(type==='magic'?target.resistance:target.defense,build.level);
     const duration=component.duration,ticks=duration?Math.max(1,Math.ceil(duration)):1;
     for(let tick=0;tick<ticks;tick++)events.push({row:index,skillId:skill.id,targetId:target.id,targetName:target.name,time:row.end+tick,dot:duration>0,type,raw:damage/ticks*(duration?1:crit),reduction:dr,weight:hit});
    }
   }
   row.total=0;
  }
  if(!row.unknown&&hostile)for(const target of row.targets){
   const hit=mode==='expected'&&!['mage','priest'].includes(build.classId)&&!rank.cannotMiss?(hitChance(base.accuracy,target.evasion)??0):1;
   for(const effect of row.effects){
    if(effect.family==='slow'&&effect.recipient!=='self'&&effect.seconds>0){
     const chance=(effect.chance??1)*hit;
     if(chance>0&&chance<1){row.warnings.push(`${target.name}: время поиска зависит от случайного замедления.`);incomplete=true;}
     else if(chance===1&&Number.isFinite(effect.slowPercent)){
      for(const old of slows)if(old.targetId===target.id)old.until=Math.min(old.until,row.end);
      slows.push({targetId:target.id,start:row.end,until:row.end+effect.seconds,percent:effect.slowPercent});
     }
    }
    const family=['root','stun','taunt','sleep'].includes(effect.family)?effect.family:/провоциру/i.test(effect.label)?'taunt':/погружает.*сон/i.test(effect.label)?'sleep':null;
    if(!family||!(effect.seconds>0))continue;
    const chance=(effect.chance??1)*hit;
    if(chance<=0)continue;
    if(['root','stun'].includes(family)&&controls.some(e=>e.targetId===target.id&&e.family===family&&e.chance===1&&e.until>row.end+epsilon))continue;
    controls.push({targetId:target.id,family,chance,until:row.end+effect.seconds});
    const state=enemyStates.get(target.id);
    if(chance===1&&['root','stun','sleep'].includes(family)&&state.target==='none'){state.searchStart=Math.max(state.searchStart??0,row.end+effect.seconds);state.searchAt=null;}
    if(chance===1&&family==='taunt'){state.target='hero';state.searchAt=null;state.searchStart=null;}
   }
  }
  const duration=Math.max(0,...row.effects.map(e=>e.seconds));
  if(duration>0||skill.name==='Железная воля'){
   for(const a of active)if((a.skillId===skill.id&&(!row.targets.length||row.targets.every(t=>a.targetIds.includes(t.id))))||((rank.exclusive||[]).includes(a.name)))a.until=Math.min(a.until,row.end);
   active.push({skillId:skill.id,name:skill.name,until:duration?row.end+duration:Infinity,exclusive:rank.exclusive||[],families:row.effects.map(e=>e.family),targetIds:row.targets.map(t=>t.id),attackBonus:row.unknown?0:Math.max(0,(rank.attackBonus||0)-(build.dpsExternal?.groupAttack?.[skill.id]||0)),critBonus:row.unknown?0:rank.critDamageBonus||0});
  }
  row.enemyStates=snapshot();
  clock=row.end;
 }
 const end=knownTime?clock:null;
 for(const row of rows){
  row.breakdown=[];
  if(row.total===null)continue;
  for(const target of targets){
   const packets=events.filter(e=>e.row===row.index&&e.targetId===target.id&&e.weight>epsilon);
   if(!packets.length)continue;
   const before=packets.reduce((n,e)=>n+e.raw*e.weight,0),after=packets.reduce((n,e)=>n+e.raw*(1-e.reduction)*e.weight,0);
   row.breakdown.push({id:target.id,name:target.name,before,after,removed:before-after});
  }
  row.total=row.breakdown.reduce((n,b)=>n+b.after,0);
  row.warnings=[...new Set(row.warnings)];
 }
 const live=events.filter(e=>e.weight>epsilon),tailEnd=live.length?Math.max(end??0,...live.map(e=>e.time)):(end??0);
 const total=live.reduce((n,e)=>n+e.raw*(1-e.reduction)*e.weight,0),during=end===null?null:live.filter(e=>e.time<=end+epsilon).reduce((n,e)=>n+e.raw*(1-e.reduction)*e.weight,0);
 return {rows,end,tailEnd,total,during,complete:!incomplete,dps:!incomplete&&end>0?during/end:null,tailDps:!incomplete&&tailEnd>0?total/tailEnd:null,activation:base.activation,diagnostics,passiveApplied:passive?.name||null};
}

// Repeat packets run separately so effects and target eligibility are checked at each hit.
export function simulateRotation(build,items,catalog,steps,targets,options={}){
 const expanded=[],groups=[];
 for(const step of steps){
  const skill=(catalog[build.classId]||[]).find(s=>s.id===step.skillId);
  const requested=skill?.autoAttack?Number(step.hits??1):skill?.channelIntervalMs?Number(step.volleys??0)+1:1;
  const valid=Number.isInteger(requested)&&requested>=1&&requested<=1000;
  const count=valid?requested:1,start=expanded.length;
  for(let i=0;i<count;i++)expanded.push({...step,_volley:!!skill?.channelIntervalMs&&i>0,_moreVolleys:!!skill?.channelIntervalMs&&i<count-1});
  groups.push({start,count,valid});
 }
 const result=simulateSequence(build,items,catalog,expanded,targets,options);
 result.rows=groups.map(({start,count,valid},index)=>{
  const packets=result.rows.slice(start,start+count),first=packets[0],last=packets.at(-1);
  const row={...first,index,enemyStates:last.enemyStates,end:last.end,cast:packets.some(p=>p.cast===null)?null:packets.reduce((n,p)=>n+p.cast,0),originalCast:packets.some(p=>p.originalCast===null)?null:packets.reduce((n,p)=>n+p.originalCast,0),cooldown:last.cooldown,total:packets.some(p=>p.total===null)?null:packets.reduce((n,p)=>n+p.total,0),errors:[...new Set(packets.flatMap(p=>p.errors))],warnings:[...new Set(packets.flatMap(p=>p.warnings))],breakdown:[]};
  for(const packet of packets)for(const part of packet.breakdown){
   const id=part.id;
   let total=row.breakdown.find(p=>p.id===id);
   if(!total){total={id,name:part.name,before:0,after:0,removed:0};row.breakdown.push(total);}
   for(const key of ['before','after','removed'])total[key]+=part[key];
  }
  if(!valid){row.errors.push('Число ударов: 1–1000; дополнительных залпов: 0–999, только целые числа.');row.total=null;result.complete=false;result.dps=result.tailDps=null;}
  return row;
 });
 return result;
}
