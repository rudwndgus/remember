import Phaser from 'phaser';
import { gameConfig } from './game/config.js';
import { setupPWA } from './pwa.js';
import { setupAudioHooks } from './audio/hooks.js';
import './style.css';

const pwa = setupPWA();
const cleanupAudio = setupAudioHooks();
const game = new Phaser.Game(gameConfig);

// Mobile visual viewport changes do not always emit an orientation event.
// Observe the actual full-screen container so canvas and circle focus follow
// the new dimensions even during the cinematic or browser-bar resizing.
const viewportObserver = new ResizeObserver(([entry]) => {
  const width = Math.round(entry.contentRect.width);
  const height = Math.round(entry.contentRect.height);
  if (game.isBooted && width > 0 && height > 0
    && (game.scale.width !== width || game.scale.height !== height)) {
    game.scale.setParentSize(width, height);
  }
});
viewportObserver.observe(document.querySelector('#game'));

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
  viewportObserver.disconnect();
  game.destroy(true);
  pwa.destroy();
  cleanupAudio();
  window.removeEventListener('remember:phase', phaseListener);
});
