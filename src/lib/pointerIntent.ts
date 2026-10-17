// Hover easter eggs must answer the visitor's own movement, never a cursor
// that was already resting on the element when the page opened. Browsers fire
// mouseenter as soon as layout settles under a still pointer, so hover alone
// cannot tell the two apart. Eggs arm only after a real pointermove and a
// short settle period after that first move.

const SETTLE_MS = 1200;

let firstMoveAt: number | null = null;

if (typeof window !== 'undefined') {
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    firstMoveAt = performance.now();
    window.removeEventListener('pointermove', onMove);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
}

/** True once the visitor has moved the mouse and the settle period has passed. */
export const pointerArmed = (): boolean =>
  firstMoveAt !== null && performance.now() - firstMoveAt >= SETTLE_MS;

// Je suis le spectre d'une rose que tu portais hier au bal.
