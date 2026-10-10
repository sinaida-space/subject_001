// ── The city the stars came from (#179) ──
// The flight ends in a city. The footer's link columns are towers, each link
// a floor with a strip of windows under it, standing on the ECG ground line.
// The windows are stars: a pool of points that sits in the sky until the
// footer comes in, then falls, floor by floor from the ground up, and lands
// on the floors (CityLights, in the star field's own scene). Once the city
// stands, grains of light leave the windows and rise back into the sky.
//
// One progress f, 0..1, drives it all, a pure function of scroll published by
// the Footer: 0 as the footer comes in at the bottom of the screen, 1 at the
// very end of the page. Scrolling back plays the same frames in reverse;
// nothing moves at rest. The Footer measures its floors and hands the cells
// here; the star field reads them, f and where the stage sits on screen.

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const fract = (x: number) => x - Math.floor(x);
const hash = (i: number, k: number) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);

// ── timing, all in f
export const CITY = {
  runway: 0.9, // screens of scroll the footer holds still for (desktop)
  ground: [0.3, 0.46] as const, // the ECG ground draws itself left to right
  fall: [0.38, 0.8] as const, // the windows land, ground floors first
  fallDur: 0.12, // one star's fall
  emit: [0.78, 0.97] as const, // grains of light leave the windows
  emitDur: 0.24,
  land: 0.55, // the camera has sunk to the street by here
  dolly: [0.8, 1] as const, // and cranes back while the lens narrows
  bar: [0.86, 0.96] as const, // the bottom bar
  step: 6, // css px between window cells
};

/** 0..1 over [a, b] of f */
export const span = (f: number, [a, b]: readonly [number, number]) => clamp01((f - a) / (b - a));

/** when a floor `level` px above the ground of a city `height` px tall starts to fall */
export const floorDelay = (level: number, height: number, tower: number) =>
  CITY.fall[0] + (CITY.fall[1] - CITY.fall[0] - CITY.fallDur - 0.05) * clamp01(level / Math.max(height, 1)) + 0.025 * tower;

/** how far a floor's text has condensed: it follows its windows in */
export const floorLit = (f: number, delay: number) => clamp01((f - delay - CITY.fallDur * 0.55) / (CITY.fallDur * 0.6));

// ── the camera, on top of the flight's own end pose
const LAND_Y = 1.1; // world units the camera sinks to street level
const DOLLY_Z = 4.5; // and backs away during the crane
const DOLLY_D = 4; // the plane (world units ahead) the narrowing lens holds at its size
const FOV = 60;

/** the camera's offset from the flight's end pose at city progress f */
export function cityCamera(f: number) {
  const dy = -LAND_Y * smoother(clamp01(f / CITY.land));
  const dz = DOLLY_Z * smoother(span(f, CITY.dolly));
  const fov = (2 * Math.atan((Math.tan((FOV * Math.PI) / 360) * DOLLY_D) / (DOLLY_D + dz)) * 180) / Math.PI;
  return { dy, dz, fov };
}

// ── the cells
// kinds: 0 window, 1 structure (the mast), 2 a grain that rises, 3 the mast's red light
export interface Tower {
  left: number; right: number; // css px in the stage
  roof: number; ground: number; // y of the roof edge and of the ground line
  floors: { y: number; id: number }[]; // y of each floor's window strip (top row)
  antenna?: boolean;
}

export interface CityLayout {
  version: number;
  count: number;
  sky: Float32Array; // xyz: start in the world (kind 2: rise px, drift px, 0)
  win: Float32Array; // x, y px in the stage; x share along the floor; kind
  info: Float32Array; // delay, floor id, brightness, rnd
  color: Float32Array; // the star's own colour while it is sky
}

const STAR_COLORS: [number, number, number][] = [[1, 0.95, 0.88], [0.82, 0.88, 1], [1, 0.2, 0.17]];

/**
 * The cells of the city, in stage px, and where each one waits in the sky.
 * `view` is the screen in css px; `pose` the flight's end in the world
 * (camera position before the city's own offsets).
 */
