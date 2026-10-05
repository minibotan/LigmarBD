import {masterFor,discounts,operationCosts} from './workshop-model.js';
import {blueprintTier} from './library-model.js';
const key='ligmarbd.workshop.v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mastersList=[['blacksmith','Кузнец','Оружие'],['atelier','Портной','Броня и плащи'],['craftworks','Ремесленник','Украшения'],['jeweler','Ювелир','Создание камней · позже']];
const fmt=n=>n===null?'Нет данных':n.toLocaleString('ru-RU');
export async function mountWorkshop(root,items){
 root.innerHTML='<p class="loading">Загрузка мастерской…</p>';
 let masters,costs,rules,extra;
 try{[masters,costs,rules,extra]=await Promise.all(['craft-master-levels','craft-material-costs','library-levels','library-extra-blueprints'].map(async f=>{const r=await fetch(`data/${f}.json`);if(!r.ok)throw Error();return r.json()}))}catch{root.innerHTML='<p>Не удалось загрузить мастерскую. Обновите страницу.</p>';return}
 if(location.hash!=='#workshop')return;
 items=[...items,...extra];
 let state={version:1,selected:'blacksmith',tier:6,item:'',masters:{},ancient:0,locked:0,revert:false},library={tiers:{}},notice='';
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===1)state={...state,...saved,masters:saved.masters||{}}}catch{notice='Не удалось прочитать сохранение мастерской.'}
 try{const saved=JSON.parse(localStorage.getItem('ligmarbd.library.v1'));if(saved?.version===1)library=saved}catch{notice='Не удалось прочитать библиотеку. Скидки рассчитаны без её прогресса.'}
 if(state.selected==='jeweler'||!mastersList.some(m=>m[0]===state.selected))state.selected='blacksmith';
 if(![4,6,8].includes(state.tier))state.tier=6;
 for(const [id] of mastersList){const m=state.masters[id]||{};state.masters[id]={level:Math.max(1,Math.min(10,Math.trunc(Number(m.level)||1))),experience:Math.max(0,Math.trunc(Number(m.experience)||0))}}
 state.ancient=Math.max(0,Math.min(4,Math.trunc(Number(state.ancient)||0)));state.locked=Math.max(0,Math.min(4,Math.trunc(Number(state.locked)||0)));
 function save(){try{localStorage.setItem(key,JSON.stringify(state));notice='Сохранено в этом браузере'}catch{notice='Не удалось сохранить изменения.'}}
 function draw(){
 const available=items.filter(i=>blueprintTier(i)===state.tier&&masterFor(i)===state.selected).sort((a,b)=>a.name.ru.localeCompare(b.name.ru,'ru'));
 const item=available.find(i=>i.template_id===state.item)||null;
 const d=discounts(items,library,item,state.tier,state.masters[state.selected].level,masters,rules);
 const materialName=costs.material_names?.[state.selected]?.[state.tier]||'Материал';

 const resourceKeys=['tokens','scrap','shards','pine','ancient','tears'];
 const resourceClass=k=>'resource-'+(k==='pine'?'material':k);
 const rows=operationCosts(costs,state.selected,state.tier,d.total,state);
 const pct=n=>n===null?'Нет данных':n+'%';
 root.innerHTML=`<div class="page-title"><div><span class="eyebrow">РЕСУРСЫ И СКИДКИ</span><h1>Мастерская</h1></div></div><div class="workshop-masters">${mastersList.map(([id,name,caption])=>`<section class="panel workshop-master ${id==='jeweler'?'workshop-disabled':''} ${state.selected===id?'selected':''}"><button class="workshop-master-select" data-master="${id}" ${id==='jeweler'?'disabled':''} aria-pressed="${state.selected===id}"><strong>${name}</strong><small>${caption}</small></button><div class="workshop-master-fields"><label>Уровень<select data-level="${id}" ${id==='jeweler'?'disabled':''}>${masters.levels.map(r=>`<option value="${r.craft_level}" ${r.craft_level===state.masters[id].level?'selected':''}>${r.craft_level}</option>`).join('')}</select></label><label>Текущий опыт<input type="number" min="0" step="1" data-experience="${id}" ${id==='jeweler'?'disabled':''} value="${state.masters[id].experience}"></label></div></section>`).join('')}</div><section class="panel workshop-body"><div class="workshop-filters"><label>Тир<select id="workshop-tier">${[4,6,8].map(t=>`<option ${t===state.tier?'selected':''} value="${t}">Т${t}</option>`).join('')}</select></label><label>Предмет<select id="workshop-item"><option value="">Без предмета — без скидки чертежа</option>${available.map(i=>`<option value="${i.template_id}" ${i===item?'selected':''}>${esc(i.name.ru)}</option>`).join('')}</select></label></div>${state.selected==='jeweler'?'<p>Создание камней: стоимость ресурсов и скидки ювелира пока неизвестны.</p>':`<div class="workshop-discounts"><span>Мастер <b>${pct(d.master)}</b></span><span>Чертёж${d.blueprint===null?'':` · ур. ${d.blueprint}`} <b>${pct(d.recipe)}</b></span><span>Библиотека · ур. ${d.collection} <b>${pct(d.book)}</b></span><span class="workshop-total">Суммарная скидка <b>${pct(d.total)}</b></span></div><p class="hint workshop-recipe-notice">${item&&d.blueprint===0?'Рецепт не изучен. Стоимость показана для планирования.':'&nbsp;'}</p><div class="workshop-filters"><label>Древних свойств<select id="workshop-ancient">${[0,1,2,3,4].map(n=>`<option ${n===state.ancient?'selected':''}>${n}</option>`).join('')}</select></label><label>Заблокировано при плавке<select id="workshop-locked">${[0,1,2,3,4].map(n=>`<option ${n===state.locked?'selected':''}>${n}</option>`).join('')}</select></label><label class="workshop-revert"><input id="workshop-revert" type="checkbox" ${state.revert?'checked':''}> Возврат результата ковки</label></div>${rows.length?`<div class="workshop-cost-scroll"><table class="workshop-costs"><colgroup><col style="width:22%"><col span="6" style="width:13%"></colgroup><thead><tr>${['Действие','Жетоны','Лом','Осколки',materialName,'Древние осколки','Слёзы Феникса'].map((t,n)=>`<th scope="col" class="${n?resourceClass(resourceKeys[n-1]):''}">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${({creation:'Создание',forging:'Ковка',melting:'Плавка',ancient_melting:'Древняя плавка'})[r.operation]}</th>${resourceKeys.map(k=>`<td class="${resourceClass(k)} ${r[k]===0?'resource-zero':''}">${fmt(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p>Стоимость действий для Т8 пока неизвестна. Скидки выбранного рецепта показаны выше.</p>'}<p class="hint">Материалы округляются вверх после скидки. Жетоны и слёзы Феникса без скидки; древняя плавка — тоже. Серебро в расчёт не включено: данных о стоимости нет.</p>`}</section><p class="hint">Уровень и опыт задаются отдельно. Опыт не переключает уровень автоматически.</p><p role="status" class="hint">${esc(notice)}</p>`;
 root.querySelectorAll('[data-master]').forEach(el=>el.onclick=()=>{state.selected=el.dataset.master;state.item='';save();draw()});
 root.querySelectorAll('[data-level]').forEach(el=>el.onchange=()=>{state.masters[el.dataset.level].level=+el.value;save();draw()});
 root.querySelectorAll('[data-experience]').forEach(el=>el.onchange=()=>{state.masters[el.dataset.experience].experience=Math.max(0,Math.trunc(Number(el.value)||0));save();draw()});
 for(const name of ['tier','item','ancient','locked','revert']){const el=root.querySelector('#workshop-'+name);if(el)el.onchange=()=>{state[name]=name==='revert'?el.checked:name==='item'?el.value:+el.value;if(name==='tier')state.item='';save();draw()}}
 }
 draw();
}
