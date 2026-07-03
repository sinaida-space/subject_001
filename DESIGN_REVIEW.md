# Design Critique: sinaida.eu

## Overall Impression

The bones are excellent — the clinical monospace typography, ECG-red on black, and biomedical framing are a distinctive, ownable brand. Your insecurity about the animations is well-founded, but the problem is not quality — it's **quantity and coherence**. The site currently runs two competing visual languages and ~11 independent animation systems fighting for attention. The fix is subtraction, not more polish.

## The Core Diagnosis

### 1. Two visual languages are at war

| Language | Where | What it says |
|---|---|---|
| **VHS / glitch / decay** | VHSOverlay, glitch-text hero, hover-glitch, tracking-distort, flicker keyframes | "broken, retro, lo-fi, analog nostalgia" |
| **Ethereal / cosmic / clinical** | Starfield, ECG pulses, dust reveals, constellation, waveform | "transcendent, precise, soul engineering" |

Your stated goal — *"dark neon-lit intersection of complex data structures and ethereal visual design, soul engineering, summoning raw human emotion"* — is 100% the second language. VHS glitch actively undermines it: glitch says *entropy*, your brand says *a mind that engineers order out of the ineffable*. A "highly polished digital architect" does not flicker.

**Recommendation: retire the VHS layer** (VHSOverlay, glitch-text, hover-glitch, tracking-distort, flicker). Keep at most one refined accent: a subtle chromatic-aberration shift on hover of interactive elements. This one deletion does more for "polished" than anything you could add.

### 2. Animation inventory — the functional test

Your instinct "fun but functional" is the right razor. Verdict per system:

| System | Function served | Verdict |
|---|---|---|
| SkillConstellation | none yet (static decoration) | **KEEP → promote** to interactive nav centerpiece (the plan) |
| ParticleField (starfield) | atmosphere, presence-response | **KEEP** — fold into single scene |
| ContactChannel waveform | brand signature (ECG = bio + signal) | **KEEP** — it's beautiful and on-message |
| DustReveal | progressive disclosure of content | **KEEP, use sparingly** (headings only) |
| CustomCursor | presence feedback | **KEEP** desktop-only, simplify |
| GalleryTunnel (three.js) | project browsing | **REPLACE** with compact works rows (per plan) — heavy for what it does |
| ScrollWind (800 particles) | none — decorates scrolling | **CUT** — starfield can react to scroll velocity instead, same feeling, zero extra system |
| ParticleCard (3000 particles × card) | none — decorates cards | **CUT** with the cards themselves |
| VHSOverlay + glitch keyframes | none — *punishes* scrolling with distortion | **CUT** |
| SnakeEasterEgg | charm | your call — invisible until found, cheap to keep |
| ParticleImage / useParticleReveal | image reveals | **MERGE** into DustReveal usage |

Result: from ~11 rAF systems to **one scene + two content-reveal effects**. Every surviving animation answers "what does this tell the visitor?": the constellation *is navigation*, the starfield *is presence*, the waveform *is identity*, reveals *are reading order*.

### 3. Performance reality check

Current: 14 rAF call sites, 4+ 2D canvases, a three.js scene, 28 blur/shadowBlur usages (canvas `shadowBlur` is a notorious frame-killer), up to ~10k particles alive at once. This is why it feels unstable — mid-range phones will drop frames, and dropped frames read as *unpolished* no matter how good the design is. The single-scene architecture below fixes this structurally.

## What Works Well (don't touch)

- Typography system: clinical labels, tracking, mono — distinctive and disciplined.
- Color discipline: black / warm white / ECG red with restrained neon accents.
- The biomedical-engineer-turned-artist narrative — "soul engineering" is already latent in the ECG waveform. Lean into it in copy.
- SEO/AI readability is **already solved**: static content + full meta in index.html, llms.txt, sitemap, robots.txt all present and correct. My fetch without JS returned your full bio, services, works. Only maintenance needed: add new projects to the static block + llms.txt, and add JSON-LD `Person`/`CreativeWork` schema (small win for AI tools).

