import Phaser from 'phaser';
import { COLORS, INTRO, LOGO_FOCUS } from '../utils/constants.js';

/** The mark is a masked SECOND image, anchored at the circle's source center.
 * The wordmark fades independently. Scaling can therefore never target "bluu".
 * A white backing disk bridges this zoom and OutsideScene's circular aperture.
 */
export default class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    this.started = false;
    this.progress = { focus: 0, zoom: 0 };
    this.phase = 'title';
    this.cameras.main.setBackgroundColor(this.registry.get('logoBlue') ?? COLORS.blue);
    this.logo = this.add.image(0, 0, 'bluu-logo');
    this.disk = this.add.graphics();
    this.mark = this.add.image(0, 0, 'bluu-logo').setOrigin(LOGO_FOCUS.x, LOGO_FOCUS.y).setVisible(false);
    this.maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    this.markMask = this.maskShape.createGeometryMask();
    this.mark.setMask(this.markMask);
    this.ring = this.add.graphics();

    this.chrome = document.querySelector('#title-chrome');
    this.chrome.hidden = false;
    this.chrome.classList.remove('leaving');
    this.button = document.querySelector('#start-button');
    this.button.disabled = false;
    document.querySelector('#game-hud').hidden = true;
    this.setPhase('title');
    this.layout();

    this.startHandler = () => this.startIntro();
    this.pointerHandler = (event) => {
      if (!event.target.closest('#install-app, .pwa-notice')) this.startIntro();
    };
    this.keyHandler = (event) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        if (event.target.closest?.('.pwa-notice')) return;
        event.preventDefault();
        this.startIntro();
      }
    };
    this.button.addEventListener('click', this.startHandler);
    document.querySelector('#app').addEventListener('pointerdown', this.pointerHandler);
    window.addEventListener('keydown', this.keyHandler);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', this.shutdown, this);
  }

  setPhase(phase) {
    this.phase = phase;
    document.body.dataset.phase = phase;
    window.dispatchEvent(new CustomEvent('remember:phase', { detail: { phase } }));
  }

  layout() {
    const { width, height } = this.scale;
    const source = this.textures.get('bluu-logo').getSourceImage();
    const side = Math.min(300, width * 0.64, height * 0.43);
    const baseScale = side / source.width;
    const logoX = width / 2;
    const logoY = height * 0.43;
    this.logo.setPosition(logoX, logoY).setScale(baseScale);
    const initialX = logoX + (LOGO_FOCUS.x - 0.5) * side;
    const initialY = logoY + (LOGO_FOCUS.y - 0.5) * side;
    const x = Phaser.Math.Linear(initialX, width / 2, this.progress.focus);
    const y = Phaser.Math.Linear(initialY, height / 2, this.progress.focus);
    const initialRadius = LOGO_FOCUS.radius * side;
    const finalRadius = Math.hypot(width, height) / 2 + 30;
    // Exponential interpolation makes the approach feel like camera travel,
    // with no abrupt speed change when the circle becomes larger than the view.
    const radius = initialRadius * Math.pow(finalRadius / initialRadius, this.progress.zoom);
    this.mark.setPosition(x, y).setScale(baseScale * radius / initialRadius);
    this.maskShape.clear().fillStyle(0xffffff).fillCircle(x, y, radius);
    this.disk.clear();
    if (this.started) this.disk.fillStyle(COLORS.white).fillCircle(x, y, radius);
    this.ring.clear();
    if (this.started && this.progress.zoom < 0.5) {
      this.ring.lineStyle(1, 0xffffff, 0.25 * (1 - this.progress.zoom * 2));
      this.ring.strokeCircle(x, y, radius + 10 + this.progress.focus * 8);
    }
    // Near the end, the blue waves dissolve into the white disk. OutsideScene
    // starts with exactly this color, then reveals the map through its center.
    this.mark.setAlpha(1 - Phaser.Math.Clamp((this.progress.zoom - 0.67) / 0.3, 0, 1));
    this.logo.setAlpha(1 - this.progress.focus);
    document.documentElement.style.setProperty('--title-copy-top', `${logoY + side * 0.48}px`);
  }

  startIntro() {
    if (this.started) return;
    this.started = true;
    this.button.disabled = true;
    this.button.blur();
    this.chrome.classList.add('leaving');
    this.mark.setVisible(true);
    // Leave only the lower wordmark on the original image while the separate
    // circle travels, so the symbol never appears twice during the focus move.
    const source = this.textures.get('bluu-logo').getSourceImage();
    const wordmarkTop = Math.ceil((LOGO_FOCUS.y + LOGO_FOCUS.radius) * source.height);
    this.logo.setCrop(0, wordmarkTop, source.width, source.height - wordmarkTop);
    this.setPhase('logo-focus');
    this.tweens.add({
      targets: this.progress, focus: 1,
      duration: INTRO.logoFocusMs, ease: 'Sine.easeInOut',
      onUpdate: () => this.layout(),
      onComplete: () => {
        this.setPhase('logo-zoom');
        this.tweens.add({
          targets: this.progress, zoom: 1,
          duration: INTRO.logoZoomMs, ease: 'Cubic.easeInOut',
          onUpdate: () => this.layout(),
          onComplete: () => {
            this.chrome.hidden = true;
            this.scene.start('OutsideScene');
          },
        });
      },
    });
  }

  shutdown() {
    this.button.removeEventListener('click', this.startHandler);
    document.querySelector('#app').removeEventListener('pointerdown', this.pointerHandler);
    window.removeEventListener('keydown', this.keyHandler);
    this.scale.off('resize', this.layout, this);
    this.mark.clearMask();
    this.markMask.destroy();
    this.maskShape.destroy();
  }
}
