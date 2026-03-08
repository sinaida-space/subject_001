import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const TRAIL_COUNT = 400;

// Custom shader for trail particles that expand over their lifetime
const trailVertexShader = `
  attribute float aSize;
  attribute float aAge;
  varying float vAge;
  varying vec3 vColor;
  void main() {
    vAge = aAge;
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Start tiny, expand as they age, then shrink at end
    float life = clamp(aAge, 0.0, 1.0);
    float expandCurve = life < 0.3 
      ? life / 0.3 
      : 1.0 - smoothstep(0.5, 1.0, life);
    float size = aSize * (0.3 + expandCurve * 0.3);
    gl_PointSize = size * (60.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = `
  varying float vAge;
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    // Soft radial falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    // Fade in quickly, fade out slowly like dissipating steam
    float life = clamp(vAge, 0.0, 1.0);
    float fadeIn = smoothstep(0.0, 0.05, life);
    float fadeOut = 1.0 - smoothstep(0.3, 1.0, life);
    alpha *= fadeIn * fadeOut * 0.7;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function Particles() {
  const meshRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false, prevX: 0, prevY: 0, speed: 0 });
  const scrollRef = useRef(0);
  const lastScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const scrollDirRef = useRef(0);
  const trailIndexRef = useRef(0);
  const timeRef = useRef(0);
  const { viewport } = useThree();

  // Base particles
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
        col[i * 3] = 0.95; col[i * 3 + 1] = 0.93; col[i * 3 + 2] = 0.9;
      } else if (type < 0.7) {
        col[i * 3] = 0.784; col[i * 3 + 1] = 0.063; col[i * 3 + 2] = 0.180;
      } else {
        col[i * 3] = 0.5; col[i * 3 + 1] = 0.03; col[i * 3 + 2] = 0.09;
      }

      siz[i] = Math.random() * 0.8 + 0.2;
    }
    return [pos, base, col, siz];
  }, []);

  // Trail particles with custom attributes for expanding steam effect
  const [trailPositions, trailColors, trailSizes, trailAges] = useMemo(() => {
    const pos = new Float32Array(TRAIL_COUNT * 3);
    const col = new Float32Array(TRAIL_COUNT * 3);
    const siz = new Float32Array(TRAIL_COUNT);
    const ages = new Float32Array(TRAIL_COUNT);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = -100;
      col[i * 3] = 0.95; col[i * 3 + 1] = 0.93; col[i * 3 + 2] = 0.9;
      siz[i] = 1.0;
      ages[i] = 999;
    }
    return [pos, col, siz, ages];
  }, []);

  const trailAgesRef = useRef(new Float32Array(TRAIL_COUNT).fill(999));
  // Store velocity per trail particle for organic drift
  const trailVelocitiesRef = useRef(new Float32Array(TRAIL_COUNT * 3).fill(0));

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
    const prev = scrollRef.current;
    scrollRef.current = window.scrollY;
    scrollDirRef.current = scrollRef.current > prev ? -1 : 1;
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
    timeRef.current += delta;
    const geo = meshRef.current.geometry;
    const posAttr = geo.getAttribute('position');
    const posArray = posAttr.array as Float32Array;

    const mx = mouseRef.current.x * viewport.width * 0.5;
    const my = mouseRef.current.y * viewport.height * 0.5;
    const mouseSpeed = mouseRef.current.speed;

    // Scroll velocity — amplified for visible effect
    const scrollDelta = scrollRef.current - lastScrollRef.current;
    const scrollAbs = Math.abs(scrollDelta);
    lastScrollRef.current = scrollRef.current;
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, scrollAbs * 0.015, 0.15);

    const isActive = mouseRef.current.active || velocityRef.current > 0.005;

    // === TRAIL: Dreamy expanding steam ===
    if (trailRef.current) {
      const trailPosAttr = trailRef.current.geometry.getAttribute('position');
      const trailPosArray = trailPosAttr.array as Float32Array;
      const trailColArray = trailRef.current.geometry.getAttribute('color').array as Float32Array;
      const trailSizeAttr = trailRef.current.geometry.getAttribute('aSize');
      const trailSizeArray = trailSizeAttr.array as Float32Array;
      const trailAgeAttr = trailRef.current.geometry.getAttribute('aAge');
      const trailAgeArray = trailAgeAttr.array as Float32Array;
      const ages = trailAgesRef.current;
      const vels = trailVelocitiesRef.current;

      // Spawn from cursor movement
      if (mouseSpeed > 0.003) {
        const spawnCount = Math.min(Math.floor(mouseSpeed * 50) + 2, 8);
        for (let s = 0; s < spawnCount; s++) {
          const idx = trailIndexRef.current % TRAIL_COUNT;
          const t = s / spawnCount;
          // Interpolate between previous and current mouse pos for smooth trail
          const spawnX = THREE.MathUtils.lerp(mouseRef.current.prevX, mouseRef.current.x, t) * viewport.width * 0.5;
          const spawnY = THREE.MathUtils.lerp(mouseRef.current.prevY, mouseRef.current.y, t) * viewport.height * 0.5;

          const tinySpread = 0.08;
          trailPosArray[idx * 3] = spawnX + (Math.random() - 0.5) * tinySpread;
          trailPosArray[idx * 3 + 1] = spawnY + (Math.random() - 0.5) * tinySpread;
          trailPosArray[idx * 3 + 2] = (Math.random() - 0.5) * 0.3;

          // Give each particle a random drift velocity (like steam dispersing)
          const angle = Math.random() * Math.PI * 2;
          const driftSpeed = 0.2 + Math.random() * 0.4;
          vels[idx * 3] = Math.cos(angle) * driftSpeed;
          vels[idx * 3 + 1] = Math.sin(angle) * driftSpeed + 0.15; // slight upward bias
          vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.1;

          // Colors matching site: warm white + crimson
          const r = Math.random();
          if (r < 0.45) {
            trailColArray[idx * 3] = 0.95; trailColArray[idx * 3 + 1] = 0.93; trailColArray[idx * 3 + 2] = 0.9;
          } else if (r < 0.8) {
            trailColArray[idx * 3] = 0.784; trailColArray[idx * 3 + 1] = 0.063; trailColArray[idx * 3 + 2] = 0.180;
          } else {
            trailColArray[idx * 3] = 0.5; trailColArray[idx * 3 + 1] = 0.03; trailColArray[idx * 3 + 2] = 0.09;
          }

          trailSizeArray[idx] = 0.3 + Math.random() * 0.4;
          ages[idx] = 0;
          trailAgeArray[idx] = 0;
          trailIndexRef.current++;
        }
      }

      // Spawn particles on scroll too
      if (scrollAbs > 2) {
        const scrollSpawn = Math.min(Math.floor(scrollAbs * 0.3), 6);
        for (let s = 0; s < scrollSpawn; s++) {
          const idx = trailIndexRef.current % TRAIL_COUNT;
          // Spawn across visible area
          trailPosArray[idx * 3] = (Math.random() - 0.5) * viewport.width;
          trailPosArray[idx * 3 + 1] = (Math.random() - 0.5) * viewport.height;
          trailPosArray[idx * 3 + 2] = (Math.random() - 0.5) * 2;

          const angle = Math.random() * Math.PI * 2;
          const driftSpeed = 0.1 + Math.random() * 0.3;
          vels[idx * 3] = Math.cos(angle) * driftSpeed;
          vels[idx * 3 + 1] = scrollDirRef.current * (0.3 + Math.random() * 0.5);
          vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.1;

          const r = Math.random();
          if (r < 0.5) {
            trailColArray[idx * 3] = 0.95; trailColArray[idx * 3 + 1] = 0.93; trailColArray[idx * 3 + 2] = 0.9;
          } else {
            trailColArray[idx * 3] = 0.784; trailColArray[idx * 3 + 1] = 0.063; trailColArray[idx * 3 + 2] = 0.180;
          }

          trailSizeArray[idx] = 0.2 + Math.random() * 0.3;
          ages[idx] = 0;
          trailAgeArray[idx] = 0;
          trailIndexRef.current++;
        }
      }

      // Update trail particles — expand + drift like dissipating steam
      for (let i = 0; i < TRAIL_COUNT; i++) {
        ages[i] += delta * 0.3; // Slow aging for dreamy feel
        const life = ages[i];
        trailAgeArray[i] = life;

        if (life > 1.0) {
          trailPosArray[i * 3 + 2] = -100; // hide
        } else {
          // Organic drift with deceleration
          const drag = 1.0 - life * 0.5;
          trailPosArray[i * 3] += vels[i * 3] * delta * drag;
          trailPosArray[i * 3 + 1] += vels[i * 3 + 1] * delta * drag;
          trailPosArray[i * 3 + 2] += vels[i * 3 + 2] * delta * drag;
          // Add gentle wandering
          trailPosArray[i * 3] += Math.sin(timeRef.current * 2 + i * 0.7) * delta * 0.05;
          trailPosArray[i * 3 + 1] += Math.cos(timeRef.current * 1.5 + i * 0.5) * delta * 0.04;
        }
      }

      trailPosAttr.needsUpdate = true;
      trailRef.current.geometry.getAttribute('color').needsUpdate = true;
      trailSizeAttr.needsUpdate = true;
      trailAgeAttr.needsUpdate = true;
    }

    // === BASE PARTICLES ===
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const bx = basePositions[ix];
      const by = basePositions[ix + 1];
      const bz = basePositions[ix + 2];

      // Gentle ambient floating always
      const floatX = Math.sin(timeRef.current * 0.3 + i * 0.1) * 0.02;
      const floatY = Math.cos(timeRef.current * 0.2 + i * 0.15) * 0.015;

      if (isActive) {
        const dx = posArray[ix] - mx;
        const dy = posArray[ix + 1] - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 4);

        const speedMult = 1 + mouseSpeed * 6;
        const pushX = influence * dx * 0.2 * speedMult;
        const pushY = influence * dy * 0.2 * speedMult;
        const bloom = influence * Math.sin(timeRef.current * 2 + i) * 0.15 * speedMult;

        // Scroll makes particles drift like wind
        const scrollWind = velocityRef.current * Math.sin(i * 0.05 + timeRef.current) * 3;
        const scrollLift = velocityRef.current * Math.cos(i * 0.08 + timeRef.current * 0.7) * 2;

        const targetX = bx + pushX + scrollWind + floatX;
        const targetY = by + pushY + bloom + scrollLift * scrollDirRef.current + floatY;
        const targetZ = bz + influence * 1.0 * speedMult;

        posArray[ix] = THREE.MathUtils.lerp(posArray[ix], targetX, delta * 1.0);
        posArray[ix + 1] = THREE.MathUtils.lerp(posArray[ix + 1], targetY, delta * 1.0);
        posArray[ix + 2] = THREE.MathUtils.lerp(posArray[ix + 2], targetZ, delta * 1.0);
      } else {
        posArray[ix] = THREE.MathUtils.lerp(posArray[ix], bx + floatX, delta * 0.2);
        posArray[ix + 1] = THREE.MathUtils.lerp(posArray[ix + 1], by + floatY, delta * 0.2);
        posArray[ix + 2] = THREE.MathUtils.lerp(posArray[ix + 2], bz, delta * 0.2);
      }
    }

    posAttr.needsUpdate = true;
    mouseRef.current.active = false;
  });

  const trailMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, []);

  return (
    <>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={PARTICLE_COUNT} array={sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial size={0.02} vertexColors transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>

      {/* Trail particles — dreamy expanding steam */}
      <points ref={trailRef} material={trailMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={TRAIL_COUNT} array={trailPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={TRAIL_COUNT} array={trailColors} itemSize={3} />
          <bufferAttribute attach="attributes-aSize" count={TRAIL_COUNT} array={trailSizes} itemSize={1} />
          <bufferAttribute attach="attributes-aAge" count={TRAIL_COUNT} array={trailAges} itemSize={1} />
        </bufferGeometry>
      </points>
    </>
  );
}

export default function ParticleField() {
  return (
    <div className="fixed inset-0 z-0" style={{ filter: 'blur(0.5px)' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Particles />
        <EffectComposer>
          <Bloom
            intensity={1.8}
            luminanceThreshold={0.08}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
