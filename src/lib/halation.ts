// Red film halation: white display headlines carry a faint red bloom, like
// light spreading through the red layer of colour film. CSS cannot select by
// computed font size, so this marks the large ones with data-halation and
// index.css paints a static text-shadow on them. Measured on mount, on
// resize and when new display text is added; never per frame.

/** Display text larger than this (CSS px) gets the halation. */
const MIN_SIZE_PX = 48;

function mark(scope: ParentNode) {
  const els = scope.querySelectorAll<HTMLElement>('.font-display');
  for (const el of els) {
    const big = parseFloat(getComputedStyle(el).fontSize) > MIN_SIZE_PX;
    if (big !== el.hasAttribute('data-halation')) el.toggleAttribute('data-halation', big);
  }
}

/** Starts marking; returns a cleanup function. */
export function startHalation(): () => void {
  if (typeof document === 'undefined') return () => {};
  let raf: number | null = null;
  // Coalesce bursts (route change, lazy sections, resize) into one scan.
  const schedule = () => {
    if (raf == null) {
      raf = requestAnimationFrame(() => {
        raf = null;
        mark(document);
      });
    }
  };

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n instanceof HTMLElement && (n.classList.contains('font-display') || n.querySelector('.font-display'))) {
          schedule();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    if (raf != null) cancelAnimationFrame(raf);
    document.querySelectorAll('[data-halation]').forEach((el) => el.removeAttribute('data-halation'));
  };
}

// Je suis le spectre d'une rose que tu portais hier au bal.
