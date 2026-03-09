import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Colors matching the existing cursor dust trail and starfield
const COLORS = {
  warmWhite: { r: 0.95, g: 0.93, b: 0.9 },
  crimson: { r: 0.784, g: 0.063, b: 0.180 },
  darkRed: { r: 0.5, g: 0.03, b: 0.09 },
};

const PARTICLE_COUNT = 1200;
const BURST_POOL = 60;

interface ParticleData {
  speed: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  drift: number;
}

export default function ScrollWind() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<ParticleData[]>([]);
  const lastScrollRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const baseSpeedMultRef = useRef(1);
  const animFrameRef = useRef<number>(0);

  // Initialize particle data
  const initParticleData = (width: number, height: number) => {
    const data: ParticleData[] = [];
    for (let i = 0; i < PARTICLE_COUNT + BURST_POOL; i++) {
      data.push({
        speed: 0.8 + Math.random() * 2.7,
        size: 1.2 + Math.random() * 2.6,
        opacity: 0.3 + Math.random() * 0.6,
        life: Math.random() * 150, // Random start phase
        maxLife: 80 + Math.random() * 140,
        drift: (Math.random() - 0.5) * 0.3,
      });
    }
    return data;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Orthographic camera (pixel coords, Y inverted for screen space)
    const camera = new THREE.OrthographicCamera(0, width, 0, -height, -1, 1);
    cameraRef.current = camera;

    // Particles
    const geometry = new THREE.BufferGeometry();
    const totalParticles = PARTICLE_COUNT + BURST_POOL;
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);
    const opacities = new Float32Array(totalParticles);

    particleDataRef.current = initParticleData(width, height);

    for (let i = 0; i < totalParticles; i++) {
      // Initial positions
      positions[i * 3] = Math.random() * width;
      positions[i * 3 + 1] = -Math.random() * height;
      positions[i * 3 + 2] = 0;

      // Burst particles start hidden
      if (i >= PARTICLE_COUNT) {
        positions[i * 3] = -100;
        particleDataRef.current[i].life = 999;
      }

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

      sizes[i] = particleDataRef.current[i].size;
      opacities[i] = particleDataRef.current[i].opacity;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        
        void main() {
          vColor = color;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vOpacity;
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

    let burstIndex = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const currentScroll = window.scrollY;
      const scrollDelta = currentScroll - lastScrollRef.current;
      lastScrollRef.current = currentScroll;
      scrollVelocityRef.current = Math.abs(scrollDelta);

      const vel = scrollVelocityRef.current;
      const isScrolling = vel > 0.5;

      // Speed multiplier based on scroll
      if (isScrolling) {
        baseSpeedMultRef.current = 1 + vel * 0.04;
      } else {
        // Lerp back to base speed
        baseSpeedMultRef.current += (1 - baseSpeedMultRef.current) * 0.05;
      }

      const positions = particles.geometry.attributes.position.array as Float32Array;
      const opacities = particles.geometry.attributes.aOpacity.array as Float32Array;
      const colors = particles.geometry.attributes.color.array as Float32Array;
      const sizes = particles.geometry.attributes.aSize.array as Float32Array;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Spawn burst particles when scrolling down
      if (scrollDelta > 2) {
        const spawnCount = Math.min(Math.floor(vel * 0.5), 8);
        for (let s = 0; s < spawnCount; s++) {
          const idx = PARTICLE_COUNT + (burstIndex % BURST_POOL);
          const data = particleDataRef.current[idx];
          
          positions[idx * 3] = -10;
          positions[idx * 3 + 1] = -Math.random() * h;
          positions[idx * 3 + 2] = 0;
          
          data.speed = 4 + Math.random() * 5;
          data.size = 1.5 + Math.random() * 2;
          data.life = 0;
          data.maxLife = 60 + Math.random() * 80;
          data.drift = (Math.random() - 0.5) * 0.4;
          
          sizes[idx] = data.size;
          
          // Fast scroll = add warm white particles
          if (vel > 15) {
            colors[idx * 3] = COLORS.warmWhite.r;
            colors[idx * 3 + 1] = COLORS.warmWhite.g;
            colors[idx * 3 + 2] = COLORS.warmWhite.b;
          } else {
            const colorChoice = Math.random();
            const color = colorChoice < 0.5 ? COLORS.crimson : COLORS.warmWhite;
            colors[idx * 3] = color.r;
            colors[idx * 3 + 1] = color.g;
            colors[idx * 3 + 2] = color.b;
          }
          
          burstIndex++;
        }
      }

      // Update all particles
      const totalParticles = PARTICLE_COUNT + BURST_POOL;
      for (let i = 0; i < totalParticles; i++) {
        const data = particleDataRef.current[i];
        
        // Move right
        positions[i * 3] += data.speed * baseSpeedMultRef.current;
        
        // Drift Y
        positions[i * 3 + 1] += data.drift;
        
        // Update life
        data.life++;
        
        // Fade in/out based on lifetime
        const lifeRatio = data.life / data.maxLife;
        const alpha = Math.sin(lifeRatio * Math.PI) * data.opacity;
        opacities[i] = Math.max(0, alpha);
        
        // Reset when off screen or life expired
        if (data.life >= data.maxLife || positions[i * 3] > w + 20) {
          positions[i * 3] = -10;
          positions[i * 3 + 1] = -Math.random() * h;
          data.life = 0;
          data.speed = 0.8 + Math.random() * 2.7;
          data.size = 1.2 + Math.random() * 2.6;
          data.maxLife = 80 + Math.random() * 140;
          data.drift = (Math.random() - 0.5) * 0.3;
          sizes[i] = data.size;
          
          // Re-randomize color
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
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.aOpacity.needsUpdate = true;
      particles.geometry.attributes.color.needsUpdate = true;
      particles.geometry.attributes.aSize.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      renderer.setSize(newWidth, newHeight);
      camera.right = newWidth;
      camera.bottom = -newHeight;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ 
        width: '100vw', 
        height: '100vh', 
        zIndex: 50,
      }}
    />
  );
}
