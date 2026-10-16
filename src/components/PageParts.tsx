import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import DitherReveal from '@/components/DitherReveal';
import type { Project } from '@/data/projects';
import { useRenderMode } from '@/hooks/useRenderMode';
import { useScrollProgress } from '@/lib/scrollProgress';

// Shared pieces for the pages outside home (#198), so every page speaks the
// home's language: a red kicker over an oversized white display headline, a
// white lead set off to the right on a Swiss grid, section titles pinned in
// the left column while their content scrolls past, and About's ruled table.
// Motion is scroll-driven only: rules draw with a red thread, section titles
// condense from dither dots into solid light. Lite mode shows the end state.

export const PAGE_MAIN_CLASS =
  'container relative z-10 mx-auto max-w-6xl px-6 pt-40 pb-24 md:pt-32 lg:pt-36';
export const KICKER_CLASS = 'clinical-label text-primary-legible';
export const H1_CLASS =
  'mt-3 font-display text-[clamp(3rem,10vw,9rem)] uppercase font-light leading-[0.9] tracking-[-0.02em] text-foreground';
export const H2_CLASS =
  'font-display text-[clamp(2.25rem,3.6vw,3.5rem)] uppercase font-light leading-[0.95] text-foreground';
export const LEAD_CLASS =
  'relative mt-10 max-w-[34ch] font-mono text-[clamp(20px,2vw,28px)] leading-[1.3] text-foreground md:ml-[calc(100%*5/12)]';
export const BODY_CLASS = 'max-w-[62ch] font-mono text-[19px] leading-[1.5] text-foreground/85';

function useMotion() {
  return useRenderMode().mode === 'full';
}

export function BackLink() {
  return (
    <a href="/" className="clinical-label mb-10 inline-block text-primary-legible transition-colors hover:text-accent">
      ← Back
    </a>
  );
}

// A hairline that draws itself left to right as it scrolls in; a short red
// head runs along the tip while it draws, then the line settles to grey.
export function DrawnRule({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref, { start: 0.98, end: 0.6, enabled: useMotion() });
  return (
    <div ref={ref} aria-hidden className={`drawn-rule pointer-events-none absolute inset-x-0 h-px ${className}`} />
  );
}

/** A section title that condenses out of dither dots into solid light as it scrolls in. */
export function DitherHeading({ children, className = H2_CLASS, id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const motion = useMotion();
  useScrollProgress(ref, { start: 0.95, end: 0.5, enabled: motion });
  return (
    <h2 ref={ref} id={id} className={`${className} ${motion ? 'dither-head' : ''}`}>
      {children}
    </h2>
  );
}

/** Swiss split: the title pins in the left five columns while the content scrolls in the right seven. */
export function PageSection({ title, children, id }: { title: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-28 grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-6">
      <div className="md:col-span-5">
        <div className="md:sticky md:top-28">
          <DitherHeading>{title}</DitherHeading>
        </div>
      </div>
      <div className="md:col-span-7">{children}</div>
    </section>
  );
}

/** A long-text section in the same layout: sticky heading left, readable text right. */
export function TextSection({ title, id, children }: { title: ReactNode; id?: string; children: ReactNode }) {
  return (
    <PageSection id={id} title={title}>
      <div className="space-y-6 font-mono text-[19px] leading-[1.5] text-foreground/85 [&>p]:max-w-[62ch] [&>ul]:max-w-[62ch]">{children}</div>
    </PageSection>
  );
}

export type RuledRow = { label: string; value: ReactNode; note?: ReactNode; id?: string };

export function RuledRows({ rows, className = 'mt-8', wide = true }: { rows: RuledRow[]; className?: string; wide?: boolean }) {
  return (
    <dl className={`relative ${className}`}>
      {rows.map((r) => (
        <div
          key={r.label}
          id={r.id}
          className={`relative grid grid-cols-1 gap-1 py-4 font-mono text-[19px] leading-[1.3] md:gap-6 md:py-5 md:text-[clamp(19px,1.7vw,24px)] ${
            wide ? 'md:grid-cols-[minmax(8rem,1fr)_3fr]' : 'md:grid-cols-[minmax(7rem,2fr)_5fr]'
          }`}
        >
          <DrawnRule className="top-0" />
          <dt className="uppercase text-foreground/60">{r.label}</dt>
          <dd className="text-foreground">
            {r.value}
            {r.note && <span className="mt-1.5 block text-[17px] text-foreground/60">{r.note}</span>}
          </dd>
        </div>
      ))}
      <DrawnRule className="bottom-0" />
    </dl>
  );
}

const KIND_LABEL: Record<string, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive web',
  tool: 'Tools',
  tutorial: 'Tutorials',
};

// The home's work cards: red dither whose true colour melts through under the
// mouse, a display title, one line. Touch taps go straight to the case.
export function StillsRow({ projects }: { projects: Project[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link to={`/work/${project.id}`} className="group block">
            {project.image && <DitherReveal src={project.image} alt={`${project.title}, project still`} aspect={1} touch={false} />}
            <h3 className="mt-4 font-display text-[clamp(20px,1.6vw,28px)] uppercase text-foreground transition-colors group-hover:text-accent">
              {project.title}
            </h3>
            <p className="mt-1 font-mono text-[16px] text-foreground/60">
              {KIND_LABEL[project.kind]} · {project.short ?? project.tagline}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
