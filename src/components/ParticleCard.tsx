import { useRef, useEffect, useMemo, ReactNode } from 'react';
import * as THREE from 'three';
import { useParticleReveal } from '@/hooks/useParticleReveal';

interface ParticleCardProps {
  children: ReactNode;
  particleColor?: string;
  accentColor?: string;
}

const PARTICLE_COUNT = 3000;

export default function ParticleCard({
  children,
  particleColor = '#00ffff',
  accentColor = '#fa0000',
}: ParticleCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);
  
  const revealProgress = useParticleReveal(containerRef);

  // Particle data
  const particleData = useMemo(() => {
    const sources: number[] = [];
    const targets: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const delays: number[] = [];
    const shimmerFreqs: number[] = [];

    const primaryColor = new THREE.Color(particleColor);
    const secondaryColor = new THREE.Color(accentColor);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Target: grid position (will be scaled to actual size later)
      const tx = Math.random();
      const ty = Math.random();
      targets.push(tx, ty);

      // Source: scattered position (normalized, will be scaled)
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.5 + Math.random() * 0.8;
      const sx = 0.5 + Math.cos(angle) * dist;
      const sy = 0.5 + Math.sin(angle) * dist;
      sources.push(sx, sy);

      // Color: random mix
      const color = Math.random() > 0.3 ? primaryColor : secondaryColor;
      colors.push(color.r, color.g, color.b);

      // Size
      sizes.push(1.5 + Math.random() * 2);

      // Stagger delay
      delays.push((i / PARTICLE_COUNT) * 0.4);

      // Shimmer frequency
      shimmerFreqs.push(2 + Math.random() * 3);
    }

    return { sources, targets, colors, sizes, delays, shimmerFreqs };
  }, [particleColor, accentColor]);

  // Initialize Three.js
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Orthographic camera (pixel coordinates)
    const camera = new THREE.OrthographicCamera(0, width, 0, height, 0.1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    // Geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Initial positions (scattered)
      positions[i * 3] = particleData.sources[i * 2] * width;
      positions[i * 3 + 1] = particleData.sources[i * 2 + 1] * height;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = particleData.colors[i * 3];
      colors[i * 3 + 1] = particleData.colors[i * 3 + 1];
      colors[i * 3 + 2] = particleData.colors[i * 3 + 2];

      sizes[i] = particleData.sizes[i];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uPixelRatio;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
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
    particlesRef.current = particles;

    // Handle resize
    const handleResize = () => {
      const newRect = container.getBoundingClientRect();
      const newWidth = newRect.width;
      const newHeight = newRect.height;
      
      renderer.setSize(newWidth, newHeight);
      camera.right = newWidth;
      camera.bottom = newHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [particleData]);

  // Animation loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.016;

      const particles = particlesRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      if (!particles || !renderer || !scene || !camera) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const positions = particles.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const delay = particleData.delays[i];
        const adjustedProgress = Math.max(0, Math.min(1, (revealProgress - delay) / (1 - delay)));

        const sx = particleData.sources[i * 2] * width;
        const sy = particleData.sources[i * 2 + 1] * height;
        const tx = particleData.targets[i * 2] * width;
        const ty = particleData.targets[i * 2 + 1] * height;

        // Lerp position
        positions[i * 3] = sx + (tx - sx) * adjustedProgress;
        positions[i * 3 + 1] = sy + (ty - sy) * adjustedProgress;

        // Shimmer when assembled
        if (revealProgress > 0.9) {
          const shimmerAmp = 0.4;
          const freq = particleData.shimmerFreqs[i];
          positions[i * 3 + 1] += Math.sin(timeRef.current * freq + i * 0.1) * shimmerAmp;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [revealProgress, particleData]);

  // Calculate opacities
  const canvasOpacity = revealProgress > 0.95 ? 0 : 1;
  const contentOpacity = revealProgress > 0.4 ? Math.min(1, (revealProgress - 0.4) / 0.6) : 0;

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{ opacity: canvasOpacity }}
      />
      <div
        className="transition-opacity duration-300"
        style={{ opacity: contentOpacity }}
      >
        {children}
      </div>
    </div>
  );
}
