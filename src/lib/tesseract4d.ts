// ── 4D tesseract geometry and projection ──
// Ported from the July tesseract hero (archive/WIP_JULY_tesseract-hero,
// src/components/Tesseract.tsx), without its idle rotation, pointer tilt and
// flatten morph. Pure math: no DOM, no state.

export type Vec4 = [number, number, number, number];

/** the 16 vertices: every combination of (±1, ±1, ±1, ±1) */
export const VERTICES: Vec4[] = [];
for (const x of [-1, 1]) {
  for (const y of [-1, 1]) {
    for (const z of [-1, 1]) {
      for (const w of [-1, 1]) {
        VERTICES.push([x, y, z, w]);
      }
    }
  }
}

/** the 32 edges: every pair of vertices that differ in exactly one coordinate */
export const EDGES: [number, number][] = [];
for (let i = 0; i < VERTICES.length; i++) {
  for (let j = i + 1; j < VERTICES.length; j++) {
    let diff = 0;
    for (let k = 0; k < 4; k++) if (VERTICES[i][k] !== VERTICES[j][k]) diff++;
    if (diff === 1) EDGES.push([i, j]);
  }
}

const D4 = 3; // 4D eye distance along w
const D3 = 4; // 3D eye distance along z

/** largest |x| or |y| a resting tesseract (both angles 0) projects to: the
 *  front face of the outer cube, (1 · D4/(D4-1)) · D3/(D3 - D4/(D4-1)) */
export const FRAME_EXTENT = (D4 / (D4 - 1)) * (D3 / (D3 - D4 / (D4 - 1)));

export interface Projected {
  x: number;
  y: number;
  /** 0..1, higher = nearer the camera */
  depth: number;
}

/**
 * Rotate in the XW plane, then in the ZW plane, then project 4D → 3D
 * (s4 = D4 / (D4 - w)), turn the 3D shadow by `yaw` (about y) and `pitch`
 * (about x) so its inner and outer cubes show side by side, and project
 * 3D → 2D (s3 = D3 / (D3 - z)). Writes into `out` so the per-frame loop
 * allocates nothing.
 */
export function project(v: Vec4, angleXW: number, angleZW: number, out: Projected, yaw = 0, pitch = 0): Projected {
  const [x, y, z, w] = v;
  const cXW = Math.cos(angleXW);
  const sXW = Math.sin(angleXW);
  const cZW = Math.cos(angleZW);
  const sZW = Math.sin(angleZW);

  const x1 = x * cXW - w * sXW;
  const w1 = x * sXW + w * cXW;
  const z1 = z * cZW - w1 * sZW;
  const w2 = z * sZW + w1 * cZW;

  const s4 = D4 / (D4 - w2);
  const xs = x1 * s4;
  const ys = y * s4;
  const zs = z1 * s4;
  const cY = Math.cos(yaw), sY = Math.sin(yaw);
  const cP = Math.cos(pitch), sP = Math.sin(pitch);
  const X3 = xs * cY + zs * sY;
  const z2 = zs * cY - xs * sY;
  const Y3 = ys * cP - z2 * sP;
  const Z3 = ys * sP + z2 * cP;

  const s3 = D3 / (D3 - Z3);
  out.x = X3 * s3;
  out.y = Y3 * s3;
  out.depth = Math.max(0, Math.min(1, (Z3 + 2) / 4));
  return out;
}

// ── service panes ──
// Cell k (k = 0..3: w-, x+, w+, x-) comes to the front at XW = -k·90°. Its
// pane is that cell's face toward the camera (z = -1), parametrised so that
// at the cell's own rest angle theta = -k·90° (and ZW = 180°) the point
// (a, b) in [-1, 1]² rotates to x = a, y = b on the outer cell: the pane is
// upright, unmirrored and fills the resting frame exactly.

/** rest XW angle of cell k */
export const paneTheta = (k: number) => (-k * Math.PI) / 2;

/**
 * GLSL ES 1.00 twin of project() plus the pane parametrisation, for a vertex
 * shader. tesseractProject returns (screen x, screen y, depth 0..1, w after
 * rotation: 1 = outer cell, -1 = inner); screen units match project().
 */
export const TESSERACT_GLSL = `
const float D4 = ${D4.toFixed(1)};
const float D3 = ${D3.toFixed(1)};
vec4 panePoint(vec2 ab, float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return vec4(ab.x * c - s, ab.y, -1.0, -ab.x * s - c);
}
vec4 tesseractProject(vec4 v, float angleXW, float angleZW, vec2 view) {
  float cXW = cos(angleXW);
  float sXW = sin(angleXW);
  float cZW = cos(angleZW);
  float sZW = sin(angleZW);
  float x1 = v.x * cXW - v.w * sXW;
  float w1 = v.x * sXW + v.w * cXW;
  float z1 = v.z * cZW - w1 * sZW;
  float w2 = v.z * sZW + w1 * cZW;
  float s4 = D4 / (D4 - w2);
  vec3 q = vec3(x1, v.y, z1) * s4;
  float cY = cos(view.x), sY = sin(view.x), cP = cos(view.y), sP = sin(view.y);
  float z2 = q.z * cY - q.x * sY;
  vec3 p3 = vec3(q.x * cY + q.z * sY, q.y * cP - z2 * sP, q.y * sP + z2 * cP);
  float s3 = D3 / (D3 - p3.z);
  return vec4(p3.xy * s3, clamp((p3.z + 2.0) / 4.0, 0.0, 1.0), w2);
}
`;

// Je suis le spectre d'une rose que tu portais hier au bal.
