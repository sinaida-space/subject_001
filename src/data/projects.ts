// ── Single source of truth for every work Sinaida shows on the site ──
// Consumed by: the Constellation graph, Selected Works rows, Experiments list,
// and (via the SEO script / llms.txt) the static content layer.

import workRedkiePtitsy from '@/assets/work-redkie-ptitsy.webp';
import workRedkiePtitsy640 from '@/assets/work-redkie-ptitsy-640.webp';
import workRedkiePtitsy1024 from '@/assets/work-redkie-ptitsy-1024.webp';
import workEyesChico from '@/assets/work-eyes-chico.webp';
import eyesChicoPainting from '@/assets/work-eyes-chico-painting.jpg';
import workAetherCurrents from '@/assets/work-aether-currents.webp';
import workAetherCurrents640 from '@/assets/work-aether-currents-640.webp';
import workAetherCurrents1024 from '@/assets/work-aether-currents-1024.webp';
import workEtherealPath from '@/assets/work-ethereal-path.webp';
import workStereolove from '@/assets/work-stereolove.webp';
import workInfiniteVoidsong from '@/assets/work-infinite-voidsong.webp';
import workStormGlass from '@/assets/work-storm-glass.webp';
import workConspaceRooms from '@/assets/work-conspace-rooms.webp';
import type { Dialect } from '@/lib/diveBus';

export type ProjectKind =
  | 'stage'        // live concert / performance visuals
  | 'installation' // projection mapping / immersive
  | 'conceptual'   // image series / research art
  | 'game'         // interactive web experiences
  | 'tool'         // utilities
  | 'tutorial';    // teaching: a build explained step by step

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
  /** Performance date, shown under the video (never in the title). */
  date?: string;
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
  /** headed story sections after the stat card, for long cases that need to stay scannable */
  sections?: { heading: string; paragraphs: string[] }[];
  /** labeled video sections, in order */
  media?: CaseMedia[];
  method?: CaseMethod;
  /** original artwork the piece translates, shown as a labeled figure with a gallery-style caption */
  painting?: { image: string; title: string; attribution: string };
  /** attribution lines, rendered as a credits block */
  credits?: string[];
  /** structured collaborator credits (role, name, statement link, one-line bio), rendered instead of `credits` when present */
  creditsPeople?: { role: string; name: string; url: string; bio: string }[];
  /**
   * The same collaborators as `credits`, machine-readable: this feeds the
   * `contributor` array in the page's JSON-LD (scripts/lib/structured-data.mjs)
   * and nothing on screen. `credits` stays prose because it is prose; a parser
   * should not have to guess which half of "Concept & painting: Alisa Feer" is
   * the name. Sinaida is always the `creator` and is never repeated here.
   */
  contributors?: { name: string; url?: string; type?: 'Person' | 'Organization' | 'MusicGroup' }[];
  /** external links rendered on the case page (project.links stays popup-only) */
  links?: ProjectLink[];
  /** closing conversion block; page appends "Get in touch <suffix>" */
  order: { heading: string; body: string; suffix: string };
}

export interface Project {
  id: string;
  /** surface the case dive resolves in (#119): crt = stage, dither = image, ascii = code */
  dialect: Dialect;
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
  /** responsive widths of `image` for the case hero (640/1024/full), as a srcset string */
  imageSrcSet?: string;
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
  /** list a background work in the plain index anyway; the star stays dim */
  listed?: boolean;
  /** bright star in the constellation, but left out of the plain index */
  unlisted?: boolean;
  /** full written piece behind the project, opens as a text popup */
  essay?: {
    contentWarning?: string;
    paragraphs: string[];
    credits?: string[];
  };
  /** dedicated /work/<id> case page content */
  caseStudy?: CaseStudy;
}

