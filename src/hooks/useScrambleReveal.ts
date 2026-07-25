import { useEffect, useRef, useState } from 'react';
import { scrambleText, SCRAMBLE_CHARS_LIGHT } from '@/lib/scramble';

interface Options {
  /** ms before the first scrambled frame paints */
  delay?: number;
  /** total duration of the resolve, ms */
  duration?: number;
  /** skip the animation entirely (lite mode / reduced motion) */
  disabled?: boolean;
  /** noise alphabet; defaults to the display-safe light set */
  chars?: string;
}

/**
 * Resolves `text` out of ASCII noise once, on mount, then leaves it alone
 * forever. Deliberately not tied to an IntersectionObserver: the hero is
 * already on screen at first paint, and scrolling back up to it must not
 * re-fire the reveal.
 */
export function useScrambleReveal(
  text: string,
  { delay = 0, duration = 720, disabled = false, chars = SCRAMBLE_CHARS_LIGHT }: Options = {}
) {
  const [display, setDisplay] = useState(() => (disabled ? text : scrambleText(text, 1, chars)));
  const doneRef = useRef(disabled);

  useEffect(() => {
    if (doneRef.current) {
      setDisplay(text);
      return;
    }

    const STEP = 45;
    const steps = Math.max(1, Math.round(duration / STEP));
    let frame = 0;
    let interval: number | undefined;

    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        frame += 1;
        // Ease-out: most glyphs lock early, the last few hold the noise a
        // beat longer so the resolve doesn't land all at once.
        const t = frame / steps;
        const amount = Math.max(0, 1 - t * t);
        if (frame >= steps) {
          window.clearInterval(interval);
          doneRef.current = true;
          setDisplay(text);
          return;
        }
        setDisplay(scrambleText(text, amount, chars));
      }, STEP);
    }, delay);

    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
    // Runs once per mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return display;
}
