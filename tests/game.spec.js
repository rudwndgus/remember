import { test as base, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const test = base.extend({
  uncaughtErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
    expect(errors, 'The game should not throw browser exceptions').toEqual([]);
  }, { auto: true }],
});

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const expectedPhases = ['title', 'logo-focus', 'logo-zoom', 'reveal', 'overview', 'arrival', 'playing'];
const spawn = { x: 1345, y: 470 };

async function routeCalibrationAssets(page) {
  await page.route('**/assets/ui/bluu-logo.png', (route) => route.fulfill({
    path: fixture('logo-calibration.svg'), contentType: 'image/svg+xml',
  }));
  await page.route('**/assets/maps/outside-main-map.png', (route) => route.fulfill({
    path: fixture('map-calibration.svg'), contentType: 'image/svg+xml',
  }));
}

async function openGame(page) {
  await routeCalibrationAssets(page);
  await page.addInitScript(() => {
    window.__observedPhases = [];
    window.addEventListener('remember:phase', ({ detail: { phase } }) => {
      window.__observedPhases.push({ phase, at: performance.now() });
    });
  });
  await page.goto('/?debug=1&no-traffic');
  await phase(page, 'title');
}

async function phase(page, value) {
  await expect(page.locator('body')).toHaveAttribute('data-phase', value);
}

async function playerPosition(page) {
  return page.evaluate(() => {
    const { player } = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    return { x: player.x, y: player.y };
  });
}

async function begin(page, isMobile) {
  if (isMobile) await page.locator('#start-button').tap();
  else await page.keyboard.press('Enter');
}

async function pressFor(page, key, milliseconds = 350) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
}

async function setPlayerPosition(page, position) {
  await page.evaluate(({ x, y }) => {
    const scene = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    scene.player.body.reset(x, y);
    scene.player.setVelocity(0, 0);
  }, position);
}

async function assertCameraWithinWorld(page) {
  await expect.poll(() => page.evaluate(() => {
    const { camera, worldWidth, worldHeight } = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    const view = camera.worldView;
    return view.x >= -1 && view.y >= -1 && view.right <= worldWidth + 1 && view.bottom <= worldHeight + 1;
  })).toBe(true);
}

test('circle intro preserves every phase, whole-map hold, and input lock', async ({ page, isMobile }, testInfo) => {
  await openGame(page);
  await expect(page.getByRole('button', { name: 'Tap to Start' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('fixture-title.png') });
  await begin(page, isMobile);
  await phase(page, 'logo-focus');

  // Starting repeatedly must not spawn extra tweens or skip the circular approach.
  await page.mouse.click(30, 220, { clickCount: 3 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await phase(page, 'logo-zoom');
  await page.waitForFunction(() => {
    const title = window.__REMEMBER_GAME__.scene.getScene('TitleScene');
    return title.progress.zoom > 0.4;
  });
  const circle = await page.evaluate(() => {
    const title = window.__REMEMBER_GAME__.scene.getScene('TitleScene');
    return {
      x: title.mark.x, y: title.mark.y,
      centerX: title.scale.width / 2, centerY: title.scale.height / 2,
      visible: title.mark.visible, hasMask: Boolean(title.mark.mask),
      originX: title.mark.originX, originY: title.mark.originY,
    };
  });
  expect(circle.visible && circle.hasMask).toBe(true);
  expect(circle.x).toBeCloseTo(circle.centerX, 1);
  expect(circle.y).toBeCloseTo(circle.centerY, 1);
  expect(circle.originX).toBeCloseTo(148 / 300, 4);
  expect(circle.originY).toBeCloseTo(113 / 300, 4);
  await page.screenshot({ path: testInfo.outputPath('fixture-circle-zoom.png') });

  await phase(page, 'reveal');
  await page.keyboard.down('KeyD');
  await phase(page, 'overview');
  expect(await playerPosition(page)).toEqual(spawn);
  const overview = await page.evaluate(() => {
    const scene = window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
    return {
      width: scene.camera.width / scene.camera.zoom,
      height: scene.camera.height / scene.camera.zoom,
      locked: !scene.controlsEnabled,
    };
  });
  expect(overview.width).toBeGreaterThanOrEqual(1619);
  expect(overview.height).toBeGreaterThanOrEqual(971);
  expect(overview.locked).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('fixture-whole-map.png') });
  await phase(page, 'arrival');
  expect(await playerPosition(page)).toEqual(spawn);
  await phase(page, 'playing');
  await page.keyboard.up('KeyD');
  expect(await playerPosition(page)).toEqual(spawn);

  const history = await page.evaluate(() => window.__observedPhases);
  expect(history.map(({ phase }) => phase)).toEqual(expectedPhases);
  expect(history.find(({ phase }) => phase === 'arrival').at - history.find(({ phase }) => phase === 'overview').at)
    .toBeGreaterThanOrEqual(1200);
  const cameraZoom = await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').camera.zoom);
  const viewport = page.viewportSize();
  expect(cameraZoom).toBeCloseTo(Math.max(viewport.width / 1619, viewport.height / 971), 5);
  await expect(page.locator('#game-hud')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('fixture-playing.png') });
  await pressFor(page, 'KeyS');
  expect((await playerPosition(page)).y).toBeGreaterThan(spawn.y + 25);
  await assertCameraWithinWorld(page);
});

