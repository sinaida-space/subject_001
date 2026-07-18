// fx.js — standalone WebGL2 post-processing kit (bloom, dither, LED mosaic, VHS, scanlines)
// Zero dependencies, no build step. ES module served verbatim from /public.
// Pipeline: page draw(ctx2d,t) → offscreen 2D canvas → texture → pass chain (ping-pong FBOs) → visible canvas.

// ---------------------------------------------------------------------------
// Shaders (GLSL ES 3.00)
// ---------------------------------------------------------------------------

const VERT = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const COPY = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
void main(){ frag = texture(uTex, vUv); }`;

// Ordered Bayer 8x8 dithering with optional palette quantization. Stable, no temporal shimmer.
const DITHER = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uLevels;   // quantization steps per channel
uniform float uScale;    // pixelation block size
uniform int uPaletteCount;
uniform vec3 uPalette[16];
const float BAYER[64] = float[64](
   0.0,32.0, 8.0,40.0, 2.0,34.0,10.0,42.0,
  48.0,16.0,56.0,24.0,50.0,18.0,58.0,26.0,
  12.0,44.0, 4.0,36.0,14.0,46.0, 6.0,38.0,
  60.0,28.0,52.0,20.0,62.0,30.0,54.0,22.0,
   3.0,35.0,11.0,43.0, 1.0,33.0, 9.0,41.0,
  51.0,19.0,59.0,27.0,49.0,17.0,57.0,25.0,
  15.0,47.0, 7.0,39.0,13.0,45.0, 5.0,37.0,
  63.0,31.0,55.0,23.0,61.0,29.0,53.0,21.0);
void main(){
  vec2 block = floor(gl_FragCoord.xy / uScale);
  vec2 sampleUv = (block * uScale + uScale * 0.5) / uRes;
  vec3 c = texture(uTex, sampleUv).rgb;
  int ix = int(mod(block.x, 8.0));
  int iy = int(mod(block.y, 8.0));
  float thr = (BAYER[iy * 8 + ix] + 0.5) / 64.0 - 0.5; // centered [-0.5, 0.5)
  if(uPaletteCount > 0){
    vec3 d = clamp(c + thr / max(uLevels, 1.0), 0.0, 1.0);
    float best = 1e9; vec3 hit = uPalette[0];
    for(int i = 0; i < 16; i++){
      if(i >= uPaletteCount) break;
      float dist = distance(d, uPalette[i]);
      if(dist < best){ best = dist; hit = uPalette[i]; }
    }
    frag = vec4(hit, 1.0);
  } else {
    float steps = max(uLevels - 1.0, 1.0);
    vec3 d = c + thr / steps;
    vec3 q = floor(d * steps + 0.5) / steps;
    frag = vec4(clamp(q, 0.0, 1.0), 1.0);
  }
}`;

// LED / dot-matrix mosaic: quantize into cells, sample cell centre, mask with round or square dot.
const LED = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uPitch;  // cell size in px
uniform float uGap;    // 0..1 fraction of cell used as inter-dot gap
uniform float uShape;  // 1.0 round, 0.0 square
void main(){
  vec2 cell = floor(gl_FragCoord.xy / uPitch);
  vec2 centre = (cell + 0.5) * uPitch;
  vec3 c = texture(uTex, centre / uRes).rgb;
  vec2 local = (gl_FragCoord.xy - centre) / uPitch; // -0.5..0.5
  float half_ = 0.5 * (1.0 - uGap);
  float mask;
  if(uShape > 0.5){
    float r = length(local);
    mask = 1.0 - smoothstep(half_ - 0.04, half_, r);
  } else {
    vec2 a = abs(local);
    float e = 0.02;
    mask = (1.0 - smoothstep(half_ - e, half_, a.x)) * (1.0 - smoothstep(half_ - e, half_, a.y));
  }
  frag = vec4(c * mask, 1.0);
}`;

// VHS: per-line horizontal tracking wobble, RGB chroma bleed, additive grain.
const VHS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uTracking; // horizontal instability
uniform float uChroma;   // channel offset in px
uniform float uNoise;    // grain amount
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  float row = uv.y * uRes.y;
  float wobble = sin(uv.y * 90.0 + uTime * 6.0) * 0.0025;
  wobble += (hash(vec2(floor(row * 0.25), floor(uTime * 12.0))) - 0.5) * 0.012;
  uv.x += wobble * uTracking;
  vec2 off = vec2(uChroma / uRes.x, 0.0);
  float r = texture(uTex, uv + off).r;
  float g = texture(uTex, uv).g;
  float b = texture(uTex, uv - off).b;
  vec3 c = vec3(r, g, b);
  float n = hash(uv + fract(uTime));
  c += (n - 0.5) * uNoise;
  frag = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// Scanlines: periodic horizontal darkening.
const SCAN = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
uniform float uOpacity;
uniform float uPeriod; // line period in px
void main(){
  vec3 c = texture(uTex, vUv).rgb;
  float m = 0.5 + 0.5 * cos(gl_FragCoord.y * 6.2831853 / uPeriod);
  c *= 1.0 - uOpacity * m;
  frag = vec4(c, 1.0);
}`;

