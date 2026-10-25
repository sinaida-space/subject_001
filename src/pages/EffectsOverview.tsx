import { useEffect, useState, type ReactNode } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { KICKER_CLASS, H1_CLASS, H2_CLASS, BODY_CLASS, PAGE_MAIN_CLASS } from '@/components/PageParts';
import DitherReveal from '@/components/DitherReveal';
import DitherText from '@/components/DitherText';
import DitheredThumb from '@/components/DitheredThumb';
import DustReveal from '@/components/DustReveal';
import GlitterText from '@/components/GlitterText';
import ScrambleText from '@/components/ScrambleText';
import VHSImage from '@/components/VHSImage';
import DisplacementImage from '@/components/DisplacementImage';
import StarMolecule from '@/components/StarMolecule';
import StarStill from '@/components/StarStill';
import { MoleculeNote } from '@/components/MoleculeBreak';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import SectionBreak from '@/components/SectionBreak';
import CustomCursor from '@/components/CustomCursor';
import demoImage from '@/assets/work-conspace-rooms-640.webp';

// ── Internal reference: every texture and effect on its own, with its
// source file and the numbers that tune it. Not linked from anywhere, served
// noindex (scripts/lib/site-data.mjs), and feeds the world audit and the
// colophon. Values below are copied from the source files; when a constant
// changes there, change it here.

type Param = [name: string, value: string, note?: string];

interface Entry {
  name: string;
  file: string;
  what: string;
  params: Param[];
  /** the live instance; without it the entry shows "needs its stage" */
  demo?: ReactNode;
  stage?: string;
}

// A fixed box that contains `position: fixed` children (a transform makes it
// their containing block), so full-screen layers can be shown at demo size.
const Box = ({ children, className = '', h = 'h-48' }: { children: ReactNode; className?: string; h?: string }) => (
  <div className={`relative ${h} w-full max-w-md overflow-hidden border border-border bg-background ${className}`} style={{ transform: 'translateZ(0)' }}>
    {children}
  </div>
);

function ScrambleDemo() {
  const [run, setRun] = useState(0);
  return (
    <div>
      <ScrambleText text="Responsive visual systems" runId={run} className="font-mono text-lg" />
      <button type="button" onClick={() => setRun((r) => r + 1)} className="clinical-label mt-3 block text-primary-legible">Run</button>
    </div>
  );
}

function HeartbeatDemo() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      <HeartbeatPlaceholder loaded={loaded} aspectRatio="16 / 9" className="max-w-md" />
      <button type="button" onClick={() => setLoaded((l) => !l)} className="clinical-label mt-3 block text-primary-legible">
        loaded = {String(loaded)}
      </button>
    </div>
  );
}

function CursorDemo() {
  const [on, setOn] = useState(false);
  return (
    <div>
      {on && <CustomCursor />}
      <button type="button" onClick={() => setOn((v) => !v)} className="clinical-label block text-primary-legible">
        {on ? 'Turn the tinted cursor off' : 'Turn the tinted cursor on (fine pointers only)'}
      </button>
    </div>
  );
}

const SAMPLE = 'Glass, light, signal';

