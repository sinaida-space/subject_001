import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRenderMode } from '@/hooks/useRenderMode';
import { H2_CLASS, KICKER_CLASS, BODY_CLASS } from '@/components/PageParts';
import { formatNight, loadNights, NIGHTS, PLAYLIST_URL, type Night } from '@/lib/starway';
import type { Bus } from '@/components/StarwayScene';

const StarwayScene = lazy(() => import('@/components/StarwayScene'));

// ── Starway (/machines) ──
// The MCP server's sky of visits, for people. White stars are the machines:
// one per night, as bright as that night's calls. The red light is the person
// reading, only for as long as they stay: nothing about them is counted, sent
// or kept. Scroll flies through the nights, the light wakes the star nearest
// to it. Circling a star, or touching more than three, finds the music.

const isQuiet = (nights: Night[]) => nights.every((n) => n.brightness <= 0);

// with no answer from the server the way is still there, only dark
function darkNights(): Night[] {
  const today = Math.floor(Date.now() / 864e5) * 864e5;
  return Array.from({ length: NIGHTS }, (_, i) => ({
    date: new Date(today - (NIGHTS - 1 - i) * 864e5).toISOString().slice(0, 10),
    brightness: 0,
  }));
}

function useNights() {
  const [nights, setNights] = useState<Night[] | null>(null);
  useEffect(() => {
    let live = true;
    loadNights().then((n) => live && setNights(n.length ? n : darkNights()));
    return () => {
      live = false;
    };
  }, []);
  return nights;
}

// the found state is shared by both renderings; the window opens once per visit
function useEgg() {
  const [open, setOpen] = useState(false);
  const shown = useRef(false);
  const touched = useRef(new Set<number>());
  const find = () => {
    if (shown.current) return;
    shown.current = true;
    setOpen(true);
  };
  const touch = (i: number) => {
    touched.current.add(i);
    if (touched.current.size > 3) find();
  };
  const close = useCallback(() => setOpen(false), []);
  return { open, close, find, touch };
}

