import Phaser from 'phaser';
import TouchControls from '../ui/TouchControls.js';
import { MAP, PLAYER, INTRO, CAMERA, DEBUG, COLORS } from '../utils/constants.js';
import { OUTSIDE_OBJECTS, COLLISION_CELL_SIZE, COLLISION_COLORS } from '../maps/outside-collisions.js';
import CollisionLayer from '../maps/CollisionLayer.js';
import TrafficManager from '../systems/TrafficManager.js';
import Bus163Event from '../systems/Bus163Event.js';
import {addOutsideDetails} from '../visuals/outside-details.js';
import { companyEntranceTrigger, companyExitSpawn, GARAGE_TRANSITION } from '../data/parking-garage.js';

const clamp = Phaser.Math.Clamp;
const lerp = Phaser.Math.Linear;

export default class OutsideScene extends Phaser.Scene {
  constructor() {
    super('OutsideScene');
  }

  create(data = {}) {
    this.phase = 'reveal';
    this.controlsEnabled = false;
    this.revealProgress = { value: 0 };
    this.arrivalProgress = { value: 0 };
    this.facing = 'down';
    this.walkClock = 0;
    this.lastFootstepAt = 0;
    this.worldWidth = MAP.width;
    this.worldHeight = MAP.height;
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor('#081b26');
    this.camera.setRoundPixels(true);

    // The original illustration stays a single image. Never stretch its aspect ratio.
    this.textures.get('outside-map').setFilter(Phaser.Textures.FilterMode.NEAREST);
    const mapImage = this.add.image(this.worldWidth / 2, this.worldHeight / 2, 'outside-map');
    const mapScale = Math.min(this.worldWidth / mapImage.width, this.worldHeight / mapImage.height);
    mapImage.setScale(mapScale).setDepth(0);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.createPlayerTextures();
    // Edit PLAYER.spawn in constants.js to move the arrival point by the company entrance.
    this.shadow = this.add.ellipse(PLAYER.spawn.x, PLAYER.spawn.y - 1, 13, 5, 0x102e2f, 0.28).setDepth(2);
    this.player = this.physics.add.sprite(PLAYER.spawn.x, PLAYER.spawn.y, 'intern-down-0');
    this.player.setOrigin(0.5, 1).setDepth(20).setCollideWorldBounds(true);
    // Only the character's feet collide, which is natural for a top-down world.
    this.player.body.setSize(8, 6).setOffset(4, 18);
    this.player.body.setMaxVelocity(PLAYER.speed, PLAYER.speed);
    // Static map collisions are swept through a compact grid, with one player
    // body rather than a thousand immovable bodies. Traffic uses no bodies.
    this.player.body.moves = false;
    this.createObstacles();
    this.createEntranceMarker();
    addOutsideDetails(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D']);
    this.touchControls = new TouchControls();
    this.traffic = new TrafficManager(this);
    this.busEvent = new Bus163Event(this,this.traffic);
    this.trafficWarning = this.add.text(0,0,'!',{
      fontFamily:'sans-serif',fontSize:'17px',fontStyle:'bold',color:'#6b4826',
      backgroundColor:'#fff2be',padding:{x:5,y:1},
    }).setOrigin(.5,1).setDepth(30).setVisible(false);

    // The transition is drawn by an independent screen-space camera. Its circular
    // opening stays perfectly round while the world camera is zoomed or resized.
    this.canvasReveal = null;
    this.circleMask = null;
    this.circleMaskGraphic = null;
    if (this.game.renderer.type === Phaser.CANVAS) {
      // Inverted GeometryMasks are WebGL-only. Canvas uses the identical aperture
      // composited into one texture, preserving the intro on fallback devices.
      this.canvasReveal = this.textures.createCanvas('outside-iris', this.scale.width, this.scale.height);
      this.revealOverlay = this.add.image(0, 0, 'outside-iris').setOrigin(0).setDepth(1000);
    } else {
      this.revealOverlay = this.add.graphics().setDepth(1000);
      this.circleMaskGraphic = this.make.graphics({ x: 0, y: 0 }, false);
      this.circleMask = this.circleMaskGraphic.createGeometryMask();
      this.circleMask.setInvertAlpha(true);
      this.revealOverlay.setMask(this.circleMask);
    }
    this.camera.ignore(this.revealOverlay);
    this.overlayCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, 'iris');
    this.overlayCamera.ignore(this.children.list.filter((child) => child !== this.revealOverlay));

    this.hud = document.querySelector('#game-hud');
    this.status = document.querySelector('#scene-status');
    this.hint = document.querySelector('#movement-hint');
    this.hud?.setAttribute('hidden', '');
    this.setPhase('reveal');
    this.resize();
    this.scale.on('resize', this.resize, this);
    this.onBlur = () => {
      this.touchControls.reset();
      this.input.keyboard.resetKeys();
      this.player?.setVelocity(0, 0);
    };
    window.addEventListener('blur', this.onBlur);
    this.onVisibilityChange = () => { if (document.hidden) this.onBlur(); };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    if (data.fromGarage) {
      this.revealProgress.value = 1;
      this.revealOverlay.setVisible(false);
      this.player.setPosition(companyExitSpawn.x, companyExitSpawn.y);
      this.facing = 'down';
      this.frameCamera(1);
      this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.camera.startFollow(this.player, true, .12, .12);
      this.setPhase('garage-returning');
      this.camera.fadeIn(GARAGE_TRANSITION.inMs, ...GARAGE_TRANSITION.color);
      this.tweens.add({ targets: this.player, y: companyExitSpawn.y + GARAGE_TRANSITION.step,
        duration: GARAGE_TRANSITION.inMs, ease: 'Sine.easeInOut', onComplete: () => {
          this.setPlayerControl(true);
          this.hud.hidden = false;
          this.setPhase('playing');
        } });
      return;
    }

    this.tweens.add({
      targets: this.revealProgress,
      value: 1,
      duration: INTRO.mapRevealMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.drawReveal(),
      onComplete: () => {
        this.revealOverlay.setVisible(false);
        this.setPhase('overview');
        // Hold AFTER the iris has fully opened so the complete neighborhood gets
        // a genuine 1–1.5 second establishing shot, independent of reveal time.
        this.time.delayedCall(INTRO.mapHoldMs, () => this.arriveAtPlayer());
      },
    });
  }

