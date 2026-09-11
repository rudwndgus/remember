import Phaser from 'phaser';
import { MAP } from '../utils/constants.js';
import { PARKING_GARAGE, GARAGE_PLAYER_SCALE, parkingGarageSpawnX, parkingGarageSpawnY, companyExitSpawn } from '../data/parking-garage.js';

export function startMapDissolve(scene, entering) {
  const { player, camera } = scene;
  const width = scene.scale.width, height = scene.scale.height;
  const anchor = {
    x: ((player.x - camera.scrollX - width / 2) * camera.zoom + width / 2) / width,
    y: ((player.y - camera.scrollY - height / 2) * camera.zoom + height / 2) / height,
  };
  scene.scene.start('MapDissolveScene', { entering, anchor,
    sourceX: player.x, sourceY: player.y, sourceZoom: camera.zoom,
    sourceScale: player.scaleX, facing: entering ? 'up' : 'down' });
}

// Keep the arrival frame identical to the final dissolve frame. Camera bounds
// return gently only when walking resumes, never at the scene handoff.
export function anchorArrival(scene, anchor) {
  if (!anchor) return;
  const camera = scene.camera, w = scene.scale.width, h = scene.scale.height;
  camera.stopFollow();
  camera.removeBounds();
  camera.setScroll(scene.player.x - w / 2 - (anchor.x * w - w / 2) / camera.zoom,
    scene.player.y - h / 2 - (anchor.y * h - h / 2) / camera.zoom);
  scene.arrivalAnchor = anchor;
}

export function settleArrival(scene, map) {
  if (!scene.arrivalAnchor || scene.arrivalSettling) return;
  scene.arrivalSettling = true;
  const camera = scene.camera;
  const hx = scene.scale.width / (2 * camera.zoom), hy = scene.scale.height / (2 * camera.zoom);
  camera.pan(Phaser.Math.Clamp(scene.player.x, hx, map.width - hx),
    Phaser.Math.Clamp(scene.player.y, hy, map.height - hy), 900, 'Sine.easeInOut');
  camera.once('camerapancomplete', () => {
    scene.arrivalAnchor = null;
    scene.arrivalSettling = false;
    camera.setBounds(0, 0, map.width, map.height);
    camera.startFollow(scene.player, true, .08, .08);
  });
}

export function addMapSurround(scene) {
  const texture = scene.textures.get('parking-garage-map');
  if (!texture.has('asphalt')) texture.add('asphalt', 0, 300, 750, 80, 80);
  // TileSprite allocates a canvas at its logical size even in WebGL. A 12k
  // square used ~576 MB per scene and could exhaust mobile/browser memory.
  // Cover only the viewport, compensating for the world camera's zoom.
  const surround = scene.add.tileSprite(0, 0, scene.scale.width, scene.scale.height,
    'parking-garage-map', 'asphalt').setOrigin(0).setScrollFactor(0).setDepth(-10);
  const fit = () => {
    const w = scene.scale.width, h = scene.scale.height;
    const zoom = scene.cameras.main.zoom;
    if (surround.width !== w || surround.height !== h) surround.setSize(w, h);
    surround.setPosition(w / 2 - w / (2 * zoom), h / 2 - h / (2 * zoom));
    surround.setScale(1 / zoom).setTileScale(zoom);
  };
  fit();
  scene.events.on('prerender', fit);
  scene.events.once('shutdown', () => scene.events.off('prerender', fit));
}

export default class MapDissolveScene extends Phaser.Scene {
  constructor() { super('MapDissolveScene'); }
  create(data) {
    this.dataIn = data;
    document.querySelector('#game-hud').hidden = true;
    addMapSurround(this);
    const map = data.entering ? PARKING_GARAGE : MAP;
    this.target = data.entering ? { x: parkingGarageSpawnX, y: parkingGarageSpawnY } : companyExitSpawn;
    this.targetScale = data.entering ? GARAGE_PLAYER_SCALE : 1;
    this.source = this.add.image(0, 0, data.entering ? 'outside-map' : 'parking-garage-map').setOrigin(0);
    this.destination = this.add.image(0, 0, data.entering ? 'parking-garage-map' : 'outside-map').setOrigin(0).setAlpha(0);
    this.shadow = this.add.ellipse(0, 0, 13, 5, 0x18221c, .25);
    this.actor = this.add.sprite(0, 0, `intern-${data.facing}-0`).setOrigin(.5, 1);
    this.progress = { zoom: 0, dissolve: 0 };
    this.layout = () => {
      const w = this.scale.width, h = this.scale.height;
      const ax = data.anchor.x * w, ay = data.anchor.y * h;
      const targetZoom = Math.max(w / map.width, h / map.height);
      const actorScale = Phaser.Math.Linear(data.sourceScale * data.sourceZoom, this.targetScale * targetZoom, this.progress.zoom);
      const sourceZoom = actorScale / data.sourceScale;
      this.source.setScale(sourceZoom).setPosition(ax - data.sourceX * sourceZoom, ay - data.sourceY * sourceZoom);
      this.destination.setScale(targetZoom).setPosition(ax - this.target.x * targetZoom, ay - this.target.y * targetZoom).setAlpha(this.progress.dissolve);
      this.actor.setPosition(ax, ay).setScale(actorScale);
      this.shadow.setPosition(ax, ay - actorScale).setScale(actorScale);
    };
    this.layout();
    this.scale.on('resize', this.layout);
    this.tweens.add({ targets: this.progress, zoom: 1, duration: 1100, ease: 'Sine.easeInOut', onUpdate: this.layout,
      onComplete: () => this.tweens.add({ targets: this.progress, dissolve: 1, duration: 650,
        ease: 'Sine.easeInOut', onUpdate: this.layout, onComplete: () => {
          this.scene.start(data.entering ? 'ParkingGarageScene' : 'OutsideScene',
            { fromGarage: !data.entering, travelAnchor: data.anchor });
        } }) });
    this.events.once('shutdown', () => this.scale.off('resize', this.layout));
  }
}
