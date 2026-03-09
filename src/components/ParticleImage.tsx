import { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  r: number;
  g: number;
  b: number;
  size: number;
  vx: number;
  vy: number;
}

interface ParticleImageProps {
  src: string;
  alt: string;
  className?: string;
  inView: boolean;
  scrollVelocity: number;
}

const SAMPLE_GAP = 4; // Sample every N pixels
const MAX_PARTICLES = 3000;

export default function ParticleImage({ src, alt, className = '', inView, scrollVelocity }: ParticleImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const assembledRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const timeRef = useRef(0);
  const scrollVelRef = useRef(0);

  scrollVelRef.current = scrollVelocity;

  const initParticles = useCallback((img: HTMLImageElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Draw image to sample pixels
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    ctx.clearRect(0, 0, w, h);

    const particles: Particle[] = [];
    const gap = Math.max(SAMPLE_GAP, Math.ceil(Math.sqrt((w * h) / (SAMPLE_GAP * SAMPLE_GAP) / MAX_PARTICLES) * SAMPLE_GAP));

    for (let y = 0; y < h; y += gap) {
      for (let x = 0; x < w; x += gap) {
        const idx = (y * w + x) * 4;
        const r = imageData.data[idx];
        const g = imageData.data[idx + 1];
        const b = imageData.data[idx + 2];
        const a = imageData.data[idx + 3];
        if (a < 50) continue;
        // Skip very dark pixels to reduce count
        if (r + g + b < 30) continue;

        // Scatter randomly across the canvas area
        const scatterX = Math.random() * w;
        const scatterY = Math.random() * h;

        particles.push({
          x: scatterX,
          y: scatterY,
          targetX: x,
          targetY: y,
          originX: scatterX,
          originY: scatterY,
          r, g, b,
          size: Math.max(1, gap * 0.6),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        });
      }
    }

    particlesRef.current = particles;
  }, []);

  // Load image and init particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio > 1 ? 1.5 : 1);
      canvas.height = rect.height * (window.devicePixelRatio > 1 ? 1.5 : 1);
      initParticles(img, canvas);
      setImageLoaded(true);
    };
    img.src = src;
  }, [src, initParticles]);

  // Animation loop
  useEffect(() => {
    if (!imageLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    let assembleProgress = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      const vel = Math.abs(scrollVelRef.current);
      const shouldAssemble = inView;

      if (shouldAssemble && assembleProgress < 1) {
        assembleProgress = Math.min(1, assembleProgress + 0.02);
      } else if (!shouldAssemble && assembleProgress > 0) {
        assembleProgress = Math.max(0, assembleProgress - 0.01);
      }

      // When fully assembled, show actual image for clarity
      if (assembleProgress > 0.95 && !assembledRef.current) {
        assembledRef.current = true;
        setTimeout(() => setShowImage(true), 300);
      } else if (assembleProgress < 0.9) {
        assembledRef.current = false;
        setShowImage(false);
      }

      const scrollDisturb = Math.min(vel * 0.5, 15);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const tx = p.targetX;
        const ty = p.targetY;

        // Ease toward target based on assembly progress
        const easeSpeed = 0.03 + assembleProgress * 0.07;

        if (assembleProgress > 0.1) {
          p.x += (tx - p.x) * easeSpeed;
          p.y += (ty - p.y) * easeSpeed;
        }

        // Scroll disturbance: blow particles in scroll direction
        if (scrollDisturb > 0.5) {
          const angle = Math.sin(i * 0.1 + timeRef.current * 3) * Math.PI;
          p.x += Math.cos(angle) * scrollDisturb * (1 - assembleProgress * 0.7) * 0.3;
          p.y += scrollDisturb * (1 - assembleProgress * 0.5) * 0.2;
        }

        // Ambient drift when not assembled
        if (assembleProgress < 0.5) {
          p.x += Math.sin(timeRef.current + i * 0.3) * 0.3;
          p.y += Math.cos(timeRef.current * 0.7 + i * 0.2) * 0.2;
          // Keep in bounds loosely
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }

        // Draw
        const alpha = 0.15 + assembleProgress * 0.85;
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    };

    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [imageLoaded, inView]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${showImage ? 'opacity-0' : 'opacity-100'}`}
      />
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-700 ${showImage ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
