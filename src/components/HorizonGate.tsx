// ─────────────────────────────────────────────────────────────────────────
// Horizon gate (#120): the hero becomes stars, the stars become About.
//
// Everything is a pure function of the scroll position (css px), so
// scrolling back plays the same frames in reverse and nothing moves at rest.
//
//   hero   the headline locks into 3 px dither cells on the first wheel tick
//          and falls into the red horizon line as stars
//   line   flies up to mid-screen within ~100 px of scroll, fires once when
//          the hero is in, then keeps rising slower and fades under the header
//   About  rises from below to meet the line (a transform lift that eases
//          back to zero), and every block is poured as it scrolls in: stars
//          fall into its letters, land as dither, and the real block takes
//          over once its last cell has landed. This runs over the whole of
//          About, so ORIGIN / DRIFT / FOCUS and the paragraphs pour too.
//   photo  stars rain onto the portrait slot and the site's own image dither
//          develops under them; it stays dither until the portrait's centre
//          reaches the middle of the screen, then resolves into the photo.
//
// Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortraitBuild, type PortraitBuild } from '@/components/portraitBuild';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const CELL = 3; // css px, the site's dither cell
const MAX_PARTICLES = 26000;
const PHOTO_SRC = '/sinaida-photo-600.jpg';

// All in css px of scroll.
const S0 = 16; // the first wheel tick starts it
const HERO_LOCK = 30; // the headline hands over to its cells
const HERO_FALL = 95; // how long a hero cell takes to fall into the line
const LINE_LEN = 620; // the line's whole flight
const LINE_TOP = 72; // where it fades, just under the header
const FLASH_AT = S0 + 130; // the hero is in: the line fires
const LIFT_RISE = 150; // About rises to meet the line, once the hero is in it
const POUR_FROM = S0 + 120; // About starts pouring when the hero stars have reached the line
const FALL = 110; // a poured cell falls into its letter
const SHED_AT = 0.92; // a letter is poured as it scrolls in at this screen height
const HAND = 24; // a finished block fades in over this much scroll

const QUAD_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// the horizon line: a thin neon tube that charges as stars cross it, then
// fires once with a short CRT split. No wide wash, red never burns white.
const LINE_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uLine;    // device px from the top
uniform vec2 uSpan;     // x extent
uniform float uCharge;  // 0..1
uniform float uFlash;   // 0..1
out vec4 outColor;
const vec3 RED = vec3(0.804, 0.0, 0.0);
const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);
float tube(float d, float core, float halo) {
  return exp(-d * d / (2.0 * core * core)) + 0.45 * exp(-d * d / (2.0 * halo * halo));
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float fall = 60.0 * uDpr;
  float x = smoothstep(uSpan.x - fall, uSpan.x + fall, p.x) * (1.0 - smoothstep(uSpan.y - fall, uSpan.y + fall, p.x));
  float split = uFlash * 7.0 * uDpr;     // the line opens into two and closes
  float d0 = p.y - uLine;
  float i = tube(abs(d0), 1.2 * uDpr, 5.0 * uDpr) * (0.35 + 0.65 * uCharge) * (1.0 - uFlash)
          + (tube(abs(d0 - split), 0.9 * uDpr, 7.0 * uDpr) + tube(abs(d0 + split), 0.9 * uDpr, 7.0 * uDpr)) * uFlash * 1.3;
  i *= x * max(uCharge, uFlash);
  vec3 col = mix(RED, RED_HOT, clamp(i, 0.0, 1.0)) * i;
  outColor = vec4(col, clamp(i, 0.0, 1.0));
}`;


const PT_VS = `#version 300 es
in vec2 aSrc;     // hero cell: page px; poured cell: (x jitter, drop height)
in vec2 aMid;     // x where a hero cell meets the line
in vec2 aDst;     // page px: its letter / portrait cell (spare hero stars: unused)
in vec3 aCol0;
in vec3 aCol1;
in vec4 aTime;    // s1 (hero falls), s2 (poured), depth, rnd; scroll px
in vec3 aFlags;   // x: hero cell, y: kind 0 text, 1 portrait, 2 spare hero star; z: hand-over scroll px
uniform float uSy;
uniform float uLinePage;  // the line, page px
uniform float uLineOn;
uniform float uLift;      // css px About is lifted by
uniform float uDpr;
uniform vec2 uView;
out vec3 vCol;
out float vAlpha;
out float vRound;
out float vBloom;

