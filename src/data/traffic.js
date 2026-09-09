export const TRAFFIC = {
  maxAmbientVehicles: 9,
  spawnMinMs: 3500, spawnMaxMs: 6500,
  acceleration: 24, braking: 105, minimumGap: 11,
  greenMs: 12500, amberMs: 1700, allRedMs: 1600,
  intersection: { left: 109, right: 345, top: 451, bottom: 651 },
};
export const VEHICLE_DEFINITIONS = {
  sedan: { length: 39, width: 18, speed: 79, colors: [0xd9dfda,0x41637c,0x985447,0x526450] },
  suv: { length: 44, width: 22, speed: 73, colors: [0x46535c,0xd0c9b8,0x637d79] },
  pickup: { length: 49, width: 21, speed: 68, colors: [0xa15e43,0x718b99,0xbab4a2] },
  van: { length: 50, width: 22, speed: 66, colors: [0xe4e0cc,0x71828c] },
  bus: { length: 77, width: 26, speed: 76, colors: [0xe1e2d8] },
};
export const SIGNAL_LOCATIONS = [
  { x: 308, y: 447, axis: 'NS' }, { x: 166, y: 652, axis: 'NS' },
  { x: 109, y: 480, axis: 'EW' }, { x: 346, y: 582, axis: 'EW' },
];

// Right-hand traffic: southbound x196, northbound x260;
// eastbound y566, westbound y533. Curves occur ONLY inside the junction.
const routeSegments = {
  N: {
    straight: [[196,-96],[196,1067]],
    right: [[196,-96],[196,506],[[196,521],[183,533],[164,533]],[-96,533]],
    left: [[196,-96],[196,506],[[196,544],[239,566],[294,566]],[1715,566]],
  },
  S: {
    straight: [[260,1067],[260,-96]],
    right: [[260,1067],[260,594],[[260,578],[275,566],[294,566]],[1715,566]],
    left: [[260,1067],[260,594],[[260,553],[223,533],[164,533]],[-96,533]],
  },
  W: {
    straight: [[-96,566],[1715,566]],
    right: [[-96,566],[164,566],[[182,566],[196,580],[196,597]],[196,1067]],
    left: [[-96,566],[164,566],[[223,566],[260,546],[260,506]],[260,-96]],
  },
  E: {
    straight: [[1715,533],[-96,533]],
    right: [[1715,533],[294,533],[[275,533],[260,520],[260,503]],[260,-96]],
    left: [[1715,533],[294,533],[[236,533],[196,557],[196,597]],[196,1067]],
  },
};

export function createTrafficRoute(origin, turn = 'straight', customSegments = null) {
  const segments = customSegments || routeSegments[origin][turn];
  const points = [segments[0]];
  let previous = segments[0];
  for (const segment of segments.slice(1)) {
    const curved = Array.isArray(segment[0]);
    const end = curved ? segment[2] : segment;
    const samples = curved ? 48 : Math.max(2,Math.ceil(Math.hypot(end[0]-previous[0],end[1]-previous[1])/8));
    for (let i=1;i<=samples;i++) {
      const t=i/samples, u=1-t;
      points.push(curved ? [
        u*u*u*previous[0]+3*u*u*t*segment[0][0]+3*u*t*t*segment[1][0]+t*t*t*end[0],
        u*u*u*previous[1]+3*u*u*t*segment[0][1]+3*u*t*t*segment[1][1]+t*t*t*end[1],
      ] : [previous[0]+(end[0]-previous[0])*t,previous[1]+(end[1]-previous[1])*t]);
    }
    previous=end;
  }
  const distances=[0];
  for(let i=1;i<points.length;i++) distances.push(distances[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  const entryDistance = customSegments ? TRAFFIC.intersection.top-segments[0][1] : { N:547, S:416, W:205, E:1370 }[origin];
  let exitDistance=entryDistance;
  points.forEach(([x,y],i)=>{
    const b=TRAFFIC.intersection;
    if(x>=b.left && x<=b.right && y>=b.top && y<=b.bottom) exitDistance=distances[i];
  });
  return { id:`${origin}-${turn}`, origin, turn, axis:origin==='N'||origin==='S'?'NS':'EW',
    points, distances, length:distances.at(-1), entryDistance, exitDistance };
}

export function sampleRoute(route,distance) {
  const d=Math.max(0,Math.min(route.length,distance));
  let low=0,high=route.distances.length-1;
  while(low+1<high) { const mid=(low+high)>>1; if(route.distances[mid]<=d) low=mid; else high=mid; }
  const a=route.points[low],b=route.points[high];
  const span=route.distances[high]-route.distances[low];
  const t=span ? (d-route.distances[low])/span : 0;
  return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};
}

export function signalAt(time) {
  const half=TRAFFIC.greenMs+TRAFFIC.amberMs+TRAFFIC.allRedMs;
  const phase=((time%(half*2))+half*2)%(half*2);
  const axis=phase<half?'NS':'EW';
  const elapsed=phase%half;
  const color=elapsed<TRAFFIC.greenMs?'green':elapsed<TRAFFIC.greenMs+TRAFFIC.amberMs?'amber':'red';
  return {NS:axis==='NS'?color:'red',EW:axis==='EW'?color:'red'};
}

// Clearance from a point to an oriented vehicle body. Negative means inside.
export function vehicleClearance(vehicle,x,y,forwardPadding=0,sidePadding=0) {
  const dx=x-vehicle.x,dy=y-vehicle.y,c=Math.cos(vehicle.angle),s=Math.sin(vehicle.angle);
  const along=dx*c+dy*s,across=-dx*s+dy*c;
  const front=vehicle.length/2+forwardPadding;
  const rear=vehicle.length/2;
  return Math.max(along>=0?along-front:-along-rear,Math.abs(across)-vehicle.width/2-sidePadding);
}