// Bloom step 1: bright-pass isolate above threshold (rendered at half-res).
const BRIGHT = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
uniform float uThreshold;
void main(){
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = max(l - uThreshold, 0.0) / max(l, 1e-4);
  frag = vec4(c * k, 1.0);
}`;

// Bloom step 2/3: separable gaussian (9-tap), direction + step supplied per pass.
const BLUR = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uDir;   // (1,0) or (0,1)
uniform float uStep; // per-tap texel offset
void main(){
  float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 sum = texture(uTex, vUv).rgb * w[0];
  for(int i = 1; i < 5; i++){
    vec2 o = uDir * uTexel * (float(i) * uStep);
    sum += texture(uTex, vUv + o).rgb * w[i];
    sum += texture(uTex, vUv - o).rgb * w[i];
  }
  frag = vec4(sum, 1.0);
}`;

// Bloom step 4: additive composite of blurred highlights over the scene.
const COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uStrength;
void main(){
  vec3 s = texture(uScene, vUv).rgb;
  vec3 b = texture(uBloom, vUv).rgb;
  frag = vec4(s + b * uStrength, 1.0);
}`;

// ---------------------------------------------------------------------------
// Defaults + param helpers
// ---------------------------------------------------------------------------

const DEFAULTS = {
  bloom:     { threshold: 0.6, strength: 1.2, radius: 8 },
  dither:    { levels: 4, scale: 2, palette: null },
  ledMosaic: { pitch: 10, gap: 0.35, shape: 'round' },
  vhs:       { tracking: 0.5, chroma: 2.0, noise: 0.15 },
  scanlines: { opacity: 0.18, period: 3 },
};

function clone(o){ return JSON.parse(JSON.stringify(o)); }

function deepMerge(target, src){
  for(const k in src){
    const v = src[k];
    if(v && typeof v === 'object' && !Array.isArray(v)){
      if(!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

// ---------------------------------------------------------------------------
// GL helpers
// ---------------------------------------------------------------------------

function compile(gl, type, src){
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('shader compile: ' + log);
  }
  return sh;
}

function program(gl, fragSrc){
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error('program link: ' + log);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Engine — owns GL programs, ping-pong FBOs, the pass chain. Shared by createFX + renderStill.
// ---------------------------------------------------------------------------

function createEngine(gl){
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const programs = {
    dither: program(gl, DITHER),
    ledMosaic: program(gl, LED),
    vhs: program(gl, VHS),
    scanlines: program(gl, SCAN),
    bright: program(gl, BRIGHT),
    blur: program(gl, BLUR),
    composite: program(gl, COMPOSITE),
    copy: program(gl, COPY),
  };

  const locs = new Map();
  function U(p, name){
    let m = locs.get(p);
    if(!m){ m = new Map(); locs.set(p, m); }
    if(!m.has(name)) m.set(name, gl.getUniformLocation(p, name));
    return m.get(name);
  }

  let W = 0, H = 0, hw = 1, hh = 1;
  let sceneTex = null;
  let full = [null, null];
  let half = [null, null];

  function makeTarget(w, h){
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  }
  function freeTarget(t){ if(!t) return; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); }

  function resize(w, h){
    W = Math.max(1, w | 0); H = Math.max(1, h | 0);
    hw = Math.max(1, W >> 1); hh = Math.max(1, H >> 1);
    full.forEach(freeTarget); half.forEach(freeTarget);
    full = [makeTarget(W, H), makeTarget(W, H)];
    half = [makeTarget(hw, hh), makeTarget(hw, hh)];
    if(!sceneTex){
      sceneTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  function drawQuad(){ gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  function bindTex(tex, unit){ gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); }

  function uploadSource(src){
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return sceneTex;
  }

  function pass(name, inputTex, target, params, time){
    const p = programs[name];
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, target.w, target.h);
    bindTex(inputTex, 0);
    gl.uniform1i(U(p, 'uTex'), 0);
    gl.uniform2f(U(p, 'uRes'), target.w, target.h);
    gl.uniform1f(U(p, 'uTime'), time);
    if(name === 'dither'){
      const d = params.dither;
      gl.uniform1f(U(p, 'uLevels'), d.levels);
      gl.uniform1f(U(p, 'uScale'), Math.max(1, d.scale));
      const pal = Array.isArray(d.palette) ? d.palette.slice(0, 16) : [];
      const flat = new Float32Array(48);
      pal.forEach((c, i) => { flat[i*3] = c[0]; flat[i*3+1] = c[1]; flat[i*3+2] = c[2]; });
      gl.uniform1i(U(p, 'uPaletteCount'), pal.length);
      gl.uniform3fv(U(p, 'uPalette[0]'), flat);
    } else if(name === 'ledMosaic'){
      const m = params.ledMosaic;
      gl.uniform1f(U(p, 'uPitch'), Math.max(2, m.pitch));
      gl.uniform1f(U(p, 'uGap'), m.gap);
      gl.uniform1f(U(p, 'uShape'), m.shape === 'square' ? 0.0 : 1.0);
    } else if(name === 'vhs'){
      const v = params.vhs;
      gl.uniform1f(U(p, 'uTracking'), v.tracking);
      gl.uniform1f(U(p, 'uChroma'), v.chroma);
      gl.uniform1f(U(p, 'uNoise'), v.noise);
    } else if(name === 'scanlines'){
      const s = params.scanlines;
      gl.uniform1f(U(p, 'uOpacity'), s.opacity);
      gl.uniform1f(U(p, 'uPeriod'), Math.max(1, s.period));
    }
    drawQuad();
  }

  // Separable gaussian bloom at half resolution, composited back over the full-res scene.
  function bloom(inputTex, target, bp){
    let p = programs.bright;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, half[0].fb);
    gl.viewport(0, 0, hw, hh);
    bindTex(inputTex, 0); gl.uniform1i(U(p, 'uTex'), 0);
    gl.uniform1f(U(p, 'uThreshold'), bp.threshold);
    drawQuad();

    p = programs.blur;
    gl.useProgram(p);
    gl.uniform1i(U(p, 'uTex'), 0);
    gl.uniform2f(U(p, 'uTexel'), 1 / hw, 1 / hh);
    gl.uniform1f(U(p, 'uStep'), Math.max(0.25, bp.radius * 0.25));
    // horizontal: half[0] -> half[1]
    gl.bindFramebuffer(gl.FRAMEBUFFER, half[1].fb);
    gl.viewport(0, 0, hw, hh);
    bindTex(half[0].tex, 0); gl.uniform2f(U(p, 'uDir'), 1, 0);
    drawQuad();
    // vertical: half[1] -> half[0]
    gl.bindFramebuffer(gl.FRAMEBUFFER, half[0].fb);
    gl.viewport(0, 0, hw, hh);
    bindTex(half[1].tex, 0); gl.uniform2f(U(p, 'uDir'), 0, 1);
    drawQuad();

    p = programs.composite;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, target.w, target.h);
    bindTex(inputTex, 0); gl.uniform1i(U(p, 'uScene'), 0);
    bindTex(half[0].tex, 1); gl.uniform1i(U(p, 'uBloom'), 1);
    gl.uniform1f(U(p, 'uStrength'), bp.strength);
    drawQuad();
  }

  // Run the requested passes over inputTex; returns the final texture (never written same frame as read).
  function runChain(inputTex, passesArr, params, time){
    let read = inputTex, ping = 0;
    for(const name of passesArr){
      const target = full[ping];
      if(name === 'bloom') bloom(read, target, params.bloom);
      else if(programs[name]) pass(name, read, target, params, time);
      else continue;
      read = target.tex;
      ping ^= 1;
    }
    return read;
  }

  function present(tex, vw, vh){
    const p = programs.copy;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, vw, vh);
    bindTex(tex, 0); gl.uniform1i(U(p, 'uTex'), 0);
    drawQuad();
  }

  function destroy(){
    full.forEach(freeTarget); half.forEach(freeTarget);
    if(sceneTex) gl.deleteTexture(sceneTex);
    for(const k in programs) gl.deleteProgram(programs[k]);
    gl.deleteBuffer(vbo); gl.deleteVertexArray(vao);
    full = [null, null]; half = [null, null]; sceneTex = null;
  }

  return { resize, uploadSource, runChain, present, destroy };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function supportsFull(){
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const reduced = typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !!gl && !reduced;
  } catch(e){ return false; }
}

export function createFX(canvas, opts = {}){
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false,
  });
  if(!gl) throw new Error('createFX: WebGL2 not supported (use the CSS tier)');

  const params = deepMerge(clone(DEFAULTS), opts.params || {});
  let passesArr = Array.isArray(opts.passes) ? opts.passes.slice()
    : ['dither', 'ledMosaic', 'vhs', 'bloom', 'scanlines'];

  const engine = createEngine(gl);
  const off = document.createElement('canvas');
  const ctx2d = off.getContext('2d');

  let W = 0, H = 0;
  function measure(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.round(rect.width || canvas.clientWidth || 300));
    const cssH = Math.max(1, Math.round(rect.height || canvas.clientHeight || 150));
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if(w === W && h === H) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    off.width = W; off.height = H;
    engine.resize(W, H);
  }
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(canvas);

  let rafId = 0, running = false, startT = 0, drawFn = null;
  function frame(now){
    if(!running) return;
    if(!startT) startT = now;
    const t = (now - startT) / 1000;
    if(drawFn) drawFn(ctx2d, t);
    const src = engine.uploadSource(off);
    const finalTex = engine.runChain(src, passesArr, params, t);
    engine.present(finalTex, W, H);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start(fn){ drawFn = fn || drawFn; if(running) return; running = true; startT = 0; rafId = requestAnimationFrame(frame); },
    stop(){ running = false; if(rafId) cancelAnimationFrame(rafId); rafId = 0; },
    setParams(part){ deepMerge(params, part || {}); },
    setPasses(arr){ if(Array.isArray(arr)) passesArr = arr.slice(); }, // test-harness helper for toggling
    destroy(){ this.stop(); ro.disconnect(); engine.destroy(); },
    get params(){ return params; },
    get passes(){ return passesArr.slice(); },
    gl,
  };
}

// One-shot: run passes over a static image/canvas into a target canvas (e.g. dithered stills).
export function renderStill(source, target, passesArr, paramsIn){
  const w = source.naturalWidth || source.videoWidth || source.width;
  const h = source.naturalHeight || source.videoHeight || source.height;
  const scratch = document.createElement('canvas');
  scratch.width = w; scratch.height = h;
  const gl = scratch.getContext('webgl2', {
    antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true,
  });
  const ctx = target.getContext('2d');
  target.width = w; target.height = h;
  if(!gl){ ctx.drawImage(source, 0, 0); return; } // CSS tier / no WebGL2: pass source through
  const engine = createEngine(gl);
  engine.resize(w, h);
  const params = deepMerge(clone(DEFAULTS), paramsIn || {});
  const src = engine.uploadSource(source);
  const finalTex = engine.runChain(src, Array.isArray(passesArr) ? passesArr : [], params, 0);
  engine.present(finalTex, w, h);
  ctx.drawImage(scratch, 0, 0);
  engine.destroy();
}
