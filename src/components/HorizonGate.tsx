// ─────────────────────────────────────────────────────────────────────────
// Horizon gate (#120): the hero becomes stars, the stars become About.
//
//   1. lock: the hero headline turns into 3 px dither cells, cell by cell
//   2. fall: the cells come loose and drift down into the red horizon line
//      as stars, each at its own depth; the line charges as they cross it
//   3. flash: the line fires once, a thin CRT flick that splits and closes
//   4. land: the stars fly out of the line into About, top line first, land
//      as dither cells on its letters and resolve into the real text; the
//      portrait lands last as red 1-bit dither and resolves into the photo
//
// Cells are sampled from the real DOM (every glyph where it renders), so the
// hand-over in both directions is exact. Spare hero cells stay behind as
// stars; spare About cells are gathered from the galaxy. Everything is drawn
// over the galaxy, nothing is black, and every frame is a pure function of
// the scroll position: scrolling back reassembles the hero (motion law).
// Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// The gate starts a few wheel ticks into the page and ends as About's top
// reaches the upper eighth of the screen; p runs 0..1 in between.
const SCROLL_START = 240; // css px
const CELL = 3; // css px, the site's dither cell
const MAX_PARTICLES = 24000;
const PHOTO_SRC = '/sinaida-photo-600.jpg';

// Beats of p, shared by JS (DOM fades) and the shaders (passed as constants).
const HERO_OUT: [number, number] = [0.02, 0.09]; // hero DOM gives way to its cells
const FLASH_AT = 0.38; // the line fires
const ABOUT_IN: [number, number] = [0.86, 0.95]; // About text takes over from the cells
const PHOTO_IN: [number, number] = [0.9, 1.0]; // the portrait resolves last

// ── shaders ───────────────────────────────────────────────────────────────

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
  float i = tube(abs(d0), 0.8 * uDpr, 5.0 * uDpr) * (0.35 + 0.65 * uCharge) * (1.0 - uFlash)
          + (tube(abs(d0 - split), 0.9 * uDpr, 7.0 * uDpr) + tube(abs(d0 + split), 0.9 * uDpr, 7.0 * uDpr)) * uFlash * 1.3;
  i *= x * max(uCharge, uFlash);
  vec3 col = mix(RED, RED_HOT, clamp(i, 0.0, 1.0)) * i;
  outColor = vec4(col, clamp(i, 0.0, 1.0));
}`;

const PT_VS = `#version 300 es
in vec2 aSrc;     // page px: where the cell starts (hero glyph or a galaxy star)
in vec2 aMid;     // page px: where it crosses the horizon line
in vec2 aDst;     // page px: where it lands (About glyph / portrait, or a star)
in vec3 aCol0;
in vec3 aCol1;
in vec4 aTime;    // s1 (leave), s2 (land), depth, rnd
in vec2 aFlags;   // x: starts visible (hero cell), y: kind 0 lands on About, 1 photo, 2 stays a star
uniform float uP;
uniform float uScroll;
uniform float uDpr;
uniform float uLine;  // page px
uniform vec2 uView;   // css px
out vec3 vCol;
out float vAlpha;
out float vRound;
out float vBloom;

const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);

