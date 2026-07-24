import { useEffect, useState } from 'react';
import ObfuscatedMailto from './ObfuscatedMailto';

// ── Signal Bars ─────────────────────────────────────────────
function SignalBars() {
  const [active, setActive] = useState(5);
  useEffect(() => {
    const iv = setInterval(() => {
      setActive(Math.floor(Math.random() * 3) + 3); // 3-5
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const bars = [1, 2, 3, 4, 5];
  const heights = [6, 10, 14, 18, 22];
  return (
    <div className="flex items-end gap-[3px] mt-6">
      {bars.map((b, i) => (
        <div
          key={b}
          className="transition-opacity duration-200"
          style={{
            width: 4,
            height: heights[i],
            borderRadius: 1,
            background: b <= active ? 'hsl(var(--accent))' : 'hsl(var(--accent))',
            opacity: b <= active ? 1 : 0.15,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
// Static copy — renders instantly, no typing/reveal gating (same rule applied
// to ServicesTerminal/HeroSection in Task 4): this section's content must not
// be gated behind a character-by-character reveal.
const PARA_1 =
  'Particularly interested in working with musicians, touring productions, cultural foundations, and forward-thinking brands exploring the intersection of technology and live performance. If your project lives in the space between engineering and emotion, let\'s talk.';
const PARA_2 =
  'Immersive installations  ·  Creative direction\nStage visuals  ·  Exhibition design\nGenerative art commissions\n──────────────────────────\nBased in Prague. Working globally.';

export default function ContactChannel() {
  return (
    <section id="contact" className="relative z-10 py-24 overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:w-[280px] shrink-0 md:self-start">
            <div
              className="font-mono uppercase text-primary"
              style={{ letterSpacing: '0.2em', fontSize: 32 }}
            >
              Contact
            </div>
            <div className="font-mono uppercase mt-2" style={{ color: 'hsl(var(--foreground) / 0.65)', fontSize: 16 }}>
              Get in touch.
            </div>

            <SignalBars />
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1">

          <div className="max-w-2xl">
            {/* Heading */}
            <h2 className="mb-8 uppercase">
              <span className="block text-foreground font-light" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
                Open for
              </span>
              <span className="block font-bold" style={{ fontSize: 'clamp(32px, 4vw, 52px)', color: '#ff3333' }}>
                Collaboration
              </span>
            </h2>

            <p className="font-mono text-[13px] leading-relaxed mb-6" style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
              {(() => {
                const idx = PARA_1.indexOf("let's talk.");
                if (idx === -1) return PARA_1;
                return (
                  <>
                    {PARA_1.slice(0, idx)}
                    <span style={{ color: '#ff3333', fontWeight: 700 }}>{PARA_1.slice(idx)}</span>
                  </>
                );
              })()}
            </p>

            {/* Available for */}
            <div className="font-mono text-[12px] uppercase mb-3" style={{ color: 'hsl(var(--foreground) / 0.6)', letterSpacing: '0.1em' }}>
              Available for
            </div>

            <div className="font-mono text-[13px] leading-relaxed mb-8 whitespace-pre-line" style={{ color: 'hsl(var(--foreground) / 0.87)' }}>
              {PARA_2.split('·').map((seg, i, arr) => (
                <span key={i}>
                  {seg}
                  {i < arr.length - 1 && <span style={{ color: '#ff3333' }}>·</span>}
                </span>
              ))}
            </div>

            {/* CTA — one bold action, two plain links (not competing for attention) */}
            <div className="flex flex-wrap items-center gap-6 mt-10 mb-12">
              <ObfuscatedMailto
                label="EMAIL ME ↗"
                className="font-mono text-[12px] uppercase tracking-[0.15em] px-6 py-3 transition-all duration-300 cursor-pointer select-none"
                style={{
                  border: '1px solid #ff3333',
                  color: '#ff3333',
                  background: 'rgba(255,51,51,0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ff3333';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,51,51,0.06)';
                  e.currentTarget.style.color = '#ff3333';
                }}
              />
              <a
                href="https://www.instagram.com/sin.ai.da/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible"
              >
                Instagram ↗
              </a>
              <a
                href="https://www.linkedin.com/in/sinaida"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[13px] text-foreground/60 transition-colors hover:text-primary-legible"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
