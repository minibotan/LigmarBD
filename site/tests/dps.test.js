import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,calculate} from '../dist/model.js';
import {makePreset} from '../dist/presets.js';
import {simulateRotation} from '../dist/dps.js';
const items=JSON.parse(fs.readFileSync(new URL('../dist/data/library.json',import.meta.url))).blueprints;
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/data/skills.json',import.meta.url)));
const target={id:'one',name:'Цель 1',level:55,defense:1000,resistance:2000,evasion:0};
const mage=makePreset({...fresh(),level:55},items,'mage_pve','high');
const skill=(cls,name)=>catalog[cls].find(s=>s.name===name);
const step=(name,level=10,cls='mage',extra={})=>({kind:'skill',skillId:skill(cls,name).id,level,targetId:'one',...extra});
const run=(steps,targets=[target],options={mode:'normal'},build=mage)=>simulateRotation(build,items,catalog,steps,targets,options);
test('cast uses VA, cooldown starts after completion and wait fixes the rotation',()=>{
 const cast=step('Магическая стрела');const first=run([cast]);const row=first.rows[0];
 assert.equal(row.end,2.3*calculate(mage,items).activation/100);
 assert.equal(row.cooldown,2.2);
 const bad=run([cast,cast]);assert.match(bad.rows[1].errors.join(' '),/Откат/);assert.equal(bad.dps,null);
 const good=run([cast,{kind:'wait',seconds:2.2},cast]);assert.equal(good.rows[2].errors.length,0);assert.ok(good.dps>0);
});
test('damage separates base, gear, critical expectation and resistance using attacker level',()=>{
 const stats=calculate(mage,items),gear=stats.gear,g=(gear.magicAttackMin+gear.magicAttackMax)/2+(gear.magicAttack||0);
 const raw=(stats.attack[0]+stats.attack[1])/2+1380+g;
 const armor=1-2000/(40*55+2000-25);
 const normal=run([step('Магическая стрела')]);assert.ok(Math.abs(normal.total-raw*armor)<1e-8);
 const expected=run([step('Магическая стрела')],[{...target,level:1,evasion:100000}],{mode:'expected'});
 assert.ok(Math.abs(expected.total-normal.total*(1+stats.crit/100))<1e-8);
 assert.ok(Math.abs(normal.rows[0].breakdown[0].before-raw)<1e-8);
});
test('AoE reports each configured target with its own resistance',()=>{
 const targets=[target,{...target,id:'two',name:'Цель 2',resistance:0}];
 const result=run([step('Сверхновая',4,'mage',{targetCount:2})],targets);
 assert.equal(result.rows[0].breakdown.length,2);
 assert.ok(result.rows[0].breakdown[1].after>result.rows[0].breakdown[0].after);
 assert.ok(Math.abs(result.total-result.rows[0].breakdown.reduce((n,t)=>n+t.after,0))<1e-8);
});
test('DOT updates truncate old ticks; tail DPS and during-cast damage use separate horizons',()=>{
 const dot=step('Морозная чума',8),single=run([dot]);
 assert.equal(single.tailEnd,single.end+14);assert.ok(single.total>single.during);
 const double=run([dot,{kind:'wait',seconds:single.rows[0].cooldown},dot]);
 assert.ok(double.rows[0].total<single.total);
 assert.match(double.rows[2].warnings.join(' '),/DOT заменяет/);
});
test('uncertain DOT application retains weighted old ticks after a possible miss',()=>{
 const archer=makePreset({...fresh('archer'),level:55},items,'archer','high');
 const dot=step('Клык змеи',4,'archer');const accuracy=calculate(archer,items).accuracy;
 const enemy={...target,evasion:2*accuracy};const single=run([dot],[enemy],{mode:'expected'},archer);
 const repeated=run([dot,{kind:'wait',seconds:single.rows[0].cooldown},dot],[enemy],{mode:'expected'},archer);
 const normalRepeated=run([dot,{kind:'wait',seconds:single.rows[0].cooldown},dot],[{...enemy,evasion:0}],{mode:'expected'},archer);
 assert.ok(repeated.rows[0].total>normalRepeated.rows[0].total*.5);
});
test('unknown rank blocks timing and final DPS rather than fabricating zero damage',()=>{
 const result=run([step('Магическая стрела',1),step('Магическая стрела')]);
 assert.equal(result.rows[0].total,null);assert.equal(result.rows[1].end,null);assert.equal(result.dps,null);
});
test('saved characters can cast only learned skills',()=>{
 const result=run([step('Магическая стрела')],[target],{mode:'normal',learnedOnly:true},{...mage,skills:{}});
 assert.match(result.rows[0].errors.join(' '),/не изучено/);
});
test('exclusive mage buffs warn and suppress a misleading exact DPS',()=>{
 const result=run([step('Каменная кожа',9),step('Магический барьер',9)]);
 assert.match(result.rows[1].warnings.join(' '),/Несовместимо/);assert.equal(result.complete,false);
});
test('barrage first volley uses VA; additional volleys take three seconds each',()=>{
 const first=run([step('Чародейский обстрел',5)]);
 const repeated=run([{...step('Чародейский обстрел',5),volleys:2}]);
 assert.ok(first.total>0);
 assert.equal(first.end,1.2*calculate(mage,items).activation/100);
 assert.ok(Math.abs(repeated.end-first.end-6)<1e-8);
 assert.ok(Math.abs(repeated.total-first.total*3)<1e-8);
 assert.equal(repeated.rows.length,1);
 assert.equal(repeated.rows[0].cooldown,20.7);
 const withWait=run([{...step('Чародейский обстрел',5),volleys:1},{kind:'wait',seconds:20.7},step('Чародейский обстрел',5)]);
 assert.equal(withWait.rows[2].errors.length,0);
});
test('autoattack count uses weapon interval and running defaults to 0.3 seconds',()=>{
 const build=fresh('warrior'),attack={kind:'skill',skillId:'autoattack-warrior',level:1};
 const first=run([attack],[target],{mode:'normal'},build);
 const many=run([{...attack,hits:4},{kind:'run'}],[target],{mode:'normal'},build);
 assert.equal(first.end,1);
 assert.equal(many.end,4.3);
 assert.equal(many.rows[0].cast,4);
 assert.equal(many.rows[1].name,'Бег');
 assert.ok(Math.abs(many.total-first.total*4)<1e-8);
 assert.equal(many.rows.length,2);
});

