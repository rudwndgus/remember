import { VEHICLE_DEFINITIONS, sampleRoute } from '../data/traffic.js';
import { BUS_163 } from '../data/outside-locations.js';

export default class Vehicle {
  constructor(scene,{id,type='sedan',route,speed,visualVariant=0,scripted=false}) {
    const definition=VEHICLE_DEFINITIONS[type];
    Object.assign(this,{scene,id,type,route,scripted,length:definition.length,width:definition.width,
      distance:0,speed:0,cruiseSpeed:speed||definition.speed,stopDistance:null,enteredIntersection:false,
      clearedIntersection:false,passedPlayer:false,destroyed:false});
    this.spawnPoint={...sampleRoute(route,0)};
    this.despawnPoint={...sampleRoute(route,route.length)};
    this.visualVariant=visualVariant;
    this.sprite=scene.add.image(0,0,`traffic-${type}-${visualVariant}`).setDepth(7);
    this.lights=scene.add.graphics().setDepth(8);
    if(type==='bus') this.routeLabel=scene.add.text(0,0,BUS_163.route,{
      fontFamily:'monospace',fontSize:'9px',fontStyle:'bold',color:'#ffca6e',
      backgroundColor:'#152b32',padding:{x:2,y:1},
    }).setOrigin(.5).setDepth(9);
    scene.overlayCamera?.ignore([this.sprite,this.lights,...(this.routeLabel?[this.routeLabel]:[])]);
    this.positionAt(0);
  }
  positionAt(distance) {
    this.distance=distance;
    Object.assign(this,sampleRoute(this.route,distance));
    this.sprite.setPosition(this.x,this.y).setRotation(this.angle);
    if(this.routeLabel) this.routeLabel.setPosition(this.x+Math.cos(this.angle)*this.length*.31,this.y+Math.sin(this.angle)*this.length*.31);
  }
  drawIndicators(time,braking) {
    const g=this.lights;
    g.clear();
    const point=(along,across)=>({x:this.x+Math.cos(this.angle)*along-Math.sin(this.angle)*across,
      y:this.y+Math.sin(this.angle)*along+Math.cos(this.angle)*across});
    if(braking) for(const side of [-1,1]) {
      const p=point(-this.length/2+3,side*(this.width/2-3));g.fillStyle(0xff674e,.95).fillCircle(p.x,p.y,2);
    }
    if(this.route.turn!=='straight' && !this.clearedIntersection && this.distance>this.route.entryDistance-110 && Math.floor(time/400)%2===0) {
      const side=this.route.turn==='right'?1:-1;
      for(const end of [-1,1]) {const p=point(end*(this.length/2-3),side*(this.width/2-1));g.fillStyle(0xffcf6c).fillCircle(p.x,p.y,2);}
    }
  }
  destroy() {
    if(this.destroyed) return;
    this.destroyed=true;
    this.sprite.destroy();this.lights.destroy();this.routeLabel?.destroy();
  }
}
