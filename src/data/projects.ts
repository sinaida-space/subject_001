// ── Single source of truth for every work Sinaida shows on the site ──
// Consumed by: the Constellation graph, Selected Works rows, Experiments list,
// and (via the SEO script / llms.txt) the static content layer.

import workRedkiePtitsy from '@/assets/work-redkie-ptitsy.jpg';
import workEyesChico from '@/assets/work-eyes-chico.jpg';
import workSubmerged from '@/assets/work-submerged.jpg';
import workAetherCurrents from '@/assets/work-aether-currents.jpg';
import workEtherealPath from '@/assets/work-ethereal-path.jpg';

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

/** One labeled media section on a case page (YouTube embed + optional caption). */
export interface CaseMedia {
  label: string;
  video: string;
  caption?: string;
}

/** Content of the animated signal-chain diagram on a case page. */
export interface CaseMethod {
  trace: string;
  stages: { label: string; detail: string }[];
  footer: string;
}

/**
 * Everything a /work/<id> case page needs beyond the base Project fields.
 * A project without `caseStudy` has no case page (the route 404s).
 */
export interface CaseStudy {
  /** badge text next to the tagline, e.g. "Stage" / "Installation" */
  kindLabel: string;
  /** narrative intro paragraphs; falls back to [blurb] when omitted */
  intro?: string[];
  /** prominent action rendered right under the hero still */
  heroCta?: ProjectLink;
  /** big-number stat card */
  stat?: { value: string; heading: string; body: string };
  /** labeled video sections, in order */
  media?: CaseMedia[];
  method?: CaseMethod;
  /** attribution lines, rendered as a credits block */
  credits?: string[];
  /** external links rendered on the case page (project.links stays popup-only) */
  links?: ProjectLink[];
  /** closing conversion block; page appends "Get in touch <suffix>" */
  order: { heading: string; body: string; suffix: string };
}

export interface Project {
  id: string;
  title: string;
  /** optional second half of the title, e.g. a medium or role descriptor.
   *  Kept separate so the joining punctuation is a per-surface presentation choice. */
  subtitle?: string;
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
  /** always-labeled star in the Signal Map: the two flagship works */
  hero?: boolean;
  /** relative visual weight of the star in the constellation (1 = default) */
  weight?: number;
  /** dim background star: shown in the constellation but omitted from the visible plain list in full mode */
  background?: boolean;
  /** full written piece behind the project, opens as a text popup */
  essay?: {
    contentWarning?: string;
    paragraphs: string[];
    credits?: string[];
  };
  /** dedicated /work/<id> case page content */
  caseStudy?: CaseStudy;
}

