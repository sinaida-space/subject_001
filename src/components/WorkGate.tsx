// ─────────────────────────────────────────────────────────────────────────
// Work gate (#121): About → Body of Work, step 1 of 3: the monolith.
//
// A pure function of the scroll position: one progress p (0..1) from the
// moment About has been built and read a little to the moment Work is in,
// so scrolling back plays the same frames in reverse and nothing moves at
// rest. The gate gets its own scroll room (a spacer before Work).
//
//   build   a black slab, 1:4:9, is developed bottom to top out of 3 px
//           Bayer cells: it occludes the stars behind it and reads by its
//           red rim, a glint that sweeps its faces and sparse grey cells
//   turn    the camera sits low and closes in non-linearly while the slab
//           turns; the glint and the rim move with every step
//   align   a red star rises over the slab's top edge and flares once
//   fill    the slab fills the screen and dissolves cell by cell onto Work
//           (placeholder until steps 2 and 3: tesseract unfold, landing)
//
// One WebGL2 canvas, drawn only on scroll frames while the gate is on
// screen. Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// eased 0..1 inside [a, b]
const seg = (p: number, a: number, b: number) => {
  const t = clamp01((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const CELL = 3; // css px, the site's dither cell
// Phones get a lighter gate: 1x density, no glint.
const LIGHT = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

// The gate starts once About's bottom edge has risen to START of the screen
// (About is fully poured by ~0.9 and read a little by then) and ends when
// Work's top reaches END. The spacer gives it this much extra scroll.
const START = 0.5;
const END = 0.18;
const ROOM = 1.1; // screens

// Kubrick's slab, half extents: depth 1, width 4, height 9
const BOX = [2.0, 4.5, 0.5] as const;
const FOCAL = 2.4;

const VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;      // device px
uniform float uCell;    // device px per dither cell
uniform vec2 uCenter;   // device px, the slab's centre on screen (y down)
uniform float uDist;    // camera distance
uniform float uYaw;
uniform float uPitch;
uniform float uBuild;   // 0..1, developed bottom to top
uniform float uMelt;    // 0..1, dissolved top to bottom
uniform float uSheen;   // glint light angle
uniform float uGlint;   // glint strength (0 on phones)
uniform vec3 uStar;     // device px x, y, flare 0..1
uniform float uStarOn;
out vec4 outColor;

const vec3 B = vec3(${BOX[0].toFixed(2)}, ${BOX[1].toFixed(2)}, ${BOX[2].toFixed(2)});
const vec3 RED = vec3(0.804, 0.0, 0.0);
const vec3 RED_HOT = vec3(1.0, 0.2, 0.17);
const vec3 BONE = vec3(0.86, 0.84, 0.8);
const vec3 VOID = vec3(0.0196);

float bayer8(vec2 c) {
  ivec2 p = ivec2(mod(c, 8.0));
  float v = 0.0;
  for (int bit = 0; bit < 3; bit++) {
    int xb = (p.x >> bit) & 1, yb = (p.y >> bit) & 1;
    v += float(((xb ^ yb) * 2 + yb) << (2 * (2 - bit)));
  }
  return (v + 0.5) / 64.0;
}

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }

void main() {
  // one decision per 3 px cell, made at the cell's centre; the grid is the screen's
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 cell = floor(frag / uCell);
  vec2 q = (cell + 0.5) * uCell;
  float th = bayer8(cell);

  // camera: low, looking at the slab; screen units are half the screen height
  vec2 s = (q - uCenter) / (uRes.y * 0.5);
  vec3 ro = vec3(0.0, 0.0, -uDist);
  vec3 rd = normalize(vec3(s.x, -s.y, ${FOCAL.toFixed(2)}));
  // into the slab's frame
  mat3 R = rotY(uYaw) * rotX(uPitch);
  mat3 Ri = transpose(R);
  vec3 o = Ri * ro, d = Ri * rd;

  // ray against the box (slab method)
  vec3 inv = 1.0 / d;
  vec3 t0 = (-B - o) * inv, t1 = (B - o) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float tN = max(max(tn.x, tn.y), tn.z), tF = min(min(tf.x, tf.y), tf.z);

  vec3 col = vec3(0.0);
  float a = 0.0;

  if (tN < tF && tF > 0.0) {
    vec3 h = o + d * tN;
    vec3 n = tn.x >= tn.y && tn.x >= tn.z ? vec3(-sign(d.x), 0, 0)
           : tn.y >= tn.z ? vec3(0, -sign(d.y), 0) : vec3(0, 0, -sign(d.z));
    float up = (h.y + B.y) / (2.0 * B.y);   // 0 bottom .. 1 top

    // developed bottom to top on the Bayer threshold, dissolved the same way everywhere at once
    float built = step(up, uBuild * 1.12 - th * 0.12);
    float kept = step(uMelt, th);
    if (built * kept > 0.5) {
      // distance to the nearest edge of this face
      vec3 e3 = B - abs(h);
      float e = n.x != 0.0 ? min(e3.y, e3.z) : n.y != 0.0 ? min(e3.x, e3.z) : min(e3.x, e3.y);
      vec3 nw = R * n;
      vec3 key = normalize(vec3(-0.55, 0.45, -0.7));
      float diff = max(dot(nw, key), 0.0);
      vec3 gdir = normalize(vec3(sin(uSheen), 0.35, -cos(uSheen)));
      float spec = pow(max(dot(reflect(rd, nw), gdir), 0.0), 48.0) * uGlint;
      // the rim is a fixed width on screen: about one and a half cells
      float px = uDist / (${FOCAL.toFixed(2)} * uRes.y * 0.5) * uCell;
      // backlit from behind, above and to the right: only the faces turned that way catch it
      float back = clamp(dot(nw, normalize(vec3(0.75, 0.5, 0.45))) + 0.35, 0.0, 1.0);
      float rim = exp(-e / (1.4 * px)) * back;
      // black glass: it holds a faint reflection of the horizon, rising from its base
      float horizon = exp(-up / 0.12) * 0.22 + exp(-up / 0.5) * 0.05;

      float lum = (horizon + 0.07 * diff) * (0.5 + 0.5 * diff) + 0.45 * spec;
      float red = rim * 1.15;
      // the front of the build sparks red as it climbs
      red += exp(-abs(up - uBuild) / 0.015) * (1.0 - step(0.999, uBuild)) * 0.9;

      a = 1.0;
      col = VOID;
      if (red > th) col = mix(RED, RED_HOT, clamp(red - 1.0, 0.0, 1.0));
      else if (lum > th) col = BONE * (0.55 + 0.45 * lum);
    }
  }

  // the star over the top edge: a dithered red point and a thin cross flare
  if (uStarOn > 0.0 && a < 0.5) {
    vec2 dv = (q - uStar.xy) / uCell;
    float r = length(dv);
    float core = exp(-r * r / (1.5 + 3.0 * uStar.z));
    float flareLen = 4.0 + 26.0 * uStar.z;
    float flr = (exp(-abs(dv.y) * 2.0) * exp(-abs(dv.x) / flareLen) + exp(-abs(dv.x) * 2.0) * exp(-abs(dv.y) / (flareLen * 0.6))) * (0.35 + 0.65 * uStar.z);
    float g = max(core, flr) * uStarOn;
    if (g > th) { col = r < 1.5 ? RED_HOT : RED; a = 1.0; }
  }

  outColor = vec4(col * a, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}

export default function WorkGate({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const about = document.getElementById('about');
    const work = root?.querySelector<HTMLElement>('#work');
    const screen = work?.firstElementChild as HTMLElement | null;
    const gl = canvas?.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!root || !canvas || !about || !work || !screen || !gl) return;

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    } catch (e) {
      console.error('WorkGate:', e);
      return;
    }
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      res: U('uRes'), cell: U('uCell'), center: U('uCenter'), dist: U('uDist'), yaw: U('uYaw'), pitch: U('uPitch'),
      build: U('uBuild'), melt: U('uMelt'), sheen: U('uSheen'), glint: U('uGlint'), star: U('uStar'), starOn: U('uStarOn'),
    };
    const vao = gl.createVertexArray();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let dpr = 1;
    const resize = () => {
      dpr = LIGHT ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // Work's opacity, written only on change
    let written = '';
    const put = (v: string) => {
      if (v === written) return;
      written = v;
      screen.style.opacity = v;
    };
    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
    };

    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight, w = window.innerWidth;
      const ab = about.getBoundingClientRect().bottom;
      const wt = work.getBoundingClientRect().top;
      // gate length in scroll px: About's bottom from START to Work's top at END
      const len = wt - ab + (START - END) * vh;
      const p = clamp01((START * vh - ab) / len);

      if (p <= 0 || p >= 1) {
        put(p <= 0 ? '0' : '');
        show(false);
        return;
      }
      put(seg(p, 0.84, 0.98).toFixed(3));

      // the camera: far and low, closing in slowly, then fast; the slab turns throughout
      const near = Math.pow(seg(p, 0.0, 0.88), 1.7);
      const dist = mix(40, 8.5, near);
      const yaw = mix(0.62, -0.5, seg(p, 0.0, 1.0)) + 0.18 * Math.sin(p * 4.2);
      const pitch = mix(-0.1, 0.06, p);
      // it rises out of the band under About into the middle of the screen
      const cy = mix(vh * 0.95, vh * 0.52, seg(p, 0.0, 0.32));
      const build = seg(p, 0.02, 0.3);
      const melt = seg(p, 0.82, 1.0);

      // the star rides just over the top edge; projected with the same camera
      const topY = cy - ((BOX[1] * FOCAL) / dist) * (vh * 0.5);
      const flare = Math.exp(-Math.pow((p - 0.5) / 0.06, 2));
      const starOn = seg(p, 0.3, 0.42) * (1 - seg(p, 0.66, 0.78));
      const starY = topY - mix(60, 14, seg(p, 0.3, 0.5)) - 10;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.cell, Math.max(1, Math.round(CELL * dpr)));
      gl.uniform2f(u.center, (w / 2) * dpr, cy * dpr);
      gl.uniform1f(u.dist, dist);
      gl.uniform1f(u.yaw, yaw);
      gl.uniform1f(u.pitch, pitch);
      gl.uniform1f(u.build, build);
      gl.uniform1f(u.melt, melt);
      gl.uniform1f(u.sheen, mix(-1.2, 1.4, p));
      gl.uniform1f(u.glint, LIGHT ? 0 : 1);
      gl.uniform3f(u.star, (w / 2) * dpr, starY * dpr, flare);
      gl.uniform1f(u.starOn, starOn);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      show(true);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onResize = () => {
      resize();
      schedule();
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      screen.style.opacity = '';
      // no loseContext(): on macOS Chrome it blanks the window for a frame (#119)
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {/* the gate's own scroll room */}
      <div aria-hidden="true" style={{ height: `${ROOM * 100}svh` }} />
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
