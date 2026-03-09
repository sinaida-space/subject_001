import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/use-mobile';
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

// Mobile fallback card
function MobileProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <div className="relative overflow-hidden bg-black border border-cyan-900/30 mb-6">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>
      <div className="p-6">
        <span className="text-[10px] tracking-[0.2em] text-red-500 font-mono">
          {String(index + 1).padStart(2, '0')} — {project.subtitle}
        </span>
        <h3 className="font-display text-xl text-white mt-2 mb-3">{project.title}</h3>
        <p className="text-sm text-gray-400 font-mono leading-relaxed mb-4">{project.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-mono uppercase tracking-wider text-red-400 border border-red-500/30 px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
        {project.links && (
          <div className="flex gap-3">
            {project.links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Project detail overlay
function ProjectOverlay({ 
  project, 
  onClose 
}: { 
  project: Project | null; 
  onClose: () => void;
}) {
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
          className="relative max-w-3xl w-full bg-black/80 border border-cyan-500/30 p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-cyan-400 hover:text-white font-mono text-sm tracking-widest"
          >
            [CLOSE]
          </button>

          {/* Image */}
          <div className="aspect-[16/10] overflow-hidden mb-6">
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <span className="text-[10px] tracking-[0.2em] text-red-500 font-mono">
            {project.subtitle}
          </span>
          <h2 className="font-display text-3xl text-white mt-2 mb-4">{project.title}</h2>
          <p className="text-sm text-gray-400 font-mono leading-relaxed mb-6">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono uppercase tracking-wider text-red-400 border border-red-500/30 px-2 py-1"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Tools */}
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tools.map((tool) => (
              <span
                key={tool}
                className="text-[10px] font-mono text-cyan-400/70"
              >
                {tool}
              </span>
            ))}
          </div>

          {/* Links */}
          {project.links && (
            <div className="flex gap-4">
              {project.links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                >
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

export default function GalleryTunnel({ projects }: GalleryTunnelProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const panelsRef = useRef<THREE.Mesh[]>([]);
  const panelGroupRef = useRef<THREE.Group | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  // Panel heights
  const panelHeights = useMemo(() => [-0.3, 0.2, -0.5], []);

  // Initialize Three.js
  useEffect(() => {
    if (isMobile) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    cameraRef.current = camera;

    // Panel group
    const panelGroup = new THREE.Group();
    scene.add(panelGroup);
    panelGroupRef.current = panelGroup;

    // Load textures and create panels
    const textureLoader = new THREE.TextureLoader();
    const radius = 4.0;
    const panels: THREE.Mesh[] = [];

    projects.slice(0, 3).forEach((project, i) => {
      const texture = textureLoader.load(project.image);
      texture.colorSpace = THREE.SRGBColorSpace;
      
      const geometry = new THREE.PlaneGeometry(3.2, 2.0);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position in orbit
      const angle = (i / 3) * Math.PI * 2;
      mesh.position.x = Math.sin(angle) * radius;
      mesh.position.z = Math.cos(angle) * radius - radius;
      mesh.position.y = panelHeights[i];
      
      // Face center
      mesh.lookAt(0, mesh.position.y, 0);
      
      mesh.userData = { index: i, project };
      panels.push(mesh);
      panelGroup.add(mesh);
    });
    panelsRef.current = panels;

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 50;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      starPositions[i * 3 + 2] = -Math.random() * 100;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      
      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      targetMouseRef.current.x = mouseRef.current.x * 0.15;
      targetMouseRef.current.y = mouseRef.current.y * 0.15;
    };

    // Click handler
    const handleClick = () => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(panels);
      
      if (intersects.length > 0) {
        const clickedPanel = intersects[0].object as THREE.Mesh;
        const project = clickedPanel.userData.project as Project;
        setSelectedProject(project);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Rotate panel group
      if (panelGroup) {
        panelGroup.rotation.y += 0.003;
      }

      // Mouse parallax
      camera.position.x += (targetMouseRef.current.x - camera.position.x) * 0.03;
      camera.position.y += (targetMouseRef.current.y - camera.position.y) * 0.03;

      // Raycasting for hover
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(panels);
      
      let newHoveredIndex: number | null = null;
      if (intersects.length > 0) {
        newHoveredIndex = (intersects[0].object as THREE.Mesh).userData.index;
      }
      
      if (newHoveredIndex !== hoveredIndex) {
        setHoveredIndex(newHoveredIndex);
      }

      // Scale panels based on hover
      panels.forEach((panel, i) => {
        const targetScale = newHoveredIndex === null 
          ? 1 
          : newHoveredIndex === i 
            ? 1.15 
            : 0.88;
        
        panel.scale.x += (targetScale - panel.scale.x) * 0.1;
        panel.scale.y += (targetScale - panel.scale.y) * 0.1;
        panel.scale.z += (targetScale - panel.scale.z) * 0.1;
      });

      // Animate stars (hyperspace effect)
      if (starsRef.current) {
        const positions = starsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < starCount; i++) {
          positions[i * 3 + 2] += 0.1;
          if (positions[i * 3 + 2] > 5) {
            positions[i * 3 + 2] = -100;
          }
        }
        starsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      cancelAnimationFrame(animFrameRef.current);
      
      panels.forEach((panel) => {
        panel.geometry.dispose();
        (panel.material as THREE.MeshBasicMaterial).dispose();
      });
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    };
  }, [isMobile, projects, panelHeights, hoveredIndex]);

  // Mobile fallback
  if (isMobile) {
    return (
      <section id="work" className="relative z-10 py-24 bg-black">
        <div className="container mx-auto px-6">
          {/* Section Header */}
          <div className="mb-12">
            <span className="text-[11px] tracking-[0.2em] text-red-500 font-mono uppercase">
              SELECTED PROJECTS
            </span>
            <div className="mt-2 text-xs font-mono text-cyan-400">[ RECENT WORK ]</div>
          </div>

          {/* Mobile cards */}
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
        className="relative w-full h-screen overflow-hidden bg-transparent"
        style={{ cursor: hoveredIndex !== null ? 'pointer' : 'default' }}
      >
        {/* WebGL Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Left side label */}
        <div 
          className="absolute left-[4%] top-1/2 -translate-y-1/2 z-10 pointer-events-none"
        >
          <span className="block text-[11px] tracking-[0.2em] text-red-500 font-mono uppercase">
            SELECTED PROJECTS
          </span>
          <span className="block mt-2 text-xs font-mono text-cyan-400">
            [ RECENT WORK ]
          </span>
        </div>
      </section>

      {/* Project overlay */}
      {selectedProject && (
        <ProjectOverlay 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </>
  );
}
