// ── Looking down (#179) ──
// The whole page the visitor has been looking up, into the sky. At the end
// the head lowers while the fall goes on: the stars slide up out of view, a
// horizon rises, and under it the city's lights stretch away (CityGround).
// Nobody built that sky; it was the city's light all along.
//
// Three things happen on the way, all from one progress f, 0..1, a pure
// function of scroll published by the Footer (0 as the footer comes in at the
// bottom of the screen, 1 at the very end of the page):
//   the pour   LET'S TALK's two links break into stars, which rise with the
//              eyes and settle in the sky of the last screen
//   the fall   stars drop into the little towers by the logo, a window grid
//              per column, as tall as the column is long (CityLights)
//   the tilt   the camera lifts a little with the pour, then lowers to the
//              horizon as the city lights come on, near ones first
// Scrolling back plays the same frames in reverse; nothing moves at rest.

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const fract = (x: number) => x - Math.floor(x);
const hash = (i: number, k: number) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);

// ── timing, all in f
export const CITY = {
  runway: 0.9, // screens of scroll the footer holds still for (desktop)
  pour: [0.06, 0.5] as const, // the two links travel to the sky
  pourDur: 0.22, // one star's journey
  fall: [0.36, 0.78] as const, // the towers' windows land, ground floors first
  fallDur: 0.12,
  emit: [0.8, 0.97] as const, // grains of light leave the windows
  emitDur: 0.24,
  land: 0.6, // the camera has sunk to its last height by here
  lift: [0.02, 0.3] as const, // the eyes follow the pour up
  tilt: [0.34, 0.9] as const, // then lower to the horizon
  lights: [0.42, 0.9] as const, // the city's lights come on, near ones first
  bar: [0.86, 0.96] as const, // the bottom bar
  step: 6, // css px between window cells
};

/** 0..1 over [a, b] of f */
export const span = (f: number, [a, b]: readonly [number, number]) => clamp01((f - a) / (b - a));

/** when a floor `level` px above the ground of a city `height` px tall starts to fall */
export const floorDelay = (level: number, height: number, tower: number) =>
  CITY.fall[0] + (CITY.fall[1] - CITY.fall[0] - CITY.fallDur - 0.05) * clamp01(level / Math.max(height, 1)) + 0.025 * tower;

// ── the camera, on top of the flight's own end pose
const LAND_Y = 1.1; // world units the camera sinks
const LIFT = 0.07; // radians the eyes rise with the pour
const TILT = 0.17; // radians below level they come to rest at
const FOV = 60;
/** how far below the last eye height the city's ground lies */
export const GROUND_DROP = 1.8;

/** the camera's offset from the flight's end pose at city progress f; `below`
 * is how far the stars under eye level have thinned (0..1) */
export function cityCamera(f: number) {
  const dy = -LAND_Y * smoother(clamp01(f / CITY.land));
  const pitch = LIFT * smoother(span(f, CITY.lift)) - (LIFT + TILT) * smoother(span(f, CITY.tilt));
  const below = smoother(span(f, [CITY.tilt[0], CITY.tilt[0] + 0.4]));
  return { dy, pitch, below, fov: FOV };
}
/** the eye height at the end of the page, in the world */
export const endEyeY = (flightEndY: number) => flightEndY - LAND_Y;

// ── the cells
// kinds: 0 window, 1 the mast, 2 a grain that rises, 3 the mast's red light,
// 4 a star of the pour
export interface Tower {
  left: number; right: number; // css px in the stage
  roof: number; ground: number; // y of the roof and of the ground
  floors: { y: number; id: number }[]; // y of each floor's top window row
  antenna?: boolean;
}

/** a glyph cell of the poured links, relative to the links' box */
export interface PourCell { x: number; y: number; r: number; g: number; b: number }

export interface CityLayout {
  version: number;
  count: number;
  sky: Float32Array; // xyz: start in the world (kind 2: rise px, drift px; kind 4: scatter px)
  win: Float32Array; // x, y px (stage, or the links' box for kind 4); unused; kind
  info: Float32Array; // delay, unused, brightness, rnd
  color: Float32Array; // the star's colour while it is sky (kind 4: the glyph's)
}

const STAR_COLORS: [number, number, number][] = [[1, 0.95, 0.88], [0.82, 0.88, 1], [1, 0.2, 0.17]];

/** three silhouettes standing on the bottom of a strip `w` × `h`: one per
 * link column, two window rows per link */
export function stripTowers(w: number, h: number, floorsPer: number[]): Tower[] {
  const gap = w * 0.08, tw = (w - gap * (floorsPer.length - 1)) / floorsPer.length;
  const ground = h - 2;
  let id = 0;
  return floorsPer.map((n, ti) => {
    const left = ti * (tw + gap);
    const floors = Array.from({ length: n }, (_, k) => ({ y: ground - (k + 1) * 2 * CITY.step, id: id + k }));
    id += n;
    return { left, right: left + tw, roof: ground - n * 2 * CITY.step - 4, ground, floors, antenna: n === Math.max(...floorsPer) };
  });
}

/**
 * The cells of the towers (in stage px) and where each one waits in the sky,
 * plus the poured links' stars. `view` is the screen in css px; `pose` the
 * flight's end in the world (the camera before the city's own offsets).
 */
