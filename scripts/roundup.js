'use strict';
(()=>{
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const overlay=document.createElement('div');overlay.id='jcm-roundup-overlay';overlay.className='jcm-overlay';
 overlay.innerHTML='<section class="roundup-modal" role="dialog" aria-modal="true" aria-labelledby="roundup-title"><button class="jcm-close" aria-label="Close Roundup">×</button><div class="roundup-head"><h2 id="roundup-title">Roundup</h2><select id="roundup-date" aria-label="Roundup date"></select></div><div id="roundup-content"></div></section>';
 document.body.append(overlay);let token=0,focus;
 const select=overlay.querySelector('select'),content=overlay.querySelector('#roundup-content');
 const close=()=>{token++;overlay.classList.remove('open');focus?.focus();};
 overlay.querySelector('button').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close();};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close();});
 async function load(){const n=++token;content.textContent='Loading…';try{const r=await fetch('data/roundup-'+select.value+'.json',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();if(d.date!==select.value||!Array.isArray(d.theory)||!Array.isArray(d.learnings))throw Error();if(n!==token)return;content.innerHTML=['Theory','Learnings'].map(k=>'<article class="roundup-box"><h3>'+k+'</h3>'+d[k.toLowerCase()].map(t=>'<p>'+esc(t)+'</p>').join('')+'</article>').join('');}catch{if(n===token)content.textContent='Roundup unavailable for this date.';}}
 select.onchange=load;
 window.jcmOpenRoundup=async()=>{focus=document.activeElement;overlay.classList.add('open');const n=++token;content.textContent='Loading…';try{const r=await fetch('data/roundup-days.json',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();if(n!==token)return;const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());const dates=[...new Set([today,...d.dates])].sort().reverse();select.innerHTML=dates.map(v=>{const day=Number(v.slice(8)),suffix=day%100>=11&&day%100<=13?'th':({1:'st',2:'nd',3:'rd'}[day%10]||'th');const date=new Date(v+'T12:00:00Z');return '<option value="'+esc(v)+'">'+day+suffix+' '+date.toLocaleDateString('en-GB',{month:'short',timeZone:'Europe/London'})+'-'+v.slice(2,4)+'</option>';}).join('');select.value=today;await load();select.focus();}catch{if(n===token)content.textContent='Roundup unavailable.';}};
})();
