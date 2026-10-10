import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { galaxyBright, galaxyColor, galaxyKeep, galaxySize } from '@/lib/galaxy';

// ── Star title ──
// A section name as a giant word of sparse galaxy stars. The stars lie
// scattered as dust while the title is below the screen and travel to their
// letter cells as it scrolls in (title top at 100vh → 30vh, or the caller's
// `until`); near stars set off later and fly bigger. The word floats a little
// behind the page: it moves at 0.85 of the scroll speed, so the content slides
// over it. A pure function of scroll: reverse plays the same frames back, and
// nothing is drawn while the scroll is still.
//
// The <h2> keeps the text for screen readers and the outline; the canvas is
// decoration only. Callers use it in full mode; lite keeps its plain h2.

const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

const FONT = '"Geist Pixel", monospace';
const SPAN = 0.92; // share of the content width the word spans
const MAX_H = 0.38; // word height cap, share of the small viewport height
const ALPHA = 0.32; // global alpha: soft, so content over the lower part stays legible
const OVERLAP = 0.3; // share of the word height the following content rides over
const PARALLAX = 0.15; // the word lags the content by this share of the scroll
const BRIGHT = 0.5; // of galaxy's bright stars, the share kept here (4% → 2%)

export interface Star { x: number; y: number; rnd: number; depth: number }

const fract = (x: number) => x - Math.floor(x);
const hash = (i: number, j: number, k: number) => fract(Math.sin(i * 12.9898 + j * 78.233 + k * 37.719) * 43758.5453);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => x * x * (3 - 2 * x);
// arrival: quick start, long settle, so the word reads well before it is done
const land = (x: number) => 1 - (1 - x) * (1 - x) * (1 - x);

/** the small viewport height in css px (svh: ignores the collapsing mobile toolbar) */
const svh = () => (typeof document !== 'undefined' ? document.documentElement.clientHeight || window.innerHeight : 900);

/**
 * Samples `text` (uppercased, display font) as stars. The word is sized to
 * span `width` css px, its height capped at 38svh. Each grid cell (4 px, 6 px
 * light, finer for a small word) that the glyphs cover becomes one star at
 * the centroid of its ink, so thin strokes survive the coarse grid. Coordinates are in the word's own
 * box, 0..w × 0..h. `rnd` and `depth` are stable per cell.
 */
// eslint-disable-next-line react-refresh/only-export-components -- shared with the big-bang title
export function sampleStarTitle(text: string, width: number, opts?: { light?: boolean }): { w: number; h: number; stars: Star[] } {
  const light = opts?.light ?? LIGHT;
  const word = text.toUpperCase();
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx || width < 1) return { w: 0, h: 0, stars: [] };

  // tight ink box at 100 px, then scale to the width, capped by the height
  ctx.font = `100px ${FONT}`;
  const m = ctx.measureText(word);
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  if (inkW <= 0 || inkH <= 0) return { w: 0, h: 0, stars: [] };
  const size = Math.min((100 * width) / inkW, (100 * MAX_H * svh()) / inkH);
  const k = size / 100;
  const w = Math.ceil(inkW * k);
  const h = Math.ceil(inkH * k);
  // a small word (a long name on a phone) samples finer, so it keeps ~12 rows
  const step = Math.max(3, Math.min(light ? 6 : 4, Math.floor(h / 12)));

  cv.width = w;
  cv.height = h;
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(word, m.actualBoundingBoxLeft * k, m.actualBoundingBoxAscent * k);
  const px = ctx.getImageData(0, 0, w, h).data;

  const stars: Star[] = [];
  for (let gy = 0, j = 0; gy < h; gy += step, j++) {
    for (let gx = 0, i = 0; gx < w; gx += step, i++) {
      let sum = 0, sx = 0, sy = 0;
      const x1 = Math.min(gx + step, w), y1 = Math.min(gy + step, h);
      for (let y = gy; y < y1; y++) {
        for (let x = gx; x < x1; x++) {
          const a = px[(y * w + x) * 4 + 3];
          sum += a;
          sx += a * x;
          sy += a * y;
        }
      }
      if (sum < 255 * step * step * 0.22) continue; // barely inked: no star
      const rnd = hash(i, j, 1);
      // a little jitter so the grid reads as a sky, not a screen
      stars.push({
        x: sx / sum + 0.5 + (hash(i, j, 2) - 0.5) * step * 0.35,
        y: sy / sum + 0.5 + (hash(i, j, 3) - 0.5) * step * 0.35,
        rnd,
        depth: hash(i, j, 4),
      });
    }
  }
  return { w, h, stars };
}

// soft white halo for the bright few, drawn once
let haloSprite: HTMLCanvasElement | null = null;
function halo() {
  if (haloSprite) return haloSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,245,235,0.55)');
  grad.addColorStop(0.35, 'rgba(255,235,225,0.18)');
  grad.addColorStop(1, 'rgba(255,230,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return (haloSprite = c);
}

// one star, everything precomputed that does not depend on scroll
interface Flyer {
  tx: number; ty: number; // letter cell
  ox: number; oy: number; // scatter offset at progress 0
  delay: number; // share of the progress it waits before setting off
  size: number; depth: number;
  color: string; bright: boolean; keep: boolean;
}

interface StarTitleProps {
  text: string;
  as?: 'h2';
  caption?: ReactNode;
  className?: string;
  /** viewport share (from the top) where the title's top completes the word */
  until?: number;
}

