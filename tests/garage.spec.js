import { test, expect } from '@playwright/test';

test('company entrance walks smoothly into garage and restores movement', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.garagePhases = [];
    window.addEventListener('remember:phase', ({ detail }) => window.garagePhases.push({ phase: detail.phase, at: performance.now() }));
  });
  await page.goto('/?debug=1&no-traffic');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing', { timeout: 20000 });
  // Walk from the real starting point around the front garden, never reposition the player.
  const walk = async (key, axis, threshold, less = false) => {
    await page.keyboard.down(key);
    await page.waitForFunction(({ axis, threshold, less }) => {
      const p = window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player;
      return less ? p[axis] <= threshold : p[axis] >= threshold;
    }, { axis, threshold, less }, { timeout: 4000 });
    await page.keyboard.up(key);
  };
  await walk('ArrowDown', 'y', 501);
  await walk('ArrowLeft', 'x', 1208, true);
  await page.keyboard.down('ArrowUp');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'garage-entering');
  expect(await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').controlsEnabled)).toBe(false);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'garage-arrival');
  expect(await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').controlsEnabled)).toBe(false);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'garage-playing');
  const state = await page.evaluate(() => {
    const s = window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene');
    const phases = window.garagePhases;
    return { x: s.player.x, y: s.player.y, facing: s.facing, controls: s.controlsEnabled,
      elapsed: phases.find(p => p.phase === 'garage-playing').at - phases.find(p => p.phase === 'garage-entering').at,
      blocked: s.collisionLayer.overlaps(s.player.x - 4, s.player.y - 6, 8, 6),
      fadeColor: [s.camera.fadeEffect.red, s.camera.fadeEffect.green, s.camera.fadeEffect.blue] };
  });
  expect(state.x).toBe(724);
  expect(state.y).toBeCloseTo(984);
  expect(state.facing).toBe('up');
  expect(state.controls).toBe(true);
  expect(state.blocked).toBe(false);
  expect(state.elapsed).toBeGreaterThan(1500);
  expect(state.elapsed).toBeLessThan(2300);
  expect(state.fadeColor).toEqual([184, 181, 163]);
  await page.screenshot({ path: `artifacts/garage-${testInfo.project.name}.png` });
  if (testInfo.project.name === 'mobile') {
    await page.locator('[data-direction="up"]').dispatchEvent('pointerdown', { pointerId: 1 });
    await page.waitForTimeout(250);
    await page.locator('[data-direction="up"]').dispatchEvent('pointerup', { pointerId: 1 });
  } else {
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowUp');
  }
  expect(await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').player.y)).toBeLessThan(970);
  await page.locator('#replay-intro').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  expect(errors).toEqual([]);
});
