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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
          }}
        />
      </div>
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
    <section id="about" className="relative z-10 py-24">
      <div className="container mx-auto px-6 max-w-7xl">
        <DustReveal>
          <div className="section-divider mb-16" />
        </DustReveal>
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <Reveal delay={0}>
              <div className="font-mono uppercase text-primary" style={{ letterSpacing: '0.2em', fontSize: 12 }}>
                About
              </div>
              <div className="font-mono mt-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                [ BIO ]
              </div>
            </Reveal>
          </div>
          <div className="flex-1">
            <Reveal delay={50}>
              <h2 className="font-display text-2xl md:text-4xl font-light leading-tight mb-10">
                Art, technology, and
                <span className="text-primary font-bold"> human expression</span>
              </h2>
            </Reveal>
            <div className="flex flex-col md:flex-row items-start gap-12">
              <Reveal delay={150}>
                <PhotoBlock />
              </Reveal>
              <div className="flex-1 min-w-0">
                <Reveal delay={300}>
                  <div className="font-mono mb-7" style={{ fontSize: 12, color: '#00e5ff', opacity: 0.45, letterSpacing: '0.2em' }}>
                    {'> BIO_FILE.load() — SUBJECT: SINAIDA — STATUS: ACTIVE'}
                  </div>
                </Reveal>
                <Reveal delay={450}>
                  <div className="mb-8">
                    {[
                      ['ORIGIN', 'Biomedical engineering, MSc., Bauman Moscow State Technical University'],
                      ['DIVERGENCE', 'Ballet. General Electric IT Leadership Program. Generative systems.'],
                      ['CURRENT STATE', 'AI visual art + creative direction.'],
                    ].map(([key, val]) => (
                      <div key={key} className="font-mono" style={{ display: 'grid', gridTemplateColumns: '140px 20px 1fr', gap: '0 4px', marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{key}</span>
                        <span style={{ opacity: 0.35, textAlign: 'center' }}>·····</span>
                        <span>{val}</span>
                      </div>
                    ))}
                  </div>
                </Reveal>
                <Reveal delay={600}>
                  <div className="font-mono mb-7" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.9 }}>
                    <p>
                      I believe that technology is only meaningful when it helps people feel seen, heard, and connected.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={700}>
                  <div className="mb-7" style={{ lineHeight: 2.2 }}>
                    <div className="font-mono" style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
                      Human first.
                    </div>
                    <div className="font-mono" style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', paddingLeft: 24 }}>
                      Digital second.
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={800}>
                  <div className="font-mono mb-7" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.9 }}>
                    <p>
                      I create visual worlds designed to be experienced in physical spaces. I help arts organisations build the visual identity, digital infrastructure, and audience strategy that makes their work visible and financially sustainable.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={900}>
                  <div className="flex flex-wrap gap-4 mt-10 mb-10">
                    <a
                      href="mailto:gallant_mod5v@icloud.com"
                      className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                      style={{ border: '1px solid #ff3333', color: '#ff3333', background: 'rgba(255,51,51,0.06)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#ff3333'; e.currentTarget.style.color = '#000'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,51,51,0.06)'; e.currentTarget.style.color = '#ff3333'; }}
                    >
                      EMAIL ME ↗
                    </a>
                    <a
                      href="https://www.instagram.com/sin.ai.da/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                      style={{ border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.borderColor = '#00e5ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; }}
                    >
                      FOLLOW ON INSTAGRAM ↗
                    </a>
                    <a
                      href="https://www.linkedin.com/in/sinaida"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                      style={{ border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.borderColor = '#00e5ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; }}
                    >
                      CONNECT ON LINKEDIN ↗
                    </a>
                  </div>
                </Reveal>
                <Reveal delay={1000}>
                  <div className="font-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em' }}>
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