export default function StarTitle({ text, as = 'h2', caption, className, until = 0.3 }: StarTitleProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const Tag = as;

  useLayoutEffect(() => {
    const box = boxRef.current, canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!box || !canvas || !ctx) return;

    // a few thousand squares, drawn only on scroll while the word forms
    const dpr = LIGHT ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    let flyers: Flyer[] = [];
    let boxW = 0, boxH = 0;
    let lastP = -1;
    let raf = 0;
    let dead = false;

    const sample = () => {
      const cw = box.clientWidth;
      if (cw === boxW && flyers.length) return;
      const { h, stars } = sampleStarTitle(text, cw * SPAN, { light: LIGHT });
      boxW = cw;
      boxH = h;
      box.style.height = `${h}px`;
      box.style.marginBottom = `${-Math.round(h * OVERLAP)}px`;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(h * dpr);
      const vw = window.innerWidth, vh = svh();
      flyers = stars.map((s) => {
        const reach = 0.3 + 0.7 * s.depth; // near stars come from further out
        const [r, g, b] = galaxyColor(s.rnd, 0.55 + 0.45 * s.depth); // formed letters sit at the bright end
        return {
          tx: s.x, ty: s.y,
          ox: (fract(s.rnd * 7.13) * 2 - 1) * 0.55 * vw * reach,
          oy: (fract(s.rnd * 4.77) * 2 - 1) * 0.35 * vh * reach,
          delay: 0.4 * s.depth + 0.1 * fract(s.rnd * 9.41),
          size: 1 + (galaxySize(s.rnd, s.depth) - 1) * 0.25, // 1..1.5 px: a fine grid wants fine stars
          depth: s.depth,
          color: `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`,
          bright: galaxyBright(s.rnd) === 1 && fract(s.rnd * 17.3) < BRIGHT,
          keep: galaxyKeep(s.rnd) === 1,
        };
      });
      lastP = -1;
    };

    const draw = (p: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, boxW, boxH);
      const sprite = halo();
      for (const f of flyers) {
        const e = land(clamp01((p - f.delay) / (1 - f.delay)));
        const x = f.tx + f.ox * (1 - e);
        const y = f.ty + f.oy * (1 - e);
        const s = f.size * (1 + 1.5 * f.depth * (1 - e)); // near ones fly bigger
        if (x < -s || y < -s || x > boxW + s || y > boxH + s) continue;
        // the full count only once in its letter; in flight the sparse share
        const a = ALPHA * (f.keep ? 1 : e);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        if (f.bright) {
          const hs = 9; // a soft halo, the same for every bright star
          ctx.drawImage(sprite, x - hs / 2, y - hs / 2, hs, hs);
        }
        ctx.fillStyle = f.color;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    // progress from the box's place on screen (the box itself never moves:
    // the parallax shifts the canvas); drawn only when it changed and the box
    // is on screen
    let lastY = NaN;
    const frame = () => {
      raf = 0;
      if (!flyers.length) return;
      const r = box.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -0.2 * vh || r.top > vh) return; // off screen: the next scroll in will draw
      // the word lags the page: offset grows with its distance from the centre
      const y = Math.round(-PARALLAX * (r.top + r.height / 2 - vh / 2) * 2) / 2;
      if (y !== lastY) {
        lastY = y;
        canvas.style.transform = `translate3d(0, ${y}px, 0)`;
      }
      const p = ease(clamp01((vh - r.top) / ((1 - until) * vh)));
      if (p === lastP) return;
      lastP = p;
      draw(p);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      sample();
      schedule();
    };

    const start = () => {
      if (dead) return;
      boxW = 0;
      sample();
      schedule();
    };
    if (document.fonts.check(`100px ${FONT}`)) start();
    document.fonts.load(`100px ${FONT}`).then(start, start);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
    };
  }, [text, until]);

  return (
    <>
      {/* z -1: under every in-flow block of the section, over its ground */}
      <div
        ref={boxRef}
        data-gate-skip
        className={`relative ${className ?? ''}`}
        style={{ zIndex: -1, height: 'min(38svh, 18vw)', marginBottom: 'calc(min(38svh, 18vw) * -0.3)' }}
      >
        <Tag className="sr-only">{text}</Tag>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
      </div>
      {caption}
    </>
  );
}

// ── Lite title ──
// The plain section header of lite mode. From md up the label starts at a
// quarter of the frame width, and a 1px rule runs from the frame's left edge
// to it, growing 0 → full as the header scrolls from 100vh to 60vh (a CSS var
// set by one passive scroll listener; a pure function of scroll). Phones get
// a small indent and no rule.
const MD = '(min-width: 1024px)';

export function LiteTitle({ text, caption, className, titleStyle }: { text: string; caption?: ReactNode; className?: string; titleStyle?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia(MD);
    let raf = 0;
    let last = -1;
    const frame = () => {
      raf = 0;
      if (!mq.matches) return;
      const vh = window.innerHeight;
      const p = Math.round(clamp01((vh - el.getBoundingClientRect().top) / (0.4 * vh)) * 400) / 400;
      if (p === last) return;
      last = p;
      el.style.setProperty('--title-rule', String(p));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div ref={ref} className={`relative pl-6 md:pl-[25%] ${className ?? ''}`}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 hidden h-px md:block"
          style={{
            right: 'calc(100% + 24px)',
            width: 'calc(100% / 3 - 24px)',
            background: 'hsl(var(--foreground) / 0.2)',
            transform: 'scaleX(var(--title-rule, 0))',
            transformOrigin: 'left',
          }}
        />
        <h2 className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 40, ...titleStyle }}>
          {text}
        </h2>
      </div>
      {caption}
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
