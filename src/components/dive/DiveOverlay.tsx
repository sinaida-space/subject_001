// ── Dive overlay (#119), lazily loaded. A full-viewport layer that lives only
// for one dive: its own WebGL2 canvas plays the projector beam, the route
// changes under the final frame, then the layer fades and the context is
// destroyed. Without WebGL2 (or on a phone that failed the probe) it falls
// back to a plain 200 ms cross-fade through void.

import { useEffect, useRef } from 'react';
import { createDiveRenderer, DUR_IN, DUR_OUT, type DiveRenderer } from './diveRenderer';
import type { DiveRun } from './DiveHost';

const PROBE_KEY = 'sinaida:dive-probe';
const PROBE_MS = 1000;
const PROBE_MIN_FPS = 50;

interface Props {
  run: DiveRun;
  /** forward: navigate under the final frame; resolves once the page is painted */
  arrive: (run: DiveRun) => Promise<void>;
  /** reverse: bring the launching control into view, return its centre */
  locate: (anchor: string) => { x: number; y: number } | null;
  onDone: () => void;
}

const nextFrame = () => new Promise<number>((r) => requestAnimationFrame(r));

const CARD_MS = 380; // card rising out of / sinking into the effect

export default function DiveOverlay({ run, arrive, locate, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let renderer: DiveRenderer | null = null;
    const canvas = canvasRef.current!;
    const veil = veilRef.current!;
    const root = rootRef.current!;

    // Play p from → to over dur ms, one frame per rAF, nothing after it ends.
    const play = async (from: number, to: number, dur: number) => {
      const t0 = await nextFrame();
      for (;;) {
        const now = await nextFrame();
        if (!alive || !renderer) return;
        const k = Math.min(1, (now - t0) / dur);
        renderer.render(from + (to - from) * k, (now - t0) / 1000);
        if (k >= 1) return;
      }
    };
    const fade = (el: HTMLElement, from: number, to: number, ms: number) =>
      el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: 'linear', fill: 'forwards' }).finished.catch(
        () => undefined,
      );

    // Phones without a stored probe: render the heaviest frame for 1 s, unseen.
    const probe = async () => {
      canvas.style.opacity = '0';
      const t0 = await nextFrame();
      let frames = 0;
      let now = t0;
      while (alive && renderer && now - t0 < PROBE_MS) {
        renderer.render(0.45, 0);
        now = await nextFrame();
        frames++;
      }
      const pass = (frames * 1000) / Math.max(now - t0, 1) >= PROBE_MIN_FPS;
      try {
        sessionStorage.setItem(PROBE_KEY, pass ? 'pass' : 'fail');
      } catch {
        /* storage blocked: probe again next time */
      }
      canvas.style.opacity = '';
      return pass;
    };

    const crossFade = async () => {
      if (run.close) {
        await fade(veil, 0, 1, 100);
        run.close();
      } else if (run.dir === 'in') {
        await fade(veil, 0, 1, 100);
        await arrive(run);
      } else {
        veil.style.opacity = '1';
        await nextFrame();
        await nextFrame();
        locate(run.anchor);
      }
      if (alive) await fade(veil, 1, 0, 100);
    };

    (async () => {
      if (run.mode !== 'fade') renderer = createDiveRenderer(canvas, run.dialect, run.image);
      if (renderer && run.mode === 'probe' && run.dir === 'in' && !(await probe())) {
        renderer.dispose();
        renderer = null;
      }
      if (!renderer) {
        await crossFade();
      } else if (run.dir === 'in') {
        renderer.aim(run.origin ?? null);
        const end = run.landAt ?? 1;
        await play(0, end, DUR_IN * end);
        if (!alive) return;
        await arrive(run);
        if (run.land) {
          // the card rises out of the effect: keep flying a little while it fades
          await Promise.all([play(end, Math.min(1, end + 0.1), CARD_MS), fade(root, 1, 0, CARD_MS)]);
        } else {
          await fade(root, 1, 0, 260);
        }
      } else if (run.close) {
        // Card closing: the effect re-forms over the card, the card goes
        // under it, then the camera flies back out into its node.
        const from = run.landAt ?? 1;
        root.style.opacity = '0';
        veil.style.opacity = '0';
        renderer.render(from, 0);
        await fade(root, 0, 1, CARD_MS);
        if (!alive) return;
        run.close();
        await nextFrame();
        await nextFrame();
        if (!alive) return;
        renderer.aim(locate(run.anchor));
        await play(from, 0, DUR_OUT * from);
      } else {
        // Back: hold the hero frame while the previous page mounts, then fly
        // out of the image and back into the control that launched it.
        renderer.render(1, 0);
        veil.style.opacity = '0';
        await nextFrame();
        await nextFrame();
        if (!alive) return;
        renderer.aim(locate(run.anchor));
        await play(1, 0, DUR_OUT);
      }
      if (alive) onDone();
    })();

    return () => {
      alive = false;
      renderer?.dispose();
    };
    // one overlay instance per run: the host remounts it with a new key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-0 z-[200]" aria-hidden="true" style={{ cursor: 'progress' }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={veilRef}
        className="absolute inset-0 bg-background"
        // a reverse dive starts covered, so the page underneath never flashes
        style={{ opacity: run.dir === 'out' && !run.close ? 1 : 0 }}
      />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
