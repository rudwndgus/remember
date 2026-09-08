import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, cp, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';
import { build, preview } from 'vite';

// Build into an isolated directory with the bundled original assets.
// If originals are absent, explicit synthetic fixtures test the code only.
// Never overwrite or substitute any user's public/assets image.
const root = resolve(import.meta.dirname, '..');
process.env.VITE_BASE_PATH = '/remember/';
const output = join(root, 'artifacts', 'pwa-smoke');
const publicDir = join(output, 'public');
const outDir = join(output, 'site');
const useOriginalAssets = ['assets/ui/bluu-logo.png', 'assets/maps/outside-main-map.png']
  .every((path) => existsSync(join(root, 'public', path)));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
let server;
let context;

try {
  if (useOriginalAssets) {
    await cp(join(root, 'public'), publicDir, { recursive: true });
  } else {
  const imagePage = await browser.newPage();
  for (const image of [
    { width: 300, height: 300, path: 'assets/ui/bluu-logo.png', kind: 'logo' },
    { width: 1619, height: 971, path: 'assets/maps/outside-main-map.png', kind: 'map' },
  ]) {
    const target = join(publicDir, image.path);
    await mkdir(resolve(target, '..'), { recursive: true });
    await imagePage.setViewportSize({ width: image.width, height: image.height });
    await imagePage.setContent('<html><body style="margin:0"><canvas></canvas></body></html>');
    await imagePage.evaluate(({ width, height, kind }) => {
      const canvas = document.querySelector('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = kind === 'logo' ? '#084c94' : '#4f6b46';
      ctx.fillRect(0, 0, width, height);
      if (kind === 'logo') {
        ctx.fillStyle = '#fffff9';
        ctx.beginPath(); ctx.arc(148, 113, 53, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#084c94'; ctx.fillRect(142, 62, 12, 104);
        ctx.fillStyle = '#fffff9'; ctx.font = '58px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('bluu', 150, 234);
      } else {
        ctx.fillStyle = '#879082'; ctx.fillRect(0, 455, width, 130);
        ctx.fillStyle = '#d3c8ae'; ctx.fillRect(1160, 143, 390, 296);
        ctx.fillStyle = '#ffffff'; ctx.font = '24px sans-serif'; ctx.fillText('SYNTHETIC PWA TEST FIXTURE', 35, 65);
      }
    }, image);
    await imagePage.screenshot({ path: target });
  }
  await imagePage.close();
  await cp(join(root, 'public', 'icons'), join(publicDir, 'icons'), { recursive: true });
  }
  await build({ root, base: '/remember/', publicDir, build: { outDir }, logLevel: 'warn' });
  const manifest = JSON.parse(await readFile(join(outDir, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, '/remember/');
  assert.equal(manifest.scope, '/remember/');
  assert.equal(manifest.display, 'standalone');
  assert(manifest.icons.some((icon) => icon.sizes === '512x512'));

  server = await preview({ root, base: '/remember/', build: { outDir }, preview: { host: '127.0.0.1', port: 4174, strictPort: true }, logLevel: 'error' });
  context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4174/remember/?debug=1');
  await page.waitForFunction(() => document.body.dataset.phase === 'title');
  await page.screenshot({ path: join(output, useOriginalAssets ? 'original-title.png' : 'fixture-title.png') });
  await page.waitForFunction(() => document.documentElement.dataset.offlineReady === 'true', null, { timeout: 30000 });
  // First install deliberately waits for a navigation to control this page.
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(() => document.body.dataset.phase === 'title');
  const cachedAssets = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = (await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()))).flat();
    return requests.map((request) => request.url);
  });
  assert(cachedAssets.some((url) => url.includes('outside-main-map.png')), 'Map must be precached');
  assert(cachedAssets.some((url) => url.includes('bluu-logo.png')), 'Logo must be precached');
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.phase === 'title');
  await page.getByRole('button', { name: /Tap to Start/ }).click();
  await page.waitForFunction(() => document.body.dataset.phase === 'overview');
  await page.screenshot({ path: join(output, useOriginalAssets ? 'original-overview.png' : 'fixture-overview.png') });
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', null, { timeout: 20000 });
  const startX = await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player.x);
  await page.keyboard.down('a');
  await page.waitForTimeout(400);
  await page.keyboard.up('a');
  const endX = await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player.x);
  assert(endX < startX - 10, 'Offline keyboard movement must work');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: join(output, useOriginalAssets ? 'original-offline-playing.png' : 'offline-fixture.png') });
  // Verify the Canvas fallback's aperture actually reveals the center while its
  // corners remain white; inverted Phaser GeometryMasks only support WebGL.
  await page.goto('http://127.0.0.1:4174/remember/?debug=1&renderer=canvas');
  await page.waitForFunction(() => document.body.dataset.phase === 'title');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const scene = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    if (document.body.dataset.phase === 'reveal' && scene.revealProgress.value > 0.35) {
      scene.tweens.pauseAll();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(50);
  const pixels = await page.evaluate(() => {
    const canvas = window.__REMEMBER_GAME__.canvas;
    const context = canvas.getContext('2d');
    return {
      center: [...context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data],
      corner: [...context.getImageData(0, 0, 1, 1).data],
    };
  });
  assert.deepEqual(pixels.corner, [255, 255, 249, 255], 'Canvas iris corner must remain white');
  assert.notDeepEqual(pixels.center, pixels.corner, 'Canvas iris center must show the map');
  await page.screenshot({ path: join(output, 'canvas-iris.png') });
  await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').tweens.resumeAll());
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', null, { timeout: 20000 });
  assert.deepEqual(errors, []);
  console.log(`PASS: /remember/ manifest + precached assets + offline reload + complete intro + movement + Canvas iris (${useOriginalAssets ? 'original user images' : 'synthetic fixtures only'}).`);
} finally {
  await context?.close();
  await browser.close();
  if (server) await new Promise((done) => server.httpServer.close(done));
}
