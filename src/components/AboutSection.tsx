import { useRef, useState, useEffect } from 'react';
import DustReveal from '@/components/DustReveal';

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

// ── Photo Block ──────────────────────────────────────────────
function PhotoBlock() {
  const imgRef = useRef<HTMLImageElement>(null);

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
      {/* Image wrapper with CSS corner brackets */}
      <div
        onMouseEnter={handleMouseEnter}
        className="photo-frame-wrapper"
        style={{
          position: 'relative',
          border: '1px solid rgba(255,51,51,0.4)',
          boxShadow: '0 0 0 1px rgba(0,229,255,0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        }}
      >
        <style>{`
          .photo-frame-wrapper::after {
            content: "";
            position: absolute;
            top: -1px; right: -1px;
            width: 18px; height: 18px;
            border-top: 2px solid #00e5ff;
            border-right: 2px solid #00e5ff;
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

        <img
          ref={imgRef}
          src="/sinaida-photo.jpg"
          alt="Sinaida"
          style={{
            width: '100%',
            display: 'block',
            filter: 'contrast(1.08) brightness(0.92) saturate(0.85)',
          }}
        />

        {/* Scanline overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
          }}
        />
      </div>

      {/* Labels */}
      <span className="block font-mono mt-2" style={{ fontSize: 12, color: '#ff3333', opacity: 0.6, letterSpacing: '0.2em' }}>
        SUBJECT_001
      </span>
      <span className="block font-mono mt-1" style={{ fontSize: 12, color: '#00e5ff', opacity: 0.8, letterSpacing: '0.3em' }}>
        SINAIDA
      </span>
      <span className="block font-mono mt-1" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
        VISUAL ARTIST AND DIGITAL STRATEGIST
      </span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function AboutSection() {
  return (
    <section id="about" className="relative z-10 py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <DustReveal>
          <div className="section-divider mb-20" />
        </DustReveal>

        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 items-start">
          {/* Left label */}
          <div className="col-span-12 md:col-span-3 md:pt-2">
            <Reveal delay={0}>
              <span className="clinical-label text-primary">About</span>
              <div className="mt-2 text-xs font-clinical text-muted-foreground">[ BIO ]</div>
            </Reveal>
          </div>

          {/* Right content */}
          <div className="col-span-12 md:col-span-9">
            {/* Heading */}
            <Reveal delay={50}>
              <h2 className="font-display text-2xl md:text-4xl font-light leading-tight mb-10">
                Art, technology, and
                <span className="text-primary font-bold"> human expression</span>
              </h2>
            </Reveal>

            {/* Photo + text row */}
            <div className="flex flex-col md:flex-row items-start gap-12">

              {/* Photo */}
              <Reveal delay={150}>
                <PhotoBlock />
              </Reveal>

              {/* Text blocks */}
              <div className="flex-1 min-w-0">

                {/* Block 1 — terminal header */}
                <Reveal delay={300}>
                  <div className="font-mono mb-7" style={{ fontSize: 12, color: '#00e5ff', opacity: 0.45, letterSpacing: '0.2em' }}>
                    {'> BIO_FILE.load() — SUBJECT: SINAIDA — STATUS: ACTIVE'}
                  </div>
                </Reveal>

                {/* Block 2 — origin data */}
                <Reveal delay={450}>
                  <div className="mb-8" style={{ lineHeight: 2.0 }}>
                    {[
                      ['ORIGIN', 'Biomedical engineering, MSc.'],
                      ['DIVERGENCE', 'Ballet. Corporate IT. Generative systems.'],
                      ['CURRENT STATE', 'AI visual art + creative direction.'],
                    ].map(([key, val]) => (
                      <div key={key} className="font-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
                        <span style={{ display: 'inline-block', minWidth: 148 }}>{key}</span>
                        <span style={{ opacity: 0.35 }}>{'····· '}</span>
                        {val}
                      </div>
                    ))}
                  </div>
                </Reveal>

                {/* Block 3 — body text */}
                <Reveal delay={600}>
                  <div className="font-mono mb-7" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.9 }}>
                    <p className="mb-4">
                      I operate at the threshold where diagnostic precision meets digital organisms — where the analytical tools of science become the aesthetic tools of immersive experience.
                    </p>
                    <p>
                      The work spans stages, exhibitions, and live environments. Real-time visuals built in TouchDesigner. Cinematic worlds rendered through diffusion and post-production. Systems that respond, breathe, and perform.
                    </p>
                  </div>
                </Reveal>

                {/* Block 4 — statement cascade */}
                <Reveal delay={750}>
                  <div className="mb-8" style={{ lineHeight: 2.2 }}>
                    <div className="font-mono" style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
                      The latent space is not a metaphor.
                    </div>
                    <div className="font-mono" style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', paddingLeft: 24 }}>
                      It's a territory.
                    </div>
                  </div>
                </Reveal>

                {/* Block 5 — footer data */}
                <Reveal delay={900}>
                  <div className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em' }}>
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
