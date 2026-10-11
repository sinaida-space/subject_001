import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { galaxyBright, galaxyColor, galaxyKeep, galaxySize } from '@/lib/galaxy';
import { cityBus } from '@/lib/city';

// ── Star title ──
// A section name as a giant word of sparse galaxy stars, held in the middle
// of the screen while its section is on stage (#175). It never travels: as
// the section comes in, the word condenses out of the fog star by star (near
// stars first, a little soft and large, settling to their size), holds while
// the section passes under it, and thins back into the fog as the section
// leaves. Its opacity is where you are on the page. A pure function of
// scroll: reverse plays the same frames back, and nothing is drawn while the
// scroll is still.
//
// The <h2> keeps the text for screen readers and the outline; the canvas is
// decoration only. Callers use it in full mode; lite keeps its plain h2.

const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

const NARROW = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;

const FONT = '"Geist Pixel", monospace';
const SPAN = 0.92; // share of the content width the word spans
const MAX_H = 0.38; // word height cap, share of the small viewport height
const ALPHA = 0.32; // global alpha: soft, so content over the lower part stays legible
const OVERLAP = 0.3; // share of the word height the following content rides over
const PARALLAX = 0.7; // lite titles: the label lags the content by this share of the scroll
const BRIGHT = 0.5; // of galaxy's bright stars, the share kept here (4% → 2%)
const PAD = 6; // css px of canvas around the word, for the jitter and the halos

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
  delay: number; // share of the presence it waits before it condenses
  size: number; depth: number;
  color: string; bright: boolean; keep: boolean;
  // the pour (#179): when it leaves its fall, where it lands (0 the horizon,
  // 1 the bottom of the screen) and how far it drifts sideways
  fall: number; landY: number; drift: number;
}

interface StarTitleProps {
  text: string;
  as?: 'h2';
  caption?: ReactNode;
  className?: string;
  /** kept for callers; the word now follows its section's presence */
  until?: number;
  /** instead of thinning away as its section leaves, the word pours down
   * out of itself: its stars fall below the horizon and become the city's
   * lights (Contact into the footer, #179) */
  pour?: boolean;
}

/** how present a section is: 0 below the screen, 1 from when its top reaches
 * the middle until its bottom does, 0 again once it has gone above. With
 * `end` (px from the top of the screen) it leaves over `span` px of scroll and
 * is gone once its bottom has come up to `end` */
const presence = (top: number, bottom: number, vh: number, end = 0, span = 0.5 * vh) => {
  const inn = clamp01((vh - top) / (0.5 * vh));
  const out = clamp01((bottom - end) / span);
  return Math.min(inn, out);
};

// the pour: the scroll it takes, as a share of the screen's height, and how
// far down the screen the ground it lands on begins
const POUR_SPAN = 0.8;
const GROUND_TOP = 0.56;

