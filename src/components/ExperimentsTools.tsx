import { EXPERIMENTS, TOOLS, BADGE_LABEL, type Project } from '@/data/projects';
import { constellationBus } from '@/lib/constellationBus';

function LinkRow({ project }: { project: Project }) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => constellationBus.highlight(project.id)}
      onMouseLeave={() => constellationBus.highlight(null)}
      className="group flex items-baseline gap-3 border-t border-white/10 py-4 transition-colors hover:bg-white/[0.02]"
    >
      <span className="font-mono text-[14px] text-accent transition-transform group-hover:translate-x-1">→</span>
      <span className="flex-1">
        <span className="font-display text-lg text-foreground transition-colors group-hover:text-accent">
          {project.title}
        </span>
        <span className="ml-3 font-mono text-[13px] text-white/60">{project.tagline}</span>
      </span>
      {project.badges && (
        <span className="flex shrink-0 gap-1.5">
          {project.badges.map((b) => (
            <span
              key={b}
              className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/45"
            >
              {BADGE_LABEL[b]}
            </span>
          ))}
        </span>
      )}
      <span className="shrink-0 font-mono text-[11px] text-white/30 transition-opacity group-hover:opacity-70">↗</span>
    </a>
  );
}

export default function ExperimentsTools() {
  return (
    <section id="experiments" className="relative z-10 py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="shrink-0 md:sticky md:top-[15vh] md:w-[200px] md:self-start">
            <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
              Experiments & Tools
            </div>
            <div className="mt-2 font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              [ PLAYGROUND ]
            </div>
            <p className="mt-6 max-w-[230px] font-mono text-[14px] leading-relaxed text-white/65">
              Small interactive pieces and utilities. Hover a line to find it in the constellation.
            </p>
          </div>

          <div className="flex-1">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
              Interactive experiments
            </div>
            <div className="border-b border-white/10">
              {EXPERIMENTS.map((p) => (
                <LinkRow key={p.id} project={p} />
              ))}
            </div>

            <div className="mb-3 mt-12 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
              Tools & guides
            </div>
            <div className="border-b border-white/10">
              {TOOLS.map((p) => (
                <LinkRow key={p.id} project={p} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
