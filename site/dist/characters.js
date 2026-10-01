import {validate} from './model.js';
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
  ids.add(entry.id);return {id:entry.id,build:validateSkills(validate(entry.build,items),catalog)};
 });
 return {version:1,activeId:ids.has(value.activeId)?value.activeId:(characters[0]?.id??null),characters};
}
export function putCharacter(roster,id,build){
 return {...roster,activeId:id,characters:roster.characters.map(entry=>entry.id===id?{id,build:structuredClone(build)}:entry)};
}
