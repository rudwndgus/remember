import Phaser from 'phaser';
import {BUS_163_DESTINATIONS} from '../data/destinations.js';
import {OUTSIDE_LOCATIONS} from '../data/outside-locations.js';
import {emitAudioCue} from '../audio/hooks.js';

export default class BusInteriorScene extends Phaser.Scene {
  constructor(){super('BusInteriorScene');}
  create({outsideKey='OutsideScene'}={}) {
    this.outsideKey=outsideKey;this.ready=false;this.leaving=false;this.selectedDestination=null;
    this.element=document.createElement('section');this.element.className='bus-interior';this.element.style.opacity=0;
    this.element.innerHTML=`<canvas class="pixel-bus-cabin" aria-label="Pixel-art view from a bus seat, with passing scenery outside the windows"></canvas><header class="seat-heading"><span> NJ TRANSIT / 163 </span><p>창가에 앉아, 다음 기억으로.</p></header><section class="seat-dialogue" aria-label="Choose your next stop"><span class="seat-route">163 · 창가 좌석</span><h1>어디로 갈까?</h1><p class="seat-intro">창밖의 풍경은 계속 흐르고 있어.</p><div id="bus-destinations"></div><div class="destination-preview" role="status" hidden><span class="eyebrow">A MEMORY IN THE MAKING</span><p></p></div><button class="get-off-bus" type="button">정류장에서 내리기 <span aria-hidden="true">↗</span></button></section>`;
    document.querySelector('#app').append(this.element);
    this.createCabin();
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
  createCabin() {
    this.cabin=this.element.querySelector('canvas');this.cabinContext=this.cabin.getContext('2d');
    this.travelPixels=0;
    this.scenery=document.createElement('canvas');this.scenery.width=512;this.scenery.height=96;
    const c=this.scenery.getContext('2d'),rect=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    rect('#a6bab0',0,0,512,96);rect('#c8ccae',0,38,512,58);
    for(let x=0;x<512;x+=17){rect('#718363',x,29+(x%11),18,29);rect('#87936c',x+3,27+(x%11),10,18);}
    for(let x=16;x<512;x+=83){
      rect('#53645a',x+2,39,51,40);rect('#a59776',x,42,48,34);rect('#6a6653',x-2,39,52,4);
      rect('#ccc09a',x+1,43,46,2);
      for(let y=47;y<72;y+=9)for(let k=4;k<44;k+=9){rect('#3f5756',x+k,y,5,6);rect('#8caaa1',x+k,y,4,1);}
      for(let y=47;y<74;y+=4)rect('#8a8067',x,y,48,1);
    }
    for(let x=0;x<512;x+=37){
      rect('#5a6048',x+9,51,3,30);
      for(let k=0;k<7;k++){const y=38+(k*7)%22;rect(['#405c43','#637b4b','#849158'][k%3],x+(k*11)%16,y,12,10);}
      for(let k=0;k<30;k++)rect(k%2?'#99a168':'#526d44',x+(k*7)%26,39+(k*11)%30,2,1);
    }
    rect('#bbb391',0,81,512,5);rect('#777e75',0,86,512,10);
    for(let x=0;x<512;x+=32)rect('#d4cbb0',x,91,15,1);
  }
  update(time,delta) {
    if(!this.cabin) return;
    // Low-resolution drawing and integer scrolling keep every scene pixel sharp.
    const w=Math.max(192,Math.round(this.scale.width/4)),h=Math.round(w*this.scale.height/this.scale.width);
    if(this.cabin.width!==w||this.cabin.height!==h){this.cabin.width=w;this.cabin.height=h;}
    const c=this.cabinContext;c.imageSmoothingEnabled=false;
    this.travelPixels+=Math.min(delta,60)*.022;
    this.cabin.dataset.travel=String(Math.floor(this.travelPixels));
    const rect=(color,x,y,width,height)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(width),Math.round(height));};
    const poly=(color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
    const portrait=h>w,top=h*.18,bottom=h*(portrait?.48:.62);
    rect('#737e75',0,0,w,h);poly('#abae97',[[0,0],[w,0],[w*.65,top],[w*.35,top]]);
    for(let x=0;x<w;x+=w/7){poly('#878f7d',[[x,0],[x+2,0],[w*.5+(x-w*.5)*.3,top],[w*.5+(x-w*.5)*.3-1,top]]);}
    rect('#d4ceb0',w*.33,top-4,w*.34,2);rect('#56665d',w*.32,top,w*.36,h);
    // Both windows share continuous town scenery; choosing an option never pauses it.
    for(const right of [false,true]){
      const points=right?[[w*.69,top+6],[w,top-8],[w,bottom],[w*.69,bottom-18]]:[[0,top-8],[w*.31,top+6],[w*.31,bottom-18],[0,bottom]];
      poly('#293f3d',points);c.save();c.beginPath();
      const inner=right?[[w*.71,top+9],[w,top-4],[w,bottom-5],[w*.71,bottom-21]]:[[0,top-4],[w*.29,top+9],[w*.29,bottom-21],[0,bottom-5]];
      inner.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.clip();
      const offset=Math.floor(this.travelPixels+(right?180:0))%512;
      for(let x=-offset-512;x<w;x+=512)c.drawImage(this.scenery,x,Math.round(top-5),512,Math.round(bottom-top));
      c.restore();
      const rail=right?w*.85:w*.14;rect('#778779',rail,top,2,bottom-top-7);rect('#b8bba0',rail,top,1,bottom-top-7);
    }
    poly('#3c514e',[[w*.4,top+23],[w*.6,top+23],[w*.75,h],[w*.25,h]]);
    for(let y=top+40;y<h;y+=8)rect('#475c56',w*.4,y,w*.2,1);
    const seat=(x,y,sw,sh)=>{
      rect('#283c3d',x-3,y+3,sw+6,sh);rect('#a7ae98',x,y,sw,2);rect('#456968',x,y+3,sw,sh);
      rect('#718981',x+2,y+4,sw-4,3);rect('#344f52',x+sw-3,y+5,3,sh-2);
      for(let sy=10;sy<sh-3;sy+=4)for(let sx=3;sx<sw-4;sx+=5){rect('#5e7a71',x+sx,y+sy,2,1);rect('#344f50',x+sx+1,y+sy+1,1,1);}
      rect('#283e3c',x+3,y+sh*.65,sw-6,2);rect('#b2b49b',x-5,y+sh*.73,5,3);rect('#8e9d8c',x+sw,y+sh*.73,5,3);
    };
    seat(w*.29,top+26,w*.13,h*.2);seat(w*.59,top+26,w*.13,h*.2);
    seat(-3,bottom-5,w*.29,h*.46);seat(w*.75,bottom-5,w*.29,h*.46);
    for(const x of [w*.26,w*.73]){rect('#354c46',x,0,3,h*.8);rect('#bec1a6',x+1,0,1,h*.8);}
    // The player's lap and hands establish a seated view, with no phone.
    const knees=h*(portrait?.52:.83);
    for(const x of [w*.38,w*.53]){
      rect('#263d46',x-2,knees+3,w*.1,h*.22);rect('#47636a',x,knees,w*.1,h*.23);
      rect('#627974',x+2,knees+2,3,h*.19);rect('#bd906e',x-2,knees-4,w*.075,7);
      rect('#e2ba8a',x-1,knees-5,w*.065,5);rect('#ebe0bd',x-3,knees-11,w*.08,7);
    }
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
