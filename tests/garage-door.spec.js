import { test, expect } from '@playwright/test';

test('automatic lobby door opens, allows both directions, and closes without stopping the game', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?debug=1&no-traffic');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  await page.evaluate(() => {
    const game = window.__REMEMBER_GAME__;
    game.scene.getScene('OutsideScene').createPlayerTextures.call(game.scene.getScene('TitleScene'));
    game.scene.stop('TitleScene');
    game.scene.start('ParkingGarageScene');
  });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'garage-playing');
  expect(await page.evaluate(() => {
    const map = window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').mapImage;
    return [map.frame.name, map.width, map.height];
  })).toEqual(['__BASE', 1448, 1086]);
  await page.screenshot({ path: 'artifacts/garage-map-restored.png' });
  expect(await page.evaluate(() => {
    const s = window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene');
    return s.children.list.filter(child => child.type === 'TileSprite')
      .every(child => child.canvas.width <= s.scale.width && child.canvas.height <= s.scale.height);
  })).toBe(true);
  await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').player.setPosition(724, 790));
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1600);
  await page.keyboard.up('ArrowUp');
  const inside = await page.evaluate(() => {
    const s = window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene');
    return { y: s.player.y, door: s.doorOpen, frame: s.game.loop.frame };
  });
  expect(errors).toEqual([]);
  expect(inside.y).toBeLessThan(555);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(1100);
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(1500);
  const outside = await page.evaluate(() => {
    const s = window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene');
    return { y: s.player.y, door: s.doorOpen, frame: s.game.loop.frame };
  });
  expect(errors).toEqual([]);
  expect(outside.y).toBeGreaterThan(785);
  expect(outside.door).toBe(0);
  expect(outside.frame).toBeGreaterThan(inside.frame + 20);
});
