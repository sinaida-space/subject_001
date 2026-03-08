import { useState, useEffect } from 'react';
import Logo from './Logo';

const NAV_ITEMS = [
{ label: 'Work', href: '#work' },
{ label: 'About', href: '#about' },
{ label: 'Process', href: '#process' },
{ label: 'Contact', href: '#contact' }];


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
      
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
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
          className="clinical-label border border-primary/30 px-4 py-2 hover:bg-primary/10 hover:border-primary transition-all duration-300 cursor-none">
          
          CONTACT 
        </a>
      </div>
    </header>);

}