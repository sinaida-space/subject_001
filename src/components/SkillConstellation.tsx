import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';

// ── Skill Data ──────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Creative Direction',
    color: '#ff3333',
    centroid: [-280, 200],
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
    color: '#00e5ff',
    centroid: [280, 200],
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
    centroid: [300, -80],
    items: [
      'Creative technology strategy',
      'Interdisciplinary project leadership',
      'Cultural program development',
      'Digital experience design',
      'Innovation & emerging media',
    ],
  },
  {
    name: 'Technical & Analytical Foundations',
    color: '#00ff88',
    centroid: [-280, -160],
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
    centroid: [0, -240],
    items: [
      'AI and creativity research',
      'Human-AI creative collaboration',
      'Cognitive science of creativity',
    ],
  },
];

interface SkillNode {
  id: number;
  name: string;
  category: string;
  color: string;
  importance: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

interface Edge {
  a: number;
  b: number;
  cross: boolean;
}

const BRIDGES: [string, string][] = [
  ['TouchDesigner', 'Real-time audio-reactive visuals'],
  ['Storytelling', 'Concept design for immersive environments'],
  ['AI-assisted visual pipelines', 'AI and creativity research'],
  ['Systems design thinking', 'Creative technology strategy'],
  ['Generative AI Systems', 'Human-AI creative collaboration'],
];

function buildGraph() {
  const nodes: SkillNode[] = [];
  const edges: Edge[] = [];
  let id = 0;

  for (const cat of CATEGORIES) {
    for (let i = 0; i < cat.items.length; i++) {
      const importance = i < 2 ? 0 : i < 4 ? 1 : 2;
      nodes.push({
        id: id++,
        name: cat.items[i],
        category: cat.name,
        color: cat.color,
        importance,
        x: cat.centroid[0] + (Math.random() - 0.5) * 40,
        y: cat.centroid[1] + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Intra-category edges: connect to 2 nearest
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
      const count = Math.min(2, others.length);
      for (let i = 0; i < count; i++) {
        const a = Math.min(node.id, others[i].id);
        const b = Math.max(node.id, others[i].id);
        if (!edges.some(e => e.a === a && e.b === b)) {
          edges.push({ a, b, cross: false });
        }
      }
    }
  }

  for (const [nameA, nameB] of BRIDGES) {
    const nA = nodes.find(n => n.name === nameA);
    const nB = nodes.find(n => n.name === nameB);
    if (nA && nB) {
      const a = Math.min(nA.id, nB.id);
      const b = Math.max(nA.id, nB.id);
      if (!edges.some(e => e.a === a && e.b === b)) {
        edges.push({ a, b, cross: true });
      }
    }
  }

  return { nodes, edges };
}

function runForceLayout(nodes: SkillNode[], edges: Edge[], iterations: number) {
  const catCentroids: Record<string, number[]> = {};
  for (const cat of CATEGORIES) {
    catCentroids[cat.name] = [...cat.centroid];
  }

  for (let iter = 0; iter < iterations; iter++) {
    const decay = 1 - iter / iterations;

    // Strong repulsion to prevent overlap
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 5);
        // Very strong repulsion at close range
        const minDist = 70;
        const force = dist < minDist
          ? (20000 * decay) / (dist * dist)
          : (5000 * decay) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges (longer rest length)
    for (const edge of edges) {
      const a = nodes[edge.a];
      const b = nodes[edge.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rest = 100;
      const force = (dist - rest) * 0.03 * decay;
      const fx = (dx / Math.max(dist, 1)) * force;
      const fy = (dy / Math.max(dist, 1)) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Category clustering
    for (const node of nodes) {
      const c = catCentroids[node.category];
      node.vx += (c[0] - node.x) * 0.03 * decay;
      node.vy += (c[1] - node.y) * 0.03 * decay;
    }

    // Apply velocities
    for (const node of nodes) {
      node.vx *= 0.8;
      node.vy *= 0.8;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  for (const n of nodes) {
    n.vx = 0;
    n.vy = 0;
  }
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

// ── Component ───────────────────────────────────────────────
export default function SkillConstellation() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [, setHoveredNode] = useState<SkillNode | null>(null);
  const [inView, setInView] = useState(false);

  const graph = useMemo(() => {
    const g = buildGraph();
    runForceLayout(g.nodes, g.edges, 300);
    return g;
  }, []);

  const finalPositions = useMemo(() => graph.nodes.map(n => ({ x: n.x, y: n.y })), [graph]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inView) setInView(true);
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!canvasRef.current || !inView) return;

    const container = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    // Tighter frustum so nodes fill more of the canvas
    const frustum = Math.max(width, height) * 0.42;
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 1000
    );
    camera.position.set(0, 0, 500);
    camera.rotation.x = -8 * (Math.PI / 180);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const { nodes, edges } = graph;
    const nodeCount = nodes.length;

    const pointGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(nodeCount * 3);
    const colors = new Float32Array(nodeCount * 3);
    const sizes = new Float32Array(nodeCount);
    const baseSizes = new Float32Array(nodeCount);

    for (let i = 0; i < nodeCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const c = new THREE.Color(nodes[i].color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      const s = nodes[i].importance === 0 ? 24 : nodes[i].importance === 1 ? 16 : 10;
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
          gl_PointSize = size * (1.0 / -mvPos.z) * 500.0;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float glow = exp(-d * 6.0);
          if (glow < 0.01) discard;
          gl_FragColor = vec4(vColor, glow * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const points = new THREE.Points(pointGeo, pointMat);
    scene.add(points);

    // Edges
    const edgeCount = edges.length;
    const edgeGeo = new THREE.BufferGeometry();
    const edgePos = new Float32Array(edgeCount * 6);
    const edgeColors = new Float32Array(edgeCount * 6);

    for (let i = 0; i < edgeCount; i++) {
      const a = nodes[edges[i].a];
      const b = nodes[edges[i].b];
      const ca = new THREE.Color(a.color);
      const cb = new THREE.Color(b.color);
      const avg = new THREE.Color().addColors(ca, cb).multiplyScalar(0.5);
      for (let j = 0; j < 2; j++) {
        edgeColors[i * 6 + j * 3] = avg.r;
        edgeColors[i * 6 + j * 3 + 1] = avg.g;
        edgeColors[i * 6 + j * 3 + 2] = avg.b;
      }
      const mx = (finalPositions[edges[i].a].x + finalPositions[edges[i].b].x) / 2;
      const my = (finalPositions[edges[i].a].y + finalPositions[edges[i].b].y) / 2;
      for (let k = 0; k < 2; k++) {
        edgePos[i * 6 + k * 3] = mx;
        edgePos[i * 6 + k * 3 + 1] = my;
        edgePos[i * 6 + k * 3 + 2] = 0;
      }
    }

    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineSegments = new THREE.LineSegments(edgeGeo, edgeMat);
    scene.add(lineSegments);

    const mouseRef = { x: 0, y: 0 };
    const parallaxRef = { x: 0, y: 0 };
    const activeCatRef = { current: null as string | null };
    const hoveredRef = { current: null as number | null };
    const startTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      const entranceT = Math.min(elapsed / 1.4, 1);
      const eased = easeOutQuart(entranceT);

      const posArr = pointGeo.attributes.position.array as Float32Array;
      const sizeArr = pointGeo.attributes.size.array as Float32Array;

      parallaxRef.x += (mouseRef.x * 12 - parallaxRef.x) * 0.03;
      parallaxRef.y += (mouseRef.y * 12 - parallaxRef.y) * 0.03;

      let closestIdx: number | null = null;
      let closestDist = 40;
      const projectedPositions: { x: number; y: number }[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const fx = finalPositions[i].x;
        const fy = finalPositions[i].y;
        const px = fx * eased + parallaxRef.x;
        const py = fy * eased + parallaxRef.y;

        const pulse = 1 + 0.12 * Math.sin(elapsed * 1.2 + nodes[i].phase);
        posArr[i * 3] = px;
        posArr[i * 3 + 1] = py;
        posArr[i * 3 + 2] = 0;

        const aCat = activeCatRef.current;
        let catScale = 1;
        if (aCat) {
          catScale = nodes[i].category === aCat ? 1.3 : 0.3;
        }
        sizeArr[i] = baseSizes[i] * pulse * catScale;

        const vec = new THREE.Vector3(px, py, 0);
        vec.project(camera);
        const sx = (vec.x * 0.5 + 0.5) * width;
        const sy = (-vec.y * 0.5 + 0.5) * height;
        projectedPositions.push({ x: sx, y: sy });

        const mx2 = (mouseRef.x * 0.5 + 0.5) * width;
        const my2 = (-mouseRef.y * 0.5 + 0.5) * height;
        const dist = Math.sqrt((sx - mx2) ** 2 + (sy - my2) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      hoveredRef.current = closestIdx;
      pointGeo.attributes.position.needsUpdate = true;
      pointGeo.attributes.size.needsUpdate = true;

      // Edges
      const edgePosArr = edgeGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < edgeCount; i++) {
        const aIdx = edges[i].a;
        const bIdx = edges[i].b;
        const ax = posArr[aIdx * 3], ay = posArr[aIdx * 3 + 1];
        const bx = posArr[bIdx * 3], by = posArr[bIdx * 3 + 1];

        const edgeStart = 1.4 + i * 0.03;
        const edgeT = Math.min(Math.max((elapsed - edgeStart) / 0.6, 0), 1);

        const emx = (ax + bx) / 2;
        const emy = (ay + by) / 2;

        edgePosArr[i * 6] = emx + (ax - emx) * edgeT;
        edgePosArr[i * 6 + 1] = emy + (ay - emy) * edgeT;
        edgePosArr[i * 6 + 2] = 0;
        edgePosArr[i * 6 + 3] = emx + (bx - emx) * edgeT;
        edgePosArr[i * 6 + 4] = emy + (by - emy) * edgeT;
        edgePosArr[i * 6 + 5] = 0;
      }
      edgeGeo.attributes.position.needsUpdate = true;

      const baseOpacity = 0.2;
      const flickerOpacity = baseOpacity + Math.sin(elapsed * 3 + Math.random()) * 0.04;
      edgeMat.opacity = activeCatRef.current ? 0.08 : flickerOpacity;

      // Labels
      if (labelsRef.current && entranceT > 0.3) {
        const labelEls = labelsRef.current.children;
        for (let i = 0; i < Math.min(labelEls.length, nodeCount); i++) {
          const el = labelEls[i] as HTMLElement;
          const p = projectedPositions[i];
          if (p) {
            el.style.transform = `translate(${p.x + 10}px, ${p.y - 8}px)`;
            const isHovered = hoveredRef.current === i;
            const aCat = activeCatRef.current;
            let op = 0.85;
            if (aCat) {
              op = nodes[i].category === aCat ? 1 : 0.12;
            }
            if (isHovered) op = 1;
            el.style.opacity = String(op);
            el.style.fontWeight = isHovered ? '700' : '400';
          }
        }
      }

      // Tooltip
      if (tooltipRef.current) {
        if (closestIdx !== null) {
          const p = projectedPositions[closestIdx];
          const node = nodes[closestIdx];
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.transform = `translate(${p.x + 16}px, ${p.y - 44}px)`;
          tooltipRef.current.innerHTML = `
            <div style="color:${node.color};font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">${node.name}</div>
            <div style="color:rgba(255,255,255,0.5);font-size:10px;margin-top:3px">${node.category}</div>
          `;
        } else {
          tooltipRef.current.style.display = 'none';
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const catInterval = setInterval(() => {
      activeCatRef.current = (sectionRef.current as any)?.__activeCat ?? null;
    }, 50);

    const hoverInterval = setInterval(() => {
      const idx = hoveredRef.current;
      const node = idx !== null ? nodes[idx] : null;
      setHoveredNode(prev => {
        if (prev?.id === node?.id) return prev;
        return node;
      });
    }, 60);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const f = Math.max(w, h) * 0.42;
      const a = w / h;
      camera.left = -f * a;
      camera.right = f * a;
      camera.top = f;
      camera.bottom = -f;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(catInterval);
      clearInterval(hoverInterval);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      pointGeo.dispose();
      pointMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
    };
  }, [inView, graph, finalPositions]);

  useEffect(() => {
    if (sectionRef.current) {
      (sectionRef.current as any).__activeCat = activeCategory;
    }
  }, [activeCategory]);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="relative z-10"
      style={{ minHeight: '100vh', padding: '6vh 4vw' }}
    >
      <div className="flex flex-col md:flex-row gap-8 md:gap-12 max-w-[1400px] mx-auto">
        {/* LEFT COLUMN */}
        <div className="md:w-1/5 md:sticky md:top-[15vh] md:self-start">
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
                  className="font-mono text-xs cursor-pointer transition-all duration-200"
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

        {/* RIGHT COLUMN */}
        <div className="md:w-4/5 relative" style={{ height: '80vh', minHeight: 500 }}>
          <div ref={canvasRef} className="w-full h-full" />

          {/* Node labels */}
          <div
            ref={labelsRef}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            {graph.nodes.map(node => (
              <div
                key={node.id}
                className="absolute font-mono whitespace-nowrap"
                style={{
                  fontSize: '13px',
                  color: node.color,
                  opacity: 0.85,
                  transition: 'opacity 0.2s, font-weight 0.2s',
                  willChange: 'transform',
                  textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)',
                }}
              >
                {node.name}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none font-mono"
            style={{
              display: 'none',
              background: 'rgba(0,0,0,0.9)',
              border: '1px solid #00e5ff',
              padding: '8px 12px',
              zIndex: 10,
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </section>
  );
}
