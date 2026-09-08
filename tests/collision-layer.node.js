import test from 'node:test';
import assert from 'node:assert/strict';
import CollisionLayer from '../src/maps/CollisionLayer.js';
import { OUTSIDE_OBJECTS, COLLISION_CELL_SIZE } from '../src/maps/outside-collisions.js';

const layer = new CollisionLayer(OUTSIDE_OBJECTS, 1619, 971, COLLISION_CELL_SIZE);

test('original-map landmarks are solid, including cars, plants, fences and small equipment', () => {
  // Independent image coordinates, not generated from the object definitions.
  const landmarks = [
    ['north white car',647,60], ['divider van',1434,704], ['east orange car',1580,780],
    ['company roof',1400,250], ['covered warehouse',510,350], ['south store',510,680],
    ['roadside planter',334,250], ['office flowers',438,165], ['company west flowerbed',1270,468],
    ['company east flowerbed',1430,467], ['house flowers',820,750], ['store hedge',597,700],
    ['warehouse divider wall',713,471], ['site fence',1143,749], ['diagonal roadside wall',1510,216],
    ['store retaining wall',624,710], ['excavator tracks',951,717], ['scaffold',1030,674],
    ['timber stack',1114,825], ['earth pile',1004,755], ['west woods',50,80],
    ['southwest woods',80,750], ['south woods',720,941], ['streetlight',150,355],
  ];
  for (const [name,x,y] of landmarks) assert(layer.isBlocked(x,y), `${name} must not be walkable`);
});

test('entrances, steps, crossings and empty parking spaces remain walkable', () => {
  const paths = [
    ['spawn',1345,470], ['company entrance path',1345,490], ['company broad steps',1190,477],
    ['main road',1105,540], ['crosswalk',230,530], ['southern road exit',230,950],
    ['north parking gap',748,100], ['north parking exit',900,15], ['store lot',420,700],
    ['house courtyard',767,810], ['construction access',1090,749], ['company parking',1270,80],
    ['office front path',485,171], ['warehouse pavement',505,496],
  ];
  for (const [name,x,y] of paths) assert(!layer.overlaps(x-4,y-6,8,6), `${name} must fit the player's feet`);
});

test('spawn connects to streets, parking lots, the house and site access with a real feet footprint', () => {
  const step = 4;
  const columns = Math.ceil(1619 / step);
  const rows = Math.ceil(971 / step);
  const seen = new Uint8Array(columns * rows);
  const queue = [Math.round(470 / step) * columns + Math.round(1345 / step)];
  seen[queue[0]] = 1;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const col = index % columns;
    const row = Math.floor(index / columns);
    for (const [x,y] of [[col-1,row],[col+1,row],[col,row-1],[col,row+1]]) {
      if (x<0 || y<0 || x>=columns || y>=rows) continue;
      const next = y*columns+x;
      if (seen[next] || layer.overlaps(x*step-4,y*step-6,8,6)) continue;
      seen[next]=1; queue.push(next);
    }
  }
  for (const [name,x,y] of [
    ['main road',1100,540], ['crossing',230,540], ['north exit',230,20], ['south exit',230,950],
    ['north lot',900,20], ['store parking',420,700], ['house front',768,810],
    ['construction yard',1092,750], ['east parking aisle',1524,750], ['company steps',1192,476],
  ]) assert(seen[Math.round(y/step)*columns+Math.round(x/step)], `${name} must be reachable from spawn`);
});

test('every merged physics rectangle preserves the collision mask without holes or extra blockers', () => {
  // A union compiler regression could silently re-open cars or fill walkable gaps.
  const reconstructed = new Uint8Array(layer.solid.length);
  for (const rect of layer.rectangles) {
    for(let y=rect.y/2;y<(rect.y+rect.height)/2;y++) {
      reconstructed.fill(1,y*layer.columns+rect.x/2,y*layer.columns+(rect.x+rect.width)/2);
    }
  }
  assert.deepEqual(reconstructed,layer.solid);
  assert.equal(new Set(OUTSIDE_OBJECTS.map((o)=>o.id)).size, OUTSIDE_OBJECTS.length);
});
