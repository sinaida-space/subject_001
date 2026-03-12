import { useEffect, useRef, useState, useMemo, useCallback } from "react";

/* ------------------------------------------------------------ */
/* DATA */
/* ------------------------------------------------------------ */

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

/* ------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------ */

type NodeType = "root" | "category" | "skill";

interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  type: NodeType;
  parentId: string | null;
  angle: number;
}

interface MindMapEdge {
  from: string;
  to: string;
  color: string;
}

/* ------------------------------------------------------------ */
/* GRAPH GENERATOR */
/* ------------------------------------------------------------ */

function buildMindMap(cx: number, cy: number) {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];

  nodes.push({
    id: "root",
    label: "CREATIVE SYSTEMS",
    x: cx,
    y: cy,
    color: "#777",
    type: "root",
    parentId: null,
    angle: 0,
  });

  const catRadius = 280;
  const skillRadius = 340;
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
      parentId: "root",
      angle,
    });

    edges.push({ from: "root", to: catId, color: cat.color });

    const fanSpread = Math.min(0.7, 0.18 * cat.items.length);

    cat.items.forEach((item, si) => {
      const t = (si / (cat.items.length - 1 || 1)) - 0.5;
      const skillAngle = angle + t * fanSpread * 2;

      const skillX = catX + Math.cos(skillAngle) * skillRadius;
      const skillY = catY + Math.sin(skillAngle) * skillRadius;

      const skillId = `skill-${ci}-${si}`;

      nodes.push({
        id: skillId,
        label: item,
        x: skillX,
        y: skillY,
        color: cat.color,
        type: "skill",
        parentId: catId,
        angle: skillAngle,
      });

      edges.push({ from: catId, to: skillId, color: cat.color });
    });
  });

  return { nodes, edges };
}

/* ------------------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------------------ */

export default function SkillConstellation() {
  const sectionRef = useRef<HTMLElement>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const vw = 1400;
  const vh = 1050;

  const graph = useMemo(() => buildMindMap(vw / 2, vh / 2), []);

  /* Fast lookup instead of .find() */
  const nodeMap = useMemo(() => {
    const map = new Map<string, MindMapNode>();
    graph.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [graph.nodes]);

  /* Category toggle (desktop + mobile) */

  const toggleCategory = useCallback((name: string) => {
    setActiveCategory((prev) => (prev === name ? null : name));
  }, []);

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="relative py-24"
    >
      <div className="container mx-auto px-6 max-w-7xl">

        {/* -------------------------------------------------- */}
        {/* SEO / CRAWLER FRIENDLY SKILL LIST */}
        {/* -------------------------------------------------- */}

        <div className="sr-only">
          <h2>Skills</h2>
          {CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <h3>{cat.name}</h3>
              <ul>
                {cat.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-10">

          {/* -------------------------------------------------- */}
          {/* CATEGORY NAVIGATION */}
          {/* -------------------------------------------------- */}

          <div className="md:w-[220px] shrink-0">

            <h3 className="font-mono uppercase tracking-[0.2em] text-sm">
              Skill Map
            </h3>

            <ul className="mt-8 space-y-3">

              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.name;

                return (
                  <li key={cat.name}>
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="font-mono text-xs transition"
                      style={{
                        color: active ? "#00e5ff" : cat.color,
                        opacity: activeCategory && !active ? 0.3 : 1,
                      }}
                    >
                      {cat.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* -------------------------------------------------- */}
          {/* CONSTELLATION GRAPH */}
          {/* -------------------------------------------------- */}

          <div className="flex-1">

            <svg
              viewBox={`0 0 ${vw} ${vh}`}
              className="w-full h-full"
            >
              {graph.edges.map((edge, i) => {
                const from = nodeMap.get(edge.from)!;
                const to = nodeMap.get(edge.to)!;

                const dim =
                  activeCategory &&
                  !to.label.includes(activeCategory) &&
                  to.type !== "root";

                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={edge.color}
                    strokeOpacity={dim ? 0.05 : 0.35}
                  />
                );
              })}

              {graph.nodes.map((node) => {
                const dim =
                  activeCategory &&
                  node.type !== "root" &&
                  !node.label.includes(activeCategory);

                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.type === "root" ? 8 : 4}
                      fill={node.color}
                      opacity={dim ? 0.2 : 1}
                    />

                    {node.type !== "root" && (
                      <text
                        x={node.x + 10}
                        y={node.y + 4}
                        fontSize={12}
                        fill={node.color}
                        fontFamily="Space Mono"
                      >
                        {node.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}