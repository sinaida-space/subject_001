import { useCallback, useEffect, useRef, useState } from 'react';
import { buildGraph, buildAdjacency, type GraphNode } from '@/data/graph';
import { computeLayout } from '@/lib/layout';
import { constellationBus } from '@/lib/constellationBus';

// ── Runtime node (base "home" from layout + live physics) ──
interface RNode {
  id: string;
  label: string;
  kind: 'project' | 'skill';
  color: string;
  weight: number;
  project?: GraphNode['project'];
  hx: number; // home x (layout)
  hy: number;
  x: number; // live x
  y: number;
  vx: number;
  vy: number;
  phase: number;
  driftX: number;
  driftY: number;
  r: number; // core radius (css px)
  glow: number; // 0..1 flatline multiplier (usually 1)
  flatUntil: number; // timestamp while flatlined
}

interface Pulse {
  edge: number; // edge index
  t: number; // 0..1 along a→b
}

const { nodes: GNODES, edges: GEDGES } = buildGraph();
const ADJ = buildAdjacency(GEDGES);

// ── Pre-baked radial glow sprite, one per colour (additive bloom, no shader) ──
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string): HTMLCanvasElement {
  const cached = glowCache.get(color);
  if (cached) return cached;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.18, hexA(color, 0.55));
  grad.addColorStop(0.5, hexA(color, 0.12));
  grad.addColorStop(1, hexA(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowCache.set(color, c);
  return c;
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

interface Props {
  onActiveProject?: (p: GraphNode['project'] | null) => void;
}

export default function ConstellationFull({ onActiveProject }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const nodesRef = useRef<RNode[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const activeRef = useRef<string | null>(null); // hovered / selected node id
  const pointerRef = useRef({ x: -9999, y: -9999, inside: false });
  const dragRef = useRef<{ node: RNode | null; moved: boolean; downX: number; downY: number; downTime: number }>({
    node: null,
    moved: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  });
  const lastIdlePulse = useRef(0);
  const lastFlatline = useRef(0);
  const timeRef = useRef(0);
  const lastTapRef = useRef<string | null>(null); // touch: id previewed by last tap

  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: RNode } | null>(null);

  // ── Layout / sizing ──
  const layout = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    sizeRef.current = { w, h, dpr };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const { nodes } = computeLayout(GNODES, GEDGES, { width: w, height: h });
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    nodesRef.current = nodes.map((n, i) => {
      const old = prev.get(n.id);
      const r = n.kind === 'project' ? 2.6 + n.weight * 3.4 : 2.1;
      return {
        id: n.id,
        label: n.label,
        kind: n.kind,
        color: n.color,
        weight: n.weight,
        project: n.project,
        hx: n.x,
        hy: n.y,
        x: old?.x ?? n.x,
        y: old?.y ?? n.y,
        vx: 0,
        vy: 0,
        phase: (i * 137.5 * Math.PI) / 180,
        driftX: n.kind === 'project' ? 3 : 6,
        driftY: n.kind === 'project' ? 3 : 6,
        r,
        glow: 1,
        flatUntil: 0,
      };
    });
  }, []);

  // ── Hit testing (css px, live positions) ──
  const hitTest = useCallback((px: number, py: number): RNode | null => {
    let best: RNode | null = null;
    let bestD = Infinity;
    for (const n of nodesRef.current) {
      const dx = n.x - px;
      const dy = n.y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      const pad = (n.kind === 'project' ? 16 : 12) + n.r;
      if (d < pad && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }, []);

  const setActive = useCallback(
    (id: string | null) => {
      if (activeRef.current === id) return;
      activeRef.current = id;
      const node = id ? nodesRef.current.find((n) => n.id === id) : null;
      if (node) {
        // spawn ECG pulses along the active node's edges
        GEDGES.forEach((e, i) => {
          if (e.a === id || e.b === id) pulsesRef.current.push({ edge: i, t: 0 });
        });
      }
      onActiveProject?.(node?.kind === 'project' ? node.project ?? null : null);
    },
    [onActiveProject],
  );

  // ── The frame ──
  const frame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    const now = performance.now();
    timeRef.current += 0.016;
    const t = timeRef.current;
    const nodes = nodesRef.current;
    const active = activeRef.current;
    const neighbors = active ? ADJ.get(active) ?? new Set<string>() : null;
    const ptr = pointerRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // rare "flatline" glitch — one node's glow dies then re-ignites
    if (now - lastFlatline.current > 14000 && Math.random() < 0.01) {
      lastFlatline.current = now;
      const cand = nodes[Math.floor(Math.random() * nodes.length)];
      if (cand && cand.id !== active) cand.flatUntil = now + 900;
    }

    // idle pulse cycle
    if (now - lastIdlePulse.current > 2400 && GEDGES.length) {
      lastIdlePulse.current = now;
      pulsesRef.current.push({ edge: Math.floor(Math.random() * GEDGES.length), t: 0 });
    }

    // ── physics ──
    const drag = dragRef.current;
    for (const n of nodes) {
      if (drag.node === n && drag.moved) {
        n.x = ptr.x;
        n.y = ptr.y;
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      const bx = n.hx + Math.sin(t * 0.5 + n.phase) * n.driftX;
      const by = n.hy + Math.cos(t * 0.42 + n.phase) * n.driftY;
      let tx = bx;
      let ty = by;
      // pointer gravity (presence)
      if (ptr.inside) {
        const dx = ptr.x - n.x;
        const dy = ptr.y - n.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const R = 170;
        if (d < R && d > 0.001) {
          const pull = (1 - d / R) * 14;
          tx += (dx / d) * pull;
          ty += (dy / d) * pull;
        }
      }
      n.vx += (tx - n.x) * 0.06;
      n.vy += (ty - n.y) * 0.06;
      n.vx *= 0.86;
      n.vy *= 0.86;
      n.x += n.vx;
      n.y += n.vy;
      // flatline glow recovery
      n.glow = n.flatUntil > now ? Math.max(0, (n.flatUntil - now) / 900 < 0.7 ? 0.05 : n.glow) : Math.min(1, n.glow + 0.03);
      if (n.flatUntil <= now && n.glow < 1) n.glow = Math.min(1, n.glow + 0.04);
    }

    const nodeById = (id: string) => nodes.find((n) => n.id === id)!;

    // ── edges ──
    ctx.lineWidth = 1;
    for (let i = 0; i < GEDGES.length; i++) {
      const e = GEDGES[i];
      const a = nodeById(e.a);
      const b = nodeById(e.b);
      const touchesActive = !!active && (e.a === active || e.b === active);
      let op = 0.07;
      if (active) op = touchesActive ? 0.5 : 0.025;
      ctx.strokeStyle = hexA(e.color, op);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // ── ECG pulses travelling along edges ──
    ctx.globalCompositeOperation = 'lighter';
    pulsesRef.current = pulsesRef.current.filter((p) => p.t <= 1);
    for (const p of pulsesRef.current) {
      p.t += 0.022;
      const e = GEDGES[p.edge];
      if (!e) continue;
      const a = nodeById(e.a);
      const b = nodeById(e.b);
      const px = a.x + (b.x - a.x) * p.t;
      const py = a.y + (b.y - a.y) * p.t;
      const fade = Math.sin(p.t * Math.PI); // bright in the middle
      const spr = glowSprite(e.color);
      const s = 26 * fade + 6;
      ctx.globalAlpha = 0.9 * fade;
      ctx.drawImage(spr, px - s / 2, py - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    // ── node glows (additive) ──
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let intensity = 1;
      if (active && !isActive && !isNeighbor) intensity = 0.28;
      const hover = isActive ? 1.7 : isNeighbor ? 1.25 : 1;
      const spr = glowSprite(n.color);
      const base = n.kind === 'project' ? 12 + n.weight * 12 : 9;
      const s = base * hover * (0.85 + 0.15 * Math.sin(t * 1.3 + n.phase));
      ctx.globalAlpha = (n.kind === 'project' ? 0.75 : 0.4) * intensity * n.glow;
      ctx.drawImage(spr, n.x - s / 2, n.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // ── node cores ──
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let intensity = 1;
      if (active && !isActive && !isNeighbor) intensity = 0.35;
      const rr = n.r * (isActive ? 1.5 : 1) * n.glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = n.kind === 'project' ? hexA('#ffffff', 0.9 * intensity * n.glow) : hexA(n.color, 0.9 * intensity * n.glow);
      ctx.fill();
      if (n.kind === 'project') {
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(n.color, 0.8 * intensity * n.glow);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // ── labels ──
    const isMobile = w < 640;
    ctx.textBaseline = 'middle';
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let show = false;
      let alpha = 0;
      if (n.kind === 'project') {
        // Desktop: all project stars are always named. Mobile: only on tap
        // (persistent labels overlap/clip on a narrow canvas).
        show = isMobile ? isActive || !!isNeighbor : true;
        alpha = active ? (isActive ? 1 : isNeighbor ? 0.85 : 0.12) : 0.82;
      } else {
        // skills: only when active cluster involves them, or hovered
        show = isActive || !!isNeighbor;
        alpha = isActive ? 1 : isNeighbor ? 0.7 : 0;
      }
      if (!show || alpha <= 0.02) continue;
      const fs = n.kind === 'project' ? (n.weight >= 1.4 ? 13 : 12) : 11;
      ctx.font = `${n.kind === 'project' ? 500 : 400} ${fs}px 'Space Mono', monospace`;
      // Flip the label to the left when it would run off the right edge.
      const tw = ctx.measureText(n.label).width;
      const flip = n.x + n.r + 8 + tw > w - 6;
      ctx.textAlign = flip ? 'right' : 'left';
      const tx = flip ? n.x - n.r - 8 : n.x + n.r + 8;
      const ty = n.y;
      ctx.fillStyle = hexA(n.kind === 'project' ? '#f2efe9' : n.color, alpha);
      if (isActive) {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillText(n.label, tx, ty);
      ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';

    if (runningRef.current) rafRef.current = requestAnimationFrame(frame);
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(frame);
  }, [frame]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // ── mount ──
  useEffect(() => {
    layout();
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    };
    window.addEventListener('resize', onResize);

    // pause off-screen / when tab hidden
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') start();
        else stop();
      },
      { threshold: 0.05 },
    );
    if (wrapRef.current) io.observe(wrapRef.current);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (wrapRef.current) {
          const r = wrapRef.current.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) start();
        }
      } else stop();
    };
    document.addEventListener('visibilitychange', onVis);

    // cross-highlight from lists
    const unsub = constellationBus.subscribe((id) => {
      setActive(id);
      const node = id ? nodesRef.current.find((n) => n.id === id) : null;
      if (node) {
        const { w, h } = sizeRef.current;
        setTooltip({ x: Math.min(w - 20, node.x), y: node.y, node });
      } else if (!pointerRef.current.inside) {
        setTooltip(null);
      }
    });

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
      unsub();
      stop();
    };
  }, [layout, start, stop, setActive]);

  // ── pointer handlers ──
  const toLocal = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = toLocal(e);
    pointerRef.current = { x, y, inside: true };
    const node = hitTest(x, y);
    dragRef.current = { node, moved: false, downX: x, downY: y, downTime: performance.now() };
    if (node) {
      setActive(node.id);
      try {
        canvasRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* pointer may not be capturable (e.g. synthetic events) */
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = toLocal(e);
    pointerRef.current = { x, y, inside: true };
    const drag = dragRef.current;
    if (drag.node) {
      if (Math.hypot(x - drag.downX, y - drag.downY) > 4) drag.moved = true;
    }
    // hover highlight + tooltip (desktop)
    if (e.pointerType === 'mouse' && !drag.moved) {
      const node = hitTest(x, y);
      setActive(node ? node.id : null);
      if (node) {
        const { w } = sizeRef.current;
        setTooltip({ x: Math.min(w - 20, node.x), y: node.y, node });
      } else {
        setTooltip(null);
      }
    }
    canvasRef.current!.style.cursor = hitTest(x, y) ? 'pointer' : 'default';
  };

  const navigate = (node: RNode) => {
    if (node.project?.url) {
      window.open(node.project.url, '_blank', 'noopener,noreferrer');
    } else if (node.project?.featured) {
      constellationBus.focusWork(node.id);
      document.getElementById(`work-${node.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const wasTap = !drag.moved && performance.now() - drag.downTime < 500;
    const node = drag.node;
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    if (wasTap) {
      if (node && e.pointerType === 'mouse') {
        navigate(node);
      } else if (node) {
        // touch: first tap on a node previews (active + tooltip);
        // second tap on the SAME node opens it.
        if (node.project && lastTapRef.current === node.id) {
          navigate(node);
          lastTapRef.current = null;
        } else {
          setActive(node.id);
          const { w } = sizeRef.current;
          setTooltip({ x: Math.min(w - 20, node.x), y: node.y, node });
          lastTapRef.current = node.id;
        }
      } else {
        // tapped empty space → dismiss
        lastTapRef.current = null;
        setActive(null);
        setTooltip(null);
      }
    }
    // release drag → spring back handled by physics (home)
    dragRef.current = { node: null, moved: false, downX: 0, downY: 0, downTime: 0 };
  };

  const onPointerLeave = () => {
    pointerRef.current.inside = false;
    if (!dragRef.current.node) {
      setActive(null);
      setTooltip(null);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: 'clamp(440px, 72vh, 780px)' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 max-w-[240px] -translate-y-full font-mono"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="border border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm">
            <div
              className="text-[12px] font-medium"
              style={{ color: tooltip.node.kind === 'project' ? '#f2efe9' : tooltip.node.color }}
            >
              {tooltip.node.kind === 'project' ? tooltip.node.project?.title : tooltip.node.label}
            </div>
            {tooltip.node.project?.tagline && (
              <div className="mt-1 text-[10px] leading-snug text-white/55">{tooltip.node.project.tagline}</div>
            )}
            {tooltip.node.project && (
              <div className="mt-1.5 text-[9px] uppercase tracking-[0.2em] text-white/35">
                {tooltip.node.project.url ? 'open ↗' : tooltip.node.project.featured ? 'view below ↓' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
