import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, CreditCard, ShoppingBag, ReceiptText, WalletCards,
  Car, FileDown, Plus, Trash2, Pencil, Check, X, ChevronRight,
  AlertTriangle, TrendingDown, CalendarDays, Settings, Download,
  Upload, RotateCcw, Moon, Sun, Search, CircleDollarSign
} from 'lucide-react';

const STORAGE_KEY='finguard-state-v1';
const uid=()=>crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const today=()=>new Date().toISOString().slice(0,10);
const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const money=n=>new Intl.NumberFormat('en-DE',{style:'currency',currency:'EUR'}).format(Number(n||0));
const clamp=(n,min=0)=>Math.max(min,Number(n||0));

const initialState={
  settings:{name:'Sabri',currency:'EUR',dark:false,monthlyIncome:2970,personalLimit:450},
  credit:{name:'Sparkasse Credit',principal:10500,apr:13.04,months:24,monthlyPayment:525.12,startDate:'2026-08-01',extraPayments:[]},
  debts:[
    {id:uid(),name:'Advanzia',type:'Credit card',balance:5976.68,minPayment:250,apr:22.9,color:'#ef4444'},
    {id:uid(),name:'TF Bank',type:'Credit card',balance:1300,minPayment:100,apr:22.9,color:'#f97316'},
    {id:uid(),name:'Sparkasse overdraft',type:'Overdraft',balance:1159.03,minPayment:0,apr:12.0,color:'#8b5cf6'}
  ],
  klarna:[
    {id:uid(),merchant:'Samsung',description:'Phone financing',total:457.66,paid:0,installment:65.38,nextDue:'2026-07-26',monthsRemaining:7},
    {id:uid(),merchant:'DB Vertrieb',description:'Travel purchase',total:67.49,paid:0,installment:67.49,nextDue:'2026-07-27',monthsRemaining:1},
    {id:uid(),merchant:'Hyve',description:'Purchase',total:178.76,paid:0,installment:44.69,nextDue:'2026-07-28',monthsRemaining:4},
    {id:uid(),merchant:'Other Klarna',description:'Remaining instalments',total:509.37,paid:0,installment:85.49,nextDue:'2026-07-29',monthsRemaining:6}
  ],
  recurring:[
    {id:uid(),name:'Rent',category:'Housing',amount:750,dueDay:1},
    {id:uid(),name:'Sparkasse credit',category:'Debt',amount:525.12,dueDay:1},
    {id:uid(),name:'O2 mobile service',category:'Phone',amount:20.62,dueDay:10},
    {id:uid(),name:'Vodafone internet',category:'Internet',amount:45,dueDay:5},
    {id:uid(),name:'Electricity',category:'Utilities',amount:44,dueDay:15},
    {id:uid(),name:'Amazon Prime',category:'Subscription',amount:9,dueDay:20},
    {id:uid(),name:'Family support',category:'Family',amount:175,dueDay:1},
    {id:uid(),name:'TF Bank payment',category:'Debt',amount:100,dueDay:5}
  ],
  transactions:[],
  car:{price:1500,registration:70,insurance:150,fuel:95,tax:120,repairReserve:300,purchased:false},
  goals:[{id:uid(),name:'Emergency fund',target:1000,saved:0}],
  activity:[]
};

function loadState(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||initialState;}catch{return initialState;}
}

function amortization(principal,apr,months,payment,extras=[]){
  let balance=clamp(principal), rate=Number(apr||0)/100/12, rows=[], totalInterest=0;
  const extraMap={}; extras.forEach(e=>extraMap[e.month]=(extraMap[e.month]||0)+Number(e.amount||0));
  for(let m=1;m<=600 && balance>0.005;m++){
    const interest=balance*rate;
    const regular=Math.min(Number(payment||0),balance+interest);
    const extra=Math.min(extraMap[m]||0,Math.max(0,balance+interest-regular));
    const principalPaid=Math.max(0,regular+extra-interest);
    balance=Math.max(0,balance-principalPaid); totalInterest+=interest;
    rows.push({month:m,interest,regular,extra,principalPaid,balance});
    if(m>=months && Number(payment||0)<=interest && balance>0) break;
  }
  return {rows,totalInterest,totalPaid:rows.reduce((s,r)=>s+r.regular+r.extra,0),payoffMonths:rows.length,balance:rows.at(-1)?.balance||0};
}

