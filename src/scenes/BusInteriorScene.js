import Phaser from 'phaser';
import {BUS_163_DESTINATIONS} from '../data/destinations.js';
import {OUTSIDE_LOCATIONS} from '../data/outside-locations.js';
import {emitAudioCue} from '../audio/hooks.js';

export default class BusInteriorScene extends Phaser.Scene {
  constructor(){super('BusInteriorScene');}
  create({outsideKey='OutsideScene'}={}) {
    this.outsideKey=outsideKey;this.ready=false;this.leaving=false;this.selectedDestination=null;
    this.element=document.createElement('section');this.element.className='bus-interior';this.element.style.opacity=0;
    this.element.innerHTML=`<div class="interior-ceiling"></div><div class="interior-window interior-window-left"><div class="passing-scenery"></div></div><div class="interior-window interior-window-right"><div class="passing-scenery"></div></div><div class="interior-seat seat-left"></div><div class="interior-seat seat-right"></div><div class="interior-rail"></div><header class="interior-heading"><span class="eyebrow">SOMEWHERE BETWEEN HERE AND THERE</span><p>Let the world pass by.</p></header><div class="phone-hand"></div><section class="memory-phone" aria-label="Bus 163 destination phone"><div class="phone-notch"></div><div class="phone-status"><span>9:41</span><span aria-hidden="true">● ▰</span></div><div class="phone-app"><div class="phone-brand">remember<span>.</span><span class="phone-route">BUS 163</span></div><div class="phone-journey"><span class="journey-light"></span>ON BOARD · NJ TRANSIT</div><h1>Where to next?</h1><p class="phone-intro">Every stop holds a little story.</p><div id="bus-destinations"></div><div class="destination-preview" role="status" hidden><span class="eyebrow">A MEMORY IN THE MAKING</span><p></p></div><button class="get-off-bus" type="button">Get off at the bus stop <span aria-hidden="true">↗</span></button><p class="phone-footnote">No rush. The memories will wait.</p></div><div class="phone-home-bar"></div></section>`;
    document.querySelector('#app').append(this.element);
    const destinations=this.element.querySelector('#bus-destinations');
    for(const destination of BUS_163_DESTINATIONS) {
      const button=document.createElement('button');button.className='destination-button';button.type='button';button.dataset.destination=destination.id;
      const icon=document.createElement('span');icon.className=`destination-icon ${destination.icon}`;icon.textContent=destination.icon==='city'?'▥':'✳';icon.setAttribute('aria-hidden','true');
      const copy=document.createElement('span');const title=document.createElement('strong');title.textContent=destination.name;const subtitle=document.createElement('small');subtitle.textContent=destination.subtitle;copy.append(title,subtitle);
      const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(icon,copy,arrow);
      button.addEventListener('click',()=>this.selectDestination(destination));destinations.append(button);
    }
    this.element.querySelector('.get-off-bus').addEventListener('click',()=>this.getOff());
    this.element.querySelectorAll('button').forEach(button=>button.disabled=true);
    const progress={opacity:0};
    this.tweens.add({targets:progress,opacity:1,duration:1100,ease:'Sine.easeInOut',onUpdate:()=>this.element.style.opacity=progress.opacity,
      onComplete:()=>{
        this.scene.stop('BusBoardingScene');this.ready=true;
        this.element.querySelectorAll('button').forEach(button=>button.disabled=false);
        this.scene.get(this.outsideKey).busEvent.onBus();
        this.setPhase('on-bus');emitAudioCue('bus-interior');
      }});
    this.events.once('shutdown',()=>this.element.remove());
  }
  setPhase(phase) {document.body.dataset.phase=phase;window.dispatchEvent(new CustomEvent('remember:phase',{detail:{phase}}));}
  selectDestination(destination) {
    if(!this.ready||this.leaving) return;
    this.selectedDestination=destination.id;
    for(const button of this.element.querySelectorAll('.destination-button')) button.setAttribute('aria-pressed',String(button.dataset.destination===destination.id));
    const preview=this.element.querySelector('.destination-preview');preview.hidden=false;
    preview.querySelector('p').textContent=destination.preview;
    // Future registered destination scenes use the same data-driven selection.
    if(destination.scene && this.game.scene.keys[destination.scene]) {
      this.leaving=true;this.ready=false;
      const fade={value:1};this.tweens.add({targets:fade,value:0,duration:900,onUpdate:()=>this.element.style.opacity=fade.value,
        onComplete:()=>{this.scene.stop(this.outsideKey);this.scene.start(destination.scene,{arrival:'bus-163',destinationId:destination.id});}});
    }
  }
  getOff() {
    if(!this.ready||this.leaving) return;
    this.leaving=true;this.ready=false;this.setPhase('alighting');
    this.element.querySelectorAll('button').forEach(button=>button.disabled=true);
    const outside=this.scene.get(this.outsideKey),position=OUTSIDE_LOCATIONS.bus163Return;
    outside.player.body.reset(position.x,position.y);outside.setPlayerControl(false);
    this.scene.resume(this.outsideKey);
    const fade={value:1};
    this.tweens.add({targets:fade,value:0,duration:1000,ease:'Sine.easeInOut',onUpdate:()=>this.element.style.opacity=fade.value,
      onComplete:()=>{outside.busEvent.getOff();outside.setPhase('playing');this.scene.stop();}});
  }
}