const COMPONENTS: Entry[] = [
  {
    name: 'DitherReveal',
    file: 'src/components/DitherReveal.tsx',
    what: 'Greyscale dithered image; the pointer paints full colour through a Bayer-masked disc that decays.',
    params: [
      ['src, alt', 'required'],
      ['aspect', '4 / 3', 'frame ratio'],
      ['revealed', 'false', 'full colour while true'],
      ['touch', 'true', 'false: touch and pen do not reveal'],
      ['className', "''"],
      ['MASK_SCALE', '4', 'mask cell in device px'],
      ['RADIUS', '0.22', 'disc radius, share of frame width'],
      ['DECAY_TAU', '0.85 s', 'trail gone by about 2.5 s'],
      ['EPS', '0.03', 'below the lowest Bayer threshold'],
      ['SMEAR_PX', '8', 'max colour offset against pointer velocity'],
      ['DPR', '1', 'one dot per css px'],
    ],
    demo: <div className="w-full max-w-md"><DitherReveal src={demoImage} alt="Demo still" /></div>,
  },
  {
    name: 'DitherText',
    file: 'src/components/DitherText.tsx',
    what: 'Text resolving out of a dither once per change of `text`.',
    params: [
      ['text', 'required'],
      ['className', "''"],
      ['CELL', '2 px', 'the site’s one dither grain'],
      ['DURATION', '700 ms'],
      ['REDUCED', 'matchMedia', 'prefers-reduced-motion shows plain text'],
    ],
    demo: <DitherText text={SAMPLE} className="font-display text-4xl" />,
  },
  {
    name: 'DitheredThumb',
    file: 'src/components/DitheredThumb.tsx',
    what: 'Image swapped for its dithered preview (src/lib/ditherPreview.ts), then faded in.',
    params: [
      ['src, alt', 'required'],
      ['loading', "'lazy'", "or 'eager'"],
      ['width, height', 'square preview size', 'dithered at 2x the shown size'],
      ['className', 'none'],
    ],
    demo: <DitheredThumb src={demoImage} alt="Demo still" width={240} height={150} className="h-[150px] w-[240px] object-cover" />,
  },
  {
    name: 'DustReveal',
    file: 'src/components/DustReveal.tsx',
    what: 'three.js dust that clears off its children as the block scrolls into view.',
    params: [
      ['children', 'required'],
      ['className', "''"],
      ['PARTICLE_COUNT', '600'],
      ['COLORS.warmWhite', 'rgb(0.95, 0.93, 0.90)'],
      ['COLORS.crimson', 'rgb(0.784, 0.063, 0.180)'],
      ['COLORS.darkRed', 'rgb(0.50, 0.03, 0.09)'],
    ],
    demo: (
      <DustReveal className="relative h-40 w-full max-w-md">
        <p className="font-display text-3xl">Scroll me in</p>
      </DustReveal>
    ),
  },
  {
    name: 'GlitterText',
    file: 'src/components/GlitterText.tsx',
    what: 'Four-point star points on the ink of a word; they glint only while the page scrolls.',
    params: [
      ['children', 'required', 'the word stays real text'],
      ['RED', 'rgb(255,26,26)', 'the rare red point'],
      ['REDUCED', 'matchMedia', 'prefers-reduced-motion draws nothing'],
    ],
    demo: <GlitterText><span className="font-display text-5xl">LET&rsquo;S TALK</span></GlitterText>,
  },
  {
    name: 'ScrambleText',
    file: 'src/components/ScrambleText.tsx',
    what: 'Characters scramble through a glyph set and settle left to right.',
    params: [
      ['text, runId', 'required', 'a new runId starts a run'],
      ['delayMs', '0'],
      ['durationMs', '900'],
      ['className', 'none'],
      ['HOLD', '0.35', 'fraction of the run each char stays scrambled'],
      ['GLYPHS', 'A-Z a-z 0-9 and /\\<>*#%+=~'],
    ],
    demo: <ScrambleDemo />,
  },
  {
    name: 'VHSImage',
    file: 'src/components/VHSImage.tsx',
    what: 'Image frame with a brief tracking glitch on hover (filter and a 2 px shift).',
    params: [
      ['src, alt', 'required'],
      ['aspectRatio', "'16/10'"],
      ['className', "''"],
      ['hover filter', 'contrast 1.08, brightness 0.92, saturate 0.85, hue-rotate 15deg, contrast 1.2', 'for 200 ms'],
      ['rest filter', 'contrast 1.08, brightness 0.92, saturate 0.85'],
      ['shift', '-2 px at 120 ms'],
    ],
    demo: <div className="w-full max-w-md"><VHSImage src={demoImage} alt="Demo still" /></div>,
  },
  {
    name: 'DisplacementImage',
    file: 'src/components/DisplacementImage.tsx',
    what: 'Image bent by an SVG displacement ripple around the pointer. Fine pointer, no reduced motion.',
    params: [
      ['src, alt', 'required'],
      ['strength', '24', 'peak displacement in px'],
      ['radius', '90', 'ripple radius in px'],
      ['priority', 'false', 'LCP image: eager, high fetch priority'],
      ['width, height, srcSet, sizes', 'optional'],
      ['className, style, imgClassName, imgStyle, onLoad', 'optional'],
      ['CAN_DISPLACE', 'pointer: fine and no reduced motion'],
    ],
    demo: <div className="w-full max-w-md"><DisplacementImage src={demoImage} alt="Demo still" width={640} height={400} /></div>,
  },
  {
    name: 'StarMolecule',
    file: 'src/components/StarMolecule.tsx',
    what: 'A molecule hidden as stars; bumping flareKey lights its bonds and runs an impulse along them.',
    params: [
      ['id', 'dopamine here', 'noradrenaline | dopamine | serotonin | oxytocin'],
      ['width, height', 'required'],
      ['flareKey', '0', 'bump to flare'],
      ['breathe', 'true', '.molecule-breath CSS loop'],
      ['hold', '4500 ms'],
      ['highlight', 'false', 'hover/focus light'],
      ['STEP', '140 ms', 'between impulse generations'],
      ['TRAVEL', '320 ms', 'per bond'],
      ['RAMP / FADE', '300 / 900 ms'],
      ['HIGHLIGHT', '0.75'],
      ['HOVER_IN / HOVER_OUT', '900 / 1400 ms'],
    ],
    demo: <Box h="h-40"><StarMolecule id="dopamine" width={400} height={160} highlight /></Box>,
  },
  {
    name: 'MoleculeNote (MoleculeBreak)',
    file: 'src/components/MoleculeBreak.tsx',
    what: 'A clickable molecule with a footnote question; SectionBand holds the gap between home sections.',
    params: [
      ['id, width, height', 'required'],
      ['pulse', '0', 'bump to flare briefly'],
      ['pulseHold', '2200 ms'],
      ['CLICK_HOLD', '4500 ms'],
      ['SectionBand', 'h-32 md:h-40', '`raised` rides over the section before'],
    ],
    demo: <div className="flex h-40 items-center justify-center"><MoleculeNote id="oxytocin" width={240} height={110} /></div>,
  },
  {
    name: 'StarStill',
    file: 'src/components/StarStill.tsx',
    what: 'Static SVG sky held until the live field draws its first frame (html[data-field]).',
    params: [
      ['COUNT', '130', 'halved 2026-10-12'],
      ['seed', 'fixed (mulberry32)', 'same sky every visit'],
      ['fade', '1.2 s', '.star-still, then unmounts after 1600 ms'],
    ],
    demo: <Box h="h-40"><StarStill /></Box>,
  },
  {
    name: 'HeartbeatPlaceholder',
    file: 'src/components/HeartbeatPlaceholder.tsx',
    what: 'Flatline that spikes once when `loaded` flips false to true.',
    params: [
      ['loaded', 'required'],
      ['width', "'100%'"],
      ['height, aspectRatio', 'optional'],
      ['className', 'none'],
    ],
    demo: <HeartbeatDemo />,
  },
  {
    name: 'SectionBreak',
    file: 'src/components/SectionBreak.tsx',
    what: 'A thread with one slowly breathing node.',
    params: [
      ['thread', '56 px each side'],
      ['node', '1.5 rem dot, bg-primary/70'],
      ['breath-pulse', '4 s ease-in-out', 'opacity 0.35 to 1, glow 10px 2px primary/0.5'],
    ],
    demo: <SectionBreak />,
  },
  {
    name: 'CustomCursor',
    file: 'src/components/CustomCursor.tsx',
    what: 'Flags body.has-custom-cursor on fine pointers; src/index.css paints the red arrow.',
    params: [
      ['props', 'none'],
      ['arrow fill / stroke', '#CC1414 / #1a0000', '22 px SVG, hotspot 1 1'],
    ],
    demo: <CursorDemo />,
  },
  {
    name: 'StarTitle',
    file: 'src/components/StarTitle.tsx',
    what: 'Section title drawn as stars that follow its section’s presence on screen.',
    stage: 'scroll position and the home page chapters',
    params: [
      ['text', 'required'],
      ['as', "'h2'"],
      ['caption, className', 'optional'],
      ['pour', 'false', 'stars fall into the city lights'],
      ['SPAN', '0.92', 'share of content width'],
      ['MAX_H', '0.38', 'of the small viewport height'],
      ['ALPHA', '0.32'],
      ['OVERLAP', '0.3'],
      ['PARALLAX', '0.7', 'lite titles'],
      ['BRIGHT', '0.5'],
      ['PAD', '6 px'],
      ['POUR_SPAN / GROUND_TOP', '0.8 / 0.56'],
      ['LiteTitle', 'text, caption, className, titleStyle', 'Chalk-mode variant'],
    ],
  },
  {
    name: 'ParticleField',
    file: 'src/components/ParticleField.tsx',
    what: 'The three.js star field with trails, CRT overlay and the home flight.',
    stage: 'a full-screen WebGL canvas, scroll and the render-mode provider',
    params: [
      ['subtle', 'false', 'half the stars, half the luminosity'],
      ['flight', 'false', 'home page camera flight'],
      ['SMALL_STARS / BRIGHT_STARS', '683 / 25'],
      ['TRAIL_COUNT', '400'],
      ['FIELD_W / H / D', '20 / 14 / 8'],
      ['NEAR_GAP', '3'],
      ['SPRING_STIFFNESS / DAMPING', '55 / 9.5'],
      ['FLIGHT_FOV / FLIGHT_ROLL', '14 deg / 0.05 rad'],
      ['CLUSTER / CLUSTER_R / GLINT_S', '0.9 / 3.5 / 0.9 s'],
      ['AIM_DEPTH', '6'],
      ['MAX_DELTA', '1 / 30 s'],
      ['perf probe', 'FRAME_BUDGET 1 / 45 s', '20 warm-up + 90 frames; tier high | reduced | off in sinaida:perf-tier'],
    ],
  },
  {
    name: 'CursorLens',
    file: 'src/components/CursorLens.tsx',
    what: 'Postprocessing lens that bends the sky around the pointer; one ring on stop.',
    stage: 'the React Three Fiber composer inside ParticleField',
    params: [
      ['props', 'none'],
      ['AMT_K', '30', 'spring stiffness'],
      ['AMT_DAMP', '4.2', 'one overshoot'],
      ['RING_LIFE', '1.0 s'],
      ['RING_SPEED', '260 px/s'],
    ],
  },
  {
    name: 'Starway / StarwayScene',
    file: 'src/components/Starway.tsx, src/components/StarwayScene.tsx',
    what: 'The nights-of-the-sky flight on /machines, with a still version for reduced motion.',
    stage: 'the /machines scroll stage and the nights data',
    params: [
      ['VEIL', '0.9'],
      ['TRAIL_CORE', 'stroke 1.25 px, round caps'],
      ['TRAIL_GLOW', 'stroke 7 px, round caps'],
      ['data', 'src/lib/starway.ts', 'FIRST_LIGHT, loadNights'],
    ],
  },
  {
    name: 'dive/ (DiveHost, DiveOverlay, diveRenderer)',
    file: 'src/components/dive/',
    what: 'Route transition that dives into a case and returns on Back. Full mode only.',
    stage: 'router history and the dive bus',
    params: [
      ['DUR_IN', '1700 ms'],
      ['DUR_OUT', '1400 ms'],
      ['DIVE_LAND_AT', '0.62', 'src/lib/diveBus.ts'],
      ['BEAM_SCALE', '2', 'beam buffer at half resolution'],
    ],
  },
  {
    name: 'constellation/ (Constellation, Full, Lite)',
    file: 'src/components/constellation/',
    what: 'The works-and-practice graph on the home page, with a Chalk-mode lite version.',
    stage: 'the home page chapters and the render-mode provider',
    params: [
      ['modes', 'full (lazy) | lite'],
      ['data', 'src/data/graph.ts, src/data/projects.ts'],
    ],
  },
];

