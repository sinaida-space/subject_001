// ─────────────────────────────────────────────────────────────────────────
// Work build (#121): About → Body of Work.
//
//   pour   "I build living visual systems…" stays readable and sheds a copy
//          of its dust: 3 px cells fall, letter by letter, into the BODY OF
//          WORK title and the line under it, and the real type takes over
//   map    then the map builds itself (drawn by ConstellationFull from
//          workBuildBus): sound, space, code, body, one impulse handed on
//          star to star, then the skill names, then the works, a turn of
//          the sphere and two heartbeats
//
// Driven by scroll, but latched: once something is built it stays built
// while you scroll around Work. Only when you scroll back up far enough for
// About to come apart again does the build rewind with you.
//
// Desktop gives the map its own scroll room (the graph holds still while
// it builds); on phones the long map builds as it scrolls through.
// Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';
import { sampleText, type Cell } from '@/lib/sampleText';
import { workBuildBus } from '@/lib/workBuildBus';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// The pour runs while the title's top travels from POUR_A to POUR_B (screen
// heights); About's paragraph sits just above it and has been read by then.
const POUR_A = 0.97;
const POUR_B = 0.36;
// Once About's bottom edge drops back below this, About is coming apart:
// the build lets go of its latch and rewinds with the scroll.
const RESET_AT = 0.95;

type Grain = { sx: number; sy: number; dx: number; dy: number; t0: number; drift: number; red: boolean };

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function WorkBuild({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const about = document.getElementById('about');
    const heading = root?.querySelector<HTMLElement>('[data-work-heading]');
    if (!root || !canvas || !ctx || !about || !heading) return;
    const title = heading.querySelector<HTMLElement>('h2');
    const intro = heading.querySelector<HTMLElement>('p');
    if (!title || !intro) return;

    workBuildBus.set(0);

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    // the grains: sampled once the paragraph exists (it mounts with its reveal)
    let grains: Grain[] | null = null;
    const findPara = () =>
      Array.from(about.querySelectorAll<HTMLElement>('p')).find((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim().startsWith('I build living')) ?? null;
    const sample = () => {
      const para = findPara();
      if (!para) return null;
      const sy = window.scrollY;
      const pb = para.getBoundingClientRect();
      const hb = heading.getBoundingClientRect();
      // sampled in the natural state: the heading must be laid out but may be transparent
      const src = sampleText(para, () => false, pb, false);
      const dstT = sampleText(title, () => false, title.getBoundingClientRect(), false);
      const dstI = sampleText(intro, () => false, intro.getBoundingClientRect(), false);
      if (!src.length || !dstT.length) return null;
      const rand = rng(121);
      const tl = title.getBoundingClientRect();
      const il = intro.getBoundingClientRect();
      const make = (d: Cell, red: boolean, order: number): Grain => {
        const s = src[(rand() * src.length) | 0];
        return {
          // source relative to the paragraph, target relative to the heading block,
          // so both follow their own element (the heading is sticky on desktop)
          sx: s.x - pb.left, sy: s.y - (pb.top + sy),
          dx: d.x - hb.left, dy: d.y - (hb.top + sy),
          t0: order * 0.62 + rand() * 0.06,
          drift: (rand() - 0.5) * 110,
          red,
        };
      };
      return [
        ...dstT.map((d) => make(d, true, 0.75 * ((d.x - tl.left) / Math.max(1, tl.width)))),
        ...dstI.map((d) => make(d, false, 0.55 + 0.45 * ((d.x - il.left) / Math.max(1, il.width)) * 0.6)),
      ];
    };

    // writes only on change
    const written = new Map<HTMLElement, string>();
    const op = (el: HTMLElement, v: string) => {
      if (written.get(el) === v) return;
      written.set(el, v);
      el.style.opacity = v;
    };
    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      if (!on) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    let trackH = -1;
    let pourL = 0;
    let mapL = 0;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      const reset = about.getBoundingClientRect().bottom > vh * RESET_AT;

      // ── the pour
      const tt = title.getBoundingClientRect().top;
      const pourP = lin(tt, POUR_A * vh, POUR_B * vh);
      pourL = reset ? pourP : Math.max(pourL, pourP);

      // ── the map: the track holds still (desktop) over its room, or scrolls through (phones)
      const track = root.querySelector<HTMLElement>('[data-build-track]');
      const room = root.querySelector<HTMLElement>('[data-build-room]');
      let mapP = 0;
      // the graph loads lazily and can change height: keep its sticky offset in step
      if (track && track.scrollHeight !== trackH) {
        trackH = track.scrollHeight;
        placeTrack();
      }
      if (track) {
        const tr = track.getBoundingClientRect();
        if (room && room.offsetHeight > 0) {
          const rr = room.getBoundingClientRect();
          // from the graph's top at 35 % of the screen until the room has scrolled past
          const a = vh * 0.35 + tr.height;
          mapP = clamp01((a - rr.top) / (vh * 0.3 + room.offsetHeight));
        } else {
          mapP = clamp01((vh * 0.6 - tr.top) / Math.max(1, tr.height - vh * 0.3));
        }
      }
      if (pourL < 1) mapP = 0;
      mapL = reset ? mapP : Math.max(mapL, mapP);
      workBuildBus.set(mapL);

      // ── the heading: hidden until poured, then the real type
      const crisp = lin(pourL, 0.93, 1);
      op(title, crisp >= 1 ? '' : crisp.toFixed(3));
      op(intro, crisp >= 1 ? '' : crisp.toFixed(3));

      if (pourL <= 0 || pourL >= 1) {
        show(false);
        return;
      }
      if (!grains) grains = sample();
      const para = findPara();
      if (!grains || !para) {
        show(false);
        return;
      }

      const w = window.innerWidth;
      const pb = para.getBoundingClientRect();
      const hb = heading.getBoundingClientRect();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, vh);
      const cell = 2.4;
      for (const g of grains) {
        const t = lin(pourL, g.t0, g.t0 + 0.3);
        if (t <= 0) continue;
        const sx = pb.left + g.sx, sy = pb.top + g.sy;
        const dx = hb.left + g.dx, dy = hb.top + g.dy;
        // falls like dust under gravity, swaying once on the way
        const x = mix(sx, dx, t) + Math.sin(t * Math.PI) * g.drift;
        const y = mix(sy, dy, t * t);
        if (y < -10 || y > vh + 10) continue;
        ctx.fillStyle = t < 0.8 ? 'rgba(240,235,227,0.92)' : g.red ? '#cd0000' : 'rgba(240,235,227,0.65)';
        ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
      }
      show(true);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    // the graph holds still where it fits: 5 % from the top, or higher if it is taller than the screen
    const placeTrack = () => {
      const track = root.querySelector<HTMLElement>('[data-build-track]');
      const room = root.querySelector<HTMLElement>('[data-build-room]');
      if (!track || !room || room.offsetHeight === 0) return;
      const vh = window.innerHeight;
      track.style.top = `${Math.round(Math.min(vh * 0.05, vh * 0.97 - track.scrollHeight))}px`;
    };
    placeTrack();
    const onResize = () => {
      resize();
      placeTrack();
      grains = null;
      schedule();
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      title.style.opacity = '';
      intro.style.opacity = '';
      workBuildBus.set(1);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ width: '100vw', height: '100vh', visibility: 'hidden' }}
      />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
