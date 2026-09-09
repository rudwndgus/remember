import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrafficRoute,sampleRoute,signalAt,TRAFFIC,vehicleClearance} from '../src/data/traffic.js';
import CollisionLayer from '../src/maps/CollisionLayer.js';
import {OUTSIDE_OBJECTS} from '../src/maps/outside-collisions.js';
import TrafficManager from '../src/systems/TrafficManager.js';

test('all twelve routes stay on roads and turns leave in the correct direction',()=>{
  const exits={N:{straight:'S',left:'E',right:'W'},S:{straight:'N',left:'W',right:'E'},W:{straight:'E',left:'N',right:'S'},E:{straight:'W',left:'S',right:'N'}};
  for(const origin of ['N','S','W','E'])for(const turn of ['straight','left','right']){
    const r=createTrafficRoute(origin,turn);
    for(let d=0;d<=r.length;d+=2){
      const p=sampleRoute(r,d);
      assert.ok((p.x>=171&&p.x<=289)||(p.y>=514&&p.y<=583),`${r.id} off road at ${p.x},${p.y}`);
    }
    const end=sampleRoute(r,r.length),exit=exits[origin][turn];
    assert.ok(({N:end.y<0,S:end.y>971,W:end.x<0,E:end.x>1619})[exit]);
    assert.ok(r.exitDistance>r.entryDistance);
  }
});
test('signals include amber and all-red clearance and never conflicting green',()=>{
  for(let t=0;t<100000;t+=33){const s=signalAt(t);assert.ok(s.NS==='red'||s.EW==='red');}
  assert.equal(signalAt(TRAFFIC.greenMs).NS,'amber');
  assert.deepEqual(signalAt(TRAFFIC.greenMs+TRAFFIC.amberMs),{NS:'red',EW:'red'});
});
test('feet sweep cannot tunnel through thin fences and the bus platform is accessible',()=>{
  const c=new CollisionLayer(OUTSIDE_OBJECTS,1619,971);
  assert.equal(c.overlaps(146-4,847-6,8,6),false);
  const swept=c.moveFeet(1120,749,180,0);
  assert.ok(swept.x<1138);assert.equal(c.overlaps(swept.x-4,swept.y-6,8,6),false);
  let p={x:158,y:510};for(let i=0;i<321;i++)p=c.moveFeet(p.x,p.y,0,1);
  assert.equal(p.y,831);
});
test('vehicle safety clearance rotates with each lane and increases before the front',()=>{
  const v={x:196,y:300,angle:Math.PI/2,length:40,width:20};
  assert.ok(vehicleClearance(v,196,300)<0);
  assert.ok(vehicleClearance(v,196,330,20,0)<0);
  assert.ok(vehicleClearance(v,160,300)>0);
});

test('sustained mixed traffic stays capped, clears the junction and despawns',()=>{
  globalThis.window={dispatchEvent(){}};
  const drawable=()=>{const object=new Proxy({}, {get:()=>()=>object});return object;};
  const scene={add:{graphics:drawable,image:drawable,text:drawable},textures:{exists:()=>true}};
  let seed=12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const t=new TrafficManager(scene,{random}),types=new Set(),turns=new Set(),previous=new Map();
  for(let i=0;i<12000;i++){
    t.update(50,null);
    assert.ok(t.vehicles.length<=9);
    t.vehicles.forEach(v=>{types.add(v.type);turns.add(v.route.turn);assert.ok(v.distance>=0&&v.distance<=v.route.length);
      assert.ok(v.distance>=(previous.get(v.id)??0),'signals cannot push vehicles backward');previous.set(v.id,v.distance);});
  }
  assert.equal(types.size,5);assert.equal(turns.size,3);
  assert.ok(t.nextId>40,'traffic must keep leaving, allowing later cars to spawn');
  const bus=t.spawnBus163();assert.ok(bus);assert.equal(t.spawnBus163(),null);
  for(let i=0;i<1800;i++)t.update(50,null);
  assert.ok(Math.abs(bus.y-827)<.5,JSON.stringify({busY:bus.y,reservation:t.reservation,vehicles:t.vehicles.map(v=>({id:v.id,route:v.route.id,x:v.x,y:v.y,speed:v.speed,entered:v.enteredIntersection,cleared:v.clearedIntersection}))}));
  assert.equal(bus.speed,0);
  t.destroy();assert.equal(t.vehicles.length,0);
  const side=new TrafficManager(scene,{random});side.spawnIn=100000;
  const passing=side.addVehicle({origin:'N'});passing.positionAt(300);passing.speed=45;
  const startY=passing.y;
  for(let i=0;i<80;i++)side.update(16,{x:215,y:startY+5},{x:-145,y:0});
  assert.ok(passing.y>startY+35,'a car already beside a waiting pedestrian must clear their crossing, not deadlock');
  side.destroy();
  delete globalThis.window;
});
