import React,{Suspense,lazy,useEffect,useMemo,useState} from 'react';
import {
 Activity,AlertTriangle,ArrowRight,Box,CheckCircle2,ChevronRight,Clock3,Cloud,Compass,
 DollarSign,HardDrive,Layers,Map,Minus,Monitor, Moon,Pause,Plane,Play,Plus,RefreshCw,
 RotateCcw,Route,ScanLine,Settings2,ShieldCheck,Ship,Sun,Truck,Wifi,Zap,X
} from 'lucide-react';
import {
 MODES,UPGRADES,SAVE_KEY,autoScanInterval,backlogCap,buyUpgrade,createGame,dispatchCheck,
 dispatchVehicle,findPackage,findVehicle,fleetByMode,metrics,nextAction,pullInbound,readSave,
 recommendedMode,requestCustoms,requestFlightClearance,routeCheck,routePackage,scanPackage,
 setPreference,tick,upgradeCost,urgencyLabel,writeSave,zoneLabel
} from './lib/engine.js';
import ExpressMap2D from './components/ExpressMap2D.jsx';
const ExpressScene3D=lazy(()=>import('./components/ExpressScene3D.jsx'));
const price=n=>'$'+Math.round(n).toLocaleString('en-US');
const time=n=>`${Math.max(0,Math.ceil(n))} dtk`;
const smallLabel={road:'DARAT',sea:'LAUT',air:'UDARA'};
const modeIcons={road:Truck,sea:Ship,air:Plane};
const statusText={ready:'SIAP DISPATCH',traveling:'DALAM PERJALANAN'};

