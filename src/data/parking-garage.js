// Native pixels in the clean outside map; the annotated reference is never rendered.
export const companyEntranceTrigger = { x: 1195, y: 449, width: 42, height: 17 };
export const PARKING_GARAGE = { width: 1448, height: 1086 };
export const parkingGarageSpawnX = 724;
export const parkingGarageSpawnY = 994;

const box = (id, x, y, w, h) => ({ id, points: [[x,y],[x+w,y],[x+w,y+h],[x,y+h]] });
export const GARAGE_OBSTACLES = [
  box('north-wall', 18, 18, 1414, 72),
  box('west-wall', 18, 80, 25, 824), box('east-wall', 1404, 80, 26, 824),
  box('southwest-wall', 0, 873, 480, 73), box('southwest-curb', 480, 899, 44, 144),
  box('southeast-wall', 968, 873, 480, 73), box('southeast-curb', 928, 899, 40, 144),
  box('west-planting', 0, 924, 211, 115), box('east-planting', 1240, 924, 208, 115),
  box('lobby-rear', 508, 260, 440, 195),
  box('lobby-west', 493, 450, 70, 246), box('lobby-east', 875, 450, 81, 246),
  box('lobby-front-west', 560, 555, 116, 141), box('lobby-front-east', 782, 555, 95, 141),
  ...[98,212,326,585,700,804,1062,1177,1288].map((x,i) => box(`north-car-${i}`, x, 99, 76, 113)),
  ...[312,425,542,710].map((y,i) => box(`west-car-${i}`, 57, y, 134, 96)),
  ...[310,425,542,660,780].map((y,i) => box(`east-car-${i}`, 1263, y, 133, 90)),
];

// Garage cars are about 2.7 times the outdoor car length in native image pixels.
export const GARAGE_PLAYER_SCALE = 2.7;
export const garageExitTrigger = { x: 540, y: 1040, width: 370, height: 46 };
export const companyExitSpawn = { x: 1206, y: 477 };
