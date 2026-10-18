import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_ROLE, type Project } from '@/data/projects';
import { practiceById, practicePath, type PracticeId } from '@/data/practices';

// Practice tags (studio#70): every chip is a link to the page of works in
// that practice. Grey at rest, the one red on hover and focus.
const CHIP_CLASS =
  'inline-block border border-border px-[10px] py-[3px] font-mono text-[16px] uppercase tracking-[0.15em] text-foreground/60 transition-colors hover:border-primary hover:text-primary-legible focus-visible:border-primary focus-visible:text-primary-legible';

export function PracticeChips({ ids, current, className = 'pt-1' }: { ids: PracticeId[]; current?: PracticeId; className?: string }) {
  const practices = ids.filter((id) => id !== current).map(practiceById).filter((p) => p !== undefined);
  if (practices.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Practices">
      {practices.map((p) => (
        <li key={p.id}>
          <Link to={practicePath(p.id)} className={CHIP_CLASS}>
            {p.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// `[label](https://…)` becomes an external link; anything else stays text.
function renderLinks(text: string) {
  return text.split(/(\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (!m) return <Fragment key={i}>{part}</Fragment>;
    return (
      <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-primary underline-offset-4 hover:text-primary-legible">
        {m[1]}
      </a>
    );
  });
}

/** One line on how the work was made; web works fall back to the role line. */
export function MadeLine({ project, className = '' }: { project: Project; className?: string }) {
  const text = project.made ?? project.role ?? DEFAULT_ROLE;
  return <p className={`font-mono text-[16px] leading-snug text-foreground/55 ${className}`}>{renderLinks(text)}</p>;
}
