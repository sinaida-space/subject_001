import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import SnakeEasterEgg from './SnakeEasterEgg';
import EcgGround from './EcgGround';
import { useRenderMode } from '@/hooks/useRenderMode';
import { CITY, buildCity, cityBus, floorDelay, floorLit, span, type Tower } from '@/lib/city';
import { FLIGHT } from '@/lib/flight';

type Item = { label: string; to?: string; href?: string; download?: boolean; toggle?: boolean };

// The three link columns. In the city footer (#179) each is a tower and each
// link a floor; CONNECT, the people, is the tallest.
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

function FooterLink({ item, floor }: { item: Item; floor?: number }) {
  const { mode, toggle } = useRenderMode();
  const { pathname } = useLocation();
  // the city lights the floor of the link under the mouse or the focus
  const lit = floor === undefined ? {} : {
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') cityBus.hover(floor); },
    onPointerLeave: () => cityBus.hover(-1),
    onFocus: () => cityBus.hover(floor),
    onBlur: () => cityBus.hover(-1),
  };
  if (item.toggle) {
    return (
      <button
        type="button"
        onClick={() => toggle()}
        className={`${linkClass} text-left`}
        aria-label={`View: ${mode === 'full' ? 'Full' : 'Light'}. Switch to ${mode === 'full' ? 'light' : 'full'} mode`}
        {...lit}
      >
        View: <span className="text-primary-legible">{mode === 'full' ? 'Full' : 'Light'}</span>
      </button>
    );
  }
  if (item.to) {
    const to = item.to.startsWith('#') ? (pathname === '/' ? item.to : `/${item.to}`) : item.to;
    return <Link to={to} className={linkClass} {...lit}>{item.label}</Link>;
  }
  const external = item.href?.startsWith('http');
  return (
    <a
      href={item.href}
      {...(item.download ? { download: true } : {})}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={linkClass}
      {...lit}
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
          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.label}>
                <div className="clinical-label mb-5 text-primary-legible">{col.label}</div>
                <div className="space-y-3.5">
                  {col.items.map((item) => <FooterLink key={item.label} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* the Logo above already opens Snake; here the ground is only the line */}
      <EcgGround className="mb-8 mt-12" />
      <div className="site-frame"><BottomBar /></div>
    </footer>
  );
}