  setPhase(phase) {
    this.phase = phase;
    document.body.dataset.phase = phase;
    const labels = {
      reveal: 'A place to remember',
      overview: 'New York · Summer 2026',
      arrival: 'Your first day starts here',
      playing: 'Outside the office',
    };
    if (this.status) this.status.textContent = labels[phase] ?? '';
    window.dispatchEvent(new CustomEvent('remember:phase', { detail: { phase } }));
  }

  getCameraViews() {
    const { width, height } = this.scale;
    // Full-map framing uses FIT (including on portrait phones); the final zoom
    // uses COVER as a minimum, so following never exposes the map's outer edge.
    const overviewZoom = Math.min(width / this.worldWidth, height / this.worldHeight) * 0.94;
    const playZoom = Math.max(width / this.worldWidth, height / this.worldHeight) * Math.max(1, CAMERA.coverMultiplier);
    const halfWidth = width / (2 * playZoom);
    const halfHeight = height / (2 * playZoom);
    return {
      overviewZoom,
      playZoom,
      targetX: clamp(this.player.x, halfWidth, this.worldWidth - halfWidth),
      targetY: clamp(this.player.y, halfHeight, this.worldHeight - halfHeight),
    };
  }

  frameCamera(progress = 0) {
    const { overviewZoom, playZoom, targetX, targetY } = this.getCameraViews();
    const zoom = lerp(overviewZoom, playZoom, progress);
    let centerX = lerp(this.worldWidth / 2, targetX, progress);
    let centerY = lerp(this.worldHeight / 2, targetY, progress);
    const halfWidth = this.scale.width / (2 * zoom);
    const halfHeight = this.scale.height / (2 * zoom);
    // Respect world edges as soon as the zoom is large enough to fill that axis.
    centerX = halfWidth < this.worldWidth / 2 ? clamp(centerX, halfWidth, this.worldWidth - halfWidth) : this.worldWidth / 2;
    centerY = halfHeight < this.worldHeight / 2 ? clamp(centerY, halfHeight, this.worldHeight - halfHeight) : this.worldHeight / 2;
    this.camera.setZoom(zoom).centerOn(centerX, centerY);
  }

