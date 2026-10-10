import { useRef, useState, useEffect } from 'react';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import { useRenderMode } from '@/hooks/useRenderMode';
import StarTitle, { LiteTitle } from '@/components/StarTitle';


// ── Stagger fade-in helper (lite mode; in full mode QuoteGate pours About) ──
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(REDUCED);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const NB = ' ';

// Label and fact at one size: a ruled table, no numbers, no small kickers.
// Each rule is its own element so QuoteGate can hand its red thread over to it.
const BIO_ROWS = [
  ['Origin', `Biomedical engineering, MSc., Bauman Moscow State Technical${NB}University`],
  ['Drift', `Ballet. General${NB}Electric IT Leadership Program. Generative${NB}systems.`],
  ['Focus', `Real-time visual worlds driven by${NB}body tracking and${NB}sound.`],
  ['Current location', `Prague. Working${NB}globally.`],
];

const RULE = 'pointer-events-none absolute inset-x-0 h-px bg-foreground/15';

function BioRows() {
  return (
    // data-work-source: WorkBuild pours BODY OF WORK out of this table
    <div className="relative" data-work-source>
      {BIO_ROWS.map(([key, val]) => (
        <div
          key={key}
          className="relative grid grid-cols-1 gap-1 py-4 md:grid-cols-[minmax(8rem,1fr)_3fr] md:gap-6 md:py-5 font-mono text-[19px] md:text-[clamp(20px,1.9vw,28px)] leading-[1.3]"
        >
          <div data-rule aria-hidden className={`${RULE} top-0`} />
          <span className="uppercase text-foreground/60">{key}</span>
          <span className="text-foreground">{val}</span>
        </div>
      ))}
      <div data-rule aria-hidden className={`${RULE} bottom-0`} />
    </div>
  );
}

// ── Photo Block ──────────────────────────────────────────────
function PhotoBlock() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleMouseEnter = () => {
    const img = imgRef.current;
    if (!img) return;
    img.style.filter = 'contrast(1.08) brightness(0.92) saturate(0.85) hue-rotate(15deg) contrast(1.2)';
    setTimeout(() => {
      if (img) img.style.transform = 'translateX(-2px)';
    }, 120);
    setTimeout(() => {
      if (img) {
        img.style.filter = 'contrast(1.08) brightness(0.92) saturate(0.85)';
        img.style.transform = 'translateX(0)';
      }
    }, 200);
  };

  return (
    <div>
      <div
        onMouseEnter={handleMouseEnter}
        className="photo-frame-wrapper w-[44vw] max-w-[240px] md:w-full"
        style={{
          position: 'relative',
          border: '1px solid hsl(var(--sinaida-red) / 0.4)',
          boxShadow: '0 0 0 1px hsl(var(--accent) / 0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
          {/* Three widths in AVIF and WebP with JPEG fallbacks; the browser
              picks by viewport and pixel density. */}
          <picture>
            <source
              type="image/avif"
              srcSet="/sinaida-photo-600.avif 600w, /sinaida-photo-900.avif 900w, /sinaida-photo-1200.avif 1200w"
              sizes="240px"
            />
            <source
              type="image/webp"
              srcSet="/sinaida-photo-600.webp 600w, /sinaida-photo-900.webp 900w, /sinaida-photo-1200.webp 1200w"
              sizes="240px"
            />
            <img
              ref={imgRef}
              src="/sinaida-photo-600.jpg"
              srcSet="/sinaida-photo-600.jpg 600w, /sinaida-photo-900.jpg 900w, /sinaida-photo-1200.jpg 1200w"
              sizes="240px"
              alt="Sinaida Krivchenko"
              width={600}
              height={600}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                filter: 'contrast(1.08) brightness(0.92) saturate(0.85)',
              }}
            />
          </picture>
          <HeartbeatPlaceholder
            loaded={imgLoaded}
            width="100%"
            height="100%"
            className="absolute inset-0"
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
          }}
        />
      </div>
      <p className="font-mono mt-3 m-0" style={{ fontSize: 11, color: 'hsl(var(--foreground) / 0.14)', letterSpacing: '0.02em' }}>
        Photo: Roland Gaedtgens · Zhembrovskyy
      </p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
// The belief has its own screen before this one (QuoteStage). Here: the
// headline at the hero's scale, the portrait small in its negative space,
// the facts as a ruled table aligned with the headline.
//
// h2/p (not div) for the eyebrow: matches Services' and Contact's markup, so
// the labels share the sitewide hover glitch (index.css).
// Full mode: the name is a word of stars (StarTitle); the star assembly is
// its own reveal, so no fade wrapper (its transform would lift the canvas
// over the headline below).
function Eyebrow({ full }: { full: boolean }) {
  const caption = (
    <p className="font-mono uppercase mt-2 text-[16px] md:text-[20px]" style={{ color: 'hsl(var(--foreground) / 0.65)' }}>
      The story so far.
    </p>
  );
  if (full) return <StarTitle text="About" caption={caption} />;
  // the shared lite header; the fade is About's own lite entrance
  return (
    <Reveal delay={0}>
      <LiteTitle text="About" caption={caption} />
    </Reveal>
  );
}

export default function AboutSection() {
  // md+: the portrait sticks in its column (full: QuoteGate develops it there
  // while only the text moves); the column stretches over both rows.
  // Lite: eyebrow and photo come up first (the photo before the headline on
  // phones too), then the headline and the table scroll past the photo.
  const full = useRenderMode().mode === 'full';
  return (
    <section id="about" className="relative z-10 py-16 md:py-24">
      <div className="site-frame">
        <Eyebrow full={full} />
        <div className="mt-10 md:mt-16 grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-x-6 md:gap-y-16">
          <h3 className={`m-0 font-display uppercase font-normal text-foreground leading-[0.92] tracking-[-0.01em] text-[11.2vw] md:col-start-4 md:col-span-9 md:row-start-1 md:text-[clamp(3rem,7.2vw,7rem)]${full ? '' : ' md:mt-[24svh]'}`}>
            {`Human first. Digital${NB}second.`}
          </h3>
          <div data-photo-col className={`md:col-span-3 md:row-start-1 md:row-span-2 md:max-w-[240px] md:self-stretch${full ? '' : ' order-first md:order-none'}`}>
            <div className="md:sticky md:top-24">
              <Reveal delay={150}>
                <PhotoBlock />
              </Reveal>
            </div>
          </div>
          <div className="md:col-start-4 md:col-span-9 md:row-start-2">
            <Reveal delay={100}>
              <BioRows />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
