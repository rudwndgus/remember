import { test, expect } from '@playwright/test';

test('car interaction gathers friends, boards, drives and arrives at Palpark', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=1&no-traffic');
  await expect(page.locator('body')).toHaveAttribute('data-phase','title');
  await page.evaluate(()=>{
    const g=window.__REMEMBER_GAME__;
    g.scene.getScene('OutsideScene').createPlayerTextures.call(g.scene.getScene('TitleScene'));
    document.querySelector('#title-chrome').hidden=true;
    g.scene.stop('TitleScene');g.scene.start('ParkingGarageScene');
  });
  await expect(page.locator('body')).toHaveAttribute('data-phase','garage-playing');
  await page.evaluate(()=>{
    const s=window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene');
    s.player.setPosition(225,600);s.tweens.timeScale=3;s.time.timeScale=3;
  });
  await expect(page.locator('.controller-action')).toBeEnabled();
  expect(await page.evaluate(()=>{
    const s=window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene');
    return {text:s.shaneTrip.marker.text,x:s.shaneTrip.marker.x,above:s.shaneTrip.marker.y<s.player.y-s.player.displayHeight};
  })).toEqual({text:'?',x:225,above:true});
  await page.locator('.controller-action').tap();
  await expect(page.getByRole('heading',{name:'Shane의 자동차?'})).toBeVisible();
  await page.getByRole('button',{name:'팰팍으로 가기'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-phase','car-gathering');
  await page.waitForFunction(()=>window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').shaneTrip.npcs.length===2);
  expect(await page.evaluate(()=>{
    const camera=window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').camera;
    return camera.worldView.contains(646,362)&&camera.worldView.contains(124,626);
  })).toBe(true);
  await page.screenshot({path:'artifacts/shane-gathering-mobile.png'});
  await page.waitForFunction(()=>Boolean(window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').shaneTrip.car));
  expect(await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('ParkingGarageScene').shaneTrip.car.frame.height)).toBe(84);
  await expect(page.locator('body')).toHaveAttribute('data-phase','car-trip',{timeout:18000});
  await page.screenshot({path:'artifacts/shane-car-trip.png'});
  await expect(page.locator('.car-trip progress')).toHaveAttribute('max','6000');
  await page.evaluate(()=>{window.__REMEMBER_GAME__.scene.getScene('PalparkTripScene').elapsed=7300;});
  await expect(page.getByRole('heading',{name:'팰팍에 도착했어!'})).toBeVisible();
  await page.getByRole('button',{name:'주차장으로 돌아가기'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-phase','garage-playing');
  expect(errors).toEqual([]);
});

test('mobile bus shows whole illustration above choices', async ({page})=>{
  await page.goto('/?debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-phase','title');
  await page.evaluate(()=>{
    const g=window.__REMEMBER_GAME__;document.querySelector('#title-chrome').hidden=true;
    g.scene.getScene('OutsideScene').busEvent={onBus(){}};
    g.scene.stop('TitleScene');g.scene.start('BusInteriorScene');
  });
  await expect(page.locator('body')).toHaveAttribute('data-phase','on-bus');
  const art=await page.locator('.pixel-bus-cabin').boundingBox(),choices=await page.locator('.seat-dialogue').boundingBox();
  expect(art.width/art.height).toBeCloseTo(4/3,1);
  expect(choices.y).toBeGreaterThanOrEqual(art.y+art.height);
  await expect(page.locator('[data-destination]').first()).toBeVisible();
  await page.screenshot({path:'artifacts/mobile-bus-layout.png'});
});
