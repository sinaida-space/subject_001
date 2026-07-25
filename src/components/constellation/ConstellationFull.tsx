import { useCallback, useEffect, useRef, useState } from 'react';
import { buildGraph, buildAdjacency, type GraphNode } from '@/data/graph';
import { computeLayout } from '@/lib/layout';
import { constellationBus } from '@/lib/constellationBus';
import { synth, type VoiceKind } from '@/lib/constellationSynth';
import SynthPanel from './SynthPanel';

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
// Stable project order for the touch/scroll cycling below — same order the
// graph is built in, not dependent on runtime layout.
const PROJECT_NODE_IDS = GNODES.filter((n) => n.kind === 'project').map((n) => n.id);
// Vertical space each project gets in the mobile top-down layout — tall
// enough that a project's own skill cluster has real room to breathe.
const MOBILE_BAND_HEIGHT = 640;

const HERO_EDGES = new Set<number>();
GEDGES.forEach((e, i) => {
  if (HERO_PROJECT_IDS.has(e.a) || HERO_PROJECT_IDS.has(e.b)) HERO_EDGES.add(i);
});

// Neutral warm-gray for skill labels at rest — kills the "rainbow dashboard" look.
// The category color returns only as a hover/active response (see label drawing).
// Hex (not rgba) so per-tier alpha can be applied via hexA at draw time.
const SKILL_LABEL_REST = '#f0efe9';

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
  onPointerPosition?: (x: number, y: number) => void;
}

