// ─────────────────────────────────────────────────────────────────────────
// Case dive renderer (#119), ported from drafts/case-dive. A click throws a
// red projector beam from the launching control onto a wall; the camera
// travels along the beam into the projected image, which resolves in the
// case's dialect (crt / dither / ascii) and fills the frame as the case hero.
//
// Everything is a pure function of one progress value p (0 page, 1 hero), so
// Back plays the exact same frames in reverse. Raw WebGL2 on a short-lived
// canvas that exists only during the dive. Screen coordinates are device px,
// origin top-left; world units are device px too, the camera looks down +z.
//
// Changes from the draft for the real app: the canvas is transparent and
// never veils the page, so the dive happens inside the live site (spec 2,
// "one seamless universe"): the beam grows out of the real node, the wall
// materialises out of its light with feathered, dithered edges, only dust
// lit by the beam is drawn over the real star field, and the card rises out
// of the pattern as it dissolves cell by cell (`dissolve`). One key frame
// per dive, loaded on demand.
// ─────────────────────────────────────────────────────────────────────────

import type { Dialect } from '@/lib/diveBus';

const RAMP = ' .:-=+*#%@'; // ASCII density ramp, dark → bright
export const DUR_IN = 1700; // ms, full dive
export const DUR_OUT = 1400; // ms, full return

// ── timing helpers ────────────────────────────────────────────────────────
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeInOutQuart = (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2);

// The shared beat of the dive, independent of dialect. Nothing switches on:
// every term eases in, and the page stays visible underneath throughout.
//  0.00-0.18  the beam throws out of the node, its light front travelling to the wall
//  0.02-0.20  a soft vignette (<= 35 %) gathers around the beam path
//  0.07-0.48  the wall grows out of the beam's hotspot
//  0.10-0.84  dolly: the camera pushes along the beam until the wall fills the frame
//  0.14-0.98  the projected surface speaks its dialect
//  0.22-0.90  the beam thins out, we are inside the image
//  0.70-0.97  the wall's feathered edge hardens, so p = 1 covers the frame exactly
function beat(p: number) {
  const lamp = smooth(0.0, 0.14, p);
  return {
    lamp,
    // how far along the beam its light has travelled, 0 lens .. 1 wall (overshoots so the front clears it)
    throw: 1.15 * easeOutCubic(clamp01(p / 0.18)),
    grow: smooth(0.07, 0.48, p),
    feather: 0.55 * (1 - smooth(0.7, 0.97, p)),
    vignette: 0.3 * smooth(0.02, 0.2, p) * (1 - smooth(0.7, 0.98, p)),
    // seen from inside the beam the haze would veil the wall, so it thins as we dive
    beam: lamp * (1 - 0.5 * smooth(0.22, 0.5, p)) * (1 - smooth(0.55, 0.9, p)),
    lens: lamp * (1 - smooth(0.16, 0.42, p)),
    stars: 1 - smooth(0.7, 0.95, p),
    dollyZ: easeInOutQuart(clamp01((p - 0.1) / 0.74)),
    dollyXY: easeInOutCubic(clamp01((p - 0.06) / 0.74)), // leads, so the camera swings onto the beam axis
  };
}
type Beat = ReturnType<typeof beat>;

// Dialect schedules, ported from drafts/stage-door and re-timed to the dolly.
type Sched = Partial<Record<
  'ditherIn' | 'resolve' | 'typeIn' | 'handover' | 'lineGlow' | 'aperture' | 'edgeGlow' | 'scanline' | 'chroma' | 'curve' | 'exposure',
  number
>>;
const DIALECTS: Record<Dialect, { id: number; at: (p: number) => Sched }> = {
  dither: {
    id: 1,
    at: (p) => ({
      ditherIn: smooth(0.14, 0.6, p), // 1-bit cells laid on the lit wall, a long eased ramp
      resolve: clamp01((p - 0.5) / 0.48), // 1-bit → full image, radiating from the hotspot
    }),
  },
  ascii: {
    id: 2,
    at: (p) => ({
      typeIn: smooth(0.14, 0.6, p), // glyphs print outward from the hotspot, rising through the ramp
      handover: clamp01((p - 0.62) / 0.36), // bright cells burn through to the photograph
    }),
  },
  crt: {
    id: 3,
    at: (p) => {
      const open = clamp01((p - 0.5) / 0.36);
      // projector shutter: fast open with a small mechanical flutter
      const shutter = open >= 1 ? 1 : Math.max(0, easeOutCubic(open) + 0.05 * Math.sin(open * 28) * (1 - open));
      return {
        lineGlow: smooth(0.16, 0.44, p) * (1 - smooth(0.52, 0.72, p)), // the line blooms in slowly
        aperture: shutter,
        edgeGlow: smooth(0.48, 0.56, p) * (1 - smooth(0.75, 0.95, p)),
        scanline: 1 - smooth(0.66, 1, p),
        chroma: (1 - smooth(0.52, 1, p)) * 7,
        curve: (1 - smooth(0.55, 1, p)) * 0.22,
        exposure: 1 + 1.4 * (1 - smooth(0.5, 0.86, p)),
      };
    },
  },
};