---

# Constellation Implementation Guidelines (lightweight, with bloom)

The non-negotiable architecture rule: **ONE WebGL canvas, ONE rAF loop, fixed as page background.** Everything cosmic lives in one three.js scene with layers. All other animation systems are deleted or CSS-only.

## Layer 1 — Nebula (the "liquid shader")

- Single fullscreen quad, fragment shader: 2–3 octaves of simplex FBM with **domain warping** (`fbm(p + fbm(p + t))`) — this is what produces the liquid, breathing, ethereal quality.
- **Render at quarter resolution** to an offscreen target, upscale with linear filtering. Nebulae are soft by nature — upscaling is invisible and cuts fragment cost ~16×.
- Palette: near-black base, deep crimson + one cold accent (cyan/violet) at low intensity. Slow time uniform (full cycle ~60s). Subtle response to scroll velocity and pointer (warp center drifts toward cursor).
- Cost: ~0.5ms/frame. This single shader delivers the entire "ethereal space escape" mood.

## Layer 2 — Starfield + Constellation (one instanced system)

- All stars AND graph nodes in **one instanced Points/quad buffer** (≤1500 background stars + ~35 graph nodes). One draw call.
- **Bloom without postprocessing** — the key trick: do NOT use UnrealBloomPass (3+ render targets, kills mobile). Instead every star/node is a quad with a **pre-baked radial glow texture, additive blending**. Additive overlapping glows read exactly like bloom at zero postprocess cost. "More bloom" = scale the sprite, not a filter.
- Node hierarchy by glow size/intensity: projects = large bright, skills = medium, background stars = faint. Hover/tap = animate sprite scale + intensity (springy, ~300ms) — selective bloom for free.
- Edges: line segments with a shader that animates a bright pulse traveling along the line (ECG signal). Only animate pulses on 2–3 edges at a time, on hover or on a slow idle cycle.

## Layer 3 — Physics (cheap, not d3-force-per-frame)

- Run force-directed layout **once at load** (or precompute and ship as JSON — even better). At runtime, nodes only: (a) oscillate on per-node sine offsets ("breathing"), (b) spring toward pointer within a radius (presence gravity), (c) spring-return after drag. That's ~35 nodes × trivial math — negligible.
- Drag on desktop = pointer events on the canvas with raycast against node positions (2D projected — no real raycaster needed, just distance check).

## Interaction wiring (the functional value)

- Hover/tap skill node → connected project nodes bloom up, edges pulse, everything else dims 40%.
- Tap project node → smooth-scroll to its Selected Works row (internal) or open link (games/tools).
- Hover a line in Experiments & Tools list → its node blooms in the constellation. (DOM → canvas via shared event bus, trivial.)
- Constellation reacts to scroll: as you scroll past it, the camera drifts — stars parallax at different depths.

## Budget (acceptance criteria for the executor)

