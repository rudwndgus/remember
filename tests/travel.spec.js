import {test,expect} from '@playwright/test';

test('walk, wait, Bus 163 approach, manual boarding, phone and return',async({page,isMobile})=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-phase','title');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
  await expect.poll(()=>page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').traffic.vehicles.length)).toBeGreaterThan(0);
  const touch=isMobile?await page.context().newCDPSession(page):null;
  async function walk(key,axis,target,increasing){
    await page.evaluate(({axis,target,increasing})=>{
      const scene=window.__REMEMBER_GAME__.scene.getScene('OutsideScene');
      const stop=()=>{if(increasing?scene.player[axis]>=target:scene.player[axis]<=target){
        scene.input.keyboard.resetKeys();scene.touchControls.reset();scene.events.off('postupdate',stop);
      }};
      scene.events.on('postupdate',stop);
    },{axis,target,increasing});
    if(touch){
      const b=await page.locator('.joystick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(axis==='x'?(increasing?45:-45):0),y:y+(axis==='y'?(increasing?45:-45):0)}]});
    }else await page.keyboard.down(key);
    await expect.poll(()=>page.evaluate(({axis,target,increasing})=>{
      const p=window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player;
      return increasing?p[axis]>=target:p[axis]<=target;
    },{axis,target,increasing}),{timeout:45000,intervals:[20]}).toBe(true).catch(async error=>{
      const p=await page.evaluate(()=>{const s=window.__REMEMBER_GAME__.scene.getScene('OutsideScene');return {x:s.player.x,y:s.player.y,state:s.busEvent.state};});
      throw new Error(`${key} to ${target} stopped at ${JSON.stringify(p)}: ${error.message}`);
    });
    if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up(key);
  }
  await walk('ArrowDown','y',502,true);
  await walk('ArrowLeft','x',301,false);
  await walk('ArrowUp','y',479,false);
  await walk('ArrowLeft','x',140,false);
  await walk('ArrowDown','y',650,true);
  await walk('ArrowRight','x',155,true);
  await walk('ArrowDown','y',830,true);
  await expect(page.locator('body')).toHaveAttribute('data-bus-state','WAITING');
  await expect(page.locator('body')).toHaveAttribute('data-bus-state','BUS_APPROACHING');
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__REMEMBER_GAME__.scene.getScene('OutsideScene').busEvent.bus)),{timeout:15000,intervals:[20]}).toBe(true);
  const start=await page.evaluate(()=>{const b=window.__REMEMBER_GAME__.scene.getScene('OutsideScene').busEvent.bus;return {x:b.x,y:b.y};});
  expect(start.x).toBeCloseTo(196);expect(start.y).toBeLessThan(0);
  await expect(page.locator('#board-bus')).toBeVisible({timeout:65000});
  expect(await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').traffic.busPriority)).toBeNull();
  expect(await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').busEvent.bus.y)).toBeCloseTo(827,0);
  await page.screenshot({path:`artifacts/bus-stop-${isMobile?'mobile':'desktop'}.png`});
  expect(await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').controlsEnabled)).toBe(true);
  if(isMobile) await page.locator('#board-bus').tap();else await page.keyboard.press('e');
  await expect(page.locator('body')).toHaveAttribute('data-phase','boarding');
  await expect(page.locator('.boarding-coach svg')).toHaveAttribute('aria-label','Pixel-art NJ Transit Bus 163 at the original neighborhood stop');
  await page.waitForTimeout(1600);
  const passenger=page.locator('#boarding-passenger');
  await expect(passenger).toBeVisible();
  const passengerX=Number(await passenger.getAttribute('x'));
  await page.waitForTimeout(450);
  expect(Number(await passenger.getAttribute('x'))).toBeGreaterThan(passengerX);
  await page.screenshot({path:`artifacts/boarding-${isMobile?'mobile':'desktop'}.png`});
  await expect(page.locator('.bus-boarding')).toHaveAttribute('data-boarding-step','seated');
  await expect(passenger).toHaveCSS('opacity','0');
  await expect(page.locator('body')).toHaveAttribute('data-phase','on-bus');
  await expect(page.locator('.memory-phone')).toHaveCount(0);
  await expect(page.locator('.seat-dialogue h1')).toHaveText('어디로 갈까?');
  const travel=Number(await page.locator('.pixel-bus-cabin').getAttribute('data-travel'));
  for(const id of ['new-york','memories']) {
    const button=page.locator(`[data-destination="${id}"]`);
    if(isMobile) await button.tap();else await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.destination-preview')).toBeVisible();
  }
  await page.screenshot({path:`artifacts/interior-${isMobile?'mobile':'desktop'}.png`});
  await page.waitForTimeout(400);
  expect(Number(await page.locator('.pixel-bus-cabin').getAttribute('data-travel'))).toBeGreaterThan(travel);
  if(isMobile){await page.setViewportSize({width:844,height:390});await page.locator('.get-off-bus').scrollIntoViewIfNeeded();await expect(page.locator('.get-off-bus')).toBeInViewport();}
  await page.locator('.get-off-bus').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
  await expect(page.locator('body')).toHaveAttribute('data-bus-state','IDLE');
  expect(errors).toEqual([]);
});

test('traffic signals, curved turns, pedestrian warning and wait reset',async({page})=>{
  await page.goto('/?debug=1&no-traffic');await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
  const result=await page.evaluate(()=>{
    const s=window.__REMEMBER_GAME__.scene.getScene('OutsideScene'),t=s.traffic;
    const car=t.addVehicle({origin:'N',turn:'left'});
    car.positionAt(car.route.entryDistance-car.length/2-30);car.speed=40;t.elapsed=17000;
    for(let i=0;i<120;i++)t.update(16,null);
    const redStopped=car.distance+car.length/2<car.route.entryDistance;
    t.elapsed=0;for(let i=0;i<650;i++)t.update(16,null);
    const turned=car.x>345&&Math.abs(car.y-566)<1;
    car.destroy();t.vehicles=[];t.reservation=null;
    const hazard=t.addVehicle({origin:'N'});hazard.positionAt(320);hazard.speed=50;
    const p={x:196,y:hazard.y+65};t.update(16,p,{x:0,y:0});
    const warned=t.hazard;
    const blocked=!t.canPlayerEnter(hazard.x,hazard.y,hazard.x+40,hazard.y);
    for(let i=0;i<100;i++)t.update(16,p);
    return {redStopped,turned,warned,blocked,separation:p.y-hazard.y-hazard.length/2};
  });
  expect(result).toMatchObject({redStopped:true,turned:true,warned:true,blocked:true});expect(result.separation).toBeGreaterThan(5);
  await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player.body.reset(150,830));
  await expect(page.locator('body')).toHaveAttribute('data-bus-state','WAITING');
  await page.waitForTimeout(800);
  await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').player.body.reset(150,740));
  await expect(page.locator('body')).toHaveAttribute('data-bus-state','IDLE');
  expect(await page.evaluate(()=>window.__REMEMBER_GAME__.scene.getScene('OutsideScene').busEvent.waitElapsed)).toBe(0);
});
