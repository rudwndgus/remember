import { OUTSIDE_LOCATIONS } from '../data/outside-locations.js';
import { SIGNAL_LOCATIONS } from '../data/traffic.js';

/**
 * Hand-traced object layer for the ORIGINAL 1619 × 971 outside-main-map.png.
 * Coordinates are native image pixels. The background itself is never edited.
 * Buildings include their visible roofs/facades; gardens include their edging.
 * Connected woods are polygons, individual vehicles remain separate objects.
 * Roads, zebra crossings, paved paths, empty parking bays and stairs stay open.
 * Rooftop equipment is already blocked by its containing building footprint.
 */
const polygon = (id, kind, points) => ({ id, kind, points });
const box = (id, kind, x, y, width, height) => polygon(id, kind, [
  [x, y], [x + width, y], [x + width, y + height], [x, y + height],
]);
const line = (id, kind, points, thickness = 4) => ({ id, kind, points, thickness });
const vehicle = (id, x, y, width, height) => {
  const bevel = 3;
  return polygon(id, 'vehicle', [
    [x + bevel, y], [x + width - bevel, y], [x + width, y + bevel],
    [x + width, y + height - bevel], [x + width - bevel, y + height],
    [x + bevel, y + height], [x, y + height - bevel], [x, y + bevel],
  ]);
};

export const COLLISION_CELL_SIZE = 2;
export const COLLISION_COLORS = {
  building: 0xef7669, vehicle: 0x64c9fa, flowerbed: 0xf0bf55,
  vegetation: 0x69cf8b, fence: 0xd8a0f6, wall: 0xfaa2c9,
  equipment: 0xf49d61, pole: 0xd9e8ed,
};

