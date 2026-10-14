import {rules,methods,chance,enhancementCosts} from './enhancement-model.js?v=3';
import {coeff,itemStats,quality,names,slots} from '../model.js?v=legendary-rules-1';
import fountainRules from '../data/dps-buffs.json' with {type:'json'};
import {itemImage} from '../item-images.js?v=item-images-1';
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':n<0?'−':'')+fmt(Math.abs(n));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(heads,rows)=>`<div class="guide-table-wrap"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const levels=(id,value)=>`<select id="${id}">${coeff.map((_,i)=>`<option value="${i}" ${i===value?'selected':''}>+${i}</option>`).join('')}</select>`;
const ESSENCE_ICON='https://ligmar.io/game/assets/images/items/2c31a679ae408038b01ce7b29426c9c6.webp';
const CRYSTAL_ICONS={
 ordinary:'https://ligmar.io/game/assets/images/items/1ec1a679ae40804f8a5ae6a0583b456f.webp',
 harmony:'https://ligmar.io/game/assets/images/items/1ec1a679ae40806589c8cebc078fd00d.webp',
 fortitude:'https://ligmar.io/game/assets/images/items/1ec1a679ae408059ae6ace8dabfe0fc1.webp',
 risk:'https://ligmar.io/game/assets/images/items/1ec1a679ae4080059c9bc1b6e4106ecc.webp'
};
const crystalRef=(type,label)=>`<span class="enhance-crystal-ref enhance-crystal-${type}"><img src="${CRYSTAL_ICONS[type]}" alt="" loading="lazy"><span>${label}</span></span>`;
const essenceToken=(level,count=1,result=false)=>`<span class="essence-term${result?' essence-result':''}">${count>1?`<strong class="essence-count">${count}×</strong>`:''}<span class="essence-token"><img src="${ESSENCE_ICON}" alt="" loading="lazy"><b>+${level}</b></span></span>`;
const fortitudeToken=count=>`<span class="essence-term essence-fortitude"><strong class="essence-count">${count}×</strong><span class="essence-token"><img src="${CRYSTAL_ICONS.fortitude}" alt="" loading="lazy"></span><small>Стойкость</small></span>`;
const essenceRecipe=ingredients=>`<span class="essence-formula">${ingredients.map((ingredient,i)=>`${i?'<span class="essence-operator" aria-hidden="true">+</span>':''}${Array.isArray(ingredient)?essenceToken(ingredient[0],ingredient[1]):ingredient.type==='essence'?essenceToken(ingredient.level,ingredient.count):fortitudeToken(ingredient.count)}`).join('')}</span>`;
const essenceName=level=>`<span class="essence-name">${essenceToken(level,1,true)}<strong>Уровень ${level}</strong></span>`;
export function mountEnhancementGuide(root,items){
 document.title='Заточка предметов • LigmarBD';
 const staff=items.find(i=>i.item_type==='weapon'&&i.item_subtype==='staff'&&i.item_tier===4&&!i.blueprint_quality);
 const ring=items.find(i=>i.item_type==='finger'&&i.item_subtype==='magic'&&i.item_tier===4&&!i.blueprint_quality);
 const ringDamage=itemStats(ring,{quality:'epic',enchant:0,props:[],gems:[]}).magicAttack;
 const priest=fountainRules.heroGroups.find(g=>g.name==='Величие духа').levels[10].bonuses.magicAttack/100;
 const multiplier=1+100/100+0.6+priest;
 const sample=n=>{const st=itemStats(staff,{quality:'epic',enchant:n,props:[],gems:[]});const staffDamage=(st.magicAttackMin+st.magicAttackMax)/2,gear=staffDamage+ringDamage,weapon=gear+35;return {st,staffDamage,gear,weapon,base:weapon*multiplier}};
 const staffBase=itemStats(staff,{quality:'epic',enchant:0,props:[],gems:[]});
 const staffRange=`${fmt(staffBase.magicAttackMin)}–${fmt(staffBase.magicAttackMax)}`;
 const enchantBonus=n=>Math.floor(staff.enhancement_bases.standard*coeff[n]);
 const before=sample(6),after=sample(7),delta=(a,b)=>`+${fmt(b-a)} (+${fmt((b/a-1)*100)}%)`;
 const standards=items.filter(i=>!i.blueprint_quality),priceNames={ordinary:'Кристалл улучшения',risk:'Кристалл риска',harmony:'Кристалл гармонии',fortitude:'Кристалл стойкости',essence:'Эссенция +1'};
 const staffTip=`Эпический посох T4. Базовый магический урон: ${staffRange}. База заточки: ${fmt(staff.enhancement_bases.standard)}. В примере сравниваются +6 и +7 без дополнительных свойств и камней.`;
 const priceSection=`<h2>Цена заточки</h2><p>Укажи цены за штуку в серебре. Калькулятор учитывает повторные попытки и восстановление заточки после неудач. «Самый дешёвый путь» выбирает добавку отдельно для каждого перехода.</p>
 <section class="enhance-panel"><div class="enhance-fields enhance-price-fields">${Object.entries(rules.prices).map(([k,v])=>`<label>${k==='essence'?`<span class="enhance-crystal-ref enhance-crystal-essence"><img src="${ESSENCE_ICON}" alt="" loading="lazy"><span>${priceNames[k]}</span></span>`:crystalRef(k,priceNames[k])}<input data-enh-price="${k}" type="number" min="0" step="any" value="${v}"></label>`).join('')}</div><label class="enhance-route-toggle"><input id="cost-essence-routes" type="checkbox"><span>Эссенции через извлечение и крафт</span></label><p class="hint enhance-route-hint">Без галочки цена эссенций считается по крафту от покупной +1. С галочкой калькулятор дополнительно сравнивает извлечение. Уничтожаемый эпический предмет T4 оценивается в 2 400 серебра.</p><div class="enhance-fields"><label>Тип предмета<select id="cost-type"><option value="other">Броня / плащ / бижа · 1 кристалл</option><option value="weapon">Оружие · 2 кристалла</option></select></label><label>С уровня${levels('cost-from',0)}</label><label>До уровня${levels('cost-to',8)}</label><label>Способ<select id="cost-method"><option value="optimal">Самый дешёвый путь</option>${Object.entries(methods).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></div><div id="enh-cost" aria-live="polite"></div></section>
 <aside class="guide-note guide-uncertain"><strong>Средняя стоимость — не гарантированный бюджет</strong><p>Реальный расход может оказаться ниже или значительно выше. С эссенциями результат гарантирован. Для остальных способов среднее учитывает риск неудачи.</p></aside>`;
 root.innerHTML=`<article class="guide-article enhancement-guide"><a class="guide-back" href="#guides">← Все гайды</a><span class="eyebrow">СНАРЯЖЕНИЕ · ПРАКТИЧЕСКИЙ ГАЙД</span><h1>Заточка предметов</h1><p class="guide-lead">Сколько характеристик даёт заточка и во сколько в среднем обойдётся нужный уровень.</p>
 <h2>Зачем точить снаряжение</h2><p>Заточка повышает один из основных параметров предмета. Чем выше заточка, тем больше прибавка: рост задаётся коэффициентами, а не одинаковым бонусом за каждый уровень.</p>
 ${table(['Предмет','Что повышается'],[['Оружие','Минимальный и максимальный урон'],['Броня','Здоровье'],['Плащ','Уклонение'],['Бижутерия','Защита, сопротивление или уклонение — по типу']])}
 <aside class="guide-note"><strong>+50% к параметру предмета — не обязательно +50% к итоговому значению</strong><p>Прибавка относится к параметру предмета и не означает такое же процентное увеличение итогового параметра персонажа. Подробнее о расчёте урона и других характеристик с учётом баффов расскажем в отдельном гайде.</p><p>Пример ниже показывает переход от урона предмета к урону персонажа.</p></aside>
 <h2>Пример: T4 посох +6 → +7</h2><section class="enhance-panel"><div class="enhance-item guide-item-ref" tabindex="0" title="${esc(staffTip)}"><img src="${itemImage(staff,'epic')}" alt="Эпический посох"><strong>Эпический посох · T4 · +6 → +7</strong></div>
 <p class="hint">Маг 35-го уровня · 100 интеллекта · пассивка +60% · фонтан (баффы 10-го уровня). Также надето эпическое драгоценное кольцо T4 +0. Без других предметов, допсвойств и камней. Сравниваем средний урон до крита и сопротивления цели.</p>
 ${table(['Показатель','+6','+7','Прирост'],[
 ['Урон посоха без заточки',staffRange,staffRange,'Без изменений'],
 ['Прибавка от заточки',`+${fmt(enchantBonus(6))}`,`+${fmt(enchantBonus(7))}`,delta(enchantBonus(6),enchantBonus(7))],
 ['Урон кольца',fmt(ringDamage),fmt(ringDamage),'Без изменений'],
 ['GearDamage · посох + кольцо',fmt(before.gear),fmt(after.gear),delta(before.gear,after.gear)],
 ['WeaponDamage · GearDamage + уровень',fmt(before.weapon),fmt(after.weapon),delta(before.weapon,after.weapon)],
 ['Итоговый базовый маг. урон под фонтаном',fmt(before.base),fmt(after.base),delta(before.base,after.base)]])}
 <p>Кольцо даёт <strong>${fmt(ringDamage)}</strong> магической атаки в обоих вариантах. Средний GearDamage складывается из урона посоха без заточки, прибавки от заточки и урона кольца: ${fmt((staffBase.magicAttackMin+staffBase.magicAttackMax)/2)} + ${fmt(enchantBonus(6))} + ${fmt(ringDamage)} = ${fmt(before.gear)} при +6 и ${fmt((staffBase.magicAttackMin+staffBase.magicAttackMax)/2)} + ${fmt(enchantBonus(7))} + ${fmt(ringDamage)} = ${fmt(after.gear)} при +7.</p>
 <p>Заточка добавляет к каждой границе урона посоха: на +6 — <strong>${Math.floor(staff.enhancement_bases.standard*coeff[6])}</strong>, на +7 — <strong>${Math.floor(staff.enhancement_bases.standard*coeff[7])}</strong>.</p>
 <p>Множитель атаки: 1 + 100 / 100 + 0,60 (пассивка) + ${fmt(priest)} («Величие духа») = <strong>${fmt(multiplier)}</strong>.</p>
 <p>При +6: (${fmt(before.gear)} + 35) × ${fmt(multiplier)} = <strong>${fmt(before.base)}</strong>.<br>При +7: (${fmt(after.gear)} + 35) × ${fmt(multiplier)} = <strong>${fmt(after.base)}</strong>.</p>
 </section>
 <h2>Коэффициенты и база заточки</h2><p>Прибавка = база заточки × коэффициент. Результат округляется вниз до целого.</p>
 ${table(['Заточка','Коэффициент'],coeff.map((v,i)=>['+'+i,fmt(v)]))}
 <details class="enhance-panel"><summary>База заточки по предметам</summary><p class="hint">База прибавки за заточку. T4 — Зион, T6 и T8 — Острог. Для эпического T6 топора учтена база 12.</p><div id="enh-bases"></div></details>
 <h2>Как проходит попытка</h2><p>Оружие расходует <strong>2 обычных кристалла</strong>, остальные предметы — <strong>1</strong>. Можно добавить только один дополнительный расходник. Он не заменяет обычные кристаллы. Отдельной платы серебром нет.</p>
 <div class="enhance-rules"><div>${crystalRef('ordinary','Кристалл улучшения')}<span>Базовый шанс</span><p>Неудача сбрасывает предмет до +0.</p></div><div>${crystalRef('risk','Кристалл риска')}<span>+15 п. п. к шансу</span><p>Неудача сбрасывает предмет до +0.</p></div><div>${crystalRef('harmony','Кристалл гармонии')}<span>+3,5 п. п. к шансу</span><p>Неудача понижает заточку на один уровень.</p></div><div>${crystalRef('fortitude','Кристалл стойкости')}<span>Собственный шанс</span><p>При неудаче текущий уровень сохраняется.</p></div><div><span class="enhance-crystal-ref enhance-crystal-essence"><img src="${ESSENCE_ICON}" alt="" loading="lazy"><strong>Эссенция +N</strong></span><span>Успех 100%</span><p>Гарантирует один шаг, пока текущий уровень ниже N.</p></div></div>
 <h3>Шансы успеха</h3>${table(['Переход',...['ordinary','risk','harmony','fortitude'].map(k=>crystalRef(k,priceNames[k]))],rules.ordinaryChances.map((_,i)=>[`+${i} → +${i+1}`,...['ordinary','risk','harmony','fortitude'].map(m=>fmt(chance(i,m)*100)+'%'+(m==='fortitude'&&i>=10?'*':''))]))}
 <p class="hint">* Стойкость на +10 → +11 и +11 → +12: оценочные шансы 0,05% и 0,03%. Результаты, зависящие от них, тоже отмечены звёздочкой.</p>
 <h2>Эссенции</h2><p>Эссенция +N гарантирует <strong>один шаг заточки</strong>, пока текущая заточка ниже N. Эссенция +10 превратит предмет +5 в +6, а не в +10. На предмете +10 она уже не поможет. Обычные кристаллы расходуются и при использовании эссенции.</p>
 <p>Эссенции можно покупать, создавать и извлекать из заточенных вещей. Из предмета +4…+12 получается эссенция +2…+10: на два уровня ниже. <strong>Предмет при извлечении уничтожается</strong> по правилам мастерской. Эссенции +11 и +12 создаются крафтом.</p>
 <p>Крафт гарантированный, без комиссии; каждый рецепт даёт одну эссенцию. Ниже показаны ингредиенты для каждого уровня.</p><div id="enh-essences"></div>
 ${priceSection}<a class="guide-back" href="#guides">← Все гайды</a></article>`;
 const $=id=>root.querySelector('#'+id);
 function bases(){
 const group=i=>i.item_type==='weapon'?0:i.item_type==='shoulders'?1:['neck','waist','finger'].includes(i.item_type)?({neck:5,waist:6,finger:7})[i.item_type]:({magic:2,light:3,heavy:4})[i.item_subtype];
 const groups=['Оружие','Плащи','Броня · тряпки','Броня · лёгкая','Броня · тяжёлая','Бижа · амулеты','Бижа · пояса','Бижа · кольца'];
 const weapons=['staff','wand','bow','crossbow','daggers','stiletto','fist','sword','axe','hammer'],order=['head','chest','hands','legs','feet'];
 const list=standards.filter(i=>i.item_tier===6).sort((a,b)=>group(a)-group(b)||(a.item_type==='weapon'?weapons.indexOf(a.item_subtype)-weapons.indexOf(b.item_subtype):order.indexOf(a.item_type)-order.indexOf(b.item_type))||a.name.ru.localeCompare(b.name.ru,'ru'));
 let last=-1;
 $('enh-bases').innerHTML=`<div class="guide-table-wrap enhance-bases-wrap"><table class="enhance-bases-table"><colgroup><col class="base-item-col"><col><col><col></colgroup><thead><tr><th scope="col">Предмет</th><th scope="col">T4 <small>Эпик</small></th><th scope="col">T6 <small>Эпик</small></th><th scope="col">T8 <small>Лега</small></th></tr></thead><tbody>${list.map(i=>{
 const g=group(i),heading=g!==last?`<tr class="base-group"><th colspan="4" scope="rowgroup">${groups[g]}</th></tr>`:'';last=g;
 const t4=standards.find(x=>x.item_tier===4&&x.item_type===i.item_type&&x.item_subtype===i.item_subtype);
 const values=[t4?.enhancement_bases?.standard,i.item_type==='weapon'&&i.item_subtype==='axe'?12:i.enhancement_bases.standard,i.enhancement_bases.legendary];
 return heading+`<tr class="base-item-row"><th scope="row"><span class="base-item-name"><img src="${itemImage(i,'epic')}" alt="" loading="lazy">${esc(i.name.ru)}</span></th>${values.map(v=>`<td><span class="base-number">${v==null?'—':fmt(v)}</span></td>`).join('')}</tr>`;
 }).join('')}</tbody></table></div>`;
 }
 function costs(){
 const prices={};for(const el of root.querySelectorAll('[data-enh-price]')){if(el.value===''||!Number.isFinite(el.valueAsNumber)||el.valueAsNumber<0){$('enh-cost').textContent='Введите неотрицательные цены для всех расходников.';$('enh-essences').textContent='Для расчёта заполните цены выше.';return}prices[el.dataset.enhPrice]=el.valueAsNumber}
 const from=+$('cost-from').value,to=+$('cost-to').value,method=$('cost-method').value,weapon=$('cost-type').value==='weapon',essenceRoutes=$('cost-essence-routes').checked,result=enhancementCosts(prices,weapon,method,{essenceRoutes,extractionItemCost:2400}),steps=result.steps.slice(from,to),estimated=steps.some(s=>s.estimated);
 const optimal=method==='optimal'?result:enhancementCosts(prices,weapon,'optimal',{essenceRoutes,extractionItemCost:2400}),label=s=>methods[s.method]+(s.method==='essence'?' +'+s.level:''),rows=steps.map((first,index)=>{const level=from+index,best=optimal.steps[level],second=method==='optimal'?(best.candidates[1]||best):best,difference=second.cost-first.cost,percent=first.cost?difference/first.cost*100:difference?Math.sign(difference)*100:0,strength=Math.min(1,Math.abs(percent)/100),tone=difference<0?'second-better':difference>0?'first-better':'equal';return {transition:`+${first.level-1} → +${first.level}`,firstMethod:label(first),firstCost:fmt(first.cost)+(first.estimated?'*':''),secondMethod:label({...second,level:first.level}),secondCost:fmt(second.cost)+(second.estimated?'*':''),difference:`${signed(difference)} (${signed(percent)}%)`,tone,alpha:(.08+.42*strength).toFixed(3)}}),comparisonTable=`<div class="guide-table-wrap enhance-cost-table-wrap"><table class="enhance-cost-table"><thead><tr><th rowspan="2">Переход</th><th class="cost-group" colspan="2">Вариант 1</th><th class="cost-group" colspan="2">Вариант 2</th><th rowspan="2">2 − 1</th></tr><tr><th>Способ</th><th>Цена</th><th>Способ</th><th>Цена</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.transition}</td><td>${row.firstMethod}</td><td>${row.firstCost}</td><td>${row.secondMethod}</td><td>${row.secondCost}</td><td class="enhance-difference difference-${row.tone}" style="--diff-alpha:${row.alpha}">${row.difference}</td></tr>`).join('')}</tbody></table></div>`;
 $('enh-cost').innerHTML=to<from?'<p>Конечный уровень должен быть не ниже начального.</p>':`<div class="enhance-total"><small>В среднем · +${from} → +${to}</small><strong>${fmt(steps.reduce((sum,s)=>sum+s.cost,0))}${estimated?'*':''} <small>серебра</small></strong></div>${comparisonTable}<p class="hint">Разница = вариант 2 − вариант 1. Зелёный — второй вариант выгоднее, красный — первый. ${method==='optimal'?'Во втором варианте показан следующий по выгоде способ.':'Во втором варианте показан самый выгодный способ.'}${estimated?' * Расчёт зависит от оценочных шансов стойкости.':''}</p>`;
 $('enh-essences').innerHTML=`<div class="guide-table-wrap essence-table-wrap"><table class="essence-table"><thead><tr><th>Эссенция</th><th>Формула 1</th><th>Формула 2</th></tr></thead><tbody>${result.essence.slice(1).map((_,j)=>{const level=j+1,alternative=rules.alternativeRecipes?.[level];return `<tr><th scope="row">${essenceName(level)}</th><td>${level===1?'<span class="essence-purchase">Покупка</span>':essenceRecipe(rules.recipes[level])}</td><td>${alternative?essenceRecipe(alternative):'<span class="essence-empty">—</span>'}</td></tr>`}).join('')}</tbody></table></div>`;
 }
 for(const id of ['cost-from','cost-to','cost-method','cost-type','cost-essence-routes'])$(id).onchange=costs;
 for(const el of root.querySelectorAll('[data-enh-price]'))el.oninput=costs;
 bases();costs();
}
