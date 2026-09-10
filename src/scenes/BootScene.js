import Phaser from 'phaser';
import { ASSETS } from '../utils/constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this.failedAssets = [];
    this.load.on('loaderror', (file) => this.failedAssets.push(file.key));
    this.load.image('bluu-logo', ASSETS.logo);
    this.load.image('outside-map', ASSETS.map);
    this.load.image('parking-garage-map', ASSETS.parkingGarage);
  }

  create() {
    document.querySelector('#loading-notice').hidden = true;
    if (this.failedAssets.length) {
      // Never replace a personal photo/map with an unrelated generated asset.
      // An explicit recovery screen keeps a missing asset from becoming a crash.
      document.body.dataset.phase = 'missing-assets';
      document.querySelector('#title-chrome').hidden = true;
      document.querySelector('#asset-notice').hidden = false;
      const list = document.querySelector('#missing-assets');
      list.replaceChildren(...this.failedAssets.map((key) => {
        const li = document.createElement('li');
        li.textContent = key === 'bluu-logo' ? 'public/assets/ui/bluu-logo.png' : key === 'parking-garage-map' ? 'public/assets/maps/parking-garage-map.png' : 'public/assets/maps/outside-main-map.png';
        return li;
      }));
      return;
    }
    // Match the supplied logo's actual blue, avoiding a visible square edge
    // even when the image has slightly different compression/color values.
    const image = this.textures.get('bluu-logo').getSourceImage();
    const sampler = document.createElement('canvas');
    sampler.width = sampler.height = 1;
    const ctx = sampler.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const color = (r << 16) | (g << 8) | b;
    this.registry.set('logoBlue', color);
    document.documentElement.style.setProperty('--bluu-blue', `rgb(${r} ${g} ${b})`);
    document.querySelector('meta[name="theme-color"]').content = `#${color.toString(16).padStart(6, '0')}`;
    this.scene.start('TitleScene');
  }
}
