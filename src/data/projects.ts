// ── Single source of truth for every work Sinaida shows on the site ──
// Consumed by: the Constellation graph, Selected Works rows, Experiments list,
// and (via the SEO script / llms.txt) the static content layer.

import workRedkiePtitsy from '@/assets/work-redkie-ptitsy.jpg';
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
  /** always-labeled star in the Signal Map — the two flagship works */
  hero?: boolean;
  /** relative visual weight of the star in the constellation (1 = default) */
  weight?: number;
  /** full written piece behind the project — opens as a text popup */
  essay?: {
    contentWarning?: string;
    paragraphs: string[];
    credits?: string[];
  };
}

export const PROJECTS: Project[] = [
  // ── Flagship stage work ────────────────────────────────────
  {
    id: 'redkie-ptitsy',
    title: 'Redkie Ptitsy — Live Concert Visuals',
    kind: 'stage',
    tagline: 'Live at Sklad №3, Moscow · 26 March 2026 · 9 projections, one per song',
    blurb:
      'Performed live on 26 March 2026 at Sklad №3, Moscow: a full-set stage backdrop for the band Redkie Ptitsy. Nine unique audio-reactive projections — one crafted for each song — ran in real time behind the band all night, built as TouchDesigner systems that listen to the live mix and paint the room in response. This is the service festivals and touring productions book.',
    tools: ['TouchDesigner', 'Audio analysis', 'Live signal chain'],
    skills: [
      'touchdesigner',
      'audio-reactive',
      'projection-mapping',
      'creative-direction',
      'event-design',
      'visual-narrative',
    ],
    image: workRedkiePtitsy,
    video: 'bDDAXRlz5FQ',
    links: [
      { label: 'Live (YouTube)', url: 'https://youtube.com/shorts/bDDAXRlz5FQ' },
      { label: 'Redkie Ptitsy', url: 'https://www.instagram.com/redkieptitsyband/' },
    ],
    badges: ['sound'],
    featured: true,
    hero: true,
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
    skills: ['projection-mapping', 'generative-ai', 'touchdesigner', 'davinci', 'concept-design', 'interactive-installations'],
    image: workSubmerged,
    video: '7qgDlifWno0',
    links: [
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
    skills: ['touchdesigner', 'audio-reactive', 'algorithmic-systems', 'generative-ai', 'interactive-installations'],
    image: workSynesthetic,
    video: 'TP9bAl6Juk8',
    links: [{ label: 'YouTube', url: 'https://youtu.be/TP9bAl6Juk8' }],
    featured: true,
    weight: 1.3,
  },

  {
    id: 'the-eyes-chico',
    title: 'The Eyes Chico',
    kind: 'installation',
    tagline: 'Acrylic painting turned immersive installation & web experience · with Alisa Feer',
    blurb:
      'A collaboration with artist Alisa Feer: her acrylic painting is the origin of the piece, translated into a living digital scene that exists twice — as an immersive projection installation and as a web experience steered by bare hands, with on-device camera tracking (palm to steer, fist to dive, pinch to pick). Pigment holds still; code refuses to. A study in what a painting gains, and what it guards, when it starts to move.',
    tools: ['Web', 'MediaPipe hand tracking', 'Acrylic on canvas'],
    skills: ['interactive-installations', 'creative-web', 'body-tracking', 'visual-narrative', 'concept-design', 'perception-media'],
    url: 'https://the-eyes-chico.sinaida.eu/',
    video: 'dvNl1G2fVLM',
    links: [
      { label: 'Enter the website', url: 'https://the-eyes-chico.sinaida.eu/' },
      { label: 'Installation (YouTube)', url: 'https://youtube.com/shorts/dvNl1G2fVLM' },
      { label: 'Alisa Feer', url: 'https://uvaliss.ru/' },
      { label: 'Project sheet (PDF)', url: '/files/the-eyes-chico-project-sheet.pdf' },
    ],
    badges: ['camera'],
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
      { label: 'Instagram', url: 'https://www.instagram.com/p/DTsKFpxAloa/' },
    ],
    weight: 1,
    essay: {
      contentWarning: 'CW: health.',
      paragraphs: [
        'How much can or should we outsource to the silicon brains?',
        'The vast majority of the species on our planet leave their legacy by reproducing. First humans made a cognitive leap with tools. Then we decided that the mechanical utility is not enough for many of us to feel this world - we want to surround ourselves with aesthetics, seeking a legacy beyond biology.',
        'AI is a yet another tool, but with the tectonic shift it brings, how can we now tell where the human idea ends and what we see is just a lucky result of a stochastic output? Should we now say that only organic brain processes deserve to be noticed?',
        'I am 36. I do not have kids. Instead, I have an abnormal growth in my uterus, that has been giving me pain with each move for the recent year. I have never liked kids. Partially due to a psychological fear to bring a new life into a world, where I grew up always feeling I am not good enough because my father has never been around and only briefly appeared when I was a teen and never bothered since. With each single day my fear of not having kids and not leaving someone after me is growing exponentially. Last year, when I wanted to freeze my egg cells to postpone the decision of having kids, during the checks I have discovered that this was not very possible due to my body deciding to grow a toxic, useless mass instead of a new life. My womb produces a soulless structure, that has no use and needs to be removed - kind of the same as useless AI generated images in the feed, that can leave no legacy.',
      ],
      credits: [
        'Image generation: @midjourney',
        'Upscale, inpaint: @higgsfield.ai @artlist.io',
        'Color grading: @affinity',
      ],
    },
  },

  // ── Perception research (interactive web experiences) ──────
  {
    id: 'stereolove',
    title: 'Stereolove',
    kind: 'game',
    tagline: 'Head-coupled op-art — the screen becomes an unstable optical volume',
    blurb:
      "The browser estimates the viewer's head position with on-device face tracking and shifts the projection in response, so the monitor behaves like an optical volume behind glass — op-art interference, a star tunnel, anamorphic text that only resolves from one viewpoint. One ritual gesture (an open hand raised near the face) opens the next question. The same off-axis, viewer-coupled craft that stage illusions are built from.",
    tools: ['Web', 'MediaPipe face & hand tracking'],
    skills: ['creative-web', 'body-tracking', 'perception-media', 'human-ai', 'concept-design', 'interactive-installations'],
    url: 'https://sinaida-space.github.io/stereolove/?v=768a0af',
    badges: ['camera'],
    hero: true,
    weight: 1,
  },
  {
    id: 'ethereal-path',
    title: 'Ethereal Path',
    kind: 'game',
    tagline: 'Off-axis descent steered by head & hand movement — the body is the controller',
    blurb:
      "An interactive descent from beneath a water surface into a nebula, steered entirely by head and hand movement through the webcam — all tracking on-device, nothing leaves the machine. Raymarched GLSL, no frameworks. Built as a physical reset for people who sit too long at screens, and a working study in movement-driven visuals: the same system that lets a performer's body drive the image.",
    tools: ['WebGL2 / GLSL raymarching', 'MediaPipe body tracking', 'Web Audio'],
    skills: ['creative-web', 'body-tracking', 'algorithmic-systems', 'perception-media', 'interactive-installations'],
    url: 'https://sinaida-space.github.io/ethereal-path/',
    badges: ['camera'],
    weight: 1.1,
  },
  // ── Tools & guides ─────────────────────────────────────────
  {
    id: 'mahler',
    title: 'Mahler — The Orchestrator',
    kind: 'tool',
    tagline: 'Orchestrator for Claude',
    blurb: 'A multi-model orchestrator for Claude, designed to maximize ROI on tokens.',
    tools: ['Claude', 'GitHub'],
    skills: ['tech-strategy', 'system-architecture', 'ai-orchestration', 'algorithmic-systems'],
    url: 'https://github.com/sinaida-space/mahler-the-orchestrator',
    links: [{ label: 'GitHub', url: 'https://github.com/sinaida-space/mahler-the-orchestrator' }],
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
