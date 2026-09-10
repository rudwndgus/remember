// Native pixels in the clean outside map; the annotated reference is never rendered.
export const companyEntranceTrigger = { x: 1195, y: 449, width: 42, height: 17 };
export const PARKING_GARAGE = { width: 1448, height: 1086 };
export const parkingGarageSpawnX = 724;
export const parkingGarageSpawnY = 994;
export const GARAGE_TRANSITION = { leadMs: 160, outMs: 760, inMs: 840, step: 10, push: 1.025, color: [184, 181, 163] };

const box = (id, x, y, w, h) => ({ id, points: [[x,y],[x+w,y],[x+w,y+h],[x,y+h]] });
export const GARAGE_OBSTACLES = [
  box('north-wall', 18, 18, 1414, 72),
  box('west-wall', 18, 80, 25, 824), box('east-wall', 1404, 80, 26, 824),
  box('southwest-wall', 0, 873, 480, 73), box('southwest-curb', 480, 899, 44, 144),
  box('southeast-wall', 968, 873, 480, 73), box('southeast-curb', 928, 899, 40, 144),
  box('west-planting', 0, 924, 211, 115), box('east-planting', 1240, 924, 208, 115),
  { id: 'lobby', points: [[493,506],[508,338],[533,338],[533,304],[582,260],[869,260],[917,305],[917,339],[945,339],[956,674],[936,696],[511,696],[493,678]] },
  ...[98,212,326,585,700,804,1062,1177,1288].map((x,i) => box(`north-car-${i}`, x, 99, 76, 113)),
  ...[312,425,542,710].map((y,i) => box(`west-car-${i}`, 57, y, 134, 96)),
  ...[310,425,542,660,780].map((y,i) => box(`east-car-${i}`, 1263, y, 133, 90)),
];

// Garage cars are about 2.7 times the outdoor car length in native image pixels.
export const GARAGE_PLAYER_SCALE = 2.7;
export const garageExitTrigger = { x: 540, y: 1040, width: 370, height: 46 };
export const elevatorRoomTrigger = { x: 678, y: 713, width: 104, height: 20 };
export const garageDoorReturn = { x: 724, y: 754 };
export const companyExitSpawn = { x: 1206, y: 477 };
export const ELEVATOR_ROOM = { x: 510, y: 270, width: 430, height: 340, spawnX: 724, spawnY: 541, exitY: 550 };
