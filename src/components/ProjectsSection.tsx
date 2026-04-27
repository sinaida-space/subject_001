import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import projectSubmerged from '@/assets/project-submerged-cover.png';
import projectLegacy from '@/assets/project-legacy-cover.jpg';
import projectSynesthetic from '@/assets/project-synesthetic-cover.png';
import ParticleCard from '@/components/ParticleCard';

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

const PROJECTS: Project[] = [
  {
    id: 'submerged',
    title: 'Submerged Realities',
    subtitle: 'Projection Mapping Study',
    description:
      'AI-generated aesthetics mapped onto fluid surfaces. Digital textures interacting with the physics of water and red-light environments.',
    image: projectSubmerged,
    tags: ['Installation', 'Interactive', 'Projection'],
    tools: ['TouchDesigner', 'Midjourney', 'DaVinci Resolve'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245412721/Submerged-Realities-Projection-Mapping-Study' },
      { label: 'YouTube', url: 'https://youtube.com/shorts/7qgDlifWno0' },
      { label: 'Instagram', url: 'https://www.instagram.com/p/DVVB4K9gh9x/' },
    ],
  },
  {
    id: 'legacy',
    title: 'Legacy in the Age of Stochastic Output',
    subtitle: 'Image Series',
    description:
      'Exploring infertility, biological finality, and AI. If a silicon brain produces a "stochastic legacy," where does the soul reside?',
    image: projectLegacy,
    tags: ['GenAI', 'Conceptual', 'Series'],
    tools: ['Midjourney', 'Higgsfield.ai', 'Affinity'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245414325/Legacy-in-the-Age-of-Stochastic-Output' },
      { label: 'Instagram', url: 'https://www.instagram.com/p/DTsKFpxAloa/' },
    ],
  },
  {
    id: 'synesthetic',
    title: 'Synesthetic Bloom',
    subtitle: 'Audio-Responsive Digital Organism',
    description:
      'Sound transforms into pulsating architecture — a digital structure with a heartbeat synchronized to its auditory environment.',
    image: projectSynesthetic,
    tags: ['Generative', 'Audio-Reactive', 'Real-time'],
    tools: ['TouchDesigner', 'Midjourney', 'Suno'],
    links: [
      { label: 'YouTube', url: 'https://youtu.be/TP9bAl6Juk8' },
    ],
  },
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-10% 0px -10% 0px" });
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 100, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 100, scale: 0.95 }}
      transition={{
        duration: 0.8,
        delay: 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative cursor-none"
    >
      {/* Project Card - Clean arha.me style */}
      <div className="relative overflow-hidden bg-card border border-border/50 rounded-sm">
        {/* Image Container */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <motion.img
            src={project.image}
            alt={project.title}
            onLoad={() => setImageLoaded(true)}
            initial={{ scale: 1.1, filter: 'blur(20px)' }}
            animate={imageLoaded && isInView ? { scale: 1, filter: 'blur(0px)' } : { scale: 1.1, filter: 'blur(20px)' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
          
          {/* Hover Overlay */}
          <motion.div 
            className="absolute inset-0 bg-primary/5"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content - Bottom Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          {/* Project ID Label */}
          <motion.span 
            className="clinical-label text-primary/60 text-xs tracking-widest"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {String(index + 1).padStart(2, '0')} — {project.subtitle}
          </motion.span>

          {/* Title */}
          <motion.h3 
            className="font-display text-2xl md:text-3xl lg:text-4xl font-medium text-foreground mt-2 mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {project.title}
          </motion.h3>

          {/* Description */}
          <motion.p 
            className="font-clinical text-sm text-muted-foreground max-w-xl leading-relaxed mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {project.description}
          </motion.p>

          {/* Tags & Links Row */}
          <motion.div 
            className="flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-clinical uppercase tracking-wider text-accent/80 border border-accent/20 px-2 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-4 bg-border" />

            {/* External Links */}
            {project.links && (
              <div className="flex gap-3">
                {project.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-clinical text-primary hover:text-accent transition-colors cursor-none underline underline-offset-4 decoration-primary/30 hover:decoration-accent"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ProjectsSection() {
  return (
    <section id="work" className="relative z-10 py-24 md:py-32">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Section Header */}
        <div className="section-divider mb-20" />
        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 mb-16 md:mb-24">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Selected Projects</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">[ RECENT WORK ]</div>
          </div>
        </div>

        {/* Project Cards - One per line with generous spacing */}
        <div className="space-y-16 md:space-y-24">
          {PROJECTS.map((project, i) => (
            <ParticleCard key={project.id}>
              <ProjectCard project={project} index={i} />
            </ParticleCard>
          ))}
        </div>
      </div>
    </section>
  );
}
