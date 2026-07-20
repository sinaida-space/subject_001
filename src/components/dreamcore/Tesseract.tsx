// 4D tesseract hero: a double-rotating hypercube wireframe carrying the hero
// copy on its outer vertices (DOM labels, not canvas text, so the content
// stays accessible and the CTA stays clickable). Rotation is a pure function
// of scroll progress `p` (from the shared scrub bus, see useScrubBus.ts) —
// no dt accumulation, no idle drift. Scrolling the runway (owned by
// HeroFull) morphs it into a static Swiss-grid layout: the w-coordinate is
// flattened toward `p`, collapsing the hypercube onto a single cube while
// the canvas edges fade out and every label eases from its live projected
// position toward a fixed slot.
//
// Rendering technique (pre-baked additive glow sprites, hexA alpha helper,
// DPR cap) follows the pattern in constellation/ConstellationFull.tsx,
// reimplemented here standalone so this component has no dependency on that
// folder. Per the motion law (docs/spec-dreamcore-tesseract.md §0): all
// per-frame work happens inside the scrub-bus callback; at rest, nothing
// runs. Hover/pointer-tilt behavior is intentionally not implemented here
// (Phase 1 minimal delta).
import { useCallback, useEffect, useRef } from 'react';
import { subscribeScrub, getScrubState, type ScrubState } from '@/hooks/useScrubBus';

interface Props {
  className?: string;
}

// ── Shared hero copy (also consumed by HeroStatic in HeroSection.tsx so the
// live morph end-state and the static fallback carry identical content) ──
export const HERO_NAME = 'SINAIDA KRIVCHENKO';
export const HERO_SUBLINE = 'new media artist';
export const HERO_TAGLINE = 'Visual worlds for physical spaces';
export const HERO_SERVICES = [
  'experience design',
  'stage visuals',
  'audio-reactive systems',
  'interactive projections',
  'generative art',
];
export const HERO_CTA = 'Contact me';

// ── 4D geometry: 16 vertices at every combination of (+-1,+-1,+-1,+-1) ──
type Vec4 = [number, number, number, number];

const VERTICES: Vec4[] = [];
for (const x of [-1, 1]) {
  for (const y of [-1, 1]) {
    for (const z of [-1, 1]) {
      for (const w of [-1, 1]) {
        VERTICES.push([x, y, z, w]);
      }
    }
  }
}

// Edges: every pair of vertices differing in exactly one coordinate (32 total).
const EDGES: [number, number][] = [];
for (let i = 0; i < VERTICES.length; i++) {
  for (let j = i + 1; j < VERTICES.length; j++) {
    let diff = 0;
    for (let k = 0; k < 4; k++) if (VERTICES[i][k] !== VERTICES[j][k]) diff++;
    if (diff === 1) EDGES.push([i, j]);
  }
}

// Outer cube = the 8 vertices with w=+1 (these carry labels); inner cube
// (w=-1) is unlabeled. Order follows the VERTICES generation order above.
const OUTER_INDICES = VERTICES.map((v, i) => (v[3] === 1 ? i : -1)).filter((i) => i >= 0);

type LabelKind = 'name' | 'tagline' | 'service';
interface VertexLabel {
  text: string;
  sub?: string;
  kind: LabelKind;
}

// Explicit coordinate -> OUTER_INDICES slot lookup, so label placement is
// never dependent on the incidental order VERTICES was generated in.
function findOuterSlot(x: number, y: number, z: number): number {
  const vertexIndex = VERTICES.findIndex((v) => v[0] === x && v[1] === y && v[2] === z && v[3] === 1);
  return OUTER_INDICES.indexOf(vertexIndex);
}

// Name sits at one outer corner; tagline (the other largest label) sits at
// the antipodal corner of the outer cube so the two never compete for the
// same neighborhood. The unlabeled slot is adjacent to the name vertex
// (differs in exactly one coordinate), giving that biggest label breathing
// room on at least one side.
const NAME_SLOT = findOuterSlot(-1, -1, -1);
const TAGLINE_SLOT = findOuterSlot(1, 1, 1);
const UNLABELED_SLOT = findOuterSlot(1, -1, -1);

