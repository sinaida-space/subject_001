import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

export default function WindUnfold() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tearStarted, setTearStarted] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Scene
    const scene = new THREE.Scene();

    // Orthographic camera
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100);
    camera.position.z = 2;

    // Uniforms
    const uniforms = {
      uTime: { value: 0 },
      uTearProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
    };

    // Membrane mesh (subdivided plane)
    const planeGeometry = new THREE.PlaneGeometry(aspect * 2.2, 2.2, 80, 80);
    
    const membraneMaterial = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uTearProgress;
        varying vec2 vUv;
        varying float vDisplacement;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Breathing wind displacement
          float displacement = sin(pos.x * 2.1 + uTime * 1.2) * 0.08
                             + sin(pos.x * 4.3 - uTime * 0.8) * 0.04
                             + sin(pos.y * 3.1 + uTime * 1.5) * 0.06;
          
          // Edge curl when tearing
          float tearLine = (vUv.x + vUv.y * 0.7) * 0.6;
          float distFromTear = tearLine - uTearProgress;
          
          if (distFromTear < 0.0 && distFromTear > -0.15) {
            // Curl the torn edges
            float curlAmount = smoothstep(-0.15, 0.0, distFromTear) * uTearProgress * 0.4;
            pos.z += curlAmount;
            pos.y -= curlAmount * 0.3;
          }
          
          pos.y += displacement * (1.0 - uTearProgress * 0.5);
          pos.z += displacement * 0.3;
          
          vDisplacement = displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uTearProgress;
        uniform vec2 uResolution;
        varying vec2 vUv;
        varying float vDisplacement;
        
        // Noise function
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          // Calculate tear line with jagged edges
          float tearLine = (vUv.x + vUv.y * 0.7) * 0.6;
          tearLine += sin(vUv.y * 18.0 + uTime * 3.0) * 0.04;
          tearLine += sin(vUv.x * 12.0 - uTime * 2.2) * 0.03;
          tearLine += hash(vUv * 50.0) * 0.02;
          
          float distFromTear = tearLine - uTearProgress;
          
          // Behind tear = transparent
          if (distFromTear < -0.01) {
            discard;
          }
          
          // Base color - solid black
          vec3 color = vec3(0.0);
          
          // Subtle edge glow where displacement is highest
          float edgeGlow = smoothstep(0.06, 0.12, abs(vDisplacement));
          color += vec3(0.1, 0.0, 0.0) * edgeGlow * 0.3;
          
          // Tear edge glow
          float tearEdgeDist = abs(distFromTear);
          if (tearEdgeDist < 0.06 && uTearProgress > 0.01) {
            float edgeIntensity = 1.0 - tearEdgeDist / 0.06;
            // Red to cyan gradient
            vec3 tearColor = mix(
              vec3(1.0, 0.13, 0.0),  // Red #ff2200
              vec3(0.0, 0.9, 1.0),   // Cyan #00e5ff
              tearEdgeDist / 0.06
            );
            color += tearColor * edgeIntensity * 0.8;
          }
          
          float alpha = 1.0;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    const membrane = new THREE.Mesh(planeGeometry, membraneMaterial);
    scene.add(membrane);

    // Wind streaks (hair-thin lines)
    const windLineCount = 800;
    const windLines: THREE.Line[] = [];
    const windVelocities: number[] = [];
    
    for (let i = 0; i < windLineCount; i++) {
      const lineGeometry = new THREE.BufferGeometry();
      const startX = -aspect - Math.random() * 2;
      const y = (Math.random() - 0.5) * 2;
      const length = 0.1 + Math.random() * 0.3;
      
      const positions = new Float32Array([
        startX, y, 0.1,
        startX + length, y, 0.1,
      ]);
      
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.06,
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      windLines.push(line);
      windVelocities.push(0.003 + Math.random() * 0.009);
      scene.add(line);
    }

    // Debris particles (for tear effect)
    const debrisCount = 2000;
    const debrisGeometry = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(debrisCount * 3);
    const debrisVelocities: { x: number; y: number; z: number; life: number }[] = [];
    const debrisColors = new Float32Array(debrisCount * 3);
    
    for (let i = 0; i < debrisCount; i++) {
      debrisPositions[i * 3] = 0;
      debrisPositions[i * 3 + 1] = 0;
      debrisPositions[i * 3 + 2] = -10; // Hidden initially
      
      debrisVelocities.push({ x: 0, y: 0, z: 0, life: 0 });
      
      // Random red or cyan
      if (Math.random() > 0.5) {
        debrisColors[i * 3] = 1.0;
        debrisColors[i * 3 + 1] = 0.13;
        debrisColors[i * 3 + 2] = 0.0;
      } else {
        debrisColors[i * 3] = 0.0;
        debrisColors[i * 3 + 1] = 0.9;
        debrisColors[i * 3 + 2] = 1.0;
      }
    }
    
    debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    debrisGeometry.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
    
    const debrisMaterial = new THREE.PointsMaterial({
      size: 2,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      sizeAttenuation: false,
    });
    
    const debris = new THREE.Points(debrisGeometry, debrisMaterial);
    scene.add(debris);

    let debrisIndex = 0;
    let tearProgress = 0;
    let targetTearProgress = 0;
    let time = 0;
    let animationId: number;

    // Intersection observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio > 0.2 && !tearStarted) {
          setTearStarted(true);
          targetTearProgress = 1.2;
          setTimeout(() => setTextVisible(true), 800);
        }
      },
      { threshold: [0, 0.2, 0.5, 0.8, 1.0] }
    );
    
    observer.observe(container);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.016;
      
      uniforms.uTime.value = time;
      
      // Smooth tear progress
      if (targetTearProgress > tearProgress) {
        tearProgress += (targetTearProgress - tearProgress) * 0.015;
        uniforms.uTearProgress.value = tearProgress;
        
        // Spawn debris at tear edge
        if (tearProgress > 0.01 && tearProgress < 1.0) {
          for (let i = 0; i < 5; i++) {
            const idx = debrisIndex % debrisCount;
            const positions = debris.geometry.attributes.position.array as Float32Array;
            
            // Position along tear line
            const tearX = (tearProgress * 2 - 1) * aspect;
            const tearY = (Math.random() - 0.5) * 2;
            
            positions[idx * 3] = tearX + (Math.random() - 0.5) * 0.1;
            positions[idx * 3 + 1] = tearY;
            positions[idx * 3 + 2] = 0.2;
            
            debrisVelocities[idx] = {
              x: 0.02 + Math.random() * 0.03,
              y: (Math.random() - 0.5) * 0.02,
              z: Math.random() * 0.01,
              life: 1.5,
            };
            
            debrisIndex++;
          }
        }
        
        // Fade out when tear complete
        if (tearProgress > 0.95 && !fadeOut) {
          setFadeOut(true);
        }
      }
      
      // Update debris
      const debrisPos = debris.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < debrisCount; i++) {
        if (debrisVelocities[i].life > 0) {
          debrisPos[i * 3] += debrisVelocities[i].x;
          debrisPos[i * 3 + 1] += debrisVelocities[i].y;
          debrisPos[i * 3 + 2] += debrisVelocities[i].z;
          debrisVelocities[i].life -= 0.016;
          
          if (debrisVelocities[i].life <= 0) {
            debrisPos[i * 3 + 2] = -10; // Hide
          }
        }
      }
      debris.geometry.attributes.position.needsUpdate = true;
      
      // Update wind lines
      for (let i = 0; i < windLineCount; i++) {
        const line = windLines[i];
        const positions = line.geometry.attributes.position.array as Float32Array;
        
        positions[0] += windVelocities[i];
        positions[3] += windVelocities[i];
        
        // Reset when off screen
        if (positions[0] > aspect + 0.5) {
          const newX = -aspect - Math.random() * 0.5;
          const length = positions[3] - positions[0];
          positions[0] = newX;
          positions[3] = newX + length;
          positions[1] = (Math.random() - 0.5) * 2;
          positions[4] = positions[1];
        }
        
        line.geometry.attributes.position.needsUpdate = true;
        
        // Hide wind after tear complete
        if (tearProgress > 0.95) {
          (line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.06 - tearProgress * 0.1);
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      const newAspect = newWidth / newHeight;
      
      renderer.setSize(newWidth, newHeight);
      camera.left = -newAspect;
      camera.right = newAspect;
      camera.updateProjectionMatrix();
      
      uniforms.uResolution.value.set(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationId);
      
      planeGeometry.dispose();
      membraneMaterial.dispose();
      debrisGeometry.dispose();
      debrisMaterial.dispose();
      windLines.forEach((line) => {
        line.geometry.dispose();
        (line.material as THREE.LineBasicMaterial).dispose();
      });
      renderer.dispose();
    };
  }, [tearStarted, fadeOut]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ height: '55vh' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* Reveal text */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-700 ${textVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          top: '40%',
          fontFamily: 'monospace',
          fontSize: '12px',
          letterSpacing: '0.3em',
          color: '#00e5ff',
        }}
      >
        CLICK TO EXPLORE
      </div>
    </div>
  );
}