| Constraint | Value |
|---|---|
| Canvases | 1 WebGL (+ ContactChannel's small 2D waveform) |
| rAF loops | 1 global |
| Draw calls in scene | ≤ 5 |
| DPR cap | 1.5 |
| Nebula resolution | ¼ screen |
| Frame budget | ≤ 6ms mid-range mobile |
| Off-screen / tab hidden | scene pauses (IntersectionObserver + visibilitychange) |
| prefers-reduced-motion / lite mode | static SVG constellation, CSS star texture, no WebGL at all |
| canvas 2D shadowBlur | banned — glow via pre-baked textures only |

## Lite mode (unchanged from master plan)

Lite = same DOM, static SVG constellation (same graph data, hover highlights via CSS), CSS star background, no WebGL. Detection: reduced-motion / saveData / deviceMemory ≤ 4 / no WebGL → lite; else hydrate full scene after idle. Footer toggle persists override.

---

# Locked Decisions (from Sinaida, 2026-07-03)

## 1. Glitch stays — but as a Lynchian event, not a texture

Glitches are part of the identity: polished surface, intentionally broken in places, David Lynch unease. Design principle: **"the glitch is an event, not a texture."** Rules for the executor:

- Delete the *ambient* glitch systems (VHSOverlay scroll distortion, constant flicker, tracking lines). Scroll-triggered distortion punishes the visitor's core action — that's friction, not unease.
- Replace with **rare, scripted, precise glitch events**: max ~1 per 30–40s, never while text is being read, always resolving cleanly. Examples to implement:
  - The ECG waveform occasionally **skips a beat** — a single arrhythmia, then normal rhythm resumes. (Biomedical + uneasy + subtle. The signature moment.)
  - Once per session, the hero headline de-tunes for ~200ms (RGB split + 1-frame displacement) and snaps back.
  - One constellation node very rarely "flatlines" — its glow dies, edge pulse stops, then it re-ignites.
  - Hover on interactive elements: single-frame chromatic aberration shift (kept from current hover-glitch, refined).
- The unease comes from *wrongness in a perfect system*, not from noise. Everything glitch-related must look deliberate.

## 2. Nebula: whole-page, section-dimmed (decided for compatibility)

One fullscreen quarter-res quad costs the same wherever it shows, so: **whole-page nebula with a per-section intensity uniform** — full presence behind hero (1.0) and constellation (0.8), dimmed to near-black behind reading sections (0.15), mid behind contact/waveform (0.4). Driven by scroll position, smoothly interpolated. Best wow-per-millisecond; text contrast preserved. Lite mode: static CSS gradient, no WebGL.

## 3. Snake easter egg: keep, zero-cost implementation

- `import()` dynamically only when the trigger fires — excluded from main bundle entirely.
- Own 2D canvas + rAF that exist only while playing; fully destroyed on close.
- Trigger: current key sequence on desktop; add a hidden tap pattern on mobile (e.g. 5 taps on the logo).

## 4. Hero copy — decided

Requirements from Sinaida: impression of "a mix of technology and soul", no first-person "I", the site speaks *about* Sinaida. Decision — tone: clinical-precise with a trace of the uncanny; voice: discipline-as-title + third-person subline.

```
SINAIDA KRIVCHENKO — DIGITAL ARTIST · LIVE VISUALS · IMMERSIVE SYSTEMS   ← label line

SOUL
ENGINEERING                                                              ← H1, once-per-session
                                                                            de-tune glitch event

Sinaida Krivchenko engineers living visual worlds for stages —           ← subline, third person
audio-reactive projections, immersive installations, generative
systems with a pulse. Trained in biomedical engineering.
Practicing in raw emotion.
```

Why "Soul Engineering": two words that ARE her positioning — technology (engineering) + soul, literally. It's ownable (nobody else can credibly claim it — she has the biomedical MSc to back it), memorable in a booker's inbox, and reads as a discipline she invented rather than a slogan. The ECG waveform elsewhere on the page becomes the proof of the claim.

Runner-up (if H1 ever feels too bold): "Vital Signs of Imagination". Rejected: first-person forms, "Signal Becomes Soul".

---

# Booking Conversion Strategy (goal: hired by music festivals & theaters)

**Hero text stays exactly as is** (Sinaida's decision — "Where Engineering Meets Imagination" + current sublines).

## Why bookers currently bounce — three findings from the code

1. **Services are gated behind a terminal animation.** `ServicesTerminal` types out `$ load_module --id=…` character by character before revealing each service. A festival programmer scanning 20 sites in an afternoon will not wait for a typing animation. And the service names they eventually get — "Immersive Visuals", "Creative Direction", "Digital Art", "Conceptual Storytelling" — are artist-language, not buyer-language. Nothing says *"I do stage visuals for concerts and you can book me."*
2. **Readability works against comprehension.** Body-level information is set in Space Mono at 11–13px, uppercase, 0.15–0.2em tracking, at 25–35% white opacity. That fails WCAG AA and physically slows reading — combined with (1), the visitor gives up before understanding the offer.
3. **The contact email is `gallant_mod5v@icloud.com`.** For a professional artist site this is a silent credibility killer. Must become an address on the own domain (e.g. `hello@sinaida.eu` — Cloudflare/improvMX forward is free) before any outreach campaign.

## The 5-second rule

A booker must be able to answer within 5 seconds: *who is this, what does she deliver, has she done it on a real stage, how do I hire her.* Everything below serves that.

### Clarity strip (new, directly under hero — additive, doesn't touch her text)

```
LIVE VISUALS FOR CONCERTS & FESTIVALS · STAGE DESIGN FOR THEATER & DANCE · IMMERSIVE INSTALLATIONS
Currently booking 2026–27 · Prague, works worldwide          [ See live work ↓ ]  [ Booking → ]
```

### Services rewritten in buyer language, organized by WHO hires

Keep the terminal *aesthetic* (frame, prompt, cursor) — remove the typing *delay*: text renders instantly. Three blocks:

- **For music festivals & concerts** — audio-reactive stage visuals built per song or per set; real-time TouchDesigner systems that listen to the live mix; delivered as a turnkey show or operated live. *Proof: Redkie Ptitsy — 19 unique projections.*
- **For theater & dance** — responsive scenography: projections that react to performers, sound and story; from concept with the director to opening night.
- **For venues, brands & institutions** — immersive installations and generative visual identities.

Each block ends with a plain sentence: what you get, typical lead time, "from brief to show" one-liner.

### New pages (homepage stays compact)

| Page | Purpose |
|---|---|
| `/work/redkie-ptitsy` | Flagship case study, booker-facing: context → challenge → 19 audio-reactive projections → tech (TouchDesigner, live signal chain) → video → what a festival can order. This page is the outreach link Sinaida sends to bookers directly. |
| `/booking` | The "work with me" page: three service blocks in full, process timeline (brief → concept → build → rehearsal → show), practical answers (travel, tech rider basics, timelines), press kit download, contact. |
| `/work/<slug>` (later) | Template for future cases — each new gig becomes a booking asset. |

### Proof hierarchy on the homepage

Video beats everything: the Redkie Ptitsy short embeds in Selected Works row #1, poster-framed, one click to play. Numbers stated plainly (19 projections, venue, year). The constellation stays the atmosphere/craft proof — but conversion elements never depend on it.

## Readability specification (binding for all executors)

| Rule | Spec |
|---|---|
| Type roles | Space Grotesk = headings AND body text. Space Mono = labels, captions, data, terminal skin ONLY — never multi-sentence text |
| Body size | ≥ 16px, line-height 1.6, max width 70ch |
| Uppercase + tracking | allowed only on single-line labels, never on wrapping text |
| Contrast | body ≥ rgba(255,255,255,.87); secondary ≥ .60; the .25–.35 opacity values are banned for informational text (decorative only). AA 4.5:1 minimum |
| Animation vs content | content is NEVER gated by animation — no typing reveals for information, no hover-required content, nothing that delays reading. Motion decorates around content that is already there |
| Reading zones | while a text section is in the viewport center, ambient motion behind it dims (ties into nebula per-section intensity) |
| Focus/touch | visible focus states; touch targets ≥ 44px |

---

# Priority Recommendations

1. **Cut the VHS/glitch layer** — biggest single step toward "polished digital architect"; also deletes ~500 lines and 3 animation systems.
2. **Consolidate to the single-scene architecture** — nebula + starfield + constellation in one canvas. Perceived polish = stable frame rate.
3. **Promote the constellation to functional centerpiece** — it becomes navigation + proof of "complex data structures × ethereal design" in one artifact. This is the element bookers will remember and forward.
4. Copy pass afterward: hero line should carry "soul engineering" (current "Where Engineering Meets Imagination" is close but generic).
