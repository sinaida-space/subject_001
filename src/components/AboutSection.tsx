import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';

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

function scrambleText(text: string, amount: number) {
  const chars = '░▒▓█/\\_';
  return text
    .split('')
    .map((char) => {
      if (char === ' ' || char === '.' || char === ',') return char;
      return Math.random() < amount ? chars[Math.floor(Math.random() * chars.length)] : char;
    })
    .join('');
}

function BioSignalLock() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(false);

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

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      if (frame > 12) {
        clearInterval(interval);
        setLocked(true);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden mb-8"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <style>{`
        @keyframes bio-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          18% { opacity: 0.8; }
          100% { transform: translateY(360%); opacity: 0; }
        }
        @keyframes bio-lock-pulse {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.75; }
        }
      `}</style>
      {!locked && (
        <div
          className="absolute left-0 right-0 h-10 pointer-events-none"
          style={{
            top: 0,
            background: 'linear-gradient(to bottom, transparent, hsl(var(--accent) / 0.22), transparent)',
            animation: 'bio-scan 0.8s linear infinite',
          }}
        />
      )}
      <div className="space-y-3">
        {rows.map(([key, val], index) => {
          const amount = locked ? 0 : Math.max(0.08, 0.38 - index * 0.08);
          return (
            <div
              key={key}
              className="font-mono"
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 20px 1fr',
                gap: '0 4px',
                fontSize: 16,
                color: 'hsl(var(--foreground) / 0.6)',
                letterSpacing: '0.08em',
                transition: 'color 0.35s ease',
              }}
            >
              <span style={{ color: locked ? 'hsl(var(--foreground) / 0.75)' : '#ff3333', animation: locked ? 'none' : 'bio-lock-pulse 0.45s ease-in-out infinite' }}>
                {locked ? key : scrambleText(key, amount)}
              </span>
              <span style={{ opacity: 0.35, textAlign: 'center' }}>·····</span>
              <span>{locked ? val : scrambleText(val, amount)}</span>
            </div>
          );
        })}
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
      <span className="block font-mono mt-2" style={{ fontSize: 16, color: 'hsl(var(--accent))', opacity: 0.8, letterSpacing: '0.3em' }}>
        SINAIDA
      </span>
      <span className="block font-mono mt-1" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.6)', letterSpacing: '0.1em' }}>
        NEW MEDIA ARTIST
      </span>
      <span className="block font-mono mt-3" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.55)', letterSpacing: '0.02em' }}>
        Photo by Roland Gaedtgens from Zhembrovskyy performance
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
          <div className="md:w-[280px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <Reveal delay={0}>
              <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 32 }}>
                About
              </div>
              <div className="font-mono uppercase mt-2" style={{ color: 'hsl(var(--foreground) / 0.65)', fontSize: 16 }}>
                The story so far.
              </div>
            </Reveal>
          </div>
          <div className="flex-1">
            <Reveal delay={50}>
              <h2 className="font-display text-5xl md:text-7xl uppercase font-light leading-tight mb-10">
                Art, technology, and
                <span className="text-primary font-bold"> human expression</span>
              </h2>
            </Reveal>
            <div className="flex flex-col md:flex-row items-start gap-12">
              <Reveal delay={150}>
                <PhotoBlock />
              </Reveal>
              <div className="flex-1 min-w-0">
                <BioSignalLock />
                <Reveal delay={600}>
                  <div className="font-mono mb-7" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.82)', lineHeight: 1.85 }}>
                    <p>
                      I believe that technology is only meaningful when it helps people feel seen, heard, and connected.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={700}>
                  <div className="mb-7" style={{ lineHeight: 2.2 }}>
                    <div className="font-mono" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.9)' }}>
                      Human first.
                    </div>
                    <div className="font-mono" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.65)', paddingLeft: 24 }}>
                      Digital second.
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={800}>
                  <div className="font-mono mb-7" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.82)', lineHeight: 1.85 }}>
                    <p>
                      I build living visual systems for stages, concerts, and performance spaces. They breathe with sound, respond to bodies, and turn light, image, and generative code into a shared atmosphere.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={900}>
                  <div className="font-mono" style={{ fontSize: 16, color: 'hsl(var(--foreground) / 0.5)', letterSpacing: '0.15em' }}>
                    {'LOCATION: Prague'}
                    <span style={{ color: '#ff3333' }}> · </span>
                    {'REACH: Global'}
                    <span style={{ color: '#ff3333' }}> · </span>
                    {'AVAILABLE: Projects between engineering and emotion'}
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
