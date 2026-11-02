import React,{useEffect,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Html,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {MODES,metrics} from '../lib/engine.js';

const C={blue:'#2673e3',teal:'#2faab3',purple:'#9470e2',steel:'#667e9a',road:'#738b9b',grass:'#dce9dd',ground:'#dfe9f8',white:'#f5faff',yellow:'#eec05b',ink:'#31445f'};
function Cube({p=[0,0,0],s=[1,1,1],c='#fff',r=[0,0,0],...props}){return <mesh position={p} rotation={r} castShadow receiveShadow {...props}><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.74} metalness={.06}/></mesh>;}
function Cylinder({p=[0,0,0],radius=.3,height=.3,c='#333',r=[0,0,0]}){return <mesh position={p} rotation={r} castShadow><cylinderGeometry args={[radius,radius,height,10]}/><meshStandardMaterial color={c}/></mesh>;}
function Selectable({kind,id,onSelect,children,...props}){return <group {...props} onClick={e=>{e.stopPropagation();onSelect({kind,id});}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='auto';}}>{children}</group>;}
function WorldTag({p,children}){return <Html center distanceFactor={23} position={p} style={{pointerEvents:'none'}}><span className="world-tag">{children}</span></Html>;}
function Ring({selected,r=1.5}){return selected?<mesh position={[0,.09,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[r,r+.12,44]}/><meshBasicMaterial color="#2769ee" transparent opacity={.85} side={THREE.DoubleSide}/></mesh>:null;}
function Environment({dark}){return <group>
 <Cube p={[0,-.65,0]} s={[47,1.2,34]} c={dark?'#35425a':'#dbe8fb'}/>
 <Cube p={[-7,.02,9.1]} s={[31,.06,5.2]} c="#7d91a7"/>
 {Array.from({length:12},(_,i)=><Cube key={i} p={[-20+i*2.6,.07,9.1]} s={[1.05,.025,.08]} c="#f4fbff"/>)}
 <Cube p={[9,.04,-9.1]} s={[26,.08,4.8]} c="#788ca2"/>
 {Array.from({length:12},(_,i)=><Cube key={i} p={[-2+i*1.9,.10,-9.1]} s={[.8,.018,.12]} c="#fdf7e7"/>)}
 <Cube p={[17,-.4,8]} s={[18,.83,19.5]} c="#4d9db5"/>
 <Cube p={[9,.05,4.0]} s={[2.4,.12,12]} c="#becbd1"/>
 {Array.from({length:7},(_,i)=><Cube key={i} p={[9.4,-.1,-.3+i*1.4]} s={[.18,.63,.18]} c="#566d7b"/>)}
 <Cube p={[-12,.04,-7]} s={[15,.04,3.2]} c="#e6efe4"/>
 {[-18,-13,-8].map((x,i)=><group key={x}><Cylinder p={[x,.55,-11.2]} radius={.15} height={1.1} c="#927a56"/><mesh position={[x,1.38,-11.2]} castShadow><icosahedronGeometry args={[.75+i*.04,1]}/><meshStandardMaterial color={i%2?'#81cba6':'#70be99'} flatShading/></mesh></group>)}
 </group>;}
function Building({onSelect,selected}){return <Selectable kind="hub" id="hub" onSelect={onSelect} position={[-5,0,-4.4]}>
 <Ring selected={selected} r={5}/>
 <Cube p={[0,2,0]} s={[10.5,4,7]} c="#f4f7fd"/>
 <Cube p={[0,4.1,0]} s={[11,.26,7.5]} c="#3477e2"/>
 <Cube p={[0,2.9,3.53]} s={[10.5,.82,.1]} c="#c3d7f0"/>
 {[-2.8,.2,3.1].map(x=><group key={x}><Cube p={[x,1.3,3.56]} s={[1.65,2,.16]} c="#92b2d3"/><Cube p={[x,2.25,3.67]} s={[1.9,.15,.18]} c="#286cd6"/></group>)}
 <WorldTag p={[0,5.3,1]}>Z-EXPRESS · NATIONAL SORTING HUB</WorldTag>
 </Selectable>;}
function Conveyor({time,game,onSelect,selected}){
 const pack=useRef([]);
 useFrame(()=>{pack.current.forEach((item,i)=>{if(!item)return;const t=((time.current*.25+i*.24)%1+1)%1;item.position.x=-3.9+t*7.5;item.position.y=.75;});});
 return <Selectable kind="conveyor" id="CV-01" onSelect={onSelect} position={[0,0,3.4]}>
 <Ring selected={selected} r={4.2}/>
 <Cube p={[0,.48,0]} s={[9,.3,1.55]} c="#506c82"/>
 {Array.from({length:15},(_,i)=><Cube key={i} p={[-4.1+i*.59,.66,0]} s={[.39,.08,1.35]} c={i%2?'#8eaabf':'#aabfd0'}/>)}
 {[-3,-1,1,3].map(x=><Cube key={x} p={[x,.18,0]} s={[.14,.45,.15]} c="#879caf"/>)}
 {Array.from({length:4},(_,i)=><group ref={el=>pack.current[i]=el} key={i} position={[-3+i*2,.75,0]}><Cube p={[0,.22,0]} s={[.74,.44,.65]} c={['#d4a879','#e3c08e','#93bce0','#ecc49e'][i]}/><Cube p={[0,.48,0]} s={[.08,.04,.61]} c="#f3f5ed"/></group>)}
 <Cube p={[-.8,1.36,0]} s={[.15,1.7,.15]} c="#236ee1"/><Cube p={[-.8,2.2,0]} s={[1.75,.2,1.85]} c="#2f79ed"/>
 <Cube p={[-.8,1.55,0]} s={[.025,.6,1.47]} c="#80e7f4"/>
 <WorldTag p={[0,3.15,0]}>AUTO SORTER · {game.upgrades.scanner?'AI SCANNER ON':'MANUAL SCAN'}</WorldTag>
 </Selectable>;
}
function TruckModel(){return <group><Cube p={[.1,.72,0]} s={[2.9,1.23,1.2]} c="#f4f9ff"/><Cube p={[1.78,.68,0]} s={[1.12,1.1,1.05]} c="#2674e5"/><Cube p={[2.38,.85,0]} s={[.035,.42,.8]} c="#6eb6dc"/><Cube p={[.1,.52,.63]} s={[2.8,.22,.04]} c="#2674e5"/>{[-.95,.95,1.85].map(x=>[-.56,.56].map(z=><Cylinder key={`${x}-${z}`} p={[x,.23,z]} radius={.23} height={.13} c="#303c50" r={[Math.PI/2,0,0]}/>))}</group>}
function ShipModel(){return <group><Cube p={[0,.36,0]} s={[2.6,.73,5.4]} c="#28566d"/><Cube p={[0,.78,0]} s={[2.35,.12,5.1]} c="#d5dce4"/><Cube p={[-.5,1.2,-1.85]} s={[1,1,1]} c="#edf5ff"/><Cube p={[-.5,1.52,-2.38]} s={[.72,.31,.05]} c="#4a8299"/>{Array.from({length:8},(_,i)=><Cube key={i} p={[-.55+(i%2)*1.1,1.12, -.8+Math.floor(i/2)*1.1]} s={[.95,.62,.94]} c={['#e6b04e','#3c90be','#d46f61','#69ac8d'][i%4]}/>)}</group>}
function PlaneModel(){return <group><Cube p={[0,.46,0]} s={[5.8,.6,.95]} c="#f0f7fc"/><Cube p={[1.8,.64,0]} s={[1.2,.35,.95]} c="#e5f1ff"/><Cube p={[-.4,.38,0]} s={[1.15,.13,6]} c="#2e77e4"/><Cube p={[-2.4,1.0,0]} s={[.9,1.65,.17]} c="#2e77e4"/><Cube p={[-2.25,.56,0]} s={[1.0,.1,2.5]} c="#6b98d8"/><Cube p={[2.89,.6,0]} s={[.06,.19,.6]} c="#4e8aad"/>{[-1.3,1.3].map(z=><Cube key={z} p={[-.7,.16,z]} s={[.7,.35,.45]} c="#7d8fa7"/>)}</group>}
function Vehicle({v,mode,index,onSelect,selected,time,paused}){
 const ref=useRef();const t=useRef(0);
 useFrame((_,dt)=>{
  if(!ref.current||paused)return;
  const desired=v.status==='traveling'?Math.min(1,1-v.remaining/Math.max(1,v.total)):.0;
  t.current=THREE.MathUtils.damp(t.current,desired,5,Math.min(dt,.07));
  if(mode==='road'){ref.current.position.x=-13+t.current*23;ref.current.position.z=9.2+index*.0;ref.current.position.y=.14;}
  else if(mode==='sea'){ref.current.position.x=15+Math.sin(t.current*Math.PI)*3;ref.current.position.z=7.3+t.current*8+index*2.9;ref.current.position.y=.08+Math.sin(time.current*1.6+index)*.035;}
  else {ref.current.position.x=6+t.current*22;ref.current.position.z=-9.1+index*2;ref.current.position.y=.28+Math.sin(t.current*Math.PI)*9;}
 });
 const initial=mode==='road'?[-13,.1,9.2]:mode==='sea'?[15,.12,7.3+index*2.9]:[6,.28,-9.1+index*2];
 return <Selectable kind="vehicle" id={v.id} onSelect={onSelect}>
 <group ref={ref} position={initial}>
  <Ring selected={selected} r={mode==='air'?3:2.1}/>
  {mode==='road'?<TruckModel/>:mode==='sea'?<ShipModel/>:<PlaneModel/>}
  {selected&&<WorldTag p={[0,mode==='air'?2.3:2.6,0]}>{v.id} · {v.status==='traveling'?'ON ROUTE':`${v.cargo.length}/${MODES[mode].cap} PAKET`}</WorldTag>}
 </group>
 </Selectable>;
}
function FleetProps({onSelect,selected}){return <Selectable kind="motor" id="MOTO-01" onSelect={onSelect} position={[-16,.2,6.1]}>
 <Ring selected={selected} r={1.1}/><Cube p={[0,.35,0]} s={[1.15,.32,.32]} c="#246bd5"/>
 <Cube p={[-.4,.62,0]} s={[.55,.65,.38]} c="#eebf63"/><Cube p={[.35,.6,0]} s={[.55,.5,.58]} c="#e0af65"/>
 {[-.52,.55].map(x=><Cylinder key={x} p={[x,.16,0]} radius={.22} height={.13} c="#273a51" r={[Math.PI/2,0,0]}/>)}
 {selected&&<WorldTag p={[0,1.6,0]}>KURIR MOTOR · LOCAL DELIVERY</WorldTag>}
 </Selectable>}
function Pulse({paused,quality}){const invalidate=useThree(s=>s.invalidate);useEffect(()=>{const id=setInterval(()=>{if(!document.hidden)invalidate();},1000/(paused?5:quality==='eco'?22:38));return ()=>clearInterval(id);},[invalidate,paused,quality]);return null;}
function World({game,selection,onSelect,zoomSignal}){
 const time=useRef(game.clock);const orbit=useRef();const camera=useThree(s=>s.camera);
 useFrame((_,dt)=>{if(!game.paused)time.current+=Math.min(dt,.07)*game.speed;});
 useEffect(()=>{if(!orbit.current||!zoomSignal)return;if(zoomSignal.kind==='reset'){camera.position.set(-24,25,27);orbit.current.target.set(0,0,0);orbit.current.update();return;}
 const ray=new THREE.Vector3().subVectors(camera.position,orbit.current.target);ray.multiplyScalar(zoomSignal.kind==='out'?1.32:.77);ray.clampLength(16,110);camera.position.copy(orbit.current.target).add(ray);orbit.current.update();},[zoomSignal,camera]);
 return <>
 <color attach="background" args={[game.theme==='dark'?'#090d16':'#eaf2ff']}/>
 <ambientLight intensity={2.1}/><hemisphereLight args={['#f0f8ff','#8aa3ad',1.15]}/>
 <directionalLight position={[-12,24,11]} intensity={2.15} castShadow={game.quality==='normal'} shadow-mapSize={[1024,1024]}/>
 <Environment dark={game.theme==='dark'}/><Building onSelect={onSelect} selected={selection?.kind==='hub'}/>
 <Conveyor game={game} time={time} onSelect={onSelect} selected={selection?.kind==='conveyor'}/>
 <FleetProps onSelect={onSelect} selected={selection?.kind==='motor'}/>
 {game.fleet.map((v,i)=><Vehicle key={v.id} v={v} mode={v.mode} index={game.fleet.filter(k=>k.mode===v.mode).findIndex(k=>k.id===v.id)} selected={selection?.kind==='vehicle'&&selection.id===v.id} onSelect={onSelect} time={time} paused={game.paused}/>)}
 <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.08} minDistance={15} maxDistance={110} maxPolarAngle={1.33} target={[0,0,0]} enablePan/>
 </>;
}
export default function ExpressScene3D({game,selection,onSelect,zoomSignal}){
 return <Canvas gl={{alpha:false,antialias:game.quality==='normal',powerPreference:'low-power'}} shadows={game.quality==='normal'} camera={{position:[-24,25,27],fov:43,near:.1,far:180}} dpr={game.quality==='eco'?[.65,1]:[1,1.45]} frameloop="demand" onPointerMissed={()=>onSelect(null)}>
 <Pulse paused={game.paused} quality={game.quality}/><World game={game} selection={selection} onSelect={onSelect} zoomSignal={zoomSignal}/>
 </Canvas>;
}
