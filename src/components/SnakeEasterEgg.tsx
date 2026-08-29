import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

const GRID = 20;       // cells
const CELL = 16;       // px per cell
const SIZE = GRID * CELL; // 320px canvas

const SPEEDS = [150, 110, 80, 60]; // ms per tick by level

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SnakeEasterEgg({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }] as Point[],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    food: { x: 15, y: 10 } as Point,
    score: 0,
    dead: false,
    started: false,
  });
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [started, setStarted] = useState(false);

  // ── Draw ────────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    // Background — dark grid
    ctx.fillStyle = '#050505'; // Void
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grid lines
    ctx.strokeStyle = '#262626'; // Graphite
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
    }

    if (!s.started && !s.dead) {
      // Start screen
      ctx.fillStyle = '#CC1414';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ANY KEY', SIZE / 2, SIZE / 2 - 10);
      ctx.fillStyle = '#737373'; // Slate
      ctx.font = '10px monospace';
      ctx.fillText('or swipe to start', SIZE / 2, SIZE / 2 + 10);
      return;
    }

    // Food — red pulsing dot
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    ctx.shadowColor = '#CC1414';
    ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle = `rgba(204, 20, 20, ${pulse})`;
    ctx.fillRect(s.food.x * CELL + 3, s.food.y * CELL + 3, CELL - 6, CELL - 6);
    ctx.shadowBlur = 0;

    // Snake
    s.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const alpha = isHead ? 1 : 0.5 + 0.5 * ((s.snake.length - i) / s.snake.length);
      ctx.fillStyle = isHead ? '#CC1414' : `rgba(204, 20, 20, ${alpha * 0.6})`;
      ctx.shadowColor = isHead ? '#CC1414' : 'transparent';
      ctx.shadowBlur = isHead ? 6 : 0;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.shadowBlur = 0;

    // ECG line overlay on snake head
    const head = s.snake[0];
    ctx.strokeStyle = '#cd0000'; // sinaida-red
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(head.x * CELL, head.y * CELL + CELL / 2);
    ctx.lineTo(head.x * CELL + CELL * 0.3, head.y * CELL + CELL / 2);
    ctx.lineTo(head.x * CELL + CELL * 0.4, head.y * CELL + 2);
    ctx.lineTo(head.x * CELL + CELL * 0.6, head.y * CELL + CELL - 2);
    ctx.lineTo(head.x * CELL + CELL * 0.7, head.y * CELL + CELL / 2);
    ctx.lineTo(head.x * CELL + CELL, head.y * CELL + CELL / 2);
    ctx.stroke();

    // Dead screen
    if (s.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = '#CC1414';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FLATLINE', SIZE / 2, SIZE / 2 - 20);
      ctx.fillStyle = '#999999'; // Fog
      ctx.font = '10px monospace';
      ctx.fillText(`SCORE: ${s.score}`, SIZE / 2, SIZE / 2);
      ctx.fillStyle = '#737373'; // Slate
      ctx.fillText('PRESS R OR TAP TO RESTART', SIZE / 2, SIZE / 2 + 20);
    }
  }, []);

  // ── Tick ────────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.dead || !s.started) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const next: Point = {
      x: (head.x + (s.dir === 'RIGHT' ? 1 : s.dir === 'LEFT' ? -1 : 0) + GRID) % GRID,
      y: (head.y + (s.dir === 'DOWN' ? 1 : s.dir === 'UP' ? -1 : 0) + GRID) % GRID,
    };

    // Self collision
    if (s.snake.some(seg => seg.x === next.x && seg.y === next.y)) {
      s.dead = true;
      setDead(true);
      draw();
      return;
    }

    const ate = next.x === s.food.x && next.y === s.food.y;
    s.snake = [next, ...s.snake];
    if (!ate) s.snake.pop();
    else {
      s.score += 10;
      s.food = randomFood(s.snake);
      setScore(s.score);
    }

    draw();
    const level = Math.min(3, Math.floor(s.score / 50));
    tickRef.current = setTimeout(tick, SPEEDS[level]);
  }, [draw]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (tickRef.current) clearTimeout(tickRef.current);
    const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    stateRef.current = {
      snake,
      dir: 'RIGHT',
      nextDir: 'RIGHT',
      food: randomFood(snake),
      score: 0,
      dead: false,
      started: true,
    };
    setScore(0);
    setDead(false);
    setStarted(true);
    draw();
    tickRef.current = setTimeout(tick, SPEEDS[0]);
  }, [draw, tick]);

  const start = useCallback(() => {
    if (!stateRef.current.started) reset();
  }, [reset]);

  // ── Direction helper ────────────────────────────────────────────────────────
  const setDir = useCallback((d: Dir) => {
    const s = stateRef.current;
    if (!s.started) { reset(); return; }
    if (s.dead) { reset(); return; }
    const opp: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    if (d !== opp[s.dir]) s.nextDir = d;
  }, [reset]);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','r','R'].includes(e.key)) {
        e.preventDefault();
      }
      if (!stateRef.current.started && e.key !== 'Escape') { start(); return; }
      if (stateRef.current.dead && (e.key === 'r' || e.key === 'R')) { reset(); return; }
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
      };
      if (map[e.key]) setDir(map[e.key]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start, reset, setDir]);

  // ── Touch / Swipe ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (!stateRef.current.started) start();
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchRef.current) return;
      if (stateRef.current.dead) { reset(); return; }
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      const dy = e.changedTouches[0].clientY - touchRef.current.y;
      touchRef.current = null;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'RIGHT' : 'LEFT');
      else setDir(dy > 0 ? 'DOWN' : 'UP');
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [start, reset, setDir]);

  // ── Initial draw ─────────────────────────────────────────────────────────────
  useEffect(() => {
    draw();
    return () => { if (tickRef.current) clearTimeout(tickRef.current); };
  }, [draw]);

  // ── Suppress the starfield CRT overlay while open ────────────────────────────
  // The modal's backdrop-filter blur samples the CRT grain/scanlines behind it,
  // which muddies the panel's 1px border against the frosted glass. The overlay
  // has no job here — the modal already blacks out the field — so drop it for
  // the duration (see :root[data-snake-open] .crt-overlay in index.css).
  useEffect(() => {
    document.documentElement.setAttribute('data-snake-open', '');
    return () => document.documentElement.removeAttribute('data-snake-open');
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        border: '1px solid #CC1414',
        boxShadow: '0 0 40px rgba(204,20,20,0.3)',
        background: 'hsl(var(--background))',
        padding: '0',
        width: SIZE,
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '1px solid hsl(var(--graphite))',
          padding: '8px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: '#CC1414', letterSpacing: '2px' }}>
            SNAKE.EXE // SCORE: {score}
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--slate))',
              background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px'
            }}
          >
            [ ESC ]
          </button>
        </div>

        {/* Canvas — inset from the panel frame with the same padding as the
            arrow-button block below, so the grid never rides over the red
            border. The drawing buffer stays SIZE×SIZE; CSS scales it to the
            padded width. */}
        <div style={{ padding: '8px 12px 12px' }}>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            style={{ display: 'block', width: '100%', height: 'auto', cursor: 'none' }}
          />
        </div>

        {/* Footer controls hint */}
        <div style={{
          borderTop: '1px solid hsl(var(--graphite))',
          padding: '6px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '4px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--gunmetal))' }}>
            ↑ ↓ ← → or WASD
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'hsl(var(--gunmetal))' }}>
            swipe on mobile
          </span>
        </div>

        {/* Arrow buttons for touch devices */}
        <div style={{ padding: '8px 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          <div />
          <button onClick={() => setDir('UP')} style={btnStyle}>↑</button>
          <div />
          <button onClick={() => setDir('LEFT')} style={btnStyle}>←</button>
          <button onClick={() => setDir('DOWN')} style={btnStyle}>↓</button>
          <button onClick={() => setDir('RIGHT')} style={btnStyle}>→</button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '20px',
  color: '#CC1414',
  background: 'hsl(var(--background))',
  border: '1px solid hsl(var(--graphite))',
  padding: '8px',
  cursor: 'pointer',
  textAlign: 'center',
};
