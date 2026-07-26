import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Logo from './Logo';
import SnakeEasterEgg from './SnakeEasterEgg';
import { useRenderMode } from '@/hooks/useRenderMode';

const NAV_ITEMS = [
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Contact', href: '#contact' },
];

// Network (full/Signal Map) vs. list (light/Plain Signal) — the icon itself
// shows which mode is currently active.
function ModeIcon({ mode }: { mode: 'full' | 'lite' }) {
  if (mode === 'full') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="5" r="2.1" />
        <circle cx="5" cy="18" r="2.1" />
        <circle cx="19" cy="18" r="2.1" />
        <line x1="12" y1="7.1" x2="6.3" y2="16.2" />
        <line x1="12" y1="7.1" x2="17.7" y2="16.2" />
        <line x1="7.1" y1="18" x2="16.9" y2="18" />
      </svg>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.15em]" aria-hidden="true">
      Light
    </span>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [snakeOpen, setSnakeOpen] = useState(false);
  const { mode, toggle } = useRenderMode();
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const navHref = (hash: string) => (onHome ? hash : `/${hash}`);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTop = (e: React.MouseEvent) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Elsewhere the <a href="/"> navigates home to the hero naturally.
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false);
    if (!onHome) return; // let the <a> navigate home, hash-scroll handled there
    e.preventDefault();
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const contactEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // --primary-legible, not raw --sinaida-red: this is a solid fill behind
    // black text, and cd0000 alone only clears ~3.6:1 there — below AA.
    e.currentTarget.style.background = 'hsl(var(--primary-legible))';
    e.currentTarget.style.color = '#000';
  };

  const contactLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = 'hsl(var(--sinaida-red) / 0.06)';
    e.currentTarget.style.color = 'hsl(var(--primary-legible))';
  };

  return (
    <>
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : ''}`}>
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2 sm:gap-4">

          <Logo onEcgClick={() => setSnakeOpen(true)} onNameClick={scrollTop} />

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={navHref(item.href)} className="clinical-label hover:text-primary-legible transition-colors duration-300 cursor-none">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-5">
            <button
              type="button"
              onClick={() => toggle()}
              className={`cursor-none flex items-center justify-center h-9 transition-colors text-primary-legible/70 hover:text-accent ${mode === 'full' ? 'w-9' : 'px-3'}`}
              style={{ border: mode === 'full' ? 'none' : '1px solid hsl(var(--foreground) / 0.12)' }}
              aria-label={`Switch to ${mode === 'full' ? 'light' : 'full'} mode (currently ${mode === 'full' ? 'full' : 'light'})`}
              title={mode === 'full' ? 'Switch to light mode' : 'Switch to full mode'}
            >
              <ModeIcon mode={mode} />
            </button>
            <a
              href={navHref('#contact')}
              className="font-mono text-[12px] uppercase tracking-[0.15em] px-4 flex items-center h-9 transition-all duration-300 cursor-none"
              style={{ border: '1px solid hsl(var(--sinaida-red))', color: 'hsl(var(--primary-legible))', background: 'hsl(var(--sinaida-red) / 0.06)' }}
              onMouseEnter={contactEnter}
              onMouseLeave={contactLeave}
            >
              CONTACT
            </a>
          </div>

          <div className="lg:hidden flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => toggle()}
              className={`flex items-center justify-center h-8 sm:h-9 transition-colors text-primary-legible/70 ${mode === 'full' ? 'w-8 sm:w-9' : 'px-2 sm:px-3'}`}
              style={{ border: mode === 'full' ? 'none' : '1px solid hsl(var(--foreground) / 0.12)' }}
              aria-label={`Switch to ${mode === 'full' ? 'light' : 'full'} mode (currently ${mode === 'full' ? 'full' : 'light'})`}
              title={mode === 'full' ? 'Switch to light mode' : 'Switch to full mode'}
            >
              <ModeIcon mode={mode} />
            </button>
            <button
              className="flex flex-col justify-center items-center w-8 h-8 sm:w-9 sm:h-9 gap-[5px]"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: '1px solid hsl(var(--sinaida-red))', cursor: 'pointer', padding: 0, zIndex: 60 }}
              aria-label="Menu"
            >
              <span style={{ display: 'block', width: 16, height: 1.5, background: 'hsl(var(--sinaida-red))', transition: mode === 'lite' ? 'none' : 'all 0.3s', transform: mode === 'lite' ? 'none' : (menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none') }} />
              <span style={{ display: 'block', width: 16, height: 1.5, background: 'hsl(var(--sinaida-red))', transition: mode === 'lite' ? 'none' : 'all 0.3s', opacity: mode === 'lite' ? 1 : (menuOpen ? 0 : 1) }} />
              <span style={{ display: 'block', width: 16, height: 1.5, background: 'hsl(var(--sinaida-red))', transition: mode === 'lite' ? 'none' : 'all 0.3s', transform: mode === 'lite' ? 'none' : (menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none') }} />
            </button>
          </div>

        </div>
      </header>

      <div
        className="lg:hidden fixed inset-0 z-40 flex flex-col justify-center items-start"
        style={{
          background: mode === 'lite' ? 'hsl(var(--background))' : 'hsl(var(--background) / 0.97)',
          backdropFilter: mode === 'lite' ? 'none' : 'blur(12px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'all' : 'none',
          transition: mode === 'lite' ? 'none' : 'opacity 0.3s ease',
          paddingLeft: 40,
        }}
      >
        {NAV_ITEMS.filter((item) => item.label !== 'Contact').map((item, i) => (
          <a
            key={item.label}
            href={navHref(item.href)}
            onClick={(e) => handleNavClick(e, item.href)}
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: 35,
              fontWeight: 300,
              textTransform: 'uppercase',
              color: 'hsl(var(--foreground))',
              letterSpacing: '0.1em',
              marginBottom: 20,
              textDecoration: 'none',
              opacity: menuOpen ? 1 : 0,
              transform: mode === 'lite' ? 'none' : (menuOpen ? 'translateX(0)' : 'translateX(-16px)'),
              transition: mode === 'lite' ? 'none' : `opacity 0.35s ease ${i * 70}ms, transform 0.35s ease ${i * 70}ms`,
            }}
          >
            {item.label}
          </a>
        ))}

        <a
          href={navHref('#contact')}
          onClick={(e) => handleNavClick(e, '#contact')}
          style={{
            marginTop: 40,
            fontFamily: 'var(--font-mono)',
            fontSize: 20,
            letterSpacing: '0.2em',
            padding: '12px 28px',
            border: '1px solid hsl(var(--sinaida-red))',
            color: 'hsl(var(--primary-legible))',
            background: 'hsl(var(--sinaida-red) / 0.06)',
            textDecoration: 'none',
            opacity: menuOpen ? 1 : 0,
            transform: mode === 'lite' ? 'none' : (menuOpen ? 'translateX(0)' : 'translateX(-16px)'),
            transition: mode === 'lite' ? 'none' : `opacity 0.35s ease ${NAV_ITEMS.length * 70}ms, transform 0.35s ease ${NAV_ITEMS.length * 70}ms`,
          }}
        >
          CONTACT
        </a>

        <button
          type="button"
          onClick={() => toggle()}
          style={{
            marginTop: 32,
            fontFamily: 'var(--font-mono)',
            fontSize: 20,
            letterSpacing: '0.15em',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: mode === 'lite' ? 'hsl(var(--foreground) / 0.5)' : 'hsl(var(--foreground) / 0.45)',
            opacity: menuOpen ? 1 : 0,
            transition: mode === 'lite' ? 'none' : 'opacity 0.35s ease',
          }}
          aria-label={`Switch to ${mode === 'full' ? 'light' : 'full'} mode`}
        >
          View: <span style={{ color: 'hsl(var(--primary-legible))' }}>{mode === 'full' ? 'Full' : 'Light'}</span>
        </button>

        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 20, color: mode === 'lite' ? 'hsl(var(--foreground) / 0.65)' : 'hsl(var(--foreground) / 0.5)', letterSpacing: '0.15em' }}>
          sin.ai.da · Prague
        </div>
      </div>
    </>
  );
}
