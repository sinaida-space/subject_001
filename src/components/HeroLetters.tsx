import { useEffect, useRef, useState } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';
import { heroTunnelBus } from '@/lib/heroTunnelBus';
import { MoleculeNote } from '@/components/MoleculeBreak';
import { useHeroWhisper, WHISPER_QUESTIONS } from '@/components/HeroSection';
import DitherPreview from '@/components/constellation/DitherPreview';
import ProjectDetail from '@/components/constellation/ProjectDetail';
import { PROJECTS, type Project, type ProjectKind } from '@/data/projects';
import type { FocusOrigin } from '@/lib/constellationBus';

// ── Hero trial D, "Descent" ──
// Preview-only, picked with ?hero=d on the home page.
// The name sits high on the site's left grid line (the logo's edge); the
// tagline lands right-aligned in the opposite corner; the empty diagonal
// between them is the void. VISUAL, WORLDS, STAGE and SCREEN each carry one
// project as red dither inside the glyphs; FOR and & stay plain.
// The molecule sits low on the left, the whisper question high on the right.
// Nothing moves on its own: the easter egg (starfield tunnel + whisper)
// runs only while the pointer is on the name, or on a long press on touch.

type Word = { text: string; id?: string; video?: string; breakBefore?: boolean };

// Line breaks keep the short words off the line ends: "for" and "&" open lines.
// On phones WORLDS drops to its own line so the type can stay large.
const TAGLINE: Word[][] = [
  [
    { text: 'Visual', id: 'aether-currents', video: 'fxrrSxvKp9Q' },
    { text: 'Worlds', id: 'conspace-rooms', video: 'oSWzQ4ds8BI', breakBefore: true },
  ],
  [{ text: 'For ' }, { text: 'Stage', id: 'redkie-ptitsy', video: 'bDDAXRlz5FQ' }],
  [{ text: '& ' }, { text: 'Screen', id: 'ethereal-path', video: '15wl2Sko5GA' }],
];

// Same 4x4 Bayer as src/lib/ditherPreview.ts.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const RED: [number, number, number] = [205, 0, 0]; // sinaida red
const DOT = 3; // css px per dither dot
// below 1 the red stays sparse, so the letters read as foreground first
const RED_DENSITY = 0.8;
const LONG_PRESS_MS = 450;
const PREVIEW_SIZE = 520; // the Body of Work square is 440; the hero shows it larger

const projectById = (id?: string) => PROJECTS.find((p) => p.id === id);
// same labels as the case card (ProjectDetail)
const KIND: Record<ProjectKind, string> = {
  stage: 'Stage',
  installation: 'Installation',
  conceptual: 'Conceptual',
  game: 'Interactive',
  tool: 'Tool',
  tutorial: 'Tutorial',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Red-only ordered dither on a transparent ground: the glyph keeps its own
// foreground colour underneath, the project shows as red dots on top of it.
async function ditherRed(src: string, w: number, h: number): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const s = Math.max(w / img.width, h / img.height);
  ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
  const data = ctx.getImageData(0, 0, w, h);
  const p = data.data;
  // auto-levels on the 2nd..98th percentile: posters are mostly dark stage footage
  const lum = new Float32Array(w * h);
  for (let j = 0; j < w * h; j++) lum[j] = (0.299 * p[j * 4] + 0.587 * p[j * 4 + 1] + 0.114 * p[j * 4 + 2]) / 255;
  const sorted = Float32Array.from(lum).sort();
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)] || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x;
      const v = Math.min(1, Math.max(0, (lum[j] - lo) / (hi - lo))) * RED_DENSITY;
      p[j * 4] = RED[0];
      p[j * 4 + 1] = RED[1];
      p[j * 4 + 2] = RED[2];
      p[j * 4 + 3] = v > (BAYER[y % 4][x % 4] + 0.5) / 16 ? 255 : 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL();
}

