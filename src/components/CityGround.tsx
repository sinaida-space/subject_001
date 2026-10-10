import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CITY, DOLLY_Z, GROUND_DROP, cityBus, endEyeY, span, textRects } from '@/lib/city';
import { FLIGHT } from '@/lib/flight';

// ── The city's lights (#179) ──
// When the eyes lower at the end of the page, this is what they find: a
// plane of soft lights under the last eye height, where the stars poured
// down: street lights on a grid, some avenues brighter, windows scattered in
// the blocks, a dark river winding through, thinning into haze at the
// horizon. They are light, so they glow with the stars' bloom. They come on
// from the horizon toward the feet and fade out around every line of text,
// so nothing glows behind a word. Static points; one uniform drives the
// reveal.

const COUNT = 9000;
const BLOCK = 0.9; // world units between streets
const DEPTH = 90; // how far the plane runs ahead

const MAX_MASKS = 32;
const MASK_PAD = 28; // css px over which a light fades out near text

const vertex = /* glsl */ `
  uniform float uOn;
  uniform float uScale;
  uniform vec2 uView;
  uniform vec4 uMask[${MAX_MASKS}];
  uniform int uMasks;
  attribute vec4 aLook; // brightness, order of lighting, size, haze
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = aLook.z * uScale / max(-mv.z, 0.1);
    // below a pixel a light dims instead of shrinking away
    gl_PointSize = clamp(px, 1.3, 4.5);
    float on = smoothstep(aLook.y, aLook.y + 0.04, uOn);
    vAlpha = min(1.0, 2.4 * aLook.x * aLook.w * min(1.0, 0.35 + px)) * on;
    vColor = aColor;
    // css px on the screen; out near the text
    vec2 sp = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * uView;
    sp.y = uView.y - sp.y;
    for (int i = 0; i < ${MAX_MASKS}; i++) {
      if (i >= uMasks) break;
      vec2 o2 = max(uMask[i].xy - sp, sp - uMask[i].zw);
      vAlpha *= smoothstep(0.0, ${MASK_PAD.toFixed(1)}, max(o2.x, o2.y));
    }
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.15, 0.5, r)) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// deterministic, so every visit sees the same city
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

export default function CityGround() {
  const geometry = useMemo(() => {
    const rand = rng(179);
    const cx = -FLIGHT.x, cz = FLIGHT.home - FLIGHT.z + DOLLY_Z;
    const gy = endEyeY(-FLIGHT.y) - GROUND_DROP;
    const river = (z: number) => cx + 2.2 + 3 * Math.sin(z * 0.07) + 1.2 * Math.sin(z * 0.19);
    const pos = new Float32Array(COUNT * 3);
    const look = new Float32Array(COUNT * 4);
    const col = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      let x = 0, z = 0, d = 0;
      for (let tries = 0; tries < 8; tries++) {
        d = 1.5 + DEPTH * Math.pow(rand(), 1.7);
        z = cz - d;
        x = cx + (rand() * 2 - 1) * (d * 1.25 + 3);
        if (Math.abs(x - river(z)) > 0.45 + 0.01 * d) break;
      }
      const street = rand() < 0.58;
      let bright = 0.3 + 0.35 * rand();
      let c: [number, number, number] = rand() < 0.75 ? [1, 0.9, 0.74] : [0.8, 0.88, 1];
      if (street) {
        // snap to a street; every fourth one is an avenue
        if (rand() < 0.5) {
          const k = Math.round((x - cx) / BLOCK);
          x = cx + k * BLOCK;
          if (k % 4 === 0) bright += 0.25;
        } else {
          const k = Math.round((z - cz) / BLOCK);
          z = cz + k * BLOCK;
          if (k % 4 === 0) bright += 0.25;
        }
        c = [1, 0.72, 0.42]; // sodium
        bright += 0.15;
      }
      pos.set([x, gy, z], i * 3);
      const haze = 1 - 0.75 * Math.min(1, d / DEPTH);
      // far ones first: they come on with the ground growing toward the feet
      look.set([Math.min(1, bright), Math.min(0.97, (1 - d / DEPTH) * 0.85 + rand() * 0.12), street ? 0.016 : 0.012, haze], i * 4);
      col.set(c, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aLook', new THREE.BufferAttribute(look, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uOn: { value: 0 },
          uScale: { value: 1 },
          uView: { value: new THREE.Vector2(1, 1) },
          uMask: { value: Array.from({ length: MAX_MASKS }, () => new THREE.Vector4()) },
          uMasks: { value: 0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const rects = useMemo(() => new Float32Array(MAX_MASKS * 4), []);
  useFrame(({ gl, size }) => {
    const u = material.uniforms;
    u.uOn.value = span(cityBus.progress(), CITY.ground);
    u.uScale.value = size.height * 0.5 * gl.getPixelRatio();
    if (u.uOn.value <= 0) return;
    u.uView.value.set(size.width, size.height);
    const n = textRects(rects);
    for (let i = 0; i < n; i++) u.uMask.value[i].fromArray(rects, i * 4);
    u.uMasks.value = n;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
