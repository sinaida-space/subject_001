// ── Single source of truth for every work Sinaida shows on the site ──
// Consumed by: the Constellation graph, Selected Works rows, Experiments list,
// and (via the SEO script / llms.txt) the static content layer.

import workSubmerged from '@/assets/work-submerged.jpg';
import workLegacy from '@/assets/work-legacy.jpg';
import workSynesthetic from '@/assets/work-synesthetic.jpg';

export type ProjectKind =
  | 'stage'        // live concert / performance visuals
  | 'installation' // projection mapping / immersive
  | 'conceptual'   // image series / research art
  | 'game'         // interactive web experiences
  | 'tool';        // utilities & guides

export type Badge = 'camera' | 'sound' | 'cursor' | 'scroll' | 'ru';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: string;
  title: string;
  year?: string;
  kind: ProjectKind;
  /** one-line descriptor, used in lists and as constellation tooltip */
  tagline: string;
  /** 2–3 sentences revealed when a Selected Works row expands */
  blurb?: string;
  tools?: string[];
  /** ids of the skill nodes this project connects to in the graph */
  skills: string[];
  /** external destination (games / tools open this on node click) */
  url?: string;
  /** YouTube id for an inline lazy embed */
  video?: string;
  /** still image (used when there is no video) */
  image?: string;
  links?: ProjectLink[];
  badges?: Badge[];
  /** shows as an expandable row in Selected Works */
  featured?: boolean;
  /** relative visual weight of the star in the constellation (1 = default) */
  weight?: number;
}

