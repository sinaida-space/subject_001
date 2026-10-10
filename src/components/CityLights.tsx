import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CITY, cityBus } from '@/lib/city';

// ── The little city and the pour (#179) ──
// One draw call in the star field's own scene, everything screen-glued that
// the last screen needs (src/lib/city.ts):
//   windows  stars of the world until their floor's turn; then they fall,
//            sideways early and down late like something dropped, and land
//            square on the towers by the logo
//   grains   once the towers stand, light leaves the windows and rises
//   pour     LET'S TALK's two links as stars: they leave Contact in reading
//            order, scatter into a cloud and close up again in the sky
// All of it runs in the vertex shader from one uniform, the city's progress,
// damped like the camera so the two move as one.

const vertex = /* glsl */ `
  uniform float uF;
  uniform vec2 uView;
  uniform float uPx;
  uniform float uStageTop;
  uniform vec2 uFrom;
  uniform vec2 uTo;
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

    if (kind > 3.5) {
      // a star of the pour: from its glyph in Contact to its glyph in the sky
      float t = clamp((uF - aInfo.x) / ${CITY.pourDur.toFixed(3)}, 0.0, 1.0);
      float e = t * t * (3.0 - 2.0 * t);
      float out_ = sin(3.14159 * t);
      vec2 px = mix(uFrom + aWin.xy, uTo + aWin.xy, e) + position.xy * out_ + vec2(0.0, -60.0 * out_);
      gl_Position = vec4(toNdc(px), 0.0, 1.0);
      gl_PointSize = mix(2.2, 3.0, out_) * uPx;
      vColor = mix(aColor, vec3(1.0, 0.95, 0.88), 0.7 * out_);
      vAlpha = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.92, 1.0, t));
      vSquare = 0.0;
      return;
    }

    if (kind > 1.5 && kind < 2.5) {
      // a grain of light leaving its window, rising and thinning into the sky
      float t = clamp((uF - aInfo.x) / ${CITY.emitDur.toFixed(3)}, 0.0, 1.0);
      float up = t * (2.0 - t);
      vec2 px = winPx + vec2(position.y * t, -position.x * up);
      gl_Position = vec4(toNdc(px), 0.0, 1.0);
      gl_PointSize = mix(2.0, 1.2, t) * uPx;
      vColor = mix(lamp, aColor, t);
      vAlpha = t > 0.0 ? smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.35, 1.0, t)) * 0.85 : 0.0;
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

    // a star of the field (its size) until it lands as a window
    float skySize = 0.04 * uView.y * uPx * 0.5 / max(-mv.z, 0.5) * 1.2;
    float landed = kind > 2.5 ? 2.6 : (kind > 0.5 ? 1.8 : 2.3);
    gl_PointSize = mix(skySize, landed * uPx, e);
    vColor = mix(aColor, kind > 2.5 ? vec3(1.0, 0.16, 0.12) : lamp, e);
    // only the galaxy's kept share is lit while it waits in the sky
    float keep = step(fract(aInfo.w * 3.17), 0.36);
    float skyA = 0.55 * keep * smoothstep(0.08, 0.32, uF) * (sky.w > 0.0 ? 1.0 : 0.0);
    vAlpha = mix(skyA, aInfo.z, e);
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

export default function CityLights() {
  const { gl, invalidate } = useThree();
  const [layout, setLayout] = useState(cityBus.layout);
  const fRef = useRef(0);

  useEffect(
    () =>
      cityBus.subscribe(() => {
        setLayout(cityBus.layout());
        invalidate();
      }),
    [invalidate],
  );
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
          uFrom: { value: new THREE.Vector2() },
          uTo: { value: new THREE.Vector2() },
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
    u.uFrom.value.set(...cityBus.pourFrom());
    u.uTo.value.set(...cityBus.pourTo());
    u.uView.value.set(window.innerWidth, window.innerHeight);
    u.uPx.value = gl.getPixelRatio();
    if (f !== target) invalidate();
  });

  if (!geometry) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
