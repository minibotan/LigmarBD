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
  const rank={description,castMs:raw.ActivationTime/1e6,cooldownMs:raw.Cooldown/1e6,mana:raw.Mana,requiredLevel:raw.Requirements.Level,targets:raw.Type==='attack'?(hostile.length?hostile:targets.includes('party')?['party']:['target']):targets,weapons:raw.Weapon,effects:[],damage:[],healing:[],exclusive:[],attackBonus:0,critDamageBonus:0,unresolved:null,cannotMiss:raw.TrueHit};
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
   if(e.Duration>0||status)rank.effects.push({label:description,seconds:e.Duration/1e9,chance:e.Chance/100,family,recipient:e.Object,...(slow?{slowPercent:-slow.Value}:{}),trigger:e.Trigger});
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
