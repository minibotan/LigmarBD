import {itemStats,names,quality,propertyValue,propertyPercent,itemTier} from './model.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>n==null?'—':Number(n.toFixed(2)).toLocaleString('ru-RU');
export function itemTooltip(item,e){
 const format=(key,value)=>number(value)+(['activationTime','criticalHitRate','requirements','physicalDamageReduction'].includes(key)?'%':key==='physicalAttackInterval'?' мс':['healthRegen','manaRegen'].includes(key)?'/с':'');
 const base=itemStats(item,{...e,enchant:0,props:[]}),enhanced=itemStats(item,{...e,props:[]});
 const keys=[...new Set([...Object.keys(base),...Object.keys(enhanced)])].filter(k=>base[k]||enhanced[k]);
 const label=k=>escape(names[k]||k);
 const rangeText=(min,max)=>min===max?number(min):number(min)+'–'+number(max);
 const statRows=values=>{
  const rows=[];
  for(const prefix of ['physical','magic']){
   const min=values[prefix+'AttackMin'],max=values[prefix+'AttackMax'];
   if(min!==undefined&&max!==undefined){rows.push([label(prefix+'Attack'),rangeText(min,max)]);}
  }
  for(const [key,value] of Object.entries(values)){
   if(/^(physical|magic)Attack(Min|Max)$/.test(key)&&values[key.replace(/Min|Max$/,'Min')]!==undefined&&values[key.replace(/Min|Max$/,'Max')]!==undefined)continue;
   if(value)rows.push([label(key),format(key,value)]);
  }
  return rows;
 };
 const rows=statRows(base).map(([name,value])=>`<div class="item-tip-main-row"><span>${name}</span><strong>${value}</strong></div>`).join('');
 const bonuses=Object.fromEntries(keys.map(k=>[k,(enhanced[k]||0)-(base[k]||0)]).filter(([,v])=>v));
 const enchant=statRows(bonuses).map(([name,value])=>`<div class="item-tip-main-row"><span>${name}</span><strong>+${value}</strong></div>`).join('');
 const props=(e.props||[]).map(p=>{const range=item.property_value_ranges[p.key],value=p.value??propertyValue(range,p.percent),percent=p.value!==undefined?propertyPercent(range,value):p.percent,tone=percent>=150?'ancient':percent>=100?'perfect':'';return `<tr class="item-tip-${tone}"><th scope="row">${label(p.key)}</th><td class="item-tip-value">${format(p.key,value)}</td><td>${Math.floor(percent)}%</td></tr>`}).join('');
 return `<div class="item-tip-heading"><strong>${escape(item.name.ru)}</strong><small>T${itemTier(item,e.quality)} · ${escape(quality[e.quality].name||e.quality)}</small></div><div class="item-tip-main">${rows}</div>${enchant?`<div class="item-tip-enhancement"><small>Заточка +${e.enchant}</small>${enchant}</div>`:''}${props?`<table class="item-tip-table item-tip-properties"><caption>Дополнительные свойства</caption><thead><tr><th>Свойство</th><th>Значение</th><th>Качество</th></tr></thead><tbody>${props}</tbody></table>`:''}`;
}