export default function StarTitle({ text, as = 'h2', caption, className, pour = false }: StarTitleProps) {
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
    let boxW = 0, boxH = 0, wordW = 0;
    let below = 0; // pour: css px the canvas runs on under the word, to the bottom of the screen
    let cvTop = 0;
    let lastP = -1;
    let lastQ = -1;
    let raf = 0;
    let dead = false;

    // fixed in the middle of the screen, both ways (#179); the word plus a pad.
    // Phones keep every header on the frame's one left axis (#189).
    const place = () => {
      const cvW = wordW + 2 * PAD, cvH = boxH + 2 * PAD;
      cvTop = Math.round((svh() - cvH) / 2);
      const left = NARROW?.matches
        ? Math.round(box.getBoundingClientRect().left) - PAD
        : Math.round((document.documentElement.clientWidth - cvW) / 2);
      canvas.style.left = `${left}px`;
      canvas.style.top = `${cvTop}px`;
      if (!pour) return;
      // the stars fall to the bottom of the screen, so the canvas reaches it
      const next = Math.max(0, svh() - cvTop - cvH);
      if (next === below) return;
      below = next;
      canvas.height = Math.round((cvH + below) * dpr);
      canvas.style.height = `${cvH + below}px`;
      lastP = -1;
    };
    const sample = () => {
      const cw = box.clientWidth;
      if (cw === boxW && flyers.length) return place();
      const { w, h, stars } = sampleStarTitle(text, cw * SPAN, { light: LIGHT });
      boxW = cw;
      boxH = h;
      wordW = w;
      box.style.height = `${h}px`;
      box.style.marginBottom = `${-Math.round(h * OVERLAP)}px`;
      const cvW = w + 2 * PAD, cvH = h + 2 * PAD;
      canvas.width = Math.round(cvW * dpr);
      canvas.height = Math.round(cvH * dpr);
      canvas.style.width = `${cvW}px`;
      canvas.style.height = `${cvH}px`;
      below = 0;
      place();
      flyers = stars.map((s) => {
        const [r, g, b] = galaxyColor(s.rnd, 0.55 + 0.45 * s.depth); // formed letters sit at the bright end
        return {
          tx: s.x, ty: s.y,
          delay: 0.45 * (1 - s.depth) + 0.3 * fract(s.rnd * 9.41),
          size: 1 + (galaxySize(s.rnd, s.depth) - 1) * 0.25, // 1..1.5 px: a fine grid wants fine stars
          depth: s.depth,
          color: `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`,
          bright: galaxyBright(s.rnd) === 1 && fract(s.rnd * 17.3) < BRIGHT,
          keep: galaxyKeep(s.rnd) === 1,
          fall: 0.45 * fract(s.rnd * 5.17),
          landY: Math.pow(fract(s.rnd * 3.71), 1.6), // most land far, near the horizon
          drift: fract(s.rnd * 7.93) - 0.5,
        };
      });
      lastP = -1;
    };

    const draw = (p: number, q: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
      ctx.clearRect(-PAD, -PAD, wordW + 2 * PAD, boxH + 2 * PAD + below);
      const sprite = halo();
      // the screen's ground, in the word's own coordinates
      const vh = svh();
      const top = vh * GROUND_TOP - cvTop - PAD, depth = vh * (1 - GROUND_TOP);
      for (const f of flyers) {
        const e = land(clamp01((p - f.delay) / 0.25));
        // the pour: each star leaves on its own beat and falls, quicker and
        // quicker, to its place on the ground, where it goes out as a light
        // comes on
        const t = q > 0 ? clamp01((q - f.fall) / 0.55) : 0;
        const g = t * t;
        const x = f.tx + f.drift * wordW * 0.35 * g;
        const y = f.ty + (top + f.landY * depth - f.ty) * g;
        const s = f.size * (1 + 1.2 * (1 - e)) * (1 - 0.4 * t); // out of the fog: soft and large, then its size
        // the sparse share first, the full count once the word is whole
        // falling, a star brightens (light in motion) and goes out as it lands
        const a = Math.min(1, ALPHA + 0.55 * Math.sin(Math.PI * Math.min(t, 0.5))) * e * (f.keep ? 1 : clamp01(p * 2 - 1)) * (1 - ease(clamp01((t - 0.8) / 0.2)));
        if (a <= 0.01) continue;
        if (t > 0.05) {
          // a short trail above it, longer as it speeds up
          const len = 30 * t * (1 - t * 0.4);
          ctx.globalAlpha = a * 0.35;
          ctx.fillStyle = f.color;
          ctx.fillRect(x - 0.5, y - len, 1, len);
        }
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

    // presence of the section the title heads, read once per frame; drawn
    // only when it changed (quantised), cleared once at zero
    const section = (box.closest('section') as HTMLElement | null) ?? box.parentElement ?? box;
    const frame = () => {
      raf = 0;
      if (!flyers.length) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // pouring, the word does not thin as its section leaves: it falls
      const pr = pour ? presence(r.top, Infinity, vh) : presence(r.top, r.bottom, vh);
      // it pours once the section's end comes up past the bottom of the
      // screen, as what follows arrives
      const q = pour ? Math.round(clamp01((vh - r.bottom) / (POUR_SPAN * vh)) * 400) / 400 : 0;
      if (pour) cityBus.setPour(q);
      const p = Math.round(ease(pr) * 200) / 200;
      if (p === lastP && q === lastQ) return;
      lastP = p;
      lastQ = q;
      const on = p > 0 && q < 1;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      if (on) draw(p, q);
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
      if (pour) cityBus.setPour(0);
    };
  }, [text, pour]);

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
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed" style={{ visibility: 'hidden' }} />
      </div>
      {caption}
    </>
  );
}

// ── Lite title ──
// The plain section header of lite mode, on the frame's left axis like the
// body text (#175). From md up a 1px rule runs from the label to the frame's
// right edge, growing 0 → full as the header scrolls from 100vh to 60vh.
// The label is a slower layer while it comes in: it moves at 0.3 of the
// scroll speed until the header reaches its reading place (a quarter down the
// screen), then rides with its section, so it never slides into the text
// under it. Both are CSS vars set by one passive scroll listener, a pure
// function of scroll. Reduced motion: no lag, the rule is simply there. One
// component for every lite header (About, Body of Work, Services, Contact).
const MD = '(min-width: 1024px)';
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LiteTitle({ text, caption, className, titleStyle }: { text: string; caption?: ReactNode; className?: string; titleStyle?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || REDUCED) return;
    const mq = window.matchMedia(MD);
    let raf = 0;
    let last = -1;
    let lastY = NaN;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      if (top > 1.5 * vh || top < -vh) return;
      // the lag, capped so the label never climbs far into the section above
      const y = Math.round(-Math.min(PARALLAX * Math.max(0, top - 0.25 * vh), 0.22 * vh));
      if (y !== lastY) {
        lastY = y;
        el.style.setProperty('--title-lag', `${y}px`);
      }
      if (!mq.matches) return;
      const p = Math.round(clamp01((vh - top) / (0.4 * vh)) * 400) / 400;
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
    <div ref={ref} className={`relative ${className ?? ''}`} style={REDUCED ? ({ ['--title-rule' as string]: '1' } as CSSProperties) : undefined}>
      <div style={{ transform: 'translate3d(0, var(--title-lag, 0px), 0)' }}>
      <div className="flex items-center gap-6">
        <h2 className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 40, ...titleStyle }}>
          {text}
        </h2>
        <span
          aria-hidden="true"
          className="pointer-events-none hidden h-px flex-1 md:block"
          style={{
            background: 'hsl(var(--foreground) / 0.2)',
            transform: 'scaleX(var(--title-rule, 0))',
            transformOrigin: 'left',
          }}
        />
      </div>
      {caption}
      </div>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
