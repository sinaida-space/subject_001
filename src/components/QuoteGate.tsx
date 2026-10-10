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
//            "feel" flashes red just before the belief comes apart ("seen"
//            and "connected" stay white)
//   gust     a gust from the lower left lifts the belief apart and carries
//            it off along a diagonal arc, up and to the right, out of the
//            screen ("feel" flies off red); the stage lets go and About rises.
//            The same gust brings dust in from off screen lower left: every
//            About letter is poured from it as it scrolls in, and the
//            portrait's dither rides it into its frame and settles into a
//            square (the frame appears only then) where the photo docks
//            (sticky at md+); there it develops as soft red dither and lights
//            up cell by cell into the photo while only the text moves
//
// Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortraitBuild, type PortraitBuild } from '@/components/portraitBuild';
import { primeImages, sampleText } from '@/lib/sampleText';
import { GALAXY_GLSL } from '@/lib/galaxy';

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
const FORM = 0.25; // the portrait cells land over this much scroll (in vh)
const FORMED_AT = 0.95; // the square is whole once the frame's bottom is this far down the screen (in vh)
const RED = 0.08, COLOUR = 0.3; // then soft red dither, then the colour, done by here (in vh of scroll)
const FRAME_IN = 24; // the frame fades in over this much scroll once 90% have landed
const SHED_AT = LIGHT ? 1.25 : 1.14; // poured once its letter is this far down the screen (in vh)
const HAND = 24; // a finished block fades in over this much scroll
const GUST = 0.45; // a belief cell crosses the screen over this share of the gust window
const WIND = 0.6; // About dust rides the wind at this many px per px of scroll before it pours
const REBUILD_DH = 150; // a height-only resize smaller than this (mobile toolbars) keeps the build

// The pinned part, in screen heights of scroll from the moment the stage pins.
// The track overlaps the hero's lower part and lets go a little before the pour
// (QuoteStage), so the belief blows in while the hero is still leaving and
// About rises while the gust is still crossing: no empty screen either side.
// LINES: when each line of the belief has set (line 1 sets as the stage pins).
const LINES = [0, 0.09, 0.18, 0.27, 0.36];
const LINE_IN = 0.16; // a line blows in over this much scroll
const FEEL_ID = 5; // block id the sampler gives the cells of "feel"
const PIN = {
  feel: [0.656, 0.728], // "feel" flashes red (ramps in over the first quarter) until the pour
  pour: 0.728, // the gust takes the belief apart
  cloud: 1.36, // and every cell of it has left the screen by here
};
// a hero cell stays a crisp dither cell over this share of its way off, then turns into a star
const HERO_CRISP = 0.4;
// a belief cell stays crisp over this share of its blow-in, and of its way out with the gust
const BELIEF_CRISP = 0.35, GUST_CRISP = 0.5;

