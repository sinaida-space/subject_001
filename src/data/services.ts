// ── Single source of truth for service copy, consumed by ServicesTerminal
// (homepage) and Collaborate (/collaborate). Edit once, both surfaces update. ──
//
// Rule for this file (audit 2026-08-02, F-001): every `record` line states only
// what actually happened, in the same words the case study uses. "Prototyped"
// never becomes "installed". But a record states capability, not career stage:
// describe what the systems do, never how few of them have been commissioned.
//
// NBSP below is a non-breaking space, used after "and" and inside every project
// name so a title never breaks across two lines. It is a named constant rather
// than a literal character so it stays visible to whoever edits this next.

const NBSP = ' ';

export interface RecordPart {
  text: string;
  href?: string;
}

export interface Service {
  code: string;
  title: string;
  description: string;
  /** one-line proof of work: a brief mention plus the linked project name */
  record: RecordPart[];
  brief: string;
}

export const SERVICES: Service[] = [
  {
    code: 'festivals',
    title: 'For music festivals & concerts',
    description:
      'Audio-reactive stage visuals, one system per song, listening to the live mix straight from the desk. Delivered as a turnkey show or operated live.',
    record: [
      { text: 'Nine projections, one per song, performed live with ' },
      { text: `Redkie${NBSP}Ptitsy`, href: '/work/redkie-ptitsy' },
      { text: ` at Sklad${NBSP}№3, Moscow, March${NBSP}2026.` },
    ],
    brief: 'Brief to show: send the setlist and stage dimensions.',
  },
  {
    code: 'web',
    title: 'For interactive web',
    description:
      'Sites and components that move, react, and watch. Real-time WebGL and shaders, camera and gesture control running on-device, generative sound. Delivered as a finished site, or as a single component handed to a team that already has developers.',
    record: [
      { text: 'Every interactive piece on this site was built this way, including ' },
      { text: `Aether${NBSP}Currents`, href: '/work/aether-currents' },
      { text: ` and${NBSP}` },
      { text: `Ethereal${NBSP}Path`, href: '/work/ethereal-path' },
      { text: '. All live, all playable now.' },
    ],
    brief: 'Brief to launch: send the site you have, and what should happen when someone arrives.',
  },
  {
    code: 'theater',
    title: 'For theater & dance',
    description:
      'Responsive scenography: real-time systems that follow the performers’ bodies and the sound, developed with the creative team from first concept onward.',
    record: [
      { text: 'The tracking runs live and in public: hands drive sound and image in ' },
      { text: `Aether${NBSP}Currents`, href: '/work/aether-currents' },
      { text: `, head and${NBSP}hands steer the whole scene in ` },
      { text: `Ethereal${NBSP}Path`, href: '/work/ethereal-path' },
      { text: '.' },
    ],
    brief: 'Brief to show: send the script or choreography notes and venue specs.',
  },
  {
    code: 'venues',
    title: 'For venues, brands & institutions',
    description:
      'Immersive installations and generative visual identities, adapted to the space they run in.',
    record: [
      { text: 'Prototyped as a projection installation for ' },
      { text: `The${NBSP}Eyes${NBSP}Chico`, href: '/work/the-eyes-chico' },
      { text: `, Prague${NBSP}2026. The web form is finished and${NBSP}live.` },
    ],
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
  },
];
