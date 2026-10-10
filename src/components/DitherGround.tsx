import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CITY, GROUND_DROP, cityBus, endEyeY, span, textRects } from '@/lib/city';
import { FLIGHT, SWING } from '@/lib/flight';

// ── The ground, in dither (#179) ──
// Under the horizon at the end of the page, beneath the city's soft lights
// (CityGround): the ground itself, as matter. A plane under the last eye
// height, its street grid and dark river read through a 4x4 Bayer dither in
// two dim tones. The grain lies on the ground in perspective, squares that
// widen toward the feet and fall back to 2 css px cells near the horizon
// (one canvas pixel per cell, scaled up pixelated). It grows out of the
// vanishing point toward the feet, quiet, and clears away from every line
// of text. Dither on a moving plane flips cells only while the camera moves;
// at rest it is still.
//
// The track is the flight seen from above, laid ahead: one red line from the
// feet to the horizon bending as the path bent, with a star mark per chapter
// (Contact nearest, then Services, Work, About). A Navigate link lights its
// mark.
//
// Dither is matter and bloom is light: this canvas sits above the star
// field, outside its bloom and its blur, so no halo ever reaches it. It
// draws only when the camera, the scroll or a hover changes.

const CELL = 2; // css px per dither cell
const RED = '1.0, 0.04, 0.04'; // --primary-legible
const DEPTH = 90; // world units the city runs ahead
const MASK_PAD = 10; // cells of soft edge around the text the ground clears from
const MAX_MASKS = 32; // lines of text the ground keeps clear of

// the flight's end, where the city lies
const CX = -FLIGHT.x;
const GROUND_Y = endEyeY(-FLIGHT.y) - GROUND_DROP;
const FEET_Z = FLIGHT.home - FLIGHT.z + 3; // the camera's z after the dolly

const BAYER = `
float bayer(vec2 c) {
  int x = int(mod(c.x, 4.0)), y = int(mod(c.y, 4.0));
  int B[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(B[x + y * 4]) + 0.5) / 16.0;
}`;

// the text rects (cells, y up) the ground and the track keep clear of:
// 0 inside, 1 a pad away
const MASK = `
uniform vec4 uMask[${MAX_MASKS}];
uniform int uMasks;
float clear(vec2 cell, float pad) {
  float c = 1.0;
  for (int i = 0; i < ${MAX_MASKS}; i++) {
    if (i >= uMasks) break;
    vec2 o2 = max(uMask[i].xy - cell, cell - uMask[i].zw);
    c = min(c, smoothstep(0.0, pad, max(o2.x, o2.y)));
  }
  return c;
}`;

