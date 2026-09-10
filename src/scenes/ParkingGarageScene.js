import Phaser from 'phaser';
import TouchControls from '../ui/TouchControls.js';
import CollisionLayer from '../maps/CollisionLayer.js';
import { PLAYER } from '../utils/constants.js';
import { PARKING_GARAGE, parkingGarageSpawnX, parkingGarageSpawnY, GARAGE_TRANSITION, GARAGE_OBSTACLES, GARAGE_PLAYER_SCALE, garageExitTrigger, elevatorRoomTrigger, garageDoorReturn, ELEVATOR_ROOM } from '../data/parking-garage.js';

export default class ParkingGarageScene extends Phaser.Scene {
  constructor(key = 'ParkingGarageScene') { super(key); }

  create(data = {}) {
    this.isRoom = this.sys.settings.key === 'ElevatorRoomScene';
    const spawn = this.isRoom ? { x: ELEVATOR_ROOM.spawnX, y: ELEVATOR_ROOM.spawnY }
      : data.fromRoom ? garageDoorReturn : { x: parkingGarageSpawnX, y: parkingGarageSpawnY };
    const inward = data.fromRoom ? 1 : -1;
    this.controlsEnabled = false;
    this.facing = inward > 0 ? 'down' : 'up';
    this.walkClock = 0;
    this.textures.get('parking-garage-map').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, 'parking-garage-map').setOrigin(0);
    this.shadow = this.add.ellipse(spawn.x, spawn.y - 1, 13 * GARAGE_PLAYER_SCALE, 5 * GARAGE_PLAYER_SCALE, 0x18221c, .25);
    this.player = this.add.sprite(spawn.x, spawn.y, `intern-${this.facing}-1`).setOrigin(.5, 1).setScale(GARAGE_PLAYER_SCALE);
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
    const bounds = this.isRoom ? ELEVATOR_ROOM : { x: 0, y: 0, ...PARKING_GARAGE };
    this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.resize();
    this.camera.startFollow(this.player, true, 1, 1);
    this.camera.centerOn(this.player.x, this.player.y);
    this.scale.on('resize', this.resize, this);
    this.setPhase(this.isRoom ? 'elevator-arrival' : 'garage-arrival');
    const restingZoom = this.camera.zoom;
    this.camera.setZoom(restingZoom * GARAGE_TRANSITION.push);
    this.camera.zoomTo(restingZoom, GARAGE_TRANSITION.inMs, 'Sine.easeInOut');
    this.camera.fadeIn(GARAGE_TRANSITION.inMs, ...GARAGE_TRANSITION.color);
    this.tweens.add({ targets: this.player, y: spawn.y + inward * GARAGE_TRANSITION.step,
      duration: GARAGE_TRANSITION.inMs, ease: 'Sine.easeOut',
      onComplete: () => {
        this.resetInput();
        this.controlsEnabled = true;
        this.touchControls.setEnabled(true);
        this.player.setTexture(`intern-${this.facing}-0`);
        document.querySelector('#game-hud').hidden = false;
        document.querySelector('#scene-status').textContent = 'bluu · Parking garage';
        if (this.isRoom) document.querySelector('#scene-status').textContent = 'bluu · Elevator lobby';
        this.setPhase(this.isRoom ? 'elevator-playing' : 'garage-playing');
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
    const bounds = this.isRoom ? ELEVATOR_ROOM : PARKING_GARAGE;
    this.camera.setZoom(Math.max(this.scale.width / bounds.width, this.scale.height / bounds.height));
  }

  update(time, delta) {
    this.shadow.setPosition(this.player.x, this.player.y - 1);
    if (!this.controlsEnabled) {
      this.player.setTexture(`intern-${this.facing}-${Math.floor(time / 145) % 2 + 1}`);
      return;
    }
    let x = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    let y = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    if (this.touchControls.vector.x || this.touchControls.vector.y) ({ x, y } = this.touchControls.vector);
    const length = Math.max(1, Math.hypot(x, y));
    const distance = PLAYER.speed * GARAGE_PLAYER_SCALE * Math.min(delta, 60) / 1000;
    const next = this.isRoom
      ? { x: Phaser.Math.Clamp(this.player.x + x / length * distance, 568, 876),
          y: Phaser.Math.Clamp(this.player.y + y / length * distance, 490, 555) }
      : this.collisionLayer.moveFeet(this.player.x, this.player.y, x / length * distance, y / length * distance,
          (nx, ny) => !this.collisionLayer.overlaps(nx - 4 * GARAGE_PLAYER_SCALE, ny - 6 * GARAGE_PLAYER_SCALE, 8 * GARAGE_PLAYER_SCALE, 6 * GARAGE_PLAYER_SCALE));
    const moved = Math.hypot(next.x - this.player.x, next.y - this.player.y) > .01;
    this.player.setPosition(next.x, next.y);
    if (moved) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
      this.walkClock += delta;
    } else this.walkClock = 0;
    this.player.setTexture(`intern-${this.facing}-${moved ? Math.floor(this.walkClock / 145) % 2 + 1 : 0}`);
    this.shadow.setPosition(this.player.x, this.player.y - 1);
    const contains = zone => this.player.x >= zone.x && this.player.x <= zone.x + zone.width
      && this.player.y >= zone.y && this.player.y <= zone.y + zone.height;
    if (this.isRoom && y > 0 && this.player.y >= ELEVATOR_ROOM.exitY && this.player.x >= 678 && this.player.x <= 782)
      this.leave('ParkingGarageScene', { fromRoom: true }, 'down');
    else if (moved && !this.isRoom && y > 0 && contains(garageExitTrigger))
      this.leave('OutsideScene', { fromGarage: true }, 'down');
    else if (moved && !this.isRoom && y < 0 && contains(elevatorRoomTrigger))
      this.leave('ElevatorRoomScene', {}, 'up');
  }

  leave(scene, data, facing) {
    this.controlsEnabled = false;
    this.resetInput();
    this.touchControls.setEnabled(false);
    this.facing = facing;
    this.setPhase(this.isRoom ? 'elevator-leaving' : 'garage-leaving');
    document.querySelector('#game-hud').hidden = true;
    this.camera.zoomTo(this.camera.zoom * GARAGE_TRANSITION.push, GARAGE_TRANSITION.outMs, 'Sine.easeInOut');
    this.camera.fadeOut(GARAGE_TRANSITION.outMs, ...GARAGE_TRANSITION.color);
    this.camera.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
}

