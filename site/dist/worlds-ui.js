const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?n.toLocaleString('ru-RU',{maximumFractionDigits:2}):'—';
const colors=['#819e99','#b3a087','#889bb2','#ad8f98','#9ca58c'],purple='#a08dae';
const worlds=[['zion','Зион','13e1a679ae4080219840da2108d499ca'],['ostrog','Острог','2761a679ae408037bcffd5a20f2d4904'],['arx','Аркс','3a61a679ae4080eb818ef6cc122e2221']];
const types={location:'Локация',party_dungeon:'Групповое подземелье',guild_dungeon:'Гильдейское подземелье',temple:'Храм'};
let mapColors=true,selectedWorld='zion',selectedLocation=null,hoverAbort=new AbortController();
export async function mountWorlds(root){
 root.innerHTML='<p class="loading">Загрузка миров…</p>';
 let locations,mobs,presentation;
 try{[locations,mobs,presentation]=await Promise.all(['world-battles','world-mob-templates','world-presentation'].map(async f=>{const r=await fetch(`data/${f}.json`);if(!r.ok)throw Error();return r.json()}))}catch{root.innerHTML='<section class="panel"><h2>Не удалось загрузить миры</h2><p>Обновите страницу.</p></section>';return}
 if(location.hash!=='#worlds')return;
 const index=new Map(mobs.map(m=>[m.ID,m]));
 const register=m=>{for(const child of m.Minions||[]){if(child.ID){index.set(child.ID,child);register(child)}}};mobs.forEach(register);
 const resolve=v=>v?.MobTemplateID?index.get(v.MobTemplateID):v?.ID?v:null;
 const label=m=>presentation.mobs[m?.ID]?.name||m?.Name?.ru||`${m?.Type==='boss'?'Босс':m?.Type==='quest'?'Квестовый противник':m?.Type==='champion'?'Чемпион':m?.AttackType==='magic'?'Маг':'Боец'} ${m?.Level??'?'} ур.`;
 const icon=m=>presentation.mobs[m.ID]?.image?`<img class="world-mob-icon world-mob-image" src="${esc(presentation.mobs[m.ID].image)}" alt="${esc(label(m))}" loading="lazy" referrerpolicy="no-referrer">`:`<span class="world-mob-icon" role="img" aria-label="Условная иконка: ${esc(label(m))}">${m.Type==='boss'?'♛':m.AttackType==='magic'?'✦':m.Ranged?'➶':'⚔'}</span>`;
 const hexMobs=h=>(h.Rounds||[]).flatMap(r=>(r.Mobs||[]).map(entry=>({entry,mob:resolve(entry.MobTemplate),wave:r.Number}))).filter(x=>x.mob);
 function allMobs(l){const result=new Map();const add=v=>{const m=resolve(v);if(m)result.set(m.ID,m)};(l.MobTemplates||[]).forEach(add);add(l.LocationKeeper);for(const h of l.Hexes||[])hexMobs(h).forEach(x=>add(x.mob));for(const x of l.BossSpawnSchedules||[])add(x.MobTemplate);return [...result.values()]}
 function belonging(l){return l.TownID?worlds.find(w=>w[2]===l.TownID)?.[0]:l.WorldTier===1?'zion':l.WorldTier===2?'ostrog':null}
 function mobButton(m,n,color,spawn=''){return `<button class="world-mob" data-mob="${esc(m.ID)}" style="--mob-color:${color}">${icon(m)}<span><strong>${n!==undefined?n+'. ':''}${esc(label(m))}</strong><small class="mob-combat-line"><b>${fmt(m.Level)} ур.</b><img class="mob-combat-icon" src="https://ligmar.io/game/assets/icons/mob-class-${m.AttackType==='magic'?'magic':'physical'}-${m.Ranged?'range':'melee'}.svg" alt="${m.Ranged?'Дальний':'Ближний'} бой · ${m.AttackType==='magic'?'магический':'физический'} урон" title="${m.Ranged?'Дальний':'Ближний'} бой · ${m.AttackType==='magic'?'магический':'физический'} урон">${spawn?`<span class="mob-spawn">${esc(spawn)}</span>`:''}</small></span></button>`}
 function mobSkillDetails(s){
  const targets={target:'Текущая цель',self:'Сам моб',all:'Все противники',close:'Ближние цели',attacker:'Противники, взявшие моба в цель',party:'Группа целей'};
  const effects=s.Effects||[],description=(s.Description?.ru||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'');
  let target=[...new Set(effects.map(e=>targets[e.Object]||e.Object).filter(Boolean))].join('; ')||'Не указано';
  if(/случайному игроку.*держит монстра в цели/i.test(description))target='Случайный игрок, взявший моба в цель';
  const facts=[['Можно сбить',s.Unstoppable===true?'Нет — непрерываемое':s.Unstoppable===false?(s.ActivationTime>0?'Да':'Мгновенное применение'):'Неизвестно'],['Цели',target],['Дальность',({melee:'Ближний бой',ranged:'Дальний бой'})[s.Range]||'Не указана']];
  if(s.TrueHit===true)facts.push(['Меткость','Не проверяется']);
  const effectNames={slow:'Замедление',root:'Обездвиживание',stun:'Оглушение',sleep:'Сон',downDefenseMob:'Снижение защиты',downResistanceMob:'Снижение сопротивления',physicalDamageOverTimeMob:'Физический DOT',magicDamageOverTimeMob:'Магический DOT',upDamageReduction:'Снижение входящего урона',mobFury:'Усиление урона',reflection:'Отражение урона',downHealing:'Снижение лечения'};
  const rows=effects.flatMap(e=>{
   const parts=[];
   if(e.Duration>0)parts.push(`Длительность: ${fmt(e.Duration/1e9)} с`);
   if(Number.isFinite(e.Chance)&&e.Chance<100)parts.push(`Шанс: ${fmt(e.Chance)}%`);
   if(e.Trigger==='periodic'&&e.TriggerCooldown>0)parts.push(`Тик раз в ${fmt(e.TriggerCooldown/1e9)} с`);
   if(e.Trigger==='on_damage_taken')parts.push('Срабатывает при получении урона');
   if(e.Accumulative)parts.push('Суммируется при повторном наложении');
   const statuses=e.EffectStatuses||[];
   if(statuses.length&&statuses.every(x=>x.Dispellable===true))parts.push('Можно рассеять');
   if(statuses.length&&statuses.every(x=>x.Dispellable===false))parts.push('Нельзя рассеять');
   return parts.length?[`<div class="mob-skill-effect"><strong>${esc(effectNames[e.Type]||'Эффект')}${effects.length>1?` · ${esc(targets[e.Object]||e.Object||'')}`:''}</strong><span>${parts.map(esc).join(' · ')}</span></div>`]:[];
  });
  return `<dl class="mob-skill-facts">${facts.map(([name,value])=>`<div><dt>${name}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${rows.length?`<div class="mob-skill-effects">${rows.join('')}</div>`:''}`;
 }
 function showMob(id){
  const original=n=>Number.isFinite(n)?n.toLocaleString('ru-RU',{maximumFractionDigits:20}):'—';
  const rounded=n=>Number.isFinite(n)?Math.floor(n).toLocaleString('ru-RU'):'—';
  const variants=(normal,raw)=>`<span class="mob-value-rounded">${normal}</span><span class="mob-value-original">${raw}</span>`;
  const integer=n=>variants(rounded(n),original(n));
  const decimal=n=>variants(fmt(n),original(n));
  const damageRange=format=>format(m.AttackMin)===format(m.AttackMax)?format(m.AttackMin):`${format(m.AttackMin)}–${format(m.AttackMax)}`;
  const m=index.get(id);if(!m)return;
  const dialog=root.querySelector('#world-mob-dialog');
  const name=presentation.mobs[m.ID]?.name||m.Name?.ru||label(m).replace(/\s+\S+ ур\.$/,'');
  const attackLabel=`${m.Ranged?'Дальний':'Ближний'} бой · ${m.AttackType==='magic'?'магический':'физический'} урон`;
  const groups=[
   ['attack','Атака',[['Урон',variants(damageRange(rounded),damageRange(original))],['Интервал атак',`${decimal(m.AttackInterval/1e9)} с`],['Меткость',m.Accuracy],['Шанс крита',`${integer(m.CriticalHitRate)}%`],['Критический урон',`${integer(m.CriticalHitDamage)}%`]]],
   ['defense','Защита',[['Физическая защита',m.Defense],['Сопротивление',m.Resistance],['Уклонение',m.Evasion]]],
   ['reward','Награда',[['Опыт',m.Experience],['Серебро',m.Silver]]]
  ];
  const minionContent=minions(m.Minions);
  dialog.innerHTML=`<div class="dialog-head mob-detail-head"><div class="mob-detail-title"><img class="mob-detail-attack-icon" src="https://ligmar.io/game/assets/icons/mob-class-${m.AttackType==='magic'?'magic':'physical'}-${m.Ranged?'range':'melee'}.svg" alt="${esc(attackLabel)}" title="${esc(attackLabel)}"><h2>${esc(name)}</h2><span class="mob-detail-level">${integer(m.Level)} ур.</span></div><div class="mob-detail-actions"><button class="icon-button" data-close aria-label="Закрыть">×</button></div></div><div class="mob-detail-body"><div class="mob-detail-portrait"><div class="mob-detail-art">${icon(m)}</div><div class="mob-health-bar" aria-label="Здоровье ${original(m.Health)}, регенерация ${original(m.HealthRegen)}"><strong>${integer(m.Health)}</strong><span class="mob-health-regen" title="Регенерация HP">+${decimal(m.HealthRegen)}</span></div></div><div class="mob-detail-tables">${groups.map(([key,title,rows])=>`<table class="mob-stat-table mob-stat-${key}"><caption>${title}</caption><tbody>${rows.map(([k,v])=>`<tr><th scope="row">${k}</th><td>${typeof v==='number'?integer(v):v}</td></tr>`).join('')}</tbody></table>`).join('')}</div></div>${m.Skills?.length?`<section class="mob-detail-section"><h3>Умения</h3>${m.Skills.map(s=>`<details class="world-skill"><summary>${esc(s.Name?.ru||s.ID)} · ${s.Level} ур.</summary><p>${esc((s.Description?.ru||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,''))}</p>${mobSkillDetails(s)}<small>Каст ${decimal(s.ActivationTime/1e9)} с · откат ${decimal(s.Cooldown/1e9)} с · мана ${integer(s.Mana)}</small></details>`).join('')}</section>`:''}${minionContent?`<section class="mob-detail-section"><h3>Прислужники</h3><div class="world-minions">${minionContent}</div></section>`:''}`;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-mob]').forEach(b=>b.onclick=()=>showMob(b.dataset.mob));if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
 }
 function minions(v){if(!v||(typeof v==='object'&&!Object.keys(v).length))return '';let found=[];const visit=x=>{if(Array.isArray(x))return x.forEach(visit);if(!x||typeof x!=='object')return;const m=resolve(x);if(m){found.push(m);return}Object.values(x).forEach(visit)};visit(v);return found.length?found.map(m=>mobButton(m,undefined,purple)).join(''):`<pre>${esc(JSON.stringify(v,null,2))}</pre>`}
 const locationOrder={location:0,party_dungeon:1,temple:2,guild_dungeon:3};
 const groupNames={location:'Локации',party_dungeon:'Групповые подземелья',temple:'Храм',guild_dungeon:'Гильдейские подземелья'};
 function levelRange(l){
  const all=allMobs(l),regular=all.filter(m=>!['boss','champion','quest'].includes(m.Type));
  const levels=(regular.length?regular:all).map(m=>m.Level).filter(Number.isFinite);
  return levels.length?[Math.min(...levels),Math.max(...levels)]:null;
 }
 function levelLabel(l){const r=levelRange(l);return r?`${r[0]===r[1]?r[0]:r.join('–')} ур.`:'Уровень неизвестен'}
 function draw(){
  hoverAbort.abort();hoverAbort=new AbortController();
  if(location.hash!=='#worlds')return;
  const list=locations.filter(l=>belonging(l)===selectedWorld).sort((a,b)=>(locationOrder[a.Type]??4)-(locationOrder[b.Type]??4)||(levelRange(a)?.[0]??Infinity)-(levelRange(b)?.[0]??Infinity)||a.Name.ru.localeCompare(b.Name.ru,'ru'));
  const selected=list.find(l=>l.ID===selectedLocation);if(!selected)selectedLocation=null;
  root.innerHTML=`<div class="page-title"><div><span class="eyebrow">АТЛАС ЛИГМАРА</span><h1>Миры</h1></div></div><div class="world-switch" role="group" aria-label="Мир атласа">${worlds.map(([id,name])=>`<button data-atlas-world="${id}" aria-pressed="${selectedWorld===id}">${name}</button>`).join('')}</div><div class="world-atlas ${selected?'has-location':''}"><aside class="world-location-list" aria-label="Локации">${list.map((l,i)=>`${i===0||list[i-1].Type!==l.Type?`<h3 class="world-location-group">${groupNames[l.Type]||esc(l.Type)}</h3>`:''}<button class="panel world-location ${l.ID===selectedLocation?'selected':''}" data-location="${l.ID}" style="${presentation.locations[l.ID]?.image?`background-image:linear-gradient(90deg,#171321df,#171321b0),url(&quot;${esc(presentation.locations[l.ID].image)}&quot;)`: ''}" aria-pressed="${l.ID===selectedLocation}"><span class="world-location-symbol" aria-hidden="true">${l.Type==='location'?'⌖':l.Type==='temple'?'✧':'♜'}</span><span><strong>${esc(l.Name.ru)}</strong><span class="world-location-level" title="Диапазон уровней обычных мобов; если их нет — всех противников">${levelLabel(l)}</span><small>${types[l.Type]||esc(l.Type)}${l.LocationType==='dangerous'?' · опасная':''}</small></span><span aria-hidden="true">›</span></button>`).join('')||'<p>В этом мире пока нет локаций.</p>'}</aside>${selected?detail(selected):''}</div><div class="world-hex-tip" hidden aria-label="Противники на гексе"></div><dialog id="world-mob-dialog" class="world-mob-dialog" aria-label="Информация о мобе"></dialog>`;
  root.querySelectorAll('[data-atlas-world]').forEach(b=>b.onclick=()=>{selectedWorld=b.dataset.atlasWorld;selectedLocation=null;draw()});root.querySelectorAll('[data-location]').forEach(b=>b.onclick=()=>{selectedLocation=b.dataset.location;draw()});root.querySelectorAll('[data-mob]').forEach(b=>b.onclick=()=>showMob(b.dataset.mob));root.querySelector('[data-back-locations]')?.addEventListener('click',()=>{selectedLocation=null;draw()});
  bindMapControls();
  bindLegendHighlight();
  if(selected)bindHexHover(selected);
  root.querySelectorAll('[data-hex]').forEach(el=>{const choose=()=>showHex(selected,+el.dataset.hex);el.onclick=choose;el.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose()}}});
 }
 const mobGroups=[['common','Обычные мобы'],['champion','Чемпионы'],['quest','Квестовые противники'],['boss','Боссы']];
 const mobGroup=m=>['champion','quest','boss'].includes(m.Type)?m.Type:'common';
 const compareMobs=(a,b)=>mobGroups.findIndex(g=>g[0]===mobGroup(a))-mobGroups.findIndex(g=>g[0]===mobGroup(b))||a.Level-b.Level||label(a).localeCompare(label(b),'ru');
 const compareImportantMobs=(a,b)=>mobGroups.findIndex(g=>g[0]===mobGroup(b))-mobGroups.findIndex(g=>g[0]===mobGroup(a))||a.Level-b.Level||label(a).localeCompare(label(b),'ru');
 function spawnLabel(l,h,m){
  const waves=(h.Rounds||[]).map(r=>{
   const entries=(r.Mobs||[]).filter(x=>resolve(x.MobTemplate)?.ID===m.ID);if(!entries.length)return null;
   const min=entries.every(x=>Number.isFinite(x.AmountMin))?entries.reduce((n,x)=>n+x.AmountMin,0):null,max=entries.every(x=>Number.isFinite(x.AmountMax))?entries.reduce((n,x)=>n+x.AmountMax,0):null;
   return `${(h.Rounds||[]).length>1?'Волна '+r.Number+': ':''}${min===null||max===null?'количество неизвестно':min===max?min+' шт.':min+'–'+max+' шт.'}`;
  }).filter(Boolean);
  if(scheduledBosses(l,h).some(x=>x.ID===m.ID))waves.push('1 шт. по расписанию');
  return waves.join(' · ');
 }
 function bindHexHover(l){
  const tip=root.querySelector('.world-hex-tip'),svg=root.querySelector('.world-hex-map');if(!tip||!svg)return;
  const ms=allMobs(l).sort(compareMobs);let timer,pinned=null;const releasedClicks=new WeakSet();
  const hide=()=>{clearTimeout(timer);if(!pinned)tip.hidden=true};
  const unpin=()=>{pinned=null;tip.classList.remove('is-pinned');hide()};
  const leave=()=>{clearTimeout(timer);timer=setTimeout(hide,160)};
  const show=el=>{
   if(pinned||svg.classList.contains('is-dragging'))return;clearTimeout(timer);
   const h=l.Hexes[+el.dataset.hex],members=[...new Map([...hexMobs(h).map(x=>[x.mob.ID,x.mob]),...scheduledBosses(l,h).map(m=>[m.ID,m])]).values()].sort((a,b)=>mobGroups.findIndex(g=>g[0]===mobGroup(b))-mobGroups.findIndex(g=>g[0]===mobGroup(a))||a.Level-b.Level||label(a).localeCompare(label(b),'ru'));
   const card=m=>mobButton(m,ms.findIndex(x=>x.ID===m.ID)+1,cellTint(mobColor(l,ms,m),isImportant(m)?0.6:0.4),spawnLabel(l,h,m));
   const hasImportant=members.some(m=>mobGroup(m)!=='common');
   const cards=hasImportant?[...mobGroups].reverse().map(([type,title])=>{const group=members.filter(m=>mobGroup(m)===type);return group.length?`<section class="hex-tip-group"><h5>${title}</h5>${group.map(card).join('')}</section>`:''}).join(''):members.map(card).join('');
   tip.innerHTML=`<h4>Гекс ${h.Index.join(':')}</h4>${cards||'<p class="hint">На клетке нет заданных противников.</p>'}`;
   tip.querySelectorAll('[data-mob]').forEach(b=>b.onclick=()=>{unpin();showMob(b.dataset.mob)});
   tip.hidden=false;const r=el.getBoundingClientRect(),box=tip.getBoundingClientRect();
   tip.style.left=Math.max(8,Math.min(r.right+8,innerWidth-box.width-8))+'px';
   tip.style.top=Math.max(8,Math.min(r.top,innerHeight-box.height-8))+'px';
  };
  svg.querySelectorAll('[data-hex]').forEach(el=>{el.addEventListener('pointerenter',()=>show(el));el.addEventListener('pointerleave',leave);el.addEventListener('focus',()=>show(el));el.addEventListener('blur',leave);el.addEventListener('click',e=>{if(releasedClicks.has(e))return;show(el);pinned=el;clearTimeout(timer);tip.classList.add('is-pinned')})});
  document.addEventListener('click',e=>{if(pinned&&!tip.contains(e.target)){releasedClicks.add(e);unpin()}},{capture:true,signal:hoverAbort.signal});
  tip.onpointerenter=()=>clearTimeout(timer);tip.onpointerleave=leave;tip.onfocusin=()=>clearTimeout(timer);tip.onfocusout=leave;
  svg.addEventListener('pointerdown',hide);svg.addEventListener('wheel',hide,{passive:true});
  root.addEventListener('keydown',e=>{if(e.key==='Escape')unpin()},{signal:hoverAbort.signal});
  window.addEventListener('scroll',e=>{if(!tip.contains(e.target))hide()},{capture:true,signal:hoverAbort.signal});
 }
 function bindMapControls(){
  const svg=root.querySelector('.world-hex-map');if(!svg)return;
  const initial=svg.getAttribute('viewBox').split(/\s+/).map(Number);
  let view=[...initial],zoom=1,drag=null,suppressClick=false;
  const point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())};
  const update=()=>{svg.setAttribute('viewBox',view.join(' '));root.querySelector('[data-map-scale]').textContent=Math.round(zoom*100)+'%';root.querySelector('[data-map-zoom-slider]').value=String(zoom)};
  const scale=(factor,anchor={x:view[0]+view[2]/2,y:view[1]+view[3]/2})=>{const next=Math.max(1,Math.min(5,zoom*factor)),ratio=zoom/next;view=[anchor.x-(anchor.x-view[0])*ratio,anchor.y-(anchor.y-view[1])*ratio,initial[2]/next,initial[3]/next];zoom=next;update()};
  root.querySelector('[data-map-zoom-slider]').oninput=e=>scale(Number(e.target.value)/zoom);
  root.querySelector('[data-map-reset]').onclick=()=>{view=[...initial];zoom=1;update()};
  svg.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();scale(Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*0.002),point(e))},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;suppressClick=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,anchor:point(e),view:[...view],moved:false}});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;if(!drag.moved){drag.moved=true;svg.setPointerCapture(e.pointerId);svg.classList.add('is-dragging')}const p=point(e);view[0]+=drag.anchor.x-p.x;view[1]+=drag.anchor.y-p.y;update()});
  const end=e=>{if(!drag||drag.id!==e.pointerId)return;suppressClick=drag.moved;drag=null;svg.classList.remove('is-dragging');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
  svg.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false}},true);
  update();
 }
 function groupedMobs(ms,color){
  const groups=mobGroups;
  return groups.map(([type,name])=>{
   const members=ms.filter(m=>mobGroup(m)===type);
   return members.length?`<section class="world-mob-group"><h4>${name} <span>${members.length}</span></h4><div class="world-mob-list">${members.map(m=>mobButton(m,ms.findIndex(x=>x.ID===m.ID)+1,color(m))).join('')}</div></section>`:'';
  }).join('');
 }
 const isImportant=m=>['boss','quest','champion'].includes(m.Type);
 function mobColor(l,ms,m){
  if(m.Type==='boss')return '#dfb453';
  if(['quest','champion'].includes(m.Type))return purple;
  const n=ms.findIndex(x=>x.ID===m.ID);
  return l.Name.ru==='Ядовитый улей'?['#72a8ec','#f2a05f'][n%2]:colors[n%colors.length];
 }
 function mobLegend(ms,color){
  return mobGroups.map(([type,title])=>{
   const group=ms.filter(m=>mobGroup(m)===type);if(!group.length)return '';
   return `<section class="map-legend-group"><h4>${title}</h4><div>${group.map(m=>`<button class="map-legend-mob" data-legend-mob="${esc(m.ID)}"><i style="background:${cellTint(color(m),isImportant(m)?0.6:0.4)}"></i>${ms.indexOf(m)+1}. ${esc(label(m))}</button>`).join('')}</div></section>`;
  }).join('');
 }
 function bindLegendHighlight(){
  const cells=[...root.querySelectorAll('[data-cell-mobs]')];let hovered=null,focused=null;
  const update=()=>{const id=hovered||focused;root.querySelector('.world-hex-map')?.classList.toggle('without-mob-colors',!mapColors);for(const cell of cells){const active=!!id&&cell.dataset.cellMobs.split(' ').includes(id);cell.classList.toggle('legend-highlight',active);cell.querySelectorAll('[data-fill-normal]').forEach(p=>p.setAttribute('fill',active?p.dataset.fillHighlight:mapColors?p.dataset.fillNormal:(p.dataset.fillNeutral||'#2e2e3d')))}};
  const toggle=root.querySelector('[data-map-colors]');if(toggle)toggle.onchange=()=>{mapColors=toggle.checked;update()};
  update();
  root.querySelectorAll('[data-legend-mob]').forEach(b=>{
   b.onpointerenter=()=>{hovered=b.dataset.legendMob;update()};b.onpointerleave=()=>{hovered=null;update()};
   b.onfocus=()=>{focused=b.dataset.legendMob;update()};b.onblur=()=>{focused=null;update()};
  });
 }
 function detail(l){
  const ms=allMobs(l).sort(compareMobs),color=m=>mobColor(l,ms,m);
  const keeper=resolve(l.LocationKeeper);
  return `<section class="world-location-detail"><div class="panel world-description"><button class="text-button" data-back-locations>← Все локации</button><h2>${esc(l.Name.ru)}</h2><p>${types[l.Type]||esc(l.Type)} · ${worlds.find(w=>w[0]===selectedWorld)[1]}${l.NeedLevel?' · вход с '+l.NeedLevel+' уровня':''}. ${ms.length} типов противников${keeper?', хранитель '+keeper.Level+' уровня':''}.</p>${presentation.locations[l.ID]?.image?`<img class="world-location-art" src="${esc(presentation.locations[l.ID].image)}" alt="${esc(l.Name.ru)}" referrerpolicy="no-referrer">`:''}${presentation.locations[l.ID]?.description?`<p class="world-location-lore">${esc(presentation.locations[l.ID].description.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,''))}</p>`:''}</div><section class="panel world-map-panel"><div class="world-map-toolbar"><h3>Карта</h3><div class="world-map-controls"><label class="map-colors-toggle"><input type="checkbox" data-map-colors ${mapColors?'checked':''}> Цвета мобов</label><output data-map-scale aria-label="Масштаб карты">100%</output><button data-map-reset>Сбросить</button></div></div><p class="hint">Ползунок справа или щипок на тачпаде — масштаб, перетаскивание — перемещение. Клик закрепляет карточку гекса; клик вне карточки снимает закрепление. На клетках — координаты. Сектора обозначают виды мобов, увеличенные сектора — чемпионов и боссов. Наведите курсор, чтобы увидеть противников.</p>${`<div class="world-map-viewport">${map(l,ms,color)}<div class="world-map-zoom-rail"><span aria-hidden="true">+</span><input type="range" data-map-zoom-slider min="1" max="5" step="0.01" value="1" aria-label="Масштаб карты" aria-orientation="vertical"><span aria-hidden="true">−</span></div></div>`}<div class="world-map-legend">${mobLegend(ms,color)}<span><img src="https://ligmar.io/game/assets/icons/mob-type-boss.svg" width="16" height="16" alt="" style="vertical-align:middle"> Босс / место появления</span><span><i style="background:#29283b"></i>Одиночный босс / выход</span><span><img src="https://ligmar.io/game/assets/icons/event-exit.svg" width="16" height="16" alt="" style="vertical-align:middle"> Выход · 0:0</span><span><i style="background:#353648"></i>Мирная клетка</span><span><i style="background:${cellTint(purple,0.6)}"></i>Квестовые / чемпионы</span></div><div id="world-hex-info" aria-live="polite"><p class="hint">Выберите гекс на карте.</p></div></section><section class="panel world-mobs-panel"><h3>Противники</h3>${groupedMobs(ms,color)}</section></section>`;
 }
 function scheduledBosses(l,h){return [...new Map((l.BossSpawnSchedules||[]).filter(s=>s.BattleHexIndex?.[0]===h.Index[0]&&s.BattleHexIndex?.[1]===h.Index[1]).map(s=>resolve(s.MobTemplate)).filter(Boolean).map(m=>[m.ID,m])).values()]}
 const originalCellColors=['#58b8ad','#e3aa54','#5d9ee3','#dc798d','#9bb95e'];
 const cellTint=(color,strength=0.4)=>{
  const original=color===purple?'#b179ed':originalCellColors[colors.indexOf(color)]||color;
  return '#'+[0,2,4].map((offset,i)=>{
   const current=Math.round([43,42,59][i]*0.88+parseInt(color.slice(1+offset,3+offset),16)*0.12);
   return Math.round(current*(1-strength)+parseInt(original.slice(1+offset,3+offset),16)*strength).toString(16).padStart(2,'0');
  }).join('');
 };
 function map(l,ms,color){
  const hexes=l.Hexes||[];if(!hexes.length)return '<p>Карта отсутствует.</p>';
  // Index = [row, column]; odd rows shift right, including negative rows.
  const size=17,points=hexes.map(({Index:[row,column]})=>({x:Math.sqrt(3)*size*(column+Math.abs(row%2)/2),y:1.5*size*row}));
  const minX=Math.min(...points.map(p=>p.x))-size-4,minY=Math.min(...points.map(p=>p.y))-size-4,width=Math.max(...points.map(p=>p.x))-minX+size+4,height=Math.max(...points.map(p=>p.y))-minY+size+4;
  return `<svg class="world-hex-map" viewBox="${minX} ${minY} ${width} ${height}" role="group" aria-label="Гексовая карта ${esc(l.Name.ru)}"><defs><filter id="map-champion-red" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 .95 0 0 0 0 .25 0 0 0 0 .28 0 0 0 1 0"/></filter></defs>${hexes.map((h,i)=>{
   const p=points[i],m=[...new Map([...hexMobs(h).map(x=>[x.mob.ID,x.mob]),...scheduledBosses(l,h).map(m=>[m.ID,m])]).values()].sort(compareImportantMobs);
   const polygon=Array.from({length:6},(_,j)=>{const a=(60*j-30)*Math.PI/180;return `${p.x+(size-1)*Math.cos(a)},${p.y+(size-1)*Math.sin(a)}`}).join(' ');
   const isExit=h.Index[0]===0&&h.Index[1]===0,special=x=>['boss','quest','champion'].includes(x.Type);
   const fill=(isExit||(m.length===1&&m[0].Type==='boss'))?'#29283b':m.length?cellTint(color(m[0]),special(m[0])?0.6:0.4):h.Type==='peace'?'#353648':h.Type==='border'?'#3d3e49':'#2e2e3d';
   if(h.Type==='border'&&!m.length&&!isExit)return `<polygon points="${polygon}" fill="${fill}" aria-hidden="true"/>`;
   let sectors='';
   if(m.length>1){
    const weights=m.map(x=>special(x)?2:1),total=weights.reduce((a,b)=>a+b,0),radius=size*2;let angle=-Math.PI/2-(m.some(special)?Math.PI*weights[0]/total:0);
    sectors=`<defs><clipPath id="hex-clip-${i}"><polygon points="${polygon}"/></clipPath></defs><g clip-path="url(#hex-clip-${i})" style="pointer-events:none">`+m.map((x,j)=>{
     const next=angle+2*Math.PI*weights[j]/total;
     const path=`M ${p.x} ${p.y} L ${p.x+radius*Math.cos(angle)} ${p.y+radius*Math.sin(angle)} A ${radius} ${radius} 0 ${next-angle>Math.PI?1:0} 1 ${p.x+radius*Math.cos(next)} ${p.y+radius*Math.sin(next)} Z`;
     angle=next;return `<path d="${path}" fill="${cellTint(color(x),special(x)?0.6:0.4)}" data-fill-normal="${cellTint(color(x),special(x)?0.6:0.4)}" data-fill-neutral="${isExit||m.some(x=>x.Type==='boss')?'#29283b':'#2e2e3d'}" data-fill-highlight="${cellTint(color(x),0.8)}"/>`;
    }).join('')+'</g>';
   }
   const crowded=l.LocationType==='dangerous'&&(h.Rounds||[]).some(r=>(r.Mobs||[]).reduce((sum,x)=>sum+(x.AmountMin||0),0)>=4);
   const markers=[];
   if(isExit)markers.push(['event-exit','Выход']);
   if(m.some(x=>x.Type==='boss'))markers.push(['mob-type-boss','Босс']);
   if(m.some(x=>x.Type==='quest'))markers.push(['mob-type-champion-quest','Квестовый чемпион']);
   if(m.some(x=>x.Type==='champion'))markers.push(['mob-type-champion','Чемпион']);
   if(crowded)markers.push(['mob-type-champion','Группа из 4 и более мобов',true]);
   const markerMarkup=markers.map(([file,title,red],j)=>{const x=p.x+(j-(markers.length-1)/2)*12;return `<g style="pointer-events:none"><title>${title}</title><circle cx="${x}" cy="${p.y}" r="7" fill="#29283b"/><image href="https://ligmar.io/game/assets/icons/${file}.svg" x="${x-6}" y="${p.y-6}" width="12" height="12"${red?' filter="url(#map-champion-red)"':''}/></g>`}).join('');
   return `<g data-hex="${i}" data-cell-mobs="${m.map(x=>esc(x.ID)).join(' ')}" role="button" tabindex="0" aria-label="Гекс ${h.Index.join(', ')}: ${esc(m.map(label).join(', ')||h.Type)}"><polygon points="${polygon}" fill="${fill}" data-fill-normal="${fill}" data-fill-neutral="${isExit||m.some(x=>x.Type==='boss')?'#29283b':h.Type==='peace'?'#353648':'#2e2e3d'}" data-fill-highlight="${m.length?cellTint(color(m[0]),0.8):fill}"/>${sectors}<polygon points="${polygon}" fill="none" style="pointer-events:none"/>${markerMarkup}<text class="world-hex-coordinates" style="fill:${markers.length?'#bdb5cc':m.length?color(m[0]):'#9793a5'}" x="${p.x}" y="${p.y+(markers.length?12:2)}">${h.Index.join(':')}</text></g>`;
  }).join('')}</svg>`;
 }
 function showHex(l,i){const h=l.Hexes[i],box=root.querySelector('#world-hex-info');root.querySelectorAll('[data-hex]').forEach(e=>e.classList.toggle('selected',+e.dataset.hex===i));box.innerHTML=`<h4>Гекс ${h.Index.join(', ')}</h4>${(h.Rounds||[]).map(round=>`<div class="world-wave"><strong>Волна ${round.Number}</strong>${(round.Mobs||[]).map(x=>{const m=resolve(x.MobTemplate);return m?`<button class="secondary" data-mob="${m.ID}">${esc(label(m))} · ${x.AmountMin===x.AmountMax?x.AmountMin:x.AmountMin+'–'+x.AmountMax} шт.</button>`:'<p>Нет данных моба.</p>'}).join('')}</div>`).join('')||'<p class="hint">Противники не заданы.</p>'}${scheduledBosses(l,h).length?`<div class="world-wave"><strong>Босс по расписанию</strong>${scheduledBosses(l,h).map(m=>mobButton(m,undefined,'#e3aa54')).join('')}</div>`:''}${h.Event?`<p>Событие: ${esc(h.Event)} ${esc(h.EventSubtype)}</p>`:''}`;box.querySelectorAll('[data-mob]').forEach(b=>b.onclick=()=>showMob(b.dataset.mob))}
 draw();
}
