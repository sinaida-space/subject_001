import { useRenderMode } from '@/hooks/useRenderMode';

/**
 * Gate for the scroll-scrubbed melt effect. Conservative: any doubt → disabled,
 * falling back to plain static text (no filter, no stroke, no echoes).
 *
 * Checked once per mount (no resize listener) — this is a capability gate,
 * not a responsive breakpoint.
 */
export function useMeltEnabled(): boolean {
  const { mode } = useRenderMode();

  if (mode === 'lite') return false;
  if (typeof window === 'undefined') return false;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.innerWidth < 1025) return false;

  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|OPR|Firefox/.test(ua);
  if (isSafari) return false;

  return true;
}
