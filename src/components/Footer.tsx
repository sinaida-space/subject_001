import { forwardRef, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import DitherText from './DitherText';
import SnakeEasterEgg from './SnakeEasterEgg';
import { useRenderMode } from '@/hooks/useRenderMode';
import { CITY, cityBus, span } from '@/lib/city';
import { ditherMask } from '@/lib/ditherMask';

// mark: the star on the ground's track this link lights (#179)
type Item = { label: string; to?: string; href?: string; download?: boolean; toggle?: boolean; mark?: number };

// The three link columns, bottom-aligned so they step up like a skyline.
// Navigate follows the page's own order.
const COLUMNS: { label: string; items: Item[] }[] = [
  {
    label: 'Navigate',
    items: [
      { label: 'About', to: '#about', mark: 3 },
      { label: 'Work', to: '#work', mark: 2 },
      { label: 'Services', to: '#services', mark: 1 },
      { label: 'Contact', to: '#contact', mark: 0 },
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

const linkClass = 'block w-fit font-mono uppercase text-[14px] tracking-[0.15em] text-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground cursor-none';
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// the held last screen wants height; shorter screens scroll on
const TALL = '(min-height: 560px)';

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
        data-ground-mask
        className={`${linkClass} text-left`}
        aria-label={`View: ${mode === 'full' ? 'Full' : 'Light'}. Switch to ${mode === 'full' ? 'light' : 'full'} mode`}
      >
        View: <span className="text-primary-legible">{mode === 'full' ? 'Full' : 'Light'}</span>
      </button>
    );
  }
  if (item.to) {
    const to = item.to.startsWith('#') ? (pathname === '/' ? item.to : `/${item.to}`) : item.to;
    const mark = item.mark;
    const light = mark === undefined ? {} : {
      onMouseEnter: () => cityBus.light(mark),
      onMouseLeave: () => cityBus.light(-1),
      onFocus: () => cityBus.light(mark),
      onBlur: () => cityBus.light(-1),
    };
    return <Link to={to} data-ground-mask className={linkClass} {...light}>{label}</Link>;
  }
  const external = item.href?.startsWith('http');
  return (
    <a
      href={item.href}
      {...(item.download ? { download: true } : {})}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      data-ground-mask
      className={linkClass}
    >
      {label}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

const Plaque = () => (
  <p data-ground-mask className="w-fit max-w-xs font-mono uppercase text-[13px] tracking-[0.15em] leading-relaxed text-foreground/55">
    Sinaida Krivchenko<br />New media artist
  </p>
);

const BottomBar = () => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <span data-ground-mask className="font-mono uppercase text-[12px] tracking-[0.15em] leading-relaxed text-foreground/60">
      Prague
      <br />
      © {new Date().getFullYear()} · Designed and coded by Sinaida{'\u00a0'}Krivchenko
    </span>
    <span data-ground-mask className="font-mono uppercase text-[12px] tracking-[0.15em] italic text-foreground/60">
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
// mode it is also the last screen of the flight: tall screens hold it still
// for CITY.runway screens while the camera dollies out of Contact and lowers
// its eyes, and it publishes that progress to the star field, the ground and
// Contact. Its pieces resolve out of dither as the scroll reaches them.
export default function Footer() {
  const [snakeOpen, setSnakeOpen] = useState(false);
  const { mode } = useRenderMode();
  const { pathname } = useLocation();
  const home = pathname === '/';
  const flight = mode === 'full' && home && !REDUCED;
  const rootRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(() => typeof window !== 'undefined' && window.matchMedia(TALL).matches);
  const held = flight && tall;

  useEffect(() => {
    const mq = window.matchMedia(TALL);
    const on = () => setTall(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    cityBus.setHeld(held);
    return () => cityBus.setHeld(false);
  }, [held]);

  // logo, columns and the bottom line resolve out of dither, scrubbed by f
  useEffect(() => {
    if (!flight) return;
    const groups = [[brandRef], [columnsRef, phoneRef], [barRef]];
    const levels = groups.map(() => -1);
    let raf = 0;
    const frame = () => {
      raf = 0;
      const f = cityBus.progress();
      groups.forEach((refs, i) => {
        const k = Math.round(span(f, CITY.text[i]) * 16);
        if (k === levels[i]) return;
        levels[i] = k;
        refs.forEach((r) => r.current && ditherMask(r.current, k));
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      groups.flat().forEach((r) => r.current && ditherMask(r.current, 16));
    };
  }, [flight]);

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
      {/* held: the screen lets clicks through to Contact, receded above it */}
      <div className={held ? 'pointer-events-none sticky top-0 flex h-[100svh] flex-col justify-end overflow-hidden pb-8' : `flex flex-col justify-end pb-8 pt-24 md:pt-32 ${home ? 'min-h-[100svh]' : ''}`}>
        <div className="site-frame pointer-events-auto">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:items-end lg:gap-8">
            <Columns ref={columnsRef} className="hidden items-end gap-8 md:grid md:grid-cols-3 lg:order-2 lg:col-span-7 lg:col-start-6" />
            <PhoneMenu ref={phoneRef} />
            <div ref={brandRef} className="lg:order-1 lg:col-span-4">
              <div data-ground-mask className="w-fit"><Logo onEcgClick={() => setSnakeOpen(true)} onNameClick={toTop} /></div>
              <div className="mt-5"><Plaque /></div>
            </div>
          </div>
          <div ref={barRef} className="mt-14"><BottomBar /></div>
        </div>
      </div>
    </footer>
  );
}

const Columns = forwardRef<HTMLElement, { className: string }>(function Columns({ className }, ref) {
  return (
    <nav ref={ref} aria-label="Footer" className={className}>
      {COLUMNS.map((col) => (
        <div key={col.label}>
          <div data-ground-mask className="clinical-label mb-5 w-fit text-primary-legible">{col.label}</div>
          <div className="space-y-3.5">
            {col.items.map((item) => <FooterLink key={item.label} item={item} />)}
          </div>
        </div>
      ))}
    </nav>
  );
});

// Phones: the three groups as one row of labels; a tap opens that group's
// links above it (the footer sits on the bottom, so the row stays put), two columns, resolving out of dither. One open at a time.
const PhoneMenu = forwardRef<HTMLElement>(function PhoneMenu(_, ref) {
  const [open, setOpen] = useState<number | null>(null);
  const col = open === null ? null : COLUMNS[open];
  return (
    <nav ref={ref} aria-label="Footer" className="flex flex-col-reverse md:hidden">
      <div className="flex justify-between gap-4">
        {COLUMNS.map((c, i) => (
          <button
            key={c.label}
            type="button"
            aria-expanded={open === i}
            aria-controls="footer-group"
            data-ground-mask
            onClick={() => setOpen(open === i ? null : i)}
            className={`clinical-label whitespace-nowrap border-b py-2 transition-colors ${open === i ? 'border-current text-primary-legible' : 'border-transparent text-foreground/60'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div id="footer-group" className={col ? 'mb-6 grid grid-cols-2 gap-x-8 gap-y-4' : 'hidden'}>
        {col?.items.map((item) => <FooterLink key={`${col.label}-${item.label}`} item={item} dither />)}
      </div>
    </nav>
  );
});

// Je suis le spectre d'une rose que tu portais hier au bal.
