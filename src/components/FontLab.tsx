import { useEffect, useState } from 'react';

// ── FontLab — dev-only heading font A/B switcher (issue #21) ──
// Compares three self-hosted heading-font candidates against the committed
// default (Geist) live on localhost via `?fontlab=1`. Everything here is
// gated behind that query param: no attribute, no listeners, no font
// payload, no panel for a normal visitor. Selecting a candidate lazily
// imports its @fontsource CSS on click, so the three extra font families
// never touch the normal page load.

type CandidateId = 'geist' | 'dotgothic16' | 'handjet' | 'chakra-petch';

interface Candidate {
  id: CandidateId;
  label: string;
  stack: string;
  /** dynamic import of the @fontsource CSS; undefined for the default (Geist, already loaded) */
  load?: () => Promise<unknown>;
}

const GEIST_STACK = "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif";

const CANDIDATES: Candidate[] = [
  { id: 'geist', label: 'Geist (current)', stack: GEIST_STACK },
  {
    id: 'dotgothic16',
    label: 'DotGothic16',
    stack: "'DotGothic16', system-ui, sans-serif",
    load: () => import('@fontsource/dotgothic16/400.css'),
  },
  {
    id: 'handjet',
    label: 'Handjet (600+)',
    stack: "'Handjet Variable', system-ui, sans-serif",
    load: () => import('@fontsource-variable/handjet/wght.css'),
  },
  {
    id: 'chakra-petch',
    label: 'Chakra Petch',
    stack: "'Chakra Petch', system-ui, sans-serif",
    load: () =>
      Promise.all([
        import('@fontsource/chakra-petch/500.css'),
        import('@fontsource/chakra-petch/600.css'),
        import('@fontsource/chakra-petch/700.css'),
      ]),
  },
];

function isActive(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('fontlab') === '1';
}

export default function FontLab() {
  const [active] = useState(isActive);
  const [current, setCurrent] = useState<CandidateId>('geist');
  const [loading, setLoading] = useState<CandidateId | null>(null);

  useEffect(() => {
    if (!active) return;
    document.documentElement.setAttribute('data-fontlab', '');
    return () => {
      document.documentElement.removeAttribute('data-fontlab');
      document.documentElement.style.removeProperty('--font-display-candidate');
    };
  }, [active]);

  if (!active) return null;

  const select = async (candidate: Candidate) => {
    if (candidate.load) {
      setLoading(candidate.id);
      try {
        await candidate.load();
      } catch {
        // A failed dynamic import shouldn't strand the switcher — the
        // variable still flips below; worst case the browser falls
        // through to the stack's system fallback font.
      } finally {
        setLoading(null);
      }
    }
    document.documentElement.style.setProperty('--font-display-candidate', candidate.stack);
    setCurrent(candidate.id);
  };

  return (
    <div
      // Fixed dark chrome regardless of site theme — this is a dev-only
      // overlay, not themed UI, so its own colors are literal (white-ish
      // on black) rather than `text-foreground`/`border-foreground`, which
      // resolve to near-black in lite mode and were unreadable against the
      // always-black panel background.
      className="fixed bottom-4 right-4 z-[9998] w-56 border border-primary/30 bg-black/90 p-3 font-mono text-[11px] text-white/80 backdrop-blur-sm"
      style={{ fontFamily: GEIST_STACK }}
    >
      <div className="mb-2 uppercase tracking-[0.15em] text-white/40">Font lab — headings</div>
      <div className="flex flex-col gap-1">
        {CANDIDATES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => select(c)}
            className={`border px-2 py-1 text-left transition-colors ${
              current === c.id
                ? 'border-primary bg-primary/10 text-white'
                : 'border-white/15 text-white/60 hover:border-white/40'
            }`}
          >
            {c.label}
            {loading === c.id ? '…' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
