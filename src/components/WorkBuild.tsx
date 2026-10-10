// ─────────────────────────────────────────────────────────────────────────
// Work build (#121, #166): About → Body of Work.
//
//   bang   as About leaves, all of it (the ABOUT stars, the headline, the
//          table, the portrait's pixels, the credit) hands over to cells
//          that open straight out from the middle of the screen in one
//          breath, under a soft light, near cells further and bigger. The
//          cloud rides up with the page; the lit cells within reach run
//          straight to their places on the BODY OF WORK title and the globe
//          as these come up underneath, never faster than the page rises,
//          so nothing turns back. A still canvas then holds the title
//   map    then the map builds itself (drawn by ConstellationFull from
//          workBuildBus): sound, space, code, body, one impulse handed on
//          star to star, then the skill names, then the works, a turn of
//          the sphere and two heartbeats
//   formed once whole, a sweep of light crosses the map and the map turns a
//          few degrees across the rest of Work (workBuildBus.after)
//
// The bang is a pure function of scroll both ways: scrolling back puts
// About together again. The map, once finished, holds built while you
// scroll around Work; it rewinds only when About's bottom is back low on
// the screen (RESET_AT), out of sight of the map.
//
// Desktop gives the map its own scroll room (the graph holds still while
// it builds); on phones the long map builds as it scrolls through.
// Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';
import { sampleText, type Cell } from '@/lib/sampleText';
import { workBuildBus } from '@/lib/workBuildBus';
import { galaxyBright, galaxyColor, galaxyKeep, galaxySize } from '@/lib/galaxy';
import { sampleStarTitle } from '@/components/StarTitle';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (x: number) => x * x * (3 - 2 * x);

const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
const CAP = LIGHT ? 3000 : 9000; // About cells sampled; ~36 % stay lit as stars
const DPR_CAP = LIGHT ? 1 : 1.5;

// The bang, by where About's bottom edge is on the screen (screen heights)
const HAND_A = 0.78; // cells appear under the type …
const HAND_B = 0.74; // … and the DOM has faded out by here
const BANG = 0.76; // the cloud starts to open out from the middle of the screen …
const SPREAD = 0.45; // … over this much scroll, fast at first, slowing
const FLASH_A = 0.775; // a soft light where it opens
const FLASH_B = 0.69;
const LOOK = 0.73; // under the light About's look turns into the galaxy's
const LOST_A = 0.75; // the unlit share goes out under the light
const LOST_B = 0.715;
// A cell's pace toward its place never exceeds this share of the scroll, so
// every cell keeps rising on the screen with the page: the title and the
// globe come up underneath and catch it. One breath, no way back.
const UP = 0.95;
// The pull ends when the BODY OF WORK title's top reaches POUR_B; it takes
// at least FORM_MIN screen heights of scroll.
const POUR_B = 0.36;
const FORM_MIN = 0.2;
// Once About's bottom edge drops back below this, About is coming apart:
// the map lets go of its latch and rewinds with the scroll.
const RESET_AT = 0.95;
const REST_ALPHA = 0.9; // the formed BODY OF WORK stars
const SPAN = 0.92; // the title's share of its block width, as every star title
const SWEEP = 0.15; // screen heights of scroll the formed map's sweep of light takes
const AQ = 16; // alpha steps the cells are drawn in (one fill per colour and step)

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const css = (r: number, g: number, b: number) => `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`;

// soft halo for the bright few, drawn once
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

// the soft light where the cloud opens, drawn once and scaled
let flashSprite: HTMLCanvasElement | null = null;
function flashLight() {
  if (flashSprite) return flashSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,250,242,0.8)');
  grad.addColorStop(0.2, 'rgba(255,232,218,0.32)');
  grad.addColorStop(0.55, 'rgba(255,80,60,0.1)');
  grad.addColorStop(1, 'rgba(205,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return (flashSprite = c);
}

