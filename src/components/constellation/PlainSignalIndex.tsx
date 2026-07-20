import { useRef, useState } from 'react';
import { PROJECTS, BADGE_LABEL, type Project, type ProjectKind } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';
import { useRenderMode } from '@/hooks/useRenderMode';
import DitherPreview from './DitherPreview';

// The "lights up" reading of the Signal Map: every project, grouped plainly
// by kind, semantic headings throughout — legible to a screen reader, a
// search crawler, and a producer skimming on a slow connection.
const KIND_ORDER: ProjectKind[] = ['stage', 'installation', 'conceptual', 'game', 'tool'];
const KIND_LABEL: Record<ProjectKind, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Perception research · camera-tracked',
  tool: 'Tools',
};

interface RowProps {
  project: Project;
  index: number;
  previewEnabled: boolean;
  onPreview: (src: string | null, x: number, y: number, instant: boolean) => void;
}

function Row({ project, index, previewEnabled, onPreview }: RowProps) {
  const rowRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    constellationBus.highlight(project.id);
    if (previewEnabled && project.image) onPreview(project.image, e.clientX, e.clientY, false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (previewEnabled && project.image) onPreview(project.image, e.clientX, e.clientY, false);
  };

  const handleMouseLeave = () => {
    constellationBus.highlight(null);
    if (previewEnabled) onPreview(null, 0, 0, false);
  };

  const handleFocus = () => {
    if (!previewEnabled || !project.image) return;
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    onPreview(project.image, rect.right, rect.top, true);
  };

  const handleBlur = () => {
    if (previewEnabled) onPreview(null, 0, 0, true);
  };

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => constellationBus.focusWork(project.id)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="group flex w-full items-baseline gap-4 border-t border-l-2 border-l-transparent border-foreground/10 py-5 pl-3 -ml-3 text-left transition-colors hover:border-l-primary hover:bg-foreground/[0.04]"
    >
      <span className="shrink-0 font-mono text-sm text-primary-legible transition-transform group-hover:translate-x-1">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-display text-2xl md:text-3xl leading-tight text-foreground transition-colors group-hover:text-accent group-hover:text-neon">
          {project.title}
        </span>
        <span className="mt-1 block font-mono text-xs text-foreground/55">{project.tagline}</span>
      </span>
      {project.badges && (
        <span className="hidden shrink-0 gap-3 md:flex">
          {project.badges.map((b) => (
            <span key={b} className="font-mono text-2xs lowercase text-primary-legible/70">
              {BADGE_LABEL[b]}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export default function PlainSignalIndex({ includeBackground = false }: { includeBackground?: boolean }) {
  const { mode } = useRenderMode();
  const previewEnabled = mode !== 'lite';
  const [preview, setPreview] = useState<{ src: string | null; x: number; y: number; instant: boolean }>({
    src: null,
    x: 0,
    y: 0,
    instant: false,
  });

  const handlePreview = (src: string | null, x: number, y: number, instant: boolean) => {
    setPreview({ src, x, y, instant });
  };

  return (
    <div className="w-full" style={{ minHeight: 'clamp(420px, 60vh, 720px)' }}>
      {KIND_ORDER.map((kind) => {
        const items = PROJECTS.filter((p) => p.kind === kind && (includeBackground || !p.background));
        if (items.length === 0) return null;
        return (
          <section key={kind} aria-labelledby={`plain-signal-${kind}`} className="mb-12 last:mb-0">
            <h3
              id={`plain-signal-${kind}`}
              className="mb-1 font-display text-xl md:text-2xl leading-none text-primary-legible"
            >
              {KIND_LABEL[kind]}
            </h3>
            <div
              aria-hidden="true"
              className="mb-5 h-px w-24 bg-gradient-to-r from-primary/70 to-transparent"
            />
            <div className="border-b border-foreground/10">
              {items.map((p, i) => (
                <Row key={p.id} project={p} index={i} previewEnabled={previewEnabled} onPreview={handlePreview} />
              ))}
            </div>
          </section>
        );
      })}
      {previewEnabled && (
        <DitherPreview src={preview.src} x={preview.x} y={preview.y} visible={preview.src != null} instant={preview.instant} />
      )}
    </div>
  );
}
