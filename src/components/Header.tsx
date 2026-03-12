import { useState, useEffect } from 'react';
import Logo from './Logo';

const NAV_ITEMS = [
{ label: 'GALLERY', href: '#work' },
{ label: 'About', href: '#about' },
{ label: 'Process', href: '#process' }];


export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : ''}`
      }>
      
      <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) =>
          <a
            key={item.label}
            href={item.href}
            className="clinical-label hover:text-primary transition-colors duration-300 cursor-none">
            
              {item.label}
            </a>
          )}
        </nav>
        <a
          href="#contact"
          className="font-mono text-[12px] uppercase tracking-[0.15em] px-4 py-2 transition-all duration-300 cursor-none"
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
        >
          CONTACT
        </a>
      </div>
    </header>);

}