// CSS textures: [name, what, source, params, demo]
const FILE_CSS = 'src/index.css';

const CSS_ENTRIES: Entry[] = [
  {
    name: '.crt-overlay (+ .crt-subtle)',
    file: FILE_CSS,
    what: 'Grain, scanlines and vignette stacked over the star field, with a slow flicker.',
    params: [
      ['grain tile', '160 px, feTurbulence 0.85, 2 octaves, opacity 0.12', '2dppx: 480 px tile, opacity 0.14'],
      ['scanlines', '3 px period, 1 px at rgba(0,0,0,0.18)'],
      ['vignette', 'transparent 34%, 0.16 at 66%, 0.5 at 100%'],
      ['.crt-subtle', 'opacity 0.55'],
      ['crt-flicker', 'brightness 0.94 / 0.985 / 0.93 dips', 'keyframes'],
    ],
    demo: <Box className="bg-black"><div className="crt-overlay" /></Box>,
  },
  {
    name: '.crt-scanlines',
    file: FILE_CSS,
    what: 'Plain scanline overlay, fixed over the whole viewport.',
    params: [
      ['period', '4 px', '2 px clear, 2 px dark'],
      ['--scanline-opacity', '0.04', 'set at src/index.css:1019'],
      ['z-index', '9999'],
      ['reduced motion', 'opacity 0.35'],
    ],
    demo: <Box className="bg-black"><div className="crt-scanlines" /></Box>,
  },
  {
    name: '.vhs-glitch',
    file: FILE_CSS,
    what: 'Steps animation of vhs-distort.',
    params: [['animation', 'vhs-distort 0.15s steps(2) infinite']],
    demo: <p className="vhs-glitch font-display text-4xl">{SAMPLE}</p>,
  },
  {
    name: '.glitch-text',
    file: FILE_CSS,
    what: 'Two colour-split copies of `data-text` appear and shift on hover.',
    params: [
      ['::before', 'accent, clip-path inset(0 0 60% 0), x -2 px'],
      ['::after', 'primary, clip-path inset(40% 0 0 0), x +2 px'],
      ['hover', 'opacity 0.8, glitch-shift 0.3s steps(3) infinite'],
      ['keyframes', 'glitch-1, glitch-2', 'x +/-3 px, clip-path insets'],
    ],
    demo: <p className="glitch-text font-display text-4xl" data-text={SAMPLE}>{SAMPLE}</p>,
  },
  {
    name: '.vhs-noise-bars',
    file: FILE_CSS,
    what: 'Faint horizontal bars drifting over project images.',
    params: [
      ['bars', 'foreground at 0.04 / 0.06 / 0.03', 'at 3, 8 and 15 percent'],
      ['animation', 'vhs-drift 12s linear infinite'],
      ['reduced motion', 'opacity 0.35, no animation'],
    ],
    demo: <Box className="bg-muted"><div className="vhs-noise-bars absolute inset-0" /></Box>,
  },
  {
    name: '.neon-glow / -hero / -accent',
    file: FILE_CSS,
    what: 'Stacked text-shadow glows, tuned conservatively for Safari.',
    params: [
      ['neon-glow', 'primary 0.5 at 4 px, 0.28 at 10, 0.14 at 20'],
      ['neon-glow-hero', 'primary 0.62 at 6, 0.38 at 16, 0.2 at 34, 0.1 at 62'],
      ['neon-glow-accent', 'accent 0.7 at 10, 0.3 at 20, 0.15 at 35'],
    ],
    demo: (
      <div className="flex flex-col gap-3 font-display text-3xl">
        <span className="neon-glow text-primary-legible">neon-glow</span>
        <span className="neon-glow-hero text-primary-legible">neon-glow-hero</span>
        <span className="neon-glow-accent text-primary-legible">neon-glow-accent</span>
      </div>
    ),
  },
  {
    name: '.dither-image',
    file: FILE_CSS,
    what: 'Dark, flat greyscale filter that opens to full colour on hover.',
    params: [
      ['rest', 'contrast 1.5, grayscale 0.8, brightness 0.6'],
      ['hover', 'contrast 1, grayscale 0, brightness 1'],
      ['transition', '0.6s cubic-bezier(0.16, 1, 0.3, 1)'],
    ],
    demo: <img src={demoImage} alt="Demo still" className="dither-image w-full max-w-md" />,
  },
  {
    name: '.molecule-breath',
    file: FILE_CSS,
    what: 'Slow opacity breath on a molecule canvas.',
    params: [
      ['animation', 'molecule-breath 4s ease-in-out infinite', 'opacity 0.5 to 1'],
      ['reduced motion', 'opacity 0.8, no animation'],
    ],
    demo: <Box h="h-40"><div className="molecule-breath absolute inset-0"><StarMolecule id="serotonin" width={400} height={160} breathe={false} /></div></Box>,
  },
  {
    name: '[data-halation]',
    file: FILE_CSS,
    what: 'Red film halation on large display headlines, marked by src/lib/halation.ts.',
    params: [
      ['text-shadow', 'sinaida-red 0.55 at 1 px, 0.18 at 10 px'],
      ['MIN_SIZE_PX', '48', 'src/lib/halation.ts; targets `.font-display`'],
    ],
    demo: <p data-halation className="font-display text-5xl text-white">Halation</p>,
  },
  {
    name: 'Raster route transition',
    file: FILE_CSS,
    what: 'View-transition scan that paints the new page in top to bottom behind a soft beam.',
    stage: 'a view transition started by a link click in RouteEnhancer',
    params: [
      ['--raster-duration', '450 ms'],
      ['--raster-ease', 'cubic-bezier(0.45, 0, 0.25, 1)'],
      ['beam', '.raster-beam, 1 px bright line on a faint red band'],
    ],
  },
  {
    name: 'Lite-mode grain',
    file: FILE_CSS,
    what: 'Static paper grain with rare red points over the Chalk page (html[data-mode="lite"] body::after).',
    stage: 'the Chalk render mode, a fixed layer on the whole page',
    params: [
      ['tile', 'public/grain-lite.png at 256 px'],
      ['blend', 'multiply, opacity 0.28'],
      ['z-index', '45', 'under the header (z-50)'],
    ],
  },
];

