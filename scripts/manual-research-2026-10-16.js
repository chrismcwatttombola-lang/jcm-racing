'use strict';
(()=>{
 const date=document.getElementById('date'),panel=document.getElementById('jcm-official-panel');
 if(!date||!panel)return;
 const day='2026-10-16';
 if(![...date.options].some(o=>o.value===day))date.add(new Option('16th Oct-26',day));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[],details=[],loaded=false,failed=false;
 const view=r=>typeof window.jcmResearchResultView==='function'?window.jcmResearchResultView(r):{css:'pending',label:'Pending'};
 function render(){
  if(date.value!==day)return;
  const settled=rows.filter(r=>['win','loss'].includes(view(r).css)),wins=settled.filter(r=>view(r).css==='win').length;
  const rate=failed?'Results unavailable':settled.length?Math.round(wins/settled.length*1000)/10+'% success · '+wins+'/'+settled.length+' settled':'No settled results';
  const tile=document.getElementById('jcm-daily-rate');if(tile)tile.textContent='Today · '+rate;
  panel.innerHTML='<div class="jcm-panel-heading"><h2>Daily picks</h2><span class="jcm-accuracy">'+esc(rate)+'</span></div>'+
   (!loaded?'<p role="status">Loading selection…</p>':failed?'<p role="status">Results unavailable.</p>':rows.map((r,i)=>'<button type="button" class="jcm-row jcm-research-row jcm-rating-unrated" data-oct16-index="'+i+'"><span><span class="jcm-time">'+esc(r.off_time_uk)+'</span><span class="jcm-ground">'+esc(r.course)+'</span></span><span class="jcm-horse">'+esc(r.horse)+'</span><span class="jcm-status '+view(r).css+'">'+esc(view(r).label)+'</span></button>').join(''));
 }
 async function load(){
  try{
   const response=await fetch('data/manual-research-2026-10-16.json',{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const d=await response.json();
   if(d.date!==day||!Array.isArray(d.selections))throw Error('Invalid day');
   rows=d.selections.map(r=>({...r,selection_reason:{summary:r.reason,counterargument:r.counterargument,evidence_status:'RACING_API_AND_USER_ASSESSMENT'},identified_challengers:[]}));
   loaded=true;
  }catch{loaded=true;failed=true;rows=[];}
  try{
   const response=await fetch('data/result-card-details-'+day+'.json',{cache:'no-store'});
   if(response.ok){const d=await response.json();if(d.date===day&&Array.isArray(d.details))details=d.details;}
  }catch{details=[];}
  render();
 }
 panel.addEventListener('click',e=>{
  if(date.value!==day)return;
  const button=e.target.closest('[data-oct16-index]');if(!button)return;
  const r=rows[Number(button.dataset.oct16Index)];if(!r)return;
  const matches=details.filter(m=>m.race_id===r.race_id&&m.horse_id===r.horse_id&&m.horse===r.horse);
  if(typeof window.jcmShowResearchCard==='function')window.jcmShowResearchCard(r,matches.length===1?matches[0]:r);
 });
 date.addEventListener('change',render);
 render();load();
})();
