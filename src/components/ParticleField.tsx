import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const TRAIL_COUNT = 200;

function Particles() {
  const meshRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false, prevX: 0, prevY: 0, speed: 0 });
  const scrollRef = useRef(0);
  const lastScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const trailIndexRef = useRef(0);
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

      const type = Math.random();
      if (type < 0.4) {
        col[i * 3] = 0.784; col[i * 3 + 1] = 0.063; col[i * 3 + 2] = 0.180;
      } else if (type < 0.7) {
        col[i * 3] = 0.961; col[i * 3 + 1] = 0.961; col[i * 3 + 2] = 0.941;
      } else {
        col[i * 3] = 0.961; col[i * 3 + 1] = 0.961; col[i * 3 + 2] = 0.941;
      }

      siz[i] = Math.random() * 3 + 0.5;
    }
    return [pos, base, col, siz];
  }, []);

  // Trail particle system
  const [trailPositions, trailColors, trailSizes, trailOpacities] = useMemo(() => {
    const pos = new Float32Array(TRAIL_COUNT * 3);
    const col = new Float32Array(TRAIL_COUNT * 3);
    const siz = new Float32Array(TRAIL_COUNT);
    const opa = new Float32Array(TRAIL_COUNT);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = -100; // hide offscreen initially
      col[i * 3] = 1.0; col[i * 3 + 1] = 0.3; col[i * 3 + 2] = 0.2;
      siz[i] = 1.5;
      opa[i] = 0;
    }
    return [pos, col, siz, opa];
  }, []);

  const trailAgesRef = useRef(new Float32Array(TRAIL_COUNT).fill(999));

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    const dx = nx - mouseRef.current.x;
    const dy = ny - mouseRef.current.y;
    mouseRef.current.speed = Math.sqrt(dx * dx + dy * dy);
    mouseRef.current.prevX = mouseRef.current.x;
    mouseRef.current.prevY = mouseRef.current.y;
    mouseRef.current.x = nx;
    mouseRef.current.y = ny;
    mouseRef.current.active = true;
  }, []);

  const handleScroll = useCallback(() => {
    scrollRef.current = window.scrollY;
  }, []);

  useEffect(() => {
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
    const mouseSpeed = mouseRef.current.speed;

    // Calculate scroll velocity
    const scrollDelta = Math.abs(scrollRef.current - lastScrollRef.current);
    lastScrollRef.current = scrollRef.current;
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, scrollDelta * 0.01, 0.1);

    const isActive = mouseRef.current.active || velocityRef.current > 0.01;

    // Spawn trail particles when mouse is moving fast
    if (mouseSpeed > 0.005 && trailRef.current) {
      const trailPosAttr = trailRef.current.geometry.getAttribute('position');
      const trailPosArray = trailPosAttr.array as Float32Array;
      const trailColArray = (trailRef.current.geometry.getAttribute('color').array as Float32Array);
      const ages = trailAgesRef.current;

      const spawnCount = Math.min(Math.floor(mouseSpeed * 30) + 1, 5);
      for (let s = 0; s < spawnCount; s++) {
        const idx = trailIndexRef.current % TRAIL_COUNT;
        const spread = 0.3;
        trailPosArray[idx * 3] = mx + (Math.random() - 0.5) * spread;
        trailPosArray[idx * 3 + 1] = my + (Math.random() - 0.5) * spread;
        trailPosArray[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;

        // Random color: red or cyan
        if (Math.random() < 0.6) {
          trailColArray[idx * 3] = 1.0; trailColArray[idx * 3 + 1] = 0.2; trailColArray[idx * 3 + 2] = 0.15;
        } else {
          trailColArray[idx * 3] = 0.1; trailColArray[idx * 3 + 1] = 0.9; trailColArray[idx * 3 + 2] = 0.85;
        }

        ages[idx] = 0;
        trailIndexRef.current++;
      }
    }

    // Update trail particles - fade out over time
    if (trailRef.current) {
      const trailPosAttr = trailRef.current.geometry.getAttribute('position');
      const trailPosArray = trailPosAttr.array as Float32Array;
      const ages = trailAgesRef.current;

      for (let i = 0; i < TRAIL_COUNT; i++) {
        ages[i] += delta;
        if (ages[i] > 1.5) {
          trailPosArray[i * 3 + 2] = -100; // hide
        } else {
          // Drift upward and outward
          trailPosArray[i * 3 + 1] += delta * 0.3;
          trailPosArray[i * 3] += (Math.random() - 0.5) * delta * 0.2;
        }
      }
      trailPosAttr.needsUpdate = true;
      trailRef.current.geometry.getAttribute('color').needsUpdate = true;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const bx = basePositions[ix];
      const by = basePositions[ix + 1];
      const bz = basePositions[ix + 2];

      if (isActive) {
        const dx = posArray[ix] - mx;
        const dy = posArray[ix + 1] - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 4);

        // Enhanced bloom-like expansion based on mouse speed
        const speedMult = 1 + mouseSpeed * 8;
        const pushX = influence * dx * 0.3 * speedMult;
        const pushY = influence * dy * 0.3 * speedMult;
        const bloom = influence * Math.sin(Date.now() * 0.003 + i) * 0.2 * speedMult;

        // Scroll turbulence
        const turbulence = velocityRef.current * Math.sin(i * 0.1 + Date.now() * 0.002) * 2;

        const targetX = bx + pushX + turbulence * 0.5;
        const targetY = by + pushY + bloom;
        const targetZ = bz + influence * 1.5 * speedMult;

        posArray[ix] = THREE.MathUtils.lerp(posArray[ix], targetX, delta * 2);
        posArray[ix + 1] = THREE.MathUtils.lerp(posArray[ix + 1], targetY, delta * 2);
        posArray[ix + 2] = THREE.MathUtils.lerp(posArray[ix + 2], targetZ, delta * 2);
      } else {
        posArray[ix] = THREE.MathUtils.lerp(posArray[ix], bx, delta * 0.5);
        posArray[ix + 1] = THREE.MathUtils.lerp(posArray[ix + 1], by, delta * 0.5);
        posArray[ix + 2] = THREE.MathUtils.lerp(posArray[ix + 2], bz, delta * 0.5);
      }
    }

    posAttr.needsUpdate = true;
    mouseRef.current.active = false;
  });

  return (
    <>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={PARTICLE_COUNT} array={sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial size={0.06} vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      {/* Trail particles */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={TRAIL_COUNT} array={trailPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={TRAIL_COUNT} array={trailColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
    </>
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
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
