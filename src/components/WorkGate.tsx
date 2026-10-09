// ─────────────────────────────────────────────────────────────────────────
// Work gate (#121): About → Body of Work, a flight to a red star.
//
// A pure function of the scroll position: one progress p (0..1) over the
// band where the Work section rises into the screen, so scrolling back
// plays the same frames in reverse and nothing moves at rest.
//
//   ignite  a red star lights at a random spot (new spot every page load)
//           and beams like a constellation star: glow, ring, four spikes
//   push    the camera accelerates toward it through the star layers; the
//           streaks are the camera's own speed at this p, so they stretch
//           and snap with the curve, never with a clock
//   punch   the star fills the view in one flash, the flight stops dead
//   throw   the star becomes the projector: its light throws a lit hull
//           with four rails out to the Work section
//   land    Work lands at the end of the throw as a screen tilting flat,
//           developed top to bottom
//
// One 2D canvas (no extra WebGL context), drawn only on scroll frames
// while the gate is on screen. Full mode only: lite renders the children.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// eased 0..1 inside [a, b]
const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Phones get a lighter gate: fewer stars, no glow passes, 1x density.
const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
const STARS = LIGHT ? 220 : 600;

// The gate runs while the Work section's top travels from START to END
// (fractions of the viewport height, measured from the top of the screen).
const START = 1.15;
const END = 0.1;

// Beats, in p.
const PUSH_A = 0.14; // the camera starts to accelerate
const PUNCH = 0.53; // the star fills the view
const STOP = 0.82; // the flight has glided to rest
const THROW_A = 0.5;
const THROW_B = 0.8;
const LAND_A = 0.62;
const LAND_B = 0.9;

// Camera depth along the flight, in star-layer periods. Slow drift, a cubic
// acceleration into the punch, then a short ease-out glide: the speed curve
// is what makes it non-linear.
const camAt = (p: number) =>
  0.6 * p + 9 * Math.pow(lin(p, PUSH_A, PUNCH), 3) + 2.4 * easeOut(lin(p, PUNCH, STOP));

type Pt = [number, number];
// convex hull (monotone chain): the throw is the hull of lens and screen
const hull = (pts: Pt[]): Pt[] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Pt[]) => {
    const h: Pt[] = [];
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...half(p), ...half(p.reverse())];
};

