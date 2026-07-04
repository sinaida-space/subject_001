// ── Shared service copy for /booking ──
// Lifted verbatim from src/components/ServicesTerminal.tsx (buyer-language copy).
// NOTE: ServicesTerminal.tsx keeps its own inline copy of these same three blocks —
// this file is NOT yet imported by ServicesTerminal.tsx (deferred to avoid a merge
// conflict with recently-landed work). If you edit this copy, also update
// ServicesTerminal.tsx's SERVICES array to keep the two in sync until that
// refactor lands.

import { projectById } from '@/data/projects';

const redkiePtitsy = projectById('redkie-ptitsy');
const redkiePtitsyName = redkiePtitsy?.title.split('—')[0].trim();
const redkiePtitsyProof = redkiePtitsy
  ? `${redkiePtitsyName} — 19 unique projections, one per song.`
  : undefined;

export interface Service {
  code: string;
  title: string;
  description: string;
  leadTime: string;
  brief: string;
  proof?: string;
}

export const SERVICES: Service[] = [
  {
    code: 'SRV.001',
    title: 'For music festivals & concerts',
    description:
      'Audio-reactive stage visuals built per song or per set — real-time TouchDesigner systems that listen to the live mix. Delivered as a turnkey show or operated live.',
    leadTime: 'Typical lead time: 4–8 weeks depending on set length.',
    brief: 'Brief to show: send the setlist and stage dimensions.',
    proof: redkiePtitsyProof,
  },
  {
    code: 'SRV.002',
    title: 'For theater & dance',
    description:
      'Responsive scenography: projections that react to performers, sound, and story — from concept with the director through to opening night.',
    leadTime: 'Typical lead time: 8–12 weeks, from first concept meeting.',
    brief: 'Brief to show: send the script or choreography notes and venue specs.',
  },
  {
    code: 'SRV.003',
    title: 'For venues, brands & institutions',
    description:
      'Immersive installations and generative visual identities — projection-mapped spaces and systems built to run unattended.',
    leadTime: 'Typical lead time: 6–10 weeks depending on scope.',
    brief: 'Brief to show: send the space (photos/plans) and the occasion.',
  },
];
