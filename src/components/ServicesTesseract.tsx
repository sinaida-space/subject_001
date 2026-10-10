// ── Services, full mode: a pinned tesseract whose panes carry the services ──
// A tall track pins a 100svh stage. On the stage one WebGL canvas (WebGL2,
// WebGL1 fallback) draws the tesseract: dust streams along its 32 edges, the
// edges themselves with a chrome glint, and one textured pane per service, the
// front face of that service's cell. The four service screens (plain DOM) sit
// on top. Scroll is the only clock:
//
//   pre 1 │ entry .7 │ rest .6 │ turn .55 │ rest │ turn │ rest │ turn │ rest │ exit .5
//
// Pre: while the stage scrolls up into view, the dust gathers into a
// tesseract centred in the visible part of the stage, its four panes a box of
// red fog. Entry: a ZW quarter-turn carries the first pane out of the fog
// toward the camera until it frames the stage. Rests: the pane sits exactly
// on the DOM screen, which fades in over it, so the copy is real, crisp text;
// the canvas then draws only dust. Turns: the DOM fades out at once and the
// panes carry the content through a 90° XW step (bent by the 4D projection,
// echoed at earlier angles in red, split red/cyan by speed, fogged where they
// fall back in w); each turn also sways in ZW by its own amount so no two
// look alike. Exit: the last pane grows past the viewer and the dust streams
// outward and thins into the starfield, while the oxytocin band and Contact
// already rise over the stage (the track's bottom margin pulls them up).
//
// Every frame is a pure function of scroll position: reverse scroll plays the
// same frames backwards, and nothing draws without a scroll or resize.

import { Children, useEffect, useRef, type ReactNode } from 'react';
import { registerLand } from '@/lib/navLand';
import { EDGES, FRAME_EXTENT, TESSERACT_GLSL, VERTICES, paneTheta, project, type Projected } from '@/lib/tesseract4d';
import { GALAXY, galaxyBright, galaxyColor, galaxyKeep, galaxySize } from '@/lib/galaxy';

const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
const PER_EDGE = LIGHT ? 20 : 48; // dust points per edge
const GRID = LIGHT ? 16 : 24; // pane subdivisions per side, so the projection can bend it
const TEX_W = LIGHT ? 768 : 1024; // pane texture width in px
const ECHOES = LIGHT ? 2 : 3; // time-echo copies per moving pane
const ECHO_DU = 0.045; // stage heights between echoes
const ECHO_A = [0.42, 0.24, 0.12];
const SPLIT_PX = 3; // max red/cyan offset, css px

// ── timeline, in stage heights of scroll ──
const PRE = 1; // the stage scrolling up into view, before the pin
const ENTRY = 0.7;
const REST = 0.6;
const TURN = 0.55;
const EXIT = 0.5;
// what follows the track rises over the exit by this many stage heights
const OVERLAP = 0.75;
const CELLS = 3; // STAGE, SCREEN, SPACE (#175)
const restStart = (k: number) => ENTRY + k * (REST + TURN);
const restMid = (k: number) => restStart(k) + REST / 2;
const EXIT_START = restStart(CELLS - 1) + REST;
const TOTAL = EXIT_START + EXIT; // 4.1
/** ZW sway per turn, alternating sign and size, so the paths diverge */
const ZW_SWAY = [0.3, -0.5];
/** where each turn carries it, as shares of the stage: the entry falls into
 * the screen surface, the first turn swings it to the side, the second up */
const TURN_DX = [0.2, 0];
const TURN_DY = [-0.02, -0.18];
const TURN_YAW = [0.7, -0.45];
const TURN_PITCH = [-0.3, 0.55];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const fract = (x: number) => x - Math.floor(x);

const START_ZOOM = 0.58; // the gathered tesseract, as a share of the short half-side
const INSET = 0.985; // the resting front cell sits just inside the stage border

interface Scene {
  xw: number; // XW angle
  zw: number; // ZW angle
  zoom: number; // z: the tesseract's distance, as a scale
  dx: number; // x offset, share of the stage width (#175: it travels left to right)
  dy: number; // y offset, share of the stage height
  yaw: number; // the 3D shadow turned about y, so its two cubes show (0 = a pane faces you)
  pitch: number; // and about x
  aspect: number; // 0 = square tesseract, 1 = front cell stretched to the stage
  energy: number; // 0 at rest, 1 mid-turn: dust brightness and spread
  gather: number; // 0 scattered stars, 1 every point on its edge
  formed: number; // share of non-kept points still lit
  exit: number; // 0..1 through the exit dive
  echo: number; // 0..1 strength of the time echoes
  split: number; // 0..1 of SPLIT_PX
  opacity: number[]; // DOM screens
  scale: number[]; // DOM screens, about the stage centre
  pane: number[]; // pane visibility before the DOM cover
}

