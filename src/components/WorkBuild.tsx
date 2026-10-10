// ─────────────────────────────────────────────────────────────────────────
// Work build (#121, #166): About → Body of Work.
//
//   bang   as About leaves, all of it (the ABOUT stars, the headline, the
//          table, the portrait's pixels, the credit) hands over to cells.
//          They breathe in toward the middle of the screen, a flash at the
//          centre, and burst outward as galaxy dust with depth (near cells
//          bigger and faster). Only the galaxy share stays lit; those are
//          pulled onto the Body of Work globe and into the BODY OF WORK
//          star title, where a still canvas takes over
//   map    then the map builds itself (drawn by ConstellationFull from
//          workBuildBus): sound, space, code, body, one impulse handed on
//          star to star, then the skill names, then the works, a turn of
//          the sphere and two heartbeats
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
const CAP = LIGHT ? 3000 : 9000; // About cells sampled; ~36 % stay lit after the flash

// The bang, by where About's bottom edge is on the screen (screen heights)
const HAND_A = 0.78; // cells appear under the type …
const HAND_B = 0.74; // … and the DOM has faded out by here
const INHALE_A = 0.75; // breathes in toward the centre
const FLASH_A = 0.55; // the flash at the centre …
const FLASH_B = 0.5;
const FLASH_PEAK = (FLASH_A + FLASH_B) / 2; // … the burst sets off at its peak
const BURST_B = 0.2; // burst outward until here, then pulled into place
const INHALE = 0.06; // share of the way to the centre the cells drift in
const COLLAPSE = 0.88; // … and under the flash, nearly all the way to its core
// The pull ends when the BODY OF WORK title's top reaches POUR_B; it takes
// at least FORM_MIN screen heights of scroll, overlapping the burst's
// slow tail where the gap between the sections is short (phones).
const POUR_B = 0.36;
const FORM_MIN = 0.2;
// Once About's bottom edge drops back below this, About is coming apart:
// the map lets go of its latch and rewinds with the scroll.
const RESET_AT = 0.95;
const REST_ALPHA = 0.9; // the formed BODY OF WORK stars

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

// one About cell: where it rests, how it looks formed and as a star, where it goes
interface Grain {
  anchor: 0 | 1; // 0 the About section, 1 the portrait column's sticky wrapper
  rx: number; ry: number; // offset from its anchor's box, client px
  form: string; formA: number; formS: number; // its look while About is whole
  star: string; starA: number; starS: number; // its look as a star after the flash
  depth: number; keep: boolean; bright: boolean;
  ang: number; // its burst bearing: out of the core, any way round
  reach: number; // how far it flies, share of the screen's half diagonal
  tgt: number; // index of its BODY OF WORK star, -1 for the globe
  ux: number; uy: number; uz: number; // its point on the globe, unit sphere
  delay: number; // share of the pull it waits before setting off
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

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const photoCol = about.querySelector<HTMLElement>('[data-photo-col]');
    const wrap = (photoCol?.firstElementChild as HTMLElement | null) ?? null;
    const frameEl = about.querySelector<HTMLElement>('.photo-frame-wrapper');
    const img = about.querySelector<HTMLImageElement>('picture img');

