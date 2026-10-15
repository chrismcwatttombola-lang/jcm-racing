'use strict';
(()=>{
 const date=document.getElementById('date'),panel=document.getElementById('jcm-official-panel');
 if(!date||!panel)return;
 const day='2026-10-15';
 if(![...date.options].some(o=>o.value===day))date.add(new Option('15th Oct-26',day));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let rows=[],details=[],state='loading';
 const view=r=>typeof window.jcmResearchResultView==='function'?window.jcmResearchResultView(r):{css:'pending',label:'Pending'};
 function render(){
  if(date.value!==day)return;
  const settled=rows.filter(r=>['win','loss'].includes(view(r).css)),wins=settled.filter(r=>view(r).css==='win').length;
  const rate=state==='error'?'Results unavailable':settled.length?Math.round(wins/settled.length*1000)/10+'% success · '+wins+'/'+settled.length+' settled':'No settled results';
  const tile=document.getElementById('jcm-daily-rate');if(tile)tile.textContent='Today · '+rate;
  panel.innerHTML='<div class="jcm-panel-heading"><h2>Daily picks</h2><span class="jcm-accuracy">'+esc(rate)+'</span></div>'+(state==='error'?'<p role="status">15 October research data unavailable.</p>':state==='loading'?'<p role="status">Loading today’s horses…</p>':rows.map((r,i)=>'<button type="button" class="jcm-row jcm-research-row jcm-rating-unrated" data-manual-index="'+i+'"><span><span class="jcm-time">'+esc(r.off_time_uk)+'</span><span class="jcm-ground">'+esc(r.course)+'</span></span><span class="jcm-horse">'+esc(r.horse)+'</span><span class="jcm-status '+view(r).css+'">'+esc(view(r).label)+'</span></button>').join(''));
 }
 async function load(){
  try{
   const response=await fetch('data/manual-research-2026-10-15.json',{cache:'no-store'});if(!response.ok)throw Error('unavailable');
   const d=await response.json();
   if(d.date!==day||d.mode!=='manual_pre_race_research'||!Array.isArray(d.selections)||d.selections.length<1||d.selections.some(r=>r.race_date!==day||!r.race_id||!r.horse||!r.course||!r.reason))throw Error('invalid');
   rows=d.selections.map(r=>({...r,identified_challengers:[],selection_reason:{summary:r.reason,counterargument:r.counterargument,evidence_status:'ORIGINAL_SCREENSHOT_ANALYSIS'}}));
  }catch{state='error';render();return;}
  try{
   const response=await fetch('data/result-card-details-'+day+'.json',{cache:'no-store'});if(!response.ok)throw Error('unavailable');const d=await response.json();
   if(d.schema_version===1&&d.date===day&&Array.isArray(d.details))details=d.details;
  }catch{details=[];}
  state='ready';render();
 }
 panel.addEventListener('click',e=>{
  if(date.value!==day)return;const button=e.target.closest('[data-manual-index]');if(!button)return;
  const r=rows[Number(button.dataset.manualIndex)];if(!r)return;
  const matches=details.filter(m=>m.date===r.race_date&&m.off_time_uk===r.off_time_uk&&m.course===r.course&&m.horse===r.horse&&m.race_id===r.race_id);
  window.jcmShowResearchCard(r,matches.length===1?matches[0]:null);
 });
 date.addEventListener('change',render);render();load();
})();
