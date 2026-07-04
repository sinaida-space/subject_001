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
  accent?: boolean;
  hx: number; // home x (layout)
  hy: number;
  x: number; // live x
  y: number;
  vx: number;
  vy: number;
  depth: number; // parallax depth factor (skills drift more than heavy stars)
  r: number; // core radius (css px)
}

interface Pulse {
  edge: number; // edge index
  t: number; // 0..1 along a→b
}

const { nodes: GNODES, edges: GEDGES } = buildGraph();
const ADJ = buildAdjacency(GEDGES);

// Edges belonging to a hero project (e.a is the project id, e.b the skill — see
// buildGraph). These render "lit" at rest so the two flagship chains read as lead
// stars without any hover. Static baseline opacity — not a timer, motion-law compliant.
const HERO_PROJECT_IDS = new Set(GNODES.filter((n) => n.kind === 'project' && n.accent).map((n) => n.id));
const HERO_EDGES = new Set<number>();
GEDGES.forEach((e, i) => {
  if (HERO_PROJECT_IDS.has(e.a) || HERO_PROJECT_IDS.has(e.b)) HERO_EDGES.add(i);
});

// Neutral warm-gray for skill labels at rest — kills the "rainbow dashboard" look.
// The category color returns only as a hover/active response (see label drawing).
const SKILL_LABEL_REST = 'rgba(240,239,233,0.5)';

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

// Detect coarse (touch) pointers → scroll drives parallax; fine → pointer drives it.
const IS_COARSE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

interface Props {
  onActiveProject?: (p: GraphNode['project'] | null) => void;
}

