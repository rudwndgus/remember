import { VEHICLE_DEFINITIONS } from '../data/traffic.js';

/** Replace generated texture keys with sprite-sheet keys in Vehicle to upgrade art.
 * All art faces east; path tangents rotate the complete vehicle, not its route.
 */
export function createVehicleTextures(scene) {
  for(const [type,definition] of Object.entries(VEHICLE_DEFINITIONS)) {
    definition.colors.forEach((color,variant)=>{
      const key=`traffic-${type}-${variant}`;
      if(scene.textures.exists(key)) return;
      const length=definition.length,width=definition.width;
      const g=scene.make.graphics({x:0,y:0},false);
      const rect=(fill,x,y,w,h)=>g.fillStyle(fill).fillRect(x,y,w,h);
      rect(0x17272c,6,1,9,3); rect(0x17272c,length-16,1,9,3);
      rect(0x17272c,6,width,9,3); rect(0x17272c,length-16,width,9,3);
      g.fillStyle(0x283638).fillRoundedRect(1,3,length-2,width-2,4);
      g.fillStyle(color).fillRoundedRect(2,4,length-4,width-4,3);
      rect(0x273f48,length*.61,5,7,width-6);
      rect(0x82a0a6,length*.61,6,2,width-8);
      rect(0x344f58,length*.27,5,5,width-6);
      rect(color,length*.36,6,length*.24,width-8);
      rect(0xe9eccf,length-4,5,2,4); rect(0xe9eccf,length-4,width-3,2,4);
      rect(0xb05240,2,5,2,3); rect(0xb05240,2,width-2,2,3);
      rect(0x899996,5,4,length-12,1);
      if(type==='pickup') {
        rect(0x3d4d4b,5,6,18,width-8);
        for(let x=7;x<21;x+=4) rect(0x677773,x,7,1,width-10);
        rect(color,23,5,3,width-6);
      }
      if(type==='suv') {rect(0x303c3b,13,5,14,2);rect(0x303c3b,13,width-1,14,2);}
      if(type==='van') {rect(color,6,6,23,width-8);rect(0xcbd0c1,12,7,2,width-10);}
      if(type==='bus') {
        rect(0xdce0d7,4,4,length-8,width-4);
        rect(0x243e48,length-13,5,8,width-6);
        rect(0x88a4ab,length-12,6,2,width-8);
        for(let x=9;x<length-17;x+=9) {rect(0x263d49,x,4,7,3);rect(0x263d49,x,width-1,7,3);}
        rect(0xd38450,12,width-3,18,2);rect(0xaf4770,30,width-3,15,2);rect(0x446b9d,45,width-3,15,2);
        rect(0xadb8b7,22,10,15,9);rect(0x929f9e,24,12,11,5);
        rect(0xc6cdc4,43,10,9,9);
        rect(0xeee5ac,length-3,5,2,5);rect(0xeee5ac,length-3,width-4,2,5);
        rect(0x172c31,length-9,width-2,5,4); // curb-side front door
      }
      g.generateTexture(key,length,width+4);
      scene.textures.get(key).setFilter(1);
      g.destroy();
    });
  }
}
