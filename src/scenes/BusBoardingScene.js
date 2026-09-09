import Phaser from 'phaser';
import {busBoardingArtwork} from '../visuals/bus-boarding-art.js';
import {BUS_163} from '../data/outside-locations.js';

export default class BusBoardingScene extends Phaser.Scene {
  constructor(){super('BusBoardingScene');}
  create({outsideKey='OutsideScene'}={}) {
    this.outsideKey=outsideKey;
    document.body.dataset.phase='boarding';
    window.dispatchEvent(new CustomEvent('remember:phase',{detail:{phase:'boarding'}}));
    this.element=document.createElement('section');this.element.className='bus-boarding';
    this.element.setAttribute('aria-label','Boarding Bus 163');
    this.element.innerHTML=`<div class="boarding-sky"></div><div class="boarding-trees"></div><div class="boarding-road"></div><div class="boarding-heading"><span class="eyebrow">A LITTLE FURTHER FROM THE EVERYDAY</span><h1>A seat for the next chapter.</h1></div><div class="boarding-coach">${busBoardingArtwork}</div><p class="boarding-caption">NJ TRANSIT <span>163</span><small>The familiar sound of the doors opening.</small></p>`;
    document.querySelector('#app').append(this.element);
    const coach=this.element.querySelector('.boarding-coach');
    const svg=coach.querySelector('svg'),ns='http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox','-12 0 240 165'); // Keep the waiting passenger in the portrait camera.
    const outside=this.scene.get(outsideKey),start={x:outside.player.x-76,y:outside.player.y-735};
    const frames=[0,1,2].map(i=>this.textures.get(`intern-right-${i}`).getSourceImage().toDataURL());
    const door=document.createElementNS(ns,'path');door.id='boarding-door';
    door.setAttribute('d','M105 112h5v13h-5z');door.setAttribute('fill','#202e29');svg.append(door);
    const passenger=document.createElementNS(ns,'image');passenger.id='boarding-passenger';
    passenger.setAttribute('width','16');passenger.setAttribute('height','24');
    passenger.setAttribute('style','image-rendering:pixelated');
    passenger.setAttribute('aria-label','Player walking into Bus 163');svg.append(passenger);
    const pose=(p)=>{
      const walk=Math.min(1,Math.max(0,(p-.18)/.64));
      const x=Math.round(start.x+(112-start.x)*walk),y=Math.round(start.y+(125-start.y)*walk);
      passenger.setAttribute('x',x-8);passenger.setAttribute('y',y-24);
      passenger.setAttribute('href',frames[walk>0&&walk<1?1+Math.floor(walk*10)%2:0]);
      passenger.style.opacity=String(1-Math.min(1,Math.max(0,(p-.82)/.1)));
      door.setAttribute('fill',p>.94?'#7c8274':'#202e29');
      this.element.dataset.boardingStep=p<.18?'door-open':p<.82?'walking':p<.94?'entering':'seated';
    };
    pose(0);
    this.progress={opacity:0,approach:0};this.element.style.opacity=0;
    this.tweens.add({targets:this.progress,opacity:1,duration:950,ease:'Sine.easeInOut',onUpdate:()=>{this.element.style.opacity=this.progress.opacity;}});
    this.tweens.add({targets:this.progress,approach:1,duration:BUS_163.boardingMs,ease:'Sine.easeInOut',
      onUpdate:()=>{coach.style.transform=`translate(-50%, -50%) scale(${1+this.progress.approach*.12})`;pose(this.progress.approach);},
      onComplete:()=>this.scene.launch('BusInteriorScene',{outsideKey:this.outsideKey}),
    });
    this.events.once('shutdown',()=>this.element.remove());
  }
}