export default function ConstellationFull({ onActiveProject }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const mountedRef = useRef(false);

  const nodesRef = useRef<RNode[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const activeRef = useRef<string | null>(null); // hovered / selected node id
  // Rendered label bounding boxes from the last frame, so the hit test can
  // count "hovering the label text" as hovering the node it belongs to — not
  // just the tiny star dot. Rebuilt every frame from what's actually drawn.
  const labelBoxesRef = useRef<Map<string, { x1: number; y1: number; x2: number; y2: number }>>(new Map());
  const pointerRef = useRef({ x: -9999, y: -9999, inside: false });
  // Parallax target: where the input wants the field to drift toward this frame.
  // (0,0) = home. Recomputed only on pointermove (desktop) or scroll (touch).
  const parallaxRef = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 });
  const dragRef = useRef<{ node: RNode | null; moved: boolean; downX: number; downY: number; downTime: number }>({
    node: null,
    moved: false,
    downX: 0,
    downY: 0,
    downTime: 0,
  });
  // Timestamp of the last real input (pointermove / scroll / hover / tap). The rAF
  // loop keeps scheduling only while there was input recently OR motion is still
  // settling; once everything is at rest it draws one final frame and stops — no
  // perpetual idle loop, nothing moves without a user action.
  const lastInputRef = useRef(0);
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
    parallaxRef.current.cx = w / 2;
    parallaxRef.current.cy = h / 2;

    const { nodes } = computeLayout(GNODES, GEDGES, { width: w, height: h });
    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    nodesRef.current = nodes.map((n) => {
      const old = prev.get(n.id);
      const r = n.kind === 'project' ? 2.6 + n.weight * 3.4 : 2.1;
      return {
        id: n.id,
        label: n.label,
        kind: n.kind,
        color: n.color,
        weight: n.weight,
        project: n.project,
        accent: n.accent,
        hx: n.x,
        hy: n.y,
        x: old?.x ?? n.x,
        y: old?.y ?? n.y,
        vx: 0,
        vy: 0,
        // Skills (connective haze) drift more; heavy hero stars stay steadier.
        depth: n.kind === 'project' ? 0.5 + (1.4 - Math.min(n.weight, 1.4)) * 0.4 : 1,
        r,
      };
    });
  }, []);

  // ── Hit testing (css px, live positions) ──
  // Counts as a hit if the pointer is either near the star's core OR anywhere
  // over that node's currently-rendered label text — a visible label is part
  // of the target, not just decoration next to it.
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
    if (best) return best;
    for (const n of nodesRef.current) {
      const box = labelBoxesRef.current.get(n.id);
      if (box && px >= box.x1 && px <= box.x2 && py >= box.y1 && py <= box.y2) {
        return n;
      }
    }
    return null;
  }, []);

  const setActive = useCallback(
    (id: string | null) => {
      if (activeRef.current === id) return;
      activeRef.current = id;
      lastInputRef.current = performance.now();
      const node = id ? nodesRef.current.find((n) => n.id === id) : null;
      if (node) {
        // spawn ECG pulses along the active node's edges (only on hover/tap)
        GEDGES.forEach((e, i) => {
          if (e.a === id || e.b === id) pulsesRef.current.push({ edge: i, t: 0 });
        });
      }
      onActiveProject?.(node?.kind === 'project' ? node.project ?? null : null);
      start();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onActiveProject],
  );

  // ── Touch/mobile: scroll progress within the section → parallax drift ──
  const updateScrollParallax = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // progress 0..1 as the section travels through the viewport
    const raw = (vh - rect.top) / (vh + rect.height);
    const p = Math.max(0, Math.min(1, raw));
    const range = 22; // small drift range in css px
    parallaxRef.current.tx = 0;
    parallaxRef.current.ty = (p - 0.5) * 2 * range;
    lastInputRef.current = performance.now();
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── The frame ──
  const frame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    const now = performance.now();
    const nodes = nodesRef.current;
    const active = activeRef.current;
    const neighbors = active ? ADJ.get(active) ?? new Set<string>() : null;
    const ptr = pointerRef.current;
    const par = parallaxRef.current;

    // Desktop parallax target: offset the whole field toward pointer position
    // relative to section center. Recomputed here from the latest pointer value,
    // but the pointer value itself only changes on pointermove — so with no input
    // the target is constant and the field settles to rest. (Touch sets par.tx/ty
    // from scroll instead; par stays at its last scrolled value with no motion.)
    if (!IS_COARSE) {
      if (ptr.inside) {
        const maxDrift = 18;
        par.tx = ((ptr.x - par.cx) / (w / 2 || 1)) * maxDrift;
        par.ty = ((ptr.y - par.cy) / (h / 2 || 1)) * maxDrift;
      } else {
        par.tx = 0;
        par.ty = 0;
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // ── physics: spring each node toward home + input-driven parallax offset ──
    const drag = dragRef.current;
    let settling = false; // any node still meaningfully in motion?
    for (const n of nodes) {
      if (drag.node === n && drag.moved) {
        n.x = ptr.x;
        n.y = ptr.y;
        n.vx = 0;
        n.vy = 0;
        settling = true;
        continue;
      }
      // Target = home + parallax drift (scaled by node depth). No time term.
      let tx = n.hx + par.tx * n.depth;
      let ty = n.hy + par.ty * n.depth;
      // pointer gravity (presence) — already correctly gated on ptr.inside
      if (ptr.inside && !IS_COARSE) {
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
      if (Math.abs(n.vx) > 0.05 || Math.abs(n.vy) > 0.05 || Math.abs(tx - n.x) > 0.4 || Math.abs(ty - n.y) > 0.4) {
        settling = true;
      }
    }

    const nodeById = (id: string) => nodes.find((n) => n.id === id)!;

    // ── edges ──
    ctx.lineWidth = 1;
    for (let i = 0; i < GEDGES.length; i++) {
      const e = GEDGES[i];
      const a = nodeById(e.a);
      const b = nodeById(e.b);
      const touchesActive = !!active && (e.a === active || e.b === active);
      // Hero chains lit at rest; everything else a much quieter haze — a
      // lighter ambient web reads as spacious instead of a dense net of lines.
      let op = HERO_EDGES.has(i) ? 0.22 : 0.035;
      if (active) op = touchesActive ? 0.5 : 0.015;
      ctx.strokeStyle = hexA(e.color, op);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // ── ECG pulses travelling along edges (spawned only from setActive) ──
    ctx.globalCompositeOperation = 'lighter';
    pulsesRef.current = pulsesRef.current.filter((p) => p.t <= 1);
    if (pulsesRef.current.length) settling = true;
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

    // ── node glows (additive) — static size, no time-driven pulsing ──
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let intensity = 1;
      if (active && !isActive && !isNeighbor) intensity = n.accent ? 0.55 : 0.28;
      const hover = isActive ? 1.7 : isNeighbor ? 1.25 : n.accent ? 1.15 : 1;
      const spr = glowSprite(n.color);
      const base = n.kind === 'project' ? 12 + n.weight * 12 : 9;
      const s = base * hover;
      ctx.globalAlpha = (n.kind === 'project' ? 0.75 : 0.4) * intensity;
      ctx.drawImage(spr, n.x - s / 2, n.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // ── node cores ──
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let intensity = 1;
      if (active && !isActive && !isNeighbor) intensity = n.accent ? 0.6 : 0.35;
      const rr = n.r * (isActive ? 1.5 : n.accent ? 1.15 : 1);
      ctx.beginPath();
      ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = n.kind === 'project' ? hexA('#ffffff', 0.9 * intensity) : hexA(n.color, 0.9 * intensity);
      ctx.fill();
      if (n.kind === 'project') {
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(n.color, 0.8 * intensity);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // ── labels ──
    // Declutter + color discipline: skill labels sit in a neutral warm-gray at rest
    // and only take on their category color when active/neighbor (hover response) —
    // no ambient rainbow. Project names stay quiet until traced into, except the two
    // hero works and the accent skills, which stay named at all times. Before drawing
    // any label we test its bounding box against labels already drawn this frame and
    // skip on collision, so no two labels ever overlap.
    const isMobile = w < 640;
    ctx.textBaseline = 'middle';
    const drawn: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const LABEL_H = 15; // approx line box height for collision tests
    labelBoxesRef.current.clear(); // rebuilt below from what's actually drawn this frame
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let show = false;
      let alpha = 0;
      let useCategoryColor = false;
      if (n.kind === 'project') {
        show = isActive || !!isNeighbor || !!n.accent;
        alpha = isActive ? 1 : isNeighbor ? 0.85 : n.accent ? 0.85 : 0;
      } else {
        // skills: named only on hover/active/neighbor, or if they're accent skills.
        // Mobile matches desktop now — hidden until tapped (no always-on clutter).
        show = isActive || !!isNeighbor || !!n.accent;
        if (active) {
          alpha = isActive ? 1 : isNeighbor ? 0.9 : n.accent ? 0.55 : 0;
          useCategoryColor = isActive || !!isNeighbor;
        } else {
          alpha = n.accent ? 0.9 : 0;
          useCategoryColor = false; // accent skills at rest read as neutral warm-gray
        }
      }
      if (!show || alpha <= 0.02) continue;
      const fs = n.kind === 'project' ? (n.weight >= 1.4 ? 13 : 12) : 11;
      ctx.font = `${n.kind === 'project' || n.accent ? 500 : 400} ${fs}px 'Space Mono', monospace`;
      // Flip the label to the left when it would run off the right edge.
      const tw = ctx.measureText(n.label).width;
      const flip = n.x + n.r + 8 + tw > w - 6;
      const lx = flip ? n.x - n.r - 8 - tw : n.x + n.r + 8;
      const ty = n.y;
      // collision check against already-drawn labels this frame
      const box = { x1: lx - 2, y1: ty - LABEL_H / 2, x2: lx + tw + 2, y2: ty + LABEL_H / 2 };
      let collides = false;
      for (const d of drawn) {
        if (box.x1 < d.x2 && box.x2 > d.x1 && box.y1 < d.y2 && box.y2 > d.y1) {
          collides = true;
          break;
        }
      }
      // Never let a hovered/active label be suppressed — it wins over ambient ones.
      if (collides && !isActive) continue;
      drawn.push(box);
      labelBoxesRef.current.set(n.id, box);
      ctx.textAlign = flip ? 'right' : 'left';
      const tx = flip ? n.x - n.r - 8 : n.x + n.r + 8;
      let color: string;
      if (n.kind === 'project') color = hexA('#f2efe9', alpha);
      else if (useCategoryColor) color = hexA(n.color, alpha);
      else color = SKILL_LABEL_REST;
      ctx.fillStyle = color;
      if (isActive) {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillText(n.label, tx, ty);
      ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';

    // ── Self-terminating loop: keep scheduling only while there was recent input
    // or motion is still settling. Once at rest, draw this final static frame and
    // stop — nothing animates without a user action, and the loop isn't perpetual.
    const recentInput = now - lastInputRef.current < 150;
    if (runningRef.current && (settling || recentInput)) {
      rafRef.current = requestAnimationFrame(frame);
    } else {
      runningRef.current = false;
      rafRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (runningRef.current || !mountedRef.current) return;
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
    mountedRef.current = true;
    layout();
    // Draw one static frame immediately so the graph is visible at rest without
    // any input (the frame itself schedules nothing further if there's no motion).
    lastInputRef.current = performance.now();
    start();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        layout();
        lastInputRef.current = performance.now();
        start();
      }, 150);
    };
    window.addEventListener('resize', onResize);

    // Touch/mobile: scroll within the section drives parallax (never a timer).
    const onScroll = () => {
      if (IS_COARSE) updateScrollParallax();
    };
    if (IS_COARSE) window.addEventListener('scroll', onScroll, { passive: true });

    // pause off-screen / when tab hidden. IntersectionObserver only *enables*
    // rendering; it does not itself cause motion — a static frame is drawn, then
    // the loop settles and stops until real input arrives.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') {
          lastInputRef.current = performance.now();
          start();
        } else stop();
      },
      { threshold: 0.05 },
    );
    if (wrapRef.current) io.observe(wrapRef.current);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (wrapRef.current) {
          const r = wrapRef.current.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) {
            lastInputRef.current = performance.now();
            start();
          }
        }
      } else stop();
    };
    document.addEventListener('visibilitychange', onVis);

    // cross-highlight from lists
    const unsub = constellationBus.subscribe((id) => {
      setActive(id);
      const node = id ? nodesRef.current.find((n) => n.id === id) : null;
      if (node) {
        const { w } = sizeRef.current;
        setTooltip({ x: Math.min(w - 20, node.x), y: node.y, node });
      } else if (!pointerRef.current.inside) {
        setTooltip(null);
      }
    });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', onResize);
      if (IS_COARSE) window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
      unsub();
      stop();
    };
  }, [layout, start, stop, setActive, updateScrollParallax]);

  // ── pointer handlers ──
  const toLocal = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = toLocal(e);
    pointerRef.current = { x, y, inside: true };
    lastInputRef.current = performance.now();
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
    start();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = toLocal(e);
    pointerRef.current = { x, y, inside: true };
    lastInputRef.current = performance.now();
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
    start(); // pointer moved → resume the loop (settles & stops when input ceases)
  };

  const navigate = (node: RNode) => {
    if (node.project) constellationBus.focusWork(node.id);
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
    lastInputRef.current = performance.now();
    start();
  };

  const onPointerLeave = () => {
    pointerRef.current.inside = false;
    lastInputRef.current = performance.now();
    if (!dragRef.current.node) {
      setActive(null);
      setTooltip(null);
    }
    start(); // resume so the field springs back home, then settles & stops
  };

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: 'clamp(520px, 84vh, 940px)' }}>
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
