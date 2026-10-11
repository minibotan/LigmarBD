export function effectCopy(e){
 const num=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const statusNames={root:['Обездвиживание','Не позволяет цели перемещаться.'],stun:['Оглушение','Оглушает цель.'],sleep:['Сон','Усыпляет цель.'],silence:['Молчание','Запрещает цели применять умения.'],taunt:['Агр','Заставляет цель атаковать применившего умение.'],invisibility:['Невидимость','Делает цель невидимой.'],revival:['Воскрешение','Воскрешает цель.']};
 const stats={physicalDefenseMultiplier:'Физическая защита',resistanceMultiplier:'Сопротивление',attackMultiplier:'Урон',physicalAttackMultiplier:'Физический урон',magicAttackMultiplier:'Магический урон',evasionMultiplier:'Уклонение',accuracyMultiplier:'Меткость',maxHealth:'Максимальное HP',maxMana:'Максимальная мана',healthRegen:'Регенерация HP',manaRegen:'Регенерация маны',activationTime:'Время активации',attackSpeed:'Скорость атаки',criticalHitDamage:'Критический урон',skillEvasion:'Уклонение от умений',absorption:'Поглощение урона',experienceGain:'Получаемый опыт',physicalAbsorptionManaCost:'Расход маны на поглощение физического урона',magicConsumeHealthDamage:'Магический урон за счёт HP',physicalAttackCasterAtk:'Атака призванного существа'};
 const titles=[],parts=[];
 for(const s of e.EffectStatuses||[]){const text=statusNames[s.Type];if(text){titles.push(text[0]);parts.push(text[1])}}
 for(const s of e.BattleStats||[]){
  if(['physicalDamage','magicDamage'].includes(s.Type)){
   const kind=s.Type==='magicDamage'?'магического':'физического';
   titles.push(e.Trigger==='periodic'?'Периодический урон':'Урон');
   parts.push(`${num(s.Value)}${s.IsPercent?'%':''} ${kind} урона${e.Trigger==='periodic'?` за тик${e.TriggerCooldown>0?`; интервал ${num(e.TriggerCooldown/1e9)} с`:''}`:''}.`);
  }else if(s.Type==='battleSpeed'){
   titles.push(s.Value<0?'Замедление':'Ускорение');parts.push(`Скорость ${s.Value<0?'снижается':'увеличивается'} на ${num(Math.abs(s.Value))}${s.IsPercent?'%':''}.`);
  }else if(['healthRestore','healthRestoreAtk','healthRestoreMaxHp','lifeSteal'].includes(s.Type)){
   titles.push('Восстановление HP');const basis={healthRestore:'HP',healthRestoreAtk:'от базового урона',healthRestoreMaxHp:'от максимального HP',lifeSteal:'от нанесённого урона'}[s.Type];
   parts.push(`Восстанавливает ${num(s.Value)}${s.IsPercent?'%':''} ${basis}${e.Trigger==='periodic'?' за тик':''}.`);
  }else if(['physicalGearDamage','magicGearDamage'].includes(s.Type)){
   titles.push('Дополнительный урон');parts.push(`${num(s.Value)}${s.IsPercent?'%':''} ${s.Type==='magicGearDamage'?'магического':'физического'} урона от снаряжения.`);
  }else if(stats[s.Type]){titles.push(stats[s.Type]);parts.push(`${stats[s.Type]}: ${s.Value>0?'+':''}${num(s.Value)}${s.IsPercent?'%':''}.`)}
 }
 const mechanics={cancelActivation:'Прерывает текущий каст цели.',resetTarget:'Сбрасывает текущую цель.',resetMobTarget:'Сбрасывает цель мобов.',purify:'Очищает от снимаемых эффектов.'};
 for(const m of e.EffectMechanics||[])if(mechanics[m.Type])parts.push(mechanics[m.Type]);
 return {title:[...new Set(titles)].join(' · ')||'Особый эффект',label:parts.join(' ')||'Отдельное действие эффекта пока не расшифровано.'};
}
export function skillTags(raw){
 const tags=new Map(),add=(label,tip)=>tags.set(label,{label,tip});
 const effects=raw.Effects||[];
 if(raw.Type==='passive')add('Пассивка','Действует без применения.');
 if(raw.TrueHit||(['mage','priest'].includes(raw.Owner)&&raw.Type==='attack'))add('Не промахивается','Не проверяет меткость и уклонение; другие механики избегания урона могут действовать.');
 if(raw.Unstoppable)add('Нельзя сбить','Каст нельзя прервать.');
 if(raw.Cast?.Timeout>0)add('Стойка','Повторное применение в стойке.');
 const statuses={root:'Обездвиживание',stun:'Оглушение',sleep:'Сон',silence:'Молчание',taunt:'Агр',invisibility:'Невидимость',revival:'Воскрешение'};
 const mechanics={cancelActivation:'Сбивает каст',resetTarget:'Сброс цели',resetMobTarget:'Сброс цели мобов',purify:'Очищение'};
 for(const e of effects){
  const chance=e.Chance<100?` Шанс эффекта: ${e.Chance}%.`:'';
  for(const st of e.EffectStatuses||[]){const label=statuses[st.Type];if(label)add(label,`${label}.${chance}${st.Dispellable?' Можно рассеять.':''}${st.AffectsBosses===false?' Не действует на боссов.':''}`)}
  for(const m of e.EffectMechanics||[])if(mechanics[m.Type])add(mechanics[m.Type],mechanics[m.Type]+'.'+chance);
  if(e.Accumulative)add('Суммируется','Эффект накапливается при повторном наложении.');
  if(e.Trigger==='periodic')add('Периодический эффект','Эффект срабатывает периодически.');
  if(e.Trigger==='on_damage_taken')add('При получении урона','Эффект срабатывает при получении урона.');
  if(['all','close','attacker','party'].includes(e.Object))add('Несколько целей','Область действия и выбор целей указаны в параметрах и описании.');
  for(const st of e.BattleStats||[]){
   if(['physicalDamage','magicDamage'].includes(st.Type)&&e.Trigger==='periodic')add('DOT','Периодический урон.'+chance);
   if(st.Type==='battleSpeed'&&st.Value<0)add('Замедление','Снижает скорость цели.'+chance);
   if(st.Type==='battleSpeed'&&st.Value>0)add('Ускорение','Увеличивает скорость.');
   if(st.Type.startsWith('healthRestore'))add('Лечение','Восстанавливает здоровье.');
   const statTags={absorption:'Поглощение урона',skillEvasion:'Уклонение от умений',physicalAbsorptionManaCost:'Защита за ману',magicConsumeHealthDamage:'Расход HP',physicalAttackCasterAtk:'Призыв',activationTime:'ВА',attackSpeed:'Скорость атаки',healthRegen:'Регенерация HP',manaRegen:'Регенерация маны'};
   if(statTags[st.Type])add(statTags[st.Type],'Подробные значения и условия указаны в описании навыка.');
   if(st.Type==='lifeSteal')add('Вампиризм','Восстанавливает здоровье за счёт нанесённого урона.');
  }
 }
 return [...tags.values()];
}
const owners=['mage','priest','warrior','guardian','assassin','archer'];
const plain=s=>(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
export function normalizeSkillCatalog(records){
 const catalog={};
 for(const raw of records){
  const list=catalog[raw.Owner]??=[];
  let skill=list.find(s=>s.id===raw.ID);
  if(!skill){skill={id:raw.ID,name:raw.Name.ru,type:raw.Type,maxLevel:0,unlockLevel:raw.Requirements.Level,range:raw.Range,weapons:raw.Weapon,targets:[],ranks:{}};list.push(skill)}
  const description=plain(raw.Description.ru),effects=raw.Effects||[];
  const targets=[...new Set(effects.map(e=>e.Object).filter(Boolean))];
  const hostile=targets.filter(t=>!['self','party','account'].includes(t));
  const rank={tags:skillTags(raw),description,castMs:raw.ActivationTime/1e6,cooldownMs:raw.Cooldown/1e6,mana:raw.Mana,requiredLevel:raw.Requirements.Level,targets:raw.Type==='attack'?(hostile.length?hostile:targets.includes('party')?['party']:['target']):targets,weapons:raw.Weapon,effects:[],damage:[],healing:[],exclusive:[],attackBonus:0,critDamageBonus:0,unresolved:null,cannotMiss:raw.TrueHit};
  const unknown=new Set();
  const magic=['mage','priest'].includes(raw.Owner);
  if(raw.Type==='attack'&&/базов[а-я]* (?:физическ[а-я]* |магическ[а-я]* )?урон/i.test(description))rank.damage.push({type:magic?'magic':'physical',base:1,gear:0,flat:0,duration:0});
  for(const e of effects){
   const periodic=e.Trigger==='periodic',duration=periodic?e.Duration/1e9:0,tick=e.TriggerCooldown/1e9;
   const repeats=periodic&&tick>0?duration/tick:1;
   if(periodic&&tick!==1)unknown.add('Интервал периодического эффекта требует отдельного расчёта.');
   const status=(e.EffectStatuses||[])[0]?.Type;
   const slow=(e.BattleStats||[]).find(s=>s.Type==='battleSpeed'&&s.Value<0);
   const family=status||(slow?'slow':e.Type);
   if(e.Duration>0||status)rank.effects.push({...effectCopy(e),seconds:e.Duration/1e9,chance:e.Chance/100,family,recipient:e.Object,...(slow?{slowPercent:-slow.Value}:{}),trigger:e.Trigger});
   for(const stat of e.BattleStats||[]){
    const type=stat.Type,value=stat.Value;
    if(['physicalDamage','magicDamage'].includes(type)){
     if(stat.IsPercent){unknown.add('Процентный урон требует уточнения базы.');continue}
     rank.damage.push({type:type==='magicDamage'?'magic':'physical',base:0,gear:0,flat:value*repeats,duration});
    }else if(['physicalGearDamage','magicGearDamage'].includes(type)&&raw.Type==='attack'&&!e.Duration){
     rank.damage.push({type:type==='magicGearDamage'?'magic':'physical',base:0,gear:value/100,flat:0,duration:0});
    }else if(['healthRestore','healthRestoreAtk','healthRestoreMaxHp','lifeSteal'].includes(type)){
     const key={healthRestore:'flat',healthRestoreAtk:'base',healthRestoreMaxHp:'maxHealth',lifeSteal:'damageDealt'}[type];
     rank.healing.push({[key]:value*(stat.IsPercent?0.01:1)*repeats,duration,trigger:['on_apply','periodic'].includes(e.Trigger)?null:e.Trigger});
    }else if(['attackMultiplier',magic?'magicAttackMultiplier':'physicalAttackMultiplier'].includes(type)&&value>0)rank.attackBonus+=value/100;
    else if(type==='criticalHitDamage')rank.critDamageBonus+=value/100;
    else if(type==='magicConsumeHealthDamage')unknown.add('Нужна модель расхода текущего HP и лечения в ротации.');
    else if(type==='physicalAttackCasterAtk')unknown.add('Нужен расчёт атаки призванного существа.');
   }
  }
  if(raw.Cast?.Timeout>0){skill.channelIntervalMs=raw.Cast.Timeout/1e6;rank.unresolved='Для DPS нужно указать число залпов в стойке.';}
  if(unknown.size)rank.unresolved=[rank.unresolved,...unknown].filter(Boolean).join(' ');
  if(description.includes('Невозможно использовать одновременно'))rank.exclusive=[...description.split('Невозможно использовать одновременно')[1].matchAll(/["«]([^"»]+)["»]/g)].map(m=>m[1]);
  skill.ranks[raw.Level]=rank;skill.maxLevel=Math.max(skill.maxLevel,raw.Level);skill.unlockLevel=Math.min(skill.unlockLevel,raw.Requirements.Level);skill.targets=rank.targets;
 }
 for(const cls of owners){
  const list=catalog[cls]??=[];
  if(!['mage','priest'].includes(cls))list.unshift({id:'autoattack-'+cls,name:'Автоатака',maxLevel:1,unlockLevel:1,type:'attack',autoAttack:true,targets:['target'],weapons:['any','unarmed'],range:cls==='archer'?'ranged':'melee',ranks:{1:{description:'Наносит 100% базового физического урона.',castMs:0,cooldownMs:1000,mana:0,requiredLevel:1,targets:['target'],weapons:['any','unarmed'],effects:[],damage:[{type:'physical',base:1,gear:0,flat:0,duration:0}],unresolved:null}}});
 }
 return catalog;
}
export async function loadSkillCatalog(){
 const manifest=await fetch('data/skills-manifest.json',{cache:'no-store'});if(!manifest.ok)throw Error('Каталог умений недоступен');
 const {files}=await manifest.json();
 const groups=await Promise.all(Object.values(files).map(async file=>{const r=await fetch('data/'+file,{cache:'no-store'});if(!r.ok)throw Error('Не удалось загрузить '+file);return r.json()}));
 return normalizeSkillCatalog(groups.flat());
}
