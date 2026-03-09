import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Colors matching the existing cursor dust trail and starfield
const COLORS = {
  warmWhite: { r: 0.95, g: 0.93, b: 0.9 },
  crimson: { r: 0.784, g: 0.063, b: 0.180 },
  darkRed: { r: 0.5, g: 0.03, b: 0.09 },
};

const PARTICLE_COUNT = 800;

interface ParticleData {
  baseX: number;
  baseY: number;
  speed: number;
  size: number;
  opacity: number;
  drift: number;
  active: boolean;
  life: number;
  maxLife: number;
}

export default function ScrollWind() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

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

    // Scene
    const scene = new THREE.Scene();

    // Orthographic camera
    const camera = new THREE.OrthographicCamera(0, width, 0, -height, -1, 1);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const opacities = new Float32Array(PARTICLE_COUNT);
    
    const particleData: ParticleData[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // All particles start hidden (inactive)
      positions[i * 3] = -100;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      particleData.push({
        baseX: 0,
        baseY: 0,
        speed: 2 + Math.random() * 4,
        size: 1 + Math.random() * 2.5,
        opacity: 0.4 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 0.3,
        active: false,
        life: 0,
        maxLife: 60 + Math.random() * 100,
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

      sizes[i] = particleData[i].size;
      opacities[i] = 0; // Start invisible
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

    let lastScrollY = window.scrollY;
    let particleIndex = 0;
    let isScrolling = false;
    let scrollTimeout: number | null = null;

    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        isScrolling = false;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;

      const posArray = geometry.attributes.position.array as Float32Array;
      const opacityArray = geometry.attributes.aOpacity.array as Float32Array;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Only spawn particles when scrolling
      if (scrollDelta > 1 && isScrolling) {
        const spawnCount = Math.min(Math.floor(scrollDelta * 0.8), 12);
        for (let s = 0; s < spawnCount; s++) {
          const idx = particleIndex % PARTICLE_COUNT;
          const data = particleData[idx];
          
          // Spawn from left edge
          posArray[idx * 3] = -10;
          posArray[idx * 3 + 1] = -Math.random() * h;
          posArray[idx * 3 + 2] = 0;
          
          data.active = true;
          data.life = 0;
          data.speed = 2 + Math.random() * 4 + scrollDelta * 0.3;
          data.maxLife = 40 + Math.random() * 80;
          data.drift = (Math.random() - 0.5) * 0.4;
          
          particleIndex++;
        }
      }

      // Update active particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const data = particleData[i];
        
        if (data.active) {
          // Move right
          posArray[i * 3] += data.speed;
          posArray[i * 3 + 1] += data.drift;
          data.life++;
          
          // Fade in/out
          const lifeRatio = data.life / data.maxLife;
          const alpha = Math.sin(lifeRatio * Math.PI) * data.opacity;
          opacityArray[i] = Math.max(0, alpha);
          
          // Deactivate when off screen or life expired
          if (data.life >= data.maxLife || posArray[i * 3] > w + 20) {
            data.active = false;
            opacityArray[i] = 0;
            posArray[i * 3] = -100;
          }
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aOpacity.needsUpdate = true;

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
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
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
