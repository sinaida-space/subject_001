import { useState } from 'react';
import Logo from './Logo';
import SnakeEasterEgg from './SnakeEasterEgg';

export default function Footer() {
  const [snakeOpen, setSnakeOpen] = useState(false);

  return (
    <footer className="relative z-10 border-t border-border py-16 md:py-20">
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <div onClick={() => setSnakeOpen(true)} title="..." style={{ cursor: 'pointer', display: 'inline-block' }}>
              <Logo />
            </div>
            <p className="mt-5 max-w-xs font-mono text-[13px] leading-relaxed text-white/55">
              Sinaida Krivchenko<br />Digital artist · Live visuals · Immersive systems
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            <div>
              <div className="clinical-label mb-5 text-primary">Navigate</div>
              <div className="space-y-3.5">
                {[
                  { label: 'Work', href: '#work' },
                  { label: 'About', href: '#about' },
                  { label: 'Services', href: '#services' },
                  { label: 'Contact', href: '#contact' },
                ].map((item) => (
                  <a key={item.label} href={item.href} className="block font-mono text-[14px] text-white/60 transition-colors hover:text-foreground cursor-none">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="clinical-label mb-5 text-primary">Connect</div>
              <div className="space-y-3.5">
                {[
                  { label: 'Instagram', url: 'https://www.instagram.com/sin.ai.da/' },
                  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/sinaida' },
                  { label: 'Behance', url: 'https://www.behance.net/sinaida' },
                  { label: 'Medium', url: 'https://medium.com/@idacooper' },
                  { label: 'Spotify', url: 'https://open.spotify.com/user/1u4ol8qogt04u4476e4xba8g8?si=9ed0a53d14934618' },
                ].map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="block font-mono text-[14px] text-white/60 transition-colors hover:text-foreground cursor-none">
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="clinical-label mb-5 text-primary">More</div>
              <div className="space-y-3.5">
                <a href="/booking" className="block font-mono text-[14px] text-white/60 transition-colors hover:text-foreground cursor-none">
                  Booking
                </a>
                <a href="/press" className="block font-mono text-[14px] text-white/60 transition-colors hover:text-foreground cursor-none">
                  Press
                </a>
                <a href="/privacy" className="block font-mono text-[14px] text-white/60 transition-colors hover:text-foreground cursor-none">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="section-divider mb-8 mt-14" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[12px] text-white/40">
            © {new Date().getFullYear()} Sinaida Krivchenko · Prague, CZ
          </span>
          <span className="font-mono text-[12px] italic text-white/40">
            Are we more than the data we leave behind?
          </span>
        </div>
      </div>
    </footer>
  );
}