export default function HeroLetters() {
  const { mode } = useRenderMode();
  const lite = mode !== 'full';
  const taglineRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const [smallHero] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Phones: each block is a full-width rectangle. Its widest line spans
  // exactly margin to margin, so the name and the tagline frame the screen
  // on the same two edges. Desktop keeps the shared clamp() size.
  // Then the project dither is cut at each word's own rendered size.
  useEffect(() => {
    const tagline = taglineRef.current;
    const name = nameRef.current;
    if (!tagline || !name) return;
    let cancelled = false;
    let timer = 0;
    const fit = () => {
      for (const block of [name, tagline]) {
        block.style.fontSize = '';
        if (window.innerWidth >= 768) continue;
        block.style.fontSize = '100px';
        const lines = [...block.querySelectorAll<HTMLElement>('.hl-line')];
        const widest = Math.max(
          ...lines.map((el) => {
            el.style.display = 'inline-block';
            const w = el.getBoundingClientRect().width;
            el.style.display = '';
            return w;
          }),
        );
        // the blocks shrink-wrap (self-start / self-end), so measure the column
        const col = block.parentElement as HTMLElement;
        const cs = getComputedStyle(col);
        const measure = col.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        block.style.fontSize = `${(100 * measure) / widest}px`;
      }
    };
    const paint = async () => {
      fit();
      const words = [...tagline.querySelectorAll<HTMLElement>('[data-video]')];
      const urls = await Promise.all(
        words.map((el) =>
          ditherRed(
            `/video-posters/${el.dataset.video}.jpg`,
            Math.max(8, Math.round(el.offsetWidth / DOT)),
            Math.max(8, Math.round(el.offsetHeight / DOT)),
          ),
        ),
      );
      if (cancelled) return;
      words.forEach((el, i) => {
        el.style.backgroundImage = `url(${urls[i]})`;
      });
      // the horizon gate re-samples the glyphs with their dither
      window.dispatchEvent(new Event('hero-dither'));
    };
    document.fonts.ready.then(() => {
      if (!cancelled) paint();
    });
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Easter egg, same contract as HeroSection: hover on desktop, long press on touch.
  const canHover = () =>
    !lite && typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (min-width: 1024px)').matches;
  const [glowing, setGlowing] = useState(false);
  const enterTunnel = () => {
    if (canHover()) {
      heroTunnelBus.setActive(true);
      setGlowing(true);
    }
  };
  const stopTunnel = () => {
    heroTunnelBus.setActive(false);
    setGlowing(false);
  };
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const clearPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };
  const holdTunnel = (e: React.TouchEvent) => {
    if (lite || canHover() || e.touches.length !== 1) return;
    clearPress();
    const t = e.touches[0];
    pressRef.current = {
      x: t.clientX,
      y: t.clientY,
      timer: window.setTimeout(() => {
        heroTunnelBus.setActive(true);
        setGlowing(true);
      }, LONG_PRESS_MS),
    };
  };
  const moveTunnel = (e: React.TouchEvent) => {
    const p = pressRef.current;
    if (!p || glowing) return;
    const t = e.touches[0];
    if (!t || Math.hypot(t.clientX - p.x, t.clientY - p.y) > 10) clearPress();
  };
  const releaseTunnel = () => {
    clearPress();
    if (glowing) stopTunnel();
  };
  // leaving the tab or the window always ends the easter egg
  useEffect(() => {
    const off = () => {
      clearPress();
      heroTunnelBus.setActive(false);
      setGlowing(false);
    };
    const onVis = () => {
      if (document.hidden) off();
    };
    window.addEventListener('blur', off);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      off();
      window.removeEventListener('blur', off);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const whisper = useHeroWhisper(glowing, WHISPER_QUESTIONS);
  // the molecule flares as each question arrives
  const [flare, setFlare] = useState(0);
  const prevWhisper = useRef({ glowing: false, visible: false });
  useEffect(() => {
    const prev = prevWhisper.current;
    if ((glowing && !prev.glowing) || (glowing && prev.visible && !whisper.visible)) setFlare((k) => k + 1);
    prevWhisper.current = { glowing, visible: whisper.visible };
  }, [glowing, whisper.visible]);

  // Hover a project word: the dithered square from Body of Work trails the
  // cursor, larger, with the project named under it. Click or tap: the
  // constellation's case card opens out of the word.
  const [preview, setPreview] = useState<{ project: Project; x: number; y: number; instant: boolean } | null>(null);
  const [open, setOpen] = useState<{ project: Project; origin?: FocusOrigin } | null>(null);
  const showPreview = (id: string | undefined, x: number, y: number, instant = false) => {
    const project = projectById(id);
    if (project?.image && canHover()) setPreview({ project, x, y, instant });
  };
  const openCard = (id: string | undefined, el: HTMLElement) => {
    const project = projectById(id);
    if (!project) return;
    setPreview(null);
    const r = el.getBoundingClientRect();
    setOpen({ project, origin: lite ? undefined : { left: r.left, top: r.top, width: r.width, height: r.height, el } });
  };

  const type = 'm-0 font-display uppercase font-normal leading-[0.86] tracking-[-0.02em] text-[13vw] md:text-[clamp(2.5rem,min(10.4vw,13.5svh),11.5rem)]';

  return (
    <section
      className="relative z-10 h-[100svh] select-none [-webkit-touch-callout:none]"
      onTouchStart={holdTunnel}
      onTouchMove={moveTunnel}
      onTouchEnd={releaseTunnel}
      onTouchCancel={releaseTunnel}
    >
      {/* One vertical rule: the gap under the header equals the gap under the
          tagline (G), and the molecule sits at the centre of the void between. */}
      <div className="container mx-auto max-w-7xl px-6 h-full flex flex-col pt-[calc(64px+max(9vh,88px))] pb-[max(9vh,88px)] md:pt-[calc(68px+max(3vh,28px))] md:pb-[max(4vh,36px)]">
        <p
          ref={nameRef}
          className={`${type} self-start text-foreground cursor-none ${glowing ? 'neon-glow' : ''}`}
          onMouseEnter={enterTunnel}
          onMouseLeave={stopTunnel}
        >
          <span className="hl-line block">Sinaida</span>
          <span className="hl-line block">Krivchenko</span>
        </p>

        {/* The void. Desktop: the molecule at the centre, the whisper question
            on the right edge, both centred in the void's height, so neither
            can touch the type. Phones: the molecule at the centre, the
            question under it. */}
        <div className="relative flex-1 min-h-0 flex items-center max-md:flex-col max-md:justify-center max-md:gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:py-4">
          <div className="max-md:opacity-50 md:col-start-2">
            <MoleculeNote id="noradrenaline" width={smallHero ? 150 : 220} height={smallHero ? 60 : 90} pulse={flare} />
          </div>
          <p
            aria-hidden="true"
            className={`pointer-events-none m-0 max-w-[22ch] md:justify-self-end text-right max-md:text-center font-display uppercase tracking-tight leading-[1.1] text-[clamp(1rem,min(2vw,3.2svh),1.875rem)] hero-whisper hero-whisper-text ${whisper.visible ? 'hero-whisper-visible' : ''}`}
          >
            {whisper.text}
          </p>
        </div>

        <h1 ref={taglineRef} className={`${type} self-end text-right text-foreground`}>
          <span>
            {TAGLINE.map((line, i) => (
              <span key={i} className="hl-line block whitespace-nowrap">
                {line.map((w, j) => (
                  <span key={j}>
                    {w.breakBefore && (
                      <>
                        <span className="hidden md:inline"> </span>
                        <br className="md:hidden" />
                      </>
                    )}
                    {w.video ? (
                      <button
                        type="button"
                        className="hl-word"
                        data-video={w.video}
                        aria-label={`${w.text}: ${projectById(w.id)?.title ?? ''}, open the case card`}
                        onMouseEnter={(e) => showPreview(w.id, e.clientX, e.clientY)}
                        onMouseMove={(e) => showPreview(w.id, e.clientX, e.clientY)}
                        onMouseLeave={() => setPreview(null)}
                        onFocus={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          showPreview(w.id, r.left, r.top, true);
                        }}
                        onBlur={() => setPreview(null)}
                        onClick={(e) => openCard(w.id, e.currentTarget)}
                      >
                        {w.text}
                      </button>
                    ) : (
                      w.text
                    )}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </h1>

      </div>

      {preview && (
        <DitherPreview
          src={preview.project.image ?? null}
          x={preview.x}
          y={preview.y}
          visible
          instant={preview.instant}
          size={PREVIEW_SIZE}
          caption={
            <p className="m-0 flex items-baseline justify-between gap-4 font-display uppercase tracking-[0.06em] text-[14px]">
              <span className="text-foreground">{preview.project.title}</span>
              <span className="text-primary">{KIND[preview.project.kind]}</span>
            </p>
          }
        />
      )}
      {open && <ProjectDetail project={open.project} onClose={() => setOpen(null)} origin={open.origin} />}
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
