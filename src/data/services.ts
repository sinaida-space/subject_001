// ── Single source of truth for service copy — consumed by ServicesTerminal
// (homepage) and Collaborate (/collaborate). Edit once, both surfaces update. ──

export interface RecordPart {
  text: string;
  href?: string;
}

export interface Service {
  code: string;
  title: string;
  description: string;
  /** one-line proof of work — a brief mention plus the linked project name */
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
      { text: 'Shown live with ' },
      { text: 'Redkie Ptitsy', href: '/work/redkie-ptitsy' },
      { text: ' at Sklad №3, Moscow.' },
    ],
    brief: 'Brief to show: send the setlist and stage dimensions.',
  },
  {
    code: 'theater',
    title: 'For theater & dance',
    description:
      'Responsive scenography: real-time systems that follow the performers’ bodies and the sound — developed with the creative team from first concept onward.',
    record: [
      { text: 'Built for ' },
      { text: 'Aether Currents', href: '/work/aether-currents' },
      { text: ' and ' },
      { text: 'The Eyes Chico', href: '/work/the-eyes-chico' },
      { text: '.' },
    ],
    brief: 'Brief to show: send the script or choreography notes and venue specs.',
  },
  {
    code: 'venues',
    title: 'For venues, brands & institutions',
    description:
      'Immersive installations and generative visual identities, adapted to a space and designed to run unattended, day after day.',
    record: [
      { text: 'Installed for ' },
      { text: 'The Eyes Chico', href: '/work/the-eyes-chico' },
      { text: '.' },
    ],
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
  },
];
