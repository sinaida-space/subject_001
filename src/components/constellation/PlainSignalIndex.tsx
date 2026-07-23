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
  previewEnabled: boolean;
  onPreview: (src: string | null, x: number, y: number, instant: boolean) => void;
}

function Row({ project, previewEnabled, onPreview }: RowProps) {
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
      className="group flex w-full items-baseline gap-3 border-t border-l-2 border-l-transparent border-foreground/10 py-4 pl-3 -ml-3 text-left transition-colors hover:border-l-primary hover:bg-foreground/[0.04]"
    >
      <span className="font-mono text-[14px] text-accent transition-transform group-hover:translate-x-1">→</span>
      <span className="flex-1">
        <span className="font-display text-lg uppercase text-foreground transition-colors group-hover:text-accent">
          {project.title}
        </span>
        <span className="ml-3 font-mono text-[13px] text-foreground/60">{project.tagline}</span>
      </span>
      {project.badges && (
        <span className="hidden shrink-0 gap-1.5 md:flex">
          {project.badges.map((b) => (
            <span
              key={b}
              className="border border-foreground/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/65"
            >
              {BADGE_LABEL[b]}
            </span>
          ))}
        </span>
      )}
      <span className="shrink-0 font-mono text-[11px] text-foreground/30 transition-opacity group-hover:opacity-70">▸</span>
    </button>
  );
}

export default function PlainSignalIndex() {
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
        const items = PROJECTS.filter((p) => p.kind === kind && !p.background);
        if (items.length === 0) return null;
        return (
          <section key={kind} aria-labelledby={`plain-signal-${kind}`} className="mb-12 last:mb-0">
            <h3
              id={`plain-signal-${kind}`}
              className="mb-3 font-mono text-[20px] uppercase tracking-[0.2em] text-foreground/60"
            >
              {KIND_LABEL[kind]}
            </h3>
            <div className="border-b border-foreground/10">
              {items.map((p) => (
                <Row key={p.id} project={p} previewEnabled={previewEnabled} onPreview={handlePreview} />
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
