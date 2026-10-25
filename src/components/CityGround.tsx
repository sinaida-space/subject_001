import { STAR_DENSITY } from '@/lib/starDensity';
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CITY, DOLLY_Z, cityBus, cityOrigin, span, textRects } from '@/lib/city';
import { DIVE_OVER, FOOTER_MODE, cityShiftZ, footerCamera } from '@/lib/footerMode';
import { FLIGHT } from '@/lib/flight';

// ── The city's lights ──
// When the eyes lower at the end of the page, this is what they find: a
// plane of soft lights under the last eye height, where the stars poured
// down: street lights on a grid, some avenues brighter, windows scattered in
// the blocks, a dark river winding through, thinning into haze at the
// horizon. They are light, so they glow with the stars' bloom. They are the
// CONTACT title's stars, poured down out of the word (StarTitle pour): they
// come on as those land, from the horizon toward the feet and fade out around every line of text,
// so nothing glows behind a word. Static points; one uniform drives the
// reveal.

const COUNT = Math.round(9000 * STAR_DENSITY.city);
const BLOCK = 0.9; // world units between streets
const DEPTH = 90; // how far the plane runs ahead

const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_MASKS = 32;
// the footer's hovers on the ground: NAVIGATE and MORE drive down
// a winding road, CONNECT gathers the lights into clusters
const DRIVE_SPEED = 7; // world units a second; the ground is wide, so faster than the sky
const ROAD_K = '0.11'; // how often the road bends, per world unit
const ROAD_SWAY = '1.8'; // how far it swings sideways, world units
const HUB = 9; // cluster spacing, world units
const DIVE_HUB = 3.5; // and from above, smaller and closer
const DIVE_DRIVE_SPEED = 1.6; // from above, a calm glide over the map
// the dive's patch of lights round the point under the eyes (footerMode.ts)
const DIVE_OVER_F = DIVE_OVER.toFixed(1);
const DIVE_HALF_D = '7.0';
// the lights' way down from the sky and back up
const RISE_SPAN = '0.22'; // share of the ground's reveal one light takes to land
const RISE_MIN = '8.0'; // world units above the ground it starts from, at least
const RISE_VAR = '18.0'; // and up to this much higher
const MASK_PAD = 28; // css px over which a light fades out near text

