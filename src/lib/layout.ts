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
  const k = Math.min(width, height) * 0.16; // ideal edge length
  const repulse = k * k * 0.9;
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

  // Normalise into the viewport with padding, preserving aspect.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pos) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const padX = width * 0.1;
  const padY = height * 0.12;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width - padX * 2) / spanX, (height - padY * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;

  const laidOut: LaidOutNode[] = nodes.map((n, i) => ({
    ...n,
    x: (pos[i].x - minX) * scale + offX,
    y: (pos[i].y - minY) * scale + offY,
  }));

  return { nodes: laidOut, width, height };
}
