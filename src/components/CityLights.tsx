import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CITY, cityBus } from '@/lib/city';

// ── The city's lights (#179) ──
// One draw call in the star field's own scene: every window, pillar and
// rising grain of the footer city (src/lib/city.ts). A cell is a star in the
// world until its floor's turn comes; then it falls, sideways early and down
// late like something dropped, and lands square on its window, glued to the
// footer's floor on screen. All of it runs in the vertex shader from one
// uniform, the city's progress, damped like the camera so the two move as
// one; the cells only change when the footer is measured again.

const vertex = /* glsl */ `
  uniform float uF;
  uniform vec2 uView;
  uniform float uPx;
  uniform float uStageTop;
  uniform float uHoverFloor;
  uniform float uHoverT;
  uniform float uHoverAmt;
  attribute vec4 aWin;
  attribute vec4 aInfo;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSquare;

  vec2 toNdc(vec2 px) { return vec2(px.x / uView.x * 2.0 - 1.0, 1.0 - px.y / uView.y * 2.0); }

  void main() {
    float kind = aWin.w;
    vec2 winPx = aWin.xy + vec2(0.0, uStageTop);
    // window light: warm white, some cool, never red
    vec3 lamp = fract(aInfo.w * 7.13) > 0.72 ? vec3(0.8, 0.88, 1.0) : vec3(1.0, 0.9, 0.74);

    if (kind > 1.5 && kind < 2.5) {
      // a grain of light leaving its window, rising and thinning into the sky
      float t = clamp((uF - aInfo.x) / ${CITY.emitDur.toFixed(3)}, 0.0, 1.0);
      float up = t * (2.0 - t);
      vec2 px = winPx + vec2(position.y * t, -position.x * up);
      gl_Position = vec4(toNdc(px), 0.0, 1.0);
      gl_PointSize = mix(2.2, 1.3, t) * uPx;
      vColor = mix(lamp, aColor, t);
      vAlpha = t > 0.0 ? smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.35, 1.0, t)) * 0.9 : 0.0;
      vSquare = 0.0;
      return;
    }

    float e = clamp((uF - aInfo.x) / ${CITY.fallDur.toFixed(3)}, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec4 sky = projectionMatrix * mv;
    vec2 skyN = sky.xy / max(sky.w, 0.001);
    vec2 winN = toNdc(winPx);
    // sideways early, down late: it drops
    float ex = 1.0 - (1.0 - e) * (1.0 - e);
    float ey = e * e;
    gl_Position = vec4(mix(skyN.x, winN.x, ex), mix(skyN.y, winN.y, ey), 0.0, 1.0);

    // a star of the field (its size and fade-in) until it lands as a window
    float skySize = 0.04 * uView.y * uPx * 0.5 / max(-mv.z, 0.5) * 1.2;
    float landed = kind > 2.5 ? 2.6 : (kind > 0.5 ? 1.8 : 2.4);
    float hover = abs(aInfo.y - uHoverFloor) < 0.5 ? uHoverAmt * smoothstep(aWin.z - 0.12, aWin.z, uHoverT * 1.15) : 0.0;
    gl_PointSize = mix(skySize, landed * uPx * (1.0 + 0.3 * hover), e);
    float lvl = mix(aInfo.z, 1.0, hover);
    vec3 lit = kind > 2.5 ? vec3(1.0, 0.16, 0.12) : lamp;
    vColor = mix(aColor, lit, e);
    // only the galaxy's kept share is lit while it waits in the sky
    float keep = step(fract(aInfo.w * 3.17), 0.36);
    float skyA = 0.55 * keep * smoothstep(0.08, 0.32, uF);
    vAlpha = mix(skyA, lvl, e);
    vSquare = e;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSquare;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = mix(1.0 - smoothstep(0.2, 0.5, r), 1.0, vSquare) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

const HOVER_SWEEP = 0.32; // seconds the light runs along a floor

export default function CityLights() {
  const { gl, invalidate } = useThree();
  const [layout, setLayout] = useState(cityBus.layout);
  const fRef = useRef(0);
  const hoverRef = useRef({ floor: -1, t: 0, amt: 0 });

  useEffect(
    () =>
      cityBus.subscribe(() => {
        setLayout(cityBus.layout());
        invalidate();
      }),
    [invalidate],
  );
  // the city's progress moves with the scroll, which the field already
  // listens to; a resize re-measures the footer and comes through the bus
  useEffect(() => {
    const on = () => invalidate();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [invalidate]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uF: { value: 0 },
          uView: { value: new THREE.Vector2(1, 1) },
          uPx: { value: 1 },
          uStageTop: { value: 0 },
          uHoverFloor: { value: -1 },
          uHoverT: { value: 0 },
          uHoverAmt: { value: 0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const geometry = useMemo(() => {
    if (!layout) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(layout.sky, 3));
    g.setAttribute('aWin', new THREE.BufferAttribute(layout.win, 4));
    g.setAttribute('aInfo', new THREE.BufferAttribute(layout.info, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(layout.color, 3));
    return g;
  }, [layout]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const u = material.uniforms;
    const target = cityBus.progress();
    let f = THREE.MathUtils.damp(fRef.current, target, 5, delta);
    if (Math.abs(f - target) < 0.0005) f = target;
    fRef.current = f;
    u.uF.value = f;
    u.uStageTop.value = cityBus.stageTop();
    u.uView.value.set(window.innerWidth, window.innerHeight);
    u.uPx.value = gl.getPixelRatio();

    // a hovered floor lights up, the light running along it once; then still
    const h = hoverRef.current;
    const want = cityBus.hovered();
    if (want >= 0 && want !== h.floor) {
      h.floor = want;
      h.t = 0;
    }
    if (want >= 0) h.t = Math.min(1, h.t + delta / HOVER_SWEEP);
    h.amt = THREE.MathUtils.damp(h.amt, want >= 0 ? 1 : 0, 10, delta);
    if (want < 0 && h.amt < 0.01) h.amt = 0;
    u.uHoverFloor.value = h.floor;
    u.uHoverT.value = h.t;
    u.uHoverAmt.value = h.amt;

    if (f !== target || (want >= 0 && h.t < 1) || (want < 0 && h.amt > 0) || (want >= 0 && h.amt < 0.99)) invalidate();
  });

  if (!geometry) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
