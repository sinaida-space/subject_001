// ── Dive overlay (#119), lazily loaded. A full-viewport layer that lives only
// for one dive: its own WebGL2 canvas plays the projector beam, the route
// changes under the final frame, then the layer fades and the context is
// destroyed. Without WebGL2 (or on a phone that failed the probe) it falls
// back to a plain 200 ms cross-fade through void.

import { useEffect, useRef } from 'react';
import { createDiveRenderer, DUR_IN, DUR_OUT, type DiveRenderer } from './diveRenderer';
import type { DiveRun } from './DiveHost';
import { diveBus } from '@/lib/diveBus';

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

// The card rises out of the effect: the pattern dissolves cell by cell over
// it while the camera drifts a little further, and closing plays the same
// frames backwards (cells re-form over the card, then the camera flies out).
const DISSOLVE_MS = 560;
const LAND_DRIFT = 0.06; // extra dive progress drifted through during the dissolve

const easeInOutSine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

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

    // Play p from → to (and the dissolve d0 → d1, eased) over dur ms, one
    // frame per rAF, nothing after it ends.
    const play = async (from: number, to: number, dur: number, d0 = 0, d1 = 0) => {
      const t0 = await nextFrame();
      for (;;) {
        const now = await nextFrame();
        if (!alive || !renderer) return;
        const k = Math.min(1, (now - t0) / dur);
        renderer.render(from + (to - from) * k, d0 + (d1 - d0) * easeInOutSine(k));
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
        renderer.render(0.45);
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
          // the card is up under the pattern: dissolve it away cell by cell
          await play(end, Math.min(1, end + LAND_DRIFT), DISSOLVE_MS, 0, 1);
        } else {
          await fade(root, 1, 0, 260);
        }
      } else if (run.close) {
        // Card closing, the landing played backwards: the cells re-form over
        // the card, the card goes under them, then the camera flies back out
        // into its node. Aimed at the node where it sits now (the page is
        // scroll-locked under the card), so the rig matches the way in.
        const from = run.landAt ?? 1;
        const node = run.anchor.startsWith('node:') ? diveBus.locateNode(run.anchor.slice(5)) : null;
        renderer.aim(node);
        renderer.render(Math.min(1, from + LAND_DRIFT), 1);
        await play(Math.min(1, from + LAND_DRIFT), from, DISSOLVE_MS, 1, 0);
        if (!alive) return;
        run.close();
        await nextFrame();
        await nextFrame();
        if (!alive) return;
        if (!node) renderer.aim(locate(run.anchor));
        await play(from, 0, DUR_OUT * from);
      } else {
        // Back: hold the hero frame while the previous page mounts, then fly
        // out of the image and back into the control that launched it.
        renderer.render(1);
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
