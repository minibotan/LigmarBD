import {validate,classes,fresh,worlds} from './model.js';
export function validateSkills(build,catalog){
 const skills=build.skills??{};
 if(!skills||typeof skills!=='object'||Array.isArray(skills))throw Error('Некорректные умения');
 const allowed=new Map((catalog[build.classId]||[]).map(s=>[s.id,s.maxLevel]));
 for(const [id,level] of Object.entries(skills))if(!allowed.has(id)||!Number.isInteger(level)||level<0||level>allowed.get(id))throw Error('Некорректный уровень умения');
 return {...build,skills:{...skills}};
}
export function validateRoster(value,items,catalog){
 if(value?.version!==1||!Array.isArray(value.characters))throw Error('Некорректный список персонажей');
 const ids=new Set();
 const characters=value.characters.map(entry=>{
  if(typeof entry.id!=='string'||!entry.id||ids.has(entry.id))throw Error('Некорректный идентификатор персонажа');
  if(entry.slot!==undefined&&(!Number.isInteger(entry.slot)||entry.slot<0||entry.slot>=5))throw Error('Некорректный слот персонажа');
  ids.add(entry.id);return {id:entry.id,...(entry.slot===undefined?{}:{slot:entry.slot}),build:validateSkills(validate(entry.build,items),catalog)};
 });
 return {version:1,activeId:ids.has(value.activeId)?value.activeId:(characters[0]?.id??null),characters};
}
export function putCharacter(roster,id,build){
 return {...roster,activeId:id,characters:roster.characters.map(entry=>entry.id===id?{...entry,build:structuredClone(build)}:entry)};
}

export function classRoster(roster){
 const active=roster.characters.find(c=>c.id===roster.activeId);
 const characters=Object.entries(classes).flatMap(([classId,cls])=>{
  const count=Math.max(1,...roster.characters.filter(c=>c.build.classId===classId).map(c=>(c.slot??0)+1));
  return Array.from({length:Math.min(5,count)},(_,slot)=>Object.entries(worlds).map(([world,w])=>{
   const matches=c=>c.build.classId===classId&&c.build.world===world&&(c.slot??0)===slot;
   const existing=active&&matches(active)?active:roster.characters.find(matches);
   return existing?{...structuredClone(existing),slot}:{id:'class-'+classId+'-'+world+(slot?'-'+slot:''),slot,build:{...fresh(classId),world,level:Math.min(fresh(classId).level,w.maxLevel),name:cls.name+(slot?' '+(slot+1):''),skills:{}}};
  })).flat();
 });
 return {version:1,activeId:active?.id??characters[0].id,characters};
}

// Preliminary requirements: explicit ranks win; missing ranks use a fitted progression.
export function skillRequirement(skill,rank){
 if(rank===0)return {level:0,estimated:false};
 const explicit=skill.ranks?.[rank]?.requiredLevel;
 if(Number.isFinite(explicit))return {level:explicit,estimated:false};
 const unlock=skill.unlockLevel??1;
 if(rank===1)return {level:unlock,estimated:false};
 const known=Object.entries(skill.ranks||{}).filter(([,r])=>Number.isFinite(r.requiredLevel)).map(([n,r])=>({rank:+n,level:r.requiredLevel})).sort((a,b)=>a.rank-b.rank);
 const steps=known.slice(1).map((r,i)=>(r.level-known[i].level)/(r.rank-known[i].rank)).filter(n=>n>0);
 const step=steps.length?steps.sort((a,b)=>a-b)[Math.floor(steps.length/2)]:unlock>=40?4:5;
 const anchor=known.length?known.reduce((a,b)=>Math.abs(b.rank-rank)<Math.abs(a.rank-rank)?b:a):{rank:1,level:unlock===1?0:unlock};
 return {level:Math.max(unlock,Math.ceil(anchor.level+(rank-anchor.rank)*step)),estimated:true};
}
export function learnAllSkills(build,catalog){
 const level=Math.min(build.level,worlds[build.world||'ostrog'].maxLevel),skills={};let estimated=0;
 for(const skill of catalog[build.classId]||[]){
  let learned=0;
  for(let rank=1;rank<=skill.maxLevel;rank++){
   if(skillRequirement(skill,rank).level>level)break;
   learned=rank;
  }
  skills[skill.id]=learned;
  if(learned&& (skillRequirement(skill,learned).estimated||(learned<skill.maxLevel&&skillRequirement(skill,learned+1).estimated)))estimated++;
 }
 return {build:{...build,skills},estimated};
}

export function addCharacterSlot(roster,classId,world){
 const count=Math.max(0,...roster.characters.filter(c=>c.build.classId===classId).map(c=>(c.slot??0)+1));
 if(count>=5)throw Error('Для класса доступно не больше пяти слотов');
 if(!classes[classId]||!worlds[world])throw Error('Неизвестный класс или мир');
 const build={...fresh(classId),world,level:Math.min(fresh(classId).level,worlds[world].maxLevel),name:classes[classId].name+' '+(count+1),skills:{}};
 const id='class-'+classId+'-'+world+'-'+count;
 return classRoster({...roster,activeId:id,characters:[...roster.characters,{id,slot:count,build}]});
}
