import { useEffect, useRef, useState, useCallback } from 'react';

interface ParallaxLayer {
  /** Speed multiplier — 0 = no movement, 1 = normal scroll, >1 = faster */
  speed: number;
  /** Z-axis translation factor in pixels */
  zFactor?: number;
}

interface ParallaxState {
  y: number;
  z: number;
  opacity: number;
  scale: number;
}

export function useParallax(
  ref: React.RefObject<HTMLElement | null>,
  layers: ParallaxLayer[]
): ParallaxState[] {
  const [states, setStates] = useState<ParallaxState[]>(
    layers.map(() => ({ y: 0, z: 0, opacity: 1, scale: 1 }))
  );
  const rafRef = useRef<number>(0);

  const update = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const viewH = window.innerHeight;
    // Progress: 0 when element top hits viewport bottom, 1 when element top hits viewport top
    const progress = 1 - (rect.top / viewH);
    // Center-relative for smooth parallax
    const centered = (rect.top + rect.height / 2 - viewH / 2) / viewH;

    const newStates = layers.map((layer) => {
      const y = centered * layer.speed * -80;
      const z = centered * (layer.zFactor || 0);
      const distFromCenter = Math.abs(centered);
      const opacity = Math.max(0, Math.min(1, 1 - distFromCenter * 0.5));
      const scale = 1 + centered * layer.speed * -0.02;
      return { y, z, opacity: Math.max(0.3, opacity), scale: Math.max(0.9, Math.min(1.1, scale)) };
    });

    setStates(newStates);
  }, [ref, layers]);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  return states;
}
