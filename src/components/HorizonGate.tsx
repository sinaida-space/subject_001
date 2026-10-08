// ─────────────────────────────────────────────────────────────────────────
// Horizon gate (#120): the hero becomes stars, the stars become About.
//
// The red horizon line is a wiper that moves faster than the page:
//   1. up: from its place under the hero it sweeps up across the screen;
//      every glyph it passes breaks into 3 px dither cells that come loose
//      and drift off into the galaxy as stars, each at its own depth
//   2. turn: at the top it fires once, a thin CRT flick that splits and closes
//   3. down: it sweeps back down over About; just ahead of it the drifting
//      stars fly in and assemble About's letters as dither cells, and as it
//      passes the real text takes over. The portrait stays dither a moment
//      longer, then resolves into the photo.
//
// Cells are sampled from the real DOM (every glyph where it renders), so the
// hand-over is exact both ways. A few cells bloom; the rest stay crisp. All of
// it is drawn over the galaxy, nothing is black, and every frame is a pure
// function of the scroll position: scrolling back runs the same wiper in
// reverse (motion law). Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const CELL = 3; // css px, the site's dither cell
const MAX_PARTICLES = 24000;
const PHOTO_SRC = '/sinaida-photo-600.jpg';

// The gate starts after a few wheel ticks and ends as About's top reaches
// the upper tenth of the screen; p runs 0..1 in between.
const SCROLL_START = 240; // css px
// Wiper beats of p: up until UP_END, holds and fires at the top, then a
// fast jump down to About's top edge (by DOWN_READY) and the sweep over it.
const UP_END = 0.3;
const DOWN_START = 0.36;
const DOWN_READY = 0.42;
const FLASH_AT = 0.33;
const WIPER_TOP = 76; // css px, never above the header
const DISSOLVE_BAND = 140; // css px above the wiper where hero cells come loose
const HERO_LOCK = 0.04; // p: the hero headline hands over to its dither cells

const QUAD_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// the wiper: a thin neon tube with a short trail behind its direction of
// travel; at the turn it fires once with a CRT split. Red never burns white.
const LINE_FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uLine;    // device px from the top
uniform vec2 uSpan;     // x extent
uniform float uOn;      // 0..1
uniform float uFlash;   // 0..1
uniform float uDir;     // -1 moving up, 1 moving down, 0 holding
out vec4 outColor;
const vec3 RED = vec3(0.804, 0.0, 0.0);
const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);
float tube(float d, float core, float halo) {
  return exp(-d * d / (2.0 * core * core)) + 0.4 * exp(-d * d / (2.0 * halo * halo));
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float fall = 60.0 * uDpr;
  float x = smoothstep(uSpan.x - fall, uSpan.x + fall, p.x) * (1.0 - smoothstep(uSpan.y - fall, uSpan.y + fall, p.x));
  float d = p.y - uLine;
  float split = uFlash * 7.0 * uDpr;
  float i = tube(abs(d), 0.8 * uDpr, 5.0 * uDpr) * (1.0 - uFlash)
          + (tube(abs(d - split), 0.9 * uDpr, 7.0 * uDpr) + tube(abs(d + split), 0.9 * uDpr, 7.0 * uDpr)) * uFlash * 1.3;
  // trail: the light it leaves behind, on the side it came from
  float behind = -d * uDir;
  i += step(0.0, behind) * exp(-behind / (34.0 * uDpr)) * 0.16 * abs(uDir);
  i *= x * uOn;
  vec3 col = mix(RED, RED_HOT, clamp(i, 0.0, 1.0)) * i;
  outColor = vec4(col, clamp(i, 0.0, 1.0));
}`;

const PT_VS = `#version 300 es
in vec2 aSrc;     // page px: hero glyph cell, or a star already in the sky
in vec2 aMid;     // page px: where it drifts as a star
in vec2 aDst;     // page px: About glyph / portrait cell, or where a spare star rests
in vec3 aCol0;
in vec3 aCol1;
in vec4 aTime;    // s1 (wiper passes it, it comes loose), s2 (it lands), depth, rnd
in vec3 aFlags;   // x: hero cell, y: kind 0 About text, 1 portrait, 2 stays a star; z: when it hands over
uniform float uP;
uniform float uScroll;
uniform float uScrollMid; // scroll at the turn, for star parallax
uniform float uDpr;
uniform float uLinePage;  // wiper, page px
uniform vec2 uView;       // css px
out vec3 vCol;
out float vAlpha;
out float vRound;
out float vBloom;

const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);

