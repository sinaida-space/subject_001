// ── Deterministic composed layout: a star chart ──
// Not a free force simulation. Skills sit on an outer ring, each
// constellation (category) owning its own arc, so every constellation reads
// as one figure with its name on the outside of the arc. Projects sit inside
// the ring, each pulled toward the skills it is wired to. A short collision
// pass only untangles overlaps, so the composition is stable on every load
// and every viewport. Both the canvas (full) and SVG (lite) constellation
// read the same coordinates.

import type { GraphNode, GraphEdge, Category } from '@/data/graph';

export interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
}

export interface Layout {
  nodes: LaidOutNode[];
  width: number;
  height: number;
}

// Mulberry32 — tiny deterministic PRNG (jitter + tie-breaks only).
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

// Constellations around the ring, clockwise from the top. Order chosen so the
// projects that share constellations land between neighbouring arcs.
const RING_ORDER: Category[] = ['sound', 'code', 'body', 'space'];

export function computeLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { width, height, seed = 20260703 }: Options,
): Layout {
  const rand = rng(seed);
  // The 110px label margin only makes sense when there's width to spare — on a
  // phone-width canvas it would swallow most of the box, so fall back to a
  // proportional pad there (labels self-clamp to the canvas when drawn).
  const padX = width < 640 ? Math.max(width * 0.12, 40) : Math.max(width * 0.1, 110);
  const padY = Math.max(height * 0.08, 56);
  const boxW = width - padX * 2;
  const boxH = height - padY * 2;
  const cx = padX + boxW / 2;
  const cy = padY + boxH / 2;
  const minDim = Math.min(width, height);

  const skills = nodes.filter((n) => n.kind === 'skill');
  const projects = nodes.filter((n) => n.kind === 'project');
  const pos = new Map<string, { x: number; y: number }>();

  // ── 1. Skills → one arc per constellation on an outer ellipse ──
  // Each arc is as long as its constellation has stars, with an equal gap
  // between arcs so the figures stay visibly apart. The first arc is centred
  // on 12 o'clock.
  const rx = boxW * 0.47;
  const ry = boxH * 0.45;
  const groups = RING_ORDER.map((cat) => skills.filter((s) => s.category === cat)).filter((g) => g.length);
  const GAP = 1.1; // gap between arcs, in "star slots"
  const slotsTotal = groups.reduce((acc, g) => acc + g.length, 0) + GAP * groups.length;
  const slotAngle = (Math.PI * 2) / slotsTotal;
  let angle = -Math.PI / 2 - ((groups[0]?.length ?? 1) - 1) * slotAngle * 0.5;
  groups.forEach((g) => {
    g.forEach((s, i) => {
      // alternate the radius slightly so neighbouring labels don't align
      const k = 1 + (i % 2 ? -0.07 : 0.03);
      pos.set(s.id, { x: cx + Math.cos(angle) * rx * k, y: cy + Math.sin(angle) * ry * k });
      angle += slotAngle;
    });
    angle += slotAngle * GAP;
  });

  // ── 2. Projects → inside the ring, pulled toward their own skills ──
  // Mean of the project's skill positions, drawn toward the centre so the
  // stars form an inner field; a separation pass keeps them apart.
  const projPts = projects.map((n) => {
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (const e of edges) {
      if (e.a !== n.id) continue;
      const q = pos.get(e.b);
      if (!q) continue;
      sx += q.x;
      sy += q.y;
      c++;
    }
    const mx = c ? sx / c : cx;
    const my = c ? sy / c : cy;
    return { n, p: { x: cx + (mx - cx) * 0.95 + (rand() - 0.5) * 8, y: cy + (my - cy) * 0.95 + (rand() - 0.5) * 8 } };
  });
  const pSepX = Math.min(260, boxW * 0.34);
  const pSepY = Math.min(170, boxH * 0.2);
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < projPts.length; i++) {
      for (let j = i + 1; j < projPts.length; j++) {
        const A = projPts[i].p;
        const B = projPts[j].p;
        const dx = A.x - B.x || 0.5;
        const dy = A.y - B.y || 0.5;
        const nd = Math.hypot(dx / pSepX, dy / pSepY);
        if (nd < 1) {
          const d = Math.hypot(dx, dy);
          const push = (1 - nd) * 7;
          A.x += (dx / d) * push;
          A.y += (dy / d) * push;
          B.x -= (dx / d) * push;
          B.y -= (dy / d) * push;
        }
      }
    }
    // stay well inside the ring
    for (const P of projPts) {
      const nx = (P.p.x - cx) / (rx * 0.72);
      const ny = (P.p.y - cy) / (ry * 0.72);
      const r = Math.hypot(nx, ny);
      if (r > 1) {
        P.p.x = cx + (P.p.x - cx) / r;
        P.p.y = cy + (P.p.y - cy) / r;
      }
    }
  }
  projPts.forEach(({ n, p }) => pos.set(n.id, p));

  // ── 4. Collision pass: skills untangle (projects stay anchored) ──
  // Labels are wide and short, so "personal space" is an ellipse: generous
  // horizontally, tighter vertically. Accent skills are heavier — they hold
  // their spot and push plain skills out of the way, not vice versa.
  // Personal space per node, as an ellipse — labels are wide and short, so
  // the horizontal reach is much larger than the vertical one. These were
  // tuned against 13-15px labels; the type scale moved skills to 16px and
  // projects to 20px, which is roughly 35% wider text, and the values are
  // opened up past that on purpose so nodes read as separated rather than
  // merely non-overlapping.
  const sepX = Math.min(230, boxW * 0.24);
  const sepY = 82;
  const projSepX = 200;
  const projSepY = 112;
  const skillPos = skills.map((s) => ({ n: s, p: pos.get(s.id)! }));
  const projPos = nodes.filter((n) => n.kind === 'project').map((n) => ({ n, p: pos.get(n.id)! }));
  for (let it = 0; it < 90; it++) {
    for (let i = 0; i < skillPos.length; i++) {
      for (let j = i + 1; j < skillPos.length; j++) {
        const A = skillPos[i];
        const B = skillPos[j];
        let dx = A.p.x - B.p.x;
        let dy = A.p.y - B.p.y;
        if (dx === 0 && dy === 0) {
          dx = (rand() - 0.5) * 2;
          dy = (rand() - 0.5) * 2;
        }
        const nd = Math.hypot(dx / sepX, dy / sepY);
        if (nd < 1) {
          const push = (1 - nd) * 0.5;
          const d = Math.hypot(dx, dy) || 1;
          const ux = (dx / d) * push;
          const uy = (dy / d) * push;
          // heavier node (accent) moves less
          const wa = A.n.accent ? 0.35 : 1;
          const wb = B.n.accent ? 0.35 : 1;
          A.p.x += ux * 16 * wa;
          A.p.y += uy * 16 * wa;
          B.p.x -= ux * 16 * wb;
          B.p.y -= uy * 16 * wb;
        }
      }
      // keep clear of project stars (their labels sit beside them)
      const S = skillPos[i];
      for (const P of projPos) {
        const dx = S.p.x - P.p.x;
        const dy = S.p.y - P.p.y;
        const nd = Math.hypot(dx / projSepX, dy / projSepY);
        if (nd < 1 && nd > 0.0001) {
          const push = (1 - nd) * 0.6;
          const d = Math.hypot(dx, dy) || 1;
          S.p.x += (dx / d) * push * 18;
          S.p.y += (dy / d) * push * 18;
        }
      }
      // stay inside the padded box
      S.p.x = Math.min(padX + boxW, Math.max(padX, S.p.x));
      S.p.y = Math.min(padY + boxH, Math.max(padY, S.p.y));
    }
  }

  const laidOut: LaidOutNode[] = nodes.map((n) => {
    const p = pos.get(n.id)!;
    return { ...n, x: p.x, y: p.y };
  });

  return { nodes: laidOut, width, height };
}