const OUTER_LABELS: (VertexLabel | null)[] = new Array(OUTER_INDICES.length).fill(null);
OUTER_LABELS[NAME_SLOT] = { text: HERO_NAME, sub: HERO_SUBLINE, kind: 'name' };
OUTER_LABELS[TAGLINE_SLOT] = { text: HERO_TAGLINE, kind: 'tagline' };
// UNLABELED_SLOT stays null; the remaining five outer slots fill with services.
let serviceCursor = 0;
for (let slot = 0; slot < OUTER_LABELS.length; slot++) {
  if (slot === NAME_SLOT || slot === TAGLINE_SLOT || slot === UNLABELED_SLOT) continue;
  OUTER_LABELS[slot] = { text: HERO_SERVICES[serviceCursor], kind: 'service' };
  serviceCursor++;
}

// ── Tunables ──
const D4 = 3; // 4D -> 3D perspective distance
const D3 = 4; // 3D -> 2D perspective distance
const FIT_GRID_STEPS = 20; // rotation-angle sweep resolution for scale normalization
const FIT_FILL_FRAC = 0.82; // fraction of the half-min-dimension the wireframe should fill

// Rotation is pure: angle = base + p * span. Rest pose (p=0) reads as
// cube-in-cube; span ratio kept ~4:3 (XW:ZW) per the spec tunables table.
const ANGLE_XW_BASE = 0.55;
const ANGLE_XW_SPAN = 2.4;
const ANGLE_ZW_BASE = 0.2;
const ANGLE_ZW_SPAN = 1.8;

const EDGE_COLOR = '#ff3b52';
const EDGE_SOFT_WIDTH = 4.5;
const EDGE_SOFT_ALPHA = 0.18;
const EDGE_CORE_WIDTH = 1.2;
const EDGE_CORE_ALPHA_MIN = 0.25;
const EDGE_CORE_ALPHA_MAX = 0.85;

const MOBILE_BREAKPOINT = 768;
const MOBILE_MARGIN_PX = 24; // ~1.5rem
const NAME_Y_FRAC = 0.18;
const TAGLINE_Y_FRAC = 0.33;
const SERVICES_Y_FRAC = 0.55;
const SERVICES_LINE_PX = 44; // generous leading for the end grid
const CTA_Y_FRAC = 0.8;

