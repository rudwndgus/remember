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
    this.progress={opacity:0,approach:0};this.element.style.opacity=0;
    this.tweens.add({targets:this.progress,opacity:1,duration:950,ease:'Sine.easeInOut',onUpdate:()=>{this.element.style.opacity=this.progress.opacity;}});
    this.tweens.add({targets:this.progress,approach:1,duration:BUS_163.boardingMs,ease:'Sine.easeInOut',
      onUpdate:()=>{coach.style.transform=`translate(-50%, -50%) scale(${.72+this.progress.approach*.47})`;},
      onComplete:()=>this.scene.launch('BusInteriorScene',{outsideKey:this.outsideKey}),
    });
    this.events.once('shutdown',()=>this.element.remove());
  }
}
