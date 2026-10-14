// ── The site's star look for every particle cloud ──
// One source for the quote gate, the big bang, the tesseract dust and the
// star titles, so every cloud reads as the same galaxy: sparse, mostly small
// and dim, a few bright stars with a soft halo, a little colour.
//
// Cells keep their full count while they form something (a letter, the
// portrait); once they leave a formation only GALAXY.keep of them stay lit.
// Every function takes the cell's own random (0..1) so a cell keeps its look
// on every frame and on reverse scroll.

export const GALAXY = {
  keep: 0.36, // share of cells still lit in flight and in clouds
  bright: 0.04, // share of lit cells that are bright stars with a halo
  sizeMin: 1, // css px
  sizeMax: 3, // css px, rare
  dimMin: 0.35, // the far, dim end of the depth range
};

const fract = (x: number) => x - Math.floor(x);

/** 1 when this cell stays lit once it leaves its formation */
export const galaxyKeep = (rnd: number) => (fract(rnd * 3.17) < GALAXY.keep ? 1 : 0);

/** star diameter in css px: mostly 1, sometimes 2, rarely 3 */
export const galaxySize = (rnd: number, depth: number) => {
  const r = fract(rnd * 11.31);
  return GALAXY.sizeMin + (GALAXY.sizeMax - GALAXY.sizeMin) * r * r * r * r * (0.5 + 0.5 * depth);
};

/** 1 for the few bright stars that get a halo */
export const galaxyBright = (rnd: number) => (fract(rnd * 5.71) > 1 - GALAXY.bright ? 1 : 0);

/** star colour as [r, g, b] 0..1: warm white, some cool, a few red; dimmer when far */
export const galaxyColor = (rnd: number, depth: number): [number, number, number] => {
  const r = fract(rnd * 2.39);
  const c: [number, number, number] = r > 0.92 ? [1, 0.2, 0.17] : r > 0.72 ? [0.82, 0.88, 1] : [1, 0.95, 0.88];
  const k = GALAXY.dimMin + (1 - GALAXY.dimMin) * depth * depth;
  return [c[0] * k, c[1] * k, c[2] * k];
};

/** the same four functions for shaders; paste into a GLSL ES 3.0 source */
export const GALAXY_GLSL = `
float galaxyKeep(float rnd) { return step(fract(rnd * 3.17), ${GALAXY.keep.toFixed(3)}); }
float galaxySize(float rnd, float depth) {
  float r = fract(rnd * 11.31);
  return ${GALAXY.sizeMin.toFixed(1)} + ${(GALAXY.sizeMax - GALAXY.sizeMin).toFixed(1)} * r * r * r * r * (0.5 + 0.5 * depth);
}
float galaxyBright(float rnd) { return step(${(1 - GALAXY.bright).toFixed(3)}, fract(rnd * 5.71)); }
vec3 galaxyColor(float rnd, float depth) {
  float r = fract(rnd * 2.39);
  vec3 c = mix(vec3(1.0, 0.95, 0.88), vec3(0.82, 0.88, 1.0), step(0.72, r));
  c = mix(c, vec3(1.0, 0.2, 0.17), step(0.92, r));
  return c * mix(${GALAXY.dimMin.toFixed(2)}, 1.0, depth * depth);
}
`;

// Je suis le spectre d'une rose que tu portais hier au bal.
