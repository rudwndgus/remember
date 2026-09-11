import Phaser from 'phaser';

export default class PalparkTripScene extends Phaser.Scene {
  constructor(){super('PalparkTripScene');}
  preload(){if(!this.textures.exists('shane-interior'))this.load.image('shane-interior',`${import.meta.env.BASE_URL}assets/car/shane-interior.png`);}
  create(){
    this.elapsed=0;this.arrived=false;
    document.querySelector('#game-hud').hidden=true;
    this.element=document.createElement('section');this.element.className='car-trip';
    this.element.innerHTML='<canvas width="768" height="512" aria-label="Shane, 승애와 함께 팰팍으로 가는 길"></canvas><footer><h2>함께 팰팍으로</h2><p role="status">Shane이 운전하고, 승애와 나는 창밖을 바라본다.</p><progress max="6000" value="0" aria-label="팰팍까지 이동"></progress><button hidden>주차장으로 돌아가기</button></footer>';
    document.querySelector('#app').append(this.element);
    this.canvas=this.element.querySelector('canvas');this.ctx=this.canvas.getContext('2d');this.ctx.imageSmoothingEnabled=false;
    this.image=this.textures.get('shane-interior').getSourceImage();
    this.element.querySelector('button').onclick=()=>this.scene.start('ParkingGarageScene');
    this.setPhase('car-trip');
    this.events.once('shutdown',()=>this.element.remove());
  }
  setPhase(phase){document.body.dataset.phase=phase;window.dispatchEvent(new CustomEvent('remember:phase',{detail:{phase}}));}
  update(time,delta){
    this.elapsed+=Math.min(delta,60);
    if(this.elapsed>=6000&&!this.arrived){
      this.arrived=true;this.setPhase('palpark');
      this.element.querySelector('h2').textContent='팰팍에 도착했어!';
      this.element.querySelector('p').textContent='Shane · 승애 · 나 — 함께 온 Palisades Park';
      this.element.querySelector('progress').hidden=true;
    }
    if(this.arrived){this.drawArrival();return;}
    this.element.querySelector('progress').value=this.elapsed;
    const c=this.ctx,bob=Math.sin(time*.006)*1.2;
    c.fillStyle='#172722';c.fillRect(0,0,768,512);
    c.drawImage(this.image,0,bob,768,512);
    // Animate only the unobstructed middle of the windshield; occupants stay still.
    c.save();c.beginPath();c.moveTo(204,15);c.lineTo(522,15);c.lineTo(528,130);c.lineTo(202,132);c.closePath();c.clip();
    const offset=(this.elapsed*.013)%160;
    for(let i=-1;i<3;i++) c.drawImage(this.image,410,28,640,235,204-offset+i*320,14+bob,320,118);
    c.restore();
  }
  drawArrival(){
    const c=this.ctx;
    c.fillStyle='#627061';c.fillRect(0,0,768,512);
    c.fillStyle='#b5aa87';c.fillRect(0,115,768,210);
    c.fillStyle='#575e59';c.fillRect(0,325,768,150);
    c.fillStyle='#d0bf70';for(let x=0;x<768;x+=90)c.fillRect(x,397,48,3);
    c.fillStyle='#d7ceab';for(let x=0;x<768;x+=18){c.fillRect(x,302,16,20);c.fillRect(x,476,16,25);}
    for(let i=0;i<4;i++){
      const x=28+i*188;
      c.fillStyle=['#81533f','#8c8065','#71594b','#7e725b'][i];c.fillRect(x,90,155,205);
      c.fillStyle='#414c47';c.fillRect(x-4,82,163,33);
      c.fillStyle='#c4b79a';c.fillRect(x,198,155,28);
      c.fillStyle='#203d40';for(let j=0;j<3;j++){c.fillRect(x+12+j*46,130,32,45);c.fillRect(x+12+j*46,235,32,50);}
      c.fillStyle='#ece1bd';c.font='bold 12px monospace';c.textAlign='center';c.fillText(['BAKERY','MARKET','CAFE','BOOKS'][i],x+77,217);
    }
    c.fillStyle='#273d32';c.fillRect(220,22,328,43);c.strokeStyle='#b4bf95';c.lineWidth=3;c.strokeRect(220,22,328,43);
    c.fillStyle='#f3e7ba';c.font='bold 22px monospace';c.textAlign='center';c.fillText('PALISADES PARK',384,51);
    for(const x of [12,204,393,584,756]){c.fillStyle='#514e36';c.fillRect(x,258,8,40);c.fillStyle='#3e633e';c.fillRect(x-16,225,38,42);c.fillStyle='#78954b';c.fillRect(x-12,222,24,25);}
    const y=512-Math.min(1,(this.elapsed-6000)/1200)*151;
    c.drawImage(this.textures.get('parking-garage-map').getSourceImage(),57,542,134,84,365,y,90,56);
    if(this.elapsed>7200){
      for(const [key,x,label] of [['friend-Shane',367,'Shane'],['friend-승애',412,'승애'],['intern-down-0',457,'나']]){
        c.drawImage(this.textures.get(key).getSourceImage(),x,302,24,36);
        c.fillStyle='#fff0c9';c.font='11px monospace';c.fillText(label,x+12,296);
      }
      this.element.querySelector('button').hidden=false;
    }
  }
}
