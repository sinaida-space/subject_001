import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { hash, type Night } from '@/lib/starway';

// ── Starway scene ──
// Ninety nights laid out along a long, gently winding corridor, the oldest
// nearest. Scrolling flies the camera through them to tonight. Each star is
// one soft point; when the visitor's light comes close, its rays open (the
// rays of the Statement's world, drawn here in the point's own fragment so
// the whole sky stays one draw call). The scene renders on demand only: on
// scroll, pointer move and resize. Left alone, nothing moves.

const STEP = 1.25; // corridor length per night
const DUST = 2600;
const WAKE_PX = 150; // how close the light must come for a star to answer

// the corridor's gentle bend, shared by the stars and the camera
function bend(i: number) {
  return [Math.sin(i * 0.11) * 2.2, Math.cos(i * 0.07) * 1.1] as const;
}

export type Bus = {
  progress: number; // 0 → 1 through the section
  pointer: { x: number; y: number; on: boolean }; // CSS px in the canvas box
  screen: Float32Array; // projected star positions, x y per star, CSS px
  wake: Float32Array; // 0 → 1 per star
  nearest: number; // index of the star that answers, or -1
  path: number[]; // stars the visitor touched, in order (the beam follows it)
  onRender?: () => void; // set by the scene: ask for one frame
  onFrame?: () => void; // set by the page: the DOM overlay follows each frame
};

const STAR_VERT = /* glsl */ `
attribute float aBright;
attribute float aWake;
attribute float aSeed;
uniform float uPx;
varying float vBright;
varying float vWake;
varying float vSeed;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // a night nobody came still shows, as dust on the way
  float size = 0.2 + 0.5 * aBright;
  // the sprite grows to hold the rays when the star answers
  size *= 1.0 + 5.0 * aWake;
  gl_PointSize = clamp(size * uPx / -mv.z, 1.5, 420.0);
  vBright = aBright;
  vWake = aWake;
  vSeed = aSeed;
}`;

const STAR_FRAG = /* glsl */ `
varying float vBright;
varying float vWake;
varying float vSeed;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = length(q);
  if (r > 1.0) discard;
  // the core shrinks inside the larger sprite, so waking does not swell it
  float k = 1.0 + 5.0 * vWake;
  float rc = r * k;
  float core = exp(-rc * rc * 9.0) + 0.22 * exp(-rc * 3.5);
  // rays: thin spikes, six long and six short, turned per star
  float a = atan(q.y, q.x) + vSeed * 6.2832;
  float longRays = pow(abs(cos(a * 3.0)), 90.0);
  float shortRays = pow(abs(cos(a * 3.0 + 1.5708)), 160.0) * 0.55;
  float along = (1.0 - r) * (1.0 - r);
  float rays = (longRays + shortRays) * along * vWake;
  float light = core * (0.4 + 0.6 * vBright) + rays * (0.35 + 0.65 * vBright);
  light *= 1.0 - smoothstep(0.85, 1.0, r);
  gl_FragColor = vec4(vec3(0.96, 0.937, 0.902) * light, light);
}`;

const DUST_VERT = /* glsl */ `
uniform float uPx;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(0.035 * uPx / -mv.z, 1.0, 3.0);
  vA = clamp(1.0 - (-mv.z) / 45.0, 0.0, 1.0) * 0.6;
}`;

