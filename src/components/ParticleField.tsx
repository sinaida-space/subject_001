import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 800;

function Particles() {
  const meshRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const scrollRef = useRef(0);
  const lastScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const { viewport } = useThree();

  const [positions, basePositions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const base = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const siz = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 14;
      const z = (Math.random() - 0.5) * 8;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;

      // Mix of red, cyan, and white particles
      const type = Math.random();
      if (type < 0.4) {
        col[i * 3] = 1.0; col[i * 3 + 1] = 0.1; col[i * 3 + 2] = 0.1;
      } else if (type < 0.7) {
        col[i * 3] = 0.0; col[i * 3 + 1] = 0.9; col[i * 3 + 2] = 0.9;
      } else {
        col[i * 3] = 0.7; col[i * 3 + 1] = 0.7; col[i * 3 + 2] = 0.7;
      }

      siz[i] = Math.random() * 3 + 0.5;
    }
    return [pos, base, col, siz];
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseRef.current.active = true;
  }, []);

  const handleScroll = useCallback(() => {
    scrollRef.current = window.scrollY;
  }, []);

  useMemo(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handlePointerMove, handleScroll]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const posAttr = geo.getAttribute('position');
    const posArray = posAttr.array as Float32Array;

    const mx = mouseRef.current.x * viewport.width * 0.5;
    const my = mouseRef.current.y * viewport.height * 0.5;

    // Calculate scroll velocity
    const scrollDelta = Math.abs(scrollRef.current - lastScrollRef.current);
    lastScrollRef.current = scrollRef.current;
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, scrollDelta * 0.01, 0.1);

    const isActive = mouseRef.current.active || velocityRef.current > 0.01;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const bx = basePositions[ix];
      const by = basePositions[ix + 1];
      const bz = basePositions[ix + 2];

      if (isActive) {
        // Mouse influence
        const dx = posArray[ix] - mx;
        const dy = posArray[ix + 1] - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 4);

        // Push particles away from mouse with bloom-like expansion
        const pushX = influence * dx * 0.3;
        const pushY = influence * dy * 0.3;
        const bloom = influence * Math.sin(Date.now() * 0.003 + i) * 0.2;

        // Scroll turbulence
        const turbulence = velocityRef.current * Math.sin(i * 0.1 + Date.now() * 0.002) * 2;

        const targetX = bx + pushX + turbulence * 0.5;
        const targetY = by + pushY + bloom;
        const targetZ = bz + influence * 1.5;

        posArray[ix] = THREE.MathUtils.lerp(posArray[ix], targetX, delta * 2);
        posArray[ix + 1] = THREE.MathUtils.lerp(posArray[ix + 1], targetY, delta * 2);
        posArray[ix + 2] = THREE.MathUtils.lerp(posArray[ix + 2], targetZ, delta * 2);
      } else {
        // Return to base position when idle
        posArray[ix] = THREE.MathUtils.lerp(posArray[ix], bx, delta * 0.5);
        posArray[ix + 1] = THREE.MathUtils.lerp(posArray[ix + 1], by, delta * 0.5);
        posArray[ix + 2] = THREE.MathUtils.lerp(posArray[ix + 2], bz, delta * 0.5);
      }
    }

    posAttr.needsUpdate = true;
    mouseRef.current.active = false;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default function ParticleField() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Particles />
      </Canvas>
    </div>
  );
}
