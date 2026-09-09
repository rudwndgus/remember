import { test, expect } from '@playwright/test';

test('original map obstacles stop actual movement from roads and clear aisles', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'Shared physics is verified once; mobile input has dedicated coverage.');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?debug=1&collisions=1&no-traffic');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');

  const approaches = [
    { name:'parked car', x:647, y:140, key:'w', axis:'y', min:129, max:133 },
    { name:'flowerbed', x:1260, y:501, key:'w', axis:'y', min:487, max:490 },
    { name:'building', x:603, y:270, key:'d', axis:'x', min:610, max:614 },
    { name:'thin divider wall', x:691, y:474, key:'d', axis:'x', min:705, max:710 },
    { name:'site fence', x:1120, y:749, key:'d', axis:'x', min:1134, max:1138 },
    { name:'scaffold', x:1060, y:674, key:'a', axis:'x', min:1047, max:1050 },
    { name:'forest', x:740, y:832, key:'s', axis:'y', min:845, max:882 },
    { name:'streetlight', x:169, y:355, key:'a', axis:'x', min:155, max:158 },
    { name:'diagonal roadside wall', x:1548, y:227, key:'a', axis:'x', min:1523, max:1530 },
  ];
  for (const sample of approaches) {
    await test.step(sample.name, async () => {
      const clear = await page.evaluate(({x,y}) => {
        const scene = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
        scene.player.body.reset(x,y);
        scene.player.setVelocity(0,0);
        return !scene.collisionLayer.overlaps(x-4,y-6,8,6);
      }, sample);
      expect(clear, `${sample.name}: approach starts on free pavement`).toBe(true);
      await page.keyboard.down(sample.key);
      await page.waitForTimeout(550);
      await page.keyboard.up(sample.key);
      const result = await page.evaluate(() => {
        const scene = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
        const { body } = scene.player;
        return {x:scene.player.x,y:scene.player.y,inside:scene.collisionLayer.overlaps(body.x+0.05,body.y+0.05,body.width-0.1,body.height-0.1)};
      });
      expect(result[sample.axis], `${sample.name}: stop before the obstacle`).toBeGreaterThanOrEqual(sample.min);
      expect(result[sample.axis], `${sample.name}: do not pass through`).toBeLessThanOrEqual(sample.max);
      expect(result.inside, `${sample.name}: feet remain outside the solid region`).toBe(false);
    });
  }
  await page.evaluate(() => {
    const scene = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    scene.player.body.reset(1345,470);
  });
  await page.setViewportSize({width:1619,height:971});
  await page.waitForTimeout(300);
  await page.locator('#game-hud').evaluate((element) => { element.hidden=true; });
  await page.screenshot({path:testInfo.outputPath('original-map-collision-overlay.png')});
  expect(errors).toEqual([]);
});