const DUST_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  if (dot(q, q) > 1.0) discard;
  gl_FragColor = vec4(vec3(0.96, 0.937, 0.902) * vA, vA);
}`;

// the beam: the visitor's thread drawn as light inside the scene, a string of
// soft photons between the stars they touched, faint at the first and
// brightest at the last. Rebuilt only when a star is touched.
const BEAM_MAX = 12000;
const BEAM_SPACING = 0.015; // world units between photons, close enough to merge

const BEAM_VERT = /* glsl */ `
attribute float aAge;
uniform float uPx;
varying float vAge;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(0.1 * uPx / -mv.z, 2.5, 28.0);
  vAge = aAge;
}`;

const BEAM_FRAG = /* glsl */ `
varying float vAge;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  // a bright thin core in a wide soft halo
  float light = (exp(-r2 * 6.0) * 0.26 + exp(-r2 * 1.5) * 0.045) * (0.35 + 0.65 * vAge * vAge);
  gl_FragColor = vec4(vec3(0.96, 0.937, 0.902) * light, light);
}`;

function Sky({ nights, bus }: { nights: Night[]; bus: Bus }) {
  const { camera, size, gl, invalidate } = useThree();
  const n = nights.length;

  const stars = useMemo(() => {
    const pos = new Float32Array(n * 3), bright = new Float32Array(n), seed = new Float32Array(n);
    nights.forEach((night, i) => {
      const r = hash(night.date);
      const [bx, by] = bend(i);
      const ang = r * Math.PI * 2;
      const off = 0.7 + hash(night.date + '·') * 2.6;
      pos.set([bx + Math.cos(ang) * off, by + Math.sin(ang) * off * 0.7, -i * STEP], i * 3);
      bright[i] = Math.max(0, Math.min(1, night.brightness));
      seed[i] = r;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    g.setAttribute('aWake', new THREE.BufferAttribute(bus.wake, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return { g, pos };
  }, [nights, n, bus]);

  const dust = useMemo(() => {
    const pos = new Float32Array(DUST * 3);
    let s = 0x5eed;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < DUST; i++) {
      const z = 6 - rnd() * (n * STEP + 14);
      const [bx, by] = bend(-z / STEP);
      const ang = rnd() * Math.PI * 2, rad = 1.5 + rnd() * 9;
      pos.set([bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad, z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [n]);

  const beam = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BEAM_MAX * 3), 3));
    g.setAttribute('aAge', new THREE.BufferAttribute(new Float32Array(BEAM_MAX), 1));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const beamLen = useRef(0);

  // lay photons along each segment of the touched path
  const buildBeam = (path: number[]) => {
    const pos = beam.attributes.position.array as Float32Array;
    const age = beam.attributes.aAge.array as Float32Array;
    const segs = path.length - 1;
    let count = 0;
    for (let k = 0; k < segs; k++) {
      const a = path[k] * 3, b = path[k + 1] * 3;
      const dx = stars.pos[b] - stars.pos[a], dy = stars.pos[b + 1] - stars.pos[a + 1], dz = stars.pos[b + 2] - stars.pos[a + 2];
      const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy, dz) / BEAM_SPACING));
      for (let j = 0; j < steps && count < BEAM_MAX; j++, count++) {
        const t = j / steps;
        pos[count * 3] = stars.pos[a] + dx * t;
        pos[count * 3 + 1] = stars.pos[a + 1] + dy * t;
        pos[count * 3 + 2] = stars.pos[a + 2] + dz * t;
        age[count] = (k + t) / segs;
      }
    }
    beam.attributes.position.needsUpdate = true;
    beam.attributes.aAge.needsUpdate = true;
    beam.setDrawRange(0, count);
  };

  const uniforms = useMemo(() => ({ uPx: { value: 1 } }), []);
  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms],
  );
  const dustMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms],
  );

  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms],
  );

  useEffect(() => () => {
    beam.dispose();
    beamMat.dispose();
    stars.g.dispose();
    dust.dispose();
    starMat.dispose();
    dustMat.dispose();
  }, [stars, dust, starMat, dustMat, beam, beamMat]);

  // the bus asks for a frame whenever scroll or the pointer moves
  useEffect(() => {
    bus.onRender = () => invalidate();
    invalidate(); // the first frame, with the camera where the scroll left it
    return () => {
      bus.onRender = undefined;
    };
  }, [bus, invalidate]);

  const v = useRef(new THREE.Vector3());
  useFrame(() => {
    // world units → pixels for a point one unit away
    const cam = camera as THREE.PerspectiveCamera;
    uniforms.uPx.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((cam.fov * Math.PI) / 360));

    // fly: from just before the oldest night to just past tonight
    const path = bus.progress * (n - 1);
    const [cx, cy] = bend(path);
    cam.position.set(cx * 0.7, cy * 0.7, 5 - path * STEP);
    const [lx, ly] = bend(path + 4);
    cam.lookAt(lx * 0.7, ly * 0.7, -(path + 4) * STEP);
    cam.updateMatrixWorld();

    // project the stars, then let the nearest one in front answer the light
    const { x: px, y: py, on } = bus.pointer;
    let best = -1, bestD = WAKE_PX;
    for (let i = 0; i < n; i++) {
      v.current.fromArray(stars.pos, i * 3).project(cam);
      const behind = v.current.z > 1;
      const sx = (v.current.x * 0.5 + 0.5) * size.width;
      const sy = (-v.current.y * 0.5 + 0.5) * size.height;
      bus.screen[i * 2] = behind ? -1e4 : sx;
      bus.screen[i * 2 + 1] = behind ? -1e4 : sy;
      const d = on && !behind ? Math.hypot(sx - px, sy - py) : Infinity;
      bus.wake[i] = d < WAKE_PX ? Math.pow(1 - d / WAKE_PX, 1.5) : 0;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    bus.nearest = best;
    if (bus.path.length !== beamLen.current) {
      beamLen.current = bus.path.length;
      buildBeam(bus.path);
    }
    stars.g.attributes.aWake.needsUpdate = true;
    bus.onFrame?.();
  });

  return (
    <>
      <points geometry={dust} material={dustMat} frustumCulled={false} />
      <points geometry={beam} material={beamMat} frustumCulled={false} />
      <points geometry={stars.g} material={starMat} frustumCulled={false} />
    </>
  );
}

export default function StarwayScene({ nights, bus }: { nights: Night[]; bus: Bus }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 0, 5] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Sky nights={nights} bus={bus} />
    </Canvas>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
