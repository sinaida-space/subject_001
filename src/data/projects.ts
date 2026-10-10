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
import workConspaceRooms640 from '@/assets/work-conspace-rooms-640.webp';
import workConspaceRooms1024 from '@/assets/work-conspace-rooms-1024.webp';
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
    imageSrcSet: `${workConspaceRooms640} 640w, ${workConspaceRooms1024} 1024w, ${workConspaceRooms} 1344w`,
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
      "An interactive descent from beneath a water surface into a nebula, steered entirely by head and hand movement through the webcam. All tracking runs on the device, and nothing leaves the machine. Ray-based GLSL shading, no frameworks. An art experiment and a toy, and a working study in the body as controller: the same system can let a performer’s body drive the image.",
    tools: ['WebGL2 / GLSL', 'MediaPipe body tracking', 'Web Audio'],
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
    caseStudy: {
      kindLabel: 'Interactive web',
      intro: [
        'Lean to\u00A0the\u00A0left and\u00A0the\u00A0tunnel leans with you, the\u00A0way the\u00A0view shifts at\u00A0a\u00A0real window. Ethereal Path is\u00A0a\u00A0descent from under a\u00A0water surface into a\u00A0nebula, steered by\u00A0your head and\u00A0your hands. A\u00A0webcam reads your body on\u00A0the\u00A0device, and\u00A0nothing it\u00A0sees leaves\u00A0the\u00A0machine.',
        'Every so\u00A0often the\u00A0drift stops at\u00A0a\u00A0broken ring. The\u00A0ring closes when you make the\u00A0movement it\u00A0asks for: a\u00A0slow turn of\u00A0the\u00A0head, a\u00A0shrug, a\u00A0reach. Then a\u00A0question arrives, and\u00A0the\u00A0descent\u00A0continues.',
        'It\u00A0runs in\u00A0a\u00A0browser tab, with or\u00A0without a\u00A0camera, in\u00A0a\u00A0five-minute seated version and\u00A0an\u00A0eight-minute version that gets you onto your\u00A0feet.',
      ],
      heroCta: { label: 'Take the descent', url: 'https://sinaida-space.github.io/ethereal-path/' },
      stat: {
        value: '0',
        heading: 'Camera frames that leave the device',
        body: 'Pose tracking runs in\u00A0the\u00A0page. Nothing is\u00A0recorded or\u00A0sent. The\u00A0only network call is\u00A0a\u00A0one-time download of\u00A0the\u00A0tracking model, made only if\u00A0you choose\u00A0the\u00A0camera.',
      },
      sections: [
        {
          heading: 'What it is',
          paragraphs: [
            'What do you build when the\u00A0controller is\u00A0the\u00A0whole body and\u00A0the\u00A0hands stay empty? Here, a\u00A0browser artwork. You start just below the\u00A0surface, look up\u00A0at\u00A0the\u00A0light and\u00A0dive into a\u00A0tunnel of\u00A0light filaments that opens into a\u00A0nebula. Sinaida made the\u00A0concept, the\u00A0code\u00A0and\u00A0the\u00A0artwork.',
            '“A\u00A0pure art experiment\u00A0and\u00A0a\u00A0toy.”',
            'It\u00A0is\u00A0also a\u00A0study for\u00A0larger rooms. Her installations need a\u00A0body to\u00A0drive the\u00A0image with nothing in\u00A0its hands, and\u00A0this piece is\u00A0where she learned to\u00A0read one through an\u00A0ordinary webcam. The\u00A0stack is\u00A0small on\u00A0purpose: plain JavaScript with WebGL2 and\u00A0GLSL, MediaPipe for\u00A0pose tracking, Web Audio for\u00A0sound, no\u00A0framework and\u00A0no\u00A0build\u00A0step.',
          ],
        },
        {
          heading: 'Where it started',
          paragraphs: [
            'Long days at\u00A0a\u00A0screen, and\u00A0a\u00A0body that still remembers the\u00A0ballet barre. Years of\u00A0training left one rule in\u00A0it: movement resets the\u00A0head. She wanted a\u00A0piece that asks for\u00A0a\u00A0few real movements and\u00A0answers each one with\u00A0light.',
            'The\u00A0second reason was practical. Body tracking is\u00A0the\u00A0controller for\u00A0the\u00A0bigger installations she wants to\u00A0build, and\u00A0a\u00A0small piece is\u00A0the\u00A0right place to\u00A0find out what a\u00A0webcam reads well and\u00A0where\u00A0it\u00A0fails.',
          ],
        },
        {
          heading: 'What was tested',
          paragraphs: [
            'How do you make a\u00A0flat screen behave like a\u00A0window? Perspective came first. The\u00A0scene is\u00A0drawn through an\u00A0off-axis window: for\u00A0every pixel the\u00A0shader casts a\u00A0ray from your eye position through that point of\u00A0the\u00A0window, so\u00A0leaning shifts the\u00A0view the\u00A0way it\u00A0does at\u00A0a\u00A0real\u00A0one.',
            'Then the\u00A0signals. Raw landmarks from the\u00A0lite MediaPipe pose model become smoothed signals measured against your starting position: head turn and\u00A0tilt, shrug, standing, rising onto the\u00A0toes and\u00A0hand height. The\u00A0drift pauses at\u00A0a\u00A0station, and\u00A0only a\u00A0verified movement closes the\u00A0ring. Every station also closes on\u00A0its own after 45\u00A0seconds. Whoever cannot make the\u00A0movement still reaches the\u00A0nebula, so\u00A0the\u00A0piece has no\u00A0failure\u00A0state.',
            'The\u00A0camera stays optional. A\u00A0stand-in reads pointer, keyboard or\u00A0touch and\u00A0produces the\u00A0same signals as\u00A0the\u00A0tracker, so\u00A0the\u00A0rest of\u00A0the\u00A0piece never needs to\u00A0know where its input comes\u00A0from.',
          ],
        },
        {
          heading: 'How it was made',
          paragraphs: [
            'Three days in\u00A0July 2026 for\u00A0the\u00A0first full pass. Sinaida cut it\u00A0into a\u00A0numbered series of\u00A0pull requests: renderer, tracking, tunnel shader, session arc, sound, onboarding, the\u00A0stations and\u00A0the\u00A0surface\u00A0scene.',
            'The\u00A0tunnel changed its method on\u00A0the\u00A0way. Version 1.0 marched rays through a\u00A0volume. Version 1.1 shades each ray in\u00A0closed form, with cylinder walls and\u00A0layered filament noise, which gives every pixel a\u00A0fixed cost and\u00A0looks closer to\u00A0long-exposure photographs of\u00A0light streaks. A\u00A0short test at\u00A0startup times the\u00A0graphics card and\u00A0picks one of\u00A0three quality tiers, so\u00A0a\u00A0weak laptop still gets the\u00A0whole\u00A0descent.',
            'There are no\u00A0audio files. Water, bubbles, the\u00A0plunge and\u00A0the\u00A0bells are synthesized in\u00A0the\u00A0browser, the\u00A0bells on\u00A0a\u00A0pentatonic set so\u00A0random notes cannot clash. One rule from the\u00A0code comments holds the\u00A0mix together: if\u00A0you notice the\u00A0music, it\u00A0is\u00A0too\u00A0loud.',
          ],
        },
        {
          heading: 'What it taught',
          paragraphs: [
            'Sinaida tried it\u00A0with a\u00A0few friends, nothing more. What she kept is\u00A0a\u00A0working method for\u00A0the\u00A0body as\u00A0input: pose and\u00A0hand tracking that runs on\u00A0the\u00A0device, close attention to\u00A0latency, and\u00A0a\u00A0camera image that never leaves\u00A0the\u00A0machine.',
            'That method went straight into [CONSPACE ROOMS](/work/conspace-rooms), where visitors steer a\u00A0projected labyrinth with their bare\u00A0hands.',
          ],
        },
      ],
      media: [
        {
          label: 'The descent',
          video: '15wl2Sko5GA',
          caption: 'A\u00A031-second demo of\u00A0the\u00A0piece.',
        },
      ],
      method: {
        trace: '> idea_pipeline.trace() // body → light',
        stages: [
          { label: 'The window', detail: 'The\u00A0scene is\u00A0drawn through an\u00A0off-axis window. Your head position moves the\u00A0eye, so\u00A0leaning changes\u00A0the\u00A0view.' },
          { label: 'Pose signals', detail: 'On-device pose tracking becomes smoothed signals measured from your starting position: head turn and\u00A0tilt, shrug, standing, rise plus the\u00A0height of\u00A0each\u00A0hand.' },
          { label: 'Stations', detail: 'The\u00A0drift pauses at\u00A0a\u00A0broken ring. A\u00A0verified movement closes it. Every station also closes on\u00A0a\u00A0timeout, so\u00A0there is\u00A0no\u00A0failure\u00A0state.' },
          { label: 'Light and sound', detail: 'Closed-form tunnel shading with bloom, and\u00A0procedural sound with no\u00A0audio files. Three quality tiers keep the\u00A0frame rate steady on\u00A0weaker graphics\u00A0cards.' },
          { label: 'The questions', detail: 'A\u00A0shuffled deck of\u00A054 reflection questions, drawn one at\u00A0a\u00A0time as\u00A0the\u00A0rings\u00A0close.' },
        ],
        footer: '> code & artwork: Sinaida Krivchenko · Apache 2.0 code, CC BY-NC-ND 4.0 artwork',
      },
      credits: ['Concept, code & artwork: Sinaida Krivchenko · sinaida.eu · @sin.ai.da'],
      links: [{ label: 'GitHub', url: 'https://github.com/sinaida-space/ethereal-path' }],
      order: {
        heading: 'What a space can commission',
        body:
          'Picture a\u00A0gallery with an\u00A0empty room and\u00A0a\u00A0question it\u00A0wants visitors to\u00A0carry out of\u00A0it. Sinaida designs the\u00A0experience around the\u00A0body: which movements the\u00A0room asks for\u00A0and\u00A0how the\u00A0light answers them. Underneath sits a\u00A0tracking system she builds to\u00A0run in\u00A0that room, with nothing in\u00A0the\u00A0visitors’\u00A0hands.',
        suffix: 'to plan a body-driven piece for your space.',
      },
    },
  },

  {
    id: 'stereolove',
    dialect: 'crt',
    title: 'Stereolove',
    kind: 'game',
    tagline: 'Head-coupled op-art: the screen becomes an unstable optical volume',
    blurb:
      "The\u00A0browser estimates the\u00A0viewer’s head position with on-device face tracking and\u00A0shifts the\u00A0projection in\u00A0response, so\u00A0the\u00A0monitor behaves like an\u00A0optical volume behind glass: op-art interference, a\u00A0star tunnel, anamorphic text that only resolves from one viewpoint. One ritual gesture (an\u00A0open hand raised near the\u00A0face) opens the\u00A0next question. A\u00A0browser test of\u00A0an\u00A0old lineage, from anamorphic painting to\u00A0head-coupled perspective and\u00A0the\u00A0camera-tracked LED volumes of\u00A0film\u00A0sets.",
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
    caseStudy: {
      kindLabel: 'Interactive web',
      intro: [
        'Move your head and\u00A0the\u00A0flat monitor opens into a\u00A0window, with a\u00A0star tunnel behind the\u00A0glass. Stereolove finds your head through a\u00A0webcam and\u00A0redraws the\u00A0picture for\u00A0where you\u00A0are.',
        'Questions hang inside the\u00A0tunnel as\u00A0clouds of\u00A0cyan points. From one viewpoint they line up\u00A0into words; step aside and\u00A0they scatter. Raise an\u00A0open hand near your face and\u00A0the\u00A0next question\u00A0arrives.',
      ],
      heroCta: { label: 'Enter Stereolove', url: 'https://sinaida-space.github.io/stereolove/' },
      stat: {
        value: '3',
        heading: 'Ways in',
        body: 'Camera, mouse or\u00A0touch. The\u00A0same space opens through all three, and\u00A0the\u00A0camera is\u00A0never\u00A0required.',
      },
      sections: [
        {
          heading: 'What it is',
          paragraphs: [
            'How much of\u00A0what we\u00A0see is\u00A0in\u00A0the\u00A0object, and\u00A0how much does the\u00A0observer build? Stereolove asks that with a\u00A0head-coupled op-art piece for\u00A0the\u00A0browser, concept title “The\u00A0Reality Negotiator”. The\u00A0monitor behaves like glass over a\u00A0luminous tunnel of\u00A0wireframe rings and\u00A0spokes. The\u00A0structure moves only when you do, and\u00A0the\u00A0star field drifts through depth on\u00A0its own, so\u00A0every shift in\u00A0the\u00A0picture comes from the\u00A0person in\u00A0front\u00A0of\u00A0the\u00A0screen.',
            'It\u00A0belongs to\u00A0her perception work. Sinaida made the\u00A0concept, the\u00A0code\u00A0and\u00A0the\u00A0artwork.',
          ],
        },
        {
          heading: 'Where it started',
          paragraphs: [
            'With Magic Eye pictures. Some people see the\u00A0hidden depth, and\u00A0some never do. That frustration stayed with Sinaida, and\u00A0her biomedical training gave it\u00A0a\u00A0frame: perception is\u00A0a\u00A0negotiation between the\u00A0eye\u00A0and\u00A0the\u00A0brain.',
            'So\u00A0she turned the\u00A0stereogram around. The\u00A0image adapts to\u00A0the\u00A0viewer, and\u00A0nobody has to\u00A0cross their eyes and\u00A0wait. The\u00A0piece grew out of\u00A0her research into illusions for\u00A0the\u00A0stage, and\u00A0the\u00A0questions hidden in\u00A0the\u00A0tunnel are ones she asks\u00A0herself.',
          ],
        },
        {
          heading: 'What was tested',
          paragraphs: [
            'Head-coupled perspective first. A\u00A0virtual eye sits in\u00A0front of\u00A0the\u00A0screen, and\u00A0every point of\u00A0the\u00A0scene is\u00A0projected through it\u00A0onto the\u00A0screen plane, so\u00A0when the\u00A0eye moves the\u00A0picture shifts like the\u00A0view through a\u00A0window. The\u00A0projection math lives in\u00A0one pure module with unit tests. Depth comes from motion parallax alone, and\u00A0the\u00A0eyes never have to\u00A0fuse two\u00A0images.',
            'Then the\u00A0text. Each question is\u00A0drawn to\u00A0a\u00A0canvas and\u00A0sampled into points, and\u00A0every point is\u00A0placed on\u00A0the\u00A0sightline from one reveal position through its letter, each at\u00A0a\u00A0different depth. From that position the\u00A0points read as\u00A0words; anywhere else, parallax pulls them apart. A\u00A0resolved question stays readable for\u00A0at\u00A0least three seconds, then dissolves like\u00A0smoke.',
            'The\u00A0idea is\u00A0old. Holbein’s The\u00A0Ambassadors (1533) hides a\u00A0skull that resolves from one viewpoint only. Colin Ware and\u00A0colleagues described head-coupled “fish tank” virtual reality in\u00A01993, and\u00A0Johnny Chung Lee showed head tracking with a\u00A0Wii remote in\u00A02007. Film sets now use camera-tracked LED volumes that redraw the\u00A0scene for\u00A0the\u00A0camera’s position. Stereolove tries that line of\u00A0work in\u00A0a\u00A0browser tab, with an\u00A0ordinary\u00A0webcam.',
          ],
        },
        {
          heading: 'How it was made',
          paragraphs: [
            'The\u00A0first prototype went up\u00A0in\u00A0May 2026, and\u00A0within days it\u00A0had a\u00A0question chamber, the\u00A0starflight reveal, sound cues and\u00A0a\u00A0mobile layout. Tracking runs on\u00A0the\u00A0device: the\u00A0MediaPipe face model for\u00A0head position and\u00A0the\u00A0hand model for\u00A0one gesture, an\u00A0open hand near the\u00A0face. The\u00A0first stable face position counts as\u00A0neutral. MediaPipe loads only when the\u00A0camera mode starts, so\u00A0a\u00A0blocked camera never breaks\u00A0the\u00A0piece.',
            'Then came the\u00A0frame budget. The\u00A0renderer measures its own cost and, when it\u00A0has to, lowers the\u00A0frame rate and\u00A0pixel density, thins the\u00A0points and\u00A0drops glow passes. Face and\u00A0hand detection are throttled and\u00A0never run in\u00A0the\u00A0same animation frame. All sound is\u00A0generated in\u00A0the\u00A0browser after the\u00A0visitor picks a\u00A0mode, and\u00A0no\u00A0audio file\u00A0is\u00A0loaded.',
          ],
        },
        {
          heading: 'What it taught',
          paragraphs: [
            'Sinaida tested it\u00A0on\u00A0a\u00A0projection, with friends around. The\u00A0piece made the\u00A0frame budget part of\u00A0the\u00A0design: a\u00A0renderer that watches its own cost and\u00A0sheds detail before it\u00A0drops\u00A0the\u00A0experience.',
            'The\u00A0same habit of\u00A0measuring on\u00A0ordinary machines runs through [CONSPACE ROOMS](/work/conspace-rooms), where every passage between rooms was measured frame\u00A0by\u00A0frame.',
          ],
        },
      ],
      media: [
        {
          label: 'The viewpoint moves',
          video: 'jQy4Kk70hxM',
          caption: 'An\u00A08-second demo of\u00A0the\u00A0piece.',
        },
      ],
      method: {
        trace: '> idea_pipeline.trace() // viewpoint → volume',
        stages: [
          { label: 'The premise', detail: 'A\u00A0stereogram withholds depth from some viewers. Reverse it: the\u00A0image adapts\u00A0to\u00A0the\u00A0viewer.' },
          { label: 'Head-coupled projection', detail: 'A\u00A0virtual eye in\u00A0front of\u00A0the\u00A0screen, every point projected through it. Pure math, unit\u00A0tested.' },
          { label: 'Anamorphic points', detail: 'Question text sampled into points and\u00A0placed along sightlines from a\u00A0reveal eye, readable from one angle\u00A0only.' },
          { label: 'Tracking', detail: 'On-device face and\u00A0hand landmarks. The\u00A0first stable face becomes neutral. MediaPipe loads only when the\u00A0camera\u00A0starts.' },
          { label: 'Frame budget', detail: 'The\u00A0renderer watches its own frame cost and\u00A0sheds detail, frame rate and\u00A0glow before it\u00A0drops\u00A0the\u00A0experience.' },
        ],
        footer: '> code & artwork: Sinaida Krivchenko · Apache 2.0 code, CC BY-NC-ND 4.0 artwork',
      },
      credits: [
        'Concept, code & artwork: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
        'Title typeface: Bitmgothic, 1001Fonts',
      ],
      links: [{ label: 'GitHub', url: 'https://github.com/sinaida-space/stereolove' }],
      order: {
        heading: 'What an exhibition or a stage can commission',
        body:
          'Stereolove works at\u00A0the\u00A0scale of\u00A0one viewer and\u00A0one screen. Scale it\u00A0up: a\u00A0stage that wants its audience to\u00A0doubt what they see for\u00A0a\u00A0few minutes. Sinaida starts from what the\u00A0viewer should believe, then designs the\u00A0illusion and\u00A0the\u00A0system that holds\u00A0it\u00A0in\u00A0place.',
        suffix: 'to talk about a perception piece.',
      },
    },
  },

  {
    id: 'infinite-voidsong',
    dialect: 'ascii',
    title: 'Infinite Voidsong',
    subtitle: 'Focus Soundscapes',
    kind: 'game',
    tagline: 'Endless generated soundscapes for focused work, with rest built into the session',
    blurb:
      'Layer noise, water, fire, places and\u00A0music into one mix, save it\u00A0as\u00A0a\u00A0preset, and\u00A0let it\u00A0run for\u00A0hours. Sinaida built it\u00A0for\u00A0her own working day. Ballet taught her that rest is\u00A0where growth happens, so\u00A0the\u00A0breaks are timed with the\u00A0same care as\u00A0the\u00A0work. An\u00A0audio-reactive tunnel breathes with the\u00A0sound. It\u00A0installs as\u00A0an\u00A0app, works offline, and\u00A0nothing you\u00A0do\u00A0in\u00A0it\u00A0is\u00A0tracked.',
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
    caseStudy: {
      kindLabel: 'Web tool',
      intro: [
        'Brown noise, rain over it, a\u00A0few chords moving underneath. Infinite Voidsong generates sound for\u00A0focused work and\u00A0keeps playing for\u00A0as\u00A0long as\u00A0you need. You layer sounds from six families into one mix, save it\u00A0as\u00A0a\u00A0preset and\u00A0leave\u00A0it\u00A0running.',
        'Sinaida built it\u00A0for\u00A0her own working day. Ballet taught her that rest is\u00A0where growth happens, so\u00A0the\u00A0breaks are timed with the\u00A0same care as\u00A0the\u00A0work, and\u00A0a\u00A0session ends with a\u00A0slow fade and\u00A0a\u00A0soft\u00A0chime.',
        'A\u00A0tunnel drawn in\u00A0WebGL moves with the\u00A0sound. The\u00A0tool installs as\u00A0an\u00A0app, works offline, has no\u00A0accounts and\u00A0tracks\u00A0nothing.',
      ],
      heroCta: { label: 'Open Infinite Voidsong', url: 'https://infinite-voidsong.vercel.app/' },
      stat: {
        value: '0',
        heading: 'Accounts, cookies or trackers',
        body: 'The\u00A0whole application is\u00A0static. Your mixes and\u00A0presets stay in\u00A0the\u00A0browser on\u00A0your own\u00A0machine.',
      },
      sections: [
        {
          heading: 'What it is',
          paragraphs: [
            'Before any sound plays, the\u00A0tool asks what you are doing, from deep focus to\u00A0sleep, then how long the\u00A0session should be, where you are and\u00A0how you listen. It\u00A0is\u00A0a\u00A0free web tool for\u00A0background sound, built around those\u00A0answers.',
            'In\u00A0her practice it\u00A0is\u00A0the\u00A0sound environment, the\u00A0piece that lives in\u00A0the\u00A0background of\u00A0a\u00A0working day. Sinaida designed it\u00A0and\u00A0directed the\u00A0build: Vite and\u00A0TypeScript, with no\u00A0framework and\u00A0no\u00A0runtime\u00A0dependencies.',
          ],
        },
        {
          heading: 'Where it started',
          paragraphs: [
            'The\u00A0name came\u00A0first.',
            '“Only when there is\u00A0no\u00A0distraction and\u00A0there is\u00A0nothing around are we\u00A0forced to\u00A0create\u00A0something.”',
            'The\u00A0void is\u00A0where the\u00A0need to\u00A0make something shows up, and\u00A0the\u00A0song is\u00A0what a\u00A0person makes to\u00A0fill it. This one plays for\u00A0as\u00A0long as\u00A0the\u00A0working day\u00A0lasts.',
            'She was careful with evidence. Background sound helps some people with some tasks and\u00A0hurts others, so\u00A0the\u00A0tool asks about the\u00A0task first. It\u00A0says plainly that it\u00A0is\u00A0no\u00A0medical device and\u00A0makes no\u00A0health claims, and\u00A0its research page lists the\u00A0studies it\u00A0draws on, with what each one does and\u00A0does not\u00A0show.',
          ],
        },
        {
          heading: 'What was tested',
          paragraphs: [
            'What does generated sound need to\u00A0hold for\u00A0hours? Everything is\u00A0synthesized live with the\u00A0Web Audio API. One audio worklet makes the\u00A0noise: white from a\u00A0xorshift generator, pink from Paul Kellet’s seven-pole filter, brown from a\u00A0leaky integrator. A\u00A0single tilt control blends neighboring colors with an\u00A0equal-power law, so\u00A0loudness stays flat across\u00A0the\u00A0sweep.',
            'Recordings came in\u00A0where they help. Since version 1.2.0, six nature layers can play short CC0 field recordings from BigSoundBank, about 3\u00A0MB in\u00A0all, loaded on\u00A0first use and\u00A0cached. The\u00A0generated versions stay as\u00A0stand-ins. The\u00A0music sources run on\u00A0a\u00A0small scheduler, and\u00A0a\u00A0Harmony switch moves chord progressions along the\u00A0circle of\u00A0fifths while staying inside one\u00A0key.',
            'Focus Boost, an\u00A0optional pulse on\u00A0the\u00A0music layer, runs at\u00A012 to\u00A020\u00A0pulses a\u00A0second, built from an\u00A0oscillator driving a\u00A0gain node. The\u00A0tunnel follows the\u00A0mouse on\u00A0a\u00A0computer and\u00A0stays still on\u00A0a\u00A0phone. The\u00A0tilt sensor is\u00A0left out on\u00A0purpose, so\u00A0iOS never asks the\u00A0visitor for\u00A0motion\u00A0permission.',
          ],
        },
        {
          heading: 'How it was made',
          paragraphs: [
            'Sinaida has used ChatGPT since January 2023, and\u00A0her work with machine learning goes back further: at\u00A0university she taught perceptrons and\u00A0built predictive algorithms that sorted cases for\u00A0a\u00A0cervical cancer screening system. Since January 2026 she codes with AI agents through an\u00A0orchestrator she built herself, [Mahler](https://github.com/sinaida-space/mahler-the-orchestrator). It\u00A0splits the\u00A0work, writes the\u00A0specs and\u00A0routes each task to\u00A0the\u00A0model that fits it. The\u00A0repository of\u00A0this tool keeps its plan, with every task assigned to\u00A0a\u00A0named\u00A0model.',
            'Her years in\u00A0General Electric’s IT\u00A0Leadership Program (2012–2015, rotations across countries and\u00A0businesses) taught her to\u00A0build systems where many hands deliver one result. Now the\u00A0hands are AI agents. The\u00A0thinking that sets the\u00A0system, its rules and\u00A0its taste stays human, and\u00A0so\u00A0does what the\u00A0work is\u00A0about: bodies, perception, rest,\u00A0weather.',
            'The\u00A0interface grew in\u00A0layers: the\u00A0audio engine first, then flat windows in\u00A0the\u00A0style of\u00A0this site with Geist Pixel as\u00A0the\u00A0only typeface, a\u00A0terminal-style welcome screen and\u00A0a\u00A0guide. Version 1.2.0 came two days after the\u00A0repository was\u00A0created.',
          ],
        },
        {
          heading: 'What it taught',
          paragraphs: [
            'Sinaida and\u00A0her friends use it, and\u00A0people she has never met have written online to\u00A0thank\u00A0her.',
            'It\u00A0rests on\u00A0two working methods: directing AI agents by\u00A0spec, and\u00A0shipping a\u00A0browser piece end to\u00A0end, with performance on\u00A0ordinary machines, offline use, phones and\u00A0accessibility in\u00A0the\u00A0same release. Both run through [CONSPACE ROOMS](/work/conspace-rooms)\u00A0as\u00A0well.',
          ],
        },
      ],
      method: {
        trace: '> idea_pipeline.trace() // question → sound',
        stages: [
          { label: 'The question', detail: 'The\u00A0welcome screen asks what you are doing before any sound plays, from deep focus\u00A0to\u00A0sleep.' },
          { label: 'Generated sound', detail: 'Noise, nature, places, machines, instrumental music: all synthesized live with the\u00A0Web Audio API. Noise runs on\u00A0an\u00A0audio\u00A0worklet.' },
          { label: 'Recorded where it helps', detail: 'Six nature layers can use short CC0 field recordings, loaded on\u00A0first use and\u00A0cached. The\u00A0generated versions remain\u00A0as\u00A0stand-ins.' },
          { label: 'Harmony', detail: 'Chord progressions move along the\u00A0circle of\u00A0fifths inside one key, with longer 32 and\u00A064 step\u00A0phrases.' },
          { label: 'Rest on a timer', detail: 'Work and\u00A0break presets of\u00A025/5, 50/10 and\u00A090/15, or\u00A0your own minutes. The\u00A0session ends with a\u00A0slow\u00A0fade.' },
          { label: 'The tunnel', detail: 'A\u00A0WebGL2 tunnel with ordered dither reacts to\u00A0the\u00A0sound, and\u00A0its color follows the\u00A0sound you\u00A0pick.' },
        ],
        footer: '> code & artwork: Sinaida Krivchenko · Apache 2.0 · field recordings CC0 (BigSoundBank)',
      },
      credits: [
        'Concept, code & design: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
        'Field recordings: CC0, BigSoundBank',
        'Typeface: Geist Pixel',
      ],
      links: [
        { label: 'GitHub', url: 'https://github.com/sinaida-space/infinite-voidsong' },
      ],
      order: {
        heading: 'What a space can commission',
        body:
          'Infinite Voidsong is\u00A0a\u00A0sound environment for\u00A0one person at\u00A0a\u00A0desk. Now take a\u00A0reading room where people come to\u00A0work for\u00A0hours. The\u00A0same engine can be shaped for\u00A0that room, down to\u00A0the\u00A0moment it\u00A0invites a\u00A0break. Sinaida designs the\u00A0sound and\u00A0the\u00A0session around what people do\u00A0there.',
        suffix: 'to talk about a sound environment.',
      },
    },
  },
  {
    id: 'storm-glass',
    dialect: 'ascii',
    title: 'Storm Glass',
    subtitle: 'TouchDesigner Tutorial',
    kind: 'tutorial',
    tagline: 'A thunderstorm behind rainy glass, built in TouchDesigner: the bass fires the lightning',
    blurb:
      'Rain on\u00A0a\u00A0window with a\u00A0storm behind it, built in\u00A0TouchDesigner, with a\u00A023-minute video that walks through the\u00A0finished network. Raindrops are spheres moving along a\u00A0line grid, the\u00A0lightning follows a\u00A0geometry path built with custom code, and\u00A0the\u00A0view comes from one of\u00A0TouchDesigner\u2019s example files. The .toe and\u00A0the\u00A0sound file are on\u00A0Patreon for\u00A0every\u00A0subscriber.',
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
    caseStudy: {
      kindLabel: 'Tutorial',
      intro: [
        'Raindrops on\u00A0glass, and\u00A0lightning somewhere behind them. Storm Glass is\u00A0a\u00A0thunderstorm built in\u00A0TouchDesigner, with a\u00A023-minute video that walks through the\u00A0whole network\u00A0as\u00A0it\u00A0stands.',
        'It\u00A0is\u00A0a\u00A0teaching case: a\u00A0messy network, opened up\u00A0so\u00A0others can load it\u00A0and\u00A0take it\u00A0apart. The\u00A0.toe file and\u00A0the\u00A0sound file are on\u00A0Patreon for\u00A0all subscribers, free tier\u00A0included.',
      ],
      heroCta: { label: 'Watch the network overview', url: 'https://youtu.be/hwFttiCKbrU' },
      sections: [
        {
          heading: 'What it is',
          paragraphs: [
            'A\u00A0TouchDesigner network and\u00A0an\u00A0overview video of\u00A0it. Sinaida built the\u00A0network, recorded the\u00A0video and\u00A0put the\u00A0files on\u00A0her Patreon, so\u00A0anyone can open the\u00A0same project she shows on\u00A0screen. In\u00A0her practice it\u00A0is\u00A0teaching work, the\u00A0side that turns her own networks into material others can learn\u00A0from.',
          ],
        },
        {
          heading: 'Where it started',
          paragraphs: [
            'Purple Rain by\u00A0Prince came up\u00A0in\u00A0her\u00A0playlist.',
            '“I\u00A0got way too nostalgic and\u00A0thought that the\u00A0energy should be transformed into creating a\u00A0rain network\u00A0in\u00A0TouchDesigner.”',
          ],
        },
        {
          heading: 'What was tested',
          paragraphs: [
            'Raindrops are spheres moving along a\u00A0line grid. The\u00A0lightning bolt follows a\u00A0geometry path built with custom code, and\u00A0in\u00A0the\u00A0video version the\u00A0sound triggers it. The\u00A0view comes from one of\u00A0TouchDesigner’s example files. Between them sit, in\u00A0her own words, “way too many” comps\u00A0and\u00A0displaces.',
            'The\u00A0stylized water map is\u00A0a\u00A0Substance file from Adobe Substance 3D Community Assets, stylized_water by\u00A0Etienne Patry. Each user downloads it\u00A0and\u00A0adds\u00A0it\u00A0to\u00A0the\u00A0network.',
          ],
        },
        {
          heading: 'How it was made',
          paragraphs: [
            'The\u00A0video is\u00A0an\u00A0overview of\u00A0the\u00A0finished network. It\u00A0goes through what each part does, and\u00A0the\u00A0viewer can then open the\u00A0same file and\u00A0look around at\u00A0their own\u00A0pace.',
            '“It\u00A0is\u00A0far from perfect. If\u00A0you have better ideas how to\u00A0achieve realistic raindrops, I’d love to\u00A0learn\u00A0that!”',
            'So\u00A0the\u00A0files went out as\u00A0they are, and\u00A0anyone with a\u00A0better idea can try it\u00A0inside the\u00A0same\u00A0network.',
          ],
        },
        {
          heading: 'What it taught',
          paragraphs: [
            'A\u00A0messy network becomes useful the\u00A0moment someone else can open it\u00A0and\u00A0ask why a\u00A0node is\u00A0there. Storm Glass is\u00A0where Sinaida practices that handover\u00A0in\u00A0public.',
            'It\u00A0also belongs to\u00A0the\u00A0work where sound and\u00A0light run as\u00A0one system. The\u00A0same thinking runs live behind the\u00A0band [Redkie Ptitsy](/work/redkie-ptitsy) and\u00A0in\u00A0[CONSPACE ROOMS](/work/conspace-rooms), where the\u00A0music is\u00A0generated as\u00A0the\u00A0visitor\u00A0walks.',
          ],
        },
      ],
      media: [
        {
          label: 'The network overview',
          video: 'hwFttiCKbrU',
          caption: '23 minutes through the\u00A0finished network.',
        },
      ],
      method: {
        trace: '> network.trace() // rain → bolt → view',
        stages: [
          { label: 'Rain', detail: 'Raindrops are spheres moving along a\u00A0line\u00A0grid.' },
          { label: 'Lightning', detail: 'The\u00A0bolt follows a\u00A0geometry path built with custom code. In\u00A0the\u00A0video version, the\u00A0sound triggers each\u00A0strike.' },
          { label: 'View', detail: 'The\u00A0view comes from one of\u00A0TouchDesigner’s example\u00A0files.' },
          { label: 'Water', detail: 'A\u00A0stylized water Substance map, which each user adds from Adobe Substance 3D Community\u00A0Assets.' },
          { label: 'Files', detail: 'The .toe and\u00A0the\u00A0sound file, on\u00A0Patreon for\u00A0all\u00A0subscribers.' },
        ],
        footer: '> network & tutorial: Sinaida Krivchenko · water map: Etienne Patry (Adobe Substance 3D Community Assets)',
      },
      credits: [
        'Network & tutorial: Sinaida Krivchenko · sinaida.eu · @sin.ai.da',
        'Water map: stylized_water by Etienne Patry, from Adobe Substance 3D Community Assets',
      ],
      links: [
        { label: 'Project files on Patreon', url: 'https://www.patreon.com/theswansarenotwhattheyseem/posts/rain-and-169292587' },
        { label: 'YouTube channel', url: 'https://www.youtube.com/@theSwansAreNotWhatTheySeem' },
      ],
      order: {
        heading: 'What a team can book',
        body:
          'Say a\u00A0studio has a\u00A0TouchDesigner network that grew faster than anyone could document it, and\u00A0a\u00A0team that has to\u00A0run it. Sinaida opens it\u00A0up, works out what each part does and\u00A0hands it\u00A0back as\u00A0a\u00A0system the\u00A0team can run and\u00A0explain. A\u00A0group that wants to\u00A0learn the\u00A0tool can start from a\u00A0working network the\u00A0same\u00A0way.',
        suffix: 'to talk about a network or a session.',
      },
    },
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
