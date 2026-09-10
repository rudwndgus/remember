import Phaser from 'phaser';
import TouchControls from '../ui/TouchControls.js';
import CollisionLayer from '../maps/CollisionLayer.js';
import { PLAYER } from '../utils/constants.js';
import { PARKING_GARAGE, parkingGarageSpawnX, parkingGarageSpawnY, GARAGE_TRANSITION, GARAGE_OBSTACLES } from '../data/parking-garage.js';

export default class ParkingGarageScene extends Phaser.Scene {
  constructor() { super('ParkingGarageScene'); }

  create() {
    this.controlsEnabled = false;
    this.facing = 'up';
    this.walkClock = 0;
    this.textures.get('parking-garage-map').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, 'parking-garage-map').setOrigin(0);
    this.shadow = this.add.ellipse(parkingGarageSpawnX, parkingGarageSpawnY - 1, 13, 5, 0x18221c, .25);
    this.player = this.add.sprite(parkingGarageSpawnX, parkingGarageSpawnY, 'intern-up-1').setOrigin(.5, 1);
    this.collisionLayer = new CollisionLayer(GARAGE_OBSTACLES, PARKING_GARAGE.width, PARKING_GARAGE.height);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.touchControls = new TouchControls();
    this.resetInput = () => { this.input.keyboard.resetKeys(); this.touchControls.reset(); };
    this.onVisibility = () => { if (document.hidden) this.resetInput(); };
    window.addEventListener('blur', this.resetInput);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.camera = this.cameras.main;
    this.camera.roundPixels = true;
    this.camera.setBounds(0, 0, PARKING_GARAGE.width, PARKING_GARAGE.height);
    this.resize();
    this.camera.startFollow(this.player, true, 1, 1);
    this.camera.centerOn(this.player.x, this.player.y);
    this.scale.on('resize', this.resize, this);
    this.setPhase('garage-arrival');
    this.camera.fadeIn(GARAGE_TRANSITION.inMs, ...GARAGE_TRANSITION.color);
    this.tweens.add({ targets: this.player, y: parkingGarageSpawnY - GARAGE_TRANSITION.step,
      duration: GARAGE_TRANSITION.inMs, ease: 'Sine.easeOut',
      onComplete: () => {
        this.resetInput();
        this.controlsEnabled = true;
        this.touchControls.setEnabled(true);
        this.player.setTexture('intern-up-0');
        document.querySelector('#game-hud').hidden = false;
        document.querySelector('#scene-status').textContent = 'bluu · Parking garage';
        this.setPhase('garage-playing');
      } });
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.resize, this);
      window.removeEventListener('blur', this.resetInput);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.touchControls.destroy();
      this.input.keyboard.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D']);
      document.querySelector('#game-hud').hidden = true;
    });
  }

  setPhase(phase) {
    this.phase = phase;
    document.body.dataset.phase = phase;
    window.dispatchEvent(new CustomEvent('remember:phase', { detail: { phase } }));
  }

  resize() {
    this.camera.setSize(this.scale.width, this.scale.height);
    this.camera.setZoom(Math.max(this.scale.width / PARKING_GARAGE.width, this.scale.height / PARKING_GARAGE.height));
  }

  update(time, delta) {
    this.shadow.setPosition(this.player.x, this.player.y - 1);
    if (!this.controlsEnabled) {
      this.player.setTexture(`intern-up-${Math.floor(time / 145) % 2 + 1}`);
      return;
    }
    let x = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    let y = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    if (this.touchControls.vector.x || this.touchControls.vector.y) ({ x, y } = this.touchControls.vector);
    const length = Math.max(1, Math.hypot(x, y));
    const distance = PLAYER.speed * Math.min(delta, 60) / 1000;
    const next = this.collisionLayer.moveFeet(this.player.x, this.player.y, x / length * distance, y / length * distance);
    const moved = Math.hypot(next.x - this.player.x, next.y - this.player.y) > .01;
    this.player.setPosition(next.x, next.y);
    if (moved) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
      this.walkClock += delta;
    } else this.walkClock = 0;
    this.player.setTexture(`intern-${this.facing}-${moved ? Math.floor(this.walkClock / 145) % 2 + 1 : 0}`);
    this.shadow.setPosition(this.player.x, this.player.y - 1);
  }
}
