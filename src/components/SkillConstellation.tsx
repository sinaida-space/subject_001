import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';

// ── Data ────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Creative Direction',
    color: '#ff3333',
    // zone as fraction of canvas: xMin, xMax, yMin, yMax
    zone: [0.15, 0.42, 0.08, 0.38],
    items: [
      { name: 'Visual narrative development', importance: 0 },
      { name: 'Concept design for immersive environments', importance: 0 },
      { name: 'Aesthetic systems & visual language', importance: 1 },
      { name: 'Storytelling', importance: 1 },
      { name: 'Cultural & performance-based concepts', importance: 2 },
    ],
  },
  {
    name: 'Creative Technology',
    color: '#00e5ff',
    zone: [0.58, 0.90, 0.08, 0.42],
    items: [
      { name: 'TouchDesigner', importance: 0 },
      { name: 'Generative AI Systems', importance: 0 },
      { name: 'Real-time audio-reactive visuals', importance: 1 },
      { name: 'Procedural animation', importance: 1 },
      { name: 'AI-assisted visual pipelines', importance: 2 },
      { name: 'Post-production & color grading', importance: 2 },
    ],
  },
  {
    name: 'Strategic & Systems Thinking',
    color: '#ffffff',
    zone: [0.55, 0.88, 0.45, 0.72],
    items: [
      { name: 'Creative technology strategy', importance: 0 },
      { name: 'Interdisciplinary project leadership', importance: 0 },
      { name: 'Cultural program development', importance: 1 },
      { name: 'Digital experience design', importance: 1 },
      { name: 'Innovation & emerging media', importance: 2 },
    ],
  },
  {
    name: 'Technical & Analytical Foundations',
    color: '#00ff88',
    zone: [0.12, 0.48, 0.52, 0.85],
    items: [
      { name: 'Systems design thinking', importance: 0 },
      { name: 'Data-driven creative workflows', importance: 0 },
      { name: 'Algorithmic visual systems', importance: 1 },
      { name: 'Process architecture & optimization', importance: 1 },
      { name: 'Biomedical engineering (MSc)', importance: 2 },
    ],
  },
  {
    name: 'Research Interests',
    color: '#ff00aa',
    zone: [0.35, 0.65, 0.58, 0.88],
    items: [
      { name: 'AI and creativity research', importance: 0 },
      { name: 'Human-AI creative collaboration', importance: 0 },
      { name: 'Cognitive science of creativity', importance: 1 },
    ],
  },
];

// Cross-category bridges (dashed, white)
const BRIDGES: [string, string][] = [
  ['TouchDesigner', 'Real-time audio-reactive visuals'],
  ['Storytelling', 'Visual narrative development'],
  ['AI and creativity research', 'Generative AI Systems'],
];

interface NodeData {
  id: number;
  name: string;
  category: string;
  color: string;
  importance: number;
  x: number; // pixel position (set during layout)
  y: number;
  zoneIdx: number;
  phase: number;
}

interface EdgeData {
  a: number;
  b: number;
  bridge: boolean;
}