test('close targeting filters range and visibility; group ignores both and manual count',()=>{
 const targets=[{...target,range:'melee',visible:true},{...target,id:'hidden',range:'melee',visible:false},{...target,id:'far',range:'ranged',visible:true}];
 const area=run([step('Сверхновая',4,'mage',{targetId:''})],targets,{mode:'normal',allVisible:false});
 assert.deepEqual(area.rows[0].targets.map(t=>t.id),['one']);
 const visible=run([step('Сверхновая',4,'mage',{targetId:''})],targets,{mode:'normal',allVisible:true});
 assert.equal(visible.rows[0].targets.length,2);
 const group=run([step('Ледяной шквал',8,'mage',{targetCount:1})],targets,{mode:'normal',allVisible:false});
 assert.equal(group.rows[0].targets.length,3);
});
test('root, stun and taunt temporarily make ranged targets close, using individual effect duration',()=>{
 for(const family of ['root','stun','taunt']){
  const rank={castMs:0,cooldownMs:0,requiredLevel:1,weapons:[],damage:[],effects:[{family,seconds:2,chance:1,label:family},{family:'other',seconds:20,chance:1,label:'other'}]};
  const control={id:'control',name:'Control',type:'curse',maxLevel:1,targets:['target'],ranks:{1:rank}};
  const area={id:'area',name:'Area',type:'attack',maxLevel:1,targets:['close'],ranks:{1:{...rank,effects:[],damage:[{type:'magic',base:1,gear:0,flat:0,duration:0}]}}};
  const cast=id=>({kind:'skill',skillId:id,level:1,targetId:id==='area'?'':'one'});
  const result=simulateRotation(mage,items,{mage:[control,area]},[cast('control'),cast('area'),{kind:'wait',seconds:2},cast('area')],[{...target,range:'ranged'}],{mode:'normal'});
  assert.equal(result.rows[1].targets.length,1,family);
  assert.equal(result.rows[3].targets.length,0,family);
  assert.equal(result.rows[3].total,0);
 }
});

