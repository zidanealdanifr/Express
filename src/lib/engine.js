export const SAVE_KEY='zidane.express.operations.v1';
export const GAME_VERSION=1;
export const MODES={road:{name:'Darat',label:'Mobil box & motor',duration:24,dispatchCost:28,color:'#2477e9',cap:5,maxKg:120},sea:{name:'Laut',label:'Kapal Ro-Ro Express',duration:52,dispatchCost:62,color:'#0d9ca9',cap:5,maxKg:550},air:{name:'Udara',label:'Pesawat kargo',duration:18,dispatchCost:105,color:'#8b65da',cap:4,maxKg:180}};
export const UPGRADES={
 scanner:{name:'AI Barcode Scanner',description:'Pindai paket otomatis. Level lebih tinggi mempercepat scanner.',cost:850,cap:2},
 sorter:{name:'Sorting Conveyor',description:'Tambahkan 4 slot antrean dan bonus handling per paket.',cost:700,cap:2},
 customs:{name:'Lisensi Customs Digital',description:'Otomatis mengurus clearance internasional tanpa biaya per paket.',cost:1350,cap:1},
 aircraft:{name:'Pesawat Kargo Tambahan',description:'Buka armada udara kedua yang dapat dispatch mandiri.',cost:2800,cap:1},
 trucks:{name:'Mobil Box Tambahan',description:'Tambah armada jalan raya dan kapasitas pengiriman.',cost:1400,cap:1},
 vessel:{name:'Kapal Express Tambahan',description:'Tambah armada antar-pulau.',cost:1900,cap:1},
 service:{name:'Layanan Priority Hub',description:'Tingkatkan pendapatan pengiriman dan bonus SLA.',cost:1250,cap:2}
};
export const DESTINATIONS=[
 {city:'Jakarta',zone:'local',urgency:'regular',kg:4},
 {city:'Bandung',zone:'intercity',urgency:'express',kg:9},
 {city:'Makassar',zone:'interisland',urgency:'regular',kg:44},
 {city:'Singapura',zone:'international',urgency:'express',kg:7},
 {city:'Bogor',zone:'local',urgency:'sameday',kg:2},
 {city:'Surabaya',zone:'intercity',urgency:'regular',kg:25},
 {city:'Balikpapan',zone:'interisland',urgency:'regular',kg:31},
 {city:'Tokyo',zone:'international',urgency:'express',kg:11},
 {city:'Yogyakarta',zone:'intercity',urgency:'sameday',kg:5},
 {city:'Denpasar',zone:'interisland',urgency:'express',kg:15},
 {city:'Tangerang',zone:'local',urgency:'regular',kg:6},
 {city:'Kuala Lumpur',zone:'international',urgency:'regular',kg:22},
 {city:'Medan',zone:'interisland',urgency:'regular',kg:36},
 {city:'Semarang',zone:'intercity',urgency:'express',kg:8}
];
export const zoneLabel=z=>({local:'Lokal',intercity:'Antar-Kota',interisland:'Antar-Pulau',international:'Internasional'}[z]||z);
export const urgencyLabel=u=>({regular:'Regular',express:'Express',sameday:'Same-Day'}[u]||u);
const lifeOf=p=>p.urgency==='sameday'?48:p.urgency==='express'?105:p.zone==='international'?160:p.zone==='interisland'?165:145;
const round=n=>Math.round(n*10)/10;
const log=(g,message,kind='info')=>{g.logs.unshift({id:`EV-${g.nextEvent++}`,time:Math.floor(g.clock),message,kind});g.logs=g.logs.slice(0,10);};
const copy=g=>structuredClone(g);
const createVehicle=(mode,seq)=>({id:`${mode==='road'?'RD':mode==='sea'?'SEA':'AIR'}-${String(seq).padStart(2,'0')}`,mode,status:'ready',cargo:[],remaining:0,total:0,flightState:'none',flightLeft:0,dispatchCost:0});
export const fleetByMode=(g,mode)=>g.fleet.filter(v=>v.mode===mode);
export const backlogCap=g=>10+4*g.upgrades.sorter;
export const autoScanInterval=g=>g.upgrades.scanner===2?6:g.upgrades.scanner===1?12:Infinity;
export const upgradeCost=(g,key)=>{const u=UPGRADES[key];return u?Math.round(u.cost*(1+.6*(g.upgrades[key]||0))):Infinity;};
export function createGame(){
 const g={version:GAME_VERSION,clock:0,paused:false,speed:1,theme:'light',view:'2d',quality:'eco',cash:4800,reputation:92,
  queue:[],fleet:[createVehicle('road',1),createVehicle('sea',1),createVehicle('air',1)],nextParcel:1,nextEvent:1,
  upgrades:{scanner:0,sorter:0,customs:0,aircraft:0,trucks:0,vessel:0,service:0},
  stats:{delivered:0,onTime:0,late:0,errors:0,missions:0,revenue:0,shipments:0},logs:[],shipmentHistory:[],
  spawnLeft:11,autoScanLeft:12,inboundCooldown:0,overflow:0};
 for(let i=0;i<5;i++)g.queue.push(makeParcel(g,DESTINATIONS[i]));
 log(g,'Shift dimulai. Pindai paket pertama, pilih moda, dan kirimkan armada.','success');
 return g;
}
function makeParcel(g,template){
 const id=`ZX-${String(g.nextParcel++).padStart(5,'0')}`;
 return {id,city:template.city,zone:template.zone,urgency:template.urgency,kg:template.kg,
  created:g.clock,deadline:g.clock+lifeOf(template),scanned:false,customs:'none',customsLeft:0,invalidModes:[]};
}
export function recommendedMode(p){if(p.zone==='international'||p.urgency==='sameday')return 'air';if(p.zone==='interisland')return p.urgency==='regular'?'sea':'air';return 'road';}
export function routeCheck(p,mode){
 if(!MODES[mode])return {ok:false,reason:'Moda tidak tersedia.'};
 if(p.zone==='international'&&mode!=='air')return {ok:false,reason:'INVALID ROUTE: Paket internasional wajib menggunakan Air Freight.'};
 if(p.urgency==='sameday'&&mode!=='air')return {ok:false,reason:'INVALID ROUTE: Same-Day Express wajib melalui jalur udara.'};
 if(p.zone==='interisland'&&mode==='road')return {ok:false,reason:'INVALID ROUTE: Antar-pulau tidak dapat melewati rute darat.'};
 if((p.zone==='local'||p.zone==='intercity')&&mode==='sea')return {ok:false,reason:'INVALID ROUTE: Rute dalam satu pulau tidak menggunakan kapal laut.'};
 return {ok:true,optimal:mode===recommendedMode(p),reason:mode===recommendedMode(p)?'Rute efisien.':'Rute valid, tetapi biaya operasional lebih tinggi.'};
}
export const findVehicle=(g,id)=>g.fleet.find(v=>v.id===id);
export const findPackage=(g,id)=>g.queue.find(p=>p.id===id);
export function scanPackage(g,id){
 const p=findPackage(g,id);if(g.paused||!p||p.scanned)return g;
 const n=copy(g);findPackage(n,id).scanned=true;log(n,`${id} dipindai · ${p.city} · ${urgencyLabel(p.urgency)}.`,'success');return n;
}
export function requestCustoms(g,id){
 const p=findPackage(g,id);if(g.paused||!p||!p.scanned||p.zone!=='international'||p.customs!=='none')return g;
 const charge=g.upgrades.customs?0:25;if(g.cash<charge)return g;
 const n=copy(g),item=findPackage(n,id);n.cash-=charge;item.customs='processing';item.customsLeft=g.upgrades.customs?3:6;
 log(n,`Dokumen ${id} diajukan untuk Customs Clearance.`,'info');return n;
}
export function routePackage(g,id,mode,vehicleId){
 const p=findPackage(g,id),v=findVehicle(g,vehicleId);
 if(g.paused||!p||!p.scanned||!MODES[mode]||!v||v.mode!==mode||v.status!=='ready')return {game:g,error:'Pilih paket yang sudah dipindai dan armada tersedia.'};
 const rule=routeCheck(p,mode);
 if(!rule.ok){
  if(p.invalidModes.includes(mode))return {game:g,error:rule.reason};
  const n=copy(g);findPackage(n,id).invalidModes.push(mode);n.reputation=Math.max(0,n.reputation-7);n.stats.errors++;
  log(n,`${id}: ${rule.reason}`,'danger');return {game:n,error:rule.reason};
 }
 if(p.zone==='international'&&p.customs!=='cleared')return {game:g,error:'Customs Clearance internasional belum selesai.'};
 const spec=MODES[mode];if(v.cargo.length>=spec.cap)return {game:g,error:`Armada ${v.id} penuh (${spec.cap} paket).`};
 if(v.cargo.reduce((a,x)=>a+x.kg,0)+p.kg>spec.maxKg)return {game:g,error:`Kapasitas berat ${v.id} hanya ${spec.maxKg} kg.`};
 const n=copy(g),unit=findVehicle(n,vehicleId);
 unit.cargo.push({...p,optimal:rule.optimal});
 unit.flightState='none';unit.flightLeft=0;
 n.queue=n.queue.filter(x=>x.id!==id);
 log(n,`${id} disortir ke ${unit.id} · ${spec.name}${rule.optimal?' (optimal)':' (rute premium)'}.`,'success');
 return {game:n,error:null};
}
export function requestFlightClearance(g,id){
 const v=findVehicle(g,id);if(g.paused||!v||v.mode!=='air'||v.status!=='ready'||v.cargo.length===0||v.flightState!=='none')return g;
 const charge=40;if(g.cash<charge)return g;
 const n=copy(g),unit=findVehicle(n,id);n.cash-=charge;unit.flightState='processing';unit.flightLeft=4;
 log(n,`ATC Flight Clearance untuk ${id} diajukan.`,'info');return n;
}
export function dispatchCheck(g,id){
 const v=findVehicle(g,id);if(!v)return {ok:false,reason:'Armada tidak ditemukan.'};
 if(g.paused)return {ok:false,reason:'Lanjutkan simulasi lebih dahulu.'};
 if(v.status!=='ready')return {ok:false,reason:'Armada sedang mengantar paket.'};
 if(!v.cargo.length)return {ok:false,reason:'Pilih dan muat paket ke armada terlebih dahulu.'};
 if(v.mode==='air'&&v.flightState!=='cleared')return {ok:false,reason:'Ajukan Flight Clearance terlebih dahulu.'};
 if(g.cash<MODES[v.mode].dispatchCost)return {ok:false,reason:'Saldo belum cukup untuk biaya dispatch.'};
 return {ok:true,reason:'Siap dispatch.'};
}
export function dispatchVehicle(g,id){
 const checked=dispatchCheck(g,id);if(!checked.ok)return g;
 const n=copy(g),v=findVehicle(n,id),cfg=MODES[v.mode];
 n.cash-=cfg.dispatchCost;v.dispatchCost=cfg.dispatchCost;v.status='traveling';v.remaining=cfg.duration;v.total=cfg.duration;
 n.stats.shipments++;log(n,`${v.id} berangkat membawa ${v.cargo.length} paket melalui jalur ${cfg.name}.`,'success');return n;
}
function arrival(g,v){
 let revenue=0,onTime=0;
 for(const p of v.cargo){
  const base=38+p.kg*3+(p.zone==='international'?145:p.zone==='interisland'?100:p.zone==='intercity'?40:15);
  const bonus=p.urgency==='sameday'?1.6:p.urgency==='express'?1.3:1;
  const punctual=g.clock<=p.deadline+.001;const paid=Math.round(base*bonus*(1+g.upgrades.service*.16)*(punctual?1:.58)*(p.optimal?1:.80));
  revenue+=paid;onTime+=punctual?1:0;g.stats.delivered++;if(punctual)g.stats.onTime++;else g.stats.late++;
  g.reputation=Math.min(100,Math.max(0,g.reputation+(punctual?1:-3)));
  g.shipmentHistory.unshift({id:p.id,city:p.city,mode:v.mode,time:Math.floor(g.clock),paid,punctual});
 }
 g.shipmentHistory=g.shipmentHistory.slice(0,8);
 g.cash+=revenue;g.stats.revenue+=revenue;
 log(g,`${v.id} selesai mengantar ${v.cargo.length} paket (${onTime} tepat waktu) · +$${revenue.toLocaleString('en-US')}.`,'success');
 v.status='ready';v.cargo=[];v.remaining=0;v.total=0;v.flightState='none';v.flightLeft=0;v.dispatchCost=0;
}
export function pullInbound(g){
 if(g.paused||g.inboundCooldown>0||g.queue.length>=backlogCap(g)-1||g.cash<35)return g;
 const n=copy(g);n.cash-=35;n.inboundCooldown=18;
 for(let k=0;k<2;k++)n.queue.push(makeParcel(n,DESTINATIONS[(n.nextParcel+k*2+3)%DESTINATIONS.length]));
 log(n,'Pickup vendor menambah 2 paket ke jalur inbound (-$35).','info');return n;
}
export function buyUpgrade(g,key){
 const upgrade=UPGRADES[key];if(!upgrade||g.paused||(g.upgrades[key]||0)>=upgrade.cap)return g;
 const cost=upgradeCost(g,key);if(g.cash<cost)return g;
 const n=copy(g);n.cash-=cost;n.upgrades[key]++;
 if(key==='aircraft')n.fleet.push(createVehicle('air',fleetByMode(n,'air').length+1));
 if(key==='trucks')n.fleet.push(createVehicle('road',fleetByMode(n,'road').length+1));
 if(key==='vessel')n.fleet.push(createVehicle('sea',fleetByMode(n,'sea').length+1));
 log(n,`${upgrade.name} ditingkatkan ke level ${n.upgrades[key]} (-$${cost}).`,'upgrade');return n;
}
export function setPreference(g,key,value){
 const allowed={paused:[true,false],speed:[1,2,4],theme:['light','dark'],view:['2d','3d'],quality:['eco','normal']};
 if(!allowed[key]?.includes(value)||g[key]===value)return g;
 const n=copy(g);n[key]=value;return n;
}
export function tick(g,delta=.5){
 if(g.paused||!Number.isFinite(delta)||delta<=0)return g;
 const dt=Math.min(delta,8),n=copy(g);n.clock=round(n.clock+dt);
 n.inboundCooldown=Math.max(0,round(n.inboundCooldown-dt));n.spawnLeft-=dt;
 for(let safety=0;n.spawnLeft<=0&&safety<3;safety++){
  n.spawnLeft+=12;
  if(n.queue.length<backlogCap(n))n.queue.push(makeParcel(n,DESTINATIONS[(n.nextParcel*7+3)%DESTINATIONS.length]));
  else {n.overflow++;if(n.overflow%4===1){n.reputation=Math.max(0,n.reputation-1);log(n,'Antrean inbound penuh. Sortir paket sebelum reputasi menurun.','warning');}}
 }
 if(n.upgrades.scanner>0){n.autoScanLeft-=dt;
  for(let safety=0;n.autoScanLeft<=0&&safety<3;safety++){
   n.autoScanLeft+=autoScanInterval(n);
   const p=n.queue.find(x=>!x.scanned);if(p){p.scanned=true;log(n,`${p.id} dipindai oleh AI Scanner.`,'info');}
  }
 }
 for(const p of n.queue){
  if(n.upgrades.customs&&p.zone==='international'&&p.scanned&&p.customs==='none'){
   p.customs='processing';p.customsLeft=3;
  }
  if(p.customs==='processing'){
   p.customsLeft=Math.max(0,round(p.customsLeft-dt));if(p.customsLeft<=0){p.customs='cleared';log(n,`Customs Clearance ${p.id} disetujui.`,'success');}
  }
 }
 for(const v of n.fleet){
  if(v.flightState==='processing'){
   v.flightLeft=Math.max(0,round(v.flightLeft-dt));if(v.flightLeft<=0){v.flightState='cleared';log(n,`Flight Clearance ${v.id} disetujui.`,'success');}
  }
  if(v.status==='traveling'){
   v.remaining=round(v.remaining-dt);if(v.remaining<=0)arrival(n,v);
  }
 }
 return n;
}
export const metrics=g=>({delivered:g.stats.delivered,satisfaction:Math.max(0,Math.min(100,Math.round(g.reputation))),onTime:g.stats.delivered?Math.round(100*g.stats.onTime/g.stats.delivered):100,activeAircraft:g.fleet.filter(v=>v.mode==='air'&&v.status==='traveling').length,queue:g.queue.length,sorted:g.fleet.reduce((s,v)=>s+v.cargo.length,0)});
export function nextAction(g,id){
 if(g.paused)return {title:'Simulasi dijeda',description:'Lanjutkan simulasi agar operasi berjalan kembali.',action:'resume'};
 const p=findPackage(g,id)||g.queue[0];
 if(!p){const ready=g.fleet.find(v=>v.status==='ready'&&v.cargo.length);return ready?{title:`Dispatch ${ready.id}`,description:'Muatan sudah tersedia untuk diberangkatkan.',action:'fleet',id:ready.id}:{title:'Antrean tersortir',description:'Tunggu paket baru atau tarik pickup vendor.',action:'inbound'};}
 if(!p.scanned)return {title:`Scan ${p.id}`,description:`Periksa barcode dan tujuan ${p.city}.`,action:'scan',id:p.id};
 if(p.zone==='international'&&p.customs!=='cleared')return {title:'Urus Customs Clearance',description:p.customs==='processing'?'Dokumen sedang diproses.':'Dokumen internasional wajib dinyatakan clear.',action:'customs',id:p.id};
 const mode=recommendedMode(p),v=g.fleet.find(x=>x.mode===mode&&x.status==='ready'&&x.cargo.length<MODES[mode].cap&&x.cargo.reduce((s,a)=>s+a.kg,0)+p.kg<=MODES[mode].maxKg);
 return v?{title:`Rute ${MODES[mode].name} ke ${p.city}`,description:`Muatan sesuai SLA. Armada ${v.id} tersedia.`,action:'route',id:p.id,mode,vehicleId:v.id}:{title:'Siapkan armada tersedia',description:`Armada ${MODES[mode].name} sedang penuh atau dalam perjalanan. Dispatch lebih dahulu.`,action:'fleet',mode};
}
export function readSave(storage){try{
 const raw=storage?.getItem(SAVE_KEY);if(!raw)return createGame();const data=JSON.parse(raw);
 if(!data||data.version!==GAME_VERSION||!Array.isArray(data.queue)||!Array.isArray(data.fleet)||!data.stats||!data.upgrades)return createGame();
 const g=createGame();for(const k of ['clock','cash','reputation','spawnLeft','autoScanLeft','inboundCooldown','nextParcel','nextEvent','overflow'])if(Number.isFinite(data[k]))g[k]=data[k];
 for(const k of ['theme','view','quality','speed','paused'])if(({theme:['light','dark'],view:['2d','3d'],quality:['eco','normal'],speed:[1,2,4],paused:[true,false]})[k].includes(data[k]))g[k]=data[k];
 for(const [key,u] of Object.entries(UPGRADES))if(Number.isInteger(data.upgrades[key]))g.upgrades[key]=Math.max(0,Math.min(u.cap,data.upgrades[key]));
 for(const k of Object.keys(g.stats))if(Number.isFinite(data.stats[k])&&data.stats[k]>=0)g.stats[k]=data.stats[k];
 if(g.cash<0||g.cash>1e10||g.reputation<0||g.reputation>100||g.clock<0||g.clock>1e8)return createGame();
 const ids=new Set();const validParcel=p=>p&&typeof p.id==='string'&&/^ZX-\d{5,}$/.test(p.id)&&typeof p.city==='string'&&['local','intercity','interisland','international'].includes(p.zone)&&['regular','express','sameday'].includes(p.urgency)&&Number.isFinite(p.kg)&&p.kg>0&&p.kg<=550&&Number.isFinite(p.deadline)&&p.deadline>=0&&typeof p.scanned==='boolean'&&['none','processing','cleared'].includes(p.customs)&&Number.isFinite(p.customsLeft)&&Array.isArray(p.invalidModes);
 const validUnit=v=>v&&typeof v.id==='string'&&MODES[v.mode]&&['ready','traveling'].includes(v.status)&&Array.isArray(v.cargo)&&v.cargo.length<=MODES[v.mode].cap&&v.cargo.reduce((s,p)=>s+(p.kg||0),0)<=MODES[v.mode].maxKg&&v.cargo.every(validParcel)&&v.cargo.every(p=>routeCheck(p,v.mode).ok)&&v.cargo.every(p=>p.zone!=='international'||p.customs==='cleared')&&Number.isFinite(v.remaining)&&v.remaining>=0&&v.remaining<=MODES[v.mode].duration&&Number.isFinite(v.total)&&v.total>=0&&v.total<=MODES[v.mode].duration&&['none','processing','cleared'].includes(v.flightState)&&Number.isFinite(v.flightLeft)&&v.flightLeft>=0&&v.flightLeft<=4;
 if(data.queue.length>backlogCap(g)||data.fleet.length>6||!data.queue.every(validParcel)||!data.fleet.every(validUnit))return createGame();
 const expected=[...g.fleet];if(g.upgrades.aircraft)expected.push(createVehicle('air',2));if(g.upgrades.trucks)expected.push(createVehicle('road',2));if(g.upgrades.vessel)expected.push(createVehicle('sea',2));
 if(data.fleet.length!==expected.length||expected.some(v=>!data.fleet.some(x=>x.id===v.id&&x.mode===v.mode)))return createGame();
 for(const p of [...data.queue,...data.fleet.flatMap(v=>v.cargo)]){if(ids.has(p.id))return createGame();ids.add(p.id);}
 g.queue=data.queue;g.fleet=data.fleet;g.logs=Array.isArray(data.logs)?data.logs.filter(x=>typeof x?.message==='string').slice(0,10):g.logs;
 g.shipmentHistory=Array.isArray(data.shipmentHistory)?data.shipmentHistory.filter(x=>typeof x?.id==='string').slice(0,8):[];
 g.nextParcel=Math.max(g.nextParcel,Number.isInteger(data.nextParcel)?data.nextParcel:1);g.nextEvent=Math.max(g.nextEvent,Number.isInteger(data.nextEvent)?data.nextEvent:1);
 return g;
 }catch{return createGame();}}
export function writeSave(storage,g){try{storage?.setItem(SAVE_KEY,JSON.stringify(g));return true;}catch{return false;}}
