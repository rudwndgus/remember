import { test, expect } from '@playwright/test';

test('compact controller stays below the map and routes its action', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?debug=1&no-traffic');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing', { timeout: 20000 });
  await page.waitForTimeout(250);
  const map = await page.locator('#game').boundingBox();
  const pad = await page.locator('.joystick').boundingBox();
  const bar = await page.locator('#touch-controls').boundingBox();
  expect(bar.height).toBeLessThanOrEqual(120);
  expect(pad.y).toBeGreaterThanOrEqual(map.y + map.height);
  await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2);
  await page.mouse.down();
  await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height - 5);
  await page.waitForTimeout(200);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player.y)).toBeGreaterThan(480);
  await page.evaluate(() => {
    const s = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    s.player.setPosition(146, 827);
    s.busEvent.state = 'BUS_READY';
    s.busEvent.board = () => { window.actionReachedBus = true; return true; };
    s.busEvent.renderCue();
  });
  await expect(page.locator('.controller-action')).toBeEnabled();
  await page.locator('.controller-action').tap();
  expect(await page.evaluate(() => window.actionReachedBus)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile-controller.png' });
  expect(errors).toEqual([]);
});
