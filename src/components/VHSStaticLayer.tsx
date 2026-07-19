import { useMemo } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';

// feTurbulence noise tile, sampled once as a data URI — no canvas, no
// per-frame JS. The stepped background-position animation (see
// .vhs-static-grain in index.css) is what makes it read as film grain.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>
<rect width='100%' height='100%' filter='url(#n)'/>
</svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

/**
 * Ambient VHS static — scanlines + animated grain + a rare tracking-jitter
 * band, mounted once at the app root. Dark mode only: returns null in lite
 * mode so light mode carries zero trace of the layer, not just an invisible
 * one. All animation lives behind `prefers-reduced-motion: no-preference`
 * in CSS (see index.css); under reduced motion the scanline texture is the
 * only thing left, static.
 */
export default function VHSStaticLayer() {
  const { mode } = useRenderMode();

  // Randomize the jitter sweep's phase once per mount (negative delay into
  // the loop) so it doesn't tick in lockstep across tabs/reloads — a single
  // one-time random pick, not a per-frame driver.
  const jitterDelay = useMemo(() => `-${(Math.random() * 13).toFixed(2)}s`, []);
  const jitterTop = useMemo(() => `${(10 + Math.random() * 75).toFixed(1)}%`, []);

  if (mode === 'lite') return null;

  return (
    <div className="vhs-static-layer" aria-hidden="true">
      <div className="vhs-static-scanlines" />
      <div className="vhs-static-grain" style={{ backgroundImage: GRAIN_URL }} />
      <div
        className="vhs-static-jitter"
        style={{ top: jitterTop, animationDelay: jitterDelay }}
      />
    </div>
  );
}
