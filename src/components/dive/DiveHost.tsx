// ── Dive host (#119). Always mounted inside the router, tiny and eager: it
// takes dive requests from the bus, notices Back out of a dived-into entry,
// and mounts the lazily loaded overlay only for the length of one dive. It
// also shows the DEPTH readout. Full mode only: in lite it registers nothing,
// so every control navigates plainly, exactly as before.

import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useRenderMode } from '@/hooks/useRenderMode';
import { diveBus, isDiveState, type Dialect, type DiveState } from '@/lib/diveBus';
import { routeChunks } from '@/lib/routeChunks';
import { projectById } from '@/data/projects';

const loadOverlay = () => import('./DiveOverlay');
const DiveOverlay = lazy(loadOverlay);

export type DiveMode = 'gl' | 'probe' | 'fade';
export interface DiveRun {
  id: number;
  dir: 'in' | 'out';
  mode: DiveMode;
  to?: string;
  land?: () => void;
  dialect: Dialect;
  image?: string;
  origin?: { x: number; y: number };
  anchor: string;
}

const MIND_PROBE_KEY = 'sinaida:mind-probe'; // written by the spacewalk phone probe (task 1)
const DIVE_PROBE_KEY = 'sinaida:dive-probe'; // written by our own 1 s probe

// The stored probe may be a bare word or JSON; anything not clearly a pass fails.
function parseProbe(v: string): boolean {
  if (/^(pass|passed|ok|full|1|true)$/i.test(v.trim())) return true;
  try {
    const j = JSON.parse(v);
    return j === true || (!!j && typeof j === 'object' && (j.pass === true || j.ok === true || j.result === 'pass'));
  } catch {
    return false;
  }
}

// Desktop dives always; phones only once a probe has passed, else cross-fade.
function pickMode(): DiveMode {
  const phone = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (!phone) return 'gl';
  try {
    for (const key of [MIND_PROBE_KEY, DIVE_PROBE_KEY]) {
      const v = sessionStorage.getItem(key);
      if (v != null) return parseProbe(v) ? 'gl' : 'fade';
    }
  } catch {
    return 'fade';
  }
  return 'probe';
}

const histIdx = () => {
  const i = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof i === 'number' ? i : 0;
};
const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
};
const scrollToCentre = (clientY: number) =>
  window.scrollTo({ top: window.scrollY + clientY - window.innerHeight / 2, behavior: 'instant' as ScrollBehavior });

// Bring the control that launched the dive into view; return its centre.
function locate(anchor: string): { x: number; y: number } | null {
  if (anchor.startsWith('node:')) {
    const id = anchor.slice(5);
    let pt = diveBus.locateNode(id);
    if (!pt) document.getElementById('work')?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    pt = pt ?? diveBus.locateNode(id);
    if (!pt) return null;
    scrollToCentre(pt.y);
    return diveBus.locateNode(id);
  }
  const el = document.querySelector(`[data-dive-anchor="${CSS.escape(anchor)}"]`);
  if (!el) return null;
  scrollToCentre(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2);
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function DepthReadout({ pathname, search }: { pathname: string; search: string }) {
  const slug = pathname.match(/^\/work\/([^/]+)\/?$/)?.[1];
  const isCase = !!slug && !!projectById(slug)?.caseStudy;
  if (pathname !== '/' && !isCase) return null;
  const depth = !isCase ? 0 : new URLSearchParams(search).get('depth') === '2' ? 2 : 1;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-30 font-mono text-[13px] uppercase tracking-[0.15em] text-foreground/65"
    >
      Depth <span className="text-primary-legible">0{depth}</span> / 02
    </div>
  );
}

export default function DiveHost() {
  const { mode } = useRenderMode();
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const [run, setRun] = useState<DiveRun | null>(null);
  const busy = useRef(false);
  const seq = useRef(0);

  // Forward dives: a node, the DEPTH mark or a thread asks through the bus.
  useEffect(() => {
    if (mode !== 'full') return;
    const t = window.setTimeout(() => loadOverlay().catch(() => undefined), 3000); // warm the chunk once idle
    const off = diveBus.setHandler((req) => {
      if (busy.current) return true; // one dive at a time; swallow the extra click
      busy.current = true;
      if (req.to?.startsWith('/work/')) routeChunks.work().catch(() => undefined);
      setRun({ id: ++seq.current, dir: 'in', mode: pickMode(), ...req });
      return true;
    });
    return () => {
      window.clearTimeout(t);
      off();
    };
  }, [mode]);

  // Reverse dives: Back out of an entry that was entered by a dive. Layout
  // effect, so the overlay covers the previous page before it paints.
  const prev = useRef({ key: location.key, state: location.state as unknown, idx: histIdx() });
  useLayoutEffect(() => {
    const before = prev.current;
    const idx = histIdx();
    prev.current = { key: location.key, state: location.state, idx };
    if (before.key === location.key || mode !== 'full' || busy.current) return;
    if (navType !== 'POP' || idx >= before.idx || !isDiveState(before.state)) return;
    busy.current = true;
    const { dialect, image, anchor } = before.state.dive;
    setRun({ id: ++seq.current, dir: 'out', mode: pickMode() === 'gl' ? 'gl' : 'fade', dialect, image, anchor });
  }, [location, navType, mode]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-diving', !!run);
  }, [run]);

  const arrive = useCallback(
    async (r: DiveRun) => {
      if (r.land) {
        r.land();
        await frames(2);
        return;
      }
      if (!r.to) return;
      if (r.to.startsWith('/work/')) await routeChunks.work().catch(() => undefined);
      const state: DiveState = { dive: { dialect: r.dialect, image: r.image, anchor: r.anchor } };
      const samePath = r.to.split('?')[0] === window.location.pathname;
      navigate(r.to, { state });
      await frames(2);
      if (samePath) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); // a new floor starts at its top
    },
    [navigate],
  );
  const onDone = useCallback(() => {
    busy.current = false;
    setRun(null);
  }, []);

  if (mode !== 'full') return null;
  return (
    <>
      <DepthReadout pathname={location.pathname} search={location.search} />
      {run && (
        <Suspense
          fallback={run.dir === 'out' ? <div className="fixed inset-0 z-[200] bg-background" aria-hidden="true" /> : null}
        >
          <DiveOverlay key={run.id} run={run} arrive={arrive} locate={locate} onDone={onDone} />
        </Suspense>
      )}
    </>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
