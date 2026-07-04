import { useEffect, useRef, useState } from 'react';

// Any element the site marks as cursor-none (see index.css `.cursor-none` /
// `has-custom-cursor`), plus interactive DOM primitives and the constellation
// canvas — this is a superset of every producer of that class today, matched
// live via delegation so nothing here needs to change when a new one is added.
const HOVER_SELECTOR = 'a, button, [role="button"], .cursor-none, canvas, input, select, textarea, summary';

const IDLE_TIMEOUT_MS = 2000;
const IDLE_SIZE = 18; // effective blob diameter at rest

export default function CustomCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  const rafRef = useRef<number | null>(null);
  const lastMoveRef = useRef(0);

  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const currentTargetRef = useRef<Element | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    if (!mql.matches) return; // touch/coarse pointers keep the native cursor entirely

    document.body.classList.add('has-custom-cursor');

    const ensureLoopRunning = () => {
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleMove = (e: PointerEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      lastMoveRef.current = performance.now();
      if (!initialized.current) {
        pos.current = { ...target.current };
        initialized.current = true;
      }
      ensureLoopRunning();
    };

    const handleOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(HOVER_SELECTOR);
      if (!el || el === currentTargetRef.current) return;
      currentTargetRef.current = el;
      const rect = el.getBoundingClientRect();
      setHoverRect(rect);
      setPulseKey((k) => k + 1); // fire the lock pulse once per new hover target
    };

    const handleOut = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(HOVER_SELECTOR);
      if (!el || el !== currentTargetRef.current) return;
      const related = e.relatedTarget as Element | null;
      if (related && el.contains(related)) return; // still inside the same target
      currentTargetRef.current = null;
      setHoverRect(null);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    document.addEventListener('pointerover', handleOver, true);
    document.addEventListener('pointerout', handleOut, true);

    const animate = () => {
      const idleFor = performance.now() - lastMoveRef.current;
      const settled = Math.hypot(target.current.x - pos.current.x, target.current.y - pos.current.y) < 0.05;

      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;

      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }

      // Stop scheduling once idle ~2s and the spring has settled — resumes on next pointermove.
      if (idleFor > IDLE_TIMEOUT_MS && settled) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerover', handleOver, true);
      document.removeEventListener('pointerout', handleOut, true);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const wrapping = !!hoverRect;

  return (
    <>
      {/* Goo filter so the two idle circles read as one soft organic blob */}
      <svg width="0" height="0" aria-hidden="true">
        <filter id="cursor-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      {/* Idle circular blob — follows the pointer spring, hidden while wrapping a target */}
      <div ref={wrapRef} className="fixed top-0 left-0 z-[10000] pointer-events-none" style={{ willChange: 'transform' }}>
        <div
          className="absolute rounded-full bg-primary/70 mix-blend-difference transition-opacity duration-200"
          style={{
            width: IDLE_SIZE,
            height: IDLE_SIZE,
            left: -IDLE_SIZE / 2,
            top: -IDLE_SIZE / 2,
            filter: 'url(#cursor-goo)',
            opacity: wrapping ? 0 : 1,
            boxShadow: '0 0 15px hsl(0 100% 55% / 0.25), 0 0 30px hsl(0 100% 55% / 0.12)',
          }}
        />
      </div>

      {/* Wrap blob + ECG lock pulse, positioned directly in viewport coordinates */}
      {hoverRect && (
        <div className="fixed top-0 left-0 z-[10000] pointer-events-none">
          <div
            className="absolute border border-primary/70 bg-primary/5 transition-all ease-out"
            style={{
              left: hoverRect.left - 6,
              top: hoverRect.top - 6,
              width: hoverRect.width + 12,
              height: hoverRect.height + 12,
              borderRadius: 14,
              transitionDuration: '260ms',
              filter: 'url(#cursor-goo)',
              mixBlendMode: 'difference',
            }}
          />
          <svg
            key={pulseKey}
            className="absolute overflow-visible"
            style={{ left: hoverRect.left - 6, top: hoverRect.top - 6 }}
            width={hoverRect.width + 12}
            height={hoverRect.height + 12}
          >
            <rect
              x={1}
              y={1}
              width={hoverRect.width + 10}
              height={hoverRect.height + 10}
              rx={14}
              fill="none"
              stroke="hsl(352 87% 55%)"
              strokeWidth={1.5}
              pathLength={1}
              className="cursor-lock-pulse"
            />
          </svg>
        </div>
      )}
    </>
  );
}
