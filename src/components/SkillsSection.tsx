import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import DustReveal from '@/components/DustReveal';

const SKILLS = [
  {
    category: 'Creative Direction',
    items: [
      'Visual narrative development',
      'Concept design for immersive environments',
      'Aesthetic systems & visual language design',
      'Storytelling',
      'Cultural and performance-based visual concepts'
    ]
  },
  {
    category: 'Creative Technology',
    items: [
      'TouchDesigner',
      'Generative AI Systems (LLM, diffusion workflows)',
      'Real-time audio-reactive visuals',
      'Procedural animation',
      'AI-assisted visual pipelines',
      'Post-production (editing and color grading)'
    ]
  },
  {
    category: 'Strategic & Systems Thinking',
    items: [
      'Creative technology strategy',
      'Interdisciplinary project leadership',
      'Cultural program development',
      'Digital experience design',
      'Innovation & emerging media strategy'
    ]
  },
  {
    category: 'Technical & Analytical Foundations',
    items: [
      'Systems design thinking',
      'Data-driven creative workflows',
      'Algorithmic thinking for visual systems',
      'Process architecture & optimization',
      'Biomedical engineering (MSc)'
    ]
  },
  {
    category: 'Research Interests',
    items: [
      'AI and creativity research',
      'Human-AI creative collaboration',
      'Cognitive science of creativity'
    ]
  }
];

const SERVICES = [
  {
    code: 'SRV.001',
    title: 'Immersive Visuals',
    description: 'Visual systems for event spaces, stages, exhibitions, and projection mapping. Interactive and realtime environments.'
  },
  {
    code: 'SRV.002',
    title: 'Creative Direction',
    description: 'Developing consistent visual languages across video, static media, and interactive installations.'
  },
  {
    code: 'SRV.003',
    title: 'Digital Art',
    description: 'Custom audio-reactive and data-driven procedural animations for performances and curated environments.'
  },
  {
    code: 'SRV.004',
    title: 'Conceptual Storytelling',
    description: 'Translating complex philosophical and ethical themes into compelling visual narratives.'
  }
];

function Services3DGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const [cursorStyle, setCursorStyle] = useState('default');
  const [hoveredService, setHoveredService] = useState<typeof SERVICES[0] | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const panelGroup = new THREE.Group();
    scene.add(panelGroup);

    const panels: THREE.Mesh[] = [];
    const radius = 4.0;
    const panelHeights = [0.3, -0.2, 0.1, -0.35];

    // Create text canvases for each service card
    SERVICES.forEach((service, i) => {
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = 512;
      cardCanvas.height = 320;
      const ctx = cardCanvas.getContext('2d')!;

      // Background
      ctx.fillStyle = 'rgba(10, 5, 8, 0.85)';
      ctx.fillRect(0, 0, 512, 320);

      // Border
      ctx.strokeStyle = 'rgba(200, 16, 46, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, 510, 318);

      // Code label
      ctx.fillStyle = '#c8102e';
      ctx.font = '600 13px monospace';
      ctx.letterSpacing = '2px';
      ctx.fillText(service.code, 32, 48);

      // Title
      ctx.fillStyle = '#f2ede8';
      ctx.font = '500 24px serif';
      ctx.fillText(service.title, 32, 100);

      // Description (word wrap)
      ctx.fillStyle = 'rgba(242, 237, 232, 0.55)';
      ctx.font = '14px monospace';
      const words = service.description.split(' ');
      let line = '';
      let y = 145;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > 440) {
          ctx.fillText(line, 32, y);
          line = word + ' ';
          y += 22;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, 32, y);

      const texture = new THREE.CanvasTexture(cardCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      const geometry = new THREE.PlaneGeometry(3.0, 1.9);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = panelHeights[i];

      mesh.lookAt(mesh.position.x * 2, mesh.position.y, mesh.position.z * 2);

      mesh.userData = { index: i, service };
      panels.push(mesh);
      panelGroup.add(mesh);
    });

    panelGroup.position.z = -radius;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let animFrame = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartRotation = 0;
    let revealProgress = 0;
    let targetReveal = 0;

    const observer = new IntersectionObserver(
      ([entry]) => { targetReveal = entry.isIntersecting ? 1 : 0; },
      { threshold: [0, 0.2] }
    );
    observer.observe(container);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (isDragging) {
        const deltaX = (e.clientX - dragStartX) / width;
        targetRotationY = dragStartRotation + deltaX * Math.PI * 2;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartRotation = targetRotationY;
    };

    const handleMouseUp = () => { isDragging = false; };

    const handleWheel = (e: WheelEvent) => {
      targetRotationY += e.deltaY * 0.002;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: true });

    const animate = () => {
      animFrame = requestAnimationFrame(animate);

      revealProgress += (targetReveal - revealProgress) * 0.08;
      panelGroup.rotation.y += (targetRotationY - panelGroup.rotation.y) * 0.08;

      // Raycasting
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(panels);
      const newHovered = intersects.length > 0 ? (intersects[0].object as THREE.Mesh).userData.index : null;

      if (newHovered !== hoveredIndexRef.current) {
        hoveredIndexRef.current = newHovered;
        setCursorStyle(newHovered !== null ? 'pointer' : 'default');
        setHoveredService(newHovered !== null ? SERVICES[newHovered] : null);
      }

      if (!isDragging) {
        panels.forEach((panel, i) => {
          const hoverTarget = hoveredIndexRef.current === null ? 1 : hoveredIndexRef.current === i ? 1.12 : 0.9;
          const revealScale = 0.3 + revealProgress * 0.7;
          const finalTarget = hoverTarget * revealScale;
          panel.scale.lerp(new THREE.Vector3(finalTarget, finalTarget, finalTarget), 0.08);

          const mat = panel.material as THREE.MeshBasicMaterial;
          const targetOpacity = hoveredIndexRef.current === null ? revealProgress : hoveredIndexRef.current === i ? revealProgress : revealProgress * 0.5;
          mat.opacity += (targetOpacity - mat.opacity) * 0.08;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animFrame);
      panels.forEach((p) => { p.geometry.dispose(); (p.material as THREE.MeshBasicMaterial).dispose(); });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: '70vh', cursor: cursorStyle }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export default function SkillsSection() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="process" className="relative z-10 py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="section-divider mb-20" />

        {/* Services - 3D Gallery */}
        <div className="mb-32">
          <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 mb-8">
            <div className="col-span-12 md:col-span-3">
              <span className="clinical-label text-primary">Services</span>
              <div className="mt-2 text-xs font-clinical text-muted-foreground">[ VALUE // ACTIVE ]</div>
            </div>
          </div>
          <Services3DGallery />
        </div>

        {/* Skills Matrix - Checkerboard */}
        <div className="section-divider mb-20" />
        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Capabilities</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ SKILLS ]</div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-0 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              {SKILLS.map((group, idx) => {
                // Checkerboard: odd items get top margin on desktop
                const isOffset = idx % 2 === 1;
                return (
                  <div
                    key={group.category}
                    className={`py-10 ${isOffset ? 'md:mt-16' : ''}`}
                  >
                    <h4 className="font-display text-base font-medium text-foreground mb-6 border-b border-border pb-3">
                      {group.category}
                    </h4>
                    <ul className="space-y-3">
                      {group.items.map((item) => (
                        <li key={item} className="font-clinical text-sm text-muted-foreground flex items-start gap-3">
                          <span className="w-1 h-1 bg-primary/50 shrink-0 mt-2" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
