let pinned=false,held=false;
export const detailsEnabled=()=>pinned||held;
export function initDetailsMode(){
 const button=document.getElementById('details-mode');
 try{pinned=localStorage.getItem('ligmarbd.details')==='true'}catch{}
 const update=()=>{
  const enabled=detailsEnabled();
  document.documentElement.classList.toggle('show-stat-formulas',enabled);
  document.documentElement.classList.toggle('dps-alt',enabled);
  button.setAttribute('aria-pressed',String(pinned));
  window.dispatchEvent(new CustomEvent('details-mode-change',{detail:enabled}));
 };
 button.onclick=()=>{pinned=!pinned;try{localStorage.setItem('ligmarbd.details',String(pinned))}catch{}update()};
 window.addEventListener('keydown',e=>{if(e.key==='Shift'&&!e.repeat){held=true;update()}});
 window.addEventListener('keyup',e=>{if(e.key==='Shift'){held=false;update()}});
 window.addEventListener('blur',()=>{held=false;update()});
 update();
}