const quadVert = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const groundFrag = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uCam;
uniform mat3 uRot;
uniform float uTanY;
uniform float uAspect;
uniform float uGroundY;
uniform vec2 uCenter;
uniform float uGrow;
out vec4 o;
${BAYER}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
// how much of a band of half-width w, d away, one cell's footprint covers
float cover(float d, float w, float foot) {
  float h = 0.5 * max(foot, 1e-4);
  return max(0.0, min(d + h, w) - max(d - h, -w)) / (2.0 * h);
}
// a line of half-width w every period, d the distance to it, averaged over the
// footprint of one cell so the far streets thin instead of aliasing
float street(float d, float w, float foot, float period) {
  return mix(cover(d, w, foot), 2.0 * w / period, smoothstep(0.25 * period, period, foot));
}
${MASK}
// the ground's matter at q (city coords) seen through a footprint foot: the
// street grid, every fourth an avenue, the river dark
float matter(vec2 q, float z, float foot) {
  const float BLOCK = 0.9;
  vec2 g = q / BLOCK;
  vec2 d = abs(fract(g + 0.5) - 0.5) * BLOCK;
  vec2 id = floor(g + 0.5);
  float sx = street(d.x, 0.035, foot, BLOCK) * (mod(id.x, 4.0) == 0.0 ? 0.7 : 0.32);
  float sz = street(d.y, 0.035, foot, BLOCK) * (mod(id.y, 4.0) == 0.0 ? 0.7 : 0.32);
  float rx = 2.2 + 3.0 * sin(z * 0.07) + 1.2 * sin(z * 0.19);
  return max(sx, sz) * smoothstep(0.35, 0.55 + foot, abs(q.x - rx));
}
void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 ndc = (cell + 0.5) / uRes * 2.0 - 1.0;
  vec3 dir = uRot * vec3(ndc.x * uTanY * uAspect, ndc.y * uTanY, -1.0);
  float below = step(dir.y, -1e-4);
  float t = (uGroundY - uCam.y) / min(dir.y, -1e-4);
  vec3 p = uCam + dir * t;
  float hd = length(p.xz - uCam.xz);
  float foot = max(fwidth(p.x), fwidth(p.z));

  // the grain lies on the ground: squares of GRAIN world units, read at their
  // centres, so they widen toward the feet; where a square would be smaller
  // than a cell the grain falls back to the screen's own 2 px grid
  const float GRAIN = 0.07;
  vec2 gc = floor(p.xz / GRAIN);
  vec2 pc = (gc + 0.5) * GRAIN;
  bool near = foot < 0.8 * GRAIN;
  vec2 at = near ? pc : p.xz;
  float dens = matter(at - uCenter, near ? pc.y : p.z, near ? GRAIN : foot);
  float th = near ? bayer(gc) : bayer(cell);

  // haze toward the horizon, the city thinning out sideways
  vec2 q = p.xz - uCenter;
  dens *= 1.0 - 0.75 * smoothstep(0.0, ${DEPTH.toFixed(1)}, hd);
  dens *= 1.0 - smoothstep(0.75, 1.0, abs(q.x) / (hd * 1.25 + 4.0));
  // it grows from the vanishing point to the feet
  float edge = (1.0 - uGrow) * ${DEPTH.toFixed(1)};
  dens *= smoothstep(edge - 3.0, edge + 3.0, hd);
  // gone under the text
  dens *= clear(cell, ${MASK_PAD.toFixed(1)});
  dens *= below;
  if (th >= dens) discard;
  // two tones: most of it dim, the avenues' cores brighter
  float a = dens > 0.3 + 0.5 * th ? 0.5 : 0.2;
  o = vec4(a, a, a, a);
}`;

const trackVert = `#version 300 es
uniform mat4 uViewProj;
in vec3 aPos;
in float aS;
out float vS;
void main() {
  vS = aS;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

const trackFrag = `#version 300 es
precision highp float;
uniform float uTrack;
in float vS;
out vec4 o;
${BAYER}
${MASK}
void main() {
  // drawn from the horizon toward the feet, dotted with distance; it passes
  // under the text
  vec2 cell = floor(gl_FragCoord.xy);
  if (vS < 1.0 - uTrack || bayer(cell) >= 1.0 - 0.7 * vS || clear(cell, 1.0) < 0.5) discard;
  o = vec4(${RED}, 1.0);
}`;

const markVert = `#version 300 es
uniform mat4 uViewProj;
uniform float uTrack;
in vec3 aPos;
in float aS;
in float aLit;
out float vLit;
out float vSize;
void main() {
  vLit = aLit;
  vSize = 5.0 + 2.0 * floor(3.0 * aLit + 0.5);
  gl_PointSize = vSize;
  gl_Position = aS >= 1.0 - uTrack ? uViewProj * vec4(aPos, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}`;

const markFrag = `#version 300 es
precision highp float;
in float vLit;
in float vSize;
out vec4 o;
void main() {
  // a star of cells: a cross, and diagonal glints once lit
  float r = floor(vSize * 0.5);
  vec2 c = abs(floor(gl_PointCoord * vSize) - r);
  bool arm = min(c.x, c.y) == 0.0;
  bool diag = vLit > 0.3 && c.x == c.y && c.x <= floor(r * 0.5);
  if (!arm && !diag) discard;
  bool core = vLit > 0.3 && c.x + c.y <= 1.0;
  o = core ? vec4(1.0) : vec4(${RED}, 1.0);
}`;

// ── the track, sampled once: through a mark per chapter, bending as the
// flight bent (its swing, mirrored ahead and widening with distance)
const MARK_DEPTH = [6, 14, 26, 44]; // Contact, Services, Work, About
const TRACK_SAMPLES = 160;
function trackPoints() {
  const swing = (k: number) => SWING[SWING.length - 1 - k][0];
  const ctrl: [number, number][] = [
    [0.3, 3],
    ...MARK_DEPTH.map((d, k): [number, number] => [swing(k) * (1 + 0.1 * d), d]),
    [-5, 75],
  ];
  // uniform Catmull–Rom through the controls (lateral offset, depth)
  const at = (u: number): [number, number] => {
    const i = Math.min(ctrl.length - 2, Math.floor(u));
    const t = u - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const cr = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
  };
  const last = ctrl.length - 1;
  const line = new Float32Array(TRACK_SAMPLES * 4);
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const u = (i / (TRACK_SAMPLES - 1)) * last;
    const [x, d] = at(u);
    line.set([CX + x, GROUND_Y, FEET_Z - d, u / last], i * 4);
  }
  const marks = new Float32Array(MARK_DEPTH.length * 4);
  MARK_DEPTH.forEach((_, k) => {
    const [x, d] = at(k + 1);
    marks.set([CX + x, GROUND_Y, FEET_Z - d, (k + 1) / last], k * 4);
  });
  return { line, marks };
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

export default function DitherGround() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!canvas || !gl) return;
    let progs: { ground: WebGLProgram; track: WebGLProgram; mark: WebGLProgram };
    try {
      progs = {
        ground: program(gl, quadVert, groundFrag),
        track: program(gl, trackVert, trackFrag),
        mark: program(gl, markVert, markFrag),
      };
    } catch (e) {
      console.warn('[sinaida] dither ground off:', e);
      return;
    }
    const u = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);

    // geometry: a full-screen triangle, the track's line, its marks
    const vao = (setup: () => void) => {
      const v = gl.createVertexArray()!;
      gl.bindVertexArray(v);
      setup();
      gl.bindVertexArray(null);
      return v;
    };
    const buffer = (data: Float32Array, usage: number = gl.STATIC_DRAW) => {
      const b = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      return b;
    };
    const attrib = (p: WebGLProgram, name: string, size: number, stride: number, offset: number) => {
      const loc = gl.getAttribLocation(p, name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
    };
    const { line, marks } = trackPoints();
    const quad = vao(() => {
      buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));
      attrib(progs.ground, 'aPos', 2, 0, 0);
    });
    const trackVao = vao(() => {
      buffer(line);
      attrib(progs.track, 'aPos', 3, 16, 0);
      attrib(progs.track, 'aS', 1, 16, 12);
    });
    const litData = new Float32Array(MARK_DEPTH.length);
    let litBuf: WebGLBuffer | null = null;
    const markVao = vao(() => {
      buffer(marks);
      attrib(progs.mark, 'aPos', 3, 16, 0);
      attrib(progs.mark, 'aS', 1, 16, 12);
      litBuf = buffer(litData, gl.DYNAMIC_DRAW);
      attrib(progs.mark, 'aLit', 1, 0, 0);
    });

    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    const viewProj = new THREE.Matrix4();
    const rot = new THREE.Matrix3();
    const maskData = new Float32Array(MAX_MASKS * 4);
    let W = 0, H = 0, vw = 0, vh = 0;
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      W = Math.max(1, Math.round(vw / CELL));
      H = Math.max(1, Math.round(vh / CELL));
      canvas.width = W;
      canvas.height = H;
    };
    resize();

    // the lines of text the ground clears from, in cells (y up)
    const rects = new Float32Array(MAX_MASKS * 4);
    const masks = () => {
      const n = textRects(rects);
      for (let i = 0; i < n; i++) {
        const [l, t, r, b] = rects.subarray(i * 4, i * 4 + 4);
        maskData.set([l / CELL, (vh - b) / CELL, r / CELL, (vh - t) / CELL], i * 4);
      }
      return n;
    };

    // a lit mark brightens and dims over a short ease (hover only)
    const lit = new Float32Array(MARK_DEPTH.length);
    let last = performance.now();
    let raf = 0;
    let blank = false;
    const draw = () => {
      raf = 0;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const f = cityBus.progress();
      const grow = span(f, CITY.ground), track = span(f, CITY.track);
      const pose = cityBus.pose();
      let easing = false;
      for (let k = 0; k < lit.length; k++) {
        const target = cityBus.lit() === k ? 1 : 0;
        lit[k] = THREE.MathUtils.damp(lit[k], target, 12, dt);
        if (Math.abs(lit[k] - target) < 0.01) lit[k] = target;
        else easing = true;
      }
      if (!pose || (grow <= 0 && track <= 0)) {
        if (!blank) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          blank = true;
        }
        return;
      }
      blank = false;
      cam.fov = pose.fov;
      cam.aspect = vw / vh;
      cam.position.set(pose.x, pose.y, pose.z);
      cam.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      viewProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      rot.setFromMatrix4(cam.matrixWorld);

      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const g = progs.ground;
      gl.useProgram(g);
      gl.uniform2f(u(g, 'uRes'), W, H);
      gl.uniform3f(u(g, 'uCam'), pose.x, pose.y, pose.z);
      gl.uniformMatrix3fv(u(g, 'uRot'), false, rot.elements);
      gl.uniform1f(u(g, 'uTanY'), Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2));
      gl.uniform1f(u(g, 'uAspect'), vw / vh);
      gl.uniform1f(u(g, 'uGroundY'), GROUND_Y);
      gl.uniform2f(u(g, 'uCenter'), CX, FEET_Z);
      gl.uniform1f(u(g, 'uGrow'), grow);
      const n = masks();
      const setMasks = (p: WebGLProgram) => {
        gl.uniform1i(u(p, 'uMasks'), n);
        if (n) gl.uniform4fv(u(p, 'uMask'), maskData, 0, n * 4);
      };
      setMasks(g);
      gl.bindVertexArray(quad);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (track > 0) {
        const t = progs.track;
        gl.useProgram(t);
        gl.uniformMatrix4fv(u(t, 'uViewProj'), false, viewProj.elements);
        gl.uniform1f(u(t, 'uTrack'), track);
        setMasks(t);
        gl.bindVertexArray(trackVao);
        gl.drawArrays(gl.LINE_STRIP, 0, TRACK_SAMPLES);

        const m = progs.mark;
        gl.useProgram(m);
        gl.uniformMatrix4fv(u(m, 'uViewProj'), false, viewProj.elements);
        gl.uniform1f(u(m, 'uTrack'), track);
        gl.bindBuffer(gl.ARRAY_BUFFER, litBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, lit);
        gl.bindVertexArray(markVao);
        gl.drawArrays(gl.POINTS, 0, MARK_DEPTH.length);
      }
      gl.bindVertexArray(null);
      if (easing) schedule();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onResize = () => {
      resize();
      blank = false;
      schedule();
    };
    const off = cityBus.onPose(schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    schedule();
    return () => {
      off();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
