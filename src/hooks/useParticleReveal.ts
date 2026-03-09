import { useEffect, useRef, useState, RefObject } from 'react';

export function useParticleReveal(containerRef: RefObject<HTMLElement>) {
  const [revealProgress, setRevealProgress] = useState(0);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        targetProgressRef.current = entry.intersectionRatio;
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0],
      }
    );

    observer.observe(element);

    const animate = () => {
      const target = targetProgressRef.current;
      const current = currentProgressRef.current;
      const diff = target - current;
      
      if (Math.abs(diff) > 0.001) {
        currentProgressRef.current += diff * 0.04;
        setRevealProgress(currentProgressRef.current);
      }
      
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [containerRef]);

  return revealProgress;
}
