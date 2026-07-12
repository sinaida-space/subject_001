// ── Deterministic force-directed layout ──
// Runs once, synchronously (~29 nodes → sub-millisecond). Both the canvas
// (full) and SVG (lite) constellation read the same coordinates so the two
// modes are visually identical. Seeded RNG → identical layout every load.

import type { GraphNode, GraphEdge } from '@/data/graph';

export interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
}

export interface Layout {
  nodes: LaidOutNode[];
  width: number;
  height: number;
}

// Mulberry32 — tiny deterministic PRNG.
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Options {
  width: number;
  height: number;
  seed?: number;
  iterations?: number;
}

export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { width, height, seed = 20260703, iterations = 320 }: Options,
): Layout {
  const rand = rng(seed);
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);

  const index = new Map(nodes.map((n, i) => [n.id, i]));

  // Role classification — mains hold the visible center, background works sit
  // small at the periphery, skills cluster near the projects they connect to.
  const isBgProject = (n: GraphNode) => n.kind === 'project' && !!n.project?.background;
  const isMain = (n: GraphNode) => n.kind === 'project' && !n.project?.background;

  const mains = nodes.filter(isMain).sort((a, b) => b.weight - a.weight);
  const bgProjects = nodes.filter(isBgProject);

  const mainAngle = new Map<string, number>();
  mains.forEach((n, i) => {
    mainAngle.set(n.id, -Math.PI / 2 + i * ((Math.PI * 2) / mains.length));
  });
  const bgAngle = new Map<string, number>();
  bgProjects.forEach((n, i) => {
    const step = (Math.PI * 2) / Math.max(bgProjects.length, 1);
    bgAngle.set(n.id, -Math.PI / 2 + step / 2 + i * step);
  });

  // Adjacency (by id) for centroid-seeding skills near their connected projects.
  const neighborsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!neighborsOf.has(e.a)) neighborsOf.set(e.a, []);
    if (!neighborsOf.has(e.b)) neighborsOf.set(e.b, []);
    neighborsOf.get(e.a)!.push(e.b);
    neighborsOf.get(e.b)!.push(e.a);
  }

  // Seed positions. Rings are seeded elliptically (radius fraction applied to
  // width and height independently, not the isotropic min(width,height)) so
  // that the later per-axis normalization — which stretches x and y
  // independently to fill the box — doesn't reorder distances-from-center on
  // extreme aspect ratios (e.g. a tall narrow mobile canvas). A circle seeded
  // with min(width,height) gets warped unevenly by anisotropic stretching;
  // an ellipse pre-shaped to the box's own aspect survives it.
  const seedPos = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (isMain(n)) {
      const a = mainAngle.get(n.id)!;
      seedPos.set(n.id, {
        x: cx + Math.cos(a) * width * 0.17,
        y: cy + Math.sin(a) * height * 0.17,
      });
    } else if (isBgProject(n)) {
      const a = bgAngle.get(n.id)!;
      seedPos.set(n.id, {
        x: cx + Math.cos(a) * width * 0.46,
        y: cy + Math.sin(a) * height * 0.46,
      });
    }
  }
  // Skills: centroid of connected projects' seed positions (fallback: old random ring).
  for (const n of nodes) {
    if (n.kind !== 'skill') continue;
    const neighborIds = neighborsOf.get(n.id) ?? [];
    const projectSeeds = neighborIds
      .map((id) => seedPos.get(id))
      .filter((p): p is { x: number; y: number } => !!p);
    if (projectSeeds.length > 0) {
      const sx = projectSeeds.reduce((s, p) => s + p.x, 0) / projectSeeds.length;
      const sy = projectSeeds.reduce((s, p) => s + p.y, 0) / projectSeeds.length;
      seedPos.set(n.id, {
        x: sx + (rand() - 0.5) * 2 * width * 0.05,
        y: sy + (rand() - 0.5) * 2 * height * 0.05,
      });
    } else {
      const a = rand() * Math.PI * 2;
      const r = minDim * (0.24 + rand() * 0.26);
      seedPos.set(n.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  }

  const pos = nodes.map((n) => {
    const p = seedPos.get(n.id)!;
    return { x: p.x, y: p.y, vx: 0, vy: 0 };
  });

  // Force parameters, tuned for this scale.
  // Ideal edge length from Fruchterman-Reingold: proportional to
  // sqrt(area / nodeCount). Unlike min(width,height), this adapts to the real
  // box aspect — on a tall narrow (mobile) canvas it keeps connected nodes a
  // sensible distance apart so the sim fills the height naturally instead of
  // huddling into a width-locked blob that then has to be stretched.
  const k = Math.sqrt((width * height) / Math.max(nodes.length, 1)) * 0.82; // ideal edge length
  // Stronger repulsion relative to attraction — with every node now always
  // labeled, more breathing room between nodes matters more than a tight
  // "constellation" shape ("the graph should have enough air inside it").
  const repulse = k * k * 1.3;
  const centerPullFor = (n: GraphNode) =>
    isMain(n) ? 0.05 : isBgProject(n) ? 0.006 : 0.012;
  // Elliptical rim (matches the elliptical seeding above, for the same
  // anisotropic-normalization reason): semi-axes scale with width/height.
  const rimRx = width * 0.46;
  const rimRy = height * 0.46;

  for (let it = 0; it < iterations; it++) {
    const cooling = 1 - it / iterations; // simulated-annealing damping

    // Repulsion (all pairs — cheap at this node count)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = (rand() - 0.5) * 0.1;
          dy = (rand() - 0.5) * 0.1;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const f = repulse / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        pos[i].vx += fx;
        pos[i].vy += fy;
        pos[j].vx -= fx;
        pos[j].vy -= fy;
      }
    }

    // Attraction along edges (spring toward ideal length)
    for (const e of edges) {
      const ia = index.get(e.a)!;
      const ib = index.get(e.b)!;
      const dx = pos[ia].x - pos[ib].x;
      const dy = pos[ia].y - pos[ib].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d - k) * 0.06;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      pos[ia].vx -= fx;
      pos[ia].vy -= fy;
      pos[ib].vx += fx;
      pos[ib].vy += fy;
    }

    // Rim spring for background projects — keeps them out at the periphery,
    // on an ellipse shaped to the canvas aspect (see seeding comment above).
    for (const n of bgProjects) {
      const i = index.get(n.id)!;
      const dx = pos[i].x - cx;
      const dy = pos[i].y - cy;
      const nx = dx / rimRx;
      const ny = dy / rimRy;
      const ndist = Math.sqrt(nx * nx + ny * ny) || 0.0001;
      const f = (1 - ndist) * 0.1;
      pos[i].vx += (nx / ndist) * f * rimRx;
      pos[i].vy += (ny / ndist) * f * rimRy;
    }

    // Gentle pull to centre keeps the whole graph on-screen (role-aware).
    for (let i = 0; i < nodes.length; i++) {
      const centerPull = centerPullFor(nodes[i]);
      pos[i].vx += (cx - pos[i].x) * centerPull;
      pos[i].vy += (cy - pos[i].y) * centerPull;
      // integrate with damping
      pos[i].x += pos[i].vx * 0.5 * cooling;
      pos[i].y += pos[i].vy * 0.5 * cooling;
      pos[i].vx *= 0.85;
      pos[i].vy *= 0.85;
    }
  }

  // Normalise into the viewport. Each axis is scaled independently so the
  // graph always fills the padded box in BOTH dimensions — on a wide canvas
  // the field stretches horizontally instead of huddling in an aspect-locked
  // blob. Padding is a guaranteed ≥10% clear margin on every side (with a
  // floor in px so labels drawn beside edge nodes still have room).
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pos) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const padX = Math.max(width * 0.1, 110);
  const padY = Math.max(height * 0.1, 56);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scaleX = Math.max((width - padX * 2) / spanX, 0.01);
  const scaleY = Math.max((height - padY * 2) / spanY, 0.01);

  const laidOut: LaidOutNode[] = nodes.map((n, i) => ({
    ...n,
    x: (pos[i].x - minX) * scaleX + padX,
    y: (pos[i].y - minY) * scaleY + padY,
  }));

  return { nodes: laidOut, width, height };
}
