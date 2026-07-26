// ── Deterministic composed layout ──
// Not a free force simulation: the main projects are anchored at designed
// positions, each skill sits with the project(s) it belongs to, background
// works go to the rim. A short collision pass only untangles overlaps — the
// composition itself is authored, so the hierarchy (flagships first) is
// stable on every load and every viewport. Both the canvas (full) and SVG
// (lite) constellation read the same coordinates.

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

// Fixed reading order for the main hubs — top to bottom, left column, each
// its own "chapter" the eye descends through. Not weight order: the
// composition is authored so the flagship (Redkie Ptitsy) opens top-left and
// the rest cascade down, with the right side left open for background
// projects and shared-skill stars to breathe into.
const MAIN_ORDER = ['redkie-ptitsy', 'aether-currents', 'ethereal-path', 'the-eyes-chico'];

// Anchor slots for the main (non-background) projects, in padded-box
// fractions, applied in MAIN_ORDER (falling back to weight order for any
// project not named above, appended after).
const MAIN_SLOTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.45]],
  2: [
    [0.18, 0.28],
    [0.32, 0.68],
  ],
  3: [
    [0.18, 0.24],
    [0.32, 0.46],
    [0.26, 0.76],
  ],
  4: [
    [0.18, 0.24],
    [0.32, 0.43],
    [0.33, 0.63],
    [0.21, 0.77],
  ],
  5: [
    [0.16, 0.2],
    [0.3, 0.38],
    [0.32, 0.56],
    [0.24, 0.72],
    [0.14, 0.88],
  ],
};

// Background projects cascade down the right column, mirroring the mains'
// left column — the two sides read as a single composition with open air
// down the middle for shared-skill stars. Order top to bottom; falls back to
// declaration order for any project not named here.
const BG_ORDER = ['mahler', 'stereolove', 'submerged'];

