export const ASSETS = {
  logo: `${import.meta.env.BASE_URL}assets/ui/bluu-logo.png`,
  map: `${import.meta.env.BASE_URL}assets/maps/outside-main-map.png`,
  parkingGarage: `${import.meta.env.BASE_URL}assets/maps/parking-garage-map.png`,
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

// 1 = the minimum scale that fills the screen, preserving the map aspect ratio.
// No fixed close-up zoom: desktop shows nearly the entire neighborhood, while
// portrait devices follow the player across the wider map.
export const CAMERA = { coverMultiplier: 1 };

export { DEBUG } from '../game/debug.js';
