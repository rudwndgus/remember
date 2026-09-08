export const ASSETS = {
  logo: `${import.meta.env.BASE_URL}assets/ui/bluu-logo.png`,
  map: `${import.meta.env.BASE_URL}assets/maps/outside-main-map.png`,
};

export const COLORS = { blue: 0x084c94, white: 0xfffff9, ink: 0x162921 };

// Coordinates within the supplied 300 × 300 logo, normalized to 0–1.
// The focus is the WHITE CIRCULAR SYMBOL, not the center of the whole logo.
// Change these three values if you replace the logo with another composition.
export const LOGO_FOCUS = { x: 148 / 300, y: 113 / 300, radius: 53 / 300 };

// Native map dimensions. All map and collision coordinates use this space.
export const MAP = { width: 1619, height: 971 };

// Player feet start on the pavement beside the large company entrance.
export const PLAYER = { spawn: { x: 1345, y: 470 }, speed: 145 };

export const INTRO = {
  logoFocusMs: 700,
  logoZoomMs: 2100,
  mapRevealMs: 1500,
  // Full map remains visible for 1.3 seconds AFTER the aperture opens.
  mapHoldMs: 1300,
  playerZoomMs: 2400,
};

// Final play magnification; OutsideScene also enforces cover zoom so that
// a very wide/tall viewport cannot expose space outside the map during play.
export const CAMERA = { playZoom: 2.4 };

// Simple, deliberately conservative building rectangles. Add more here later.
// x/y describe each rectangle's top-left corner, width/height its size.
export const OBSTACLES = [
  { x: 1160, y: 143, width: 390, height: 296 },
  { x: 383, y: 40, width: 185, height: 120 },
  { x: 617, y: 214, width: 91, height: 239 },
  { x: 727, y: 176, width: 91, height: 262 },
  { x: 694, y: 543, width: 155, height: 207 },
  { x: 458, y: 608, width: 123, height: 164 },
];

export const DEBUG = { entranceMarker: false, collisions: false };
