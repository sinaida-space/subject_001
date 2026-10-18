import { DEFAULT_ROLE, type Project } from '@/data/projects';
import { DrawnRule } from '@/components/PageParts';
import { PracticeChips } from '@/components/PracticeChips';

// The ruled facts table of a work: Role, With, Practice (studio#70). One
// component for the case page and the constellation card, so they never drift.
export default function WorkFacts({ project, className = 'mt-8' }: { project: Project; className?: string }) {
  // one entry per line, so a list never breaks mid-separator
  // Role first, never a claim of engineering craft (studio#1).
  const facts: [string, string[]][] = [['Role', [project.role ?? DEFAULT_ROLE]]];
  const contributors = project.caseStudy?.contributors;
  if (contributors?.length) facts.push(['With', contributors.map((c) => c.name)]);

  return (
    <dl className={`relative ${className}`}>
      {facts.map(([key, val]) => (
        <div key={key} className="relative grid grid-cols-[7rem_1fr] gap-4 py-3 font-mono text-[17px] leading-[1.3]">
          <DrawnRule className="top-0" />
          <dt className="uppercase text-foreground/60">{key}</dt>
          <dd className="text-foreground">
            {val.map((v) => <span key={v} className="block">{v}</span>)}
          </dd>
        </div>
      ))}
      {/* practice tags as links to their pages */}
      <div className="relative grid grid-cols-[7rem_1fr] gap-4 py-3 font-mono text-[17px] leading-[1.3]">
        <DrawnRule className="top-0" />
        <dt className="uppercase text-foreground/60">Practice</dt>
        <dd>
          <PracticeChips ids={project.practices} className="" />
        </dd>
      </div>
      <DrawnRule className="bottom-0" />
    </dl>
  );
}