  drawReveal() {
    const { width, height } = this.scale;
    const radius = Math.hypot(width, height) * 0.51 * this.revealProgress.value;
    if (this.canvasReveal) {
      if (this.canvasReveal.width !== width || this.canvasReveal.height !== height) {
        this.canvasReveal.setSize(width, height);
        this.revealOverlay.setTexture('outside-iris');
      }
      const context = this.canvasReveal.getContext();
      context.save();
      context.clearRect(0, 0, width, height);
      context.fillStyle = `#${COLORS.white.toString(16).padStart(6, '0')}`;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
      this.canvasReveal.refresh();
      return;
    }
    this.revealOverlay.clear().fillStyle(COLORS.white, 1).fillRect(0, 0, width, height);
    this.circleMaskGraphic.clear().fillStyle(0xffffff, 1);
    if (radius > 0) this.circleMaskGraphic.fillCircle(width / 2, height / 2, radius);
  }

  arriveAtPlayer() {
    this.setPhase('arrival');
    this.tweens.add({
      targets: this.arrivalProgress,
      value: 1,
      duration: INTRO.playerZoomMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.frameCamera(this.arrivalProgress.value),
      onComplete: () => {
        this.frameCamera(1);
        this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.camera.startFollow(this.player, true, 0.12, 0.12);
        // Discard held input from the cinematic; a fresh press starts walking.
        this.input.keyboard.resetKeys();
        this.controlsEnabled = true;
        this.touchControls.setEnabled(true);
        this.hud?.removeAttribute('hidden');
        this.setPhase('playing');
      },
    });
  }

  resize() {
    this.camera.setSize(this.scale.width, this.scale.height);
    this.overlayCamera.setSize(this.scale.width, this.scale.height);
    if (['garage-entering', 'garage-returning'].includes(this.phase)) return;
    if (this.phase === 'playing') {
      this.camera.setZoom(this.getCameraViews().playZoom);
      this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    } else {
      this.frameCamera(this.phase === 'arrival' ? this.arrivalProgress.value : 0);
    }
    this.drawReveal();
  }

  createObstacles() {
    this.collisionLayer = new CollisionLayer(OUTSIDE_OBJECTS, this.worldWidth, this.worldHeight, COLLISION_CELL_SIZE);
    // Inspect the semantic object boundaries with ?debug=1&collisions=1.
    const query = new URLSearchParams(location.search);
    if (DEBUG.collisions || (query.has('debug') && query.has('collisions'))) {
      this.collisionOverlay = this.add.graphics().setDepth(5);
      for (const object of OUTSIDE_OBJECTS) {
        const color = COLLISION_COLORS[object.kind];
        this.collisionOverlay.lineStyle(object.thickness || 1, color, 0.95);
        this.collisionOverlay.fillStyle(color, 0.30);
        this.collisionOverlay.beginPath();
        object.points.forEach(([x,y], i) => i ? this.collisionOverlay.lineTo(x,y) : this.collisionOverlay.moveTo(x,y));
        if (!object.thickness) { this.collisionOverlay.closePath(); this.collisionOverlay.fillPath(); }
        this.collisionOverlay.strokePath();
      }
    }
  }

