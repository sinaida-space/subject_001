import { useEffect, useMemo, useRef, useState } from "react";

/* ---------------------------------- DATA --------------------------------- */

type Category = {
  name: string;
  color: string;
  items: string[];
};

const CATEGORIES: Category[] = [
  {
    name: "Creative Direction",
    color: "#ff3333",
    items: [
      "Event experience design",
      "Visual narrative development",
      "Aesthetic systems & visual language design",
      "Narrative-driven visual systems",
      "Cultural & performance-based concepts",
    ],
  },
  {
    name: "Creative Technology",
    color: "#00e5ff",
    items: [
      "TouchDesigner",
      "DaVinci Resolve",
      "Generative AI systems",
      "Projection-mapped visual systems",
      "Real-time audio-reactive visuals",
      "Procedural animation",
      "AI-assisted visual pipelines",
      "Post-production & color grading",
    ],
  },
  {
    name: "Strategic & Systems Thinking",
    color: "#ff9933",
    items: [
      "Creative technology strategy",
      "Interdisciplinary project leadership",
      "Cultural program development",
      "Digital experience design",
      "Experimental media systems",
    ],
  },
  {
    name: "Technical & Analytical",
    color: "#00ff88",
    items: [
      "Computational design thinking",
      "Data-driven creative workflows",
      "Algorithmic visual systems",
      "System architecture & optimization",
      "Biomedical engineering (MSc)",
      "Creative web technologies",
    ],
  },
  {
    name: "Research Interests",
    color: "#cc66ff",
    items: [
      "Computational aesthetics",
      "Human-AI creative collaboration",
      "Cognitive science of creativity",
      "Human perception and generative media",
    ],
  },
];

/* ---------------------------------- TYPES -------------------------------- */

type NodeType = "root" | "category" | "skill";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  type: NodeType;
  parent?: string;
  angle: number;
}

interface Edge {
  from: string;
  to: string;
  color: string;
}

/* ---------------------------- LAYOUT GENERATION --------------------------- */

function buildGraph(cx: number, cy: number) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "root",
    label: "Skill Map",
    x: cx,
    y: cy,
    color: "#888",
    type: "root",
    angle: 0,
  });

  const catRadius = 260;
  const skillRadius = 200;
  const startAngle = -Math.PI * 0.75;

  CATEGORIES.forEach((cat, ci) => {
    const angle = startAngle + (ci / CATEGORIES.length) * Math.PI * 2;

    const catX = cx + Math.cos(angle) * catRadius;
    const catY = cy + Math.sin(angle) * catRadius;

    const catId = `cat-${ci}`;

    nodes.push({
      id: catId,
      label: cat.name,
      x: catX,
      y: catY,
      color: cat.color,
      type: "category",
      parent: "root",
      angle,
    });

    edges.push({ from: "root", to: catId, color: cat.color });

    const spread = Math.min(0.7, cat.items.length * 0.18);

    cat.items.forEach((item, si) => {
      const t = cat.items.length === 1 ? 0 : si / (cat.items.length - 1) - 0.5;

      const skillAngle = angle + t * spread * 2;

      const x = catX + Math.cos(skillAngle) * skillRadius;
      const y = catY + Math.sin(skillAngle) * skillRadius;

      const skillId = `skill-${ci}-${si}`;

      nodes.push({
        id: skillId,
        label: item,
        x,
        y,
        color: cat.color,
        type: "skill",
        parent: catId,
        angle: skillAngle,
      });

      edges.push({ from: catId, to: skillId, color: cat.color });
    });
  });

  return { nodes, edges };
}

/* ------------------------------- COMPONENT -------------------------------- */

export default function SkillConstellation() {
  const vw = 1400;
  const vh = 1000;

  const graph = useMemo(() => buildGraph(vw / 2, vh / 2), []);

  const nodeMap = useMemo(
    () => Object.fromEntries(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes]
  );

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  /* ----------------------------- INTERACTION ----------------------------- */

  function isDim(node: Node) {
    if (!activeCategory) return false;

    if (node.type === "category") return node.label !== activeCategory;

    if (node.type === "skill") {
      const parent = nodeMap[node.parent!];
      return parent.label !== activeCategory;
    }

    return false;
  }

  /* ------------------------------- RENDER -------------------------------- */

  return (
    <section id="skills" className="relative py-24">

      {/* SEO CONTENT (CRAWLABLE) */}

      <div className="sr-only">
        <h2>Skills</h2>

        {CATEGORIES.map((cat) => (
          <section key={cat.name}>
            <h3>{cat.name}</h3>
            <ul>
              {cat.items.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* VISUAL INTERACTIVE MAP */}

      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full h-full">

        {/* EDGES */}

        {graph.edges.map((e, i) => {
          const from = nodeMap[e.from];
          const to = nodeMap[e.to];

          const dim = activeCategory &&
            CATEGORIES.find((c) => c.color === e.color)?.name !== activeCategory;

          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;

          const cx = mx + (vw / 2 - mx) * 0.15;
          const cy = my + (vh / 2 - my) * 0.15;

          return (
            <path
              key={i}
              d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
              stroke={e.color}
              strokeWidth={to.type === "category" ? 1.5 : 0.8}
              strokeOpacity={dim ? 0.05 : 0.35}
              fill="none"
            />
          );
        })}

        {/* NODES */}

        {graph.nodes.map((node) => {
          const dim = isDim(node);
          const hovered = hoverNode === node.id;

          const r = node.type === "root" ? 8 : node.type === "category" ? 6 : 3.5;

          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              aria-label={node.label}
              onMouseEnter={() => setHoverNode(node.id)}
              onMouseLeave={() => setHoverNode(null)}
              onFocus={() => setHoverNode(node.id)}
              onBlur={() => setHoverNode(null)}
              onClick={() => {
                if (node.type === "category") {
                  setActiveCategory(node.label);
                }
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={hovered ? r * 1.4 : r}
                fill={node.color}
                opacity={dim ? 0.2 : 1}
              />

              {node.type !== "root" && (
                <text
                  x={node.x}
                  y={node.y - 14}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize={12}
                  fontFamily="Space Mono"
                  opacity={dim ? 0.2 : 0.9}
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </section>
  );
}
