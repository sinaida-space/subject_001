import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';

// ── Cursor lens (#194) ──
// The red arrow stays; the hand bends the sky behind the page. A lens around
// the pointer grows with its speed through an under-damped spring (one
// overshoot when the hand stops, then flat), stars crossing the lens edge flare
// into short arcs, and the stop sends one ring of bent space out that fades.
// The edge splits colour slightly, the way a real lens disperses light. Text and links live in the DOM above the canvas, so only the sky
// bends. Mouse only; at rest nothing is drawn and nothing moves.

const FRAG = /* glsl */ `
uniform vec2 uPtr;     // pointer, uv
uniform vec2 uRes;     // buffer px
uniform float uScale;  // device pixel ratio
uniform float uAmt;    // lens strength (spring)
uniform vec4 uRing;    // x, y (uv), radius (buffer px), strength

// light from behind the mass, bent round it: sample nearer the centre
vec2 lensUv(vec2 uv, float E) {
  vec2 d = (uv - uPtr) * uRes;
  return uv - d * (E * E) / (dot(d, d) + E * E * 0.6 + 1.0) / uRes;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float E = 95.0 * uScale * uAmt;
  vec2 d = (uv - uPtr) * uRes;
  float r = length(d);

  // the ring that runs out when the hand stops
  vec2 base = uv;
  if (uRing.w > 0.0) {
    vec2 q = (uv - uRing.xy) * uRes;
    float rr = length(q);
    float band = (rr - uRing.z) / (22.0 * uScale);
    base += q / max(rr, 1.0) * sin(band * 3.14159) * exp(-band * band) * uRing.w * 18.0 * uScale / uRes;
  }

  vec4 c = texture2D(inputBuffer, lensUv(base, E));
  c.r = texture2D(inputBuffer, lensUv(base, E * 1.07)).r;
  c.b = texture2D(inputBuffer, lensUv(base, E * 0.93)).b;
  // stars crossing the lens edge flare into arcs; empty sky stays dark, so no circle shows
  float edge = exp(-pow((r - E) / (6.0 * uScale), 2.0)) * step(1.0, E);
  c.rgb *= 1.0 + 1.6 * edge;
  outputColor = c;
}
`;

class CursorLensEffect extends Effect {
  constructor() {
    super('CursorLens', FRAG, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uPtr', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uRes', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['uScale', new THREE.Uniform(1)],
        ['uAmt', new THREE.Uniform(0)],
        ['uRing', new THREE.Uniform(new THREE.Vector4(0, 0, 0, 0))],
      ]),
    });
  }

  setSize(width: number, height: number) {
    (this.uniforms.get('uRes')!.value as THREE.Vector2).set(width, height);
  }
}

const AMT_K = 30; // spring stiffness
const AMT_DAMP = 4.2; // under-damped: one clear overshoot
const RING_LIFE = 1.0; // seconds
const RING_SPEED = 260; // css px per second

export default function CursorLens() {
  // owns no render targets, so there is nothing to dispose; dispose={null}
  // below keeps the composer from trying (it also overwrites the method)
  const effect = useMemo(() => new CursorLensEffect(), []);
  const { invalidate, gl } = useThree();
  const s = useRef({
    x: 0, y: 0, px: 0, py: 0, seen: false, inside: false,
    speed: 0, peak: 0, amt: 0, vel: 0,
    ring: { x: 0, y: 0, age: RING_LIFE, k: 0 },
  });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const st = s.current;
      st.x = e.clientX; st.y = e.clientY;
      if (!st.seen) { st.seen = true; st.px = st.x; st.py = st.y; }
      st.inside = true;
      invalidate();
    };
    const leave = () => { s.current.inside = false; invalidate(); };
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, [invalidate]);

  useFrame((_, raw) => {
    const st = s.current;
    const dt = Math.min(raw, 1 / 30);
    const step = Math.hypot(st.x - st.px, st.y - st.py);
    st.px = st.x; st.py = st.y;
    const inst = Math.min(1, step / (Math.max(dt, 1e-3) * 1400));
    st.speed += (inst - st.speed) * Math.min(1, dt * (inst > st.speed ? 10 : 6));

    // the lens chases the speed through the spring
    const target = st.inside ? st.speed : 0;
    st.vel += (AMT_K * (target - st.amt) - AMT_DAMP * st.vel) * dt;
    st.amt += st.vel * dt;

    // a stop after a real gesture sends out one ring
    st.peak = Math.max(st.peak, st.speed);
    if (st.peak > 0.25 && st.speed < 0.03) {
      st.ring = { x: st.x, y: st.y, age: 0, k: Math.min(1, st.peak) };
      st.peak = 0;
    }
    if (st.ring.age < RING_LIFE) st.ring.age += dt;

    const dpr = gl.getPixelRatio();
    const w = window.innerWidth, h = window.innerHeight;
    const u = effect.uniforms;
    (u.get('uPtr')!.value as THREE.Vector2).set(st.x / w, 1 - st.y / h);
    u.get('uScale')!.value = dpr;
    u.get('uAmt')!.value = Math.max(0, st.amt);
    const life = Math.max(0, 1 - st.ring.age / RING_LIFE);
    (u.get('uRing')!.value as THREE.Vector4).set(
      st.ring.x / w, 1 - st.ring.y / h, st.ring.age * RING_SPEED * dpr, st.ring.k * life * life,
    );

    const settled = st.speed < 0.002 && Math.abs(st.amt) < 0.002 && Math.abs(st.vel) < 0.01 && life === 0;
    if (!settled) invalidate();
  });

  return <primitive object={effect} dispose={null} />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
