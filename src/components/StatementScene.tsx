import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { roomBus, type Box } from '@/lib/roomBus';

// The Statement, told by one set of points on a long flight. The camera only
// dollies straight ahead, but far: between two paragraphs it travels through a
// field of stars that streak past while it moves. The same points travel from
// one scene to the next:
//
//   title     the word STATEMENT, written in stars
//   lead      the word comes apart and settles into a world whose surface is
//             written in "light" in many scripts, dense enough to read as a
//             texture first; it turns very slowly and its rays stand out in 3D,
//             breathing, with light running along them (the one motion here
//             that runs on a clock, so the world lives while the page rests)
//   1         the world flares, its letters swell outwards into a shell of
//             light, the rays grow long, and the reader flies through the
//             middle of it; paragraph 1 assembles out of that light
//   2         the letters overtake the reader and gather far ahead into a
//             neuron of glowing beads, lying in space below the text
//   3         from the right a circuit draws itself in metallic greys, trace by
//             trace; the axon and the last trace stop just short of each
//             other, as the hands do in the Creation of Adam; while the reader
//             scrolls, pulses run down both and signals cross the gap
//   cases     space rushes past and the points settle into the three cases
//   end       everything scatters into the sky, towards the contact
//
// Apart from the world's turn and breath, the scroll is the only input: the
// scene holds still when the reader does, and scrolling back plays it in
// reverse. Fades are ordered dither, the glow is a soft core per point, moving
// points smear into short scan lines.

const N = 12000;
const FOV = 50;
const CAM_Z = 6;
// where the camera stands on each beat: long flights between the scenes, a
// short step from paragraph 2 to the closing one, so the picture stays in view
const CAM_AT = [6, -2, -14, -24, -24.8, -40, -54];
const BEATS = CAM_AT.length - 1;
// beats of the story, as in StatementRoom
const PICTURE = 3;
const SYNAPSE = 4;
const CASES = 5;
// share of a beat that holds still, as in StatementRoom
const HOLD = 0.55;

// "light" in many scripts, the words the world is written in
// the ones visitors are likely to read, mixed with rarer ones
const WORDS = [
  'light', 'Licht', 'свет', 'lumière', '光', 'licht', 'ضوء', 'luz', 'ひかり', 'luce', 'प्रकाश',
  'φως', 'אור', '빛', 'სინათლე', 'լույս', 'แสง', 'ஒளி', 'ብርሃን', 'আলো', 'světlo', 'lux',
  'ışık', 'valo', 'ljós', 'nuru', 'golau', 'argia', 'ánh sáng', 'światło',
];
const ATLAS = 16; // atlas cells per side
// a letter cell on the world, in CSS px, seen at the lead
const LETTER_PX = 15;
const SPIN = 0.012; // the world's own turn, radians per second: barely there
const RAYS = 34;
const SIGNALS = 36;
const STARS = 4200;
const CRUISE = 1.6; // how fast the stars drift past while the reader rests, units per second
const SCROLL_FLIGHT = 14; // how far the stars travel per beat of scroll, on top of the camera's own flight

/** the camera's depth at a moment of story time */
function camAt(beat: number) {
  const b = Math.min(BEATS, Math.max(0, beat));
  const k = Math.min(BEATS - 1, Math.floor(b));
  // in the dive the camera waits for the picture to lie down, then rides the roads
  const f = k === SYNAPSE ? Math.pow(diveAt(b), 1.6) : b - k;
  return CAM_AT[k] + (CAM_AT[k + 1] - CAM_AT[k]) * f;
}

const BAYER_GLSL = /* glsl */ `
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    float i = q.x + q.y * 4.0;
    // 4x4 Bayer matrix, row by row
    float m = i < 1.0 ? 0.0 : i < 2.0 ? 8.0 : i < 3.0 ? 2.0 : i < 4.0 ? 10.0 :
              i < 5.0 ? 12.0 : i < 6.0 ? 4.0 : i < 7.0 ? 14.0 : i < 8.0 ? 6.0 :
              i < 9.0 ? 3.0 : i < 10.0 ? 11.0 : i < 11.0 ? 1.0 : i < 12.0 ? 9.0 :
              i < 13.0 ? 15.0 : i < 14.0 ? 7.0 : i < 15.0 ? 13.0 : 5.0;
    return (m + 0.5) / 16.0;
  }
`;

const COMMON_GLSL = /* glsl */ `
  float smoother(float x) { x = clamp(x, 0.0, 1.0); return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }
  // turn about the vertical axis, the way the world spins
  vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
  // tip towards or away from the reader, for the hand that turns the world
  vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
`;

