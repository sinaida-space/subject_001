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

  // Seed positions: projects on an inner ring, skills scattered wider — gives
  // the settled graph a pleasant "bright cores, connective haze" structure.
  const pos = nodes.map((n) => {
    const a = rand() * Math.PI * 2;
    const r =
      n.kind === 'project'
        ? Math.min(width, height) * (0.12 + rand() * 0.14)
        : Math.min(width, height) * (0.24 + rand() * 0.26);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 };
  });

  const index = new Map(nodes.map((n, i) => [n.id, i]));

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
  const centerPull = 0.012;

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

    // Gentle pull to centre keeps the whole graph on-screen.
    for (let i = 0; i < nodes.length; i++) {
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
