import type { ReactNode } from 'react';

// ── The ground (#179) ──
// The logo's heartbeat stretched into a horizon: one red line from edge to
// edge of the screen, one beat near its start, the name after it, and the
// rest of the line the street the footer's towers stand on. The beat still
// opens Snake. With `draw` the line is traced left to right by the caller's
// `--ground` (0..1, a pure function of scroll) with a bright head at the
// pen, like a monitor drawing its trace; without it the line is simply there.

const RED = 'hsl(var(--primary-legible))';
const GLOW = 'drop-shadow(0 0 3px hsl(0 100% 50% / 0.7))';

// one beat, 120 × 40, baseline at y 24: P, Q, the R spike, S, T
const BEAT = 'M0 24 H30 Q34 19 38 24 H45 L48 27 L53 3 L58 33 L61 24 H72 Q79 15 86 24 H120';

export default function EcgGround({
  draw = false,
  wordmark,
  onBeat,
  className = '',
}: {
  draw?: boolean;
  wordmark?: ReactNode;
  onBeat?: () => void;
  className?: string;
}) {
  const line = { background: RED, filter: GLOW };
  return (
    <div
      aria-hidden={wordmark || onBeat ? undefined : true}
      className={`relative w-full ${className}`}
      style={draw ? { clipPath: 'inset(-40px calc((1 - var(--ground, 1)) * 100%) -40px 0)' } : undefined}
    >
      <div className="site-frame">
        <div className="relative flex h-10 items-center" data-city-ground>
          {/* from the screen's left edge to the beat */}
          <span aria-hidden="true" className="pointer-events-none absolute right-full top-[24px] h-[1.5px] w-[100vw]" style={line} />
          <button
            type="button"
            onClick={onBeat}
            tabIndex={onBeat ? 0 : -1}
            aria-label={onBeat ? 'Heartbeat. Play Snake' : undefined}
            aria-hidden={onBeat ? undefined : true}
            className="relative block h-10 w-[120px] shrink-0 cursor-none p-0"
            style={{ background: 'none', border: 'none' }}
          >
            <svg viewBox="0 0 120 40" width="120" height="40" className="block overflow-visible" style={{ filter: GLOW }}>
              <path d={BEAT} fill="none" stroke={RED} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </button>
          {wordmark && <span className="relative mt-[5px] shrink-0 self-start px-3 leading-none">{wordmark}</span>}
          {/* on to the right edge of the screen: the street */}
          <span aria-hidden="true" className="pointer-events-none relative top-[4px] h-[1.5px] flex-1" style={line}>
            <span className="absolute left-full top-0 h-full w-[100vw]" style={line} />
          </span>
        </div>
      </div>
      {draw && (
        // the pen: a brighter point at the head of the trace while it draws
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[24px] h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: 'calc(var(--ground, 1) * 100%)',
            opacity: 'var(--ground-pen, 0)',
            background: '#fff',
            boxShadow: '0 0 8px 2px hsl(0 100% 55%), 0 0 2px #fff',
          }}
        />
      )}
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
