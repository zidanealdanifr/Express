import React from 'react';
import {MODES,metrics} from '../lib/engine.js';
export default function ExpressMap2D({game,selection,onSelect}){
 const met=metrics(game);const pick=(kind,id)=>onSelect({kind,id});
 const modes=['road','sea','air'];
 return <div className="map2d">
  <svg viewBox="0 0 900 560" role="img" aria-label="Peta operasional interaktif Zidane Express Sorting Hub">
   <defs><linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eef5ff"/><stop offset="1" stopColor="#dae8fa"/></linearGradient></defs>
   <rect width="900" height="560" fill="url(#land)"/>
   <path d="M625 270H900V560H625Z" fill="#b3e0ed"/>
   <path d="M0 395H625V478H0Z" fill="#8199b3"/>
   <path d="M0 435H625" stroke="#eff5ff" strokeWidth="3" strokeDasharray="35 22"/>
   <rect x="360" y="65" width="528" height="80" rx="12" fill="#95a9c6"/>
   <path d="M370 105H865" stroke="white" strokeDasharray="26 16" strokeWidth="3"/>
   <g onClick={()=>pick('hub','hub')} className="mapnode"><rect x="70" y="75" width="350" height="190" rx="18" fill="#f9fcff" stroke="#80adf5" strokeWidth="5"/><rect x="70" y="75" width="350" height="40" rx="18" fill="#3579e6"/><text x="245" y="102" textAnchor="middle" fill="white" fontWeight="800" fontSize="18">SORTING HUB</text><text x="245" y="192" textAnchor="middle" fill="#496079" fontWeight="700" fontSize="18">Zidane Express Center</text></g>
   <g onClick={()=>pick('conveyor','CV-01')} className="mapnode"><rect x="115" y="276" width="370" height="62" rx="8" fill="#637f95"/><g fill="#c3d5e3">{Array.from({length:12},(_,i)=><rect key={i} x={130+i*28} y="285" width="20" height="44" rx="3"/>)}</g><rect x="258" y="273" width="49" height="69" fill="#2c79e8" rx="5"/><text x="300" y="367" textAnchor="middle" fontWeight="800" fontSize="16" fill="#3765a2">SCAN & SORT · {game.queue.length} ANTRE</text></g>
   <g onClick={()=>pick('motor','MOTO-01')} className="mapnode"><rect x="35" y="494" width="235" height="50" rx="13" fill="#e3ecff" stroke="#a4bce9"/><text x="153" y="523" textAnchor="middle" fontSize="16" fontWeight="800" fill="#345b9a">KURIR MOTOR · LOKAL</text></g>
   {modes.map((mode,i)=>{const v=game.fleet.find(x=>x.mode===mode);const positions={road:[385,432],sea:[752,408],air:[667,105]};const [x,y]=positions[mode];return <g key={mode} onClick={()=>v&&pick('vehicle',v.id)} className="mapnode"><rect x={x-110} y={y-29} width="220" height="58" rx="15" fill={selection?.id===v?.id?'#dbecff':'white'} stroke={MODES[mode].color} strokeWidth="3"/><circle cx={x-82} cy={y} r="9" fill={MODES[mode].color}/><text x={x-64} y={y-3} fontWeight="800" fontSize="16" fill="#2d4c6e">{mode==='road'?'MOBIL BOX':mode==='sea'?'KAPAL Ro-Ro':'PESAWAT CARGO'}</text><text x={x-64} y={y+16} fontSize="12" fill="#68819d">{v?`${v.id} · ${v.status==='ready'?v.cargo.length+' paket':'DALAM PERJALANAN'}`:'Unit tidak ada'}</text></g>;})}
  </svg>
  <div className="map2d-foot"><span><span className="dot green"/> Sorter aktif</span><span><span className="dot blue"/> {met.sorted} paket siap dispatch</span><span><span className="dot orange"/> {met.queue} paket inbound</span></div>
 </div>;
}
