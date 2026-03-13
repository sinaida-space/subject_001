import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// ── Data ────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Creative Technology',
    color: '#00e5ff', // cyan
    items: [
      'TouchDesigner',
      'DaVinvi Resolve',
      'Generative AI systems',
      'Real-time audio-reactive visuals',
      'Projection mapping',
      'Post-production & color grading',
      'AI-assisted visual pipelines',
    ],
  },
  {
    name: 'Research Interests',
    color: '#cc66ff', // violet
    items: [
      'Computational aesthetics',
      'Human-AI creative collaboration',
      'Cognitive science of creativity',
      'Human perception and generative media',
    ],
  },
  {
    name: 'Strategic & Systems Thinking',
    color: '#ff9933', // amber/orange
    items: [
      'Creative technology strategy',
      'Interdisciplinary project leadership',
      'Cultural program development',
      'Digital experience design',
      'Experimental media systems',
    ],
  },
  {
    name: 'Technical & Analytical',
    color: '#00ff88', // green
    items: [
      'Computational design thinking',
      'Data-driven creative workflows',
      'Algorithmic visual systems',
      'System architecture & optimization',
      'Creative web technologies',
    ],
  },
  {
    name: 'Creative Direction',
    color: '#ff3333', // red
    items: [
      'Event experience design',
      'Visual narrative development',
      'Aesthetic systems & visual language design',
      'Narrative-driven visual systems',
      'Concept design',
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
    label: 'SIGNAL MAP',
    x: cx,
    y: cy,
    color: '#666666',
    type: 'root',
    parentId: null,
    angle: 0,
  });

  const catCount = CATEGORIES.length;
  const catRadius = 260;
  const skillRadius = 200;

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
    const fanSpread = Math.min(0.7, 0.18 * itemCount); // radians spread

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
  const [skillReveal, setSkillReveal] = useState(0); // 0 = hidden, 1 = fully revealed
  const animRef = useRef<number | null>(null);
  const isDesktop = useRef(true);

  // Check if desktop
  useEffect(() => {
    const check = () => { isDesktop.current = window.innerWidth >= 1024; };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Build layout centered in a virtual space
  const vw = 1400;
  const vh = 1050;
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

  // Animate entrance (categories only on desktop)
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1200;
    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      setProgress(easeOutQuart(t));
      if (t < 1) animRef.current = requestAnimationFrame(tick);
      else if (!isDesktop.current) {
        // On mobile/tablet, reveal skills immediately after entrance
        setSkillReveal(1);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [inView]);

  // Scroll-driven skill reveal (desktop only)
  useEffect(() => {
    if (!inView) return;
    const el = sectionRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!isDesktop.current) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // Start revealing when section top reaches 60% of viewport,
      // fully revealed when section top reaches 20% of viewport
      const startThreshold = viewH * 0.55;
      const endThreshold = viewH * 0.15;
      const t = 1 - (rect.top - endThreshold) / (startThreshold - endThreshold);
      setSkillReveal(Math.max(0, Math.min(1, t)));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial check
    return () => window.removeEventListener('scroll', onScroll);
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
      className="relative z-10 py-24"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <div
              className="font-mono uppercase text-primary"
              style={{ letterSpacing: '0.2em', fontSize: 12 }}
            >
              Signal Map
            </div>
            <div
              className="font-mono mt-2"
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}
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
          <div className="flex-1 relative min-h-[70vh]">
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
              const isSkillEdge = to.type === 'skill';

              const catName = CATEGORIES.find(c => c.color === edge.color)?.name;
              const dim = activeCategory && catName !== activeCategory;

              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              const cx = midX + (vw / 2 - midX) * 0.15;
              const cy = midY + (vh / 2 - midY) * 0.15;

              const pathLen = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
              const edgeProgress = isSkillEdge ? progress * skillReveal : progress;
              const drawn = edgeProgress * pathLen;

              const baseOpacity = dim ? 0.05 : 0.3;
              const finalOpacity = isSkillEdge ? baseOpacity * skillReveal : baseOpacity;

              return (
                <path
                  key={i}
                  d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={to.type === 'category' ? 1.5 : 0.8}
                  strokeOpacity={finalOpacity}
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

              // Skill nodes grow outward from their parent based on scroll
              let px: number, py: number;
              if (isSkill) {
                const parent = graph.nodes.find(n => n.id === node.parentId)!;
                const parentPx = vw / 2 + (parent.x - vw / 2) * progress;
                const parentPy = vh / 2 + (parent.y - vh / 2) * progress;
                const finalPx = vw / 2 + (node.x - vw / 2) * progress;
                const finalPy = vh / 2 + (node.y - vh / 2) * progress;
                px = parentPx + (finalPx - parentPx) * skillReveal;
                py = parentPy + (finalPy - parentPy) * skillReveal;
              } else {
                px = vw / 2 + (node.x - vw / 2) * progress;
                py = vh / 2 + (node.y - vh / 2) * progress;
              }

              const r = isRoot ? 8 : isCat ? 6 : 3.5;
              const labelSize = isRoot ? 14 : isCat ? 13 : 12;
              const labelWeight = isRoot || isCat ? 600 : 400;

              const skillScale = isSkill ? skillReveal : 1;
              const skillOpacity = isSkill ? skillReveal : 1;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'default' }}
                >
                  <circle
                    cx={px}
                    cy={py}
                    r={r * 3 * skillScale}
                    fill={node.color}
                    opacity={(dim ? 0.02 : isHovered ? 0.15 : 0.06) * skillOpacity}
                    style={{ transition: 'opacity 0.3s' }}
                  />
                  <circle
                    cx={px}
                    cy={py}
                    r={(isHovered ? r * 1.4 : r) * skillScale}
                    fill={node.color}
                    opacity={(dim ? 0.15 : 1) * skillOpacity}
                    style={{ transition: 'r 0.2s, opacity 0.3s' }}
                  />
                  {!isRoot && (
                    <text
                      x={px + (isSkill ? getLabelOffset(node) : 0)}
                      y={py + (isCat ? -14 : 4)}
                      textAnchor={isSkill ? getLabelAnchor(node) : 'middle'}
                      fill={node.color}
                      fontSize={isHovered ? labelSize + 1 : labelSize}
                      fontFamily="'Space Mono', monospace"
                      fontWeight={labelWeight}
                      opacity={(dim ? 0.1 : isHovered ? 1 : 0.9) * skillOpacity}
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
      </div>
    </section>
  );
}
