// Every project is named in capitals on the site (#160). The source keeps the
// real title, so screen readers and search read the proper name; the caps
// come from CSS (.project-name in index.css). This wraps the names found in a
// run of prose.

import { Fragment, type ReactNode } from 'react';
import { PROJECTS } from '@/data/projects';

// "The Eyes, Chico" is how the prose writes The Eyes Chico.
const NAMES = [...new Set([...PROJECTS.map((p) => p.title), 'The Eyes, Chico'])].sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ \u00a0]/g, '[ \\u00a0]');
const NAME_RE = new RegExp(`(${NAMES.map(escape).join('|')})`, 'g');

/** `text` with each project name wrapped in a .project-name span */
export function withProjectNames(text: string): ReactNode {
  const parts = text.split(NAME_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={i} className="project-name">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