// Every work added here also gets a row in src/pages/Licensing.tsx (code and
// artwork terms), so the licensing page never lags behind the site.
export const PROJECTS: Project[] = [
  // ── Flagship stage work ────────────────────────────────────
  {
    id: 'redkie-ptitsy',
    dialect: 'crt',
    title: 'Redkie Ptitsy',
    subtitle: 'Live Concert Visuals',
    kind: 'stage',
    tagline: 'Live at Sklad No. 3, Moscow · 9 projections, one per song',
    blurb:
      'Performed live at Sklad No. 3, Moscow: a full-set stage backdrop for the band Redkie Ptitsy. Nine audio-reactive projections, one for each song, ran in real time behind the band all night. Each one is a TouchDesigner system that listens to the live mix. Festivals and touring productions can book the same setup.',
    tools: ['TouchDesigner', 'Audio analysis', 'Live signal chain'],
    skills: ['event-design', 'audio-reactive', 'touchdesigner', 'algorithmic-systems'],
    image: workRedkiePtitsy,
    imageSrcSet: `${workRedkiePtitsy640} 640w, ${workRedkiePtitsy1024} 1024w, ${workRedkiePtitsy} 1600w`,
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
        body: 'A full-set backdrop: each song in the set got its own real-time TouchDesigner system, built to listen to the live mix and respond in the room.',
      },
      media: [
        {
          label: 'All nine, rendered',
          video: '13gl94oG4WU',
          caption:
            'No audio: the songs are the label’s masters, rights unclear for redistribution. This is the visual system running clean, without the room mix.',
        },
        { label: 'Live at Sklad No. 3', video: 'bDDAXRlz5FQ', date: '26 March 2026' },
        {
          label: 'Nine logos, one code',
          video: 'qpXGjDI2N64',
          date: '26 March 2026',
          caption:
            'The logo animations were performed in between the songs. Those are logo variations that run through nine different TouchDesigner treatments, all driven by one signal: the band name, Redkie Ptitsy (meaning, “rare birds”) encoded in Morse code.',
        },
      ],
      method: {
        trace: '> signal_path.trace() // 9 patches loaded',
        stages: [
          { label: 'Live audio in', detail: 'Feed from the desk: the live mix enters as raw signal.' },
          { label: 'CHOP analysis', detail: 'Bands, beats and envelopes extracted in real time.' },
          { label: 'Per-song patch ×9', detail: 'One visual system per song, each with its own look.' },
          { label: 'Projection', detail: 'Projected behind the band for the whole set.' },
        ],
        footer: '> full-set run · Sklad No. 3, Moscow',
      },
      contributors: [
        { name: 'Redkie Ptitsy', url: 'https://band.link/redkieptitsy', type: 'MusicGroup' },
      ],
      order: {
        heading: 'What a festival can order',
        body:
          'Book the same setup for your stage: one real-time TouchDesigner system per song, listening to your live mix.',
        suffix: 'to brief a show.',
      },
    },
  },

  // ── Installations ──────────────────────────────────────────
  {
    id: 'the-eyes-chico',
    dialect: 'dither',
    title: 'The Eyes Chico',
    kind: 'installation',
    tagline: 'Acrylic painting turned playable web experience & projection installation · with Alisa Feer',
    blurb:
      'A collaboration with artist Alisa Feer. Her acrylic painting became a digital field that exists twice: as a projection installation and as a web experience you steer with your hands through the camera, tracked on-device. It is made for one viewer at a time and asks questions about selfhood.',
    tools: ['Web', 'MediaPipe hand tracking', 'Acrylic on canvas'],
    skills: ['interactive-installations', 'body-tracking', 'perception-media'],
    url: 'https://the-eyes-chico.sinaida.eu/',
    video: 'dvNl1G2fVLM',
    links: [
      { label: 'Enter the website', url: 'https://the-eyes-chico.sinaida.eu/' },
      { label: 'Alisa Feer', url: 'https://uvaliss.ru/' },
      { label: 'Project sheet (PDF)', url: '/files/the-eyes-chico-project-sheet.pdf' },
      { label: 'GitHub', url: 'https://github.com/sinaida-space/the-eyes-chico' },
    ],
    badges: ['camera'],
    weight: 1.3,
    image: workEyesChico,
    // One Alisa Feer work per list: CONSPACE ROOMS holds the Installation row.
    unlisted: true,
    caseStudy: {
      kindLabel: 'Installation',
      intro: [
        'It began as a conversation between two artists, each searching for her own way forward. Alisa Feer painted the first answer: a lit figure standing in a field of eyes, all the judging gazes that can throw a person off her own path, held still in acrylic on a single A4 sheet.',
        'Sinaida translated that painting into a field you can walk. A soul-shaped figure moves through poppies and meets fifty questions along the way, all of them about the feeling of selfhood, none of them answerable by anyone but the person asking. The interface recalls old computers, which slows a person down enough to look.',
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
        footer: '> concept, interactive design & code: Sinaida Krivchenko · painting: Alisa Feer',
      },
      painting: {
        image: eyesChicoPainting,
        title: 'The Eyes, Chico',
        attribution: 'Alisa Feer. Acrylic on paper, A4, 2026, St. Petersburg.',
      },
      contributors: [{ name: 'Alisa Feer', url: 'https://uvaliss.ru/', type: 'Person' }],
      creditsPeople: [
        {
          role: 'Concept, interactive design & code',
          name: 'Sinaida Krivchenko',
          url: 'https://sinaida.eu/statement/',
          bio: 'Sinaida Krivchenko creates responsive visual systems where light, sound, movement and human presence become a shared experience.',
        },
        {
          role: 'Painting',
          name: 'Alisa Feer',
          url: 'https://uvaliss.ru/ascv',
          bio: 'Alisa Feer is a visual artist from St Petersburg exploring themes of darkness and light. Her work has been shown at the Russian Museum, St Petersburg (2026, "Intuition of Space: Epiphany").',
        },
      ],
      links: [
        { label: 'Alisa Feer', url: 'https://uvaliss.ru/' },
        { label: 'Project sheet (PDF)', url: '/files/the-eyes-chico-project-sheet.pdf' },
        { label: 'GitHub', url: 'https://github.com/sinaida-space/the-eyes-chico' },
      ],
      order: {
        heading: 'What a space can commission',
        body:
          'The installation is ready for its first public room, and the full tech rider fits five lines: a room that can be darkened, red ambient light, one laptop running the web experience, one projector mirroring it, an optional camera for hand tracking. Galleries, venues and institutions can show the work as it stands, or brief an adaptation for their space.',
        suffix: 'to book its first room.',
      },
    },
  },

  {
    id: 'conspace-rooms',
    dialect: 'dither',
    title: 'CONSPACE ROOMS',
    kind: 'installation',
    tagline: 'Walk-through labyrinth of eighteen paintings, in the browser or as a gesture-controlled projection · with UVALISS',
    blurb:
      'A walk-through web installation made with UVALISS (Alisa Feer). Eighteen works from her SOULS series hang in a labyrinth of half-lit rooms that the browser builds as you walk: hospital corridors, a grandmother\u2019s flat, pale rooms dissolving into light. The music is generated as you go, and nothing about the visitor is\u00A0kept.',
    tools: ['Three.js', 'Generative Web Audio', 'On-device hand tracking'],
    skills: ['interactive-installations', 'body-tracking', 'creative-web', 'generative-sound'],
    url: 'https://conspace-rooms.vercel.app/',
    video: 'oSWzQ4ds8BI',
    image: workConspaceRooms,
    links: [
      { label: 'Visit the experience', url: 'https://conspace-rooms.vercel.app/' },
      { label: 'Project sheet (PDF)', url: '/files/conspace-rooms-project-sheet.pdf' },
      { label: 'GitHub', url: 'https://github.com/sinaida-space/conspace-rooms' },
    ],
    badges: ['camera', 'sound'],
    featured: true,
    hero: true,
    weight: 1.3,
    caseStudy: {
      kindLabel: 'Installation',
      intro: [
        'A labyrinth of half-lit rooms where a painter’s cycle meets two artists’ memories of their grandparents. Eighteen works from the SOULS cycle by UVALISS hang in corridors that the browser builds anew for every visit, so no two visitors walk the same one. It opens from a link on a laptop or a phone, and in a gallery visitors steer it with their bare\u00A0hands.',
        'A collaboration with UVALISS (Alisa Feer, https://uvaliss.ru/).',
      ],
      heroCta: { label: 'Walk the labyrinth', url: 'https://conspace-rooms.vercel.app/?lang=en' },
      stat: {
        value: '18',
        heading: 'Works in a labyrinth that is never the same twice',
        body: 'There is no map and no signage. Candles show the way, and a rose in the corner grows with every work the visitor\u00A0meets.',
      },
      sections: [
        {
          heading: 'Where it began',
          paragraphs: [
            'SOULS is a cycle Alisa created for her Master of Visual Arts at the Institute of Visual Arts. Her graduation needed a film, and the two artists spent weeks talking through its visual language. Sinaida made digital material for the set: audio-reactive generations in TouchDesigner and a series of AI\u00A0images.',
            'A few weeks later Sinaida asked a simple question: what if the works hung inside a labyrinth? The two artists sat down together to work out how it could be done. The first version was a set of gloomy rooms with paintings in them, and not much\u00A0more.',
          ],
        },
        {
          heading: 'A shared nostalgia',
          paragraphs: [
            'While preparing the film, Alisa had told many stories about her grandmother. They stayed with Sinaida. She never had the chance to say a proper goodbye to her own grandparents, and, as in Alisa’s life, they were the people who meant the most to her. The project started as a space for Alisa’s work and grew into a memory the two artists\u00A0share.',
            'Finding references became a family exercise. Alisa asked her mother to dig out photographs of the wallpaper they once had at home. Sinaida searched for the old tea kettles, toys and wall rugs that filled flats of that time. Some objects in the rooms come from open libraries, some are drawn entirely in code, and some are\u00A0images.',
          ],
        },
        {
          heading: 'Three states of the soul',
          paragraphs: [
            'The rooms follow the arc of the SOULS cycle, from trauma toward accepting oneself. Fear is a hospital: green oil paint under whitewash, humming tubes, beds and drip stands left behind. Memory is a grandmother’s flat: rosette wallpaper, parquet, warm lampshades, a television left on in an empty room, gramophone records playing as if from the next flat. Acceptance is pale, and its walls dissolve into lace and\u00A0light.',
          ],
        },
        {
          heading: 'The questions',
          paragraphs: [
            'Sinaida loves deep conversations and strange questions, and many of her projects carry them. Here they rise from candle smoke and wait on the final card. They ask how we look at our own fears, how we see our past, and what we allow ourselves to hope\u00A0for.',
            'So CONSPACE ROOMS has two lives. For Alisa it is a visual exploration of her cycle. For everyone else it is a slow walk through fear, memory and acceptance, with time to think about how the past shaped the present.',
          ],
        },
      ],
      media: [
        {
          label: 'The projection, in progress',
          video: 'oSWzQ4ds8BI',
          caption: 'The labyrinth at wall scale, recorded while the gallery mode was being built.',
        },
        {
          label: 'Where it began: the SOULS film',
          video: '6tKyAH1_fWs',
          caption: 'Alisa’s graduation film, with audio-reactive TouchDesigner generations and AI images by Sinaida.',
        },
      ],
      method: {
        trace: '> build_decisions.trace() // six reasons',
        stages: [
          { label: 'Any browser', detail: 'Paintings usually wait in rooms people have to travel to. This one opens from a link, on a laptop or a phone, with nothing to install.' },
          { label: 'Made in code', detail: 'Walls, light and most of the furniture are generated on the spot. The piece stays light on an ordinary connection and rebuilds itself for every visit.' },
          { label: 'Generated sound', detail: 'The music is composed by the piece as it plays and never repeats exactly. The only recordings are Alisa’s voice at seven of the works.' },
          { label: 'A steady walk', detail: 'The target is 60 fps on an average laptop; every passage between rooms was measured frame by frame, and phones get a lighter version automatically.' },
          { label: 'Many ways in', detail: 'Keyboard, mouse, touch, game controller or bare hands. Captions describe sounds and music, and flicker and glitch can be switched off.' },
          { label: 'Private by default', detail: 'No analytics and no accounts. The camera image is processed on the visitor’s device and never leaves it.' },
        ],
        footer: '> idea, design & code: Sinaida Krivchenko · SOULS: UVALISS',
      },
      contributors: [{ name: 'Alisa Feer (UVALISS)', url: 'https://uvaliss.ru/', type: 'Person' }],
      creditsPeople: [
        {
          role: 'Idea, design & code',
          name: 'Sinaida Krivchenko',
          url: 'https://sinaida.eu/statement/',
          bio: 'Sinaida Krivchenko creates responsive visual systems where light, sound, movement and human presence become a shared experience.',
        },
        {
          role: 'SOULS artworks & voice',
          name: 'UVALISS (Alisa Feer)',
          url: 'https://uvaliss.ru/',
          bio: 'Alisa Feer is a visual artist from St Petersburg exploring themes of darkness and light, childhood and dreams. Her work has been shown at the Russian Museum, St Petersburg (2026, “Intuition of Space: Epiphany”).',
        },
      ],
      links: [
        { label: 'UVALISS', url: 'https://uvaliss.ru/' },
        { label: 'The SOULS cycle', url: 'https://uvaliss.ru/souls' },
        { label: 'Gallery rider', url: 'https://conspace-rooms.vercel.app/rider.html?lang=en' },
        { label: 'Project sheet (PDF)', url: '/files/conspace-rooms-project-sheet.pdf' },
      ],
      order: {
        heading: 'What a space can commission',
        body:
          'A gallery mode turns the labyrinth into an installation with a projector or a screen, a webcam and speakers. A face in front of the camera starts the walk, the visitor steers with their hands, and once they step away the labyrinth resets into a new one for the next person. The rider is ready in English and Russian.',
        suffix: 'to bring it into a room.',
      },
    },
  },

  {
    id: 'aether-currents',
    dialect: 'ascii',
    title: 'Aether Currents',
    kind: 'game',
    tagline: 'Browser instrument played with bare hands · with Telefm',
    blurb:
      'Sinaida built AETHER CURRENTS with Kamil Yegelev, known as Telefm, a musician in Belgrade. It is a browser instrument: a camera reads your hands, and their movement drives granular sound and light in real time.',
    tools: ['On-device hand tracking', 'Granular synthesis', 'WebGL'],
    skills: ['body-tracking', 'audio-reactive', 'generative-sound', 'creative-web', 'algorithmic-systems', 'perception-media'],
    url: 'https://aether-currents.sinaida.eu/',
    video: 'fxrrSxvKp9Q',
    image: workAetherCurrents,
    imageSrcSet: `${workAetherCurrents640} 640w, ${workAetherCurrents1024} 1024w, ${workAetherCurrents} 1600w`,
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
        'Aether Currents is a way to feel music on your fingertips. Open it, show it your camera, and your hands become the interface. The right hand moves through position and pitch. A pinch shapes grain size. The left hand’s height sets density. Pull your hands apart and the filter opens, the space widens. Close into a fist and the sound freezes mid-air. There is no keyboard, no mouse and no MIDI controller between you and the sound, only your own sense of where your hands are.',
        'The work comes from Sinaida’s years at the barre. Turnout, spotting, the discipline of "move only your upper body." Ballet trains a body inside strict rules. Aether Currents has rules too: six gestures over a granular synthesis engine, with plenty of room to play inside them. The instrument does not know what you will play, and often its maker does not either.',
        'Sinaida built it with Kamil Yegelev, known as Telefm, a musician in Belgrade. Everything runs on the device, with no server and no cloud. Sound follows movement in under a hundred milliseconds, which is fast enough to feel like playing. The visuals carry the same signal as the audio, so what your hands do to the sound, the light shows back to you.',
      ],
      credits: [
        'Instrument & code: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
        'Music & collaboration: Kamil Yegelev (Telefm) · telefm.bandcamp.com',
      ],
    },
    caseStudy: {
      kindLabel: 'Interactive web',
      intro: [
        'Sinaida and Kamil Yegelev, the Belgrade musician known as Telefm, built AETHER CURRENTS on one shared belief: tools made with AI should amplify human creativity. The fun comes from the person playing, glitches and flaws included, so the human stays in the loop.',
        'Movement is the signal. On-device hand tracking drives a granular synthesis engine as one direct path: position becomes pitch, a pinch shapes the grain, the distance between the hands opens the space, a fist freezes the sound mid-air. Pitch is quantized to a scale, so a trembling hand still plays in key. The visuals show the same signal as the sound. Nothing leaves the device, and a player can download their music and take it further.',
        'AETHER CURRENTS runs in a browser tab. It is released in versions, and each release comes from watching real people play.',
      ],
      heroCta: { label: 'Play the instrument', url: 'https://aether-currents.sinaida.eu/' },
      stat: {
        value: '0',
        heading: 'Bytes that leave the device',
        body: 'No camera frame, no audio, no account. Privacy was decided first, before any other part of the architecture.',
      },
      media: [
        {
          label: 'The instrument, played',
          video: 'fxrrSxvKp9Q',
          caption: 'Two hands over a webcam play granular sound, and the light follows.',
        },
      ],
      method: {
        trace: '> idea_pipeline.trace() // gesture → grain',
        stages: [
          { label: 'The conviction', detail: 'A practice instrument, built from a dancer’s training in gesture and an engineer’s training in signal.' },
          { label: 'Gesture vocabulary', detail: 'Six gestures, deliberately few: position, pinch, height, distance, fist, burst. All of them are movements the body already knows.' },
          { label: 'Signal engineering', detail: 'Camera → on-device tracking at 40Hz → granular engine → WebGL. One signal drives both the sound and the light.' },
          { label: 'Musicality guardrails', detail: 'Pitch is quantized to a scale, so every note stays in key.' },
          { label: 'The play-test loop', detail: 'Versions grow from watching people fail: upload removed, mic-review flow, BPM in the UI, a two-hand chord gesture. Each fix traced to a specific stumble.' },
          { label: 'PLAYABLE', detail: 'The current cycle: measured sub-100ms motion-to-sound, an instrument that survives GPU loss and never silently drops a recording.' },
        ],
        footer: '> instrument & code: Sinaida Krivchenko · music: Kamil Yegelev (Telefm)',
      },
      contributors: [{ name: 'Kamil Yegelev (Telefm)', url: 'https://telefm.bandcamp.com/', type: 'Person' }],
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
    dialect: 'dither',
    title: 'Ethereal Path',
    kind: 'game',
    tagline: 'Off-axis descent steered by head & hand movement: the body is the controller',
    blurb:
      "An interactive descent from beneath a water surface into a nebula, steered entirely by head and hand movement through the webcam. All tracking on-device, nothing leaves the machine. Raymarched GLSL, no frameworks. Built as a physical reset for people who sit too long at screens, and a working study in movement-driven visuals: the same system that lets a performer’s body drive the image.",
    tools: ['WebGL2 / GLSL raymarching', 'MediaPipe body tracking', 'Web Audio'],
    skills: ['body-tracking', 'head-coupled', 'creative-web', 'algorithmic-systems', 'perception-media', 'interactive-installations'],
    image: workEtherealPath,
    url: 'https://sinaida-space.github.io/ethereal-path/',
    video: '15wl2Sko5GA',
    links: [
      { label: 'GitHub', url: 'https://github.com/sinaida-space/ethereal-path' },
    ],
    badges: ['camera'],
    weight: 0.7,
    background: true,
    listed: true,
  },

  {
    id: 'stereolove',
    dialect: 'crt',
    title: 'Stereolove',
    kind: 'game',
    tagline: 'Head-coupled op-art: the screen becomes an unstable optical volume',
    blurb:
      "The browser estimates the viewer’s head position with on-device face tracking and shifts the projection in response, so the monitor behaves like an optical volume behind glass: op-art interference, a star tunnel, anamorphic text that only resolves from one viewpoint. One ritual gesture (an open hand raised near the face) opens the next question. The same off-axis, viewer-coupled craft that stage illusions are built from.",
    tools: ['Web', 'MediaPipe face & hand tracking'],
    skills: ['head-coupled', 'body-tracking', 'creative-web', 'perception-media', 'interactive-installations'],
    url: 'https://sinaida-space.github.io/stereolove/',
    video: 'jQy4Kk70hxM',
    image: workStereolove,
    links: [
      { label: 'GitHub', url: 'https://github.com/sinaida-space/stereolove' },
    ],
    badges: ['camera'],
    weight: 0.7,
    background: true,
  },

  {
    id: 'infinite-voidsong',
    dialect: 'ascii',
    title: 'Infinite Voidsong',
    subtitle: 'Focus Soundscapes',
    kind: 'game',
    tagline: 'Endless generated soundscapes for focused work, with rest built into the session',
    blurb:
      'Layer noise, water, fire, places and music into one mix, save it as a preset, and let it run for hours. Sinaida built it for her own working day. Ballet taught her that rest is where growth happens, so the breaks are timed with the same care as the work. An audio-reactive tunnel breathes with the sound. It installs as an app, works offline and tracks\u00A0nothing.',
    tools: ['Web Audio API', 'WebGL', 'Offline web app'],
    skills: ['generative-sound', 'audio-reactive', 'creative-web', 'perception-media'],
    url: 'https://infinite-voidsong.vercel.app/',
    image: workInfiniteVoidsong,
    links: [
      { label: 'Open Infinite Voidsong', url: 'https://infinite-voidsong.vercel.app/' },
      { label: 'GitHub', url: 'https://github.com/sinaida-space/infinite-voidsong' },
    ],
    badges: ['sound'],
    weight: 0.9,
  },
  {
    id: 'storm-glass',
    dialect: 'ascii',
    title: 'Storm Glass',
    subtitle: 'TouchDesigner Tutorial',
    kind: 'tutorial',
    tagline: 'A thunderstorm behind rainy glass, built in TouchDesigner: the bass fires the lightning',
    blurb:
      'Clouds drift on their own, every hit in the bass fires a forked bolt, and raindrops slide, merge and bend the storm behind them. The tutorial builds the whole network step by step: noise and feedback for the sky, a script that grows a fresh bolt on each onset, a small physics sim for the drops and a GLSL pass for the refraction. The same audio-to-light chain drives her concert\u00A0visuals.',
    tools: ['TouchDesigner', 'GLSL shader', 'Audio analysis'],
    skills: ['touchdesigner', 'audio-reactive', 'algorithmic-systems', 'creative-web'],
    url: 'https://youtu.be/hwFttiCKbrU',
    video: 'hwFttiCKbrU',
    image: workStormGlass,
    links: [
      { label: 'Watch the tutorial', url: 'https://youtu.be/hwFttiCKbrU' },
      {
        label: 'Project files on Patreon',
        url: 'https://www.patreon.com/theswansarenotwhattheyseem/posts/rain-and-169292587?utm_medium=sinaidadoteu',
      },
      { label: 'YouTube channel', url: 'https://www.youtube.com/@theSwansAreNotWhatTheySeem' },
    ],
    badges: ['sound'],
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
