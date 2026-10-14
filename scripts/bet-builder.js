/* Fictional device-local strategies. Amounts are liability, never real orders. */
(function(){
'use strict';
const names={fixed:'£1000 a day',race:'£500 a race',manual:'Manual betting',results:'Results'};
const policy='daily-defaults-20261014';
const colours={fixed:'#edbd57',race:'#00bfc1',manual:'#ae90ff'};
const money=v=>'£'+(v/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=r=>[r.off_time_uk,r.course,r.horse].join('|');
const labelDate=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
let mode='fixed',generation=0,lockTimer,refreshTimer;
const read=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('Unavailable');return r.json();};
const day=()=>document.getElementById('date').value;
const storage=(d,m)=>'jcm-builder-v3-'+d+'-'+m;
const cents=v=>{const raw=String(v).trim(),n=Number(raw),c=Math.round(n*100);return raw&&Number.isFinite(n)&&Number.isSafeInteger(c)&&c>0&&Math.abs(n*100-c)<1e-6?c:null;};
const price=v=>{const raw=String(v??'').trim(),n=Number(raw);return raw&&Number.isFinite(n)&&n>=1.01&&n<=1000?n:null;};
const off=r=>Date.parse(r.scheduled_off_dt);
const withdrawn=r=>r.withdrawal_status==='SCREENSHOT_NR';
const status=r=>withdrawn(r)?'NR':Date.now()>=off(r)&&window.jcmAcceptedResult(r)&&(r.result_source!=='THE_RACING_API'||(!r.race_id||r.result_race_id===r.race_id)&&(!r.horse_id||r.result_horse_id===r.horse_id))&&['WIN','LOSS','NR'].includes(r.result_status)?r.result_status:'PENDING';
function stop(){window.jcmBuilderLegacyActive=false;generation++;clearTimeout(lockTimer);clearInterval(refreshTimer);window.jcmStopLegacyAccount?.();window.jcmStopFixedTimer?.();}
window.jcmAddAccountSwitch=function(node,current){
 node.querySelector('.jcm-account-switch')?.remove();
 node.querySelector('.builder-select-all')?.remove();
 const sw=document.createElement('div');sw.className='jcm-account-switch builder-switch';sw.setAttribute('role','tablist');sw.setAttribute('aria-label','Fictional account strategy');
 sw.innerHTML=Object.entries(names).map(([m,label])=>'<button type="button" role="tab" aria-selected="'+(m===current)+'" data-account-mode="'+m+'">'+label+'</button>').join('');
 node.prepend(sw);
 const boxes=[...node.querySelectorAll('[data-builder-include],[data-account-row],[data-manual-include]')],editable=boxes.filter(b=>!b.disabled);
 if(boxes.length){const label=document.createElement('label');label.className='builder-select-all';label.innerHTML='<input id="builder-select-all" type="checkbox" '+(!editable.length?'disabled':'')+'> Select all editable races';sw.after(label);const master=label.querySelector('input');master.checked=editable.length>0&&editable.every(b=>b.checked);master.indeterminate=editable.some(b=>b.checked)&&!master.checked;master.addEventListener('change',()=>{if(node.jcmToggleAll)node.jcmToggleAll(master.checked);else if(current==='fixed')window.jcmSetAllFixed?.(master.checked);else window.jcmSetAllManual?.(master.checked);});}
 sw.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>open(b.dataset.accountMode)));
 sw.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=Object.keys(names),i=keys.indexOf(current),next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;open(keys[next]);});
};
function validateConfig(c,d){
 if(c.schema_version!==2||c.fictional_only!==true||c.date!==d||c.opening_balance_gbp!==5000||c.commission_rate!==.05||!Number.isFinite(Date.parse(c.introduced_at))||!Array.isArray(c.rows)||!c.rows.length)throw Error('Invalid card');
 if(new Set(c.rows.map(key)).size!==c.rows.length||new Set(c.rows.map(r=>r.race_id)).size!==c.rows.length)throw Error('Duplicate race');
 for(const r of c.rows)if(r.race_date!==d||!r.race_id||!r.horse_id||!r.horse||!r.course||!/^\d\d:\d\d$/.test(r.off_time_uk)||!Number.isFinite(off(r))||!r.scheduled_off_dt.startsWith(d+'T'+r.off_time_uk+':')||r.lay_odds!==null&&price(r.lay_odds)!==r.lay_odds)throw Error('Invalid identity');
 return c;
}
function mergeResults(c,p){
 if(p.date!==c.date||!Array.isArray(p.high_competition)||!Array.isArray(p.competition_watchlist))throw Error('Wrong results');
 const all=[...p.high_competition,...p.competition_watchlist].map(a=>({...a,race_id:a.race_id??a.result_race_id,horse_id:a.horse_id??a.result_horse_id,scheduled_off_dt:a.scheduled_off_dt??a.result_off_dt}));
 return c.rows.map(r=>{const matches=all.filter(a=>a.race_date===r.race_date&&a.race_id===r.race_id&&a.horse_id===r.horse_id&&key(a)===key(r)&&a.scheduled_off_dt===r.scheduled_off_dt);if(matches.length!==1)throw Error('Result identity mismatch');return {...matches[0],...r,result_status:matches[0].result_status,...Object.fromEntries(Object.entries(matches[0]).filter(([k])=>k.startsWith('result_')||['verification_status','position','placing','official_accuracy_eligible'].includes(k)))};});
}
function loadSettings(c,m){
 const raw=localStorage.getItem(storage(c.date,m));
 if(!raw)return null;
 const s=JSON.parse(raw);if(!s||Object.keys(s.entries||{}).length!==c.rows.length||s.version!==3||s.policy!==policy||s.date!==c.date||s.mode!==m||!s.entries||typeof s.entries!=='object'||Array.isArray(s.entries)||!Number.isSafeInteger(s.amount_cents)||s.amount_cents<0)throw Error('Invalid saved strategy');
 const first=Math.min(...c.rows.map(off));
 if(m!=='manual'&&s.confirmed_at!==null&&(!Number.isFinite(Date.parse(s.confirmed_at))||Date.parse(s.confirmed_at)>=first||Date.parse(s.confirmed_at)>Date.now()||Date.parse(s.confirmed_at)<Date.parse(c.introduced_at)))throw Error('Invalid amount lock');
 for(const [k,v] of Object.entries(s.entries)){
  const r=c.rows.find(r=>key(r)===k);
  if(!r||!v||typeof v.included!=='boolean'||!Number.isSafeInteger(v.liability_cents)||v.liability_cents<0||v.included&&v.liability_cents<1||v.odds!==null&&price(v.odds)!==v.odds||!(v.default_entry===true&&v.confirmed_at===null)&&(!Number.isFinite(Date.parse(v.confirmed_at))||Date.parse(v.confirmed_at)>=off(r)||Date.parse(v.confirmed_at)>Date.now()||Date.parse(v.confirmed_at)<Date.parse(c.introduced_at)))throw Error('Invalid saved race');
 }
 if(m==='race'&&(s.amount_cents!==50000||Object.values(s.entries).some(v=>v.included&&v.liability_cents!==50000)))throw Error('Inconsistent race amount');
 if(s.choices!==undefined&&(!s.choices||typeof s.choices!=='object'||Array.isArray(s.choices)||Object.entries(s.choices).some(([k,v])=>!c.rows.some(r=>key(r)===k)||typeof v!=='boolean')))throw Error('Invalid saved selections');
 if(m==='fixed'&&s.amount_cents!==100000)throw Error('Daily amount locked');
 if(m==='fixed'&&Object.values(s.entries).some(v=>v.included)&&Object.values(s.entries).reduce((a,v)=>a+(v.included?v.liability_cents:0),0)!==s.amount_cents)throw Error('Inconsistent daily amount');
 return s;
}
function selected(s,r){return !withdrawn(r)&&(s.choices?.[key(r)]??s.entries[key(r)]?.included??true);}
function opening(c,m){return m==='fixed'?100000:m==='race'?Math.max(500000,c.rows.filter(r=>!withdrawn(r)).length*50000):500000;}
function initial(c,m){
 const picked=c.rows.filter(r=>!withdrawn(r)),amount=m==='fixed'?100000:m==='race'?50000:25000;
 const s={version:3,policy,date:c.date,mode:m,amount_cents:amount,confirmed_at:null,entries:{},choices:{},basis:c.date<'2026-10-14'?'Backfilled default simulation':'Published default simulation'};
 for(const [i,r] of picked.entries()){s.choices[key(r)]=true;s.entries[key(r)]={included:true,liability_cents:m==='fixed'?Math.floor(amount/picked.length)+(i<amount%picked.length?1:0):amount,odds:r.lay_odds??null,confirmed_at:null,default_entry:true};}
 for(const r of c.rows.filter(withdrawn)){s.choices[key(r)]=false;s.entries[key(r)]={included:false,liability_cents:0,odds:r.lay_odds??null,confirmed_at:null,default_entry:true};}
 return s;
}
async function card(d){
 const c=validateConfig(await read('data/bet-builder-'+d+'.json'),d);
 return {...c,rows:mergeResults(c,await read('data/competition-research-'+d+'.json'))};
}
function allocation(s,rows,amount,m){
 const next=structuredClone(s),picked=rows.filter(r=>selected(s,r)),stamp=new Date().toISOString();
 for(const r of rows)next.entries[key(r)]={included:false,liability_cents:0,odds:s.entries[key(r)]?.odds??r.lay_odds??null,confirmed_at:stamp};
 if(m==='fixed'&&amount<picked.length)throw Error('Allow at least 1p per included race.');
 next.amount_cents=amount;next.confirmed_at=stamp;
 for(const [i,r] of picked.entries())next.entries[key(r)]={included:true,liability_cents:m==='race'?amount:Math.floor(amount/picked.length)+(i<amount%picked.length?1:0),odds:s.entries[key(r)]?.odds??r.lay_odds??null,confirmed_at:stamp};
 return next;
}
function totals(c,rows,s){
 let movement=0,reserved=0,unresolved=0,selected=0;
 for(const r of rows){const v=s.entries[key(r)];if(!v?.included)continue;selected++;const st=status(r);
  if(st==='NR')continue;
  if(st==='PENDING'||v.odds===null){reserved+=v.liability_cents;unresolved++;continue;}
  movement+=st==='LOSS'?-v.liability_cents:Math.round(v.liability_cents/(v.odds-1)*(1-c.commission_rate));
 }
 const balance=(c.account_opening_cents??Math.round(c.opening_balance_gbp*100))+movement;
 return {movement,reserved,unresolved,selected,balance,available:balance-reserved};
}
function persist(c,m,s){localStorage.setItem(storage(c.date,m),JSON.stringify(s));}
async function open(next='fixed'){
 stop();mode=next;const token=generation,d=day();
 const overlay=document.getElementById('jcm-detail-overlay'),node=overlay.querySelector('#jcm-detail-content');overlay.classList.add('open');
 delete node.jcmToggleAll;
 overlay.querySelector('.jcm-modal')?.scrollTo(0,0);node.innerHTML='<h2>Bet Builder</h2><p role="status">Loading…</p>';window.jcmAddAccountSwitch(node,next);overlay.querySelector('.jcm-close').focus();
 try{
  const days=await read('data/bet-builder-days.json');if(token!==generation)return;
  if(next==='results'){await results(node,days,token);if(token===generation)refreshTimer=setInterval(()=>{if(token!==generation||!overlay.classList.contains('open')){clearInterval(refreshTimer);return;}results(node,days,token).catch(()=>{});},30000);return;}
  if(!days.days.includes(d))throw Error('No account card for date');
  let c=await card(d),rows=c.rows;c.account_opening_cents=opening(c,next);
  if(token!==generation)return;
  let s=loadSettings(c,next)||initial(c,next);
  function applyQuotes(){let changed=false;for(const r of rows){const v=s.entries[key(r)];if(v&&v.default_entry&&v.odds===null&&r.lay_odds!==null){v.odds=r.lay_odds;changed=true;}}if(changed)persist(c,next,s);}
  applyQuotes();
  const first=Math.min(...rows.map(off));
  if(totals(c,rows,s).available<0)throw Error('Defaults exceed bank; reduce manual amounts before publication');
  function commit(candidate,message){
   if(totals(c,rows,candidate).available<0){say('Insufficient available balance. Reduce the amount or uncheck an editable race.');return;}
   candidate.basis='Saved device choices';try{persist(c,next,candidate);}catch(_){say('Unable to save. Choices unchanged.');return;}
   s=candidate;if(node.jcmAutoSaving){const t=totals(c,rows,s);for(const [name,value] of Object.entries({balance:t.balance,reserved:t.reserved,available:t.available}))node.querySelector('[data-builder-'+name+']').textContent=money(value);node.querySelectorAll('[data-builder-row]').forEach((el,i)=>{const v=s.entries[key(rows[i])];el.querySelector('[data-builder-liability-value]').textContent=money(v?.included?v.liability_cents:0);});say(message);}else draw(message);
  }
  function say(message){node.querySelector('#builder-message').textContent=message;}
  function draw(message=''){
   if(token!==generation||!overlay.classList.contains('open'))return;
   const t=totals(c,rows,s),amountLocked=Date.now()>=first;
   node.innerHTML='<h2>Bet Builder · '+names[next]+'</h2><label class="builder-date">Racing day <select id="builder-day">'+days.days.map(v=>'<option value="'+v+'" '+(v===d?'selected':'')+'>'+labelDate(v)+'</option>').join('')+'</select></label>'+
    '<section class="builder-tile"><div class="builder-bank"><div>Opening bank<strong>'+money(c.account_opening_cents)+'</strong></div><div>Balance<strong data-builder-balance>'+money(t.balance)+'</strong></div><div>Reserved<strong data-builder-reserved>'+money(t.reserved)+'</strong></div><div>Available<strong data-builder-available>'+money(t.available)+'</strong></div></div></section>'+
    (next==='manual'?'':'<section class="builder-tile" id="builder-amount-box"><h3>'+ (next==='fixed'?'Total liability for the day':'Liability on every included race')+'</h3><label for="builder-amount">Amount (£)</label><div class="builder-input-group"><input id="builder-amount" type="number" min="0.01" max="'+c.account_opening_cents/100+'" step="0.01" value="'+(s.amount_cents?s.amount_cents/100:'')+'" '+'disabled'+'><button id="builder-confirm" '+'disabled'+'>Locked</button></div><p>'+ (next==='fixed'?'£1,000 locked every day. Split equally across included races; choices lock at the first race.':'The same amount is applied to each included race. The £500 amount is locked; each checkbox locks at its own start. Unchecking does not redistribute funds.')+'</p></section>')+
    '<p id="builder-message" role="status">'+safe(message)+'</p><p class="builder-note">Green = selected, red = unselected. New cards start with every active race selected. Default amounts are automatically included; no confirmation or daily visit is required. Fictional liability, no real bets. Screenshot lay prices; full matching assumed. Quote times are recorded where available; otherwise unknown. Displayed liquidity may be insufficient. You can change illustrative odds before each race starts. Missing odds keep returns unavailable. Daily opening banks reset: £1,000 a day; £500 a race uses at least £5,000, increased to cover all £500 liabilities; Manual betting starts at £5,000 with £250 per race. Historical defaults are backfilled simulations, not pre-off confirmed bets. 5% commission on positive market winnings. Choices are saved on this device; locks use its clock.</p>'+
    '<h3>'+labelDate(d)+' · '+rows.length+' races</h3>'+rows.map((r,i)=>{
     const v=s.entries[key(r)]||{included:false,liability_cents:0,odds:r.lay_odds??null},locked=Date.now()>=off(r),st=status(r),checkboxLocked=withdrawn(r)||(next==='fixed'?amountLocked:locked);
     return '<section class="jcm-manual-row builder-row" data-builder-row="'+i+'"><strong>'+safe(r.horse)+'</strong><p>'+safe(r.off_time_uk)+' · '+safe(r.course)+' · '+(locked?'Locked':'Editable')+'</p><label><input data-builder-include="'+i+'" type="checkbox" '+(selected(s,r)?'checked ':'')+(checkboxLocked?'disabled':'')+'> Include race</label>'+
      (next==='manual'?'<label for="builder-liability-'+i+'">Liability (£)</label><input id="builder-liability-'+i+'" data-builder-liability="'+i+'" type="number" min="0.01" step="0.01" value="'+(v.liability_cents?v.liability_cents/100:'')+'" '+(locked||withdrawn(r)?'disabled':'')+'>':'')+
      '<label for="builder-odds-'+i+'">Illustrative lay odds</label><input id="builder-odds-'+i+'" data-builder-odds="'+i+'" type="number" min="1.01" max="1000" step="0.01" value="'+(v.odds??'')+'" '+(locked||withdrawn(r)?'disabled':'')+'><button data-builder-confirm-row="'+i+'" '+(locked||withdrawn(r)?'disabled':'')+'>'+ (next==='manual'?'Confirm race':'Save odds')+'</button><p>Liability: <strong data-builder-liability-value>'+money(v.included?v.liability_cents:0)+'</strong><br>Result: '+safe(st==='WIN'?'Horse lost':st==='LOSS'?'Horse won':st==='NR'?'Non-runner'+(withdrawn(r)?' (Betfair screenshot)':''):'Pending')+'<br>Potential net profit: '+(v.included&&v.odds!==null?money(Math.round(v.liability_cents/(v.odds-1)*.95)):'Unavailable')+'<br>Displayed liquidity: '+(r.available_stake_gbp!==null?money(Math.round(r.available_stake_gbp*100)):'Unavailable')+(v.included&&v.odds!==null&&r.available_stake_gbp<v.liability_cents/100/(v.odds-1)?' · Insufficient for full simulated stake':'')+'</p>'+ (locked&&v.included&&v.odds===null?'<p>INSUFFICIENT VERIFIED DATA — no pre-race price saved; financial result unavailable.</p>':'')+'</section>';
    }).join('');
   function toggleRows(targets,checked){
    let candidate=structuredClone(s);candidate.choices={...s.choices};const stamp=new Date().toISOString();
    for(const r of targets){if(withdrawn(r)||Date.now()>=(next==='fixed'?first:off(r)))continue;const k=key(r);candidate.choices[k]=checked;const v=candidate.entries[k];if(!checked&&v)candidate.entries[k]={...v,included:false,confirmed_at:stamp};if((next==='race'||next==='manual')&&checked)candidate.entries[k]={included:true,liability_cents:next==='race'?50000:(v?.liability_cents||25000),odds:v?.odds??r.lay_odds??null,confirmed_at:stamp};}
    try{if(next==='fixed')candidate=allocation(candidate,rows,s.amount_cents,next);commit(candidate,checked?'Editable races selected with default or saved amounts.':'Editable races unselected; funds released.');}catch(e){draw(e.message);}
   }
   node.jcmToggleAll=checked=>toggleRows(rows,checked);
   window.jcmAddAccountSwitch(node,next);
   node.querySelector('#builder-day').addEventListener('change',e=>{document.getElementById('date').value=e.target.value;document.getElementById('date').dispatchEvent(new Event('change'));open(next);});
   // Daily and per-race amounts are policy locked.
   node.querySelectorAll('[data-builder-include]').forEach(box=>box.addEventListener('change',()=>{
    const i=Number(box.dataset.builderInclude),r=rows[i];if(withdrawn(r)||Date.now()>=(next==='fixed'?first:off(r))){draw('Race choice locked.');return;}
    toggleRows([r],box.checked);
   }));
   node.querySelectorAll('[data-builder-confirm-row]').forEach(button=>button.addEventListener('click',()=>{
    const i=Number(button.dataset.builderConfirmRow),r=rows[i];if(Date.now()>=off(r)){draw('Race locked at its scheduled start.');return;}
    if(withdrawn(r)){draw('Non-runner excluded.');return;}const odds=price(node.querySelector('[data-builder-odds="'+i+'"]').value);if(odds===null&&String(node.querySelector('[data-builder-odds="'+i+'"]').value).trim()){say('Enter decimal lay odds greater than 1, up to 1000.');return;}
    const candidate=structuredClone(s);let v=candidate.entries[key(r)]||{included:false,liability_cents:0};
    if(next==='manual'){const included=node.querySelector('[data-builder-include="'+i+'"]').checked,amount=cents(node.querySelector('[data-builder-liability="'+i+'"]').value);if(included&&amount===null){say('Enter a positive liability with at most two decimal places.');return;}v={...v,included,liability_cents:included?amount:0};candidate.choices={...s.choices,[key(r)]:included};}
    if(next!=='manual'&&!v.included){say('Include this race and confirm an amount first.');return;}
    candidate.entries[key(r)]={...v,odds,default_entry:false,confirmed_at:new Date().toISOString()};commit(candidate,'Race saved.');
   }));
   node.querySelectorAll('[data-builder-liability]').forEach(input=>{
    const save=()=>{const i=Number(input.dataset.builderLiability),v=s.entries[key(rows[i])];if(cents(input.value)===v?.liability_cents&&price(node.querySelector('[data-builder-odds="'+i+'"]').value)===v?.odds)return;node.jcmAutoSaving=true;try{node.querySelector('[data-builder-confirm-row="'+input.dataset.builderLiability+'"]').click();}finally{node.jcmAutoSaving=false;}};
    input.addEventListener('change',save);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}});
   });
   clearTimeout(lockTimer);const future=rows.map(off).filter(t=>t>Date.now());if(future.length)lockTimer=setTimeout(()=>draw('Race controls locked at the scheduled start.'),Math.min(...future)-Date.now()+1);
  }
  draw();
  refreshTimer=setInterval(async()=>{if(token!==generation||!overlay.classList.contains('open')){clearInterval(refreshTimer);return;}try{const updated=validateConfig(await read('data/bet-builder-'+d+'.json'),d);if(JSON.stringify(updated.rows.map(key))!==JSON.stringify(c.rows.map(key)))throw Error('Card changed');updated.account_opening_cents=c.account_opening_cents;const fresh=mergeResults(updated,await read('data/competition-research-'+d+'.json'));if(JSON.stringify(fresh)!==JSON.stringify(rows)){c=updated;rows=fresh;applyQuotes();draw('Published prices and results refreshed.');}}catch(_){say('Results refresh unavailable; retaining the last loaded card.');}},30000);
 }catch(_){if(token===generation){node.innerHTML='<h2>Bet Builder · '+names[next]+'</h2><p>INSUFFICIENT VERIFIED DATA — strategy unavailable. Saved choices retained.</p>';window.jcmAddAccountSwitch(node,next);}}
}
async function history(days){
 const points={fixed:[],race:[],manual:[]},issues=[];
 for(const d of [...days.days].sort()){
  try{
   const c=await card(d),rows=c.rows;if(Date.now()<Math.max(...rows.map(off)))continue;
   for(const m of ['fixed','race','manual']){
    try{const s=loadSettings(c,m)||initial(c,m);c.account_opening_cents=opening(c,m);const t=totals(c,rows,s);
     if(!t.unresolved&&t.available>=0)points[m].push({date:d,balance:t.balance,opening:c.account_opening_cents,basis:s.basis||'Saved device choices'});
     else issues.push(d+' · '+names[m]+' pending or missing prices');
    }catch(_){issues.push(d+' · '+names[m]+' invalid saved choices');}
   }
  }catch(_){issues.push(d+' unavailable');}
 }
 return {points,issues};
}
async function results(node,days,token){
 const {points,issues}=await history(days);
 if(token!==generation)return;
 const dates=[...new Set(Object.values(points).flat().map(p=>p.date))].sort();
 node.innerHTML='<h2>Bet Builder · Results</h2><p>Daily finishing banks · three separate fictional accounts · daily opening banks reset</p><div class="builder-legend">'+Object.entries(colours).map(([m,c])=>'<span><i style="background:'+c+'"></i>'+names[m]+'</span>').join('')+'</div>'+
  (dates.length?chart(points,dates):'<section class="builder-tile">No completed daily balances yet.</section>')+
  '<p class="builder-note">Green dots: up from the previous recorded close. Red: down. Gold: unchanged. The first dot compares with that strategy’s opening bank. Only completed, price-supported entries are plotted. 12–13 October use clearly labelled backfilled defaults; these are retrospective simulations. Saved choices belong to this device.</p>'+
  '<div class="builder-table-wrap"><table class="jcm-rated-table"><thead><tr><th>Date</th>'+['fixed','race','manual'].map(m=>'<th>'+names[m]+'</th>').join('')+'</tr></thead><tbody>'+dates.map(d=>'<tr><td>'+labelDate(d)+'</td>'+['fixed','race','manual'].map(m=>{const p=points[m].find(p=>p.date===d);return '<td>'+(p?money(p.balance):'—')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>'+
  '<p>Default simulations appear even if you never open Bet Builder. Saved Manual betting amounts and exclusions belong to this device. Old strategy settings are retained separately. Today stays open until every included financial result is resolved. Days with missing prices remain pending.</p>'+(issues.length?'<p role="status">INSUFFICIENT VERIFIED DATA for '+safe(issues.join(', '))+'. These dates are omitted.</p>':'');
 window.jcmAddAccountSwitch(node,'results');
}
function chart(points,dates){
 const values=Object.values(points).flat().flatMap(p=>[p.balance,p.opening]),lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.15,1000),min=lo-pad,max=hi+pad;
 const x=d=>70+(dates.length===1?240:dates.indexOf(d)/(dates.length-1)*470),y=v=>230-(v-min)/(max-min)*180;
 let svg='<svg id="builder-chart" viewBox="0 0 580 290" role="img" aria-label="Daily closing fictional bank balances for three strategies">';
 for(let i=0;i<4;i++){const value=min+(max-min)*i/3,py=y(value);svg+='<line x1="70" x2="550" y1="'+py+'" y2="'+py+'" stroke="#52647b"/><text x="64" y="'+(py+4)+'" text-anchor="end" fill="#fff" font-size="12">£'+(value/100).toFixed(0)+'</text>';}
 svg+='<line x1="70" x2="550" y1="'+y(500000)+'" y2="'+y(500000)+'" stroke="#fff" stroke-dasharray="4 5" opacity=".5"/>';
 dates.filter((d,i)=>i===0||i===dates.length-1||i%Math.max(1,Math.ceil(dates.length/6))===0).forEach(d=>svg+='<text x="'+x(d)+'" y="260" text-anchor="middle" fill="#fff" font-size="13">'+new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'</text>');
 for(const [m,colour] of Object.entries(colours)){const ps=points[m];if(!ps.length)continue;
  svg+='<polyline data-strategy-line="'+m+'" points="'+ps.map(p=>x(p.date)+','+y(p.balance)).join(' ')+'" fill="none" stroke="'+colour+'" stroke-width="3"/>';
  ps.forEach((p,i)=>{const previous=i?ps[i-1].balance:p.opening,fill=p.balance>previous?'#43bd84':p.balance<previous?'#ff5776':'#edbd57';svg+='<circle data-strategy-dot="'+m+'" data-date="'+p.date+'" cx="'+x(p.date)+'" cy="'+y(p.balance)+'" r="'+(dates.length>15?3:6)+'" fill="'+fill+'" stroke="'+colour+'" stroke-width="2"><title>'+names[m]+' · '+p.date+' · '+money(p.balance)+' · '+p.basis+'</title></circle>';});
 }
 return '<section class="builder-tile">'+svg+'</svg></section>';
}
window.jcmOpenDummyAccount=()=>open('fixed');
window.jcmOpenBuilderStrategy=open;
const accountOverlay=document.getElementById('jcm-detail-overlay');
accountOverlay.querySelector('.jcm-close').addEventListener('click',stop);
accountOverlay.addEventListener('click',e=>{if(e.target===accountOverlay)stop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')stop();});
})();