// a small system window in the Snake window's manner, as DataLeftBehind
function Egg({ open, onClose }: { open: boolean; onClose: () => void }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    linkRef.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="snake-backdrop fixed inset-0 z-100 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="starway-egg-title"
        className="snake-window w-full max-w-104"
        style={{ border: '1px solid #CC1414', boxShadow: '0 0 40px rgba(204,20,20,0.3)', background: 'hsl(var(--background))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-2" style={{ borderBottom: '1px solid hsl(var(--graphite))' }}>
          <span id="starway-egg-title" className="font-mono text-[16px] tracking-[1px]" style={{ color: '#CC1414' }}>
            STARWAY
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="font-mono text-[16px] tracking-[1px]"
            style={{ color: 'hsl(var(--slate))', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span aria-hidden="true">[X]</span>
          </button>
        </div>
        <div className="p-5">
          <p className="font-mono text-[19px] leading-normal text-foreground">
            A message from Major&nbsp;Tom:{' '}
            <a
              ref={linkRef}
              href={PLAYLIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              long&nbsp;empty&nbsp;corridors<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const HINT = <>Scroll to fly. The red light is you; bring it close and a star will&nbsp;answer.</>;
const ASK = <>You can’t light a star yourself. Your agent can: ask it to draw you the starway of&nbsp;sinaida.eu.</>;
const QUIET = <>No machines up here yet. You are the first&nbsp;light.</>;

function Heading() {
  return (
    <>
      <div className={KICKER_CLASS}>Starway</div>
      <h2 id="starway-title" className={`mt-3 ${H2_CLASS}`}>Ninety nights</h2>
    </>
  );
}

/* Lite: the same nights as one still line of stars in ink on Chalk, no WebGL, no flight. */
function StarwayStill({ nights }: { nights: Night[] }) {
  const egg = useEgg();
  const [picked, setPicked] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const at = (i: number) => ({
    x: 10 + (i / (nights.length - 1)) * 880,
    y: 110 + Math.sin(i * 0.35) * 55 + Math.cos(i * 1.7) * 18,
  });
  return (
    <section aria-labelledby="starway-title" className="container relative z-10 mx-auto max-w-6xl px-6">
      <Heading />
      <p className={`mt-6 ${BODY_CLASS}`}>{isQuiet(nights) ? QUIET : ASK}</p>
      <svg viewBox="0 0 900 220" className="mt-10 w-full" role="img" aria-label="Ninety nights of visits as stars">
        <polyline points={path.map((i) => `${at(i).x},${at(i).y}`).join(' ')} {...THREAD} />
        {nights.map((n, i) => {
          const { x, y } = at(i);
          const r = 1.2 + n.brightness * 5;
          return (
            <circle
              key={n.date}
              cx={x}
              cy={y}
              r={picked === i ? r + 3 : r}
              fill="hsl(var(--foreground))"
              fillOpacity={picked === i ? 1 : 0.25 + n.brightness * 0.75}
              onClick={() => {
                setPicked(i);
                setPath((p) => (p[p.length - 1] === i ? p : [...p, i]));
                egg.touch(i);
              }}
              style={{ cursor: 'pointer' }}
            >
              <title>{formatNight(n.date)}</title>
            </circle>
          );
        })}
      </svg>
      <p className="clinical-label mt-4 h-8 text-foreground/70">{picked !== null ? formatNight(nights[picked].date) : ''}</p>
      <Egg open={egg.open} onClose={egg.close} />
    </section>
  );
}

// the thread a visitor draws through the stars they touched: their own
// figure in the sky, kept only while the page is open
const THREAD = { fill: 'none', stroke: 'hsl(var(--foreground))', strokeOpacity: 0.55, strokeWidth: 1, strokeDasharray: '3 4' } as const;

// how far the site's own sky dims while the flight runs
const VEIL = 0.9;

function StarwayFlight({ nights }: { nights: Night[] }) {
  const egg = useEgg();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const trail = useRef<SVGPolylineElement>(null);
  const touched = useRef<number[]>([]);
  const thread = useRef<SVGLineElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  const bus = useMemo<Bus>(
    () => ({
      progress: 0,
      pointer: { x: 0, y: 0, on: false },
      screen: new Float32Array(nights.length * 2),
      wake: new Float32Array(nights.length),
      nearest: -1,
    }),
    [nights],
  );

  // mount the canvas only when the section comes near
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: '100% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the DOM layer follows each rendered frame: the thread and the date
  useEffect(() => {
    bus.onFrame = () => {
      trail.current?.setAttribute('points', touched.current.map((k) => `${bus.screen[k * 2]},${bus.screen[k * 2 + 1]}`).join(' '));
      const i = bus.nearest;
      const t = thread.current, l = label.current;
      if (!t || !l) return;
      if (i < 0) {
        t.style.opacity = '0';
        l.style.opacity = '0';
        return;
      }
      const sx = bus.screen[i * 2], sy = bus.screen[i * 2 + 1];
      t.setAttribute('x1', String(bus.pointer.x));
      t.setAttribute('y1', String(bus.pointer.y));
      t.setAttribute('x2', String(sx));
      t.setAttribute('y2', String(sy));
      t.style.opacity = String(0.25 + bus.wake[i] * 0.6);
      l.textContent = formatNight(nights[i].date);
      l.style.transform = `translate(${sx + 18}px, ${sy - 34}px)`;
      l.style.opacity = String(Math.min(1, bus.wake[i] * 2));
    };
    return () => {
      bus.onFrame = undefined;
    };
  }, [bus, nights]);

  // scroll drives the flight; the words fade by the same progress
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      bus.progress = p;
      if (intro.current) intro.current.style.opacity = String(Math.max(0, 1 - p / 0.12));
      if (outro.current) outro.current.style.opacity = String(Math.max(0, (p - 0.86) / 0.12));
      // the lights go down in the hall: the site's sky dims under the ninety
      // nights as the flight starts, and comes back as it ends
      if (veil.current) veil.current.style.opacity = String(VEIL * Math.min(1, p / 0.12, (1 - p) / 0.12));
      bus.onRender?.();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [bus]);

  // the light: mouse or finger, read only, never sent anywhere
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let circling = -1, turned = 0, lastAngle = 0;

    const move = (cx: number, cy: number) => {
      const box = el.getBoundingClientRect();
      const x = cx - box.left, y = cy - box.top;
      bus.pointer.x = x;
      bus.pointer.y = y;
      bus.pointer.on = true;
      // the light is fixed to the viewport, so the stage's edge never cuts
      // it; it dims in over the first rows of the stage instead
      if (light.current) {
        light.current.style.opacity = String(Math.min(1, Math.max(0, y / 140)));
        light.current.style.transform = `translate(${cx}px, ${cy}px)`;
      }
      // a full turn around one star finds the music; the turn holds on to
      // that star while the hand stays near it, even if a neighbour answers
      const held = circling >= 0 && Math.hypot(x - bus.screen[circling * 2], y - bus.screen[circling * 2 + 1]) < 220;
      if (!held) {
        circling = bus.nearest;
        turned = 0;
      }
      if (circling >= 0) {
        const a = Math.atan2(y - bus.screen[circling * 2 + 1], x - bus.screen[circling * 2]);
        if (held) {
          let d = a - lastAngle;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          turned += d;
          if (Math.abs(turned) > Math.PI * 2) egg.find();
        }
        lastAngle = a;
      }
      bus.onRender?.();
    };
    const leave = () => {
      bus.pointer.on = false;
      circling = -1;
      if (light.current) light.current.style.opacity = '0';
      bus.onRender?.();
    };
    const tap = () => {
      const i = bus.nearest;
      if (i < 0 || bus.wake[i] <= 0.4) return;
      const t = touched.current;
      if (t[t.length - 1] !== i) t.push(i);
      egg.touch(i);
      bus.onRender?.();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') move(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      tap();
      leave();
    };

    el.addEventListener('pointermove', onPointer);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('click', tap);
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('touchmove', onTouch, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('pointermove', onPointer);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('click', tap);
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('touchend', onTouchEnd);
    };
    // egg.touch and egg.find are stable enough: they only add to a ref and set state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus]);

  const quiet = isQuiet(nights);

  return (
    <section ref={section} aria-labelledby="starway-title" className="relative z-10 h-[360vh]">
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={veil} aria-hidden className="pointer-events-none absolute inset-0 bg-background opacity-0" />
        {near && (
          <Suspense fallback={null}>
            <StarwayScene nights={nights} bus={bus} />
          </Suspense>
        )}
        <div
          ref={light}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-10 -ml-[110px] -mt-[110px] h-[220px] w-[220px] rounded-full opacity-0"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.16) 30%, transparent 70%)' }}
        />
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          <polyline ref={trail} {...THREAD} />
          <line ref={thread} stroke="hsl(var(--primary))" strokeWidth="1" style={{ opacity: 0 }} />
        </svg>
        <div ref={label} aria-hidden className="clinical-label pointer-events-none absolute left-0 top-0 text-foreground opacity-0" />

        <div ref={intro} className="container pointer-events-none relative mx-auto max-w-6xl px-6 pt-28 md:pt-32">
          <Heading />
          <p className={`mt-6 max-w-[34ch] ${BODY_CLASS}`}>{HINT}</p>
          {quiet && <p className={`mt-4 max-w-[34ch] ${BODY_CLASS}`}>{QUIET}</p>}
        </div>
        <div className="container absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-16">
          <div ref={outro} className="pointer-events-none max-w-[34ch] opacity-0">
            <p className={BODY_CLASS}>{ASK}</p>
          </div>
        </div>
      </div>
      <Egg open={egg.open} onClose={egg.close} />
    </section>
  );
}

export default function Starway() {
  const { mode } = useRenderMode();
  const nights = useNights();
  return (
    <div id="starway" className="pb-32 md:pb-48">
      {!nights ? <div className="h-[100svh]" /> : mode === 'full' ? <StarwayFlight nights={nights} /> : <StarwayStill nights={nights} />}
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
