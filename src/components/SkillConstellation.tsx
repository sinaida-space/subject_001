import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// ── Data ────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Creative Direction',
    color: '#ff3333', // red
    items: [
      'Visual narrative development',
      'Concept design for immersive environments',
      'Aesthetic systems & visual language',
      'Storytelling',
      'Cultural & performance-based concepts',
    ],
  },
  {
    name: 'Creative Technology',
    color: '#00e5ff', // cyan
    items: [
      'TouchDesigner',
      'Generative AI Systems',
      'Real-time audio-reactive visuals',
      'Procedural animation',
      'AI-assisted visual pipelines',
      'Post-production & color grading',
    ],
  },
  {
    name: 'Strategic & Systems Thinking',
    color: '#ffffff',
    items: [
      'Creative technology strategy',
      'Interdisciplinary project leadership',
      'Cultural program development',
      'Digital experience design',
      'Innovation & emerging media',
    ],
  },
  {
    name: 'Technical & Analytical',
    color: '#00ff88',
    items: [
      'Systems design thinking',
      'Data-driven creative workflows',
      'Algorithmic visual systems',
      'Process architecture & optimization',
      'Biomedical engineering (MSc)',
    ],
  },
  {
    name: 'Research Interests',
    color: '#ff00aa',
    items: [
      'AI and creativity research',
      'Human-AI creative collaboration',
      'Cognitive science of creativity',
    ],
  },
];

interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  type: 'root' | 'category' | 'skill';
  parentId: string | null;
  angle: number;
}

interface MindMapEdge {
  from: string;
  to: string;
  color: string;
}

