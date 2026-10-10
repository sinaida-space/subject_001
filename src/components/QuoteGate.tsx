// ─────────────────────────────────────────────────────────────────────────
// Quote gate: hero → belief → About.
//
// Everything is a pure function of the scroll position (css px), so
// scrolling back plays the same frames in reverse and nothing moves at rest.
//
//   wind     the hero locks into 3 px dither cells on the first wheel tick and
//            is blown off to the right as stars, while "I believe" blows in
//            from the left and sets in the middle of the screen
//   lines    the stage pins; the other four lines blow in one by one, then
//            "seen" and "connected" light red
//   pour     the belief comes apart into a cloud that drifts up; the stage
//            lets go and About rises. Every About letter is poured from the
//            cloud as it scrolls in, and part of the dust falls down into the
//            portrait slot: the site's image dither develops where it lands,
//            scrolls on as red dither, and resolves into the photo once its
//            centre passes the middle of the screen (as on the live gate)
//
// Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortraitBuild, type PortraitBuild } from '@/components/portraitBuild';
import { primeImages, sampleText } from '@/lib/sampleText';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const CELL = 3; // css px, the site's dither cell
// Phones get a lighter gate: fewer cells, no bloom, 1x density.
const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
const CAP = LIGHT ? { hero: 2600, quote: 3200, about: 3600 } : { hero: 9000, quote: 9000, about: 14000 };
const PHOTO_SRC = '/sinaida-photo-600.jpg';

// All in css px of scroll.
const S0 = 16; // the first wheel tick starts it
const HERO_LOCK = 30; // the headline hands over to its cells
const HERO_BLOW = 260; // how long a hero cell takes to blow off screen
const FALL = 110; // a poured About cell falls into its letter
const FALL_PHOTO = 150; // a portrait cell falls into the slot
const SHED_AT = LIGHT ? 1.15 : 1.02; // poured once its letter is this far down the screen (in vh)
const HAND = 24; // a finished block fades in over this much scroll
const DRIFT = 260; // how far the cloud rises at most, css px

// The pinned part, as shares of the pin length (track height minus a screen).
// LINES: when each line of the belief has set (line 1 sets as the stage pins).
const LINES = [0, 0.1, 0.19, 0.27, 0.35];
const LINE_IN = 0.12; // a line blows in over this share
const PIN = {
  seen: [0.39, 0.45],
  conn: [0.45, 0.51],
  pour: 0.58, // the belief comes apart
  cloud: 0.92, // its cloud has spread by here
};

