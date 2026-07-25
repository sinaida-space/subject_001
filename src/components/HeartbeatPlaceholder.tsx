import { useEffect, useRef, useState } from 'react';

interface HeartbeatPlaceholderProps {
  /** Whether the real content has finished loading. Transition false→true fires the pulse. */
  loaded: boolean;
  /** Reserved box width. Defaults to 100%. */
  width?: number | string;
  /** Reserved box height (ignored if aspectRatio is set and width is fluid). */
  height?: number | string;
  /** CSS aspect-ratio for the reserved box, e.g. "1 / 1" or "16 / 9". */
  aspectRatio?: string;
  className?: string;
}

let uid = 0;

// A single flatline that spikes exactly once — driven by the `loaded` prop
// flipping false → true (an onLoad callback from the real asset), never a
// timer. Ties the loading moment to the site's ECG/heartbeat brand identity
// instead of a generic spinner.
export default function HeartbeatPlaceholder({
  loaded,
  width = '100%',
  height,
  aspectRatio,
  className,
}: HeartbeatPlaceholderProps) {
  const [pulsing, setPulsing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevLoaded = useRef(false);
  const idRef = useRef(`hb-${uid++}`);

  useEffect(() => {
    if (loaded && !prevLoaded.current) {
      // Real content just arrived: play exactly one pulse, then fade the
      // placeholder out to reveal the content underneath/instead.
      setPulsing(true);
      const pulseEnd = setTimeout(() => setPulsing(false), 700);
      const fadeEnd = setTimeout(() => setHidden(true), 900);
      return () => {
        clearTimeout(pulseEnd);
        clearTimeout(fadeEnd);
      };
    }
    prevLoaded.current = loaded;
  }, [loaded]);

  if (hidden) return null;

  const id = idRef.current;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width,
        height,
        aspectRatio,
        position: 'relative',
        overflow: 'hidden',
        background: 'hsl(var(--sinaida-red) / 0.03)',
        border: '1px solid hsl(var(--sinaida-red) / 0.12)',
        opacity: loaded ? 0 : 1,
        transition: 'opacity 0.35s ease 0.55s',
        pointerEvents: 'none',
      }}
    >
      <style>{`
        @keyframes ${id}-sweep {
          0% { stroke-dashoffset: 800; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Dim resting flatline */}
        <line
          x1="0" y1="50" x2="400" y2="50"
          stroke="hsl(var(--sinaida-red) / 0.15)"
          strokeWidth="1.5"
        />
        {/* One heartbeat spike, drawn once on load, never looping */}
        {pulsing && (
          <path
            d="M0,50 L160,50 L172,20 L184,80 L196,50 L400,50"
            fill="none"
            stroke="hsl(var(--sinaida-red))"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={800}
            style={{
              strokeDasharray: 800,
              animation: `${id}-sweep 0.65s ease-out 1`,
            }}
          />
        )}
      </svg>
    </div>
  );
}
