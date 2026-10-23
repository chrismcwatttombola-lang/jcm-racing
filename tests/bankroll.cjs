const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const today=JSON.parse(fs.readFileSync(path.join(root,'data/bet-builder-2026-10-23.json')));
const files={},store=new Map(),stub={addEventListener(){},querySelector(){return stub;}};
class Clock extends Date {static now(){return Date.parse('2026-11-01T12:00:00Z');}}
const context={window:{jcmAcceptedResult:()=>true},document:{getElementById:()=>stub,addEventListener(){}},structuredClone,Date:Clock,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},fetch:async p=>({ok:!!files[p],json:async()=>structuredClone(files[p])})};
const source=fs.readFileSync(path.join(root,'scripts/bet-builder.js'),'utf8').replace("window.jcmOpenDummyAccount=()=>open('fixed');","window.bankTest={settings,totals,carriedBank,history};window.jcmOpenDummyAccount=()=>open('fixed');");
vm.runInNewContext(source,context);const api=context.window.bankTest;
function calculate(outcomes,m='fixed',opening=1000000){const c=structuredClone(today);c.account_opening_cents=opening;c.rows.forEach((r,i)=>r.result_status=outcomes[i]);return api.totals(c,c.rows,api.settings(c,m));}
const pending=calculate(['PENDING','PENDING']);assert.equal(pending.balance,1000000);assert.equal(pending.reserved,100000);assert.equal(pending.potential,27682);assert.equal(pending.net,0);
for(const mode of ['fixed','race','manual']){const s=api.settings(today,mode);assert.equal(s.published,true);assert.equal(Object.values(s.entries).filter(e=>e.included).length,2);}
const win=calculate(['WIN','WIN']);assert.equal(win.balance,1027682);assert(Math.abs(win.bank_percentage-2.7682)<1e-9);assert.equal(calculate(['WIN','WIN'],'race').balance,win.balance);assert.equal(calculate(['WIN','WIN'],'manual').balance,1013841);
assert.equal(calculate(['WIN','LOSS']).balance,962838);assert.equal(calculate(['LOSS','LOSS']).balance,900000);assert.equal(calculate(['NR','LOSS']).balance,950000);
const empty=calculate(['LOSS','LOSS'],'fixed',100000);assert.equal(empty.balance,1000000);assert.equal(empty.deposits,2000000);assert.equal(empty.topup,1000000);assert.equal(empty.bank_percentage,-100);
assert.equal(calculate(['LOSS','LOSS'],'fixed',100001).topup,0);
function publish(date,outcomes){const c=structuredClone(today);c.date=date;c.rows.forEach((r,i)=>{r.race_date=date;r.scheduled_off_dt=date+'T'+r.off_time_uk+':00+01:00';r.result_status=outcomes[i];});files['data/bet-builder-'+date+'.json']=c;files['data/competition-research-'+date+'.json']={date,high_competition:c.rows,competition_watchlist:[]};}
(async()=>{
 publish('2026-10-23',['WIN','LOSS']);publish('2026-10-24',['LOSS','LOSS']);
 const days={days:['2026-10-24','2026-10-23','2026-10-22']};
 const carry=await api.carriedBank('2026-10-25','fixed',days);assert.equal(carry.bank,862838);assert.equal(carry.deposits,1000000);
 assert.equal((await api.carriedBank('2026-10-25','fixed',days)).bank,carry.bank);
 const h=await api.history(days);assert.equal(h.points.fixed[1].balance,carry.bank);assert(Math.abs(h.points.fixed[1].percentage+13.7162)<1e-9);
 publish('2026-10-23',['LOSS','LOSS']);assert.equal((await api.carriedBank('2026-10-25','fixed',days)).bank,800000);
 publish('2026-10-23',['PENDING','WIN']);const p=await api.carriedBank('2026-10-24','fixed',days);assert.equal(p.bank,1014844);assert.equal(p.reserved,50000);
 console.log('Bankroll checks passed: three booked plans; wins, losses, NR, running balances, pending funds, corrections, repeat reads, deposits and net percentage.');
})().catch(e=>{console.error(e);process.exitCode=1;});