test('run cooldown is three seconds after end and rejected runs do not reset it',()=>{
 const result=run([{kind:'run',seconds:0.3},{kind:'run',seconds:0.3},{kind:'wait',seconds:2.7},{kind:'run',seconds:0.3}]);
 assert.equal(result.rows[0].cooldown,3);
 assert.match(result.rows[1].errors.join(' '),/откате/);
 assert.deepEqual(result.rows[3].errors,[]);
});
test('selected ranged enemy is hit by close skills even without an enemy target',()=>{
 const result=run([step('Сверхновая',4)],[{...target,range:'ranged',enemyTarget:'none'}],{mode:'normal',allVisible:false});
 assert.equal(result.rows[0].targets.length,1);
});
test('running drops only immobilized enemies targeting hero; search waits for control end',()=>{
 for(const family of ['root','stun','sleep']){
  const cc={id:'cc',name:'Control',maxLevel:1,type:'curse',targets:['party'],ranks:{1:{castMs:0,cooldownMs:0,effects:[{family,seconds:2,chance:1,label:family}],damage:[],weapons:[]}}};
  const targets=[{...target,range:'ranged',enemyTarget:'hero'},{...target,id:'ally',range:'melee',enemyTarget:'ally'},{...target,id:'melee',range:'melee',enemyTarget:'hero'}];
  const result=simulateRotation(mage,items,{mage:[cc]},[{kind:'skill',skillId:'cc',level:1},{kind:'run',seconds:0.3},{kind:'wait',seconds:2.5},{kind:'wait',seconds:0.7}],targets,{mode:'normal',allVisible:false});
  assert.deepEqual(result.rows[1].enemyStates.map(t=>t.target),['none','ally','none']);
  assert.deepEqual(result.rows[2].enemyStates.map(t=>t.target),['hero','ally','none']);
  assert.deepEqual(result.rows[3].enemyStates.map(t=>t.target),['hero','ally','hero']);
 }
});


test('root then slow then run delays reacquisition; expired, replaced and self slows handled',()=>{
 const make=(id,effects)=>({id,name:id,type:'curse',maxLevel:1,targets:['target'],ranks:{1:{castMs:0,cooldownMs:0,effects,damage:[],weapons:[]}}});
 const root=make('root',[{family:'root',seconds:2,chance:1,label:'root'}]);
 const slow=(percent,seconds=10,recipient='target')=>make('slow',[{family:'slow',seconds,chance:1,slowPercent:percent,recipient,label:'slow'}]);
 const cast=id=>({kind:'skill',skillId:id,level:1,targetId:'one'});
 const simulate=(effect,extra=[])=>simulateRotation(mage,items,{mage:[root,effect,...extra]},[cast('root'),cast('slow'),...extra.map(s=>cast(s.id)),{kind:'run',seconds:0.3},{kind:'wait',seconds:2.5},{kind:'wait',seconds:0.8}],[{...target,range:'ranged',speed:99}],{mode:'normal'});
 const delayed=simulate(slow(50));
 assert.equal(delayed.rows[3].enemyStates[0].searchAt,3.6);
 assert.equal(delayed.rows[3].enemyStates[0].target,'none');
 assert.equal(delayed.rows[4].enemyStates[0].target,'hero');
 for(const effect of [slow(50,1),slow(50,10,'self')])assert.equal(simulate(effect).rows[3].enemyStates[0].target,'hero');
 const replacement=slow(20);replacement.id='replace';
 assert.equal(simulate(slow(50),[replacement]).rows[4].enemyStates[0].searchAt,3);
});
