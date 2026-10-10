import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import SnakeEasterEgg from './SnakeEasterEgg';
import ContactLinks from './ContactLinks';
import { useRenderMode } from '@/hooks/useRenderMode';
import { CITY, buildCity, cityBus, pourDom, span, stripTowers, type PourCell } from '@/lib/city';
import { FLIGHT } from '@/lib/flight';

type Item = { label: string; to?: string; href?: string; download?: boolean; toggle?: boolean };

// The three link columns. In the city footer (#179) each is also one of the
// little towers by the logo, a floor per link; CONNECT, the people, is the tallest.
const COLUMNS: { label: string; items: Item[] }[] = [
  {
    label: 'Navigate',
    items: [
      { label: 'Work', to: '#work' },
      { label: 'About', to: '#about' },
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
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Licensing', to: '/licensing' },
      { label: 'View', toggle: true },
    ],
  },
];

const linkClass = 'block font-mono uppercase text-[14px] tracking-[0.15em] text-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground cursor-none';
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// the towers want width and height; narrower or shorter screens get the strip
const WIDE = '(min-width: 1024px) and (min-height: 640px)';

function FooterLink({ item }: { item: Item }) {
  const { mode, toggle } = useRenderMode();
  const { pathname } = useLocation();
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
    return <Link to={to} className={linkClass}>{item.label}</Link>;
  }
  const external = item.href?.startsWith('http');
  return (
    <a
      href={item.href}
      {...(item.download ? { download: true } : {})}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={linkClass}
    >
      {item.label}{external ? ' ↗' : ''}
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
      © {new Date().getFullYear()} Sinaida Krivchenko{' '}· Prague,{' '}CZ
    </span>
    <span className="font-mono uppercase text-[12px] tracking-[0.15em] italic text-foreground/60">
      Are we more than the data we leave behind?
    </span>
  </div>
);

// The two links as cells on a 2 px grid, relative to their box: their glyphs
// and the button's outline, in their own colours. Drawn at their rendered
// place, so the poured stars land on the letters exactly.
function sampleLinks(root: HTMLElement): PourCell[] {
  const box = root.getBoundingClientRect();
  const w = Math.ceil(box.width), h = Math.ceil(box.height);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx || w < 1 || h < 1) return [];
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.borderTopWidth) > 0) {
      const r = el.getBoundingClientRect();
      ctx.strokeStyle = cs.borderTopColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.left - box.left + 1, r.top - box.top + 1, r.width - 2, r.height - 2);
    }
  });
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.textContent?.trim();
    const el = n.parentElement;
    if (!text || !el) continue;
    const cs = getComputedStyle(el);
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ctx.fillStyle = cs.color;
    ctx.textBaseline = 'middle';
    ctx.fillText(cs.textTransform === 'uppercase' ? text.toUpperCase() : text, r.left - box.left, r.top - box.top + r.height / 2);
  }
  const px = ctx.getImageData(0, 0, w, h).data;
  const out: PourCell[] = [];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 70) continue;
      const a = px[i + 3] / 255;
      out.push({ x, y, r: px[i] / a, g: px[i + 1] / a, b: px[i + 2] / a });
    }
  }
  return out;
}

