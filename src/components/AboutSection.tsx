import { useRef, useState, useEffect } from 'react';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';


// ── Stagger fade-in helper ───────────────────────────────────
function Reveal({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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


// The bio rows. In full mode the horizon gate builds
// them out of falling dither, so they render as plain settled text and only
// fade in with the rest of the column.
const BIO_ROWS = [
  ['ORIGIN', 'Biomedical engineering, MSc., Bauman Moscow State Technical University'],
  ['DRIFT', 'Ballet. General Electric IT Leadership Program. Generative systems.'],
  ['FOCUS', 'Real-time visual worlds driven by body tracking and sound.'],
];

function BioRows() {
  return (
    <Reveal delay={200}>
      <div>
        {BIO_ROWS.map(([key, val]) => (
          <div
            key={key}
            className="font-mono bio-row bio-row--ruled"
            style={{
              display: 'grid',
              gap: '0 4px',
              fontSize: 20,
              color: 'hsl(var(--foreground) / 0.6)',
              letterSpacing: '0.08em',
              padding: '14px 0',
              borderTop: '1px solid hsl(var(--foreground) / 0.12)',
            }}
          >
            <span style={{ color: 'hsl(var(--foreground) / 0.75)' }}>{key}</span>
            <span />
            <span>{val}</span>
          </div>
        ))}
        <div aria-hidden style={{ borderTop: '1px solid hsl(var(--foreground) / 0.12)' }} />
      </div>
    </Reveal>
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
        className="photo-frame-wrapper"
        style={{
          width: 200,
          position: 'relative',
          border: '1px solid hsl(var(--sinaida-red) / 0.4)',
          boxShadow: '0 0 0 1px hsl(var(--accent) / 0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
          {/* Was a single 2000x2000 / 3.26 MB JPEG rendering at ~258 CSS px.
              Now three widths in AVIF and WebP with JPEG fallbacks; the browser picks by
              viewport and pixel density. Same crop, ~99% less transferred. */}
          <picture>
            <source
              type="image/avif"
              srcSet="/sinaida-photo-600.avif 600w, /sinaida-photo-900.avif 900w, /sinaida-photo-1200.avif 1200w"
              sizes="200px"
            />
            <source
              type="image/webp"
              srcSet="/sinaida-photo-600.webp 600w, /sinaida-photo-900.webp 900w, /sinaida-photo-1200.webp 1200w"
              sizes="200px"
            />
            <img
              ref={imgRef}
              src="/sinaida-photo-600.jpg"
              srcSet="/sinaida-photo-600.jpg 600w, /sinaida-photo-900.jpg 900w, /sinaida-photo-1200.jpg 1200w"
              sizes="200px"
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
      <span className="block font-mono mt-2" style={{ fontSize: 20, color: 'hsl(var(--accent))', opacity: 0.8, letterSpacing: '0.3em' }}>
        SINAIDA
        <span style={{ fontSize: 12, color: 'hsl(var(--foreground) / 0.4)', letterSpacing: '0.04em', marginLeft: 8 }}>(she/her)</span>
      </span>
      <span className="block font-mono mt-1" style={{ fontSize: 20, color: 'hsl(var(--foreground) / 0.6)', letterSpacing: '0.1em' }}>
        NEW MEDIA ARTIST
      </span>
      <span className="block font-mono mt-4" style={{ fontSize: 11, color: 'hsl(var(--foreground) / 0.32)', letterSpacing: '0.02em' }}>
        Photo: Roland Gaedtgens · Zhembrovskyy
      </span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
// Why, how, what, top to bottom on the right: the belief, the facts behind
// the method, then the work itself. Name and a small portrait sit under the
// label on the left.

// h2/p (not div) — matches Services' and Body of Work's own eyebrow+caption
// markup, so all four sections' labels pick up the same sitewide hover
// glitch/bloom (index.css) instead of some getting it and others silently not.
function Eyebrow() {
  return (
    <Reveal delay={0}>
      <h2 className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 40 }}>
        About
      </h2>
      <p className="font-mono uppercase mt-2" style={{ color: 'hsl(var(--foreground) / 0.65)', fontSize: 20 }}>
        The story so far.
      </p>
    </Reveal>
  );
}

export default function AboutSection() {
  return (
    <section id="about" className="relative z-10 py-16 md:py-20">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-10 md:gap-12">
          <div className="md:w-[280px] shrink-0">
            <Eyebrow />
            <Reveal delay={150}>
              <div className="mt-10">
                <PhotoBlock />
              </div>
            </Reveal>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-14">
            <div>
              <Reveal delay={50}>
                {/* Same scale as the Contact heading and a case study's project
                    title (WorkCase h1) — one shared "section headline" size
                    sitewide, a step below the hero. */}
                <h2 className="font-display text-4xl md:text-5xl uppercase font-light leading-[0.95] mb-8">
                  Human first. Digital second.
                </h2>
              </Reveal>
              <Reveal delay={150}>
                <p className="font-mono max-w-[48ch]" style={{ fontSize: 'clamp(1.25rem, 1.6vw, 1.5rem)', lineHeight: 1.6, color: 'hsl(var(--foreground) / 0.82)' }}>
                  I believe that technology is only meaningful when it helps people feel seen, heard, and connected.
                </p>
              </Reveal>
            </div>
            <BioRows />
            <Reveal delay={100}>
              <p className="font-mono max-w-[52ch]" style={{ fontSize: 20, color: 'hsl(var(--foreground) / 0.82)', lineHeight: 1.85 }}>
                I build living visual systems for stages, concerts, and performance spaces. They breathe with sound, respond to bodies, and turn light, image, and generative code into a shared atmosphere.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
