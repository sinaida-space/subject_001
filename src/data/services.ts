// ── Single source of truth for service copy — consumed by ServicesTerminal
// (homepage) and Booking (/booking). Edit once, both surfaces update. ──

export interface Service {
  code: string;
  title: string;
  description: string;
  leadTime: string;
  brief: string;
}

export const SERVICES: Service[] = [
  {
    code: 'SRV.001',
    title: 'For music festivals & concerts',
    description:
      'Audio-reactive stage visuals built per song or per set — real-time TouchDesigner systems that listen to the live mix. Delivered as a turnkey show or operated live.',
    leadTime: 'Typical lead time: 4–8 weeks depending on set length.',
    brief: 'Brief to show: send the setlist and stage dimensions.',
  },
  {
    code: 'SRV.002',
    title: 'For theater & dance',
    description:
      'Responsive scenography: real-time systems that react to performers, sound, and story — developed with the creative team from first concept onward.',
    leadTime: 'Typical lead time: 8–12 weeks, from first concept meeting.',
    brief: 'Brief to show: send the script or choreography notes and venue specs.',
  },
  {
    code: 'SRV.003',
    title: 'For venues, brands & institutions',
    description:
      'Immersive installations and generative visual identities — the same real-time systems behind independent works like Submerged Realities and Synesthetic Bloom, adapted for a space and designed to run unattended.',
    leadTime: 'Typical lead time: 6–10 weeks depending on scope.',
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
  },
];
