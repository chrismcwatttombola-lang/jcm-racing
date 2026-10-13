/* JCM Test 1 — local, paper-only market movement comparison. No API or execution claims. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n):'—';
const key='jcm-test1-paper-v1';let data={date:new Date().toLocaleDateString('en-CA'),liability:500,backStake:500,commission:0,rows:[]};
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Array.isArray(saved.rows))data={...data,...saved};}catch(_){}
const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));}catch(_){message('Browser storage unavailable: changes may not persist.');}};
const modal=document.createElement('div');modal.className='jcm-test1-overlay';modal.hidden=true;modal.innerHTML='<section class="jcm-test1-panel" role="dialog" aria-modal="true" aria-label="Test 1 paper market tracker"><button type="button" class="jcm-test1-close" aria-label="Close Test 1">×</button><h2>Test 1</h2><p class="jcm-test1-sub">Market Movement · research-only paper simulation</p><div class="jcm-test1-controls"><label>Date<input id="t1-date" type="date"></label><label>Lay liability (£)<input id="t1-liability" type="number" min="0.01" step="0.01"></label><label>Later back stake (£)<input id="t1-stake" type="number" min="0.01" step="0.01"></label><label>Commission (%)<input id="t1-commission" type="number" min="0" max="100" step="0.1"></label></div><p class="jcm-test1-help">Strategy A: morning lay + later back for every priced horse. Strategy B: morning lay + later back only if the lay price drifts; otherwise lay only. Later BACK execution price is entered separately. No bet is placed.</p><div id="t1-summary" class="jcm-test1-summary"></div><div class="jcm-test1-add"><input id="t1-horse" placeholder="Horse" aria-label="Horse"><input id="t1-course" placeholder="Course" aria-label="Course"><input id="t1-time" type="time" aria-label="Off time"><button id="t1-add" type="button">Add horse</button></div><div id="t1-rows"></div><p id="t1-msg" role="status" class="jcm-test1-help"></p><button id="t1-export" type="button">Export CSV</button><p class="jcm-test1-help">Prices must be observed and entered manually; a screenshot or retrieval time is not proof of quote time. Enter both morning and later lay odds for drift, plus the actual later available back odds for P/L. Unknown results remain pending. Saved only in this browser, not synced to the JCM server.</p></section>';
document.body.append(modal);
const q=s=>modal.querySelector(s),message=s=>q('#t1-msg').textContent=s;
function validPrice(x){return Number.isFinite(Number(x))&&Number(x)>1;}
function calculate(r){
const m=Number(r.morningLay),l=Number(r.laterLay),b=Number(r.laterBack),L=Number(data.liability),S=Number(data.backStake),c=Number(data.commission)/100;
if(!validPrice(m)||!validPrice(l)||!validPrice(b)||!(L>0)||!(S>0)||!(c>=0&&c<=1)||!['won','lost'].includes(r.result))return null;
const layStake=L/(m-1),layWon=r.result==='lost';
const layPnl=layWon?layStake:-L,backPnl=layWon?-S:S*(b-1);
const drift=(l/m-1)*100;
const grossA=layPnl+backPnl,grossB=layPnl+(drift>0?backPnl:0);
const net=gross=>gross>0?gross*(1-c):gross;
return {drift,a:net(grossA),b:net(grossB),grossA,grossB};
}
function render(){
for(const [id,v] of [['#t1-date',data.date],['#t1-liability',data.liability],['#t1-stake',data.backStake],['#t1-commission',data.commission]])q(id).value=v;
let totalA=0,totalB=0,count=0,drifters=0,shorteners=0;
const html=data.rows.map((r,i)=>{
const x=calculate(r);if(x){totalA+=x.a;totalB+=x.b;count++;if(x.drift>0)drifters++;else shorteners++;}
const opts=[['pending','Pending'],['won','Won'],['lost','Did not win'],['nr','Non-runner']].map(([v,t])=>'<option value="'+v+'"'+(r.result===v?' selected':'')+'>'+t+'</option>').join('');
const inp=(field,label,step='0.01')=>'<label>'+label+'<input type="number" min="1.01" step="'+step+'" data-i="'+i+'" data-field="'+field+'" value="'+esc(r[field]??'')+'"></label>';
return '<article class="jcm-test1-race"><div class="jcm-test1-racehead"><strong>'+esc(r.horse)+'</strong><small>'+esc(r.course)+' · '+esc(r.time)+'</small><button type="button" data-remove="'+i+'">Remove</button></div><div class="jcm-test1-prices">'+inp('morningLay','Morning lay')+inp('laterLay','Later lay')+inp('laterBack','Later back')+'<label>Result<select data-i="'+i+'" data-field="result">'+opts+'</select></label></div><div class="jcm-test1-pnl"><span>Movement: <b>'+(x?(x.drift>0?'+':'')+x.drift.toFixed(1)+'%':'—')+'</b></span><span>A: <b>'+money(x?.a)+'</b></span><span>B: <b>'+money(x?.b)+'</b></span></div><small class="jcm-test1-help">Only completed rows with all three prices contribute to totals.</small></article>';
}).join('');
q('#t1-summary').innerHTML='<div><small>Strategy A</small><strong>'+money(totalA)+'</strong></div><div><small>Strategy B</small><strong>'+money(totalB)+'</strong></div><div><small>Complete / entered</small><strong>'+count+' / '+data.rows.length+'</strong></div><div><small>Drift / no drift</small><strong>'+drifters+' / '+shorteners+'</strong></div>';
q('#t1-rows').innerHTML=html||'<p class="jcm-test1-help">No entries yet. Add a horse to begin a daily paper audit.</p>';
}
q('.jcm-test1-close').onclick=()=>{modal.hidden=true;};
modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
q('#t1-add').onclick=()=>{const horse=q('#t1-horse').value.trim(),course=q('#t1-course').value.trim(),time=q('#t1-time').value;if(!horse||!course||!time){message('Enter horse, course and off time.');return;}data.rows.push({horse,course,time,morningLay:'',laterLay:'',laterBack:'',result:'pending'});save();render();q('#t1-horse').value='';message('Horse added to this browser’s paper tracker.');};
for(const [id,k] of [['#t1-date','date'],['#t1-liability','liability'],['#t1-stake','backStake'],['#t1-commission','commission']])q(id).addEventListener('change',e=>{const v=k==='date'?e.target.value:Number(e.target.value);if(k!=='date'&&(!Number.isFinite(v)||(k==='commission'?(v<0||v>100):v<=0))){message('Invalid amount.');render();return;}data[k]=v;save();render();});
q('#t1-rows').addEventListener('change',e=>{const el=e.target,i=Number(el.dataset.i),f=el.dataset.field;if(!Number.isInteger(i)||!data.rows[i]||!['morningLay','laterLay','laterBack','result'].includes(f))return;data.rows[i][f]=el.value;save();render();});
q('#t1-rows').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;data.rows.splice(Number(b.dataset.remove),1);save();render();});
q('#t1-export').onclick=()=>{const header=['date','horse','course','off_time','morning_lay','later_lay','later_back','result','drift_percent','strategy_a_net','strategy_b_net'];const csv=[header.join(','),...data.rows.map(r=>{const x=calculate(r);return [data.date,r.horse,r.course,r.time,r.morningLay,r.laterLay,r.laterBack,r.result,x?.drift??'',x?.a??'',x?.b??''].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')})].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jcm-test1-'+data.date+'.csv';a.click();URL.revokeObjectURL(url);};
window.jcmOpenTest1=()=>{render();modal.hidden=false;};render();
})();