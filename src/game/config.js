import Phaser from 'phaser';
import BootScene from '../scenes/BootScene.js';
import TitleScene from '../scenes/TitleScene.js';
import OutsideScene from '../scenes/OutsideScene.js';
import { COLORS } from '../utils/constants.js';

const diagnostics = new URLSearchParams(window.location.search);

export const gameConfig = {
  // Opt-in fallback testing: ?debug=1&renderer=canvas. Normal play uses AUTO.
  type: diagnostics.has('debug') && diagnostics.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.blue,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false, powerPreference: 'low-power' },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  audio: { noAudio: true },
  scene: [BootScene, TitleScene, OutsideScene],
};
