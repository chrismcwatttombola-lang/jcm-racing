'use strict';
(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v);
 const clock=v=>{const t=new Date(v);return Number.isFinite(t.getTime())?t.toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}):'Unknown';};
 const pct=v=>typeof v==='number'&&Number.isFinite(v)?(v>0?'+':'')+v.toFixed(1)+'%':'Unavailable';
 const overlay=document.createElement('div');overlay.id='jcm-drift-overlay';overlay.className='jcm-overlay';
 overlay.innerHTML='<div class="drift-modal" role="dialog" aria-modal="true" aria-labelledby="drift-title"><button type="button" class="jcm-close" aria-label="Close Drifting Odds">×</button><div id="drift-content"></div></div>';
 document.body.append(overlay);
 let version=0,tab='today',direction='all',data=null,manifest=null,selected='2026-10-13',returnFocus=null;
 function close(){version++;overlay.classList.remove('open');returnFocus?.focus();}
 overlay.querySelector('.jcm-close').addEventListener('click',close);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close();});
 function validate(d){
  if(d.schema_version!==1||d.research_only!==true||d.date!==selected||!Array.isArray(d.rows)||!Array.isArray(d.screenshots)||!Number.isFinite(Date.parse(d.created_at)))throw Error('Invalid research');
  if(d.rows.some(r=>typeof r.horse!=='string'||typeof r.course!=='string'||!r.race_id||!r.horse_id||!r.scheduled_off_dt?.startsWith(d.date)||!Array.isArray(r.past)||!r.current||r.current.price_side&&r.current.price_side!=='UNSPECIFIED'||r.opportunity_status!=='BLOCKED_UNVERIFIED_EXECUTION_AND_UNVALIDATED_FORECAST')||new Set(d.rows.map(r=>r.race_id+'|'+r.horse_id)).size!==d.rows.length)throw Error('Invalid rows');
  return d;
 }
 async function load(day){
  selected=day;data=null;const n=++version;paint('Loading recorded odds…');
  try{const res=await fetch('data/drifting-odds-'+day+'.json',{cache:'no-store'});if(!res.ok)throw Error('Unavailable');const d=await res.json();if(n!==version||!overlay.classList.contains('open'))return;data=validate(d);paint();}
  catch(_){if(n===version&&overlay.classList.contains('open'))paint('INSUFFICIENT VERIFIED DATA — this date’s odds research could not be loaded.');}
 }
 function header(){return '<h2 id="drift-title">Drifting Odds</h2><p>Research both directions. Lay → back benefits from a drift; back → lay benefits from shortening. Matched stakes, spread and commission determine the outcome.</p><label class="drift-date">Racing date <select id="drift-date">'+(manifest?.days||[selected]).map(d=>'<option '+(d===selected?'selected ':'')+'value="'+esc(d)+'">'+esc(d)+'</option>').join('')+'</select></label><div class="drift-tabs" role="group" aria-label="Odds research view">'+[['today','Daily favourites'],['screenshots','Your screenshots'],['calculator','Hedge calculator']].map(([id,name])=>'<button type="button" data-drift-tab="'+id+'" aria-pressed="'+(tab===id)+'">'+name+'</button>').join('')+'</div>';}
 function trace(c){
  if(!c.morning||!c.latest||c.direction==null)return '';
  const up=c.latest.price>c.morning.price,flat=c.latest.price===c.morning.price,startY=flat?25:up?38:12,endY=flat?25:up?12:38;return '<svg class="drift-trace" viewBox="0 0 260 50" role="img" aria-label="Two recorded prices, '+esc(c.direction)+'"><path d="M12 '+startY+' L248 '+endY+'" fill="none" stroke="'+(up?'#edbd57':'#6de1ed')+'" stroke-width="3"/><circle cx="12" cy="'+startY+'" r="4" fill="#fff"/><circle cx="248" cy="'+endY+'" r="4" fill="#fff"/></svg><small>Two-point comparison; intermediate movement is not drawn.</small>';
 }
 function today(){
  const rows=data.rows.filter(r=>direction==='all'||!r.withdrawal_status&&r.current.direction===direction);
  const attempted=data.rows.reduce((s,r)=>s+r.past.length,0),usable=data.rows.reduce((s,r)=>s+r.comparable_count,0);
  return '<section class="drift-tile"><strong>'+data.rows.length+' race leaders · '+usable+'/'+attempted+' usable past comparisons</strong><p>'+esc(data.benchmark)+'</p><small>Snapshot '+esc(data.created_at)+' · not a live feed. Known screenshot NR excluded; other withdrawals need rechecking.</small><p>API Exchange prices have an unspecified side and no liquidity. <strong>No executable opportunities qualified.</strong> Historical counts describe earlier starts; they are not forecast probabilities.</p></section><label class="drift-filter">Show movement <select id="drift-filter"><option value="all" '+(direction==='all'?'selected':'')+'>All favourites</option><option value="DRIFT" '+(direction==='DRIFT'?'selected':'')+'>Drifting</option><option value="SHORTENED" '+(direction==='SHORTENED'?'selected':'')+'>Shortening</option></select></label>'+(rows.length?rows.map(r=>{
   const c=r.current,stale=c.latest&&Date.now()-Date.parse(c.latest.at)>30*60000,started=Date.now()>=Date.parse(r.scheduled_off_dt);
   return '<article class="drift-tile" data-drift-race><div class="drift-head"><strong>'+esc(r.horse)+'</strong><span class="drift-pill">'+esc(r.withdrawal_status?'NR · excluded':(c.direction||'Missing pair')+(started?' · off passed':stale?' · recorded stale':''))+'</span></div><p>'+clock(r.scheduled_off_dt)+' · '+esc(r.course)+'</p><div class="drift-prices"><span>Morning proxy<strong>'+esc(c.morning?.price??'—')+'</strong><small>'+clock(c.morning?.at)+'</small></span><span>Latest proxy<strong>'+esc(c.latest?.price??'—')+'</strong><small>'+clock(c.latest?.at)+'</small></span><span>Change<strong>'+pct(c.change_percent)+'</strong><small>Unspecified side</small></span></div>'+trace(c)+'<p><strong>Past '+r.comparable_count+' comparable starts:</strong> '+r.drift_count+' drifted · '+r.shortening_count+' shortened · '+r.unchanged_count+' unchanged.</p>'+(r.similar_opening?'<p><strong>Similar opening prices (±25%):</strong> '+r.similar_opening.count+' past comparisons · '+r.similar_opening.drift_count+' drifted · '+r.similar_opening.shortening_count+' shortened.'+(r.similar_opening.count?' Observed range '+pct(r.similar_opening.min_change_percent)+' to '+pct(r.similar_opening.max_change_percent)+'.':'')+' <small>Exploratory band; too limited to forecast profit.</small></p>':'')+'<p class="drift-caution">Forecast unvalidated · back/lay prices and liquidity required.</p><details><summary>Previous starts and method</summary><p>'+esc(data.history_method)+'</p>'+r.past.map(p=>'<div class="drift-history"><strong>'+esc(p.date)+' · '+esc(p.course)+'</strong><span>'+(p.status==='COMPARABLE_PROXY'?esc(p.morning.price)+' → '+esc(p.latest.price)+' · '+pct(p.change_percent)+' · '+clock(p.morning.at)+' to '+clock(p.latest.at):esc(p.status.replaceAll('_',' ')))+'</span></div>').join('')+'</details></article>';
  }).join(''):'<p>No comparable rows for this view. Missing evidence is not a trading signal.</p>');
 }
 function screenshots(){
  const records=data.screenshots||[],paired=records.filter(r=>r.pre_off&&Number(r.pre_off.lay_odds)>1&&Number(r.lay_odds)>1),pending=records.filter(r=>r.status!=='NR'&&!r.pre_off).length;
  const intro='<section class="drift-tile"><h3>Morning → T−5 screenshots · '+esc(data.date)+'</h3><p><strong>'+records.length+' morning records</strong> · '+paired.length+' paired · '+pending+' awaiting pre-off · '+records.filter(r=>r.status==='NR').length+' non-runners</p><p>Morning lay prices are preserved separately from later T−5 observations. The screenshot filenames identify supplied records, not verified capture times or image URLs. Actual screenshot images are shown only when an archived image URL is provided. Later quotes are never assumed or invented.</p></section>';
  return intro+records.map(r=>{
   const late=r.pre_off,valid=Number(r.lay_odds)>1&&Number(late?.lay_odds)>1&&r.status!=='NR',change=valid?(Number(late.lay_odds)/Number(r.lay_odds)-1)*100:null;
   const movement=change==null?'Awaiting T−5 quote':change>0?'DRIFT '+pct(change):change<0?'SHORTENED '+pct(change):'UNCHANGED 0.0%';
   const morningImg=typeof r.image_url==='string'&&/^https:\/\//.test(r.image_url)?'<a href="'+esc(r.image_url)+'" target="_blank" rel="noopener noreferrer">View morning screenshot ↗</a>':'<small>Morning image not hosted; quote record available</small>';
   const lateImg=typeof late?.image_url==='string'&&/^https:\/\//.test(late.image_url)?'<a href="'+esc(late.image_url)+'" target="_blank" rel="noopener noreferrer">View T−5 screenshot ↗</a>':'';
   return '<article class="drift-tile" data-drift-screenshot><div class="drift-head"><strong>'+esc(r.horse)+'</strong><span class="drift-pill">'+esc(r.status==='NR'?'NR · excluded':movement)+'</span></div><p>'+esc(r.off_time_uk)+' · '+esc(r.course)+'</p><div class="drift-prices"><span>Morning lay<strong>'+esc(r.lay_odds??'—')+'</strong><small>'+esc(r.screenshot||'Source not recorded')+'</small></span><span>T−5 lay<strong>'+esc(late?.lay_odds??'Awaiting')+'</strong><small>'+esc(late?.screenshot||'Not received')+'</small></span><span>Change<strong>'+pct(change)+'</strong><small>Lay quote movement</small></span></div><p>'+morningImg+(lateImg?' · '+lateImg:'')+'</p><small>Morning capture: '+esc(r.quote_timestamp||'unknown')+' · T−5 capture: '+esc(late?.quote_timestamp||'not supplied')+'</small><p>Paper-trading P/L: unavailable without a separately observed executable back price, confirmed matched positions, and result.</p></article>';
  }).join('');
 }
 function calculator(){return '<section class="drift-tile"><h3>Illustrative same-market hedge</h3><p>Enter two prices and an entry stake. This assumes both legs fully matched in the same Exchange market, with no withdrawals, reductions or other positions. It does not place or cancel bets.</p><div class="drift-form"><label>Trade order<select id="drift-order"><option value="back">Back then lay</option><option value="lay">Lay then back</option></select></label><label>Entry stake (£), not liability<input id="drift-stake" type="number" min="0.01" step="0.01" value="100"></label><label>Entry odds<input id="drift-entry" type="number" min="1.01" step="0.01"></label><label>Exit odds<input id="drift-exit" type="number" min="1.01" step="0.01"></label><label>Commission on positive net market P&amp;L (%)<input id="drift-commission" type="number" min="0" max="100" step="0.1" value="5"></label></div><div id="drift-hedge-result" aria-live="polite">Enter both prices to calculate.</div><p class="drift-caution">Unmatched entry bets can be cancelled; a matched position needs an opposite matched bet to close it. Moving odds alone never confirm profit.</p></section>';}
 function calculate(){
  const get=id=>Number(document.getElementById(id).value),stake=get('drift-stake'),entry=get('drift-entry'),exit=get('drift-exit'),commission=get('drift-commission')/100,order=document.getElementById('drift-order').value,out=document.getElementById('drift-hedge-result');
  if(![stake,entry,exit,commission].every(Number.isFinite)||stake<=0||entry<1.01||exit<1.01||commission<0||commission>1){out.textContent='Enter a positive stake, odds of at least 1.01, and valid commission.';return;}
  const other=Math.round(stake*entry/exit*100)/100;
  const win=order==='back'?stake*(entry-1)-other*(exit-1):other*(exit-1)-stake*(entry-1),lose=order==='back'?other-stake:stake-other;
  const net=x=>x>0?x*(1-commission):x,minimum=Math.min(net(win),net(lose)),risk=order==='back'?stake:stake*(entry-1);
  if(![other,win,lose,minimum,risk].every(Number.isFinite)||other<=0){out.textContent='These amounts cannot form a valid rounded hedge.';return;}
  out.innerHTML='<div class="drift-prices"><span>Exit '+(order==='back'?'lay':'back')+' stake<strong>'+money(other)+'</strong></span><span>Entry exposure<strong>'+money(risk)+'</strong></span></div><p>Horse wins: <strong>'+money(net(win))+'</strong> net<br>Horse loses: <strong>'+money(net(lose))+'</strong> net</p><p class="'+(minimum>0?'drift-positive':'drift-negative')+'">Minimum theoretical net: <strong>'+money(minimum)+'</strong></p><small>Rounded exit stake may leave pennies of unequal outcome. Matching is assumed, not verified.</small>';
 }
 function paint(message){overlay.querySelector('#drift-content').innerHTML=header()+(message?'<p role="status">'+esc(message)+'</p>':!data?'':tab==='today'?today():tab==='screenshots'?screenshots():calculator());}
 overlay.addEventListener('click',e=>{const b=e.target.closest('[data-drift-tab]');if(b){tab=b.dataset.driftTab;paint();}});
 overlay.addEventListener('change',e=>{if(e.target.id==='drift-date')load(e.target.value);else if(e.target.id==='drift-filter'){direction=e.target.value;paint();}else if(e.target.id?.startsWith('drift-')&&tab==='calculator')calculate();});
 overlay.addEventListener('input',e=>{if(tab==='calculator'&&e.target.matches('input'))calculate();});
 window.jcmOpenDriftingOdds=async()=>{
  returnFocus=document.activeElement;tab='today';direction='all';overlay.classList.add('open');overlay.querySelector('.jcm-close').focus();
  const n=++version;paint('Loading recorded odds…');
  try{const r=await fetch('data/drifting-odds-days.json',{cache:'no-store'});if(!r.ok)throw Error('Missing manifest');const d=await r.json();if(!Array.isArray(d.days)||d.days.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x)))throw Error('Invalid manifest');if(n!==version||!overlay.classList.contains('open'))return;manifest=d;const wanted=document.getElementById('date')?.value;await load(d.days.includes(wanted)?wanted:d.days.at(-1));}
  catch(_){if(n===version)paint('INSUFFICIENT VERIFIED DATA — odds archive unavailable.');}
 };
})();
