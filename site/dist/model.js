export const propertyValue=(range,percent)=>Math.floor(range.min+(range.max-range.min)*percent/100+1e-8);
export const resolveItem=(items,id,q)=>items.find(i=>i.template_id===id&&((i.blueprint_quality==='legendary')===(q==='legendary')))||items.find(i=>i.template_id===id);
export const classes={mage:{name:'Маг',stat:'magic',weapons:['staff','wand'],accuracy:5,evasion:2,hp:10,mana:14,portrait:'2aa1a679ae40808fb2fec7d1a6ea4625',caption:'Интеллект · посох и жезл'},priest:{name:'Жрец',stat:'magic',weapons:['staff','wand'],accuracy:5,evasion:3,hp:10,mana:14,caption:'Интеллект · посох и жезл'},warrior:{name:'Воин',stat:'strength',weapons:['fist','axe','sword'],accuracy:10,evasion:10,hp:15,mana:9,portrait:'3221a679ae408012b8ece94e163bddda',caption:'Сила · кастеты, топор и меч'},guardian:{name:'Страж',stat:'strength',weapons:['hammer','axe'],accuracy:8,evasion:8,hp:17,mana:7,caption:'Сила · молот и топор'},assassin:{name:'Убийца',stat:'dexterity',weapons:['daggers','stiletto'],accuracy:8,evasion:6,hp:13,mana:11,caption:'Ловкость · кинжал и стилет'},archer:{name:'Лучник',stat:'dexterity',weapons:['bow','crossbow'],accuracy:8,evasion:8,hp:13,mana:11,portrait:'3221a679ae4080639bd6f7703def06be',caption:'Ловкость · лук и арбалет'}};
export const slots={weapon:'Оружие',head:'Голова',shoulders:'Плащ',chest:'Грудь',neck:'Кулон',hands:'Перчатки',waist:'Пояс / сумка',legs:'Ноги',finger:'Кольцо',feet:'Ступни'};
export const names={magicAttackMin:'Маг. атака (мин.)',magicAttackMax:'Маг. атака (макс.)',physicalAttackMin:'Физ. атака (мин.)',physicalAttackMax:'Физ. атака (макс.)',strength:'Сила',dexterity:'Ловкость',vitality:'Живучесть',magic:'Интеллект',defense:'Защита',resistance:'Сопротивление',evasion:'Уклонение',accuracy:'Меткость',health:'Здоровье',mana:'Мана',magicAttack:'Маг. атака',physicalAttack:'Физ. атака',activationTime:'Время активации',criticalHitRate:'Шанс крита',healthRegen:'Регенерация HP',manaRegen:'Регенерация маны',stealth:'Скрытность',visibility:'Заметность',requirements:'Снижение требований',physicalDamageReduction:'Снижение физ. урона',physicalAttackInterval:'Пауза атак'};
export const quality={common:{name:'Обычный',factor:1},rare:{name:'Редкий',factor:1.1},epic:{name:'Эпический',factor:1.2},legendary:{name:'Легендарный',factor:1.3}};
export const coeff=[0,1,2,3.05,4.3,5.73,7.55,9.95,13,17.05,22.3,29,37.5];
export const worlds={zion:{name:'Зион',maxLevel:35,tier:4},ostrog:{name:'Острог',maxLevel:55,tier:6}};
export const itemTier=(item,q)=>item.item_tier===6&&q==='legendary'?8:item.item_tier;
export function fresh(cls='mage'){return {version:1,world:'ostrog',name:'Новый герой',classId:cls,level:52,stats:{strength:5,dexterity:5,vitality:5,magic:5},equipment:{},buffs:{attack:0,defense:0,resistance:0,evasion:0,hp:0,passive:0},baseHP:null,baseMana:null};}
export function validate(s,items){if(s&&s.world===undefined)s={...s,world:'ostrog'};if(!s||s.version!==1||!classes[s.classId]||!Number.isInteger(s.level)||s.level<1||!worlds[s.world]||s.level>worlds[s.world].maxLevel)throw Error('Неподдерживаемый файл персонажа');for(const key of ['strength','dexterity','vitality','magic'])if(!Number.isInteger(s.stats?.[key])||s.stats[key]<5||s.stats[key]>505)throw Error('Некорректные характеристики');if(Object.values(s.stats).reduce((a,b)=>a+b,0)>20+5*s.level)throw Error('Распределено слишком много очков');if(!s.equipment||typeof s.equipment!=='object'||Array.isArray(s.equipment))throw Error('Некорректная экипировка');for(const [slot,e] of Object.entries(s.equipment)){const item=resolveItem(items,e.id,e.quality);if(!slots[slot]||!item||item.item_type!==slot||slot==='weapon'&&!classes[s.classId].weapons.includes(item.item_subtype)||!quality[e.quality]||!Number.isInteger(e.enchant)||e.enchant<0||e.enchant>12||!Array.isArray(e.props)||e.props.length>3)throw Error('Некорректный предмет');const seen=new Set();for(const a of e.props){if(!item.property_value_ranges[a.key]||!Number.isFinite(a.percent)||a.percent<0||a.percent>150||seen.has(a.key))throw Error('Некорректные свойства');seen.add(a.key)}}if(!s.buffs||Object.keys(fresh().buffs).some(k=>!Number.isFinite(s.buffs[k])||s.buffs[k]<0||s.buffs[k]>500))throw Error('Некорректные баффы');for(const k of ['baseHP','baseMana'])if(s[k]!==null&&(!Number.isFinite(s[k])||s[k]<0||s[k]>1000000))throw Error('Некорректная база HP/маны');return {...s,name:String(s.name||'Новый герой').slice(0,60)};}
export function itemStats(item,e){const v={};for(const [k,x] of Object.entries(item.base_stats)){v[k]=k.endsWith('Interval')?x:Math.floor(x*quality[e.quality].factor)}let base=item.enhancement_bases[e.quality==='legendary'?'legendary':'standard']||0;if(item.item_type==='weapon'&&item.item_subtype==='axe'&&item.item_tier===6&&e.quality==='epic')base=12;const n=Math.floor(base*coeff[e.enchant]+1e-8);let stat='health';if(item.item_type==='weapon'){const type=['staff','wand'].includes(item.item_subtype)?'magic':'physical';v[type+'AttackMin']=(v[type+'AttackMin']||0)+n;v[type+'AttackMax']=(v[type+'AttackMax']||0)+n}else{if(item.item_type==='shoulders')stat='evasion';else if(['neck','waist','finger'].includes(item.item_type))stat=item.item_subtype==='magic'?'resistance':item.item_subtype==='light'?'evasion':'defense';v[stat]=(v[stat]||0)+n}for(const p of e.props){v[p.key]=(v[p.key]||0)+propertyValue(item.property_value_ranges[p.key],p.percent)}return v;}
export function calculate(s,items){const c=classes[s.classId],gear={},warnings=[];for(const [slot,e] of Object.entries(s.equipment)){const i=resolveItem(items,e.id,e.quality);if(!i)continue;if(i.item_tier!==worlds[s.world||'ostrog'].tier){warnings.push(`${i.name.ru}: недоступно в выбранном мире, не учитывается`);continue}for(const [k,v] of Object.entries(itemStats(i,e)))gear[k]=(gear[k]||0)+v}
 const stats={};for(const k of ['strength','dexterity','vitality','magic'])stats[k]=s.stats[k]+(gear[k]||0);
 for(const e of Object.values(s.equipment)){const i=resolveItem(items,e.id,e.quality);if(!i||i.item_tier!==worlds[s.world||'ostrog'].tier)continue;const reduction=(itemStats(i,e).requirements||0)/100;for(const [k,n] of Object.entries(i.item_requirements||{})){const needed=k==='level'?n:Math.ceil(n*(1-reduction));if((k==='level'?s.level:stats[k]??Infinity)<needed){warnings.push(`${i.name.ru}: ${k==='level'?'уровень':names[k]||k} ${needed}`)}}}
 const b=s.buffs,def=Math.round((stats.vitality+stats.strength-2)/4)+Math.round((gear.defense||0)*(1+Math.round((2*stats.vitality+3*stats.strength)/25)/100+b.defense/100))+1,res=Math.round((stats.vitality+stats.magic-2)/4)+Math.round((gear.resistance||0)*(1+Math.round((2*stats.vitality+3*stats.magic)/25)/100+b.resistance/100));
 const magic=c.stat==='magic',prefix=magic?'magic':'physical',mult=1+stats[c.stat]/(magic?100:150)+(b.attack+b.passive)/100;const min=((gear[prefix+'AttackMin']||0)+(gear[prefix+'Attack']||0)+s.level)*mult,max=((gear[prefix+'AttackMax']||0)+(gear[prefix+'Attack']||0)+s.level)*mult;
 const hpBonus=(stats.vitality-5)*c.hp+(gear.health||0),manaBonus=(stats.magic-5)*c.mana+(gear.mana||0);
 return {stats,gear,warnings,defense:def,resistance:res,attack:[min,max],attackLabel:magic?'Базовый маг. урон':'Базовый физ. урон',evasion:Math.round((1+c.evasion*stats.dexterity+(gear.evasion||0))*(1+b.evasion/100)),accuracy:1+c.accuracy*stats.dexterity+(gear.accuracy||0),crit:Math.min(100,1+Math.floor(stats.dexterity/20)+(gear.criticalHitRate||0)),activation:Math.max(10,100-(gear.activationTime||0)),hp:s.baseHP===null?null:Math.round((s.baseHP+hpBonus)*(1+b.hp/100)),mana:s.baseMana===null?null:s.baseMana+manaBonus,hpBonus,manaBonus};}