const VERT = /* glsl */ `
  attribute vec4 aRing;   // the point's place on the world: angle round, latitude, its word's middle angle, its place in the word (cells from the middle)
  attribute vec3 aPic;    // its place in the picture: across, along (in its plane), side
  attribute vec3 aSynEnd; // for a signal: where it lands, in the picture's plane
  attribute vec3 aCases;  // its place in the dithered squares of the cases
  attribute vec3 aFrom;   // the light it comes out of: its case's lamp
  attribute vec4 aMeta;   // seed, grow, glyph cell (0: not a letter), kind
  attribute float aDelay; // when a signal sets off, through the synapse's hold
  uniform float uBeat;
  uniform float uSynT;
  uniform float uSpin;
  uniform float uPx;
  uniform float uProj;
  uniform float uLetter;
  uniform float uCells;   // how many glyph cells the atlas holds
  uniform float uReach;   // how far the two ends have reached towards each other
  uniform float uRaw;     // the scroll itself, for small motions that follow it
  uniform float uPW;
  uniform float uPitch;   // the reader's tilt of the world
  uniform vec2 uSoma;     // the neuron's nucleus, in the picture's plane
  uniform vec3 uShift;    // the picture's slide sideways in the dive
  uniform float uTime;
  uniform vec3 uSphereAt;
  uniform float uRadius;
  uniform vec3 uPicAt;
  uniform float uTilt;
  uniform float uYaw;
  varying float vGlyph;
  varying float vGlyphness;
  varying float vLight;
  varying float vVis;
  varying float vRed;
  varying float vMetal;
  varying float vStreak;
  ${COMMON_GLSL}
  // a transition between beats a and b; each point keeps its own moment inside it
  float win(float a, float b, float lag) { return smoother((uBeat - a - lag * (b - a) * 0.4) / ((b - a) * 0.6)); }

  void main() {
    float seed = aMeta.x, grow = aMeta.y, glyph = aMeta.z, kind = aMeta.w;
    float letter = step(0.5, glyph);
    float chip = step(0.5, aPic.z);
    vec3 dust = normalize(vec3(fract(seed * 91.7) - 0.5, fract(seed * 47.3) - 0.5, fract(seed * 13.1) - 0.5));

    // ── the world: it forms and turns to the light, spins slowly, then flares
    float form = smoother(uBeat / 0.95);
    float open = smoother((uBeat - 1.08) / 0.72);
    float theta = aRing.x + uSpin, phi = aRing.y;
    vec3 n = rotX(rotY(vec3(cos(phi) * cos(theta), sin(phi), -cos(phi) * sin(theta)), (1.0 - form) * 2.2), uPitch);
    // the flare: whole words leave the shell together, swelling outwards,
    // mostly sideways, so the reader flies through their middle and reads them
    float wordTheta = aRing.z + uSpin;
    vec3 wn = rotX(rotY(vec3(cos(phi) * cos(wordTheta), sin(phi), -cos(phi) * sin(wordTheta)), (1.0 - form) * 2.2), uPitch);
    float wordSeed = fract(sin(aRing.z * 91.3 + phi * 47.1) * 4375.85);
    float reach = 2.5 + 4.5 * wordSeed;
    vec3 outward = normalize(vec3(wn.xy, wn.z * 0.25) + vec3(1e-4));
    vec3 flight = uSphereAt + outward * uRadius * reach + vec3(aRing.w * uLetter, 0.0, 0.0);
    vec3 world = mix(uSphereAt + n * uRadius, flight, open);
    // dawn sweeps round from behind and settles at the upper left
    float la = 4.64 - 2.4 * form;
    vec3 L = normalize(vec3(cos(la) * 0.85, 0.45, sin(la) * 0.85));
    float day = smoothstep(-0.25, 0.5, dot(n, L));
    // the far side is not drawn, so the letters never read mirrored
    float facing = smoothstep(-0.05, 0.25, n.z);
    // letters vary in strength, so the world reads as a texture before words
    float ink = 0.4 + 0.6 * fract(seed * 23.17);
    float worldLight = mix((0.15 + 0.85 * day) * facing, 1.0, open) * ink;
    // it flares as it opens, then its letters go out past the reader
    worldLight *= (1.0 + 2.2 * sin(3.14159 * open)) * (1.0 - smoother((uBeat - 1.72) / 0.3));

    // ── the picture: a plane lying in space below the text, rising slowly
    float c = cos(uTilt), sn = sin(uTilt);
    // the neuron has depth: its strands lie at different heights over the plane
    float depth = (fract(seed * 29.3) - 0.5) * 0.5 * (1.0 - chip);
    // and the whole picture turns a little towards the reader as it rises
    // the two ends reach towards each other while the reader scrolls, and sway
    // a little, the way the hands in the fresco almost meet
    // only the axon reaches; the source stays where it is
    float nearEnd = chip > 0.5 ? 0.0 : smoothstep(-0.16 * uPW, 0.0, aPic.x);
    vec2 pic = aPic.xy + nearEnd * vec2((chip > 0.5 ? -1.0 : 1.0) * uReach * 0.018 * uPW, 0.006 * uPW * sin(uRaw * 5.0 + chip * 2.0));
    // the neuron grows as the reader scrolls through paragraph 2: the nucleus
    // first, then each branch lights point by point outwards, in place
    float sprout = chip > 0.5 ? 1.0 : smoother((uRaw - 2.95 - grow * 0.5) / 0.1);
    // and it lives: the branches sway a little, more towards their tips
    float neuron = (1.0 - chip) * (1.0 - step(1.5, kind) * step(kind, 3.5));
    pic += neuron * min(grow, 1.0) * 0.004 * uPW * vec2(sin(uTime * 0.55 + aPic.y * 9.0 + seed * 2.0), cos(uTime * 0.47 + aPic.x * 7.0));
    vec3 local = rotY(vec3(pic.x, pic.y * c - depth * sn, -pic.y * sn - depth * c), uYaw);
    vec3 picture = uPicAt + uShift + local;
    // a signal crosses from the axon's end to the circuit's pad
    float t = smoother((uSynT * 1.6 - aDelay) / 0.45);
    vec2 sig = mix(aPic.xy + vec2(uReach * 0.018 * uPW, 0.0), aSynEnd.xy, t);
    sig.y += sin(t * 3.14159) * 0.03 * (fract(seed * 7.3) - 0.5);
    float signal = step(1.5, kind) * step(kind, 3.5);
    picture = mix(picture, uPicAt + uShift + rotY(vec3(sig.x, sig.y * c, -sig.y * sn), uYaw), signal);

    float m1 = win(0.0, 0.95, seed);
    // the neuron gathers after paragraph 1, the circuit draws itself afterwards
    float m3 = chip > 0.5 ? smoother((uRaw - 3.5 - grow * 0.5) / 0.25) : win(2.06, 2.4, seed);
    // after the synapse: the points lie down as traces round the camera's path,
    // the near ones first, and the camera dives along them; at their end they
    // rise into the cases
    // after the synapse the picture lies down and the camera dives past it
    float m4 = smoother((uBeat - 4.35) / 0.4);
    // as the lamps reach the cases, the points stream in from behind the reader
    // and fill the squares with a dither
    float m5 = win(4.76, 4.95, seed);
    float m6 = 0.0;

    vec3 p = position;
    p = mix(p, world, m1) + dust * 0.6 * sin(3.14159 * m1);
    // on the way to the picture, points swing wide, so they come in on curves
    p = mix(p, picture, m3) + (dust * 0.9 + vec3(0.0, -0.6, 0.0)) * sin(3.14159 * m3);
    // space rushes past: points swing towards the reader on their way to the cases

    // the case's points are born in its lamp's light and spread into the square
    p = mix(m5 > 0.0 ? aFrom + dust * 0.05 : p, aCases, m5) + dust * 0.15 * sin(3.14159 * m5);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // letters on the world and in its flare, stars everywhere else
    float worldness = m1 * (1.0 - m3);
    vGlyphness = smoothstep(0.35, 0.9, m1) * (1.0 - m3) * letter;
    // whole, the world is fragments of script; in flight its words read
    float fragment = 1.0 + floor(fract(seed * 53.1) * uCells);
    vGlyph = open > 0.12 ? glyph : fragment;
    // only the letters write the world; the rest wait dark for the picture
    float light = mix(1.0, worldLight * letter, worldness);
    // in the picture: beads of light on the neuron, metal on the circuit;
    // each point lights up as it arrives
    float glint = mix(0.5 + 0.5 * fract(seed * 61.3), 0.75 + 0.45 * fract(seed * 61.3), chip);
    // the growing front is light itself
    // the growing tip is a spark
    float front = chip > 0.5 ? 0.0 : exp(-pow((sprout - 0.5) * 3.0, 2.0));
    // the beads twinkle a little at rest
    glint *= 0.82 + 0.18 * sin(uTime * (1.5 + 2.0 * fract(seed * 7.7)) + seed * 40.0);
    light = mix(light, glint, m3) + 1.6 * exp(-pow((m3 - 0.93) * 11.0, 2.0)) * step(0.01, m3) + 1.4 * front * m3;
    // while the reader scrolls through the synapse: pulses run down the axon
    // and in along the traces, signals cross the gap and land
    float synapse = smoothstep(0.9, 1.0, m3) * (1.0 - m4);
    // on the traces, light runs inwards ahead of the camera
    // the squares of dither are drawn in light: bright as they land, then settling
    light = mix(light * (1.0 - m4), 1.0 + 1.2 * exp(-pow((m5 - 0.92) * 9.0, 2.0)), m5);
    float pulse = exp(-pow((grow - fract(uSynT * 2.0)) * 12.0, 2.0)) + exp(-pow((grow - fract(uSynT * 2.0 + 0.5)) * 12.0, 2.0));
    light += synapse * (1.0 - signal) * 0.9 * pulse * step(0.001, uSynT) * (1.0 - step(0.999, uSynT));
    light += synapse * signal * (0.9 * sin(t * 3.14159) + 0.7 * smoother((t - 0.9) / 0.1) * (1.0 - smoother((uSynT - 0.97) / 0.03)));
    // a point shows only once its branch has grown to it
    light *= mix(1.0, sprout, (1.0 - chip) * m3 * (1.0 - signal));
    // alive: the nucleus breathes, impulses run out along the branches
    light *= 1.0 + neuron * m3 * (0.12 * sin(uTime * 0.9) * (1.0 - smoothstep(0.0, 0.1, grow)));
    light += neuron * m3 * sprout * 0.9 * exp(-pow((grow - fract(uTime * 0.18)) * 14.0, 2.0)) * (1.0 - m4);
    vLight = light * (1.0 + 0.25 * step(4.5, kind) * step(kind, 5.5) * (0.85 + 0.15 * sin(uTime * 2.4)));
    // red: some signals, and a few sparks inside the circuit
    vRed = synapse * step(2.5, kind) * step(kind, 3.5) + m3 * (1.0 - m5) * step(4.5, kind) * step(kind, 5.5);
    // brushed metal: a slow sheen along the circuit, so its greys shift as it rises
    float sheen = 0.5 + 0.5 * sin(aPic.x * 3.0 - aPic.y * 1.5 + uBeat * 2.4);
    vMetal = chip * m3 * (1.0 - m5) * (0.35 + 0.65 * sheen) * (1.0 - step(4.5, kind) * step(kind, 5.5));
    // moving points smear into short scan lines, the way a signal is drawn;
    // a few rest as scan lines by the neuron
    float scanKind = step(5.5, kind) * m3 * (1.0 - m5);
    vStreak = max(scanKind, step(0.55, fract(seed * 5.7)) * max(sin(3.14159 * m3) * (1.0 - chip * 0.5), sin(3.14159 * max(m5, m6))));

    // the cases take over from the points, then the points take over from
    // the cases and go out into the sky
    // the cases take over from the points
    // (done before the story comes to rest on the cases)
    vVis = 1.0 - smoother((uBeat - 4.93) / 0.05);

    // a letter keeps its true size on the world, as if printed on it, but
    // never fills the screen as it flies past
    float letterSize = min(uLetter * uProj / max(-mv.z, 0.2), 44.0 * uPx);
    float size = mix(5.0 * uPx, letterSize, m1);
    // knots: a few points of the picture are larger beads of light
    float bead = 0.75 + 1.9 * pow(fract(seed * 13.7), 9.0) * (1.0 - chip * 0.6);
    size = mix(size, mix(3.0, 2.4, chip) * bead * uPx, m3);
    size = mix(size, 8.0 * uPx, synapse * signal);
    // the red core glows as the white does: larger, softer, brighter
    float redCore = step(4.5, kind) * step(kind, 5.5) * m3 * (1.0 - m4);
    size *= 1.0 + 1.0 * redCore;
    size = mix(size, 2.2 * uPx, m5);
    size = mix(size, 2.4 * uPx, step(0.5, m5) * (1.0 - vStreak));
    size *= 1.0 + 2.5 * vStreak;
    gl_PointSize = size * mix(0.85 + 0.3 * min(vLight, 1.0), 1.0, vGlyphness);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uColor;
  uniform vec3 uRed;
  uniform vec3 uMetal;
  varying float vGlyph;
  varying float vGlyphness;
  varying float vLight;
  varying float vVis;
  varying float vRed;
  varying float vMetal;
  varying float vStreak;
  ${BAYER_GLSL}
  void main() {
    // fades are a pattern of whole pixels, never a blur
    if (vVis < bayer(gl_FragCoord.xy)) discard;
    vec2 d = gl_PointCoord - 0.5;
    float star = exp(-dot(d, d) * 16.0);
    // a scan line: thin, flat, fading at its ends
    float scan = exp(-d.y * d.y * 400.0) * (1.0 - smoothstep(0.15, 0.5, abs(d.x)));
    star = mix(star, scan, vStreak);
    vec2 cell = vec2(mod(vGlyph, ${ATLAS}.0), floor(vGlyph / ${ATLAS}.0));
    vec2 uv = vec2((cell.x + gl_PointCoord.x) / ${ATLAS}.0, 1.0 - (cell.y + gl_PointCoord.y) / ${ATLAS}.0);
    float glyph = texture2D(uAtlas, uv).a;
    float a = mix(star, glyph, vGlyphness) * vLight;
    if (a < 0.03) discard;
    vec3 col = mix(uColor, uMetal * (0.6 + 0.7 * vMetal), step(0.001, vMetal));
    col = mix(col, uRed, clamp(vRed, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`;

