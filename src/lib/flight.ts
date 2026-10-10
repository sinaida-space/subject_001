// ── The home page's flight (#175) ──
// Scroll is the only input; the site answers by moving through space. The
// page from the top of the hero to the footer is one progress p, 0..1. The
// camera glides left, sinks and dives along one bending path (below), in
// surges, one per chapter of the page, with a slow drift between them,
// always forward, never back.
//
// The star field turns the pose into its camera; anything else that wants to
// share the flight reads the same function. A pure function of scroll:
// scrolling back flies the same path home.

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** chapters of the dive: hero → quote → About → Work → Services → Contact, roughly */
const SURGES = 5;
/** share of the dive taken in the surges; the rest is a steady drift */
const SURGE_SHARE = 0.6;

/** world units the camera travels over the flight: it glides left `x`, sinks
 * `y` and dives `z` from its home at z = `home` */
export const FLIGHT = { x: 6, y: 1.6, z: 9, home: 7 };

// the held footer (#179) takes over where it comes in: the flight ends as its
// top reaches the bottom of the screen
let cityFooter: HTMLElement | null = null;

/** the page's scroll progress, 0 at the top, 1 at the footer */
export function pageProgress(): number {
  if (typeof window === 'undefined') return 0;
  const vh = window.innerHeight;
  let max = document.documentElement.scrollHeight - vh;
  if (!cityFooter?.isConnected) cityFooter = document.querySelector<HTMLElement>('footer[data-city]');
  if (cityFooter) max = Math.min(max, cityFooter.getBoundingClientRect().top + window.scrollY - vh);
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}

// ── The bending path (#179) ──
// Space bends: the flight is one centripetal Catmull–Rom curve through a
// waypoint per chapter, slaloming left/right and up/down around the straight
// diagonal from home to the footer. The camera looks along the curve's bends
// and banks into them. The diagonal itself stays a crab glide (the camera
// faces ahead while it drifts left, so the stars still stream left to right);
// only the swing off it turns the head.
//
// Progress keeps the five surges: waypoint k is reached at p = k / SURGES, and
// within a chapter the camera moves at an even speed along the arc (a table
// built once). Still a pure function of scroll; scrolling back flies home.

type V3 = [number, number, number];

const HOME: V3 = [0, 0, FLIGHT.home];
const END: V3 = [-FLIGHT.x, -FLIGHT.y, FLIGHT.home - FLIGHT.z];
/** the swing off the diagonal at each waypoint, world units (x, y);
 * hero → quote → About → Work → Services → Contact */
const SWING: [number, number][] = [
  [0, 0],
  [0.9, 0.45],
  [-0.9, -0.4],
  [0.8, 0.5],
  [-0.6, -0.25],
  [0, 0],
];
/** the head turns this share of the way to the bend, then stops at the limits */
const LOOK = 0.55;
const MAX_YAW = 0.3; // radians
const MAX_PITCH = 0.12; // radians
/** chapters over which the head turns in at the top and back out at the end,
 * so the first screen and the footer's hand-off both face straight ahead */
