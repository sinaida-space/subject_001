import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import projectSubmerged from '@/assets/project-submerged-cover.png';
import projectLegacy from '@/assets/project-legacy-cover.jpg';
import projectSynesthetic from '@/assets/project-synesthetic-cover.png';
import ParticleImage from './ParticleImage';

interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string[];
  tools: string[];
  links?: { label: string; url: string }[];
  span: string;
  depthLayer: number; // 0=background, 1=mid, 2=foreground
}

const PROJECTS: Project[] = [
  {
    id: 'submerged',
    title: 'Submerged Realities',
    subtitle: 'Projection Mapping Study',
    description:
      'AI-generated aesthetics mapped onto fluid surfaces. Digital textures interacting with the physics of water and red-light environments, using blob tracking for interactive triggers.',
    image: projectSubmerged,
    tags: ['Installation', 'Interactive', 'Projection'],
    tools: ['TouchDesigner', 'Midjourney', 'DaVinci Resolve'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245412721/Submerged-Realities-Projection-Mapping-Study' },
      { label: 'YouTube', url: 'https://youtube.com/shorts/7qgDlifWno0' },
    ],
    span: 'w-full',
    depthLayer: 1,
  },
  {
    id: 'legacy',
    title: 'Legacy in the Age of Stochastic Output',
    subtitle: 'Image Series',
    description:
      'Exploring infertility, biological finality, and AI. If a silicon brain produces a "stochastic legacy," where does the soul of the work reside?',
    image: projectLegacy,
    tags: ['GenAI', 'Conceptual', 'Series'],
    tools: ['Midjourney', 'Higgsfield.ai', 'Affinity'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245414325/Legacy-in-the-Age-of-Stochastic-Output' },
    ],
    span: 'w-full',
    depthLayer: 2,
  },
  {
    id: 'synesthetic',
    title: 'Synesthetic Bloom',
    subtitle: 'Audio-Responsive Digital Organism',
    description:
      'Bridging static algorithmic art and organic movement. Sound transforms into pulsating architecture — a digital structure with a heartbeat synchronized to its auditory environment.',
    image: projectSynesthetic,
    tags: ['Generative', 'Audio-Reactive', 'Real-time'],
    tools: ['TouchDesigner', 'Midjourney', 'Suno'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245415773/Synesthetic-Bloom-An-Audio-Responsive-Digital-Organism' },
      { label: 'YouTube', url: 'https://youtu.be/pzq0BSVzw28' },
    ],
    span: 'w-full',
    depthLayer: 0,
  },
];

// Parallax speed multipliers per depth layer
const DEPTH_SPEEDS = [0.3, 0.6, 1.0]; // bg, mid, fg
const DEPTH_Z = [0, 20, 50]; // z-translation range