// the constellation's own glow: a pre-baked radial sprite, drawn additively
function glowSprite(rgb: string) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.18, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.5, `rgba(${rgb},0.12)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export default function WorkGate({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const section = root?.querySelector<HTMLElement>('#work');
    const screen = section?.firstElementChild as HTMLElement | null;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !section || !screen || !ctx) return;

    const RED = '205,0,0';
    const glow = glowSprite(RED);
    const white = glowSprite('245,240,232');

    // where the star lights, fractions of the screen; new every page load
    const star = { x: 0.25 + Math.random() * 0.5, y: 0.22 + Math.random() * 0.26 };
    // the field: x, y spread around the star, z a phase in the layer period
    const field = Array.from({ length: STARS }, () => ({
      x: (Math.random() * 2 - 1) * 1.4,
      y: (Math.random() * 2 - 1) * 1.4,
      z: Math.random(),
      red: Math.random() < 0.16,
      s: 0.6 + Math.random() * 0.9,
    }));

    let dpr = 1;
    const resize = () => {
      dpr = LIGHT ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    // style writes go through a cache, so a frame only touches what changed
    const cache = new Map<string, string>();
    const put = (prop: 'opacity' | 'transform' | 'maskImage', v: string) => {
      if (cache.get(prop) === v) return;
      cache.set(prop, v);
      screen.style[prop] = v;
      if (prop === 'maskImage') screen.style.setProperty('-webkit-mask-image', v);
    };
    const clearDom = () => {
      put('opacity', '');
      put('transform', '');
      put('maskImage', '');
      screen.style.transformOrigin = '';
    };
    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      if (!on) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    let raf = 0;
    const frame = () => {
      raf = 0;
      const w = window.innerWidth, vh = window.innerHeight;
      const sec = section.getBoundingClientRect();
      const p = clamp01((START * vh - sec.top) / ((START - END) * vh));

      if (p <= 0 || p >= 1) {
        clearDom();
        // before the gate the screen waits dark; after it, it is simply the page
        if (p <= 0) put('opacity', '0');
        show(false);
        return;
      }

      // ── the Work screen lands: tilted back and dim, settling flat, developed top-down
      const land = seg(p, LAND_A, LAND_B);
      const dev = lin(p, LAND_A + 0.04, 1);
      screen.style.transformOrigin = '50% 0';
      put('opacity', land.toFixed(3));
      put('transform', land < 1 ? `perspective(1400px) translateZ(${mix(-160, 0, land).toFixed(1)}px) rotateX(${mix(16, 0, land).toFixed(2)}deg)` : '');
      // a soft edge sweeping down the section; 1-bit look comes from the field above it
      const edge = mix(-12, 112, dev);
      put('maskImage', dev < 1 ? `linear-gradient(to bottom, #000 ${edge.toFixed(1)}%, transparent ${(edge + 12).toFixed(1)}%)` : '');

      // ── canvas
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, vh);
      ctx.globalCompositeOperation = 'lighter';

      const sx = star.x * w, sy = star.y * vh;
      const cam = camAt(p);
      // the camera's speed at this p: streak length, a pure function of scroll
      const speed = Math.min(0.32, (cam - camAt(Math.max(0, p - 0.006))) * 1.6);
      const fieldA = seg(p, 0, 0.1) * (1 - seg(p, 0.74, 0.96));
      const F = 0.42 * Math.max(w, vh);

      if (fieldA > 0.001) {
        ctx.lineCap = 'round';
        for (const s of field) {
          // distance ahead of the camera, wrapping through the layer period
          const rel = ((s.z - cam) % 1 + 1) % 1;
          const d = 0.04 + rel;
          const x = sx + (s.x * F) / d, y = sy + (s.y * F) / d;
          if (x < -40 || x > w + 40 || y < -40 || y > vh + 40) continue;
          // fade in from far, so the wrap never pops
          const a = fieldA * (1 - seg(rel, 0.75, 1)) * mix(0.5, 1, 1 - rel);
          const tail = Math.min(1 - rel, speed);
          const d0 = d + tail;
          const x0 = sx + (s.x * F) / d0, y0 = sy + (s.y * F) / d0;
          const lw = Math.max(1, s.s * mix(0.8, 2.4, 1 - rel));
          ctx.strokeStyle = s.red ? `rgba(${RED},${a.toFixed(3)})` : `rgba(245,240,232,${(a * 0.85).toFixed(3)})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x + 0.01, y);
          ctx.stroke();
        }
      }

      // ── the red star: ignites, beams, swells as we close in, punches
      const ignite = seg(p, 0, 0.08);
      const near = Math.pow(lin(p, PUSH_A, PUNCH), 2.4);
      const gone = 1 - seg(p, PUNCH, THROW_B + 0.08);
      const r = mix(3, 26, near) * ignite;
      const flash = Math.exp(-Math.pow((p - PUNCH) / 0.035, 2));
      if (ignite > 0 && gone > 0) {
        const gs = r * 9 * (1 + flash * 3);
        ctx.globalAlpha = 0.9 * gone;
        ctx.drawImage(glow, sx - gs / 2, sy - gs / 2, gs, gs);
        // spikes: the constellation star's beam, turning slowly with p
        const len = r * mix(5, 14, near) * gone;
        const rot = p * 1.2;
        ctx.globalAlpha = 1;
        for (let i = 0; i < 4; i++) {
          const ang = rot + (i * Math.PI) / 2;
          const ex = Math.cos(ang) * len, ey = Math.sin(ang) * len;
          const grad = ctx.createLinearGradient(sx, sy, sx + ex, sy + ey);
          grad.addColorStop(0, `rgba(255,60,50,${(0.9 * gone).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${RED},0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(1, r * 0.12);
          ctx.beginPath();
          ctx.moveTo(sx - ex * 0.15, sy - ey * 0.15);
          ctx.lineTo(sx + ex, sy + ey);
          ctx.stroke();
        }
        // core and ring, as on the map
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(245,240,232,${(0.95 * gone).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, r * 0.32), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${RED},${(0.85 * gone).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, r * 0.32) + 1.5 + r * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
      }
      // the punch: the star fills the view for a moment
      if (flash > 0.01) {
        const R = Math.hypot(w, vh) * mix(0.15, 0.9, flash);
        ctx.globalAlpha = 0.75 * flash;
        ctx.drawImage(glow, sx - R, sy - R, R * 2, R * 2);
        ctx.globalAlpha = 0.35 * flash;
        const R2 = R * 0.35;
        ctx.drawImage(white, sx - R2, sy - R2, R2 * 2, R2 * 2);
        ctx.globalAlpha = 1;
      }

      // ── the throw: the star is the lens, the Work section is the screen
      const throwT = easeOut(lin(p, THROW_A, THROW_B));
      const beamA = seg(p, THROW_A, THROW_A + 0.06) * (1 - seg(p, 0.86, 0.98));
      if (beamA > 0.001) {
        const top = sec.top + screen.offsetTop;
        const c = {
          l: sec.left + screen.offsetLeft,
          r: sec.left + screen.offsetLeft + screen.offsetWidth,
          t: top,
          b: Math.min(vh + 20, top + screen.offsetHeight),
        };
        const ls = 10;
        const lens: Pt[] = [[sx - ls, sy - ls], [sx + ls, sy - ls], [sx + ls, sy + ls], [sx - ls, sy + ls]];
        const fl = mix(sx - ls, c.l, throwT), fr = mix(sx + ls, c.r, throwT);
        const ft = mix(sy - ls, c.t, throwT), fb = mix(sy + ls, c.b, throwT);
        const far: Pt[] = [[fl, ft], [fr, ft], [fr, fb], [fl, fb]];
        const h = hull([...lens, ...far]);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${RED},${(0.14 * beamA).toFixed(3)})`;
        ctx.beginPath();
        h.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
        const rails = () => {
          ctx.beginPath();
          lens.forEach(([x, y], i) => {
            ctx.moveTo(x, y);
            ctx.lineTo(far[i][0], far[i][1]);
          });
          ctx.rect(fl, ft, fr - fl, fb - ft);
        };
        ctx.globalCompositeOperation = 'lighter';
        if (!LIGHT) {
          // a wide faint pass under the rails stands in for bloom
          ctx.strokeStyle = `rgba(${RED},${(0.18 * beamA).toFixed(3)})`;
          ctx.lineWidth = 6;
          rails();
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,40,34,${(0.85 * beamA).toFixed(3)})`;
        ctx.lineWidth = 1;
        rails();
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      show(true);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      resize();
      cache.clear();
      schedule();
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      clearDom();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ width: '100vw', height: '100vh', visibility: 'hidden' }}
      />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
