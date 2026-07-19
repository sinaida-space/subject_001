import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';
import XrayHeading from '@/components/XrayHeading';
import { nbsp } from '@/lib/typo';

const DustReveal = lazy(() => import('@/components/DustReveal'));

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

function BioSignalLock() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const rows = [
    ['ORIGIN', 'Biomedical engineering, MSc., Bauman Moscow State Technical University'],
    ['DIVERGENCE', 'Ballet. General Electric IT Leadership Program. Generative systems.'],
    ['CURRENT STATE', 'TouchDesigner visuals + audio-reactive stage systems.'],
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mb-8"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div className="space-y-4">
        {rows.map(([key, val]) => (
          <div
            key={key}
            className="font-mono"
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 1fr',
              gap: '0 16px',
              fontSize: 13.5,
              letterSpacing: '0.06em',
            }}
          >
            <span style={{ color: 'hsl(var(--foreground) / 0.8)' }}>{key}</span>
            <span style={{ color: 'hsl(var(--foreground) / 0.7)', lineHeight: 1.6 }}>{nbsp(val)}</span>
          </div>
        ))}
      </div>
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
    <div style={{ width: 260, flexShrink: 0 }} className="mx-auto md:mx-0">
      <div
        onMouseEnter={handleMouseEnter}
        className="photo-frame-wrapper"
        style={{
          position: 'relative',
          border: '1px solid rgba(255,51,51,0.4)',
          boxShadow: '0 0 0 1px hsl(var(--accent) / 0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        <style>{`
          .photo-frame-wrapper::after {
            content: "";
            position: absolute;
            top: -1px; right: -1px;
            width: 18px; height: 18px;
            border-top: 2px solid hsl(var(--accent));
            border-right: 2px solid hsl(var(--accent));
            pointer-events: none;
            z-index: 2;
          }
          .photo-frame-wrapper::before {
            content: "";
            position: absolute;
            bottom: -1px; left: -1px;
            width: 18px; height: 18px;
            border-bottom: 2px solid #ff3333;
            border-left: 2px solid #ff3333;
            pointer-events: none;
            z-index: 2;
          }
        `}</style>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
          <img
            ref={imgRef}
            src="/sinaida-photo.jpg"
            alt="Sinaida"
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
      <span className="block font-mono mt-3" style={{ fontSize: 13, color: 'hsl(var(--foreground) / 0.7)', letterSpacing: '0.06em' }}>
        Sinaida Krivchenko
      </span>
      <span className="block font-mono mt-1" style={{ fontSize: 11, color: 'hsl(var(--foreground) / 0.5)', letterSpacing: '0.06em' }}>
        Photo: Roland Gaedtgens
      </span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function AboutSection() {
  return (
    <section id="about" className="relative z-10 py-24">
      <div className="container mx-auto px-6 max-w-7xl">
        <Suspense fallback={<div className="section-divider mb-16" />}>
          <DustReveal>
            <div className="section-divider mb-16" />
          </DustReveal>
        </Suspense>
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <Reveal delay={0}>
              <XrayHeading as="div" className="text-2xl md:text-3xl font-semibold tracking-tight text-primary-legible">
                About
              </XrayHeading>
              <p className="font-mono mt-3 text-[15px] text-foreground/60">
                {nbsp('The story so far.')}
              </p>
            </Reveal>
          </div>
          <div className="flex-1">
            <Reveal delay={50}>
              <h2 className="font-display text-2xl md:text-4xl font-semibold leading-tight mb-10">
                Art, technology, and
                <span className="text-primary font-bold"> human expression</span>
              </h2>
            </Reveal>
            <div className="flex flex-col md:flex-row items-start gap-12">
              <Reveal delay={150}>
                <PhotoBlock />
              </Reveal>
              <div className="flex-1 min-w-0 max-w-[62ch]">
                <BioSignalLock />
                <Reveal delay={600}>
                  <div className="font-mono mb-7" style={{ fontSize: 19, color: 'hsl(var(--foreground) / 0.92)', lineHeight: 1.7 }}>
                    <p>
                      {nbsp('I believe that technology is only meaningful when it helps people feel seen, heard, and connected.')}
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={700}>
                  <div className="mb-7" style={{ lineHeight: 2.2 }}>
                    <div className="font-mono" style={{ fontSize: 15, color: 'hsl(var(--foreground) / 0.9)' }}>
                      {nbsp('Human first.')}
                    </div>
                    <div className="font-mono" style={{ fontSize: 15, color: 'hsl(var(--foreground) / 0.65)', paddingLeft: 24 }}>
                      {nbsp('Digital second.')}
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={800}>
                  <div className="font-mono mb-7" style={{ fontSize: 15, color: 'hsl(var(--foreground) / 0.82)', lineHeight: 1.85 }}>
                    <p>
                      {nbsp('I build living visual systems for stages, concerts, and performance spaces. They breathe with sound, respond to bodies, and turn light, image, and generative code into a shared atmosphere.')}
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