function ProjectCard({
  project,
  parallaxY,
  parallaxZ,
  scrollVelocity,
  index,
}: {
  project: Project;
  parallaxY: number;
  parallaxZ: number;
  scrollVelocity: number;
  index: number;
}) {
  const [inView, setInView] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const expandProgress = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Start expansion after particles assemble
          setTimeout(() => setExpanded(true), 800 + index * 200);
        } else {
          setInView(false);
          setExpanded(false);
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index]);

  // Smooth expansion animation
  useEffect(() => {
    let rafId: number;
    const animate = () => {
      if (expanded && expandProgress.current < 1) {
        expandProgress.current = Math.min(1, expandProgress.current + 0.008);
      } else if (!expanded && expandProgress.current > 0) {
        expandProgress.current = Math.max(0, expandProgress.current - 0.012);
      }
      timeRef.current += 0.016;
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [expanded]);

  const tagParallaxY = parallaxY * 1.3;
  const progress = expandProgress.current;
  
  // 3D expansion calculations
  const scale = 1 + progress * 0.15;
  const rotateX = progress * 3;
  const translateZ = progress * 30;
  const ditherIntensity = Math.sin(timeRef.current * 8) * progress * 0.02;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.2, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className="group relative cursor-none mb-16"
      style={{
        transform: `translate3d(0, ${parallaxY}px, ${parallaxZ}px) scale(${scale}) rotateX(${rotateX}deg) translateZ(${translateZ}px)`,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        perspective: '1000px',
      }}
    >
      {/* Square container that expands */}
      <div 
        className="relative overflow-hidden border border-border bg-card"
        style={{
          width: '100%',
          aspectRatio: expanded ? `${1 + progress * 1.5} / 1` : '1 / 1',
          height: 'auto',
          transition: 'aspect-ratio 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: `blur(${ditherIntensity}px) contrast(${1 + progress * 0.2})`,
        }}
      >
        {/* Background grid that shifts during expansion */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(45deg, hsl(var(--border)) 1px, transparent 1px), linear-gradient(-45deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: `${10 + progress * 20}px ${10 + progress * 20}px`,
            transform: `rotate(${progress * 45}deg) scale(${1 + progress})`,
            transition: 'all 0.1s linear',
          }}
        />

        {/* Content layout changes based on expansion */}
        <div 
          className={`relative z-10 ${
            progress > 0.3 ? 'grid grid-cols-12 gap-0 min-h-full' : 'flex flex-col h-full'
          }`}
          style={{
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Image section */}
          <div 
            className={`relative overflow-hidden ${
              progress > 0.3 ? 'col-span-7' : 'flex-1'
            }`}
            style={{
              transform: `translateZ(${progress * 20}px) rotateY(${progress * 2}deg)`,
              transition: 'transform 0.1s linear',
            }}
          >
            <ParticleImage
              src={project.image}
              alt={project.title}
              className="w-full h-full"
              inView={inView}
              scrollVelocity={scrollVelocity}
            />

            {/* Clinical label with 3D float */}
            <div
              className="absolute top-6 left-6 clinical-label text-primary/80 bg-background/80 px-3 py-2 z-10"
              style={{
                transform: `translateY(${tagParallaxY * 0.3}px) translateZ(${progress * 15}px)`,
                transition: 'transform 0.1s linear',
                opacity: 0.7 + progress * 0.3,
              }}
            >
              {project.id.toUpperCase()} // {project.subtitle}
            </div>
          </div>

          {/* Content section - only appears when expanded */}
          {progress > 0.2 && (
            <motion.div 
              className="col-span-5 p-8 md:p-12 flex flex-col justify-center space-y-6"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: Math.min(1, (progress - 0.2) * 2), x: 0 }}
              style={{
                transform: `translateZ(${progress * 10}px)`,
              }}
            >
              <h3 className="font-display text-2xl md:text-3xl font-medium text-foreground">
                {project.title}
              </h3>
              
              <p className="font-clinical text-sm text-muted-foreground leading-relaxed max-w-lg">
                {project.description}
              </p>

              {/* Tags with 3D float */}
              <div
                className="flex flex-wrap gap-3"
                style={{
                  transform: `translateY(${tagParallaxY * 0.15}px) translateZ(${progress * 8}px)`,
                  transition: 'transform 0.15s linear',
                }}
              >
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-clinical uppercase tracking-wider text-accent border border-accent/20 px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Tools */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                {project.tools.map((tool) => (
                  <span key={tool} className="text-xs font-clinical text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>

              {/* External Links Only */}
              {project.links && (
                <div className="flex gap-4 pt-4">
                  {project.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="clinical-label text-primary hover:text-accent transition-colors cursor-none border border-primary/30 px-4 py-2 hover:bg-primary/10"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScrollRef = useRef(0);

  const handleScroll = useCallback(() => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const viewH = window.innerHeight;
    const centered = (rect.top + rect.height / 2 - viewH / 2) / viewH;
    setScrollProgress(centered);

    const now = window.scrollY;
    const vel = now - lastScrollRef.current;
    lastScrollRef.current = now;
    setScrollVelocity(vel);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Compute parallax offsets per depth layer
  const parallaxValues = useMemo(() => {
    return PROJECTS.map((p) => ({
      y: scrollProgress * DEPTH_SPEEDS[p.depthLayer] * -60,
      z: scrollProgress * DEPTH_Z[p.depthLayer] * -0.5,
    }));
  }, [scrollProgress]);

  return (
    <>
      <section ref={sectionRef} id="work" className="relative z-10 py-12" style={{ perspective: '1000px' }}>
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="section-divider mb-8" />

          <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 mb-16">
            <div className="col-span-12 md:col-span-3">
              <span className="clinical-label text-primary">GALLERY</span>
              <div className="mt-2 text-xs font-clinical text-muted-foreground">[ SELECTED PROJECTS ]</div>
            </div>
            <div className="col-span-12 md:col-span-9" />
          </div>

          {/* Project Cards - Square to expanded 3D animation */}
          <div className="space-y-0" style={{ transformStyle: 'preserve-3d' }}>
            {PROJECTS.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                parallaxY={parallaxValues[i].y}
                parallaxZ={parallaxValues[i].z}
                scrollVelocity={scrollVelocity}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