function buildNodesAndEdges(w: number, h: number) {
  const nodes: NodeData[] = [];
  let id = 0;

  // Place nodes in zones using grid-like spiral
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const cat = CATEGORIES[ci];
    const [zxMin, zxMax, zyMin, zyMax] = cat.zone;
    const zoneW = (zxMax - zxMin) * w;
    const zoneH = (zyMax - zyMin) * h;
    const zoneX = zxMin * w;
    const zoneY = zyMin * h;

    const count = cat.items.length;
    // Grid: determine cols/rows that fit with min spacing
    const minSpacingX = 110;
    const minSpacingY = 52;
    const cols = Math.max(1, Math.min(count, Math.floor(zoneW / minSpacingX)));
    const rows = Math.ceil(count / cols);

    const spacingX = cols > 1 ? zoneW / (cols + 1) : zoneW / 2;
    const spacingY = rows > 1 ? zoneH / (rows + 1) : zoneH / 2;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = zoneX + spacingX * (col + 1);
      const y = zoneY + spacingY * (row + 1);

      nodes.push({
        id: id++,
        name: cat.items[i].name,
        category: cat.name,
        color: cat.color,
        importance: cat.items[i].importance,
        x,
        y,
        zoneIdx: ci,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Collision resolution: push apart any nodes closer than 130px
  for (let iter = 0; iter < 150; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 130;
        if (dist < minDist && dist > 0.1) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          nodes[i].x -= nx * overlap;
          nodes[i].y -= ny * overlap;
          nodes[j].x += nx * overlap;
          nodes[j].y += ny * overlap;
        }
      }
    }
    // Clamp to zone bounds
    for (const node of nodes) {
      const cat = CATEGORIES[node.zoneIdx];
      const [zxMin, zxMax, zyMin, zyMax] = cat.zone;
      const pad = 20;
      node.x = Math.max(zxMin * w + pad, Math.min(zxMax * w - pad, node.x));
      node.y = Math.max(zyMin * h + pad, Math.min(zyMax * h - pad, node.y));
    }
  }

  // Build edges: 2 nearest within same category
  const edges: EdgeData[] = [];
  for (const cat of CATEGORIES) {
    const catNodes = nodes.filter(n => n.category === cat.name);
    for (const node of catNodes) {
      const others = catNodes
        .filter(n => n.id !== node.id)
        .sort((a, b) => {
          const da = (a.x - node.x) ** 2 + (a.y - node.y) ** 2;
          const db = (b.x - node.x) ** 2 + (b.y - node.y) ** 2;
          return da - db;
        });
      for (let i = 0; i < Math.min(2, others.length); i++) {
        const a = Math.min(node.id, others[i].id);
        const b = Math.max(node.id, others[i].id);
        if (!edges.some(e => e.a === a && e.b === b)) {
          edges.push({ a, b, bridge: false });
        }
      }
    }
  }

  // Cross-category bridges
  for (const [nameA, nameB] of BRIDGES) {
    const nA = nodes.find(n => n.name === nameA);
    const nB = nodes.find(n => n.name === nameB);
    if (nA && nB) {
      const a = Math.min(nA.id, nB.id);
      const b = Math.max(nA.id, nB.id);
      if (!edges.some(e => e.a === a && e.b === b)) {
        edges.push({ a, b, bridge: true });
      }
    }
  }

  return { nodes, edges };
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

// Determine label placement relative to dot based on zone position
function getLabelSide(node: NodeData, w: number, h: number) {
  const cat = CATEGORIES[node.zoneIdx];
  const [zxMin, zxMax, zyMin, zyMax] = cat.zone;
  const zoneCx = (zxMin + zxMax) / 2 * w;
  const zoneCy = (zyMin + zyMax) / 2 * h;

  const nearTop = node.y < zyMin * h + (zyMax - zyMin) * h * 0.2;
  const nearBottom = node.y > zyMax * h - (zyMax - zyMin) * h * 0.2;

  if (nearTop) return 'below';
  if (nearBottom) return 'above';
  if (node.x < zoneCx) return 'right';
  return 'left';
}

