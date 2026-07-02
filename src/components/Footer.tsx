import { useState } from 'react';
import Logo from './Logo';
import SnakeEasterEgg from './SnakeEasterEgg';

export default function Footer() {
  const [snakeOpen, setSnakeOpen] = useState(false);

  return (
    <footer className="relative z-10 border-t border-border py-12">
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          <div className="col-span-12 md:col-span-4 mb-8 md:mb-0">
            <div onClick={() => setSnakeOpen(true)} title="..." style={{ cursor: 'pointer', display: 'inline-block' }}>
              <Logo />
            </div>
            <p className="font-clinical text-xs text-muted-foreground mt-3 max-w-xs">
              SINAIDA KRIVCHENKO<br />VISUAL ARTIST AND DIGITAL STRATEGIST
            </p>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="clinical-label text-primary mb-4">Navigate</div>
            <div className="space-y-2">
              {['Work', 'About', 'Services','Contact'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="block font-clinical text-xs text-muted-foreground hover:text-foreground transition-colors cursor-none">
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="clinical-label text-primary mb-4">Connect</div>
            <div className="space-y-2">
              {[
                { label: 'Instagram', url: 'https://www.instagram.com/sin.ai.da/' },
                { label: 'LinkedIn', url: 'https://www.linkedin.com/in/sinaida' },
                { label: 'Behance', url: 'https://www.behance.net/sinaida' },
                { label: 'Medium', url: 'https://medium.com/@idacooper' },
                { label: 'Spotify', url: 'https://open.spotify.com/user/1u4ol8qogt04u4476e4xba8g8?si=9ed0a53d14934618' }
              ].map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="block font-clinical text-xs text-muted-foreground hover:text-foreground transition-colors cursor-none">
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
          <div className="col-span-12 md:col-span-4">
            <div className="clinical-label text-primary mb-4">Legal</div>
            <a href="/privacy" className="block font-clinical text-xs text-muted-foreground hover:text-foreground transition-colors cursor-none mb-2">
              Privacy Policy
            </a>
            <p className="font-clinical text-xs text-muted-foreground">
              © {new Date().getFullYear()} Sinaida Krivchenko. All rights reserved.
            </p>
          </div>
        </div>
        <div className="section-divider mt-8 mb-6" />
        <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center">
          <span className="clinical-label text-muted-foreground">Website design and development by Sinaida Krivchenko | Prague, CZ</span>
          <span className="clinical-label text-muted-foreground">Are we more than the data we leave behind?</span>
        </div>
      </div>
    </footer>
  );
}