const vertex = /* glsl */ `
  uniform float uOn;
  uniform float uScale;
  uniform vec2 uView;
  uniform vec4 uMask[${MAX_MASKS}];
  uniform int uMasks;
  uniform float uSnap;
  uniform float uPx;
  uniform float uDrive;    // the drive's hold, 0..1
  uniform float uDriveZ;   // how far the drive has gone, world units
  uniform float uCluster;  // CONNECT's gathering, 0..1
  uniform vec2 uOrigin;    // the city's centre (x, z), the camera's feet
  uniform float uDive;     // 1 in the dive (the map seen from above), 0 otherwise
  uniform float uLift;     // 1: the lights sink down out of the sky; 0: they come on in place
  attribute vec4 aLook; // brightness, order of lighting, size, haze
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float hazeNow = aLook.w;
    // the lights are the sky's stars come down: before its turn
    // a light hangs up in the sky as a small white star and sinks to its
    // place as the ground comes on; scrolled back, it rises again. Each in
    // its own order (aLook.y) and to its own height
    float rnd = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
    float lift = 1.0 - smoothstep(aLook.y - 0.02, aLook.y + ${RISE_SPAN}, uOn);
    float lift2 = lift * lift;
    p.y += lift2 * (${RISE_MIN} + ${RISE_VAR} * rnd) * uLift;
    p.x += lift2 * (rnd - 0.5) * 2.0 * uLift;
    // CONNECT: the lights gather into small clusters round a few hubs
    // (seen from above, many small ones over the whole map)
    if (uCluster > 0.0) {
      float hubSize = mix(${HUB.toFixed(1)}, ${DIVE_HUB.toFixed(1)}, uDive);
      vec2 hub = (floor((p.xz - uOrigin) / hubSize) + 0.5) * hubSize + uOrigin;
      p.xz = mix(p.xz, hub + (p.xz - hub) * mix(0.22, 0.3, uDive), uCluster);
    }
    // the drive: the city streams toward the camera along a road that bends,
    // each light wrapping back to the far end once it passes under the feet
    // seen from above (dive), the map itself streams toward the bottom of the
    // screen, as if flying low over the city: each light of the patch under
    // the eyes wraps round inside it, so the map never empties
    float dHere = uOrigin.y - p.z;
    if (uDrive > 0.0 && uDive > 0.0 && abs(dHere - ${DIVE_OVER_F}) <= ${DIVE_HALF_D}) {
      float dz = mod(dHere - (${DIVE_OVER_F} - ${DIVE_HALF_D}) - uDriveZ, 2.0 * ${DIVE_HALF_D}) + ${DIVE_OVER_F} - ${DIVE_HALF_D};
      p.z = uOrigin.y - dz;
      p.x += sin(${ROAD_K} * (dz + uDriveZ) * 3.0) * ${ROAD_SWAY} * 0.5 * uDrive;
    } else if (uDrive > 0.0 && uDive <= 0.0) {
      float d = uOrigin.y - p.z;                                  // distance ahead
      float dz = mod(d - 1.5 - uDriveZ, ${DEPTH.toFixed(1)}) + 1.5;
      p.z = uOrigin.y - dz;
      // keep the light's place in the fan: the city widens with distance, so
      // a near light sent far spreads with it (else they bunch on the horizon)
      p.x = uOrigin.x + (p.x - uOrigin.x) * (dz * 1.25 + 3.0) / (d * 1.25 + 3.0);
      p.x += sin(${ROAD_K} * (dz + uDriveZ)) * ${ROAD_SWAY} * uDrive * min(1.0, dz / 6.0);
      hazeNow = 1.0 - 0.75 * min(1.0, dz / ${DEPTH.toFixed(1)});
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = aLook.z * uScale / max(-mv.z, 0.1);
    // below a pixel a light dims instead of shrinking away
    gl_PointSize = clamp(px, 1.3, 4.5);
    // up in the sky it is a faint star, at its place a light
    float on = (1.0 - lift) + lift * (1.0 - smoothstep(0.55, 1.0, lift)) * 0.5;
    gl_PointSize = mix(gl_PointSize, 1.3, lift);
    vAlpha = min(1.0, 2.4 * aLook.x * hazeNow * min(1.0, 0.35 + px)) * on;
    vColor = mix(aColor, vec3(0.92, 0.94, 1.0), lift);
    // MORE: the lights snap to the dither grid, 2 px squares on a 4 px pitch
    if (uSnap > 0.0) {
      vec2 g = (gl_Position.xy / gl_Position.w * 0.5 + 0.5) * uView;
      vec2 snapped = (floor(g / 4.0) + 0.5) * 4.0;
      gl_Position.xy = (mix(g, snapped, uSnap) / uView * 2.0 - 1.0) * gl_Position.w;
      gl_PointSize = mix(gl_PointSize, 2.0 * uPx, uSnap);
      // a hard square carries more light than a soft dot: dim it so the
      // snap reads as a change of grain, never a flare under the bloom
      vAlpha *= mix(1.0, 0.4, uSnap);
    }
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
  uniform float uSnap;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    // round and soft as light; a hard square when snapped to the grid
    float a = mix(1.0 - smoothstep(0.15, 0.5, r), 1.0, uSnap) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// deterministic, so every visit sees the same city
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

/** under the flight's end (home) or under the camera's own home (other pages) */
export default function CityGround({ flight = true }: { flight?: boolean }) {
  // the footer's alternative moves (footerMode.ts) are home only
  const alt = flight && FOOTER_MODE !== 'current' ? FOOTER_MODE : null;
  const origin = useMemo(() => {
    const o = cityOrigin(flight, { x: -FLIGHT.x, y: -FLIGHT.y, z: FLIGHT.home - FLIGHT.z });
    // the city's middle moves to wherever that mode's camera ends up
    return alt ? { ...o, z: o.z + cityShiftZ(alt, DOLLY_Z) } : o;
  }, [flight, alt]);
  const geometry = useMemo(() => {
    const rand = rng(179);
    const o = origin;
    const cx = o.x, cz = o.z, gy = o.groundY;
    const river = (z: number) => cx + 2.2 + 3 * Math.sin(z * 0.07) + 1.2 * Math.sin(z * 0.19);
    const pos = new Float32Array(COUNT * 3);
    const look = new Float32Array(COUNT * 4);
    const col = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      let x = 0, z = 0, d = 0;
      for (let tries = 0; tries < 8; tries++) {
        d = 1.5 + DEPTH * Math.pow(rand(), 1.7);
        x = cx + (rand() * 2 - 1) * (d * 1.25 + 3);
        if (alt === 'dive' && i % 4 !== 0) {
          // dive: three in four lights make the map seen straight down, round the
          // point under the camera, so it fills the screen
          d = DIVE_OVER + (rand() * 2 - 1) * 7;
          x = cx + (rand() * 2 - 1) * 11;
        }
        z = cz - d;
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
      let order = (1 - d / DEPTH) * 0.85;
      // dive: from right under the camera outward, a map lighting up
      if (alt === 'dive') order = Math.min(1, Math.hypot(x - cx, d - DIVE_OVER) / 30) * 0.85;
      look.set([Math.min(1, bright), Math.min(0.97, order + rand() * 0.12), street ? 0.016 : 0.012, haze], i * 4);
      col.set(c, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aLook', new THREE.BufferAttribute(look, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    return g;
  }, [origin, alt]);
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
          uSnap: { value: 0 },
          uPx: { value: 1 },
          uDrive: { value: 0 },
          uDriveZ: { value: 0 },
          uCluster: { value: 0 },
          uOrigin: { value: new THREE.Vector2(origin.x, origin.z) },
          uDive: { value: alt === 'dive' ? 1 : 0 },
          uLift: { value: 1 }, // dive: the lights pour down past the camera
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [origin, alt],
  );
  useEffect(() => () => material.dispose(), [material]);

  const rects = useMemo(() => new Float32Array(MAX_MASKS * 4), []);
  const { invalidate } = useThree();
  useEffect(() => cityBus.onHover(() => invalidate()), [invalidate]);
  useFrame(({ gl, size }, delta) => {
    const u = material.uniforms;
    // MORE eases the lights onto the grid and off it again
    const snapTo = cityBus.hover() === 'more' ? 1 : 0;
    u.uSnap.value = THREE.MathUtils.damp(u.uSnap.value, snapTo, 4, Math.min(delta, 0.05));
    if (Math.abs(u.uSnap.value - snapTo) < 0.002) u.uSnap.value = snapTo;
    else invalidate();
    // the drive and the clusters ease in on hover and out after; off when
    // the visitor asked for less motion
    const h = cityBus.hover();
    const dt = Math.min(delta, 0.05);
    // NAVIGATE glides once and rests; MORE only snaps to the grid
    const driveTo = !REDUCED_MOTION && cityBus.gliding() ? 1 : 0;
    u.uDrive.value = THREE.MathUtils.damp(u.uDrive.value, driveTo, 5, dt);
    if (u.uDrive.value < 0.01 && !driveTo) u.uDrive.value = 0;
    u.uDriveZ.value += (alt === 'dive' ? DIVE_DRIVE_SPEED : DRIVE_SPEED) * u.uDrive.value * dt;
    const clusterTo = !REDUCED_MOTION && h === 'connect' ? 1 : 0;
    u.uCluster.value = THREE.MathUtils.damp(u.uCluster.value, clusterTo, 4, dt);
    if (Math.abs(u.uCluster.value - clusterTo) < 0.002) u.uCluster.value = clusterTo;
    if (u.uDrive.value > 0 || u.uCluster.value !== clusterTo) invalidate();
    u.uPx.value = gl.getPixelRatio();
    // the lights come on as the CONTACT title's stars land; the scroll's own
    // progress makes sure they are all on by the end
    const altCam = alt ? footerCamera(alt, cityBus.progress()) : null;
    u.uOn.value = altCam
      ? altCam.ground
      : Math.max(span(cityBus.pour(), [0.3, 1]), span(cityBus.progress(), CITY.ground));
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