/** everything on the stage as a function of u (stage heights scrolled into the track; negative before the pin) */
function sceneAt(u: number): Scene {
  const s: Scene = {
    xw: 0,
    zw: Math.PI,
    zoom: 1,
    dx: 0,
    dy: 0,
    yaw: 0,
    pitch: 0,
    aspect: 1,
    energy: 0,
    gather: 1,
    formed: 1,
    exit: 0,
    echo: 0,
    split: 0,
    opacity: [0, 0, 0, 0],
    scale: [1, 1, 1, 1],
    pane: [0, 0, 0, 0],
  };

  if (u < ENTRY) {
    const dive = smooth(0, ENTRY, u);
    s.gather = clamp01((u + 0.9) / 0.75);
    s.formed = smooth(-0.9, -0.2, u);
    s.zw = (Math.PI / 2) * (1 + dive); // the pane box sits in the inner cell, then comes at you
    s.zoom = START_ZOOM * Math.pow(1 / START_ZOOM, dive); // a fall: slow, then fast
    s.aspect = dive;
    // it comes in from the far left as it falls toward you, landing centred
    const off = 1 - smooth(-0.9, ENTRY, u);
    s.dx = -0.34 * off;
    s.dy = 0.08 * off;
    // seen from the side and above as it falls in, the hypercube turns to face you
    s.yaw = 0.62 * off;
    s.pitch = -0.38 * off;
    s.energy = smooth(-0.6, 0, u) * (1 - smooth(0.45, ENTRY, u));
    s.echo = smooth(0, 0.25, u) * (1 - smooth(0.45, ENTRY, u));
    const seen = smooth(-0.85, -0.3, u);
    s.pane[0] = seen;
    for (let k = 1; k < CELLS; k++) s.pane[k] = seen * (1 - smooth(0, 0.35, u));
    s.opacity[0] = smooth(0.6, ENTRY, u);
    return s;
  }

  if (u >= EXIT_START) {
    const x = clamp01((u - EXIT_START) / EXIT);
    s.xw = paneTheta(CELLS - 1);
    s.exit = x;
    s.zoom = 1 + 1.2 * x * x;
    // and leaves past the viewer's right shoulder, still left to right
    s.dx = 0.42 * x * x;
    s.dy = -0.06 * x * x;
    s.yaw = -0.5 * x * x;
    s.pitch = 0.2 * x * x;
    s.formed = 1 - smooth(0.1, 0.8, x);
    s.energy = smooth(0, 0.3, x) * (1 - smooth(0.55, 1, x));
    s.echo = s.energy;
    s.opacity[CELLS - 1] = 1 - smooth(0.32, 0.7, x); // the copy rides the growing pane a while
    s.scale[CELLS - 1] = s.zoom; // the screen grows with its pane
    s.pane[CELLS - 1] = 1 - smooth(0.5, 0.95, x); // it grows past the viewer before it goes
    return s;
  }

  const v = u - ENTRY;
  const k = Math.min(CELLS - 1, Math.floor(v / (REST + TURN)));
  const r = v - k * (REST + TURN);
  if (r < REST || k === CELLS - 1) {
    // rest: the pane sits exactly under its screen; only the dust moves
    s.xw = paneTheta(k);
    s.opacity[k] = 1;
    s.pane[k] = 1;
    return s;
  }
  // turn k → k+1: the DOM steps aside at once, the panes carry the copy
  const t = (r - REST) / TURN;
  const bell = Math.sin(Math.PI * t);
  s.xw = paneTheta(k + smooth(0, 1, t));
  s.zw = Math.PI + ZW_SWAY[k] * bell;
  // each turn pulls it back into the room and out along its own axis, then home
  s.zoom = 1 - 0.22 * bell;
  s.dx = TURN_DX[k] * bell;
  s.dy = TURN_DY[k] * bell;
  // mid-turn the shadow swings oblique, so the inner cell visibly swells into
  // the outer one (the classic hypercube), and squares up as the next pane arrives
  s.yaw = TURN_YAW[k] * bell;
  s.pitch = TURN_PITCH[k] * bell;
  s.scale[k] = s.zoom; // the leaving screen stays on its pane while it fades
  s.energy = bell;
  s.echo = bell;
  s.split = 4 * t * (1 - t); // the XW speed, normalised
  s.opacity[k] = 1 - smooth(0, 0.14, t);
  s.opacity[k + 1] = smooth(0.86, 1, t);
  s.pane[k] = 1;
  s.pane[k + 1] = 1;
  return s;
}

// ── dust: fixed per point, so a point keeps its look on every frame ──
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Dust {
  count: number;
  edge: Uint8Array;
  s0: Float32Array; // position along the edge
  flow: Float32Array; // signed stream speed along the edge, per stage height
  rnd: Float32Array; // the galaxy random
  jitter: Float32Array; // -0.5..0.5 across the edge
  delay: Float32Array; // gather delay
  burst: Float32Array; // exit stream speed
  sx: Float32Array; // scattered position, 0..1 of the stage
  sy: Float32Array;
  keep: Uint8Array;
  look: Float32Array; // static per point: r, g, b, bright
}

function makeDust(): Dust {
  const rand = mulberry32(162);
  const count = EDGES.length * PER_EDGE;
  const d: Dust = {
    count,
    edge: new Uint8Array(count),
    s0: new Float32Array(count),
    flow: new Float32Array(count),
    rnd: new Float32Array(count),
    jitter: new Float32Array(count),
    delay: new Float32Array(count),
    burst: new Float32Array(count),
    sx: new Float32Array(count),
    sy: new Float32Array(count),
    keep: new Uint8Array(count),
    look: new Float32Array(count * 4),
  };
  for (let i = 0; i < count; i++) {
    const e = Math.floor(i / PER_EDGE);
    d.edge[i] = e;
    d.s0[i] = rand();
    d.flow[i] = (e % 2 ? 1 : -1) * (0.15 + 0.25 * rand());
    d.rnd[i] = rand();
    d.jitter[i] = rand() - 0.5;
    d.delay[i] = rand() * 0.45;
    d.burst[i] = 1 + 3.5 * rand();
    d.sx[i] = rand();
    d.sy[i] = rand();
    d.keep[i] = galaxyKeep(d.rnd[i]);
    // full-brightness colour (depth 1); depth dimming goes into the alpha instead
    const [r, g, b] = galaxyColor(d.rnd[i], 1);
    d.look.set([r, g, b, galaxyBright(d.rnd[i])], i * 4);
  }
  return d;
}

