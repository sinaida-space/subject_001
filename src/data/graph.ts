// ── The Constellation graph: skills (connective tissue) + projects (bright stars) ──
// Skills live here; projects come from projects.ts. buildGraph() fuses them into
// the nodes[]/edges[] the Constellation renders (canvas full mode + SVG lite mode).

import { PROJECTS, type Project } from './projects';

export type Category = 'tech' | 'direction' | 'strategy' | 'research' | 'analytical';

export const CATEGORY_COLORS: Record<Category, string> = {
  tech: '#00e5ff', // creative technology — cyan
  direction: '#fa0000', // creative direction — ECG red
  strategy: '#ff9933', // strategy & systems — amber
  research: '#cc66ff', // research interests — violet
  analytical: '#00ff88', // technical & analytical — green
};

export const CATEGORY_LABEL: Record<Category, string> = {
  tech: 'Creative Technology',
  direction: 'Creative Direction',
  strategy: 'Strategy & Systems',
  research: 'Research',
  analytical: 'Technical & Analytical',
};

export interface Skill {
  id: string;
  label: string;
  category: Category;
  /** always-labeled skill in the Signal Map — the top signals a producer scans for */
  accent?: boolean;
}

export const SKILLS: Skill[] = [
  // tech
  { id: 'touchdesigner', label: 'TouchDesigner', category: 'tech', accent: true },
  { id: 'audio-reactive', label: 'Real-time audio-reactive', category: 'tech' },
  { id: 'projection-mapping', label: 'Projection mapping', category: 'tech' },
  { id: 'generative-ai', label: 'Generative AI systems', category: 'tech' },
  { id: 'davinci', label: 'Editing and color grading', category: 'tech' },
  { id: 'creative-web', label: 'Creative web technology', category: 'tech' },
  { id: 'interactive-installations', label: 'Interactive installations', category: 'tech', accent: true },
  { id: 'body-tracking', label: 'Body & gesture tracking', category: 'tech', accent: true },
  // direction
  { id: 'creative-direction', label: 'Creative direction', category: 'direction' },
  { id: 'visual-narrative', label: 'Visual narrative', category: 'direction' },
  { id: 'concept-design', label: 'Concept design', category: 'direction' },
  { id: 'event-design', label: 'Event experience design', category: 'direction' },
  // strategy
  { id: 'tech-strategy', label: 'Creative technology strategy', category: 'strategy' },
  { id: 'interdisciplinary', label: 'Interdisciplinary leadership', category: 'strategy' },
  { id: 'experience-design', label: 'Digital experience design', category: 'strategy', accent: true },
  // research
  { id: 'computational-aesthetics', label: 'Computational aesthetics', category: 'research' },
  { id: 'human-ai', label: 'Human–AI collaboration', category: 'research' },
  { id: 'perception-media', label: 'Perception & generative media', category: 'research' },
  // analytical
  { id: 'algorithmic-systems', label: 'Algorithmic visual systems', category: 'analytical' },
  { id: 'system-architecture', label: 'System architecture', category: 'analytical' },
  { id: 'data-workflows', label: 'Data-driven workflows', category: 'analytical' },
  { id: 'ai-orchestration', label: 'AI orchestration', category: 'analytical' },
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
      label: p.title.split(' — ')[0], // short star label
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
