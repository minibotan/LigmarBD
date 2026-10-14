import {fresh,calculate,classes} from './model.js?v=legendary-rules-1';
import {makePreset} from './presets.js?v=gem-catalog-2';
export const reduction=(value,level)=>Math.min(.95,value/(40*level+value-25));
export const hitChance=(accuracy,evasion)=>2*accuracy+evasion===0?null:2*accuracy/(2*accuracy+evasion);
export function referenceEnemies(items){
 const build=(classId,id)=>calculate(makePreset({...fresh(classId),level:55,world:'ostrog'},items,id),items);
 return {archer:build('archer','archer')};
}
export function combatTip(key,s,r,enemies,buffContext={}){
 const n=x=>Number((Number(x)||0).toFixed(1)).toLocaleString('ru-RU'),pct=x=>n(x*100)+'%',range=a=>a.map(n).join('–'),magic=classes[s.classId].stat==='magic';
 const enemy=enemies.archer,base=buffContext.base||r,mean=(r.attack[0]+r.attack[1])/2,flatGain=s.world==='zion'?100:200,sections=[];
 const add=(label,text,formula='',replaceOnShift=false)=>sections.push({label,text,formula,replaceOnShift});
 const bonusNames={attack:'атака',physicalAttack:'физ. атака',magicAttack:'маг. атака',defense:'защита',resistance:'сопротивление',evasion:'уклонение',hp:'HP',haste:'ВА и ПМА',activationTime:'ВА'};
 const relevant={attack:['attack',magic?'magicAttack':'physicalAttack'],defense:['defense'],resistance:['resistance'],evasion:['evasion'],activation:['haste','activationTime'],attackSpeed:['haste'],health:['hp']}[key]||[];
 const buffParts=[];let buffTotal=0;
 for(const detail of buffContext.details||[]){
  const values=relevant.flatMap(k=>detail.bonuses?.[k]?[[k,detail.bonuses[k]]]:[]);
  if(values.length){buffTotal+=values.reduce((sum,[,v])=>sum+v,0);buffParts.push(`${detail.name}: ${values.map(([k,v])=>`+${n(v)}% ${bonusNames[k]}`).join(', ')}`);}
 }
 if(key==='attack'&&buffContext.passive?.bonus){buffTotal+=buffContext.passive.bonus;buffParts.unshift(`${buffContext.passive.name}: +${n(buffContext.passive.bonus)}% атаки`);}
 const buffSummary=()=>({attack:`+${n(buffTotal)}% атаки.`,defense:`+${n(buffTotal)}% к защите снаряжения.`,resistance:`+${n(buffTotal)}% к сопротивлению снаряжения.`,evasion:`+${n(buffTotal)}% уклонения.`,activation:`−${n(buffTotal)}% времени активации.`,attackSpeed:`−${n(buffTotal)}% паузы между атаками.`,health:`+${n(buffTotal)}% здоровья.`}[key]||`Суммарный бонус: +${n(buffTotal)}%.`);
 const buffs=()=>{if(buffParts.length)add('Баффы',buffSummary(),buffParts.join(' · '),true);};
 const baseValue=(text,breakdown='')=>{if(buffParts.length)add('До баффов',text,breakdown,true);};
 let title='';
 if(key==='attack'){
  title=r.attackLabel;const prefix=magic?'magic':'physical',gearMin=(r.gear[prefix+'AttackMin']||0)+(r.gear[prefix+'Attack']||0),gearMax=(r.gear[prefix+'AttackMax']||0)+(r.gear[prefix+'Attack']||0),rawAttack=[gearMin+s.level,gearMax+s.level],mainStat=classes[s.classId].stat,statName={strength:'Сила',dexterity:'Ловкость',magic:'Интеллект'}[mainStat],statBonus=r.stats[mainStat]/(magic?100:150)*100,armor=magic?enemy.resistance:enemy.defense,dr=reduction(armor,s.level),hit=magic?1:hitChance(r.accuracy,enemy.evasion),mult=rawAttack[0]>0?r.attack[0]/rawAttack[0]:1,attackGain=flatGain*mult,nextAttack=r.attack.map(x=>x+attackGain),gainPct=attackGain/mean;
  buffTotal+=statBonus;buffParts.unshift(`${statName}: +${n(statBonus)}% атаки`);
  baseValue(`${range(rawAttack)} урона.`,`Уровень ${s.level} + снаряжение ${gearMin===gearMax?n(gearMin):range([gearMin,gearMax])} = ${range(rawAttack)} урона.`);buffs();
  add('Итог',`${range(r.attack)}. Против цели 55 ур. — в среднем ${n(mean*(1-dr)*(1+r.crit/100)*hit)} за атаку.`,`Среднее × (1 − снижение) × средний крит × шанс попадания.`);
  add(`Если добавить +${flatGain} к урону снаряжения`,`${range(r.attack)} → ${range(nextAttack)}; прирост ${n(attackGain)} урона, или ${pct(gainPct)} в среднем.`,`Прибавка умножается на основной стат, пассивку и баффы атаки.`);
  add('Примечание','Это базовый урон героя. Множитель конкретного умения и его время каста считаются отдельно.');
 }
 if(key==='defense'||key==='resistance'){
  const physical=key==='defense',stat=physical?'Защита':'Сопротивление',value=r[key],primary=r.stats[physical?'strength':'magic'],vitality=r.stats.vitality,gearValue=r.gear[key]||0,attributePart=Math.round((vitality+primary-2)/4),statPart=attributePart+(physical?1:0),statPct=Math.round((2*vitality+3*primary)/25),rawValue=statPart+Math.round(gearValue),statGain=Math.round(flatGain*(1+statPct/100+(s.buffs[key]||0)/100)),nextValue=value+statGain,reduced=reduction(value,55),plus=reduction(nextValue,55);title=stat;
  if(gearValue&&statPct){buffTotal+=statPct;buffParts.unshift(`${physical?'Сила и живучесть':'Интеллект и живучесть'}: +${n(statPct)}% к ${physical?'защите':'сопротивлению'} снаряжения`);}
  baseValue(`${n(rawValue)} ${physical?'защиты':'сопротивления'}.`,`${physical?'База 1 + ':''}от ${physical?'силы и живучести':'интеллекта и живучести'} ${n(attributePart)} + снаряжение ${n(gearValue)} = ${n(rawValue)}.`);buffs();
  add('Итог',`${n(value)}; против цели 55 ур. снижает ${physical?'физический':'магический'} прямой урон на ${pct(reduced)}.`,`Снижение = min(95%, параметр / (40 × уровень атакующего + параметр − 25)).`);
  add(`Если добавить +${flatGain}`,`${n(value)} → ${n(nextValue)} (+${n(statGain)}, ${pct(statGain/value)}). Снижение урона: ${pct(reduced)} → ${pct(plus)} (+${n((plus-reduced)*100)} п. п.).`);
  add('Примечание',physical?'Физический DOT полностью игнорирует защиту.':'Магический DOT уменьшается сопротивлением.');
 }
 if(key==='evasion'){
  title='Уклонение';const classEvasion=classes[s.classId].evasion*r.stats.dexterity,gearEvasion=r.gear.evasion||0,h=hitChance(enemy.accuracy,r.evasion),evasionGain=flatGain*(1+(s.buffs.evasion||0)/100),next=r.evasion+evasionGain,nextHit=hitChance(enemy.accuracy,next);
  baseValue(`${n(base.evasion)} уклонения.`,`База 1 + от ловкости ${n(classEvasion)} + снаряжение ${n(gearEvasion)} = ${n(base.evasion)}.`);buffs();add('Итог',`${n(r.evasion)}; против цели 55 ур. — ${pct(1-h)} уклонения.`,`Уклонение / (2 × меткость противника + уклонение).`);
  add(`Если добавить +${flatGain}`,`${n(r.evasion)} → ${n(next)} (+${n(evasionGain)}, ${pct(evasionGain/r.evasion)}). Шанс уклонения: ${pct(1-h)} → ${pct(1-nextHit)}.`);
  add('Примечание','Маг и жрец пропускают обычную проверку меткости. Уклонение во время бега считается отдельно.');
 }
 if(key==='accuracy'){
  title='Меткость';const hit=magic?1:hitChance(r.accuracy,enemy.evasion),nextAccuracy=r.accuracy+flatGain,next=magic?1:hitChance(nextAccuracy,enemy.evasion);
  baseValue(`${n(base.accuracy)} меткости.`);buffs();add('Итог',magic?`${n(r.accuracy)}. Обычные умения этого класса попадают со 100% шансом.`:`${n(r.accuracy)}. Против ${n(enemy.evasion)} уклонения у цели 55 ур.: ${pct(hit)} попадания, ${pct(1-hit)} промаха.`,`2 × меткость / (2 × меткость + уклонение цели).`);
  if(!magic)add(`Если добавить +${flatGain}`,`${n(r.accuracy)} → ${n(nextAccuracy)} (+${flatGain}, ${pct(flatGain/r.accuracy)}). Шанс попадания: ${pct(hit)} → ${pct(next)}.`);
  add('Примечание',magic?'Меткость может понадобиться отдельным механикам, но обычную проверку маг и жрец не проходят.':'Промах уменьшает средний урон всей атаки или умения.');
 }
 if(key==='crit'){
  title='Шанс критического удара';const next=Math.min(100,r.crit+5),armor=magic?enemy.resistance:enemy.defense,dr=reduction(armor,s.level),hit=magic?1:hitChance(r.accuracy,enemy.evasion);
  baseValue(`${n(base.crit)}% шанса критического удара.`);buffs();add('Итог',`${n(r.crit)}% шанса крита ×2. По цели 55 ур. средний урон попытки: ${n(mean*(1-dr)*hit)} без критов → ${n(mean*(1-dr)*hit*(1+r.crit/100))} с критами.`);
  add('Если добавить +5 п. п.',`${n(r.crit)}% → ${n(next)}%. Средний прямой урон вырастет примерно на ${pct((1+next/100)/(1+r.crit/100)-1)}.`);
  add('Примечание','Тики DOT не критуют; начальный удар DOT-умения критовать может.');
 }
 if(key==='activation'){
  title='Время активации';const next=Math.max(10,r.activation-10);
  baseValue(`${n(base.activation)}% времени активации.`,`100% − ${n(r.gear.activationTime||0)}% от снаряжения = ${n(base.activation)}%.`);buffs();add('Итог',`${n(r.activation)}%; исходный каст 2 с завершится за ${n(2*r.activation/100)} с.`,`Исходное время × ВА / 100.`);
  add('Если добавить +10% ВА',`${n(r.activation)}% → ${n(next)}%. Каст 2 с: ${n(2*r.activation/100)} → ${n(2*next/100)} с; быстрее на ${pct(r.activation/next-1)}.`);
  add('Примечание','ВА не сокращает откат и не влияет на автоатаку. Минимальное время — 10% исходного.');
 }
 if(key==='attackSpeed'){
  title='Ударов в секунду';const sec=x=>Number((x/1000).toFixed(3)).toLocaleString('ru-RU');
  baseValue(magic?'У класса нет автоатаки.':`${n(base.attacksPerSecond)} удара/с; пауза ${sec(base.attackInterval)} с.`,magic?'':`Пауза оружия ${sec(base.attackIntervalBase)} с − ПМА ${sec(base.attackIntervalReduction)} с = ${sec(base.attackInterval)} с (${n(base.attacksPerSecond)} удара/с).`);buffs();
  if(magic){add('Итог','Параметр не применяется к этому классу.');add('Примечание','Скорость применения умений меняется через ВА.');}
  else {const nextInterval=Math.max(1,r.attackInterval-50*(s.dpsExternal?.speedMultiplier??1)),nextAps=1000/nextInterval;add('Итог',`${n(r.attacksPerSecond)} удара/с; пауза ${sec(r.attackInterval)} с.`);add('Если добавить 0,05 с ПМА',`${n(r.attacksPerSecond)} → ${n(nextAps)} удара/с (+${pct(nextAps/r.attacksPerSecond-1)}). Пауза: ${sec(r.attackInterval)} → ${sec(nextInterval)} с.`);add('Примечание','ПМА и ВА — разные параметры; ВА не ускоряет автоатаку.');}
 }
 if(key==='health'){
  title='Здоровье';const hpBuff=s.buffs.hp||0,vitalityHp=(r.stats.vitality-5)*classes[s.classId].hp,gearHp=r.gear.health||0,gain=flatGain*(1+hpBuff/100),nextHp=r.hp===null?null:r.hp+gain;
  baseValue(base.hp===null?`+${n(base.hpBonus)} HP.`:`${n(base.hp)} HP.`,base.hp===null?`Базовый запас неизвестен; от живучести ${n(vitalityHp)} + снаряжение ${n(gearHp)} = +${n(base.hpBonus)} HP.`:`Базовый запас ${n(base.baseHP)} + от живучести ${n(vitalityHp)} + снаряжение ${n(gearHp)} = ${n(base.hp)} HP.`);buffs();add('Итог',r.hp===null?`Известна только прибавка +${n(r.hpBonus)} HP.`:`${n(r.hp)} HP; с текущей бронёй это до ${n(r.hp/(1-reduction(r.defense,55)))} физического или ${n(r.hp/(1-reduction(r.resistance,55)))} магического урона до снижения.`,'Эффективные HP = HP / (1 − снижение).');
  add(`Если добавить +${flatGain} HP`,r.hp===null?`Прибавка с текущими баффами составит ${n(gain)} HP.`:`${n(r.hp)} → ${n(nextHp)} HP (+${n(gain)}, ${pct(gain/r.hp)}).`);
  add('Примечание','Расчёт не учитывает лечение, уклонение и отдельные эффекты снижения урона.');
 }
 if(key==='mana'){
  title='Мана';baseValue(base.mana===null?`Известна только прибавка +${n(base.manaBonus)}.`:`${n(base.mana)} маны.`);buffs();add('Итог',r.mana===null?`Известна только прибавка +${n(r.manaBonus)}.`:`${n(r.mana)} маны.`);
  add(`Если добавить +${flatGain} маны`,r.mana===null?`Запас вырастет на ${flatGain}.`:`${n(r.mana)} → ${n(r.mana+flatGain)} (+${flatGain}, ${pct(flatGain/r.mana)}).`);
  add('Примечание','Реальное число кастов также зависит от регенерации и стоимости выбранных умений.');
 }
 return {title,sections};
}
