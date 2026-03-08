import { useEffect, useRef, useState } from 'react';
import projectSubmerged from '@/assets/project-submerged.jpeg';
import projectLegacy from '@/assets/project-legacy.jpg';
import projectSynesthetic from '@/assets/project-synesthetic.jpg';
import projectBTS from '@/assets/project-submerged-bts.jpeg';

interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string[];
  tools: string[];
  links?: {label: string;url: string;}[];
  span: string;
}

const PROJECTS: Project[] = [
{
  id: 'submerged',
  title: 'Submerged Realities',
  subtitle: 'Projection Mapping Study',
  description: 'AI-generated aesthetics mapped onto fluid surfaces. Digital textures interacting with the physics of water and red-light environments, using blob tracking for interactive triggers.',
  image: projectSubmerged,
  tags: ['Installation', 'Interactive', 'Projection'],
  tools: ['TouchDesigner', 'Midjourney', 'DaVinci Resolve'],
  links: [
  { label: 'Behance', url: 'https://www.behance.net/gallery/245412721/Submerged-Realities-Projection-Mapping-Study' },
  { label: 'YouTube', url: 'https://youtube.com/shorts/7qgDlifWno0' }],

  span: 'md:col-span-8 md:row-span-2'
},
{
  id: 'legacy',
  title: 'Legacy in the Age of Stochastic Output',
  subtitle: 'Image Series',
  description: 'Exploring infertility, biological finality, and AI. If a silicon brain produces a "stochastic legacy," where does the soul of the work reside?',
  image: projectLegacy,
  tags: ['GenAI', 'Conceptual', 'Series'],
  tools: ['Midjourney', 'Higgsfield.ai', 'Affinity'],
  links: [
  { label: 'Behance', url: 'https://www.behance.net/gallery/245414325/Legacy-in-the-Age-of-Stochastic-Output' }],

  span: 'md:col-span-4'
},
{
  id: 'synesthetic',
  title: 'Synesthetic Bloom',
  subtitle: 'Audio-Responsive Digital Organism',
  description: 'Bridging static algorithmic art and organic movement. Sound transforms into pulsating architecture — a digital structure with a heartbeat synchronized to its auditory environment.',
  image: projectSynesthetic,
  tags: ['Generative', 'Audio-Reactive', 'Real-time'],
  tools: ['TouchDesigner', 'Midjourney', 'Suno'],
  links: [
  { label: 'Behance', url: 'https://www.behance.net/gallery/245415773/Synesthetic-Bloom-An-Audio-Responsive-Digital-Organism' },
  { label: 'YouTube', url: 'https://youtu.be/pzq0BSVzw28' }],

  span: 'md:col-span-4'
}];



function ProjectCard({ project }: {project: Project;}) {
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {if (entry.isIntersecting) setInView(true);},
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden border border-border bg-card transition-all duration-700 cursor-none ${project.span} ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={project.image}
          alt={project.title}
          className={`w-full h-full object-cover transition-all duration-700 ${
          hovered ? 'scale-105' : 'scale-100 dither-image'}`
          } />
        

        {/* Glitch overlay on hover */}
        {hovered &&
        <div className="absolute inset-0 pointer-events-none">
            <div
            className="absolute inset-0 mix-blend-screen opacity-30"
            style={{
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 100% 55% / 0.1) 2px, hsl(0 100% 55% / 0.1) 4px)`
            }} />
          
          </div>
        }

        {/* Clinical label */}
        <div className="absolute top-3 left-3 clinical-label text-primary/80 bg-background/80 px-2 py-1">
          {project.id.toUpperCase()} // {project.subtitle}
        </div>
      </div>

      {/* Info */}
      <div className="p-6 md:p-8 space-y-4">
        <h3 className="font-display text-lg font-medium text-foreground">{project.title}</h3>
        <p className="font-clinical text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) =>
          <span key={tag} className="text-[10px] font-clinical uppercase tracking-wider text-accent border border-accent/20 px-2 py-0.5">
              {tag}
            </span>
          )}
        </div>

        {/* Tools */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {project.tools.map((tool) =>
          <span key={tool} className="text-[10px] font-clinical text-muted-foreground">{tool}</span>
          )}
        </div>

        {/* Links */}
        {project.links &&
        <div className="flex gap-3 pt-2">
            {project.links.map((link) =>
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="clinical-label text-primary hover:text-accent transition-colors cursor-none">
            
                {link.label} ↗
              </a>
          )}
          </div>
        }
      </div>
    </div>);

}

export default function ProjectsSection() {
  return (
    <section id="work" className="relative z-10 py-12">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="section-divider mb-8" />

        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 mb-16">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">GALLERY</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">
              [ SELECTED PROJECTS ]
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            

            
          </div>
        </div>

        {/* Modular Grid — Swiss style with breathing room */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          {PROJECTS.map((project) =>
          <ProjectCard key={project.id} project={project} />
          )}
        </div>
      </div>
    </section>);

}