export function buildCity(
  towers: Tower[],
  view: { w: number; h: number; stageTop: number },
  pose: { x: number; y: number; z: number },
  version: number,
): CityLayout {
  type Cell = { x: number; y: number; xs: number; kind: number; delay: number; floor: number; lvl: number };
  const cells: Cell[] = [];
  const step = CITY.step;
  const height = Math.max(1, ...towers.map((t) => t.ground - t.roof));
  let n = 0;
  towers.forEach((t, ti) => {
    const w = t.right - t.left;
    const cols = Math.max(2, Math.floor(w / step));
    const x0 = t.left + (w - (cols - 1) * step) / 2;
    // windows: two rows per floor, lit in rooms of four, like a real façade
    for (const fl of t.floors) {
      const delay = floorDelay(t.ground - fl.y, height, ti);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols; c++) {
          const room = Math.floor(c / 4);
          const on = hash(fl.id * 31 + room, 3 + r * 0.5) < 0.64;
          const lvl = on ? 0.42 + 0.38 * hash(fl.id * 31 + room, 5) - 0.06 * hash(n, 9) : 0.07;
          cells.push({ x: x0 + c * step, y: fl.y + r * step, xs: c / (cols - 1), kind: 0, delay: delay + 0.02 * hash(n, 1), floor: fl.id, lvl });
          n++;
        }
      }
    }
    // no outlines: at night a building is its windows; the roof shows only
    // where the tallest one carries its mast
    const rd = floorDelay(t.ground - t.roof, height, ti);
    if (t.antenna) {
      const ax = x0 + Math.round((cols - 1) / 2) * step;
      for (let k = 1; k <= 4; k++) {
        cells.push({ x: ax, y: t.roof - k * step, xs: 0, kind: 1, delay: rd + 0.02, floor: -1, lvl: 0.22 });
        n++;
      }
      // the one red light, on the tallest roof, as every city has
      cells.push({ x: ax, y: t.roof - 5 * step, xs: 0, kind: 3, delay: rd + 0.03, floor: -1, lvl: 0.9 });
      n++;
    }
  });

  // grains that leave lit windows once the city stands
  const lit = cells.filter((c) => c.kind === 0 && c.lvl > 0.3);
  const grains = Math.min(360, Math.round(lit.length * 0.3));

  const count = cells.length + grains;
  const sky = new Float32Array(count * 3);
  const win = new Float32Array(count * 4);
  const info = new Float32Array(count * 4);
  const color = new Float32Array(count * 3);

  // the sky a cell falls from: anywhere over the upper screen, above its
  // window, at a depth in the field; only the galaxy's kept share shows
  // there (the rest condense as they fall, like every formation on the page)
  const tanH = Math.tan((FOV * Math.PI) / 360);
  const aspect = view.w / Math.max(view.h, 1);
  const cam = cityCamera(CITY.fall[0]);
  cells.forEach((c, i) => {
    const r1 = hash(i, 11), r2 = hash(i, 12), r3 = hash(i, 13), r4 = hash(i, 14);
    const sx = (r1 * 1.2 - 0.1) * view.w;
    const vy = view.stageTop + c.y; // where the window will be on screen
    const sy = -0.05 * view.h + r2 * Math.max(0, Math.min(0.65 * view.h, vy - 60));
    const d = 4 + r3 * 5;
    const nx = (sx / view.w) * 2 - 1, ny = 1 - (sy / view.h) * 2;
    sky[i * 3] = pose.x + nx * d * tanH * aspect;
    sky[i * 3 + 1] = pose.y + cam.dy + ny * d * tanH;
    sky[i * 3 + 2] = pose.z + cam.dz - d;
    win.set([c.x, c.y, c.xs, c.kind], i * 4);
    info.set([c.delay, c.floor, c.lvl, r4], i * 4);
    const k = fract(r4 * 2.39);
    color.set(STAR_COLORS[k > 0.92 ? 2 : k > 0.72 ? 1 : 0], i * 3);
  });
  for (let g = 0; g < grains; g++) {
    const i = cells.length + g;
    const c = lit[Math.floor(hash(g, 21) * lit.length)];
    const r = hash(g, 22);
    sky.set([view.h * (0.08 + 0.42 * hash(g, 23)), (hash(g, 24) - 0.5) * 14, 0], i * 3);
    win.set([c.x, c.y, 0, 2], i * 4);
    info.set([CITY.emit[0] + (CITY.emit[1] - CITY.emit[0]) * r, c.floor, c.lvl, hash(g, 25)], i * 4);
    color.set(STAR_COLORS[hash(g, 26) > 0.7 ? 1 : 0], i * 3);
  }
  return { version, count, sky, win, info, color };
}

// ── the bus between the Footer and the star field
type Listener = () => void;
let layout: CityLayout | null = null;
let stage: HTMLElement | null = null;
let progressFn: (() => number) | null = null;
let hover = -1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export const cityBus = {
  layout: () => layout,
  setLayout(l: CityLayout | null) {
    layout = l;
    emit();
  },
  /** the element the cells are measured in, and the footer's progress */
  setStage(el: HTMLElement | null, progress: (() => number) | null) {
    stage = el;
    progressFn = progress;
    if (!el) layout = null;
    emit();
  },
  progress: () => (progressFn ? progressFn() : 0),
  /** where the stage's top sits on screen now, css px */
  stageTop: () => (stage ? stage.getBoundingClientRect().top : 0),
  hovered: () => hover,
  hover(id: number) {
    if (id === hover) return;
    hover = id;
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

// Je suis le spectre d'une rose que tu portais hier au bal.