export const PROJECTS: Project[] = [
  // ── Flagship stage work ────────────────────────────────────
  {
    id: 'redkie-ptitsy',
    title: 'Redkie Ptitsy',
    subtitle: 'Live Concert Visuals',
    kind: 'stage',
    tagline: 'Live at Sklad №3, Moscow · 26 March 2026 · 9 projections, one per song',
    blurb:
      'Performed live on 26 March 2026 at Sklad №3, Moscow: a full-set stage backdrop for the band Redkie Ptitsy. Nine unique audio-reactive projections, one crafted for each song, ran in real time behind the band all night, built as TouchDesigner systems that listen to the live mix and paint the room in response. This is the service festivals and touring productions book.',
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
      { label: 'Redkie Ptitsy', url: 'https://band.link/redkieptitsy' },
    ],
    badges: ['sound'],
    featured: true,
    hero: true,
    weight: 1.6,
    caseStudy: {
      kindLabel: 'Stage',
      stat: {
        value: '9',
        heading: 'Audio-reactive projections, one per song',
        body: 'A full-set backdrop: each song in the set got its own real-time TouchDesigner system, built to listen to the live mix and respond in the room. No two songs share a look.',
      },
      media: [
        {
          label: 'All nine, rendered',
          video: '13gl94oG4WU',
          caption:
            'No audio: the songs are the label’s masters, rights unclear for redistribution. This is the visual system running clean, not the room mix.',
        },
        { label: 'Live at Sklad №3', video: 'bDDAXRlz5FQ' },
        {
          label: 'Nine logos, one code',
          video: 'qpXGjDI2N64',
          caption:
            'The logo animations were performed in between the songs. Those are logo variations that run through nine different TouchDesigner treatments, all driven by one signal: the band name, Redkie Ptitsy (meaning, “rare birds”) encoded in Morse code.',
        },
      ],
      method: {
        trace: '> signal_path.trace() // 9 patches loaded',
        stages: [
          { label: 'Live audio in', detail: 'Feed from the desk: the live mix enters as raw signal.' },
          { label: 'CHOP analysis', detail: 'Bands, beats and envelopes extracted in real time.' },
          { label: 'Per-song patch ×9', detail: 'One visual system per song. No two share a look.' },
          { label: 'Projection', detail: 'Light in the room, responding all night.' },
        ],
        footer: '> full-set run · Sklad №3, Moscow · 26 March 2026',
      },
      order: {
        heading: 'What a festival can order',
        body:
          'Book the same signal chain for your stage: live audio in, real-time TouchDesigner per song, projected on the night, built for your show.',
        suffix: 'to brief a show.',
      },
    },
  },

  // ── Installations ──────────────────────────────────────────
  {
    id: 'the-eyes-chico',
    title: 'The Eyes Chico',
    kind: 'installation',
    tagline: 'Acrylic painting turned playable web experience & projection installation · with Alisa Feer',
    blurb:
      'A collaboration with artist Alisa Feer: her acrylic painting is the origin of the piece, translated into a living digital scene that exists as an immersive projection installation and as a web experience controlled by bare hands, with on-device camera tracking. Pigment holds still; code refuses to. The experience is designed for solo viewers to engage in self-discovery.',
    tools: ['Web', 'MediaPipe hand tracking', 'Acrylic on canvas'],
    skills: ['interactive-installations', 'creative-web', 'body-tracking', 'visual-narrative', 'concept-design', 'perception-media'],
    url: 'https://the-eyes-chico.sinaida.eu/',
    video: 'dvNl1G2fVLM',
    links: [
      { label: 'Enter the website', url: 'https://the-eyes-chico.sinaida.eu/' },
      { label: 'Alisa Feer', url: 'https://uvaliss.ru/' },
      { label: 'Project sheet (PDF)', url: '/files/the-eyes-chico-project-sheet.pdf' },
      { label: 'GitHub', url: 'https://github.com/sinaida-space/the-eyes-chico' },
    ],
    badges: ['camera'],
    featured: true,
    hero: true,
    weight: 1.3,
    image: workEyesChico,
    caseStudy: {
      kindLabel: 'Installation',
      intro: [
        'It began as a conversation between two artists, each searching for her own way forward. Alisa Feer painted the first answer: a lit figure standing in a field of eyes, all the judging gazes that can throw a person off her own path, held still in acrylic on a single A4 sheet.',
        'Sinaida translated that painting into a field you can walk. A soul-shaped figure moves through poppies and meets fifty questions along the way, all of them about the feeling of selfhood, none of them answerable by anyone but the person asking. The interface deliberately recalls old computers, slowing a person down enough to actually look. Pigment holds still; code refuses to.',
        'The work exists twice. As a web experience it is finished and live, playable now in any browser, with optional bare-hand control through the camera: palm to steer, fist to dive, pinch to pick. Everything runs on-device; nothing is recorded. As an installation it is a proposal: a room lit red, a projector, the same field at the scale of a wall. Prototyped in Prague, 2026.',
      ],
      heroCta: { label: 'Enter the website', url: 'https://the-eyes-chico.sinaida.eu/' },
      stat: {
        value: '50',
        heading: 'Questions only you can answer',
        body: 'The figure crosses the field and meets fifty questions about selfhood. Nothing is recorded and nothing is scored; the only reader of the answers is the person giving them.',
      },
      media: [
        {
          label: 'The projection study',
          video: 'dvNl1G2fVLM',
          caption:
            'The installation form, prototyped in red light: a projector mirrors the web experience at wall scale, and a raised palm steers the field.',
        },
      ],
      method: {
        trace: '> translation_path.trace() // pigment → light',
        stages: [
          { label: 'Acrylic on canvas', detail: 'Alisa Feer’s original: acrylic and photo paper, A4, unique piece, July 2026.' },
          { label: 'Digital field', detail: 'The painting rebuilt as a navigable scene: soul-figure, poppies, a horizon of eyes.' },
          { label: 'Web experience', detail: 'Live in any browser; optional hand tracking runs on-device, palm to steer, fist to dive, pinch to pick.' },
          { label: 'Installation', detail: 'A room lit red, one laptop, one projector: the same field at the scale of a wall.' },
        ],
        footer: '> concept & painting: Alisa Feer · interactive design & code: Sinaida Krivchenko',
      },
      credits: [
        'Concept & painting: Alisa Feer (Uvaliss) · uvaliss.ru · @uvaliss',
        'Interactive design & code: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
      ],
      links: [
        { label: 'Alisa Feer', url: 'https://uvaliss.ru/' },
        { label: 'Project sheet (PDF)', url: '/files/the-eyes-chico-project-sheet.pdf' },
        { label: 'GitHub', url: 'https://github.com/sinaida-space/the-eyes-chico' },
      ],
      order: {
        heading: 'What a space can commission',
        body:
          'The installation is ready for its first public room, and the full tech rider fits five lines: a room that can be darkened, red ambient light, one laptop running the web experience, one projector mirroring it, an optional camera for hand tracking. Galleries, venues and institutions can show the work as it stands, or brief an adaptation for their space. The field scales.',
        suffix: 'to book its first room.',
      },
    },
  },

  {
    id: 'submerged',
    title: 'Submerged Realities',
    kind: 'installation',
    tagline: 'Projection-mapping study on fluid surfaces',
    blurb:
      'AI-generated aesthetics mapped onto moving water: digital textures interacting with the physics of fluid and red-light environments. A study in how generative imagery behaves once it leaves the screen and lands on a living surface.',
    tools: ['TouchDesigner', 'AI visuals', 'DaVinci Resolve'],
    skills: ['projection-mapping', 'generative-ai', 'touchdesigner', 'davinci', 'concept-design', 'interactive-installations'],
    image: workSubmerged,
    video: '7qgDlifWno0',
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/p/DVVB4K9gh9x/' },
    ],
    weight: 0.7,
    background: true,
  },

  // ── Perception research (interactive web experiences) ──────
  {
    id: 'aether-currents',
    title: 'Aether Currents',
    kind: 'game',
    tagline: 'Browser instrument played with bare hands · with Telefm',
    blurb:
      'Sinaida built AETHER CURRENTS with Kamil Yegelev, known as Telefm, a musician in Belgrade, over a shared conviction that AI-era tools do not have to flatten performance into a prompt. AETHER CURRENTS is a live medium that turns algorithmic tools into a dynamic extension of the physical body, translating movement into sonic and visual currents.',
    tools: ['On-device hand tracking', 'Granular synthesis', 'WebGL'],
    skills: ['body-tracking', 'creative-web', 'audio-reactive', 'algorithmic-systems', 'experience-design', 'perception-media'],
    url: 'https://aether-currents.sinaida.eu/',
    video: 'fxrrSxvKp9Q',
    image: workAetherCurrents,
    links: [
      { label: 'Play the instrument', url: 'https://aether-currents.sinaida.eu/' },
      { label: 'Telefm', url: 'https://telefm.bandcamp.com/' },
      { label: 'GitHub', url: 'https://github.com/sinaida-space/aether-currents' },
    ],
    badges: ['camera', 'sound'],
    featured: true,
    weight: 1.2,
    essay: {
      paragraphs: [
        'Aether Currents is a way to feel music on your fingertips. Open it, show it your camera, and your hands become the interface. The right hand moves through position and pitch. A pinch shapes grain size. The left hand’s height sets density. Pull your hands apart and the filter opens, the space widens. Close into a fist and the sound freezes, held mid-air like a breath. There is no keyboard, no mouse, no MIDI controller between you and the sound. It is pure proprioception, translated.',
        'The work comes from Sinaida’s years at the barre. Turnout, spotting, the discipline of "move only your upper body." A body trained inside constraints does not lose freedom; it finds a different one. Aether Currents offers six gestures and a granular synthesis engine underneath, and inside that small vocabulary the range is enormous. The instrument does not know what you will play. Neither does its maker, most nights.',
        'Sinaida built it with Kamil Yegelev, known as Telefm, a musician in Belgrade, over a shared conviction that AI-era tools do not have to flatten performance into a prompt. Somewhere between a biomedical engineer’s instinct for signal and a dancer’s instinct for gesture there is an instrument that responds in real time, on-device, with no server watching, no cloud in between. Sub-hundred-millisecond latency was never a vanity metric. It is the difference between playing an instrument and issuing a command to one. The visuals on screen are the same signal, seen: what your hands do to the audio, the light does back to you, and the loop closes somewhere between the camera and your own sense of where your hands are in space.',
        'What is it, finally? A granular synthesizer wearing a computer vision system. A dance studio carried in a browser tab. Either way, the stage did not disappear when Sinaida stopped dancing. It moved into the space between a hand and a webcam, and it is asking to be played.',
      ],
      credits: [
        'Instrument & code: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
        'Music & collaboration: Kamil Yegelev (Telefm) · telefm.bandcamp.com',
      ],
    },
    caseStudy: {
      kindLabel: 'Instrument',
      intro: [
        'Sinaida and Kamil Yegelev, the Belgrade musician known as Telefm, built AETHER CURRENTS on one shared conviction: AI-era tools should amplify creativity, not substitute it. The source of all the fun is the human. Our little glitches and flaws make the world beautiful, and however stellar the technology gets, the human needs to stay in the loop.',
        'Movement is the signal. On-device hand tracking drives a granular synthesis engine as one direct path: position becomes pitch, a pinch shapes the grain, the distance between the hands opens the space, a fist freezes the sound mid-air. Pitch is quantized to a scale, so a trembling hand can never play a wrong note, only an expressive one. The visuals are the sound signal, seen. Nothing leaves the device to feed an algorithm, and a curious player can download their music and take it further.',
        'AETHER CURRENTS is a live medium in a browser tab that turns algorithmic tools into an extension of the physical body, translating movement into sonic and visual currents. It is versioned like any serious system, each release shaped by watching real people play.',
      ],
      heroCta: { label: 'Play the instrument', url: 'https://aether-currents.sinaida.eu/' },
      stat: {
        value: '0',
        heading: 'Bytes that leave the device',
        body: 'No camera frame, no audio, no account. The privacy model was a design constraint from day one, not a policy added at the end.',
      },
      media: [
        {
          label: 'The instrument, played',
          video: 'fxrrSxvKp9Q',
          caption: 'Bare hands over a webcam: granular sound and light answering in real time, entirely on-device.',
        },
      ],
      method: {
        trace: '> idea_pipeline.trace() // gesture → grain',
        stages: [
          { label: 'The conviction', detail: 'An instrument to practice on, born between a dancer’s instinct for gesture and a biomedical engineer’s instinct for signal.' },
          { label: 'Gesture vocabulary', detail: 'Six gestures, deliberately few: position, pinch, height, distance, fist, burst. A vocabulary that already lives in the body.' },
          { label: 'Signal engineering', detail: 'Camera → on-device tracking at 40Hz → granular engine → WebGL. One signal drives both the sound and the light.' },
          { label: 'Musicality guardrails', detail: 'Scale-quantized pitch: no wrong notes possible, only expressive ones. Constraint as the source of range, not its limit.' },
          { label: 'The play-test loop', detail: 'Versions grow from watching people fail: upload removed, mic-review flow, BPM in the UI, a two-hand chord gesture. Each fix traced to a specific stumble.' },
          { label: 'PLAYABLE', detail: 'The current cycle: measured sub-100ms motion-to-sound, an instrument that survives GPU loss and never silently drops a recording.' },
        ],
        footer: '> instrument & code: Sinaida Krivchenko · music: Kamil Yegelev (Telefm)',
      },
      credits: [
        'Instrument & code: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
        'Music & collaboration: Kamil Yegelev (Telefm) · telefm.bandcamp.com',
      ],
      links: [
        { label: 'Telefm', url: 'https://telefm.bandcamp.com/' },
        { label: 'GitHub', url: 'https://github.com/sinaida-space/aether-currents' },
      ],
      order: {
        heading: 'What a stage can book',
        body:
          'The instrument travels in a laptop and a webcam: no rig, no install, no server. It can be staged as a live gesture performance with Telefm, opened to an audience as a playable installation, or adapted for a space. The whole tech rider is a table, a camera and a projector.',
        suffix: 'to put it in front of an audience.',
      },
    },
  },

  {
    id: 'ethereal-path',
    title: 'Ethereal Path',
    kind: 'game',
    tagline: 'Off-axis descent steered by head & hand movement: the body is the controller',
    blurb:
      "An interactive descent from beneath a water surface into a nebula, steered entirely by head and hand movement through the webcam. All tracking on-device, nothing leaves the machine. Raymarched GLSL, no frameworks. Built as a physical reset for people who sit too long at screens, and a working study in movement-driven visuals: the same system that lets a performer’s body drive the image.",
    tools: ['WebGL2 / GLSL raymarching', 'MediaPipe body tracking', 'Web Audio'],
    skills: ['creative-web', 'body-tracking', 'algorithmic-systems', 'perception-media', 'interactive-installations'],
    image: workEtherealPath,
    url: 'https://sinaida-space.github.io/ethereal-path/',
    video: '15wl2Sko5GA',
    links: [
      { label: 'GitHub', url: 'https://github.com/sinaida-space/ethereal-path' },
    ],
    badges: ['camera'],
    weight: 1.1,
  },

  {
    id: 'stereolove',
    title: 'Stereolove',
    kind: 'game',
    tagline: 'Head-coupled op-art: the screen becomes an unstable optical volume',
    blurb:
      "The browser estimates the viewer’s head position with on-device face tracking and shifts the projection in response, so the monitor behaves like an optical volume behind glass: op-art interference, a star tunnel, anamorphic text that only resolves from one viewpoint. One ritual gesture (an open hand raised near the face) opens the next question. The same off-axis, viewer-coupled craft that stage illusions are built from.",
    tools: ['Web', 'MediaPipe face & hand tracking'],
    skills: ['creative-web', 'body-tracking', 'perception-media', 'human-ai', 'concept-design', 'interactive-installations'],
    url: 'https://sinaida-space.github.io/stereolove/?v=768a0af',
    video: 'jQy4Kk70hxM',
    links: [
      { label: 'GitHub', url: 'https://github.com/sinaida-space/stereolove' },
    ],
    badges: ['camera'],
    weight: 0.7,
    background: true,
  },

  // ── Tools ──────────────────────────────────────────────────
  {
    id: 'mahler',
    title: 'Mahler',
    subtitle: 'The Orchestrator',
    kind: 'tool',
    tagline: 'Orchestrator for Claude',
    blurb: 'A multi-model orchestrator for Claude, designed to maximize ROI on tokens.',
    tools: ['Claude', 'GitHub'],
    skills: ['tech-strategy', 'system-architecture', 'ai-orchestration', 'algorithmic-systems'],
    url: 'https://github.com/sinaida-space/mahler-the-orchestrator',
    links: [{ label: 'GitHub', url: 'https://github.com/sinaida-space/mahler-the-orchestrator' }],
    weight: 0.7,
    background: true,
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
