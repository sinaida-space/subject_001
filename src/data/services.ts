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
  /** proof line — the shipped work stated as fact, no persuasion */
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
      { text: 'Shipped: ' },
      { text: 'Redkie Ptitsy', href: '/work/redkie-ptitsy' },
      { text: ' · Sklad №3, Moscow · full set, one system per song.' },
    ],
    brief: 'Brief to show: send the setlist and stage dimensions.',
  },
  {
    code: 'theater',
    title: 'For theater & dance',
    description:
      'Responsive scenography: real-time systems that follow the performers’ bodies and the sound — developed with the creative team from first concept onward.',
    record: [
      { text: 'On-device body tracking driving image and sound in real time — ' },
      { text: 'Aether Currents', href: '/work/aether-currents' },
      { text: ' · ' },
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
      { text: 'Tech rider: one laptop · one projector · optional camera — ' },
      { text: 'The Eyes Chico', href: '/work/the-eyes-chico' },
      { text: ', fully on-device.' },
    ],
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
  },
];