function ParamTable({ params }: { params: Param[] }) {
  return (
    <table className="mt-4 w-full max-w-3xl border-collapse font-mono text-[14px] leading-snug">
      <tbody>
        {params.map(([name, value, note]) => (
          <tr key={name} className="border-t border-border align-top">
            <th scope="row" className="w-[34%] py-1.5 pr-4 text-left font-normal text-foreground/60">{name}</th>
            <td className="py-1.5 text-foreground/90">
              {value}
              {note && <span className="text-foreground/50"> ({note})</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EffectSection({ entry }: { entry: Entry }) {
  return (
    <section className="border-t border-border pt-10 pb-12" aria-labelledby={`fx-${entry.name}`}>
      <h2 id={`fx-${entry.name}`} className={`${H2_CLASS} !text-2xl md:!text-3xl`}>{entry.name}</h2>
      <p className="clinical-label mt-2 normal-case text-primary-legible">{entry.file}</p>
      <p className={`${BODY_CLASS} mt-3`}>{entry.what}</p>
      <div className="mt-6">
        {entry.demo ?? (
          <p className="clinical-label border border-dashed border-border px-4 py-6 text-foreground/60">
            needs its stage: {entry.stage}
          </p>
        )}
      </div>
      <ParamTable params={entry.params} />
    </section>
  );
}

export default function EffectsOverview() {
  usePageMeta({
    title: 'Textures and effects | Sinaida Krivchenko',
    description: 'Internal reference: every texture and effect on the site, with its source file and parameters.',
  });

  // The static shell carries noindex (prerender-routes.mjs); this keeps the live document consistent.
  useEffect(() => {
    let el = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prev = el?.getAttribute('content') ?? null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    el.setAttribute('content', 'noindex,nofollow');
    return () => {
      if (prev !== null) el!.setAttribute('content', prev);
      else el!.remove();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <main id="main-content" tabIndex={-1} className={PAGE_MAIN_CLASS}>
        <div className={KICKER_CLASS}>Internal reference</div>
        <h1 className={H1_CLASS}>Textures and effects</h1>
        <p className={`${BODY_CLASS} mt-6`}>
          Each effect on its own, with its source file and the numbers that tune it. Entries that need a scroll stage or global state are listed with their parameters only.
        </p>

        <h2 className="clinical-label mt-16 text-foreground/60">Components</h2>
        {COMPONENTS.map((e) => <EffectSection key={e.name} entry={e} />)}

        <h2 className="clinical-label mt-16 text-foreground/60">CSS textures and effects</h2>
        {CSS_ENTRIES.map((e) => <EffectSection key={e.name} entry={e} />)}
      </main>
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal. — Théophile Gautier
