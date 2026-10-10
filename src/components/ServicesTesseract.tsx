// ── Services, full mode: a pinned tesseract you fall into ──
// A tall track pins a 100svh stage. On the stage, one canvas 2D draws the
// tesseract as streams of galaxy dust along its 32 edges, and four service
// screens (plain DOM) sit on top. Scroll is the only clock:
//
//   entry .7 │ rest .6 │ turn .55 │ rest │ turn │ rest │ turn │ rest │ exit .7
//
// Entry: scattered dust gathers into a small tesseract, then a ZW half-turn
// carries the inner cube toward the camera until it frames the stage.
// Turns: a 90° XW step brings the next cell to the front (outer) position;
// the cells come round in the order w-, x+, w+, x-, one per service.
// Rests: the front cell rests on the stage border, faint; the screen inside
// is fully opaque and static. Exit: the front cell grows past the viewer and
// its dust streams outward and thins into the starfield.
//
// Every frame is a pure function of scroll position: reverse scroll plays the
// same frames backwards, and nothing draws without a scroll or resize.

import { Children, useEffect, useRef, type ReactNode } from 'react';
import { EDGES, FRAME_EXTENT, VERTICES, project, type Projected } from '@/lib/tesseract4d';
import { GALAXY, galaxyBright, galaxyColor, galaxyKeep, galaxySize } from '@/lib/galaxy';

const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
const PER_EDGE = LIGHT ? 20 : 48; // dust points per edge

// ── timeline, in stage heights of scroll ──
const ENTRY = 0.7;
const REST = 0.6;
const TURN = 0.55;
const EXIT = 0.7;
const CELLS = 4;
const restStart = (k: number) => ENTRY + k * (REST + TURN);
const restMid = (k: number) => restStart(k) + REST / 2;
const EXIT_START = restStart(CELLS - 1) + REST;
const TOTAL = EXIT_START + EXIT; // 5.45

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const fract = (x: number) => x - Math.floor(x);

const START_ZOOM = 0.26; // the gathered tesseract, as a share of the short half-side
const INSET = 0.985; // the resting front cell sits just inside the stage border
const SCREEN_PASS = 0.06; // how far an outgoing screen scales toward the viewer

interface Scene {
  xw: number; // XW angle
  zw: number; // ZW angle
  zoom: number;
  aspect: number; // 0 = square tesseract, 1 = front cell stretched to the stage
  energy: number; // 0 at rest, 1 mid-turn: dust brightness and spread
  gather: number; // 0 scattered stars, 1 every point on its edge
  formed: number; // share of non-kept points still lit
  exit: number; // 0..1 through the exit dive
  opacity: number[];
  scale: number[];
}

/** everything on the stage as a function of u (stage heights scrolled into the track) */
function sceneAt(u: number): Scene {
  const s: Scene = {
    xw: 0,
    zw: Math.PI,
    zoom: 1,
    aspect: 1,
    energy: 0,
    gather: 1,
    formed: 1,
    exit: 0,
    opacity: [0, 0, 0, 0],
    scale: [1, 1, 1, 1],
  };

  if (u < ENTRY) {
    const e = u / ENTRY;
    const dive = smooth(0.35, 1, e);
    s.gather = clamp01(e / 0.45);
    s.formed = smooth(0, 0.45, e);
    s.zw = Math.PI * dive; // the inner cube comes at you and becomes the front cell
    s.zoom = START_ZOOM * Math.pow(0.99 / START_ZOOM, dive); // a fall: slow, then fast
    s.aspect = dive;
    s.energy = smooth(0.2, 0.6, e) * (1 - smooth(0.75, 1, e));
    s.opacity[0] = smooth(0.85, 1, e);
    return s;
  }

  if (u >= EXIT_START) {
    const x = clamp01((u - EXIT_START) / EXIT);
    s.xw = -(CELLS - 1) * (Math.PI / 2);
    s.exit = x;
    s.zoom = 1.01 * (1 + 1.2 * x * x);
    s.formed = 1 - smooth(0.1, 0.8, x);
    s.energy = smooth(0, 0.3, x) * (1 - smooth(0.55, 1, x));
    const q = smooth(0, 0.35, x);
    s.opacity[CELLS - 1] = 1 - q;
    s.scale[CELLS - 1] = 1 + SCREEN_PASS * q;
    return s;
  }

  const v = u - ENTRY;
  const k = Math.min(CELLS - 1, Math.floor(v / (REST + TURN)));
  const r = v - k * (REST + TURN);
  if (r < REST || k === CELLS - 1) {
    // rest: the screen is solid, the tesseract quiet, a slow drift keeps it alive
    const rl = clamp01(r / REST);
    s.xw = -k * (Math.PI / 2);
    s.zoom = 0.99 + 0.02 * rl;
    s.opacity[k] = 1;
    return s;
  }
  // turn k → k+1
  const t = (r - REST) / TURN;
  s.xw = -(k + smooth(0, 1, t)) * (Math.PI / 2);
  s.zoom = 1.01 - 0.02 * t - 0.1 * Math.sin(Math.PI * t);
  s.energy = Math.sin(Math.PI * t);
  const q = smooth(0, 0.45, t);
  s.opacity[k] = 1 - q; // the outgoing screen passes you
  s.scale[k] = 1 + SCREEN_PASS * q;
  s.opacity[k + 1] = smooth(0.78, 1, t); // the incoming one waits for its cell to fill the frame
  return s;
}

