import {blueprintLevel,collectionLevel,blueprintOwned} from './library-model.js';
import {names,slots,propertyValue} from './model.js';
const key='ligmarbd.library.v1';
const labels=['Не изучено','Ур. 1','Ур. 2','Ур. 3 · древнее'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statGroups=[
 {id:'defense',label:'Защита',keys:['defense','resistance','evasion','physicalDamageReduction']},
 {id:'resources',label:'HP / мана',keys:['health','healthRegen','mana','manaRegen']},
 {id:'speed',label:'ВА / ПМА / ШК',keys:['activationTime','physicalAttackInterval','criticalHitRate']},
 {id:'damage',label:'Урон',keys:['physicalAttack','physicalAttackMin','physicalAttackMax','magicAttack','magicAttackMin','magicAttackMax']},
 {id:'utility',label:'Прочее',keys:['accuracy','requirements','stealth','visibility']},
 {id:'attributes',label:'Статы',keys:['strength','dexterity','vitality','magic']}
];
const propertyName=k=>k.startsWith('unknown_property_')?'—':names[k]||k;
const statGroup=k=>statGroups.find(g=>g.keys.includes(k))||statGroups[4];
const statOrder=statGroups.flatMap(g=>g.keys);
const columnKey=k=>({visibility:'stealth',magicAttack:'physicalAttack',magicAttackMin:'physicalAttackMin',magicAttackMax:'physicalAttackMax'}[k]||k);
const columnName=k=>({stealth:'Скрытность / заметность',physicalAttack:'Физ. / маг. атака',physicalAttackMin:'Атака (мин.)',physicalAttackMax:'Максимальный урон',physicalAttackInterval:'Пауза между атаками'}[k]||names[k]||k);
export async function mountLibrary(root,items){
 root.innerHTML='<p class="loading">Загрузка библиотеки…</p>';
 let rules;try{const response=await fetch('data/library-levels.json');if(!response.ok)throw Error();rules=await response.json()}catch{root.innerHTML='<p>Не удалось загрузить уровни библиотеки. Обновите страницу.</p>';return}
 if(location.hash!=='#library')return;
 try{const response=await fetch('data/library-extra-blueprints.json');if(!response.ok)throw Error();items=[...items,...await response.json()]}catch{root.innerHTML='<p>Не удалось загрузить чертежи библиотеки. Обновите страницу.</p>';return}
 let data={version:1,tiers:{}},tier=4,previous=null,notice='',editing=false,showInfo=false;
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===1&&saved.tiers&&typeof saved.tiers==='object')data=saved}catch{notice='Не удалось прочитать сохранение библиотеки.'}
 const tierItems=t=>items.filter(i=>t===8?i.blueprint_quality==='legendary':i.item_tier===t&&!i.blueprint_quality);
 for(const i of tierItems(8)){const e=data.tiers[8]?.items?.[i.template_id];if(e){e.owned=Boolean(blueprintOwned(e));for(const k of Object.keys(i.property_value_ranges))e.props[k]=e.owned?Math.max(1,Math.min(3,Math.trunc(Number(e.props[k])||1))):0}}
 const id=i=>i.template_id;
 const sheet=()=>data.tiers[tier]??={level:0,items:{}};
 const entry=i=>sheet().items[id(i)]??={level:0,props:{}};
 const rank=(i,k)=>Math.max(0,Math.min(3,Math.trunc(Number(entry(i).props[k])||0)));
 const group=i=>i.item_type==='weapon'?0:i.item_type==='neck'?5:i.item_type==='waist'?6:i.item_type==='finger'?7:i.item_type==='shoulders'?1:({magic:2,light:3,heavy:4}[i.item_subtype]??4);
 const groups=['Оружие','Плащи','Броня · тряпки','Броня · лёгкая','Броня · тяжёлая','Бижутерия · амулеты','Бижутерия · пояса','Бижутерия · кольца'];
 const weaponOrder=['staff','wand','bow','crossbow','daggers','stiletto','fist','sword','axe','hammer'];
 const slotOrder=['head','chest','hands','legs','feet','shoulders'];
 function save(){try{localStorage.setItem(key,JSON.stringify(data));notice='Сохранено в этом браузере'}catch{notice='Не удалось сохранить. Возможно, хранилище браузера заполнено.'}}
 function change(fn){previous=structuredClone(data);fn();save();draw()}
 const blueprintInfo='Уровень чертежа определяется минимальным уровнем его свойств. Для легендарных учитываются только изученные свойства. Неизученный рецепт — уровень 0.\n'+rules.blueprint_levels.map(r=>`Ур. ${r.blueprint_level}: минимальный уровень свойств ${r.minimum_level_of_every_counted_property}; расход материалов −${r.material_reduction_percent}%; шанс на сотку +${r.magic_property_100_percent_chance_bonus_percent}%.`).join('\n');
 const libraryInfo='Уровень библиотеки определяется минимальным уровнем обязательных чертежей. Зион: обычные Т4. Острог: обычные Т6 и легендарные Т8, общая коллекция.\n'+rules.library_levels.map(r=>`Ур. ${r.library_level}: минимальный уровень чертежей ${r.minimum_level_of_every_required_blueprint}; расход материалов −${r.material_reduction_percent}%; шанс на сотку +${r.magic_property_100_percent_chance_bonus_percent}%.`).join('\n');
 const infoHelp={
  'Шанс на сотку':'Бонус к вероятности получить 100% значения свойства — верхнюю границу обычного диапазона. Это прибавка к шансу, а не итоговая вероятность: +200% не означает гарантированную сотку.',
  'Снижение материалов':'Уменьшает расход материалов при создании, обычной ковке и плавке. Бонусы мастера, чертежа и библиотеки складываются. Жетоны, серебро и слёзы Феникса не затрагиваются; при древней плавке скидка не действует.'
 };
 const infoColumn=h=>h==='Шанс на сотку'?'chance':h==='Снижение материалов'?'materials':h.startsWith('Минимальный')?'minimum':h==='Древнее свойство'?'ancient':'level';
 const infoTable=(headers,rows,active=null)=>`<table class="library-info-table"><thead><tr>${headers.map(h=>`<th scope="col" class="info-${infoColumn(h)}" ${infoHelp[h]?`title="${esc(infoHelp[h])}" tabindex="0"`:''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr ${row[0]===active?'class="library-info-active" aria-current="true"':''}>${row.map((v,n)=>n?`<td class="info-${infoColumn(headers[n])}">${esc(v)}</td>`:`<th scope="row" class="info-level"><span class="library-info-level">${esc(v)}</span>${row[0]===active?'<small class="library-active-label">Активен</small>':''}</th>`).join('')}</tr>`).join('')}</tbody></table>`;
 const chanceHeader='Шанс на сотку';
 const propertyTable=infoTable(['Уровень свойства',chanceHeader,'Древнее свойство'],[['0 · не изучено','—','Недоступно'],...rules.property_levels.map(r=>[r.property_level,`+${r.magic_property_100_percent_chance_bonus_percent}%`,r.ancient_property_unlocked?'Доступно':'Недоступно'])]);
 const blueprintTable=infoTable(['Уровень чертежа','Минимальный уровень свойств','Снижение материалов',chanceHeader],rules.blueprint_levels.map(r=>[r.blueprint_level,r.minimum_level_of_every_counted_property,`${r.material_reduction_percent}%`,`+${r.magic_property_100_percent_chance_bonus_percent}%`]));
 const libraryTable=infoTable(['Уровень библиотеки','Минимальный уровень чертежей','Снижение материалов',chanceHeader],rules.library_levels.map(r=>[r.library_level,r.minimum_level_of_every_required_blueprint,`${r.material_reduction_percent}%`,`+${r.magic_property_100_percent_chance_bonus_percent}%`]));
 const options=()=>labels.map((l,n)=>`<option value="${n}">${l}</option>`).join('');
 function draw(){
 const list=tierItems(tier).sort((a,b)=>group(a)-group(b)||(a.item_type==='weapon'&&b.item_type==='weapon'?weaponOrder.indexOf(a.item_subtype)-weaponOrder.indexOf(b.item_subtype):0)||slotOrder.indexOf(a.item_type)-slotOrder.indexOf(b.item_type)||a.name.ru.localeCompare(b.name.ru,'ru')),columns=[...new Set(list.flatMap(i=>Object.keys(i.property_value_ranges).map(columnKey)))].sort((a,b)=>(statOrder.indexOf(a)<0?statOrder.indexOf('accuracy'):statOrder.indexOf(a))-(statOrder.indexOf(b)<0?statOrder.indexOf('accuracy'):statOrder.indexOf(b)));
 const level=collectionLevel(items,data,tier,rules),bonus=rules.library_levels.find(r=>r.library_level===level);
 const count=list.reduce((n,i)=>n+Object.keys(i.property_value_ranges).filter(k=>rank(i,k)>0).length,0),total=list.reduce((n,i)=>n+Object.keys(i.property_value_ranges).length,0);
 root.innerHTML=`<div class="page-title"><div><span class="eyebrow">ЧЕРТЕЖИ И ИЗУЧЕННЫЕ СВОЙСТВА</span><h1>Библиотека Т${tier}</h1></div><span class="library-level-help" tabindex="0" data-level-tip="library">Уровень библиотеки: <b>${level}</b></span></div>
 <div class="library-tabs"><div class="library-tier-buttons">${[4,6,8].map(t=>`<button class="secondary ${t===tier?'selected':''}" data-library-tier="${t}" aria-pressed="${t===tier}">Т${t}</button>`).join('')}</div><div class="library-actions"><button class="secondary" id="library-info" aria-expanded="${showInfo}" aria-controls="library-info-panel">Инфо</button><button class="secondary" id="library-edit" aria-expanded="${editing}" aria-controls="library-edit-panel">Редактировать</button></div></div>
 <section class="panel library-controls" id="library-edit-panel" ${editing?'':'hidden'}><div><label>Заполнить вкладку <select id="library-fill">${options()}</select></label> <button class="secondary" id="library-apply">Применить ко всем</button> <button class="text-button" id="library-undo" ${previous?'':'disabled'}>Отменить последнее действие</button></div></section>
 <section class="panel library-controls library-info-panel" id="library-info-panel" ${showInfo?'':'hidden'}><h3>Уровни свойств</h3>${propertyTable}<p>На уровне 1 свойство открыто. Пояснения к шансу на сотку и снижению материалов — при наведении на заголовки столбцов.</p><p>${tier===8?'Галочка открывает рецепт и все свойства на уровне 1. Нажатие: 1 → 2 → 3 → 1. Без галочки все свойства равны 0.':'Нажатие на свойство: 0 → 1 → 2 → 3 → 0.'}</p><h3>Уровни чертежей</h3><p>${esc(blueprintInfo.split('\n')[0])}</p>${blueprintTable}<h3>Уровни библиотеки</h3><p>${esc(libraryInfo.split('\n')[0])}</p>${libraryTable}<p>Текущая библиотека: снижение материалов ${bonus.material_reduction_percent}%; шанс на сотку +${bonus.magic_property_100_percent_chance_bonus_percent}%. Снижение материалов от мастера, чертежа и библиотеки складывается.</p></section>
 <div class="library-legend"><span>□ Не изучено</span><span class="library-rank-1">✓ Ур. 1: открыто</span><span class="library-rank-2">✓ Ур. 2: шанс +200%</span><span class="library-rank-3">✓ Ур. 3: шанс +500%, древнее</span><span>Изучено ${count} / ${total}</span></div>
 <div class="library-scroll"><table class="library-table ${tier===8?'library-t8':''}"><thead>${tier===8?'':`<tr class="library-stat-groups"><th></th>${statGroups.map(g=>{const count=columns.filter(k=>statGroup(k).id===g.id).length;return count?`<th class="stat-category-${g.id}" colspan="${count}">${g.label}</th>`:''}).join('')}</tr>`}<tr><th>Предмет / ур.</th>${tier===8?'<th class="library-owned-heading">Изучен рецепт</th><th></th><th></th><th></th>':columns.map(k=>`<th data-column="${k}" class="stat-category-${statGroup(k).id}"><span>${esc(columnName(k))}</span></th>`).join('')}</tr></thead><tbody>${list.map((i,n)=>`${n===0||group(list[n-1])!==group(i)?`<tr class="library-group"><th colspan="${tier===8?5:columns.length+1}">${groups[group(i)]}</th></tr>`:''}<tr><th scope="row"><div class="library-item"><img src="assets/${esc(i.image_path)}" alt=""><span>${esc(i.name.ru)}</span><small class="library-level-help" tabindex="0" data-level-tip="${n}">${blueprintLevel(i,entry(i),rules)}</small></div></th>${tier===8?`<td><input type="checkbox" data-owned="${n}" ${blueprintOwned(entry(i))?'checked':''} aria-label="Изучен рецепт: ${esc(i.name.ru)}"></td>`:''}${(tier===8?Object.keys(i.property_value_ranges):columns).map(column=>{const k=tier===8?column:Object.keys(i.property_value_ranges).find(key=>columnKey(key)===column);if(!k)return `<td data-column="${column}" class="library-unavailable stat-category-${statGroup(column).id}">—</td>`;const r=rank(i,k),title=`${i.name.ru}: ${k.startsWith('unknown_property_')?'Свойство '+k.split('_').at(-1)+' (название неизвестно)':propertyName(k)}`;return `<td data-column="${column}" class="stat-category-${statGroup(k).id}"><button class="library-cell library-rank-${r}" ${tier===8&&!blueprintOwned(entry(i))?'disabled':''} data-row="${n}" data-stat="${k}" aria-label="${esc(title)}: ${labels[r]}; повысить качество">${tier===8?esc(propertyName(k)):r||'·'}</button></td>`}).join('')}</tr>`).join('')}</tbody></table></div><p class="hint" role="status">${esc(notice)}</p><div id="library-level-tooltip" role="tooltip" hidden></div>`;
 const tooltip=root.querySelector('#library-level-tooltip');
 let tipTrigger=null,hideTimer;
 const hideTip=()=>{clearTimeout(hideTimer);tooltip.hidden=true;tooltip.classList.remove('library-property-tooltip');tipTrigger?.removeAttribute('aria-describedby');tipTrigger=null};
 const scheduleHide=()=>{clearTimeout(hideTimer);hideTimer=setTimeout(hideTip,120)};
 function showTip(el){
  hideTip();tipTrigger=el;
  const isLibrary=el.dataset.levelTip==='library',item=isLibrary?null:list[+el.dataset.levelTip];
  const current=isLibrary?level:blueprintLevel(item,entry(item),rules),levelKey=isLibrary?'library_level':'blueprint_level';
  const rows=isLibrary?rules.library_levels:rules.blueprint_levels,currentBonus=rows.find(r=>r[levelKey]===current);
  const thresholdKey=isLibrary?'minimum_level_of_every_required_blueprint':'minimum_level_of_every_counted_property';
  const tableRows=rows.map(r=>[r[levelKey],r[thresholdKey],`${r.material_reduction_percent}%`,`+${r.magic_property_100_percent_chance_bonus_percent}%`]);
  if(!isLibrary)tableRows.unshift([0,'—','0%','+0%']);
  tooltip.innerHTML=`<h3>${isLibrary?'Библиотека':esc(item.name.ru)} · уровень ${current}</h3><p class="library-current-bonus">${current===0?'Рецепт не изучен. ':''}Снижение материалов: <b>${currentBonus?.material_reduction_percent||0}%</b> · Шанс на сотку: <b>+${currentBonus?.magic_property_100_percent_chance_bonus_percent||0}%</b></p>${infoTable([isLibrary?'Уровень библиотеки':'Уровень чертежа',isLibrary?'Минимальный уровень чертежей':'Минимальный уровень свойств','Снижение материалов',chanceHeader],tableRows,current)}<p>${esc((isLibrary?libraryInfo:blueprintInfo).split('\n')[0])}</p>`;
  placeTip(el);
 }
 function placeTip(el){
  el.setAttribute('aria-describedby',tooltip.id);tooltip.hidden=false;
  const r=el.getBoundingClientRect(),t=tooltip.getBoundingClientRect();
  tooltip.style.left=Math.max(8,Math.min(r.left,innerWidth-t.width-8))+'px';
  tooltip.style.top=Math.max(8,Math.min(r.bottom+8+t.height<=innerHeight?r.bottom+8:r.top-t.height-8,innerHeight-t.height-8))+'px';
 }
 function showPropertyTip(el){
  hideTip();tipTrigger=el;tooltip.classList.add('library-property-tooltip');
  const item=list[+el.dataset.row],k=el.dataset.stat,current=rank(item,k),range=item.property_value_ranges[k];
  const label=k.startsWith('unknown_property_')?'Свойство '+k.split('_').at(-1)+' (название неизвестно)':k==='physicalAttackInterval'?'Пауза между атаками':['physicalAttackMax','magicAttackMax'].includes(k)?'Максимальный урон':propertyName(k);
  const unit=['activationTime','criticalHitRate','requirements','physicalDamageReduction'].includes(k)?'%':k==='physicalAttackInterval'?' с':['healthRegen','manaRegen'].includes(k)?' ед/с':'';
  const format=v=>Number(v).toLocaleString('ru-RU',{maximumFractionDigits:6});
  const rangeText=range&&Number.isFinite(range.min)&&Number.isFinite(range.max)?`${format(range.min)}${unit} — ${format(range.max)}${unit}`:'Пока неизвестен';
  const ancientText=range&&Number.isFinite(range.max)&&Number.isFinite(range.min)?`${format(propertyValue(range,150))}${unit}`:'—';
  const rows=[[0,'—','Недоступно'],...rules.property_levels.map(r=>[r.property_level,`+${r.magic_property_100_percent_chance_bonus_percent}%`,r.ancient_property_unlocked?'Доступно':'Недоступно'])];
  tooltip.innerHTML=`<h3>${esc(item.name.ru)} · ${esc(label)}</h3><p class="library-property-range">Диапазон: <b>${esc(rangeText)}</b><span>Древка: <b>${esc(ancientText)}</b></span></p>${infoTable(['Уровень свойства',chanceHeader,'Древнее свойство'],rows,current)}`;
  placeTip(el);
 }
 root.querySelectorAll('.library-cell').forEach(el=>{el.parentElement.onmouseenter=()=>showPropertyTip(el);el.parentElement.onmouseleave=scheduleHide;el.onfocus=()=>showPropertyTip(el);el.onblur=scheduleHide});
 root.querySelectorAll('[data-level-tip]').forEach(el=>{el.onmouseenter=()=>showTip(el);el.onmouseleave=scheduleHide;el.onfocus=()=>showTip(el);el.onblur=scheduleHide});
 tooltip.onmouseenter=()=>clearTimeout(hideTimer);tooltip.onmouseleave=scheduleHide;
 root.onkeydown=e=>{if(e.key==='Escape')hideTip()};
 root.onwheel=e=>{if(!tooltip.contains(e.target))hideTip()};
 root.querySelector('#library-edit').onclick=()=>{editing=!editing;draw();root.querySelector('#library-edit').focus()};
 root.querySelector('#library-info').onclick=()=>{showInfo=!showInfo;draw();root.querySelector('#library-info').focus()};
 const table=root.querySelector('.library-table');
 let highlighted=[];
 const clearHighlight=()=>{highlighted.forEach(el=>el.classList.remove('library-hover'));highlighted=[]};
 function highlight(cell){clearHighlight();if(!cell||cell.closest('tr')?.classList.contains('library-group'))return;const row=cell.closest('tr');if(row?.parentElement.tagName==='TBODY')highlighted.push(...row.children);const column=cell.dataset.column;if(column&&tier!==8)highlighted.push(...Array.from(table.querySelectorAll('[data-column]')).filter(el=>el.dataset.column===column));highlighted.forEach(el=>el.classList.add('library-hover'))}
 table.onmouseover=e=>highlight(e.target.closest('td,th'));
 table.onmouseleave=clearHighlight;
 table.onfocusin=e=>highlight(e.target.closest('td,th'));
 table.onfocusout=clearHighlight;
 root.querySelectorAll('[data-library-tier]').forEach(b=>b.onclick=()=>{tier=+b.dataset.libraryTier;draw()});
 root.querySelectorAll('[data-stat]').forEach(el=>el.onclick=()=>change(()=>{const i=list[+el.dataset.row],k=el.dataset.stat;entry(i).owned=true;entry(i).props[k]=tier===8?rank(i,k)%3+1:(rank(i,k)+1)%4}));
 root.querySelectorAll('[data-owned]').forEach(el=>el.onchange=()=>change(()=>{const i=list[+el.dataset.owned],e=entry(i);e.owned=el.checked;for(const k of Object.keys(i.property_value_ranges))e.props[k]=el.checked?1:0}));
 const fill=(i,r)=>{entry(i).owned=tier===8?r>0:true;for(const k of Object.keys(i.property_value_ranges))entry(i).props[k]=r};
 root.querySelector('#library-apply').onclick=()=>{const r=+root.querySelector('#library-fill').value;change(()=>list.forEach(i=>fill(i,r)))};
 root.querySelector('#library-undo').onclick=()=>{if(previous){data=previous;previous=null;save();draw()}};
 }
 draw();
}