function buildMindMap(cx: number, cy: number) {
  const nodes: MindMapNode[] = [];
  const edges: MindMapEdge[] = [];

  // Root node at center
  nodes.push({
    id: 'root',
    label: 'CAPABILITIES',
    x: cx,
    y: cy,
    color: '#ff3333',
    type: 'root',
    parentId: null,
    angle: 0,
  });

  const catCount = CATEGORIES.length;
  const catRadius = 220;
  const skillRadius = 170;

  // Distribute categories evenly around the circle
  // Start from top-left (-135°) and go clockwise
  const startAngle = -Math.PI * 0.75;

  for (let ci = 0; ci < catCount; ci++) {
    const cat = CATEGORIES[ci];
    const angle = startAngle + (ci / catCount) * Math.PI * 2;
    const catX = cx + Math.cos(angle) * catRadius;
    const catY = cy + Math.sin(angle) * catRadius;
    const catId = `cat-${ci}`;

    nodes.push({
      id: catId,
      label: cat.name,
      x: catX,
      y: catY,
      color: cat.color,
      type: 'category',
      parentId: 'root',
      angle,
    });

    edges.push({ from: 'root', to: catId, color: cat.color });

    // Spread skills in a fan from the category node
    const itemCount = cat.items.length;
    const fanSpread = Math.min(0.55, 0.15 * itemCount); // radians spread

    for (let si = 0; si < itemCount; si++) {
      const t = itemCount === 1 ? 0 : (si / (itemCount - 1)) - 0.5;
      const skillAngle = angle + t * fanSpread * 2;
      const skillX = catX + Math.cos(skillAngle) * skillRadius;
      const skillY = catY + Math.sin(skillAngle) * skillRadius;
      const skillId = `skill-${ci}-${si}`;

      nodes.push({
        id: skillId,
        label: cat.items[si],
        x: skillX,
        y: skillY,
        color: cat.color,
        type: 'skill',
        parentId: catId,
        angle: skillAngle,
      });

      edges.push({ from: catId, to: skillId, color: cat.color });
    }
  }

  return { nodes, edges };
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

// ── Component ───────────────────────────────────────────────
export default function SkillConstellation() {
  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);

  // Build layout centered in a virtual space
  const vw = 1200;
  const vh = 900;
  const graph = useMemo(() => buildMindMap(vw / 2, vh / 2), []);

  // Observe section
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !inView) setInView(true); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView]);

  // Animate entrance
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1200;
    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      setProgress(easeOutQuart(t));
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [inView]);

  // Get label alignment based on angle
  const getLabelAnchor = useCallback((node: MindMapNode) => {
    const deg = (node.angle * 180 / Math.PI + 360) % 360;
    if (deg > 90 && deg < 270) return 'end';
    return 'start';
  }, []);

  const getLabelOffset = useCallback((node: MindMapNode) => {
    const anchor = getLabelAnchor(node);
    return anchor === 'end' ? -14 : 14;
  }, [getLabelAnchor]);

  const activeCatObj = CATEGORIES.find(c => c.name === activeCategory);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative z-10"
      style={{ minHeight: '100vh', padding: '4vh 2vw' }}
    >
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-[1600px] mx-auto">
        {/* LEFT COLUMN */}
        <div className="md:w-[180px] shrink-0 md:sticky md:top-[15vh] md:self-start">
          <div
            className="font-mono uppercase"
            style={{ color: 'hsl(var(--primary))', letterSpacing: '0.2em', fontSize: '11px' }}
          >
            Capabilities
          </div>
          <div
            className="font-mono mt-2"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}
          >
            [ SKILLS ]
          </div>

          <div className="mt-8 space-y-3">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.name;
              const dimmed = activeCategory && !isActive;
              return (
                <div
                  key={cat.name}
                  className="font-mono text-xs cursor-pointer transition-all duration-200 select-none"
                  style={{
                    color: isActive ? '#00e5ff' : cat.color,
                    opacity: dimmed ? 0.25 : isActive ? 1 : 0.7,
                    paddingLeft: isActive ? '8px' : '0px',
                  }}
                  onMouseEnter={() => setActiveCategory(cat.name)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {isActive && <span style={{ color: '#00e5ff', marginRight: 4 }}>▸</span>}
                  {cat.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN — SVG mind map */}
        <div className="flex-1 relative" style={{ minHeight: '85vh' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${vw} ${vh}`}
            className="w-full h-full"
            style={{ minHeight: '85vh' }}
          >
            {/* Edges */}
            {graph.edges.map((edge, i) => {
              const from = graph.nodes.find(n => n.id === edge.from)!;
              const to = graph.nodes.find(n => n.id === edge.to)!;

              // Dim edges not in active category
              const catName = CATEGORIES.find(c => c.color === edge.color)?.name;
              const dim = activeCategory && catName !== activeCategory;

              // Curved path
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              // Slight curve toward center
              const cx = midX + (vw / 2 - midX) * 0.15;
              const cy = midY + (vh / 2 - midY) * 0.15;

              const pathLen = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
              const drawn = progress * pathLen;

              return (
                <path
                  key={i}
                  d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={to.type === 'category' ? 1.5 : 0.8}
                  strokeOpacity={dim ? 0.05 : 0.3}
                  strokeDasharray={pathLen}
                  strokeDashoffset={pathLen - drawn}
                  style={{ transition: 'stroke-opacity 0.3s' }}
                />
              );
            })}

            {/* Nodes */}
            {graph.nodes.map(node => {
              const isRoot = node.type === 'root';
              const isCat = node.type === 'category';
              const isSkill = node.type === 'skill';
              const isHovered = hoveredNode === node.id;

              // Determine if this node belongs to active category
              let belongsToActive = false;
              if (activeCategory) {
                if (isCat) belongsToActive = node.label === activeCategory;
                if (isSkill) {
                  const parentCat = graph.nodes.find(n => n.id === node.parentId);
                  belongsToActive = parentCat?.label === activeCategory;
                }
                if (isRoot) belongsToActive = true;
              }
              const dim = activeCategory ? !belongsToActive : false;

              // Entrance: nodes fly from root outward
              const dx = node.x - vw / 2;
              const dy = node.y - vh / 2;
              const px = vw / 2 + dx * progress;
              const py = vh / 2 + dy * progress;

              const r = isRoot ? 8 : isCat ? 6 : 3.5;
              const labelSize = isRoot ? 14 : isCat ? 13 : 12;
              const labelWeight = isRoot || isCat ? 600 : 400;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'default' }}
                >
                  {/* Glow ring */}
                  <circle
                    cx={px}
                    cy={py}
                    r={r * 3}
                    fill={node.color}
                    opacity={dim ? 0.02 : isHovered ? 0.15 : 0.06}
                    style={{ transition: 'opacity 0.3s' }}
                  />
                  {/* Dot */}
                  <circle
                    cx={px}
                    cy={py}
                    r={isHovered ? r * 1.4 : r}
                    fill={node.color}
                    opacity={dim ? 0.15 : 1}
                    style={{ transition: 'r 0.2s, opacity 0.3s' }}
                  />
                  {/* Label */}
                  {!isRoot && (
                    <text
                      x={px + (isSkill ? getLabelOffset(node) : 0)}
                      y={py + (isCat ? -14 : 4)}
                      textAnchor={isSkill ? getLabelAnchor(node) : 'middle'}
                      fill={node.color}
                      fontSize={isHovered ? labelSize + 1 : labelSize}
                      fontFamily="'Space Mono', monospace"
                      fontWeight={labelWeight}
                      opacity={dim ? 0.1 : isHovered ? 1 : 0.9}
                      style={{
                        transition: 'opacity 0.3s, font-size 0.15s',
                        filter: isHovered ? `drop-shadow(0 0 6px ${node.color})` : 'none',
                      }}
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
    </section>
  );
}
