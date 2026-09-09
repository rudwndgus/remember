import { OUTSIDE_LOCATIONS, BUS_163 } from '../data/outside-locations.js';

export function addOutsideDetails(scene) {
  const {dunkin,busStopSign,busStopBench}=OUTSIDE_LOCATIONS;
  const sign=scene.add.graphics().setDepth(4);
  sign.fillStyle(0x453f36,.3).fillRect(dunkin.x-58,dunkin.y-8,118,23);
  sign.fillStyle(0xfff1d6).fillRect(dunkin.x-57,dunkin.y-11,114,20);
  sign.fillStyle(0xe97835).fillRect(dunkin.x-57,dunkin.y+7,114,3);
  scene.add.text(dunkin.x-4,dunkin.y-2,'DUNKIN\u2019',{
    fontFamily:'Arial, sans-serif',fontSize:'15px',fontStyle:'bold',color:'#ce4278',
  }).setOrigin(.5).setDepth(5);
  sign.fillStyle(0xe97835).fillRoundedRect(dunkin.x+42,dunkin.y-7,8,10,2);
  sign.fillStyle(0xfff5dd).fillRect(dunkin.x+40,dunkin.y-9,12,3);

  const stop=scene.add.graphics().setDepth(5);
  stop.fillStyle(0x68746d).fillRect(busStopSign.x-1,busStopSign.y,3,19);
  stop.fillStyle(0xf0ead6).fillRoundedRect(busStopSign.x-11,busStopSign.y-14,23,22,2);
  stop.fillStyle(0x345c68).fillRect(busStopSign.x-10,busStopSign.y-13,21,7);
  scene.add.text(busStopSign.x+.5,busStopSign.y+1,BUS_163.route,{
    fontFamily:'monospace',fontSize:'9px',fontStyle:'bold',color:'#274d5d',
  }).setOrigin(.5).setDepth(6);
  stop.fillStyle(0x4b5148).fillRect(busStopBench.x-6,busStopBench.y-15,3,30);
  stop.fillStyle(0xa39579).fillRect(busStopBench.x-4,busStopBench.y-14,10,28);
  stop.lineStyle(1,0x776e58);
  for(let y=busStopBench.y-11;y<busStopBench.y+14;y+=5) stop.lineBetween(busStopBench.x-3,y,busStopBench.x+5,y);

  // This perspective roof visually overhangs the horizontal road. Repaint ONLY
  // the original roof above road traffic so cars pass behind it, never on top.
  const roofMask=scene.make.graphics({x:0,y:0},false);
  roofMask.fillStyle(0xffffff).fillPoints([
    {x:693,y:593},{x:770,y:540},{x:850,y:580},{x:850,y:690},{x:693,y:690},
  ],true);
  const roof=scene.add.image(1619/2,971/2,'outside-map').setDepth(11);
  const mask=roofMask.createGeometryMask();roof.setMask(mask);
  scene.events.once('shutdown',()=>{roof.clearMask();mask.destroy();roofMask.destroy();});
}
