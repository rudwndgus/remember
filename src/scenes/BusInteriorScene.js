import Phaser from 'phaser';
import {BUS_163_DESTINATIONS} from '../data/destinations.js';
import {OUTSIDE_LOCATIONS} from '../data/outside-locations.js';
import {emitAudioCue} from '../audio/hooks.js';

export default class BusInteriorScene extends Phaser.Scene {
  constructor(){super('BusInteriorScene');}
  preload() {
    if(!this.textures.exists('bus-hudson-interior')) this.load.image('bus-hudson-interior',`${import.meta.env.BASE_URL}assets/bus/interior-hudson.png`);
  }
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
    this.cabinImage=this.textures.get('bus-hudson-interior').getSourceImage();
    this.travelPixels=0;
    // Glass only: the passenger, seat backs, poles and mirror stay in the cabin.
    this.windows=[
      [[0,76],[44,105],[44,748],[0,748]],
      [[210,141],[744,319],[744,594],[707,606],[680,619],[626,639],[576,655],[550,659],[532,646],[499,631],[478,621],[472,601],[481,564],[476,519],[455,487],[430,471],[398,450],[350,440],[307,447],[279,467],[263,502],[268,548],[281,578],[288,617],[290,637],[263,642],[210,681]],
      [[797,261],[823,280],[823,325],[797,316]],
      [[797,340],[823,347],[823,572],[797,583]],
      [[1059,305],[1160,305],[1160,360],[1198,360],[1198,500],[1078,500],[1059,478]],
      [[1225,361],[1278,361],[1278,308],[1293,308],[1293,499],[1225,499]],
      [[1336,289],[1365,282],[1365,491],[1336,494]],
    ];
    // Reuse the supplied skyline and Hudson pixels, filling only the scenery
    // hidden behind the original passenger so panning never drags them outside.
    const strip=document.createElement('canvas');strip.width=540;strip.height=558;
    const c=strip.getContext('2d');c.imageSmoothingEnabled=false;
    c.fillStyle='#79b6ef';c.fillRect(0,0,540,558);
    c.save();c.beginPath();c.moveTo(0,7);c.lineTo(538,185);c.lineTo(538,558);c.lineTo(0,558);c.closePath();c.clip();
    c.drawImage(this.cabinImage,208,134,540,558,0,0,540,558);c.restore();
    // Clean, unobstructed facade and water samples from the same illustration.
    c.drawImage(this.cabinImage,550,320,192,184,48,186,240,184);
    c.drawImage(this.cabinImage,485,504,257,102,48,370,240,102);
    for(let x=0;x<540;x+=160)c.drawImage(this.cabinImage,485,606,160,31,x,472,160,86);
    this.scenery=document.createElement('canvas');this.scenery.width=1080;this.scenery.height=558;
    const p=this.scenery.getContext('2d');p.imageSmoothingEnabled=false;p.drawImage(strip,0,0);
    p.translate(1080,0);p.scale(-1,1);p.drawImage(strip,0,0);
    this.cabin.dataset.asset='interior-hudson.png';
  }
  update(time,delta) {
    if(!this.cabinImage) return;
    const w=Math.round(this.cabin.clientWidth),h=Math.round(this.cabin.clientHeight);
    if (!w || !h) return;
    if(this.cabin.width!==w||this.cabin.height!==h){this.cabin.width=w;this.cabin.height=h;}
    const c=this.cabinContext;c.imageSmoothingEnabled=false;
    this.travelPixels+=Math.min(delta,60)*.009;
    this.cabin.dataset.travel=String(Math.floor(this.travelPixels));
    const mobile=window.matchMedia('(max-width: 600px)').matches,artHeight=h;
    const zoom=mobile?Math.min((w-10)/1448,(h-10)/1086):Math.max(w/1448,h/1086)*1.016;
    const x=(w-1448*zoom)/2,y=(artHeight-1086*zoom)/2;
    const bob=Math.sin(time*.0021)*2.3+Math.sin(time*.0071)*.65;
    const sway=Math.sin(time*.0014)*1.7;
    this.cabin.dataset.bob=bob.toFixed(2);
    c.fillStyle='#111827';c.fillRect(0,0,w,h);c.save();
    c.translate(x+724*zoom+sway,y+543*zoom+bob);c.rotate(Math.sin(time*.0017)*.0012);c.scale(zoom,zoom);c.translate(-724,-543);
    c.drawImage(this.cabinImage,0,0,1448,1086);
    c.save();c.beginPath();
    for(const points of this.windows){points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.closePath();}
    c.clip();
    // Slow skyline, flowing water, faster roadside rail: continuous parallax.
    for(const [sourceY,height,speed] of [[0,370,.55],[370,102,1.15],[472,86,2.4]]){
      const offset=Math.floor(this.travelPixels*speed)%1080;
      for(let tile=-1;tile<3;tile++)c.drawImage(this.scenery,0,sourceY,1080,height,208-offset+tile*1080,134+sourceY,1080,height);
    }
    c.restore();c.restore();
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