// one About cell: where it rests, how it looks formed and as a star, where it goes
interface Grain {
  anchor: 0 | 1; // 0 the About section, 1 the portrait column's sticky wrapper
  rx: number; ry: number; // offset from its anchor's box, client px
  form: number; formA: number; formS: number; // its look while About is whole (palette index)
  star: number; starA: number; starS: number; // its look as a star (palette index)
  depth: number; keep: boolean; bright: boolean;
  k: number; // dust: how far it opens out from the cloud's centre, share of its distance
  ax: number; ay: number; // dust: its own scatter on top, px at full spread
  tgt: number; // -2 dust, -1 the globe, else its BODY OF WORK star
  lx: number; ly: number; // its landing on the globe, offset from the centre in radii
  p: number; // the pull's ease-out power: near cells set off faster
}

interface TitleStars { w: number; h: number; stars: { x: number; y: number; rnd: number; depth: number }[] }

export default function WorkBuild({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const about = document.getElementById('about');
    const heading = root?.querySelector<HTMLElement>('[data-work-heading]');
    if (!root || !canvas || !ctx || !about || !heading) return;
    const title = heading.querySelector<HTMLElement>('h2');
    if (!title) return;

    workBuildBus.set(0);
    workBuildBus.setPour(0, null);
    workBuildBus.setAfter(0, 0);

    // the full map is taller than the lite one it replaces: hold its height
    // from the start so #work does not grow under the reader (desktop; phones
    // reserve theirs in Constellation)
    const trackEl = root.querySelector<HTMLElement>('[data-build-track]');
    const narrow = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
    if (trackEl && !narrow) trackEl.style.minHeight = 'clamp(600px, calc(100vh - 88px), 1300px)';

    // the h2 stays for screen readers and the outline, its type invisible;
    // the stars show where it is
    title.style.color = 'transparent';
    title.style.animation = 'none';
    const headingPos = heading.style.position;
    if (getComputedStyle(heading).position === 'static') heading.style.position = 'relative';
    const rest = document.createElement('canvas');
    rest.setAttribute('aria-hidden', 'true');
    rest.style.cssText = 'position:absolute;pointer-events:none;visibility:hidden';
    heading.appendChild(rest);
    const restCtx = rest.getContext('2d');

    // a stable screen: the phone toolbar coming and going does not rebuild anything
    let dpr = 1;
    let VW = 0, VH = 0;
    const resize = () => {
      VW = window.innerWidth;
      VH = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.round(VW * dpr);
      canvas.height = Math.round(VH * dpr);
      canvas.style.height = `${VH}px`;
    };
    resize();

    const photoCol = about.querySelector<HTMLElement>('[data-photo-col]');
    const wrap = (photoCol?.firstElementChild as HTMLElement | null) ?? null;
    const frameEl = about.querySelector<HTMLElement>('.photo-frame-wrapper');
    const img = about.querySelector<HTMLImageElement>('picture img');

    // colours, quantised so the cells draw in one fill per colour and alpha step
    let palette: string[] = [];
    let palIdx = new Map<number, number>();
    const pal = (r: number, g: number, b: number, steps = 15) => {
      const q = (v: number) => Math.round((Math.round(clamp01(v) * steps) * 255) / steps);
      const key = (q(r) << 16) | (q(g) << 8) | q(b);
      let i = palIdx.get(key);
      if (i === undefined) {
        i = palette.length;
        palette.push(`rgb(${q(r)},${q(g)},${q(b)})`);
        palIdx.set(key, i);
      }
      return i;
    };

    // ── the BODY OF WORK stars: sized to the heading block, as every star title
    let titleStars: TitleStars | null = null;
    const star = (c: CanvasRenderingContext2D, x: number, y: number, s: number, bright: boolean) => {
      if (bright) {
        const hs = s * 7;
        c.drawImage(halo(), x - hs / 2, y - hs / 2, hs, hs);
      }
      c.fillRect(x - s / 2, y - s / 2, s, s);
    };
    const titleLook = (rnd: number, depth: number) => {
      const [r, g, b] = galaxyColor(rnd, 0.55 + 0.45 * depth);
      return { r, g, b, col: css(r, g, b), size: Math.max(LIGHT ? 1.6 : 1.4, galaxySize(rnd, depth)), bright: galaxyBright(rnd) === 1 };
    };
    const placeTitle = () => {
      const t = sampleStarTitle(title.textContent ?? '', heading.clientWidth * SPAN, { light: LIGHT });
      if (!t.stars.length) return null;
      rest.style.width = `${t.w}px`;
      rest.style.height = `${t.h}px`;
      rest.style.left = `${title.offsetLeft}px`;
      rest.style.top = `${Math.round(title.offsetTop + (title.offsetHeight - t.h) / 2)}px`;
      rest.width = Math.round(t.w * dpr);
      rest.height = Math.round(t.h * dpr);
      if (restCtx) {
        restCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        restCtx.clearRect(0, 0, t.w, t.h);
        restCtx.globalAlpha = REST_ALPHA;
        for (const s of t.stars) {
          const l = titleLook(s.rnd, s.depth);
          restCtx.fillStyle = l.col;
          star(restCtx, s.x, s.y, l.size, l.bright);
        }
        restCtx.globalAlpha = 1;
      }
      return t;
    };

    // where the globe is: ConstellationFull's own placement, in client px
    const globeAt = () => {
      const map = root.querySelector<HTMLElement>('[data-build-track] canvas');
      const vh = VH;
      if (!map) return { gx: VW / 2, gy: vh * 1.2, R: Math.min(VW, vh) * 0.36 };
      const r = map.getBoundingClientRect();
      const R = Math.min(r.width, vh, r.height) * 0.36;
      return { gx: r.left + r.width / 2, gy: r.top + Math.max(R + 20, Math.min(vh / 2 - r.top, r.height - R - 20)), R };
    };

    // ── the About cells: sampled once About is about to leave
    let grains: Grain[] | null = null;
    // title stars no cell reached: they condense in place as the pull closes
    let condense: { i: number; col: number; size: number; bright: boolean }[] = [];
    // per-frame scratch, sized at sampling
    let bx = new Float32Array(0), by = bx, bs = bx;
    let bk = new Int32Array(0), order = bk, counts = bk, starts = bk;
    let prevY = new Float32Array(0);
    // the portrait's wrapper is sticky; from BANG on its cells ride with the
    // page like the rest: where the wrapper sits, relative to About, at BANG
    let wOffBang = 0;
    const wrapTopAt = (s: number, ab: DOMRect, wb: DOMRect) => (s > BANG ? wb.top : ab.top + wOffBang);
    const sample = (): Grain[] | null => {
      titleStars = titleStars ?? placeTitle();
      if (!titleStars) return null;
      palette = [];
      palIdx = new Map();
      const rand = rng(166);
      const vw = VW, vh = VH;
      const ab = about.getBoundingClientRect();
      const wb = wrap?.getBoundingClientRect();
      const sy = window.scrollY;
      if (wrap && wb && photoCol) {
        const cs = getComputedStyle(wrap);
        const top = parseFloat(cs.top);
        const cb = photoCol.getBoundingClientRect();
        wOffBang = cs.position === 'sticky' && Number.isFinite(top)
          ? Math.min(Math.max(top - (BANG * vh - ab.height), cb.top - ab.top), cb.bottom - ab.top - wb.height)
          : wb.top - ab.top;
      }
      type Raw = { anchor: 0 | 1; x: number; y: number; r: number; g: number; b: number; a: number; s: number; rnd: number; depth: number };
      const stars: Raw[] = [];
      const others: Raw[] = [];

      // the ABOUT title: its own stars, as StarTitle draws them formed
      const tbox = about.querySelector<HTMLElement>('[data-gate-skip]');
      if (tbox) {
        const tb = tbox.getBoundingClientRect();
        const t = sampleStarTitle('About', tbox.clientWidth * SPAN, { light: LIGHT });
        for (const s of t.stars) {
          const [r, g, b] = galaxyColor(s.rnd, 0.55 + 0.45 * s.depth);
          stars.push({ anchor: 0, x: tb.left - ab.left + s.x, y: tb.top - ab.top + s.y, r, g, b, a: 0.55, s: galaxySize(s.rnd, s.depth) * (LIGHT ? 1.5 : 1), rnd: s.rnd, depth: s.depth });
        }
      }
      const text = (cells: Cell[], anchor: 0 | 1, box: DOMRect, a: number) => {
        for (const c of cells) others.push({ anchor, x: c.x - box.left, y: c.y - sy - box.top, r: c.r, g: c.g, b: c.b, a, s: 2.4, rnd: rand(), depth: rand() });
      };
      // the headline, the caption and the table
      text(sampleText(about, (el) => !!el.closest('.sr-only, [data-gate-skip], [data-photo-col]'), ab, false), 0, ab, 1);
      if (wrap && wb) {
        // the credit is drawn very faint; sampled at full colour, kept faint
        const credit = wrap.querySelector<HTMLElement>(':scope p');
        const was = credit?.style.color ?? '';
        if (credit) credit.style.color = 'hsl(var(--foreground))';
        text(sampleText(wrap, (el) => !!el.closest('.photo-frame-wrapper'), wb, false), 1, wb, 0.18);
        if (credit) credit.style.color = was;
        // the portrait, pixel by pixel on the 3 px grid
        if (frameEl && img && img.complete && img.naturalWidth) {
          const fb = frameEl.getBoundingClientRect();
          const w = Math.round(fb.width), h = Math.round(fb.height);
          const cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          const c = cv.getContext('2d', { willReadFrequently: true });
          if (c && w > 0 && h > 0) {
            c.drawImage(img, 0, 0, w, h);
            const px = c.getImageData(0, 0, w, h).data;
            for (let y = 1; y < h; y += 3) {
              for (let x = 1; x < w; x += 3) {
                const k = (y * w + x) * 4;
                const r = px[k] / 255, g = px[k + 1] / 255, b = px[k + 2] / 255;
                if (0.3 * r + 0.59 * g + 0.11 * b < 0.07) continue; // the dark ground stays dark
                others.push({ anchor: 1, x: fb.left - wb.left + x, y: fb.top - wb.top + y, r: r * 0.92, g: g * 0.92, b: b * 0.92, a: 1, s: 2.6, rnd: rand(), depth: rand() });
              }
            }
          }
        }
      }

      // thin to the cap: the title's stars first, the rest evenly
      const keepStars = Math.min(1, (CAP * 0.45) / Math.max(1, stars.length));
      const all = stars.filter(() => rand() < keepStars);
      const keepRest = Math.min(1, (CAP - all.length) / Math.max(1, others.length));
      for (const c of others) if (rand() < keepRest) all.push(c);

      // where things are now (both the cells and their places scroll with the page)
      const sx = (c: { anchor: 0 | 1; x: number }) => (c.anchor && wb ? wb.left : ab.left) + c.x;
      const syy = (c: { anchor: 0 | 1; y: number }) => (c.anchor && wb ? ab.top + wOffBang : ab.top) + c.y;
      const cx = vw / 2, cy = ab.bottom - (BANG - 0.5) * vh; // the cloud's centre
      const tb = rest.getBoundingClientRect();
      const gl = globeAt();
      // the pull's length in px of scroll, and how far down a cell may travel in it
      const tt = title.getBoundingClientRect().top;
      const fStart = Math.max(BANG * vh + (tt - ab.bottom), (POUR_B + FORM_MIN) * vh);
      const lim = UP * (fStart - POUR_B * vh);

      const grains: Grain[] = all.map((c) => {
        const keep = galaxyKeep(c.rnd) === 1;
        const [r, g, b] = galaxyColor(c.rnd, c.depth);
        // near cells open out further, each with a scatter of its own that breaks
        // the lines of type; below the centre no faster than the page rises
        const budget = (UP * vh * SPREAD) / 2; // px a cell may fall over the spread
        const ang = rand() * Math.PI * 2, mag = (0.04 + 0.22 * c.depth) * Math.hypot(vw, vh) * Math.sqrt(rand());
        const ax = Math.cos(ang) * mag, ay = Math.min(Math.sin(ang) * mag, budget * 0.5);
        const below = syy(c) - cy;
        const kMax = below > 1 ? (budget - Math.max(0, ay)) / below : Infinity;
        return {
          anchor: c.anchor, rx: c.x, ry: c.y,
          form: pal(c.r, c.g, c.b, 7), formA: c.a, formS: c.s,
          star: pal(r, g, b), starA: 0.55 + 0.45 * c.depth, starS: galaxySize(c.rnd, c.depth),
          depth: c.depth, keep, bright: galaxyBright(c.rnd) === 1,
          k: Math.min(0.25 + 1.1 * c.depth * c.depth, kMax), ax, ay,
          tgt: -2, lx: 0, ly: 0, p: 1,
        };
      });

      // the lit share within reach: half to the BODY OF WORK stars, the rest to the globe
      const tStars = titleStars.stars;
      const nT = tStars.length;
      const titleY = tb.top + titleStars.h / 2;
      const near = grains.filter((g) => g.keep && titleY - syy({ anchor: g.anchor, y: g.ry }) <= lim);
      near.sort((a, b) => syy({ anchor: b.anchor, y: b.ry }) - syy({ anchor: a.anchor, y: a.ry })); // lowest first
      const toTitle: Grain[] = [];
      const pace = (g: Grain, d: number) => (g.p = Math.max(1, Math.min(1 + 2 * g.depth, d > 1 ? lim / d : 3)));
      for (const g of near) {
        const x = sx({ anchor: g.anchor, x: g.rx }), y = syy({ anchor: g.anchor, y: g.ry });
        if (toTitle.length < nT && rand() < 0.5) {
          toTitle.push(g);
          continue;
        }
        // the globe: it lands on the side it comes from, at a depth it can reach
        const vx = x - gl.gx, vy = y - gl.gy, d = Math.hypot(vx, vy) || 1;
        for (const rho of [0.35 + 0.63 * Math.sqrt(rand()), 0.97]) {
          const ly = (vy / d) * rho, lx = (vx / d) * rho;
          const down = gl.gy + ly * gl.R - y;
          if (down > lim) continue;
          g.tgt = -1;
          g.lx = lx;
          g.ly = ly;
          pace(g, down);
          break;
        }
      }
      // the title's cells keep their left-to-right order across the word
      toTitle.sort((a, b) => sx({ anchor: a.anchor, x: a.rx }) - sx({ anchor: b.anchor, x: b.rx }));
      const byX = tStars.map((_, i) => i).sort((a, b) => tStars[a].x - tStars[b].x);
      const taken = new Uint8Array(nT);
      toTitle.forEach((g, i) => {
        const si = byX[Math.min(nT - 1, Math.floor(((i + 0.5) * nT) / toTitle.length))];
        const down = tb.top + tStars[si].y - syy({ anchor: g.anchor, y: g.ry });
        if (taken[si] || down > lim) return;
        taken[si] = 1;
        g.tgt = si;
        const l = titleLook(tStars[si].rnd, tStars[si].depth);
        g.star = pal(l.r, l.g, l.b);
        g.starA = REST_ALPHA;
        g.starS = l.size;
        g.bright = l.bright;
        pace(g, down);
      });
      condense = [];
      tStars.forEach((st, i) => {
        if (taken[i]) return;
        const l = titleLook(st.rnd, st.depth);
        condense.push({ i, col: pal(l.r, l.g, l.b), size: l.size, bright: l.bright });
      });

      const n = grains.length + condense.length;
      bx = new Float32Array(n);
      by = new Float32Array(n);
      bs = new Float32Array(n);
      bk = new Int32Array(n);
      order = new Int32Array(n);
      counts = new Int32Array(palette.length * (AQ + 1));
      starts = new Int32Array(palette.length * (AQ + 1));
      prevY = new Float32Array(grains.length).fill(NaN);
      return grains;
    };

    // writes only on change
    let aboutOp = '';
    const setAbout = (v: string) => {
      if (v === aboutOp) return;
      aboutOp = v;
      about.style.opacity = v;
    };
    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      if (!on) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    let restOn = false;
    const showRest = (on: boolean) => {
      if (on === restOn) return;
      restOn = on;
      rest.style.visibility = on ? 'visible' : 'hidden';
    };

    // dev probe: the cloud's centroid and how many cells moved down since the last frame
    const probe: Record<string, number> | null = import.meta.env.DEV ? ((window as unknown as { __bang?: Record<string, number> }).__bang = { draws: 0 }) : null;

    // the bang at this scroll: About bottom `s` (screen heights), pull `f`
    const draw = (s: number, f: number) => {
      if (!grains) return;
      const t0 = probe ? performance.now() : 0;
      const vw = VW, vh = VH;
      const ab = about.getBoundingClientRect();
      const wb = wrap?.getBoundingClientRect() ?? ab;
      const tb = rest.getBoundingClientRect();
      const gl = globeAt();
      const wTop = wrapTopAt(s, ab, wb);
      // the cloud opens out around a point that rides up with the page
      const cx = vw / 2, cy = ab.bottom - (BANG - 0.5) * vh;
      const ue = lin(s, BANG, BANG - SPREAD);
      const open = 1 - (1 - ue) * (1 - ue); // fast at first, slowing
      const starry = s <= LOOK;
      const lost = lin(s, LOST_A, LOST_B);
      const dustOut = lin(f, 0.55, 0.95); // lit dust with no place goes out as the formation closes
      const globeFade = 1 - lin(f, 0.85, 1); // the globe's own cells take over
      const sprite = halo();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      counts.fill(0);
      const touched: number[] = [];
      let m = 0, sumX = 0, sumY = 0, sumN = 0, down = 0, up = 0;
      const put = (x: number, y: number, size: number, a: number, col: number, bright: boolean) => {
        if (a <= 0.01 || x < -8 || y < -8 || x > vw + 8 || y > vh + 8) return;
        if (bright) {
          const hs = size * 7;
          ctx.globalAlpha = a;
          ctx.drawImage(sprite, x - hs / 2, y - hs / 2, hs, hs);
        }
        const key = col * (AQ + 1) + Math.round(a * AQ);
        if (counts[key]++ === 0) touched.push(key);
        bx[m] = x;
        by[m] = y;
        bs[m] = size;
        bk[m] = key;
        m++;
      };
      for (let i = 0; i < grains.length; i++) {
        const g = grains[i];
        if (!g.keep && lost >= 1) continue;
        const rx = (g.anchor ? wb.left : ab.left) + g.rx, ry = (g.anchor ? wTop : ab.top) + g.ry;
        let x: number, y: number, a: number, size: number;
        if (g.tgt === -2) {
          // dust: straight out from the cloud's centre, near cells further and bigger
          x = rx + ((rx - cx) * g.k + g.ax) * open;
          y = ry + ((ry - cy) * g.k + g.ay) * open;
          a = (starry ? g.starA : g.formA) * (g.keep ? 1 - dustOut : 1 - lost);
          size = starry ? g.starS * (1 + 1.6 * g.depth * open) : g.formS;
        } else {
          // a lit cell within reach: one straight run to its place, quick off the mark
          const w = 1 - Math.pow(1 - f, g.p);
          let tx: number, ty: number, ta: number, ts: number;
          if (g.tgt >= 0 && titleStars) {
            const st = titleStars.stars[g.tgt];
            tx = tb.left + st.x;
            ty = tb.top + st.y;
            ta = REST_ALPHA;
            ts = g.starS;
          } else {
            tx = gl.gx + g.lx * gl.R;
            ty = gl.gy + g.ly * gl.R;
            const front = (Math.sqrt(Math.max(0, 1 - g.lx * g.lx - g.ly * g.ly)) + 1) / 2;
            ta = (0.15 + 0.75 * front * front) * globeFade;
            ts = front > 0.55 ? 2.4 : 1.6;
          }
          x = mix(rx, tx, w);
          y = mix(ry, ty, w);
          a = mix(starry ? g.starA : g.formA, ta, w);
          size = starry ? mix(g.starS, ts, w) * (1 + 1.4 * g.depth * Math.sin(Math.PI * w)) : g.formS;
        }
        if (probe) {
          sumX += x;
          sumY += y;
          sumN++;
          if (y > prevY[i] + 0.5) down++;
          else if (y < prevY[i] - 0.5) up++;
          prevY[i] = y;
        }
        put(x, y, size, a, starry ? g.star : g.form, starry && g.bright);
      }
      // title stars no cell reached condense in place
      if (titleStars && f > 0) {
        const a = REST_ALPHA * ease(lin(f, 0.4, 1));
        for (const c of condense) {
          const st = titleStars.stars[c.i];
          put(tb.left + st.x, tb.top + st.y, c.size, a, c.col, c.bright);
        }
      }
      // one fill per colour and alpha step
      let o = 0;
      for (const key of touched) {
        starts[key] = o;
        o += counts[key];
      }
      for (let j = 0; j < m; j++) order[starts[bk[j]]++] = j;
      o = 0;
      for (const key of touched) {
        const end = starts[key]; // advanced to its end by the placement above
        ctx.globalAlpha = (key % (AQ + 1)) / AQ;
        ctx.fillStyle = palette[(key / (AQ + 1)) | 0];
        ctx.beginPath();
        for (; o < end; o++) {
          const j = order[o];
          ctx.rect(bx[j] - bs[j] / 2, by[j] - bs[j] / 2, bs[j], bs[j]);
        }
        ctx.fill();
      }

      // the light where it opens: soft, warm at the core, a faint red rim
      const glow = Math.sin(Math.PI * lin(s, FLASH_A, FLASH_B));
      if (glow > 0.005) {
        const R = Math.min(vw, vh) * 0.55;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * glow;
        ctx.drawImage(flashLight(), cx - R, cy - R, R * 2, R * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
      if (probe) {
        probe.draws++;
        probe.cx = sumN ? sumX / sumN : 0;
        probe.cy = sumN ? sumY / sumN : 0;
        probe.n = sumN;
        probe.down = down;
        probe.up = up;
        probe.ms = performance.now() - t0;
      }
    };

    let trackH = -1;
    let mapL = 0;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = VH;
      const ab = about.getBoundingClientRect();
      const s = ab.bottom / vh;
      const reset = s > RESET_AT;

      // ── the pull: from where About opens out until the title's top reaches POUR_B
      const tt = title.getBoundingClientRect().top;
      const fStart = Math.max(BANG * vh + (tt - ab.bottom), (POUR_B + FORM_MIN) * vh);
      const f = lin(tt, fStart, POUR_B * vh);

      // ── the map: the track holds still (desktop) over its room, or scrolls through (phones)
      const track = root.querySelector<HTMLElement>('[data-build-track]');
      const room = root.querySelector<HTMLElement>('[data-build-room]');
      let mapP = 0;
      let over = -1; // px of scroll past the finished build
      // the graph loads lazily and can change height: keep its sticky offset in step
      if (track && track.scrollHeight !== trackH) {
        trackH = track.scrollHeight;
        placeTrack();
        grains = null; // the globe the cells land on has moved or just arrived
      }
      if (track) {
        const tr = track.getBoundingClientRect();
        let num: number, den: number; // both in px; num grows one for one with the scroll
        if (room && room.offsetHeight > 0) {
          // from the graph's top at 35 % of the screen until the room has scrolled past
          num = vh * 0.35 + tr.height - room.getBoundingClientRect().top;
          den = vh * 0.3 + room.offsetHeight;
        } else {
          // phones: done by the time the map's middle reaches the middle of the screen
          num = vh * 0.85 - tr.top;
          den = Math.max(1, tr.height / 2 + vh * 0.35);
        }
        // the build starts where the pull ends, never part way in
        const st = Math.max(0, num + (tt - POUR_B * vh));
        mapP = den > st ? clamp01((num - st) / (den - st)) : num >= st ? 1 : 0;
        over = num - den;
      }
      if (f < 1) mapP = 0;
      // the globe's own cells fade in as the pulled ones land on it
      workBuildBus.setPour(f, null);
      mapL = reset || mapL < 1 ? mapP : 1;
      workBuildBus.set(mapL);
      // ── once whole: a sweep of light over the map, then a slow turn across the rest of Work
      let sweep = 0, drift = 0;
      if (mapL >= 1 && over > 0) {
        sweep = clamp01(over / (SWEEP * vh));
        drift = clamp01(over / (over + Math.max(1, root.getBoundingClientRect().bottom)));
      }
      workBuildBus.setAfter(sweep, drift);
      if (probe) {
        probe.f = f;
        probe.B = mapL;
        probe.sweep = sweep;
        probe.drift = drift;
      }

      // ── About: whole above HAND_A, handed over to the cells below HAND_B
      const hand = ease(lin(s, HAND_A, HAND_B));
      setAbout(hand <= 0 ? '' : (1 - hand).toFixed(3));
      if (!titleStars && f > 0) titleStars = placeTitle();
      showRest(f >= 1 && !!titleStars);

      if (s >= HAND_A || f >= 1) {
        show(false);
        return;
      }
      if (!grains) grains = sample();
      if (!grains) {
        setAbout('');
        show(false);
        return;
      }
      draw(s, f);
      show(true);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    // the graph holds still where it fits: 5 % from the top, or higher if it is taller than the screen
    const placeTrack = () => {
      const track = root.querySelector<HTMLElement>('[data-build-track]');
      const room = root.querySelector<HTMLElement>('[data-build-room]');
      if (!track || !room || room.offsetHeight === 0) return;
      const vh = VH;
      // the map itself (the canvas), whole and just under the header when it fits, else bottom-aligned
      const map = track.querySelector('canvas');
      const mh = map ? map.offsetHeight : track.offsetHeight;
      const off = map ? map.getBoundingClientRect().top - track.getBoundingClientRect().top : 0;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 64;
      const room2 = vh - header - mh;
      const top = room2 >= 0 ? header + room2 / 2 - off : vh - mh - off - 8;
      track.style.top = `${Math.round(top)}px`;
    };
    placeTrack();
    // a new width rebuilds; a height change under 150 px (a phone's toolbar) only redraws
    const onResize = () => {
      if (window.innerWidth === VW && Math.abs(window.innerHeight - VH) < 150) {
        schedule();
        return;
      }
      resize();
      placeTrack();
      grains = null;
      titleStars = null;
      schedule();
    };
    // the portrait may finish loading after the first sampling; the title needs its font
    const resample = () => {
      grains = null;
      schedule();
    };
    img?.addEventListener('load', resample);
    document.fonts.load('100px "Geist Pixel"').then(() => {
      titleStars = null;
      resample();
    }, () => undefined);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      img?.removeEventListener('load', resample);
      rest.remove();
      if (trackEl) trackEl.style.minHeight = '';
      heading.style.position = headingPos;
      title.style.color = '';
      title.style.animation = '';
      about.style.opacity = '';
      workBuildBus.set(1);
      workBuildBus.setPour(1, null);
      workBuildBus.setAfter(1, 0);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {children}
      <canvas
        ref={canvasRef}
        data-work-bang
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ width: '100vw', height: '100vh', visibility: 'hidden' }}
      />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