const NAME_TARGET_SCALE = 1.15;
const TAGLINE_TARGET_SCALE = 2.5; // oversized display type in the end grid
const SERVICE_TARGET_SCALE = 1;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// ── Pre-baked radial glow sprite (additive bloom without a shader) ──
const glowCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string): HTMLCanvasElement {
  const cached = glowCache.get(color);
  if (cached) return cached;
  const size = 96;
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
  const gr = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${gr},${b},${a})`;
}

interface Projected {
  x: number;
  y: number;
  depthNorm: number; // 0..1, higher = nearer camera
}

// ── Shared 4D -> 2D projection pipeline (pre-scale, offset from center). ──
// Used both by the per-frame renderer and by the fit-scale sweep below, so
// the normalization sweep is guaranteed to match what actually gets drawn.
function projectOffset(
  vertex: Vec4,
  angleXW: number,
  angleZW: number,
  rotX: number,
  rotY: number,
  wMul: number,
): { x: number; y: number; depthNorm: number } {
  const [x, y, z, w] = vertex;
  const cosXW = Math.cos(angleXW);
  const sinXW = Math.sin(angleXW);
  const cosZW = Math.cos(angleZW);
  const sinZW = Math.sin(angleZW);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);

  // Rotate the full 4D point first, then flatten the ROTATED w in the
  // perspective divide (wMul = cos(PI * p), see frame()): 1 at rest (full
  // hypercube), 0 mid-runway (orthographic 3D shadow, volumetric), -1 by
  // p=1 (inner/outer exchanged). Flattening before rotation instead would
  // multiply the x axis by cos(angleXW) and crush the object mid-fold.
  const x1 = x * cosXW - w * sinXW;
  const w1 = x * sinXW + w * cosXW;
  const z1 = z * cosZW - w1 * sinZW;
  const w2 = z * sinZW + w1 * cosZW;

  const s4 = D4 / (D4 - w2 * wMul);
  const X3 = x1 * s4;
  const Y3 = y * s4;
  const Z3 = z1 * s4;

  const Y3r = Y3 * cosX - Z3 * sinX;
  const Z3r = Y3 * sinX + Z3 * cosX;
  const X3r = X3 * cosY + Z3r * sinY;
  const Z3f = Z3r * cosY - X3 * sinY;

  const s3 = D3 / (D3 - Z3f);
  return {
    x: X3r * s3,
    y: Y3r * s3,
    depthNorm: Math.max(0, Math.min(1, (Z3f + 2) / 4)),
  };
}

// Numerically sweep both w-rotation angles (tilt held at 0, e=0 i.e. resting
// hypercube, not the flattened-to-cube morph end state) to find the largest
// projected radius any of the 16 vertices ever reaches, then derive a scale
// that fits that worst case inside FIT_FILL_FRAC of the half-min-dimension.
function computeFitScale(w: number, h: number): number {
  let maxExtent = 0;
  for (let i = 0; i < FIT_GRID_STEPS; i++) {
    const angleXW = (i / FIT_GRID_STEPS) * Math.PI * 2;
    for (let j = 0; j < FIT_GRID_STEPS; j++) {
      const angleZW = (j / FIT_GRID_STEPS) * Math.PI * 2;
      for (const vertex of VERTICES) {
        const off = projectOffset(vertex, angleXW, angleZW, 0, 0, 1);
        const extent = Math.sqrt(off.x * off.x + off.y * off.y);
        if (extent > maxExtent) maxExtent = extent;
      }
    }
  }
  if (!(maxExtent > 0)) return Math.min(w, h) * 0.38;
  return (0.5 * Math.min(w, h) * FIT_FILL_FRAC) / maxExtent;
}

export default function Tesseract({ className = '' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaWrapRef = useRef<HTMLDivElement>(null);

  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const scaleRef = useRef(100);

  const layout = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const rect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    sizeRef.current = { w: rect.width, h: rect.height, dpr };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    if (rect.width > 0 && rect.height > 0) {
      scaleRef.current = computeFitScale(rect.width, rect.height);
    }
  }, []);

  // Pure function of scroll state — called by the scrub bus, never by an
  // own rAF loop. No dt, no accumulation: every value below is derived
  // directly from `p`, so scrubbing back reproduces the exact same frame.
  const frame = useCallback((state: ScrubState) => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const { w: cw, h: ch, dpr } = sizeRef.current;
    if (!canvas || !root || !cw || !ch) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = state.p;
    const angleXW = ANGLE_XW_BASE + p * ANGLE_XW_SPAN;
    const angleZW = ANGLE_ZW_BASE + p * ANGLE_ZW_SPAN;
    const wMul = Math.cos(Math.PI * clamp01(p));
    // Label/Swiss-grid morph gets its own, later-starting easing window so
    // the object gets a beat of pure rotation before text starts migrating.
    const e = easeInOutCubic(clamp01((p - 0.15) / 0.85));
    // Choreography: during the ride (p 0.3..0.8) the object owns the center.
    // Name + CTA bow out early and re-enter with the end grid; the tagline
    // exists only in the end grid.
    const nameVis = Math.max(1 - smoothstep(0.15, 0.35, p), smoothstep(0.82, 0.95, p));
    const taglineVis = smoothstep(0.82, 0.95, p);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const cx = cw / 2;
    const cy = ch / 2;
    const scale = scaleRef.current;

    const proj: Projected[] = new Array(VERTICES.length);
    for (let idx = 0; idx < VERTICES.length; idx++) {
      const off = projectOffset(VERTICES[idx], angleXW, angleZW, 0, 0, wMul);
      proj[idx] = {
        x: cx + off.x * scale,
        y: cy + off.y * scale,
        depthNorm: off.depthNorm,
      };
    }

    // Edges + vertex glows stay full until p=0.55, then fade to 0 by p=0.9.
    const fadeMul = 1 - smoothstep(0.55, 0.9, p);
    if (fadeMul > 0.003) {
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = EDGE_COLOR;
      for (const [a, b] of EDGES) {
        const pa = proj[a];
        const pb = proj[b];
        const avgDepth = (pa.depthNorm + pb.depthNorm) / 2;
        ctx.globalAlpha = EDGE_SOFT_ALPHA * avgDepth * fadeMul;
        ctx.lineWidth = EDGE_SOFT_WIDTH;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const [a, b] of EDGES) {
        const pa = proj[a];
        const pb = proj[b];
        const avgDepth = (pa.depthNorm + pb.depthNorm) / 2;
        const coreAlpha = EDGE_CORE_ALPHA_MIN + (EDGE_CORE_ALPHA_MAX - EDGE_CORE_ALPHA_MIN) * avgDepth;
        ctx.globalAlpha = coreAlpha * fadeMul;
        ctx.lineWidth = EDGE_CORE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = 'lighter';
      for (let idx = 0; idx < VERTICES.length; idx++) {
        const isOuter = VERTICES[idx][3] === 1;
        const outerSlot = isOuter ? OUTER_INDICES.indexOf(idx) : -1;
        const labeled = outerSlot >= 0 && !!OUTER_LABELS[outerSlot];
        const pr = proj[idx];
        const color = labeled ? EDGE_COLOR : '#ffffff';
        const spr = glowSprite(color);
        const s = (labeled ? 20 : 14) * (0.6 + pr.depthNorm * 0.8);
        ctx.globalAlpha = (labeled ? 0.55 : 0.35) * fadeMul;
        ctx.drawImage(spr, pr.x - s / 2, pr.y - s / 2, s, s);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let idx = 0; idx < VERTICES.length; idx++) {
        const isOuter = VERTICES[idx][3] === 1;
        const outerSlot = isOuter ? OUTER_INDICES.indexOf(idx) : -1;
        const labeled = outerSlot >= 0 && !!OUTER_LABELS[outerSlot];
        const pr = proj[idx];
        const r = labeled ? 2.6 : 2;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(labeled ? 0.95 : 0.75) * fadeMul})`;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── DOM labels: lerp from live projected position toward the Swiss-grid
    // slot as e rises, updated every frame via direct style writes. ──
    const isMobile = cw < MOBILE_BREAKPOINT;
    const marginX = isMobile ? MOBILE_MARGIN_PX : cw * (1 / 12);
    const nameY = ch * NAME_Y_FRAC;
    const taglineY = ch * TAGLINE_Y_FRAC;
    const servicesY0 = ch * SERVICES_Y_FRAC;
    const ctaY = ch * CTA_Y_FRAC;

    let serviceIndex = 0;
    for (let slot = 0; slot < OUTER_INDICES.length; slot++) {
      const meta = OUTER_LABELS[slot];
      const el = labelRefs.current[slot];
      if (!meta) continue;
      if (!el) {
        if (meta.kind === 'service') serviceIndex++;
        continue;
      }
      const pr = proj[OUTER_INDICES[slot]];

      let slotY = nameY;
      let targetX = marginX;
      let targetScale = NAME_TARGET_SCALE;
      if (meta.kind === 'tagline') {
        slotY = taglineY;
        // Mobile: text-sm at the full display scale would overflow 375px.
        targetScale = isMobile ? 1.15 : TAGLINE_TARGET_SCALE;
      } else if (meta.kind === 'service') {
        // Desktop end grid: services in two columns of three/two so the
        // right half of the frame is not dead space. Mobile: one column.
        const secondCol = !isMobile && serviceIndex >= 3;
        if (secondCol) targetX = cw * 0.5;
        slotY = servicesY0 + (isMobile ? serviceIndex : serviceIndex % 3) * SERVICES_LINE_PX;
        targetScale = SERVICE_TARGET_SCALE;
        serviceIndex++;
      }

      const finalX = pr.x + (targetX - pr.x) * e;
      const finalY = pr.y + (slotY - pr.y) * e;

      const depthScale = 0.85 + pr.depthNorm * 0.3; // 0.85..1.15
      const depthOpacity = 0.45 + pr.depthNorm * 0.55; // 0.45..1
      const finalScale = depthScale + (targetScale - depthScale) * e;
      let finalOpacity = depthOpacity + (1 - depthOpacity) * e;
      if (meta.kind === 'name') finalOpacity *= nameVis;
      else if (meta.kind === 'tagline') finalOpacity *= taglineVis;

      // Anchor flips by canvas half so the label never clips off-screen; once
      // mostly morphed it settles to the left anchor the Swiss grid uses.
      const anchorLeft = finalX < cw / 2 || e > 0.5;
      const anchorPct = anchorLeft ? 0 : -100;

      el.style.transform = `translate3d(${finalX}px, ${finalY}px, 0) translate(${anchorPct}%, -50%) scale(${finalScale})`;
      el.style.transformOrigin = anchorLeft ? 'left center' : 'right center';
      el.style.opacity = String(finalOpacity);
      el.style.zIndex = String(Math.round(pr.depthNorm * 100) + 10);
    }

    // Center CTA: the 4D origin projects to canvas center under every
    // rotation, so its "live" position is simply (cx, cy).
    const ctaEl = ctaWrapRef.current;
    if (ctaEl) {
      const finalX = cx + (marginX - cx) * e;
      const finalY = cy + (ctaY - cy) * e;
      const anchorPct = -50 + 50 * e; // centered at e=0 -> left-anchored at e=1
      ctaEl.style.transform = `translate3d(${finalX}px, ${finalY}px, 0) translate(${anchorPct}%, -50%)`;
      // CTA follows the name's visibility arc; unclickable while hidden.
      ctaEl.style.opacity = String(nameVis);
      ctaEl.style.pointerEvents = nameVis < 0.1 ? 'none' : 'auto';
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    layout();

    // Resizing the canvas backing store (canvas.width = ...) clears it, so
    // every relayout must repaint in the same tick — the ResizeObserver
    // fires once on observe, which otherwise wipes the initial frame and
    // leaves the hero blank until the first scroll.
    const relayout = () => {
      layout();
      frame(getScrubState());
    };
    const ro = new ResizeObserver(relayout);
    ro.observe(root);
    window.addEventListener('resize', relayout);

    const unsubscribe = subscribeScrub(frame);
    frame(getScrubState());

    return () => {
      unsubscribe();
      ro.disconnect();
      window.removeEventListener('resize', relayout);
    };
  }, [frame, layout]);

  const scrollToContact = () => {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />

      {OUTER_LABELS.map((label, i) => {
        if (!label) return null;
        return (
          <div
            key={i}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="absolute top-0 left-0 pointer-events-none will-change-transform"
            style={{ transform: 'translate3d(-9999px, -9999px, 0)' }}
          >
            {label.kind === 'name' && (
              <div>
                <h1 className="font-display text-lg md:text-4xl leading-[0.95] tracking-tight text-foreground whitespace-nowrap">
                  {label.text}
                </h1>
                <p className="clinical-label text-[10px] md:text-xs text-primary-legible mt-2 whitespace-nowrap">{label.sub}</p>
              </div>
            )}
            {label.kind === 'tagline' && (
              <p className="font-display text-sm md:text-2xl leading-tight text-foreground whitespace-nowrap">
                {label.text}
              </p>
            )}
            {label.kind === 'service' && (
              <p className="font-mono text-[10px] md:text-[13px] text-foreground/80 whitespace-nowrap">
                {label.text}
              </p>
            )}
          </div>
        );
      })}

      <div
        ref={ctaWrapRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{ transform: 'translate3d(-9999px, -9999px, 0)' }}
      >
        <div className="relative inline-block">
          <div
            aria-hidden="true"
            className="absolute -z-10 pointer-events-none"
            style={{
              width: 230,
              height: 230,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,59,82,0.22) 0%, rgba(255,59,82,0) 62%), radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 65%)',
            }}
          />
          <button
            type="button"
            onClick={scrollToContact}
            className="font-mono text-xs uppercase tracking-[0.15em] px-5 py-3 border border-primary text-primary-legible bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-colors cursor-none"
          >
            {HERO_CTA}
          </button>
        </div>
      </div>
    </div>
  );
}