export default function ConstellationFull({ onActiveProject, onPointerPosition }: Props) {
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
  // Hero baseline opacity, eased rather than snapped: 1 = full "just opened"
  // highlight on Redkie Ptitsy/The Eyes Chico's edges, fading toward 0 the moment
  // the pointer engages the canvas at all (not just when hovering a specific
  // star) — "the first thing you see, then it recedes once you start looking
  // around." Springs back to 1 once the pointer leaves and settles again.
  const heroFadeRef = useRef(1);
  // Parallax target: where the input wants the field to drift toward this frame.
  // (0,0) = home. Recomputed only on pointermove (desktop) or scroll (touch).
  const parallaxRef = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 });
  const dragRef = useRef<{
    node: RNode | null;
    moved: boolean;
    downX: number;
    downY: number;
    downTime: number;
    // Offset from the node's center to the exact point grabbed, so the star
    // keeps its position relative to the finger/cursor instead of snapping its
    // center to the pointer — mattered little for a precise mouse pointer, but
    // a fat fingertip grabbing off-center made touch drags feel broken.
    offX: number;
    offY: number;
  }>({
    node: null,
    moved: false,
    downX: 0,
    downY: 0,
    downTime: 0,
    offX: 0,
    offY: 0,
  });
  // Timestamp of the last real input (pointermove / scroll / hover / tap). The rAF
  // loop keeps scheduling only while there was input recently OR motion is still
  // settling; once everything is at rest it draws one final frame and stops — no
  // perpetual idle loop, nothing moves without a user action.
  const lastInputRef = useRef(0);
  const lastTapRef = useRef<string | null>(null); // touch: id previewed by last tap
  // Stars dragged and dropped stay where you leave them (their "pinned"
  // position) instead of springing home — that arrangement is the composition
  // the synth reads. The spring physics still pull toward the pinned point, so
  // the drop keeps its rubbery wobble. Reset (panel ■) clears this.
  const pinnedRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // One-second full-graph bloom on every drop: ramps to 1 on trigger, eases
  // back to 0. Purely user-action-driven (a drop), so motion-law compliant.
  const shineRef = useRef(0);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: RNode } | null>(null);
  // Only used on touch/coarse devices — the wrapper's height becomes content
  // driven (one band per project) instead of a fixed viewport-relative clamp,
  // so scrolling the page scrolls through the graph "top-down" a chapter at a
  // time. Desktop ignores this entirely (stays at the CSS clamp height).
  const [mobileHeight, setMobileHeight] = useState<number | null>(null);
  // The instrument reveals itself only after the first real drag: the control
  // panel mounts, and a one-time "you found it" window appears.
  const [synthReady, setSynthReady] = useState(false);
  const [showUnlockCard, setShowUnlockCard] = useState(false);
  // Gates the fixed audio control panel: true once a meaningful chunk of the
  // graph is in view (roughly "a couple of stars visible"), not just a sliver
  // at the edge. Drives `position: fixed` visibility directly instead of
  // relying on `position: sticky` inside an absolutely-positioned ancestor,
  // which was leaving the panel stuck off-screen at the bottom of the (very
  // tall, on mobile) graph wrapper instead of pinned to the viewport.
  const [panelVisible, setPanelVisible] = useState(false);

  // ── Layout / sizing ──
  const layout = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const w = rect.width;
    // Band (top-down) layout is a function of narrowness, not input device:
    // a free scatter physically cannot breathe under ~768px no matter how the
    // page is being pointed at. Coarse pointers also always get bands.
    // Narrow viewports get a taller-than-wide canvas and the SAME force layout
    // as desktop (now aspect-aware) — one connected web you scroll through,
    // instead of isolated per-project bands that left big vertical voids and a
    // curtain of long cross-band edges. Scroll still cycles the active project.
    const narrow = IS_COARSE || w < 768;
    const h = narrow ? Math.max(MOBILE_BAND_HEIGHT, Math.round(GNODES.length * 58)) : rect.height;
    if (narrow && h !== mobileHeight) setMobileHeight(h);
    else if (!narrow && mobileHeight !== null) setMobileHeight(null);
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
      const r =
        n.kind === 'project'
          ? n.project?.background
            ? 2.2 + n.weight * 2.0
            : 2.6 + n.weight * 3.4
          : 2.1;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileHeight]);

  // ── Hit testing (css px, live positions) ──
  // Counts as a hit if the pointer is either near the star's core OR anywhere
  // over that node's currently-rendered label text — a visible label is part
  // of the target, not just decoration next to it. `coarse` widens the core
  // radius for touch: a fingertip's real contact area is far bigger than a
  // mouse pointer's, and the original mouse-tuned padding (12–16px) meant most
  // touch attempts to grab a star simply missed it.
  const hitTest = useCallback((px: number, py: number, coarse = false): RNode | null => {
    let best: RNode | null = null;
    let bestD = Infinity;
    const bonus = coarse ? 22 : 0;
    for (const n of nodesRef.current) {
      const dx = n.x - px;
      const dy = n.y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      const pad = (n.kind === 'project' ? 16 : 12) + n.r + bonus;
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

  // Only project nodes get a floating tooltip — it carries tagline + an
  // action hint the canvas label doesn't show. Skill nodes have nothing
  // beyond their name, which the canvas already labels directly, so a
  // tooltip there would just duplicate it on screen.
  const showTooltip = useCallback((node: RNode) => {
    if (node.kind !== 'project') {
      setTooltip(null);
      return;
    }
    const { w } = sizeRef.current;
    setTooltip({ x: Math.min(w - 20, node.x), y: node.y, node });
  }, []);

  const setActive = useCallback(
    (id: string | null, opts?: { fromList?: boolean }) => {
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
      // Cross-highlight from the plain-list rows only needs to light up the
      // graph's node/edges — the list already renders its own DitherPreview
      // at the cursor, so firing onActiveProject here too would stack a
      // second, stale-positioned preview from Constellation on top of it.
      if (!opts?.fromList) {
        onActiveProject?.(node?.kind === 'project' ? node.project ?? null : null);
      }
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

    // Scroll also cycles which project (and its connected skills) is
    // highlighted — the mobile equivalent of desktop hover, since there's no
    // hover on touch. Divides the section's scroll range evenly across every
    // project in stable order.
    if (PROJECT_NODE_IDS.length) {
      const idx = Math.min(PROJECT_NODE_IDS.length - 1, Math.floor(p * PROJECT_NODE_IDS.length));
      setActive(PROJECT_NODE_IDS[idx]);
    }

    lastInputRef.current = performance.now();
    start();
  }, [setActive]);

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

    let settling = false; // any node (or the hero fade) still meaningfully in motion?

    // Ease the hero baseline toward faded once the pointer is present/engaged
    // (desktop) or the section has been scrolled into active use (touch);
    // ease back toward full once it disengages. A spring, not a snap.
    const heroFadeTarget = ptr.inside || (IS_COARSE && active) ? 0.25 : 1;
    heroFadeRef.current += (heroFadeTarget - heroFadeRef.current) * 0.05;
    if (Math.abs(heroFadeTarget - heroFadeRef.current) > 0.01) settling = true;

    // ── physics: spring each node toward home + input-driven parallax offset ──
    const drag = dragRef.current;
    for (const n of nodes) {
      if (drag.node === n && drag.moved) {
        // Keep the star's position relative to the exact point grabbed
        // (offX/offY, captured on pointerdown) instead of snapping its center
        // to the pointer — a mouse pointer is precise enough that this barely
        // showed, but a fingertip grabbing off-center made touch drags look
        // like the star was teleporting rather than following the finger.
        n.x = ptr.x + drag.offX;
        n.y = ptr.y + drag.offY;
        n.vx = 0;
        n.vy = 0;
        settling = true;
        continue;
      }
      // Target = pinned drop position (if this star was dragged & left there)
      // or home + parallax drift (scaled by node depth). No time term either
      // way, so it settles to rest. The spring below gives the drop its wobble.
      const pin = pinnedRef.current.get(n.id);
      let tx = pin ? pin.x : n.hx + par.tx * n.depth;
      let ty = pin ? pin.y : n.hy + par.ty * n.depth;
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
    ctx.lineWidth = 1.3;
    for (let i = 0; i < GEDGES.length; i++) {
      const e = GEDGES[i];
      const a = nodeById(e.a);
      const b = nodeById(e.b);
      const touchesActive = !!active && (e.a === active || e.b === active);
      // Hero chains lit at rest, fading (heroFadeRef) once the pointer
      // engages the canvas at all; everything else a much quieter haze — a
      // lighter ambient web reads as spacious instead of a dense net of lines.
      let op = HERO_EDGES.has(i) ? 0.34 * heroFadeRef.current : 0.13;
      if (active) op = touchesActive ? 0.65 : 0.04;
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
      const base =
        n.kind === 'project'
          ? n.project?.background
            ? 8 + n.weight * 8
            : 12 + n.weight * 12
          : 9;
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
    // Every star is always named — no exceptions. Skills are the emphasized
    // layer now (brighter, uniform size — they're the site's real vocabulary
    // of craft); projects are quieter and a size smaller (specific instances
    // of that vocabulary, not the headline). Before drawing a label we try a
    // few candidate positions to dodge already-drawn ones; if every candidate
    // still collides we draw it anyway at the last candidate — a star is
    // never left silently blank.
    ctx.textBaseline = 'middle';
    const drawn: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const LABEL_H = 15; // approx line box height for collision tests
    // Star cores count as occupied space too — a label must dodge other
    // nodes' dots, not just other labels (own-node candidates already sit
    // clear of the own core by construction).
    for (const n of nodes) {
      drawn.push({ x1: n.x - n.r - 5, y1: n.y - n.r - 5, x2: n.x + n.r + 5, y2: n.y + n.r + 5 });
    }
    labelBoxesRef.current.clear(); // rebuilt below from what's actually drawn this frame
    for (const n of nodes) {
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let alpha: number;
      let useCategoryColor = false;
      let fs: number;
      const fontWeight = n.kind === 'skill' ? 500 : 400;

      if (n.kind === 'project') {
        // Projects are the product — flagships read first, background works
        // stay legible but clearly recede.
        const bg = !!n.project?.background;
        fs = isActive ? 17 : isNeighbor ? 15 : n.accent ? 16 : bg ? 12 : 14;
        if (active) {
          alpha = isActive ? 1 : isNeighbor ? 0.95 : n.accent ? 0.55 : 0.32;
        } else {
          // Hero labels recede toward the regular baseline as heroFadeRef fades,
          // so the whole "first highlight" (edges + label brightness) recedes
          // together rather than just the connecting lines dimming alone.
          alpha = n.accent ? 0.85 + 0.15 * heroFadeRef.current : bg ? 0.6 : 0.85;
        }
      } else {
        // Skills tier below projects: accent skills (the signals a producer
        // scans for) hold a bright baseline; the rest are quiet texture until
        // hover pulls their cluster forward.
        fs = isActive ? 16 : isNeighbor ? 15 : n.accent ? 14.5 : 13;
        if (active) {
          alpha = isActive ? 1 : isNeighbor ? 0.95 : n.accent ? 0.55 : 0.28;
          useCategoryColor = isActive || !!isNeighbor;
        } else {
          alpha = n.accent ? 0.95 : 0.75;
          useCategoryColor = false; // neutral warm-gray at rest
        }
      }
      if (alpha <= 0.02) continue;
      ctx.font = `${fontWeight} ${fs}px 'VT323', monospace`;
      const label = n.label.toUpperCase();
      const tw = ctx.measureText(label).width;

      // Candidate placements, tried in order: right, left, below, above, then
      // four diagonals and two stacked-further rows. First one that doesn't
      // collide wins; if none do, use the last one anyway rather than hiding
      // the label. The extra escape routes matter at narrow (mobile) widths
      // where several skill labels crowd one hub star.
      const rx = n.r + 8;
      const vy = n.r + 12;
      const candidates: { lx: number; ty: number; flip: boolean }[] = [
        { lx: n.x + rx, ty: n.y, flip: false },
        { lx: n.x - rx - tw, ty: n.y, flip: true },
        { lx: n.x - tw / 2, ty: n.y + vy, flip: false },
        { lx: n.x - tw / 2, ty: n.y - vy, flip: false },
        { lx: n.x + rx, ty: n.y + vy, flip: false },
        { lx: n.x - rx - tw, ty: n.y + vy, flip: true },
        { lx: n.x + rx, ty: n.y - vy, flip: false },
        { lx: n.x - rx - tw, ty: n.y - vy, flip: true },
        { lx: n.x - tw / 2, ty: n.y + vy + LABEL_H, flip: false },
        { lx: n.x - tw / 2, ty: n.y - vy - LABEL_H, flip: false },
      ];
      let chosen = candidates[0];
      for (const c of candidates) {
        const box = { x1: c.lx - 2, y1: c.ty - LABEL_H / 2, x2: c.lx + tw + 2, y2: c.ty + LABEL_H / 2 };
        let collides = box.x1 < 6 || box.x2 > w - 6; // off-canvas doesn't count as "clear"
        if (!collides) {
          for (const d of drawn) {
            if (box.x1 < d.x2 && box.x2 > d.x1 && box.y1 < d.y2 && box.y2 > d.y1) {
              collides = true;
              break;
            }
          }
        }
        chosen = c;
        if (!collides) break; // good candidate found, stop here
      }
      const { ty, flip } = chosen;
      let { lx } = chosen;
      // Whatever candidate won (or fell through), the text itself must stay
      // on-canvas — shift it inside rather than letting it clip at the edge.
      if (lx + tw > w - 6) lx = w - 6 - tw;
      if (lx < 6) lx = 6;
      const box = { x1: lx - 2, y1: ty - LABEL_H / 2, x2: lx + tw + 2, y2: ty + LABEL_H / 2 };
      drawn.push(box);
      labelBoxesRef.current.set(n.id, box);
      ctx.textAlign = flip ? 'right' : 'left';
      const tx = flip ? lx + tw : lx;
      // Darkened backdrop under the name so background stars don't compete
      // with the text — a plain solid pad rather than a soft gradient, kept
      // cheap since it's redrawn every animating frame.
      ctx.fillStyle = hexA('#050505', Math.min(0.72, alpha + 0.15));
      ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
      let color: string;
      if (n.kind === 'project') color = hexA('#f2efe9', alpha);
      else if (useCategoryColor) color = hexA(n.color, alpha);
      else color = hexA(SKILL_LABEL_REST, alpha);
      ctx.fillStyle = color;
      if (isActive) {
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillText(label, tx, ty);
      ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';

    // ── Playhead: while the sequencer runs, a thin ECG-red line sweeps the map
    // left→right (x = time in the bar). Reading the synth clock, not a local
    // timer — it exists only because the user pressed play.
    const playhead = synth.getPlayhead();
    if (playhead >= 0) {
      const px = 6 + playhead * (w - 12);
      const grad = ctx.createLinearGradient(px - 10, 0, px + 2, 0);
      grad.addColorStop(0, 'rgba(255,59,82,0)');
      grad.addColorStop(1, 'rgba(255,59,82,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - 10, 0, 10, h);
      ctx.strokeStyle = 'rgba(255,80,100,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      settling = true; // keep animating while it plays
    }

    // ── Shine: one-second full-graph bloom on each drop. Eases back to 0.
    if (shineRef.current > 0.004) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexA('#f2efe9', shineRef.current * 0.12);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      shineRef.current *= 0.92;
      settling = true;
    } else {
      shineRef.current = 0;
    }

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

  // ── synth: set up once for the component's lifetime. Kept in its own
  // effect (empty deps) so unrelated re-renders (e.g. layout's identity
  // changing after setMobileHeight) never tear down and dispose() the
  // AudioContext mid-interaction — that was silencing audio after a drag.
  useEffect(() => {
    // Feed the synth the live star layout every step: projects become voices
    // (x = which 16th they fire on, y = pitch), skills' mean height bends the
    // filter. Reads current positions, so dragging a star re-writes the music.
    synth.setVoiceSource(() => {
      const { w, h } = sizeRef.current;
      const voices = [];
      let skillSum = 0;
      let skillN = 0;
      for (const n of nodesRef.current) {
        const x01 = w ? n.x / w : 0.5;
        const y01 = h ? n.y / h : 0.5;
        if (n.kind === 'project') {
          voices.push({
            id: n.id,
            kind: (n.project?.kind ?? 'conceptual') as VoiceKind,
            x01: Math.min(0.999, Math.max(0, x01)),
            y01: Math.min(1, Math.max(0, y01)),
            weight: n.weight,
            hero: n.accent,
          });
        } else {
          skillSum += y01;
          skillN++;
        }
      }
      return { voices, skillTone: skillN ? skillSum / skillN : 0.5 };
    });
    const unsubUnlock = synth.onUnlock(() => {
      setSynthReady(true);
      setShowUnlockCard(true);
    });
    return () => {
      unsubUnlock();
      synth.dispose();
    };
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
    // The wrap's width can change without any window resize (flex column →
    // row after styles settle, scrollbar appearing, parent layout shifts) —
    // this was leaving the canvas sized for a stale width, drawing the graph
    // far off its visible column. Observe the element itself, not the window.
    const ro = new ResizeObserver(onResize);
    if (wrapRef.current) ro.observe(wrapRef.current);

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
        setPanelVisible(entry.isIntersecting && entry.intersectionRatio > 0.15);
      },
      { threshold: [0, 0.05, 0.15, 0.3] },
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
      setActive(id, { fromList: true });
      const node = id ? nodesRef.current.find((n) => n.id === id) : null;
      if (node) {
        showTooltip(node);
      } else if (!pointerRef.current.inside) {
        setTooltip(null);
      }
    });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      if (IS_COARSE) window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
      unsub();
      stop();
    };
  }, [layout, start, stop, setActive, updateScrollParallax, showTooltip]);

  // ── pointer handlers ──
  const toLocal = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Prime the shared AudioContext here, synchronously, on every pointerdown —
    // not just when a star is grabbed. iOS Safari only unlocks Web Audio
    // output when resume() is reached inside a touchstart/mousedown/click
    // handler; reaching it later via pointermove (the drag drone) does not
    // count and left the context stuck suspended on real phones.
    synth.primeFromGesture();
    const { x, y } = toLocal(e);
    pointerRef.current = { x, y, inside: true };
    lastInputRef.current = performance.now();
    const node = hitTest(x, y, e.pointerType !== 'mouse');
    dragRef.current = {
      node,
      moved: false,
      downX: x,
      downY: y,
      downTime: performance.now(),
      offX: node ? node.x - x : 0,
      offY: node ? node.y - y : 0,
    };
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
      // Touch needs a slightly larger move threshold than a mouse — a
      // stationary fingertip jitters more than a mouse pointer, which was
      // enough on its own to cross a 4px threshold and misfire as a drag.
      const moveThreshold = e.pointerType === 'mouse' ? 4 : 9;
      if (!drag.moved && Math.hypot(x - drag.downX, y - drag.downY) > moveThreshold) {
        drag.moved = true;
        // Easter egg teaser: dragging a star plays a soft drone. Started here
        // (inside an active pointer gesture) so autoplay policy is satisfied.
        synth.startDrone(e.clientX / (window.innerWidth || 1), e.clientY / (window.innerHeight || 1));
      }
      if (drag.moved) {
        const stretch = Math.min(1, Math.hypot(x - drag.node.hx, y - drag.node.hy) / 220);
        synth.updateDrone(e.clientX / (window.innerWidth || 1), e.clientY / (window.innerHeight || 1), stretch);
      }
    }
    // hover highlight + tooltip (desktop)
    if (e.pointerType === 'mouse' && !drag.moved) {
      const node = hitTest(x, y);
      setActive(node ? node.id : null);
      if (node) showTooltip(node);
      else setTooltip(null);
      onPointerPosition?.(e.clientX, e.clientY);
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
    if (drag.moved && node) {
      // Release the dragged star: it STAYS where dropped (pinned) instead of
      // springing home — the spring still pulls toward the pin, keeping the
      // wobble. End the drone with its ECG beep, flash the whole graph, fire
      // pulses down the star's edges, and unlock the instrument the first time.
      synth.endDrone();
      pinnedRef.current.set(node.id, { x: node.x, y: node.y });
      shineRef.current = 1;
      GEDGES.forEach((ge, i) => {
        if (ge.a === node.id || ge.b === node.id) pulsesRef.current.push({ edge: i, t: 0 });
      });
      synth.markUnlocked();
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
          showTooltip(node);
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
    dragRef.current = { node: null, moved: false, downX: 0, downY: 0, downTime: 0, offX: 0, offY: 0 };
    lastInputRef.current = performance.now();
    start();
  };

  // Touch drags can be cancelled by the browser (e.g. an OS gesture steals the
  // pointer) — kill the drone and drop the drag without treating it as a tap.
  const onPointerCancel = () => {
    if (dragRef.current.moved) synth.endDrone();
    dragRef.current = { node: null, moved: false, downX: 0, downY: 0, downTime: 0, offX: 0, offY: 0 };
    lastInputRef.current = performance.now();
    start();
  };

  // Panel ■ reset: unpin every star so the whole field springs back to its
  // home layout (keeps the wobble on the way). Sound keeps playing if it was.
  const resetStars = useCallback(() => {
    pinnedRef.current.clear();
    shineRef.current = Math.max(shineRef.current, 0.6);
    lastInputRef.current = performance.now();
    start();
  }, [start]);

  const onPointerLeave = () => {
    pointerRef.current.inside = false;
    lastInputRef.current = performance.now();
    if (!dragRef.current.node) {
      setActive(null);
      setTooltip(null);
    }
    start(); // resume so the field springs back home, then settles & stops
  };

  // iOS Safari does not reliably honor preventDefault() called from a
  // synthetic PointerEvent handler to suppress native touch scrolling — it
  // only respects it on the raw TouchEvent. touch-action stays pan-y so the
  // canvas scrolls by default; this native, non-passive touchstart is the
  // only thing that actually claims the gesture when a star is grabbed,
  // which is what keeps a real drag (and its drone) from being cut short by
  // the page scrolling out from under it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchStart = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      if (hitTest(x, y, true)) e.preventDefault();
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    return () => canvas.removeEventListener('touchstart', onTouchStart);
  }, [hitTest]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: mobileHeight ? `${mobileHeight}px` : 'clamp(640px, 110vh, 1300px)' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        // pan-y (not none): lets touch keep scrolling the page vertically.
        // touch-action is resolved once at the start of each touch gesture,
        // so this can't be toggled per-drag — a star grab still works via
        // the pointer-capture + move-threshold logic below, it just no
        // longer eats page scroll for touches that land elsewhere.
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
      />
      {tooltip?.node.project?.tagline && (
        <div
          className="pointer-events-none absolute z-20 max-w-[240px] -translate-y-full font-mono"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="border border-foreground/10 bg-black/80 px-3 py-2 backdrop-blur-sm">
            <div className="text-[11px] leading-snug text-foreground/70">{tooltip.node.project.tagline}</div>
          </div>
        </div>
      )}

      {synthReady && (
        <SynthPanel
          onReset={resetStars}
          showUnlockCard={showUnlockCard}
          onDismissCard={() => setShowUnlockCard(false)}
          visible={panelVisible}
        />
      )}
    </div>
  );
}
