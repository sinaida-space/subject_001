// ── The Constellation graph: skills (connective tissue) + projects (bright stars) ──
// Skills live here; projects come from projects.ts. buildGraph() fuses them into
// the nodes[]/edges[] the Constellation renders (canvas full mode + SVG lite mode).

import { PROJECTS, type Project } from './projects';

// Four constellations: what drives the image (sound, body), what renders it
// (code), and where it meets people (space). A skill earns a star only if a
// buyer could hire for it directly; umbrella words that fit every work are
// left out. Drawn on the map as faint figure lines with a spaced name.
export type Category = 'sound' | 'body' | 'code' | 'space';

// Single source of truth for the constellation's off-white — canvas/SVG fill
// attributes here can't resolve CSS custom properties, so this is the one
// place the literal lives; everything else (ConstellationFull/Lite) imports
// it instead of re-typing the hex. See private/docs/design-system.md.
export const OFF_WHITE = '#f2efe9';

// A single red→off-white ramp, not a rainbow — categories read by
// lightness/saturation, matching the site's black-and-red signature.
export const CATEGORY_COLORS: Record<Category, string> = {
  space: '#cd0000', // sinaida-red, the core signature
  sound: '#ff5c5c',
  body: '#e8736b',
  code: '#d9a6a0',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  sound: 'Sound',
  body: 'Body',
  code: 'Code',
  space: 'Space',
};

export interface Skill {
  id: string;
  label: string;
  category: Category;
  /** always-labeled skill in the Signal Map — the top signals a producer scans for */
  accent?: boolean;
}

// Two tiers. The accent skills are the buyer-facing names, labeled bright at
// rest. Every other skill is labeled too, smaller and quieter.
export const SKILLS: Skill[] = [
  // sound: music and noise drive the image
  { id: 'audio-reactive', label: 'Audio-reactive visuals', category: 'sound', accent: true },
  { id: 'generative-sound', label: 'Generative sound', category: 'sound' },
  // body: the viewer is the controller, and the viewer's senses are the subject
  { id: 'body-tracking', label: 'Body & gesture tracking', category: 'body', accent: true },
  { id: 'head-coupled', label: 'Anamorphic & off-axis illusion', category: 'body' },
  { id: 'perception-media', label: 'Perception research', category: 'body' },
  // code: how the image is rendered
  { id: 'touchdesigner', label: 'TouchDesigner', category: 'code', accent: true },
  { id: 'creative-web', label: 'WebGL & shaders', category: 'code', accent: true },
  { id: 'algorithmic-systems', label: 'Generative visuals', category: 'code' },
  // space: where it meets people
  { id: 'event-design', label: 'Live concert visuals', category: 'space', accent: true },
  { id: 'interactive-installations', label: 'Interactive installations', category: 'space', accent: true },
];

// Extra dashed strokes between skills of different constellations, for pairs
// that belong together in practice (drawn like the in-constellation figures).
export const SKILL_LINKS: [string, string][] = [
  ['touchdesigner', 'audio-reactive'],
  ['event-design', 'audio-reactive'],
];

export const skillById = (id: string): Skill | undefined => SKILLS.find((s) => s.id === id);

// ── Graph model ────────────────────────────────────────────
export interface GraphNode {
  id: string;
  label: string;
  kind: 'project' | 'skill';
  category: Category;
  color: string;
  /** visual radius weight; projects are larger/brighter */
  weight: number;
  /** projects only: their full record for click behaviour + tooltips */
  project?: Project;
  /** always-labeled node in the Signal Map (hero project or accent skill) */
  accent?: boolean;
}

export interface GraphEdge {
  a: string; // node id
  b: string; // node id
  color: string;
}

/** Build the full node + edge set. Deterministic (stable order). */
export function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Only include skills that at least one project actually uses, so the
  // graph never shows an orphan star.
  const usedSkills = new Set<string>();
  PROJECTS.forEach((p) => p.skills.forEach((s) => usedSkills.add(s)));

  SKILLS.filter((s) => usedSkills.has(s.id)).forEach((s) => {
    nodes.push({
      id: s.id,
      label: s.label,
      kind: 'skill',
      category: s.category,
      color: CATEGORY_COLORS[s.category],
      weight: 0.62,
      accent: s.accent,
    });
  });

  PROJECTS.forEach((p) => {
    // A project inherits the colour of its dominant category (first skill's).
    const firstSkill = p.skills.map(skillById).find(Boolean);
    const category: Category = firstSkill ? firstSkill.category : 'tech';
    nodes.push({
      id: p.id,
      label: p.title, // short star label
      kind: 'project',
      category,
      color: CATEGORY_COLORS[category],
      weight: p.weight ?? 1,
      project: p,
      accent: p.hero,
    });

    p.skills.forEach((sid) => {
      if (usedSkills.has(sid)) {
        edges.push({ a: p.id, b: sid, color: CATEGORY_COLORS[category] });
      }
    });
  });

  return { nodes, edges };
}

/** Adjacency map: node id → set of connected node ids (both directions). */
export function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const add = (x: string, y: string) => {
    if (!adj.has(x)) adj.set(x, new Set());
    adj.get(x)!.add(y);
  };
  edges.forEach((e) => {
    add(e.a, e.b);
    add(e.b, e.a);
  });
  return adj;
}