// ── dust: fixed per point, so a point keeps its look on every frame ──
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Dust {
  count: number;
  edge: Uint8Array;
  s0: Float32Array; // position along the edge
  flow: Float32Array; // signed stream speed along the edge, per stage height
  rnd: Float32Array; // the galaxy random
  jitter: Float32Array; // -0.5..0.5 across the edge
  delay: Float32Array; // gather delay
  burst: Float32Array; // exit stream speed
  sx: Float32Array; // scattered position, 0..1 of the stage
  sy: Float32Array;
  keep: Uint8Array;
  bright: Uint8Array;
  groups: { color: string; idx: Uint16Array }[];
}

function makeDust(): Dust {
  const rand = mulberry32(162);
  const count = EDGES.length * PER_EDGE;
  const d: Dust = {
    count,
    edge: new Uint8Array(count),
    s0: new Float32Array(count),
    flow: new Float32Array(count),
    rnd: new Float32Array(count),
    jitter: new Float32Array(count),
    delay: new Float32Array(count),
    burst: new Float32Array(count),
    sx: new Float32Array(count),
    sy: new Float32Array(count),
    keep: new Uint8Array(count),
    bright: new Uint8Array(count),
    groups: [],
  };
  const byColor = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const e = Math.floor(i / PER_EDGE);
    d.edge[i] = e;
    d.s0[i] = rand();
    d.flow[i] = (e % 2 ? 1 : -1) * (0.15 + 0.25 * rand());
    d.rnd[i] = rand();
    d.jitter[i] = rand() - 0.5;
    d.delay[i] = rand() * 0.45;
    d.burst[i] = 1 + 3.5 * rand();
    d.sx[i] = rand();
    d.sy[i] = rand();
    d.keep[i] = galaxyKeep(d.rnd[i]);
    d.bright[i] = galaxyBright(d.rnd[i]);
    // full-brightness colour (depth 1); depth dimming goes into the alpha instead
    const [r, g, b] = galaxyColor(d.rnd[i], 1).map((c) => Math.round(255 * c));
    const key = `rgb(${r},${g},${b})`;
    if (!byColor.has(key)) byColor.set(key, []);
    byColor.get(key)!.push(i);
  }
  d.groups = [...byColor].map(([color, idx]) => ({ color, idx: Uint16Array.from(idx) }));
  return d;
}

/** galaxyColor's depth dimming, applied as alpha ('lighter' makes it the same thing) */
const depthDim = (depth: number) => GALAXY.dimMin + (1 - GALAXY.dimMin) * depth * depth;