const PT_VS = `#version 300 es
in vec2 aA;     // hero: screen px at lock; quote: start off screen left; About: its dust in the cloud
in vec2 aB;     // quote: its letter on the pinned screen
in vec2 aC;     // quote: its portrait cell (page px), or the cloud's drift; About: its letter, page px
in vec3 aCol;
in vec4 aT;     // t1, t2, depth, rnd
in vec3 aK;     // kind (0 About, 1 hero, 2 quote→portrait, 3 quote→cloud); About: hand-over; quote: line set, flight length
uniform float uSy;
uniform vec2 uView;
uniform float uDpr;
uniform vec2 uGather;     // the belief comes apart; how long a cloud cell takes to spread
out vec3 vCol;
out float vAlpha;
out float vRound;
out float vBloom;

const float PI = 3.14159;
const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);

void main() {
  float kind = aK.x;
  float rnd = aT.w, depth = aT.z;
  vec2 pos;
  vec3 col = aCol;
  float alpha = 0.0, flight = 0.0;
  vec3 star = mix(vec3(0.95, 0.93, 0.9), vec3(0.85, 0.12, 0.2), step(0.8, rnd)) * mix(0.55, 1.0, depth);
  // the cloud the belief leaves behind rises slowly with the scroll
  float rise = min(${DRIFT}.0, max(0.0, uSy - uGather.x) * 0.3) * mix(0.5, 1.0, depth);

  if (kind < 0.5) {
    // About: from the cloud into its letter as the letter scrolls in
    vec2 a = aA + vec2((rnd - 0.5) * 0.3, -1.0) * rise;
    vec2 dst = aC - vec2(0.0, uSy);
    float t = smoothstep(aT.y, aT.y + ${FALL}.0, uSy);
    pos = mix(a, dst, t * t);
    pos.x += sin(t * PI) * (rnd - 0.5) * 60.0;
    flight = 1.0 - smoothstep(0.75, 1.0, t);
    col = mix(star, aCol, 1.0 - flight);
    alpha = step(uGather.x, uSy) * (1.0 - step(aK.y, uSy));
  } else if (kind < 1.5) {
    // hero: locks, then the wind takes it off to the right
    float t = clamp((uSy - aT.x) / ${HERO_BLOW}.0, 0.0, 1.0);
    float e = t * t;
    pos = aA + vec2(e * (uView.x * 1.15 + rnd * 300.0), sin(t * PI) * (rnd - 0.5) * 90.0 - e * 50.0 * (fract(rnd * 13.1) - 0.3));
    flight = smoothstep(0.0, 0.25, t);
    col = mix(aCol, star, flight);
    alpha = step(rnd, (uSy - ${S0}.0) / ${HERO_LOCK}.0 + 0.02) * (1.0 - smoothstep(0.7, 1.0, t));
  } else {
    // the belief: blows in from the left line by line, sets, then comes apart
    float t1 = clamp((uSy - aT.x) / aK.z, 0.0, 1.0);
    float e1 = 1.0 - pow(1.0 - t1, 3.0);
    vec2 a = mix(aA, aB, e1);
    a.y += sin(t1 * PI) * (rnd - 0.5) * 70.0;
    float t2 = clamp((uSy - aT.y) / uGather.y, 0.0, 1.0);
    float e2 = t2 * t2 * (3.0 - 2.0 * t2);
    float apart = step(uGather.x, uSy);
    if (kind < 2.5) {
      // waits in the cloud, then falls into the portrait slot as it comes up;
      // the DOM dither develops where it lands
      float tp = clamp((uSy - aT.y) / ${FALL_PHOTO}.0, 0.0, 1.0);
      vec2 dst = aC - vec2(0.0, uSy);
      pos = mix(a + vec2((rnd - 0.5) * 0.3, -1.0) * rise, dst, tp * tp);
      pos.x += sin(tp * PI) * (rnd - 0.5) * 50.0;
      col = mix(aCol, RED_HOT, tp);
      alpha = apart * (1.0 - step(aT.y + ${FALL_PHOTO}.0, uSy));
      e2 = tp;
      t2 = tp;
    } else {
      // into the rising cloud, fading as the About letters take its place
      pos = a + vec2((rnd - 0.5) * 0.3, -1.0) * rise + aC * e2;
      alpha = apart * (1.0 - 0.7 * e2);
    }
    float arriving = step(aT.x, uSy) * (1.0 - step(aK.y, uSy));
    alpha = max(alpha, arriving);
    float fa = (1.0 - smoothstep(0.7, 1.0, t1)) * arriving;
    float fg = smoothstep(0.0, 0.15, t2) * (1.0 - smoothstep(0.8, 1.0, t2)) * apart;
    flight = max(fa, fg);
    col = mix(col, star, fa);
  }

  float bloom = ${LIGHT ? '0.0' : 'step(0.93, fract(rnd * 7.13)) * step(0.5, flight)'};
  float cellPx = max(1.0, floor(3.0 * uDpr - 0.5));
  gl_PointSize = max(1.0, floor(mix(cellPx, mix(1.2, 3.6, depth) * uDpr, flight) * (1.0 + 3.0 * bloom) + 0.5));

  vCol = col;
  vAlpha = alpha;
  vRound = flight;
  vBloom = bloom;
  gl_Position = vec4(pos.x / uView.x * 2.0 - 1.0, 1.0 - pos.y / uView.y * 2.0, 0.0, 1.0);
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

// ── sampling ──────────────────────────────────────────────────────────────

const bayer8 = (x: number, y: number) => {
  let v = 0;
  for (let bit = 0, s = 1; bit < 3; bit++, s *= 4) {
    const xb = (x >> bit) & 1, yb = (y >> bit) & 1;
    v += ((xb ^ yb) * 2 + yb) * (16 / s);
  }
  return v / 64;
};

// the portrait as 1-bit dither on the 3 px grid, as offsets from its centre
function samplePhoto(img: HTMLImageElement, w: number, h: number): { x: number; y: number }[] {
  w = Math.ceil(w); h = Math.ceil(h);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx || w < 1) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const out: { x: number; y: number }[] = [];
  for (let y = 1; y < h; y += CELL) {
    for (let x = 1; x < w; x += CELL) {
      const k = (y * w + x) * 4;
      const lum = (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) / 255;
      if (Math.min(1, Math.max(0, (lum - 0.25) * 1.6)) <= bayer8(x / CELL | 0, y / CELL | 0)) continue;
      out.push({ x: x - w / 2, y: y - h / 2 });
    }
  }
  return out;
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

function thin<T>(arr: T[], max: number, rand: () => number) {
  return arr.length <= max ? arr : arr.filter(() => rand() < max / arr.length);
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

type StyleProp = 'opacity' | 'color' | 'text-shadow';

export default function QuoteGate({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    // the hero sits right before the gate in the page
    const hero = root?.previousElementSibling as HTMLElement | null;
    const track = root?.querySelector<HTMLElement>('[data-quote-track]');
    const stage = root?.querySelector<HTMLElement>('[data-quote-stage]');
    const quote = root?.querySelector<HTMLElement>('[data-quote]');
    const seen = root?.querySelector<HTMLElement>('[data-seen]');
    const conn = root?.querySelector<HTMLElement>('[data-connected]');
    const about = root?.querySelector<HTMLElement>('#about');
    if (!root || !canvas || !hero || !track || !stage || !quote || !seen || !conn || !about) return;
    const lines = Array.from(quote.querySelectorAll<HTMLElement>('[data-line]'));
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    let prog: WebGLProgram;
    try {
      prog = link(gl, PT_VS, PT_FS);
    } catch (e) {
      console.error('QuoteGate:', e);
      return;
    }
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { sy: U('uSy'), view: U('uView'), dpr: U('uDpr'), gather: U('uGather') };
    const vao = gl.createVertexArray();
    const buf = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const photo = new Image();
    photo.src = PHOTO_SRC;
    const photoImg = about.querySelector<HTMLImageElement>('picture img');
    const photoFrame = about.querySelector<HTMLElement>('.photo-frame-wrapper');
    const rules = Array.from(about.querySelectorAll<HTMLElement>('[data-rule]'));
    let portrait: PortraitBuild | null = null;

    // Layout, measured at build time (page px unless noted).
    const g = {
      built: false, count: 0, end: 0,
      pin0: 0, pinLen: 1, lineSet: [] as number[], pour: 0, gatherLen: 1,
      photoA: 0, photoB: 1,
      seen: [0, 0], conn: [0, 0],
      slotC: { x: 0, y: 0 }, half: { w: 0, h: 0 },
      ruleY: [] as number[],
      blocks: [] as HTMLElement[], done: [] as number[],
    };
    const at = (share: number) => g.pin0 + g.pinLen * share;

    const build = () => {
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY;
      const rand = rng(121);

      const trackBox = track.getBoundingClientRect();
      g.pin0 = trackBox.top + sy;
      g.pinLen = Math.max(1, trackBox.height - vh);
      g.lineSet = LINES.map(at);
      g.seen = [at(PIN.seen[0]), at(PIN.seen[1])];
      g.conn = [at(PIN.conn[0]), at(PIN.conn[1])];
      g.pour = at(PIN.pour);
      g.gatherLen = (at(PIN.cloud) - g.pour) * 0.6;
      const pinEnd = g.pin0 + g.pinLen;
      // when each line starts blowing in: "I believe" while the hero blows away
      const q0 = S0 + 50;
      const lineFrom = g.lineSet.map((set, k) => (k === 0 ? q0 : set - g.pinLen * LINE_IN));

      // portrait: poured while its slot rises from the bottom edge to just
      // past the middle of the screen
      const fr = photoFrame?.getBoundingClientRect();
      g.half = { w: (fr?.width ?? 200) / 2, h: (fr?.height ?? 200) / 2 };
      g.slotC = { x: fr ? fr.left + fr.width / 2 : vw / 2, y: fr ? fr.top + sy + fr.height / 2 : pinEnd + vh };
      const slotTop = g.slotC.y - g.half.h;
      g.photoA = Math.max(g.pour + 60, pinEnd - vh * 0.1, slotTop - vh * 1.0);
      g.photoB = Math.max(g.photoA + 200, slotTop - vh * 0.5);
      g.ruleY = rules.map((el) => el.getBoundingClientRect().top + sy);

      // hero cells, frozen on screen where they stand at the first tick
      const heroBox = hero.getBoundingClientRect();
      const skipHero = (el: Element) => !!el.closest('.sr-only, .hero-ghost, .hero-noise, .hero-whisper, button:not(.hl-word)');
      const heroCells = thin(sampleText(hero, skipHero, heroBox, true), CAP.hero, rand);

      // quote cells, as they sit on the pinned screen, tagged with their line
      const qBox = quote.getBoundingClientRect();
      const stageTop = stage.getBoundingClientRect().top + sy;
      const lineOf = (el: Element) => Number((el.closest('[data-line]') as HTMLElement | null)?.dataset.line ?? 0);
      const qCells = thin(sampleText(quote, () => false, qBox, false, lineOf), CAP.quote, rand);

      // About cells, block by block (the portrait is built apart)
      const aboutBox = about.getBoundingClientRect();
      g.blocks = Array.from(about.querySelectorAll<HTMLElement>('h2, h3, p, span, div')).filter((el) => !el.closest('.photo-frame-wrapper') && !el.hasAttribute('data-rule'));
      const blockOf = (el: Element) => {
        const b = el.closest('h2, h3, p, span, div');
        const i = b ? g.blocks.indexOf(b as HTMLElement) : -1;
        return i < 0 ? 254 : i;
      };
      const aboutCells = thin(sampleText(about, (el) => !!el.closest('.sr-only, .photo-frame-wrapper'), aboutBox, false, blockOf), CAP.about, rand);

      const face = photo.complete && photo.naturalWidth ? samplePhoto(photo, g.half.w * 2, g.half.h * 2) : [];

      const STRIDE = 2 + 2 + 2 + 3 + 4 + 3;
      const nQuote = Math.max(qCells.length, face.length);
      const n = aboutCells.length + heroCells.length + nQuote;
      const arr = new Float32Array(n * STRIDE);
      let i = 0;
      const push = (v: number[]) => { arr.set(v, i * STRIDE); i++; };

      // About: each letter takes a grain of the belief's cloud as it scrolls in
      g.done = new Array(g.blocks.length).fill(-1);
      const sheds = aboutCells.map((c) => Math.max(c.y - vh * SHED_AT, pinEnd - vh * 0.1, g.pour + 40) + rand() * 30);
      aboutCells.forEach((c, k) => {
        if (c.blk !== undefined && c.blk < g.blocks.length) g.done[c.blk] = Math.max(g.done[c.blk], sheds[k] + FALL);
      });
      let last = g.photoB + FALL_PHOTO + 60;
      aboutCells.forEach((c, k) => {
        const from = qCells.length ? qCells[Math.floor(rand() * qCells.length)] : null;
        const hand = c.blk !== undefined && c.blk < g.blocks.length ? g.done[c.blk] + rand() * 18 : 1e9;
        last = Math.max(last, sheds[k] + FALL + HAND);
        push([
          from ? from.x : rand() * vw, from ? from.y - stageTop : vh * 0.5,
          0, 0,
          c.x, c.y,
          c.r, c.g, c.b,
          0, sheds[k], rand(), rand(),
          0, hand, 1,
        ]);
      });
      g.end = last;

      // hero: the wind front sweeps left to right
      for (const c of heroCells) {
        const s1 = S0 + 10 + 140 * clamp01(c.x / vw) + 40 * rand();
        push([c.x, c.y - S0, 0, 0, 0, 0, c.r, c.g, c.b, s1, 0, rand(), rand(), 1, 0, 1]);
      }

      // quote: each line blows in over its own window; every portrait cell
      // gets a letter cell to come from, the rest join the cloud
      const order = qCells.map((_, k) => k).sort(() => rand() - 0.5);
      const faceH = Math.max(1, g.half.h * 2);
      for (let k = 0; k < nQuote && qCells.length; k++) {
        const c = qCells[order[k % qCells.length]];
        const line = Math.min(LINES.length - 1, c.blk ?? 0);
        const from = lineFrom[line], set = g.lineSet[line];
        const len = (set - from) * 0.6;
        const s = from + (set - from - len) * rand();
        const f = k < face.length ? face[k] : null;
        // portrait cells land top row first, like stars falling onto it
        const sg = f
          ? g.photoA + (g.photoB - g.photoA) * clamp01((f.y + g.half.h) / faceH * 0.85 + rand() * 0.15)
          : g.pour + (at(PIN.cloud) - g.pour - g.gatherLen) * rand();
        push([
          -40 - rand() * vw * 0.45, c.y - stageTop + (rand() - 0.5) * 160,
          c.x, c.y - stageTop,
          f ? g.slotC.x + f.x : (rand() - 0.5) * 160, f ? g.slotC.y + f.y : -rand() * 120,
          c.r, c.g, c.b,
          s, sg, rand(), rand(),
          f ? 2 : 3, set, Math.max(1, len),
        ]);
      }
      g.count = i;

      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, arr.subarray(0, i * STRIDE), gl.STATIC_DRAW);
      const attrs: [string, number][] = [['aA', 2], ['aB', 2], ['aC', 2], ['aCol', 3], ['aT', 4], ['aK', 3]];
      let off = 0;
      for (const [name, size] of attrs) {
        const loc = gl.getAttribLocation(prog, name);
        if (loc >= 0) {
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4);
        }
        off += size;
      }
      gl.bindVertexArray(null);

      const host = photoImg?.closest('picture')?.parentElement;
      if (host && !portrait) portrait = createPortraitBuild(host, PHOTO_SRC);
      g.built = true;
    };

    let dpr = 1;
    const resize = () => {
      dpr = LIGHT ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // DOM side: a few style props, written only on change, cleared outside the gate.
    const written = new WeakMap<HTMLElement, Partial<Record<StyleProp, string>>>();
    const put = (el: HTMLElement, prop: StyleProp, v: string) => {
      const w = written.get(el) ?? {};
      if (w[prop] === v) return;
      w[prop] = v;
      written.set(el, w);
      el.style.setProperty(prop, v);
    };
    const managed = () => [hero, quote, seen, conn, ...lines, ...g.blocks, ...rules, ...(photoFrame ? [photoFrame] : [])];
    let domActive = false;
    const clearDom = (force = false) => {
      if (!domActive && !force) return;
      domActive = false;
      for (const el of managed()) {
        put(el, 'opacity', '');
        put(el, 'color', '');
        put(el, 'text-shadow', '');
      }
    };
    // a word lights red with the neon halo, by how far the scroll has got
    const light = (el: HTMLElement, f: number) => {
      const q = Math.round(f * 20) / 20;
      put(el, 'color', q > 0 ? `color-mix(in srgb, hsl(var(--primary-legible)) ${q * 100}%, hsl(var(--foreground)))` : '');
      put(el, 'text-shadow', q > 0 ? `0 0 ${(6 * q).toFixed(1)}px rgba(255,60,60,${(0.7 * q).toFixed(2)}), 0 0 ${(18 * q).toFixed(1)}px rgba(205,0,0,${(0.6 * q).toFixed(2)})` : '');
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
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY;
      if (portrait && photoImg && photoFrame) {
        if (sy <= S0) {
          portrait.draw(0, 1);
          put(photoImg as HTMLElement, 'opacity', '');
        } else {
          // the dither develops as its cells land, stays red while it scrolls
          // in the lower half, then resolves into the photo past the middle
          const built = clamp01((sy - g.photoA) / (g.photoB + FALL_PHOTO - g.photoA));
          const r = photoFrame.getBoundingClientRect();
          const resolve = built < 1 ? 0 : smooth(vh * 0.5 + 40, vh * 0.5 - 60, (r.top + r.bottom) / 2);
          portrait.draw(Math.round(built * 48) / 48, Math.round(resolve * 48) / 48);
          put(photoImg as HTMLElement, 'opacity', resolve > 0 ? '1' : '0');
        }
      }

      if (sy <= S0 || sy >= g.end) {
        clearDom();
        if (sy >= g.end) {
          // past the gate: what became dust stays gone while it is still on screen
          domActive = true;
          if (hero.getBoundingClientRect().bottom > 0) put(hero, 'opacity', '0');
          if (stage.getBoundingClientRect().bottom > 0) put(quote, 'opacity', '0');
        }
        show(false);
        return;
      }

      domActive = true;
      put(hero, 'opacity', (1 - smooth(S0, S0 + HERO_LOCK, sy)).toFixed(2));
      put(quote, 'opacity', sy >= g.pour ? '0' : '');
      lines.forEach((el, k) => put(el, 'opacity', sy < (g.lineSet[k] ?? 0) ? '0' : ''));
      light(seen, smooth(g.seen[0], g.seen[1], sy));
      light(conn, smooth(g.conn[0], g.conn[1], sy));
      g.blocks.forEach((el, k) => {
        if (g.done[k] >= 0) put(el, 'opacity', smooth(g.done[k], g.done[k] + HAND, sy).toFixed(2));
      });
      // the table's hairlines draw in as they scroll in
      rules.forEach((el, k) => put(el, 'opacity', smooth(g.ruleY[k] - vh * 0.98, g.ruleY[k] - vh * 0.8, sy).toFixed(2)));
      if (photoFrame) put(photoFrame, 'opacity', smooth(g.photoA - 10, g.photoA + 20, sy).toFixed(2));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.sy, sy);
      gl.uniform2f(u.view, vw, vh);
      gl.uniform1f(u.dpr, dpr);
      gl.uniform2f(u.gather, g.pour, g.gatherLen);
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
        clearDom(true);
        build();
        schedule();
      }, delay);
    };
    let dead = false;
    Promise.all([document.fonts.ready, photo.decode().catch(() => undefined)]).then(() => {
      if (!dead) primeImages(hero).then(() => { if (!dead) rebuild(900); });
    });
    const onDither = () => primeImages(hero).then(() => { if (!dead) rebuild(0); });
    window.addEventListener('hero-dither', onDither);
    const onResize = () => { resize(); rebuild(250); };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      dead = true;
      clearTimeout(buildTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('hero-dither', onDither);
      clearDom(true);
      if (photoImg) photoImg.style.opacity = '';
      portrait?.destroy();
      // no loseContext(): on macOS Chrome it blanks the window for a frame (#119)
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
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
