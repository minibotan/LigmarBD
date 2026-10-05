import {presets} from './presets.js';
export const propertyPresets={'bad':[90,50,50],'mid':[90,90,50],'good':[90,90,90],'100%':[100,90,80],'150%':[150,90,90],'150%+':[150,100,100],'150%++':[150,150,100]};
export function rollItemProperties(state,item,label,random=Math.random){
 const chosen=presets[state.buildPreset];
 const preset=chosen?.classId===state.classId?chosen:Object.values(presets).find(p=>p.classId===state.classId);
 const priorities=[...new Set([...(preset?.priority||[]),...(preset?.balance?['defense','resistance','evasion','health']:[])])];
 const available=Object.keys(item.property_value_ranges),used=new Set(),result=[];
 for(const percent of propertyPresets[label]||[]){
  const candidates=percent===50?available.filter(k=>!priorities.includes(k)&&!['activationTime','physicalAttackInterval','criticalHitRate'].includes(k)&&!used.has(k)):priorities.filter(k=>available.includes(k)&&!used.has(k));
  const key=percent===50?candidates[Math.floor(random()*candidates.length)]:candidates[0];
  if(key){used.add(key);result.push({key,percent})}
 }
 return result;
}
