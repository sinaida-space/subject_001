// ─────────────────────────────────────────────────────────────────────────
// Horizon gate (#120): the seam between hero and About as a CRT power-on.
// Scrolling heats the red horizon line to neon; as it rises a second line
// splits off and travels down. The two lines are the edges of a screen
// opening: About is revealed between them, the lower edge develops through
// 3 px Bayer dither cells, and the portrait first lands as a 1-bit red
// dither before it dissolves into the real photo.
//
// Everything is a pure function of the scroll position, so scrolling back
// plays the same frames in reverse and nothing moves while the page rests
// (motion law). About itself stays real DOM at its real size; this is only a
// fixed, pointer-transparent WebGL2 veil drawn on scroll frames while the
// horizon is on screen. Full mode only: lite renders the children as they are.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, type ReactNode } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const PHOTO_SRC = '/sinaida-photo-600.jpg';

// Built in steps (#120), each one switchable on its own: the neon line and
// its split, the dither veil over About, the portrait developing.
const VEIL = false;
const PORTRAIT = false;

const VERT = `#version 300 es
void main() {
  // one triangle covering the screen
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;          // canvas size, device px
uniform float uCell;        // dither cell, device px (3 css px)
uniform float uLine;        // horizon line y, device px from the top
uniform float uLower;       // the line that splits off and travels down
uniform float uBottom;      // bottom edge of About: nothing is veiled below it
uniform vec2 uSpan;         // horizon x extent (left, right)
uniform float uGlow;        // 0 faint divider .. 1 full neon
uniform float uSplit;       // 0 closed .. 1 the screen is fully open
uniform vec4 uPhoto;        // portrait rect x, y, w, h
uniform float uPhotoQ;      // 0 red 1-bit dither .. 1 real photo
uniform float uPhotoReady;
uniform sampler2D uTex;
uniform vec3 uVoid;
uniform float uVeil;        // step b on/off
out vec4 outColor;

const vec3 RED_HOT = vec3(1.0, 0.16, 0.18);  // neon core: burns red, never white
const vec3 RED = vec3(0.8, 0.0, 0.0);        // --sinaida-red

// ordered dither threshold, 8x8 Bayer built from 2x2 steps
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// a neon tube along y = ly: tight core plus a wide soft halo
float tube(float y, float ly, float core, float halo) {
  float d = abs(y - ly);
  return exp(-d * d / (2.0 * core * core)) + 0.35 * exp(-d / halo);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y); // y down, like the page
  vec2 cell = floor(frag / uCell);
  float b = bayer8(cell);
  vec4 col = vec4(0.0);

  // ── the veil: About is dark below the lower line ──
  float band = 18.0 * uCell;                       // dithered developing edge
  float inside = uVeil * step(uLine, frag.y) * step(frag.y, uBottom);
  float k = clamp((frag.y - uLower + band) / band, 0.0, 1.0); // 0 above the band .. 1 at the line
  float cover = inside * step(b, k * k);
  // just above the edge, cells that already opened glow like fresh phosphor
  float phosphor = inside * (1.0 - cover) * k * (1.0 - uSplit * 0.6);
  // faint scanlines over the opened screen, fading as it completes
  float open = inside * step(frag.y, uLower);
  float scan = open * step(0.5, fract(frag.y / uCell * 0.5)) * 0.22 * (1.0 - smoothstep(0.55, 1.0, uSplit));

  col = vec4(uVoid, 1.0) * cover;
  col += vec4(0.0, 0.0, 0.0, scan) * (1.0 - cover);
  col += vec4(RED * 0.55, 0.55) * phosphor * phosphor;

  // ── the portrait develops: 1-bit red dither, then the real photo ──
  vec2 uv = (frag - uPhoto.xy) / uPhoto.zw;
  if (uPhotoReady > 0.5 && cover < 0.5 && all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)))) {
    // cells dissolve in random order so the photo reads as developing, not wiping
    float keep = step(uPhotoQ, hash(cell));
    if (keep > 0.5) {
      vec3 c = texture(uTex, uv).rgb;
      float lum = dot(c, vec3(0.299, 0.587, 0.114));
      lum = clamp((lum - 0.12) * 1.5, 0.0, 1.0);
      float on = step(b, lum);
      col = vec4(mix(uVoid, RED_HOT * 0.9, on), 1.0);
    }
  }

  // ── the two neon lines ──
  float span = smoothstep(uSpan.x, uSpan.x + (uSpan.y - uSpan.x) * 0.22, frag.x)
             * smoothstep(uSpan.y, uSpan.y - (uSpan.y - uSpan.x) * 0.22, frag.x);
  float up = uGlow * span * tube(frag.y, uLine, 0.9 * uCell / 3.0 + 0.6, 10.0 * uCell / 3.0 + 26.0 * uGlow);
  float lowOn = smoothstep(0.0, 0.04, uSplit) * (1.0 - smoothstep(0.88, 1.0, uSplit));
  float down = lowOn * span * tube(frag.y, uLower, 1.1, 14.0 * uCell / 3.0);
  float neon = clamp(up + down, 0.0, 1.0);
  vec3 tint = mix(RED, RED_HOT, clamp(neon * 1.6 - 0.4, 0.0, 1.0));
  col.rgb = col.rgb * (1.0 - neon) + tint * neon;
  col.a = max(col.a, neon);

  outColor = col; // premultiplied
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}

export default function HorizonGate({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    } catch (e) {
      console.error('HorizonGate:', e);
      return;
    }
    gl.useProgram(prog);
    gl.bindVertexArray(gl.createVertexArray());
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      res: U('uRes'), cell: U('uCell'), line: U('uLine'), lower: U('uLower'), bottom: U('uBottom'),
      span: U('uSpan'), glow: U('uGlow'), split: U('uSplit'), photo: U('uPhoto'), photoQ: U('uPhotoQ'),
      photoReady: U('uPhotoReady'), tex: U('uTex'), void: U('uVoid'), veil: U('uVeil'),
    };

    // void colour from the live token, so the veil matches the page exactly
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim().split(/\s+/);
    const l = parseFloat(bg[2] ?? '2') / 100;
    gl.uniform3f(u.void, l, l, l);
    gl.uniform1i(u.tex, 0);
    gl.uniform1f(u.veil, VEIL ? 1 : 0);

    let photoReady = 0;
    const tex = gl.createTexture();
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      photoReady = 1;
      schedule();
    };
    if (PORTRAIT) img.src = PHOTO_SRC;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    let raf = 0;
    let shown = false;
    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
    };

    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      const horizon = root.querySelector<HTMLElement>('[data-horizon]');
      if (!horizon) return;
      const h = horizon.getBoundingClientRect();
      const lineY = h.top + h.height / 2;
      if (lineY < -80 || lineY > vh + 80) { show(false); return; }

      const r = root.getBoundingClientRect();
      // the line heats up as it enters, the screen opens while it rises to the top fifth
      const glow = smooth(vh * 1.02, vh * 0.72, lineY);
      const split = clamp01((vh * 0.82 - lineY) / (vh * 0.6));
      const lower = lineY + (vh + 60 - lineY) * easeInOutCubic(split);

      // the portrait develops once the lower line has passed it
      const photo = root.querySelector<HTMLElement>('#about picture img')?.getBoundingClientRect();
      let photoQ = 1;
      if (photo) photoQ = clamp01((lower - photo.bottom) / (vh * 0.3));

      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.cell, 3 * dpr);
      gl.uniform1f(u.line, lineY * dpr);
      gl.uniform1f(u.lower, lower * dpr);
      gl.uniform1f(u.bottom, r.bottom * dpr);
      gl.uniform2f(u.span, h.left * dpr, h.right * dpr);
      gl.uniform1f(u.glow, glow);
      gl.uniform1f(u.split, split);
      if (photo) gl.uniform4f(u.photo, photo.left * dpr, photo.top * dpr, photo.width * dpr, photo.height * dpr);
      gl.uniform1f(u.photoQ, photoQ);
      gl.uniform1f(u.photoReady, photoReady && photo ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      show(true);
    };
    function schedule() {
      if (!raf) raf = requestAnimationFrame(frame);
    }
    const onResize = () => { resize(); schedule(); };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    // About's layout settles after fonts and lazy images; redraw when it does
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      img.onload = null;
      // no loseContext(): on macOS Chrome it blanks the window for a frame (#119)
      gl.deleteTexture(tex);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ width: '100vw', height: '100vh', visibility: 'hidden' }}
      />
    </div>
  );
}

// Je suis le spectre d'une rose que tu portais hier au bal.