export const OUTSIDE_OBJECTS = [
  box('bus-stop-bench','equipment',OUTSIDE_LOCATIONS.busStopBench.x-6,OUTSIDE_LOCATIONS.busStopBench.y-15,13,30),
  box('bus-stop-sign-post','pole',OUTSIDE_LOCATIONS.busStopSign.x-2,OUTSIDE_LOCATIONS.busStopSign.y,4,20),
  ...SIGNAL_LOCATIONS.map((signal,i)=>box(`traffic-signal-post-${i}`,'pole',signal.x-2,signal.y+18,5,12)),
  // NORTH / WEST: buildings and the enclosed strip west of the main road.
  polygon('west-edge-building', 'building', [[0,241],[57,241],[57,295],[64,295],[64,466],[0,466]]),
  box('northwest-office', 'building', 383, 39, 186, 116),
  box('northwest-office-front-step-wall', 'wall', 568, 111, 12, 68),
  box('small-workshop', 'building', 336, 324, 121, 102),
  polygon('covered-warehouse', 'building', [[466,250],[471,231],[488,222],[541,222],[555,233],[562,250],[562,465],[550,479],[477,479],[466,466]]),
  box('middle-west-warehouse', 'building', 617, 210, 90, 251),
  box('middle-east-warehouse', 'building', 726, 175, 94, 275),
  box('north-service-office', 'building', 949, 67, 204, 103),
  box('narrow-service-building', 'building', 931, 175, 57, 282),
  box('east-service-office', 'building', 998, 172, 95, 178),
  // The bevel follows the diagonal road; its open triangular corner stays open.
  polygon('company-main-building', 'building', [[1161,141],[1408,141],[1550,283],[1550,415],[1388,415],[1388,448],[1312,448],[1312,440],[1161,440]]),
  box('company-entrance-porch', 'building', 1327, 444, 32, 13),

  // SOUTH: shops, house, construction buildings, warehouses.
  polygon('convenience-store', 'building', [[457,607],[580,607],[580,746],[590,746],[590,778],[460,778],[457,746]]),
  polygon('southwest-building', 'building', [[382,835],[507,835],[507,918],[370,918],[370,871],[382,871]]),
  polygon('memory-house', 'building', [[693,593],[770,540],[850,580],[850,744],[835,755],[705,755],[693,739]]),
  polygon('construction-office', 'building', [[884,576],[1019,576],[1019,689],[1007,705],[888,705]]),
  box('construction-south-shed', 'building', 887, 738, 93, 147),
  polygon('southeast-long-warehouse', 'building', [[1178,636],[1267,636],[1267,705],[1278,705],[1278,850],[1260,865],[1178,865]]),
  polygon('southeast-narrow-warehouse', 'building', [[1308,712],[1387,712],[1387,743],[1399,743],[1399,877],[1308,877]]),

  // Individual vehicles: north parking lot, ordered left-to-right then north-to-south.
  ...[
    ['north-a1',638,40,19,39], ['north-a2',671,39,21,40], ['north-a3',705,39,21,40],
    ['north-a4',804,39,21,40], ['north-b1',637,83,22,41], ['north-b2',670,82,23,41],
    ['north-b3',771,81,21,43], ['north-c1',637,171,22,40], ['north-c2',705,170,23,41],
    ['north-company',1297,81,22,40],
    ['west-yard',74,294,22,52], ['workshop-green',358,224,22,43], ['workshop-white',397,222,23,43],
    ['workshop-delivery',431,287,26,37], ['workshop-south',433,426,26,51],
    ['warehouse-row-1',572,223,22,44], ['warehouse-row-2',571,268,23,43],
    ['warehouse-row-3',571,313,23,29], ['warehouse-row-4',571,342,23,44],
    ['warehouse-row-5',571,386,23,39], ['warehouse-row-6',571,425,24,58],
    ['middle-parking-1',839,222,22,44], ['middle-parking-2',839,268,22,44],
    ['middle-parking-3',839,345,23,43], ['middle-parking-4',839,389,23,43],
    ['middle-front-1',764,448,21,38], ['middle-front-2',797,447,22,39],
    ['service-front',948,458,30,26], ['service-east',1000,433,27,50],
    ['store-lot-1',335,639,45,27], ['store-lot-2',335,688,45,27], ['store-lot-3',335,717,45,26],
    ['store-south',548,782,45,24],
    ['house-lot-1',814,770,44,25], ['house-lot-2',814,799,44,26], ['house-lot-3',814,829,44,25],
    ['construction-truck-1',1114,668,23,58], ['construction-truck-2',1123,772,24,47],
    ['shed-roof-equipment',940,796,23,37],
    ['east-lot-north-1',1160,590,24,44], ['east-lot-north-2',1194,590,23,44],
    ['east-lot-middle-1',1318,595,44,29], ['east-lot-middle-2',1318,628,48,29],
    ['east-lot-middle-3',1318,660,43,28], ['east-lot-middle-4',1318,688,44,27],
    ['east-lot-west-1',1451,601,45,27], ['east-lot-west-2',1451,630,45,28],
    ['east-lot-west-3',1451,659,45,27], ['east-lot-west-4',1451,686,45,28],
    ['east-lot-divider-van',1424,684,23,42],
    ['east-lot-west-5',1451,735,45,26], ['east-lot-west-6',1451,764,46,28],
    ['east-lot-west-7',1451,792,46,27], ['east-lot-west-8',1451,820,46,28],
    ['east-lot-east-1',1554,585,47,26], ['east-lot-east-2',1554,614,46,25],
    ['east-lot-east-3',1554,641,46,25], ['east-lot-east-4',1554,669,46,26],
    ['east-lot-east-5',1554,697,46,28], ['east-lot-east-6',1554,728,46,28],
    ['east-lot-east-7',1554,765,46,27], ['east-lot-east-8',1554,795,46,28],
    ['east-lot-east-9',1554,824,46,27],
  ].map(([id, x, y, width, height]) => vehicle(id, x, y, width, height)),

  // Flowerbeds/hedges. Split at every visible entrance and pedestrian opening.
  polygon('northwest-office-garden', 'flowerbed', [[327,0],[382,0],[382,153],[346,153],[328,144]]),
  box('office-front-left-planter', 'flowerbed', 386, 147, 18, 25),
  polygon('office-front-center-planter', 'flowerbed', [[412,148],[454,144],[472,162],[463,178],[416,178]]),
  polygon('office-front-right-planter', 'flowerbed', [[542,144],[561,145],[570,157],[565,177],[543,177]]),
  polygon('workshop-north-planter', 'flowerbed', [[325,221],[340,219],[348,237],[345,285],[320,285],[320,242]]),
  polygon('workshop-south-planter', 'flowerbed', [[318,437],[336,437],[344,456],[341,482],[315,482],[307,463]]),
  box('south-intersection-planter', 'flowerbed', 334, 591, 49, 31),
  polygon('store-north-hedge', 'flowerbed', [[455,596],[575,596],[591,602],[591,615],[579,615],[578,608],[454,608]]),
  polygon('store-east-hedge', 'flowerbed', [[583,608],[598,608],[607,833],[594,841],[589,778],[585,718]]),
  polygon('store-southwest-garden', 'flowerbed', [[405,769],[425,756],[448,759],[463,775],[465,799],[480,815],[477,839],[420,842],[397,824],[396,799]]),
  box('store-west-flowerbed', 'flowerbed', 330, 808, 25, 27),
  polygon('house-west-hedge', 'flowerbed', [[678,582],[693,589],[693,707],[698,737],[691,754],[681,744],[675,641]]),
  box('house-front-west-garden', 'flowerbed', 696, 741, 62, 21),
  box('house-front-east-garden', 'flowerbed', 790, 741, 59, 21),
  polygon('east-office-front-left-garden', 'flowerbed', [[1000,326],[1010,325],[1017,344],[1014,356],[999,356]]),
  polygon('east-office-front-right-garden', 'flowerbed', [[1054,322],[1069,322],[1079,343],[1073,358],[1054,358]]),
  polygon('company-north-hedge', 'flowerbed', [[1150,124],[1170,116],[1216,121],[1235,116],[1263,124],[1285,120],[1310,124],[1336,119],[1360,126],[1377,137],[1150,139]]),
  box('company-front-far-west-garden', 'flowerbed', 1101, 461, 60, 21),
  // The broad steps at x1162–1218 are intentionally outside both flowerbeds.
  polygon('company-front-west-garden', 'flowerbed', [[1220,443],[1237,440],[1237,449],[1283,440],[1312,444],[1330,457],[1330,482],[1220,482]]),
  polygon('company-front-east-garden', 'flowerbed', [[1358,445],[1388,443],[1388,420],[1410,410],[1434,414],[1452,405],[1476,415],[1510,415],[1526,404],[1548,416],[1563,413],[1578,433],[1596,437],[1596,482],[1358,482]]),
  polygon('east-parking-divider-garden', 'flowerbed', [[1418,586],[1445,586],[1450,623],[1448,678],[1441,690],[1418,684]]),

  // Tree canopies protruding beyond their planted strip, plus connected woods.
  polygon('northwest-woods', 'vegetation', [[0,0],[116,0],[119,72],[105,95],[100,154],[112,169],[116,221],[100,232],[0,233]]),
  polygon('west-building-garden', 'vegetation', [[107,295],[126,295],[127,481],[66,483],[58,463],[63,401],[77,379],[88,369],[100,338]]),
  // Preserve the existing paved bus-stop recess inside the reference red area.
  polygon('southwest-woods', 'vegetation', [[0,593],[67,593],[89,609],[117,613],[126,637],[121,680],[130,698],[128,772],[94,772],[94,883],[121,904],[125,971],[0,971]]),
  polygon('company-west-trees', 'vegetation', [[1135,89],[1151,99],[1158,129],[1157,203],[1162,224],[1157,274],[1145,299],[1149,362],[1136,400],[1139,437],[1103,438],[1094,411],[1098,368],[1093,343],[1099,289],[1092,256],[1098,218],[1097,183],[1106,159],[1108,127],[1123,115],[1126,98]]),
  polygon('company-east-trees', 'vegetation', [[1554,298],[1578,308],[1591,331],[1596,376],[1604,408],[1594,447],[1575,438],[1555,414]]),
  polygon('northeast-woods', 'vegetation', [[1440,0],[1619,0],[1619,166],[1605,153],[1586,141],[1568,119],[1544,99],[1521,77],[1497,58],[1470,32]]),
  polygon('house-northwest-tree', 'vegetation', [[672,583],[687,587],[696,608],[690,632],[671,640],[658,627],[657,604]]),
  polygon('parking-north-tree', 'vegetation', [[1436,562],[1452,570],[1464,589],[1458,607],[1440,613],[1426,604],[1415,588],[1424,571]]),
  polygon('southern-woods', 'vegetation', [
    [315,926],[329,912],[348,911],[356,897],[385,894],[408,889],[438,881],[457,885],
    [481,875],[509,884],[524,864],[544,865],[560,845],[580,847],[596,838],[617,842],
    [635,837],[657,850],[678,857],[693,874],[715,865],[737,870],[750,850],[773,844],
    [795,854],[811,873],[837,873],[854,888],[880,885],[900,898],[925,895],[944,882],
    [963,878],[979,870],[993,883],[1015,872],[1024,859],[1043,850],[1066,858],
    [1080,847],[1103,841],[1127,853],[1144,846],[1167,850],[1189,857],[1207,870],
    [1231,860],[1250,871],[1270,858],[1292,870],[1315,859],[1335,868],[1357,855],
    [1377,860],[1394,848],[1416,857],[1440,842],[1460,850],[1485,841],[1501,850],
    [1520,840],[1543,840],[1561,829],[1580,837],[1593,823],[1619,827],[1619,971],[315,971],
  ]),

  // Walls, railings and fences: paths remain open at their actual gaps.
  line('west-park-north-fence', 'fence', [[1,235],[121,235],[121,158],[82,158],[82,188]]),
  line('west-park-road-wall', 'wall', [[123,0],[123,232]], 5),
  line('west-building-front-fence', 'fence', [[64,390],[125,390],[125,487],[2,487]]),
  line('southwest-park-north-fence', 'fence', [[0,599],[94,599],[94,625],[130,625],[130,777],[96,777],[96,880]]),
  line('southwest-park-south-fence', 'fence', [[81,971],[81,936],[126,936],[126,888],[97,888]]),
  line('north-office-property-wall', 'wall', [[381,0],[381,155],[393,155]], 5),
  line('workshop-west-wall', 'wall', [[333,324],[333,428],[417,428]], 4),
  line('greenhouse-front-rail-left', 'fence', [[413,432],[413,487],[472,487]], 3),
  line('greenhouse-front-rail-right', 'fence', [[553,487],[561,487]], 3),
  line('middle-building-divider', 'wall', [[713,181],[713,482]], 4),
  line('service-east-wall', 'wall', [[1094,348],[1094,480]], 5),
  line('company-west-property-fence', 'fence', [[1138,292],[1138,449],[1150,449],[1150,483]], 4),
  line('company-front-far-left-fence', 'fence', [[1102,461],[1160,461]], 3),
  line('company-front-left-fence', 'fence', [[1220,461],[1328,461]], 3),
  line('company-front-right-fence', 'fence', [[1361,461],[1594,461],[1594,384]], 3),
  line('north-diagonal-road-wall', 'wall', [[1294,0],[1619,326]], 4),
  line('store-west-property-fence', 'fence', [[322,638],[322,835],[382,835]], 3),
  line('store-east-property-wall', 'wall', [[615,599],[626,599],[626,843]], 5),
  line('house-east-property-fence', 'fence', [[871,584],[871,868],[792,868]], 4),
  line('construction-north-fence', 'fence', [[1019,584],[1088,584],[1088,610],[1067,610]], 5),
  line('construction-east-fence', 'fence', [[1143,584],[1143,855]], 5),
  line('construction-shed-west-fence', 'fence', [[879,727],[879,886]], 4),
  line('construction-shed-east-fence', 'fence', [[993,762],[993,883]], 5),
  line('southeast-warehouse-west-fence', 'fence', [[1167,643],[1167,852]], 5),
  line('southeast-warehouse-middle-fence', 'fence', [[1287,665],[1287,864]], 4),
  line('southeast-parking-divider-fence', 'fence', [[1407,739],[1407,853]], 4),

  // Construction machines/materials; shop-front fixtures and utility poles.
  polygon('excavator', 'equipment', [[943,681],[970,677],[987,662],[993,667],[977,690],[977,710],[989,716],[982,727],[941,728],[928,718],[929,693],[940,691]]),
  box('construction-lumber-north', 'equipment', 1026, 601, 47, 51),
  box('construction-scaffold', 'equipment', 1020, 647, 24, 49),
  box('construction-lumber-west', 'equipment', 888, 711, 34, 24),
  box('construction-lumber-east', 'equipment', 995, 699, 42, 27),
  polygon('construction-earth-pile', 'equipment', [[995,739],[1012,738],[1028,749],[1035,763],[1020,772],[992,770],[983,759]]),
  box('construction-lumber-south', 'equipment', 1103, 793, 22, 63),
  box('warehouse-vending-west', 'equipment', 620, 436, 18, 24),
  box('warehouse-vending-east', 'equipment', 741, 436, 21, 28),
  box('service-vending', 'equipment', 937, 433, 16, 25),
  box('service-bins', 'equipment', 958, 433, 19, 25),
  box('greenhouse-vending', 'equipment', 477, 448, 15, 28),
  box('workshop-front-sign', 'equipment', 429, 427, 26, 8),
  box('store-vending', 'equipment', 550, 758, 30, 23),
  box('construction-cone-west', 'equipment', 987, 715, 6, 11),
  box('construction-cone-east', 'equipment', 1000, 718, 6, 12),
  line('streetlight-west', 'pole', [[150,324],[150,386]], 4),
  line('streetlight-north', 'pole', [[293,220],[293,284]], 4),
  line('streetlight-store', 'pole', [[394,782],[394,831]], 4),
  line('streetlight-south', 'pole', [[290,843],[290,905]], 4),
  line('streetlight-house', 'pole', [[663,544],[663,578]], 4),
  ...[
    ['north-road',293,226], ['west-crossing',150,485], ['east-crossing',326,491],
    ['west-south-crossing',150,624], ['store-west',394,817], ['store-lot',333,827],
    ['house-north',663,578], ['south-road-west',290,896], ['south-road-bottom',295,948],
    ['workshop-front',409,435], ['company-west',1108,480],
  ].map(([id, x, y]) => box(`pole-${id}`, 'pole', x - 3, y - 4, 6, 8)),
];
