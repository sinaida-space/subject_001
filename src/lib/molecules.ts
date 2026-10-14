// Skeletal formulas of the attachment chemistry the page walks through, as 2D
// atom coordinates (bond length ≈ 1) and bonds. `h` marks a heteroatom
// (O, N, S), drawn in the muted red. Oxytocin is drawn at residue level:
// nine amino acids, the Cys1–Cys6 disulfide loop, and tyrosine's phenol ring.
// Every molecule is rotated onto its principal axis so it lies horizontal.

export type MoleculeId = 'noradrenaline' | 'dopamine' | 'serotonin' | 'oxytocin';

export interface Molecule {
  atoms: { x: number; y: number; h: boolean }[];
  bonds: [number, number][];
}

type Raw = { a: [number, number, (0 | 1)?][]; b: [number, number][] };

const RING: [number, number][] = [[0, -1], [0.866, -0.5], [0.866, 0.5], [0, 1], [-0.866, 0.5], [-0.866, -0.5]];
const RING_BONDS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];

// Catechol ring + ethylamine side chain (dopamine); noradrenaline adds one
// β-hydroxyl — the same shape, one oxygen more.
const catecholamine = (betaOH: boolean): Raw => {
  const a: Raw['a'] = [...RING, [1.732, -1], [2.598, -0.5], [3.464, -1, 1], [-1.732, 1, 1], [-1.732, -1, 1]];
  const b: Raw['b'] = [...RING_BONDS, [1, 6], [6, 7], [7, 8], [4, 9], [5, 10]];
  if (betaOH) { a.push([1.732, -2, 1]); b.push([6, 11]); }
  return { a, b };
};

// 5-hydroxytryptamine: indole (benzene fused to pyrrole) + ethylamine + 5-OH.
const serotonin: Raw = {
  a: [...RING, [1.817, -0.809], [2.405, 0], [1.817, 0.809, 1], [2.126, -1.76], [3.07, -2.07], [3.38, -3.02, 1], [-1.732, -1, 1]],
  b: [...RING_BONDS, [1, 6], [6, 7], [7, 8], [8, 2], [6, 9], [9, 10], [10, 11], [5, 12]],
};

const oxytocin = ((): Raw => {
  const onLoop = (deg: number): [number, number] => [1.4 * Math.cos((deg * Math.PI) / 180), -1.4 * Math.sin((deg * Math.PI) / 180)];
  // Cys1 Tyr2 Ile3 Gln4 Asn5 Cys6, S–S, then the Pro7 Leu8 Gly9-NH2 tail
  const a: Raw['a'] = [
    onLoop(200), onLoop(245), onLoop(290), onLoop(335), onLoop(20), onLoop(65),
    [...onLoop(115), 1], [...onLoop(160), 1],
    [1.5, -1.9], [2.5, -1.6], [3.3, -2.2], [4.2, -1.9, 1],
    [-0.75, 2.05],
  ];
  const b: Raw['b'] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [5, 8], [8, 9], [9, 10], [10, 11], [1, 12]];
  const push = (p: [number, number, (0 | 1)?]) => a.push(p) - 1;
  // tyrosine phenol
  const ring0 = a.length;
  for (let k = 0; k < 6; k++) {
    const t = -Math.PI / 2 + (k * Math.PI) / 3;
    push([-0.9 + 0.42 * Math.cos(t), 2.65 + 0.42 * Math.sin(t)]);
  }
  for (let k = 0; k < 6; k++) b.push([ring0 + k, ring0 + ((k + 1) % 6)]);
  b.push([12, ring0], [ring0 + 3, push([-0.9, 3.45, 1])]);
  // short side chains: Ile, Gln (amide O), Asn (amide O)
  const ile = push([0.85, 2.1]); b.push([2, ile], [ile, push([0.55, 2.8])]);
  const gln = push([2.05, 0.95]); const gln2 = push([2.65, 0.55]); b.push([3, gln], [gln, gln2], [gln2, push([3.2, 0.85, 1])]);
  const asn = push([2.15, -0.1]); b.push([4, asn], [asn, push([2.75, -0.45, 1])]);
  return { a, b };
})();

function horizontal(raw: Raw): Molecule {
  const n = raw.a.length;
  const cx = raw.a.reduce((s, p) => s + p[0], 0) / n;
  const cy = raw.a.reduce((s, p) => s + p[1], 0) / n;
  let xx = 0, yy = 0, xy = 0;
  for (const [x0, y0] of raw.a) {
    const x = x0 - cx, y = y0 - cy;
    xx += x * x; yy += y * y; xy += x * y;
  }
  const t = -0.5 * Math.atan2(2 * xy, xx - yy);
  const c = Math.cos(t), s = Math.sin(t);
  return {
    atoms: raw.a.map(([x0, y0, h]) => ({ x: (x0 - cx) * c - (y0 - cy) * s, y: (x0 - cx) * s + (y0 - cy) * c, h: h === 1 })),
    bonds: raw.b,
  };
}

export const MOLECULES: Record<MoleculeId, Molecule> = {
  noradrenaline: horizontal(catecholamine(true)),
  dopamine: horizontal(catecholamine(false)),
  serotonin: horizontal(serotonin),
  oxytocin: horizontal(oxytocin),
};