    // ── the BODY OF WORK stars: sized to the h2's width, centred on its line
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
      return { col: css(r, g, b), size: Math.max(LIGHT ? 1.6 : 1.4, galaxySize(rnd, depth)), bright: galaxyBright(rnd) === 1 };
    };
    const placeTitle = () => {
      const t = sampleStarTitle(title.textContent ?? '', title.clientWidth, { light: LIGHT });
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

    // ── the About cells: sampled once About is about to leave
    let grains: Grain[] | null = null;
    const sample = (): Grain[] | null => {
      titleStars = titleStars ?? placeTitle();
      if (!titleStars) return null;
      const rand = rng(166);
      const ab = about.getBoundingClientRect();
      const wb = wrap?.getBoundingClientRect();
      const sy = window.scrollY;
      type Raw = { anchor: 0 | 1; x: number; y: number; col: string; a: number; s: number; rnd: number; depth: number; star?: boolean };
      const stars: Raw[] = [];
      const others: Raw[] = [];

      // the ABOUT title: its own stars, as StarTitle draws them formed
      const tbox = about.querySelector<HTMLElement>('[data-gate-skip]');
      if (tbox) {
        const tb = tbox.getBoundingClientRect();
        const t = sampleStarTitle('About', tbox.clientWidth * 0.92, { light: LIGHT });
        for (const s of t.stars) {
          const [r, g, b] = galaxyColor(s.rnd, 0.55 + 0.45 * s.depth);
          stars.push({ anchor: 0, x: tb.left - ab.left + s.x, y: tb.top - ab.top + s.y, col: css(r, g, b), a: 0.55, s: galaxySize(s.rnd, s.depth) * (LIGHT ? 1.5 : 1), rnd: s.rnd, depth: s.depth, star: true });
        }
      }
      const text = (cells: Cell[], anchor: 0 | 1, box: DOMRect, a: number) => {
        for (const c of cells) others.push({ anchor, x: c.x - box.left, y: c.y - sy - box.top, col: css(c.r, c.g, c.b), a, s: 2.4, rnd: rand(), depth: rand() });
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
                others.push({ anchor: 1, x: fb.left - wb.left + x, y: fb.top - wb.top + y, col: css(r * 0.92, g * 0.92, b * 0.92), a: 1, s: 2.6, rnd: rand(), depth: rand() });
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

      // the lit share: the first ones go to the BODY OF WORK stars, the others to the globe
      const nT = titleStars.stars.length;
      let ti = 0;
      return all.map((c) => {
        const keep = galaxyKeep(c.rnd) === 1;
        const [r, g, b] = galaxyColor(c.rnd, c.depth);
        const tgt = keep && ti < nT && rand() < 0.5 ? ti++ : -1;
        const tl = tgt >= 0 ? titleLook(titleStars!.stars[tgt].rnd, titleStars!.stars[tgt].depth) : null;
        // a uniform point on the globe
        const z = rand() * 2 - 1, phi = rand() * Math.PI * 2, q = Math.sqrt(1 - z * z);
        return {
          anchor: c.anchor, rx: c.x, ry: c.y,
          form: c.col, formA: c.a, formS: c.s,
          star: tl ? tl.col : css(r, g, b),
          starA: tl ? REST_ALPHA : 0.55 + 0.45 * c.depth,
          starS: tl ? tl.size : galaxySize(c.rnd, c.depth),
          depth: c.depth, keep, bright: tl ? tl.bright : galaxyBright(c.rnd) === 1,
          ang: rand() * Math.PI * 2,
          reach: (0.12 + 0.88 * Math.sqrt(rand())) * (0.45 + 0.75 * c.depth),
          tgt, ux: q * Math.cos(phi), uy: z, uz: q * Math.sin(phi),
          delay: 0.35 * (1 - c.depth) + 0.1 * rand(),
        };
      });
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

    // where the globe is: ConstellationFull's own placement, in client px
    const globeAt = () => {
      const map = root.querySelector<HTMLElement>('[data-build-track] canvas');
      const vh = window.innerHeight;
      if (!map) return { gx: window.innerWidth / 2, gy: vh * 1.2, R: Math.min(window.innerWidth, vh) * 0.36 };
      const r = map.getBoundingClientRect();
      const R = Math.min(r.width, vh, r.height) * 0.36;
      return { gx: r.left + r.width / 2, gy: r.top + Math.max(R + 20, Math.min(vh / 2 - r.top, r.height - R - 20)), R };
    };

    // the bang at this scroll: About bottom `s` (screen heights), pull `f`
    const draw = (s: number, f: number) => {
      if (!grains) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const cx = vw / 2, cy = vh / 2;
      const ab = about.getBoundingClientRect();
      const wb = wrap?.getBoundingClientRect() ?? ab;
      const tb = rest.getBoundingClientRect();
      const gl = globeAt();
      const F = gl.R * 3.2;
      // breathes in, then falls into the flash's core while the glow hides it
      const inhale = INHALE * ease(lin(s, INHALE_A, FLASH_A)) + (COLLAPSE - INHALE) * ease(lin(s, FLASH_A, FLASH_PEAK));
      const ub = lin(s, FLASH_PEAK, BURST_B);
      const burst = 1 - (1 - ub) * (1 - ub) * (1 - ub); // fast off the flash, slowing down
      const half = Math.hypot(vw, vh) / 2;
      const starry = s <= FLASH_PEAK; // after the flash: the galaxy look
      const lost = lin(s, FLASH_PEAK + 0.01, FLASH_PEAK - 0.01); // the unlit share goes out in the flash
      const globeFade = 1 - lin(f, 0.85, 1); // the globe's own cells take over

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      const sprite = halo();
      for (const g of grains) {
        if (!g.keep && lost >= 1) continue;
        const ax = g.anchor ? wb.left : ab.left, ay = g.anchor ? wb.top : ab.top;
        const rx = ax + g.rx, ry = ay + g.ry;
        let x = rx + (cx - rx) * inhale, y = ry + (cy - ry) * inhale;
        // the burst: out from the core along its own bearing, near cells further, faster and bigger
        if (burst > 0) {
          const r = g.reach * half * burst;
          x += Math.cos(g.ang) * r;
          y += Math.sin(g.ang) * r;
        }
        let a = starry ? g.starA : g.formA;
        let size = starry ? g.starS * (1 + 1.6 * g.depth * burst) : g.formS;
        if (!g.keep) a *= 1 - lost;
        // the pull: onto its BODY OF WORK star or its point on the globe
        if (f > 0 && g.keep) {
          const t = ease(lin(f, g.delay, g.delay + 0.55));
          let tx: number, ty: number, ta: number;
          if (g.tgt >= 0 && titleStars) {
            const st = titleStars.stars[g.tgt];
            tx = tb.left + st.x;
            ty = tb.top + st.y;
            ta = g.starA;
            size = mix(size, g.starS, t);
          } else {
            const Z = gl.R * g.uz, kk = F / (F - Z);
            tx = gl.gx + gl.R * g.ux * kk;
            ty = gl.gy + gl.R * g.uy * kk;
            const front = (g.uz + 1) / 2;
            ta = (0.15 + 0.75 * front * front) * globeFade;
            size = mix(size, front > 0.55 ? 2.4 : 1.6, t);
          }
          x = mix(x, tx, t);
          y = mix(y, ty, t);
          a = mix(a, ta, t);
        }
        if (a <= 0.01 || x < -8 || y < -8 || x > vw + 8 || y > vh + 8) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = starry ? g.star : g.form;
        if (starry && g.bright) {
          const hs = size * 7;
          ctx.drawImage(sprite, x - hs / 2, y - hs / 2, hs, hs);
        }
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      // the flash: a short bright bloom at the centre, white core, red rim
      const glow = Math.sin(Math.PI * lin(s, FLASH_A, FLASH_B));
      if (glow > 0.005) {
        const R = Math.min(vw, vh) * 0.42;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.1, 'rgba(255,246,236,0.85)');
        grad.addColorStop(0.4, 'rgba(255,70,52,0.32)');
        grad.addColorStop(1, 'rgba(205,0,0,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glow;
        ctx.fillStyle = grad;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    };

    let trackH = -1;
    let mapL = 0;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      const ab = about.getBoundingClientRect();
      const s = ab.bottom / vh;
      const reset = s > RESET_AT;

      // ── the pull: from where About has burst until the title's top reaches POUR_B
      const tt = title.getBoundingClientRect().top;
      const formA = Math.max(BURST_B * vh + (tt - ab.bottom), (POUR_B + FORM_MIN) * vh);
      const f = lin(tt, formA, POUR_B * vh);

      // ── the map: the track holds still (desktop) over its room, or scrolls through (phones)
      const track = root.querySelector<HTMLElement>('[data-build-track]');
      const room = root.querySelector<HTMLElement>('[data-build-room]');
      let mapP = 0;
      // the graph loads lazily and can change height: keep its sticky offset in step
      if (track && track.scrollHeight !== trackH) {
        trackH = track.scrollHeight;
        placeTrack();
      }
      if (track) {
        const tr = track.getBoundingClientRect();
        if (room && room.offsetHeight > 0) {
          const rr = room.getBoundingClientRect();
          // from the graph's top at 35 % of the screen until the room has scrolled past
          const a = vh * 0.35 + tr.height;
          mapP = clamp01((a - rr.top) / (vh * 0.3 + room.offsetHeight));
        } else {
          // phones: done by the time the map's middle reaches the middle of the screen
          mapP = clamp01((vh * 0.85 - tr.top) / Math.max(1, tr.height / 2 + vh * 0.35));
        }
      }
      if (f < 1) mapP = 0;
      // the globe's own cells fade in as the pulled ones land on it
      workBuildBus.setPour(f, null);
      mapL = reset || mapL < 1 ? mapP : 1;
      workBuildBus.set(mapL);

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
      const vh = window.innerHeight;
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
    const onResize = () => {
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
      heading.style.position = headingPos;
      title.style.color = '';
      title.style.animation = '';
      about.style.opacity = '';
      workBuildBus.set(1);
      workBuildBus.setPour(1, null);
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