const PT_VS = `#version 300 es
in vec2 aA;     // hero: screen px at lock; belief: start off screen left; About: where it pours from (screen px); portrait: its way in (shares of the screen)
in vec2 aB;     // belief: its letter on the pinned screen; portrait: x how high the gust lifts it (share of the screen)
in vec2 aC;     // belief: how much further the gust takes it (px); portrait: its offset from the frame's centre; About: its letter, page px
in vec3 aCol;
in vec4 aT;     // t1, t2, depth, rnd
in vec4 aK;     // kind (0 About, 1 hero, 2 portrait, 3 belief); About: hand-over; belief: line set, flight length, 1 for "feel"
in float aL;    // portrait cells: when it lands in the square
uniform float uSy;
uniform vec2 uView;
uniform float uDpr;
uniform vec2 uGather;     // the gust takes the belief apart; how long a belief cell takes to leave
uniform vec2 uSlot;       // the portrait frame's centre on screen, now (it docks and sticks)
uniform vec2 uDev;        // the settled portrait cells give way to the red dither over these scroll px
uniform vec2 uRel;       // the stage lets go at x (scroll px): the belief rides up with it until the pour at y, then the gust has it
out vec3 vCol;
out float vAlpha;
out float vRound;
out float vBloom;

const float PI = 3.14159;
const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);
${GALAXY_GLSL}
void main() {
  float kind = aK.x;
  float rnd = aT.w, depth = aT.z;
  vec2 pos;
  vec3 col = aCol;
  // flight: 0 in a formation (a crisp dither cell), 1 as a star.
  // lit: in a formation every cell shows; in flight or in the cloud only the
  // galaxy's share stays lit, the rest fade out over the first 15% of flight.
  float alpha = 0.0, flight = 0.0, lit = 1.0;
  vec3 star = galaxyColor(rnd, depth);
  float keep = galaxyKeep(rnd);
  // the gust blows from the lower left, up and to the right
  const vec2 WIND_DIR = vec2(0.91, -0.41);

  if (kind < 0.5) {
    // About: dust rides the gust in from the lower left until its letter
    // scrolls in, then pours down into the letter (a curve, no turning back)
    vec2 dst = aC - vec2(0.0, uSy);
    vec2 a = aA - WIND_DIR * max(0.0, aT.y - uSy) * ${WIND};
    float t = smoothstep(aT.y, aT.y + ${FALL}.0, uSy);
    vec2 ctl = aA + WIND_DIR * 50.0;
    pos = mix(mix(a, ctl, t), mix(ctl, dst, t), t);
    flight = 1.0 - smoothstep(0.75, 1.0, t);
    col = mix(star, aCol, 1.0 - flight);
    lit = mix(1.0, keep, flight);
    alpha = smoothstep(uGather.x, uGather.x + 80.0, uSy) * (1.0 - step(aK.y, uSy));
  } else if (kind < 1.5) {
    // hero: locks, then the wind takes it off to the right
    float t = clamp((uSy - aT.x) / ${HERO_BLOW}.0, 0.0, 1.0);
    float e = t * t;
    pos = aA + vec2(e * (uView.x * 1.15 + rnd * 300.0), sin(t * PI) * (rnd - 0.5) * 90.0 - e * 50.0 * (fract(rnd * 13.1) - 0.3));
    flight = smoothstep(${HERO_CRISP}, ${HERO_CRISP} + 0.25, t);
    col = mix(aCol, star, flight);
    lit = mix(1.0, keep, smoothstep(${HERO_CRISP}, ${HERO_CRISP} + 0.15, t));
    alpha = step(rnd, (uSy - ${S0}.0) / ${HERO_LOCK}.0 + 0.02) * (1.0 - smoothstep(0.7, 1.0, t));
  } else if (kind < 2.5) {
    // portrait: the gust carries it in from off screen lower left, lifts it
    // and drops it into the square (the photo's own 1-bit dither), wherever
    // the frame is now. Until its row is on screen it aims at the bottom edge.
    vec2 end = uSlot + aC;
    float tp = clamp((uSy - aT.y) / max(1.0, aL - aT.y), 0.0, 1.0);
    vec2 tgt = mix(vec2(end.x, min(end.y, uView.y * 0.97)), end, smoothstep(0.75, 1.0, tp));
    vec2 src = vec2(min(-20.0, tgt.x - aA.x * uView.x), uView.y * (1.0 + aA.y) + 20.0);
    vec2 ctl = vec2(mix(src.x, tgt.x, 0.6), min(src.y, tgt.y) - aB.x * uView.y);
    float e = tp * tp * (3.0 - 2.0 * tp);
    pos = mix(mix(src, ctl, e), mix(ctl, tgt, e), e);
    // a star in the air, every cell again as it lands in the formation
    flight = 1.0 - smoothstep(0.75, 1.0, tp);
    lit = mix(1.0, keep, flight);
    col = mix(star, RED_HOT, smoothstep(0.6, 1.0, tp));
    alpha = step(uGather.x, uSy) * step(aT.y, uSy) * (1.0 - smoothstep(uDev.x, uDev.y, uSy));
  } else {
    // the belief: blows in from the left line by line, sets, then the gust
    // lifts it off along an arc, up and to the right, out of the screen
    float t1 = clamp((uSy - aT.x) / aK.z, 0.0, 1.0);
    float e1 = 1.0 - pow(1.0 - t1, 3.0);
    vec2 a = mix(aA, aB, e1);
    a.y += sin(t1 * PI) * (rnd - 0.5) * 70.0;
    float tc = clamp((uSy - aT.y) / uGather.y, 0.0, 1.0);
    float u = tc * tc;  // picks up speed like a leaf in a gust
    pos = a + vec2(u * (uView.x * 1.05 + aC.x), -pow(u, 1.7) * (uView.y * 0.55 + aC.y) - clamp(uSy - uRel.x, 0.0, max(0.0, uRel.y - uRel.x)));
    pos.y += sin(tc * PI) * (rnd - 0.5) * 24.0;
    flight = smoothstep(${GUST_CRISP}, ${GUST_CRISP} + 0.15, tc);
    lit = mix(1.0, keep, flight);
    alpha = step(uGather.x, uSy);
    // its letter's colour turns to its star colour; "feel" flies apart red
    // and turns over the first 30% of its flight
    col = aK.w > 0.5 ? mix(RED_HOT, star, smoothstep(0.0, 0.3, tc)) : mix(aCol, star, flight);
    // blowing in, before the line sets: a star until it nears its letter
    float arriving = step(aT.x, uSy) * (1.0 - step(aK.y, uSy));
    if (arriving > 0.5) {
      flight = 1.0 - smoothstep(${BELIEF_CRISP}, ${BELIEF_CRISP} + 0.4, t1);
      col = mix(aCol, star, flight);
      lit = mix(1.0, keep, flight);
      alpha = 1.0;
    }
  }

  alpha *= lit;
  float bloom = ${LIGHT ? '0.0' : 'galaxyBright(rnd) * step(0.5, flight)'};
  float cellPx = max(1.0, floor(3.0 * uDpr - 0.5));
  gl_PointSize = max(1.0, floor(mix(cellPx, galaxySize(rnd, depth) * uDpr, flight) * (1.0 + 3.0 * bloom) + 0.5));

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

type StyleProp = 'opacity' | 'color' | 'text-shadow' | 'border-color' | 'box-shadow';
const TEXT_PROPS: StyleProp[] = ['opacity', 'color', 'text-shadow'];

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
    const feel = root?.querySelector<HTMLElement>('[data-feel]');
    const about = root?.querySelector<HTMLElement>('#about');
    if (!root || !canvas || !hero || !track || !stage || !quote || !feel || !about) return;
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
    const u = { sy: U('uSy'), view: U('uView'), dpr: U('uDpr'), gather: U('uGather'), slot: U('uSlot'), dev: U('uDev'), rel: U('uRel') };
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
      feel: [0, 0], vh: 1, w: 0, h: 0,
      half: { w: 0, h: 0 },
      frameOn: 0, red: [0, 1], colour: [0, 1],
      ruleY: [] as number[],
      blocks: [] as HTMLElement[], done: [] as number[],
    };
    const at = (screens: number) => g.pin0 + g.vh * screens;

    const build = () => {
      // the pinned stage is 100svh: a screen height that mobile toolbars
      // do not change, so a rebuild lands everything in the same place
      const vw = window.innerWidth, vh = stage.offsetHeight || window.innerHeight, sy = window.scrollY;
      g.vh = vh; g.w = vw; g.h = window.innerHeight;
      const rand = rng(121);

      const trackBox = track.getBoundingClientRect();
      g.pin0 = trackBox.top + sy;
      g.pinLen = Math.max(1, trackBox.height - vh);
      g.lineSet = LINES.map(at);
      g.feel = [at(PIN.feel[0]), at(PIN.feel[1])];
      g.pour = at(PIN.pour);
      const gustLen = at(PIN.cloud) - g.pour;
      g.gatherLen = gustLen * GUST;
      const pinEnd = g.pin0 + g.pinLen;
      // when each line starts blowing in: "I believe" while the hero blows away
      const q0 = S0 + 50;
      const lineFrom = g.lineSet.map((set, k) => (k === 0 ? q0 : set - vh * LINE_IN));

      // portrait: its cells ride the gust in from the pour on and settle into
      // the square while the frame is still coming up the screen, so it is
      // whole as soon as it is fully in view; then it develops in place (red,
      // then colour) and holds still while only the text moves. At md+ its
      // column sticks later. Measured on the column, which never moves.
      const fr = photoFrame?.getBoundingClientRect();
      g.half = { w: (fr?.width ?? 200) / 2, h: (fr?.height ?? 200) / 2 };
      const col = photoFrame?.closest<HTMLElement>('[data-photo-col]');
      const colBox = col?.getBoundingClientRect();
      const colTop = colBox ? colBox.top + sy : pinEnd + vh;
      const form = vh * FORM;
      // "dock" = the moment the square is whole
      const dock = Math.max(colTop + g.half.h * 2 - vh * FORMED_AT, g.pour + form + 120);
      g.red = [dock, dock + vh * RED];
      g.colour = [dock + vh * RED, dock + vh * COLOUR];
      g.ruleY = rules.map((el) => el.getBoundingClientRect().top + sy);

      // hero cells, frozen on screen where they stand at the first tick
      const heroBox = hero.getBoundingClientRect();
      const skipHero = (el: Element) => !!el.closest('.sr-only, .hero-ghost, .hero-noise, .hero-whisper, button:not(.hl-word)');
      const heroCells = thin(sampleText(hero, skipHero, heroBox, true), CAP.hero, rand);

      // quote cells, as they sit on the pinned screen, tagged with their line
      const qBox = quote.getBoundingClientRect();
      const stageTop = stage.getBoundingClientRect().top + sy;
      const lineOf = (el: Element) => el.closest('[data-feel]') ? FEEL_ID : Number((el.closest('[data-line]') as HTMLElement | null)?.dataset.line ?? 0);
      const qCells = thin(sampleText(quote, () => false, qBox, false, lineOf), CAP.quote, rand);

      // About cells, block by block (the portrait is built apart)
      const aboutBox = about.getBoundingClientRect();
      g.blocks = Array.from(about.querySelectorAll<HTMLElement>('h2, h3, p, span, div')).filter((el) => !el.closest('.photo-frame-wrapper, [data-gate-skip]') && !el.hasAttribute('data-rule'));
      const blockOf = (el: Element) => {
        const b = el.closest('h2, h3, p, span, div');
        const i = b ? g.blocks.indexOf(b as HTMLElement) : -1;
        return i < 0 ? 254 : i;
      };
      const aboutCells = thin(sampleText(about, (el) => !!el.closest('.sr-only, .photo-frame-wrapper'), aboutBox, false, blockOf), CAP.about, rand);

      const face = photo.complete && photo.naturalWidth ? samplePhoto(photo, g.half.w * 2, g.half.h * 2) : [];

      const STRIDE = 2 + 2 + 2 + 3 + 4 + 4 + 1;
      const n = aboutCells.length + heroCells.length + qCells.length + face.length;
      const arr = new Float32Array(n * STRIDE);
      let i = 0;
      const push = (v: number[]) => { arr.set(v, i * STRIDE); i++; };

      // About: each letter takes a grain of the gust's dust as it scrolls in;
      // the grain waits on the wind's path, lower left of its letter
      g.done = new Array(g.blocks.length).fill(-1);
      const sheds = aboutCells.map((c) => Math.max(c.y - vh * SHED_AT, pinEnd - vh * 0.1, g.pour + 40) + rand() * 30);
      aboutCells.forEach((c, k) => {
        if (c.blk !== undefined && c.blk < g.blocks.length) g.done[c.blk] = Math.max(g.done[c.blk], sheds[k] + FALL);
      });
      let last = g.red[1] + 10;
      aboutCells.forEach((c, k) => {
        const fx = c.x - vw * (0.12 + 0.3 * rand());
        const fy = vh * (0.5 + 0.38 * rand());
        const hand = c.blk !== undefined && c.blk < g.blocks.length ? g.done[c.blk] + rand() * 18 : 1e9;
        last = Math.max(last, sheds[k] + FALL + HAND);
        push([
          fx, fy,
          0, 0,
          c.x, c.y,
          c.r, c.g, c.b,
          0, sheds[k], rand(), rand(),
          0, hand, 1, 0,
          0,
        ]);
      });
      g.end = last;

      // hero: the wind front sweeps left to right
      for (const c of heroCells) {
        const s1 = S0 + 10 + 140 * clamp01(c.x / vw) + 40 * rand();
        push([c.x, c.y - S0, 0, 0, 0, 0, c.r, c.g, c.b, s1, 0, rand(), rand(), 1, 0, 1, 0, 0]);
      }

      // belief: each line blows in over its own window; the gust front then
      // sweeps it from the lower left, each cell lifted off in turn
      for (const c of qCells) {
        const isFeel = c.blk === FEEL_ID;
        const line = isFeel ? 2 : Math.min(LINES.length - 1, c.blk ?? 0);
        const from = lineFrom[line], set = g.lineSet[line];
        const len = (set - from) * 0.6;
        const s = from + (set - from - len) * rand();
        const sx = c.x, syq = c.y - stageTop;
        const front = clamp01(0.6 * (sx / vw) + 0.4 * (1 - syq / vh));
        const sg = g.pour + (gustLen - g.gatherLen) * clamp01(front * 0.85 + rand() * 0.15);
        push([
          -40 - rand() * vw * 0.45, syq + (rand() - 0.5) * 160,
          sx, syq,
          rand() * 240, rand() * vh * 0.35,
          c.r, c.g, c.b,
          s, sg, rand(), rand(),
          3, set, Math.max(1, len), isFeel ? 1 : 0,
          0,
        ]);
      }

      // portrait: the same gust brings its dither in from off screen lower
      // left; cells land top row first and set off at staggered points
      const faceH = Math.max(1, g.half.h * 2);
      const lands: number[] = [];
      for (const f of face) {
        const land = dock - form + form * clamp01((f.y + g.half.h) / faceH * 0.85 + rand() * 0.15);
        lands.push(land);
        const sg = g.pour + 40 + Math.max(0, land - g.pour - 40) * 0.4 * rand();
        push([
          0.15 + 0.4 * rand(), 0.02 + 0.3 * rand(),
          0.25 + 0.3 * rand(), 0,
          f.x, f.y,
          1, 1, 1,
          1e9, sg, rand(), rand(),
          2, 0, 1, 0,
          land,
        ]);
      }
      g.count = i;
      // the frame appears once 90% of the portrait cells have landed
      lands.sort((x, y) => x - y);
      g.frameOn = lands.length ? lands[Math.floor(lands.length * 0.9)] : dock - form * 0.1;

      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, arr.subarray(0, i * STRIDE), gl.STATIC_DRAW);
      const attrs: [string, number][] = [['aA', 2], ['aB', 2], ['aC', 2], ['aCol', 3], ['aT', 4], ['aK', 4], ['aL', 1]];
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
      // the canvas covers exactly the visible screen (100vh is the large
      // viewport on phones, which would stretch the cells)
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // DOM side: a few style props, written only on change, cleared outside the gate.
    const written = new WeakMap<HTMLElement, Partial<Record<StyleProp, string>>>();
    const put = (el: HTMLElement, prop: StyleProp, v: string) => {
      const w = written.get(el) ?? {};
      // never written means unset: clearing it must not wipe React's inline style
      if ((w[prop] ?? '') === v) return;
      w[prop] = v;
      written.set(el, w);
      el.style.setProperty(prop, v);
    };
    const managed = () => [hero, quote, feel, ...lines, ...g.blocks, ...rules];
    // the portrait frame's border and shadow, 0..1 (1 is how AboutSection draws it)
    const frameLook = (f: number) => {
      if (!photoFrame) return;
      put(photoFrame, 'border-color', `hsl(var(--sinaida-red) / ${(0.4 * f).toFixed(2)})`);
      put(photoFrame, 'box-shadow', `0 0 0 1px hsl(var(--accent) / ${(0.15 * f).toFixed(3)}), inset 0 0 30px rgba(0,0,0,${(0.5 * f).toFixed(2)})`);
    };
    let domActive = false;
    const clearDom = (force = false) => {
      if (!domActive && !force) return;
      domActive = false;
      for (const el of managed()) for (const prop of TEXT_PROPS) put(el, prop, '');
      frameLook(1);
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
      // layout reads first, then only style writes (no forced layout)
      const past = sy >= g.end;
      const slot = !past && sy > S0 ? photoFrame?.getBoundingClientRect() : undefined;
      const heroOn = past && hero.getBoundingClientRect().bottom > 0;
      const stageOn = past && stage.getBoundingClientRect().bottom > 0;
      if (portrait && photoImg && photoFrame) {
        if (sy <= S0) {
          portrait.draw(0, 1);
          put(photoImg as HTMLElement, 'opacity', '');
        } else {
          // docked: soft red dither over the settled cells, then the cells
          // light up into the photo; at the end the real <img> takes over.
          // Quantised, so the canvas only redraws when a step changes.
          const red = Math.round(clamp01((sy - g.red[0]) / (g.red[1] - g.red[0])) * 48) / 48;
          const colour = Math.round(clamp01((sy - g.colour[0]) / (g.colour[1] - g.colour[0])) * 96) / 96;
          portrait.draw(red, colour);
          put(photoImg as HTMLElement, 'opacity', colour >= 1 ? '1' : '0');
        }
      }

      if (sy <= S0 || sy >= g.end) {
        clearDom();
        if (sy >= g.end) {
          // past the gate: what became dust stays gone while it is still on screen
          domActive = true;
          if (heroOn) put(hero, 'opacity', '0');
          if (stageOn) put(quote, 'opacity', '0');
        }
        show(false);
        return;
      }

      domActive = true;
      put(hero, 'opacity', (1 - smooth(S0, S0 + HERO_LOCK, sy)).toFixed(2));
      put(quote, 'opacity', sy >= g.pour ? '0' : '');
      lines.forEach((el, k) => put(el, 'opacity', sy < (g.lineSet[k] ?? 0) ? '0' : ''));
      light(feel, smooth(g.feel[0], g.feel[0] + (g.feel[1] - g.feel[0]) * 0.25, sy));
      g.blocks.forEach((el, k) => {
        if (g.done[k] >= 0) put(el, 'opacity', smooth(g.done[k], g.done[k] + HAND, sy).toFixed(2));
      });
      // the table's hairlines draw in as they scroll in
      rules.forEach((el, k) => put(el, 'opacity', smooth(g.ruleY[k] - vh * 0.98, g.ruleY[k] - vh * 0.8, sy).toFixed(2)));
      // the frame's border and shadow only once the square has formed
      frameLook(Math.round(smooth(g.frameOn, g.frameOn + FRAME_IN, sy) * 20) / 20);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.sy, sy);
      gl.uniform2f(u.view, vw, vh);
      gl.uniform1f(u.dpr, dpr);
      gl.uniform2f(u.gather, g.pour, g.gatherLen);
      gl.uniform2f(u.slot, slot ? slot.left + slot.width / 2 : vw / 2, slot ? slot.top + slot.height / 2 : vh * 2);
      gl.uniform2f(u.dev, g.red[0], g.red[1]);
      gl.uniform2f(u.rel, g.pin0 + g.pinLen, g.pour);
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
    // a phone's toolbar sliding in or out only changes the height a little:
    // keep the build (it is measured on the stable 100svh stage), just
    // refit the canvas and redraw
    const onResize = () => {
      resize();
      schedule();
      if (g.built && window.innerWidth === g.w && Math.abs(window.innerHeight - g.h) < REBUILD_DH) return;
      rebuild(250);
    };

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
      gl.deleteVertexArray(vao);
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
