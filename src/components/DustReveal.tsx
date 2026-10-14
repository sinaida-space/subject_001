import { useRef, useEffect, useState, ReactNode } from 'react';
import * as THREE from 'three';

// Colors matching the existing cursor dust trail
const COLORS = {
  warmWhite: { r: 0.95, g: 0.93, b: 0.9 },
  crimson: { r: 0.784, g: 0.063, b: 0.180 },
  darkRed: { r: 0.5, g: 0.03, b: 0.09 },
};

interface DustRevealProps {
  children: ReactNode;
  className?: string;
}

const PARTICLE_COUNT = 600;

export default function DustReveal({ children, className = '' }: DustRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [canvasOpacity, setCanvasOpacity] = useState(1);
  const revealProgressRef = useRef(0);
  const isRevealedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Scene
    const scene = new THREE.Scene();

    // Orthographic camera
    const camera = new THREE.OrthographicCamera(0, width, 0, -height, -1, 1);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const velocities: { x: number; y: number; targetX: number; targetY: number; phase: number; freq: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start scattered across the container
      const targetX = Math.random() * width;
      const targetY = -Math.random() * height;
      
      // Initial scattered position (further out)
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 150;
      positions[i * 3] = targetX + Math.cos(angle) * dist;
      positions[i * 3 + 1] = targetY + Math.sin(angle) * dist;
      positions[i * 3 + 2] = 0;

      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        targetX,
        targetY,
        phase: Math.random() * Math.PI * 2,
        freq: 1 + Math.random() * 3,
      });

      // Colors from existing palette
      const colorChoice = Math.random();
      let color;
      if (colorChoice < 0.45) {
        color = COLORS.warmWhite;
      } else if (colorChoice < 0.8) {
        color = COLORS.crimson;
      } else {
        color = COLORS.darkRed;
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1 + Math.random() * 3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uProgress: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uProgress;
        
        void main() {
          vColor = color;
          // Fade in as progress increases, then fade out at the end
          float fadeIn = smoothstep(0.0, 0.4, uProgress);
          float fadeOut = 1.0 - smoothstep(0.7, 1.0, uProgress);
          vAlpha = fadeIn * fadeOut;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (1.0 + (1.0 - uProgress) * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let time = 0;
    let targetProgress = 0;
    const rafRef = { id: null as number | null };

    // ── Self-terminating loop guard. The dust reveal is scroll-driven: the
    // IntersectionObserver below sets targetProgress when the divider enters the
    // viewport, which is the only natural trigger. Once revealProgress has caught
    // up to its target and particles are settled, we draw one final frame and
    // stop scheduling — nothing animates without a scroll action, no perpetual
    // idle shimmer loop. A fresh intersection change resumes it.
    const ensureLoop = () => {
      if (rafRef.id == null) {
        rafRef.id = requestAnimationFrame(animate);
      }
    };

    // Intersection observer — the natural (scroll-driven) trigger for reveal.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > 0.15) {
          targetProgress = 1;
          ensureLoop(); // resume the loop so the reveal can progress, then it self-terminates
        }
      },
      { threshold: [0, 0.15, 0.3, 0.5] }
    );
    observer.observe(container);

    const animate = () => {
      time += 0.016;

      // Smooth progress toward target
      const progress = revealProgressRef.current;
      revealProgressRef.current += (targetProgress - progress) * 0.02;
      material.uniforms.uProgress.value = revealProgressRef.current;

      // Settled when the reveal has effectively converged on its target and the
      // particle field has finished its dissolve (canvas fully faded out).
      const settled = Math.abs(targetProgress - revealProgressRef.current) < 0.001;

      const posArray = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const vel = velocities[i];
        const ix = i * 3;

        if (revealProgressRef.current < 0.95) {
          // Move toward target with organic wandering
          const currentX = posArray[ix];
          const currentY = posArray[ix + 1];

          // Random drift (star birth effect)
          const wanderX = Math.sin(time * vel.freq + vel.phase) * (1 - revealProgressRef.current) * 15;
          const wanderY = Math.cos(time * vel.freq * 0.7 + vel.phase) * (1 - revealProgressRef.current) * 15;

          // Lerp toward target
          const lerpFactor = 0.02 + revealProgressRef.current * 0.03;
          posArray[ix] += (vel.targetX + wanderX - currentX) * lerpFactor;
          posArray[ix + 1] += (vel.targetY + wanderY - currentY) * lerpFactor;

          // Slight velocity drift
          vel.x += (Math.random() - 0.5) * 0.1;
          vel.y += (Math.random() - 0.5) * 0.1;
          vel.x *= 0.98;
          vel.y *= 0.98;
          posArray[ix] += vel.x * (1 - revealProgressRef.current);
          posArray[ix + 1] += vel.y * (1 - revealProgressRef.current);
        } else {
          // Settling toward final resting positions. While the reveal is still
          // converging this eases particles home; once settled (below) the loop
          // stops, so this is not a perpetual idle shimmer.
          const shimmer = settled ? 0 : Math.sin(time * 3 + i * 0.1) * 0.3;
          posArray[ix + 1] = vel.targetY + shimmer;
        }
      }

      geometry.attributes.position.needsUpdate = true;

      // Fade canvas out when fully revealed
      if (revealProgressRef.current > 0.85) {
        setCanvasOpacity(1 - (revealProgressRef.current - 0.85) / 0.15);
      }
      if (revealProgressRef.current > 0.5 && !isRevealedRef.current) {
        isRevealedRef.current = true;
        setIsRevealed(true);
      }

      renderer.render(scene, camera);

      // Keep scheduling only while motion is still settling. Once at rest, this
      // was the final frame — stop until the observer fires again on scroll.
      if (settled) {
        rafRef.id = null;
        return;
      }
      rafRef.id = requestAnimationFrame(animate);
    };

    ensureLoop();

    // Handle resize
    const handleResize = () => {
      const newRect = container.getBoundingClientRect();
      renderer.setSize(newRect.width, newRect.height);
      camera.right = newRect.width;
      camera.bottom = -newRect.height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (rafRef.id != null) cancelAnimationFrame(rafRef.id);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
    // Mount once. `isRevealed` is intentionally not a dependency: re-running this
    // effect mid-reveal tears down and recreates the scene, which (with the
    // persistent revealProgressRef) causes the loop to oscillate and never settle
    // — a perpetual motion-law violation. The one-shot reveal is guarded by
    // isRevealedRef instead, so this effect is stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ opacity: canvasOpacity }}
      />
      <div
        className="transition-opacity duration-700"
        style={{ opacity: isRevealed ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
