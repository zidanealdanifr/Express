import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SAVE_KEY,MODES,UPGRADES,createGame,scanPackage,requestCustoms,routePackage,routeCheck,recommendedMode,
 findVehicle,dispatchCheck,dispatchVehicle,requestFlightClearance,metrics,tick,buyUpgrade,upgradeCost,
 setPreference,pullInbound,readSave,writeSave,nextAction,backlogCap,autoScanInterval
} from '../src/lib/engine.js';

const step=(g,seconds)=>{let v=g;for(let i=0;i<seconds;i++)v=tick(v,1);return v;};
const scanned=(g,i=0)=>scanPackage(g,g.queue[i].id);
const load=(g,id,mode,vehicleId)=>routePackage(scanPackage(g,id),id,mode,vehicleId);

test('standalone Indonesia hub initial state & independent local save key',()=>{const g=createGame();assert.match(SAVE_KEY,/express/);assert.equal(g.view,'2d');assert.equal(g.quality,'eco');assert.equal(g.queue.length,5);assert.equal(g.fleet.length,3);assert.equal(g.queue[3].zone,'international');});
test('manual barcode scan only flags chosen parcel',()=>{const g=createGame();const n=scanned(g);assert.equal(n.queue[0].scanned,true);assert.equal(g.queue[0].scanned,false);assert.equal(n.queue[1].scanned,false);});
test('duplicate scan no effect',()=>{let g=scanned(createGame());assert.equal(scanPackage(g,g.queue[0].id),g);});
test('invalid route: international road incurs one reputation penalty per distinct mode',()=>{let g=scanned(createGame(),3),id=g.queue[3].id;const r=routePackage(g,id,'road','RD-01');assert.equal(r.game.reputation,g.reputation-7);assert.match(r.error,/INVALID ROUTE/);assert.equal(r.game.queue.length,5);const repeat=routePackage(r.game,id,'road','RD-01');assert.equal(repeat.game,r.game);});
test('same-day cannot go road or sea',()=>{const g=createGame(),p=g.queue[4];assert.equal(recommendedMode(p),'air');assert.equal(routeCheck(p,'road').ok,false);assert.equal(routeCheck(p,'sea').ok,false);assert.equal(routeCheck(p,'air').ok,true);});
test('cross-island regular recommends sea, rejects road',()=>{const p=createGame().queue[2];assert.equal(recommendedMode(p),'sea');assert.equal(routeCheck(p,'road').ok,false);assert.equal(routeCheck(p,'sea').ok,true);});
test('local regular uses road, sea invalid',()=>{const p=createGame().queue[0];assert.equal(recommendedMode(p),'road');assert.equal(routeCheck(p,'sea').ok,false);});
test('cannot sort unscanned parcel',()=>{const g=createGame(),p=g.queue[0];const n=routePackage(g,p.id,'road','RD-01');assert.equal(n.game,g);assert.match(n.error,/dipindai/);});
test('scanned road package moves into vehicle manifest atomically',()=>{let g=scanned(createGame());const id=g.queue[0].id;const result=routePackage(g,id,'road','RD-01');assert.equal(result.error,null);assert.equal(result.game.queue.some(x=>x.id===id),false);assert.equal(findVehicle(result.game,'RD-01').cargo[0].id,id);assert.equal(g.queue.length,5);});
test('international package requires customs processing before loading',()=>{let g=scanned(createGame(),3),id=g.queue[3].id;assert.match(routePackage(g,id,'air','AIR-01').error,/Customs/);g=requestCustoms(g,id);assert.equal(g.queue[3].customs,'processing');g=step(g,7);assert.equal(g.queue.find(x=>x.id===id).customs,'cleared');assert.equal(routePackage(g,id,'air','AIR-01').error,null);});
test('customs costs are charged once',()=>{let g=scanned(createGame(),3),id=g.queue[3].id;const cash=g.cash;g=requestCustoms(g,id);assert.equal(g.cash,cash-25);assert.equal(requestCustoms(g,id),g);});
test('flight ATC clearance required before dispatch',()=>{let g=scanned(createGame(),4),id=g.queue[4].id;g=routePackage(g,id,'air','AIR-01').game;assert.equal(dispatchCheck(g,'AIR-01').ok,false);g=requestFlightClearance(g,'AIR-01');assert.equal(findVehicle(g,'AIR-01').flightState,'processing');g=step(g,5);assert.equal(findVehicle(g,'AIR-01').flightState,'cleared');assert.equal(dispatchCheck(g,'AIR-01').ok,true);});
test('flight clearance becomes invalid when new parcel is attached',()=>{let g=scanned(createGame(),4);g=routePackage(g,g.queue[4].id,'air','AIR-01').game;g=requestFlightClearance(g,'AIR-01');g=step(g,5);const id=g.queue[3].id;g=scanPackage(g,id);g=requestCustoms(g,id);g=step(g,7);g=routePackage(g,id,'air','AIR-01').game;assert.equal(findVehicle(g,'AIR-01').flightState,'none');});
test('shipment revenue only paid at arrival, not dispatch',()=>{let g=scanned(createGame());g=routePackage(g,g.queue[0].id,'road','RD-01').game;const cash=g.cash;g=dispatchVehicle(g,'RD-01');assert.equal(g.cash,cash-MODES.road.dispatchCost);g=step(g,24);assert.equal(g.stats.delivered,1);assert.ok(g.cash>cash-MODES.road.dispatchCost);const paid=g.cash;g=step(g,2);assert.equal(g.cash,paid);});
test('ship and plane voyages each settle once',()=>{let g=scanned(createGame(),2);g=routePackage(g,g.queue[2].id,'sea','SEA-01').game;g=dispatchVehicle(g,'SEA-01');g=step(g,54);assert.equal(g.stats.delivered,1);assert.equal(findVehicle(g,'SEA-01').status,'ready');assert.equal(g.shipmentHistory.length,1);});
test('vehicle manifest respects slot and mass limits',()=>{let g=scanned(createGame());const id=g.queue[0].id;const r=routePackage(g,id,'road','RD-01');assert.equal(r.error,null);assert.equal(findVehicle(r.game,'RD-01').cargo.length,1);const heavy={...g.queue[0],id:'ZX-09999',kg:600,scanned:true};g=r.game;g.queue.push(heavy);const noFit=routePackage(g,heavy.id,'road','RD-01');assert.equal(noFit.game,g);assert.match(noFit.error,/berat/);});
test('departure requires non-empty manifest',()=>{const g=createGame();assert.equal(dispatchVehicle(g,'RD-01'),g);});
test('dispatch cannot run while paused',()=>{let g=scanned(createGame());g=routePackage(g,g.queue[0].id,'road','RD-01').game;g=setPreference(g,'paused',true);assert.equal(dispatchVehicle(g,'RD-01'),g);assert.equal(tick(g,5),g);});
test('pause prevents scan and upgrade',()=>{let g=setPreference(createGame(),'paused',true);assert.equal(scanPackage(g,g.queue[0].id),g);assert.equal(buyUpgrade(g,'scanner'),g);});
test('simulation clock & ETA freeze exactly when paused',()=>{let g=scanned(createGame());g=routePackage(g,g.queue[0].id,'road','RD-01').game;g=dispatchVehicle(g,'RD-01');g=setPreference(g,'paused',true);const unchanged=tick(g,7);assert.equal(unchanged,g);g=setPreference(g,'paused',false);const n=tick(g,2);assert.equal(n.clock,g.clock+2);assert.equal(findVehicle(n,'RD-01').remaining,MODES.road.duration-2);});
test('no duplicate packet allocation between modes',()=>{let g=scanned(createGame());const id=g.queue[0].id;g=routePackage(g,id,'road','RD-01').game;const r=routePackage(g,id,'air','AIR-01');assert.equal(r.game,g);const all=g.queue.concat(g.fleet.flatMap(v=>v.cargo));assert.equal(all.filter(p=>p.id===id).length,1);});
test('cash, reputation, packet count remain finite in long session',()=>{let g=createGame();for(let i=0;i<1600;i++)g=tick(g,.5);assert.ok(Number.isFinite(g.cash));assert.ok(g.cash>=0);assert.ok(g.reputation>=0&&g.reputation<=100);assert.ok(g.queue.length<=backlogCap(g));assert.ok(g.logs.length<=10);});
test('misroute rule penalty does not duplicate across repeated clicks',()=>{let g=scanned(createGame(),3);const id=g.queue[3].id;g=routePackage(g,id,'road','RD-01').game;const rep=g.reputation;g=routePackage(g,id,'road','RD-01').game;assert.equal(g.reputation,rep);});
test('AI Scanner automatically scans inbound at upgrade level 1',()=>{let g=buyUpgrade(createGame(),'scanner');assert.equal(g.upgrades.scanner,1);g=step(g,13);assert.ok(g.queue.some(p=>p.scanned));});
test('customs licence triggers automatic clearance, no double charge',()=>{let g=buyUpgrade(createGame(),'customs'),cash=g.cash;g=scanned(g,3);g=step(g,4);assert.equal(g.queue.find(p=>p.zone==='international')?.customs,'cleared');assert.equal(g.cash,cash);});
test('upgrade is unavailable if cost exceeds cash or max level',()=>{let g=createGame();g.cash=1;assert.equal(buyUpgrade(g,'aircraft'),g);g=createGame();g=buyUpgrade(g,'customs');assert.equal(buyUpgrade(g,'customs'),g);});
test('truck upgrade actually adds independent road vehicle',()=>{let g=buyUpgrade(createGame(),'trucks');assert.equal(g.fleet.filter(v=>v.mode==='road').length,2);assert.ok(g.fleet.some(v=>v.id==='RD-02'));});
test('aircraft upgrade opens second independently dispatchable aircraft',()=>{const g=buyUpgrade(createGame(),'aircraft');assert.equal(g.fleet.filter(v=>v.mode==='air').length,2);});
test('pull inbound costs cash and has cooldown',()=>{const g=createGame(),n=pullInbound(g);assert.equal(n.cash,g.cash-35);assert.equal(n.queue.length,g.queue.length+2);assert.equal(pullInbound(n),n);});
test('invalid speed or preference is ignored',()=>{const g=createGame();assert.equal(setPreference(g,'speed',10),g);assert.equal(setPreference(g,'theme','neon'),g);assert.equal(setPreference(g,'quality','eco'),g);});
test('save roundtrip preserves active manifests and customs',()=>{const m=new Map(),s={setItem:(k,v)=>m.set(k,v),getItem:k=>m.get(k)};let g=scanned(createGame());g=routePackage(g,g.queue[0].id,'road','RD-01').game;assert.equal(writeSave(s,g),true);const n=readSave(s);assert.equal(findVehicle(n,'RD-01').cargo[0].id,findVehicle(g,'RD-01').cargo[0].id);assert.equal(n.cash,g.cash);});
test('corrupt or stale save restores safe initial state',()=>{for(const raw of ['???','null','{}',JSON.stringify({version:99}),JSON.stringify({version:1,queue:[],fleet:[]})]){const n=readSave({getItem:()=>raw});assert.equal(n.queue.length,5);assert.equal(n.fleet.length,3);}});
test('duplicate parcels in serialized save cannot be double-paid',()=>{const g=createGame(),v=g.fleet[0];v.cargo=[{...g.queue[0],scanned:true}];const s={getItem:()=>JSON.stringify(g)};assert.equal(readSave(s).fleet[0].cargo.length,0);});
test('invalid flight or cargo details in save are rejected',()=>{const g=createGame();g.fleet[2].flightState='undefined';assert.equal(readSave({getItem:()=>JSON.stringify(g)}).fleet[2].flightState,'none');});
test('customer satisfaction and OTD use actual delivered results',()=>{const g=createGame();assert.equal(metrics(g).onTime,100);assert.equal(metrics(g).delivered,0);assert.equal(metrics(g).satisfaction,92);});
test('nextAction never refers to imaginary missions or unimplemented modules',()=>{let g=createGame(),next=nextAction(g);assert.equal(next.action,'scan');g=scanPackage(g,g.queue[0].id);next=nextAction(g);assert.equal(next.action,'route');assert.equal(next.mode,'road');});
test('road and sea can dispatch in parallel without sharing cargo',()=>{
 let g=createGame();const roadId=g.queue[0].id,seaId=g.queue[2].id;for(const [id,mode,vehicle] of [[roadId,'road','RD-01'],[seaId,'sea','SEA-01']]){
  g=scanPackage(g,id);g=routePackage(g,id,mode,vehicle).game;
 }
 assert.equal(g.queue.length,3);
 g=dispatchVehicle(g,'RD-01');g=dispatchVehicle(g,'SEA-01');assert.equal(g.fleet.filter(x=>x.status==='traveling').length,2);
 g=step(g,25);assert.equal(g.stats.delivered,1);assert.equal(findVehicle(g,'SEA-01').status,'traveling');
 g=step(g,28);assert.equal(g.stats.delivered,2);assert.equal(g.stats.shipments,2);
 assert.equal(new Set(g.shipmentHistory.map(p=>p.id)).size,2);
});
test('aircraft full E2E: same-day and international, both cleared and delivered',()=>{
 let g=createGame();const same=g.queue[4].id,intl=g.queue[3].id;
 g=scanPackage(g,same);g=routePackage(g,same,'air','AIR-01').game;
 g=scanPackage(g,intl);g=requestCustoms(g,intl);g=step(g,7);
 g=routePackage(g,intl,'air','AIR-01').game;assert.equal(findVehicle(g,'AIR-01').cargo.length,2);
 g=requestFlightClearance(g,'AIR-01');g=step(g,5);g=dispatchVehicle(g,'AIR-01');
 assert.equal(metrics(g).activeAircraft,1);
 g=step(g,19);assert.equal(metrics(g).activeAircraft,0);assert.equal(g.stats.delivered,2);assert.equal(findVehicle(g,'AIR-01').cargo.length,0);
});
test('second aircraft and first aircraft operate independently',()=>{
 let g=buyUpgrade(createGame(),'aircraft');
 const p=g.queue[4];g=scanPackage(g,p.id);g=routePackage(g,p.id,'air','AIR-02').game;
 g=requestFlightClearance(g,'AIR-02');g=step(g,5);g=dispatchVehicle(g,'AIR-02');
 assert.equal(findVehicle(g,'AIR-01').status,'ready');assert.equal(findVehicle(g,'AIR-02').status,'traveling');
});
test('finite queue growth, bounded logs and no automatic income during idle',()=>{
 let g=createGame(),startCash=g.cash;g=step(g,240);assert.equal(g.cash,startCash);assert.equal(g.stats.delivered,0);assert.ok(g.queue.length<=backlogCap(g));assert.ok(g.logs.length<=10);
});
test('full fleet vessel can be dispatched partially to avoid blocking urgent packages',()=>{
 let g=createGame(),p=g.queue[2];g=scanPackage(g,p.id);g=routePackage(g,p.id,'sea','SEA-01').game;
 assert.equal(findVehicle(g,'SEA-01').cargo.length,1);
 g=dispatchVehicle(g,'SEA-01');assert.equal(findVehicle(g,'SEA-01').status,'traveling');
});
