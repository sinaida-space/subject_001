import { useLayoutEffect, useRef } from 'react';
import { BAYER_FLAT } from '@/lib/ditherPreview';

// Text that resolves out of red dither (#179). The glyphs are drawn once into
// a canvas of CELL px squares; each square lights when its ink clears its
// 4x4 Bayer threshold, which falls as the run goes on, left to right. Red
// while it forms, then the real text takes over and the canvas is gone. It
// runs once per `text`, started by the click that brought it, and stops.

const CELL = 2; // css px per dither square: the site's one dither grain
const DURATION = 700; // ms
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface DitherTextProps {
  text: string;
  className?: string;
}

export default function DitherText({ text, className = '' }: DitherTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const span = textRef.current, canvas = canvasRef.current;
    if (!span || !canvas) return;
    if (REDUCED) {
      span.style.opacity = '1';
      canvas.style.display = 'none';
      return;
    }
    const box = span.getBoundingClientRect();
    const cols = Math.ceil(box.width / CELL), rows = Math.ceil(box.height / CELL);
    const ink = document.createElement('canvas');
    ink.width = cols * CELL;
    ink.height = rows * CELL;
    const ictx = ink.getContext('2d', { willReadFrequently: true });
    const ctx = canvas.getContext('2d');
    if (!ictx || !ctx || cols < 1 || rows < 1) {
      span.style.opacity = '1';
      return;
    }
    const cs = getComputedStyle(span);
    ictx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    (ictx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ictx.textBaseline = 'middle';
    ictx.fillStyle = '#fff';
    ictx.fillText(cs.textTransform === 'uppercase' ? text.toUpperCase() : text, 0, box.height / 2);
    // how much ink each square holds, 0..1
    const px = ictx.getImageData(0, 0, ink.width, ink.height).data;
    const cover = new Float32Array(cols * rows);
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        let a = 0;
        for (let y = 0; y < CELL; y++) {
          for (let x = 0; x < CELL; x++) a += px[((cy * CELL + y) * ink.width + cx * CELL + x) * 4 + 3];
        }
        cover[cy * cols + cx] = a / (255 * CELL * CELL);
      }
    }
    canvas.width = cols * CELL;
    canvas.height = rows * CELL;
    canvas.style.display = '';
    const red = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--primary-legible').trim() || '0 100% 55%'})`;

    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = red;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const c = cover[cy * cols + cx];
          if (c < 0.05) continue;
          // the front sweeps left to right; behind it a square needs less ink
          const level = Math.min(1, Math.max(0, 1.6 * t - 0.6 * (cx / cols)) * 1.5);
          if (c * level > BAYER_FLAT[(cy % 4) * 4 + (cx % 4)]) ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
        }
      }
      // the last stretch hands over to the real, crisp text
      const hand = Math.min(1, Math.max(0, (t - 0.72) / 0.28));
      span.style.opacity = String(hand);
      canvas.style.opacity = String(1 - hand);
      if (t < 1) raf = requestAnimationFrame(frame);
      else canvas.style.display = 'none';
    };
    span.style.opacity = '0';
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <span className={`relative inline-block ${className}`}>
      <span ref={textRef} style={{ opacity: 0 }}>{text}</span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0"
        style={{ imageRendering: 'pixelated', width: 'auto', height: 'auto' }}
      />
    </span>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
