// ── Looking down (#179) ──
// The whole page the visitor has been looking up, into the sky. At the end
// the camera dollies out of Contact (it backs away while the lens narrows, so
// space flattens and the Contact block recedes into the top left), then the
// head lowers: the stars under eye level pour down to the ground, the city's
// soft lights come on from the horizon toward the feet (CityGround), and the
// footer resolves out of dither.
//
// One progress f, 0..1, a pure function of scroll published by the Footer (0
// as the footer comes in at the bottom of the screen, 1 at the very end of
// the page), drives all of it. Scrolling back plays the same frames in
// reverse; nothing moves at rest.

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

// ── timing, all in f
export const CITY = {
  runway: 1.2, // screens of scroll the footer holds still for
  dolly: [0.04, 0.5] as const, // the camera backs away, the lens narrows
  recede: [0.08, 0.5] as const, // Contact sinks back into the top left
  land: 0.6, // the camera has sunk to its last height by here
  tilt: [0.3, 0.85] as const, // the eyes lower to the horizon
  fall: [0.25, 0.8] as const, // stars under eye level pour down to the ground
  ground: [0.4, 0.92] as const, // the city's lights come on, from the horizon to the feet
  // the footer resolves out of dither: logo, columns, the bottom line
  text: [[0.6, 0.76], [0.66, 0.84], [0.76, 0.92]] as const,
};

/** 0..1 over [a, b] of f */
export const span = (f: number, [a, b]: readonly [number, number]) => clamp01((f - a) / (b - a));

// ── the camera, on top of the flight's own end pose
const LAND_Y = 1.1; // world units the camera sinks
const FOV = 60;
const DOLLY_FOV = 36; // the lens at the end of the dolly
export const DOLLY_Z = 3; // world units the camera backs away
/** how far below the last eye height the ground lies */
export const GROUND_DROP = 1.8;

/** the eyes lower just far enough that the horizon comes to rest at
 * `horizon` (a share of the screen's height from the top), under the
 * receded Contact block */
const restTilt = (horizon: number) => {
  const t = Math.atan((0.5 - horizon) * 2 * Math.tan(((DOLLY_FOV / 2) * Math.PI) / 180));
  return Math.min(0.22, Math.max(0.05, t));
};

/** the camera's offset from the flight's end pose at progress f; `fall` is
 * how far the stars under eye level have poured down to the ground (0..1) */
export function cityCamera(f: number, horizon = DEFAULT_HORIZON) {
  const dolly = smoother(span(f, CITY.dolly));
  const dy = -LAND_Y * smoother(clamp01(f / CITY.land));
  const pitch = -restTilt(horizon) * smoother(span(f, CITY.tilt));
  const fall = smoother(span(f, CITY.fall));
  return { dy, dz: DOLLY_Z * dolly, pitch, fall, fov: FOV + (DOLLY_FOV - FOV) * dolly };
}
/** the eye height at the end of the page, in the world */
export const endEyeY = (flightEndY: number) => flightEndY - LAND_Y;

/** where the city lies: under the flight's end on the home page, under the
 * camera's own home on the other pages (their camera does not fly) */
export function cityOrigin(flight: boolean, end: { x: number; y: number; z: number }) {
  const o = flight ? end : { x: 0, y: 0, z: 7 };
  return { x: o.x, z: o.z + DOLLY_Z, groundY: endEyeY(o.y) - GROUND_DROP };
}

// ── the lines of text the ground keeps clear of
/** fills `out` with the css px rects (left, top, right, bottom) of the
 * visible [data-ground-mask] elements (not those still unformed in their
 * dither); returns how many */
export function textRects(out: Float32Array): number {
  const max = out.length / 4;
  const vh = window.innerHeight;
  let n = 0;
  for (const el of document.querySelectorAll<HTMLElement>('[data-ground-mask]')) {
    if (n >= max) break;
    if (el.closest('[data-unformed]')) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh || r.width === 0) continue;
    out.set([r.left, r.top, r.right, r.bottom], n * 4);
    n++;
  }
  return n;
}

// ── the bus between the Footer, Contact and the star field
const DEFAULT_HORIZON = 0.3;
let progressFn: (() => number) | null = null;
let horizon = DEFAULT_HORIZON;
let pour = 0;

/** the footer's hovers (#179, full mode): CONNECT pulls the stars near the
 * cursor into small clusters, MORE snaps the city's lights to the dither
 * grid, the name sends a glint through the stars */
export type CityHover = 'connect' | 'more' | 'name' | null;
let hover: CityHover = null;
const hoverListeners = new Set<() => void>();
let held = false;
const heldListeners = new Set<() => void>();

export const cityBus = {
  /** the footer's progress f; null when no footer with the scene is on the page */
  setProgress(progress: (() => number) | null) {
    progressFn = progress;
  },
  progress: () => (progressFn ? progressFn() : 0),

  /** the footer holds the last screen (home, full mode, tall enough); Contact pins to it */
  setHeld(h: boolean) {
    if (h === held) return;
    held = h;
    heldListeners.forEach((l) => l());
  },
  held: () => held,
  onHeld(l: () => void) {
    heldListeners.add(l);
    return () => void heldListeners.delete(l);
  },

  /** where the horizon comes to rest, a share of the screen from the top;
   * Contact sets it just under its receded block */
  setHorizon(h: number | null) {
    horizon = h ?? DEFAULT_HORIZON;
  },
  horizon: () => horizon,

  /** how far the CONTACT title has poured down into the city (0..1); its
   * stars become the city's lights as they land */
  setPour(q: number) {
    pour = q;
  },
  pour: () => pour,

  setHover(h: CityHover) {
    if (h === hover) return;
    hover = h;
    hoverListeners.forEach((l) => l());
  },
  hover: () => hover,
  onHover(l: () => void) {
    hoverListeners.add(l);
    return () => void hoverListeners.delete(l);
  },
};

// Je suis le spectre d'une rose que tu portais hier au bal.
