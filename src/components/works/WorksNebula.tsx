import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// A cheap flowing-gradient shader — layered sine fields, not true simplex
// noise, but it reads as an organic drifting nebula at a fraction of the
// cost. Scoped to the Works section only (own small canvas, own rAF via r3f,
// paused when the section is off-screen).

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec2 uMouse;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.05;
    vec2 m = uMouse * 0.06;

    float n = sin((uv.x * 2.6 + t + m.x) * 2.0) * cos((uv.y * 2.4 - t + m.y) * 2.0);
    n += sin((uv.x * 4.2 - t * 1.4) + uv.y * 3.6) * 0.5;
    n += sin((uv.y * 3.1 + t * 0.7) - uv.x * 2.1) * 0.35;
    n = n * 0.5 + 0.5;

    vec3 col = mix(uColorA, uColorB, clamp(n, 0.0, 1.0));
    float vign = smoothstep(1.05, 0.15, length(uv - 0.5));
    float alpha = n * 0.32 * vign;

    gl_FragColor = vec4(col, alpha);
  }
`;

function NebulaPlane({ runningRef }: { runningRef: React.MutableRefObject<boolean> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    if (!runningRef.current || !matRef.current) return;
    matRef.current.uniforms.uTime.value += delta;
    matRef.current.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
  });

  const uniforms = useRef({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#1a0508') },
    uColorB: { value: new THREE.Color('#ff2244') },
    uMouse: { value: new THREE.Vector2(0, 0) },
  });

  return (
    <mesh scale={[2.4, 2.4, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function WorksNebula() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        runningRef.current = entry.isIntersecting;
        if (entry.isIntersecting) setMounted(true);
      },
      { threshold: 0.01, rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {mounted && (
        <Canvas
          camera={{ position: [0, 0, 1], fov: 50 }}
          gl={{ antialias: false, alpha: true }}
          dpr={[1, 1.25]}
          style={{ background: 'transparent' }}
        >
          <NebulaPlane runningRef={runningRef} />
        </Canvas>
      )}
    </div>
  );
}
