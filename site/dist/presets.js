import {slots,worlds,calculate,autoAllocate,resolveItem} from './model.js';
export const presets={
 priest_heavy:{classId:'priest',name:'Жрец · тяжёлый сет',armor:'heavy',jewels:'magic',hands:'magic',weapon:'staff',stat:null,priority:['activationTime','resistance','vitality','magic','health','defense'],note:'Тяжёлая броня; волшебные руки и бижутерия ради ВА. После требований: 80% очков в живучесть, 20% в интеллект.'},
 mage_pve:{classId:'mage',name:'PvE · тряпки',armor:'magic',jewels:'magic',hands:'magic',weapon:'staff',stat:'magic',priority:['activationTime','magic','defense','health','magicAttack','evasion'],note:'ВА → интеллект → защита. Камни: защита, при необходимости HP.'},
 mage_pvp:{classId:'mage',name:'PvP · тяжёлый сет',armor:'heavy',jewels:'magic',hands:'magic',weapon:'staff',stat:'magic',priority:['activationTime','resistance','magic','magicAttack','health'],note:'ВА → сопротивление → интеллект. Волшебные перчатки и бижутерия сохраняют ВА.'},
 archer:{classId:'archer',name:'Лёгкий сет · ВА',armor:'light',jewels:'magic',hands:'light',weapon:'crossbow',stat:'dexterity',priority:['activationTime','dexterity','physicalAttack','criticalHitRate'],balance:true,note:'Ловкость, баланс защиты/сопры; арбалет и бижутерия с ВА. Цель: время каста 30–45%; достижимость зависит от вещей.'},
 assassin:{classId:'assassin',name:'Лёгкий сет · ловкость',armor:'light',jewels:'light',hands:'light',weapon:'daggers',stat:'dexterity',priority:['dexterity','physicalAttackInterval','physicalAttack','criticalHitRate'],balance:true,note:'Ловкость, баланс защиты/сопры. По умолчанию — кинжалы.'},
 warrior_fist:{classId:'warrior',name:'Кастеты · ПМА',armor:'heavy',jewels:'light',hands:'light',weapon:'fist',stat:'strength',priority:['physicalAttackInterval','strength','physicalAttack','resistance','criticalHitRate','health'],note:'Тяжёлая броня, лёгкие руки и бижутерия. Кольцо металлическое: лёгких колец нет. Приоритет — пауза между атаками.'},
 warrior_axe:{classId:'warrior',name:'Топор · умения',armor:'heavy',jewels:'magic',hands:'magic',weapon:'axe',stat:'strength',priority:['activationTime','strength','physicalAttack','resistance','criticalHitRate','health'],note:'Тяжёлая броня; для ускорения каста — волшебные руки и бижутерия.'},
 guardian_tank:{classId:'guardian',name:'Страж · выживаемость',armor:'heavy',jewels:'magic',hands:'heavy',weapon:'hammer',stat:'vitality',priority:['resistance','vitality','health','defense','physicalDamageReduction','criticalHitRate'],note:'Тяжёлый сет, бижутерия на сопротивление, очки в живучесть. По умолчанию — молот.'},
 guardian_damage:{classId:'guardian',name:'Страж · урон',armor:'heavy',jewels:'heavy',hands:'heavy',weapon:'axe',stat:'strength',priority:['criticalHitRate','strength','physicalAttack','resistance','health'],note:'Тяжёлый сет, сила и шанс крита. По умолчанию — топор.'}
};
export function makePreset(state,items,id,tier='high'){
 const preset=presets[id];if(!preset||preset.classId!==state.classId)throw Error('Сборка не подходит классу');
 const next=structuredClone(state);next.equipment={};next.stats={strength:5,dexterity:5,vitality:5,magic:5};next.buildPreset=id;
 for(const slot of Object.keys(slots)){
  let sub=slot==='weapon'?preset.weapon:slot==='shoulders'?'cloak':slot==='hands'?preset.hands:['neck','waist','finger'].includes(slot)?preset.jewels:preset.armor;
  if(slot==='finger'&&sub==='light')sub='heavy';
  const item=items.find(i=>i.item_type===slot&&i.item_subtype===sub&&i.item_tier===worlds[state.world].tier&&!i.blueprint_quality);
  if(!item)throw Error('В каталоге нет предмета для слота '+slot);
  const keys=preset.priority.filter(k=>item.property_value_ranges[k]);
  const e={id:item.template_id,quality:'epic',enchant:tier==='high'?(slot==='weapon'?8:5):0,props:keys.slice(0,preset.balance?2:3).map((key,n)=>({key,percent:tier==='high'&&n>0?90:100}))};
  next.equipment[slot]=e;
 }
 // Fill remaining defensive slots toward equal physical and magical defenses.
 if(preset.balance)for(const e of Object.values(next.equipment)){
  const item=resolveItem(items,e.id,e.quality);
  while(e.props.length<3){
   const r=calculate(next,items),order=r.defense<=r.resistance?['defense','resistance','evasion','health','criticalHitRate']:['resistance','defense','evasion','health','criticalHitRate'];
   const key=order.find(k=>item.property_value_ranges[k]&&!e.props.some(p=>p.key===k));if(!key)break;
   e.props.push({key,percent:tier==='high'?90:100});
  }
 }
 next.stats=autoAllocate(next,items,preset.stat);
 return next;
}
