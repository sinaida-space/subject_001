import { useEffect, useState } from 'react';

// ── Case pages hydrate their build-time render (studio#16) ──
// main.tsx sets `active` right before hydrateRoot. React adopts the app
// shell first and the content inside App's <Suspense> in a later pass, so
// the signal that everything is adopted comes from inside that boundary
// (HydrationDone in App.tsx), not from the root.
//
// While `active`, anything that reads the browser during render starts from
// the value the build-time render used and corrects itself in an effect, and
// anything that writes to the DOM or to shared state waits for afterHydration.

let resolveDone: () => void = () => {};
const done = new Promise<void>((resolve) => {
  resolveDone = resolve;
});

export const hydration = {
  active: false,
  finish() {
    if (!hydration.active) return;
    hydration.active = false;
    resolveDone();
  },
};

/** Runs fn now, or once a hydrating page has adopted all of its markup. */
export function afterHydration(fn: () => void): void {
  if (hydration.active) void done.then(fn);
  else fn();
}

/** false on the first render, true from the first commit on. For parts that
 * exist only in the browser (lazy WebGL layers): a build-time render cannot
 * resolve their chunk, and a boundary left unresolved there would make
 * hydration client-render it. Lives here, in the main chunk, so the pages
 * using it share no extra request. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
