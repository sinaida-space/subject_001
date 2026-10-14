// ── Single source of truth for service copy, consumed by ServicesTerminal
// (homepage) and Collaborate (/collaborate). Edit once, both surfaces update. ──
//
// Rule for this file (audit 2026-08-02, F-001): every `record` line states only
// what actually happened, in the same words the case study uses. "Prototyped"
// never becomes "installed".
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
  /** oversized display word shown on the homepage */
  word: string;
  title: string;
  description: string;
  /** one-line proof of work: a brief mention plus the linked project name */
  record: RecordPart[];
  brief: string;
  /** homepage line, much shorter than `description` (which /collaborate keeps) */
  short: string;
  /** homepage proof line: the project name links to /work/<project> */
  caption: { project: string; text: string };
}

export const SERVICES: Service[] = [
  {
    code: 'stage',
    word: 'STAGE',
    title: 'For musicians, dance & theater',
    description:
      'Audio-reactive stage visuals, one TouchDesigner system per song or scene, developed with the band or the creative team from the first concept to show day.',
    record: [
      { text: 'Nine projections, one per song, performed live with ' },
      { text: `Redkie${NBSP}Ptitsy`, href: '/work/redkie-ptitsy' },
      { text: ` at Sklad${NBSP}No.${NBSP}3, Moscow, March${NBSP}2026. The body tracking grew out of${NBSP}` },
      { text: `Ethereal${NBSP}Path`, href: '/work/ethereal-path' },
      { text: `, an${NBSP}experiment where the${NBSP}body is the${NBSP}controller.` },
    ],
    brief: 'Brief to show: send the setlist or the choreography notes, and the stage dimensions.',
    short: `Audio-reactive visuals built for${NBSP}the${NBSP}performers, one${NBSP}system per${NBSP}song.`,
    caption: { project: 'redkie-ptitsy', text: `audio-reactive visuals for${NBSP}an${NBSP}indie rock set, from concept to${NBSP}show` },
  },
  {
    code: 'web',
    word: 'SCREEN',
    title: 'For interactive web',
    description:
      'Sites and components that respond to the visitor. Real-time WebGL and shaders, camera and gesture control running on-device, generative sound. Delivered as a finished site, or as a single component handed to a team that already has developers.',
    record: [
      { text: 'Every interactive piece on this site was built this way, including ' },
      { text: `Aether${NBSP}Currents`, href: '/work/aether-currents' },
      { text: '. All live, all playable now.' },
    ],
    brief: 'Brief to launch: send the site you have, and what should happen when someone arrives.',
    short: `Digital experiences that respond to${NBSP}the${NBSP}visitor’s hands and${NBSP}face, right in${NBSP}the${NBSP}browser.`,
    caption: { project: 'aether-currents', text: `a${NBSP}musical instrument that lives in${NBSP}a${NBSP}browser tab, made with a${NBSP}musician` },
  },
  {
    code: 'venues',
    word: 'SPACE',
    title: 'For venues, brands & institutions',
    description:
      'Immersive installations and generative visual identities, adapted to the space they run in.',
    record: [
      { text: 'Prototyped as interactive projections for ' },
      { text: `The${NBSP}Eyes${NBSP}Chico`, href: '/work/the-eyes-chico' },
      { text: ' and ' },
      { text: `CONSPACE${NBSP}ROOMS`, href: '/work/conspace-rooms' },
      { text: `, Prague${NBSP}2026. Both web forms are finished and${NBSP}live.` },
    ],
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
    short: `Immersive installations that turn a${NBSP}collection, a${NBSP}venue or${NBSP}a${NBSP}brand into a${NBSP}world to${NBSP}walk${NBSP}through.`,
    caption: { project: 'conspace-rooms', text: `Alisa${NBSP}Feer’s artworks, turned into a${NBSP}world with its own lore, from concept to${NBSP}code` },
  },
];
