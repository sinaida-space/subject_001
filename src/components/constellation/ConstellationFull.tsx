import { useCallback, useEffect, useRef, useState } from 'react';
import { buildGraph, buildAdjacency, type GraphNode, type Category, CATEGORY_COLORS, CATEGORY_LABEL, SKILL_LINKS, OFF_WHITE } from '@/data/graph';
import { computeLayout } from '@/lib/layout';
import { constellationBus } from '@/lib/constellationBus';
import { diveBus, DIVE_LAND_AT } from '@/lib/diveBus';
import { synth, type VoiceKind } from '@/lib/constellationSynth';
import SynthPanel from './SynthPanel';
import { workBuildBus } from '@/lib/workBuildBus';
import { buildTimeline, ecg, type BuildTimeline } from './buildTimeline';

// ── Runtime node (base "home" from layout + live physics) ──
interface RNode {
  id: string;
  label: string;
  kind: 'project' | 'skill';
  category: Category;
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
  drawX?: number; // where the last frame drew it (after the globe and the lean), for hit tests
  drawY?: number;
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
// Vertical space each project gets in the mobile top-down layout — tall
// enough that a project's own skill cluster has real room to breathe.
const MOBILE_BAND_HEIGHT = 640;

const HERO_EDGES = new Set<number>();
GEDGES.forEach((e, i) => {
  if (HERO_PROJECT_IDS.has(e.a) || HERO_PROJECT_IDS.has(e.b)) HERO_EDGES.add(i);
});

// Neutral warm grays for skill labels — kills the "rainbow dashboard" look.
// The category color returns only as a hover/active response (see label drawing).
// Hex (not rgba) so per-tier alpha can be applied via hexA at draw time.
// Skills read in grays so projects (off-white) stay the brightest layer:
// accent skills a light gray, the rest a darker one.
const SKILL_GRAY_ACCENT = '#a19d97';
const SKILL_GRAY = '#6d6a66';

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

// Canvas labels are outside CSS, so the site-wide type scale (x1.25 — see
// tailwind.config.ts and index.css) has to be applied to them in JS. Two
// floors rather than one: project names are the structure and sit at the
// site's 20px floor, skills are the vocabulary hanging off them and hold at
// 16px. That gap is what makes the graph read as a hierarchy at a glance
// instead of as one flat wall of words.
// Dev-only layout recorder: every star dropped by drag is saved as a fraction
// of the canvas (fx, fy) to localStorage and mirrored on
// window.__constellationPins, so a hand-arranged composition can be copied
// back into layout.ts. No on-screen panel; the synth panel's reset clears it.
// Stripped from production builds.
const DEV_LAYOUT = import.meta.env.DEV;
const DEV_PINS_KEY = 'constellation-dev-pins';
type DevPins = Record<string, { fx: number; fy: number; kind: string }>;
function readDevPins(): DevPins {
  try {
    return JSON.parse(localStorage.getItem(DEV_PINS_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeDevPins(pins: DevPins) {
  try {
    localStorage.setItem(DEV_PINS_KEY, JSON.stringify(pins));
  } catch {
    /* ignore */
  }
  (window as unknown as { __constellationPins: DevPins }).__constellationPins = pins;
}

// Constellation figures: within each category, the skill stars are joined by
// a minimum spanning tree over their home positions, so every category reads
// as one figure with the fewest, shortest strokes. Recomputed on layout.
function buildFigures(nodes: RNode[]): { a: RNode; b: RNode; cat: Category }[] {
  const byCat = new Map<Category, RNode[]>();
  nodes.forEach((n) => {
    if (n.kind !== 'skill') return;
    if (!byCat.has(n.category)) byCat.set(n.category, []);
    byCat.get(n.category)!.push(n);
  });
  const out: { a: RNode; b: RNode; cat: Category }[] = [];
  byCat.forEach((group, cat) => {
    const inTree = [group[0]];
    const rest = group.slice(1);
    while (rest.length) {
      let best = { d: Infinity, i: 0, from: inTree[0] };
      rest.forEach((r, i) =>
        inTree.forEach((t) => {
          const d = Math.hypot(r.hx - t.hx, r.hy - t.hy);
          if (d < best.d) best = { d, i, from: t };
        }),
      );
      const [next] = rest.splice(best.i, 1);
      out.push({ a: best.from, b: next, cat });
      inTree.push(next);
    }
  });
  SKILL_LINKS.forEach(([ia, ib]) => {
    const a = nodes.find((n) => n.id === ia);
    const b = nodes.find((n) => n.id === ib);
    if (a && b) out.push({ a, b, cat: a.category });
  });
  return out;
}
const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

// ── Build (#121): names and stars develop out of 3 px Bayer cells ──
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lin = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
// once the map is whole (#169): it leans up to TILT toward the pointer (desktop)
// and turns by DRIFT_* across the rest of Work (all devices); radians
const TILT = (4 * Math.PI) / 180;
const DRIFT_YAW = (-3 * Math.PI) / 180;
const DRIFT_PITCH = (2 * Math.PI) / 180;
const bayer8 = (x: number, y: number) => {
  let v = 0;
  for (let bit = 0; bit < 3; bit++) {
    const xb = (x >> bit) & 1, yb = (y >> bit) & 1;
    v += ((xb ^ yb) * 2 + yb) << (2 * (2 - bit));
  }
  return (v + 0.5) / 64;
};
// one mask tile per threshold step: opaque cells where the Bayer value is under it
const maskTiles = new Map<string, HTMLCanvasElement>();
function maskTile(level: number, cell: number): HTMLCanvasElement {
  const key = `${level}:${cell}`;
  const hit = maskTiles.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = cell * 8;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (bayer8(x, y) < level / 32) g.fillRect(x * cell, y * cell, cell, cell);
  maskTiles.set(key, c);
  return c;
}
// the globe's surface: a Fibonacci sphere (even spread), lat, lon, reveal order, red?
const GLOBE: [number, number, number, boolean][] = (() => {
  const n = IS_COARSE ? 320 : 640;
  const out: [number, number, number, boolean][] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const lat = Math.asin(y) * 0.92;
    const lon = (((i * 2.399963) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    out.push([lat, lon * 0.98, ((i * 37) % 101) / 101, i % 9 === 0]);
  }
  return out;
})();
let revealCanvas: HTMLCanvasElement | null = null;
// paint() into a scratch canvas, keep only the cells under threshold t, stamp it back
function revealDraw(ctx: CanvasRenderingContext2D, dpr: number, box: { x1: number; y1: number; x2: number; y2: number }, t: number, paint: (c: CanvasRenderingContext2D) => void) {
  if (t >= 1) return paint(ctx);
  if (t <= 0) return;
  const bw = Math.ceil(box.x2 - box.x1) + 2, bh = Math.ceil(box.y2 - box.y1) + 2;
  if (!revealCanvas) revealCanvas = document.createElement('canvas');
  const rc = revealCanvas;
  if (rc.width < bw * dpr || rc.height < bh * dpr) {
    rc.width = Math.max(rc.width, Math.ceil(bw * dpr));
    rc.height = Math.max(rc.height, Math.ceil(bh * dpr));
  }
  const g = rc.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, bw * dpr, bh * dpr);
  g.setTransform(dpr, 0, 0, dpr, -(box.x1 - 1) * dpr, -(box.y1 - 1) * dpr);
  paint(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const pat = g.createPattern(maskTile(Math.round(t * 32), Math.max(1, Math.round(3 * dpr))), 'repeat');
  if (pat) {
    g.fillStyle = pat;
    g.fillRect(0, 0, bw * dpr, bh * dpr);
  }
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(rc, 0, 0, bw * dpr, bh * dpr, box.x1 - 1, box.y1 - 1, bw, bh);
}

const LABEL_SCALE = 1.25;
const PROJECT_LABEL_MIN = 20;
const SKILL_LABEL_MIN = 16;
function labelSize(base: number, min: number): number {
  return Math.max(min, Math.round(base * LABEL_SCALE));
}

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
  // Stars dragged and dropped stay where you leave them (their "pinned"
  // position) instead of springing home — that arrangement is the composition
  // the synth reads. The spring physics still pull toward the pinned point, so
  // the drop keeps its rubbery wobble. Reset (panel ■) clears this.
  const pinnedRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const figuresRef = useRef<{ a: RNode; b: RNode; cat: Category }[]>([]);
  const timelineRef = useRef<BuildTimeline | null>(null);
  const onScreenRef = useRef(false); // set by the IntersectionObserver below
  // Turning the map by hand: dragging empty space folds the flat map into its
  // globe and turns it; letting go springs it back to the flat home view.
  const spinRef = useRef({ on: false, sph: 0, rot: 0, tilt: 0, lastX: 0, lastY: 0 });
  // One-second full-graph bloom on every drop: ramps to 1 on trigger, eases
  // back to 0. Purely user-action-driven (a drop), so motion-law compliant.
  const shineRef = useRef(0);
  // the formed map's lean toward the pointer, eased (radians: yaw, pitch)
  const leanRef = useRef({ x: 0, y: 0 });

  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: RNode } | null>(null);
  // Only used on touch/coarse devices — the wrapper's height becomes content
  // driven (one band per project) instead of a fixed viewport-relative clamp,
  // so scrolling the page scrolls through the graph "top-down" a chapter at a
  // time. Desktop ignores this entirely (stays at the CSS clamp height).
  const [mobileHeight, setMobileHeight] = useState<number | null>(null);
  // The instrument reveals itself only after the first real drag: the control
  // panel mounts, and a one-time "you found it" window appears. `synth` is a
  // module-level singleton that outlives this component, so a remount (e.g.
  // navigating away and back) must seed from its already-unlocked state
  // instead of waiting on the one-shot onUnlock callback, which only ever
  // fires once per page session — otherwise the panel never returns after
  // the first unlock. The unlock card itself stays one-time: it should not
  // reappear just because the component remounted.
  const [synthReady, setSynthReady] = useState(() => synth.isUnlocked());
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
        category: n.category,
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
    figuresRef.current = buildFigures(nodesRef.current);
    timelineRef.current = buildTimeline(nodesRef.current, figuresRef.current);
    if (DEV_LAYOUT) {
      const saved = readDevPins();
      writeDevPins(saved);
      for (const n of nodesRef.current) {
        const p = saved[n.id];
        if (!p) continue;
        pinnedRef.current.set(n.id, { x: p.fx * w, y: p.fy * h });
        n.x = p.fx * w;
        n.y = p.fy * h;
      }
    }
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
    for (const n of nodesRef.current) {
      const dx = (n.drawX ?? n.x) - px;
      const dy = (n.drawY ?? n.y) - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      const pad = coarse ? Math.max(44, n.r + 22) : (n.kind === 'project' ? 16 : 12) + n.r;
      if (d < pad && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (best) return best;
    // Touch: the whole label row is a target (a little taller and wider than the text).
    const padY = coarse ? 6 : 0;
    const padX = coarse ? 16 : 0;
    let labelBest: RNode | null = null;
    let labelD = Infinity;
    for (const n of nodesRef.current) {
      const box = labelBoxesRef.current.get(n.id);
      if (box && px >= box.x1 - padX && px <= box.x2 + padX && py >= box.y1 - padY && py <= box.y2 + padY) {
        const cd = Math.abs(py - (box.y1 + box.y2) / 2);
        if (cd < labelD) {
          labelD = cd;
          labelBest = n;
        }
      }
    }
    if (labelBest) return labelBest;
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
    // No scroll drift: stars at different depths moved apart while scrolling,
    // which kept flipping label placements. A still map reads cleaner on a phone.
    parallaxRef.current.tx = 0;
    parallaxRef.current.ty = 0;

    // only while the map is on screen: on phones this ran on every scroll of
    // the whole page and redrew the full map each time, even off screen
    if (!onScreenRef.current) return;
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

    // ── the build (#121): what has assembled so far, a pure function of B ──
    const B = workBuildBus.get();
    const tl = timelineRef.current;
    const building = B < 1 && !!tl;
    const lit = (n: RNode) => !building || (n.kind === 'skill' ? B >= (tl!.ignite.get(n.id) ?? 0) : B >= (tl!.work.get(n.id)?.[1] ?? 0));
    const beatU = building ? lin(B, tl!.beat[0], tl!.beat[1]) : 0;
    const beat = beatU > 0 && beatU < 1 ? ecg(beatU) : 0;
    // the volume: while the figures grow, the map is a globe of stars turning
    // with the scroll, each constellation swinging to the front as it lights;
    // then the globe unrolls into the flat, readable map. The flat map is the
    // globe's equirectangular unwrap, so every star keeps its place.
    const spin = spinRef.current;
    if (!building) {
      // the globe folds in while held, unrolls and turns home when let go
      spin.sph += ((spin.on ? 1 : 0) - spin.sph) * 0.14;
      if (!spin.on) {
        const homeRot = Math.round(spin.rot / (Math.PI * 2)) * Math.PI * 2;
        spin.rot += (homeRot - spin.rot) * 0.12;
        spin.tilt += (0 - spin.tilt) * 0.12;
        if (spin.sph < 0.002 && Math.abs(homeRot - spin.rot) < 0.002) {
          spin.sph = 0;
          spin.rot = 0;
          spin.tilt = 0;
        }
      }
      if (spin.on || spin.sph > 0) settling = true;
    }
    // ── once whole (#169): the map leans toward the pointer (desktop, eased,
    // settles) and turns a few degrees with the scroll across the rest of Work
    const lean = leanRef.current;
    const leaning = !building && !IS_COARSE && ptr.inside && !spin.on && !(drag.node && drag.moved);
    const lx = leaning ? Math.max(-1, Math.min(1, (ptr.x - w / 2) / (w / 2 || 1))) * TILT : 0;
    const ly = leaning ? -Math.max(-1, Math.min(1, (ptr.y - h / 2) / (h / 2 || 1))) * TILT : 0;
    lean.x += (lx - lean.x) * 0.08;
    lean.y += (ly - lean.y) * 0.08;
    if (Math.abs(lx - lean.x) > 2e-4 || Math.abs(ly - lean.y) > 2e-4) settling = true;
    else {
      lean.x = lx;
      lean.y = ly;
    }
    const driftV = building ? 0 : workBuildBus.getDrift();
    const yaw = lean.x + driftV * DRIFT_YAW, pitch = lean.y + driftV * DRIFT_PITCH;
    const turned = Math.abs(yaw) + Math.abs(pitch) > 1e-5;
    const sph = building ? 1 - (() => { const t = lin(B, tl!.unfold[0], tl!.unfold[1]); return t * t * (3 - 2 * t); })() : spin.sph;
    const home = sph > 0 || turned ? nodes.map((n) => [n.x, n.y] as const) : null;
    const facing = new Map<string, number>(); // 1 front .. 0.2 back of the globe
    let globe: { gx: number; gy: number; R: number; F: number; rot: number; tilt: number; LON: number } | null = null;
    if (sph > 0) {
      const vh = window.innerHeight;
      const top = wrapRef.current?.getBoundingClientRect().top ?? 0;
      const R = Math.min(w, vh, h) * 0.36;
      // the globe sits in the middle of the part of the canvas that is on screen
      const gx = w / 2, gy = Math.max(R + 20, Math.min(vh / 2 - top, h - R - 20));
      const LON = Math.PI * 0.98;
      const lonOf = (x: number) => ((x - w / 2) / (w / 2)) * LON;
      // the turn: keyframes that bring each constellation round to the front as it completes
      const keys: [number, number][] = [];
      let last = -Infinity;
      for (const cat of ['sound', 'space', 'code', 'body'] as Category[]) {
        const m = nodes.filter((n) => n.kind === 'skill' && n.category === cat);
        if (!m.length) continue;
        let r = -lonOf(m.reduce((acc, n) => acc + n.hx, 0) / m.length);
        while (r <= last + 0.6) r += Math.PI * 2;
        keys.push([tl!.catEnd.get(cat) ?? 0, r]);
        last = r;
      }
      keys.unshift([0, keys[0][1] - 1.4]);
      keys.push([tl!.unfold[1], Math.ceil((last + 0.5) / (Math.PI * 2)) * Math.PI * 2]);
      let rot = building ? keys[keys.length - 1][1] : spin.rot;
      const tilt = building ? 0 : spin.tilt;
      for (let i = 1; building && i < keys.length; i++) {
        if (B <= keys[i][0]) {
          const t = lin(B, keys[i - 1][0], keys[i][0]);
          // a quick swing that settles: each constellation arrives at the front, then holds a beat
          const e3 = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          rot = keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * e3;
          break;
        }
      }
      const F = R * 3.2;
      globe = { gx, gy, R, F, rot, tilt, LON };
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      for (const n of nodes) {
        const lon = lonOf(n.x) + rot;
        const lat = Math.max(-1.35, Math.min(1.35, ((n.y - h / 2) / (h / 2)) * 1.25));
        const X = R * Math.cos(lat) * Math.sin(lon), Y0 = R * Math.sin(lat), Z0 = R * Math.cos(lat) * Math.cos(lon);
        // tipped toward or away from the viewer (a vertical drag, desktop)
        const Y = Y0 * ct - Z0 * st, Z = Y0 * st + Z0 * ct;
        const k = F / (F - Z);
        n.x = n.x + (gx + X * k - n.x) * sph;
        n.y = n.y + (gy + Y * k - n.y) * sph;
        facing.set(n.id, 1 - sph * (1 - (0.2 + 0.8 * (Z / R + 1) / 2)));
      }
    }
    const face = (n: RNode) => facing.get(n.id) ?? 1;
    // the lean and the turn: the flat map as a plane in perspective, skills a
    // little nearer than the heavy works (parallax); identity at rest
    if (turned && sph < 1) {
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const Fp = Math.max(w, h) * 2;
      for (const n of nodes) {
        if (drag.node === n && drag.moved) continue;
        const X = n.x - w / 2, Y = n.y - h / 2, Z = (n.depth - 0.8) * 300;
        const X1 = X * cyw + Z * syw, Z1 = -X * syw + Z * cyw;
        const Y1 = Y * cp - Z1 * sp, Z2 = Y * sp + Z1 * cp;
        const k = (Fp - Z) / (Fp - Z2);
        n.x += (w / 2 + X1 * k - n.x) * (1 - sph);
        n.y += (h / 2 + Y1 * k - n.y) * (1 - sph);
      }
    }
    for (const n of nodes) {
      n.drawX = n.x;
      n.drawY = n.y;
    }
    // ── the formed sweep (#169): a band of light crosses stars and lines once
    // the build is whole; what it has passed stays a little brighter
    const sweepV = building ? 0 : workBuildBus.getSweep();
    const bandAt = -0.2 + 1.4 * sweepV;
    const bandQ = (x: number, y: number) => (x / (w || 1)) * 0.75 + (y / (h || 1)) * 0.25;
    const bump = (x: number, y: number) => (sweepV > 0 && sweepV < 1 ? Math.exp(-Math.pow((bandQ(x, y) - bandAt) / 0.08, 2)) : 0);
    const passed = (x: number, y: number) => {
      if (sweepV >= 1) return 1;
      const t = clamp01((bandAt - bandQ(x, y)) / 0.12 + 0.5);
      return t * t * (3 - 2 * t);
    };


    // ── the globe's surface: dither cells on a sphere, turning with it and
    // unrolling with the map, dissolving as it flattens ──
    if (globe) {
      const { gx, gy, R, F, rot, tilt, LON } = globe;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // the big bang out of About (WorkBuild) pulls its stars onto the globe;
      // the globe's own cells fade in as they land
      const pour = building ? workBuildBus.getPour() : 1;
      const landed = Math.min(1, Math.max(0, (pour - 0.85) / 0.15));
      const r0 = R;
      // the stars that lit just now send a ring across the globe
      const waves: { lat: number; lon: number; age: number }[] = [];
      if (building) {
        for (const n of nodes) {
          if (n.kind !== 'skill') continue;
          const ig = tl!.ignite.get(n.id) ?? 0;
          const age = (B - ig) / 0.06;
          if (age > 0 && age < 1) waves.push({ lat: Math.max(-1.35, Math.min(1.35, ((n.hy - h / 2) / (h / 2)) * 1.25)), lon: ((n.hx - w / 2) / (w / 2)) * LON, age });
        }
      }
      for (let i = 0; i < GLOBE.length; i++) {
        const [lat, lon0, th, red] = GLOBE[i];
        const lon = lon0 + rot;
        const X = r0 * Math.cos(lat) * Math.sin(lon), Y0 = r0 * Math.sin(lat), Z0 = r0 * Math.cos(lat) * Math.cos(lon);
        const Y = Y0 * ct - Z0 * st, Z = Y0 * st + Z0 * ct;
        const k = F / (F - Z);
        // its place on the flat map: the same unwrap the stars use
        const fx = w / 2 + (lon0 / LON) * (w / 2), fy = h / 2 + (lat / 1.25) * (h / 2);
        const x = fx + (gx + X * k - fx) * sph, y = fy + (gy + Y * k - fy) * sph;
        const front = (Z / r0 + 1) / 2;
        // the near side bright, the far side a faint haze, the limb lit like a rim;
        // as the globe flattens its cells go on a Bayer-like order
        const limb = Math.exp(-Math.pow((front - 0.5) / 0.09, 2));
        let a = Math.min(1, 0.07 + 0.75 * front * front + 0.55 * limb) * (th < sph * 1.1 ? 1 : 0);
        const px = x, py = y;
        let hot = 0;
        a *= landed;
        for (const wv of waves) {
          // angular distance from the lit star, the ring travelling out from it
          const d = Math.acos(Math.max(-1, Math.min(1, Math.sin(lat) * Math.sin(wv.lat) + Math.cos(lat) * Math.cos(wv.lat) * Math.cos(lon0 - wv.lon))));
          hot = Math.max(hot, Math.exp(-Math.pow((d - wv.age * 2.2) / 0.16, 2)) * (1 - wv.age));
        }
        if (a <= 0.01 && hot <= 0.01) continue;
        ctx.fillStyle = hot > 0.15 ? `rgba(255,58,46,${Math.min(1, (0.3 + hot) * (0.35 + front)).toFixed(3)})` : red ? `rgba(205,0,0,${(a * 1.3).toFixed(3)})` : `rgba(240,235,227,${a.toFixed(3)})`;
        const c = (front > 0.55 ? 2.4 : 1.6) + hot * 1.2;
        ctx.fillRect(px - c / 2, py - c / 2, c, c);
      }
    }

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
      if (building) {
        const [pj, sk] = a.kind === 'project' ? [a, b] : [b, a];
        const win = tl!.work.get(pj.id);
        const t = win ? lin(B, win[0], win[1]) : 1;
        if (t <= 0) continue;
        const e2 = easeOut(t);
        const hx = sk.x + (pj.x - sk.x) * e2, hy = sk.y + (pj.y - sk.y) * e2;
        ctx.strokeStyle = hexA(e.color, Math.min(1, op + 0.3 * beat));
        ctx.beginPath();
        ctx.moveTo(sk.x, sk.y);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        // the impulse running in toward the work
        if (t < 1) {
          ctx.fillStyle = '#ff3a2e';
          ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
        }
        continue;
      }
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.strokeStyle = hexA(e.color, Math.min(1, op * (1 + 0.3 * passed(mx, my)) + 0.4 * bump(mx, my)));
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

    const activeNode = active ? nodes.find((n) => n.id === active) : undefined;
    const activeCat = activeNode?.kind === 'skill' ? activeNode.category : null;
    // ── constellation figures: dashed strokes joining each category's skills ──
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 1;
    for (const f of figuresRef.current) {
      let fo = f.cat === activeCat || f.a.category === activeCat || f.b.category === activeCat ? 0.55 : 0.2;
      let fx = f.b.x, fy = f.b.y;
      if (building) {
        const hop = tl!.figure.get(`${f.a.id}|${f.b.id}`);
        // a stroke between two figures comes in once both ends are lit
        const t = hop ? lin(B, hop.u0, hop.u1) : lin(B, Math.max(tl!.ignite.get(f.a.id) ?? 0, tl!.ignite.get(f.b.id) ?? 0), Math.max(tl!.ignite.get(f.a.id) ?? 0, tl!.ignite.get(f.b.id) ?? 0) + 0.03);
        if (t <= 0) continue;
        const e2 = hop ? easeOut(t) : 1;
        fx = f.a.x + (f.b.x - f.a.x) * e2;
        fy = f.a.y + (f.b.y - f.a.y) * e2;
        // the growing axon burns brighter than the finished figure
        fo = (hop && t < 1 ? 0.75 : hop ? 0.45 : 0.3 * t) + 0.3 * beat;
      } else {
        const mx = (f.a.x + f.b.x) / 2, my = (f.a.y + f.b.y) / 2;
        fo = fo * (1 + 0.3 * passed(mx, my)) + 0.35 * bump(mx, my);
      }
      ctx.strokeStyle = hexA(CATEGORY_COLORS[f.cat], Math.min(1, fo) * Math.min(face(f.a), face(f.b)));
      ctx.beginPath();
      ctx.moveTo(f.a.x, f.a.y);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

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
      let s = base * hover;
      if (building) {
        if (!lit(n)) {
          // a skill's star condenses out of dust just before the impulse reaches it
          const ig = tl!.ignite.get(n.id);
          const g = n.kind === 'skill' && ig !== undefined ? lin(B, ig - 0.04, ig) : 0;
          if (g > 0) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = n.color;
            const k = 1 - g * g;
            for (let j = 0; j < 12; j++) {
              const a2 = j * 2.39996 + n.hx * 0.01, r2 = (18 + ((j * 37) % 40)) * k;
              ctx.fillRect(n.x + Math.cos(a2) * r2 - 1, n.y + Math.sin(a2) * r2 - 1, 2, 2);
            }
          }
          continue;
        }
        const at = n.kind === 'skill' ? tl!.ignite.get(n.id) ?? 0 : tl!.work.get(n.id)?.[1] ?? 0;
        const flash = Math.exp(-Math.pow((B - at) / 0.012, 2));
        s *= 1 + 1.6 * flash + 0.9 * beat;
      }
      const nb = building ? 0 : bump(n.x, n.y);
      ctx.globalAlpha = Math.min(1, (n.kind === 'project' ? 0.75 : 0.4) * intensity * face(n) * (1 + 0.6 * nb));
      s *= (0.6 + 0.4 * face(n)) * (1 + 0.7 * nb);
      ctx.drawImage(spr, n.x - s / 2, n.y - s / 2, s, s);
    }
    // the impulse itself: a hot red head with a short tail of cells
    if (building) {
      for (const hop of tl!.hops) {
        const t = lin(B, hop.u0, hop.u1);
        if (t <= 0 || t >= 1) continue;
        const to = nodeById(hop.to);
        const from = hop.from ? nodeById(hop.from) : null;
        const ax = from ? from.x : -20, ay = from ? from.y : 40;
        for (let k = 0; k < 7; k++) {
          const tt = Math.max(0, easeOut(t) - k * 0.04);
          ctx.globalAlpha = 0.95 - k * 0.13;
          ctx.fillStyle = '#ff3a2e';
          ctx.fillRect(ax + (to.x - ax) * tt - 1.5, ay + (to.y - ay) * tt - 1.5, 3, 3);
        }
        const hx = ax + (to.x - ax) * easeOut(t), hy = ay + (to.y - ay) * easeOut(t);
        ctx.globalAlpha = 0.8;
        ctx.drawImage(glowSprite('#ff3a2e'), hx - 14, hy - 14, 28, 28);
      }
      // on each beat a faint ring leaves the centre
      if (beatU > 0 && beatU < 1) {
        for (const c of [0.28, 0.72]) {
          const r = (beatU - c) * 9;
          if (r <= 0 || r > 1) continue;
          ctx.globalAlpha = 0.35 * (1 - r);
          ctx.strokeStyle = '#cd0000';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) * (0.1 + r * 0.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // ── node cores ──
    for (const n of nodes) {
      if (!lit(n)) continue;
      const isActive = n.id === active;
      const isNeighbor = neighbors?.has(n.id);
      let intensity = 1;
      if (active && !isActive && !isNeighbor) intensity = n.accent ? 0.6 : 0.35;
      const rr = n.r * (isActive ? 1.5 : n.accent ? 1.15 : 1);
      ctx.beginPath();
      ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
      // OFF_WHITE, same constant the project label uses below — was a pure
      // '#ffffff' that made the dot read colder than its own text.
      ctx.fillStyle = n.kind === 'project' ? hexA(OFF_WHITE, 0.9 * intensity) : hexA(n.color, 0.9 * intensity * face(n));
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
    // Approximate line box height for collision tests, derived per label from
    // its own type size rather than fixed — projects and skills no longer
    // share one size, and a box shorter than the glyphs lets neighbours
    // overlap. The extra 10px is breathing room: labels that merely miss each
    // other still read as crowded, so the box is deliberately taller than the
    // text it guards.
    const labelBoxH = (fs: number) => Math.round(fs * 1.15) + 10;
    // Star cores count as occupied space too — a label must dodge other
    // nodes' dots, not just other labels (own-node candidates already sit
    // clear of the own core by construction).
    for (const n of nodes) {
      drawn.push({ x1: n.x - n.r - 5, y1: n.y - n.r - 5, x2: n.x + n.r + 5, y2: n.y + n.r + 5 });
    }
    // Touch screens: every name stays on, but at a smaller fixed size that
    // never changes with the active highlight. Size-by-state made labels
    // re-place themselves on every scroll step, so the names jumped around.
    const narrowView = IS_COARSE;
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
        fs = narrowView
          ? n.accent ? 13 : bg ? 11 : 12
          : labelSize(isActive ? 17 : isNeighbor ? 15 : n.accent ? 16 : bg ? 12 : 14, PROJECT_LABEL_MIN);
        if (active) {
          alpha = isActive ? 1 : isNeighbor ? 0.95 : n.accent ? 0.55 : narrowView ? 0.45 : 0.32;
        } else {
          // Hero labels recede toward the regular baseline as heroFadeRef fades,
          // so the whole "first highlight" (edges + label brightness) recedes
          // together rather than just the connecting lines dimming alone.
          alpha = n.accent ? 0.85 + 0.15 * heroFadeRef.current : bg ? 0.45 : 0.92;
        }
      } else {
        // Skills tier below projects: accent skills (the signals a producer
        // scans for) hold a bright baseline; the rest are smaller and quieter
        // until hover pulls their cluster forward.
        fs = narrowView
          ? 11
          : isActive || isNeighbor || n.accent ? labelSize(isActive ? 16 : isNeighbor ? 15 : 14.5, SKILL_LABEL_MIN) : 13;
        if (active) {
          alpha = isActive ? 1 : isNeighbor ? 0.95 : n.accent ? 0.55 : narrowView ? 0.4 : 0.2;
          useCategoryColor = isActive || !!isNeighbor;
        } else {
          alpha = 1;
          useCategoryColor = false; // gray at rest, by importance
        }
      }
      alpha *= Math.pow(face(n), 2);
      if (alpha <= 0.02) continue;
      const lw = building ? tl!.label.get(n.id) : undefined;
      const reveal = lw ? lin(B, lw[0], lw[1]) : 1;
      if (reveal <= 0) continue;
      ctx.font = `${fontWeight} ${fs}px 'Geist Pixel', monospace`;
      const label = n.kind === 'project' ? n.label.toUpperCase() : n.label;
      const tw = ctx.measureText(label).width;

      const lh = labelBoxH(fs);
      // Candidate placements, nearest first: right, left, below, above, the
      // four diagonals, then rows stacked progressively further out above and
      // below. Rows go out far enough that a clear slot effectively always
      // exists — a name covering another name is the one thing this graph
      // must never do, and it is worth pushing a label well away from its
      // star to avoid. The line that connects them stays drawn either way, so
      // a displaced label is still unambiguous.
      const rx = n.r + 10;
      const vy = n.r + 14;
      const candidates: { lx: number; ty: number; flip: boolean }[] = [
        { lx: n.x + rx, ty: n.y, flip: false },
        { lx: n.x - rx - tw, ty: n.y, flip: true },
        { lx: n.x - tw / 2, ty: n.y + vy, flip: false },
        { lx: n.x - tw / 2, ty: n.y - vy, flip: false },
        { lx: n.x + rx, ty: n.y + vy, flip: false },
        { lx: n.x - rx - tw, ty: n.y + vy, flip: true },
        { lx: n.x + rx, ty: n.y - vy, flip: false },
        { lx: n.x - rx - tw, ty: n.y - vy, flip: true },
      ];
      for (let row = 1; row <= 6; row++) {
        const dy = vy + lh * row;
        candidates.push(
          { lx: n.x - tw / 2, ty: n.y + dy, flip: false },
          { lx: n.x - tw / 2, ty: n.y - dy, flip: false },
          // Offset copies of each row: two labels forced onto the same row
          // from neighbouring stars would otherwise both centre and collide.
          { lx: n.x + rx, ty: n.y + dy, flip: false },
          { lx: n.x - rx - tw, ty: n.y - dy, flip: true },
        );
      }
      // Every candidate is nudged back inside the canvas before it is tested,
      // and the nudged position is the one that gets drawn. Testing the raw
      // position and shifting afterwards used to let a candidate pass the
      // collision check and then be moved on top of a neighbour; it also
      // rejected every sideways placement for labels wider than about half
      // the canvas, so on a phone the long ones fell through to the last
      // candidate and overlapped. Clamping first means the row search sees
      // real geometry and keeps looking until it finds a clear row.
      const clampX = (x: number) => Math.max(6, Math.min(x, w - 6 - tw));
      let chosen = { ...candidates[0], lx: clampX(candidates[0].lx) };
      let bestOverlap = Infinity;
      for (const c of candidates) {
        const cx = clampX(c.lx);
        const box = { x1: cx - 2, y1: c.ty - lh / 2, x2: cx + tw + 2, y2: c.ty + lh / 2 };
        // Total overlapped area rather than a yes/no, so that when every
        // placement is blocked — two long labels on one crowded hub at phone
        // width — the least-bad one wins instead of whichever happened to be
        // last in the list. Zero means clear, and the first clear candidate
        // still wins outright, preserving the right/left/below/above order.
        let overlap = 0;
        for (const d of drawn) {
          const ox = Math.min(box.x2, d.x2) - Math.max(box.x1, d.x1);
          const oy = Math.min(box.y2, d.y2) - Math.max(box.y1, d.y1);
          if (ox > 0 && oy > 0) overlap += ox * oy;
        }
        if (overlap < bestOverlap) {
          bestOverlap = overlap;
          chosen = { ...c, lx: cx };
        }
        if (overlap === 0) break; // good candidate found, stop here
      }
      const { ty, flip, lx } = chosen;
      const box = { x1: lx - 2, y1: ty - lh / 2, x2: lx + tw + 2, y2: ty + lh / 2 };
      drawn.push(box);
      labelBoxesRef.current.set(n.id, box);
      const tx = flip ? lx + tw : lx;
      let color: string;
      if (n.kind === 'project') color = hexA(OFF_WHITE, alpha);
      else if (useCategoryColor) color = hexA(n.color, alpha);
      else color = hexA(n.accent ? SKILL_GRAY_ACCENT : SKILL_GRAY, alpha);
      const font = ctx.font;
      revealDraw(ctx, dpr, box, reveal, (c) => {
        c.font = font;
        c.textBaseline = 'middle';
        c.textAlign = flip ? 'right' : 'left';
        // Darkened backdrop under the name so background stars don't compete
        // with the text — a plain solid pad rather than a soft gradient, kept
        // cheap since it's redrawn every animating frame.
        c.fillStyle = hexA('#050505', Math.min(0.72, alpha + 0.15)); // Void — canvas needs a literal, not var()
        c.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
        c.fillStyle = color;
        if (isActive) {
          c.shadowColor = n.color;
          c.shadowBlur = 8;
        }
        c.fillText(label, tx, ty);
        c.shadowBlur = 0;
        c.textAlign = 'left';
      });
    }
    ctx.textAlign = 'left';

    // Constellation names: spaced caps just outside each figure's arc. Placed
    // after the node labels and stepped further outward until clear of every
    // star and label, so a name never sits between its own stars and labels.
    ctx.font = `400 12px 'Geist Pixel', monospace`;
    ctx.textAlign = 'center';
    for (const cat of CATEGORIES) {
      const members = nodes.filter((n) => n.kind === 'skill' && n.category === cat);
      if (!members.length) continue;
      // Centroid of the arc, pushed outward from the canvas centre so the
      // name sits on the outer side of its own figure, away from projects.
      const gx = members.reduce((acc, n) => acc + n.x, 0) / members.length;
      const gy = members.reduce((acc, n) => acc + n.y, 0) / members.length;
      // Measured past the outermost star of the arc along that direction, so
      // the name never lands between its own stars on a tall phone canvas.
      const dl = Math.hypot(gx - w / 2, gy - h / 2) || 1;
      const ux = (gx - w / 2) / dl;
      const uy = (gy - h / 2) / dl;
      const reach = Math.max(...members.map((n) => (n.x - gx) * ux + (n.y - gy) * uy));
      const push = Math.max(0, reach) + 44;
      const mx = gx + ux * push;
      const my = Math.max(16, Math.min(gy + uy * push, h - 16));
      const name = CATEGORY_LABEL[cat].toUpperCase().split('').join(' ');
      const tw = ctx.measureText(name).width;
      let best = { x: mx, y: my, o: Infinity };
      for (const step of [0, 26, 52, 78, 104, 130]) {
        const x = Math.max(tw / 2 + 6, Math.min(mx + ux * step, w - tw / 2 - 6));
        const y = Math.max(12, Math.min(my + uy * step, h - 12));
        let o = 0;
        for (const d of drawn) {
          const ix = Math.min(x + tw / 2, d.x2) - Math.max(x - tw / 2, d.x1);
          const iy = Math.min(y + 9, d.y2) - Math.max(y - 9, d.y1);
          if (ix > 0 && iy > 0) o += ix * iy;
        }
        if (o < best.o) best = { x, y, o };
        if (o === 0) break;
      }
      const ce = building ? tl!.catEnd.get(cat) ?? 0 : 0;
      const nameT = building ? lin(B, ce - 0.005, ce + 0.04) : 1;
      const nameColor = hexA(CATEGORY_COLORS[cat], cat === activeCat ? 0.95 : 0.5);
      const nameFont = ctx.font;
      revealDraw(ctx, dpr, { x1: best.x - tw / 2 - 2, y1: best.y - 10, x2: best.x + tw / 2 + 2, y2: best.y + 10 }, nameT, (c) => {
        c.font = nameFont;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = nameColor;
        c.fillText(name, best.x, best.y);
      });
      drawn.push({ x1: best.x - tw / 2 - 4, y1: best.y - 12, x2: best.x + tw / 2 + 4, y2: best.y + 12 });
    }


    // ── Playhead: while the sequencer runs, a thin ECG-red line sweeps the map
    // left→right (x = time in the bar). Reading the synth clock, not a local
    // timer — it exists only because the user pressed play.
    const playhead = synth.getPlayhead();
    if (playhead >= 0) {
      const px = 6 + playhead * (w - 12);
      const grad = ctx.createLinearGradient(px - 10, 0, px + 2, 0);
      grad.addColorStop(0, 'rgba(205,0,0,0)');
      grad.addColorStop(1, 'rgba(205,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - 10, 0, 10, h);
      ctx.strokeStyle = 'rgba(205,0,0,0.7)'; // sinaida-red — canvas needs a literal, not var()
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
      ctx.fillStyle = hexA(OFF_WHITE, shineRef.current * 0.12);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      shineRef.current *= 0.92;
      settling = true;
    } else {
      shineRef.current = 0;
    }

    if (home) nodes.forEach((n, i) => { n.x = home[i][0]; n.y = home[i][1]; });

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
        onScreenRef.current = entry.isIntersecting;
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

    // the build (#121) steps with the scroll: one frame per step
    const unsubBuild = workBuildBus.subscribe(() => {
      if (!onScreenRef.current) return;
      lastInputRef.current = performance.now();
      start();
    });

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
      unsubBuild();
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
    spinRef.current.lastX = x;
    spinRef.current.lastY = y;
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
    // empty space held and dragged: turn the globe. On touch only a sideways
    // drag turns it; an upward or downward one stays the page's scroll.
    const spin = spinRef.current;
    if (!drag.node && drag.downTime && workBuildBus.get() >= 1) {
      const mouse = e.pointerType === 'mouse';
      if (!drag.moved) {
        const dx = Math.abs(x - drag.downX), dy = Math.abs(y - drag.downY);
        if (Math.max(dx, dy) > (mouse ? 4 : 9) && (mouse || dx > dy)) {
          drag.moved = true;
          spin.on = true;
          setActive(null);
          setTooltip(null);
          try {
            canvasRef.current?.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
      }
      if (spin.on) {
        spin.rot += (x - spin.lastX) * 0.0085;
        if (mouse) spin.tilt = Math.max(-0.9, Math.min(0.9, spin.tilt + (y - spin.lastY) * 0.006));
        canvasRef.current!.style.cursor = 'grabbing';
      }
    }
    spin.lastX = x;
    spin.lastY = y;
    if (spin.on) {
      start();
      return;
    }
    // hover highlight + tooltip (desktop)
    if (e.pointerType === 'mouse' && !drag.moved) {
      const node = hitTest(x, y);
      setActive(node ? node.id : null);
      if (node) showTooltip(node);
      else setTooltip(null);
      onPointerPosition?.(e.clientX, e.clientY);
    }
    canvasRef.current!.style.cursor = hitTest(x, y) ? 'pointer' : 'grab';
    start(); // pointer moved → resume the loop (settles & stops when input ceases)
  };

  // A node's centre in client css px (the canvas lays nodes out in css px).
  const nodeClientPoint = (node: RNode) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return r ? { x: r.left + (node.drawX ?? node.x), y: r.top + (node.drawY ?? node.y) } : undefined;
  };

  // Back out of a case flies into the node again: tell the dive where it is.
  useEffect(
    () =>
      diveBus.setNodeLocator((id) => {
        const n = nodesRef.current.find((m) => m.id === id);
        const r = canvasRef.current?.getBoundingClientRect();
        return n && r ? { x: r.left + (n.drawX ?? n.x), y: r.top + (n.drawY ?? n.y) } : null;
      }),
    [],
  );

  // Every work opens with a dive (#119); its detail card rises out of the
  // dialect effect mid-flight, and the card's own links lead on to the case. No dive (lite, no host) opens
  // the card plainly.
  const navigate = (node: RNode) => {
    const p = node.project;
    if (!p) return;
    const dived = diveBus.dive({ land: () => constellationBus.focusWork(node.id, true), landAt: DIVE_LAND_AT, dialect: p.dialect, image: p.image, origin: nodeClientPoint(node), anchor: `node:${p.id}` });
    if (!dived) constellationBus.focusWork(node.id);
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
      if (DEV_LAYOUT) {
        const { w, h } = sizeRef.current;
        const next = {
          ...readDevPins(),
          [node.id]: { fx: +(node.x / w).toFixed(4), fy: +(node.y / h).toFixed(4), kind: node.kind },
        };
        writeDevPins(next);
      }
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
        // touch: every name is already on the map, so one tap on a work
        // opens it; a skill tap just lights up its cluster.
        if (node.project) {
          navigate(node);
        } else {
          setActive(node.id);
          showTooltip(node);
        }
      } else {
        // tapped empty space → dismiss
        setActive(null);
        setTooltip(null);
      }
    }
    // release drag → spring back handled by physics (home); a turned globe unrolls home
    spinRef.current.on = false;
    dragRef.current = { node: null, moved: false, downX: 0, downY: 0, downTime: 0, offX: 0, offY: 0 };
    lastInputRef.current = performance.now();
    start();
  };

  // Touch drags can be cancelled by the browser (e.g. an OS gesture steals the
  // pointer) — kill the drone and drop the drag without treating it as a tap.
  const onPointerCancel = () => {
    if (dragRef.current.moved && dragRef.current.node) synth.endDrone();
    spinRef.current.on = false;
    dragRef.current = { node: null, moved: false, downX: 0, downY: 0, downTime: 0, offX: 0, offY: 0 };
    lastInputRef.current = performance.now();
    start();
  };

  // Panel ■ reset: unpin every star so the whole field springs back to its
  // home layout (keeps the wobble on the way). Sound keeps playing if it was.
  const resetStars = useCallback(() => {
    pinnedRef.current.clear();
    if (DEV_LAYOUT) {
      writeDevPins({});
    }
    shineRef.current = Math.max(shineRef.current, 0.6);
    lastInputRef.current = performance.now();
    start();
  }, [start]);

  const closeSynth = useCallback(() => {
    resetStars();
    synth.reset();
    setSynthReady(false);
    setShowUnlockCard(false);
  }, [resetStars]);

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
    <div ref={wrapRef} className="relative w-full" style={{ height: mobileHeight ? `${mobileHeight}px` : 'clamp(600px, calc(100vh - 88px), 1300px)' }}>
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
      {/* The floating tagline box that used to sit beside the hovered star is
          gone: GraphHoverCard (rendered by Constellation) now carries the
          tagline along with the preview, the name and the wired-to skills,
          docked in the corner opposite the star. A box pinned next to the
          star could only ever land on top of the labels around it, which is
          the one thing this graph must not do. `tooltip` is still tracked —
          the hit test and touch preview flow both read it. */}

      {synthReady && (
        <SynthPanel
          onReset={resetStars}
          onClose={closeSynth}
          showUnlockCard={showUnlockCard}
          onDismissCard={() => setShowUnlockCard(false)}
          visible={panelVisible}
        />
      )}
    </div>
  );
}
