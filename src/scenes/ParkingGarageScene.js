import Phaser from 'phaser';
import { startMapDissolve, anchorArrival, settleArrival, addMapSurround } from './MapDissolveScene.js';
import TouchControls from '../ui/TouchControls.js';
import ShaneTrip from '../systems/ShaneTrip.js';
import CollisionLayer from '../maps/CollisionLayer.js';
import { PLAYER } from '../utils/constants.js';
import { PARKING_GARAGE, parkingGarageSpawnX, parkingGarageSpawnY, GARAGE_OBSTACLES, GARAGE_PLAYER_SCALE, garageExitTrigger } from '../data/parking-garage.js';

export default class ParkingGarageScene extends Phaser.Scene {
  constructor(key = 'ParkingGarageScene') { super(key); }

  create(data = {}) {
    // Fetch the ride art during exploration, before the boarding sequence ends.
    if (!this.textures.exists('shane-interior')) {
      this.load.image('shane-interior', `${import.meta.env.BASE_URL}assets/car/shane-interior.png`);
      this.load.start();
    }
    const spawn = { x: parkingGarageSpawnX, y: parkingGarageSpawnY };
    this.arrivalAnchor = null;
    this.arrivalSettling = false;
    this.controlsEnabled = false;
    this.facing = 'up';
    this.walkClock = 0;
    this.textures.get('parking-garage-map').setFilter(Phaser.Textures.FilterMode.NEAREST);
    addMapSurround(this);
    this.mapImage = this.add.image(0, 0, 'parking-garage-map', '__BASE').setOrigin(0);
    this.createAutomaticDoor();
    this.shadow = this.add.ellipse(spawn.x, spawn.y - 1, 13 * GARAGE_PLAYER_SCALE, 5 * GARAGE_PLAYER_SCALE, 0x18221c, .25);
    this.player = this.add.sprite(spawn.x, spawn.y, `intern-${this.facing}-1`).setOrigin(.5, 1).setScale(GARAGE_PLAYER_SCALE);
    this.collisionLayer = new CollisionLayer(GARAGE_OBSTACLES, PARKING_GARAGE.width, PARKING_GARAGE.height);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.touchControls = new TouchControls();
    this.shaneTrip = new ShaneTrip(this);
    this.resetInput = () => { this.input.keyboard.resetKeys(); this.touchControls.reset(); };
    this.onVisibility = () => { if (document.hidden) this.resetInput(); };
    window.addEventListener('blur', this.resetInput);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.camera = this.cameras.main;
    this.camera.roundPixels = true;
    const bounds = { x: 0, y: 0, ...PARKING_GARAGE };
    this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.resize();
    this.camera.startFollow(this.player, true, 1, 1);
    this.camera.centerOn(this.player.x, this.player.y);
    this.scale.on('resize', this.resize, this);
    anchorArrival(this, data.travelAnchor);
    this.resetInput();
    this.controlsEnabled = true;
    this.touchControls.setEnabled(true);
    this.player.setTexture('intern-up-0');
    document.querySelector('#game-hud').hidden = false;
    document.querySelector('#scene-status').textContent = 'bluu - Parking garage';
    this.setPhase('garage-playing');
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
    const bounds = PARKING_GARAGE;
    this.camera.setZoom(Math.max(this.scale.width / bounds.width, this.scale.height / bounds.height));
    if (this.arrivalAnchor) anchorArrival(this, this.arrivalAnchor);
  }

  update(time, delta) {
    this.shaneTrip.update(delta);
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
    this.updateAutomaticDoor(delta);
    const next = this.collisionLayer.moveFeet(this.player.x, this.player.y, x / length * distance, y / length * distance,
          (nx, ny) => (this.doorOpen > .92 || ny < 570 || ny > 713 || nx < 665 || nx > 793) && !this.collisionLayer.overlaps(nx - 4 * GARAGE_PLAYER_SCALE, ny - 6 * GARAGE_PLAYER_SCALE, 8 * GARAGE_PLAYER_SCALE, 6 * GARAGE_PLAYER_SCALE));
    const moved = Math.hypot(next.x - this.player.x, next.y - this.player.y) > .01;
    this.player.setPosition(next.x, next.y);
    if (moved) {
      settleArrival(this, PARKING_GARAGE);
      this.facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
      this.walkClock += delta;
    } else this.walkClock = 0;
    this.player.setTexture(`intern-${this.facing}-${moved ? Math.floor(this.walkClock / 145) % 2 + 1 : 0}`);
    this.shadow.setPosition(this.player.x, this.player.y - 1);
    const contains = zone => this.player.x >= zone.x && this.player.x <= zone.x + zone.width
      && this.player.y >= zone.y && this.player.y <= zone.y + zone.height;
    if (moved && y > 0 && contains(garageExitTrigger)) {
      this.controlsEnabled = false;
      this.resetInput();
      this.touchControls.setEnabled(false);
      this.facing = 'down';
      this.setPhase('garage-leaving');
      startMapDissolve(this, false);
    }
  }

  createAutomaticDoor() {
    const texture = this.textures.get('parking-garage-map');
    if (!texture.has('lobby-floor')) {
      texture.add('lobby-floor', 0, 580, 490, 32, 32);
      texture.add('door-left', 0, 676, 580, 53, 74);
      texture.add('door-right', 0, 729, 580, 53, 74);
    }
    // Replace only the doorway pixels with the same lobby floor. The surrounding
    // facade remains the supplied art; its two glass leaves rotate at the hinges.
    this.add.tileSprite(676, 550, 106, 146, 'parking-garage-map', 'lobby-floor').setOrigin(0);
    this.doorLeft = this.add.image(676, 580, 'parking-garage-map', 'door-left').setOrigin(0, 0).setDepth(3);
    this.doorRight = this.add.image(782, 580, 'parking-garage-map', 'door-right').setOrigin(1, 0).setDepth(3);
    this.doorOpen = 0;
    this.doorHold = 0;
  }

  updateAutomaticDoor(delta) {
    const near = this.shaneTrip?.stage === 'gathering' || (this.player.x > 642 && this.player.x < 816 && this.player.y > 515 && this.player.y < 785);
    if (near) this.doorHold = 900;
    else this.doorHold = Math.max(0, this.doorHold - delta);
    const target = this.doorHold > 0 ? 1 : 0;
    this.doorOpen += Math.sign(target - this.doorOpen) * Math.min(Math.abs(target - this.doorOpen), Math.min(delta, 60) / 480);
    const swing = Phaser.Math.Easing.Sine.InOut(this.doorOpen);
    for (const leaf of [this.doorLeft, this.doorRight]) {
      leaf.setScale(Math.max(.10, Math.cos(swing * Math.PI / 2)), 1);
      leaf.setY(580 - swing * 25);
      // The doorway stays open while the player is in its sweep on either side.
      leaf.setDepth(this.player.y < 640 ? 3 : 0);
    }
  }
}