const BG_SLOTS: Record<number, [number, number][]> = {
  1: [[0.68, 0.45]],
  2: [
    [0.68, 0.24],
    [0.66, 0.72],
  ],
  3: [
    [0.66, 0.2],
    [0.68, 0.72],
    [0.64, 0.86],
  ],
  4: [
    [0.66, 0.16],
    [0.7, 0.42],
    [0.68, 0.68],
    [0.64, 0.88],
  ],
};

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

  const isBgProject = (n: GraphNode) => n.kind === 'project' && !!n.project?.background;
  const isMain = (n: GraphNode) => n.kind === 'project' && !n.project?.background;

  const weightOrder = nodes.filter(isMain).sort((a, b) => b.weight - a.weight);
  const orderRank = new Map(MAIN_ORDER.map((id, i) => [id, i]));
  const mains = [...weightOrder].sort((a, b) => {
    const ra = orderRank.get(a.id);
    const rb = orderRank.get(b.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return 0; // both unranked — keep weight order
  });
  const bgProjects = nodes.filter(isBgProject);
  const skills = nodes.filter((n) => n.kind === 'skill');

  const pos = new Map<string, { x: number; y: number }>();
  const at = (fx: number, fy: number) => ({ x: padX + fx * boxW, y: padY + fy * boxH });

  // ── 1. Main projects → designed anchor slots ──
  // The slots read top-to-bottom in a left-hand column on every viewport —
  // no separate "tall" re-spread needed, since the composition is already
  // vertical and survives both a wide desktop box and a narrow mobile one.
  const slots = MAIN_SLOTS[Math.min(mains.length, 5)] ?? MAIN_SLOTS[5];
  mains.forEach((n, i) => {
    if (i < slots.length) {
      const [fx, fy] = slots[i];
      pos.set(n.id, at(fx, fy));
    } else {
      // overflow mains (data grew): outer ring, evenly spread
      const a = -Math.PI / 2 + ((i - slots.length) / Math.max(mains.length - slots.length, 1)) * Math.PI * 2;
      pos.set(n.id, { x: cx + Math.cos(a) * boxW * 0.42, y: cy + Math.sin(a) * boxH * 0.42 });
    }
  });

  // ── 2. Background projects → right column, cascading opposite the mains ──
  const skillOwners = new Map<string, string[]>(); // skill id → project ids
  for (const e of edges) {
    // buildGraph always emits project→skill as a→b
    if (!skillOwners.has(e.b)) skillOwners.set(e.b, []);
    skillOwners.get(e.b)!.push(e.a);
  }
  const bgOrderRank = new Map(BG_ORDER.map((id, i) => [id, i]));
  const orderedBg = [...bgProjects].sort((a, b) => {
    const ra = bgOrderRank.get(a.id);
    const rb = bgOrderRank.get(b.id);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return 0;
  });
  const bgSlots = BG_SLOTS[Math.min(orderedBg.length, 4)] ?? BG_SLOTS[4];
  const placedAngles: number[] = [];
  orderedBg.forEach((n, i) => {
    if (i < bgSlots.length) {
      const [fx, fy] = bgSlots[i];
      pos.set(n.id, at(fx, fy));
      return;
    }
    // overflow bg projects (data grew): centroid of mains reachable through
    // shared skills → rim angle, same fallback the composition used to use
    // for every background star before the fixed right column was authored.
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (const p of n.project?.skills ?? []) {
      for (const owner of skillOwners.get(p) ?? []) {
        const mp = pos.get(owner);
        if (mp && owner !== n.id) {
          sx += mp.x;
          sy += mp.y;
          c++;
        }
      }
    }
    let angle = c ? Math.atan2(sy / c - cy, sx / c - cx) : rand() * Math.PI * 2;
    const MIN_SEP = (Math.PI / 180) * 55;
    for (let guard = 0; guard < 12; guard++) {
      const clash = placedAngles.find((a) => {
        const d = Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a)));
        return d < MIN_SEP;
      });
      if (clash === undefined) break;
      angle += MIN_SEP;
    }
    placedAngles.push(angle);
    pos.set(n.id, {
      x: cx + Math.cos(angle) * boxW * 0.46,
      y: cy + Math.sin(angle) * boxH * 0.46,
    });
  });

  // ── 3. Skills → orbit their sole project, or sit between shared projects ──
  const projWeight = new Map(nodes.filter((n) => n.kind === 'project').map((n) => [n.id, n.weight]));
  // group single-project skills per hub so they fan cleanly around it
  const soloByProject = new Map<string, GraphNode[]>();
  const shared: GraphNode[] = [];
  for (const s of skills) {
    const owners = skillOwners.get(s.id) ?? [];
    if (owners.length === 1) {
      if (!soloByProject.has(owners[0])) soloByProject.set(owners[0], []);
      soloByProject.get(owners[0])!.push(s);
    } else {
      shared.push(s);
    }
  }

  // Skills sit further off their hub than they used to. The graph is the
  // point of this section — it has to read as structure, and structure needs
  // negative space around every node, not just enough room to avoid a
  // literal overlap.
  const orbitR = Math.max(140, Math.min(minDim * 0.22, 240));
  for (const [pid, list] of soloByProject) {
    const hub = pos.get(pid);
    if (!hub) continue;
    // fan outward: away from canvas centre, so exclusive skills always face
    // the open edge instead of colliding with the middle of the composition
    const outward =
      Math.hypot(hub.x - cx, hub.y - cy) < 4 ? -Math.PI / 2 : Math.atan2(hub.y - cy, hub.x - cx);
    const step = Math.min(0.85, (Math.PI * 1.15) / Math.max(list.length, 1));
    // background hubs keep their satellites close — a dim rim star shouldn't
    // fling quiet skills across the composition
    const hubIsBg = bgProjects.some((b) => b.id === pid);
    const baseR = hubIsBg ? orbitR * 0.6 : orbitR;
    list.forEach((s, i) => {
      const a = outward + (i - (list.length - 1) / 2) * step;
      const r = baseR * (1 + (i % 2) * 0.22);
      pos.set(s.id, { x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r });
    });
  }
  for (const s of shared) {
    const owners = skillOwners.get(s.id) ?? [];
    let sx = 0;
    let sy = 0;
    let wsum = 0;
    for (const o of owners) {
      const p = pos.get(o);
      if (!p) continue;
      const w = projWeight.get(o) ?? 1;
      sx += p.x * w;
      sy += p.y * w;
      wsum += w;
    }
    if (!wsum) {
      pos.set(s.id, { x: cx, y: cy });
      continue;
    }
    // centroid, nudged slightly outward from the composition centre so shared
    // skills don't all pile into the middle
    const mx = sx / wsum;
    const my = sy / wsum;
    pos.set(s.id, {
      x: cx + (mx - cx) * 1.22 + (rand() - 0.5) * 24,
      y: cy + (my - cy) * 1.22 + (rand() - 0.5) * 24,
    });
  }

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
  const sepY = 74;
  const projSepX = 200;
  const projSepY = 104;
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
