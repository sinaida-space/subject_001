import type { Category } from '@/data/graph';

// The order the map builds itself in (#121), as windows of build progress u
// (0..1, from workBuildBus). One impulse is handed on star to star: it jumps
// into each constellation, sound → space → code → body, and grows that
// figure's strokes in the order its tree was built. Then the skill names
// develop as the globe of stars unrolls into the flat map, then every work
// lights where its skills' impulses meet, then the map beats twice.

export interface BuildNode { id: string; kind: 'project' | 'skill'; category: Category; accent?: boolean; weight: number }
export interface Hop { from: string | null; to: string; u0: number; u1: number; axon: boolean }
export interface BuildTimeline {
  hops: Hop[];
  ignite: Map<string, number>; // skill lights up
  figure: Map<string, Hop>; // 'a|b' of a figure stroke → the hop that grows it
  catEnd: Map<Category, number>;
  label: Map<string, [number, number]>; // name develops
  work: Map<string, [number, number]>; // impulses converge on a work
  unfold: [number, number]; // the globe unrolls into the flat map
  beat: [number, number];
}

const ORDER: Category[] = ['sound', 'space', 'code', 'body'];
const CATS: [number, number] = [0, 0.28];
const NAMES: [number, number] = [0.38, 0.5];
const WORKS: [number, number] = [0.5, 0.8];

export function buildTimeline(nodes: BuildNode[], figures: { a: { id: string }; b: { id: string }; cat: Category }[]): BuildTimeline {
  const hops: Hop[] = [];
  const ignite = new Map<string, number>();
  const figure = new Map<string, Hop>();
  const catEnd = new Map<Category, number>();
  const label = new Map<string, [number, number]>();
  const work = new Map<string, [number, number]>();

  const span = (CATS[1] - CATS[0]) / ORDER.length;
  let prev: string | null = null;
  ORDER.forEach((cat, k) => {
    const members = nodes.filter((n) => n.kind === 'skill' && n.category === cat);
    if (!members.length) return;
    // the figure's own strokes, in the order its spanning tree added them
    const strokes = figures.filter((f) => f.cat === cat && members.some((m) => m.id === f.a.id) && members.some((m) => m.id === f.b.id));
    const first = strokes[0]?.a.id ?? members[0].id;
    let u = CATS[0] + k * span;
    const jump: Hop = { from: prev, to: first, u0: u, u1: u + span * 0.35, axon: false };
    hops.push(jump);
    u = jump.u1;
    ignite.set(first, u);
    const step = strokes.length ? (span * 0.65) / strokes.length : 0;
    for (const s of strokes) {
      const h: Hop = { from: s.a.id, to: s.b.id, u0: u, u1: u + step, axon: true };
      hops.push(h);
      figure.set(`${s.a.id}|${s.b.id}`, h);
      u += step;
      if (!ignite.has(s.b.id)) ignite.set(s.b.id, u);
    }
    // a member the tree did not reach still lights with its figure
    members.forEach((m) => { if (!ignite.has(m.id)) ignite.set(m.id, u); });
    catEnd.set(cat, u);
    prev = strokes.length ? strokes[strokes.length - 1].b.id : first;
  });

  // skill names, in the order the stars lit
  const skills = nodes.filter((n) => n.kind === 'skill').sort((a, b) => (ignite.get(a.id) ?? 0) - (ignite.get(b.id) ?? 0));
  skills.forEach((n, i) => {
    const u0 = NAMES[0] + ((NAMES[1] - NAMES[0] - 0.04) * i) / Math.max(1, skills.length - 1);
    label.set(n.id, [u0, u0 + 0.04]);
  });

  // works, flagships first; each one's name develops once it has lit
  const works = nodes.filter((n) => n.kind === 'project').sort((a, b) => Number(!!b.accent) - Number(!!a.accent) || b.weight - a.weight);
  const wStep = (WORKS[1] - WORKS[0] - 0.06) / Math.max(1, works.length - 1);
  works.forEach((n, j) => {
    const u0 = WORKS[0] + j * wStep;
    work.set(n.id, [u0, u0 + 0.05]);
    label.set(n.id, [u0 + 0.05, u0 + 0.09]);
  });

  return { hops, ignite, figure, catEnd, label, work, unfold: [0.28, 0.42], beat: [0.86, 1] };
}

// two heartbeats over u in 0..1, the logo's own ECG (P, QRS, T)
export function ecg(u: number): number {
  let v = 0;
  for (const c of [0.28, 0.72]) {
    const x = (u - c) * 14;
    v += 0.18 * Math.exp(-(x + 2.2) * (x + 2.2) * 1.5)
      - 0.25 * Math.exp(-(x + 0.35) * (x + 0.35) * 30)
      + Math.exp(-x * x * 40)
      - 0.35 * Math.exp(-(x - 0.4) * (x - 0.4) * 30)
      + 0.3 * Math.exp(-(x - 2.4) * (x - 2.4) * 1.2);
  }
  return Math.max(0, v);
}

// Je suis le spectre d'une rose que tu portais hier au bal.
