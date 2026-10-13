/* Fictional device-local strategies. Amounts are liability, never real orders. */
(function(){
'use strict';
const names={fixed:'Stake Per Day',race:'Stake Per Race',manual:'Manual Stakes',results:'Results'};
const colours={fixed:'#edbd57',race:'#00bfc1',manual:'#ae90ff'};
const money=v=>'£'+(v/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=r=>[r.off_time_uk,r.course,r.horse].join('|');
const legacyOpen=window.jcmOpenLegacyStrategy;
let mode='fixed',generation=0,lockTimer,refreshTimer;
const read=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('Unavailable');return r.json();};
const day=()=>document.getElementById('date').value;
const storage=(d,m)=>'jcm-builder-v2-'+d+'-'+m;
const cents=v=>{const raw=String(v).trim(),n=Number(raw),c=Math.round(n*100);return raw&&Number.isFinite(n)&&Number.isSafeInteger(c)&&c>0&&Math.abs(n*100-c)<1e-6?c:null;};
const price=v=>{const raw=String(v??'').trim(),n=Number(raw);return raw&&Number.isFinite(n)&&n>1&&n<=1000?n:null;};
const off=r=>Date.parse(r.scheduled_off_dt);
const withdrawn=r=>r.withdrawal_status==='SCREENSHOT_NR';
const status=r=>withdrawn(r)?'NR':Date.now()>=off(r)&&window.jcmAcceptedResult(r)&&(r.result_source!=='THE_RACING_API'||(!r.race_id||r.result_race_id===r.race_id)&&(!r.horse_id||r.result_horse_id===r.horse_id))&&['WIN','LOSS','NR'].includes(r.result_status)?r.result_status:'PENDING';
function stop(){window.jcmBuilderLegacyActive=false;generation++;clearTimeout(lockTimer);clearInterval(refreshTimer);window.jcmStopLegacyAccount?.();window.jcmStopFixedTimer?.();}
window.jcmAddAccountSwitch=function(node,current){
 node.querySelector('.jcm-account-switch')?.remove();
 const sw=document.createElement('div');sw.className='jcm-account-switch builder-switch';sw.setAttribute('role','tablist');sw.setAttribute('aria-label','Fictional account strategy');
 sw.innerHTML=Object.entries(names).map(([m,label])=>'<button type="button" role="tab" aria-selected="'+(m===current)+'" data-account-mode="'+m+'">'+label+'</button>').join('');
 node.prepend(sw);
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
 const all=[...p.high_competition,...p.competition_watchlist];
 return c.rows.map(r=>{const matches=all.filter(a=>a.race_date===r.race_date&&a.race_id===r.race_id&&a.horse_id===r.horse_id&&key(a)===key(r)&&a.scheduled_off_dt===r.scheduled_off_dt);if(matches.length!==1)throw Error('Result identity mismatch');return {...matches[0],...r,result_status:matches[0].result_status,...Object.fromEntries(Object.entries(matches[0]).filter(([k])=>k.startsWith('result_')||['verification_status','position','placing','official_accuracy_eligible'].includes(k)))};});
}
function loadSettings(c,m){
 const raw=localStorage.getItem(storage(c.date,m));
 if(!raw)return null;
 const s=JSON.parse(raw);if(!s||s.version!==2||s.date!==c.date||s.mode!==m||!s.entries||typeof s.entries!=='object'||Array.isArray(s.entries)||!Number.isSafeInteger(s.amount_cents)||s.amount_cents<0)throw Error('Invalid saved strategy');
 const first=Math.min(...c.rows.map(off));
 if(m!=='manual'&&s.confirmed_at!==null&&(!Number.isFinite(Date.parse(s.confirmed_at))||Date.parse(s.confirmed_at)>=first||Date.parse(s.confirmed_at)>Date.now()||Date.parse(s.confirmed_at)<Date.parse(c.introduced_at)))throw Error('Invalid amount lock');
 for(const [k,v] of Object.entries(s.entries)){
  const r=c.rows.find(r=>key(r)===k);
  if(!r||!v||typeof v.included!=='boolean'||!Number.isSafeInteger(v.liability_cents)||v.liability_cents<0||v.included&&v.liability_cents<1||v.odds!==null&&price(v.odds)!==v.odds||!Number.isFinite(Date.parse(v.confirmed_at))||Date.parse(v.confirmed_at)>=off(r)||Date.parse(v.confirmed_at)>Date.now()||Date.parse(v.confirmed_at)<Date.parse(c.introduced_at))throw Error('Invalid saved race');
 }
 if(m==='race'&&Object.values(s.entries).some(v=>v.included&&v.liability_cents!==s.amount_cents))throw Error('Inconsistent race amount');
 if(m==='fixed'&&s.confirmed_at&&Object.values(s.entries).reduce((a,v)=>a+(v.included?v.liability_cents:0),0)!==s.amount_cents)throw Error('Inconsistent daily amount');
 return s;
}
function initial(c,m){return {version:2,date:c.date,mode:m,amount_cents:0,confirmed_at:null,entries:{}};}
function allocation(s,rows,amount,m){
 const next=structuredClone(s),selected=rows.filter(r=>!withdrawn(r)&&s.entries[key(r)]?.included!==false),stamp=new Date().toISOString();
 for(const r of rows.filter(withdrawn))next.entries[key(r)]={included:false,liability_cents:0,odds:null,confirmed_at:stamp};
 if(!selected.length||m==='fixed'&&amount<selected.length)throw Error('Keep at least one race and at least 1p per race.');
 next.amount_cents=amount;next.confirmed_at=stamp;
 for(const [i,r] of selected.entries())next.entries[key(r)]={included:true,liability_cents:m==='race'?amount:Math.floor(amount/selected.length)+(i<amount%selected.length?1:0),odds:s.entries[key(r)]?.odds??r.lay_odds??null,confirmed_at:stamp};
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
 overlay.querySelector('.jcm-modal')?.scrollTo(0,0);node.innerHTML='<h2>Bet Builder</h2><p role="status">Loading…</p>';window.jcmAddAccountSwitch(node,next);overlay.querySelector('.jcm-close').focus();
 if(d==='2026-10-12'&&['fixed','manual'].includes(next)){window.jcmBuilderLegacyActive=true;await legacyOpen(next);return;}
 try{
  const days=await read('data/bet-builder-days.json');if(token!==generation)return;
  if(next==='results'){await results(node,days,token);if(token===generation)refreshTimer=setInterval(()=>{if(token!==generation||!overlay.classList.contains('open')){clearInterval(refreshTimer);return;}results(node,days,token).catch(()=>{});},30000);return;}
  if(!days.days.includes(d))throw Error('No account card for date');
  let c=validateConfig(await read('data/bet-builder-'+d+'.json'),d);let rows=mergeResults(c,await read('data/competition-research-'+d+'.json'));
  const prior=await history(days,d);if(prior.banks[next]===null)throw Error('Previous bank unresolved');c.account_opening_cents=prior.banks[next];
  if(token!==generation)return;
  let s=loadSettings(c,next)||initial(c,next);
  function applyQuotes(){let changed=false;for(const r of rows){const v=s.entries[key(r)];if(v&&v.odds===null&&r.lay_odds!==null&&Date.now()<off(r)){v.odds=r.lay_odds;v.confirmed_at=new Date().toISOString();changed=true;}}if(changed)persist(c,next,s);}
  applyQuotes();
  const first=Math.min(...rows.map(off));
  if(next==='fixed'&&!s.confirmed_at&&Date.now()<first&&Date.now()>=Date.parse(c.introduced_at)){s=allocation(s,rows,Math.min(100000,c.account_opening_cents),'fixed');persist(c,next,s);}
  if(totals(c,rows,s).available<0)throw Error('Saved liabilities exceed bank');
  function commit(candidate,message){
   if(totals(c,rows,candidate).available<0){say('Insufficient available balance. Reduce the amount or uncheck an editable race.');return;}
   try{persist(c,next,candidate);}catch(_){say('Unable to save. Choices unchanged.');return;}
   s=candidate;draw(message);
  }
  function say(message){node.querySelector('#builder-message').textContent=message;}
  function draw(message=''){
   if(token!==generation||!overlay.classList.contains('open'))return;
   const t=totals(c,rows,s),amountLocked=Date.now()>=first;
   node.innerHTML='<h2>Bet Builder · '+names[next]+'</h2><label class="builder-date">Racing day <select id="builder-day">'+days.days.map(v=>'<option value="'+v+'" '+(v===d?'selected':'')+'>'+v.slice(8)+' Oct '+v.slice(0,4)+'</option>').join('')+'</select></label>'+
    '<section class="builder-tile"><div class="builder-bank"><div>Opening bank<strong>'+money(c.account_opening_cents)+'</strong></div><div>Balance<strong data-builder-balance>'+money(t.balance)+'</strong></div><div>Reserved<strong data-builder-reserved>'+money(t.reserved)+'</strong></div><div>Available<strong data-builder-available>'+money(t.available)+'</strong></div></div></section>'+
    (next==='manual'?'':'<section class="builder-tile" id="builder-amount-box"><h3>'+ (next==='fixed'?'Total liability for the day':'Liability on every included race')+'</h3><label for="builder-amount">Amount (£)</label><div class="builder-input-group"><input id="builder-amount" type="number" min="0.01" max="'+c.account_opening_cents/100+'" step="0.01" value="'+(s.amount_cents?s.amount_cents/100:'')+'" '+(amountLocked?'disabled':'')+'><button id="builder-confirm" '+(amountLocked?'disabled':'')+'>Lock amount</button></div><p>'+ (next==='fixed'?'Split equally across included races; choices lock at the first race.':'The same amount is applied to each included race. The amount locks at the first race; each checkbox locks at its own start. Unchecking does not redistribute funds.')+'</p></section>')+
    '<p id="builder-message" role="status">'+safe(message)+'</p><p class="builder-note">Fictional liability, no real bets. Screenshot lay prices; full matching assumed. Quote capture times are unknown and displayed liquidity may be insufficient. You can change illustrative odds before each race starts. Missing odds keep returns unavailable. Each strategy starts with £5,000 and carries its completed closing bank into the next day. 5% commission on positive market winnings. Choices are saved on this device; locks use its clock.</p>'+
    '<h3>'+d.slice(8)+' October · '+rows.length+' races</h3>'+rows.map((r,i)=>{
     const v=s.entries[key(r)]||{included:false,liability_cents:0,odds:r.lay_odds??null},locked=Date.now()>=off(r),st=status(r),checkboxLocked=withdrawn(r)||(next==='fixed'?amountLocked:locked);
     return '<section class="jcm-manual-row builder-row" data-builder-row="'+i+'"><strong>'+safe(r.horse)+'</strong><p>'+safe(r.off_time_uk)+' · '+safe(r.course)+' · '+(locked?'Locked':'Editable')+'</p><label><input data-builder-include="'+i+'" type="checkbox" '+(v.included?'checked ':'')+(checkboxLocked?'disabled':'')+'> Include race</label>'+
      (next==='manual'?'<label for="builder-liability-'+i+'">Liability (£)</label><input id="builder-liability-'+i+'" data-builder-liability="'+i+'" type="number" min="0.01" step="0.01" value="'+(v.liability_cents?v.liability_cents/100:'')+'" '+(locked||withdrawn(r)?'disabled':'')+'>':'')+
      '<label for="builder-odds-'+i+'">Illustrative lay odds</label><input id="builder-odds-'+i+'" data-builder-odds="'+i+'" type="number" min="1.01" max="1000" step="0.01" value="'+(v.odds??'')+'" '+(locked||withdrawn(r)?'disabled':'')+'><button data-builder-confirm-row="'+i+'" '+(locked||withdrawn(r)?'disabled':'')+'>'+ (next==='manual'?'Confirm race':'Save odds')+'</button><p>Liability: <strong data-builder-liability-value>'+money(v.included?v.liability_cents:0)+'</strong><br>Result: '+safe(st==='WIN'?'Horse lost':st==='LOSS'?'Horse won':st==='NR'?'Non-runner'+(withdrawn(r)?' (Betfair screenshot)':''):'Pending')+'<br>Potential net profit: '+(v.included&&v.odds!==null?money(Math.round(v.liability_cents/(v.odds-1)*.95)):'Unavailable')+'<br>Displayed liquidity: '+(r.available_stake_gbp!==null?money(Math.round(r.available_stake_gbp*100)):'Unavailable')+(v.included&&v.odds!==null&&r.available_stake_gbp<v.liability_cents/100/(v.odds-1)?' · Insufficient for full simulated stake':'')+'</p>'+ (locked&&v.included&&v.odds===null?'<p>INSUFFICIENT VERIFIED DATA — no pre-race price saved; financial result unavailable.</p>':'')+'</section>';
    }).join('');
   window.jcmAddAccountSwitch(node,next);
   node.querySelector('#builder-day').addEventListener('change',e=>{document.getElementById('date').value=e.target.value;document.getElementById('date').dispatchEvent(new Event('change'));open(next);});
   node.querySelector('#builder-confirm')?.addEventListener('click',()=>{
    if(Date.now()>=first){draw('Amount locked at the first scheduled start.');return;}
    const amount=cents(node.querySelector('#builder-amount').value);if(amount===null){say('Enter a positive amount with at most two decimal places.');return;}
    try{commit(allocation(s,rows,amount,next),'Amount confirmed.');}catch(e){say(e.message);}
   });
   node.querySelectorAll('[data-builder-include]').forEach(box=>box.addEventListener('change',()=>{
    const i=Number(box.dataset.builderInclude),r=rows[i];if(withdrawn(r)||Date.now()>=(next==='fixed'?first:off(r))){draw('Race choice locked.');return;}
    if(next==='manual'&&box.checked){say('Enter the liability and odds, then Confirm race.');return;}
    if(next==='race'&&box.checked&&!s.confirmed_at){box.checked=false;say('Lock an amount first.');return;}
    let candidate=structuredClone(s),v=candidate.entries[key(r)]||{included:false,liability_cents:0,odds:null};candidate.entries[key(r)]={...v,included:box.checked,liability_cents:box.checked?candidate.amount_cents:v.liability_cents,confirmed_at:new Date().toISOString()};
    try{if(next==='fixed')candidate=allocation(candidate,rows,s.amount_cents,next);commit(candidate,box.checked?'Race included.':'Race excluded; funds released.');}catch(e){draw(e.message);}
   }));
   node.querySelectorAll('[data-builder-confirm-row]').forEach(button=>button.addEventListener('click',()=>{
    const i=Number(button.dataset.builderConfirmRow),r=rows[i];if(Date.now()>=off(r)){draw('Race locked at its scheduled start.');return;}
    if(withdrawn(r)){draw('Non-runner excluded.');return;}const odds=price(node.querySelector('[data-builder-odds="'+i+'"]').value);if(odds===null){say('Enter decimal lay odds greater than 1, up to 1000.');return;}
    const candidate=structuredClone(s);let v=candidate.entries[key(r)]||{included:false,liability_cents:0};
    if(next==='manual'){const included=node.querySelector('[data-builder-include="'+i+'"]').checked,amount=cents(node.querySelector('[data-builder-liability="'+i+'"]').value);if(included&&amount===null){say('Enter a positive liability with at most two decimal places.');return;}v={...v,included,liability_cents:included?amount:0};}
    if(next!=='manual'&&!v.included){say('Include this race and confirm an amount first.');return;}
    candidate.entries[key(r)]={...v,odds,confirmed_at:new Date().toISOString()};commit(candidate,'Race saved.');
   }));
   clearTimeout(lockTimer);const future=rows.map(off).filter(t=>t>Date.now());if(future.length)lockTimer=setTimeout(()=>draw('Race controls locked at the scheduled start.'),Math.min(...future)-Date.now()+1);
  }
  draw();
  refreshTimer=setInterval(async()=>{if(token!==generation||!overlay.classList.contains('open')){clearInterval(refreshTimer);return;}try{const updated=validateConfig(await read('data/bet-builder-'+d+'.json'),d);if(JSON.stringify(updated.rows.map(key))!==JSON.stringify(c.rows.map(key)))throw Error('Card changed');updated.account_opening_cents=c.account_opening_cents;const fresh=mergeResults(updated,await read('data/competition-research-'+d+'.json'));if(JSON.stringify(fresh)!==JSON.stringify(rows)){c=updated;rows=fresh;applyQuotes();draw('Published prices and results refreshed.');}}catch(_){say('Results refresh unavailable; retaining the last loaded card.');}},30000);
 }catch(_){if(token===generation){node.innerHTML='<h2>Bet Builder · '+names[next]+'</h2><p>INSUFFICIENT VERIFIED DATA — strategy unavailable. Saved choices retained.</p>';window.jcmAddAccountSwitch(node,next);}}
}
async function history(days,before=null){
 const points={fixed:[],race:[],manual:[]},issues=[],banks={fixed:500000,race:500000,manual:500000};
 for(const d of [...days.days].sort()){
  if(before&&d>=before)continue;
  try{
   if(d==='2026-10-12'){
    const account=await read('data/fictional-account-'+d+'.json');
    if(account.fictional_only!==true||account.date!==d||account.opening_balance_gbp!==5000||account.commission_rate!==.05||!Array.isArray(account.rows)||account.rows.length!==15)throw Error('Invalid history');
    const first=Math.min(...account.rows.map(r=>Date.parse(d+'T'+r.off_time_uk+':00+01:00')));
    if(Date.now()<first)continue;
    const raw=localStorage.getItem('jcm-fictional-settings-'+d),saved=raw?JSON.parse(raw):null;
    let budget=100000,excluded=[];
    if(saved){if(!Number.isSafeInteger(saved.budget_cents)||saved.budget_cents<1||saved.budget_cents>500000||!Array.isArray(saved.excluded)||saved.excluded.some(k=>!account.rows.some(r=>key(r)===k))||!Number.isFinite(Date.parse(saved.confirmed_at))||Date.parse(saved.confirmed_at)>=first||Date.parse(saved.confirmed_at)>Date.now())throw Error('Invalid historical choices');budget=saved.budget_cents;excluded=saved.excluded;}
    const included=account.rows.filter(r=>!excluded.includes(key(r)));if(!included.length||budget<included.length)throw Error('Invalid allocation');
    let net=0,complete=true;for(const [i,r] of included.entries()){const st=status({...r,race_date:d,scheduled_off_dt:d+'T'+r.off_time_uk+':00+01:00'}),amount=Math.floor(budget/included.length)+(i<budget%included.length?1:0);if(st==='PENDING'||price(r.lay_odds)===null){complete=false;break;}net+=st==='WIN'?Math.round(amount/(r.lay_odds-1)*.95):st==='LOSS'?-amount:0;}
    if(complete){points.fixed.push({date:d,balance:500000+net,opening:500000,basis:saved?'Saved choices':'Default historical allocation'});banks.fixed=500000+net;}else banks.fixed=null;
    const manualRaw=localStorage.getItem('jcm-manual-settings-'+d);
    if(manualRaw){const settings=JSON.parse(manualRaw),config=await read('data/manual-account-'+d+'.json');let net=0,complete=true;if(!settings||typeof settings!=='object'||Array.isArray(settings))throw Error('Invalid manual history');
     for(const [k,v] of Object.entries(settings)){const r=account.rows.find(r=>key(r)===k),t=r&&Date.parse(d+'T'+r.off_time_uk+':00+01:00');if(!r||!config.horse_keys.includes(k)||typeof v.included!=='boolean'||!Number.isSafeInteger(v.liability_cents)||v.liability_cents<0||v.included&&v.liability_cents<1||!Number.isFinite(Date.parse(v.confirmed_at))||Date.parse(v.confirmed_at)>=t||Date.parse(v.confirmed_at)<Date.parse(config.introduced_at)||Date.parse(v.confirmed_at)>Date.now())throw Error('Invalid manual history');if(!v.included)continue;const st=status({...r,race_date:d,scheduled_off_dt:d+'T'+r.off_time_uk+':00+01:00'});if(st==='PENDING'){complete=false;break;}net+=st==='WIN'?Math.round(v.liability_cents/(r.lay_odds-1)*.95):st==='LOSS'?-v.liability_cents:0;}
     if(complete){points.manual.push({date:d,balance:500000+net,opening:500000,basis:'Saved choices'});banks.manual=500000+net;}else banks.manual=null;
    }
    continue;
   }
   const c=validateConfig(await read('data/bet-builder-'+d+'.json'),d),rows=mergeResults(c,await read('data/competition-research-'+d+'.json'));
   if(Date.now()<Math.max(...rows.map(off)))continue;
   for(const m of ['fixed','race','manual']){if(banks[m]===null)continue;const s=loadSettings(c,m);if(!s)continue;c.account_opening_cents=banks[m];const t=totals(c,rows,s);if(!t.unresolved&&t.available>=0){points[m].push({date:d,balance:t.balance,opening:banks[m],basis:'Saved choices'});banks[m]=t.balance;}else banks[m]=null;}
  }catch(_){issues.push(d);for(const m of ['fixed','race','manual'])banks[m]=null;}
 }
 return {points,issues,banks};
}
async function results(node,days,token){
 const {points,issues}=await history(days);
 if(token!==generation)return;
 const dates=[...new Set(Object.values(points).flat().map(p=>p.date))].sort();
 node.innerHTML='<h2>Bet Builder · Results</h2><p>Daily finishing banks · three separate fictional accounts · balances carried forward</p><div class="builder-legend">'+Object.entries(colours).map(([m,c])=>'<span><i style="background:'+c+'"></i>'+names[m]+'</span>').join('')+'</div>'+
  (dates.length?chart(points,dates):'<section class="builder-tile">No completed daily balances yet.</section>')+
  '<p class="builder-note">Green dots: up from the previous recorded close. Red: down. Gold: unchanged. The first dot compares with the £5,000 opening bank. Only completed, price-supported entries are plotted. Stake Per Race begins on 13 October; no earlier performance is backfilled. Saved choices belong to this device.</p>'+
  '<div class="builder-table-wrap"><table class="jcm-rated-table"><thead><tr><th>Date</th>'+['fixed','race','manual'].map(m=>'<th>'+names[m]+'</th>').join('')+'</tr></thead><tbody>'+dates.map(d=>'<tr><td>'+d.slice(8)+' Oct</td>'+['fixed','race','manual'].map(m=>{const p=points[m].find(p=>p.date===d);return '<td>'+(p?money(p.balance):'—')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>'+
  '<p>12 October Stake Per Day uses your saved choices, or the original default allocation if none were saved. Missing manual history is left blank. Today stays open until every included financial result is resolved.</p>'+(issues.length?'<p role="status">INSUFFICIENT VERIFIED DATA for '+safe(issues.join(', '))+'. These dates are omitted.</p>':'');
 window.jcmAddAccountSwitch(node,'results');
}
function chart(points,dates){
 const values=Object.values(points).flat().map(p=>p.balance).concat(500000),lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.15,1000),min=lo-pad,max=hi+pad;
 const x=d=>70+(dates.length===1?240:dates.indexOf(d)/(dates.length-1)*470),y=v=>230-(v-min)/(max-min)*180;
 let svg='<svg id="builder-chart" viewBox="0 0 580 290" role="img" aria-label="Daily closing fictional bank balances for three strategies">';
 for(let i=0;i<4;i++){const value=min+(max-min)*i/3,py=y(value);svg+='<line x1="70" x2="550" y1="'+py+'" y2="'+py+'" stroke="#52647b"/><text x="64" y="'+(py+4)+'" text-anchor="end" fill="#fff" font-size="12">£'+(value/100).toFixed(0)+'</text>';}
 svg+='<line x1="70" x2="550" y1="'+y(500000)+'" y2="'+y(500000)+'" stroke="#fff" stroke-dasharray="4 5" opacity=".5"/>';
 dates.forEach(d=>svg+='<text x="'+x(d)+'" y="260" text-anchor="middle" fill="#fff" font-size="13">'+d.slice(8)+' Oct</text>');
 for(const [m,colour] of Object.entries(colours)){const ps=points[m];if(!ps.length)continue;
  svg+='<polyline data-strategy-line="'+m+'" points="'+ps.map(p=>x(p.date)+','+y(p.balance)).join(' ')+'" fill="none" stroke="'+colour+'" stroke-width="3"/>';
  ps.forEach((p,i)=>{const previous=i?ps[i-1].balance:p.opening,fill=p.balance>previous?'#43bd84':p.balance<previous?'#ff5776':'#edbd57';svg+='<circle data-strategy-dot="'+m+'" data-date="'+p.date+'" cx="'+x(p.date)+'" cy="'+y(p.balance)+'" r="6" fill="'+fill+'" stroke="'+colour+'" stroke-width="2"><title>'+names[m]+' · '+p.date+' · '+money(p.balance)+' · '+p.basis+'</title></circle>';});
 }
 return '<section class="builder-tile">'+svg+'</svg></section>';
}
window.jcmOpenDummyAccount=()=>open('fixed');
window.jcmOpenBuilderStrategy=open;
})();