void main() {
  float s1 = aTime.x, s2 = aTime.y, depth = aTime.z, rnd = aTime.w;
  bool hero = aFlags.x > 0.5;
  float kind = aFlags.y;

  // come loose and drift off as a star (ease out, like a push)
  float t1 = hero ? smoothstep(s1, s1 + 0.2, uP) : 1.0;
  vec2 a = mix(aSrc, aMid, 1.0 - pow(1.0 - t1, 2.0));
  // far stars lag the page: parallax while they hang in the sky
  a.y += (uScroll - uScrollMid) * (1.0 - depth) * 0.45 * t1;
  a.x += (rnd - 0.5) * 30.0 * uP;

  // fly in just ahead of the wiper and land where it is about to pass
  float t2 = kind > 1.5 ? 0.0 : smoothstep(s2 - 0.12, s2, uP);
  float land = 1.0 - pow(1.0 - t2, 3.0);
  vec2 pos = mix(a, aDst, land);
  pos.x += sin(t2 * 3.14159) * (rnd - 0.5) * 90.0;

  // a cell in flight is a star: round, sized by depth; landed, a crisp cell
  float flight = (hero ? smoothstep(0.0, 0.3, t1) : 1.0) * (1.0 - smoothstep(0.7, 1.0, t2));
  float bloom = step(0.93, fract(rnd * 7.13));
  float size = mix(3.0, mix(1.0, 3.0, depth * depth), flight);
  gl_PointSize = size * (1.0 + 3.0 * bloom) * uDpr;

  vec3 star = mix(vec3(0.95, 0.93, 0.9), vec3(0.85, 0.12, 0.2), step(0.8, rnd)) * mix(0.55, 1.0, depth);
  vec3 col = mix(aCol0, star, flight);
  col = mix(col, aCol1, land);
  // touching the wiper, a cell burns hot red
  col = mix(col, RED_HOT, exp(-abs(pos.y - uLinePage) / 18.0) * 0.9);

  // a hero cell shows once the wiper has passed it (the DOM glyph is gone)
  // while they hang in the sky most stars are faint; they brighten as they fly in
  float hang = depth > 0.8 ? 0.85 : 0.2 * depth;
  float sky = hero ? mix(1.0, hang, smoothstep(0.0, 0.6, t1)) : hang * step(fract(rnd * 13.7), 0.15) * smoothstep(0.02, 0.2, uP);
  float alpha = (hero ? smoothstep(0.0, ${HERO_LOCK}, uP) : 1.0) * max(sky, t2);
  // the real About takes over as the wiper passes; spare stars fade at the end
  if (kind < 1.5) alpha *= 1.0 - step(aFlags.z, uP);
  else alpha *= 1.0 - smoothstep(0.82, 1.0, uP);

  vCol = col;
  vAlpha = alpha;
  vRound = flight;
  vBloom = bloom;
  vec2 scr = vec2(pos.x, pos.y - uScroll);
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
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a;
  if (vBloom > 0.5) {
    // a bright core the size of a normal cell inside a soft halo
    float core = max(abs(c.x), abs(c.y)) < 0.125 ? 1.0 : 0.0;
    core = mix(core, smoothstep(0.14, 0.04, d), vRound);
    a = core + 0.55 * exp(-d * d * 22.0);
  } else {
    a = mix(1.0, smoothstep(0.5, 0.1, d), vRound);
  }
  a *= vAlpha;
  if (a < 0.01) discard;
  outColor = vec4(vCol * min(a, 1.0), min(a, 1.0));
}`;

// ── sampling the DOM into cells ───────────────────────────────────────────

interface Cell { x: number; y: number; r: number; g: number; b: number }

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
function sampleText(root: HTMLElement, skip: (el: Element) => boolean, box: DOMRect, checkOpacity: boolean): Cell[] {
  const w = Math.ceil(box.width), h = Math.ceil(box.height);
  if (w < 1 || h < 1) return [];
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
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
    }
  }
  const data = ctx.getImageData(0, 0, w, h).data;
  const cells: Cell[] = [];
  const sy = window.scrollY;
  // the grid is aligned to the page, so cells land on the same lattice everywhere
  const x0 = Math.ceil(box.left / CELL) * CELL - box.left;
  const y0 = Math.ceil((box.top + sy) / CELL) * CELL - (box.top + sy);
  for (let y = y0 + 1; y < h; y += CELL) {
    for (let x = x0 + 1; x < w; x += CELL) {
      const k = ((y | 0) * w + (x | 0)) * 4;
      if (data[k + 3] < 110) continue;
      cells.push({ x: box.left + x, y: box.top + sy + y, r: data[k] / 255, g: data[k + 1] / 255, b: data[k + 2] / 255 });
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
      if (Math.min(1, Math.max(0, (lum - 0.22) * 1.9)) <= bayer8(x / CELL | 0, y / CELL | 0)) continue;
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
    const lu = { res: L('uRes'), dpr: L('uDpr'), line: L('uLine'), span: L('uSpan'), on: L('uOn'), flash: L('uFlash'), dir: L('uDir') };
    const pu = { p: P('uP'), scroll: P('uScroll'), scrollMid: P('uScrollMid'), dpr: P('uDpr'), linePage: P('uLinePage'), view: P('uView') };
    const quadVao = gl.createVertexArray();
    const ptVao = gl.createVertexArray();
    const buf = gl.createBuffer();
    let count = 0;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const photo = new Image();
    photo.src = PHOTO_SRC;

    // Layout of the gate, measured at build time (page px).
    const g = { s0: SCROLL_START, s1: SCROLL_START + 600, y0: 0, top: WIPER_TOP, aboutY: 0, vh: 1, photoDone: 1, built: false };
    const scrollAt = (p: number) => mix(g.s0, g.s1, p);
    // wiper height on screen for progress p: up to the top hero glyph, hold,
    // jump to About's top edge, then sweep down to the bottom of the screen
    const wiperScreen = (p: number) => {
      if (p <= UP_END) return mix(g.y0, g.top, p / UP_END);
      if (p < DOWN_START) return g.top;
      const ready = Math.max(g.top, g.aboutY - scrollAt(DOWN_READY));
      if (p < DOWN_READY) return mix(g.top, ready, smooth(DOWN_START, DOWN_READY, p));
      return mix(ready, g.vh * 0.96, (p - DOWN_READY) / (1 - DOWN_READY));
    };
    const wiperPage = (p: number) => scrollAt(p) + wiperScreen(p);
    // when the wiper passes page height y (it moves monotonically in each phase)
    const cross = (y: number, a: number, b: number, rising: boolean) => {
      let lo = a, hi = b;
      for (let i = 0; i < 24; i++) {
        const m = (lo + hi) / 2;
        if ((wiperPage(m) > y) === rising) lo = m; else hi = m;
      }
      return (lo + hi) / 2;
    };
    const crossUp = (y: number) => cross(y, 0, UP_END, true);
    const crossDown = (y: number) => cross(y, DOWN_READY, 1, false);

    // Sample hero and About into cells and pair them into particles.
    const build = () => {
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY;
      const hz = horizon.getBoundingClientRect();
      const aboutBox = about.getBoundingClientRect();
      g.vh = vh;
      g.s0 = SCROLL_START;
      g.s1 = Math.max(g.s0 + 420, aboutBox.top + sy - vh * 0.1);
      g.y0 = hz.top + hz.height / 2 + sy - g.s0; // the line's screen height when the gate starts

      const heroBox = hero.getBoundingClientRect();
      const skipHero = (el: Element) => !!el.closest('.sr-only, .hero-ghost, .hero-noise, .hero-whisper, button');
      const src = sampleText(hero, skipHero, heroBox, true);
      // the wiper climbs only as high as the topmost glyph still on screen
      const onScreen = src.filter((c) => c.y > g.s0 + WIPER_TOP);
      const topGlyph = onScreen.length ? Math.min(...onScreen.map((c) => c.y)) : g.s0 + WIPER_TOP;
      g.top = Math.max(WIPER_TOP, topGlyph - 12 - scrollAt(UP_END));
      g.aboutY = aboutBox.top + sy - 12;
      // only what the wiper uncovers before the gate ends
      const reach = g.s1 + vh * 0.96;
      const cap = new DOMRect(aboutBox.left, aboutBox.top, aboutBox.width, Math.max(0, Math.min(aboutBox.height, reach - sy - aboutBox.top)));
      // About's blocks may still wait for their scroll reveal, so no opacity check
      const text = sampleText(about, (el) => !!el.closest('.sr-only'), cap, false);
      const img = about.querySelector<HTMLImageElement>('picture img');
      const pr = img?.getBoundingClientRect();
      const face = photo.complete && photo.naturalWidth && pr && pr.top < cap.bottom ? samplePhoto(photo, pr) : [];
      // the portrait holds its dither a moment after the wiper, then resolves
      g.photoDone = pr ? crossDown(pr.bottom + sy) : 1;

      const rand = rng(120);
      let dst: (Cell & { kind: number })[] = [
        ...text.map((c) => ({ ...c, kind: 0 })),
        ...face.map((c) => ({ ...c, kind: 1 })),
      ];
      const budget = MAX_PARTICLES - Math.min(src.length, MAX_PARTICLES / 3);
      if (dst.length > budget) dst = dst.filter(() => rand() < budget / dst.length);

      const n = Math.max(src.length, dst.length);
      const STRIDE = 2 + 2 + 2 + 3 + 3 + 4 + 3;
      const arr = new Float32Array(n * STRIDE);
      const skyTop = scrollAt(FLASH_AT);
      // shuffle sources so each glyph scatters over the whole of About
      const order = src.map((_, i) => i).sort(() => rand() - 0.5);
      for (let i = 0; i < n; i++) {
        const r = rand(), depth = rand();
        const s = i < src.length ? src[order[i]] : null;
        const d = i < dst.length ? dst[i] : null;
        // where it hangs as a star: anywhere on the screen at the turn
        const mx = rand() * vw, my = skyTop + vh * (0.12 + 0.8 * rand());
        const sx = s ? s.x : mx, syy = s ? s.y : my;
        const dx = d ? d.x : mx, dy = d ? d.y : my;
        // letters erode ahead of the wiper: a cell comes loose anywhere in a
        // band above the line, in random order, so glyphs crumble, never cut
        const s1 = s ? crossUp(s.y + DISSOLVE_BAND * Math.pow(rand(), 0.7)) : 0;
        const s2 = d ? crossDown(d.y) : 1;
        const handover = d?.kind === 1 ? g.photoDone + 0.05 + 0.07 * r : s2 + 0.012;
        arr.set([
          sx, syy, mx, my, dx, dy,
          s ? s.r : 0.9, s ? s.g : 0.9, s ? s.b : 0.88,
          d ? d.r : 0.9, d ? d.g : 0.9, d ? d.b : 0.88,
          s1, s2, depth, r,
          s ? 1 : 0, d ? d.kind : 2, handover,
        ], i * STRIDE);
      }
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
      count = n;
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

    // DOM side: clips and opacity only, cleared entirely outside the gate
    const frameEl = about.querySelector<HTMLElement>('.photo-frame-wrapper');
    let domActive = false;
    const clearDom = () => {
      if (!domActive) return;
      domActive = false;
      hero.style.opacity = about.style.clipPath = horizon.style.opacity = '';
      if (frameEl) frameEl.style.opacity = '';
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
      const sy = window.scrollY, vh = window.innerHeight;
      const p = clamp01((sy - g.s0) / (g.s1 - g.s0));
      if (!g.built || p <= 0 || p >= 1) {
        clearDom();
        show(false);
        return;
      }
      const wy = wiperScreen(p);

      // the real page shows only where the wiper has been: hero above it on
      // the way up, About above it on the way down
      domActive = true;
      horizon.style.opacity = '0';
      const ab = about.getBoundingClientRect();
      // the hero hands over to its dither cells at once; they do the dissolving
      hero.style.opacity = (1 - smooth(0, HERO_LOCK, p)).toFixed(3);
      about.style.clipPath = `inset(0 0 ${p > DOWN_START ? Math.max(0, ab.bottom - wy).toFixed(1) + 'px' : '100%'} 0)`;
      if (frameEl) frameEl.style.opacity = smooth(g.photoDone + 0.05, g.photoDone + 0.12, p).toFixed(3);

      const on = smooth(0, 0.03, p) * (1 - smooth(0.96, 1, p));
      const flash = Math.exp(-Math.pow((p - FLASH_AT) / 0.022, 2));
      const dir = p < UP_END ? -1 : p > DOWN_START ? 1 : 0;
      const hz = horizon.getBoundingClientRect();

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(lineProg);
      gl.bindVertexArray(quadVao);
      gl.uniform2f(lu.res, canvas.width, canvas.height);
      gl.uniform1f(lu.dpr, dpr);
      gl.uniform1f(lu.line, wy * dpr);
      gl.uniform2f(lu.span, hz.left * dpr, hz.right * dpr);
      gl.uniform1f(lu.on, on);
      gl.uniform1f(lu.flash, flash);
      gl.uniform1f(lu.dir, dir);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(ptProg);
      gl.bindVertexArray(ptVao);
      gl.uniform1f(pu.p, p);
      gl.uniform1f(pu.scroll, sy);
      gl.uniform1f(pu.scrollMid, scrollAt(FLASH_AT));
      gl.uniform1f(pu.dpr, dpr);
      gl.uniform1f(pu.linePage, sy + wy);
      gl.uniform2f(pu.view, window.innerWidth, vh);
      gl.drawArrays(gl.POINTS, 0, count);
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
        build();
        schedule();
      }, delay);
    };
    let dead = false;
    Promise.all([document.fonts.ready, photo.decode().catch(() => undefined)]).then(() => {
      if (!dead) rebuild(1600);
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