// ── shaders ───────────────────────────────────────────────────────────────
const COMMON = `
const vec3 VOID = vec3(0.0196);
const vec3 RED = vec3(0.804, 0.0, 0.0);
const vec3 RED_TEXT = vec3(1.0, 0.102, 0.102);
const vec3 OFF_WHITE = vec3(0.949, 0.937, 0.914);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// Ordered (Bayer) thresholds, recursive 2x2 -> 8x8, values in [0, 1)
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

// The landing dissolve: the pattern breaks up cell by cell as a threshold
// rises, nearest the hotspot first, in ordered (Bayer) order within that
// wave, so the card underneath shows through the gaps. Each cell fades out
// over a short band instead of blinking. Returns how much of the cell stays.
//   p: pixel, device px (top-left); grid0: where the cell grid is anchored;
//   cell: cell size, device px; hot: hotspot; dissolve: 0 whole .. 1 gone
float dissolveKeep(vec2 p, vec2 grid0, vec2 cell, vec2 hot, vec2 res, float dissolve) {
  if (dissolve <= 0.0) return 1.0;
  vec2 q = floor((p - grid0) / cell);
  vec2 centre = grid0 + (q + 0.5) * cell;
  float radial = clamp(distance(centre, hot) / (0.5 * length(res)), 0.0, 1.0);
  float threshold = 0.55 * bayer8(q) + 0.45 * radial;   // 0 .. ~1
  return 1.0 - smoothstep(threshold, threshold + 0.12, dissolve * 1.15);
}
`;

// Dust: motes live in 3D between the camera and the wall. Only the ones
// inside the beam volume are drawn, catching the light like dust in a
// projector; everywhere else the site's real star field shows through, so
// there is one sky, not two. At p = 0 each mote projects onto its home
// pixel; once the camera moves they part around it with true parallax.
const STAR_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aField;   // home position on screen, device px
layout(location = 1) in vec4 aStar;    // x nearness 0..1, y size css px, z seed, w unused
layout(location = 2) in vec3 aColor;

uniform vec2  uCentre;      // principal point, device px
uniform float uFocal;       // focal length, device px
uniform vec3  uCam;         // camera position, world
uniform float uWallZ;       // depth of the projection wall
uniform float uDpr;
uniform vec4  uPlanes[6];   // beam volume: inside where dot(n, x) + w >= 0
uniform float uSoft;        // world units over which a mote fades in at the beam's edge
uniform float uBeam;        // beam strength, lights the motes inside it
uniform float uStarAlpha;

out vec3 vColor;
out float vAlpha;

const vec3 OFF_WHITE = vec3(0.949, 0.937, 0.914);
const vec3 HOT = vec3(1.0, 0.55, 0.5);

void main() {
  // near motes sit just past the camera, far ones by the wall
  float z = mix(1.8, 0.2, aStar.x) * uWallZ;
  vec3 world = vec3((aField - uCentre) * z / uFocal, z);
  vec3 rel = world - uCam;

  // how deep inside the beam this mote sits: a soft edge, so motes drift
  // into the light instead of blinking on as the camera moves
  float inside = 1.0;
  for (int i = 0; i < 6; i++) inside *= smoothstep(0.0, uSoft, dot(uPlanes[i].xyz, world) + uPlanes[i].w);
  float lit = inside * uBeam;

  float near = 0.03 * uWallZ;
  if (rel.z < near || lit <= 0.001) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 0.0; vAlpha = 0.0; vColor = vec3(0.0); return; }

  vec2 screen = uCentre + rel.xy * uFocal / rel.z;
  float grow = z / rel.z;                       // 1 at rest, larger as we approach
  float size = aStar.y * uDpr * min(grow, 2.5);
  float alpha = (0.55 + 0.45 * aStar.x) * smoothstep(near, 3.0 * near, rel.z) * lit * 2.4;

  vec2 clip = screen / vec2(uCentre * 2.0) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(size, 1.0);
  vColor = mix(aColor, mix(HOT, OFF_WHITE, aStar.z), 0.85);   // the site's palette, warmed by the lamp
  vAlpha = alpha * uStarAlpha;
}`;

const STAR_FS = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vAlpha;
out vec4 fragColor;
void main() {
  // soft cone like the site's star sprite
  float disc = 1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5));
  float a = disc * vAlpha * 0.8;
  fragColor = vec4(vColor * a, a);   // additive (ONE, ONE)
}`;

const QUAD_VS = `#version 300 es
// one oversized triangle covers the screen, no buffers needed
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// The wall: bare projector light, then the case's dialect on top of it.
// uHeroRect is the projected rect, which grows every frame of the dolly.
const WALL_FS = `#version 300 es
precision highp float;
${COMMON}
uniform vec2  uResolution;
uniform float uDpr;
uniform float uTime;         // seconds since the transition started
uniform int   uVariant;      // 1 dither, 2 ascii, 3 crt
uniform vec4  uHeroRect;     // projected wall: x, y, w, h (device px, top-left)
uniform sampler2D uImage;    // project key frame
uniform float uImageAspect;
uniform float uTexelPerPx;   // image texels per device px on the wall (mip choice)
uniform vec2  uOrigin;       // projector hotspot, device px
uniform float uLamp;         // 0 dark wall, 1 lamp fully on
uniform float uUnit;         // device px per css px of the projected image (grows as we dive)
uniform float uGrow;         // 0..1 how far the wall has grown out of the hotspot
uniform float uFeather;      // edge softness, share of the shorter half side; 0 = hard (frame filled)
uniform float uVignette;     // darkness around the beam path, 0..0.3
uniform vec2  uLensPt;       // lens on screen (or the hotspot once it is behind us), device px
uniform float uDissolve;     // landing dissolve, 0 whole .. 1 gone
uniform vec2  uDissolveCell; // dissolve cell, device px