export const PROJECTS: Project[] = [
  // ── Flagship stage work ────────────────────────────────────
  {
    id: 'redkie-ptitsy',
    title: 'Redkie Ptitsy — Live Concert Visuals',
    year: '2026',
    kind: 'stage',
    tagline: 'Live at Sklad №3, Moscow · 26 March 2026 · 19 projections, one per song',
    blurb:
      'Performed live on 26 March 2026 at Sklad №3, Moscow: a full-set stage backdrop for the band Redkie Ptitsy. Nineteen unique audio-reactive projections — one crafted for each song — ran in real time behind the band all night, built as TouchDesigner systems that listen to the live mix and paint the room in response. This is the service festivals and touring productions book.',
    tools: ['TouchDesigner', 'Audio analysis', 'Live signal chain'],
    skills: [
      'touchdesigner',
      'audio-reactive',
      'projection-mapping',
      'creative-direction',
      'event-design',
      'visual-narrative',
    ],
    video: 'bDDAXRlz5FQ',
    links: [
      { label: 'Live (YouTube)', url: 'https://youtube.com/shorts/bDDAXRlz5FQ' },
      { label: 'Redkie Ptitsy', url: 'https://www.instagram.com/redkieptitsyband/' },
    ],
    badges: ['sound'],
    featured: true,
    weight: 1.6,
  },

  // ── Installations ──────────────────────────────────────────
  {
    id: 'submerged',
    title: 'Submerged Realities',
    kind: 'installation',
    tagline: 'Projection-mapping study on fluid surfaces',
    blurb:
      'AI-generated aesthetics mapped onto moving water — digital textures interacting with the physics of fluid and red-light environments. A study in how generative imagery behaves once it leaves the screen and lands on a living surface.',
    tools: ['TouchDesigner', 'AI visuals', 'DaVinci Resolve'],
    skills: ['projection-mapping', 'generative-ai', 'touchdesigner', 'davinci', 'concept-design'],
    image: workSubmerged,
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245412721/Submerged-Realities-Projection-Mapping-Study' },
      { label: 'YouTube', url: 'https://youtube.com/shorts/7qgDlifWno0' },
      { label: 'Instagram', url: 'https://www.instagram.com/p/DVVB4K9gh9x/' },
    ],
    featured: true,
    weight: 1.3,
  },
  {
    id: 'synesthetic',
    title: 'Synesthetic Bloom',
    kind: 'installation',
    tagline: 'Audio-responsive digital organism with a heartbeat',
    blurb:
      'Sound transformed into pulsating architecture — a digital structure whose heartbeat is synchronised to its auditory environment. Proof of the real-time sound-to-visual craft that drives the stage work.',
    tools: ['TouchDesigner', 'Suno'],
    skills: ['touchdesigner', 'audio-reactive', 'algorithmic-systems', 'generative-ai'],
    image: workSynesthetic,
    video: 'TP9bAl6Juk8',
    links: [{ label: 'YouTube', url: 'https://youtu.be/TP9bAl6Juk8' }],
    featured: true,
    weight: 1.3,
  },

  // ── Conceptual ─────────────────────────────────────────────
  {
    id: 'legacy',
    title: 'Legacy in the Age of Stochastic Output',
    kind: 'conceptual',
    tagline: 'Image series on biology, finality & AI',
    blurb:
      'A conceptual image series exploring infertility, biological finality, and artificial intelligence. If a silicon brain produces a "stochastic legacy", where does the soul reside? The narrative depth behind the visual practice.',
    tools: ['Generative AI', 'Higgsfield.ai', 'Affinity'],
    skills: ['generative-ai', 'visual-narrative', 'concept-design', 'computational-aesthetics', 'human-ai'],
    image: workLegacy,
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245414325/Legacy-in-the-Age-of-Stochastic-Output' },
      { label: 'Instagram', url: 'https://www.instagram.com/p/DTsKFpxAloa/' },
    ],
    featured: true,
    weight: 1.2,
  },

  // ── Interactive experiments (games) ────────────────────────
  {
    id: 'stereolove',
    title: 'Stereolove',
    kind: 'game',
    tagline: 'Hand-tracking question game · camera',
    tools: ['Web', 'Camera / hand tracking'],
    skills: ['creative-web', 'perception-media', 'human-ai', 'concept-design'],
    url: 'https://sinaida-space.github.io/stereolove/?v=768a0af',
    badges: ['camera'],
    weight: 1,
  },
  {
    id: 'void',
    title: 'Void',
    kind: 'game',
    tagline: 'One-shot ritual · sound on',
    tools: ['Web', 'Sound'],
    skills: ['creative-web', 'concept-design', 'visual-narrative'],
    url: 'https://veil-of-sight.lovable.app',
    badges: ['sound'],
    weight: 1,
  },
  {
    id: 'the-well',
    title: 'The Well',
    kind: 'game',
    tagline: 'Questions by theme · cursor-reactive',
    tools: ['Web', 'Cursor interaction'],
    skills: ['creative-web', 'visual-narrative', 'perception-media'],
    url: 'https://sinaida-space.github.io/the-well/',
    badges: ['cursor'],
    weight: 1,
  },
  {
    id: 'crystal',
    title: 'Crystal',
    kind: 'game',
    tagline: 'Scroll-driven crystal forge',
    tools: ['Web', 'Scroll animation'],
    skills: ['creative-web', 'algorithmic-systems', 'generative-ai'],
    url: 'https://mind-crystal-forge.lovable.app',
    badges: ['scroll'],
    weight: 1,
  },

  // ── Tools & guides ─────────────────────────────────────────
  {
    id: 'seedance',
    title: 'Seedance Director',
    kind: 'tool',
    tagline: 'Prompter GPT for Seedance',
    tools: ['Custom GPT'],
    skills: ['generative-ai', 'tech-strategy'],
    url: 'https://chatgpt.com/g/g-69f13ad1c9f48191853247023b576bfb-seedance-director-by-sinaida',
    weight: 0.9,
  },
  {
    id: 'dreamscape',
    title: 'Dreamscape Navigator',
    kind: 'tool',
    tagline: 'Creative-problem guides (RU)',
    tools: ['Web', 'Guides'],
    skills: ['concept-design', 'tech-strategy', 'human-ai'],
    url: 'https://dreamscape-navigator-24.lovable.app',
    links: [
      { label: 'Dreamscape', url: 'https://dreamscape-navigator-24.lovable.app' },
      { label: 'Вопросы к себе', url: 'https://sinaida-space.github.io/voprosy_k_sebe/' },
    ],
    badges: ['ru'],
    weight: 0.9,
  },
];

export const FEATURED_WORKS = PROJECTS.filter((p) => p.featured);
export const EXPERIMENTS = PROJECTS.filter((p) => p.kind === 'game');
export const TOOLS = PROJECTS.filter((p) => p.kind === 'tool');

export const projectById = (id: string): Project | undefined =>
  PROJECTS.find((p) => p.id === id);

export const BADGE_LABEL: Record<Badge, string> = {
  camera: 'camera',
  sound: 'sound',
  cursor: 'cursor',
  scroll: 'scroll',
  ru: 'RU',
};