/** galaxyColor's depth dimming, applied as alpha (additive blending makes it the same thing) */
const depthDim = (depth: number) => GALAXY.dimMin + (1 - GALAXY.dimMin) * depth * depth;

// ── shaders (GLSL ES 1.00, so one source serves WebGL2 and WebGL1) ──
// Additive passes write alpha = max(rgb), which keeps the output valid
// premultiplied colour: light over the page, like canvas 'lighter'.

const PANE_VS = `
attribute vec2 aAB;
uniform float uTheta, uXW, uZW;
uniform vec2 uView;
uniform vec2 uK, uC, uRes; // px per tesseract unit, centre px, canvas px
varying vec2 vUv;
varying float vFog;
varying float vFace;
${TESSERACT_GLSL}
void main() {
  vec4 p = tesseractProject(panePoint(aAB, uTheta), uXW, uZW, uView);
  // which side of the pane faces us: the screen-space cross of its a and b
  // directions, positive as at rest. Early in a turn the incoming pane (and
  // late in it the outgoing one) shows its back, which would read mirrored.
  vec2 da = tesseractProject(panePoint(aAB + vec2(0.1, 0.0), uTheta), uXW, uZW, uView).xy - p.xy;
  vec2 db = tesseractProject(panePoint(aAB + vec2(0.0, 0.1), uTheta), uXW, uZW, uView).xy - p.xy;
  vFace = da.x * db.y - da.y * db.x;
  vec2 px = uC + vec2(p.x * uK.x, -p.y * uK.y);
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
  vUv = vec2(aAB.x * 0.5 + 0.5, 0.5 - aAB.y * 0.5);
  vFog = clamp((1.0 - p.w) * 0.5, 0.0, 1.0); // 0 on the outer cell, 1 deep in w
}`;

const PANE_FS = `
precision mediump float;
uniform sampler2D uTex;
uniform float uAlpha, uFog, uSplit, uEcho;
varying vec2 vUv;
varying float vFog;
varying float vFace;
void main() {
  if (vFace <= 0.0) discard; // a pane is never seen from behind
  vec4 c = texture2D(uTex, vUv);
  if (uSplit > 0.0) {
    // red/cyan split along the turn
    vec4 r = texture2D(uTex, vUv + vec2(uSplit, 0.0));
    vec4 b = texture2D(uTex, vUv - vec2(uSplit, 0.0));
    c = vec4(r.r, c.g, b.b, max(c.a, max(r.a, b.a)));
  }
  float f = vFog * uFog;
  // fog: the far side of the pane sinks into dark red haze, with a faint glow
  c.rgb = mix(c.rgb, vec3(0.32, 0.025, 0.035) * c.a, 0.85 * f);
  c.a *= 1.0 - 0.55 * f;
  c.rgb += vec3(0.07, 0.006, 0.009) * f;
  if (uEcho > 0.5) {
    // time echo: the same pane at an earlier angle, as red light
    c.rgb = vec3(1.0, 0.13, 0.11) * dot(c.rgb, vec3(0.45, 0.4, 0.3));
  }
  c.a = max(c.a, max(c.r, max(c.g, c.b)));
  gl_FragColor = c * uAlpha;
}`;

const EDGE_VS = `
attribute vec2 aPos;
attribute vec4 aEdge; // along 0..1, across px, glint phase, length px
uniform vec2 uRes;
varying vec4 vEdge;
void main() {
  gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0);
  vEdge = aEdge;
}`;

