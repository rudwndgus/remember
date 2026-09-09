// Native coordinates on the clean 1619 × 971 map. Reference annotations are
// instructions only; neither annotated image is ever loaded by the game.
export const DUNKIN_X = 476;
export const DUNKIN_Y = 142;
export const BUS_STOP_X = 133;
export const BUS_STOP_Y = 831;
export const BUS_STOP_WIDTH = 56;
export const BUS_STOP_HEIGHT = 72;

export const OUTSIDE_LOCATIONS = {
  dunkin: { x: DUNKIN_X, y: DUNKIN_Y },
  busStop163: { x: BUS_STOP_X, y: BUS_STOP_Y, width: BUS_STOP_WIDTH, height: BUS_STOP_HEIGHT },
  busStopSign: { x: 143, y: 800 },
  busStopBench: { x: 109, y: 833 },
  bus163Spawn: { x: 196, y: -96 },
  // Southbound traffic keeps to the west half of the vertical road. Its right
  // door faces the west pavement, where the marked waiting area already exists.
  bus163Stop: { x: 196, y: 827 },
  bus163Return: { x: 146, y: 847 },
};

export const BUS_163 = {
  route: '163', waitMs: 2600, closeDistance: 105,
  interactionDistance: 108, boardingMs: 3600,
};