void main() {
  float s1 = aTime.x, s2 = aTime.y, depth = aTime.z, rnd = aTime.w;
  float t1 = smoothstep(s1, s1 + 0.2, uP);
  float t2 = smoothstep(s2, s2 + 0.2, uP);

  // fall into the line, accelerating like something pulled in
  vec2 a = mix(aSrc, aMid, t1 * t1);
  a.x += sin(t1 * 3.14159) * (rnd - 0.5) * 70.0;
  // and out of it, easing into place
  float land = 1.0 - pow(1.0 - t2, 3.0);
  vec2 pos = mix(a, aDst, land);
  // gathered on the line, the cells sparkle in a thin band around it
  pos.y += (fract(rnd * 31.7) - 0.5) * 16.0 * t1 * (1.0 - t2);
  pos.x += sin(t2 * 3.14159) * (rnd - 0.5) * 110.0;

  // in flight a cell is a star: round, sized by depth, then a crisp cell again
  float flight = smoothstep(0.0, 0.25, t1) * (1.0 - smoothstep(0.75, 1.0, t2));
  if (aFlags.y > 1.5) flight = smoothstep(0.0, 0.25, t1);
  float starSize = mix(1.2, 3.6, depth);
  // a few cells bloom: a bright core inside a soft halo
  float bloom = step(0.93, fract(rnd * 7.13));
  gl_PointSize = mix(3.0, starSize, flight) * (1.0 + 3.0 * bloom) * uDpr;

  vec3 star = mix(vec3(0.95, 0.93, 0.9), vec3(0.85, 0.12, 0.2), step(0.8, rnd)) * mix(0.55, 1.0, depth);
  vec3 col = mix(aCol0, star, flight);
  col = mix(col, aCol1, aFlags.y > 1.5 ? t2 : land * (1.0 - flight));
  // crossing the line, a star burns hot red
  float heat = exp(-abs(pos.y - uLine) / 26.0) * flight;
  col = mix(col, RED_HOT, heat * 0.85);

  // hero cells appear cell by cell as the DOM headline gives way
  // stars gathered from the galaxy stay faint (most of them unseen) until
  // they reach the line, so the sky never turns to noise
  float faint = step(fract(rnd * 13.7), 0.12) * 0.55 * depth * smoothstep(s1, s1 + 0.12, uP);
  float alpha = aFlags.x > 0.5 ? step(rnd, (uP - ${HERO_OUT[0].toFixed(3)}) / ${(HERO_OUT[1] - HERO_OUT[0]).toFixed(3)} + 0.02)
                               : max(faint, smoothstep(0.75, 1.0, t1));
  // and hand over to the real About cell by cell, the portrait last
  if (aFlags.y < 0.5) alpha *= 1.0 - step(mix(${ABOUT_IN[0].toFixed(3)}, ${ABOUT_IN[1].toFixed(3)}, rnd), uP);
  else if (aFlags.y < 1.5) alpha *= 1.0 - step(mix(${PHOTO_IN[0].toFixed(3)}, ${PHOTO_IN[1].toFixed(3)} - 0.01, rnd), uP);
  else alpha *= 1.0 - smoothstep(0.78, 1.0, uP);

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
    const lu = { res: L('uRes'), dpr: L('uDpr'), line: L('uLine'), span: L('uSpan'), charge: L('uCharge'), flash: L('uFlash') };
    const pu = { p: P('uP'), scroll: P('uScroll'), dpr: P('uDpr'), line: P('uLine'), view: P('uView') };
    const quadVao = gl.createVertexArray();
    const ptVao = gl.createVertexArray();
    const buf = gl.createBuffer();
    let count = 0;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const photo = new Image();
    photo.src = PHOTO_SRC;

    let dpr = 1;
    let linePage = 0;
    let built = false;

    // Sample hero and About into cells and pair them into particles.
    const build = () => {
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY;
      const hz = horizon.getBoundingClientRect();
      linePage = hz.top + hz.height / 2 + sy;
      const heroBox = hero.getBoundingClientRect();
      const skipHero = (el: Element) => !!el.closest('.sr-only, .hero-ghost, .hero-noise, .hero-whisper, button');
      const src = sampleText(hero, skipHero, heroBox, true);
      const aboutBox = about.getBoundingClientRect();
      // only what can be on screen when the gate completes
      const cap = new DOMRect(aboutBox.left, aboutBox.top, aboutBox.width, Math.min(aboutBox.height, linePage - sy + vh * 1.05 - aboutBox.top));
      const skipAbout = (el: Element) => !!el.closest('.sr-only');
      // About's blocks may still wait for their scroll reveal, so no opacity check
      const text = sampleText(about, skipAbout, cap, false);
      const img = about.querySelector<HTMLImageElement>('picture img');
      const pr = img?.getBoundingClientRect();
      const face = photo.complete && photo.naturalWidth && pr && pr.top < cap.bottom ? samplePhoto(photo, pr) : [];

      const rand = rng(120);
      let dst: (Cell & { kind: number })[] = [
        ...text.map((c) => ({ ...c, kind: 0 })),
        ...face.map((c) => ({ ...c, kind: 1 })),
      ];
      const budget = MAX_PARTICLES - Math.min(src.length, MAX_PARTICLES / 3);
      if (dst.length > budget) dst = dst.filter(() => rand() < budget / dst.length);
      const yMin = Math.min(...dst.map((c) => c.y), linePage), yMax = Math.max(...dst.map((c) => c.y), linePage + 1);

      const n = Math.max(src.length, dst.length);
      const STRIDE = 2 + 2 + 2 + 3 + 3 + 4 + 2;
      const arr = new Float32Array(n * STRIDE);
      const spanL = hz.left, spanR = hz.right;
      // shuffle sources so each glyph scatters over the whole of About
      const order = src.map((_, i) => i).sort(() => rand() - 0.5);
      for (let i = 0; i < n; i++) {
        const r = rand(), depth = rand();
        const s = i < src.length ? src[order[i]] : null;
        const d = i < dst.length ? dst[i] : null;
        const sx = s ? s.x : rand() * vw;
        const syy = s ? s.y : linePage - 40 - rand() * vh * 0.9;
        const dx = d ? d.x : rand() * vw;
        const dy = d ? d.y : linePage + (rand() - 0.35) * vh * 1.1;
        const mx = Math.min(spanR - 24, Math.max(spanL + 24, sx + (dx - sx) * 0.35 + (rand() - 0.5) * 60));
        // leave the hero top lines first; land on About top lines first, the portrait last
        const s1 = 0.03 + 0.1 * (s ? (s.y - heroBox.top - sy) / Math.max(1, heroBox.height) : rand()) + 0.05 * r;
        const order01 = d ? (d.y - yMin) / Math.max(1, yMax - yMin) : rand();
        const s2 = d?.kind === 1 ? 0.52 + 0.1 * r : d ? 0.4 + 0.26 * order01 + 0.04 * r : 0.4 + 0.2 * r;
        const o = i * STRIDE;
        arr.set([
          sx, syy, mx, linePage, dx, dy,
          s ? s.r : 0.9, s ? s.g : 0.9, s ? s.b : 0.88,
          d ? d.r : 0.9, d ? d.g : 0.9, d ? d.b : 0.88,
          Math.min(s1, 0.18), s2, depth, r,
          s ? 1 : 0, d ? d.kind : 2,
        ], o);
      }
      gl.bindVertexArray(ptVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      const attrs: [string, number][] = [['aSrc', 2], ['aMid', 2], ['aDst', 2], ['aCol0', 3], ['aCol1', 3], ['aTime', 4], ['aFlags', 2]];
      let off = 0;
      for (const [name, size] of attrs) {
        const loc = gl.getAttribLocation(ptProg, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4);
        off += size;
      }
      gl.bindVertexArray(null);
      count = n;
      built = true;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // DOM side: opacity only, cleared entirely outside the gate
    const frameEl = about.querySelector<HTMLElement>('.photo-frame-wrapper');
    let domActive = false;
    const clearDom = () => {
      if (!domActive) return;
      domActive = false;
      hero.style.opacity = about.style.opacity = '';
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
      const vh = window.innerHeight;
      const h = horizon.getBoundingClientRect();
      const lineY = h.top + h.height / 2;
      const sy = window.scrollY;
      const end = Math.max(SCROLL_START + 400, about.getBoundingClientRect().top + sy - vh * 0.12);
      const p = clamp01((sy - SCROLL_START) / (end - SCROLL_START));
      if (p <= 0 || p >= 1 || !built) {
        clearDom();
        show(false);
        return;
      }

      domActive = true;
      hero.style.opacity = (1 - smooth(HERO_OUT[0], HERO_OUT[1], p)).toFixed(3);
      about.style.opacity = smooth(ABOUT_IN[0], ABOUT_IN[1], p).toFixed(3);
      if (frameEl) frameEl.style.opacity = smooth(PHOTO_IN[0], PHOTO_IN[1], p).toFixed(3);

      const charge = smooth(0.06, FLASH_AT, p) * (1 - smooth(FLASH_AT + 0.04, 0.8, p));
      const flash = Math.exp(-Math.pow((p - FLASH_AT) / 0.022, 2));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(lineProg);
      gl.bindVertexArray(quadVao);
      gl.uniform2f(lu.res, canvas.width, canvas.height);
      gl.uniform1f(lu.dpr, dpr);
      gl.uniform1f(lu.line, lineY * dpr);
      gl.uniform2f(lu.span, h.left * dpr, h.right * dpr);
      gl.uniform1f(lu.charge, charge);
      gl.uniform1f(lu.flash, flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(ptProg);
      gl.bindVertexArray(ptVao);
      gl.uniform1f(pu.p, p);
      gl.uniform1f(pu.scroll, window.scrollY);
      gl.uniform1f(pu.dpr, dpr);
      gl.uniform1f(pu.line, linePage);
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