const EDGE_FS = `
precision mediump float;
uniform float uLineA, uGlintA, uGlint, uDpr;
varying vec4 vEdge;
void main() {
  float d = vEdge.y / uDpr; // css px from the edge's centre line
  float core = exp(-d * d * 1.4);
  float glow = 0.35 * exp(-d * d * 0.18);
  // chrome glint: a narrow bright highlight that slides along the edge with scroll
  float g = fract(uGlint + vEdge.z);
  float dl = abs(vEdge.x - g);
  dl = min(dl, 1.0 - dl) * vEdge.w / (26.0 * uDpr);
  float glint = exp(-dl * dl) * (core + 0.6 * glow) * uGlintA;
  vec3 col = vec3(1.0, 0.91, 0.855) * (core + glow) * uLineA + vec3(1.0, 0.98, 0.96) * glint;
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;

const DUST_VS = `
attribute vec4 aDust; // x px, y px, size px, alpha
attribute vec4 aLook; // r, g, b, bright
uniform vec2 uRes;
uniform float uDpr;
varying vec4 vLook;
varying vec2 vSA; // size px, alpha
varying float vPt;
void main() {
  gl_Position = vec4(aDust.x / uRes.x * 2.0 - 1.0, 1.0 - aDust.y / uRes.y * 2.0, 0.0, 1.0);
  vPt = aLook.w > 0.5 ? max(12.0 * uDpr, aDust.z) : aDust.z;
  gl_PointSize = aDust.w > 0.003 ? vPt : 0.0;
  vLook = aLook;
  vSA = aDust.zw;
}`;

const DUST_FS = `
precision mediump float;
varying vec4 vLook;
varying vec2 vSA;
varying float vPt;
void main() {
  vec3 col = vLook.rgb * min(1.0, vSA.y);
  if (vLook.w > 0.5) {
    // bright star: a brighter core and a soft warm halo
    vec2 p = (gl_PointCoord - 0.5) * vPt;
    float core = step(max(abs(p.x), abs(p.y)), vSA.x * 0.5);
    float r = length(p) / (vPt * 0.5);
    float halo = r < 0.25 ? mix(0.9, 0.28, r / 0.25) : mix(0.28, 0.0, clamp((r - 0.25) / 0.75, 0.0, 1.0));
    col = vLook.rgb * core * min(1.0, vSA.y * 1.8) + vec3(1.0, 0.94, 0.894) * halo * min(1.0, vSA.y);
  }
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;

type GL = WebGLRenderingContext; // WebGL2 is used through its WebGL1 surface (plus generateMipmap on NPOT)

function program(gl: GL, vs: string, fs: string): WebGLProgram | null {
  const p = gl.createProgram();
  if (!p) return null;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[services] shader', gl.getShaderInfoLog(sh));
      return null;
    }
    gl.attachShader(p, sh);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('[services] program', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

/** uniform locations of a program, looked up once */
function uniforms(gl: GL, p: WebGLProgram, names: string[]) {
  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return u;
}

/** dev-only counter: rAF frames and GL draw calls of this component */
interface SvcStats {
  frames: number;
  draws: number;
  ms: number; // scripting time inside frame()
  texMs: number; // pane texture builds
  paneDraws: number;
}
const stats: SvcStats | null = import.meta.env.DEV ? { frames: 0, draws: 0, paneDraws: 0, ms: 0, texMs: 0 } : null;
if (stats) (window as unknown as { __svc: SvcStats }).__svc = stats;

export default function ServicesTesseract({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!track || !stage || !canvas) return;

    const dust = makeDust();
    const verts: Projected[] = VERTICES.map(() => ({ x: 0, y: 0, depth: 0 }));
    const dustData = new Float32Array(dust.count * 4);
    const edgeData = new Float32Array(EDGES.length * 6 * 6);

    // DOM writes only on change, so a scroll frame touches just what moved
    const written = new WeakMap<HTMLElement, Record<string, string>>();
    const put = (el: HTMLElement | null, key: 'opacity' | 'transform' | 'pointerEvents', v: string) => {
      if (!el) return;
      const w = written.get(el) ?? {};
      if (w[key] === v) return;
      w[key] = v;
      written.set(el, w);
      el.style[key] = v;
    };

    // ── GL setup; on a lost context everything below is rebuilt ──
    const attrs: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
    let gl: GL | null = null;
    let isGL2 = false;
    let res: ReturnType<typeof setupGL> = null;
    const dirty = [true, true, true, true]; // pane textures to rebuild
    const texCanvas = document.createElement('canvas');
    const tex2d = texCanvas.getContext('2d');

    function setupGL(g: GL) {
      const pane = program(g, PANE_VS, PANE_FS);
      const edge = program(g, EDGE_VS, EDGE_FS);
      const dots = program(g, DUST_VS, DUST_FS);
      if (!pane || !edge || !dots) return null;

      // pane grid: (a, b) over [-1, 1]², two triangles per cell
      const n = GRID + 1;
      const ab = new Float32Array(n * n * 2);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) ab.set([-1 + (2 * i) / GRID, -1 + (2 * j) / GRID], (j * n + i) * 2);
      const idx = new Uint16Array(GRID * GRID * 6);
      let o = 0;
      for (let j = 0; j < GRID; j++)
        for (let i = 0; i < GRID; i++) {
          const a = j * n + i;
          idx.set([a, a + 1, a + n, a + 1, a + n + 1, a + n], o);
          o += 6;
        }
      const gridBuf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, gridBuf);
      g.bufferData(g.ARRAY_BUFFER, ab, g.STATIC_DRAW);
      const idxBuf = g.createBuffer();
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, idxBuf);
      g.bufferData(g.ELEMENT_ARRAY_BUFFER, idx, g.STATIC_DRAW);

      const edgeBuf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, edgeBuf);
      g.bufferData(g.ARRAY_BUFFER, edgeData.byteLength, g.DYNAMIC_DRAW);
      const dustBuf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, dustBuf);
      g.bufferData(g.ARRAY_BUFFER, dustData.byteLength, g.DYNAMIC_DRAW);
      const lookBuf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, lookBuf);
      g.bufferData(g.ARRAY_BUFFER, dust.look, g.STATIC_DRAW);

      const textures = [0, 1, 2, 3].map(() => {
        const t = g.createTexture();
        g.bindTexture(g.TEXTURE_2D, t);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 1, 1, 0, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
        return t;
      });

      g.disable(g.DEPTH_TEST);
      g.enable(g.BLEND);
      return {
        pane,
        edge,
        dots,
        paneU: uniforms(g, pane, ['uTheta', 'uXW', 'uZW', 'uView', 'uK', 'uC', 'uRes', 'uTex', 'uAlpha', 'uFog', 'uSplit', 'uEcho']),
        edgeU: uniforms(g, edge, ['uRes', 'uLineA', 'uGlintA', 'uGlint', 'uDpr']),
        dotsU: uniforms(g, dots, ['uRes', 'uDpr']),
        paneAB: g.getAttribLocation(pane, 'aAB'),
        edgePos: g.getAttribLocation(edge, 'aPos'),
        edgeAttr: g.getAttribLocation(edge, 'aEdge'),
        dustAttr: g.getAttribLocation(dots, 'aDust'),
        lookAttr: g.getAttribLocation(dots, 'aLook'),
        gridBuf,
        idxBuf,
        idxCount: idx.length,
        edgeBuf,
        dustBuf,
        lookBuf,
        textures,
      };
    }

    const initGL = () => {
      const g2 = canvas.getContext('webgl2', attrs);
      gl = (g2 as unknown as WebGLRenderingContext | null) ?? canvas.getContext('webgl', attrs);
      isGL2 = !!g2;
      res = gl ? setupGL(gl) : null;
      dirty.fill(true);
      if (gl && res) warm(gl, res);
    };

    // One invisible draw per program and blend state at mount, so the driver
    // compiles its pipelines now and not on the first scroll frame that needs them.
    function warm(g: GL, R: NonNullable<ReturnType<typeof setupGL>>) {
      g.viewport(0, 0, 1, 1);
      g.useProgram(R.pane);
      g.bindBuffer(g.ARRAY_BUFFER, R.gridBuf);
      g.enableVertexAttribArray(R.paneAB);
      g.vertexAttribPointer(R.paneAB, 2, g.FLOAT, false, 0, 0);
      g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, R.idxBuf);
      g.uniform1f(R.paneU.uAlpha, 0);
      for (const [src, dst] of [
        [g.ONE, g.ONE],
        [g.ONE, g.ONE_MINUS_SRC_ALPHA],
      ]) {
        g.blendFunc(src, dst);
        g.drawElements(g.TRIANGLES, 6, g.UNSIGNED_SHORT, 0);
      }
      g.disableVertexAttribArray(R.paneAB);
      g.blendFunc(g.ONE, g.ONE);
      g.useProgram(R.edge);
      g.bindBuffer(g.ARRAY_BUFFER, R.edgeBuf);
      g.enableVertexAttribArray(R.edgePos);
      g.enableVertexAttribArray(R.edgeAttr);
      g.vertexAttribPointer(R.edgePos, 2, g.FLOAT, false, 24, 0);
      g.vertexAttribPointer(R.edgeAttr, 4, g.FLOAT, false, 24, 8);
      g.drawArrays(g.TRIANGLES, 0, 6);
      g.disableVertexAttribArray(R.edgePos);
      g.disableVertexAttribArray(R.edgeAttr);
      g.useProgram(R.dots);
      g.bindBuffer(g.ARRAY_BUFFER, R.dustBuf);
      g.enableVertexAttribArray(R.dustAttr);
      g.vertexAttribPointer(R.dustAttr, 4, g.FLOAT, false, 0, 0);
      g.bindBuffer(g.ARRAY_BUFFER, R.lookBuf);
      g.enableVertexAttribArray(R.lookAttr);
      g.vertexAttribPointer(R.lookAttr, 4, g.FLOAT, false, 0, 0);
      g.drawArrays(g.POINTS, 0, 1);
      g.disableVertexAttribArray(R.dustAttr);
      g.disableVertexAttribArray(R.lookAttr);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
    }
    initGL();

    let dpr = 1;
    let W = 0;
    let H = 0;
    const resize = () => {
      dpr = LIGHT ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.round(stage.clientWidth * dpr);
      H = Math.round(stage.clientHeight * dpr);
      canvas.width = W;
      canvas.height = H;
      dirty.fill(true);
      prepareSoon();
    };

    // ── pane texture: the resting DOM screen, redrawn into a 2D canvas ──
    // Each word, still and underline is drawn at the place the DOM lays it
    // out, so at rest the pane and the screen coincide. Runs on resize, font
    // load and when a still finishes decoding, never per scroll frame.
    const range = document.createRange();
    const WORD = /[^\s]+/g;
    const buildTexture = (k: number) => {
      const t0 = stats ? performance.now() : 0;
      const screen = screenRefs.current[k];
      const tex = res?.textures[k];
      if (!gl || !tex || !screen || !tex2d) return;
      const sw = stage.clientWidth;
      const sh = stage.clientHeight;
      if (!sw || !sh) return;
      const tw = TEX_W;
      const th = Math.max(1, Math.round((tw * sh) / sw));
      if (texCanvas.width !== tw) texCanvas.width = tw;
      if (texCanvas.height !== th) texCanvas.height = th;
      const g = tex2d;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.clearRect(0, 0, tw, th);
      // dark glass, a faint red rim
      g.fillStyle = 'rgba(14,2,5,0.3)';
      g.fillRect(0, 0, tw, th);
      g.strokeStyle = 'rgba(255,40,40,0.2)';
      g.lineWidth = 2;
      g.strokeRect(1, 1, tw - 2, th - 2);

      // stage css px → texture px: the pane covers the stage inset by INSET
      const sc = tw / (sw * INSET);
      g.setTransform(sc, 0, 0, sc, tw / 2 - (sc * sw) / 2, th / 2 - (sc * sh) / 2);
      const box = screen.getBoundingClientRect();
      const z = box.width / sw || 1; // the screen's own scale, if any
      const lx = (x: number) => (x - box.left) / z;
      const ly = (y: number) => (y - box.top) / z;

      // stills: frame, then the dither canvas as it rests
      for (const wrap of screen.querySelectorAll<HTMLElement>('[role="img"]')) {
        const r = wrap.getBoundingClientRect();
        const x = lx(r.left);
        const y = ly(r.top);
        const w = r.width / z;
        const h = r.height / z;
        g.fillStyle = '#050505';
        g.fillRect(x, y, w, h);
        const cv = wrap.querySelector('canvas');
        if (cv && cv.width > 2 && cv.height > 2) g.drawImage(cv, x, y, w, h);
        g.strokeStyle = getComputedStyle(wrap).borderTopColor;
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }

      // text, word by word
      const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const el = node.parentElement;
        if (!el) continue;
        const cs = getComputedStyle(el);
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        if ('letterSpacing' in g) (g as { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        g.fillStyle = cs.color;
        g.textBaseline = 'alphabetic';
        const upper = cs.textTransform === 'uppercase';
        const underline = cs.textDecorationLine.includes('underline');
        const data = node.data;
        WORD.lastIndex = 0;
        for (let m = WORD.exec(data); m; m = WORD.exec(data)) {
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const r = range.getBoundingClientRect();
          if (!r.width) continue;
          const word = upper ? m[0].toUpperCase() : m[0];
          const met = g.measureText(word);
          const x = lx(r.left);
          const w = r.width / z;
          const base = ly(r.top) + (met.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.8);
          const fit = met.width > 0 ? w / met.width : 1;
          if (Math.abs(fit - 1) > 0.01 && fit > 0.75 && fit < 1.33) {
            g.save();
            g.translate(x, 0);
            g.scale(fit, 1);
            g.fillText(word, 0, base);
            g.restore();
          } else g.fillText(word, x, base);
          if (underline) {
            g.fillStyle = cs.textDecorationColor;
            g.fillRect(x, base + 4, w, 1);
            g.fillStyle = cs.color;
          }
        }
      }

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texCanvas);
      if (isGL2) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }
      dirty[k] = false;
      if (stats) stats.texMs += performance.now() - t0;
    };

    // Textures are built while the browser is idle, ahead of the scroll that
    // needs them; a frame builds one itself only if it must show it now.
    let idleId = 0;
    const prepare = () => {
      idleId = 0;
      for (let k = 0; k < CELLS; k++) if (dirty[k] && gl && res) buildTexture(k);
    };
    const prepareSoon = () => {
      if (idleId) return;
      idleId =
        typeof requestIdleCallback === 'function'
          ? requestIdleCallback(prepare, { timeout: 400 })
          : window.setTimeout(prepare, 50);
    };

    let drawn = false;
    let raf = 0;

    const frame = () => {
      raf = 0;
      if (!stats) return draw();
      const t0 = performance.now();
      stats.frames++;
      draw();
      stats.ms += performance.now() - t0;
    };

    const draw = () => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) {
        if (drawn && gl) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        drawn = false;
        return;
      }
      const stageH = stage.clientHeight;
      const dist = rect.height - stageH;
      const u = Math.max(-PRE, Math.min(TOTAL, (-rect.top / dist) * TOTAL));
      const lift = Math.max(0, rect.top); // css px of the stage still below the top of the view
      const s = sceneAt(u);

      // a pane shown this frame with a stale texture is rebuilt now, before any
      // style write, so its measuring forces no extra layout
      if (gl && res)
        for (let k = 0; k < CELLS; k++) if (dirty[k] && s.pane[k] > 0 && s.opacity[k] < 1) buildTexture(k);

      // ── screens ──
      for (let k = 0; k < CELLS; k++) {
        const el = screenRefs.current[k];
        put(el, 'opacity', s.opacity[k].toFixed(3));
        put(el, 'pointerEvents', s.opacity[k] > 0.5 ? 'auto' : 'none');
        const on = s.opacity[k] > 0;
        const tx = on ? s.dx * stage.clientWidth : 0;
        const ty = on ? s.dy * stageH : 0;
        put(
          el,
          'transform',
          s.scale[k] === 1 && !tx && !ty ? '' : `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.scale[k].toFixed(4)})`,
        );
      }

      if (!gl || !res) return;
      const R = res;
      const g = gl;
      let draws = 0;

      // ── tesseract ──
      const cx = W / 2 + s.dx * W;
      const cy = H / 2 - (lift * dpr) / 2 + s.dy * H; // centred in the visible part of the stage before the pin
      const short = Math.min(W, H) / 2;
      const kOf = (sc: Scene): [number, number] => [
        (sc.zoom * (short + ((W / 2) * INSET - short) * sc.aspect)) / FRAME_EXTENT,
        (sc.zoom * (short + ((H / 2) * INSET - short) * sc.aspect)) / FRAME_EXTENT,
      ];
      const [kx, ky] = kOf(s);
      for (let i = 0; i < VERTICES.length; i++) {
        const p = project(VERTICES[i], s.xw, s.zw, verts[i], s.yaw, s.pitch);
        p.x = cx + p.x * kx;
        p.y = cy - p.y * ky;
      }

      g.viewport(0, 0, W, H);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);

      // ── panes: echoes (additive red light) under the panes (premultiplied over) ──
      const alphaOf = (k: number) => s.pane[k] * clamp01(2 * (1 - s.opacity[k]));
      const live: number[] = [];
      for (let k = 0; k < CELLS; k++) if (alphaOf(k) > 0.003) live.push(k);
      if (live.length) {
        g.useProgram(R.pane);
        g.bindBuffer(g.ARRAY_BUFFER, R.gridBuf);
        g.enableVertexAttribArray(R.paneAB);
        g.vertexAttribPointer(R.paneAB, 2, g.FLOAT, false, 0, 0);
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, R.idxBuf);
        const U = R.paneU;
        g.uniform2f(U.uRes, W, H);
        g.uniform2f(U.uC, cx, cy);
        g.uniform1i(U.uTex, 0);
        g.uniform1f(U.uFog, 1);
        g.activeTexture(g.TEXTURE0);
        const drawPane = (k: number, sc: Scene, alpha: number, echo: boolean) => {
          const [ex, ey] = kOf(sc);
          g.bindTexture(g.TEXTURE_2D, R.textures[k]);
          g.uniform1f(U.uTheta, paneTheta(k));
          g.uniform1f(U.uXW, sc.xw);
          g.uniform1f(U.uZW, sc.zw);
          g.uniform2f(U.uView, sc.yaw, sc.pitch);
          g.uniform2f(U.uK, ex, ey);
          g.uniform1f(U.uAlpha, alpha);
          g.uniform1f(U.uEcho, echo ? 1 : 0);
          g.uniform1f(U.uSplit, echo ? 0 : (SPLIT_PX * s.split) / (stage.clientWidth * INSET));
          g.drawElements(g.TRIANGLES, R.idxCount, g.UNSIGNED_SHORT, 0);
          draws++;
          if (stats) stats.paneDraws++;
        };
        if (s.echo > 0.003) {
          g.blendFunc(g.ONE, g.ONE);
          for (let i = ECHOES; i >= 1; i--) {
            const past = sceneAt(u - i * ECHO_DU);
            for (const k of live) drawPane(k, past, alphaOf(k) * ECHO_A[i - 1] * s.echo, true);
          }
        }
        g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
        for (const k of live) drawPane(k, s, alphaOf(k), false);
        g.disableVertexAttribArray(R.paneAB);
      }

      g.blendFunc(g.ONE, g.ONE);

      // ── edges: faint lines with a glow and a chrome glint, once the dust has found them ──
      const gate = s.formed * smooth(0.6, 1, s.gather) * (1 - smooth(0, 0.7, s.exit));
      const lineA = (0.018 + 0.07 * s.energy) * gate;
      const glintA = (0.22 + 0.6 * s.energy) * gate;
      if (lineA > 0.002) {
        const burstLine = 1 + s.exit * s.exit * 1.5;
        const hw = 4 * dpr;
        let o = 0;
        for (let e = 0; e < EDGES.length; e++) {
          const A = verts[EDGES[e][0]];
          const B = verts[EDGES[e][1]];
          const ax = cx + (A.x - cx) * burstLine;
          const ay = cy + (A.y - cy) * burstLine;
          const bx = cx + (B.x - cx) * burstLine;
          const by = cy + (B.y - cy) * burstLine;
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const nx = (-(by - ay) / len) * hw;
          const ny = ((bx - ax) / len) * hw;
          const ph = fract(e * 0.618); // each edge's glint starts elsewhere
          // two triangles: (A-, A+, B-) (A+, B+, B-); x, y, along, across, phase, length
          for (const [px, py, al, ac] of [
            [ax - nx, ay - ny, 0, -hw],
            [ax + nx, ay + ny, 0, hw],
            [bx - nx, by - ny, 1, -hw],
            [ax + nx, ay + ny, 0, hw],
            [bx + nx, by + ny, 1, hw],
            [bx - nx, by - ny, 1, -hw],
          ]) {
            edgeData.set([px, py, al, ac, ph, len], o);
            o += 6;
          }
        }
        g.useProgram(R.edge);
        g.bindBuffer(g.ARRAY_BUFFER, R.edgeBuf);
        g.bufferSubData(g.ARRAY_BUFFER, 0, edgeData);
        g.enableVertexAttribArray(R.edgePos);
        g.enableVertexAttribArray(R.edgeAttr);
        g.vertexAttribPointer(R.edgePos, 2, g.FLOAT, false, 24, 0);
        g.vertexAttribPointer(R.edgeAttr, 4, g.FLOAT, false, 24, 8);
        g.uniform2f(R.edgeU.uRes, W, H);
        g.uniform1f(R.edgeU.uLineA, lineA);
        g.uniform1f(R.edgeU.uGlintA, glintA);
        g.uniform1f(R.edgeU.uGlint, u * 0.6);
        g.uniform1f(R.edgeU.uDpr, dpr);
        g.drawArrays(g.TRIANGLES, 0, EDGES.length * 6);
        draws++;
        g.disableVertexAttribArray(R.edgePos);
        g.disableVertexAttribArray(R.edgeAttr);
      }

      // ── dust streams ──
      const spread = (1.5 + 9 * s.energy) * dpr;
      const aEdge = 0.22 + 0.6 * s.energy;
      const x2 = s.exit * s.exit;
      for (let i = 0; i < dust.count; i++) {
        const o = i * 4;
        const lit = dust.keep[i] ? 1 : s.formed;
        dustData[o + 3] = 0;
        if (lit <= 0.003) continue;
        const [ia, ib] = EDGES[dust.edge[i]];
        const A = verts[ia];
        const B = verts[ib];
        const t = fract(dust.s0[i] + dust.flow[i] * u);
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len = Math.hypot(dx, dy) || 1;
        let x = A.x + dx * t - (dy / len) * dust.jitter[i] * spread;
        let y = A.y + dy * t + (dx / len) * dust.jitter[i] * spread;
        const depth = A.depth + (B.depth - A.depth) * t;
        if (s.exit > 0) {
          const f = 1 + x2 * dust.burst[i];
          x = cx + (x - cx) * f;
          y = cy + (y - cy) * f;
        }
        const gt = smooth(dust.delay[i], dust.delay[i] + 0.55, s.gather);
        if (gt < 1) {
          x = dust.sx[i] * W + (x - dust.sx[i] * W) * gt;
          y = dust.sy[i] * H + (y - dust.sy[i] * H) * gt;
        }
        if (x < -8 || y < -8 || x > W + 8 || y > H + 8) continue;
        dustData[o] = x;
        dustData[o + 1] = y;
        dustData[o + 2] = galaxySize(dust.rnd[i], depth) * dpr;
        dustData[o + 3] = lit * depthDim(depth) * (0.55 + (aEdge - 0.55) * gt);
      }
      g.useProgram(R.dots);
      g.bindBuffer(g.ARRAY_BUFFER, R.dustBuf);
      g.bufferSubData(g.ARRAY_BUFFER, 0, dustData);
      g.enableVertexAttribArray(R.dustAttr);
      g.vertexAttribPointer(R.dustAttr, 4, g.FLOAT, false, 0, 0);
      g.bindBuffer(g.ARRAY_BUFFER, R.lookBuf);
      g.enableVertexAttribArray(R.lookAttr);
      g.vertexAttribPointer(R.lookAttr, 4, g.FLOAT, false, 0, 0);
      g.uniform2f(R.dotsU.uRes, W, H);
      g.uniform1f(R.dotsU.uDpr, dpr);
      g.drawArrays(g.POINTS, 0, dust.count);
      draws++;
      g.disableVertexAttribArray(R.dustAttr);
      g.disableVertexAttribArray(R.lookAttr);

      if (stats) stats.draws += draws;
      drawn = true;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      resize();
      schedule();
    };
    const markAll = () => {
      dirty.fill(true);
      prepareSoon();
    };

    resize();
    frame();
    const ro = new ResizeObserver(onResize);
    ro.observe(stage);
    window.addEventListener('scroll', schedule, { passive: true });
    void document.fonts?.ready.then(markAll);
    document.fonts?.addEventListener('loadingdone', markAll);
    // a still's dither canvas is (re)built: redraw that pane's texture
    const mos = screenRefs.current.map((screen, k) => {
      if (!screen) return null;
      const mo = new MutationObserver(() => {
        dirty[k] = true;
        prepareSoon();
      });
      mo.observe(screen, { subtree: true, attributes: true, attributeFilter: ['width', 'height'] });
      return mo;
    });
    const onLost = (e: Event) => {
      e.preventDefault();
      res = null;
    };
    const onRestored = () => {
      initGL();
      prepareSoon();
      schedule();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      cancelAnimationFrame(raf);
      if (idleId) (typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout)(idleId);
      ro.disconnect();
      mos.forEach((mo) => mo?.disconnect());
      window.removeEventListener('scroll', schedule);
      document.fonts?.removeEventListener('loadingdone', markAll);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      range.detach();
    };
  }, []);

  // The header's Services link lands on the first pane at rest, facing you
  useEffect(
    () =>
      registerLand('services', () => {
        const track = trackRef.current;
        const stage = stageRef.current;
        if (!track || !stage) return null;
        const rect = track.getBoundingClientRect();
        return window.scrollY + rect.top + (restMid(0) / TOTAL) * (rect.height - stage.clientHeight);
      }),
    [],
  );

  // Keyboard: a link inside a screen that is not at rest takes you to that
  // screen's rest midpoint, so the focused copy is always readable.
  const onScreenFocus = (k: number) => {
    const go = () => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      const rect = track.getBoundingClientRect();
      const dist = rect.height - stage.clientHeight;
      const u = clamp01(-rect.top / dist) * TOTAL;
      const a = restStart(k);
      if (u >= a && u <= a + REST) return;
      window.scrollTo({ top: window.scrollY + rect.top + (restMid(k) / TOTAL) * dist, behavior: 'auto' });
    };
    go();
    // the browser may still scroll the focused link into view after this event
    requestAnimationFrame(go);
  };

  return (
    <div
      ref={trackRef}
      data-services-track
      className="relative mt-[7vh]"
      style={{ height: `${Math.round((1 + TOTAL) * 100)}svh`, marginBottom: `${-OVERLAP * 100}svh` }}
    >
      <div ref={stageRef} className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        {Children.map(children, (child, k) => (
          <div
            ref={(el) => {
              screenRefs.current[k] = el;
            }}
            onFocus={() => onScreenFocus(k)}
            className="absolute inset-0 flex items-center pt-[72px] pb-4 md:pt-[88px] md:pb-10"
            style={{ opacity: 0, pointerEvents: 'none' }}
          >
            <div className="site-frame">{child}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