function Modal({title,onClose,children}){
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={20}/></button></div>{children}</div>
  </div>;
}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Empty({icon:Icon,text}){return <div className="empty"><Icon size={34}/><p>{text}</p></div>}
function Progress({value,max,color='#2563eb'}){const p=max?Math.min(100,(value/max)*100):0;return <div className="progress"><span style={{width:`${p}%`,background:color}}/></div>}

export default function App(){
  const [state,setState]=useState(loadState);
  const [tab,setTab]=useState('dashboard');
  const [modal,setModal]=useState(null);
  const [query,setQuery]=useState('');
  useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state)),[state]);
  useEffect(()=>document.documentElement.dataset.theme=state.settings.dark?'dark':'light',[state.settings.dark]);

  const calc=useMemo(()=>{
    const recurring=state.recurring.reduce((s,x)=>s+Number(x.amount||0),0);
    const currentMonth=monthKey();
    const spending=state.transactions.filter(t=>t.date?.startsWith(currentMonth)&&t.kind==='expense').reduce((s,t)=>s+Number(t.amount||0),0);
    const incomeExtra=state.transactions.filter(t=>t.date?.startsWith(currentMonth)&&t.kind==='income').reduce((s,t)=>s+Number(t.amount||0),0);
    const klarnaBalance=state.klarna.reduce((s,k)=>s+Math.max(0,Number(k.total)-Number(k.paid)),0);
    const klarnaMonthly=state.klarna.reduce((s,k)=>s+Number(k.installment||0),0);
    const debtBalance=state.debts.reduce((s,d)=>s+Number(d.balance||0),0);
    const carTotal=Object.entries(state.car).filter(([k])=>!['purchased'].includes(k)).reduce((s,[,v])=>s+Number(v||0),0);
    const available=Number(state.settings.monthlyIncome)+incomeExtra-recurring-klarnaMonthly-spending;
    const am=amortization(state.credit.principal,state.credit.apr,state.credit.months,state.credit.monthlyPayment,state.credit.extraPayments);
    return {recurring,spending,incomeExtra,klarnaBalance,klarnaMonthly,debtBalance,carTotal,available,am};
  },[state]);

  const update=(fn)=>setState(s=>{const copy=structuredClone(s);fn(copy);return copy;});
  const addActivity=(s,text)=>s.activity.unshift({id:uid(),date:new Date().toISOString(),text});

  const exportBackup=()=>{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`finguard-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);
  };
  const importBackup=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{setState(JSON.parse(r.result));alert('Backup imported successfully.')}catch{alert('Invalid backup file.')}};r.readAsText(f)};
  const reset=()=>{if(confirm('Reset all app data?'))setState(structuredClone(initialState));};

  const nav=[
    ['dashboard','Overview',LayoutDashboard],['credit','Credit',CircleDollarSign],['klarna','Klarna',ShoppingBag],
    ['debts','Debts',CreditCard],['spending','Spending',ReceiptText],['budget','Budget',WalletCards],
    ['car','Car plan',Car],['settings','Settings',Settings]
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">F</div><div><strong>FinGuard</strong><small>Private finance control</small></div></div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="side-foot"><span>Offline & private</span><button className="icon-btn" onClick={()=>update(s=>s.settings.dark=!s.settings.dark)}>{state.settings.dark?<Sun size={18}/>:<Moon size={18}/>}</button></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><h1>{nav.find(n=>n[0]===tab)?.[1]}</h1><p>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p></div><div className="top-actions"><button className="ghost" onClick={exportBackup}><Download size={17}/> Backup</button></div></header>

      {tab==='dashboard'&&<Dashboard state={state} calc={calc} setTab={setTab}/>} 
      {tab==='credit'&&<CreditView state={state} calc={calc} update={update} setModal={setModal}/>} 
      {tab==='klarna'&&<KlarnaView state={state} update={update} setModal={setModal} query={query} setQuery={setQuery}/>} 
      {tab==='debts'&&<DebtsView state={state} update={update} setModal={setModal}/>} 
      {tab==='spending'&&<SpendingView state={state} update={update} setModal={setModal}/>} 
      {tab==='budget'&&<BudgetView state={state} calc={calc} update={update} setModal={setModal}/>} 
      {tab==='car'&&<CarView state={state} calc={calc} update={update}/>} 
      {tab==='settings'&&<SettingsView state={state} update={update} exportBackup={exportBackup} importBackup={importBackup} reset={reset}/>} 
    </main>
    <BottomNav nav={nav.slice(0,5)} tab={tab} setTab={setTab}/>
    {modal&&<AppModal modal={modal} onClose={()=>setModal(null)} state={state} update={update} addActivity={addActivity}/>} 
  </div>;
}

function Dashboard({state,calc,setTab}){
  const upcoming=[...state.klarna.map(k=>({name:`Klarna · ${k.merchant}`,amount:k.installment,date:k.nextDue})),...state.recurring.map(r=>({name:r.name,amount:r.amount,date:`Day ${r.dueDay}`}))].slice(0,6);
  return <div className="content-stack">
    <section className="hero-card"><div><span className="eyebrow">AVAILABLE THIS MONTH</span><strong className={calc.available>=0?'good-text':'bad-text'}>{money(calc.available)}</strong><p>Income minus recurring bills, Klarna instalments and recorded spending.</p></div><button onClick={()=>setTab('spending')}><Plus size={18}/> Add spending</button></section>
    <div className="stats-grid">
      <Stat title="Monthly income" value={money(state.settings.monthlyIncome+calc.incomeExtra)} sub="Salary and extra income"/>
      <Stat title="Fixed bills" value={money(calc.recurring)} sub={`${state.recurring.length} recurring entries`}/>
      <Stat title="Klarna balance" value={money(calc.klarnaBalance)} sub={`${money(calc.klarnaMonthly)} scheduled monthly`} warn/>
      <Stat title="Other debt" value={money(calc.debtBalance)} sub={`${state.debts.length} open accounts`} danger/>
    </div>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h2>Credit progress</h2><p>{state.credit.name}</p></div><button className="link" onClick={()=>setTab('credit')}>Details <ChevronRight size={16}/></button></div>
        <div className="credit-summary"><div><span>Principal</span><b>{money(state.credit.principal)}</b></div><div><span>Monthly payment</span><b>{money(state.credit.monthlyPayment)}</b></div><div><span>Estimated interest</span><b>{money(calc.am.totalInterest)}</b></div><div><span>Estimated payoff</span><b>{calc.am.payoffMonths} months</b></div></div>
      </section>
      <section className="panel"><div className="panel-head"><div><h2>Upcoming payments</h2><p>Next obligations</p></div></div>{upcoming.length?upcoming.map((x,i)=><div className="list-row" key={i}><div className="round-icon"><CalendarDays size={17}/></div><div className="grow"><b>{x.name}</b><small>{x.date}</small></div><strong>{money(x.amount)}</strong></div>):<Empty icon={CalendarDays} text="No upcoming payments"/>}</section>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Car purchase readiness</h2><p>Complete first-month envelope</p></div><button className="link" onClick={()=>setTab('car')}>Open plan <ChevronRight size={16}/></button></div>
      <div className="goal-line"><div><strong>{money(calc.carTotal)}</strong><span>required</span></div><Progress value={Math.max(0,calc.available)} max={calc.carTotal} color="#0ea5e9"/><div className="goal-meta"><span>Available now: {money(Math.max(0,calc.available))}</span><span>Gap: {money(Math.max(0,calc.carTotal-calc.available))}</span></div></div>
    </section>
  </div>
}
function Stat({title,value,sub,warn,danger}){return <section className={`stat ${warn?'warn':''} ${danger?'danger':''}`}><span>{title}</span><strong>{value}</strong><small>{sub}</small></section>}

function CreditView({state,calc,update,setModal}){
  const c=state.credit; const paidExtras=c.extraPayments.reduce((s,e)=>s+Number(e.amount),0);
  return <div className="content-stack">
    <section className="panel"><div className="panel-head"><div><h2>{c.name}</h2><p>Track the loan, expected interest and advance payments.</p></div><button onClick={()=>setModal({type:'credit-edit'})}><Pencil size={17}/> Edit credit</button></div>
      <div className="stats-grid compact"><Stat title="Principal" value={money(c.principal)} sub={`${c.apr}% effective APR`}/><Stat title="Monthly rate" value={money(c.monthlyPayment)} sub={`${c.months} contracted months`}/><Stat title="Extra paid" value={money(paidExtras)} sub={`${c.extraPayments.length} advance payments`}/><Stat title="Projected total" value={money(calc.am.totalPaid)} sub={`${money(calc.am.totalInterest)} interest`} warn/></div>
      <div className="callout info"><TrendingDown size={20}/><div><b>Advance-payment effect</b><span>With the recorded extras, projected payoff is {calc.am.payoffMonths} months and total interest is {money(calc.am.totalInterest)}.</span></div></div>
    </section>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h2>Advance payments</h2><p>Record any extra amount paid to Sparkasse.</p></div><button onClick={()=>setModal({type:'credit-extra'})}><Plus size={17}/> Add</button></div>
        {c.extraPayments.length?c.extraPayments.map(e=><div className="list-row" key={e.id}><div className="round-icon"><Check size={17}/></div><div className="grow"><b>Month {e.month}</b><small>{e.note||'Extra principal payment'}</small></div><strong>{money(e.amount)}</strong><button className="icon-btn danger-text" onClick={()=>update(s=>s.credit.extraPayments=s.credit.extraPayments.filter(x=>x.id!==e.id))}><Trash2 size={17}/></button></div>):<Empty icon={TrendingDown} text="No advance payments recorded"/>}
      </section>
      <section className="panel"><div className="panel-head"><div><h2>Payoff snapshot</h2><p>First 12 projected months</p></div></div><div className="table-wrap"><table><thead><tr><th>Month</th><th>Interest</th><th>Principal</th><th>Remaining</th></tr></thead><tbody>{calc.am.rows.slice(0,12).map(r=><tr key={r.month}><td>{r.month}</td><td>{money(r.interest)}</td><td>{money(r.principalPaid)}</td><td>{money(r.balance)}</td></tr>)}</tbody></table></div></section>
    </div>
  </div>
}

function KlarnaView({state,update,setModal,query,setQuery}){
  const items=state.klarna.filter(k=>(k.merchant+' '+k.description).toLowerCase().includes(query.toLowerCase()));
  const total=state.klarna.reduce((s,k)=>s+Math.max(0,k.total-k.paid),0);
  const monthly=state.klarna.reduce((s,k)=>s+Number(k.installment),0);
  return <div className="content-stack">
    <section className="panel"><div className="panel-head"><div><h2>Klarna control centre</h2><p>Add every purchase and record every €10, €20 or full payment.</p></div><button onClick={()=>setModal({type:'klarna-add'})}><Plus size={17}/> New purchase</button></div>
      <div className="stats-grid compact"><Stat title="Remaining balance" value={money(total)} sub={`${state.klarna.length} purchases`}/><Stat title="Scheduled monthly" value={money(monthly)} sub="Current instalment total" warn/><Stat title="Paid so far" value={money(state.klarna.reduce((s,k)=>s+Number(k.paid),0))} sub="Across all purchases"/><Stat title="Next due" value={state.klarna.map(k=>k.nextDue).sort()[0]||'—'} sub="Earliest purchase date"/></div>
    </section>
    <section className="panel"><div className="panel-head"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search merchant or purchase"/></div></div>
      {items.length?items.map(k=>{const remain=Math.max(0,k.total-k.paid);return <article className="purchase-card" key={k.id}><div className="purchase-top"><div><span className="tag">{k.merchant}</span><h3>{k.description}</h3><p>Next due {k.nextDue} · {k.monthsRemaining} month(s) remaining</p></div><strong>{money(remain)}</strong></div><Progress value={k.paid} max={k.total} color="#8b5cf6"/><div className="purchase-meta"><span>Paid {money(k.paid)} of {money(k.total)}</span><span>Instalment {money(k.installment)}</span></div><div className="purchase-actions"><button onClick={()=>setModal({type:'klarna-pay',item:k})}><Check size={17}/> Record payment</button><button className="ghost" onClick={()=>setModal({type:'klarna-edit',item:k})}><Pencil size={17}/> Edit</button><button className="ghost danger-text" onClick={()=>update(s=>s.klarna=s.klarna.filter(x=>x.id!==k.id))}><Trash2 size={17}/></button></div></article>}):<Empty icon={ShoppingBag} text="No Klarna purchases found"/>}
    </section>
  </div>
}

function DebtsView({state,update,setModal}){
  const total=state.debts.reduce((s,d)=>s+Number(d.balance),0);
  return <div className="content-stack"><section className="panel"><div className="panel-head"><div><h2>Other debts</h2><p>Credit cards, overdrafts and any balance outside Klarna.</p></div><button onClick={()=>setModal({type:'debt-add'})}><Plus size={17}/> Add debt</button></div><div className="stats-grid compact"><Stat title="Total open debt" value={money(total)} sub={`${state.debts.length} accounts`} danger/><Stat title="Minimum payments" value={money(state.debts.reduce((s,d)=>s+Number(d.minPayment),0))} sub="Per month" warn/></div></section>
    <section className="panel">{state.debts.length?state.debts.map(d=><article className="debt-card" key={d.id}><div className="debt-dot" style={{background:d.color}}/><div className="grow"><b>{d.name}</b><small>{d.type} · APR {d.apr}%</small><Progress value={0} max={d.balance} color={d.color}/></div><div className="debt-amount"><strong>{money(d.balance)}</strong><small>Min. {money(d.minPayment)}</small></div><button className="icon-btn" onClick={()=>setModal({type:'debt-pay',item:d})}><Check size={17}/></button><button className="icon-btn" onClick={()=>setModal({type:'debt-edit',item:d})}><Pencil size={17}/></button><button className="icon-btn danger-text" onClick={()=>update(s=>s.debts=s.debts.filter(x=>x.id!==d.id))}><Trash2 size={17}/></button></article>):<Empty icon={CreditCard} text="No debts added"/>}</section></div>
}

function SpendingView({state,update,setModal}){
  const sorted=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  const month=monthKey(); const monthSpend=sorted.filter(t=>t.kind==='expense'&&t.date.startsWith(month)).reduce((s,t)=>s+Number(t.amount),0);
  return <div className="content-stack"><section className="panel"><div className="panel-head"><div><h2>Daily spending</h2><p>Record Amazon, food, fuel, internet and every other transaction.</p></div><button onClick={()=>setModal({type:'transaction-add'})}><Plus size={17}/> Add transaction</button></div><div className="stats-grid compact"><Stat title="Spent this month" value={money(monthSpend)} sub={`${sorted.filter(t=>t.kind==='expense'&&t.date.startsWith(month)).length} expenses`} warn/><Stat title="Personal limit" value={money(state.settings.personalLimit)} sub={`${money(Math.max(0,state.settings.personalLimit-monthSpend))} remaining`}/></div></section>
    <section className="panel">{sorted.length?sorted.map(t=><div className="list-row" key={t.id}><div className={`round-icon ${t.kind==='income'?'income':''}`}><ReceiptText size={17}/></div><div className="grow"><b>{t.name}</b><small>{t.category} · {t.date}</small></div><strong className={t.kind==='income'?'good-text':''}>{t.kind==='income'?'+':'-'}{money(t.amount)}</strong><button className="icon-btn danger-text" onClick={()=>update(s=>s.transactions=s.transactions.filter(x=>x.id!==t.id))}><Trash2 size={17}/></button></div>):<Empty icon={ReceiptText} text="No transactions yet"/>}</section></div>
}

function BudgetView({state,calc,setModal}){
  const sections=[['Monthly income',state.settings.monthlyIncome],['Recurring bills',calc.recurring],['Klarna instalments',calc.klarnaMonthly],['Recorded spending',calc.spending],['Available',calc.available]];
  return <div className="content-stack"><section className="panel"><div className="panel-head"><div><h2>Monthly budget</h2><p>See where the salary goes before spending it.</p></div><button onClick={()=>setModal({type:'recurring-add'})}><Plus size={17}/> Add recurring</button></div><div className="budget-bars">{sections.map(([name,val],i)=><div key={name}><div className="bar-label"><span>{name}</span><b>{money(val)}</b></div><Progress value={Math.abs(val)} max={Math.max(state.settings.monthlyIncome,1)} color={['#22c55e','#3b82f6','#8b5cf6','#f59e0b',calc.available>=0?'#10b981':'#ef4444'][i]}/></div>)}</div></section>
    <section className="panel"><div className="panel-head"><div><h2>Recurring expenses</h2><p>Automatically included every month.</p></div></div>{state.recurring.map(r=><div className="list-row" key={r.id}><div className="round-icon"><CalendarDays size={17}/></div><div className="grow"><b>{r.name}</b><small>{r.category} · due day {r.dueDay}</small></div><strong>{money(r.amount)}</strong><button className="icon-btn" onClick={()=>setModal({type:'recurring-edit',item:r})}><Pencil size={17}/></button></div>)}</section></div>
}

function CarView({state,calc,update}){
  const c=state.car; const total=calc.carTotal; const available=Math.max(0,calc.available); const gap=Math.max(0,total-available);
  return <div className="content-stack"><section className="panel"><div className="panel-head"><div><h2>Immediate car purchase</h2><p>Complete first-month amount, not only the seller price.</p></div><span className={`status ${c.purchased?'done':'pending'}`}>{c.purchased?'Purchased':'Planning'}</span></div>
    <div className="stats-grid compact"><Stat title="Complete envelope" value={money(total)} sub="All planned first-month costs"/><Stat title="Available this month" value={money(available)} sub="After current obligations"/><Stat title="Funding gap" value={money(gap)} sub={gap?'Additional cash required':'Fully funded'} danger={gap>0}/><Stat title="Purchase price" value={money(c.price)} sub="Seller price only"/></div></section>
    <div className="two-col"><section className="panel"><h2>Cost plan</h2>{Object.entries(c).filter(([k])=>k!=='purchased').map(([k,v])=><Field key={k} label={k.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())}><input type="number" value={v} onChange={e=>update(s=>s.car[k]=Number(e.target.value))}/></Field>)}<button className="full" onClick={()=>update(s=>s.car.purchased=!s.car.purchased)}>{c.purchased?<><X size={17}/> Mark as not purchased</>:<><Check size={17}/> Mark car purchased</>}</button></section>
      <section className="panel"><h2>Funding status</h2><div className="big-progress"><Progress value={available} max={total} color={gap?'#f59e0b':'#10b981'}/><strong>{Math.min(100,total?available/total*100:0).toFixed(0)}%</strong></div><div className={`callout ${gap?'warning':'success'}`}><AlertTriangle size={20}/><div><b>{gap?'Not fully funded yet':'Purchase envelope funded'}</b><span>{gap?`${money(gap)} is still missing. Keep insurance, registration, tax and repair money separate.`:'The complete first-month amount is available.'}</span></div></div></section></div></div>
}

function SettingsView({state,update,exportBackup,importBackup,reset}){return <div className="content-stack"><section className="panel"><h2>Profile and limits</h2><div className="form-grid"><Field label="Name"><input value={state.settings.name} onChange={e=>update(s=>s.settings.name=e.target.value)}/></Field><Field label="Monthly income"><input type="number" value={state.settings.monthlyIncome} onChange={e=>update(s=>s.settings.monthlyIncome=Number(e.target.value))}/></Field><Field label="Personal spending limit"><input type="number" value={state.settings.personalLimit} onChange={e=>update(s=>s.settings.personalLimit=Number(e.target.value))}/></Field></div></section>
  <section className="panel"><h2>Data and privacy</h2><p className="muted">Everything is stored locally on this device. No bank login and no cloud account are required.</p><div className="settings-actions"><button onClick={exportBackup}><Download size={17}/> Export backup</button><label className="button ghost"><Upload size={17}/> Import backup<input hidden type="file" accept="application/json" onChange={importBackup}/></label><button className="ghost danger-text" onClick={reset}><RotateCcw size={17}/> Reset app</button></div></section></div>}

function BottomNav({nav,tab,setTab}){return <nav className="bottom-nav">{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>}

function AppModal({modal,onClose,state,update,addActivity}){
  const [form,setForm]=useState(()=>{
    const x=modal.item||{};
    if(modal.type==='credit-edit')return {...state.credit};
    if(modal.type==='credit-extra')return {month:1,amount:20,note:''};
    if(modal.type.startsWith('klarna'))return {merchant:'',description:'',total:0,paid:0,installment:0,nextDue:today(),monthsRemaining:1,...x};
    if(modal.type.startsWith('debt'))return {name:'',type:'Credit card',balance:0,minPayment:0,apr:0,color:'#ef4444',...x};
    if(modal.type==='transaction-add')return {name:'',category:'Other',amount:0,date:today(),kind:'expense'};
    if(modal.type.startsWith('recurring'))return {name:'',category:'Other',amount:0,dueDay:1,...x};
    return {};
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=()=>{
    update(s=>{
      if(modal.type==='credit-edit'){s.credit={...s.credit,...form};addActivity(s,'Credit settings updated');}
      if(modal.type==='credit-extra'){s.credit.extraPayments.push({id:uid(),...form});addActivity(s,`Extra credit payment ${money(form.amount)} recorded`);}
      if(modal.type==='klarna-add'){s.klarna.push({id:uid(),...form});addActivity(s,`Klarna purchase added: ${form.merchant}`);}
      if(modal.type==='klarna-edit'){s.klarna=s.klarna.map(x=>x.id===modal.item.id?{...x,...form}:x);}
      if(modal.type==='klarna-pay'){const amt=Number(form.payment||0);s.klarna=s.klarna.map(x=>x.id===modal.item.id?{...x,paid:Math.min(x.total,Number(x.paid)+amt)}:x);addActivity(s,`Klarna payment ${money(amt)} recorded`);}
      if(modal.type==='debt-add')s.debts.push({id:uid(),...form});
      if(modal.type==='debt-edit')s.debts=s.debts.map(x=>x.id===modal.item.id?{...x,...form}:x);
      if(modal.type==='debt-pay'){const amt=Number(form.payment||0);s.debts=s.debts.map(x=>x.id===modal.item.id?{...x,balance:Math.max(0,x.balance-amt)}:x);}
      if(modal.type==='transaction-add')s.transactions.push({id:uid(),...form});
      if(modal.type==='recurring-add')s.recurring.push({id:uid(),...form});
      if(modal.type==='recurring-edit')s.recurring=s.recurring.map(x=>x.id===modal.item.id?{...x,...form}:x);
    });onClose();
  };
  const title={
    'credit-edit':'Edit credit','credit-extra':'Record advance payment','klarna-add':'Add Klarna purchase','klarna-edit':'Edit Klarna purchase','klarna-pay':'Record Klarna payment','debt-add':'Add debt','debt-edit':'Edit debt','debt-pay':'Record debt payment','transaction-add':'Add transaction','recurring-add':'Add recurring expense','recurring-edit':'Edit recurring expense'
  }[modal.type];
  const paymentOnly=modal.type==='klarna-pay'||modal.type==='debt-pay';
  return <Modal title={title} onClose={onClose}><div className="modal-body">
    {paymentOnly?<><Field label="Payment amount"><input autoFocus type="number" value={form.payment||''} onChange={e=>set('payment',e.target.value)}/></Field><p className="muted">The balance will be reduced immediately after saving.</p></>:
    modal.type==='credit-extra'?<><Field label="Credit month number"><input type="number" value={form.month} onChange={e=>set('month',Number(e.target.value))}/></Field><Field label="Extra amount"><input type="number" value={form.amount} onChange={e=>set('amount',Number(e.target.value))}/></Field><Field label="Note"><input value={form.note} onChange={e=>set('note',e.target.value)}/></Field></>:
    modal.type==='credit-edit'?<><Field label="Credit name"><input value={form.name} onChange={e=>set('name',e.target.value)}/></Field><div className="form-grid"><Field label="Principal"><input type="number" value={form.principal} onChange={e=>set('principal',Number(e.target.value))}/></Field><Field label="APR %"><input type="number" step="0.01" value={form.apr} onChange={e=>set('apr',Number(e.target.value))}/></Field><Field label="Contract months"><input type="number" value={form.months} onChange={e=>set('months',Number(e.target.value))}/></Field><Field label="Monthly payment"><input type="number" value={form.monthlyPayment} onChange={e=>set('monthlyPayment',Number(e.target.value))}/></Field></div><Field label="Start date"><input type="date" value={form.startDate} onChange={e=>set('startDate',e.target.value)}/></Field></>:
    modal.type.startsWith('klarna')?<><Field label="Merchant"><input value={form.merchant} onChange={e=>set('merchant',e.target.value)}/></Field><Field label="Description"><input value={form.description} onChange={e=>set('description',e.target.value)}/></Field><div className="form-grid"><Field label="Total purchase"><input type="number" value={form.total} onChange={e=>set('total',Number(e.target.value))}/></Field><Field label="Already paid"><input type="number" value={form.paid} onChange={e=>set('paid',Number(e.target.value))}/></Field><Field label="Instalment"><input type="number" value={form.installment} onChange={e=>set('installment',Number(e.target.value))}/></Field><Field label="Months remaining"><input type="number" value={form.monthsRemaining} onChange={e=>set('monthsRemaining',Number(e.target.value))}/></Field></div><Field label="Next due date"><input type="date" value={form.nextDue} onChange={e=>set('nextDue',e.target.value)}/></Field></>:
    modal.type.startsWith('debt')?<><Field label="Debt name"><input value={form.name} onChange={e=>set('name',e.target.value)}/></Field><div className="form-grid"><Field label="Type"><input value={form.type} onChange={e=>set('type',e.target.value)}/></Field><Field label="Balance"><input type="number" value={form.balance} onChange={e=>set('balance',Number(e.target.value))}/></Field><Field label="Minimum payment"><input type="number" value={form.minPayment} onChange={e=>set('minPayment',Number(e.target.value))}/></Field><Field label="APR %"><input type="number" value={form.apr} onChange={e=>set('apr',Number(e.target.value))}/></Field></div></>:
    modal.type==='transaction-add'?<><Field label="Transaction"><input value={form.name} onChange={e=>set('name',e.target.value)}/></Field><div className="form-grid"><Field label="Category"><input value={form.category} onChange={e=>set('category',e.target.value)}/></Field><Field label="Amount"><input type="number" value={form.amount} onChange={e=>set('amount',Number(e.target.value))}/></Field><Field label="Date"><input type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></Field><Field label="Type"><select value={form.kind} onChange={e=>set('kind',e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></Field></div></>:
    <><Field label="Name"><input value={form.name} onChange={e=>set('name',e.target.value)}/></Field><div className="form-grid"><Field label="Category"><input value={form.category} onChange={e=>set('category',e.target.value)}/></Field><Field label="Amount"><input type="number" value={form.amount} onChange={e=>set('amount',Number(e.target.value))}/></Field><Field label="Due day"><input type="number" min="1" max="31" value={form.dueDay} onChange={e=>set('dueDay',Number(e.target.value))}/></Field></div></>}
    <div className="modal-actions"><button className="ghost" onClick={onClose}>Cancel</button><button onClick={save}><Check size={17}/> Save</button></div>
  </div></Modal>;
}