function makeHalo(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,240,228,0.9)');
  grad.addColorStop(0.25, 'rgba(255,225,210,0.28)');
  grad.addColorStop(1, 'rgba(255,220,200,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

export default function ServicesTesseract({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!track || !stage || !canvas || !ctx) return;

    const dust = makeDust();
    const halo = makeHalo();
    const verts: Projected[] = VERTICES.map(() => ({ x: 0, y: 0, depth: 0 }));

    let dpr = 1;
    let W = 0;
    let H = 0;
    const resize = () => {
      dpr = LIGHT ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.round(stage.clientWidth * dpr);
      H = Math.round(stage.clientHeight * dpr);
      canvas.width = W;
      canvas.height = H;
    };

    // DOM writes only on change, so a scroll frame touches just what moved
    const written = new WeakMap<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement | null, key: 'opacity' | 'transform' | 'pointerEvents', v: string) => {
      if (!el) return;
      const w = written.get(el) ?? {};
      if (w[key] === v) return;
      w[key] = v;
      written.set(el, w);
      el.style[key] = v;
    };

    let drawn = false;
    let raf = 0;

    const frame = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) {
        if (drawn) ctx.clearRect(0, 0, W, H);
        drawn = false;
        return;
      }
      const dist = rect.height - stage.clientHeight;
      const u = clamp01(-rect.top / dist) * TOTAL;
      const s = sceneAt(u);

      // ── screens ──
      for (let k = 0; k < CELLS; k++) {
        put(screenRefs.current[k], 'opacity', s.opacity[k].toFixed(3));
        put(screenRefs.current[k], 'pointerEvents', s.opacity[k] > 0.5 ? 'auto' : 'none');
        put(innerRefs.current[k], 'transform', s.scale[k] === 1 ? '' : `scale(${s.scale[k].toFixed(4)})`);
      }

      // ── tesseract ──
      const cx = W / 2;
      const cy = H / 2;
      const short = Math.min(cx, cy);
      const kx = (s.zoom * (short + (cx * INSET - short) * s.aspect)) / FRAME_EXTENT;
      const ky = (s.zoom * (short + (cy * INSET - short) * s.aspect)) / FRAME_EXTENT;
      for (let i = 0; i < VERTICES.length; i++) {
        const p = project(VERTICES[i], s.xw, s.zw, verts[i]);
        p.x = cx + p.x * kx;
        p.y = cy - p.y * ky;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // faint lines with a glow, only once the dust has found its edges
      const lineA =
        (0.018 + 0.07 * s.energy) * s.formed * smooth(0.6, 1, s.gather) * (1 - smooth(0, 0.7, s.exit));
      const burstLine = 1 + s.exit * s.exit * 1.5;
      if (lineA > 0.002) {
        ctx.beginPath();
        for (const [a, b] of EDGES) {
          const A = verts[a];
          const B = verts[b];
          ctx.moveTo(cx + (A.x - cx) * burstLine, cy + (A.y - cy) * burstLine);
          ctx.lineTo(cx + (B.x - cx) * burstLine, cy + (B.y - cy) * burstLine);
        }
        ctx.strokeStyle = 'rgb(255,232,218)';
        ctx.globalAlpha = lineA * 0.35;
        ctx.lineWidth = 3 * dpr;
        ctx.stroke();
        ctx.globalAlpha = lineA;
        ctx.lineWidth = dpr;
        ctx.stroke();
      }

      // dust streams
      const spread = (1.5 + 9 * s.energy) * dpr;
      const aEdge = 0.22 + 0.6 * s.energy;
      const x2 = s.exit * s.exit;
      for (const group of dust.groups) {
        ctx.fillStyle = group.color;
        for (let n = 0; n < group.idx.length; n++) {
          const i = group.idx[n];
          const lit = dust.keep[i] ? 1 : s.formed;
          if (lit <= 0.003) continue;
          const [ia, ib] = EDGES[dust.edge[i]];
          const A = verts[ia];
          const B = verts[ib];
          const t = fract(dust.s0[i] + dust.flow[i] * u);
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const len = Math.hypot(dx, dy) || 1;
          let x = A.x + dx * t - (dy / len) * dust.jitter[i] * spread;
          let y = A.y + dy * t + (dx / len) * dust.jitter[i] * spread;
          const depth = A.depth + (B.depth - A.depth) * t;
          if (s.exit > 0) {
            const f = 1 + x2 * dust.burst[i];
            x = cx + (x - cx) * f;
            y = cy + (y - cy) * f;
          }
          const g = smooth(dust.delay[i], dust.delay[i] + 0.55, s.gather);
          if (g < 1) {
            x = dust.sx[i] * W + (x - dust.sx[i] * W) * g;
            y = dust.sy[i] * H + (y - dust.sy[i] * H) * g;
          }
          if (x < -8 || y < -8 || x > W + 8 || y > H + 8) continue;
          const a = lit * depthDim(depth) * (0.55 + (aEdge - 0.55) * g);
          const size = galaxySize(dust.rnd[i], depth) * dpr;
          ctx.globalAlpha = Math.min(1, dust.bright[i] ? a * 1.8 : a);
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
          if (dust.bright[i]) {
            const h = 12 * dpr;
            ctx.globalAlpha = Math.min(1, a);
            ctx.drawImage(halo, x - h / 2, y - h / 2, h, h);
          }
        }
      }
      ctx.globalAlpha = 1;
      drawn = true;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      resize();
      schedule();
    };

    resize();
    frame();
    const ro = new ResizeObserver(onResize);
    ro.observe(stage);
    window.addEventListener('scroll', schedule, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', schedule);
    };
  }, []);

  // Keyboard: a link inside a screen that is not at rest takes you to that
  // screen's rest midpoint, so the focused copy is always readable.
  const onScreenFocus = (k: number) => {
    const go = () => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      const rect = track.getBoundingClientRect();
      const dist = rect.height - stage.clientHeight;
      const u = clamp01(-rect.top / dist) * TOTAL;
      const a = restStart(k);
      if (u >= a && u <= a + REST) return;
      window.scrollTo({ top: window.scrollY + rect.top + (restMid(k) / TOTAL) * dist, behavior: 'auto' });
    };
    go();
    // the browser may still scroll the focused link into view after this event
    requestAnimationFrame(go);
  };

  return (
    <div
      ref={trackRef}
      data-services-track
      className="relative mt-[7vh]"
      style={{ height: `${Math.round((1 + TOTAL) * 100)}svh` }}
    >
      <div ref={stageRef} className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        {Children.map(children, (child, k) => (
          <div
            ref={(el) => {
              screenRefs.current[k] = el;
            }}
            onFocus={() => onScreenFocus(k)}
            className="absolute inset-0 flex items-center pt-[72px] pb-4 md:pt-[88px] md:pb-10"
            style={{ opacity: 0, pointerEvents: 'none' }}
          >
            <div className="site-frame">
              <div
                ref={(el) => {
                  innerRefs.current[k] = el;
                }}
              >
                {child}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