// rays standing out of the world in 3D: thin strips from its surface outwards,
// turning with it; each brightens as it turns to the light, breathes, and
// carries light out along its length; they grow long as the world flares
const RAY_VERT = /* glsl */ `
  attribute vec3 aDir;
  attribute vec2 aCorner; // along (0 at the surface, 1 at the tip), side (-1, 1)
  attribute vec3 aRay;    // length, width, phase
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uTurn;
  uniform float uPitch;
  uniform float uTime;
  uniform float uGlow;
  uniform float uOpen;
  uniform vec3 uLight;
  varying float vA;
  varying vec2 vCorner;
  varying float vPhase;
  varying float vDepth;
  ${COMMON_GLSL}
  void main() {
    vec3 d = rotX(rotY(aDir, uTurn), uPitch);
    float breath = 1.0 + 0.14 * sin(uTime * 0.7 + aRay.z * 6.283);
    float len = aRay.x * breath * (1.0 + 3.5 * uOpen);
    vec3 base = uCenter + d * uRadius * 1.02;
    vec3 tip = uCenter + d * uRadius * (1.02 + len);
    vec4 b = modelViewMatrix * vec4(base, 1.0);
    vec4 e = modelViewMatrix * vec4(tip, 1.0);
    vec2 dir = e.xy - b.xy;
    dir = length(dir) > 1e-4 ? normalize(dir) : vec2(1.0, 0.0);
    vec4 mv = mix(b, e, aCorner.x);
    mv.xy += vec2(-dir.y, dir.x) * aCorner.y * aRay.y * uRadius * (1.0 - 0.6 * aCorner.x) * (1.0 + uOpen);
    gl_Position = projectionMatrix * mv;
    vDepth = -mv.z;
    float lit = mix(0.3 + 0.7 * smoothstep(-0.2, 0.7, dot(d, uLight)), 1.0, uOpen);
    vA = uGlow * lit * (0.8 + 0.2 * sin(uTime * 1.1 + aRay.z * 9.0));
    vCorner = aCorner;
    vPhase = aRay.z;
  }
`;
const RAY_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying float vA;
  varying vec2 vCorner;
  varying float vPhase;
  varying float vDepth;
  ${BAYER_GLSL}
  void main() {
    // light running outwards along the ray
    float run = 0.55 + 0.45 * sin(vCorner.x * 9.0 - uTime * 1.3 + vPhase * 6.283);
    // no hard ends: the ray rises out of the surface instead of starting at
    // full light, and fades before the camera's near plane cuts it as the
    // reader flies through the burst
    float rise = smoothstep(0.0, 0.22, vCorner.x);
    float near = smoothstep(0.4, 3.0, vDepth);
    float a = vA * rise * near * pow(1.0 - vCorner.x, 1.4) * (1.0 - vCorner.y * vCorner.y) * 0.9 * run;
    a = floor(a * 8.0 + bayer(gl_FragCoord.xy)) / 8.0;
    if (a <= 0.0) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

// a soft halo at the world's edge, breathing with the rays; as the world
// flares, a core of light fills it and spreads
const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const GLOW_FRAG = /* glsl */ `
  uniform float uGlow;
  uniform float uCore;
  uniform vec3 uColor;
  varying vec2 vUv;
  ${BAYER_GLSL}
  void main() {
    float d = length((vUv - 0.5) * 6.0); // in radii of the world
    float halo = exp(-pow(max(d - 1.0, 0.0) * 2.4, 2.0)) * smoothstep(0.7, 1.0, d);
    float core = exp(-d * d * 0.9);
    float a = halo * 0.3 * uGlow + core * uCore;
    a = floor(a * 6.0 + bayer(gl_FragCoord.xy)) / 6.0;
    if (a <= 0.0) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

// the stars the camera flies through, always: they drift past even while a
// paragraph holds, so the flight inwards never stops, and they draw out into
// lines as the scroll speeds the camera up. They live in a box that travels
// with the camera and wraps, so there is no end to them.
const STAR_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aTail; // 0 the star, 1 the end of its trail
  uniform float uPx;
  uniform float uTrail;
  uniform float uCamZ;
  uniform float uDrift;
  varying float vA;
  void main() {
    // 80 units of stars, from 72 ahead of the camera to 8 behind it
    float rel = mod(position.z - uCamZ + uDrift + 72.0, 80.0) - 72.0;
    vec3 p = vec3(position.xy, uCamZ + rel) - vec3(0.0, 0.0, aTail * uTrail * (0.6 + 0.8 * fract(aSeed * 3.7)));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    // out near the lens and far away
    vA = (0.25 + 0.6 * fract(aSeed * 5.1)) * smoothstep(0.6, 3.0, dist) * (1.0 - smoothstep(35.0, 60.0, dist)) * (1.0 - aTail);
    gl_PointSize = uPx * (1.0 + 2.2 * pow(fract(aSeed * 7.9), 4.0)) * clamp(10.0 / dist, 0.6, 2.2);
  }
`;
const STAR_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uLine; // 0 for the stars, the trails' strength for their lines
  varying float vA;
  void main() {
    float a;
    if (uLine > 0.0) a = vA * uLine;
    else {
      vec2 d = gl_PointCoord - 0.5;
      a = vA * exp(-dot(d, d) * 16.0);
    }
    if (a < 0.02) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

// volumetric light: the frame is drawn once more into a small texture, and
// this pass lets that light scatter in a slow, uneven haze (wide soft blur from
// the texture's mip levels), pour out of one point in shafts (god rays: from
// the synapse's gap, or more faintly from inside the world) and flash red where
// a signal crosses. Laid over the frame additively, in dithered steps.
const LIGHT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
// a separable gaussian, one direction per pass, on a quarter-size copy
const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uDir; // one texel along the blur, times its reach
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.2270;
    c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.3162;
    c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.0703;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const LIGHT_FRAG = /* glsl */ `
  uniform sampler2D tLight;
  uniform sampler2D tSoft;  // the same light, blurred wide
  uniform vec2 uFrom;   // where the shafts start, in uv
  uniform float uAmt;   // how much the light scatters
  uniform float uShafts;
  uniform float uFlash; // red at the source while a signal crosses
  uniform float uBeat;
  uniform float uRaw;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;
  ${BAYER_GLSL}
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 uv = vUv;
    // the haze: thicker in some places than others, drifting with the scroll
    float haze = 0.45 + 0.55 * noise(uv * vec2(3.0 * uAspect, 3.0) + vec2(uBeat * 0.35 + uTime * 0.03, -uBeat * 0.2));
    // scattering: the light spreads in three widths
    vec3 glow = texture2D(tLight, uv).rgb * 0.25 + texture2D(tSoft, uv).rgb * 1.3;
    // shafts: march towards the source, gathering light that leaks along the way
    vec2 stepv = (uFrom - uv) / 28.0;
    vec2 q = uv;
    float decay = 1.0;
    vec3 shafts = vec3(0.0);
    for (int i = 0; i < 28; i++) {
      q += stepv;
      shafts += texture2D(tSoft, q).rgb * decay;
      decay *= 0.93;
    }
    // the shafts are not even: brighter bands sweep round the source with the scroll
    vec2 rel = (uv - uFrom) * vec2(uAspect, 1.0);
    float ang = atan(rel.y, rel.x);
    // and keep turning slowly while the page rests
    float sweep = 0.55 + 0.45 * sin(ang * 7.0 + uRaw * 3.2 + uTime * 0.35) * sin(ang * 3.0 - uRaw * 1.7 - uTime * 0.21);
    vec3 col = (glow * 0.55 + shafts * 0.07 * uShafts * sweep) * haze;
    // the crossing: a small red core at the source
    vec2 d = (uv - uFrom) * vec2(uAspect, 1.0);
    // near the source the light turns red, so the red holds against the glare
    col = mix(col, col * vec3(1.0, 0.32, 0.26) * 1.3, uFlash * exp(-dot(d, d) * 60.0) * 0.8);
    col *= uAmt;
    col += vec3(1.0, 0.16, 0.12) * uFlash * exp(-dot(d, d) * 600.0) * 0.9;
    // the faintest haze is left out, so empty sky stays empty
    col = max(col - 0.012, 0.0);
    // fine steps of light: a dither you see in the rays, not a grid on the sky
    col = floor(col * 32.0 + bayer(gl_FragCoord.xy)) / 32.0;
    // the canvas stays clear where there is no light, so the page's own sky shows
    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
  }
`;

const smootherJs = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
};

/** the glyph atlas: each word is drawn whole (so scripts keep their joins)
 * across as many cells as it needs, then cut into cells; the cells of a word
 * stand side by side on the world and read as the word again */
function makeAtlas() {
  const cell = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = ATLAS * cell;
  const ctx = cv.getContext('2d');
  const sequence: number[] = [];
  // for each cell of the sequence: its place in its word, and the word's length
  const place: [number, number][] = [];
  if (ctx) {
    const font = `500 44px system-ui, 'Noto Sans', sans-serif`;
    let k = 1;
    for (const word of WORDS) {
      ctx.font = font;
      const n = Math.max(1, Math.ceil((ctx.measureText(word).width + 6) / cell));
      if (k + n >= ATLAS * ATLAS) break;
      const strip = document.createElement('canvas');
      strip.width = n * cell;
      strip.height = cell;
      const sc = strip.getContext('2d');
      if (!sc) continue;
      sc.font = font;
      sc.fillStyle = '#fff';
      sc.textAlign = 'center';
      sc.textBaseline = 'middle';
      sc.fillText(word, strip.width / 2, cell / 2 + 2);
      for (let j = 0; j < n; j++, k++) {
        ctx.drawImage(strip, j * cell, 0, cell, cell, (k % ATLAS) * cell, Math.floor(k / ATLAS) * cell, cell, cell);
        sequence.push(k);
        place.push([j, n]);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { tex, sequence, place, cells: sequence.length };
}

// deterministic noise, so every visit shows the same scene
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** the screen (CSS px) as a plane CAM_Z units in front of the camera */
function screenPlane(width: number, height: number) {
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
  const visW = visH * (width / height);
  return {
    visW,
    visH,
    at: (px: number, py: number) => [(px / width - 0.5) * visW, (0.5 - py / height) * visH] as const,
  };
}

/** text drawn on a screen-sized canvas, sampled into points (screen px) */
function sampleText(draw: (ctx: CanvasRenderingContext2D) => void, width: number, height: number, step: number) {
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext('2d');
  if (!ctx) return [] as [number, number][];
  ctx.fillStyle = '#fff';
  draw(ctx);
  const data = ctx.getImageData(0, 0, width, height).data;
  const pts: [number, number][] = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 110) pts.push([x, y]);
    }
  }
  return pts;
}

/** exactly N of them: a spread subset, or repeats with a little jitter */
function toN(pts: [number, number][], rand: () => number) {
  const out: [number, number][] = [];
  if (!pts.length) return Array.from({ length: N }, () => [0, 0] as [number, number]);
  for (let i = 0; i < N; i++) {
    const many = pts.length >= N;
    const [x, y] = pts[many ? Math.floor((i * pts.length) / N) : Math.floor(rand() * pts.length)];
    out.push(many ? [x, y] : [x + (rand() - 0.5) * 0.6, y + (rand() - 0.5) * 0.6]);
  }
  return out;
}

// x, y (in the picture's plane), side (0 neuron, 1 circuit), grow, kind
// kinds: 0 drawing, 5 a red spark in the circuit, 6 a resting scan line
type PicPoint = [number, number, number, number, number];

/** the picture, in its own plane (world units): a neuron on the left made of
 * glowing beads, whose axon reaches right; a circuit on the right, packed
 * metal traces bending at 45 degrees into one; the gap between them. Growth
 * runs from the soma out and from the circuit's right edge in, so both ends
 * arrive last. */
function buildPicture(rand: () => number, PW: number, PH: number) {
  const pts: PicPoint[] = [];
  const gap = PW * 0.06;
  // the two ends on a rising diagonal, the neuron below left, the circuit
  // above right, the way the two hands meet in the fresco
  const tip: [number, number] = [-gap / 2, 0.03 * PH];
  // the source's middle: the axon's tip touches the edge of its circle
  // (radius gap / 2), and the signals land in its middle
  const pad: [number, number] = [0, tip[1]];
  const step = PW * 0.003;
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

  // ── the neuron: strands of light, thick near the soma, beaded all along
  // far enough in that its widest branches stay inside the frame
  const soma: [number, number] = [-0.27 * PW, -0.12 * PH];
  const bead = (x: number, y: number, g: number, rad: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, rr = Math.pow(rand(), 0.7) * rad;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0, g, 0]);
    }
  };
  // the soma: a bright knot with a looser haze round it
  bead(soma[0], soma[1], 0, PW * 0.02, 700);
  bead(soma[0], soma[1], 0.05, PW * 0.04, 260);
  const strand = (x: number, y: number, ang: number, len: number, width: number, depth: number, g0: number) => {
    const steps = Math.max(6, Math.round(len / step));
    let px = x, py = y, a = ang;
    for (let i = 0; i < steps; i++) {
      a += (rand() - 0.5) * 0.2;
      px += (Math.cos(a) * len) / steps;
      py += (Math.sin(a) * len) / steps;
      const g = (g0 + (i / steps) * 0.22) * 0.8;
      const w = width * (1 - (0.5 * i) / steps);
      // a strand is a few points across, spread round its middle
      for (let k = 0; k < 3; k++) pts.push([px - Math.sin(a) * w * gauss(), py + Math.cos(a) * w * gauss(), 0, g, 0]);
      if (rand() < 0.09) bead(px, py, g, w * 2.2, 10);
    }
    if (depth > 0) {
      strand(px, py, a + 0.4 + rand() * 0.35, len * 0.72, width * 0.7, depth - 1, g0 + 0.22);
      strand(px, py, a - 0.4 - rand() * 0.35, len * 0.72, width * 0.7, depth - 1, g0 + 0.22);
    } else tips.push([px, py, a]);
  };
  const tips: [number, number, number][] = [];
  for (const ang of [1.75, 2.35, 2.95, 3.55, 4.2]) strand(soma[0], soma[1], ang + (rand() - 0.5) * 0.2, PW * 0.1, PW * 0.004, 2, 0);
  // it goes on developing while the reader scrolls the closing paragraph:
  // new shoots from its tips (growth 1.2 to 2.2), then new connections, arcs
  // reaching from tip to tip from both ends and meeting (growth 2 to 3)
  const shoot = (x: number, y: number, ang: number, len: number, g0: number, g1: number) => {
    const steps = Math.max(6, Math.round(len / step));
    let px = x, py = y, a = ang;
    for (let i = 0; i < steps; i++) {
      a += (rand() - 0.5) * 0.3;
      px += (Math.cos(a) * len) / steps;
      py += (Math.sin(a) * len) / steps;
      const g = g0 + ((g1 - g0) * i) / steps;
      for (let k = 0; k < 2; k++) pts.push([px + gauss() * PW * 0.0015, py + gauss() * PW * 0.0015, 0, g, 0]);
      if (rand() < 0.08) bead(px, py, g, PW * 0.003, 6);
    }
  };
  const late = tips.slice().sort(() => rand() - 0.5).slice(0, 14);
  late.forEach(([x, y, a], k) => {
    const g0 = 1.2 + (k / late.length) * 0.6;
    shoot(x, y, a + (rand() - 0.5) * 0.8, PW * (0.03 + rand() * 0.04), g0, g0 + 0.4);
  });
  let links = 0;
  for (let i = 0; i < tips.length && links < 9; i++) {
    for (let j = i + 1; j < tips.length && links < 9; j++) {
      const [x0, y0] = tips[i], [x1, y1] = tips[j];
      const d = Math.hypot(x1 - x0, y1 - y0);
      if (d < PW * 0.03 || d > PW * 0.11 || rand() < 0.6) continue;
      // an arc bowed to one side, grown from both ends towards its middle
      const mx = (x0 + x1) / 2 + ((y1 - y0) / d) * d * 0.25, my = (y0 + y1) / 2 - ((x1 - x0) / d) * d * 0.25;
      const n = Math.round(d / step) * 2;
      const g0 = 2.0 + (links / 9) * 0.6;
      for (let s2 = 0; s2 <= n; s2++) {
        const t = s2 / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * mx + t * t * x1, y = u * u * y0 + 2 * u * t * my + t * t * y1;
        pts.push([x + gauss() * PW * 0.001, y + gauss() * PW * 0.001, 0, g0 + 0.4 * (1 - Math.abs(t - 0.5) * 2), 0]);
      }
      // where they meet, a spark
      bead(mx * 0.5 + (x0 + x1) * 0.25, my * 0.5 + (y0 + y1) * 0.25, g0 + 0.42, PW * 0.004, 18);
      links++;
    }
  }
  // the axon, sagging a little like an arm held out, beaded along its length
  const ctrl: [number, number] = [-0.14 * PW, -0.06 * PH];
  const axonSteps = Math.round((PW * 0.3) / step);
  for (let i = 0; i <= axonSteps; i++) {
    const t = i / axonSteps, u = 1 - t;
    const x = u * u * soma[0] + 2 * u * t * ctrl[0] + t * t * tip[0];
    const y = u * u * soma[1] + 2 * u * t * ctrl[1] + t * t * tip[1];
    // the axon grows last, after the dendrites
    const g = 0.6 + 0.38 * t;
    const w = PW * (0.0035 - 0.002 * t);
    for (let k = 0; k < 2; k++) pts.push([x + w * gauss(), y + w * gauss(), 0, g, 0]);
    if (i % 11 === 5) bead(x, y, g, PW * 0.005, 14);
  }
  // its end, a small bright hand of light
  bead(tip[0], tip[1], 1, PW * 0.007, 120);
  // scan lines resting by the neuron, as if the picture were being read
  for (const [y, x0, x1] of [[-0.02, -0.33, -0.19], [-0.04, -0.31, -0.23], [-0.08, -0.19, -0.05], [-0.1, -0.13, 0.01]]) {
    for (let x = x0 * PW; x < x1 * PW; x += PW * 0.012) pts.push([x, y * PH, 0, 0.6, 6]);
  }

  // ── the circuit: growth runs in from the right edge to the pad
  const right = 0.5 * PW;
  const cgrow = (x: number) => Math.min(1, Math.max(0, 1 - (x - pad[0]) / (right - pad[0])));
  // a trace is a metal strip: two close edges, so it reads as metal, not a dotted line
  const line = (x0: number, y0: number, x1: number, y1: number, s = step * 0.7, half = PW * 0.0012) => {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const n = Math.max(2, Math.round(len / s));
    const nx = (-(y1 - y0) / len) * half, ny = ((x1 - x0) / len) * half;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      pts.push([x + nx, y + ny, 1, cgrow(x), 0], [x - nx, y - ny, 1, cgrow(x), 0]);
    }
  };
  const ring = (x: number, y: number, rad: number, kind = 0) => {
    const n = Math.max(8, Math.round((Math.PI * 2 * rad) / (step * 0.6)));
    for (let i = 0; i < n; i++) pts.push([x + Math.cos((i / n) * Math.PI * 2) * rad, y + Math.sin((i / n) * Math.PI * 2) * rad, 1, cgrow(x), kind]);
  };
  // a red core of light inside the source, where the signals land
  for (let k = 0; k < 24; k++) {
    const a = rand() * Math.PI * 2, rr = Math.pow(rand(), 1.5) * gap * 0.22;
    pts.push([pad[0] + Math.cos(a) * rr, pad[1] + Math.sin(a) * rr, 1, 1, 5]);
  }

  // signals: from the axon's end across the gap to the pad
  const signals: [number, number, number, number, number, number][] = [];
  for (let k = 0; k < SIGNALS; k++) {
    const sy = tip[1] + gauss() * PW * 0.004;
    const ey = pad[1] + gauss() * PW * 0.004;
    signals.push([tip[0], sy, pad[0], ey, rand() * 1.1, k % 9 === 4 ? 3 : 2]);
  }
  return { pts, signals, soma, pad };
}


