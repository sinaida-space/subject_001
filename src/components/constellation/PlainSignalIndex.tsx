import { PROJECTS, BADGE_LABEL, type Project, type ProjectKind } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';

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

function Row({ project }: { project: Project }) {
  return (
    <button
      type="button"
      onClick={() => constellationBus.focusWork(project.id)}
      onMouseEnter={() => constellationBus.highlight(project.id)}
      onMouseLeave={() => constellationBus.highlight(null)}
      className="group flex w-full items-baseline gap-3 border-t border-l-2 border-l-transparent border-foreground/10 py-4 pl-3 -ml-3 text-left transition-colors hover:border-l-primary hover:bg-foreground/[0.04]"
    >
      <span className="font-mono text-[14px] text-accent transition-transform group-hover:translate-x-1">→</span>
      <span className="flex-1">
        <span className="font-display text-lg text-foreground transition-colors group-hover:text-accent">
          {project.title}
        </span>
        <span className="ml-3 font-mono text-[13px] text-foreground/60">{project.tagline}</span>
      </span>
      {project.badges && (
        <span className="hidden shrink-0 gap-1.5 md:flex">
          {project.badges.map((b) => (
            <span
              key={b}
              className="border border-foreground/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-foreground/45"
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

export default function PlainSignalIndex({ includeBackground = false }: { includeBackground?: boolean }) {
  return (
    <div className="w-full" style={{ minHeight: 'clamp(420px, 60vh, 720px)' }}>
      {KIND_ORDER.map((kind) => {
        const items = PROJECTS.filter((p) => p.kind === kind && (includeBackground || !p.background));
        if (items.length === 0) return null;
        return (
          <section key={kind} aria-labelledby={`plain-signal-${kind}`} className="mb-12 last:mb-0">
            <h3
              id={`plain-signal-${kind}`}
              className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/35"
            >
              {KIND_LABEL[kind]}
            </h3>
            <div className="border-b border-foreground/10">
              {items.map((p) => (
                <Row key={p.id} project={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