// 1 - dither
uniform float uDitherIn;     // share of 1-bit cells already deposited
uniform float uResolve;      // 0 = 1-bit red/void, 1 = full image

// 2 - ascii
uniform sampler2D uGlyphs;   // density ramp atlas, one glyph per column
uniform float uGlyphCount;
uniform vec2  uCell;         // character cell, device px (scaled with the wall)
uniform float uTypeIn;       // glyph printout progress
uniform float uHandover;     // glyph -> photograph progress

// 3 - crt
uniform float uLineGlow;     // power line intensity
uniform float uAperture;     // 0 closed slit, 1 frame fully open
uniform float uEdgeGlow;     // hot shutter-blade edges
uniform float uScanline;     // scanline + noise strength
uniform float uChroma;       // RGB split, css px
uniform float uCurve;        // barrel distortion of the tube
uniform float uExposure;     // overexposure flash as the gate opens

out vec4 fragColor;          // premultiplied alpha

bool inHero(vec2 hp) { return all(greaterThanEqual(hp, vec2(0.0))) && all(lessThan(hp, uHeroRect.zw)); }

// wall uv (0..1) -> image uv with a "cover" crop
vec2 coverUV(vec2 h) {
  float rectAspect = uHeroRect.z / uHeroRect.w;
  if (rectAspect > uImageAspect) h.y = 0.5 + (h.y - 0.5) * uImageAspect / rectAspect;
  else h.x = 0.5 + (h.x - 0.5) * rectAspect / uImageAspect;
  return h;
}
// explicit lod: a cell samples the mip that averages its whole area
vec3 imageAt(vec2 frameUV, float cellPx) {
  float lod = log2(max(cellPx * uTexelPerPx, 1.0));
  return textureLod(uImage, coverUV(frameUV), lod).rgb;
}

// -- the wall's shape: how much of it has materialised at this pixel --
// The wall is made of the beam's light, so it has no hard edge: it grows as
// a soft disc out of the hotspot (the wall centre) and is feathered towards
// its rect edges. The feather hardens only once the wall fills the frame.
float wallForm(vec2 p) {
  vec2 halfSize = 0.5 * uHeroRect.zw;
  vec2 h = (p - uHeroRect.xy - halfSize) / halfSize;                     // -1..1 across the wall
  // feather in px is the same on both axes: a fraction of the shorter half side
  vec2 fe = max(vec2(uFeather * min(halfSize.x, halfSize.y)) / halfSize, vec2(1e-4));
  vec2 e = 1.0 - smoothstep(1.0 - fe, vec2(1.0), abs(h));
  // growth: the disc's rim is half a radius soft, so it swells rather than wipes
  float r = length(h) * 0.7071;                                          // 0 centre .. 1 corners
  float R = uGrow * 1.5;
  return e.x * e.y * (1.0 - smoothstep(R - 0.5, R, r));
}

// -- 1 - dither: the image arrives as 1-bit red/void cells, then refines --
vec4 dither(vec2 p, float form) {
  vec2 hp = p - uHeroRect.xy;
  if (!inHero(hp)) return vec4(0.0);

  // Deposit: 6 css px cells, fixed to the image so they magnify as the
  // camera dives in. A cell appears once the local density (build-up times
  // the wall's form) passes its ordered threshold, and fades in over a short
  // band, so the pattern thickens out of the hotspot with no full-cell pop.
  vec2 base = floor(hp / (6.0 * uUnit));
  float threshold = bayer8(base) * 0.86;
  float cellA = smoothstep(threshold, threshold + 0.12, uDitherIn * form);
  if (cellA <= 0.0) return vec4(0.0);

  // resolution arrives as a wave from the hotspot in four stages
  float spread = 0.9;
  float d = distance(p, uOrigin) / length(uResolution);
  float stage = clamp(uResolve * (1.0 + spread) - d * spread, 0.0, 1.0) * 4.0;
  // the next, finer stage takes over pixel by pixel across the last 40 % of
  // each band (ordered dissolve), instead of every cell switching at once
  float k = floor(stage) + step(bayer8(floor(hp / max(uUnit, 1.0))) + 0.01, smoothstep(0.6, 1.0, fract(stage)));
  if (k >= 4.0) return vec4(imageAt(hp / uHeroRect.zw, 1.0), 1.0) * cellA;

  float cellCss   = k < 0.5 ? 6.0 : k < 1.5 ? 4.0 : k < 2.5 ? 2.0 : 1.0;
  float levels    = k < 0.5 ? 2.0 : k < 1.5 ? 3.0 : k < 2.5 ? 4.0 : 8.0;
  float colourMix = k < 1.5 ? 0.0 : k < 2.5 ? 0.55 : 1.0;

  float cellPx = max(cellCss * uUnit, 1.0);
  vec2 q = floor(hp / cellPx);
  vec3 src = imageAt((q + 0.5) * cellPx / uHeroRect.zw, cellPx);
  float bt = bayer8(q) + 0.5 / 64.0;
  float L = levels - 1.0;

  float v = floor(smoothstep(0.04, 0.9, luma(src)) * L + bt) / L;
  // stage 0 is strictly red on void; later stages add an off-white top stop
  vec3 duo = k < 0.5 ? mix(VOID, RED, v)
           : v < 0.5 ? mix(VOID, RED, v * 2.0) : mix(RED, OFF_WHITE, v * 2.0 - 1.0);
  vec3 full = floor(src * L + bt) / L;
  return vec4(mix(duo, full, colourMix), 1.0) * cellA;   // premultiplied
}