const SETTLE = 0.6;
/** radians of bank per unit of turn rate (radians per chapter), and its cap */
const BANK = 0.35;
const MAX_BANK = 0.12;

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dist = (a: V3, b: V3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

const WAYPOINTS: V3[] = SWING.map(([sx, sy], k) => {
  const d = lerp3(HOME, END, k / (SWING.length - 1));
  return [d[0] + sx, d[1] + sy, d[2]];
});
const DRIFT: V3 = [(END[0] - HOME[0]) / SURGES, (END[1] - HOME[1]) / SURGES, (END[2] - HOME[2]) / SURGES];
// phantom ends along the diagonal, so the head is straight at both ends
const KNOTS: V3[] = [
  [HOME[0] - DRIFT[0], HOME[1] - DRIFT[1], HOME[2] - DRIFT[2]],
  ...WAYPOINTS,
  [END[0] + DRIFT[0], END[1] + DRIFT[1], END[2] + DRIFT[2]],
];

/** centripetal Catmull–Rom (Barry–Goldman) on the segment from p1 to p2 */
function catmullRom(p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 {
  const k = (a: V3, b: V3) => Math.sqrt(Math.max(dist(a, b), 1e-6));
  const t1 = k(p0, p1), t2 = t1 + k(p1, p2), t3 = t2 + k(p2, p3);
  const t = t1 + (t2 - t1) * u;
  const a1 = lerp3(p0, p1, t / t1);
  const a2 = lerp3(p1, p2, (t - t1) / (t2 - t1));
  const a3 = lerp3(p2, p3, (t - t2) / (t3 - t2));
  const b1 = lerp3(a1, a2, t / t2);
  const b2 = lerp3(a2, a3, (t - t1) / (t3 - t1));
  return lerp3(b1, b2, (t - t1) / (t2 - t1));
}

const STEPS = 96; // table entries per chapter
const ROWS = SURGES * STEPS + 1;
/** x, y, z, yaw, pitch, bank per row; row i is at chapter progress i / STEPS */
const TABLE = (() => {
  const fine = 512;
  const pos: V3[] = [];
  for (let s = 0; s < SURGES; s++) {
    // the segment sampled finely, then resampled at even arc length
    const pts: V3[] = [];
    const len = [0];
    for (let j = 0; j <= fine; j++) {
      pts.push(catmullRom(KNOTS[s], KNOTS[s + 1], KNOTS[s + 2], KNOTS[s + 3], j / fine));
      if (j) len.push(len[j - 1] + dist(pts[j - 1], pts[j]));
    }
    const total = len[fine];
    let j = 0;
    for (let i = 0; i < STEPS; i++) {
      const want = (total * i) / STEPS;
      while (j < fine - 1 && len[j + 1] < want) j++;
      const f = (want - len[j]) / Math.max(len[j + 1] - len[j], 1e-9);
      pos.push(lerp3(pts[j], pts[j + 1], clamp01(f)));
    }
  }
  pos.push(END);
  // the head: the tangent's turn away from the diagonal's
  const driftYaw = Math.atan2(-DRIFT[0], -DRIFT[2]);
  const driftPitch = Math.atan2(DRIFT[1], Math.hypot(DRIFT[0], DRIFT[2]));
  const yaw = new Float64Array(ROWS), pitch = new Float64Array(ROWS);
  for (let i = 0; i < ROWS; i++) {
    const a = pos[Math.max(0, i - 1)], b = pos[Math.min(ROWS - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const y = LOOK * (Math.atan2(-dx, -dz) - driftYaw);
    const p = LOOK * (Math.atan2(dy, Math.hypot(dx, dz)) - driftPitch);
    yaw[i] = MAX_YAW * Math.tanh(y / MAX_YAW);
    pitch[i] = MAX_PITCH * Math.tanh(p / MAX_PITCH);
  }
  const out = new Float64Array(ROWS * 6);
  for (let i = 0; i < ROWS; i++) {
    // bank into the turn: left turns (yaw rising) lower the left wing
    const a = Math.max(0, i - 2), b = Math.min(ROWS - 1, i + 2);
    const rate = ((yaw[b] - yaw[a]) / (b - a)) * STEPS;
    out.set([pos[i][0], pos[i][1], pos[i][2], yaw[i], pitch[i], MAX_BANK * Math.tanh((BANK * rate) / MAX_BANK)], i * 6);
  }
  return out;
})();

export interface FlightPose {
  x: number;
  y: number;
  z: number;
  /** radians: the head's turn left (+) and up (+), and the bank (+ = left wing down) */
  yaw: number;
  pitch: number;
  bank: number;
}

/** the camera's pose in the world at page progress p, on the bending path */
export function flightPose(p: number): FlightPose {
  const t = clamp01(p);
  const c = t * SURGES;
  const i = Math.min(SURGES - 1, Math.floor(c));
  // chapter progress: the surge at each seam, the drift between
  const u = i + (1 - SURGE_SHARE) * (c - i) + SURGE_SHARE * smoother(clamp01(c - i));
  const r = u * STEPS;
  const k = Math.min(ROWS - 2, Math.floor(r));
  const f = r - k;
  const at = (n: number) => TABLE[k * 6 + n] + (TABLE[(k + 1) * 6 + n] - TABLE[k * 6 + n]) * f;
  const head = smoother(clamp01(u / SETTLE)) * smoother(clamp01((SURGES - u) / SETTLE));
  return { x: at(0), y: at(1), z: at(2), yaw: head * at(3), pitch: head * at(4), bank: head * at(5) };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
