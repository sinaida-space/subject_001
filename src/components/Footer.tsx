import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import DitherText from './DitherText';
import SnakeEasterEgg from './SnakeEasterEgg';
import { useRenderMode } from '@/hooks/useRenderMode';
import { CITY, cityBus } from '@/lib/city';

type Item = { label: string; to?: string; href?: string; download?: boolean; toggle?: boolean };

// The three link columns, bottom-aligned so they step up like a skyline.
// Navigate follows the page's own order.
const COLUMNS: { label: string; items: Item[] }[] = [
  {
    label: 'Navigate',
    items: [
      { label: 'About', to: '#about' },
      { label: 'Work', to: '#work' },
      { label: 'Services', to: '#services' },
      { label: 'Contact', to: '#contact' },
    ],
  },
  {
    label: 'Connect',
    items: [
      { label: 'Instagram', href: 'https://www.instagram.com/sin.ai.da/' },
      { label: 'YouTube', href: 'https://www.youtube.com/@theSwansAreNotWhatTheySeem' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sinaida' },
      { label: 'GitHub', href: 'https://github.com/sinaida-space' },
      { label: 'Patreon', href: 'https://www.patreon.com/cw/theswansarenotwhattheyseem' },
      { label: 'Behance', href: 'https://www.behance.net/sinaida' },
      { label: 'Medium', href: 'https://medium.com/@idacooper' },
      { label: 'Spotify', href: 'https://open.spotify.com/user/1u4ol8qogt04u4476e4xba8g8?si=9ed0a53d14934618' },
    ],
  },
  {
    label: 'More',
    items: [
      { label: 'Statement', to: '/statement' },
      { label: 'Work with me', to: '/collaborate' },
      { label: 'CV (PDF)', href: '/files/sinaida-krivchenko-cv.pdf', download: true },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Licensing', to: '/licensing' },
      { label: 'View', toggle: true },
    ],
  },
];

const linkClass = 'block font-mono uppercase text-[14px] tracking-[0.15em] text-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground cursor-none';
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// the held last screen wants width and height; smaller screens scroll on
const WIDE = '(min-width: 1024px) and (min-height: 640px)';

function FooterLink({ item, dither = false }: { item: Item; dither?: boolean }) {
  const { mode, toggle } = useRenderMode();
  const { pathname } = useLocation();
  // on the phone menu the links resolve out of dither as their group opens
  const label = dither ? <DitherText text={item.label} /> : item.label;
  if (item.toggle) {
    return (
      <button
        type="button"
        onClick={() => toggle()}
        className={`${linkClass} text-left`}
        aria-label={`View: ${mode === 'full' ? 'Full' : 'Light'}. Switch to ${mode === 'full' ? 'light' : 'full'} mode`}
      >
        View: <span className="text-primary-legible">{mode === 'full' ? 'Full' : 'Light'}</span>
      </button>
    );
  }
  if (item.to) {
    const to = item.to.startsWith('#') ? (pathname === '/' ? item.to : `/${item.to}`) : item.to;
    return <Link to={to} className={linkClass}>{label}</Link>;
  }
  const external = item.href?.startsWith('http');
  return (
    <a
      href={item.href}
      {...(item.download ? { download: true } : {})}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={linkClass}
    >
      {label}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

const Plaque = () => (
  <p className="max-w-xs font-mono uppercase text-[13px] tracking-[0.15em] leading-relaxed text-foreground/55">
    Sinaida Krivchenko<br />New media artist
  </p>
);

const BottomBar = () => (
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <span className="font-mono uppercase text-[12px] tracking-[0.15em] text-foreground/60">
      © {new Date().getFullYear()} · Designed and coded by Sinaida{'\u00a0'}Krivchenko
    </span>
    <span className="font-mono uppercase text-[12px] tracking-[0.15em] italic text-foreground/60">
      Are we more than the data we leave behind?
    </span>
  </div>
);

const toTop = (e: React.MouseEvent) => {
  if (window.location.pathname === '/') {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// One footer on every page, in both modes (#179). On the home page in full
// mode it is also the last screen of the flight: wide screens hold it still
// for CITY.runway screens while the camera lowers its eyes, and it publishes
// that progress to the star field.
export default function Footer() {
  const [snakeOpen, setSnakeOpen] = useState(false);
  const { mode } = useRenderMode();
  const { pathname } = useLocation();
  const home = pathname === '/';
  const flight = mode === 'full' && home && !REDUCED;
  const rootRef = useRef<HTMLElement>(null);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  const held = flight && wide;

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!flight || !root) return;
    // f: 0 as the footer comes in at the bottom of the screen, 1 at the end
    // of the page
    cityBus.setProgress(() => {
      const r = root.getBoundingClientRect();
      return Math.min(1, Math.max(0, (window.innerHeight - r.top) / Math.max(1, r.height)));
    });
    return () => cityBus.setProgress(null);
  }, [flight]);

  return (
    <footer
      ref={rootRef}
      data-city={flight ? '' : undefined}
      className="relative z-10"
      style={held ? { height: `calc(100svh + ${CITY.runway * 100}svh)` } : undefined}
    >
      {snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />}
      {/* on the home page the footer is the whole last screen in both modes,
          so Contact has left it entirely by the end */}
      <div className={held ? 'sticky top-0 flex h-[100svh] flex-col justify-end overflow-hidden pb-8' : `flex flex-col justify-end pb-8 pt-24 md:pt-32 ${home ? 'min-h-[100svh]' : ''}`}>
        <div className="site-frame">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:items-end lg:gap-8">
            <Columns className="hidden items-end gap-8 md:grid md:grid-cols-3 lg:order-2 lg:col-span-7 lg:col-start-6" />
            <PhoneMenu />
            <div className="lg:order-1 lg:col-span-4">
              <Logo onEcgClick={() => setSnakeOpen(true)} onNameClick={toTop} />
              <div className="mt-5"><Plaque /></div>
            </div>
          </div>
          <div className="mt-14"><BottomBar /></div>
        </div>
      </div>
    </footer>
  );
}

function Columns({ className }: { className: string }) {
  return (
    <nav aria-label="Footer" className={className}>
      {COLUMNS.map((col) => (
        <div key={col.label}>
          <div className="clinical-label mb-5 text-primary-legible">{col.label}</div>
          <div className="space-y-3.5">
            {col.items.map((item) => <FooterLink key={item.label} item={item} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

// Phones: the three groups as one row of labels; a tap opens that group's
// links below it, two columns, resolving out of dither. One open at a time.
function PhoneMenu() {
  const [open, setOpen] = useState<number | null>(null);
  const col = open === null ? null : COLUMNS[open];
  return (
    <nav aria-label="Footer" className="md:hidden">
      <div className="flex justify-between gap-4">
        {COLUMNS.map((c, i) => (
          <button
            key={c.label}
            type="button"
            aria-expanded={open === i}
            aria-controls="footer-group"
            onClick={() => setOpen(open === i ? null : i)}
            className={`clinical-label whitespace-nowrap border-b py-2 transition-colors ${open === i ? 'border-current text-primary-legible' : 'border-transparent text-foreground/60'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div id="footer-group" className={col ? 'mt-6 grid grid-cols-2 gap-x-8 gap-y-4' : 'hidden'}>
        {col?.items.map((item) => <FooterLink key={`${col.label}-${item.label}`} item={item} dither />)}
      </div>
    </nav>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