// -- 2 - ascii: a printout of the image, then the photograph burns through --
vec4 ascii(vec2 p, float form) {
  vec2 hp = p - uHeroRect.xy;
  if (!inHero(hp)) return vec4(0.0);

  vec2 g = floor(hp / uCell);       // which character cell
  vec2 local = fract(hp / uCell);   // where inside it
  vec2 cellCentre = (g + 0.5) * uCell;
  float lum = smoothstep(0.03, 0.85, luma(imageAt(cellCentre / uHeroRect.zw, max(uCell.x, uCell.y))));
  float h = hash12(g);

  // the printout spreads out of the hotspot with a ragged edge
  float radial = clamp(distance(uHeroRect.xy + cellCentre, uOrigin) / (0.5 * length(uHeroRect.zw)), 0.0, 1.0);
  float order = radial * 0.7 + h * 0.3;
  float typed = clamp((uTypeIn * 1.3 - order) / 0.3, 0.0, 1.0);
  // each glyph rises through the density ramp (' ' . : - = ...) to its own
  // brightness; towards the feathered edge it stops early, on thin glyphs
  float rise = typed * smoothstep(0.05, 0.7, form);
  if (rise <= 0.0) return vec4(0.0);

  float glyph = min(floor(lum * rise * uGlyphCount), uGlyphCount - 1.0);
  float ink = texture(uGlyphs, vec2((glyph + local.x) / uGlyphCount, local.y)).r;
  vec3 inkColour = lum > 0.8 ? OFF_WHITE : RED_TEXT;
  vec3 col = mix(VOID, inkColour, ink);

  // bright cells burn through first: a red cursor block eases in, then the
  // photograph eases out of it
  float swapAt = 1.0 - (lum * 0.6 + h * 0.4);
  float burn = (uHandover * 1.15 - swapAt) / 0.15;
  float solid = 0.0;   // 1 once the cell burns: cursor block and photograph are opaque
  if (burn > 0.0) {
    vec3 photo = imageAt(hp / uHeroRect.zw, 1.0);
    solid = smoothstep(0.0, 0.2, burn);
    col = mix(mix(col, RED, solid), photo, smoothstep(0.2, 0.6, burn));
  }
  // ink is solid, the void between glyphs only half: the live page keeps
  // glowing through the printout instead of a dark slab forming behind it
  float a = rise * max(mix(0.5, 1.0, ink), solid);
  return vec4(col * a, a);   // premultiplied: the cell fades in with its glyph
}

// -- 3 - crt: a power line across the wall opens like a stage door --
vec4 crt(vec2 p, float form) {
  vec2 centre = uHeroRect.xy + 0.5 * uHeroRect.zw;
  float dy = p.y - centre.y;
  // the line grows out of the hotspot along the wall's feathered width
  float lineForm = wallForm(vec2(p.x, centre.y));

  vec3 col = vec3(0.0);
  float a = 0.0;
  float halfOpen = uAperture * 0.5 * uHeroRect.w;
  vec2 hp = p - uHeroRect.xy;

  if (inHero(hp) && abs(dy) <= halfOpen + 0.5) {
    // the gate: the frame seen through a warm tube that is still settling
    vec2 h = hp / uHeroRect.zw;
    vec2 cc = h - 0.5;
    cc *= 1.0 + uCurve * dot(cc, cc);
    h = cc + 0.5;
    if (all(greaterThanEqual(h, vec2(0.0))) && all(lessThanEqual(h, vec2(1.0)))) {
      vec2 shift = vec2(uChroma * uDpr / uHeroRect.z, 0.0);
      vec3 rgb = vec3(imageAt(h + shift, 1.0).r, imageAt(h, 1.0).g, imageAt(h - shift, 1.0).b);
      rgb *= uExposure;
      float scan = 0.5 + 0.5 * cos(p.y * 3.14159265 / (1.5 * uDpr));   // 3 css px pitch
      rgb *= 1.0 - uScanline * 0.6 * scan;
      rgb += uScanline * 0.08 * (hash12(vec2(floor(p.y / (2.0 * uDpr)), floor(uTime * 50.0))) - 0.5);
      col = rgb;
    }
    // bent-away corners stay black glass; towards the wall's edge the glass
    // thins out in 1-bit ordered dither, the house texture
    a = step(bayer4(p / max(uDpr, 1.0)) + 0.03, form);
    col *= a;
  }

  // shutter blades: a hot red edge rides each side of the opening gate
  float edge = abs(abs(dy) - halfOpen);
  float blade = exp(-edge * edge / (2.0 * pow(5.0 * uDpr, 2.0))) * uEdgeGlow * lineForm;

  // the power line: white-hot core, red halo that blooms wider as it eases in
  float flicker = 0.85 + 0.15 * hash12(vec2(floor(uTime * 40.0), 7.0));
  float core = exp(-dy * dy / (2.0 * pow(1.2 * uDpr, 2.0)));
  float bloom = mix(5.0, 16.0, uLineGlow) * uDpr;
  float halo = exp(-dy * dy / (2.0 * bloom * bloom));
  vec3 glow = (OFF_WHITE * core * uLineGlow + RED * halo * 0.9) * uLineGlow * flicker * lineForm + RED * blade;

  col += glow;
  a = max(a, clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0));
  return vec4(col, a);
}

