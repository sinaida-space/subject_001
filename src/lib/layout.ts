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
  const k = Math.min(width, height) * 0.2; // ideal edge length — more spread, less clustered
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

  // Normalise into the viewport with padding, preserving aspect.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pos) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const padX = width * 0.06;
  const padY = height * 0.07;
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

// ── Top-down layout for touch/mobile ──
// No hover on touch, only scroll — so instead of a free-floating scatter,
// each project gets its own vertical "band" of the canvas, stacked in a
// stable top-to-bottom order. Scrolling through the section naturally reads
// as scrolling through a sequence of chapters, one project at a time, with
// its connected skills scattered around it in that same band. A skill
// connected to more than one project is anchored near the first project it
// connects to, but its edges to every other connected project are kept —
// those edges will cross bands, which is fine and even nice: it shows real
// cross-connections between different parts of the practice as you scroll.
export function computeTopDownLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { width, bandHeight = 640 }: { width: number; bandHeight?: number },
): Layout {
  const projects = nodes.filter((n) => n.kind === 'project');
  const skills = nodes.filter((n) => n.kind === 'skill');
  const height = Math.max(bandHeight, projects.length * bandHeight);

  const projectIndex = new Map(projects.map((p, i) => [p.id, i]));
  const projectX = (i: number) => (i % 2 === 0 ? width * 0.38 : width * 0.62);
  const projectY = (i: number) => (i + 0.5) * bandHeight;

  const positions = new Map<string, { x: number; y: number }>();
  projects.forEach((p, i) => {
    positions.set(p.id, { x: projectX(i), y: projectY(i) });
  });

  // Each skill's "home" project = the first project it connects to, in the
  // edge list's own order (stable — same seed data every load).
  const skillHome = new Map<string, number>();
  for (const e of edges) {
    const projId = projects.some((p) => p.id === e.a) ? e.a : projects.some((p) => p.id === e.b) ? e.b : null;
    const skillId = projId === e.a ? e.b : e.a;
    if (projId == null || skillHome.has(skillId)) continue;
    const pi = projectIndex.get(projId);
    if (pi != null) skillHome.set(skillId, pi);
  }

  // Group skills by home project so each cluster can be spread with a
  // golden-angle scatter (organic, deterministic, no simulation needed).
  const clusters = new Map<number, string[]>();
  skills.forEach((s) => {
    const home = skillHome.get(s.id) ?? 0;
    if (!clusters.has(home)) clusters.set(home, []);
    clusters.get(home)!.push(s.id);
  });

  const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);
  const halfBand = bandHeight / 2 - 48; // keep clear of the next band
  const maxRadiusX = width * 0.42;

  clusters.forEach((ids, homeIdx) => {
    const center = { x: projectX(homeIdx), y: projectY(homeIdx) };
    ids.forEach((id, i) => {
      const angle = i * GOLDEN_ANGLE;
      const radius = 70 + (i % 4) * 34;
      const x = Math.min(width - 20, Math.max(20, center.x + Math.cos(angle) * radius));
      const yRaw = center.y + Math.sin(angle) * radius * 0.55;
      const y = Math.min(center.y + halfBand, Math.max(center.y - halfBand, yRaw));
      positions.set(id, { x: Math.min(width - 20, Math.max(20, Math.min(x, center.x + maxRadiusX))), y });
    });
  });

  const laidOut: LaidOutNode[] = nodes.map((n) => {
    const p = positions.get(n.id) ?? { x: width / 2, y: 40 };
    return { ...n, x: p.x, y: p.y };
  });

  return { nodes: laidOut, width, height };
}
