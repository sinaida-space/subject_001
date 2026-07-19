import { useId } from 'react';

type ECGTraceProps = {
  variant: 'hero' | 'ambient';
  className?: string;
};

// Hand-authored ECG waveform echoing public/og-skills.png: noisy low-amplitude
// baseline, a deep Q dip, a tall R spike near the top of the viewBox, an S
// undershoot, a rounded T bump, then noisy baseline out. pathLength="1000" is
// set on the path itself so stroke-dasharray/dashoffset math is a fixed
// constant everywhere it's used — no getTotalLength(), no rAF measurement.
const ECG_PATH_D =
  'M0,200 L40,197 L80,203 L120,199 L160,205 L200,196 L240,202 L280,198 L320,206 ' +
  'L360,195 L400,201 L440,197 L480,204 L520,198 L560,203 L600,199 ' +
  'L618,201 L636,235 L654,290 ' +
  'L668,150 L682,15 ' +
  'L696,150 L710,310 ' +
  'L724,255 L740,205 ' +
  'L760,175 L790,150 L820,165 L850,195 L870,200 ' +
  'L900,198 L940,204 L980,197 L1020,202 L1060,196 L1100,205 L1140,199 L1180,203 ' +
  'L1220,197 L1260,201 L1300,198 L1340,205 L1380,196 L1420,202 L1460,199 ' +
  'L1500,204 L1540,197 L1580,201 L1600,200';

export default function ECGTrace({ variant, className }: ECGTraceProps) {
  const uid = useId();
  const pathId = `ecg-trace-path-${uid}`;

  return (
    <div
      aria-hidden="true"
      className={[
        'ecg-trace',
        variant === 'hero' ? 'ecg-trace--hero' : 'ecg-trace--ambient',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        className="ecg-trace__svg"
        viewBox="0 0 1600 400"
        // Hero needs the waveform's actual proportions preserved at any
        // width (a stretched-to-fit spike on mobile turns near-vertical
        // and cuts through the headline it sits behind) — "meet" fits the
        // whole shape inside the band, letterboxed. Ambient is a thin
        // full-bleed sitewide texture band, not a legible waveform, so it
        // keeps filling edge-to-edge via "none" as before.
        preserveAspectRatio={variant === 'hero' ? 'xMidYMid meet' : 'none'}
        focusable="false"
      >
        <defs>
          <path id={pathId} d={ECG_PATH_D} pathLength={1000} fill="none" />
        </defs>

        {/* Layered strokes stand in for a blur filter (feGaussianBlur would
            re-rasterize every frame of an animated SVG) — three stacked
            copies of the same path, widening/dimming outward from the core
            stroke, form the glow. The group carries the "monitor retrace"
            opacity dip; each stroke carries its own dash-draw animation
            (dashoffset can't be animated on a <g>, only on the shapes). */}
        <g className="ecg-trace__retrace">
          <use href={`#${pathId}`} className="ecg-trace__glow ecg-trace__glow--wide" />
          <use href={`#${pathId}`} className="ecg-trace__glow ecg-trace__glow--mid" />
          <use href={`#${pathId}`} className="ecg-trace__glow ecg-trace__glow--core" />
        </g>

        {/* Sweep head — a bright dot riding the same path via offset-path,
            gated to browsers that support it and to no-preference motion.
            The glow is a second, larger, dimmer circle riding the same
            path rather than a blur filter — same layered-stroke logic as
            the trace itself, no per-frame rasterization. */}
        <circle
          className="ecg-trace__dot ecg-trace__dot--glow"
          r="9"
          style={{ offsetPath: `path("${ECG_PATH_D}")` }}
        />
        <circle
          className="ecg-trace__dot ecg-trace__dot--core"
          r="3.5"
          style={{ offsetPath: `path("${ECG_PATH_D}")` }}
        />
      </svg>
    </div>
  );
}