// ── Component ───────────────────────────────────────────────
export default function SkillConstellation() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [zoomedCategory, setZoomedCategory] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 800 });
  const animStartRef = useRef<number | null>(null);

  const graph = useMemo(
    () => buildNodesAndEdges(canvasSize.w, canvasSize.h),
    [canvasSize.w, canvasSize.h]
  );

  // Entrance offsets (random ±60px per node, consistent across renders)
  const entranceOffsets = useMemo(
    () => graph.nodes.map(() => ({
      dx: (Math.random() - 0.5) * 120,
      dy: (Math.random() - 0.5) * 120,
    })),
    [graph.nodes]
  );

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

  // Set start time on first view
  useEffect(() => {
    if (inView && animStartRef.current === null) {
      animStartRef.current = performance.now();
    }
  }, [inView]);

  // Measure canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setCanvasSize({ w: Math.round(width), h: Math.round(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Three.js for dots and lines only
  useEffect(() => {
    if (!canvasRef.current || !inView) return;

    const container = canvasRef.current;
    // Remove previous canvas if any
    const existing = container.querySelector('canvas');
    if (existing) container.removeChild(existing);

    const { w, h } = canvasSize;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, w, 0, h, 0.1, 100);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.insertBefore(renderer.domElement, container.firstChild);

    const { nodes, edges } = graph;
    const nodeCount = nodes.length;

    // Points
    const pointGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);
    const sizes = new Float32Array(nodeCount);
    const baseSizes = new Float32Array(nodeCount);

    for (let i = 0; i < nodeCount; i++) {
      positions[i * 3] = nodes[i].x;
      positions[i * 3 + 1] = h - nodes[i].y; // flip Y for Three.js
      positions[i * 3 + 2] = 0;
      const c = new THREE.Color(nodes[i].color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      const s = nodes[i].importance === 0 ? 22 : nodes[i].importance === 1 ? 16 : 10;
      sizes[i] = s;
      baseSizes[i] = s;
    }

    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pointGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const pointMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float core = smoothstep(0.5, 0.0, d);
          float glow = exp(-d * 4.0) * 0.5;
          float a = core + glow;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const points = new THREE.Points(pointGeo, pointMat);
    scene.add(points);

    // Solid edges
    const solidEdges = edges.filter(e => !e.bridge);
    const bridgeEdges = edges.filter(e => e.bridge);

    // Solid lines
    if (solidEdges.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      const linePos = new Float32Array(solidEdges.length * 6);
      const lineCol = new Float32Array(solidEdges.length * 6);

      for (let i = 0; i < solidEdges.length; i++) {
        const a = nodes[solidEdges[i].a];
        const b = nodes[solidEdges[i].b];
        linePos[i * 6] = a.x;
        linePos[i * 6 + 1] = h - a.y;
        linePos[i * 6 + 2] = 0;
        linePos[i * 6 + 3] = b.x;
        linePos[i * 6 + 4] = h - b.y;
        linePos[i * 6 + 5] = 0;
        const ca = new THREE.Color(a.color);
        const cb = new THREE.Color(b.color);
        const avg = new THREE.Color().addColors(ca, cb).multiplyScalar(0.5);
        for (let j = 0; j < 2; j++) {
          lineCol[i * 6 + j * 3] = avg.r;
          lineCol[i * 6 + j * 3 + 1] = avg.g;
          lineCol[i * 6 + j * 3 + 2] = avg.b;
        }
      }

      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.LineSegments(lineGeo, lineMat));
    }

    // Bridge lines (dashed)
    if (bridgeEdges.length > 0) {
      for (const edge of bridgeEdges) {
        const a = nodes[edge.a];
        const b = nodes[edge.b];
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x, h - a.y, 0),
          new THREE.Vector3(b.x, h - b.y, 0),
        ]);
        const mat = new THREE.LineDashedMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.18,
          dashSize: 4,
          gapSize: 4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        scene.add(line);
      }
    }

    // Animation
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = animStartRef.current ? (now - animStartRef.current) / 1000 : 0;

      const posArr = pointGeo.attributes.position.array as Float32Array;
      const sizeArr = pointGeo.attributes.size.array as Float32Array;

      for (let i = 0; i < nodeCount; i++) {
        // Entrance: stagger 25ms per node
        const delay = i * 0.025;
        const t = Math.min(Math.max((elapsed - delay) / 1.0, 0), 1);
        const eased = easeOutQuart(t);

        const finalX = nodes[i].x;
        const finalY = h - nodes[i].y;
        const startX = finalX + entranceOffsets[i].dx;
        const startY = finalY + entranceOffsets[i].dy;

        posArr[i * 3] = startX + (finalX - startX) * eased;
        posArr[i * 3 + 1] = startY + (finalY - startY) * eased;

        // Pulse
        const pulse = 1 + 0.12 * Math.sin(elapsed * 1.5 + nodes[i].phase);
        sizeArr[i] = baseSizes[i] * pulse;
      }

      pointGeo.attributes.position.needsUpdate = true;
      pointGeo.attributes.size.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      pointGeo.dispose();
      pointMat.dispose();
    };
  }, [inView, graph, canvasSize, entranceOffsets]);

  // Zoom transform for category click
  const zoomTransform = useMemo(() => {
    if (!zoomedCategory) return 'none';
    const cat = CATEGORIES.find(c => c.name === zoomedCategory);
    if (!cat) return 'none';
    const [zxMin, zxMax, zyMin, zyMax] = cat.zone;
    const cx = (zxMin + zxMax) / 2;
    const cy = (zyMin + zyMax) / 2;
    // Scale 1.35x, translate to center
    const tx = (0.5 - cx) * 100;
    const ty = (0.5 - cy) * 100;
    return `scale(1.35) translate(${tx}%, ${ty}%)`;
  }, [zoomedCategory]);

  const handleCategoryClick = useCallback((name: string) => {
    setZoomedCategory(prev => prev === name ? null : name);
  }, []);

  const activeCat = activeCategory || zoomedCategory;

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative z-10"
      style={{ minHeight: '100vh', padding: '4vh 3vw' }}
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
              const isActive = activeCat === cat.name;
              const dimmed = activeCat && !isActive;
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
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  {isActive && <span style={{ color: '#00e5ff', marginRight: 4 }}>▸</span>}
                  {cat.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN — canvas + labels */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ height: '90vh', minHeight: 600 }}
        >
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            style={{
              transform: zoomTransform,
              transition: 'transform 0.6s ease',
              transformOrigin: 'center center',
            }}
          >
            {/* HTML label overlays */}
            {graph.nodes.map((node, i) => {
              const side = getLabelSide(node, canvasSize.w, canvasSize.h);
              const isHovered = hoveredNode === node.id;
              const dim = activeCat ? (node.category !== activeCat ? true : false) : false;

              let labelStyle: React.CSSProperties = {
                position: 'absolute',
                fontSize: isHovered ? '13px' : '12px',
                fontFamily: 'monospace',
                color: node.color,
                opacity: dim ? 0.1 : isHovered ? 1 : 0.9,
                transition: 'opacity 0.2s, font-size 0.15s, text-shadow 0.2s',
                whiteSpace: 'nowrap',
                pointerEvents: 'auto',
                cursor: 'default',
                textShadow: isHovered
                  ? `0 0 8px ${node.color}`
                  : '0 0 12px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.7)',
              };

              // Position based on side
              if (side === 'right') {
                labelStyle.left = node.x + 10;
                labelStyle.top = node.y - 7;
              } else if (side === 'left') {
                labelStyle.right = canvasSize.w - node.x + 10;
                labelStyle.top = node.y - 7;
                labelStyle.textAlign = 'right';
              } else if (side === 'below') {
                labelStyle.left = node.x - 40;
                labelStyle.top = node.y + 12;
              } else {
                // above
                labelStyle.left = node.x - 40;
                labelStyle.top = node.y - 22;
              }

              return (
                <div
                  key={node.id}
                  style={labelStyle}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {node.name}
                </div>
              );
            })}

            {/* Tooltip */}
            {hoveredNode !== null && (() => {
              const node = graph.nodes.find(n => n.id === hoveredNode);
              if (!node) return null;
              return (
                <div
                  className="absolute pointer-events-none font-mono z-20"
                  style={{
                    left: node.x + 16,
                    top: node.y - 52,
                    background: 'rgba(0,0,0,0.9)',
                    border: '1px solid #00e5ff',
                    padding: '8px 12px',
                  }}
                >
                  <div style={{
                    color: node.color,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}>
                    {node.name}
                  </div>
                  <div style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '10px',
                    marginTop: '3px',
                  }}>
                    {node.category}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}
