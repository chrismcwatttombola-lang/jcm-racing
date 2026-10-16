'use strict';
(()=>{
 const date=document.getElementById('date'),panel=document.getElementById('jcm-official-panel');
 if(!date||!panel)return;
 const day='2026-10-16';
 if(![...date.options].some(o=>o.value===day))date.add(new Option('16th Oct-26',day));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[],loaded=false;
 function render(){
  if(date.value!==day)return;
  const tile=document.getElementById('jcm-daily-rate');if(tile)tile.textContent='Today · '+rows.length+' selection · pending';
  panel.innerHTML='<div class="jcm-panel-heading"><h2>Daily picks</h2><span class="jcm-accuracy">1 selection · pending</span></div>'+
   (!loaded?'<p role="status">Loading selection…</p>':rows.map((r,i)=>'<button type="button" class="jcm-row jcm-research-row jcm-rating-unrated" data-oct16-index="'+i+'"><span><span class="jcm-time">'+esc(r.off_time_uk)+'</span><span class="jcm-ground">'+esc(r.course)+'</span></span><span class="jcm-horse">'+esc(r.horse)+'</span><span class="jcm-status pending">PENDING</span></button>').join(''));
 }
 async function load(){
  try{
   const response=await fetch('data/manual-research-2026-10-16.json',{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const d=await response.json();
   if(d.date!==day||!Array.isArray(d.selections))throw Error('Invalid day');
   rows=d.selections.map(r=>({...r,selection_reason:{summary:r.reason,counterargument:r.counterargument,evidence_status:'RACING_API_AND_USER_ASSESSMENT'},identified_challengers:[]}));
   loaded=true;
  }catch{loaded=true;rows=[];}
  render();
 }
 panel.addEventListener('click',e=>{
  if(date.value!==day)return;
  const button=e.target.closest('[data-oct16-index]');if(!button)return;
  const r=rows[Number(button.dataset.oct16Index)];if(!r)return;
  if(typeof window.jcmShowResearchCard==='function')window.jcmShowResearchCard(r,r);
 });
 date.addEventListener('change',render);
 render();load();
})();
