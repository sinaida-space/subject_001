import { useEffect, useRef, useCallback } from 'react';
import { useRenderMode } from '@/hooks/useRenderMode';

export default function Logo({
  className = '',
  onEcgClick,
  onNameClick,
}: {
  className?: string;
  onEcgClick?: () => void;
  onNameClick?: (e: React.MouseEvent) => void;
}) {
  const { mode } = useRenderMode();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
  const lastScrollRef = useRef(0);
  const phaseRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const decayRef = useRef(0);

  const drawECG = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, intensity: number) => {
    ctx.clearRect(0, 0, w, h);
    
    const mid = h / 2;
    const segments = 120;
    
    ctx.beginPath();
    ctx.strokeStyle = `hsl(0 100% 55%)`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = `hsl(0 100% 55%)`;
    ctx.shadowBlur = intensity > 0.1 ? 8 + intensity * 12 : 4;
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * w;
      const t = (i / segments) * Math.PI * 4 + phase;
      
      let y = mid;
      
      // ECG waveform shape
      const pos = ((t % (Math.PI * 2)) / (Math.PI * 2));
      
      if (pos > 0.35 && pos < 0.40) {
        // P wave
        y = mid - 3 * intensity * Math.sin((pos - 0.35) / 0.05 * Math.PI);
      } else if (pos > 0.42 && pos < 0.44) {
        // Q dip
        y = mid + 4 * intensity;
      } else if (pos > 0.44 && pos < 0.48) {
        // R peak (tall spike)
        const rPos = (pos - 0.44) / 0.04;
        y = mid - (18 + intensity * 8) * Math.sin(rPos * Math.PI);
      } else if (pos > 0.48 && pos < 0.50) {
        // S dip
        y = mid + 5 * intensity;
      } else if (pos > 0.55 && pos < 0.65) {
        // T wave
        y = mid - 5 * intensity * Math.sin((pos - 0.55) / 0.10 * Math.PI);
      } else {
        // Baseline with slight noise when active
        y = mid + (intensity > 0.1 ? (Math.random() - 0.5) * intensity * 1.5 : 0);
      }
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Glow line underneath
    ctx.beginPath();
    ctx.strokeStyle = `hsla(0, 100%, 55%, ${0.15 + intensity * 0.2})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (mode === 'lite') {
      drawECG(ctx, canvas.width, canvas.height, 0, 0.3);
      return;
    }

    const animate = () => {
      const scrollDelta = Math.abs(scrollRef.current - lastScrollRef.current);
      lastScrollRef.current = scrollRef.current;

      if (scrollDelta > 0.5) {
        decayRef.current = Math.min(decayRef.current + scrollDelta * 0.02, 1);
        phaseRef.current += scrollDelta * 0.008;
      } else {
        decayRef.current *= 0.95;
      }

      if (decayRef.current > 0.01 || activeRef.current) {
        drawECG(ctx, canvas.width, canvas.height, phaseRef.current, Math.max(0.3, decayRef.current));
        if (decayRef.current < 0.01) activeRef.current = false;
      } else {
        // Draw static baseline
        drawECG(ctx, canvas.width, canvas.height, phaseRef.current, 0.3);
      }

      // Self-terminate once the scroll-driven pulse has fully decayed: the phase
      // stops advancing and the drawn baseline is static, so scheduling more
      // frames would be a perpetual idle loop. Resumes from the scroll handler.
      if (decayRef.current <= 0.01 && !activeRef.current) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const ensureLoopRunning = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(animate);
    };

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
      activeRef.current = true;
      ensureLoopRunning(); // scroll is the natural resume trigger
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial draw — one settled static frame; the loop stays parked until a scroll.
    drawECG(ctx, canvas.width, canvas.height, 0, 0.3);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [drawECG, mode]);

  const ecg = (
    <canvas
      ref={canvasRef}
      width={120}
      height={32}
      className="h-8"
      style={{ imageRendering: 'auto' }}
    />
  );

  const name = (
    <span className="font-display text-lg font-light tracking-widest text-foreground uppercase">
      sin<span className="text-primary">.</span>ai<span className="text-primary">.</span>da
    </span>
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {onEcgClick ? (
        <button
          type="button"
          onClick={onEcgClick}
          title="..."
          aria-label="ECG monitor"
          className="cursor-none"
          style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex' }}
        >
          {ecg}
        </button>
      ) : (
        ecg
      )}
      {onNameClick ? (
        <a href="/" onClick={onNameClick} aria-label="Sinaida — back to top" className="cursor-none">
          {name}
        </a>
      ) : (
        name
      )}
    </div>
  );
}
