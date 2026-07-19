import { useState } from 'react';
import Logo from './Logo';
import SnakeEasterEgg from './SnakeEasterEgg';
import XrayHeading from '@/components/XrayHeading';
import { useRenderMode } from '@/hooks/useRenderMode';
import { nbsp } from '@/lib/typo';

export default function Footer() {
  const [snakeOpen, setSnakeOpen] = useState(false);
  const { mode, toggle } = useRenderMode();

  return (
    <footer className="relative z-10 border-t border-border py-16 md:py-20">
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Logo
              size="large"
              onEcgClick={() => setSnakeOpen(true)}
              onNameClick={(e) => {
                if (window.location.pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                // Off the home page the <a href="/"> navigates to the hero naturally.
              }}
            />
            <p className="mt-6 max-w-xs font-mono text-lg md:text-xl leading-relaxed text-foreground/80">
              {nbsp('Sinaida Krivchenko')}<br />{nbsp('New media artist')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            <div>
              <XrayHeading as="div" className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 text-primary-legible">Navigate</XrayHeading>
              <div className="space-y-3.5">
                {[
                  { label: 'Work', href: '#work' },
                  { label: 'About', href: '#about' },
                  { label: 'Services', href: '#services' },
                  { label: 'Contact', href: '#contact' },
                ].map((item) => (
                  <a key={item.label} href={item.href} className="block font-mono text-sm text-foreground/60 transition-colors hover:text-primary-legible cursor-none">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <XrayHeading as="div" className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 text-primary-legible">Connect</XrayHeading>
              <div className="space-y-3.5">
                {[
                  { label: 'Instagram', url: 'https://www.instagram.com/sin.ai.da/' },
                  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/sinaida' },
                  { label: 'GitHub', url: 'https://github.com/sinaida-space' },
                  { label: 'Behance', url: 'https://www.behance.net/sinaida' },
                  { label: 'Medium', url: 'https://medium.com/@idacooper' },
                  { label: 'Spotify', url: 'https://open.spotify.com/user/1u4ol8qogt04u4476e4xba8g8?si=9ed0a53d14934618' },
                ].map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="block font-mono text-sm text-foreground/60 transition-colors hover:text-primary-legible cursor-none">
                    {link.label} ↗
                  </a>
                ))}
              </div>
            </div>

            <div>
              <XrayHeading as="div" className="text-2xl md:text-3xl font-semibold tracking-tight mb-5 text-primary-legible">More</XrayHeading>
              <div className="space-y-3.5">
                <a href="/collaborate" className="block font-mono text-sm text-foreground/60 transition-colors hover:text-primary-legible cursor-none">
                  {nbsp('Work with me')}
                </a>
                <a href="/privacy" className="block font-mono text-sm text-foreground/60 transition-colors hover:text-primary-legible cursor-none">
                  {nbsp('Privacy Policy')}
                </a>
                <button
                  type="button"
                  onClick={() => toggle()}
                  className="block font-mono text-sm text-foreground/60 transition-colors hover:text-primary-legible cursor-none"
                  aria-label={`Switch to ${mode === 'full' ? 'light' : 'full'} mode`}
                >
                  View: <span className="text-primary-legible">{mode === 'full' ? 'Full' : 'Light'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="section-divider mb-8 mt-14" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-xs text-foreground/40">
            © {new Date().getFullYear()} Sinaida Krivchenko · Prague, CZ
          </span>
          <span className="font-mono text-xs italic text-foreground/40">
            {nbsp('Are we more than the data we leave behind?')}
          </span>
        </div>
      </div>
    </footer>
  );
}