// Requirements use final equipped stats, matching calculate(); equip order is not modeled.
export function autoAllocate(s,items,priority=null){
 const stats={strength:5,dexterity:5,vitality:5,magic:5};
 const equipped=Object.values(s.equipment).map(e=>({e,item:resolveItem(items,e.id,e.quality)}));
 const gear={};
 for(const {e,item} of equipped){
  if(!item||item.item_tier!==worlds[s.world||'ostrog'].tier)throw Error('Сначала замените предметы, недоступные в этом мире');
  if((item.item_requirements?.level||0)>s.level)throw Error(`${item.name.ru}: нужен уровень ${item.item_requirements.level}`);
  for(const [k,v] of Object.entries(itemStats(item,e)))gear[k]=(gear[k]||0)+v;
 }
 for(const {e,item} of equipped){
  const reduction=(itemStats(item,e).requirements||0)/100;
  for(const k of Object.keys(stats)){
   const required=Math.ceil((item.item_requirements?.[k]||0)*(1-reduction));
   stats[k]=Math.max(stats[k],required-(gear[k]||0));
  }
 }
 const remaining=20+5*s.level-Object.values(stats).reduce((a,b)=>a+b,0);
 if(remaining<0)throw Error(`Для требований экипировки не хватает ${-remaining} очков. Распределение не изменено.`);
 if(s.classId==='priest'&&!priority){
  const vitality=Math.round(remaining*.8);
  stats.vitality+=vitality;stats.magic+=remaining-vitality;
 }else stats[priority||(s.classId==='guardian'?'vitality':classes[s.classId].stat)]+=remaining;
 return stats;
}
