import Phaser from 'phaser';
import { gameConfig } from './game/config.js';
import { setupPWA } from './pwa.js';
import { setupAudioHooks } from './audio/hooks.js';
import './style.css';

const pwa = setupPWA();
const cleanupAudio = setupAudioHooks();
const game = new Phaser.Game(gameConfig);

const phaseListener = ({ detail: { phase } }) => {
  pwa.setIntroActive(!['title', 'playing'].includes(phase));
  if (phase === 'logo-focus') window.dispatchEvent(new Event('remember:start'));
  const descriptions = {
    title: 'Tap to start your memory.',
    'logo-focus': 'Entering the circular logo.',
    reveal: 'Revealing the neighborhood.',
    overview: 'The whole neighborhood, seen from above.',
    arrival: 'Arriving at the company entrance.',
    playing: 'Welcome to bluu. Use arrow keys, WASD, or the touch joystick to walk.',
  };
  if (descriptions[phase]) document.querySelector('#live-status').textContent = descriptions[phase];
};
window.addEventListener('remember:phase', phaseListener);
document.querySelector('#retry-assets').addEventListener('click', () => window.location.reload());
document.querySelector('#replay-intro').addEventListener('click', () => {
  if (!game.scene.isActive('OutsideScene')) return;
  game.scene.stop('OutsideScene');
  game.scene.start('TitleScene');
});

// Opt-in diagnostics for real browser tests; no debug overlays in normal play.
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) window.__REMEMBER_GAME__ = game;
if (import.meta.hot) import.meta.hot.dispose(() => {
  game.destroy(true);
  pwa.destroy();
  cleanupAudio();
  window.removeEventListener('remember:phase', phaseListener);
});
