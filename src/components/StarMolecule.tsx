import { useEffect, useMemo, useRef } from 'react';
import { MOLECULES, type MoleculeId } from '@/lib/molecules';
import { useRenderMode } from '@/hooks/useRenderMode';

// A molecule hidden in the starfield: at rest every atom is one star (grey
// carbon, a single red one per heteroatom) and there are no bonds, so it reads
// as a few more stars. The breathing is a CSS opacity loop on the canvas, see
// .molecule-breath. Bumping `flareKey` reveals it for `hold` ms: the stars
// brighten, thin dotted bonds appear like the constellation graph's figures,
// and an impulse runs outward along them, breadth-first from the first
// heteroatom. The rAF loop exists only for the length of that flare.

interface Star { x: number; y: number; r: number; a: number; h: boolean }
interface Edge { ax: number; ay: number; bx: number; by: number; depth: number; h: boolean }

const STEP = 140;    // ms between impulse generations
const TRAVEL = 320;  // ms for an impulse to cross one bond
const RAMP = 300, FADE = 900;

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function build(id: MoleculeId, W: number, H: number) {
  const m = MOLECULES[id];
  const xs = m.atoms.map((p) => p.x), ys = m.atoms.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = 8;
  const u = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
  const pts = m.atoms.map((p) => ({ x: W / 2 + (p.x - (x0 + x1) / 2) * u, y: H / 2 + (p.y - (y0 + y1) / 2) * u, h: p.h }));
  const r = rng(id.length * 7919 + 17);
  const stars: Star[] = pts.map((p) => ({ x: p.x, y: p.y, r: p.h ? 0.95 : 0.6 + r() * 0.25, a: p.h ? 0.85 : 0.45 + r() * 0.3, h: p.h }));

  // breadth-first depth from the first heteroatom, for the impulse wave
  const start = Math.max(0, pts.findIndex((p) => p.h));
  const depth = new Array(pts.length).fill(Infinity);
  depth[start] = 0;
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    for (const [a, b] of m.bonds) {
      const o = a === i ? b : b === i ? a : -1;
      if (o >= 0 && depth[o] === Infinity) { depth[o] = depth[i] + 1; queue.push(o); }
    }
  }
  const edges: Edge[] = m.bonds.map(([i, j]) => {
    const [f, t] = depth[i] <= depth[j] ? [i, j] : [j, i];
    return { ax: pts[f].x, ay: pts[f].y, bx: pts[t].x, by: pts[t].y, depth: depth[f], h: pts[t].h };
  });
  const maxDepth = Math.max(...edges.map((e) => e.depth));
  return { stars, edges, wave: maxDepth * STEP + TRAVEL };
}

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function StarMolecule({
  id, width, height, flareKey = 0, breathe = true, hold = 4500,
}: { id: MoleculeId; width: number; height: number; flareKey?: number; breathe?: boolean; hold?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { mode } = useRenderMode();
  const geo = useMemo(() => build(id, width, height), [id, width, height]);
  const drawRef = useRef<(boost: number, elapsed: number) => void>(() => {});

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const lite = mode !== 'full';
    const atom = token('--molecule-atom'), hetero = token('--molecule-hetero');
    const bright = token('--foreground'), brightRed = token('--primary-legible');

    drawRef.current = (boost, elapsed) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (boost) {
        // bonds: the graph's dotted figure lines, only while revealed
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `hsl(${atom} / ${(lite ? 0.8 : 0.55) * boost})`;
        ctx.beginPath();
        for (const e of geo.edges) { ctx.moveTo(e.ax, e.ay); ctx.lineTo(e.bx, e.by); }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const s of geo.stars) {
        const rad = s.r * (1 + boost * 0.5);
        if (s.h) {
          ctx.fillStyle = `hsl(${boost ? brightRed : hetero} / ${0.18 * (0.5 + boost)})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, rad * 2.6, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = `hsl(${s.h ? hetero : atom} / ${s.a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, 6.283); ctx.fill();
        if (boost) {
          ctx.fillStyle = `hsl(${s.h ? brightRed : bright} / ${Math.min(1, s.a * boost)})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, 6.283); ctx.fill();
        }
      }
      if (!boost) return;
      ctx.globalCompositeOperation = lite ? 'source-over' : 'lighter';
      for (const e of geo.edges) {
        const t = (elapsed - e.depth * STEP) / TRAVEL;
        if (t < 0 || t > 1) continue;
        const fade = Math.sin(t * Math.PI);
        const x = e.ax + (e.bx - e.ax) * t, y = e.ay + (e.by - e.ay) * t;
        const rad = 2 + 5 * fade;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `hsl(${e.h ? brightRed : bright} / ${0.9 * fade})`);
        g.addColorStop(1, `hsl(${e.h ? brightRed : bright} / 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };
    drawRef.current(0, 0);
  }, [geo, mode, width, height]);

  useEffect(() => {
    if (!flareKey) return;
    const still = mode !== 'full' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      drawRef.current(1, -1e6);
      const t = window.setTimeout(() => drawRef.current(0, 0), hold);
      return () => { clearTimeout(t); drawRef.current(0, 0); };
    }
    let raf = 0;
    const total = Math.max(hold, geo.wave + FADE);
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      if (el >= total) { drawRef.current(0, 0); return; }
      drawRef.current(Math.min(1, el / RAMP, (total - el) / FADE), el);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); drawRef.current(0, 0); };
  }, [flareKey, geo, mode, hold]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={breathe ? 'molecule-breath block' : 'block'}
      style={{ width, height }}
    />
  );
}