test('world and company collisions hold, and replay rebuilds one complete intro', async ({ page, isMobile }) => {
  await openGame(page);
  await begin(page, isMobile);
  await phase(page, 'playing');

  // Feet approach the company's south wall from the pavement.
  await pressFor(page, 'KeyW', 600);
  let position = await playerPosition(page);
  expect(position.y).toBeGreaterThanOrEqual(439);
  expect(position.y).toBeLessThan(spawn.y - 5);

  // Test real physics input at unobstructed world edges without walking the whole map.
  await setPlayerPosition(page, { x: 12, y: 530 });
  await pressFor(page, 'ArrowLeft');
  position = await playerPosition(page);
  expect(position.x).toBeGreaterThanOrEqual(0);
  expect(position.x).toBeLessThan(12);
  await setPlayerPosition(page, { x: 1607, y: 530 });
  await pressFor(page, 'ArrowRight');
  position = await playerPosition(page);
  expect(position.x).toBeLessThanOrEqual(1619);
  expect(position.x).toBeGreaterThan(1607);
  await setPlayerPosition(page, { x: 1000, y: 12 });
  await pressFor(page, 'ArrowUp');
  expect((await playerPosition(page)).y).toBeGreaterThanOrEqual(0);
  // The south edge is forest except for the road exit.
  await setPlayerPosition(page, { x: 230, y: 959 });
  await pressFor(page, 'ArrowDown');
  expect((await playerPosition(page)).y).toBeLessThanOrEqual(971);
  await assertCameraWithinWorld(page);

  await page.getByRole('button', { name: 'Replay the intro' }).click();
  await phase(page, 'title');
  await expect(page.locator('#game-hud')).toBeHidden();
  await begin(page, isMobile);
  await phase(page, 'playing');
  expect(await playerPosition(page)).toEqual(spawn);
  await expect(page.locator('.joystick')).toHaveCount(1);
  await expect(page.locator('.direction-button')).toHaveCount(4);
  const history = await page.evaluate(() => window.__observedPhases.map(({ phase }) => phase));
  expect(history).toEqual([...expectedPhases, ...expectedPhases]);
  const sceneCount = await page.evaluate(() => window.__REMEMBER_GAME__.scene.getScenes(true).length);
  expect(sceneCount).toBe(1);
});

test('resizing during the circle and arrival keeps framing stable; touch releases cleanly', async ({ page, isMobile }) => {
  await openGame(page);
  await begin(page, isMobile);
  await phase(page, 'logo-zoom');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => page.evaluate(() => {
    const title = window.__REMEMBER_GAME__.scene.getScene('TitleScene');
    return Math.abs(title.mark.x - 422) < 1 && Math.abs(title.mark.y - 195) < 1;
  })).toBe(true);
  await phase(page, 'arrival');
  await page.setViewportSize({ width: 390, height: 844 });
  await phase(page, 'playing');
  await assertCameraWithinWorld(page);
  expect(await playerPosition(page)).toEqual(spawn);

  if (isMobile) {
    const pad = page.getByRole('group', { name: 'Movement joystick' });
    await expect(pad).toBeVisible();
    const bounds = await pad.boundingBox();
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    // Chromium's touch protocol produces actual touch/pointer capture events.
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, id: 1 }] });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: center.x, y: center.y + 40, id: 1 }],
    });
    await expect.poll(() => page.evaluate(() => window.__REMEMBER_GAME__.scene.getScene('OutsideScene').touchControls.vector.y))
      .toBeGreaterThan(0.8);
    await page.waitForTimeout(350);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect((await playerPosition(page)).y).toBeGreaterThan(spawn.y + 20);
    await expect.poll(() => page.evaluate(() => {
      const { vector } = window.__REMEMBER_GAME__.scene.getScene('OutsideScene').touchControls;
      return Math.hypot(vector.x, vector.y);
    })).toBe(0);
    await page.waitForTimeout(60);
    const released = await playerPosition(page);
    await page.waitForTimeout(200);
    expect(await playerPosition(page)).toEqual(released);
    await touch.detach();
  } else {
    await pressFor(page, 'ArrowDown');
    expect((await playerPosition(page)).y).toBeGreaterThan(spawn.y + 25);
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await assertCameraWithinWorld(page);
  await expect(page.getByRole('button', { name: 'Replay the intro' })).toBeInViewport();
});

test('missing original images show exact paths and recover after retry', async ({ page }) => {
  await page.route('**/assets/ui/bluu-logo.png', (route) => route.fulfill({ status: 404, body: '' }));
  await page.route('**/assets/maps/outside-main-map.png', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/?debug=1');
  await phase(page, 'missing-assets');
  await expect(page.locator('#asset-notice')).toBeVisible();
  await expect(page.locator('#missing-assets')).toContainText('public/assets/ui/bluu-logo.png');
  await expect(page.locator('#missing-assets')).toContainText('public/assets/maps/outside-main-map.png');
  await expect(page.locator('#title-chrome')).toBeHidden();
  await page.unrouteAll();
  await routeCalibrationAssets(page);
  await page.getByRole('button', { name: /Reload images/ }).click();
  await phase(page, 'title');
  await expect(page.locator('#start-button')).toBeEnabled();
});