// distance from p to the segment a-b, device px
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
  return length(p - a - ab * t);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  float form = wallForm(p);
  vec4 d = uVariant == 1 ? dither(p, form) : uVariant == 2 ? ascii(p, form) : crt(p, form);

  // Bare projector light on the wall: a red hotspot falling off to the
  // corners, shaped by the form, then quantised into ordered-dither steps so
  // the feathered edge reads as a thinning dither density, not a blur.
  // Its alpha equals its brightness: light added onto the live page, which
  // keeps showing through.
  vec2 h = (p - uHeroRect.xy - 0.5 * uHeroRect.zw) / (0.5 * uHeroRect.zw);
  float hot = 1.0 - 0.45 * min(dot(h, h), 2.0);
  float light = 0.34 * hot * form * uLamp;
  light = floor(light * 7.0 + bayer4(p / max(uDpr, 1.0))) / 7.0;
  vec4 lit = vec4(RED * light, light);
  vec4 wall = d + lit * (1.0 - d.a);   // dialect over the light (premultiplied)

  // a soft vignette, darkest away from the beam path, so the beam reads
  // without a veil over the page; it never exceeds 35 % (uVignette <= 0.3)
  float vd = segDist(p, uLensPt, uOrigin) / length(uResolution);
  float va = uVignette * smoothstep(0.05, 0.55, vd) * (1.0 - uDissolve);
  wall += vec4(VOID * va, va) * (1.0 - wall.a);

  // landing: the pattern dissolves cell by cell over the card
  fragColor = wall * dissolveKeep(p, uHeroRect.xy, uDissolveCell, uOrigin, uResolution, uDissolve);
}
`;

// The beam: a volumetric light pyramid from the lens to the wall rect.
// Each pixel clips its view ray against the six planes of the pyramid and
// integrates the scattered light along the inside segment. Rendered at half
// resolution and upscaled with nearest sampling: the dither stays crisp.
const BEAM_FS = `#version 300 es
precision highp float;
${COMMON}
uniform vec2  uResolution;   // full canvas, device px
uniform float uScale;        // full-res px per beam-buffer px
uniform vec2  uCentre;       // principal point, device px
uniform float uFocal;        // focal length, device px
uniform vec3  uCam;          // camera position, world
uniform vec3  uApex;         // projector lens, world
uniform vec3  uWallCentre;   // centre of the projected rect, world
uniform vec2  uWallHalf;     // half size of the projected rect, world
uniform vec4  uPlanes[6];    // inside where dot(n, x) + w >= 0
uniform float uBeam;         // lamp strength along the beam
uniform float uThrow;        // the light's front, 0 lens .. 1 wall: the beam grows out of the node
uniform vec2  uLens;         // lens on screen, device px
uniform float uLensGlow;     // lens glare, 0 once the lens is behind us
uniform float uDpr;
out vec4 fragColor;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
// smooth value noise: 3D for haze billows, 2D for streaks along the rays
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
                 mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
                 mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float noise2(vec2 x) {
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x * uScale, uResolution.y - gl_FragCoord.y * uScale);
  vec3 dir = normalize(vec3((p - uCentre) / uFocal, 1.0));

  // 1. clip the view ray against the pyramid (a convex volume of 6 planes)
  float t0 = 0.0, t1 = 1e7;
  for (int i = 0; i < 6; i++) {
    float a = dot(uPlanes[i].xyz, uCam) + uPlanes[i].w;   // >= 0: camera on the inside
    float b = dot(uPlanes[i].xyz, dir);
    if (abs(b) < 1e-6) { if (a < 0.0) t1 = -1.0; }
    else if (b > 0.0) t0 = max(t0, -a / b);              // entering
    else t1 = min(t1, -a / b);                           // leaving
  }

  float light = 0.0;
  if (t1 > t0 && uBeam > 0.0) {
    // 2. march the inside segment; the start is jittered by a Bayer value,
    //    so sampling bands turn into the same ordered dither as the wall
    float L = uWallCentre.z - uApex.z;                   // throw distance
    vec2 axisSlope = (uWallCentre.xy - uApex.xy) / L;
    const int N = 8;
    float dt = (t1 - t0) / float(N);
    float jitter = bayer4(gl_FragCoord.xy);
    float hazeFreq = 2.2 / min(uWallHalf.x, uWallHalf.y);
    for (int k = 0; k < N; k++) {
      vec3 x = uCam + dir * (t0 + (float(k) + jitter) * dt);
      float along = clamp((x.z - uApex.z) / L, 0.0, 1.0);         // 0 lens .. 1 wall
      // position across the beam, -1..1 at every depth (projector uv)
      vec2 uv = ((x.xy - uApex.xy) / max(x.z - uApex.z, 1e-3) - axisSlope) * L / uWallHalf;
      float blade = 1.0 - smoothstep(0.8, 1.0, max(abs(uv.x), abs(uv.y)));   // soft gate edges
      float hot = 1.0 - 0.35 * dot(uv, uv);                                   // lamp hotspot
      float streak = 0.35 + 1.3 * pow(noise2(uv * 7.0 + 3.1), 2.0);           // shafts fanning from the lens
      float haze = 0.45 + 1.1 * noise3(x * hazeFreq);                         // smoke the camera flies through
      float front = 1.0 - smoothstep(uThrow - 0.15, uThrow, along);           // soft leading edge of the throw
      // the same light spreads over a growing cross-section: density ~ 1/along^2
      light += blade * hot * streak * haze * front / (0.035 + along * along) * dt;
    }
    light *= uBeam * 0.32 / L;
  }

  // 3. lens glare while the lens is still in front of us: core + anamorphic streak
  vec2 dl = (p - uLens) / uDpr;
  float glare = uLensGlow * (1.4 * exp(-dot(dl, dl) / (2.0 * 10.0 * 10.0))
                            + 0.25 * exp(-length(dl) / 70.0)
                            + 0.35 * exp(-abs(dl.y) / 1.5) * exp(-abs(dl.x) / 260.0));

  float I = light + glare;
  vec3 col = RED * min(I, 1.1) + OFF_WHITE * smoothstep(0.85, 2.2, I) * 0.85;
  // ordered-dither quantisation: a projector beam in the site's pixel dialect
  col = floor(col * 9.0 + bayer4(gl_FragCoord.xy)) / 9.0;
  fragColor = vec4(col, 1.0);
}
`;

// Additive blit of the half-res beam buffer, nearest texel. The canvas is
// transparent, so light also adds coverage: brightness becomes alpha. At
// landing the beam dissolves on the same cell grid as the wall.
const BLIT_FS = `#version 300 es
precision highp float;
${COMMON}
uniform sampler2D uTex;
uniform float uScale;
uniform vec2  uResolution;
uniform vec4  uHeroRect;
uniform vec2  uOrigin;
uniform vec2  uDissolveCell;
uniform float uDissolve;
out vec4 fragColor;
void main() {
  vec3 c = texelFetch(uTex, ivec2(gl_FragCoord.xy / uScale), 0).rgb;
  vec2 p = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  c *= dissolveKeep(p, uHeroRect.xy, uDissolveCell, uOrigin, uResolution, uDissolve);
  fragColor = vec4(c, max(c.r, max(c.g, c.b)));
}
`;

// ── the renderer ──────────────────────────────────────────────────────────
type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// same palette and size spread as ParticleField
const STAR_COLOURS = [[0.95, 0.93, 0.9], [0.784, 0.063, 0.18], [0.5, 0.03, 0.09]];
const BEAM_SCALE = 2; // beam buffer is half resolution
const ASCII_CELL = [10, 15]; // css px, one character at full dive

export interface DiveRenderer {
  /** Aim the projector from this client css point (viewport centre if null). */
  aim(origin: { x: number; y: number } | null): void;
  /** p: dive progress 0 page .. 1 hero; dissolve: landing dissolve 0 whole .. 1 gone */
  render(p: number, dissolve?: number): void;
  dispose(): void;
}

export function createDiveRenderer(canvas: HTMLCanvasElement, dialect: Dialect, imageUrl?: string): DiveRenderer | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const program = (vs: string, fs: string): Prog => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    // cache uniform locations by name (arrays as "name[0]" → "name")
    const u: Prog['u'] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i)!.name;
      u[name.replace('[0]', '')] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  };

  let starProg: Prog, wallProg: Prog, beamProg: Prog, blitProg: Prog;
  try {
    starProg = program(STAR_VS, STAR_FS);
    wallProg = program(QUAD_VS, WALL_FS);
    beamProg = program(QUAD_VS, BEAM_FS);
    blitProg = program(QUAD_VS, BLIT_FS);
  } catch (err) {
    console.warn('[dive] shader setup failed, falling back', err);
    return null;
  }
  const quadVAO = gl.createVertexArray();
  const D = DIALECTS[dialect];

  // ── canvas size ──
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(window.innerWidth * dpr);
  const H = Math.round(window.innerHeight * dpr);
  canvas.width = W;
  canvas.height = H;

  // ── textures ──
  const makeTexture = (src: TexImageSource | null) => {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([5, 5, 5, 255]));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  // key frame: a void texel until the webp decodes (usually cached already)
  let image = { tex: makeTexture(null), w: 16, h: 9 };
  let disposed = false;
  if (imageUrl) {
    const img = new Image();
    img.src = imageUrl;
    img
      .decode()
      .then(() => {
        if (disposed) return;
        gl.deleteTexture(image.tex);
        image = { tex: makeTexture(img), w: img.naturalWidth, h: img.naturalHeight };
      })
      .catch(() => undefined);
  }
  // glyph atlas for the ascii dialect, in the site's pixel face
  let glyphTex: WebGLTexture | null = null;
  if (dialect === 'ascii') {
    const gw = 32, gh = 48;
    const c = document.createElement('canvas');
    c.width = gw * RAMP.length;
    c.height = gh;
    const g = c.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.font = "40px 'Geist Pixel', ui-monospace, monospace";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < RAMP.length; i++) g.fillText(RAMP[i], i * gw + gw / 2, gh / 2 + 2);
    glyphTex = makeTexture(c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  // ── dust: seeded once per dive ──
  const starCount = Math.round(Math.min(3200, Math.max(900, (window.innerWidth * window.innerHeight) / 520)));
  const field = new Float32Array(starCount * 2);
  const star = new Float32Array(starCount * 4);
  const colour = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    field[i * 2] = Math.random() * W;
    field[i * 2 + 1] = Math.random() * H;
    star[i * 4] = Math.random(); // nearness
    star[i * 4 + 1] = 1.2 + Math.random() * 2.6; // size, css px
    star[i * 4 + 2] = Math.random(); // seed
    const r = Math.random();
    colour.set(STAR_COLOURS[r < 0.4 ? 0 : r < 0.7 ? 1 : 2], i * 3);
  }
  const starVAO = gl.createVertexArray();
  const buffers = [field, star, colour].map((data, loc) => {
    const buf = gl.createBuffer()!;
    gl.bindVertexArray(starVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, [2, 4, 3][loc], gl.FLOAT, false, 0, 0);
    return buf;
  });
  gl.bindVertexArray(null);

  // ── half-res beam buffer ──
  const BW = Math.ceil(W / BEAM_SCALE), BH = Math.ceil(H / BEAM_SCALE);
  const beamTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, beamTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, BW, BH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const beamFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, beamFBO);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, beamTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // ── the projection rig ──
  // Built from the launching control. At rest the wall shows as a small
  // rect, offset away from the lens so the throw is visible; its aspect is
  // the viewport's, so at the end of the dolly it fills the frame exactly.
  const buildGeo = (origin: { x: number; y: number } | null) => {
    const c: [number, number] = [W / 2, H / 2];
    const f = Math.hypot(W, H) * 0.62;
    const Dw = f * 2.2; // wall depth
    const Da = Dw * 0.28; // lens depth: the projector sits in front of the camera's path
    const A = origin ? [origin.x * dpr, origin.y * dpr] : c;
    const phone = window.innerWidth <= 640;
    const w0 = W * (phone ? 0.6 : 0.38), h0 = (w0 * H) / W;
    const m = 16 * dpr;
    const header = document.querySelector('header');
    const top = ((header ? header.getBoundingClientRect().bottom : 0) + 12) * dpr;
    const fit = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    const cx = fit(c[0] - (A[0] - c[0]) * 0.4, m + w0 / 2, W - m - w0 / 2);
    const cy = fit(c[1] - (A[1] - c[1]) * 0.4, top + h0 / 2, H - m - h0 / 2);

    // lift screen-space choices into world space at their depths
    const k = Dw / f;
    const wallC: V3 = [(cx - c[0]) * k, (cy - c[1]) * k, Dw];
    const half: [number, number] = [(w0 / 2) * k, (h0 / 2) * k];
    const apex: V3 = [((A[0] - c[0]) * Da) / f, ((A[1] - c[1]) * Da) / f, Da];

    // pyramid planes, normals pointing inward
    const corners = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(
      ([sx, sy]): V3 => [wallC[0] + sx * half[0], wallC[1] + sy * half[1], Dw],
    );
    const planes = new Float32Array(24);
    for (let e = 0; e < 4; e++) {
      let n = cross(sub(corners[e], apex), sub(corners[(e + 1) % 4], apex));
      const len = Math.hypot(...n);
      n = n.map((v) => v / len) as V3;
      if (dot3(n, sub(wallC, apex)) < 0) n = n.map((v) => -v) as V3;
      planes.set([...n, -dot3(n, apex)], e * 4);
    }
    planes.set([0, 0, 1, -Da], 16); // in front of the lens
    planes.set([0, 0, -1, Dw], 20); // not past the wall
    return { c, f, Dw, Da, wallC, half, apex, planes, zEnd: Dw * (1 - w0 / W) };
  };
  let geo = buildGeo(null);

  // camera and projected wall for a progress value
  const rigAt = (p: number, B: Beat) => {
    const g = geo;
    const cam: V3 = [g.wallC[0] * B.dollyXY, g.wallC[1] * B.dollyXY, g.zEnd * B.dollyZ];
    const s = g.f / (g.Dw - cam[2]);
    const hw = g.half[0] * s, hh = g.half[1] * s;
    const rcx = g.c[0] + (g.wallC[0] - cam[0]) * s, rcy = g.c[1] + (g.wallC[1] - cam[1]) * s;
    const rect: [number, number, number, number] = p >= 1 ? [0, 0, W, H] : [rcx - hw, rcy - hh, 2 * hw, 2 * hh];
    const rel = sub(g.apex, cam);
    const lensOn = rel[2] > 1;
    const lens: [number, number] = lensOn ? [g.c[0] + (rel[0] * g.f) / rel[2], g.c[1] + (rel[1] * g.f) / rel[2]] : [-1e4, -1e4];
    return { cam, rect, centre: [rcx, rcy] as [number, number], lens, lensOn };
  };

  // Everything below is a function of p and dissolve only (the shader clock
  // is derived from p too), so the reverse dive plays the very same frames.
  const render = (p: number, dissolve = 0) => {
    const B = beat(p);
    const R = rigAt(p, B);
    const U = D.at(p);
    const clock = (p * DUR_IN) / 1000;
    // image-locked cells: they magnify with the wall, softened so the small wall stays legible
    const unit = dpr * Math.pow(R.rect[2] / W, 0.6);
    // the landing dissolve breaks the pattern on its own grid: glyph cells for ascii, 6 css px otherwise
    const dCell: [number, number] = dialect === 'ascii' ? [ASCII_CELL[0] * unit, ASCII_CELL[1] * unit] : [6 * unit, 6 * unit];

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    // no veil: the canvas starts clear and the live page stays visible under the whole dive
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);

    // 1. the wall: projector light + dialect + the soft vignette under them
    if (p > 0) {
      const { u } = wallProg;
      gl.useProgram(wallProg.p);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, image.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, glyphTex);
      gl.uniform1i(u.uImage, 0);
      if (u.uGlyphs) gl.uniform1i(u.uGlyphs, 1);
      gl.uniform2f(u.uResolution, W, H);
      gl.uniform1f(u.uDpr, dpr);
      gl.uniform1f(u.uTime, clock);
      gl.uniform1i(u.uVariant, D.id);
      gl.uniform4f(u.uHeroRect, ...R.rect);
      gl.uniform1f(u.uImageAspect, image.w / image.h);
      gl.uniform1f(u.uTexelPerPx, Math.max(image.w / R.rect[2], image.h / R.rect[3]));
      gl.uniform2f(u.uOrigin, ...R.centre);
      gl.uniform2f(u.uLensPt, ...(R.lensOn ? R.lens : R.centre));
      gl.uniform2f(u.uDissolveCell, ...dCell);
      const set1 = (name: string, val: number | undefined) => {
        if (u[name]) gl.uniform1f(u[name], val ?? 0);
      };
      set1('uLamp', B.lamp);
      set1('uGrow', B.grow);
      set1('uFeather', B.feather);
      set1('uVignette', B.vignette);
      set1('uDissolve', dissolve);
      set1('uUnit', unit);
      set1('uDitherIn', U.ditherIn);
      set1('uResolve', U.resolve);
      set1('uGlyphCount', RAMP.length);
      if (u.uCell) gl.uniform2f(u.uCell, ASCII_CELL[0] * unit, ASCII_CELL[1] * unit);
      set1('uTypeIn', U.typeIn);
      set1('uHandover', U.handover);
      set1('uLineGlow', U.lineGlow);
      set1('uAperture', U.aperture);
      set1('uEdgeGlow', U.edgeGlow);
      set1('uScanline', U.scanline);
      set1('uChroma', U.chroma);
      set1('uCurve', U.curve);
      set1('uExposure', U.exposure ?? 1);
      gl.bindVertexArray(quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 2. dust lit inside the beam, additive like the site field; the real stars show through elsewhere
    const starAlpha = B.stars * (1 - dissolve);
    if (starAlpha > 0.001 && B.beam > 0.001) {
      const { u } = starProg;
      gl.useProgram(starProg.p);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform2f(u.uCentre, ...geo.c);
      gl.uniform1f(u.uFocal, geo.f);
      gl.uniform3f(u.uCam, ...R.cam);
      gl.uniform1f(u.uWallZ, geo.Dw);
      gl.uniform1f(u.uDpr, dpr);
      gl.uniform4fv(u.uPlanes, geo.planes);
      gl.uniform1f(u.uSoft, geo.Dw * 0.015);
      gl.uniform1f(u.uBeam, B.beam);
      gl.uniform1f(u.uStarAlpha, starAlpha);
      gl.bindVertexArray(starVAO);
      gl.drawArrays(gl.POINTS, 0, starCount);
    }

    // 3. the beam, rendered at half res and added on top
    if (B.beam > 0.001 || B.lens > 0.001) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, beamFBO);
      gl.viewport(0, 0, BW, BH);
      gl.disable(gl.BLEND);
      const { u } = beamProg;
      gl.useProgram(beamProg.p);
      gl.uniform2f(u.uResolution, W, H);
      gl.uniform1f(u.uScale, BEAM_SCALE);
      gl.uniform2f(u.uCentre, ...geo.c);
      gl.uniform1f(u.uFocal, geo.f);
      gl.uniform3f(u.uCam, ...R.cam);
      gl.uniform3f(u.uApex, ...geo.apex);
      gl.uniform3f(u.uWallCentre, ...geo.wallC);
      gl.uniform2f(u.uWallHalf, ...geo.half);
      gl.uniform4fv(u.uPlanes, geo.planes);
      gl.uniform1f(u.uBeam, B.beam);
      gl.uniform1f(u.uThrow, B.throw);
      gl.uniform2f(u.uLens, ...R.lens);
      gl.uniform1f(u.uLensGlow, R.lensOn ? B.lens : 0);
      gl.uniform1f(u.uDpr, dpr);
      gl.bindVertexArray(quadVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      const bu = blitProg.u;
      gl.useProgram(blitProg.p);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, beamTex);
      gl.uniform1i(bu.uTex, 2);
      gl.uniform1f(bu.uScale, BEAM_SCALE);
      gl.uniform2f(bu.uResolution, W, H);
      gl.uniform4f(bu.uHeroRect, ...R.rect);
      gl.uniform2f(bu.uOrigin, ...R.centre);
      gl.uniform2f(bu.uDissolveCell, ...dCell);
      gl.uniform1f(bu.uDissolve, dissolve);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(null);
  };

  return {
    aim(origin) {
      geo = buildGeo(origin);
    },
    render,
    dispose() {
      disposed = true;
      // free everything, then drop the context itself: the canvas is gone after the dive
      [starProg, wallProg, beamProg, blitProg].forEach((pr) => gl.deleteProgram(pr.p));
      buffers.forEach((b) => gl.deleteBuffer(b));
      gl.deleteVertexArray(starVAO);
      gl.deleteVertexArray(quadVAO);
      gl.deleteTexture(image.tex);
      if (glyphTex) gl.deleteTexture(glyphTex);
      gl.deleteTexture(beamTex);
      gl.deleteFramebuffer(beamFBO);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
