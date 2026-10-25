// Practice tags: what Sinaida did on a work, never the tools.
// Each practice is a service someone can hire her for and points at one of
// the service lanes in services.ts, so a practice page doubles as proof.
//
// Keep each entry on the shape below: scripts/lib/site-data.mjs scans this
// file for the prerendered /practice/ pages, the sitemap and the JSON-LD.

export type PracticeId =
  | 'live-visuals'
  | 'gesture'
  | 'interactive-web'
  | 'projection'
  | 'generative-sound'
  | 'collaborations';

export interface Practice {
  id: PracticeId;
  label: string;
  /** one line under the heading of the practice page (approved copy) */
  description: string;
  /** the service lane on /collaborate this practice proves; none when it serves every lane */
  lane?: string;
}

export const PRACTICES: Practice[] = [
  {
    id: 'live-visuals',
    label: 'Live & audio-reactive visuals',
    description: 'Sound shapes the visuals in real time.',
    lane: 'For musicians, dance & theater',
  },
  {
    id: 'gesture',
    label: 'Gesture-controlled experiences',
    description: 'The body is the controller: hands, head and movement steer the piece.',
    lane: 'For venues, brands & institutions',
  },
  {
    id: 'interactive-web',
    label: 'Interactive web experiences',
    description: 'Browser works with a live link, from concept to launch, built through agentic coding.',
    lane: 'For interactive web',
  },
  {
    id: 'projection',
    label: 'Projection & installation design',
    description: 'Projection designs for stages and rooms, from a live concert to installation proposals.',
    lane: 'For venues, brands & institutions',
  },
  {
    id: 'generative-sound',
    label: 'Generative sound',
    description: 'Sound written as rules, so each session plays out its own way.',
    lane: 'For musicians, dance & theater',
  },
  {
    id: 'collaborations',
    label: 'Artist collaborations',
    description: 'Artists bring their work, I build a living world around it.',
  },
];

/** Shared line on every practice page. */
export const PRACTICE_SHARED_LINE =
  'From first idea to a working piece: concept, experience design and the build.';

export const practiceById = (id: string): Practice | undefined => PRACTICES.find((p) => p.id === id);

export const practicePath = (id: PracticeId) => `/practice/${id}`;