// ── the circuit, drawn in light ──
// Every wire of the schematic is a strip of light facing the reader: a hot
// thin core, a soft halo, and current running along it. It is drawn out from
// the source as the reader scrolls; then the three lamps light. The same
// strips, placed in the room itself, carry the lamps' light up to draw the
// three cases.
const LINE_VERT = /* glsl */ `
  attribute vec3 aA;      // one end: in the picture's plane x, y and how far it rides the stretch; or in the room, x, y, z
  attribute vec3 aB;      // the other end
  attribute vec3 aA2;     // where the ends go as the lamps become the cases (in the room)
  attribute vec3 aB2;
  attribute vec2 aCorner; // along (0 at A, 1 at B), side (-1, 1)
  attribute vec4 aLine;   // when it is drawn (0..1), kind, length, near the gap (0..1)
                          // kinds: 0 wire, 1-3 the lamps, 4 the switch's blade, 5 the power line, 6 the source
  uniform float uFrame;   // 0 in the picture's plane, 1 in the room
  uniform vec3 uPicAt;
  uniform float uTilt;
  uniform float uYaw;
  uniform vec3 uShift;
  uniform float uStretch;
  uniform float uReach;
  uniform float uPW;
  uniform float uDraw;
  uniform float uWidth;
  uniform vec2 uPad;
  uniform vec3 uAnchor;   // the battery's place in the room
  uniform float uTurn;    // its turn in the picture's plane: a rising diagonal, then straight ahead in the dive
  uniform float uMorph;   // lamps to cases
  uniform float uSwitch;  // the blade's angle: open, then closed by the scroll
  uniform float uScale;   // the sheet's size, fitted under the text
  uniform vec3 uLampC[3];  // each lamp's middle, in the sheet
  uniform vec3 uTileC[3];  // each case's middle, in the room
  uniform float uLampOut;  // 0 on the sheet, 1 standing in its case
  uniform float uLampGrow; // how large a lamp grows on its way
  varying vec2 vCorner;
  varying float vKind;
  varying float vLine;
  varying float vLamp;
  varying float vAlong;
  ${COMMON_GLSL}
  // a sheet facing the reader, anchored at the source by the gap; in the
  // dive it lies down (uTilt) and its upper part rides the stretch
  vec3 sheet(vec3 e) {
    e.xy *= uScale;
    float y = e.y + e.z * uStretch;
    return uAnchor + vec3(e.x, y * cos(uTilt), -y * sin(uTilt));
  }
  vec3 place(vec3 e, vec3 e2) {
    if (uFrame > 0.5) return mix(e, e2, uMorph);
    // the switch's blade swings about its pivot (its A end)
    if (abs(aLine.y - 4.0) < 0.5) {
      vec2 v = e.xy - aA.xy;
      float bc = cos(uSwitch), bs = sin(uSwitch);
      e.xy = aA.xy + vec2(v.x * bc - v.y * bs, v.x * bs + v.y * bc);
    }
    vec3 w = sheet(e);
    // at the end of the roads each lamp moves apart from the others and grows,
    // towards its case
    float lampNo = aLine.y > 10.5 ? aLine.y - 10.0 : aLine.y;
    if (lampNo > 0.5 && lampNo < 3.5 && uLampOut > 0.0) {
      int i = lampNo < 1.5 ? 0 : lampNo < 2.5 ? 1 : 2;
      vec3 c = sheet(uLampC[i]);
      w = mix(w, uTileC[i] + (w - c) * uLampGrow, uLampOut);
    }
    return w;
  }
  void main() {
    // drawn out from the source: this strip's share of the drawing so far
    float drawn = clamp((uDraw - aLine.x) / 0.08, 0.0, 1.0);
    vec3 a = place(aA, aA2);
    vec3 b = mix(a, place(aB, aB2), drawn);
    vec4 ma = modelViewMatrix * vec4(a, 1.0);
    vec4 mb = modelViewMatrix * vec4(b, 1.0);
    vec2 dir = mb.xy - ma.xy;
    dir = length(dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);
    vec4 mv = mix(ma, mb, aCorner.x);
    // a little longer than the wire, so the ends are round with light
    mv.xy += dir * (aCorner.x * 2.0 - 1.0) * uWidth * 0.5;
    float width = uWidth * (abs(aLine.y - 5.0) < 0.5 ? 2.4 : 1.0);
    mv.xy += vec2(-dir.y, dir.x) * aCorner.y * width;
    gl_Position = projectionMatrix * mv;
    vCorner = aCorner;
    vLine = drawn > 0.0 ? 1.0 : 0.0;
    vLamp = aLine.y;
    vKind = aLine.y;
    vAlong = aLine.x + aCorner.x * aLine.z * 0.02;
  }
`;
const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uWarm;
  uniform float uTime;
  uniform float uRaw;
  uniform float uLampOn;
  uniform vec3 uLamps;   // each lamp's light, one after another
  uniform float uPower;  // 0 while the switch is open, 1 once current flows
  uniform float uWave;   // the first impulse after the switch closes, as a place along the circuit
  uniform float uAlpha;
  varying vec2 vCorner;
  varying float vLine;
  varying float vLamp;
  varying float vKind;
  varying float vAlong;
  ${BAYER_GLSL}
  void main() {
    if (vLine < 0.5 || uAlpha <= 0.0) discard;
    float q = vCorner.y;
    // graphite: a soft stroke with grain, no neon halo; lamps keep their light
    float grain = 0.45 + 0.55 * fract(sin(dot(floor(gl_FragCoord.xy * 0.75), vec2(12.9898, 78.233))) * 43758.5453);
    float core = exp(-q * q * 9.0) * grain * 0.8;
    float halo = exp(-q * q * 3.0) * 0.12;
    // current runs along the wires once the switch is closed, faster as the
    // reader scrolls; the source pulses all the time
    float run = uPower * exp(-pow(fract(vAlong * 3.0 - uTime * 0.35 - uRaw * 0.9) - 0.5, 2.0) * 50.0);
    float source = abs(vKind - 6.0) < 0.5 ? 0.6 + 0.6 * sin(uTime * 2.4) : 0.0;
    // lamps (1-3) and their filling of light (11-13), shown only once lit
    float lampNo = vKind > 10.5 ? vKind - 10.0 : vKind;
    float which = lampNo > 0.5 && lampNo < 3.5 ? (lampNo < 1.5 ? uLamps.x : lampNo < 2.5 ? uLamps.y : uLamps.z) : 0.0;
    if (vKind > 10.5 && which < 0.02) discard;
    float lit = which * (0.85 + 0.15 * sin(uTime * 9.0 + vAlong * 40.0)) + source;
    // the first impulse: a bright front running from the source to the lamps
    run += 2.5 * exp(-pow((vAlong - uWave) * 22.0, 2.0));
    float a = (core * (0.75 + 0.6 * run) + halo * (0.6 + run + 0.5 * lit)) * uAlpha * (1.0 + 0.5 * lit);
    // the lamp's filling is a soft warm light, the cross stays readable through it
    if (vKind > 10.5) a *= 0.14;
    a = floor(a * 20.0 + bayer(gl_FragCoord.xy)) / 20.0;
    if (a <= 0.0) discard;
    vec3 col = mix(uColor, uWarm, clamp(lit, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`;

type V3 = [number, number, number];
type Seg = { a: V3; b: V3; a2?: V3; b2?: V3; at: number; kind?: number; near?: number };

/** the circuit, one closed loop, drawn the way a textbook draws it: a
 * rectangle read clockwise. The source is where the axon reaches: the
 * textbook symbol of a source, a circle with + and -, drawn round the
 * junction's own pulsing light. From + a thick power line runs up the left
 * side and along the top to a knife switch, which the scroll closes (the
 * moment of action: only then does current run on, and its first impulse
 * reaches the lamps one by one); three lamps (a circle with a cross), her
 * three projects, stand as rungs between the top rail and the bottom rail,
 * which returns into -. Solder dots mark every join. Coordinates in units of
 * the picture's width, from the junction. In the dive the sheet lies down and
 * everything from the lamps up rides the stretch: the rungs become roads. */
function buildCircuit(PW: number) {
  const segs: Seg[] = [];
  const U = PW;
  const rand = rng(53);
  const P = (x: number, y: number, ride = 0): V3 => [x * U, y * U, ride];
  type Opt = { r0?: number; r1?: number; kind?: number };
  // drawn as by hand, left to right: every line is two passes of a pencil,
  // each wobbling a little along its length, overshooting its ends; its
  // pieces appear as the sweep passes their place
  const SWEEP = 0.4; // the width the sweep crosses
  const top = 0.12, bottom = -0.08, rs = 0.03;
  const lampY = 0.02, r = 0.022;
  // in the dive everything from the lamps' lower edge up rides the stretch,
  // the source never does
  const rides = (y: number, kind = 0) => (kind === 6 ? 0 : y >= lampY - r - 1e-4 ? 1 : 0);
  const stroke = (pts: [number, number][], opt: Opt = {}, passes = 2) => {
    for (let pass = 0; pass < passes; pass++) {
      const ph = rand() * 6.28, ph2 = rand() * 6.28, amp = 0.0007 * (pass ? 1.5 : 1);
      // a little longer at both ends, the way a hand draws past a corner
      const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
      const over = (pass ? 0.006 : 0.003) * (0.5 + rand());
      const d0 = Math.hypot(pts[1][0] - x0, pts[1][1] - y0) || 1, d1 = Math.hypot(x1 - pts[pts.length - 2][0], y1 - pts[pts.length - 2][1]) || 1;
      const path = [
        [x0 - ((pts[1][0] - x0) / d0) * over, y0 - ((pts[1][1] - y0) / d0) * over],
        ...pts,
        [x1 + ((x1 - pts[pts.length - 2][0]) / d1) * over, y1 + ((y1 - pts[pts.length - 2][1]) / d1) * over],
      ];
      // walk the path in short steps, nudged sideways by a slow wobble
      let travelled = 0;
      const out: [number, number, number][] = [];
      for (let i = 0; i + 1 < path.length; i++) {
        const [ax, ay] = path[i], [bx, by] = path[i + 1];
        const len = Math.hypot(bx - ax, by - ay);
        const n = Math.max(1, Math.ceil(len / 0.008));
        for (let k = 0; k < n; k++) {
          const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
          const s2 = travelled + len * t;
          const off = amp * (Math.sin(s2 * 38 + ph) + 0.4 * Math.sin(s2 * 97 + ph2)) + (pass ? 0.0012 : 0);
          out.push([x - ((by - ay) / (len || 1)) * off, y + ((bx - ax) / (len || 1)) * off, s2]);
        }
        travelled += len;
      }
      const [lx, ly] = path[path.length - 1];
      out.push([lx, ly, travelled]);
      for (let i = 0; i + 1 < out.length; i++) {
        const [ax, ay] = out[i], [bx, by] = out[i + 1];
        segs.push({
          a: P(ax, ay, rides(ay, opt.kind)),
          b: P(bx, by, rides(by, opt.kind)),
          at: Math.min(0.97, Math.max(0, Math.min(ax, bx) / SWEEP) * 0.9 + pass * 0.02),
          kind: opt.kind ?? 0,
        });
      }
    }
  };
  const L = (x0: number, y0: number, x1: number, y1: number, opt: Opt = {}) => {
    // always drawn left to right
    if (x1 < x0 - 1e-6) [x0, y0, x1, y1] = [x1, y1, x0, y0];
    stroke([[x0, y0], [x1, y1]], opt);
  };
  const circle = (cx: number, cy: number, rad: number, opt: Opt & { ride?: number } = {}, passes = 2) => {
    const n = Math.max(16, Math.round(rad * 900));
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) pts.push([cx + Math.cos(Math.PI - (i / n) * Math.PI * 2) * rad, cy + Math.sin(Math.PI - (i / n) * Math.PI * 2) * rad]);
    stroke(pts, { r0: opt.ride, r1: opt.ride, kind: opt.kind }, passes);
  };
  const dot = (x: number, y: number, ride = 0) => {
    for (const rr of [0.0035, 0.002]) circle(x, y, rr, { ride }, 1);
  };
  const rungs = [0.2, 0.27, 0.34];
  const right = rungs[2];
  // the source round the junction, + above, - below
  circle(0, 0, rs, { kind: 6 });
  L(-0.007, 0.012, 0.007, 0.012, { kind: 6 });
  L(0, 0.005, 0, 0.019, { kind: 6 });
  L(-0.007, -0.012, 0.007, -0.012, { kind: 6 });
  // the power line up the left side and along the top; the return along the bottom
  L(0, rs, 0, top, { r1: 1, kind: 5 });
  L(0, -rs, 0, bottom);
  L(0, top, 0.08, top, { r0: 1, r1: 1, kind: 5 });
  L(0, bottom, right, bottom);
  // the knife switch: pivot, blade (open until the scroll closes it), contact
  dot(0.08, top, 1);
  segs.push({ a: P(0.08, top, 1), b: P(0.135, top, 1), at: 0.08 / SWEEP * 0.9, kind: 4 });
  circle(0.14, top, 0.005, { ride: 1 }, 1);
  L(0.145, top, right, top, { r0: 1, r1: 1 });
  // three lamps as rungs between the rails
  for (const [i, x] of rungs.entries()) {
    const k = i + 1;
    if (i < 2) {
      dot(x, top, 1);
      dot(x, bottom, 0);
    }
    L(x, top, x, lampY + r, { r0: 1, r1: 1 });
    circle(x, lampY, r, { ride: 1, kind: k });
    const d = r * 0.7071;
    L(x - d, lampY - d, x + d, lampY + d, { r0: 1, r1: 1, kind: k });
    L(x - d, lampY + d, x + d, lampY - d, { r0: 1, r1: 1, kind: k });
    // its filling of light, there only once it is lit
    for (let f = 0.86; f > 0.05; f -= 0.1) circle(x, lampY, r * f, { ride: 1, kind: 10 + k }, 1);
    L(x, lampY - r, x, bottom, { r0: 1, r1: 0 });
  }
  const lamps = rungs.map((x) => P(x, lampY, 1));
  return { segs, lamps, top };
}

/** strips for a list of segments, as one geometry */
function lineGeometry(segs: Seg[]) {
  const n = segs.length;
  const A = new Float32Array(n * 4 * 3), B = new Float32Array(n * 4 * 3), C = new Float32Array(n * 4 * 2), M = new Float32Array(n * 4 * 4);
  const A2 = new Float32Array(n * 4 * 3), B2 = new Float32Array(n * 4 * 3);
  const index: number[] = [];
  segs.forEach((sg, i) => {
    const len = Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1], sg.b[2] - sg.a[2]);
    [[0, -1], [0, 1], [1, -1], [1, 1]].forEach((c, k) => {
      const v = i * 4 + k;
      A.set(sg.a, v * 3);
      B.set(sg.b, v * 3);
      A2.set(sg.a2 ?? sg.a, v * 3);
      B2.set(sg.b2 ?? sg.b, v * 3);
      C.set(c, v * 2);
      M.set([sg.at, sg.kind ?? 0, len, sg.near ?? 0], v * 4);
    });
    const b = i * 4;
    index.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 4 * 3), 3));
  g.setAttribute('aA', new THREE.BufferAttribute(A, 3));
  g.setAttribute('aB', new THREE.BufferAttribute(B, 3));
  g.setAttribute('aA2', new THREE.BufferAttribute(A2, 3));
  g.setAttribute('aB2', new THREE.BufferAttribute(B2, 3));
  g.setAttribute('aCorner', new THREE.BufferAttribute(C, 2));
  g.setAttribute('aLine', new THREE.BufferAttribute(M, 4));
  g.setIndex(index);
  return g;
}

/** the dive after the synapse: 0 before it, 1 at the cases */
function diveAt(beat: number) {
  return smootherJs((beat - 4.05) / 0.85);
}
const STRETCH = 15; // how far the lamps travel down their roads, world units

/** the cases in points: each square's outline, and a sparse dither inside */
function sampleTiles(tiles: Box[]) {
  const pts: [number, number][] = [];
  const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (const t of tiles) {
    for (let x = 0; x <= t.w; x += 2) pts.push([t.x + x, t.y], [t.x + x, t.y + t.h]);
    for (let y = 0; y <= t.h; y += 2) pts.push([t.x, t.y + y], [t.x + t.w, t.y + y]);
    for (let y = 3; y < t.h; y += 5) {
      for (let x = 3; x < t.w; x += 5) {
        if (m[((y / 5) & 3) * 4 + ((x / 5) & 3)] < 4) pts.push([t.x + x, t.y + y]);
      }
    }
  }
  return pts;
}

/** where the world's light comes from, as it forms (as in the shader) */
function lightDir(form: number) {
  const la = 4.64 - 2.4 * form;
  return new THREE.Vector3(Math.cos(la) * 0.85, 0.45, Math.sin(la) * 0.85).normalize();
}

/** the picture's tilt: lying almost flat as the neuron gathers, rising as the
 * circuit reaches it, never quite upright */
function tiltAt(beat: number) {
  return 1.25 - 0.42 * smootherJs((beat - 2.1) / 0.9) - 0.4 * smootherJs((beat - 3.05) / 0.95) + 1.14 * smootherJs(diveAt(beat) / 0.35);
}

/** the stars on the camera's path: a long tube round it, none on the axis */
function makeStars() {
  const rand = rng(41);
  const far = -80, near = 0;
  const pos = new Float32Array(STARS * 3), seed = new Float32Array(STARS);
  const linePos = new Float32Array(STARS * 6), lineSeed = new Float32Array(STARS * 2), tail = new Float32Array(STARS * 2);
  for (let i = 0; i < STARS; i++) {
    const a = rand() * Math.PI * 2, r = 1.2 + Math.pow(rand(), 1.6) * 22;
    const p = [Math.cos(a) * r, Math.sin(a) * r * 0.7, near + (far - near) * rand()];
    const s = rand();
    pos.set(p, i * 3);
    seed[i] = s;
    linePos.set([...p, ...p], i * 6);
    lineSeed.set([s, s], i * 2);
    tail.set([0, 1], i * 2);
  }
  const points = new THREE.BufferGeometry();
  points.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  points.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  points.setAttribute('aTail', new THREE.BufferAttribute(new Float32Array(STARS), 1));
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  lines.setAttribute('aSeed', new THREE.BufferAttribute(lineSeed, 1));
  lines.setAttribute('aTail', new THREE.BufferAttribute(tail, 1));
  return { points, lines };
}

// every layer adds light, none hides another
const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

function Story() {
  const { camera, invalidate, gl, size } = useThree();
  const [ready, setReady] = useState(false);
  const [tiles, setTiles] = useState<Box[]>(roomBus.tiles);
  const clock = useRef({ time: 0, t: 0, spin: 0, z: CAM_AT[0], speed: 0, drift: 0, raw: 0, yaw: 0, pitch: 0, travel: 0, flight: 0 });
  const glowMesh = useRef<THREE.Mesh>(null);
  const dive = useRef({ shiftX: 0, pad: [0, 0] as [number, number], top: 1, fit: 1, tileCenters: [] as THREE.Vector3[] });
  const picSize = useRef({ PW: 1, PH: 1 });
  const { scene } = useThree();
  // the light pass: a half-size, mipmapped copy of the frame, and one quad
  const light = useMemo(() => {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false } as const;
    const target = new THREE.WebGLRenderTarget(2, 2, opts);
    const soft = [new THREE.WebGLRenderTarget(2, 2, opts), new THREE.WebGLRenderTarget(2, 2, opts)];
    const blur = new THREE.ShaderMaterial({ vertexShader: LIGHT_VERT, fragmentShader: BLUR_FRAG, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, depthWrite: false, depthTest: false });
    const blurScene = new THREE.Scene();
    const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur);
    blurQuad.frustumCulled = false;
    blurScene.add(blurQuad);
    const mat = new THREE.ShaderMaterial({
      vertexShader: LIGHT_VERT,
      fragmentShader: LIGHT_FRAG,
      uniforms: {
        tLight: { value: target.texture },
        tSoft: { value: soft[0].texture },
        uFrom: { value: new THREE.Vector2(0.5, 0.5) },
        uAmt: { value: 0 },
        uShafts: { value: 1 },
        uFlash: { value: 0 },
        uBeat: { value: 0 },
        uRaw: { value: 0 },
        uTime: { value: 0 },
        uAspect: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const overlay = new THREE.Scene();
    overlay.add(quad);
    return { target, soft, blur, blurScene, mat, overlay, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, []);
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    light.target.setSize(Math.max(2, Math.round((size.width * dpr) / 2)), Math.max(2, Math.round((size.height * dpr) / 2)));
    for (const t of light.soft) t.setSize(Math.max(2, Math.round((size.width * dpr) / 4)), Math.max(2, Math.round((size.height * dpr) / 4)));
    light.mat.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [size.width, size.height, gl, light]);
  useEffect(
    () => () => {
      light.target.dispose();
      light.soft.forEach((t) => t.dispose());
    },
    [light],
  );
  useEffect(() => {
    document.fonts.ready.then(() => setReady(true));
    const sync = () => setTiles(roomBus.tiles);
    roomBus.listeners.add(sync);
    return () => void roomBus.listeners.delete(sync);
  }, []);

  const atlas = useMemo(() => makeAtlas(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uBeat: { value: 0 },
          uSynT: { value: 0 },
          uSpin: { value: 0 },
          uPx: { value: gl.getPixelRatio() },
          uProj: { value: 1 },
          uLetter: { value: 0.1 },
          uCells: { value: atlas.cells },
          uReach: { value: 0 },
          uRaw: { value: 0 },
          uPW: { value: 1 },
          uPitch: { value: 0 },
          uSoma: { value: new THREE.Vector2() },
          uShift: { value: new THREE.Vector3() },
          uTime: { value: 0 },
          uSphereAt: { value: new THREE.Vector3() },
          uRadius: { value: 1 },
          uPicAt: { value: new THREE.Vector3() },
          uTilt: { value: 1.25 },
          uYaw: { value: 0 },
          uAtlas: { value: atlas.tex },
          uColor: { value: new THREE.Color('#f2efe9') },
          uRed: { value: new THREE.Color('#ff2a1f') },
          uMetal: { value: new THREE.Color('#c4c8cf') },
        },
        ...additive,
      }),
    [gl, atlas],
  );
  const glow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
        uniforms: { uGlow: { value: 0 }, uCore: { value: 0 }, uColor: { value: new THREE.Color('#f2efe9') } },
        ...additive,
      }),
    [],
  );
  const rayMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RAY_VERT,
        fragmentShader: RAY_FRAG,
        uniforms: {
          uCenter: { value: new THREE.Vector3() },
          uRadius: { value: 1 },
          uTurn: { value: 0 },
          uPitch: { value: 0 },
          uTime: { value: 0 },
          uGlow: { value: 0 },
          uOpen: { value: 0 },
          uLight: { value: new THREE.Vector3(0, 0, 1) },
          uColor: { value: new THREE.Color('#f2efe9') },
        },
        side: THREE.DoubleSide,
        ...additive,
      }),
    [],
  );
  const starMats = useMemo(() => {
    const make = (line: number) =>
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: {
          uPx: { value: gl.getPixelRatio() },
          uTrail: { value: 0 },
          uLine: { value: line },
          uCamZ: { value: CAM_AT[0] },
          uDrift: { value: 0 },
          uColor: { value: new THREE.Color('#f2efe9') },
        },
        ...additive,
      });
    return { points: make(0), lines: make(0.0001) };
  }, [gl]);
  const stars = useMemo(() => makeStars(), []);
  const lineMats = useMemo(() => {
    const make = (frame: number, width: number, dur: number) =>
      new THREE.ShaderMaterial({
        vertexShader: LINE_VERT.replace('/ 0.08, 0.0, 1.0)', `/ ${dur.toFixed(2)}, 0.0, 1.0)`),
        fragmentShader: LINE_FRAG,
        uniforms: {
          uFrame: { value: frame },
          uPicAt: { value: new THREE.Vector3() },
          uTilt: { value: 1 },
          uYaw: { value: 0 },
          uShift: { value: new THREE.Vector3() },
          uStretch: { value: 0 },
          uReach: { value: 0 },
          uPW: { value: 1 },
          uDraw: { value: 0 },
          uWidth: { value: width },
          uPad: { value: new THREE.Vector2() },
          uAnchor: { value: new THREE.Vector3() },
          uTurn: { value: 0 },
          uMorph: { value: 0 },
          uColor: { value: new THREE.Color(frame ? '#f2efe9' : '#e9e6df') },
          uWarm: { value: new THREE.Color('#fff1d6') },
          uTime: { value: 0 },
          uRaw: { value: 0 },
          uLampOn: { value: 0 },
          uLamps: { value: new THREE.Vector3() },
          uPower: { value: 0 },
          uSwitch: { value: 0.6 },
          uScale: { value: 1 },
          uLampC: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
          uTileC: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
          uLampOut: { value: 0 },
          uLampGrow: { value: 1 },
          uWave: { value: -1 },
          uAlpha: { value: 1 },
        },
        side: THREE.DoubleSide,
        ...additive,
      });
    return { circuit: make(0, 0.016, 0.08), tiles: make(1, 0.022, 0.25) };
  }, []);

  // the world keeps to the right of the text column, whole on any width
  const sphere = useMemo(() => {
    const { visW, visH } = screenPlane(size.width, size.height);
    return { at: new THREE.Vector3(visW * 0.24, -0.1, CAM_AT[1] - CAM_Z), radius: Math.min(1.5, visW * 0.16, visH * 0.3) };
  }, [size.width, size.height]);

  const rays = useMemo(() => {
    const rand = rng(29);
    const dir = new Float32Array(RAYS * 4 * 3);
    const corner = new Float32Array(RAYS * 4 * 2);
    const ray = new Float32Array(RAYS * 4 * 3);
    const index: number[] = [];
    for (let r = 0; r < RAYS; r++) {
      // an even spread over the sphere, each ray its own length and breath
      const y = 1 - 2 * rand(), rr = Math.sqrt(1 - y * y), th = rand() * Math.PI * 2;
      const d = [Math.cos(th) * rr, y, Math.sin(th) * rr];
      const meta = [0.45 + Math.pow(rand(), 1.5) * 1.1, 0.016 + rand() * 0.03, rand()];
      [[0, -1], [0, 1], [1, -1], [1, 1]].forEach((c, k) => {
        dir.set(d, (r * 4 + k) * 3);
        corner.set(c, (r * 4 + k) * 2);
        ray.set(meta, (r * 4 + k) * 3);
      });
      const b = r * 4;
      index.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAYS * 4 * 3), 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    g.setAttribute('aRay', new THREE.BufferAttribute(ray, 3));
    g.setIndex(index);
    return g;
  }, []);

  const geometry = useMemo(() => {
    if (!ready) return null;
    const rand = rng(11);
    const W = Math.round(size.width), H = Math.round(size.height);
    const plane = screenPlane(W, H);
    const { visW, visH } = plane;

    // title: STATEMENT across the top, in the display face, under the Back link
    const titlePx = Math.min(W * 0.11, 180);
    const word = toN(
      sampleText((ctx) => {
        ctx.font = `${titlePx}px 'Geist Pixel', monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText('STATEMENT', W * 0.05, Math.max(H * 0.2, roomBus.titleY));
      }, W, H, 3),
      rand,
    );

    const { at: sphereAt, radius } = sphere;
    material.uniforms.uSphereAt.value.copy(sphereAt);
    material.uniforms.uRadius.value = radius;
    rayMat.uniforms.uCenter.value.copy(sphereAt);
    rayMat.uniforms.uRadius.value = radius;
    // a letter cell, sized to LETTER_PX on the world's front at the lead
    const front = CAM_AT[1] - (sphereAt.z + radius);
    const letter = (LETTER_PX / H) * 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * front;
    material.uniforms.uLetter.value = letter;

    // the lines of script round the world, each ring as many cells as fit
    const ring: [number, number, number, number, number][] = []; // theta, phi, glyph, word's middle theta, place from the middle
    const seq = atlas.sequence;
    const rows = Math.max(6, Math.floor((Math.PI * radius * 0.86) / (letter * 1.6)));
    for (let j = 0; j < rows; j++) {
      const phi = Math.PI * 0.43 * (2 * (j / (rows - 1)) - 1);
      const count = Math.floor((2 * Math.PI * radius * Math.cos(phi)) / letter);
      const offset = Math.floor(rand() * seq.length);
      // increasing theta runs left to right across the front (theta = 3pi/2)
      const dt = (2 * Math.PI) / count;
      for (let k = 0; k < count; k++) {
        const q = (k + offset) % seq.length;
        const [at, len] = atlas.place[q];
        const th = Math.PI / 2 + (k + 0.5) * dt;
        const mid = (len - 1) / 2;
        ring.push([th, phi, seq[q], th + (mid - at) * dt, at - mid]);
      }
    }
    // which points write the world: an even pick from all over the title
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const role = new Int32Array(N).fill(-1);
    ring.slice(0, N).forEach((_, k) => (role[order[k]] = k));

    // the picture lies below the text, a little beyond paragraph 2
    const PW = visW * 0.88, PH = visH * 0.75;
    picSize.current = { PW, PH };
    material.uniforms.uPW.value = PW;
    material.uniforms.uPicAt.value.set(0, -1.3, CAM_AT[PICTURE] - CAM_Z - 0.6);
    const pic = buildPicture(rand, PW, PH);
    const circuit = buildCircuit(PW);
    // where the lamps stand at the end of the dive: the sheet lying flat, its
    // rungs stretched far ahead, the middle lamp straight ahead
    const picAt = material.uniforms.uPicAt.value as THREE.Vector3;
    const tiltEnd = tiltAt(CASES);
    const [px, py] = pic.pad;
    const reachEnd = 0;
    const shiftX = -(px - reachEnd + circuit.lamps[1][0]);
    const anchorEnd = new THREE.Vector3(px - reachEnd + shiftX, picAt.y + py * Math.cos(tiltEnd), picAt.z - py * Math.sin(tiltEnd));
    const lampWorld = circuit.lamps.map(([x, y]) => new THREE.Vector3(anchorEnd.x + x, anchorEnd.y, anchorEnd.z - (y + STRETCH)));
    // each lamp becomes a small square of light, which grows into its case
    const casesZ = CAM_AT[CASES] - CAM_Z;
    const tileSegs: Seg[] = [];
    tiles.forEach((t, i) => {
      const lamp = lampWorld[Math.min(i, lampWorld.length - 1)];
      const [l, top] = plane.at(t.x, t.y), [rgt, bot] = plane.at(t.x + t.w, t.y + t.h);
      const h = 0.12;
      const from = [
        [lamp.x - h, lamp.y - h], [lamp.x + h, lamp.y - h], [lamp.x + h, lamp.y + h], [lamp.x - h, lamp.y + h],
      ];
      const to = [[l, bot], [rgt, bot], [rgt, top], [l, top]];
      for (let k = 0; k < 4; k++) {
        const n = (k + 1) % 4;
        tileSegs.push({
          a: [from[k][0], from[k][1], lamp.z], b: [from[n][0], from[n][1], lamp.z],
          a2: [to[k][0], to[k][1], casesZ], b2: [to[n][0], to[n][1], casesZ],
          at: k * 0.15,
        });
      }
    });
    dive.current.pad = [px, py];
    // each lamp goes to its case's middle; the cases' points start in its light
    const tileCenters = tiles.map((t) => {
      const [cx2, cy2] = plane.at(t.x + t.w / 2, t.y + t.h / 2);
      return new THREE.Vector3(cx2, cy2, casesZ);
    });
    const cu = lineMats.circuit.uniforms;
    circuit.lamps.forEach((l, i) => (cu.uLampC.value as THREE.Vector3[])[i].set(l[0], l[1], l[2]));
    tileCenters.forEach((c, i) => i < 3 && (cu.uTileC.value as THREE.Vector3[])[i].copy(c));
    // a lamp grows from its own size to about a third of its case
    const lampR = 0.022 * PW;
    cu.uLampGrow.value = tiles.length ? (plane.at(tiles[0].x + tiles[0].w, 0)[0] - plane.at(tiles[0].x, 0)[0]) / (6 * lampR) : 1;
    dive.current.tileCenters = tileCenters;
    dive.current.top = circuit.top * PW;
    lineMats.circuit.uniforms.uPW.value = PW;
    dive.current.shiftX = shiftX;
    material.uniforms.uSoma.value.set(pic.soma[0], pic.soma[1]);

    const cases = toN(tiles.length ? sampleTiles(tiles) : [[W / 2, H / 2]], rand);
    const cas = new Float32Array(N * 3);
    const from = new Float32Array(N * 3);
    const casesAt = CAM_AT[CASES] - CAM_Z;
    const pos = new Float32Array(N * 3);
    const ringA = new Float32Array(N * 4);
    const picA = new Float32Array(N * 3);
    const synEnd = new Float32Array(N * 3);
    const meta = new Float32Array(N * 4);
    const delay = new Float32Array(N);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const [wx, wy] = plane.at(word[i][0], word[i][1]);
      pos.set([wx, wy, 0], i * 3);
      let glyph = 0;
      if (role[i] >= 0) {
        const [th, ph, g, mid, at] = ring[role[i]];
        ringA.set([th, ph, mid, at], i * 4);
        glyph = g;
      } else {
        // the rest sit evenly on the sphere, unseen (Fibonacci)
        const y = 1 - (2 * (i + 0.5)) / N;
        const th = Math.PI / 2 + ((golden * i) % (Math.PI * 2));
        ringA.set([th, Math.asin(y) * 0.95, th, 0], i * 4);
      }
      // the picture: the first points carry the signals, the rest draw it
      let kind = 0, grow = 0;
      if (i < SIGNALS) {
        const [sx, sy, ex, ey, dl, k] = pic.signals[i];
        picA.set([sx, sy, 0], i * 3);
        synEnd.set([ex, ey, 0], i * 3);
        delay[i] = dl;
        kind = k;
        grow = 1;
      } else {
        const pp = pic.pts[Math.floor(((i - SIGNALS) * pic.pts.length) / (N - SIGNALS))];
        picA.set([pp[0], pp[1], pp[2]], i * 3);
        grow = pp[3];
        kind = pp[4];
      }
      const [cx, cy] = plane.at(cases[i][0], cases[i][1]);
      cas.set([cx, cy, casesAt], i * 3);
      // which case this point belongs to: it leaves that case's lamp
      const ti = Math.max(0, tiles.findIndex((t) => cases[i][0] >= t.x - 3 && cases[i][0] <= t.x + t.w + 3));
      const [fx, fy] = tiles.length ? plane.at(tiles[ti].x + tiles[ti].w / 2, tiles[ti].y + tiles[ti].h / 2) : [0, 0];
      from.set([fx, fy, casesAt], i * 3);
      meta.set([rand(), grow, glyph, kind], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRing', new THREE.BufferAttribute(ringA, 4));
    g.setAttribute('aPic', new THREE.BufferAttribute(picA, 3));
    g.setAttribute('aSynEnd', new THREE.BufferAttribute(synEnd, 3));
    g.setAttribute('aCases', new THREE.BufferAttribute(cas, 3));
    g.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
    g.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4));
    g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    return { points: g, circuit: lineGeometry(circuit.segs), tiles: tileSegs.length ? lineGeometry(tileSegs) : null };
  }, [ready, tiles, size.width, size.height, material, rayMat, atlas, sphere, lineMats]);

  useEffect(() => {
    material.uniforms.uProj.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    invalidate();
  }, [size.height, gl, material, invalidate]);

  useEffect(() => {
    roomBus.listeners.add(invalidate);
    return () => void roomBus.listeners.delete(invalidate);
  }, [invalidate]);
  useEffect(() => invalidate(), [geometry, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const u = material.uniforms.uBeat;
    const target = roomBus.beat;
    const beat = THREE.MathUtils.damp(u.value, target, 5, delta);
    const moving = Math.abs(beat - target) > 1e-4;
    u.value = moving ? beat : target;
    // the synapse's signals run on the scroll itself, through its hold
    const s = material.uniforms.uSynT;
    const synTarget = Math.min(1, Math.max(0, (roomBus.raw - SYNAPSE) / HOLD));
    const syn = THREE.MathUtils.damp(s.value, synTarget, 6, delta);
    const synMoving = Math.abs(syn - synTarget) > 1e-4;
    s.value = synMoving ? syn : synTarget;

    const form = smootherJs(u.value / 0.95);
    const open = smootherJs((u.value - 1.08) / 0.72);
    // the world alone runs on a clock: a very slow turn, the rays' breath and
    // the light along them, only while it is on screen
    const alive = roomBus.visible && u.value > 0.15 && u.value < 1.9;
    if (alive) {
      clock.current.time += dt;
      clock.current.spin += dt * SPIN * (1 - open);
    }
    material.uniforms.uTilt.value = tiltAt(u.value);
    material.uniforms.uYaw.value = 0.32 * (1 - smootherJs((u.value - 2.2) / 1.8));
    const flare = Math.sin(Math.PI * open);
    const settle = (0.5 * Math.sin(Math.PI * form) + 0.5 * form) * (1 - smootherJs((u.value - 1.7) / 0.25));
    glow.uniforms.uGlow.value = settle * (0.9 + 0.1 * Math.sin(clock.current.time * 0.7));
    glow.uniforms.uCore.value = 0.4 * flare;
    glowMesh.current?.scale.setScalar(1 + 2.5 * open);
    rayMat.uniforms.uGlow.value = settle * 2.4 * (1 + 0.8 * flare);
    rayMat.uniforms.uOpen.value = open;
    rayMat.uniforms.uTime.value = clock.current.time;
    clock.current.raw = THREE.MathUtils.damp(clock.current.raw, roomBus.raw, 6, delta);
    const raw = clock.current.raw;
    // the rays turn with the scroll as well as on their own
    // the reader's hand: followed softly, so a flick carries on a little
    clock.current.yaw = THREE.MathUtils.damp(clock.current.yaw, roomBus.dragYaw, 4, delta);
    clock.current.pitch = THREE.MathUtils.damp(clock.current.pitch, roomBus.dragPitch, 4, delta);
    rayMat.uniforms.uTurn.value = (1 - form) * 2.2 + clock.current.spin + raw * 0.45 + clock.current.yaw;
    material.uniforms.uSpin.value = clock.current.spin + raw * 0.45 + clock.current.yaw;
    material.uniforms.uPitch.value = clock.current.pitch;
    rayMat.uniforms.uPitch.value = clock.current.pitch;
    if (roomBus.visible) clock.current.t += dt;
    material.uniforms.uTime.value = clock.current.t;
    light.mat.uniforms.uTime.value = clock.current.t;
    material.uniforms.uRaw.value = raw;
    // the axon and the last wire reach for each other through the synapse's hold
    material.uniforms.uReach.value = smootherJs((raw - SYNAPSE + 0.6) / 1.1);
    rayMat.uniforms.uLight.value.copy(lightDir(form));

    // fly towards the paragraph in focus, straight ahead; the stars draw out
    // into trails as fast as the camera moves
    const z = camAt(u.value);
    const speed = Math.abs(z - clock.current.z) / Math.max(dt, 1e-3);
    clock.current.z = z;
    clock.current.speed = THREE.MathUtils.damp(clock.current.speed, speed, 8, delta);
    // a steady cruise inwards, faster while the camera itself travels
    clock.current.drift += dt * CRUISE;
    // the scroll itself flies too: within a paragraph's hold the camera stands,
    // but the stars still stream past as far as the reader scrolls
    const travel = clock.current.drift + raw * SCROLL_FLIGHT;
    const flight = Math.abs(travel - clock.current.travel) / Math.max(dt, 1e-3);
    clock.current.travel = travel;
    clock.current.flight = THREE.MathUtils.damp(clock.current.flight, flight, 6, delta);
    const trail = Math.min(4, (clock.current.speed + clock.current.flight) * 0.05);
    for (const m of [starMats.points, starMats.lines]) {
      m.uniforms.uCamZ.value = z;
      m.uniforms.uDrift.value = travel;
    }
    starMats.lines.uniforms.uTrail.value = trail;
    starMats.lines.uniforms.uLine.value = Math.min(0.7, trail * 0.35) + 0.0001;
    camera.position.set(0, 0, z);
    // the dive: the picture lies down and slides so the middle lamp is ahead;
    // the lamp wires stretch into roads; the view turns a little against the
    // clock and tips down, then rights itself as the cases arrive
    const dv = diveAt(u.value);
    const swing = Math.sin(Math.PI * dv);
    camera.rotation.set(-0.22 * swing, 0, -0.14 * swing);
    const shift = material.uniforms.uShift.value as THREE.Vector3;
    shift.set(dive.current.shiftX * dv, 0, 0);
    for (const m of [lineMats.circuit, lineMats.tiles]) {
      const lu = m.uniforms;
      lu.uTime.value = clock.current.t;
      lu.uRaw.value = raw;
    }
    {
      const lu = lineMats.circuit.uniforms;
      // the battery sits where the pad is in the picture, reaching for the axon
      const [apx, apy] = dive.current.pad;
      const pt = material.uniforms.uTilt.value as number, py2 = material.uniforms.uYaw.value as number;
      const reachX = 0;
      (lu.uAnchor.value as THREE.Vector3)
        .set(apx - reachX, apy * Math.cos(pt), -apy * Math.sin(pt))
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), py2)
        .add(material.uniforms.uPicAt.value)
        .add(shift);
      // the sheet faces the reader, and lies down only in the dive
      lu.uTilt.value = (Math.PI / 2) * smootherJs(dv / 0.35);
      // the roads lengthen only once the picture lies flat
      lu.uStretch.value = STRETCH * smootherJs((dv - 0.25) / 0.75);
      lu.uReach.value = material.uniforms.uReach.value;
      // drawn out from the source as the reader scrolls the closing
      // paragraph, then the lamps light
      lu.uDraw.value = smootherJs((raw - 3.5) / 0.75);
      // the switch closes; the first impulse runs from the source through it,
      // and each lamp lights as the impulse reaches it
      const closed = smootherJs((raw - 4.05) / 0.1);
      lu.uSwitch.value = 0.6 * (1 - closed);
      lu.uPower.value = smootherJs((raw - 4.12) / 0.06);
      const wave = raw < 4.12 ? -1 : 0.2 + (raw - 4.12) * 1.6;
      lu.uWave.value = wave;
      (lu.uLamps.value as THREE.Vector3).set(
        smootherJs((wave - 0.38) / 0.04),
        smootherJs((wave - 0.45) / 0.04),
        smootherJs((wave - 0.52) / 0.04),
      );
      // the sheet fits between the closing paragraph and the junction
      if (roomBus.textBottom > 0) {
        const anchor = lu.uAnchor.value as THREE.Vector3;
        const screen = anchor.clone().project(camera);
        const anchorPx = (1 - screen.y) * 0.5 * size.height;
        const dist = Math.max(0.5, camera.position.z - anchor.z);
        const pxPerUnit = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * dist);
        const need = dive.current.top * pxPerUnit;
        const fit = Math.min(1, Math.max(0.4, (anchorPx - roomBus.textBottom - 28) / Math.max(1, need)));
        dive.current.fit = THREE.MathUtils.damp(dive.current.fit, fit, 6, delta);
      }
      lu.uScale.value = dive.current.fit + (1 - dive.current.fit) * smootherJs(dv / 0.35);
      lu.uLampOn.value = 1;
      // the sheet fades as the lamps leave it; the lamps fade into their cases
      lu.uAlpha.value = 1 - smootherJs((u.value - 4.88) / 0.08);
    }
    // the lamps leave their roads: apart, growing, each to its case
    lineMats.circuit.uniforms.uLampOut.value = smootherJs((u.value - 4.6) / 0.2);
    {
      const lu = lineMats.tiles.uniforms;
      // the lamps' squares light where the lamps are, then grow into the cases
      lu.uDraw.value = smootherJs((u.value - 4.72) / 0.06) * 1.5;
      lu.uMorph.value = smootherJs((u.value - 4.76) / 0.12);
      lu.uAlpha.value = 1 - smootherJs((u.value - 4.9) / 0.07);
    }

    // where the light pours from: the world's middle while it shines, the
    // synapse's gap while the picture stands
    const b = u.value;
    const worldAmt = 0.35 * form * (1 - smootherJs((b - 1.08) / 0.2));
    const picAmt = 0.5 * smootherJs((b - 2.35) / 0.5) * (1 - smootherJs((b - 4.1) / 0.45));
    const lm = light.mat.uniforms;
    // a burst of light as the traces rise into the cases
    const casesAmt = 0.7 * Math.exp(-Math.pow((b - 4.9) / 0.04, 2)) * (1 - smootherJs((b - 4.95) / 0.03));
    lm.uAmt.value = worldAmt + picAmt + casesAmt;
    lm.uBeat.value = b;
    lm.uRaw.value = raw;
    const from = new THREE.Vector3();
    if (casesAmt > Math.max(picAmt, worldAmt)) {
      from.set(0, 0, CAM_AT[CASES] - CAM_Z);
      lm.uShafts.value = 0.7;
      lm.uFlash.value = 0;
    } else if (picAmt > worldAmt) {
      const { PH } = picSize.current;
      const tilt = tiltAt(b), yaw = material.uniforms.uYaw.value as number;
      const [, ly] = dive.current.pad;
      const local = new THREE.Vector3(0, ly * Math.cos(tilt), -ly * Math.sin(tilt)).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      from.copy(material.uniforms.uPicAt.value).add(shift).add(local);
      lm.uShafts.value = 1.0;
      // the source's red core, always there once the circuit is drawn, stronger
      // while signals cross
      const t = material.uniforms.uSynT.value as number;
      lm.uFlash.value = 0.55 * smootherJs((raw - 3.6) / 0.3) + 0.45 * smootherJs((t - 0.15) / 0.2) * (1 - smootherJs((t - 0.85) / 0.15));
    } else {
      from.copy(sphere.at);
      lm.uShafts.value = 0.8;
      lm.uFlash.value = 0;
    }
    camera.updateMatrixWorld();
    from.project(camera);
    lm.uFrom.value.set(from.x * 0.5 + 0.5, from.y * 0.5 + 0.5);

    // the frame, then (while there is light to scatter) its light over it
    gl.setRenderTarget(null);
    gl.render(scene, camera);
    if (lm.uAmt.value > 0.002) {
      gl.setRenderTarget(light.target);
      gl.clear();
      gl.render(scene, camera);
      // blur it wide: across, down, and once more twice as far
      const [a, b2] = light.soft;
      const bu = light.blur.uniforms;
      const pass = (src: THREE.Texture, dst: THREE.WebGLRenderTarget, x: number, y: number) => {
        bu.tSrc.value = src;
        bu.uDir.value.set(x / dst.width, y / dst.height);
        gl.setRenderTarget(dst);
        gl.render(light.blurScene, light.cam);
      };
      // small steps, three rounds: wide and smooth, never a cross of samples
      pass(light.target.texture, a, 1, 0);
      pass(a.texture, b2, 0, 1);
      pass(b2.texture, a, 1.6, 0);
      pass(a.texture, b2, 0, 1.6);
      pass(b2.texture, a, 2.2, 0);
      pass(a.texture, b2, 0, 2.2);
      light.mat.uniforms.tSoft.value = b2.texture;
      gl.setRenderTarget(null);
      const auto = gl.autoClear;
      gl.autoClear = false;
      gl.render(light.overlay, light.cam);
      gl.autoClear = auto;
    }
    // the flight never stops while the room is on screen
    if (roomBus.visible) invalidate();
  }, 1);

  if (!geometry) return null;
  return (
    <>
      <points geometry={stars.points} material={starMats.points} frustumCulled={false} />
      <lineSegments geometry={stars.lines} material={starMats.lines} frustumCulled={false} />
      <mesh ref={glowMesh} position={[sphere.at.x, sphere.at.y, sphere.at.z - 0.05]} material={glow} frustumCulled={false}>
        <planeGeometry args={[sphere.radius * 6, sphere.radius * 6]} />
      </mesh>
      <mesh geometry={rays} material={rayMat} frustumCulled={false} />
      <mesh geometry={geometry.circuit} material={lineMats.circuit} frustumCulled={false} />
      <points geometry={geometry.points} material={material} frustumCulled={false} />
    </>
  );
}

export default function StatementScene() {
  // shown only while the room is on screen
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(roomBus.visible);
    roomBus.listeners.add(sync);
    sync();
    return () => void roomBus.listeners.delete(sync);
  }, []);
  return (
    <div
      className="pointer-events-none fixed inset-0 transition-opacity duration-500"
      style={{ opacity: on ? 1 : 0 }}
      aria-hidden="true"
    >
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, CAM_AT[0]], fov: FOV, near: 0.1, far: 120 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Story />
      </Canvas>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
