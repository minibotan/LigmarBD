import rules from '../data/enhancement.json?v=2' with {type:'json'};
export {rules};
export const methods={ordinary:'Кристалл улучшения',risk:'Риск',harmony:'Гармония',fortitude:'Стойкость',essence:'Эссенция'};
export function essenceCosts(price,{extraction=[],fortitude=Infinity}={}){
 const costs=[0,price];
 for(let n=2;n<=12;n++){
  const variants=[rules.recipes[n].reduce((sum,[level,count])=>sum+costs[level]*count,0)];
  const alternative=rules.alternativeRecipes?.[n];
  if(alternative)variants.push(alternative.reduce((sum,ingredient)=>sum+(ingredient.type==='essence'?costs[ingredient.level]*ingredient.count:fortitude*ingredient.count),0));
  if(Number.isFinite(extraction[n]))variants.push(extraction[n]);
  costs[n]=Math.min(...variants);
 }
 return costs
}
export function chance(level,method){return (method==='essence'?100:method==='fortitude'?rules.fortitudeChances[level]:rules.ordinaryChances[level]+(method==='risk'?15:method==='harmony'?3.5:0))/100}
function calculate(prices,weapon,method,essence){
 const available=Object.keys(methods),totals=[0],steps=[],estimates=[false];
 for(let i=0;i<12;i++){
  const candidates=available.filter(k=>method==='optimal'||method===k).map(k=>{
   const p=chance(i,k),failure=k==='harmony'?Math.max(0,i-1):k==='fortitude'?i:0;
   const attempt=prices.ordinary*(weapon?2:1)+(k==='ordinary'?0:k==='essence'?essence[i+1]:prices[k]);
   const recovery=p===1?0:totals[i]-totals[failure];
   const estimated=(k==='fortitude'&&i>=10)||(p<1&&steps.slice(failure,i).some(s=>s.estimated));
   return {method:k,chance:p,attempt,cost:(attempt+(1-p)*recovery)/p,estimated};
  }).sort((a,b)=>a.cost-b.cost);
  const best=candidates[0];steps.push({...best,level:i+1,candidates});totals.push(totals[i]+best.cost);estimates.push(estimates[i]||best.estimated);
 }
 return {steps,totals,essence,estimates};
}
export function enhancementCosts(prices,weapon=false,method='optimal',{essenceRoutes=false,extractionItemCost=2400}={}){
 if(Object.keys(rules.prices).some(k=>!Number.isFinite(prices[k])||prices[k]<0))throw Error('Цены должны быть неотрицательными числами');
 const crafted=essenceCosts(prices.essence,{fortitude:prices.fortitude});
 if(!essenceRoutes)return calculate(prices,weapon,method,crafted);
 if(!Number.isFinite(extractionItemCost)||extractionItemCost<0)throw Error('Цена предмета для извлечения должна быть неотрицательной');
 const donor=calculate(prices,false,'optimal',crafted),extraction=[];
 for(let level=2;level<=10;level++)extraction[level]=donor.totals[level+2]+extractionItemCost;
 const essence=essenceCosts(prices.essence,{extraction,fortitude:prices.fortitude});
 return calculate(prices,weapon,method,essence);
}
