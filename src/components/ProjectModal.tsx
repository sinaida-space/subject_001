import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VHSImage from '@/components/VHSImage';
import projectSubmergedFull from '@/assets/project-submerged.jpeg';
import projectSubmergedSetup from '@/assets/project-submerged-setup.jpeg';
import projectSubmergedTracking from '@/assets/project-submerged-tracking.png';
import projectLegacyFull from '@/assets/project-legacy.jpg';
import projectSynestheticFull from '@/assets/project-synesthetic.jpg';

interface ProjectData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string[];
  tools: string[];
  links?: { label: string; url: string }[];
}

const PROJECT_DETAILS: Record<string, { images: string[]; longDescription: string }> = {
  submerged: {
    images: [projectSubmergedFull, projectSubmergedSetup, projectSubmergedTracking],
    longDescription:
      'An immersive projection mapping installation where AI-generated visuals are mapped onto fluid water surfaces. The piece uses blob tracking to create interactive triggers — participants\' movements cause ripples in the digital textures, blurring the line between physical and virtual environments. Created in a red-light environment to emphasize the surreal, underwater atmosphere.',
  },
  legacy: {
    images: [projectLegacyFull],
    longDescription:
      'A conceptual image series examining infertility, biological finality, and the nature of creative output in the age of AI. Each piece asks: if a silicon brain produces a "stochastic legacy," where does the soul of the work reside? The series juxtaposes organic textures with machine-generated patterns.',
  },
  synesthetic: {
    images: [projectSynestheticFull],
    longDescription:
      'An audio-responsive digital organism that bridges static algorithmic art and organic movement. Sound frequencies transform into pulsating architecture — a living digital structure whose heartbeat synchronizes to its auditory environment. Built in TouchDesigner with real-time audio analysis.',
  },
};

interface ProjectModalProps {
  project: ProjectData | null;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [project]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const details = project ? PROJECT_DETAILS[project.id] : null;

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto cursor-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Content */}
          <motion.div
            className="relative z-10 w-full max-w-5xl mx-4 my-16"
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 clinical-label text-muted-foreground hover:text-primary transition-colors cursor-none z-20"
            >
              [ CLOSE × ]
            </button>

            {/* Header */}
            <motion.div
              className="mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <span className="clinical-label text-primary mb-2 block">
                {project.id.toUpperCase()} // {project.subtitle}
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-medium text-foreground mt-3">
                {project.title}
              </h2>
            </motion.div>

            {/* Hero image */}
            <motion.div
              className="mb-8"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <VHSImage src={project.image} alt={project.title} aspectRatio="16/9" />
            </motion.div>

            {/* Info grid */}
            <motion.div
              className="grid grid-cols-12 gap-6 md:gap-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="col-span-12 md:col-span-8">
                <p className="font-clinical text-sm text-muted-foreground leading-relaxed mb-6">
                  {details?.longDescription || project.description}
                </p>
              </div>

              <div className="col-span-12 md:col-span-4 space-y-6">
                {/* Tags */}
                {project.tags.length > 0 && (
                  <div>
                    <span className="clinical-label text-primary block mb-3">TAGS</span>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[12px] font-mono uppercase tracking-wider text-accent border border-accent/20 px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                <div>
                  <span className="clinical-label text-primary block mb-3">TOOLS</span>
                  <div className="flex flex-wrap gap-2">
                    {project.tools.map((tool) => (
                      <span
                        key={tool}
                        className="text-[12px] font-mono text-muted-foreground border border-border px-2 py-0.5"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Links */}
                {project.links && (
                  <div>
                    <span className="clinical-label text-primary block mb-3">LINKS</span>
                    <div className="flex flex-col gap-2">
                      {project.links.map((link) => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="clinical-label text-foreground hover:text-accent transition-colors cursor-none"
                        >
                          {link.label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Additional images */}
            {details && details.images.length > 0 && (
              <motion.div
                className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {details.images.map((img, i) => (
                  <VHSImage
                    key={i}
                    src={img}
                    alt={`${project.title} detail ${i + 1}`}
                    aspectRatio="4/3"
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