const toTop = (e: React.MouseEvent) => {
  if (window.location.pathname === '/') {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

export default function Footer() {
  const [snakeOpen, setSnakeOpen] = useState(false);
  const { mode } = useRenderMode();
  const { pathname } = useLocation();
  const snake = snakeOpen && <SnakeEasterEgg onClose={() => setSnakeOpen(false)} />;
  // the city stands at the end of the home page's flight; everywhere else,
  // and in lite or reduced motion, the calm footer
  if (mode === 'full' && pathname === '/' && !REDUCED) return <CityFooter snake={snake} onBeat={() => setSnakeOpen(true)} />;
  return <CalmFooter snake={snake} onBeat={() => setSnakeOpen(true)} />;
}


function CalmFooter({ snake, onBeat }: { snake: ReactNode; onBeat: () => void }) {
  return (
    <footer className="relative z-10 border-t border-border py-16 md:py-20">
      {snake}
      <div className="site-frame">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Logo onEcgClick={onBeat} onNameClick={toTop} />
            <div className="mt-5"><Plaque /></div>
          </div>
          <Columns className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3" />
        </div>
        <div className="section-divider mb-8 mt-14" />
        <BottomBar />
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

// ── The city footer (#179) ──
// The last screen: the sky with the two ways in (poured there from LET'S
// TALK), the logo, the little towers beside it, the columns. The towers'
// windows, the pour and the city below the horizon belong to the star field
// (CityLights, CityGround); this measures where they land and publishes the
// progress f. Wide screens hold the screen still for CITY.runway screens of
// scroll; narrow ones scroll on, the towers a strip over the logo.
function CityFooter({ snake, onBeat }: { snake: ReactNode; onBeat: () => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current, strip = stripRef.current, to = toRef.current;
    // wide: the towers are measured in the held screen; narrow: in the strip
    const stage = wide ? stageRef.current : strip;
    if (!root || !stage || !strip || !to) return;
    const from = document.querySelector<HTMLElement>('[data-pour-src]');
    // f: 0 as the footer (wide) or the strip (narrow) comes in at the bottom
    // of the screen, 1 at the end of the page (wide) or once the strip has
    // risen past the middle (narrow)
    const progress = wide
      ? () => {
        const r = root.getBoundingClientRect();
        return Math.min(1, Math.max(0, (window.innerHeight - r.top) / Math.max(1, r.height)));
      }
      : () => {
        const r = strip.getBoundingClientRect();
        const vh = window.innerHeight;
        return Math.min(1, Math.max(0, (0.92 * vh - r.bottom) / (0.5 * vh)));
      };
    // where the stage will sit on screen as the fall begins
    const stageTopAtFall = () => {
      const vh = window.innerHeight;
      if (wide) return Math.max(0, vh - CITY.fall[0] * root.offsetHeight);
      return 0.92 * vh - CITY.fall[0] * 0.5 * vh - strip.offsetHeight;
    };

    let version = 0;
    let raf = 0;
    let last = '';
    const measure = () => {
      const sb = stage.getBoundingClientRect(), tb = strip.getBoundingClientRect();
      const towers = stripTowers(tb.width, tb.height, COLUMNS.map((c) => c.items.length)).map((t) => {
        const dx = tb.left - sb.left, dy = tb.top - sb.top;
        return { ...t, left: t.left + dx, right: t.right + dx, roof: t.roof + dy, ground: t.ground + dy, floors: t.floors.map((fl) => ({ ...fl, y: fl.y + dy })) };
      });
      // the two links' glyphs, relative to their box in the sky
      const box = to.getBoundingClientRect();
      const pour = from ? sampleLinks(to) : [];
      cityBus.setPour(from, to);
      cityBus.setLayout(buildCity(
        towers,
        pour,
        box.width,
        { w: window.innerWidth, h: window.innerHeight, stageTop: stageTopAtFall() },
        { x: -FLIGHT.x, y: -FLIGHT.y, z: FLIGHT.home - FLIGHT.z },
        ++version,
      ));
      last = '';
      paint();
    };

    // the DOM's share: the links leave Contact and arrive in the sky as their
    // stars do, the bar comes in at the end
    const paint = () => {
      raf = 0;
      const f = progress();
      const q = (x: number) => Math.round(x * 400) / 400;
      const key = `${q(f)}`;
      if (key === last) return;
      last = key;
      const p = pourDom(f);
      if (from) from.style.setProperty('--pour-out', String(q(p.out)));
      root.style.setProperty('--pour-in', String(from ? q(p.in) : 1));
      root.style.setProperty('--bar', String(q(span(f, CITY.bar))));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(measure, 150);
    };

    cityBus.setStage(stage, progress);
    measure();
    document.fonts?.ready.then(measure, () => {});
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      from?.style.removeProperty('--pour-out');
      cityBus.setPour(null, null);
      cityBus.setStage(null, null);
    };
  }, [wide]);

  const contacts = (
    <div ref={toRef} className="w-fit [opacity:var(--pour-in,1)] focus-within:[opacity:1]">
      <ContactLinks />
    </div>
  );
  const logo = (
    <div>
      <Logo onEcgClick={onBeat} onNameClick={toTop} />
      <div className="mt-5"><Plaque /></div>
    </div>
  );

  if (wide) {
    return (
      <footer ref={rootRef} data-city className="relative z-10" style={{ height: `calc(100svh + ${CITY.runway * 100}svh)` }}>
        {snake}
        <div ref={stageRef} className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pb-8">
          {/* the sky: where the two ways in come to rest */}
          <div className="site-frame pt-[20svh]">{contacts}</div>
          <div className="site-frame mt-auto">
            <div className="grid grid-cols-12 items-end gap-8">
              <div className="col-span-3">{logo}</div>
              <div ref={stripRef} aria-hidden="true" className="col-span-3 h-[120px]" />
              <Columns className="col-span-6 grid grid-cols-3 items-end gap-8" />
            </div>
            <div className="mt-12 [opacity:var(--bar,1)]"><BottomBar /></div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer ref={rootRef} data-city className="relative z-10 pb-12 pt-20">
      {snake}
      <div className="site-frame">
        {contacts}
        <div ref={stripRef} aria-hidden="true" className="mt-20 h-[110px] w-full max-w-[420px]" />
        <div className="mt-10">{logo}</div>
        <Columns className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3" />
        <div className="mt-12 [opacity:var(--bar,1)]"><BottomBar /></div>
      </div>
    </footer>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
