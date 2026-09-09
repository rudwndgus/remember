const query = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
const enabled = query.has('debug');
export const DEBUG_TRAFFIC_PATHS = enabled && query.has('traffic');
export const DEBUG_BUS_STOP_ZONE = enabled && query.has('zones');
export const DEBUG_BUS_PATH = enabled && query.has('buspath');
export const DEBUG_ZONES = DEBUG_BUS_STOP_ZONE;
export const DEBUG = {
  entranceMarker: false,
  collisions: enabled && query.has('collisions'),
  trafficPaths: DEBUG_TRAFFIC_PATHS,
  busStopZone: DEBUG_BUS_STOP_ZONE,
  busPath: DEBUG_BUS_PATH,
  ambientTraffic: !(enabled && query.has('no-traffic')),
};
