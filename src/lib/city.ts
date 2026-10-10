// ── Looking down (#179) ──
// The whole page the visitor has been looking up, into the sky. At the end
// the head lowers while the fall goes on: the stars slide up out of view, a
// horizon rises, and under it the ground's lights stretch away (CityGround).
//
// One progress f, 0..1, a pure function of scroll published by the Footer (0
// as the footer comes in at the bottom of the screen, 1 at the very end of
// the page), drives the camera's sink and tilt and the lights below.
// Scrolling back plays the same frames in reverse; nothing moves at rest.

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// ── timing, all in f
export const CITY = {
  runway: 0.9, // screens of scroll the footer holds still for (desktop)
  land: 0.6, // the camera has sunk to its last height by here
  tilt: [0.2, 0.85] as const, // the eyes lower to the horizon
  lights: [0.3, 0.9] as const, // the lights below come on, near ones first
};

/** 0..1 over [a, b] of f */
export const span = (f: number, [a, b]: readonly [number, number]) => clamp01((f - a) / (b - a));

// ── the camera, on top of the flight's own end pose
const LAND_Y = 1.1; // world units the camera sinks
const TILT = 0.17; // radians below level the eyes come to rest at
const FOV = 60;
/** how far below the last eye height the ground lies */
export const GROUND_DROP = 1.8;

/** the camera's offset from the flight's end pose at progress f; `below`
 * is how far the stars under eye level have thinned (0..1) */
export function cityCamera(f: number) {
  const dy = -LAND_Y * smoother(clamp01(f / CITY.land));
  const pitch = -TILT * smoother(span(f, CITY.tilt));
  const below = smoother(span(f, [CITY.tilt[0], CITY.tilt[0] + 0.4]));
  return { dy, pitch, below, fov: FOV };
}
/** the eye height at the end of the page, in the world */
export const endEyeY = (flightEndY: number) => flightEndY - LAND_Y;

// ── the bus between the Footer and the star field
let progressFn: (() => number) | null = null;

export const cityBus = {
  /** the footer's progress f; null when no held footer is on the page */
  setProgress(progress: (() => number) | null) {
    progressFn = progress;
  },
  progress: () => (progressFn ? progressFn() : 0),
};

// Je suis le spectre d'une rose que tu portais hier au bal.