class SceneBoundary extends React.Component{
 constructor(p){super(p);this.state={error:null};}
 static getDerivedStateFromError(error){return {error};}
 componentDidCatch(e){console.error('Z-Express 3D renderer',e);}
 render(){if(this.state.error)return <div className="scene-error"><Box size={36}/><h3>3D tidak dapat ditampilkan</h3><p>Game dan progres tetap aman. Mode 2D tidak memerlukan WebGL.</p><button onClick={this.props.onFallback}>Buka Mode Ringan 2D</button><small>{String(this.state.error.message||'WebGL unavailable')}</small></div>;return this.props.children;}
}
function IconButton({children,title,onClick,active=false,disabled=false}){return <button className={`icon-button ${active?'active':''}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>{children}</button>}
function Meter({value=0,color='blue'}){return <div className="progress-track"><div className={`progress-fill ${color}`} style={{width:`${Math.max(0,Math.min(100,value))}%`}}/></div>}
function Metric({icon:Icon,label,value,note,tone='blue'}){return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={19}/></div><div><small>{label}</small><strong>{value}</strong><span>{note}</span></div></div>}
function ParcelCard({p,selected,onClick,clock}){return <button className={`parcel-card ${selected?'selected':''} ${p.urgency==='sameday'?'urgent':''}`} onClick={onClick}>
 <span className="parcel-sign"><Box size={18}/></span><span className="parcel-info"><b>{p.id}</b><small>{p.city} · {zoneLabel(p.zone)}</small><small>{p.kg} kg · {urgencyLabel(p.urgency)}</small></span><span className="parcel-deadline"><b>{time(p.deadline-clock)}</b><span>{p.scanned?'SCANNED':'SCAN'}</span></span>
 </button>}
function GameInspector({selection,game,onClose,onFleet}){
 if(!selection)return null;
 const vehicle=selection.kind==='vehicle'?findVehicle(game,selection.id):null;
 const name=vehicle?vehicle.id:selection.kind==='conveyor'?'Automatic Sorting Conveyor':selection.kind==='motor'?'Kurir Motor Lokal':'National Sorting Hub';
 return <section className="inspector"><div className="inspector-head"><div><small>OBJECT INSPECTOR · LIVE STATUS</small><h3>{name}</h3></div><button aria-label="Tutup inspector" onClick={onClose}><X size={17}/></button></div>
 {vehicle?<><div className="inspector-line"><span>Moda</span><b>{MODES[vehicle.mode].name}</b></div><div className="inspector-line"><span>Status</span><b>{statusText[vehicle.status]}</b></div><div className="inspector-line"><span>Manifest</span><b>{vehicle.cargo.length}/{MODES[vehicle.mode].cap} paket</b></div><div className="inspector-line"><span>Berat</span><b>{vehicle.cargo.reduce((s,p)=>s+p.kg,0)} kg</b></div><div className="inspector-line"><span>ETA</span><b>{vehicle.status==='traveling'?time(vehicle.remaining):'—'}</b></div>{vehicle.mode==='air'&&<div className="inspector-line"><span>Airway Bill / ATC</span><b>{vehicle.flightState==='cleared'?'Cleared':vehicle.flightState==='processing'?'Diproses':'Belum diajukan'}</b></div>}<button className="secondary-button" onClick={()=>onFleet(vehicle.id)}>Kelola armada <ArrowRight size={14}/></button></>
 :<><div className="inspector-line"><span>Objek</span><b>{selection.kind==='motor'?'Last-mile delivery':selection.kind==='hub'?'Sorting facility':'Barcode scanner'}</b></div><div className="inspector-line"><span>Paket antre</span><b>{game.queue.length}</b></div><div className="inspector-line"><span>Kecepatan AI scan</span><b>{game.upgrades.scanner?`1/${autoScanInterval(game)} dtk`:'Manual'}</b></div><p className="info-copy">{selection.kind==='conveyor'?'Paket bergerak melewati laser scanner. Klik Scan Package untuk memeriksa label tujuan dan SLA.':selection.kind==='motor'?'Pengiriman lokal dan antarkota memakai armada darat. Prioritaskan rute udara untuk Same-Day.':'Pusat sortir menjadi penghubung seluruh rute darat, laut dan udara.'}</p></>}
 </section>;
}
function SortTab({game,parcel,selectedParcelId,setSelectedParcelId,route,handleScan,handleCustoms,handleRoute}){
 return <div className="tab-body"><div className="panel-kicker">INBOUND PACKAGE QUEUE <span>{game.queue.length}/{backlogCap(game)}</span></div>
 <div className="parcel-list">{game.queue.length?game.queue.map(p=><ParcelCard key={p.id} p={p} clock={game.clock} selected={p.id===parcel?.id} onClick={()=>setSelectedParcelId(p.id)}/>):<div className="empty-state"><CheckCircle2 size={23}/> Semua paket tersortir. Paket baru akan datang otomatis.</div>}</div>
 {parcel&&<section className="selected-package"><div className="selected-head"><span>PAKET TERPILIH</span><b>{parcel.id}</b></div>
 <div className="selected-grid"><span>Destinasi <b>{parcel.city}</b></span><span>Jenis <b>{zoneLabel(parcel.zone)}</b></span><span>Urgensi <b>{urgencyLabel(parcel.urgency)}</b></span><span>Bobot <b>{parcel.kg} kg</b></span></div>
 {!parcel.scanned?<button className="primary-button full" disabled={game.paused} onClick={()=>handleScan(parcel.id)}><ScanLine size={16}/> Scan Package / Barcode <ArrowRight size={16}/></button>:
 <><div className="scan-ok"><CheckCircle2 size={15}/> Barcode tervalidasi. Pilih moda pengiriman.</div>
 {parcel.zone==='international'&&<div className="customs"><div><ShieldCheck size={16}/><b>International Customs</b><span>{parcel.customs==='cleared'?'CLEARED':parcel.customs==='processing'?`Proses ${time(parcel.customsLeft)}`:'WAJIB CLEARANCE'}</span></div>{parcel.customs==='none'&&<button disabled={game.paused||game.cash<(game.upgrades.customs?0:25)} onClick={()=>handleCustoms(parcel.id)}>Ajukan dokumen {game.upgrades.customs?'(gratis)':'· $25'}</button>}</div>}
 <div className="route-header"><b>PILIH MODA PENGIRIMAN</b><small>Rekomendasi: {MODES[recommendedMode(parcel)].name}</small></div>
 <div className="routing-grid">{Object.entries(MODES).map(([mode,cfg])=>{const Icon=modeIcons[mode];const canFit=game.fleet.some(v=>v.mode===mode&&v.status==='ready'&&v.cargo.length<cfg.cap&&v.cargo.reduce((s,p)=>s+p.kg,0)+parcel.kg<=cfg.maxKg);const rule=routeCheck(parcel,mode);return <button key={mode} className={`route-choice ${mode===recommendedMode(parcel)?'suggested':''}`} disabled={game.paused||!canFit} onClick={()=>handleRoute(parcel.id,mode)} title={canFit?rule.reason:'Tidak ada armada yang memiliki ruang kosong'}><Icon size={20}/><strong>{smallLabel[mode]}</strong><small>{mode===recommendedMode(parcel)?'DISARANKAN':rule.ok?'ALTERNATIF':'TIDAK SESUAI'}</small></button>})}</div>
 <p className="route-help"><AlertTriangle size={13}/> Salah memilih moda dapat mengurangi reputasi. Internasional dan Same-Day wajib udara.</p></>}
 </section>}
 </div>;
}
function FleetTab({game,onClearance,onDispatch,onInspect}){
 return <div className="tab-body"><div className="panel-kicker">ARMADA DAN MANIFEST <span>{game.fleet.length} UNIT</span></div>
 <div className="fleet-list">{game.fleet.map(v=>{const cfg=MODES[v.mode],Icon=modeIcons[v.mode],check=dispatchCheck(game,v.id),weight=v.cargo.reduce((s,p)=>s+p.kg,0);return <section className="fleet-card" key={v.id}><div className="fleet-title"><span className={`fleet-mode ${v.mode}`}><Icon size={19}/></span><div><b>{v.id}</b><small>{cfg.label}</small></div><span className={`status ${v.status}`}>{v.status==='traveling'?'ON ROUTE':'READY'}</span></div>
 <div className="fleet-meta"><span>Manifest <b>{v.cargo.length}/{cfg.cap} paket</b></span><span>Berat <b>{weight}/{cfg.maxKg} kg</b></span></div><Meter value={100*v.cargo.length/cfg.cap} color={v.mode==='air'?'purple':v.mode==='sea'?'teal':'blue'}/>
 {v.cargo.length>0&&<div className="manifest-ids">{v.cargo.map(p=><span key={p.id}>{p.id} · {p.city}</span>)}</div>}
 {v.status==='traveling'?<div className="eta"><Clock3 size={15}/> Dalam perjalanan · ETA {time(v.remaining)}</div>:
 <>{v.mode==='air'&&v.cargo.length>0&&<div className="clearance"><span>Flight Clearance: <b>{v.flightState==='cleared'?'APPROVED':v.flightState==='processing'?`PROSES ${time(v.flightLeft)}`:'BELUM ADA'}</b></span>{v.flightState==='none'&&<button disabled={game.paused||game.cash<40} onClick={()=>onClearance(v.id)}>Ajukan ATC · $40</button>}</div>}
 <button className="primary-button full" title={check.reason} disabled={!check.ok} onClick={()=>onDispatch(v.id)}><ArrowRight size={15}/> Dispatch {cfg.name} · {price(cfg.dispatchCost)}</button></>}
 <button className="text-button" onClick={()=>onInspect({kind:'vehicle',id:v.id})}>Lihat detail objek <ChevronRight size={13}/></button>
 </section>})}</div></div>;
}
function UpgradeTab({game,onUpgrade}){return <div className="tab-body"><div className="panel-kicker">INVESTASI HUB <span>SALDO {price(game.cash)}</span></div><p className="upgrades-intro">Setiap upgrade di sini mengubah aturan simulasi. Pilih sesuai bottleneck yang terjadi.</p><div className="upgrade-list">{Object.entries(UPGRADES).map(([key,u])=>{const level=game.upgrades[key],maxed=level>=u.cap,cost=upgradeCost(game,key);return <section key={key} className="upgrade-card"><div><b>{u.name}</b><span>LEVEL {level}/{u.cap}</span></div><p>{u.description}</p><button disabled={maxed||game.paused||game.cash<cost} onClick={()=>onUpgrade(key)}>{maxed?'MAKSIMUM':`Upgrade · ${price(cost)}`}<Plus size={14}/></button></section>})}</div></div>}
function MainApp(){
 const [game,setGame]=useState(()=>{const loaded=readSave(window.localStorage);return loaded.view==='3d'?{...loaded,view:'2d'}:loaded;});
 const [tab,setTab]=useState('sort');
 const [selectedParcelId,setSelectedParcelId]=useState(null);
 const [selection,setSelection]=useState(null);
 const [notice,setNotice]=useState(null);
 const [sceneFailed,setSceneFailed]=useState(false);
 const [zoomSignal,setZoomSignal]=useState(null);
 const [resetConfirm,setResetConfirm]=useState(false);
 const met=metrics(game),parcel=game.queue.find(x=>x.id===selectedParcelId)||game.queue[0]||null;
 const next=nextAction(game,parcel?.id);
 useEffect(()=>{const id=setInterval(()=>{if(!document.hidden)setGame(g=>tick(g,1*g.speed));},1000);return()=>clearInterval(id);},[]);
 useEffect(()=>{writeSave(window.localStorage,game);},[game]);
 const toast=(message,kind='warning')=>setNotice({message,kind,key:Date.now()});
 const chooseObject=obj=>{setSelection(obj);if(obj?.kind==='vehicle')setTab('fleet');};
 const update=fn=>setGame(g=>fn(g));
 const handleRoute=(id,mode)=>{const cfg=MODES[mode],v=game.fleet.find(x=>x.mode===mode&&x.status==='ready'&&x.cargo.length<cfg.cap&&x.cargo.reduce((s,a)=>s+a.kg,0)+(findPackage(game,id)?.kg||0)<=cfg.maxKg);const result=routePackage(game,id,mode,v?.id);
  if(result.error)toast(result.error,'error');else toast(`Paket ${id} dimuat ke ${v.id}.`,'success');setGame(result.game);};
 const handleContext=()=>{
  if(next.action==='resume')return update(g=>setPreference(g,'paused',false));
  if(next.action==='scan')return update(g=>scanPackage(g,next.id));
  if(next.action==='customs')return update(g=>requestCustoms(g,next.id));
  if(next.action==='route')return handleRoute(next.id,next.mode);
  if(next.action==='inbound'){const before=game;const result=pullInbound(game);if(before===result)toast('Pickup vendor belum tersedia. Periksa saldo, cooldown, atau kapasitas antrean.');else setGame(result);return;}
  setTab('fleet');
 };
 const onScan=id=>{update(g=>scanPackage(g,id));};
 const onCustoms=id=>{if(game.queue.find(p=>p.id===id)?.customs==='processing')return;update(g=>requestCustoms(g,id));};
 const onClearance=id=>update(g=>requestFlightClearance(g,id));
 const onDispatch=id=>{const c=dispatchCheck(game,id);if(!c.ok)return toast(c.reason);update(g=>dispatchVehicle(g,id));toast(`${id} berhasil dispatch. Pendapatan dibayarkan setelah tiba.`,'success');};
 const confirmReset=()=>{setGame(createGame());setTab('sort');setSelectedParcelId(null);setSelection(null);setNotice(null);setResetConfirm(false);};
 const changeView=view=>{update(g=>setPreference(g,'view',view));setSceneFailed(false);};
 return <div className={`app ${game.theme==='dark'?'dark':''}`}>
 <header className="topbar"><div className="brand"><img src="/favicon.svg" alt="Logo Z"/><div><b>Zidane <span>Express Operations</span></b><small>National Dispatch Control Tower · Jakarta</small></div></div>
 <div className="top-status"><span className="live"><span className="dot green"/> LIVE SIMULATION</span><span><Clock3 size={14}/> Shift {Math.floor(game.clock/60)}m {Math.floor(game.clock%60)}s</span></div>
 <div className="top-actions"><button className="pill small" onClick={()=>update(g=>setPreference(g,'speed',g.speed===1?2:g.speed===2?4:1))} title="Ubah kecepatan simulasi">{game.speed}×</button><IconButton title={game.paused?'Lanjutkan':'Jeda'} onClick={()=>update(g=>setPreference(g,'paused',!g.paused))}>{game.paused?<Play size={17}/>:<Pause size={17}/>}</IconButton><IconButton title="Light / Dark Mode" onClick={()=>update(g=>setPreference(g,'theme',g.theme==='light'?'dark':'light'))}>{game.theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</IconButton><img className="avatar" src="/manager-avatar.svg" alt="Avatar operations controller"/></div></header>
 <main className="main"><div className="metric-row"><Metric icon={DollarSign} label="SALDO OPERASIONAL" value={price(game.cash)} note="Cash game lokal" tone="blue"/><Metric icon={Box} label="PAKET DELIVERED" value={met.delivered} note={`+${met.sorted} paket siap kirim`} tone="teal"/><Metric icon={ShieldCheck} label="CUSTOMER SATISFACTION" value={`${met.satisfaction}%`} note={`OTD ${met.onTime}% · ${game.stats.errors} salah rute`} tone="green"/><Metric icon={Plane} label="ACTIVE AIRCRAFT" value={met.activeAircraft} note={`${fleetByMode(game,'air').length} pesawat tersedia`} tone="purple"/></div>
 <div className="work-grid">
 <aside className="left-rail">
  <section className="panel priority"><div className="eyebrow"><Zap size={15}/> REKOMENDASI SEKARANG</div><h2>{next.title}</h2><p>{next.description}</p><button className="primary-button full" onClick={handleContext} disabled={next.action==='customs'&&parcel?.customs==='processing'}>{next.action==='customs'&&parcel?.customs==='processing'?'Menunggu clearance':next.action==='resume'?'Lanjutkan simulasi':next.action==='inbound'?'Tarik inbound baru':next.action==='fleet'?'Kelola armada':'Jalankan tindakan'}<ArrowRight size={16}/></button></section>
  <section className="panel facility"><div className="panel-heading"><b><Layers size={16}/> STATUS SORTING HUB</b><span className="green-text">LIVE</span></div><div className="row-between"><span>Antrean paket</span><b>{met.queue}/{backlogCap(game)}</b></div><Meter value={met.queue/backlogCap(game)*100} color={met.queue>backlogCap(game)*.75?'orange':'blue'}/><div className="row-between"><span>Paket dalam armada</span><b>{met.sorted}</b></div><Meter value={met.sorted/Math.max(1,game.fleet.reduce((s,v)=>s+MODES[v.mode].cap,0))*100} color="teal"/>
  <div className="facility-mini"><div><Truck size={17}/><b>{fleetByMode(game,'road').length}</b><small>Darat</small></div><div><Ship size={17}/><b>{fleetByMode(game,'sea').length}</b><small>Laut</small></div><div><Plane size={17}/><b>{fleetByMode(game,'air').length}</b><small>Udara</small></div></div>
  <button className="secondary-button full" disabled={game.paused||game.inboundCooldown>0||game.cash<35||met.queue>backlogCap(game)-2} onClick={()=>{const n=pullInbound(game);if(n===game)toast('Inbound belum bisa ditarik.');else setGame(n);}}><Plus size={15}/> Pickup inbound · $35 <span>{game.inboundCooldown>0?time(game.inboundCooldown):'+2 paket'}</span></button></section>
  <section className="panel rules"><div className="panel-heading"><b><Route size={16}/> ATURAN RUTE</b></div><div className="rule"><Truck size={17}/><span><b>Darat</b><small>Lokal & antar-kota regular</small></span></div><div className="rule"><Ship size={17}/><span><b>Laut</b><small>Antar-pulau reguler / berat</small></span></div><div className="rule"><Plane size={17}/><span><b>Udara</b><small>Internasional & Same-Day wajib</small></span></div></section>
  <section className="panel recent"><div className="panel-heading"><b><Activity size={16}/> AKTIVITAS TERBARU</b></div>{game.logs.slice(0,4).map(event=><div className="log" key={event.id}><span className={`dot ${event.kind==='danger'?'red':event.kind==='success'?'green':'blue'}`}/><p>{event.message}</p></div>)}</section>
 </aside>
 <section className="scene-column"><div className={`scene-area ${notice?.kind==='error'?'scene-shake':''}`}>
  <div className="scene-status"><span className="scene-badge"><span className="dot green"/> {game.view==='3d'?'LIVE 3D SORTING HUB':'INTERACTIVE 2D OPERATIONS'}</span><span className="sub-badge">{game.quality==='eco'?'ECO GRAPHICS':'NORMAL GRAPHICS'}</span></div>
  <div className="scene-tools"><button className={`scene-tool ${game.view==='3d'?'selected':''}`} onClick={()=>changeView('3d')} title="Mode 3D"><Box size={17}/></button><button className={`scene-tool ${game.view==='2d'?'selected':''}`} onClick={()=>changeView('2d')} title="Mode Ringan 2D"><Map size={17}/></button>{game.view==='3d'&&<><button className="scene-tool" onClick={()=>setZoomSignal({kind:'out',key:Date.now()})} title="Zoom out"><Minus size={17}/></button><button className="scene-tool" onClick={()=>setZoomSignal({kind:'in',key:Date.now()})} title="Zoom in"><Plus size={17}/></button><button className="scene-tool" onClick={()=>setZoomSignal({kind:'reset',key:Date.now()})} title="Reset kamera"><RotateCcw size={16}/></button></>}<button className="scene-tool quality" onClick={()=>update(g=>setPreference(g,'quality',g.quality==='eco'?'normal':'eco'))} title="Ganti kualitas grafis">{game.quality==='eco'?'MODE HEMAT':'NORMAL'}</button></div>
  {game.view==='3d'&&!sceneFailed?<SceneBoundary onFallback={()=>changeView('2d')}><Suspense fallback={<div className="scene-loading"><RefreshCw size={24}/> Memuat 3D Sorting Hub...</div>}><ExpressScene3D game={game} selection={selection} onSelect={chooseObject} zoomSignal={zoomSignal}/></Suspense></SceneBoundary>:<ExpressMap2D game={game} selection={selection} onSelect={chooseObject}/>}
  {selection&&<GameInspector selection={selection} game={game} onClose={()=>setSelection(null)} onFleet={id=>{setTab('fleet');setSelection(null);}}/>}
  {game.paused&&<div className="paused-chip"><Pause size={15}/> SIMULASI DIJEDA <button onClick={()=>update(g=>setPreference(g,'paused',false))}>Lanjutkan <Play size={13}/></button></div>}
  {notice?.kind==='error'&&<div key={notice.key} className="route-error-flash" aria-hidden="true"/>}
  {notice&&<div className={`notice ${notice.kind}`}><AlertTriangle size={16}/><span>{notice.message}</span><button aria-label="Tutup pemberitahuan" onClick={()=>setNotice(null)}><X size={14}/></button></div>}
  <div className="scene-bottom"><span>Drag: orbit · Scroll: zoom · Klik objek: status</span><span>Hub Jakarta · Local simulation</span></div>
 </div>
 <div className="scene-footer"><span><span className="dot blue"/> {met.queue} pending parcels</span><span><span className="dot orange"/> {met.sorted} ready cargo</span><span><span className="dot green"/> {game.fleet.filter(v=>v.status==='traveling').length} on-road / sea / air</span></div>
 <div className="flow-guide"><span><ScanLine size={15}/> SCAN</span><ChevronRight size={14}/><span><Route size={15}/> ROUTE</span><ChevronRight size={14}/><span><Truck size={15}/> LOAD</span><ChevronRight size={14}/><span><Plane size={15}/> DISPATCH</span><ChevronRight size={14}/><span><CheckCircle2 size={15}/> DELIVER</span></div>
 </section>
 <aside className="right-rail"><div className="console-heading"><h2>Operations Console</h2><span><span className="dot green"/> LIVE</span></div><div className="tabs"><button className={tab==='sort'?'active':''} onClick={()=>setTab('sort')}><ScanLine size={15}/> Sortir</button><button className={tab==='fleet'?'active':''} onClick={()=>setTab('fleet')}><Truck size={15}/> Armada</button><button className={tab==='upgrade'?'active':''} onClick={()=>setTab('upgrade')}><Settings2 size={15}/> Upgrade</button></div>
 {tab==='sort'?<SortTab game={game} parcel={parcel} selectedParcelId={selectedParcelId} setSelectedParcelId={setSelectedParcelId} handleScan={onScan} handleCustoms={onCustoms} handleRoute={handleRoute}/>:tab==='fleet'?<FleetTab game={game} onClearance={onClearance} onDispatch={onDispatch} onInspect={chooseObject}/>:<UpgradeTab game={game} onUpgrade={key=>update(g=>buyUpgrade(g,key))}/>}
 </aside></div>
 <div className="bottom-row"><div><b><Activity size={15}/> Riwayat Pengiriman</b><span>Setiap pembayaran berasal dari paket yang berhasil tiba di tujuan.</span></div><div className="history-items">{game.shipmentHistory.length?game.shipmentHistory.slice(0,3).map(p=><span key={p.id}>{p.id} · {p.city} <strong className={p.punctual?'green-text':'orange-text'}>+{price(p.paid)}</strong></span>):<span>Belum ada pengiriman selesai. Mulai dari Scan Package.</span>}</div><IconButton title="Reset semua progres Z-Express" onClick={()=>setResetConfirm(true)}><RefreshCw size={16}/></IconButton></div>
 </main>
 <footer>© 2026 Zidane Operations · Z-Express <span>Standalone · Save lokal di browser · Tanpa sinkronisasi dengan FMCG/Mining</span></footer>
 {resetConfirm&&<div className="confirm-backdrop"><div className="confirm"><AlertTriangle size={24}/><h3>Reset seluruh progres Z-Express?</h3><p>Semua paket, cash, upgrade, dan manifest pada browser ini kembali ke awal. Game lain tidak terpengaruh.</p><div><button onClick={()=>setResetConfirm(false)}>Batal</button><button className="danger" onClick={confirmReset}>Reset Z-Express</button></div></div></div>}
 </div>;
}
export default MainApp;
