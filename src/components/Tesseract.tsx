// 4D tesseract hero: a double-rotating hypercube wireframe carrying the hero
// copy on its outer vertices (DOM labels, not canvas text, so the content
// stays accessible and the CTA stays clickable). Scrolling the runway
// (owned by HeroSection) morphs it into a static Swiss-grid layout: the
// w-coordinate is flattened toward the eased scroll progress, collapsing the
// hypercube onto a single cube while the canvas fades out and every label
// eases from its live projected position toward a fixed slot.
//
// Rendering technique (pre-baked additive glow sprites, hexA alpha helper,
// DPR cap, IntersectionObserver + visibilitychange pause) follows the pattern
// in constellation/ConstellationFull.tsx, reimplemented here standalone so
// this component has no dependency on that folder.
import { useCallback, useEffect, useRef } from 'react';

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

const XW_SPEED = 0.12; // rad/s
const ZW_SPEED = 0.09; // rad/s
const MAX_TILT = 0.35; // rad, pointer-driven tilt ceiling
const TILT_EASE = 0.08; // spring factor toward tilt target

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
const SERVICES_LINE_PX = 32; // 2rem rhythm
const CTA_Y_FRAC = 0.8;

const NAME_TARGET_SCALE = 1.15;
const TAGLINE_TARGET_SCALE = 1.8;
const SERVICE_TARGET_SCALE = 1;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  e: number,
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

  // Flatten w toward 0 as the scroll morph completes (see frame() for detail).
  const wBase = w * (1 - e);
  const x1 = x * cosXW - wBase * sinXW;
  const w1 = x * sinXW + wBase * cosXW;
  const z1 = z * cosZW - w1 * sinZW;
  const w2 = z * sinZW + w1 * cosZW;

  const s4 = D4 / (D4 - w2);
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
        const off = projectOffset(vertex, angleXW, angleZW, 0, 0, 0);
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
  const sectionElRef = useRef<HTMLElement | null>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaWrapRef = useRef<HTMLDivElement>(null);

  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const scaleRef = useRef(100);
  const angleXWRef = useRef(0);
  const angleZWRef = useRef(0);
  const rotXRef = useRef(0);
  const rotYRef = useRef(0);
  const rotXTargetRef = useRef(0);
  const rotYTargetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

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

  const frame = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const { w: cw, h: ch, dpr } = sizeRef.current;
    if (!canvas || !root || !cw || !ch) {
      rafRef.current = requestAnimationFrame(frame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafRef.current = requestAnimationFrame(frame);
      return;
    }

    const last = lastTimeRef.current;
    const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000);
    lastTimeRef.current = now;

    // Scroll progress from the ancestor <section> (the 200vh runway HeroSection
    // owns): p = 0 at the top of that section, 1 once it has scrolled by 100vh.
    let p = 0;
    const section = sectionElRef.current;
    if (section) {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      p = Math.max(0, Math.min(1, -rect.top / vh));
    }
    const e = easeInOutCubic(p);
    const speedMul = 1 - p;

    angleXWRef.current += XW_SPEED * dt * speedMul;
    angleZWRef.current += ZW_SPEED * dt * speedMul;

    const tiltMul = 1 - e;
    rotXRef.current += (rotXTargetRef.current * tiltMul - rotXRef.current) * TILT_EASE;
    rotYRef.current += (rotYTargetRef.current * tiltMul - rotYRef.current) * TILT_EASE;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const cx = cw / 2;
    const cy = ch / 2;
    const scale = scaleRef.current;

    // Pointer tilt (rotXRef/rotYRef) is already faded toward 0 as e -> 1.
    const proj: Projected[] = new Array(VERTICES.length);
    for (let idx = 0; idx < VERTICES.length; idx++) {
      const off = projectOffset(
        VERTICES[idx],
        angleXWRef.current,
        angleZWRef.current,
        rotXRef.current,
        rotYRef.current,
        e,
      );
      proj[idx] = {
        x: cx + off.x * scale,
        y: cy + off.y * scale,
        depthNorm: off.depthNorm,
      };
    }

    // Edges + vertex glows fade out together as the morph completes, fully
    // gone by around p=0.85 (the eased curve is already near 1 there).
    const fadeMul = 1 - e;
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
      let targetScale = NAME_TARGET_SCALE;
      if (meta.kind === 'tagline') {
        slotY = taglineY;
        // Mobile: text-sm scaled 1.8x would overflow 375px; stay near 1.
        targetScale = isMobile ? 1.15 : TAGLINE_TARGET_SCALE;
      } else if (meta.kind === 'service') {
        slotY = servicesY0 + serviceIndex * SERVICES_LINE_PX;
        targetScale = SERVICE_TARGET_SCALE;
        serviceIndex++;
      }

      const finalX = pr.x + (marginX - pr.x) * e;
      const finalY = pr.y + (slotY - pr.y) * e;

      const depthScale = 0.85 + pr.depthNorm * 0.3; // 0.85..1.15
      const depthOpacity = 0.45 + pr.depthNorm * 0.55; // 0.45..1
      const finalScale = depthScale + (targetScale - depthScale) * e;
      const finalOpacity = depthOpacity + (1 - depthOpacity) * e;

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
    }

    rafRef.current = requestAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    sectionElRef.current = root.closest('section');
    layout();

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(frame);
    };
    const stop = () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    start();

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    window.addEventListener('resize', layout);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') start();
        else stop();
      },
      { threshold: 0.01 },
    );
    io.observe(root);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        const r = root.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) start();
      } else stop();
    };
    document.addEventListener('visibilitychange', onVis);

    const isCoarse = window.matchMedia?.('(pointer: coarse)').matches === true;
    const onPointerMove = (ev: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const ny = ((ev.clientY - rect.top) / (rect.height || 1)) * 2 - 1;
      rotYTargetRef.current = Math.max(-1, Math.min(1, nx)) * MAX_TILT;
      rotXTargetRef.current = Math.max(-1, Math.min(1, -ny)) * MAX_TILT;
    };
    const onPointerLeave = () => {
      rotXTargetRef.current = 0;
      rotYTargetRef.current = 0;
    };
    if (!isCoarse) {
      root.addEventListener('pointermove', onPointerMove);
      root.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener('resize', layout);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (!isCoarse) {
        root.removeEventListener('pointermove', onPointerMove);
        root.removeEventListener('pointerleave', onPointerLeave);
      }
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