// ── The city footer (#179) ──
// Wide screens: one screen held still for CITY.runway screens of scroll, the
// three columns standing as towers on the ECG ground; the windows are the
// star field's (CityLights), measured here from the floors. Narrow screens: a
// skyline strip over the ground, the links as plain lists under it.
function CityFooter({ snake, onBeat }: { snake: ReactNode; onBeat: () => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  // what the scroll needs per frame, from the last measure
  const measured = useRef<{ floors: { el: HTMLElement; delay: number }[]; roofs: { el: HTMLElement; delay: number }[] }>({ floors: [], roofs: [] });

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current, stage = stageRef.current;
    if (!root || !stage) return;
    // f: 0 as the footer (wide) or the strip (narrow) comes in at the bottom
    // of the screen, 1 at the end of the page (wide) or once the strip has
    // risen past the middle (narrow)
    const progress = wide
      ? () => {
        const r = root.getBoundingClientRect();
        return Math.min(1, Math.max(0, (window.innerHeight - r.top) / Math.max(1, r.height)));
      }
      : () => {
        const r = stage.getBoundingClientRect();
        const vh = window.innerHeight;
        return Math.min(1, Math.max(0, (0.92 * vh - r.bottom) / (0.5 * vh)));
      };
    // where the stage will sit on screen as the fall begins
    const stageTopAtFall = () => {
      const vh = window.innerHeight;
      if (wide) return Math.max(0, vh - CITY.fall[0] * root.offsetHeight);
      return 0.92 * vh - CITY.fall[0] * 0.5 * vh - stage.offsetHeight;
    };

    let version = 0;
    let raf = 0;
    let last = '';
    const measure = () => {
      const sb = stage.getBoundingClientRect();
      const groundEl = root.querySelector<HTMLElement>('[data-city-ground]');
      if (!groundEl) return;
      const ground = groundEl.getBoundingClientRect().top + 24 - sb.top;
      const towers: Tower[] = [];
      const floors: { el: HTMLElement; delay: number }[] = [];
      const roofs: { el: HTMLElement; delay: number }[] = [];
      if (wide) {
        root.querySelectorAll<HTMLElement>('[data-city-tower]').forEach((t, ti) => {
          const tb = t.getBoundingClientRect();
          const roof = t.querySelector<HTMLElement>('[data-city-roof]');
          const fl = [...t.querySelectorAll<HTMLElement>('[data-city-floor]')];
          towers.push({
            left: tb.left - sb.left,
            right: tb.right - sb.left,
            roof: (roof ? roof.getBoundingClientRect().top : tb.top) - sb.top - 14,
            ground,
            floors: fl.map((el) => ({ y: el.getBoundingClientRect().bottom - sb.top - 15, id: Number(el.dataset.cityFloor) })),
            antenna: ti === 1,
          });
        });
      } else {
        // three silhouettes in the strip, right of the beat, as tall as their
        // columns are long
        const beat = groundEl.querySelector('svg')?.getBoundingClientRect();
        const x0 = beat ? beat.right - sb.left + 14 : 0;
        const room = sb.width - x0, gap = room * 0.07, tw = (room - 2 * gap) / 3;
        let id = 0;
        COLUMNS.forEach((col, ti) => {
          const left = x0 + ti * (tw + gap), right = left + tw;
          const top = ground - 6 - col.items.length * 2 * CITY.step;
          towers.push({
            left, right, roof: top - 8, ground,
            floors: col.items.map((_, k) => ({ y: ground - 6 - (k + 1) * 2 * CITY.step, id: id + col.items.length - 1 - k })),
            antenna: ti === 1,
          });
          id += col.items.length;
        });
      }
      const height = Math.max(1, ...towers.map((t) => t.ground - t.roof));
      if (wide) {
        towers.forEach((t, ti) => {
          const els = root.querySelectorAll<HTMLElement>(`[data-city-tower="${ti}"] [data-city-floor]`);
          els.forEach((el, k) => floors.push({ el, delay: floorDelay(t.ground - t.floors[k].y, height, ti) }));
          const roof = root.querySelector<HTMLElement>(`[data-city-tower="${ti}"] [data-city-roof]`);
          if (roof) roofs.push({ el: roof, delay: floorDelay(t.ground - t.roof, height, ti) });
        });
      }
      measured.current = { floors, roofs };
      cityBus.setLayout(buildCity(
        towers,
        { w: window.innerWidth, h: window.innerHeight, stageTop: stageTopAtFall() },
        { x: -FLIGHT.x, y: -FLIGHT.y, z: FLIGHT.home - FLIGHT.z },
        ++version,
      ));
      last = '';
      paint();
    };

    // the footer's own share of the scene: the ground's trace, each floor's
    // text condensing as its windows land, the bar at the end
    const paint = () => {
      raf = 0;
      const f = progress();
      const q = (x: number) => Math.round(x * 400) / 400;
      const g = q(span(f, CITY.ground));
      const key = `${q(f)}`;
      if (key === last) return;
      last = key;
      root.style.setProperty('--ground', String(g));
      root.style.setProperty('--ground-pen', g > 0 && g < 1 ? '1' : '0');
      root.style.setProperty('--bar', String(q(span(f, CITY.bar))));
      for (const fl of measured.current.floors) fl.el.style.setProperty('--lit', String(q(floorLit(f, fl.delay))));
      for (const r of measured.current.roofs) r.el.style.setProperty('--lit', String(q(floorLit(f, r.delay))));
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
      cityBus.hover(-1);
      cityBus.setStage(null, null);
    };
  }, [wide]);

  const wordmark = (
    <a href="/" onClick={toTop} aria-label="Sinaida: back to top" className="font-display text-lg font-light uppercase tracking-widest text-foreground cursor-none">
      Sinaida
    </a>
  );
  // a floor's text and a roof's label follow their windows in; focus always shows them
  const litStyle = '[opacity:var(--lit,1)] focus-within:[opacity:1]';

  if (wide) {
    let id = 0;
    return (
      <footer ref={rootRef} data-city className="relative z-10" style={{ height: `calc(100svh + ${CITY.runway * 100}svh)` }}>
        {snake}
        <div ref={stageRef} className="sticky top-0 flex h-[100svh] flex-col justify-end overflow-hidden pb-8">
          <div className="site-frame">
            <div className="grid grid-cols-12 items-end gap-8">
              <div className="col-span-4 pb-3" style={{ opacity: 'var(--ground, 1)' }}>
                <Plaque />
              </div>
              <nav aria-label="Footer" className="col-span-8 grid grid-cols-3 items-end gap-12">
                {COLUMNS.map((col, ti) => (
                  <div key={col.label} data-city-tower={ti}>
                    <div data-city-roof className={`clinical-label mb-5 text-primary-legible ${litStyle}`}>{col.label}</div>
                    <ul>
                      {col.items.map((item) => {
                        const floor = id++;
                        return (
                          // the text band, then room under it for the window strip
                          <li key={item.label} data-city-floor={floor} className={`pb-[22px] ${litStyle}`}>
                            <FooterLink item={item} floor={floor} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
          </div>
          <EcgGround draw wordmark={wordmark} onBeat={onBeat} className="mt-1" />
          <div className="site-frame mt-8" style={{ opacity: 'var(--bar, 1)' }}>
            <BottomBar />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer ref={rootRef} data-city className="relative z-10 pb-12 pt-24">
      {snake}
      <div className="site-frame">
        <div ref={stageRef} aria-hidden="true" className="relative h-[150px]" />
      </div>
      {/* no wordmark on the ground here: the skyline stands right of the beat */}
      <EcgGround draw onBeat={onBeat} />
      <div className="site-frame mt-10">
        <Plaque />
        <nav aria-label="Footer" className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.label}>
              <div className="clinical-label mb-5 text-primary-legible">{col.label}</div>
              <div className="space-y-3.5">
                {col.items.map((item) => <FooterLink key={item.label} item={item} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-12" style={{ opacity: 'var(--bar, 1)' }}><BottomBar /></div>
      </div>
    </footer>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
