import Phaser from 'phaser';

export default class ShaneTrip {
  constructor(scene) {
    this.scene = scene;
    this.busy = false;
    this.npcs = [];
    this.button = document.createElement('button');
    this.button.className = 'car-interact';
    this.button.textContent = 'E · 자동차 살펴보기';
    this.button.hidden = true;
    document.querySelector('#game-hud').append(this.button);
    this.interact = () => { if (this.near() && !this.busy && !this.dialog) this.open(); };
    this.key = event => { if (!event.repeat && ['KeyE','Enter'].includes(event.code)) this.interact(); };
    this.button.addEventListener('click', this.interact);
    window.addEventListener('remember:interact', this.interact);
    window.addEventListener('keydown', this.key);
    this.marker = scene.add.text(216, 557, 'A', { fontFamily: 'monospace', fontSize: '18px', color: '#fff0c7', backgroundColor: '#344b3b', padding: { x: 6, y: 4 } }).setDepth(5).setVisible(false);
    scene.events.once('shutdown', () => this.destroy());
  }
  near() { return this.scene.scene.isActive() && Math.hypot(this.scene.player.x - 210, this.scene.player.y - 600) < 108; }
  update(delta) {
    const available = this.near() && !this.busy && !this.dialog;
    this.button.hidden = !available;
    this.marker.setVisible(available);
    this.scene.touchControls.setAction(available, available ? '살펴보기' : '상호작용');
    for (const npc of this.npcs) npc.label.setPosition(npc.sprite.x, npc.sprite.y - 70);
    if (this.busy) this.scene.updateAutomaticDoor(delta);
  }
  open() {
    const s = this.scene;
    s.controlsEnabled = false; s.resetInput(); s.touchControls.setEnabled(false);
    this.dialog = document.createElement('section');
    this.dialog.className = 'journey-dialog'; this.dialog.setAttribute('role','dialog');
    this.dialog.setAttribute('aria-label','Shane의 자동차?');
    this.dialog.innerHTML = '<h2>Shane의 자동차?</h2><p>Shane, 승애와 함께 팰팍으로 갈까?</p><button data-go>팰팍으로 가기</button><button data-cancel>나중에</button>';
    document.querySelector('#app').append(this.dialog);
    this.dialog.querySelector('[data-cancel]').onclick = () => {
      this.dialog.remove(); this.dialog = null;
      s.resetInput(); s.controlsEnabled = true; s.touchControls.setEnabled(true);
    };
    this.dialog.querySelector('[data-go]').onclick = () => { this.dialog.remove(); this.dialog = null; this.begin(); };
    this.dialog.querySelector('[data-go]').focus();
  }
  makeNPC(name, x, y, shirt, longHair) {
    const s = this.scene, key = `friend-${name}`;
    if (!s.textures.exists(key)) {
      const g = s.make.graphics({ x: 0, y: 0 }, false);
      const r = (c,x,y,w,h) => g.fillStyle(c).fillRect(x,y,w,h);
      r(0x23332d,3,2,10,10); r(0x342a28,3,2,10,longHair?17:6);
      r(0xe8b48a,5,6,6,5); r(shirt,4,11,8,8);
      r(0xe8b48a,2,12,2,6); r(0xe8b48a,12,12,2,6);
      r(0x273a46,4,19,3,4); r(0x273a46,9,19,3,4);
      r(0x172321,3,22,4,2); r(0x172321,9,22,4,2);
      if(longHair) { r(0x342a28,3,6,2,10); r(0x342a28,11,6,2,10); }
      g.generateTexture(key,16,24); g.destroy();
      s.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const sprite=s.add.sprite(x,y,key).setOrigin(.5,1).setScale(2.7).setDepth(2);
    const label=s.add.text(x,y-70,name,{fontFamily:'monospace',fontSize:'15px',color:'#fff0cc',backgroundColor:'#27372f',padding:{x:4,y:2}}).setOrigin(.5,1).setDepth(4);
    this.npcs.push({sprite,label}); return sprite;
  }
  move(actor, points, speed=280) {
    return points.reduce((chain,[x,y]) => chain.then(() => new Promise(resolve => {
      this.scene.tweens.add({ targets: actor, x,y, duration: Math.max(180,Math.hypot(actor.x-x,actor.y-y)/speed*1000), ease:'Sine.easeInOut', onComplete:resolve });
    })), Promise.resolve());
  }
  async begin() {
    const s=this.scene; this.busy=true; this.stage='gathering';
    s.setPhase('car-gathering'); this.button.hidden=true; this.marker.setVisible(false);
    const texture=s.textures.get('parking-garage-map');
    if(!texture.has('elevator-panel')) texture.add('elevator-panel',0,610,362,68,86);
    // An actual opening appears before both friends step out of the elevator.
    const opening=s.add.rectangle(610,362,68,90,0x182420).setOrigin(0);
    const panel=s.add.image(610,362,'parking-garage-map','elevator-panel').setOrigin(0);
    await new Promise(resolve => s.tweens.add({targets:panel,scaleX:.05,duration:650,ease:'Sine.easeInOut',onComplete:resolve}));
    const shane=this.makeNPC('Shane',646,448,0x354d67,false);
    const seungae=this.makeNPC('승애',649,452,0x92a083,true);
    const pause=ms=>new Promise(resolve=>s.time.delayedCall(ms,resolve));
    const a=this.move(shane,[[646,495],[710,525],[710,747],[247,747],[247,598],[193,598]]);
    const b=pause(750).then(()=>this.move(seungae,[[651,500],[740,525],[740,770],[268,770],[268,638],[193,638]]));
    const playerPath=this.move(s.player,[[Math.max(219,s.player.x),s.player.y],[232,660],[188,660]],220);
    s.time.delayedCall(1900,()=>s.tweens.add({targets:panel,scaleX:1,duration:600,onComplete:()=>{panel.destroy();opening.destroy();}}));
    await Promise.all([a,b,playerPath]);
    this.stage='boarding';
    await Promise.all([this.move(shane,[[153,598]],110),this.move(seungae,[[157,618]],110),this.move(s.player,[[151,622]],110)]);
    for(const npc of this.npcs){npc.sprite.setVisible(false);npc.label.setVisible(false);}
    s.player.setVisible(false);s.shadow.setVisible(false);
    if(!texture.has('shane-car')) texture.add('shane-car',0,57,542,134,96);
    s.add.tileSprite(57,542,134,96,'parking-garage-map','asphalt').setOrigin(0);
    const car=s.add.image(124,590,'parking-garage-map','shane-car').setDepth(4);
    s.camera.startFollow(car,true,.08,.08);
    await this.move(car,[[270,590]],210);
    await new Promise(resolve=>s.tweens.add({targets:car,angle:90,duration:400,onComplete:resolve}));
    await this.move(car,[[270,800]],240);
    await new Promise(resolve=>s.tweens.add({targets:car,angle:0,duration:400,onComplete:resolve}));
    await this.move(car,[[724,800]],260);
    await new Promise(resolve=>s.tweens.add({targets:car,angle:90,duration:400,onComplete:resolve}));
    await this.move(car,[[724,1140]],280);
    s.scene.start('PalparkTripScene');
  }
  destroy() {
    window.removeEventListener('remember:interact',this.interact);
    window.removeEventListener('keydown',this.key);
    this.button.remove();this.dialog?.remove();
  }
}
