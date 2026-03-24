import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    document.body.classList.add('has-custom-cursor');

    const handleMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMove);

    let raf: number;
    const animate = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${target.current.x - 4}px, ${target.current.y - 4}px)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${pos.current.x - 20}px, ${pos.current.y - 20}px)`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      document.body.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Inner dot */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 z-[10000] pointer-events-none w-2 h-2 rounded-full bg-primary mix-blend-difference"
        style={{ willChange: 'transform' }}
      />
      {/* Outer blob */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none w-10 h-10 rounded-full border border-primary/40 mix-blend-difference"
        style={{
          willChange: 'transform',
          boxShadow: '0 0 15px hsl(0 100% 55% / 0.2), 0 0 30px hsl(0 100% 55% / 0.1)',
        }}
      />
    </>
  );
}
