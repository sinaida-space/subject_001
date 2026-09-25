import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { chunkForPath } from '@/lib/routeChunks';

// Two small navigation upgrades, handled once at the document level so no
// individual link has to opt in:
//
// 1. Prefetch: hovering or focusing an in-app link starts loading that
//    route's chunk, so by the time the click lands the page is ready.
// 2. Transition: clicking an in-app link to another page swaps it inside
//    document.startViewTransition as a raster scan (styles in index.css).
//    It is triggered by the visitor's click, so it sits within the motion
//    law. Skipped under prefers-reduced-motion and in browsers without the
//    API.
//
// Only paths chunkForPath recognises are touched, and only plain left
// clicks: modifier clicks, target/download links, other origins and
// same-page hash jumps keep their native behaviour.

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

function internalLink(target: EventTarget | null): HTMLAnchorElement | null {
  const a = (target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || a.target || a.hasAttribute('download')) return null;
  if (a.origin !== window.location.origin) return null;
  return chunkForPath(a.pathname) ? a : null;
}

export default function RouteEnhancer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const warmed = new Set<string>();
    const prefetch = (e: Event) => {
      const a = internalLink(e.target);
      if (!a || warmed.has(a.pathname)) return;
      warmed.add(a.pathname);
      chunkForPath(a.pathname)?.().catch(() => warmed.delete(a.pathname));
    };
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);
    return () => {
      document.removeEventListener('pointerover', prefetch);
      document.removeEventListener('focusin', prefetch);
    };
  }, []);

  useEffect(() => {
    const doc = document as ViewTransitionDocument;
    if (!doc.startViewTransition) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onClick = (e: MouseEvent) => {
      if (reduce.matches || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = internalLink(e.target);
      if (!a || a.hash || a.pathname === pathname) return;
      // Capture phase runs before React's handlers. <Link> skips its own
      // navigation when the event is already defaultPrevented, while any
      // onClick a link carries (closing a menu, say) still runs.
      e.preventDefault();
      const to = a.pathname + a.search;
      // Load the chunk first, so the transition's "after" snapshot shows the
      // page and not the Suspense fallback.
      Promise.resolve(chunkForPath(a.pathname)?.())
        .catch(() => undefined)
        .then(() => {
          // The beam only exists in the new state, so it enters the
          // transition as its own layer above both page snapshots.
          const beam = document.createElement('div');
          beam.className = 'raster-beam';
          beam.setAttribute('aria-hidden', 'true');
          const vt = doc.startViewTransition!(() => {
            flushSync(() => navigate(to));
            document.body.appendChild(beam);
          });
          vt.finished.finally(() => beam.remove());
        });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate, pathname]);

  return null;
}