  createEntranceMarker() {
    if (!DEBUG.entranceMarker) return;
    this.add.circle(PLAYER.spawn.x, PLAYER.spawn.y, 22, 0xfaf0b8, 0.08)
      .setStrokeStyle(1, 0xfaf0b8, 0.8).setDepth(2);
    this.add.text(PLAYER.spawn.x, PLAYER.spawn.y - 38, 'COMPANY ENTRANCE', {
      fontFamily: 'monospace', fontSize: '8px', color: '#fff4ca',
      backgroundColor: '#142a32', padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(4);
  }

  createPlayerTextures() {
    const colors = {
      outline: 0x21343c, hair: 0x342c2c, skin: 0xe7b487, light: 0xf7d1a8,
      shirt: 0xf0e5ce, shade: 0xc3c9b9, trousers: 0x385263, shoe: 0x243139,
      bag: 0xb86145, bagLight: 0xe29064,
    };
    for (const facing of ['down', 'up', 'left', 'right']) {
      for (let frame = 0; frame < 3; frame += 1) {
        const key = `intern-${facing}-${frame}`;
        if (this.textures.exists(key)) continue;
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        const rect = (color, x, y, width, height) => g.fillStyle(color).fillRect(x, y, width, height);
        const step = frame === 0 ? 0 : frame === 1 ? 1 : -1;
        rect(colors.outline, 4, 1, 8, 10);
        rect(colors.hair, 3, 3, 10, 5);
        rect(colors.skin, 4, 6, 8, 5);
        rect(colors.light, 5, 7, 5, 3);
        rect(colors.hair, 4, 2, 8, 4);
        rect(colors.outline, 3, 11, 10, 8);
        rect(colors.shirt, 4, 11, 8, 7);
        rect(colors.shade, 4, 16, 8, 2);
        rect(colors.skin, 2, 13 + step, 2, 4);
        rect(colors.skin, 12, 13 - step, 2, 4);
        rect(colors.trousers, 4, 18, 3, 4 + Math.max(step, 0));
        rect(colors.trousers, 9, 18, 3, 4 + Math.max(-step, 0));
        rect(colors.shoe, 3, 21 + Math.max(step, 0), 4, 2);
        rect(colors.shoe, 9, 21 + Math.max(-step, 0), 4, 2);
        if (facing === 'up') {
          rect(colors.hair, 4, 5, 8, 5);
          rect(colors.bag, 5, 12, 6, 7);
          rect(colors.bagLight, 6, 13, 4, 2);
        } else if (facing === 'down') {
          rect(colors.outline, 5, 7, 1, 1);
          rect(colors.outline, 10, 7, 1, 1);
          rect(colors.bag, 4, 11, 1, 6);
          rect(colors.bag, 11, 11, 1, 6);
          rect(0x6b8e96, 7, 12, 2, 4);
        } else {
          const left = facing === 'left';
          rect(colors.hair, left ? 8 : 4, 5, 4, 5);
          rect(colors.outline, left ? 4 : 11, 7, 1, 1);
          rect(colors.bag, left ? 10 : 3, 12, 3, 7);
          rect(colors.bagLight, left ? 11 : 3, 13, 2, 3);
        }
        g.generateTexture(key, 16, 24);
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        g.destroy();
      }
    }
  }

  setPlayerControl(enabled) {
    this.controlsEnabled=enabled;
    this.player?.setVelocity(0,0);
    this.input.keyboard.resetKeys();
    this.touchControls?.setEnabled(enabled);
  }

  enterParkingGarage() {
    if (this.phase !== 'playing' || !this.controlsEnabled) return;
    this.setPlayerControl(false);
    this.setPhase('garage-entering');
    this.hud.hidden = true;
    this.facing = 'up';
    const end = this.collisionLayer.moveFeet(this.player.x, this.player.y, 0, -GARAGE_TRANSITION.step);
    this.tweens.add({ targets: this.player, y: end.y, duration: GARAGE_TRANSITION.outMs, ease: 'Sine.easeOut' });
    this.camera.zoomTo(this.camera.zoom * GARAGE_TRANSITION.push, GARAGE_TRANSITION.outMs, 'Sine.easeInOut');
    this.time.delayedCall(GARAGE_TRANSITION.leadMs, () => this.camera.fadeOut(GARAGE_TRANSITION.outMs, ...GARAGE_TRANSITION.color));
    this.camera.once('camerafadeoutcomplete', () => this.scene.start('ParkingGarageScene'));
  }

  update(time, delta) {
    if (!this.player) return;
    if (['garage-entering', 'garage-returning'].includes(this.phase)) {
      this.player.setTexture(`intern-${this.facing}-${Math.floor(time / 145) % 2 + 1}`);
      this.shadow.setPosition(this.player.x, this.player.y - 1);
      return;
    }
    let x = Number(this.cursors.right.isDown || this.wasd.D.isDown)
      - Number(this.cursors.left.isDown || this.wasd.A.isDown);
    let y = Number(this.cursors.down.isDown || this.wasd.S.isDown)
      - Number(this.cursors.up.isDown || this.wasd.W.isDown);
    if (this.touchControls.vector.x || this.touchControls.vector.y) {
      x = this.touchControls.vector.x;
      y = this.touchControls.vector.y;
    }
    // Normalize diagonal movement so it never travels faster than one direction.
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    if(!this.controlsEnabled) {x=0;y=0;}
    const intent={x:x*PLAYER.speed,y:y*PLAYER.speed};
    this.traffic.update(delta,this.player,intent);
    const before={x:this.player.x,y:this.player.y};
    if(this.controlsEnabled) {
      const dt=Math.min(delta,60)/1000;
      const position=this.collisionLayer.moveFeet(before.x,before.y,intent.x*dt,intent.y*dt,
        (nx,ny,oldX,oldY)=>this.traffic.canPlayerEnter(nx,ny,oldX,oldY));
        this.player.setPosition(position.x,position.y);
        this.player.body.updateFromGameObject();
    }
    const distanceMoved=Math.hypot(this.player.x-before.x,this.player.y-before.y);
    this.busEvent.update(delta);
    this.trafficWarning.setPosition(this.player.x,this.player.y-29).setVisible(this.traffic.hazard && this.phase==='playing');
    if (distanceMoved > .01) {
      if (Math.abs(x) > Math.abs(y)) this.facing = x < 0 ? 'left' : 'right';
      else this.facing = y < 0 ? 'up' : 'down';
      this.walkClock += delta;
      const frame = Math.floor(this.walkClock / 145) % 2 + 1;
      this.player.setTexture(`intern-${this.facing}-${frame}`);
    } else {
      this.walkClock = 0;
      this.player.setTexture(`intern-${this.facing}-0`);
    }
    this.shadow.setPosition(this.player.x, this.player.y - 1);
    const entrance = companyEntranceTrigger;
    if (distanceMoved > .01 && this.player.x >= entrance.x && this.player.x <= entrance.x + entrance.width
      && this.player.y >= entrance.y && this.player.y <= entrance.y + entrance.height) this.enterParkingGarage();
    // Audio remains an optional hook. Emit only for actual displacement, so
    // pushing against a building or the world boundary never produces steps.
    if (magnitude > 0 && distanceMoved > 0.1 && time - this.lastFootstepAt >= 300) {
      this.lastFootstepAt = time;
      window.dispatchEvent(new CustomEvent('remember:footstep', {
        detail: { x: this.player.x, y: this.player.y },
      }));
    }
  }

  shutdown() {
    this.controlsEnabled = false;
    this.scale.off('resize', this.resize, this);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.touchControls?.destroy();
    this.busEvent?.destroy();
    this.traffic?.destroy();
    this.hud?.setAttribute('hidden', '');
    this.revealOverlay?.clearMask();
    this.circleMask?.destroy();
    this.circleMaskGraphic?.destroy();
    if (this.canvasReveal) {
      this.revealOverlay.destroy();
      this.textures.remove('outside-iris');
      this.canvasReveal = null;
    }
    this.input.keyboard.removeCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D']);
  }
}
