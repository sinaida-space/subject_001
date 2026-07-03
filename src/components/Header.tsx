import { useState, useEffect } from 'react';
import Logo from './Logo';
import { useRenderMode } from '@/hooks/useRenderMode';

const NAV_ITEMS = [
  { label: 'Work', href: '#work' },
  { label: 'Skills', href: '#constellation' },
  { label: 'Playground', href: '#experiments' },
  { label: 'About', href: '#about' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, toggle } = useRenderMode();

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
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    setTimeout(() => {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const contactEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = '#ff3333';
    e.currentTarget.style.color = '#000';
  };

  const contactLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = 'rgba(255,51,51,0.06)';
    e.currentTarget.style.color = '#ff3333';
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : ''}`}>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">

          <a href="#" onClick={scrollTop} style={{ cursor: 'none' }}>
            <Logo />
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a key={item.label} href={item.href} className="clinical-label hover:text-primary transition-colors duration-300 cursor-none">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <button
              type="button"
              onClick={toggle}
              className="clinical-label cursor-none text-muted-foreground transition-colors hover:text-foreground"
              title="Toggle visual intensity"
              aria-label={`Switch to ${mode === 'full' ? 'lite' : 'full'} mode`}
            >
              {mode === 'full' ? 'FULL' : 'LITE'}
            </button>
            <a
              href="#contact"
              className="font-mono text-[12px] uppercase tracking-[0.15em] px-4 py-2 transition-all duration-300 cursor-none"
              style={{ border: '1px solid #ff3333', color: '#ff3333', background: 'rgba(255,51,51,0.06)' }}
              onMouseEnter={contactEnter}
              onMouseLeave={contactLeave}
            >
              CONTACT
            </a>
          </div>

          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px]"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, zIndex: 60 }}
            aria-label="Menu"
          >
            <span style={{ display: 'block', width: 22, height: 1.5, background: '#ffffff', transition: 'all 0.3s', transform: menuOpen ? 'translateY(7.5px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 1.5, background: '#ffffff', transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 1.5, background: '#ffffff', transition: 'all 0.3s', transform: menuOpen ? 'translateY(-7.5px) rotate(-45deg)' : 'none' }} />
          </button>

        </div>
      </header>

      <div
        className="md:hidden fixed inset-0 z-40 flex flex-col justify-center items-start"
        style={{
          background: 'rgba(4,4,4,0.97)',
          backdropFilter: 'blur(12px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'all' : 'none',
          transition: 'opacity 0.3s ease',
          paddingLeft: 40,
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff3333', letterSpacing: '0.2em', marginBottom: 48, opacity: 0.6 }}>
          [ NAV.SYS // OPEN ]
        </div>

        {NAV_ITEMS.map((item, i) => (
          <a
            key={item.label}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href)}
            style={{
              display: 'block',
              fontFamily: 'monospace',
              fontSize: 28,
              fontWeight: 300,
              color: '#ffffff',
              letterSpacing: '0.1em',
              marginBottom: 20,
              textDecoration: 'none',
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
              transition: `opacity 0.35s ease ${i * 70}ms, transform 0.35s ease ${i * 70}ms`,
            }}
          >
            <span style={{ color: '#ff3333', marginRight: 14, fontSize: 11, letterSpacing: '0.2em' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {item.label}
          </a>
        ))}

        <a
          href="#contact"
          onClick={(e) => handleNavClick(e, '#contact')}
          style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: '0.2em',
            padding: '12px 28px',
            border: '1px solid #ff3333',
            color: '#ff3333',
            background: 'rgba(255,51,51,0.06)',
            textDecoration: 'none',
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
            transition: `opacity 0.35s ease ${NAV_ITEMS.length * 70}ms, transform 0.35s ease ${NAV_ITEMS.length * 70}ms`,
          }}
        >
          CONTACT
        </a>

        <button
          type="button"
          onClick={() => toggle()}
          style={{
            marginTop: 40,
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.55)',
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
          }}
          aria-label={`Switch to ${mode === 'full' ? 'lite' : 'full'} mode`}
        >
          VISUAL MODE: <span style={{ color: '#ff3333' }}>{mode === 'full' ? 'FULL' : 'LITE'}</span>
        </button>

        <div style={{ marginTop: 40, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
          sin.ai.da · Prague
        </div>
      </div>
    </>
  );
}
