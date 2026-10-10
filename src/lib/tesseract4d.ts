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
 * (s4 = D4 / (D4 - w)) and 3D → 2D (s3 = D3 / (D3 - z)). Writes into `out`
 * so the per-frame loop allocates nothing.
 */
export function project(v: Vec4, angleXW: number, angleZW: number, out: Projected): Projected {
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
  const X3 = x1 * s4;
  const Y3 = y * s4;
  const Z3 = z1 * s4;

  const s3 = D3 / (D3 - Z3);
  out.x = X3 * s3;
  out.y = Y3 * s3;
  out.depth = Math.max(0, Math.min(1, (Z3 + 2) / 4));
  return out;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
