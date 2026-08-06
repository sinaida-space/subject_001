import { useEffect, useRef, useState } from 'react';

// ── Character scramble, user-triggered ──
// Renders `text` as-is until `runId` changes, then sweeps a scramble across it
// left to right and resolves back to the real string. Nothing runs on mount:
// the page is only ever allowed to move because someone asked it to (hovering
// or tapping the heading on /statement).
//
// The real text is what lives in the DOM before and after a run, so it stays
// selectable, copyable, and indexable. During a run the element is marked
// aria-busy so assistive tech doesn't announce the intermediate garbage.

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/\\<>*#%+=~';

/** Fraction of the run each character spends scrambled before it resolves. */
const HOLD = 0.35;

interface ScrambleTextProps {
  text: string;
  /** Changing this starts a run. 0 means "never run yet". */
  runId: number;
  /** Milliseconds to wait before this block starts, so blocks cascade. */
  delayMs?: number;
  durationMs?: number;
  className?: string;
}

export default function ScrambleText({
  text,
  runId,
  delayMs = 0,
  durationMs = 900,
  className,
}: ScrambleTextProps) {
  const [display, setDisplay] = useState(text);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef(0);

  // Keep the rendered string in sync if the copy itself changes between runs.
  useEffect(() => {
    setDisplay(text);
  }, [text]);

  useEffect(() => {
    if (runId === 0) return;

    // Per-character resolve points: mostly left to right, with enough jitter
    // that the edge reads as noise settling instead of a wipe.
    const thresholds = Array.from({ length: text.length }, (_, i) => {
      const base = (i / Math.max(1, text.length)) * (1 - HOLD);
      return base + Math.random() * HOLD;
    });

    let start = 0;
    setBusy(true);

    const tick = (now: number) => {
      if (start === 0) start = now;
      const elapsed = now - start - delayMs;

      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const progress = elapsed / durationMs;
      if (progress >= 1) {
        setDisplay(text);
        setBusy(false);
        return;
      }

      let out = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        // Whitespace is never scrambled: swapping it would reflow every line
        // under the cursor, which looks like a bug rather than an effect.
        if (char === ' ' || char === '\n' || char === ' ' || progress > thresholds[i]) {
          out += char;
        } else {
          out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
      setDisplay(out);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
      setDisplay(text);
      setBusy(false);
    };
  }, [runId, text, delayMs, durationMs]);

  return (
    <span className={className} aria-busy={busy || undefined}>
      {display}
    </span>
  );
}