const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);

void main() {
  float s1 = aTime.x, s2 = aTime.y, depth = aTime.z, rnd = aTime.w;
  bool hero = aFlags.x > 0.5;
  float kind = aFlags.y;
  vec2 dst = kind < 1.5 ? aDst - vec2(0.0, uLift) : aDst;

  // a hero cell falls into the line and rides it, sparkling in a thin band
  float t1 = hero ? smoothstep(s1, s1 + ${HERO_FALL}.0, uSy) : 1.0;
  vec2 a;
  if (hero) {
    a = mix(aSrc, vec2(aMid.x, uLinePage), t1 * t1);
    a.x += sin(t1 * 3.14159) * (rnd - 0.5) * 70.0;
    a.y += (fract(rnd * 31.7) - 0.5) * 16.0 * t1;
  } else {
    // a poured cell leaves the line, or (once the line is high above) the sky just over its letter
    a = vec2(dst.x + aSrc.x, max(uLinePage, dst.y - aSrc.y));
  }
  // and falls into its letter like dust under gravity
  float t2 = kind > 1.5 ? 0.0 : smoothstep(s2, s2 + ${FALL}.0, uSy);
  float land = t2 * t2;
  vec2 pos = mix(a, dst, land);
  pos.x += sin(t2 * 3.14159) * (rnd - 0.5) * 60.0;

  // in flight a star (round, sized by depth, a few bloom); landed a crisp cell
  float flight = (hero ? smoothstep(0.0, 0.25, t1) : 1.0) * (1.0 - smoothstep(0.75, 1.0, t2));
  float bloom = step(0.93, fract(rnd * 7.13)) * step(0.5, flight);
  float cellPx = max(1.0, floor(3.0 * uDpr - 0.5));
  gl_PointSize = max(1.0, floor(mix(cellPx, mix(1.2, 3.6, depth) * uDpr, flight) * (1.0 + 3.0 * bloom) + 0.5));

  vec3 star = mix(vec3(0.95, 0.93, 0.9), vec3(0.85, 0.12, 0.2), step(0.8, rnd)) * mix(0.55, 1.0, depth);
  vec3 col = mix(aCol0, star, flight);
  col = mix(col, aCol1, land * (1.0 - flight));
  col = mix(col, RED_HOT, exp(-abs(pos.y - uLinePage) / 26.0) * flight * 0.85 * uLineOn);

  float alpha = hero ? step(rnd, (uSy - ${S0}.0) / ${HERO_LOCK}.0 + 0.02) : smoothstep(s2 - 4.0, s2 + 8.0, uSy);
  if (kind < 0.5) alpha *= 1.0 - step(aFlags.z, uSy);          // the real block takes over
  else if (kind < 1.5) alpha *= 1.0 - step(s2 + ${FALL}.0, uSy); // the portrait dither develops where it lands
  else alpha *= uLineOn;                                          // spare hero stars leave with the line

  vCol = col;
  vAlpha = alpha;
  vRound = flight;
  vBloom = bloom;
  vec2 scr = vec2(pos.x, pos.y - uSy);
  gl_Position = vec4(scr.x / uView.x * 2.0 - 1.0, 1.0 - scr.y / uView.y * 2.0, 0.0, 1.0);
}`;

const PT_FS = `#version 300 es
precision highp float;
in vec3 vCol;
in float vAlpha;
in float vRound;
in float vBloom;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.1, d);
  float a;
  if (vBloom > 0.5) {
    vec2 c = gl_PointCoord - 0.5;
    float core = mix(max(abs(c.x), abs(c.y)) < 0.125 ? 1.0 : 0.0, smoothstep(0.14, 0.04, d), vRound);
    a = min(1.0, core + 0.55 * exp(-d * d * 22.0)) * vAlpha;
  } else {
    a = vAlpha * mix(1.0, soft, vRound);
  }
  if (a < 0.01) discard;
  outColor = vec4(vCol * a, a);
}`;

// ── sampling the DOM into cells ───────────────────────────────────────────

interface Cell { x: number; y: number; r: number; g: number; b: number; blk?: number }

// false when the element or an ancestor up to `root` is transparent (a
// hidden caption, a footnote waiting for its click)
function shown(el: Element, root: Element) {
  for (let e: Element | null = el; e && e !== root.parentElement; e = e.parentElement) {
    if (parseFloat(getComputedStyle(e).opacity) < 0.05) return false;
  }
  return true;
}

// Draws every visible glyph under `root` into a canvas at its rendered place,
// then reads it back on the 3 px grid. Coordinates come back in page px.
// `blockOf` tags each cell with the block it was drawn from (drawn a second
// time into an id canvas). The index is spread over red and green in steps
// of 16, so antialiased glyph edges cannot shift it to a neighbouring block.
function sampleText(root: HTMLElement, skip: (el: Element) => boolean, box: DOMRect, checkOpacity: boolean, blockOf?: (el: Element) => number): Cell[] {
  const w = Math.ceil(box.width), h = Math.ceil(box.height);
  if (w < 1 || h < 1) return [];
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const idCv = blockOf ? document.createElement('canvas') : null;
  const idCtx = idCv?.getContext('2d', { willReadFrequently: true }) ?? null;
  if (idCv) { idCv.width = w; idCv.height = h; }
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const el = n.parentElement;
    if (!el || skip(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || (checkOpacity && !shown(el, root))) continue;
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.fillStyle = cs.color;
    ctx.textBaseline = 'alphabetic';
    if (idCtx && blockOf) {
      idCtx.font = ctx.font;
      const id = blockOf(el) + 1;
      idCtx.fillStyle = `rgb(${(id % 16) * 16},${Math.floor(id / 16) * 16},0)`;
    }
    const upper = cs.textTransform === 'uppercase';
    const text = n.data;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width < 1 || r.bottom < box.top || r.top > box.bottom) continue;
      const ch = upper ? text[i].toUpperCase() : text[i];
      const m = ctx.measureText(ch);
      const base = r.top + (r.height + m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;
      ctx.fillText(ch, r.left - box.left, base - box.top);
      idCtx?.fillText(ch, r.left - box.left, base - box.top);
    }
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  const ids = idCtx?.getImageData(0, 0, w, h).data;
  const cells: Cell[] = [];
  const sy = window.scrollY;
  // the grid is aligned to the page, so cells land on the same lattice everywhere
  const x0 = Math.ceil(box.left / CELL) * CELL - box.left;
  const y0 = Math.ceil((box.top + sy) / CELL) * CELL - (box.top + sy);
  for (let y = y0 + 1; y < h; y += CELL) {
    for (let x = x0 + 1; x < w; x += CELL) {
      const k = ((y | 0) * w + (x | 0)) * 4;
      if (data[k + 3] < 110) continue;
      cells.push({ x: box.left + x, y: box.top + sy + y, r: data[k] / 255, g: data[k + 1] / 255, b: data[k + 2] / 255, blk: ids ? Math.round(ids[k] / 16) + 16 * Math.round(ids[k + 1] / 16) - 1 : undefined });
    }
  }
  return cells;
}

const bayer8 = (x: number, y: number) => {
  let v = 0;
  for (let bit = 0, s = 1; bit < 3; bit++, s *= 4) {
    const xb = (x >> bit) & 1, yb = (y >> bit) & 1;
    v += ((xb ^ yb) * 2 + yb) * (16 / s);
  }
  return v / 64;
};

// the portrait as red 1-bit dither on the same grid
function samplePhoto(img: HTMLImageElement, rect: DOMRect): Cell[] {
  const w = Math.ceil(rect.width), h = Math.ceil(rect.height);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx || w < 1) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const sy = window.scrollY;
  const cells: Cell[] = [];
  for (let y = 1; y < h; y += CELL) {
    for (let x = 1; x < w; x += CELL) {
      const k = (y * w + x) * 4;
      const lum = (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) / 255;
      if (Math.min(1, Math.max(0, (lum - 0.25) * 1.6)) <= bayer8(x / CELL | 0, y / CELL | 0)) continue;
      cells.push({ x: rect.left + x, y: rect.top + sy + y, r: 1, g: 0.2, b: 0.17 });
    }
  }
  return cells;
}

// seeded PRNG, so a rebuild after resize lands the same way
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}
function link(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}


export default function HorizonGate({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    // the hero sits right before the gate in the page
    const hero = root?.previousElementSibling as HTMLElement | null;
    const about = root?.querySelector<HTMLElement>('#about');
    const horizon = root?.querySelector<HTMLElement>('[data-horizon]');
    if (!root || !canvas || !hero || !about || !horizon) return;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    let lineProg: WebGLProgram, ptProg: WebGLProgram;
    try {
      lineProg = link(gl, QUAD_VS, LINE_FS);
      ptProg = link(gl, PT_VS, PT_FS);
    } catch (e) {
      console.error('HorizonGate:', e);
      return;
    }
    const L = (n: string) => gl.getUniformLocation(lineProg, n);
    const P = (n: string) => gl.getUniformLocation(ptProg, n);
    const lu = { res: L('uRes'), dpr: L('uDpr'), line: L('uLine'), span: L('uSpan'), charge: L('uCharge'), flash: L('uFlash') };
    const pu = { sy: P('uSy'), line: P('uLinePage'), on: P('uLineOn'), lift: P('uLift'), dpr: P('uDpr'), view: P('uView') };
    const quadVao = gl.createVertexArray();
    const ptVao = gl.createVertexArray();
    const buf = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const photo = new Image();
    photo.src = PHOTO_SRC;
    const photoImg = about.querySelector<HTMLImageElement>('picture img');
    const photoFrame = about.querySelector<HTMLElement>('.photo-frame-wrapper');
    let portrait: PortraitBuild | null = null;

    // Layout, measured at build time.
    const g = {
      built: false, count: 0, y0: 0, lift: 0, liftEnd: S0 + LIFT_RISE, end: S0 + LINE_LEN,
      photoA: 0, photoB: 1, blocks: [] as HTMLElement[], done: [] as number[],
    };
    // the line's height on screen: to mid-screen fast, then steadily higher
    const lineAt = (sy: number) => {
      const u = clamp01((sy - S0) / LINE_LEN);
      const fast = 1 - Math.pow(1 - Math.min(1, u / 0.16), 3);
      return g.y0 - (g.y0 - LINE_TOP) * (0.55 * fast + 0.45 * u);
    };
    // About's lift: rises to meet the line, eases back slower than the page
    // moves, so About only ever travels up the screen
    const liftAt = (sy: number) => g.lift * smooth(S0 + 30, S0 + LIFT_RISE, sy) * (1 - smooth(S0 + LIFT_RISE, g.liftEnd, sy));

    const build = () => {
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY;
      const hz = horizon.getBoundingClientRect();
      const linePage = hz.top + hz.height / 2 + sy;
      g.y0 = Math.min(linePage - S0, vh * 0.92);
      const aboutBox = about.getBoundingClientRect();
      const aboutTop = aboutBox.top + sy;
      // lift About so its heading sits at ~60% of the screen once the line is up
      g.lift = Math.max(0, aboutTop + 80 - (S0 + LIFT_RISE) - vh * 0.6);
      g.liftEnd = S0 + LIFT_RISE + Math.max(500, (1.5 * g.lift) / 0.9);

      // hero cells
      const heroBox = hero.getBoundingClientRect();
      const skipHero = (el: Element) => !!el.closest('.sr-only, .hero-ghost, .hero-noise, .hero-whisper, button');
      const src = sampleText(hero, skipHero, heroBox, true);

      // About cells, block by block, over the whole section
      g.blocks = Array.from(about.querySelectorAll<HTMLElement>('h2, p, span.block, div')).filter((el) => el.closest('.photo-frame-wrapper') === null);
      const blockOf = (el: Element) => {
        const b = el.closest('h2, p, span.block, div');
        const i = b ? g.blocks.indexOf(b as HTMLElement) : -1;
        return i < 0 ? 254 : i;
      };
      const text = sampleText(about, (el) => !!el.closest('.sr-only'), aboutBox, false, blockOf);
      const pr = photoImg?.getBoundingClientRect();
      const face = photo.complete && photo.naturalWidth && pr ? samplePhoto(photo, pr) : [];

      const rand = rng(120);
      let dst: (Cell & { kind: number; shed: number })[] = [
        ...text.map((c) => ({ ...c, kind: 0, shed: 0 })),
        ...face.map((c) => ({ ...c, kind: 1, shed: 0 })),
      ];
      const budget = MAX_PARTICLES - Math.min(src.length, MAX_PARTICLES / 4);
      if (dst.length > budget) dst = dst.filter(() => rand() < budget / dst.length);

      // a cell is poured when its (lifted) letter scrolls in at SHED_AT
      const shedY = vh * SHED_AT;
      const pourAt = (y: number) => {
        if (y - S0 - liftAt(S0) <= shedY) return S0;
        let lo = S0, hi = S0 + 8000;
        for (let i = 0; i < 26; i++) {
          const m = (lo + hi) / 2;
          if (y - m - liftAt(m) > shedY) lo = m; else hi = m;
        }
        return hi;
      };
      for (const d of dst) d.shed = Math.max(pourAt(d.y), POUR_FROM + (d.y - aboutTop) * 0.15) + rand() * 30;
      // hero stars go to the first letters poured
      dst.sort((a, b) => a.shed - b.shed);

      // portrait window: from its first cell poured to its last landed
      const faceSheds = dst.filter((d) => d.kind === 1).map((d) => d.shed);
      g.photoA = faceSheds.length ? Math.min(...faceSheds) : 0;
      g.photoB = faceSheds.length ? Math.max(...faceSheds) + FALL : 1;

      const n = Math.max(src.length, dst.length);
      const STRIDE = 2 + 2 + 2 + 3 + 3 + 4 + 3;
      const arr = new Float32Array(n * STRIDE);
      const order = src.map((_, i) => i).sort(() => rand() - 0.5);
      g.done = new Array(g.blocks.length).fill(-1);
      for (const d of dst) {
        if (d.kind === 0 && d.blk !== undefined && d.blk < g.blocks.length) g.done[d.blk] = Math.max(g.done[d.blk], d.shed + FALL);
      }
      let last = S0 + LINE_LEN;
      for (let i = 0; i < n; i++) {
        const r = rand(), depth = rand();
        const s = i < src.length ? src[order[i]] : null;
        const d = i < dst.length ? dst[i] : null;
        const s1 = s ? S0 + 8 + 50 * clamp01((s.y - heroBox.top - sy) / Math.max(1, heroBox.height)) + 40 * r : 0;
        // a hero cell is never poured before it has reached the line
        const s2 = d ? (s ? Math.max(d.shed, s1 + HERO_FALL) : d.shed) : 0;
        const mx = Math.min(hz.right - 24, Math.max(hz.left + 24, (s ? s.x : 0) + ((d ? d.x : rand() * vw) - (s ? s.x : 0)) * 0.35 + (rand() - 0.5) * 60));
        const hand = d && d.kind === 0 && d.blk !== undefined && d.blk < g.blocks.length ? g.done[d.blk] + rand() * 18 : s2 + FALL;
        if (d) last = Math.max(last, s2 + FALL + HAND);
        arr.set([
          s ? s.x : (rand() - 0.5) * 40, s ? s.y : 120 + 160 * rand(),
          mx, 0,
          d ? d.x : 0, d ? d.y : 0,
          s ? s.r : 0.9, s ? s.g : 0.9, s ? s.b : 0.88,
          d ? d.r : 0.9, d ? d.g : 0.9, d ? d.b : 0.88,
          s1, s2, depth, r,
          s ? 1 : 0, d ? d.kind : 2, hand,
        ], i * STRIDE);
      }
      g.end = Math.max(last, g.liftEnd);

      gl.bindVertexArray(ptVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      const attrs: [string, number][] = [['aSrc', 2], ['aMid', 2], ['aDst', 2], ['aCol0', 3], ['aCol1', 3], ['aTime', 4], ['aFlags', 3]];
      let off = 0;
      for (const [name, size] of attrs) {
        const loc = gl.getAttribLocation(ptProg, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4);
        off += size;
      }
      gl.bindVertexArray(null);
      g.count = n;

      const host = photoImg?.closest('picture')?.parentElement;
      if (host && !portrait) portrait = createPortraitBuild(host, PHOTO_SRC);
      g.built = true;
    };

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // DOM side: opacity and one transform, cleared entirely outside the gate.
    // Writes only on change, so a scroll frame touches just what moved.
    const written = new WeakMap<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement, prop: 'opacity' | 'transform', v: string) => {
      const w = written.get(el) ?? {};
      if (w[prop] === v) return;
      w[prop] = v;
      written.set(el, w);
      el.style[prop] = v;
    };
    let domActive = false;
    const clearDom = () => {
      if (!domActive) return;
      domActive = false;
      for (const el of [hero, horizon, ...g.blocks, ...(photoFrame ? [photoFrame] : [])]) put(el, 'opacity', '');
      put(about, 'transform', '');
    };

    let raf = 0;
    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
    };

    const frame = () => {
      raf = 0;
      if (!g.built) return;
      const vh = window.innerHeight, sy = window.scrollY;

      // the portrait: dither while it is in the lower half of the screen,
      // the photo once its centre has passed the middle (both directions)
      if (portrait && photoImg && photoFrame) {
        if (sy <= S0) {
          portrait.draw(0, 1);
          photoImg.style.opacity = '';
        } else {
          const r = photoFrame.getBoundingClientRect();
          const built = clamp01((sy - g.photoA) / (g.photoB - g.photoA));
          // never the photo before the dither is fully poured, in either direction
          const resolve = built < 1 ? 0 : smooth(vh * 0.5 + 40, vh * 0.5 - 60, (r.top + r.bottom) / 2);
          portrait.draw(built, resolve);
          put(photoImg, 'opacity', resolve > 0 ? '1' : '0');
        }
      }

      if (sy <= S0 || sy >= g.end) {
        clearDom();
        if (sy >= g.end) {
          // past the gate: the line has flown off, the hero is gone while still on screen
          domActive = true;
          horizon.style.opacity = '0';
          if (hero.getBoundingClientRect().bottom > 0) hero.style.opacity = '0';
        }
        show(false);
        return;
      }

      domActive = true;
      const lineY = lineAt(sy);
      const lineOn = smooth(S0, S0 + 12, sy) * (1 - smooth(S0 + LINE_LEN * 0.85, S0 + LINE_LEN, sy));
      const lift = liftAt(sy);
      put(horizon, 'opacity', '0');
      put(hero, 'opacity', (1 - smooth(S0, S0 + HERO_LOCK, sy)).toFixed(2));
      put(about, 'transform', lift > 0.05 ? `translateY(${(-lift).toFixed(1)}px)` : '');
      g.blocks.forEach((el, i) => {
        if (g.done[i] >= 0) put(el, 'opacity', smooth(g.done[i], g.done[i] + HAND, sy).toFixed(2));
      });
      if (photoFrame) put(photoFrame, 'opacity', smooth(g.photoA - 10, g.photoA + 20, sy).toFixed(2));

      const charge = Math.max(0.35, smooth(S0, FLASH_AT, sy) * (1 - smooth(FLASH_AT + 20, S0 + LINE_LEN * 0.6, sy))) * lineOn;
      const flash = Math.exp(-Math.pow((sy - FLASH_AT) / 12, 2)) * lineOn;
      const hz = horizon.getBoundingClientRect();

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(lineProg);
      gl.bindVertexArray(quadVao);
      gl.uniform2f(lu.res, canvas.width, canvas.height);
      gl.uniform1f(lu.dpr, dpr);
      gl.uniform1f(lu.line, lineY * dpr);
      gl.uniform2f(lu.span, hz.left * dpr, hz.right * dpr);
      gl.uniform1f(lu.charge, charge);
      gl.uniform1f(lu.flash, flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(ptProg);
      gl.bindVertexArray(ptVao);
      gl.uniform1f(pu.sy, sy);
      gl.uniform1f(pu.line, sy + lineY);
      gl.uniform1f(pu.on, lineOn);
      gl.uniform1f(pu.lift, lift);
      gl.uniform1f(pu.dpr, dpr);
      gl.uniform2f(pu.view, window.innerWidth, vh);
      gl.drawArrays(gl.POINTS, 0, g.count);
      show(true);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // Sample once the page has settled (fonts, hero scramble, photo), and
    // again after a resize. Sampling reads the DOM in its natural state.
    let buildTimer = 0;
    const rebuild = (delay: number) => {
      clearTimeout(buildTimer);
      buildTimer = window.setTimeout(() => {
        clearDom();
        about.style.transform = '';
        build();
        schedule();
      }, delay);
    };
    let dead = false;
    Promise.all([document.fonts.ready, photo.decode().catch(() => undefined)]).then(() => {
      if (!dead) rebuild(900);
    });
    const onResize = () => { resize(); rebuild(250); };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      dead = true;
      clearTimeout(buildTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      clearDom();
      if (photoImg) photoImg.style.opacity = '';
      portrait?.destroy();
      // no loseContext(): on macOS Chrome it blanks the window for a frame (#119)
      gl.deleteBuffer(buf);
      gl.deleteProgram(lineProg);
      gl.deleteProgram(ptProg);
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
