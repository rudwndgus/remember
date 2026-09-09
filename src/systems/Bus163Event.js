import { BUS_163, OUTSIDE_LOCATIONS } from '../data/outside-locations.js';
import { DEBUG } from '../game/debug.js';
import { emitAudioCue } from '../audio/hooks.js';

export const BUS_STATES=Object.freeze({IDLE:'IDLE',WAITING:'WAITING',BUS_APPROACHING:'BUS_APPROACHING',
  BUS_STOPPING:'BUS_STOPPING',BUS_READY:'BUS_READY',BOARDING:'BOARDING',ON_BUS:'ON_BUS'});
const transitions={IDLE:['WAITING'],WAITING:['IDLE','BUS_APPROACHING'],BUS_APPROACHING:['BUS_STOPPING'],
  BUS_STOPPING:['BUS_READY'],BUS_READY:['BOARDING'],BOARDING:['ON_BUS'],ON_BUS:['IDLE']};

export default class Bus163Event {
  constructor(scene,traffic) {
    Object.assign(this,{scene,traffic,state:BUS_STATES.IDLE,waitElapsed:0,bus:null,leaveBeforeWaiting:false,lockedForArrival:false});
    this.cue=document.createElement('div');this.cue.id='bus-cue';this.cue.className='bus-cue';this.cue.hidden=true;
    this.cue.innerHTML='<span class="bus-route-pill">163</span><span class="bus-cue-text"></span>';
    this.cue.setAttribute('role','status');
    this.button=document.createElement('button');this.button.id='board-bus';this.button.className='board-bus';this.button.hidden=true;
    this.button.type='button';this.button.innerHTML='<span class="action-key">E</span><span>Board Bus 163<small>THE NEXT LITTLE CHAPTER</small></span><span aria-hidden="true">↗</span>';
    document.querySelector('#game-hud').append(this.cue,this.button);
    this.onBoard=()=>this.board();this.button.addEventListener('click',this.onBoard);
    this.onKey=(event)=>{
      if(!event.repeat && this.scene.scene.isActive() && ['KeyE','Enter'].includes(event.code)
        && !event.target.closest?.('.pwa-notice')) {if(this.board()) event.preventDefault();}
    };
    window.addEventListener('keydown',this.onKey);
    document.body.dataset.busState=this.state;
    if(DEBUG.busStopZone || DEBUG.busPath) {
      const g=scene.add.graphics().setDepth(15),z=OUTSIDE_LOCATIONS.busStop163;
      if(DEBUG.busStopZone) g.lineStyle(2,0x83dbde).strokeRect(z.x-z.width/2,z.y-z.height/2,z.width,z.height);
      if(DEBUG.busPath) {g.lineStyle(2,0x83dbde).lineBetween(OUTSIDE_LOCATIONS.bus163Spawn.x,0,OUTSIDE_LOCATIONS.bus163Stop.x,OUTSIDE_LOCATIONS.bus163Stop.y);g.strokeCircle(OUTSIDE_LOCATIONS.bus163Stop.x,OUTSIDE_LOCATIONS.bus163Stop.y,10);}
    }
  }
  inside() {
    const z=OUTSIDE_LOCATIONS.busStop163,p=this.scene.player;
    return Math.abs(p.x-z.x)<=z.width/2 && Math.abs(p.y-z.y)<=z.height/2;
  }
  near() {const p=this.scene.player,s=OUTSIDE_LOCATIONS.bus163Stop;return Math.hypot(p.x-s.x,p.y-s.y)<BUS_163.interactionDistance;}
  setState(state) {
    if(!transitions[this.state].includes(state)) return false;
    this.state=state;document.body.dataset.busState=state;
    window.dispatchEvent(new CustomEvent('remember:bus-state',{detail:{state,route:BUS_163.route}}));
    return true;
  }
  update(delta) {
    if(this.scene.phase!=='playing') return;
    if(this.leaveBeforeWaiting) {
      if(!this.inside()) this.leaveBeforeWaiting=false;
      return;
    }
    if(this.state==='IDLE' && this.inside()) {this.waitElapsed=0;this.setState('WAITING');}
    if(this.state==='WAITING') {
      if(!this.inside()) {this.waitElapsed=0;this.setState('IDLE');}
      else {
        this.waitElapsed+=delta;
        if(this.waitElapsed>=BUS_163.waitMs) this.setState('BUS_APPROACHING');
      }
    }
    if(this.state==='BUS_APPROACHING') {
      if(!this.bus) {this.bus=this.traffic.spawnBus163();if(this.bus) emitAudioCue('bus-engine');}
      if(this.bus && this.bus.stopDistance-this.bus.distance<BUS_163.closeDistance) {
        this.setState('BUS_STOPPING');emitAudioCue('bus-braking');
        if(this.near()) {this.scene.setPlayerControl(false);this.lockedForArrival=true;}
      }
    }
    if(this.state==='BUS_STOPPING' && this.bus.stopDistance-this.bus.distance<.4 && this.bus.speed<1) {
      this.setState('BUS_READY');emitAudioCue('bus-door');
      if(this.lockedForArrival) {this.scene.setPlayerControl(true);this.lockedForArrival=false;}
    }
    this.renderCue();
  }
  renderCue() {
    const messages={WAITING:'Waiting for Bus 163…',BUS_APPROACHING:'Bus 163 is coming down the road.',BUS_STOPPING:'Your ride is pulling in.',BUS_READY:'A seat for your next memory.'};
    this.cue.hidden=!messages[this.state] || (this.state==='BUS_READY'&&!this.near());
    this.cue.querySelector('.bus-cue-text').textContent=messages[this.state]||'';
    this.button.hidden=this.state!=='BUS_READY'||!this.near();
  }
  board() {
    if(this.state!=='BUS_READY' || !this.near() || !this.scene.scene.isActive()) return false;
    this.setState('BOARDING');this.scene.setPlayerControl(false);
    this.button.hidden=true;this.cue.hidden=true;
    emitAudioCue('boarding');
    this.scene.scene.launch('BusBoardingScene',{outsideKey:this.scene.scene.key});
    this.scene.scene.pause();
    return true;
  }
  onBus() {this.setState('ON_BUS');}
  getOff() {
    if(this.state!=='ON_BUS') return;
    if(this.bus) this.bus.stopDistance=null;
    this.bus=null;this.leaveBeforeWaiting=true;this.waitElapsed=0;
    this.setState('IDLE');this.renderCue();this.scene.setPlayerControl(true);
  }
  destroy() {window.removeEventListener('keydown',this.onKey);this.button.removeEventListener('click',this.onBoard);this.cue.remove();this.button.remove();}
}
