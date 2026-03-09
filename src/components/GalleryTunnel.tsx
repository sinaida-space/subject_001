import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import VHSImage from '@/components/VHSImage';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string[];
  tools: string[];
  links?: { label: string; url: string }[];
}

interface GalleryTunnelProps {
  projects: Project[];
}

function ProjectOverlay({ project, onClose }: { project: Project | null; onClose: () => void }) {
  if (!project) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative max-w-3xl w-full border border-primary/30 p-8 bg-background/95"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-primary hover:text-foreground font-clinical text-sm tracking-widest cursor-none">
            [CLOSE]
          </button>
          <VHSImage src={project.image} alt={project.title} className="mb-6" />
          <span className="clinical-label text-accent">{project.subtitle}</span>
          <h2 className="font-display text-3xl text-foreground mt-2 mb-4">{project.title}</h2>
          <p className="text-sm text-muted-foreground font-clinical leading-relaxed mb-6">{project.description}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map((tag) => (
              <span key={tag} className="text-[12px] font-mono uppercase tracking-wider text-accent/80 border border-accent/20 px-2 py-1">{tag}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tools.map((tool) => (
              <span key={tool} className="text-[12px] font-mono text-muted-foreground">{tool}</span>
            ))}
          </div>
          {project.links && (
            <div className="flex gap-4">
              {project.links.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-clinical text-primary hover:text-accent transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-accent cursor-none">
                  {link.label} ↗
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MobileProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <div className="relative overflow-hidden border border-border/30 mb-6">
      <VHSImage src={project.image} alt={project.title} />
      <div className="p-6">
        <span className="clinical-label text-accent">{String(index + 1).padStart(2, '0')} — {project.subtitle}</span>
        <h3 className="font-display text-xl text-foreground mt-2 mb-3">{project.title}</h3>
        <p className="text-sm text-muted-foreground font-clinical leading-relaxed mb-4">{project.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.map((tag) => (
            <span key={tag} className="text-[12px] font-mono uppercase tracking-wider text-accent/80 border border-accent/20 px-2 py-1">{tag}</span>
          ))}
        </div>
        {project.links && (
          <div className="flex gap-3">
            {project.links.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-clinical text-primary hover:text-accent transition-colors underline underline-offset-4 cursor-none">
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GalleryTunnel({ projects }: GalleryTunnelProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const hoveredIndexRef = useRef<number | null>(null);
  const [cursorStyle, setCursorStyle] = useState('default');

  const panelHeights = useMemo(() => [-0.2, 0.3, -0.4], []);

  useEffect(() => {
    if (isMobile) return;
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

    const textureLoader = new THREE.TextureLoader();
    const panels: THREE.Mesh[] = [];
    const radius = 5.0;

    projects.slice(0, 3).forEach((project, i) => {
      const texture = textureLoader.load(project.image);
      texture.colorSpace = THREE.SRGBColorSpace;

      const geometry = new THREE.PlaneGeometry(3.5, 2.2);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = panelHeights[i];

      // Face outward from center
      mesh.lookAt(mesh.position.x * 2, mesh.position.y, mesh.position.z * 2);

      mesh.userData = { index: i, project, baseScale: 1 };
      panels.push(mesh);
      panelGroup.add(mesh);
    });

    // Position group so panels are in front of camera
    panelGroup.position.z = -radius;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let animFrame = 0;
    let clickedProject: Project | null = null;
    let targetRotationY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartRotation = 0;
    let revealProgress = 0;
    let targetReveal = 0;

    // Intersection observer for ADSR reveal
    const observer = new IntersectionObserver(
      ([entry]) => {
        targetReveal = entry.isIntersecting ? 1 : 0;
      },
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

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      targetRotationY += e.deltaY * 0.002;
    };

    const handleClick = (e: MouseEvent) => {
      // Only trigger click if not dragging
      if (Math.abs(e.clientX - dragStartX) < 5) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(panels);
        if (intersects.length > 0) {
          clickedProject = intersects[0].object.userData.project;
        }
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('click', handleClick);

    const animate = () => {
      animFrame = requestAnimationFrame(animate);

      // ADSR reveal: fast attack (0.08), hold at 1
      revealProgress += (targetReveal - revealProgress) * 0.08;

      // Apply reveal - scale panels from 0
      panels.forEach((panel) => {
        const mat = panel.material as THREE.MeshBasicMaterial;
        mat.opacity = revealProgress;
      });
      panelGroup.scale.setScalar(0.3 + revealProgress * 0.7);

      // No auto-rotation — only user-driven
      panelGroup.rotation.y += (targetRotationY - panelGroup.rotation.y) * 0.08;

      // Raycasting for hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(panels);
      const newHovered = intersects.length > 0 ? (intersects[0].object as THREE.Mesh).userData.index : null;

      if (newHovered !== hoveredIndexRef.current) {
        hoveredIndexRef.current = newHovered;
        setCursorStyle(newHovered !== null ? 'pointer' : 'default');
      }

      // Scale panels based on hover (only when not dragging)
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

      // Handle click (deferred to avoid state in loop)
      if (clickedProject) {
        setSelectedProject(clickedProject);
        clickedProject = null;
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
      container.removeEventListener('click', handleClick);
      cancelAnimationFrame(animFrame);
      panels.forEach((p) => { p.geometry.dispose(); (p.material as THREE.MeshBasicMaterial).dispose(); });
      renderer.dispose();
    };
  }, [isMobile, projects, panelHeights]);

  if (isMobile) {
    return (
      <section id="work" className="relative z-10 py-24">
        <div className="container mx-auto px-6">
          <div className="mb-12">
            <span className="clinical-label text-primary">Selected Projects</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ RECENT WORK ]</div>
          </div>
          {projects.map((project, i) => (
            <MobileProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        ref={containerRef}
        id="work"
        className="relative w-full overflow-hidden"
        style={{ height: '100vh', cursor: cursorStyle }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        <div className="absolute left-[4%] top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <span className="clinical-label text-primary">Selected Projects</span>
          <span className="block mt-2 text-xs font-clinical text-muted-foreground">[ RECENT WORK ]</span>
        </div>
      </section>

      {selectedProject && (
        <ProjectOverlay project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </>
  );
}