export function buildCity(
  towers: Tower[],
  pour: PourCell[],
  pourWidth: number,
  view: { w: number; h: number; stageTop: number },
  pose: { x: number; y: number; z: number },
  version: number,
): CityLayout {
  type Cell = { x: number; y: number; kind: number; delay: number; lvl: number };
  const cells: Cell[] = [];
  const step = CITY.step;
  const height = Math.max(1, ...towers.map((t) => t.ground - t.roof));
  let n = 0;
  towers.forEach((t, ti) => {
    const w = t.right - t.left;
    const cols = Math.max(2, Math.floor(w / step));
    const x0 = t.left + (w - (cols - 1) * step) / 2;
    // two window rows per floor, lit in rooms of three, like a real façade
    for (const fl of t.floors) {
      const delay = floorDelay(t.ground - fl.y, height, ti);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < cols; c++) {
          const room = Math.floor(c / 3);
          const on = hash(fl.id * 31 + room + r * 7, 3) < 0.66;
          const lvl = on ? 0.45 + 0.4 * hash(fl.id * 31 + room, 5) - 0.06 * hash(n, 9) : 0.08;
          cells.push({ x: x0 + c * step, y: fl.y + r * step, kind: 0, delay: delay + 0.02 * hash(n, 1), lvl });
          n++;
        }
      }
    }
    if (t.antenna) {
      const rd = floorDelay(t.ground - t.roof, height, ti);
      const ax = x0 + Math.round((cols - 1) / 2) * step;
      for (let k = 1; k <= 3; k++) {
        cells.push({ x: ax, y: t.roof - k * step, kind: 1, delay: rd + 0.02, lvl: 0.25 });
        n++;
      }
      // the one red light, on the tallest roof, as every city has
      cells.push({ x: ax, y: t.roof - 4 * step, kind: 3, delay: rd + 0.03, lvl: 0.9 });
      n++;
    }
  });

  // grains that leave lit windows once the city stands
  const lit = cells.filter((c) => c.kind === 0 && c.lvl > 0.3);
  const grains = Math.min(160, Math.round(lit.length * 0.25));

  const count = cells.length + grains + pour.length;
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
    sky[i * 3 + 2] = pose.z - d;
    win.set([c.x, c.y, 0, c.kind], i * 4);
    info.set([c.delay, 0, c.lvl, r4], i * 4);
    const k = fract(r4 * 2.39);
    color.set(STAR_COLORS[k > 0.92 ? 2 : k > 0.72 ? 1 : 0], i * 3);
  });
  for (let g = 0; g < grains; g++) {
    const i = cells.length + g;
    const c = lit[Math.floor(hash(g, 21) * lit.length)];
    sky.set([view.h * (0.08 + 0.3 * hash(g, 23)), (hash(g, 24) - 0.5) * 12, 0], i * 3);
    win.set([c.x, c.y, 0, 2], i * 4);
    info.set([CITY.emit[0] + (CITY.emit[1] - CITY.emit[0]) * hash(g, 22), 0, c.lvl, hash(g, 25)], i * 4);
    color.set(STAR_COLORS[hash(g, 26) > 0.7 ? 1 : 0], i * 3);
  }
  // the pour: each glyph cell leaves in reading order, scatters into a
  // cloud on the way and closes up again at its place in the sky
  const pw = Math.max(1, pourWidth);
  pour.forEach((p, k) => {
    const i = cells.length + grains + k;
    const ang = hash(k, 31) * Math.PI * 2, rad = 30 + 90 * hash(k, 32);
    sky.set([Math.cos(ang) * rad, Math.sin(ang) * rad * 0.6, 0], i * 3);
    win.set([p.x, p.y, 0, 4], i * 4);
    const delay = CITY.pour[0] + (CITY.pour[1] - CITY.pour[0] - CITY.pourDur) * clamp01(p.x / pw) + 0.03 * hash(k, 33);
    info.set([delay, 0, 1, hash(k, 34)], i * 4);
    color.set([p.r / 255, p.g / 255, p.b / 255], i * 3);
  });
  return { version, count, sky, win, info, color };
}

/** how far the poured links have left (out) and arrived (in), for the DOM */
export const pourDom = (f: number) => ({
  out: 1 - span(f, [CITY.pour[0], CITY.pour[0] + 0.08]),
  in: span(f, [CITY.pour[1] - 0.06, CITY.pour[1] + 0.02]),
});

// ── the bus between the Footer and the star field
type Listener = () => void;
let layout: CityLayout | null = null;
let stage: HTMLElement | null = null;
let pourFrom: HTMLElement | null = null;
let pourTo: HTMLElement | null = null;
let progressFn: (() => number) | null = null;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
const topLeft = (el: HTMLElement | null) => {
  if (!el) return [0, 0] as const;
  const r = el.getBoundingClientRect();
  return [r.left, r.top] as const;
};

export const cityBus = {
  layout: () => layout,
  setLayout(l: CityLayout | null) {
    layout = l;
    emit();
  },
  /** the element the towers are measured in, and the footer's progress */
  setStage(el: HTMLElement | null, progress: (() => number) | null) {
    stage = el;
    progressFn = progress;
    if (!el) layout = null;
    emit();
  },
  /** the links' box in Contact (from) and in the last screen's sky (to) */
  setPour(from: HTMLElement | null, to: HTMLElement | null) {
    pourFrom = from;
    pourTo = to;
  },
  progress: () => (progressFn ? progressFn() : 0),
  /** where the stage's top sits on screen now, css px */
  stageTop: () => (stage ? stage.getBoundingClientRect().top : 0),
  pourFrom: () => topLeft(pourFrom),
  pourTo: () => topLeft(pourTo),
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

// Je suis le spectre d'une rose que tu portais hier au bal.
