import Vehicle from './Vehicle.js';
import {createVehicleTextures} from '../visuals/vehicle-art.js';
import {TRAFFIC,VEHICLE_DEFINITIONS,SIGNAL_LOCATIONS,createTrafficRoute,sampleRoute,signalAt,vehicleClearance} from '../data/traffic.js';
import {OUTSIDE_LOCATIONS} from '../data/outside-locations.js';
import {DEBUG} from '../game/debug.js';
import {emitAudioCue} from '../audio/hooks.js';

export default class TrafficManager {
  constructor(scene,{random=Math.random}={}) {
    Object.assign(this,{scene,random,vehicles:[],elapsed:0,spawnIn:100,nextId:1,reservation:null,warningUntil:0});
    this.routes={};
    for(const origin of ['N','S','W','E']) for(const turn of ['straight','left','right']) this.routes[`${origin}-${turn}`]=createTrafficRoute(origin,turn);
    createVehicleTextures(scene);
    this.signals=scene.add.graphics().setDepth(12);
    if(DEBUG.trafficPaths) {
      this.paths=scene.add.graphics().setDepth(5);
      for(const route of Object.values(this.routes)) {
        this.paths.lineStyle(1,route.axis==='NS'?0x73e0ca:0x89bbee,.7).beginPath();
        route.points.forEach(([x,y],i)=>i?this.paths.lineTo(x,y):this.paths.moveTo(x,y));
        this.paths.strokePath();
      }
    }
    this.drawSignals();
    emitAudioCue('traffic-ambience');
  }
  get hazard() { return this.elapsed<this.warningUntil; }
  warn() {this.warningUntil=this.elapsed+650;}
  canSpawn(route,length) {
    const p=sampleRoute(route,0);
    return !this.vehicles.some(v=>Math.hypot(v.x-p.x,v.y-p.y)<(v.length+length)/2+32);
  }
  addVehicle({type='sedan',origin='N',turn='straight',scripted=false,speed,visualVariant=0}={}) {
    const route=this.routes[`${origin}-${turn}`];
    if(!this.canSpawn(route,VEHICLE_DEFINITIONS[type].length)) return null;
    const vehicle=new Vehicle(this.scene,{id:this.nextId++,type,route,scripted,speed,visualVariant});
    this.vehicles.push(vehicle);
    return vehicle;
  }
  spawnAmbient() {
    if(!DEBUG.ambientTraffic) return;
    if(this.vehicles.filter(v=>!v.scripted).length>=TRAFFIC.maxAmbientVehicles) return;
    const origins=['N','S','W','E'];
    const origin=origins[Math.floor(this.random()*origins.length)];
    const types=['sedan','sedan','suv','pickup','van','sedan','bus'];
    let type=types[Math.floor(this.random()*types.length)];
    // Long coaches stay on the broad vertical road; car-sized traffic can turn.
    if(type==='bus' && (origin==='W'||origin==='E')) type='van';
    const r=this.random();
    const turn=type==='bus'?'straight':r<.56?'straight':r<.78?'left':'right';
    const definition=VEHICLE_DEFINITIONS[type];
    this.addVehicle({type,origin,turn,speed:definition.speed*(.9+this.random()*.18),
      visualVariant:Math.floor(this.random()*definition.colors.length)});
  }
  spawnBus163() {
    if(this.vehicles.some(v=>v.scripted)) return null;
    const start=OUTSIDE_LOCATIONS.bus163Spawn,stop=OUTSIDE_LOCATIONS.bus163Stop;
    const route=createTrafficRoute('N','straight',[[start.x,start.y],[start.x,700],
      [[start.x,740],[stop.x,stop.y-45],[stop.x,stop.y]],[stop.x,1067]]);
    if(!this.canSpawn(route,VEHICLE_DEFINITIONS.bus.length)) return null;
    const bus=new Vehicle(this.scene,{id:this.nextId++,type:'bus',route,scripted:true,speed:78});
    bus.stopDistance=route.length-(1067-stop.y);
    this.vehicles.push(bus);
    return bus;
  }
  canClearExit(vehicle) {
    const exit=sampleRoute(vehicle.route,vehicle.route.exitDistance+vehicle.length/2+12);
    const c=Math.cos(exit.angle),s=Math.sin(exit.angle);
    return !this.vehicles.some(other=>{
      if(other===vehicle || other.destroyed) return false;
      const dx=other.x-exit.x,dy=other.y-exit.y;
      return Math.abs(dx*c+dy*s)<(vehicle.length+other.length)/2+TRAFFIC.minimumGap
        && Math.abs(-dx*s+dy*c)<(vehicle.width+other.width)/2+3;
    });
  }
  firstInLane(vehicle) {
    return !this.vehicles.some(other=>other!==vehicle && !other.clearedIntersection
      && other.route.origin===vehicle.route.origin
      && other.distance-other.route.entryDistance>vehicle.distance-vehicle.route.entryDistance);
  }
  update(delta,player,intent={x:0,y:0}) {
    const dt=Math.min(delta,60)/1000;
    this.elapsed+=delta;
    this.spawnIn-=delta;
    if(this.spawnIn<=0) {this.spawnAmbient();this.spawnIn=TRAFFIC.spawnMinMs+this.random()*(TRAFFIC.spawnMaxMs-TRAFFIC.spawnMinMs);}
    const signals=signalAt(this.elapsed);
    // Closest waiting vehicle claims the junction; no conflicting left turns or
    // cross-traffic enter until its rear has cleared all crosswalks.
    for(const v of this.vehicles) if(!v.enteredIntersection && v.distance+v.length/2>v.route.entryDistance-80) v.waitSince??=this.elapsed;
    const busLane=this.vehicles.find(v=>v.scripted&&!v.clearedIntersection)?.route.origin;
    const priority=v=>v.scripted || (!v.clearedIntersection && v.route.origin===busLane);
    const order=[...this.vehicles].sort((a,b)=>Number(priority(b))-Number(priority(a))
      || (a.waitSince??Infinity)-(b.waitSince??Infinity)
      || (a.route.entryDistance-a.distance-a.length/2)-(b.route.entryDistance-b.distance-b.length/2));
    for(const v of order) {
      if(v.destroyed) continue;
      let target=v.cruiseSpeed,limit=v.route.length;
      const front=v.distance+v.length/2;
      if(this.reservation===v.id && front>=v.route.entryDistance) v.enteredIntersection=true;
      if(this.reservation===v.id && !v.enteredIntersection && signals[v.route.axis]!=='green') this.reservation=null;
      if(!v.clearedIntersection) {
        if(this.reservation===v.id && v.distance-v.length/2>v.route.exitDistance+8) {
          this.reservation=null;v.clearedIntersection=true;
        } else if(front<v.route.entryDistance+1) {
          if(!this.reservation && signals[v.route.axis]==='green' && front>v.route.entryDistance-80 && this.firstInLane(v) && this.canClearExit(v)) this.reservation=v.id;
          if(this.reservation!==v.id) limit=Math.min(limit,v.route.entryDistance-v.length/2-5);
        }
      }
      if(this.reservation===v.id && front>=v.route.entryDistance) v.enteredIntersection=true;
      if(v.stopDistance!==null) limit=Math.min(limit,v.stopDistance);
      const c=Math.cos(v.angle),s=Math.sin(v.angle);
      for(const other of this.vehicles) {
        if(other===v || other.destroyed) continue;
        const dx=other.x-v.x,dy=other.y-v.y,along=dx*c+dy*s,across=Math.abs(-dx*s+dy*c);
        const angle=other.angle-v.angle;
        const lateralExtent=Math.abs(Math.sin(angle))*other.length/2+Math.abs(Math.cos(angle))*other.width/2;
        if(along>0 && across<v.width/2+lateralExtent+3) {
          const otherExtent=Math.abs(Math.cos(angle))*other.length/2+Math.abs(Math.sin(angle))*other.width/2;
          const gap=along-v.length/2-otherExtent-TRAFFIC.minimumGap;
          limit=Math.min(limit,v.distance+Math.max(0,gap));
        }
      }
      if(player) {
        for(const prediction of [0,.35]) {
          const dx=player.x+intent.x*prediction-v.x,dy=player.y+intent.y*prediction-v.y;
          const along=dx*c+dy*s,across=Math.abs(-dx*s+dy*c);
          // Yield ahead of the bumper. A pedestrian waiting beside the body
          // needs this car to finish passing before they can cross its lane.
          if(along>v.length/2+8 && across<v.width/2+11) {
            const gap=along-v.length/2-14;
            limit=Math.min(limit,v.distance+Math.max(0,gap));
            if(gap<95 && (v.speed>2 || Math.hypot(intent.x,intent.y)>1)) this.warn();
          }
        }
      }
      limit=Math.max(v.distance,limit); // A changing light must never move a car backward.
      const remaining=Math.max(0,limit-v.distance);
      const brake=v.type==='bus'?65:TRAFFIC.braking;
      target=Math.min(target,Math.sqrt(2*brake*remaining));
      const change=(target<v.speed?brake:(v.type==='bus'?15:TRAFFIC.acceleration))*dt;
      const oldSpeed=v.speed;
      v.speed+=Math.max(-change,Math.min(change,target-v.speed));
      let distance=Math.min(limit,v.distance+v.speed*dt);
      if(remaining<.15) {distance=limit;v.speed=0;}
      const next=sampleRoute(v.route,distance);
      if(player && vehicleClearance({...v,...next},player.x,player.y,0,5)<5
        && vehicleClearance({...v,...next},player.x,player.y,0,5)<=vehicleClearance(v,player.x,player.y,0,5)) {
        distance=v.distance;v.speed=0;this.warn();
      }
      v.positionAt(distance);
      v.drawIndicators(this.elapsed,v.speed<oldSpeed-.01 || v.speed<2);
      if(player && !v.passedPlayer && Math.hypot(v.x-player.x,v.y-player.y)<140) {
        v.passedPlayer=true;emitAudioCue(v.type==='bus'?'bus-engine':'car-passing');
      }
      if(v.distance>=v.route.length-.1) {
        if(this.reservation===v.id) this.reservation=null;
        v.destroy();
      }
    }
    this.vehicles=this.vehicles.filter(v=>!v.destroyed);
    this.drawSignals();
  }
  canPlayerEnter(x,y,oldX,oldY) {
    for(const v of this.vehicles) {
      const padding=Math.min(30,v.speed*.38);
      const next=vehicleClearance(v,x,y,padding,6);
      if(next<4 && next<=vehicleClearance(v,oldX,oldY,padding,6)+.001) {this.warn();return false;}
    }
    return true;
  }
  drawSignals() {
    const states=signalAt(this.elapsed),g=this.signals;
    g.clear();
    for(const light of SIGNAL_LOCATIONS) {
      g.fillStyle(0x555f58).fillRect(light.x-1,light.y+18,3,12);
      g.fillStyle(0x203038).fillRoundedRect(light.x-5,light.y-9,12,29,3);
      ['red','amber','green'].forEach((color,i)=>{
        g.fillStyle(states[light.axis]===color?{red:0xf07f65,amber:0xf3cb66,green:0x92d4a1}[color]:0x43514b)
          .fillCircle(light.x+1,light.y-3+i*8,3);
      });
    }
  }
  destroy() {this.vehicles.forEach(v=>v.destroy());this.vehicles=[];this.signals.destroy();this.paths?.destroy();this.reservation=null;}
}
